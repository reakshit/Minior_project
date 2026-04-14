from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from datetime import datetime, date
from bson import ObjectId
import random
import db as DB

app = Flask(__name__)
app.secret_key = 'fitcore-secret-key'

CLASSES = ['Cardio', 'Strength', 'Yoga', 'Zumba', 'Crossfit']
DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
TIMES   = ['06:00','07:00','08:00','09:00','10:00','11:00','16:00','17:00','18:00','19:00','20:00']

ROLE_META = {
    'admin':   {'title': 'Admin',   'icon': '🛡️'},
    'trainer': {'title': 'Trainer', 'icon': '💪'},
    'member':  {'title': 'Member',  'icon': '🏃'},
}

def _strip(docs):
    """Remove MongoDB _id from a list of documents."""
    for d in docs:
        d.pop('_id', None)
    return docs

def _one(doc):
    if doc:
        doc.pop('_id', None)
    return doc

def login_required(role):
    from functools import wraps
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if session.get('role') != role:
                return redirect(url_for(f'{role}_login'))
            return f(*args, **kwargs)
        return wrapped
    return decorator

# ── AUTH COLLECTIONS MAP ──────────────────────────────────────────────────────
_AUTH = {
    'admin':   DB.admin_users,
    'trainer': DB.trainer_users,
    'member':  DB.member_users,
}

# ── PAGE ROUTES ───────────────────────────────────────────────────────────────
@app.route('/')
def landing():
    return render_template('index.html')

def _login_view(role):
    meta = ROLE_META[role]
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = _AUTH[role].find_one({'username': username, 'password': password})
        if user:
            session['role'] = role
            # Store identity so JS knows who is logged in
            if role == 'admin':
                session['user_id']   = user.get('id', 'ADMIN')
                session['user_name'] = user.get('name', 'Admin User')
            elif role == 'trainer':
                session['user_id']   = user.get('trainerId')
                session['user_name'] = user.get('name')
            else:
                session['user_id']   = user.get('memberId')
                session['user_name'] = user.get('name')
            return redirect(url_for(role))
        return render_template('login.html', role_title=meta['title'],
                               role_icon=meta['icon'], error='Invalid credentials')
    return render_template('login.html', role_title=meta['title'],
                           role_icon=meta['icon'], error=None)

@app.route('/admin/login',   methods=['GET','POST'])
def admin_login():   return _login_view('admin')

@app.route('/trainer/login', methods=['GET','POST'])
def trainer_login(): return _login_view('trainer')

@app.route('/member/login',  methods=['GET','POST'])
def member_login():  return _login_view('member')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@app.route('/admin')
@login_required('admin')
def admin():
    return render_template('shell.html', role='admin', role_title='Admin', pages_js='admin_pages.js')

@app.route('/trainer')
@login_required('trainer')
def trainer():
    return render_template('shell.html', role='trainer', role_title='Trainer', pages_js='trainer_pages.js')

@app.route('/member')
@login_required('member')
def member():
    return render_template('shell.html', role='member', role_title='Member', pages_js='member_pages.js')

# ── API: SESSION USER ─────────────────────────────────────────────────────────
@app.route('/api/me')
def me():
    if 'role' not in session:
        return jsonify(ok=False), 401
    return jsonify(ok=True, id=session['user_id'], name=session['user_name'], role=session['role'])

# ── API: STATS (dashboard + revenue) ─────────────────────────────────────────
@app.route('/api/stats')
def get_stats():
    # Class popularity: total booked / total slots per class type
    class_stats = {}
    for s in DB.schedule.find():
        c = s['class']
        if c not in class_stats:
            class_stats[c] = {'booked': 0, 'slots': 0}
        class_stats[c]['booked'] += s.get('booked', 0)
        class_stats[c]['slots']  += s.get('slots', 1)
    popularity = {c: round(v['booked'] / v['slots'] * 100) if v['slots'] else 0
                  for c, v in class_stats.items()}

    # Revenue: auto-computed from members' plan and join date
    plan_prices = {'Basic': 999, 'Premium': 1999, 'Annual': 14999}
    monthly = {}
    members = list(DB.members.find())
    for m in members:
        plan  = m.get('plan', 'Basic')
        price = plan_prices.get(plan, 0)
        month = m.get('joined', '')[:7]  # "YYYY-MM"
        if not month:
            continue
        if month not in monthly:
            monthly[month] = {'Basic': 0, 'Premium': 0, 'Annual': 0}
        monthly[month][plan] = monthly[month].get(plan, 0) + price

    # Always include current month as live snapshot of all active members
    current_month = date.today().strftime('%Y-%m')
    monthly[current_month] = {'Basic': 0, 'Premium': 0, 'Annual': 0}
    for m in members:
        plan = m.get('plan', 'Basic')
        monthly[current_month][plan] = monthly[current_month].get(plan, 0) + plan_prices.get(plan, 0)

    rev_docs = [
        {'month': k, 'basic': v['Basic'], 'premium': v['Premium'], 'annual': v['Annual']}
        for k, v in sorted(monthly.items())
    ]

    total_rev = sum(plan_prices.get(m.get('plan', 'Basic'), 0) for m in members)

    return jsonify(popularity=popularity, revenue=rev_docs, total_revenue=total_rev)

# ── API: REPORTS ──────────────────────────────────────────────────────────────
@app.route('/api/reports')
def get_reports():
    today = date.today()
    members  = list(DB.members.find())
    trainers = list(DB.trainers.find())
    bookings = list(DB.bookings.find())
    feedback = list(DB.feedback.find())
    schedule = list(DB.schedule.find())
    plan_prices = {'Basic': 999, 'Premium': 1999, 'Annual': 14999}

    # 1. Member Attendance: booking count per member
    booking_counts = {}
    for b in bookings:
        mid = b.get('memberId')
        booking_counts[mid] = booking_counts.get(mid, 0) + 1
    attendance = sorted([
        {'id': m['id'], 'name': m['name'], 'plan': m.get('plan','Basic'),
         'bookings': booking_counts.get(m['id'], 0), 'lastVisit': m.get('lastVisit','')}
        for m in members
    ], key=lambda x: -x['bookings'])

    # 2. Revenue & Billing: per member
    billing = [
        {'id': m['id'], 'name': m['name'], 'plan': m.get('plan','Basic'),
         'amount': plan_prices.get(m.get('plan','Basic'), 0), 'joined': m.get('joined','')}
        for m in members
    ]

    # 3. Inactive Members: no visit in 30+ days
    inactive = []
    for m in members:
        lv = m.get('lastVisit', '')
        if lv:
            days = (today - date.fromisoformat(lv)).days
            if days >= 30:
                inactive.append({'id': m['id'], 'name': m['name'], 'plan': m.get('plan','Basic'),
                                  'lastVisit': lv, 'daysSince': days})
    inactive.sort(key=lambda x: -x['daysSince'])

    # 4. Trainer Performance: avg rating + session count from feedback
    trainer_stats = {t['id']: {'name': t['name'], 'specialty': t.get('specialty',''),
                                'ratings': [], 'sessions': t.get('sessions', 0)} for t in trainers}
    for f in feedback:
        tid = f.get('trainerId')
        if tid and tid in trainer_stats:
            trainer_stats[tid]['ratings'].append(f.get('rating', 0))
    trainer_perf = [
        {'id': tid, 'name': v['name'], 'specialty': v['specialty'],
         'sessions': v['sessions'],
         'avgRating': round(sum(v['ratings'])/len(v['ratings']), 2) if v['ratings'] else 'N/A',
         'reviews': len(v['ratings'])}
        for tid, v in trainer_stats.items()
    ]

    # 5. Class Utilization: fill rate per class type
    class_util = {}
    for s in schedule:
        c = s['class']
        if c not in class_util:
            class_util[c] = {'booked': 0, 'slots': 0, 'sessions': 0}
        class_util[c]['booked']   += s.get('booked', 0)
        class_util[c]['slots']    += s.get('slots', 1)
        class_util[c]['sessions'] += 1
    utilization = [
        {'class': c, 'sessions': v['sessions'], 'booked': v['booked'], 'slots': v['slots'],
         'fillRate': round(v['booked'] / v['slots'] * 100) if v['slots'] else 0}
        for c, v in class_util.items()
    ]

    return jsonify(attendance=attendance, billing=billing, inactive=inactive,
                   trainerPerf=trainer_perf, utilization=utilization)

# ── API: REVENUE records ──────────────────────────────────────────────────────
@app.route('/api/revenue', methods=['POST'])
def add_revenue():
    d = request.json
    DB.revenue.update_one(
        {'month': d['month']},
        {'$set': {'month': d['month'], 'premium': int(d.get('premium', 0)),
                  'basic': int(d.get('basic', 0)), 'annual': int(d.get('annual', 0))}},
        upsert=True
    )
    return jsonify(ok=True)


@app.route('/api/data')
def get_data():
    return jsonify(
        classes=CLASSES, days=DAYS, times=TIMES,
        trainers=_strip(list(DB.trainers.find())),
        schedule=_strip(list(DB.schedule.find())),
        complaints=_strip(list(DB.complaints.find())),
        feedback=_strip(list(DB.feedback.find())),
        bookings=_strip(list(DB.bookings.find())),
        members=_strip(list(DB.members.find())),
    )

# ── API: BOOKINGS ─────────────────────────────────────────────────────────────
@app.route('/api/book', methods=['POST'])
def book():
    d = request.json
    sched_id, member_id, member_name = d['schedId'], d['memberId'], d['memberName']
    s = _one(DB.schedule.find_one({'id': sched_id}))
    if not s:
        return jsonify(ok=False, msg='Session not found'), 404
    if DB.bookings.find_one({'schedId': sched_id, 'memberId': member_id}):
        return jsonify(ok=False, msg='Already booked'), 400
    if s['booked'] >= s['slots']:
        return jsonify(ok=False, msg='Class full'), 400
    DB.schedule.update_one({'id': sched_id}, {'$inc': {'booked': 1}})
    DB.bookings.insert_one({'schedId': sched_id, 'memberId': member_id, 'memberName': member_name, 'status': 'Confirmed'})
    return jsonify(ok=True)

@app.route('/api/cancel', methods=['POST'])
def cancel():
    d = request.json
    sched_id, member_id = d['schedId'], d['memberId']
    b = DB.bookings.find_one({'schedId': sched_id, 'memberId': member_id})
    if not b:
        return jsonify(ok=False, msg='Booking not found'), 404
    DB.bookings.delete_one({'schedId': sched_id, 'memberId': member_id})
    DB.schedule.update_one({'id': sched_id}, {'$inc': {'booked': -1}})
    return jsonify(ok=True)

# ── API: COMPLAINTS ───────────────────────────────────────────────────────────
@app.route('/api/complaints', methods=['POST'])
def add_complaint():
    d = request.json
    DB.complaints.insert_one({
        'id': int(datetime.now().timestamp() * 1000),
        'memberId': d['memberId'], 'memberName': d['memberName'],
        'text': d['text'], 'status': 'Pending',
        'ts': datetime.now().strftime('%Y-%m-%d %H:%M')
    })
    return jsonify(ok=True)

@app.route('/api/complaints/<int:cid>/resolve', methods=['POST'])
def resolve_complaint(cid):
    r = DB.complaints.update_one({'id': cid}, {'$set': {'status': 'Resolved'}})
    if r.matched_count == 0:
        return jsonify(ok=False), 404
    return jsonify(ok=True)

# ── API: FEEDBACK ─────────────────────────────────────────────────────────────
@app.route('/api/feedback', methods=['POST'])
def add_feedback():
    d = request.json
    DB.feedback.insert_one({
        'id': int(datetime.now().timestamp() * 1000),
        'memberId': d['memberId'], 'memberName': d['memberName'],
        'text': d['text'], 'rating': d['rating'],
        'ts': datetime.now().strftime('%Y-%m-%d %H:%M')
    })
    return jsonify(ok=True)

# ── API: MEMBERS ──────────────────────────────────────────────────────────────
@app.route('/api/members', methods=['POST'])
def add_member():
    d = request.json
    if not d.get('name'):
        return jsonify(ok=False, msg='Name required'), 400
    today = date.today().isoformat()
    mid = 'M' + str(random.randint(100, 999))
    DB.members.insert_one({
        'id': mid,
        'name': d['name'], 'email': d.get('email', ''),
        'phone': d.get('phone', ''), 'plan': d.get('plan', 'Basic'),
        'joined': today, 'lastVisit': today
    })
    if d.get('username') and d.get('password'):
        DB.member_users.insert_one({
            'username': d['username'], 'password': d['password'],
            'name': d['name'], 'memberId': mid
        })
    return jsonify(ok=True)

@app.route('/api/members/delete', methods=['POST'])
def delete_member():
    mid = request.json.get('id')
    if not mid:
        return jsonify(ok=False, msg='ID required'), 400
    DB.members.delete_one({'id': mid})
    DB.member_users.delete_one({'memberId': mid})
    DB.bookings.delete_many({'memberId': mid})
    return jsonify(ok=True)

# ── API: TRAINERS ─────────────────────────────────────────────────────────────
@app.route('/api/trainers', methods=['POST'])
def add_trainer():
    d = request.json
    if not d.get('name'):
        return jsonify(ok=False, msg='Name required'), 400
    tid = 'T' + str(int(datetime.now().timestamp() * 1000))
    DB.trainers.insert_one({
        'id': tid, 'name': d['name'],
        'specialty': d.get('specialty', ''), 'rating': 5.0, 'sessions': 0
    })
    if d.get('username') and d.get('password'):
        DB.trainer_users.insert_one({
            'username': d['username'], 'password': d['password'],
            'name': d['name'], 'trainerId': tid
        })
    return jsonify(ok=True)

@app.route('/api/trainers/delete', methods=['POST'])
def delete_trainer():
    tid = request.json.get('id')
    if not tid:
        return jsonify(ok=False, msg='ID required'), 400
    DB.trainers.delete_one({'id': tid})
    DB.trainer_users.delete_one({'trainerId': tid})
    DB.schedule.delete_many({'trainerId': tid})
    return jsonify(ok=True)

# ── API: SCHEDULE ─────────────────────────────────────────────────────────────
@app.route('/api/schedule', methods=['POST'])
def add_session():
    d = request.json
    tid, day, time = d['trainerId'], int(d['day']), d['time']
    if DB.schedule.find_one({'trainerId': tid, 'day': day, 'time': time}):
        return jsonify(ok=False, msg='Trainer already has a session at this time'), 400
    DB.schedule.insert_one({
        'id': 's' + str(int(datetime.now().timestamp() * 1000)),
        'trainerId': tid, 'class': d['class'],
        'day': day, 'time': time,
        'slots': int(d['slots']), 'booked': 0
    })
    return jsonify(ok=True)

if __name__ == '__main__':
    app.run(debug=True)

from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from datetime import datetime, date
import random

app = Flask(__name__)
app.secret_key = 'fitcore-secret-key'

CREDENTIALS = {'username': 'user', 'password': 'pass'}

ROLE_META = {
    'admin':   {'title': 'Admin',   'icon': '🛡️', 'accent': '#e8ff47'},
    'trainer': {'title': 'Trainer', 'icon': '💪', 'accent': '#47c8ff'},
    'member':  {'title': 'Member',  'icon': '🏃', 'accent': '#ff6b35'},
}

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

# ── DATA ──────────────────────────────────────────────────────────────────────
CLASSES  = ['Cardio', 'Strength', 'Yoga', 'Zumba', 'Crossfit']
DAYS     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
TIMES    = ['06:00','07:00','08:00','09:00','10:00','11:00','16:00','17:00','18:00','19:00','20:00']

TRAINERS = [
    {'id':'T1','name':'Arun Mehta',   'specialty':'Cardio & HIIT',        'rating':4.8,'sessions':142},
    {'id':'T2','name':'Priya Sharma', 'specialty':'Yoga & Flexibility',   'rating':4.9,'sessions':98},
    {'id':'T3','name':'Rahul Verma',  'specialty':'Strength & Power',     'rating':4.7,'sessions':167},
    {'id':'T4','name':'Sneha Patel',  'specialty':'Zumba & Dance',        'rating':4.6,'sessions':85},
    {'id':'T5','name':'Vikram Singh', 'specialty':'Crossfit & Endurance', 'rating':4.8,'sessions':120},
]
SCHEDULE = [
    {'id':'s1', 'trainerId':'T1','class':'Cardio',   'day':0,'time':'06:00','slots':20,'booked':14},
    {'id':'s2', 'trainerId':'T1','class':'Cardio',   'day':2,'time':'07:00','slots':20,'booked':18},
    {'id':'s3', 'trainerId':'T2','class':'Yoga',     'day':1,'time':'08:00','slots':15,'booked':10},
    {'id':'s4', 'trainerId':'T2','class':'Yoga',     'day':3,'time':'09:00','slots':15,'booked':15},
    {'id':'s5', 'trainerId':'T3','class':'Strength', 'day':0,'time':'09:00','slots':12,'booked':12},
    {'id':'s6', 'trainerId':'T3','class':'Strength', 'day':4,'time':'18:00','slots':12,'booked':7},
    {'id':'s7', 'trainerId':'T4','class':'Zumba',    'day':2,'time':'17:00','slots':25,'booked':20},
    {'id':'s8', 'trainerId':'T4','class':'Zumba',    'day':5,'time':'10:00','slots':25,'booked':22},
    {'id':'s9', 'trainerId':'T5','class':'Crossfit', 'day':1,'time':'06:00','slots':10,'booked':9},
    {'id':'s10','trainerId':'T5','class':'Crossfit', 'day':4,'time':'07:00','slots':10,'booked':10},
    {'id':'s11','trainerId':'T1','class':'Cardio',   'day':5,'time':'08:00','slots':20,'booked':6},
    {'id':'s12','trainerId':'T2','class':'Yoga',     'day':6,'time':'10:00','slots':15,'booked':5},
]
COMPLAINTS = [
    {'id':1,'memberId':'M101','memberName':'Kiara Reddy','text':'Locker room needs cleaning', 'status':'Pending', 'ts':'2026-03-10 09:12'},
    {'id':2,'memberId':'M203','memberName':'Arjun Patel','text':'AC not working in Yoga hall','status':'Resolved','ts':'2026-03-08 14:30'},
]
FEEDBACK = [
    {'id':1,'memberId':'M101','memberName':'Kiara Reddy','text':'Loved the Zumba session!','rating':5,'ts':'2026-03-15 10:00'},
    {'id':2,'memberId':'M203','memberName':'Arjun Patel','text':'Trainer was very helpful', 'rating':4,'ts':'2026-03-14 17:22'},
]
BOOKINGS = [
    {'schedId':'s1','memberId':'M101','memberName':'Kiara Reddy','status':'Confirmed'},
    {'schedId':'s3','memberId':'M101','memberName':'Kiara Reddy','status':'Confirmed'},
]
MEMBERS = [
    {'id':'M101','name':'Kiara Reddy','email':'kiara@email.com','phone':'9870001234','plan':'Premium','joined':'2025-08-01','lastVisit':'2026-03-20'},
    {'id':'M203','name':'Arjun Patel','email':'arjun@email.com','phone':'9870005678','plan':'Basic',  'joined':'2025-10-15','lastVisit':'2026-02-10'},
    {'id':'M304','name':'Meera Nair', 'email':'meera@email.com','phone':'9870009012','plan':'Premium','joined':'2025-07-20','lastVisit':'2026-03-21'},
    {'id':'M405','name':'Dev Khanna', 'email':'dev@email.com',  'phone':'9870003456','plan':'Basic',  'joined':'2026-01-05','lastVisit':'2026-01-28'},
    {'id':'M506','name':'Riya Gupta', 'email':'riya@email.com', 'phone':'9870007890','plan':'Annual', 'joined':'2025-06-01','lastVisit':'2026-03-18'},
]

# ── PAGE ROUTES ───────────────────────────────────────────────────────────────
@app.route('/')
def landing():
    return render_template('index.html')

def _login_view(role):
    meta = ROLE_META[role]
    if request.method == 'POST':
        if request.form['username'] == CREDENTIALS['username'] and \
           request.form['password'] == CREDENTIALS['password']:
            session['role'] = role
            return redirect(url_for(role))
        return render_template('login.html', role_title=meta['title'],
                               role_icon=meta['icon'], error='Invalid credentials')
    return render_template('login.html', role_title=meta['title'],
                           role_icon=meta['icon'], error=None)

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    return _login_view('admin')

@app.route('/trainer/login', methods=['GET', 'POST'])
def trainer_login():
    return _login_view('trainer')

@app.route('/member/login', methods=['GET', 'POST'])
def member_login():
    return _login_view('member')

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

# ── API: READ ─────────────────────────────────────────────────────────────────
@app.route('/api/data')
def get_data():
    return jsonify(
        classes=CLASSES, trainers=TRAINERS, days=DAYS, times=TIMES,
        schedule=SCHEDULE, complaints=COMPLAINTS, feedback=FEEDBACK,
        bookings=BOOKINGS, members=MEMBERS
    )

# ── API: BOOKINGS ─────────────────────────────────────────────────────────────
@app.route('/api/book', methods=['POST'])
def book():
    d = request.json
    sched_id, member_id, member_name = d['schedId'], d['memberId'], d['memberName']
    s = next((x for x in SCHEDULE if x['id'] == sched_id), None)
    if not s:
        return jsonify(ok=False, msg='Session not found'), 404
    if any(b['schedId'] == sched_id and b['memberId'] == member_id for b in BOOKINGS):
        return jsonify(ok=False, msg='Already booked'), 400
    if s['booked'] >= s['slots']:
        return jsonify(ok=False, msg='Class full'), 400
    s['booked'] += 1
    BOOKINGS.append({'schedId': sched_id, 'memberId': member_id, 'memberName': member_name, 'status': 'Confirmed'})
    return jsonify(ok=True)

@app.route('/api/cancel', methods=['POST'])
def cancel():
    d = request.json
    sched_id, member_id = d['schedId'], d['memberId']
    idx = next((i for i, b in enumerate(BOOKINGS) if b['schedId'] == sched_id and b['memberId'] == member_id), None)
    if idx is None:
        return jsonify(ok=False, msg='Booking not found'), 404
    s = next((x for x in SCHEDULE if x['id'] == sched_id), None)
    if s:
        s['booked'] = max(0, s['booked'] - 1)
    BOOKINGS.pop(idx)
    return jsonify(ok=True)

# ── API: COMPLAINTS ───────────────────────────────────────────────────────────
@app.route('/api/complaints', methods=['POST'])
def add_complaint():
    d = request.json
    COMPLAINTS.append({
        'id': int(datetime.now().timestamp() * 1000),
        'memberId': d['memberId'], 'memberName': d['memberName'],
        'text': d['text'], 'status': 'Pending',
        'ts': datetime.now().strftime('%Y-%m-%d %H:%M')
    })
    return jsonify(ok=True)

@app.route('/api/complaints/<int:cid>/resolve', methods=['POST'])
def resolve_complaint(cid):
    c = next((x for x in COMPLAINTS if x['id'] == cid), None)
    if not c:
        return jsonify(ok=False), 404
    c['status'] = 'Resolved'
    return jsonify(ok=True)

# ── API: FEEDBACK ─────────────────────────────────────────────────────────────
@app.route('/api/feedback', methods=['POST'])
def add_feedback():
    d = request.json
    FEEDBACK.append({
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
    MEMBERS.append({
        'id': 'M' + str(random.randint(100, 999)),
        'name': d['name'], 'email': d.get('email', ''),
        'phone': d.get('phone', ''), 'plan': d.get('plan', 'Basic'),
        'joined': today, 'lastVisit': today
    })
    return jsonify(ok=True)

# ── API: SCHEDULE ─────────────────────────────────────────────────────────────
@app.route('/api/schedule', methods=['POST'])
def add_session():
    d = request.json
    tid, day, time = d['trainerId'], int(d['day']), d['time']
    if any(s['trainerId'] == tid and s['day'] == day and s['time'] == time for s in SCHEDULE):
        return jsonify(ok=False, msg='Trainer already has a session at this time'), 400
    SCHEDULE.append({
        'id': 's' + str(int(datetime.now().timestamp() * 1000)),
        'trainerId': tid, 'class': d['class'],
        'day': day, 'time': time,
        'slots': int(d['slots']), 'booked': 0
    })
    return jsonify(ok=True)

if __name__ == '__main__':
    app.run(debug=True)

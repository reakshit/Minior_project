
let CLASSES = [], TRAINERS = [], DAYS = [], TIMES = [];
let SCHEDULE = [], COMPLAINTS = [], FEEDBACK = [], BOOKINGS = [], MEMBERS = [];

const NAV_CONFIG = {
  admin: [
    { icon:'📊', label:'Dashboard',       page:'dashboard' },
    { icon:'🗂️', label:'Manage',         page:'manage' },
    { icon:'💬', label:'Complaints',      page:'complaints' },
    { icon:'⭐', label:'Feedback',        page:'feedback' },
    { icon:'📅', label:'Schedule',        page:'schedule' },
    { icon:'📈', label:'Revenue',         page:'revenue' },
    { icon:'📋', label:'Reports',         page:'reports' },
  ],
  trainer: [
    { icon:'📅', label:'My Schedule',     page:'trainerSchedule' },
    { icon:'👥', label:'My Members',      page:'trainerMembers' },
    { icon:'📊', label:'Class Analytics', page:'classAnalytics' },
    { icon:'⭐', label:'Feedback',        page:'feedback' },
  ],
  member: [
    { icon:'🏠', label:'My Dashboard',    page:'memberDash' },
    { icon:'📅', label:'Book a Class',    page:'bookClass' },
    { icon:'🎟️', label:'My Bookings',    page:'myBookings' },
    { icon:'📈', label:'My Progress',     page:'myProgress' },
    { icon:'💬', label:'Complaints',      page:'memberComplaints' },
    { icon:'⭐', label:'Feedback',        page:'memberFeedback' },
  ],
};

const ROLE_STYLES = {
  admin:   { bg:'#e8ff4722', color:'var(--accent)',  label:'Administrator' },
  trainer: { bg:'#47c8ff22', color:'var(--accent3)', label:'Trainer' },
  member:  { bg:'#ff6b3522', color:'var(--accent2)', label:'Member' },
};


let currentRole = null;
let currentUser = {};

async function initRole(role) {
  currentRole = role;

  // Fetch the actual logged-in user from the server session
  const meRes = await fetch('/api/me');
  const me = await meRes.json();
  currentUser = { id: me.id, name: me.name };

  // Load all data from Flask
  const res = await fetch('/api/data');
  const data = await res.json();
  CLASSES = data.classes; TRAINERS = data.trainers;
  DAYS = data.days; TIMES = data.times;
  SCHEDULE = data.schedule; COMPLAINTS = data.complaints;
  FEEDBACK = data.feedback; BOOKINGS = data.bookings; MEMBERS = data.members;

  const rs = ROLE_STYLES[role];
  const badge = document.getElementById('roleBadge');
  badge.style.background = rs.bg;
  badge.style.color = rs.color;
  badge.textContent = rs.label;

  document.getElementById('avatarLetter').textContent = currentUser.name[0];
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarRole').textContent = rs.label;

  const nav = NAV_CONFIG[role];
  const navEl = document.getElementById('navItems');
  navEl.innerHTML = nav.map((n,i) => `
    <div class="nav-item${i===0?' active':''}" onclick="navigate('${n.page}',this)" data-page="${n.page}">
      <span class="nav-icon">${n.icon}</span> ${n.label}
    </div>
  `).join('');

  navigate(nav[0].page, navEl.querySelector('.nav-item'));

  const bni = document.getElementById('bottomNavInner');
  bni.innerHTML = nav.slice(0,6).map((n,i)=>`
    <div class="bottom-nav-item${i===0?' active':''}" onclick="navigate('${n.page}',document.querySelector('[data-page=${n.page}]'))" data-bn-page="${n.page}">
      <span class="bottom-nav-icon">${n.icon}</span>
      <span>${n.label.split(' ')[0]}</span>
    </div>
  `).join('');
}


function navigate(page, el) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('.bottom-nav-item').forEach(n=>{
    n.classList.toggle('active', n.dataset.bnPage===page);
  });
  const navItem = NAV_CONFIG[currentRole]?.find(n=>n.page===page);
  document.getElementById('pageTitle').textContent = navItem?.label || page;
  closeSidebar();
  renderPage(page);
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════
// PAGE RENDERER
// ═══════════════════════════════════════════
function renderPage(page) {
  const ca = document.getElementById('contentArea');
  document.getElementById('topbarActions').innerHTML = '';

  const renderers = {
    dashboard:        ()=>renderAdminDashboard(),
    manage:           ()=>renderManage('members'),
    manage_members:   ()=>renderManage('members'),
    manage_trainers:  ()=>renderManage('trainers'),
    members:          ()=>renderManage('members'),
    complaints:       ()=>renderComplaints(true),
    feedback:         ()=>renderFeedback(true),
    schedule:         ()=>renderScheduleAdmin(),
    trainers:         ()=>renderManage('trainers'),
    revenue:          ()=>renderRevenue(),
    reports:          ()=>renderReports(),
    trainerSchedule:  ()=>renderTrainerSchedule(),
    trainerMembers:   ()=>renderTrainerMembers(),
    classAnalytics:   ()=>renderClassAnalytics(),
    memberDash:       ()=>renderMemberDash(),
    bookClass:        ()=>renderBookClass(),
    myBookings:       ()=>renderMyBookings(),
    myProgress:       ()=>renderMyProgress(),
    memberComplaints: ()=>renderMemberComplaints(),
    memberFeedback:   ()=>renderMemberFeedback(),
  };

  if (!renderers[page]) { ca.innerHTML = `<div class="card"><p>Page not found</p></div>`; return; }
  const result = renderers[page]();
  // async renderers (dashboard, revenue) write to DOM themselves — only set innerHTML for sync ones
  if (result && typeof result.then === 'function') {
    ca.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Loading...</div>';
    result.then(() => {
      setTimeout(()=>{ document.querySelectorAll('[data-width]').forEach(el=>{ el.style.width=el.dataset.width+'%'; }); }, 50);
    });
  } else {
    ca.innerHTML = result;
    setTimeout(()=>{ document.querySelectorAll('[data-width]').forEach(el=>{ el.style.width=el.dataset.width+'%'; }); }, 50);
  }
}

// ═══════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════
async function api(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  return res.json();
}

async function reloadData() {
  const data = await (await fetch('/api/data')).json();
  TRAINERS = data.trainers; SCHEDULE = data.schedule;
  COMPLAINTS = data.complaints; FEEDBACK = data.feedback;
  BOOKINGS = data.bookings; MEMBERS = data.members;
}

// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════
let selectedRating = 5;

function setRating(r) {
  selectedRating = r;
  document.getElementById('ratingVal').value = r;
  for(let i=1;i<=5;i++) {
    const el = document.getElementById('star'+i);
    if(el) el.textContent = i<=r?'★':'☆';
  }
}

async function bookSession(id) {
  const s = SCHEDULE.find(sc=>sc.id===id);
  if(!s) return;
  const res = await api('/api/book', {schedId:id, memberId:currentUser.id, memberName:currentUser.name});
  if(!res.ok) { notify(res.msg||'Error','error'); return; }
  notify(`Booked ${s.class} on ${DAYS[s.day]} at ${s.time}!`, 'success');
  await reloadData();
  renderPage('bookClass');
}

async function cancelBooking(id) {
  const res = await api('/api/cancel', {schedId:id, memberId:currentUser.id});
  if(!res.ok) { notify(res.msg||'Error','error'); return; }
  notify('Booking cancelled.', 'success');
  await reloadData();
  renderPage(currentRole==='member'?'myBookings':'bookClass');
}

async function resolveComplaint(id) {
  const res = await api(`/api/complaints/${id}/resolve`, {});
  if(!res.ok) { notify('Error','error'); return; }
  notify('Complaint marked as resolved.', 'success');
  await reloadData();
  renderPage('complaints');
}

async function submitComplaint() {
  const text = document.getElementById('complaintText')?.value?.trim();
  if(!text) { notify('Please enter a complaint.','error'); return; }
  await api('/api/complaints', {memberId:currentUser.id, memberName:currentUser.name, text});
  notify('Complaint submitted!', 'success');
  document.getElementById('complaintText').value = '';
  await reloadData();
  renderPage('memberComplaints');
}

async function submitFeedback() {
  const text = document.getElementById('feedText')?.value?.trim();
  if(!text) { notify('Please enter feedback.','error'); return; }
  await api('/api/feedback', {memberId:currentUser.id, memberName:currentUser.name, text, rating:selectedRating});
  notify('Feedback submitted! Thank you.', 'success');
  document.getElementById('feedText').value = '';
  await reloadData();
  renderPage('memberFeedback');
}

function filterMembers(q) {
  document.querySelectorAll('#membersTable tr:not(:first-child)').forEach(r=>{
    r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function filterBookClasses() {
  const cls = document.getElementById('filterClass')?.value;
  const tr  = document.getElementById('filterTrainer')?.value;
  document.querySelectorAll('#classCards [data-class]').forEach(el=>{
    el.style.display = (!cls||el.dataset.class===cls) && (!tr||el.dataset.trainer===tr) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════
function showAddSession() {
  openModal('Add New Session', `
    <div class="input-group"><label class="input-label">Class Type</label>
      <select class="input" id="ns_class">${CLASSES.map(c=>`<option>${c}</option>`).join('')}</select></div>
    <div class="input-group"><label class="input-label">Trainer</label>
      <select class="input" id="ns_trainer">${TRAINERS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
    <div class="grid-2" style="gap:12px">
      <div class="input-group"><label class="input-label">Day</label>
        <select class="input" id="ns_day">${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select></div>
      <div class="input-group"><label class="input-label">Time</label>
        <select class="input" id="ns_time">${TIMES.map(t=>`<option>${t}</option>`).join('')}</select></div>
    </div>
    <div class="input-group"><label class="input-label">Max Slots</label>
      <input class="input" id="ns_slots" type="number" value="15" min="5" max="50"></div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-primary" onclick="confirmAddSession()">+ Add Session</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function confirmAddSession() {
  const body = {
    class:     document.getElementById('ns_class').value,
    trainerId: document.getElementById('ns_trainer').value,
    day:       document.getElementById('ns_day').value,
    time:      document.getElementById('ns_time').value,
    slots:     document.getElementById('ns_slots').value,
  };
  const res = await api('/api/schedule', body);
  if(!res.ok) { notify(res.msg||'Error','error'); return; }
  closeModal();
  notify('Session added successfully!', 'success');
  await reloadData();
  renderPage(currentRole==='trainer'?'trainerSchedule':'schedule');
}

function viewSession(id) {
  const s = SCHEDULE.find(sc=>sc.id===id);
  if(!s) return;
  const t   = TRAINERS.find(tr=>tr.id===s.trainerId);
  const pct = Math.round(s.booked/s.slots*100);
  openModal(`${s.class} Session`, `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
      <div class="stat-card" style="flex:1;--c:var(--accent)"><div class="stat-label">Booked</div><div class="stat-value">${s.booked}</div></div>
      <div class="stat-card" style="flex:1;--c:var(--accent3)"><div class="stat-label">Total Slots</div><div class="stat-value">${s.slots}</div></div>
      <div class="stat-card" style="flex:1;--c:var(--success)"><div class="stat-label">Fill Rate</div><div class="stat-value">${pct}%</div></div>
    </div>
    <div style="padding:16px;background:var(--surface);border-radius:10px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Trainer</span><strong>${t?.name}</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Day & Time</span><strong>${DAYS[s.day]} at ${s.time}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>Class</span><strong>${s.class}</strong></div>
    </div>
    <div class="progress-bar" style="height:10px;margin-bottom:20px">
      <div class="progress-fill" style="width:${pct}%;background:${pct>80?'var(--danger)':'var(--success)'}"></div>
    </div>
    <button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}

function viewMember(id) {
  const m = MEMBERS.find(mem=>mem.id===id);
  if(!m) return;
  openModal(`Member: ${m.name}`, `
    <div style="padding:16px;background:var(--surface);border-radius:10px;margin-bottom:20px">
      ${[['ID',m.id],['Email',m.email],['Phone',m.phone],['Plan',m.plan],['Joined',m.joined],['Last Visit',m.lastVisit]].map(([k,v])=>`
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted)">${k}</span><strong>${v}</strong>
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="notify('Reminder sent to ${m.name}','success');closeModal()">Send Reminder</button>
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>`);
}

function viewTrainerSchedule(tid) {
  const t        = TRAINERS.find(tr=>tr.id===tid);
  const sessions = SCHEDULE.filter(s=>s.trainerId===tid);
  openModal(`${t.name}'s Schedule`, `
    <div style="margin-bottom:16px">
      <span class="badge badge-info" style="margin-right:8px">⭐ ${t.rating}</span>
      <span class="badge badge-accent">${t.specialty}</span>
    </div>
    ${sessions.map(s=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div><strong>${s.class}</strong> · ${DAYS[s.day]} at ${s.time}</div>
        <span class="badge ${s.booked>=s.slots?'badge-danger':'badge-success'}">${s.booked}/${s.slots}</span>
      </div>`).join('')}
    <button class="btn btn-ghost" style="margin-top:16px" onclick="closeModal()">Close</button>`);
}

function showAddRevenue() {
  openModal('Add Monthly Revenue', `
    <div class="input-group"><label class="input-label">Month (e.g. Jan 2026)</label><input class="input" id="rv_month" placeholder="Mar 2026"></div>
    <div class="grid-3" style="gap:12px">
      <div class="input-group"><label class="input-label">Premium (₹)</label><input class="input" id="rv_premium" type="number" placeholder="0"></div>
      <div class="input-group"><label class="input-label">Annual (₹)</label><input class="input" id="rv_annual" type="number" placeholder="0"></div>
      <div class="input-group"><label class="input-label">Basic (₹)</label><input class="input" id="rv_basic" type="number" placeholder="0"></div>
    </div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-primary" onclick="confirmAddRevenue()">Save</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function confirmAddRevenue() {
  const month = document.getElementById('rv_month').value.trim();
  if (!month) { notify('Month is required.', 'error'); return; }
  await api('/api/revenue', {
    month,
    premium: document.getElementById('rv_premium').value || 0,
    annual:  document.getElementById('rv_annual').value  || 0,
    basic:   document.getElementById('rv_basic').value   || 0,
  });
  closeModal();
  notify('Revenue record saved!', 'success');
  renderPage('revenue');
}

function showAddTrainer() {
  openModal('Add New Trainer', `
    <div class="grid-2" style="gap:12px">
      <div class="input-group"><label class="input-label">Name</label><input class="input" id="nt_name" placeholder="Full name"></div>
      <div class="input-group"><label class="input-label">Specialty</label><input class="input" id="nt_specialty" placeholder="e.g. Cardio & HIIT"></div>
      <div class="input-group"><label class="input-label">Username</label><input class="input" id="nt_username" placeholder="Login username"></div>
      <div class="input-group"><label class="input-label">Password</label><input class="input" id="nt_password" type="password" placeholder="Login password"></div>
    </div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-primary" onclick="confirmAddTrainer()">+ Add Trainer</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function confirmAddTrainer() {
  const name = document.getElementById('nt_name').value.trim();
  if (!name) { notify('Name is required.', 'error'); return; }
  const res = await api('/api/trainers', {
    name,
    specialty: document.getElementById('nt_specialty').value,
    username:  document.getElementById('nt_username').value,
    password:  document.getElementById('nt_password').value,
  });
  if (!res.ok) { notify(res.msg || 'Error', 'error'); return; }
  closeModal();
  notify(`Trainer ${name} added!`, 'success');
  await reloadData();
  renderPage('manage_trainers');
}

async function deleteTrainer(id, name) {
  if (!confirm(`Delete trainer ${name}? This cannot be undone.`)) return;
  const res = await api('/api/trainers/delete', { id });
  if (!res.ok) { notify(res.msg || 'Error', 'error'); return; }
  notify(`Trainer ${name} deleted.`, 'success');
  await reloadData();
  renderPage('manage_trainers');
}

async function deleteMember(id, name) {
  if (!confirm(`Delete member ${name}? This cannot be undone.`)) return;
  const res = await api('/api/members/delete', { id });
  if (!res.ok) { notify(res.msg || 'Error', 'error'); return; }
  notify(`Member ${name} deleted.`, 'success');
  await reloadData();
  renderPage('manage_members');
}

function showAddMember() {
  openModal('Add New Member', `
    <div class="grid-2" style="gap:12px">
      <div class="input-group"><label class="input-label">Name</label><input class="input" id="nm_name" placeholder="Full name"></div>
      <div class="input-group"><label class="input-label">Email</label><input class="input" id="nm_email" type="email" placeholder="email@example.com"></div>
      <div class="input-group"><label class="input-label">Phone</label><input class="input" id="nm_phone" placeholder="Phone number"></div>
      <div class="input-group"><label class="input-label">Plan</label>
        <select class="input" id="nm_plan"><option>Basic</option><option>Premium</option><option>Annual</option></select></div>
      <div class="input-group"><label class="input-label">Username</label><input class="input" id="nm_username" placeholder="Login username"></div>
      <div class="input-group"><label class="input-label">Password</label><input class="input" id="nm_password" type="password" placeholder="Login password"></div>
    </div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-primary" onclick="confirmAddMember()">+ Add Member</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function confirmAddMember() {
  const name = document.getElementById('nm_name').value.trim();
  if(!name) { notify('Name is required.','error'); return; }
  await api('/api/members', {
    name, email: document.getElementById('nm_email').value,
    phone: document.getElementById('nm_phone').value,
    plan:  document.getElementById('nm_plan').value,
    username: document.getElementById('nm_username').value.trim(),
    password: document.getElementById('nm_password').value,
  });
  closeModal();
  notify(`Member ${name} added!`, 'success');
  await reloadData();
  renderPage('members');
}

function openModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal(e) {
  if(!e || e.target===document.getElementById('modalOverlay'))
    document.getElementById('modalOverlay').classList.remove('open');
}

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════
function notify(msg, type='success') {
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.innerHTML = `<span>${type==='success'?'✅':'❌'}</span> ${msg}`;
  document.body.appendChild(el);
  setTimeout(()=>{
    el.style.opacity='0'; el.style.transform='translateX(50px)'; el.style.transition='.3s';
    setTimeout(()=>el.remove(), 300);
  }, 3000);
}

document.addEventListener('click', e=>{
  if(e.target.id?.startsWith('star')) setRating(parseInt(e.target.id.replace('star','')));
});

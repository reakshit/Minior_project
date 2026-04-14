// Admin page renderers

async function renderAdminDashboard() {
  const stats = await (await fetch('/api/stats')).json();
  const popularity = stats.popularity;
  const totalRev = stats.total_revenue;
  const activeMem = MEMBERS.filter(m => Math.floor((new Date()-new Date(m.lastVisit))/(1000*86400)) <= 30).length;
  const avgRating = FEEDBACK.length ? (FEEDBACK.reduce((a,f)=>a+f.rating,0)/FEEDBACK.length).toFixed(2) : '—';
  const cols = ['var(--accent3)','var(--accent2)','var(--accent)','var(--success)','var(--danger)'];
  const totalSlots = SCHEDULE.reduce((a,s)=>a+s.booked,0);

  const html = `
  <div class="stat-grid">
    <div class="stat-card" style="--c:var(--accent)">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">₹${totalRev >= 100000 ? (totalRev/100000).toFixed(2)+'L' : (totalRev/1000).toFixed(1)+'K'}</div>
      <div class="stat-sub">Based on active memberships</div>
    </div>
    <div class="stat-card" style="--c:var(--accent3)">
      <div class="stat-label">Active Members</div>
      <div class="stat-value">${activeMem}</div>
      <div class="stat-sub">Visited in last 30 days</div>
    </div>
    <div class="stat-card" style="--c:var(--success)">
      <div class="stat-label">Slots Filled</div>
      <div class="stat-value">${totalSlots}</div>
      <div class="stat-sub">Across all sessions</div>
    </div>
    <div class="stat-card" style="--c:var(--accent2)">
      <div class="stat-label">Avg Rating</div>
      <div class="stat-value">${avgRating}</div>
      <div class="stat-sub">Based on ${FEEDBACK.length} reviews</div>
    </div>
  </div>
  <div class="grid-2" style="margin-bottom:24px">
    <div class="card">
      <div class="card-title">📊 Class Popularity</div>
      ${CLASSES.map((c,i) => {
        const pct = popularity[c] ?? 0;
        return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
            <span>${c}</span><span style="color:var(--muted)">${pct}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="background:${cols[i]};width:0" data-width="${pct}"></div></div>
        </div>`;
      }).join('')}
    </div>
    <div class="card">
      <div class="card-title">🏆 Top Trainers</div>
      ${TRAINERS.slice(0,4).map(t=>`
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div class="avatar" style="font-family:'DM Sans';font-size:14px;flex-shrink:0">${t.name.split(' ').map(w=>w[0]).join('')}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${t.name}</div>
            <div style="font-size:11px;color:var(--muted)">${t.specialty}</div>
          </div>
          <div style="text-align:right">
            <div class="badge badge-accent">⭐ ${t.rating}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">${t.sessions} sessions</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-title">📋 Recent Complaints</div>
    <table>
      <tr><th>Member</th><th>Complaint</th><th>Status</th><th>Date</th><th>Action</th></tr>
      ${COMPLAINTS.map(c=>`
        <tr>
          <td><strong>${c.memberName}</strong></td>
          <td>${c.text}</td>
          <td><span class="badge ${c.status==='Resolved'?'badge-success':'badge-warning'}">${c.status}</span></td>
          <td style="color:var(--muted)">${c.ts}</td>
          <td>${c.status!=='Resolved'?`<button class="btn btn-sm btn-outline-accent" onclick="resolveComplaint(${c.id})">Resolve</button>`:''}</td>
        </tr>
      `).join('')}
    </table>
  </div>`;

  document.getElementById('contentArea').innerHTML = html;
  setTimeout(()=>{ document.querySelectorAll('[data-width]').forEach(el=>{ el.style.width=el.dataset.width+'%'; }); }, 50);
}

function renderMembers() {
  return renderManage('members');
}
function renderTrainers() {
  return renderManage('trainers');
}

function renderManage(tab='members') {
  const tabs = [
    { key:'members',  label:'👥 Members' },
    { key:'trainers', label:'💪 Trainers' },
  ];
  const tabBar = tabs.map(t =>
    `<button class="btn ${tab===t.key?'btn-primary':'btn-ghost'}" onclick="renderPage('manage_${t.key}')">${t.label}</button>`
  ).join('');

  if (tab === 'members') {
    return `
    <div style="display:flex;gap:8px;margin-bottom:20px">${tabBar}</div>
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <input class="input" placeholder="🔍 Search members..." style="flex:1;min-width:180px;max-width:300px" oninput="filterMembers(this.value)">
      <button class="btn btn-primary" onclick="showAddMember()">+ Add Member</button>
    </div>
    <div class="card table-wrap" style="padding:0">
      <table id="membersTable">
        <tr><th>ID</th><th>Name</th><th>Email</th><th>Plan</th><th>Joined</th><th>Last Visit</th><th>Status</th><th>Actions</th></tr>
        ${MEMBERS.map(m => {
          const diff = Math.floor((new Date() - new Date(m.lastVisit)) / (1000*86400));
          const status = diff > 30 ? 'Inactive' : 'Active';
          return `
          <tr>
            <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--muted)">${m.id}</td>
            <td><strong>${m.name}</strong></td>
            <td style="color:var(--muted)">${m.email}</td>
            <td><span class="badge ${m.plan==='Premium'?'badge-accent':m.plan==='Annual'?'badge-success':'badge-info'}">${m.plan}</span></td>
            <td style="color:var(--muted)">${m.joined}</td>
            <td style="color:var(--muted)">${m.lastVisit}</td>
            <td><span class="badge ${status==='Active'?'badge-success':'badge-danger'}">${status}</span></td>
            <td style="display:flex;gap:6px">
              <button class="btn btn-sm btn-ghost" onclick="viewMember('${m.id}')">View</button>
              <button class="btn btn-sm btn-danger" onclick="deleteMember('${m.id}','${m.name}')">🗑</button>
            </td>
          </tr>`;
        }).join('')}
      </table>
    </div>`;
  }

  // trainers tab
  return `
  <div style="display:flex;gap:8px;margin-bottom:20px">${tabBar}</div>
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <button class="btn btn-primary" onclick="showAddTrainer()">+ Add Trainer</button>
  </div>
  <div class="card table-wrap" style="padding:0">
    <table>
      <tr><th>ID</th><th>Name</th><th>Specialty</th><th>Rating</th><th>Sessions</th><th>Schedule</th><th>Actions</th></tr>
      ${TRAINERS.map(t => `
        <tr>
          <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--muted)">${t.id}</td>
          <td><div style="display:flex;align-items:center;gap:8px">
            <div class="avatar" style="width:32px;height:32px;font-size:12px;flex-shrink:0">${t.name.split(' ').map(w=>w[0]).join('')}</div>
            <strong>${t.name}</strong>
          </div></td>
          <td style="color:var(--muted)">${t.specialty}</td>
          <td><span class="badge badge-accent">⭐ ${t.rating}</span></td>
          <td>${t.sessions}</td>
          <td>${SCHEDULE.filter(s=>s.trainerId===t.id).map(s=>'<span class="badge badge-info" style="margin:2px">'+DAYS[s.day]+' '+s.time+'</span>').join('')}</td>
          <td style="display:flex;gap:6px">
            <button class="btn btn-sm btn-ghost" onclick="viewTrainerSchedule('${t.id}')">📅</button>
            <button class="btn btn-sm btn-danger" onclick="deleteTrainer('${t.id}','${t.name}')">🗑</button>
          </td>
        </tr>`).join('')}
    </table>
  </div>`;
}

function renderComplaints(admin=false) {
  return `
  <div class="card table-wrap" style="padding:0">
    <table>
      <tr><th>Member</th><th>Complaint</th><th>Status</th><th>Date</th>${admin?'<th>Action</th>':''}</tr>
      ${COMPLAINTS.map(c=>`
        <tr>
          <td><strong>${c.memberName}</strong><br><span style="font-size:11px;color:var(--muted)">${c.memberId}</span></td>
          <td>${c.text}</td>
          <td><span class="badge ${c.status==='Resolved'?'badge-success':'badge-warning'}">${c.status}</span></td>
          <td style="color:var(--muted)">${c.ts}</td>
          ${admin?`<td>${c.status!=='Resolved'?`<button class="btn btn-sm btn-outline-accent" onclick="resolveComplaint(${c.id})">✅ Resolve</button>`:''}</td>`:''}
        </tr>
      `).join('')}
    </table>
  </div>`;
}

function renderFeedback(admin=false) {
  const avg = (FEEDBACK.reduce((a,f)=>a+f.rating,0)/FEEDBACK.length).toFixed(1);
  return `
  <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card" style="--c:var(--warning)"><div class="stat-label">Avg Rating</div><div class="stat-value">⭐ ${avg}</div></div>
    <div class="stat-card" style="--c:var(--accent3)"><div class="stat-label">Total Reviews</div><div class="stat-value">${FEEDBACK.length}</div></div>
    <div class="stat-card" style="--c:var(--success)"><div class="stat-label">5-Star Reviews</div><div class="stat-value">${FEEDBACK.filter(f=>f.rating===5).length}</div></div>
  </div>
  <div class="card" style="padding:0">
    <table>
      <tr><th>Member</th><th>Feedback</th><th>Rating</th><th>Date</th></tr>
      ${FEEDBACK.map(f=>`
        <tr>
          <td><strong>${f.memberName}</strong></td>
          <td>${f.text}</td>
          <td><span class="stars">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</span></td>
          <td style="color:var(--muted)">${f.ts}</td>
        </tr>
      `).join('')}
    </table>
  </div>`;
}

function renderScheduleAdmin() {
  let gridCells = `<div class="sched-header">Time</div>`;
  DAYS.forEach(d => { gridCells += `<div class="sched-header">${d}</div>`; });
  TIMES.forEach(t => {
    gridCells += `<div class="sched-time">${t}</div>`;
    DAYS.forEach((d,di) => {
      const ev = SCHEDULE.find(s=>s.time===t && s.day===di);
      const trainer = ev ? TRAINERS.find(tr=>tr.id===ev.trainerId) : null;
      const cls = ev ? ev.class.toLowerCase() : '';
      gridCells += `<div class="sched-cell">
        ${ev ? `<div class="sched-event ev-${cls==='crossfit'?'cross':cls}" onclick="viewSession('${ev.id}')">
          <div>${ev.class}</div>
          <div style="font-size:10px;opacity:.7;font-weight:400">${trainer?.name.split(' ')[0]} · ${ev.booked}/${ev.slots}</div>
        </div>` : ''}
      </div>`;
    });
  });
  return `
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${CLASSES.map(c=>`<span class="chip active">${c}</span>`).join('')}
    </div>
    <button class="btn btn-primary" style="margin-left:auto" onclick="showAddSession()">+ Add Session</button>
  </div>
  <div class="schedule-wrap"><div class="schedule-grid">${gridCells}</div></div>
  <div style="display:flex;gap:16px;margin-top:16px;flex-wrap:wrap">
    <div style="font-size:12px;color:var(--muted)">
      ${CLASSES.map((c,i)=>{
        const col=['var(--accent3)','var(--accent)','var(--accent2)','var(--success)','var(--danger)'];
        return `<span style="margin-right:12px"><span style="color:${col[i]}">●</span> ${c}</span>`;
      }).join('')}
    </div>
  </div>`;
}

// renderTrainers is now handled by renderManage('trainers')

async function renderRevenue() {
  const stats = await (await fetch('/api/stats')).json();
  const docs  = stats.revenue; // [{month, premium, basic, annual}, ...]

  const months  = docs.map(d => d.month);
  const premium = docs.map(d => (d.premium || 0) + (d.annual || 0));
  const basic   = docs.map(d => d.basic || 0);
  const rev     = docs.map((d,i) => premium[i] + basic[i]);
  const total   = rev.reduce((a,b)=>a+b, 0);
  const thisMonth = rev[rev.length-1] || 0;

  setTimeout(() => {
    if (!docs.length) return;
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (ctx) new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label:'Premium / Annual', data:premium, backgroundColor:'#e8ff4799', borderColor:'#e8ff47', borderWidth:1, borderRadius:4 },
          { label:'Basic',            data:basic,   backgroundColor:'#47c8ff55', borderColor:'#47c8ff', borderWidth:1, borderRadius:4 }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: { legend:{labels:{color:'#7070a0',font:{family:'DM Sans'}}}, tooltip:{callbacks:{label:c=>` ₹${(c.raw/1000).toFixed(1)}K`}} },
        scales: {
          x:{ stacked:true, ticks:{color:'#7070a0'}, grid:{color:'#2a2a3a'} },
          y:{ stacked:true, ticks:{color:'#7070a0',callback:v=>'₹'+(v/1000)+'K'}, grid:{color:'#2a2a3a'} }
        }
      }
    });
    const ctx2 = document.getElementById('revLineChart')?.getContext('2d');
    if (ctx2) new Chart(ctx2, {
      type:'line',
      data:{ labels:months, datasets:[{ label:'Total Revenue', data:rev, borderColor:'#e8ff47', backgroundColor:'#e8ff4715', pointBackgroundColor:'#e8ff47', tension:0.4, fill:true }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>` ₹${(c.raw/1000).toFixed(1)}K`}} },
        scales:{ x:{ticks:{color:'#7070a0'},grid:{color:'#2a2a3a'}}, y:{ticks:{color:'#7070a0',callback:v=>'₹'+(v/1000)+'K'},grid:{color:'#2a2a3a'}} }
      }
    });
  }, 0);

  const fmt = v => v >= 100000 ? '₹'+(v/100000).toFixed(2)+'L' : '₹'+(v/1000).toFixed(1)+'K';

  const html = `
  <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:16px">
    <span style="font-size:12px;color:var(--muted)">📌 Revenue is auto-calculated from member memberships</span>
  </div>
  <div class="stat-grid">
    <div class="stat-card" style="--c:var(--accent)"><div class="stat-label">This Month</div><div class="stat-value">${fmt(thisMonth)}</div></div>
    <div class="stat-card" style="--c:var(--success)"><div class="stat-label">Total Recorded</div><div class="stat-value">${fmt(total)}</div></div>
    <div class="stat-card" style="--c:var(--accent3)"><div class="stat-label">Months Tracked</div><div class="stat-value">${docs.length}</div></div>
  </div>
  ${docs.length ? `
  <div class="grid-2">
    <div class="card"><div class="card-title">📊 Revenue by Plan</div><div style="height:240px"><canvas id="revenueChart"></canvas></div></div>
    <div class="card"><div class="card-title">📈 Revenue Trend</div><div style="height:240px"><canvas id="revLineChart"></canvas></div></div>
  </div>
  <div class="card" style="padding:0;margin-top:24px">
    <table>
      <tr><th>Month</th><th>Premium/Annual</th><th>Basic</th><th>Total</th></tr>
      ${docs.map((d,i)=>`
        <tr>
          <td><strong>${d.month}</strong></td>
          <td style="color:var(--accent)">₹${((d.premium||0)+(d.annual||0)).toLocaleString()}</td>
          <td style="color:var(--accent3)">₹${(d.basic||0).toLocaleString()}</td>
          <td><strong>₹${rev[i].toLocaleString()}</strong></td>
        </tr>`).join('')}
    </table>
  </div>` : '<div class="card" style="text-align:center;color:var(--muted);padding:40px">No revenue records yet. Add a monthly record to get started.</div>'}`;

  document.getElementById('contentArea').innerHTML = html;
}

function renderReports() {
  return `
  <div class="grid-2">
    <div class="card">
      <div class="card-title">📋 Available Reports</div>
      ${[
        ['Member Attendance Report',   'Monthly summary of all member attendance',     'badge-accent'],
        ['Revenue & Billing Report',   'Detailed revenue breakdown by class and plan', 'badge-success'],
        ['Inactive Members Report',    'Members with no visit in 30+ days',            'badge-warning'],
        ['Trainer Performance Report', 'Ratings and session counts per trainer',       'badge-info'],
        ['Class Utilization Report',   'Slot fill rates per class type',               'badge-accent'],
      ].map(([title,desc])=>`
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${title}</div>
            <div style="font-size:12px;color:var(--muted)">${desc}</div>
          </div>
          <button class="btn btn-sm btn-ghost" onclick="notify('Report downloaded!','success')">⬇ Download</button>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div class="card-title">📊 Quick Stats</div>
      ${[
        ['Total Members',       MEMBERS.length,                                    'var(--accent)'],
        ['Active Trainers',     TRAINERS.length,                                   'var(--accent3)'],
        ['Weekly Sessions',     SCHEDULE.length,                                   'var(--success)'],
        ['Open Complaints',     COMPLAINTS.filter(c=>c.status==='Pending').length, 'var(--warning)'],
        ['Avg Feedback Rating', '4.75 ⭐',                                         'var(--accent2)'],
      ].map(([label,val,col])=>`
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted)">${label}</span>
          <span style="font-weight:700;color:${col}">${val}</span>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// Admin page renderers

function renderAdminDashboard() {
  return `
  <div class="stat-grid">
    <div class="stat-card" style="--c:var(--accent)">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">₹1.28L</div>
      <div class="stat-sub">↑ 12% from last month</div>
    </div>
    <div class="stat-card" style="--c:var(--accent3)">
      <div class="stat-label">Active Members</div>
      <div class="stat-value">287</div>
      <div class="stat-sub">↑ 23 new this month</div>
    </div>
    <div class="stat-card" style="--c:var(--success)">
      <div class="stat-label">Sessions Today</div>
      <div class="stat-value">8</div>
      <div class="stat-sub">120 slots filled</div>
    </div>
    <div class="stat-card" style="--c:var(--accent2)">
      <div class="stat-label">Avg Rating</div>
      <div class="stat-value">4.75</div>
      <div class="stat-sub">Based on 48 reviews</div>
    </div>
  </div>
  <div class="grid-2" style="margin-bottom:24px">
    <div class="card">
      <div class="card-title">📊 Class Popularity</div>
      ${CLASSES.map((c,i)=>{
        const pcts=[70,55,88,65,45];
        const cols=['var(--accent3)','var(--accent2)','var(--accent)','var(--success)','var(--danger)'];
        return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
            <span>${c}</span><span style="color:var(--muted)">${pcts[i]}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="background:${cols[i]};width:0" data-width="${pcts[i]}"></div></div>
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
}

function renderMembers() {
  return `
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <input class="input" placeholder="🔍 Search members..." style="flex:1;min-width:180px;max-width:300px" oninput="filterMembers(this.value)">
    <button class="btn btn-primary" onclick="showAddMember()">+ Add Member</button>
    <button class="btn btn-ghost">📥 Export</button>
  </div>
  <div class="card table-wrap" style="padding:0">
    <table id="membersTable">
      <tr><th>ID</th><th>Name</th><th>Email</th><th>Plan</th><th>Joined</th><th>Last Visit</th><th>Status</th><th>Actions</th></tr>
      ${MEMBERS.map(m=>{
        const diff = Math.floor((new Date()-new Date(m.lastVisit))/(1000*86400));
        const status = diff>30 ? 'Inactive' : 'Active';
        return `
        <tr>
          <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--muted)">${m.id}</td>
          <td><strong>${m.name}</strong></td>
          <td style="color:var(--muted)">${m.email}</td>
          <td><span class="badge ${m.plan==='Premium'?'badge-accent':m.plan==='Annual'?'badge-success':'badge-info'}">${m.plan}</span></td>
          <td style="color:var(--muted)">${m.joined}</td>
          <td style="color:var(--muted)">${m.lastVisit}</td>
          <td><span class="badge ${status==='Active'?'badge-success':'badge-danger'}">${status}</span></td>
          <td><button class="btn btn-sm btn-ghost" onclick="viewMember('${m.id}')">View</button></td>
        </tr>`;
      }).join('')}
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

function renderTrainers() {
  return `
  <div class="grid-3">
    ${TRAINERS.map(t=>`
      <div class="card" style="position:relative">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div class="avatar" style="width:52px;height:52px;font-size:20px;flex-shrink:0">${t.name.split(' ').map(w=>w[0]).join('')}</div>
          <div>
            <div style="font-size:16px;font-weight:600">${t.name}</div>
            <div style="font-size:12px;color:var(--muted)">${t.specialty}</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div class="stat-card" style="flex:1;padding:12px;--c:var(--accent)">
            <div class="stat-label" style="font-size:10px">Rating</div>
            <div class="stat-value" style="font-size:28px">⭐ ${t.rating}</div>
          </div>
          <div class="stat-card" style="flex:1;padding:12px;--c:var(--accent3)">
            <div class="stat-label" style="font-size:10px">Sessions</div>
            <div class="stat-value" style="font-size:28px">${t.sessions}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
          ${SCHEDULE.filter(s=>s.trainerId===t.id).map(s=>`
            <span class="badge badge-info" style="margin-right:4px;margin-bottom:4px">${DAYS[s.day]} ${s.time}</span>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-ghost" onclick="viewTrainerSchedule('${t.id}')">📅 Schedule</button>
          <button class="btn btn-sm btn-outline-accent" onclick="notify('Message sent to ${t.name}','success')">✉️ Message</button>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function renderRevenue() {
  const months = ['Oct','Nov','Dec','Jan','Feb','Mar'];
  const rev    = [82000,95000,110000,103000,118000,128450];
  const plan   = [38000,44000,52000,48000,55000,61200];
  const basic  = rev.map((r,i) => r - plan[i]);

  setTimeout(() => {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Premium / Annual',
            data: plan,
            backgroundColor: '#e8ff4799',
            borderColor: '#e8ff47',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Basic',
            data: basic,
            backgroundColor: '#47c8ff55',
            borderColor: '#47c8ff',
            borderWidth: 1,
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#7070a0', font: { family: 'DM Sans' } } },
          tooltip: {
            callbacks: {
              label: ctx => ` ₹${(ctx.raw/1000).toFixed(1)}K`
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { color: '#7070a0' }, grid: { color: '#2a2a3a' } },
          y: { stacked: true, ticks: { color: '#7070a0', callback: v => '₹'+(v/1000)+'K' }, grid: { color: '#2a2a3a' } }
        }
      }
    });

    const ctx2 = document.getElementById('revLineChart').getContext('2d');
    new Chart(ctx2, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Total Revenue',
          data: rev,
          borderColor: '#e8ff47',
          backgroundColor: '#e8ff4715',
          pointBackgroundColor: '#e8ff47',
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ₹${(ctx.raw/1000).toFixed(1)}K` } }
        },
        scales: {
          x: { ticks: { color: '#7070a0' }, grid: { color: '#2a2a3a' } },
          y: { ticks: { color: '#7070a0', callback: v => '₹'+(v/1000)+'K' }, grid: { color: '#2a2a3a' } }
        }
      }
    });
  }, 0);

  return `
  <div class="stat-grid">
    <div class="stat-card" style="--c:var(--accent)"><div class="stat-label">This Month</div><div class="stat-value">₹1.28L</div><div class="stat-sub">↑ 8.8% MoM</div></div>
    <div class="stat-card" style="--c:var(--success)"><div class="stat-label">YTD Revenue</div><div class="stat-value">₹6.36L</div><div class="stat-sub">Target: ₹8L</div></div>
    <div class="stat-card" style="--c:var(--accent3)"><div class="stat-label">Avg Per Member</div><div class="stat-value">₹447</div><div class="stat-sub">287 active members</div></div>
    <div class="stat-card" style="--c:var(--accent2)"><div class="stat-label">Outstanding</div><div class="stat-value">₹12K</div><div class="stat-sub">8 pending dues</div></div>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="card-title">📊 Revenue by Plan</div>
      <div style="height:240px"><canvas id="revenueChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">📈 Revenue Trend</div>
      <div style="height:240px"><canvas id="revLineChart"></canvas></div>
    </div>
  </div>`;
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

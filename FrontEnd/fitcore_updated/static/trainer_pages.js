

function renderTrainerSchedule() {
  const mySessions = SCHEDULE.filter(s=>s.trainerId===currentUser.id);
  let gridCells = `<div class="sched-header">Time</div>`;
  DAYS.forEach(d => { gridCells += `<div class="sched-header">${d}</div>`; });
  TIMES.forEach(t => {
    gridCells += `<div class="sched-time">${t}</div>`;
    DAYS.forEach((d,di) => {
      const ev  = mySessions.find(s=>s.time===t && s.day===di);
      const cls = ev ? ev.class.toLowerCase() : '';
      gridCells += `<div class="sched-cell">
        ${ev ? `<div class="sched-event ev-${cls==='crossfit'?'cross':cls}" onclick="viewSession('${ev.id}')">
          <div>${ev.class}</div>
          <div style="font-size:10px;opacity:.7;font-weight:400">${ev.booked}/${ev.slots} booked</div>
        </div>` : ''}
      </div>`;
    });
  });
  return `
  <div class="grid-3" style="margin-bottom:24px">
    <div class="stat-card" style="--c:var(--accent)"><div class="stat-label">My Sessions/Week</div><div class="stat-value">${mySessions.length}</div></div>
    <div class="stat-card" style="--c:var(--accent3)"><div class="stat-label">Total Booked</div><div class="stat-value">${mySessions.reduce((a,s)=>a+s.booked,0)}</div></div>
    <div class="stat-card" style="--c:var(--success)"><div class="stat-label">Available Slots</div><div class="stat-value">${mySessions.reduce((a,s)=>a+(s.slots-s.booked),0)}</div></div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div style="font-size:14px;color:var(--muted)">Showing: <strong style="color:var(--text)">${currentUser.name}</strong>'s schedule</div>
    <button class="btn btn-primary" onclick="showAddSession()">+ Add Session</button>
  </div>
  <div class="schedule-wrap"><div class="schedule-grid">${gridCells}</div></div>`;
}

function renderTrainerMembers() {
  const myClasses     = SCHEDULE.filter(s=>s.trainerId===currentUser.id).map(s=>s.id);
  const myBookings    = BOOKINGS.filter(b=>myClasses.includes(b.schedId));
  const uniqueMembers = [...new Map(myBookings.map(b=>[b.memberId,b])).values()];
  return `
  <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card" style="--c:var(--accent)"><div class="stat-label">My Students</div><div class="stat-value">${uniqueMembers.length}</div></div>
    <div class="stat-card" style="--c:var(--accent3)"><div class="stat-label">Active Bookings</div><div class="stat-value">${myBookings.length}</div></div>
    <div class="stat-card" style="--c:var(--success)"><div class="stat-label">Attendance Rate</div><div class="stat-value">87%</div></div>
  </div>
  <div class="card" style="padding:0">
    <table>
      <tr><th>Member</th><th>Class</th><th>Status</th><th>Actions</th></tr>
      ${myBookings.map(b=>{
        const sched = SCHEDULE.find(s=>s.id===b.schedId);
        return `
        <tr>
          <td><strong>${b.memberName}</strong></td>
          <td><span class="badge badge-info">${sched?.class||'—'} · ${DAYS[sched?.day||0]} ${sched?.time}</span></td>
          <td><span class="badge badge-success">${b.status}</span></td>
          <td><button class="btn btn-sm btn-ghost" onclick="notify('Progress report for ${b.memberName} opened','success')">📊 Progress</button></td>
        </tr>`;
      }).join('')}
    </table>
  </div>`;
}

function renderClassAnalytics() {
  const mySessions = SCHEDULE.filter(s=>s.trainerId===currentUser.id);
  return `
  <div class="card" style="margin-bottom:24px">
    <div class="card-title">📊 Session Utilization</div>
    ${mySessions.map(s=>{
      const pct = Math.round(s.booked/s.slots*100);
      return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span><strong>${s.class}</strong> · ${DAYS[s.day]} ${s.time}</span>
          <span style="color:var(--muted)">${s.booked}/${s.slots} · <strong style="color:${pct>80?'var(--success)':pct>50?'var(--warning)':'var(--danger)'}">${pct}%</strong></span>
        </div>
        <div class="progress-bar"><div class="progress-fill" data-width="${pct}" style="width:0;background:${pct>80?'var(--success)':pct>50?'var(--warning)':'var(--danger)'}"></div></div>
      </div>`;
    }).join('')}
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="card-title">⭐ My Ratings</div>
      ${[5,4,3].map(r=>{
        const cnt = r===5?1:r===4?1:0;
        return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <span class="stars" style="font-size:14px">${'★'.repeat(r)}</span>
          <div class="progress-bar" style="flex:1"><div class="progress-fill" data-width="${cnt/2*100}" style="width:0;background:var(--warning)"></div></div>
          <span style="font-size:12px;color:var(--muted)">${cnt}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="card">
      <div class="card-title">📅 Upcoming Sessions</div>
      ${mySessions.slice(0,3).map(s=>`
        <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
          <div><strong>${s.class}</strong><br><span style="font-size:12px;color:var(--muted)">${DAYS[s.day]} · ${s.time}</span></div>
          <span class="badge ${s.booked>=s.slots?'badge-danger':'badge-success'}">${s.booked>=s.slots?'Full':'Open'}</span>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// Trainer also uses renderFeedback from Admin/pages.js — redeclare here for standalone use
function renderFeedback() {
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

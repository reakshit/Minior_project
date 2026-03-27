// Member page renderers

function renderMemberDash() {
  const myB = BOOKINGS.filter(b=>b.memberId===currentUser.id);
  return `
  <div class="grid-3" style="margin-bottom:24px">
    <div class="stat-card" style="--c:var(--accent)"><div class="stat-label">My Bookings</div><div class="stat-value">${myB.length}</div></div>
    <div class="stat-card" style="--c:var(--accent3)"><div class="stat-label">Classes Attended</div><div class="stat-value">24</div></div>
    <div class="stat-card" style="--c:var(--success)"><div class="stat-label">Streak</div><div class="stat-value">7🔥</div><div class="stat-sub">days in a row</div></div>
  </div>
  <div class="grid-2">
    <div class="member-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:12px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Member Card</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:2px">${currentUser.name}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">ID: ${currentUser.id} · Premium Plan</div>
        </div>
        <div class="badge badge-success" style="font-size:13px;padding:6px 14px">Active</div>
      </div>
      <div style="display:flex;gap:16px;margin-top:20px">
        <div><div style="font-size:11px;color:var(--muted)">Valid Until</div><div style="font-size:14px;font-weight:600">Dec 2026</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Plan</div><div style="font-size:14px;font-weight:600">Premium</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Since</div><div style="font-size:14px;font-weight:600">Aug 2025</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">📅 Upcoming Classes</div>
      ${myB.map(b=>{
        const s = SCHEDULE.find(sc=>sc.id===b.schedId);
        const t = s ? TRAINERS.find(tr=>tr.id===s.trainerId) : null;
        return s ? `
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between">
            <strong>${s.class}</strong>
            <span class="badge badge-success">${b.status}</span>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">${DAYS[s.day]} · ${s.time} · ${t?.name}</div>
        </div>` : '';
      }).join('')}
    </div>
  </div>`;
}

function renderBookClass() {
  return `
  <div style="margin-bottom:20px;display:flex;gap:12px;flex-wrap:wrap">
    <select class="input" style="max-width:160px" id="filterClass" onchange="filterBookClasses()">
      <option value="">All Classes</option>
      ${CLASSES.map(c=>`<option>${c}</option>`).join('')}
    </select>
    <select class="input" style="max-width:160px" id="filterTrainer" onchange="filterBookClasses()">
      <option value="">All Trainers</option>
      ${TRAINERS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
    </select>
  </div>
  <div class="grid-3" id="classCards">
    ${SCHEDULE.map(s=>{
      const trainer  = TRAINERS.find(t=>t.id===s.trainerId);
      const isFull   = s.booked >= s.slots;
      const isBooked = BOOKINGS.some(b=>b.schedId===s.id && b.memberId===currentUser.id);
      const cls      = s.class.toLowerCase();
      const colMap   = {cardio:'var(--accent3)',yoga:'var(--accent2)',strength:'var(--accent)',zumba:'var(--success)',crossfit:'var(--danger)'};
      const col      = colMap[cls] || 'var(--accent)';
      return `
      <div class="card" style="border-color:${isBooked?col:''}" data-class="${s.class}" data-trainer="${s.trainerId}">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span class="badge" style="background:${col}20;color:${col}">${s.class}</span>
          <span class="badge ${isFull?'badge-danger':isBooked?'badge-success':'badge-info'}">${isFull?'Full':isBooked?'Booked':`${s.slots-s.booked} left`}</span>
        </div>
        <div style="font-size:18px;font-weight:700;margin-bottom:4px">${DAYS[s.day]} · ${s.time}</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:12px">
          <strong style="color:var(--text)">${trainer?.name}</strong> · ⭐ ${trainer?.rating}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div>
            <div class="progress-bar"><div class="progress-fill" data-width="${Math.round(s.booked/s.slots*100)}" style="width:0;background:${col}"></div></div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">${s.booked}/${s.slots} booked</div>
          </div>
        </div>
        ${!isFull && !isBooked
          ? `<button class="btn btn-primary" style="width:100%" onclick="bookSession('${s.id}')">Book Now</button>`
          : isBooked
            ? `<button class="btn btn-ghost" style="width:100%" onclick="cancelBooking('${s.id}')">Cancel Booking</button>`
            : `<button class="btn btn-ghost" style="width:100%" disabled>Class Full</button>`}
      </div>`;
    }).join('')}
  </div>`;
}

function renderMyBookings() {
  const myB = BOOKINGS.filter(b=>b.memberId===currentUser.id);
  return `
  <div class="card" style="padding:0">
    ${myB.length===0
      ? '<div style="padding:40px;text-align:center;color:var(--muted)">No bookings yet. <a href="#" onclick="navigate(\'bookClass\',document.querySelector(\'[data-page=bookClass]\'))">Book a class!</a></div>'
      : `<table>
          <tr><th>Class</th><th>Day & Time</th><th>Trainer</th><th>Status</th><th>Action</th></tr>
          ${myB.map(b=>{
            const s = SCHEDULE.find(sc=>sc.id===b.schedId);
            const t = s ? TRAINERS.find(tr=>tr.id===s.trainerId) : null;
            return s ? `
            <tr>
              <td><strong>${s.class}</strong></td>
              <td>${DAYS[s.day]} · ${s.time}</td>
              <td>${t?.name || '—'}</td>
              <td><span class="badge badge-success">${b.status}</span></td>
              <td><button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.schedId}')">Cancel</button></td>
            </tr>` : '';
          }).join('')}
        </table>`}
  </div>`;
}

function renderMyProgress() {
  const weeks = 12;
  const cells = Array.from({length:weeks*7},(_,i)=>({
    week:Math.floor(i/7), day:i%7,
    active: Math.random()>.45,
    intensity: Math.floor(Math.random()*3)+1
  }));
  return `
  <div class="grid-3" style="margin-bottom:24px">
    <div class="stat-card" style="--c:var(--accent)"><div class="stat-label">Total Visits</div><div class="stat-value">24</div><div class="stat-sub">This month</div></div>
    <div class="stat-card" style="--c:var(--success)"><div class="stat-label">Best Streak</div><div class="stat-value">12</div><div class="stat-sub">days consecutive</div></div>
    <div class="stat-card" style="--c:var(--accent3)"><div class="stat-label">Favourite Class</div><div class="stat-value" style="font-size:20px">Cardio</div></div>
  </div>
  <div class="card" style="margin-bottom:24px">
    <div class="card-title">📅 Attendance Heatmap (Last 12 Weeks)</div>
    <div style="display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:8px">
      ${Array.from({length:weeks},(_,w)=>`
        <div style="display:flex;flex-direction:column;gap:3px">
          ${Array.from({length:7},(_,d)=>{
            const c = cells[w*7+d];
            return `<div class="hm-cell${c.active?' hm-'+c.intensity:''}" title="${DAYS[d]} W${w+1}"></div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;align-items:center;font-size:12px;color:var(--muted)">
      Less <div class="hm-cell"></div><div class="hm-cell hm-1"></div><div class="hm-cell hm-2"></div><div class="hm-cell hm-3"></div> More
    </div>
  </div>
  <div class="grid-2">
    ${CLASSES.map((c,i)=>{
      const cnt = [6,8,4,3,3][i];
      const pct = cnt/8*100;
      return `
      <div class="card">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px">${c}</div>
        <div style="font-size:32px;font-family:'Bebas Neue';color:var(--accent);margin-bottom:8px">${cnt} sessions</div>
        <div class="progress-bar"><div class="progress-fill" data-width="${pct}" style="width:0"></div></div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderMemberComplaints() {
  const mine = COMPLAINTS.filter(c=>c.memberId===currentUser.id);
  return `
  <div class="grid-2">
    <div>
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">📝 Submit a Complaint</div>
        <div class="input-group"><label class="input-label">Complaint</label>
          <textarea class="input" id="complaintText" rows="4" placeholder="Describe your complaint..."></textarea></div>
        <button class="btn btn-primary" onclick="submitComplaint()">Submit Complaint</button>
      </div>
    </div>
    <div class="card" style="padding:0">
      <div style="padding:20px 24px 12px"><strong>My Complaints (${mine.length})</strong></div>
      <table>
        <tr><th>Complaint</th><th>Status</th><th>Date</th></tr>
        ${mine.length===0
          ? '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">No complaints submitted</td></tr>'
          : mine.map(c=>`
            <tr>
              <td>${c.text}</td>
              <td><span class="badge ${c.status==='Resolved'?'badge-success':'badge-warning'}">${c.status}</span></td>
              <td style="color:var(--muted)">${c.ts}</td>
            </tr>`).join('')}
      </table>
    </div>
  </div>`;
}

function renderMemberFeedback() {
  return `
  <div class="grid-2">
    <div class="card">
      <div class="card-title">⭐ Submit Feedback</div>
      <div class="input-group"><label class="input-label">Class / Trainer</label>
        <select class="input" id="feedClass">
          ${CLASSES.map(c=>`<option>${c}</option>`).join('')}
        </select></div>
      <div class="input-group"><label class="input-label">Rating</label>
        <div style="display:flex;gap:8px">
          ${[1,2,3,4,5].map(r=>`<span style="font-size:28px;cursor:pointer;transition:.2s" id="star${r}" onclick="setRating(${r})">☆</span>`).join('')}
        </div>
        <input type="hidden" id="ratingVal" value="5">
      </div>
      <div class="input-group"><label class="input-label">Comment</label>
        <textarea class="input" id="feedText" rows="4" placeholder="Tell us about your experience..."></textarea></div>
      <button class="btn btn-primary" onclick="submitFeedback()">Submit Feedback</button>
    </div>
    <div class="card" style="padding:0">
      <div style="padding:20px 24px 12px"><strong>Recent Feedback</strong></div>
      <table>
        <tr><th>Feedback</th><th>Rating</th><th>Date</th></tr>
        ${FEEDBACK.map(f=>`
          <tr>
            <td>${f.text}</td>
            <td><span class="stars" style="font-size:13px">${'★'.repeat(f.rating)}</span></td>
            <td style="color:var(--muted)">${f.ts}</td>
          </tr>`).join('')}
      </table>
    </div>
  </div>`;
}

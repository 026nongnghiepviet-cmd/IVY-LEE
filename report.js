/* report.js — V55 report module (giữ nguyên tính năng) */

function openReport(name, el) {
  document.querySelectorAll('.menu-item').forEach(n=>n.classList.remove('active'));
  const menu=document.getElementById('menu-'+name); if(menu) menu.classList.add('active');

  activeUser=name;
  document.getElementById('display-name').innerText=name;
  document.getElementById('work-area').style.display='block';

  loadTableForDate(name, todayStr);
  renderHistoryList(name);
}

function loadTableForDate(name, targetDate) {
  viewingDate = targetDate;

  const isT = getNorm(targetDate) === getNorm(todayStr);
  const isF = getNorm(targetDate) === getNorm(getTom());
  const isP = !isT && !isF;

  const now = new Date();
  const isTimeLocked = isP || (isT && (now.getDay()===0 || now.getHours()>=17));

  document.getElementById('daily-view-info').innerText =
    isF ? "(Ngày Mai)" : (isP ? "(Lịch sử)" : (isTimeLocked ? "(Đã khóa 17h)" : "(Hôm nay)"));

  const isMe = (myIdentity === name);
  const canEdit = isMe && !isTimeLocked;
  const isBossUser = (myIdentity === BOSS);

  const showSaveBtn = canEdit || isBossUser;

  document.getElementById('assign-dl-container').style.display = canEdit ? 'block' : 'none';
  document.getElementById('saveReceivedBtn').style.display = canEdit ? 'block' : 'none';
  document.getElementById('addBtn').style.display = canEdit ? 'block' : 'none';
  document.getElementById('saveBtn').style.display = showSaveBtn ? 'block' : 'none';

  const tbody = document.getElementById('input-rows'); tbody.innerHTML = "";

  const dayD = globalData.filter(r => r[1].trim()===name.trim() && getNorm(r[0])===getNorm(targetDate) && !r[5].includes("[DL:"));

  if (dayD.length > 0) {
    dayD.forEach(r => addRow(r[3], r[4], r[5], r[7]||"", "", r[6], true, canEdit));
  } else if (isT || isF) {
    const prevData = globalData.filter(r =>
      r[1].trim()===name.trim() &&
      !r[5].includes("[DL:") &&
      getNorm(r[0]).split('-').reverse().join('') < getNorm(targetDate).split('-').reverse().join('')
    );

    if(prevData.length > 0) {
      const lastD = getNorm(prevData[prevData.length-1][0]);
      prevData
        .filter(r => getNorm(r[0])===lastD && fixProgValue(r[4])!=="100" && !r[5].includes("[DL:"))
        .forEach(r => {
          addRow(r[3], r[4], r[5], r[7]||"", lastD, "", false, canEdit, true);
        });
    }
  }

  if(canEdit && tbody.rows.length < 3) while(tbody.rows.length < 3) addRow("","","","","", "", false, true);

  // --- DEADLINE ---
  const dlBody = document.getElementById('receive-dl-rows'); dlBody.innerHTML = "";
  let dlT = [];

  if (isMe && (myIdentity === BOSS || myIdentity === DEPUTY)) {
    dlT = globalData.filter(r => r[5].includes("[DL:") && fixProgValue(r[4]) !== "100");
  } else {
    dlT = globalData.filter(r => r[1].trim() === name && r[5].includes("[DL:") && fixProgValue(r[4]) !== "100");
  }

  if(dlT.length > 0) {
    document.getElementById('no-dl-msg').style.display='none';
    const isMasterView = (isMe && (myIdentity === BOSS || myIdentity === DEPUTY));
    dlT.forEach(r => addReceiveRow(
      r[3],
      r[4],
      r[5].split("[DL:")[0].trim(),
      r[5].split("[DL:")[1].replace("]",""),
      r[1],
      r[6],
      true,
      canEdit,
      isMasterView
    ));
  } else {
    document.getElementById('no-dl-msg').style.display='block';
  }

  updateUI();
}

// ===== Rows =====
function addRow(t="", p="", n="", mn="", c="", uid="", isSaved=false, isEditable=true, isCarry=false) {
  const tbody = document.getElementById('input-rows');
  const tr = document.createElement('tr');

  let cn = n;
  let dc = c;
  if(n.includes("[CARRY:")){
    const pts = n.split("[CARRY:");
    cn = pts[0].trim();
    dc = pts[1].replace("]", "");
  }

  let lockAll = !isEditable;
  let lockTask = lockAll || (isCarry && t !== "");

  const isBossUser = (myIdentity === BOSS);
  const lockMNote = !isBossUser;

  const rowUid = uid || generateUID();
  if(isSaved) tr.classList.add('row-saved');

  const hideDelete = lockAll || isCarry;

  tr.innerHTML = `<input type='hidden' class='in-uid' value='${rowUid}'/>
    <td class='col-stt'>${tbody.rows.length + 1}</td>
    <td class='col-task'>
      <input class='in-task' type='text' value='${t}' placeholder='Nội dung...' autocomplete='off' ${lockTask?'disabled':''}/>
      ${dc ? `<span class='carry-label'>⚠ Tồn từ: ${stdDate(dc)}</span>` : ""}
    </td>
    <td class='col-prog'><input class='in-prog' type='number' value='${fixProgValue(p)}' autocomplete='off' ${lockAll?'disabled':''}/></td>
    <td class='col-note'><textarea class='in-note' ${lockAll?'disabled':''}>${cn}</textarea></td>
    <td class='col-mnote'><textarea class='in-mnote' placeholder='...' ${lockMNote?'disabled':''}>${mn}</textarea></td>
    <td class='col-del'>${hideDelete ? "" : `<button class='btn-del' onclick='this.closest("tr").remove()'>✕</button>`}</td>`;

  tbody.appendChild(tr);
  updateUI();
}

function addReceiveRow(t="", p="", n="", dl="", targetUser="", uid="", isSaved=true, isEditable=true, isMasterView=false) {
  const tbody = document.getElementById('receive-dl-rows');
  const tr = document.createElement('tr');
  if(isSaved) tr.classList.add('row-saved');

  const isMyDeadline = (targetUser.trim() === myIdentity);

  let lockTaskDate = true;
  let lockProgress = true;

  if (isEditable) {
    if (isMasterView) {
      lockTaskDate = false;
      lockProgress = !isMyDeadline;
    } else if (isMyDeadline) {
      lockTaskDate = true;
      lockProgress = false;
    }
  }

  tr.innerHTML = `<input type='hidden' class='in-uid' value='${uid}'/>
    <input type='hidden' class='in-name' value='${targetUser}'/>
    <td class='col-stt'>!</td>
    <td class='col-task'>
      <input class='dl-task' type='text' value='${t}' ${lockTaskDate?'disabled':''}/>
      <div style='font-size:10px; color:#1a73e8; font-weight:bold'>👤 ${targetUser}</div>
    </td>
    <td class='col-assign'><input type='text' value='${targetUser}' disabled/></td>
    <td class='col-prog'><input class='dl-prog' type='number' value='${fixProgValue(p)}' autocomplete='off' ${lockProgress?'disabled':''}/></td>
    <td class='col-date'><input class='dl-day' type='text' value='${stdDate(dl)}' ${lockTaskDate?'disabled':''}/></td>`;

  tbody.appendChild(tr);
  updateUI();
}

function addAssignRow(t="", p="", n="", dl="", names="", uid="") {
  const tbody = document.getElementById('assign-dl-rows');
  if(!tbody) return;

  const tr = document.createElement('tr');
  const rowUid = uid || generateUID();

  tr.innerHTML = `<input type='hidden' class='in-uid' value='${rowUid}'/>
    <td class='col-stt'>!</td>
    <td class='col-task'><input class='dl-task' type='text' value='${t}' placeholder='Dự án...' autocomplete='off'/></td>
    <td class='col-assign' style='background:#fdf2f2;'><input class='dl-to' type='text' value='${names}' placeholder='Tài, Duy...' autocomplete='off'/></td>
    <td class='col-prog'><input class='dl-prog' type='number' value='${fixProgValue(p)}' autocomplete='off'/></td>
    <td class='col-date'><input class='dl-day' type='text' value='${stdDate(dl)}' onblur='this.value=stdDate(this.value)' autocomplete='off'/></td>
    <td class='col-del'><button class='btn-del' type='button' onclick='this.closest("tr").remove()'>✕</button></td>
    <input type='hidden' class='dl-note' value='${n}'/>`;

  tbody.appendChild(tr);
  updateUI();
}

// ===== Save =====
async function saveAssignedDeadlines() {
  showToast("⏳ Đang giao...");
  const p = [];

  document.querySelectorAll('#assign-dl-rows tr').forEach(tr => {
    const t = tr.querySelector('.dl-task').value.trim();
    const names = tr.querySelector('.dl-to').value.toLowerCase();
    const uid = tr.querySelector('.in-uid').value;
    const dl = stdDate(tr.querySelector('.dl-day').value);

    const senderTitle = (myIdentity === BOSS) ? "Trưởng phòng" : "Phó phòng";

    STAFF_LIST.forEach(fullName => {
      if(names.includes(fullName.split(' ').pop().toLowerCase())) {
        p.push({
          date: todayStr,
          name: fullName,
          stt: "DL",
          task: t,
          progress: tr.querySelector('.dl-prog').value,
          note: senderTitle + " giao [DL:" + dl + "]",
          uid: uid
        });
      }
    });
  });

  applyInstantUpdate(p);
  try {
    await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(p), mode: 'no-cors' });
    showToast("🎉 Đã giao!");
  } catch(e) {}
}

async function saveReceivedDeadlines() {
  showToast("⏳ Cập nhật...");
  const p = [];

  document.querySelectorAll('#receive-dl-rows tr').forEach(tr => {
    const uid = tr.querySelector('.in-uid').value;
    const name = tr.querySelector('.in-name').value;

    if(name.trim() === myIdentity || myIdentity === BOSS || myIdentity === DEPUTY) {
      p.push({
        date: todayStr,
        name: name,
        stt: "DL",
        task: tr.querySelector('.dl-task').value,
        progress: tr.querySelector('.dl-prog').value,
        note: "Dữ liệu [DL:" + tr.querySelector('.dl-day').value + "]",
        uid: uid
      });
    }
  });

  if(p.length>0) {
    applyInstantUpdate(p);
    try {
      await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(p), mode: 'no-cors' });
      showToast("🎉 Xong!");
    } catch(e) {}
  } else {
    showToast("⚠️ Không có thay đổi!");
  }
}

async function saveReportOnly() {
  showToast("⏳ Đang lưu...");
  const p = [];

  document.querySelectorAll('#input-rows tr').forEach((tr, i) => {
    const t = tr.querySelector('.in-task').value.trim();
    const uid = tr.querySelector('.in-uid').value;
    const mn = tr.querySelector('.in-mnote').value;
    const rC = tr.querySelector('.carry-label');

    let n = tr.querySelector('.in-note').value.trim();
    if(rC && rC.style.display !== 'none') n += " [CARRY:" + rC.innerText.split(": ")[1] + "]";

    if ((t || mn) || uid.includes("ID")) {
      if (t || mn) {
        p.push({
          date: viewingDate,
          name: activeUser,
          stt: i + 1,
          task: t,
          progress: tr.querySelector('.in-prog').value,
          note: n,
          uid: uid,
          manager_note: mn
        });
      } else if (uid && !t && !mn) {
        p.push({ date: todayStr, name: activeUser, stt: "VOID", task: "VOID", progress: "0", note: "[VOID]", uid: uid });
      }
    }
  });

  applyInstantUpdate(p);
  try {
    await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(p), mode: 'no-cors' });
    showToast("🎉 Đã lưu!");
  } catch(e) {}
}

// ===== Local Update =====
function applyInstantUpdate(payload) {
  payload.forEach(item => {
    if(item.note.includes("[VOID]")) {
      globalData = globalData.filter(r => r[6] !== item.uid);
    } else {
      let found = globalData.find(r => r[6] === item.uid && r[1].trim() === item.name.trim());
      if(found) {
        found[0]=item.date; found[3]=item.task; found[4]=item.progress; found[5]=item.note; found[2]=item.stt;
        if(item.manager_note!==undefined) found[7]=item.manager_note;
      } else {
        globalData.push([item.date, item.name, item.stt, item.task, item.progress, item.note, item.uid, item.manager_note||""]);
      }
    }
  });

  if(activeUser) loadTableForDate(activeUser, viewingDate);
}

// ===== History UI =====
function renderHistoryList(name) {
  // thanh chip chính
  const dl = document.getElementById('date-list');
  if(dl) dl.innerHTML = "";

  // list trong history box (nếu có)
  const hdl = document.getElementById('history-date-list');
  if(hdl) hdl.innerHTML = "";

  function addChip(container, chipEl){
    if(container) container.appendChild(chipEl.cloneNode(true));
  }

  const makeChip = (cls, text, onClick) => {
    const c = document.createElement('div');
    c.className = cls;
    c.innerText = text;
    c.onclick = onClick;
    return c;
  };

  const tomChip = makeChip('date-chip chip-future', "Ngày mai (Lên KH)", () => {
    document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
    tomChip.classList.add('active');
    loadTableForDate(name, getTom());
  });

  const tChip = makeChip('date-chip active', "Hôm nay", () => {
    document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
    tChip.classList.add('active');
    loadTableForDate(name, todayStr);
  });

  if(dl){ dl.appendChild(tomChip); dl.appendChild(tChip); }
  if(hdl){ hdl.appendChild(tomChip.cloneNode(true)); hdl.appendChild(tChip.cloneNode(true)); }

  let rawDates = [...new Set(globalData.filter(r => r[1].trim() === name.trim()).map(r => r[0]))];
  rawDates.sort((a, b) => {
    const da = a.split('/').reverse().join('');
    const db = b.split('/').reverse().join('');
    return db.localeCompare(da);
  });

  rawDates.forEach(d => {
    if(getNorm(d) !== getNorm(todayStr) && getNorm(d) !== getNorm(getTom())) {
      const chip = makeChip('date-chip', stdDate(d), () => {
        document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        loadTableForDate(name, d);
      });
      if(dl) dl.appendChild(chip);
      if(hdl) hdl.appendChild(chip.cloneNode(true));
    }
  });
}

function toggleHistory() {
  const s = document.getElementById('history-section');
  if(!s) return;
  s.style.display = (s.style.display === 'block') ? 'none' : 'block';
}

// expose: để onclick dùng không đổi
window.openReport = openReport;
window.loadTableForDate = loadTableForDate;
window.addRow = addRow;
window.addReceiveRow = addReceiveRow;
window.addAssignRow = addAssignRow;
window.saveAssignedDeadlines = saveAssignedDeadlines;
window.saveReceivedDeadlines = saveReceivedDeadlines;
window.saveReportOnly = saveReportOnly;
window.applyInstantUpdate = applyInstantUpdate;
window.renderHistoryList = renderHistoryList;
window.toggleHistory = toggleHistory;

(function(){
  "use strict";

  // ====== helpers ======
  const W = window;
  const CFG = () => (W.IVY && W.IVY.CONFIG) ? W.IVY.CONFIG : {};
  const $ = (id) => document.getElementById(id);

  function showToast(m){
    const x = $("toast");
    if(!x) return;
    x.innerText = m;
    x.className = "show";
    setTimeout(() => { x.className = ""; }, 3000);
  }

  // ====== state (giữ nguyên logic V55) ======
  let myIdentity = "";
  let activeUser = "";
  let viewingDate = "";
  let todayStr = "";

  let globalData = [];
  let isSyncLocked = false;

  // cache theo user + master DL open
  let userCache = {};
  let dlOpenCache = [];

  let lastVersion = localStorage.getItem("MKT_VER_V55") || "0";
  let __lastVersion = "";
  let __syncInFlight = false;

  // chống add listener nhiều lần
  let __listenersBound = false;

  // ====== date utils ======
  function getTodayVN(){
    const d = new Date();
    return d.getDate().toString().padStart(2,"0") + "/" +
      (d.getMonth()+1).toString().padStart(2,"0") + "/" +
      d.getFullYear();
  }

  const stdDate = (v) => {
    if(!v) return "";
    let d = new Date(v);
    if(!isNaN(d.getTime()) && v.toString().includes("T")){
      return d.getDate().toString().padStart(2,'0')+"/"+(d.getMonth()+1).toString().padStart(2,'0')+"/"+d.getFullYear();
    }
    let p = v.toString().trim().split(/[\s./-]/);
    if(p.length < 2) return v;
    return p[0].padStart(2,"0") + "/" + p[1].padStart(2,"0") + "/" + (p[2] || "2026");
  };

  const getNorm = (d) => {
    if(!d) return "";
    let p = stdDate(d).split("/");
    return (p.length < 3) ? d : (parseInt(p[0])+"-"+parseInt(p[1])+"-"+p[2]);
  };

  function getTom(){
    let d = new Date();
    d.setDate(d.getDate()+1);
    return d.getDate().toString().padStart(2,'0')+"/"+(d.getMonth()+1).toString().padStart(2,'0')+"/"+d.getFullYear();
  }

  function generateUID(){
    return "ID-" + Date.now() + "-" + Math.floor(Math.random()*1000);
  }

  function fixProgValue(p){
    if(p===null || p===undefined || p==="") return "";
    let val = parseFloat(p);
    if(!isNaN(val) && val<=1 && val>0 && p.toString().includes(".")){
      return Math.round(val*100).toString();
    }
    return p.toString().replace("%","");
  }

  // ====== UI update colors ======
 function updateUI(){
  document.querySelectorAll("tr").forEach(row => {
    const pIn = row.querySelector(".dl-prog, .in-prog");
    if(!pIn) return;

    let pVal = (pIn.value || "").trim();

    // ✅ KHÔNG đụng innerText của td nữa
    const sttSpan = row.querySelector(".stt-mark");
    const sttTd = row.querySelector(".col-stt");

    row.classList.remove("row-green","row-yellow","row-red");

    if(pVal === "100"){
      row.classList.add("row-green");
      if(row.classList.contains("row-saved")){
        if(sttSpan) sttSpan.textContent = "✓";
        else if(sttTd) sttTd.textContent = "✓";
      }
    } else if(pVal !== "" && pVal !== "0"){
      row.classList.add("row-yellow");
      if(row.classList.contains("row-saved")){
        if(sttSpan) sttSpan.textContent = "...";
        else if(sttTd) sttTd.textContent = "...";
      }
    } else {
      row.classList.add("row-red");
      if(row.classList.contains("row-saved")){
        if(sttSpan) sttSpan.textContent = "!";
        else if(sttTd) sttTd.textContent = "!";
      }
    }
  });
}

  // ====== Version meta (Apps Script) ======
  async function fetchVersionMeta(){
    const url = CFG().SCRIPT_URL + "?meta=1&t=" + Date.now();
    const r = await fetch(url, { cache:"no-store" });
    const o = await r.json();
    return (o && o.version) ? o.version.toString() : "";
  }

  // ====== Polling 1–2s + turbo ======
  function startVersionPolling(){
    if(startVersionPolling.__started) return;
    startVersionPolling.__started = true;

    const loop = async () => {
      try{
        if(!myIdentity){
          setTimeout(loop, 1200);
          return;
        }

        if(document.hidden){
          setTimeout(loop, 5000);
          return;
        }

        if(isSyncLocked || __syncInFlight){
          setTimeout(loop, 900);
          return;
        }

        const v = await fetchVersionMeta();
        if(v){
          if(__lastVersion === "") __lastVersion = v;
          if(v !== __lastVersion){
            __lastVersion = v;
            W.__turboUntil = Date.now() + 10000; // turbo 10s sau khi có update
            await syncData({ background:true });
          }
        }
      }catch(e){}

      if(!W.__turboUntil) W.__turboUntil = 0;
      const now = Date.now();
      const isTurbo = now < W.__turboUntil;

      const base = isTurbo ? 500 : 1100;
      const jitter = Math.floor(200 + Math.random()*300); // 200–500ms
      setTimeout(loop, base + jitter);
    };

    loop();

    document.addEventListener("visibilitychange", () => {
      if(!document.hidden){
        loop(); // ping ngay khi quay lại tab
      }
    });
  }

  // ====== Sync Data (delta theo version) ======
  // Hỗ trợ gọi syncData(true) kiểu cũ => background
  function syncData(opts){
    if(opts === true) opts = { background:true };
    opts = opts || {};

    const nameToFetch = activeUser || myIdentity;
    if(!nameToFetch) return Promise.resolve();

    const screen = $("sync-screen");
    const hasCache = !!userCache[nameToFetch];

    const since = (hasCache && !opts.force) ? (localStorage.getItem("MKT_VER_V55") || "0") : "0";
    const showOverlay = !opts.background && (!hasCache || opts.force);

    if(isSyncLocked && !opts.force) return Promise.resolve();

    if(screen && showOverlay) screen.style.display = "flex";

    const userUrl =
      CFG().SCRIPT_URL +
      "?name=" + encodeURIComponent(nameToFetch) +
      "&since=" + encodeURIComponent(since) +
      "&t=" + Date.now();

    const needDlOpen = (myIdentity === CFG().BOSS || myIdentity === CFG().DEPUTY);
    const dlSince = (dlOpenCache && dlOpenCache.length && !opts.force) ? (localStorage.getItem("MKT_VER_V55") || "0") : "0";
    const dlUrl =
      CFG().SCRIPT_URL +
      "?scope=dl_open" +
      "&since=" + encodeURIComponent(dlSince) +
      "&t=" + Date.now();

    __syncInFlight = true;

    return fetch(userUrl)
      .then(r => r.text())
      .then(txt => {
        let o;
        try { o = JSON.parse(txt); }
        catch(e){
          showToast("⚠ doGet không trả JSON (check Deploy)");
          return;
        }

        if(o && o.version){
          lastVersion = o.version.toString();
          localStorage.setItem("MKT_VER_V55", lastVersion);
        }

        // nếu server báo không đổi và đã cache => bỏ qua render
        if(o && o.changed === false && hasCache && !opts.force){
          return;
        }

        if(o && Array.isArray(o.data)){
          userCache[nameToFetch] = o.data.filter(r => !r[5] || !r[5].toString().includes("[VOID]"));
        } else if(!hasCache){
          userCache[nameToFetch] = [];
        }

        globalData = userCache[nameToFetch] || [];

        // init lần đầu
        if(activeUser === "" && myIdentity !== ""){
          openReport(myIdentity, true);
          return;
        }

        if(activeUser !== ""){
          loadTableForDate(activeUser, viewingDate || todayStr);
          renderHistoryList(activeUser);
        }
      })
      .catch(() => {
        showToast("⚠ Lỗi fetch dữ liệu (check Deploy/URL)");
      })
      .finally(() => {
        const endOverlay = () => {
          if(screen && showOverlay) screen.style.display = "none";
          __syncInFlight = false;
        };

        if(!needDlOpen){
          endOverlay();
          return;
        }

        // DL master view (ngầm)
        fetch(dlUrl)
          .then(r => r.text())
          .then(txt => {
            let d;
            try { d = JSON.parse(txt); } catch(e){ return; }

            if(d && d.version){
              lastVersion = d.version.toString();
              localStorage.setItem("MKT_VER_V55", lastVersion);
            }

            if(d && Array.isArray(d.data)){
              dlOpenCache = d.data.filter(r => !r[5] || !r[5].toString().includes("[VOID]"));
              if(activeUser) loadTableForDate(activeUser, viewingDate || todayStr);
            }
          })
          .catch(()=>{})
          .finally(endOverlay);
      });
  }

  // ====== Open report for a user (sidebar click) ======
  function openReport(name, useCacheFirst){
    document.querySelectorAll(".menu-item").forEach(n => n.classList.remove("active"));
    const menu = $("menu-" + name);
    if(menu) menu.classList.add("active");

    activeUser = name;

    const dn = $("display-name");
    if(dn) dn.innerText = name;

    const wa = $("work-area");
    if(wa) wa.style.display = "block";

    // render ngay từ cache cho mượt
    if(userCache[name] && useCacheFirst !== false){
      globalData = userCache[name];
      loadTableForDate(name, viewingDate || todayStr);
      renderHistoryList(name);
      syncData({ background:true }); // kéo mới ngầm
    }else{
      syncData({ force:true }); // chưa có cache => bật overlay
    }
  }

  // ====== Render history chips (cả date-list & history-date-list) ======
  function renderHistoryList(name){
    const dl = $("date-list");
    const hl = $("history-date-list");
    if(dl) dl.innerHTML = "";
    if(hl) hl.innerHTML = "";

    const buildInto = (container) => {
      if(!container) return;

      const tomChip = document.createElement("div");
      tomChip.className = "date-chip chip-future";
      tomChip.innerText = "Ngày mai (Lên KH)";
      tomChip.onclick = () => {
        container.querySelectorAll(".date-chip").forEach(c => c.classList.remove("active"));
        tomChip.classList.add("active");
        loadTableForDate(name, getTom());
      };
      container.appendChild(tomChip);

      const tChip = document.createElement("div");
      tChip.className = "date-chip active";
      tChip.innerText = "Hôm nay";
      tChip.onclick = () => {
        container.querySelectorAll(".date-chip").forEach(c => c.classList.remove("active"));
        tChip.classList.add("active");
        loadTableForDate(name, todayStr);
      };
      container.appendChild(tChip);

      let rawDates = [...new Set(globalData.filter(r => r[1].trim() === name.trim()).map(r => r[0]))];
      rawDates.sort((a,b) => {
        const da = a.split("/").reverse().join("");
        const db = b.split("/").reverse().join("");
        return db.localeCompare(da);
      });

      rawDates.forEach(d => {
        if(getNorm(d) !== getNorm(todayStr) && getNorm(d) !== getNorm(getTom())){
          const chip = document.createElement("div");
          chip.className = "date-chip";
          chip.innerText = stdDate(d);
          chip.onclick = () => {
            container.querySelectorAll(".date-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            loadTableForDate(name, d);
          };
          container.appendChild(chip);
        }
      });
    };

    buildInto(dl);
    buildInto(hl);
  }

  // ====== Add / Render rows ======
function addRow(t="", p="", n="", mn="", c="", uid="", isSaved=false, isEditable=true, isCarry=false) {
  const tbody = document.getElementById('input-rows');
  const tr = document.createElement('tr');

  // --- TÁCH CARRY TỪ NOTE (nếu có) ---
  let cn = n || "";
  let dc = c || "";
  let carryFromNote = false;

  if (cn.toString().includes("[CARRY:")) {
    const pts = cn.toString().split("[CARRY:");
    cn = (pts[0] || "").trim();
    dc = ((pts[1] || "").replace("]", "") || "").trim();
    carryFromNote = true;
  }

  dc = dc ? stdDate(dc) : "";

  const uidStr = (uid || "").toString().trim();

  // ✅ NHẬN DIỆN carry cứng
  const carryFlag =
    !!isCarry ||
    carryFromNote ||
    uidStr.startsWith("CARRY-") ||
    !!dc;

  // ✅ tạo UID carry riêng nếu chưa có
  const rowUid = uidStr || (carryFlag ? ("CARRY-" + Date.now() + "-" + Math.floor(Math.random()*1000)) : generateUID());

  tr.dataset.carry = carryFlag ? "1" : "0";
  tr.dataset.carryFrom = dc || "";

  if (isSaved) tr.classList.add('row-saved');

  const lockAll = !isEditable;
  const lockTask = lockAll || carryFlag;     // ✅ khóa nội dung vĩnh viễn nếu carry
  const isBossUser = (myIdentity === CFG().BOSS);
  const lockMNote = !isBossUser;
  const hideDelete = lockAll || carryFlag;

  const sttVal = tbody.rows.length + 1;

  // ✅ TRONG TR CHỈ CÓ TD/TH (chuẩn table)
  tr.innerHTML = `
    <td class='col-stt'>
      <span class="stt-mark">${sttVal}</span>
      <input type='hidden' class='in-uid' value='${rowUid}'/>
    </td>

    <td class='col-task'>
      <input class='in-task' type='text' value='${escapeHtml(t)}' placeholder='Nội dung...' autocomplete='off' ${lockTask ? 'disabled' : ''}/>
      ${carryFlag ? `<span class='carry-label'>⚠ Tồn từ: ${escapeHtml(dc || "?")}</span>` : ""}
    </td>

    <td class='col-prog'>
      <input class='in-prog' type='number' value='${escapeHtml(fixProgValue(p))}' autocomplete='off' ${lockAll ? 'disabled' : ''}/>
    </td>

    <td class='col-note'>
      <textarea class='in-note' ${lockAll ? 'disabled' : ''}>${escapeHtml(cn)}</textarea>
    </td>

    <td class='col-mnote'>
      <textarea class='in-mnote' placeholder='...' ${lockMNote ? 'disabled' : ''}>${escapeHtml(mn)}</textarea>
    </td>

    <td class='col-del'>
      ${hideDelete ? "" : `<button class='btn-del' type='button' onclick='this.closest("tr").remove()'>✕</button>`}
    </td>
  `;

  tbody.appendChild(tr);
  updateUI();
}
  function addAssignRow(t="", p="", n="", dl="", names="", uid=""){
  const tbody = $("assign-dl-rows");
  if(!tbody) return;

  const tr = document.createElement("tr");
  const rowUid = uid || generateUID();

  tr.innerHTML =
    "<td class='col-stt'><span class='stt-mark'>!</span><input type='hidden' class='in-uid' value='"+escapeHtml(rowUid)+"'/></td>" +
    "<td class='col-task'><input class='dl-task' type='text' value='"+escapeHtml(t)+"' placeholder='Dự án...' autocomplete='off'/></td>" +
    "<td class='col-assign' style='background:#fdf2f2;'><input class='dl-to' type='text' value='"+escapeHtml(names)+"' placeholder='Tài, Duy...' autocomplete='off'/></td>" +
    "<td class='col-prog'><input class='dl-prog' type='number' value='"+escapeHtml(fixProgValue(p))+"' autocomplete='off'/></td>" +
    "<td class='col-date'><input class='dl-day' type='text' value='"+escapeHtml(stdDate(dl))+"' autocomplete='off'/></td>" +
    "<td class='col-del'><button class='btn-del' type='button' onclick='this.closest(\"tr\").remove()'>✕</button></td>" +
    "<input type='hidden' class='dl-note' value='"+escapeHtml(n)+"'/>";

  tbody.appendChild(tr);
  updateUI();
}
  // ====== Load table for date ======
  function loadTableForDate(name, targetDate){
    viewingDate = targetDate;

    const isT = getNorm(targetDate) === getNorm(todayStr);
    const isF = getNorm(targetDate) === getNorm(getTom());
    const isP = !isT && !isF;

    const now = new Date();
    const isTimeLocked = isP || (isT && (now.getDay()===0 || now.getHours()>=17));

    const dvi = $("daily-view-info");
    if(dvi){
      dvi.innerText = isF ? "(Ngày Mai)" : (isP ? "(Lịch sử)" : (isTimeLocked ? "(Đã khóa 17h)" : "(Hôm nay)"));
    }

    const isMe = (myIdentity === name);
    const canEdit = isMe && !isTimeLocked;

    const isBossUser = (myIdentity === CFG().BOSS);
    const showSaveBtn = canEdit || isBossUser;

    const elAssign = $("assign-dl-container");
    const elSaveReceived = $("saveReceivedBtn");
    const elAdd = $("addBtn");
    const elSave = $("saveBtn");

    if(elAssign) elAssign.style.display = canEdit ? "block" : "none";
    if(elSaveReceived) elSaveReceived.style.display = canEdit ? "block" : "none";
    if(elAdd) elAdd.style.display = canEdit ? "block" : "none";
    if(elSave) elSave.style.display = showSaveBtn ? "block" : "none";

    // rows daily
    const tbody = $("input-rows");
    if(tbody) tbody.innerHTML = "";

    const dayD = globalData.filter(r =>
      r[1].trim()===name.trim() &&
      getNorm(r[0])===getNorm(targetDate) &&
      !r[5].includes("[DL:")
    );

    if(dayD.length > 0){
      dayD.forEach(r => addRow(r[3], r[4], r[5], r[7]||"", "", r[6], true, canEdit, false));
    } else if(isT || isF){
      // bê tồn động ngày gần nhất
      const prevData = globalData.filter(r =>
        r[1].trim()===name.trim() &&
        !r[5].includes("[DL:") &&
        getNorm(r[0]).split("-").reverse().join("") < getNorm(targetDate).split("-").reverse().join("")
      );
      if(prevData.length > 0){
        const lastD = getNorm(prevData[prevData.length-1][0]);
        prevData
          .filter(r => getNorm(r[0])===lastD && fixProgValue(r[4])!=="100" && !r[5].includes("[DL:"))
          .forEach(r => {
            addRow(r[3], r[4], r[5], r[7]||"", lastD, r[6] || "", false, canEdit, true);
          });
      }
    }

    // đảm bảo min 3 dòng nếu được edit
    if(canEdit && tbody && tbody.rows.length < 3){
      while(tbody.rows.length < 3) addRow("","","","","","",false,true,false);
    }

    // deadline section
    const dlBody = $("receive-dl-rows");
    if(dlBody) dlBody.innerHTML = "";

    let dlT = [];

    // master view: sếp/phó ở tab chính mình => lấy dlOpenCache
    if(isMe && (myIdentity === CFG().BOSS || myIdentity === CFG().DEPUTY)){
      dlT = dlOpenCache || [];
    }else{
      dlT = globalData.filter(r => r[1].trim()===name.trim() && r[5].includes("[DL:") && fixProgValue(r[4])!=="100");
    }

    const noMsg = $("no-dl-msg");
    if(dlT.length > 0){
      if(noMsg) noMsg.style.display = "none";
      const isMasterView = (isMe && (myIdentity === CFG().BOSS || myIdentity === CFG().DEPUTY));
      dlT.forEach(r => {
        addReceiveRow(
          r[3],
          r[4],
          (r[5].split("[DL:")[0] || "").trim(),
          (r[5].split("[DL:")[1] || "").replace("]",""),
          r[1],
          r[6],
          true,
          canEdit,
          isMasterView
        );
      });
    }else{
      if(noMsg) noMsg.style.display = "block";
    }

    updateUI();
  }

  // ====== Save functions ======
  async function saveAssignedDeadlines(){
    showToast("⏳ Đang giao...");
    const p = [];
    document.querySelectorAll("#assign-dl-rows tr").forEach(tr => {
      const t = (tr.querySelector(".dl-task")?.value || "").trim();
      const names = (tr.querySelector(".dl-to")?.value || "").toLowerCase();
      const uid = (tr.querySelector(".in-uid")?.value || generateUID());
      const dl = stdDate(tr.querySelector(".dl-day")?.value || "");
      const senderTitle = (myIdentity === CFG().BOSS) ? "Trưởng phòng" : "Phó phòng";

      CFG().STAFF_LIST.forEach(fullName => {
        if(names.includes(fullName.split(" ").pop().toLowerCase())){
          p.push({
            date: todayStr,
            name: fullName,
            stt: "DL",
            task: t,
            progress: (tr.querySelector(".dl-prog")?.value || ""),
            note: senderTitle + " giao [DL:" + dl + "]",
            uid: uid
          });
        }
      });
    });

    applyInstantUpdate(p);

    try{
      await fetch(CFG().SCRIPT_URL, { method:"POST", body: JSON.stringify(p), mode:"no-cors" });
      showToast("🎉 Đã giao!");
      W.__turboUntil = Date.now() + 10000;
    }catch(e){}
  }

  async function saveReceivedDeadlines(){
    showToast("⏳ Cập nhật...");
    const p = [];

    document.querySelectorAll("#receive-dl-rows tr").forEach(tr => {
      const uid = tr.querySelector(".in-uid")?.value || "";
      const name = tr.querySelector(".in-name")?.value || "";

      if(name.trim() === myIdentity || myIdentity === CFG().BOSS || myIdentity === CFG().DEPUTY){
        p.push({
          date: todayStr,
          name: name,
          stt: "DL",
          task: (tr.querySelector(".dl-task")?.value || ""),
          progress: (tr.querySelector(".dl-prog")?.value || ""),
          note: "Dữ liệu [DL:" + (tr.querySelector(".dl-day")?.value || "") + "]",
          uid: uid
        });
      }
    });

    if(p.length > 0){
      applyInstantUpdate(p);
      try{
        await fetch(CFG().SCRIPT_URL, { method:"POST", body: JSON.stringify(p), mode:"no-cors" });
        showToast("🎉 Xong!");
        W.__turboUntil = Date.now() + 10000;
      }catch(e){}
    }else{
      showToast("⚠️ Không có thay đổi!");
    }
  }

async function saveReportOnly() {
  showToast("⏳ Đang lưu...");
  const p = [];

  document.querySelectorAll('#input-rows tr').forEach((tr, i) => {
    const uid = (tr.querySelector('.in-uid')?.value || "").trim();
    const t = (tr.querySelector('.in-task')?.value || "").trim();
    const mn = (tr.querySelector('.in-mnote')?.value || "");
    let n = (tr.querySelector('.in-note')?.value || "").trim();

    // --- NHẬN DIỆN carry cứng ---
    const carryFlag =
      uid.startsWith("CARRY-") ||
      tr.dataset.carry === "1" ||
      n.includes("[CARRY:");

    // lấy carry-from ưu tiên dataset (do addRow set), fallback label
    const labelEl = tr.querySelector('.carry-label');
    let carryFrom = (tr.dataset.carryFrom || "").trim();
    if (!carryFrom && labelEl) {
      // "⚠ Tồn từ: dd/mm/yyyy"
      const parts = labelEl.innerText.split(":");
      carryFrom = (parts[1] || "").trim();
    }
    carryFrom = carryFrom ? stdDate(carryFrom) : "";

    // --- chuẩn hóa: xóa marker cũ rồi gắn lại 1 lần cho sạch ---
    n = n.replace(/\s*\[CARRY:[^\]]*\]\s*/g, '').trim();
    if (carryFlag) {
      // gắn marker lại để lần render sau chắc chắn vẫn nhận ra
      const tag = "[CARRY:" + (carryFrom || todayStr) + "]";
      n = (n ? (n + " ") : "") + tag;
    }

    // giữ logic cũ: có nội dung hoặc boss note hoặc dòng ID thì lưu/void
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
        // VOID chỉ dành cho ID-, carry không bao giờ rơi vào đây vì task bị khóa + uid không include "ID"
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
  function applyInstantUpdate(payload){
    const target = activeUser || myIdentity;
    if(!target) return;

    // đảm bảo cache array tồn tại
    if(!userCache[target]) userCache[target] = (globalData || []);

    payload.forEach(item => {
      if((item.note || "").includes("[VOID]")){
        // xóa theo uid
        userCache[target] = userCache[target].filter(r => r[6] !== item.uid);
      }else{
        const arr = userCache[target];
        const found = arr.find(r => r[6] === item.uid && r[1].trim() === item.name.trim());
        if(found){
          found[0] = item.date;
          found[2] = item.stt;
          found[3] = item.task;
          found[4] = item.progress;
          found[5] = item.note;
          if(item.manager_note !== undefined) found[7] = item.manager_note;
        }else{
          arr.push([item.date, item.name, item.stt, item.task, item.progress, item.note, item.uid, item.manager_note || ""]);
        }
      }
    });

    // apply vào globalData nếu đang xem user đó
    if(activeUser === target){
      globalData = userCache[target];
      loadTableForDate(activeUser, viewingDate || todayStr);
    }
  }

  function toggleHistory(){
    const s = $("history-section");
    if(!s) return;
    s.style.display = (s.style.display === "block") ? "none" : "block";
  }

  // ====== lock sync while typing (giữ nguyên) ======
  function bindListenersOnce(){
    if(__listenersBound) return;
    __listenersBound = true;

    const workAreaEl = $("work-area");
    if(!workAreaEl) return;

    workAreaEl.addEventListener("focusin", (e) => {
      const t = e.target;
      if(t && (t.tagName==="INPUT" || t.tagName==="TEXTAREA")){
        isSyncLocked = true;
      }
    });

    workAreaEl.addEventListener("focusout", (e) => {
      const t = e.target;
      if(t && (t.tagName==="INPUT" || t.tagName==="TEXTAREA")){
        setTimeout(() => {
          const stillFocus = workAreaEl.querySelector("input:focus, textarea:focus");
          if(!stillFocus) isSyncLocked = false;
        }, 0);
      }
    });

    // Enter = save
    document.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        if(e.target && e.target.closest("#assign-dl-rows")) saveAssignedDeadlines();
        else if(e.target && e.target.closest("#receive-dl-rows")) saveReceivedDeadlines();
        else if(e.target && e.target.closest("#input-rows")) saveReportOnly();
      }
    });

    workAreaEl.addEventListener("input", updateUI);
  }

  // ====== safe html ======
  function escapeHtml(str){
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ====== Module API (theme gọi) ======
  W.IVYReport = W.IVYReport || {};

  // theme gọi sau login
  W.IVYReport.afterLogin = function(){
    myIdentity = W.myIdentity || localStorage.getItem("MKT_USER_V55") || "";
    if(!myIdentity) return;

    todayStr = getTodayVN();
    if(!viewingDate) viewingDate = todayStr;

    bindListenersOnce();

    // sync lần đầu có overlay (force) để chắc chắn có data
    syncData({ force:true, background:false }).then(() => {
      startVersionPolling();
      if(!activeUser) openReport(myIdentity, true);
    });
  };

  // khi chuyển tab report (router)
  W.IVYReport.onShow = function(){
    // đảm bảo listeners & UI không bị “đứng”
    bindListenersOnce();
    updateUI();
  };

  // ====== Expose GLOBAL FUNCTIONS (để onclick trong HTML không đổi) ======
  W.openReport = openReport;
  W.loadTableForDate = loadTableForDate;

  W.addRow = addRow;
  W.addAssignRow = addAssignRow;

  W.saveAssignedDeadlines = saveAssignedDeadlines;
  W.saveReceivedDeadlines = saveReceivedDeadlines;
  W.saveReportOnly = saveReportOnly;

  W.toggleHistory = toggleHistory;

})();




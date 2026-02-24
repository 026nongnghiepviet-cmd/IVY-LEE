// ==========================================
// MODULE: BÁO CÁO CÔNG VIỆC & LANDING PAGE
// ==========================================

window.updateStatusUI = function(isUpdating) { 
    var els = [document.getElementById('status-dl'), document.getElementById('status-report')]; 
    var now = new Date(); var timeStr = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0'); 
    els.forEach(function(el) { 
        if(!el) return; 
        if(isUpdating) { el.innerHTML = "⏳ Đang cập nhật..."; el.className = 'status-tag updating'; el.style.display = 'inline-block'; } 
        else { el.innerText = "✓ Cập nhật lúc " + timeStr; el.className = 'status-tag updated'; el.style.display = 'inline-block'; } 
    }); 
};

window.switchReportTab = function(tab) {
    document.getElementById('btn-tab-work').classList.remove('active');
    document.getElementById('btn-tab-landing').classList.remove('active');
    document.getElementById('btn-tab-' + tab).classList.add('active');

    if(tab === 'work') {
        document.getElementById('tab-work-content').style.display = 'block';
        document.getElementById('tab-landing-content').style.display = 'none';
    } else {
        document.getElementById('tab-work-content').style.display = 'none';
        document.getElementById('tab-landing-content').style.display = 'block';
    }
};

window.openReport = function(name, fromSidebarClick) { 
    if(!name || name === "SUPER_ADMIN") return;
    document.querySelectorAll('.menu-item').forEach(function(n){ n.classList.remove('active'); }); 
    var m=document.getElementById('menu-'+name); if(m) m.classList.add('active'); 
    window.activeUser = name; 
    document.getElementById('display-name').innerText = name; 
    document.getElementById('work-area').style.display = 'block'; 
    
    if (fromSidebarClick) { window.goPage('report'); }

    if (window.userCache[name]) { 
        window.globalData = window.userCache[name]; 
        window.loadTableForDate(name, window.viewingDate || window.todayStr); 
        window.renderHistoryList(name); 
        window.loadLpData(name); 
        window.syncData({ background: true }); 
    } else { 
        window.syncData({ force: true }).then(function(){
            window.loadLpData(name); 
        }); 
    } 
};

window.loadTableForDate = function(name, targetDate) { 
    window.viewingDate = targetDate; 
    var isT = window.getNorm(targetDate) === window.getNorm(window.todayStr); 
    var isF = window.getNorm(targetDate) === window.getNorm(window.getTom()); 
    var isP = !isT && !isF; 
    var now = new Date(); var isTimeLocked = isP || (isT && (now.getHours()>=17)); 
    document.getElementById('daily-view-info').innerText = isF ? "(Ngày Mai)" : (isP ? "(Lịch sử)" : (isTimeLocked ? "(Đã khóa 17h)" : "(Hôm nay)")); 
    
    var isMe = (window.myIdentity === name); 
    var isBoss = (window.myIdentity === window.SYS_BOSS || window.myIdentity === "SUPER_ADMIN"); 
    var isDeputy = (window.myIdentity === window.SYS_DEPUTY); 
    var canEditTable = isMe && !isTimeLocked; 
    var canAssign = isBoss || isDeputy; 
    
    if(window.myIdentity.includes("Khách")) { canEditTable = false; canAssign = false; }
    
    document.getElementById('assign-dl-container').style.display = canAssign ? 'block' : 'none'; 
    document.getElementById('saveReceivedBtn').style.display = canEditTable ? 'block' : 'none'; 
    document.getElementById('addBtn').style.display = canEditTable ? 'block' : 'none'; 
    document.getElementById('saveBtn').style.display = (canEditTable || isBoss) ? 'block' : 'none'; 
    
    var isLpEditable = isMe; 
    if(window.myIdentity.includes("Khách")) isLpEditable = false; 
    var addLpBtn = document.getElementById('addLpBtn'); if(addLpBtn) addLpBtn.style.display = isLpEditable ? 'block' : 'none';
    var saveLpBtn = document.getElementById('saveLpBtn'); if(saveLpBtn) saveLpBtn.style.display = isLpEditable ? 'block' : 'none';

    var tbody = document.getElementById('input-rows'); tbody.innerHTML = ""; 
    var dayD = window.globalData.filter(function(r){ return r[1].trim()===name.trim() && window.getNorm(r[0])===window.getNorm(targetDate) && !r[5].includes("[DL:"); }); 
    
    if (dayD.length > 0) {
        dayD.forEach(function(r){ window.addRow(r[3], r[4], r[5], r[7]||"", r[8]||"", r[6], true, canEditTable); }); 
    } else { 
        var sourceDate = ""; var targetSortVal = window.getDateInt(targetDate);
        var userDates = window.globalData.filter(function(r){ return r[1].trim() === name.trim() && !r[5].includes("[DL:"); }).map(function(r){ return r[0]; });
        var uniqueUserDates = [];
        for(var i=0; i<userDates.length; i++) { if(uniqueUserDates.indexOf(userDates[i]) === -1) uniqueUserDates.push(userDates[i]); }
        uniqueUserDates.sort(function(a,b){ return window.getDateInt(b) - window.getDateInt(a); });
        
        for(var i=0; i<uniqueUserDates.length; i++) {
            if(window.getDateInt(uniqueUserDates[i]) < targetSortVal) { sourceDate = uniqueUserDates[i]; break; }
        }

        if (sourceDate) { 
            var sourceData = window.globalData.filter(function(r){ return r[1].trim()===name.trim() && window.getNorm(r[0])===window.getNorm(sourceDate) && !r[5].includes("[DL:"); }); 
            if(sourceData.length > 0) { 
                sourceData.forEach(function(r){ 
                    if(window.fixProgValue(r[4]) !== "100") window.addRow(r[3], r[4], r[5], r[7]||"", r[0], "", false, canEditTable, true); 
                }); 
            } 
        } 
    } 
    if(canEditTable && tbody.rows.length < 3) { while(tbody.rows.length < 3) window.addRow("","","","","", "", false, true); }
    
    var dlBody = document.getElementById('receive-dl-rows'); dlBody.innerHTML = ""; 
    var dlT = []; 
    if (isMe && (isBoss || isDeputy)) { dlT = window.dlOpenCache || []; } 
    else { dlT = window.globalData.filter(function(r){ return r[1].trim() === name && r[5].includes("[DL:") && window.fixProgValue(r[4]) !== "100"; }); } 
    
    if(dlT.length > 0) { 
        document.getElementById('no-dl-msg').style.display='none'; 
        dlT.forEach(function(r){ window.addReceiveRow(r[3], r[4], r[5].split("[DL:")[0].trim(), r[5].split("[DL:")[1].replace("]",""), r[1], r[6], true, canEditTable); }); 
    } else { document.getElementById('no-dl-msg').style.display='block'; }
    window.updateUI(); 
};

window.addRow = function(t, p, n, mn, c, uid, isSaved, isEditable, isCarry) { 
    t=t||""; p=p||""; n=n||""; mn=mn||""; c=c||""; uid=uid||"";
    if(typeof isEditable === 'undefined') isEditable = true;

    var tbody = document.getElementById('input-rows'); var tr = document.createElement('tr'); 
    var rowUid = uid || (isCarry ? ("CARRY-"+Date.now()+"-"+Math.floor(Math.random()*1000)) : window.generateUID()); 
    if(isSaved) tr.classList.add('row-saved'); 
    var isBoss = (window.myIdentity === window.SYS_BOSS || window.myIdentity === "SUPER_ADMIN"); 
    var isRealCarry = isCarry || (!!uid && uid.toString().indexOf("CARRY") === 0); 
    var lockAll = !isEditable && !isBoss; var lockTask = lockAll || (isRealCarry && t !== ""); 
    
    if(window.myIdentity.includes("Khách")) { lockAll = true; lockTask = true; isBoss = false; }

    tr.innerHTML = "<input type='hidden' class='in-uid' value='"+rowUid+"'/><input type='hidden' class='in-carry' value='"+c+"'/><td class='col-stt'>"+(tbody.rows.length+1)+"</td><td class='col-task'><input class='in-task' value='"+t+"' "+(lockTask?'disabled':'')+"/>"+(c?"<span class='carry-label'>⚠ Tồn từ: "+window.stdDate(c)+"</span>":"")+"</td><td class='col-prog'><input class='in-prog' value='"+window.fixProgValue(p)+"' "+(lockAll?'disabled':'')+"/></td><td class='col-note'><textarea class='in-note' "+(lockAll?'disabled':'')+">"+n+"</textarea></td><td class='col-mnote'><textarea class='in-mnote' "+(!isBoss?'disabled':'')+">"+mn+"</textarea></td><td class='col-del'>"+((!lockTask && !isRealCarry && !window.myIdentity.includes("Khách"))?"<button class='btn-del' onclick='this.closest(\"tr\").remove()'>✕</button>":"")+"</td>"; 
    tbody.appendChild(tr); window.updateUI(); 
};

window.addReceiveRow = function(t, p, n, dl, targetUser, uid, isSaved, isEditable) { 
    t=t||""; p=p||""; n=n||""; dl=dl||""; targetUser=targetUser||""; uid=uid||"";
    var tbody = document.getElementById('receive-dl-rows'); var tr = document.createElement('tr'); 
    var isBoss = (window.myIdentity === window.SYS_BOSS || window.myIdentity === "SUPER_ADMIN"); var isDeputy = (window.myIdentity === window.SYS_DEPUTY); var isMyDeadline = (targetUser.trim() === window.myIdentity); 
    var isMasterView = isBoss || isDeputy; 
    var lockInfo = true; var lockProg = true; 
    if (isMasterView) { lockInfo = false; lockProg = !isMyDeadline; } else { lockInfo = true; lockProg = !isMyDeadline; } 
    if(window.myIdentity.includes("Khách")) { lockInfo = true; lockProg = true; }

    tr.innerHTML = "<input type='hidden' class='in-uid' value='"+uid+"'/><input type='hidden' class='in-name' value='"+targetUser+"'/><td class='col-stt'>!</td><td class='col-task'><input class='dl-task' type='text' value='"+t+"' "+(lockInfo?'disabled':'')+"/><div style='font-size:10px; color:#1a73e8; font-weight:bold'>👤 "+targetUser+"</div></td><td class='col-assign'><input type='text' value='"+targetUser+"' disabled/></td><td class='col-prog'><input class='dl-prog' type='number' value='"+window.fixProgValue(p)+"' "+(lockProg?'disabled':'')+"/></td><td class='col-date'><input class='dl-day' type='text' value='"+window.stdDate(dl)+"' "+(lockInfo?'disabled':'')+"/></td>"; 
    tbody.appendChild(tr); window.updateUI(); 
};

window.addAssignRow = function() { 
    var tbody = document.getElementById('assign-dl-rows'); var tr = document.createElement('tr'); 
    tr.innerHTML = "<input type='hidden' class='in-uid' value='"+window.generateUID()+"'/><td class='col-stt'>!</td><td><input class='dl-task' placeholder='Dự án...'/></td><td style='background:#fdf2f2;'><input class='dl-to' placeholder='Tài, Duy...'/></td><td><input class='dl-prog' type='number'/></td><td><input class='dl-day' placeholder='Hạn...' onblur='this.value=window.stdDate(this.value)'/></td><td><button class='btn-del' onclick='this.closest(\"tr\").remove()'>✕</button></td>"; 
    tbody.appendChild(tr); window.updateUI(); 
};

window.switchLpCompany = function(comp, btnEl) {
    document.querySelectorAll('.lp-tab-btn').forEach(function(el) { el.classList.remove('active'); });
    if(btnEl) btnEl.classList.add('active');
    else document.getElementById('lp-btn-' + comp).classList.add('active');
    
    window.currentLpCompany = comp;
    window.loadLpData(window.activeUser);
};

window.addLpRow = function(name, link, note, uid) {
    name = name || ""; link = link || ""; note = note || ""; uid = uid || window.generateUID();
    var tbody = document.getElementById('lp-rows');
    var tr = document.createElement('tr');
    var isEditable = (window.myIdentity === window.activeUser); 
    var lock = !isEditable ? "disabled='disabled'" : "";

    tr.innerHTML = "<input type='hidden' class='lp-uid' value='"+uid+"'/>" +
        "<td class='lp-stt' style='text-align:center; font-weight:bold;'>" + (tbody.rows.length + 1) + "</td>" +
        "<td><input class='lp-name' style='width:100%; padding:8px; border:1px solid #eee; border-radius:4px;' value='"+name+"' placeholder='Tên sản phẩm...' "+lock+"/></td>" +
        "<td><input class='lp-link' style='width:100%; padding:8px; border:1px solid #eee; border-radius:4px; color:#1a73e8; text-decoration:underline;' value='"+link+"' placeholder='https://...' "+lock+" ondblclick='if(this.value) window.open(this.value, \"_blank\")'/></td>" +
        "<td><input class='lp-note' style='width:100%; padding:8px; border:1px solid #eee; border-radius:4px;' value='"+note+"' placeholder='Ghi chú...' "+lock+"/></td>" +
        "<td style='text-align:center;'>" + (isEditable ? "<button class='btn-del' onclick='this.closest(\"tr\").remove(); window.updateLpStt();'>✕</button>" : "") + "</td>";
    tbody.appendChild(tr);
};

window.updateLpStt = function() {
    var rows = document.querySelectorAll('#lp-rows tr');
    rows.forEach(function(row, index) {
        var sttCell = row.querySelector('.lp-stt');
        if(sttCell) sttCell.innerText = index + 1;
    });
};

window.loadLpData = function(userName) {
    var tbody = document.getElementById('lp-rows');
    if(tbody) tbody.innerHTML = "";
    if(!window.sysDb || !userName || userName === "SUPER_ADMIN" || userName.includes("Khách")) {
        window.addLpRow(); return;
    }
    var safeUser = userName.replace(/\./g, '_');
    var comp = window.currentLpCompany || "nnv";
    
    window.sysDb.ref('landing_pages/' + safeUser + '/' + comp).once('value').then(function(snapshot) {
        var data = snapshot.val();
        if(data && data.length > 0) {
            data.forEach(function(item) { window.addLpRow(item.name, item.link, item.note, item.uid); });
        } else { window.addLpRow(); }
    }).catch(function() { window.addLpRow(); });
};

window.saveLpData = function() {
    if(window.myIdentity.includes("Khách") || !window.activeUser || window.myIdentity !== window.activeUser) return;
    var btn = document.getElementById('saveLpBtn');
    if(btn) btn.innerText = "Đang lưu...";
    
    var data = [];
    document.querySelectorAll('#lp-rows tr').forEach(function(tr) {
        var n = tr.querySelector('.lp-name').value.trim();
        var l = tr.querySelector('.lp-link').value.trim();
        if(n || l) {
            data.push({ uid: tr.querySelector('.lp-uid').value, name: n, link: l, note: tr.querySelector('.lp-note').value.trim() });
        }
    });
    
    var safeUser = window.activeUser.replace(/\./g, '_');
    var comp = window.currentLpCompany || "nnv";

    window.sysDb.ref('landing_pages/' + safeUser + '/' + comp).set(data).then(function() {
        if(btn) btn.innerText = "LƯU THÀNH CÔNG ✓";
        window.showToast("Đã lưu Landing Page cho tab hiện tại!");
        setTimeout(function() { if(btn) btn.innerText = "LƯU LANDING PAGE"; }, 2000);
    }).catch(function(e) {
        alert("Lỗi lưu Landing Page: " + e.message);
        if(btn) btn.innerText = "LƯU LANDING PAGE";
    });
};

window.saveReportOnly = function() { 
    window.updateStatusUI(true); var p = []; 
    document.querySelectorAll('#input-rows tr').forEach(function(tr, i) { 
        var t = tr.querySelector('.in-task').value.trim(); var uid = tr.querySelector('.in-uid').value; var mn = tr.querySelector('.in-mnote').value; 
        var carryDate = tr.querySelector('.in-carry').value; var n = tr.querySelector('.in-note').value; 
        if (t || mn || uid.includes("ID")) { 
            if (t || mn) { p.push({ date: window.viewingDate, name: window.activeUser, stt: i+1, task: t, progress: tr.querySelector('.in-prog').value, note: n, uid: uid, manager_note: mn, carry_date: carryDate }); } 
            else p.push({ date: window.todayStr, name: window.activeUser, stt: "VOID", task: "VOID", progress: "0", note: "[VOID]", uid: uid }); 
        } 
    }); 

    var nameToUpdate = window.activeUser; 
    if(window.userCache[nameToUpdate]) { 
        p.forEach(function(item) { 
           if(!item.note.includes("[VOID]")) { 
               var found = window.userCache[nameToUpdate].find(function(r){ return r[6] === item.uid; }); 
               if(found) { found[0]=item.date; found[3]=item.task; found[4]=item.progress; found[5]=item.note; found[7]=item.manager_note; found[8]=item.carry_date; } 
               else { window.userCache[nameToUpdate].push([item.date, item.name, item.stt, item.task, item.progress, item.note, item.uid, item.manager_note, item.carry_date]); } 
           } else { window.userCache[nameToUpdate] = window.userCache[nameToUpdate].filter(function(r){ return r[6] !== item.uid; }); } 
        }); 
        window.globalData = window.userCache[nameToUpdate]; 
        window.loadTableForDate(nameToUpdate, window.viewingDate); 
    } 
    
    fetch(window.SYS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(p), mode: 'no-cors' }).then(function() {
        window.updateStatusUI(false); 
        setTimeout(function() { if(!window.isSyncLocked) window.syncData({ background: true }); }, 5000); 
    });
};

window.saveReceivedDeadlines = function() { 
    window.updateStatusUI(true); var p = []; 
    document.querySelectorAll('#receive-dl-rows tr').forEach(function(tr) { 
        p.push({ date: window.todayStr, name: tr.querySelector('.in-name').value, stt: "DL", task: tr.querySelector('.dl-task').value, progress: tr.querySelector('.dl-prog').value, note: "Dữ liệu [DL:" + tr.querySelector('.dl-day').value + "]", uid: tr.querySelector('.in-uid').value }); 
    }); 
    
    fetch(window.SYS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(p), mode: 'no-cors' }).then(function() {
        window.updateStatusUI(false);
        setTimeout(function() { if(!window.isSyncLocked) window.syncData({ background: true }); }, 5000);
    });
};

window.saveAssignedDeadlines = function() { 
    window.updateStatusUI(true); var p = []; 
    document.querySelectorAll('#assign-dl-rows tr').forEach(function(tr) { 
        var t = tr.querySelector('.dl-task').value; var names = tr.querySelector('.dl-to').value.toLowerCase(); var dl = window.stdDate(tr.querySelector('.dl-day').value); 
        window.SYS_STAFF_LIST.forEach(function(full) { 
            if(names.includes(full.split(' ').pop().toLowerCase())) { 
                if (window.myIdentity === window.SYS_DEPUTY && full === window.SYS_BOSS) return; 
                p.push({ date: window.todayStr, name: full, stt: "DL", task: t, progress: tr.querySelector('.dl-prog').value, note: "Giao [DL:" + dl + "]", uid: tr.querySelector('.in-uid').value }); 
            } 
        }); 
        tr.remove(); 
    }); 
    
    fetch(window.SYS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(p), mode: 'no-cors' }).then(function() {
        window.updateStatusUI(false);
        setTimeout(function() { if(!window.isSyncLocked) window.syncData({ background: true }); }, 5000);
    });
};

window.renderHistoryList = function(name) { 
    var bar = document.getElementById('date-list'); bar.innerHTML = ""; 
    var tomChip = document.createElement('div'); tomChip.className = 'date-chip chip-future'; tomChip.innerText = "Ngày mai (Lên KH)"; 
    tomChip.onclick = function() { document.querySelectorAll('.date-chip').forEach(function(x){ x.classList.remove('active'); }); tomChip.classList.add('active'); window.loadTableForDate(name, window.getTom()); }; 
    bar.appendChild(tomChip); 
    var tChip = document.createElement('div'); tChip.className = 'date-chip active'; tChip.innerText = "Hôm nay"; 
    tChip.onclick = function() { document.querySelectorAll('.date-chip').forEach(function(x){ x.classList.remove('active'); }); tChip.classList.add('active'); window.loadTableForDate(name, window.todayStr); }; 
    bar.appendChild(tChip); 
    
    var datesArr = window.globalData.filter(function(r){ return r[1].trim()===name; }).map(function(r){ return r[0]; });
    var uniqueDates = [];
    for(var i=0; i<datesArr.length; i++) { if(uniqueDates.indexOf(datesArr[i]) === -1) uniqueDates.push(datesArr[i]); }
    
    uniqueDates.sort(function(a,b){ return window.getDateInt(b) - window.getDateInt(a); }); 
    
    var pastDates = uniqueDates.filter(function(d){ return window.getNorm(d) !== window.getNorm(window.todayStr) && window.getNorm(d) !== window.getNorm(window.getTom()); }); 
    pastDates.slice(0, 3).forEach(function(d) { 
        var chip = document.createElement('div'); chip.className = 'date-chip'; chip.innerText = window.stdDate(d); 
        chip.onclick = function() { document.querySelectorAll('.date-chip').forEach(function(x){ x.classList.remove('active'); }); chip.classList.add('active'); window.loadTableForDate(name, d); }; 
        bar.appendChild(chip); 
    }); 
    
    var pickerDiv = document.createElement('div'); pickerDiv.className = 'picker-container date-chip search-chip'; 
    pickerDiv.innerHTML = "📅 Tìm ngày...<input type='date' class='hidden-date-input' title='Chọn ngày cũ' />"; 
    var hiddenInput = pickerDiv.querySelector('.hidden-date-input'); 
    hiddenInput.addEventListener('change', function(e) { 
        if(e.target.value) { 
            var parts = e.target.value.split('-'); var vnDate = parts[2]+"/"+parts[1]+"/"+parts[0]; 
            document.querySelectorAll('.date-chip').forEach(function(x){ x.classList.remove('active'); }); 
            window.loadTableForDate(name, vnDate); 
        } 
    }); 
    pickerDiv.onclick = function() { try { hiddenInput.showPicker(); } catch(e) { hiddenInput.click(); } }; 
    bar.appendChild(pickerDiv); 
};

window.updateUI = function() { 
    document.querySelectorAll('tr').forEach(function(row) { 
        var pIn = row.querySelector('.dl-prog, .in-prog'); if(!pIn) return; 
        var v = pIn.value; var stt = row.querySelector('.col-stt'); 
        row.classList.remove('row-green', 'row-yellow', 'row-red'); 
        if (v === "100") { row.classList.add('row-green'); if(stt) stt.innerText = "✓"; } 
        else if (v > 0) { row.classList.add('row-yellow'); if(stt) stt.innerText = "..."; } 
        else { row.classList.add('row-red'); if(stt) stt.innerText = "!"; } 
    }); 
};

// Khởi tạo các sự kiện nhập liệu / Enter trên Bảng Báo cáo
document.addEventListener("DOMContentLoaded", function() {
    var workAreaEl = document.getElementById('work-area');
    if(workAreaEl) {
        workAreaEl.addEventListener('focusin', function(e) { if(e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) window.isSyncLocked = true; });
        workAreaEl.addEventListener('focusout', function(e) { if(e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) { setTimeout(function(){ var stillFocus = workAreaEl.querySelector('input:focus, textarea:focus'); if(!stillFocus) window.isSyncLocked = false; }, 0); } });
        document.addEventListener('keydown', function(e) { if(e.key === 'Enter') { e.preventDefault(); if(e.target.closest('#assign-dl-rows')) window.saveAssignedDeadlines(); else if(e.target.closest('#receive-dl-rows')) window.saveReceivedDeadlines(); else if(e.target.closest('#input-rows')) window.saveReportOnly(); else if(e.target.closest('#lp-rows')) window.saveLpData(); } });
        workAreaEl.addEventListener('input', window.updateUI);
    }
});
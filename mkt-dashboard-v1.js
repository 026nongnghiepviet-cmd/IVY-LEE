/**
 * MKT DASHBOARD V3 - MODERN UI
 * Tách biệt rõ ràng: Quản lý Dự án (Deadline) vs Hiệu suất Nhân sự (Daily)
 */

let MKT_CACHE = [];

async function initMktDashboard() {
    const container = document.getElementById('plan-dashboard');
    if (!container) return;

    // Loading Effect Modern
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px; color:#5f6368">
            <div class="spinner" style="width:40px; height:40px; border-width:4px; border-color:#e0e0e0; border-top-color:#1a73e8; border-radius:50%; animation:spin 1s linear infinite"></div>
            <div style="margin-top:15px; font-weight:600; font-family:'Segoe UI'">Đang phân tích dữ liệu phòng Marketing...</div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;

    try {
        const requests = STAFF_LIST.map(name => 
            fetch(`${SCRIPT_URL}?name=${encodeURIComponent(name)}&t=${Date.now()}`).then(r => r.json())
        );
        const results = await Promise.all(requests);
        
        MKT_CACHE = [];
        results.forEach((res, i) => {
            if(res.data) res.data.forEach(row => {
                row.push(STAFF_LIST[i]); 
                MKT_CACHE.push(row);
            });
        });

        renderFilterBar(container);
        filterData('month'); // Mặc định xem tháng này

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="color:red; padding:20px">Lỗi kết nối dữ liệu.</div>`;
    }
}

function renderFilterBar(container) {
    container.innerHTML = `
    <div class="dash-header">
        <div class="filter-pills">
            <button class="pill" onclick="filterData('today')" id="btn-today">Hôm nay</button>
            <button class="pill" onclick="filterData('week')" id="btn-week">Tuần này</button>
            <button class="pill active" onclick="filterData('month')" id="btn-month">Tháng này</button>
        </div>
        <div class="date-range">
            <input type="date" id="date-start" class="date-input">
            <span style="color:#999">➝</span>
            <input type="date" id="date-end" class="date-input">
            <button class="go-btn" onclick="filterData('custom')">🔍</button>
        </div>
    </div>
    <div id="dashboard-content" class="fade-in"></div>
    
    <style>
        .dash-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; flex-wrap:wrap; gap:10px; background:#fff; padding:15px; border-radius:12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
        .filter-pills { display:flex; gap:8px; background:#f1f3f4; padding:4px; border-radius:8px; }
        .pill { border:none; background:transparent; padding:6px 16px; border-radius:6px; font-size:13px; font-weight:600; color:#5f6368; cursor:pointer; transition:0.2s; }
        .pill:hover { color:#000; }
        .pill.active { background:#fff; color:#1a73e8; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .date-input { border:1px solid #ddd; padding:6px 10px; border-radius:6px; font-family:inherit; color:#444; outline:none; font-size:13px; }
        .go-btn { background:#1a73e8; color:#fff; border:none; width:32px; height:32px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s; }
        .go-btn:hover { background:#1557b0; }
        .fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    </style>
    `;
}

function filterData(type) {
    let start = new Date(); start.setHours(0,0,0,0);
    let end = new Date(); end.setHours(23,59,59,999);

    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    if(type==='today') document.getElementById('btn-today').classList.add('active');
    else if(type==='week') {
        document.getElementById('btn-week').classList.add('active');
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff); end.setDate(start.getDate() + 6);
    } 
    else if(type==='month') {
        document.getElementById('btn-month').classList.add('active');
        start.setDate(1); end.setMonth(end.getMonth()+1); end.setDate(0);
    }
    else if(type==='custom') {
        const s = document.getElementById('date-start').value;
        const e = document.getElementById('date-end').value;
        if(!s || !e) return alert("Vui lòng chọn ngày!");
        start = new Date(s); end = new Date(e); end.setHours(23,59,59,999);
    }

    processData(start, end);
}

function processData(start, end) {
    const projects = {};
    const dailyStats = {};
    STAFF_LIST.forEach(s => dailyStats[s.split(' ').pop()] = 0);

    const now = new Date(); now.setHours(0,0,0,0);

    MKT_CACHE.forEach(row => {
        const dateStr = row[0];
        const taskName = row[3].trim();
        const progress = parseFloat(row[4].replace('%','')) || 0;
        const note = row[5];
        const staffName = row[row.length-1].split(' ').pop();
        const taskDate = parseVNDate(dateStr);

        // 1. TÁCH RIÊNG DAILY TASK (Không phải deadline)
        if (!note.includes("[DL:")) {
            if (taskDate >= start && taskDate <= end) {
                dailyStats[staffName] = (dailyStats[staffName] || 0) + 1;
            }
        }

        // 2. TÁCH RIÊNG DEADLINE (Gom nhóm theo Tên + Ngày hạn)
        if (note.includes("[DL:")) {
            const dlStr = note.split("[DL:")[1].replace("]","").trim();
            const dlDate = parseVNDate(dlStr);

            // Chỉ lấy Deadline có hạn trong khoảng thời gian lọc
            if (dlDate >= start && dlDate <= end) {
                const key = taskName + "_" + dlStr;
                if (!projects[key]) {
                    projects[key] = {
                        name: taskName,
                        deadline: dlDate,
                        dlStr: dlStr,
                        members: [],
                        totalProg: 0,
                        count: 0
                    };
                }
                projects[key].members.push({ name: staffName, prog: progress });
                projects[key].totalProg += progress;
                projects[key].count++;
            }
        }
    });

    // Tính toán lại chỉ số dự án
    let pList = [];
    let kpi = { total: 0, done: 0, late: 0, doing: 0 };

    Object.values(projects).forEach(p => {
        p.avg = Math.round(p.totalProg / p.count);
        p.isLate = (p.avg < 100 && p.deadline < now);
        p.isDone = (p.avg === 100);
        
        kpi.total++;
        if(p.isDone) kpi.done++;
        else if(p.isLate) kpi.late++;
        else kpi.doing++;

        pList.push(p);
    });

    renderModernUI(kpi, dailyStats, pList);
}

function renderModernUI(kpi, dailyStats, pList) {
    const content = document.getElementById('dashboard-content');
    
    // Sort dự án: Trễ hạn lên đầu -> Chưa xong -> Đã xong
    pList.sort((a,b) => {
        if (a.isLate !== b.isLate) return b.isLate - a.isLate; // Trễ lên đầu
        if (a.avg !== b.avg) return a.avg - b.avg; // % thấp lên đầu
        return a.deadline - b.deadline;
    });

    let projectHTML = '';
    if (pList.length === 0) {
        projectHTML = `<div class="empty-state">Không có dự án/deadline nào trong giai đoạn này.</div>`;
    } else {
        pList.forEach(p => {
            // Render avatar thành viên
            let memHTML = p.members.map(m => {
                let color = m.prog === 100 ? '#137333' : (m.prog > 0 ? '#f9ab00' : '#d93025');
                return `<div class="mem-tag" style="border-color:${color}" title="${m.prog}%">${m.name}</div>`;
            }).join('');

            let statusClass = p.isDone ? 'done' : (p.isLate ? 'late' : 'doing');
            let statusText = p.isDone ? 'Hoàn thành' : (p.isLate ? 'Trễ hạn' : 'Đang chạy');
            let barColor = p.isDone ? '#34a853' : (p.isLate ? '#ea4335' : '#fbbc04');

            projectHTML += `
            <div class="project-card ${statusClass}">
                <div class="pj-header">
                    <div class="pj-name">${p.name}</div>
                    <div class="pj-date ${statusClass}">📅 ${p.dlStr}</div>
                </div>
                <div class="pj-body">
                    <div class="pj-progress">
                        <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${p.avg}%; background:${barColor}"></div></div>
                        <div class="prog-text" style="color:${barColor}">${p.avg}%</div>
                    </div>
                    <div class="pj-members">${memHTML}</div>
                </div>
                <div class="pj-status-badge ${statusClass}">${statusText}</div>
            </div>`;
        });
    }

    const html = `
    <div class="kpi-grid">
        <div class="kpi-box blue"><h3>${kpi.total}</h3><p>Tổng Dự Án</p></div>
        <div class="kpi-box green"><h3>${kpi.done}</h3><p>Hoàn Thành</p></div>
        <div class="kpi-box yellow"><h3>${kpi.doing}</h3><p>Đang Chạy</p></div>
        <div class="kpi-box red"><h3>${kpi.late}</h3><p>Trễ Hạn</p></div>
    </div>

    <div class="main-split">
        <div class="panel">
            <div class="panel-head">
                <span>🚀 TIẾN ĐỘ DỰ ÁN & DEADLINE</span>
            </div>
            <div class="panel-body project-list-container">
                ${projectHTML}
            </div>
        </div>

        <div class="panel">
            <div class="panel-head">
                <span>👤 HIỆU SUẤT (DAILY TASK)</span>
            </div>
            <div class="panel-body">
                <canvas id="chart-staff" height="250"></canvas>
            </div>
        </div>
    </div>

    <style>
        .kpi-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:15px; margin-bottom:25px; }
        .kpi-box { background:#fff; padding:20px; border-radius:16px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.03); border:1px solid #fff; transition:0.2s; }
        .kpi-box:hover { transform:translateY(-3px); }
        .kpi-box h3 { margin:0; font-size:28px; font-weight:900; }
        .kpi-box p { margin:5px 0 0; font-size:12px; font-weight:700; text-transform:uppercase; opacity:0.7; }
        .kpi-box.blue { color:#1a73e8; background:linear-gradient(145deg, #f0f7ff, #fff); }
        .kpi-box.green { color:#137333; background:linear-gradient(145deg, #eafff0, #fff); }
        .kpi-box.yellow { color:#b06000; background:linear-gradient(145deg, #fff8e1, #fff); }
        .kpi-box.red { color:#c5221f; background:linear-gradient(145deg, #fff0f0, #fff); }

        .main-split { display:grid; grid-template-columns: 3fr 2fr; gap:25px; }
        .panel { background:#fff; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.02); overflow:hidden; border:1px solid #f0f0f0; }
        .panel-head { padding:15px 20px; background:#fff; border-bottom:1px solid #f0f0f0; font-weight:800; font-size:14px; color:#444; letter-spacing:0.5px; text-transform:uppercase; }
        .panel-body { padding:20px; }

        /* PROJECT CARDS */
        .project-list-container { max-height:500px; overflow-y:auto; padding-right:10px; }
        .project-card { background:#fff; border:1px solid #eee; border-radius:12px; padding:15px; margin-bottom:15px; position:relative; transition:0.2s; border-left:4px solid transparent; }
        .project-card:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .project-card.done { border-left-color:#34a853; }
        .project-card.late { border-left-color:#ea4335; background:#fffbfb; }
        .project-card.doing { border-left-color:#fbbc04; }

        .pj-header { display:flex; justify-content:space-between; margin-bottom:10px; }
        .pj-name { font-weight:700; font-size:15px; color:#202124; }
        .pj-date { font-size:12px; font-weight:600; padding:4px 10px; border-radius:20px; background:#f1f3f4; color:#5f6368; }
        .pj-date.late { background:#fce8e6; color:#c5221f; }
        .pj-date.done { background:#e6f4ea; color:#137333; }

        .pj-body { display:flex; align-items:center; justify-content:space-between; gap:20px; }
        .pj-progress { flex:1; display:flex; align-items:center; gap:10px; }
        .prog-bar-bg { flex:1; height:8px; background:#f1f3f4; border-radius:10px; overflow:hidden; }
        .prog-bar-fill { height:100%; border-radius:10px; }
        .prog-text { font-size:13px; font-weight:800; width:35px; text-align:right; }

        .pj-members { display:flex; gap:5px; }
        .mem-tag { font-size:10px; font-weight:700; border:1px solid #ddd; padding:2px 6px; border-radius:4px; color:#555; background:#fff; white-space:nowrap; }
        
        .pj-status-badge { position:absolute; top:15px; right:15px; font-size:10px; font-weight:800; text-transform:uppercase; padding:3px 8px; border-radius:4px; opacity:0; }
        .empty-state { text-align:center; color:#9aa0a6; font-style:italic; padding:30px; }

        @media(max-width:768px){ .kpi-grid, .main-split { grid-template-columns: 1fr; } .pj-body { flex-direction:column; align-items:flex-start; gap:10px; } .pj-progress { width:100%; } }
    </style>
    `;
    content.innerHTML = html;

    // --- BIỂU ĐỒ CỘT (Daily Task) ---
    new Chart(document.getElementById('chart-staff'), {
        type: 'bar',
        data: {
            labels: Object.keys(dailyStats),
            datasets: [{
                label: 'Việc đã làm',
                data: Object.values(dailyStats),
                backgroundColor: ['#4285f4', '#34a853', '#fbbc04', '#ea4335'],
                borderRadius: 6,
                barThickness: 25
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Biểu đồ ngang cho đẹp
            plugins: { legend: {display:false} },
            scales: { x: { beginAtZero: true, grid: {display:false} } }
        }
    });
}

function parseVNDate(str) {
    if(!str) return new Date(0);
    const s = str.trim();
    let p = [];
    if(s.includes('/')) p = s.split('/'); else if(s.includes('-')) p = s.split('-');
    if(p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    return new Date(0);
}

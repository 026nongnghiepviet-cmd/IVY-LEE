/**
 * MKT DASHBOARD V82 - INTERACTIVE & GROUPED BARS
 * Feature: Click KPI Card to filter Project List
 */

let MKT_CACHE = [];
let CURRENT_PLIST = []; // Lưu trữ danh sách dự án hiện tại để lọc
let CURRENT_FILTER = 'all'; // Trạng thái lọc hiện tại

async function initMktDashboard() {
    const container = document.getElementById('plan-dashboard');
    if (!container) return;

    // Loading
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px; color:#5f6368">
            <div class="spinner" style="width:40px; height:40px; border-width:4px; border-color:#f1f3f4; border-top-color:#1a73e8; border-radius:50%; animation:spin 1s linear infinite"></div>
            <div style="margin-top:15px; font-weight:700; font-family:'Segoe UI'; color:#1a73e8">Đang tải dữ liệu tương tác...</div>
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
        filterData('all'); // Mặc định: Tất cả thời gian

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="color:red; padding:20px; text-align:center">Lỗi kết nối. Vui lòng F5.</div>`;
    }
}

function renderFilterBar(container) {
    container.innerHTML = `
    <div class="dash-header">
        <div class="filter-pills">
            <button class="pill active" onclick="filterData('all')" id="btn-all">Tất cả</button>
            <button class="pill" onclick="filterData('today')" id="btn-today">Hôm nay</button>
            <button class="pill" onclick="filterData('week')" id="btn-week">Tuần này</button>
            <button class="pill" onclick="filterData('month')" id="btn-month">Tháng này</button>
        </div>
        <div class="custom-date-wrapper">
            <div class="date-input-group">
                <span class="date-icon">📅</span>
                <input type="date" id="date-start" class="clean-date">
                <span class="arrow">➝</span>
                <input type="date" id="date-end" class="clean-date">
            </div>
            <button class="go-btn" onclick="filterData('custom')">Lọc</button>
        </div>
    </div>
    <div id="dashboard-content" class="fade-in"></div>
    
    <style>
        .dash-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:15px; background:#fff; padding:15px 20px; border-radius:16px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); border:1px solid #f0f0f0; }
        .filter-pills { display:flex; gap:5px; background:#f8f9fa; padding:5px; border-radius:12px; }
        .pill { border:none; background:transparent; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; color:#5f6368; cursor:pointer; transition:0.2s; white-space:nowrap; }
        .pill:hover { background:#eee; color:#000; }
        .pill.active { background:#fff; color:#1a73e8; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .custom-date-wrapper { display:flex; gap:8px; align-items:center; }
        .date-input-group { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e0e0e0; padding:6px 12px; border-radius:30px; transition:0.3s; }
        .date-input-group:focus-within { border-color:#1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
        .clean-date { border:none; outline:none; background:transparent; font-family:'Segoe UI'; font-size:12px; font-weight:600; color:#444; width:95px; cursor:pointer; }
        .go-btn { background:#1a73e8; color:#fff; border:none; padding:0 20px; height:34px; border-radius:20px; font-weight:700; font-size:12px; cursor:pointer; box-shadow: 0 4px 10px rgba(26,115,232,0.2); transition:0.2s; }
        .go-btn:hover { background:#1557b0; transform:translateY(-1px); }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        
        /* KPI GRID INTERACTIVE */
        .kpi-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:20px; }
        .kpi-box { background:#fff; padding:15px; border-radius:12px; text-align:center; border:1px solid #f0f0f0; box-shadow:0 2px 10px rgba(0,0,0,0.02); cursor:pointer; transition: all 0.2s ease; position:relative; overflow:hidden; }
        .kpi-box:hover { transform:translateY(-3px); box-shadow:0 8px 25px rgba(0,0,0,0.1); }
        .kpi-box.active { transform:scale(1.05); border-width:2px; box-shadow:0 8px 25px rgba(0,0,0,0.15); z-index:2; }
        .kpi-box h3 { margin:0; font-size:24px; font-weight:800; }
        .kpi-box p { margin:5px 0 0; font-size:11px; font-weight:700; opacity:0.7; text-transform:uppercase; }
        
        .kpi-box.blue { color:#1a73e8; border-bottom:4px solid #1a73e8; }
        .kpi-box.blue.active { border-color:#1a73e8; background:#f0f7ff; }
        
        .kpi-box.green { color:#137333; border-bottom:4px solid #137333; }
        .kpi-box.green.active { border-color:#137333; background:#eafff0; }
        
        .kpi-box.yellow { color:#b06000; border-bottom:4px solid #f9ab00; }
        .kpi-box.yellow.active { border-color:#f9ab00; background:#fff8e1; }
        
        .kpi-box.red { color:#c5221f; border-bottom:4px solid #d93025; }
        .kpi-box.red.active { border-color:#d93025; background:#fff0f0; }

        .main-split { display:grid; grid-template-columns: 6fr 4fr; gap:20px; }
        .panel { background:#fff; border-radius:14px; border:1px solid #e0e0e0; overflow:hidden; display:flex; flex-direction:column; height:500px; }
        .panel-head { padding:12px 15px; background:#fafafa; border-bottom:1px solid #eee; font-weight:700; font-size:13px; color:#555; text-transform:uppercase; letter-spacing:0.5px; display:flex; justify-content:space-between; }
        .panel-body { padding:15px; overflow-y:auto; flex:1; }

        /* PROJECT CARDS */
        .project-card { border:1px solid #eee; border-radius:10px; padding:12px; margin-bottom:12px; transition:0.2s; position:relative; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
        .project-card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.05); border-color:#d0d0d0; }
        .project-card.done { background:linear-gradient(to right, #fff, #f4fcf6); border-left:4px solid #34a853; }
        .project-card.late { background:linear-gradient(to right, #fff, #fff5f5); border-left:4px solid #ea4335; }
        .project-card.doing { border-left:4px solid #fbbc04; }

        .pj-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5px; }
        .pj-name { font-weight:700; font-size:14px; color:#333; line-height:1.4; }
        .pj-status-badge { font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700; text-transform:uppercase; }
        .pj-status-badge.done { background:#e6f4ea; color:#137333; }
        .pj-status-badge.doing { background:#fef7e0; color:#b06000; }
        .pj-status-badge.late { background:#fce8e6; color:#c5221f; }
        .pj-date-row { font-size:11px; margin-bottom:10px; display:flex; gap:5px; color:#666; }
        .pj-progress-wrapper { margin-bottom:8px; display:flex; align-items:center; gap:8px; }
        .prog-bar-bg { flex:1; height:6px; background:#eee; border-radius:4px; overflow:hidden; }
        .prog-bar-fill { height:100%; border-radius:4px; }
        .prog-text { font-size:12px; font-weight:800; min-width:30px; text-align:right; }
        .pj-members { display:flex; gap:5px; flex-wrap:wrap; }
        .mem-tag { font-size:10px; padding:2px 6px; border:1px solid transparent; border-radius:4px; font-weight:600; border:1px solid #eee; }
        
        .empty-state { text-align:center; padding:40px; color:#999; font-style:italic; font-size:13px; }
        .filter-tag { font-size:10px; background:#333; color:#fff; padding:2px 6px; border-radius:4px; margin-left:5px; vertical-align:middle; }

        @media(max-width:768px){ .kpi-grid, .main-split { grid-template-columns: 1fr; } .panel { height:auto; min-height:350px; } }
    </style>
    `;
}

function filterData(type) {
    let start = new Date(); start.setHours(0,0,0,0);
    let end = new Date(); end.setHours(23,59,59,999);

    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    
    if (type === 'all') {
        document.getElementById('btn-all').classList.add('active');
        start = new Date(2025, 0, 1); end = new Date(2030, 11, 31);
    }
    else if (type === 'today') {
        document.getElementById('btn-today').classList.add('active');
    } 
    else if (type === 'week') {
        document.getElementById('btn-week').classList.add('active');
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff); end.setDate(start.getDate() + 6);
    } 
    else if (type === 'month') {
        document.getElementById('btn-month').classList.add('active');
        start.setDate(1); end.setMonth(end.getMonth()+1); end.setDate(0);
    }
    else if (type === 'custom') {
        const s = document.getElementById('date-start').value;
        const e = document.getElementById('date-end').value;
        if(!s || !e) return alert("Vui lòng chọn đủ ngày!");
        start = new Date(s); end = new Date(e); end.setHours(23,59,59,999);
    }

    processData(start, end);
}

function processData(start, end) {
    const projects = {};
    const dailyStats = {};
    
    STAFF_LIST.forEach(s => {
        const simpleName = s.split(' ').pop();
        dailyStats[simpleName] = { done: 0, doing: 0, todo: 0 };
    });

    const now = new Date(); now.setHours(0,0,0,0);

    MKT_CACHE.forEach(row => {
        const dateStr = row[0];
        const taskName = row[3].trim();
        const progress = parseFloat(row[4].replace('%','')) || 0;
        const note = row[5];
        const staffName = row[row.length-1].split(' ').pop();
        const taskDate = parseVNDate(dateStr);

        // 1. DAILY TASK
        if (!note.includes("[DL:")) {
            if (taskDate >= start && taskDate <= end) {
                if (progress === 100) dailyStats[staffName].done++;
                else if (progress > 0) dailyStats[staffName].doing++;
                else dailyStats[staffName].todo++;
            }
        }

        // 2. DEADLINE
        if (note.includes("[DL:")) {
            const dlStr = note.split("[DL:")[1].replace("]","").trim();
            const dlDate = parseVNDate(dlStr);

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

    CURRENT_PLIST = [];
    let kpi = { total: 0, done: 0, late: 0, doing: 0 };

    Object.values(projects).forEach(p => {
        p.avg = Math.round(p.totalProg / p.count);
        p.isLate = (p.avg < 100 && p.deadline < now);
        p.isDone = (p.avg === 100);
        
        // Gán trạng thái chuẩn hóa để lọc
        if(p.isDone) { kpi.done++; p.filterStatus = 'done'; }
        else if(p.isLate) { kpi.late++; p.filterStatus = 'late'; }
        else { kpi.doing++; p.filterStatus = 'doing'; }
        
        kpi.total++;
        CURRENT_PLIST.push(p);
    });

    renderMainLayout(kpi, dailyStats);
}

function renderMainLayout(kpi, dailyStats) {
    const content = document.getElementById('dashboard-content');
    
    const html = `
    <div class="kpi-grid">
        <div class="kpi-box blue" id="kpi-all" onclick="setProjectFilter('all')">
            <h3>${kpi.total}</h3><p>TỔNG DỰ ÁN</p>
        </div>
        <div class="kpi-box green" id="kpi-done" onclick="setProjectFilter('done')">
            <h3>${kpi.done}</h3><p>HOÀN THÀNH</p>
        </div>
        <div class="kpi-box yellow" id="kpi-doing" onclick="setProjectFilter('doing')">
            <h3>${kpi.doing}</h3><p>ĐANG CHẠY</p>
        </div>
        <div class="kpi-box red" id="kpi-late" onclick="setProjectFilter('late')">
            <h3>${kpi.late}</h3><p>TRỄ HẠN</p>
        </div>
    </div>

    <div class="main-split">
        <div class="panel">
            <div class="panel-head">
                <div>📋 DANH SÁCH DỰ ÁN <span id="list-filter-label" class="filter-tag">Tất cả</span></div>
            </div>
            <div class="panel-body project-list-container" id="project-list-area">
                </div>
        </div>

        <div class="panel">
            <div class="panel-head">📊 HIỆU SUẤT NHÂN SỰ</div>
            <div class="panel-body">
                <canvas id="chart-staff" height="300"></canvas>
            </div>
        </div>
    </div>
    `;
    content.innerHTML = html;

    // Render biểu đồ 3 cột (Grouped)
    const names = Object.keys(dailyStats);
    const dataDone = names.map(n => dailyStats[n].done);
    const dataDoing = names.map(n => dailyStats[n].doing);
    const dataTodo = names.map(n => dailyStats[n].todo);

    new Chart(document.getElementById('chart-staff'), {
        type: 'bar',
        data: {
            labels: names,
            datasets: [
                { label: 'Đã xong', data: dataDone, backgroundColor: '#34a853', borderRadius: 4, barPercentage: 0.6 },
                { label: 'Đang làm', data: dataDoing, backgroundColor: '#fbbc04', borderRadius: 4, barPercentage: 0.6 },
                { label: 'Chưa làm', data: dataTodo, backgroundColor: '#ea4335', borderRadius: 4, barPercentage: 0.6 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'x',
            plugins: { legend: { position: 'top' }, title: { display:false } },
            scales: { x: { stacked: false, grid: {display:false} }, y: { beginAtZero: true } }
        }
    });

    // Mặc định hiển thị tất cả dự án
    setProjectFilter('all');
}

// --- HÀM LỌC DỰ ÁN KHI BẤM KPI CARD ---
function setProjectFilter(status) {
    CURRENT_FILTER = status;
    
    // 1. Update UI KPI Card
    document.querySelectorAll('.kpi-box').forEach(b => b.classList.remove('active'));
    document.getElementById('kpi-' + status).classList.add('active');

    // 2. Update Label
    const labels = { 'all': 'Tất cả', 'done': 'Đã xong', 'doing': 'Đang chạy', 'late': 'Trễ hạn' };
    document.getElementById('list-filter-label').innerText = labels[status];
    document.getElementById('list-filter-label').style.background = 
        status==='all'?'#333':(status==='done'?'#137333':(status==='doing'?'#f9ab00':'#d93025'));

    // 3. Filter List & Render
    const filteredList = (status === 'all') ? CURRENT_PLIST : CURRENT_PLIST.filter(p => p.filterStatus === status);
    
    // Sort logic
    filteredList.sort((a,b) => {
        if (a.isLate !== b.isLate) return b.isLate - a.isLate; 
        if (a.avg !== b.avg) return a.avg - b.avg; 
        return a.deadline - b.deadline;
    });

    renderProjectList(filteredList);
}

function renderProjectList(list) {
    const area = document.getElementById('project-list-area');
    if (list.length === 0) {
        area.innerHTML = `<div class="empty-state"><div style="font-size:30px; margin-bottom:5px">📭</div>Trống trơn! Không tìm thấy dự án nào.</div>`;
        return;
    }

    let html = '';
    list.forEach(p => {
        let memHTML = p.members.map(m => {
            let color = m.prog === 100 ? '#137333' : (m.prog > 0 ? '#f9ab00' : '#d93025');
            let bg = m.prog === 100 ? '#e6f4ea' : (m.prog > 0 ? '#fef7e0' : '#fce8e6');
            return `<div class="mem-tag" style="border-color:${color}; background:${bg}; color:${color}" title="${m.prog}%">${m.name} <small>${m.prog}%</small></div>`;
        }).join('');

        let statusClass = p.isDone ? 'done' : (p.isLate ? 'late' : 'doing');
        let statusText = p.isDone ? 'Đã xong' : (p.isLate ? 'Trễ hạn' : 'Đang chạy');
        let barColor = p.isDone ? '#34a853' : (p.isLate ? '#ea4335' : '#fbbc04');

        html += `
        <div class="project-card ${statusClass}">
            <div class="pj-header">
                <div class="pj-name">${p.name}</div>
                <div class="pj-status-badge ${statusClass}">${statusText}</div>
            </div>
            <div class="pj-date-row">
                <span style="opacity:0.6">Hạn chót:</span> 
                <span style="font-weight:700; color:${p.isLate?'#d93025':'#444'}">${p.dlStr}</span>
            </div>
            <div class="pj-body">
                <div class="pj-progress-wrapper">
                    <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${p.avg}%; background:${barColor}"></div></div>
                    <div class="prog-text" style="color:${barColor}">${p.avg}%</div>
                </div>
                <div class="pj-members">${memHTML}</div>
            </div>
        </div>`;
    });
    area.innerHTML = html;
}

function parseVNDate(str) {
    if(!str) return new Date(0);
    const s = str.trim();
    let p = [];
    if(s.includes('/')) p = s.split('/'); else if(s.includes('-')) p = s.split('-');
    if(p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    return new Date(0);
}

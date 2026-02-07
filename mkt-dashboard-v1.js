/**
 * MKT SYSTEM ANALYTICS - V3 (TIME FILTER)
 * Features: Project Grouping + Time Range Filter (Day/Week/Month/Custom)
 */

let MKT_CACHE = []; // Lưu trữ dữ liệu để không phải tải lại khi lọc

async function initMktDashboard() {
    const container = document.getElementById('plan-dashboard');
    if (!container) return;

    // 1. Loading UI
    container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#5f6368">
            <div class="spinner" style="width:24px; height:24px; border-width:3px; display:inline-block; margin-bottom:10px; border-top-color:#1a73e8"></div>
            <div style="font-size:12px; font-weight:600">Đang tải dữ liệu toàn phòng ban...</div>
        </div>`;

    try {
        // 2. Fetch Data (Chỉ làm 1 lần)
        const requests = STAFF_LIST.map(name => 
            fetch(`${SCRIPT_URL}?name=${encodeURIComponent(name)}&t=${Date.now()}`).then(r => r.json())
        );
        const results = await Promise.all(requests);
        
        // 3. Gộp dữ liệu
        MKT_CACHE = [];
        results.forEach((res, i) => {
            if(res.data) res.data.forEach(row => {
                row.push(STAFF_LIST[i]); // Thêm tên nhân viên vào cuối
                MKT_CACHE.push(row);
            });
        });

        // 4. Khởi tạo giao diện bộ lọc và mặc định chọn "Tháng này"
        renderFilterBar(container);
        filterData('month'); 

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="color:#d93025; padding:20px; text-align:center">Lỗi tải dữ liệu!<br><small>${e.message}</small></div>`;
    }
}

// --- HÀM VẼ THANH BỘ LỌC ---
function renderFilterBar(container) {
    const html = `
    <div class="filter-bar">
        <div class="filter-group">
            <button class="filter-btn" onclick="filterData('today')" id="btn-today">Hôm nay</button>
            <button class="filter-btn" onclick="filterData('week')" id="btn-week">Tuần này</button>
            <button class="filter-btn active" onclick="filterData('month')" id="btn-month">Tháng này</button>
        </div>
        <div class="filter-group custom-date">
            <input type="date" id="date-start" placeholder="Từ ngày">
            <span>-</span>
            <input type="date" id="date-end" placeholder="Đến ngày">
            <button class="filter-btn go-btn" onclick="filterData('custom')">Xem</button>
        </div>
    </div>
    <div id="dashboard-content"></div>
    
    <style>
        .filter-bar { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; background:#fff; padding:10px 15px; border-radius:10px; border:1px solid #e0e0e0; flex-wrap:wrap; gap:10px; }
        .filter-group { display:flex; gap:5px; align-items:center; }
        .filter-btn { border:1px solid #dadce0; background:#fff; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; color:#5f6368; cursor:pointer; transition:0.2s; }
        .filter-btn:hover { background:#f1f3f4; color:#202124; }
        .filter-btn.active { background:#e8f0fe; color:#1a73e8; border-color:#1a73e8; }
        .filter-btn.go-btn { background:#1a73e8; color:#fff; border:none; }
        .custom-date input { border:1px solid #dadce0; padding:5px; border-radius:4px; font-size:12px; color:#444; width:110px; }
        @media(max-width:768px){ .filter-bar{ flex-direction:column; align-items:flex-start; } .custom-date{ width:100%; } }
    </style>
    `;
    container.innerHTML = html;
}

// --- HÀM XỬ LÝ LỌC ---
function filterData(type) {
    // 1. Xác định khoảng thời gian (Start - End)
    let start = new Date(); start.setHours(0,0,0,0);
    let end = new Date(); end.setHours(23,59,59,999);

    // Active button UI
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    
    if (type === 'today') {
        document.getElementById('btn-today').classList.add('active');
    } 
    else if (type === 'week') {
        document.getElementById('btn-week').classList.add('active');
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Thứ 2
        start.setDate(diff);
        end.setDate(start.getDate() + 6); // Chủ nhật
    } 
    else if (type === 'month') {
        document.getElementById('btn-month').classList.add('active');
        start.setDate(1); // Mùng 1
        end.setMonth(end.getMonth() + 1); end.setDate(0); // Cuối tháng
    } 
    else if (type === 'custom') {
        const sInput = document.getElementById('date-start').value;
        const eInput = document.getElementById('date-end').value;
        if(!sInput || !eInput) { alert("Vui lòng chọn ngày bắt đầu và kết thúc!"); return; }
        start = new Date(sInput); start.setHours(0,0,0,0);
        end = new Date(eInput); end.setHours(23,59,59,999);
    }

    // 2. Lọc dữ liệu từ MKT_CACHE
    const projects = {};
    const workload = {};
    STAFF_LIST.forEach(s => workload[s.split(' ').pop()] = 0); // Reset workload

    MKT_CACHE.forEach(row => {
        const dateStr = row[0];
        const taskName = row[3].trim();
        const progress = parseFloat(row[4].replace('%','')) || 0;
        const note = row[5];
        const staffName = row[row.length-1].split(' ').pop();
        
        // Parse ngày làm việc (Cột A)
        const taskDate = parseVNDate(dateStr);

        // A. Tính khối lượng việc (Dựa vào ngày làm việc Cột A)
        if (taskDate >= start && taskDate <= end && !note.includes("[DL:")) {
            workload[staffName] = (workload[staffName] || 0) + 1;
        }

        // B. Tính Dự Án (Dựa vào ngày Deadline trong Note)
        if (note.includes("[DL:")) {
            const dlStr = note.split("[DL:")[1].replace("]","").trim();
            const dlDate = parseVNDate(dlStr);

            // Chỉ tính dự án nếu Deadline nằm trong khoảng lọc
            if (dlDate >= start && dlDate <= end) {
                const key = taskName + "_" + dlStr;
                if (!projects[key]) {
                    projects[key] = {
                        name: taskName,
                        deadline: dlDate,
                        dlStr: dlStr,
                        members: [],
                        totalProg: 0,
                        count: 0,
                        isDone: true
                    };
                }
                projects[key].members.push(`${staffName} (${progress}%)`);
                projects[key].totalProg += progress;
                projects[key].count++;
                if (progress < 100) projects[key].isDone = false;
            }
        }
    });

    // 3. Tính toán thống kê
    let stats = { total: 0, completed: 0, running: 0, late: 0 };
    let list = [];
    const now = new Date(); now.setHours(0,0,0,0);

    Object.values(projects).forEach(p => {
        stats.total++;
        p.avg = Math.round(p.totalProg / p.count);
        if (p.isDone) {
            stats.completed++;
        } else {
            if (p.deadline < now) { stats.late++; p.status = "Trễ hạn"; }
            else { stats.running++; p.status = "Đang chạy"; }
            list.push(p);
        }
    });

    // 4. Vẽ lại giao diện
    renderContent(stats, workload, list);
}

// --- HÀM RENDER NỘI DUNG ---
function renderContent(stats, workload, list) {
    const content = document.getElementById('dashboard-content');
    
    // Sort list: Trễ hạn lên đầu -> Sắp đến hạn
    list.sort((a,b) => a.deadline - b.deadline);

    const html = `
    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:20px;">
        <div class="kpi-card" style="background:#e8f0fe; color:#1967d2"><div class="num">${stats.total}</div><div class="lbl">DỰ ÁN CẦN LÀM</div></div>
        <div class="kpi-card" style="background:#e6f4ea; color:#137333"><div class="num">${stats.completed}</div><div class="lbl">ĐÃ HOÀN THÀNH</div></div>
        <div class="kpi-card" style="background:#fef7e0; color:#b06000"><div class="num">${stats.running}</div><div class="lbl">ĐANG TRIỂN KHAI</div></div>
        <div class="kpi-card" style="background:#fce8e6; color:#c5221f"><div class="num">${stats.late}</div><div class="lbl">ĐÃ TRỄ HẠN</div></div>
    </div>

    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:15px; margin-bottom:20px;">
        <div class="chart-box">
            <canvas id="chart-staff"></canvas>
        </div>
        <div class="chart-box" style="position:relative">
            <canvas id="chart-project"></canvas>
        </div>
    </div>

    <div class="chart-box" style="height:auto; min-height:200px; padding:0; overflow:hidden">
        <div style="padding:15px; border-bottom:1px solid #eee; font-weight:700; color:#d93025; font-size:13px;">🔥 TIẾN ĐỘ CHI TIẾT (Chưa hoàn thành)</div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead style="background:#f8f9fa; color:#5f6368;">
                    <tr><th style="padding:10px; text-align:left;">Dự án</th><th style="padding:10px;">Hạn</th><th style="padding:10px;">Tiến độ</th><th style="padding:10px; text-align:left;">Chi tiết</th></tr>
                </thead>
                <tbody>
                    ${list.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999">Không có dự án nào dở dang trong khoảng này.</td></tr>' : 
                      list.map(p => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px; font-weight:600; color:#333">${p.name}</td>
                            <td style="padding:10px; text-align:center; color:${p.status==='Trễ hạn'?'#d93025':'#333'}; font-weight:bold">${p.dlStr}</td>
                            <td style="padding:10px; text-align:center;">
                                <div style="background:#eee; border-radius:10px; height:6px; width:60px; display:inline-block; overflow:hidden; vertical-align:middle">
                                    <div style="background:${p.avg<50?'#ea4335':(p.avg<80?'#fbbc04':'#34a853')}; width:${p.avg}%; height:100%"></div>
                                </div>
                                <span style="font-size:10px; margin-left:5px; font-weight:bold">${p.avg}%</span>
                            </td>
                            <td style="padding:10px; color:#5f6368">${p.members.join(', ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    
    <style>
        .kpi-card { padding:15px; border-radius:12px; text-align:center; border:1px solid rgba(0,0,0,0.05); }
        .kpi-card .num { font-size:24px; font-weight:900; margin-bottom:5px; }
        .kpi-card .lbl { font-size:10px; font-weight:700; opacity:0.8; }
        .chart-box { background:#fff; border:1px solid #e0e0e0; border-radius:12px; padding:10px; height:280px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
    </style>
    `;
    content.innerHTML = html;

    // --- VẼ BIỂU ĐỒ ---
    new Chart(document.getElementById('chart-staff'), {
        type: 'bar',
        data: {
            labels: Object.keys(workload),
            datasets: [{
                label: 'Đầu việc đã làm',
                data: Object.values(workload),
                backgroundColor: '#4285f4', borderRadius: 4, barThickness: 30
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'KHỐI LƯỢNG CÔNG VIỆC', font:{size:11, weight:'bold'} }, legend: {display:false} },
            scales: { y: { beginAtZero: true, ticks: {stepSize: 1} }, x: { grid: {display:false} } }
        }
    });

    new Chart(document.getElementById('chart-project'), {
        type: 'doughnut',
        data: {
            labels: ['Xong', 'Đang chạy', 'Trễ'],
            datasets: [{
                data: [stats.completed, stats.running, stats.late],
                backgroundColor: ['#34a853', '#fbbc04', '#ea4335'], borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { title: { display: true, text: 'TỶ LỆ HOÀN THÀNH', font:{size:11, weight:'bold'} }, legend: {position:'bottom', labels:{boxWidth:10, font:{size:10}}} }
        }
    });
}

// Hàm parse ngày Việt Nam (dd/mm/yyyy hoặc d/m/yyyy)
function parseVNDate(str) {
    if(!str) return new Date(0); // Return epoch nếu rỗng
    const s = str.trim();
    let p = [];
    if(s.includes('/')) p = s.split('/');
    else if(s.includes('-')) p = s.split('-');
    
    if(p.length === 3) {
        // Lưu ý: Tháng trong JS bắt đầu từ 0
        return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    }
    return new Date(0);
}

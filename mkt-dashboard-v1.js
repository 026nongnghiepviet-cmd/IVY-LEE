/**
 * MKT SYSTEM ANALYTICS - V2 (PROJECT BASED)
 * Logic: Gom nhóm Deadline theo Tên công việc (Project)
 */

async function initMktDashboard() {
    const container = document.getElementById('plan-dashboard');
    if (!container) return;

    // 1. Loading UI
    container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#5f6368">
            <div class="spinner" style="width:24px; height:24px; border-width:3px; display:inline-block; margin-bottom:10px; border-top-color:#1a73e8"></div>
            <div style="font-size:12px; font-weight:600">Đang tổng hợp dữ liệu dự án...</div>
        </div>`;

    try {
        // 2. Fetch Data
        const requests = STAFF_LIST.map(name => 
            fetch(`${SCRIPT_URL}?name=${encodeURIComponent(name)}&t=${Date.now()}`).then(r => r.json())
        );
        const results = await Promise.all(requests);
        
        // 3. Xử lý dữ liệu
        let rawData = [];
        results.forEach((res, i) => {
            if(res.data) res.data.forEach(row => {
                row.push(STAFF_LIST[i]); // Thêm tên người sở hữu vào cuối mảng row để tracking
                rawData.push(row);
            });
        });

        processAnalytics(container, rawData);

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="color:#d93025; padding:20px; text-align:center">Lỗi phân tích dữ liệu.<br><small>${e.message}</small></div>`;
    }
}

function processAnalytics(container, data) {
    const today = new Date();
    today.setHours(0,0,0,0);

    // --- A. GOM NHÓM DỰ ÁN (DEADLINE) ---
    const projects = {};
    const staffWorkload = {}; // { 'Tài': 5, 'Duy': 3 } (Đếm đầu việc hàng ngày)

    // Init workload
    STAFF_LIST.forEach(s => staffWorkload[s.split(' ').pop()] = 0);

    data.forEach(row => {
        const dateStr = row[0]; // Cột A
        const taskName = row[3].trim();
        const progress = parseFloat(row[4].replace('%','')) || 0;
        const note = row[5];
        const staffName = row[row.length-1].split(' ').pop(); // Tên ngắn (Cột tạm thêm lúc nãy)

        // 1. Tính Workload (Chỉ tính công việc ngày hôm nay, ko tính DL)
        if (getNorm(dateStr) === getNorm(getTodayVN()) && !note.includes("[DL:")) {
            staffWorkload[staffName] = (staffWorkload[staffName] || 0) + 1;
        }

        // 2. Xử lý Deadline (Gom nhóm theo Tên Task)
        if (note.includes("[DL:")) {
            const dlDateStr = note.split("[DL:")[1].replace("]","").trim();
            const dlDateParts = dlDateStr.split('/');
            const dlDate = new Date(dlDateParts[2], dlDateParts[1]-1, dlDateParts[0]); // y, m-1, d
            
            // Key duy nhất của dự án = Tên Task + Ngày Deadline (Để phân biệt các task trùng tên khác ngày)
            const projectKey = taskName + "_" + dlDateStr;

            if (!projects[projectKey]) {
                projects[projectKey] = {
                    name: taskName,
                    deadline: dlDate,
                    dlStr: dlDateStr,
                    members: [],
                    totalProg: 0,
                    count: 0,
                    isDone: true // Giả định xong, nếu có 1 người chưa xong -> false
                };
            }

            projects[projectKey].members.push(`${staffName} (${progress}%)`);
            projects[projectKey].totalProg += progress;
            projects[projectKey].count++;
            if (progress < 100) projects[projectKey].isDone = false;
        }
    });

    // --- B. TÍNH TOÁN TRẠNG THÁI DỰ ÁN ---
    let stats = { total: 0, completed: 0, running: 0, late: 0 };
    let criticalList = []; // Danh sách dự án trễ/gấp

    Object.values(projects).forEach(p => {
        stats.total++;
        p.avg = Math.round(p.totalProg / p.count);

        if (p.isDone) {
            stats.completed++;
        } else {
            // Chưa xong: Check xem trễ chưa
            if (p.deadline < today) {
                stats.late++;
                p.status = "Trễ hạn";
                criticalList.push(p);
            } else {
                stats.running++;
                p.status = "Đang chạy";
                // Nếu hạn là hôm nay hoặc mai -> Thêm vào list chú ý
                const diffTime = Math.abs(p.deadline - today);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays <= 2) criticalList.push(p);
            }
        }
    });

    renderUI(container, stats, staffWorkload, criticalList);
}

function renderUI(container, stats, workload, criticalList) {
    // Sắp xếp list trễ lên đầu
    criticalList.sort((a,b) => a.deadline - b.deadline);

    const html = `
    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:20px;">
        <div class="kpi-card" style="background:#e8f0fe; color:#1967d2">
            <div class="num">${stats.total}</div>
            <div class="lbl">TỔNG DỰ ÁN</div>
        </div>
        <div class="kpi-card" style="background:#e6f4ea; color:#137333">
            <div class="num">${stats.completed}</div>
            <div class="lbl">HOÀN THÀNH</div>
        </div>
        <div class="kpi-card" style="background:#fef7e0; color:#b06000">
            <div class="num">${stats.running}</div>
            <div class="lbl">ĐANG CHẠY</div>
        </div>
        <div class="kpi-card" style="background:#fce8e6; color:#c5221f">
            <div class="num">${stats.late}</div>
            <div class="lbl">TRỄ HẠN</div>
        </div>
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
        <div style="padding:15px; border-bottom:1px solid #eee; font-weight:700; color:#d93025; font-size:13px; display:flex; align-items:center; gap:5px;">
            <span>🔥 DỰ ÁN CẦN CHÚ Ý (Trễ & Sắp đến hạn)</span>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead style="background:#f8f9fa; color:#5f6368;">
                    <tr>
                        <th style="padding:10px; text-align:left;">Dự án</th>
                        <th style="padding:10px;">Hạn</th>
                        <th style="padding:10px;">Tiến độ chung</th>
                        <th style="padding:10px; text-align:left;">Nhân sự</th>
                    </tr>
                </thead>
                <tbody>
                    ${criticalList.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999">Tuyệt vời! Không có dự án nào trễ hạn.</td></tr>' : 
                      criticalList.map(p => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px; font-weight:600; color:#333">${p.name}</td>
                            <td style="padding:10px; text-align:center; color:${p.status==='Trễ hạn'?'#d93025':'#333'}; font-weight:bold">${p.dlStr}</td>
                            <td style="padding:10px; text-align:center;">
                                <div style="background:#eee; border-radius:10px; height:6px; width:60px; display:inline-block; overflow:hidden;">
                                    <div style="background:${p.avg<50?'#ea4335':(p.avg<80?'#fbbc04':'#34a853')}; width:${p.avg}%; height:100%"></div>
                                </div>
                                <span style="font-size:10px; margin-left:5px">${p.avg}%</span>
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
        .kpi-card .lbl { font-size:11px; font-weight:700; opacity:0.8; }
        .chart-box { background:#fff; border:1px solid #e0e0e0; border-radius:12px; padding:15px; height:280px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
    </style>
    `;

    container.innerHTML = html;

    // --- RENDER CHARTS ---
    
    // 1. Chart Staff (Khối lượng việc hôm nay)
    new Chart(document.getElementById('chart-staff'), {
        type: 'bar',
        data: {
            labels: Object.keys(workload),
            datasets: [{
                label: 'Việc hàng ngày',
                data: Object.values(workload),
                backgroundColor: '#4285f4',
                borderRadius: 4,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'KHỐI LƯỢNG VIỆC HÔM NAY', font:{size:11, weight:'bold'} }, legend: {display:false} },
            scales: { y: { beginAtZero: true, ticks: {stepSize: 1} }, x: { grid: {display:false} } }
        }
    });

    // 2. Chart Project Status
    new Chart(document.getElementById('chart-project'), {
        type: 'doughnut',
        data: {
            labels: ['Hoàn thành', 'Đang chạy', 'Trễ hạn'],
            datasets: [{
                data: [stats.completed, stats.running, stats.late],
                backgroundColor: ['#34a853', '#fbbc04', '#ea4335'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { 
                title: { display: true, text: 'TIẾN ĐỘ DỰ ÁN', font:{size:11, weight:'bold'} }, 
                legend: { position: 'bottom', labels: {boxWidth:10, font:{size:10}} } 
            }
        }
    });
}

// Hàm hỗ trợ từ code chính (nếu chưa có trong context này)
function getTodayVN() { const d=new Date(); return d.getDate().toString().padStart(2,'0')+"/"+(d.getMonth()+1).toString().padStart(2,'0')+"/"+d.getFullYear(); }
function getNorm(d) { if(!d) return ""; let p = d.toString().trim().split(/[\s./-]/); if(p.length<2) return d; return parseInt(p[0])+"-"+parseInt(p[1])+"-"+(p[2]||"2026"); }

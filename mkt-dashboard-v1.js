/**
 * MKT SYSTEM ANALYTICS - EXTERNAL MODULE
 * Author: Gemini AI
 * Version: 1.0
 */

// Hàm khởi tạo Dashboard
async function initMktDashboard() {
    const container = document.getElementById('plan-dashboard');
    if (!container) return;

    // 1. Hiển thị Loading
    container.innerHTML = `
        <div style="text-align:center; padding:50px; color:#1a73e8">
            <div class="spinner" style="width:30px; height:30px; border-width:3px; display:inline-block; margin-bottom:10px"></div>
            <div>Đang phân tích dữ liệu toàn phòng ban...</div>
        </div>`;

    try {
        // 2. Tải dữ liệu toàn bộ nhân viên song song (Promise.all)
        // Sử dụng biến toàn cục SCRIPT_URL và STAFF_LIST từ code chính
        const requests = STAFF_LIST.map(name => 
            fetch(`${SCRIPT_URL}?name=${encodeURIComponent(name)}&t=${Date.now()}`).then(r => r.json())
        );

        const results = await Promise.all(requests);
        
        // 3. Tổng hợp dữ liệu
        let totalTasks = 0;
        let completedTasks = 0;
        let lateDeadlines = 0;
        let staffStats = [];
        let statusCounts = { done: 0, process: 0, todo: 0 }; // 100%, 1-99%, 0%

        const todayStr = getTodayVN(); // Hàm từ code chính

        results.forEach((res, index) => {
            const name = STAFF_LIST[index];
            const data = (res && res.data) ? res.data : [];
            
            // Lọc công việc hôm nay của nhân viên này
            const todayTasks = data.filter(r => getNorm(r[0]) === getNorm(todayStr) && !r[5].includes("[DL:"));
            const deadlines = data.filter(r => r[5].includes("[DL:") && getNorm(r[0]) === getNorm(todayStr));

            let pTotal = 0;
            let count = todayTasks.length;
            
            todayTasks.forEach(t => {
                let prog = parseFloat(fixProgValue(t[4])) || 0;
                pTotal += prog;
                
                if (prog === 100) statusCounts.done++;
                else if (prog > 0) statusCounts.process++;
                else statusCounts.todo++;
            });

            // Check deadline trễ (Giả sử deadline < 100% là trễ nếu xem lại quá khứ, ở đây đếm số lượng DL phải làm)
            deadlines.forEach(d => {
                let prog = parseFloat(fixProgValue(d[4])) || 0;
                if(prog < 100) lateDeadlines++; // Số deadline chưa xong
            });

            staffStats.push({
                name: name.split(' ').pop(), // Lấy tên cuối (Tài, Duy...)
                count: count,
                avg: count > 0 ? Math.round(pTotal / count) : 0
            });

            totalTasks += count;
            completedTasks += statusCounts.done;
        });

        // 4. Vẽ Giao diện
        renderDashboardUI(container, totalTasks, statusCounts, staffStats, lateDeadlines);

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="color:red; text-align:center; padding:20px">Lỗi tải dữ liệu thống kê!<br>${e.message}</div>`;
    }
}

function renderDashboardUI(container, total, status, staffStats, lateDL) {
    // Tính % hoàn thành toàn team
    const teamRate = total > 0 ? Math.round((status.done / total) * 100) : 0;

    const html = `
    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; margin-bottom:20px;">
        <div style="background:#e6f4ea; padding:15px; border-radius:12px; text-align:center;">
            <div style="font-size:24px; font-weight:900; color:#137333">${teamRate}%</div>
            <div style="font-size:12px; color:#5f6368; font-weight:bold">TIẾN ĐỘ CHUNG</div>
        </div>
        <div style="background:#e8f0fe; padding:15px; border-radius:12px; text-align:center;">
            <div style="font-size:24px; font-weight:900; color:#1a73e8">${total}</div>
            <div style="font-size:12px; color:#5f6368; font-weight:bold">TỔNG ĐẦU VIỆC</div>
        </div>
        <div style="background:#fce8e6; padding:15px; border-radius:12px; text-align:center;">
            <div style="font-size:24px; font-weight:900; color:#d93025">${lateDL}</div>
            <div style="font-size:12px; color:#5f6368; font-weight:bold">DL CHƯA XONG</div>
        </div>
    </div>

    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:20px;">
        <div style="background:#fff; padding:15px; border-radius:12px; border:1px solid #eee; height:300px">
            <canvas id="chart-workload"></canvas>
        </div>
        <div style="background:#fff; padding:15px; border-radius:12px; border:1px solid #eee; height:300px; position:relative">
            <canvas id="chart-status"></canvas>
        </div>
    </div>
    `;

    container.innerHTML = html;

    // Vẽ biểu đồ Workload (Bar)
    new Chart(document.getElementById('chart-workload'), {
        type: 'bar',
        data: {
            labels: staffStats.map(s => s.name),
            datasets: [{
                label: 'Số lượng việc',
                data: staffStats.map(s => s.count),
                backgroundColor: '#1a73e8',
                borderRadius: 5
            }, {
                label: '% Trung bình',
                data: staffStats.map(s => s.avg),
                type: 'line',
                borderColor: '#ea4335',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'PHÂN BỔ CÔNG VIỆC & HIỆU SUẤT' }, legend: {position:'bottom'} },
            scales: {
                y: { beginAtZero: true, grid: {display:false} },
                y1: { beginAtZero: true, position: 'right', max: 100, grid: {display:false} }
            }
        }
    });

    // Vẽ biểu đồ Status (Doughnut)
    new Chart(document.getElementById('chart-status'), {
        type: 'doughnut',
        data: {
            labels: ['Hoàn thành', 'Đang làm', 'Chưa làm'],
            datasets: [{
                data: [status.done, status.process, status.todo],
                backgroundColor: ['#137333', '#fbbc04', '#f1f3f4'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'TÌNH HÌNH TOÀN TEAM' }, legend: {position:'bottom'} },
            cutout: '70%'
        }
    });
}
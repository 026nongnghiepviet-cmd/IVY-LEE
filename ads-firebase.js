/**
 * ADS MODULE V7 (INTELLIGENCE)
 * - Tách biệt Lịch sử Upload (Logs) và Dữ liệu chi tiết (Data)
 * - Tự động bóc tách: Nhân viên - Sản phẩm từ tên chiến dịch
 * - Bộ lọc dựa trên thời gian thực chạy Ads
 */

// 1. CẤU HÌNH FIREBASE (Đã điền sẵn của bạn)
const firebaseConfig = {
    apiKey: "AIzaSyBywvyrxAQqT0_9UK0GIky11FNxMBQEZd0",
    authDomain: "mkt-system-nnv.firebaseapp.com",
    databaseURL: "https://mkt-system-nnv-default-rtdb.firebaseio.com",
    projectId: "mkt-system-nnv",
    storageBucket: "mkt-system-nnv.firebasestorage.app",
    messagingSenderId: "586768512413",
    appId: "1:586768512413:web:b4336f72b1099054c2ab74",
    measurementId: "G-XTHLN34C06"
};

// Khởi tạo Firebase an toàn
let db;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.database();
    }
} catch (e) { console.error("Firebase Error:", e); }

let GLOBAL_ADS_DATA = [];

// --- HÀM KHỞI TẠO (GỌI TỪ BLOGGER) ---
function initAdsAnalysis() {
    console.log("Ads V7 Loaded");
    
    // 1. Gắn sự kiện Upload
    const input = document.getElementById('ads-file-input');
    if(input && !input.hasAttribute('data-listening')) {
        input.addEventListener('change', handleFirebaseUpload);
        input.setAttribute('data-listening', 'true');
    }

    // 2. Gắn sự kiện Bộ lọc
    document.getElementById('filter-search')?.addEventListener('keyup', applyFilters);
    document.getElementById('filter-start')?.addEventListener('change', applyFilters);
    document.getElementById('filter-end')?.addEventListener('change', applyFilters);

    // 3. Tải dữ liệu
    if(db) {
        loadUploadHistory(); // Tải bảng lịch sử bên trái
        loadAdsData();       // Tải dữ liệu phân tích bên phải
    }
}

// --- XỬ LÝ UPLOAD & BÓC TÁCH ---
function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    // UI Loading
    const btnText = document.querySelector('.upload-text');
    if(btnText) btnText.innerText = "⏳ Đang phân tích...";

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header:1});
            
            // Bóc tách thông minh
            const result = parseExcelSmart(json);
            
            if(result.data.length > 0) {
                const batchId = Date.now().toString(); // Mã lô upload
                
                // A. Lưu Lịch sử Upload (Logs)
                db.ref('upload_logs/' + batchId).set({
                    timestamp: new Date().toISOString(),
                    fileName: file.name,
                    rowCount: result.data.length,
                    totalSpend: result.totalSpend
                });

                // B. Lưu Dữ liệu chi tiết (Data)
                const updates = {};
                result.data.forEach(item => {
                    const newKey = db.ref().child('ads_data').push().key;
                    item.batchId = batchId; // Gắn mã lô để truy vết sau này
                    updates['/ads_data/' + newKey] = item;
                });
                
                db.ref().update(updates).then(() => {
                    alert(`✅ Thành công! Đã thêm ${result.data.length} dòng dữ liệu.\n💰 Tổng tiền: ${result.totalSpend.toLocaleString()}đ`);
                    if(btnText) btnText.innerText = "Upload Excel (Cộng dồn)";
                    // Reset input để chọn lại file cũ được
                    document.getElementById('ads-file-input').value = "";
                });
            } else {
                alert("File không có dữ liệu hợp lệ (Kiểm tra cột 'Số tiền đã chi tiêu')");
                if(btnText) btnText.innerText = "Upload Excel (Cộng dồn)";
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi đọc file: " + err.message);
            if(btnText) btnText.innerText = "Upload Excel (Cộng dồn)";
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- LOGIC BÓC TÁCH FILE EXCEL (CỐT LÕI) ---
function parseExcelSmart(rows) {
    if (rows.length < 2) return { data: [], totalSpend: 0 };
    
    // Chuẩn hóa header
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    
    // Tìm cột dựa trên file mẫu bạn gửi
    const colStart = header.findIndex(h => h.includes("bắt đầu báo cáo"));
    const colEnd = header.findIndex(h => h.includes("kết thúc báo cáo"));
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    const colSpend = header.findIndex(h => h.includes("số tiền đã chi tiêu") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results"); // Cột "Kết quả"
    const colMess = header.findIndex(h => h.includes("người liên hệ") || h.includes("messaging")); // Dự phòng

    if (colSpend === -1 || colCamp === -1) return { data: [], totalSpend: 0 };

    let parsedData = [];
    let grandTotal = 0;

    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r || r.length === 0) continue;
        
        // 1. Lấy tiền & Kết quả
        let spend = parseFloat(r[colSpend]) || 0;
        if(spend <= 0) continue; // Bỏ qua dòng không tiêu tiền
        
        let leads = parseFloat(r[colResult]) || parseFloat(r[colMess]) || 0;
        let fullCampaignName = r[colCamp] || "Unknown";

        // 2. Bóc tách Tên NV và Sản phẩm từ tên Chiến dịch
        // Logic: "TÊN NV - TÊN SP - ...." -> Tách bằng dấu gạch ngang
        let parts = fullCampaignName.split('-');
        let employee = parts[0] ? parts[0].trim().toUpperCase() : "KHÁC";
        let product = parts[1] ? parts[1].trim() : "Chung"; // Nếu không có gạch ngang thứ 2 thì để là Chung

        // 3. Lấy thời gian chạy Ads (Quan trọng cho bộ lọc)
        // File Excel Facebook thường trả về dạng "2026-01-04" (String)
        let dateStart = r[colStart] || ""; 
        let dateEnd = r[colEnd] || "";

        parsedData.push({
            campaign: fullCampaignName,
            employee: employee, // Dùng để thống kê theo nhân viên
            product: product,   // Dùng để xem sản phẩm
            spend: spend,
            leads: leads,
            run_start: dateStart, // Ngày bắt đầu chạy trong file
            run_end: dateEnd,     // Ngày kết thúc chạy trong file
            upload_time: new Date().toISOString()
        });
        grandTotal += spend;
    }
    return { data: parsedData, totalSpend: grandTotal };
}

// --- HIỂN THỊ LỊCH SỬ UPLOAD (CỘT TRÁI) ---
function loadUploadHistory() {
    const historyBody = document.getElementById('upload-history-body');
    if(!historyBody) return;

    db.ref('upload_logs').limitToLast(20).on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { 
            historyBody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:10px'>Chưa có file nào</td></tr>"; 
            return; 
        }
        
        // Sắp xếp mới nhất lên đầu
        const sorted = Object.values(data).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        let html = "";
        sorted.forEach(log => {
            const d = new Date(log.timestamp);
            // Format: 10/02 14:30
            const timeStr = `${("0"+d.getDate()).slice(-2)}/${("0"+(d.getMonth()+1)).slice(-2)} ${("0"+d.getHours()).slice(-2)}:${("0"+d.getMinutes()).slice(-2)}`;
            const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
            
            html += `
                <tr style="border-bottom:1px solid #eee">
                    <td style="padding:8px; font-size:11px; color:#555; white-space:nowrap">${timeStr}</td>
                    <td style="padding:8px; font-size:12px; font-weight:600; color:#1a73e8; word-break:break-word">${log.fileName}</td>
                    <td style="padding:8px; text-align:right; font-weight:bold; font-size:11px">${money}</td>
                </tr>
            `;
        });
        historyBody.innerHTML = html;
    });
}

// --- TẢI DỮ LIỆU ĐỂ PHÂN TÍCH (CỘT PHẢI) ---
function loadAdsData() {
    db.ref('ads_data').on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { GLOBAL_ADS_DATA = []; return; }
        GLOBAL_ADS_DATA = Object.values(data);
        applyFilters(); // Tải xong thì gọi bộ lọc ngay để hiển thị
    });
}

// --- BỘ LỌC DỮ LIỆU (THEO NGÀY CHẠY ADS) ---
function applyFilters() {
    const search = document.getElementById('filter-search').value.toLowerCase();
    const startStr = document.getElementById('filter-start').value;
    const endStr = document.getElementById('filter-end').value;

    const filtered = GLOBAL_ADS_DATA.filter(item => {
        // 1. Lọc theo từ khóa (Tìm tên NV, Sản phẩm, Chiến dịch)
        const contentMatch = (item.employee + " " + item.product + " " + item.campaign).toLowerCase().includes(search);
        
        // 2. Lọc theo thời gian (Dựa trên cột "Bắt đầu báo cáo" trong file)
        // item.run_start dạng "2026-01-04"
        let dateMatch = true;
        if (startStr && item.run_start < startStr) dateMatch = false;
        if (endStr && item.run_end > endStr) dateMatch = false;

        return contentMatch && dateMatch;
    });

    renderDashboard(filtered);
}

// --- VẼ DASHBOARD ---
function renderDashboard(data) {
    const resultDiv = document.getElementById('ads-analysis-result');
    if(resultDiv) resultDiv.style.display = 'block';

    let totalSpend = 0, totalLeads = 0;
    
    // Gộp dữ liệu theo Nhân viên để vẽ biểu đồ cho gọn
    let employeeAgg = {};

    data.forEach(item => {
        totalSpend += item.spend;
        totalLeads += item.leads;
        
        if(!employeeAgg[item.employee]) {
            employeeAgg[item.employee] = { spend: 0, leads: 0 };
        }
        employeeAgg[item.employee].spend += item.spend;
        employeeAgg[item.employee].leads += item.leads;
    });

    // Cập nhật thẻ KPI
    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    document.getElementById('metric-spend').innerText = fmt(totalSpend);
    document.getElementById('metric-leads').innerText = totalLeads;
    document.getElementById('metric-cpl').innerText = totalLeads > 0 ? fmt(totalSpend/totalLeads) : "0 ₫";

    // Vẽ biểu đồ (Top 10 Nhân viên)
    drawChart(employeeAgg);

    // Vẽ bảng chi tiết
    renderTable(data);
}

function renderTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";

    // Sắp xếp: Tiền tiêu nhiều nhất lên đầu
    data.sort((a,b) => b.spend - a.spend);

    // Chỉ hiện 100 dòng đầu tiên
    data.slice(0, 100).forEach(item => {
        const spendStr = new Intl.NumberFormat('vi-VN').format(item.spend);
        const cpl = item.leads > 0 ? (item.spend / item.leads) : 0;
        const cplStr = new Intl.NumberFormat('vi-VN').format(Math.round(cpl));
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold; color:#1a73e8">${item.employee}</td>
            <td><div style="font-size:11px; color:#444; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${item.campaign}">${item.product}</div></td>
            <td style="font-size:11px; color:#666">${item.run_start}</td>
            <td style="text-align:right; font-weight:600">${spendStr}</td>
            <td style="text-align:center; font-weight:bold; color:#d93025">${item.leads}</td>
            <td style="text-align:right; font-size:11px">${cplStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

function drawChart(aggData) {
    const ctx = document.getElementById('chart-ads-upload');
    if(!ctx) return;
    if(window.myAdsChart) window.myAdsChart.destroy();

    // Chuyển object thành mảng & Sắp xếp top 10
    const sorted = Object.entries(aggData)
        .map(([name, val]) => ({ name, ...val }))
        .sort((a,b) => b.spend - a.spend)
        .slice(0, 10);

    window.myAdsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(i => i.name),
            datasets: [
                { label: 'Ngân sách (VND)', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' },
                { label: 'Leads', data: sorted.map(i => i.leads), backgroundColor: '#1a73e8', yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { position: 'left', title: {display:true, text:'Tiền'} },
                y1: { position: 'right', grid: {display:false}, title: {display:true, text:'Khách'} }
            }
        }
    });
}

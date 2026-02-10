/**
 * ADS MODULE V8 (AUTO UI)
 * - Tự động tạo giao diện Lịch sử Upload (Không cần sửa HTML)
 * - Ghi nhận thời gian upload file chính xác
 * - Lọc và thống kê chi tiết
 */

// 1. CẤU HÌNH FIREBASE
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

// Khởi tạo Firebase
let db;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.database();
    }
} catch (e) { console.error("Firebase Error:", e); }

let GLOBAL_ADS_DATA = [];

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V8 Loaded");
    
    // 1. TỰ ĐỘNG CHÈN BẢNG LỊCH SỬ VÀO GIAO DIỆN (MAGIC CODE)
    injectHistoryTable();

    // 2. Gắn sự kiện Upload
    const input = document.getElementById('ads-file-input');
    if(input && !input.hasAttribute('data-listening')) {
        input.addEventListener('change', handleFirebaseUpload);
        input.setAttribute('data-listening', 'true');
    }

    // 3. Gắn bộ lọc
    document.getElementById('filter-search')?.addEventListener('keyup', applyFilters);
    document.getElementById('filter-start')?.addEventListener('change', applyFilters);
    document.getElementById('filter-end')?.addEventListener('change', applyFilters);

    // 4. Tải dữ liệu
    if(db) {
        loadUploadHistory(); // Tải lịch sử
        loadAdsData();       // Tải dữ liệu
    }
}

// --- HÀM TỰ TẠO GIAO DIỆN (KHÔNG CẦN SỬA HTML) ---
function injectHistoryTable() {
    // Kiểm tra xem đã có bảng chưa, nếu có rồi thì thôi
    if(document.getElementById('upload-history-container')) return;

    const uploadArea = document.querySelector('.upload-area');
    if(!uploadArea) return;

    // Tạo khung HTML cho lịch sử
    const historyDiv = document.createElement('div');
    historyDiv.id = 'upload-history-container';
    historyDiv.style.marginTop = '20px';
    historyDiv.style.background = '#fff';
    historyDiv.style.padding = '15px';
    historyDiv.style.borderRadius = '10px';
    historyDiv.style.border = '1px solid #eee';
    historyDiv.innerHTML = `
        <div style="font-weight:800; color:#333; margin-bottom:10px; display:flex; align-items:center; gap:5px;">
            🕒 LỊCH SỬ UPLOAD FILE (Time thực tế)
        </div>
        <div style="max-height: 200px; overflow-y: auto;">
            <table style="width:100%; font-size:12px; border-collapse: collapse;">
                <thead>
                    <tr style="background:#f1f3f4; color:#555; text-align:left;">
                        <th style="padding:8px;">Thời gian Up</th>
                        <th style="padding:8px;">Tên File</th>
                        <th style="padding:8px; text-align:right;">Tổng Tiền</th>
                    </tr>
                </thead>
                <tbody id="upload-history-body">
                    <tr><td colspan="3" style="text-align:center; padding:10px;">Đang tải...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Chèn xuống dưới nút Upload
    uploadArea.parentNode.insertBefore(historyDiv, uploadArea.nextSibling);
}

// --- XỬ LÝ UPLOAD ---
function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const btnText = document.querySelector('.upload-text');
    if(btnText) btnText.innerText = "⏳ Đang xử lý...";

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header:1});
            
            const result = parseExcelSmart(json);
            
            if(result.data.length > 0) {
                const batchId = Date.now().toString(); 
                
                // 1. Lưu Log Lịch sử (QUAN TRỌNG: Ghi lại thời gian thực lúc upload)
                db.ref('upload_logs/' + batchId).set({
                    timestamp: new Date().toISOString(), // Thời gian thực tế lúc up
                    fileName: file.name,
                    rowCount: result.data.length,
                    totalSpend: result.totalSpend
                });

                // 2. Lưu Dữ liệu chi tiết
                const updates = {};
                result.data.forEach(item => {
                    const newKey = db.ref().child('ads_data').push().key;
                    item.batchId = batchId;
                    updates['/ads_data/' + newKey] = item;
                });
                
                db.ref().update(updates).then(() => {
                    alert(`✅ XONG! Đã lưu ${result.data.length} dòng vào hệ thống.`);
                    if(btnText) btnText.innerText = "Upload File Excel";
                    document.getElementById('ads-file-input').value = ""; // Reset input
                });
            } else {
                alert("File không hợp lệ! Cần cột 'Số tiền đã chi tiêu'.");
                if(btnText) btnText.innerText = "Upload File Excel";
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi: " + err.message);
            if(btnText) btnText.innerText = "Upload File Excel";
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- BÓC TÁCH DỮ LIỆU ---
function parseExcelSmart(rows) {
    if (rows.length < 2) return { data: [], totalSpend: 0 };
    
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    const colStart = header.findIndex(h => h.includes("bắt đầu báo cáo"));
    const colEnd = header.findIndex(h => h.includes("kết thúc báo cáo"));
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    const colSpend = header.findIndex(h => h.includes("số tiền đã chi tiêu") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    
    if (colSpend === -1) return { data: [], totalSpend: 0 };

    let parsedData = [];
    let grandTotal = 0;

    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r || r.length===0) continue;
        
        let spend = parseFloat(r[colSpend]) || 0;
        if(spend <= 0) continue; 

        let leads = parseFloat(r[colResult]) || 0;
        let campaignName = r[colCamp] || "Unknown";

        // Tách Tên NV - Sản phẩm (Ví dụ: "NV A - SP B - ...")
        let parts = campaignName.split('-');
        let employee = parts[0] ? parts[0].trim().toUpperCase() : "KHÁC";
        let product = parts[1] ? parts[1].trim() : "Chung";

        parsedData.push({
            campaign: campaignName,
            employee: employee,
            product: product,
            spend: spend,
            leads: leads,
            run_start: r[colStart] || "",
            run_end: r[colEnd] || ""
        });
        grandTotal += spend;
    }
    return { data: parsedData, totalSpend: grandTotal };
}

// --- HIỂN THỊ LỊCH SỬ UPLOAD ---
function loadUploadHistory() {
    const tbody = document.getElementById('upload-history-body');
    if(!tbody) return;

    db.ref('upload_logs').limitToLast(10).on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { 
            tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:10px'>Chưa có file nào</td></tr>"; 
            return; 
        }
        
        const sorted = Object.values(data).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        let html = "";
        sorted.forEach(log => {
            const d = new Date(log.timestamp);
            // Hiển thị: Ngày/Tháng Giờ:Phút
            const timeStr = `${d.getDate()}/${d.getMonth()+1} <span style="color:#d93025; font-weight:bold">${d.getHours()}:${("0"+d.getMinutes()).slice(-2)}</span>`;
            const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
            
            html += `
                <tr style="border-bottom:1px solid #f0f0f0;">
                    <td style="padding:8px; color:#555">${timeStr}</td>
                    <td style="padding:8px; font-weight:600; color:#1a73e8">${log.fileName}</td>
                    <td style="padding:8px; text-align:right; font-weight:bold">${money}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    });
}

// --- TẢI DỮ LIỆU & LỌC ---
function loadAdsData() {
    db.ref('ads_data').on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { GLOBAL_ADS_DATA = []; return; }
        GLOBAL_ADS_DATA = Object.values(data);
        applyFilters();
    });
}

function applyFilters() {
    const search = document.getElementById('filter-search')?.value.toLowerCase() || "";
    const startStr = document.getElementById('filter-start')?.value;
    const endStr = document.getElementById('filter-end')?.value;

    const filtered = GLOBAL_ADS_DATA.filter(item => {
        // Lọc theo tên NV hoặc SP
        const contentMatch = (item.employee + " " + item.product).toLowerCase().includes(search);
        
        // Lọc theo ngày chạy trong file
        let dateMatch = true;
        if (startStr && item.run_start < startStr) dateMatch = false;
        if (endStr && item.run_end > endStr) dateMatch = false;

        return contentMatch && dateMatch;
    });

    renderDashboard(filtered);
}

function renderDashboard(data) {
    document.getElementById('ads-analysis-result').style.display = 'block';

    let totalSpend = 0, totalLeads = 0;
    let employeeAgg = {};

    data.forEach(item => {
        totalSpend += item.spend;
        totalLeads += item.leads;
        
        // Gộp theo nhân viên
        if(!employeeAgg[item.employee]) employeeAgg[item.employee] = { spend:0, leads:0 };
        employeeAgg[item.employee].spend += item.spend;
        employeeAgg[item.employee].leads += item.leads;
    });

    // Cập nhật số tổng
    const fmt = n => new Intl.NumberFormat('vi-VN').format(n);
    document.getElementById('metric-spend').innerText = fmt(totalSpend) + " ₫";
    document.getElementById('metric-leads').innerText = totalLeads;
    const cpl = totalLeads > 0 ? Math.round(totalSpend/totalLeads) : 0;
    document.getElementById('metric-cpl').innerText = fmt(cpl) + " ₫";

    drawChart(employeeAgg);
    renderMainTable(data);
}

function renderMainTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";
    
    // Sắp xếp: Tiền cao nhất lên đầu
    data.sort((a,b) => b.spend - a.spend);

    data.slice(0, 100).forEach(item => {
        const cpl = item.leads > 0 ? Math.round(item.spend/item.leads) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold; color:#1a73e8">${item.employee}</td>
            <td title="${item.campaign}">${item.product}</td>
            <td style="font-size:11px; color:#666">${item.run_start}</td>
            <td style="text-align:right; font-weight:bold">${item.spend.toLocaleString('vi-VN')}</td>
            <td style="text-align:center; font-weight:bold; color:#d93025">${item.leads}</td>
            <td style="text-align:right; font-size:11px">${cpl.toLocaleString('vi-VN')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function drawChart(aggData) {
    const ctx = document.getElementById('chart-ads-upload');
    if(!ctx) return;
    if(window.myAdsChart) window.myAdsChart.destroy();

    const sorted = Object.entries(aggData)
        .map(([name, val]) => ({ name, ...val }))
        .sort((a,b) => b.spend - a.spend)
        .slice(0, 10);

    window.myAdsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(i => i.name),
            datasets: [
                { label: 'Chi phí', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' },
                { label: 'Leads', data: sorted.map(i => i.leads), backgroundColor: '#1a73e8', yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { position: 'left', title: {display:true, text:'VNĐ'} },
                y1: { position: 'right', grid: {display:false} }
            }
        }
    });
}

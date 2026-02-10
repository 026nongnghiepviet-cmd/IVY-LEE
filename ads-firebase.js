/**
 * ADS MODULE V34 (SMART HEADER FINDER)
 * - Fix Ngày: Dùng thuật toán loại trừ "báo cáo" để tìm đúng cột "Bắt đầu".
 * - Fix Trạng thái: Dựa hoàn toàn vào cột "Kết thúc" (Đang diễn ra = Running).
 * - Giao diện: Font 11px, bỏ cột thừa, sắp xếp gọn gàng.
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

let db;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.database();
    }
} catch (e) { console.error("Firebase Error:", e); }

let GLOBAL_ADS_DATA = [];
let GLOBAL_REVENUE_DATA = {}; 
let GLOBAL_STATEMENT_FEE_PER_ROW = 0;
let ACTIVE_BATCH_ID = null;
let CURRENT_TAB = 'performance';

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V34 Loaded");
    resetInterface();

    const inputAds = document.getElementById('ads-file-input');
    if(inputAds) {
        const newInput = inputAds.cloneNode(true);
        inputAds.parentNode.replaceChild(newInput, inputAds);
        newInput.addEventListener('change', handleFirebaseUpload);
    }

    if(db) {
        loadUploadHistory();
        loadAdsData();
    }
    
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
    window.triggerRevenueUpload = () => document.getElementById('revenue-file-input').click();
    window.triggerStatementUpload = () => document.getElementById('statement-file-input').click();
    window.switchAdsTab = switchAdsTab;
}

// --- GIAO DIỆN COMPACT ---
function resetInterface() {
    const container = document.getElementById('ads-analysis-result');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `
            <style>
                .ads-tabs { display: flex; border-bottom: 2px solid #ddd; margin-bottom: 15px; }
                .ads-tab-btn { padding: 8px 15px; cursor: pointer; font-weight: bold; color: #666; border: none; background: none; border-bottom: 3px solid transparent; transition: all 0.3s; font-size: 12px; }
                .ads-tab-btn:hover { background: #f9f9f9; color: #1a73e8; }
                .ads-tab-btn.active { color: #1a73e8; border-bottom: 3px solid #1a73e8; }
                .ads-tab-content { display: none; animation: fadeIn 0.3s; }
                .ads-tab-content.active { display: block; }
                
                /* BẢNG DỮ LIỆU NHỎ GỌN */
                .ads-table { width: 100%; border-collapse: collapse; background: #fff; font-family: sans-serif; font-size: 11px; }
                .ads-table th, .ads-table td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }
                .ads-table th { background: #f5f5f5; color: #333; text-transform: uppercase; font-weight: bold; white-space: nowrap; }
                .ads-table tr:hover { background-color: #f9f9f9; }
                
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                
                .table-responsive { overflow-x: auto; border: 1px solid #eee; border-radius: 4px; max-height: 500px; }
            </style>

            <div class="ads-tabs">
                <button class="ads-tab-btn active" onclick="switchAdsTab('performance')" id="btn-tab-perf">📊 1. HIỆU QUẢ QUẢNG CÁO</button>
                <button class="ads-tab-btn" onclick="switchAdsTab('finance')" id="btn-tab-fin">💰 2. TÀI CHÍNH & ROAS</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:15px;">
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#d93025; font-size:16px;" id="metric-spend">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">TỔNG CHI (ALL)</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#1a73e8; font-size:16px;" id="metric-leads">0</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">TỔNG LEADS</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#137333; font-size:16px;" id="metric-revenue">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">DOANH THU</p>
                </div>
                 <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#f4b400; font-size:16px;" id="metric-roas">0x</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">ROAS TỔNG</p>
                </div>
            </div>

            <div id="tab-performance" class="ads-tab-content active">
                <div style="height:250px; margin-bottom:15px; background:#fff; padding:10px; border-radius:6px; border:1px solid #eee;">
                    <canvas id="chart-ads-perf"></canvas>
                </div>
                <div class="table-responsive">
                    <table class="ads-table">
                        <thead>
                            <tr>
                                <th class="text-left">Nhân Viên</th>
                                <th class="text-left">Bài Quảng Cáo</th>
                                <th class="text-center">Trạng Thái</th>
                                <th class="text-right">Chi Tiêu FB</th>
                                <th class="text-center">Kết Quả</th>
                                <th class="text-right">Giá / KQ</th>
                                <th class="text-center">Ngày Bắt Đầu</th>
                            </tr>
                        </thead>
                        <tbody id="ads-table-perf"></tbody>
                    </table>
                </div>
            </div>

            <div id="tab-finance" class="ads-tab-content">
                <div style="height:250px; margin-bottom:15px; background:#fff; padding:10px; border-radius:6px; border:1px solid #eee;">
                    <canvas id="chart-ads-fin"></canvas>
                </div>
                <div class="table-responsive">
                    <table class="ads-table">
                        <thead>
                            <tr style="background:#e8f0fe;">
                                <th class="text-left">Nhân Viên</th>
                                <th class="text-left">Bài Quảng Cáo</th>
                                <th class="text-right">Chi Tiêu FB<br><span style="font-size:9px; color:#666">(Gốc)</span></th>
                                <th class="text-right" style="color:#d93025;">VAT (10%)</th>
                                <th class="text-right" style="color:#e67c73;">Phí Sao Kê</th>
                                <th class="text-right" style="font-weight:800;">TỔNG CHI</th>
                                <th class="text-right" style="color:#137333;">Doanh Thu</th>
                                <th class="text-center">ROAS</th>
                            </tr>
                        </thead>
                        <tbody id="ads-table-fin"></tbody>
                    </table>
                </div>
            </div>
        `;
    }

    const uploadArea = document.querySelector('.upload-area');
    if(uploadArea) {
        const oldContainer = document.getElementById('upload-controls-container');
        if(oldContainer) oldContainer.remove();

        const controlsDiv = document.createElement('div');
        controlsDiv.id = 'upload-controls-container';
        
        controlsDiv.innerHTML = `
            <div style="display:flex; gap:10px; margin-top:10px;">
                <div onclick="window.triggerRevenueUpload()" style="flex:1; padding:8px; border:1px dashed #137333; border-radius:6px; background:#e6f4ea; text-align:center; cursor:pointer;">
                    <span style="font-size:14px;">💰</span> <span style="font-weight:bold; color:#137333; font-size:11px;">Up Doanh Thu</span>
                    <input type="file" id="revenue-file-input" style="display:none" accept=".csv, .xlsx, .xls" onchange="handleRevenueUpload(this)">
                </div>
                <div onclick="window.triggerStatementUpload()" style="flex:1; padding:8px; border:1px dashed #d93025; border-radius:6px; background:#fce8e6; text-align:center; cursor:pointer;">
                    <span style="font-size:14px;">💸</span> <span style="font-weight:bold; color:#d93025; font-size:11px;">Up Sao Kê</span>
                    <input type="file" id="statement-file-input" style="display:none" accept=".csv, .xlsx, .xls" onchange="handleStatementUpload(this)">
                </div>
            </div>

            <div id="upload-history-container" style="margin-top:15px; background:#fff; padding:10px; border-radius:8px; border:1px solid #eee;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:800; color:#333; font-size:11px;">📂 LỊCH SỬ</div>
                    <button onclick="viewAllData()" style="background:#1a73e8; color:white; border:none; padding:2px 6px; border-radius:4px; cursor:pointer; font-size:10px; font-weight:bold;">Tất Cả</button>
                </div>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width:100%; font-size:10px; border-collapse: collapse;">
                        <tbody id="upload-history-body"></tbody>
                    </table>
                </div>
            </div>
        `;
        uploadArea.parentNode.insertBefore(controlsDiv, uploadArea.nextSibling);
    }
}

function switchAdsTab(tabName) {
    CURRENT_TAB = tabName;
    document.getElementById('btn-tab-perf').classList.remove('active');
    document.getElementById('btn-tab-fin').classList.remove('active');
    if(tabName === 'performance') document.getElementById('btn-tab-perf').classList.add('active');
    else document.getElementById('btn-tab-fin').classList.add('active');

    document.getElementById('tab-performance').classList.remove('active');
    document.getElementById('tab-finance').classList.remove('active');
    document.getElementById('tab-' + tabName).classList.add('active');
    applyFilters();
}

// --- LOGIC PHÂN TÍCH THÔNG MINH (V34) ---
function parseDataCore(rows) {
    if (rows.length < 2) return [];
    
    let headerIndex = -1;
    let colNameIdx = -1, colSpendIdx = -1, colResultIdx = -1;
    let colStartIdx = -1, colEndIdx = -1;

    // 1. Quét tìm Header chuẩn
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!row) continue;
        const rowStr = row.map(c => c ? c.toString().toLowerCase().trim() : "").join("|");
        
        // Tìm dòng có chứa "tên nhóm" và "số tiền"
        if (rowStr.includes("tên nhóm") && (rowStr.includes("số tiền") || rowStr.includes("amount"))) {
            headerIndex = i;
            row.forEach((cell, idx) => {
                if(!cell) return;
                const txt = cell.toString().toLowerCase().trim();
                
                if (txt.includes("tên nhóm")) colNameIdx = idx;
                if (txt.includes("số tiền đã chi") || txt.includes("amount spent")) colSpendIdx = idx;
                if (txt === "kết quả" || txt === "results") colResultIdx = idx;
                
                // --- THUẬT TOÁN TÌM CỘT NGÀY THÔNG MINH ---
                // Chỉ lấy cột có chữ "bắt đầu" NHƯNG KHÔNG CÓ chữ "báo cáo" -> Tránh cột đầu tiên
                if (txt.includes("bắt đầu") && !txt.includes("báo cáo")) colStartIdx = idx;
                if (txt.includes("kết thúc") && !txt.includes("báo cáo")) colEndIdx = idx;
            });
            break;
        }
    }

    if (headerIndex === -1 || colNameIdx === -1 || colSpendIdx === -1) return [];

    let parsedData = [];

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const rawName = row[colNameIdx];
        if (!rawName) continue;

        let spend = parseCleanNumber(row[colSpendIdx]);
        if (spend <= 0) continue;

        let result = parseCleanNumber(row[colResultIdx]);
        
        // Lấy ngày tháng
        let rawStart = (colStartIdx > -1 && row[colStartIdx]) ? row[colStartIdx] : "";
        let rawEnd = (colEndIdx > -1 && row[colEndIdx]) ? row[colEndIdx] : "";
        
        let displayStart = formatExcelDate(rawStart);

        // --- LOGIC TRẠNG THÁI ---
        let status = "Đã tắt"; // Mặc định
        let endStr = rawEnd ? rawEnd.toString().trim().toLowerCase() : "";
        
        // Nếu cột kết thúc có chữ "đang diễn ra" -> Đang chạy
        if (endStr.includes("đang diễn ra") || endStr.includes("ongoing")) {
            status = "Đang chạy";
        }

        let nameParts = rawName.toString().split(" - ");
        let employee = nameParts[0] ? nameParts[0].trim().toUpperCase() : "KHÁC";
        let adName = nameParts.slice(1).join(" - ").trim();
        if (!adName) adName = "Chung";

        parsedData.push({
            fullName: rawName.toString().trim(),
            employee: employee,
            adName: adName,
            spend: spend,
            result: result,
            run_start: displayStart,
            status: status
        });
    }
    return parsedData;
}

// Hàm format ngày chuẩn (DD-MM-YYYY)
function formatExcelDate(input) {
    if (!input) return "-";
    // 1. Số Excel
    if (typeof input === 'number') {
        const date = new Date((input - 25569) * 86400 * 1000);
        return formatDateObj(date);
    }
    // 2. Chuỗi YYYY-MM-DD
    const str = input.toString().trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = str.split('-');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return str;
}

function formatDateObj(d) {
    if (isNaN(d.getTime())) return "-";
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

// --- RENDER DỮ LIỆU ---
function loadAdsData() {
    db.ref('ads_data').on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { GLOBAL_ADS_DATA = []; applyFilters(); return; }
        GLOBAL_ADS_DATA = Object.values(data);
        applyFilters();
    });
}

function applyFilters() {
    let filtered = GLOBAL_ADS_DATA;
    if(ACTIVE_BATCH_ID) filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID);
    
    filtered.sort((a,b) => {
        const nameA = a.employee.toLowerCase();
        const nameB = b.employee.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return b.spend - a.spend;
    });

    let totalSpendAll = 0, totalLeads = 0, totalRevenue = 0;

    filtered.forEach(item => {
        const vat = item.spend * 0.1;
        const fee = GLOBAL_STATEMENT_FEE_PER_ROW;
        const total = item.spend + vat + fee;
        totalSpendAll += total;
        totalLeads += item.result;
        totalRevenue += (GLOBAL_REVENUE_DATA[item.fullName] || 0);
    });

    document.getElementById('metric-spend').innerText = new Intl.NumberFormat('vi-VN').format(totalSpendAll) + " ₫";
    document.getElementById('metric-leads').innerText = totalLeads;
    document.getElementById('metric-revenue').innerText = new Intl.NumberFormat('vi-VN').format(totalRevenue) + " ₫";
    const roas = totalSpendAll > 0 ? (totalRevenue / totalSpendAll) : 0;
    document.getElementById('metric-roas').innerText = roas.toFixed(2) + "x";

    renderPerformanceTable(filtered);
    renderFinanceTable(filtered);
    
    if(CURRENT_TAB === 'performance') drawChartPerf(filtered);
    else drawChartFin(filtered);
}

// --- BẢNG HIỆU QUẢ ---
function renderPerformanceTable(data) {
    const tbody = document.getElementById('ads-table-perf');
    if(!tbody) return;
    tbody.innerHTML = "";
    
    data.slice(0, 300).forEach(item => {
        const cpl = item.result > 0 ? Math.round(item.spend/item.result) : 0;
        const statusColor = item.status === 'Đang chạy' ? '#0f9d58' : '#999';
        const statusIcon = item.status === 'Đang chạy' ? '● Đang chạy' : 'Đã tắt';
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #f0f0f0";
        tr.innerHTML = `
            <td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td>
            <td class="text-left" style="color:#333;">${item.adName}</td>
            <td class="text-center" style="color:${statusColor}; font-weight:bold; font-size:10px;">${statusIcon}</td>
            <td class="text-right" style="font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>
            <td class="text-center" style="font-weight:bold;">${item.result}</td>
            <td class="text-right" style="color:#666;">${new Intl.NumberFormat('vi-VN').format(cpl)}</td>
            <td class="text-center" style="font-size:10px; color:#555;">${item.run_start}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderFinanceTable(data) {
    const tbody = document.getElementById('ads-table-fin');
    if(!tbody) return;
    tbody.innerHTML = "";
    data.slice(0, 300).forEach(item => {
        const vat = item.spend * 0.1;
        const fee = GLOBAL_STATEMENT_FEE_PER_ROW;
        const total = item.spend + vat + fee;
        const rev = GLOBAL_REVENUE_DATA[item.fullName] || 0;
        const roas = total > 0 ? (rev / total) : 0;

        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #f0f0f0";
        tr.innerHTML = `
            <td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td>
            <td class="text-left" style="color:#333;">${item.adName}</td>
            <td class="text-right">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>
            <td class="text-right" style="color:#d93025;">${new Intl.NumberFormat('vi-VN').format(vat)}</td>
            <td class="text-right" style="color:#e67c73;">${fee > 0 ? new Intl.NumberFormat('vi-VN').format(fee) : '-'}</td>
            <td class="text-right" style="font-weight:800; color:#333;">${new Intl.NumberFormat('vi-VN').format(Math.round(total))}</td>
            <td class="text-right" style="font-weight:bold; color:#137333;">${rev > 0 ? new Intl.NumberFormat('vi-VN').format(rev) : '-'}</td>
            <td class="text-center" style="font-weight:bold; color:${roas>0?'#f4b400':'#999'}">${roas>0?roas.toFixed(2)+'x':'-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const btnText = document.querySelector('.upload-text');
    if(btnText) btnText.innerText = "⏳ Đang phân tích...";
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); 
            const result = parseDataCore(json);
            if (result.length > 0) {
                const batchId = Date.now().toString();
                const totalSpend = result.reduce((sum, i) => sum + i.spend, 0);
                db.ref('upload_logs/' + batchId).set({timestamp: new Date().toISOString(), fileName: file.name, rowCount: result.length, totalSpend: totalSpend});
                const updates = {};
                result.forEach(item => { const newKey = db.ref().child('ads_data').push().key; item.batchId = batchId; updates['/ads_data/' + newKey] = item; });
                db.ref().update(updates).then(() => {
                    alert(`✅ Đã lưu ${result.length} dòng.`);
                    if(btnText) btnText.innerText = "Upload Excel";
                    document.getElementById('ads-file-input').value = "";
                    ACTIVE_BATCH_ID = batchId;
                    GLOBAL_STATEMENT_FEE_PER_ROW = 0; 
                    applyFilters();
                });
            } else { alert("❌ Lỗi: Không tìm thấy cột 'Tên nhóm quảng cáo' hoặc 'Số tiền đã chi tiêu'!"); if(btnText) btnText.innerText = "Upload Excel"; }
        } catch (err) { alert("Lỗi hệ thống: " + err.message); if(btnText) btnText.innerText = "Upload Excel"; }
    };
    reader.readAsArrayBuffer(file);
}

// ... (Các hàm khác giữ nguyên: drawChartPerf, drawChartFin, parseCleanNumber, deleteUploadBatch, selectUploadBatch, viewAllData, handleRevenueUpload, handleStatementUpload, loadUploadHistory)
function handleRevenueUpload(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1});
            let headerIdx = -1, colNameIdx = -1, colRevIdx = -1;
            for(let i=0; i<Math.min(json.length, 10); i++) {
                const row = json[i];
                if(!row) continue;
                const rowStr = row.map(c=>c?c.toString().toLowerCase():"").join("|");
                if(rowStr.includes("tên nhóm") || rowStr.includes("tên chiến dịch")) {
                    headerIdx = i;
                    row.forEach((cell, idx) => {
                        if(!cell) return;
                        const txt = cell.toString().toLowerCase().trim();
                        if(txt.includes("tên nhóm") || txt.includes("tên chiến dịch")) colNameIdx = idx;
                        if(txt.includes("doanh thu") || txt.includes("thành tiền")) colRevIdx = idx;
                    });
                    break;
                }
            }
            if(colNameIdx === -1 || colRevIdx === -1) { alert("❌ Lỗi: File cần có cột 'Tên nhóm quảng cáo' và 'Doanh thu'!"); return; }
            GLOBAL_REVENUE_DATA = {};
            let count = 0;
            for(let i=headerIdx+1; i<json.length; i++) {
                const r = json[i];
                if(!r || !r[colNameIdx]) continue;
                const name = r[colNameIdx].toString().trim();
                let rev = parseCleanNumber(r[colRevIdx]);
                if(rev > 0) { GLOBAL_REVENUE_DATA[name] = rev; count++; }
            }
            alert(`✅ Đã nhập Doanh thu cho ${count} mục.`);
            switchAdsTab('finance');
            applyFilters();
        } catch(err) { alert("Lỗi file Doanh thu: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
    input.value = "";
}

function handleStatementUpload(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1});
            let headerIdx = -1, colAmountIdx = -1;
            for(let i=0; i<Math.min(json.length, 10); i++) {
                const row = json[i];
                if(!row) continue;
                row.forEach((cell, idx) => {
                    if(!cell) return;
                    const txt = cell.toString().toLowerCase().trim();
                    if(txt === "số tiền" || txt === "amount" || txt === "số tiền giao dịch" || txt === "nợ" || txt === "debit") { headerIdx = i; colAmountIdx = idx; }
                });
                if(colAmountIdx !== -1) break;
            }
            if(colAmountIdx === -1) { alert("❌ Lỗi: Không tìm thấy cột 'Số tiền' trong file sao kê!"); return; }
            let totalStatement = 0;
            for(let i=headerIdx+1; i<json.length; i++) {
                const r = json[i];
                if(!r) continue;
                let amt = parseCleanNumber(r[colAmountIdx]);
                if(amt > 0) totalStatement += amt;
            }
            let targetRowCount = ACTIVE_BATCH_ID ? GLOBAL_ADS_DATA.filter(item => item.batchId === ACTIVE_BATCH_ID).length : GLOBAL_ADS_DATA.length;
            if (targetRowCount > 0) {
                GLOBAL_STATEMENT_FEE_PER_ROW = totalStatement / targetRowCount;
                alert(`✅ Tổng tiền sao kê: ${new Intl.NumberFormat().format(totalStatement)}đ\nChia đều cho ${targetRowCount} bài = ${new Intl.NumberFormat().format(Math.round(GLOBAL_STATEMENT_FEE_PER_ROW))}đ/bài.`);
                switchAdsTab('finance');
                applyFilters();
            } else { alert("⚠️ Vui lòng Up file Ads trước."); }
        } catch(err) { alert("Lỗi file Sao kê: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
    input.value = "";
}

function drawChartPerf(data) {
    const ctx = document.getElementById('chart-ads-perf');
    if(!ctx) return;
    if(window.myAdsChart) window.myAdsChart.destroy();
    let agg = {};
    data.forEach(item => {
        if(!agg[item.employee]) agg[item.employee] = { spend: 0, result: 0 };
        agg[item.employee].spend += item.spend;
        agg[item.employee].result += item.result;
    });
    const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.spend - a.spend).slice(0, 10);
    window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Chi Tiêu (FB)', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' }, { label: 'Kết Quả', data: sorted.map(i => i.result), backgroundColor: '#1a73e8', yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false, position: 'left' }, y1: { display: false, position: 'right' } } } });
}

function drawChartFin(data) {
    const ctx = document.getElementById('chart-ads-fin');
    if(!ctx) return;
    if(window.myAdsChart) window.myAdsChart.destroy();
    let agg = {};
    data.forEach(item => {
        if(!agg[item.employee]) agg[item.employee] = { cost: 0, rev: 0 };
        agg[item.employee].cost += (item.spend * 1.1) + GLOBAL_STATEMENT_FEE_PER_ROW;
        agg[item.employee].rev += (GLOBAL_REVENUE_DATA[item.fullName] || 0);
    });
    const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.cost - a.cost).slice(0, 10);
    window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Tổng Chi Phí (All)', data: sorted.map(i => i.cost), backgroundColor: '#d93025' }, { label: 'Doanh Thu', data: sorted.map(i => i.rev), backgroundColor: '#137333' }] }, options: { responsive: true, maintainAspectRatio: false } });
}

function parseCleanNumber(val) { if (!val) return 0; if (typeof val === 'number') return val; let s = val.toString().trim().replace(/,/g, ''); return parseFloat(s) || 0; }
function deleteUploadBatch(id, name) { if(!confirm("Xóa file: " + name + "?")) return; db.ref('ads_data').orderByChild('batchId').equalTo(id).once('value', s => { const u = {}; u['/upload_logs/' + id] = null; if(s.exists()) s.forEach(c => u['/ads_data/' + c.key] = null); db.ref().update(u).then(() => { GLOBAL_ADS_DATA = GLOBAL_ADS_DATA.filter(item => item.batchId !== id); if(ACTIVE_BATCH_ID === id) ACTIVE_BATCH_ID = null; applyFilters(); }); }); }
function selectUploadBatch(id) { ACTIVE_BATCH_ID = id; updateHistoryHighlight(); applyFilters(); }
function viewAllData() { ACTIVE_BATCH_ID = null; updateHistoryHighlight(); applyFilters(); }
function updateHistoryHighlight() { document.querySelectorAll('.history-row').forEach(row => { row.style.background = (ACTIVE_BATCH_ID && row.dataset.id === ACTIVE_BATCH_ID) ? '#e8f0fe' : 'transparent'; }); }
function loadUploadHistory() { const tbody = document.getElementById('upload-history-body'); if(!tbody) return; db.ref('upload_logs').limitToLast(20).on('value', snapshot => { const data = snapshot.val(); if(!data) { tbody.innerHTML = ""; return; } const sorted = Object.entries(data).sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp)); let html = ""; sorted.forEach(([key, log]) => { const timeStr = new Date(log.timestamp).toLocaleDateString('vi-VN'); const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend); html += `<tr class="history-row" data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer;" onclick="selectUploadBatch('${key}')"><td style="padding:8px; font-size:10px;">${timeStr}</td><td style="padding:8px; font-weight:600; color:#1a73e8; max-width:100px; overflow:hidden;">${log.fileName}</td><td style="padding:8px; text-align:right; font-size:10px;">${money}</td><td style="padding:8px; text-align:center;"><span onclick="event.stopPropagation(); deleteUploadBatch('${key}', '${log.fileName}')" style="color:red; font-weight:bold;">✖</span></td></tr>`; }); tbody.innerHTML = html; updateHistoryHighlight(); }); }

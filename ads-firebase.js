/**
 * ADS MODULE V44 (UI POLISHING)
 * - Toast Notification: Chuyển lên góc phải trên, thiết kế dạng thẻ sang trọng.
 * - Search Box: Mở rộng kích thước gấp 3 lần.
 * - Logic Core: Giữ nguyên tính năng V43 (Đa công ty, An toàn, Lưu trữ).
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

// --- DANH SÁCH CÔNG TY ---
const COMPANIES = [
    { id: 'NNV', name: 'Nông Nghiệp Việt', keywords: ['nông nghiệp việt', 'nong nghiep viet', 'nnv'] },
    { id: 'VN', name: 'Việt Nhật', keywords: ['việt nhật', 'viet nhat', 'hóa nông việt nhật'] },
    { id: 'KF', name: 'King Farm', keywords: ['king farm', 'kingfarm', 'kf'] },
    { id: 'ABC', name: 'ABC Việt Nam', keywords: ['abc', 'abc việt nam'] }
];

let GLOBAL_ADS_DATA = [];
let GLOBAL_HISTORY_LIST = [];
let SHOW_ALL_HISTORY = false;
let HISTORY_SEARCH_TERM = "";

let ACTIVE_BATCH_ID = null;
let CURRENT_TAB = 'performance';
let CURRENT_COMPANY = 'NNV'; 

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V44 Loaded");
    
    injectCustomStyles();
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
    
    // Expose Functions
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
    window.triggerRevenueUpload = () => {
        if(!ACTIVE_BATCH_ID) { showToast("⚠️ Vui lòng chọn File Ads trước!", "warning"); return; }
        document.getElementById('revenue-file-input').click();
    };
    window.triggerStatementUpload = () => {
        if(!ACTIVE_BATCH_ID) { showToast("⚠️ Vui lòng chọn File Ads trước!", "warning"); return; }
        document.getElementById('statement-file-input').click();
    };
    window.switchAdsTab = switchAdsTab;
    window.changeCompany = changeCompany;
    window.toggleHistoryView = toggleHistoryView;
    window.searchHistory = searchHistory;
}

// --- CSS & NOTIFICATION SYSTEM (ĐÃ CHỈNH SỬA ĐẸP HƠN) ---
function injectCustomStyles() {
    const styleId = 'ads-custom-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* TOAST NOTIFICATION - GÓC TRÊN PHẢI */
        #toast-container { 
            position: fixed; 
            top: 80px; /* Tránh header nếu có */
            right: 20px; 
            z-index: 99999; 
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .custom-toast {
            min-width: 300px;
            padding: 16px 20px;
            background: #fff;
            color: #333;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            font-family: 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            border-left: 6px solid #ccc;
            animation: slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s;
        }

        .toast-success { border-left-color: #0f9d58; }
        .toast-success span::before { content: '✅ '; margin-right: 8px; font-size: 16px; }

        .toast-error { border-left-color: #d93025; }
        .toast-error span::before { content: '❌ '; margin-right: 8px; font-size: 16px; }

        .toast-warning { border-left-color: #f4b400; }
        .toast-warning span::before { content: '⚠️ '; margin-right: 8px; font-size: 16px; }
        
        @keyframes slideInRight { to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeOutUp { to { opacity: 0; transform: translateY(-20px); } }

        /* SEARCH BAR HISTORY - RỘNG GẤP 3 */
        .history-search-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            flex: 1; /* Chiếm hết chỗ trống */
            margin: 0 15px;
        }
        .history-search-box {
            width: 100%;
            max-width: 400px; /* Rộng tối đa 400px */
            padding: 8px 15px 8px 35px; /* Padding trái cho icon */
            border: 1px solid #e0e0e0;
            border-radius: 20px;
            font-size: 13px;
            background: #f8f9fa;
            outline: none;
            transition: all 0.3s ease;
        }
        .history-search-box:focus {
            background: #fff;
            border-color: #1a73e8;
            box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
        }
        .search-icon {
            position: absolute;
            left: 12px;
            color: #999;
            font-size: 14px;
        }

        /* VIEW MORE BUTTON */
        .view-more-btn {
            display: block; width: 100%; padding: 10px; text-align: center; color: #5f6368; font-weight: 600; font-size: 12px;
            cursor: pointer; border-top: 1px solid #f1f3f4; background: #fff; margin-top: 0; border-radius: 0 0 8px 8px; transition: 0.2s;
        }
        .view-more-btn:hover { background: #f8f9fa; color: #1a73e8; }
    `;
    document.head.appendChild(style);

    if (!document.getElementById('toast-container')) {
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    // Thêm nút đóng
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = "margin-left:auto; cursor:pointer; font-size:20px; color:#999;";
    closeBtn.onclick = () => { toast.remove(); };
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOutUp 0.5s ease-out forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- GIAO DIỆN CHÍNH ---
function resetInterface() {
    const container = document.getElementById('ads-analysis-result');
    if (container) {
        container.style.display = 'block';
        
        let optionsHtml = COMPANIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        container.innerHTML = `
            <style>
                .company-select-container { background: #e8f0fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #1a73e8; display: flex; align-items: center; justify-content: space-between; }
                .company-select { padding: 8px 12px; font-size: 16px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold; color: #1a73e8; min-width: 200px; }
                .ads-tabs { display: flex; border-bottom: 2px solid #ddd; margin-bottom: 15px; }
                .ads-tab-btn { padding: 8px 15px; cursor: pointer; font-weight: bold; color: #666; border: none; background: none; border-bottom: 3px solid transparent; transition: all 0.3s; font-size: 12px; }
                .ads-tab-btn:hover { background: #f9f9f9; color: #1a73e8; }
                .ads-tab-btn.active { color: #1a73e8; border-bottom: 3px solid #1a73e8; }
                .ads-tab-content { display: none; animation: fadeIn 0.3s; }
                .ads-tab-content.active { display: block; }
                .ads-table { width: 100%; border-collapse: collapse; background: #fff; font-family: sans-serif; font-size: 11px; }
                .ads-table th, .ads-table td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }
                .ads-table th { background: #f5f5f5; color: #333; text-transform: uppercase; font-weight: bold; white-space: nowrap; }
                .text-left { text-align: left; } .text-right { text-align: right; } .text-center { text-align: center; }
                .table-responsive { overflow-x: auto; border: 1px solid #eee; border-radius: 4px; max-height: 500px; }
            </style>

            <div class="company-select-container">
                <div>
                    <span style="font-weight:bold; margin-right: 10px; color:#333;">🏢 ĐANG LÀM VIỆC VỚI:</span>
                    <select id="company-selector" class="company-select" onchange="changeCompany(this.value)">
                        ${optionsHtml}
                    </select>
                </div>
            </div>

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
        document.getElementById('company-selector').value = CURRENT_COMPANY;
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
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid #eee;">
                    <span style="font-weight:800; color:#333; font-size:11px; white-space:nowrap;">📂 LỊCH SỬ</span>
                    
                    <div class="history-search-wrapper">
                        <span class="search-icon">🔍</span>
                        <input type="text" placeholder="Tìm kiếm file..." class="history-search-box" onkeyup="searchHistory(this.value)">
                    </div>

                    <button onclick="viewAllData()" style="background:#1a73e8; color:white; border:none; padding:4px 10px; border-radius:20px; cursor:pointer; font-size:10px; font-weight:bold; white-space:nowrap;">Xem tất cả</button>
                </div>
                
                <div style="max-height: 250px; overflow-y: hidden;">
                    <table style="width:100%; font-size:10px; border-collapse: collapse;">
                        <tbody id="upload-history-body"></tbody>
                    </table>
                </div>
                
                <div id="history-view-more" class="view-more-btn" onclick="toggleHistoryView()">Xem tất cả file ⬇</div>
            </div>
        `;
        uploadArea.parentNode.insertBefore(controlsDiv, uploadArea.nextSibling);
    }
}

// ... (Các hàm Logic giữ nguyên V43)
function loadUploadHistory() {
    db.ref('upload_logs').orderByChild('company').equalTo(CURRENT_COMPANY).on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { 
            GLOBAL_HISTORY_LIST = [];
        } else {
            GLOBAL_HISTORY_LIST = Object.entries(data)
                .filter(([key, log]) => !log.company || log.company === CURRENT_COMPANY)
                .sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
        }
        renderHistoryUI();
    });
}

function searchHistory(val) {
    HISTORY_SEARCH_TERM = val.toLowerCase();
    renderHistoryUI();
}

function toggleHistoryView() {
    SHOW_ALL_HISTORY = !SHOW_ALL_HISTORY;
    renderHistoryUI();
}

function renderHistoryUI() {
    const tbody = document.getElementById('upload-history-body');
    const btnMore = document.getElementById('history-view-more');
    if(!tbody) return;

    let filtered = GLOBAL_HISTORY_LIST;
    if(HISTORY_SEARCH_TERM) {
        filtered = filtered.filter(([key, log]) => log.fileName.toLowerCase().includes(HISTORY_SEARCH_TERM));
    }

    if(filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center' style='padding:10px;'>Không tìm thấy file</td></tr>";
        if(btnMore) btnMore.style.display = 'none';
        return;
    }

    let displayList = filtered;
    if (!HISTORY_SEARCH_TERM && !SHOW_ALL_HISTORY) {
        displayList = filtered.slice(0, 5);
    }

    let html = "";
    displayList.forEach(([key, log]) => {
        const timeStr = new Date(log.timestamp).toLocaleDateString('vi-VN');
        const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
        const isActive = (key === ACTIVE_BATCH_ID) ? 'background:#e8f0fe; font-weight:bold;' : '';
        
        html += `
            <tr data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer; ${isActive}" onclick="selectUploadBatch('${key}')">
                <td style="padding:8px; font-size:10px;">${timeStr}</td>
                <td style="padding:8px; font-weight:600; color:#1a73e8; max-width:150px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${log.fileName}</td>
                <td style="padding:8px; text-align:right; font-size:10px;">${money}</td>
                <td style="padding:8px; text-align:center;">
                    <span style="color:#d93025; font-weight:bold; padding:0 5px;" onclick="deleteUploadBatch('${key}', '${log.fileName}')">✖</span>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    if(btnMore) {
        if(HISTORY_SEARCH_TERM || filtered.length <= 5) {
            btnMore.style.display = 'none';
        } else {
            btnMore.style.display = 'block';
            btnMore.innerText = SHOW_ALL_HISTORY ? "Thu gọn ⬆" : `Xem tất cả (${filtered.length} file) ⬇`;
        }
    }
}

// ... (Logic chuyển công ty - không alert)
function changeCompany(companyId) {
    CURRENT_COMPANY = companyId;
    ACTIVE_BATCH_ID = null; 
    loadUploadHistory();
    applyFilters();
    showToast(`Đã chuyển sang: ${COMPANIES.find(c=>c.id===companyId).name}`, 'success');
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

function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;

    const fileNameNorm = file.name.toLowerCase().replace(/[-_]/g, ' ');
    const currentCompInfo = COMPANIES.find(c => c.id === CURRENT_COMPANY);
    const conflictComp = COMPANIES.find(c => c.id !== CURRENT_COMPANY && c.keywords.some(kw => fileNameNorm.includes(kw)));

    if (conflictComp) {
        showToast(`❌ Cảnh báo: File này có thể của "${conflictComp.name}"!`, 'error');
        e.target.value = "";
        return;
    }

    const btnText = document.querySelector('.upload-text');
    if(btnText) btnText.innerText = "⏳ Đang xử lý...";

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

                db.ref('upload_logs/' + batchId).set({
                    timestamp: new Date().toISOString(),
                    fileName: file.name,
                    rowCount: result.length,
                    totalSpend: totalSpend,
                    company: CURRENT_COMPANY
                });

                const updates = {};
                result.forEach(item => {
                    const newKey = db.ref().child('ads_data').push().key;
                    item.batchId = batchId;
                    item.company = CURRENT_COMPANY;
                    item.revenue = 0; 
                    item.fee = 0;     
                    updates['/ads_data/' + newKey] = item;
                });

                db.ref().update(updates).then(() => {
                    showToast(`✅ Đã lưu ${result.length} dòng.`, 'success');
                    if(btnText) btnText.innerText = "Upload Excel";
                    document.getElementById('ads-file-input').value = "";
                    ACTIVE_BATCH_ID = batchId;
                    applyFilters();
                });
            } else { 
                showToast("❌ File không đúng định dạng!", 'error'); 
                if(btnText) btnText.innerText = "Upload Excel"; 
            }
        } catch (err) { 
            showToast("Lỗi: " + err.message, 'error'); 
            if(btnText) btnText.innerText = "Upload Excel"; 
        }
    };
    reader.readAsArrayBuffer(file);
}

// ... (Giữ nguyên handleRevenueUpload, handleStatementUpload)
function handleRevenueUpload(input) {
    if(!ACTIVE_BATCH_ID) { showToast("⚠️ Chọn file Ads trước!", 'warning'); return; }
    const file = input.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); let headerIdx = -1, colNameIdx = -1, colRevIdx = -1; for(let i=0; i<Math.min(json.length, 10); i++) { const row = json[i]; if(!row) continue; const rowStr = row.map(c=>c?c.toString().toLowerCase():"").join("|"); if(rowStr.includes("tên nhóm") || rowStr.includes("tên chiến dịch")) { headerIdx = i; row.forEach((cell, idx) => { if(!cell) return; const txt = cell.toString().toLowerCase().trim(); if(txt.includes("tên nhóm") || txt.includes("tên chiến dịch")) colNameIdx = idx; if(txt.includes("doanh thu") || txt.includes("thành tiền")) colRevIdx = idx; }); break; } } if(colNameIdx === -1 || colRevIdx === -1) { showToast("❌ Thiếu cột bắt buộc", 'error'); return; } let revenueMap = {}; for(let i=headerIdx+1; i<json.length; i++) { const r = json[i]; if(!r || !r[colNameIdx]) continue; const name = r[colNameIdx].toString().trim(); let rev = parseCleanNumber(r[colRevIdx]); if(rev > 0) revenueMap[name] = rev; } let updateCount = 0; const updates = {}; db.ref('ads_data').orderByChild('batchId').equalTo(ACTIVE_BATCH_ID).once('value', snapshot => { if(!snapshot.exists()) { showToast("Lỗi dữ liệu", 'error'); return; } snapshot.forEach(child => { const item = child.val(); const key = child.key; if (revenueMap[item.fullName]) { updates['/ads_data/' + key + '/revenue'] = revenueMap[item.fullName]; updateCount++; } }); if (updateCount > 0) { db.ref().update(updates).then(() => { showToast(`✅ Cập nhật doanh thu: ${updateCount} bài`, 'success'); switchAdsTab('finance'); }); } else { showToast("⚠️ Không khớp bài nào", 'warning'); } }); } catch(err) { showToast(err.message, 'error'); } }; reader.readAsArrayBuffer(file); input.value = "";
}
function handleStatementUpload(input) {
    if(!ACTIVE_BATCH_ID) { showToast("⚠️ Chọn file Ads trước!", 'warning'); return; }
    const file = input.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); let headerIdx = -1, colAmountIdx = -1; for(let i=0; i<Math.min(json.length, 10); i++) { const row = json[i]; if(!row) continue; row.forEach((cell, idx) => { if(!cell) return; const txt = cell.toString().toLowerCase().trim(); if(txt.includes("nợ") || txt.includes("debit")) { headerIdx = i; colAmountIdx = idx; } }); if(colAmountIdx !== -1) break; } if(colAmountIdx === -1) { showToast("❌ Không thấy cột Nợ/Debit", 'error'); return; } let totalStatement = 0; for(let i=headerIdx+1; i<json.length; i++) { const r = json[i]; if(!r) continue; let amt = parseCleanNumber(r[colAmountIdx]); if(amt > 0) totalStatement += amt; } db.ref('ads_data').orderByChild('batchId').equalTo(ACTIVE_BATCH_ID).once('value', snapshot => { if(!snapshot.exists()) return; let totalAdsVAT = 0; let count = 0; snapshot.forEach(child => { const item = child.val(); totalAdsVAT += (item.spend * 1.1); count++; }); const totalDiff = totalStatement - totalAdsVAT; const feePerRow = totalDiff / count; const updates = {}; snapshot.forEach(child => { updates['/ads_data/' + child.key + '/fee'] = feePerRow; }); db.ref().update(updates).then(() => { showToast(`✅ Đã phân bổ phí chênh lệch`, 'success'); switchAdsTab('finance'); }); }); } catch(err) { showToast(err.message, 'error'); } }; reader.readAsArrayBuffer(file); input.value = "";
}
function deleteUploadBatch(batchId, fileName) {
    if (event) event.stopPropagation();
    if(!confirm(`Xóa file: "${fileName}"?`)) return;
    if (ACTIVE_BATCH_ID === batchId) {
        ACTIVE_BATCH_ID = null;
        document.getElementById('ads-table-perf').innerHTML = "";
        document.getElementById('ads-table-fin').innerHTML = "";
    }
    const updates = {};
    updates['/upload_logs/' + batchId] = null;
    db.ref('ads_data').orderByChild('batchId').equalTo(batchId).once('value', snapshot => {
        if (snapshot.exists()) { snapshot.forEach(child => { updates['/ads_data/' + child.key] = null; }); }
        db.ref().update(updates).then(() => { showToast("🗑️ Đã xóa file", 'success'); });
    });
}
// ... (Các hàm còn lại: selectUploadBatch, viewAllData, parseDataCore, loadAdsData, applyFilters, render..., drawChart..., parseCleanNumber, formatExcelDate, formatDateObj)
function selectUploadBatch(id) { ACTIVE_BATCH_ID = id; renderHistoryUI(); applyFilters(); }
function viewAllData() { ACTIVE_BATCH_ID = null; renderHistoryUI(); applyFilters(); }
function parseDataCore(rows) { if (rows.length < 2) return []; let headerIndex = -1, colNameIdx = -1, colSpendIdx = -1, colResultIdx = -1, colStartIdx = -1, colEndIdx = -1; for (let i = 0; i < Math.min(rows.length, 15); i++) { const row = rows[i]; if (!row) continue; const rowStr = row.map(c => c ? c.toString().toLowerCase().trim() : "").join("|"); if (rowStr.includes("tên nhóm") && (rowStr.includes("số tiền") || rowStr.includes("amount"))) { headerIndex = i; row.forEach((cell, idx) => { if(!cell) return; const txt = cell.toString().toLowerCase().trim(); if (txt.includes("tên nhóm")) colNameIdx = idx; if (txt.includes("số tiền đã chi") || txt.includes("amount spent")) colSpendIdx = idx; if (txt === "kết quả" || txt === "results") colResultIdx = idx; if (txt.includes("bắt đầu") && !txt.includes("báo cáo")) colStartIdx = idx; if (txt.includes("kết thúc") && !txt.includes("báo cáo")) colEndIdx = idx; }); break; } } if (headerIndex === -1 || colNameIdx === -1 || colSpendIdx === -1) return []; let parsedData = []; for (let i = headerIndex + 1; i < rows.length; i++) { const row = rows[i]; if (!row) continue; const rawName = row[colNameIdx]; if (!rawName) continue; let spend = parseCleanNumber(row[colSpendIdx]); if (spend <= 0) continue; let result = parseCleanNumber(row[colResultIdx]); let rawStart = (colStartIdx > -1 && row[colStartIdx]) ? row[colStartIdx] : ""; let rawEnd = (colEndIdx > -1 && row[colEndIdx]) ? row[colEndIdx] : ""; let displayStart = formatExcelDate(rawStart); let status = "Đã tắt"; let endStr = rawEnd ? rawEnd.toString().trim().toLowerCase() : ""; if (endStr.includes("đang diễn ra") || endStr.includes("ongoing")) { status = "Đang chạy"; } let rawNameStr = rawName.toString().trim(); let firstHyphenIndex = rawNameStr.indexOf('-'); let employee = "KHÁC"; let adName = "Chung"; if (firstHyphenIndex !== -1) { employee = rawNameStr.substring(0, firstHyphenIndex).trim().toUpperCase(); adName = rawNameStr.substring(firstHyphenIndex + 1).trim(); } else { employee = rawNameStr.toUpperCase(); } parsedData.push({ fullName: rawNameStr, employee: employee, adName: adName, spend: spend, result: result, run_start: displayStart, status: status }); } return parsedData; }
function loadAdsData() { db.ref('ads_data').on('value', snapshot => { const data = snapshot.val(); if(!data) { GLOBAL_ADS_DATA = []; applyFilters(); return; } GLOBAL_ADS_DATA = Object.values(data); applyFilters(); }); }
function applyFilters() { let filtered = GLOBAL_ADS_DATA.filter(item => item.company === CURRENT_COMPANY); if(ACTIVE_BATCH_ID) { filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID); } filtered.sort((a,b) => { const nameA = a.employee.toLowerCase(); const nameB = b.employee.toLowerCase(); if (nameA < nameB) return -1; if (nameA > nameB) return 1; return b.spend - a.spend; }); let totalSpendAll = 0, totalLeads = 0, totalRevenue = 0; filtered.forEach(item => { const vat = item.spend * 0.1; const fee = item.fee || 0; const total = item.spend + vat + fee; totalSpendAll += total; totalLeads += item.result; totalRevenue += (item.revenue || 0); }); document.getElementById('metric-spend').innerText = new Intl.NumberFormat('vi-VN').format(totalSpendAll) + " ₫"; document.getElementById('metric-leads').innerText = totalLeads; document.getElementById('metric-revenue').innerText = new Intl.NumberFormat('vi-VN').format(totalRevenue) + " ₫"; const roas = totalSpendAll > 0 ? (totalRevenue / totalSpendAll) : 0; document.getElementById('metric-roas').innerText = roas.toFixed(2) + "x"; renderPerformanceTable(filtered); renderFinanceTable(filtered); if(CURRENT_TAB === 'performance') drawChartPerf(filtered); else drawChartFin(filtered); }
function renderPerformanceTable(data) { const tbody = document.getElementById('ads-table-perf'); if(!tbody) return; tbody.innerHTML = ""; data.slice(0, 300).forEach(item => { const cpl = item.result > 0 ? Math.round(item.spend/item.result) : 0; const statusColor = item.status === 'Đang chạy' ? '#0f9d58' : '#999'; const statusIcon = item.status === 'Đang chạy' ? '● Running' : 'Stopped'; const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #f0f0f0"; tr.innerHTML = `<td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td><td class="text-left" style="color:#333;">${item.adName}</td><td class="text-center" style="color:${statusColor}; font-weight:bold; font-size:10px;">${statusIcon}</td><td class="text-right" style="font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td><td class="text-center" style="font-weight:bold;">${item.result}</td><td class="text-right" style="color:#666;">${new Intl.NumberFormat('vi-VN').format(cpl)}</td><td class="text-center" style="font-size:10px; color:#555;">${item.run_start}</td>`; tbody.appendChild(tr); }); }
function renderFinanceTable(data) { const tbody = document.getElementById('ads-table-fin'); if(!tbody) return; tbody.innerHTML = ""; data.slice(0, 300).forEach(item => { const vat = item.spend * 0.1; const fee = item.fee || 0; const total = item.spend + vat + fee; const rev = item.revenue || 0; const roas = total > 0 ? (rev / total) : 0; const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #f0f0f0"; tr.innerHTML = `<td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td><td class="text-left" style="color:#333;">${item.adName}</td><td class="text-right">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td><td class="text-right" style="color:#d93025;">${new Intl.NumberFormat('vi-VN').format(vat)}</td><td class="text-right" style="color:#e67c73;">${fee != 0 ? new Intl.NumberFormat('vi-VN').format(fee) : '-'}</td><td class="text-right" style="font-weight:800; color:#333;">${new Intl.NumberFormat('vi-VN').format(Math.round(total))}</td><td class="text-right" style="font-weight:bold; color:#137333;">${rev > 0 ? new Intl.NumberFormat('vi-VN').format(rev) : '-'}</td><td class="text-center" style="font-weight:bold; color:${roas>0?'#f4b400':'#999'}">${roas>0?roas.toFixed(2)+'x':'-'}</td>`; tbody.appendChild(tr); }); }
function drawChartPerf(data) { const ctx = document.getElementById('chart-ads-perf'); if(!ctx) return; if(window.myAdsChart) window.myAdsChart.destroy(); let agg = {}; data.forEach(item => { if(!agg[item.employee]) agg[item.employee] = { spend: 0, result: 0 }; agg[item.employee].spend += item.spend; agg[item.employee].result += item.result; }); const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.spend - a.spend).slice(0, 10); window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Chi Tiêu (FB)', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' }, { label: 'Kết Quả', data: sorted.map(i => i.result), backgroundColor: '#1a73e8', yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false, position: 'left' }, y1: { display: false, position: 'right' } } } }); }
function drawChartFin(data) { const ctx = document.getElementById('chart-ads-fin'); if(!ctx) return; if(window.myAdsChart) window.myAdsChart.destroy(); let agg = {}; data.forEach(item => { if(!agg[item.employee]) agg[item.employee] = { cost: 0, rev: 0 }; agg[item.employee].cost += (item.spend * 1.1) + (item.fee || 0); agg[item.employee].rev += (item.revenue || 0); }); const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.cost - a.cost).slice(0, 10); window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Tổng Chi Phí (All)', data: sorted.map(i => i.cost), backgroundColor: '#d93025' }, { label: 'Doanh Thu', data: sorted.map(i => i.rev), backgroundColor: '#137333' }] }, options: { responsive: true, maintainAspectRatio: false } }); }
function parseCleanNumber(val) { if (!val) return 0; if (typeof val === 'number') return val; let s = val.toString().trim().replace(/,/g, ''); return parseFloat(s) || 0; }
function formatExcelDate(input) { if (!input) return "-"; if (typeof input === 'number') { const date = new Date((input - 25569) * 86400 * 1000); return formatDateObj(date); } const str = input.toString().trim(); if (str.match(/^\d{4}-\d{2}-\d{2}$/)) { const parts = str.split('-'); return `${parts[2]}-${parts[1]}-${parts[0]}`; } return str; }
function formatDateObj(d) { if (isNaN(d.getTime())) return "-"; const day = ("0" + d.getDate()).slice(-2); const month = ("0" + (d.getMonth() + 1)).slice(-2); const year = d.getFullYear(); return `${day}-${month}-${year}`; }

/**
 * ADS MODULE V56 (ROAS ROW HIGHLIGHTS)
 * - Tô màu nền nhạt cho cả dòng dựa trên ROAS.
 * - Xanh nhạt nếu ROAS >= 8.0.
 * - Đỏ nhạt nếu ROAS < 2.0.
 * - Vẫn giữ lại các huy hiệu (Badge) ROAS từ V55.
 */

let db;

// Lấy kết nối DB từ hệ thống chính
function getDatabase() {
    if (!db && typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        db = firebase.database();
    }
    return db;
}

// --- CẤU HÌNH CÔNG TY ---
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
    console.log("Ads Module V56 Loaded");
    db = getDatabase();
    
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
    
    // Gán hàm Global
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
    window.switchAdsTab = switchAdsTab;
    window.changeCompany = changeCompany;
    window.toggleHistoryView = toggleHistoryView;
    window.searchHistory = searchHistory;
    
    window.handleRevenueUpload = handleRevenueUpload;
    window.handleStatementUpload = handleStatementUpload;

    window.triggerRevenueUpload = () => {
        if(!ACTIVE_BATCH_ID) { showToast("⚠️ Vui lòng chọn 1 File Ads trong lịch sử trước!", "warning"); return; }
        const input = document.getElementById('revenue-file-input');
        if(input) input.click();
    };
    
    window.triggerStatementUpload = () => {
        if(!ACTIVE_BATCH_ID) { showToast("⚠️ Vui lòng chọn 1 File Ads trong lịch sử trước!", "warning"); return; }
        const input = document.getElementById('statement-file-input');
        if(input) input.click();
    };
}

// --- CSS ---
function injectCustomStyles() {
    const styleId = 'ads-custom-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        #toast-container { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
        .custom-toast { pointer-events: auto; min-width: 350px; padding: 12px 20px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); color: #333; border-radius: 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); font-family: sans-serif; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0,0,0,0.05); animation: slideDownFade 0.4s forwards; }
        .toast-icon { margin-right: 10px; font-size: 18px; }
        @keyframes slideDownFade { from { opacity: 0; transform: translateY(-20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeOutUp { to { opacity: 0; transform: translateY(-20px) scale(0.95); } }

        .history-search-wrapper { position: relative; display: flex; align-items: center; flex: 1; margin: 0 15px; }
        .history-search-box { width: 100%; max-width: 400px; padding: 8px 15px 8px 35px; border: 1px solid #e0e0e0; border-radius: 20px; font-size: 13px; background: #f8f9fa; outline: none; transition: all 0.3s ease; }
        .history-search-box:focus { background: #fff; border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1); }
        .search-icon { position: absolute; left: 12px; color: #999; font-size: 14px; }
        .view-more-btn { display: block; width: 100%; padding: 10px; text-align: center; color: #5f6368; font-weight: 600; font-size: 12px; cursor: pointer; border-top: 1px solid #f1f3f4; background: #fff; border-radius: 0 0 8px 8px; }
        .view-more-btn:hover { background: #f8f9fa; color: #1a73e8; }

        .delete-btn-admin { background-color: #d93025; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .delete-btn-admin:hover { background-color: #b71c1c; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }

        .kpi-section { display: none; animation: fadeIn 0.3s; }
        .kpi-section.active { display: grid; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .table-responsive { overflow-x: auto; border: 1px solid #eee; border-radius: 4px; max-height: 500px; position: relative; }
        .ads-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #fff; font-family: sans-serif; font-size: 11px; }
        .ads-table th { position: sticky; top: 0; z-index: 10; background: #f5f5f5; color: #333; text-transform: uppercase; font-weight: bold; padding: 8px; border-bottom: 2px solid #ddd; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1); }
        .ads-table td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }
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
    let icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚠️');
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeOutUp 0.5s ease-out forwards'; setTimeout(() => toast.remove(), 500); }, 3500);
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
                .text-left { text-align: left; } .text-right { text-align: right; } .text-center { text-align: center; }
            </style>

            <div class="company-select-container">
                <div>
                    <span style="font-weight:bold; margin-right: 10px; color:#333;">🏢 ĐANG LÀM VIỆC VỚI:</span>
                    <select id="company-selector" class="company-select" onchange="window.changeCompany(this.value)">
                        ${optionsHtml}
                    </select>
                </div>
            </div>

            <div class="ads-tabs">
                <button class="ads-tab-btn active" onclick="window.switchAdsTab('performance')" id="btn-tab-perf">📊 1. HIỆU QUẢ QUẢNG CÁO</button>
                <button class="ads-tab-btn" onclick="window.switchAdsTab('finance')" id="btn-tab-fin">💰 2. TÀI CHÍNH & ROAS</button>
            </div>

            <div id="kpi-performance" class="kpi-section active" style="grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:15px;">
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#d93025; font-size:16px;" id="perf-spend">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">CHI TIÊU FB (Chưa VAT)</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#1a73e8; font-size:16px;" id="perf-leads">0</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">TỔNG LEADS</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#333; font-size:16px;" id="perf-cpl">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">CHI PHÍ / LEAD</p>
                </div>
                 <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#f4b400; font-size:16px;" id="perf-ctr">0%</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">CTR (TỶ LỆ NHẤP)</p>
                </div>
            </div>

            <div id="kpi-finance" class="kpi-section" style="grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:15px;">
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#d93025; font-size:16px;" id="fin-spend">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">TỔNG CHI (ALL)</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#1a73e8; font-size:16px;" id="fin-leads">0</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">TỔNG LEADS</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#137333; font-size:16px;" id="fin-revenue">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">DOANH THU</p>
                </div>
                 <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#f4b400; font-size:16px;" id="fin-roas">0x</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">ROAS TỔNG</p>
                </div>
            </div>

            <div id="tab-performance" class="ads-tab-content active">
                <div style="height:350px; margin-bottom:15px; background:#fff; padding:10px; border-radius:6px; border:1px solid #eee;">
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
                <div style="height:350px; margin-bottom:15px; background:#fff; padding:10px; border-radius:6px; border:1px solid #eee;">
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
                </div>
                <div onclick="window.triggerStatementUpload()" style="flex:1; padding:8px; border:1px dashed #d93025; border-radius:6px; background:#fce8e6; text-align:center; cursor:pointer;">
                    <span style="font-size:14px;">💸</span> <span style="font-weight:bold; color:#d93025; font-size:11px;">Up Sao Kê Ngân Hàng</span>
                </div>
            </div>
            
            <div style="display:none;">
                <input type="file" id="revenue-file-input" accept=".csv, .xlsx, .xls" onchange="window.handleRevenueUpload(this)">
                <input type="file" id="statement-file-input" accept=".csv, .xlsx, .xls" onchange="window.handleStatementUpload(this)">
            </div>

            <div id="upload-history-container" style="margin-top:15px; background:#fff; padding:10px; border-radius:8px; border:1px solid #eee;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid #eee;">
                    <span style="font-weight:800; color:#333; font-size:11px; white-space:nowrap;">📂 LỊCH SỬ TẢI LÊN</span>
                    <div class="history-search-wrapper">
                        <span class="search-icon">🔍</span>
                        <input type="text" placeholder="Tìm kiếm file..." class="history-search-box" onkeyup="window.searchHistory(this.value)">
                    </div>
                    <button onclick="window.viewAllData()" style="background:#1a73e8; color:white; border:none; padding:4px 10px; border-radius:20px; cursor:pointer; font-size:10px; font-weight:bold; white-space:nowrap;">Xem tất cả</button>
                </div>
                <div style="max-height: 250px; overflow-y: hidden;">
                    <table style="width:100%; font-size:10px; border-collapse: collapse;">
                        <tbody id="upload-history-body"></tbody>
                    </table>
                </div>
                <div id="history-view-more" class="view-more-btn" onclick="window.toggleHistoryView()">Xem tất cả file ⬇</div>
            </div>
        `;
        uploadArea.parentNode.insertBefore(controlsDiv, uploadArea.nextSibling);
    }
}

function loadUploadHistory() {
    if(!db) return;
    db.ref('upload_logs').orderByChild('company').equalTo(CURRENT_COMPANY).on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { GLOBAL_HISTORY_LIST = []; } else {
            GLOBAL_HISTORY_LIST = Object.entries(data).filter(([key, log]) => !log.company || log.company === CURRENT_COMPANY).sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
        }
        renderHistoryUI();
    });
}
function searchHistory(val) { HISTORY_SEARCH_TERM = val.toLowerCase(); renderHistoryUI(); }
function toggleHistoryView() { SHOW_ALL_HISTORY = !SHOW_ALL_HISTORY; renderHistoryUI(); }

function renderHistoryUI() {
    const tbody = document.getElementById('upload-history-body');
    const btnMore = document.getElementById('history-view-more');
    if(!tbody) return;
    let filtered = GLOBAL_HISTORY_LIST;
    if(HISTORY_SEARCH_TERM) { filtered = filtered.filter(([key, log]) => log.fileName.toLowerCase().includes(HISTORY_SEARCH_TERM)); }
    if(filtered.length === 0) { tbody.innerHTML = "<tr><td colspan='4' class='text-center' style='padding:10px;'>Không tìm thấy file</td></tr>"; if(btnMore) btnMore.style.display = 'none'; return; }
    let displayList = filtered;
    if (!HISTORY_SEARCH_TERM && !SHOW_ALL_HISTORY) { displayList = filtered.slice(0, 5); }
    let html = "";
    displayList.forEach(([key, log]) => {
        const timeStr = new Date(log.timestamp).toLocaleDateString('vi-VN');
        const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
        const isActive = (key === ACTIVE_BATCH_ID) ? 'background:#e8f0fe; font-weight:bold;' : '';
        
        // --- HIỆN NÚT XÓA DỰA VÀO BIẾN TOÀN CỤC CỦA HỆ THỐNG CHÍNH ---
        const deleteBtn = window.IS_ADMIN ? `<button class="delete-btn-admin" onclick="window.deleteUploadBatch('${key}', '${log.fileName}')">XÓA</button>` : '';

        html += `
            <tr data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer; ${isActive}" onclick="window.selectUploadBatch('${key}')">
                <td style="padding:8px; font-size:10px; width:70px; vertical-align:middle;">${timeStr}</td>
                <td style="padding:8px; font-weight:600; color:#1a73e8; word-break:break-word; vertical-align:middle;">${log.fileName}</td>
                <td style="padding:8px; text-align:right; font-size:10px; width:80px; vertical-align:middle;">${money}</td>
                <td style="padding:8px; text-align:center; width:70px; vertical-align:middle;">
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    if(btnMore) { if(HISTORY_SEARCH_TERM || filtered.length <= 5) { btnMore.style.display = 'none'; } else { btnMore.style.display = 'block'; btnMore.innerText = SHOW_ALL_HISTORY ? "Thu gọn ⬆" : `Xem tất cả (${filtered.length} file) ⬇`; } }
}

function changeCompany(companyId) { CURRENT_COMPANY = companyId; ACTIVE_BATCH_ID = null; loadUploadHistory(); applyFilters(); showToast(`Đã chuyển sang: ${COMPANIES.find(c=>c.id===companyId).name}`, 'success'); }
function switchAdsTab(tabName) { CURRENT_TAB = tabName; document.getElementById('btn-tab-perf').classList.remove('active'); document.getElementById('btn-tab-fin').classList.remove('active'); if(tabName === 'performance') document.getElementById('btn-tab-perf').classList.add('active'); else document.getElementById('btn-tab-fin').classList.add('active'); document.getElementById('tab-performance').classList.remove('active'); document.getElementById('tab-finance').classList.remove('active'); document.getElementById('tab-' + tabName).classList.add('active'); document.getElementById('kpi-performance').classList.remove('active'); document.getElementById('kpi-finance').classList.remove('active'); document.getElementById('kpi-' + tabName).classList.add('active'); applyFilters(); }

function handleFirebaseUpload(e) { const file = e.target.files[0]; if(!file) return; const fileNameNorm = file.name.toLowerCase().replace(/[-_]/g, ' '); const currentCompInfo = COMPANIES.find(c => c.id === CURRENT_COMPANY); const conflictComp = COMPANIES.find(c => c.id !== CURRENT_COMPANY && c.keywords.some(kw => fileNameNorm.includes(kw))); if (conflictComp) { showToast(`❌ Cảnh báo: File này có thể của "${conflictComp.name}"!`, 'error'); e.target.value = ""; return; } const btnText = document.querySelector('.upload-text'); if(btnText) btnText.innerText = "⏳ Đang xử lý..."; const reader = new FileReader(); reader.onload = function(e) { try { const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); const result = parseDataCore(json); if (result.length > 0) { const batchId = Date.now().toString(); const totalSpend = result.reduce((sum, i) => sum + i.spend, 0); db.ref('upload_logs/' + batchId).set({timestamp: new Date().toISOString(), fileName: file.name, rowCount: result.length, totalSpend: totalSpend, company: CURRENT_COMPANY}); const updates = {}; result.forEach(item => { const newKey = db.ref().child('ads_data').push().key; item.batchId = batchId; item.company = CURRENT_COMPANY; item.revenue = 0; item.fee = 0; updates['/ads_data/' + newKey] = item; }); db.ref().update(updates).then(() => { showToast(`✅ Đã lưu ${result.length} dòng.`, 'success'); if(btnText) btnText.innerText = "Upload Excel"; document.getElementById('ads-file-input').value = ""; ACTIVE_BATCH_ID = batchId; applyFilters(); }); } else { showToast("❌ File không đúng định dạng FB Ads!", 'error'); if(btnText) btnText.innerText = "Upload Excel"; } } catch (err) { showToast("Lỗi: " + err.message, 'error'); if(btnText) btnText.innerText = "Upload Excel"; } }; reader.readAsArrayBuffer(file); }

function handleRevenueUpload(input) { if(!ACTIVE_BATCH_ID) { showToast("⚠️ Chọn file Ads trước!", 'warning'); return; } const file = input.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); let headerIdx = -1, colNameIdx = -1, colRevIdx = -1; for(let i=0; i<Math.min(json.length, 10); i++) { const row = json[i]; if(!row) continue; const rowStr = row.map(c=>c?c.toString().toLowerCase():"").join("|"); if(rowStr.includes("tên nhóm") || rowStr.includes("tên chiến dịch")) { headerIdx = i; row.forEach((cell, idx) => { if(!cell) return; const txt = cell.toString().toLowerCase().trim(); if(txt.includes("tên nhóm") || txt.includes("tên chiến dịch")) colNameIdx = idx; if(txt.includes("doanh thu") || txt.includes("thành tiền")) colRevIdx = idx; }); break; } } if(colNameIdx === -1 || colRevIdx === -1) { showToast("❌ Thiếu cột Tên nhóm hoặc Doanh thu", 'error'); return; } let revenueMap = {}; for(let i=headerIdx+1; i<json.length; i++) { const r = json[i]; if(!r || !r[colNameIdx]) continue; const name = r[colNameIdx].toString().trim(); let rev = parseCleanNumber(r[colRevIdx]); if(rev > 0) revenueMap[name] = rev; } let updateCount = 0; const updates = {}; db.ref('ads_data').orderByChild('batchId').equalTo(ACTIVE_BATCH_ID).once('value', snapshot => { if(!snapshot.exists()) { showToast("Lỗi dữ liệu", 'error'); return; } snapshot.forEach(child => { const item = child.val(); const key = child.key; if (revenueMap[item.fullName]) { updates['/ads_data/' + key + '/revenue'] = revenueMap[item.fullName]; updateCount++; } }); if (updateCount > 0) { db.ref().update(updates).then(() => { showToast(`✅ Cập nhật doanh thu: ${updateCount} bài`, 'success'); switchAdsTab('finance'); }); } else { showToast("⚠️ Không khớp bài quảng cáo nào", 'warning'); } }); } catch(err) { showToast(err.message, 'error'); } }; reader.readAsArrayBuffer(file); input.value = ""; }

function handleStatementUpload(input) { 
    if(!ACTIVE_BATCH_ID) { showToast("⚠️ Chọn file Ads trước!", 'warning'); return; } 
    const file = input.files[0]; if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        try { 
            const data = new Uint8Array(e.target.result); 
            const workbook = XLSX.read(data, {type: 'array'}); 
            const sheet = workbook.Sheets[workbook.SheetNames[0]]; 
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); 
            
            let headerIdx = -1, colAmountIdx = -1; 
            for(let i=0; i<Math.min(json.length, 30); i++) { 
                const row = json[i]; 
                if(!row) continue; 
                row.forEach((cell, idx) => { 
                    if(!cell) return; 
                    const txt = cell.toString().toLowerCase().trim(); 
                    const validHeaders = ['nợ', 'debit', 'ghi nợ', 'phát sinh nợ', 'phát sinh giảm', 'số tiền ghi nợ', 'rút tiền', 'số tiền trừ'];
                    if(validHeaders.some(kw => txt.includes(kw)) && !txt.includes('có') && !txt.includes('thu')) { 
                        headerIdx = i; colAmountIdx = idx; 
                    } 
                }); 
                if(colAmountIdx !== -1) break; 
            } 
            
            if(colAmountIdx === -1) { 
                showToast("❌ File sao kê không đúng định dạng", 'error'); 
                return; 
            } 
            
            let totalStatement = 0; 
            for(let i=headerIdx+1; i<json.length; i++) { 
                const r = json[i]; 
                if(!r) continue; 
                let amt = Math.abs(parseCleanNumber(r[colAmountIdx])); 
                if(amt > 0) totalStatement += amt; 
            } 
            
            if(totalStatement === 0) {
                showToast("⚠️ Không tìm thấy số tiền nào được trừ!", 'warning');
                return;
            }

            db.ref('ads_data').orderByChild('batchId').equalTo(ACTIVE_BATCH_ID).once('value', snapshot => { 
                if(!snapshot.exists()) return; 
                let totalAdsVAT = 0; let count = 0; 
                snapshot.forEach(child => { const item = child.val(); totalAdsVAT += (item.spend * 1.1); count++; }); 
                const totalDiff = totalStatement - totalAdsVAT; 
                const feePerRow = totalDiff / count; 
                const updates = {}; 
                snapshot.forEach(child => { updates['/ads_data/' + child.key + '/fee'] = feePerRow; }); 
                db.ref().update(updates).then(() => { 
                    showToast(`✅ Đã phân bổ khớp với Sao kê ngân hàng!`, 'success'); 
                    switchAdsTab('finance'); 
                }); 
            }); 
        } catch(err) { showToast(err.message, 'error'); } 
    }; 
    reader.readAsArrayBuffer(file); 
    input.value = ""; 
}

function deleteUploadBatch(batchId, fileName) { if (event) event.stopPropagation(); if(!confirm(`Xóa file: "${fileName}"?`)) return; if (ACTIVE_BATCH_ID === batchId) { ACTIVE_BATCH_ID = null; document.getElementById('ads-table-perf').innerHTML = ""; document.getElementById('ads-table-fin').innerHTML = ""; } const updates = {}; updates['/upload_logs/' + batchId] = null; db.ref('ads_data').orderByChild('batchId').equalTo(batchId).once('value', snapshot => { if (snapshot.exists()) { snapshot.forEach(child => { updates['/ads_data/' + child.key] = null; }); } db.ref().update(updates).then(() => { showToast("🗑️ Đã xóa file", 'success'); }); }); }

function selectUploadBatch(id) { ACTIVE_BATCH_ID = id; renderHistoryUI(); applyFilters(); }
function viewAllData() { ACTIVE_BATCH_ID = null; renderHistoryUI(); applyFilters(); }

function parseDataCore(rows) { if (rows.length < 2) return []; let headerIndex = -1, colNameIdx = -1, colSpendIdx = -1, colResultIdx = -1, colStartIdx = -1, colEndIdx = -1, colImpsIdx = -1, colClicksIdx = -1; for (let i = 0; i < Math.min(rows.length, 15); i++) { const row = rows[i]; if (!row) continue; const rowStr = row.map(c => c ? c.toString().toLowerCase().trim() : "").join("|"); if (rowStr.includes("tên nhóm") && (rowStr.includes("số tiền") || rowStr.includes("amount"))) { headerIndex = i; row.forEach((cell, idx) => { if(!cell) return; const txt = cell.toString().toLowerCase().trim(); if (txt.includes("tên nhóm")) colNameIdx = idx; if (txt.includes("số tiền đã chi") || txt.includes("amount spent")) colSpendIdx = idx; if (txt === "kết quả" || txt === "results") colResultIdx = idx; if (txt.includes("bắt đầu") && !txt.includes("báo cáo")) colStartIdx = idx; if (txt.includes("kết thúc") && !txt.includes("báo cáo")) colEndIdx = idx; if (txt.includes("hiển thị") || txt.includes("impression")) colImpsIdx = idx; if (txt.includes("lượt click") || txt.includes("nhấp")) colClicksIdx = idx; }); break; } } if (headerIndex === -1 || colNameIdx === -1 || colSpendIdx === -1) return []; let parsedData = []; for (let i = headerIndex + 1; i < rows.length; i++) { const row = rows[i]; if (!row) continue; const rawName = row[colNameIdx]; if (!rawName) continue; let spend = parseCleanNumber(row[colSpendIdx]); if (spend <= 0) continue; let result = parseCleanNumber(row[colResultIdx]); let imps = parseCleanNumber(row[colImpsIdx]); let clicks = parseCleanNumber(row[colClicksIdx]); let rawStart = (colStartIdx > -1 && row[colStartIdx]) ? row[colStartIdx] : ""; let rawEnd = (colEndIdx > -1 && row[colEndIdx]) ? row[colEndIdx] : ""; let displayStart = formatExcelDate(rawStart); let displayEnd = formatExcelDate(rawEnd); let status = "Đã tắt"; let endStr = rawEnd ? rawEnd.toString().trim().toLowerCase() : ""; if (endStr.includes("đang diễn ra") || endStr.includes("ongoing")) { status = "Đang chạy"; } let rawNameStr = rawName.toString().trim(); let firstHyphenIndex = rawNameStr.indexOf('-'); let employee = "KHÁC"; let adName = "Chung"; if (firstHyphenIndex !== -1) { employee = rawNameStr.substring(0, firstHyphenIndex).trim().toUpperCase(); adName = rawNameStr.substring(firstHyphenIndex + 1).trim(); } else { employee = rawNameStr.toUpperCase(); } parsedData.push({ fullName: rawNameStr, employee: employee, adName: adName, spend: spend, result: result, clicks: clicks, impressions: imps, run_start: displayStart, run_end: displayEnd, status: status }); } return parsedData; }

function loadAdsData() { if(!db) return; db.ref('ads_data').on('value', snapshot => { const data = snapshot.val(); if(!data) { GLOBAL_ADS_DATA = []; applyFilters(); return; } GLOBAL_ADS_DATA = Object.values(data); applyFilters(); }); }

function applyFilters() {
    let filtered = GLOBAL_ADS_DATA.filter(item => item.company === CURRENT_COMPANY);
    if(ACTIVE_BATCH_ID) { filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID); }
    filtered.sort((a,b) => { const empCompare = a.employee.localeCompare(b.employee); if (empCompare !== 0) return empCompare; return b.spend - a.spend; });

    let totalSpendFB = 0, totalLeads = 0, totalClicks = 0, totalImps = 0, totalRevenue = 0, totalCostAll = 0;
    filtered.forEach(item => {
        totalSpendFB += item.spend; totalLeads += item.result; totalClicks += (item.clicks || 0); totalImps += (item.impressions || 0);
        const vat = item.spend * 0.1; const fee = item.fee || 0; const total = item.spend + vat + fee; totalCostAll += total; totalRevenue += (item.revenue || 0);
    });

    document.getElementById('perf-spend').innerText = new Intl.NumberFormat('vi-VN').format(totalSpendFB) + " ₫";
    document.getElementById('perf-leads').innerText = totalLeads;
    const avgCpl = totalLeads > 0 ? Math.round(totalSpendFB / totalLeads) : 0;
    document.getElementById('perf-cpl').innerText = new Intl.NumberFormat('vi-VN').format(avgCpl) + " ₫";
    const ctr = totalImps > 0 ? ((totalClicks / totalImps) * 100).toFixed(2) : "0.00";
    document.getElementById('perf-ctr').innerText = ctr + "%";

    document.getElementById('fin-spend').innerText = new Intl.NumberFormat('vi-VN').format(totalCostAll) + " ₫";
    document.getElementById('fin-leads').innerText = totalLeads;
    document.getElementById('fin-revenue').innerText = new Intl.NumberFormat('vi-VN').format(totalRevenue) + " ₫";
    const roas = totalCostAll > 0 ? (totalRevenue / totalCostAll) : 0;
    document.getElementById('fin-roas').innerText = roas.toFixed(2) + "x";

    renderPerformanceTable(filtered);
    renderFinanceTable(filtered);
    if(CURRENT_TAB === 'performance') drawChartPerf(filtered); else drawChartFin(filtered);
}

function renderPerformanceTable(data) { const tbody = document.getElementById('ads-table-perf'); if(!tbody) return; tbody.innerHTML = ""; data.slice(0, 300).forEach(item => { const cpl = item.result > 0 ? Math.round(item.spend/item.result) : 0; let statusHtml = item.status === 'Đang chạy' ? '<span style="color:#0f9d58; font-weight:bold;">● Đang chạy</span>' : `<span style="color:#666; font-weight:bold;">Đã tắt</span><br><span style="font-size:9px; color:#888;">${item.run_end || ''}</span>`; const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #f0f0f0"; tr.innerHTML = `<td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td><td class="text-left" style="color:#333;">${item.adName}</td><td class="text-center">${statusHtml}</td><td class="text-right" style="font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td><td class="text-center" style="font-weight:bold;">${item.result}</td><td class="text-right" style="color:#666;">${new Intl.NumberFormat('vi-VN').format(cpl)}</td><td class="text-center" style="font-size:10px; color:#555;">${item.run_start}</td>`; tbody.appendChild(tr); }); }

// --- V56: TÔ MÀU NỀN CẢ DÒNG DỰA TRÊN ROAS ---
function renderFinanceTable(data) { 
    const tbody = document.getElementById('ads-table-fin'); 
    if(!tbody) return; 
    tbody.innerHTML = ""; 
    data.slice(0, 300).forEach(item => { 
        const vat = item.spend * 0.1; 
        const fee = item.fee || 0; 
        const total = item.spend + vat + fee; 
        const rev = item.revenue || 0; 
        const roas = total > 0 ? (rev / total) : 0; 
        
        // 1. Xác định màu nền cho dòng
        let rowBgStyle = '';
        if (roas >= 8.0) {
            rowBgStyle = 'background: #e6f4ea;'; // Xanh lá rất nhạt
        } else if (roas > 0 && roas < 2.0) {
            rowBgStyle = 'background: #fce8e6;'; // Đỏ rất nhạt
        }

        // 2. Tạo nội dung Huy hiệu (Badge)
        let roasHtml = '-';
        if (roas > 0) {
            let roasVal = roas.toFixed(2) + 'x';
            if (roas >= 8.0) {
                roasHtml = `<div style="display:inline-flex; align-items:center; gap:4px; background:#e6f4ea; color:#137333; padding:3px 10px; border-radius:12px; border:1px solid #ceead6; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.05);"><span style="font-weight:900;">${roasVal}</span><span style="font-size:11px;">✅</span></div>`;
            } else if (roas < 2.0) {
                roasHtml = `<div style="display:inline-flex; align-items:center; gap:4px; background:#fce8e6; color:#d93025; padding:3px 10px; border-radius:12px; border:1px solid #fad2cf; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.05);"><span style="font-weight:900;">${roasVal}</span><span style="font-size:11px;">❗</span></div>`;
            } else {
                roasHtml = `<span style="font-weight:bold; color:#f4b400; font-size:12px;">${roasVal}</span>`;
            }
        }

        const tr = document.createElement('tr'); 
        // 3. Áp dụng style màu nền và viền
        tr.style.cssText = `border-bottom: 1px solid #f0f0f0; ${rowBgStyle}`;
        tr.innerHTML = `
            <td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td>
            <td class="text-left" style="color:#333;">${item.adName}</td>
            <td class="text-right">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>
            <td class="text-right" style="color:#d93025;">${new Intl.NumberFormat('vi-VN').format(vat)}</td>
            <td class="text-right" style="color:#e67c73;">${fee != 0 ? new Intl.NumberFormat('vi-VN').format(fee) : '-'}</td>
            <td class="text-right" style="font-weight:800; color:#333;">${new Intl.NumberFormat('vi-VN').format(Math.round(total))}</td>
            <td class="text-right" style="font-weight:bold; color:#137333;">${rev > 0 ? new Intl.NumberFormat('vi-VN').format(rev) : '-'}</td>
            <td class="text-center">${roasHtml}</td>
        `; 
        tbody.appendChild(tr); 
    }); 
}

function drawChartPerf(data) { try { const ctx = document.getElementById('chart-ads-perf'); if(!ctx) return; if(window.myAdsChart) window.myAdsChart.destroy(); let agg = {}; data.forEach(item => { if(!agg[item.employee]) agg[item.employee] = { spend: 0, result: 0 }; agg[item.employee].spend += item.spend; agg[item.employee].result += item.result; }); const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.spend - a.spend).slice(0, 10); window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Chi Tiêu (FB)', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' }, { label: 'Kết Quả', data: sorted.map(i => i.result), backgroundColor: '#1a73e8', yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false, position: 'left' }, y1: { display: false, position: 'right' } } } }); } catch(e) { console.error("Chart Error", e); } }
function drawChartFin(data) { try { const ctx = document.getElementById('chart-ads-fin'); if(!ctx) return; if(window.myAdsChart) window.myAdsChart.destroy(); let agg = {}; data.forEach(item => { if(!agg[item.employee]) agg[item.employee] = { cost: 0, rev: 0 }; agg[item.employee].cost += (item.spend * 1.1) + (item.fee || 0); agg[item.employee].rev += (item.revenue || 0); }); const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.cost - a.cost).slice(0, 10); window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Tổng Chi Phí (All)', data: sorted.map(i => i.cost), backgroundColor: '#d93025', order: 2 }, { label: 'Doanh Thu', data: sorted.map(i => i.rev), backgroundColor: '#137333', order: 3 }, { label: 'ROAS', data: sorted.map(i => i.cost > 0 ? (i.rev / i.cost) : 0), type: 'line', borderColor: '#f4b400', backgroundColor: '#f4b400', borderWidth: 3, pointRadius: 4, yAxisID: 'y1', order: 1 }] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { type: 'linear', display: true, position: 'left', beginAtZero: true }, y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } } } } }); } catch(e) { console.error("Chart Error", e); } }

function parseCleanNumber(val) { if (!val) return 0; if (typeof val === 'number') return val; let s = val.toString().trim().replace(/,/g, ''); return parseFloat(s) || 0; }
function formatExcelDate(input) { if (!input) return "-"; if (typeof input === 'number') { const date = new Date((input - 25569) * 86400 * 1000); return formatDateObj(date); } const str = input.toString().trim(); if (str.match(/^\d{4}-\d{2}-\d{2}$/)) { const parts = str.split('-'); return `${parts[2]}-${parts[1]}-${parts[0]}`; } return str; }
function formatDateObj(d) { if (isNaN(d.getTime())) return "-"; const day = ("0" + d.getDate()).slice(-2); const month = ("0" + (d.getMonth() + 1)).slice(-2); const year = d.getFullYear(); return `${day}-${month}-${year}`; }

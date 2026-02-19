/**
 * ADS MODULE V71 (CHART FIX & TAB FIX)
 * - Tự động tải thư viện Chart.js để biểu đồ hiển thị.
 * - Sửa lỗi sập Javascript khi chuyển Tab do thiếu HTML của Tab 3.
 * - Giữ nguyên 100% logic đọc dữ liệu siêu mượt của người dùng.
 */

// Tải thư viện Excel
if (!window.EXCEL_STYLE_LOADED) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    script.onload = () => { window.EXCEL_STYLE_LOADED = true; console.log("Excel Style Library Loaded"); };
    document.head.appendChild(script);
    window.EXCEL_STYLE_LOADED = 'loading';
}

// BỔ SUNG: Tải thư viện vẽ biểu đồ (Chart.js) để biểu đồ không bị tàng hình
if (!window.CHART_JS_LOADED) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => { 
        window.CHART_JS_LOADED = true; 
        console.log("Chart.js Loaded"); 
        if(typeof applyFilters === 'function') applyFilters(); // Vẽ lại biểu đồ khi tải xong
    };
    document.head.appendChild(script);
    window.CHART_JS_LOADED = 'loading';
}

let db;

function getDatabase() {
    if (!db && typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        db = firebase.database();
    }
    return db;
}

const COMPANIES = [
    { id: 'NNV', name: 'Nông Nghiệp Việt', keywords: ['nông nghiệp việt', 'nong nghiep viet', 'nnv'] },
    { id: 'VN', name: 'Việt Nhật', keywords: ['việt nhật', 'viet nhat', 'hóa nông việt nhật'] },
    { id: 'KF', name: 'King Farm', keywords: ['king farm', 'kingfarm', 'kf'] },
    { id: 'ABC', name: 'ABC Việt Nam', keywords: ['abc', 'abc việt nam'] }
];

let GLOBAL_ADS_DATA = [];
let GLOBAL_HISTORY_LIST = [];
let GLOBAL_EXPORT_LIST = []; 
let CURRENT_FILTERED_DATA = []; 
let SHOW_ALL_HISTORY = false;
let HISTORY_SEARCH_TERM = "";

let ACTIVE_BATCH_ID = null;
let CURRENT_TAB = 'performance'; 
let CURRENT_COMPANY = 'NNV'; 

function initAdsAnalysis() {
    console.log("Ads Module V71 Fixed Loaded");
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
    
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
    window.switchAdsTab = switchAdsTab;
    window.changeCompany = changeCompany;
    window.toggleHistoryView = toggleHistoryView;
    window.searchHistory = searchHistory;
    window.exportFinanceToExcel = exportFinanceToExcel; 
    window.toggleExportHistory = toggleExportHistory;
    
    window.handleRevenueUpload = handleRevenueUpload;
    window.handleStatementUpload = handleStatementUpload;

    window.triggerRevenueUpload = () => {
        if(isGuestMode()) return showToast("Tài khoản khách không có quyền Upload!", "error");
        if(!ACTIVE_BATCH_ID) return showToast("⚠️ Vui lòng chọn 1 File Ads trong lịch sử trước!", "warning");
        const input = document.getElementById('revenue-file-input');
        if(input) input.click();
    };
    
    window.triggerStatementUpload = () => {
        if(isGuestMode()) return showToast("Tài khoản khách không có quyền Upload!", "error");
        if(!ACTIVE_BATCH_ID) return showToast("⚠️ Vui lòng chọn 1 File Ads trong lịch sử trước!", "warning");
        const input = document.getElementById('statement-file-input');
        if(input) input.click();
    };

    enforceGuestRestrictions();
}

function isGuestMode() {
    return (window.myIdentity && window.myIdentity.includes("Khách"));
}

function enforceGuestRestrictions() {
    setTimeout(() => {
        if (isGuestMode()) {
            const upArea = document.getElementById('ads-upload-area');
            if(upArea) upArea.style.display = 'none';
            const controlsDiv = document.getElementById('upload-controls-container');
            if(controlsDiv) controlsDiv.style.display = 'none';
        }
    }, 500);
}

function formatDateTime(isoString) {
    if(!isoString) return "";
    const d = new Date(isoString);
    if(isNaN(d)) return "";
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

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

        .kpi-section { display: none; animation: fadeIn 0.3s; }
        .kpi-section.active { display: grid; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .table-responsive { overflow-x: auto; border: 1px solid #eee; border-radius: 4px; max-height: 500px; position: relative; }
        .ads-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #fff; font-family: sans-serif; font-size: 11px; }
        .ads-table th { position: sticky; top: 0; z-index: 10; background: #f5f5f5; color: #333; text-transform: uppercase; font-weight: bold; padding: 8px; border-bottom: 2px solid #ddd; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1); }
        .ads-table td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }

        tr.roas-good td { background-color: #e6f4ea !important; }
        tr.roas-bad td { background-color: #fce8e6 !important; }

        .btn-export-excel { background:#137333; color:white; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:8px; transition:0.2s; box-shadow: 0 2px 6px rgba(19,115,51,0.2); text-transform:uppercase; letter-spacing:0.5px;}
        .btn-export-excel:hover { background:#0d5323; transform:translateY(-2px); box-shadow: 0 4px 12px rgba(19,115,51,0.3); }

        .btn-toggle-history { background:#fff; color:#5f6368; border:1px solid #dadce0; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; display:inline-flex; align-items:center; gap:5px; transition:0.2s; }
        .btn-toggle-history:hover { background:#f8f9fa; border-color:#9aa0a6; }

        .btn-view-all { background: #1a73e8; color: #fff; border: none; padding: 4px 12px; border-radius: 20px; cursor: pointer; font-size: 10px; font-weight: bold; white-space: nowrap; transition: 0.2s; box-shadow: 0 2px 5px rgba(26,115,232,0.2); }
        .btn-view-all:hover { background: #1557b0; box-shadow: 0 4px 8px rgba(26,115,232,0.3); transform: translateY(-1px); }

        .history-grid { display: grid; grid-template-columns: 1fr; gap: 15px; margin-top: 15px; }
        .history-box { background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #eee; }
        .history-title { font-weight: 800; color: #333; font-size: 11px; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase; }
        
        .history-search-wrapper { position: relative; display: flex; align-items: center; flex: 1; margin: 0 15px; }
        .history-search-box { width: 100%; padding: 4px 10px 4px 25px; border: 1px solid #e0e0e0; border-radius: 20px; font-size: 11px; background: #f8f9fa; outline: none; transition: 0.2s; }
        .history-search-box:focus { background: #fff; border-color: #1a73e8; }
        .search-icon { position: absolute; left: 8px; color: #999; font-size: 11px; }

        .user-badge { background: #e8f0fe; color: #1a73e8; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; display: inline-block; margin-top: 4px; }
        .export-badge { background: #e6f4ea; color: #137333; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; display: inline-block; }
        
        .delete-btn-admin { background-color: #d93025; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 10px; cursor: pointer; transition: 0.2s; }
        .delete-btn-admin:hover { background-color: #b71c1c; }

        .scroll-area { max-height: 250px; overflow-y: auto; overflow-x: hidden; padding-right: 5px; }
        .scroll-area::-webkit-scrollbar { width: 5px; }
        .scroll-area::-webkit-scrollbar-thumb { background: #ccc; border-radius: 5px; }
    `;
    document.head.appendChild(style);

    if (!document.getElementById('toast-container')) {
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
    }
}

function resetInterface() {
    const container = document.getElementById('ads-analysis-result');
    if (container) {
        container.style.display = 'block';
        let optionsHtml = COMPANIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        container.innerHTML = `
            <style>
                .company-select-container { background: #e8f0fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #1a73e8; display: flex; align-items: center; justify-content: space-between; }
                .company-select { padding: 8px 12px; font-size: 16px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold; color: #1a73e8; min-width: 200px; }
                .ads-tabs { display: flex; border-bottom: 2px solid #ddd; margin-bottom: 15px; overflow-x:auto; }
                .ads-tab-btn { padding: 10px 15px; cursor: pointer; font-weight: bold; color: #666; border: none; background: none; border-bottom: 3px solid transparent; transition: all 0.3s; font-size: 12px; white-space:nowrap; }
                .ads-tab-btn:hover { background: #f9f9f9; color: #1a73e8; }
                .ads-tab-btn.active { color: #1a73e8; border-bottom: 3px solid #1a73e8; background: #f8fbff; }
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
                <button class="ads-tab-btn" onclick="window.switchAdsTab('trend')" id="btn-tab-trend">📈 3. BIỂU ĐỒ XU HƯỚNG</button>
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

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px;">
                    <button class="btn-toggle-history" onclick="window.toggleExportHistory()">
                        <span>🕒</span> Xem Lịch Sử Xuất
                    </button>
                    <button class="btn-export-excel" onclick="window.exportFinanceToExcel()">
                        <span style="font-size: 16px;">📥</span> Xuất File Excel
                    </button>
                </div>

                <div id="export-history-container" style="display:none; margin-top:15px; background:#fff; border:1px solid #eee; border-radius:8px; padding:15px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
                    <div style="font-weight:800; color:#333; font-size:12px; margin-bottom:10px; text-transform:uppercase; border-bottom:1px solid #eee; padding-bottom:8px;">
                        Danh Sách Các Lần Xuất Dữ Liệu
                    </div>
                    <div class="table-responsive" style="max-height: 200px;">
                        <table class="ads-table">
                            <thead>
                                <tr>
                                    <th class="text-left" style="width:120px;">Thời Gian</th>
                                    <th class="text-left">Tài Khoản Xuất (Người dùng)</th>
                                    <th class="text-right">Số Dữ Liệu</th>
                                </tr>
                            </thead>
                            <tbody id="export-history-table-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="tab-trend" class="ads-tab-content">
                <div style="height:350px; margin-bottom:15px; background:#fff; padding:10px; border-radius:6px; border:1px solid #eee;">
                    <canvas id="chart-ads-trend"></canvas>
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

            <div class="history-grid">
                <div class="history-box" style="grid-column: 1 / -1;">
                    <div class="history-title">
                        <span>📂 Lịch Sử Tải Lên</span>
                        <div class="history-search-wrapper">
                            <span class="search-icon">🔍</span>
                            <input type="text" placeholder="Tìm file..." class="history-search-box" onkeyup="window.searchHistory(this.value)">
                        </div>
                        <button id="history-view-more" class="btn-view-all" onclick="window.toggleHistoryView()" style="display:none;">Xem tất cả</button>
                    </div>
                    <div class="scroll-area">
                        <table style="width:100%; border-collapse: collapse;">
                            <tbody id="upload-history-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        uploadArea.parentNode.insertBefore(controlsDiv, uploadArea.nextSibling);
    }
}

function toggleExportHistory() {
    const container = document.getElementById('export-history-container');
    if(container) {
        if(container.style.display === 'none' || container.style.display === '') {
            container.style.display = 'block';
            container.style.animation = 'slideDownFade 0.3s ease-out forwards';
            setTimeout(() => { container.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 100);
        } else {
            container.style.display = 'none';
        }
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
        if(CURRENT_TAB === 'trend') drawChartTrend(); 
    });

    db.ref('export_logs').orderByChild('company').equalTo(CURRENT_COMPANY).on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { GLOBAL_EXPORT_LIST = []; } else {
            GLOBAL_EXPORT_LIST = Object.values(data).filter(log => !log.company || log.company === CURRENT_COMPANY).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        renderExportUI();
    });
}

function searchHistory(val) { HISTORY_SEARCH_TERM = val.toLowerCase(); renderHistoryUI(); }
function toggleHistoryView() { SHOW_ALL_HISTORY = !SHOW_ALL_HISTORY; renderHistoryUI(); }

function selectUploadBatch(id) { 
    if (ACTIVE_BATCH_ID === id) { ACTIVE_BATCH_ID = null; } else { ACTIVE_BATCH_ID = id; }
    renderHistoryUI(); 
    applyFilters(); 
}

function viewAllData() { ACTIVE_BATCH_ID = null; renderHistoryUI(); applyFilters(); }

function renderHistoryUI() {
    const tbody = document.getElementById('upload-history-body');
    const btnMore = document.getElementById('history-view-more');
    if(!tbody) return;
    
    let filtered = GLOBAL_HISTORY_LIST;
    if(HISTORY_SEARCH_TERM) { 
        filtered = filtered.filter(([key, log]) => log.fileName.toLowerCase().includes(HISTORY_SEARCH_TERM)); 
    }
    
    if(filtered.length === 0) { 
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#999; font-size:10px;'>Không tìm thấy file</td></tr>"; 
        if(btnMore) btnMore.style.display = 'none'; 
        return; 
    }
    
    let displayList = filtered;
    if (!HISTORY_SEARCH_TERM && !SHOW_ALL_HISTORY) { 
        displayList = filtered.slice(0, 5); 
    }

    let html = "";
    displayList.forEach(([key, log]) => {
        const timeStr = formatDateTime(log.timestamp);
        const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
        
        const isActive = (key === ACTIVE_BATCH_ID);
        const activeStyle = isActive ? 'background:#e8f0fe; border-left:4px solid #1a73e8;' : 'border-left:4px solid transparent;';
        const deleteBtn = window.IS_ADMIN ? `<button class="delete-btn-admin" onclick="window.deleteUploadBatch('${key}', '${log.fileName}')">XÓA</button>` : '';
        const uploaderName = log.uploader || "Hệ thống cũ";

        html += `
            <tr data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer; ${activeStyle}" onclick="window.selectUploadBatch('${key}')">
                <td style="padding:8px 4px 8px 10px; font-size:10px; width:110px; vertical-align:middle; color:#666;">${timeStr}</td>
                <td style="padding:8px 4px; vertical-align:middle;">
                    <div style="font-weight:${isActive ? '800' : '600'}; color:${isActive ? '#1a73e8' : '#333'}; word-break:break-word; font-size:11px; line-height:1.2;">
                        📊 ${log.fileName}
                    </div>
                    <div class="user-badge">👤 ${uploaderName}</div>
                </td>
                <td style="padding:8px 4px; text-align:right; font-size:10px; font-weight:bold; color:#1a73e8; width:80px; vertical-align:middle;">${money}</td>
                <td style="padding:8px 0; text-align:center; width:50px; vertical-align:middle;">
                    ${deleteBtn}
                </td>
            </tr>
        `;

        if (isActive) {
            let childFiles = [];
            if (log.revenueFileName) childFiles.push({ icon: '💰', name: log.revenueFileName, color: '#137333', time: log.revenueTime });
            if (log.statementFileName) childFiles.push({ icon: '💸', name: log.statementFileName, color: '#d93025', time: log.statementTime });

            if (childFiles.length > 0) {
                childFiles.forEach((file, index) => {
                    const isLast = (index === childFiles.length - 1);
                    const branchChar = isLast ? "└──" : "├──";
                    const timeTag = file.time ? `<span style="font-size:9px; color:#9aa0a6; margin-left:8px; font-weight:normal; font-style:italic;">🕒 ${formatDateTime(file.time)}</span>` : '';

                    html += `
                        <tr style="background:#f8f9fa; border-left:4px solid #1a73e8;">
                            <td></td>
                            <td colspan="3" style="padding:4px 4px 6px 0; font-size:10px; color:#5f6368;">
                                <span style="color:#ccc; margin-right:5px; font-family: monospace; font-size:12px;">${branchChar}</span>
                                <span style="color:${file.color}; font-weight:bold;">${file.icon} ${file.name}</span>
                                ${timeTag}
                            </td>
                        </tr>
                    `;
                });
            } else {
                html += `
                    <tr style="background:#f8f9fa; border-left:4px solid #1a73e8;">
                        <td></td>
                        <td colspan="3" style="padding:4px 4px 6px 0; font-size:9px; color:#9aa0a6; font-style:italic;">
                            <span style="color:#ccc; margin-right:5px; font-family: monospace; font-size:12px;">└──</span>
                            (Chưa up kèm Doanh thu / Sao kê)
                        </td>
                    </tr>
                `;
            }
        }
    });
    
    tbody.innerHTML = html;
    
    if(btnMore) { 
        if(HISTORY_SEARCH_TERM || filtered.length <= 5) { 
            btnMore.style.display = 'none'; 
        } else { 
            btnMore.style.display = 'inline-block'; 
            btnMore.innerText = SHOW_ALL_HISTORY ? "Thu gọn ⬆" : `Xem tất cả (${filtered.length}) ⬇`; 
        } 
    }
    
    enforceGuestRestrictions();
}

function renderExportUI() {
    const tbody = document.getElementById('export-history-table-body');
    if(!tbody) return;
    
    if(GLOBAL_EXPORT_LIST.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3' class='text-center' style='padding:15px; color:#999; font-size:11px; font-style:italic;'>Chưa có lượt xuất file nào.</td></tr>";
        return;
    }

    let displayList = GLOBAL_EXPORT_LIST.slice(0, 30);
    let html = "";
    displayList.forEach(log => {
        const timeStr = formatDateTime(log.timestamp);
        html += `
            <tr>
                <td class="text-left" style="color:#666; font-size:11px;">${timeStr}</td>
                <td class="text-left">
                    <div class="export-badge">👤 ${log.exporter || 'Khách'}</div>
                </td>
                <td class="text-right" style="font-weight:bold; color:#137333;">${log.recordCount} dòng</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function changeCompany(companyId) { CURRENT_COMPANY = companyId; ACTIVE_BATCH_ID = null; loadUploadHistory(); applyFilters(); showToast(`Đã chuyển sang: ${COMPANIES.find(c=>c.id===companyId).name}`, 'success'); }

// SỬA LỖI CHUYỂN TAB CỦA V71: Kiểm tra null an toàn trước khi thêm class
function switchAdsTab(tabName) { 
    CURRENT_TAB = tabName; 
    
    ['perf', 'fin', 'trend'].forEach(t => {
        let btn = document.getElementById('btn-tab-' + t);
        if(btn) btn.classList.remove('active');
    });
    
    let activeBtnId = 'btn-tab-' + (tabName === 'performance' ? 'perf' : (tabName === 'finance' ? 'fin' : 'trend'));
    let activeBtn = document.getElementById(activeBtnId);
    if(activeBtn) activeBtn.classList.add('active');

    ['performance', 'finance', 'trend'].forEach(t => {
        let tab = document.getElementById('tab-' + t);
        if(tab) tab.classList.remove('active');
        let kpi = document.getElementById('kpi-' + t);
        if(kpi) kpi.classList.remove('active');
    });

    let activeTab = document.getElementById('tab-' + tabName);
    if(activeTab) activeTab.classList.add('active');
    
    let activeKpi = document.getElementById('kpi-' + tabName);
    if(activeKpi) activeKpi.classList.add('active');

    applyFilters(); 
}

function handleFirebaseUpload(e) { 
    if(isGuestMode()) return showToast("Tài khoản khách không có quyền Upload!", "error");
    const file = e.target.files[0]; if(!file) return; 
    const fileNameNorm = file.name.toLowerCase().replace(/[-_]/g, ' '); 
    const conflictComp = COMPANIES.find(c => c.id !== CURRENT_COMPANY && c.keywords.some(kw => fileNameNorm.includes(kw))); 
    if (conflictComp) { showToast(`❌ Cảnh báo: File này có thể của "${conflictComp.name}"!`, 'error'); e.target.value = ""; return; } 
    
    const btnText = document.querySelector('.upload-text'); if(btnText) btnText.innerText = "⏳ Đang xử lý..."; 
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
                    company: CURRENT_COMPANY,
                    uploader: window.myIdentity || "Ẩn danh" 
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
            } else { showToast("❌ File không đúng định dạng FB Ads!", 'error'); if(btnText) btnText.innerText = "Upload Excel"; } 
        } catch (err) { showToast("Lỗi: " + err.message, 'error'); if(btnText) btnText.innerText = "Upload Excel"; } 
    }; 
    reader.readAsArrayBuffer(file); 
}

function handleRevenueUpload(input) { 
    if(isGuestMode()) return showToast("Tài khoản khách không có quyền Upload!", "error");
    if(!ACTIVE_BATCH_ID) { showToast("⚠️ Chọn file Ads trước!", 'warning'); return; } 
    const file = input.files[0]; if(!file) return; 
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
            
            if(colNameIdx === -1 || colRevIdx === -1) { 
                showToast("❌ Thiếu cột Tên nhóm hoặc Doanh thu", 'error'); 
                return; 
            } 
            
            let revenueMap = {}; 
            for(let i=headerIdx+1; i<json.length; i++) { 
                const r = json[i]; 
                if(!r || !r[colNameIdx]) continue; 
                const name = r[colNameIdx].toString().trim(); 
                let rev = parseCleanNumber(r[colRevIdx]); 
                revenueMap[name] = rev; 
            } 
            
            let updateCount = 0; 
            const updates = {}; 
            
            db.ref('ads_data').orderByChild('batchId').equalTo(ACTIVE_BATCH_ID).once('value', snapshot => { 
                if(!snapshot.exists()) { showToast("Lỗi dữ liệu", 'error'); return; } 
                
                snapshot.forEach(child => { 
                    const item = child.val(); 
                    const key = child.key; 
                    if (revenueMap[item.fullName] !== undefined) { 
                        updates['/ads_data/' + key + '/revenue'] = revenueMap[item.fullName]; 
                        updateCount++; 
                    } 
                }); 
                
                if (updateCount > 0) { 
                    updates[`/upload_logs/${ACTIVE_BATCH_ID}/revenueFileName`] = file.name;
                    updates[`/upload_logs/${ACTIVE_BATCH_ID}/revenueTime`] = new Date().toISOString();

                    db.ref().update(updates).then(() => { 
                        showToast(`✅ Cập nhật doanh thu: ${updateCount} bài`, 'success'); 
                        switchAdsTab('finance'); 
                    }); 
                } else { 
                    showToast("⚠️ Không khớp bài quảng cáo nào", 'warning'); 
                } 
            }); 
        } catch(err) { showToast(err.message, 'error'); } 
    }; 
    reader.readAsArrayBuffer(file); 
    input.value = ""; 
}

function handleStatementUpload(input) { 
    if(isGuestMode()) return showToast("Tài khoản khách không có quyền Upload!", "error");
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
                
                updates[`/upload_logs/${ACTIVE_BATCH_ID}/statementFileName`] = file.name;
                updates[`/upload_logs/${ACTIVE_BATCH_ID}/statementTime`] = new Date().toISOString();

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

function deleteUploadBatch(batchId, fileName) { 
    if(!window.IS_ADMIN) return showToast("Bạn không có quyền XÓA dữ liệu!", "error");
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

function parseDataCore(rows) { 
    if (rows.length < 2) return []; 
    let headerIndex = -1, colNameIdx = -1, colSpendIdx = -1, colResultIdx = -1, colStartIdx = -1, colEndIdx = -1, colImpsIdx = -1, colClicksIdx = -1; 
    
    for (let i = 0; i < Math.min(rows.length, 15); i++) { 
        const row = rows[i]; 
        if (!row) continue; 
        const rowStr = row.map(c => c ? c.toString().toLowerCase().trim() : "").join("|"); 
        
        if (rowStr.includes("tên nhóm") && (rowStr.includes("số tiền") || rowStr.includes("amount"))) { 
            headerIndex = i; 
            row.forEach((cell, idx) => { 
                if(!cell) return; 
                const txt = cell.toString().toLowerCase().trim(); 
                if (txt.includes("tên nhóm")) colNameIdx = idx; 
                if (txt.includes("số tiền đã chi") || txt.includes("amount spent")) colSpendIdx = idx; 
                if (txt === "kết quả" || txt === "results") colResultIdx = idx; 
                if (txt.includes("bắt đầu") && !txt.includes("báo cáo")) colStartIdx = idx; 
                if (txt.includes("kết thúc") && !txt.includes("báo cáo")) colEndIdx = idx; 
                if (txt.includes("hiển thị") || txt.includes("impression")) colImpsIdx = idx; 
                if (txt.includes("lượt click") || txt.includes("nhấp")) colClicksIdx = idx; 
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
        let imps = parseCleanNumber(row[colImpsIdx]); 
        let clicks = parseCleanNumber(row[colClicksIdx]); 
        
        let rawStart = (colStartIdx > -1 && row[colStartIdx]) ? row[colStartIdx] : ""; 
        let rawEnd = (colEndIdx > -1 && row[colEndIdx]) ? row[colEndIdx] : ""; 
        let displayStart = formatExcelDate(rawStart); 
        let displayEnd = formatExcelDate(rawEnd); 
        
        let status = "Đã tắt"; 
        let endStr = rawEnd ? rawEnd.toString().trim().toLowerCase() : ""; 
        if (endStr.includes("đang diễn ra") || endStr.includes("ongoing")) { status = "Đang chạy"; } 
        
        let rawNameStr = rawName.toString().trim(); 
        let firstHyphenIndex = rawNameStr.indexOf('-'); 
        let employee = "KHÁC"; 
        let adName = "Chung"; 
        if (firstHyphenIndex !== -1) { 
            employee = rawNameStr.substring(0, firstHyphenIndex).trim().toUpperCase(); 
            adName = rawNameStr.substring(firstHyphenIndex + 1).trim(); 
        } else { 
            employee = rawNameStr.toUpperCase(); 
        } 
        
        parsedData.push({ 
            fullName: rawNameStr, employee: employee, adName: adName, 
            spend: spend, result: result, clicks: clicks, impressions: imps, 
            run_start: displayStart, run_end: displayEnd, status: status 
        }); 
    } 
    return parsedData; 
}

function loadAdsData() { if(!db) return; db.ref('ads_data').on('value', snapshot => { const data = snapshot.val(); if(!data) { GLOBAL_ADS_DATA = []; applyFilters(); return; } GLOBAL_ADS_DATA = Object.values(data); applyFilters(); }); }

function applyFilters() {
    let filtered = GLOBAL_ADS_DATA.filter(item => item.company === CURRENT_COMPANY);
    if(ACTIVE_BATCH_ID) { filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID); }
    filtered.sort((a,b) => { const empCompare = a.employee.localeCompare(b.employee); if (empCompare !== 0) return empCompare; return b.spend - a.spend; });

    CURRENT_FILTERED_DATA = filtered; 

    let totalSpendFB = 0, totalLeads = 0, totalClicks = 0, totalImps = 0, totalRevenue = 0, totalCostAll = 0;
    filtered.forEach(item => {
        totalSpendFB += item.spend; totalLeads += item.result; totalClicks += (item.clicks || 0); totalImps += (item.impressions || 0);
        const vat = item.spend * 0.1; const fee = item.fee || 0; const total = item.spend + vat + fee; totalCostAll += total; totalRevenue += (item.revenue || 0);
    });

    if(CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
        const pSpend = document.getElementById('perf-spend');
        if(pSpend) {
            pSpend.innerText = new Intl.NumberFormat('vi-VN').format(totalSpendFB) + " ₫";
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
        }
    }

    renderPerformanceTable(filtered);
    renderFinanceTable(filtered);

    if(CURRENT_TAB === 'performance') drawChartPerf(filtered); 
    else if(CURRENT_TAB === 'finance') drawChartFin(filtered);
    else if(CURRENT_TAB === 'trend') drawChartTrend(); 
}

function renderPerformanceTable(data) { const tbody = document.getElementById('ads-table-perf'); if(!tbody) return; tbody.innerHTML = ""; data.slice(0, 300).forEach(item => { const cpl = item.result > 0 ? Math.round(item.spend/item.result) : 0; let statusHtml = item.status === 'Đang chạy' ? '<span style="color:#0f9d58; font-weight:bold;">● Đang chạy</span>' : `<span style="color:#666; font-weight:bold;">Đã tắt</span><br><span style="font-size:9px; color:#888;">${item.run_end || ''}</span>`; const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #f0f0f0"; tr.innerHTML = `<td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td><td class="text-left" style="color:#333;">${item.adName}</td><td class="text-center">${statusHtml}</td><td class="text-right" style="font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td><td class="text-center" style="font-weight:bold;">${item.result}</td><td class="text-right" style="color:#666;">${new Intl.NumberFormat('vi-VN').format(cpl)}</td><td class="text-center" style="font-size:10px; color:#555;">${item.run_start}</td>`; tbody.appendChild(tr); }); }

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
        
        let rowClass = '';
        let roasHtml = '-';

        if (total > 0 || item.spend > 0) {
            let roasVal = roas.toFixed(2) + 'x';
            if (roas >= 8.0) {
                rowClass = 'roas-good';
                roasHtml = `<div style="display:inline-flex; align-items:center; gap:4px; background:#e6f4ea; color:#137333; padding:3px 10px; border-radius:12px; border:1px solid #ceead6; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.05);"><span style="font-weight:900;">${roasVal}</span><span style="font-size:11px;">✅</span></div>`;
            } else if (roas < 2.0) { 
                rowClass = 'roas-bad';
                roasHtml = `<div style="display:inline-flex; align-items:center; gap:4px; background:#fce8e6; color:#d93025; padding:3px 10px; border-radius:12px; border:1px solid #fad2cf; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.05);"><span style="font-weight:900;">${roasVal}</span><span style="font-size:11px;">❗</span></div>`;
            } else {
                roasHtml = `<span style="font-weight:bold; color:#f4b400; font-size:12px;">${roasVal}</span>`;
            }
        }

        const tr = document.createElement('tr'); 
        if (rowClass) { tr.classList.add(rowClass); }
        
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

function exportFinanceToExcel() {
    if (!CURRENT_FILTERED_DATA || CURRENT_FILTERED_DATA.length === 0) {
        showToast("⚠️ Không có dữ liệu để xuất!", "warning");
        return;
    }

    if (window.EXCEL_STYLE_LOADED !== true) {
        showToast("⏳ Đang tải thư viện Excel nâng cao, vui lòng click lại sau 1 giây...", "warning");
        return;
    }

    const exportData = CURRENT_FILTERED_DATA.map(item => {
        const vat = item.spend * 0.1;
        const fee = item.fee || 0;
        const total = item.spend + vat + fee;
        const rev = item.revenue || 0;
        const roas = total > 0 ? parseFloat((rev / total).toFixed(2)) : 0;

        return {
            "Nhân Viên": item.employee,
            "Bài Quảng Cáo": item.adName,
            "Chi Tiêu FB (VNĐ)": item.spend,
            "VAT 10% (VNĐ)": vat,
            "Phí Sao Kê (VNĐ)": fee,
            "TỔNG CHI (VNĐ)": Math.round(total),
            "DOANH THU (VNĐ)": rev,
            "ROAS": roas
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [ { wch: 25 }, { wch: 60 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 10 } ];

    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        fill: { fgColor: { rgb: "1A73E8" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: {style: "thin", color: {rgb: "DDDDDD"}}, bottom: {style: "thin", color: {rgb: "DDDDDD"}}, left: {style: "thin", color: {rgb: "DDDDDD"}}, right: {style: "thin", color: {rgb: "DDDDDD"}} }
    };

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_ref = XLSX.utils.encode_cell({c: C, r: 0});
        if (ws[cell_ref]) ws[cell_ref].s = headerStyle;
    }

    for (let R = 1; R <= range.e.r; ++R) {
        const roasCell = ws[XLSX.utils.encode_cell({c: 7, r: R})];
        const totalCell = ws[XLSX.utils.encode_cell({c: 5, r: R})];
        
        const roas = roasCell ? parseFloat(roasCell.v) : 0;
        const totalSpend = totalCell ? parseFloat(totalCell.v) : 0;
        
        let bgColor = "FFFFFF"; 
        if (totalSpend > 0) {
            if (roas >= 8.0) bgColor = "E6F4EA"; 
            else if (roas < 2.0) bgColor = "FCE8E6"; 
            else if (R % 2 === 0) bgColor = "F8F9FA"; 
        } else {
            if (R % 2 === 0) bgColor = "F8F9FA";
        }

        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_ref = XLSX.utils.encode_cell({c: C, r: R});
            if (!ws[cell_ref]) continue;
            
            ws[cell_ref].s = {
                fill: { fgColor: { rgb: bgColor } },
                font: { sz: 11, color: { rgb: "333333" } },
                border: { top: {style: "thin", color: {rgb: "EEEEEE"}}, bottom: {style: "thin", color: {rgb: "EEEEEE"}}, left: {style: "thin", color: {rgb: "EEEEEE"}}, right: {style: "thin", color: {rgb: "EEEEEE"}} },
                alignment: { vertical: "center" }
            };
            
            if (C >= 2 && C <= 6) {
                ws[cell_ref].z = '#,##0'; 
                if (C === 3) ws[cell_ref].s.font.color = { rgb: "D93025" }; 
                if (C === 4) ws[cell_ref].s.font.color = { rgb: "E67C73" }; 
                if (C === 5) { ws[cell_ref].s.font.bold = true; ws[cell_ref].s.font.color = { rgb: "000000" }; } 
                if (C === 6) { ws[cell_ref].s.font.bold = true; ws[cell_ref].s.font.color = { rgb: "137333" }; } 
            }
            
            if (C === 7) {
                ws[cell_ref].s.alignment.horizontal = "center";
                ws[cell_ref].s.font.bold = true;
                if (roas >= 8.0) ws[cell_ref].s.font.color = { rgb: "137333" };
                else if (totalSpend > 0 && roas < 2.0) ws[cell_ref].s.font.color = { rgb: "D93025" };
                else ws[cell_ref].s.font.color = { rgb: "F4B400" };
            }
            
            if (C === 0) { ws[cell_ref].s.font.bold = true; ws[cell_ref].s.font.color = { rgb: "1A73E8" }; }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TaiChinh_ROAS");
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `BaoCao_TaiChinh_ROAS_${dateStr}.xlsx`;

    try {
        XLSX.writeFile(wb, fileName);
        showToast("✅ Đã xuất báo cáo Excel thành công!", "success");
        
        if (db) {
            db.ref('export_logs').push({
                timestamp: new Date().toISOString(),
                exporter: window.myIdentity || "Khách",
                company: CURRENT_COMPANY,
                recordCount: CURRENT_FILTERED_DATA.length
            });
        }
    } catch (err) {
        console.error(err);
        showToast("⚠️ Xuất file chuẩn...", "warning");
        XLSX.writeFile(wb, fileName); 
    }
}

// ======================================
// CÁC HÀM VẼ BIỂU ĐỒ (DÙNG CHART JS NẾU CÓ)
// ======================================
function drawChartPerf(data) { 
    try { 
        const ctx = document.getElementById('chart-ads-perf'); 
        if(!ctx) return; 
        if (typeof Chart === 'undefined') return; // Chặn lỗi nếu Chart chưa tải xong

        if(window.myAdsChart) window.myAdsChart.destroy(); 
        
        let agg = {}; 
        data.forEach(item => { 
            if(!agg[item.employee]) agg[item.employee] = { spend: 0, result: 0 }; 
            agg[item.employee].spend += item.spend; 
            agg[item.employee].result += item.result; 
        }); 
        
        const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.spend - a.spend).slice(0, 10); 
        
        window.myAdsChart = new Chart(ctx, { 
            type: 'bar', 
            data: { 
                labels: sorted.map(i => i.name), 
                datasets: [
                    { label: 'Chi Tiêu (FB)', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' }, 
                    { label: 'Kết Quả', data: sorted.map(i => i.result), backgroundColor: '#1a73e8', yAxisID: 'y1' }
                ] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { display: false, position: 'left' }, 
                    y1: { display: false, position: 'right' } 
                } 
            } 
        }); 
    } catch(e) { console.error("Chart Error", e); } 
}

function drawChartFin(data) { 
    try { 
        const ctx = document.getElementById('chart-ads-fin'); 
        if(!ctx) return; 
        if (typeof Chart === 'undefined') return;

        if(window.myAdsChart) window.myAdsChart.destroy(); 
        
        let agg = {}; 
        data.forEach(item => { 
            if(!agg[item.employee]) agg[item.employee] = { cost: 0, rev: 0 }; 
            agg[item.employee].cost += (item.spend * 1.1) + (item.fee || 0); 
            agg[item.employee].rev += (item.revenue || 0); 
        }); 
        
        const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.cost - a.cost).slice(0, 10); 
        
        window.myAdsChart = new Chart(ctx, { 
            type: 'bar', 
            data: { 
                labels: sorted.map(i => i.name), 
                datasets: [
                    { label: 'Tổng Chi Phí (All)', data: sorted.map(i => i.cost), backgroundColor: '#d93025', order: 2 }, 
                    { label: 'Doanh Thu', data: sorted.map(i => i.rev), backgroundColor: '#137333', order: 3 }, 
                    { label: 'ROAS', data: sorted.map(i => i.cost > 0 ? (i.rev / i.cost) : 0), type: 'line', borderColor: '#f4b400', backgroundColor: '#f4b400', borderWidth: 3, pointRadius: 4, yAxisID: 'y1', order: 1 }
                ] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                interaction: { mode: 'index', intersect: false }, 
                scales: { 
                    y: { type: 'linear', display: true, position: 'left', beginAtZero: true }, 
                    y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } } 
                } 
            } 
        }); 
    } catch(e) { console.error("Chart Error", e); } 
}

function drawChartTrend() {
    try {
        const ctx = document.getElementById('chart-ads-trend');
        if(!ctx) return;
        if (typeof Chart === 'undefined') return;

        if(window.myAdsTrendChart) window.myAdsTrendChart.destroy();

        const companyData = GLOBAL_ADS_DATA.filter(item => item.company === CURRENT_COMPANY);

        let batchDateMap = {};
        GLOBAL_HISTORY_LIST.forEach(([key, log]) => {
            const d = new Date(log.timestamp);
            batchDateMap[key] = { timeStr: ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2), ts: d.getTime() };
        });

        let agg = {};
        companyData.forEach(item => {
            const bId = item.batchId;
            if (!bId || !batchDateMap[bId]) return;
            
            if(!agg[bId]) agg[bId] = { spend: 0, result: 0, cost: 0, rev: 0, ts: batchDateMap[bId].ts, label: batchDateMap[bId].timeStr };
            
            agg[bId].spend += item.spend;
            agg[bId].result += item.result;
            agg[bId].cost += (item.spend * 1.1) + (item.fee || 0);
            agg[bId].rev += (item.revenue || 0);
        });

        const sorted = Object.values(agg).sort((a,b) => a.ts - b.ts);
        const trendPoints = sorted.slice(-15);

        if(trendPoints.length === 0) return;

        const labels = trendPoints.map(i => i.label);
        const dataCPL = trendPoints.map(i => i.result > 0 ? Math.round(i.spend / i.result) : 0);
        const dataROAS = trendPoints.map(i => i.cost > 0 ? parseFloat((i.rev / i.cost).toFixed(2)) : 0);

        window.myAdsTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Lợi nhuận - ROAS (Hệ số)', data: dataROAS, borderColor: '#137333', backgroundColor: '#137333', borderWidth: 3, pointRadius: 4, yAxisID: 'y_roas', tension: 0.3 },
                    { label: 'Giá 1 Kết Quả - CPL (VNĐ)', data: dataCPL, borderColor: '#d93025', backgroundColor: '#d93025', borderWidth: 2, borderDash: [5, 5], pointRadius: 4, yAxisID: 'y_cpl', tension: 0.3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y_roas: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Chỉ số ROAS', font: {weight: 'bold'} }, beginAtZero: true },
                    y_cpl: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Giá CPL (VNĐ)', font: {weight: 'bold'} }, beginAtZero: true, grid: { drawOnChartArea: false } }
                }
            }
        });
    } catch(e) { console.error("Trend Chart Error", e); }
}

function parseCleanNumber(val) { 
    if (!val) return 0; 
    if (typeof val === 'number') return val; 
    let s = val.toString().trim().replace(/,/g, ''); 
    return parseFloat(s) || 0; 
}
function formatExcelDate(input) { 
    if (!input) return "-"; 
    if (typeof input === 'number') { const date = new Date((input - 25569) * 86400 * 1000); return formatDateObj(date); } 
    const str = input.toString().trim(); 
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) { const parts = str.split('-'); return `${parts[2]}-${parts[1]}-${parts[0]}`; } 
    return str; 
}
function formatDateObj(d) { 
    if (isNaN(d.getTime())) return "-"; 
    const day = ("0" + d.getDate()).slice(-2); 
    const month = ("0" + (d.getMonth() + 1)).slice(-2); 
    const year = d.getFullYear(); 
    return `${day}-${month}-${year}`; 
}

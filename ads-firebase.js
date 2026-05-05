/**
 * ADS MODULE V88 (BẢN FINAL - CHUẨN 32 KỊCH BẢN MEDIA BUYING)
 * - FIX LỖI SẬP CHART: Loại bỏ plugin gây trắng Tab 3.
 * - FIX LỖI POPUP: Thêm hàm escapeHtml bọc thép dữ liệu chống gãy Layout khi click.
 * - LOGIC: Mốc Máy Học 500k. Đạt <= 2 điều kiện mới TẮT. ROAS > 2 là kim bài miễn tử.
 * - Gộp cột Giá Tin và Giá Đơn (CPA) đồng bộ trên tất cả các bảng.
 */

if (!window.EXCEL_STYLE_LOADED) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    script.onload = () => { window.EXCEL_STYLE_LOADED = true; };
    document.head.appendChild(script);
    window.EXCEL_STYLE_LOADED = 'loading';
}

if (!window.CHART_JS_LOADED) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => { 
        window.CHART_JS_LOADED = true; 
        if(typeof applyFilters === 'function') applyFilters();
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

let RAW_UPLOAD_LOGS = {};
let RAW_EXPORT_LOGS = {};

let CURRENT_FILTERED_DATA = []; 
let SHOW_ALL_HISTORY = false;
let HISTORY_SEARCH_TERM = "";

let ACTIVE_BATCH_ID = null;
let CURRENT_TAB = 'performance'; 
let CURRENT_COMPANY = 'NNV'; 
let USER_EXPLICIT_VIEW_ALL = false; 

let VIEW_MODE = 'employee'; 
let SORT_MODE = 'spend'; 
let DATE_FROM = '';
let DATE_TO = '';

// HÀM CHỐNG LỖI HTML INJECTION KHI TÊN AD CÓ CHỨA KÝ TỰ <, >
function escapeHtml(unsafe) {
    return (unsafe || "").toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function initAdsAnalysis() {
    console.log("Ads Module V88 Loaded");
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

    window.changeViewMode = function(mode) {
        VIEW_MODE = mode;
        if (mode === 'employee') {
            SORT_MODE = 'spend'; 
        } else if (mode === 'product') {
            SORT_MODE = 'purchases'; 
        }
        const sortEl = document.getElementById('sort-mode-selector');
        if (sortEl) sortEl.value = SORT_MODE;
        applyFilters();
    };

    window.changeSortMode = function(mode) {
        SORT_MODE = mode;
        applyFilters();
    };

    window.applyDateFilter = function() {
        DATE_FROM = document.getElementById('date-from').value;
        DATE_TO = document.getElementById('date-to').value;
        if (DATE_FROM || DATE_TO) {
            ACTIVE_BATCH_ID = null;
            USER_EXPLICIT_VIEW_ALL = true; 
            renderHistoryUI(); 
        }
        applyFilters();
    };

    window.clearDateFilter = function() {
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        DATE_FROM = '';
        DATE_TO = '';
        USER_EXPLICIT_VIEW_ALL = false; 
        updateHistoryAndExport(); 
    };

    window.triggerRevenueUpload = () => {
        if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");
        if(!ACTIVE_BATCH_ID) return showToast("⚠️ Vui lòng chọn 1 File Ads trong lịch sử trước!", "warning");
        const input = document.getElementById('revenue-file-input');
        if(input) input.click();
    };
    
    window.triggerStatementUpload = () => {
        if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");
        if(!ACTIVE_BATCH_ID) return showToast("⚠️ Vui lòng chọn 1 File Ads trong lịch sử trước!", "warning");
        const input = document.getElementById('statement-file-input');
        if(input) input.click();
    };

    enforceGuestRestrictions();
}

function isGuestMode() { return (window.myIdentity && window.myIdentity.includes("Khách")); }
function isViewOnlyMode() { return (window.USER_PERMISSIONS && window.USER_PERMISSIONS.ads === 'view'); }
function isSuperAdmin() {
    if (window.myIdentity === "SUPER_ADMIN") return true;
    if (window.SYS_DB_USERS) {
        for (let k in window.SYS_DB_USERS) {
            if (window.SYS_DB_USERS[k].name === window.myIdentity && window.SYS_DB_USERS[k].role === 'admin') return true;
        }
    }
    return false;
}

function enforceGuestRestrictions() {
    setTimeout(() => {
        if (isGuestMode() || isViewOnlyMode()) {
            const upArea = document.getElementById('ads-upload-area');
            if(upArea) upArea.style.display = 'none';
            const upRow = document.getElementById('upload-buttons-row');
            if(upRow) upRow.style.display = 'none';
            document.querySelectorAll('.delete-btn-admin').forEach(btn => btn.style.display = 'none');
        }
    }, 500);
}

function formatDateTime(isoString) {
    if(!isoString) return "";
    const d = new Date(isoString);
    if(isNaN(d)) return "";
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

function getProductGroupKey(adName) {
    if (!adName) return "Chưa xác định";
    const matches = [...adName.matchAll(/\(([^)]+)\)/g)];
    if (matches.length > 0) {
        return matches.map(m => m[1]).join(', ').trim(); 
    }
    return adName.replace(/\s+/g, ' ').trim();
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
        
        .kpi-section { display: none; animation: fadeIn 0.3s; }
        .kpi-section.active { display: grid; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .table-responsive { overflow-x: auto; border: 1px solid #eee; border-radius: 4px; position: relative; }
        .ads-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #fff; font-family: sans-serif; font-size: 11px; min-width: 900px; }
        .ads-table th { position: sticky; top: 0; z-index: 10; background: #f5f5f5; color: #333; text-transform: uppercase; font-weight: bold; padding: 8px; border-bottom: 2px solid #ddd; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1); }
        .ads-table td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }

        tr.roas-good td { background-color: #e6f4ea !important; }
        tr.roas-bad td { background-color: #fce8e6 !important; }

        .btn-export-excel { background:#137333; color:white; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:8px; transition:0.2s; box-shadow: 0 2px 6px rgba(19,115,51,0.2); text-transform:uppercase; letter-spacing:0.5px;}
        .btn-export-excel:hover { background:#0d5323; transform:translateY(-2px); box-shadow: 0 4px 12px rgba(19,115,51,0.3); }

        .btn-toggle-history { background:#fff; color:#5f6368; border:1px solid #dadce0; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; display:inline-flex; align-items:center; gap:5px; transition:0.2s; }
        .btn-toggle-history:hover { background:#f8f9fa; border-color:#9aa0a6; }

        .btn-view-all { background: #1a73e8; color: #fff; border: none; padding: 4px 12px; border-radius: 20px; cursor: pointer; font-size: 10px; font-weight: bold; white-space: nowrap; transition: 0.2s; box-shadow: 0 2px 5px rgba(26,115,232,0.2); }
        .btn-view-all:hover { background: #1557b0; transform: translateY(-1px); }

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

        .diag-btn { cursor: pointer; transition: transform 0.1s; display: inline-block; }
        .diag-btn:hover { transform: scale(1.05); }
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
                .company-select-container { background: #e8f0fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #1a73e8; display: flex; align-items: center; justify-content: space-between; flex-wrap:wrap; gap:15px;}
                .company-select { padding: 6px 12px; font-size: 14px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold; color: #1a73e8; min-width: 150px; }
                .ads-tabs { display: flex; border-bottom: 2px solid #ddd; margin-bottom: 15px; overflow-x:auto; }
                .ads-tab-btn { padding: 10px 15px; cursor: pointer; font-weight: bold; color: #666; border: none; background: none; border-bottom: 3px solid transparent; transition: all 0.3s; font-size: 12px; white-space:nowrap; }
                .ads-tab-btn:hover { background: #f9f9f9; color: #1a73e8; }
                .ads-tab-btn.active { color: #1a73e8; border-bottom: 3px solid #1a73e8; background: #f8fbff; }
                .ads-tab-content { display: none; animation: fadeIn 0.3s; }
                .ads-tab-content.active { display: block; }
                .text-left { text-align: left; } .text-right { text-align: right; } .text-center { text-align: center; }
            </style>

            <div class="company-select-container">
                <div style="display:flex; gap:15px; flex-wrap:wrap; align-items:flex-end;">
                    <div>
                        <div style="font-size:10px; color:#666; font-weight:bold; margin-bottom:4px;">🏢 ĐANG LÀM VIỆC VỚI:</div>
                        <select id="company-selector" class="company-select" onchange="window.changeCompany(this.value)">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div>
                        <div style="font-size:10px; color:#666; font-weight:bold; margin-bottom:4px;">👀 GÓC NHÌN BÁO CÁO:</div>
                        <select id="view-mode-selector" class="company-select" onchange="window.changeViewMode(this.value)">
                            <option value="employee">Theo Chiến Dịch</option>
                            <option value="product">Theo Sản Phẩm (SKU)</option>
                        </select>
                    </div>
                    <div>
                        <div style="font-size:10px; color:#666; font-weight:bold; margin-bottom:4px;">📊 BIỂU ĐỒ SẮP XẾP THEO:</div>
                        <select id="sort-mode-selector" class="company-select" onchange="window.changeSortMode(this.value)">
                            <option value="spend">Tiền Đã Chi</option>
                            <option value="purchases">Lượt Mua</option>
                            <option value="messages">Lượt Tin Nhắn</option>
                            <option value="cr">Tỷ Lệ Mua/Tin</option>
                        </select>
                    </div>
                </div>
                
                <div style="background:#fff; padding:8px 12px; border-radius:6px; border:1px solid #ccc; display:flex; align-items:center; gap: 8px;">
                    <span style="font-weight:bold; color:#666; font-size:11px;">LỌC:</span>
                    <input type="date" id="date-from" style="border:1px solid #eee; border-radius:4px; padding:2px 4px; outline:none; font-size:12px; color:#333;" onchange="window.applyDateFilter()">
                    <span style="font-weight:bold; color:#666; font-size:11px;">ĐẾN</span>
                    <input type="date" id="date-to" style="border:1px solid #eee; border-radius:4px; padding:2px 4px; outline:none; font-size:12px; color:#333;" onchange="window.applyDateFilter()">
                    <button onclick="window.clearDateFilter()" style="border:none; background:#fce8e6; color:#d93025; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px; transition:0.2s;">❌</button>
                </div>
            </div>

            <div class="ads-tabs">
                <button class="ads-tab-btn active" onclick="window.switchAdsTab('performance')" id="btn-tab-perf">📊 1. HIỆU QUẢ</button>
                <button class="ads-tab-btn" onclick="window.switchAdsTab('finance')" id="btn-tab-fin">💰 2. TÀI CHÍNH</button>
                <button class="ads-tab-btn" onclick="window.switchAdsTab('trend')" id="btn-tab-trend">🎯 3. MA TRẬN</button>
                <button class="ads-tab-btn" onclick="window.switchAdsTab('report')" id="btn-tab-report">📋 4. XUẤT BÁO CÁO MKT</button>
            </div>

            <div id="tab-report" class="ads-tab-content">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding:10px; background:#e8f0fe; border-radius:8px;">
                    <h2 style="margin:0; font-size:16px; color:#1a73e8; text-transform:uppercase;">Báo Cáo Tổng Hợp MKT Theo File Mẫu</h2>
                    <button class="btn-export-excel" onclick="window.exportReportToExcel()">
                        <span style="font-size: 16px;">📥</span> Xuất File Báo Cáo
                    </button>
                </div>
                <div id="report-preview-container" style="background:#fff; padding:20px; border-radius:8px; border:1px solid #eee; box-shadow:0 2px 10px rgba(0,0,0,0.05); overflow-x:auto;">
                    <p style="text-align:center; color:#999;">Đang tải số liệu...</p>
                </div>
            </div>

            <div id="kpi-performance" class="kpi-section active" style="grid-template-columns: repeat(5, 1fr); gap:8px; margin-bottom:15px;">
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#d93025; font-size:16px;" id="perf-spend">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">CHI PHÍ (Chưa VAT)</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#8e24aa; font-size:16px;" id="perf-msg">0</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">TỔNG TIN NHẮN</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#1a73e8; font-size:16px;" id="perf-leads">0</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">TỔNG LƯỢT MUA</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#333; font-size:16px;" id="perf-cpl">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">CHI PHÍ / ĐƠN</p>
                </div>
                 <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#f4b400; font-size:16px;" id="perf-ctr">0%</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px; font-weight:bold;">TỶ LỆ MUA / TIN</p>
                </div>
            </div>

            <div id="kpi-finance" class="kpi-section" style="grid-template-columns: repeat(5, 1fr); gap:8px; margin-bottom:15px;">
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#d93025; font-size:16px;" id="fin-spend">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">CHI PHÍ (ĐÃ GỒM VAT)</p>
                </div>
                
                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#8e24aa; font-size:16px;" id="fin-statement">0 ₫</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px; font-weight:bold;">TỔNG SAO KÊ</p>
                </div>

                <div class="ads-card" style="background:#fff; padding:10px; border-radius:6px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#1a73e8; font-size:16px;" id="fin-leads">0</h3>
                    <p style="margin:2px 0 0; color:#666; font-size:10px;">TỔNG LƯỢT MUA</p>
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
                                <th class="text-left">Tên Chiến Dịch</th>
                                <th class="text-left">Sản Phẩm Chạy Quảng Cáo</th>
                                <th class="text-center">Trạng Thái</th>
                                <th class="text-right">Chi Phí</th>
                                <th class="text-center">Tin / Mua</th>
                                <th class="text-center">Tỷ Lệ M/T</th>
                                <th class="text-right">Giá Tin<br><span style="font-size:9px; color:#666;">(Giá Đơn)</span></th>
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
                                <th class="text-left">Tên Chiến Dịch</th>
                                <th class="text-left">Sản Phẩm Chạy Quảng Cáo</th>
                                <th class="text-right">Chi Phí<br><span style="font-size:9px; color:#666">(Gốc)</span></th>
                                <th class="text-right" style="color:#d93025;">VAT (10%)</th>
                                <th class="text-right" style="color:#e67c73;">Phí Chênh Lệch</th>
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
                <div style="margin-bottom:10px; background:#f8f9fa; padding:12px; border-radius:8px; border:1px solid #cce5ff; border-left:4px solid #1a73e8;">
                    <span style="font-size:13px; font-weight:800; color:#1a73e8; display:block; margin-bottom:6px; text-transform:uppercase;">💡 TỔ CHỨC 5 TIÊU CHÍ ĐỘC LẬP (Giá Tin &lt; 20k, ROAS &ge; 2, Tần suất &le; 3, Mua/Tin &ge; 20%, CTR &ge; 1%):</span>
                    <div style="font-size:11px; color:#444; display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; line-height:1.4;">
                        <div><span style="color:#d93025; font-weight:bold; background:#fce8e6; padding:2px 4px; border-radius:3px;">❌ CẦN TẮT:</span> Lỗ (ROAS &lt; 2) hoặc Đạt &le; 2 đ/kiện.</div>
                        <div><span style="color:#0f9d58; font-weight:bold; background:#e6f4ea; padding:2px 4px; border-radius:3px;">⭐ HOÀN HẢO:</span> Đạt 5/5 chỉ số (Scale mạnh).</div>
                        <div><span style="color:#f4b400; font-weight:bold; background:#fef7e0; padding:2px 4px; border-radius:3px;">🚀 TIỀM NĂNG LV1:</span> Đạt 4/5 (Rớt 1).</div>
                        <div><span style="color:#ff6d00; font-weight:bold; background:#fff3e0; padding:2px 4px; border-radius:3px;">⚡ CẦN TỐI ƯU:</span> Đạt 3/5 (Rớt 2).</div>
                        <div><span style="color:#d93025; font-weight:bold; background:#fce8e6; padding:2px 4px; border-radius:3px;">⚠️ KÉM:</span> Đạt &le; 2 đ/k nhưng có lãi nhờ ăn may.</div>
                        <div><span style="color:#8e24aa; font-weight:bold; background:#f3e8f5; padding:2px 4px; border-radius:3px;">⏳ MÁY HỌC:</span> Dưới Mốc NS Test (Không tắt).</div>
                    </div>
                </div>
                
                
                <div style="margin-bottom:10px; display:flex; flex-wrap:wrap; gap:15px; align-items:center;">
                    <div>
                        <span style="font-size:11px; color:#666; font-weight:bold;">Mốc Ngân sách Test:</span>
                        <input type="number" id="matrix-test-budget" placeholder="VD: 500000" style="padding:4px; border:1px solid #ccc; border-radius:4px; font-size:12px; width:90px;" onchange="window.applyFilters()">
                    </div>
                    <div>
                        <span style="font-size:11px; color:#666; font-weight:bold;">Mốc Giá Tin (CPM):</span>
                        <input type="number" id="matrix-target-cpm" placeholder="VD: 20000" style="padding:4px; border:1px solid #ccc; border-radius:4px; font-size:12px; width:90px;" onchange="window.applyFilters()">
                    </div>
                </div>

                <div style="height:400px; margin-bottom:15px; background:#fff; padding:10px; border-radius:6px; border:1px solid #eee;">
                    <canvas id="chart-ads-trend"></canvas>
                </div>
            </div>
        `;
        document.getElementById('company-selector').value = CURRENT_COMPANY;
        
        setTimeout(() => {
            let viewEl = document.getElementById('view-mode-selector');
            let sortEl = document.getElementById('sort-mode-selector');
            let fromEl = document.getElementById('date-from');
            let toEl = document.getElementById('date-to');
            if (viewEl) viewEl.value = VIEW_MODE;
            if (sortEl) sortEl.value = SORT_MODE;
            if (fromEl) fromEl.value = DATE_FROM;
            if (toEl) toEl.value = DATE_TO;
        }, 50);
    }

    const uploadArea = document.querySelector('.upload-area');
    if(uploadArea) {
        const oldContainer = document.getElementById('upload-controls-container');
        if(oldContainer) oldContainer.remove();

        const controlsDiv = document.createElement('div');
        controlsDiv.id = 'upload-controls-container';
        
        controlsDiv.innerHTML = `
            <div style="display:flex; gap:10px; margin-top:10px;" id="upload-buttons-row">
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
    
    db.ref('upload_logs').on('value', snapshot => {
        RAW_UPLOAD_LOGS = snapshot.val() || {};
        updateHistoryAndExport();
    });

    db.ref('export_logs').on('value', snapshot => {
        RAW_EXPORT_LOGS = snapshot.val() || {};
        updateHistoryAndExport();
    });
}

function updateHistoryAndExport() {
    GLOBAL_HISTORY_LIST = Object.entries(RAW_UPLOAD_LOGS)
        .filter(([key, log]) => !log.company || log.company === CURRENT_COMPANY)
        .sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
        
    GLOBAL_EXPORT_LIST = Object.values(RAW_EXPORT_LOGS)
        .filter(log => !log.company || log.company === CURRENT_COMPANY)
        .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (GLOBAL_HISTORY_LIST.length > 0) {
        const isActiveValid = GLOBAL_HISTORY_LIST.some(([k, l]) => k === ACTIVE_BATCH_ID);
        if ((!ACTIVE_BATCH_ID || !isActiveValid) && !USER_EXPLICIT_VIEW_ALL) {
            ACTIVE_BATCH_ID = GLOBAL_HISTORY_LIST[0][0]; 
        }
    } else {
        ACTIVE_BATCH_ID = null;
    }
        
    renderHistoryUI();
    renderExportUI();
    
    applyFilters(); 
}

function searchHistory(val) { HISTORY_SEARCH_TERM = val.toLowerCase(); renderHistoryUI(); }
function toggleHistoryView() { SHOW_ALL_HISTORY = !SHOW_ALL_HISTORY; renderHistoryUI(); }

function selectUploadBatch(id) { 
    if (ACTIVE_BATCH_ID === id) { 
        ACTIVE_BATCH_ID = null; 
        USER_EXPLICIT_VIEW_ALL = true; 
    } else { 
        ACTIVE_BATCH_ID = id; 
        USER_EXPLICIT_VIEW_ALL = false; 
        
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        DATE_FROM = ''; DATE_TO = '';
    }
    renderHistoryUI(); 
    applyFilters(); 
}

function viewAllData() { 
    ACTIVE_BATCH_ID = null; 
    USER_EXPLICIT_VIEW_ALL = true; 
    renderHistoryUI(); 
    applyFilters(); 
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
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#999; font-size:10px;'>Không tìm thấy file</td></tr>"; 
        if(btnMore) btnMore.style.display = 'none'; 
        return; 
    }
    
    let displayList = filtered;
    if (!HISTORY_SEARCH_TERM && !SHOW_ALL_HISTORY) { 
        displayList = filtered.slice(0, 5); 
    }

    let html = "";
    
    let validBatchIds = new Set();
    if (DATE_FROM || DATE_TO) {
        let fromTs = DATE_FROM ? new Date(DATE_FROM).setHours(0,0,0,0) : 0;
        let toTs = DATE_TO ? new Date(DATE_TO).setHours(23,59,59,999) : Infinity;
        GLOBAL_HISTORY_LIST.forEach(([key, log]) => {
            let ts = new Date(log.timestamp).getTime();
            if (ts >= fromTs && ts <= toTs) validBatchIds.add(key);
        });
    }

    displayList.forEach(([key, log]) => {
        const timeStr = formatDateTime(log.timestamp);
        const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
        
        const isActive = (key === ACTIVE_BATCH_ID) || validBatchIds.has(key);
        const activeStyle = isActive ? 'background:#e8f0fe; border-left:4px solid #1a73e8;' : 'border-left:4px solid transparent;';
        
        const deleteBtn = isSuperAdmin() ? `<button class="delete-btn-admin" onclick="window.deleteUploadBatch('${key}', '${escapeHtml(log.fileName)}')">XÓA</button>` : '';
        const uploaderName = log.uploader || "Hệ thống cũ";

        html += `
            <tr data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer; ${activeStyle}" onclick="window.selectUploadBatch('${key}')">
                <td style="padding:8px 4px 8px 10px; font-size:10px; width:110px; vertical-align:middle; color:#666;">${timeStr}</td>
                <td style="padding:8px 4px; vertical-align:middle;">
                    <div style="font-weight:${isActive ? '800' : '600'}; color:${isActive ? '#1a73e8' : '#333'}; word-break:break-word; font-size:11px; line-height:1.2;">
                        📊 ${escapeHtml(log.fileName)}
                    </div>
                    <div class="user-badge">👤 ${escapeHtml(uploaderName)}</div>
                </td>
                <td style="padding:8px 4px; text-align:right; font-size:10px; font-weight:bold; color:#1a73e8; width:80px; vertical-align:middle;">${money}</td>
                <td style="padding:8px 0; text-align:center; width:50px; vertical-align:middle;">
                    ${deleteBtn}
                </td>
            </tr>
        `;

        if (isActive) {
            let childFiles = [];
            if (log.revenueFileName) {
                const revUploader = log.revenueUploader ? ` • 👤 ${log.revenueUploader}` : '';
                childFiles.push({ icon: '💰', name: log.revenueFileName, color: '#137333', time: log.revenueTime, uploader: revUploader });
            }
            if (log.statementFileName) {
                const stateUploader = log.statementUploader ? ` • 👤 ${log.statementUploader}` : '';
                childFiles.push({ icon: '💸', name: log.statementFileName, color: '#d93025', time: log.statementTime, uploader: stateUploader });
            }

            if (childFiles.length > 0) {
                childFiles.forEach((file, index) => {
                    const isLast = (index === childFiles.length - 1);
                    const branchChar = isLast ? "└──" : "├──";
                    const timeTag = file.time ? `<span style="font-size:9px; color:#9aa0a6; margin-left:8px; font-style:italic;">🕒 ${formatDateTime(file.time)}${escapeHtml(file.uploader) || ''}</span>` : '';

                    html += `
                        <tr style="background:#f8f9fa; border-left:4px solid #1a73e8;">
                            <td></td>
                            <td colspan="3" style="padding:4px 4px 6px 0; font-size:10px; color:#5f6368;">
                                <span style="color:#ccc; margin-right:5px; font-family: monospace; font-size:12px;">${branchChar}</span>
                                <span style="color:${file.color}; font-weight:bold;">${file.icon} ${escapeHtml(file.name)}</span>
                                <br><span style="margin-left: 20px;">${timeTag}</span>
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
                <td class="text-left"><div class="export-badge">👤 ${escapeHtml(log.exporter) || 'Khách'}</div></td>
                <td class="text-right" style="font-weight:bold; color:#137333;">${log.recordCount} dòng</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function changeCompany(companyId) { 
    CURRENT_COMPANY = companyId; 
    ACTIVE_BATCH_ID = null; 
    USER_EXPLICIT_VIEW_ALL = false; 
    
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    DATE_FROM = ''; DATE_TO = '';
    
    VIEW_MODE = 'employee';
    SORT_MODE = 'spend';
    const viewEl = document.getElementById('view-mode-selector');
    const sortEl = document.getElementById('sort-mode-selector');
    if(viewEl) viewEl.value = VIEW_MODE;
    if(sortEl) sortEl.value = SORT_MODE;

    updateHistoryAndExport(); 
    showToast(`Đã chuyển sang: ${COMPANIES.find(c=>c.id===companyId).name}`, 'success'); 
}

function switchAdsTab(tabName) { 
    CURRENT_TAB = tabName; 
    ['perf', 'fin', 'trend', 'report'].forEach(t => { // Đã thêm 'report'
        let btn = document.getElementById('btn-tab-' + t);
        if(btn) btn.classList.remove('active');
    });
    
    let activeBtnId = 'btn-tab-' + (tabName === 'performance' ? 'perf' : (tabName === 'finance' ? 'fin' : (tabName === 'trend' ? 'trend' : 'report')));
    let activeBtn = document.getElementById(activeBtnId);
    if(activeBtn) activeBtn.classList.add('active');

    ['performance', 'finance', 'trend', 'report'].forEach(t => { // Đã thêm 'report'
        let tab = document.getElementById('tab-' + t);
        if(tab) tab.classList.remove('active');
        let kpi = document.getElementById('kpi-' + t);
        if(kpi) kpi.classList.remove('active');
    });

    let activeTab = document.getElementById('tab-' + tabName);
    if(activeTab) activeTab.classList.add('active');
    
    let activeKpi = document.getElementById('kpi-' + tabName);
    if(activeKpi) activeKpi.classList.add('active');

    // NẾU LÀ TAB REPORT -> GỌI HÀM VẼ GIAO DIỆN
    if(tabName === 'report') {
        renderReportPreview();
    } else {
        applyFilters(); 
    }
}

function handleFirebaseUpload(e) { 
    if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");
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
                    USER_EXPLICIT_VIEW_ALL = false;
                    document.getElementById('date-from').value = '';
                    document.getElementById('date-to').value = '';
                    DATE_FROM = ''; DATE_TO = '';

                    applyFilters(); 
                }); 
            } else { showToast("❌ File không đúng định dạng FB Ads!", 'error'); if(btnText) btnText.innerText = "Upload Excel"; } 
        } catch (err) { showToast("Lỗi: " + err.message, 'error'); if(btnText) btnText.innerText = "Upload Excel"; } 
    }; 
    reader.readAsArrayBuffer(file); 
}

function handleRevenueUpload(input) { 
    if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");
    if(!ACTIVE_BATCH_ID) { showToast("⚠️ Chọn 1 file Ads để đính kèm Doanh thu!", 'warning'); return; } 
    const file = input.files[0]; if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        try { 
            const data = new Uint8Array(e.target.result); 
            const workbook = XLSX.read(data, {type: 'array'}); 
            const sheet = workbook.Sheets[workbook.SheetNames[0]]; 
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); 
            
            let headerIdx = -1, colNameIdx = -1, colAdNameIdx = -1, colRevIdx = -1; 
            
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
                        if(txt.includes("sản phẩm chạy")) colAdNameIdx = idx; 
                        if(txt.includes("doanh thu") || txt.includes("thành tiền")) colRevIdx = idx; 
                    }); 
                    break; 
                } 
            } 
            
            if(colNameIdx === -1 || colRevIdx === -1) { 
                showToast("❌ Thiếu cột Tên nhóm hoặc Doanh thu", 'error'); 
                return; 
            } 
            
            let revenueData = []; 
            for(let i=headerIdx+1; i<json.length; i++) { 
                const r = json[i]; 
                if(!r || !r[colNameIdx]) continue; 
                
                const empName = r[colNameIdx].toString().trim(); 
                const adName = (colAdNameIdx !== -1 && r[colAdNameIdx]) ? r[colAdNameIdx].toString().trim() : "";
                let rev = parseCleanNumber(r[colRevIdx]); 
                
                revenueData.push({ emp: empName, ad: adName, rev: rev });
            } 
            
            let updateCount = 0; 
            const updates = {}; 
            
            db.ref('ads_data').orderByChild('batchId').equalTo(ACTIVE_BATCH_ID).once('value', snapshot => { 
                if(!snapshot.exists()) { showToast("Lỗi dữ liệu", 'error'); return; } 
                
                snapshot.forEach(child => { 
                    const item = child.val(); 
                    const key = child.key; 
                    
                    let matchedRev = undefined;
                    if (colAdNameIdx !== -1) {
                        let dbAdNameCleaned = item.adName ? item.adName.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim() : "";
                        const match = revenueData.find(x => x.emp === item.employee && x.ad === dbAdNameCleaned);
                        if (match) matchedRev = match.rev;
                    } else {
                        const match = revenueData.find(x => x.emp === item.fullName);
                        if (match) matchedRev = match.rev;
                    }

                    if (matchedRev !== undefined) { 
                        updates['/ads_data/' + key + '/revenue'] = matchedRev; 
                        updateCount++; 
                    } 
                }); 
                
                if (updateCount > 0) { 
                    updates[`/upload_logs/${ACTIVE_BATCH_ID}/revenueFileName`] = file.name;
                    updates[`/upload_logs/${ACTIVE_BATCH_ID}/revenueTime`] = new Date().toISOString();
                    updates[`/upload_logs/${ACTIVE_BATCH_ID}/revenueUploader`] = window.myIdentity || "Ẩn danh";

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
    if(isGuestMode() || isViewOnlyMode()) return showToast("Tài khoản của bạn chỉ được phép xem!", "error");
    if(!ACTIVE_BATCH_ID) { showToast("⚠️ Chọn 1 file Ads để đính kèm Sao Kê!", 'warning'); return; } 
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
                    const validHeaders = ['nợ', 'debit', 'ghi nợ', 'phát sinh nợ', 'phát sinh giảm', 'số tiền ghi nợ', 'rút tiền', 'số tiền trừ', 'nợ/ debit'];
                    if(validHeaders.some(kw => txt === kw || txt.includes(kw)) && !txt.includes('có') && !txt.includes('thu') && !txt.includes('số dư') && !txt.includes('balance') && !txt.includes('dư nợ')) { 
                        headerIdx = i; colAmountIdx = idx; 
                    } 
                }); 
                if(colAmountIdx !== -1) break; 
            } 
            
            if(colAmountIdx === -1) { 
                showToast("❌ File sao kê không đúng định dạng. Cần có cột Nợ/ Debit", 'error'); 
                return; 
            } 
            
            let totalStatement = 0; 
            for(let i=headerIdx+1; i<json.length; i++) { 
                const r = json[i]; 
                if(!r) continue; 
                let amt = parseCleanNumber(r[colAmountIdx]); 
                totalStatement += amt; 
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
                const finalFee = totalDiff > 0 ? totalDiff : 0;
                const feePerRow = finalFee / count; 
                
                const updates = {}; 
                snapshot.forEach(child => { updates['/ads_data/' + child.key + '/fee'] = feePerRow; }); 
                
                updates[`/upload_logs/${ACTIVE_BATCH_ID}/statementFileName`] = file.name;
                updates[`/upload_logs/${ACTIVE_BATCH_ID}/statementTime`] = new Date().toISOString();
                updates[`/upload_logs/${ACTIVE_BATCH_ID}/statementUploader`] = window.myIdentity || "Ẩn danh";
                updates[`/upload_logs/${ACTIVE_BATCH_ID}/statementTotal`] = totalStatement;

                db.ref().update(updates).then(() => { 
                    showToast(`✅ Đã nhận Tổng Sao Kê: ${new Intl.NumberFormat('vi-VN').format(totalStatement)}đ`, 'success'); 
                    switchAdsTab('finance'); 
                }); 
            }); 
        } catch(err) { showToast(err.message, 'error'); } 
    }; 
    reader.readAsArrayBuffer(file); 
    input.value = ""; 
}

function deleteUploadBatch(batchId, fileName) { 
    if(!isSuperAdmin()) return showToast("Chỉ Super Admin mới có quyền XÓA file!", "error");
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
    let headerIndex = -1, colNameIdx = -1, colSpendIdx = -1, colResultIdx = -1, colMsgIdx = -1, colStartIdx = -1, colEndIdx = -1, colCtrIdx = -1, colFreqIdx = -1; 
    
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
                if ((txt.includes("số tiền đã chi") || txt.includes("amount spent")) && !txt.includes("chi phí")) colSpendIdx = idx; 
                if (txt === "lượt mua" || txt === "purchase" || txt === "purchases") colResultIdx = idx; 
                if (txt === "tổng số người liên hệ nhắn tin") colMsgIdx = idx; 
                if (txt === "bắt đầu") colStartIdx = idx; 
                if (txt === "kết thúc") colEndIdx = idx; 
                if (txt.includes("ctr (tỷ lệ nhấp vào liên kết)") || txt.includes("ctr (tỷ lệ click vào liên kết)")) colCtrIdx = idx;
                if (txt === "tần suất" || txt.includes("frequency")) colFreqIdx = idx;
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
        
        let result = (colResultIdx > -1) ? parseCleanNumber(row[colResultIdx]) : 0; 
        let messages = (colMsgIdx > -1) ? parseCleanNumber(row[colMsgIdx]) : 0; 
        
        let ctr = colCtrIdx > -1 ? parseCleanNumber(row[colCtrIdx]) : 0;
        let freq = colFreqIdx > -1 ? parseCleanNumber(row[colFreqIdx]) : 0;
        
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
            spend: spend, result: result, messages: messages, ctr: ctr, freq: freq,
            run_start: displayStart, run_end: displayEnd, status: status 
        }); 
    } 
    return parsedData; 
}

function loadAdsData() { 
    if(!db) return; 
    db.ref('ads_data').on('value', snapshot => { 
        const data = snapshot.val(); 
        if(!data) { GLOBAL_ADS_DATA = []; applyFilters(); return; } 
        GLOBAL_ADS_DATA = Object.values(data); 
        applyFilters(); 
    }); 
}

function applyFilters() {
    let filtered = GLOBAL_ADS_DATA.filter(item => item.company === CURRENT_COMPANY);
    
    if (DATE_FROM || DATE_TO) {
        let validBatchIds = new Set();
        let fromTs = DATE_FROM ? new Date(DATE_FROM).setHours(0,0,0,0) : 0;
        let toTs = DATE_TO ? new Date(DATE_TO).setHours(23,59,59,999) : Infinity;
        
        GLOBAL_HISTORY_LIST.forEach(([key, log]) => {
            let ts = new Date(log.timestamp).getTime();
            if (ts >= fromTs && ts <= toTs) {
                validBatchIds.add(key);
            }
        });
        filtered = filtered.filter(item => validBatchIds.has(item.batchId));
    } else if(ACTIVE_BATCH_ID) { 
        filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID); 
    }
    
    if (VIEW_MODE === 'employee') {
        filtered.sort((a,b) => a.employee.localeCompare(b.employee) || b.spend - a.spend);
    } else {
        filtered.sort((a,b) => getProductGroupKey(a.adName).localeCompare(getProductGroupKey(b.adName)) || b.spend - a.spend);
    }

    CURRENT_FILTERED_DATA = filtered; 

    let totalSpendFB = 0, totalLeads = 0, totalMessages = 0, totalRevenue = 0, totalCostAll = 0;
    let totalStatementAmount = 0;
    
    let uniqueBatches = [...new Set(filtered.map(i => i.batchId))];
    uniqueBatches.forEach(bId => {
        const log = GLOBAL_HISTORY_LIST.find(([k, l]) => k === bId);
        if (log && log[1].statementTotal) totalStatementAmount += log[1].statementTotal;
    });

    filtered.forEach(item => {
        totalSpendFB += item.spend; totalLeads += item.result; totalMessages += (item.messages || 0); 
        const vat = item.spend * 0.1; const fee = item.fee || 0; const total = item.spend + vat + fee; 
        totalCostAll += total; totalRevenue += (item.revenue || 0);
    });

    if(CURRENT_TAB === 'performance' || CURRENT_TAB === 'finance') {
        const pSpend = document.getElementById('perf-spend');
        if(pSpend) {
            pSpend.innerText = new Intl.NumberFormat('vi-VN').format(totalSpendFB) + " ₫";
            
            const pMsg = document.getElementById('perf-msg');
            if (pMsg) pMsg.innerText = new Intl.NumberFormat('vi-VN').format(totalMessages);
            
            document.getElementById('perf-leads').innerText = new Intl.NumberFormat('vi-VN').format(totalLeads);
            const avgCpa = totalLeads > 0 ? Math.round(totalSpendFB / totalLeads) : 0;
            document.getElementById('perf-cpl').innerText = new Intl.NumberFormat('vi-VN').format(avgCpa) + " ₫";
            
            const cr = totalMessages > 0 ? ((totalLeads / totalMessages) * 100).toFixed(2) : (totalLeads > 0 ? "100.00" : "0.00");
            const perfCtrEl = document.getElementById('perf-ctr');
            if (perfCtrEl) perfCtrEl.innerText = cr + "%";
            
            const totalSpendWithVat = totalSpendFB * 1.1;
            document.getElementById('fin-spend').innerText = new Intl.NumberFormat('vi-VN').format(totalSpendWithVat) + " ₫";
            
            const finStatement = document.getElementById('fin-statement');
            if(finStatement) finStatement.innerText = new Intl.NumberFormat('vi-VN').format(totalStatementAmount) + " ₫";

            document.getElementById('fin-leads').innerText = new Intl.NumberFormat('vi-VN').format(totalLeads);
            document.getElementById('fin-revenue').innerText = new Intl.NumberFormat('vi-VN').format(totalRevenue) + " ₫";
            const roas = totalCostAll > 0 ? (totalRevenue / totalCostAll) : 0;
            document.getElementById('fin-roas').innerText = roas.toFixed(2) + "x";
        }
    }

    renderPerformanceTable(filtered);
    renderFinanceTable(filtered);

    if(CURRENT_TAB === 'performance') drawChartPerf(filtered); 
    else if(CURRENT_TAB === 'finance') drawChartFin(filtered);
    else if(CURRENT_TAB === 'trend') drawChartTrend(filtered); 
}

function renderPerformanceTable(data) { 
    const tbody = document.getElementById('ads-table-perf'); 
    if(!tbody) return; 
    tbody.innerHTML = ""; 
    data.slice(0, 300).forEach(item => { 
        const cpa = item.result > 0 ? Math.round(item.spend/item.result) : 0; 
        const cpm = (item.messages || 0) > 0 ? Math.round(item.spend/item.messages) : 0;
        const crValue = (item.messages || 0) > 0 ? (item.result / item.messages) * 100 : (item.result > 0 ? 100 : 0);

        let statusHtml = item.status === 'Đang chạy' ? '<span style="color:#0f9d58; font-weight:bold;">● Đang chạy</span>' : `<span style="color:#666; font-weight:bold;">Đã tắt</span><br><span style="font-size:9px; color:#888;">${item.run_end || ''}</span>`; 
        const tr = document.createElement('tr'); 
        tr.style.borderBottom = "1px solid #f0f0f0"; 
        tr.innerHTML = `
            <td class="text-left" style="font-weight:bold; color:#1a73e8;">${escapeHtml(item.employee)}</td>
            <td class="text-left" style="color:#333;">${escapeHtml(item.adName)}</td>
            <td class="text-center">${statusHtml}</td>
            <td class="text-right" style="font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>
            <td class="text-center" style="font-weight:bold;"><span style="color:#ff6d00">${new Intl.NumberFormat('vi-VN').format(item.messages || 0)}</span> / <span style="color:#137333">${new Intl.NumberFormat('vi-VN').format(item.result)}</span></td>
            <td class="text-center" style="font-weight:bold; color:#f4b400;">${crValue.toFixed(1)}%</td>
            <td class="text-right" style="font-weight:bold;">
                <div style="color:#333;">${new Intl.NumberFormat('vi-VN').format(cpm)}</div>
                <div style="font-size:9px; color:#d93025; margin-top:2px;">(Đơn: ${new Intl.NumberFormat('vi-VN').format(cpa)})</div>
            </td>
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
            <td class="text-left" style="font-weight:bold; color:#1a73e8;">${escapeHtml(item.employee)}</td>
            <td class="text-left" style="color:#333;">${escapeHtml(item.adName)}</td>
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

        // Tính tỷ lệ Mua / Tin
        const crValue = (item.messages || 0) > 0 ? (item.result / item.messages) * 100 : (item.result > 0 ? 100 : 0);

        let extractedSKU = "";
        let cleanAdName = item.adName || "";
        if (item.adName) {
            const matches = [...item.adName.matchAll(/\(([^)]+)\)/g)];
            if (matches.length > 0) {
                extractedSKU = matches.map(m => m[1]).join(', '); 
                cleanAdName = item.adName.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
            }
        }

        return {
            "Tên Chiến Dịch": item.employee,
            "Sản Phẩm Chạy Quảng Cáo": cleanAdName, 
            "SKU": extractedSKU,                    
            "Bắt Đầu": item.run_start,
            "Kết Thúc": item.run_end,
            "Ngân sách": "",
            "Tin Nhắn": item.messages || 0,
            "Lượt Mua": item.result || 0,
            "CTR": item.ctr ? item.ctr.toFixed(2) + "%" : "0.00%",         // Thêm ký hiệu % và làm tròn 2 số thập phân
            "Tần Suất": item.freq ? parseFloat(item.freq.toFixed(1)) : 0,  // Làm tròn 1 số thập phân
            "Tỷ lệ Mua/Tin (%)": parseFloat(crValue.toFixed(2)),
            "Chi Phí": item.spend,
            "VAT 10%": vat,
            "Phí Chênh Lệch": fee,
            "TỔNG CHI": Math.round(total),
            "DOANH THU": rev,
            "Tỷ lệ": "",            
            "ROAS": roas,
            "Nhân Viên": item.employee, 
            "Ghi chú": ""            
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Đã thêm 3 cột nên cần cập nhật lại độ rộng (tổng cộng 20 cột)
    ws['!cols'] = [ 
        { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, 
        { wch: 10 }, { wch: 10 }, { wch: 15 }, // Độ rộng 3 cột mới (CTR, Tần suất, Tỷ lệ M/T)
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 25 }
    ];

    const headerStyle = { 
        font: { bold: true, color: { rgb: "000000" }, sz: 12 }, 
        fill: { fgColor: { rgb: "FFFFFF" } }, 
        alignment: { horizontal: "center", vertical: "center" }, 
        border: { 
            top: {style: "thin", color: {rgb: "000000"}}, 
            bottom: {style: "thin", color: {rgb: "000000"}}, 
            left: {style: "thin", color: {rgb: "000000"}}, 
            right: {style: "thin", color: {rgb: "000000"}} 
        } 
    };

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_ref = XLSX.utils.encode_cell({c: C, r: 0});
        if (ws[cell_ref]) ws[cell_ref].s = headerStyle;
    }

    for (let R = 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_ref = XLSX.utils.encode_cell({c: C, r: R});
            
            if (!ws[cell_ref]) {
                ws[cell_ref] = { t: 's', v: '' }; 
            }
            
            ws[cell_ref].s = {
                font: { sz: 11, color: { rgb: "000000" } }, 
                fill: { fgColor: { rgb: "FFFFFF" } }, 
                border: { 
                    top: {style: "thin", color: {rgb: "000000"}}, 
                    bottom: {style: "thin", color: {rgb: "000000"}}, 
                    left: {style: "thin", color: {rgb: "000000"}}, 
                    right: {style: "thin", color: {rgb: "000000"}} 
                }, 
                alignment: { vertical: "center" }
            };
            
            // Cập nhật lại Index canh giữa: Bao gồm cả 3 cột mới (8, 9, 10)
            if ([2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 18].includes(C)) { 
                ws[cell_ref].s.alignment.horizontal = "center"; 
            }

            // Cập nhật lại Index định dạng Tiền (Từ cột 11 đến 15)
            if (C >= 11 && C <= 15) {
                ws[cell_ref].z = '#,##0'; 
                // Cột Tổng Chi (14) và Doanh Thu (15) được in đậm
                if (C === 14 || C === 15) { ws[cell_ref].s.font.bold = true; } 
            }
            
            // Cập nhật lại Index cột ROAS (bị đẩy xuống cột số 17)
            if (C === 17) { 
                ws[cell_ref].s.alignment.horizontal = "center"; 
                ws[cell_ref].s.font.bold = true; 
            }
            
            // Cột Tên Chiến dịch in đậm
            if (C === 0) { ws[cell_ref].s.font.bold = true; }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TaiChinh_ROAS");
    
    const fileCompMap = { 'NNV': 'NongNghiepViet', 'VN': 'VietNhat', 'KF': 'KingFarm', 'ABC': 'ABCVietNam' };
    const compName = fileCompMap[CURRENT_COMPANY] || CURRENT_COMPANY;
    const d = new Date();
    const dateStr = ("0" + d.getDate()).slice(-2) + ("0" + (d.getMonth() + 1)).slice(-2) + d.getFullYear();
    const fileName = `ChiPhiQC_${compName}_${dateStr}.xlsx`;

    try {
        XLSX.writeFile(wb, fileName);
        showToast("✅ Đã xuất báo cáo Excel thành công!", "success");
        if (db) {
            db.ref('export_logs').push({
                timestamp: new Date().toISOString(), exporter: window.myIdentity || "Khách", company: CURRENT_COMPANY, recordCount: CURRENT_FILTERED_DATA.length
            });
        }
    } catch (err) {
        console.error(err);
        showToast("⚠️ Xuất file chuẩn...", "warning");
        XLSX.writeFile(wb, fileName); 
    }
}
function drawChartPerf(data) { 
    try { 
        const ctx = document.getElementById('chart-ads-perf'); 
        if(!ctx || typeof Chart === 'undefined') return; 
        if(window.myAdsChart) window.myAdsChart.destroy(); 
        
        let agg = {}; 
        data.forEach(item => { 
            let groupKey = VIEW_MODE === 'employee' ? item.employee : getProductGroupKey(item.adName);
            
            if(!agg[groupKey]) agg[groupKey] = { spend: 0, result: 0, messages: 0 }; 
            agg[groupKey].spend += item.spend; 
            agg[groupKey].result += item.result; 
            agg[groupKey].messages += (item.messages || 0);
        }); 
        
        const sorted = Object.entries(agg).map(([name, val]) => {
            let cr = val.messages > 0 ? (val.result / val.messages) * 100 : (val.result > 0 ? 100 : 0);
            return { 
                name: name, 
                spend: val.spend, 
                result: val.result,
                messages: val.messages,
                cpa: val.result > 0 ? Math.round(val.spend / val.result) : 0,
                cpm: val.messages > 0 ? Math.round(val.spend / val.messages) : 0,
                cr: parseFloat(cr.toFixed(2))
            };
        }).sort((a,b) => {
            if (SORT_MODE === 'purchases') return b.result - a.result;
            if (SORT_MODE === 'spend') return b.spend - a.spend;
            if (SORT_MODE === 'messages') return b.messages - a.messages;
            if (SORT_MODE === 'cr') return b.cr - a.cr;
            if (VIEW_MODE === 'product') return b.result - a.result;
            return b.spend - a.spend; 
        }).slice(0, 15); 
        
        let barLabel = 'Tiền Đã Chi';
        let barData = sorted.map(i => i.spend);
        let leftAxisTitle = 'Tổng Tiền (VNĐ)';
        
        if (SORT_MODE === 'purchases') {
            barLabel = 'Lượt Mua';
            barData = sorted.map(i => i.result);
            leftAxisTitle = 'Số Lượng Mua (Đơn)';
        } else if (SORT_MODE === 'messages') {
            barLabel = 'Lượt Tin Nhắn';
            barData = sorted.map(i => i.messages);
            leftAxisTitle = 'Số Lượng Tin Nhắn';
        } else if (SORT_MODE === 'cr') {
            barLabel = 'Tỷ Lệ Mua / Tin (%)';
            barData = sorted.map(i => i.cr);
            leftAxisTitle = 'Tỷ Lệ Mua/Tin (%)';
        }

        window.myAdsChart = new Chart(ctx, { 
            type: 'bar', 
            data: { 
                labels: sorted.map(i => i.name), 
                datasets: [
                    { 
                        label: barLabel, 
                        data: barData, 
                        backgroundColor: 'rgba(26, 115, 232, 0.7)', 
                        borderColor: '#1a73e8',
                        borderWidth: 1,
                        yAxisID: 'y',
                        order: 3
                    }, 
                    { 
                        label: 'Giá / Đơn (CPA)', 
                        data: sorted.map(i => i.cpa), 
                        type: 'line', 
                        backgroundColor: '#d93025', 
                        borderColor: '#d93025', 
                        borderWidth: 3, 
                        pointRadius: 5, 
                        pointBackgroundColor: '#fff',
                        yAxisID: 'y1',
                        order: 1
                    },
                    { 
                        label: 'Giá / Tin Nhắn', 
                        data: sorted.map(i => i.cpm), 
                        type: 'line', 
                        backgroundColor: '#FFFF00', 
                        borderColor: '#FFFF00',     
                        borderWidth: 3,             
                        pointRadius: 5, 
                        pointBackgroundColor: '#fff',
                        yAxisID: 'y1',
                        order: 2
                    }
                ] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                interaction: { mode: 'index', intersect: false },
                onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                        const index = elements[0].index;
                        const groupKey = sorted[index].name;
                        window.showGroupDetails(groupKey, data, false);
                    }
                },
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                },
                plugins: {
                    tooltip: {
                        usePointStyle: true, 
                        padding: 12,
                        boxPadding: 6,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 },
                        footerFont: { size: 11, weight: 'normal' },
                        callbacks: {
                            title: function(context) {
                                let prefix = VIEW_MODE === 'employee' ? '👤 ' : '📦 SKU: ';
                                return prefix + context[0].label;
                            },
                            label: function(context) {
                                let value = context.parsed.y;
                                let formattedVal = new Intl.NumberFormat('vi-VN').format(value);
                                
                                if (context.datasetIndex === 0) {
                                    if (SORT_MODE === 'purchases') return 'Lượt mua : ' + formattedVal;
                                    if (SORT_MODE === 'spend') return 'Tổng chi : ' + formattedVal + ' ₫';
                                    if (SORT_MODE === 'messages') return 'Tin nhắn : ' + formattedVal;
                                    if (SORT_MODE === 'cr') return 'Tỷ lệ Mua/Tin: ' + formattedVal + '%';
                                } else if (context.datasetIndex === 1) {
                                    return 'Giá / Đơn: ' + formattedVal + ' ₫';
                                } else if (context.datasetIndex === 2) {
                                    return 'Giá / Tin : ' + formattedVal + ' ₫'; 
                                }
                            },
                            footer: function(tooltipItems) {
                                let dataIndex = tooltipItems[0].dataIndex;
                                let totalSpend = sorted[dataIndex].spend;
                                let totalLeads = sorted[dataIndex].result;
                                let totalMsgs = sorted[dataIndex].messages;
                                let cr = sorted[dataIndex].cr;
                                
                                return [
                                    '',
                                    '💰 Đã chi     : ' + new Intl.NumberFormat('vi-VN').format(totalSpend) + ' ₫',
                                    '📦 Lượt mua  : ' + new Intl.NumberFormat('vi-VN').format(totalLeads),
                                    '✉️ Tin nhắn  : ' + new Intl.NumberFormat('vi-VN').format(totalMsgs),
                                    '⚡ Tỷ lệ Mua/Tin: ' + cr + '%',
                                    '',
                                    '🖱️ BẤM VÀO ĐỂ XEM CHI TIẾT'
                                ];
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        type: 'linear', display: true, position: 'left',
                        title: { display: true, text: leftAxisTitle, font: {weight: 'bold', size: 10} }
                    }, 
                    y1: { 
                        type: 'linear', display: true, position: 'right',
                        title: { display: true, text: 'Giá CPA & Giá 1 Tin (VNĐ)', font: {weight: 'bold', size: 10}, color: '#333' },
                        grid: { drawOnChartArea: false }
                    } 
                } 
            } 
        }); 
    } catch(e) { console.error("Chart Error", e); } 
}

function drawChartFin(data) { 
    try { 
        const ctx = document.getElementById('chart-ads-fin'); 
        if(!ctx || typeof Chart === 'undefined') return;
        if(window.myAdsChart) window.myAdsChart.destroy(); 
        
        let agg = {}; 
        data.forEach(item => { 
            let groupKey = VIEW_MODE === 'employee' ? item.employee : getProductGroupKey(item.adName);

            if(!agg[groupKey]) agg[groupKey] = { cost: 0, rev: 0 }; 
            agg[groupKey].cost += (item.spend * 1.1) + (item.fee || 0); 
            agg[groupKey].rev += (item.revenue || 0); 
        }); 
        
        const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.cost - a.cost).slice(0, 15); 
        
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
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { type: 'linear', display: true, position: 'left', beginAtZero: true }, y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } } } } 
        }); 
    } catch(e) { console.error("Chart Error", e); } 
}

// ==========================================
// HỆ THỐNG ĐÁNH GIÁ KỊCH BẢN MEDIA BUYING (CHUẨN HÓA 32 TRƯỜNG HỢP)
// ==========================================
function getMatrixThresholds(fullData) {
    let targetCPM = parseFloat(document.getElementById('matrix-target-cpm')?.value) || 0;
    let testBudget = parseFloat(document.getElementById('matrix-test-budget')?.value) || 0;
    
    if (targetCPM === 0) targetCPM = 20000; 
    if (testBudget === 0) testBudget = 500000; // Mặc định Máy học là 300k
    
    return { targetCPM: targetCPM, testBudget: testBudget };
}

function getSystemDiagnosis(spend, cpa, cpm, roas, ctr, freq, cr, thresholds, hasRevenue) {
    const { targetCPM, testBudget } = thresholds;
    const formatNumber = num => new Intl.NumberFormat('vi-VN').format(num);

    if (spend === 0) {
        return { 
            color: 'rgba(153, 153, 153, 0.7)', border: '#999999', label: '⏳ CHƯA DATA', 
            htmlBadge: '<div class="diag-btn"><span style="color:#666; font-weight:bold; background:#f1f3f4; padding:3px 6px; border-radius:4px; font-size:10px;">⏳ CHƯA DATA</span></div>',
            adStatusObj: { label: "⏳ CHƯA CÓ DỮ LIỆU", reason: "Chiến dịch chưa tiêu tiền hoặc vừa lên xong.", action: "Chờ Facebook phân phối thêm." }
        };
    }

    let isLearning = spend < testBudget;
    
    // ĐÁNH GIÁ 5 TIÊU CHÍ (Giá Tin, Tần suất, CTR, Mua/Tin, ROAS)
    let cpmOk = (cpm > 0 && cpm <= targetCPM);
    let roasOk = (!hasRevenue) ? true : (roas >= 2.0); 
    let ctrOk = (ctr >= 1.0);
    let freqOk = (freq > 0 && freq <= 3.0) || freq === 0; 
    let crOk = (cr >= 20.0);
    
    // Đếm số lỗi trên Phễu (Bỏ qua ROAS vì xử lý riêng)
    let funnelFails = [];
    if (!cpmOk) funnelFails.push('GIÁ TIN');
    if (!ctrOk) funnelFails.push('CTR');
    if (!freqOk) funnelFails.push('TẦN SUẤT');
    if (!crOk) funnelFails.push('CHỐT SALE');

    let failCount = funnelFails.length; 
    let metCount = 5 - failCount - (hasRevenue && !roasOk ? 1 : 0);

    let label, badgeStyle, color, border, reason, action;

    // GÓI DỮ LIỆU ĐỂ HIỂN THỊ CỬA SỔ CHI TIẾT
    let tooltipList = '';
    if(isLearning) tooltipList += `<li style="color:#F2C94C; list-style:none; font-weight:bold; margin-bottom:8px;">👉 Đang Test Ngân Sách (${formatNumber(spend)}đ)</li>`;
    
    if(!freqOk) tooltipList += `<li style="color:#E74C3C"><b>Tần suất (${freq.toFixed(1)} &gt; 3):</b> Bão hòa, cần thay bài mới.</li>`;
    else if(freq > 0) tooltipList += `<li style="color:#2ECC71"><b>Tần suất (${freq.toFixed(1)}):</b> Phân phối tốt.</li>`;

    if(!ctrOk) tooltipList += `<li style="color:#E74C3C"><b>CTR (${ctr.toFixed(2)}% &lt; 1%):</b> Kém thu hút, khách lướt qua.</li>`;
    else tooltipList += `<li style="color:#2ECC71"><b>CTR (${ctr.toFixed(2)}%):</b> Nội dung thu hút.</li>`;

    if(!crOk) tooltipList += `<li style="color:#E74C3C"><b>Mua/Tin (${cr.toFixed(1)}% &lt; 20%):</b> Sale trượt nhiều.</li>`;
    else tooltipList += `<li style="color:#2ECC71"><b>Mua/Tin (${cr.toFixed(1)}%):</b> Chốt sale tốt.</li>`;

    if(!cpmOk && cpm > 0) tooltipList += `<li style="color:#E74C3C"><b>Giá tin (${formatNumber(cpm)}đ &gt; ${formatNumber(targetCPM)}đ):</b> Giá tin đắt.</li>`;
    else if(cpmOk && cpm > 0) tooltipList += `<li style="color:#2ECC71"><b>Giá tin (${formatNumber(cpm)}đ):</b> Tối ưu.</li>`;

    if(hasRevenue) {
        if(!roasOk && roas > 0) tooltipList += `<li style="color:#E74C3C"><b>ROAS (${roas.toFixed(2)}x &lt; 2):</b> Đang lỗ vốn.</li>`;
        else if (roasOk) tooltipList += `<li style="color:#2ECC71"><b>ROAS (${roas.toFixed(2)}x):</b> Đạt tiêu chuẩn sinh lời.</li>`;
    }

    // ----------------------------------------------------
    // LOGIC CHẨN ĐOÁN (32 KỊCH BẢN BẢO VỆ ROAS)
    // ----------------------------------------------------

    // 1. DƯỚI NGÂN SÁCH TEST -> BỌC GIÁP MÁY HỌC (Không bao giờ tắt)
    if (isLearning) {
        label = '⏳ MÁY HỌC (Đang Test)';
        badgeStyle = 'color:#666; font-weight:bold; background:#f1f3f4; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #999;';
        color = 'rgba(153, 153, 153, 0.7)'; border = '#999999';
        reason = `Thuật toán đang tìm tệp khách hàng. Chưa tiêu qua mốc test ${formatNumber(testBudget)}đ.`;
        action = 'TUYỆT ĐỐI KHÔNG TẮT. Cứ để yên cho máy học tiếp tục phân phối.';
    }
    // ĐÃ QUA NGÂN SÁCH TEST -> PHÁN XÉT
    else {
        // 2. NHÓM 16 KỊCH BẢN LỖ (Có Doanh thu và ROAS < 2) -> CẦN TẮT GẤP
        if (hasRevenue && !roasOk) {
            label = '❌ CẦN TẮT (Lỗ)';
            badgeStyle = 'color:#d93025; font-weight:bold; background:#fce8e6; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #d93025;';
            color = 'rgba(217, 48, 37, 0.7)'; border = '#d93025';
            reason = `Bất kể chỉ số khác ra sao, lợi nhuận gánh không nổi chi phí quảng cáo (ROAS ${roas.toFixed(2)}x &lt; 2).`;
            action = 'CẦN TẮT GẤP. Không nuối tiếc.';
        }
        // 3. NHÓM SINH LỜI (ROAS >= 2 HOẶC CHƯA UP DOANH THU)
        else {
            // A. Nhóm rớt >= 3 tiêu chí (Tức là chỉ đạt 0, 1 hoặc 2 tiêu chí)
            if (failCount >= 3) {
                // Nếu có ROAS cứu giá -> Kém (Ăn may)
                if (hasRevenue && roasOk) {
                    label = '⚠️ KÉM (Ăn may)';
                    badgeStyle = 'color:#d93025; font-weight:bold; background:#fce8e6; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #d93025;';
                    color = 'rgba(217, 48, 37, 0.7)'; border = '#d93025';
                    reason = `Phễu đã gãy (${funnelFails.join(', ')}). Đang ngáp ngoải sống nhờ ăn may đơn to (ROAS &gt; 2).`;
                    action = 'TUYỆT ĐỐI KHÔNG TĂNG NGÂN SÁCH. Giữ chạy để vắt kiệt lãi, rớt đơn to là Tắt ngay.';
                } 
                // Nếu không có ROAS cứu giá (chưa up doanh thu) -> Tắt luôn
                else {
                    label = '❌ CẦN TẮT (Trượt nhiều)';
                    badgeStyle = 'color:#d93025; font-weight:bold; background:#fce8e6; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #d93025;';
                    color = 'rgba(217, 48, 37, 0.7)'; border = '#d93025';
                    reason = `Trượt ${failCount}/4 điều kiện phễu Traffic. Hiệu quả quá kém.`;
                    action = 'CẦN TẮT LUÔN để bảo vệ ngân sách.';
                }
            }
            // B. Nhóm Cần Tối Ưu (Rớt 2 tiêu chí)
            else if (failCount === 2) {
                label = '⚡ CẦN TỐI ƯU';
                badgeStyle = 'color:#ff6d00; font-weight:bold; background:#fff3e0; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #ff6d00;';
                color = 'rgba(255, 109, 0, 0.7)'; border = '#ff6d00';
                
                if (funnelFails.includes('CTR') && funnelFails.includes('TẦN SUẤT')) {
                    reason = 'Ít người click + Lặp lại tệp người cũ. Bài cũ đã hết vòng đời.';
                    action = 'Bắt buộc lên bài quảng cáo (Content/Creative) mới hoàn toàn.';
                } else if (funnelFails.includes('CTR') && funnelFails.includes('CHỐT SALE')) {
                    reason = 'Khách lướt qua nhiều + Vào nhắn cũng không mua. Khả năng "treo đầu dê bán thịt chó".';
                    action = 'Làm lại Content trung thực hơn và xem lại Target.';
                } else if (funnelFails.includes('CTR') && funnelFails.includes('GIÁ TIN')) {
                    reason = 'Ít click dẫn đến CPC đắt, kéo theo Giá tin đắt.';
                    action = 'Tối ưu lại Hình ảnh/Video cấp bách để tăng lượng nhấp.';
                } else if (funnelFails.includes('TẦN SUẤT') && funnelFails.includes('GIÁ TIN')) {
                    reason = 'Quảng cáo nhai lại trong tệp nhỏ khiến giá thầu tăng vọt.';
                    action = 'Mở rộng tệp khách hàng (Target) ngay lập tức.';
                } else if (funnelFails.includes('TẦN SUẤT') && funnelFails.includes('CHỐT SALE')) {
                    reason = 'Tiếp cận lại người cũ đã không có nhu cầu nên tỷ lệ chốt rớt thảm.';
                    action = 'Lên content góc nhìn mới hoặc đổi tệp khách hàng.';
                } else if (funnelFails.includes('CHỐT SALE') && funnelFails.includes('GIÁ TIN')) {
                    reason = 'Chi phí tìm khách đã đắt mà sale lại trượt nhiều.';
                    action = 'Báo động đỏ cho khâu Sale. Rà soát quy trình tư vấn ngay.';
                } else {
                    reason = `Đang bị hụt 2 chỉ số: ${funnelFails.join(' và ')}.`;
                    action = `Tập trung phân tích và khắc phục ${funnelFails.join(', ')}.`;
                }
            }
            // C. Nhóm Tiềm Năng LV1 (Rớt 1 tiêu chí)
            else if (failCount === 1) {
                label = '🚀 TIỀM NĂNG LV1';
                badgeStyle = 'color:#f4b400; font-weight:bold; background:#fef7e0; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #f4b400;';
                color = 'rgba(244, 180, 0, 0.7)'; border = '#f4b400';
                
                if (funnelFails.includes('CTR')) {
                    reason = `Bài hiển thị nhiều nhưng ít người bấm (CTR = ${ctr.toFixed(2)}%).`;
                    action = 'Thay Thumbnail hoặc làm lại đoạn Hook 3 giây đầu để giữ chân người xem.';
                } else if (funnelFails.includes('TẦN SUẤT')) {
                    reason = `Tệp đang bị chai, lặp lại khách hàng cũ (Tần suất = ${freq.toFixed(2)}).`;
                    action = 'Tạo biến thể nội dung mới hoặc mở rộng Target/vùng địa lý để tiếp cận khách mới.';
                } else if (funnelFails.includes('CHỐT SALE')) {
                    reason = `Khách nhắn nhiều, tin rẻ, nhưng chốt kém (Tỷ lệ chốt = ${cr.toFixed(1)}%).`;
                    action = 'Ép Sale/Đổi kịch bản. Đào tạo lại đội sale, xem lại cách báo giá.';
                } else if (funnelFails.includes('GIÁ TIN')) {
                    reason = `Tin đắt nhưng khách nét, chốt tốt nên vẫn duy trì được lãi.`;
                    action = 'Giữ nguyên ăn lãi, đồng thời nhân bản nhóm sang target khác để ép giá xuống.';
                }
            }
            // D. Nhóm Hoàn Hảo (Đạt 5/5)
            else if (failCount === 0) {
                label = '⭐ TỐT (Hoàn hảo)';
                badgeStyle = 'color:#0f9d58; font-weight:bold; background:#e6f4ea; padding:3px 6px; border-radius:4px; font-size:10px; border: 1px solid #0f9d58;';
                color = 'rgba(15, 157, 88, 0.7)'; border = '#0f9d58';
                reason = `Đạt chuẩn mọi điều kiện phễu. Mọi thứ đang đi đúng hướng.`;
                action = 'Scale (tăng ngân sách) từ 15-20% mỗi ngày/tuần để hớt váng thị trường.';
            }
        }
    }

    const shortBadgeLabel = label.split(' (')[0];
    const adStatusObj = { label: label, reason: reason, action: action };

    // HTML DẠNG NÚT BẤM KÍCH HOẠT CỬA SỔ
    const htmlBadge = `
        <div class="diag-btn" onclick="event.stopPropagation(); window.showDetailedDiagnosis(this.nextElementSibling.innerHTML)">
            <span style="${badgeStyle}">${shortBadgeLabel}</span>
        </div>
        <div style="display:none;">
            <div style="font-size:14px; font-weight:bold; border-bottom:1px solid #444; padding-bottom:8px; margin-bottom:10px; color:#4DD0E1; text-transform:uppercase;">📊 BÁO CÁO PHÂN TÍCH: ${shortBadgeLabel}</div>
            <ul style="margin:4px 0 15px 0; padding-left:18px; font-size:13px; line-height:1.6;">${tooltipList}</ul>
            <div style="background:#1A1A1A; padding:12px; border-radius:8px; border-left:4px solid #FF9800;">
                <div style="margin-bottom:6px;"><span style="color:#4DD0E1; font-weight:bold;">🔍 Tình trạng:</span> <span style="color:#eee;">${reason}</span></div>
                <div><span style="color:#4CAF50; font-weight:bold;">💡 Đề xuất:</span> <span style="color:#fff; font-weight:bold;">${action}</span></div>
            </div>
        </div>
    `;

    return { color, border, label, htmlBadge, adStatusObj };
}

// BẢNG POPUP BỆNH ÁN CHI TIẾT
window.showDetailedDiagnosis = function(innerHtmlData) {
    let modalHtml = `
        <div id="diag-deep-dive-modal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:100005; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);" onclick="document.getElementById('diag-deep-dive-modal').remove()">
            <div style="background:#2C2C2C; color:#ecf0f1; width:90%; max-width:450px; border-radius:12px; border:1px solid #555; box-shadow:0 10px 40px rgba(0,0,0,0.5); animation:fadeIn 0.2s;" onclick="event.stopPropagation()">
                <div style="padding:15px 20px; font-size:14px; line-height:1.5;">
                    ${innerHtmlData}
                </div>
                <div style="padding:10px 20px; border-top:1px solid #444; text-align:right;">
                    <button onclick="document.getElementById('diag-deep-dive-modal').remove()" style="background:#4CAF50; color:#fff; border:none; padding:8px 24px; border-radius:6px; cursor:pointer; font-weight:bold;">Đã Hiểu</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// HÀM HIỂN THỊ BẢNG CHI TIẾT NHÓM QUẢNG CÁO
window.showGroupDetails = function(groupKey, fullData, isTrendTab = false) {
    const groupAds = fullData.filter(item => {
        if (VIEW_MODE === 'employee') return item.employee === groupKey;
        return getProductGroupKey(item.adName) === groupKey;
    }).sort((a,b) => b.spend - a.spend);
    
    let titleStr = "";
    let cleanProductName = groupKey;
    if (VIEW_MODE === 'employee') {
        titleStr = `NHÂN VIÊN: ${escapeHtml(groupKey)}`;
    } else {
        if (groupAds.length > 0 && groupAds[0].adName) {
            cleanProductName = groupAds[0].adName.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
        }
        titleStr = `SẢN PHẨM: ${escapeHtml(groupKey)} - ${escapeHtml(cleanProductName)}`;
    }

    let tableHeaderCol = VIEW_MODE === 'employee' ? 'Sản Phẩm Đang Chạy' : 'Chi Tiết Bài Chạy';
    const thresholds = getMatrixThresholds(CURRENT_FILTERED_DATA);
    let hasRevenue = CURRENT_FILTERED_DATA.some(i => i.revenue > 0);

    let tbodyHtml = '';
    let totalSpend = 0, totalMsgs = 0, totalLeads = 0, totalRevenue = 0, totalCost = 0, totalImps = 0, totalClicks = 0, totalReach = 0;

    groupAds.forEach(ad => {
        totalSpend += ad.spend;
        totalMsgs += (ad.messages || 0);
        totalLeads += ad.result;
        totalRevenue += (ad.revenue || 0);
        totalCost += (ad.spend * 1.1) + (ad.fee || 0);
        totalImps += (ad.impressions || 0);
        totalClicks += (ad.clicks || 0);
        totalReach += (ad.reach || 0);

        const cpa = ad.result > 0 ? Math.round(ad.spend / ad.result) : 0;
        const cpm = (ad.messages || 0) > 0 ? Math.round(ad.spend / ad.messages) : 0;
        const crValue = (ad.messages || 0) > 0 ? (ad.result / ad.messages) * 100 : (ad.result > 0 ? 100 : 0);
        
        let statusHtml = ad.status === 'Đang chạy' ? '<span style="color:#0f9d58; font-weight:bold;">Đang chạy</span>' : '<span style="color:#999;">Đã tắt</span>';
        
        const adTotalCost = (ad.spend * 1.1) + (ad.fee || 0);
        const roas = adTotalCost > 0 ? (ad.revenue || 0) / adTotalCost : 0;
        
        // CHẠY QUA HÀM ĐÁNH GIÁ (32 Kịch bản)
        const diagnosis = getSystemDiagnosis(ad.spend, cpa, cpm, roas, ad.ctr, ad.freq, crValue, thresholds, hasRevenue);

        let firstColHtml = VIEW_MODE === 'employee' 
            ? escapeHtml(ad.adName) 
            : `👤 ${escapeHtml(ad.employee)}<br><span style="color:#666; font-size:10px;">${escapeHtml(ad.adName)}</span>`;

        // GỘP CỘT GIÁ TIN VÀ CPA THÀNH 1 CỘT
        tbodyHtml += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; color:#1a73e8; font-weight:600; font-size:11px;">${firstColHtml}</td>
                <td style="padding: 8px; text-align:right; font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(ad.spend)} ₫</td>
                <td style="padding: 8px; text-align:center; font-weight:bold;"><span style="color:#ff6d00">${new Intl.NumberFormat('vi-VN').format(ad.messages || 0)}</span> / <span style="color:#137333">${new Intl.NumberFormat('vi-VN').format(ad.result)}</span></td>
                <td style="padding: 8px; text-align:center; color:#f4b400; font-weight:bold;">${crValue.toFixed(1)}%</td>
                <td style="padding: 8px; text-align:right; font-weight:bold;">
                    <div style="color:#333;">${new Intl.NumberFormat('vi-VN').format(cpm)} ₫</div>
                    <div style="font-size:9px; color:#d93025; margin-top:2px;">CPA: ${new Intl.NumberFormat('vi-VN').format(cpa)} ₫</div>
                </td>
                <td style="padding: 8px; text-align:center; font-size:11px; color:#555;"><b>${ad.ctr.toFixed(2)}%</b><br><span style="font-size:9px;color:#888;">F: ${ad.freq.toFixed(2)}</span></td>
                <td style="padding: 8px; text-align:center; font-size:10px;">${statusHtml}</td>
                <td style="padding: 8px; text-align:center;">${diagnosis.htmlBadge}</td>
            </tr>
        `;
    });

    const avgCpa = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
    const avgCpm = totalMsgs > 0 ? Math.round(totalSpend / totalMsgs) : 0;
    const avgCr = totalMsgs > 0 ? ((totalLeads / totalMsgs) * 100) : (totalLeads > 0 ? 100 : 0);
    const avgRoas = totalCost > 0 ? (totalRevenue / totalCost) : 0;
    const avgCtr = totalImps > 0 ? (totalClicks / totalImps) * 100 : 0;
    const avgFreq = totalReach > 0 ? (totalImps / totalReach) : 0;

    let groupDiagnosisHtml = '';
    if (isTrendTab) {
        const groupDiag = getSystemDiagnosis(totalSpend, avgCpa, avgCpm, avgRoas, avgCtr, avgFreq, avgCr, thresholds, hasRevenue);
        groupDiagnosisHtml = `
            <div style="background: #2C2C2C; border: 1px solid #444; border-left: 6px solid ${groupDiag.border}; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <span style="background:#4CAF50; color:#fff; padding:4px 8px; border-radius:4px; font-weight:900; font-size:12px;">ĐÁNH GIÁ TỔNG QUAN:</span>
                    <span style="color:${groupDiag.border}; font-weight:bold; font-size:14px; text-transform:uppercase;">${groupDiag.adStatusObj.label}</span>
                </div>
                <p style="margin: 0 0 5px 0; color: #eee; font-size: 13px;"><span style="color:#4DD0E1; font-weight:bold;">🔍 Tình trạng:</span> ${groupDiag.adStatusObj.reason}</p>
                <p style="margin: 0; color: #fff; font-size: 13px;"><span style="color:#4CAF50; font-weight:bold;">💡 Đề xuất:</span> <b>${groupDiag.adStatusObj.action}</b></p>
            </div>
        `;
    }

    let modalHtml = `
        <div class="ads-modal-overlay" id="ads-detail-modal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:100000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);" onclick="window.closeAdsModal(event)">
            <div class="ads-modal-content" style="background:#fff; width:95%; max-width:1000px; max-height:85vh; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.3); animation:slideDownFade 0.2s;" onclick="event.stopPropagation()">
                <div style="padding:15px 20px; background:#1a73e8; color:#fff; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:16px; text-transform:uppercase;">📊 BÁO CÁO NHÓM: ${titleStr}</h3>
                    <button onclick="window.closeAdsModal()" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer; line-height:1;">&times;</button>
                </div>
                
                <div style="padding:20px; overflow-y:auto; overflow-x:hidden; background:#f4f6f8; flex:1;">
                    ${groupDiagnosisHtml}

                    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">
                            <div style="font-size:10px; color:#666; font-weight:bold;">TỔNG CHI PHÍ</div>
                            <div style="font-size:16px; font-weight:900; color:#1a73e8;">${new Intl.NumberFormat('vi-VN').format(totalSpend)} ₫</div>
                        </div>
                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">
                            <div style="font-size:10px; color:#666; font-weight:bold;">TỔNG TIN / MUA</div>
                            <div style="font-size:16px; font-weight:900; color:#333;"><span style="color:#ff6d00">${new Intl.NumberFormat('vi-VN').format(totalMsgs)}</span> / <span style="color:#137333">${new Intl.NumberFormat('vi-VN').format(totalLeads)}</span></div>
                        </div>
                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">
                            <div style="font-size:10px; color:#666; font-weight:bold;">TỶ LỆ (MUA/TIN)</div>
                            <div style="font-size:16px; font-weight:900; color:#f4b400;">${avgCr.toFixed(1)}%</div>
                        </div>
                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">
                            <div style="font-size:10px; color:#666; font-weight:bold;">GIÁ 1 TIN (CPM)</div>
                            <div style="font-size:16px; font-weight:900; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(avgCpm)} ₫</div>
                        </div>
                        <div style="flex:1; background:#fff; padding:10px; border-radius:6px; border:1px solid #ddd; text-align:center;">
                            <div style="font-size:10px; color:#666; font-weight:bold;">LỢI TỨC (ROAS)</div>
                            <div style="font-size:16px; font-weight:900; color:${avgRoas>=2?'#0f9d58':'#d93025'};">${avgRoas.toFixed(2)}x</div>
                        </div>
                    </div>

                    <div style="background:#fff; border:1px solid #ddd; border-radius:8px; overflow-x:auto;">
                        <table class="ads-table">
                            <thead>
                                <tr style="background:#e8f0fe;">
                                    <th style="padding:10px 8px; text-align:left; border-bottom:2px solid #ddd;">${tableHeaderCol}</th>
                                    <th style="padding:10px 8px; text-align:right; border-bottom:2px solid #ddd;">Chi Phí</th>
                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">Tin/Mua</th>
                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">Tỷ lệ M/T</th>
                                    <th style="padding:10px 8px; text-align:right; border-bottom:2px solid #ddd;">Giá Tin<br><span style="font-size:9px; color:#666;">(Giá Đơn)</span></th>
                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">CTR / Tần suất</th>
                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">Trạng Thái</th>
                                    <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #ddd;">Chẩn Đoán Tối Ưu</th>
                                </tr>
                            </thead>
                            <tbody>${tbodyHtml}</tbody>
                        </table>
                    </div>
                    <div style="text-align:right; font-size:11px; color:#d93025; margin-top:10px; font-weight:bold; animation:pulse 2s infinite;">
                        <i>👉 NHẤP VÀO TỪNG NHÃN ĐÁNH GIÁ ĐỂ XEM HỒ SƠ BỆNH ÁN CHI TIẾT.</i>
                    </div>
                    <style>@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }</style>
                </div>
            </div>
        </div>
    `;

    let existingModal = document.getElementById('ads-detail-modal');
    if(existingModal) existingModal.remove(); 
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeAdsModal = function(e) {
    const modal = document.getElementById('ads-detail-modal');
    if(modal) {
        if(!e || e.target === modal || e.currentTarget === modal) {
            modal.remove();
        }
    }
};

function drawChartTrend(companyData) {
    try {
        const ctx = document.getElementById('chart-ads-trend');
        if(!ctx || typeof Chart === 'undefined') return;
        if(window.myAdsTrendChart) window.myAdsTrendChart.destroy();

        const thresholds = getMatrixThresholds(companyData);
        let targetCPM = thresholds.targetCPM;
        let hasRevenue = companyData.some(i => i.revenue > 0);

        let agg = {};
        companyData.forEach(item => {
            let groupKey = VIEW_MODE === 'employee' ? item.employee : getProductGroupKey(item.adName);
            if(!agg[groupKey]) agg[groupKey] = { spend: 0, result: 0, messages: 0, sumCtr: 0, sumFreq: 0, totalCost: 0, revenue: 0, nameClean: item.adName };
            agg[groupKey].spend += item.spend;
            agg[groupKey].result += item.result;
            agg[groupKey].messages += (item.messages || 0);
            
            // Tính trung bình trọng số cho biểu đồ bong bóng
            agg[groupKey].sumCtr += item.ctr * item.spend;
            agg[groupKey].sumFreq += item.freq * item.spend;
            agg[groupKey].totalCost += (item.spend * 1.1) + (item.fee || 0);
            agg[groupKey].revenue += (item.revenue || 0);
        });

        const points = Object.entries(agg).map(([name, val]) => {
            let cpa = val.result > 0 ? Math.round(val.spend / val.result) : val.spend;
            let ctrAvg = val.spend > 0 ? (val.sumCtr / val.spend) : 0;
            let freqAvg = val.spend > 0 ? (val.sumFreq / val.spend) : 0;
            let roasGroup = val.totalCost > 0 ? (val.revenue / val.totalCost) : 0;
            let crGroup = val.messages > 0 ? (val.result / val.messages) * 100 : 0;
            let cpmAvg = val.messages > 0 ? Math.round(val.spend / val.messages) : (val.spend > 0 ? val.spend : 0);
            
            let displayName = name;
            if (VIEW_MODE === 'product') {
                 let clean = val.nameClean.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
                 displayName = `${name} - ${clean}`;
            }

            return { 
                name: displayName, 
                groupKey: name, 
                spend: val.spend, 
                result: val.result, 
                messages: val.messages,
                ctr: ctrAvg,
                freq: freqAvg,
                roas: roasGroup,
                cr: crGroup,
                cpm: cpmAvg,
                cpa: cpa 
            };
        });

        if(points.length === 0) return;

        const bubbleData = points.map(p => {
            const info = getSystemDiagnosis(p.spend, p.cpa, p.cpm, p.roas, p.ctr, p.freq, p.cr, thresholds, hasRevenue);

            return {
                x: p.spend, y: p.cpm, // Trục Y hiển thị Giá Tin (CPM)
                r: Math.max(8, Math.min(p.result * 2 + 5, 40)),
                campName: escapeHtml(p.name), groupKey: escapeHtml(p.groupKey), result: p.result, messages: p.messages,
                freq: p.freq.toFixed(2), ctr: p.ctr.toFixed(2), roas: p.roas, cr: p.cr.toFixed(2), cpm: p.cpm,
                color: info.color, borderColor: info.border, recommendation: info.adStatusObj.action
            };
        });

        window.myAdsTrendChart = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Chiến dịch',
                    data: bubbleData,
                    backgroundColor: bubbleData.map(d => d.color),
                    borderColor: bubbleData.map(d => d.borderColor),
                    borderWidth: 2
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                        const index = elements[0].index;
                        const groupKey = points[index].groupKey; // Sử dụng points gốc chứa tên chưa mã hóa HTML
                        window.showGroupDetails(groupKey, CURRENT_FILTERED_DATA, true);
                    }
                },
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        usePointStyle: true, padding: 12,
                        callbacks: {
                            label: function(context) {
                                const data = context.raw;
                                return [
                                    `${data.campName}`,
                                    `━━━━━━━━━━━━━━━━━`,
                                    `💡 Đề xuất: ${data.recommendation}`,
                                    ``,
                                    `💰 Tiền đã chi : ${new Intl.NumberFormat('vi-VN').format(data.x)} ₫`,
                                    `🎯 Giá 1 Tin   : ${new Intl.NumberFormat('vi-VN').format(data.y)} ₫`,
                                    `📦 Lượt mua    : ${new Intl.NumberFormat('vi-VN').format(data.result)}`,
                                    `━━━━━━━━━━━━━━━━━`,
                                    `📊 CHỈ SỐ TRAFFIC GỐC:`,
                                    `- Tần suất lặp  : ${data.freq} lần`,
                                    `- Tỷ lệ Click (CTR) : ${data.ctr}%`,
                                    `- Tỷ lệ Mua/Tin (CR): ${data.cr}%`,
                                    `- Lợi tức (ROAS)    : ${data.roas.toFixed(2)}x`,
                                    ``,
                                    `🖱️ CLICK ĐỂ XEM BỆNH ÁN CHI TIẾT`
                                ];
                            }
                        }
                    }
                }, 
                scales: { 
                    x: { title: { display: true, text: 'Tổng Tiền Đã Chi (VNĐ)', font: {weight: 'bold'} }, min: 0 }, 
                    y: { title: { display: true, text: 'Giá 1 Tin Nhắn (CPM)', font: {weight: 'bold'} }, min: 0 } 
                } 
            }
        });
        
        const inputCpm = document.getElementById('matrix-target-cpm');
        if (inputCpm && !inputCpm.value) inputCpm.placeholder = `Auto: ~${Math.round(targetCPM/1000)}k`;

    } catch(e) { console.error("Matrix Chart Error", e); }
}

function parseCleanNumber(val) { 
    if (val === null || val === undefined || val === '') return 0; 
    if (typeof val === 'number') return val; 
    let s = val.toString().trim().replace(/,/g, '').replace(/\s/g, ''); 
    if ((s.match(/\./g) || []).length > 1) { s = s.replace(/\./g, ''); } 
    else if (s.match(/^-?\d+\.\d{3}$/)) { s = s.replace(/\./g, ''); }
    return parseFloat(s) || 0; 
}

function formatExcelDate(input) { 
    if (!input) return "-"; 
    if (typeof input === 'number') { return formatDateObj(new Date((input - 25569) * 86400 * 1000)); } 
    let str = input.toString().trim(); 
    let datePart = str.split(' ')[0]; 
    if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) { 
        const parts = datePart.split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; 
    } 
    if (datePart.match(/^\d{4}\/\d{2}\/\d{2}$/)) { 
        const parts = datePart.split('/'); return `${parts[2]}/${parts[1]}/${parts[0]}`; 
    } 
    return str; 
}

function formatDateObj(d) { 
    if (isNaN(d.getTime())) return "-"; 
    return `${("0" + d.getDate()).slice(-2)}/${("0" + (d.getMonth() + 1)).slice(-2)}/${d.getFullYear()}`; 
}
function renderReportPreview() {
    const container = document.getElementById('report-preview-container');
    if (!container) return;

    // ---------------------------------------------------------
    // PHẦN 1: TÍNH TỔNG QUAN TOÀN BỘ 4 CÔNG TY (LUÔN HIỂN THỊ)
    // ---------------------------------------------------------
    let globalData = GLOBAL_ADS_DATA;
    
    // Áp dụng bộ lọc ngày tháng (nếu có) để xem tổng 4 công ty trong 1 khoảng thời gian
    if (DATE_FROM || DATE_TO) {
        let validBatchIds = new Set();
        let fromTs = DATE_FROM ? new Date(DATE_FROM).setHours(0,0,0,0) : 0;
        let toTs = DATE_TO ? new Date(DATE_TO).setHours(23,59,59,999) : Infinity;
        GLOBAL_HISTORY_LIST.forEach(([key, log]) => {
            let ts = new Date(log.timestamp).getTime();
            if (ts >= fromTs && ts <= toTs) validBatchIds.add(key);
        });
        globalData = globalData.filter(item => validBatchIds.has(item.batchId));
    }
    
    // Các biến cộng dồn cho 4 công ty
    let gCamps = 0, gCost = 0, gRev = 0, gMsgs = 0, gSpend = 0, gCtrSum = 0;
    
        globalData.forEach(item => {
        gCamps++;
        gCost += (item.spend * 1.1) + (item.fee || 0);
        gRev += (item.revenue || 0);
        gMsgs += (item.messages || 0);
        gSpend += item.spend;
        gCtrSum += ((item.ctr || 0) * item.spend); // Đã thêm ( || 0) để chống lỗi NaN
    });
    
    let gRoas = gCost > 0 ? (gRev / gCost) : 0;
    let gCtr = gSpend > 0 ? (gCtrSum / gSpend) : 0;

    const fm = num => new Intl.NumberFormat('vi-VN').format(Math.round(isNaN(num) ? 0 : num));
    const fmP = num => (isNaN(num) ? 0 : num).toFixed(2).replace('.', ',') + '%';
    const fmN = num => (isNaN(num) ? 0 : num).toFixed(2).replace('.', ',');

    // WIDGET TỔNG 4 CÔNG TY (Giao diện xanh đậm nổi bật)
    let html = `
        <div style="background: linear-gradient(135deg, #0d47a1, #1a73e8); color: #fff; padding: 20px; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(26,115,232,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:12px; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                <h3 style="margin:0; font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">🌐 BẢNG ĐIỀU KHIỂN: TỔNG HỢP 4 CÔNG TY</h3>
                <button onclick="window.viewAllData(); window.switchAdsTab('report');" style="background:#fff; color:#1a73e8; border:none; padding:8px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:12px; box-shadow:0 2px 5px rgba(0,0,0,0.2); transition:0.2s;">
                    Mở Rộng Dữ Liệu 4 Công Ty Cho Các Bảng Dưới ⬇
                </button>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:12px; text-align:center;">
                <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px;">
                    <div style="font-size:11px; opacity:0.9; margin-bottom:6px; font-weight:bold;">SỐ BÀI QUẢNG CÁO</div>
                    <div style="font-size:22px; font-weight:900;">${fm(gCamps)}</div>
                </div>
                <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px;">
                    <div style="font-size:11px; opacity:0.9; margin-bottom:6px; font-weight:bold;">CHI PHÍ (VAT + PHÍ)</div>
                    <div style="font-size:22px; font-weight:900;">${fm(gCost)} đ</div>
                </div>
                <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px; border:2px solid rgba(129,201,149,0.5);">
                    <div style="font-size:11px; opacity:0.9; margin-bottom:6px; font-weight:bold;">DOANH THU</div>
                    <div style="font-size:22px; font-weight:900; color:#81c995;">${fm(gRev)} đ</div>
                </div>
                <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px; border:2px solid rgba(242,139,130,0.5);">
                    <div style="font-size:11px; opacity:0.9; margin-bottom:6px; font-weight:bold;">ROAS TỔNG</div>
                    <div style="font-size:22px; font-weight:900; color:#f28b82;">${fmN(gRoas)}x</div>
                </div>
                <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px;">
                    <div style="font-size:11px; opacity:0.9; margin-bottom:6px; font-weight:bold;">CTR TRUNG BÌNH</div>
                    <div style="font-size:22px; font-weight:900; color:#fde293;">${fmP(gCtr)}</div>
                </div>
                <div style="background:rgba(255,255,255,0.15); padding:15px 10px; border-radius:8px;">
                    <div style="font-size:11px; opacity:0.9; margin-bottom:6px; font-weight:bold;">TIN NHẮN</div>
                    <div style="font-size:22px; font-weight:900;">${fm(gMsgs)}</div>
                </div>
            </div>
        </div>
        <hr style="border:0; border-top:1px dashed #ccc; margin:20px 0;">
    `;

    // ---------------------------------------------------------
    // PHẦN 2: DỮ LIỆU CÁC BẢNG BÊN DƯỚI (1 Cty hoặc 4 Cty tùy lựa chọn)
    // ---------------------------------------------------------
    let reportData = globalData; 
    
    // Nếu bạn đang click vào 1 file Lịch sử cụ thể -> 4 bảng dưới sẽ chỉ hiện của 1 công ty đó.
    // (Bấm nút "Mở Rộng Dữ Liệu" ở trên để phá màng lọc này)
    if (ACTIVE_BATCH_ID) {
        reportData = reportData.filter(item => item.batchId === ACTIVE_BATCH_ID);
    }

    if (reportData.length === 0) {
        container.innerHTML = html + '<div style="text-align:center; padding:30px; color:#999;">Chưa có dữ liệu để vẽ bảng chi tiết.</div>';
        return;
    }

    let compAgg = {}, skuAgg = {}, empAgg = {}, campList = [];

    reportData.forEach(item => {
        const cost = (item.spend * 1.1) + (item.fee || 0);
        const rev = item.revenue || 0;
        const msgs = item.messages || 0;
        const leads = item.result || 0;
        const comp = item.company || 'Khác';
        const emp = item.employee || 'Khác';
        let sku = getProductGroupKey(item.adName);

        // 1. Gom nhóm theo CÔNG TY
        if (!compAgg[comp]) compAgg[comp] = { camps: 0, msgs: 0, leads: 0, rev: 0, cost: 0, spend: 0, ctrSum: 0, freqSum: 0 };
        compAgg[comp].camps++;
        compAgg[comp].msgs += msgs; compAgg[comp].leads += leads; compAgg[comp].rev += rev;
        compAgg[comp].cost += cost; compAgg[comp].spend += item.spend;
        compAgg[comp].ctrSum += ((item.ctr || 0) * item.spend);    // Sửa ở đây
        compAgg[comp].freqSum += ((item.freq || 0) * item.spend);  // Sửa ở đây

        // 2. Gom nhóm CHIẾN DỊCH (để lọc Nổi bật / Cần tối ưu)
        campList.push({ name: item.adName, emp: item.employee, comp: comp, spend: item.spend, cost: cost, rev: rev, msgs: msgs, leads: leads, cr: msgs>0?(leads/msgs*100):0, roas: cost>0?(rev/cost):0 });

        // 3. Gom nhóm theo SKU
        let skuKey = comp + '||' + sku;
        if (!skuAgg[skuKey]) skuAgg[skuKey] = { comp, sku, msgs: 0, leads: 0, rev: 0, cost: 0, spend: 0, ctrSum: 0 };
        skuAgg[skuKey].msgs += msgs; skuAgg[skuKey].leads += leads; skuAgg[skuKey].rev += rev;
        skuAgg[skuKey].cost += cost; skuAgg[skuKey].spend += item.spend;
        skuAgg[skuKey].ctrSum += ((item.ctr || 0) * item.spend);   // Sửa ở đây

        // 4. Gom nhóm theo NHÂN VIÊN
        let empKey = comp + '||' + emp;
        if (!empAgg[empKey]) empAgg[empKey] = { comp, emp, camps: 0, msgs: 0, leads: 0, rev: 0, cost: 0, spend: 0, ctrSum: 0 };
        empAgg[empKey].camps++; empAgg[empKey].msgs += msgs; empAgg[empKey].leads += leads;
        empAgg[empKey].rev += rev; empAgg[empKey].cost += cost; empAgg[empKey].spend += item.spend;
        empAgg[empKey].ctrSum += ((item.ctr || 0) * item.spend);   // Sửa ở đây
    });

    // 1. TÓM TẮT THEO CÔNG TY
    html += `<h4 style="margin:20px 0 10px; color:#333; font-size:14px;">1. TÓM TẮT THEO CÔNG TY</h4>
             <table class="ads-table" style="margin-bottom:20px;">
                <thead><tr style="background:#f8f9fa;">
                    <th>Công ty</th><th>Camp</th><th>Tin nhắn</th><th>Lượt mua</th><th>Mua/Tin</th><th>Tổng chi</th><th>Doanh thu</th><th>CP/Tin</th><th>CP/Mua</th><th>ROAS</th><th>CTR</th><th>Tần suất</th>
                </tr></thead><tbody>`;
    Object.keys(compAgg).forEach(comp => {
        let d = compAgg[comp];
        let cr = d.msgs > 0 ? (d.leads/d.msgs)*100 : 0;
        let cpm = d.msgs > 0 ? (d.cost/d.msgs) : 0;
        let cpa = d.leads > 0 ? (d.cost/d.leads) : 0;
        let roas = d.cost > 0 ? (d.rev/d.cost) : 0;
        let ctr = d.spend > 0 ? (d.ctrSum/d.spend) : 0;
        let freq = d.spend > 0 ? (d.freqSum/d.spend) : 0;
        html += `<tr>
            <td style="font-weight:bold;">${comp}</td><td class="text-center">${d.camps}</td><td class="text-center">${fm(d.msgs)}</td><td class="text-center">${fm(d.leads)}</td>
            <td class="text-center">${fmP(cr)}</td><td class="text-right">${fm(d.cost)}đ</td><td class="text-right" style="color:#137333;">${fm(d.rev)}đ</td>
            <td class="text-right">${fm(cpm)}đ</td><td class="text-right">${fm(cpa)}đ</td><td class="text-center" style="font-weight:bold; color:#d93025;">${fmN(roas)}</td>
            <td class="text-center">${fmP(ctr)}</td><td class="text-center">${fmN(freq)}</td>
        </tr>`;
    });
    html += `</tbody></table>`;

    // 2. CAMPAIGN NỔI BẬT / CẦN TỐI ƯU
    campList.sort((a,b) => b.roas - a.roas);
    let topCamps = campList.filter(c => c.roas >= 4).slice(0, 5);
    let badCamps = [...campList].sort((a,b) => b.cost - a.cost).filter(c => c.roas < 2 && c.cost > 500000).slice(0, 5);
    
    html += `<h4 style="margin:20px 0 10px; color:#333; font-size:14px;">2. CAMPAIGN NỔI BẬT / CẦN TỐI ƯU</h4>
             <table class="ads-table" style="margin-bottom:20px;">
                <thead><tr style="background:#f8f9fa;"><th>Trạng thái</th><th>Tên chiến dịch (Nhân viên)</th><th>Công ty</th><th>Tin nhắn</th><th>Lượt mua</th><th>Mua/Tin</th><th>Tổng chi</th><th>ROAS</th></tr></thead><tbody>`;
    
    topCamps.forEach(c => {
        html += `<tr><td style="color:#137333; font-weight:bold;">⭐ NỔI BẬT</td><td>${c.name} (${c.emp})</td><td class="text-center">${c.comp}</td><td class="text-center">${fm(c.msgs)}</td><td class="text-center">${fm(c.leads)}</td><td class="text-center">${fmP(c.cr)}</td><td class="text-right">${fm(c.cost)}đ</td><td class="text-center" style="font-weight:bold; color:#137333;">${fmN(c.roas)}</td></tr>`;
    });
    badCamps.forEach(c => {
        html += `<tr><td style="color:#d93025; font-weight:bold;">❌ CẦN TỐI ƯU</td><td>${c.name} (${c.emp})</td><td class="text-center">${c.comp}</td><td class="text-center">${fm(c.msgs)}</td><td class="text-center">${fm(c.leads)}</td><td class="text-center">${fmP(c.cr)}</td><td class="text-right">${fm(c.cost)}đ</td><td class="text-center" style="font-weight:bold; color:#d93025;">${fmN(c.roas)}</td></tr>`;
    });
    html += `</tbody></table>`;

    // 3. SẢN PHẨM HIỆU QUẢ THEO CÔNG TY
    html += `<h4 style="margin:20px 0 10px; color:#333; font-size:14px;">3. SẢN PHẨM HIỆU QUẢ THEO CÔNG TY</h4>
             <table class="ads-table" style="margin-bottom:20px;">
                <thead><tr style="background:#f8f9fa;"><th>Công ty</th><th>Sản phẩm (SKU)</th><th>Tổng chi</th><th>Tin nhắn</th><th>Lượt mua</th><th>Doanh thu</th><th>ROAS</th><th>CTR</th></tr></thead><tbody>`;
    Object.values(skuAgg).sort((a,b) => b.rev - a.rev).forEach(d => {
        let roas = d.cost > 0 ? (d.rev/d.cost) : 0;
        let ctr = d.spend > 0 ? (d.ctrSum/d.spend) : 0;
        html += `<tr><td class="text-center" style="font-weight:bold;">${d.comp}</td><td>${d.sku}</td><td class="text-right">${fm(d.cost)}đ</td><td class="text-center">${fm(d.msgs)}</td><td class="text-center">${fm(d.leads)}</td><td class="text-right" style="color:#137333; font-weight:bold;">${fm(d.rev)}đ</td><td class="text-center" style="font-weight:bold;">${fmN(roas)}</td><td class="text-center">${fmP(ctr)}</td></tr>`;
    });
    html += `</tbody></table>`;

    // 4. HIỆU SUẤT THEO NHÂN VIÊN
    let empList = Object.values(empAgg).map(d => {
        d.roas = d.cost > 0 ? (d.rev/d.cost) : 0;
        d.cr = d.msgs > 0 ? (d.leads/d.msgs)*100 : 0;
        d.ctr = d.spend > 0 ? (d.ctrSum/d.spend) : 0;
        d.status = d.roas >= 4 ? 'Ra đơn tốt' : (d.roas >= 2 ? 'Cần tối ưu' : 'Hiệu quả kém');
        return d;
    });
    const statusGroups = { 'Ra đơn tốt':[], 'Cần tối ưu':[], 'Hiệu quả kém':[] };
    empList.forEach(e => statusGroups[e.status].push(e));

    html += `<h4 style="margin:20px 0 10px; color:#333; font-size:14px;">4. HIỆU SUẤT THEO NHÂN VIÊN</h4>
             <table class="ads-table">
                <thead><tr style="background:#f8f9fa;"><th>Công ty</th><th>Trạng thái</th><th>Nhân sự</th><th>Camp</th><th>Tin</th><th>Mua</th><th>Mua/Tin</th><th>Tổng chi</th><th>ROAS</th><th>CTR</th></tr></thead><tbody>`;
    
    ['Ra đơn tốt', 'Cần tối ưu', 'Hiệu quả kém'].forEach(status => {
        let group = statusGroups[status].sort((a,b) => b.roas - a.roas);
        if(group.length === 0) return;
        let color = status === 'Ra đơn tốt' ? '#137333' : (status === 'Cần tối ưu' ? '#b06000' : '#d93025');
        
        group.forEach((e, idx) => {
            html += `<tr>
                <td class="text-center">${e.comp}</td>
                ${idx===0 ? `<td rowspan="${group.length}" style="color:${color}; font-weight:bold; text-align:center; vertical-align:middle; background:#fefefe;">${status}</td>` : ''}
                <td style="font-weight:bold;">${e.emp}</td><td class="text-center">${e.camps}</td><td class="text-center">${fm(e.msgs)}</td><td class="text-center">${fm(e.leads)}</td>
                <td class="text-center">${fmP(e.cr)}</td><td class="text-right">${fm(e.cost)}đ</td><td class="text-center" style="font-weight:bold; color:${color}">${fmN(e.roas)}</td><td class="text-center">${fmP(e.ctr)}</td>
            </tr>`;
        });
    });
    html += `</tbody></table>`;

    container.innerHTML = html;
}

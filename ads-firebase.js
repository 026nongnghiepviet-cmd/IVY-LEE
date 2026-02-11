/**
 * ADS MODULE V41 (SAFE MODE)
 * - Validation: Chặn upload nhầm file của công ty khác.
 * - UX Improvement: Tắt alert khi chuyển công ty.
 * - Giữ nguyên toàn bộ logic tính toán chuẩn của V39/V40.
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

// --- CẤU HÌNH TỪ KHÓA ĐỂ CHECK FILE ---
const COMPANIES = [
    { 
        id: 'NNV', 
        name: 'Nông Nghiệp Việt', 
        keywords: ['nông nghiệp việt', 'nong nghiep viet', 'nnv'] 
    },
    { 
        id: 'VN', 
        name: 'Việt Nhật', 
        keywords: ['việt nhật', 'viet nhat', 'hóa nông việt nhật'] 
    },
    { 
        id: 'KF', 
        name: 'King Farm', 
        keywords: ['king farm', 'kingfarm', 'kf'] 
    },
    { 
        id: 'ABC', 
        name: 'ABC Việt Nam', 
        keywords: ['abc', 'abc việt nam'] 
    }
];

let GLOBAL_ADS_DATA = [];
let ACTIVE_BATCH_ID = null;
let CURRENT_TAB = 'performance';
let CURRENT_COMPANY = 'NNV'; 

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V41 Loaded");
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
    window.triggerRevenueUpload = () => {
        if(!ACTIVE_BATCH_ID) { alert("⚠️ Vui lòng Up file Ads hoặc Chọn 1 file trong lịch sử trước!"); return; }
        document.getElementById('revenue-file-input').click();
    };
    window.triggerStatementUpload = () => {
        if(!ACTIVE_BATCH_ID) { alert("⚠️ Vui lòng Up file Ads hoặc Chọn 1 file trong lịch sử trước!"); return; }
        document.getElementById('statement-file-input').click();
    };
    window.switchAdsTab = switchAdsTab;
    window.changeCompany = changeCompany;
}

// --- GIAO DIỆN ---
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
                
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .table-responsive { overflow-x: auto; border: 1px solid #eee; border-radius: 4px; max-height: 500px; }
            </style>

            <div class="company-select-container">
                <div>
                    <span style="font-weight:bold; margin-right: 10px; color:#333;">🏢 ĐANG LÀM VIỆC VỚI:</span>
                    <select id="company-selector" class="company-select" onchange="changeCompany(this.value)">
                        ${optionsHtml}
                    </select>
                </div>
                <div style="font-size:11px; color:#666; font-style:italic;">*Hệ thống sẽ tự động kiểm tra tên file khi upload</div>
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
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:800; color:#333; font-size:11px;">📂 LỊCH SỬ UPLOAD</div>
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

// --- LOGIC CHUYỂN CÔNG TY (ĐÃ BỎ ALERT) ---
function changeCompany(companyId) {
    CURRENT_COMPANY = companyId;
    ACTIVE_BATCH_ID = null; 
    
    // Tự động load lại không cần báo
    loadUploadHistory();
    applyFilters(); 
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

// --- XỬ LÝ UPLOAD FILE 1: ADS (CÓ VALIDATION CHECK TÊN FILE) ---
function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;

    // --- BƯỚC 1: KIỂM TRA FILE CÓ ĐÚNG CÔNG TY KHÔNG ---
    // Chuẩn hóa tên file (chữ thường, thay dấu gạch thành khoảng trắng để dễ tìm)
    const fileNameNorm = file.name.toLowerCase().replace(/[-_]/g, ' ');
    
    const currentCompInfo = COMPANIES.find(c => c.id === CURRENT_COMPANY);
    
    // Tìm xem file này có chứa từ khóa của CÔNG TY KHÁC không?
    const conflictComp = COMPANIES.find(c => 
        c.id !== CURRENT_COMPANY && 
        c.keywords.some(kw => fileNameNorm.includes(kw))
    );

    if (conflictComp) {
        // Nếu phát hiện tên file chứa từ khóa công ty khác -> CHẶN
        alert(`❌ CẢNH BÁO UPLOAD NHẦM!\n\nBạn đang ở mục: ${currentCompInfo.name}\nNhưng file này có vẻ là của: ${conflictComp.name}\n\n(Tên file: ${file.name})\n\nVui lòng kiểm tra lại để tránh sai lệch số liệu!`);
        e.target.value = ""; // Reset input
        return; // Dừng ngay lập tức
    }
    // --------------------------------------------------------

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
                    alert(`✅ Đã lưu ${result.length} dòng cho công ty ${currentCompInfo.name}.`);
                    if(btnText) btnText.innerText = "Upload Excel";
                    document.getElementById('ads-file-input').value = "";
                    ACTIVE_BATCH_ID = batchId;
                    applyFilters();
                });
            } else { alert("❌ Lỗi: Không tìm thấy cột 'Tên nhóm quảng cáo' hoặc 'Số tiền đã chi tiêu'!"); if(btnText) btnText.innerText = "Upload Excel"; }
        } catch (err) { alert("Lỗi hệ thống: " + err.message); if(btnText) btnText.innerText = "Upload Excel"; }
    };
    reader.readAsArrayBuffer(file);
}

// ... (Giữ nguyên các hàm upload Doanh thu, Sao kê và phân tích dữ liệu chuẩn của V40)
function handleRevenueUpload(input) {
    if(!ACTIVE_BATCH_ID) { alert("Vui lòng chọn 1 File Ads trước khi Up doanh thu!"); return; }
    const file = input.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); let headerIdx = -1, colNameIdx = -1, colRevIdx = -1; for(let i=0; i<Math.min(json.length, 10); i++) { const row = json[i]; if(!row) continue; const rowStr = row.map(c=>c?c.toString().toLowerCase():"").join("|"); if(rowStr.includes("tên nhóm") || rowStr.includes("tên chiến dịch")) { headerIdx = i; row.forEach((cell, idx) => { if(!cell) return; const txt = cell.toString().toLowerCase().trim(); if(txt.includes("tên nhóm") || txt.includes("tên chiến dịch")) colNameIdx = idx; if(txt.includes("doanh thu") || txt.includes("thành tiền")) colRevIdx = idx; }); break; } } if(colNameIdx === -1 || colRevIdx === -1) { alert("❌ Lỗi: Thiếu cột 'Tên nhóm' hoặc 'Doanh thu'"); return; } let revenueMap = {}; for(let i=headerIdx+1; i<json.length; i++) { const r = json[i]; if(!r || !r[colNameIdx]) continue; const name = r[colNameIdx].toString().trim(); let rev = parseCleanNumber(r[colRevIdx]); if(rev > 0) revenueMap[name] = rev; } let updateCount = 0; const updates = {}; db.ref('ads_data').orderByChild('batchId').equalTo(ACTIVE_BATCH_ID).once('value', snapshot => { if(!snapshot.exists()) { alert("Không tìm thấy dữ liệu trên server!"); return; } snapshot.forEach(child => { const item = child.val(); const key = child.key; if (revenueMap[item.fullName]) { updates['/ads_data/' + key + '/revenue'] = revenueMap[item.fullName]; updateCount++; } }); if (updateCount > 0) { db.ref().update(updates).then(() => { alert(`✅ Đã cập nhật doanh thu cho ${updateCount} bài!`); switchAdsTab('finance'); }); } else { alert("⚠️ Không khớp được tên bài nào!"); } }); } catch(err) { alert("Lỗi: " + err.message); } }; reader.readAsArrayBuffer(file); input.value = "";
}
function handleStatementUpload(input) {
    if(!ACTIVE_BATCH_ID) { alert("Vui lòng chọn 1 File Ads trước khi Up sao kê!"); return; }
    const file = input.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); let headerIdx = -1, colAmountIdx = -1; for(let i=0; i<Math.min(json.length, 10); i++) { const row = json[i]; if(!row) continue; row.forEach((cell, idx) => { if(!cell) return; const txt = cell.toString().toLowerCase().trim(); if(txt.includes("nợ") || txt.includes("debit")) { headerIdx = i; colAmountIdx = idx; } }); if(colAmountIdx !== -1) break; } if(colAmountIdx === -1) { alert("❌ Lỗi: Không tìm thấy cột 'Nợ' hoặc 'Debit'!"); return; } let totalStatement = 0; for(let i=headerIdx+1; i<json.length; i++) { const r = json[i]; if(!r) continue; let amt = parseCleanNumber(r[colAmountIdx]); if(amt > 0) totalStatement += amt; } db.ref('ads_data').orderByChild('batchId').equalTo(ACTIVE_BATCH_ID).once('value', snapshot => { if(!snapshot.exists()) return; let totalAdsVAT = 0; let count = 0; snapshot.forEach(child => { const item = child.val(); totalAdsVAT += (item.spend * 1.1); count++; }); const totalDiff = totalStatement - totalAdsVAT; const feePerRow = totalDiff / count; const updates = {}; snapshot.forEach(child => { updates['/ads_data/' + child.key + '/fee'] = feePerRow; }); db.ref().update(updates).then(() => { alert(`✅ Sao kê: ${new Intl.NumberFormat().format(totalStatement)}đ\nChênh lệch: ${new Intl.NumberFormat().format(Math.round(totalDiff))}đ\n=> Phí/bài: ${new Intl.NumberFormat().format(Math.round(feePerRow))}đ.`); switchAdsTab('finance'); }); }); } catch(err) { alert("Lỗi: " + err.message); } }; reader.readAsArrayBuffer(file); input.value = "";
}
function parseDataCore(rows) { if (rows.length < 2) return []; let headerIndex = -1, colNameIdx = -1, colSpendIdx = -1, colResultIdx = -1, colStartIdx = -1, colEndIdx = -1; for (let i = 0; i < Math.min(rows.length, 15); i++) { const row = rows[i]; if (!row) continue; const rowStr = row.map(c => c ? c.toString().toLowerCase().trim() : "").join("|"); if (rowStr.includes("tên nhóm") && (rowStr.includes("số tiền") || rowStr.includes("amount"))) { headerIndex = i; row.forEach((cell, idx) => { if(!cell) return; const txt = cell.toString().toLowerCase().trim(); if (txt.includes("tên nhóm")) colNameIdx = idx; if (txt.includes("số tiền đã chi") || txt.includes("amount spent")) colSpendIdx = idx; if (txt === "kết quả" || txt === "results") colResultIdx = idx; if (txt.includes("bắt đầu") && !txt.includes("báo cáo")) colStartIdx = idx; if (txt.includes("kết thúc") && !txt.includes("báo cáo")) colEndIdx = idx; }); break; } } if (headerIndex === -1 || colNameIdx === -1 || colSpendIdx === -1) return []; let parsedData = []; for (let i = headerIndex + 1; i < rows.length; i++) { const row = rows[i]; if (!row) continue; const rawName = row[colNameIdx]; if (!rawName) continue; let spend = parseCleanNumber(row[colSpendIdx]); if (spend <= 0) continue; let result = parseCleanNumber(row[colResultIdx]); let rawStart = (colStartIdx > -1 && row[colStartIdx]) ? row[colStartIdx] : ""; let rawEnd = (colEndIdx > -1 && row[colEndIdx]) ? row[colEndIdx] : ""; let displayStart = formatExcelDate(rawStart); let status = "Đã tắt"; let endStr = rawEnd ? rawEnd.toString().trim().toLowerCase() : ""; if (endStr.includes("đang diễn ra") || endStr.includes("ongoing")) { status = "Đang chạy"; } let rawNameStr = rawName.toString().trim(); let firstHyphenIndex = rawNameStr.indexOf('-'); let employee = "KHÁC"; let adName = "Chung"; if (firstHyphenIndex !== -1) { employee = rawNameStr.substring(0, firstHyphenIndex).trim().toUpperCase(); adName = rawNameStr.substring(firstHyphenIndex + 1).trim(); } else { employee = rawNameStr.toUpperCase(); } parsedData.push({ fullName: rawNameStr, employee: employee, adName: adName, spend: spend, result: result, run_start: displayStart, status: status }); } return parsedData; }
function loadAdsData() { db.ref('ads_data').on('value', snapshot => { const data = snapshot.val(); if(!data) { GLOBAL_ADS_DATA = []; applyFilters(); return; } GLOBAL_ADS_DATA = Object.values(data); applyFilters(); }); }
function applyFilters() { let filtered = GLOBAL_ADS_DATA.filter(item => item.company === CURRENT_COMPANY); if(ACTIVE_BATCH_ID) { filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID); } filtered.sort((a,b) => { const nameA = a.employee.toLowerCase(); const nameB = b.employee.toLowerCase(); if (nameA < nameB) return -1; if (nameA > nameB) return 1; return b.spend - a.spend; }); let totalSpendAll = 0, totalLeads = 0, totalRevenue = 0; filtered.forEach(item => { const vat = item.spend * 0.1; const fee = item.fee || 0; const total = item.spend + vat + fee; totalSpendAll += total; totalLeads += item.result; totalRevenue += (item.revenue || 0); }); document.getElementById('metric-spend').innerText = new Intl.NumberFormat('vi-VN').format(totalSpendAll) + " ₫"; document.getElementById('metric-leads').innerText = totalLeads; document.getElementById('metric-revenue').innerText = new Intl.NumberFormat('vi-VN').format(totalRevenue) + " ₫"; const roas = totalSpendAll > 0 ? (totalRevenue / totalSpendAll) : 0; document.getElementById('metric-roas').innerText = roas.toFixed(2) + "x"; renderPerformanceTable(filtered); renderFinanceTable(filtered); if(CURRENT_TAB === 'performance') drawChartPerf(filtered); else drawChartFin(filtered); }
function loadUploadHistory() { const tbody = document.getElementById('upload-history-body'); if(!tbody) return; db.ref('upload_logs').orderByChild('company').equalTo(CURRENT_COMPANY).on('value', snapshot => { const data = snapshot.val(); if(!data) { tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Chưa có dữ liệu</td></tr>"; return; } const sorted = Object.entries(data).sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp)); let html = ""; sorted.forEach(([key, log]) => { if(log.company && log.company !== CURRENT_COMPANY) return; const timeStr = new Date(log.timestamp).toLocaleDateString('vi-VN'); const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend); html += `<tr class="history-row" data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer;" onclick="selectUploadBatch('${key}')"><td style="padding:8px; font-size:10px;">${timeStr}</td><td style="padding:8px; font-weight:600; color:#1a73e8; max-width:100px; overflow:hidden;">${log.fileName}</td><td style="padding:8px; text-align:right; font-size:10px;">${money}</td><td style="padding:8px; text-align:center;"><span onclick="event.stopPropagation(); deleteUploadBatch('${key}', '${log.fileName}')" style="color:red; font-weight:bold;">✖</span></td></tr>`; }); tbody.innerHTML = html; updateHistoryHighlight(); }); }
function renderPerformanceTable(data) { const tbody = document.getElementById('ads-table-perf'); if(!tbody) return; tbody.innerHTML = ""; data.slice(0, 300).forEach(item => { const cpl = item.result > 0 ? Math.round(item.spend/item.result) : 0; const statusColor = item.status === 'Đang chạy' ? '#0f9d58' : '#999'; const statusIcon = item.status === 'Đang chạy' ? '● Running' : 'Stopped'; const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #f0f0f0"; tr.innerHTML = `<td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td><td class="text-left" style="color:#333;">${item.adName}</td><td class="text-center" style="color:${statusColor}; font-weight:bold; font-size:10px;">${statusIcon}</td><td class="text-right" style="font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td><td class="text-center" style="font-weight:bold;">${item.result}</td><td class="text-right" style="color:#666;">${new Intl.NumberFormat('vi-VN').format(cpl)}</td><td class="text-center" style="font-size:10px; color:#555;">${item.run_start}</td>`; tbody.appendChild(tr); }); }
function renderFinanceTable(data) { const tbody = document.getElementById('ads-table-fin'); if(!tbody) return; tbody.innerHTML = ""; data.slice(0, 300).forEach(item => { const vat = item.spend * 0.1; const fee = item.fee || 0; const total = item.spend + vat + fee; const rev = item.revenue || 0; const roas = total > 0 ? (rev / total) : 0; const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #f0f0f0"; tr.innerHTML = `<td class="text-left" style="font-weight:bold; color:#1a73e8;">${item.employee}</td><td class="text-left" style="color:#333;">${item.adName}</td><td class="text-right">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td><td class="text-right" style="color:#d93025;">${new Intl.NumberFormat('vi-VN').format(vat)}</td><td class="text-right" style="color:#e67c73;">${fee != 0 ? new Intl.NumberFormat('vi-VN').format(fee) : '-'}</td><td class="text-right" style="font-weight:800; color:#333;">${new Intl.NumberFormat('vi-VN').format(Math.round(total))}</td><td class="text-right" style="font-weight:bold; color:#137333;">${rev > 0 ? new Intl.NumberFormat('vi-VN').format(rev) : '-'}</td><td class="text-center" style="font-weight:bold; color:${roas>0?'#f4b400':'#999'}">${roas>0?roas.toFixed(2)+'x':'-'}</td>`; tbody.appendChild(tr); }); }
function drawChartPerf(data) { const ctx = document.getElementById('chart-ads-perf'); if(!ctx) return; if(window.myAdsChart) window.myAdsChart.destroy(); let agg = {}; data.forEach(item => { if(!agg[item.employee]) agg[item.employee] = { spend: 0, result: 0 }; agg[item.employee].spend += item.spend; agg[item.employee].result += item.result; }); const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.spend - a.spend).slice(0, 10); window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Chi Tiêu (FB)', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' }, { label: 'Kết Quả', data: sorted.map(i => i.result), backgroundColor: '#1a73e8', yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false, position: 'left' }, y1: { display: false, position: 'right' } } } }); }
function drawChartFin(data) { const ctx = document.getElementById('chart-ads-fin'); if(!ctx) return; if(window.myAdsChart) window.myAdsChart.destroy(); let agg = {}; data.forEach(item => { if(!agg[item.employee]) agg[item.employee] = { cost: 0, rev: 0 }; agg[item.employee].cost += (item.spend * 1.1) + (item.fee || 0); agg[item.employee].rev += (item.revenue || 0); }); const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.cost - a.cost).slice(0, 10); window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Tổng Chi Phí (All)', data: sorted.map(i => i.cost), backgroundColor: '#d93025' }, { label: 'Doanh Thu', data: sorted.map(i => i.rev), backgroundColor: '#137333' }] }, options: { responsive: true, maintainAspectRatio: false } }); }
function parseCleanNumber(val) { if (!val) return 0; if (typeof val === 'number') return val; let s = val.toString().trim().replace(/,/g, ''); return parseFloat(s) || 0; }
function deleteUploadBatch(id, name) { if(!confirm("Xóa file: " + name + "?")) return; db.ref('ads_data').orderByChild('batchId').equalTo(id).once('value', s => { const u = {}; u['/upload_logs/' + id] = null; if(s.exists()) s.forEach(c => u['/ads_data/' + c.key] = null); db.ref().update(u).then(() => { GLOBAL_ADS_DATA = GLOBAL_ADS_DATA.filter(item => item.batchId !== id); if(ACTIVE_BATCH_ID === id) ACTIVE_BATCH_ID = null; applyFilters(); }); }); }
function selectUploadBatch(id) { ACTIVE_BATCH_ID = id; updateHistoryHighlight(); applyFilters(); }
function viewAllData() { ACTIVE_BATCH_ID = null; updateHistoryHighlight(); applyFilters(); }
function updateHistoryHighlight() { document.querySelectorAll('.history-row').forEach(row => { row.style.background = (ACTIVE_BATCH_ID && row.dataset.id === ACTIVE_BATCH_ID) ? '#e8f0fe' : 'transparent'; }); }
function formatExcelDate(input) { if (!input) return "-"; if (typeof input === 'number') { const date = new Date((input - 25569) * 86400 * 1000); return formatDateObj(date); } const str = input.toString().trim(); if (str.match(/^\d{4}-\d{2}-\d{2}$/)) { const parts = str.split('-'); return `${parts[2]}-${parts[1]}-${parts[0]}`; } return str; }
function formatDateObj(d) { if (isNaN(d.getTime())) return "-"; const day = ("0" + d.getDate()).slice(-2); const month = ("0" + (d.getMonth() + 1)).slice(-2); const year = d.getFullYear(); return `${day}-${month}-${year}`; }

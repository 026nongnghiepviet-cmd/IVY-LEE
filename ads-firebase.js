/**
 * ADS MODULE V21 (DIAGNOSTIC MODE)
 * - Thêm thông báo lỗi chi tiết khi không đọc được file
 * - Nới lỏng điều kiện tìm cột (chấp nhận "Chi tiêu" hoặc "Chi phí")
 * - Fix lỗi hiển thị biểu đồ
 */

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
let ACTIVE_BATCH_ID = null;

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V21 Loaded");
    
    // Xóa bảng cũ và tạo lại khung mới
    const container = document.getElementById('ads-analysis-result');
    if(container) {
        const oldDiv = container.querySelector('.table-responsive');
        if(oldDiv) oldDiv.remove();
    }
    
    injectInterface();
    setupMainTableStructure();

    const inputAds = document.getElementById('ads-file-input');
    if(inputAds && !inputAds.hasAttribute('data-listening')) {
        inputAds.addEventListener('change', handleFirebaseUpload);
        inputAds.setAttribute('data-listening', 'true');
    }

    document.getElementById('filter-search')?.addEventListener('keyup', applyFilters);
    document.getElementById('filter-start')?.addEventListener('change', applyFilters);
    document.getElementById('filter-end')?.addEventListener('change', applyFilters);

    if(db) {
        loadUploadHistory();
        loadAdsData();
    }
    
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
    window.triggerRevenueUpload = () => document.getElementById('revenue-file-input').click();
}

// --- HÀM TÌM HEADER (QUAN TRỌNG) ---
function findHeaderRow(rows) {
    for (let i = 0; i < Math.min(rows.length, 20); i++) { // Quét 20 dòng đầu
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const rowStr = row.map(c => c ? c.toString().toLowerCase() : "").join(" ");
        
        // Tìm từ khóa đặc trưng của file báo cáo
        if (rowStr.includes("số tiền đã chi tiêu") || rowStr.includes("chi phí") || rowStr.includes("amount spent") || rowStr.includes("kết quả")) {
            return { index: i, header: row.map(c => c ? c.toString().toLowerCase().trim() : "") };
        }
    }
    return null;
}

// --- LOGIC BÓC TÁCH ---
function parseExcelSmart(rows) {
    if (rows.length < 1) return { error: "File rỗng" };
    
    const headerInfo = findHeaderRow(rows);
    if (!headerInfo) {
        return { error: "Không tìm thấy dòng tiêu đề chứa 'Số tiền đã chi tiêu' hoặc 'Kết quả' trong 20 dòng đầu." };
    }

    const header = headerInfo.header;
    const startRowIdx = headerInfo.index + 1;

    // Map cột (Nới lỏng điều kiện)
    const colStart = header.findIndex(h => h.includes("bắt đầu") || h.includes("start"));
    const colEnd = header.findIndex(h => h.includes("kết thúc") || h.includes("end"));
    
    let colCamp = header.findIndex(h => h.includes("tên nhóm") || h.includes("ad set name"));
    if (colCamp === -1) colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    
    // Chấp nhận nhiều từ khóa cho cột Tiền
    const colSpend = header.findIndex(h => h.includes("số tiền đã chi") || h.includes("chi tiêu") || h.includes("amount spent"));
    
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colMess = header.findIndex(h => h.includes("người liên hệ") || h.includes("messaging"));
    const colBudget = header.findIndex(h => h.includes("ngân sách") || h.includes("budget"));
    const colImps = header.findIndex(h => h.includes("hiển thị") || h.includes("impressions"));
    const colClicks = header.findIndex(h => h.includes("nhấp") || h.includes("clicks"));

    if (colSpend === -1 || colCamp === -1) {
        return { 
            error: `Tìm thấy header tại dòng ${headerInfo.index + 1} nhưng thiếu cột quan trọng.\n` +
                   `- Cột Tên nhóm QC/Chiến dịch: ${colCamp > -1 ? "Có" : "KHÔNG"}\n` +
                   `- Cột Số tiền chi tiêu: ${colSpend > -1 ? "Có" : "KHÔNG"}\n\n` +
                   `Các cột tìm thấy: ${header.join(", ")}`
        };
    }

    let parsedData = [];
    let grandTotal = 0;
    const today = new Date(); today.setHours(0,0,0,0);

    for(let i = startRowIdx; i < rows.length; i++) {
        let r = rows[i];
        if(!r || r.length===0) continue;
        
        let rawSpend = parseCleanNumber(r[colSpend]);
        if(rawSpend <= 0) continue; 

        let spendWithVAT = rawSpend * 1.1; // +10% VAT
        let leads = parseCleanNumber(r[colResult]) || parseCleanNumber(r[colMess]) || 0;
        let budget = parseCleanNumber(r[colBudget]);
        let imps = parseCleanNumber(r[colImps]);
        let clicks = parseCleanNumber(r[colClicks]);
        
        let campaignName = r[colCamp] || "Unknown";
        
        let parts = campaignName.split('-');
        let employee = parts[0] ? parts[0].trim().toUpperCase() : "KHÁC";
        let product = parts[1] ? parts[1].trim() : "Chung";

        let status = "Đang chạy";
        if (r[colEnd]) {
            let d = parseSmartDate(r[colEnd]);
            if (d && d < today) status = "Kết thúc";
        }
        
        let dStart = parseSmartDate(r[colStart]);
        let runStartStr = dStart ? dStart.toISOString().substring(0,10) : "";

        parsedData.push({
            campaign: campaignName,
            employee: employee,
            product: product,
            raw_spend: rawSpend,
            spend: spendWithVAT,
            leads: leads,
            budget: budget,
            impressions: imps,
            clicks: clicks,
            status: status,
            run_start: runStartStr, 
            run_end: r[colEnd] || ""
        });
        grandTotal += rawSpend;
    }
    
    if (parsedData.length === 0) {
        return { error: "File có header nhưng không có dòng dữ liệu nào có số tiền chi tiêu > 0." };
    }

    return { data: parsedData, totalSpend: grandTotal };
}

// --- XỬ LÝ UPLOAD (THÔNG BÁO RÕ RÀNG) ---
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
            const json = XLSX.utils.sheet_to_json(sheet, {header:1});
            
            const result = parseExcelSmart(json);
            
            if(result.error) {
                alert("❌ LỖI ĐỌC FILE:\n" + result.error);
                if(btnText) btnText.innerText = "Upload Excel (FB)";
                return;
            }
            
            if(result.data.length > 0) {
                const batchId = Date.now().toString(); 
                db.ref('upload_logs/' + batchId).set({
                    timestamp: new Date().toISOString(),
                    fileName: file.name,
                    rowCount: result.data.length,
                    totalSpend: result.totalSpend
                });
                const updates = {};
                result.data.forEach(item => {
                    const newKey = db.ref().child('ads_data').push().key;
                    item.batchId = batchId;
                    updates['/ads_data/' + newKey] = item;
                });
                db.ref().update(updates).then(() => {
                    alert(`✅ THÀNH CÔNG!\n- Đã đọc được: ${result.data.length} nhóm quảng cáo\n- Tổng tiền (Gốc): ${result.totalSpend.toLocaleString()}đ`);
                    if(btnText) btnText.innerText = "Upload Excel (FB)";
                    document.getElementById('ads-file-input').value = "";
                    ACTIVE_BATCH_ID = batchId;
                });
            }
        } catch (err) { alert("Lỗi hệ thống: " + err.message); if(btnText) btnText.innerText = "Upload Excel (FB)"; }
    };
    reader.readAsArrayBuffer(file);
}

// --- CÁC HÀM TIỆN ÍCH ---
function parseCleanNumber(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let s = val.toString().trim().replace(/,/g, ''); 
    return parseFloat(s) || 0;
}

function parseSmartDate(value) {
    if (!value) return null;
    if (typeof value === 'number') return new Date((value - 25569) * 86400 * 1000);
    if (typeof value === 'string') return new Date(value);
    return null;
}

// --- CÁC HÀM GIAO DIỆN & RENDER (GIỮ NGUYÊN) ---
function injectInterface() {
    const uploadArea = document.querySelector('.upload-area');
    if(!uploadArea) return;
    if (!document.getElementById('revenue-upload-area')) {
        const revDiv = document.createElement('div');
        revDiv.id = 'revenue-upload-area';
        revDiv.style.marginTop = '10px';
        revDiv.style.padding = '10px';
        revDiv.style.border = '1px dashed #28a745';
        revDiv.style.borderRadius = '8px';
        revDiv.style.background = '#f0fff4';
        revDiv.style.textAlign = 'center';
        revDiv.style.cursor = 'pointer';
        revDiv.onclick = window.triggerRevenueUpload;
        revDiv.innerHTML = `<span style="font-size:20px;">💰</span> <span style="font-weight:bold; color:#28a745; font-size:12px;">Upload File Doanh Thu</span><input type="file" id="revenue-file-input" style="display:none" accept=".csv, .xlsx, .xls" onchange="handleRevenueUpload(this)">`;
        uploadArea.parentNode.insertBefore(revDiv, uploadArea.nextSibling);
    }
    if(document.getElementById('upload-history-container')) return;
    const historyDiv = document.createElement('div');
    historyDiv.id = 'upload-history-container';
    historyDiv.style.marginTop = '20px';
    historyDiv.style.background = '#fff';
    historyDiv.style.padding = '15px';
    historyDiv.style.borderRadius = '10px';
    historyDiv.style.border = '1px solid #eee';
    historyDiv.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><div style="font-weight:800; color:#333;">📂 LỊCH SỬ UPLOAD</div><button onclick="viewAllData()" style="background:#1a73e8; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px; font-weight:bold;">Xem Tất Cả</button></div><div style="max-height: 250px; overflow-y: auto;"><table style="width:100%; font-size:11px; border-collapse: collapse;"><thead style="position: sticky; top: 0; background: #fff; z-index:1;"><tr style="background:#f1f3f4; color:#555; text-align:left;"><th style="padding:5px;">Ngày</th><th style="padding:5px;">File</th><th style="padding:5px; text-align:right;">Tiền (Gốc)</th><th style="padding:5px; text-align:center;">Xóa</th></tr></thead><tbody id="upload-history-body"></tbody></table></div>`;
    const revArea = document.getElementById('revenue-upload-area');
    revArea.parentNode.insertBefore(historyDiv, revArea.nextSibling);
}

function setupMainTableStructure() {
    const resultArea = document.getElementById('ads-analysis-result');
    if(!resultArea) return;
    let oldContainer = resultArea.querySelector('.table-responsive');
    if(oldContainer) oldContainer.remove();
    const newContainer = document.createElement('div');
    newContainer.className = 'table-responsive';
    newContainer.style.marginTop = '20px';
    newContainer.innerHTML = `<table id="ads-table-pro" style="width:100%; font-size:12px; border-collapse: collapse;"><thead><tr style="background:#f8f9fa; color:#444; font-size:11px; text-transform:uppercase; border-bottom:2px solid #ddd;"><th style="padding:10px; text-align:left;">Nhân Viên</th><th style="padding:10px; text-align:left;">Chiến Dịch</th><th style="padding:10px; text-align:center;">TT</th><th style="padding:10px; text-align:right;">Tiền FB<br><span style="font-size:9px; color:#d93025">(+10% VAT)</span></th><th style="padding:10px; text-align:right;">Phí Khác</th><th style="padding:10px; text-align:right;">Tổng Chi</th><th style="padding:10px; text-align:right;">Doanh Thu</th><th style="padding:10px; text-align:center;">ROAS</th></tr></thead><tbody id="ads-table-body"><tr><td colspan="8" style="text-align:center; padding:20px; color:#888;">Đang tải dữ liệu...</td></tr></tbody></table>`;
    resultArea.appendChild(newContainer);
}

function handleRevenueUpload(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header:1});
            if (json.length < 2) return;
            const header = json[0].map(x => x ? x.toString().toLowerCase().trim() : "");
            const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign") || h.includes("tên nhóm quảng cáo"));
            const colRev = header.findIndex(h => h.includes("doanh thu") || h.includes("revenue"));
            const colFee = header.findIndex(h => h.includes("phí chênh lệch") || h.includes("chi phí khác") || h.includes("diff"));
            if (colCamp === -1) { alert("Thiếu cột 'Tên chiến dịch' hoặc 'Tên nhóm quảng cáo'"); return; }
            let count = 0;
            GLOBAL_REVENUE_DATA = {}; 
            for(let i=1; i<json.length; i++) {
                let r = json[i];
                if(!r || !r[colCamp]) continue;
                let campName = r[colCamp].toString().trim();
                let revenue = colRev > -1 ? parseCleanNumber(r[colRev]) : 0;
                let fee = colFee > -1 ? parseCleanNumber(r[colFee]) : 0;
                GLOBAL_REVENUE_DATA[campName] = { revenue: revenue, fee: fee };
                count++;
            }
            alert(`✅ Đã nhập ${count} dòng doanh thu.`);
            applyFilters();
        } catch (err) { alert("Lỗi: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
    input.value = "";
}

function loadUploadHistory() {
    const tbody = document.getElementById('upload-history-body');
    if(!tbody) return;
    db.ref('upload_logs').limitToLast(30).on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Trống</td></tr>"; return; }
        const sorted = Object.entries(data).sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
        let html = "";
        sorted.forEach(([key, log]) => {
            const d = new Date(log.timestamp);
            const timeStr = `${("0"+d.getDate()).slice(-2)}/${("0"+(d.getMonth()+1)).slice(-2)} ${d.getHours()}:${("0"+d.getMinutes()).slice(-2)}`;
            const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
            html += `<tr class="history-row" data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer;" onclick="selectUploadBatch('${key}')"><td style="padding:5px; color:#555">${timeStr}</td><td style="padding:5px; font-weight:600; color:#1a73e8; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100px;">${log.fileName}</td><td style="padding:5px; text-align:right; font-weight:bold; font-size:10px">${money}</td><td style="padding:5px; text-align:center;"><button onclick="event.stopPropagation(); deleteUploadBatch('${key}', '${log.fileName}')" style="cursor:pointer; background:none; border:none; font-size:12px; color:red;">✕</button></td></tr>`;
        });
        tbody.innerHTML = html;
        updateHistoryHighlight();
    });
}

function deleteUploadBatch(batchId, fileName) {
    if(!confirm(`⚠️ Xóa file: ${fileName}?`)) return;
    if(ACTIVE_BATCH_ID === batchId) ACTIVE_BATCH_ID = null;
    db.ref('ads_data').orderByChild('batchId').equalTo(batchId).once('value', snapshot => {
        const updates = {};
        updates['/upload_logs/' + batchId] = null;
        if (snapshot.exists()) snapshot.forEach(child => { updates['/ads_data/' + child.key] = null; });
        db.ref().update(updates).then(() => {
            GLOBAL_ADS_DATA = GLOBAL_ADS_DATA.filter(item => item.batchId !== batchId);
            applyFilters();
            updateHistoryHighlight();
        });
    });
}

function selectUploadBatch(id) { ACTIVE_BATCH_ID = id; updateHistoryHighlight(); applyFilters(); }
function viewAllData() { ACTIVE_BATCH_ID = null; updateHistoryHighlight(); applyFilters(); }
function updateHistoryHighlight() {
    document.querySelectorAll('.history-row').forEach(row => {
        row.style.background = (ACTIVE_BATCH_ID && row.dataset.id === ACTIVE_BATCH_ID) ? '#e8f0fe' : 'transparent';
        row.style.fontWeight = (ACTIVE_BATCH_ID && row.dataset.id === ACTIVE_BATCH_ID) ? 'bold' : 'normal';
    });
}

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
    let filtered = GLOBAL_ADS_DATA;
    if(ACTIVE_BATCH_ID) filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID);
    filtered = filtered.filter(item => {
        const contentMatch = (item.employee + " " + item.product + " " + item.campaign).toLowerCase().includes(search);
        let dateMatch = true;
        if(item.run_start) {
            const d = item.run_start.substring(0,10);
            if (startStr && d < startStr) dateMatch = false;
            if (endStr && d > endStr) dateMatch = false;
        }
        return contentMatch && dateMatch;
    });
    renderMainTable(filtered);
    drawChart(filtered);
}

function renderMainTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";
    if(data.length === 0) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">Không có dữ liệu</td></tr>`; return; }
    data.sort((a,b) => b.spend - a.spend);
    let sumTotalCost = 0; let sumRevenue = 0;
    data.slice(0, 150).forEach(item => {
        let external = GLOBAL_REVENUE_DATA[item.campaign] || { revenue: 0, fee: 0 };
        let diffFee = external.fee;
        let revenue = external.revenue;
        let totalCost = item.spend + diffFee;
        let roas = totalCost > 0 ? (revenue / totalCost) : 0;
        sumTotalCost += totalCost; sumRevenue += revenue;
        const fbSpendStr = new Intl.NumberFormat('vi-VN').format(Math.round(item.spend));
        const feeStr = diffFee > 0 ? new Intl.NumberFormat('vi-VN').format(diffFee) : "-";
        const totalStr = new Intl.NumberFormat('vi-VN').format(Math.round(totalCost));
        const revStr = revenue > 0 ? new Intl.NumberFormat('vi-VN').format(revenue) : "-";
        let roasColor = "#666"; if(roas > 2) roasColor = "#0f9d58"; else if (roas > 1) roasColor = "#f4b400"; else if (revenue > 0) roasColor = "#d93025";
        const roasStr = revenue > 0 ? roas.toFixed(2) + "x" : "-";
        let statusBadge = item.status === "Đang chạy" ? `<span style="color:#0f9d58; font-weight:bold">●</span>` : `<span style="color:#ccc">●</span>`;
        const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #f0f0f0";
        tr.innerHTML = `<td style="font-weight:bold; color:#1a73e8; vertical-align:middle; padding:8px;">${item.employee}</td><td style="vertical-align:middle; padding:8px;"><div style="font-weight:600; font-size:11px; color:#333; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.campaign}">${item.campaign}</div><div style="font-size:10px; color:#888;">📅 ${item.run_start}</div></td><td style="text-align:center; vertical-align:middle;">${statusBadge}</td><td style="text-align:right; font-size:12px; padding:8px; color:#555;">${fbSpendStr}</td><td style="text-align:right; font-size:12px; padding:8px; color:#e67c73;">${feeStr}</td><td style="text-align:right; font-weight:bold; color:#d93025; padding:8px;">${totalStr}</td><td style="text-align:right; font-weight:bold; color:#137333; padding:8px;">${revStr}</td><td style="text-align:center; font-weight:bold; color:${roasColor}; padding:8px;">${roasStr}</td>`;
        tbody.appendChild(tr);
    });
    updateKPI(data, sumTotalCost, sumRevenue);
}

function updateKPI(data, totalCost, totalRev) {
    const elSpend = document.getElementById('metric-spend');
    const elLeads = document.getElementById('metric-leads');
    const elCpl = document.getElementById('metric-cpl');
    const elCpm = document.getElementById('metric-cpm'); 
    if(elSpend) {
        let totalLeads = data.reduce((sum, item) => sum + item.leads, 0);
        elSpend.innerText = new Intl.NumberFormat('vi-VN').format(Math.round(totalCost)) + " ₫";
        if(elLeads) elLeads.innerText = totalLeads;
        let cpl = totalLeads > 0 ? Math.round(totalCost / totalLeads) : 0;
        if(elCpl) elCpl.innerText = new Intl.NumberFormat('vi-VN').format(cpl) + " ₫";
        if(elCpm) {
            let roasTotal = totalCost > 0 ? (totalRev / totalCost).toFixed(2) : "0";
            let cardTitle = elCpm.parentElement.querySelector('p');
            if(cardTitle) cardTitle.innerText = "ROAS TỔNG";
            elCpm.innerText = roasTotal + "x";
            elCpm.style.color = roasTotal > 1 ? "#137333" : "#d93025";
        }
    }
}

function drawChart(data) {
    const ctx = document.getElementById('chart-ads-upload');
    if(!ctx) return;
    if(window.myAdsChart) window.myAdsChart.destroy();
    let agg = {};
    data.forEach(item => {
        if(!agg[item.employee]) agg[item.employee] = { spend: 0, leads: 0 };
        agg[item.employee].spend += item.spend;
        agg[item.employee].leads += item.leads;
    });
    const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.spend - a.spend).slice(0, 10);
    window.myAdsChart = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i.name), datasets: [{ label: 'Chi Phí (Đã VAT)', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' }, { label: 'Leads', data: sorted.map(i => i.leads), backgroundColor: '#1a73e8', yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { position: 'left', display: false }, y1: { position: 'right', display: false } } } });
}

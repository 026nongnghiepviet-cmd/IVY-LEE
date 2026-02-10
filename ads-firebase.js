/**
 * ADS MODULE V18 (ROAS - VAT - MERGE DATA)
 * - Tự động +10% VAT vào chi tiêu Facebook
 * - Upload thêm File Doanh thu/Phí để tính ROAS
 * - Ghép dữ liệu 2 file dựa trên Tên Chiến Dịch
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

let GLOBAL_ADS_DATA = [];      // Dữ liệu từ Facebook
let GLOBAL_REVENUE_DATA = {};  // Dữ liệu từ File Doanh thu (Map theo tên Campaign)
let ACTIVE_BATCH_ID = null;

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V18 (ROAS Mode) Loaded");
    
    // 1. Tạo giao diện (Bảng lịch sử + Nút up file phụ)
    injectInterface();
    
    // 2. Vẽ lại bảng chính cho đủ cột (Thêm ROAS, Doanh thu)
    setupMainTableStructure();

    // 3. Gắn sự kiện Upload File Facebook
    const inputAds = document.getElementById('ads-file-input');
    if(inputAds && !inputAds.hasAttribute('data-listening')) {
        inputAds.addEventListener('change', handleFirebaseUpload);
        inputAds.setAttribute('data-listening', 'true');
    }

    // 4. Gắn sự kiện bộ lọc
    document.getElementById('filter-search')?.addEventListener('keyup', applyFilters);
    document.getElementById('filter-start')?.addEventListener('change', applyFilters);
    document.getElementById('filter-end')?.addEventListener('change', applyFilters);

    if(db) {
        loadUploadHistory();
        loadAdsData();
    }
    
    // Global functions
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
    window.triggerRevenueUpload = () => document.getElementById('revenue-file-input').click();
}

// --- TẠO GIAO DIỆN (THÊM NÚT UP FILE DOANH THU) ---
function injectInterface() {
    const uploadArea = document.querySelector('.upload-area');
    if(!uploadArea) return;

    // A. Chèn nút Upload Doanh thu ngay dưới nút Upload Ads
    if (!document.getElementById('revenue-upload-area')) {
        const revDiv = document.createElement('div');
        revDiv.id = 'revenue-upload-area';
        revDiv.style.marginTop = '10px';
        revDiv.style.padding = '10px';
        revDiv.style.border = '1px dashed #28a745'; // Màu xanh lá
        revDiv.style.borderRadius = '8px';
        revDiv.style.background = '#f0fff4';
        revDiv.style.textAlign = 'center';
        revDiv.style.cursor = 'pointer';
        revDiv.onclick = window.triggerRevenueUpload;
        revDiv.innerHTML = `
            <span style="font-size:20px;">💰</span>
            <span style="font-weight:bold; color:#28a745; font-size:12px;">Upload File Doanh Thu & Phí (ROAS)</span>
            <input type="file" id="revenue-file-input" style="display:none" accept=".csv, .xlsx, .xls" onchange="handleRevenueUpload(this)">
        `;
        uploadArea.parentNode.insertBefore(revDiv, uploadArea.nextSibling);
    }

    // B. Chèn bảng Lịch sử (như cũ)
    if(document.getElementById('upload-history-container')) return;
    const historyDiv = document.createElement('div');
    historyDiv.id = 'upload-history-container';
    historyDiv.style.marginTop = '20px';
    historyDiv.style.background = '#fff';
    historyDiv.style.padding = '15px';
    historyDiv.style.borderRadius = '10px';
    historyDiv.style.border = '1px solid #eee';
    historyDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-weight:800; color:#333;">📂 LỊCH SỬ FB ADS</div>
            <button onclick="viewAllData()" style="background:#1a73e8; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px; font-weight:bold;">Xem Tất Cả</button>
        </div>
        <div style="max-height: 250px; overflow-y: auto;">
            <table style="width:100%; font-size:11px; border-collapse: collapse;">
                <thead style="position: sticky; top: 0; background: #fff; z-index:1;">
                    <tr style="background:#f1f3f4; color:#555; text-align:left;">
                        <th style="padding:5px;">Ngày</th>
                        <th style="padding:5px;">File</th>
                        <th style="padding:5px; text-align:right;">Tiền (Gốc)</th>
                        <th style="padding:5px; text-align:center;">Xóa</th>
                    </tr>
                </thead>
                <tbody id="upload-history-body"></tbody>
            </table>
        </div>
    `;
    // Chèn xuống dưới cùng (sau nút Revenue)
    const revArea = document.getElementById('revenue-upload-area');
    revArea.parentNode.insertBefore(historyDiv, revArea.nextSibling);
}

// --- SETUP HEADER BẢNG CHÍNH (THÊM CỘT ROAS) ---
function setupMainTableStructure() {
    const tableContainer = document.querySelector('.table-responsive table');
    if (!tableContainer && document.getElementById('ads-table-pro')) return; 
    
    // Tìm hoặc tạo bảng
    let finalTable = document.getElementById('ads-table-pro');
    if (!finalTable) {
        const resultArea = document.getElementById('ads-analysis-result');
        if(!resultArea) return;
        
        // Reset container cũ nếu cần
        let oldContainer = resultArea.querySelector('.table-responsive');
        if(oldContainer) oldContainer.innerHTML = '';
        else {
            oldContainer = document.createElement('div');
            oldContainer.className = 'table-responsive';
            oldContainer.style.marginTop = '20px';
            resultArea.appendChild(oldContainer);
        }

        finalTable = document.createElement('table');
        finalTable.id = 'ads-table-pro';
        finalTable.style.width = '100%';
        finalTable.style.fontSize = '12px';
        finalTable.style.borderCollapse = 'collapse';
        oldContainer.appendChild(finalTable);
    }

    finalTable.innerHTML = `
        <thead>
            <tr style="background:#f8f9fa; color:#444; font-size:11px; text-transform:uppercase; border-bottom:2px solid #ddd;">
                <th style="padding:10px; text-align:left;">Nhân Viên</th>
                <th style="padding:10px; text-align:left;">Chiến Dịch</th>
                <th style="padding:10px; text-align:center;">TT</th>
                <th style="padding:10px; text-align:right;">Tiền FB<br><span style="font-size:9px; color:#d93025">(+10% VAT)</span></th>
                <th style="padding:10px; text-align:right;">Phí Khác</th>
                <th style="padding:10px; text-align:right;">Tổng Chi</th>
                <th style="padding:10px; text-align:right;">Doanh Thu</th>
                <th style="padding:10px; text-align:center;">ROAS</th>
            </tr>
        </thead>
        <tbody id="ads-table-body">
            <tr><td colspan="8" style="text-align:center; padding:20px; color:#888;">Đang tải dữ liệu...</td></tr>
        </tbody>
    `;
}

// --- XỬ LÝ FILE DOANH THU & PHÍ (FILE 2) ---
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
            
            // Parse File Doanh Thu
            if (json.length < 2) return;
            const header = json[0].map(x => x ? x.toString().toLowerCase().trim() : "");
            
            // Tìm cột
            const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
            const colRev = header.findIndex(h => h.includes("doanh thu") || h.includes("revenue"));
            const colFee = header.findIndex(h => h.includes("phí chênh lệch") || h.includes("chi phí khác") || h.includes("diff"));

            if (colCamp === -1) {
                alert("File thiếu cột 'Tên chiến dịch' để khớp lệnh!");
                return;
            }

            let count = 0;
            GLOBAL_REVENUE_DATA = {}; // Reset data cũ

            for(let i=1; i<json.length; i++) {
                let r = json[i];
                if(!r || !r[colCamp]) continue;

                let campName = r[colCamp].toString().trim(); // Key để map
                let revenue = colRev > -1 ? (parseFloat(r[colRev]) || 0) : 0;
                let fee = colFee > -1 ? (parseFloat(r[colFee]) || 0) : 0;

                GLOBAL_REVENUE_DATA[campName] = {
                    revenue: revenue,
                    fee: fee
                };
                count++;
            }

            alert(`✅ Đã nhập ${count} dòng doanh thu/phí.\nHệ thống sẽ tự động tính lại ROAS ngay bây giờ!`);
            applyFilters(); // Vẽ lại bảng ngay lập tức

        } catch (err) { alert("Lỗi đọc file doanh thu: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
    input.value = ""; // Reset input
}

// --- LOGIC BÓC TÁCH FACEBOOK (FILE 1) ---
function parseExcelSmart(rows) {
    if (rows.length < 2) return { data: [], totalSpend: 0 };
    
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    const colStart = header.findIndex(h => h.includes("bắt đầu báo cáo"));
    const colEnd = header.findIndex(h => h.includes("kết thúc báo cáo"));
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    const colSpend = header.findIndex(h => h.includes("số tiền đã chi tiêu") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colMess = header.findIndex(h => h.includes("người liên hệ") || h.includes("messaging"));

    if (colSpend === -1) return { data: [], totalSpend: 0 };

    let parsedData = [];
    let grandTotal = 0;
    const today = new Date(); today.setHours(0,0,0,0);

    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r || r.length===0) continue;
        
        let rawSpend = parseFloat(r[colSpend]) || 0;
        if(rawSpend <= 0) continue; 

        // QUAN TRỌNG: Tự động cộng 10% VAT vào giá gốc ngay khi đọc file
        let spendWithVAT = rawSpend * 1.1;

        let leads = parseFloat(r[colResult]) || parseFloat(r[colMess]) || 0;
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
            raw_spend: rawSpend, // Giá gốc từ FB
            spend: spendWithVAT, // Giá đã có VAT
            leads: leads,
            status: status,
            run_start: runStartStr, 
            run_end: r[colEnd] || ""
        });
        grandTotal += rawSpend; // Tổng tiền gốc (để log)
    }
    return { data: parsedData, totalSpend: grandTotal };
}

// --- RENDER BẢNG CHÍNH (LOGIC ROAS) ---
function renderMainTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";
    
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">Không có dữ liệu</td></tr>`;
        return;
    }

    // Sắp xếp
    data.sort((a,b) => b.spend - a.spend);

    let sumTotalCost = 0;
    let sumRevenue = 0;

    data.slice(0, 150).forEach(item => {
        // 1. TÌM DỮ LIỆU GHÉP TỪ FILE 2 (NẾU CÓ)
        // Tìm chính xác theo tên chiến dịch
        let external = GLOBAL_REVENUE_DATA[item.campaign] || { revenue: 0, fee: 0 };
        
        // 2. TÍNH TOÁN
        let diffFee = external.fee;
        let revenue = external.revenue;
        let totalCost = item.spend + diffFee; // (FB + VAT) + Phí chênh lệch
        let roas = totalCost > 0 ? (revenue / totalCost) : 0;

        sumTotalCost += totalCost;
        sumRevenue += revenue;

        // 3. FORMAT
        const fbSpendStr = new Intl.NumberFormat('vi-VN').format(Math.round(item.spend));
        const feeStr = diffFee > 0 ? new Intl.NumberFormat('vi-VN').format(diffFee) : "-";
        const totalStr = new Intl.NumberFormat('vi-VN').format(Math.round(totalCost));
        const revStr = revenue > 0 ? new Intl.NumberFormat('vi-VN').format(revenue) : "-";
        
        // Màu sắc ROAS
        let roasColor = "#666";
        if(roas > 2) roasColor = "#0f9d58"; // Xanh (Lời)
        else if (roas > 1) roasColor = "#f4b400"; // Vàng (Hòa/Lời ít)
        else if (revenue > 0) roasColor = "#d93025"; // Đỏ (Lỗ)
        
        const roasStr = revenue > 0 ? roas.toFixed(2) + "x" : "-";
        
        // Status Badge
        let statusBadge = item.status === "Đang chạy" ? `<span style="color:#0f9d58; font-weight:bold">●</span>` : `<span style="color:#ccc">●</span>`;

        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #f0f0f0";
        tr.innerHTML = `
            <td style="font-weight:bold; color:#1a73e8; vertical-align:middle; padding:8px;">${item.employee}</td>
            <td style="vertical-align:middle; padding:8px;">
                <div style="font-weight:600; font-size:11px; color:#333; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.campaign}">${item.campaign}</div>
                <div style="font-size:10px; color:#888;">📅 ${item.run_start}</div>
            </td>
            <td style="text-align:center; vertical-align:middle;">${statusBadge}</td>
            <td style="text-align:right; font-size:12px; padding:8px; color:#555;">${fbSpendStr}</td>
            <td style="text-align:right; font-size:12px; padding:8px; color:#e67c73;">${feeStr}</td>
            <td style="text-align:right; font-weight:bold; color:#d93025; padding:8px;">${totalStr}</td>
            <td style="text-align:right; font-weight:bold; color:#137333; padding:8px;">${revStr}</td>
            <td style="text-align:center; font-weight:bold; color:${roasColor}; padding:8px;">${roasStr}</td>
        `;
        tbody.appendChild(tr);
    });

    // CẬP NHẬT KPI CARD
    updateKPI(data, sumTotalCost, sumRevenue);
}

function updateKPI(data, totalCost, totalRev) {
    // Tìm thẻ KPI để update
    const elSpend = document.getElementById('metric-spend');
    const elLeads = document.getElementById('metric-leads');
    const elCpl = document.getElementById('metric-cpl');
    const elCpm = document.getElementById('metric-cpm'); // Tận dụng thẻ này hiển thị ROAS Tổng

    if(elSpend) {
        // Tính tổng leads
        let totalLeads = data.reduce((sum, item) => sum + item.leads, 0);
        
        elSpend.innerText = new Intl.NumberFormat('vi-VN').format(Math.round(totalCost)) + " ₫";
        if(elLeads) elLeads.innerText = totalLeads;
        
        // CPL = Tổng chi / Tổng leads
        let cpl = totalLeads > 0 ? Math.round(totalCost / totalLeads) : 0;
        if(elCpl) elCpl.innerText = new Intl.NumberFormat('vi-VN').format(cpl) + " ₫";

        // Thay CPM bằng ROAS Tổng
        if(elCpm) {
            let roasTotal = totalCost > 0 ? (totalRev / totalCost).toFixed(2) : "0";
            // Sửa lại tiêu đề card (Hack DOM)
            let cardTitle = elCpm.parentElement.querySelector('p');
            if(cardTitle) cardTitle.innerText = "ROAS TỔNG";
            elCpm.innerText = roasTotal + "x";
            elCpm.style.color = roasTotal > 1 ? "#137333" : "#d93025";
        }
    }
}

// --- CÁC HÀM CŨ GIỮ NGUYÊN ---
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
                    alert(`✅ Đã tải file FB!\nHệ thống tự động cộng thêm 10% VAT.`);
                    if(btnText) btnText.innerText = "Upload Excel (FB)";
                    document.getElementById('ads-file-input').value = "";
                    ACTIVE_BATCH_ID = batchId;
                });
            } else {
                alert("File lỗi");
                if(btnText) btnText.innerText = "Upload Excel (FB)";
            }
        } catch (err) { alert("Lỗi: " + err.message); if(btnText) btnText.innerText = "Upload Excel (FB)"; }
    };
    reader.readAsArrayBuffer(file);
}

function parseSmartDate(value) {
    if (!value) return null;
    if (typeof value === 'number') return new Date((value - 25569) * 86400 * 1000);
    if (typeof value === 'string') return new Date(value);
    return null;
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
            html += `
                <tr class="history-row" data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer;" onclick="selectUploadBatch('${key}')">
                    <td style="padding:5px; color:#555">${timeStr}</td>
                    <td style="padding:5px; font-weight:600; color:#1a73e8; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100px;">${log.fileName}</td>
                    <td style="padding:5px; text-align:right; font-weight:bold; font-size:10px">${money}</td>
                    <td style="padding:5px; text-align:center;"><button onclick="event.stopPropagation(); deleteUploadBatch('${key}', '${log.fileName}')" style="cursor:pointer; background:none; border:none; font-size:12px; color:red;">✕</button></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        updateHistoryHighlight();
    });
}

function deleteUploadBatch(batchId, fileName) {
    if(!confirm(`⚠️ Xóa file: ${fileName}?\nDữ liệu sẽ bị trừ khỏi tổng!`)) return;
    if(ACTIVE_BATCH_ID === batchId) ACTIVE_BATCH_ID = null;
    db.ref('ads_data').orderByChild('batchId').equalTo(batchId).once('value', snapshot => {
        const updates = {};
        updates['/upload_logs/' + batchId] = null;
        if (snapshot.exists()) {
            snapshot.forEach(child => { updates['/ads_data/' + child.key] = null; });
        }
        db.ref().update(updates).then(() => {
            alert("🗑️ Đã xóa!");
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
    drawChart(filtered); // Vẽ lại biểu đồ khi lọc
}

function drawChart(data) {
    const ctx = document.getElementById('chart-ads-upload');
    if(!ctx) return;
    if(window.myAdsChart) window.myAdsChart.destroy();
    
    // Aggregate by Employee
    let agg = {};
    data.forEach(item => {
        if(!agg[item.employee]) agg[item.employee] = { spend: 0, leads: 0 };
        agg[item.employee].spend += item.spend;
        agg[item.employee].leads += item.leads;
    });

    const sorted = Object.entries(agg).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.spend - a.spend).slice(0, 10);

    window.myAdsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(i => i.name),
            datasets: [
                { label: 'Chi Phí (Đã VAT)', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' },
                { label: 'Leads', data: sorted.map(i => i.leads), backgroundColor: '#1a73e8', yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { position: 'left' }, y1: { position: 'right', display: false } }
        }
    });
}

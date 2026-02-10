/**
 * ADS MODULE V29 (DUAL TABS: PERFORMANCE & FINANCE)
 * - Tab 1: Chỉ số quảng cáo (Leads, CPL, CTR...)
 * - Tab 2: Chỉ số tài chính (VAT, Phí chênh lệch, Doanh thu, ROAS)
 * - Giữ nguyên logic đọc file ổn định của V26/V27
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
let GLOBAL_REVENUE_DATA = {}; // { "Tên": { revenue: 0, fee: 0 } }
let ACTIVE_BATCH_ID = null;
let CURRENT_TAB = 'performance'; // 'performance' hoặc 'finance'

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V29 Loaded");
    
    resetInterface(); // Tạo giao diện Tab

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
    
    // Expose hàm
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
    window.triggerRevenueUpload = () => document.getElementById('revenue-file-input').click();
    window.switchAdsTab = switchAdsTab; // Hàm chuyển tab
}

// --- GIAO DIỆN TAB ---
function resetInterface() {
    const container = document.getElementById('ads-analysis-result');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `
            <style>
                .ads-tabs { display: flex; border-bottom: 2px solid #ddd; margin-bottom: 20px; }
                .ads-tab-btn { padding: 12px 20px; cursor: pointer; font-weight: bold; color: #555; border: none; background: none; border-bottom: 3px solid transparent; transition: all 0.3s; }
                .ads-tab-btn:hover { background: #f9f9f9; color: #1a73e8; }
                .ads-tab-btn.active { color: #1a73e8; border-bottom: 3px solid #1a73e8; }
                .ads-tab-content { display: none; animation: fadeIn 0.3s; }
                .ads-tab-content.active { display: block; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            </style>

            <div class="ads-tabs">
                <button class="ads-tab-btn active" onclick="switchAdsTab('performance')" id="btn-tab-perf">📊 1. HIỆU QUẢ QUẢNG CÁO</button>
                <button class="ads-tab-btn" onclick="switchAdsTab('finance')" id="btn-tab-fin">💰 2. TÀI CHÍNH & ROAS</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:20px;">
                <div class="ads-card" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#d93025; font-size:20px;" id="metric-spend">0 ₫</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:11px;">Chi Tiêu (FB)</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#1a73e8; font-size:20px;" id="metric-leads">0</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:11px;">Tổng Kết Quả</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#137333; font-size:20px;" id="metric-revenue">0 ₫</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:11px;">Doanh Thu</p>
                </div>
                 <div class="ads-card" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#f4b400; font-size:20px;" id="metric-roas">0x</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:11px;">ROAS TỔNG</p>
                </div>
            </div>

            <div id="tab-performance" class="ads-tab-content active">
                <div style="height:300px; margin-bottom:20px; background:#fff; padding:10px; border-radius:8px; border:1px solid #eee;">
                    <canvas id="chart-ads-employee"></canvas>
                </div>
                <div class="table-responsive">
                    <table style="width:100%; font-size:12px; border-collapse: collapse; background:#fff;">
                        <thead>
                            <tr style="background:#f1f3f4; color:#333; font-weight:bold; border-bottom:2px solid #ddd;">
                                <th style="padding:10px;">Nhân Viên</th>
                                <th style="padding:10px;">Bài Quảng Cáo</th>
                                <th style="padding:10px;">Ngày Chạy</th>
                                <th style="padding:10px; text-align:center;">Trạng Thái</th>
                                <th style="padding:10px; text-align:right;">Ngân Sách</th>
                                <th style="padding:10px; text-align:right;">Chi Tiêu FB</th>
                                <th style="padding:10px; text-align:center;">Kết Quả</th>
                                <th style="padding:10px; text-align:right;">Giá / KQ</th>
                                <th style="padding:10px; text-align:center;">CTR</th>
                            </tr>
                        </thead>
                        <tbody id="ads-table-perf"></tbody>
                    </table>
                </div>
            </div>

            <div id="tab-finance" class="ads-tab-content">
                <div class="table-responsive">
                    <table style="width:100%; font-size:12px; border-collapse: collapse; background:#fff;">
                        <thead>
                            <tr style="background:#e8f0fe; color:#1a73e8; font-weight:bold; border-bottom:2px solid #1a73e8;">
                                <th style="padding:10px;">Nhân Viên</th>
                                <th style="padding:10px;">Bài Quảng Cáo</th>
                                <th style="padding:10px; text-align:right;">Chi Tiêu FB<br><span style="font-size:9px; color:#666">(Chưa VAT)</span></th>
                                <th style="padding:10px; text-align:right; color:#d93025;">VAT (10%)</th>
                                <th style="padding:10px; text-align:right; color:#e67c73;">Phí Chênh Lệch<br><span style="font-size:9px; color:#666">(Sao kê)</span></th>
                                <th style="padding:10px; text-align:right; font-weight:800;">TỔNG CHI PHÍ<br><span style="font-size:9px; color:#666">(FB + VAT + Phí)</span></th>
                                <th style="padding:10px; text-align:right; color:#137333;">Doanh Thu</th>
                                <th style="padding:10px; text-align:center;">ROAS</th>
                            </tr>
                        </thead>
                        <tbody id="ads-table-fin"></tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Vùng Upload (Nút Revenue + Lịch sử)
    const uploadArea = document.querySelector('.upload-area');
    if(uploadArea && !document.getElementById('revenue-upload-area')) {
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
        revDiv.innerHTML = `
            <span style="font-size:20px;">💰</span> 
            <span style="font-weight:bold; color:#28a745; font-size:12px;">Upload File Doanh Thu & Sao Kê (Tính ROAS)</span>
            <input type="file" id="revenue-file-input" style="display:none" accept=".csv, .xlsx, .xls" onchange="handleRevenueUpload(this)">
        `;
        uploadArea.parentNode.insertBefore(revDiv, uploadArea.nextSibling);

        const historyDiv = document.createElement('div');
        historyDiv.id = 'upload-history-container';
        historyDiv.style.marginTop = '20px';
        historyDiv.style.background = '#fff';
        historyDiv.style.padding = '15px';
        historyDiv.style.borderRadius = '10px';
        historyDiv.style.border = '1px solid #eee';
        historyDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="font-weight:800; color:#333;">📂 LỊCH SỬ UPLOAD</div>
                <button onclick="viewAllData()" style="background:#1a73e8; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px; font-weight:bold;">Xem Tất Cả</button>
            </div>
            <div style="max-height: 250px; overflow-y: auto;">
                <table style="width:100%; font-size:11px; border-collapse: collapse;">
                    <tbody id="upload-history-body"></tbody>
                </table>
            </div>
        `;
        revDiv.parentNode.insertBefore(historyDiv, revDiv.nextSibling);
    }
}

// --- HÀM CHUYỂN TAB ---
function switchAdsTab(tabName) {
    CURRENT_TAB = tabName;
    
    // Update nút active
    document.getElementById('btn-tab-perf').classList.remove('active');
    document.getElementById('btn-tab-fin').classList.remove('active');
    
    if(tabName === 'performance') document.getElementById('btn-tab-perf').classList.add('active');
    else document.getElementById('btn-tab-fin').classList.add('active');

    // Update nội dung active
    document.getElementById('tab-performance').classList.remove('active');
    document.getElementById('tab-finance').classList.remove('active');
    
    document.getElementById('tab-' + tabName).classList.add('active');
}

// --- XỬ LÝ UPLOAD FILE 1 (FB ADS) ---
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
            
            // Dùng logic core V26 (Đã test OK)
            const result = parseDataCore(json);

            if (result.length > 0) {
                const batchId = Date.now().toString();
                const totalSpend = result.reduce((sum, i) => sum + i.spend, 0);

                db.ref('upload_logs/' + batchId).set({
                    timestamp: new Date().toISOString(),
                    fileName: file.name,
                    rowCount: result.length,
                    totalSpend: totalSpend
                });

                const updates = {};
                result.forEach(item => {
                    const newKey = db.ref().child('ads_data').push().key;
                    item.batchId = batchId;
                    updates['/ads_data/' + newKey] = item;
                });

                db.ref().update(updates).then(() => {
                    alert(`✅ Đã lưu ${result.length} dòng.`);
                    if(btnText) btnText.innerText = "Upload Excel";
                    document.getElementById('ads-file-input').value = "";
                    ACTIVE_BATCH_ID = batchId;
                    applyFilters(); // Render lại cả 2 tab
                });
            } else {
                alert("❌ Lỗi: Không tìm thấy cột 'Tên nhóm quảng cáo' hoặc 'Số tiền đã chi tiêu'!");
                if(btnText) btnText.innerText = "Upload Excel";
            }
        } catch (err) { alert("Lỗi hệ thống: " + err.message); if(btnText) btnText.innerText = "Upload Excel"; }
    };
    reader.readAsArrayBuffer(file);
}

// --- LOGIC PHÂN TÍCH FILE FB (GIỮ NGUYÊN TỪ V26) ---
function parseDataCore(rows) {
    if (rows.length < 2) return [];
    let headerIndex = -1, colNameIdx = -1, colSpendIdx = -1, colResultIdx = -1;
    let colBudgetIdx = -1, colImpsIdx = -1, colClicksIdx = -1, colStartIdx = -1, colEndIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (!row) continue;
        const rowStr = row.map(c => c ? c.toString().toLowerCase().trim() : "").join("|");
        if (rowStr.includes("tên nhóm quảng cáo") && (rowStr.includes("số tiền đã chi tiêu") || rowStr.includes("amount spent"))) {
            headerIndex = i;
            row.forEach((cell, idx) => {
                if(!cell) return;
                const txt = cell.toString().toLowerCase().trim();
                if (txt.includes("tên nhóm quảng cáo")) colNameIdx = idx;
                if (txt.includes("số tiền đã chi tiêu") || txt.includes("amount spent")) colSpendIdx = idx;
                if (txt === "kết quả" || txt === "results") colResultIdx = idx;
                if (txt.includes("ngân sách")) colBudgetIdx = idx;
                if (txt.includes("hiển thị")) colImpsIdx = idx;
                if (txt.includes("lượt click") || txt.includes("nhấp")) colClicksIdx = idx;
                if (txt.includes("bắt đầu") && !txt.includes("ghi nhận")) colStartIdx = idx;
                if (txt.includes("kết thúc") && !txt.includes("ghi nhận")) colEndIdx = idx;
            });
            break;
        }
    }

    if (headerIndex === -1 || colNameIdx === -1 || colSpendIdx === -1) return [];

    let parsedData = [];
    const todayStr = new Date().toISOString().substring(0, 10);

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const rawName = row[colNameIdx];
        if (!rawName) continue;

        let spend = parseCleanNumber(row[colSpendIdx]);
        if (spend <= 0) continue;

        let result = parseCleanNumber(row[colResultIdx]);
        let budget = parseCleanNumber(row[colBudgetIdx]);
        let imps = parseCleanNumber(row[colImpsIdx]);
        let clicks = parseCleanNumber(row[colClicksIdx]);
        
        let runStart = row[colStartIdx] ? row[colStartIdx].toString().trim() : "";
        let runEnd = row[colEndIdx] ? row[colEndIdx].toString().trim() : "";
        let status = "Đang chạy";
        if (runEnd && runEnd.length >= 10 && runEnd < todayStr) status = "Kết thúc";

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
            budget: budget,
            impressions: imps,
            clicks: clicks,
            run_start: runStart,
            status: status
        });
    }
    return parsedData;
}

// --- XỬ LÝ UPLOAD DOANH THU (FILE 2) ---
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

            let headerIdx = -1, colNameIdx = -1, colRevIdx = -1, colFeeIdx = -1;
            
            for(let i=0; i<Math.min(json.length, 10); i++) {
                const row = json[i];
                if(!row) continue;
                const rowStr = row.map(c=>c?c.toString().toLowerCase():"").join("|");
                if(rowStr.includes("tên nhóm quảng cáo") || rowStr.includes("tên chiến dịch")) {
                    headerIdx = i;
                    row.forEach((cell, idx) => {
                        if(!cell) return;
                        const txt = cell.toString().toLowerCase().trim();
                        if(txt.includes("tên nhóm") || txt.includes("tên chiến dịch")) colNameIdx = idx;
                        if(txt.includes("doanh thu") || txt.includes("thành tiền")) colRevIdx = idx;
                        if(txt.includes("chênh lệch") || txt.includes("phí")) colFeeIdx = idx;
                    });
                    break;
                }
            }

            if(colNameIdx === -1 || colRevIdx === -1) {
                alert("❌ Không tìm thấy cột 'Tên nhóm quảng cáo' hoặc 'Doanh thu'!");
                return;
            }

            GLOBAL_REVENUE_DATA = {};
            let count = 0;
            for(let i=headerIdx+1; i<json.length; i++) {
                const r = json[i];
                if(!r || !r[colNameIdx]) continue;
                const name = r[colNameIdx].toString().trim();
                let rev = parseCleanNumber(r[colRevIdx]);
                let fee = parseCleanNumber(r[colFeeIdx]);
                if(rev > 0 || fee > 0) {
                    GLOBAL_REVENUE_DATA[name] = { revenue: rev, fee: fee };
                    count++;
                }
            }
            
            alert(`✅ Đã nhập ${count} dòng doanh thu/phí. Chuyển sang Tab Tài Chính để xem.`);
            switchAdsTab('finance');
            applyFilters(); 

        } catch(err) { alert("Lỗi đọc file doanh thu: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
    input.value = "";
}

// --- RENDER DỮ LIỆU ---
function loadAdsData() {
    db.ref('ads_data').on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { GLOBAL_ADS_DATA = []; updateTables([]); return; }
        GLOBAL_ADS_DATA = Object.values(data);
        applyFilters();
    });
}

function applyFilters() {
    let filtered = GLOBAL_ADS_DATA;
    if(ACTIVE_BATCH_ID) filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID);
    
    // Tính toán KPI tổng
    let totalSpendFB = 0, totalLeads = 0, totalRevenue = 0, totalCostAll = 0;
    
    filtered.forEach(item => {
        totalSpendFB += item.spend;
        totalLeads += item.result;
        
        const extra = GLOBAL_REVENUE_DATA[item.fullName] || { revenue: 0, fee: 0 };
        totalRevenue += extra.revenue;
        totalCostAll += (item.spend * 1.1) + extra.fee;
    });

    document.getElementById('metric-spend').innerText = new Intl.NumberFormat('vi-VN').format(totalSpendFB) + " ₫";
    document.getElementById('metric-leads').innerText = totalLeads;
    document.getElementById('metric-revenue').innerText = new Intl.NumberFormat('vi-VN').format(totalRevenue) + " ₫";
    const roasTotal = totalCostAll > 0 ? (totalRevenue / totalCostAll) : 0;
    document.getElementById('metric-roas').innerText = roasTotal.toFixed(2) + "x";

    // Vẽ biểu đồ
    drawChart(filtered);

    // Vẽ 2 bảng
    renderPerformanceTable(filtered);
    renderFinanceTable(filtered);
}

// --- BẢNG 1: HIỆU QUẢ ---
function renderPerformanceTable(data) {
    const tbody = document.getElementById('ads-table-perf');
    if(!tbody) return;
    tbody.innerHTML = "";
    
    // Sắp xếp: NV -> Tiền
    data.sort((a,b) => {
        const nameA = a.employee.toLowerCase();
        const nameB = b.employee.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return b.spend - a.spend;
    });

    data.slice(0, 200).forEach(item => {
        const cpl = item.result > 0 ? Math.round(item.spend/item.result) : 0;
        const ctr = item.impressions > 0 ? ((item.clicks/item.impressions)*100).toFixed(2) + "%" : "-";
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #f0f0f0";
        tr.innerHTML = `
            <td style="padding:8px; font-weight:bold; color:#1a73e8;">${item.employee}</td>
            <td style="padding:8px; color:#333;">${item.adName}</td>
            <td style="padding:8px; font-size:11px; color:#666;">${item.run_start}</td>
            <td style="padding:8px; text-align:center;">${item.status === 'Đang chạy' ? '<span style="color:#0f9d58">●</span>' : '⚪'}</td>
            <td style="padding:8px; text-align:right;">${item.budget > 0 ? new Intl.NumberFormat('vi-VN').format(item.budget) : '-'}</td>
            <td style="padding:8px; text-align:right; font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>
            <td style="padding:8px; text-align:center; font-weight:bold;">${item.result}</td>
            <td style="padding:8px; text-align:right;">${new Intl.NumberFormat('vi-VN').format(cpl)}</td>
            <td style="padding:8px; text-align:center;">${ctr}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- BẢNG 2: TÀI CHÍNH ---
function renderFinanceTable(data) {
    const tbody = document.getElementById('ads-table-fin');
    if(!tbody) return;
    tbody.innerHTML = "";
    
    // Sắp xếp: NV -> Tiền
    data.sort((a,b) => {
        const nameA = a.employee.toLowerCase();
        const nameB = b.employee.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return b.spend - a.spend;
    });

    data.slice(0, 200).forEach(item => {
        // Data tài chính
        const vat = item.spend * 0.1;
        const extra = GLOBAL_REVENUE_DATA[item.fullName] || { revenue: 0, fee: 0 };
        const feeDiff = extra.fee;
        const revenue = extra.revenue;
        const totalCost = item.spend + vat + feeDiff;
        const roas = totalCost > 0 ? (revenue / totalCost) : 0;

        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #f0f0f0";
        tr.innerHTML = `
            <td style="padding:8px; font-weight:bold; color:#1a73e8;">${item.employee}</td>
            <td style="padding:8px; color:#333;">${item.adName}</td>
            <td style="padding:8px; text-align:right;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>
            <td style="padding:8px; text-align:right; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(vat)}</td>
            <td style="padding:8px; text-align:right; color:#e67c73;">${feeDiff > 0 ? new Intl.NumberFormat('vi-VN').format(feeDiff) : '-'}</td>
            <td style="padding:8px; text-align:right; font-weight:800; color:#333;">${new Intl.NumberFormat('vi-VN').format(Math.round(totalCost))}</td>
            <td style="padding:8px; text-align:right; font-weight:bold; color:#137333;">${revenue > 0 ? new Intl.NumberFormat('vi-VN').format(revenue) : '-'}</td>
            <td style="padding:8px; text-align:center; font-weight:bold; color:${roas > 0 ? '#f4b400' : '#999'}">${roas > 0 ? roas.toFixed(2)+'x' : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- CÁC HÀM TIỆN ÍCH ---
function parseCleanNumber(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let s = val.toString().trim().replace(/,/g, ''); 
    return parseFloat(s) || 0;
}

function drawChart(data) {
    const ctx = document.getElementById('chart-ads-employee');
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

function deleteUploadBatch(id, name) {
    if(!confirm("Xóa file: " + name + "?")) return;
    db.ref('ads_data').orderByChild('batchId').equalTo(id).once('value', s => {
        const u = {};
        u['/upload_logs/' + id] = null;
        if(s.exists()) s.forEach(c => u['/ads_data/' + c.key] = null);
        db.ref().update(u).then(() => {
            GLOBAL_ADS_DATA = GLOBAL_ADS_DATA.filter(item => item.batchId !== id);
            if(ACTIVE_BATCH_ID === id) ACTIVE_BATCH_ID = null;
            applyFilters();
        });
    });
}

function loadUploadHistory() {
    const tbody = document.getElementById('upload-history-body');
    if(!tbody) return;
    db.ref('upload_logs').limitToLast(20).on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { tbody.innerHTML = ""; return; }
        const sorted = Object.entries(data).sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
        let html = "";
        sorted.forEach(([key, log]) => {
            const timeStr = new Date(log.timestamp).toLocaleDateString('vi-VN');
            const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
            html += `<tr class="history-row" data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer;" onclick="selectUploadBatch('${key}')"><td style="padding:8px; font-size:10px;">${timeStr}</td><td style="padding:8px; font-weight:600; color:#1a73e8; max-width:100px; overflow:hidden;">${log.fileName}</td><td style="padding:8px; text-align:right; font-size:10px;">${money}</td><td style="padding:8px; text-align:center;"><span onclick="event.stopPropagation(); deleteUploadBatch('${key}', '${log.fileName}')" style="color:red; font-weight:bold;">✖</span></td></tr>`;
        });
        tbody.innerHTML = html;
        updateHistoryHighlight();
    });
}

function selectUploadBatch(id) { ACTIVE_BATCH_ID = id; updateHistoryHighlight(); applyFilters(); }
function viewAllData() { ACTIVE_BATCH_ID = null; updateHistoryHighlight(); applyFilters(); }
function updateHistoryHighlight() {
    document.querySelectorAll('.history-row').forEach(row => {
        row.style.background = (ACTIVE_BATCH_ID && row.dataset.id === ACTIVE_BATCH_ID) ? '#e8f0fe' : 'transparent';
    });
}

/**
 * ADS MODULE V13 (FULL CONTROL UI)
 * - Tự động tạo Header bảng để tránh lệch cột
 * - Thêm cột: Ngân sách, Trạng thái, CTR, CPM
 * - Sắp xếp: Gom nhóm Nhân viên -> Chiến dịch
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
let ACTIVE_BATCH_ID = null;

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V13 Loaded");
    injectHistoryTable(); // Tạo bảng lịch sử
    
    // TẠO TIÊU ĐỀ BẢNG CHÍNH (ĐỂ KHÔNG BỊ LỆCH CỘT)
    setupMainTableStructure();

    const input = document.getElementById('ads-file-input');
    if(input && !input.hasAttribute('data-listening')) {
        input.addEventListener('change', handleFirebaseUpload);
        input.setAttribute('data-listening', 'true');
    }

    // Bộ lọc
    document.getElementById('filter-search')?.addEventListener('keyup', applyFilters);
    document.getElementById('filter-start')?.addEventListener('change', applyFilters);
    document.getElementById('filter-end')?.addEventListener('change', applyFilters);

    if(db) {
        loadUploadHistory();
        loadAdsData();
    }
    
    // Gắn hàm vào window
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
}

// --- SETUP TABLE HEADER (QUAN TRỌNG: TRÁNH LỆCH CỘT) ---
function setupMainTableStructure() {
    const tableContainer = document.querySelector('.table-responsive table');
    if (!tableContainer) return;

    // Ghi đè lại Header của bảng HTML cũ
    tableContainer.innerHTML = `
        <thead>
            <tr style="background:#f1f3f4; color:#444; font-size:12px; text-transform:uppercase;">
                <th style="padding:10px;">Nhân Viên</th>
                <th style="padding:10px;">Chiến Dịch / Sản Phẩm</th>
                <th style="padding:10px; text-align:center;">Trạng Thái</th>
                <th style="padding:10px; text-align:right;">Ngân Sách</th>
                <th style="padding:10px; text-align:right;">Chi Tiêu</th>
                <th style="padding:10px; text-align:center;">Kết Quả</th>
                <th style="padding:10px; text-align:right;">Giá/KQ</th>
                <th style="padding:10px; text-align:center;">CTR</th>
            </tr>
        </thead>
        <tbody id="ads-table-body"></tbody>
    `;
}

// --- XỬ LÝ DỮ LIỆU ---
function parseExcelSmart(rows) {
    if (rows.length < 2) return { data: [], totalSpend: 0 };
    
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    
    // Tìm cột
    const colStart = header.findIndex(h => h.includes("bắt đầu báo cáo"));
    const colEnd = header.findIndex(h => h.includes("kết thúc báo cáo"));
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    const colSpend = header.findIndex(h => h.includes("số tiền đã chi tiêu") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colMess = header.findIndex(h => h.includes("người liên hệ") || h.includes("messaging"));
    const colBudget = header.findIndex(h => h.includes("ngân sách") || h.includes("budget")); // MỚI
    const colImps = header.findIndex(h => h.includes("lượt hiển thị") || h.includes("impressions")); // MỚI
    const colClicks = header.findIndex(h => h.includes("số lần nhấp") || h.includes("clicks")); // MỚI

    if (colSpend === -1) return { data: [], totalSpend: 0 };

    let parsedData = [];
    let grandTotal = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r || r.length===0) continue;
        
        let spend = parseFloat(r[colSpend]) || 0;
        if(spend <= 0) continue; 

        let leads = parseFloat(r[colResult]) || parseFloat(r[colMess]) || 0;
        let budget = parseFloat(r[colBudget]) || 0;
        let imps = parseFloat(r[colImps]) || 0;
        let clicks = parseFloat(r[colClicks]) || 0;
        
        let campaignName = r[colCamp] || "Unknown";
        let parts = campaignName.split('-');
        let employee = parts[0] ? parts[0].trim().toUpperCase() : "KHÁC";
        let product = parts[1] ? parts[1].trim() : "Chung";

        // Xử lý trạng thái (Dựa vào ngày kết thúc)
        let status = "Đang chạy";
        let dateEndRaw = r[colEnd];
        if (dateEndRaw) {
            // Thử parse ngày kết thúc
            let endDate = new Date(dateEndRaw);
            if (!isNaN(endDate) && endDate < today) {
                status = "Kết thúc";
            }
        }

        parsedData.push({
            campaign: campaignName,
            employee: employee,
            product: product,
            spend: spend,
            leads: leads,
            budget: budget,
            impressions: imps,
            clicks: clicks,
            status: status,
            run_start: r[colStart] || "",
            run_end: r[colEnd] || ""
        });
        grandTotal += spend;
    }
    return { data: parsedData, totalSpend: grandTotal };
}

// --- RENDER BẢNG CHÍNH (ĐÚNG CỘT, ĐÚNG HÀNG) ---
function renderMainTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";
    
    // 1. Sắp xếp: Tên NV A->Z, Sau đó đến Chiến dịch
    data.sort((a,b) => {
        if(a.employee === b.employee) return b.spend - a.spend; // Cùng NV thì ai tiêu nhiều tiền lên trước
        return a.employee.localeCompare(b.employee);
    });

    data.slice(0, 150).forEach(item => {
        // Tính toán chỉ số
        const cpl = item.leads > 0 ? Math.round(item.spend/item.leads) : 0;
        const ctr = item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) + "%" : "0%";
        
        // Format tiền
        const spendStr = new Intl.NumberFormat('vi-VN').format(item.spend);
        const budgetStr = item.budget > 0 ? new Intl.NumberFormat('vi-VN').format(item.budget) : "-";
        const cplStr = cpl > 0 ? new Intl.NumberFormat('vi-VN').format(cpl) : "-";

        // Màu trạng thái
        const statusBadge = item.status === "Đang chạy" 
            ? `<span style="color:#137333; background:#e6f4ea; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold">● Đang chạy</span>`
            : `<span style="color:#666; background:#eee; padding:2px 6px; border-radius:4px; font-size:10px;">Kết thúc</span>`;

        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #eee";
        
        tr.innerHTML = `
            <td style="font-weight:bold; color:#1a73e8; vertical-align:middle">${item.employee}</td>
            <td style="vertical-align:middle">
                <div style="font-weight:600; font-size:12px; color:#333">${item.product}</div>
                <div style="font-size:10px; color:#888; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.campaign}">${item.campaign}</div>
                <div style="font-size:10px; color:#666; margin-top:2px;">📅 ${item.run_start}</div>
            </td>
            <td style="text-align:center; vertical-align:middle">${statusBadge}</td>
            <td style="text-align:right; font-size:12px; color:#555; vertical-align:middle">${budgetStr}</td>
            <td style="text-align:right; font-weight:bold; color:#d93025; vertical-align:middle">${spendStr}</td>
            <td style="text-align:center; font-weight:bold; vertical-align:middle; background:#fcf8f8">${item.leads}</td>
            <td style="text-align:right; font-size:12px; vertical-align:middle">${cplStr}</td>
            <td style="text-align:center; font-size:11px; color:#666; vertical-align:middle">${ctr}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- CÁC HÀM CŨ GIỮ NGUYÊN (Upload, Delete, Filter, Chart...) ---

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
                    alert(`✅ Đã tải lên thành công!\nTổng tiền: ${result.totalSpend.toLocaleString()}đ`);
                    if(btnText) btnText.innerText = "Upload Excel";
                    document.getElementById('ads-file-input').value = "";
                    ACTIVE_BATCH_ID = batchId; // Auto select new file
                });
            } else {
                alert("File không hợp lệ!");
                if(btnText) btnText.innerText = "Upload Excel";
            }
        } catch (err) { alert("Lỗi: " + err.message); if(btnText) btnText.innerText = "Upload Excel"; }
    };
    reader.readAsArrayBuffer(file);
}

function injectHistoryTable() {
    if(document.getElementById('upload-history-container')) return;
    const uploadArea = document.querySelector('.upload-area');
    if(!uploadArea) return;
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
            <button onclick="viewAllData()" style="background:#1a73e8; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">Xem Tổng Hợp</button>
        </div>
        <div style="max-height: 250px; overflow-y: auto;">
            <table style="width:100%; font-size:12px; border-collapse: collapse;">
                <thead style="position: sticky; top: 0; background: #fff; z-index:1;">
                    <tr style="background:#f1f3f4; color:#555; text-align:left;">
                        <th style="padding:8px;">Ngày</th>
                        <th style="padding:8px;">File</th>
                        <th style="padding:8px; text-align:right;">Tiền</th>
                        <th style="padding:8px; text-align:center;">Xóa</th>
                    </tr>
                </thead>
                <tbody id="upload-history-body"></tbody>
            </table>
        </div>
    `;
    uploadArea.parentNode.insertBefore(historyDiv, uploadArea.nextSibling);
}

function loadUploadHistory() {
    const tbody = document.getElementById('upload-history-body');
    if(!tbody) return;
    db.ref('upload_logs').limitToLast(20).on('value', snapshot => {
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
                    <td style="padding:8px; color:#555">${timeStr}</td>
                    <td style="padding:8px; font-weight:600; color:#1a73e8; font-size:11px">${log.fileName}</td>
                    <td style="padding:8px; text-align:right; font-weight:bold; font-size:11px">${money}</td>
                    <td style="padding:8px; text-align:center;"><button onclick="event.stopPropagation(); deleteUploadBatch('${key}', '${log.fileName}')" style="cursor:pointer; background:none; border:none; font-size:14px; color:red;">✕</button></td>
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
    renderDashboard(filtered);
}

function renderDashboard(data) {
    document.getElementById('ads-analysis-result').style.display = 'block';
    let totalSpend = 0, totalLeads = 0;
    let employeeAgg = {};
    data.forEach(item => {
        totalSpend += item.spend;
        totalLeads += item.leads;
        if(!employeeAgg[item.employee]) employeeAgg[item.employee] = { spend:0, leads:0 };
        employeeAgg[item.employee].spend += item.spend;
        employeeAgg[item.employee].leads += item.leads;
    });
    const fmt = n => new Intl.NumberFormat('vi-VN').format(n);
    document.getElementById('metric-spend').innerText = fmt(totalSpend) + " ₫";
    document.getElementById('metric-leads').innerText = totalLeads;
    const cpl = totalLeads > 0 ? Math.round(totalSpend/totalLeads) : 0;
    document.getElementById('metric-cpl').innerText = fmt(cpl) + " ₫";
    drawChart(employeeAgg);
    renderMainTable(data);
}

function drawChart(aggData) {
    const ctx = document.getElementById('chart-ads-upload');
    if(!ctx) return;
    if(window.myAdsChart) window.myAdsChart.destroy();
    const sorted = Object.entries(aggData).map(([name, val]) => ({ name, ...val })).sort((a,b) => b.spend - a.spend).slice(0, 10);
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
            responsive: true, maintainAspectRatio: false,
            scales: { y: { position: 'left' }, y1: { position: 'right', grid: {display:false} } }
        }
    });
}

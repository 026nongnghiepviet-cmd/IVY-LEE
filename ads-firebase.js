/**
 * ADS MODULE V26 (STABLE & FULL FEATURES)
 * - Core: Dùng logic đọc file V25 (Đã test thành công)
 * - Features: Lịch sử, Tách tên NV, Biểu đồ theo NV
 * - Database: Lưu trữ Firebase
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
    console.log("Ads V26 Loaded");
    
    // 1. Tạo giao diện chuẩn
    resetInterface();

    // 2. Gắn sự kiện Upload
    const inputAds = document.getElementById('ads-file-input');
    if(inputAds) {
        // Clone để xóa event cũ
        const newInput = inputAds.cloneNode(true);
        inputAds.parentNode.replaceChild(newInput, inputAds);
        newInput.addEventListener('change', handleFirebaseUpload);
    }

    // 3. Load dữ liệu từ Firebase
    if(db) {
        loadUploadHistory();
        loadAdsData();
    }
    
    // Expose hàm ra ngoài HTML
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
}

// --- GIAO DIỆN ---
function resetInterface() {
    // 1. Vùng Kết quả (Bảng & Biểu đồ)
    const container = document.getElementById('ads-analysis-result');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:20px;">
                <div class="ads-card" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#d93025; font-size:24px;" id="metric-spend">0 ₫</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:12px;">Tổng Chi Tiêu</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#1a73e8; font-size:24px;" id="metric-leads">0</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:12px;">Tổng Kết Quả</p>
                </div>
                <div class="ads-card" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #eee; text-align:center;">
                    <h3 style="margin:0; color:#333; font-size:24px;" id="metric-cpl">0 ₫</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:12px;">Chi phí / KQ</p>
                </div>
            </div>

            <div style="height:350px; margin-bottom:20px; background:#fff; padding:10px; border-radius:8px; border:1px solid #eee;">
                <canvas id="chart-ads-employee"></canvas>
            </div>

            <div class="table-responsive">
                <table style="width:100%; font-size:12px; border-collapse: collapse; background:#fff;">
                    <thead>
                        <tr style="background:#f1f3f4; color:#333; font-weight:bold; border-bottom:2px solid #ddd;">
                            <th style="padding:10px; text-align:left;">Nhân Viên</th>
                            <th style="padding:10px; text-align:left;">Bài Quảng Cáo</th>
                            <th style="padding:10px; text-align:right;">Chi Tiêu</th>
                            <th style="padding:10px; text-align:center;">Kết Quả</th>
                            <th style="padding:10px; text-align:right;">Giá / KQ</th>
                        </tr>
                    </thead>
                    <tbody id="ads-table-body">
                        <tr><td colspan="5" style="text-align:center; padding:20px;">Đang tải dữ liệu...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // 2. Vùng Lịch sử Upload (Bên trái/dưới nút up)
    if(!document.getElementById('upload-history-container')) {
        const uploadArea = document.querySelector('.upload-area');
        if(uploadArea) {
            const historyDiv = document.createElement('div');
            historyDiv.id = 'upload-history-container';
            historyDiv.style.marginTop = '20px';
            historyDiv.style.background = '#fff';
            historyDiv.style.padding = '15px';
            historyDiv.style.borderRadius = '10px';
            historyDiv.style.border = '1px solid #eee';
            historyDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="font-weight:800; color:#333;">📂 LỊCH SỬ FILE</div>
                    <button onclick="viewAllData()" style="background:#1a73e8; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px; font-weight:bold;">Xem Tất Cả</button>
                </div>
                <div style="max-height: 250px; overflow-y: auto;">
                    <table style="width:100%; font-size:11px; border-collapse: collapse;">
                        <tbody id="upload-history-body"></tbody>
                    </table>
                </div>
            `;
            uploadArea.parentNode.insertBefore(historyDiv, uploadArea.nextSibling);
        }
    }
}

// --- XỬ LÝ UPLOAD & LƯU FIREBASE ---
function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;

    const btnText = document.querySelector('.upload-text');
    if(btnText) btnText.innerText = "⏳ Đang xử lý...";

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); // Đọc dạng mảng
            
            // Dùng logic lõi V25 để phân tích
            const result = parseDataCore(json);

            if (result.length > 0) {
                // Lưu vào Firebase
                const batchId = Date.now().toString();
                const totalSpend = result.reduce((sum, i) => sum + i.spend, 0);

                // 1. Lưu Log
                db.ref('upload_logs/' + batchId).set({
                    timestamp: new Date().toISOString(),
                    fileName: file.name,
                    rowCount: result.length,
                    totalSpend: totalSpend
                });

                // 2. Lưu Data chi tiết
                const updates = {};
                result.forEach(item => {
                    const newKey = db.ref().child('ads_data').push().key;
                    item.batchId = batchId; // Gắn ID lô để lọc
                    updates['/ads_data/' + newKey] = item;
                });

                db.ref().update(updates).then(() => {
                    alert(`✅ Thành công! Đã lưu ${result.length} dòng.`);
                    if(btnText) btnText.innerText = "Upload Excel";
                    document.getElementById('ads-file-input').value = "";
                    ACTIVE_BATCH_ID = batchId; // Tự động chọn file vừa up
                });

            } else {
                alert("❌ Lỗi: Không tìm thấy cột 'Tên nhóm quảng cáo' hoặc 'Số tiền đã chi tiêu'!");
                if(btnText) btnText.innerText = "Upload Excel";
            }
        } catch (err) {
            alert("Lỗi hệ thống: " + err.message);
            if(btnText) btnText.innerText = "Upload Excel";
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- LOGIC PHÂN TÍCH (CORE V25 + TÁCH TÊN) ---
function parseDataCore(rows) {
    if (rows.length < 2) return [];

    // 1. Tìm Header
    let headerIndex = -1;
    let colNameIdx = -1;
    let colSpendIdx = -1;
    let colResultIdx = -1;

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
        const rawSpend = row[colSpendIdx];
        const rawResult = row[colResultIdx];

        if (!rawName) continue;

        // Xử lý tiền (bỏ dấu phẩy)
        let spend = 0;
        if (typeof rawSpend === 'number') spend = rawSpend;
        else if (typeof rawSpend === 'string') spend = parseFloat(rawSpend.replace(/,/g, '')) || 0;

        if (spend <= 0) continue;

        // Xử lý kết quả
        let result = 0;
        if (typeof rawResult === 'number') result = rawResult;
        else if (typeof rawResult === 'string') result = parseFloat(rawResult.replace(/,/g, '')) || 0;

        // TÁCH TÊN NHÂN VIÊN & BÀI QUẢNG CÁO
        // Mẫu: "MỸ PHỤNG NNV - MAX ROOT..."
        let nameParts = rawName.toString().split(" - ");
        let employee = nameParts[0] ? nameParts[0].trim().toUpperCase() : "KHÁC";
        let adName = nameParts.slice(1).join(" - ").trim(); // Lấy phần còn lại làm tên bài
        if (!adName) adName = "Chung";

        parsedData.push({
            fullName: rawName,
            employee: employee,
            adName: adName,
            spend: spend,
            result: result
        });
    }
    return parsedData;
}

// --- QUẢN LÝ LỊCH SỬ ---
function loadUploadHistory() {
    const tbody = document.getElementById('upload-history-body');
    if(!tbody) return;

    db.ref('upload_logs').limitToLast(20).on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { tbody.innerHTML = "<tr><td colspan='3' style='text-align:center'>Chưa có file nào</td></tr>"; return; }
        
        const sorted = Object.entries(data).sort((a,b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
        
        let html = "";
        sorted.forEach(([key, log]) => {
            const d = new Date(log.timestamp);
            const timeStr = `${("0"+d.getDate()).slice(-2)}/${("0"+(d.getMonth()+1)).slice(-2)} ${d.getHours()}:${("0"+d.getMinutes()).slice(-2)}`;
            const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
            
            html += `
                <tr class="history-row" data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer;" onclick="selectUploadBatch('${key}')">
                    <td style="padding:8px; color:#555;">${timeStr}</td>
                    <td style="padding:8px; font-weight:600; color:#1a73e8; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${log.fileName}</td>
                    <td style="padding:8px; text-align:right;">${money}</td>
                    <td style="padding:8px; text-align:center;">
                        <span onclick="event.stopPropagation(); deleteUploadBatch('${key}', '${log.fileName}')" style="color:#d93025; cursor:pointer;">✖</span>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        updateHistoryHighlight();
    });
}

// --- HIỂN THỊ DỮ LIỆU ---
function loadAdsData() {
    db.ref('ads_data').on('value', snapshot => {
        const data = snapshot.val();
        if(!data) { GLOBAL_ADS_DATA = []; renderMainTable([]); return; }
        GLOBAL_ADS_DATA = Object.values(data);
        applyFilters();
    });
}

function applyFilters() {
    let filtered = GLOBAL_ADS_DATA;
    
    // Lọc theo file được chọn
    if(ACTIVE_BATCH_ID) {
        filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID);
    }
    
    renderMainTable(filtered);
    drawChartByEmployee(filtered);
}

function renderMainTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";

    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Không có dữ liệu</td></tr>`;
        return;
    }

    // Sắp xếp: Tiền giảm dần
    data.sort((a,b) => b.spend - a.spend);

    let totalSpend = 0;
    let totalResult = 0;

    data.slice(0, 200).forEach(item => {
        totalSpend += item.spend;
        totalResult += item.result;
        
        const cpl = item.result > 0 ? Math.round(item.spend/item.result) : 0;
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #f0f0f0";
        tr.innerHTML = `
            <td style="padding:8px; font-weight:bold; color:#1a73e8;">${item.employee}</td>
            <td style="padding:8px; color:#333;">${item.adName}</td>
            <td style="padding:8px; text-align:right; font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>
            <td style="padding:8px; text-align:center;">${item.result}</td>
            <td style="padding:8px; text-align:right; color:#666;">${new Intl.NumberFormat('vi-VN').format(cpl)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Cập nhật thẻ chỉ số
    document.getElementById('metric-spend').innerText = new Intl.NumberFormat('vi-VN').format(totalSpend) + " ₫";
    document.getElementById('metric-leads').innerText = totalResult;
    const avgCpl = totalResult > 0 ? Math.round(totalSpend/totalResult) : 0;
    document.getElementById('metric-cpl').innerText = new Intl.NumberFormat('vi-VN').format(avgCpl) + " ₫";
}

function drawChartByEmployee(data) {
    const ctx = document.getElementById('chart-ads-employee');
    if(!ctx) return;
    if(window.myAdsChart) window.myAdsChart.destroy();

    // GỘP THEO NHÂN VIÊN
    let agg = {};
    data.forEach(item => {
        if(!agg[item.employee]) agg[item.employee] = { spend: 0, result: 0 };
        agg[item.employee].spend += item.spend;
        agg[item.employee].result += item.result;
    });

    // Chuyển về mảng & Sắp xếp top 10
    const sorted = Object.entries(agg)
        .map(([name, val]) => ({ name, ...val }))
        .sort((a,b) => b.spend - a.spend)
        .slice(0, 10);

    window.myAdsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(i => i.name),
            datasets: [
                {
                    label: 'Chi Tiêu',
                    data: sorted.map(i => i.spend),
                    backgroundColor: '#d93025',
                    yAxisID: 'y'
                },
                {
                    label: 'Kết Quả',
                    data: sorted.map(i => i.result),
                    backgroundColor: '#1a73e8',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { type: 'linear', display: false, position: 'left' },
                y1: { type: 'linear', display: false, position: 'right' }
            }
        }
    });
}

// --- CÁC HÀM TƯƠNG TÁC ---
function deleteUploadBatch(id, name) {
    if(!confirm("Xóa file: " + name + "?")) return;
    if(ACTIVE_BATCH_ID === id) ACTIVE_BATCH_ID = null;
    
    db.ref('ads_data').orderByChild('batchId').equalTo(id).once('value', s => {
        const u = {};
        u['/upload_logs/' + id] = null;
        if(s.exists()) s.forEach(c => u['/ads_data/' + c.key] = null);
        db.ref().update(u).then(() => {
            alert("Đã xóa!");
            GLOBAL_ADS_DATA = GLOBAL_ADS_DATA.filter(item => item.batchId !== id);
            applyFilters();
        });
    });
}

function selectUploadBatch(id) {
    ACTIVE_BATCH_ID = id;
    updateHistoryHighlight();
    applyFilters();
}

function viewAllData() {
    ACTIVE_BATCH_ID = null;
    updateHistoryHighlight();
    applyFilters();
}

function updateHistoryHighlight() {
    document.querySelectorAll('.history-row').forEach(row => {
        if(ACTIVE_BATCH_ID && row.dataset.id === ACTIVE_BATCH_ID) {
            row.style.background = '#e8f0fe';
            row.style.fontWeight = 'bold';
        } else {
            row.style.background = 'transparent';
            row.style.fontWeight = 'normal';
        }
    });
}

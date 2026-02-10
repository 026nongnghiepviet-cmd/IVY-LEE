/**
 * ADS MODULE V12 (FIX DELETE UPDATE)
 * - Sửa lỗi phải F5 mới cập nhật sau khi xóa
 * - Tự động reset về "Xem tất cả" nếu file đang xem bị xóa
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
    console.log("Ads V12 Loaded");
    injectHistoryTable();

    const input = document.getElementById('ads-file-input');
    if(input && !input.hasAttribute('data-listening')) {
        input.addEventListener('change', handleFirebaseUpload);
        input.setAttribute('data-listening', 'true');
    }

    document.getElementById('filter-search')?.addEventListener('keyup', applyFilters);
    document.getElementById('filter-start')?.addEventListener('change', applyFilters);
    document.getElementById('filter-end')?.addEventListener('change', applyFilters);

    if(db) {
        loadUploadHistory();
        loadAdsData();
    }
    
    // Gắn hàm vào window để gọi từ HTML
    window.deleteUploadBatch = deleteUploadBatch;
    window.selectUploadBatch = selectUploadBatch;
    window.viewAllData = viewAllData;
}

// --- GIAO DIỆN LỊCH SỬ ---
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
            <div style="font-weight:800; color:#333;">📂 LỊCH SỬ UPLOAD (Chọn để xem)</div>
            <button onclick="viewAllData()" style="background:#1a73e8; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">Xem Tổng Hợp</button>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            <table style="width:100%; font-size:12px; border-collapse: collapse;">
                <thead style="position: sticky; top: 0; background: #fff; z-index:1;">
                    <tr style="background:#f1f3f4; color:#555; text-align:left;">
                        <th style="padding:8px;">Ngày Up</th>
                        <th style="padding:8px;">Tên File</th>
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

// --- CHỨC NĂNG CHỌN FILE ---
function selectUploadBatch(batchId) {
    ACTIVE_BATCH_ID = batchId;
    updateHistoryHighlight();
    applyFilters(); 
}

function viewAllData() {
    ACTIVE_BATCH_ID = null;
    updateHistoryHighlight();
    applyFilters();
}

function updateHistoryHighlight() {
    const rows = document.querySelectorAll('.history-row');
    rows.forEach(row => {
        if(ACTIVE_BATCH_ID && row.dataset.id === ACTIVE_BATCH_ID) {
            row.style.background = '#e8f0fe'; 
            row.style.fontWeight = 'bold';
        } else {
            row.style.background = 'transparent';
            row.style.fontWeight = 'normal';
        }
    });
}

// --- XÓA FILE (ĐÃ SỬA LỖI CẬP NHẬT) ---
function deleteUploadBatch(batchId, fileName) {
    if(!confirm(`⚠️ XÓA DỮ LIỆU?\nBạn muốn xóa file: "${fileName}"?\n\nToàn bộ số liệu của file này sẽ biến mất khỏi biểu đồ!`)) return;
    
    // 1. Nếu đang xem file bị xóa -> Chuyển về xem tất cả
    if(ACTIVE_BATCH_ID === batchId) {
        ACTIVE_BATCH_ID = null;
    }

    // 2. Xóa trên Server
    db.ref('ads_data').orderByChild('batchId').equalTo(batchId).once('value', snapshot => {
        const updates = {};
        updates['/upload_logs/' + batchId] = null;
        if (snapshot.exists()) {
            snapshot.forEach(child => { updates['/ads_data/' + child.key] = null; });
        }
        
        db.ref().update(updates).then(() => {
            alert("🗑️ Đã xóa thành công!");
            
            // 3. CẬP NHẬT GIAO DIỆN NGAY LẬP TỨC (Fix lỗi phải F5)
            // Lọc bỏ dữ liệu vừa xóa khỏi biến toàn cục
            GLOBAL_ADS_DATA = GLOBAL_ADS_DATA.filter(item => item.batchId !== batchId);
            
            // Vẽ lại toàn bộ
            applyFilters(); 
            updateHistoryHighlight();
            
            // Lưu ý: loadUploadHistory() sẽ tự chạy lại nhờ cơ chế realtime của Firebase
        }).catch(err => {
            alert("Lỗi: " + err.message);
        });
    });
}

// --- XỬ LÝ UPLOAD ---
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
                    alert(`✅ Upload thành công!\nĐang hiển thị số liệu của file: ${file.name}`);
                    if(btnText) btnText.innerText = "Upload Excel";
                    document.getElementById('ads-file-input').value = "";
                    
                    // Tự động chọn file vừa up
                    ACTIVE_BATCH_ID = batchId;
                });
            } else {
                alert("File lỗi (Thiếu cột Tiền/Chiến dịch/Ngày)");
                if(btnText) btnText.innerText = "Upload Excel";
            }
        } catch (err) {
            alert("Lỗi: " + err.message);
            if(btnText) btnText.innerText = "Upload Excel";
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- BÓC TÁCH DỮ LIỆU ---
function parseExcelSmart(rows) {
    if (rows.length < 2) return { data: [], totalSpend: 0 };
    
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    const colStart = header.findIndex(h => h.includes("bắt đầu báo cáo")); 
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    const colSpend = header.findIndex(h => h.includes("số tiền đã chi tiêu") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colMess = header.findIndex(h => h.includes("người liên hệ") || h.includes("messaging"));

    if (colSpend === -1) return { data: [], totalSpend: 0 };

    let parsedData = [];
    let grandTotal = 0;

    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r || r.length===0) continue;
        
        let spend = parseFloat(r[colSpend]) || 0;
        if(spend <= 0) continue; 

        let leads = parseFloat(r[colResult]) || parseFloat(r[colMess]) || 0;
        let campaignName = r[colCamp] || "Unknown";
        let parts = campaignName.split('-');
        let employee = parts[0] ? parts[0].trim().toUpperCase() : "KHÁC";
        let product = parts[1] ? parts[1].trim() : "Chung";
        let runStart = r[colStart] || ""; 

        parsedData.push({
            campaign: campaignName,
            employee: employee,
            product: product,
            spend: spend,
            leads: leads,
            run_start: runStart 
        });
        grandTotal += spend;
    }
    return { data: parsedData, totalSpend: grandTotal };
}

// --- HIỂN THỊ LỊCH SỬ ---
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
            const timeStr = `${("0"+d.getDate()).slice(-2)}/${("0"+(d.getMonth()+1)).slice(-2)} ${("0"+d.getHours()).slice(-2)}:${("0"+d.getMinutes()).slice(-2)}`;
            const money = new Intl.NumberFormat('vi-VN').format(log.totalSpend);
            
            html += `
                <tr class="history-row" data-id="${key}" style="border-bottom:1px solid #f0f0f0; cursor:pointer;" onclick="selectUploadBatch('${key}')">
                    <td style="padding:8px; font-size:11px; color:#555">${timeStr}</td>
                    <td style="padding:8px; font-size:11px; color:#1a73e8; word-break:break-word">${log.fileName}</td>
                    <td style="padding:8px; text-align:right; font-weight:bold; font-size:11px">${money}</td>
                    <td style="padding:8px; text-align:center;">
                        <button onclick="event.stopPropagation(); deleteUploadBatch('${key}', '${log.fileName}')" 
                                style="cursor:pointer; background:none; border:none; font-size:14px; color:red;" 
                                title="Xóa vĩnh viễn">✕</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        updateHistoryHighlight();
    });
}

// --- TẢI & LỌC DỮ LIỆU ---
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

    // 1. Lọc theo Batch ID (Nếu đang chọn file cụ thể)
    if(ACTIVE_BATCH_ID) {
        filtered = filtered.filter(item => item.batchId === ACTIVE_BATCH_ID);
    }

    // 2. Lọc theo dữ liệu & thời gian
    filtered = filtered.filter(item => {
        const contentMatch = (item.employee + " " + item.product + " " + item.campaign).toLowerCase().includes(search);
        let dateMatch = true;
        if(item.run_start) {
            const itemDate = item.run_start.substring(0, 10); 
            if (startStr && itemDate < startStr) dateMatch = false;
            if (endStr && itemDate > endStr) dateMatch = false;
        }
        return contentMatch && dateMatch;
    });

    renderDashboard(filtered);
}

// --- HIỂN THỊ DASHBOARD ---
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

function renderMainTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";
    data.sort((a,b) => b.spend - a.spend);

    data.slice(0, 200).forEach(item => {
        const cpl = item.leads > 0 ? Math.round(item.spend/item.leads) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold; color:#1a73e8">${item.employee}</td>
            <td title="${item.campaign}">${item.product}</td>
            <td style="font-size:11px; color:#666">${item.run_start}</td>
            <td style="text-align:right; font-weight:600">${item.spend.toLocaleString('vi-VN')}</td>
            <td style="text-align:center; font-weight:bold; color:#d93025">${item.leads}</td>
            <td style="text-align:right; font-size:11px">${cpl.toLocaleString('vi-VN')}</td>
        `;
        tbody.appendChild(tr);
    });
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
                { label: 'Tiền', data: sorted.map(i => i.spend), backgroundColor: '#d93025', yAxisID: 'y' },
                { label: 'Leads', data: sorted.map(i => i.leads), backgroundColor: '#1a73e8', yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { position: 'left' }, y1: { position: 'right', grid: {display:false} } }
        }
    });
}

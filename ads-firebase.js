/**
 * ADS MODULE V25 (CORE READER)
 * - Reset toàn bộ logic phức tạp.
 * - Chỉ tập trung đọc đúng cột "Tên nhóm quảng cáo" và "Số tiền đã chi tiêu (VND)".
 * - Hiển thị bảng và biểu đồ ngay lập tức.
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

// --- KHỞI TẠO ---
function initAdsAnalysis() {
    console.log("Ads V25 (Core) Loaded");
    
    // 1. Làm sạch giao diện
    resetUI();

    // 2. Gắn sự kiện Upload
    const inputAds = document.getElementById('ads-file-input');
    if(inputAds) {
        // Xóa sự kiện cũ để tránh lặp
        const newClone = inputAds.cloneNode(true);
        inputAds.parentNode.replaceChild(newClone, inputAds);
        newClone.addEventListener('change', handleUploadCore);
    }
}

// --- HÀM TẠO KHUNG GIAO DIỆN ---
function resetUI() {
    const container = document.getElementById('ads-analysis-result');
    if (!container) return;

    container.style.display = 'block';
    container.innerHTML = `
        <div style="padding:15px; background:#fff; border-radius:8px; border:1px solid #ddd;">
            <h3 style="margin:0 0 15px 0; color:#333; border-bottom:1px solid #eee; padding-bottom:10px;">📊 KẾT QUẢ PHÂN TÍCH FILE</h3>
            
            <div style="height:350px; margin-bottom:30px;">
                <canvas id="chart-ads-core"></canvas>
            </div>

            <div class="table-responsive">
                <table style="width:100%; font-size:12px; border-collapse: collapse; border:1px solid #eee;">
                    <thead>
                        <tr style="background:#f1f3f4; color:#333; font-weight:bold;">
                            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Tên Nhóm Quảng Cáo</th>
                            <th style="padding:10px; border:1px solid #ddd; text-align:right;">Chi Tiêu (VND)</th>
                            <th style="padding:10px; border:1px solid #ddd; text-align:center;">Kết Quả</th>
                            <th style="padding:10px; border:1px solid #ddd; text-align:right;">Giá / KQ</th>
                        </tr>
                    </thead>
                    <tbody id="ads-table-body-core">
                        <tr><td colspan="4" style="text-align:center; padding:20px;">Vui lòng chọn file Excel...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// --- XỬ LÝ UPLOAD (ĐƠN GIẢN HÓA) ---
function handleUploadCore(e) {
    const file = e.target.files[0];
    if(!file) return;

    const btnText = document.querySelector('.upload-text');
    if(btnText) btnText.innerText = "⏳ Đang đọc...";

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Chuyển Sheet thành JSON (Lấy dòng 1 làm Header mặc định)
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); // Lấy dạng mảng mảng [[row1], [row2]]
            
            // Gọi hàm phân tích cốt lõi
            const result = parseDataCore(json);

            if (result.length > 0) {
                renderDataCore(result);
                alert(`✅ Đã đọc thành công ${result.length} dòng dữ liệu!`);
                if(btnText) btnText.innerText = "Upload Excel";
            } else {
                alert("❌ Không tìm thấy dữ liệu! Vui lòng kiểm tra lại file.");
                if(btnText) btnText.innerText = "Upload Excel";
            }

        } catch (err) {
            console.error(err);
            alert("Lỗi đọc file: " + err.message);
            if(btnText) btnText.innerText = "Upload Excel";
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- LOGIC PHÂN TÍCH (TÌM ĐÚNG CỘT BẠN CẦN) ---
function parseDataCore(rows) {
    if (rows.length < 2) return [];

    // 1. Tìm dòng Header (Chứa chữ "Tên nhóm quảng cáo")
    let headerIndex = -1;
    let colNameIdx = -1;
    let colSpendIdx = -1;
    let colResultIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (!row) continue;
        
        // Chuyển toàn bộ dòng thành chữ thường để tìm
        const rowStr = row.map(cell => cell ? cell.toString().toLowerCase().trim() : "").join("|");
        
        // Kiểm tra xem dòng này có chứa các từ khóa không
        if (rowStr.includes("tên nhóm quảng cáo") && rowStr.includes("số tiền đã chi tiêu")) {
            headerIndex = i;
            
            // Tìm vị trí index của từng cột
            row.forEach((cell, idx) => {
                if(!cell) return;
                const txt = cell.toString().toLowerCase().trim();
                if (txt === "tên nhóm quảng cáo") colNameIdx = idx;
                if (txt.includes("số tiền đã chi tiêu")) colSpendIdx = idx;
                if (txt === "kết quả") colResultIdx = idx;
            });
            break;
        }
    }

    if (headerIndex === -1 || colNameIdx === -1 || colSpendIdx === -1) {
        console.log("Debug Header:", {headerIndex, colNameIdx, colSpendIdx});
        alert("Không tìm thấy cột 'Tên nhóm quảng cáo' hoặc 'Số tiền đã chi tiêu (VND)'");
        return [];
    }

    // 2. Duyệt dữ liệu
    let parsedData = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const rawName = row[colNameIdx];
        const rawSpend = row[colSpendIdx];
        const rawResult = row[colResultIdx];

        if (!rawName || rawSpend == null) continue;

        // Xử lý tiền (bỏ dấu phẩy nếu có)
        let spend = 0;
        if (typeof rawSpend === 'number') spend = rawSpend;
        else if (typeof rawSpend === 'string') spend = parseFloat(rawSpend.replace(/,/g, '')) || 0;

        // Xử lý kết quả
        let result = 0;
        if (typeof rawResult === 'number') result = rawResult;
        else if (typeof rawResult === 'string') result = parseFloat(rawResult.replace(/,/g, '')) || 0;

        if (spend > 0) {
            parsedData.push({
                name: rawName,
                spend: spend,
                result: result
            });
        }
    }

    return parsedData;
}

// --- HIỂN THỊ (RENDER) ---
function renderDataCore(data) {
    const tbody = document.getElementById('ads-table-body-core');
    if (!tbody) return;
    tbody.innerHTML = "";

    // Sắp xếp: Tiền giảm dần
    data.sort((a, b) => b.spend - a.spend);

    // Vẽ Bảng
    data.forEach(item => {
        const cpl = item.result > 0 ? Math.round(item.spend / item.result) : 0;
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #eee";
        tr.innerHTML = `
            <td style="padding:10px; border:1px solid #eee; color:#1a73e8; font-weight:600;">${item.name}</td>
            <td style="padding:10px; border:1px solid #eee; text-align:right; font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.spend)}</td>
            <td style="padding:10px; border:1px solid #eee; text-align:center;">${item.result}</td>
            <td style="padding:10px; border:1px solid #eee; text-align:right; color:#666;">${new Intl.NumberFormat('vi-VN').format(cpl)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Vẽ Biểu đồ (Top 10)
    drawChartCore(data.slice(0, 10));
}

function drawChartCore(data) {
    const ctx = document.getElementById('chart-ads-core');
    if (!ctx) return;
    
    // Hủy biểu đồ cũ nếu có
    if (window.myAdsChart) window.myAdsChart.destroy();

    window.myAdsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(i => {
                // Cắt tên ngắn gọn cho đẹp biểu đồ
                return i.name.length > 20 ? i.name.substring(0, 20) + "..." : i.name;
            }),
            datasets: [{
                label: 'Chi Tiêu (VND)',
                data: data.map(i => i.spend),
                backgroundColor: '#d93025',
                borderWidth: 1
            },
            {
                label: 'Kết Quả',
                data: data.map(i => i.result),
                backgroundColor: '#1a73e8',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
                y1: { position: 'right', beginAtZero: true, grid: { display: false } }
            }
        }
    });
}

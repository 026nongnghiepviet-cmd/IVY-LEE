/**
 * ADS MODULE PRO (FIREBASE INTEGRATED)
 * Phien ban: V5
 * Tac vu: Upload Excel -> Firebase -> Dashboard (Chart + Table + Filter)
 */

// 1. CẤU HÌNH FIREBASE (Của bạn)
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

// Khởi tạo Firebase an toàn (Tránh lỗi nếu thư viện chưa load)
let db;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        console.log("Firebase Connected Successfully");
    } else {
        console.error("LỖI: Chưa chèn thư viện Firebase vào Blogger!");
    }
} catch (e) {
    console.error("Lỗi khởi tạo Firebase:", e);
}

// Biến toàn cục để lưu dữ liệu phục vụ bộ lọc
let GLOBAL_ADS_DATA = [];

// --- 2. HÀM KHỞI TẠO (Được gọi từ Blogger khi bấm tab Ads) ---
function initAdsAnalysis() {
    console.log("Init Ads Module...");
    
    // Gắn sự kiện cho nút Upload
    const input = document.getElementById('ads-file-input');
    if (input && !input.hasAttribute('data-listening')) {
        input.addEventListener('change', handleFirebaseUpload);
        input.setAttribute('data-listening', 'true');
    }

    // Gắn sự kiện cho bộ lọc (Nếu có trên giao diện HTML V106)
    const searchInput = document.getElementById('filter-search');
    const startInput = document.getElementById('filter-start');
    const endInput = document.getElementById('filter-end');

    if(searchInput) searchInput.addEventListener('keyup', applyFilters);
    if(startInput) startInput.addEventListener('change', applyFilters);
    if(endInput) endInput.addEventListener('change', applyFilters);

    // Tải dữ liệu từ Firebase về
    if(db) loadFirebaseAds();
}

// --- 3. XỬ LÝ UPLOAD FILE ---
function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Hiệu ứng loading text
    const btnText = document.querySelector('.upload-text');
    const originalText = btnText ? btnText.innerText : "Upload";
    if(btnText) btnText.innerText = "⏳ Đang đọc file & lưu...";

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            // Đọc file Excel bằng thư viện XLSX
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header:1});
            
            // Phân tích dữ liệu
            const adsData = parseExcelToAds(json);
            
            if (adsData.length > 0) {
                // Lưu lên Firebase
                const updates = {};
                adsData.forEach(item => {
                    const newKey = db.ref().child('ads_data').push().key;
                    updates['/ads_data/' + newKey] = item;
                });
                
                db.ref().update(updates).then(() => {
                    alert("✅ Đã lưu thành công " + adsData.length + " chiến dịch!");
                    if(btnText) btnText.innerText = originalText;
                }).catch(err => {
                    alert("Lỗi lưu Firebase (Kiểm tra Rules): " + err.message);
                    if(btnText) btnText.innerText = originalText;
                });
            } else {
                alert("File không chứa dữ liệu hợp lệ (Cần cột: Tên chiến dịch, Tiền đã chi, Kết quả)");
                if(btnText) btnText.innerText = originalText;
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi đọc file: " + error.message);
            if(btnText) btnText.innerText = originalText;
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- 4. LOGIC ĐỌC CỘT EXCEL (Thông minh) ---
function parseExcelToAds(rows) {
    if (rows.length < 2) return [];
    
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    
    // Tìm index các cột quan trọng theo từ khóa tiếng Việt
    const colSpend = header.findIndex(h => h.includes("tiền đã chi") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    
    if (colSpend === -1) return []; // Không tìm thấy cột tiền

    let result = [];
    const uploadTime = new Date().toISOString(); // Thời điểm upload

    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r || r.length === 0) continue;
        
        let spend = parseFloat(r[colSpend]) || 0;
        let leads = parseFloat(r[colResult]) || 0;
        let name = r[colCamp] || "Campaign " + i;
        
        if(spend > 0) {
            result.push({
                name: name,
                spend: spend,
                leads: leads,
                date: uploadTime // Dùng để lọc theo ngày
            });
        }
    }
    return result;
}

// --- 5. TẢI DỮ LIỆU TỪ FIREBASE ---
function loadFirebaseAds() {
    db.ref('ads_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            GLOBAL_ADS_DATA = [];
            // Nếu không có dữ liệu, ẩn bảng kết quả
            const resDiv = document.getElementById('ads-analysis-result');
            if(resDiv) resDiv.style.display = 'none';
            return;
        }
        
        // Chuyển Object thành Array và sắp xếp mới nhất lên đầu
        GLOBAL_ADS_DATA = Object.values(data).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        // Gọi hàm lọc để hiển thị (Mặc định hiển thị tất cả)
        applyFilters();
    });
}

// --- 6. BỘ LỌC DỮ LIỆU ---
function applyFilters() {
    const searchInput = document.getElementById('filter-search');
    const startInput = document.getElementById('filter-start');
    const endInput = document.getElementById('filter-end');

    const searchText = searchInput ? searchInput.value.toLowerCase() : "";
    const startDate = (startInput && startInput.value) ? new Date(startInput.value) : null;
    const endDate = (endInput && endInput.value) ? new Date(endInput.value) : null;
    
    if(endDate) endDate.setHours(23, 59, 59); // Hết ngày

    // Logic lọc mảng
    const filteredData = GLOBAL_ADS_DATA.filter(item => {
        const itemDate = new Date(item.date);
        
        // Lọc theo tên
        const matchName = item.name.toLowerCase().includes(searchText);
        
        // Lọc theo ngày
        let matchDate = true;
        if(startDate && itemDate < startDate) matchDate = false;
        if(endDate && itemDate > endDate) matchDate = false;

        return matchName && matchDate;
    });

    renderDashboard(filteredData);
}

// --- 7. HIỂN THỊ DASHBOARD ---
function renderDashboard(data) {
    const resultDiv = document.getElementById('ads-analysis-result');
    if(resultDiv) resultDiv.style.display = 'block';

    // A. Tính Tổng KPI
    let totalSpend = 0;
    let totalLeads = 0;
    let chartDataMap = {}; 

    data.forEach(item => {
        totalSpend += (item.spend || 0);
        totalLeads += (item.leads || 0);

        // Gộp dữ liệu để vẽ biểu đồ (Tránh bị quá nhiều cột)
        if(chartDataMap[item.name]) {
            chartDataMap[item.name].spend += (item.spend || 0);
            chartDataMap[item.name].leads += (item.leads || 0);
        } else {
            chartDataMap[item.name] = { 
                name: item.name, 
                spend: (item.spend || 0), 
                leads: (item.leads || 0) 
            };
        }
    });

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    
    // Cập nhật số liệu HTML
    const elSpend = document.getElementById('metric-spend');
    const elLeads = document.getElementById('metric-leads');
    const elCpl = document.getElementById('metric-cpl');

    if(elSpend) elSpend.innerText = fmt(totalSpend);
    if(elLeads) elLeads.innerText = totalLeads;
    if(elCpl) elCpl.innerText = totalLeads > 0 ? fmt(totalSpend / totalLeads) : "0 ₫";

    // B. Vẽ Biểu đồ
    drawChart(Object.values(chartDataMap));

    // C. Vẽ Bảng chi tiết
    renderDetailTable(data);
}

// --- 8. VẼ BIỂU ĐỒ CHART.JS ---
function drawChart(campaigns) {
    const ctx = document.getElementById('chart-ads-upload');
    if(!ctx) return;

    // Sắp xếp giảm dần theo tiền tiêu & Lấy Top 5
    campaigns.sort((a,b) => b.spend - a.spend);
    const top5 = campaigns.slice(0, 5);

    const labels = top5.map(c => c.name.length > 20 ? c.name.substring(0,20)+"..." : c.name);
    
    if(window.myAdsChart instanceof Chart) {
        window.myAdsChart.destroy();
    }

    window.myAdsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Chi phí (VNĐ)',
                    data: top5.map(c => c.spend),
                    backgroundColor: '#d93025',
                    yAxisID: 'y'
                },
                {
                    label: 'Kết quả (Leads)',
                    data: top5.map(c => c.leads),
                    backgroundColor: '#1a73e8',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { type: 'linear', display: true, position: 'left' },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
}

// --- 9. VẼ BẢNG TABLE ---
function renderDetailTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    
    tbody.innerHTML = "";
    
    // Hiển thị tối đa 50 dòng để không lag
    const displayData = data.slice(0, 50);

    displayData.forEach(item => {
        const d = new Date(item.date);
        const timeStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${("0" + d.getMinutes()).slice(-2)}`;
        
        const cpl = item.leads > 0 ? (item.spend / item.leads) : 0;
        const cplStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cpl);
        const spendStr = new Intl.NumberFormat('vi-VN').format(item.spend);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size:11px; color:#666">${timeStr}</td>
            <td style="font-weight:bold; color:#1a73e8">${item.name}</td>
            <td style="text-align:right">${spendStr}</td>
            <td style="text-align:center; font-weight:bold">${item.leads}</td>
            <td style="text-align:right; color:#d93025; font-size:11px">${cplStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

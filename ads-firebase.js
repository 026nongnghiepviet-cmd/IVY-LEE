/**
 * ADS MODULE PRO (FIREBASE)
 * Chức năng: Upload, Lưu trữ, Lọc, Vẽ biểu đồ, Bảng chi tiết
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

// Khởi tạo Firebase nếu chưa có
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Biến toàn cục để lưu dữ liệu tải về (phục vụ việc lọc)
let GLOBAL_ADS_DATA = [];

// --- HÀM KHỞI TẠO (Được gọi từ Blogger) ---
function initAdsAnalysis() {
    console.log("Ads Module Pro: Ready");
    
    // 1. Gắn sự kiện Upload
    const input = document.getElementById('ads-file-input');
    if(input && !input.hasAttribute('data-listening')) {
        input.addEventListener('change', handleFirebaseUpload);
        input.setAttribute('data-listening', 'true');
    }

    // 2. Gắn sự kiện bộ lọc (Nếu có trên giao diện)
    const searchInput = document.getElementById('filter-search');
    const startInput = document.getElementById('filter-start');
    const endInput = document.getElementById('filter-end');

    if(searchInput) searchInput.addEventListener('keyup', applyFilters);
    if(startInput) startInput.addEventListener('change', applyFilters);
    if(endInput) endInput.addEventListener('change', applyFilters);

    // 3. Tải dữ liệu
    loadFirebaseAds();
}

// --- XỬ LÝ UPLOAD FILE ---
function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    // UI Loading (Nếu có class upload-text)
    const btnText = document.querySelector('.upload-text');
    let originalText = "";
    if(btnText) {
        originalText = btnText.innerText;
        btnText.innerText = "⏳ Đang đọc file...";
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header:1});
            
            const adsData = parseExcelToAds(json);
            
            if(adsData.length > 0) {
                // Upload từng dòng lên Firebase
                const updates = {};
                adsData.forEach(item => {
                    const newKey = db.ref().child('ads_data').push().key;
                    updates['/ads_data/' + newKey] = item;
                });
                
                db.ref().update(updates).then(() => {
                    alert("✅ Đã lưu thành công " + adsData.length + " chiến dịch!");
                    if(btnText) btnText.innerText = originalText;
                }).catch(err => {
                    alert("Lỗi lưu Firebase: " + err.message);
                    if(btnText) btnText.innerText = originalText;
                });
            } else {
                alert("Không tìm thấy cột dữ liệu hợp lệ (Cần cột: Tên chiến dịch, Tiền, Kết quả)");
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

// --- PHÂN TÍCH DỮ LIỆU FILE EXCEL ---
function parseExcelToAds(rows) {
    if (rows.length < 2) return [];
    
    // Chuẩn hóa header về chữ thường để so sánh
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    
    // Tìm vị trí cột dựa trên từ khóa (Tiếng Việt & Tiếng Anh)
    const colSpend = header.findIndex(h => h.includes("tiền đã chi") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign name"));
    
    if (colSpend === -1) return []; // Không tìm thấy cột tiền -> File sai

    let result = [];
    const uploadTime = new Date().toISOString(); // Thời gian upload hiện tại

    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r) continue;
        
        // Ép kiểu số an toàn
        let spend = parseFloat(r[colSpend]) || 0;
        let leads = parseFloat(r[colResult]) || 0;
        let name = r[colCamp] || "Unknown Campaign";
        
        // Chỉ lấy những dòng có tiêu tiền > 0
        if (spend > 0) {
            result.push({
                name: name,
                spend: spend,
                leads: leads,
                date: uploadTime // Lưu thời gian upload để lọc
            });
        }
    }
    return result;
}

// --- TẢI DỮ LIỆU TỪ FIREBASE ---
function loadFirebaseAds() {
    db.ref('ads_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) {
            GLOBAL_ADS_DATA = [];
            document.getElementById('ads-analysis-result').style.display = 'none';
            return;
        }
        
        // Chuyển Object thành Array và sắp xếp mới nhất lên đầu
        GLOBAL_ADS_DATA = Object.values(data).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        // Gọi hàm lọc để hiển thị (Mặc định hiển thị tất cả)
        applyFilters();
    });
}

// --- BỘ LỌC DỮ LIỆU (SEARCH & DATE) ---
function applyFilters() {
    const searchInput = document.getElementById('filter-search');
    const startInput = document.getElementById('filter-start');
    const endInput = document.getElementById('filter-end');

    const searchText = searchInput ? searchInput.value.toLowerCase() : "";
    const startDate = (startInput && startInput.value) ? new Date(startInput.value) : null;
    const endDate = (endInput && endInput.value) ? new Date(endInput.value) : null;
    
    // Nếu có endDate, chỉnh giờ về cuối ngày (23:59:59)
    if(endDate) endDate.setHours(23, 59, 59);

    // Logic lọc
    const filteredData = GLOBAL_ADS_DATA.filter(item => {
        const itemDate = new Date(item.date);
        
        // 1. Lọc theo tên
        const matchName = item.name.toLowerCase().includes(searchText);
        
        // 2. Lọc theo ngày (Ngày upload file)
        let matchDate = true;
        if(startDate && itemDate < startDate) matchDate = false;
        if(endDate && itemDate > endDate) matchDate = false;

        return matchName && matchDate;
    });

    renderDashboard(filteredData);
}

// --- HIỂN THỊ DASHBOARD (KPI, CHART, TABLE) ---
function renderDashboard(data) {
    const resultDiv = document.getElementById('ads-analysis-result');
    if(resultDiv) resultDiv.style.display = 'block';

    // 1. TÍNH TỔNG KPI
    let totalSpend = 0;
    let totalLeads = 0;
    let chartDataMap = {}; // Dùng để gộp dữ liệu vẽ biểu đồ

    data.forEach(item => {
        totalSpend += (item.spend || 0);
        totalLeads += (item.leads || 0);

        // Gộp theo tên chiến dịch để vẽ biểu đồ cho gọn
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

    // Format tiền tệ
    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    
    // Gán vào thẻ HTML (Nếu tồn tại)
    const elSpend = document.getElementById('metric-spend');
    const elLeads = document.getElementById('metric-leads'); // Đã sửa ID cho đúng chuẩn V106
    const elCpl = document.getElementById('metric-cpl');

    if(elSpend) elSpend.innerText = fmt(totalSpend);
    if(elLeads) elLeads.innerText = totalLeads;
    if(elCpl) elCpl.innerText = totalLeads > 0 ? fmt(totalSpend / totalLeads) : "0 ₫";

    // 2. VẼ BIỂU ĐỒ (TOP 5 CHIẾN DỊCH)
    const campaigns = Object.values(chartDataMap);
    drawChart(campaigns);

    // 3. VẼ BẢNG CHI TIẾT (Nếu có thẻ table)
    renderDetailTable(data);
}

// --- VẼ BIỂU ĐỒ ---
function drawChart(campaigns) {
    const ctx = document.getElementById('chart-ads-upload');
    if(!ctx) return;

    // Sắp xếp giảm dần theo tiền tiêu
    campaigns.sort((a,b) => b.spend - a.spend);
    const top5 = campaigns.slice(0, 5); // Lấy top 5

    const labels = top5.map(c => c.name.length > 20 ? c.name.substring(0,20)+"..." : c.name);
    const dataSpend = top5.map(c => c.spend);
    const dataLeads = top5.map(c => c.leads);

    if(window.myAdsChart) {
        window.myAdsChart.destroy();
    }

    window.myAdsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Chi phí (VNĐ)',
                    data: dataSpend,
                    backgroundColor: '#d93025',
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Kết quả (Leads)',
                    data: dataLeads,
                    backgroundColor: '#1a73e8', // Màu xanh
                    borderColor: '#1a73e8',
                    type: 'line', // Vẽ đường line kết hợp
                    borderWidth: 2,
                    pointRadius: 4,
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Số tiền' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Số lượng' }
                }
            }
        }
    });
}

// --- VẼ BẢNG CHI TIẾT ---
function renderDetailTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    
    tbody.innerHTML = "";
    
    // Giới hạn hiển thị 100 dòng mới nhất để tránh lag trình duyệt
    const displayData = data.slice(0, 100);

    displayData.forEach(item => {
        const d = new Date(item.date);
        // Format ngày giờ: 10/02 14:30
        const timeStr = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
        
        const cpl = item.leads > 0 ? (item.spend / item.leads) : 0;
        const cplStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cpl);
        const spendStr = new Intl.NumberFormat('vi-VN').format(item.spend);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size:11px; color:#666; white-space:nowrap">${timeStr}</td>
            <td style="font-weight:bold; color:#1a73e8">${item.name}</td>
            <td style="text-align:right">${spendStr}</td>
            <td style="text-align:center; font-weight:bold">${item.leads}</td>
            <td style="text-align:right; color:#d93025; font-size:11px">${cplStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

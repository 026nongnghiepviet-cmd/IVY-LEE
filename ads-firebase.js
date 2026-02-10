/**
 * ADS MODULE V4 (PRO DASHBOARD)
 * Project: mkt-system-nnv
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

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

let GLOBAL_ADS_DATA = []; // Biến lưu toàn bộ dữ liệu để lọc

function initAdsAnalysis() {
    const input = document.getElementById('ads-file-input');
    if(input && !input.hasAttribute('data-listening')) {
        input.addEventListener('change', handleFirebaseUpload);
        input.setAttribute('data-listening', 'true');
    }
    
    // Gắn sự kiện cho bộ lọc
    document.getElementById('filter-search').addEventListener('keyup', applyFilters);
    document.getElementById('filter-start').addEventListener('change', applyFilters);
    document.getElementById('filter-end').addEventListener('change', applyFilters);

    loadFirebaseAds();
}

function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const btn = document.querySelector('.upload-text');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Đang xử lý...";

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {header:1});
        
        const adsData = parseExcelToAds(json);
        if(adsData.length > 0) {
            const updates = {};
            adsData.forEach(item => {
                const newKey = db.ref().child('ads_data').push().key;
                updates['/ads_data/' + newKey] = item;
            });
            db.ref().update(updates).then(() => {
                alert("✅ Đã lưu " + adsData.length + " dòng!");
                btn.innerText = oldText;
            });
        } else {
            alert("File lỗi!");
            btn.innerText = oldText;
        }
    };
    reader.readAsArrayBuffer(file);
}

function parseExcelToAds(rows) {
    if (rows.length < 2) return [];
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    const colSpend = header.findIndex(h => h.includes("tiền đã chi") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    
    if (colSpend === -1) return [];

    let result = [];
    const uploadTime = new Date().toISOString(); // Thời điểm upload file

    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r) continue;
        let spend = parseFloat(r[colSpend]) || 0;
        let leads = parseFloat(r[colResult]) || 0;
        let name = r[colCamp] || "Campaign " + i;
        if(spend > 0) {
            result.push({ name, spend, leads, date: uploadTime });
        }
    }
    return result;
}

function loadFirebaseAds() {
    db.ref('ads_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) {
            GLOBAL_ADS_DATA = [];
            return;
        }
        // Chuyển object thành mảng và sắp xếp mới nhất lên đầu
        GLOBAL_ADS_DATA = Object.values(data).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        applyFilters(); // Hiển thị dữ liệu
    });
}

function applyFilters() {
    const search = document.getElementById('filter-search').value.toLowerCase();
    const startStr = document.getElementById('filter-start').value;
    const endStr = document.getElementById('filter-end').value;

    const startDate = startStr ? new Date(startStr) : null;
    const endDate = endStr ? new Date(endStr) : null;
    if(endDate) endDate.setHours(23,59,59); // Hết ngày

    // LỌC DỮ LIỆU
    const filtered = GLOBAL_ADS_DATA.filter(item => {
        const itemDate = new Date(item.date);
        const matchName = item.name.toLowerCase().includes(search);
        const matchStart = startDate ? itemDate >= startDate : true;
        const matchEnd = endDate ? itemDate <= endDate : true;
        return matchName && matchStart && matchEnd;
    });

    renderDashboard(filtered);
}

function renderDashboard(data) {
    document.getElementById('ads-analysis-result').style.display = 'block';
    
    // 1. TÍNH TỔNG KPI
    let totalSpend = 0, totalLeads = 0;
    let campaignAgg = {}; // Gộp chiến dịch để vẽ biểu đồ

    data.forEach(item => {
        totalSpend += item.spend;
        totalLeads += item.leads;
        
        if(campaignAgg[item.name]) {
            campaignAgg[item.name].spend += item.spend;
            campaignAgg[item.name].leads += item.leads;
        } else {
            campaignAgg[item.name] = { ...item };
        }
    });

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    document.getElementById('metric-spend').innerText = fmt(totalSpend);
    document.getElementById('metric-leads').innerText = totalLeads;
    document.getElementById('metric-cpl').innerText = totalLeads > 0 ? fmt(totalSpend/totalLeads) : "0 ₫";

    // 2. VẼ BIỂU ĐỒ (TOP 5)
    drawChart(Object.values(campaignAgg));

    // 3. VẼ BẢNG CHI TIẾT
    renderTable(data);
}

function renderTable(data) {
    const tbody = document.getElementById('ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";

    // Giới hạn hiển thị 50 dòng mới nhất để web không lag
    const displayData = data.slice(0, 50);

    displayData.forEach(item => {
        const d = new Date(item.date);
        const timeStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes()}`;
        const cpl = item.leads > 0 ? (item.spend / item.leads).toLocaleString('vi-VN') : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size:11px; color:#666">${timeStr}</td>
            <td style="font-weight:bold; color:#1a73e8">${item.name}</td>
            <td style="text-align:right">${item.spend.toLocaleString('vi-VN')}</td>
            <td style="text-align:center; font-weight:bold">${item.leads}</td>
            <td style="text-align:right; color:#d93025">${cpl}</td>
        `;
        tbody.appendChild(tr);
    });
}

function drawChart(campaigns) {
    const ctx = document.getElementById('chart-ads-upload');
    if(window.myAdsChart) window.myAdsChart.destroy();
    
    campaigns.sort((a,b) => b.spend - a.spend);
    const top5 = campaigns.slice(0, 5);

    window.myAdsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top5.map(c => c.name.length > 15 ? c.name.substring(0,15)+"..." : c.name),
            datasets: [
                { label: 'Tiền', data: top5.map(c=>c.spend), backgroundColor: '#d93025', yAxisID: 'y' },
                { label: 'Leads', data: top5.map(c=>c.leads), backgroundColor: '#1a73e8', yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', display: true, position: 'left' },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
}

/**
 * ADS MODULE (FIREBASE) - V104
 */

// CẤU HÌNH FIREBASE CỦA BẠN
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

// Khởi tạo Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

function initAdsAnalysis() {
    const input = document.getElementById('ads-file-input');
    if(input && !input.hasAttribute('data-listening')) {
        input.addEventListener('change', handleFirebaseUpload);
        input.setAttribute('data-listening', 'true');
    }
    loadFirebaseAds();
}

function handleFirebaseUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {header:1});
        
        const adsData = parseExcelToAds(json);
        if(adsData.length > 0) {
            adsData.forEach(item => {
                db.ref('ads_data').push(item);
            });
            alert("Đã lưu " + adsData.length + " chiến dịch lên Firebase!");
        } else {
            alert("Không tìm thấy dữ liệu hợp lệ trong file!");
        }
    };
    reader.readAsArrayBuffer(file);
}

function parseExcelToAds(rows) {
    if (rows.length < 2) return [];
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    
    // Tìm cột theo file mẫu bạn gửi
    const colSpend = header.findIndex(h => h.includes("tiền đã chi") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    
    if (colSpend === -1) return [];

    let result = [];
    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r) continue;
        let spend = parseFloat(r[colSpend]) || 0;
        let leads = parseFloat(r[colResult]) || 0;
        let name = r[colCamp] || "Unknown Campaign";
        
        if(spend > 0) {
            result.push({
                name: name, 
                spend: spend, 
                leads: leads, 
                date: new Date().toISOString()
            });
        }
    }
    return result;
}

function loadFirebaseAds() {
    db.ref('ads_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) {
            document.getElementById('ads-analysis-result').style.display = 'none';
            return;
        }
        
        let totalSpend = 0, totalLeads = 0;
        let campaigns = {};

        Object.values(data).forEach(item => {
            totalSpend += item.spend;
            totalLeads += item.leads;
            
            if(campaigns[item.name]) {
                campaigns[item.name].spend += item.spend;
                campaigns[item.name].leads += item.leads;
            } else {
                campaigns[item.name] = { ...item };
            }
        });

        document.getElementById('ads-analysis-result').style.display = 'block';
        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
        
        document.getElementById('metric-spend').innerText = fmt(totalSpend);
        document.getElementById('metric-leads').innerText = totalLeads;
        document.getElementById('metric-cpl').innerText = totalLeads ? fmt(totalSpend/totalLeads) : "0 ₫";

        const sorted = Object.values(campaigns).sort((a,b) => b.spend - a.spend).slice(0,5);
        const ctx = document.getElementById('chart-ads-upload');
        
        if(window.myAdsChart) window.myAdsChart.destroy();
        
        window.myAdsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(c => c.name.length > 20 ? c.name.substring(0,20)+"..." : c.name),
                datasets: [
                    { label: 'Tiền (VNĐ)', data: sorted.map(c=>c.spend), backgroundColor: '#d93025', yAxisID: 'y' },
                    { label: 'Leads', data: sorted.map(c=>c.leads), backgroundColor: '#1a73e8', yAxisID: 'y1' }
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
    });
}

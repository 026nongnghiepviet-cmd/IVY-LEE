/**
 * ADS MODULE V3 (FIREBASE INTEGRATED)
 * Configured for Project: mkt-system-nnv
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

function initAdsAnalysis() {
    console.log("Ads Module Loaded");
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
    
    // UI Loading
    const btn = document.querySelector('.upload-text');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Đang xử lý file...";

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {header:1});
        
        const adsData = parseExcelToAds(json);
        
        if(adsData.length > 0) {
            // Push từng dòng lên Firebase
            const updates = {};
            adsData.forEach(item => {
                const newKey = db.ref().child('ads_data').push().key;
                updates['/ads_data/' + newKey] = item;
            });
            
            db.ref().update(updates).then(() => {
                alert("✅ Đã lưu thành công " + adsData.length + " dòng dữ liệu!");
                btn.innerText = oldText;
            }).catch(err => {
                alert("Lỗi lưu: " + err.message);
                btn.innerText = oldText;
            });
        } else {
            alert("File không hợp lệ hoặc không có dữ liệu!");
            btn.innerText = oldText;
        }
    };
    reader.readAsArrayBuffer(file);
}

function parseExcelToAds(rows) {
    if (rows.length < 2) return [];
    // Chuẩn hóa header về chữ thường để so sánh
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    
    // Tìm index các cột quan trọng
    const colSpend = header.findIndex(h => h.includes("tiền đã chi") || h.includes("amount spent"));
    const colResult = header.findIndex(h => h === "kết quả" || h === "results");
    const colCamp = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign"));
    
    if (colSpend === -1) return [];

    let result = [];
    for(let i=1; i<rows.length; i++) {
        let r = rows[i];
        if(!r) continue;
        
        // Parse số (xử lý trường hợp số trong Excel)
        let spend = parseFloat(r[colSpend]) || 0;
        let leads = parseFloat(r[colResult]) || 0;
        let name = r[colCamp] || "Campaign " + i;
        
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
    const metricsDiv = document.getElementById('ads-analysis-result');
    
    db.ref('ads_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) {
            metricsDiv.style.display = 'none';
            return;
        }
        
        metricsDiv.style.display = 'block';
        
        let totalSpend = 0;
        let totalLeads = 0;
        let campaignMap = {}; // Để gộp các chiến dịch trùng tên
        
        Object.values(data).forEach(item => {
            totalSpend += (item.spend || 0);
            totalLeads += (item.leads || 0);
            
            if(campaignMap[item.name]) {
                campaignMap[item.name].spend += (item.spend || 0);
                campaignMap[item.name].leads += (item.leads || 0);
            } else {
                campaignMap[item.name] = { 
                    name: item.name, 
                    spend: (item.spend || 0), 
                    leads: (item.leads || 0) 
                };
            }
        });
        
        // Format tiền Việt Nam
        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
        
        document.getElementById('metric-spend').innerText = fmt(totalSpend);
        document.getElementById('metric-leads').innerText = totalLeads;
        document.getElementById('metric-cpl').innerText = totalLeads > 0 ? fmt(totalSpend/totalLeads) : "0 ₫";
        
        // Vẽ biểu đồ Top 5
        drawAdsChart(Object.values(campaignMap));
    });
}

function drawAdsChart(campaigns) {
    const ctx = document.getElementById('chart-ads-upload');
    if(!ctx) return;
    
    // Sắp xếp giảm dần theo Tiền tiêu
    campaigns.sort((a,b) => b.spend - a.spend);
    const top5 = campaigns.slice(0, 5);
    
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
                    yAxisID: 'y'
                },
                {
                    label: 'Kết quả (Leads)',
                    data: dataLeads,
                    backgroundColor: '#1a73e8',
                    yAxisID: 'y1'
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
                    title: { display: true, text: 'Số khách' }
                }
            }
        }
    });
}

/**
 * ADS ANALYSIS MODULE (V1)
 * Chuyên đọc file CSV/Excel từ Facebook Ads và vẽ biểu đồ
 */

// Hàm khởi tạo, được gọi từ Blogger khi bấm vào tab
function initAdsAnalysis() {
    const inputElement = document.getElementById('ads-file-input');
    if (inputElement && !inputElement.hasAttribute('data-listening')) {
        inputElement.addEventListener('change', handleAdsFile);
        inputElement.setAttribute('data-listening', 'true');
        console.log("Ads Analysis Module Loaded");
    }
}

// Xử lý khi người dùng chọn file
function handleAdsFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {header:1});
        analyzeAdsData(json);
    };
    reader.readAsArrayBuffer(file);
}

// Phân tích dữ liệu từ file Excel
function analyzeAdsData(rows) {
    if (rows.length < 2) return alert("File không có dữ liệu!");

    // Tự động tìm cột dựa trên tên tiếng Việt
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    const colSpendIdx = header.findIndex(h => h.includes("số tiền đã chi tiêu") || h.includes("amount spent") || h.includes("tiền đã chi"));
    const colResultIdx = header.findIndex(h => h === "kết quả" || h === "results" || h === "result");
    const colCampIdx = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign name"));

    if (colSpendIdx === -1) return alert("Lỗi: Không tìm thấy cột 'Số tiền đã chi tiêu' trong file!");

    let totalSpend = 0;
    let totalResults = 0;
    let campaigns = [];

    for (let i = 1; i < rows.length; i++) {
        let r = rows[i];
        if (!r || r.length === 0) continue;

        let spend = parseFloat(r[colSpendIdx]) || 0; 
        let result = parseFloat(r[colResultIdx]) || 0;
        let name = r[colCampIdx] || "Chiến dịch " + i;

        if (spend > 0) {
            totalSpend += spend;
            totalResults += result;
            campaigns.push({ name: name, spend: spend, result: result });
        }
    }

    // Hiển thị số liệu
    document.getElementById('ads-analysis-result').style.display = 'block';
    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    
    document.getElementById('metric-spend').innerText = fmt(totalSpend);
    document.getElementById('metric-results').innerText = totalResults;
    document.getElementById('metric-cpl').innerText = totalResults > 0 ? fmt(totalSpend / totalResults) : "0 ₫";
    
    renderAdsChart(campaigns);
}

// Vẽ biểu đồ
function renderAdsChart(campaigns) {
    campaigns.sort((a, b) => b.spend - a.spend);
    const top5 = campaigns.slice(0, 5);
    const labels = top5.map(c => c.name.length > 25 ? c.name.substring(0, 25) + "..." : c.name);
    
    const ctx = document.getElementById('chart-ads-upload');
    if (window.myAdsChart instanceof Chart) { window.myAdsChart.destroy(); }

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
                    label: 'Kết quả',
                    data: top5.map(c => c.result),
                    backgroundColor: '#1a73e8',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', display: true, position: 'left' },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
}

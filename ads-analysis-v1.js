/**
 * ADS ANALYSIS MODULE
 * Chuyên đọc file CSV/Excel từ Facebook Ads
 */

function initAdsAnalysis() {
    // Kiểm tra xem đã gắn sự kiện chưa để tránh gắn lặp lại
    const inputElement = document.getElementById('ads-file-input');
    if (inputElement && !inputElement.hasAttribute('data-listening')) {
        inputElement.addEventListener('change', handleAdsFile);
        inputElement.setAttribute('data-listening', 'true');
        console.log("Ads Analysis Module Loaded");
    }
}

function handleAdsFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Chuyển Sheet thành JSON (mảng 2 chiều)
        const json = XLSX.utils.sheet_to_json(sheet, {header:1});
        analyzeAdsData(json);
    };
    reader.readAsArrayBuffer(file);
}

function analyzeAdsData(rows) {
    if (rows.length < 2) return alert("File không có dữ liệu!");

    // 1. TÌM CỘT DỮ LIỆU (Tự động nhận diện tiêu đề tiếng Việt trong file bạn gửi)
    // File bạn gửi có dòng tiêu đề ở hàng đầu tiên
    const header = rows[0].map(x => x ? x.toString().toLowerCase().trim() : "");
    
    // Mapping các từ khóa có thể xuất hiện trong file CSV Facebook
    const colSpendIdx = header.findIndex(h => h.includes("số tiền đã chi tiêu") || h.includes("amount spent"));
    const colResultIdx = header.findIndex(h => h === "kết quả" || h === "results"); // Tìm chính xác chữ "Kết quả"
    const colCampIdx = header.findIndex(h => h.includes("tên chiến dịch") || h.includes("campaign name"));

    if (colSpendIdx === -1) return alert("Lỗi: Không tìm thấy cột 'Số tiền đã chi tiêu' trong file!");

    // 2. TỔNG HỢP DỮ LIỆU
    let totalSpend = 0;
    let totalResults = 0;
    let campaigns = [];

    // Bắt đầu duyệt từ dòng thứ 2 (bỏ dòng tiêu đề)
    for (let i = 1; i < rows.length; i++) {
        let r = rows[i];
        if (!r || r.length === 0) continue;

        // Ép kiểu dữ liệu (Xử lý số tiền có thể dính chữ hoặc dấu phẩy)
        let spend = parseFloat(r[colSpendIdx]) || 0; 
        let result = parseFloat(r[colResultIdx]) || 0;
        let name = r[colCampIdx] || "Chiến dịch " + i;

        // Chỉ lấy những chiến dịch có tiêu tiền
        if (spend > 0) {
            totalSpend += spend;
            totalResults += result;
            campaigns.push({ name: name, spend: spend, result: result });
        }
    }

    // 3. HIỂN THỊ KẾT QUẢ (DOM Manipulation)
    document.getElementById('ads-analysis-result').style.display = 'block';
    
    // Format tiền tệ VNĐ
    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    
    document.getElementById('metric-spend').innerText = fmt(totalSpend);
    document.getElementById('metric-results').innerText = totalResults;
    // CPL = Cost Per Result
    document.getElementById('metric-cpl').innerText = totalResults > 0 ? fmt(totalSpend / totalResults) : "0 ₫";
    
    // 4. VẼ BIỂU ĐỒ (Top 5 Chiến dịch tiêu nhiều tiền nhất)
    renderAdsChart(campaigns);
}

function renderAdsChart(campaigns) {
    // Sắp xếp giảm dần theo tiền tiêu
    campaigns.sort((a, b) => b.spend - a.spend);
    
    // Lấy Top 5
    const top5 = campaigns.slice(0, 5);
    const labels = top5.map(c => c.name.length > 25 ? c.name.substring(0, 25) + "..." : c.name);
    const dataSpend = top5.map(c => c.spend);
    const dataResult = top5.map(c => c.result);

    const ctx = document.getElementById('chart-ads-upload');
    
    // Hủy biểu đồ cũ nếu có để vẽ cái mới
    if (window.myAdsChart instanceof Chart) {
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
                    backgroundColor: 'rgba(217, 48, 37, 0.8)', // Màu đỏ Google
                    borderColor: '#d93025',
                    borderWidth: 1,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Kết quả (Số lượng)',
                    data: dataResult,
                    type: 'line', // Vẽ đường line đè lên cột
                    borderColor: '#1a73e8', // Màu xanh Google
                    backgroundColor: '#1a73e8',
                    borderWidth: 3,
                    pointRadius: 5,
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'TOP 5 CHIẾN DỊCH TIÊU BIỂU' }
            },
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
                    title: { display: true, text: 'Kết quả' }
                }
            }
        }
    });
}

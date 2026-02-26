// ==========================================
// MODULE: BÓC TÁCH DỮ LIỆU ĐƠN HÀNG TỪ FILE PDF SHOPEE
// ==========================================

// Khởi tạo worker cho thư viện PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

window.processShopeeBill = async function(event) {
    const file = event.target.files[0];
    if (!file || file.type !== "application/pdf") {
        window.showToast("Vui lòng chọn file PDF!");
        return;
    }

    // Đổi giao diện trạng thái đang load
    const resultContainer = document.getElementById('bill-result-container');
    const outputArea = document.getElementById('bill-output-text');
    if(resultContainer) resultContainer.style.display = 'block';
    if(outputArea) outputArea.value = "⏳ Đang bóc tách dữ liệu từ PDF, vui lòng đợi...";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = "";
        
        // Đọc từng trang PDF
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // Lấy toàn bộ text và nối lại với nhau bằng dấu xuống dòng
            const pageStrings = textContent.items.map(item => item.str.trim()).filter(str => str.length > 0);
            fullText += pageStrings.join('\n') + "\n";
        }

        // BÓC TÁCH DỮ LIỆU
        let mvd = "";
        let nvc = "Khác";
        let kh = "";
        let dc = "";
        let products = [];

        // 1. Tìm Mã Vận Đơn
        const mvdMatch = fullText.match(/Mã vận đơn:\s*([A-Z0-9]+)/i);
        if (mvdMatch) mvd = mvdMatch[1];

        // 2. Đơn vị vận chuyển
        if (fullText.includes("SPX")) nvc = "Shopee Express";
        else if (fullText.includes("GiaoHangNhanh") || fullText.includes("GHN")) nvc = "GHN";

        // 3. Tên Khách hàng & Địa chỉ (Thường nằm sau chữ "Đến:")
        const lines = fullText.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("Đến:")) {
                kh = lines[i + 1] ? lines[i + 1].trim() : "";
                dc = lines[i + 2] ? lines[i + 2].trim() : "";
                break;
            }
        }

        // 4. Tìm Sản phẩm (Các dòng bắt đầu bằng "1. ", "2. ", v.v.)
        const productRegex = /^(\d+\.\s+.*)/;
        lines.forEach(line => {
            if (productRegex.test(line)) {
                products.push(line);
            }
        });

        // 5. Ráp chuỗi hiển thị
        let finalOutput = `MVĐ: ${mvd}\nKhách hàng: ${kh}\nĐịa chỉ: ${dc}\nĐịa chỉ mới: \n`;
        products.forEach(p => finalOutput += `${p}\n`);
        finalOutput += `NVC: ${nvc}\nĐơn hàng Shopee`;

        // Trả kết quả ra textarea
        if(outputArea) outputArea.value = finalOutput;
        
        // Reset file input để có thể up lại đúng file đó nếu muốn
        event.target.value = '';

    } catch (error) {
        console.error("Lỗi đọc PDF:", error);
        if(outputArea) outputArea.value = "❌ Lỗi không thể đọc được file PDF này. Bạn kiểm tra lại file nhé.";
    }
};

window.copyBillText = function() {
    const outputArea = document.getElementById('bill-output-text');
    if(!outputArea) return;
    
    outputArea.select();
    outputArea.setSelectionRange(0, 99999); // Cho thiết bị di động
    document.execCommand("copy");
    window.showToast("Đã copy nội dung soạn đơn!");
};

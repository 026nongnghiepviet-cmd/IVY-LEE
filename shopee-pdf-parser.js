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

    const resultContainer = document.getElementById('bill-result-container');
    const outputArea = document.getElementById('bill-output-text');
    if(resultContainer) resultContainer.style.display = 'block';
    if(outputArea) outputArea.value = "⏳ Đang quét và sắp xếp dữ liệu từ Bill, vui lòng đợi...";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let lines = [];
        
        // Đọc và sắp xếp lại text theo tọa độ (Trên xuống dưới)
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let items = textContent.items;
            items.sort((a, b) => {
                // Sắp xếp theo chiều dọc (Y)
                if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
                    return b.transform[5] - a.transform[5];
                }
                // Nếu cùng dòng thì sắp xếp theo chiều ngang (X)
                return a.transform[4] - b.transform[4];
            });

            // Lọc bỏ khoảng trắng thừa
            const pageStrings = items.map(item => item.str.trim()).filter(str => str !== "");
            lines = lines.concat(pageStrings);
        }

        let mvd = "";
        let nvc = "Shopee Express"; 
        let kh = "";
        let dc = "";
        let products = [];

        let fullText = lines.join(' ');

        // 1. Tìm Mã Vận Đơn
        const mvdMatch = fullText.match(/Mã vận đơn:\s*([A-Z0-9]+)/i);
        if (mvdMatch) mvd = mvdMatch[1];
        else {
            let mvdIdx = lines.findIndex(l => l.includes("Mã vận đơn"));
            if(mvdIdx !== -1 && lines[mvdIdx+1]) mvd = lines[mvdIdx+1].replace(":", "").trim();
        }

        // 2. NVC
        if (fullText.includes("GiaoHangNhanh") || fullText.includes("GHN")) nvc = "GHN";
        else if (fullText.includes("Viettel")) nvc = "Viettel Post";
        else if (fullText.includes("J&T")) nvc = "J&T Express";

        // 3. Khách hàng & Địa chỉ
        let denIdx = lines.findIndex(l => l === "Đến:" || l === "Đến");
        if (denIdx !== -1) {
            kh = lines[denIdx + 1]; // Dòng ngay sát dưới "Đến:" là tên KH
            
            let dcArray = [];
            for (let i = denIdx + 2; i < lines.length; i++) {
                let l = lines[i];
                // Điều kiện dừng: Gặp chữ "Nội dung", hoặc các mã trạm của Shopee (VD: CT-80-05-TN02), hoặc tiền thu
                if (l.includes("Nội dung hàng") || l.match(/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/i) || l.includes("Tiền thu")) {
                    break;
                }
                dcArray.push(l);
            }
            dc = dcArray.join(" ").replace(/\s{2,}/g, ' '); // Gộp các dòng địa chỉ lại
        }

        // 4. Sản phẩm
        let ndhIdx = lines.findIndex(l => l.includes("Nội dung hàng"));
        if (ndhIdx !== -1) {
            let currentProd = "";
            for (let i = ndhIdx + 1; i < lines.length; i++) {
                let l = lines[i];
                
                // Dừng đọc sản phẩm khi gặp footer của bill
                if (l.includes("Người gửi phải cam kết") || l.includes("Tiền thu") || l.includes("Chỉ dẫn giao hàng")) {
                    if (currentProd) products.push(currentProd);
                    break;
                }
                
                // Bỏ qua các mã trạm phân loại rác bị chèn giữa bill (VD: CAN-02, Thị Trấn)
                if (l.match(/^[A-Z\s-]+-\d+$/) || (l.includes("Thị Trấn") && currentProd === "")) continue;
                
                // Nếu thấy dòng bắt đầu bằng "1. ", "2. " => Đây là sản phẩm
                if (l.match(/^\d+\.\s/)) {
                    if (currentProd) products.push(currentProd);
                    currentProd = l;
                } else {
                    // Nếu là đoạn cắt dở thì nối vào sản phẩm trước đó
                    if (currentProd) {
                        // Vá lỗi PDF cắt chữ giữa chừng (vd: "kan t" + "oàn")
                        if(currentProd.endsWith("t") && l.startsWith("oàn")) {
                            currentProd += l;
                        } else {
                            currentProd += " " + l;
                        }
                    }
                }
            }
            // Đẩy sản phẩm cuối cùng vào mảng
            if (currentProd && !products.includes(currentProd)) products.push(currentProd);
        }

        // 5. Chuẩn hóa & Ráp chuỗi
        kh = kh ? kh : "(Không đọc được Tên)";
        dc = dc ? dc : "(Không đọc được Địa chỉ)";
        mvd = mvd ? mvd : "(Không đọc được MVĐ)";

        let finalOutput = `MVĐ: ${mvd}\nKhách hàng: ${kh}\nĐịa chỉ: ${dc}\nĐịa chỉ mới: \n`;
        if (products.length > 0) {
            products.forEach(p => {
                // Xóa dấu phẩy đôi do file rác sinh ra
                let cleanProd = p.replace(/,,/g, ',').replace(/\s{2,}/g, ' ');
                finalOutput += `${cleanProd}\n`;
            });
        } else {
            finalOutput += `(Không tìm thấy dòng sản phẩm nào)\n`;
        }
        finalOutput += `NVC: ${nvc}\nĐơn hàng Shopee`;

        // Đổ ra màn hình
        if(outputArea) outputArea.value = finalOutput;
        event.target.value = '';

    } catch (error) {
        console.error("Lỗi:", error);
        if(outputArea) outputArea.value = "❌ Không thể đọc file PDF. Lỗi: " + error.message;
    }
};

window.copyBillText = function() {
    const outputArea = document.getElementById('bill-output-text');
    if(!outputArea) return;
    
    outputArea.select();
    outputArea.setSelectionRange(0, 99999); 
    document.execCommand("copy");
    window.showToast("Đã copy nội dung soạn đơn!");
};

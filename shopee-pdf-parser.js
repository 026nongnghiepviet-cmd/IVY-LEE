(function() {
    // Gọi thư viện PDF.js (đã chèn sẵn trong HTML)
    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 700; font-size: 13px; color: #5f6368;">Tải lên file PDF đơn hàng Shopee:</label>
                <input type="file" id="shopee-pdf-file" accept="application/pdf" style="margin-top: 8px; padding: 10px; border: 2px dashed #ee4d2d; border-radius: 8px; width: 100%; background: #fffcfc; cursor: pointer;" />
            </div>
            
            <button id="btn-process-pdf" class="btn btn-save" style="background-color: #ee4d2d; box-shadow: 0 4px 10px rgba(238,77,45,0.2); margin-bottom: 20px;">
                ⚡ TRÍCH XUẤT ĐƠN HÀNG SIÊU TỐC
            </button>
            
            <div style="position: relative;">
                <label style="font-weight: 700; font-size: 13px; color: #5f6368;">Kết quả Soạn Đơn:</label>
                <textarea id="shopee-output-result" rows="9" style="width: 100%; border: 1px solid #dadce0; border-radius: 8px; padding: 12px; margin-top: 8px; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 14px; background: #fff; line-height: 1.5;" placeholder="Dữ liệu sẽ hiển thị tại đây..."></textarea>
                <button id="btn-copy-result" class="btn" style="position: absolute; bottom: 10px; right: 10px; background-color: #1a73e8; color: white; padding: 6px 12px; font-size: 12px; display: none; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">📋 Copy</button>
            </div>
        `;

        document.getElementById('btn-process-pdf').addEventListener('click', processShopeePDF);
        document.getElementById('btn-copy-result').addEventListener('click', copyResult);
    }

    async function processShopeePDF() {
        const fileInput = document.getElementById('shopee-pdf-file');
        const outputField = document.getElementById('shopee-output-result');
        const btnProcess = document.getElementById('btn-process-pdf');
        const btnCopy = document.getElementById('btn-copy-result');

        if (!fileInput.files.length) {
            alert("Vui lòng chọn file PDF bill Shopee!");
            return;
        }

        const file = fileInput.files[0];
        outputField.value = "⏳ Đang bóc tách dữ liệu đơn hàng...";
        btnProcess.disabled = true;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // Sắp xếp text theo tọa độ để không bị đảo lộn thứ tự dòng
                const items = textContent.items;
                items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
                fullText += items.map(item => item.str).join(" ") + "\n";
            }

            // --- TRÍCH XUẤT DỮ LIỆU DỰA TRÊN FILE MẪU ---
            
            // 1. Mã vận đơn
            let mvdMatch = fullText.match(/Mã vận đơn[:\s]*([A-Z0-9]+)/i);
            let mvd = mvdMatch ? mvdMatch[1] : "Không tìm thấy mã";

            // 2. Tên khách hàng (Nằm ngay sau "Đến:")
            let khachHang = "Không tìm thấy tên";
            let denIndex = fullText.indexOf("Đến:");
            if (denIndex !== -1) {
                let afterDen = fullText.substring(denIndex + 4).trim();
                let lines = afterDen.split("\n").map(l => l.trim()).filter(l => l !== "");
                khachHang = lines[0];
            }

            // 3. Địa chỉ (Nằm sau tên khách hàng, trước mã bưu cục hoặc Nội dung hàng)
            let diaChi = "Không tìm thấy địa chỉ";
            let addrMatch = fullText.match(/Đến:\s*.*?\n([\s\S]*?)(?=\n\d{3}-|Nội dung hàng)/i);
            if (addrMatch) {
                diaChi = addrMatch[1].replace(/\n/g, ", ").replace(/\s+/g, " ").trim();
            }

            // 4. Tên sản phẩm (Lấy sau "1.")
            let tenSP = "Không tìm thấy SP";
            let spMatch = fullText.match(/1\.\s*([^|]+)/i);
            if (spMatch) {
                tenSP = spMatch[1].trim();
            }

            // 5. Đơn vị vận chuyển
            let nvc = "GiaoHangNhanh"; // Theo file mẫu 
            if (fullText.includes("SPX")) nvc = "SPX Express";
            else if (fullText.includes("Viettel")) nvc = "Viettel Post";

            let result = `MVĐ: ${mvd}\nKhách hàng: ${khachHang}\nĐịa chỉ: ${diaChi}\nĐịa chỉ mới: \nTên sản phẩm: ${tenSP}\nNVC: ${nvc}\nĐơn hàng Shopee`;

            outputField.value = result;
            btnCopy.style.display = 'inline-block';

        } catch (error) {
            outputField.value = "⚠️ Lỗi: " + error.message;
        } finally {
            btnProcess.disabled = false;
            btnProcess.innerText = "⚡ TRÍCH XUẤT ĐƠN HÀNG SIÊU TỐC";
        }
    }

    function copyResult() {
        const outputField = document.getElementById('shopee-output-result');
        outputField.select();
        document.execCommand('copy');
        alert("Đã copy thông tin đơn hàng!");
    }

    // Khởi tạo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
    window.initShopeeParser = renderShopeeToolUI;
})();

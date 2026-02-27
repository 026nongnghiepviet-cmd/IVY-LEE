(function() {
    // Gọi thư viện PDF.js (đã được bạn chèn sẵn trong file HTML)
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
                ⚡ TRÍCH XUẤT ĐƠN HÀNG (OFFLINE)
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

        if (!pdfjsLib) {
            alert("Hệ thống chưa tải xong thư viện PDF. Vui lòng F5 lại trang web!");
            return;
        }

        const file = fileInput.files[0];
        outputField.value = "⏳ Đang trích xuất dữ liệu siêu tốc trên máy của bạn...";
        btnProcess.disabled = true;
        btnProcess.innerText = "⏳ ĐANG XỬ LÝ...";
        btnProcess.style.backgroundColor = "#ccc";
        btnCopy.style.display = 'none';

        try {
            // Chuyển file PDF thành dạng Array Buffer để đọc
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            
            // Lấy toàn bộ chữ trong PDF
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Sắp xếp text theo tọa độ Y (từ trên xuống) để câu chữ không bị đảo lộn
                textContent.items.sort((a, b) => b.transform[5] - a.transform[5]);
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + ' ';
            }

            // Dùng biểu thức chính quy (Regex) để bóc tách thông tin từ chuỗi
            let mvd = fullText.match(/Mã vận đơn:\s*([A-Z0-9]+)/i)?.[1] || "Không lấy được mã";
            
            let nvc = "Shopee Express"; // Mặc định
            if (fullText.match(/GiaoHangNhanh|GHN/i)) nvc = "GiaoHangNhanh";
            else if (fullText.match(/Viettel Post/i)) nvc = "Viettel Post";
            else if (fullText.match(/J&T Express/i)) nvc = "J&T Express";
            else if (fullText.match(/Ninja Van/i)) nvc = "Ninja Van";
            else if (fullText.match(/BEST Express/i)) nvc = "BEST Express";

            // Cắt phần Tên và Địa chỉ (Từ chữ 'Đến:' cho tới khi gặp mã kho trạm hoặc 'Nội dung hàng')
            let customerRaw = fullText.match(/Đến:\s*(.*?)(?=\s*\d{3}-[A-Z]-\d+|\s*Nội dung hàng|\s*Tổng SL)/is)?.[1] || "";
            // Heuristic: Tên khách hàng hiếm khi chứa chữ 'Xã', 'Huyện', 'Phường'
            let khachHang = "Tên Khách Hàng";
            let diaChi = customerRaw;
            
            let nameSplit = customerRaw.match(/(.*?)(Xã|Phường|Quận|Huyện|Thành Phố|Tỉnh|Ấp|Khu|Tổ)/i);
            if(nameSplit) {
                // Tách đoạn đầu ra làm tên, loại bỏ các cụm thừa
                let rawName = nameSplit[1].trim();
                let parts = rawName.split(/[,.-]/);
                khachHang = parts[0].trim();
                diaChi = customerRaw.replace(khachHang, '').replace(/^[,-\s]+/, '').trim();
            }

            // Cắt phần tên sản phẩm (Lấy text đằng sau mục '1.')
            let productRaw = fullText.match(/Nội dung hàng.*?(?:1\.\s*)(.*?)(?=\s*SL:|\s*Ngày đặt hàng)/is)?.[1] || "Không lấy được SP";
            let tenSP = productRaw.split('|')[0].trim(); // Cắt bỏ các phân loại phía sau dấu |

            // Gom lại thành Form chuẩn của bạn
            let finalResult = `MVĐ: ${mvd}\nKhách hàng: ${khachHang}\nĐịa chỉ: ${diaChi}\nĐịa chỉ mới: \nTên sản phẩm: ${tenSP}\nNVC: ${nvc}\nĐơn hàng Shopee`;

            outputField.value = finalResult;
            btnCopy.style.display = 'inline-block';

        } catch (error) {
            console.error(error);
            outputField.value = "⚠️ Lỗi đọc file PDF: " + error.message;
        } finally {
            btnProcess.disabled = false;
            btnProcess.innerText = "⚡ TRÍCH XUẤT ĐƠN HÀNG (OFFLINE)";
            btnProcess.style.backgroundColor = "#ee4d2d";
            fileInput.value = ""; 
        }
    }

    function copyResult() {
        const outputField = document.getElementById('shopee-output-result');
        outputField.select();
        document.execCommand('copy');
        
        const btnCopy = document.getElementById('btn-copy-result');
        btnCopy.innerText = "✔ Đã Copy";
        setTimeout(() => { btnCopy.innerText = "📋 Copy"; }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
    
    window.initShopeeParser = renderShopeeToolUI;

})();

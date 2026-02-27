(function() {
    // THAY LINK WEB APP GAS CỦA BẠN VÀO ĐÂY (Link sau khi Deploy bản mới nhất có Drive API)
    const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbzFzf5iXBB9b5KTWBKzxcrVU5r1dKxL5fWms8WZuL7M-LpwJyXTCcrrKkJ6sI7dy0dsMg/exec";

    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 700; font-size: 13px; color: #5f6368;">Tải lên file PDF đơn hàng Shopee:</label>
                <input type="file" id="shopee-pdf-file" accept="application/pdf" style="margin-top: 8px; padding: 10px; border: 2px dashed #ee4d2d; border-radius: 8px; width: 100%; background: #fffcfc; cursor: pointer;" />
            </div>
            
            <button id="btn-process-pdf" class="btn btn-save" style="background-color: #ee4d2d; box-shadow: 0 4px 10px rgba(238,77,45,0.2); margin-bottom: 20px;">
                🚀 OCR: ĐỌC ĐƠN HÀNG SIÊU CHÍNH XÁC
            </button>
            
            <div style="position: relative;">
                <label style="font-weight: 700; font-size: 13px; color: #5f6368;">Kết quả Soạn Đơn:</label>
                <textarea id="shopee-output-result" rows="9" style="width: 100%; border: 1px solid #dadce0; border-radius: 8px; padding: 12px; margin-top: 8px; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 14px; background: #fff; line-height: 1.5;" placeholder="Dữ liệu được quét bởi Google OCR sẽ hiển thị tại đây..."></textarea>
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

        if (GAS_PROXY_URL.includes("THAY_LINK")) {
            alert("Vui lòng dán link Web App Apps Script vào biến GAS_PROXY_URL trong code JS!");
            return;
        }

        if (!fileInput.files.length) {
            alert("Hãy chọn file PDF đơn hàng nhé!");
            return;
        }

        const file = fileInput.files[0];
        outputField.value = "⏳ Đang gửi file lên Google OCR để quét chữ, vui lòng đợi...";
        btnProcess.disabled = true;
        btnProcess.innerText = "⏳ ĐANG QUÉT...";
        btnCopy.style.display = 'none';

        try {
            const base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(file);
            });

            // Gửi dữ liệu lên GAS để xử lý OCR
            const response = await fetch(GAS_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ base64Data: base64Data })
            });

            const resultJson = await response.json();

            if (resultJson.success) {
                outputField.value = resultJson.text;
                btnCopy.style.display = 'inline-block';
            } else {
                throw new Error(resultJson.error || "Lỗi không xác định từ máy chủ");
            }

        } catch (error) {
            console.error(error);
            outputField.value = "⚠️ Lỗi: " + error.message;
        } finally {
            btnProcess.disabled = false;
            btnProcess.innerText = "🚀 OCR: ĐỌC ĐƠN HÀNG SIÊU CHÍNH XÁC";
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

    // Khởi tạo giao diện
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
    
    window.initShopeeParser = renderShopeeToolUI;

})();

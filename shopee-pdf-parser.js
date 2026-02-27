(function() {
    // Link Web App GAS của anh (Giữ nguyên link cũ đã có OCR)
    const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbzFzf5iXBB9b5KTWBKzxcrVU5r1dKxL5fWms8WZuL7M-LpwJyXTCcrrKkJ6sI7dy0dsMg/exec";

    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 700; font-size: 13px; color: #5f6368;">Tải lên các file PDF đơn hàng (Có thể chọn nhiều file):</label>
                <input type="file" id="shopee-pdf-file" accept="application/pdf" multiple style="margin-top: 8px; padding: 15px; border: 2px dashed #ee4d2d; border-radius: 8px; width: 100%; background: #fffcfc; cursor: pointer;" />
            </div>
            
            <button id="btn-process-pdf" class="btn btn-save" style="background-color: #ee4d2d; box-shadow: 0 4px 10px rgba(238,77,45,0.2); margin-bottom: 20px; width: 100%;">
                🚀 OCR: ĐỌC TẤT CẢ ĐƠN HÀNG
            </button>
            
            <div style="position: relative;">
                <label style="font-weight: 700; font-size: 13px; color: #5f6368;">Kết quả Soạn Đơn:</label>
                <textarea id="shopee-output-result" style="width: 100%; min-height: 200px; border: 2px solid #dadce0; border-radius: 8px; padding: 15px; margin-top: 8px; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 14px; background: #fff; line-height: 1.6; overflow-y: hidden; resize: none;" placeholder="Dữ liệu sẽ hiển thị đầy đủ tại đây..." readonly></textarea>
                <button id="btn-copy-result" class="btn" style="position: absolute; top: 40px; right: 10px; background-color: #1a73e8; color: white; padding: 6px 12px; font-size: 12px; display: none; z-index: 10;">📋 Copy Tất Cả</button>
            </div>
        `;

        document.getElementById('btn-process-pdf').addEventListener('click', processMultiplePDFs);
        document.getElementById('btn-copy-result').addEventListener('click', copyResult);
    }

    // Tự động giãn nở chiều cao textarea
    function autoResizeTextArea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight + 20) + 'px';
    }

    async function processMultiplePDFs() {
        const fileInput = document.getElementById('shopee-pdf-file');
        const outputField = document.getElementById('shopee-output-result');
        const btnProcess = document.getElementById('btn-process-pdf');
        const btnCopy = document.getElementById('btn-copy-result');

        if (!fileInput.files.length) {
            alert("Vui lòng chọn ít nhất một file PDF!");
            return;
        }

        const files = Array.from(fileInput.files);
        outputField.value = `⏳ Đang xử lý ${files.length} file, vui lòng đợi...`;
        btnProcess.disabled = true;
        btnCopy.style.display = 'none';
        
        let allResults = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            outputField.value = `⏳ [${i + 1}/${files.length}] Đang quét file: ${file.name}...`;
            
            try {
                const base64Data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });

                const response = await fetch(GAS_PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ base64Data: base64Data })
                });

                const resultJson = await response.json();
                if (resultJson.success) {
                    allResults.push(resultJson.text);
                } else {
                    allResults.push(`⚠️ Lỗi file ${file.name}: ${resultJson.error}`);
                }
            } catch (error) {
                allResults.push(`⚠️ Lỗi kết nối file ${file.name}`);
            }
            
            // Cập nhật kết quả tạm thời để người dùng thấy tiến độ
            outputField.value = allResults.join("\n\n--------------------------\n\n");
            autoResizeTextArea(outputField);
        }

        btnProcess.disabled = false;
        btnProcess.innerText = "🚀 OCR: ĐỌC XONG " + files.length + " ĐƠN";
        btnCopy.style.display = 'block';
        fileInput.value = ""; 
    }

    function copyResult() {
        const outputField = document.getElementById('shopee-output-result');
        outputField.select();
        document.execCommand('copy');
        
        const btnCopy = document.getElementById('btn-copy-result');
        btnCopy.innerText = "✔ Đã Copy Tất Cả";
        setTimeout(() => { btnCopy.innerText = "📋 Copy Tất Cả"; }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
    
    window.initShopeeParser = renderShopeeToolUI;
})();

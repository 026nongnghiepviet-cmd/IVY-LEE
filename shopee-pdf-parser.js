(function() {
    const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbzFzf5iXBB9b5KTWBKzxcrVU5r1dKxL5fWms8WZuL7M-LpwJyXTCcrrKkJ6sI7dy0dsMg/exec";

    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        container.innerHTML = `
            <div style="margin-bottom: 20px; border: 1px solid #ee4d2d; padding: 15px; border-radius: 8px; background: #fff5f2;">
                <label style="font-weight: 700; color: #ee4d2d;">TẢI LÊN FILE PDF (CHỌN NHIỀU FILE):</label>
                <input type="file" id="shopee-pdf-file" accept="application/pdf" multiple style="display: block; margin-top: 10px; width: 100%;" />
            </div>
            
            <button id="btn-process-pdf" class="btn btn-save" style="background-color: #ee4d2d; width: 100%; height: 50px; font-weight: bold; margin-bottom: 20px;">
                🚀 BẮT ĐẦU QUÉT OCR TẤT CẢ ĐƠN
            </button>
            
            <div id="status-progress" style="margin-bottom: 10px; font-weight: bold; color: #1a73e8;"></div>

            <div style="position: relative;">
                <textarea id="shopee-output-result" style="width: 100%; min-height: 300px; border: 2px solid #ee4d2d; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 13px; line-height: 1.6; resize: vertical;" placeholder="Kết quả sẽ hiển thị tại đây..." readonly></textarea>
                <button id="btn-copy-result" class="btn" style="position: absolute; top: 10px; right: 10px; background: #1a73e8; color: white; display: none;">📋 Copy</button>
            </div>
        `;

        document.getElementById('btn-process-pdf').addEventListener('click', processFiles);
        document.getElementById('btn-copy-result').addEventListener('click', () => {
            const out = document.getElementById('shopee-output-result');
            out.select();
            document.execCommand('copy');
            alert("Đã copy toàn bộ kết quả!");
        });
    }

    async function processFiles() {
        const input = document.getElementById('shopee-pdf-file');
        const output = document.getElementById('shopee-output-result');
        const status = document.getElementById('status-progress');
        const btn = document.getElementById('btn-process-pdf');

        if (!input.files.length) return alert("Chưa chọn file!");
        
        btn.disabled = true;
        btn.innerText = "⌛ ĐANG XỬ LÝ...";
        output.value = "";
        let finalOutput = "";

        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            status.innerText = ` đang quét file (${i+1}/${input.files.length}): ${file.name}`;
            
            try {
                const base64 = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onload = () => r(reader.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });

                const resp = await fetch(GAS_PROXY_URL, {
                    method: 'POST',
                    body: JSON.stringify({ base64Data: base64 })
                });
                const res = await resp.json();

                if (res.success) {
                    finalOutput += `--- ĐƠN ${i+1} ---\n${res.text}\n\n`;
                } else {
                    finalOutput += `--- ĐƠN ${i+1} (LỖI) ---\nFile: ${file.name}\nLỗi: ${res.error}\n\n`;
                }
            } catch (e) {
                finalOutput += `--- ĐƠN ${i+1} (LỖI KẾT NỐI) ---\nFile: ${file.name}\n\n`;
            }
            output.value = finalOutput;
            output.scrollTop = output.scrollHeight;
        }

        status.innerText = "✅ Đã hoàn thành tất cả đơn hàng!";
        btn.disabled = false;
        btn.innerText = "🚀 BẮT ĐẦU QUÉT OCR TẤT CẢ ĐƠN";
        document.getElementById('btn-copy-result').style.display = "block";
    }

    renderShopeeToolUI();
})();

(function() {
    // LINK WEB APP GAS
    const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbzFzf5iXBB9b5KTWBKzxcrVU5r1dKxL5fWms8WZuL7M-LpwJyXTCcrrKkJ6sI7dy0dsMg/exec";

    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        container.innerHTML = `
            <style>
                /* Mở rộng không gian 2 bên, fix lỗi font */
                .nnv-wrapper { font-family: 'Segoe UI', Arial, sans-serif; max-width: 100%; padding: 0 15px; margin: 0 auto; color: #333; }
                
                /* Vùng Upload: Canh giữa, thu nhỏ gọn gàng */
                .nnv-upload-box { border: 2px dashed #ee4d2d; border-radius: 12px; padding: 20px 15px; text-align: center; background: #fffaf9; cursor: pointer; transition: 0.2s; margin: 0 auto 20px auto; max-width: 700px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .nnv-upload-box:hover { background: #feebe7; border-color: #d73a1e; }
                .nnv-upload-icon { font-size: 32px; margin-bottom: 5px; line-height: 1; }
                .nnv-upload-title { color: #ee4d2d; font-size: 17px; font-weight: bold; margin: 0 0 5px 0; letter-spacing: 0.5px; }
                .nnv-upload-desc { color: #555; font-size: 13px; margin: 0 0 10px 0; }
                .nnv-file-input { display: none; }
                .nnv-file-count { display: inline-block; padding: 6px 20px; background: #1a73e8; color: white; border-radius: 20px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 5px rgba(26,115,232,0.3); margin-top: 5px; }
                
                /* Nút xử lý chính: Thu nhỏ, vừa mắt, nằm giữa */
                .nnv-btn { background: #ee4d2d; color: white; border: none; padding: 12px 20px; width: 100%; max-width: 400px; font-size: 15px; font-weight: bold; border-radius: 8px; cursor: pointer; transition: 0.3s; margin: 0 auto 20px auto; display: block; text-transform: uppercase; box-shadow: 0 4px 8px rgba(238,77,45,0.25); }
                .nnv-btn:hover:not(:disabled) { background: #d73a1e; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(238,77,45,0.35); }
                .nnv-btn:disabled { background: #fca08d; cursor: not-allowed; transform: none; box-shadow: none; }
                
                /* BẢNG GRID 4 CỘT TRÀN MÀN HÌNH */
                .nnv-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px; }
                @media (max-width: 1400px) { .nnv-grid { grid-template-columns: repeat(3, 1fr); } }
                @media (max-width: 1024px) { .nnv-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 768px) { .nnv-grid { grid-template-columns: 1fr; gap: 15px; } }
                
                /* Ô hiển thị 1 đơn hàng (Card) */
                .nnv-card { border: 2px solid #ddd; border-radius: 10px; background: #fff; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: 0.3s; display: flex; flex-direction: column; }
                .nnv-card:hover { border-color: #ee4d2d; box-shadow: 0 6px 18px rgba(238,77,45,0.12); }
                .nnv-card-header { background: #f8f9fa; padding: 10px 15px; border-bottom: 2px solid #eee; display: flex; justify-content: space-between; align-items: center; }
                .nnv-card-title { font-weight: bold; font-size: 15px; color: #1a73e8; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }
                .nnv-card-status { font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 20px; background: #ffebee; color: #d32f2f; }
                .nnv-card-status.success { background: #e6f4ea; color: #1e8e3e; }
                
                /* Textarea chỉnh sửa trực tiếp - FONT CHUẨN ĐỂ KHÔNG BỊ LỖI */
                .nnv-textarea { width: 100%; height: 300px; padding: 15px; border: none; resize: vertical; font-family: Consolas, 'Courier New', monospace; font-size: 14px; line-height: 1.6; color: #111; background: #fafbfc; box-sizing: border-box; }
                .nnv-textarea:focus { outline: none; background: #fff; box-shadow: inset 0 0 0 2px #ee4d2d; }
                
                /* Dòng thông báo trạng thái */
                .nnv-main-status { text-align: center; font-size: 15px; font-weight: bold; color: #ee4d2d; margin-bottom: 15px; min-height: 22px; }
                
                /* Nút Copy All */
                .nnv-btn-copy { background: #1a73e8; display: none; margin-top: 5px; max-width: 400px; }
                .nnv-btn-copy:hover { background: #1557b0; }
            </style>
            
            <div class="nnv-wrapper">
                <div class="nnv-upload-box" id="nnv-upload-trigger">
                    <div class="nnv-upload-icon">📤</div>
                    <h2 class="nnv-upload-title">TẢI LÊN FILE SOẠN ĐƠN</h2>
                    <p class="nnv-upload-desc">Hỗ trợ chọn nhiều file PDF cùng lúc (SPX & GHN)</p>
                    <span class="nnv-file-count" id="nnv-file-count" style="display: none;">Chưa chọn file</span>
                    <input type="file" id="nnv-file-input" class="nnv-file-input" accept="application/pdf" multiple />
                </div>
                
                <button id="nnv-btn-process" class="nnv-btn">🚀 TRÍCH XUẤT ĐƠN HÀNG</button>
                
                <div id="nnv-main-status" class="nnv-main-status"></div>

                <div id="nnv-grid-result" class="nnv-grid"></div>
                
                <button id="nnv-btn-copy" class="nnv-btn nnv-btn-copy">📋 COPY TOÀN BỘ DỮ LIỆU</button>
            </div>
        `;

        document.getElementById('nnv-upload-trigger').addEventListener('click', () => {
            document.getElementById('nnv-file-input').click();
        });

        document.getElementById('nnv-file-input').addEventListener('change', function() {
            const countLabel = document.getElementById('nnv-file-count');
            if (this.files.length > 0) {
                countLabel.style.display = "inline-block";
                countLabel.innerText = `Đã chọn ${this.files.length} file PDF`;
                document.getElementById('nnv-grid-result').innerHTML = ""; 
                document.getElementById('nnv-btn-copy').style.display = "none";
                document.getElementById('nnv-main-status').innerText = "";
            } else {
                countLabel.style.display = "none";
            }
        });

        document.getElementById('nnv-btn-process').addEventListener('click', processFiles);
        document.getElementById('nnv-btn-copy').addEventListener('click', copyAllResults);
    }

    async function processFiles() {
        const input = document.getElementById('nnv-file-input');
        const grid = document.getElementById('nnv-grid-result');
        const statusMsg = document.getElementById('nnv-main-status');
        const btnProcess = document.getElementById('nnv-btn-process');
        const btnCopy = document.getElementById('nnv-btn-copy');

        if (!input.files.length) {
            alert("Anh Liêm chưa chọn file nào cả!");
            return;
        }
        
        btnProcess.disabled = true;
        btnProcess.innerText = "⏳ ĐANG XỬ LÝ DỮ LIỆU...";
        btnCopy.style.display = "none";
        grid.innerHTML = ""; 

        // Vẽ bộ khung 4 cột trước
        for (let i = 0; i < input.files.length; i++) {
            const cardId = `order-card-${i}`;
            const cardHtml = `
                <div class="nnv-card">
                    <div class="nnv-card-header">
                        <h4 class="nnv-card-title">📦 Đơn ${i+1}</h4>
                        <span id="status-${cardId}" class="nnv-card-status">⏳ Đang đọc...</span>
                    </div>
                    <textarea id="text-${cardId}" class="nnv-textarea" placeholder="Đang trích xuất dữ liệu từ ${input.files[i].name}..."></textarea>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', cardHtml);
        }

        // Đổ dữ liệu OCR vào
        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            const cardId = `order-card-${i}`;
            statusMsg.innerText = `⚙️ Đang quét OCR đơn ${i+1} / ${input.files.length}...`;
            
            try {
                const base64 = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });

                const resp = await fetch(GAS_PROXY_URL, {
                    method: 'POST',
                    body: JSON.stringify({ base64Data: base64 })
                });
                const res = await resp.json();

                const textArea = document.getElementById(`text-${cardId}`);
                const statusSpan = document.getElementById(`status-${cardId}`);

                if (res.success) {
                    textArea.value = res.text;
                    statusSpan.innerText = "✅ Xong";
                    statusSpan.className = "nnv-card-status success";
                } else {
                    textArea.value = `⚠️ LỖI: ${res.error}`;
                    statusSpan.innerText = "❌ Lỗi";
                }
            } catch (e) {
                document.getElementById(`text-${cardId}`).value = "⚠️ LỖI KẾT NỐI HOẶC HẾT THỜI GIAN CHỜ";
                document.getElementById(`status-${cardId}`).innerText = "❌ Lỗi mạng";
            }
        }

        statusMsg.innerText = "🎉 Hoàn thành! Anh có thể Sửa trực tiếp rồi bấm Copy.";
        btnProcess.disabled = false;
        btnProcess.innerText = "🚀 CHỌN FILE HOẶC QUÉT LẠI";
        btnCopy.style.display = "block";
    }

    function copyAllResults() {
        const textAreas = document.querySelectorAll('.nnv-textarea');
        let combinedText = "";
        
        textAreas.forEach((ta, index) => {
            combinedText += `--- ĐƠN SỐ ${index + 1} ---\n${ta.value}\n\n`;
        });

        const tempTextarea = document.createElement("textarea");
        tempTextarea.value = combinedText;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand("copy");
        document.body.removeChild(tempTextarea);

        const btn = document.getElementById('nnv-btn-copy');
        btn.innerText = "✅ ĐÃ COPY VÀO BỘ NHỚ TẠM!";
        btn.style.background = "#0f9d58";
        
        setTimeout(() => {
            btn.innerText = "📋 COPY TOÀN BỘ DỮ LIỆU";
            btn.style.background = "#1a73e8";
        }, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
})();

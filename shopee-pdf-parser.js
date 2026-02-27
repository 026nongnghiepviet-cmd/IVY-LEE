(function() {
    // LINK WEB APP GAS (Giữ nguyên link đang chạy bản V84/V85 của anh)
    const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbzFzf5iXBB9b5KTWBKzxcrVU5r1dKxL5fWms8WZuL7M-LpwJyXTCcrrKkJ6sI7dy0dsMg/exec";

    function injectStyles() {
        if (document.getElementById('nnv-shopee-styles')) return;
        const style = document.createElement('style');
        style.id = 'nnv-shopee-styles';
        style.innerHTML = `
            .nnv-shopee-container { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 1200px; margin: 0 auto; color: #333; }
            
            /* Khu vực Chọn Tệp hiện đại */
            .nnv-upload-zone { border: 2px dashed #ee4d2d; border-radius: 12px; padding: 40px 20px; background: #fffcfb; text-align: center; margin-bottom: 20px; cursor: pointer; transition: all 0.3s ease; position: relative; }
            .nnv-upload-zone:hover { background: #fff5f2; border-color: #d73a1e; box-shadow: 0 4px 12px rgba(238,77,45,0.1); }
            .nnv-upload-icon { font-size: 40px; margin-bottom: 10px; display: block; }
            .nnv-title { margin: 0 0 8px 0; color: #ee4d2d; font-size: 18px; font-weight: 800; text-transform: uppercase; }
            .nnv-subtitle { margin: 0; color: #666; font-size: 14px; }
            .nnv-file-input { display: none; /* Ẩn input gốc đi */ }
            #file-count-label { display: inline-block; margin-top: 15px; padding: 5px 15px; background: #e8f0fe; color: #1a73e8; border-radius: 20px; font-size: 13px; font-weight: bold; }
            
            /* Nút xử lý */
            .nnv-btn-process { background-color: #ee4d2d; color: white; width: 100%; height: 55px; font-weight: bold; font-size: 16px; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(238,77,45,0.2); margin-bottom: 20px; }
            .nnv-btn-process:hover:not(:disabled) { background-color: #d73a1e; transform: translateY(-2px); }
            .nnv-btn-process:disabled { background-color: #fca08d; cursor: not-allowed; }
            
            /* Grid 3 cột cho kết quả */
            .nnv-grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
            @media (max-width: 900px) { .nnv-grid-container { grid-template-columns: repeat(2, 1fr); } }
            @media (max-width: 600px) { .nnv-grid-container { grid-template-columns: 1fr; } }
            
            /* Thẻ đơn hàng (Card) */
            .nnv-order-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: 0.3s; display: flex; flex-direction: column; }
            .nnv-order-card:hover { border-color: #ee4d2d; box-shadow: 0 4px 12px rgba(238,77,45,0.15); }
            .nnv-card-header { font-weight: 700; color: #1a73e8; margin-bottom: 10px; font-size: 14px; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 8px;}
            
            /* Textarea bên trong thẻ để sửa trực tiếp */
            .nnv-textarea-card { width: 100%; height: 220px; border: none; background: #fafafa; border-radius: 6px; padding: 10px; font-family: 'Consolas', monospace; font-size: 13px; line-height: 1.5; color: #333; resize: vertical; outline: 1px solid #eee; }
            .nnv-textarea-card:focus { outline: 2px solid #ee4d2d; background: #fff; }
            
            /* Nút Copy All */
            .nnv-btn-copy-all { background: #1a73e8; color: white; width: 100%; height: 50px; font-weight: bold; font-size: 15px; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; display: none; }
            .nnv-btn-copy-all:hover { background: #1557b0; }
        `;
        document.head.appendChild(style);
    }

    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        injectStyles();

        container.innerHTML = `
            <div class="nnv-shopee-container">
                <div class="nnv-upload-zone" id="upload-zone-trigger">
                    <span class="nnv-upload-icon">📄</span>
                    <h3 class="nnv-title">CHỌN FILE ĐƠN HÀNG (SPX / GHN)</h3>
                    <p class="nnv-subtitle">Nhấn vào đây để chọn nhiều file PDF cùng lúc</p>
                    <span id="file-count-label" style="display:none;">Chưa chọn file</span>
                    <input type="file" id="shopee-pdf-file" class="nnv-file-input" accept="application/pdf" multiple />
                </div>
                
                <button id="btn-process-pdf" class="nnv-btn-process">⚡ TRÍCH XUẤT OCR TẤT CẢ ĐƠN</button>
                
                <div id="status-progress" style="text-align: center; font-weight: bold; color: #ee4d2d; margin-bottom: 15px;"></div>

                <div id="shopee-result-grid" class="nnv-grid-container"></div>
                
                <button id="btn-copy-all" class="nnv-btn-copy-all">📋 COPY TOÀN BỘ DỮ LIỆU ĐÃ SOẠN</button>
            </div>
        `;

        // Kích hoạt click vào vùng upload thì mở bảng chọn file
        document.getElementById('upload-zone-trigger').addEventListener('click', () => {
            document.getElementById('shopee-pdf-file').click();
        });

        // Hiển thị số lượng file đã chọn
        document.getElementById('shopee-pdf-file').addEventListener('change', function() {
            const countLabel = document.getElementById('file-count-label');
            countLabel.style.display = "inline-block";
            if (this.files.length > 0) {
                countLabel.innerText = `Đã chọn ${this.files.length} file PDF`;
                countLabel.style.background = "#e8f0fe";
                countLabel.style.color = "#1a73e8";
            } else {
                countLabel.style.display = "none";
            }
        });

        document.getElementById('btn-process-pdf').addEventListener('click', processFiles);
        document.getElementById('btn-copy-all').addEventListener('click', copyAllResults);
    }

    async function processFiles() {
        const input = document.getElementById('shopee-pdf-file');
        const grid = document.getElementById('shopee-result-grid');
        const status = document.getElementById('status-progress');
        const btn = document.getElementById('btn-process-pdf');
        const copyBtn = document.getElementById('btn-copy-all');

        if (!input.files.length) return alert("Anh Liêm chưa chọn file nào cả!");
        
        // Setup UI loading
        btn.disabled = true;
        btn.innerHTML = "⏳ ĐANG XỬ LÝ (Không tắt trang)...";
        grid.innerHTML = ""; // Xóa grid cũ
        copyBtn.style.display = "none";

        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            
            // Tạo một thẻ (card) chờ xử lý cho file này
            const cardId = `order-card-${i}`;
            const cardHtml = `
                <div class="nnv-order-card">
                    <div class="nnv-card-header">
                        <span>📦 Đơn ${i+1}</span>
                        <span id="status-${cardId}" style="color: #fca08d;">⏳ Đang đọc...</span>
                    </div>
                    <textarea id="text-${cardId}" class="nnv-textarea-card" placeholder="Đang trích xuất dữ liệu từ ${file.name}..."></textarea>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', cardHtml);
            status.innerText = `Đang quét OCR file ${i+1}/${input.files.length}...`;
            
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

                const textArea = document.getElementById(`text-${cardId}`);
                const statusSpan = document.getElementById(`status-${cardId}`);

                if (res.success) {
                    textArea.value = res.text;
                    statusSpan.innerText = "✅ Xong";
                    statusSpan.style.color = "#0f9d58";
                } else {
                    textArea.value = `⚠️ LỖI: ${res.error}`;
                    statusSpan.innerText = "❌ Lỗi";
                    statusSpan.style.color = "red";
                }
            } catch (e) {
                document.getElementById(`text-${cardId}`).value = `⚠️ LỖI KẾT NỐI MÁY CHỦ`;
                document.getElementById(`status-${cardId}`).innerText = "❌ Lỗi mạng";
            }
        }

        status.innerText = "🎉 Xử lý xong tất cả! Anh có thể sửa trực tiếp vào từng ô dưới đây.";
        btn.disabled = false;
        btn.innerHTML = "⚡ TRÍCH XUẤT LẠI OCR TẤT CẢ ĐƠN";
        copyBtn.style.display = "block"; // Hiện nút copy tổng
    }

    function copyAllResults() {
        const textAreas = document.querySelectorAll('.nnv-textarea-card');
        let combinedText = "";
        
        textAreas.forEach((ta, index) => {
            combinedText += `--- ĐƠN SỐ ${index + 1} ---\n${ta.value}\n\n`;
        });

        // Tạo element tạm để copy text
        const tempTextarea = document.createElement("textarea");
        tempTextarea.value = combinedText;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand("copy");
        document.body.removeChild(tempTextarea);

        const btn = document.getElementById('btn-copy-all');
        btn.innerText = "✅ ĐÃ COPY TOÀN BỘ DỮ LIỆU!";
        btn.style.background = "#0f9d58";
        
        setTimeout(() => {
            btn.innerText = "📋 COPY TOÀN BỘ DỮ LIỆU ĐÃ SOẠN";
            btn.style.background = "#1a73e8";
        }, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
})();

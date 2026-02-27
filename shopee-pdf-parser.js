(function() {
    // LINK WEB APP GAS (Giữ nguyên)
    const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbzFzf5iXBB9b5KTWBKzxcrVU5r1dKxL5fWms8WZuL7M-LpwJyXTCcrrKkJ6sI7dy0dsMg/exec";

    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        // Nhúng CSS trực tiếp vào Container để đảm bảo hiển thị đúng bảng 3 cột to bự
        container.innerHTML = `
            <style>
                .nnv-wrapper { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 1400px; margin: 0 auto; color: #333; }
                
                /* Khu vực upload bự và đẹp */
                .nnv-upload-box { border: 3px dashed #ee4d2d; border-radius: 15px; padding: 50px 20px; text-align: center; background: #fffaf9; cursor: pointer; transition: 0.3s; margin-bottom: 25px; }
                .nnv-upload-box:hover { background: #feebe7; border-color: #d73a1e; transform: scale(1.01); }
                .nnv-upload-title { color: #ee4d2d; font-size: 24px; font-weight: 900; margin: 0 0 10px 0; }
                .nnv-upload-desc { color: #555; font-size: 16px; margin: 0 0 20px 0; }
                .nnv-file-input { display: none; }
                .nnv-file-count { display: inline-block; padding: 10px 25px; background: #1a73e8; color: white; border-radius: 30px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px rgba(26,115,232,0.3); }
                
                /* Nút xử lý chính */
                .nnv-btn { background: #ee4d2d; color: white; border: none; padding: 20px 0; width: 100%; font-size: 20px; font-weight: 900; border-radius: 12px; cursor: pointer; transition: 0.3s; margin-bottom: 20px; text-transform: uppercase; box-shadow: 0 4px 10px rgba(238,77,45,0.3); }
                .nnv-btn:hover:not(:disabled) { background: #d73a1e; transform: translateY(-3px); box-shadow: 0 6px 15px rgba(238,77,45,0.4); }
                .nnv-btn:disabled { background: #fca08d; cursor: not-allowed; transform: none; box-shadow: none; }
                
                /* BẢNG GRID 3 CỘT (Cốt lõi hiển thị) */
                .nnv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-bottom: 30px; }
                @media (max-width: 1100px) { .nnv-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 768px) { .nnv-grid { grid-template-columns: 1fr; } }
                
                /* Ô hiển thị 1 đơn hàng (Card) */
                .nnv-card { border: 2px solid #ddd; border-radius: 15px; background: #fff; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.06); transition: 0.3s; display: flex; flex-direction: column; }
                .nnv-card:hover { border-color: #ee4d2d; box-shadow: 0 8px 25px rgba(238,77,45,0.15); }
                .nnv-card-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 2px solid #eee; display: flex; justify-content: space-between; align-items: center; }
                .nnv-card-title { font-weight: 900; font-size: 18px; color: #1a73e8; margin: 0; }
                .nnv-card-status { font-size: 14px; font-weight: bold; padding: 6px 15px; border-radius: 20px; background: #ffebee; color: #d32f2f; }
                .nnv-card-status.success { background: #e6f4ea; color: #1e8e3e; }
                
                /* Textarea chỉnh sửa trực tiếp (rất bự) */
                .nnv-textarea { width: 100%; height: 350px; padding: 20px; border: none; resize: vertical; font-family: 'Consolas', 'Courier New', monospace; font-size: 16px; line-height: 1.7; color: #111; background: #fafbfc; box-sizing: border-box; }
                .nnv-textarea:focus { outline: none; background: #fff; box-shadow: inset 0 0 0 3px #ee4d2d; }
                
                /* Dòng thông báo trạng thái */
                .nnv-main-status { text-align: center; font-size: 18px; font-weight: bold; color: #ee4d2d; margin-bottom: 25px; min-height: 25px; }
                
                /* Nút Copy All */
                .nnv-btn-copy { background: #1a73e8; display: none; margin-top: 10px; }
                .nnv-btn-copy:hover { background: #1557b0; }
            </style>
            
            <div class="nnv-wrapper">
                <div class="nnv-upload-box" id="nnv-upload-trigger">
                    <div style="font-size: 60px; margin-bottom: 15px;">📤</div>
                    <h2 class="nnv-upload-title">TẢI LÊN FILE SOẠN ĐƠN</h2>
                    <p class="nnv-upload-desc">Click vào đây để tải lên nhiều file cùng lúc (Hỗ trợ SPX & GHN)</p>
                    <span class="nnv-file-count" id="nnv-file-count" style="display: none;">Chưa chọn file</span>
                    <input type="file" id="nnv-file-input" class="nnv-file-input" accept="application/pdf" multiple />
                </div>
                
                <button id="nnv-btn-process" class="nnv-btn">🚀 TRÍCH XUẤT OCR TẤT CẢ ĐƠN HÀNG</button>
                
                <div id="nnv-main-status" class="nnv-main-status"></div>

                <div id="nnv-grid-result" class="nnv-grid"></div>
                
                <button id="nnv-btn-copy" class="nnv-btn nnv-btn-copy">📋 COPY TOÀN BỘ DỮ LIỆU ĐÃ CHỈNH SỬA</button>
            </div>
        `;

        // Bắt sự kiện Click vào ô bự thì mở hộp thoại chọn file
        document.getElementById('nnv-upload-trigger').addEventListener('click', () => {
            document.getElementById('nnv-file-input').click();
        });

        // Đổi trạng thái khi chọn file
        document.getElementById('nnv-file-input').addEventListener('change', function() {
            const countLabel = document.getElementById('nnv-file-count');
            if (this.files.length > 0) {
                countLabel.style.display = "inline-block";
                countLabel.innerText = `Đã chọn ${this.files.length} file PDF`;
                document.getElementById('nnv-grid-result').innerHTML = ""; // Xóa bảng cũ
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
        btnProcess.innerText = "⏳ ĐANG XỬ LÝ DỮ LIỆU... (Vui lòng không tắt trang)";
        btnCopy.style.display = "none";
        grid.innerHTML = ""; 

        // BƯỚC 1: Vẽ KHUNG TRƯỚC cho tất cả file (Để anh thấy bảng 3 cột liền)
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

        // BƯỚC 2: Gọi App Script quét từng file và đổ dữ liệu vào các ô lưới
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

        statusMsg.innerText = "🎉 Tuyệt vời! Anh có thể Click vào từng ô để SỬA TRỰC TIẾP rồi bấm Copy.";
        btnProcess.disabled = false;
        btnProcess.innerText = "🚀 QUÉT LẠI HOẶC CHỌN FILE MỚI";
        btnCopy.style.display = "block";
    }

    function copyAllResults() {
        const textAreas = document.querySelectorAll('.nnv-textarea');
        let combinedText = "";
        
        // Gom dữ liệu từ tất cả các ô trên Lưới lại
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
        btn.innerText = "✅ ĐÃ COPY TOÀN BỘ DỮ LIỆU ĐÃ SỬA VÀO BỘ NHỚ TẠM!";
        btn.style.background = "#0f9d58";
        
        setTimeout(() => {
            btn.innerText = "📋 COPY TOÀN BỘ DỮ LIỆU ĐÃ CHỈNH SỬA";
            btn.style.background = "#1a73e8";
        }, 3000);
    }

    // Khởi chạy khi web tải xong
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
})();

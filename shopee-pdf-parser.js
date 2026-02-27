(function() {
    // LINK WEB APP GAS (Giữ nguyên link của anh)
    const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbzFzf5iXBB9b5KTWBKzxcrVU5r1dKxL5fWms8WZuL7M-LpwJyXTCcrrKkJ6sI7dy0dsMg/exec";

    function injectStyles() {
        if (document.getElementById('nnv-shopee-styles')) return;
        const style = document.createElement('style');
        style.id = 'nnv-shopee-styles';
        style.innerHTML = `
            .nnv-shopee-container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 0 auto; color: #333; }
            .nnv-upload-zone { border: 2px dashed #ee4d2d; border-radius: 12px; padding: 30px 20px; background: #fffcfb; text-align: center; margin-bottom: 20px; transition: all 0.3s ease; }
            .nnv-upload-zone:hover { background: #fff5f2; border-color: #d73a1e; }
            .nnv-title { margin: 0 0 8px 0; color: #ee4d2d; font-size: 18px; font-weight: 800; text-transform: uppercase; }
            .nnv-subtitle { margin: 0 0 15px 0; color: #666; font-size: 14px; }
            .nnv-file-input { display: block; width: 100%; max-width: 400px; margin: 0 auto; cursor: pointer; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 6px; }
            .nnv-btn-process { background-color: #ee4d2d; color: white; width: 100%; height: 55px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(238,77,45,0.2); margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 10px; }
            .nnv-btn-process:hover:not(:disabled) { background-color: #d73a1e; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(238,77,45,0.3); }
            .nnv-btn-process:disabled { background-color: #fca08d; cursor: not-allowed; transform: none; box-shadow: none; }
            .nnv-status { margin-bottom: 15px; font-weight: 600; text-align: center; color: #1a73e8; font-size: 15px; min-height: 22px; transition: 0.3s; }
            .nnv-result-wrapper { position: relative; }
            .nnv-textarea { width: 100%; height: 550px; border: 2px solid #e0e0e0; border-radius: 12px; padding: 25px; font-family: 'Consolas', 'Courier New', Courier, monospace; font-size: 15px; line-height: 1.7; background: #fafafa; color: #111; resize: vertical; box-sizing: border-box; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); transition: border-color 0.3s; }
            .nnv-textarea:focus { outline: none; border-color: #ee4d2d; background: #fff; }
            .nnv-btn-copy { position: absolute; top: 15px; right: 15px; background: #1a73e8; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(26,115,232,0.4); display: none; }
            .nnv-btn-copy:hover { background: #1557b0; transform: scale(1.05); }
        `;
        document.head.appendChild(style);
    }

    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        injectStyles();

        container.innerHTML = `
            <div class="nnv-shopee-container">
                <div class="nnv-upload-zone">
                    <h3 class="nnv-title">📦 TẢI LÊN BILL SOẠN ĐƠN (PDF)</h3>
                    <p class="nnv-subtitle">Chọn nhiều file cùng lúc để quét hàng loạt</p>
                    <input type="file" id="shopee-pdf-file" class="nnv-file-input" accept="application/pdf" multiple />
                </div>
                
                <button id="btn-process-pdf" class="nnv-btn-process">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    BẮT ĐẦU QUÉT OCR TẤT CẢ ĐƠN
                </button>
                
                <div id="status-progress" class="nnv-status"></div>

                <div class="nnv-result-wrapper">
                    <textarea id="shopee-output-result" class="nnv-textarea" placeholder="Kết quả soạn đơn sẽ hiển thị ngay ngắn tại đây..." readonly></textarea>
                    <button id="btn-copy-result" class="nnv-btn-copy">📋 Copy Toàn Bộ</button>
                </div>
            </div>
        `;

        document.getElementById('btn-process-pdf').addEventListener('click', processFiles);
        document.getElementById('btn-copy-result').addEventListener('click', function() {
            const out = document.getElementById('shopee-output-result');
            out.select();
            document.execCommand('copy');
            this.innerText = "✅ Đã Copy Thành Công!";
            this.style.background = "#0f9d58";
            setTimeout(() => { 
                this.innerText = "📋 Copy Toàn Bộ"; 
                this.style.background = "#1a73e8";
            }, 2500);
        });
    }

    async function processFiles() {
        const input = document.getElementById('shopee-pdf-file');
        const output = document.getElementById('shopee-output-result');
        const status = document.getElementById('status-progress');
        const btn = document.getElementById('btn-process-pdf');

        if (!input.files.length) return alert("Anh hãy chọn ít nhất 1 file PDF nhé!");
        
        btn.disabled = true;
        btn.innerHTML = "⏳ ĐANG XỬ LÝ DỮ LIỆU...";
        output.value = "";
        let finalOutput = "";

        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            status.innerHTML = `⚙️ Đang quét file <b>(${i+1}/${input.files.length})</b>: <i>${file.name}</i>`;
            
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

                // Tạo dải phân cách nhìn chuyên nghiệp, dễ copy
                const divider = "================================================\n";
                const orderHeader = `📦 ĐƠN SỐ ${i+1} | File: ${file.name}\n`;
                
                if (res.success) {
                    finalOutput += divider + orderHeader + divider + res.text + "\n\n\n";
                } else {
                    finalOutput += divider + orderHeader + divider + `⚠️ LỖI: ${res.error}\n\n\n`;
                }
            } catch (e) {
                finalOutput += `================================================\n📦 ĐƠN SỐ ${i+1} | File: ${file.name}\n================================================\n⚠️ LỖI KẾT NỐI MÁY CHỦ\n\n\n`;
            }
            output.value = finalOutput;
            output.scrollTop = output.scrollHeight; // Giữ form tự động cuộn xuống
        }

        status.innerHTML = "🎉 Tuyệt vời! Đã hoàn thành xử lý tất cả đơn hàng.";
        btn.disabled = false;
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> BẮT ĐẦU QUÉT OCR TẤT CẢ ĐƠN`;
        document.getElementById('btn-copy-result').style.display = "block";
    }

    // Khởi chạy khi DOM đã sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
})();

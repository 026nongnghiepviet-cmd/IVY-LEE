(function() {
    // LƯU Ý: THAY MÃ API KEY CỦA BẠN VÀO DÒNG BÊN DƯỚI
    const GEMINI_API_KEY = "AIzaSyDS0YupAAAmSqXsnnoQXJYNd9N2V7FinKw";

    // Hàm render giao diện upload
    function renderShopeeToolUI() {
        const container = document.getElementById('nnv-shopee-tool-container');
        if (!container) return;

        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 700; font-size: 13px; color: #5f6368;">Tải lên file PDF đơn hàng Shopee:</label>
                <input type="file" id="shopee-pdf-file" accept="application/pdf" style="margin-top: 8px; padding: 10px; border: 2px dashed #ee4d2d; border-radius: 8px; width: 100%; background: #fffcfc; cursor: pointer;" />
            </div>
            
            <button id="btn-process-pdf" class="btn btn-save" style="background-color: #ee4d2d; box-shadow: 0 4px 10px rgba(238,77,45,0.2); margin-bottom: 20px;">
                🚀 AI ĐỌC & TRÍCH XUẤT ĐƠN HÀNG
            </button>
            
            <div style="position: relative;">
                <label style="font-weight: 700; font-size: 13px; color: #5f6368;">Kết quả Soạn Đơn:</label>
                <textarea id="shopee-output-result" rows="9" style="width: 100%; border: 1px solid #dadce0; border-radius: 8px; padding: 12px; margin-top: 8px; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 14px; background: #fff; line-height: 1.5;" placeholder="Dữ liệu xử lý bởi Gemini sẽ hiển thị tại đây..."></textarea>
                <button id="btn-copy-result" class="btn" style="position: absolute; bottom: 10px; right: 10px; background-color: #1a73e8; color: white; padding: 6px 12px; font-size: 12px; display: none; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">📋 Copy</button>
            </div>
        `;

        document.getElementById('btn-process-pdf').addEventListener('click', processShopeePDF);
        document.getElementById('btn-copy-result').addEventListener('click', copyResult);
    }

    // Hàm xử lý gọi AI
    async function processShopeePDF() {
        const fileInput = document.getElementById('shopee-pdf-file');
        const outputField = document.getElementById('shopee-output-result');
        const btnProcess = document.getElementById('btn-process-pdf');
        const btnCopy = document.getElementById('btn-copy-result');

        if (!fileInput.files.length) {
            alert("Vui lòng chọn file PDF bill Shopee trước nhé!");
            return;
        }

        if (GEMINI_API_KEY === "THAY_MÃ_API_KEY_CỦA_BẠN_VÀO_ĐÂY") {
            alert("Bạn chưa điền mã API Key của Gemini vào file shopee-pdf-parser.js!");
            return;
        }

        const file = fileInput.files[0];
        outputField.value = "⏳ Đang nhờ AI Gemini xử lý file, bạn đợi chút nhé...";
        btnProcess.disabled = true;
        btnProcess.innerText = "⏳ HỆ THỐNG ĐANG XỬ LÝ...";
        btnProcess.style.backgroundColor = "#ccc";
        btnCopy.style.display = 'none';

        try {
            // 1. Đọc file PDF chuyển thành chuỗi Base64
            const base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(file);
            });

            // 2. Gọi API Gemini (Đã dọn dẹp khoảng trắng API_KEY)
            const cleanApiKey = GEMINI_API_KEY.trim();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanApiKey}`;
            
            // 3. Prompt chuẩn xác
            const prompt = `Bạn là hệ thống trích xuất dữ liệu kho hàng. Hãy đọc file PDF đơn hàng Shopee đính kèm và trích xuất thông tin ĐÚNG chuẩn format dưới đây. 
Tuyệt đối không sử dụng code block (markdown), không giải thích, không thêm bất kỳ chữ nào khác ngoài biểu mẫu này:

MVĐ: [mã vận đơn]
Khách hàng: [tên người nhận]
Địa chỉ: [địa chỉ người nhận chi tiết]
Địa chỉ mới: 
Tên sản phẩm: [chỉ ghi tên sản phẩm, bỏ đi phần khối lượng hoặc thông tin phụ]
NVC: [Tên đơn vị vận chuyển]
Đơn hàng Shopee`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: "application/pdf", data: base64Data } }
                        ]
                    }]
                })
            });

            // 4. BẮT LỖI CHI TIẾT TỪ GOOGLE
            if (!response.ok) {
                let errorDetail = `Lỗi kết nối API: ${response.status}`;
                try {
                    const errorJson = await response.json();
                    errorDetail = `Lỗi ${response.status}: ${errorJson.error.message}`;
                } catch (parseError) {
                    console.error("Không thể đọc chi tiết lỗi:", parseError);
                }
                throw new Error(errorDetail);
            }

            const resultJson = await response.json();
            let textResult = resultJson.candidates[0].content.parts[0].text;
            
            // Dọn dẹp markdown nếu AI lỡ tay thêm vào
            textResult = textResult.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();

            outputField.value = textResult;
            btnCopy.style.display = 'inline-block';

        } catch (error) {
            console.error(error);
            outputField.value = "⚠️ " + error.message;
        } finally {
            btnProcess.disabled = false;
            btnProcess.innerText = "🚀 AI ĐỌC & TRÍCH XUẤT ĐƠN HÀNG";
            btnProcess.style.backgroundColor = "#ee4d2d";
            fileInput.value = ""; // Reset file input sau khi xong
        }
    }

    // Hàm copy nhanh
    function copyResult() {
        const outputField = document.getElementById('shopee-output-result');
        outputField.select();
        document.execCommand('copy');
        
        const btnCopy = document.getElementById('btn-copy-result');
        btnCopy.innerText = "✔ Đã Copy";
        setTimeout(() => { btnCopy.innerText = "📋 Copy"; }, 2000);
    }

    // Tự động chèn giao diện khi trình duyệt tải xong HTML
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderShopeeToolUI);
    } else {
        renderShopeeToolUI();
    }
    
    // Đẩy hàm init ra global phòng khi cần gọi lại lúc chuyển tab
    window.initShopeeParser = renderShopeeToolUI;

})();

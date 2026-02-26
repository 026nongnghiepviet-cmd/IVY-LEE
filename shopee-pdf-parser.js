document.addEventListener('DOMContentLoaded', () => {
    // 1. Tìm hoặc tạo vùng chứa (container) trên Blogspot
    let container = document.getElementById('nnv-shopee-tool-container');
    
    // Nếu bạn quên tạo thẻ div id="nnv-shopee-tool-container", tool sẽ tự động bám vào cuối trang web
    if (!container) {
        container = document.createElement('div');
        container.id = 'nnv-shopee-tool-container';
        document.body.appendChild(container);
    }

    // 2. Bơm giao diện HTML vào vùng chứa
    container.innerHTML = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #ee4d2d; text-align: center;">Tool Trích Xuất Đơn Shopee - NNV</h3>
            
            <label style="font-weight: bold; font-size: 14px; display: block; margin-bottom: 5px;">1. API Key Gemini:</label>
            <input type="password" id="nnv-api-key" placeholder="Dán API Key của bạn vào đây..." style="width: 100%; box-sizing: border-box; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;" />
            
            <label style="font-weight: bold; font-size: 14px; display: block; margin-bottom: 5px;">2. Tải lên file Bill (PDF):</label>
            <input type="file" id="nnv-pdf-upload" accept="application/pdf" style="width: 100%; margin-bottom: 15px;" />
            
            <button id="nnv-process-btn" style="background: #ee4d2d; color: white; border: none; padding: 12px 15px; cursor: pointer; border-radius: 4px; width: 100%; font-weight: bold; font-size: 15px; transition: 0.3s;">Đọc và Lấy thông tin</button>
            
            <div id="nnv-loading-text" style="display: none; margin-top: 15px; color: #ee4d2d; text-align: center; font-style: italic; font-weight: bold;">Đang nhờ AI Gemini đọc bill, đợi một chút nhé...</div>
            
            <textarea id="nnv-result-text" rows="8" style="width: 100%; box-sizing: border-box; margin-top: 20px; padding: 12px; border: 1px solid #28a745; border-radius: 4px; display: none; font-family: monospace; font-size: 14px; line-height: 1.5; background: #f9f9f9;"></textarea>
        </div>
    `;

    // 3. Bắt đầu gán chức năng cho các nút bấm
    const fileInput = document.getElementById('nnv-pdf-upload');
    const apiKeyInput = document.getElementById('nnv-api-key');
    const processBtn = document.getElementById('nnv-process-btn');
    const resultText = document.getElementById('nnv-result-text');
    const loadingText = document.getElementById('nnv-loading-text');

    processBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const apiKey = apiKeyInput.value.trim();

        if (!file) {
            alert('Bạn chưa chọn file PDF vận đơn Shopee!');
            return;
        }
        if (!apiKey) {
            alert('Vui lòng nhập Gemini API Key để AI có thể đọc file!');
            return;
        }

        // Đổi giao diện sang trạng thái đang xử lý
        loadingText.style.display = 'block';
        resultText.style.display = 'none';
        processBtn.disabled = true;
        processBtn.style.background = '#ccc';
        processBtn.innerText = "Đang xử lý...";

        try {
            // Chuyển file PDF sang mã Base64 để gửi qua mạng
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });

            // Gửi dữ liệu tới API của Google Gemini (Dùng bản 2.5 Flash mới nhất cho nhanh)
            const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${apiKey}\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Bạn là trợ lý xử lý đơn hàng. Đọc file PDF vận đơn đính kèm và trích xuất thông tin theo đúng mẫu sau, KHÔNG giải thích, KHÔNG thêm bất kỳ chữ nào khác:\n\nMVĐ: \nKhách hàng: \nĐịa chỉ: \nĐịa chỉ mới: \nTên sản phẩm: \nNVC: \nĐơn hàng Shopee" },
                            {
                                inlineData: {
                                    mimeType: "application/pdf",
                                    data: base64Data
                                }
                            }
                        ]
                    }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Lỗi kết nối với Gemini API');
            }

            // Trích xuất văn bản AI trả về
            const extractedText = data.candidates[0].content.parts[0].text;
            resultText.value = extractedText.trim();
            resultText.style.display = 'block';

        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            // Trả lại giao diện ban đầu
            loadingText.style.display = 'none';
            processBtn.disabled = false;
            processBtn.style.background = '#ee4d2d';
            processBtn.innerText = "Đọc và Lấy thông tin";
        }
    });
});

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

        if (GEMINI_API_KEY === "AIzaSyDS0YupAAAmSqXsnnoQXJYNd9N2V7FinKw") {
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

            // 2. Gọi API với phiên bản flash-latest và dọn dẹp khoảng trắng API_KEY
            const cleanApiKey = GEMINI_API_KEY.trim();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${cleanApiKey}`;
            
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

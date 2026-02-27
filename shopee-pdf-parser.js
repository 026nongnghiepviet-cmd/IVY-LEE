async function processShopeePDF() {
        const fileInput = document.getElementById('shopee-pdf-file');
        const outputField = document.getElementById('shopee-output-result');
        const btnProcess = document.getElementById('btn-process-pdf');
        const btnCopy = document.getElementById('btn-copy-result');

        if (!fileInput.files.length) {
            alert("Vui lòng chọn file PDF bill Shopee!");
            return;
        }

        const file = fileInput.files[0];
        outputField.value = "⏳ Đang trích xuất dữ liệu chính xác...";
        btnProcess.disabled = true;
        btnCopy.style.display = 'none';

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // Nhóm các text item theo tọa độ Y để giữ đúng thứ tự dòng
                const items = textContent.items;
                items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
                fullText += items.map(item => item.str).join(" ") + " ";
            }

            // --- CHIẾN THUẬT BÓC TÁCH MỚI ---
            
            // 1. Mã vận đơn (Lấy dãy chữ in hoa sau "Mã vận đơn:")
            let mvd = fullText.match(/Mã vận đơn[:\s]*([A-Z0-9]+)/i)?.[1] || "Không lấy được mã";

            // 2. Đơn vị vận chuyển
            let nvc = "Shopee Express";
            if (/GiaoHangNhanh/i.test(fullText)) nvc = "GiaoHangNhanh";
            else if (/Viettel Post/i.test(fullText)) nvc = "Viettel Post";
            else if (/J&T/i.test(fullText)) nvc = "J&T Express";

            // 3. Khách hàng và Địa chỉ (Bóc tách giữa "Đến:" và mã bưu cục/Nội dung hàng)
            let khachHang = "Không tìm thấy tên";
            let diaChi = "Không tìm thấy địa chỉ";
            
            // Tìm đoạn text từ sau chữ "Đến:"
            let toPart = fullText.split(/Đến:/i)[1];
            if (toPart) {
                // Cắt bỏ phần từ "Nội dung hàng" trở đi
                toPart = toPart.split(/Nội dung hàng/i)[0].trim();
                
                // Dòng đầu tiên sau "Đến:" thường là tên khách hàng
                let lines = toPart.split(/\s{2,}/).filter(l => l.trim().length > 0);
                if (lines.length >= 2) {
                    khachHang = lines[0].trim(); // Dòng đầu là Tên 
                    // Các dòng còn lại là địa chỉ, loại bỏ mã bưu cục nếu có (dạng 600-Z-14...)
                    diaChi = lines.slice(1).join(", ").replace(/\d{2,}-[A-Z0-9-]+/g, "").trim();
                }
            }

            // 4. Tên sản phẩm (Lấy đoạn sau "1." và trước số lượng "SL:")
            let tenSP = "Không tìm thấy SP";
            let productMatch = fullText.match(/1\.\s*([^,|]+)/i);
            if (productMatch) {
                tenSP = productMatch[1].trim(); // 
            }

            // --- KẾT QUẢ ---
            let finalResult = `MVĐ: ${mvd}\nKhách hàng: ${khachHang}\nĐịa chỉ: ${diaChi}\nĐịa chỉ mới: \nTên sản phẩm: ${tenSP}\nNVC: ${nvc}\nĐơn hàng Shopee`;

            outputField.value = finalResult;
            btnCopy.style.display = 'inline-block';

        } catch (error) {
            outputField.value = "⚠️ Lỗi: " + error.message;
        } finally {
            btnProcess.disabled = false;
            btnProcess.innerText = "⚡ TRÍCH XUẤT ĐƠN HÀNG (OFFLINE)";
        }
    }

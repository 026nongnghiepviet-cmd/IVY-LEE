async function processShopeePDF() {
        const fileInput = document.getElementById('shopee-pdf-file');
        const outputField = document.getElementById('shopee-output-result');
        const btnProcess = document.getElementById('btn-process-pdf');
        const btnCopy = document.getElementById('btn-copy-result');

        if (!fileInput.files.length) {
            alert("Vui lòng chọn file PDF bill Shopee!");
            return;
        }

        if (!pdfjsLib) {
            alert("Hệ thống chưa tải xong thư viện PDF. Vui lòng F5 lại trang web!");
            return;
        }

        const file = fileInput.files[0];
        outputField.value = "⏳ Đang bóc tách dữ liệu offline...";
        btnProcess.disabled = true;
        btnProcess.innerText = "⏳ ĐANG XỬ LÝ...";
        btnProcess.style.backgroundColor = "#ccc";
        btnCopy.style.display = 'none';

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let lines = [];
            // Lấy toàn bộ chữ và chia thành từng dòng
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Thuật toán sắp xếp tọa độ để nhóm các chữ cùng 1 dòng
                textContent.items.sort((a, b) => {
                    // Nếu Y lệch nhau quá 5px thì coi như khác dòng
                    if (Math.abs(b.transform[5] - a.transform[5]) > 5) {
                        return b.transform[5] - a.transform[5];
                    }
                    // Cùng dòng thì xếp từ trái qua phải (theo X)
                    return a.transform[4] - b.transform[4];
                });
                
                textContent.items.forEach(item => {
                    let str = item.str.trim();
                    if (str) lines.push(str);
                });
            }

            let mvd = "Không lấy được mã";
            let khachHang = "Không lấy được tên";
            let diaChiArr = [];
            let tenSP = "Không lấy được SP";
            let nvc = "Shopee Express";

            let fullText = lines.join(" ");
            if (fullText.match(/GiaoHangNhanh|GHN/i)) nvc = "GiaoHangNhanh";
            else if (fullText.match(/Viettel Post/i)) nvc = "Viettel Post";
            else if (fullText.match(/J&T/i)) nvc = "J&T Express";
            else if (fullText.match(/Ninja/i)) nvc = "Ninja Van";
            else if (fullText.match(/BEST/i)) nvc = "BEST Express";
            else if (fullText.match(/SPX/i)) nvc = "SPX Express";

            // Đọc từng dòng từ trên xuống dưới
            for (let i = 0; i < lines.length; i++) {
                
                // 1. Lấy Mã vận đơn
                if (lines[i].includes("Mã vận đơn")) {
                    mvd = lines[i].replace(/Mã vận đơn[:\s]*/i, "").trim();
                    if (!mvd && i + 1 < lines.length) mvd = lines[i + 1].trim();
                }

                // 2. Lấy Tên và Địa chỉ khách hàng
                if (lines[i] === "Đến:" || lines[i] === "Đến") {
                    khachHang = lines[i + 1];
                    let j = i + 2;
                    // Lấy các dòng tiếp theo làm địa chỉ cho tới khi gặp mã kho (vd: 600-Z-14) hoặc Nội dung hàng
                    while (j < lines.length && !lines[j].includes("Nội dung hàng") && !lines[j].match(/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/)) {
                        diaChiArr.push(lines[j]);
                        j++;
                    }
                }

                // 3. Lấy Tên sản phẩm
                if (lines[i].match(/^1\.\s/) || lines[i] === "1.") {
                    let spLines = [];
                    let j = i;
                    // Đọc cho tới khi gặp "Ngày đặt hàng" hoặc "Khối lượng"
                    while (j < lines.length && !lines[j].includes("Ngày đặt hàng") && !lines[j].includes("Khối lượng")) {
                        spLines.push(lines[j]);
                        j++;
                    }
                    let spFull = spLines.join(" ");
                    // Xóa chữ "1." ở đầu và cắt bỏ phần phân loại rườm rà (sau dấu | hoặc dấu ,)
                    tenSP = spFull.replace(/^1\.\s*/, "").split(/\||, SL:|SL:/i)[0].trim();
                }
            }

            // Gộp mảng địa chỉ lại cho đẹp
            let diaChi = diaChiArr.join(", ").replace(/,\s*,/g, ",").trim();

            let finalResult = `MVĐ: ${mvd}\nKhách hàng: ${khachHang}\nĐịa chỉ: ${diaChi}\nĐịa chỉ mới: \nTên sản phẩm: ${tenSP}\nNVC: ${nvc}\nĐơn hàng Shopee`;

            outputField.value = finalResult;
            btnCopy.style.display = 'inline-block';

        } catch (error) {
            console.error(error);
            outputField.value = "⚠️ Lỗi bóc tách: " + error.message;
        } finally {
            btnProcess.disabled = false;
            btnProcess.innerText = "⚡ TRÍCH XUẤT ĐƠN HÀNG (OFFLINE)";
            btnProcess.style.backgroundColor = "#ee4d2d";
            fileInput.value = ""; 
        }
    }

/**
 * E-COMMERCE RECONCILE MODULE (V7 - REAL-TIME CALCULATION)
 * - Khớp dữ liệu cực chuẩn.
 * - Sửa trực tiếp: GÕ TỚI ĐÂU, TỔNG NHẢY TỚI ĐÓ (Giống hệt Excel).
 * - Số tổng luôn bám sát 100% dữ liệu hiển thị trên màn hình.
 */

document.addEventListener('DOMContentLoaded', initEcomModule);

function initEcomModule() {
    console.log("E-commerce Module V7 Loaded");
    const container = document.getElementById('page-ecom');
    if (!container) return;

    container.innerHTML = `
        <style>
            #ecomResultTable tfoot th { 
                position: sticky; 
                bottom: -1px; 
                z-index: 10; 
                background: #fffcfc; 
                border-top: 2px solid #d93025 !important; 
                box-shadow: 0 -4px 6px rgba(0,0,0,0.05); 
            }
            .btn-ecom-action { background: #1a73e8; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(26,115,232,0.2); }
            .btn-ecom-action:hover { background: #1557b0; transform: translateY(-2px); }
            .platform-badge { display:inline-block; background:#ee4d2d; color:#fff; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:bold; margin-left:10px; vertical-align:middle;}
            .btn-edit-data { background: #f4b400; color: #000; border: none; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; box-shadow: 0 2px 6px rgba(244,180,0,0.2); text-transform: uppercase; }
            .btn-edit-data:hover { background: #d49c00; transform: translateY(-2px); }
            .edit-input { width: 100%; padding: 6px; border: 2px solid #1a73e8; border-radius: 4px; font-weight: bold; text-align: right; outline: none; box-sizing: border-box; font-family: sans-serif;}
            .edit-input:focus { background: #e8f0fe; }
            .cell-doanhthu { transition: all 0.2s ease; }
        </style>

        <div class="section-box">
            <div class="section-title">
                🛒 CÔNG CỤ ĐỐI SOÁT ĐƠN HÀNG TMĐT 
                <span class="platform-badge">Đa Nền Tảng</span>
            </div>
            
            <div style="background:#f8f9fa; padding:20px; border-radius:8px; border:1px solid #eee; margin-bottom:20px; display:flex; gap:20px; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">1. Tải file Chi tiết giao dịch (Transaction Report):</label>
                    <input type="file" id="fileTransactions" accept=".csv, .xlsx, .xls" style="border:1px dashed #1a73e8; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">2. Tải các file Đơn hàng (Cho phép chọn nhiều file):</label>
                    <input type="file" id="fileOrders" accept=".csv, .xlsx, .xls" multiple style="border:1px dashed #1a73e8; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
            </div>
            
            <button class="btn-ecom-action" onclick="window.processEcomFiles()">
                ⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT
            </button>

            <div id="ecomResultContainer" style="display:none; animation: fadeIn 0.3s; margin-top:30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <div style="font-weight:900; color:#1a73e8; font-size:15px; text-transform:uppercase;">
                        📊 BẢNG KẾT QUẢ ĐỐI SOÁT <span id="ecom-count-badge" style="font-size:11px; color:#666; font-weight:normal; margin-left:10px;"></span>
                    </div>
                    
                    <div style="display:flex; gap:10px;">
                        <button class="btn-edit-data" id="btn-ecom-edit" onclick="window.toggleEcomEditMode()">
                            <span style="font-size: 16px;">✏️</span> Sửa Dữ Liệu
                        </button>
                        <button class="btn-export-excel" onclick="window.exportEcomExcel()">
                            <span style="font-size: 16px;">📥</span> Xuất File Excel
                        </button>
                    </div>
                </div>

                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; position: relative;">
                    <table class="ads-table" id="ecomResultTable">
                        <thead>
                            <tr style="background:#e8f0fe;">
                                <th>Tên khách hàng</th>
                                <th>Mã vận đơn</th>
                                <th>Số điện thoại</th>
                                <th style="text-align:right;">Tiền hàng</th>
                                <th style="text-align:right; color:#d93025;">Phí ship NVC thu</th>
                                <th style="text-align:right; color:#137333;">Doanh thu</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                        <tfoot></tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
}

window.ecomExportData = [];
window.isEcomEditing = false;

window.readEcomFile = function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            resolve(json);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

window.processEcomFiles = async function() {
    const fileTransInput = document.getElementById('fileTransactions').files[0];
    const fileOrdersInputs = document.getElementById('fileOrders').files;
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!fileTransInput || fileOrdersInputs.length === 0) {
        thongBao("⚠️ Vui lòng tải lên file Chi tiết giao dịch và ít nhất 1 file Đơn hàng!");
        return;
    }

    try {
        const btn = document.querySelector('#page-ecom .btn-ecom-action');
        btn.innerHTML = "⏳ Đang đọc và gộp dữ liệu...";
        btn.disabled = true;

        const transactionsData = await window.readEcomFile(fileTransInput);
        
        const orderPromises = Array.from(fileOrdersInputs).map(file => window.readEcomFile(file));
        const allOrdersDataArrays = await Promise.all(orderPromises);
        const ordersData = allOrdersDataArrays.flat();

        btn.innerHTML = "⏳ Đang tính toán đối soát...";

        const ordersMap = {};
        ordersData.forEach(order => {
            let maDon = order['Mã đơn hàng'] ? order['Mã đơn hàng'].toString().trim() : "";
            if (maDon) {
                let giaBanRaw = order['Tổng giá bán (sản phẩm)'] ? order['Tổng giá bán (sản phẩm)'].toString().replace(/,/g, '') : "0";
                let giaBan = parseFloat(giaBanRaw) || 0;
                
                if (ordersMap[maDon]) {
                    ordersMap[maDon].tongTienHang += giaBan;
                } else {
                    ordersMap[maDon] = {
                        tenKhachHang: order['Tên Người nhận'] || "",
                        maVanDon: order['Mã vận đơn'] || "",
                        tongTienHang: giaBan
                    };
                }
            }
        });

        const tbody = document.querySelector("#ecomResultTable tbody");
        const tfoot = document.querySelector("#ecomResultTable tfoot");
        tbody.innerHTML = ""; 
        tfoot.innerHTML = ""; 
        
        window.ecomExportData = [];
        let recordCount = 0;

        transactionsData.forEach(trans => {
            let maDonTrans = trans['Mã đơn hàng'] ? trans['Mã đơn hàng'].toString().trim() : "";
            let dongTien = trans['Dòng tiền'] ? trans['Dòng tiền'].toString().trim() : "";
            
            let soTienTransRaw = trans['Số tiền'] ? trans['Số tiền'].toString().replace(/,/g, '') : "0";
            let soTienTrans = parseFloat(soTienTransRaw) || 0;
            
            let isDungMaRong = (maDonTrans === "" || maDonTrans === "-");
            let orderMatch = ordersMap[maDonTrans];

            if (orderMatch || isDungMaRong) {
                let tenKhachHang = "";
                let maVanDon = "";
                let soDienThoai = ""; 
                let tienHang = 0;
                let phiShip = 0;

                if (isDungMaRong) {
                    phiShip = 1620;
                    tienHang = 0;
                } else {
                    tenKhachHang = orderMatch.tenKhachHang;
                    maVanDon = orderMatch.maVanDon;
                    tienHang = orderMatch.tongTienHang;

                    if (dongTien.toLowerCase() === "tiền ra") {
                        phiShip = 1620;
                        tienHang = 0; 
                    } else {
                        phiShip = tienHang - soTienTrans;
                    }
                }

                let doanhThu = tienHang - phiShip;
                recordCount++;

                window.ecomExportData.push({
                    "Tên khách hàng": tenKhachHang,
                    "Mã vận đơn": maVanDon,
                    "Số điện thoại": soDienThoai,
                    "Tiền hàng (VNĐ)": tienHang,
                    "Phí ship NVC (VNĐ)": phiShip,
                    "Doanh thu (VNĐ)": doanhThu
                });
            }
        });

        if (window.isEcomEditing) window.toggleEcomEditMode();
        window.renderEcomTable();

        document.getElementById('ecom-count-badge').innerText = `(Khớp ${recordCount} dòng dữ liệu)`;
        document.getElementById('ecomResultContainer').style.display = 'block';
        
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT";
        btn.disabled = false;
        thongBao(`✅ Đã đối soát thành công ${recordCount} giao dịch hợp lệ!`);

    } catch (error) {
        console.error(error);
        thongBao("❌ Có lỗi xảy ra trong lúc đọc file. Hãy kiểm tra lại định dạng file!");
        const btn = document.querySelector('#page-ecom .btn-ecom-action');
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT";
        btn.disabled = false;
    }
};

// ==========================================
// HÀM VẼ BẢNG HTML TỪ MẢNG DATA (CHẾ ĐỘ XEM)
// ==========================================
window.renderEcomTable = function() {
    const tbody = document.querySelector("#ecomResultTable tbody");
    const tfoot = document.querySelector("#ecomResultTable tfoot");
    tbody.innerHTML = ""; 

    let tongTienHangTatCa = 0;
    let tongPhiShipTatCa = 0;
    let tongDoanhThuTatCa = 0;

    window.ecomExportData.forEach((row, index) => {
        tongTienHangTatCa += row["Tiền hàng (VNĐ)"];
        tongPhiShipTatCa += row["Phí ship NVC (VNĐ)"];
        tongDoanhThuTatCa += row["Doanh thu (VNĐ)"];

        const tr = document.createElement("tr");
        let doanhThuColor = row["Doanh thu (VNĐ)"] < 0 ? "color:#d93025; background:#fce8e6; font-weight:bold;" : "color:#137333; font-weight:bold; background:transparent;";
        
        tr.innerHTML = `
            <td>${row["Tên khách hàng"]}</td>
            <td>${row["Mã vận đơn"]}</td>
            <td>${row["Số điện thoại"]}</td>
            <td style="text-align:right;" class="cell-tienhang">${row["Tiền hàng (VNĐ)"] > 0 ? new Intl.NumberFormat('vi-VN').format(row["Tiền hàng (VNĐ)"]) : "0"}</td>
            <td style="text-align:right; color:#666;" class="cell-phiship">${new Intl.NumberFormat('vi-VN').format(row["Phí ship NVC (VNĐ)"])}</td>
            <td style="text-align:right; ${doanhThuColor}" class="cell-doanhthu">${new Intl.NumberFormat('vi-VN').format(row["Doanh thu (VNĐ)"])}</td>
        `;
        tbody.appendChild(tr);
    });

    tfoot.innerHTML = `
        <tr>
            <th colspan="3" style="text-align: right; color:#d93025; font-size:12px;">TỔNG CỘNG ĐÃ GỘP:</th>
            <th style="text-align:right; font-size:13px; color:#333;">${new Intl.NumberFormat('vi-VN').format(tongTienHangTatCa)}</th>
            <th style="text-align:right; font-size:13px; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(tongPhiShipTatCa)}</th>
            <th style="text-align:right; font-size:14px; color:#137333;">${new Intl.NumberFormat('vi-VN').format(tongDoanhThuTatCa)}</th>
        </tr>
    `;
};

// ==========================================
// HÀM BẬT/TẮT CHẾ ĐỘ SỬA
// ==========================================
window.toggleEcomEditMode = function() {
    const btnEdit = document.getElementById("btn-ecom-edit");
    const tbody = document.querySelector("#ecomResultTable tbody");
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!window.ecomExportData || window.ecomExportData.length === 0) {
        thongBao("⚠️ Chưa có dữ liệu để sửa!");
        return;
    }

    if (!window.isEcomEditing) {
        // --- BẬT CHẾ ĐỘ SỬA ---
        window.isEcomEditing = true;
        btnEdit.innerHTML = `<span style="font-size: 16px;">💾</span> LƯU DỮ LIỆU LẠI`;
        btnEdit.style.background = "#137333";
        btnEdit.style.color = "#fff";

        const rows = tbody.querySelectorAll("tr");
        rows.forEach((tr, index) => {
            const dataRow = window.ecomExportData[index];
            const cellTienHang = tr.querySelector(".cell-tienhang");
            const cellPhiShip = tr.querySelector(".cell-phiship");
            
            // Gắn sự kiện oninput="window.liveCalculateEcom()" để tính toán tức thì
            cellTienHang.innerHTML = `<input type="number" class="edit-input input-tienhang" value="${dataRow["Tiền hàng (VNĐ)"]}" oninput="window.liveCalculateEcom()">`;
            cellPhiShip.innerHTML = `<input type="number" class="edit-input input-phiship" value="${dataRow["Phí ship NVC (VNĐ)"]}" oninput="window.liveCalculateEcom()">`;
        });

        // Báo cho tfoot biết là đang sửa
        window.liveCalculateEcom(true); 
        thongBao("✏️ Đang ở chế độ chỉnh sửa. Gõ tới đâu, Doanh thu tự nhảy tới đó!");

    } else {
        // --- TẮT CHẾ ĐỘ SỬA (LƯU LẠI) ---
        window.isEcomEditing = false;
        btnEdit.innerHTML = `<span style="font-size: 16px;">✏️</span> Sửa Dữ Liệu`;
        btnEdit.style.background = "#f4b400";
        btnEdit.style.color = "#000";

        const rows = tbody.querySelectorAll("tr");
        rows.forEach((tr, index) => {
            const inputTienHang = tr.querySelector(".input-tienhang");
            const inputPhiShip = tr.querySelector(".input-phiship");
            
            if (inputTienHang && inputPhiShip) {
                let newValTienHang = parseFloat(inputTienHang.value) || 0;
                let newValPhiShip = parseFloat(inputPhiShip.value) || 0;
                
                window.ecomExportData[index]["Tiền hàng (VNĐ)"] = newValTienHang;
                window.ecomExportData[index]["Phí ship NVC (VNĐ)"] = newValPhiShip;
                window.ecomExportData[index]["Doanh thu (VNĐ)"] = newValTienHang - newValPhiShip;
            }
        });

        window.renderEcomTable();
        thongBao("✅ Đã lưu số liệu mới vào hệ thống chuẩn bị Xuất Excel!");
    }
};

// ==========================================
// HÀM TÍNH TOÁN REAL-TIME KHI ĐANG GÕ
// ==========================================
window.liveCalculateEcom = function(isInit = false) {
    const tbody = document.querySelector("#ecomResultTable tbody");
    const tfoot = document.querySelector("#ecomResultTable tfoot");
    const rows = tbody.querySelectorAll("tr");

    let liveTienHang = 0;
    let livePhiShip = 0;
    let liveDoanhThu = 0;

    rows.forEach(tr => {
        const inHang = tr.querySelector('.input-tienhang');
        const inShip = tr.querySelector('.input-phiship');
        const cellThu = tr.querySelector('.cell-doanhthu');

        if (inHang && inShip && cellThu) {
            let valHang = parseFloat(inHang.value) || 0;
            let valShip = parseFloat(inShip.value) || 0;
            let valThu = valHang - valShip;

            // Cộng dồn tổng
            liveTienHang += valHang;
            livePhiShip += valShip;
            liveDoanhThu += valThu;

            // Đổi màu cột Doanh thu Real-time
            cellThu.innerText = new Intl.NumberFormat('vi-VN').format(valThu);
            if (valThu < 0) {
                cellThu.style.color = "#d93025";
                cellThu.style.background = "#fce8e6";
            } else {
                cellThu.style.color = "#137333";
                cellThu.style.background = "transparent";
            }
        }
    });

    // Cập nhật dòng Tổng Footer theo số đang gõ
    if (tfoot) {
        let textWarning = isInit ? "TỔNG CỘNG (ĐANG SỬA...):" : "TỔNG CỘNG TẠM TÍNH:";
        tfoot.innerHTML = `
            <tr>
                <th colspan="3" style="text-align: right; color:#f4b400; font-size:12px;">${textWarning}</th>
                <th style="text-align:right; font-size:13px; color:#333;">${new Intl.NumberFormat('vi-VN').format(liveTienHang)}</th>
                <th style="text-align:right; font-size:13px; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(livePhiShip)}</th>
                <th style="text-align:right; font-size:14px; color:#137333;">${new Intl.NumberFormat('vi-VN').format(liveDoanhThu)}</th>
            </tr>
        `;
    }
};

// ==========================================
// HÀM XUẤT FILE EXCEL
// ==========================================
window.exportEcomExcel = function() {
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!window.ecomExportData || window.ecomExportData.length === 0) {
        thongBao("⚠️ Không có dữ liệu để xuất! Hãy bấm Xử lý dữ liệu trước.");
        return;
    }

    if (window.isEcomEditing) {
        thongBao("⚠️ Bạn đang ở chế độ Sửa. Hãy bấm nút [LƯU DỮ LIỆU LẠI] màu xanh trước khi xuất file!");
        return;
    }

    if (window.EXCEL_STYLE_LOADED !== true) {
        thongBao("⏳ Đang tải thư viện Excel, vui lòng bấm lại sau 1 giây...");
        return;
    }

    const ws = XLSX.utils.json_to_sheet(window.ecomExportData);
    ws['!cols'] = [ { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 20 } ];

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_ref = XLSX.utils.encode_cell({c: C, r: 0});
        if (ws[cell_ref]) {
            ws[cell_ref].s = {
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
                fill: { fgColor: { rgb: "1A73E8" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: { top: {style: "thin", color: {rgb: "DDDDDD"}}, bottom: {style: "thin", color: {rgb: "DDDDDD"}}, left: {style: "thin", color: {rgb: "DDDDDD"}}, right: {style: "thin", color: {rgb: "DDDDDD"}} }
            };
        }
    }

    let totalHang = 0, totalShip = 0;
    
    for (let R = 1; R <= range.e.r; ++R) {
        let isNegative = false;
        
        if (ws[XLSX.utils.encode_cell({c: 3, r: R})]) totalHang += parseFloat(ws[XLSX.utils.encode_cell({c: 3, r: R})].v) || 0;
        if (ws[XLSX.utils.encode_cell({c: 4, r: R})]) totalShip += parseFloat(ws[XLSX.utils.encode_cell({c: 4, r: R})].v) || 0;
        
        let doanhThuCell = ws[XLSX.utils.encode_cell({c: 5, r: R})];
        if (doanhThuCell) {
            let dThu = parseFloat(doanhThuCell.v) || 0;
            if (dThu < 0) isNegative = true;
        }

        for (let C = 0; C <= range.e.c; ++C) {
            const cell_ref = XLSX.utils.encode_cell({c: C, r: R});
            if (!ws[cell_ref]) continue;

            ws[cell_ref].s = {
                font: { sz: 11, color: { rgb: "333333" } },
                border: { top: {style: "thin", color: {rgb: "EEEEEE"}}, bottom: {style: "thin", color: {rgb: "EEEEEE"}}, left: {style: "thin", color: {rgb: "EEEEEE"}}, right: {style: "thin", color: {rgb: "EEEEEE"}} },
                alignment: { vertical: "center" }
            };

            ws[cell_ref].s.fill = { fgColor: { rgb: (R % 2 === 0) ? "F8F9FA" : "FFFFFF" } };

            if (C >= 3 && C <= 5) {
                ws[cell_ref].z = '#,##0'; 
                if (C === 4) ws[cell_ref].s.font.color = { rgb: "D93025" };
                if (C === 5) {
                    ws[cell_ref].s.font.bold = true;
                    if (isNegative) {
                        ws[cell_ref].s.font.color = { rgb: "D93025" };
                        ws[cell_ref].s.fill = { fgColor: { rgb: "FCE8E6" } };
                    } else {
                        ws[cell_ref].s.font.color = { rgb: "137333" };
                    }
                }
            }
        }
    }

    let totalThu = totalHang - totalShip;

    XLSX.utils.sheet_add_aoa(ws, [
        ["TỔNG CỘNG:", "", "", totalHang, totalShip, totalThu]
    ], { origin: -1 }); 

    const newEndRow = range.e.r + 1;
    for (let C = 0; C <= 5; ++C) {
        const cell_ref = XLSX.utils.encode_cell({c: C, r: newEndRow});
        if (ws[cell_ref]) {
            ws[cell_ref].s = {
                font: { bold: true, sz: 12, color: { rgb: "D93025" } },
                fill: { fgColor: { rgb: "FFFCFC" } },
                border: { top: {style: "medium", color: {rgb: "D93025"}} }
            };
            if (C >= 3) ws[cell_ref].z = '#,##0'; 
            if (C === 0) ws[cell_ref].s.alignment = { horizontal: "right" }; 
            if (C === 5) ws[cell_ref].s.font.color = { rgb: "137333" }; 
        }
    }
    
    ws['!merges'] = [ { s: { r: newEndRow, c: 0 }, e: { r: newEndRow, c: 2 } } ];
    ws['!ref'] = XLSX.utils.encode_range({ s: {c: 0, r: 0}, e: {c: 5, r: newEndRow} });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DoiSoat_TMDT");
    
    const dateStr = new Date().toISOString().slice(0, 10);
    try {
        XLSX.writeFile(wb, `BaoCao_DoiSoat_TMDT_${dateStr}.xlsx`);
        thongBao("✅ Đã xuất báo cáo TMĐT thành công!");
    } catch (e) {
        console.error(e);
        thongBao("⚠️ Đang dùng hàm xuất thô để chống lỗi trình duyệt...");
        XLSX.writeFile(wb, `BaoCao_DoiSoat_TMDT_${dateStr}.xlsx`); 
    }
};

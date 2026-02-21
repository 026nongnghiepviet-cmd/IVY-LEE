/**
 * E-COMMERCE RECONCILE MODULE (V3 - SCALABLE & STICKY FOOTER)
 * - Tự động render giao diện vào khung #page-ecom.
 * - Sẵn sàng mở rộng cho Shopee, Tiktok, Lazada...
 */

document.addEventListener('DOMContentLoaded', initEcomModule);

function initEcomModule() {
    console.log("E-commerce Module Loaded");
    const container = document.getElementById('page-ecom');
    if (!container) return;

    container.innerHTML = `
        <style>
            /* Code CSS ghim dòng Tổng cộng xuống đáy bảng */
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
        </style>

        <div class="section-box">
            <div class="section-title">
                🛒 CÔNG CỤ ĐỐI SOÁT ĐƠN HÀNG TMĐT 
                <span class="platform-badge">Bản Shopee</span>
            </div>
            
            <div style="background:#f8f9fa; padding:20px; border-radius:8px; border:1px solid #eee; margin-bottom:20px; display:flex; gap:20px; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">1. Tải file Chi tiết giao dịch (Transaction Report):</label>
                    <input type="file" id="fileTransactions" accept=".csv, .xlsx, .xls" style="border:1px dashed #1a73e8; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">2. Tải file Đơn hàng (Orders):</label>
                    <input type="file" id="fileOrders" accept=".csv, .xlsx, .xls" style="border:1px dashed #1a73e8; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
            </div>
            
            <button class="btn-ecom-action" onclick="window.processEcomFiles()">
                ⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT
            </button>

            <div id="ecomResultContainer" style="display:none; animation: fadeIn 0.3s; margin-top:30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">
                    <div style="font-weight:900; color:#1a73e8; font-size:15px; text-transform:uppercase;">
                        📊 BẢNG KẾT QUẢ ĐỐI SOÁT
                    </div>
                    <button class="btn-export-excel" onclick="window.exportEcomExcel()">
                        <span style="font-size: 16px;">📥</span> Xuất File Excel
                    </button>
                </div>

                <div class="table-responsive" style="max-height: 450px; overflow-y: auto; position: relative;">
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

// Biến toàn cục để lưu dữ liệu xuất Excel
window.ecomExportData = [];

// Hàm đọc file Excel
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

// Hàm xử lý dữ liệu lõi
window.processEcomFiles = async function() {
    const fileTransInput = document.getElementById('fileTransactions').files[0];
    const fileOrdersInput = document.getElementById('fileOrders').files[0];
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!fileTransInput || !fileOrdersInput) {
        thongBao("⚠️ Vui lòng tải lên đầy đủ cả 2 file để đối soát!");
        return;
    }

    try {
        const btn = document.querySelector('#page-ecom .btn-ecom-action');
        btn.innerHTML = "⏳ Đang tính toán...";
        btn.disabled = true;

        const transactionsData = await window.readEcomFile(fileTransInput);
        const ordersData = await window.readEcomFile(fileOrdersInput);

        const ordersMap = {};
        // Hiện tại dùng Format cột của Shopee, sau này có thể chèn thêm IF cho TikTok/Lazada
        ordersData.forEach(order => {
            let maDon = order['Mã đơn hàng'] ? order['Mã đơn hàng'].toString().trim() : "";
            if (maDon) {
                let giaBan = parseFloat(order['Tổng giá bán (sản phẩm)']) || 0;
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

        let tongTienHangTatCa = 0;
        let tongPhiShipTatCa = 0;
        let tongDoanhThuTatCa = 0;

        transactionsData.forEach(trans => {
            let maDonTrans = trans['Mã đơn hàng'] ? trans['Mã đơn hàng'].toString().trim() : "";
            let dongTien = trans['Dòng tiền'] ? trans['Dòng tiền'].toString().trim() : "";
            let soTienTrans = parseFloat(trans['Số tiền']) || 0;
            
            let tenKhachHang = "";
            let maVanDon = "";
            let soDienThoai = ""; 
            let tienHang = 0;
            let phiShip = 0;

            if (maDonTrans === "" || maDonTrans === "-" || dongTien.toLowerCase() === "tiền ra") {
                phiShip = 1620;
                tienHang = 0; 
                if (maDonTrans !== "" && maDonTrans !== "-" && ordersMap[maDonTrans]) {
                    let order = ordersMap[maDonTrans];
                    tenKhachHang = order.tenKhachHang;
                    maVanDon = order.maVanDon;
                }
            } else {
                let order = ordersMap[maDonTrans];
                if (order) {
                    tenKhachHang = order.tenKhachHang;
                    maVanDon = order.maVanDon;
                    tienHang = order.tongTienHang;
                    phiShip = tienHang - soTienTrans;
                } else {
                    phiShip = 0 - soTienTrans;
                }
            }

            let doanhThu = tienHang - phiShip;

            tongTienHangTatCa += tienHang;
            tongPhiShipTatCa += phiShip;
            tongDoanhThuTatCa += doanhThu;

            // Đẩy dữ liệu vào mảng Excel
            window.ecomExportData.push({
                "Tên khách hàng": tenKhachHang,
                "Mã vận đơn": maVanDon,
                "Số điện thoại": soDienThoai,
                "Tiền hàng (VNĐ)": tienHang,
                "Phí ship NVC (VNĐ)": phiShip,
                "Doanh thu (VNĐ)": doanhThu
            });

            // Hiển thị ra bảng HTML
            const tr = document.createElement("tr");
            let doanhThuColor = doanhThu < 0 ? "color:#d93025; background:#fce8e6; font-weight:bold;" : "color:#137333; font-weight:bold;";
            
            tr.innerHTML = `
                <td>${tenKhachHang}</td>
                <td>${maVanDon}</td>
                <td>${soDienThoai}</td>
                <td style="text-align:right;">${tienHang > 0 ? new Intl.NumberFormat('vi-VN').format(tienHang) : (tienHang === 0 ? "0" : "")}</td>
                <td style="text-align:right; color:#666;">${new Intl.NumberFormat('vi-VN').format(phiShip)}</td>
                <td style="text-align:right; ${doanhThuColor}">${new Intl.NumberFormat('vi-VN').format(doanhThu)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Vẽ dòng Footer 
        const trTotal = document.createElement("tr");
        trTotal.innerHTML = `
            <th colspan="3" style="text-align: right; color:#d93025; font-size:12px;">TỔNG CỘNG:</th>
            <th style="text-align:right; font-size:13px; color:#333;">${new Intl.NumberFormat('vi-VN').format(tongTienHangTatCa)}</th>
            <th style="text-align:right; font-size:13px; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(tongPhiShipTatCa)}</th>
            <th style="text-align:right; font-size:14px; color:#137333;">${new Intl.NumberFormat('vi-VN').format(tongDoanhThuTatCa)}</th>
        `;
        tfoot.appendChild(trTotal);

        document.getElementById('ecomResultContainer').style.display = 'block';
        
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT";
        btn.disabled = false;
        thongBao("✅ Đã xử lý đối soát xong!");

    } catch (error) {
        console.error(error);
        thongBao("❌ Có lỗi xảy ra. Hãy kiểm tra lại file của bạn!");
        const btn = document.querySelector('#page-ecom .btn-ecom-action');
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT";
        btn.disabled = false;
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

    let totalHang = 0, totalShip = 0, totalThu = 0;
    
    for (let R = 1; R <= range.e.r; ++R) {
        let isNegative = false;
        
        if (ws[XLSX.utils.encode_cell({c: 3, r: R})]) totalHang += parseFloat(ws[XLSX.utils.encode_cell({c: 3, r: R})].v) || 0;
        if (ws[XLSX.utils.encode_cell({c: 4, r: R})]) totalShip += parseFloat(ws[XLSX.utils.encode_cell({c: 4, r: R})].v) || 0;
        
        let doanhThuCell = ws[XLSX.utils.encode_cell({c: 5, r: R})];
        if (doanhThuCell) {
            let dThu = parseFloat(doanhThuCell.v) || 0;
            totalThu += dThu;
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

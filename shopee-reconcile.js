/**
 * SHOPEE RECONCILE MODULE (ĐỘC LẬP - BẢN CHUẨN)
 */
document.addEventListener('DOMContentLoaded', initShopeeModule);

function initShopeeModule() {
    const container = document.getElementById('page-shopee');
    if (!container || container.innerHTML.includes('section-box')) return; 

    container.innerHTML = `
        <style>
            #shopeeResultTable tfoot th { position: sticky; bottom: -1px; z-index: 10; background: #fffcfc; border-top: 2px solid #d93025 !important; box-shadow: 0 -4px 6px rgba(0,0,0,0.05); }
            .btn-shopee-action { background: #ee4d2d; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .btn-shopee-action:hover { opacity: 0.9; transform: translateY(-2px); }
            .platform-badge { display:inline-block; background:#ee4d2d; color:#fff; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:bold; margin-left:10px; vertical-align:middle;}
            .btn-edit-shopee { background: #f4b400; color: #000; border: none; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; box-shadow: 0 2px 6px rgba(244,180,0,0.2); text-transform: uppercase; }
            .btn-edit-shopee:hover { background: #d49c00; transform: translateY(-2px); }
            .edit-input-shopee { width: 100%; padding: 6px; border: 2px solid #ee4d2d; border-radius: 4px; font-weight: bold; text-align: right; outline: none; box-sizing: border-box; font-family: sans-serif;}
            .edit-input-shopee:focus { background: #fdf2f0; }
            
            /* TABS */
            .platform-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .platform-tab { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 2px solid transparent; background: #f8f9fa; color: #555; transition: 0.2s; display: flex; align-items: center; gap: 8px; fill: #555; }
            .platform-tab.tab-shopee.active { background: #fdf2f0; color: #ee4d2d; border-color: #ee4d2d; fill: #ee4d2d; box-shadow: 0 4px 10px rgba(238,77,45,0.1); }
            .platform-tab.tab-tiktok:hover { background: #f0f0f0; color: #000; fill: #000; }
            
            .cell-doanhthu { transition: all 0.2s ease; }
        </style>

        <div class="section-box">
            <div class="section-title">
                🛒 CÔNG CỤ ĐỐI SOÁT ĐƠN HÀNG TMĐT <span class="platform-badge">Bản Shopee</span>
            </div>

            <div class="platform-tabs">
                <div class="platform-tab tab-shopee active">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8.2 8.4l-.8-3.4c-.1-.5.3-1 1-1h6.6c.6 0 1.1.5 1 1l-.8 3.4h-7zM20 9.5v9c0 1.9-1.5 3.5-3.5 3.5h-9C5.5 22 4 20.4 4 18.5v-9c0-1.4 1.1-2.5 2.5-2.5h11c1.4 0 2.5 1.1 2.5 2.5zM12 18.2c2.4 0 4.1-1.3 4.1-3.2 0-2.3-2.1-2.6-3.8-3-.9-.2-1.3-.5-1.3-1s.6-1 1.5-1c.9 0 2 .5 2.5 1.2l1.3-1.6c-.9-1.1-2.2-1.6-3.7-1.6-2 0-3.8 1-3.8 3 0 2.2 2 2.6 3.8 3 .9.2 1.4.5 1.4 1s-.7 1-1.6 1c-1.1 0-2.3-.6-3-1.6l-1.4 1.4c1 1.5 2.5 2.4 4 2.4z"/></svg> Shopee
                </div>
                <div class="platform-tab tab-tiktok" onclick="window.goPage('tiktok')">
                    <svg viewBox="0 0 448 512" width="16" height="16"><path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z"/></svg> TikTok Shop
                </div>
            </div>
            
            <div style="background:#f8f9fa; padding:20px; border-radius:8px; border:1px solid #eee; margin-bottom:20px; display:flex; gap:20px; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">1. Tải file Chi tiết giao dịch (Transaction Report):</label>
                    <input type="file" id="fileTransShopee" accept=".csv, .xlsx, .xls" style="border:1px dashed #ccc; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">2. Tải các file Đơn hàng (Cho phép chọn nhiều file):</label>
                    <input type="file" id="fileOrdersShopee" accept=".csv, .xlsx, .xls" multiple style="border:1px dashed #ccc; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                <button class="btn-shopee-action" id="btn-process-shopee" onclick="window.processShopeeData()">⚙️ XỬ LÝ DỮ LIỆU SHOPEE</button>
                <span style="color: #d93025; font-size: 13px; font-style: italic; background: #fce8e6; padding: 8px 15px; border-radius: 6px; border: 1px dashed #fad2cf;">⚠️ <b>Lưu ý:</b> Hệ thống sẽ không lưu lại dữ liệu, vui lòng xuất dữ liệu về máy.</span>
            </div>

            <div id="shopeeResultContainer" style="display:none; animation: fadeIn 0.3s; margin-top:30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <div style="font-weight:900; color:#1a73e8; font-size:15px; text-transform:uppercase;">
                        📊 KẾT QUẢ ĐỐI SOÁT <span style="color:#ee4d2d;">(SHOPEE)</span> <span id="shopee-count-badge" style="font-size:11px; color:#666; font-weight:normal; margin-left:10px;"></span>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-edit-shopee" id="btn-shopee-edit" onclick="window.toggleShopeeEditMode()">✏️ Sửa Dữ Liệu</button>
                        <button class="btn-export-excel" onclick="window.exportShopeeExcel()" style="background:#137333; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow:0 2px 6px rgba(19,115,51,0.2);">📥 Xuất File Excel</button>
                    </div>
                </div>

                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; position: relative;">
                    <table class="ads-table" id="shopeeResultTable">
                        <thead>
                            <tr style="background:#fdf2f0; color:#ee4d2d;">
                                <th>Tên khách hàng</th>
                                <th>Mã vận đơn</th>
                                <th>Số điện thoại</th>
                                <th style="text-align:right;">Tiền hàng</th>
                                <th style="text-align:right;">Phí ship NVC thu</th>
                                <th style="text-align:right;">Doanh thu</th>
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

window.shopeeExportData = [];
window.isShopeeEditing = false;

window.readShopeeExcelFile = function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(worksheet, { defval: "" }));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

window.processShopeeData = async function() {
    const fileTrans = document.getElementById('fileTransShopee').files[0];
    const fileOrders = document.getElementById('fileOrdersShopee').files;
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!fileTrans || fileOrders.length === 0) return thongBao("⚠️ Vui lòng tải lên đủ file Shopee trước khi xử lý!");

    try {
        const btn = document.getElementById('btn-process-shopee');
        btn.innerHTML = "⏳ Đang đọc và gộp dữ liệu..."; 
        btn.disabled = true;

        const transactionsData = await window.readShopeeExcelFile(fileTrans);
        const allOrders = await Promise.all(Array.from(fileOrders).map(f => window.readShopeeExcelFile(f)));
        const ordersData = allOrders.flat();

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

        window.shopeeExportData = [];
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

                window.shopeeExportData.push({
                    "Tên khách hàng": tenKhachHang,
                    "Mã vận đơn": maVanDon,
                    "Số điện thoại": soDienThoai,
                    "Tiền hàng (VNĐ)": tienHang,
                    "Phí ship NVC (VNĐ)": phiShip,
                    "Doanh thu (VNĐ)": doanhThu
                });
            }
        });

        if (window.isShopeeEditing) window.toggleShopeeEditMode();
        window.renderShopeeTable();

        document.getElementById('shopee-count-badge').innerText = `(Khớp ${recordCount} dòng dữ liệu)`;
        document.getElementById('shopeeResultContainer').style.display = 'block';
        
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU SHOPEE"; 
        btn.disabled = false;
        thongBao(`✅ Đã đối soát thành công ${recordCount} giao dịch hợp lệ!`);

    } catch (error) { 
        console.error(error); 
        thongBao("❌ Lỗi cấu trúc file Shopee!"); 
        const btn = document.getElementById('btn-process-shopee');
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU SHOPEE";
        btn.disabled = false; 
    }
};

window.renderShopeeTable = function() {
    const tbody = document.querySelector("#shopeeResultTable tbody");
    const tfoot = document.querySelector("#shopeeResultTable tfoot");
    tbody.innerHTML = ""; 

    let tongTienHangTatCa = 0;
    let tongPhiShipTatCa = 0;
    let tongDoanhThuTatCa = 0;

    window.shopeeExportData.forEach((row, index) => {
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
            <th colspan="3" style="text-align: right; color:#d93025; font-size:12px;">TỔNG CỘNG SHOPEE:</th>
            <th style="text-align:right; font-size:13px; color:#333;">${new Intl.NumberFormat('vi-VN').format(tongTienHangTatCa)}</th>
            <th style="text-align:right; font-size:13px; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(tongPhiShipTatCa)}</th>
            <th style="text-align:right; font-size:14px; color:#137333;">${new Intl.NumberFormat('vi-VN').format(tongDoanhThuTatCa)}</th>
        </tr>
    `;
};

window.toggleShopeeEditMode = function() {
    const btnEdit = document.getElementById("btn-shopee-edit");
    const tbody = document.querySelector("#shopeeResultTable tbody");
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!window.shopeeExportData || window.shopeeExportData.length === 0) {
        thongBao("⚠️ Chưa có dữ liệu để sửa!");
        return;
    }

    if (!window.isShopeeEditing) {
        window.isShopeeEditing = true;
        btnEdit.innerHTML = `<span style="font-size: 16px;">💾</span> LƯU DỮ LIỆU LẠI`;
        btnEdit.style.background = "#137333";
        btnEdit.style.color = "#fff";

        const rows = tbody.querySelectorAll("tr");
        rows.forEach((tr, index) => {
            const dataRow = window.shopeeExportData[index];
            const cellTienHang = tr.querySelector(".cell-tienhang");
            const cellPhiShip = tr.querySelector(".cell-phiship");
            
            cellTienHang.innerHTML = `<input type="number" class="edit-input-shopee input-tienhang" value="${dataRow["Tiền hàng (VNĐ)"]}" oninput="window.liveCalculateShopee()">`;
            cellPhiShip.innerHTML = `<input type="number" class="edit-input-shopee input-phiship" value="${dataRow["Phí ship NVC (VNĐ)"]}" oninput="window.liveCalculateShopee()">`;
        });

        window.liveCalculateShopee(true); 
        thongBao("✏️ Đang ở chế độ chỉnh sửa. Gõ tới đâu, Doanh thu tự nhảy tới đó!");

    } else {
        window.isShopeeEditing = false;
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
                
                window.shopeeExportData[index]["Tiền hàng (VNĐ)"] = newValTienHang;
                window.shopeeExportData[index]["Phí ship NVC (VNĐ)"] = newValPhiShip;
                window.shopeeExportData[index]["Doanh thu (VNĐ)"] = newValTienHang - newValPhiShip;
            }
        });

        window.renderShopeeTable();
        thongBao("✅ Đã lưu số liệu mới vào hệ thống chuẩn bị Xuất Excel!");
    }
};

window.liveCalculateShopee = function(isInit = false) {
    const tbody = document.querySelector("#shopeeResultTable tbody");
    const tfoot = document.querySelector("#shopeeResultTable tfoot");
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

            liveTienHang += valHang;
            livePhiShip += valShip;
            liveDoanhThu += valThu;

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

window.exportShopeeExcel = function() {
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!window.shopeeExportData || window.shopeeExportData.length === 0) {
        thongBao("⚠️ Không có dữ liệu để xuất! Hãy bấm Xử lý dữ liệu trước.");
        return;
    }

    if (window.isShopeeEditing) {
        thongBao("⚠️ Bạn đang ở chế độ Sửa. Hãy bấm nút [LƯU DỮ LIỆU LẠI] màu xanh trước khi xuất file!");
        return;
    }

    if (window.EXCEL_STYLE_LOADED !== true) {
        thongBao("⏳ Đang tải thư viện Excel, vui lòng bấm lại sau 1 giây...");
        return;
    }

    const ws = XLSX.utils.json_to_sheet(window.shopeeExportData);
    ws['!cols'] = [ { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 20 } ];

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_ref = XLSX.utils.encode_cell({c: C, r: 0});
        if (ws[cell_ref]) {
            ws[cell_ref].s = {
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
                fill: { fgColor: { rgb: "EE4D2D" } },
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
        ["TỔNG CỘNG SHOPEE:", "", "", totalHang, totalShip, totalThu]
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
    XLSX.utils.book_append_sheet(wb, ws, "Shopee_DoiSoat");
    
    const dateStr = new Date().toISOString().slice(0, 10);
    try {
        XLSX.writeFile(wb, `BaoCao_Shopee_${dateStr}.xlsx`);
        thongBao("✅ Đã xuất báo cáo Shopee thành công!");
    } catch (e) {
        console.error(e);
        thongBao("⚠️ Đang dùng hàm xuất thô để chống lỗi trình duyệt...");
        XLSX.writeFile(wb, `BaoCao_Shopee_${dateStr}.xlsx`); 
    }
};

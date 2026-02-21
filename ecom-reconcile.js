/**
 * E-COMMERCE RECONCILE MODULE (V8 - MULTI-PLATFORM TABS)
 * - Tách biệt hoàn toàn logic Shopee và TikTok.
 * - Giao diện chuyển Tab mượt mà.
 * - Giữ nguyên Real-time, Multi-file upload, Export Excel.
 */

document.addEventListener('DOMContentLoaded', initEcomModule);

function initEcomModule() {
    console.log("E-commerce Module V8 Loaded");
    const container = document.getElementById('page-ecom');
    if (!container) return;

    container.innerHTML = `
        <style>
            #ecomResultTable tfoot th { 
                position: sticky; bottom: -1px; z-index: 10; background: #fffcfc; 
                border-top: 2px solid #d93025 !important; box-shadow: 0 -4px 6px rgba(0,0,0,0.05); 
            }
            .btn-ecom-action { background: #1a73e8; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(26,115,232,0.2); }
            .btn-ecom-action:hover { background: #1557b0; transform: translateY(-2px); }
            .btn-edit-data { background: #f4b400; color: #000; border: none; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; box-shadow: 0 2px 6px rgba(244,180,0,0.2); text-transform: uppercase; }
            .btn-edit-data:hover { background: #d49c00; transform: translateY(-2px); }
            .edit-input { width: 100%; padding: 6px; border: 2px solid #1a73e8; border-radius: 4px; font-weight: bold; text-align: right; outline: none; box-sizing: border-box; font-family: sans-serif;}
            .edit-input:focus { background: #e8f0fe; }
            .cell-doanhthu { transition: all 0.2s ease; }

            /* CSS CHO TAB NỀN TẢNG */
            .platform-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .platform-tab { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 2px solid transparent; background: #f8f9fa; color: #555; transition: 0.2s; display: flex; align-items: center; gap: 8px;}
            .platform-tab:hover { background: #e8f0fe; color: #1a73e8; }
            .platform-tab.active { background: #e8f0fe; color: #1a73e8; border-color: #1a73e8; box-shadow: 0 4px 10px rgba(26,115,232,0.1); }
            .shopee-icon { color: #ee4d2d; font-size: 18px; }
            .tiktok-icon { color: #000000; font-size: 18px; }
        </style>

        <div class="section-box">
            <div class="section-title">
                🛒 CÔNG CỤ ĐỐI SOÁT ĐƠN HÀNG TMĐT 
            </div>

            <div class="platform-tabs">
                <div class="platform-tab active" id="tab-shopee" onclick="window.switchEcomPlatform('shopee')">
                    <span class="shopee-icon">🛍️</span> Shopee
                </div>
                <div class="platform-tab" id="tab-tiktok" onclick="window.switchEcomPlatform('tiktok')">
                    <span class="tiktok-icon">🎵</span> TikTok Shop
                </div>
            </div>
            
            <div style="background:#f8f9fa; padding:20px; border-radius:8px; border:1px solid #eee; margin-bottom:20px; display:flex; gap:20px; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">1. Tải file Chi tiết giao dịch (<span id="lbl-trans">Transaction Report</span>):</label>
                    <input type="file" id="fileTransactions" accept=".csv, .xlsx, .xls" style="border:1px dashed #1a73e8; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">2. Tải các file Đơn hàng (<span id="lbl-orders">Orders</span>):</label>
                    <input type="file" id="fileOrders" accept=".csv, .xlsx, .xls" multiple style="border:1px dashed #1a73e8; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                <button class="btn-ecom-action" id="btn-process-ecom" onclick="window.processEcomRouter()">
                    ⚙️ XỬ LÝ DỮ LIỆU SHOPEE
                </button>
                <span style="color: #d93025; font-size: 13px; font-style: italic; background: #fce8e6; padding: 8px 15px; border-radius: 6px; border: 1px dashed #fad2cf;">
                    ⚠️ <b>Lưu ý:</b> Hệ thống sẽ không lưu lại dữ liệu, vui lòng xuất dữ liệu về máy để lưu trữ.
                </span>
            </div>

            <div id="ecomResultContainer" style="display:none; animation: fadeIn 0.3s; margin-top:30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <div style="font-weight:900; color:#1a73e8; font-size:15px; text-transform:uppercase;">
                        📊 KẾT QUẢ ĐỐI SOÁT <span id="ecom-platform-badge" style="color:#ee4d2d;">(SHOPEE)</span> <span id="ecom-count-badge" style="font-size:11px; color:#666; font-weight:normal; margin-left:10px;"></span>
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

// Biến toàn cục
window.currentEcomPlatform = 'shopee'; // Mặc định là Shopee
window.ecomExportData = [];
window.isEcomEditing = false;

// Hàm chuyển đổi Tab
window.switchEcomPlatform = function(platform) {
    window.currentEcomPlatform = platform;
    
    // Cập nhật giao diện Tab
    document.getElementById('tab-shopee').classList.remove('active');
    document.getElementById('tab-tiktok').classList.remove('active');
    document.getElementById('tab-' + platform).classList.add('active');

    // Đổi tên nút bấm và nhãn
    const btn = document.getElementById('btn-process-ecom');
    const badge = document.getElementById('ecom-platform-badge');
    
    if (platform === 'shopee') {
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU SHOPEE";
        badge.innerText = "(SHOPEE)";
        badge.style.color = "#ee4d2d";
    } else if (platform === 'tiktok') {
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU TIKTOK";
        badge.innerText = "(TIKTOK)";
        badge.style.color = "#000000";
    }

    // Reset lại bảng và ô input
    document.getElementById('fileTransactions').value = "";
    document.getElementById('fileOrders').value = "";
    document.getElementById('ecomResultContainer').style.display = 'none';
    window.ecomExportData = [];
    if (window.isEcomEditing) window.toggleEcomEditMode();
};

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

// ==========================================
// BỘ ĐỊNH TUYẾN (ROUTER)
// ==========================================
window.processEcomRouter = async function() {
    const fileTransInput = document.getElementById('fileTransactions').files[0];
    const fileOrdersInputs = document.getElementById('fileOrders').files;
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!fileTransInput || fileOrdersInputs.length === 0) {
        thongBao("⚠️ Vui lòng tải lên file Chi tiết giao dịch và ít nhất 1 file Đơn hàng!");
        return;
    }

    const btn = document.getElementById('btn-process-ecom');
    const oldBtnText = btn.innerHTML;
    btn.innerHTML = "⏳ Đang đọc và gộp dữ liệu...";
    btn.disabled = true;

    try {
        // Đọc chung file cho mọi nền tảng
        const transactionsData = await window.readEcomFile(fileTransInput);
        const orderPromises = Array.from(fileOrdersInputs).map(file => window.readEcomFile(file));
        const allOrdersDataArrays = await Promise.all(orderPromises);
        const ordersData = allOrdersDataArrays.flat();

        btn.innerHTML = "⏳ Đang tính toán đối soát...";

        // Rẽ nhánh logic tùy theo nền tảng
        if (window.currentEcomPlatform === 'shopee') {
            await window.processShopeeData(transactionsData, ordersData);
        } else if (window.currentEcomPlatform === 'tiktok') {
            await window.processTiktokData(transactionsData, ordersData);
        }

        // Sau khi xử lý xong, Render chung 1 bảng
        if (window.isEcomEditing) window.toggleEcomEditMode(); // Hủy edit nếu đang bật
        window.renderEcomTable();
        document.getElementById('ecomResultContainer').style.display = 'block';
        
        btn.innerHTML = oldBtnText;
        btn.disabled = false;
        thongBao(`✅ Đã đối soát thành công ${window.ecomExportData.length} giao dịch hợp lệ!`);

    } catch (error) {
        console.error(error);
        thongBao("❌ Có lỗi xảy ra trong lúc đọc file. Hãy kiểm tra lại định dạng file!");
        btn.innerHTML = oldBtnText;
        btn.disabled = false;
    }
};

// ==========================================
// LOGIC XỬ LÝ DỮ LIỆU SHOPEE (GIỮ NGUYÊN HOÀN HẢO)
// ==========================================
window.processShopeeData = async function(transactionsData, ordersData) {
    window.ecomExportData = [];

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

            // Đẩy vào mảng chung
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
    
    document.getElementById('ecom-count-badge').innerText = `(Khớp ${window.ecomExportData.length} dòng)`;
};

// ==========================================
// LOGIC XỬ LÝ DỮ LIỆU TIKTOK (CHỜ PHÁT TRIỂN)
// ==========================================
window.processTiktokData = async function(transactionsData, ordersData) {
    window.ecomExportData = [];
    
    // GHI CHÚ CHO BẠN:
    // Sau này khi làm TikTok, bạn chỉ cần code thuật toán map tên cột của file Excel TikTok ở đây.
    // Cuối cùng, push dữ liệu vào window.ecomExportData theo format chuẩn:
    /*
        window.ecomExportData.push({
            "Tên khách hàng": ten,
            "Mã vận đơn": ma_van_don,
            "Số điện thoại": sdt,
            "Tiền hàng (VNĐ)": tien_hang,
            "Phí ship NVC (VNĐ)": phi_ship,
            "Doanh thu (VNĐ)": doanh_thu
        });
    */

    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;
    thongBao("⚠️ Chức năng đối soát TikTok đang được xây dựng (Coming soon)!");
    throw new Error("TikTok Module Not Implemented Yet");
};

// ==========================================
// CÁC HÀM GIAO DIỆN & EXCEL (DÙNG CHUNG CHO MỌI SÀN)
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
            <th colspan="3" style="text-align: right; color:#d93025; font-size:12px;">TỔNG CỘNG (${window.currentEcomPlatform.toUpperCase()}):</th>
            <th style="text-align:right; font-size:13px; color:#333;">${new Intl.NumberFormat('vi-VN').format(tongTienHangTatCa)}</th>
            <th style="text-align:right; font-size:13px; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(tongPhiShipTatCa)}</th>
            <th style="text-align:right; font-size:14px; color:#137333;">${new Intl.NumberFormat('vi-VN').format(tongDoanhThuTatCa)}</th>
        </tr>
    `;
};

window.toggleEcomEditMode = function() {
    const btnEdit = document.getElementById("btn-ecom-edit");
    const tbody = document.querySelector("#ecomResultTable tbody");
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!window.ecomExportData || window.ecomExportData.length === 0) {
        thongBao("⚠️ Chưa có dữ liệu để sửa!");
        return;
    }

    if (!window.isEcomEditing) {
        window.isEcomEditing = true;
        btnEdit.innerHTML = `<span style="font-size: 16px;">💾</span> LƯU DỮ LIỆU LẠI`;
        btnEdit.style.background = "#137333";
        btnEdit.style.color = "#fff";

        const rows = tbody.querySelectorAll("tr");
        rows.forEach((tr, index) => {
            const dataRow = window.ecomExportData[index];
            const cellTienHang = tr.querySelector(".cell-tienhang");
            const cellPhiShip = tr.querySelector(".cell-phiship");
            
            cellTienHang.innerHTML = `<input type="number" class="edit-input input-tienhang" value="${dataRow["Tiền hàng (VNĐ)"]}" oninput="window.liveCalculateEcom()">`;
            cellPhiShip.innerHTML = `<input type="number" class="edit-input input-phiship" value="${dataRow["Phí ship NVC (VNĐ)"]}" oninput="window.liveCalculateEcom()">`;
        });

        window.liveCalculateEcom(true); 
        thongBao("✏️ Đang ở chế độ chỉnh sửa. Gõ tới đâu, Doanh thu tự nhảy tới đó!");

    } else {
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
        let textWarning = isInit ? "TỔNG CỘNG (ĐANG SỬA...):" : `TỔNG CỘNG (${window.currentEcomPlatform.toUpperCase()}):`;
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
        [`TỔNG CỘNG (${window.currentEcomPlatform.toUpperCase()}):`, "", "", totalHang, totalShip, totalThu]
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
    XLSX.utils.book_append_sheet(wb, ws, "DoiSoat");
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const platformName = window.currentEcomPlatform.toUpperCase();
    try {
        XLSX.writeFile(wb, `BaoCao_DoiSoat_${platformName}_${dateStr}.xlsx`);
        thongBao(`✅ Đã xuất báo cáo ${platformName} thành công!`);
    } catch (e) {
        console.error(e);
        thongBao("⚠️ Đang dùng hàm xuất thô để chống lỗi trình duyệt...");
        XLSX.writeFile(wb, `BaoCao_DoiSoat_${platformName}_${dateStr}.xlsx`); 
    }
};

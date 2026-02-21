/**
 * SHOPEE RECONCILE MODULE
 * - File độc lập xử lý đối soát đơn hàng Shopee.
 * - Tự động render giao diện vào khung #page-shopee.
 */

document.addEventListener('DOMContentLoaded', initShopeeModule);

function initShopeeModule() {
    console.log("Shopee Module Loaded");
    const container = document.getElementById('page-shopee');
    if (!container) return;

    // Tự động vẽ giao diện, sử dụng chung class CSS của hệ thống gốc
    container.innerHTML = `
        <div class="section-box">
            <div class="section-title">🛒 CÔNG CỤ ĐỐI SOÁT PHÍ VẬN CHUYỂN SHOPEE</div>
            
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
            
            <button class="btn btn-save" onclick="window.processShopeeFiles()" style="width:auto; padding:10px 30px; font-size:14px; margin-bottom:20px;">
                ⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT
            </button>

            <div id="shopeeResultContainer" style="display:none; animation: fadeIn 0.3s;">
                <div style="font-weight:800; color:#1a73e8; font-size:14px; margin-bottom:10px; text-transform:uppercase; border-bottom:1px solid #eee; padding-bottom:8px;">
                    Kết quả đối soát
                </div>
                <div class="table-responsive" style="max-height: 500px;">
                    <table class="ads-table" id="shopeeResultTable">
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

// Hàm đọc file Excel
window.readShopeeFile = function(file) {
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

// Hàm xử lý dữ liệu lõi của bạn
window.processShopeeFiles = async function() {
    const fileTransInput = document.getElementById('fileTransactions').files[0];
    const fileOrdersInput = document.getElementById('fileOrders').files[0];

    // Sử dụng hàm showToast của hệ thống nếu có, không thì dùng alert
    const thongBao = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!fileTransInput || !fileOrdersInput) {
        thongBao("⚠️ Vui lòng tải lên đầy đủ cả 2 file của Shopee!");
        return;
    }

    try {
        const btn = document.querySelector('#page-shopee .btn-save');
        const oldText = btn.innerHTML;
        btn.innerHTML = "⏳ Đang tính toán...";
        btn.disabled = true;

        const transactionsData = await window.readShopeeFile(fileTransInput);
        const ordersData = await window.readShopeeFile(fileOrdersInput);

        const ordersMap = {};
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

        const tbody = document.querySelector("#shopeeResultTable tbody");
        const tfoot = document.querySelector("#shopeeResultTable tfoot");
        tbody.innerHTML = ""; 
        tfoot.innerHTML = ""; 

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

            // Hiển thị ra bảng theo style của hệ thống
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

        const trTotal = document.createElement("tr");
        trTotal.style.background = "#fffcfc";
        trTotal.innerHTML = `
            <th colspan="3" style="text-align: right; color:#d93025; font-size:12px;">TỔNG CỘNG:</th>
            <th style="text-align:right; font-size:13px; color:#333;">${new Intl.NumberFormat('vi-VN').format(tongTienHangTatCa)}</th>
            <th style="text-align:right; font-size:13px; color:#d93025;">${new Intl.NumberFormat('vi-VN').format(tongPhiShipTatCa)}</th>
            <th style="text-align:right; font-size:14px; color:#137333;">${new Intl.NumberFormat('vi-VN').format(tongDoanhThuTatCa)}</th>
        `;
        tfoot.appendChild(trTotal);

        document.getElementById('shopeeResultContainer').style.display = 'block';
        
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT";
        btn.disabled = false;
        thongBao("✅ Đã xử lý đối soát xong!");

    } catch (error) {
        console.error(error);
        thongBao("❌ Có lỗi xảy ra. Hãy kiểm tra lại file của bạn!");
        const btn = document.querySelector('#page-shopee .btn-save');
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU ĐỐI SOÁT";
        btn.disabled = false;
    }
};
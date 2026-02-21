/**
 * SHOPEE RECONCILE MODULE (V13 - FINAL ACCOUNTING LOGIC)
 * Sửa lỗi logic dòng phí -1.620đ: Tiền hàng = 0 | Phí ship = 1.620 | Doanh thu = -1.620
 */
document.addEventListener('DOMContentLoaded', initShopeeModule);

function initShopeeModule() {
    const container = document.getElementById('page-shopee');
    if (!container || container.innerHTML.includes('shopee-reconcile-area')) return;

    container.innerHTML = `
        <style>
            #shopeeResultTable tfoot th { position: sticky; bottom: -1px; z-index: 10; background: #fffcfc; border-top: 2px solid #d93025 !important; box-shadow: 0 -4px 6px rgba(0,0,0,0.05); }
            .btn-shopee-action { background: #ee4d2d; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .btn-shopee-action:hover { opacity: 0.9; transform: translateY(-2px); }
            .platform-badge { display:inline-block; background:#ee4d2d; color:#fff; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:bold; margin-left:10px; vertical-align:middle;}
            .btn-edit-shopee { background: #f4b400; color: #000; border: none; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; box-shadow: 0 2px 6px rgba(244,180,0,0.2); text-transform: uppercase; }
            .btn-edit-shopee:hover { background: #d49c00; transform: translateY(-2px); }
            .edit-input-shopee { width: 100%; padding: 6px; border: 2px solid #ee4d2d; border-radius: 4px; font-weight: bold; text-align: right; outline: none; box-sizing: border-box; }
            .platform-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .platform-tab { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 2px solid transparent; background: #f8f9fa; color: #555; transition: 0.2s; display: flex; align-items: center; gap: 8px; fill: #555; }
            .platform-tab.tab-shopee.active { background: #fdf2f0; color: #ee4d2d; border-color: #ee4d2d; fill: #ee4d2d; box-shadow: 0 4px 10px rgba(238,77,45,0.1); }
            .platform-tab.tab-tiktok:hover { background: #f0f0f0; color: #000; fill: #000; }
        </style>

        <div class="section-box" id="shopee-reconcile-area">
            <div class="section-title">🛒 ĐỐI SOÁT SHOPEE <span class="platform-badge">V13 - Logic Chuẩn</span></div>

            <div class="platform-tabs">
                <div class="platform-tab tab-shopee active">🛍️ Shopee</div>
                <div class="platform-tab tab-tiktok" onclick="window.goPage('tiktok')">🎵 TikTok Shop</div>
            </div>
            
            <div style="background:#f8f9fa; padding:20px; border-radius:8px; border:1px solid #eee; margin-bottom:20px; display:flex; gap:20px; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:8px;">1. Tải file Chi tiết giao dịch:</label>
                    <input type="file" id="fileTransShopee" accept=".csv, .xlsx, .xls" style="border:1px dashed #ccc; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:8px;">2. Tải các file Đơn hàng (Cho phép chọn nhiều file):</label>
                    <input type="file" id="fileOrdersShopee" accept=".csv, .xlsx, .xls" multiple style="border:1px dashed #ccc; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer;">
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                <button class="btn-shopee-action" id="btn-process-shopee" onclick="window.processShopeeData()">⚙️ XỬ LÝ ĐỐI SOÁT</button>
                <span style="color: #d93025; font-size: 12px; font-style: italic; background: #fce8e6; padding: 8px 12px; border-radius: 6px;">⚠️ Lưu ý: Hệ thống không lưu dữ liệu, vui lòng xuất Excel về máy.</span>
            </div>

            <div id="shopeeResultContainer" style="display:none; margin-top:30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <div style="font-weight:900; color:#1a73e8; font-size:14px;">📊 BẢNG KẾT QUẢ ĐỐI SOÁT SHOPEE <span id="shopee-count-badge" style="font-weight:normal; color:#666;"></span></div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-edit-shopee" id="btn-shopee-edit" onclick="window.toggleShopeeEditMode()">✏️ Sửa Dữ Liệu</button>
                        <button onclick="window.exportShopeeExcel()" style="background:#137333; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">📥 Xuất Excel</button>
                    </div>
                </div>

                <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                    <table class="ads-table" id="shopeeResultTable">
                        <thead>
                            <tr style="background:#fdf2f0; color:#ee4d2d;">
                                <th>Tên khách hàng</th><th>Mã vận đơn</th><th>Số điện thoại</th><th style="text-align:right;">Tiền hàng</th><th style="text-align:right;">Phí ship NVC</th><th style="text-align:right;">Doanh thu</th>
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

window.readShopeeFile = function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            resolve(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" }));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

window.processShopeeData = async function() {
    const fileTrans = document.getElementById('fileTransShopee').files[0];
    const fileOrders = document.getElementById('fileOrdersShopee').files;
    const toast = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!fileTrans || fileOrders.length === 0) return toast("⚠️ Vui lòng chọn đủ 2 loại file!");

    try {
        const btn = document.getElementById('btn-process-shopee');
        btn.innerHTML = "⏳ Đang xử lý..."; btn.disabled = true;

        const transRows = await window.readShopeeFile(fileTrans);
        const allOrders = await Promise.all(Array.from(fileOrders).map(f => window.readShopeeFile(f)));
        const ordersRows = allOrders.flat();

        const ordersMap = {};
        ordersRows.forEach(row => {
            let id = (row['Mã đơn hàng'] || "").toString().trim();
            if (id) {
                let val = parseFloat((row['Tổng giá bán (sản phẩm)']||"0").toString().replace(/,/g, '')) || 0;
                if (ordersMap[id]) ordersMap[id].total += val;
                else ordersMap[id] = { ten: row['Tên Người nhận']||"", mvd: row['Mã vận đơn']||"", total: val };
            }
        });

        window.shopeeExportData = [];
        transRows.forEach(trans => {
            let id = (trans['Mã đơn hàng'] || "").toString().trim();
            let flow = (trans['Dòng tiền'] || "").toString().trim().toLowerCase();
            let amount = parseFloat((trans['Số tiền']||"0").toString().replace(/,/g, '')) || 0;
            
            // Trường hợp phí ship hoặc tiền ra (không có đơn hàng hoặc ghi rõ tiền ra)
            let isFeeAdjustment = (id === "" || id === "-") || (flow === "tiền ra");
            let order = ordersMap[id];

            if (isFeeAdjustment || order) {
                let ten = "", mvd = "", tienHang = 0, phiShip = 0;
                
                if (isFeeAdjustment) {
                    // LOGIC CHUẨN: Khoản này là chi phí/phí phạt => Tiền hàng = 0
                    // Phí ship NVC = 0 - (-1620) = 1620
                    // Doanh thu = 0 - 1620 = -1620
                    tienHang = 0; 
                    phiShip = Math.abs(amount); 
                    if (order) { ten = order.ten; mvd = order.mvd; }
                } else {
                    // Đơn hàng bình thường
                    ten = order.ten; mvd = order.mvd; tienHang = order.total;
                    phiShip = tienHang - amount;
                }
                
                window.shopeeExportData.push({ 
                    ten, mvd, sdt: "", 
                    hang: tienHang, 
                    ship: phiShip, 
                    thu: tienHang - phiShip 
                });
            }
        });

        window.renderShopeeTable();
        document.getElementById('shopeeResultContainer').style.display = 'block';
        document.getElementById('shopee-count-badge').innerText = `(${window.shopeeExportData.length} dòng)`;
        btn.innerHTML = "⚙️ XỬ LÝ ĐỐI SOÁT"; btn.disabled = false;
        toast("✅ Đối soát hoàn tất!");

    } catch (e) { console.error(e); btn.disabled = false; toast("❌ Lỗi xử lý file!"); }
};

window.renderShopeeTable = function() {
    const tbody = document.querySelector("#shopeeResultTable tbody");
    const tfoot = document.querySelector("#shopeeResultTable tfoot");
    tbody.innerHTML = ""; let tH = 0, tS = 0;

    window.shopeeExportData.forEach((r, i) => {
        tH += r.hang; tS += r.ship;
        let color = r.thu < 0 ? "color:#d93025; background:#fce8e6;" : "color:#137333;";
        tbody.insertAdjacentHTML('beforeend', `<tr><td>${r.ten}</td><td>${r.mvd}</td><td></td><td style="text-align:right;" class="c-h">${r.hang.toLocaleString('vi-VN')}</td><td style="text-align:right;" class="c-s">${r.ship.toLocaleString('vi-VN')}</td><td style="text-align:right;font-weight:bold;${color}" class="c-t">${r.thu.toLocaleString('vi-VN')}</td></tr>`);
    });
    tfoot.innerHTML = `<tr><th colspan="3" style="text-align:right;color:#d93025;">TỔNG CỘNG SHOPEE:</th><th style="text-align:right;" id="tot-h">${tH.toLocaleString('vi-VN')}</th><th style="text-align:right;color:#d93025;" id="tot-s">${tS.toLocaleString('vi-VN')}</th><th style="text-align:right;color:#137333;" id="tot-t">${(tH-tS).toLocaleString('vi-VN')}</th></tr>`;
};

window.toggleShopeeEditMode = function() {
    const btn = document.getElementById("btn-shopee-edit");
    if (!window.isShopeeEditing) {
        window.isShopeeEditing = true;
        btn.innerHTML = "💾 LƯU DỮ LIỆU"; btn.style.background = "#137333"; btn.style.color = "#fff";
        document.querySelectorAll("#shopeeResultTable tbody tr").forEach((tr, i) => {
            let r = window.shopeeExportData[i];
            tr.querySelector(".c-h").innerHTML = `<input type="number" class="edit-input-shopee i-h" value="${r.hang}" oninput="window.liveCalcShopee()">`;
            tr.querySelector(".c-s").innerHTML = `<input type="number" class="edit-input-shopee i-s" value="${r.ship}" oninput="window.liveCalcShopee()">`;
        });
    } else {
        window.isShopeeEditing = false;
        btn.innerHTML = "✏️ Sửa Dữ Liệu"; btn.style.background = "#f4b400"; btn.style.color = "#000";
        document.querySelectorAll("#shopeeResultTable tbody tr").forEach((tr, i) => {
            let h = parseFloat(tr.querySelector(".i-h").value)||0, s = parseFloat(tr.querySelector(".i-s").value)||0;
            window.shopeeExportData[i].hang = h; window.shopeeExportData[i].ship = s; window.shopeeExportData[i].thu = h - s;
        });
        window.renderShopeeTable();
    }
};

window.liveCalcShopee = function() {
    let tH = 0, tS = 0;
    document.querySelectorAll("#shopeeResultTable tbody tr").forEach(tr => {
        let h = parseFloat(tr.querySelector('.i-h').value)||0, s = parseFloat(tr.querySelector('.i-s').value)||0;
        let thu = h - s; tH += h; tS += s;
        let cellT = tr.querySelector('.c-t');
        cellT.innerText = thu.toLocaleString('vi-VN');
        cellT.style.color = thu < 0 ? "#d93025" : "#137333";
        cellT.style.background = thu < 0 ? "#fce8e6" : "transparent";
    });
    document.getElementById('tot-h').innerText = tH.toLocaleString('vi-VN');
    document.getElementById('tot-s').innerText = tS.toLocaleString('vi-VN');
    document.getElementById('tot-t').innerText = (tH - tS).toLocaleString('vi-VN');
};

window.exportShopeeExcel = function() {
    if (window.isShopeeEditing) return alert("Vui lòng ấn LƯU trước khi xuất!");
    const data = window.shopeeExportData.map(r => ({ "Tên khách hàng": r.ten, "Mã vận đơn": r.mvd, "Số điện thoại": "", "Tiền hàng (VNĐ)": r.hang, "Phí ship NVC (VNĐ)": r.ship, "Doanh thu (VNĐ)": r.thu }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Shopee");
    XLSX.writeFile(wb, `BaoCao_Shopee_${new Date().toISOString().slice(0,10)}.xlsx`);
};

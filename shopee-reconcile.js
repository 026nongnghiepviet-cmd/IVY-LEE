/**
 * SHOPEE RECONCILE MODULE (V17 - MODERN UI & PERFECT LOGIC)
 */
document.addEventListener('DOMContentLoaded', initShopeeModule);

function initShopeeModule() {
    const container = document.getElementById('page-shopee');
    if (!container || container.innerHTML.includes('shopee-reconcile-area')) return;

    container.innerHTML = `
        <style>
            /* THIẾT KẾ HIỆN ĐẠI (MODERN UI) */
            #shopee-reconcile-area { font-family: 'Segoe UI', system-ui, sans-serif; }
            
            /* Tabs kiểu thanh gạt iOS */
            .modern-tabs-wrapper { background: #f1f3f4; display: inline-flex; padding: 4px; border-radius: 12px; margin-bottom: 25px; }
            .modern-tab { padding: 10px 30px; border-radius: 8px; font-weight: 700; cursor: pointer; color: #5f6368; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; fill: #5f6368; font-size: 14px; }
            .modern-tab svg { width: 18px; height: 18px; transition: all 0.3s ease; }
            .modern-tab.active.tab-shopee { background: #fff; color: #ee4d2d; fill: #ee4d2d; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .modern-tab.tab-tiktok:hover { color: #000; fill: #000; }

            /* Khu vực Upload Box (Dropzone) hiện đại */
            .upload-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 25px; }
            .modern-upload-box { background: #f8fbff; border: 2px dashed #c2e7ff; border-radius: 16px; padding: 35px 20px; text-align: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; }
            .modern-upload-box:hover { background: #e8f0fe; border-color: #1a73e8; transform: translateY(-3px); box-shadow: 0 8px 20px rgba(26,115,232,0.08); }
            .modern-upload-box .icon { font-size: 36px; margin-bottom: 10px; display: inline-block; transition: transform 0.3s; }
            .modern-upload-box:hover .icon { transform: scale(1.1); }
            .modern-upload-box .title { font-size: 15px; font-weight: 800; color: #3c4043; margin-bottom: 5px; }
            .modern-upload-box .subtitle { font-size: 13px; color: #80868b; }
            .modern-upload-box .file-name { margin-top: 12px; font-size: 13px; font-weight: 700; color: #1a73e8; word-break: break-all; }
            .hidden-file-input { display: none; }

            /* Nút bấm Gradient */
            .btn-shopee-gradient { background: linear-gradient(135deg, #f6412e 0%, #ff6e40 100%); color: white; border: none; padding: 16px 40px; border-radius: 50px; font-weight: 800; font-size: 15px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 6px 15px rgba(246, 65, 46, 0.3); text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 10px; }
            .btn-shopee-gradient:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(246, 65, 46, 0.4); }
            .btn-shopee-gradient:disabled { background: #bdc3c7; box-shadow: none; cursor: not-allowed; transform: none; }

            .warning-banner { background: #fce8e6; border-left: 4px solid #ea4335; padding: 12px 20px; border-radius: 0 8px 8px 0; color: #d93025; font-size: 13px; display: flex; align-items: center; gap: 10px; flex: 1; min-width: 250px;}

            /* Bảng bo góc */
            .modern-table-container { border: 1px solid #e8eaed; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
            #shopeeResultTable th { background: #fdf2f0; color: #ee4d2d; border-bottom: none; }
            #shopeeResultTable tfoot th { position: sticky; bottom: -1px; z-index: 10; background: #fffcfc; border-top: 2px solid #ee4d2d !important; padding: 14px 10px; box-shadow: 0 -5px 15px rgba(0,0,0,0.04); }
            
            .btn-edit-shopee { background: #fef7e0; color: #b06000; border: 1px solid #fde293; padding: 8px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; }
            .btn-edit-shopee:hover { background: #fde293; color: #ea8600; }
            .btn-export-modern { background: #e6f4ea; color: #137333; border: 1px solid #ceead6; padding: 8px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; }
            .btn-export-modern:hover { background: #ceead6; color: #0d5323; }
            .edit-input-shopee { width: 100%; padding: 8px; border: 2px solid #ee4d2d; border-radius: 6px; font-weight: bold; text-align: right; outline: none; background: #fff; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05); }
        </style>

        <div class="section-box" id="shopee-reconcile-area">
            <div class="section-title">🛒 ĐỐI SOÁT ĐƠN HÀNG </div>

            <div class="modern-tabs-wrapper">
                <div class="modern-tab tab-shopee active">
                    <svg viewBox="0 0 24 24"><path d="M8.2 8.4l-.8-3.4c-.1-.5.3-1 1-1h6.6c.6 0 1.1.5 1 1l-.8 3.4h-7zM20 9.5v9c0 1.9-1.5 3.5-3.5 3.5h-9C5.5 22 4 20.4 4 18.5v-9c0-1.4 1.1-2.5 2.5-2.5h11c1.4 0 2.5 1.1 2.5 2.5zM12 18.2c2.4 0 4.1-1.3 4.1-3.2 0-2.3-2.1-2.6-3.8-3-.9-.2-1.3-.5-1.3-1s.6-1 1.5-1c.9 0 2 .5 2.5 1.2l1.3-1.6c-.9-1.1-2.2-1.6-3.7-1.6-2 0-3.8 1-3.8 3 0 2.2 2 2.6 3.8 3 .9.2 1.4.5 1.4 1s-.7 1-1.6 1c-1.1 0-2.3-.6-3-1.6l-1.4 1.4c1 1.5 2.5 2.4 4 2.4z"/></svg> 
                    Nền tảng Shopee
                </div>
                <div class="modern-tab tab-tiktok" onclick="window.goPage('tiktok')">
                    <svg viewBox="0 0 448 512"><path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z"/></svg> 
                    TikTok Shop
                </div>
            </div>
            
            <div class="upload-grid">
                <div class="modern-upload-box" onclick="document.getElementById('fileTransShopee').click()">
                    <span class="icon">📊</span>
                    <div class="title">1. Tải file Chi tiết giao dịch</div>
                    <div class="subtitle">(Transaction Report .xlsx / .csv)</div>
                    <div class="file-name" id="name-trans">Chưa chọn file</div>
                    <input type="file" id="fileTransShopee" class="hidden-file-input" accept=".csv, .xlsx, .xls">
                </div>

                <div class="modern-upload-box" onclick="document.getElementById('fileOrdersShopee').click()">
                    <span class="icon">📦</span>
                    <div class="title">2. Tải các file Đơn hàng</div>
                    <div class="subtitle">(Có thể quét chọn nhiều file cùng lúc)</div>
                    <div class="file-name" id="name-orders">Chưa chọn file</div>
                    <input type="file" id="fileOrdersShopee" class="hidden-file-input" accept=".csv, .xlsx, .xls" multiple>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
                <button class="btn-shopee-gradient" id="btn-process-shopee" onclick="window.processShopeeData()">
                    <span>⚙️</span> XỬ LÝ ĐỐI SOÁT NGAY
                </button>
                <div class="warning-banner">
                    <b>⚠️ BẢO MẬT:</b> Toàn bộ dữ liệu đối soát được xử lý trực tiếp trên máy của bạn và KHÔNG LƯU vào hệ thống. Vui lòng xuất Excel để lưu trữ.
                </div>
            </div>

            <div id="shopeeResultContainer" style="display:none; margin-top:10px; animation: fadeIn 0.4s ease;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap: wrap; gap:10px;">
                    <div style="font-weight:900; color:#1a73e8; font-size:16px; text-transform:uppercase; letter-spacing: 0.5px;">
                        BẢNG KẾT QUẢ ĐỐI SOÁT 
                        <span id="shopee-count-badge" style="font-weight:600; color:#fff; background:#ee4d2d; padding:2px 10px; border-radius:20px; font-size:11px; margin-left:8px; vertical-align:middle;"></span>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-edit-shopee" id="btn-shopee-edit" onclick="window.toggleShopeeEditMode()">
                            <span style="font-size:15px">✏️</span> Sửa Dữ Liệu
                        </button>
                        <button class="btn-export-modern" onclick="window.exportShopeeExcel()">
                            <span style="font-size:15px">📥</span> Xuất File Excel
                        </button>
                    </div>
                </div>

                <div class="modern-table-container">
                    <div class="table-responsive" style="max-height: 500px; border:none; border-radius:0;">
                        <table class="ads-table" id="shopeeResultTable" style="margin:0; width:100%;">
                            <thead>
                                <tr>
                                    <th>Tên khách hàng</th><th>Mã vận đơn</th><th>Số điện thoại</th><th style="text-align:right;">Tiền hàng</th><th style="text-align:right;">Phí ship NVC</th><th style="text-align:right;">Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                            <tfoot></tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Cập nhật tên file khi người dùng tải lên
    document.getElementById('fileTransShopee').addEventListener('change', function(e) {
        let name = e.target.files[0] ? "✅ " + e.target.files[0].name : "Chưa chọn file";
        document.getElementById('name-trans').innerText = name;
        document.getElementById('name-trans').style.color = e.target.files[0] ? "#137333" : "#80868b";
    });

    document.getElementById('fileOrdersShopee').addEventListener('change', function(e) {
        let count = e.target.files.length;
        let text = count > 0 ? `✅ Đã chọn ${count} file đơn hàng` : "Chưa chọn file";
        document.getElementById('name-orders').innerText = text;
        document.getElementById('name-orders').style.color = count > 0 ? "#137333" : "#80868b";
    });
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

    if (!fileTrans || fileOrders.length === 0) return toast("⚠️ Vui lòng chọn đủ 2 loại file trong khu vực tải lên!");

    try {
        const btn = document.getElementById('btn-process-shopee');
        btn.innerHTML = "<span>⏳</span> ĐANG XỬ LÝ DỮ LIỆU..."; btn.disabled = true;

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
            
            let isFeeAdjustment = (id === "" || id === "-") || (flow === "tiền ra");
            let order = ordersMap[id];

            if (isFeeAdjustment || order) {
                let ten = "", mvd = "", tienHang = 0, phiShip = 0;
                if (isFeeAdjustment) {
                    tienHang = 0; 
                    phiShip = Math.abs(amount); 
                    if (order) { ten = order.ten; mvd = order.mvd; }
                } else {
                    ten = order.ten; mvd = order.mvd; tienHang = order.total;
                    phiShip = tienHang - amount;
                }
                window.shopeeExportData.push({ ten, mvd, sdt: "", hang: tienHang, ship: phiShip, thu: tienHang - phiShip });
            }
        });

        window.renderShopeeTable();
        document.getElementById('shopeeResultContainer').style.display = 'block';
        document.getElementById('shopee-count-badge').innerText = `${window.shopeeExportData.length} ĐƠN`;
        btn.innerHTML = "<span>⚙️</span> XỬ LÝ ĐỐI SOÁT NGAY"; btn.disabled = false;
        toast("✅ Đối soát thành công với giao diện mới!");

    } catch (e) { console.error(e); document.getElementById('btn-process-shopee').disabled = false; toast("❌ Lỗi cấu trúc file Excel!"); }
};

window.renderShopeeTable = function() {
    const tbody = document.querySelector("#shopeeResultTable tbody");
    const tfoot = document.querySelector("#shopeeResultTable tfoot");
    tbody.innerHTML = ""; let tH = 0, tS = 0;

    window.shopeeExportData.forEach((r, i) => {
        tH += r.hang; tS += r.ship;
        let color = r.thu < 0 ? "color:#d93025; background:#fce8e6;" : "color:#137333;";
        tbody.insertAdjacentHTML('beforeend', `<tr><td>${r.ten}</td><td>${r.mvd}</td><td></td><td style="text-align:right;" class="c-h">${r.hang.toLocaleString('vi-VN')}</td><td style="text-align:right; color:#666;" class="c-s">${r.ship.toLocaleString('vi-VN')}</td><td style="text-align:right;font-weight:bold;${color}" class="c-t">${r.thu.toLocaleString('vi-VN')}</td></tr>`);
    });
    
    tfoot.innerHTML = `
        <tr>
            <th colspan="3" style="text-align:right; color:#ee4d2d; font-size: 13px; font-weight: 800;">TỔNG CỘNG:</th>
            <th style="text-align:right; font-size: 14px; font-weight: 800; color: #333;" id="tot-h">${tH.toLocaleString('vi-VN')}</th>
            <th style="text-align:right; font-size: 14px; font-weight: 800; color: #d93025;" id="tot-s">${tS.toLocaleString('vi-VN')}</th>
            <th style="text-align:right; font-size: 15px; font-weight: 900; color: #137333;" id="tot-t">${(tH-tS).toLocaleString('vi-VN')}</th>
        </tr>
    `;
};

window.toggleShopeeEditMode = function() {
    const btn = document.getElementById("btn-shopee-edit");
    if (!window.isShopeeEditing) {
        window.isShopeeEditing = true;
        btn.innerHTML = "<span style='font-size:15px'>💾</span> Lưu Thay Đổi"; 
        btn.style.background = "#e8f0fe"; btn.style.color = "#1a73e8"; btn.style.borderColor = "#c2e7ff";
        document.querySelectorAll("#shopeeResultTable tbody tr").forEach((tr, i) => {
            let r = window.shopeeExportData[i];
            tr.querySelector(".c-h").innerHTML = `<input type="number" class="edit-input-shopee i-h" value="${r.hang}" oninput="window.liveCalcShopee()">`;
            tr.querySelector(".c-s").innerHTML = `<input type="number" class="edit-input-shopee i-s" value="${r.ship}" oninput="window.liveCalcShopee()">`;
        });
    } else {
        window.isShopeeEditing = false;
        btn.innerHTML = "<span style='font-size:15px'>✏️</span> Sửa Dữ Liệu"; 
        btn.style.background = "#fef7e0"; btn.style.color = "#b06000"; btn.style.borderColor = "#fde293";
        document.querySelectorAll("#shopeeResultTable tbody tr").forEach((tr, i) => {
            let h = parseFloat(tr.querySelector(".i-h").value)||0, s = parseFloat(tr.querySelector(".i-s").value)||0;
            window.shopeeExportData[i].hang = h; window.shopeeExportData[i].ship = s; window.shopeeExportData[i].thu = h - s;
        });
        window.renderShopeeTable();
    }
};

window.liveCalcShopee = function(isInit = false) {
    let tH = 0, tS = 0;
    document.querySelectorAll("#shopeeResultTable tbody tr").forEach(tr => {
        let h = parseFloat(tr.querySelector('.i-h').value)||0, s = parseFloat(tr.querySelector('.i-s').value)||0;
        let thu = h - s; tH += h; tS += s;
        let cellT = tr.querySelector('.c-t');
        if(cellT){
            cellT.innerText = thu.toLocaleString('vi-VN');
            cellT.style.color = thu < 0 ? "#d93025" : "#137333";
            cellT.style.background = thu < 0 ? "#fce8e6" : "transparent";
        }
    });
    
    let lbl = isInit ? "ĐANG SỬA..." : "TỔNG CỘNG:";
    document.querySelector("#shopeeResultTable tfoot").innerHTML = `
        <tr>
            <th colspan="3" style="text-align:right; color:#f4b400; font-size: 13px; font-weight: 800;">${lbl}</th>
            <th style="text-align:right; font-size: 14px; font-weight: 800; color: #333;">${tH.toLocaleString('vi-VN')}</th>
            <th style="text-align:right; font-size: 14px; font-weight: 800; color: #d93025;">${tS.toLocaleString('vi-VN')}</th>
            <th style="text-align:right; font-size: 15px; font-weight: 900; color: #137333;">${(tH-tS).toLocaleString('vi-VN')}</th>
        </tr>
    `;
};

window.exportShopeeExcel = function() {
    const toast = typeof window.showToast === 'function' ? window.showToast : alert;
    if (window.isShopeeEditing) return toast("⚠️ Vui lòng ấn Lưu Thay Đổi trước khi xuất!");
    if (!window.shopeeExportData.length) return toast("⚠️ Chưa có dữ liệu!");

    const data = window.shopeeExportData.map(r => ({ "Tên khách hàng": r.ten, "Mã vận đơn": r.mvd, "Số điện thoại": r.sdt, "Tiền hàng": r.hang, "Phí ship NVC": r.ship, "Doanh thu": r.thu }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [ {wch:25}, {wch:20}, {wch:15}, {wch:15}, {wch:15}, {wch:15} ];

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        let cell = ws[XLSX.utils.encode_cell({c: C, r: 0})];
        if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12, name: "Arial" }, fill: { fgColor: { rgb: "EE4D2D" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: {style: "thin", color: {rgb: "DDDDDD"}}, bottom: {style: "thin", color: {rgb: "DDDDDD"}}, left: {style: "thin", color: {rgb: "DDDDDD"}}, right: {style: "thin", color: {rgb: "DDDDDD"}} } };
    }

    let tH = 0, tS = 0;
    for (let R = 1; R <= range.e.r; ++R) {
        let isNegative = false;
        if (ws[XLSX.utils.encode_cell({c: 3, r: R})]) tH += parseFloat(ws[XLSX.utils.encode_cell({c: 3, r: R})].v) || 0;
        if (ws[XLSX.utils.encode_cell({c: 4, r: R})]) tS += parseFloat(ws[XLSX.utils.encode_cell({c: 4, r: R})].v) || 0;
        
        let cellThu = ws[XLSX.utils.encode_cell({c: 5, r: R})];
        if (cellThu) { let thu = parseFloat(cellThu.v) || 0; if (thu < 0) isNegative = true; }

        for (let C = 0; C <= range.e.c; ++C) {
            let cell = ws[XLSX.utils.encode_cell({c: C, r: R})];
            if (!cell) continue;

            cell.s = { font: { sz: 11, color: { rgb: "333333" }, name: "Arial" }, alignment: { vertical: "center" }, border: { top: {style: "thin", color: {rgb: "EEEEEE"}}, bottom: {style: "thin", color: {rgb: "EEEEEE"}}, left: {style: "thin", color: {rgb: "EEEEEE"}}, right: {style: "thin", color: {rgb: "EEEEEE"}} } };
            cell.s.fill = { fgColor: { rgb: (R % 2 === 0) ? "F8F9FA" : "FFFFFF" } };

            if (C >= 3 && C <= 5) {
                cell.z = '#,##0'; 
                if (C === 4) cell.s.font.color = { rgb: "D93025" };
                if (C === 5) {
                    cell.s.font.bold = true;
                    if (isNegative) { cell.s.font.color = { rgb: "D93025" }; cell.s.fill = { fgColor: { rgb: "FCE8E6" } }; } 
                    else { cell.s.font.color = { rgb: "137333" }; }
                }
            }
        }
    }

    XLSX.utils.sheet_add_aoa(ws, [["TỔNG CỘNG:", "", "", tH, tS, tH - tS]], { origin: -1 }); 
    const newEndRow = range.e.r + 1;
    for (let C = 0; C <= 5; ++C) {
        let cell = ws[XLSX.utils.encode_cell({c: C, r: newEndRow})];
        if (cell) {
            cell.s = { font: { bold: true, sz: 12, color: { rgb: "D93025" }, name: "Arial" }, fill: { fgColor: { rgb: "FFFCFC" } }, border: { top: {style: "medium", color: {rgb: "EE4D2D"}} } };
            if (C >= 3) cell.z = '#,##0'; 
            if (C === 0) cell.s.alignment = { horizontal: "right" }; 
            if (C === 5) cell.s.font.color = { rgb: "137333" }; 
        }
    }
    ws['!merges'] = [ { s: { r: newEndRow, c: 0 }, e: { r: newEndRow, c: 2 } } ];
    ws['!ref'] = XLSX.utils.encode_range({ s: {c: 0, r: 0}, e: {c: 5, r: newEndRow} });

    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Shopee");
    XLSX.writeFile(wb, `BaoCao_Shopee_${new Date().toISOString().slice(0,10)}.xlsx`);
};

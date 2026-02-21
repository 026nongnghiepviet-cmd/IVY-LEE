/**
 * SHOPEE RECONCILE MODULE (V19 - ĐỒNG BỘ PHONG CÁCH TIKTOK & FIX FONT)
 */
document.addEventListener('DOMContentLoaded', initShopeeModule);

function initShopeeModule() {
    const container = document.getElementById('page-shopee');
    if (!container || container.innerHTML.includes('shopee-reconcile-area')) return;

    container.innerHTML = `
        <style>
            /* Ép cứng Font chuẩn không bị nhảy size */
            #shopee-reconcile-area { font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #333; }
            
            #shopeeResultTable tfoot th { 
                position: sticky; bottom: -1px; z-index: 10; 
                background: #fffcfc; 
                border-top: 2px solid #ee4d2d !important; 
                box-shadow: 0 -2px 6px rgba(0,0,0,0.05); 
                padding: 12px 10px; 
            }
            
            .btn-shopee-action { background: #ee4d2d; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(238,77,45,0.2); font-family: 'Roboto', Arial, sans-serif; font-size:14px; }
            .btn-shopee-action:hover { background: #d73211; transform: translateY(-2px); }
            .btn-shopee-action:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; transform: none; }
            
            .platform-badge { display:inline-block; background:#ee4d2d; color:#fff; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:bold; margin-left:10px; vertical-align:middle;}
            
            .btn-edit-shopee { background: #fef7e0; color: #b06000; border: 1px solid #fde293; padding: 6px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 5px; transition: 0.2s; font-family: 'Roboto', Arial, sans-serif;}
            .btn-edit-shopee:hover { background: #fde293; }
            
            .btn-excel { background: #e6f4ea; color: #137333; border: 1px solid #ceead6; padding: 6px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 5px; transition: 0.2s; font-family: 'Roboto', Arial, sans-serif;}
            .btn-excel:hover { background: #ceead6; }

            .edit-input-shopee { width: 100%; padding: 6px; border: 1px solid #ee4d2d; border-radius: 4px; font-weight: bold; text-align: right; outline: none; box-sizing: border-box; font-family: 'Roboto', Arial, sans-serif; font-size:13px;}
            
            /* TABS PHONG CÁCH TIKTOK (BO GÓC NỔI KHỐI) */
            .platform-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .platform-tab { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 2px solid transparent; background: #f8f9fa; color: #555; transition: 0.2s; display: flex; align-items: center; gap: 8px; fill: #555; font-family: 'Roboto', Arial, sans-serif; font-size:14px;}
            .platform-tab.tab-shopee.active { background: #fdf2f0; color: #ee4d2d; border-color: #ee4d2d; fill: #ee4d2d; box-shadow: 0 4px 10px rgba(238,77,45,0.1); }
            .platform-tab.tab-tiktok:hover { background: #f0f0f0; color: #000; fill: #000; border-color:#ddd; }
        </style>

        <div class="section-box" id="shopee-reconcile-area">
            <div class="section-title" style="font-family: 'Roboto', Arial, sans-serif; font-size:16px;">🛒 ĐỐI SOÁT ĐƠN HÀNG <span class="platform-badge">Bản Chuẩn</span></div>

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
                    <label style="font-weight:bold; font-size:13px; display:block; margin-bottom:8px; color:#555;">1. Tải file Chi tiết giao dịch:</label>
                    <input type="file" id="fileTransShopee" accept=".csv, .xlsx, .xls" style="border:1px dashed #ccc; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer; font-family:'Roboto', sans-serif; font-size:13px;">
                </div>
                <div style="flex:1; min-width:300px;">
                    <label style="font-weight:bold; font-size:13px; display:block; margin-bottom:8px; color:#555;">2. Tải các file Đơn hàng (Orders):</label>
                    <input type="file" id="fileOrdersShopee" accept=".csv, .xlsx, .xls" multiple style="border:1px dashed #ccc; background:#fff; border-radius:6px; padding:10px; width:100%; cursor:pointer; font-family:'Roboto', sans-serif; font-size:13px;">
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                <button class="btn-shopee-action" id="btn-process-shopee" onclick="window.processShopeeData()">⚙️ XỬ LÝ ĐỐI SOÁT</button>
                <span style="color: #d93025; font-size: 13px; font-style: italic;">(Lưu ý: Hệ thống không lưu dữ liệu, vui lòng xuất Excel về máy)</span>
            </div>

            <div id="shopeeResultContainer" style="display:none; margin-top:30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <div style="font-weight:bold; color:#1a73e8; font-size:15px;">📊 KẾT QUẢ ĐỐI SOÁT <span style="color:#ee4d2d;">(SHOPEE)</span> <span id="shopee-count-badge" style="font-weight:normal; color:#666; font-size:13px; margin-left:8px;"></span></div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-edit-shopee" id="btn-shopee-edit" onclick="window.toggleShopeeEditMode()">✏️ Sửa số liệu</button>
                        <button class="btn-excel" onclick="window.exportShopeeExcel()">📥 Xuất Excel</button>
                    </div>
                </div>

                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; border:1px solid #eee; border-radius:6px;">
                    <table class="ads-table" id="shopeeResultTable" style="margin:0; width:100%;">
                        <thead>
                            <tr style="background:#fdf2f0; color:#ee4d2d;">
                                <th style="font-size:13px; padding:12px 10px;">Tên khách hàng</th>
                                <th style="font-size:13px; padding:12px 10px;">Mã vận đơn</th>
                                <th style="font-size:13px; padding:12px 10px;">Số điện thoại</th>
                                <th style="font-size:13px; padding:12px 10px; text-align:right;">Tiền hàng</th>
                                <th style="font-size:13px; padding:12px 10px; text-align:right;">Phí ship NVC</th>
                                <th style="font-size:13px; padding:12px 10px; text-align:right;">Doanh thu</th>
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
        document.getElementById('shopee-count-badge').innerText = `(${window.shopeeExportData.length} dòng)`;
        btn.innerHTML = "⚙️ XỬ LÝ ĐỐI SOÁT"; btn.disabled = false;
        toast("✅ Đối soát hoàn tất!");

    } catch (e) { console.error(e); document.getElementById('btn-process-shopee').disabled = false; toast("❌ Lỗi xử lý file!"); }
};

window.renderShopeeTable = function() {
    const tbody = document.querySelector("#shopeeResultTable tbody");
    const tfoot = document.querySelector("#shopeeResultTable tfoot");
    tbody.innerHTML = ""; let tH = 0, tS = 0;

    window.shopeeExportData.forEach((r, i) => {
        tH += r.hang; tS += r.ship;
        let color = r.thu < 0 ? "color:#d93025; background:#fce8e6;" : "color:#137333;";
        tbody.insertAdjacentHTML('beforeend', `<tr><td style="font-size:13px;">${r.ten}</td><td style="font-size:13px;">${r.mvd}</td><td></td><td style="text-align:right; font-size:13px;" class="c-h">${r.hang.toLocaleString('vi-VN')}</td><td style="text-align:right; color:#666; font-size:13px;" class="c-s">${r.ship.toLocaleString('vi-VN')}</td><td style="text-align:right;font-weight:bold; font-size:13px; ${color}" class="c-t">${r.thu.toLocaleString('vi-VN')}</td></tr>`);
    });
    
    tfoot.innerHTML = `
        <tr>
            <th colspan="3" style="text-align:right; color:#ee4d2d; font-weight: bold; font-size:13px;">TỔNG CỘNG:</th>
            <th style="text-align:right; font-weight: bold; color: #333; font-size:13px;" id="tot-h">${tH.toLocaleString('vi-VN')}</th>
            <th style="text-align:right; font-weight: bold; color: #d93025; font-size:13px;" id="tot-s">${tS.toLocaleString('vi-VN')}</th>
            <th style="text-align:right; font-weight: bold; color: #137333; font-size:14px;" id="tot-t">${(tH-tS).toLocaleString('vi-VN')}</th>
        </tr>
    `;
};

window.toggleShopeeEditMode = function() {
    const btn = document.getElementById("btn-shopee-edit");
    if (!window.isShopeeEditing) {
        window.isShopeeEditing = true;
        btn.innerHTML = "💾 Lưu thay đổi"; 
        document.querySelectorAll("#shopeeResultTable tbody tr").forEach((tr, i) => {
            let r = window.shopeeExportData[i];
            tr.querySelector(".c-h").innerHTML = `<input type="number" class="edit-input-shopee i-h" value="${r.hang}" oninput="window.liveCalcShopee()">`;
            tr.querySelector(".c-s").innerHTML = `<input type="number" class="edit-input-shopee i-s" value="${r.ship}" oninput="window.liveCalcShopee()">`;
        });
    } else {
        window.isShopeeEditing = false;
        btn.innerHTML = "✏️ Sửa số liệu"; 
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
        if(cellT) {
            cellT.innerText = thu.toLocaleString('vi-VN');
            cellT.style.color = thu < 0 ? "#d93025" : "#137333";
            cellT.style.background = thu < 0 ? "#fce8e6" : "transparent";
        }
    });
    
    let lbl = isInit ? "ĐANG SỬA..." : "TỔNG CỘNG:";
    document.querySelector("#shopeeResultTable tfoot").innerHTML = `
        <tr>
            <th colspan="3" style="text-align:right; color:#f4b400; font-weight: bold; font-size:13px;">${lbl}</th>
            <th style="text-align:right; font-weight: bold; color: #333; font-size:13px;">${tH.toLocaleString('vi-VN')}</th>
            <th style="text-align:right; font-weight: bold; color: #d93025; font-size:13px;">${tS.toLocaleString('vi-VN')}</th>
            <th style="text-align:right; font-weight: bold; color: #137333; font-size:14px;">${(tH-tS).toLocaleString('vi-VN')}</th>
        </tr>
    `;
};

window.exportShopeeExcel = function() {
    const toast = typeof window.showToast === 'function' ? window.showToast : alert;
    if (window.isShopeeEditing) return toast("⚠️ Vui lòng ấn Lưu thay đổi trước khi xuất!");
    if (!window.shopeeExportData.length) return toast("⚠️ Chưa có dữ liệu để xuất!");

    const data = window.shopeeExportData.map(r => ({ "Tên khách hàng": r.ten, "Mã vận đơn": r.mvd, "Số điện thoại": r.sdt, "Tiền hàng (VNĐ)": r.hang, "Phí ship NVC (VNĐ)": r.ship, "Doanh thu (VNĐ)": r.thu }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [ {wch:25}, {wch:20}, {wch:15}, {wch:18}, {wch:20}, {wch:20} ];

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

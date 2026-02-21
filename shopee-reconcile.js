/**
 * SHOPEE RECONCILE MODULE (ĐỘC LẬP - V10)
 */
document.addEventListener('DOMContentLoaded', initShopeeModule);

function initShopeeModule() {
    const container = document.getElementById('page-shopee');
    if (!container || container.innerHTML.includes('section-box')) return; // Chặn render lại để không mất data khi chuyển Tab

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
            .platform-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .platform-tab { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 2px solid transparent; background: #f8f9fa; color: #555; transition: 0.2s; display: flex; align-items: center; gap: 8px; fill: #555; }
            .platform-tab.tab-shopee.active { background: #fdf2f0; color: #ee4d2d; border-color: #ee4d2d; fill: #ee4d2d; box-shadow: 0 4px 10px rgba(238,77,45,0.1); }
            .platform-tab.tab-tiktok:hover { background: #f0f0f0; color: #000; fill: #000; }
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
                    <label style="font-weight:bold; font-size:12px; color:#555; display:block; margin-bottom:8px;">1. Tải file Chi tiết giao dịch:</label>
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
                        <button onclick="window.exportShopeeExcel()" style="background:#137333; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow:0 2px 6px rgba(19,115,51,0.2);">📥 Xuất File Excel</button>
                    </div>
                </div>

                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; position: relative;">
                    <table class="ads-table" id="shopeeResultTable">
                        <thead>
                            <tr style="background:#fdf2f0; color:#ee4d2d;">
                                <th>Tên khách hàng</th><th>Mã vận đơn</th><th>Số điện thoại</th><th style="text-align:right;">Tiền hàng</th><th style="text-align:right;">Phí ship NVC thu</th><th style="text-align:right;">Doanh thu</th>
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
        btn.innerHTML = "⏳ Đang tính toán..."; btn.disabled = true;

        const transactionsData = await window.readShopeeExcelFile(fileTrans);
        const allOrders = await Promise.all(Array.from(fileOrders).map(f => window.readShopeeExcelFile(f)));
        const ordersData = allOrders.flat();

        const ordersMap = {};
        ordersData.forEach(order => {
            let maDon = order['Mã đơn hàng'] ? order['Mã đơn hàng'].toString().trim() : "";
            if (maDon) {
                let giaBanRaw = order['Tổng giá bán (sản phẩm)'] ? order['Tổng giá bán (sản phẩm)'].toString().replace(/,/g, '') : "0";
                let giaBan = parseFloat(giaBanRaw) || 0;
                
                if (ordersMap[maDon]) ordersMap[maDon].tongTienHang += giaBan;
                else ordersMap[maDon] = { ten: order['Tên Người nhận']||"", mvd: order['Mã vận đơn']||"", tongTienHang: giaBan };
            }
        });

        window.shopeeExportData = [];
        let count = 0;

        transactionsData.forEach(trans => {
            let maDonTrans = trans['Mã đơn hàng'] ? trans['Mã đơn hàng'].toString().trim() : "";
            let dongTien = trans['Dòng tiền'] ? trans['Dòng tiền'].toString().trim() : "";
            let soTienTransRaw = trans['Số tiền'] ? trans['Số tiền'].toString().replace(/,/g, '') : "0";
            let soTienTrans = parseFloat(soTienTransRaw) || 0;
            
            let isRong = (maDonTrans === "" || maDonTrans === "-");
            let orderMatch = ordersMap[maDonTrans];

            if (orderMatch || isRong) {
                let ten = "", mvd = "", sdt = "", tienHang = 0, phiShip = 0;
                if (isRong) { phiShip = 1620; tienHang = 0; }
                else {
                    ten = orderMatch.ten; mvd = orderMatch.mvd; tienHang = orderMatch.tongTienHang;
                    if (dongTien.toLowerCase() === "tiền ra") { phiShip = 1620; tienHang = 0; } 
                    else { phiShip = tienHang - soTienTrans; }
                }
                
                count++;
                window.shopeeExportData.push({ "Tên khách hàng": ten, "Mã vận đơn": mvd, "Số điện thoại": sdt, "Tiền hàng (VNĐ)": tienHang, "Phí ship NVC (VNĐ)": phiShip, "Doanh thu (VNĐ)": tienHang - phiShip });
            }
        });

        if (window.isShopeeEditing) window.toggleShopeeEditMode();
        window.renderShopeeTable();
        document.getElementById('shopee-count-badge').innerText = `(Khớp ${count} dòng)`;
        document.getElementById('shopeeResultContainer').style.display = 'block';
        
        btn.innerHTML = "⚙️ XỬ LÝ DỮ LIỆU SHOPEE"; btn.disabled = false;
        thongBao(`✅ Đã đối soát thành công ${count} đơn Shopee!`);

    } catch (e) { console.error(e); thongBao("❌ Lỗi cấu trúc file Shopee!"); document.getElementById('btn-process-shopee').disabled = false; }
};

window.renderShopeeTable = function() {
    const tbody = document.querySelector("#shopeeResultTable tbody");
    const tfoot = document.querySelector("#shopeeResultTable tfoot");
    tbody.innerHTML = ""; let tHang = 0, tShip = 0, tThu = 0;

    window.shopeeExportData.forEach((r, i) => {
        tHang += r["Tiền hàng (VNĐ)"]; tShip += r["Phí ship NVC (VNĐ)"]; tThu += r["Doanh thu (VNĐ)"];
        let color = r["Doanh thu (VNĐ)"] < 0 ? "color:#d93025; background:#fce8e6;" : "color:#137333;";
        tbody.insertAdjacentHTML('beforeend', `<tr><td>${r["Tên khách hàng"]}</td><td>${r["Mã vận đơn"]}</td><td>${r["Số điện thoại"]}</td><td style="text-align:right;" class="c-hang">${r["Tiền hàng (VNĐ)"]>0?r["Tiền hàng (VNĐ)"].toLocaleString('vi-VN'):"0"}</td><td style="text-align:right;color:#666;" class="c-ship">${r["Phí ship NVC (VNĐ)"].toLocaleString('vi-VN')}</td><td style="text-align:right;font-weight:bold;${color}" class="c-thu">${r["Doanh thu (VNĐ)"].toLocaleString('vi-VN')}</td></tr>`);
    });

    tfoot.innerHTML = `<tr><th colspan="3" style="text-align:right;color:#d93025;">TỔNG CỘNG SHOPEE:</th><th style="text-align:right;">${tHang.toLocaleString('vi-VN')}</th><th style="text-align:right;color:#d93025;">${tShip.toLocaleString('vi-VN')}</th><th style="text-align:right;color:#137333;">${tThu.toLocaleString('vi-VN')}</th></tr>`;
};

window.toggleShopeeEditMode = function() {
    const btn = document.getElementById("btn-shopee-edit");
    const tbody = document.querySelector("#shopeeResultTable tbody");
    if (!window.shopeeExportData.length) return alert("Chưa có dữ liệu!");

    if (!window.isShopeeEditing) {
        window.isShopeeEditing = true;
        btn.innerHTML = `💾 LƯU DỮ LIỆU`; btn.style.background = "#137333"; btn.style.color = "#fff";
        tbody.querySelectorAll("tr").forEach((tr, i) => {
            let r = window.shopeeExportData[i];
            tr.querySelector(".c-hang").innerHTML = `<input type="number" class="edit-input-shopee i-hang" value="${r["Tiền hàng (VNĐ)"]}" oninput="window.liveCalcShopee()">`;
            tr.querySelector(".c-ship").innerHTML = `<input type="number" class="edit-input-shopee i-ship" value="${r["Phí ship NVC (VNĐ)"]}" oninput="window.liveCalcShopee()">`;
        });
        window.liveCalcShopee(true);
    } else {
        window.isShopeeEditing = false;
        btn.innerHTML = `✏️ Sửa Dữ Liệu`; btn.style.background = "#f4b400"; btn.style.color = "#000";
        tbody.querySelectorAll("tr").forEach((tr, i) => {
            let h = parseFloat(tr.querySelector(".i-hang").value)||0;
            let s = parseFloat(tr.querySelector(".i-ship").value)||0;
            window.shopeeExportData[i]["Tiền hàng (VNĐ)"] = h;
            window.shopeeExportData[i]["Phí ship NVC (VNĐ)"] = s;
            window.shopeeExportData[i]["Doanh thu (VNĐ)"] = h - s;
        });
        window.renderShopeeTable();
    }
};

window.liveCalcShopee = function(init=false) {
    let th=0, ts=0, tt=0;
    document.querySelectorAll("#shopeeResultTable tbody tr").forEach(tr => {
        let h = parseFloat(tr.querySelector('.i-hang').value)||0, s = parseFloat(tr.querySelector('.i-ship').value)||0, thu = h-s;
        th+=h; ts+=s; tt+=thu;
        let cThu = tr.querySelector('.c-thu');
        cThu.innerText = thu.toLocaleString('vi-VN');
        cThu.style.color = thu<0 ? "#d93025" : "#137333"; cThu.style.background = thu<0 ? "#fce8e6" : "transparent";
    });
    document.querySelector("#shopeeResultTable tfoot").innerHTML = `<tr><th colspan="3" style="text-align:right;color:#f4b400;">${init?"ĐANG SỬA...":"TẠM TÍNH:"}</th><th style="text-align:right;">${th.toLocaleString('vi-VN')}</th><th style="text-align:right;color:#d93025;">${ts.toLocaleString('vi-VN')}</th><th style="text-align:right;color:#137333;">${tt.toLocaleString('vi-VN')}</th></tr>`;
};

window.exportShopeeExcel = function() {
    if (!window.shopeeExportData.length) return alert("Chưa có dữ liệu!");
    if (window.isShopeeEditing) return alert("Vui lòng Lưu dữ liệu trước khi xuất!");
    
    const ws = XLSX.utils.json_to_sheet(window.shopeeExportData);
    ws['!cols'] = [{wch:25},{wch:20},{wch:15},{wch:18},{wch:20},{wch:20}];
    
    // Format Header
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        let cell = ws[XLSX.utils.encode_cell({c: C, r: 0})];
        if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 }, fill: { fgColor: { rgb: "EE4D2D" } }, alignment: { horizontal: "center", vertical: "center" } };
    }
    
    let th=0, ts=0, tt=0;
    for (let R = 1; R <= range.e.r; ++R) {
        if (ws[XLSX.utils.encode_cell({c: 3, r: R})]) th += parseFloat(ws[XLSX.utils.encode_cell({c: 3, r: R})].v) || 0;
        if (ws[XLSX.utils.encode_cell({c: 4, r: R})]) ts += parseFloat(ws[XLSX.utils.encode_cell({c: 4, r: R})].v) || 0;
    }
    tt = th - ts;
    
    XLSX.utils.sheet_add_aoa(ws, [["TỔNG CỘNG SHOPEE:", "", "", th, ts, tt]], { origin: -1 });
    const newEndRow = range.e.r + 1;
    for (let C = 0; C <= 5; ++C) {
        let cell = ws[XLSX.utils.encode_cell({c: C, r: newEndRow})];
        if (cell) cell.s = { font: { bold: true, sz: 12, color: { rgb: "D93025" } }, fill: { fgColor: { rgb: "FFFCFC" } }, border: { top: {style: "medium", color: {rgb: "D93025"}} } };
    }
    ws['!merges'] = [ { s: { r: newEndRow, c: 0 }, e: { r: newEndRow, c: 2 } } ];

    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Shopee");
    XLSX.writeFile(wb, `BaoCao_Shopee_${new Date().toISOString().slice(0,10)}.xlsx`);
};

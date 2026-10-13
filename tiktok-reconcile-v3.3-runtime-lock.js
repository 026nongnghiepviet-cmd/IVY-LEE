/**
 * TIKTOK RECONCILE MODULE
 * V3.3 - RUNTIME LOCK + CSV SAFE + FULL RECONCILE
 *
 * Nguồn tiền: file Giao dịch TikTok Shop / sheet "Chi tiết đơn hàng"
 * Nguồn khách/vận đơn/SĐT: file Đơn hàng TikTok Shop / sheet "OrderSKUList"
 *
 * Công thức:
 * - Tiền hàng = tổng cột "Tổng doanh thu" theo Order ID
 * - Phí TikTok hiển thị = -(tổng cột "Tổng phí" theo Order ID)
 *   + Phí gốc thường âm => hiển thị dương.
 *   + Nếu TikTok hoàn phí làm Tổng phí dương => Phí hiển thị âm.
 * - Doanh thu = Tiền hàng - Phí TikTok = Tổng doanh thu + Tổng phí (giữ đúng dấu gốc)
 *
 * Lưu ý:
 * - Một đơn có thể có nhiều SKU -> metadata đơn chỉ lấy 1 lần theo Order ID.
 * - Một đơn có thể có nhiều dòng giao dịch/hoàn/điều chỉnh -> cộng dồn theo Order ID.
 * - Ưu tiên "ID đơn hàng liên quan" khi có, fallback "ID đơn hàng/điều chỉnh".
 */

window.__TIKTOK_RECONCILE_BUILD = 'V3.3_RUNTIME_LOCK_31ORDERS';
console.info('[TikTok Reconcile] Loaded V3.3_RUNTIME_LOCK_31ORDERS');

document.addEventListener('DOMContentLoaded', initTiktokModule);

function initTiktokModule() {
    const container = document.getElementById('page-tiktok');
    if (!container) return;

    const existing = container.querySelector('#tiktok-reconcile-area');
    if (existing && existing.getAttribute('data-build') === 'V3.3_RUNTIME_LOCK_31ORDERS') return;

    // V3.3: nếu DOM cũ của V2/V3.1/V3.2 còn tồn tại, xóa và mount lại build mới.
    container.innerHTML = `
        <style>
            #tiktok-reconcile-area { font-family:'Segoe UI',Arial,sans-serif; }
            #tiktokResultTable { font-family:'Segoe UI',Arial,sans-serif; }
            #tiktokResultTable tfoot th {
                position:sticky; bottom:-1px; z-index:10;
                background:#fff; border-top:2px solid #111827 !important;
                box-shadow:0 -4px 6px rgba(0,0,0,.05); padding:12px 10px;
            }
            .btn-tiktok-action { background:#111827; color:#fff; border:none; padding:12px 26px; border-radius:8px; font-weight:800; cursor:pointer; transition:.2s; box-shadow:0 4px 10px rgba(0,0,0,.16); }
            .btn-tiktok-action:hover { background:#000; transform:translateY(-1px); }
            .btn-tiktok-secondary { background:#fff; color:#111827; border:1px solid #d1d5db; padding:9px 18px; border-radius:8px; font-weight:800; cursor:pointer; }
            .btn-tiktok-export { background:#137333; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:800; cursor:pointer; }
            .platform-badge-tiktok { display:inline-block; background:#000; color:#fff; padding:3px 10px; border-radius:999px; font-size:10px; font-weight:800; margin-left:10px; vertical-align:middle; }
            .platform-tabs { display:flex; gap:10px; margin-bottom:20px; border-bottom:2px solid #eee; padding-bottom:10px; }
            .platform-tab { padding:10px 25px; border-radius:8px; font-weight:bold; cursor:pointer; border:2px solid transparent; background:#f8f9fa; color:#555; transition:.2s; display:flex; align-items:center; gap:10px; fill:#555; }
            .platform-tab svg { width:18px; height:18px; }
            .platform-tab.tab-shopee:hover { background:#fdf2f0; color:#ee4d2d; fill:#ee4d2d; }
            .platform-tab.tab-tiktok.active { background:#f0f0f0; color:#000; border-color:#000; fill:#000; box-shadow:0 4px 10px rgba(0,0,0,.08); }
            .tiktok-upload-grid { background:#f8f9fa; padding:20px; border-radius:10px; border:1px solid #eee; margin-bottom:18px; display:grid; grid-template-columns:1fr 1fr; gap:18px; }
            .tiktok-file-box label { font-weight:800; font-size:12px; display:block; margin-bottom:8px; color:#374151; }
            .tiktok-file-box input { border:1px dashed #9ca3af !important; background:#fff !important; border-radius:7px !important; padding:10px !important; width:100% !important; cursor:pointer; }
            .tiktok-note { color:#92400e; font-size:12px; background:#fffbeb; padding:9px 12px; border-radius:7px; border:1px dashed #f59e0b; line-height:1.5; }
            .tiktok-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:18px 0; }
            .tiktok-kpi { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:12px; }
            .tiktok-kpi span { display:block; color:#6b7280; font-size:10px; font-weight:800; text-transform:uppercase; }
            .tiktok-kpi strong { display:block; margin-top:6px; font-size:18px; color:#111827; }
            .tiktok-warning { color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:10px 12px; font-size:12px; margin:10px 0; line-height:1.55; }
            .edit-input-tiktok { width:100%; padding:6px; border:2px solid #111827 !important; border-radius:5px; font-weight:700; text-align:right; background:#fff !important; }
            .tiktok-row-refund td { background:#fff7ed !important; }
            .tiktok-row-zero td { color:#6b7280; }
            @media(max-width:820px){ .tiktok-upload-grid{grid-template-columns:1fr;} .tiktok-summary{grid-template-columns:1fr 1fr;} }
            @media(max-width:520px){ .tiktok-summary{grid-template-columns:1fr;} }
        </style>

        <div class="section-box" id="tiktok-reconcile-area" data-build="V3.3_RUNTIME_LOCK_31ORDERS">
            <div class="section-title">🛒 ĐỐI SOÁT ĐƠN HÀNG <span class="platform-badge-tiktok">Nền tảng TikTok Shop</span><span style="margin-left:8px;font-size:10px;color:#166534;background:#dcfce7;border:1px solid #bbf7d0;border-radius:999px;padding:3px 8px;font-weight:800;">V3.3_RUNTIME_LOCK_31ORDERS</span></div>

            <div class="platform-tabs">
                <div class="platform-tab tab-shopee" onclick="window.goPage('shopee')">
                    <svg viewBox="0 0 24 24"><path d="M8.2 8.4l-.8-3.4c-.1-.5.3-1 1-1h6.6c.6 0 1.1.5 1 1l-.8 3.4h-7zM20 9.5v9c0 1.9-1.5 3.5-3.5 3.5h-9C5.5 22 4 20.4 4 18.5v-9c0-1.4 1.1-2.5 2.5-2.5h11c1.4 0 2.5 1.1 2.5 2.5zM12 18.2c2.4 0 4.1-1.3 4.1-3.2 0-2.3-2.1-2.6-3.8-3-.9-.2-1.3-.5-1.3-1s.6-1 1.5-1c.9 0 2 .5 2.5 1.2l1.3-1.6c-.9-1.1-2.2-1.6-3.7-1.6-2 0-3.8 1-3.8 3 0 2.2 2 2.6 3.8 3 .9.2 1.4.5 1.4 1s-.7 1-1.6 1c-1.1 0-2.3-.6-3-1.6l-1.4 1.4c1 1.5 2.5 2.4 4 2.4z"/></svg> Shopee
                </div>
                <div class="platform-tab tab-tiktok active">
                    <svg viewBox="0 0 448 512"><path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z"/></svg> TikTok Shop
                </div>
            </div>

            <div class="tiktok-upload-grid">
                <div class="tiktok-file-box">
                    <label>1. File Giao dịch TikTok (Income / Settlement)</label>
                    <input type="file" id="fileTransTiktok" accept=".csv,.xlsx,.xls">
                    <div style="margin-top:6px;color:#6b7280;font-size:11px;">Đọc sheet <b>Chi tiết đơn hàng</b>. Nguồn tiền: Tổng doanh thu + Tổng phí.</div>
                </div>
                <div class="tiktok-file-box">
                    <label>2. File Đơn hàng TikTok (OrderSKUList)</label>
                    <input type="file" id="fileOrdersTiktok" accept=".csv,.xlsx,.xls" multiple>
                    <div style="margin-top:6px;color:#6b7280;font-size:11px;">Dùng lấy Tên khách hàng, Mã vận đơn và Số điện thoại.</div>
                </div>
            </div>

            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
                <button class="btn-tiktok-action" id="btn-process-tiktok" onclick="window.processTiktokData()">⚙️ XỬ LÝ ĐỐI SOÁT</button>
                <span class="tiktok-note">Tiền hàng = Tổng doanh thu · Phí TikTok = -(Tổng phí) · Doanh thu = Tiền hàng - Phí. Hệ thống giữ đúng dấu hoàn phí/điều chỉnh.</span>
            </div>

            <div id="tiktokDiagnostics" style="display:none"></div>

            <div id="tiktokResultContainer" style="display:none;margin-top:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                    <div style="font-weight:900;color:#111827;font-size:14px;text-transform:uppercase;">📊 KẾT QUẢ ĐỐI SOÁT <span id="tiktok-count-badge" style="font-weight:500;color:#6b7280;font-size:12px;margin-left:6px;"></span></div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn-tiktok-secondary" id="btn-tiktok-edit" onclick="window.toggleTiktokEditMode()">✏️ Sửa Dữ Liệu</button>
                        <button class="btn-tiktok-export" onclick="window.exportTiktokExcel()">📥 Xuất Excel</button>
                    </div>
                </div>

                <div class="tiktok-summary" id="tiktok-summary-kpis"></div>

                <div class="table-responsive" style="max-height:520px;overflow:auto;">
                    <table class="ads-table" id="tiktokResultTable">
                        <thead><tr style="background:#f3f4f6;color:#111827;">
                            <th>Tên khách hàng</th>
                            <th>Mã vận đơn</th>
                            <th>Số điện thoại</th>
                            <th style="text-align:right;">Tiền hàng</th>
                            <th style="text-align:right;">Phí TikTok</th>
                            <th style="text-align:right;">Doanh thu</th>
                        </tr></thead>
                        <tbody></tbody><tfoot></tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
}

window.tiktokExportData = [];
window.tiktokReconcileDebug = [];
window.isTiktokEditing = false;

window.__tiktokText = function(v) {
    return (v === null || v === undefined) ? '' : String(v).trim();
};

window.__tiktokNum = function(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v).trim();
    if (!s) return 0;
    s = s.replace(/\s/g, '').replace(/,/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
};

window.__tiktokNormalizeId = function(v) {
    let s = (v === null || v === undefined) ? '' : String(v);
    if (!s) return '';

    // TikTok CSV cố ý gắn TAB vào ID dài để Excel không làm mất số.
    // Loại toàn bộ ký tự vô hình nhưng TUYỆT ĐỐI không ép Number().
    s = s
        .replace(/\uFEFF/g, '')
        .replace(/[\t\r\n\u00A0\u200B-\u200D]/g, '')
        .trim();

    // Một số file CSV có thể bọc ID theo dạng ="123456..."
    const formulaText = s.match(/^="?(\d{12,})"?$/);
    if (formulaText) s = formulaText[1];

    s = s.replace(/\.0+$/, '');

    // ID TikTok hợp lệ cần được giữ dưới dạng chuỗi.
    return s;
};

window.__tiktokFindHeaderRow = function(matrix, requiredHeaders) {
    const max = Math.min(matrix.length, 20);
    for (let r = 0; r < max; r++) {
        const row = (matrix[r] || []).map(v => window.__tiktokText(v).replace(/^\uFEFF/, ''));
        const ok = requiredHeaders.every(h => row.indexOf(h) !== -1);
        if (ok) return r;
    }
    return -1;
};

window.__tiktokMatrixToObjects = function(matrix, requiredHeaders) {
    const headerRow = window.__tiktokFindHeaderRow(matrix, requiredHeaders);
    if (headerRow < 0) {
        throw new Error('Không tìm thấy dòng tiêu đề bắt buộc: ' + requiredHeaders.join(', '));
    }

    const headers = (matrix[headerRow] || []).map(v =>
        window.__tiktokText(v).replace(/^\uFEFF/, '')
    );

    return matrix
        .slice(headerRow + 1)
        .filter(row => row.some(v => window.__tiktokText(v) !== ''))
        .map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                if (h) obj[h] = row[i] === undefined ? '' : row[i];
            });
            return obj;
        });
};

window.__tiktokSheetToObjects = function(ws, requiredHeaders) {
    // XLSX/XLS: raw:false để lấy đúng text hiển thị của file.
    // ID trong file Income TikTok đang được lưu dạng shared string nên không mất số.
    const matrix = XLSX.utils.sheet_to_json(ws, {
        header:1,
        defval:'',
        raw:false
    });
    return window.__tiktokMatrixToObjects(matrix, requiredHeaders);
};

window.__tiktokParseCsvText = function(text) {
    text = String(text || '').replace(/^\uFEFF/, '');

    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else if (ch === '\r') {
            // CRLF: bỏ CR, LF phía sau sẽ kết thúc dòng.
        } else {
            field += ch;
        }
    }

    if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
    }

    return rows;
};

window.readTiktokWorkbook = function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const fileName = String(file && file.name || '').toLowerCase();
        const isCsv = /\.csv$/i.test(fileName);

        reader.onerror = function() {
            reject(new Error('Không đọc được file: ' + (file && file.name || 'không rõ')));
        };

        if (isCsv) {
            // QUAN TRỌNG V3.2:
            // CSV được đọc trực tiếp dưới dạng TEXT, không đi qua XLSX.read.
            // Nhờ vậy Order ID 18 chữ số + TAB ẩn của TikTok luôn giữ nguyên chính xác.
            reader.onload = function(e) {
                try {
                    const matrix = window.__tiktokParseCsvText(e.target.result || '');
                    resolve({
                        __tiktokCsvSafe: true,
                        __tiktokCsvMatrix: matrix,
                        __tiktokFileName: file.name || '',
                        SheetNames: ['CSV'],
                        Sheets: {}
                    });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file, 'UTF-8');
            return;
        }

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                resolve(XLSX.read(data, {
                    type:'array',
                    cellDates:false
                }));
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

window.__tiktokPickSheet = function(workbook, preferredName, requiredHeaders) {
    if (workbook && workbook.__tiktokCsvSafe && Array.isArray(workbook.__tiktokCsvMatrix)) {
        return {
            name: 'CSV',
            rows: window.__tiktokMatrixToObjects(
                workbook.__tiktokCsvMatrix,
                requiredHeaders
            )
        };
    }

    let ws = workbook.Sheets[preferredName];
    if (ws) {
        try {
            return {
                name: preferredName,
                rows: window.__tiktokSheetToObjects(ws, requiredHeaders)
            };
        } catch (e) {}
    }

    for (const name of workbook.SheetNames || []) {
        ws = workbook.Sheets[name];
        try {
            const rows = window.__tiktokSheetToObjects(ws, requiredHeaders);
            return { name, rows };
        } catch (e) {}
    }

    throw new Error(
        'Không tìm thấy sheet phù hợp. Cần các cột: ' +
        requiredHeaders.join(', ')
    );
};


window.__tiktokExtractReportSummary = function(workbook) {
    if (!workbook || !workbook.Sheets) return null;
    const reportName = (workbook.SheetNames || []).find(name =>
        window.__tiktokText(name).toLowerCase() === 'báo cáo'
    );
    if (!reportName) return null;

    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[reportName], {
        header:1, defval:'', raw:false
    });

    const normalize = value => window.__tiktokText(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .replace(/\s+/g,' ');

    const findValue = label => {
        const target = normalize(label);
        for (let r = 0; r < matrix.length; r++) {
            const row = matrix[r] || [];
            for (let c = 0; c < row.length; c++) {
                if (normalize(row[c]) !== target) continue;
                for (let x = row.length - 1; x > c; x--) {
                    const raw = window.__tiktokText(row[x]);
                    if (raw === '') continue;
                    const val = window.__tiktokNum(row[x]);
                    if (Number.isFinite(val)) return val;
                }
            }
        }
        return null;
    };

    return {
        sheetName:reportName,
        settlement:findValue('Tổng số tiền quyết toán'),
        gross:findValue('Tổng doanh thu'),
        feeSigned:findValue('Tổng phí')
    };
};

window.__tiktokCompareReportSummary = function(report, transMap) {
    if (!report) return null;
    let gross = 0, feeSigned = 0, settlement = 0;
    Object.keys(transMap || {}).forEach(orderId => {
        const tx = transMap[orderId] || {};
        gross += window.__tiktokNum(tx.gross);
        feeSigned += window.__tiktokNum(tx.feeSigned);
        settlement += window.__tiktokNum(tx.settlement);
    });

    const checks = [
        { label:'Tổng doanh thu', detail:gross, report:report.gross },
        { label:'Tổng phí', detail:feeSigned, report:report.feeSigned },
        { label:'Tổng số tiền quyết toán', detail:settlement, report:report.settlement }
    ].filter(x => x.report !== null && x.report !== undefined);

    checks.forEach(x => { x.diff = x.detail - x.report; x.mismatch = Math.abs(x.diff) > 1; });

    return {
        mismatch:checks.some(x => x.mismatch),
        checks,
        detail:{gross,feeSigned,settlement}
    };
};

window.__tiktokBuildOrdersMap = function(orderRows) {
    const map = {};
    let duplicateSkuRows = 0;
    (orderRows || []).forEach(row => {
        const id = window.__tiktokNormalizeId(row['Order ID']);
        if (!id) return;
        const current = map[id];
        const meta = {
            orderId:id,
            ten:window.__tiktokText(row['Recipient']),
            mvd:window.__tiktokText(row['Tracking ID']),
            sdt:window.__tiktokText(row['Phone #']),
            status:window.__tiktokText(row['Order Status']),
            substatus:window.__tiktokText(row['Order Substatus']),
            cancelType:window.__tiktokText(row['Cancelation/Return Type']),
            refundAmount:window.__tiktokNum(row['Order Refund Amount'])
        };
        if (!current) {
            map[id] = meta;
        } else {
            duplicateSkuRows++;
            // Chỉ bổ sung metadata còn thiếu; tuyệt đối không cộng Order Amount vì đây là file SKU list.
            if (!current.ten && meta.ten) current.ten = meta.ten;
            if (!current.mvd && meta.mvd) current.mvd = meta.mvd;
            if (!current.sdt && meta.sdt) current.sdt = meta.sdt;
            if (!current.status && meta.status) current.status = meta.status;
            if (!current.substatus && meta.substatus) current.substatus = meta.substatus;
            current.refundAmount = Math.max(current.refundAmount || 0, meta.refundAmount || 0);
        }
    });
    return {
        map,
        duplicateSkuRows,
        uniqueOrders:Object.keys(map).length
    };
};

window.__tiktokBuildTransactionMap = function(transRows) {
    const map = {};
    let adjustmentLinked = 0;
    let refundLikeRows = 0;

    (transRows || []).forEach((row, index) => {
        const related = window.__tiktokNormalizeId(row['ID đơn hàng liên quan']);
        const direct = window.__tiktokNormalizeId(row['ID đơn hàng/điều chỉnh']);
        const orderId = related || direct;
        if (!orderId) return;

        if (related && direct && related !== direct) adjustmentLinked++;

        const gross = window.__tiktokNum(row['Tổng doanh thu']);
        const feeSigned = window.__tiktokNum(row['Tổng phí']);
        const settlement = window.__tiktokNum(row['Tổng số tiền quyết toán']);
        const customerRefund = window.__tiktokNum(row['Tiền hoàn của khách']);
        const adjustment = window.__tiktokNum(row['Số tiền điều chỉnh']);
        const type = window.__tiktokText(row['Loại giao dịch']);

        if (customerRefund < 0 || adjustment !== 0 || gross < 0 || settlement < 0) refundLikeRows++;

        if (!map[orderId]) {
            map[orderId] = {
                orderId,
                gross:0,
                feeSigned:0,
                settlement:0,
                customerRefund:0,
                adjustment:0,
                rowCount:0,
                types:{},
                rawRows:[]
            };
        }

        const g = map[orderId];
        g.gross += gross;
        g.feeSigned += feeSigned;
        g.settlement += settlement;
        g.customerRefund += customerRefund;
        g.adjustment += adjustment;
        g.rowCount += 1;
        g.types[type || 'Không rõ'] = true;
        g.rawRows.push({ index:index + 1, gross, feeSigned, settlement, customerRefund, adjustment, type });
    });

    return { map, adjustmentLinked, refundLikeRows };
};

window.processTiktokData = async function() {
    const transInput = document.getElementById('fileTransTiktok');
    const ordersInput = document.getElementById('fileOrdersTiktok');
    const fileTrans = transInput && transInput.files && transInput.files[0];
    const orderFiles = ordersInput && ordersInput.files ? Array.from(ordersInput.files) : [];
    const toast = typeof window.showToast === 'function' ? window.showToast : alert;

    if (!fileTrans || !orderFiles.length) return toast('⚠️ Vui lòng chọn đủ file Giao dịch và file Đơn hàng TikTok!');
    if (typeof XLSX === 'undefined' || !XLSX.read) return toast('❌ Chưa tải thư viện XLSX.');

    const btn = document.getElementById('btn-process-tiktok');
    try {
        if (btn) { btn.innerHTML = '⏳ Đang xử lý...'; btn.disabled = true; }

        const transWb = await window.readTiktokWorkbook(fileTrans);
        const transPicked = window.__tiktokPickSheet(transWb, 'Chi tiết đơn hàng', [
            'ID đơn hàng/điều chỉnh', 'Tổng doanh thu', 'Tổng phí'
        ]);

        const orderWbs = await Promise.all(orderFiles.map(f => window.readTiktokWorkbook(f)));
        let orderRows = [];
        const orderSheets = [];
        orderWbs.forEach(wb => {
            const picked = window.__tiktokPickSheet(wb, 'OrderSKUList', [
                'Order ID', 'Recipient', 'Tracking ID', 'Phone #'
            ]);
            orderSheets.push(picked.name);
            orderRows = orderRows.concat(picked.rows);
        });

        const orderInfo = window.__tiktokBuildOrdersMap(orderRows);
        const transInfo = window.__tiktokBuildTransactionMap(transPicked.rows);
        const reportSummary = window.__tiktokExtractReportSummary(transWb);
        const reportAudit = window.__tiktokCompareReportSummary(reportSummary, transInfo.map);

        const output = [];
        const debug = [];
        let missingOrders = 0;
        let matchedOrders = 0;
        let trackingOrders = 0;
        let cancelledWithoutTracking = 0;
        let multiTransactionOrders = 0;
        let canceledWithMoney = 0;
        let refundOrders = 0;

        Object.keys(transInfo.map).forEach(orderId => {
            const tx = transInfo.map[orderId];
            const ord = orderInfo.map[orderId] || null;

            if (!ord) {
                missingOrders++;
            } else {
                matchedOrders++;
                if (window.__tiktokText(ord.mvd)) trackingOrders++;
                if (
                    !window.__tiktokText(ord.mvd) &&
                    (
                        /hủy/i.test(ord.status || '') ||
                        /hủy/i.test(ord.substatus || '') ||
                        /cancel/i.test(ord.cancelType || '')
                    )
                ) {
                    cancelledWithoutTracking++;
                }
            }

            if (tx.rowCount > 1) multiTransactionOrders++;

            const feeDisplay = -tx.feeSigned;
            // Công thức chuẩn theo file TikTok: Tổng phí đã mang dấu âm.
            const netRevenue = tx.gross + tx.feeSigned;
            const isRefund = tx.customerRefund < 0 || tx.adjustment !== 0 || tx.gross < 0 || tx.settlement < 0 || (ord && ord.refundAmount > 0);
            const isCanceled = !!(ord && (/hủy/i.test(ord.status) || /hủy/i.test(ord.substatus) || /cancel/i.test(ord.cancelType)));
            if (isRefund) refundOrders++;
            if (isCanceled && (tx.gross !== 0 || tx.feeSigned !== 0 || netRevenue !== 0)) canceledWithMoney++;

            output.push({
                orderId,
                ten:ord ? ord.ten : '',
                mvd:ord ? ord.mvd : '',
                sdt:ord ? ord.sdt : '',
                hang:tx.gross,
                ship:feeDisplay,
                thu:netRevenue,
                _feeSigned:tx.feeSigned,
                _settlement:tx.settlement,
                _refund:tx.customerRefund,
                _adjustment:tx.adjustment,
                _rowCount:tx.rowCount,
                _status:ord ? ord.status : '',
                _substatus:ord ? ord.substatus : '',
                _isRefund:isRefund,
                _isCanceled:isCanceled,
                _missingOrder:!ord
            });

            debug.push({ orderId, transaction:tx, order:ord });
        });

        // Đơn có giao dịch mới nhất lên trên; vẫn giữ dữ liệu bằng tiền là 0 để phản ánh hoàn/hủy nếu TikTok có dòng giao dịch.
        output.sort((a,b) => String(b.orderId).localeCompare(String(a.orderId)));

        window.tiktokExportData = output;
        window.tiktokReconcileDebug = debug;
        window.tiktokReconcileAudit = {
            reportSummary:reportSummary,
            reportAudit:reportAudit,
            missingOrders:missingOrders,
            matchedOrders:matchedOrders,
            trackingOrders:trackingOrders,
            cancelledWithoutTracking:cancelledWithoutTracking,
            uniqueOrderRows:orderInfo.uniqueOrders || Object.keys(orderInfo.map || {}).length,
            multiTransactionOrders:multiTransactionOrders,
            canceledWithMoney:canceledWithMoney,
            refundOrders:refundOrders,
            transactionRows:transPicked.rows.length,
            transactionOrders:Object.keys(transInfo.map || {}).length,
            orderRows:orderRows.length
        };
        window.isTiktokEditing = false;
        window.renderTiktokTable();

        const diag = document.getElementById('tiktokDiagnostics');
        if (diag) {
            const warnings = [];
            const transactionOrderCount = Object.keys(transInfo.map || {}).length;
            const matchLine =
                `Giao dịch ${transactionOrderCount} đơn · Ghép metadata ${matchedOrders}/${transactionOrderCount} · Có vận đơn ${trackingOrders}` +
                (cancelledWithoutTracking ? ` · Hủy không vận đơn ${cancelledWithoutTracking}` : '');

            warnings.push('MATCH_STATUS_OK::' + matchLine);

            if (missingOrders) {
                const missingSample = Object.keys(transInfo.map || {})
                    .filter(id => !orderInfo.map[id])
                    .slice(0, 8)
                    .join(', ');
                warnings.push(
                    `${missingOrders} mã giao dịch không tìm thấy trong file Đơn hàng nên thiếu tên/vận đơn/SĐT.` +
                    (missingSample ? ` Mẫu: ${missingSample}` : '')
                );
            }
            if (multiTransactionOrders) warnings.push(`${multiTransactionOrders} đơn có nhiều dòng giao dịch và đã được cộng dồn theo Order ID.`);
            if (refundOrders) warnings.push(`${refundOrders} đơn có dấu hiệu hoàn/điều chỉnh; hệ thống giữ nguyên dấu tiền từ file TikTok khi cộng dồn.`);
            if (canceledWithMoney) warnings.push(`${canceledWithMoney} đơn hủy vẫn có phát sinh tài chính và được giữ lại để đối soát.`);
            if (reportAudit && reportAudit.mismatch) {
                const detail = reportAudit.checks
                    .filter(x => x.mismatch)
                    .map(x => `${x.label}: Chi tiết ${window.__tiktokNum(x.detail).toLocaleString('vi-VN')} ≠ Báo cáo ${window.__tiktokNum(x.report).toLocaleString('vi-VN')}`)
                    .join(' · ');
                warnings.push(`CẢNH BÁO FILE: sheet Chi tiết đơn hàng đang lệch sheet Báo cáo tổng. ${detail}`);
            }
            if (warnings.length) {
                diag.style.display = 'block';

                const matchMessages = warnings
                    .filter(x => String(x).indexOf('MATCH_STATUS_OK::') === 0)
                    .map(x => String(x).replace('MATCH_STATUS_OK::', ''));

                const realWarnings = warnings
                    .filter(x => String(x).indexOf('MATCH_STATUS_OK::') !== 0);

                let diagHtml = '';

                if (matchMessages.length) {
                    diagHtml += '<div style="margin-bottom:8px;padding:10px 12px;border:1px solid #bbf7d0;border-radius:10px;background:#f0fdf4;color:#166534;font-size:12px;font-weight:800;">✓ ' +
                        matchMessages.join('<br>✓ ') +
                        '</div>';
                }

                if (realWarnings.length) {
                    diagHtml += '<div class="tiktok-warning"><b>Kiểm tra đối soát:</b><br>' +
                        realWarnings.map(x => '• ' + x).join('<br>') +
                        '</div>';
                }

                diag.innerHTML = diagHtml;
            } else {
                diag.style.display = 'none'; diag.innerHTML = '';
            }
        }

        const result = document.getElementById('tiktokResultContainer');
        if (result) result.style.display = 'block';
        const badge = document.getElementById('tiktok-count-badge');
        if (badge) badge.innerText = `(Khớp ${output.length} đơn từ ${transPicked.rows.length} dòng giao dịch)`;

        if (reportAudit && reportAudit.mismatch) {
            toast('⚠️ Đối soát xong nhưng file TikTok đang lệch giữa sheet Chi tiết và sheet Báo cáo tổng. Hãy kiểm tra cảnh báo trước khi xuất.');
        } else {
            toast(
                '✅ Đối soát TikTok hoàn tất: ' +
                Object.keys(transInfo.map || {}).length +
                ' đơn giao dịch, ghép ' +
                matchedOrders +
                '/' +
                Object.keys(transInfo.map || {}).length +
                ' metadata.'
            );
        }
    } catch (e) {
        console.error('TikTok reconcile error:', e);
        toast('❌ Lỗi xử lý TikTok: ' + (e && e.message ? e.message : e));
    } finally {
        if (btn) { btn.innerHTML = '⚙️ XỬ LÝ ĐỐI SOÁT'; btn.disabled = false; }
    }
};


window.getTiktokReconcileRuntimeStatusV33 = function() {
    const area = document.getElementById('tiktok-reconcile-area');
    return {
        build: window.__TIKTOK_RECONCILE_BUILD || '',
        domBuild: area ? (area.getAttribute('data-build') || '') : '',
        initialized: !!area,
        transactionRows: window.tiktokReconcileAudit ? Number(window.tiktokReconcileAudit.transactionRows || 0) : 0,
        transactionOrders: window.tiktokReconcileAudit ? Number(window.tiktokReconcileAudit.transactionOrders || 0) : 0,
        matchedOrders: window.tiktokReconcileAudit ? Number(window.tiktokReconcileAudit.matchedOrders || 0) : 0,
        outputRows: Array.isArray(window.tiktokExportData) ? window.tiktokExportData.length : 0
    };
};

window.renderTiktokTable = function() {
    const tbody = document.querySelector('#tiktokResultTable tbody');
    const tfoot = document.querySelector('#tiktokResultTable tfoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';
    let totalHang = 0, totalPhi = 0, totalThu = 0;

    (window.tiktokExportData || []).forEach((r, i) => {
        totalHang += window.__tiktokNum(r.hang);
        totalPhi += window.__tiktokNum(r.ship);
        totalThu += window.__tiktokNum(r.thu);

        const rowClass = r._isRefund ? 'tiktok-row-refund' : ((r.hang === 0 && r.thu === 0) ? 'tiktok-row-zero' : '');
        const titleParts = [];
        if (r._isCanceled) titleParts.push('Đơn hủy');
        if (r._isRefund) titleParts.push('Có hoàn/điều chỉnh');
        if (r._rowCount > 1) titleParts.push(`${r._rowCount} dòng giao dịch`);
        if (r._missingOrder) titleParts.push('Không tìm thấy metadata đơn hàng');
        const title = titleParts.join(' · ');
        const revenueStyle = r.thu < 0 ? 'color:#d93025;background:#fce8e6;' : 'color:#137333;';

        tbody.insertAdjacentHTML('beforeend', `<tr class="${rowClass}" title="${title.replace(/"/g,'&quot;')}">
            <td>${window.__tiktokText(r.ten)}</td>
            <td>${window.__tiktokText(r.mvd)}</td>
            <td>${window.__tiktokText(r.sdt)}</td>
            <td style="text-align:right" class="tt-c-h">${window.__tiktokNum(r.hang).toLocaleString('vi-VN')}</td>
            <td style="text-align:right;color:#d93025" class="tt-c-s">${window.__tiktokNum(r.ship).toLocaleString('vi-VN')}</td>
            <td style="text-align:right;font-weight:800;${revenueStyle}" class="tt-c-t">${window.__tiktokNum(r.thu).toLocaleString('vi-VN')}</td>
        </tr>`);
    });

    tfoot.innerHTML = `<tr>
        <th colspan="3" style="text-align:right;color:#111827;font-size:13px;font-weight:800;text-transform:uppercase;">TỔNG CỘNG:</th>
        <th style="text-align:right;font-size:13px;font-weight:800;">${totalHang.toLocaleString('vi-VN')}</th>
        <th style="text-align:right;font-size:13px;font-weight:800;color:#d93025;">${totalPhi.toLocaleString('vi-VN')}</th>
        <th style="text-align:right;font-size:14px;font-weight:900;color:${totalThu < 0 ? '#d93025' : '#137333'};">${totalThu.toLocaleString('vi-VN')}</th>
    </tr>`;

    const kpis = document.getElementById('tiktok-summary-kpis');
    if (kpis) {
        const refundCount = (window.tiktokExportData || []).filter(x => x._isRefund).length;
        kpis.innerHTML = `
            <div class="tiktok-kpi"><span>Số đơn đối soát</span><strong>${(window.tiktokExportData || []).length.toLocaleString('vi-VN')}</strong></div>
            <div class="tiktok-kpi"><span>Tiền hàng</span><strong>${totalHang.toLocaleString('vi-VN')} đ</strong></div>
            <div class="tiktok-kpi"><span>Phí TikTok</span><strong style="color:#d93025">${totalPhi.toLocaleString('vi-VN')} đ</strong></div>
            <div class="tiktok-kpi"><span>Hoàn/điều chỉnh</span><strong>${refundCount.toLocaleString('vi-VN')}</strong></div>`;
    }
};

window.toggleTiktokEditMode = function() {
    const btn = document.getElementById('btn-tiktok-edit');
    if (!btn) return;

    if (!window.isTiktokEditing) {
        window.isTiktokEditing = true;
        btn.innerHTML = '💾 LƯU DỮ LIỆU';
        btn.style.background = '#137333'; btn.style.color = '#fff'; btn.style.borderColor = '#137333';

        document.querySelectorAll('#tiktokResultTable tbody tr').forEach((tr, i) => {
            const r = window.tiktokExportData[i];
            if (!r) return;
            tr.querySelector('.tt-c-h').innerHTML = `<input type="number" class="edit-input-tiktok tt-i-h" value="${r.hang}" oninput="window.liveCalcTiktok()">`;
            tr.querySelector('.tt-c-s').innerHTML = `<input type="number" class="edit-input-tiktok tt-i-s" value="${r.ship}" oninput="window.liveCalcTiktok()">`;
        });
        window.liveCalcTiktok(true);
    } else {
        document.querySelectorAll('#tiktokResultTable tbody tr').forEach((tr, i) => {
            const hEl = tr.querySelector('.tt-i-h');
            const sEl = tr.querySelector('.tt-i-s');
            if (!hEl || !sEl || !window.tiktokExportData[i]) return;
            const h = window.__tiktokNum(hEl.value);
            const s = window.__tiktokNum(sEl.value);
            window.tiktokExportData[i].hang = h;
            window.tiktokExportData[i].ship = s;
            window.tiktokExportData[i].thu = h - s;
        });
        window.isTiktokEditing = false;
        btn.innerHTML = '✏️ Sửa Dữ Liệu';
        btn.style.background = '#fff'; btn.style.color = '#111827'; btn.style.borderColor = '#d1d5db';
        window.renderTiktokTable();
    }
};

window.liveCalcTiktok = function(isInit) {
    let totalHang = 0, totalPhi = 0, totalThu = 0;
    document.querySelectorAll('#tiktokResultTable tbody tr').forEach(tr => {
        const hEl = tr.querySelector('.tt-i-h');
        const sEl = tr.querySelector('.tt-i-s');
        if (!hEl || !sEl) return;
        const h = window.__tiktokNum(hEl.value);
        const s = window.__tiktokNum(sEl.value);
        const thu = h - s;
        totalHang += h; totalPhi += s; totalThu += thu;
        const t = tr.querySelector('.tt-c-t');
        if (t) {
            t.innerText = thu.toLocaleString('vi-VN');
            t.style.color = thu < 0 ? '#d93025' : '#137333';
            t.style.background = thu < 0 ? '#fce8e6' : 'transparent';
        }
    });
    const foot = document.querySelector('#tiktokResultTable tfoot');
    if (foot) foot.innerHTML = `<tr>
        <th colspan="3" style="text-align:right;color:#f4b400;font-size:13px;font-weight:800;text-transform:uppercase;">${isInit ? 'ĐANG SỬA...' : 'TỔNG CỘNG:'}</th>
        <th style="text-align:right">${totalHang.toLocaleString('vi-VN')}</th>
        <th style="text-align:right;color:#d93025">${totalPhi.toLocaleString('vi-VN')}</th>
        <th style="text-align:right;color:${totalThu < 0 ? '#d93025' : '#137333'}">${totalThu.toLocaleString('vi-VN')}</th>
    </tr>`;
};

window.exportTiktokExcel = function() {
    const toast = typeof window.showToast === 'function' ? window.showToast : alert;
    if (!window.tiktokExportData || !window.tiktokExportData.length) return toast('⚠️ Không có dữ liệu!');
    if (window.isTiktokEditing) return toast('⚠️ Vui lòng ấn LƯU DỮ LIỆU trước khi xuất!');
    if (typeof XLSX === 'undefined' || !XLSX.utils) return toast('⏳ Chưa tải thư viện XLSX.');

    const audit = window.tiktokReconcileAudit;
    if (audit && audit.reportAudit && audit.reportAudit.mismatch) {
        const proceed = window.confirm(
            'CẢNH BÁO: Sheet "Chi tiết đơn hàng" đang lệch số tổng với sheet "Báo cáo" trong chính file TikTok.\n\n' +
            'File xuất chỉ phản ánh các dòng hiện có trong sheet Chi tiết.\n\n' +
            'Bạn vẫn muốn xuất Excel?'
        );
        if (!proceed) return;
    }

    const data = window.tiktokExportData.map(r => ({
        'Tên khách hàng': r.ten,
        'Mã vận đơn': r.mvd,
        'Số điện thoại': r.sdt,
        'Tiền hàng': window.__tiktokNum(r.hang),
        'Phí TikTok': window.__tiktokNum(r.ship),
        'Doanh thu': window.__tiktokNum(r.thu)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:25},{wch:20},{wch:18},{wch:15},{wch:15},{wch:15}];
    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({c:C,r:0})];
        if (cell) cell.s = {
            font:{bold:true,color:{rgb:'FFFFFF'},sz:12,name:'Arial'},
            fill:{fgColor:{rgb:'111827'}},
            alignment:{horizontal:'center',vertical:'center'},
            border:{top:{style:'thin',color:{rgb:'DDDDDD'}},bottom:{style:'thin',color:{rgb:'DDDDDD'}},left:{style:'thin',color:{rgb:'DDDDDD'}},right:{style:'thin',color:{rgb:'DDDDDD'}}}
        };
    }

    let totalHang = 0, totalPhi = 0, totalThu = 0;
    for (let R = 1; R <= range.e.r; R++) {
        const h = ws[XLSX.utils.encode_cell({c:3,r:R})];
        const p = ws[XLSX.utils.encode_cell({c:4,r:R})];
        const t = ws[XLSX.utils.encode_cell({c:5,r:R})];
        totalHang += h ? window.__tiktokNum(h.v) : 0;
        totalPhi += p ? window.__tiktokNum(p.v) : 0;
        totalThu += t ? window.__tiktokNum(t.v) : 0;

        for (let C = 0; C <= range.e.c; C++) {
            const cell = ws[XLSX.utils.encode_cell({c:C,r:R})];
            if (!cell) continue;
            cell.s = {
                font:{sz:11,color:{rgb:'333333'},name:'Arial'},
                alignment:{vertical:'center'},
                border:{top:{style:'thin',color:{rgb:'EEEEEE'}},bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}},
                fill:{fgColor:{rgb:(R % 2 === 0 ? 'F8F9FA' : 'FFFFFF')}}
            };
            if (C >= 3 && C <= 5) cell.z = '#,##0;[Red]-#,##0';
            if (C === 4) cell.s.font.color = {rgb: window.__tiktokNum(cell.v) < 0 ? '137333' : 'D93025'};
            if (C === 5) {
                cell.s.font.bold = true;
                if (window.__tiktokNum(cell.v) < 0) {
                    cell.s.font.color = {rgb:'D93025'};
                    cell.s.fill = {fgColor:{rgb:'FCE8E6'}};
                } else cell.s.font.color = {rgb:'137333'};
            }
        }
    }

    XLSX.utils.sheet_add_aoa(ws, [['TỔNG CỘNG:','','',totalHang,totalPhi,totalThu]], {origin:-1});
    const newEndRow = range.e.r + 1;
    for (let C = 0; C <= 5; C++) {
        const cell = ws[XLSX.utils.encode_cell({c:C,r:newEndRow})];
        if (!cell) continue;
        cell.s = {
            font:{bold:true,sz:12,color:{rgb:'111827'},name:'Arial'},
            fill:{fgColor:{rgb:'F8FAFC'}},
            border:{top:{style:'medium',color:{rgb:'111827'}}}
        };
        if (C >= 3) cell.z = '#,##0;[Red]-#,##0';
        if (C === 0) cell.s.alignment = {horizontal:'right'};
        if (C === 4) cell.s.font.color = {rgb: window.__tiktokNum(cell.v) < 0 ? '137333' : 'D93025'};
        if (C === 5) cell.s.font.color = {rgb: totalThu < 0 ? 'D93025' : '137333'};
    }
    ws['!merges'] = [{s:{r:newEndRow,c:0},e:{r:newEndRow,c:2}}];
    ws['!ref'] = XLSX.utils.encode_range({s:{c:0,r:0},e:{c:5,r:newEndRow}});

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TikTok Shop');
    XLSX.writeFile(wb, `BaoCao_TikTok_${new Date().toISOString().slice(0,10)}.xlsx`);
};


window.getTiktokReconcileStatusV31 = function() {
    return {
        version:'V3.3_RUNTIME_LOCK_31ORDERS',
        rows:Array.isArray(window.tiktokExportData) ? window.tiktokExportData.length : 0,
        editing:!!window.isTiktokEditing,
        audit:window.tiktokReconcileAudit || null
    };
};

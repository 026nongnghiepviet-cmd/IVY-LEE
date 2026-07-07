/* =========================================================
   ROAS STATISTICS MODULE - V1
   File riêng cho menu: Quảng cáo > Thống kê ROAS
   Mục tiêu:
   - Đọc file quảng cáo Meta/Facebook dạng Excel/CSV.
   - Gom theo Tên nhóm quảng cáo, ưu tiên mã SKU trong tên nhóm.
   - Không gom Tên quảng cáo: mỗi bài quảng cáo giữ một dòng riêng.
   - Xuất file ROAS lũy kế theo form chuẩn 24 cột A:X.
   - Không tự thêm dấu chấm/dấu phẩy phân cách số. Giữ số dạng raw như file gốc.
   ========================================================= */
(function(){
    var ROAS_STATE = {
        mounted: false,
        file: null,
        rows: [],
        groups: [],
        company: 'NNV'
    };

    var COMPANY_OPTIONS = [
        { id: 'NNV', name: 'Nông Nghiệp Việt', fileKey: 'NNV' },
        { id: 'KF', name: 'KingFarm', fileKey: 'KingFarm' },
        { id: 'VN', name: 'Hóa Nông Việt Nhật', fileKey: 'Viet_Nhat' },
        { id: 'ABC', name: 'ABC Việt Nam', fileKey: 'ABC' }
    ];

    var OUTPUT_HEADERS = [
        'Bắt đầu báo cáo',
        'Kết thúc báo cáo',
        'Tên chiến dịch',
        'SKU',
        'Tên nhóm quảng cáo',
        'Bắt đầu',
        'Kết thúc',
        'Tổng chi phí nhóm',
        'VAT 10%',
        'Tổng chi',
        'DOANH THU',
        'ROAS',
        'Số tiền đã chi tiêu theo bài',
        'Tên quảng cáo',
        'Chi phí trên mỗi lượt mua (VND)',
        'CTR',
        'Tần suất',
        'Lượt mua',
        'Tổng số người liên hệ nhắn tin',
        'Người liên hệ nhắn tin mới',
        'Tỷ lệ mua/tin',
        'Lượt hiển thị',
        'Người tiếp cận',
        'ĐỀ XUẤT'
    ];

    function esc(v){
        return String(v === null || v === undefined ? '' : v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizeText(v){
        return String(v || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/Đ/g, 'D').replace(/đ/g, 'd')
            .toUpperCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function cleanGroupName(v){
        return String(v || '')
            .replace(/\s+VS\s*\d+\s*$/i, '')
            .replace(/\s+V\s*\d+\s*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getCampaignName(adsetName){
        var s = String(adsetName || '').trim();
        if (!s) return '';
        var idx = s.indexOf(' - ');
        if (idx === -1) return s;
        return s.slice(0, idx).trim();
    }

    function getSku(adsetName){
        var s = String(adsetName || '');
        var matches = s.match(/\(([^)]{2,80})\)/g);
        if (!matches || !matches.length) return '';
        for (var i = 0; i < matches.length; i++) {
            var content = matches[i].replace(/[()]/g, '').trim();
            var parts = content.split(/[,+/;|\s]+/).filter(Boolean);
            for (var j = 0; j < parts.length; j++) {
                var p = parts[j].replace(/[^A-Za-z0-9_-]/g, '').trim();
                if (/[A-Za-z]/.test(p) && /\d/.test(p)) return p.toUpperCase();
            }
        }
        return '';
    }

    function productKeyFromAdset(adsetName){
        var campaign = getCampaignName(adsetName);
        var s = String(adsetName || '');
        if (campaign && s.indexOf(campaign) === 0) s = s.slice(campaign.length);
        s = s.replace(/^\s*-\s*/, '');
        s = s.replace(/\([^)]*\)/g, ' ');
        s = s.replace(/\bVS\s*\d+\b/ig, ' ');
        s = s.replace(/\s+/g, ' ').trim();
        return normalizeText(s);
    }

    function makeGroupKey(adsetName){
        var campaign = normalizeText(getCampaignName(adsetName));
        var sku = getSku(adsetName);
        var productKey = productKeyFromAdset(adsetName);
        if (sku) return campaign + '|' + sku;
        return campaign + '|' + productKey;
    }

    function toNumberOrBlank(v){
        if (v === null || v === undefined || v === '') return '';
        if (typeof v === 'number') return v;
        var s = String(v).trim();
        if (!s || s === '-') return '';
        // Giữ tinh thần không tự thêm dấu phân cách. Chỉ chuyển khi chắc chắn là số.
        // Nếu số gốc có dấu phẩy thập phân kiểu VN, đổi về dấu chấm để Excel hiểu là số.
        if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
        var n = Number(s);
        return isNaN(n) ? v : n;
    }

    function excelSerialToDate(serial){
        if (typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
            var d = XLSX.SSF.parse_date_code(serial);
            if (d) return new Date(d.y, d.m - 1, d.d);
        }
        var utcDays = Math.floor(serial - 25569);
        var utcValue = utcDays * 86400;
        return new Date(utcValue * 1000);
    }

    function parseAnyDate(v){
        if (!v && v !== 0) return null;
        if (v instanceof Date && !isNaN(v.getTime())) return v;
        if (typeof v === 'number' && v > 20000 && v < 70000) return excelSerialToDate(v);
        var s = String(v).trim();
        var m;
        if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
        if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/))) return new Date(+m[3], +m[2] - 1, +m[1]);
        var d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    function formatDateDMY(v){
        var d = parseAnyDate(v);
        if (!d) return v || '';
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var yy = d.getFullYear();
        return dd + '-' + mm + '-' + yy;
    }

    function findHeaderIndex(headers, exactNames, containsNames){
        exactNames = exactNames || [];
        containsNames = containsNames || [];
        var cleanHeaders = headers.map(function(h){ return normalizeText(h); });
        for (var i = 0; i < exactNames.length; i++) {
            var wanted = normalizeText(exactNames[i]);
            var idx = cleanHeaders.indexOf(wanted);
            if (idx !== -1) return idx;
        }
        for (var c = 0; c < containsNames.length; c++) {
            var needle = normalizeText(containsNames[c]);
            for (var h = 0; h < cleanHeaders.length; h++) {
                if (cleanHeaders[h].indexOf(needle) !== -1) return h;
            }
        }
        return -1;
    }

    function readCell(row, idx){
        return idx >= 0 ? row[idx] : '';
    }

    function parseWorkbookToRows(wb){
        var sheetName = wb.SheetNames[0];
        var ws = wb.Sheets[sheetName];
        var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
        if (!aoa || aoa.length < 2) throw new Error('File không có dữ liệu hoặc thiếu dòng tiêu đề.');
        var headers = aoa[0].map(function(h){ return String(h || '').trim(); });

        var idx = {
            reportStart: findHeaderIndex(headers, ['Lượt bắt đầu báo cáo'], ['bắt đầu báo cáo']),
            reportEnd: findHeaderIndex(headers, ['Lượt kết thúc báo cáo'], ['kết thúc báo cáo']),
            adName: findHeaderIndex(headers, ['Tên quảng cáo'], ['ten quang cao']),
            adsetName: findHeaderIndex(headers, ['Tên nhóm quảng cáo'], ['ten nhom quang cao']),
            spend: findHeaderIndex(headers, ['Số tiền đã chi tiêu (VND)', 'Số tiền đã chi tiêu'], ['so tien da chi tieu']),
            costPerPurchase: findHeaderIndex(headers, ['Chi phí trên mỗi lượt mua (VND)'], ['chi phi tren moi luot mua']),
            ctr: findHeaderIndex(headers, ['CTR (tỷ lệ click vào liên kết)', 'CTR'], ['ctr']),
            frequency: findHeaderIndex(headers, ['Tần suất'], ['tan suat']),
            purchases: findHeaderIndex(headers, ['Lượt mua'], ['luot mua']),
            messages: findHeaderIndex(headers, ['Tổng số người liên hệ nhắn tin'], ['tong so nguoi lien he nhan tin']),
            newMessages: findHeaderIndex(headers, ['Người liên hệ nhắn tin mới'], ['nguoi lien he nhan tin moi']),
            impressions: findHeaderIndex(headers, ['Lượt hiển thị'], ['luot hien thi']),
            reach: findHeaderIndex(headers, ['Người tiếp cận'], ['nguoi tiep can']),
            start: findHeaderIndex(headers, ['Bắt đầu'], ['bat dau']),
            end: findHeaderIndex(headers, ['Kết thúc'], ['ket thuc'])
        };

        if (idx.adsetName === -1) throw new Error('Không tìm thấy cột Tên nhóm quảng cáo.');
        if (idx.adName === -1) throw new Error('Không tìm thấy cột Tên quảng cáo.');
        if (idx.spend === -1) throw new Error('Không tìm thấy cột Số tiền đã chi tiêu.');

        var rows = [];
        for (var r = 1; r < aoa.length; r++) {
            var row = aoa[r] || [];
            var adsetName = String(readCell(row, idx.adsetName) || '').trim();
            var adName = String(readCell(row, idx.adName) || '').trim();
            if (!adsetName && !adName) continue;
            rows.push({
                reportStart: formatDateDMY(readCell(row, idx.reportStart)),
                reportEnd: formatDateDMY(readCell(row, idx.reportEnd)),
                campaign: getCampaignName(adsetName),
                sku: getSku(adsetName),
                adsetName: adsetName,
                adsetDisplay: cleanGroupName(adsetName),
                start: formatDateDMY(readCell(row, idx.start)),
                end: formatDateDMY(readCell(row, idx.end)),
                spend: toNumberOrBlank(readCell(row, idx.spend)),
                adName: adName,
                costPerPurchase: toNumberOrBlank(readCell(row, idx.costPerPurchase)),
                ctr: toNumberOrBlank(readCell(row, idx.ctr)),
                frequency: toNumberOrBlank(readCell(row, idx.frequency)),
                purchases: toNumberOrBlank(readCell(row, idx.purchases)),
                messages: toNumberOrBlank(readCell(row, idx.messages)),
                newMessages: toNumberOrBlank(readCell(row, idx.newMessages)),
                impressions: toNumberOrBlank(readCell(row, idx.impressions)),
                reach: toNumberOrBlank(readCell(row, idx.reach)),
                groupKey: makeGroupKey(adsetName)
            });
        }
        return rows;
    }

    function groupRows(rows){
        var map = {};
        var groups = [];
        rows.forEach(function(row){
            var key = row.groupKey || makeGroupKey(row.adsetName);
            if (!map[key]) {
                map[key] = {
                    key: key,
                    campaign: row.campaign,
                    sku: row.sku,
                    adsetName: row.adsetDisplay || row.adsetName,
                    reportStart: row.reportStart,
                    reportEnd: row.reportEnd,
                    start: row.start,
                    end: row.end,
                    rows: []
                };
                groups.push(map[key]);
            }
            var g = map[key];
            if (!g.sku && row.sku) g.sku = row.sku;
            if (!g.campaign && row.campaign) g.campaign = row.campaign;
            if (!g.reportStart && row.reportStart) g.reportStart = row.reportStart;
            if (!g.reportEnd && row.reportEnd) g.reportEnd = row.reportEnd;
            if (!g.start && row.start) g.start = row.start;
            if (!g.end && row.end) g.end = row.end;
            g.rows.push(row);
        });
        return groups;
    }

    function cellFormula(f){ return { f: f }; }

    function rangeFormulaSum(col, startRow, endRow){
        if (startRow === endRow) return col + startRow;
        return col + startRow + ':' + col + endRow;
    }

    function buildWorkbook(groups){
        var aoa = [OUTPUT_HEADERS.slice()];
        var merges = [];
        var outputRow = 2; // Excel row number, because row 1 is header.
        var campaignSpans = [];
        var currentCampaign = null;
        var currentCampaignStart = 2;

        function closeCampaignSpan(endRow){
            if (currentCampaign && currentCampaignStart < endRow) {
                campaignSpans.push({ s: currentCampaignStart, e: endRow });
            }
        }

        groups.forEach(function(g){
            var startRow = outputRow;
            var endRow = outputRow + g.rows.length - 1;
            if (g.campaign !== currentCampaign) {
                closeCampaignSpan(outputRow - 1);
                currentCampaign = g.campaign;
                currentCampaignStart = outputRow;
            }

            g.rows.forEach(function(r, idx){
                var excelRow = startRow + idx;
                var isFirst = idx === 0;
                var row = new Array(24).fill('');
                if (isFirst) {
                    row[0] = g.reportStart || r.reportStart || '';
                    row[1] = g.reportEnd || r.reportEnd || '';
                    row[2] = g.campaign || r.campaign || '';
                    row[3] = g.sku || r.sku || '';
                    row[4] = g.adsetName || r.adsetName || '';
                    row[5] = g.start || r.start || '';
                    row[6] = g.end || r.end || '';
                    row[7] = cellFormula('SUM(' + rangeFormulaSum('M', startRow, endRow) + ')');
                    row[8] = cellFormula('H' + startRow + '*10%');
                    row[9] = cellFormula('H' + startRow + '+I' + startRow);
                    row[10] = '';
                    row[11] = cellFormula('IFERROR(IF(K' + startRow + '="","",K' + startRow + '/H' + startRow + '),"")');
                    row[23] = cellFormula('IF(K' + startRow + '="","",IF(L' + startRow + '>=5,"",IF(H' + startRow + '>=500000,"TẮT","")))');
                }
                row[12] = r.spend;
                row[13] = r.adName;
                row[14] = r.costPerPurchase;
                row[15] = r.ctr;
                row[16] = r.frequency;
                row[17] = r.purchases;
                row[18] = r.messages;
                row[19] = r.newMessages;
                row[20] = cellFormula('IFERROR(IF(S' + excelRow + '=0,"",R' + excelRow + '/S' + excelRow + '),"")');
                row[21] = r.impressions;
                row[22] = r.reach;
                aoa.push(row);
            });

            if (startRow < endRow) {
                // Merge các cột cấp nhóm. Cột Tên quảng cáo và chỉ số theo bài không merge.
                [0,1,3,4,5,6,7,8,9,10,11,23].forEach(function(c){
                    merges.push({ s: { r: startRow - 1, c: c }, e: { r: endRow - 1, c: c } });
                });
            }
            outputRow = endRow + 1;
        });
        closeCampaignSpan(outputRow - 1);
        campaignSpans.forEach(function(sp){
            merges.push({ s: { r: sp.s - 1, c: 2 }, e: { r: sp.e - 1, c: 2 } });
        });

        var ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!merges'] = merges;
        ws['!cols'] = [
            { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 42 }, { wch: 14 }, { wch: 14 },
            { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 65 },
            { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 14 },
            { wch: 14 }, { wch: 14 }, { wch: 14 }
        ];
        ws['!rows'] = [{ hpt: 44 }];

        // Ghi chú: SheetJS bản community không đảm bảo ghi style Excel phức tạp.
        // Phần quan trọng là cấu trúc cột, công thức, ngày dd-mm-yyyy, merge và số raw.
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Worksheet');
        return wb;
    }

    function fileRange(groups){
        if (!groups || !groups.length) return 'ROAS';
        var s = groups[0].reportStart || '';
        var e = groups[0].reportEnd || '';
        function parts(v){
            var m = String(v || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
            return m ? { d:m[1], m:m[2], y:m[3] } : null;
        }
        var ps = parts(s), pe = parts(e);
        if (ps && pe && ps.m === pe.m && ps.y === pe.y) return ps.d + '-' + pe.d + '_' + ps.m + '_' + ps.y;
        if (ps && pe) return ps.d + '_' + ps.m + '_' + ps.y + '-' + pe.d + '_' + pe.m + '_' + pe.y;
        return 'ROAS';
    }

    function getCompanyFileKey(){
        var id = ROAS_STATE.company || 'NNV';
        for (var i = 0; i < COMPANY_OPTIONS.length; i++) {
            if (COMPANY_OPTIONS[i].id === id) return COMPANY_OPTIONS[i].fileKey;
        }
        return id;
    }

    function setStatus(html, type){
        var el = document.getElementById('roas-stats-status');
        if (!el) return;
        el.className = 'roas-status roas-status-' + (type || 'info');
        el.innerHTML = html;
    }

    function renderSummary(){
        var box = document.getElementById('roas-stats-summary');
        if (!box) return;
        if (!ROAS_STATE.groups.length) {
            box.innerHTML = '';
            return;
        }
        var multiGroups = ROAS_STATE.groups.filter(function(g){ return g.rows.length > 1; }).length;
        box.innerHTML = '' +
            '<div class="roas-summary-card"><b>' + ROAS_STATE.rows.length + '</b><span>Dòng bài quảng cáo</span></div>' +
            '<div class="roas-summary-card"><b>' + ROAS_STATE.groups.length + '</b><span>Nhóm quảng cáo sau gom</span></div>' +
            '<div class="roas-summary-card"><b>' + multiGroups + '</b><span>Nhóm có nhiều bài</span></div>';
    }

    function handleFile(file){
        ROAS_STATE.file = file;
        if (!file) return;
        setStatus('Đang đọc file: <b>' + esc(file.name) + '</b>...', 'info');
        var reader = new FileReader();
        reader.onload = function(e){
            try {
                if (typeof XLSX === 'undefined') throw new Error('Thư viện XLSX chưa sẵn sàng. Kiểm tra script xlsx.full.min.js.');
                var data = e.target.result;
                var wb = XLSX.read(data, { type: 'array', cellDates: false });
                var rows = parseWorkbookToRows(wb);
                var groups = groupRows(rows);
                ROAS_STATE.rows = rows;
                ROAS_STATE.groups = groups;
                renderSummary();
                setStatus('Đã đọc xong <b>' + rows.length + '</b> dòng bài quảng cáo và gom thành <b>' + groups.length + '</b> nhóm. Bấm <b>Xuất file ROAS</b> để tải Excel.', 'success');
            } catch(err) {
                console.error(err);
                ROAS_STATE.rows = [];
                ROAS_STATE.groups = [];
                renderSummary();
                setStatus('Lỗi xử lý file: ' + esc(err.message || err), 'error');
            }
        };
        reader.onerror = function(){ setStatus('Không đọc được file. Vui lòng thử lại.', 'error'); };
        reader.readAsArrayBuffer(file);
    }

    function exportRoasFile(){
        try {
            if (!ROAS_STATE.groups.length) {
                setStatus('Chưa có dữ liệu để xuất. Vui lòng upload file quảng cáo trước.', 'error');
                return;
            }
            var wb = buildWorkbook(ROAS_STATE.groups);
            var filename = 'ROAS_LUY_KE_' + getCompanyFileKey() + '_' + fileRange(ROAS_STATE.groups) + '.xlsx';
            XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });
            setStatus('Đã tạo file <b>' + esc(filename) + '</b>. Nếu trình duyệt không tự tải, kiểm tra pop-up/download của trình duyệt.', 'success');
        } catch(err) {
            console.error(err);
            setStatus('Lỗi xuất file: ' + esc(err.message || err), 'error');
        }
    }

    function renderModule(){
        var mount = document.getElementById('roas-stats-container');
        if (!mount) return;
        var options = COMPANY_OPTIONS.map(function(c){ return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
        mount.innerHTML = '' +
            '<style>' +
            '.roas-tool-shell{display:flex;flex-direction:column;gap:16px;}' +
            '.roas-tool-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px;border:1px solid #dbeafe;border-radius:22px;background:linear-gradient(135deg,#eff6ff,#fff);}' +
            '.roas-tool-head h3{margin:0 0 6px;color:#0f172a;font-size:20px;font-weight:900;}' +
            '.roas-tool-head p{margin:0;color:#64748b;font-weight:650;line-height:1.6;max-width:820px;}' +
            '.roas-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}' +
            '.roas-select{border:1px solid #bfdbfe;border-radius:999px;padding:11px 14px;color:#1e3a8a;font-weight:900;background:#fff;outline:none;}' +
            '.roas-btn{border:none;border-radius:999px;padding:12px 16px;font-weight:900;cursor:pointer;background:#2563eb;color:#fff;box-shadow:0 10px 22px rgba(37,99,235,.18);}' +
            '.roas-btn.secondary{background:#0f172a;}' +
            '.roas-upload{border:2px dashed #93c5fd;border-radius:22px;padding:28px;text-align:center;background:#f8fbff;cursor:pointer;transition:.18s ease;}' +
            '.roas-upload:hover{background:#eff6ff;transform:translateY(-1px);}' +
            '.roas-upload strong{display:block;color:#1d4ed8;font-size:16px;margin-top:6px;}' +
            '.roas-upload span{color:#64748b;font-size:12px;font-weight:700;}' +
            '.roas-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}' +
            '.roas-summary-card{border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:16px;}' +
            '.roas-summary-card b{display:block;color:#0f172a;font-size:24px;line-height:1;}' +
            '.roas-summary-card span{display:block;color:#64748b;font-size:12px;font-weight:800;margin-top:7px;}' +
            '.roas-status{border-radius:16px;padding:12px 14px;font-weight:750;line-height:1.55;}' +
            '.roas-status-info{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;}' +
            '.roas-status-success{background:#ecfdf3;color:#166534;border:1px solid #bbf7d0;}' +
            '.roas-status-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}' +
            '@media(max-width:760px){.roas-summary{grid-template-columns:1fr}.roas-actions{width:100%}.roas-select,.roas-btn{width:100%;}}' +
            '</style>' +
            '<div class="roas-tool-shell">' +
              '<div class="roas-tool-head">' +
                '<div><h3>Thống kê ROAS lũy kế</h3><p>Upload file quảng cáo thô từ Meta/Facebook. Hệ thống sẽ gom theo nhóm quảng cáo, ưu tiên mã SKU trong tên nhóm, giữ từng bài quảng cáo riêng từng dòng và xuất file đúng form ROAS lũy kế.</p></div>' +
                '<div class="roas-actions" id="roas-upload-actions">' +
                  '<select class="roas-select" id="roas-company-select">' + options + '</select>' +
                  '<button class="roas-btn secondary" type="button" id="roas-export-btn">Xuất file ROAS</button>' +
                '</div>' +
              '</div>' +
              '<div class="roas-upload" id="roas-upload-area">' +
                '<div style="font-size:38px;">📂</div>' +
                '<strong>Chọn file quảng cáo Excel/CSV</strong>' +
                '<span>Hỗ trợ .xlsx, .xls, .csv. Tên quảng cáo sẽ giữ đầy đủ, không rút gọn.</span>' +
                '<input accept=".csv,.xlsx,.xls" id="roas-file-input" style="display:none" type="file" />' +
              '</div>' +
              '<div class="roas-summary" id="roas-stats-summary"></div>' +
              '<div class="roas-status roas-status-info" id="roas-stats-status">Chưa có file. Vui lòng upload file quảng cáo cần xử lý.</div>' +
            '</div>';

        var companySelect = document.getElementById('roas-company-select');
        if (companySelect) {
            companySelect.value = ROAS_STATE.company;
            companySelect.onchange = function(){ ROAS_STATE.company = this.value || 'NNV'; };
        }
        var uploadArea = document.getElementById('roas-upload-area');
        var fileInput = document.getElementById('roas-file-input');
        var exportBtn = document.getElementById('roas-export-btn');
        if (uploadArea && fileInput) uploadArea.onclick = function(){ fileInput.click(); };
        if (fileInput) fileInput.onchange = function(){ handleFile(this.files && this.files[0]); };
        if (exportBtn) exportBtn.onclick = exportRoasFile;
        renderSummary();
    }

    window.initRoasStatsModule = function(){
        renderModule();
        ROAS_STATE.mounted = true;
    };

    window.RoasStatsModule = {
        init: window.initRoasStatsModule,
        exportFile: exportRoasFile,
        getState: function(){ return ROAS_STATE; }
    };
})();

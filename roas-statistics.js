/* =========================================================
   ROAS STATISTICS MODULE - V4
   File riêng cho menu: Quảng cáo > Thống kê ROAS
   Cập nhật V4:
   - Tự nhận diện công ty từ tên file, không phụ thuộc công ty đang chọn.
   - Có thể upload nhiều file cùng lúc và tự phân bổ về NNV / VN / KF / ABC.
   - Lưu lịch sử upload và dữ liệu đã upload vào localStorage; nếu có Firebase sysDb thì lưu thêm lên Firebase.
   - Up doanh thu chatbot: đọc Team / Quảng cáo / Tổng tiền, đối chiếu Team + Nhân viên + SKU với nhóm quảng cáo.
   - Tên file xuất dùng mã công ty viết tắt: NNV, VN, KF, ABC.
   - Ngày trong tên file dùng dạng dd.mm.yyyy, ví dụ 01.07.2026.
   - Bắt đầu báo cáo / Kết thúc báo cáo merge cùng block Tên chiến dịch.
   - Font xuất file: Arial.
   - Không tự thêm dấu chấm/dấu phẩy phân cách số. Giữ số raw như file gốc.
   ========================================================= */
(function(){
    'use strict';

    var STORAGE_KEY = 'MKT_ROAS_STATS_V4_DATA';
    var OLD_STORAGE_KEYS = ['MKT_ROAS_STATS_V3_DATA'];
    var FIREBASE_ROOT = 'roas_statistics';

    var COMPANY_OPTIONS = [
        { id: 'NNV', name: 'Nông Nghiệp Việt', exportCode: 'NNV', aliases: ['NONG NGHIEP VIET', 'NNV', 'NONGNGHIEPVIET'] },
        { id: 'VN', name: 'Hóa Nông Việt Nhật', exportCode: 'VN', aliases: ['VIET NHAT', 'HOA NONG VIET NHAT', 'PHAN BON HOA NONG VIET NHAT', 'VN'] },
        { id: 'KF', name: 'KingFarm', exportCode: 'KF', aliases: ['KINGFARM', 'KING FARM', 'KF'] },
        { id: 'ABC', name: 'ABC Việt Nam', exportCode: 'ABC', aliases: ['ABC VIET NAM', 'ABC', 'CONG TY TNHH SX TM DV ABC'] }
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

    var ROAS_STATE = {
        mounted: false,
        company: 'NNV',
        byCompany: {},
        uploadHistory: [],
        chatbotRevenueUploads: []
    };

    function nowIso(){ return new Date().toISOString(); }
    function makeId(prefix){ return (prefix || 'UP') + '-' + Date.now() + '-' + Math.floor(Math.random() * 100000); }

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
            .replace(/[^A-Z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function companyById(id){
        for (var i = 0; i < COMPANY_OPTIONS.length; i++) {
            if (COMPANY_OPTIONS[i].id === id) return COMPANY_OPTIONS[i];
        }
        return null;
    }

    function ensureCompanyBucket(companyId){
        if (!companyId) companyId = 'NNV';
        if (!ROAS_STATE.byCompany[companyId]) {
            ROAS_STATE.byCompany[companyId] = { rows: [], groups: [], uploads: [], chatbotRows: [], chatbotUploads: [] };
        } else {
            var b = ROAS_STATE.byCompany[companyId];
            if (!Array.isArray(b.rows)) b.rows = [];
            if (!Array.isArray(b.groups)) b.groups = [];
            if (!Array.isArray(b.uploads)) b.uploads = [];
            if (!Array.isArray(b.chatbotRows)) b.chatbotRows = [];
            if (!Array.isArray(b.chatbotUploads)) b.chatbotUploads = [];
        }
        return ROAS_STATE.byCompany[companyId];
    }

    function initCompanyBuckets(){
        COMPANY_OPTIONS.forEach(function(c){ ensureCompanyBucket(c.id); });
    }

    function detectCompanyFromFilename(filename){
        var n = normalizeText(filename || '');
        // Kiểm tra theo thứ tự để tránh nhầm “ABC Việt Nam” thành “Việt Nhật” hoặc “Nông Nghiệp Việt”.
        var priority = ['ABC', 'KF', 'VN', 'NNV'];
        for (var p = 0; p < priority.length; p++) {
            var c = companyById(priority[p]);
            if (!c) continue;
            for (var i = 0; i < c.aliases.length; i++) {
                var alias = normalizeText(c.aliases[i]);
                if (alias && n.indexOf(alias) !== -1) return c;
            }
        }
        return null;
    }


    function detectCompanyFromTeam(teamValue){
        var n = normalizeText(teamValue || '');
        if (!n) return null;
        var direct = { NNV: 'NNV', VN: 'VN', KF: 'KF', KINGFARM: 'KF', KING: 'KF', ABC: 'ABC' };
        if (direct[n]) return companyById(direct[n]);
        for (var i = 0; i < COMPANY_OPTIONS.length; i++) {
            var c = COMPANY_OPTIONS[i];
            if (normalizeText(c.id) === n || normalizeText(c.exportCode) === n) return c;
            for (var j = 0; j < c.aliases.length; j++) {
                var alias = normalizeText(c.aliases[j]);
                if (alias && (n === alias || n.indexOf(alias) !== -1 || alias.indexOf(n) !== -1)) return c;
            }
        }
        return null;
    }

    function uniqueList(list){
        var seen = {};
        return (list || []).filter(function(x){
            x = String(x || '').toUpperCase().trim();
            if (!x || seen[x]) return false;
            seen[x] = true;
            return true;
        });
    }

    function extractSkusFromText(text){
        var s = String(text || '').toUpperCase();
        var found = [];
        var m;
        var maSpRegex = /M[ÃA]\s*SP\s*[:：]\s*([^|\n\r)]+)/ig;
        while ((m = maSpRegex.exec(s)) !== null) {
            var part = m[1] || '';
            var codes = part.match(/[A-Z]{1,8}\s*[-_]?\s*\d{1,8}/g) || [];
            codes.forEach(function(c){ found.push(c.replace(/\s+/g, '').replace(/[^A-Z0-9_-]/g, '')); });
        }
        var allCodes = s.match(/[A-Z]{1,8}\s*[-_]?\s*\d{1,8}/g) || [];
        allCodes.forEach(function(c){
            c = c.replace(/\s+/g, '').replace(/[^A-Z0-9_-]/g, '');
            if (/[A-Z]/.test(c) && /\d/.test(c) && !/^BAI\d+$/i.test(c)) found.push(c);
        });
        return uniqueList(found);
    }

    function cleanEmployeeName(name){
        var s = String(name || '').trim();
        s = s.replace(/\s+/g, ' ');
        s = s.replace(/\b(NNV|VN|KF|ABC|KING\s*FARM|KINGFARM|VIỆT\s*NHẬT|VIET\s*NHAT|HÓA\s*NÔNG\s*VIỆT\s*NHẬT|HOA\s*NONG\s*VIET\s*NHAT|NÔNG\s*NGHIỆP\s*VIỆT|NONG\s*NGHIEP\s*VIET)\b\s*$/i, '').trim();
        return s;
    }

    function employeeKey(name){
        return normalizeText(cleanEmployeeName(name));
    }

    function extractEmployeeFromAdset(adsetName){
        return cleanEmployeeName(getCampaignName(adsetName));
    }

    function extractEmployeeFromChatbotAd(text){
        var raw = String(text || '').trim();
        if (!raw) return '';
        var m = raw.match(/Nh[aâ]n\s*vi[eê]n\s*[:：]\s*([^|\n\r-]+)/i);
        if (m && m[1]) return cleanEmployeeName(m[1]);
        // Một số file ghi dạng: "... - hotline 0915... - Ngân".
        var parts = raw.split(/\s+-\s+|\s+\|\s+/).map(function(x){ return x.trim(); }).filter(Boolean);
        for (var i = parts.length - 1; i >= 0; i--) {
            var p = parts[i];
            var pn = normalizeText(p);
            if (!p || pn.indexOf('HOTLINE') !== -1 || pn.indexOf('MA SP') !== -1 || /^BAI\s*\d+/.test(pn)) continue;
            if (/\d{5,}/.test(p)) continue;
            if (p.length <= 30) return cleanEmployeeName(p);
        }
        return '';
    }

    function isSameEmployee(a, b){
        a = employeeKey(a); b = employeeKey(b);
        if (!a || !b) return false;
        if (a === b) return true;
        // Cho phép sai khác nhẹ khi một bên ghi thiếu họ/tên đệm, nhưng không áp dụng cho tên quá ngắn.
        return (a.length >= 5 && b.length >= 5 && (a.indexOf(b) !== -1 || b.indexOf(a) !== -1));
    }

    function hasSkuMatch(groupSkus, revenueSkus){
        groupSkus = uniqueList(groupSkus || []);
        revenueSkus = uniqueList(revenueSkus || []);
        if (!groupSkus.length || !revenueSkus.length) return false;
        var map = {};
        groupSkus.forEach(function(s){ map[s] = true; });
        return revenueSkus.some(function(s){ return !!map[s]; });
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
        // Không tự thêm dấu phân cách. Chỉ chuyển khi chắc chắn Excel cần hiểu là số.
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
        if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
        if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4,5})/))) return new Date(+m[3], +m[2] - 1, +m[1]);
        var d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    function formatDateDMY(v){
        var d = parseAnyDate(v);
        if (!d) return v || '';
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var yy = String(d.getFullYear()).padStart(4, '0');
        return dd + '-' + mm + '-' + yy;
    }

    function formatDateFile(v){
        var d = parseAnyDate(v);
        if (!d) return String(v || '').replace(/-/g, '.');
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var yy = String(d.getFullYear()).padStart(4, '0');
        return dd + '.' + mm + '.' + yy;
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

    function readCell(row, idx){ return idx >= 0 ? row[idx] : ''; }

    function parseWorkbookToRows(wb){
        var sheetName = wb.SheetNames[0];
        var ws = wb.Sheets[sheetName];
        var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
        if (!aoa || aoa.length < 2) throw new Error('File không có dữ liệu hoặc thiếu dòng tiêu đề.');
        var headers = aoa[0].map(function(h){ return String(h || '').trim(); });

        var idx = {
            reportStart: findHeaderIndex(headers, ['Lượt bắt đầu báo cáo'], ['bat dau bao cao']),
            reportEnd: findHeaderIndex(headers, ['Lượt kết thúc báo cáo'], ['ket thuc bao cao']),
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
                skus: extractSkusFromText(adsetName),
                employee: extractEmployeeFromAdset(adsetName),
                employeeKey: employeeKey(extractEmployeeFromAdset(adsetName)),
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
                    order: groups.length,
                    campaign: row.campaign,
                    campaignKey: normalizeText(row.campaign),
                    sku: row.sku,
                    skus: uniqueList(row.skus || (row.sku ? [row.sku] : [])),
                    employee: row.employee || extractEmployeeFromAdset(row.adsetName),
                    employeeKey: row.employeeKey || employeeKey(extractEmployeeFromAdset(row.adsetName)),
                    revenue: 0,
                    chatbotMatches: [],
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
            g.skus = uniqueList((g.skus || []).concat(row.skus || (row.sku ? [row.sku] : [])));
            if (!g.employee && row.employee) g.employee = row.employee;
            if (!g.employeeKey && row.employeeKey) g.employeeKey = row.employeeKey;
            if (!g.campaign && row.campaign) { g.campaign = row.campaign; g.campaignKey = normalizeText(row.campaign); }
            if (!g.reportStart && row.reportStart) g.reportStart = row.reportStart;
            if (!g.reportEnd && row.reportEnd) g.reportEnd = row.reportEnd;
            if (!g.start && row.start) g.start = row.start;
            if (!g.end && row.end) g.end = row.end;
            g.rows.push(row);
        });

        groups.sort(function(a, b){
            var ca = a.campaignKey || normalizeText(a.campaign);
            var cb = b.campaignKey || normalizeText(b.campaign);
            if (ca < cb) return -1;
            if (ca > cb) return 1;
            return (a.order || 0) - (b.order || 0);
        });

        return groups;
    }

    function rebuildCompanyGroups(companyId){
        var bucket = ensureCompanyBucket(companyId);
        bucket.groups = groupRows(bucket.rows || []);
        applyChatbotRevenueToGroups(companyId);
        return bucket.groups;
    }

    function applyChatbotRevenueToGroups(companyId){
        var bucket = ensureCompanyBucket(companyId);
        var groups = bucket.groups || [];
        var revenueRows = bucket.chatbotRows || [];
        groups.forEach(function(g){ g.revenue = 0; g.chatbotMatches = []; });
        revenueRows.forEach(function(row){ if (row && row.company === companyId) { row.matchedGroupKey = ''; row.matchedAdsetName = ''; } });
        var matched = 0;
        revenueRows.forEach(function(row){
            if (!row || row.company !== companyId) return;
            var candidates = groups.filter(function(g){
                return isSameEmployee(g.employee || getCampaignName(g.adsetName), row.employee) && hasSkuMatch(g.skus || (g.sku ? [g.sku] : []), row.skus || []);
            });
            if (!candidates.length) return;
            var target = candidates[0];
            var amount = Number(row.amount) || 0;
            target.revenue = (Number(target.revenue) || 0) + amount;
            target.chatbotMatches.push(row);
            row.matchedGroupKey = target.key;
            row.matchedAdsetName = target.adsetName;
            matched++;
        });
        bucket.chatbotMatchedCount = matched;
        bucket.chatbotUnmatchedCount = revenueRows.filter(function(r){ return r && r.company === companyId && !r.matchedGroupKey; }).length;
        return bucket;
    }

    function cellFormula(f){ return { f: f }; }
    function rangeFormulaSum(col, startRow, endRow){ return startRow === endRow ? col + startRow : col + startRow + ':' + col + endRow; }

    function applyWorksheetStyle(ws, aoa){
        var borderThin = { style: 'thin', color: { rgb: 'D9D9D9' } };
        var headerStyle = {
            font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'C00000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin }
        };
        var bodyStyle = {
            font: { name: 'Arial', sz: 11, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin }
        };
        var leftStyle = {
            font: { name: 'Arial', sz: 11, color: { rgb: '000000' } },
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
            border: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin }
        };

        for (var r = 0; r < aoa.length; r++) {
            for (var c = 0; c < OUTPUT_HEADERS.length; c++) {
                var addr = XLSX.utils.encode_cell({ r: r, c: c });
                if (!ws[addr]) ws[addr] = { t: 's', v: '' };
                ws[addr].s = (r === 0) ? headerStyle : ([2,4,13].indexOf(c) !== -1 ? leftStyle : bodyStyle);
            }
        }
    }

    function buildWorkbook(groups){
        var aoa = [OUTPUT_HEADERS.slice()];
        var merges = [];
        var outputRow = 2;
        var campaignSpans = [];
        var currentCampaign = null;
        var currentCampaignStart = 2;

        function closeCampaignSpan(endRow){
            if (currentCampaign && currentCampaignStart < endRow) campaignSpans.push({ s: currentCampaignStart, e: endRow });
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
                    row[10] = g.revenue ? g.revenue : '';
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
                [3,4,5,6,7,8,9,10,11,23].forEach(function(c){
                    merges.push({ s: { r: startRow - 1, c: c }, e: { r: endRow - 1, c: c } });
                });
            }
            outputRow = endRow + 1;
        });
        closeCampaignSpan(outputRow - 1);

        campaignSpans.forEach(function(sp){
            [0, 1, 2].forEach(function(c){
                merges.push({ s: { r: sp.s - 1, c: c }, e: { r: sp.e - 1, c: c } });
            });
            for (var rr = sp.s + 1; rr <= sp.e; rr++) {
                if (aoa[rr - 1]) {
                    aoa[rr - 1][0] = '';
                    aoa[rr - 1][1] = '';
                    aoa[rr - 1][2] = '';
                }
            }
        });

        var ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!merges'] = merges;
        ws['!cols'] = [
            { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 42 }, { wch: 14 }, { wch: 14 },
            { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 65 },
            { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 14 },
            { wch: 14 }, { wch: 14 }, { wch: 14 }
        ];
        ws['!rows'] = aoa.map(function(_, i){ return { hpt: i === 0 ? 44.25 : 36 }; });
        applyWorksheetStyle(ws, aoa);

        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Worksheet');
        return wb;
    }

    function firstNonEmpty(list, field){
        list = list || [];
        for (var i = 0; i < list.length; i++) if (list[i] && list[i][field]) return list[i][field];
        return '';
    }

    function getReportDateRange(groups){
        var start = firstNonEmpty(groups, 'reportStart');
        var end = firstNonEmpty(groups, 'reportEnd');
        return { start: formatDateDMY(start), end: formatDateDMY(end) };
    }

    function sanitizeFilename(name){
        return String(name || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    }

    function buildExportFilename(groups, companyId){
        var r = getReportDateRange(groups || []);
        var c = companyById(companyId || ROAS_STATE.company) || companyById('NNV');
        var start = r.start ? formatDateFile(r.start) : 'ngay-bat-dau';
        var end = r.end ? formatDateFile(r.end) : 'ngay-ket-thuc';
        return sanitizeFilename('ROAS LŨY KẾ ' + (c.exportCode || c.id) + ' ' + start + ' - ' + end) + '.xlsx';
    }

    function shortDateTime(v){
        var d = parseAnyDate(v);
        if (!d) return v || '';
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var yy = d.getFullYear();
        var hh = String(d.getHours()).padStart(2, '0');
        var mi = String(d.getMinutes()).padStart(2, '0');
        return dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mi;
    }

    function saveLocal(){
        try {
            var payload = {
                company: ROAS_STATE.company,
                byCompany: ROAS_STATE.byCompany,
                uploadHistory: ROAS_STATE.uploadHistory.slice(0, 100),
                chatbotRevenueUploads: ROAS_STATE.chatbotRevenueUploads.slice(0, 100),
                savedAt: nowIso()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch(e) {
            console.warn('Không lưu được ROAS vào localStorage. Có thể dữ liệu quá lớn:', e);
        }
    }

    function loadLocal(){
        initCompanyBuckets();
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                for (var ok = 0; ok < OLD_STORAGE_KEYS.length; ok++) {
                    raw = localStorage.getItem(OLD_STORAGE_KEYS[ok]);
                    if (raw) break;
                }
                if (!raw) return;
            }
            var payload = JSON.parse(raw);
            ROAS_STATE.company = payload.company || ROAS_STATE.company || 'NNV';
            ROAS_STATE.uploadHistory = Array.isArray(payload.uploadHistory) ? payload.uploadHistory : [];
            ROAS_STATE.chatbotRevenueUploads = Array.isArray(payload.chatbotRevenueUploads) ? payload.chatbotRevenueUploads : [];
            if (payload.byCompany && typeof payload.byCompany === 'object') {
                Object.keys(payload.byCompany).forEach(function(companyId){
                    var bucket = payload.byCompany[companyId] || {};
                    ROAS_STATE.byCompany[companyId] = {
                        rows: Array.isArray(bucket.rows) ? bucket.rows : [],
                        uploads: Array.isArray(bucket.uploads) ? bucket.uploads : [],
                        chatbotRows: Array.isArray(bucket.chatbotRows) ? bucket.chatbotRows : [],
                        chatbotUploads: Array.isArray(bucket.chatbotUploads) ? bucket.chatbotUploads : [],
                        groups: []
                    };
                    rebuildCompanyGroups(companyId);
                });
            }
        } catch(e) {
            console.warn('Không đọc được dữ liệu ROAS đã lưu:', e);
        }
    }

    function getDb(){
        try {
            if (window.sysDb) return window.sysDb;
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) return firebase.database();
        } catch(e) {}
        return null;
    }

    function saveUploadToFirebase(record, rows){
        var db = getDb();
        if (!db) return Promise.resolve(false);
        var safeId = record.id.replace(/[.#$\[\]/]/g, '_');
        return db.ref(FIREBASE_ROOT + '/uploads/' + record.company + '/' + safeId).set({
            meta: record,
            rows: rows || [],
            savedAt: nowIso()
        }).catch(function(e){ console.warn('Không lưu được upload ROAS lên Firebase:', e); return false; });
    }

    function saveChatbotToFirebase(record, rows){
        var db = getDb();
        if (!db) return Promise.resolve(false);
        var safeId = record.id.replace(/[.#$\[\]/]/g, '_');
        return db.ref(FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeId).set({ meta: record, rows: rows || [], savedAt: nowIso() })
            .catch(function(e){ console.warn('Không lưu được lịch sử doanh thu chatbot lên Firebase:', e); return false; });
    }

    function setStatus(html, type){
        var el = document.getElementById('roas-stats-status');
        if (!el) return;
        el.className = 'roas-status roas-status-' + (type || 'info');
        el.innerHTML = html;
    }

    function renderCompanyData(){
        renderSummary();
        renderHistory();
    }

    function renderSummary(){
        var box = document.getElementById('roas-stats-summary');
        if (!box) return;
        var bucket = ensureCompanyBucket(ROAS_STATE.company);
        var groups = bucket.groups || [];
        var rows = bucket.rows || [];
        if (!rows.length) {
            box.innerHTML = '<div class="roas-empty">Chưa có dữ liệu quảng cáo cho công ty đang chọn.</div>';
            return;
        }
        var multiGroups = groups.filter(function(g){ return g.rows.length > 1; }).length;
        var revenueRows = bucket.chatbotRows || [];
        var totalRevenue = groups.reduce(function(sum, g){ return sum + (Number(g.revenue) || 0); }, 0);
        box.innerHTML = '' +
            '<div class="roas-summary-card"><b>' + rows.length + '</b><span>Dòng bài quảng cáo</span></div>' +
            '<div class="roas-summary-card"><b>' + groups.length + '</b><span>Nhóm quảng cáo sau gom</span></div>' +
            '<div class="roas-summary-card"><b>' + multiGroups + '</b><span>Nhóm có nhiều bài</span></div>' +
            '<div class="roas-summary-card"><b>' + revenueRows.length + '</b><span>Dòng doanh thu chatbot</span></div>' +
            '<div class="roas-summary-card"><b>' + (bucket.chatbotMatchedCount || 0) + '</b><span>Dòng doanh thu đã khớp</span></div>' +
            '<div class="roas-summary-card"><b>' + totalRevenue + '</b><span>Doanh thu đã gán vào ROAS</span></div>';
    }

    function renderHistory(){
        var box = document.getElementById('roas-upload-history');
        if (!box) return;
        var current = ROAS_STATE.company;
        var ads = ROAS_STATE.uploadHistory.filter(function(x){ return x.company === current; }).slice(0, 20);
        var chatbot = ROAS_STATE.chatbotRevenueUploads.filter(function(x){ return !x.company || x.company === current; }).slice(0, 10);
        var html = '<div class="roas-history-title">🕘 Lịch sử upload - ' + esc((companyById(current) || {}).name || current) + '</div>';
        if (!ads.length && !chatbot.length) {
            html += '<div class="roas-history-empty">Chưa có lịch sử upload cho công ty này.</div>';
            box.innerHTML = html;
            return;
        }
        html += '<div class="roas-history-table-wrap"><table class="roas-history-table"><thead><tr><th>Loại</th><th>File</th><th>Công ty</th><th>Dòng</th><th>Kỳ báo cáo</th><th>Thời gian up</th></tr></thead><tbody>';
        ads.forEach(function(x){
            html += '<tr><td>Ads</td><td>' + esc(x.fileName) + '</td><td>' + esc(x.company) + '</td><td>' + esc(x.rows || 0) + '</td><td>' + esc((x.reportStart || '') + (x.reportEnd ? ' - ' + x.reportEnd : '')) + '</td><td>' + esc(shortDateTime(x.uploadedAt)) + '</td></tr>';
        });
        chatbot.forEach(function(x){
            html += '<tr><td>Doanh thu chatbot</td><td>' + esc(x.fileName) + '</td><td>' + esc(x.company || 'Nhiều công ty') + '</td><td>' + esc(x.rows || 0) + '</td><td>Khớp: ' + esc(x.matched || 0) + ' / Chưa khớp: ' + esc(x.unmatched || 0) + '</td><td>' + esc(shortDateTime(x.uploadedAt)) + '</td></tr>';
        });
        html += '</tbody></table></div>';
        box.innerHTML = html;
    }

    function readWorkbookFromFile(file){
        return new Promise(function(resolve, reject){
            var reader = new FileReader();
            reader.onload = function(e){
                try {
                    if (typeof XLSX === 'undefined') throw new Error('Thư viện XLSX chưa sẵn sàng. Kiểm tra script xlsx.full.min.js.');
                    var wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
                    resolve(wb);
                } catch(err) { reject(err); }
            };
            reader.onerror = function(){ reject(new Error('Không đọc được file: ' + file.name)); };
            reader.readAsArrayBuffer(file);
        });
    }

    function summarizeCompanyCounts(records){
        var map = {};
        records.forEach(function(r){ map[r.company] = (map[r.company] || 0) + 1; });
        return Object.keys(map).map(function(k){ return k + ': ' + map[k] + ' file'; }).join(' • ');
    }

    async function handleFiles(fileList){
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;
        setStatus('Đang kiểm tra và đọc <b>' + files.length + '</b> file quảng cáo...', 'info');

        var success = [];
        var errors = [];
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var company = detectCompanyFromFilename(file.name);
            if (!company) {
                errors.push(file.name + ': Không nhận diện được công ty từ tên file.');
                continue;
            }
            try {
                var wb = await readWorkbookFromFile(file);
                var rows = parseWorkbookToRows(wb);
                var bucket = ensureCompanyBucket(company.id);
                bucket.rows = bucket.rows.concat(rows);
                rebuildCompanyGroups(company.id);

                var ownGroups = groupRows(rows);
                var record = {
                    id: makeId('ADS'),
                    type: 'ads',
                    fileName: file.name,
                    company: company.id,
                    companyName: company.name,
                    rows: rows.length,
                    groups: ownGroups.length,
                    reportStart: firstNonEmpty(ownGroups, 'reportStart'),
                    reportEnd: firstNonEmpty(ownGroups, 'reportEnd'),
                    uploadedAt: nowIso()
                };
                bucket.uploads.unshift(record);
                ROAS_STATE.uploadHistory.unshift(record);
                success.push(record);
                saveUploadToFirebase(record, rows);
            } catch(err) {
                console.error(err);
                errors.push(file.name + ': ' + (err.message || err));
            }
        }

        if (success.length) {
            ROAS_STATE.company = success[0].company;
            var sel = document.getElementById('roas-company-select');
            if (sel) sel.value = ROAS_STATE.company;
        }
        saveLocal();
        renderCompanyData();

        var msg = '';
        if (success.length) msg += 'Đã upload và tự phân bổ <b>' + success.length + '</b> file: ' + esc(summarizeCompanyCounts(success)) + '. ';
        if (errors.length) msg += '<br><b>Lưu ý:</b><br>' + errors.map(esc).join('<br>');
        setStatus(msg || 'Không có file nào được xử lý.', errors.length && !success.length ? 'error' : (errors.length ? 'info' : 'success'));
    }

    function parseChatbotRevenueRows(wb, sourceFileName){
        var sheetName = wb.SheetNames[0];
        var ws = wb.Sheets[sheetName];
        var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
        if (!aoa || aoa.length < 2) throw new Error('File doanh thu chatbot không có dữ liệu.');
        var headers = aoa[0].map(function(h){ return String(h || '').trim(); });
        var idx = {
            date: findHeaderIndex(headers, ['Ngày tạo'], ['ngay tao']),
            team: findHeaderIndex(headers, ['Team'], ['team']),
            page: findHeaderIndex(headers, ['Tên Page'], ['ten page']),
            customer: findHeaderIndex(headers, ['Tên khách'], ['ten khach']),
            ad: findHeaderIndex(headers, ['Quảng cáo'], ['quang cao']),
            product: findHeaderIndex(headers, ['Sản phẩm'], ['san pham']),
            amount: findHeaderIndex(headers, ['Tổng tiền'], ['tong tien']),
            note: findHeaderIndex(headers, ['Ghi chú'], ['ghi chu'])
        };
        if (idx.team === -1) throw new Error('Không tìm thấy cột Team trong file doanh thu chatbot.');
        if (idx.ad === -1) throw new Error('Không tìm thấy cột Quảng cáo trong file doanh thu chatbot.');
        if (idx.amount === -1) throw new Error('Không tìm thấy cột Tổng tiền trong file doanh thu chatbot.');

        var rows = [];
        for (var r = 1; r < aoa.length; r++) {
            var row = aoa[r] || [];
            var team = String(readCell(row, idx.team) || '').trim();
            var adText = String(readCell(row, idx.ad) || '').trim();
            var productText = String(readCell(row, idx.product) || '').trim();
            if (!team && !adText && !productText) continue;
            var company = detectCompanyFromTeam(team) || detectCompanyFromFilename(sourceFileName || '');
            var employee = extractEmployeeFromChatbotAd(adText);
            var skus = extractSkusFromText(adText + ' ' + productText);
            var amountRaw = toNumberOrBlank(readCell(row, idx.amount));
            var amount = Number(amountRaw) || 0;
            rows.push({
                id: makeId('REV') + '-' + r,
                sourceFileName: sourceFileName || '',
                rowNumber: r + 1,
                date: formatDateDMY(readCell(row, idx.date)),
                team: team,
                company: company ? company.id : '',
                companyName: company ? company.name : '',
                page: readCell(row, idx.page),
                customer: readCell(row, idx.customer),
                adText: adText,
                productText: productText,
                employee: employee,
                employeeKey: employeeKey(employee),
                skus: skus,
                amount: amount,
                amountRaw: amountRaw,
                note: readCell(row, idx.note),
                uploadedAt: nowIso(),
                matchedGroupKey: '',
                matchedAdsetName: ''
            });
        }
        return rows;
    }

    function summarizeChatbotRows(rows){
        var byCompany = {};
        (rows || []).forEach(function(r){
            var c = r.company || 'UNKNOWN';
            if (!byCompany[c]) byCompany[c] = { rows: 0, amount: 0 };
            byCompany[c].rows += 1;
            byCompany[c].amount += Number(r.amount) || 0;
        });
        return Object.keys(byCompany).map(function(c){ return c + ': ' + byCompany[c].rows + ' dòng / ' + byCompany[c].amount; }).join(' • ');
    }

    async function handleChatbotRevenueFiles(fileList){
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;
        setStatus('Đang đọc và so khớp <b>' + files.length + '</b> file doanh thu chatbot...', 'info');
        var records = [];
        var errors = [];
        var allRows = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            try {
                var wb = await readWorkbookFromFile(file);
                var rows = parseChatbotRevenueRows(wb, file.name);
                if (!rows.length) throw new Error('Không có dòng doanh thu hợp lệ.');

                var fileCompanies = {};
                rows.forEach(function(row){
                    if (!row.company) return;
                    var bucket = ensureCompanyBucket(row.company);
                    bucket.chatbotRows.push(row);
                    fileCompanies[row.company] = true;
                    allRows.push(row);
                });

                Object.keys(fileCompanies).forEach(function(companyId){ rebuildCompanyGroups(companyId); });

                var matched = rows.filter(function(r){ return !!r.matchedGroupKey; }).length;
                var unmatched = rows.length - matched;
                var record = {
                    id: makeId('CHATBOT'),
                    type: 'chatbot_revenue',
                    fileName: file.name,
                    company: Object.keys(fileCompanies).length === 1 ? Object.keys(fileCompanies)[0] : '',
                    companyName: Object.keys(fileCompanies).length === 1 ? ((companyById(Object.keys(fileCompanies)[0]) || {}).name || '') : 'Nhiều công ty',
                    rows: rows.length,
                    matched: matched,
                    unmatched: unmatched,
                    uploadedAt: nowIso(),
                    status: 'mapped_by_team_employee_sku'
                };
                Object.keys(fileCompanies).forEach(function(companyId){ ensureCompanyBucket(companyId).chatbotUploads.unshift(record); });
                ROAS_STATE.chatbotRevenueUploads.unshift(record);
                records.push(record);
                saveChatbotToFirebase(record, rows);
            } catch(err) {
                console.error(err);
                errors.push(file.name + ': ' + (err.message || err));
            }
        }

        saveLocal();
        renderCompanyData();
        var msg = '';
        if (records.length) msg += 'Đã upload và so khớp <b>' + records.length + '</b> file doanh thu chatbot. ' + esc(summarizeChatbotRows(allRows)) + '. ';
        if (errors.length) msg += '<br><b>Lưu ý:</b><br>' + errors.map(esc).join('<br>');
        setStatus(msg || 'Không có file doanh thu chatbot nào được xử lý.', errors.length && !records.length ? 'error' : (errors.length ? 'info' : 'success'));
    }

    function exportRoasFile(){
        try {
            var bucket = ensureCompanyBucket(ROAS_STATE.company);
            if (!bucket.groups || !bucket.groups.length) {
                setStatus('Chưa có dữ liệu để xuất cho công ty đang chọn. Vui lòng upload file quảng cáo trước.', 'error');
                return;
            }
            applyChatbotRevenueToGroups(ROAS_STATE.company);
            var wb = buildWorkbook(bucket.groups);
            var filename = buildExportFilename(bucket.groups, ROAS_STATE.company);
            XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });
            setStatus('Đã tạo file <b>' + esc(filename) + '</b>.', 'success');
        } catch(err) {
            console.error(err);
            setStatus('Lỗi xuất file: ' + esc(err.message || err), 'error');
        }
    }

    function clearCurrentCompanyData(){
        var c = companyById(ROAS_STATE.company);
        var label = c ? c.exportCode + ' - ' + c.name : ROAS_STATE.company;
        if (!confirm('Xóa dữ liệu ROAS đã upload của ' + label + ' trên trình duyệt này?')) return;
        ROAS_STATE.byCompany[ROAS_STATE.company] = { rows: [], groups: [], uploads: [], chatbotRows: [], chatbotUploads: [] };
        ROAS_STATE.uploadHistory = ROAS_STATE.uploadHistory.filter(function(x){ return x.company !== ROAS_STATE.company; });
        ROAS_STATE.chatbotRevenueUploads = ROAS_STATE.chatbotRevenueUploads.filter(function(x){ return x.company !== ROAS_STATE.company; });
        saveLocal();
        renderCompanyData();
        setStatus('Đã xóa dữ liệu local của ' + esc(label) + '. Dữ liệu đã lưu trên Firebase nếu có sẽ không bị xóa tự động.', 'info');
    }

    function renderModule(){
        loadLocal();
        var mount = document.getElementById('roas-stats-container');
        if (!mount) return;
        var options = COMPANY_OPTIONS.map(function(c){ return '<option value="' + c.id + '">' + esc(c.exportCode + ' - ' + c.name) + '</option>'; }).join('');
        mount.innerHTML = '' +
            '<style>' +
            '.roas-tool-shell{display:flex;flex-direction:column;gap:16px;}' +
            '.roas-tool-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px;border:1px solid #dbeafe;border-radius:22px;background:linear-gradient(135deg,#eff6ff,#fff);}' +
            '.roas-tool-head h3{margin:0 0 6px;color:#0f172a;font-size:20px;font-weight:900;}' +
            '.roas-tool-head p{margin:0;color:#64748b;font-weight:650;line-height:1.6;max-width:880px;}' +
            '.roas-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}' +
            '.roas-select{border:1px solid #bfdbfe;border-radius:999px;padding:11px 14px;color:#1e3a8a;font-weight:900;background:#fff;outline:none;}' +
            '.roas-btn{border:none;border-radius:999px;padding:12px 16px;font-weight:900;cursor:pointer;background:#2563eb;color:#fff;box-shadow:0 10px 22px rgba(37,99,235,.18);}' +
            '.roas-btn.secondary{background:#0f172a;}.roas-btn.danger{background:#dc2626;}' +
            '.roas-upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}' +
            '.roas-upload{border:2px dashed #93c5fd;border-radius:22px;padding:24px;text-align:center;background:#f8fbff;cursor:pointer;transition:.18s ease;}' +
            '.roas-upload:hover{background:#eff6ff;transform:translateY(-1px);}' +
            '.roas-upload.chatbot{border-color:#86efac;background:#f0fdf4;}' +
            '.roas-upload strong{display:block;color:#1d4ed8;font-size:16px;margin-top:6px;}' +
            '.roas-upload.chatbot strong{color:#166534;}' +
            '.roas-upload span{color:#64748b;font-size:12px;font-weight:700;line-height:1.5;display:block;margin-top:5px;}' +
            '.roas-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}' +
            '.roas-summary-card{border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:16px;}' +
            '.roas-summary-card b{display:block;color:#0f172a;font-size:24px;line-height:1;}' +
            '.roas-summary-card span{display:block;color:#64748b;font-size:12px;font-weight:800;margin-top:7px;}' +
            '.roas-empty{grid-column:1/-1;border:1px dashed #cbd5e1;border-radius:18px;background:#fff;padding:16px;color:#64748b;font-weight:800;text-align:center;}' +
            '.roas-status{border-radius:16px;padding:12px 14px;font-weight:750;line-height:1.55;}' +
            '.roas-status-info{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;}' +
            '.roas-status-success{background:#ecfdf3;color:#166534;border:1px solid #bbf7d0;}' +
            '.roas-status-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}' +
            '.roas-history{border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:14px;}' +
            '.roas-history-title{font-weight:900;color:#0f172a;margin-bottom:10px;}' +
            '.roas-history-empty{color:#64748b;font-weight:750;padding:10px;background:#f8fafc;border-radius:14px;}' +
            '.roas-history-table-wrap{overflow:auto;border:1px solid #eef2f7;border-radius:14px;}' +
            '.roas-history-table{width:100%;min-width:760px;border-collapse:collapse;}' +
            '.roas-history-table th{background:#f8fafc!important;color:#475569!important;font-size:11px;text-transform:uppercase;padding:10px!important;border-bottom:1px solid #e2e8f0!important;}' +
            '.roas-history-table td{padding:10px!important;border-bottom:1px solid #eef2f7!important;font-weight:650;color:#0f172a;}' +
            '@media(max-width:900px){.roas-upload-grid{grid-template-columns:1fr}.roas-summary{grid-template-columns:1fr}.roas-actions{width:100%}.roas-select,.roas-btn{width:100%;}}' +
            '</style>' +
            '<div class="roas-tool-shell">' +
              '<div class="roas-tool-head">' +
                '<div><h3>Thống kê ROAS lũy kế</h3><p>Upload file quảng cáo thô từ Meta/Facebook. Hệ thống sẽ kiểm tra tên file để tự phân bổ công ty NNV / VN / KF / ABC, hỗ trợ chọn nhiều file cùng lúc, lưu lịch sử upload và dữ liệu đã upload.</p></div>' +
                '<div class="roas-actions" id="roas-upload-actions">' +
                  '<select class="roas-select" id="roas-company-select">' + options + '</select>' +
                  '<button class="roas-btn secondary" type="button" id="roas-export-btn">Xuất file ROAS</button>' +
                  '<button class="roas-btn danger" type="button" id="roas-clear-btn">Xóa dữ liệu công ty này</button>' +
                '</div>' +
              '</div>' +
              '<div class="roas-upload-grid">' +
                '<div class="roas-upload" id="roas-upload-area">' +
                  '<div style="font-size:38px;">📂</div>' +
                  '<strong>Up file quảng cáo</strong>' +
                  '<span>Hỗ trợ .xlsx, .xls, .csv. Có thể chọn nhiều file cùng lúc. Công ty sẽ được nhận diện từ tên file.</span>' +
                  '<input accept=".csv,.xlsx,.xls" id="roas-file-input" style="display:none" type="file" multiple />' +
                '</div>' +
                '<div class="roas-upload chatbot" id="roas-chatbot-upload-area">' +
                  '<div style="font-size:38px;">💬</div>' +
                  '<strong>Up doanh thu chatbot</strong>' +
                  '<span>Đọc Team, Quảng cáo, Tổng tiền; so khớp công ty + nhân viên + mã sản phẩm để cộng vào DOANH THU.</span>' +
                  '<input accept=".csv,.xlsx,.xls" id="roas-chatbot-file-input" style="display:none" type="file" multiple />' +
                '</div>' +
              '</div>' +
              '<div class="roas-summary" id="roas-stats-summary"></div>' +
              '<div class="roas-history" id="roas-upload-history"></div>' +
              '<div class="roas-status roas-status-info" id="roas-stats-status">Chưa có thao tác mới. Nếu đã từng upload, dữ liệu sẽ tự hiện theo công ty đang chọn.</div>' +
            '</div>';

        var companySelect = document.getElementById('roas-company-select');
        if (companySelect) {
            companySelect.value = ROAS_STATE.company;
            companySelect.onchange = function(){
                ROAS_STATE.company = this.value || 'NNV';
                saveLocal();
                renderCompanyData();
            };
        }
        var uploadArea = document.getElementById('roas-upload-area');
        var fileInput = document.getElementById('roas-file-input');
        var chatbotArea = document.getElementById('roas-chatbot-upload-area');
        var chatbotInput = document.getElementById('roas-chatbot-file-input');
        var exportBtn = document.getElementById('roas-export-btn');
        var clearBtn = document.getElementById('roas-clear-btn');
        if (uploadArea && fileInput) uploadArea.onclick = function(){ fileInput.click(); };
        if (fileInput) fileInput.onchange = function(){ handleFiles(this.files); this.value = ''; };
        if (chatbotArea && chatbotInput) chatbotArea.onclick = function(){ chatbotInput.click(); };
        if (chatbotInput) chatbotInput.onchange = function(){ handleChatbotRevenueFiles(this.files); this.value = ''; };
        if (exportBtn) exportBtn.onclick = exportRoasFile;
        if (clearBtn) clearBtn.onclick = clearCurrentCompanyData;
        renderCompanyData();
    }

    window.initRoasStatsModule = function(){
        renderModule();
        ROAS_STATE.mounted = true;
    };

    window.RoasStatsModule = {
        init: window.initRoasStatsModule,
        exportFile: exportRoasFile,
        getState: function(){ return ROAS_STATE; },
        detectCompanyFromFilename: detectCompanyFromFilename,
        clearCurrentCompanyData: clearCurrentCompanyData
    };
})();

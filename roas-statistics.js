/* =========================================================
   ROAS STATISTICS MODULE - V9
   File riêng cho menu: Quảng cáo > Thống kê ROAS
   Cập nhật V9:
   - Tự nhận diện công ty từ tên file, không phụ thuộc công ty đang chọn.
   - Có thể upload nhiều file cùng lúc và tự phân bổ về NNV / VN / KF / ABC.
   - Lưu lịch sử upload và dữ liệu đã upload vào localStorage + Firebase; tải lại lịch sử khi mở trang.
   - Lịch sử dạng cây: file chi phí là dòng cha, file doanh thu chatbot là dòng con; bấm file chi phí để chọn làm mặc định.
   - Bỏ dropdown “File chi phí đang chọn”; chọn trực tiếp trong lịch sử.
   - Admin được xóa file chi phí hoặc file doanh thu chatbot trực tiếp trên Firebase.
   - Firebase là nguồn dữ liệu chuẩn; mọi tài khoản đang mở sẽ tự đồng bộ khi file bị xóa.
   - Ghi chính xác tài khoản đăng nhập đã upload file; tên file hiển thị nét thanh, không in đậm.
   - Up doanh thu chatbot: đọc Team / Quảng cáo / Tổng tiền, đối chiếu Team + Nhân viên + SKU với nhóm quảng cáo.
   - V5 sửa lỗi không khớp khi chatbot ghi tên ngắn như “Hiền” nhưng nhóm quảng cáo ghi “THU HIỀN ABC”; ưu tiên lấy SKU từ cột Quảng cáo.
   - Tên file xuất dùng mã công ty viết tắt: NNV, VN, KF, ABC.
   - Ngày trong tên file dùng dạng dd.mm.yyyy, ví dụ 01.07.2026.
   - Bắt đầu báo cáo / Kết thúc báo cáo merge cùng block Tên chiến dịch.
   - Font xuất file: Arial.
   - Không tự thêm dấu chấm/dấu phẩy phân cách số. Giữ số raw như file gốc.
   ========================================================= */
(function(){
    'use strict';

    var STORAGE_KEY = 'MKT_ROAS_STATS_V9_DATA';
    var OLD_STORAGE_KEYS = ['MKT_ROAS_STATS_V8_DATA', 'MKT_ROAS_STATS_V7_DATA', 'MKT_ROAS_STATS_V6_DATA', 'MKT_ROAS_STATS_V5_DATA', 'MKT_ROAS_STATS_V4_DATA', 'MKT_ROAS_STATS_V3_DATA'];
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
        chatbotRevenueUploads: [],
        activeAdsUploadByCompany: {},
        historySearch: '',
        firebaseLoaded: false,
        firebaseLoading: false,
        firebaseRealtimeBound: false
    };

    var FIREBASE_LIVE_STATE = {
        uploadsReady: false,
        chatbotReady: false,
        uploadsRoot: {},
        chatbotRoot: {},
        timer: null
    };

    function nowIso(){ return new Date().toISOString(); }
    function makeId(prefix){ return (prefix || 'UP') + '-' + Date.now() + '-' + Math.floor(Math.random() * 100000); }

    function currentAccountInfo(){
        var info = { name: '', email: '', uid: '' };
        try {
            var authUser = window.sysAuth && window.sysAuth.currentUser ? window.sysAuth.currentUser : null;
            if (!authUser && typeof firebase !== 'undefined' && firebase.auth) authUser = firebase.auth().currentUser;
            if (authUser) {
                info.email = String(authUser.email || '').trim();
                info.uid = String(authUser.uid || '').trim();
                info.name = String(authUser.displayName || '').trim();
            }
        } catch(e) {}

        var emailLower = info.email.toLowerCase();
        try {
            if (emailLower && window.SYS_EMAIL_MAP && window.SYS_EMAIL_MAP[emailLower]) {
                info.name = String(window.SYS_EMAIL_MAP[emailLower] || '').trim() || info.name;
            }
            var users = window.SYS_DB_USERS || {};
            Object.keys(users).some(function(key){
                var u = users[key] || {};
                if (emailLower && String(u.email || '').toLowerCase() === emailLower) {
                    info.name = String(u.name || '').trim() || info.name;
                    return true;
                }
                return false;
            });
        } catch(e) {}

        var identity = String(window.myIdentity || '').trim();
        if (identity && !/^(đang|dang|khách|khach|ẩn danh|an danh)/i.test(identity)) info.name = identity;
        if (!info.name) {
            var header = document.getElementById('header-user-display');
            var headerText = header ? String(header.textContent || '').trim() : '';
            if (headerText && !/^(đang|dang)/i.test(headerText)) info.name = headerText;
        }
        if (!info.name) info.name = info.email || 'Chưa ghi nhận tài khoản';
        return info;
    }

    function uploaderLabel(record){
        record = record || {};
        var label = String(record.uploader || '').trim();
        var email = String(record.uploaderEmail || '').trim().toLowerCase();
        if ((!label || /^hệ thống$/i.test(label)) && email) {
            try {
                if (window.SYS_EMAIL_MAP && window.SYS_EMAIL_MAP[email]) label = String(window.SYS_EMAIL_MAP[email] || '').trim();
                var users = window.SYS_DB_USERS || {};
                Object.keys(users).some(function(key){
                    var u = users[key] || {};
                    if (String(u.email || '').toLowerCase() === email) {
                        label = String(u.name || '').trim() || label;
                        return true;
                    }
                    return false;
                });
            } catch(e) {}
        }
        if (!label || /^hệ thống$/i.test(label)) label = email || 'Chưa ghi nhận tài khoản';
        return label;
    }

    function isAdminUser(){
        try {
            if (window.MKTRBAC && typeof window.MKTRBAC.isAdmin === 'function' && window.MKTRBAC.isAdmin()) return true;
        } catch(e) {}
        if (window.myIdentity === 'SUPER_ADMIN') return true;
        var account = currentAccountInfo();
        var email = String(account.email || '').toLowerCase();
        var name = String(account.name || '');
        var users = window.SYS_DB_USERS || {};
        for (var key in users) {
            if (!Object.prototype.hasOwnProperty.call(users, key)) continue;
            var u = users[key] || {};
            if ((email && String(u.email || '').toLowerCase() === email) || (name && String(u.name || '') === name)) {
                return String(u.role || '').toLowerCase() === 'admin';
            }
        }
        return false;
    }

    function safeFirebaseId(id){ return String(id || '').replace(/[.#$\[\]\/]/g, '_'); }

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
            ROAS_STATE.byCompany[companyId] = { rows: [], groups: [], uploads: [], chatbotRows: [], chatbotUploads: [], activeAdsUploadId: '' };
        } else {
            var b = ROAS_STATE.byCompany[companyId];
            if (!Array.isArray(b.rows)) b.rows = [];
            if (!Array.isArray(b.groups)) b.groups = [];
            if (!Array.isArray(b.uploads)) b.uploads = [];
            if (!Array.isArray(b.chatbotRows)) b.chatbotRows = [];
            if (!Array.isArray(b.chatbotUploads)) b.chatbotUploads = [];
            if (typeof b.activeAdsUploadId !== 'string') b.activeAdsUploadId = '';
        }
        return ROAS_STATE.byCompany[companyId];
    }

    function initCompanyBuckets(){
        COMPANY_OPTIONS.forEach(function(c){ ensureCompanyBucket(c.id); });
    }

    function getActiveAdsUploadId(companyId){
        var bucket = ensureCompanyBucket(companyId);
        var active = bucket.activeAdsUploadId || ROAS_STATE.activeAdsUploadByCompany[companyId] || '';
        var uploads = bucket.uploads || [];
        var exists = active && uploads.some(function(u){ return u && u.id === active; });
        if (!exists && uploads.length) {
            active = uploads[0].id || '';
            bucket.activeAdsUploadId = active;
            ROAS_STATE.activeAdsUploadByCompany[companyId] = active;
        }
        return active;
    }

    function setActiveAdsUpload(companyId, uploadId){
        var bucket = ensureCompanyBucket(companyId);
        bucket.activeAdsUploadId = uploadId || '';
        ROAS_STATE.activeAdsUploadByCompany[companyId] = bucket.activeAdsUploadId;
        rebuildCompanyGroups(companyId);
        saveLocal();
        renderCompanyData();
    }

    function getRowsForActiveUpload(companyId){
        var bucket = ensureCompanyBucket(companyId);
        var active = getActiveAdsUploadId(companyId);
        var rows = Array.isArray(bucket.rows) ? bucket.rows : [];
        if (!active) return rows;
        var filtered = rows.filter(function(r){ return r && r.uploadId === active; });
        // Tương thích dữ liệu cũ chưa có uploadId: chỉ fallback khi toàn bộ dữ liệu đều là dữ liệu cũ.
        if (filtered.length) return filtered;
        var hasAnyUploadId = rows.some(function(r){ return r && r.uploadId; });
        return hasAnyUploadId ? [] : rows;
    }

    function activeAdsUploadLabel(companyId){
        var bucket = ensureCompanyBucket(companyId);
        var active = getActiveAdsUploadId(companyId);
        var found = (bucket.uploads || []).find(function(u){ return u && u.id === active; });
        if (!found) return 'Chưa chọn file chi phí';
        return (found.fileName || found.id) + (found.reportStart || found.reportEnd ? ' [' + (found.reportStart || '') + ' - ' + (found.reportEnd || '') + ']' : '');
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
        var raw = String(text || '');
        var normalized = normalizeText(raw);
        var found = [];

        // Chỉ nhận các mã sản phẩm thật của hệ thống để tránh bắt nhầm hotline, 22KG, 22-22-22, Bài 1...
        // Các mã đang dùng: ONNV108 / NNV108, OVN89 / VN89, OKF61 / KF61, ABC37...
        var skuRegex = /\b(?:O?NNV|O?VN|O?KF|NNV|VN|KF|ABC)\s*[-_]?\s*\d{1,8}\b/ig;

        function pushCodes(segment){
            var m;
            segment = String(segment || '');
            skuRegex.lastIndex = 0;
            while ((m = skuRegex.exec(segment)) !== null) {
                found.push(String(m[0] || '').toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9_-]/g, ''));
            }
        }

        // Ưu tiên vùng MÃ SP và nội dung trong ngoặc.
        var maSpRegex = /M[ÃA]\s*SP\s*[:：]\s*([^|\n\r]+)/ig;
        var m;
        while ((m = maSpRegex.exec(raw)) !== null) pushCodes(m[1] || '');

        var parens = raw.match(/\(([^)]{2,120})\)/g) || [];
        parens.forEach(function(p){ pushCodes(p); });

        // Sau đó quét toàn bộ chuỗi bằng whitelist mã sản phẩm.
        pushCodes(raw);
        pushCodes(normalized);

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

    function getLastNameToken(key){
        var parts = String(key || '').split(/\s+/).filter(Boolean);
        return parts.length ? parts[parts.length - 1] : '';
    }

    function isSameEmployee(a, b){
        a = employeeKey(a); b = employeeKey(b);
        if (!a || !b) return false;
        if (a === b) return true;

        // Cho phép sai khác nhẹ khi một bên ghi thiếu họ/tên đệm.
        if (a.length >= 5 && b.length >= 5 && (a.indexOf(b) !== -1 || b.indexOf(a) !== -1)) return true;

        // Case thực tế: nhóm quảng cáo ghi “THU HIỀN ABC” nhưng chatbot chỉ ghi “Hiền”.
        // Khi một bên chỉ có 1 token tên riêng, so với token cuối của bên còn lại.
        var aParts = a.split(/\s+/).filter(Boolean);
        var bParts = b.split(/\s+/).filter(Boolean);
        if (aParts.length === 1 && a.length >= 3 && a === getLastNameToken(b)) return true;
        if (bParts.length === 1 && b.length >= 3 && b === getLastNameToken(a)) return true;

        return false;
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
        bucket.groups = groupRows(getRowsForActiveUpload(companyId));
        applyChatbotRevenueToGroups(companyId);
        return bucket.groups;
    }

    function applyChatbotRevenueToGroups(companyId){
        var bucket = ensureCompanyBucket(companyId);
        var groups = bucket.groups || [];
        var revenueRows = bucket.chatbotRows || [];
        var activeUploadId = getActiveAdsUploadId(companyId);
        groups.forEach(function(g){ g.revenue = 0; g.chatbotMatches = []; });
        revenueRows.forEach(function(row){ if (row && row.company === companyId && (!row.targetAdsUploadId || row.targetAdsUploadId === activeUploadId)) { row.matchedGroupKey = ''; row.matchedAdsetName = ''; } });
        var matched = 0;
        revenueRows.forEach(function(row){
            if (!row || row.company !== companyId) return;
            if (row.targetAdsUploadId && activeUploadId && row.targetAdsUploadId !== activeUploadId) return;
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
        bucket.chatbotUnmatchedCount = revenueRows.filter(function(r){ return r && r.company === companyId && (!r.targetAdsUploadId || r.targetAdsUploadId === activeUploadId) && !r.matchedGroupKey; }).length;
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
                activeAdsUploadByCompany: ROAS_STATE.activeAdsUploadByCompany || {},
                historySearch: ROAS_STATE.historySearch || '',
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
            ROAS_STATE.activeAdsUploadByCompany = payload.activeAdsUploadByCompany || {};
            ROAS_STATE.historySearch = payload.historySearch || '';
            if (payload.byCompany && typeof payload.byCompany === 'object') {
                Object.keys(payload.byCompany).forEach(function(companyId){
                    var bucket = payload.byCompany[companyId] || {};
                    ROAS_STATE.byCompany[companyId] = {
                        rows: Array.isArray(bucket.rows) ? bucket.rows : [],
                        uploads: Array.isArray(bucket.uploads) ? bucket.uploads : [],
                        chatbotRows: Array.isArray(bucket.chatbotRows) ? bucket.chatbotRows : [],
                        chatbotUploads: Array.isArray(bucket.chatbotUploads) ? bucket.chatbotUploads : [],
                        activeAdsUploadId: bucket.activeAdsUploadId || (ROAS_STATE.activeAdsUploadByCompany && ROAS_STATE.activeAdsUploadByCompany[companyId]) || '',
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


    function hasRecordById(list, id){
        return (list || []).some(function(x){ return x && x.id === id; });
    }

    function mergeFirebaseAdsUpload(companyId, payload){
        payload = payload || {};
        var meta = payload.meta || {};
        var rows = Array.isArray(payload.rows) ? payload.rows : [];
        if (!meta.id) return false;
        companyId = meta.company || companyId;
        if (!companyById(companyId)) return false;
        var bucket = ensureCompanyBucket(companyId);
        if (!hasRecordById(bucket.uploads, meta.id)) bucket.uploads.push(meta);
        if (!hasRecordById(ROAS_STATE.uploadHistory, meta.id)) ROAS_STATE.uploadHistory.push(meta);
        var hasRows = bucket.rows.some(function(r){ return r && r.uploadId === meta.id; });
        if (!hasRows && rows.length) bucket.rows = bucket.rows.concat(rows);
        return true;
    }

    function mergeFirebaseChatbotUpload(payload){
        payload = payload || {};
        var meta = payload.meta || {};
        var rows = Array.isArray(payload.rows) ? payload.rows : [];
        if (!meta.id) return false;
        if (!hasRecordById(ROAS_STATE.chatbotRevenueUploads, meta.id)) ROAS_STATE.chatbotRevenueUploads.push(meta);
        var companyMap = meta.targetAdsUploadsByCompany || {};
        rows.forEach(function(row){
            if (!row || !row.company || !companyById(row.company)) return;
            var bucket = ensureCompanyBucket(row.company);
            if (!bucket.chatbotRows.some(function(x){ return x && x.id === row.id; })) bucket.chatbotRows.push(row);
            if (!hasRecordById(bucket.chatbotUploads, meta.id)) bucket.chatbotUploads.push(meta);
            if (!companyMap[row.company] && row.targetAdsUploadId) {
                companyMap[row.company] = { id: row.targetAdsUploadId, label: row.targetAdsUploadLabel || '' };
            }
        });
        meta.targetAdsUploadsByCompany = companyMap;
        Object.keys(companyMap).forEach(function(companyId){
            if (!companyById(companyId)) return;
            var bucket = ensureCompanyBucket(companyId);
            if (!hasRecordById(bucket.chatbotUploads, meta.id)) bucket.chatbotUploads.push(meta);
        });
        return true;
    }

    function rebuildStateFromFirebaseRoots(uploadsRoot, chatbotRoot){
        uploadsRoot = uploadsRoot || {};
        chatbotRoot = chatbotRoot || {};

        // Firebase là nguồn chuẩn. Tạo lại toàn bộ state để những file đã xóa
        // không còn bị localStorage cũ của tài khoản khác đưa trở lại giao diện.
        var preservedCompany = ROAS_STATE.company || 'NNV';
        var preservedSearch = ROAS_STATE.historySearch || '';
        var preservedActive = Object.assign({}, ROAS_STATE.activeAdsUploadByCompany || {});

        ROAS_STATE.byCompany = {};
        ROAS_STATE.uploadHistory = [];
        ROAS_STATE.chatbotRevenueUploads = [];
        ROAS_STATE.activeAdsUploadByCompany = preservedActive;
        ROAS_STATE.company = preservedCompany;
        ROAS_STATE.historySearch = preservedSearch;
        initCompanyBuckets();

        Object.keys(uploadsRoot).forEach(function(companyId){
            var group = uploadsRoot[companyId] || {};
            Object.keys(group).forEach(function(key){ mergeFirebaseAdsUpload(companyId, group[key]); });
        });
        Object.keys(chatbotRoot).forEach(function(key){ mergeFirebaseChatbotUpload(chatbotRoot[key]); });

        COMPANY_OPTIONS.forEach(function(c){
            var bucket = ensureCompanyBucket(c.id);
            bucket.uploads.sort(function(a,b){ return String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')); });
            bucket.chatbotUploads.sort(function(a,b){ return String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')); });
            getActiveAdsUploadId(c.id);
            rebuildCompanyGroups(c.id);
        });
        ROAS_STATE.uploadHistory.sort(function(a,b){ return String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')); });
        ROAS_STATE.chatbotRevenueUploads.sort(function(a,b){ return String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')); });
        saveLocal();
        renderCompanyData();
        return true;
    }

    function fetchFirebaseStateNow(){
        var db = getDb();
        if (!db) return Promise.reject(new Error('Chưa kết nối được Firebase Database.'));
        ROAS_STATE.firebaseLoading = true;
        return Promise.all([
            db.ref(FIREBASE_ROOT + '/uploads').once('value'),
            db.ref(FIREBASE_ROOT + '/chatbot_revenue_uploads').once('value')
        ]).then(function(snaps){
            var uploadsRoot = snaps[0] && snaps[0].val ? (snaps[0].val() || {}) : {};
            var chatbotRoot = snaps[1] && snaps[1].val ? (snaps[1].val() || {}) : {};
            FIREBASE_LIVE_STATE.uploadsRoot = uploadsRoot;
            FIREBASE_LIVE_STATE.chatbotRoot = chatbotRoot;
            FIREBASE_LIVE_STATE.uploadsReady = true;
            FIREBASE_LIVE_STATE.chatbotReady = true;
            rebuildStateFromFirebaseRoots(uploadsRoot, chatbotRoot);
            ROAS_STATE.firebaseLoaded = true;
            ROAS_STATE.firebaseLoading = false;
            return true;
        }).catch(function(e){
            ROAS_STATE.firebaseLoading = false;
            throw e;
        });
    }

    function scheduleFirebaseRealtimeApply(){
        clearTimeout(FIREBASE_LIVE_STATE.timer);
        FIREBASE_LIVE_STATE.timer = setTimeout(function(){
            if (!FIREBASE_LIVE_STATE.uploadsReady || !FIREBASE_LIVE_STATE.chatbotReady) return;
            rebuildStateFromFirebaseRoots(FIREBASE_LIVE_STATE.uploadsRoot, FIREBASE_LIVE_STATE.chatbotRoot);
            ROAS_STATE.firebaseLoaded = true;
        }, 80);
    }

    function bindFirebaseRealtimeSync(){
        var db = getDb();
        if (!db || ROAS_STATE.firebaseRealtimeBound) return;
        ROAS_STATE.firebaseRealtimeBound = true;

        db.ref(FIREBASE_ROOT + '/uploads').on('value', function(snap){
            FIREBASE_LIVE_STATE.uploadsRoot = snap.val() || {};
            FIREBASE_LIVE_STATE.uploadsReady = true;
            scheduleFirebaseRealtimeApply();
        }, function(e){
            console.error('Không theo dõi được lịch sử file chi phí trên Firebase:', e);
            setStatus('Không đồng bộ được lịch sử file chi phí từ Firebase: ' + esc(e.message || e), 'error');
        });

        db.ref(FIREBASE_ROOT + '/chatbot_revenue_uploads').on('value', function(snap){
            FIREBASE_LIVE_STATE.chatbotRoot = snap.val() || {};
            FIREBASE_LIVE_STATE.chatbotReady = true;
            scheduleFirebaseRealtimeApply();
        }, function(e){
            console.error('Không theo dõi được file doanh thu chatbot trên Firebase:', e);
            setStatus('Không đồng bộ được lịch sử doanh thu chatbot từ Firebase: ' + esc(e.message || e), 'error');
        });
    }

    function loadFirebaseStateOnce(){
        var db = getDb();
        if (!db) return Promise.resolve(false);
        bindFirebaseRealtimeSync();
        if (ROAS_STATE.firebaseLoaded || ROAS_STATE.firebaseLoading) return Promise.resolve(false);
        return fetchFirebaseStateNow().catch(function(e){
            console.warn('Không tải được lịch sử ROAS từ Firebase:', e);
            return false;
        });
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
        var rows = getRowsForActiveUpload(ROAS_STATE.company);
        if (!rows.length) {
            box.innerHTML = '<div class="roas-empty">Chưa có dữ liệu quảng cáo cho công ty/file chi phí đang chọn.</div>';
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

    function chatbotTargetForCompany(record, companyId){
        record = record || {};
        var map = record.targetAdsUploadsByCompany || {};
        if (map[companyId]) return map[companyId];
        if (record.company === companyId && record.targetAdsUploadId) {
            return { id: record.targetAdsUploadId, label: record.targetAdsUploadLabel || '' };
        }
        // Tương thích lịch sử V6: lấy liên kết từ các dòng doanh thu đã lưu.
        var bucket = ensureCompanyBucket(companyId);
        var linkedRow = (bucket.chatbotRows || []).find(function(row){
            if (!row || !row.targetAdsUploadId) return false;
            if (row.chatbotUploadId && record.id) return row.chatbotUploadId === record.id;
            return row.sourceFileName === record.fileName && (!record.uploadedAt || !row.uploadedAt || Math.abs(new Date(row.uploadedAt).getTime() - new Date(record.uploadedAt).getTime()) < 120000);
        });
        return linkedRow ? { id: linkedRow.targetAdsUploadId, label: linkedRow.targetAdsUploadLabel || '' } : null;
    }

    function historyChildrenForUpload(companyId, uploadId){
        var bucket = ensureCompanyBucket(companyId);
        return (bucket.chatbotUploads || []).filter(function(record){
            var target = chatbotTargetForCompany(record, companyId);
            return target && target.id === uploadId;
        }).sort(function(a,b){ return String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')); });
    }

    function selectHistoryUpload(companyId, uploadId){
        if (companyId && companyId !== ROAS_STATE.company) {
            ROAS_STATE.company = companyId;
            var companySelect = document.getElementById('roas-company-select');
            if (companySelect) companySelect.value = companyId;
        }
        setActiveAdsUpload(ROAS_STATE.company, uploadId || '');
        setStatus('Đã chọn file chi phí từ lịch sử: <b>' + esc(activeAdsUploadLabel(ROAS_STATE.company)) + '</b>. File doanh thu chatbot upload tiếp theo sẽ gắn với file này.', 'info');
    }

    function setHistorySearch(value){
        ROAS_STATE.historySearch = String(value || '').trim();
        saveLocal();
        renderHistory();
    }

    function renderHistory(){
        var box = document.getElementById('roas-upload-history');
        if (!box) return;
        var current = ROAS_STATE.company;
        var bucket = ensureCompanyBucket(current);
        var canDeleteFiles = isAdminUser();
        var activeUploadId = getActiveAdsUploadId(current);
        var search = normalizeText(ROAS_STATE.historySearch || '');
        var uploads = (bucket.uploads || []).slice().sort(function(a,b){
            return String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || ''));
        });

        var filtered = uploads.filter(function(upload){
            if (!search) return true;
            var children = historyChildrenForUpload(current, upload.id);
            var haystack = normalizeText([
                upload.fileName, upload.uploader, upload.reportStart, upload.reportEnd,
                children.map(function(c){ return [c.fileName, c.uploader, c.matched, c.unmatched].join(' '); }).join(' ')
            ].join(' '));
            return haystack.indexOf(search) !== -1;
        });

        var companyLabel = (companyById(current) || {}).name || current;
        var html = '' +
            '<div class="roas-history-head">' +
              '<div class="roas-history-title">📂 LỊCH SỬ TẢI LÊN - ' + esc(companyLabel) + '</div>' +
              '<div class="roas-history-search"><span>🔍</span><input id="roas-history-search-input" type="text" placeholder="Tìm file..." value="' + esc(ROAS_STATE.historySearch || '') + '" /></div>' +
            '</div>';

        if (!filtered.length) {
            html += '<div class="roas-history-empty">' + (search ? 'Không tìm thấy file phù hợp.' : 'Chưa có lịch sử upload cho công ty này.') + '</div>';
            box.innerHTML = html;
            var emptySearch = document.getElementById('roas-history-search-input');
            if (emptySearch) emptySearch.oninput = function(){ setHistorySearch(this.value); };
            return;
        }

        html += '<div class="roas-history-list">';
        filtered.forEach(function(upload){
            var isActive = upload.id === activeUploadId;
            var children = historyChildrenForUpload(current, upload.id);
            var range = [upload.reportStart || '', upload.reportEnd || ''].filter(Boolean).join(' - ');
            var stateLabel = isActive ? '<span class="roas-history-active-badge">✓ Đang chọn</span>' : '<span class="roas-history-pick">Bấm để chọn</span>';
            var deleteAdsButton = canDeleteFiles ? '<button type="button" class="roas-history-delete" data-delete-ads-id="' + esc(upload.id) + '" title="Xóa file chi phí và dữ liệu liên quan">Xóa</button>' : '';
            html += '' +
              '<div class="roas-history-group ' + (isActive ? 'is-active' : '') + '">' +
                '<button type="button" class="roas-history-parent" data-upload-id="' + esc(upload.id) + '">' +
                  '<div class="roas-history-time">' + esc(shortDateTime(upload.uploadedAt)) + '</div>' +
                  '<div class="roas-history-main">' +
                    '<div class="roas-history-file">📊 ' + esc(upload.fileName || upload.id) + '</div>' +
                    '<div class="roas-history-meta">' +
                      '<span class="roas-history-user">👤 ' + esc(uploaderLabel(upload)) + '</span>' +
                      (range ? '<span class="roas-history-period">📅 ' + esc(range) + '</span>' : '') +
                      '<span class="roas-history-count">' + esc(upload.rows || 0) + ' dòng / ' + esc(upload.groups || 0) + ' nhóm</span>' +
                    '</div>' +
                  '</div>' +
                  '<div class="roas-history-state">' + stateLabel + '</div>' +
                '</button>' + deleteAdsButton;

            if (children.length) {
                html += '<div class="roas-history-children">';
                children.forEach(function(child, index){
                    var branch = index === children.length - 1 ? '└──' : '├──';
                    var deleteChatbotButton = canDeleteFiles ? '<button type="button" class="roas-history-delete child-delete" data-delete-chatbot-id="' + esc(child.id) + '" title="Xóa file doanh thu chatbot">Xóa</button>' : '';
                    html += '' +
                      '<div class="roas-history-child">' +
                        '<div class="roas-history-branch">' + branch + '</div>' +
                        '<div class="roas-history-child-main">' +
                          '<div class="roas-history-child-file">💬 ' + esc(child.fileName || child.id) + '</div>' +
                          '<div class="roas-history-child-meta">🕒 ' + esc(shortDateTime(child.uploadedAt)) + ' · 👤 ' + esc(uploaderLabel(child)) +
                            ' · Khớp <b>' + esc(child.matched || 0) + '</b> / Chưa khớp <b>' + esc(child.unmatched || 0) + '</b></div>' +
                        '</div>' + deleteChatbotButton +
                      '</div>';
                });
                html += '</div>';
            } else if (isActive) {
                html += '<div class="roas-history-no-child"><span>└──</span> Chưa up doanh thu chatbot cho file chi phí này.</div>';
            }
            html += '</div>';
        });
        html += '</div>';
        box.innerHTML = html;

        var input = document.getElementById('roas-history-search-input');
        if (input) input.oninput = function(){ setHistorySearch(this.value); };
        Array.prototype.forEach.call(box.querySelectorAll('.roas-history-parent[data-upload-id]'), function(btn){
            btn.onclick = function(){ selectHistoryUpload(current, this.getAttribute('data-upload-id')); };
        });
        Array.prototype.forEach.call(box.querySelectorAll('[data-delete-ads-id]'), function(btn){
            btn.onclick = function(ev){
                if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                deleteAdsUpload(current, this.getAttribute('data-delete-ads-id'));
            };
        });
        Array.prototype.forEach.call(box.querySelectorAll('[data-delete-chatbot-id]'), function(btn){
            btn.onclick = function(ev){
                if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                deleteChatbotUpload(this.getAttribute('data-delete-chatbot-id'));
            };
        });
    }

    function collectChatbotRowsByUploadId(uploadId){
        var rows = [];
        COMPANY_OPTIONS.forEach(function(c){
            var bucket = ensureCompanyBucket(c.id);
            (bucket.chatbotRows || []).forEach(function(row){ if (row && row.chatbotUploadId === uploadId) rows.push(row); });
        });
        return rows;
    }

    function findChatbotUploadRecord(uploadId){
        var found = (ROAS_STATE.chatbotRevenueUploads || []).find(function(x){ return x && x.id === uploadId; });
        if (found) return found;
        for (var i = 0; i < COMPANY_OPTIONS.length; i++) {
            var bucket = ensureCompanyBucket(COMPANY_OPTIONS[i].id);
            found = (bucket.chatbotUploads || []).find(function(x){ return x && x.id === uploadId; });
            if (found) return found;
        }
        return null;
    }

    function syncChatbotUploadAfterRowChange(uploadId){
        var record = findChatbotUploadRecord(uploadId);
        var remainingRows = collectChatbotRowsByUploadId(uploadId);
        var db = getDb();
        var path = FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeFirebaseId(uploadId);

        if (!remainingRows.length) {
            ROAS_STATE.chatbotRevenueUploads = (ROAS_STATE.chatbotRevenueUploads || []).filter(function(x){ return !x || x.id !== uploadId; });
            COMPANY_OPTIONS.forEach(function(c){
                var bucket = ensureCompanyBucket(c.id);
                bucket.chatbotUploads = (bucket.chatbotUploads || []).filter(function(x){ return !x || x.id !== uploadId; });
            });
            if (db) db.ref(path).remove().catch(function(e){ console.warn('Không xóa được file chatbot trên Firebase:', e); });
            return;
        }

        record = record || { id: uploadId, type: 'chatbot_revenue' };
        var companyMap = {};
        var companies = {};
        remainingRows.forEach(function(row){
            if (!row || !row.company) return;
            companies[row.company] = true;
            if (row.targetAdsUploadId) companyMap[row.company] = { id: row.targetAdsUploadId, label: row.targetAdsUploadLabel || '' };
        });
        var companyIds = Object.keys(companies);
        record.rows = remainingRows.length;
        record.matched = remainingRows.filter(function(r){ return !!r.matchedGroupKey; }).length;
        record.unmatched = record.rows - record.matched;
        record.targetAdsUploadsByCompany = companyMap;
        record.company = companyIds.length === 1 ? companyIds[0] : '';
        record.companyName = companyIds.length === 1 ? (((companyById(companyIds[0]) || {}).name) || '') : 'Nhiều công ty';

        var replaced = false;
        ROAS_STATE.chatbotRevenueUploads = (ROAS_STATE.chatbotRevenueUploads || []).map(function(x){
            if (x && x.id === uploadId) { replaced = true; return record; }
            return x;
        });
        if (!replaced) ROAS_STATE.chatbotRevenueUploads.unshift(record);

        COMPANY_OPTIONS.forEach(function(c){
            var bucket = ensureCompanyBucket(c.id);
            bucket.chatbotUploads = (bucket.chatbotUploads || []).filter(function(x){ return !x || x.id !== uploadId; });
            if (companies[c.id]) bucket.chatbotUploads.unshift(record);
        });
        if (db) db.ref(path).set({ meta: record, rows: remainingRows, savedAt: nowIso() }).catch(function(e){ console.warn('Không cập nhật được file chatbot trên Firebase:', e); });
    }

    function buildChatbotFirebasePayload(uploadId, rows){
        rows = Array.isArray(rows) ? rows : [];
        if (!rows.length) return null;
        var original = findChatbotUploadRecord(uploadId) || { id: uploadId, type: 'chatbot_revenue' };
        var record = Object.assign({}, original);
        var companyMap = {};
        var companies = {};
        rows.forEach(function(row){
            if (!row || !row.company) return;
            companies[row.company] = true;
            if (row.targetAdsUploadId) companyMap[row.company] = { id: row.targetAdsUploadId, label: row.targetAdsUploadLabel || '' };
        });
        var companyIds = Object.keys(companies);
        record.rows = rows.length;
        record.matched = rows.filter(function(r){ return !!r.matchedGroupKey; }).length;
        record.unmatched = record.rows - record.matched;
        record.targetAdsUploadsByCompany = companyMap;
        record.company = companyIds.length === 1 ? companyIds[0] : '';
        record.companyName = companyIds.length === 1 ? (((companyById(companyIds[0]) || {}).name) || '') : 'Nhiều công ty';
        return { meta: record, rows: rows, savedAt: nowIso() };
    }

    function firebaseDeleteError(action, error){
        console.error(action, error);
        var msg = error && error.message ? error.message : String(error || 'Không rõ lỗi');
        if (error && error.code === 'PERMISSION_DENIED') {
            msg = 'Firebase từ chối quyền xóa. Cần kiểm tra Database Rules cho tài khoản Admin.';
        }
        setStatus('<b>Chưa xóa dữ liệu.</b> ' + esc(msg), 'error');
    }

    function deleteChatbotUpload(uploadId){
        if (!isAdminUser()) { setStatus('Chỉ tài khoản Admin mới có quyền xóa file.', 'error'); return; }
        var record = findChatbotUploadRecord(uploadId);
        var label = record ? (record.fileName || uploadId) : uploadId;
        if (!window.confirm('Xóa file doanh thu chatbot: "' + label + '"? Dữ liệu doanh thu từ file này sẽ bị gỡ khỏi ROAS trên tất cả tài khoản.')) return;

        var db = getDb();
        if (!db) { setStatus('Không kết nối được Firebase nên chưa thể xóa file.', 'error'); return; }
        setStatus('Đang xóa file doanh thu chatbot khỏi Firebase...', 'info');

        db.ref(FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeFirebaseId(uploadId)).remove()
            .then(function(){ return fetchFirebaseStateNow(); })
            .then(function(){ setStatus('Đã xóa file doanh thu chatbot khỏi Firebase: <b>' + esc(label) + '</b>. Các tài khoản khác sẽ tự cập nhật.', 'success'); })
            .catch(function(e){ firebaseDeleteError('Không xóa được file chatbot trên Firebase:', e); });
    }

    function deleteAdsUpload(companyId, uploadId){
        if (!isAdminUser()) { setStatus('Chỉ tài khoản Admin mới có quyền xóa file.', 'error'); return; }
        var bucket = ensureCompanyBucket(companyId);
        var record = (bucket.uploads || []).find(function(x){ return x && x.id === uploadId; });
        var label = record ? (record.fileName || uploadId) : uploadId;
        if (!window.confirm('Xóa file chi phí: "' + label + '"? File sẽ bị xóa khỏi Firebase và biến mất trên tất cả tài khoản. Các dòng doanh thu chatbot đang gắn với file này cũng sẽ bị gỡ.')) return;

        var db = getDb();
        if (!db) { setStatus('Không kết nối được Firebase nên chưa thể xóa file.', 'error'); return; }
        setStatus('Đang xóa file chi phí và cập nhật dữ liệu liên quan trên Firebase...', 'info');

        var affectedChatbotIds = {};
        (bucket.chatbotRows || []).forEach(function(row){
            if (row && row.targetAdsUploadId === uploadId && row.chatbotUploadId) affectedChatbotIds[row.chatbotUploadId] = true;
        });

        var updates = {};
        updates[FIREBASE_ROOT + '/uploads/' + companyId + '/' + safeFirebaseId(uploadId)] = null;

        Object.keys(affectedChatbotIds).forEach(function(chatbotId){
            var remainingRows = collectChatbotRowsByUploadId(chatbotId).filter(function(row){
                return !(row && row.company === companyId && row.targetAdsUploadId === uploadId);
            });
            updates[FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeFirebaseId(chatbotId)] = buildChatbotFirebasePayload(chatbotId, remainingRows);
        });

        db.ref().update(updates)
            .then(function(){ return fetchFirebaseStateNow(); })
            .then(function(){ setStatus('Đã xóa file chi phí khỏi Firebase: <b>' + esc(label) + '</b>. Các tài khoản khác sẽ tự cập nhật.', 'success'); })
            .catch(function(e){ firebaseDeleteError('Không xóa được file chi phí trên Firebase:', e); });
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
                var uploadId = makeId('ADS');
                var wb = await readWorkbookFromFile(file);
                var rows = parseWorkbookToRows(wb);
                rows.forEach(function(row){
                    row.uploadId = uploadId;
                    row.uploadFileName = file.name;
                    row.uploadCompany = company.id;
                });
                var bucket = ensureCompanyBucket(company.id);
                bucket.rows = bucket.rows.concat(rows);

                var ownGroups = groupRows(rows);
                var uploadAccount = currentAccountInfo();
                var record = {
                    id: uploadId,
                    type: 'ads',
                    fileName: file.name,
                    company: company.id,
                    companyName: company.name,
                    rows: rows.length,
                    groups: ownGroups.length,
                    reportStart: firstNonEmpty(ownGroups, 'reportStart'),
                    reportEnd: firstNonEmpty(ownGroups, 'reportEnd'),
                    uploadedAt: nowIso(),
                    uploader: uploadAccount.name,
                    uploaderEmail: uploadAccount.email,
                    uploaderUid: uploadAccount.uid
                };
                bucket.uploads.unshift(record);
                bucket.activeAdsUploadId = record.id;
                ROAS_STATE.activeAdsUploadByCompany[company.id] = record.id;
                rebuildCompanyGroups(company.id);
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
        if (success.length) msg += 'Đã upload và tự phân bổ <b>' + success.length + '</b> file: ' + esc(summarizeCompanyCounts(success)) + '. File chi phí mới nhất của từng công ty đã được chọn làm mặc định để up doanh thu chatbot tương ứng. ';
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
            var adSkus = extractSkusFromText(adText);
            var productSkus = extractSkusFromText(productText);
            // Cột Quảng cáo là nguồn chính để xác định quảng cáo đang chạy sản phẩm nào.
            // Cột Sản phẩm chỉ dùng fallback khi Quảng cáo không có mã, tránh đơn mua kèm làm lệch ROAS.
            var skus = adSkus.length ? adSkus : productSkus;
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
                adSkus: adSkus,
                productSkus: productSkus,
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
            if (!byCompany[c]) byCompany[c] = { rows: 0, amount: 0, matched: 0, unmatched: 0, noAds: false };
            byCompany[c].rows += 1;
            byCompany[c].amount += Number(r.amount) || 0;
            if (r.matchedGroupKey) byCompany[c].matched += 1;
            else byCompany[c].unmatched += 1;
        });
        return Object.keys(byCompany).map(function(c){
            var b = byCompany[c];
            var bucket = ROAS_STATE.byCompany[c];
            var hasAds = !!(bucket && bucket.groups && bucket.groups.length);
            var note = hasAds ? ('khớp ' + b.matched + ' / chưa khớp ' + b.unmatched) : 'chưa có file quảng cáo';
            return c + ': ' + b.rows + ' dòng / ' + b.amount + ' / ' + note;
        }).join(' • ');
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
                    var targetUploadId = getActiveAdsUploadId(row.company);
                    row.targetAdsUploadId = targetUploadId;
                    row.targetAdsUploadLabel = activeAdsUploadLabel(row.company);
                    bucket.chatbotRows.push(row);
                    fileCompanies[row.company] = true;
                    allRows.push(row);
                });

                Object.keys(fileCompanies).forEach(function(companyId){ rebuildCompanyGroups(companyId); });

                var matched = rows.filter(function(r){ return !!r.matchedGroupKey; }).length;
                var unmatched = rows.length - matched;
                var targetAdsUploadsByCompany = {};
                Object.keys(fileCompanies).forEach(function(companyId){
                    targetAdsUploadsByCompany[companyId] = {
                        id: getActiveAdsUploadId(companyId),
                        label: activeAdsUploadLabel(companyId)
                    };
                });
                var uploadAccount = currentAccountInfo();
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
                    uploader: uploadAccount.name,
                    uploaderEmail: uploadAccount.email,
                    uploaderUid: uploadAccount.uid,
                    status: 'mapped_by_team_employee_sku',
                    targetAdsUploadsByCompany: targetAdsUploadsByCompany,
                    targetAdsUploadId: Object.keys(fileCompanies).length === 1 ? getActiveAdsUploadId(Object.keys(fileCompanies)[0]) : '',
                    targetAdsUploadLabel: Object.keys(fileCompanies).length === 1 ? activeAdsUploadLabel(Object.keys(fileCompanies)[0]) : 'Theo file chi phí mặc định của từng công ty'
                };
                rows.forEach(function(row){ row.chatbotUploadId = record.id; });
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
        if (records.length) msg += 'Đã upload và so khớp <b>' + records.length + '</b> file doanh thu chatbot theo file chi phí đang chọn. ' + esc(summarizeChatbotRows(allRows)) + '. ';
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
        if (!isAdminUser()) { setStatus('Chỉ tài khoản Admin mới có quyền xóa dữ liệu.', 'error'); return; }
        var companyId = ROAS_STATE.company;
        var c = companyById(companyId);
        var label = c ? c.exportCode + ' - ' + c.name : companyId;
        if (!confirm('Xóa TOÀN BỘ dữ liệu ROAS của ' + label + ' khỏi Firebase? Dữ liệu sẽ biến mất trên tất cả tài khoản.')) return;

        var db = getDb();
        if (!db) { setStatus('Không kết nối được Firebase nên chưa thể xóa dữ liệu.', 'error'); return; }
        setStatus('Đang xóa toàn bộ dữ liệu ' + esc(label) + ' khỏi Firebase...', 'info');

        var bucket = ensureCompanyBucket(companyId);
        var affectedChatbotIds = {};
        (bucket.chatbotRows || []).forEach(function(row){ if (row && row.chatbotUploadId) affectedChatbotIds[row.chatbotUploadId] = true; });
        var updates = {};
        updates[FIREBASE_ROOT + '/uploads/' + companyId] = null;
        Object.keys(affectedChatbotIds).forEach(function(chatbotId){
            var remainingRows = collectChatbotRowsByUploadId(chatbotId).filter(function(row){ return !row || row.company !== companyId; });
            updates[FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeFirebaseId(chatbotId)] = buildChatbotFirebasePayload(chatbotId, remainingRows);
        });

        db.ref().update(updates)
            .then(function(){ return fetchFirebaseStateNow(); })
            .then(function(){ setStatus('Đã xóa toàn bộ dữ liệu ' + esc(label) + ' khỏi Firebase. Các tài khoản khác sẽ tự cập nhật.', 'success'); })
            .catch(function(e){ firebaseDeleteError('Không xóa được dữ liệu công ty trên Firebase:', e); });
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
            '.roas-history{border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:0;overflow:hidden;}' +
            '.roas-history-head{display:flex;align-items:center;gap:14px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fff;}' +
            '.roas-history-title{font-weight:900;color:#0f172a;white-space:nowrap;font-size:12px;}' +
            '.roas-history-search{position:relative;display:flex;align-items:center;flex:1;}' +
            '.roas-history-search span{position:absolute;left:10px;font-size:12px;pointer-events:none;}' +
            '.roas-history-search input{width:100%;border:1px solid #dbe3ef!important;border-radius:999px!important;background:#f8fafc!important;padding:8px 12px 8px 32px!important;font-size:12px!important;outline:none;}' +
            '.roas-history-search input:focus{background:#fff!important;border-color:#93c5fd!important;box-shadow:0 0 0 3px rgba(37,99,235,.10);}' +
            '.roas-history-empty{color:#64748b;font-weight:750;padding:16px;background:#f8fafc;text-align:center;}' +
            '.roas-history-list{max-height:390px;overflow:auto;}' +
            '.roas-history-group{position:relative;border-bottom:1px solid #eef2f7;background:#fff;}' +
            '.roas-history-group:last-child{border-bottom:none;}' +
            '.roas-history-group.is-active{background:#f8fbff;box-shadow:inset 4px 0 0 #2563eb;}' +
            '.roas-history-parent{width:100%;border:0;background:transparent;display:grid;grid-template-columns:125px minmax(0,1fr) 120px;gap:12px;align-items:center;padding:12px 14px;text-align:left;cursor:pointer;font-family:Arial,Tahoma,sans-serif;}' +
            '.roas-history-parent:hover{background:#eff6ff;}' +
            '.roas-history-time{color:#64748b;font-size:11px;}' +
            '.roas-history-file{color:#0369a1;font-weight:400;font-size:12px;text-decoration:underline;text-underline-offset:2px;word-break:break-word;}' +
            '.roas-history-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}' +
            '.roas-history-meta span{display:inline-flex;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:800;}' +
            '.roas-history-user{background:#e0f2fe;color:#0369a1;}.roas-history-period{background:#fef3c7;color:#92400e;}.roas-history-count{background:#f1f5f9;color:#475569;}' +
            '.roas-history-state{text-align:right;padding-bottom:22px;}.roas-history-active-badge{display:inline-flex;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900;}.roas-history-pick{color:#94a3b8;font-size:10px;font-weight:800;}' +
            '.roas-history-children{padding:0 14px 10px 139px;}' +
            '.roas-history-child{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:center;padding:5px 0;}' +
            '.roas-history-branch{font-family:monospace;color:#cbd5e1;font-size:13px;}' +
            '.roas-history-child-file{color:#b91c1c;font-size:11px;font-weight:400;word-break:break-word;}' +
            '.roas-history-child-meta{color:#94a3b8;font-size:10px;font-style:italic;margin-top:3px;}' +
            '.roas-history-no-child{padding:0 14px 11px 139px;color:#94a3b8;font-size:10px;font-style:italic;}.roas-history-delete{position:absolute;right:14px;bottom:10px;border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:8px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;z-index:2;}.roas-history-delete:hover{background:#dc2626;color:#fff;}.roas-history-delete.child-delete{position:static;align-self:center;}' +
            '@media(max-width:900px){.roas-upload-grid{grid-template-columns:1fr}.roas-summary{grid-template-columns:1fr}.roas-actions{width:100%}.roas-select,.roas-btn{width:100%}.roas-history-head{align-items:flex-start;flex-direction:column}.roas-history-search{width:100%}.roas-history-parent{grid-template-columns:1fr}.roas-history-state{text-align:left}.roas-history-children,.roas-history-no-child{padding-left:28px}.roas-history-time{font-weight:800}}' +
            '</style>' +
            '<div class="roas-tool-shell">' +
              '<div class="roas-tool-head">' +
                '<div><h3>Thống kê ROAS lũy kế</h3><p>Upload file quảng cáo thô từ Meta/Facebook. Hệ thống sẽ tự nhận diện công ty từ tên file, hỗ trợ nhiều file cùng lúc. File chi phí mới upload sẽ tự được chọn làm mặc định. Khi cần đổi file, bấm trực tiếp vào file chi phí trong phần Lịch sử tải lên.</p></div>' +
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
        if (clearBtn) {
            if (isAdminUser()) clearBtn.onclick = clearCurrentCompanyData;
            else clearBtn.style.display = 'none';
        }
        renderCompanyData();
        loadFirebaseStateOnce();
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
        clearCurrentCompanyData: clearCurrentCompanyData,
        setActiveAdsUpload: setActiveAdsUpload,
        selectHistoryUpload: selectHistoryUpload,
        setHistorySearch: setHistorySearch,
        reloadFirebaseHistory: function(){ ROAS_STATE.firebaseLoaded = false; return fetchFirebaseStateNow(); }
    };
})();

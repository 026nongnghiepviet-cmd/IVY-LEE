/* =========================================================
   ROAS STATISTICS MODULE - V19
   File riêng cho menu: Quảng cáo > Thống kê ROAS
   Cập nhật V19:
   - V19: Cột CTR và Tỷ lệ mua/tin trong file Excel xuất ra là ô phần trăm thực, hiển thị theo định dạng 0.00%.
   - V19: CTR từ file Facebook được quy đổi từ giá trị phần trăm của Meta sang tỷ lệ Excel trước khi xuất, tránh hiển thị sai 100 lần.
   - V19: Dòng doanh thu chatbot có Tổng tiền bằng 0 được bỏ qua ngay khi đọc file, không tham gia so khớp, không tính là chưa khớp và không lưu lên Firebase.
   Cập nhật V18:
   - V18: Loại toàn bộ nhóm quảng cáo có tổng chi phí bằng 0 khỏi thống kê, đối chiếu doanh thu và cả hai file xuất.
   - V18: File chi phí vừa upload luôn trở thành file mặc định; các tài khoản khác cũng tự lấy file chi phí mới nhất làm mặc định, trừ khi đang chủ động chọn file khác trong phiên.
   - V18: File doanh thu mới nhất luôn được đối chiếu với file chi phí đang chọn; khi đổi/upload file chi phí, hệ thống tự tính lại.
   - V18: Nếu nhân viên có doanh thu một mã nhưng file chi phí không có đúng cặp Nhân viên + Mã SP, doanh thu không được tính và bảng kiểm tra ghi rõ nhân viên không chạy mã đó.
   Cập nhật V17:
   - V17: Cột “Quảng cáo” có thể chứa 2, 3 hoặc nhiều mã sau “MÃ SP:”; hệ thống tách từng mã theo dấu phẩy, chấm phẩy hoặc dấu gạch chéo.
   - V17: Chỉ cần một mã trong danh sách khớp với nhóm quảng cáo của đúng nhân viên; doanh thu được gán một lần vào đúng mã khớp đầu tiên theo thứ tự trong cột Quảng cáo, không nhân đôi doanh thu.
   - V17: Bổ sung luồng xử lý 2 bước: Bước 1 xử lý file chi phí và xuất file chi phí; Bước 2 nhập file doanh thu mới nhất và xuất file ROAS hoàn chỉnh.
   Cập nhật V16:
   - V16: File doanh thu chatbot chỉ đọc đúng cột có tiêu đề chính xác “Quảng cáo” để tách thông tin đối chiếu.
   - V16: Mã sản phẩm được lấy nguyên văn sau “MÃ SP:” và trước dấu “|”, không áp đặt cấu trúc mã.
   - V16: Tên nhân viên được lấy nguyên văn sau “Nhân viên:” và trước dấu “|” hoặc hết chuỗi; không suy đoán từ cột Sản phẩm hay phần khác.
   Cập nhật V15:
   - V15: Cố định vị trí nút Xóa của file chi phí theo hàng cha, không còn neo xuống cuối nhóm và đè lên nút Xóa file doanh thu.
   - V15: Chuẩn hóa kích thước, khoảng cách và vùng bấm của các nút Xóa trong lịch sử tải lên.
   - V14: Chuẩn hóa font toàn bộ trang ROAS bằng Segoe UI, Arial, Tahoma để hiển thị tiếng Việt rõ và dịu mắt.
   - V14: Giảm tình trạng in đậm tràn lan; nội dung thường dùng 400, nhãn/nút 500-600, tiêu đề và số KPI quan trọng 700.
   - V14: Đồng bộ font cho bảng lịch sử, popup kiểm tra chưa khớp, nút, ô chọn và ô tìm kiếm.
   Cập nhật V13:
   - V13: Thêm bảng kiểm tra chi tiết các dòng doanh thu chatbot chưa khớp.
   - V13: Chỉ rõ nguyên nhân lệch công ty / nhân viên / SKU và gợi ý nhóm quảng cáo gần nhất để đối chiếu.
   - V13: Nút “Kiểm tra dòng chưa khớp” hiển thị ngay dưới file doanh thu trong cây lịch sử.
   Cập nhật V12:
   - V12: Sau khi đồng bộ Firebase, file chi phí đã được file doanh thu mới nhất gắn tới sẽ tự trở thành file mặc định trên mọi tài khoản.
   - V12: Không giữ lựa chọn file cũ từ localStorage làm doanh thu hiển thị 0; chỉ giữ lựa chọn thủ công trong phiên hiện tại.
   - V12: Đọc rows Firebase được cả dạng Array và Object đánh số, tránh mất toàn bộ dòng doanh thu sau khi tải lại.
   - V12: Tự liên kết doanh thu đang chờ với file chi phí mới nhất của đúng công ty khi file chi phí được upload sau.
   - V11: Chỉ sử dụng 1 file doanh thu chatbot mới nhất; file mới thay thế file cũ, tuyệt đối không cộng dồn.
   - V11: Công ty nào có file chi phí thì tự tính công ty đó; công ty chưa có file chi phí được giữ ở trạng thái chờ và không ảnh hưởng công ty khác.
   - V11: File doanh thu upload trước vẫn tự gắn và tính khi file chi phí tương ứng được upload sau.
   - V11: Cây lịch sử hiển thị đúng file doanh thu mới nhất dưới file chi phí đang được liên kết.
   - V10: Không còn báo upload thành công trước khi Firebase xác nhận. Nếu Firebase từ chối quyền, dữ liệu local được hoàn tác và hiển thị lỗi rõ ràng.
   - V10: Khắc phục hiện tượng file hiện lên một lúc rồi biến mất do listener Firebase ghi đè dữ liệu chỉ tồn tại ở localStorage.
   - Tự nhận diện công ty từ tên file, không phụ thuộc công ty đang chọn.
   - Có thể upload nhiều file cùng lúc và tự phân bổ về NNV / VN / KF / ABC.
   - Lưu lịch sử upload và dữ liệu đã upload vào localStorage + Firebase; tải lại lịch sử khi mở trang.
   - Lịch sử dạng cây: file chi phí là dòng cha, file doanh thu chatbot là dòng con; bấm file chi phí để chọn làm mặc định.
   - Bỏ dropdown “File chi phí đang chọn”; chọn trực tiếp trong lịch sử.
   - Admin được xóa file chi phí hoặc file doanh thu chatbot trực tiếp trên Firebase.
   - Firebase là nguồn dữ liệu chuẩn; mọi tài khoản đang mở sẽ tự đồng bộ khi file bị xóa.
   - Ghi chính xác tài khoản đăng nhập đã upload file; tên file hiển thị nét thanh, không in đậm.
   - Up doanh thu chatbot: đọc Team / cột chính xác “Quảng cáo” / Tổng tiền, đối chiếu Team + Nhân viên + SKU với nhóm quảng cáo.
   - Mọi thông tin mã sản phẩm và nhân viên dùng để so khớp chỉ được tách từ cột “Quảng cáo”; không fallback sang cột khác.
   - Tên file xuất dùng mã công ty viết tắt: NNV, VN, KF, ABC.
   - Ngày trong tên file dùng dạng dd.mm.yyyy, ví dụ 01.07.2026.
   - Bắt đầu báo cáo / Kết thúc báo cáo merge cùng block Tên chiến dịch.
   - Font xuất file: Arial.
   - Không tự thêm dấu chấm/dấu phẩy phân cách số. Giữ số raw như file gốc.
   ========================================================= */
(function(){
    'use strict';

    var STORAGE_KEY = 'MKT_ROAS_STATS_V19_DATA';
    var OLD_STORAGE_KEYS = ['MKT_ROAS_STATS_V18_DATA', 'MKT_ROAS_STATS_V17_DATA', 'MKT_ROAS_STATS_V14_DATA', 'MKT_ROAS_STATS_V13_DATA', 'MKT_ROAS_STATS_V12_DATA', 'MKT_ROAS_STATS_V11_DATA', 'MKT_ROAS_STATS_V10_DATA', 'MKT_ROAS_STATS_V9_DATA', 'MKT_ROAS_STATS_V8_DATA', 'MKT_ROAS_STATS_V7_DATA', 'MKT_ROAS_STATS_V6_DATA', 'MKT_ROAS_STATS_V5_DATA', 'MKT_ROAS_STATS_V4_DATA', 'MKT_ROAS_STATS_V3_DATA'];
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
        firebaseRealtimeBound: false,
        manualActiveSelectionByCompany: {}
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
        var uploads = (bucket.uploads || []).slice().sort(function(a,b){
            return String((b && b.uploadedAt) || '').localeCompare(String((a && a.uploadedAt) || ''));
        });
        var manualMap = ROAS_STATE.manualActiveSelectionByCompany || {};
        var manualId = manualMap[companyId] || '';
        var manualExists = manualId && uploads.some(function(u){ return u && u.id === manualId; });

        // Khi người dùng chủ động bấm một file trong lịch sử, giữ file đó trong phiên hiện tại.
        if (manualExists) {
            bucket.activeAdsUploadId = manualId;
            ROAS_STATE.activeAdsUploadByCompany[companyId] = manualId;
            return manualId;
        }

        // Mặc định luôn là file chi phí mới upload gần nhất của công ty.
        // Không để liên kết cũ của file doanh thu kéo giao diện quay về batch chi phí cũ.
        var active = uploads.length ? (uploads[0].id || '') : '';
        bucket.activeAdsUploadId = active;
        ROAS_STATE.activeAdsUploadByCompany[companyId] = active;
        return active;
    }

    function setActiveAdsUpload(companyId, uploadId){
        var bucket = ensureCompanyBucket(companyId);
        if (!ROAS_STATE.manualActiveSelectionByCompany) ROAS_STATE.manualActiveSelectionByCompany = {};
        ROAS_STATE.manualActiveSelectionByCompany[companyId] = uploadId || '';
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

    function getRowsForUpload(companyId, uploadId){
        var bucket = ensureCompanyBucket(companyId);
        var rows = Array.isArray(bucket.rows) ? bucket.rows : [];
        if (!uploadId) return [];
        var filtered = rows.filter(function(r){ return r && r.uploadId === uploadId; });
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

    function extractSkusFromChatbotAd(text){
        var raw = String(text || '');
        if (!raw) return [];
        // Chỉ lấy vùng sau “MÃ SP:” và trước dấu | hoặc xuống dòng.
        // Mỗi mã được tách theo dấu phẩy, chấm phẩy hoặc dấu gạch chéo; không áp đặt cấu trúc mã.
        var m = raw.match(/M[ÃA]\s*SP\s*[:：]\s*([^|\r\n]+)/i);
        if (!m || !m[1]) return [];
        return uniqueList(String(m[1])
            .split(/[,;\/]+/)
            .map(function(part){ return normalizeSkuValue(part); })
            .filter(Boolean));
    }

    function extractSkuFromChatbotAd(text){
        var skus = extractSkusFromChatbotAd(text);
        return skus.length ? skus[0] : '';
    }

    function extractEmployeeFromChatbotAd(text){
        var raw = String(text || '').trim();
        if (!raw) return '';
        // Chỉ lấy sau “Nhân viên:” và trước dấu | hoặc hết chuỗi. Không suy đoán từ phần khác.
        var m = raw.match(/Nh[aâ]n\s*vi[eê]n\s*[:：]\s*([^|\r\n]+)/i);
        return m && m[1] ? cleanEmployeeName(m[1]) : '';
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

    function findRevenueGroupMatch(groups, row){
        var revenueSkus = uniqueList((row && row.skus) || []);
        var employee = row ? row.employee : '';
        // Duyệt mã theo đúng thứ tự trong cột Quảng cáo. Gặp mã đầu tiên khớp đúng nhân viên thì dừng,
        // nhờ vậy một dòng doanh thu chỉ được cộng đúng một lần, không nhân đôi khi có nhiều mã.
        for (var i = 0; i < revenueSkus.length; i++) {
            var wantedSku = revenueSkus[i];
            for (var g = 0; g < (groups || []).length; g++) {
                var group = groups[g] || {};
                if (!isSameEmployee(group.employee || getCampaignName(group.adsetName), employee)) continue;
                var groupSkus = uniqueList(group.skus || (group.sku ? [group.sku] : []));
                if (groupSkus.indexOf(wantedSku) !== -1) {
                    return { group: group, matchedSku: wantedSku };
                }
            }
        }
        return null;
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

    function normalizeSkuValue(value){
        return String(value || '')
            .trim()
            .replace(/\s+/g, ' ')
            .toUpperCase();
    }

    function extractSkusFromAdsetName(adsetName){
        var s = String(adsetName || '');
        var matches = s.match(/\(([^)]{1,120})\)/g) || [];
        var found = [];
        matches.forEach(function(block){
            var content = String(block || '').replace(/^\(|\)$/g, '').trim();
            if (!content) return;
            // Mã trong tên nhóm quảng cáo nằm trong ngoặc. Không áp đặt mã phải có chữ/số theo mẫu cố định.
            content.split(/[,;/|]+/).forEach(function(part){
                var sku = normalizeSkuValue(part);
                if (sku) found.push(sku);
            });
        });
        return uniqueList(found);
    }

    function getSku(adsetName){
        var skus = extractSkusFromAdsetName(adsetName);
        return skus.length ? skus[0] : '';
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

    function ctrToExcelPercent(v){
        if (v === null || v === undefined || v === '') return '';
        var raw = String(v).trim();
        if (!raw || raw === '-') return '';
        raw = raw.replace('%', '').trim();
        if (/^-?\d+,\d+$/.test(raw)) raw = raw.replace(',', '.');
        var n = Number(raw);
        if (!isFinite(n)) return '';

        // File Meta/Facebook xuất CTR theo điểm phần trăm (ví dụ 0.434513 nghĩa là 0.434513%).
        // Excel cần tỷ lệ thập phân để định dạng 0.00%, vì vậy luôn chia 100.
        // Trường hợp dữ liệu có ký hiệu % cũng áp dụng cùng quy tắc.
        return n / 100;
    }

    function isNonZeroRevenueRow(row){
        return !!row && (Number(row.amount) || 0) !== 0;
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

    function findExactLiteralHeaderIndex(headers, exactTitle){
        for (var i = 0; i < headers.length; i++) {
            if (String(headers[i] || '').trim() === exactTitle) return i;
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
                skus: extractSkusFromAdsetName(adsetName),
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

    function groupTotalSpend(group){
        return ((group && group.rows) || []).reduce(function(sum, row){
            return sum + (Number(row && row.spend) || 0);
        }, 0);
    }

    function positiveSpendGroups(groups){
        return (groups || []).filter(function(group){ return groupTotalSpend(group) > 0; });
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

        // Nhóm có tổng chi phí bằng 0 được xem là chưa phát sinh quảng cáo.
        // Không đưa vào thống kê, không nhận doanh thu và không xuất ra Excel.
        var validGroups = positiveSpendGroups(groups);
        validGroups.zeroSpendExcludedCount = groups.length - validGroups.length;
        return validGroups;
    }

    function rebuildCompanyGroups(companyId){
        var bucket = ensureCompanyBucket(companyId);
        bucket.groups = groupRows(getRowsForActiveUpload(companyId));
        applyChatbotRevenueToGroups(companyId);
        return bucket.groups;
    }

    function latestChatbotUploadRecord(){
        var list = (ROAS_STATE.chatbotRevenueUploads || []).slice().filter(function(x){ return x && x.id; });
        list.sort(function(a,b){
            return String(b.uploadedAt || b.savedAt || '').localeCompare(String(a.uploadedAt || a.savedAt || ''));
        });
        return list[0] || null;
    }

    function effectiveTargetUploadIdForRow(row, companyId){
        // File doanh thu mới nhất luôn được đối chiếu với file chi phí đang chọn của công ty.
        // Nhờ vậy khi upload file chi phí mới hoặc bấm chọn file khác trong lịch sử, số liệu được tính lại ngay.
        var activeId = getActiveAdsUploadId(companyId);
        if (activeId) return activeId;

        // Chỉ dùng liên kết cũ làm phương án tương thích khi công ty chưa có file chi phí đang hoạt động.
        var bucket = ensureCompanyBucket(companyId);
        var uploads = bucket.uploads || [];
        var explicitId = row && row.targetAdsUploadId ? String(row.targetAdsUploadId) : '';
        var explicitExists = explicitId && uploads.some(function(u){ return u && u.id === explicitId; });
        if (explicitExists) return explicitId;

        var latestRecord = latestChatbotUploadRecord();
        var mapped = latestRecord && latestRecord.targetAdsUploadsByCompany
            ? latestRecord.targetAdsUploadsByCompany[companyId]
            : null;
        var mappedId = mapped && mapped.id ? String(mapped.id) : '';
        var mappedExists = mappedId && uploads.some(function(u){ return u && u.id === mappedId; });
        return mappedExists ? mappedId : '';
    }

    function applyChatbotRevenueToGroups(companyId){
        var bucket = ensureCompanyBucket(companyId);
        var groups = bucket.groups || [];
        var latestRecord = latestChatbotUploadRecord();
        var latestId = latestRecord ? latestRecord.id : '';
        var revenueRows = (bucket.chatbotRows || []).filter(function(row){
            return isNonZeroRevenueRow(row) && (!latestId || row.chatbotUploadId === latestId);
        });
        var activeUploadId = getActiveAdsUploadId(companyId);

        groups.forEach(function(g){ g.revenue = 0; g.chatbotMatches = []; });
        revenueRows.forEach(function(row){
            if (!row || row.company !== companyId) return;
            row.matchedSku = '';
            row.matchedGroupKey = '';
            row.matchedAdsetName = '';
            row.effectiveTargetAdsUploadId = effectiveTargetUploadIdForRow(row, companyId);
        });

        var matched = 0;
        revenueRows.forEach(function(row){
            if (!row || row.company !== companyId) return;
            if (!activeUploadId) return;

            var effectiveTargetId = row.effectiveTargetAdsUploadId || effectiveTargetUploadIdForRow(row, companyId);
            if (!effectiveTargetId || effectiveTargetId !== activeUploadId) return;

            var matchResult = findRevenueGroupMatch(groups, row);
            if (!matchResult || !matchResult.group) return;

            var target = matchResult.group;
            var amount = Number(row.amount) || 0;
            target.revenue = (Number(target.revenue) || 0) + amount;
            target.chatbotMatches.push(row);
            row.matchedSku = matchResult.matchedSku || '';
            row.matchedGroupKey = target.key;
            row.matchedAdsetName = target.adsetName;
            matched++;
        });

        bucket.chatbotMatchedCount = matched;
        bucket.chatbotUnmatchedCount = revenueRows.filter(function(row){
            if (!row || row.company !== companyId) return false;
            var targetId = row.effectiveTargetAdsUploadId || effectiveTargetUploadIdForRow(row, companyId);
            return !!activeUploadId && targetId === activeUploadId && !row.matchedGroupKey;
        }).length;
        bucket.chatbotPendingCount = revenueRows.filter(function(row){
            return row && row.company === companyId && !effectiveTargetUploadIdForRow(row, companyId);
        }).length;
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
                if (r > 0 && (c === 15 || c === 20)) {
                    ws[addr].z = '0.00%';
                    ws[addr].s.numFmt = '0.00%';
                }
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
                row[15] = ctrToExcelPercent(r.ctr);
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

    function firebaseWriteMessage(error){
        var code = String(error && error.code || '').toLowerCase();
        var message = String(error && error.message || error || 'Không xác định');
        if (code.indexOf('permission') !== -1 || message.toLowerCase().indexOf('permission_denied') !== -1) {
            return 'Firebase từ chối quyền ghi. Quyền ROAS trong giao diện chưa tự động thay đổi Firebase Database Rules. Cần cấp quyền ghi đường dẫn roas_statistics cho UID này.';
        }
        return message;
    }

    function saveUploadToFirebase(record, rows){
        var db = getDb();
        if (!db) return Promise.reject(new Error('Không kết nối được Firebase Database.'));
        var safeId = record.id.replace(/[.#$\[\]/]/g, '_');
        return db.ref(FIREBASE_ROOT + '/uploads/' + record.company + '/' + safeId).set({
            meta: record,
            rows: rows || [],
            savedAt: nowIso()
        });
    }

    function saveChatbotToFirebase(record, rows){
        var db = getDb();
        if (!db) return Promise.reject(new Error('Không kết nối được Firebase Database.'));
        var safeId = record.id.replace(/[.#$\[\]/]/g, '_');
        return db.ref(FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeId).set({ meta: record, rows: rows || [], savedAt: nowIso() });
    }


    function hasRecordById(list, id){
        return (list || []).some(function(x){ return x && x.id === id; });
    }

    function firebaseRowsToArray(value){
        if (Array.isArray(value)) return value.filter(function(x){ return x !== null && x !== undefined; });
        if (!value || typeof value !== 'object') return [];
        return Object.keys(value)
            .sort(function(a,b){
                var na = Number(a), nb = Number(b);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return String(a).localeCompare(String(b));
            })
            .map(function(key){ return value[key]; })
            .filter(function(x){ return x !== null && x !== undefined; });
    }

    function getLatestChatbotPayload(chatbotRoot){
        chatbotRoot = chatbotRoot || {};
        var latest = null;
        Object.keys(chatbotRoot).forEach(function(key){
            var payload = chatbotRoot[key] || {};
            var meta = payload.meta || {};
            if (!meta.id) return;
            var stamp = String(meta.uploadedAt || payload.savedAt || '');
            if (!latest || stamp > latest.stamp || (stamp === latest.stamp && String(key) > latest.key)) {
                latest = { key: String(key), stamp: stamp, payload: payload };
            }
        });
        return latest ? latest.payload : null;
    }

    function mergeFirebaseAdsUpload(companyId, payload){
        payload = payload || {};
        var meta = payload.meta || {};
        var rows = firebaseRowsToArray(payload.rows);
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
        var rows = firebaseRowsToArray(payload.rows).filter(isNonZeroRevenueRow);
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
        var preservedManual = Object.assign({}, ROAS_STATE.manualActiveSelectionByCompany || {});

        ROAS_STATE.byCompany = {};
        ROAS_STATE.uploadHistory = [];
        ROAS_STATE.chatbotRevenueUploads = [];
        ROAS_STATE.activeAdsUploadByCompany = {};
        ROAS_STATE.manualActiveSelectionByCompany = preservedManual;
        ROAS_STATE.company = preservedCompany;
        ROAS_STATE.historySearch = preservedSearch;
        initCompanyBuckets();

        Object.keys(uploadsRoot).forEach(function(companyId){
            var group = uploadsRoot[companyId] || {};
            Object.keys(group).forEach(function(key){ mergeFirebaseAdsUpload(companyId, group[key]); });
        });
        var latestChatbotPayload = getLatestChatbotPayload(chatbotRoot);
        if (latestChatbotPayload) mergeFirebaseChatbotUpload(latestChatbotPayload);

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
        renderWorkflow();
        renderSummary();
        renderHistory();
    }

    function latestChatbotRowsForCompany(companyId){
        var latest = latestChatbotUploadRecord();
        if (!latest) return [];
        var bucket = ensureCompanyBucket(companyId);
        return (bucket.chatbotRows || []).filter(function(row){
            return isNonZeroRevenueRow(row) && row.chatbotUploadId === latest.id && row.company === companyId;
        });
    }

    function focusWorkflowStep(stepNumber){
        setTimeout(function(){
            var el = document.getElementById('roas-workflow-step-' + stepNumber);
            if (!el) return;
            el.classList.add('is-highlighted');
            try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}
            setTimeout(function(){ el.classList.remove('is-highlighted'); }, 1600);
        }, 80);
    }

    function bindWorkflowActions(){
        var costInput = document.getElementById('roas-file-input');
        var chatbotInput = document.getElementById('roas-chatbot-file-input');
        Array.prototype.forEach.call(document.querySelectorAll('[data-roas-upload-cost]'), function(btn){
            btn.onclick = function(){ if (costInput) costInput.click(); };
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-roas-upload-chatbot]'), function(btn){
            btn.onclick = function(){ if (chatbotInput) chatbotInput.click(); };
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-roas-export-cost]'), function(btn){
            btn.onclick = exportCostFile;
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-roas-export-final]'), function(btn){
            btn.onclick = exportRoasFile;
        });
    }

    function renderWorkflow(){
        var box = document.getElementById('roas-workflow');
        if (!box) return;
        var companyId = ROAS_STATE.company;
        var bucket = ensureCompanyBucket(companyId);
        var rows = getRowsForActiveUpload(companyId);
        var groups = bucket.groups || [];
        var activeId = getActiveAdsUploadId(companyId);
        var activeUpload = (bucket.uploads || []).find(function(u){ return u && u.id === activeId; }) || null;
        var latestChatbot = latestChatbotUploadRecord();
        var revenueRows = latestChatbotRowsForCompany(companyId);
        var matched = revenueRows.filter(function(row){ return !!row.matchedGroupKey; }).length;
        var unmatched = revenueRows.length - matched;
        var step1Done = !!(rows.length && groups.length && activeUpload);
        var step2Done = !!(step1Done && latestChatbot && revenueRows.length);

        var step1State = step1Done ? 'done' : 'active';
        var step2State = step1Done ? (step2Done ? 'done' : 'active') : 'locked';

        var step1Body = step1Done
            ? '<div class="roas-workflow-file">📊 ' + esc(activeUpload.fileName || '') + '</div>' +
              '<div class="roas-workflow-note">Đã gom ' + esc(rows.length) + ' dòng thành ' + esc(groups.length) + ' nhóm có phát sinh chi phí' + ((activeUpload.zeroSpendGroupsExcluded || 0) ? '; đã loại ' + esc(activeUpload.zeroSpendGroupsExcluded) + ' nhóm có tổng chi phí bằng 0' : '') + '.</div>' +
              '<div class="roas-workflow-actions"><button type="button" class="roas-step-btn light" data-roas-upload-cost>Up file chi phí khác</button><button type="button" class="roas-step-btn primary" data-roas-export-cost>Xuất file chi phí</button></div>'
            : '<div class="roas-workflow-note">Upload file quảng cáo Facebook. Hệ thống tự nhận diện công ty và gom nhóm quảng cáo ngầm.</div>' +
              '<div class="roas-workflow-actions"><button type="button" class="roas-step-btn primary" data-roas-upload-cost>Up file chi phí quảng cáo</button></div>';

        var step2Body = '';
        if (!step1Done) {
            step2Body = '<div class="roas-workflow-note">Hoàn thành Bước 1 để mở phần nhập doanh thu chatbot.</div>';
        } else if (!step2Done) {
            step2Body = '<div class="roas-workflow-note">Chọn một file doanh thu chatbot mới nhất. File mới sẽ thay thế file cũ, không cộng dồn.</div>' +
                '<div class="roas-workflow-actions"><button type="button" class="roas-step-btn success" data-roas-upload-chatbot>Up doanh thu chatbot</button></div>';
        } else {
            step2Body = '<div class="roas-workflow-file">💬 ' + esc(latestChatbot.fileName || '') + '</div>' +
                '<div class="roas-workflow-note">' + esc(revenueRows.length) + ' dòng · Khớp ' + esc(matched) + ' / Chưa khớp ' + esc(unmatched) + '. Chỉ file doanh thu mới nhất được tính.</div>' +
                '<div class="roas-workflow-actions"><button type="button" class="roas-step-btn light" data-roas-upload-chatbot>Thay file doanh thu</button><button type="button" class="roas-step-btn success" data-roas-export-final>Xuất file ROAS hoàn chỉnh</button></div>';
        }

        box.innerHTML = '' +
            '<div class="roas-workflow-line"></div>' +
            '<section class="roas-workflow-step ' + step1State + '" id="roas-workflow-step-1">' +
              '<div class="roas-step-number">1</div><div class="roas-step-content"><div class="roas-step-title">Bước 1: Xử lý file chi phí quảng cáo</div>' + step1Body + '</div>' +
              '<div class="roas-step-status">' + (step1Done ? 'Đã xử lý' : 'Đang chờ') + '</div>' +
            '</section>' +
            '<section class="roas-workflow-step ' + step2State + '" id="roas-workflow-step-2">' +
              '<div class="roas-step-number">2</div><div class="roas-step-content"><div class="roas-step-title">Bước 2: Nhập doanh thu và xuất file cuối</div>' + step2Body + '</div>' +
              '<div class="roas-step-status">' + (step2Done ? 'Hoàn tất' : (step1Done ? 'Tiếp theo' : 'Đang khóa')) + '</div>' +
            '</section>';
        bindWorkflowActions();
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
        var bucket = ensureCompanyBucket(companyId);
        var uploads = bucket.uploads || [];
        var activeId = getActiveAdsUploadId(companyId);
        var latestRecord = latestChatbotUploadRecord();

        // File doanh thu mới nhất luôn hiển thị dưới file chi phí đang được chọn.
        if (activeId && latestRecord && record.id === latestRecord.id) {
            return { id: activeId, label: activeAdsUploadLabel(companyId), dynamic: true };
        }

        var map = record.targetAdsUploadsByCompany || {};
        var mapped = map[companyId] || null;

        if (mapped && mapped.id && uploads.some(function(u){ return u && u.id === mapped.id; })) {
            return mapped;
        }
        if (record.company === companyId && record.targetAdsUploadId &&
            uploads.some(function(u){ return u && u.id === record.targetAdsUploadId; })) {
            return { id: record.targetAdsUploadId, label: record.targetAdsUploadLabel || '' };
        }

        var linkedRow = (bucket.chatbotRows || []).find(function(row){
            if (!row) return false;
            if (record.id && row.chatbotUploadId && row.chatbotUploadId !== record.id) return false;
            return row.company === companyId;
        });
        if (linkedRow && linkedRow.targetAdsUploadId &&
            uploads.some(function(u){ return u && u.id === linkedRow.targetAdsUploadId; })) {
            return { id: linkedRow.targetAdsUploadId, label: linkedRow.targetAdsUploadLabel || '' };
        }

        if (linkedRow && activeId) {
            return { id: activeId, label: activeAdsUploadLabel(companyId), dynamic: true };
        }
        return null;
    }

    function chatbotStatsForCompany(record, companyId, uploadId){
        var bucket = ensureCompanyBucket(companyId);
        var rows = (bucket.chatbotRows || []).filter(function(row){
            return isNonZeroRevenueRow(row) && row.company === companyId && (!record.id || row.chatbotUploadId === record.id);
        });
        var relevant = rows.filter(function(row){
            return effectiveTargetUploadIdForRow(row, companyId) === uploadId;
        });
        var checked = relevant.map(function(row){ return evaluateChatbotRowAgainstUpload(row, companyId, uploadId); });
        var matchedCount = checked.filter(function(result){ return result.matched; }).length;
        return {
            rows: relevant.length,
            matched: matchedCount,
            unmatched: relevant.length - matchedCount,
            amount: relevant.reduce(function(sum, row){ return sum + (Number(row.amount) || 0); }, 0)
        };
    }

    function evaluateChatbotRowAgainstUpload(row, companyId, uploadId){
        var groups = groupRows(getRowsForUpload(companyId, uploadId));
        var employee = String((row && row.employee) || '').trim();
        var skus = uniqueList((row && row.skus) || []);
        var employeeGroups = groups.filter(function(g){
            return isSameEmployee(g.employee || getCampaignName(g.adsetName), employee);
        });
        var skuGroups = groups.filter(function(g){
            return hasSkuMatch(g.skus || (g.sku ? [g.sku] : []), skus);
        });
        var exactGroups = groups.filter(function(g){
            return isSameEmployee(g.employee || getCampaignName(g.adsetName), employee) &&
                hasSkuMatch(g.skus || (g.sku ? [g.sku] : []), skus);
        });

        var reason = '';
        var suggestion = '';
        if (!groups.length) {
            reason = 'File chi phí này không có dòng quảng cáo để đối chiếu.';
            suggestion = 'Kiểm tra lại file chi phí đã chọn hoặc upload lại file quảng cáo đúng công ty.';
        } else if (!row || !row.company) {
            reason = 'Không xác định được công ty từ cột Team.';
            suggestion = 'Chuẩn hóa Team thành NNV, VN, KF hoặc ABC.';
        } else if (row.company !== companyId) {
            reason = 'Công ty trong cột Team không trùng với file chi phí đang kiểm tra.';
            suggestion = 'Team nhận diện: ' + (row.company || 'trống') + '; file chi phí: ' + companyId + '.';
        } else if (!employee) {
            reason = 'Không tách được tên nhân viên từ cột Quảng cáo.';
            suggestion = 'Kiểm tra đúng cột “Quảng cáo”: tên phải nằm ngay sau “Nhân viên:” và trước dấu “|” hoặc hết chuỗi.';
        } else if (!skus.length) {
            reason = 'Không tìm thấy mã sản phẩm nào trong cột Quảng cáo.';
            suggestion = 'Kiểm tra đúng cột “Quảng cáo”: một hoặc nhiều mã phải nằm sau “MÃ SP:” và trước dấu “|”; các mã cách nhau bằng dấu phẩy, chấm phẩy hoặc dấu gạch chéo. Hệ thống không áp đặt cấu trúc mã.';
        } else if (exactGroups.length) {
            reason = 'Đã khớp đủ công ty, nhân viên và mã sản phẩm.';
            suggestion = exactGroups[0].adsetName || '';
        } else if (employeeGroups.length && !skuGroups.length) {
            reason = 'Nhân viên này không chạy quảng cáo mã sản phẩm đã ghi trong file doanh thu.';
            var employeeSkus = uniqueList([].concat.apply([], employeeGroups.map(function(g){ return g.skus || (g.sku ? [g.sku] : []); })));
            suggestion = 'Doanh thu không được tính. Trong file chi phí, nhân viên này chỉ đang chạy SKU: ' + (employeeSkus.join(', ') || 'không xác định') + '.';
        } else if (!employeeGroups.length && skuGroups.length) {
            reason = 'Mã sản phẩm có chạy quảng cáo nhưng không phải do nhân viên này chạy.';
            var skuEmployees = uniqueList(skuGroups.map(function(g){ return g.employee || getCampaignName(g.adsetName); }));
            suggestion = 'Doanh thu không được tính cho nhân viên ' + employee + '. SKU này đang thuộc nhân viên: ' + (skuEmployees.join(', ') || 'không xác định') + '.';
        } else if (employeeGroups.length && skuGroups.length) {
            reason = 'Nhân viên không chạy quảng cáo mã sản phẩm này trong file chi phí đang chọn.';
            suggestion = 'Doanh thu không được tính. Nhân viên ' + employee + ' và SKU ' + skus.join(', ') + ' có xuất hiện riêng lẻ nhưng không có đúng cặp Nhân viên + Mã SP.';
        } else {
            reason = 'Không khớp cả tên nhân viên lẫn mã sản phẩm.';
            var nearby = groups.filter(function(g){
                var gEmp = normalizeText(g.employee || getCampaignName(g.adsetName));
                var rEmp = normalizeText(employee);
                return rEmp && gEmp && (gEmp.indexOf(getLastNameToken(rEmp)) !== -1 || rEmp.indexOf(getLastNameToken(gEmp)) !== -1);
            }).slice(0, 3).map(function(g){ return g.adsetName; });
            suggestion = nearby.length ? 'Nhóm gần giống: ' + nearby.join(' | ') : 'Kiểm tra lại Team, Nhân viên và MÃ SP trong file chatbot.';
        }

        return {
            matched: exactGroups.length > 0,
            group: exactGroups[0] || null,
            reason: reason,
            suggestion: suggestion,
            employeeMatches: employeeGroups.length,
            skuMatches: skuGroups.length
        };
    }

    function chatbotReviewRows(record, companyId, uploadId, onlyUnmatched){
        var bucket = ensureCompanyBucket(companyId);
        var rows = (bucket.chatbotRows || []).filter(function(row){
            if (!isNonZeroRevenueRow(row) || row.company !== companyId) return false;
            if (record && record.id && row.chatbotUploadId !== record.id) return false;
            return effectiveTargetUploadIdForRow(row, companyId) === uploadId;
        });
        return rows.map(function(row){
            return { row: row, check: evaluateChatbotRowAgainstUpload(row, companyId, uploadId) };
        }).filter(function(item){ return !onlyUnmatched || !item.check.matched; });
    }

    function closeRoasUnmatchedReview(){
        var modal = document.getElementById('roas-unmatched-review-modal');
        if (modal) modal.remove();
    }

    function showRoasUnmatchedReview(chatbotUploadId, companyId, uploadId){
        var record = findChatbotUploadRecord(chatbotUploadId);
        if (!record) {
            setStatus('Không tìm thấy file doanh thu chatbot trong lịch sử.', 'error');
            return;
        }
        var allRows = chatbotReviewRows(record, companyId, uploadId, false);
        var unmatchedRows = allRows.filter(function(item){ return !item.check.matched; });
        var upload = (ensureCompanyBucket(companyId).uploads || []).find(function(u){ return u && u.id === uploadId; });
        if (!unmatchedRows.length) {
            setStatus('Tất cả ' + allRows.length + ' dòng doanh thu của ' + esc(companyId) + ' đã khớp với file chi phí này.', 'success');
            return;
        }

        closeRoasUnmatchedReview();
        var tableRows = unmatchedRows.map(function(item, index){
            var row = item.row || {};
            var check = item.check || {};
            var amountDisplay = row.amountRaw !== '' && row.amountRaw !== null && row.amountRaw !== undefined ? row.amountRaw : row.amount;
            return '' +
              '<tr>' +
                '<td class="roas-review-center">' + esc(index + 1) + '</td>' +
                '<td class="roas-review-center">' + esc(row.rowNumber || '') + '</td>' +
                '<td>' + esc(row.team || row.company || '') + '</td>' +
                '<td><b>' + esc(row.employee || 'Không đọc được') + '</b></td>' +
                '<td>' + esc((row.skus || []).join(', ') || 'Không có mã') + '</td>' +
                '<td class="roas-review-amount">' + esc(amountDisplay || 0) + '</td>' +
                '<td class="roas-review-ad">' + esc(row.adText || '') + '</td>' +
                '<td><div class="roas-review-reason">' + esc(check.reason || '') + '</div><div class="roas-review-suggestion">' + esc(check.suggestion || '') + '</div></td>' +
              '</tr>';
        }).join('');

        var modal = document.createElement('div');
        modal.id = 'roas-unmatched-review-modal';
        modal.className = 'roas-review-overlay';
        modal.innerHTML = '' +
          '<div class="roas-review-modal" role="dialog" aria-modal="true">' +
            '<div class="roas-review-head">' +
              '<div><h3>Kiểm tra dòng doanh thu chưa khớp</h3><p>File doanh thu: ' + esc(record.fileName || record.id) + '<br>File chi phí: ' + esc((upload && upload.fileName) || uploadId) + '</p></div>' +
              '<button type="button" class="roas-review-close" aria-label="Đóng">×</button>' +
            '</div>' +
            '<div class="roas-review-kpis">' +
              '<div><b>' + esc(allRows.length) + '</b><span>Tổng dòng ' + esc(companyId) + '</span></div>' +
              '<div><b>' + esc(allRows.length - unmatchedRows.length) + '</b><span>Đã khớp</span></div>' +
              '<div class="bad"><b>' + esc(unmatchedRows.length) + '</b><span>Chưa khớp</span></div>' +
            '</div>' +
            '<div class="roas-review-table-wrap"><table class="roas-review-table"><thead><tr>' +
              '<th>STT</th><th>Dòng Excel</th><th>Team</th><th>Nhân viên</th><th>Mã SP</th><th>Doanh thu</th><th>Nội dung Quảng cáo chatbot</th><th>Nguyên nhân và gợi ý kiểm tra</th>' +
            '</tr></thead><tbody>' + tableRows + '</tbody></table></div>' +
            '<div class="roas-review-foot"><span>Chỉnh lại dữ liệu nguồn rồi upload lại file doanh thu mới nhất; hệ thống sẽ thay thế file cũ, không cộng dồn.</span><button type="button" class="roas-review-done">Đóng</button></div>' +
          '</div>';
        document.body.appendChild(modal);
        modal.onclick = function(ev){ if (ev.target === modal) closeRoasUnmatchedReview(); };
        var closeBtn = modal.querySelector('.roas-review-close');
        var doneBtn = modal.querySelector('.roas-review-done');
        if (closeBtn) closeBtn.onclick = closeRoasUnmatchedReview;
        if (doneBtn) doneBtn.onclick = closeRoasUnmatchedReview;
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
                    var stats = chatbotStatsForCompany(child, current, upload.id);
                    var deleteChatbotButton = canDeleteFiles ? '<button type="button" class="roas-history-delete child-delete" data-delete-chatbot-id="' + esc(child.id) + '" title="Xóa file doanh thu chatbot">Xóa</button>' : '';
                    var reviewButton = stats.unmatched > 0
                        ? '<button type="button" class="roas-history-review" data-review-chatbot-id="' + esc(child.id) + '" data-review-upload-id="' + esc(upload.id) + '">Kiểm tra ' + esc(stats.unmatched) + ' dòng</button>'
                        : '<span class="roas-history-all-matched">Đã khớp hết</span>';
                    html += '' +
                      '<div class="roas-history-child">' +
                        '<div class="roas-history-branch">' + branch + '</div>' +
                        '<div class="roas-history-child-main">' +
                          '<div class="roas-history-child-file">💬 ' + esc(child.fileName || child.id) + '</div>' +
                          '<div class="roas-history-child-meta">🕒 ' + esc(shortDateTime(child.uploadedAt)) + ' · 👤 ' + esc(uploaderLabel(child)) +
                            ' · ' + esc(stats.rows) + ' dòng · Khớp <b>' + esc(stats.matched) + '</b> / Chưa khớp <b>' + esc(stats.unmatched) + '</b></div>' +
                        '</div><div class="roas-history-child-actions">' + reviewButton + deleteChatbotButton + '</div>' +
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
        Array.prototype.forEach.call(box.querySelectorAll('[data-review-chatbot-id]'), function(btn){
            btn.onclick = function(ev){
                if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                showRoasUnmatchedReview(this.getAttribute('data-review-chatbot-id'), current, this.getAttribute('data-review-upload-id'));
            };
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
        if (!isAdminUser()) { setStatus('Chỉ Admin mới có quyền xóa file.', 'error'); return; }
        var record = findChatbotUploadRecord(uploadId);
        var label = record ? (record.fileName || uploadId) : uploadId;
        if (!window.confirm('Xóa file doanh thu chatbot mới nhất: "' + label + '"? Toàn bộ dữ liệu doanh thu chatbot đang lưu sẽ bị gỡ khỏi ROAS trên tất cả tài khoản.')) return;

        var db = getDb();
        if (!db) { setStatus('Không kết nối được Firebase nên chưa thể xóa file.', 'error'); return; }
        setStatus('Đang xóa dữ liệu doanh thu chatbot khỏi Firebase...', 'info');

        db.ref(FIREBASE_ROOT + '/chatbot_revenue_uploads').remove()
            .then(function(){ return fetchFirebaseStateNow(); })
            .then(function(){ setStatus('Đã xóa dữ liệu doanh thu chatbot khỏi Firebase: <b>' + esc(label) + '</b>.', 'success'); })
            .catch(function(e){ firebaseDeleteError('Không xóa được file chatbot trên Firebase:', e); });
    }

    function deleteAdsUpload(companyId, uploadId){
        if (!isAdminUser()) { setStatus('Chỉ Admin mới có quyền xóa file.', 'error'); return; }
        var bucket = ensureCompanyBucket(companyId);
        var record = (bucket.uploads || []).find(function(x){ return x && x.id === uploadId; });
        var label = record ? (record.fileName || uploadId) : uploadId;
        if (!window.confirm('Xóa file chi phí: "' + label + '"? File sẽ bị xóa khỏi Firebase và biến mất trên tất cả tài khoản. Dữ liệu doanh thu chatbot vẫn được giữ để chờ file chi phí khác của công ty này.')) return;

        var db = getDb();
        if (!db) { setStatus('Không kết nối được Firebase nên chưa thể xóa file.', 'error'); return; }
        setStatus('Đang xóa file chi phí và giữ lại dữ liệu doanh thu chatbot trên Firebase...', 'info');

        var updates = {};
        updates[FIREBASE_ROOT + '/uploads/' + companyId + '/' + safeFirebaseId(uploadId)] = null;

        var latestRecord = latestChatbotUploadRecord();
        if (latestRecord && latestRecord.id) {
            var latestRows = collectChatbotRowsByUploadId(latestRecord.id).map(function(row){
                if (row && row.company === companyId && row.targetAdsUploadId === uploadId) {
                    var copy = Object.assign({}, row);
                    copy.targetAdsUploadId = '';
                    copy.targetAdsUploadLabel = 'Chờ file chi phí ' + companyId;
                    copy.matchedGroupKey = '';
                    copy.matchedAdsetName = '';
                    copy.effectiveTargetAdsUploadId = '';
                    return copy;
                }
                return row;
            });
            updates[FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeFirebaseId(latestRecord.id)] =
                buildChatbotFirebasePayload(latestRecord.id, latestRows);
        }

        db.ref().update(updates)
            .then(function(){ return fetchFirebaseStateNow(); })
            .then(function(){ setStatus('Đã xóa file chi phí khỏi Firebase: <b>' + esc(label) + '</b>. Dữ liệu chatbot vẫn được giữ ở trạng thái chờ.', 'success'); })
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
                    zeroSpendGroupsExcluded: ownGroups.zeroSpendExcludedCount || 0,
                    reportStart: firstNonEmpty(ownGroups, 'reportStart'),
                    reportEnd: firstNonEmpty(ownGroups, 'reportEnd'),
                    uploadedAt: nowIso(),
                    uploader: uploadAccount.name,
                    uploaderEmail: uploadAccount.email,
                    uploaderUid: uploadAccount.uid
                };

                // Firebase là nguồn chuẩn: chỉ đưa vào lịch sử/giao diện sau khi ghi thành công.
                await saveUploadToFirebase(record, rows);

                bucket.rows = bucket.rows.concat(rows);
                bucket.uploads.unshift(record);
                if (!ROAS_STATE.manualActiveSelectionByCompany) ROAS_STATE.manualActiveSelectionByCompany = {};
                // File vừa upload phải trở thành file mặc định cần thao tác ngay.
                ROAS_STATE.manualActiveSelectionByCompany[company.id] = record.id;
                bucket.activeAdsUploadId = record.id;
                ROAS_STATE.activeAdsUploadByCompany[company.id] = record.id;
                rebuildCompanyGroups(company.id);
                ROAS_STATE.uploadHistory.unshift(record);
                success.push(record);
            } catch(err) {
                console.error(err);
                errors.push(file.name + ': ' + firebaseWriteMessage(err));
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
        if (success.length) focusWorkflowStep(2);
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
            ad: findExactLiteralHeaderIndex(headers, 'Quảng cáo'),
            amount: findHeaderIndex(headers, ['Tổng tiền'], ['tong tien']),
            note: findHeaderIndex(headers, ['Ghi chú'], ['ghi chu'])
        };
        if (idx.team === -1) throw new Error('Không tìm thấy cột Team trong file doanh thu chatbot.');
        if (idx.ad === -1) throw new Error('Không tìm thấy cột có tiêu đề chính xác là “Quảng cáo”. Hệ thống không sử dụng cột gần giống hoặc cột khác để so khớp.');
        if (idx.amount === -1) throw new Error('Không tìm thấy cột Tổng tiền trong file doanh thu chatbot.');

        var rows = [];
        var zeroAmountSkippedCount = 0;
        for (var r = 1; r < aoa.length; r++) {
            var row = aoa[r] || [];
            var team = String(readCell(row, idx.team) || '').trim();
            var adText = String(readCell(row, idx.ad) || '').trim();
            if (!team && !adText) continue;
            var company = detectCompanyFromTeam(team);
            // Công ty chỉ lấy từ cột Team; mã sản phẩm và nhân viên chỉ lấy từ đúng cột “Quảng cáo”.
            var employee = extractEmployeeFromChatbotAd(adText);
            var skus = extractSkusFromChatbotAd(adText);
            var amountRaw = toNumberOrBlank(readCell(row, idx.amount));
            var amount = Number(amountRaw) || 0;
            if (amount === 0) {
                zeroAmountSkippedCount++;
                continue;
            }
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
                productText: '',
                employee: employee,
                employeeKey: employeeKey(employee),
                skus: skus,
                adSkus: skus.slice(),
                productSkus: [],
                amount: amount,
                amountRaw: amountRaw,
                note: readCell(row, idx.note),
                uploadedAt: nowIso(),
                matchedSku: '',
                matchedGroupKey: '',
                matchedAdsetName: ''
            });
        }
        rows.zeroAmountSkippedCount = zeroAmountSkippedCount;
        return rows;
    }

    function summarizeChatbotRows(rows){
        var byCompany = {};
        (rows || []).filter(isNonZeroRevenueRow).forEach(function(r){
            var c = r.company || 'UNKNOWN';
            if (!byCompany[c]) byCompany[c] = { rows: 0, amount: 0, matched: 0, unmatched: 0 };
            byCompany[c].rows += 1;
            byCompany[c].amount += Number(r.amount) || 0;
            if (r.matchedGroupKey) byCompany[c].matched += 1;
            else byCompany[c].unmatched += 1;
        });
        return Object.keys(byCompany).map(function(c){
            var b = byCompany[c];
            var bucket = ROAS_STATE.byCompany[c];
            var activeId = getActiveAdsUploadId(c);
            var hasAds = !!(bucket && activeId && bucket.groups && bucket.groups.length);
            if (!hasAds) {
                return c + ': ' + b.rows + ' dòng / ' + b.amount + ' / đang chờ file chi phí ' + c;
            }
            return c + ': ' + b.rows + ' dòng / ' + b.amount + ' / khớp ' + b.matched + ' / chưa khớp ' + b.unmatched;
        }).join(' • ');
    }

    function snapshotChatbotState(){
        var snapshot = {
            globalUploads: (ROAS_STATE.chatbotRevenueUploads || []).slice(),
            companies: {}
        };
        COMPANY_OPTIONS.forEach(function(c){
            var bucket = ensureCompanyBucket(c.id);
            snapshot.companies[c.id] = {
                rows: (bucket.chatbotRows || []).slice(),
                uploads: (bucket.chatbotUploads || []).slice()
            };
        });
        return snapshot;
    }

    function restoreChatbotState(snapshot){
        ROAS_STATE.chatbotRevenueUploads = (snapshot && snapshot.globalUploads) ? snapshot.globalUploads.slice() : [];
        COMPANY_OPTIONS.forEach(function(c){
            var bucket = ensureCompanyBucket(c.id);
            var old = snapshot && snapshot.companies ? snapshot.companies[c.id] : null;
            bucket.chatbotRows = old ? old.rows.slice() : [];
            bucket.chatbotUploads = old ? old.uploads.slice() : [];
            rebuildCompanyGroups(c.id);
        });
    }

    function replaceLocalChatbotState(record, rows){
        ROAS_STATE.chatbotRevenueUploads = record ? [record] : [];
        COMPANY_OPTIONS.forEach(function(c){
            var bucket = ensureCompanyBucket(c.id);
            bucket.chatbotRows = (rows || []).filter(function(row){ return row && row.company === c.id; });
            bucket.chatbotUploads = bucket.chatbotRows.length && record ? [record] : [];
            rebuildCompanyGroups(c.id);
        });
    }

    async function handleChatbotRevenueFiles(fileList){
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;
        if (files.length > 1) {
            setStatus('Phần doanh thu chatbot chỉ nhận <b>1 file</b> mỗi lần. Vui lòng chọn lại một file duy nhất.', 'error');
            return;
        }

        var file = files[0];
        setStatus('Đang đọc và thay thế bằng file doanh thu chatbot mới nhất: <b>' + esc(file.name) + '</b>...', 'info');
        var previousState = snapshotChatbotState();

        try {
            var wb = await readWorkbookFromFile(file);
            var rows = parseChatbotRevenueRows(wb, file.name);
            var zeroAmountSkippedCount = Number(rows.zeroAmountSkippedCount) || 0;
            if (!rows.length) {
                if (zeroAmountSkippedCount > 0) throw new Error('Không có dòng doanh thu khác 0 để xử lý. Đã bỏ qua ' + zeroAmountSkippedCount + ' dòng có Tổng tiền bằng 0.');
                throw new Error('Không có dòng doanh thu hợp lệ.');
            }

            var fileCompanies = {};
            rows.forEach(function(row){
                if (!row.company) return;
                var targetUploadId = getActiveAdsUploadId(row.company);
                row.targetAdsUploadId = targetUploadId || '';
                row.targetAdsUploadLabel = targetUploadId ? activeAdsUploadLabel(row.company) : 'Chờ file chi phí ' + row.company;
                fileCompanies[row.company] = true;
            });

            var uploadAccount = currentAccountInfo();
            var record = {
                id: makeId('CHATBOT'),
                type: 'chatbot_revenue',
                fileName: file.name,
                company: Object.keys(fileCompanies).length === 1 ? Object.keys(fileCompanies)[0] : '',
                companyName: Object.keys(fileCompanies).length === 1 ? ((companyById(Object.keys(fileCompanies)[0]) || {}).name || '') : 'Nhiều công ty',
                rows: rows.length,
                matched: 0,
                unmatched: rows.length,
                uploadedAt: nowIso(),
                uploader: uploadAccount.name,
                uploaderEmail: uploadAccount.email,
                uploaderUid: uploadAccount.uid,
                status: 'latest_only_mapped_by_team_employee_sku_nonzero_only',
                zeroAmountSkipped: zeroAmountSkippedCount,
                targetAdsUploadsByCompany: {}
            };

            Object.keys(fileCompanies).forEach(function(companyId){
                var targetId = getActiveAdsUploadId(companyId);
                if (targetId) {
                    record.targetAdsUploadsByCompany[companyId] = {
                        id: targetId,
                        label: activeAdsUploadLabel(companyId)
                    };
                    if (!ROAS_STATE.manualActiveSelectionByCompany) ROAS_STATE.manualActiveSelectionByCompany = {};
                    ROAS_STATE.manualActiveSelectionByCompany[companyId] = targetId;
                }
            });
            rows.forEach(function(row){ row.chatbotUploadId = record.id; });

            replaceLocalChatbotState(record, rows);

            var matched = rows.filter(function(r){ return !!r.matchedGroupKey; }).length;
            record.matched = matched;
            record.unmatched = rows.length - matched;

            try {
                await saveChatbotToFirebase(record, rows);
            } catch(firebaseErr) {
                restoreChatbotState(previousState);
                throw firebaseErr;
            }

            await fetchFirebaseStateNow();

            var summaryRows = [];
            COMPANY_OPTIONS.forEach(function(c){
                var bucket = ensureCompanyBucket(c.id);
                Array.prototype.push.apply(summaryRows, bucket.chatbotRows || []);
            });

            setStatus(
                'Đã thay thế bằng <b>1 file doanh thu chatbot mới nhất</b>. Không cộng dồn với file cũ.<br>' +
                esc(summarizeChatbotRows(summaryRows)) +
                (zeroAmountSkippedCount ? '. Đã bỏ qua <b>' + esc(zeroAmountSkippedCount) + '</b> dòng có Tổng tiền bằng 0, không đưa vào so khớp' : '') +
                '. Công ty chưa có file chi phí sẽ được giữ ở trạng thái chờ; khi upload file chi phí tương ứng, hệ thống tự tính.' +
                (record.matched === 0 ? '<br><b>Chưa có dòng nào khớp:</b> kiểm tra đúng công ty, nhân viên và mã sản phẩm trong file chi phí đang gắn.' : ''),
                'success'
            );
            renderWorkflow();
            focusWorkflowStep(2);
        } catch(err) {
            console.error(err);
            restoreChatbotState(previousState);
            saveLocal();
            renderCompanyData();
            setStatus(file.name + ': ' + esc(firebaseWriteMessage(err)), 'error');
        }
    }

    function buildCostExportFilename(groups, companyId){
        var r = getReportDateRange(groups || []);
        var c = companyById(companyId || ROAS_STATE.company) || companyById('NNV');
        var start = r.start ? formatDateFile(r.start) : 'ngay-bat-dau';
        var end = r.end ? formatDateFile(r.end) : 'ngay-ket-thuc';
        return sanitizeFilename('CHI PHÍ QUẢNG CÁO ' + (c.exportCode || c.id) + ' ' + start + ' - ' + end) + '.xlsx';
    }

    function exportCostFile(){
        try {
            var bucket = ensureCompanyBucket(ROAS_STATE.company);
            if (!bucket.groups || !bucket.groups.length) {
                setStatus('Chưa có dữ liệu chi phí để xuất. Vui lòng hoàn thành Bước 1.', 'error');
                return;
            }
            var exportableGroups = positiveSpendGroups(bucket.groups);
            if (!exportableGroups.length) {
                setStatus('Không có nhóm quảng cáo nào phát sinh chi phí lớn hơn 0 để xuất.', 'error');
                return;
            }
            var costGroups = exportableGroups.map(function(group){
                var copy = Object.assign({}, group);
                copy.rows = (group.rows || []).slice();
                copy.revenue = 0;
                copy.chatbotMatches = [];
                return copy;
            });
            var wb = buildWorkbook(costGroups);
            var filename = buildCostExportFilename(costGroups, ROAS_STATE.company);
            XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });
            setStatus('Bước 1 hoàn tất. Đã tạo file chi phí <b>' + esc(filename) + '</b>. Tiếp tục Bước 2 để nhập doanh thu và xuất file ROAS hoàn chỉnh.', 'success');
            focusWorkflowStep(2);
        } catch(err) {
            console.error(err);
            setStatus('Lỗi xuất file chi phí: ' + esc(err.message || err), 'error');
        }
    }

    function exportRoasFile(){
        try {
            var bucket = ensureCompanyBucket(ROAS_STATE.company);
            if (!bucket.groups || !bucket.groups.length) {
                setStatus('Chưa có dữ liệu để xuất cho công ty đang chọn. Vui lòng upload file quảng cáo trước.', 'error');
                return;
            }
            applyChatbotRevenueToGroups(ROAS_STATE.company);
            var exportableGroups = positiveSpendGroups(bucket.groups);
            if (!exportableGroups.length) {
                setStatus('Không có nhóm quảng cáo nào phát sinh chi phí lớn hơn 0 để xuất ROAS.', 'error');
                return;
            }
            var wb = buildWorkbook(exportableGroups);
            var filename = buildExportFilename(exportableGroups, ROAS_STATE.company);
            XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });
            setStatus('Bước 2 hoàn tất. Đã tạo file ROAS hoàn chỉnh <b>' + esc(filename) + '</b>.', 'success');
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
            '.roas-tool-shell{display:flex;flex-direction:column;gap:16px;font-family:"Segoe UI Variable Text","Segoe UI",Arial,Tahoma,sans-serif;font-size:14px;line-height:1.55;color:#334155;font-weight:400;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}' +
            '.roas-tool-shell button,.roas-tool-shell input,.roas-tool-shell select,.roas-tool-shell textarea{font-family:inherit;font-weight:400;}' +
            '.roas-tool-shell strong,.roas-tool-shell b,.roas-review-modal strong,.roas-review-modal b{font-weight:600;}' +
            '.roas-tool-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px;border:1px solid #dbeafe;border-radius:22px;background:linear-gradient(135deg,#eff6ff,#fff);}' +
            '.roas-tool-head h3{margin:0 0 6px;color:#0f172a;font-size:20px;font-weight:700;}' +
            '.roas-tool-head p{margin:0;color:#64748b;font-weight:400;line-height:1.6;max-width:880px;}' +
            '.roas-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}' +
            '.roas-select{border:1px solid #bfdbfe;border-radius:999px;padding:11px 14px;color:#1e3a8a;font-weight:600;background:#fff;outline:none;}' +
            '.roas-btn{border:none;border-radius:999px;padding:12px 16px;font-weight:600;cursor:pointer;background:#2563eb;color:#fff;box-shadow:0 10px 22px rgba(37,99,235,.18);}' +
            '.roas-btn.secondary{background:#0f172a;}.roas-btn.danger{background:#dc2626;}' +
            '.roas-workflow{position:relative;display:flex;flex-direction:column;gap:12px;padding:4px 0;}.roas-workflow-line{position:absolute;left:25px;top:32px;bottom:32px;width:2px;background:#dbeafe;z-index:0;}.roas-workflow-step{position:relative;z-index:1;display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:14px;align-items:flex-start;border:1px solid #dbe3ef;border-radius:20px;background:#fff;padding:16px 18px;transition:.2s ease;}.roas-workflow-step.active{border-color:#93c5fd;background:#f8fbff;}.roas-workflow-step.done{border-color:#86efac;background:#f8fffb;}.roas-workflow-step.locked{opacity:.68;background:#f8fafc;}.roas-workflow-step.is-highlighted{box-shadow:0 0 0 4px rgba(37,99,235,.14);transform:translateY(-1px);}.roas-step-number{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dbeafe;color:#1d4ed8;font-weight:700;font-size:15px;box-shadow:0 0 0 6px #fff;}.roas-workflow-step.done .roas-step-number{background:#dcfce7;color:#166534;}.roas-workflow-step.locked .roas-step-number{background:#e2e8f0;color:#64748b;}.roas-step-title{font-size:15px;font-weight:650;color:#0f172a;margin:3px 0 5px;}.roas-workflow-note{font-size:12px;color:#64748b;line-height:1.55;}.roas-workflow-file{font-size:12px;color:#0369a1;font-weight:500;word-break:break-word;margin:4px 0;}.roas-workflow-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:11px;}.roas-step-btn{border:1px solid transparent;border-radius:10px;padding:8px 12px;font-size:11px;font-weight:600;cursor:pointer;line-height:1.2;}.roas-step-btn.primary{background:#2563eb;color:#fff;}.roas-step-btn.success{background:#15803d;color:#fff;}.roas-step-btn.light{background:#fff;color:#334155;border-color:#cbd5e1;}.roas-step-btn:hover{filter:brightness(.97);transform:translateY(-1px);}.roas-step-status{align-self:start;display:inline-flex;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:600;background:#eff6ff;color:#1d4ed8;white-space:nowrap;}.roas-workflow-step.done .roas-step-status{background:#dcfce7;color:#166534;}.roas-workflow-step.locked .roas-step-status{background:#e2e8f0;color:#64748b;}' +
            '.roas-upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}' +
            '.roas-upload{border:2px dashed #93c5fd;border-radius:22px;padding:24px;text-align:center;background:#f8fbff;cursor:pointer;transition:.18s ease;}' +
            '.roas-upload:hover{background:#eff6ff;transform:translateY(-1px);}' +
            '.roas-upload.chatbot{border-color:#86efac;background:#f0fdf4;}' +
            '.roas-upload strong{display:block;color:#1d4ed8;font-size:16px;font-weight:600;margin-top:6px;}' +
            '.roas-upload.chatbot strong{color:#166534;}' +
            '.roas-upload span{color:#64748b;font-size:12px;font-weight:400;line-height:1.5;display:block;margin-top:5px;}' +
            '.roas-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}' +
            '.roas-summary-card{border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:16px;}' +
            '.roas-summary-card b{display:block;color:#0f172a;font-size:24px;font-weight:700;line-height:1;}' +
            '.roas-summary-card span{display:block;color:#64748b;font-size:12px;font-weight:500;margin-top:7px;}' +
            '.roas-empty{grid-column:1/-1;border:1px dashed #cbd5e1;border-radius:18px;background:#fff;padding:16px;color:#64748b;font-weight:500;text-align:center;}' +
            '.roas-status{border-radius:16px;padding:12px 14px;font-weight:500;line-height:1.55;}' +
            '.roas-status-info{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;}' +
            '.roas-status-success{background:#ecfdf3;color:#166534;border:1px solid #bbf7d0;}' +
            '.roas-status-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}' +
            '.roas-history{border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:0;overflow:hidden;}' +
            '.roas-history-head{display:flex;align-items:center;gap:14px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fff;}' +
            '.roas-history-title{font-weight:600;color:#0f172a;white-space:nowrap;font-size:12px;}' +
            '.roas-history-search{position:relative;display:flex;align-items:center;flex:1;}' +
            '.roas-history-search span{position:absolute;left:10px;font-size:12px;pointer-events:none;}' +
            '.roas-history-search input{width:100%;border:1px solid #dbe3ef!important;border-radius:999px!important;background:#f8fafc!important;padding:8px 12px 8px 32px!important;font-size:12px!important;outline:none;}' +
            '.roas-history-search input:focus{background:#fff!important;border-color:#93c5fd!important;box-shadow:0 0 0 3px rgba(37,99,235,.10);}' +
            '.roas-history-empty{color:#64748b;font-weight:500;padding:16px;background:#f8fafc;text-align:center;}' +
            '.roas-history-list{max-height:390px;overflow:auto;}' +
            '.roas-history-group{position:relative;border-bottom:1px solid #eef2f7;background:#fff;}' +
            '.roas-history-group:last-child{border-bottom:none;}' +
            '.roas-history-group.is-active{background:#f8fbff;box-shadow:inset 4px 0 0 #2563eb;}' +
            '.roas-history-parent{width:100%;border:0;background:transparent;display:grid;grid-template-columns:125px minmax(0,1fr) 150px;gap:12px;align-items:center;padding:12px 72px 12px 14px;text-align:left;cursor:pointer;font-family:"Segoe UI Variable Text","Segoe UI",Arial,Tahoma,sans-serif;}' +
            '.roas-history-parent:hover{background:#eff6ff;}' +
            '.roas-history-time{color:#64748b;font-size:11px;}' +
            '.roas-history-file{color:#0369a1;font-weight:400;font-size:12px;text-decoration:underline;text-underline-offset:2px;word-break:break-word;}' +
            '.roas-history-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}' +
            '.roas-history-meta span{display:inline-flex;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:500;}' +
            '.roas-history-user{background:#e0f2fe;color:#0369a1;}.roas-history-period{background:#fef3c7;color:#92400e;}.roas-history-count{background:#f1f5f9;color:#475569;}' +
            '.roas-history-state{text-align:right;padding-bottom:0;}.roas-history-active-badge{display:inline-flex;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:600;}.roas-history-pick{color:#94a3b8;font-size:10px;font-weight:500;}' +
            '.roas-history-children{padding:0 14px 10px 139px;}' +
            '.roas-history-child{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:center;padding:5px 0;}' +
            '.roas-history-branch{font-family:monospace;color:#cbd5e1;font-size:13px;}' +
            '.roas-history-child-file{color:#b91c1c;font-size:11px;font-weight:400;word-break:break-word;}' +
            '.roas-history-child-meta{color:#94a3b8;font-size:10px;font-style:italic;margin-top:3px;}' +
            '.roas-history-no-child{padding:0 14px 11px 139px;color:#94a3b8;font-size:10px;font-style:italic;}.roas-history-delete{position:absolute;right:14px;top:12px;bottom:auto;min-width:46px;height:28px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:8px;padding:0 10px;font-size:10px;line-height:1;font-weight:600;white-space:nowrap;cursor:pointer;z-index:3;box-sizing:border-box;}.roas-history-delete:hover{background:#dc2626;color:#fff;}.roas-history-delete.child-delete{position:static;right:auto;top:auto;bottom:auto;transform:none;align-self:center;flex:0 0 auto;margin:0;}' +
            '.roas-history-child-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:nowrap;min-width:max-content;}.roas-history-review{border:1px solid #fdba74;background:#fff7ed;color:#c2410c;border-radius:8px;padding:5px 8px;font-size:10px;font-weight:500;cursor:pointer;white-space:nowrap;}.roas-history-review:hover{background:#c2410c;color:#fff;}.roas-history-all-matched{display:inline-flex;border:1px solid #86efac;background:#f0fdf4;color:#166534;border-radius:999px;padding:4px 8px;font-size:9px;font-weight:600;white-space:nowrap;}' +
            '.roas-review-overlay{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100090;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px);}.roas-review-modal{width:min(1380px,98vw);max-height:92vh;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;display:flex;flex-direction:column;font-family:"Segoe UI Variable Text","Segoe UI",Arial,Tahoma,sans-serif;}.roas-review-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:17px 20px;background:linear-gradient(135deg,#9a3412,#ea580c);color:#fff;}.roas-review-head h3{margin:0 0 5px;font-size:18px;font-weight:700;}.roas-review-head p{margin:0;font-size:11px;line-height:1.5;opacity:.92;word-break:break-word;}.roas-review-close{border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.14);color:#fff;border-radius:9px;width:34px;height:34px;font-size:23px;line-height:1;cursor:pointer;}.roas-review-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px 18px;background:#fff7ed;border-bottom:1px solid #fed7aa;}.roas-review-kpis div{background:#fff;border:1px solid #fed7aa;border-radius:12px;padding:10px;text-align:center;}.roas-review-kpis div.bad{border-color:#fecaca;background:#fef2f2;}.roas-review-kpis b{display:block;font-size:21px;font-weight:700;color:#9a3412;}.roas-review-kpis .bad b{color:#dc2626;}.roas-review-kpis span{display:block;margin-top:3px;color:#64748b;font-size:10px;font-weight:500;}.roas-review-table-wrap{overflow:auto;flex:1;padding:14px 16px;}.roas-review-table{width:100%;min-width:1250px;border-collapse:separate;border-spacing:0;font-size:10px;}.roas-review-table th{position:sticky;top:0;z-index:2;background:#f8fafc;color:#334155;border:1px solid #e2e8f0;border-left:0;padding:8px;text-align:center;white-space:nowrap;}.roas-review-table th:first-child{border-left:1px solid #e2e8f0;}.roas-review-table td{border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px;vertical-align:top;color:#334155;line-height:1.45;}.roas-review-table td:first-child{border-left:1px solid #e2e8f0;}.roas-review-center{text-align:center;}.roas-review-amount{text-align:right;font-weight:600;white-space:nowrap;}.roas-review-ad{min-width:300px;max-width:430px;word-break:break-word;}.roas-review-reason{color:#b91c1c;font-weight:600;}.roas-review-suggestion{color:#475569;margin-top:5px;font-style:italic;}.roas-review-foot{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:11px;font-weight:400;}.roas-review-done{border:0;background:#0f172a;color:#fff;border-radius:9px;padding:8px 18px;font-weight:600;cursor:pointer;}' +
            '@media(max-width:900px){.roas-workflow-step{grid-template-columns:42px minmax(0,1fr)}.roas-step-status{grid-column:2;justify-self:start}.roas-workflow-line{left:20px}.roas-upload-grid{grid-template-columns:1fr}.roas-summary{grid-template-columns:1fr}.roas-actions{width:100%}.roas-select,.roas-btn{width:100%}.roas-history-head{align-items:flex-start;flex-direction:column}.roas-history-search{width:100%}.roas-history-parent{grid-template-columns:1fr;padding-right:72px}.roas-history-state{text-align:left}.roas-history-children,.roas-history-no-child{padding-left:28px}.roas-history-time{font-weight:500}.roas-history-child-actions{justify-content:flex-start;flex-wrap:wrap;min-width:0}.roas-history-delete{right:10px;top:10px}.roas-history-delete.child-delete{position:static}.roas-review-kpis{grid-template-columns:1fr}.roas-review-foot{align-items:flex-start;flex-direction:column}}' +
            '</style>' +
            '<div class="roas-tool-shell">' +
              '<div class="roas-tool-head">' +
                '<div><h3>Thống kê ROAS lũy kế</h3><p>Upload file quảng cáo thô từ Meta/Facebook. Hệ thống sẽ tự nhận diện công ty từ tên file, hỗ trợ nhiều file cùng lúc. File chi phí mới upload sẽ tự được chọn làm mặc định. Khi cần đổi file, bấm trực tiếp vào file chi phí trong phần Lịch sử tải lên.</p></div>' +
                '<div class="roas-actions" id="roas-upload-actions">' +
                  '<select class="roas-select" id="roas-company-select">' + options + '</select>' +
                  '<button class="roas-btn danger" type="button" id="roas-clear-btn">Xóa dữ liệu công ty này</button>' +
                '</div>' +
              '</div>' +
              '<div class="roas-workflow" id="roas-workflow"></div>' +
              '<input accept=".csv,.xlsx,.xls" id="roas-file-input" style="display:none" type="file" multiple />' +
              '<input accept=".csv,.xlsx,.xls" id="roas-chatbot-file-input" style="display:none" type="file" />' +
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
        var fileInput = document.getElementById('roas-file-input');
        var chatbotInput = document.getElementById('roas-chatbot-file-input');
        var clearBtn = document.getElementById('roas-clear-btn');
        if (fileInput) fileInput.onchange = function(){ handleFiles(this.files); this.value = ''; };
        if (chatbotInput) chatbotInput.onchange = function(){ handleChatbotRevenueFiles(this.files); this.value = ''; };
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
        exportCostFile: exportCostFile,
        getState: function(){ return ROAS_STATE; },
        detectCompanyFromFilename: detectCompanyFromFilename,
        clearCurrentCompanyData: clearCurrentCompanyData,
        setActiveAdsUpload: setActiveAdsUpload,
        selectHistoryUpload: selectHistoryUpload,
        setHistorySearch: setHistorySearch,
        showUnmatchedReview: showRoasUnmatchedReview,
        reloadFirebaseHistory: function(){ ROAS_STATE.firebaseLoaded = false; return fetchFirebaseStateNow(); }
    };
})();

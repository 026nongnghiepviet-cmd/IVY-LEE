/* =========================================================
   ROAS STATISTICS MODULE - V29
   File riêng cho menu: Quảng cáo > Thống kê ROAS
   Cập nhật V29:
   - V29: Bổ sung Tra cứu ROAS theo khoảng ngày: chọn công ty, nhập nhân viên và tùy chọn tên nhóm/SKU; Chi Meta lấy trực tiếp Meta theo đúng khoảng, VAT 10%, doanh thu lấy Revenue Ledger theo đúng Ngày tạo đơn.
   - V29: Doanh thu tự chống trùng giữa các file lũy kế tuần trong cùng tháng: ưu tiên Công ty + Mã đơn, fallback fingerprint; bản upload mới nhất thắng metadata.
   - V29: Khoảng ngày đi qua nhiều tháng tự nối toàn bộ Revenue Ledger của các tháng liên quan; không yêu cầu file tháng mới chứa dữ liệu tháng cũ.
   - V29: Mỗi đơn chỉ được gán tối đa một nhóm quảng cáo; nếu nhiều nhóm cùng khớp mà không đủ bằng chứng thì để riêng ở mục doanh thu chưa gán, tuyệt đối không nhân đôi.
   - V29: Giao diện tra cứu responsive desktop/mobile, không thay đổi workflow upload/xuất ROAS hiện hành.
   Cập nhật V28:
   - V28: Đọc đúng Ngày tạo đơn dạng giờ trước ngày, ví dụ 09:18:22 13/8/2026; giữ chính xác giờ/phút/giây để Revenue Ledger và Sau đổi ngân sách tính đủ doanh thu.
   - V28: Không thay đổi logic ghép Công ty / Nhân viên / MÃ SP, lịch sử file, Firebase hoặc cách xuất ROAS.
   Cập nhật V27:
   - V27: Sửa lỗi thời gian trong Lịch sử tải lên luôn hiển thị 00:00 do hàm cũ bỏ mất phần giờ/phút/giây của uploadedAt dạng ISO.
   - V27: Lịch sử file chi phí và file doanh thu hiển thị đúng thời gian upload theo múi giờ local của trình duyệt.
   - V27: Dữ liệu cũ có uploadedAt đầy đủ cũng tự hiển thị đúng lại, không cần upload lại file.
   Cập nhật V26:
   - V26: Doanh thu chatbot được khóa vào đúng file chi phí đang chọn tại thời điểm upload; sau đó không tự chuyển sang file chi phí khác khi đổi lựa chọn.
   - V26: Mặc định file chi phí mới nhất vẫn là file đang thao tác; nếu người dùng chủ động chọn file chi phí cũ rồi upload doanh thu, doanh thu chỉ thuộc file cũ đó.
   - V26: Mỗi file chi phí chỉ sử dụng file doanh thu mới nhất đã gắn riêng cho chính file chi phí đó; upload doanh thu cho file mới không ghi đè doanh thu của các file chi phí quá khứ.
   - V26: Firebase tải lại toàn bộ các file doanh thu đã lưu để lịch sử từng file chi phí vẫn giữ đúng doanh thu riêng.
   Cập nhật V25:
   - V25: Giữ nguyên Ngày tạo đầy đủ ngày + giờ + phút/giây của từng đơn doanh thu chatbot.
   - V25: Mỗi file doanh thu mới vẫn thay file cũ trong chức năng ROAS hiện tại, nhưng đồng thời ghi thêm Revenue Ledger lịch sử lên Firebase để phục vụ theo dõi ROAS sau thay đổi ngân sách.
   - V25: Revenue Ledger lưu theo từng upload 7 ngày, chống cộng trùng bằng fingerprint đơn hàng; upload chồng kỳ không làm nhân đôi doanh thu khi đọc ledger.
   - V25: Ledger lưu Công ty + Nhân viên + SKU + thời gian đơn + doanh thu + thông tin đối chiếu, không làm thay đổi logic ROAS V24 hiện hành.
   Cập nhật V24:
   - V24: Sau khi gom nhóm quảng cáo, cột Bắt đầu lấy ngày bắt đầu sớm nhất trong toàn bộ bài thuộc nhóm.
   - V24: Nếu còn ít nhất một bài có Kết thúc là “Đang diễn ra”, cả nhóm hiển thị “Đang diễn ra”.
   - V24: Nếu tất cả bài đều đã kết thúc, cột Kết thúc lấy ngày kết thúc muộn nhất trong nhóm.
   Cập nhật V23:
   - V23: Chuẩn hóa màu đánh dấu trong file Excel: vàng #FFFF00, đỏ #FF0000, xanh dương nhạt #BDD7EE.
   - V23: Khi tải file kiểm tra, chỉ xuất các đơn hàng thuộc đúng công ty đang kiểm tra; không tải kèm dữ liệu của công ty khác.
   - V23: Giữ nguyên hàng tiêu đề và toàn bộ cột gốc, đồng thời ánh xạ lại đúng hàng cần tô màu sau khi lọc công ty.
   Cập nhật V22:
   - V22: Trong bảng kiểm tra dòng doanh thu chưa khớp có nút tải lại file doanh thu gốc đã upload dưới dạng Excel được đánh dấu màu theo nguyên nhân.
   - V22: Tô vàng dòng có doanh thu nhưng cột Quảng cáo trống hoặc không tách được Nhân viên / MÃ SP; tô đỏ trường hợp Nhân viên không chạy đúng mã trong file chi phí đang chọn; tô xanh dương nhạt trường hợp mã có chạy nhưng thuộc nhân viên khác.
   - V22: Lưu bản dữ liệu gốc của sheet doanh thu chatbot lên Firebase để mọi tài khoản có thể tải file kiểm tra sau khi đồng bộ.
   Cập nhật V21:
   - V21: Tách Tên chiến dịch linh hoạt khi dấu gạch ngang phân cách bị thiếu khoảng trắng ở một bên, ví dụ `NGỌC CẨM KF -KINGER...` hoặc `NGỌC CẨM KF- KINGER...`.
   - V21: Chỉ xem dấu gạch ngang có khoảng trắng ở ít nhất một phía là dấu phân cách chiến dịch, tránh tách nhầm công thức NPK như 12-3-4 hoặc 22-22-22.
   Cập nhật V20:
   - V20: Sửa lỗi style dùng chung làm nhiều cột khác bị hiển thị theo đơn vị %. Chỉ cột CTR và Tỷ lệ mua/tin được định dạng 0.00%.
   - V20: Tách style phần trăm riêng, không làm thay đổi định dạng các cột số, tiền, lượt mua, tin nhắn, hiển thị và tiếp cận.
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

    var STORAGE_KEY = 'MKT_ROAS_STATS_V27_DATA';
    var OLD_STORAGE_KEYS = ['MKT_ROAS_STATS_V26_DATA', 'MKT_ROAS_STATS_V25_DATA', 'MKT_ROAS_STATS_V24_DATA', 'MKT_ROAS_STATS_V23_DATA', 'MKT_ROAS_STATS_V22_DATA', 'MKT_ROAS_STATS_V21_DATA', 'MKT_ROAS_STATS_V20_DATA', 'MKT_ROAS_STATS_V19_DATA', 'MKT_ROAS_STATS_V18_DATA', 'MKT_ROAS_STATS_V17_DATA', 'MKT_ROAS_STATS_V14_DATA', 'MKT_ROAS_STATS_V13_DATA', 'MKT_ROAS_STATS_V12_DATA', 'MKT_ROAS_STATS_V11_DATA', 'MKT_ROAS_STATS_V10_DATA', 'MKT_ROAS_STATS_V9_DATA', 'MKT_ROAS_STATS_V8_DATA', 'MKT_ROAS_STATS_V7_DATA', 'MKT_ROAS_STATS_V6_DATA', 'MKT_ROAS_STATS_V5_DATA', 'MKT_ROAS_STATS_V4_DATA', 'MKT_ROAS_STATS_V3_DATA'];
    var FIREBASE_ROOT = 'roas_statistics';
    var REVENUE_LEDGER_NODE = 'revenue_ledger_v1';

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
        chatbotSourceWorkbooks: {},
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

        /*
         * Dấu phân cách chiến dịch được chấp nhận khi có khoảng trắng
         * ở ít nhất một phía của dấu "-".
         *
         * Hợp lệ:
         * - NGỌC CẨM KF - KINGER...
         * - NGỌC CẨM KF -KINGER...
         * - NGỌC CẨM KF- KINGER...
         *
         * Không tách nhầm công thức:
         * - 12-3-4
         * - 22-22-22
         */
        var match = /\s+-\s*|\s*-\s+/.exec(s);
        if (!match) return s;
        return s.slice(0, match.index).trim();
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


    function padDateTime2V25(n){ return String(n || 0).padStart(2, '0'); }

    function parseExactDateTimeV25(v){
        if (v === null || v === undefined || v === '') return null;

        if (v instanceof Date && !isNaN(v.getTime())) {
            return new Date(v.getTime());
        }

        // Excel serial có phần thập phân chứa giờ/phút/giây.
        if (typeof v === 'number' && v > 20000 && v < 70000) {
            try {
                if (typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
                    var p = XLSX.SSF.parse_date_code(v);
                    if (p) {
                        return new Date(
                            Number(p.y) || 0,
                            Math.max(0, (Number(p.m) || 1) - 1),
                            Number(p.d) || 1,
                            Number(p.H) || 0,
                            Number(p.M) || 0,
                            Math.floor(Number(p.S) || 0)
                        );
                    }
                }
            } catch(e) {}

            // Fallback: giữ cả phần lẻ của serial.
            var ms = Math.round((v - 25569) * 86400 * 1000);
            var utc = new Date(ms);
            if (!isNaN(utc.getTime())) {
                return new Date(
                    utc.getUTCFullYear(),
                    utc.getUTCMonth(),
                    utc.getUTCDate(),
                    utc.getUTCHours(),
                    utc.getUTCMinutes(),
                    utc.getUTCSeconds()
                );
            }
        }

        var s = String(v || '').trim();
        if (!s) return null;

        var m;

        // V28: HH:mm:ss dd/mm/yyyy (định dạng file chatbot thực tế).
        // Ví dụ: 09:18:22 13/8/2026. Phải xử lý trước fallback new Date()
        // vì JavaScript không parse ổn định chuỗi có giờ đứng trước ngày.
        m = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\s*)$/);
        if (m) {
            return new Date(+m[6], +m[5] - 1, +m[4], +m[1], +m[2], +(m[3] || 0));
        }

        // yyyy-mm-dd HH:mm:ss
        m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/);
        if (m) {
            return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
        }

        // dd/mm/yyyy HH:mm:ss
        m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/);
        if (m) {
            return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
        }

        var d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    function exactDateTimeInfoV25(v){
        var d = parseExactDateTimeV25(v);
        if (!d) {
            return {
                iso: '',
                ms: 0,
                display: '',
                precision: 'none',
                raw: v === null || v === undefined ? '' : String(v)
            };
        }

        var raw = v === null || v === undefined ? '' : String(v);
        var hasTime = false;

        if (v instanceof Date) {
            hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
        } else if (typeof v === 'number') {
            hasTime = Math.abs(v - Math.floor(v)) > 0.0000001;
        } else {
            hasTime = /\d{1,2}:\d{1,2}/.test(raw);
        }

        return {
            iso: d.toISOString(),
            ms: d.getTime(),
            display:
                padDateTime2V25(d.getDate()) + '/' +
                padDateTime2V25(d.getMonth() + 1) + '/' +
                d.getFullYear() + ' ' +
                padDateTime2V25(d.getHours()) + ':' +
                padDateTime2V25(d.getMinutes()) + ':' +
                padDateTime2V25(d.getSeconds()),
            precision: hasTime ? 'datetime' : 'date',
            raw: raw
        };
    }

    function stableHashV25(text){
        var str = String(text || '');
        var hash = 2166136261;
        for (var i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
    }

    function buildRevenueFingerprintV25(row){
        row = row || {};
        var keyParts = [
            normalizeText(row.company || ''),
            String(row.createdAtMs || 0),
            normalizeText(row.orderId || ''),
            normalizeText(row.customer || ''),
            String(Number(row.amount) || 0),
            normalizeText(row.employee || ''),
            uniqueList(row.skus || []).join(','),
            normalizeText(row.page || ''),
            normalizeText(row.adText || '')
        ];
        return stableHashV25(keyParts.join('||'));
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

    function isOngoingEndValue(value){
        var key = normalizeText(value);
        return key === 'dang dien ra'
            || key === 'ongoing'
            || key === 'dang chay'
            || key === 'active';
    }

    function earliestGroupStart(rows){
        var earliest = null;
        var fallback = '';

        (rows || []).forEach(function(row){
            var value = String((row && row.start) || '').trim();
            if (!value) return;
            if (!fallback) fallback = value;

            var date = parseAnyDate(value);
            if (date && (!earliest || date.getTime() < earliest.getTime())) {
                earliest = date;
            }
        });

        return earliest ? formatDateDMY(earliest) : fallback;
    }

    function latestGroupEnd(rows){
        var latest = null;
        var fallback = '';
        var hasOngoing = false;

        (rows || []).forEach(function(row){
            var value = String((row && row.end) || '').trim();
            if (!value) return;
            if (!fallback) fallback = value;

            if (isOngoingEndValue(value)) {
                hasOngoing = true;
                return;
            }

            var date = parseAnyDate(value);
            if (date && (!latest || date.getTime() > latest.getTime())) {
                latest = date;
            }
        });

        if (hasOngoing) return 'Đang diễn ra';
        return latest ? formatDateDMY(latest) : fallback;
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

        // Tính lại mốc thời gian theo toàn bộ bài quảng cáo trong từng nhóm.
        // Bắt đầu: ngày sớm nhất.
        // Kết thúc: còn ít nhất một bài đang chạy thì ghi “Đang diễn ra”;
        // nếu tất cả đã tắt thì lấy ngày kết thúc muộn nhất.
        groups.forEach(function(g){
            g.start = earliestGroupStart(g.rows);
            g.end = latestGroupEnd(g.rows);
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

    function chatbotRecordTargetsUpload(record, companyId, uploadId){
        if (!record || !record.id || !companyId || !uploadId) return false;
        var map = record.targetAdsUploadsByCompany || {};
        var mapped = map[companyId];
        if (mapped && String(mapped.id || '') === String(uploadId)) return true;

        var bucket = ensureCompanyBucket(companyId);
        return (bucket.chatbotRows || []).some(function(row){
            return row &&
                row.chatbotUploadId === record.id &&
                row.company === companyId &&
                String(row.targetAdsUploadId || '') === String(uploadId);
        });
    }

    function latestChatbotUploadForCostUpload(companyId, uploadId){
        if (!companyId || !uploadId) return null;
        var list = (ROAS_STATE.chatbotRevenueUploads || []).filter(function(record){
            return chatbotRecordTargetsUpload(record, companyId, uploadId);
        }).slice();

        list.sort(function(a,b){
            return String(b.uploadedAt || b.savedAt || '').localeCompare(String(a.uploadedAt || a.savedAt || ''));
        });
        return list[0] || null;
    }

    function effectiveTargetUploadIdForRow(row, companyId){
        // V26: doanh thu thuộc cố định file chi phí đã được chọn tại thời điểm upload.
        // Không dùng file đang xem hiện tại để ghi đè liên kết này.
        var bucket = ensureCompanyBucket(companyId);
        var uploads = bucket.uploads || [];

        var explicitId = row && row.targetAdsUploadId ? String(row.targetAdsUploadId) : '';
        if (explicitId && uploads.some(function(u){ return u && String(u.id) === explicitId; })) {
            return explicitId;
        }

        // Tương thích dữ liệu cũ: tìm mapping trên chính record đã sinh ra dòng này,
        // tuyệt đối không lấy mapping từ file doanh thu mới nhất toàn hệ thống.
        var record = row && row.chatbotUploadId ? findChatbotUploadRecord(row.chatbotUploadId) : null;
        var mapped = record && record.targetAdsUploadsByCompany
            ? record.targetAdsUploadsByCompany[companyId]
            : null;
        var mappedId = mapped && mapped.id ? String(mapped.id) : '';
        if (mappedId && uploads.some(function(u){ return u && String(u.id) === mappedId; })) {
            return mappedId;
        }

        return '';
    }

    function applyChatbotRevenueToGroups(companyId){
        var bucket = ensureCompanyBucket(companyId);
        var groups = bucket.groups || [];
        var activeUploadId = getActiveAdsUploadId(companyId);
        var revenueRecord = activeUploadId ? latestChatbotUploadForCostUpload(companyId, activeUploadId) : null;
        var revenueUploadId = revenueRecord ? revenueRecord.id : '';

        // Mỗi file chi phí chỉ lấy file doanh thu mới nhất đã gắn riêng cho chính nó.
        var revenueRows = (bucket.chatbotRows || []).filter(function(row){
            if (!isNonZeroRevenueRow(row) || row.company !== companyId) return false;
            if (!activeUploadId || !revenueUploadId || row.chatbotUploadId !== revenueUploadId) return false;
            return effectiveTargetUploadIdForRow(row, companyId) === activeUploadId;
        });

        groups.forEach(function(g){ g.revenue = 0; g.chatbotMatches = []; });

        revenueRows.forEach(function(row){
            row.matchedSku = '';
            row.matchedGroupKey = '';
            row.matchedAdsetName = '';
            row.effectiveTargetAdsUploadId = effectiveTargetUploadIdForRow(row, companyId);
        });

        var matched = 0;
        revenueRows.forEach(function(row){
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

        bucket.activeChatbotUploadId = revenueUploadId;
        bucket.chatbotMatchedCount = matched;
        bucket.chatbotUnmatchedCount = revenueRows.filter(function(row){
            return !row.matchedGroupKey;
        }).length;

        // Pending chỉ là các dòng chưa từng được gắn file chi phí tại thời điểm upload.
        bucket.chatbotPendingCount = (bucket.chatbotRows || []).filter(function(row){
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
        // Style riêng cho đúng 2 cột phần trăm. Không gắn numFmt vào bodyStyle dùng chung,
        // vì sẽ làm các cột số/tiền khác cũng bị Excel hiển thị thành %.
        var percentStyle = {
            font: { name: 'Arial', sz: 11, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
            numFmt: '0.00%'
        };

        for (var r = 0; r < aoa.length; r++) {
            for (var c = 0; c < OUTPUT_HEADERS.length; c++) {
                var addr = XLSX.utils.encode_cell({ r: r, c: c });
                if (!ws[addr]) ws[addr] = { t: 's', v: '' };

                if (r === 0) {
                    ws[addr].s = headerStyle;
                } else if (c === 15 || c === 20) {
                    // Chỉ CTR (P) và Tỷ lệ mua/tin (U) là đơn vị %.
                    ws[addr].s = percentStyle;
                    ws[addr].z = '0.00%';
                } else {
                    ws[addr].s = ([2,4,13].indexOf(c) !== -1 ? leftStyle : bodyStyle);
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
        if (!v && v !== 0) return '';

        var d = null;

        // uploadedAt được lưu bằng new Date().toISOString(), ví dụ:
        // 2026-08-13T08:36:25.123Z
        // Parse nguyên chuỗi ISO để giữ giờ/phút/giây và tự đổi sang múi giờ local.
        if (v instanceof Date && !isNaN(v.getTime())) {
            d = new Date(v.getTime());
        } else {
            var raw = String(v || '').trim();

            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
                var isoDate = new Date(raw);
                if (!isNaN(isoDate.getTime())) d = isoDate;
            }

            // Hỗ trợ timestamp dạng yyyy-mm-dd HH:mm:ss.
            if (!d && /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{1,2}/.test(raw)) {
                var localDate = new Date(raw.replace(' ', 'T'));
                if (!isNaN(localDate.getTime())) d = localDate;
            }

            // Dữ liệu cũ chỉ có ngày thì fallback.
            if (!d) d = parseAnyDate(v);
        }

        if (!d || isNaN(d.getTime())) return v || '';

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

    function saveChatbotToFirebase(record, rows, sourceWorkbook){
        var db = getDb();
        if (!db) return Promise.reject(new Error('Không kết nối được Firebase Database.'));
        var safeId = record.id.replace(/[.#$\[\]/]/g, '_');
        return db.ref(FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeId).set({
            meta: record,
            rows: rows || [],
            sourceWorkbook: sourceWorkbook || null,
            savedAt: nowIso()
        });
    }

    function revenueLedgerRowV25(record, row){
        row = row || {};
        var fingerprint = row.revenueFingerprint || buildRevenueFingerprintV25(row);
        return {
            fingerprint: fingerprint,
            sourceUploadId: String(record && record.id || row.chatbotUploadId || ''),
            sourceFileName: String(record && record.fileName || row.sourceFileName || ''),
            sourceRowNumber: Number(row.rowNumber || 0),
            uploadedAt: String(record && record.uploadedAt || row.uploadedAt || nowIso()),

            company: String(row.company || ''),
            companyName: String(row.companyName || ''),
            team: String(row.team || ''),
            employee: String(row.employee || ''),
            employeeKey: String(row.employeeKey || employeeKey(row.employee || '')),
            skus: uniqueList(row.skus || []),

            createdAtIso: String(row.createdAtIso || ''),
            createdAtMs: Number(row.createdAtMs || 0),
            createdAtDisplay: String(row.createdAtDisplay || ''),
            datePrecision: String(row.datePrecision || 'none'),
            dateRaw: String(row.dateRaw || ''),

            orderId: String(row.orderId || ''),
            customer: String(row.customer || ''),
            page: String(row.page || ''),
            amount: Number(row.amount || 0),
            amountRaw: row.amountRaw === undefined ? '' : row.amountRaw,
            adText: String(row.adText || ''),
            note: row.note === undefined ? '' : row.note,

            matchedSku: String(row.matchedSku || ''),
            matchedGroupKey: String(row.matchedGroupKey || ''),
            matchedAdsetName: String(row.matchedAdsetName || ''),
            targetAdsUploadId: String(row.targetAdsUploadId || ''),
            targetAdsUploadLabel: String(row.targetAdsUploadLabel || '')
        };
    }

    function buildRevenueLedgerUpdatesV25(record, rows){
        var updates = {};
        var safeUploadId = safeFirebaseId(record && record.id || '');
        var validCount = 0;

        (rows || []).forEach(function(row){
            if (!row || !row.company || !companyById(row.company)) return;
            if (!Number(row.amount || 0)) return;
            if (!Number(row.createdAtMs || 0)) return;

            var ledgerRow = revenueLedgerRowV25(record, row);
            var fingerprint = ledgerRow.fingerprint || buildRevenueFingerprintV25(row);
            var key = safeFirebaseId(fingerprint);

            updates[
                '/' + FIREBASE_ROOT + '/' + REVENUE_LEDGER_NODE + '/' +
                row.company + '/' + safeUploadId + '/' + key
            ] = ledgerRow;

            validCount++;
        });

        COMPANY_OPTIONS.forEach(function(c){
            var companyRows = (rows || []).filter(function(row){
                return row && row.company === c.id && Number(row.amount || 0) !== 0 && Number(row.createdAtMs || 0) > 0;
            });
            if (!companyRows.length) return;

            var maxOrderMs = companyRows.reduce(function(max, row){
                return Math.max(max, Number(row.createdAtMs || 0));
            }, 0);

            updates[
                '/' + FIREBASE_ROOT + '/' + REVENUE_LEDGER_NODE + '/' +
                c.id + '/' + safeUploadId + '/_meta'
            ] = {
                uploadId: String(record && record.id || ''),
                fileName: String(record && record.fileName || ''),
                uploadedAt: String(record && record.uploadedAt || nowIso()),
                rowCount: companyRows.length,
                maxOrderAtMs: maxOrderMs,
                maxOrderAtIso: maxOrderMs ? new Date(maxOrderMs).toISOString() : '',
                sourceMode: 'roas_statistics_v25_revenue_ledger'
            };
        });

        return {
            updates: updates,
            validCount: validCount
        };
    }

    function saveChatbotAndRevenueLedgerToFirebaseV25(record, rows, sourceWorkbook){
        var db = getDb();
        if (!db) return Promise.reject(new Error('Không kết nối được Firebase Database.'));

        var safeId = safeFirebaseId(record.id);
        var ledger = buildRevenueLedgerUpdatesV25(record, rows);
        var updates = ledger.updates || {};

        updates['/' + FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeId] = {
            meta: record,
            rows: rows || [],
            sourceWorkbook: sourceWorkbook || null,
            savedAt: nowIso()
        };

        return db.ref().update(updates).then(function(){
            return { ledgerRows: ledger.validCount || 0 };
        });
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

    function firebaseAoaToArray(value){
        return firebaseRowsToArray(value).map(function(row){
            return firebaseRowsToArray(row);
        });
    }

    function normalizeStoredSourceWorkbook(source){
        source = source || {};
        var aoa = firebaseAoaToArray(source.aoa);
        if (!aoa.length) return null;
        var merges = firebaseRowsToArray(source.merges).map(function(m){
            if (!m || !m.s || !m.e) return null;
            return {
                s: { r: Number(m.s.r) || 0, c: Number(m.s.c) || 0 },
                e: { r: Number(m.e.r) || 0, c: Number(m.e.c) || 0 }
            };
        }).filter(Boolean);
        return {
            sheetName: String(source.sheetName || 'Worksheet'),
            aoa: aoa,
            merges: merges
        };
    }

    function getChatbotSourceWorkbook(uploadId){
        return (ROAS_STATE.chatbotSourceWorkbooks || {})[uploadId] || null;
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
        var sourceWorkbook = normalizeStoredSourceWorkbook(payload.sourceWorkbook);
        if (sourceWorkbook) {
            if (!ROAS_STATE.chatbotSourceWorkbooks) ROAS_STATE.chatbotSourceWorkbooks = {};
            ROAS_STATE.chatbotSourceWorkbooks[meta.id] = sourceWorkbook;
        }
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
        ROAS_STATE.chatbotSourceWorkbooks = {};
        ROAS_STATE.activeAdsUploadByCompany = {};
        ROAS_STATE.manualActiveSelectionByCompany = preservedManual;
        ROAS_STATE.company = preservedCompany;
        ROAS_STATE.historySearch = preservedSearch;
        initCompanyBuckets();

        Object.keys(uploadsRoot).forEach(function(companyId){
            var group = uploadsRoot[companyId] || {};
            Object.keys(group).forEach(function(key){ mergeFirebaseAdsUpload(companyId, group[key]); });
        });
        // V26: tải toàn bộ file doanh thu để mỗi file chi phí quá khứ giữ doanh thu riêng.
        Object.keys(chatbotRoot).forEach(function(key){
            var payload = chatbotRoot[key] || {};
            if (payload && payload.meta && payload.meta.id) mergeFirebaseChatbotUpload(payload);
        });

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


    // =========================================================
    // V29 — TRA CỨU ROAS THEO KHOẢNG NGÀY / NHÂN VIÊN / NHÓM
    // - Chi phí luôn lấy Meta Direct theo đúng company + from + to.
    // - VAT = 10% Chi Meta; Tổng chi = Meta + VAT.
    // - Doanh thu lấy Revenue Ledger, lọc createdAtMs theo đúng ngày giờ đơn.
    // - File tuần lũy kế trong cùng tháng được dedupe giữa mọi upload.
    // - Khoảng đi qua nhiều tháng tự nối ledger vì mỗi đơn có timestamp thật.
    // =========================================================
    var ROAS_RANGE_LOOKUP_STATE_V29 = {
        loading: false,
        ledgerCache: {},
        ledgerCacheTtlMs: 5 * 60 * 1000,
        lastResult: null
    };

    function roasRangePad2V29(n){ return String(n || 0).padStart(2, '0'); }

    function roasRangeTodayV29(){
        var d = new Date();
        return d.getFullYear() + '-' + roasRangePad2V29(d.getMonth() + 1) + '-' + roasRangePad2V29(d.getDate());
    }

    function roasRangeMonthStartV29(){
        var d = new Date();
        return d.getFullYear() + '-' + roasRangePad2V29(d.getMonth() + 1) + '-01';
    }

    function roasRangeBoundaryMsV29(value, endExclusive){
        var m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return 0;
        var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
        if (endExclusive) d.setDate(d.getDate() + 1);
        return d.getTime();
    }

    function roasRangeMonthsV29(from, to){
        var a = String(from || '').match(/^(\d{4})-(\d{2})-/);
        var b = String(to || '').match(/^(\d{4})-(\d{2})-/);
        if (!a || !b) return [];
        var cur = new Date(Number(a[1]), Number(a[2]) - 1, 1, 12, 0, 0, 0);
        var end = new Date(Number(b[1]), Number(b[2]) - 1, 1, 12, 0, 0, 0);
        var out = [];
        var guard = 0;
        while (cur <= end && guard < 120) {
            out.push(roasRangePad2V29(cur.getMonth() + 1) + '/' + cur.getFullYear());
            cur.setMonth(cur.getMonth() + 1);
            guard++;
        }
        return out;
    }

    function roasRangeMoneyV29(value){
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0)) + 'đ';
    }

    function roasRangeNumberV29(value){
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0));
    }

    function roasRangeRoasV29(value){
        var n = Number(value || 0);
        return Number.isFinite(n) ? n.toFixed(2) : '0.00';
    }

    function roasRangeSafeOrderIdV29(value){
        var s = normalizeText(value || '').replace(/\s+/g, '');
        if (!s || ['0','NA','N/A','NONE','NULL','KHONGCO','KHONGCOMA'].indexOf(s) !== -1) return '';
        return s;
    }

    function roasRangeLedgerIdentityV29(row, fallbackKey){
        row = row || {};
        var supplied = String(row.dedupeKeyV28 || row.dedupeKey || '').trim();
        if (supplied) return 'supplied:' + supplied;
        var orderId = roasRangeSafeOrderIdV29(row.orderId);
        var company = normalizeText(row.company || '');
        if (orderId) return 'order:' + company + ':' + orderId;
        return 'fingerprint:' + String(row.fingerprint || fallbackKey || '');
    }

    function roasRangeFlattenLedgerV29(root){
        var byIdentity = new Map();
        var rawCount = 0;
        var uploadCount = 0;
        var latestUploadAt = '';
        var sourceFiles = new Set();

        if (!root || typeof root !== 'object') {
            return { rows:[], rawCount:0, uniqueCount:0, duplicatesRemoved:0, uploadCount:0, latestUploadAt:'', sourceFiles:[] };
        }

        Object.keys(root).forEach(function(uploadKey){
            var uploadNode = root[uploadKey];
            if (!uploadNode || typeof uploadNode !== 'object') return;
            uploadCount++;
            var meta = uploadNode._meta || {};
            var metaUploadedAt = String(meta.uploadedAt || '');
            if (metaUploadedAt > latestUploadAt) latestUploadAt = metaUploadedAt;
            if (meta.fileName) sourceFiles.add(String(meta.fileName));

            Object.keys(uploadNode).forEach(function(key){
                if (key === '_meta') return;
                var row = uploadNode[key];
                if (!row || typeof row !== 'object') return;
                if (!Number(row.amount || 0) || !Number(row.createdAtMs || 0)) return;
                rawCount++;
                if (row.sourceFileName) sourceFiles.add(String(row.sourceFileName));

                var identity = roasRangeLedgerIdentityV29(row, key);
                var current = byIdentity.get(identity);
                var candidateUploadedAt = String(row.uploadedAt || metaUploadedAt || '');
                var currentUploadedAt = current ? String(current.uploadedAt || '') : '';

                if (!current || candidateUploadedAt >= currentUploadedAt) {
                    byIdentity.set(identity, Object.assign({}, row, {
                        uploadedAt: candidateUploadedAt || row.uploadedAt || '',
                        revenueIdentityV29: identity
                    }));
                }
            });
        });

        var rows = Array.from(byIdentity.values());
        return {
            rows: rows,
            rawCount: rawCount,
            uniqueCount: rows.length,
            duplicatesRemoved: Math.max(0, rawCount - rows.length),
            uploadCount: uploadCount,
            latestUploadAt: latestUploadAt,
            sourceFiles: Array.from(sourceFiles)
        };
    }

    function roasRangeLoadLedgerCompanyV29(company){
        company = String(company || '').toUpperCase();
        var cached = ROAS_RANGE_LOOKUP_STATE_V29.ledgerCache[company];
        if (cached && Date.now() - Number(cached.cachedAt || 0) < ROAS_RANGE_LOOKUP_STATE_V29.ledgerCacheTtlMs) {
            return Promise.resolve(cached.data);
        }
        var db = getDb();
        if (!db) return Promise.reject(new Error('Firebase Database chưa sẵn sàng.'));
        return db.ref(FIREBASE_ROOT + '/' + REVENUE_LEDGER_NODE + '/' + company).once('value').then(function(snap){
            var data = roasRangeFlattenLedgerV29(snap.val() || {});
            ROAS_RANGE_LOOKUP_STATE_V29.ledgerCache[company] = { cachedAt: Date.now(), data: data };
            return data;
        });
    }

    function roasRangeGroupMemberNamesV29(group){
        group = group || {};
        var values = [];
        [group.fullName, group.adName].forEach(function(v){ if (v) values.push(String(v)); });
        (group.merged_names || []).forEach(function(v){ if (v) values.push(String(v)); });
        (group._duplicateRows || []).forEach(function(row){
            if (!row) return;
            [row.fullName, row.adName, row.cleanAdName].forEach(function(v){ if (v) values.push(String(v)); });
        });
        var seen = {};
        return values.filter(function(v){
            var k = normalizeText(v);
            if (!k || seen[k]) return false;
            seen[k] = true;
            return true;
        });
    }

    function roasRangeGroupSkusV29(group){
        group = group || {};
        var values = [];
        if (group.duplicate_sku) values.push(group.duplicate_sku);
        (group._duplicateRows || []).forEach(function(row){ if (row && row.sku) values.push(row.sku); });
        roasRangeGroupMemberNamesV29(group).forEach(function(name){
            values = values.concat(extractSkusFromAdsetName(name));
            values = values.concat(extractSkusFromText(name));
        });
        return uniqueList(values.map(normalizeSkuValue).filter(Boolean));
    }

    function roasRangeGroupKeyV29(group){
        group = group || {};
        var direct = String(group.meta_live_row_key || group._mergeKey || '').trim();
        if (direct) return direct;
        return normalizeText(group.employee || '') + '||' + roasRangeGroupSkusV29(group).join(',') + '||' + normalizeText(group.fullName || group.adName || '');
    }

    function roasRangeGroupMatchesTextV29(group, query){
        var q = normalizeText(query || '');
        if (!q) return true;
        var hay = [
            group.fullName || '',
            group.adName || '',
            group.duplicate_sku || '',
            roasRangeGroupSkusV29(group).join(' '),
            roasRangeGroupMemberNamesV29(group).join(' ')
        ].map(normalizeText).join(' | ');
        return hay.indexOf(q) !== -1;
    }

    function roasRangeSkuIntersectionV29(a, b){
        var map = {};
        (a || []).map(normalizeSkuValue).filter(Boolean).forEach(function(v){ map[v] = true; });
        return (b || []).map(normalizeSkuValue).filter(Boolean).some(function(v){ return !!map[v]; });
    }

    function roasRangeMatchedGroupKeyPartsV29(value){
        var raw = String(value || '');
        var at = raw.indexOf('|');
        if (at < 0) return {employee:'',sku:''};
        return {
            employee: raw.slice(0,at),
            sku: normalizeSkuValue(raw.slice(at + 1))
        };
    }

    function roasRangeOrderGroupScoreV29(order, group){
        if (!order || !group) return -1;
        if (!roasRangeEmployeeMatchesV29(group.employee, order.employee, group.company || order.company || '')) {
            // Nếu order là Phòng MKT thì áp dụng ngoại lệ MARKETING theo công ty.
            if (!roasRangeEmployeeMatchesV29(order.employee, group.employee, group.company || order.company || '')) return -1;
        }

        var groupSkus = roasRangeGroupSkusV29(group);
        var orderSkus = uniqueList(order.skus || []);
        var memberNorm = roasRangeGroupMemberNamesV29(group).map(normalizeText);
        var score = 0;

        var matchedAdset = normalizeText(order.matchedAdsetName || '');
        if (matchedAdset) {
            var exactAdset = memberNorm.indexOf(matchedAdset) !== -1;
            var nearAdset = !exactAdset && memberNorm.some(function(name){ return name.indexOf(matchedAdset) !== -1 || matchedAdset.indexOf(name) !== -1; });
            if (!exactAdset && !nearAdset) return -1;
            score += exactAdset ? 1200 : 900;
        }

        var matchedSku = normalizeSkuValue(order.matchedSku || '');
        if (matchedSku) {
            if (groupSkus.indexOf(matchedSku) === -1) return -1;
            score += 300;
        }

        var matchedGroup = roasRangeMatchedGroupKeyPartsV29(order.matchedGroupKey || '');
        if (matchedGroup.sku) {
            if (groupSkus.indexOf(matchedGroup.sku) === -1) return -1;
            if (matchedGroup.employee && !isSameEmployee(matchedGroup.employee, group.employee)) return -1;
            score += 500;
        }

        if (groupSkus.length && orderSkus.length) {
            if (!roasRangeSkuIntersectionV29(groupSkus, orderSkus)) return -1;
            score += 100;
        } else if (!matchedAdset) {
            return -1;
        }

        return score;
    }

    function roasRangeAllocateRevenueV29(groups, orders){
        var byGroup = {};
        groups.forEach(function(group){
            byGroup[roasRangeGroupKeyV29(group)] = { revenue:0, orders:[] };
        });
        var ambiguous = [];
        var unmatched = [];

        (orders || []).forEach(function(order){
            var candidates = groups.map(function(group){
                return { group:group, score:roasRangeOrderGroupScoreV29(order,group) };
            }).filter(function(item){ return item.score >= 0; });

            if (!candidates.length) {
                unmatched.push(order);
                return;
            }

            candidates.sort(function(a,b){ return b.score - a.score; });
            var bestScore = candidates[0].score;
            var best = candidates.filter(function(item){ return item.score === bestScore; });
            if (best.length !== 1) {
                ambiguous.push(order);
                return;
            }

            var key = roasRangeGroupKeyV29(best[0].group);
            if (!byGroup[key]) byGroup[key] = {revenue:0,orders:[]};
            byGroup[key].revenue += Number(order.amount || 0);
            byGroup[key].orders.push(order);
        });

        return { byGroup:byGroup, ambiguous:ambiguous, unmatched:unmatched };
    }

    function roasRangeEmployeeMatchesV29(value, wanted, company){
        var wantedKey = normalizeText(wanted || '');
        var valueKey = normalizeText(value || '');
        var companyKey = normalizeText(company || '');

        // Ngoại lệ riêng đã chốt của hệ thống:
        // tài khoản "Phòng MKT" sở hữu các chiến dịch MARKETING NNV/VN/KF/ABC.
        // Không áp dụng MKT = MARKETING cho bất kỳ user nào khác.
        if (wantedKey === 'PHONG MKT') {
            if (valueKey === 'PHONG MKT') return true;
            var stripped = valueKey;
            ['NNV','VN','KF','ABC'].forEach(function(code){
                if (stripped === 'MARKETING ' + code) stripped = 'MARKETING';
            });
            if (companyKey && stripped === 'MARKETING ' + companyKey) stripped = 'MARKETING';
            return stripped === 'MARKETING';
        }

        return isSameEmployee(value || '', wanted || '');
    }

    function roasRangeSelectedCompaniesV29(value){
        var v = String(value || 'CURRENT').toUpperCase();
        if (v === 'ALL') return COMPANY_OPTIONS.map(function(c){ return c.id; });
        if (v === 'CURRENT') return [String(ROAS_STATE.company || 'NNV').toUpperCase()];
        return companyById(v) ? [v] : [String(ROAS_STATE.company || 'NNV').toUpperCase()];
    }

    function roasRangeFetchCompanyV29(company, from, to, employee){
        if (typeof window.requestMetaSummaryCachedV215 !== 'function') {
            return Promise.reject(new Error('Meta Direct chưa sẵn sàng. Hãy mở lại trang sau khi module Quảng cáo tải xong.'));
        }
        return Promise.all([
            window.requestMetaSummaryCachedV215({
                company:company,
                from:from,
                to:to,
                silent:true,
                force:false,
                skipSupportLedgers:true
            }),
            roasRangeLoadLedgerCompanyV29(company)
        ]).then(function(values){
            var meta = values[0] || {};
            var ledger = values[1] || {rows:[]};
            var groups = (Array.isArray(meta.rows) ? meta.rows : []).filter(function(row){
                return row && roasRangeEmployeeMatchesV29(row.employee || '', employee || '', company);
            });
            return { company:company, meta:meta, groups:groups, ledger:ledger };
        });
    }

    function roasRangeRenderLoadingV29(message){
        var box = document.getElementById('roas-range-result-v29');
        if (!box) return;
        box.innerHTML = '<div class="roas-range-loading-v29"><span></span><b>' + esc(message || 'Đang tra cứu...') + '</b></div>';
    }

    function roasRangeRenderResultV29(result){
        var box = document.getElementById('roas-range-result-v29');
        if (!box) return;
        result = result || {};
        var rows = result.rows || [];
        var total = result.total || {};
        var stats = result.stats || {};
        var months = result.months || [];

        if (!rows.length) {
            box.innerHTML = '<div class="roas-range-empty-v29"><b>Không tìm thấy nhóm quảng cáo phù hợp.</b><span>Kiểm tra lại tên nhân viên, tên nhóm/SKU, công ty hoặc khoảng ngày.</span></div>';
            return;
        }

        var kpis = '' +
            '<div class="roas-range-kpi-v29"><span>Chi Meta</span><b>' + roasRangeMoneyV29(total.metaSpend) + '</b><small>Lấy trực tiếp Meta</small></div>' +
            '<div class="roas-range-kpi-v29"><span>VAT 10%</span><b>' + roasRangeMoneyV29(total.vat) + '</b><small>10% Chi Meta</small></div>' +
            '<div class="roas-range-kpi-v29"><span>Tổng chi</span><b>' + roasRangeMoneyV29(total.totalCost) + '</b><small>Meta + VAT</small></div>' +
            '<div class="roas-range-kpi-v29 green"><span>Doanh thu</span><b>' + roasRangeMoneyV29(total.revenue) + '</b><small>' + roasRangeNumberV29(total.orderCount) + ' đơn đã gán</small></div>' +
            '<div class="roas-range-kpi-v29 blue"><span>ROAS</span><b>' + roasRangeRoasV29(total.roas) + '</b><small>Doanh thu / Tổng chi</small></div>';

        var tableRows = rows.map(function(row){
            return '<tr>' +
                '<td><span class="roas-range-company-v29">' + esc(row.company) + '</span></td>' +
                '<td><b>' + esc(row.employee || '') + '</b><small>' + esc(row.groupName || '') + '</small></td>' +
                '<td>' + esc((row.skus || []).join(', ') || '—') + '</td>' +
                '<td class="num">' + roasRangeMoneyV29(row.metaSpend) + '</td>' +
                '<td class="num">' + roasRangeMoneyV29(row.vat) + '</td>' +
                '<td class="num strong">' + roasRangeMoneyV29(row.totalCost) + '</td>' +
                '<td class="num revenue">' + roasRangeMoneyV29(row.revenue) + '<small>' + roasRangeNumberV29(row.orderCount) + ' đơn</small></td>' +
                '<td class="num roas">' + roasRangeRoasV29(row.roas) + '</td>' +
            '</tr>';
        }).join('');

        var warnings = [];
        if (Number(stats.ambiguousRevenue || 0) > 0) {
            warnings.push('Có ' + roasRangeMoneyV29(stats.ambiguousRevenue) + ' doanh thu của ' + roasRangeNumberV29(stats.ambiguousOrders) + ' đơn chưa gán vì khớp nhiều nhóm; hệ thống không cộng để tránh nhân đôi.');
        }
        if (Number(stats.unmatchedRevenue || 0) > 0) {
            warnings.push('Có ' + roasRangeMoneyV29(stats.unmatchedRevenue) + ' doanh thu của ' + roasRangeNumberV29(stats.unmatchedOrders) + ' đơn chưa khớp được nhóm quảng cáo trong khoảng.');
        }

        var audit = '<div class="roas-range-audit-v29">' +
            '<span><b>Khoảng:</b> ' + esc(result.from) + ' → ' + esc(result.to) + '</span>' +
            '<span><b>Tháng đã nối:</b> ' + esc(months.join(', ') || '—') + '</span>' +
            '<span><b>Ledger:</b> ' + roasRangeNumberV29(stats.rawLedgerRows) + ' dòng → ' + roasRangeNumberV29(stats.uniqueLedgerRows) + ' đơn duy nhất</span>' +
            '<span><b>Đã loại trùng:</b> ' + roasRangeNumberV29(stats.duplicatesRemoved) + '</span>' +
            '<span><b>Nguồn upload:</b> ' + roasRangeNumberV29(stats.uploadCount) + ' lần</span>' +
        '</div>';

        box.innerHTML = '' +
            '<div class="roas-range-kpis-v29">' + kpis + '</div>' +
            audit +
            (warnings.length ? '<div class="roas-range-warnings-v29">' + warnings.map(function(w){ return '<div>⚠ ' + esc(w) + '</div>'; }).join('') + '</div>' : '') +
            '<div class="roas-range-table-wrap-v29"><table class="roas-range-table-v29"><thead><tr>' +
                '<th>Công ty</th><th>Nhân viên / Nhóm quảng cáo</th><th>SKU</th><th>Chi Meta</th><th>VAT 10%</th><th>Tổng chi</th><th>Doanh thu</th><th>ROAS</th>' +
            '</tr></thead><tbody>' + tableRows + '</tbody></table></div>';
    }

    function runRoasRangeLookupV29(){
        if (ROAS_RANGE_LOOKUP_STATE_V29.loading) return;
        var companyEl = document.getElementById('roas-range-company-v29');
        var employeeEl = document.getElementById('roas-range-employee-v29');
        var groupEl = document.getElementById('roas-range-group-v29');
        var fromEl = document.getElementById('roas-range-from-v29');
        var toEl = document.getElementById('roas-range-to-v29');
        var btn = document.getElementById('roas-range-search-btn-v29');

        var employee = String(employeeEl && employeeEl.value || '').trim();
        var groupQuery = String(groupEl && groupEl.value || '').trim();
        var from = String(fromEl && fromEl.value || '');
        var to = String(toEl && toEl.value || '');
        var companyValue = String(companyEl && companyEl.value || 'CURRENT');

        if (!employee) {
            roasRangeRenderLoadingV29('Vui lòng nhập tên nhân viên.');
            return;
        }
        var startMs = roasRangeBoundaryMsV29(from,false);
        var endMs = roasRangeBoundaryMsV29(to,true);
        if (!startMs || !endMs || startMs >= endMs) {
            roasRangeRenderLoadingV29('Khoảng ngày chưa hợp lệ.');
            return;
        }

        var companies = roasRangeSelectedCompaniesV29(companyValue);
        ROAS_RANGE_LOOKUP_STATE_V29.loading = true;
        if (btn) { btn.disabled = true; btn.textContent = 'Đang tra cứu...'; }
        roasRangeRenderLoadingV29('Đang lấy Chi Meta và nối Revenue Ledger...');

        Promise.all(companies.map(function(company){
            return roasRangeFetchCompanyV29(company,from,to,employee);
        })).then(function(companyResults){
            var finalRows = [];
            var totalMeta = 0;
            var totalRevenue = 0;
            var totalOrders = 0;
            var rawLedgerRows = 0;
            var uniqueLedgerRows = 0;
            var duplicatesRemoved = 0;
            var uploadCount = 0;
            var ambiguousRevenue = 0;
            var ambiguousOrders = 0;
            var unmatchedRevenue = 0;
            var unmatchedOrders = 0;

            companyResults.forEach(function(bundle){
                var allGroups = bundle.groups || [];
                var ledger = bundle.ledger || {rows:[]};
                rawLedgerRows += Number(ledger.rawCount || 0);
                uniqueLedgerRows += Number(ledger.uniqueCount || 0);
                duplicatesRemoved += Number(ledger.duplicatesRemoved || 0);
                uploadCount += Number(ledger.uploadCount || 0);

                var rangeOrders = (ledger.rows || []).filter(function(order){
                    var ms = Number(order.createdAtMs || 0);
                    return ms >= startMs && ms < endMs && roasRangeEmployeeMatchesV29(order.employee || '', employee, bundle.company);
                });

                var allocation = roasRangeAllocateRevenueV29(allGroups,rangeOrders);
                ambiguousRevenue += allocation.ambiguous.reduce(function(sum,row){ return sum + Number(row.amount || 0); },0);
                ambiguousOrders += allocation.ambiguous.length;
                unmatchedRevenue += allocation.unmatched.reduce(function(sum,row){ return sum + Number(row.amount || 0); },0);
                unmatchedOrders += allocation.unmatched.length;

                allGroups.filter(function(group){
                    return roasRangeGroupMatchesTextV29(group,groupQuery);
                }).forEach(function(group){
                    var key = roasRangeGroupKeyV29(group);
                    var allocated = allocation.byGroup[key] || {revenue:0,orders:[]};
                    var metaSpend = Number(group.spend || 0);
                    var vat = metaSpend * 0.10;
                    var totalCost = metaSpend + vat;
                    var revenue = Number(allocated.revenue || 0);
                    var row = {
                        company:bundle.company,
                        employee:group.employee || employee,
                        groupName:group.fullName || group.adName || '',
                        skus:roasRangeGroupSkusV29(group),
                        metaSpend:metaSpend,
                        vat:vat,
                        totalCost:totalCost,
                        revenue:revenue,
                        orderCount:(allocated.orders || []).length,
                        roas:totalCost > 0 ? revenue / totalCost : 0
                    };
                    finalRows.push(row);
                    totalMeta += metaSpend;
                    totalRevenue += revenue;
                    totalOrders += row.orderCount;
                });
            });

            finalRows.sort(function(a,b){
                if (a.company !== b.company) return a.company.localeCompare(b.company);
                return Number(b.totalCost || 0) - Number(a.totalCost || 0);
            });

            var totalVat = totalMeta * 0.10;
            var totalCost = totalMeta + totalVat;
            var result = {
                from:from,
                to:to,
                months:roasRangeMonthsV29(from,to),
                rows:finalRows,
                total:{
                    metaSpend:totalMeta,
                    vat:totalVat,
                    totalCost:totalCost,
                    revenue:totalRevenue,
                    orderCount:totalOrders,
                    roas:totalCost > 0 ? totalRevenue / totalCost : 0
                },
                stats:{
                    rawLedgerRows:rawLedgerRows,
                    uniqueLedgerRows:uniqueLedgerRows,
                    duplicatesRemoved:duplicatesRemoved,
                    uploadCount:uploadCount,
                    ambiguousRevenue:ambiguousRevenue,
                    ambiguousOrders:ambiguousOrders,
                    unmatchedRevenue:unmatchedRevenue,
                    unmatchedOrders:unmatchedOrders
                }
            };
            ROAS_RANGE_LOOKUP_STATE_V29.lastResult = result;
            roasRangeRenderResultV29(result);
        }).catch(function(error){
            console.error('ROAS Range Lookup V29:', error);
            var box = document.getElementById('roas-range-result-v29');
            if (box) box.innerHTML = '<div class="roas-range-error-v29"><b>Không tra cứu được dữ liệu.</b><span>' + esc(error && error.message ? error.message : String(error)) + '</span></div>';
        }).finally(function(){
            ROAS_RANGE_LOOKUP_STATE_V29.loading = false;
            if (btn) { btn.disabled = false; btn.textContent = 'Tra cứu'; }
        });
    }

    function bindRoasRangeLookupV29(){
        var btn = document.getElementById('roas-range-search-btn-v29');
        var form = document.getElementById('roas-range-form-v29');
        if (btn) btn.onclick = runRoasRangeLookupV29;
        if (form) form.onsubmit = function(event){
            if (event && event.preventDefault) event.preventDefault();
            runRoasRangeLookupV29();
            return false;
        };
    }

    function renderCompanyData(){
        renderWorkflow();
        renderSummary();
        renderHistory();
    }

    function latestChatbotRowsForCompany(companyId){
        var activeUploadId = getActiveAdsUploadId(companyId);
        if (!activeUploadId) return [];
        var latest = latestChatbotUploadForCostUpload(companyId, activeUploadId);
        if (!latest) return [];
        var bucket = ensureCompanyBucket(companyId);
        return (bucket.chatbotRows || []).filter(function(row){
            return isNonZeroRevenueRow(row) &&
                row.chatbotUploadId === latest.id &&
                row.company === companyId &&
                effectiveTargetUploadIdForRow(row, companyId) === activeUploadId;
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
        var latestChatbot = activeId ? latestChatbotUploadForCostUpload(companyId, activeId) : null;
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
            step2Body = '<div class="roas-workflow-note">Chọn một file doanh thu chatbot cho file chi phí đang chọn. File mới chỉ thay file doanh thu cũ của chính file chi phí này, không ảnh hưởng các file chi phí khác.</div>' +
                '<div class="roas-workflow-actions"><button type="button" class="roas-step-btn success" data-roas-upload-chatbot>Up doanh thu chatbot</button></div>';
        } else {
            step2Body = '<div class="roas-workflow-file">💬 ' + esc(latestChatbot.fileName || '') + '</div>' +
                '<div class="roas-workflow-note">' + esc(revenueRows.length) + ' dòng · Khớp ' + esc(matched) + ' / Chưa khớp ' + esc(unmatched) + '. Chỉ file doanh thu mới nhất đã gắn với file chi phí này được tính.</div>' +
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

        // V26: chỉ trả về file chi phí đã được gắn lúc upload doanh thu.
        var map = record.targetAdsUploadsByCompany || {};
        var mapped = map[companyId] || null;
        if (mapped && mapped.id && uploads.some(function(u){ return u && String(u.id) === String(mapped.id); })) {
            return { id: String(mapped.id), label: mapped.label || '' };
        }

        if (record.company === companyId && record.targetAdsUploadId &&
            uploads.some(function(u){ return u && String(u.id) === String(record.targetAdsUploadId); })) {
            return { id: String(record.targetAdsUploadId), label: record.targetAdsUploadLabel || '' };
        }

        var linkedRow = (bucket.chatbotRows || []).find(function(row){
            if (!row || row.company !== companyId) return false;
            if (record.id && row.chatbotUploadId !== record.id) return false;
            return !!row.targetAdsUploadId;
        });
        if (linkedRow && uploads.some(function(u){ return u && String(u.id) === String(linkedRow.targetAdsUploadId); })) {
            return { id: String(linkedRow.targetAdsUploadId), label: linkedRow.targetAdsUploadLabel || '' };
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

    function chatbotReviewFillColor(row, check){
        row = row || {};
        check = check || {};
        if ((Number(row.amount) || 0) === 0) return '';

        var adText = String(row.adText || '').trim();
        var employee = String(row.employee || '').trim();
        var skus = uniqueList(row.skus || []);

        // Vàng: có doanh thu nhưng nội dung Quảng cáo trống hoặc thiếu dữ liệu tách Nhân viên / MÃ SP.
        if (!adText || !employee || !skus.length) return 'FFFF00';

        // Đỏ: nhân viên và mã có xuất hiện trong file chi phí nhưng không có đúng cặp Nhân viên + Mã SP.
        if (String(check.reason || '') === 'Nhân viên không chạy quảng cáo mã sản phẩm này trong file chi phí đang chọn.') {
            return 'FF0000';
        }

        // Xanh dương nhạt: mã có chạy nhưng đang thuộc nhân viên khác.
        if (String(check.reason || '') === 'Mã sản phẩm có chạy quảng cáo nhưng không phải do nhân viên này chạy.') {
            return 'BDD7EE';
        }

        return '';
    }

    function estimateSourceColumnWidths(aoa){
        var maxCols = 0;
        (aoa || []).forEach(function(row){ maxCols = Math.max(maxCols, (row || []).length); });
        var widths = [];
        for (var c = 0; c < maxCols; c++) {
            var maxLen = 8;
            for (var r = 0; r < Math.min((aoa || []).length, 500); r++) {
                var value = (aoa[r] || [])[c];
                var len = String(value === null || value === undefined ? '' : value).length;
                if (len > maxLen) maxLen = len;
            }
            widths.push({ wch: Math.max(9, Math.min(maxLen + 2, 60)) });
        }
        return widths;
    }

    function buildCompanyOnlyChatbotSource(source, companyId){
        var sourceAoa = (source && source.aoa ? source.aoa : []).map(function(row){
            return (row || []).slice();
        });
        if (!sourceAoa.length) throw new Error('File doanh thu gốc không có dữ liệu.');

        var headers = (sourceAoa[0] || []).map(function(h){ return String(h || '').trim(); });
        var teamIndex = findHeaderIndex(headers, ['Team'], ['team']);
        if (teamIndex === -1) throw new Error('Không tìm thấy cột Team trong dữ liệu doanh thu gốc.');

        var filteredAoa = [];
        var originalExcelRowToNewExcelRow = {};

        // Giữ nguyên hàng tiêu đề.
        filteredAoa.push((sourceAoa[0] || []).slice());
        originalExcelRowToNewExcelRow[1] = 1;

        for (var r = 1; r < sourceAoa.length; r++) {
            var sourceRow = sourceAoa[r] || [];
            var detected = detectCompanyFromTeam(readCell(sourceRow, teamIndex));
            if (!detected || detected.id !== companyId) continue;

            filteredAoa.push(sourceRow.slice());
            originalExcelRowToNewExcelRow[r + 1] = filteredAoa.length;
        }

        if (filteredAoa.length <= 1) {
            throw new Error('Không có đơn hàng doanh thu nào thuộc công ty ' + companyId + ' trong file gốc.');
        }

        // Chỉ giữ các vùng merge vẫn còn đầy đủ sau khi lọc công ty.
        var filteredMerges = [];
        (source.merges || []).forEach(function(m){
            if (!m || !m.s || !m.e) return;

            var mappedRows = [];
            for (var oldRow = m.s.r + 1; oldRow <= m.e.r + 1; oldRow++) {
                var newRow = originalExcelRowToNewExcelRow[oldRow];
                if (!newRow) return;
                mappedRows.push(newRow);
            }

            for (var i = 1; i < mappedRows.length; i++) {
                if (mappedRows[i] !== mappedRows[i - 1] + 1) return;
            }

            filteredMerges.push({
                s: { r: mappedRows[0] - 1, c: m.s.c },
                e: { r: mappedRows[mappedRows.length - 1] - 1, c: m.e.c }
            });
        });

        return {
            aoa: filteredAoa,
            merges: filteredMerges,
            rowMap: originalExcelRowToNewExcelRow
        };
    }

    function exportChatbotReviewWorkbook(chatbotUploadId, companyId, uploadId){
        try {
            if (typeof XLSX === 'undefined') throw new Error('Thư viện Excel chưa sẵn sàng.');

            var record = findChatbotUploadRecord(chatbotUploadId);
            if (!record) throw new Error('Không tìm thấy file doanh thu chatbot trong lịch sử.');

            var source = getChatbotSourceWorkbook(chatbotUploadId);
            if (!source || !source.aoa || !source.aoa.length) {
                throw new Error('File doanh thu này được upload trước khi hệ thống lưu bản dữ liệu gốc. Vui lòng upload lại file doanh thu một lần rồi bấm Kiểm tra để tải file được đánh dấu.');
            }

            // Chỉ xuất dữ liệu thuộc đúng công ty đang kiểm tra.
            var companySource = buildCompanyOnlyChatbotSource(source, companyId);
            var aoa = companySource.aoa;
            var reviewItems = chatbotReviewRows(record, companyId, uploadId, true);
            var highlightByNewExcelRow = {};

            reviewItems.forEach(function(item){
                var originalExcelRow = Number(item.row && item.row.rowNumber) || 0;
                var newExcelRow = companySource.rowMap[originalExcelRow];
                var color = chatbotReviewFillColor(item.row, item.check);
                if (newExcelRow > 0 && color) highlightByNewExcelRow[newExcelRow] = color;
            });

            var ws = XLSX.utils.aoa_to_sheet(aoa);
            if (companySource.merges && companySource.merges.length) {
                ws['!merges'] = companySource.merges;
            }
            ws['!cols'] = estimateSourceColumnWidths(aoa);

            var maxCols = 0;
            aoa.forEach(function(row){ maxCols = Math.max(maxCols, (row || []).length); });

            Object.keys(highlightByNewExcelRow).forEach(function(excelRowText){
                var excelRow = Number(excelRowText);
                var rowIndex = excelRow - 1;
                var fillColor = highlightByNewExcelRow[excelRowText];
                var fontColor = fillColor === 'FF0000' ? 'FFFFFF' : '000000';

                for (var c = 0; c < maxCols; c++) {
                    var address = XLSX.utils.encode_cell({ r: rowIndex, c: c });
                    if (!ws[address]) ws[address] = { t: 's', v: '' };
                    var currentStyle = ws[address].s || {};

                    ws[address].s = Object.assign({}, currentStyle, {
                        fill: {
                            patternType: 'solid',
                            fgColor: { rgb: fillColor },
                            bgColor: { rgb: fillColor }
                        },
                        font: Object.assign({}, currentStyle.font || {}, {
                            color: { rgb: fontColor }
                        }),
                        alignment: Object.assign({}, currentStyle.alignment || {}, {
                            vertical: 'top',
                            wrapText: true
                        })
                    });
                }
            });

            var wb = XLSX.utils.book_new();
            var safeSheetName = String(companyId + ' - KIEM TRA').slice(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

            var originalName = String(record.fileName || 'Doanh_thu_chatbot').replace(/\.[^.]+$/, '');
            var filename = sanitizeFilename(originalName + ' - ' + companyId + ' - KIỂM TRA') + '.xlsx';
            XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });

            setStatus(
                'Đã tải file kiểm tra riêng của <b>' + esc(companyId) + '</b>: <b>' + esc(filename) + '</b>. ' +
                'Vàng #FFFF00: thiếu Quảng cáo/Nhân viên/Mã SP; đỏ #FF0000: nhân viên không chạy đúng mã; xanh dương nhạt #BDD7EE: mã đang do nhân viên khác chạy.',
                'success'
            );
        } catch(err) {
            console.error(err);
            setStatus('Không tải được file kiểm tra: ' + esc(err.message || err), 'error');
        }
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
            '<div class="roas-review-foot">' +
              '<span>File tải xuống chỉ gồm dữ liệu của <b>' + esc(companyId) + '</b>. Màu chuẩn Excel: <b style="background:#FFFF00;color:#000;padding:1px 5px">vàng</b> = thiếu Quảng cáo/Nhân viên/Mã SP; <b style="background:#FF0000;color:#fff;padding:1px 5px">đỏ</b> = nhân viên không chạy đúng mã; <b style="background:#BDD7EE;color:#000;padding:1px 5px">xanh dương nhạt</b> = mã đang do nhân viên khác chạy.</span>' +
              '<div class="roas-review-foot-actions"><button type="button" class="roas-review-download">Tải file doanh thu đã đánh dấu</button><button type="button" class="roas-review-done">Đóng</button></div>' +
            '</div>' +
          '</div>';
        document.body.appendChild(modal);
        modal.onclick = function(ev){ if (ev.target === modal) closeRoasUnmatchedReview(); };
        var closeBtn = modal.querySelector('.roas-review-close');
        var doneBtn = modal.querySelector('.roas-review-done');
        var downloadBtn = modal.querySelector('.roas-review-download');
        if (closeBtn) closeBtn.onclick = closeRoasUnmatchedReview;
        if (doneBtn) doneBtn.onclick = closeRoasUnmatchedReview;
        if (downloadBtn) downloadBtn.onclick = function(){
            exportChatbotReviewWorkbook(chatbotUploadId, companyId, uploadId);
        };
    }

    function historyChildrenForUpload(companyId, uploadId){
        var bucket = ensureCompanyBucket(companyId);
        var list = (bucket.chatbotUploads || []).filter(function(record){
            var target = chatbotTargetForCompany(record, companyId);
            return target && String(target.id) === String(uploadId);
        }).sort(function(a,b){
            return String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || ''));
        });

        // Một file chi phí chỉ sử dụng/hiển thị file doanh thu mới nhất gắn với nó.
        return list.length ? [list[0]] : [];
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
            if (ROAS_STATE.chatbotSourceWorkbooks) delete ROAS_STATE.chatbotSourceWorkbooks[uploadId];
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
        if (db) db.ref(path).set({
            meta: record,
            rows: remainingRows,
            sourceWorkbook: getChatbotSourceWorkbook(uploadId),
            savedAt: nowIso()
        }).catch(function(e){ console.warn('Không cập nhật được file chatbot trên Firebase:', e); });
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
        return { meta: record, rows: rows, sourceWorkbook: getChatbotSourceWorkbook(uploadId), savedAt: nowIso() };
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
        if (!window.confirm('Xóa file doanh thu chatbot: "' + label + '"? Chỉ file doanh thu này và Revenue Ledger của lần upload này bị xóa; doanh thu của các file chi phí khác vẫn giữ nguyên.')) return;

        var db = getDb();
        if (!db) { setStatus('Không kết nối được Firebase nên chưa thể xóa file.', 'error'); return; }
        setStatus('Đang xóa đúng file doanh thu chatbot khỏi Firebase...', 'info');

        var deleteUpdates = {};
        deleteUpdates['/' + FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeFirebaseId(uploadId)] = null;
        COMPANY_OPTIONS.forEach(function(c){
            deleteUpdates[
                '/' + FIREBASE_ROOT + '/' + REVENUE_LEDGER_NODE + '/' +
                c.id + '/' + safeFirebaseId(uploadId)
            ] = null;
        });

        db.ref().update(deleteUpdates)
            .then(function(){ return fetchFirebaseStateNow(); })
            .then(function(){ setStatus('Đã xóa file doanh thu chatbot khỏi Firebase: <b>' + esc(label) + '</b>. Các file chi phí khác không bị ảnh hưởng.', 'success'); })
            .catch(function(e){ firebaseDeleteError('Không xóa được file chatbot trên Firebase:', e); });
    }

    function deleteAdsUpload(companyId, uploadId){
        if (!isAdminUser()) { setStatus('Chỉ Admin mới có quyền xóa file.', 'error'); return; }
        var bucket = ensureCompanyBucket(companyId);
        var record = (bucket.uploads || []).find(function(x){ return x && x.id === uploadId; });
        var label = record ? (record.fileName || uploadId) : uploadId;
        if (!window.confirm('Xóa file chi phí: "' + label + '"? File sẽ bị xóa khỏi Firebase. Các dòng doanh thu đã gắn riêng với file này sẽ được giữ lại ở trạng thái chờ và không tự chuyển sang file chi phí khác.')) return;

        var db = getDb();
        if (!db) { setStatus('Không kết nối được Firebase nên chưa thể xóa file.', 'error'); return; }
        setStatus('Đang xóa file chi phí và tháo liên kết doanh thu của đúng file này...', 'info');

        var updates = {};
        updates[FIREBASE_ROOT + '/uploads/' + companyId + '/' + safeFirebaseId(uploadId)] = null;

        // V26: xử lý mọi file doanh thu đã từng gắn với batch chi phí bị xóa,
        // không chỉ file doanh thu mới nhất toàn hệ thống.
        (ROAS_STATE.chatbotRevenueUploads || []).forEach(function(chatbotRecord){
            if (!chatbotRecord || !chatbotRecord.id) return;
            var allRows = collectChatbotRowsByUploadId(chatbotRecord.id);
            var changed = false;
            var nextRows = allRows.map(function(row){
                if (row && row.company === companyId && String(row.targetAdsUploadId || '') === String(uploadId)) {
                    changed = true;
                    var copy = Object.assign({}, row);
                    copy.targetAdsUploadId = '';
                    copy.targetAdsUploadLabel = 'Chờ file chi phí ' + companyId;
                    copy.matchedSku = '';
                    copy.matchedGroupKey = '';
                    copy.matchedAdsetName = '';
                    copy.effectiveTargetAdsUploadId = '';
                    return copy;
                }
                return row;
            });
            if (!changed) return;
            updates[FIREBASE_ROOT + '/chatbot_revenue_uploads/' + safeFirebaseId(chatbotRecord.id)] =
                buildChatbotFirebasePayload(chatbotRecord.id, nextRows);
        });

        db.ref().update(updates)
            .then(function(){ return fetchFirebaseStateNow(); })
            .then(function(){
                setStatus('Đã xóa file chi phí khỏi Firebase: <b>' + esc(label) + '</b>. Doanh thu từng gắn với file này được giữ ở trạng thái chờ và không chuyển sang file khác.', 'success');
            })
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
            orderId: findHeaderIndex(
                headers,
                ['Mã đơn hàng', 'Mã đơn', 'ID đơn hàng', 'Order ID', 'Mã đơn chatbot'],
                ['ma don hang', 'ma don', 'order id', 'id don']
            ),
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
            var rawCreatedAt = readCell(row, idx.date);
            var createdInfo = exactDateTimeInfoV25(rawCreatedAt);

            rows.push({
                id: makeId('REV') + '-' + r,
                sourceFileName: sourceFileName || '',
                rowNumber: r + 1,

                // date giữ tương thích V24; các trường V25 giữ timestamp đầy đủ.
                date: formatDateDMY(rawCreatedAt),
                dateRaw: createdInfo.raw,
                createdAtIso: createdInfo.iso,
                createdAtMs: createdInfo.ms,
                createdAtDisplay: createdInfo.display,
                datePrecision: createdInfo.precision,

                team: team,
                company: company ? company.id : '',
                companyName: company ? company.name : '',
                page: readCell(row, idx.page),
                customer: readCell(row, idx.customer),
                orderId: readCell(row, idx.orderId),
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

            rows[rows.length - 1].revenueFingerprint = buildRevenueFingerprintV25(rows[rows.length - 1]);
        }
        rows.zeroAmountSkippedCount = zeroAmountSkippedCount;
        rows.sourceWorkbook = {
            sheetName: sheetName || 'Worksheet',
            aoa: aoa.map(function(sourceRow){ return (sourceRow || []).slice(); }),
            merges: (ws['!merges'] || []).map(function(m){
                return { s: { r: m.s.r, c: m.s.c }, e: { r: m.e.r, c: m.e.c } };
            })
        };
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
            sourceWorkbooks: Object.assign({}, ROAS_STATE.chatbotSourceWorkbooks || {}),
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
        ROAS_STATE.chatbotSourceWorkbooks = (snapshot && snapshot.sourceWorkbooks) ? Object.assign({}, snapshot.sourceWorkbooks) : {};
        COMPANY_OPTIONS.forEach(function(c){
            var bucket = ensureCompanyBucket(c.id);
            var old = snapshot && snapshot.companies ? snapshot.companies[c.id] : null;
            bucket.chatbotRows = old ? old.rows.slice() : [];
            bucket.chatbotUploads = old ? old.uploads.slice() : [];
            rebuildCompanyGroups(c.id);
        });
    }

    function replaceLocalChatbotState(record, rows, sourceWorkbook){
        // V26: chỉ thêm file doanh thu mới vào state; không xóa doanh thu đã thuộc các file chi phí quá khứ.
        ROAS_STATE.chatbotRevenueUploads = (ROAS_STATE.chatbotRevenueUploads || []).filter(function(x){
            return !record || !x || x.id !== record.id;
        });
        if (record) ROAS_STATE.chatbotRevenueUploads.unshift(record);

        if (!ROAS_STATE.chatbotSourceWorkbooks) ROAS_STATE.chatbotSourceWorkbooks = {};
        if (record && sourceWorkbook) ROAS_STATE.chatbotSourceWorkbooks[record.id] = sourceWorkbook;

        COMPANY_OPTIONS.forEach(function(c){
            var bucket = ensureCompanyBucket(c.id);
            bucket.chatbotRows = (bucket.chatbotRows || []).filter(function(row){
                return !record || !row || row.chatbotUploadId !== record.id;
            });
            var companyRows = (rows || []).filter(function(row){ return row && row.company === c.id; });
            if (companyRows.length) bucket.chatbotRows = bucket.chatbotRows.concat(companyRows);

            bucket.chatbotUploads = (bucket.chatbotUploads || []).filter(function(x){
                return !record || !x || x.id !== record.id;
            });
            if (companyRows.length && record) bucket.chatbotUploads.unshift(record);
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
                status: 'latest_only_plus_revenue_ledger_v25',
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

            var sourceWorkbook = rows.sourceWorkbook || null;
            replaceLocalChatbotState(record, rows, sourceWorkbook);

            var matched = rows.filter(function(r){ return !!r.matchedGroupKey; }).length;
            record.matched = matched;
            record.unmatched = rows.length - matched;

            var ledgerSaveInfo = null;
            try {
                ledgerSaveInfo = await saveChatbotAndRevenueLedgerToFirebaseV25(
                    record,
                    rows,
                    sourceWorkbook
                );
            } catch(firebaseErr) {
                restoreChatbotState(previousState);
                throw firebaseErr;
            }

            await fetchFirebaseStateNow();

            var summaryRows = [];
            COMPANY_OPTIONS.forEach(function(c){
                var bucket = ensureCompanyBucket(c.id);
                (bucket.chatbotRows || []).forEach(function(row){
                    if (row && row.chatbotUploadId === record.id) summaryRows.push(row);
                });
            });

            setStatus(
                'Đã lưu <b>1 file doanh thu chatbot</b> vào đúng file chi phí đang chọn. Nếu file chi phí này đã có doanh thu trước đó, hệ thống chỉ dùng file doanh thu mới nhất gắn với chính file chi phí này; không ảnh hưởng các file chi phí quá khứ.<br>' +
                esc(summarizeChatbotRows(summaryRows)) +
                (zeroAmountSkippedCount ? '. Đã bỏ qua <b>' + esc(zeroAmountSkippedCount) + '</b> dòng có Tổng tiền bằng 0, không đưa vào so khớp' : '') +
                '. Revenue Ledger đã lưu <b>' + esc((ledgerSaveInfo && ledgerSaveInfo.ledgerRows) || 0) + '</b> đơn có thời gian hợp lệ để theo dõi ROAS sau đổi ngân sách.' +
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
        updates[FIREBASE_ROOT + '/' + REVENUE_LEDGER_NODE + '/' + companyId] = null;
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
            '.roas-review-overlay{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100090;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px);}.roas-review-modal{width:min(1380px,98vw);max-height:92vh;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;display:flex;flex-direction:column;font-family:"Segoe UI Variable Text","Segoe UI",Arial,Tahoma,sans-serif;}.roas-review-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:17px 20px;background:linear-gradient(135deg,#9a3412,#ea580c);color:#fff;}.roas-review-head h3{margin:0 0 5px;font-size:18px;font-weight:700;}.roas-review-head p{margin:0;font-size:11px;line-height:1.5;opacity:.92;word-break:break-word;}.roas-review-close{border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.14);color:#fff;border-radius:9px;width:34px;height:34px;font-size:23px;line-height:1;cursor:pointer;}.roas-review-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px 18px;background:#fff7ed;border-bottom:1px solid #fed7aa;}.roas-review-kpis div{background:#fff;border:1px solid #fed7aa;border-radius:12px;padding:10px;text-align:center;}.roas-review-kpis div.bad{border-color:#fecaca;background:#fef2f2;}.roas-review-kpis b{display:block;font-size:21px;font-weight:700;color:#9a3412;}.roas-review-kpis .bad b{color:#dc2626;}.roas-review-kpis span{display:block;margin-top:3px;color:#64748b;font-size:10px;font-weight:500;}.roas-review-table-wrap{overflow:auto;flex:1;padding:14px 16px;}.roas-review-table{width:100%;min-width:1250px;border-collapse:separate;border-spacing:0;font-size:10px;}.roas-review-table th{position:sticky;top:0;z-index:2;background:#f8fafc;color:#334155;border:1px solid #e2e8f0;border-left:0;padding:8px;text-align:center;white-space:nowrap;}.roas-review-table th:first-child{border-left:1px solid #e2e8f0;}.roas-review-table td{border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px;vertical-align:top;color:#334155;line-height:1.45;}.roas-review-table td:first-child{border-left:1px solid #e2e8f0;}.roas-review-center{text-align:center;}.roas-review-amount{text-align:right;font-weight:600;white-space:nowrap;}.roas-review-ad{min-width:300px;max-width:430px;word-break:break-word;}.roas-review-reason{color:#b91c1c;font-weight:600;}.roas-review-suggestion{color:#475569;margin-top:5px;font-style:italic;}.roas-review-foot{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:11px;font-weight:400;}.roas-review-foot-actions{display:flex;align-items:center;gap:9px;flex-shrink:0;}.roas-review-download{border:0;background:#137333;color:#fff;border-radius:9px;padding:8px 14px;font-weight:600;cursor:pointer;white-space:nowrap;}.roas-review-download:hover{background:#0d5b28;}.roas-review-done{border:0;background:#0f172a;color:#fff;border-radius:9px;padding:8px 18px;font-weight:600;cursor:pointer;}' +
            '.roas-range-box-v29{border:1px solid #dbe7f4;border-radius:16px;background:linear-gradient(180deg,#f8fbff,#fff);padding:16px;box-shadow:0 8px 24px rgba(15,23,42,.05);font-family:Tahoma,Arial,"Segoe UI",sans-serif;}' +
            '.roas-range-head-v29{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:13px}.roas-range-head-v29 h4{margin:0;color:#0f172a;font-size:16px;font-weight:700}.roas-range-head-v29 p{margin:5px 0 0;color:#64748b;font-size:11px;line-height:1.55}.roas-range-badge-v29{display:inline-flex;align-items:center;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:600;white-space:nowrap}' +
            '.roas-range-form-v29{display:grid;grid-template-columns:150px minmax(160px,1fr) minmax(180px,1.2fr) 140px 140px auto;gap:9px;align-items:end}.roas-range-field-v29{display:flex;flex-direction:column;gap:5px;min-width:0}.roas-range-field-v29 label{color:#475569;font-size:10px;font-weight:600}.roas-range-field-v29 input,.roas-range-field-v29 select{height:38px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#0f172a;padding:0 10px;font:500 12px Tahoma,Arial,"Segoe UI",sans-serif;outline:none;min-width:0}.roas-range-field-v29 input:focus,.roas-range-field-v29 select:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(59,130,246,.11)}.roas-range-search-v29{height:38px;border:0;border-radius:9px;background:#1d4ed8;color:#fff;padding:0 17px;font:600 12px Tahoma,Arial,"Segoe UI",sans-serif;cursor:pointer;white-space:nowrap}.roas-range-search-v29:hover{background:#1e40af}.roas-range-search-v29:disabled{opacity:.6;cursor:wait}' +
            '.roas-range-result-v29{margin-top:14px}.roas-range-loading-v29,.roas-range-empty-v29,.roas-range-error-v29{min-height:76px;border:1px dashed #cbd5e1;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;gap:9px;padding:14px;color:#64748b;text-align:center;flex-direction:column}.roas-range-loading-v29 span{width:18px;height:18px;border:2px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:roasRangeSpinV29 .8s linear infinite}@keyframes roasRangeSpinV29{to{transform:rotate(360deg)}}.roas-range-empty-v29 b,.roas-range-error-v29 b{color:#334155;font-size:12px}.roas-range-empty-v29 span,.roas-range-error-v29 span{font-size:10px}.roas-range-error-v29{border-color:#fecaca;background:#fff7f7;color:#b91c1c}' +
            '.roas-range-kpis-v29{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.roas-range-kpi-v29{border:1px solid #e2e8f0;border-radius:11px;background:#fff;padding:11px;min-width:0}.roas-range-kpi-v29 span{display:block;color:#64748b;font-size:9.5px;font-weight:600}.roas-range-kpi-v29 b{display:block;margin-top:5px;color:#0f172a;font-size:18px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.roas-range-kpi-v29 small{display:block;margin-top:4px;color:#94a3b8;font-size:9px}.roas-range-kpi-v29.green b{color:#15803d}.roas-range-kpi-v29.blue b{color:#1d4ed8}' +
            '.roas-range-audit-v29{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.roas-range-audit-v29 span{display:inline-flex;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;border-radius:999px;padding:5px 8px;font-size:9.5px}.roas-range-audit-v29 b{color:#334155;font-weight:600}.roas-range-warnings-v29{display:grid;gap:5px;margin:9px 0;padding:9px 11px;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;color:#92400e;font-size:10px;line-height:1.5}' +
            '.roas-range-table-wrap-v29{overflow:auto;border:1px solid #e2e8f0;border-radius:12px;background:#fff}.roas-range-table-v29{width:100%;min-width:940px;border-collapse:separate;border-spacing:0;font-size:10px}.roas-range-table-v29 th{position:sticky;top:0;background:#f8fafc;color:#475569;padding:9px;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:600}.roas-range-table-v29 th:nth-child(n+4){text-align:right}.roas-range-table-v29 td{padding:9px;border-bottom:1px solid #eef2f7;color:#334155;vertical-align:top}.roas-range-table-v29 td small{display:block;margin-top:3px;color:#94a3b8;font-size:9px}.roas-range-table-v29 td.num{text-align:right;white-space:nowrap}.roas-range-table-v29 td.strong{font-weight:600}.roas-range-table-v29 td.revenue{color:#15803d;font-weight:600}.roas-range-table-v29 td.roas{color:#1d4ed8;font-weight:700}.roas-range-company-v29{display:inline-flex;border-radius:999px;background:#eef2ff;color:#4338ca;padding:3px 6px;font-size:9px;font-weight:600}' +
            '@media(max-width:900px){.roas-workflow-step{grid-template-columns:42px minmax(0,1fr)}.roas-step-status{grid-column:2;justify-self:start}.roas-workflow-line{left:20px}.roas-upload-grid{grid-template-columns:1fr}.roas-summary{grid-template-columns:1fr}.roas-actions{width:100%}.roas-select,.roas-btn{width:100%}.roas-history-head{align-items:flex-start;flex-direction:column}.roas-history-search{width:100%}.roas-history-parent{grid-template-columns:1fr;padding-right:72px}.roas-history-state{text-align:left}.roas-history-children,.roas-history-no-child{padding-left:28px}.roas-history-time{font-weight:500}.roas-history-child-actions{justify-content:flex-start;flex-wrap:wrap;min-width:0}.roas-history-delete{right:10px;top:10px}.roas-history-delete.child-delete{position:static}.roas-review-kpis{grid-template-columns:1fr}.roas-review-foot{align-items:flex-start;flex-direction:column}.roas-review-foot-actions{width:100%;flex-wrap:wrap}.roas-review-download,.roas-review-done{flex:1}.roas-range-form-v29{grid-template-columns:1fr 1fr}.roas-range-search-v29{width:100%}.roas-range-kpis-v29{grid-template-columns:1fr 1fr}.roas-range-head-v29{flex-direction:column}.roas-range-badge-v29{align-self:flex-start}}' +
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
              '<section class="roas-range-box-v29" id="roas-range-box-v29">' +
                '<div class="roas-range-head-v29"><div><h4>Tra cứu ROAS theo khoảng ngày</h4><p>Chi Meta lấy trực tiếp từ Meta. Doanh thu lấy theo đúng ngày giờ đơn trong Revenue Ledger, tự chống trùng file lũy kế tuần và tự nối nhiều tháng.</p></div><span class="roas-range-badge-v29">META + VAT + DOANH THU</span></div>' +
                '<form class="roas-range-form-v29" id="roas-range-form-v29">' +
                  '<div class="roas-range-field-v29"><label>Công ty</label><select id="roas-range-company-v29"><option value="CURRENT">Công ty đang chọn</option><option value="ALL">Tất cả công ty</option><option value="NNV">NNV</option><option value="VN">VN</option><option value="KF">KF</option><option value="ABC">ABC</option></select></div>' +
                  '<div class="roas-range-field-v29"><label>Nhân viên</label><input id="roas-range-employee-v29" type="text" placeholder="Ví dụ: Kim Ngân" autocomplete="off" /></div>' +
                  '<div class="roas-range-field-v29"><label>Nhóm quảng cáo / SKU <span style="font-weight:400;color:#94a3b8">(không bắt buộc)</span></label><input id="roas-range-group-v29" type="text" placeholder="Tên nhóm hoặc ONNV98..." autocomplete="off" /></div>' +
                  '<div class="roas-range-field-v29"><label>Từ ngày</label><input id="roas-range-from-v29" type="date" value="' + roasRangeMonthStartV29() + '" /></div>' +
                  '<div class="roas-range-field-v29"><label>Đến ngày</label><input id="roas-range-to-v29" type="date" value="' + roasRangeTodayV29() + '" /></div>' +
                  '<button class="roas-range-search-v29" type="submit" id="roas-range-search-btn-v29">Tra cứu</button>' +
                '</form>' +
                '<div class="roas-range-result-v29" id="roas-range-result-v29"><div class="roas-range-empty-v29"><b>Chưa có tra cứu.</b><span>Nhập tên nhân viên và khoảng ngày để xem từng nhóm quảng cáo.</span></div></div>' +
              '</section>' +
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
        bindRoasRangeLookupV29();
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
        revenueLedgerNode: REVENUE_LEDGER_NODE,
        version: 'V29_RANGE_EMPLOYEE_META_REVENUE_MULTI_MONTH',
        runRangeLookup: runRoasRangeLookupV29,
        getRangeLookupState: function(){ return ROAS_RANGE_LOOKUP_STATE_V29; },
        clearRangeLedgerCache: function(){ ROAS_RANGE_LOOKUP_STATE_V29.ledgerCache = {}; },
        reloadFirebaseHistory: function(){ ROAS_STATE.firebaseLoaded = false; ROAS_RANGE_LOOKUP_STATE_V29.ledgerCache = {}; return fetchFirebaseStateNow(); }
    };
})();

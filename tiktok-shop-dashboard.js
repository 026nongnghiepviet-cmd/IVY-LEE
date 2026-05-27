/**
 * TIKTOK SHOP DASHBOARD V1.0
 * Module riêng cho Dashboard TikTok Shop trong MKT System.
 * Nhận tối đa 4 nhóm file:
 * - Phân tích cửa hàng
 * - Phân tích Live & Video
 * - Thẻ sản phẩm
 * - Phân tích sản phẩm
 *
 * Lưu ý vận hành:
 * - Có thể upload 1 file hoặc nhiều file cùng lúc.
 * - Không bắt buộc đủ 4 file.
 * - Dedupe theo loại file + kỳ dữ liệu, ưu tiên bản upload mới nhất.
 * - Lưu Firebase: tiktok_shop_stats_logs, tiktok_shop_stats_latest.
 */
(function () {
    'use strict';

    var TIKTOK_VERSION = 'TIKTOK_V1.0_DASHBOARD';
    var COMPANIES = [
        { id: 'NNV', name: 'Nông Nghiệp Việt' },
        { id: 'VN', name: 'Việt Nhật' },
        { id: 'KF', name: 'King Farm' },
        { id: 'ABC', name: 'ABC Việt Nam' }
    ];

    var STATE = {
        company: 'NNV',
        current: null,
        history: [],
        db: null,
        charts: {},
        dateFrom: '',
        dateTo: '',
        quickFilter: '',
        monthFilter: '',
        productSearch: '',
        initializedDefaultMonth: false
    };

    var TYPE_LABELS = {
        store: 'Phân tích cửa hàng',
        live_video: 'Phân tích Live & Video',
        product_card: 'Thẻ sản phẩm',
        product: 'Phân tích sản phẩm'
    };

    function getDb() {
        if (!STATE.db && typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            STATE.db = firebase.database();
        }
        return STATE.db;
    }

    function getContainer() {
        return document.getElementById('ecom-tiktok-dashboard-container') ||
               document.getElementById('tiktok-shop-dashboard-container') ||
               document.getElementById('page-tiktok');
    }

    function safeText(v) {
        return (v === null || v === undefined) ? '' : String(v);
    }

    function escapeHtml(str) {
        return safeText(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function norm(str) {
        return safeText(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    function parseNum(value) {
        if (value === null || value === undefined || value === '' || value === '-') return 0;
        if (typeof value === 'number') return value;
        var s = String(value).trim();
        if (!s || s === '-') return 0;
        s = s.replace(/₫/g, '').replace(/đ/g, '').replace(/%/g, '').replace(/\s/g, '');
        if (s.indexOf(',') !== -1) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
            else if (/^-?\d+\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
        }
        var n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    function parseRate(value) {
        if (value === null || value === undefined || value === '' || value === '-') return 0;
        if (typeof value === 'number') return Math.abs(value) <= 1 ? value * 100 : value;
        var s = String(value);
        var hasPct = s.indexOf('%') !== -1;
        var n = parseNum(value);
        if (!hasPct && Math.abs(n) <= 1) return n * 100;
        return n;
    }

    function fmtMoney(n) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' đ';
    }

    function fmtNum(n, d) {
        d = d === undefined ? 0 : d;
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d, minimumFractionDigits: d }).format(Number(n) || 0);
    }

    function fmtPct(n) {
        return fmtNum(n, 2) + '%';
    }

    function isDateLike(v) {
        var s = safeText(v).trim();
        return /^\d{4}-\d{1,2}-\d{1,2}$/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s) || /^\d{1,2}-\d{1,2}-\d{4}$/.test(s);
    }

    function normalizeDate(value) {
        var s = safeText(value).trim();
        if (!s) return '';
        var m;
        if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) {
            return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
        }
        if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) {
            return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
        }
        return s;
    }

    function displayDate(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
    }

    function toISODate(d) {
        if (!(d instanceof Date) || isNaN(d.getTime())) return '';
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function addDays(d, days) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        x.setDate(x.getDate() + days);
        return x;
    }

    function startOfWeekMonday(d) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var day = x.getDay();
        var diff = (day === 0 ? -6 : 1) - day;
        x.setDate(x.getDate() + diff);
        return x;
    }

    function inDateRange(dateISO) {
        if (!dateISO) return true;
        if (STATE.dateFrom && dateISO < STATE.dateFrom) return false;
        if (STATE.dateTo && dateISO > STATE.dateTo) return false;
        return true;
    }

    function hasDateFilter() {
        return !!(STATE.dateFrom || STATE.dateTo);
    }

    function rangesOverlap(start, end) {
        if (!hasDateFilter()) return true;
        if (!start && !end) return true;
        start = start || end;
        end = end || start;
        if (STATE.dateFrom && end < STATE.dateFrom) return false;
        if (STATE.dateTo && start > STATE.dateTo) return false;
        return true;
    }

    function monthLabel(ym) {
        if (!ym) return 'Chọn tháng';
        var p = ym.split('-');
        return p.length === 2 ? ('Tháng ' + p[1] + '/' + p[0]) : ym;
    }

    function toast(message, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }
        var box = document.getElementById('tiktok-stats-toast');
        if (!box) {
            box = document.createElement('div');
            box.id = 'tiktok-stats-toast';
            box.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:100005;background:#0f172a;color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;box-shadow:0 15px 35px rgba(15,23,42,.25);display:none;font-family:Segoe UI,Arial,sans-serif;';
            document.body.appendChild(box);
        }
        box.innerText = message;
        box.style.background = type === 'error' ? '#dc2626' : (type === 'success' ? '#16a34a' : '#0f172a');
        box.style.display = 'block';
        setTimeout(function () { box.style.display = 'none'; }, 3200);
    }

    function readFileAsArrayBuffer(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (evt) { resolve(evt.target.result); };
            reader.onerror = function () { reject(new Error('Không đọc được file: ' + file.name)); };
            reader.readAsArrayBuffer(file);
        });
    }

    function simpleHash(str) {
        var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (var i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = (h1 ^ (h1 >>> 16)) >>> 0;
        h2 = (h2 ^ (h2 >>> 16)) >>> 0;
        return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
    }

    async function hashBuffer(buffer) {
        try {
            if (window.crypto && crypto.subtle) {
                var digest = await crypto.subtle.digest('SHA-256', buffer);
                return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
            }
        } catch (e) {}
        var arr = new Uint8Array(buffer);
        var s = '';
        for (var i = 0; i < arr.length; i += 256) s += String.fromCharCode(arr[i]);
        return simpleHash(s + '|' + arr.length);
    }

    async function hashText(text) {
        return hashBuffer(new TextEncoder().encode(text).buffer);
    }

    function sheetRows(workbook) {
        var name = workbook.SheetNames[0];
        var sheet = workbook.Sheets[name];
        return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
    }

    function buildHeaderMap(row) {
        var map = {};
        (row || []).forEach(function (h, i) {
            var key = safeText(h).trim();
            if (key) map[norm(key)] = i;
        });
        return map;
    }

    function getByHeader(row, headerMap, names) {
        names = Array.isArray(names) ? names : [names];
        for (var i = 0; i < names.length; i++) {
            var idx = headerMap[norm(names[i])];
            if (idx !== undefined) return row[idx];
        }
        return null;
    }

    function findHeaderRow(rows, requiredLabels) {
        for (var r = 0; r < rows.length; r++) {
            var joined = (rows[r] || []).map(norm).join('|');
            var ok = requiredLabels.every(function (label) {
                return joined.indexOf(norm(label)) !== -1;
            });
            if (ok) return r;
        }
        return -1;
    }

    function parsePeriodFromText(text) {
        var s = safeText(text).replace(/\n/g, ' ').trim();
        var m;
        if ((m = s.match(/(\d{4}-\d{1,2}-\d{1,2})\s*[~\-]\s*(\d{4}-\d{1,2}-\d{1,2})/))) {
            return { start: normalizeDate(m[1]), end: normalizeDate(m[2]), label: displayDate(normalizeDate(m[1])) + ' - ' + displayDate(normalizeDate(m[2])) };
        }
        if ((m = s.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/))) {
            return { start: normalizeDate(m[1]), end: normalizeDate(m[2]), label: displayDate(normalizeDate(m[1])) + ' - ' + displayDate(normalizeDate(m[2])) };
        }
        return { start: '', end: '', label: '' };
    }

    function detectFileType(rows) {
        var sample = rows.slice(0, 10).map(function (r) { return (r || []).join(' | '); }).join(' || ');
        var n = norm(sample);

        if (n.indexOf(norm('Tổng quan dữ liệu')) !== -1 && n.indexOf(norm('Tổng doanh thu')) !== -1) return 'store';
        if (n.indexOf(norm('GMV đến từ buổi LIVE')) !== -1 && n.indexOf(norm('Lượt xem phiên LIVE')) !== -1) return 'live_video';
        if (n.indexOf(norm('GMV nhờ thẻ sản phẩm')) !== -1 && n.indexOf(norm('Tỷ lệ từ xem đến thanh toán')) !== -1) return 'product_card';
        if (n.indexOf(norm('GMV tab Cửa hàng')) !== -1 && n.indexOf(norm('GMV đến từ video')) !== -1) return 'product';

        return 'unknown';
    }

    function parseStore(rows) {
        var period = parsePeriodFromText(rows[0] && rows[0][0]);
        var summaryHeaderIndex = findHeaderRow(rows, ['GMV', 'Đơn hàng', 'Tổng doanh thu']);
        var dailyHeaderIndex = -1;
        for (var i = summaryHeaderIndex + 1; i < rows.length; i++) {
            if (norm(rows[i] && rows[i][0]) === norm('Ngày')) { dailyHeaderIndex = i; break; }
        }

        var summary = {};
        if (summaryHeaderIndex >= 0) {
            var h = buildHeaderMap(rows[summaryHeaderIndex]);
            var v = rows[summaryHeaderIndex + 1] || [];
            summary = {
                gmv: parseNum(getByHeader(v, h, 'GMV')),
                orders: parseNum(getByHeader(v, h, 'Đơn hàng')),
                customers: parseNum(getByHeader(v, h, 'Khách hàng')),
                units: parseNum(getByHeader(v, h, 'Số món bán ra')),
                skuOrders: parseNum(getByHeader(v, h, 'Đơn hàng SKU')),
                revenue: parseNum(getByHeader(v, h, 'Tổng doanh thu')),
                pageViews: parseNum(getByHeader(v, h, 'Lượt xem trang')),
                visitors: parseNum(getByHeader(v, h, 'Khách truy cập')),
                conversionRate: parseRate(getByHeader(v, h, 'Tỷ lệ chuyển đổi')),
                productImpressions: parseNum(getByHeader(v, h, 'Lượt hiển thị sản phẩm')),
                productClicks: parseNum(getByHeader(v, h, 'Lượt nhấp vào sản phẩm')),
                aov: parseNum(getByHeader(v, h, 'AOV')),
                liveGmv: parseNum(getByHeader(v, h, 'GMV nhờ buổi LIVE của nhà sáng tạo')) +
                         parseNum(getByHeader(v, h, 'GMV nhờ buổi LIVE của tài khoản kết nối')) +
                         parseNum(getByHeader(v, h, 'GMV LIVE của người bán')),
                videoGmv: parseNum(getByHeader(v, h, 'GMV đến từ video liên kết')) +
                          parseNum(getByHeader(v, h, 'GMV nhờ video của tài khoản kết nối')) +
                          parseNum(getByHeader(v, h, 'GMV video của người bán'))
            };
        }

        var daily = [];
        if (dailyHeaderIndex >= 0) {
            var dh = buildHeaderMap(rows[dailyHeaderIndex]);
            for (var r = dailyHeaderIndex + 1; r < rows.length; r++) {
                var row = rows[r] || [];
                if (!isDateLike(row[0])) continue;
                var dateISO = normalizeDate(row[0]);
                var obj = {
                    date: displayDate(dateISO),
                    dateISO: dateISO,
                    gmv: parseNum(getByHeader(row, dh, 'GMV')),
                    orders: parseNum(getByHeader(row, dh, 'Đơn hàng')),
                    customers: parseNum(getByHeader(row, dh, 'Khách hàng')),
                    units: parseNum(getByHeader(row, dh, 'Số món bán ra')),
                    skuOrders: parseNum(getByHeader(row, dh, 'Đơn hàng SKU')),
                    revenue: parseNum(getByHeader(row, dh, 'Tổng doanh thu')),
                    pageViews: parseNum(getByHeader(row, dh, 'Lượt xem trang')),
                    visitors: parseNum(getByHeader(row, dh, 'Khách truy cập')),
                    conversionRate: parseRate(getByHeader(row, dh, 'Tỷ lệ chuyển đổi')),
                    productImpressions: parseNum(getByHeader(row, dh, 'Lượt hiển thị sản phẩm')),
                    productClicks: parseNum(getByHeader(row, dh, 'Lượt nhấp vào sản phẩm')),
                    aov: parseNum(getByHeader(row, dh, 'AOV')),
                    liveGmv: parseNum(getByHeader(row, dh, 'GMV nhờ buổi LIVE của nhà sáng tạo')) +
                             parseNum(getByHeader(row, dh, 'GMV nhờ buổi LIVE của tài khoản kết nối')) +
                             parseNum(getByHeader(row, dh, 'GMV LIVE của người bán')),
                    videoGmv: parseNum(getByHeader(row, dh, 'GMV đến từ video liên kết')) +
                              parseNum(getByHeader(row, dh, 'GMV nhờ video của tài khoản kết nối')) +
                              parseNum(getByHeader(row, dh, 'GMV video của người bán'))
                };
                daily.push(obj);
            }
        }

        if (!period.start && daily.length) {
            period.start = daily[0].dateISO;
            period.end = daily[daily.length - 1].dateISO;
            period.label = displayDate(period.start) + ' - ' + displayDate(period.end);
        }

        return { summary: summary, daily: daily, period: period };
    }

    function parseLiveVideo(rows) {
        var period = parsePeriodFromText(rows[0] && rows[0][0]);
        var headerIndex = findHeaderRow(rows, ['Thời gian', 'GMV đến từ buổi LIVE', 'Lượt xem phiên LIVE']);
        var daily = [];
        if (headerIndex >= 0) {
            var h = buildHeaderMap(rows[headerIndex]);
            for (var r = headerIndex + 1; r < rows.length; r++) {
                var row = rows[r] || [];
                if (!isDateLike(row[0])) continue;
                var dateISO = normalizeDate(row[0]);
                daily.push({
                    date: displayDate(dateISO),
                    dateISO: dateISO,
                    liveGmv: parseNum(getByHeader(row, h, 'GMV đến từ buổi LIVE (₫)')),
                    liveDirectGmv: parseNum(getByHeader(row, h, 'GMV LIVE (₫)')),
                    liveIndirectGmv: parseNum(getByHeader(row, h, 'GMV gián tiếp của LIVE (₫)')),
                    liveSessions: parseNum(getByHeader(row, h, 'Buổi LIVE')),
                    liveSessionsWithGmv: parseNum(getByHeader(row, h, 'Số buổi LIVE tạo ra GMV.')),
                    units: parseNum(getByHeader(row, h, 'Số món bán ra ghi nhận vào buổi LIVE')),
                    orders: parseNum(getByHeader(row, h, 'Đơn hàng SKU đã ghi nhận')),
                    customers: parseNum(getByHeader(row, h, 'Khách hàng (Tìm kiếm)')),
                    clickRate: parseRate(getByHeader(row, h, 'Tỷ lệ nhấp (LIVE)')),
                    ctor: parseRate(getByHeader(row, h, 'CTOR (đơn hàng SKU) (LIVE)')),
                    views: parseNum(getByHeader(row, h, 'Lượt xem phiên LIVE')),
                    avgWatchTime: parseNum(getByHeader(row, h, 'Thời lượng xem trung bình (Buổi LIVE)'))
                });
            }
        }
        if (!period.start && daily.length) {
            period.start = daily[0].dateISO;
            period.end = daily[daily.length - 1].dateISO;
            period.label = displayDate(period.start) + ' - ' + displayDate(period.end);
        }
        return { daily: daily, period: period };
    }

    function parseProductCard(rows) {
        var period = parsePeriodFromText(rows[0] && rows[0][0]);
        var headerIndex = findHeaderRow(rows, ['Thời gian', 'GMV nhờ thẻ sản phẩm']);
        var daily = [];
        if (headerIndex >= 0) {
            var h = buildHeaderMap(rows[headerIndex]);
            for (var r = headerIndex + 1; r < rows.length; r++) {
                var row = rows[r] || [];
                if (!isDateLike(row[0])) continue;
                var dateISO = normalizeDate(row[0]);
                daily.push({
                    date: displayDate(dateISO),
                    dateISO: dateISO,
                    views: parseNum(getByHeader(row, h, 'Lượt xem')),
                    clicks: parseNum(getByHeader(row, h, 'Lượt nhấp')),
                    customers: parseNum(getByHeader(row, h, 'Khách hàng')),
                    skuOrders: parseNum(getByHeader(row, h, 'Đơn hàng SKU đã ghi nhận')),
                    gmv: parseNum(getByHeader(row, h, 'GMV nhờ thẻ sản phẩm (₫)')),
                    viewers: parseNum(getByHeader(row, h, 'Người xem')),
                    cartClicks: parseNum(getByHeader(row, h, 'Lượt nhấp vào Thêm vào giỏ hàng')),
                    cartUsers: parseNum(getByHeader(row, h, 'Người dùng Thêm vào giỏ hàng')),
                    clickToCartRate: parseRate(getByHeader(row, h, 'Tỷ lệ từ nhấp đến thêm vào giỏ')),
                    viewToClickRate: parseRate(getByHeader(row, h, 'Tỷ lệ từ xem đến nhấp')),
                    viewToPayRate: parseRate(getByHeader(row, h, 'Tỷ lệ từ xem đến thanh toán')),
                    clickToPayRate: parseRate(getByHeader(row, h, 'Tỷ lệ từ nhấp đến thanh toán')),
                    contentGmv: parseNum(getByHeader(row, h, 'GMV quy ra từ nội dung (₫)'))
                });
            }
        }
        if (!period.start && daily.length) {
            period.start = daily[0].dateISO;
            period.end = daily[daily.length - 1].dateISO;
            period.label = displayDate(period.start) + ' - ' + displayDate(period.end);
        }
        return { daily: daily, period: period };
    }

    function parseProducts(rows) {
        var period = parsePeriodFromText(rows[0] && rows[0][0]);
        var headerIndex = findHeaderRow(rows, ['ID', 'Sản phẩm', 'GMV tab Cửa hàng']);
        var products = [];
        if (headerIndex >= 0) {
            var h = buildHeaderMap(rows[headerIndex]);
            for (var r = headerIndex + 1; r < rows.length; r++) {
                var row = rows[r] || [];
                var id = safeText(getByHeader(row, h, 'ID')).trim();
                var name = safeText(getByHeader(row, h, 'Sản phẩm')).trim();
                if (!id || !name || norm(id) === 'id') continue;
                products.push({
                    id: id,
                    productName: name,
                    status: safeText(getByHeader(row, h, 'Trạng thái')).trim(),
                    gmv: parseNum(getByHeader(row, h, 'GMV')),
                    units: parseNum(getByHeader(row, h, 'Số món bán ra')),
                    orders: parseNum(getByHeader(row, h, 'Đơn hàng')),
                    storeGmv: parseNum(getByHeader(row, h, 'GMV tab Cửa hàng')),
                    storeUnits: parseNum(getByHeader(row, h, 'Số món bán ra qua Tab Cửa hàng')),
                    storeImpressions: parseNum(getByHeader(row, h, 'Lượt hiển thị bài niêm yết trong tab Cửa hàng')),
                    storeViews: parseNum(getByHeader(row, h, 'Lượt xem trang từ tab Cửa hàng')),
                    storeCustomers: parseNum(getByHeader(row, h, 'Khách hàng mua sản phẩm độc nhất tại tab Cửa hàng')),
                    storeClickRate: parseRate(getByHeader(row, h, 'Tỷ lệ nhấp vào Shop Tab')),
                    storeConversionRate: parseRate(getByHeader(row, h, 'Tỷ lệ chuyển đổi Shop Tab')),
                    liveGmv: parseNum(getByHeader(row, h, 'GMV đến từ buổi LIVE')),
                    liveUnits: parseNum(getByHeader(row, h, 'Số món bán ra ghi nhận vào buổi LIVE')),
                    liveImpressions: parseNum(getByHeader(row, h, 'Lượt hiển thị LIVE')),
                    liveViews: parseNum(getByHeader(row, h, 'Lượt xem trang từ LIVE')),
                    liveCustomers: parseNum(getByHeader(row, h, 'Khách hàng sản phẩm duy nhất của LIVE')),
                    liveClickRate: parseRate(getByHeader(row, h, 'Tỷ lệ nhấp vào LIVE')),
                    liveConversionRate: parseRate(getByHeader(row, h, 'Tỷ lệ chuyển đổi của LIVE')),
                    videoGmv: parseNum(getByHeader(row, h, 'GMV đến từ video')),
                    videoUnits: parseNum(getByHeader(row, h, 'Số món bán ra ghi nhận vào video')),
                    videoImpressions: parseNum(getByHeader(row, h, 'Lượt hiển thị của video')),
                    videoViews: parseNum(getByHeader(row, h, 'Lượt xem trang từ video')),
                    videoCustomers: parseNum(getByHeader(row, h, 'Khách hàng sản phẩm duy nhất của video')),
                    videoClickRate: parseRate(getByHeader(row, h, 'Tỷ lệ nhấp vào video')),
                    videoConversionRate: parseRate(getByHeader(row, h, 'Tỷ lệ chuyển đổi của video')),
                    cardGmv: parseNum(getByHeader(row, h, 'GMV nhờ thẻ sản phẩm')),
                    cardUnits: parseNum(getByHeader(row, h, 'Số món bán ra nhờ thẻ sản phẩm')),
                    cardImpressions: parseNum(getByHeader(row, h, 'Lượt hiển thị thẻ sản phẩm')),
                    cardViews: parseNum(getByHeader(row, h, 'Lượt xem trang từ thẻ sản phẩm')),
                    cardCustomers: parseNum(getByHeader(row, h, 'Khách hàng duy nhất của thẻ sản phẩm')),
                    cardClickRate: parseRate(getByHeader(row, h, 'Tỷ lệ nhấp vào thẻ sản phẩm')),
                    cardConversionRate: parseRate(getByHeader(row, h, 'Tỷ lệ chuyển đổi của thẻ sản phẩm'))
                });
            }
        }
        return { rows: products, byId: aggregateProducts(products), period: period };
    }

    function aggregateProducts(rows) {
        var map = {};
        (rows || []).forEach(function (p) {
            var id = p.id || 'NO-ID';
            if (!map[id]) {
                map[id] = {
                    id: id,
                    productName: p.productName || '',
                    status: p.status || '',
                    gmv: 0,
                    units: 0,
                    orders: 0,
                    storeGmv: 0,
                    liveGmv: 0,
                    videoGmv: 0,
                    cardGmv: 0,
                    storeImpressions: 0,
                    storeViews: 0,
                    storeCustomers: 0,
                    liveImpressions: 0,
                    liveViews: 0,
                    liveCustomers: 0,
                    videoImpressions: 0,
                    videoViews: 0,
                    videoCustomers: 0,
                    cardImpressions: 0,
                    cardViews: 0,
                    cardCustomers: 0,
                    aliasesMap: {}
                };
            }
            var g = map[id];
            if (p.productName) g.aliasesMap[p.productName] = (g.aliasesMap[p.productName] || 0) + (p.gmv || 0);
            if (!g.productName || (p.gmv || 0) > (g.bestGmv || 0)) { g.productName = p.productName; g.bestGmv = p.gmv || 0; }
            g.status = g.status || p.status;
            ['gmv','units','orders','storeGmv','liveGmv','videoGmv','cardGmv','storeImpressions','storeViews','storeCustomers','liveImpressions','liveViews','liveCustomers','videoImpressions','videoViews','videoCustomers','cardImpressions','cardViews','cardCustomers'].forEach(function (k) {
                g[k] += p[k] || 0;
            });
        });
        return Object.keys(map).map(function (id) {
            var g = map[id];
            g.sources = [
                { key: 'Cửa hàng', gmv: g.storeGmv, impressions: g.storeImpressions, views: g.storeViews, customers: g.storeCustomers },
                { key: 'LIVE', gmv: g.liveGmv, impressions: g.liveImpressions, views: g.liveViews, customers: g.liveCustomers },
                { key: 'Video', gmv: g.videoGmv, impressions: g.videoImpressions, views: g.videoViews, customers: g.videoCustomers },
                { key: 'Thẻ sản phẩm', gmv: g.cardGmv, impressions: g.cardImpressions, views: g.cardViews, customers: g.cardCustomers }
            ].filter(function (x) { return (x.gmv || 0) > 0 || (x.views || 0) > 0 || (x.impressions || 0) > 0; });
            g.aliases = Object.keys(g.aliasesMap).sort(function (a, b) { return g.aliasesMap[b] - g.aliasesMap[a]; });
            delete g.aliasesMap; delete g.bestGmv;
            return g;
        }).sort(function (a, b) { return b.gmv - a.gmv; });
    }

    function parseWorkbookPiece(workbook, fileName, fileHash) {
        var rows = sheetRows(workbook);
        var type = detectFileType(rows);
        if (type === 'unknown') throw new Error('Không nhận diện được loại file: ' + fileName);

        var parsed;
        if (type === 'store') parsed = parseStore(rows);
        if (type === 'live_video') parsed = parseLiveVideo(rows);
        if (type === 'product_card') parsed = parseProductCard(rows);
        if (type === 'product') parsed = parseProducts(rows);

        var period = parsed.period || {};
        return {
            type: type,
            typeLabel: TYPE_LABELS[type] || type,
            fileName: fileName,
            fileHash: fileHash,
            periodStart: period.start || '',
            periodEnd: period.end || '',
            periodLabel: period.label || '',
            parsed: parsed,
            uploadedAt: new Date().toISOString()
        };
    }

    function minDate(arr) {
        var xs = arr.filter(Boolean).sort();
        return xs[0] || '';
    }

    function maxDate(arr) {
        var xs = arr.filter(Boolean).sort();
        return xs[xs.length - 1] || '';
    }

    function sum(rows, field) {
        return (rows || []).reduce(function (s, x) { return s + (Number(x[field]) || 0); }, 0);
    }

    function groupByDate(rows, fields) {
        var map = {};
        (rows || []).forEach(function (x) {
            var key = x.dateISO || normalizeDate(x.date);
            if (!key) return;
            if (!map[key]) {
                map[key] = { dateISO: key, date: displayDate(key) };
                fields.forEach(function (f) { map[key][f] = 0; });
            }
            fields.forEach(function (f) { map[key][f] += Number(x[f]) || 0; });
        });
        return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return String(a.dateISO).localeCompare(String(b.dateISO)); });
    }

    function uniqueRecords() {
        var map = {};
        (STATE.history || []).forEach(function (r) { if (r) map[r.bundleKey || r.batchId || r.bundleHash || (r.uploadedAt + r.fileNames)] = r; });
        if (STATE.current) map[STATE.current.bundleKey || STATE.current.batchId || STATE.current.bundleHash || 'current'] = STATE.current;
        return Object.keys(map).map(function (k) { return map[k]; }).filter(function (r) { return !r.company || r.company === STATE.company; });
    }

    function uniquePieces() {
        var all = [];
        uniqueRecords().forEach(function (rec) {
            (rec.pieces || []).forEach(function (p) {
                var copy = Object.assign({}, p);
                copy.recordUploadedAt = rec.uploadedAt || p.uploadedAt || '';
                all.push(copy);
            });
        });
        all.sort(function (a, b) { return new Date(b.recordUploadedAt || b.uploadedAt || 0) - new Date(a.recordUploadedAt || a.uploadedAt || 0); });

        var byHash = {};
        var byTypePeriod = {};
        var out = [];
        all.forEach(function (p) {
            if (p.fileHash && byHash[p.fileHash]) return;
            var key = [p.type, p.periodStart || '', p.periodEnd || ''].join('|');
            if (byTypePeriod[key]) return;
            if (p.fileHash) byHash[p.fileHash] = true;
            byTypePeriod[key] = true;
            out.push(p);
        });
        return out;
    }

    function filteredDaily(daily) {
        return (daily || []).filter(function (d) { return !hasDateFilter() || inDateRange(d.dateISO); });
    }

    function piecesForView() {
        return uniquePieces().filter(function (p) {
            return rangesOverlap(p.periodStart, p.periodEnd);
        });
    }

    function getAvailableMonths() {
        var map = {};
        uniquePieces().forEach(function (p) {
            var daily = [];
            if (p.type === 'store') daily = (p.parsed && p.parsed.daily) || [];
            if (p.type === 'live_video') daily = (p.parsed && p.parsed.daily) || [];
            if (p.type === 'product_card') daily = (p.parsed && p.parsed.daily) || [];
            daily.forEach(function (d) {
                if (d.dateISO) map[d.dateISO.slice(0, 7)] = true;
            });
            if (p.periodStart) map[p.periodStart.slice(0, 7)] = true;
        });
        return Object.keys(map).sort().reverse();
    }

    function applyLatestMonthIfNeeded(force) {
        var months = getAvailableMonths();
        if (!months.length) return;
        if (!force && (STATE.initializedDefaultMonth || hasDateFilter() || STATE.quickFilter || STATE.monthFilter)) return;

        var ym = months[0];
        var p = ym.split('-');
        var y = parseInt(p[0], 10), m = parseInt(p[1], 10);
        STATE.dateFrom = toISODate(new Date(y, m - 1, 1));
        STATE.dateTo = toISODate(new Date(y, m, 0));
        STATE.monthFilter = ym;
        STATE.quickFilter = '';
        STATE.initializedDefaultMonth = true;
    }

    function buildViewData() {
        applyLatestMonthIfNeeded(false);

        var pieces = piecesForView();
        var storeDaily = [];
        var liveDaily = [];
        var cardDaily = [];
        var productRows = [];
        var fileLabels = [];

        pieces.forEach(function (p) {
            fileLabels.push((p.typeLabel || p.type) + ': ' + (p.periodLabel || p.fileName));
            if (p.type === 'store') storeDaily = storeDaily.concat(filteredDaily(p.parsed && p.parsed.daily));
            if (p.type === 'live_video') liveDaily = liveDaily.concat(filteredDaily(p.parsed && p.parsed.daily));
            if (p.type === 'product_card') cardDaily = cardDaily.concat(filteredDaily(p.parsed && p.parsed.daily));
            if (p.type === 'product' && rangesOverlap(p.periodStart, p.periodEnd)) {
                productRows = productRows.concat((p.parsed && p.parsed.rows) || []);
            }
        });

        var storeGrouped = groupByDate(storeDaily, ['gmv','orders','customers','units','skuOrders','revenue','pageViews','visitors','productImpressions','productClicks','liveGmv','videoGmv']);
        var liveGrouped = groupByDate(liveDaily, ['liveGmv','liveSessions','liveSessionsWithGmv','units','orders','customers','views','avgWatchTime']);
        var cardGrouped = groupByDate(cardDaily, ['gmv','views','clicks','customers','skuOrders','viewers','cartClicks','cartUsers','contentGmv']);

        var dateMap = {};
        function ensure(dateISO) {
            if (!dateMap[dateISO]) dateMap[dateISO] = { dateISO: dateISO, date: displayDate(dateISO), gmv: 0, orders: 0, customers: 0, units: 0, revenue: 0, visitors: 0, pageViews: 0, productClicks: 0, productImpressions: 0, liveGmv: 0, videoGmv: 0, cardGmv: 0, cardClicks: 0, cardViews: 0, liveViews: 0, liveSessions: 0 };
            return dateMap[dateISO];
        }

        storeGrouped.forEach(function (d) {
            var x = ensure(d.dateISO);
            x.gmv += d.gmv || 0;
            x.orders += d.orders || 0;
            x.customers += d.customers || 0;
            x.units += d.units || 0;
            x.revenue += d.revenue || 0;
            x.visitors += d.visitors || 0;
            x.pageViews += d.pageViews || 0;
            x.productClicks += d.productClicks || 0;
            x.productImpressions += d.productImpressions || 0;
            x.liveGmv += d.liveGmv || 0;
            x.videoGmv += d.videoGmv || 0;
        });

        liveGrouped.forEach(function (d) {
            var x = ensure(d.dateISO);
            if ((d.liveGmv || 0) > 0) x.liveGmv += d.liveGmv || 0;
            x.liveViews += d.views || 0;
            x.liveSessions += d.liveSessions || 0;
        });

        cardGrouped.forEach(function (d) {
            var x = ensure(d.dateISO);
            x.cardGmv += d.gmv || 0;
            x.cardClicks += d.clicks || 0;
            x.cardViews += d.views || 0;
        });

        var daily = Object.keys(dateMap).map(function (k) {
            var d = dateMap[k];
            d.conversionRate = d.visitors > 0 ? (d.customers / d.visitors) * 100 : (d.productClicks > 0 ? (d.orders / d.productClicks) * 100 : 0);
            d.aov = d.orders > 0 ? d.gmv / d.orders : 0;
            return d;
        }).sort(function (a, b) { return String(a.dateISO).localeCompare(String(b.dateISO)); });

        var products = aggregateProducts(productRows);

        var gmv = sum(daily, 'gmv');
        var orders = sum(daily, 'orders');
        var customers = sum(daily, 'customers');
        var units = sum(daily, 'units');
        var revenue = sum(daily, 'revenue');
        var visitors = sum(daily, 'visitors');
        var pageViews = sum(daily, 'pageViews');
        var productClicks = sum(daily, 'productClicks');
        var productImpressions = sum(daily, 'productImpressions');

        if (gmv === 0 && products.length) gmv = sum(products, 'gmv');
        if (orders === 0 && products.length) orders = sum(products, 'orders');
        if (units === 0 && products.length) units = sum(products, 'units');

        var liveGmv = sum(daily, 'liveGmv');
        var videoGmv = sum(daily, 'videoGmv');
        var cardGmv = sum(daily, 'cardGmv');

        var productStoreGmv = sum(products, 'storeGmv');
        var productLiveGmv = sum(products, 'liveGmv');
        var productVideoGmv = sum(products, 'videoGmv');
        var productCardGmv = sum(products, 'cardGmv');

        if (liveGmv === 0) liveGmv = productLiveGmv;
        if (videoGmv === 0) videoGmv = productVideoGmv;
        if (cardGmv === 0) cardGmv = productCardGmv;

        var storeSourceGmv = productStoreGmv > 0 ? productStoreGmv : Math.max(0, gmv - liveGmv - videoGmv);
        var sourceGroups = [
            { key: 'Cửa hàng', gmv: storeSourceGmv, orders: 0 },
            { key: 'LIVE', gmv: liveGmv, orders: sum(liveDaily, 'orders') },
            { key: 'Video', gmv: videoGmv, orders: 0 },
            { key: 'Thẻ sản phẩm', gmv: cardGmv, orders: sum(cardDaily, 'skuOrders') }
        ].filter(function (x) { return (x.gmv || 0) > 0 || (x.orders || 0) > 0; });

        var metrics = {
            gmv: gmv,
            revenue: revenue,
            orders: orders,
            customers: customers,
            units: units,
            visitors: visitors,
            pageViews: pageViews,
            productClicks: productClicks,
            productImpressions: productImpressions,
            conversionRate: visitors > 0 ? (customers / visitors) * 100 : (productClicks > 0 ? (orders / productClicks) * 100 : 0),
            clickRate: productImpressions > 0 ? (productClicks / productImpressions) * 100 : 0,
            aov: orders > 0 ? gmv / orders : 0,
            liveGmv: liveGmv,
            videoGmv: videoGmv,
            cardGmv: cardGmv,
            liveViews: sum(daily, 'liveViews'),
            liveSessions: sum(daily, 'liveSessions'),
            cardViews: sum(daily, 'cardViews'),
            cardClicks: sum(daily, 'cardClicks')
        };

        return {
            pieces: pieces,
            fileLabels: fileLabels,
            daily: daily,
            products: products,
            sourceGroups: sourceGroups,
            metrics: metrics,
            filterLabel: hasDateFilter() ? ((STATE.dateFrom ? displayDate(STATE.dateFrom) : 'đầu kỳ') + ' → ' + (STATE.dateTo ? displayDate(STATE.dateTo) : 'cuối kỳ')) : 'Toàn kỳ'
        };
    }

    function isDeleteAllowed() {
        if (window.myIdentity === 'SUPER_ADMIN') return true;
        if (!window.SYS_DB_USERS || !window.myIdentity) return false;
        for (var k in window.SYS_DB_USERS) {
            if (!Object.prototype.hasOwnProperty.call(window.SYS_DB_USERS, k)) continue;
            var u = window.SYS_DB_USERS[k] || {};
            if (u.name === window.myIdentity && (u.role === 'admin' || u.role === 'boss')) return true;
        }
        return false;
    }

    function injectStyle() {
        if (document.getElementById('tiktok-dashboard-style')) return;
        var style = document.createElement('style');
        style.id = 'tiktok-dashboard-style';
        style.textContent = `
            .tt-shell { font-family:'Segoe UI', Arial, 'Helvetica Neue', Tahoma, sans-serif !important; color:#0f172a; }
            .tt-hero { background: radial-gradient(circle at 10% 10%, rgba(236,72,153,.16), transparent 28%), linear-gradient(135deg,#fff,#fdf2f8 45%,#f8fafc); border:1px solid #fbcfe8; border-radius:26px; padding:18px; margin-bottom:14px; box-shadow:0 14px 34px rgba(15,23,42,.06); }
            .tt-hero-top { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
            .tt-title { margin:0; font-size:24px; line-height:1.15; color:#0f172a; font-weight:950; letter-spacing:-.04em; }
            .tt-sub { color:#64748b; font-size:13px; line-height:1.6; margin-top:6px; max-width:880px; }
            .tt-badge { background:#fdf2f8; border:1px solid #fbcfe8; color:#be185d; border-radius:999px; padding:7px 11px; font-size:11px; font-weight:900; }
            .tt-toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:14px; }
            .tt-select,.tt-input { border:1px solid #e2e8f0; background:#fff; border-radius:12px; padding:10px 12px; outline:none; font-weight:500; color:#334155; min-height:40px; font-family:'Segoe UI',Arial,sans-serif !important; }
            .tt-filter-label { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e2e8f0; border-radius:999px; padding:5px 8px 5px 10px; color:#64748b; font-size:11px; font-weight:500; }
            .tt-filter-label input { border:0 !important; box-shadow:none !important; padding:4px 2px !important; min-height:28px !important; min-width:118px !important; background:transparent !important; color:#334155 !important; font-weight:400 !important; font-family:'Segoe UI',Arial,sans-serif !important; }
            .tt-btn,.tt-upload-btn { border:none; border-radius:999px; padding:10px 14px; cursor:pointer; font-family:'Segoe UI',Arial,sans-serif !important; font-weight:800; transition:.16s ease; }
            .tt-btn { background:#fff; color:#be185d; border:1px solid #fbcfe8; }
            .tt-btn:hover { background:#fdf2f8; transform:translateY(-1px); }
            .tt-upload-btn { background:linear-gradient(135deg,#ec4899,#be185d); color:#fff; box-shadow:0 10px 22px rgba(236,72,153,.25); }
            .tt-upload-btn:hover { transform:translateY(-1px); box-shadow:0 12px 26px rgba(236,72,153,.30); }
            .tt-kpis { display:grid; grid-template-columns:repeat(7,minmax(140px,1fr)); gap:12px; margin-bottom:14px; }
            .tt-kpi { position:relative; overflow:hidden; background:linear-gradient(180deg,#fff,#fff7fb); border:1px solid #e2e8f0; border-radius:20px; padding:14px 16px; min-height:112px; cursor:pointer; box-shadow:0 8px 18px rgba(15,23,42,.035); transition:.16s ease; }
            .tt-kpi:hover { transform:translateY(-3px); border-color:#f9a8d4; box-shadow:0 12px 26px rgba(236,72,153,.12); }
            .tt-kpi:before { content:''; position:absolute; left:0; top:0; height:4px; width:100%; background:#f472b6; }
            .tt-kpi span { display:block; color:#64748b; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.04em; }
            .tt-kpi strong { display:block; color:#0f172a; font-size:20px; margin-top:8px; line-height:1.15; }
            .tt-kpi small { display:block; color:#64748b; margin-top:7px; font-weight:700; line-height:1.35; }
            .tt-grid { display:grid; grid-template-columns:1.25fr .75fr; gap:14px; margin-bottom:14px; }
            .tt-card { background:#fff; border:1px solid #e2e8f0; border-radius:22px; padding:16px; box-shadow:0 8px 22px rgba(15,23,42,.04); }
            .tt-card-title { font-weight:950; color:#0f172a; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
            .tt-muted { color:#64748b; font-size:12px; font-weight:600; }
            .tt-chart-box { height:330px; position:relative; }
            .tt-table-wrap { width:100%; overflow:auto; border:1px solid #e2e8f0; border-radius:16px; background:#fff; }
            .tt-table { width:100%; border-collapse:separate; border-spacing:0; min-width:900px; }
            .tt-table th { position:sticky; top:0; z-index:3; background:#fdf2f8 !important; color:#9d174d !important; padding:11px; font-size:11px; text-transform:uppercase; border-bottom:1px solid #fbcfe8; text-align:left; }
            .tt-table td { padding:10px 11px; border-bottom:1px solid #f1f5f9; color:#0f172a; background:#fff; }
            .tt-table tr:hover td { background:#fdf2f8 !important; }
            .tt-right { text-align:right; }
            .tt-center { text-align:center; }
            .tt-row-click { cursor:pointer; }
            .tt-history-list { display:flex; flex-direction:column; gap:9px; max-height:360px; overflow:auto; }
            .tt-history-item { border:1px solid #e2e8f0; border-radius:16px; padding:11px; background:#fff; cursor:pointer; display:flex; justify-content:space-between; gap:10px; align-items:center; }
            .tt-history-item:hover { border-color:#f9a8d4; background:#fdf2f8; }
            .tt-delete-btn { border:none; background:#fee2e2; color:#dc2626; border-radius:999px; padding:6px 10px; font-size:10px; font-weight:950; cursor:pointer; margin-top:5px; }
            .tt-delete-btn:hover { background:#dc2626; color:#fff; }
            .tt-empty { padding:22px; color:#64748b; text-align:center; font-weight:700; border:1px dashed #e2e8f0; border-radius:18px; background:#fff; }
            .tt-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:100006; display:flex; align-items:center; justify-content:center; padding:18px; }
            .tt-modal { width:min(1000px,96vw); max-height:90vh; overflow:auto; background:#fff; border-radius:24px; box-shadow:0 28px 80px rgba(15,23,42,.30); }
            .tt-modal-head { position:sticky; top:0; z-index:2; background:#fff; border-bottom:1px solid #e2e8f0; padding:16px 18px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
            .tt-modal-head h3 { margin:0; color:#0f172a; font-size:18px; }
            .tt-modal-close { border:none; background:#f1f5f9; border-radius:999px; width:36px; height:36px; cursor:pointer; font-size:22px; }
            .tt-modal-body { padding:18px; }
            .tt-detail-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
            .tt-detail { border:1px solid #e2e8f0; border-radius:16px; padding:12px; background:#fff; }
            .tt-detail span { display:block; color:#64748b; font-size:11px; font-weight:900; text-transform:uppercase; }
            .tt-detail strong { display:block; color:#0f172a; margin-top:5px; font-size:16px; }
            @media(max-width:1380px){ .tt-kpis{grid-template-columns:repeat(4,minmax(0,1fr));} .tt-grid{grid-template-columns:1fr;} }
            @media(max-width:980px){ .tt-kpis{grid-template-columns:repeat(2,minmax(0,1fr));} .tt-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
            @media(max-width:720px){ .tt-kpis,.tt-detail-grid{grid-template-columns:1fr;} .tt-toolbar>*{width:100%;} .tt-chart-box{height:280px;} .tt-modal{width:100vw; max-height:94vh; border-radius:18px;} }
        `;
        document.head.appendChild(style);
    }

    function renderBase() {
        injectStyle();
        var box = getContainer();
        if (!box) return;

        var companies = COMPANIES.map(function (c) {
            return '<option value="' + c.id + '" ' + (c.id === STATE.company ? 'selected' : '') + '>' + c.name + '</option>';
        }).join('');

        var months = getAvailableMonths().map(function (m) {
            return '<option value="' + m + '" ' + (STATE.monthFilter === m ? 'selected' : '') + '>' + monthLabel(m) + '</option>';
        }).join('');

        box.innerHTML = `
            <div class="tt-shell">
                <section class="tt-hero">
                    <div class="tt-hero-top">
                        <div>
                            <h2 class="tt-title">🎵 Dashboard TikTok Shop</h2>
                            <div class="tt-sub">Tải 1 hoặc nhiều file: <b>Phân tích cửa hàng</b>, <b>Phân tích Live &amp; Video</b>, <b>Thẻ sản phẩm</b>, <b>Phân tích sản phẩm</b>. Dữ liệu sản phẩm được gom theo <b>ID sản phẩm</b>.</div>
                        </div>
                        <span class="tt-badge">${TIKTOK_VERSION}</span>
                    </div>
                    <div class="tt-toolbar">
                        <select id="tt-company" class="tt-select" onchange="window.changeTiktokCompany(this.value)">${companies}</select>
                        <select id="tt-quick-filter" class="tt-select" onchange="window.applyTiktokQuickFilter(this.value)">
                            <option value="">Chọn kỳ</option>
                            <option value="this_week" ${STATE.quickFilter === 'this_week' ? 'selected' : ''}>Tuần này</option>
                            <option value="last_week" ${STATE.quickFilter === 'last_week' ? 'selected' : ''}>Tuần trước</option>
                            <option value="this_month" ${STATE.quickFilter === 'this_month' ? 'selected' : ''}>Tháng này</option>
                            <option value="last_month" ${STATE.quickFilter === 'last_month' ? 'selected' : ''}>Tháng trước</option>
                            <option value="all" ${STATE.quickFilter === 'all' ? 'selected' : ''}>Toàn kỳ</option>
                        </select>
                        <select id="tt-month-filter" class="tt-select" onchange="window.applyTiktokMonthFilter(this.value)">
                            <option value="">Chọn tháng</option>
                            ${months}
                        </select>
                        <label class="tt-filter-label">Từ <input id="tt-date-from" type="date" value="${escapeHtml(STATE.dateFrom)}" onkeydown="if(event.key==='Enter') window.applyTiktokDateFilter()" /></label>
                        <label class="tt-filter-label">Đến <input id="tt-date-to" type="date" value="${escapeHtml(STATE.dateTo)}" onkeydown="if(event.key==='Enter') window.applyTiktokDateFilter()" /></label>
                        <button class="tt-btn" onclick="window.applyTiktokDateFilter()">Lọc</button>
                        <button class="tt-btn" onclick="window.clearTiktokFilter()">Xóa lọc</button>
                        <button class="tt-upload-btn" onclick="document.getElementById('tt-file-input').click()">Tải file TikTok Shop</button>
                        <input type="file" id="tt-file-input" multiple accept=".xlsx,.xls,.csv" style="display:none" />
                    </div>
                </section>

                <div id="tt-dashboard-area"><div class="tt-empty">Chưa có dữ liệu. Hãy tải file TikTok Shop hoặc chọn lịch sử đã lưu.</div></div>
            </div>
        `;

        var input = document.getElementById('tt-file-input');
        if (input) input.addEventListener('change', handleUpload);
        renderDashboard();
    }

    function renderDashboard() {
        var area = document.getElementById('tt-dashboard-area');
        if (!area) return;

        var records = uniqueRecords();
        if (!records.length) {
            area.innerHTML = '<div class="tt-empty">Chưa có dữ liệu TikTok Shop. Có thể tải 1 file hoặc nhiều file cùng lúc.</div>';
            return;
        }

        var view = buildViewData();
        var m = view.metrics;
        var label = view.filterLabel || 'Toàn kỳ';

        area.innerHTML = `
            <div class="tt-kpis">
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('gmv')"><span>GMV</span><strong>${fmtMoney(m.gmv)}</strong><small>${label}</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('orders')"><span>Đơn hàng</span><strong>${fmtNum(m.orders,0)}</strong><small>Số món bán ra: ${fmtNum(m.units,0)}</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('customers')"><span>Khách hàng</span><strong>${fmtNum(m.customers,0)}</strong><small>Khách truy cập: ${fmtNum(m.visitors,0)}</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('conversion')"><span>Chuyển đổi</span><strong>${fmtPct(m.conversionRate)}</strong><small>Khách hàng / Khách truy cập</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('aov')"><span>AOV</span><strong>${m.aov ? fmtMoney(m.aov) : '-'}</strong><small>GMV / Đơn hàng</small></div>
                <div class="tt-kpi" onclick="window.showTiktokSourceDetail('LIVE')"><span>GMV LIVE</span><strong>${fmtMoney(m.liveGmv)}</strong><small>Phiên LIVE: ${fmtNum(m.liveSessions,0)}</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('sources')"><span>GMV nguồn</span><strong>${fmtMoney(m.videoGmv + m.cardGmv)}</strong><small>Video + Thẻ sản phẩm</small></div>
            </div>

            <div class="tt-grid">
                <section class="tt-card"><div class="tt-card-title">📈 GMV & Đơn hàng theo ngày</div><div class="tt-chart-box"><canvas id="tt-daily-chart"></canvas></div></section>
                <section class="tt-card"><div class="tt-card-title">🥧 GMV theo nguồn</div><div class="tt-chart-box"><canvas id="tt-source-chart"></canvas></div></section>
            </div>

            <div class="tt-grid">
                <section class="tt-card"><div class="tt-card-title">🏆 Top sản phẩm theo ID <span class="tt-muted">Bấm cột để xem chi tiết</span></div><div class="tt-chart-box"><canvas id="tt-product-chart"></canvas></div></section>
                <section class="tt-card"><div class="tt-card-title">📁 Lịch sử tải file</div><div class="tt-history-list" id="tt-history-list"></div></section>
            </div>

            <section class="tt-card" style="margin-bottom:14px;">
                <div class="tt-card-title">📦 Thống kê theo sản phẩm / ID <input class="tt-input" style="max-width:330px;" placeholder="Tìm ID hoặc tên sản phẩm" oninput="window.searchTiktokProduct(this.value)" value="${escapeHtml(STATE.productSearch)}" /></div>
                <div class="tt-table-wrap"><table class="tt-table"><thead><tr><th>ID</th><th>Sản phẩm</th><th>Trạng thái</th><th class="tt-right">GMV</th><th class="tt-center">Đơn</th><th class="tt-center">Số món</th><th class="tt-right">Cửa hàng</th><th class="tt-right">LIVE</th><th class="tt-right">Video</th><th class="tt-right">Thẻ sản phẩm</th></tr></thead><tbody id="tt-product-tbody"></tbody></table></div>
            </section>

            <section class="tt-card">
                <div class="tt-card-title">📅 Dữ liệu theo ngày</div>
                <div class="tt-table-wrap"><table class="tt-table"><thead><tr><th>Ngày</th><th class="tt-right">GMV</th><th class="tt-center">Đơn</th><th class="tt-center">Khách</th><th class="tt-center">Số món</th><th class="tt-center">Truy cập</th><th class="tt-center">Chuyển đổi</th><th class="tt-right">LIVE</th><th class="tt-right">Video</th><th class="tt-right">Thẻ SP</th></tr></thead><tbody id="tt-daily-tbody"></tbody></table></div>
            </section>
        `;

        renderHistoryList();
        renderTables(view);
        drawCharts(view);
    }

    function renderTables(view) {
        var products = (view.products || []).slice(0);
        var q = (STATE.productSearch || '').toLowerCase().trim();
        if (q) {
            products = products.filter(function (p) {
                return safeText(p.id).toLowerCase().indexOf(q) !== -1 ||
                       safeText(p.productName).toLowerCase().indexOf(q) !== -1 ||
                       (p.aliases || []).join(' ').toLowerCase().indexOf(q) !== -1;
            });
        }

        var pBody = document.getElementById('tt-product-tbody');
        if (pBody) {
            pBody.innerHTML = products.slice(0, 80).map(function (p) {
                return `<tr class="tt-row-click" onclick="window.showTiktokProductDetail('${escapeHtml(p.id)}')">
                    <td><b>${escapeHtml(p.id)}</b></td>
                    <td><b>${escapeHtml(p.productName)}</b></td>
                    <td>${escapeHtml(p.status || '')}</td>
                    <td class="tt-right"><b>${fmtMoney(p.gmv)}</b></td>
                    <td class="tt-center">${fmtNum(p.orders,0)}</td>
                    <td class="tt-center">${fmtNum(p.units,0)}</td>
                    <td class="tt-right">${fmtMoney(p.storeGmv)}</td>
                    <td class="tt-right">${fmtMoney(p.liveGmv)}</td>
                    <td class="tt-right">${fmtMoney(p.videoGmv)}</td>
                    <td class="tt-right">${fmtMoney(p.cardGmv)}</td>
                </tr>`;
            }).join('') || '<tr><td colspan="10" class="tt-center">Không có dữ liệu sản phẩm phù hợp.</td></tr>';
        }

        var dBody = document.getElementById('tt-daily-tbody');
        if (dBody) {
            dBody.innerHTML = (view.daily || []).map(function (d) {
                return `<tr class="tt-row-click" onclick="window.showTiktokDailyDetail('${escapeHtml(d.dateISO)}')">
                    <td><b>${escapeHtml(d.date)}</b></td>
                    <td class="tt-right"><b>${fmtMoney(d.gmv)}</b></td>
                    <td class="tt-center">${fmtNum(d.orders,0)}</td>
                    <td class="tt-center">${fmtNum(d.customers,0)}</td>
                    <td class="tt-center">${fmtNum(d.units,0)}</td>
                    <td class="tt-center">${fmtNum(d.visitors,0)}</td>
                    <td class="tt-center">${fmtPct(d.conversionRate)}</td>
                    <td class="tt-right">${fmtMoney(d.liveGmv)}</td>
                    <td class="tt-right">${fmtMoney(d.videoGmv)}</td>
                    <td class="tt-right">${fmtMoney(d.cardGmv)}</td>
                </tr>`;
            }).join('') || '<tr><td colspan="10" class="tt-center">Không có dữ liệu theo ngày phù hợp.</td></tr>';
        }
    }

    function destroyChart(key) {
        if (STATE.charts[key]) {
            try { STATE.charts[key].destroy(); } catch (e) {}
            STATE.charts[key] = null;
        }
    }

    function drawCharts(view) {
        if (typeof Chart === 'undefined') return;
        drawDailyChart(view);
        drawSourceChart(view);
        drawProductChart(view);
    }

    function drawDailyChart(view) {
        destroyChart('daily');
        var ctx = document.getElementById('tt-daily-chart');
        if (!ctx) return;
        var daily = view.daily || [];
        STATE.charts.daily = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: daily.map(function (d) { return d.date; }),
                datasets: [
                    { label: 'GMV', data: daily.map(function (d) { return d.gmv; }), yAxisID: 'y' },
                    { label: 'Đơn hàng', data: daily.map(function (d) { return d.orders; }), type: 'line', yAxisID: 'y1', borderWidth: 3, tension: .25 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                onClick: function (evt, els) { if (els && els.length) { var d = daily[els[0].index]; if (d) window.showTiktokDailyDetail(d.dateISO); } },
                scales: { y: { beginAtZero: true }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } } }
            }
        });
    }

    function drawSourceChart(view) {
        destroyChart('source');
        var ctx = document.getElementById('tt-source-chart');
        if (!ctx) return;
        var sources = (view.sourceGroups || []).filter(function (x) { return (x.gmv || 0) > 0; });
        if (!sources.length) sources = [{ key: 'Chưa có dữ liệu', gmv: 1 }];
        STATE.charts.source = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: sources.map(function (s) { return s.key; }), datasets: [{ data: sources.map(function (s) { return s.gmv; }) }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: function (evt, els) { if (els && els.length) { var s = sources[els[0].index]; if (s) window.showTiktokSourceDetail(s.key); } },
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    function drawProductChart(view) {
        destroyChart('product');
        var ctx = document.getElementById('tt-product-chart');
        if (!ctx) return;
        var products = (view.products || []).filter(function (p) { return (p.gmv || 0) > 0; }).slice(0, 10).reverse();
        STATE.charts.product = new Chart(ctx, {
            type: 'bar',
            data: { labels: products.map(function (p) { return p.id; }), datasets: [{ label: 'GMV', data: products.map(function (p) { return p.gmv; }) }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                onClick: function (evt, els) { if (els && els.length) { var p = products[els[0].index]; if (p) window.showTiktokProductDetail(p.id); } },
                plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: function (ctx) { var p = products[ctx.dataIndex]; return p ? ['Sản phẩm: ' + p.productName, 'Bấm để xem chi tiết'] : ''; } } } },
                scales: { x: { beginAtZero: true } }
            }
        });
    }

    function detailGrid(items) {
        return '<div class="tt-detail-grid">' + items.map(function (it) {
            return '<div class="tt-detail"><span>' + escapeHtml(it[0]) + '</span><strong>' + it[1] + '</strong></div>';
        }).join('') + '</div>';
    }

    function tableHtml(headers, rows) {
        return '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + (rows.join('') || '<tr><td colspan="' + headers.length + '" class="tt-center">Không có dữ liệu.</td></tr>') + '</tbody></table></div>';
    }

    function showModal(title, body) {
        var old = document.getElementById('tt-modal-overlay');
        if (old) old.remove();
        document.body.insertAdjacentHTML('beforeend', '<div class="tt-modal-overlay" id="tt-modal-overlay" onclick="window.closeTiktokModal(event)"><div class="tt-modal" onclick="event.stopPropagation()"><div class="tt-modal-head"><h3>' + title + '</h3><button class="tt-modal-close" onclick="window.closeTiktokModal()">&times;</button></div><div class="tt-modal-body">' + body + '</div></div></div>');
    }

    window.closeTiktokModal = function (e) {
        var m = document.getElementById('tt-modal-overlay');
        if (m && (!e || e.target === m)) m.remove();
    };

    window.showTiktokKpiDetail = function (kind) {
        var view = buildViewData();
        var m = view.metrics;
        var titleMap = {
            gmv: 'Chi tiết GMV',
            orders: 'Chi tiết đơn hàng',
            customers: 'Chi tiết khách hàng',
            conversion: 'Chi tiết tỷ lệ chuyển đổi',
            aov: 'Chi tiết AOV',
            sources: 'Chi tiết nguồn GMV'
        };
        var body = '';
        if (kind === 'gmv') body += detailGrid([['GMV', fmtMoney(m.gmv)], ['Tổng doanh thu', fmtMoney(m.revenue)], ['Đơn hàng', fmtNum(m.orders,0)], ['AOV', m.aov ? fmtMoney(m.aov) : '-']]);
        else if (kind === 'orders') body += detailGrid([['Đơn hàng', fmtNum(m.orders,0)], ['Số món bán ra', fmtNum(m.units,0)], ['Đơn hàng SKU', fmtNum(m.orders,0)], ['GMV', fmtMoney(m.gmv)]]);
        else if (kind === 'customers') body += detailGrid([['Khách hàng', fmtNum(m.customers,0)], ['Khách truy cập', fmtNum(m.visitors,0)], ['Lượt xem trang', fmtNum(m.pageViews,0)], ['Lượt nhấp sản phẩm', fmtNum(m.productClicks,0)]]);
        else if (kind === 'conversion') body += detailGrid([['Chuyển đổi', fmtPct(m.conversionRate)], ['Khách hàng', fmtNum(m.customers,0)], ['Khách truy cập', fmtNum(m.visitors,0)], ['Tỷ lệ nhấp sản phẩm', fmtPct(m.clickRate)]]);
        else if (kind === 'aov') body += detailGrid([['AOV', m.aov ? fmtMoney(m.aov) : '-'], ['GMV', fmtMoney(m.gmv)], ['Đơn hàng', fmtNum(m.orders,0)], ['Số món bán ra', fmtNum(m.units,0)]]);
        else if (kind === 'sources') body += buildSourceTable(view);
        if (kind !== 'sources') body += buildDailyTable(view.daily);
        showModal(titleMap[kind] || 'Chi tiết', body);
    };

    function buildDailyTable(daily) {
        return tableHtml(['Ngày','GMV','Đơn','Khách','Số món','Truy cập','Chuyển đổi'], (daily || []).map(function (d) {
            return '<tr><td><b>' + escapeHtml(d.date) + '</b></td><td class="tt-right"><b>' + fmtMoney(d.gmv) + '</b></td><td class="tt-center">' + fmtNum(d.orders,0) + '</td><td class="tt-center">' + fmtNum(d.customers,0) + '</td><td class="tt-center">' + fmtNum(d.units,0) + '</td><td class="tt-center">' + fmtNum(d.visitors,0) + '</td><td class="tt-center">' + fmtPct(d.conversionRate) + '</td></tr>';
        }));
    }

    function buildSourceTable(view) {
        return tableHtml(['Nguồn','GMV','Đơn/ghi nhận','Tỷ trọng'], (view.sourceGroups || []).map(function (s) {
            var pct = view.metrics.gmv > 0 ? (s.gmv / view.metrics.gmv) * 100 : 0;
            return '<tr><td><b>' + escapeHtml(s.key) + '</b></td><td class="tt-right"><b>' + fmtMoney(s.gmv) + '</b></td><td class="tt-center">' + fmtNum(s.orders || 0,0) + '</td><td class="tt-center">' + fmtPct(pct) + '</td></tr>';
        }));
    }

    window.showTiktokSourceDetail = function (sourceKey) {
        var view = buildViewData();
        var body = buildSourceTable(view);
        var products = (view.products || []).filter(function (p) {
            if (sourceKey === 'Cửa hàng') return (p.storeGmv || 0) > 0;
            if (sourceKey === 'LIVE') return (p.liveGmv || 0) > 0;
            if (sourceKey === 'Video') return (p.videoGmv || 0) > 0;
            if (sourceKey === 'Thẻ sản phẩm') return (p.cardGmv || 0) > 0;
            return false;
        }).slice(0, 30);
        body += tableHtml(['ID','Sản phẩm','GMV nguồn','Tổng GMV'], products.map(function (p) {
            var sourceGmv = sourceKey === 'Cửa hàng' ? p.storeGmv : (sourceKey === 'LIVE' ? p.liveGmv : (sourceKey === 'Video' ? p.videoGmv : p.cardGmv));
            return '<tr><td><b>' + escapeHtml(p.id) + '</b></td><td>' + escapeHtml(p.productName) + '</td><td class="tt-right"><b>' + fmtMoney(sourceGmv) + '</b></td><td class="tt-right">' + fmtMoney(p.gmv) + '</td></tr>';
        }));
        showModal('Chi tiết nguồn: ' + escapeHtml(sourceKey), body);
    };

    window.showTiktokProductDetail = function (id) {
        var view = buildViewData();
        var p = (view.products || []).find(function (x) { return String(x.id) === String(id); });
        if (!p) return;
        var body = detailGrid([['ID sản phẩm', escapeHtml(p.id)], ['GMV', fmtMoney(p.gmv)], ['Đơn hàng', fmtNum(p.orders,0)], ['Số món bán ra', fmtNum(p.units,0)]])
            + '<div class="tt-card" style="margin-bottom:14px;"><div class="tt-card-title">Tên sản phẩm</div><div style="font-weight:800;color:#0f172a;line-height:1.5;">' + escapeHtml(p.productName) + '</div></div>'
            + tableHtml(['Nguồn','GMV','Hiển thị','Lượt xem','Khách hàng'], (p.sources || []).map(function (s) {
                return '<tr><td><b>' + escapeHtml(s.key) + '</b></td><td class="tt-right"><b>' + fmtMoney(s.gmv) + '</b></td><td class="tt-center">' + fmtNum(s.impressions,0) + '</td><td class="tt-center">' + fmtNum(s.views,0) + '</td><td class="tt-center">' + fmtNum(s.customers,0) + '</td></tr>';
            }))
            + (p.aliases && p.aliases.length > 1 ? '<div class="tt-card" style="margin-top:14px;"><div class="tt-card-title">Tên sản phẩm từng xuất hiện</div>' + p.aliases.map(function (name) { return '<div class="tt-muted">• ' + escapeHtml(name) + '</div>'; }).join('') + '</div>' : '');
        showModal('Chi tiết sản phẩm: ' + escapeHtml(p.id), body);
    };

    window.showTiktokDailyDetail = function (dateISO) {
        var view = buildViewData();
        var d = (view.daily || []).find(function (x) { return x.dateISO === dateISO; });
        if (!d) return;
        var body = detailGrid([['Ngày', displayDate(dateISO)], ['GMV', fmtMoney(d.gmv)], ['Đơn hàng', fmtNum(d.orders,0)], ['Chuyển đổi', fmtPct(d.conversionRate)], ['LIVE', fmtMoney(d.liveGmv)], ['Video', fmtMoney(d.videoGmv)], ['Thẻ sản phẩm', fmtMoney(d.cardGmv)], ['Lượt truy cập', fmtNum(d.visitors,0)]]);
        showModal('Chi tiết ngày ' + displayDate(dateISO), body);
    };

    function renderHistoryList() {
        var box = document.getElementById('tt-history-list');
        if (!box) return;
        var list = uniqueRecords().sort(function (a, b) { return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0); });
        if (!list.length) {
            box.innerHTML = '<div class="tt-empty">Chưa có lịch sử tải file.</div>';
            return;
        }
        var canDelete = isDeleteAllowed();
        box.innerHTML = list.slice(0, 40).map(function (r) {
            var types = (r.pieces || []).map(function (p) { return p.typeLabel || TYPE_LABELS[p.type] || p.type; }).join(', ');
            var del = canDelete ? `<button class="tt-delete-btn" onclick="event.stopPropagation(); window.deleteTiktokBatch('${escapeHtml(r.batchId || r.bundleKey)}')">Xóa</button>` : '';
            return `<div class="tt-history-item" onclick="window.selectTiktokBatch('${escapeHtml(r.batchId || r.bundleKey)}')">
                <div><b>${escapeHtml(types || 'File TikTok Shop')}</b><div class="tt-muted">${escapeHtml(r.periodLabel || '')} • ${escapeHtml(r.uploader || '')}</div></div>
                <div style="text-align:right;"><b>${fmtNum((r.pieces || []).length,0)} file</b><div class="tt-muted">${r.uploadedAt ? new Date(r.uploadedAt).toLocaleString('vi-VN') : ''}</div>${del}</div>
            </div>`;
        }).join('');
    }

    window.selectTiktokBatch = function (batchId) {
        var found = (STATE.history || []).find(function (r) { return String(r.batchId || r.bundleKey) === String(batchId); });
        if (found) {
            STATE.current = found;
            STATE.dateFrom = '';
            STATE.dateTo = '';
            STATE.quickFilter = '';
            STATE.monthFilter = '';
            renderBase();
        }
    };

    window.deleteTiktokBatch = function (batchId) {
        if (!isDeleteAllowed()) { toast('Bạn không có quyền xóa file TikTok Shop.', 'error'); return; }
        var found = (STATE.history || []).find(function (r) { return String(r.batchId || r.bundleKey) === String(batchId); });
        if (!found) return;
        if (!confirm('Xóa bộ file TikTok Shop đã tải lên?')) return;
        var db = getDb();
        if (!db) { toast('Không kết nối được Firebase.', 'error'); return; }
        var updates = {};
        updates['/tiktok_shop_stats_logs/' + (found.batchId || found.bundleKey)] = null;
        if (STATE.current && String(STATE.current.batchId || STATE.current.bundleKey) === String(batchId)) {
            var next = (STATE.history || []).filter(function (r) { return String(r.batchId || r.bundleKey) !== String(batchId); })[0] || null;
            updates['/tiktok_shop_stats_latest/' + STATE.company] = next || null;
        }
        db.ref().update(updates).then(function () {
            STATE.history = (STATE.history || []).filter(function (r) { return String(r.batchId || r.bundleKey) !== String(batchId); });
            if (STATE.current && String(STATE.current.batchId || STATE.current.bundleKey) === String(batchId)) STATE.current = STATE.history[0] || null;
            renderBase();
            toast('Đã xóa file TikTok Shop.', 'success');
        }).catch(function (e) { toast('Lỗi xóa file: ' + e.message, 'error'); });
    };

    async function handleUpload(e) {
        var files = Array.from(e.target.files || []);
        if (!files.length) return;
        if (typeof XLSX === 'undefined') {
            toast('Thiếu thư viện XLSX. Hãy kiểm tra file HTML chính.', 'error');
            e.target.value = '';
            return;
        }

        try {
            toast('Đang đọc file TikTok Shop...', 'info');
            var pieces = [];
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var buffer = await readFileAsArrayBuffer(file);
                var fileHash = await hashBuffer(buffer);
                var workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
                var piece = parseWorkbookPiece(workbook, file.name, fileHash);
                pieces.push(piece);
            }

            if (!pieces.length) throw new Error('Không có file hợp lệ.');

            var bundleText = STATE.company + '|' + pieces.map(function (p) { return p.type + ':' + p.fileHash; }).sort().join('|');
            var bundleHash = await hashText(bundleText);
            var periodStart = minDate(pieces.map(function (p) { return p.periodStart; }));
            var periodEnd = maxDate(pieces.map(function (p) { return p.periodEnd; }));
            var uploadedAt = new Date().toISOString();

            pieces.forEach(function (p) { p.uploadedAt = uploadedAt; });

            var record = {
                version: TIKTOK_VERSION,
                company: STATE.company,
                uploader: window.myIdentity || 'Ẩn danh',
                uploadedAt: uploadedAt,
                bundleHash: bundleHash,
                bundleKey: STATE.company + '_' + bundleHash,
                batchId: STATE.company + '_' + bundleHash,
                fileNames: pieces.map(function (p) { return p.fileName; }),
                fileTypes: pieces.map(function (p) { return p.type; }),
                fileHashes: pieces.map(function (p) { return p.fileHash; }),
                periodStart: periodStart,
                periodEnd: periodEnd,
                periodLabel: periodStart && periodEnd ? (displayDate(periodStart) + ' - ' + displayDate(periodEnd)) : '',
                pieces: pieces
            };

            STATE.current = record;
            saveRecord(record);
            STATE.initializedDefaultMonth = false;
            applyLatestMonthIfNeeded(true);
            renderBase();
            toast('Đã ghi nhận dữ liệu TikTok Shop.', 'success');
        } catch (err) {
            console.error(err);
            toast('Lỗi đọc file TikTok Shop: ' + (err && err.message ? err.message : err), 'error');
        } finally {
            e.target.value = '';
        }
    }

    function saveRecord(record) {
        var db = getDb();
        if (!db) return;
        var updates = {};
        updates['/tiktok_shop_stats_logs/' + record.batchId] = record;
        updates['/tiktok_shop_stats_latest/' + STATE.company] = record;
        db.ref().update(updates).catch(function (e) { console.warn('Không thể lưu Firebase TikTok Shop:', e); });
    }

    function loadHistory() {
        var db = getDb();
        if (!db) {
            renderBase();
            return;
        }
        db.ref('tiktok_shop_stats_logs').limitToLast(500).on('value', function (snapshot) {
            var raw = snapshot.val() || {};
            STATE.history = Object.keys(raw).map(function (key) {
                var item = raw[key] || {};
                item.batchId = item.batchId || key;
                return item;
            }).filter(function (x) {
                return !x.company || x.company === STATE.company;
            }).sort(function (a, b) {
                return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
            });

            if (!STATE.current && STATE.history.length) STATE.current = STATE.history[0];
            applyLatestMonthIfNeeded(false);
            renderBase();
        });
    }

    function loadLatest() {
        var db = getDb();
        if (!db) return;
        db.ref('tiktok_shop_stats_latest/' + STATE.company).once('value').then(function (snapshot) {
            var val = snapshot.val();
            if (val) {
                STATE.current = val;
                renderBase();
            }
        }).catch(function () {});
    }

    window.changeTiktokCompany = function (companyId) {
        STATE.company = companyId || 'NNV';
        STATE.current = null;
        STATE.dateFrom = '';
        STATE.dateTo = '';
        STATE.quickFilter = '';
        STATE.monthFilter = '';
        STATE.productSearch = '';
        STATE.initializedDefaultMonth = false;
        loadLatest();
        loadHistory();
    };

    window.applyTiktokDateFilter = function () {
        var f = document.getElementById('tt-date-from');
        var t = document.getElementById('tt-date-to');
        STATE.dateFrom = f ? f.value : '';
        STATE.dateTo = t ? t.value : '';
        STATE.quickFilter = '';
        STATE.monthFilter = '';
        renderBase();
    };

    window.clearTiktokFilter = function () {
        STATE.dateFrom = '';
        STATE.dateTo = '';
        STATE.quickFilter = '';
        STATE.monthFilter = '';
        STATE.initializedDefaultMonth = false;
        applyLatestMonthIfNeeded(true);
        renderBase();
    };

    window.applyTiktokQuickFilter = function (mode) {
        STATE.quickFilter = mode || '';
        STATE.monthFilter = '';
        var now = new Date();
        var start, end;
        if (mode === 'this_week') {
            start = startOfWeekMonday(now); end = addDays(start, 6);
        } else if (mode === 'last_week') {
            end = addDays(startOfWeekMonday(now), -1); start = addDays(end, -6);
        } else if (mode === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (mode === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (mode === 'all') {
            STATE.dateFrom = ''; STATE.dateTo = ''; renderBase(); return;
        } else {
            renderBase(); return;
        }
        STATE.dateFrom = toISODate(start);
        STATE.dateTo = toISODate(end);
        renderBase();
    };

    window.applyTiktokMonthFilter = function (ym) {
        STATE.monthFilter = ym || '';
        STATE.quickFilter = '';
        if (!ym) { renderBase(); return; }
        var p = ym.split('-');
        var y = parseInt(p[0], 10), m = parseInt(p[1], 10);
        STATE.dateFrom = toISODate(new Date(y, m - 1, 1));
        STATE.dateTo = toISODate(new Date(y, m, 0));
        renderBase();
    };

    window.searchTiktokProduct = function (q) {
        STATE.productSearch = q || '';
        renderTables(buildViewData());
    };

    window.initTiktokShopDashboard = function () {
        renderBase();
        loadLatest();
        loadHistory();
    };
})();

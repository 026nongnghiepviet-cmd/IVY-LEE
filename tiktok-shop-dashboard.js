/**
 * TIKTOK SHOP DASHBOARD V1.1
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

    var TIKTOK_VERSION = 'TIKTOK_V2.7_NATIVE_4_FILES_PRODUCT_FIX';
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
        initializedDefaultMonth: false,
        historyRef: null,
        latestRef: null
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

    function companyKey(companyId) {
        return String(companyId || STATE.company || 'NNV').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    function companyLogsPath(companyId) {
        return 'tiktok_shop_stats_by_company/' + companyKey(companyId) + '/logs';
    }

    function companyLatestPath(companyId) {
        return 'tiktok_shop_stats_by_company/' + companyKey(companyId) + '/latest';
    }

    function detachCompanyListeners() {
        try {
            if (STATE.historyRef && typeof STATE.historyRef.off === 'function') STATE.historyRef.off();
        } catch (e) {}
        try {
            if (STATE.latestRef && typeof STATE.latestRef.off === 'function') STATE.latestRef.off();
        } catch (e) {}
        STATE.historyRef = null;
        STATE.latestRef = null;
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
            // Giữ cột xuất hiện đầu tiên để tránh bị ghi đè khi file TikTok có nhiều cột trùng tên như GMV, CTR, Đơn hàng SKU.
            if (key && map[norm(key)] === undefined) map[norm(key)] = i;
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
        if ((m = s.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[~\-]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/))) {
            return { start: normalizeDate(m[1]), end: normalizeDate(m[2]), label: displayDate(normalizeDate(m[1])) + ' - ' + displayDate(normalizeDate(m[2])) };
        }
        // Hỗ trợ định dạng TikTok: Ngày phân tích: 01/06/2026~30/06/2026
        if ((m = s.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s*[~\-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/))) {
            return { start: normalizeDate(m[1]), end: normalizeDate(m[2]), label: displayDate(normalizeDate(m[1])) + ' - ' + displayDate(normalizeDate(m[2])) };
        }
        return { start: '', end: '', label: '' };
    }

    function detectFileType(rows) {
        var sample = rows.slice(0, 12).map(function (r) { return (r || []).join(' | '); }).join(' || ');
        var n = norm(sample);

        if (n.indexOf(norm('Tổng quan dữ liệu')) !== -1 && n.indexOf(norm('Tổng doanh thu')) !== -1) return 'store';
        if (n.indexOf(norm('GMV đến từ buổi LIVE')) !== -1 && n.indexOf(norm('Lượt xem phiên LIVE')) !== -1) return 'live_video';
        if (n.indexOf(norm('GMV nhờ thẻ sản phẩm')) !== -1 && n.indexOf(norm('Tỷ lệ từ xem đến thanh toán')) !== -1) return 'product_card';

        // File Phân tích sản phẩm có nhiều phiên bản tên cột.
        if (
            (n.indexOf(norm('GMV tab Cửa hàng')) !== -1 || n.indexOf(norm('GMV của tab Cửa hàng')) !== -1) &&
            (n.indexOf(norm('GMV đến từ video')) !== -1 || n.indexOf(norm('GMV nhờ video của người bán')) !== -1)
        ) return 'product';

        if (
            n.indexOf(norm('ID sản phẩm')) !== -1 &&
            n.indexOf(norm('Trạng thái bài niêm yết')) !== -1 &&
            n.indexOf(norm('GMV của tab Cửa hàng')) !== -1
        ) return 'product';

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
                         parseNum(getByHeader(v, h, 'GMV LIVE của nhà sáng tạo')) +
                         parseNum(getByHeader(v, h, 'GMV gián tiếp từ buổi LIVE của nhà sáng tạo')) +
                         parseNum(getByHeader(v, h, 'GMV nhờ buổi LIVE của tài khoản kết nối')) +
                         parseNum(getByHeader(v, h, 'GMV LIVE của người bán')) +
                         parseNum(getByHeader(v, h, 'GMV gián tiếp từ buổi LIVE của người bán')),
                videoGmv: parseNum(getByHeader(v, h, 'GMV đến từ video liên kết')) +
                          parseNum(getByHeader(v, h, 'GMV video của nhà sáng tạo')) +
                          parseNum(getByHeader(v, h, 'GMV gián tiếp từ video của nhà sáng tạo')) +
                          parseNum(getByHeader(v, h, 'GMV nhờ video của tài khoản kết nối')) +
                          parseNum(getByHeader(v, h, 'GMV video của người bán')) +
                          parseNum(getByHeader(v, h, 'GMV gián tiếp từ video của người bán'))
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
                             parseNum(getByHeader(row, dh, 'GMV LIVE của nhà sáng tạo')) +
                             parseNum(getByHeader(row, dh, 'GMV gián tiếp từ buổi LIVE của nhà sáng tạo')) +
                             parseNum(getByHeader(row, dh, 'GMV nhờ buổi LIVE của tài khoản kết nối')) +
                             parseNum(getByHeader(row, dh, 'GMV LIVE của người bán')) +
                             parseNum(getByHeader(row, dh, 'GMV gián tiếp từ buổi LIVE của người bán')),
                    videoGmv: parseNum(getByHeader(row, dh, 'GMV đến từ video liên kết')) +
                              parseNum(getByHeader(row, dh, 'GMV video của nhà sáng tạo')) +
                              parseNum(getByHeader(row, dh, 'GMV gián tiếp từ video của nhà sáng tạo')) +
                              parseNum(getByHeader(row, dh, 'GMV nhờ video của tài khoản kết nối')) +
                              parseNum(getByHeader(row, dh, 'GMV video của người bán')) +
                              parseNum(getByHeader(row, dh, 'GMV gián tiếp từ video của người bán'))
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
        var headerIndex = findHeaderRow(rows, ['ID sản phẩm', 'Tên', 'GMV của tab Cửa hàng']);
        if (headerIndex < 0) headerIndex = findHeaderRow(rows, ['ID', 'Sản phẩm', 'GMV tab Cửa hàng']);
        if (headerIndex < 0) headerIndex = findHeaderRow(rows, ['ID sản phẩm', 'Tên', 'GMV']);

        var products = [];
        if (headerIndex >= 0) {
            var h = buildHeaderMap(rows[headerIndex]);
            var headerRow = rows[headerIndex] || [];
            var groupRow = rows[headerIndex - 1] || [];

            function isEmptyCell(v) {
                return v === null || v === undefined || safeText(v).trim() === '';
            }

            function getByHeaderInGroup(row, groupNames, headerNames) {
                groupNames = Array.isArray(groupNames) ? groupNames : [groupNames];
                headerNames = Array.isArray(headerNames) ? headerNames : [headerNames];
                for (var i = 0; i < headerRow.length; i++) {
                    var groupText = norm(groupRow[i]);
                    var headerText = norm(headerRow[i]);
                    if (!headerText) continue;

                    var groupOk = !groupNames.length || groupNames.some(function (g) {
                        var ng = norm(g);
                        return ng && groupText.indexOf(ng) !== -1;
                    });
                    if (!groupOk) continue;

                    var headerOk = headerNames.some(function (hn) {
                        var nh = norm(hn);
                        return nh && (headerText === nh || headerText.indexOf(nh) !== -1);
                    });
                    if (headerOk) return row[i];
                }
                return null;
            }

            function pick(row, directNames, groupNames, groupHeaderNames) {
                var v = null;
                if (directNames && directNames.length) {
                    v = getByHeader(row, h, directNames);
                    if (!isEmptyCell(v)) return v;
                }
                if (groupNames && groupHeaderNames) {
                    v = getByHeaderInGroup(row, groupNames, groupHeaderNames);
                    if (!isEmptyCell(v)) return v;
                }
                return v;
            }

            for (var r = headerIndex + 1; r < rows.length; r++) {
                var row = rows[r] || [];
                var id = safeText(getByHeader(row, h, ['ID', 'ID sản phẩm'])).trim();
                var name = safeText(getByHeader(row, h, ['Sản phẩm', 'Tên'])).trim();
                if (!id || !name || norm(id) === 'id' || norm(id) === norm('ID sản phẩm')) continue;

                products.push({
                    id: id,
                    productName: name,
                    status: safeText(getByHeader(row, h, ['Trạng thái', 'Trạng thái bài niêm yết'])).trim(),
                    gmv: parseNum(getByHeader(row, h, 'GMV')),
                    units: parseNum(getByHeader(row, h, 'Số món bán ra')),
                    orders: parseNum(getByHeader(row, h, 'Đơn hàng')),

                    storeGmv: parseNum(pick(row, ['GMV tab Cửa hàng', 'GMV của tab Cửa hàng'])),
                    storeUnits: parseNum(pick(row, ['Số món bán ra qua Tab Cửa hàng', 'Số món bán ra từ tab Cửa hàng'])),
                    storeImpressions: parseNum(pick(row, ['Lượt hiển thị bài niêm yết trong tab Cửa hàng', 'Lượt hiển thị sản phẩm trong tab Cửa hàng'])),
                    storeViews: parseNum(pick(row, ['Lượt xem trang từ tab Cửa hàng', 'Lượt nhấp vào sản phẩm trong tab Cửa hàng'])),
                    storeCustomers: parseNum(pick(row, ['Khách hàng mua sản phẩm độc nhất tại tab Cửa hàng', 'Số khách hàng ước tính từ tab Cửa hàng'])),
                    storeClickRate: parseRate(pick(row, ['Tỷ lệ nhấp vào Shop Tab', 'CTR của tab Cửa hàng'])),
                    storeConversionRate: parseRate(pick(row, ['Tỷ lệ chuyển đổi Shop Tab', 'CTOR của tab Cửa hàng (SKU)'])),

                    liveGmv: parseNum(pick(row, ['GMV nhờ buổi LIVE của người bán', 'GMV đến từ buổi LIVE'], ['Buổi LIVE của người bán'], ['GMV đã ghi nhận', 'GMV'])),
                    liveUnits: parseNum(pick(row, ['Số món bán ra ghi nhận vào buổi LIVE'], ['Buổi LIVE của người bán'], ['Số món bán ra đã ghi nhận', 'Số món bán ra'])),
                    liveImpressions: parseNum(pick(row, ['Lượt hiển thị LIVE'], ['Buổi LIVE của người bán'], ['Lượt hiển thị sản phẩm'])),
                    liveViews: parseNum(pick(row, ['Lượt xem trang từ LIVE'], ['Buổi LIVE của người bán'], ['Lượt nhấp vào sản phẩm'])),
                    liveCustomers: parseNum(pick(row, ['Khách hàng sản phẩm duy nhất của LIVE'], ['Buổi LIVE của người bán'], ['Số lượng khách hàng ước tính'])),
                    liveClickRate: parseRate(pick(row, ['Tỷ lệ nhấp vào LIVE'], ['Buổi LIVE của người bán'], ['CTR'])),
                    liveConversionRate: parseRate(pick(row, ['Tỷ lệ chuyển đổi của LIVE'], ['Buổi LIVE của người bán'], ['CTOR (đơn hàng SKU)'])),

                    videoGmv: parseNum(pick(row, ['GMV nhờ video của người bán', 'GMV đến từ video'], ['Video của người bán'], ['GMV đã ghi nhận', 'GMV'])),
                    videoUnits: parseNum(pick(row, ['Số món bán ra ghi nhận vào video'], ['Video của người bán'], ['Số món bán ra đã ghi nhận', 'Số món bán ra'])),
                    videoImpressions: parseNum(pick(row, ['Lượt hiển thị của video'], ['Video của người bán'], ['Lượt hiển thị sản phẩm'])),
                    videoViews: parseNum(pick(row, ['Lượt xem trang từ video'], ['Video của người bán'], ['Lượt nhấp vào sản phẩm'])),
                    videoCustomers: parseNum(pick(row, ['Khách hàng sản phẩm duy nhất của video'], ['Video của người bán'], ['Số lượng khách hàng ước tính'])),
                    videoClickRate: parseRate(pick(row, ['Tỷ lệ nhấp vào video'], ['Video của người bán'], ['CTR'])),
                    videoConversionRate: parseRate(pick(row, ['Tỷ lệ chuyển đổi của video'], ['Video của người bán'], ['CTOR (đơn hàng SKU)'])),

                    cardGmv: parseNum(pick(row, ['GMV nhờ thẻ sản phẩm', 'GMV thẻ sản phẩm của người bán'], ['Thẻ sản phẩm của người bán'], ['GMV đã ghi nhận', 'GMV'])),
                    cardUnits: parseNum(pick(row, ['Số món bán ra nhờ thẻ sản phẩm'], ['Thẻ sản phẩm của người bán'], ['Số món bán ra đã ghi nhận', 'Số món bán ra'])),
                    cardImpressions: parseNum(pick(row, ['Lượt hiển thị thẻ sản phẩm'], ['Thẻ sản phẩm của người bán'], ['Lượt hiển thị sản phẩm'])),
                    cardViews: parseNum(pick(row, ['Lượt xem trang từ thẻ sản phẩm'], ['Thẻ sản phẩm của người bán'], ['Lượt nhấp vào sản phẩm'])),
                    cardCustomers: parseNum(pick(row, ['Khách hàng duy nhất của thẻ sản phẩm'], ['Thẻ sản phẩm của người bán'], ['Số lượng khách hàng ước tính'])),
                    cardClickRate: parseRate(pick(row, ['Tỷ lệ nhấp vào thẻ sản phẩm'], ['Thẻ sản phẩm của người bán'], ['CTR'])),
                    cardConversionRate: parseRate(pick(row, ['Tỷ lệ chuyển đổi của thẻ sản phẩm'], ['Thẻ sản phẩm của người bán'], ['CTOR (đơn hàng SKU)']))
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
        return Object.keys(map).map(function (k) { return map[k]; }).filter(function (r) { return r && r.company === STATE.company; });
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
        var preferredMap = {}, fallbackMap = {};
        uniquePieces().forEach(function (p) {
            var target = (p.type === 'store' || p.type === 'product') ? preferredMap : fallbackMap;
            var daily = [];
            if (p.type === 'store') daily = (p.parsed && p.parsed.daily) || [];
            if (p.type === 'live_video') daily = (p.parsed && p.parsed.daily) || [];
            if (p.type === 'product_card') daily = (p.parsed && p.parsed.daily) || [];
            daily.forEach(function (d) { if (d.dateISO) target[d.dateISO.slice(0, 7)] = true; });
            if (p.periodStart) target[p.periodStart.slice(0, 7)] = true;
        });
        var months = Object.keys(preferredMap).sort().reverse();
        if (!months.length) months = Object.keys(fallbackMap).sort().reverse();
        if (!months.length) months = getAvailableMonths();
        if (!months.length) return;
        if (!force && (STATE.initializedDefaultMonth || hasDateFilter() || STATE.quickFilter || STATE.monthFilter)) return;
        var ym = months[0];
        var parts = ym.split('-');
        var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
        STATE.dateFrom = toISODate(new Date(y, m - 1, 1));
        STATE.dateTo = toISODate(new Date(y, m, 0));
        STATE.monthFilter = ym;
        STATE.quickFilter = '';
        STATE.initializedDefaultMonth = true;
    }

    function buildViewData() {
        applyLatestMonthIfNeeded(false);

        var pieces = piecesForView();
        var storeDaily = [], liveDaily = [], cardDaily = [], productRows = [], fileLabels = [];
        var dataStatus = { store:false, live_video:false, product_card:false, product:false };

        pieces.forEach(function (p) {
            fileLabels.push((p.typeLabel || p.type) + ': ' + (p.periodLabel || p.fileName));
            dataStatus[p.type] = true;
            if (p.type === 'store') storeDaily = storeDaily.concat(filteredDaily(p.parsed && p.parsed.daily));
            if (p.type === 'live_video') liveDaily = liveDaily.concat(filteredDaily(p.parsed && p.parsed.daily));
            if (p.type === 'product_card') cardDaily = cardDaily.concat(filteredDaily(p.parsed && p.parsed.daily));
            if (p.type === 'product' && rangesOverlap(p.periodStart, p.periodEnd)) productRows = productRows.concat((p.parsed && p.parsed.rows) || []);
        });

        // LIVE & Video: giữ đầy đủ các buổi/ngày theo bộ lọc, kể cả ngày không phát sinh GMV.
        // Thẻ sản phẩm: bảng hiển thị vẫn ẩn dòng không có GMV, nhưng chỉ số lượt xem/lượt nhấp/thêm giỏ vẫn tính đủ theo bộ lọc.
        var cardDailyRevenueOnly = cardDaily.filter(function (d) { return (Number(d.gmv) || 0) > 0; });
        dataStatus.live_video = liveDaily.length > 0;
        dataStatus.product_card = cardDailyRevenueOnly.length > 0 || cardDaily.length > 0;

        var storeGrouped = groupByDate(storeDaily, ['gmv','orders','customers','units','skuOrders','revenue','pageViews','visitors','productImpressions','productClicks','liveGmv','videoGmv']);
        var liveGrouped = groupByDate(liveDaily, ['liveGmv','liveDirectGmv','liveIndirectGmv','liveSessions','liveSessionsWithGmv','units','orders','customers','views','avgWatchTime']);
        var cardGrouped = groupByDate(cardDaily, ['gmv','views','clicks','customers','skuOrders','viewers','cartClicks','cartUsers','contentGmv']);

        // Chỉ hiển thị những ngày thật sự có LIVE: có buổi LIVE, lượt xem LIVE, đơn LIVE hoặc GMV LIVE.
        // Không hiển thị đủ 30 ngày nếu ngày đó không có hoạt động LIVE.
        var liveDisplayDaily = liveGrouped.filter(function (d) {
            return (Number(d.liveSessions) || 0) > 0 ||
                   (Number(d.views) || 0) > 0 ||
                   (Number(d.orders) || 0) > 0 ||
                   (Number(d.liveGmv) || 0) > 0;
        });

        var dateMap = {};
        function ensure(dateISO) {
            if (!dateMap[dateISO]) dateMap[dateISO] = { dateISO:dateISO, date:displayDate(dateISO), gmv:0, orders:0, customers:0, units:0, revenue:0, visitors:0, pageViews:0, productClicks:0, productImpressions:0, liveGmv:0, videoGmv:0, cardGmv:0, cardClicks:0, cardViews:0, liveViews:0, liveSessions:0 };
            return dateMap[dateISO];
        }
        storeGrouped.forEach(function(d){ var x=ensure(d.dateISO); ['gmv','orders','customers','units','revenue','visitors','pageViews','productClicks','productImpressions','liveGmv','videoGmv'].forEach(function(k){ x[k]+=(d[k]||0); }); });
        liveGrouped.forEach(function(d){ var x=ensure(d.dateISO); if((d.liveGmv||0)>0) x.liveGmv += d.liveGmv||0; x.liveViews += d.views||0; x.liveSessions += d.liveSessions||0; });
        cardGrouped.forEach(function(d){ var x=ensure(d.dateISO); x.cardGmv += d.gmv||0; x.cardClicks += d.clicks||0; x.cardViews += d.views||0; });
        var daily = Object.keys(dateMap).map(function(k){ var d=dateMap[k]; d.conversionRate = d.visitors>0 ? (d.customers/d.visitors)*100 : (d.productClicks>0 ? (d.orders/d.productClicks)*100 : 0); d.clickRate = d.productImpressions>0 ? (d.productClicks/d.productImpressions)*100 : 0; d.aov=d.orders>0?d.gmv/d.orders:0; return d; }).sort(function(a,b){return String(a.dateISO).localeCompare(String(b.dateISO));});

        var products = aggregateProducts(productRows);
        var storeMetrics = { gmv:sum(storeGrouped,'gmv'), revenue:sum(storeGrouped,'revenue'), orders:sum(storeGrouped,'orders'), customers:sum(storeGrouped,'customers'), units:sum(storeGrouped,'units'), visitors:sum(storeGrouped,'visitors'), pageViews:sum(storeGrouped,'pageViews'), productClicks:sum(storeGrouped,'productClicks'), productImpressions:sum(storeGrouped,'productImpressions') };
        storeMetrics.conversionRate = storeMetrics.visitors>0 ? (storeMetrics.customers/storeMetrics.visitors)*100 : (storeMetrics.productClicks>0 ? (storeMetrics.orders/storeMetrics.productClicks)*100 : 0);
        storeMetrics.clickRate = storeMetrics.productImpressions>0 ? (storeMetrics.productClicks/storeMetrics.productImpressions)*100 : 0;
        storeMetrics.aov = storeMetrics.orders>0 ? storeMetrics.gmv/storeMetrics.orders : 0;

        var productMetrics = { productCount:products.length, activeCount:products.filter(function(p){return norm(p.status)==='active';}).length, gmv:sum(products,'gmv'), orders:sum(products,'orders'), units:sum(products,'units'), storeGmv:sum(products,'storeGmv'), liveGmv:sum(products,'liveGmv'), videoGmv:sum(products,'videoGmv'), cardGmv:sum(products,'cardGmv'), storeViews:sum(products,'storeViews'), liveViews:sum(products,'liveViews'), videoViews:sum(products,'videoViews'), cardViews:sum(products,'cardViews') };
        var liveMetrics = { gmv:sum(liveGrouped,'liveGmv'), directGmv:sum(liveGrouped,'liveDirectGmv'), indirectGmv:sum(liveGrouped,'liveIndirectGmv'), sessions:sum(liveGrouped,'liveSessions'), sessionsWithGmv:sum(liveGrouped,'liveSessionsWithGmv'), orders:sum(liveGrouped,'orders'), units:sum(liveGrouped,'units'), customers:sum(liveGrouped,'customers'), views:sum(liveGrouped,'views'), avgWatchTime: liveDisplayDaily.length ? sum(liveDisplayDaily,'avgWatchTime')/liveDisplayDaily.length : 0 };
        var cardMetrics = { gmv:sum(cardGrouped,'gmv'), views:sum(cardGrouped,'views'), clicks:sum(cardGrouped,'clicks'), customers:sum(cardGrouped,'customers'), orders:sum(cardGrouped,'skuOrders'), viewers:sum(cardGrouped,'viewers'), cartClicks:sum(cardGrouped,'cartClicks'), cartUsers:sum(cardGrouped,'cartUsers'), contentGmv:sum(cardGrouped,'contentGmv') };
        cardMetrics.viewToClickRate = cardMetrics.views>0 ? (cardMetrics.clicks/cardMetrics.views)*100 : 0;
        cardMetrics.clickToCartRate = cardMetrics.clicks>0 ? (cardMetrics.cartClicks/cardMetrics.clicks)*100 : 0;
        cardMetrics.clickToPayRate = cardMetrics.clicks>0 ? (cardMetrics.orders/cardMetrics.clicks)*100 : 0;
        cardMetrics.viewToPayRate = cardMetrics.views>0 ? (cardMetrics.orders/cardMetrics.views)*100 : 0;

        var sourceGroups = [
            { key:'Tab cửa hàng', gmv:productMetrics.storeGmv || Math.max(0,storeMetrics.gmv-storeMetrics.videoGmv), views:productMetrics.storeViews, source:'product' },
            { key:'Video', gmv:productMetrics.videoGmv || sum(storeGrouped,'videoGmv'), views:productMetrics.videoViews, source:'product/store' },
            { key:'Thẻ sản phẩm', gmv:productMetrics.cardGmv || cardMetrics.gmv, views:productMetrics.cardViews || cardMetrics.views, source:'product/card' },
            { key:'LIVE', gmv:productMetrics.liveGmv || liveMetrics.gmv || sum(storeGrouped,'liveGmv'), views:productMetrics.liveViews || liveMetrics.views, source:'product/live' }
        ].filter(function(x){ return (Number(x.gmv)||0)>0; });

        var gmv = storeMetrics.gmv || productMetrics.gmv || cardMetrics.gmv || liveMetrics.gmv;
        var orders = storeMetrics.orders || productMetrics.orders || cardMetrics.orders || liveMetrics.orders;
        var customers = storeMetrics.customers || cardMetrics.customers || liveMetrics.customers;
        var units = storeMetrics.units || productMetrics.units || liveMetrics.units;
        var metrics = { gmv:gmv, revenue:storeMetrics.revenue, orders:orders, customers:customers, units:units, visitors:storeMetrics.visitors, pageViews:storeMetrics.pageViews, productClicks:storeMetrics.productClicks || cardMetrics.clicks, productImpressions:storeMetrics.productImpressions, conversionRate:storeMetrics.conversionRate, clickRate:storeMetrics.clickRate, aov:storeMetrics.aov || (orders>0 ? gmv/orders : 0), liveGmv:liveMetrics.gmv || productMetrics.liveGmv, videoGmv:productMetrics.videoGmv || sum(storeGrouped,'videoGmv'), cardGmv:cardMetrics.gmv || productMetrics.cardGmv, liveViews:liveMetrics.views || productMetrics.liveViews, liveSessions:liveMetrics.sessions, cardViews:cardMetrics.views || productMetrics.cardViews, cardClicks:cardMetrics.clicks, productCount:productMetrics.productCount, activeProductCount:productMetrics.activeCount };

        return { pieces:pieces, fileLabels:fileLabels, dataStatus:dataStatus, daily:daily, storeDaily:storeGrouped, liveDaily:liveDisplayDaily, cardDaily:cardGrouped, products:products, sourceGroups:sourceGroups, metrics:metrics, storeMetrics:storeMetrics, productMetrics:productMetrics, liveMetrics:liveMetrics, cardMetrics:cardMetrics, filterLabel: hasDateFilter() ? ((STATE.dateFrom ? displayDate(STATE.dateFrom) : 'đầu kỳ') + ' → ' + (STATE.dateTo ? displayDate(STATE.dateTo) : 'cuối kỳ')) : 'Toàn kỳ' };
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
            .tt-shell { font-family:'Segoe UI', Arial, 'Helvetica Neue', Tahoma, sans-serif !important; color:#0f172a; max-width:100%; overflow:hidden; }
            .tt-hero { background: radial-gradient(circle at 10% 10%, rgba(236,72,153,.16), transparent 28%), linear-gradient(135deg,#fff,#fdf2f8 45%,#f8fafc); border:1px solid #fbcfe8; border-radius:22px; padding:14px; margin-bottom:12px; box-shadow:0 10px 24px rgba(15,23,42,.05); max-width:100%; overflow:hidden; }
            .tt-hero-top { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
            .tt-title { margin:0; font-size:20px; line-height:1.15; color:#0f172a; font-weight:950; letter-spacing:-.035em; }
            .tt-sub { color:#64748b; font-size:12px; line-height:1.55; margin-top:5px; max-width:760px; }
            .tt-badge { background:#fdf2f8; border:1px solid #fbcfe8; color:#be185d; border-radius:999px; padding:7px 11px; font-size:11px; font-weight:900; }
            .tt-toolbar { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin-top:12px; max-width:100%; }
            .tt-select,.tt-input { border:1px solid #e2e8f0; background:#fff; border-radius:11px; padding:8px 10px; outline:none; font-weight:500; color:#334155; min-height:36px; font-size:12px; font-family:'Segoe UI',Arial,sans-serif !important; max-width:100%; }
            .tt-filter-label { display:flex; align-items:center; gap:5px; background:#fff; border:1px solid #e2e8f0; border-radius:999px; padding:4px 7px 4px 9px; color:#64748b; font-size:11px; font-weight:500; }
            .tt-filter-label input { border:0 !important; box-shadow:none !important; padding:3px 2px !important; min-height:26px !important; min-width:112px !important; background:transparent !important; color:#334155 !important; font-weight:400 !important; font-size:12px !important; font-family:'Segoe UI',Arial,sans-serif !important; }
            .tt-btn,.tt-upload-btn { border:none; border-radius:999px; padding:8px 12px; cursor:pointer; font-family:'Segoe UI',Arial,sans-serif !important; font-weight:800; font-size:12px; transition:.16s ease; }
            .tt-btn { background:#fff; color:#be185d; border:1px solid #fbcfe8; }
            .tt-btn:hover { background:#fdf2f8; transform:translateY(-1px); }
            .tt-upload-btn { background:linear-gradient(135deg,#ec4899,#be185d); color:#fff; box-shadow:0 10px 22px rgba(236,72,153,.25); }
            .tt-upload-btn:hover { transform:translateY(-1px); box-shadow:0 12px 26px rgba(236,72,153,.30); }
            .tt-kpis { display:grid; grid-template-columns:repeat(7,minmax(118px,1fr)); gap:9px; margin-bottom:12px; max-width:100%; }
            .tt-kpi { position:relative; overflow:hidden; background:linear-gradient(180deg,#fff,#fff7fb); border:1px solid #e2e8f0; border-radius:16px; padding:11px 12px; min-height:94px; cursor:pointer; box-shadow:0 6px 14px rgba(15,23,42,.035); transition:.16s ease; }
            .tt-kpi:hover { transform:translateY(-3px); border-color:#f9a8d4; box-shadow:0 12px 26px rgba(236,72,153,.12); }
            .tt-kpi:before { content:''; position:absolute; left:0; top:0; height:4px; width:100%; background:#f472b6; }
            .tt-kpi span { display:block; color:#64748b; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.035em; }
            .tt-kpi strong { display:block; color:#0f172a; font-size:17px; margin-top:7px; line-height:1.15; word-break:break-word; }
            .tt-kpi small { display:block; color:#64748b; margin-top:6px; font-weight:700; line-height:1.3; font-size:11px; }
            .tt-grid { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr); gap:12px; margin-bottom:12px; max-width:100%; }
            .tt-card { background:#fff; border:1px solid #e2e8f0; border-radius:18px; padding:13px; box-shadow:0 6px 18px rgba(15,23,42,.035); min-width:0; max-width:100%; overflow:hidden; }
            .tt-card-title { font-weight:950; color:#0f172a; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; font-size:13px; }
            .tt-muted { color:#64748b; font-size:12px; font-weight:600; }
            .tt-chart-box { height:260px; position:relative; max-width:100%; }
            .tt-table-wrap { width:100%; max-width:100%; overflow:auto; border:1px solid #e2e8f0; border-radius:14px; background:#fff; }
            .tt-table { width:100%; border-collapse:separate; border-spacing:0; min-width:760px; }
            .tt-table th { position:sticky; top:0; z-index:3; background:#fdf2f8 !important; color:#9d174d !important; padding:9px; font-size:10px; text-transform:uppercase; border-bottom:1px solid #fbcfe8; text-align:left; }
            .tt-table td { padding:8px 9px; border-bottom:1px solid #f1f5f9; color:#0f172a; background:#fff; font-size:12px; }
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

            .tt-status-strip { display:grid; grid-template-columns:repeat(4,minmax(160px,1fr)); gap:10px; margin:0 0 14px; }
            .tt-status-pill { border:1px solid #e2e8f0; border-radius:18px; padding:12px; background:#fff; display:flex; align-items:center; gap:10px; }
            .tt-status-pill b { display:block; color:#0f172a; font-size:13px; }
            .tt-status-pill small { color:#64748b; font-weight:600; }
            .tt-status-dot { width:12px; height:12px; border-radius:999px; background:#cbd5e1; flex:0 0 auto; }
            .tt-status-pill.on { border-color:#f9a8d4; background:#fdf2f8; }
            .tt-status-pill.on .tt-status-dot { background:#ec4899; box-shadow:0 0 0 4px rgba(236,72,153,.12); }
            .tt-module-title { font-size:15px; color:#0f172a; font-weight:950; margin:4px 0 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
            .tt-module-sub { color:#64748b; font-size:12px; font-weight:600; }
            .tt-insight-grid { display:grid; grid-template-columns:repeat(4,minmax(170px,1fr)); gap:12px; margin-bottom:14px; }
            .tt-insight { background:#fff; border:1px solid #e2e8f0; border-radius:20px; padding:15px; box-shadow:0 8px 18px rgba(15,23,42,.035); cursor:pointer; }
            .tt-insight:hover { transform:translateY(-2px); border-color:#f9a8d4; }
            .tt-insight span { display:block; color:#64748b; font-size:11px; text-transform:uppercase; font-weight:900; letter-spacing:.04em; }
            .tt-insight strong { display:block; color:#0f172a; font-size:18px; margin-top:7px; }
            .tt-insight small { display:block; margin-top:6px; color:#64748b; font-weight:650; line-height:1.45; }
            .tt-mini-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
            .tt-funnel { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
            .tt-funnel-step { border:1px solid #fbcfe8; background:#fdf2f8; border-radius:16px; padding:12px; text-align:center; }
            .tt-funnel-step span { color:#9d174d; display:block; font-size:11px; font-weight:900; text-transform:uppercase; }
            .tt-funnel-step strong { display:block; color:#0f172a; margin-top:5px; font-size:16px; }
            @media(max-width:1180px){ .tt-status-strip,.tt-insight-grid{grid-template-columns:repeat(2,minmax(0,1fr));} .tt-mini-grid{grid-template-columns:1fr;} .tt-funnel{grid-template-columns:repeat(2,1fr);} }
            @media(max-width:620px){ .tt-status-strip,.tt-insight-grid,.tt-funnel{grid-template-columns:1fr;} }
            @media(max-width:1380px){ .tt-kpis{grid-template-columns:repeat(4,minmax(0,1fr));} .tt-grid{grid-template-columns:1fr;} }
            @media(max-width:980px){ .tt-kpis{grid-template-columns:repeat(2,minmax(0,1fr));} .tt-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
            @media(max-width:720px){ .tt-kpis,.tt-detail-grid{grid-template-columns:1fr;} .tt-toolbar>*{width:100%;} .tt-chart-box{height:280px;} .tt-modal{width:100vw; max-height:94vh; border-radius:18px;} }

            .tt-shell * { box-sizing:border-box; }
            .tt-shell canvas { max-width:100% !important; }
            .tt-shell .tt-product-table-card { max-width:100%; overflow:hidden; }
            .tt-compact-note { color:#64748b; font-size:11px; font-weight:600; }
            @media(max-width:1500px){ .tt-kpis{grid-template-columns:repeat(4,minmax(0,1fr));} }
            @media(max-width:1180px){ .tt-grid{grid-template-columns:1fr;} .tt-chart-box{height:250px;} }
            @media(max-width:760px){ .tt-kpis{grid-template-columns:repeat(2,minmax(0,1fr));} .tt-toolbar>*{width:100%;} .tt-chart-box{height:230px;} .tt-table{min-width:700px;} }
            @media(max-width:520px){ .tt-kpis{grid-template-columns:1fr;} .tt-title{font-size:18px;} .tt-sub{font-size:11px;} }

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
        if (!records.length) { area.innerHTML = '<div class="tt-empty">Chưa có dữ liệu TikTok Shop. Có thể tải 1 file hoặc nhiều file cùng lúc.</div>'; return; }
        var view = buildViewData();
        var m = view.metrics, l = view.liveMetrics, c = view.cardMetrics, p = view.productMetrics, status = view.dataStatus || {};
        var label = view.filterLabel || 'Toàn kỳ';
        function statusPill(type, icon, title) { var on=!!status[type]; return '<div class="tt-status-pill '+(on?'on':'')+'"><i class="tt-status-dot"></i><div><b>'+icon+' '+title+'</b><small>'+(on?'Đã có dữ liệu trong kỳ':'Chưa có dữ liệu trong kỳ')+'</small></div></div>'; }
        area.innerHTML = `
            <div class="tt-status-strip">${statusPill('store','🏪','Phân tích cửa hàng')}${statusPill('live_video','🎥','LIVE & Video')}${statusPill('product_card','🏷️','Thẻ sản phẩm')}${statusPill('product','📦','Phân tích sản phẩm')}</div>
            <div class="tt-module-title"><span>🏪 Tổng quan cửa hàng</span><small class="tt-module-sub">${label}</small></div>
            <div class="tt-kpis">
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('gmv')"><span>GMV cửa hàng</span><strong>${m.gmv ? fmtMoney(m.gmv) : '-'}</strong><small>Nguồn: Cửa hàng / sản phẩm</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('orders')"><span>Đơn hàng</span><strong>${m.orders ? fmtNum(m.orders,0) : '-'}</strong><small>Số món bán ra: ${fmtNum(m.units,0)}</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('customers')"><span>Khách hàng</span><strong>${m.customers ? fmtNum(m.customers,0) : '-'}</strong><small>Khách truy cập: ${fmtNum(m.visitors,0)}</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('conversion')"><span>Chuyển đổi shop</span><strong>${m.conversionRate ? fmtPct(m.conversionRate) : '-'}</strong><small>Khách hàng / Khách truy cập</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('traffic')"><span>Hiển thị sản phẩm</span><strong>${m.productImpressions ? fmtNum(m.productImpressions,0) : '-'}</strong><small>Click SP: ${fmtNum(m.productClicks,0)} • CTR: ${fmtPct(m.clickRate)}</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('aov')"><span>AOV</span><strong>${m.aov ? fmtMoney(m.aov) : '-'}</strong><small>GMV / Đơn hàng</small></div>
                <div class="tt-kpi" onclick="window.showTiktokKpiDetail('product')"><span>Sản phẩm có dữ liệu</span><strong>${fmtNum(m.productCount,0)}</strong><small>Đang bán: ${fmtNum(m.activeProductCount,0)}</small></div>
            </div>
            <div class="tt-module-title"><span>🧭 Hiệu quả theo điểm chạm TikTok Shop</span><small class="tt-module-sub">Mỗi nguồn là một điểm chạm riêng</small></div>
            <div class="tt-insight-grid">
                <div class="tt-insight" onclick="window.showTiktokSourceDetail('Video')"><span>Video</span><strong>${m.videoGmv ? fmtMoney(m.videoGmv) : '-'}</strong><small>GMV từ video trong file sản phẩm/cửa hàng</small></div>
                <div class="tt-insight" onclick="window.showTiktokSourceDetail('Thẻ sản phẩm')"><span>Thẻ sản phẩm</span><strong>${m.cardGmv ? fmtMoney(m.cardGmv) : '-'}</strong><small>${fmtNum(c.views,0)} lượt xem • ${fmtNum(c.clicks,0)} lượt nhấp</small></div>
                <div class="tt-insight" onclick="window.showTiktokSourceDetail('LIVE')"><span>LIVE</span><strong>${m.liveGmv ? fmtMoney(m.liveGmv) : '-'}</strong><small>${fmtNum(l.sessions,0)} buổi LIVE • ${fmtNum(l.views,0)} lượt xem</small></div>
                <div class="tt-insight" onclick="window.showTiktokSourceDetail('Tab cửa hàng')"><span>Tab cửa hàng</span><strong>${p.storeGmv ? fmtMoney(p.storeGmv) : '-'}</strong><small>GMV từ tab cửa hàng theo sản phẩm</small></div>
            </div>
            <div class="tt-grid"><section class="tt-card"><div class="tt-card-title">📈 GMV & đơn hàng theo ngày</div><div class="tt-chart-box"><canvas id="tt-daily-chart"></canvas></div></section><section class="tt-card"><div class="tt-card-title">📊 GMV theo điểm chạm <span class="tt-muted">Không dùng để cộng thành tổng GMV</span></div><div class="tt-chart-box"><canvas id="tt-source-chart"></canvas></div></section></div>
            <div class="tt-mini-grid"><section class="tt-card"><div class="tt-card-title">🎥 LIVE & Video</div><div class="tt-funnel"><div class="tt-funnel-step"><span>Phiên LIVE</span><strong>${fmtNum(l.sessions,0)}</strong></div><div class="tt-funnel-step"><span>Lượt xem LIVE</span><strong>${fmtNum(l.views,0)}</strong></div><div class="tt-funnel-step"><span>Đơn LIVE</span><strong>${fmtNum(l.orders,0)}</strong></div><div class="tt-funnel-step"><span>GMV LIVE</span><strong>${fmtMoney(l.gmv)}</strong></div><div class="tt-funnel-step"><span>GMV Video</span><strong>${fmtMoney(m.videoGmv)}</strong></div></div><div class="tt-table-wrap" style="margin-top:12px;"><table class="tt-table"><thead><tr><th>Ngày</th><th class="tt-center">Buổi LIVE</th><th class="tt-center">Lượt xem</th><th class="tt-center">Đơn</th><th class="tt-right">GMV LIVE</th></tr></thead><tbody id="tt-live-tbody"></tbody></table></div></section>
            <section class="tt-card"><div class="tt-card-title">🏷️ Thẻ sản phẩm</div><div class="tt-funnel"><div class="tt-funnel-step"><span>Lượt xem</span><strong>${fmtNum(c.views,0)}</strong></div><div class="tt-funnel-step"><span>Lượt nhấp</span><strong>${fmtNum(c.clicks,0)}</strong></div><div class="tt-funnel-step"><span>Thêm giỏ</span><strong>${fmtNum(c.cartClicks,0)}</strong></div><div class="tt-funnel-step"><span>Đơn SKU</span><strong>${fmtNum(c.orders,0)}</strong></div><div class="tt-funnel-step"><span>GMV</span><strong>${fmtMoney(c.gmv)}</strong></div></div><div class="tt-table-wrap" style="margin-top:12px;"><table class="tt-table"><thead><tr><th>Ngày</th><th class="tt-center">Xem</th><th class="tt-center">Nhấp</th><th class="tt-center">Đơn</th><th class="tt-right">GMV thẻ SP</th></tr></thead><tbody id="tt-card-tbody"></tbody></table></div></section></div>
            <div class="tt-grid"><section class="tt-card"><div class="tt-card-title">🏆 Top sản phẩm theo ID <span class="tt-muted">Bấm cột để xem chi tiết</span></div><div class="tt-chart-box"><canvas id="tt-product-chart"></canvas></div></section><section class="tt-card"><div class="tt-card-title">📁 Lịch sử tải file</div><div class="tt-history-list" id="tt-history-list"></div></section></div>
            <section class="tt-card" style="margin-bottom:14px;"><div class="tt-card-title">📦 Phân tích sản phẩm / ID có GMV <input class="tt-input" style="max-width:330px;" placeholder="Tìm ID hoặc tên sản phẩm" oninput="window.searchTiktokProduct(this.value)" value="${escapeHtml(STATE.productSearch)}" /></div><div class="tt-table-wrap"><table class="tt-table"><thead><tr><th>ID</th><th>Sản phẩm</th><th>Trạng thái</th><th class="tt-right">GMV</th><th class="tt-center">Đơn</th><th class="tt-center">Số món</th><th class="tt-right">Tab cửa hàng</th><th class="tt-right">LIVE</th><th class="tt-right">Video</th><th class="tt-right">Thẻ sản phẩm</th></tr></thead><tbody id="tt-product-tbody"></tbody></table></div></section>
            <section class="tt-card"><div class="tt-card-title">📅 Tổng quan theo ngày</div><div class="tt-table-wrap"><table class="tt-table"><thead><tr><th>Ngày</th><th class="tt-right">GMV</th><th class="tt-center">Đơn</th><th class="tt-center">Khách</th><th class="tt-center">Số món</th><th class="tt-center">Truy cập</th><th class="tt-center">Chuyển đổi</th><th class="tt-center">CTR SP</th><th class="tt-right">Video</th><th class="tt-right">Thẻ SP</th></tr></thead><tbody id="tt-daily-tbody"></tbody></table></div></section>`;
        renderHistoryList(); renderTables(view); drawCharts(view);
    }

    function renderTables(view) {
        var products = (view.products || []).filter(function(p){ return (Number(p.gmv) || 0) > 0; });
        var q = (STATE.productSearch || '').toLowerCase().trim();
        if (q) products = products.filter(function (p) { return safeText(p.id).toLowerCase().indexOf(q) !== -1 || safeText(p.productName).toLowerCase().indexOf(q) !== -1 || (p.aliases || []).join(' ').toLowerCase().indexOf(q) !== -1; });
        var pBody=document.getElementById('tt-product-tbody');
        if(pBody) pBody.innerHTML = products.slice(0,80).map(function(p){return `<tr class="tt-row-click" onclick="window.showTiktokProductDetail('${escapeHtml(p.id)}')"><td><b>${escapeHtml(p.id)}</b></td><td><b>${escapeHtml(p.productName)}</b></td><td>${escapeHtml(p.status||'')}</td><td class="tt-right"><b>${fmtMoney(p.gmv)}</b></td><td class="tt-center">${fmtNum(p.orders,0)}</td><td class="tt-center">${fmtNum(p.units,0)}</td><td class="tt-right">${fmtMoney(p.storeGmv)}</td><td class="tt-right">${fmtMoney(p.liveGmv)}</td><td class="tt-right">${fmtMoney(p.videoGmv)}</td><td class="tt-right">${fmtMoney(p.cardGmv)}</td></tr>`;}).join('') || '<tr><td colspan="10" class="tt-center">Không có sản phẩm có GMV phù hợp.</td></tr>';
        var dBody=document.getElementById('tt-daily-tbody');
        if(dBody) dBody.innerHTML = (view.daily||[]).map(function(d){return `<tr class="tt-row-click" onclick="window.showTiktokDailyDetail('${escapeHtml(d.dateISO)}')"><td><b>${escapeHtml(d.date)}</b></td><td class="tt-right"><b>${fmtMoney(d.gmv)}</b></td><td class="tt-center">${fmtNum(d.orders,0)}</td><td class="tt-center">${fmtNum(d.customers,0)}</td><td class="tt-center">${fmtNum(d.units,0)}</td><td class="tt-center">${fmtNum(d.visitors,0)}</td><td class="tt-center">${fmtPct(d.conversionRate)}</td><td class="tt-center">${fmtPct(d.clickRate||0)}</td><td class="tt-right">${fmtMoney(d.videoGmv)}</td><td class="tt-right">${fmtMoney(d.cardGmv)}</td></tr>`;}).join('') || '<tr><td colspan="10" class="tt-center">Không có dữ liệu theo ngày phù hợp.</td></tr>';
        var lBody=document.getElementById('tt-live-tbody');
        if(lBody) lBody.innerHTML = (view.liveDaily||[]).slice(0,60).map(function(d){return `<tr><td><b>${escapeHtml(d.date)}</b></td><td class="tt-center">${fmtNum(d.liveSessions,0)}</td><td class="tt-center">${fmtNum(d.views,0)}</td><td class="tt-center">${fmtNum(d.orders,0)}</td><td class="tt-right"><b>${fmtMoney(d.liveGmv)}</b></td></tr>`;}).join('') || '<tr><td colspan="5" class="tt-center">Không có ngày phát sinh LIVE trong kỳ lọc.</td></tr>';
        var cBody=document.getElementById('tt-card-tbody');
        if(cBody) cBody.innerHTML = (view.cardDaily||[]).filter(function(d){ return (Number(d.gmv)||0) > 0; }).slice(0,60).map(function(d){return `<tr><td><b>${escapeHtml(d.date)}</b></td><td class="tt-center">${fmtNum(d.views,0)}</td><td class="tt-center">${fmtNum(d.clicks,0)}</td><td class="tt-center">${fmtNum(d.skuOrders,0)}</td><td class="tt-right"><b>${fmtMoney(d.gmv)}</b></td></tr>`;}).join('') || '<tr><td colspan="5" class="tt-center">Không có ngày phát sinh GMV thẻ sản phẩm trong kỳ. Các chỉ số lượt xem/lượt nhấp vẫn được tính trong tổng phía trên.</td></tr>';
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
        var sources = (view.sourceGroups || []).filter(function (x) { return (x.gmv || 0) > 0; }).slice(0, 8);
        if (!sources.length) sources = [{ key: 'Chưa có dữ liệu', gmv: 0 }];
        STATE.charts.source = new Chart(ctx, {
            type: 'bar',
            data: { labels: sources.map(function (s) { return s.key; }), datasets: [{ label: 'GMV điểm chạm', data: sources.map(function (s) { return s.gmv; }) }] },
            options: { responsive:true, maintainAspectRatio:false, onClick:function(evt,els){ if(els && els.length){ var s=sources[els[0].index]; if(s) window.showTiktokSourceDetail(s.key); } }, plugins:{ legend:{display:false}, tooltip:{callbacks:{afterLabel:function(){return 'Bấm để xem sản phẩm liên quan';}}} }, scales:{ y:{beginAtZero:true} } }
        });
    }

    function drawProductChart(view) {
        destroyChart('product');
        var ctx = document.getElementById('tt-product-chart');
        if (!ctx) return;
        var products = (view.products || []).filter(function (p) { return (Number(p.gmv) || 0) > 0; }).filter(function (p) { return (Number(p.gmv) || 0) > 0; }).slice(0, 10).reverse();
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
        return tableHtml(['Điểm chạm','GMV','Đơn/ghi nhận','So với GMV shop'], (view.sourceGroups || []).map(function (s) {
            var pct = view.metrics.gmv > 0 ? (s.gmv / view.metrics.gmv) * 100 : 0;
            return '<tr><td><b>' + escapeHtml(s.key) + '</b></td><td class="tt-right"><b>' + fmtMoney(s.gmv) + '</b></td><td class="tt-center">' + fmtNum(s.orders || 0,0) + '</td><td class="tt-center">' + fmtPct(pct) + '</td></tr>';
        }));
    }

    window.showTiktokSourceDetail = function (sourceKey) {
        var view = buildViewData();
        var body = buildSourceTable(view);
        var products = (view.products || []).filter(function (p) { return (Number(p.gmv) || 0) > 0; }).filter(function (p) {
            if (sourceKey === 'Cửa hàng' || sourceKey === 'Tab cửa hàng') return (p.storeGmv || 0) > 0;
            if (sourceKey === 'LIVE') return (p.liveGmv || 0) > 0;
            if (sourceKey === 'Video') return (p.videoGmv || 0) > 0;
            if (sourceKey === 'Thẻ sản phẩm') return (p.cardGmv || 0) > 0;
            return false;
        }).slice(0, 30);
        body += tableHtml(['ID','Sản phẩm','GMV nguồn','Tổng GMV'], products.map(function (p) {
            var sourceGmv = (sourceKey === 'Cửa hàng' || sourceKey === 'Tab cửa hàng') ? p.storeGmv : (sourceKey === 'LIVE' ? p.liveGmv : (sourceKey === 'Video' ? p.videoGmv : p.cardGmv));
            return '<tr><td><b>' + escapeHtml(p.id) + '</b></td><td>' + escapeHtml(p.productName) + '</td><td class="tt-right"><b>' + fmtMoney(sourceGmv) + '</b></td><td class="tt-right">' + fmtMoney(p.gmv) + '</td></tr>';
        }));
        showModal('Chi tiết điểm chạm: ' + escapeHtml(sourceKey), body);
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
        updates['/' + companyLogsPath(STATE.company) + '/' + (found.batchId || found.bundleKey)] = null;
        if (STATE.current && String(STATE.current.batchId || STATE.current.bundleKey) === String(batchId)) {
            var next = (STATE.history || []).filter(function (r) { return String(r.batchId || r.bundleKey) !== String(batchId); })[0] || null;
            updates['/' + companyLatestPath(STATE.company)] = next || null;
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
                bundleKey: companyKey(STATE.company) + '_' + bundleHash,
                batchId: companyKey(STATE.company) + '_' + bundleHash,
                companyKey: companyKey(STATE.company),
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

        record.company = STATE.company;
        record.companyKey = companyKey(STATE.company);
        record.batchId = record.batchId || (companyKey(STATE.company) + '_' + (record.bundleHash || Date.now()));
        record.bundleKey = record.batchId;

        var updates = {};
        updates['/' + companyLogsPath(STATE.company) + '/' + record.batchId] = record;
        updates['/' + companyLatestPath(STATE.company)] = record;

        db.ref().update(updates).catch(function (e) {
            console.warn('Không thể lưu Firebase TikTok Shop theo công ty:', e);
        });
    }

    function loadHistory() {
        var db = getDb();
        if (!db) {
            renderBase();
            return;
        }

        if (STATE.historyRef && typeof STATE.historyRef.off === 'function') {
            try { STATE.historyRef.off(); } catch (e) {}
        }

        STATE.historyRef = db.ref(companyLogsPath(STATE.company)).limitToLast(500);
        STATE.historyRef.on('value', function (snapshot) {
            var raw = snapshot.val() || {};
            STATE.history = Object.keys(raw).map(function (key) {
                var item = raw[key] || {};
                item.batchId = item.batchId || key;
                item.bundleKey = item.bundleKey || item.batchId;
                item.company = item.company || STATE.company;
                item.companyKey = item.companyKey || companyKey(STATE.company);
                return item;
            }).filter(function (x) {
                return x && x.company === STATE.company;
            }).sort(function (a, b) {
                return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
            });

            if (!STATE.current && STATE.history.length) STATE.current = STATE.history[0];
            if (STATE.current && STATE.current.company !== STATE.company) STATE.current = STATE.history[0] || null;

            applyLatestMonthIfNeeded(false);
            renderBase();
        });
    }

    function loadLatest() {
        var db = getDb();
        if (!db) return;

        if (STATE.latestRef && typeof STATE.latestRef.off === 'function') {
            try { STATE.latestRef.off(); } catch (e) {}
        }

        STATE.latestRef = db.ref(companyLatestPath(STATE.company));
        STATE.latestRef.once('value').then(function (snapshot) {
            var val = snapshot.val();
            if (val && val.company === STATE.company) {
                STATE.current = val;
                renderBase();
            } else if (!STATE.history.length) {
                STATE.current = null;
                renderBase();
            }
        }).catch(function () {});
    }

    window.changeTiktokCompany = function (companyId) {
        detachCompanyListeners();
        STATE.company = companyId || 'NNV';
        STATE.current = null;
        STATE.history = [];
        STATE.dateFrom = '';
        STATE.dateTo = '';
        STATE.quickFilter = '';
        STATE.monthFilter = '';
        STATE.productSearch = '';
        STATE.initializedDefaultMonth = false;
        renderBase();
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

    // Alias an toàn cho Ecom Loader
    if (typeof window.initTiktokShopDashboard === 'function') {
        window.initTikTokShopDashboard = window.initTiktokShopDashboard;
        window.initTiktokDashboard = window.initTiktokShopDashboard;
        window.initTikTokDashboard = window.initTiktokShopDashboard;
    }

})();

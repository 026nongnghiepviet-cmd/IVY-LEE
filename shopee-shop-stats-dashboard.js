/**
 * SHOPEE SHOP STATS DASHBOARD V1.5.3 - ADS METRICS SEPARATED
 * Dùng cho file Shopee Seller Center: *.shopee-shop-stats.YYYYMMDD-YYYYMMDD.xlsx
 * - Chỉ đọc KPI từ sheet/nhóm "Đơn đã xác nhận"
 * - Tự đọc Chi phí Ads Shopee từ Dịch vụ Hiển thị Shopee / Chi phí quảng cáo
 * - Click KPI / biểu đồ / sản phẩm để xem popup chi tiết
 * - Bộ lọc thời gian theo ngày trong kỳ file
 * - Thống kê sản phẩm theo Mã sản phẩm/SKU, có chi tiết theo nguồn
 * - Lưu Firebase: shopee_shop_stats_logs, shopee_shop_stats_latest
 */
(function () {
    'use strict';

    var SHOPEE_STATS_VERSION = 'V1.5.3_ADS_METRICS_TACH_RIENG';
    var SHOPEE_COMPANIES = [
        { id: 'NNV', name: 'Nông Nghiệp Việt' },
        { id: 'VN', name: 'Việt Nhật' },
        { id: 'KF', name: 'King Farm' },
        { id: 'ABC', name: 'ABC Việt Nam' }
    ];

    var SHOPEE_STATE = {
        company: 'NNV',
        current: null,
        history: [],
        db: null,
        charts: {},
        dateFrom: '',
        dateTo: '',
        productSearch: '',
        viewMode: 'all',
        quickFilter: 'all'
    };

    var TOP_SECTIONS = {
        'Thẻ sản phẩm': 'Thẻ sản phẩm',
        'Live': 'Livestream',
        'Video': 'Video',
        'Tiếp thị liên kết': 'Tiếp thị liên kết',
        'Dịch vụ Hiển thị Shopee': 'Quảng cáo Shopee'
    };

    function getDb() {
        if (!SHOPEE_STATE.db && typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            SHOPEE_STATE.db = firebase.database();
        }
        return SHOPEE_STATE.db;
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

    function parseVNNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;
        var s = String(value).trim();
        if (!s || s === '-') return 0;
        s = s.replace(/%/g, '').replace(/\s/g, '');
        if (s.indexOf(',') !== -1) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
            else if (/^-?\d+\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
        }
        var n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    function fmtMoney(n) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' đ';
    }

    function fmtNum(n, d) {
        d = d === undefined ? 0 : d;
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d, minimumFractionDigits: d }).format(Number(n) || 0);
    }

    function fmtPct(n) { return fmtNum(n, 2) + '%'; }

    function normalizeDate(value) {
        var s = safeText(value).trim();
        if (!s) return '';
        var m;
        if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) {
            return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
        }
        if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) {
            return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
        }
        return s;
    }

    function displayDate(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
    }

    function isShopeeDateLabel(value) {
        var s = safeText(value).trim();
        return /^\d{1,2}-\d{1,2}-\d{4}$/.test(s) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s);
    }

    function inDateRange(dateISO) {
        if (!dateISO) return true;
        if (SHOPEE_STATE.dateFrom && dateISO < SHOPEE_STATE.dateFrom) return false;
        if (SHOPEE_STATE.dateTo && dateISO > SHOPEE_STATE.dateTo) return false;
        return true;
    }

    function hasDateFilter() { return !!(SHOPEE_STATE.dateFrom || SHOPEE_STATE.dateTo); }

    function isAllFilesMode() { return SHOPEE_STATE.viewMode === 'all' || hasDateFilter(); }

    function toISODate(d) {
        if (!(d instanceof Date) || isNaN(d.getTime())) return '';
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function startOfWeekMonday(d) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var day = x.getDay();
        var diff = (day === 0 ? -6 : 1) - day;
        x.setDate(x.getDate() + diff);
        return x;
    }

    function addDays(d, days) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        x.setDate(x.getDate() + days);
        return x;
    }

    function isShopeeStatsDeleteAllowed() {
        if (window.myIdentity === 'SUPER_ADMIN') return true;
        if (!window.SYS_DB_USERS || !window.myIdentity) return false;
        for (var k in window.SYS_DB_USERS) {
            if (!Object.prototype.hasOwnProperty.call(window.SYS_DB_USERS, k)) continue;
            var u = window.SYS_DB_USERS[k] || {};
            if (u.name === window.myIdentity && (u.role === 'admin' || u.role === 'boss')) return true;
        }
        return false;
    }

    function getContainer() {
        return document.getElementById('ecom-dashboard-container') ||
               document.getElementById('shopee-shop-dashboard-container') ||
               document.getElementById('shopee-dashboard-container') ||
               document.getElementById('page-ecom-main') ||
               document.getElementById('page-shopee');
    }

    function toast(message, type) {
        if (typeof window.showToast === 'function') { window.showToast(message); return; }
        var box = document.getElementById('shopee-stats-toast');
        if (!box) {
            box = document.createElement('div');
            box.id = 'shopee-stats-toast';
            box.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:100005;background:#0f172a;color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;box-shadow:0 15px 35px rgba(15,23,42,.25);display:none;';
            document.body.appendChild(box);
        }
        box.innerText = message;
        box.style.background = type === 'error' ? '#dc2626' : (type === 'success' ? '#16a34a' : '#0f172a');
        box.style.display = 'block';
        setTimeout(function () { box.style.display = 'none'; }, 3000);
    }

    function normalizeSheetRows(workbook, sheetName) {
        var sheet = workbook.Sheets[sheetName];
        if (!sheet) return [];
        return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
    }

    function buildHeaderMap(headerRow) {
        var map = {};
        (headerRow || []).forEach(function (h, idx) {
            if (h !== null && h !== undefined && String(h).trim() !== '') map[String(h).trim().toLowerCase()] = idx;
        });
        return map;
    }

    function getByHeader(row, headerMap, headerName) {
        var idx = headerMap[String(headerName).trim().toLowerCase()];
        return idx === undefined ? null : row[idx];
    }

    function firstAvailable(row, headerMap, names) {
        for (var i = 0; i < names.length; i++) {
            var v = getByHeader(row, headerMap, names[i]);
            if (v !== null && v !== undefined && v !== '') return v;
        }
        return null;
    }

    function parseOrderSheet(rows, label) {
        if (!rows || rows.length < 2) return null;
        var summaryHeader = buildHeaderMap(rows[0] || []);
        var summaryRow = rows[1] || [];
        var summary = {
            label: label,
            period: safeText(getByHeader(summaryRow, summaryHeader, 'Ngày')),
            revenue: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Tổng doanh số (VND)')),
            revenueNoShopeeSubsidy: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Doanh số không bao gồm trợ giá bởi Shopee')),
            orders: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Tổng số đơn hàng')),
            avgOrderValue: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Doanh số trên mỗi đơn hàng')),
            productClicks: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Lượt nhấp vào sản phẩm')),
            visits: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Số lượt truy cập')),
            conversionRate: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Tỷ lệ chuyển đổi đơn hàng')),
            cancelledOrders: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Đơn đã hủy')),
            cancelledRevenue: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Doanh số đơn hủy')),
            returnedOrders: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Đơn đã hoàn trả / hoàn tiền')),
            returnedRevenue: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Doanh số các đơn Trả hàng/Hoàn tiền')),
            buyers: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'số người mua')),
            newBuyers: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'số người mua mới')),
            existingBuyers: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'số người mua hiện tại')),
            potentialBuyers: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'số người mua tiềm năng')),
            returnBuyerRate: parseVNNumber(getByHeader(summaryRow, summaryHeader, 'Tỉ lệ quay lại của người mua'))
        };

        var headerIdx = -1;
        for (var i = 2; i < rows.length; i++) {
            if (safeText(rows[i] && rows[i][0]).trim().toLowerCase() === 'ngày') { headerIdx = i; break; }
        }
        var daily = [];
        if (headerIdx !== -1) {
            var dailyHeader = buildHeaderMap(rows[headerIdx] || []);
            for (var r = headerIdx + 1; r < rows.length; r++) {
                var row = rows[r] || [];
                var date = safeText(row[0]).trim();
                if (!date) continue;
                daily.push({
                    date: date,
                    dateISO: normalizeDate(date),
                    revenue: parseVNNumber(getByHeader(row, dailyHeader, 'Tổng doanh số (VND)')),
                    orders: parseVNNumber(getByHeader(row, dailyHeader, 'Tổng số đơn hàng')),
                    clicks: parseVNNumber(getByHeader(row, dailyHeader, 'Lượt nhấp vào sản phẩm')),
                    visits: parseVNNumber(getByHeader(row, dailyHeader, 'Số lượt truy cập')),
                    conversionRate: parseVNNumber(getByHeader(row, dailyHeader, 'Tỷ lệ chuyển đổi đơn hàng')),
                    buyers: parseVNNumber(getByHeader(row, dailyHeader, 'số người mua')),
                    newBuyers: parseVNNumber(getByHeader(row, dailyHeader, 'số người mua mới')),
                    existingBuyers: parseVNNumber(getByHeader(row, dailyHeader, 'số người mua hiện tại')),
                    cancelledOrders: parseVNNumber(getByHeader(row, dailyHeader, 'Đơn đã hủy')),
                    returnedOrders: parseVNNumber(getByHeader(row, dailyHeader, 'Đơn đã hoàn trả / hoàn tiền'))
                });
            }
        }
        return { summary: summary, daily: daily };
    }

    function findTrafficSheet(workbook, orderLabel) {
        var sheetNames = workbook.SheetNames || [];
        for (var i = 0; i < sheetNames.length; i++) {
            var rows = normalizeSheetRows(workbook, sheetNames[i]);
            if (!rows || rows.length < 2) continue;
            var row0 = (rows[0] || []).join('|').toLowerCase();
            var row1Label = safeText(rows[1] && rows[1][1]).toLowerCase();
            if (row0.indexOf('doanh thu từ quảng cáo shopee') !== -1 && row1Label.indexOf(orderLabel.toLowerCase()) !== -1 && sheetNames[i].toLowerCase().indexOf('sản phẩm') === -1) {
                return { name: sheetNames[i], rows: rows };
            }
        }
        return null;
    }

    function findDetailedTrafficDailySheet(workbook) {
        var sheetNames = workbook.SheetNames || [];
        for (var i = 0; i < sheetNames.length; i++) {
            var n = sheetNames[i].toLowerCase();
            if (n.indexOf('đơn đã xác nhận') !== -1 && n.indexOf('theo nguồn') !== -1) {
                return { name: sheetNames[i], rows: normalizeSheetRows(workbook, sheetNames[i]) };
            }
        }
        return null;
    }

    function parseTrafficSheet(rows) {
        if (!rows || rows.length < 2) return { summary: {}, sources: [], adCampaigns: [] };
        var h0 = buildHeaderMap(rows[0] || []);
        var v0 = rows[1] || [];
        var summary = {
            period: safeText(getByHeader(v0, h0, 'Ngày')),
            orderType: safeText(getByHeader(v0, h0, 'Loại Đơn Hàng')),
            revenue: parseVNNumber(getByHeader(v0, h0, 'Doanh số (VND)')),
            productCardRevenue: parseVNNumber(getByHeader(v0, h0, 'Doanh thu từ thẻ sản phẩm')),
            livestreamRevenue: parseVNNumber(getByHeader(v0, h0, 'Doanh thu từ Livestream của người bán')),
            videoRevenue: parseVNNumber(getByHeader(v0, h0, 'Doanh thu từ Video của người bán')),
            affiliateRevenue: parseVNNumber(getByHeader(v0, h0, 'Doanh thu từ đối tác liên kết')),
            shopeeAdsRevenue: parseVNNumber(getByHeader(v0, h0, 'Doanh thu từ quảng cáo Shopee')),
            shopeeAdsCost: 0,
            shopeeAdsOrders: 0,
            shopeeAdsImpressions: 0,
            shopeeAdsRoas: 0
        };

        var sources = [];
        var currentSection = '';
        var headerMap = null;
        var adCampaigns = [];
        var inAdsSection = false;

        for (var i = 2; i < rows.length; i++) {
            var row = rows[i] || [];
            var first = safeText(row[0]).trim();
            if (!first) continue;

            var low = first.toLowerCase();
            var nextFirst = safeText(rows[i + 1] && rows[i + 1][0]).trim().toLowerCase();

            // Tên khu vực lớn: Thẻ sản phẩm / Live / Video / Tiếp thị liên kết / Dịch vụ Hiển thị Shopee
            if (nextFirst === 'nguồn lưu lượng') {
                currentSection = first;
                headerMap = null;
                inAdsSection = currentSection.toLowerCase().indexOf('dịch vụ hiển thị shopee') !== -1;
                continue;
            }

            // Header của từng khu vực
            if (low === 'nguồn lưu lượng') {
                headerMap = buildHeaderMap(row);
                continue;
            }

            if (!headerMap) continue;

            // Dòng tổng/campaign của từng khu vực. Không lấy dòng ngày ở sheet tổng nguồn.
            if (isShopeeDateLabel(first)) continue;

            if (inAdsSection) {
                // Chỉ lấy đúng các dòng trong khu vực Dịch vụ Hiển thị Shopee
                // gồm: Quảng cáo GMV tối đa ROAS tùy chỉnh cho sản phẩm,
                // Product Ads (GMV Max-Shop),
                // Quảng cáo GMV tối đa tự động đấu thầu cho sản phẩm.
                var cost = parseVNNumber(getByHeader(row, headerMap, 'Chi phí quảng cáo'));
                var revenue = parseVNNumber(getByHeader(row, headerMap, 'Doanh số (VND)'));
                var orders = parseVNNumber(getByHeader(row, headerMap, 'Tổng số đơn hàng'));
                var impressions = parseVNNumber(getByHeader(row, headerMap, 'Ads Impression'));
                var roas = parseVNNumber(getByHeader(row, headerMap, 'ROAS quảng cáo'));
                if (cost === 0 && revenue === 0 && orders === 0 && impressions === 0) continue;
                adCampaigns.push({
                    campaign: first,
                    revenueShare: parseVNNumber(getByHeader(row, headerMap, 'Tỷ lệ doanh số')),
                    revenue: revenue,
                    impressions: impressions,
                    orders: orders,
                    conversionRate: parseVNNumber(getByHeader(row, headerMap, 'Tỷ lệ chuyển đổi')),
                    adCost: cost,
                    adRoas: roas
                });
            } else {
                var src = first;
                if (src.toLowerCase().indexOf('nguồn lưu lượng') !== -1) continue;
                sources.push({
                    section: currentSection || src,
                    source: src,
                    revenueShare: parseVNNumber(getByHeader(row, headerMap, 'Tỷ lệ doanh số')),
                    revenue: parseVNNumber(getByHeader(row, headerMap, 'Doanh số (VND)')),
                    impressions: parseVNNumber(firstAvailable(row, headerMap, ['Lượt hiển thị sản phẩm', 'Lượt xem Livestream', 'Lượt xem Video', 'Lượt xem nội dung'])),
                    clicks: parseVNNumber(getByHeader(row, headerMap, 'Lượt nhấp vào sản phẩm')),
                    orders: parseVNNumber(getByHeader(row, headerMap, 'Tổng số đơn hàng')),
                    products: parseVNNumber(getByHeader(row, headerMap, 'Sản phẩm')),
                    ctr: parseVNNumber(getByHeader(row, headerMap, 'CTR')),
                    conversionRate: parseVNNumber(getByHeader(row, headerMap, 'Tỷ lệ chuyển đổi đơn hàng')),
                    avgOrderValue: parseVNNumber(getByHeader(row, headerMap, 'Doanh số trên mỗi đơn hàng')),
                    buyers: parseVNNumber(getByHeader(row, headerMap, 'Người mua'))
                });
            }
        }

        summary.shopeeAdsCost = adCampaigns.reduce(function (sum, x) { return sum + (x.adCost || 0); }, 0);
        summary.shopeeAdsOrders = adCampaigns.reduce(function (sum, x) { return sum + (x.orders || 0); }, 0);
        summary.shopeeAdsImpressions = adCampaigns.reduce(function (sum, x) { return sum + (x.impressions || 0); }, 0);
        summary.shopeeAdsRoas = summary.shopeeAdsCost > 0 ? summary.shopeeAdsRevenue / summary.shopeeAdsCost : 0;
        return { summary: summary, sources: sources, adCampaigns: adCampaigns };
    }

    function parseDetailedTrafficDaily(rows) {
        var daily = [];
        if (!rows || !rows.length) return daily;
        var headerMap = null;
        var currentSection = '';
        var currentSource = '';
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i] || [];
            var first = safeText(row[0]).trim();
            if (!first) continue;
            var low = first.toLowerCase();
            if (low === 'nguồn lưu lượng') {
                headerMap = buildHeaderMap(row);
                continue;
            }
            if (!headerMap) continue;
            if (isShopeeDateLabel(first)) {
                if (!currentSource) continue;
                var clicks = parseVNNumber(getByHeader(row, headerMap, 'Lượt nhấp vào sản phẩm'));
                var impressions = parseVNNumber(firstAvailable(row, headerMap, ['Lượt hiển thị sản phẩm', 'Lượt xem Livestream', 'Lượt xem Video', 'Lượt xem nội dung', 'Ads Impression']));
                var adCost = parseVNNumber(getByHeader(row, headerMap, 'Chi phí quảng cáo'));
                var revenue = parseVNNumber(getByHeader(row, headerMap, 'Doanh số (VND)'));
                var orders = parseVNNumber(getByHeader(row, headerMap, 'Tổng số đơn hàng'));
                daily.push({
                    section: currentSection || currentSource,
                    source: currentSource,
                    date: first,
                    dateISO: normalizeDate(first),
                    revenueShare: parseVNNumber(getByHeader(row, headerMap, 'Tỷ lệ doanh số')),
                    revenue: revenue,
                    impressions: impressions,
                    clicks: clicks,
                    orders: orders,
                    products: parseVNNumber(getByHeader(row, headerMap, 'Sản phẩm')),
                    ctr: parseVNNumber(getByHeader(row, headerMap, 'CTR')),
                    conversionRate: parseVNNumber(firstAvailable(row, headerMap, ['Tỷ lệ chuyển đổi đơn hàng', 'Tỷ lệ chuyển đổi'])),
                    avgOrderValue: parseVNNumber(getByHeader(row, headerMap, 'Doanh số trên mỗi đơn hàng')),
                    buyers: parseVNNumber(getByHeader(row, headerMap, 'Người mua')),
                    adCost: adCost,
                    adRoas: parseVNNumber(getByHeader(row, headerMap, 'ROAS quảng cáo'))
                });
                continue;
            }
            var hasMetrics = row.slice(1).some(function (x) { return x !== null && x !== undefined && String(x).trim() !== ''; });
            var nextFirst = safeText(rows[i + 1] && rows[i + 1][0]).trim().toLowerCase();
            if (nextFirst === 'nguồn lưu lượng') {
                currentSection = first;
                continue;
            }
            if (hasMetrics) {
                currentSource = first;
                if (!currentSection) currentSection = first;
            } else {
                currentSection = first;
            }
        }
        return daily;
    }

    function findProductSheet(workbook, orderLabel) {
        var sheetNames = workbook.SheetNames || [];
        for (var i = 0; i < sheetNames.length; i++) {
            var name = sheetNames[i];
            if (name.toLowerCase().indexOf('sản phẩm') === -1) continue;
            var rows = normalizeSheetRows(workbook, name);
            var row1Label = safeText(rows[1] && rows[1][1]).toLowerCase();
            if (row1Label.indexOf(orderLabel.toLowerCase()) !== -1) return { name: name, rows: rows };
        }
        return null;
    }

    function parseProductSheet(rows) {
        var products = [];
        if (!rows) return { rows: [], bySku: [] };

        var currentSource = '';
        var headerCfg = null;

        function norm(v) {
            return safeText(v).trim().toLowerCase();
        }

        function isSectionName(v) {
            var s = norm(v);
            return ['thẻ sản phẩm', 'live', 'video', 'tiếp thị liên kết', 'dịch vụ hiển thị shopee'].indexOf(s) !== -1;
        }

        function isHeaderName(v) {
            var s = norm(v);
            return ['mã sản phẩm', 'sản phẩm', 'tình trạng sản phẩm hiện tại', 'tỷ lệ doanh số', 'doanh số (vnd)', 'nguồn lưu lượng'].indexOf(s) !== -1;
        }

        function isRealSku(v) {
            var s = safeText(v).trim();
            // Mã sản phẩm Shopee là chuỗi số. Chỉ nhận dòng có SKU thật, tránh nhầm "Video", "Live", "Mã sản phẩm".
            return /^\d{6,}$/.test(s);
        }

        function findHeaderIndex(headerRow, headerName, occurrence) {
            var target = norm(headerName);
            var count = 0;
            occurrence = occurrence || 1;
            for (var c = 0; c < (headerRow || []).length; c++) {
                if (norm(headerRow[c]) === target) {
                    count++;
                    if (count === occurrence) return c;
                }
            }
            return -1;
        }

        function findAnyHeaderIndex(headerRow, names) {
            for (var n = 0; n < names.length; n++) {
                var idx = findHeaderIndex(headerRow, names[n], 1);
                if (idx !== -1) return idx;
            }
            return -1;
        }

        function cell(row, idx) {
            return (idx === undefined || idx === null || idx < 0) ? null : row[idx];
        }

        function buildProductHeader(headerRow) {
            return {
                sku: findHeaderIndex(headerRow, 'Mã sản phẩm', 1),
                // Cột "Sản phẩm" xuất hiện 2 lần: lần 1 là TÊN SẢN PHẨM, lần 2 là SỐ LƯỢNG SẢN PHẨM.
                // Vì vậy không dùng buildHeaderMap thường, tránh lấy nhầm cột số lượng.
                name: findHeaderIndex(headerRow, 'Sản phẩm', 1),
                status: findHeaderIndex(headerRow, 'Tình trạng sản phẩm hiện tại', 1),
                revenueShare: findHeaderIndex(headerRow, 'Tỷ lệ doanh số', 1),
                revenue: findHeaderIndex(headerRow, 'Doanh số (VND)', 1),
                impressions: findAnyHeaderIndex(headerRow, ['Lượt hiển thị sản phẩm', 'Lượt xem Livestream', 'Lượt xem Video', 'Lượt xem nội dung']),
                clicks: findHeaderIndex(headerRow, 'Lượt nhấp vào sản phẩm', 1),
                orders: findHeaderIndex(headerRow, 'Tổng số đơn hàng', 1),
                soldProducts: findHeaderIndex(headerRow, 'Sản phẩm', 2),
                ctr: findHeaderIndex(headerRow, 'CTR', 1),
                conversionRate: findHeaderIndex(headerRow, 'Tỷ lệ chuyển đổi đơn hàng', 1),
                avgOrderValue: findHeaderIndex(headerRow, 'Doanh số trên mỗi đơn hàng', 1),
                buyers: findHeaderIndex(headerRow, 'Người mua', 1),
                uniqueImpressions: findAnyHeaderIndex(headerRow, ['Lượt hiển thị sản phẩm duy nhất', 'Người xem Livestream', 'Người xem Video', 'Người xem nội dung']),
                uniqueClicks: findHeaderIndex(headerRow, 'Lượt nhấp sản phẩm duy nhất', 1)
            };
        }

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i] || [];
            var first = safeText(row[0]).trim();
            if (!first) continue;

            var low = first.toLowerCase();
            var nextFirst = safeText(rows[i + 1] && rows[i + 1][0]).trim().toLowerCase();

            // Tên khu vực nguồn: Thẻ sản phẩm / Live / Video / Tiếp thị liên kết.
            // Chỉ dùng làm "nguồn", tuyệt đối không coi là sản phẩm.
            if (isSectionName(first) && nextFirst === 'mã sản phẩm') {
                currentSource = first;
                headerCfg = null;
                continue;
            }

            // Header của mỗi khu vực sản phẩm.
            if (low === 'mã sản phẩm') {
                headerCfg = buildProductHeader(row);
                continue;
            }

            if (!headerCfg) continue;

            var sku = safeText(cell(row, headerCfg.sku)).trim();
            var name = safeText(cell(row, headerCfg.name)).trim();

            // Chốt chặn chống nhầm nguồn/header thành sản phẩm.
            if (!isRealSku(sku)) continue;
            if (!name || isSectionName(name) || isHeaderName(name)) continue;
            if (/^[\d\s.,%-]+$/.test(name)) continue; // tên không được là số/chỉ số
            if (currentSource && currentSource.toLowerCase().indexOf('dịch vụ hiển thị shopee') !== -1) continue;

            products.push({
                sku: sku,
                productName: name,
                source: currentSource || 'Không rõ nguồn',
                status: safeText(cell(row, headerCfg.status)).trim(),
                revenueShare: parseVNNumber(cell(row, headerCfg.revenueShare)),
                revenue: parseVNNumber(cell(row, headerCfg.revenue)),
                impressions: parseVNNumber(cell(row, headerCfg.impressions)),
                clicks: parseVNNumber(cell(row, headerCfg.clicks)),
                orders: parseVNNumber(cell(row, headerCfg.orders)),
                soldProducts: parseVNNumber(cell(row, headerCfg.soldProducts)),
                ctr: parseVNNumber(cell(row, headerCfg.ctr)),
                conversionRate: parseVNNumber(cell(row, headerCfg.conversionRate)),
                avgOrderValue: parseVNNumber(cell(row, headerCfg.avgOrderValue)),
                buyers: parseVNNumber(cell(row, headerCfg.buyers)),
                uniqueImpressions: parseVNNumber(cell(row, headerCfg.uniqueImpressions)),
                uniqueClicks: parseVNNumber(cell(row, headerCfg.uniqueClicks))
            });
        }

        return { rows: products, bySku: aggregateProductsBySku(products) };
    }

    function aggregateProductsBySku(rows) {
        var map = {};
        rows.forEach(function (p) {
            var sku = p.sku || 'NO-SKU';
            if (!map[sku]) {
                map[sku] = {
                    sku: sku,
                    productName: p.productName || '',
                    status: p.status || '',
                    revenue: 0,
                    impressions: 0,
                    clicks: 0,
                    orders: 0,
                    soldProducts: 0,
                    buyers: 0,
                    sourcesMap: {},
                    aliasesMap: {}
                };
            }
            var g = map[sku];
            if (p.productName) g.aliasesMap[p.productName] = (g.aliasesMap[p.productName] || 0) + (p.revenue || 0);
            if (!g.productName || (p.revenue || 0) > (g.bestRevenue || 0)) { g.productName = p.productName; g.bestRevenue = p.revenue || 0; }
            g.status = g.status || p.status;
            g.revenue += p.revenue || 0;
            g.impressions += p.impressions || 0;
            g.clicks += p.clicks || 0;
            g.orders += p.orders || 0;
            g.soldProducts += p.soldProducts || 0;
            g.buyers += p.buyers || 0;
            var src = p.source || 'Không rõ nguồn';
            if (!g.sourcesMap[src]) g.sourcesMap[src] = { source: src, revenue: 0, impressions: 0, clicks: 0, orders: 0, soldProducts: 0, buyers: 0 };
            g.sourcesMap[src].revenue += p.revenue || 0;
            g.sourcesMap[src].impressions += p.impressions || 0;
            g.sourcesMap[src].clicks += p.clicks || 0;
            g.sourcesMap[src].orders += p.orders || 0;
            g.sourcesMap[src].soldProducts += p.soldProducts || 0;
            g.sourcesMap[src].buyers += p.buyers || 0;
        });
        return Object.keys(map).map(function (sku) {
            var g = map[sku];
            g.ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
            g.conversionRate = g.clicks > 0 ? (g.orders / g.clicks) * 100 : 0;
            g.avgOrderValue = g.orders > 0 ? g.revenue / g.orders : 0;
            g.sources = Object.keys(g.sourcesMap).map(function (k) {
                var s = g.sourcesMap[k];
                s.ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
                s.conversionRate = s.clicks > 0 ? (s.orders / s.clicks) * 100 : 0;
                s.avgOrderValue = s.orders > 0 ? s.revenue / s.orders : 0;
                return s;
            }).sort(function (a, b) { return b.revenue - a.revenue; });
            g.aliases = Object.keys(g.aliasesMap).sort(function (a, b) { return g.aliasesMap[b] - g.aliasesMap[a]; });
            delete g.sourcesMap; delete g.aliasesMap; delete g.bestRevenue;
            return g;
        }).sort(function (a, b) { return b.revenue - a.revenue; });
    }

    function parseShopeeShopStatsWorkbook(workbook, fileName) {
        var confirmed = parseOrderSheet(normalizeSheetRows(workbook, 'Đơn đã xác nhận'), 'Đơn đã xác nhận');
        if (!confirmed) throw new Error('File chưa đúng định dạng Shopee Shop Stats. Cần có sheet: Đơn đã xác nhận.');

        var trafficConfirmedSheet = findTrafficSheet(workbook, 'Đơn đã xác nhận');
        var trafficDailySheet = findDetailedTrafficDailySheet(workbook);
        var productConfirmedSheet = findProductSheet(workbook, 'Đơn đã xác nhận');

        var trafficConfirmed = trafficConfirmedSheet ? parseTrafficSheet(trafficConfirmedSheet.rows) : { summary: {}, sources: [], adCampaigns: [] };
        var sourceDaily = trafficDailySheet ? parseDetailedTrafficDaily(trafficDailySheet.rows) : [];
        var parsedProducts = productConfirmedSheet ? parseProductSheet(productConfirmedSheet.rows) : { rows: [], bySku: [] };

        var confirmedSummary = confirmed.summary;
        var adsRevenue = trafficConfirmed.summary.shopeeAdsRevenue || 0;
        var adsCostFromFile = trafficConfirmed.summary.shopeeAdsCost || 0;
        var adSpend = adsCostFromFile;
        var adSpendSource = adsCostFromFile > 0 ? 'file_auto' : 'none';
        var adsOrders = trafficConfirmed.summary.shopeeAdsOrders || 0;
        var adsImpressions = trafficConfirmed.summary.shopeeAdsImpressions || 0;
        var adsConversionRate = adsImpressions > 0 ? (adsOrders / adsImpressions) * 100 : 0;
        var adsCpa = adSpend > 0 && adsOrders > 0 ? adSpend / adsOrders : 0;
        var roasAdsRevenue = adSpend > 0 ? adsRevenue / adSpend : 0;
        var cpa = adsCpa; // Giữ key cpa để tương thích dữ liệu cũ, nhưng công thức mới là CPA Ads.
        var roasOverall = roasAdsRevenue; // Giữ key cũ, nhưng không còn lấy doanh thu toàn shop.
        var cancelRate = confirmedSummary.orders > 0 ? (confirmedSummary.cancelledOrders / confirmedSummary.orders) * 100 : 0;
        var returnRate = confirmedSummary.orders > 0 ? (confirmedSummary.returnedOrders / confirmedSummary.orders) * 100 : 0;

        return {
            version: SHOPEE_STATS_VERSION,
            dataMode: 'confirmed_only',
            sourceSheet: 'Đơn đã xác nhận',
            fileName: fileName,
            company: SHOPEE_STATE.company,
            uploader: window.myIdentity || 'Ẩn danh',
            uploadedAt: new Date().toISOString(),
            period: confirmedSummary.period,
            adSpend: adSpend,
            adSpendSource: adSpendSource,
            adsCostFromFile: adsCostFromFile,
            metrics: {
                confirmedRevenue: confirmedSummary.revenue,
                revenueNoShopeeSubsidy: confirmedSummary.revenueNoShopeeSubsidy,
                confirmedOrders: confirmedSummary.orders,
                avgOrderValue: confirmedSummary.avgOrderValue,
                productClicks: confirmedSummary.productClicks,
                visits: confirmedSummary.visits,
                conversionRate: confirmedSummary.conversionRate,
                buyers: confirmedSummary.buyers,
                newBuyers: confirmedSummary.newBuyers,
                existingBuyers: confirmedSummary.existingBuyers,
                potentialBuyers: confirmedSummary.potentialBuyers,
                returnBuyerRate: confirmedSummary.returnBuyerRate,
                cancelledOrders: confirmedSummary.cancelledOrders,
                cancelledRevenue: confirmedSummary.cancelledRevenue,
                returnedOrders: confirmedSummary.returnedOrders,
                returnedRevenue: confirmedSummary.returnedRevenue,
                cancelRate: cancelRate,
                returnRate: returnRate,
                adsRevenue: adsRevenue,
                adsCostFromFile: adsCostFromFile,
                adSpend: adSpend,
                adSpendSource: adSpendSource,
                shopeeAdsOrders: adsOrders,
                shopeeAdsImpressions: adsImpressions,
                adsConversionRate: adsConversionRate,
                adsCpa: adsCpa,
                shopeeAdsRoasFromFile: trafficConfirmed.summary.shopeeAdsRoas || 0,
                cpa: cpa,
                roasOverall: roasOverall,
                roasAdsRevenue: roasAdsRevenue
            },
            orders: { confirmed: confirmed },
            traffic: {
                confirmed: trafficConfirmed,
                adCampaigns: trafficConfirmed.adCampaigns || [],
                sourceDaily: sourceDaily
            },
            products: {
                confirmed: parsedProducts.bySku,
                confirmedRaw: parsedProducts.rows
            }
        };
    }

    function sumRows(rows, field) { return (rows || []).reduce(function (s, x) { return s + (Number(x[field]) || 0); }, 0); }

    function groupRows(rows, keyFn) {
        var map = {};
        (rows || []).forEach(function (x) {
            var key = keyFn(x);
            if (!key) return;
            if (!map[key]) map[key] = { key: key, revenue: 0, impressions: 0, clicks: 0, orders: 0, products: 0, buyers: 0, adCost: 0 };
            map[key].revenue += x.revenue || 0;
            map[key].impressions += x.impressions || 0;
            map[key].clicks += x.clicks || 0;
            map[key].orders += x.orders || 0;
            map[key].products += x.products || 0;
            map[key].buyers += x.buyers || 0;
            map[key].adCost += x.adCost || 0;
        });
        return Object.keys(map).map(function (k) {
            var g = map[k];
            g.ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
            var isAdsRow = (g.adCost || 0) > 0 || String(g.key || '').toLowerCase().indexOf('quảng cáo') !== -1 || String(g.key || '').toLowerCase().indexOf('ads') !== -1;
            g.conversionRate = g.clicks > 0 ? (g.orders / g.clicks) * 100 : (isAdsRow && g.impressions > 0 ? (g.orders / g.impressions) * 100 : 0);
            g.adsConversionRate = isAdsRow && g.impressions > 0 ? (g.orders / g.impressions) * 100 : 0;
            g.adsCpa = isAdsRow && g.adCost > 0 && g.orders > 0 ? g.adCost / g.orders : 0;
            g.avgOrderValue = g.orders > 0 ? g.revenue / g.orders : 0;
            g.roas = g.adCost > 0 ? g.revenue / g.adCost : 0;
            return g;
        }).sort(function (a, b) { return b.revenue - a.revenue || b.adCost - a.adCost; });
    }

    function uniqueStatsRecords() {
        var map = {};
        (SHOPEE_STATE.history || []).forEach(function (item) {
            if (!item) return;
            var id = item.batchId || (item.fileName + '|' + item.uploadedAt);
            map[id] = item;
        });
        if (SHOPEE_STATE.current) {
            var cid = SHOPEE_STATE.current.batchId || (SHOPEE_STATE.current.fileName + '|' + SHOPEE_STATE.current.uploadedAt) || 'current';
            map[cid] = SHOPEE_STATE.current;
        }
        return Object.keys(map).map(function (k) { return map[k]; })
            .filter(function (x) { return !x.company || x.company === SHOPEE_STATE.company; })
            .sort(function (a, b) { return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0); });
    }

    function recordHasDateInRange(record) {
        if (!record) return false;
        if (!hasDateFilter()) return true;
        var daily = (record.orders && record.orders.confirmed && record.orders.confirmed.daily) || [];
        return daily.some(function (d) { return inDateRange(d.dateISO); });
    }

    function aggregateProductsAcrossRecords(records) {
        var raw = [];
        (records || []).forEach(function (record) {
            var products = (record.products && record.products.confirmed) || [];
            products.forEach(function (p) {
                var copy = Object.assign({}, p);
                copy.sources = (p.sources || []).map(function (s) { return Object.assign({}, s); });
                raw.push(copy);
            });
        });
        var expanded = [];
        raw.forEach(function (p) {
            if (p.sources && p.sources.length) {
                p.sources.forEach(function (s) {
                    expanded.push({
                        sku: p.sku,
                        productName: p.productName,
                        status: p.status,
                        source: s.source,
                        revenue: s.revenue || 0,
                        impressions: s.impressions || 0,
                        clicks: s.clicks || 0,
                        orders: s.orders || 0,
                        soldProducts: s.soldProducts || 0,
                        buyers: s.buyers || 0
                    });
                });
            } else {
                expanded.push({
                    sku: p.sku,
                    productName: p.productName,
                    status: p.status,
                    source: 'Không rõ nguồn',
                    revenue: p.revenue || 0,
                    impressions: p.impressions || 0,
                    clicks: p.clicks || 0,
                    orders: p.orders || 0,
                    soldProducts: p.soldProducts || 0,
                    buyers: p.buyers || 0
                });
            }
        });
        return aggregateProductsBySku(expanded);
    }

    function aggregateViewFromRecords(records) {
        records = records || [];
        var dailyRaw = [];
        var sourceDailyRaw = [];
        var productRecords = [];
        var adCampaignRows = [];
        var summarySourceMap = {};
        var fileNames = [];
        var uploadIds = [];

        records.forEach(function (record) {
            if (!record) return;
            var dailyAll = (record.orders && record.orders.confirmed && record.orders.confirmed.daily) || [];
            var daily = dailyAll.filter(function (d) { return !hasDateFilter() || inDateRange(d.dateISO); });
            if (hasDateFilter() && daily.length === 0) return;

            dailyRaw = dailyRaw.concat(daily);
            sourceDailyRaw = sourceDailyRaw.concat(((record.traffic && record.traffic.sourceDaily) || []).filter(function (d) { return !hasDateFilter() || inDateRange(d.dateISO); }));
            productRecords.push(record);
            fileNames.push(record.fileName || 'File Shopee');
            uploadIds.push(record.batchId || '');

            var s = (record.traffic && record.traffic.confirmed && record.traffic.confirmed.summary) || {};
            [
                { key: 'Thẻ sản phẩm', revenue: s.productCardRevenue || 0, adCost: 0 },
                { key: 'Livestream', revenue: s.livestreamRevenue || 0, adCost: 0 },
                { key: 'Video', revenue: s.videoRevenue || 0, adCost: 0 },
                { key: 'Tiếp thị liên kết', revenue: s.affiliateRevenue || 0, adCost: 0 },
                { key: 'Quảng cáo Shopee', revenue: s.shopeeAdsRevenue || 0, adCost: s.shopeeAdsCost || ((record.metrics && record.metrics.adsCostFromFile) || 0) }
            ].forEach(function (x) {
                if (!summarySourceMap[x.key]) summarySourceMap[x.key] = { key: x.key, revenue: 0, adCost: 0, orders: 0, clicks: 0, impressions: 0, buyers: 0, products: 0 };
                summarySourceMap[x.key].revenue += x.revenue || 0;
                summarySourceMap[x.key].adCost += x.adCost || 0;
            });

            ((record.traffic && record.traffic.adCampaigns) || []).forEach(function (a) {
                var key = a.campaign || a.key || 'Chiến dịch Ads';
                adCampaignRows.push({
                    source: key,
                    campaign: key,
                    revenue: a.revenue || 0,
                    impressions: a.impressions || 0,
                    orders: a.orders || 0,
                    adCost: a.adCost || 0,
                    adRoas: a.adRoas || 0
                });
            });
        });

        var dailyGroups = groupRows(dailyRaw, function (d) { return d.dateISO || normalizeDate(d.date); }).map(function (g) {
            g.dateISO = g.key;
            g.date = displayDate(g.key);
            g.visits = sumRows(dailyRaw.filter(function (d) { return (d.dateISO || normalizeDate(d.date)) === g.key; }), 'visits');
            g.newBuyers = sumRows(dailyRaw.filter(function (d) { return (d.dateISO || normalizeDate(d.date)) === g.key; }), 'newBuyers');
            g.existingBuyers = sumRows(dailyRaw.filter(function (d) { return (d.dateISO || normalizeDate(d.date)) === g.key; }), 'existingBuyers');
            g.cancelledOrders = sumRows(dailyRaw.filter(function (d) { return (d.dateISO || normalizeDate(d.date)) === g.key; }), 'cancelledOrders');
            g.returnedOrders = sumRows(dailyRaw.filter(function (d) { return (d.dateISO || normalizeDate(d.date)) === g.key; }), 'returnedOrders');
            g.conversionRate = g.clicks > 0 ? (g.orders / g.clicks) * 100 : 0;
            return g;
        }).sort(function (a, b) { return String(a.dateISO).localeCompare(String(b.dateISO)); });

        var adRowsFiltered = sourceDailyRaw.filter(function (x) { return x.section === 'Dịch vụ Hiển thị Shopee'; });
        var adSpend = sumRows(adRowsFiltered, 'adCost');
        var adsRevenue = sumRows(adRowsFiltered, 'revenue');
        var adsOrders = sumRows(adRowsFiltered, 'orders');
        var adsImpressions = sumRows(adRowsFiltered, 'impressions');

        if (!hasDateFilter() && adSpend === 0) {
            adSpend = records.reduce(function (s, r) { return s + ((r.metrics && (r.metrics.adSpend || r.metrics.adsCostFromFile)) || 0); }, 0);
            adsRevenue = records.reduce(function (s, r) { return s + ((r.metrics && r.metrics.adsRevenue) || 0); }, 0);
            adsOrders = records.reduce(function (s, r) { return s + ((r.metrics && r.metrics.shopeeAdsOrders) || 0); }, 0);
            adsImpressions = records.reduce(function (s, r) { return s + ((r.metrics && r.metrics.shopeeAdsImpressions) || 0); }, 0);
        }

        var revenue = sumRows(dailyGroups, 'revenue');
        var orders = sumRows(dailyGroups, 'orders');
        var clicks = sumRows(dailyGroups, 'clicks');
        var visits = sumRows(dailyGroups, 'visits');
        var buyers = sumRows(dailyGroups, 'buyers');
        var cancelledOrders = sumRows(dailyGroups, 'cancelledOrders');
        var returnedOrders = sumRows(dailyGroups, 'returnedOrders');

        var sourceGroups;
        if (sourceDailyRaw.length) {
            var highLevel = sourceDailyRaw.filter(function (x) {
                if (x.section === 'Dịch vụ Hiển thị Shopee') return true;
                return x.section && x.source && x.section === x.source;
            });
            sourceGroups = groupRows(highLevel, function (x) { return TOP_SECTIONS[x.section] || x.section || x.source; });
        } else {
            sourceGroups = Object.keys(summarySourceMap).map(function (k) { return summarySourceMap[k]; }).filter(function (x) { return (x.revenue || 0) > 0 || (x.adCost || 0) > 0; });
        }

        (sourceGroups || []).forEach(function (s) {
            var isAds = (s.adCost || 0) > 0 || String(s.key || '').toLowerCase().indexOf('quảng cáo') !== -1;
            if (isAds) {
                s.adsConversionRate = s.impressions > 0 ? (s.orders / s.impressions) * 100 : 0;
                s.conversionRate = s.adsConversionRate;
                s.adsCpa = s.adCost > 0 && s.orders > 0 ? s.adCost / s.orders : 0;
                s.roas = s.adCost > 0 ? s.revenue / s.adCost : 0;
            }
        });

        var adCampaigns = adRowsFiltered.length ? groupRows(adRowsFiltered, function (x) { return x.source; }).map(function (x) {
            return { campaign: x.key, revenue: x.revenue, impressions: x.impressions, orders: x.orders, adCost: x.adCost, adsConversionRate: x.impressions > 0 ? (x.orders / x.impressions) * 100 : 0, adsCpa: x.adCost > 0 && x.orders > 0 ? x.adCost / x.orders : 0, adRoas: x.adCost > 0 ? x.revenue / x.adCost : 0 };
        }) : groupRows(adCampaignRows, function (x) { return x.campaign || x.source; }).map(function (x) {
            return { campaign: x.key, revenue: x.revenue, impressions: x.impressions, orders: x.orders, adCost: x.adCost, adsConversionRate: x.impressions > 0 ? (x.orders / x.impressions) * 100 : 0, adsCpa: x.adCost > 0 && x.orders > 0 ? x.adCost / x.orders : 0, adRoas: x.adCost > 0 ? x.revenue / x.adCost : 0 };
        });

        var products = aggregateProductsAcrossRecords(productRecords);
        var metrics = {
            confirmedRevenue: revenue,
            revenueNoShopeeSubsidy: revenue,
            confirmedOrders: orders,
            avgOrderValue: orders > 0 ? revenue / orders : 0,
            productClicks: clicks,
            visits: visits,
            conversionRate: clicks > 0 ? (orders / clicks) * 100 : 0,
            buyers: buyers,
            newBuyers: sumRows(dailyGroups, 'newBuyers'),
            existingBuyers: sumRows(dailyGroups, 'existingBuyers'),
            cancelledOrders: cancelledOrders,
            returnedOrders: returnedOrders,
            cancelRate: orders > 0 ? (cancelledOrders / orders) * 100 : 0,
            returnRate: orders > 0 ? (returnedOrders / orders) * 100 : 0,
            adsRevenue: adsRevenue,
            adSpend: adSpend,
            adsCostFromFile: adSpend,
            adSpendSource: records.length > 1 || hasDateFilter() ? 'multi_file_filter' : ((records[0] && records[0].metrics && records[0].metrics.adSpendSource) || 'file_auto'),
            shopeeAdsOrders: adsOrders,
            shopeeAdsImpressions: adsImpressions,
            adsConversionRate: adsImpressions > 0 ? (adsOrders / adsImpressions) * 100 : 0,
            adsCpa: adSpend > 0 && adsOrders > 0 ? adSpend / adsOrders : 0,
            cpa: adSpend > 0 && adsOrders > 0 ? adSpend / adsOrders : 0,
            roasOverall: adSpend > 0 ? adsRevenue / adSpend : 0,
            roasAdsRevenue: adSpend > 0 ? adsRevenue / adSpend : 0
        };

        return {
            data: {
                fileName: records.length > 1 ? ('Toàn kỳ • ' + records.length + ' file') : ((records[0] && records[0].fileName) || ''),
                period: hasDateFilter() ? ((SHOPEE_STATE.dateFrom ? displayDate(SHOPEE_STATE.dateFrom) : 'đầu kỳ') + ' → ' + (SHOPEE_STATE.dateTo ? displayDate(SHOPEE_STATE.dateTo) : 'cuối kỳ')) : (records.length > 1 ? 'Toàn kỳ' : ((records[0] && records[0].period) || '')),
                batchIds: uploadIds
            },
            metrics: metrics,
            daily: dailyGroups,
            sourceDaily: sourceDailyRaw,
            sourceGroups: sourceGroups,
            adCampaigns: adCampaigns,
            products: products,
            filterActive: hasDateFilter(),
            allFilesMode: records.length > 1 || isAllFilesMode(),
            fileCount: records.length,
            files: records
        };
    }

    function getViewData() {
        var records = [];
        if (isAllFilesMode()) {
            records = uniqueStatsRecords().filter(recordHasDateInRange);
        } else if (SHOPEE_STATE.current) {
            records = [SHOPEE_STATE.current];
        }
        if (!records.length) return null;
        return aggregateViewFromRecords(records);
    }

    function injectStyles() {
        if (document.getElementById('shopee-stats-styles')) return;
        var css = document.createElement('style');
        css.id = 'shopee-stats-styles';
        css.innerHTML = `
            .ss-shell { display:flex; flex-direction:column; gap:18px; font-family:'Segoe UI', Tahoma, sans-serif; }
            .ss-hero { border:1px solid #fed7aa; background:linear-gradient(135deg,#fff7ed,#ffffff); border-radius:24px; padding:22px; box-shadow:0 12px 30px rgba(15,23,42,.05); }
            .ss-hero-top { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap; }
            .ss-title { margin:0; color:#0f172a; font-size:24px; font-weight:950; letter-spacing:-.03em; }
            .ss-sub { color:#64748b; margin-top:8px; line-height:1.6; font-size:13px; max-width:900px; }
            .ss-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-top:18px; }
            .ss-select, .ss-input { border:1px solid #e2e8f0; background:#fff; border-radius:12px; padding:10px 12px; outline:none; font-weight:800; color:#334155; min-height:40px; }
            .ss-input { min-width:150px; }
            .ss-date { min-width:142px; max-width:168px; padding:8px 10px; min-height:38px; font-size:12px; }
            .ss-filter-label { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e2e8f0; border-radius:999px; padding:5px 8px 5px 10px; color:#64748b; font-size:11px; font-weight:900; }
            .ss-filter-label input { border:0 !important; box-shadow:none !important; padding:4px 2px !important; min-height:28px !important; min-width:118px !important; background:transparent !important; color:#334155 !important; font-weight:800 !important; }
            .ss-upload-btn, .ss-action-btn { border:none; border-radius:999px; padding:11px 16px; font-weight:950; cursor:pointer; transition:.18s ease; }
            .ss-upload-btn { background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; box-shadow:0 10px 20px rgba(249,115,22,.22); }
            .ss-action-btn { background:#fff; color:#ea580c; border:1px solid #fed7aa; }
            .ss-action-btn.active { background:#fff7ed; color:#9a3412; border-color:#fb923c; box-shadow:0 8px 18px rgba(249,115,22,.10); }
            .ss-upload-btn:hover, .ss-action-btn:hover { transform:translateY(-1px); }
            .ss-delete-btn { border:none; background:#fee2e2; color:#dc2626; border-radius:999px; padding:6px 10px; font-size:10px; font-weight:950; cursor:pointer; }
            .ss-delete-btn:hover { background:#dc2626; color:#fff; }
            .ss-kpis { display:grid; grid-template-columns:repeat(6,minmax(140px,1fr)); gap:10px; }
            .ss-kpi { background:#fff; border:1px solid #e2e8f0; border-radius:18px; padding:14px; box-shadow:0 8px 18px rgba(15,23,42,.035); cursor:pointer; transition:.16s ease; position:relative; overflow:hidden; }
            .ss-kpi:hover { transform:translateY(-2px); border-color:#fb923c; box-shadow:0 12px 26px rgba(249,115,22,.10); }
            .ss-kpi:after { content:'Xem chi tiết'; position:absolute; right:10px; top:8px; color:#fb923c; font-size:9px; font-weight:900; opacity:0; transition:.16s ease; }
            .ss-kpi:hover:after { opacity:1; }
            .ss-kpi span { display:block; color:#64748b; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.04em; }
            .ss-kpi strong { display:block; color:#0f172a; font-size:22px; margin-top:6px; line-height:1.15; }
            .ss-kpi small { display:block; color:#94a3b8; margin-top:5px; font-weight:700; }
            .ss-grid { display:grid; grid-template-columns:1.1fr .9fr; gap:14px; }
            .ss-card { background:rgba(255,255,255,.9); border:1px solid #e2e8f0; border-radius:22px; padding:18px; box-shadow:0 10px 24px rgba(15,23,42,.04); min-width:0; }
            .ss-card-title { color:#0f172a; font-weight:950; margin-bottom:12px; display:flex; justify-content:space-between; gap:10px; align-items:center; }
            .ss-chart-box { height:320px; position:relative; }
            .ss-table-wrap { width:100%; overflow:auto; border:1px solid #e2e8f0; border-radius:16px; background:#fff; max-height:390px; }
            .ss-table { width:100%; border-collapse:separate; border-spacing:0; min-width:860px; font-size:12px; }
            .ss-table th { position:sticky; top:0; z-index:1; background:#f8fafc; color:#475569; text-transform:uppercase; font-size:10px; padding:10px; border-bottom:1px solid #e2e8f0; text-align:left; }
            .ss-table td { padding:9px 10px; border-bottom:1px solid #eef2f7; color:#334155; vertical-align:top; }
            .ss-table tr:last-child td { border-bottom:0; }
            .ss-row-click { cursor:pointer; }
            .ss-row-click:hover td { background:#fff7ed; }
            .ss-right { text-align:right !important; }
            .ss-center { text-align:center !important; }
            .ss-history { display:grid; gap:8px; }
            .ss-history-item { border:1px solid #e2e8f0; background:#fff; border-radius:14px; padding:10px; cursor:pointer; transition:.16s ease; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; }
            .ss-history-item:hover { border-color:#fb923c; transform:translateY(-1px); }
            .ss-history-item.active { background:#fff7ed; border-color:#f97316; }
            .ss-muted { color:#64748b; font-size:12px; }
            .ss-empty { text-align:center; padding:34px 20px; color:#64748b; font-weight:800; background:#fff; border:1px dashed #cbd5e1; border-radius:18px; }
            .ss-badge { display:inline-flex; align-items:center; border-radius:999px; padding:4px 8px; font-size:10px; font-weight:900; background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
            .ss-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.58); z-index:100006; display:flex; align-items:center; justify-content:center; padding:18px; backdrop-filter:blur(4px); }
            .ss-modal { width:min(1080px,96vw); max-height:88vh; overflow:hidden; background:#fff; border-radius:24px; box-shadow:0 28px 70px rgba(15,23,42,.28); display:flex; flex-direction:column; }
            .ss-modal-head { padding:16px 20px; background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; display:flex; justify-content:space-between; gap:12px; align-items:center; }
            .ss-modal-head h3 { margin:0; font-size:17px; font-weight:950; }
            .ss-modal-close { border:none; background:rgba(255,255,255,.18); color:#fff; font-size:24px; width:38px; height:38px; border-radius:999px; cursor:pointer; }
            .ss-modal-body { padding:18px; overflow:auto; background:#f8fafc; }
            .ss-detail-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
            .ss-detail { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:12px; }
            .ss-detail span { display:block; color:#64748b; font-size:11px; font-weight:900; text-transform:uppercase; }
            .ss-detail strong { display:block; margin-top:5px; font-size:18px; color:#0f172a; }
            @media(max-width:1280px){ .ss-kpis{grid-template-columns:repeat(3,minmax(0,1fr));} .ss-grid{grid-template-columns:1fr;} }
            @media(max-width:780px){ .ss-kpis,.ss-detail-grid{grid-template-columns:1fr;} .ss-title{font-size:20px;} .ss-toolbar>*{width:100%;} .ss-chart-box{height:280px;} .ss-modal{width:100vw; max-height:94vh; border-radius:18px;} }
        `;
        document.head.appendChild(css);
    }

    function renderBase() {
        injectStyles();
        var container = getContainer();
        if (!container) return;
        var options = SHOPEE_COMPANIES.map(function (c) {
            return '<option value="' + c.id + '" ' + (c.id === SHOPEE_STATE.company ? 'selected' : '') + '>' + c.name + '</option>';
        }).join('');
        container.innerHTML = `
            <div class="ss-shell">
                <section class="ss-hero">
                    <div class="ss-hero-top">
                        <div>
                            <h2 class="ss-title">🛒 Dashboard TMĐT / Shopee Shop Stats</h2>
                            <div class="ss-sub">Tải file <b>shopee-shop-stats</b>. Hệ thống chỉ lấy số liệu từ <b>Đơn đã xác nhận</b>. Dữ liệu tổng quan có thể bấm để xem chi tiết; sản phẩm được gom theo <b>Mã sản phẩm/SKU</b> để tránh lệch tên theo thời điểm.</div>
                        </div>
                        <span class="ss-badge">${SHOPEE_STATS_VERSION}</span>
                    </div>
                    <div class="ss-toolbar">
                        <select id="ss-company" class="ss-select" onchange="window.changeShopeeStatsCompany(this.value)">${options}</select>
                        <select id="ss-quick-filter" class="ss-select ss-date" onchange="window.applyShopeeQuickFilter(this.value)">
                            <option value="" ${SHOPEE_STATE.quickFilter === '' ? 'selected' : ''}>Chọn kỳ</option>
                            <option value="this_week" ${SHOPEE_STATE.quickFilter === 'this_week' ? 'selected' : ''}>Tuần này</option>
                            <option value="last_week" ${SHOPEE_STATE.quickFilter === 'last_week' ? 'selected' : ''}>Tuần trước</option>
                            <option value="this_month" ${SHOPEE_STATE.quickFilter === 'this_month' ? 'selected' : ''}>Tháng này</option>
                            <option value="last_month" ${SHOPEE_STATE.quickFilter === 'last_month' ? 'selected' : ''}>Tháng trước</option>
                            <option value="all" ${SHOPEE_STATE.quickFilter === 'all' ? 'selected' : ''}>Toàn kỳ</option>
                        </select>
                        <label class="ss-filter-label">Từ <input id="ss-date-from" type="date" value="${escapeHtml(SHOPEE_STATE.dateFrom)}" /></label>
                        <label class="ss-filter-label">Đến <input id="ss-date-to" type="date" value="${escapeHtml(SHOPEE_STATE.dateTo)}" /></label>
                        <button class="ss-action-btn" onclick="window.applyShopeeStatsDateFilter()">🔎 Lọc</button>
                        <button class="ss-action-btn" onclick="window.clearShopeeDateFilter()">Xóa bộ lọc</button>
                        <button class="ss-action-btn ${SHOPEE_STATE.viewMode === 'all' ? 'active' : ''}" onclick="window.showAllShopeeStats()">📊 Toàn kỳ</button>
                        <button class="ss-upload-btn" onclick="document.getElementById('ss-file-input').click()">📤 Tải file Shopee</button>
                        <input type="file" id="ss-file-input" accept=".xlsx,.xls,.csv" style="display:none" />
                    </div>
                </section>
                <div id="ss-dashboard-area"><div class="ss-empty">Chưa có dữ liệu. Hãy tải file Shopee Shop Stats hoặc chọn lại lịch sử đã lưu.</div></div>
            </div>
        `;
        var input = document.getElementById('ss-file-input');
        if (input) input.addEventListener('change', handleUpload);
        renderDashboard();
    }

    function setKpiHtml(view) {
        var m = view.metrics;
        var label = view.filterActive ? ('Đang lọc: ' + (SHOPEE_STATE.dateFrom ? displayDate(SHOPEE_STATE.dateFrom) : 'đầu kỳ') + ' → ' + (SHOPEE_STATE.dateTo ? displayDate(SHOPEE_STATE.dateTo) : 'cuối kỳ')) : (view.allFilesMode ? ('Toàn kỳ' + (view.fileCount ? ' • ' + view.fileCount + ' file' : '')) : 'File đang chọn');
        return `
            <div class="ss-kpis">
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('revenue')"><span>Doanh thu xác nhận</span><strong>${fmtMoney(m.confirmedRevenue)}</strong><small>${label}</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('orders')"><span>Số đơn xác nhận</span><strong>${fmtNum(m.confirmedOrders, 0)}</strong><small>Hủy: ${fmtNum(m.cancelledOrders, 0)} • Hoàn: ${fmtNum(m.returnedOrders, 0)}</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('conversion')"><span>Chuyển đổi toàn shop</span><strong>${fmtPct(m.conversionRate)}</strong><small>Đơn xác nhận / Click sản phẩm</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('adcost')"><span>Chi phí Ads</span><strong>${m.adSpend > 0 ? fmtMoney(m.adSpend) : '0 đ'}</strong><small>${m.adSpendSource === 'multi_file_filter' ? 'Tổng hợp theo kỳ đang lọc' : (m.adSpendSource === 'file_auto' ? 'Tự đọc từ Dịch vụ Hiển thị Shopee' : 'File không có dòng chi phí Ads')} • DT Ads: ${fmtMoney(m.adsRevenue)}</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('cpa')"><span>Chi phí / đơn Ads</span><strong>${m.cpa > 0 ? fmtMoney(m.cpa) : '-'}</strong><small>Chi phí Ads / Đơn từ Ads</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('roas')"><span>ROAS Ads</span><strong>${m.roasAdsRevenue > 0 ? fmtNum(m.roasAdsRevenue, 2) + 'x' : '-'}</strong><small>Doanh thu Ads / Chi phí Ads</small></div>
            </div>
        `;
    }

    function renderDashboard() {
        var area = document.getElementById('ss-dashboard-area');
        if (!area) return;
        var view = getViewData();
        if (!view) { area.innerHTML = '<div class="ss-empty">Chưa có dữ liệu. Hãy tải file Shopee Shop Stats hoặc chọn lại lịch sử đã lưu.</div>'; return; }
        area.innerHTML = `
            ${setKpiHtml(view)}
            <div class="ss-grid">
                <section class="ss-card"><div class="ss-card-title">📈 Doanh thu & số đơn theo ngày <span class="ss-muted">${escapeHtml(view.data.period || '')}</span></div><div class="ss-chart-box"><canvas id="ss-daily-chart"></canvas></div></section>
                <section class="ss-card"><div class="ss-card-title">🧭 Cơ cấu doanh thu theo nguồn <span class="ss-muted">Bấm biểu đồ để xem nguồn</span></div><div class="ss-chart-box"><canvas id="ss-source-chart"></canvas></div></section>
            </div>
            <div class="ss-grid">
                <section class="ss-card"><div class="ss-card-title">🏆 Top sản phẩm theo mã sản phẩm/SKU <span class="ss-muted">Bấm cột để xem sản phẩm & nguồn</span></div><div class="ss-chart-box"><canvas id="ss-product-chart"></canvas></div></section>
                <section class="ss-card"><div class="ss-card-title">🕒 Lịch sử tải file</div><div id="ss-history-list" class="ss-history"></div></section>
            </div>
            <section class="ss-card">
                <div class="ss-card-title">📦 Thống kê theo sản phẩm/SKU <input class="ss-input" id="ss-product-search" placeholder="Tìm mã/tên sản phẩm" value="${escapeHtml(SHOPEE_STATE.productSearch)}" oninput="window.searchShopeeProduct(this.value)" style="min-width:220px;padding:8px 10px;" /></div>
                <div class="ss-table-wrap"><table class="ss-table"><thead><tr><th>Mã SP/SKU</th><th>Sản phẩm đại diện</th><th>Nguồn chính</th><th class="ss-right">Doanh thu</th><th class="ss-center">Đơn</th><th class="ss-center">Click</th><th class="ss-center">CTR</th><th class="ss-center">CVR</th><th class="ss-right">AOV</th></tr></thead><tbody id="ss-product-tbody"></tbody></table></div>
                <div class="ss-muted" style="margin-top:8px;">Ghi chú: sản phẩm/SKU được gom từ các file phù hợp bộ lọc. Nếu Shopee không có dữ liệu sản phẩm theo từng ngày, hệ thống sẽ gom theo kỳ file có ngày nằm trong bộ lọc.</div>
            </section>
            <section class="ss-card"><div class="ss-card-title">📅 Bảng doanh thu theo ngày</div><div class="ss-table-wrap"><table class="ss-table"><thead><tr><th>Ngày</th><th class="ss-right">Doanh thu</th><th class="ss-center">Đơn</th><th class="ss-center">Click</th><th class="ss-center">Truy cập</th><th class="ss-center">Tỷ lệ chuyển đổi</th><th class="ss-center">Người mua</th></tr></thead><tbody id="ss-daily-tbody"></tbody></table></div></section>
        `;
        renderHistoryList();
        renderTables(view);
        drawCharts(view);
    }

    function renderTables(view) {
        var products = (view.products || []).slice(0);
        var q = (SHOPEE_STATE.productSearch || '').toLowerCase().trim();
        if (q) products = products.filter(function (p) { return (p.sku || '').toLowerCase().indexOf(q) !== -1 || (p.productName || '').toLowerCase().indexOf(q) !== -1 || (p.aliases || []).join(' ').toLowerCase().indexOf(q) !== -1; });
        var pBody = document.getElementById('ss-product-tbody');
        if (pBody) {
            pBody.innerHTML = products.slice(0, 60).map(function (p) {
                var mainSource = (p.sources && p.sources[0]) ? p.sources[0].source : '-';
                return `<tr class="ss-row-click" onclick="window.showShopeeProductDetail('${escapeHtml(p.sku)}')">
                    <td><b>${escapeHtml(p.sku)}</b></td>
                    <td><b>${escapeHtml(p.productName)}</b><div class="ss-muted">${escapeHtml(p.status || '')} • ${p.sources ? p.sources.length : 0} nguồn</div></td>
                    <td>${escapeHtml(mainSource)}</td>
                    <td class="ss-right"><b>${fmtMoney(p.revenue)}</b></td>
                    <td class="ss-center">${fmtNum(p.orders, 2)}</td>
                    <td class="ss-center">${fmtNum(p.clicks, 0)}</td>
                    <td class="ss-center">${fmtPct(p.ctr)}</td>
                    <td class="ss-center">${fmtPct(p.conversionRate)}</td>
                    <td class="ss-right">${fmtMoney(p.avgOrderValue)}</td>
                </tr>`;
            }).join('') || '<tr><td colspan="9" class="ss-center">Không có dữ liệu sản phẩm từ nhóm sheet Đơn đã xác nhận.</td></tr>';
        }
        var dBody = document.getElementById('ss-daily-tbody');
        if (dBody) {
            dBody.innerHTML = (view.daily || []).map(function (d) {
                return `<tr class="ss-row-click" onclick="window.showShopeeDailyDetail('${escapeHtml(d.dateISO)}')">
                    <td><b>${escapeHtml(d.date)}</b></td><td class="ss-right"><b>${fmtMoney(d.revenue)}</b></td><td class="ss-center">${fmtNum(d.orders, 0)}</td><td class="ss-center">${fmtNum(d.clicks, 0)}</td><td class="ss-center">${fmtNum(d.visits, 0)}</td><td class="ss-center">${fmtPct(d.conversionRate)}</td><td class="ss-center">${fmtNum(d.buyers, 0)}</td>
                </tr>`;
            }).join('') || '<tr><td colspan="7" class="ss-center">Không có dữ liệu theo ngày phù hợp bộ lọc.</td></tr>';
        }
    }

    function destroyChart(key) { if (SHOPEE_STATE.charts[key]) { try { SHOPEE_STATE.charts[key].destroy(); } catch (e) {} SHOPEE_STATE.charts[key] = null; } }

    function drawCharts(view) {
        if (typeof Chart === 'undefined') { console.warn('Chart.js chưa sẵn sàng.'); return; }
        drawDailyChart(view); drawSourceChart(view); drawProductChart(view);
    }

    function drawDailyChart(view) {
        destroyChart('daily');
        var ctx = document.getElementById('ss-daily-chart'); if (!ctx) return;
        var daily = view.daily || [];
        SHOPEE_STATE.charts.daily = new Chart(ctx, {
            type: 'bar',
            data: { labels: daily.map(function (d) { return d.date; }), datasets: [ { label: 'Doanh thu xác nhận', data: daily.map(function (d) { return d.revenue; }), yAxisID: 'y' }, { label: 'Số đơn xác nhận', data: daily.map(function (d) { return d.orders; }), type: 'line', yAxisID: 'y1', borderWidth: 3, tension: .25 } ] },
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, onClick: function(evt, els){ if(els && els.length){ var d=daily[els[0].index]; if(d) window.showShopeeDailyDetail(d.dateISO); } }, scales: { y: { beginAtZero: true, position: 'left' }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } } } }
        });
    }

    function drawSourceChart(view) {
        destroyChart('source');
        var ctx = document.getElementById('ss-source-chart'); if (!ctx) return;
        var sourceData = (view.sourceGroups || []).filter(function (x) { return (x.revenue || 0) > 0 || (x.adCost || 0) > 0; });
        if (sourceData.length === 0) sourceData = [{ key: 'Chưa có dữ liệu nguồn', revenue: 1 }];
        SHOPEE_STATE.charts.source = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: sourceData.map(function (x) { return x.key; }), datasets: [{ data: sourceData.map(function (x) { return x.revenue || x.adCost || 0; }) }] },
            options: { responsive: true, maintainAspectRatio: false, onClick: function(evt, els){ if(els && els.length){ var s=sourceData[els[0].index]; if(s) window.showShopeeSourceDetail(s.key); } }, plugins: { legend: { position: 'bottom' } } }
        });
    }

    function drawProductChart(view) {
        destroyChart('product');
        var ctx = document.getElementById('ss-product-chart'); if (!ctx) return;
        var products = (view.products || []).filter(function (p) { return (p.revenue || 0) > 0; }).slice(0, 10).reverse();
        SHOPEE_STATE.charts.product = new Chart(ctx, {
            type: 'bar',
            data: { labels: products.map(function (p) { return p.sku; }), datasets: [{ label: 'Doanh thu', data: products.map(function (p) { return p.revenue; }) }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', onClick: function(evt, els){ if(els && els.length){ var p=products[els[0].index]; if(p) window.showShopeeProductDetail(p.sku); } }, plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: function(ctx){ var p=products[ctx.dataIndex]; return p ? ['Sản phẩm: ' + p.productName, 'Nguồn chính: ' + ((p.sources && p.sources[0]) ? p.sources[0].source : '-'), 'Bấm để xem chi tiết'] : ''; } } } }, scales: { x: { beginAtZero: true } } }
        });
    }

    function detailGrid(items) {
        return '<div class="ss-detail-grid">' + items.map(function (it) { return '<div class="ss-detail"><span>' + escapeHtml(it[0]) + '</span><strong>' + it[1] + '</strong></div>'; }).join('') + '</div>';
    }

    function tableHtml(headers, rows) {
        return '<div class="ss-table-wrap"><table class="ss-table"><thead><tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + (rows.join('') || '<tr><td colspan="' + headers.length + '" class="ss-center">Không có dữ liệu.</td></tr>') + '</tbody></table></div>';
    }

    function showModal(title, body) {
        var old = document.getElementById('ss-modal-overlay'); if (old) old.remove();
        document.body.insertAdjacentHTML('beforeend', '<div class="ss-modal-overlay" id="ss-modal-overlay" onclick="window.closeShopeeModal(event)"><div class="ss-modal" onclick="event.stopPropagation()"><div class="ss-modal-head"><h3>' + title + '</h3><button class="ss-modal-close" onclick="window.closeShopeeModal()">&times;</button></div><div class="ss-modal-body">' + body + '</div></div></div>');
    }

    window.closeShopeeModal = function (e) { var m = document.getElementById('ss-modal-overlay'); if (m && (!e || e.target === m)) m.remove(); };

    window.showShopeeKpiDetail = function (kind) {
        var view = getViewData(); if (!view) return;
        var m = view.metrics;
        var titleMap = { revenue:'Chi tiết doanh thu xác nhận', orders:'Chi tiết số đơn xác nhận', conversion:'Chi tiết tỷ lệ chuyển đổi', adcost:'Chi tiết chi phí Ads Shopee', cpa:'Chi tiết chi phí / đơn Ads', roas:'Chi tiết ROAS Ads' };
        var body = '';
        if (kind === 'adcost') {
            body += detailGrid([['Chi phí Ads', fmtMoney(m.adSpend)], ['Nguồn dữ liệu', m.adSpendSource === 'multi_file_filter' ? 'Tổng hợp theo kỳ đang lọc' : (m.adSpendSource === 'file_auto' ? 'Sheet Nguồn lưu lượng truy cập (Đơn đã xác nhận) → Dịch vụ Hiển thị Shopee' : 'File này không có dòng chiến dịch Ads dưới Dịch vụ Hiển thị Shopee')], ['Doanh thu Ads', fmtMoney(m.adsRevenue)], ['Đơn từ Ads', fmtNum(m.shopeeAdsOrders, 2)], ['CVR Ads', fmtPct(m.adsConversionRate || 0)], ['CPA Ads', m.cpa ? fmtMoney(m.cpa) : '-'], ['ROAS Ads', m.roasAdsRevenue ? fmtNum(m.roasAdsRevenue, 2) + 'x' : '-']]);
            body += tableHtml(['Chiến dịch Ads','Doanh thu Ads','Chi phí Ads','Đơn Ads','Ads Impression','CVR Ads','CPA Ads','ROAS Ads'], (view.adCampaigns || []).map(function (a) { return '<tr><td><b>' + escapeHtml(a.campaign || a.key) + '</b></td><td class="ss-right">' + fmtMoney(a.revenue) + '</td><td class="ss-right"><b>' + fmtMoney(a.adCost) + '</b></td><td class="ss-center">' + fmtNum(a.orders, 2) + '</td><td class="ss-center">' + fmtNum(a.impressions, 0) + '</td><td class="ss-center">' + fmtPct(a.adsConversionRate || 0) + '</td><td class="ss-right">' + (a.adsCpa ? fmtMoney(a.adsCpa) : '-') + '</td><td class="ss-center"><b>' + (a.adRoas ? fmtNum(a.adRoas, 2) + 'x' : '-') + '</b></td></tr>'; }));
        } else if (kind === 'conversion') {
            body += detailGrid([['Chuyển đổi toàn shop', fmtPct(m.conversionRate)], ['Công thức toàn shop', 'Đơn xác nhận / Click sản phẩm'], ['Click sản phẩm', fmtNum(m.productClicks, 0)], ['Số đơn xác nhận', fmtNum(m.confirmedOrders, 0)], ['Truy cập tham khảo', fmtNum(m.visits, 0)], ['Chuyển đổi Ads', fmtPct(m.adsConversionRate || 0)], ['Công thức Ads', 'Đơn từ Ads / Ads Impression'], ['Ads Impression', fmtNum(m.shopeeAdsImpressions, 0)], ['Đơn từ Ads', fmtNum(m.shopeeAdsOrders, 2)]]);
            body += buildSourceDetailTable(view);
        } else if (kind === 'orders') {
            body += detailGrid([['Số đơn xác nhận', fmtNum(m.confirmedOrders, 0)], ['Đơn hủy', fmtNum(m.cancelledOrders, 0)], ['Đơn hoàn/hoàn tiền', fmtNum(m.returnedOrders, 0)], ['Người mua', fmtNum(m.buyers, 0)]]);
            body += buildDailyTable(view.daily);
        } else if (kind === 'cpa') {
            body += detailGrid([['Công thức', 'Chi phí Ads / Đơn từ Ads'], ['Chi phí Ads', fmtMoney(m.adSpend)], ['Đơn từ Ads', fmtNum(m.shopeeAdsOrders, 2)], ['CPA Ads', m.cpa ? fmtMoney(m.cpa) : '-'], ['Ghi chú', 'Không lấy số đơn toàn shop để tính CPA Ads']]);
            body += tableHtml(['Chiến dịch Ads','Chi phí Ads','Đơn Ads','CPA Ads','Doanh thu Ads','ROAS Ads'], (view.adCampaigns || []).map(function (a) { return '<tr><td><b>' + escapeHtml(a.campaign || a.key) + '</b></td><td class="ss-right"><b>' + fmtMoney(a.adCost) + '</b></td><td class="ss-center">' + fmtNum(a.orders, 2) + '</td><td class="ss-right">' + (a.adsCpa ? fmtMoney(a.adsCpa) : '-') + '</td><td class="ss-right">' + fmtMoney(a.revenue) + '</td><td class="ss-center">' + (a.adRoas ? fmtNum(a.adRoas, 2) + 'x' : '-') + '</td></tr>'; }));
        } else if (kind === 'roas') {
            body += detailGrid([['Công thức', 'Doanh thu Ads / Chi phí Ads'], ['Doanh thu Ads', fmtMoney(m.adsRevenue)], ['Chi phí Ads', fmtMoney(m.adSpend)], ['ROAS Ads', m.roasAdsRevenue ? fmtNum(m.roasAdsRevenue, 2) + 'x' : '-'], ['Ghi chú', 'Không lấy doanh thu toàn shop để tính ROAS Ads']]);
            body += tableHtml(['Chiến dịch Ads','Doanh thu Ads','Chi phí Ads','Đơn Ads','CVR Ads','ROAS Ads'], (view.adCampaigns || []).map(function (a) { return '<tr><td><b>' + escapeHtml(a.campaign || a.key) + '</b></td><td class="ss-right"><b>' + fmtMoney(a.revenue) + '</b></td><td class="ss-right">' + fmtMoney(a.adCost) + '</td><td class="ss-center">' + fmtNum(a.orders, 2) + '</td><td class="ss-center">' + fmtPct(a.adsConversionRate || 0) + '</td><td class="ss-center"><b>' + (a.adRoas ? fmtNum(a.adRoas, 2) + 'x' : '-') + '</b></td></tr>'; }));
        } else {
            body += detailGrid([['Doanh thu xác nhận', fmtMoney(m.confirmedRevenue)], ['Không gồm trợ giá Shopee', fmtMoney(m.revenueNoShopeeSubsidy || 0)], ['AOV', fmtMoney(m.avgOrderValue)], ['Doanh thu từ Ads', fmtMoney(m.adsRevenue)]]);
            body += buildDailyTable(view.daily);
        }
        showModal(titleMap[kind] || 'Chi tiết', body);
    };

    function buildDailyTable(daily) {
        return tableHtml(['Ngày','Doanh thu','Đơn','Click','Truy cập','CVR','Người mua'], (daily || []).map(function (d) { return '<tr><td><b>' + escapeHtml(d.date) + '</b></td><td class="ss-right"><b>' + fmtMoney(d.revenue) + '</b></td><td class="ss-center">' + fmtNum(d.orders,0) + '</td><td class="ss-center">' + fmtNum(d.clicks,0) + '</td><td class="ss-center">' + fmtNum(d.visits,0) + '</td><td class="ss-center">' + fmtPct(d.conversionRate) + '</td><td class="ss-center">' + fmtNum(d.buyers,0) + '</td></tr>'; }));
    }

    function buildSourceDetailTable(view) {
        var rows = (view.sourceGroups || []).map(function (s) { var isAds = (s.adCost || 0) > 0 || String(s.key || '').toLowerCase().indexOf('quảng cáo') !== -1; return '<tr><td><b>' + escapeHtml(s.key) + '</b></td><td class="ss-right"><b>' + fmtMoney(s.revenue) + '</b></td><td class="ss-right">' + (s.adCost ? fmtMoney(s.adCost) : '-') + '</td><td class="ss-center">' + fmtNum(s.orders,2) + '</td><td class="ss-center">' + (isAds ? fmtNum(s.impressions,0) : fmtNum(s.clicks,0)) + '</td><td class="ss-center">' + fmtPct(isAds ? (s.adsConversionRate || s.conversionRate || 0) : (s.conversionRate || 0)) + '</td></tr>'; });
        return tableHtml(['Nguồn','Doanh thu','Chi phí Ads','Đơn','Click/Hiển thị','CVR'], rows);
    }

    window.showShopeeSourceDetail = function (sourceLabel) {
        var view = getViewData(); if (!view) return;
        var related = (view.sourceDaily || []).filter(function (x) { return (TOP_SECTIONS[x.section] || x.section || x.source) === sourceLabel || x.source === sourceLabel; });
        var summary = groupRows(related, function (x) { return x.source; });
        if (!related.length && view.sourceGroups) summary = view.sourceGroups.filter(function (x) { return x.key === sourceLabel; });
        var body = tableHtml(['Nguồn chi tiết','Doanh thu','Chi phí Ads','Đơn','Hiển thị','Click','CVR','CPA','ROAS'], summary.map(function (s) { var isAds = (s.adCost || 0) > 0 || String(s.key || s.source || '').toLowerCase().indexOf('quảng cáo') !== -1; var cvr = isAds ? (s.adsConversionRate || (s.impressions > 0 ? (s.orders / s.impressions) * 100 : 0)) : (s.conversionRate || 0); return '<tr><td><b>' + escapeHtml(s.key || s.source) + '</b></td><td class="ss-right"><b>' + fmtMoney(s.revenue) + '</b></td><td class="ss-right">' + (s.adCost ? fmtMoney(s.adCost) : '-') + '</td><td class="ss-center">' + fmtNum(s.orders,2) + '</td><td class="ss-center">' + fmtNum(s.impressions,0) + '</td><td class="ss-center">' + fmtNum(s.clicks,0) + '</td><td class="ss-center">' + fmtPct(cvr) + '</td><td class="ss-right">' + (isAds && s.adCost > 0 && s.orders > 0 ? fmtMoney(s.adCost / s.orders) : '-') + '</td><td class="ss-center">' + (s.adCost > 0 ? fmtNum(s.revenue / s.adCost, 2) + 'x' : '-') + '</td></tr>'; }));
        showModal('Chi tiết nguồn: ' + escapeHtml(sourceLabel), body);
    };

    window.showShopeeProductDetail = function (sku) {
        var view = getViewData(); if (!view) return;
        var p = (view.products || []).find(function (x) { return String(x.sku) === String(sku); });
        if (!p) return;
        var body = detailGrid([['Mã sản phẩm/SKU', escapeHtml(p.sku)], ['Doanh thu', fmtMoney(p.revenue)], ['Đơn', fmtNum(p.orders, 2)], ['Nguồn phát sinh', fmtNum(p.sources ? p.sources.length : 0, 0)]])
            + '<div class="ss-card" style="margin-bottom:14px;"><div class="ss-card-title">Tên sản phẩm đại diện</div><div style="font-weight:800;color:#0f172a;line-height:1.5;">' + escapeHtml(p.productName) + '</div></div>'
            + tableHtml(['Nguồn','Doanh thu','Đơn','Sản phẩm bán','Hiển thị','Click','CTR','CVR','AOV'], (p.sources || []).map(function (s) { return '<tr><td><b>' + escapeHtml(s.source) + '</b></td><td class="ss-right"><b>' + fmtMoney(s.revenue) + '</b></td><td class="ss-center">' + fmtNum(s.orders,2) + '</td><td class="ss-center">' + fmtNum(s.soldProducts,0) + '</td><td class="ss-center">' + fmtNum(s.impressions,0) + '</td><td class="ss-center">' + fmtNum(s.clicks,0) + '</td><td class="ss-center">' + fmtPct(s.ctr) + '</td><td class="ss-center">' + fmtPct(s.conversionRate) + '</td><td class="ss-right">' + fmtMoney(s.avgOrderValue) + '</td></tr>'; }))
            + (p.aliases && p.aliases.length > 1 ? '<div class="ss-card" style="margin-top:14px;"><div class="ss-card-title">Tên sản phẩm từng xuất hiện</div>' + p.aliases.map(function (name) { return '<div class="ss-muted">• ' + escapeHtml(name) + '</div>'; }).join('') + '</div>' : '');
        showModal('Chi tiết sản phẩm/SKU: ' + escapeHtml(p.sku), body);
    };

    window.showShopeeDailyDetail = function (dateISO) {
        var view = getViewData(); if (!view) return;
        var d = (view.daily || []).find(function (x) { return x.dateISO === dateISO; });
        if (!d) return;
        var related = (view.sourceDaily || []).filter(function (x) { return x.dateISO === dateISO && ((x.section === x.source) || x.section === 'Dịch vụ Hiển thị Shopee'); });
        var body = detailGrid([['Ngày', displayDate(dateISO)], ['Doanh thu', fmtMoney(d.revenue)], ['Số đơn', fmtNum(d.orders, 0)], ['Tỷ lệ chuyển đổi', fmtPct(d.conversionRate)]])
            + tableHtml(['Nguồn','Doanh thu','Chi phí Ads','Đơn','Click/Hiển thị','CVR'], groupRows(related, function (x) { return TOP_SECTIONS[x.section] || x.section; }).map(function (s) { var isAds = (s.adCost || 0) > 0 || String(s.key || '').toLowerCase().indexOf('quảng cáo') !== -1; return '<tr><td><b>' + escapeHtml(s.key) + '</b></td><td class="ss-right"><b>' + fmtMoney(s.revenue) + '</b></td><td class="ss-right">' + (s.adCost ? fmtMoney(s.adCost) : '-') + '</td><td class="ss-center">' + fmtNum(s.orders,2) + '</td><td class="ss-center">' + (isAds ? fmtNum(s.impressions,0) : fmtNum(s.clicks,0)) + '</td><td class="ss-center">' + fmtPct(isAds ? (s.adsConversionRate || s.conversionRate || 0) : (s.conversionRate || 0)) + '</td></tr>'; }));
        showModal('Chi tiết ngày ' + displayDate(dateISO), body);
    };

    function handleUpload(e) {
        var file = e.target.files && e.target.files[0]; if (!file) return;
        if (typeof XLSX === 'undefined') { toast('Thiếu thư viện XLSX. Hãy kiểm tra script xlsx trong giao diện chính.', 'error'); e.target.value = ''; return; }
        var reader = new FileReader();
        reader.onload = function (evt) {
            try {
                var arr = new Uint8Array(evt.target.result);
                var workbook = XLSX.read(arr, { type: 'array' });
                var parsed = parseShopeeShopStatsWorkbook(workbook, file.name);
                SHOPEE_STATE.current = parsed;
                saveToFirebase(parsed);
                renderDashboard();
                toast('✅ Đã đọc và ghi nhận dữ liệu Shopee.', 'success');
            } catch (err) { console.error(err); toast('Lỗi đọc file Shopee: ' + err.message, 'error'); }
            finally { e.target.value = ''; }
        };
        reader.readAsArrayBuffer(file);
    }

    function saveToFirebase(parsed) {
        var db = getDb(); if (!db) return;
        var batchId = Date.now().toString();
        var saveData = Object.assign({}, parsed, { batchId: batchId });
        var updates = {};
        updates['/shopee_shop_stats_logs/' + batchId] = saveData;
        updates['/shopee_shop_stats_latest/' + SHOPEE_STATE.company] = saveData;
        db.ref().update(updates).catch(function (e) { console.warn('Không thể lưu Firebase Shopee:', e); });
    }

    function loadHistory() {
        var db = getDb(); if (!db) return;
        db.ref('shopee_shop_stats_logs').limitToLast(500).on('value', function (snapshot) {
            var raw = snapshot.val() || {};
            SHOPEE_STATE.history = Object.keys(raw).map(function (key) { var item = raw[key]; item.batchId = item.batchId || key; return item; })
                .filter(function (x) { return !x.company || x.company === SHOPEE_STATE.company; })
                .sort(function (a, b) { return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0); });
            if (!SHOPEE_STATE.current && SHOPEE_STATE.history.length) SHOPEE_STATE.current = SHOPEE_STATE.history[0];
            renderHistoryList(); renderDashboard();
        });
    }

    function renderHistoryList() {
        var box = document.getElementById('ss-history-list'); if (!box) return;
        var list = SHOPEE_STATE.history || [];
        if (list.length === 0) { box.innerHTML = '<div class="ss-empty" style="padding:20px;">Chưa có lịch sử tải file.</div>'; return; }
        var canDelete = isShopeeStatsDeleteAllowed();
        box.innerHTML = list.slice(0, 30).map(function (item) {
            var active = SHOPEE_STATE.current && SHOPEE_STATE.current.batchId === item.batchId && SHOPEE_STATE.viewMode !== 'all' && !hasDateFilter();
            var del = canDelete ? `<button class="ss-delete-btn" onclick="event.stopPropagation(); window.deleteShopeeStatsBatch('${escapeHtml(item.batchId)}')">Xóa</button>` : '';
            return `<div class="ss-history-item ${active ? 'active' : ''}" onclick="window.selectShopeeStatsBatch('${escapeHtml(item.batchId)}')"><div><b>${escapeHtml(item.fileName || 'File Shopee')}</b><div class="ss-muted">${escapeHtml(item.period || '')} • ${escapeHtml(item.uploader || '')}</div></div><div style="text-align:right;"><b>${fmtMoney(item.metrics ? item.metrics.confirmedRevenue : 0)}</b><div class="ss-muted">${item.uploadedAt ? new Date(item.uploadedAt).toLocaleString('vi-VN') : ''}</div>${del}</div></div>`;
        }).join('');
    }

    window.selectShopeeStatsBatch = function (batchId) {
        var found = (SHOPEE_STATE.history || []).find(function (x) { return String(x.batchId) === String(batchId); });
        if (found) {
            SHOPEE_STATE.current = found;
            SHOPEE_STATE.viewMode = 'current';
            SHOPEE_STATE.quickFilter = '';
            SHOPEE_STATE.dateFrom = '';
            SHOPEE_STATE.dateTo = '';
            var f = document.getElementById('ss-date-from'); var t = document.getElementById('ss-date-to'); var q = document.getElementById('ss-quick-filter');
            if (f) f.value = ''; if (t) t.value = ''; if (q) q.value = '';
            renderBase();
        }
    };

    window.changeShopeeStatsCompany = function (companyId) {
        SHOPEE_STATE.company = companyId || 'NNV';
        SHOPEE_STATE.current = null;
        SHOPEE_STATE.dateFrom = ''; SHOPEE_STATE.dateTo = ''; SHOPEE_STATE.productSearch = ''; SHOPEE_STATE.viewMode = 'all'; SHOPEE_STATE.quickFilter = 'all';
        loadLatestForCompany(); loadHistory();
    };

    function loadLatestForCompany() {
        var db = getDb(); if (!db) return;
        db.ref('shopee_shop_stats_latest/' + SHOPEE_STATE.company).once('value').then(function (snapshot) { var val = snapshot.val(); if (val) { SHOPEE_STATE.current = val; renderDashboard(); } }).catch(function () {});
    }

    window.applyShopeeStatsDateFilter = function () {
        var f = document.getElementById('ss-date-from'); var t = document.getElementById('ss-date-to');
        SHOPEE_STATE.dateFrom = f ? f.value : '';
        SHOPEE_STATE.dateTo = t ? t.value : '';
        SHOPEE_STATE.quickFilter = hasDateFilter() ? '' : 'all';
        SHOPEE_STATE.viewMode = 'all';
        renderBase();
    };

    window.applyShopeeQuickFilter = function (mode) {
        SHOPEE_STATE.quickFilter = mode || '';
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
            SHOPEE_STATE.dateFrom = ''; SHOPEE_STATE.dateTo = ''; SHOPEE_STATE.viewMode = 'all'; renderBase(); return;
        } else {
            SHOPEE_STATE.dateFrom = ''; SHOPEE_STATE.dateTo = ''; SHOPEE_STATE.quickFilter = 'all'; SHOPEE_STATE.viewMode = 'all'; renderBase(); return;
        }
        SHOPEE_STATE.dateFrom = toISODate(start);
        SHOPEE_STATE.dateTo = toISODate(end);
        SHOPEE_STATE.viewMode = 'all';
        renderBase();
    };

    window.showAllShopeeStats = function () {
        SHOPEE_STATE.dateFrom = '';
        SHOPEE_STATE.dateTo = '';
        SHOPEE_STATE.quickFilter = 'all';
        SHOPEE_STATE.viewMode = 'all';
        renderBase();
        toast('📊 Đang xem Toàn kỳ dữ liệu Shopee.', 'success');
    };

    window.clearShopeeDateFilter = function () {
        SHOPEE_STATE.dateFrom = ''; SHOPEE_STATE.dateTo = ''; SHOPEE_STATE.quickFilter = 'all'; SHOPEE_STATE.viewMode = 'all';
        var f = document.getElementById('ss-date-from'); var t = document.getElementById('ss-date-to'); var q = document.getElementById('ss-quick-filter');
        if (f) f.value = ''; if (t) t.value = ''; if (q) q.value = 'all';
        renderBase();
    };

    window.deleteShopeeStatsBatch = function (batchId) {
        if (!isShopeeStatsDeleteAllowed()) { toast('Bạn không có quyền xóa file Shopee. Chỉ Admin/Trưởng phòng được xóa.', 'error'); return; }
        var found = (SHOPEE_STATE.history || []).find(function (x) { return String(x.batchId) === String(batchId); });
        if (!found) return;
        if (!confirm('Xóa file Shopee đã tải lên: ' + (found.fileName || batchId) + '?')) return;
        var db = getDb();
        if (!db) { toast('Không kết nối được Firebase.', 'error'); return; }
        var latestSame = SHOPEE_STATE.current && String(SHOPEE_STATE.current.batchId) === String(batchId);
        var nextLatest = (SHOPEE_STATE.history || []).filter(function (x) { return String(x.batchId) !== String(batchId); })[0] || null;
        var updates = {};
        updates['/shopee_shop_stats_logs/' + batchId] = null;
        if (latestSame || (found.company === SHOPEE_STATE.company)) {
            updates['/shopee_shop_stats_latest/' + SHOPEE_STATE.company] = nextLatest || null;
        }
        db.ref().update(updates).then(function () {
            SHOPEE_STATE.history = (SHOPEE_STATE.history || []).filter(function (x) { return String(x.batchId) !== String(batchId); });
            if (latestSame) SHOPEE_STATE.current = nextLatest;
            renderBase();
            toast('🗑️ Đã xóa file Shopee.', 'success');
        }).catch(function (e) { toast('Lỗi xóa file: ' + e.message, 'error'); });
    };

    window.searchShopeeProduct = function (q) { SHOPEE_STATE.productSearch = q || ''; renderTables(getViewData()); };

    window.initShopeeShopStatsDashboard = function () {
        console.log('Shopee Shop Stats Dashboard Loaded', SHOPEE_STATS_VERSION);
        renderBase(); loadLatestForCompany(); loadHistory();
    };

    window.initEcomDashboard = window.initShopeeShopStatsDashboard;
})();

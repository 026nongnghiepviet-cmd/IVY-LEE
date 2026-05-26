/**
 * SHOPEE SHOP STATS DASHBOARD V1.3 - CONFIRMED ONLY + DRILLDOWN + DATE FILTER + SKU VIEW
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

    var SHOPEE_STATS_VERSION = 'V1.3.0_DRILLDOWN_DATE_SKU';
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
        productSearch: ''
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

        var headerIdx = -1;
        for (var i = 2; i < rows.length; i++) {
            if (safeText(rows[i] && rows[i][0]).toLowerCase().indexOf('nguồn lưu lượng') !== -1) { headerIdx = i; break; }
        }
        var sources = [];
        if (headerIdx !== -1) {
            var hm = buildHeaderMap(rows[headerIdx] || []);
            for (var r = headerIdx + 1; r < rows.length; r++) {
                var row = rows[r] || [];
                var src = safeText(row[0]).trim();
                if (!src) continue;
                if (src.toLowerCase().indexOf('dịch vụ hiển thị shopee') !== -1) break;
                if (src.toLowerCase().indexOf('nguồn lưu lượng') !== -1 && r !== headerIdx) break;
                sources.push({
                    source: src,
                    revenueShare: parseVNNumber(getByHeader(row, hm, 'Tỷ lệ doanh số')),
                    revenue: parseVNNumber(getByHeader(row, hm, 'Doanh số (VND)')),
                    impressions: parseVNNumber(firstAvailable(row, hm, ['Lượt hiển thị sản phẩm', 'Lượt xem Livestream', 'Lượt xem Video', 'Lượt xem nội dung'])),
                    clicks: parseVNNumber(getByHeader(row, hm, 'Lượt nhấp vào sản phẩm')),
                    orders: parseVNNumber(getByHeader(row, hm, 'Tổng số đơn hàng')),
                    products: parseVNNumber(getByHeader(row, hm, 'Sản phẩm')),
                    ctr: parseVNNumber(getByHeader(row, hm, 'CTR')),
                    conversionRate: parseVNNumber(getByHeader(row, hm, 'Tỷ lệ chuyển đổi đơn hàng')),
                    avgOrderValue: parseVNNumber(getByHeader(row, hm, 'Doanh số trên mỗi đơn hàng')),
                    buyers: parseVNNumber(getByHeader(row, hm, 'Người mua'))
                });
            }
        }

        var adHeaderIdx = -1;
        for (var a = 2; a < rows.length; a++) {
            var adRowText = (rows[a] || []).map(function (x) { return safeText(x).toLowerCase(); }).join('|');
            if (adRowText.indexOf('chi phí quảng cáo') !== -1 && adRowText.indexOf('roas quảng cáo') !== -1) { adHeaderIdx = a; break; }
        }
        var adCampaigns = [];
        if (adHeaderIdx !== -1) {
            var ah = buildHeaderMap(rows[adHeaderIdx] || []);
            for (var ar = adHeaderIdx + 1; ar < rows.length; ar++) {
                var adRow = rows[ar] || [];
                var campaign = safeText(adRow[0]).trim();
                if (!campaign) continue;
                var lowCampaign = campaign.toLowerCase();
                if (lowCampaign.indexOf('nguồn lưu lượng') !== -1 || lowCampaign.indexOf('dịch vụ hiển thị shopee') !== -1) continue;
                if (isShopeeDateLabel(campaign)) continue;
                var cost = parseVNNumber(getByHeader(adRow, ah, 'Chi phí quảng cáo'));
                var revenue = parseVNNumber(getByHeader(adRow, ah, 'Doanh số (VND)'));
                var orders = parseVNNumber(getByHeader(adRow, ah, 'Tổng số đơn hàng'));
                var impressions = parseVNNumber(getByHeader(adRow, ah, 'Ads Impression'));
                var roas = parseVNNumber(getByHeader(adRow, ah, 'ROAS quảng cáo'));
                if (cost === 0 && revenue === 0 && orders === 0 && impressions === 0) continue;
                adCampaigns.push({
                    campaign: campaign,
                    revenueShare: parseVNNumber(getByHeader(adRow, ah, 'Tỷ lệ doanh số')),
                    revenue: revenue,
                    impressions: impressions,
                    orders: orders,
                    conversionRate: parseVNNumber(getByHeader(adRow, ah, 'Tỷ lệ chuyển đổi')),
                    adCost: cost,
                    adRoas: roas
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
        var headerMap = null;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i] || [];
            var first = safeText(row[0]).trim();
            if (!first) continue;
            var low = first.toLowerCase();
            if (low === 'mã sản phẩm') {
                headerMap = buildHeaderMap(row);
                continue;
            }
            var nextFirst = safeText(rows[i + 1] && rows[i + 1][0]).trim().toLowerCase();
            if (nextFirst === 'mã sản phẩm') {
                currentSource = first;
                continue;
            }
            if (!headerMap) continue;
            var sku = safeText(getByHeader(row, headerMap, 'Mã sản phẩm')).trim();
            var name = safeText(getByHeader(row, headerMap, 'Sản phẩm')).trim();
            if (!sku && !name) continue;
            products.push({
                sku: sku || ('NO-SKU-' + products.length),
                productName: name,
                source: currentSource || 'Không rõ nguồn',
                status: safeText(getByHeader(row, headerMap, 'Tình trạng sản phẩm hiện tại')).trim(),
                revenueShare: parseVNNumber(getByHeader(row, headerMap, 'Tỷ lệ doanh số')),
                revenue: parseVNNumber(getByHeader(row, headerMap, 'Doanh số (VND)')),
                impressions: parseVNNumber(firstAvailable(row, headerMap, ['Lượt hiển thị sản phẩm', 'Lượt xem Livestream', 'Lượt xem Video', 'Lượt xem nội dung'])),
                clicks: parseVNNumber(getByHeader(row, headerMap, 'Lượt nhấp vào sản phẩm')),
                orders: parseVNNumber(getByHeader(row, headerMap, 'Tổng số đơn hàng')),
                soldProducts: parseVNNumber(getByHeader(row, headerMap, 'Sản phẩm')),
                ctr: parseVNNumber(getByHeader(row, headerMap, 'CTR')),
                conversionRate: parseVNNumber(getByHeader(row, headerMap, 'Tỷ lệ chuyển đổi đơn hàng')),
                avgOrderValue: parseVNNumber(getByHeader(row, headerMap, 'Doanh số trên mỗi đơn hàng')),
                buyers: parseVNNumber(getByHeader(row, headerMap, 'Người mua'))
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

    function parseShopeeShopStatsWorkbook(workbook, fileName, adSpendInput) {
        var confirmed = parseOrderSheet(normalizeSheetRows(workbook, 'Đơn đã xác nhận'), 'Đơn đã xác nhận');
        if (!confirmed) throw new Error('File chưa đúng định dạng Shopee Shop Stats. Cần có sheet: Đơn đã xác nhận.');

        var trafficConfirmedSheet = findTrafficSheet(workbook, 'Đơn đã xác nhận');
        var trafficDailySheet = findDetailedTrafficDailySheet(workbook);
        var productConfirmedSheet = findProductSheet(workbook, 'Đơn đã xác nhận');

        var trafficConfirmed = trafficConfirmedSheet ? parseTrafficSheet(trafficConfirmedSheet.rows) : { summary: {}, sources: [], adCampaigns: [] };
        var sourceDaily = trafficDailySheet ? parseDetailedTrafficDaily(trafficDailySheet.rows) : [];
        var parsedProducts = productConfirmedSheet ? parseProductSheet(productConfirmedSheet.rows) : { rows: [], bySku: [] };

        var manualAdSpend = parseVNNumber(adSpendInput);
        var confirmedSummary = confirmed.summary;
        var adsRevenue = trafficConfirmed.summary.shopeeAdsRevenue || 0;
        var adsCostFromFile = trafficConfirmed.summary.shopeeAdsCost || 0;
        var adSpend = manualAdSpend > 0 ? manualAdSpend : adsCostFromFile;
        var adSpendSource = manualAdSpend > 0 ? 'manual_input' : (adsCostFromFile > 0 ? 'file_auto' : 'none');
        var cpa = adSpend > 0 && confirmedSummary.orders > 0 ? adSpend / confirmedSummary.orders : 0;
        var roasOverall = adSpend > 0 ? confirmedSummary.revenue / adSpend : 0;
        var roasAdsRevenue = adSpend > 0 ? adsRevenue / adSpend : 0;
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
            manualAdSpend: manualAdSpend,
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
                shopeeAdsOrders: trafficConfirmed.summary.shopeeAdsOrders || 0,
                shopeeAdsImpressions: trafficConfirmed.summary.shopeeAdsImpressions || 0,
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
            g.conversionRate = g.clicks > 0 ? (g.orders / g.clicks) * 100 : 0;
            g.avgOrderValue = g.orders > 0 ? g.revenue / g.orders : 0;
            g.roas = g.adCost > 0 ? g.revenue / g.adCost : 0;
            return g;
        }).sort(function (a, b) { return b.revenue - a.revenue || b.adCost - a.adCost; });
    }

    function getViewData() {
        var data = SHOPEE_STATE.current;
        if (!data) return null;
        var dailyAll = (data.orders && data.orders.confirmed && data.orders.confirmed.daily) || [];
        var sourceDailyAll = (data.traffic && data.traffic.sourceDaily) || [];
        var daily = dailyAll.filter(function (d) { return inDateRange(d.dateISO); });
        var sourceDaily = sourceDailyAll.filter(function (d) { return inDateRange(d.dateISO); });
        var filterActive = hasDateFilter();
        var baseM = data.metrics || {};
        var adRowsFiltered = sourceDaily.filter(function (x) { return x.section === 'Dịch vụ Hiển thị Shopee'; });
        var adsCostFiltered = sumRows(adRowsFiltered, 'adCost');
        var adsRevenueFiltered = sumRows(adRowsFiltered, 'revenue');
        var adsOrdersFiltered = sumRows(adRowsFiltered, 'orders');
        var adsImpressionsFiltered = sumRows(adRowsFiltered, 'impressions');
        var adSpend = filterActive && adsCostFiltered > 0 ? adsCostFiltered : (baseM.adSpend || 0);
        var metrics;
        if (filterActive) {
            var revenue = sumRows(daily, 'revenue');
            var orders = sumRows(daily, 'orders');
            var clicks = sumRows(daily, 'clicks');
            var visits = sumRows(daily, 'visits');
            var buyers = sumRows(daily, 'buyers');
            metrics = Object.assign({}, baseM, {
                confirmedRevenue: revenue,
                confirmedOrders: orders,
                avgOrderValue: orders > 0 ? revenue / orders : 0,
                productClicks: clicks,
                visits: visits,
                conversionRate: clicks > 0 ? (orders / clicks) * 100 : 0,
                buyers: buyers,
                newBuyers: sumRows(daily, 'newBuyers'),
                existingBuyers: sumRows(daily, 'existingBuyers'),
                cancelledOrders: sumRows(daily, 'cancelledOrders'),
                returnedOrders: sumRows(daily, 'returnedOrders'),
                adsRevenue: adsRevenueFiltered || baseM.adsRevenue,
                adSpend: adSpend,
                adsCostFromFile: adsCostFiltered || baseM.adsCostFromFile,
                shopeeAdsOrders: adsOrdersFiltered || baseM.shopeeAdsOrders,
                shopeeAdsImpressions: adsImpressionsFiltered || baseM.shopeeAdsImpressions,
                cpa: adSpend > 0 && orders > 0 ? adSpend / orders : 0,
                roasOverall: adSpend > 0 ? revenue / adSpend : 0,
                roasAdsRevenue: adSpend > 0 ? (adsRevenueFiltered || 0) / adSpend : 0,
                cancelRate: orders > 0 ? (sumRows(daily, 'cancelledOrders') / orders) * 100 : 0,
                returnRate: orders > 0 ? (sumRows(daily, 'returnedOrders') / orders) * 100 : 0
            });
        } else {
            metrics = baseM;
        }
        var sourceGroups;
        if (filterActive && sourceDaily.length) {
            var highLevel = sourceDaily.filter(function (x) {
                if (x.section === 'Dịch vụ Hiển thị Shopee') return true;
                return x.section && x.source && x.section === x.source;
            });
            sourceGroups = groupRows(highLevel, function (x) { return TOP_SECTIONS[x.section] || x.section || x.source; });
        } else {
            var s = (data.traffic && data.traffic.confirmed && data.traffic.confirmed.summary) || {};
            sourceGroups = [
                { key: 'Thẻ sản phẩm', revenue: s.productCardRevenue || 0 },
                { key: 'Livestream', revenue: s.livestreamRevenue || 0 },
                { key: 'Video', revenue: s.videoRevenue || 0 },
                { key: 'Tiếp thị liên kết', revenue: s.affiliateRevenue || 0 },
                { key: 'Quảng cáo Shopee', revenue: s.shopeeAdsRevenue || 0, adCost: s.shopeeAdsCost || baseM.adsCostFromFile || 0 }
            ].filter(function (x) { return (x.revenue || 0) > 0 || (x.adCost || 0) > 0; });
        }
        var adCampaigns = filterActive && adRowsFiltered.length ? groupRows(adRowsFiltered, function (x) { return x.source; }).map(function (x) {
            return { campaign: x.key, revenue: x.revenue, impressions: x.impressions, orders: x.orders, adCost: x.adCost, adRoas: x.adCost > 0 ? x.revenue / x.adCost : 0 };
        }) : ((data.traffic && data.traffic.adCampaigns) || []);
        return {
            data: data,
            metrics: metrics,
            daily: daily,
            sourceDaily: sourceDaily,
            sourceGroups: sourceGroups,
            adCampaigns: adCampaigns,
            products: (data.products && data.products.confirmed) || [],
            filterActive: filterActive
        };
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
            .ss-input { min-width:190px; }
            .ss-date { min-width:145px; }
            .ss-upload-btn, .ss-action-btn { border:none; border-radius:999px; padding:11px 16px; font-weight:950; cursor:pointer; transition:.18s ease; }
            .ss-upload-btn { background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; box-shadow:0 10px 20px rgba(249,115,22,.22); }
            .ss-action-btn { background:#fff; color:#ea580c; border:1px solid #fed7aa; }
            .ss-upload-btn:hover, .ss-action-btn:hover { transform:translateY(-1px); }
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
                            <div class="ss-sub">Upload file <b>shopee-shop-stats</b>. Hệ thống chỉ lấy số liệu từ <b>Đơn đã xác nhận</b>. Dữ liệu tổng quan có thể bấm để xem chi tiết; sản phẩm được gom theo <b>Mã sản phẩm/SKU</b> để tránh lệch tên theo thời điểm.</div>
                        </div>
                        <span class="ss-badge">${SHOPEE_STATS_VERSION}</span>
                    </div>
                    <div class="ss-toolbar">
                        <select id="ss-company" class="ss-select" onchange="window.changeShopeeStatsCompany(this.value)">${options}</select>
                        <input id="ss-date-from" class="ss-input ss-date" type="date" value="${escapeHtml(SHOPEE_STATE.dateFrom)}" onchange="window.applyShopeeStatsDateFilter()" />
                        <input id="ss-date-to" class="ss-input ss-date" type="date" value="${escapeHtml(SHOPEE_STATE.dateTo)}" onchange="window.applyShopeeStatsDateFilter()" />
                        <input id="ss-ads-spend" class="ss-input" placeholder="Ghi đè chi phí Ads nếu cần" inputmode="numeric" />
                        <button class="ss-upload-btn" onclick="document.getElementById('ss-file-input').click()">📤 Upload file Shopee</button>
                        <button class="ss-action-btn" onclick="window.clearShopeeDateFilter()">Xóa lọc ngày</button>
                        <button class="ss-action-btn" onclick="window.clearShopeeStatsView()">Làm mới</button>
                        <input type="file" id="ss-file-input" accept=".xlsx,.xls,.csv" style="display:none" />
                    </div>
                </section>
                <div id="ss-dashboard-area"><div class="ss-empty">Chưa có dữ liệu. Hãy upload file Shopee Shop Stats hoặc chọn lại lịch sử đã lưu.</div></div>
            </div>
        `;
        var input = document.getElementById('ss-file-input');
        if (input) input.addEventListener('change', handleUpload);
        renderDashboard();
    }

    function setKpiHtml(view) {
        var m = view.metrics;
        var label = view.filterActive ? ('Đang lọc: ' + (SHOPEE_STATE.dateFrom ? displayDate(SHOPEE_STATE.dateFrom) : 'đầu kỳ') + ' → ' + (SHOPEE_STATE.dateTo ? displayDate(SHOPEE_STATE.dateTo) : 'cuối kỳ')) : 'Toàn kỳ file';
        return `
            <div class="ss-kpis">
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('revenue')"><span>Doanh thu xác nhận</span><strong>${fmtMoney(m.confirmedRevenue)}</strong><small>${label}</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('orders')"><span>Số đơn xác nhận</span><strong>${fmtNum(m.confirmedOrders, 0)}</strong><small>Hủy: ${fmtNum(m.cancelledOrders, 0)} • Hoàn: ${fmtNum(m.returnedOrders, 0)}</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('conversion')"><span>Tỷ lệ chuyển đổi</span><strong>${fmtPct(m.conversionRate)}</strong><small>Click: ${fmtNum(m.productClicks, 0)} • Truy cập: ${fmtNum(m.visits, 0)}</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('adcost')"><span>Chi phí Ads</span><strong>${m.adSpend > 0 ? fmtMoney(m.adSpend) : 'Chưa có'}</strong><small>${m.adSpendSource === 'file_auto' ? 'Tự đọc từ file' : (m.adSpendSource === 'manual_input' ? 'Nhập tay ghi đè' : 'Chưa có chi phí')} • DT Ads: ${fmtMoney(m.adsRevenue)}</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('cpa')"><span>Chi phí / đơn</span><strong>${m.cpa > 0 ? fmtMoney(m.cpa) : '-'}</strong><small>Tính theo đơn đã xác nhận</small></div>
                <div class="ss-kpi" onclick="window.showShopeeKpiDetail('roas')"><span>ROAS Shopee</span><strong>${m.roasOverall > 0 ? fmtNum(m.roasOverall, 2) + 'x' : '-'}</strong><small>ROAS từ Ads: ${m.roasAdsRevenue > 0 ? fmtNum(m.roasAdsRevenue, 2) + 'x' : '-'}</small></div>
            </div>
        `;
    }

    function renderDashboard() {
        var area = document.getElementById('ss-dashboard-area');
        if (!area) return;
        var view = getViewData();
        if (!view) { area.innerHTML = '<div class="ss-empty">Chưa có dữ liệu. Hãy upload file Shopee Shop Stats hoặc chọn lại lịch sử đã lưu.</div>'; return; }
        area.innerHTML = `
            ${setKpiHtml(view)}
            <div class="ss-grid">
                <section class="ss-card"><div class="ss-card-title">📈 Doanh thu & số đơn theo ngày <span class="ss-muted">${escapeHtml(view.data.period || '')}</span></div><div class="ss-chart-box"><canvas id="ss-daily-chart"></canvas></div></section>
                <section class="ss-card"><div class="ss-card-title">🧭 Cơ cấu doanh thu theo nguồn <span class="ss-muted">Bấm biểu đồ để xem nguồn</span></div><div class="ss-chart-box"><canvas id="ss-source-chart"></canvas></div></section>
            </div>
            <div class="ss-grid">
                <section class="ss-card"><div class="ss-card-title">🏆 Top sản phẩm theo mã sản phẩm/SKU <span class="ss-muted">Bấm cột để xem sản phẩm & nguồn</span></div><div class="ss-chart-box"><canvas id="ss-product-chart"></canvas></div></section>
                <section class="ss-card"><div class="ss-card-title">🕒 Lịch sử upload</div><div id="ss-history-list" class="ss-history"></div></section>
            </div>
            <section class="ss-card">
                <div class="ss-card-title">📦 Thống kê theo sản phẩm/SKU <input class="ss-input" id="ss-product-search" placeholder="Tìm mã/tên sản phẩm" value="${escapeHtml(SHOPEE_STATE.productSearch)}" oninput="window.searchShopeeProduct(this.value)" style="min-width:220px;padding:8px 10px;" /></div>
                <div class="ss-table-wrap"><table class="ss-table"><thead><tr><th>Mã SP/SKU</th><th>Sản phẩm đại diện</th><th>Nguồn chính</th><th class="ss-right">Doanh thu</th><th class="ss-center">Đơn</th><th class="ss-center">Click</th><th class="ss-center">CTR</th><th class="ss-center">CVR</th><th class="ss-right">AOV</th></tr></thead><tbody id="ss-product-tbody"></tbody></table></div>
                <div class="ss-muted" style="margin-top:8px;">Ghi chú: bảng sản phẩm trong file Shopee là dữ liệu theo kỳ file, không có chi tiết từng ngày; bộ lọc ngày áp dụng cho KPI, biểu đồ ngày và nguồn truy cập.</div>
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
        var products = (view.products || []).slice(0, 10).reverse();
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
        var titleMap = { revenue:'Chi tiết doanh thu xác nhận', orders:'Chi tiết số đơn xác nhận', conversion:'Chi tiết tỷ lệ chuyển đổi', adcost:'Chi tiết chi phí Ads Shopee', cpa:'Chi tiết chi phí / đơn', roas:'Chi tiết ROAS Shopee' };
        var body = '';
        if (kind === 'adcost') {
            body += detailGrid([['Chi phí Ads', fmtMoney(m.adSpend)], ['Doanh thu từ Ads', fmtMoney(m.adsRevenue)], ['Đơn từ Ads', fmtNum(m.shopeeAdsOrders, 2)], ['ROAS Ads', m.roasAdsRevenue ? fmtNum(m.roasAdsRevenue, 2) + 'x' : '-']]);
            body += tableHtml(['Chiến dịch Ads','Doanh thu','Chi phí','Đơn','Hiển thị','ROAS'], (view.adCampaigns || []).map(function (a) { return '<tr><td><b>' + escapeHtml(a.campaign || a.key) + '</b></td><td class="ss-right">' + fmtMoney(a.revenue) + '</td><td class="ss-right"><b>' + fmtMoney(a.adCost) + '</b></td><td class="ss-center">' + fmtNum(a.orders, 2) + '</td><td class="ss-center">' + fmtNum(a.impressions, 0) + '</td><td class="ss-center"><b>' + (a.adRoas ? fmtNum(a.adRoas, 2) + 'x' : '-') + '</b></td></tr>'; }));
        } else if (kind === 'conversion') {
            body += detailGrid([['Tỷ lệ chuyển đổi', fmtPct(m.conversionRate)], ['Click sản phẩm', fmtNum(m.productClicks, 0)], ['Số đơn', fmtNum(m.confirmedOrders, 0)], ['Truy cập', fmtNum(m.visits, 0)]]);
            body += buildSourceDetailTable(view);
        } else if (kind === 'orders') {
            body += detailGrid([['Số đơn xác nhận', fmtNum(m.confirmedOrders, 0)], ['Đơn hủy', fmtNum(m.cancelledOrders, 0)], ['Đơn hoàn/hoàn tiền', fmtNum(m.returnedOrders, 0)], ['Người mua', fmtNum(m.buyers, 0)]]);
            body += buildDailyTable(view.daily);
        } else if (kind === 'cpa') {
            body += detailGrid([['Công thức', 'Chi phí Ads / Số đơn'], ['Chi phí Ads', fmtMoney(m.adSpend)], ['Số đơn', fmtNum(m.confirmedOrders, 0)], ['CPA', m.cpa ? fmtMoney(m.cpa) : '-']]);
            body += buildDailyTable(view.daily);
        } else if (kind === 'roas') {
            body += detailGrid([['Công thức', 'Doanh thu / Chi phí Ads'], ['Doanh thu xác nhận', fmtMoney(m.confirmedRevenue)], ['Chi phí Ads', fmtMoney(m.adSpend)], ['ROAS', m.roasOverall ? fmtNum(m.roasOverall, 2) + 'x' : '-']]);
            body += buildSourceDetailTable(view);
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
        var rows = (view.sourceGroups || []).map(function (s) { return '<tr><td><b>' + escapeHtml(s.key) + '</b></td><td class="ss-right"><b>' + fmtMoney(s.revenue) + '</b></td><td class="ss-right">' + (s.adCost ? fmtMoney(s.adCost) : '-') + '</td><td class="ss-center">' + fmtNum(s.orders,2) + '</td><td class="ss-center">' + fmtNum(s.clicks,0) + '</td><td class="ss-center">' + fmtPct(s.conversionRate || 0) + '</td></tr>'; });
        return tableHtml(['Nguồn','Doanh thu','Chi phí Ads','Đơn','Click','CVR'], rows);
    }

    window.showShopeeSourceDetail = function (sourceLabel) {
        var view = getViewData(); if (!view) return;
        var related = (view.sourceDaily || []).filter(function (x) { return (TOP_SECTIONS[x.section] || x.section || x.source) === sourceLabel || x.source === sourceLabel; });
        var summary = groupRows(related, function (x) { return x.source; });
        if (!related.length && view.sourceGroups) summary = view.sourceGroups.filter(function (x) { return x.key === sourceLabel; });
        var body = tableHtml(['Nguồn chi tiết','Doanh thu','Chi phí Ads','Đơn','Hiển thị','Click','CVR'], summary.map(function (s) { return '<tr><td><b>' + escapeHtml(s.key || s.source) + '</b></td><td class="ss-right"><b>' + fmtMoney(s.revenue) + '</b></td><td class="ss-right">' + (s.adCost ? fmtMoney(s.adCost) : '-') + '</td><td class="ss-center">' + fmtNum(s.orders,2) + '</td><td class="ss-center">' + fmtNum(s.impressions,0) + '</td><td class="ss-center">' + fmtNum(s.clicks,0) + '</td><td class="ss-center">' + fmtPct(s.conversionRate || 0) + '</td></tr>'; }));
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
            + tableHtml(['Nguồn','Doanh thu','Chi phí Ads','Đơn','Click','CVR'], groupRows(related, function (x) { return TOP_SECTIONS[x.section] || x.section; }).map(function (s) { return '<tr><td><b>' + escapeHtml(s.key) + '</b></td><td class="ss-right"><b>' + fmtMoney(s.revenue) + '</b></td><td class="ss-right">' + (s.adCost ? fmtMoney(s.adCost) : '-') + '</td><td class="ss-center">' + fmtNum(s.orders,2) + '</td><td class="ss-center">' + fmtNum(s.clicks,0) + '</td><td class="ss-center">' + fmtPct(s.conversionRate || 0) + '</td></tr>'; }));
        showModal('Chi tiết ngày ' + displayDate(dateISO), body);
    };

    function handleUpload(e) {
        var file = e.target.files && e.target.files[0]; if (!file) return;
        if (typeof XLSX === 'undefined') { toast('Thiếu thư viện XLSX. Hãy kiểm tra script xlsx trong giao diện chính.', 'error'); e.target.value = ''; return; }
        var adSpend = document.getElementById('ss-ads-spend') ? document.getElementById('ss-ads-spend').value : 0;
        var reader = new FileReader();
        reader.onload = function (evt) {
            try {
                var arr = new Uint8Array(evt.target.result);
                var workbook = XLSX.read(arr, { type: 'array' });
                var parsed = parseShopeeShopStatsWorkbook(workbook, file.name, adSpend);
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
        db.ref('shopee_shop_stats_logs').limitToLast(80).on('value', function (snapshot) {
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
        if (list.length === 0) { box.innerHTML = '<div class="ss-empty" style="padding:20px;">Chưa có lịch sử upload.</div>'; return; }
        box.innerHTML = list.slice(0, 12).map(function (item) {
            var active = SHOPEE_STATE.current && SHOPEE_STATE.current.batchId === item.batchId;
            return `<div class="ss-history-item ${active ? 'active' : ''}" onclick="window.selectShopeeStatsBatch('${escapeHtml(item.batchId)}')"><div><b>${escapeHtml(item.fileName || 'Shopee stats')}</b><div class="ss-muted">${escapeHtml(item.period || '')} • ${escapeHtml(item.uploader || '')}</div></div><div style="text-align:right;"><b>${fmtMoney(item.metrics ? item.metrics.confirmedRevenue : 0)}</b><div class="ss-muted">${item.uploadedAt ? new Date(item.uploadedAt).toLocaleString('vi-VN') : ''}</div></div></div>`;
        }).join('');
    }

    window.selectShopeeStatsBatch = function (batchId) {
        var found = (SHOPEE_STATE.history || []).find(function (x) { return String(x.batchId) === String(batchId); });
        if (found) { SHOPEE_STATE.current = found; renderDashboard(); }
    };

    window.changeShopeeStatsCompany = function (companyId) {
        SHOPEE_STATE.company = companyId || 'NNV';
        SHOPEE_STATE.current = null;
        SHOPEE_STATE.dateFrom = ''; SHOPEE_STATE.dateTo = ''; SHOPEE_STATE.productSearch = '';
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
        renderDashboard();
    };

    window.clearShopeeDateFilter = function () {
        SHOPEE_STATE.dateFrom = ''; SHOPEE_STATE.dateTo = '';
        var f = document.getElementById('ss-date-from'); var t = document.getElementById('ss-date-to');
        if (f) f.value = ''; if (t) t.value = '';
        renderDashboard();
    };

    window.searchShopeeProduct = function (q) { SHOPEE_STATE.productSearch = q || ''; renderTables(getViewData()); };

    window.clearShopeeStatsView = function () {
        SHOPEE_STATE.current = null; SHOPEE_STATE.dateFrom = ''; SHOPEE_STATE.dateTo = ''; SHOPEE_STATE.productSearch = '';
        var spend = document.getElementById('ss-ads-spend'); if (spend) spend.value = '';
        renderDashboard();
    };

    window.initShopeeShopStatsDashboard = function () {
        console.log('Shopee Shop Stats Dashboard Loaded', SHOPEE_STATS_VERSION);
        renderBase(); loadLatestForCompany(); loadHistory();
    };

    window.initEcomDashboard = window.initShopeeShopStatsDashboard;
})();

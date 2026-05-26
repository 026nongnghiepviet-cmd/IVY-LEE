/**
 * SHOPEE SHOP STATS DASHBOARD V1.1 - CONFIRMED ONLY
 * Dùng cho file Shopee Seller Center: *.shopee-shop-stats.YYYYMMDD-YYYYMMDD.xlsx
 * - Upload file thống kê Shop Shopee
 * - CHỈ đọc số liệu từ nhóm sheet Đơn đã xác nhận
 * - Không dùng sheet Đơn hàng đã đặt / Đơn Đã Thanh Toán để tính KPI
 * - Cho nhập Chi phí Ads Shopee để tính Chi phí/đơn và ROAS
 * - Lưu Firebase: shopee_shop_stats_logs, shopee_shop_stats_latest
 */
(function () {
    'use strict';

    var SHOPEE_STATS_VERSION = 'V1.1.0_CONFIRMED_ONLY';
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
        charts: {}
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
        // Chuẩn VN: 34.018.359 hoặc 253.868,35
        if (s.indexOf(',') !== -1) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            // Nếu có nhiều dấu chấm thì là phân tách hàng nghìn
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

    function fmtPct(n) {
        return fmtNum(n, 2) + '%';
    }

    function getContainer() {
        return document.getElementById('ecom-dashboard-container') ||
               document.getElementById('shopee-shop-dashboard-container') ||
               document.getElementById('shopee-dashboard-container') ||
               document.getElementById('page-ecom-main') ||
               document.getElementById('page-shopee');
    }

    function toast(message, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }
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
            if (h !== null && h !== undefined && String(h).trim() !== '') {
                map[String(h).trim().toLowerCase()] = idx;
            }
        });
        return map;
    }

    function getByHeader(row, headerMap, headerName) {
        var idx = headerMap[String(headerName).trim().toLowerCase()];
        return idx === undefined ? null : row[idx];
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
            if (safeText(rows[i] && rows[i][0]).trim().toLowerCase() === 'ngày') {
                headerIdx = i;
                break;
            }
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
            if (row0.indexOf('doanh thu từ quảng cáo shopee') !== -1 && row1Label.indexOf(orderLabel.toLowerCase()) !== -1) {
                return { name: sheetNames[i], rows: rows };
            }
        }
        return null;
    }

    function parseTrafficSheet(rows) {
        if (!rows || rows.length < 2) return { summary: {}, sources: [] };
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
            shopeeAdsRevenue: parseVNNumber(getByHeader(v0, h0, 'Doanh thu từ quảng cáo Shopee'))
        };

        var headerIdx = -1;
        for (var i = 2; i < rows.length; i++) {
            if (safeText(rows[i] && rows[i][0]).toLowerCase().indexOf('nguồn lưu lượng') !== -1) {
                headerIdx = i;
                break;
            }
        }
        var sources = [];
        if (headerIdx !== -1) {
            var hm = buildHeaderMap(rows[headerIdx] || []);
            for (var r = headerIdx + 1; r < rows.length; r++) {
                var row = rows[r] || [];
                var src = safeText(row[0]).trim();
                if (!src) continue;
                sources.push({
                    source: src,
                    revenueShare: parseVNNumber(getByHeader(row, hm, 'Tỷ lệ doanh số')),
                    revenue: parseVNNumber(getByHeader(row, hm, 'Doanh số (VND)')),
                    impressions: parseVNNumber(getByHeader(row, hm, 'Lượt hiển thị sản phẩm')),
                    clicks: parseVNNumber(getByHeader(row, hm, 'Lượt nhấp vào sản phẩm')),
                    orders: parseVNNumber(getByHeader(row, hm, 'Tổng số đơn hàng')),
                    products: parseVNNumber(getByHeader(row, hm, 'Sản phẩm')),
                    ctr: parseVNNumber(getByHeader(row, hm, 'CTR')),
                    conversionRate: parseVNNumber(getByHeader(row, hm, 'Tỷ lệ chuyển đổi đơn hàng')),
                    avgOrderValue: parseVNNumber(getByHeader(row, hm, 'Doanh số trên mỗi đơn hàng')),
                    buyers: parseVNNumber(getByHeader(row, hm, 'Người mua')),
                    uniqueImpressions: parseVNNumber(getByHeader(row, hm, 'Lượt hiển thị sản phẩm duy nhất')),
                    uniqueClicks: parseVNNumber(getByHeader(row, hm, 'Lượt nhấp sản phẩm duy nhất'))
                });
            }
        }
        return { summary: summary, sources: sources };
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
        if (!rows) return products;
        var headerIdx = -1;
        for (var i = 0; i < rows.length; i++) {
            if (safeText(rows[i] && rows[i][0]).trim().toLowerCase() === 'mã sản phẩm') {
                headerIdx = i;
                break;
            }
        }
        if (headerIdx === -1) return products;
        var hm = buildHeaderMap(rows[headerIdx] || []);
        for (var r = headerIdx + 1; r < rows.length; r++) {
            var row = rows[r] || [];
            var sku = safeText(getByHeader(row, hm, 'Mã sản phẩm')).trim();
            var name = safeText(getByHeader(row, hm, 'Sản phẩm')).trim();
            if (!sku && !name) continue;
            products.push({
                sku: sku,
                productName: name,
                status: safeText(getByHeader(row, hm, 'Tình trạng sản phẩm hiện tại')).trim(),
                revenueShare: parseVNNumber(getByHeader(row, hm, 'Tỷ lệ doanh số')),
                revenue: parseVNNumber(getByHeader(row, hm, 'Doanh số (VND)')),
                impressions: parseVNNumber(getByHeader(row, hm, 'Lượt hiển thị sản phẩm')),
                clicks: parseVNNumber(getByHeader(row, hm, 'Lượt nhấp vào sản phẩm')),
                orders: parseVNNumber(getByHeader(row, hm, 'Tổng số đơn hàng')),
                soldProducts: parseVNNumber(getByHeader(row, hm, 'Sản phẩm')),
                ctr: parseVNNumber(getByHeader(row, hm, 'CTR')),
                conversionRate: parseVNNumber(getByHeader(row, hm, 'Tỷ lệ chuyển đổi đơn hàng')),
                avgOrderValue: parseVNNumber(getByHeader(row, hm, 'Doanh số trên mỗi đơn hàng')),
                buyers: parseVNNumber(getByHeader(row, hm, 'Người mua'))
            });
        }
        return products.sort(function (a, b) { return b.revenue - a.revenue; });
    }

    function parseShopeeShopStatsWorkbook(workbook, fileName, adSpendInput) {
        // YÊU CẦU VẬN HÀNH: Chỉ nhận số liệu từ sheet "Đơn đã xác nhận".
        // Không lấy KPI từ "Đơn hàng đã đặt" hoặc "Đơn Đã Thanh Toán".
        var confirmed = parseOrderSheet(normalizeSheetRows(workbook, 'Đơn đã xác nhận'), 'Đơn đã xác nhận');

        if (!confirmed) {
            throw new Error('File chưa đúng định dạng Shopee Shop Stats. Cần có sheet: Đơn đã xác nhận.');
        }

        var trafficConfirmedSheet = findTrafficSheet(workbook, 'Đơn đã xác nhận');
        var productConfirmedSheet = findProductSheet(workbook, 'Đơn đã xác nhận');

        var trafficConfirmed = trafficConfirmedSheet ? parseTrafficSheet(trafficConfirmedSheet.rows) : { summary: {}, sources: [] };
        var productsConfirmed = productConfirmedSheet ? parseProductSheet(productConfirmedSheet.rows) : [];

        var adSpend = parseVNNumber(adSpendInput);
        var confirmedSummary = confirmed.summary;
        var adsRevenue = trafficConfirmed.summary.shopeeAdsRevenue || 0;
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
                adSpend: adSpend,
                cpa: cpa,
                roasOverall: roasOverall,
                roasAdsRevenue: roasAdsRevenue
            },
            orders: {
                confirmed: confirmed
            },
            traffic: {
                confirmed: trafficConfirmed
            },
            products: {
                confirmed: productsConfirmed
            }
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
            .ss-sub { color:#64748b; margin-top:8px; line-height:1.6; font-size:13px; max-width:860px; }
            .ss-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-top:18px; }
            .ss-select, .ss-input { border:1px solid #e2e8f0; background:#fff; border-radius:12px; padding:10px 12px; outline:none; font-weight:800; color:#334155; min-height:40px; }
            .ss-input { min-width:190px; }
            .ss-upload-btn, .ss-action-btn { border:none; border-radius:999px; padding:11px 16px; font-weight:950; cursor:pointer; transition:.18s ease; }
            .ss-upload-btn { background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; box-shadow:0 10px 20px rgba(249,115,22,.22); }
            .ss-action-btn { background:#fff; color:#ea580c; border:1px solid #fed7aa; }
            .ss-upload-btn:hover, .ss-action-btn:hover { transform:translateY(-1px); }
            .ss-kpis { display:grid; grid-template-columns:repeat(6,minmax(140px,1fr)); gap:10px; }
            .ss-kpi { background:#fff; border:1px solid #e2e8f0; border-radius:18px; padding:14px; box-shadow:0 8px 18px rgba(15,23,42,.035); }
            .ss-kpi span { display:block; color:#64748b; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.04em; }
            .ss-kpi strong { display:block; color:#0f172a; font-size:22px; margin-top:6px; line-height:1.15; }
            .ss-kpi small { display:block; color:#94a3b8; margin-top:5px; font-weight:700; }
            .ss-grid { display:grid; grid-template-columns:1.1fr .9fr; gap:14px; }
            .ss-card { background:rgba(255,255,255,.9); border:1px solid #e2e8f0; border-radius:22px; padding:18px; box-shadow:0 10px 24px rgba(15,23,42,.04); min-width:0; }
            .ss-card-title { color:#0f172a; font-weight:950; margin-bottom:12px; display:flex; justify-content:space-between; gap:10px; align-items:center; }
            .ss-chart-box { height:320px; position:relative; }
            .ss-table-wrap { width:100%; overflow:auto; border:1px solid #e2e8f0; border-radius:16px; background:#fff; max-height:360px; }
            .ss-table { width:100%; border-collapse:separate; border-spacing:0; min-width:780px; font-size:12px; }
            .ss-table th { position:sticky; top:0; z-index:1; background:#f8fafc; color:#475569; text-transform:uppercase; font-size:10px; padding:10px; border-bottom:1px solid #e2e8f0; text-align:left; }
            .ss-table td { padding:9px 10px; border-bottom:1px solid #eef2f7; color:#334155; vertical-align:top; }
            .ss-table tr:last-child td { border-bottom:0; }
            .ss-right { text-align:right !important; }
            .ss-center { text-align:center !important; }
            .ss-history { display:grid; gap:8px; }
            .ss-history-item { border:1px solid #e2e8f0; background:#fff; border-radius:14px; padding:10px; cursor:pointer; transition:.16s ease; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; }
            .ss-history-item:hover { border-color:#fb923c; transform:translateY(-1px); }
            .ss-history-item.active { background:#fff7ed; border-color:#f97316; }
            .ss-muted { color:#64748b; font-size:12px; }
            .ss-empty { text-align:center; padding:34px 20px; color:#64748b; font-weight:800; background:#fff; border:1px dashed #cbd5e1; border-radius:18px; }
            .ss-badge { display:inline-flex; align-items:center; border-radius:999px; padding:4px 8px; font-size:10px; font-weight:900; background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
            @media(max-width:1280px){ .ss-kpis{grid-template-columns:repeat(3,minmax(0,1fr));} .ss-grid{grid-template-columns:1fr;} }
            @media(max-width:680px){ .ss-kpis{grid-template-columns:1fr;} .ss-title{font-size:20px;} .ss-toolbar>*{width:100%;} .ss-chart-box{height:280px;} }
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
                            <div class="ss-sub">Upload file <b>shopee-shop-stats</b>. Hệ thống <b>chỉ lấy số liệu từ sheet Đơn đã xác nhận</b> để ghi nhận doanh thu, số đơn, tỷ lệ chuyển đổi, doanh thu từ quảng cáo Shopee, nguồn truy cập và top sản phẩm. Chi phí Ads Shopee có thể nhập thêm để tính CPA và ROAS.</div>
                        </div>
                        <span class="ss-badge">${SHOPEE_STATS_VERSION}</span>
                    </div>
                    <div class="ss-toolbar">
                        <select id="ss-company" class="ss-select" onchange="window.changeShopeeStatsCompany(this.value)">${options}</select>
                        <input id="ss-ads-spend" class="ss-input" placeholder="Chi phí Ads Shopee, VD: 2500000" inputmode="numeric" />
                        <button class="ss-upload-btn" onclick="document.getElementById('ss-file-input').click()">📤 Upload file Shopee</button>
                        <button class="ss-action-btn" onclick="window.clearShopeeStatsView()">Làm mới</button>
                        <input type="file" id="ss-file-input" accept=".xlsx,.xls,.csv" style="display:none" />
                    </div>
                </section>

                <div id="ss-dashboard-area">
                    <div class="ss-empty">Chưa có dữ liệu. Hãy upload file Shopee Shop Stats hoặc chọn lại lịch sử đã lưu.</div>
                </div>
            </div>
        `;
        var input = document.getElementById('ss-file-input');
        if (input) input.addEventListener('change', handleUpload);
        renderDashboard();
    }

    function setKpiHtml(data) {
        var m = data.metrics;
        return `
            <div class="ss-kpis">
                <div class="ss-kpi"><span>Doanh thu xác nhận</span><strong>${fmtMoney(m.confirmedRevenue)}</strong><small>Không trợ giá Shopee: ${fmtMoney(m.revenueNoShopeeSubsidy)}</small></div>
                <div class="ss-kpi"><span>Số đơn xác nhận</span><strong>${fmtNum(m.confirmedOrders, 0)}</strong><small>Đơn hủy: ${fmtNum(m.cancelledOrders, 0)} • Hoàn/hoàn tiền: ${fmtNum(m.returnedOrders, 0)}</small></div>
                <div class="ss-kpi"><span>Tỷ lệ chuyển đổi</span><strong>${fmtPct(m.conversionRate)}</strong><small>Click: ${fmtNum(m.productClicks, 0)} • Truy cập: ${fmtNum(m.visits, 0)}</small></div>
                <div class="ss-kpi"><span>Chi phí Ads</span><strong>${m.adSpend > 0 ? fmtMoney(m.adSpend) : 'Chưa nhập'}</strong><small>DT từ Ads Shopee: ${fmtMoney(m.adsRevenue)}</small></div>
                <div class="ss-kpi"><span>Chi phí / đơn</span><strong>${m.cpa > 0 ? fmtMoney(m.cpa) : '-'}</strong><small>Tính theo đơn đã xác nhận</small></div>
                <div class="ss-kpi"><span>ROAS Shopee</span><strong>${m.roasOverall > 0 ? fmtNum(m.roasOverall, 2) + 'x' : '-'}</strong><small>ROAS từ Ads: ${m.roasAdsRevenue > 0 ? fmtNum(m.roasAdsRevenue, 2) + 'x' : '-'}</small></div>
            </div>
        `;
    }

    function renderDashboard() {
        var area = document.getElementById('ss-dashboard-area');
        if (!area) return;
        var data = SHOPEE_STATE.current;
        if (!data) {
            area.innerHTML = '<div class="ss-empty">Chưa có dữ liệu. Hãy upload file Shopee Shop Stats hoặc chọn lại lịch sử đã lưu.</div>';
            return;
        }

        area.innerHTML = `
            ${setKpiHtml(data)}
            <div class="ss-grid">
                <section class="ss-card">
                    <div class="ss-card-title">📈 Doanh thu & số đơn theo ngày <span class="ss-muted">${escapeHtml(data.period || '')}</span></div>
                    <div class="ss-chart-box"><canvas id="ss-daily-chart"></canvas></div>
                </section>
                <section class="ss-card">
                    <div class="ss-card-title">🧭 Cơ cấu doanh thu theo nguồn</div>
                    <div class="ss-chart-box"><canvas id="ss-source-chart"></canvas></div>
                </section>
            </div>
            <div class="ss-grid">
                <section class="ss-card">
                    <div class="ss-card-title">🏆 Top sản phẩm theo doanh thu xác nhận</div>
                    <div class="ss-chart-box"><canvas id="ss-product-chart"></canvas></div>
                </section>
                <section class="ss-card">
                    <div class="ss-card-title">🕒 Lịch sử upload</div>
                    <div id="ss-history-list" class="ss-history"></div>
                </section>
            </div>
            <section class="ss-card">
                <div class="ss-card-title">📦 Bảng top sản phẩm</div>
                <div class="ss-table-wrap"><table class="ss-table"><thead><tr><th>Mã SP</th><th>Sản phẩm</th><th class="ss-right">Doanh thu</th><th class="ss-center">Đơn</th><th class="ss-center">CTR</th><th class="ss-center">CVR</th><th class="ss-right">AOV</th></tr></thead><tbody id="ss-product-tbody"></tbody></table></div>
            </section>
            <section class="ss-card">
                <div class="ss-card-title">📅 Bảng doanh thu theo ngày</div>
                <div class="ss-table-wrap"><table class="ss-table"><thead><tr><th>Ngày</th><th class="ss-right">Doanh thu</th><th class="ss-center">Đơn</th><th class="ss-center">Click</th><th class="ss-center">Truy cập</th><th class="ss-center">Tỷ lệ chuyển đổi</th><th class="ss-center">Người mua</th></tr></thead><tbody id="ss-daily-tbody"></tbody></table></div>
            </section>
        `;
        renderHistoryList();
        renderTables(data);
        drawCharts(data);
    }

    function renderTables(data) {
        var products = (data.products.confirmed || []).slice(0, 30);
        var pBody = document.getElementById('ss-product-tbody');
        if (pBody) {
            pBody.innerHTML = products.map(function (p) {
                return `<tr>
                    <td>${escapeHtml(p.sku)}</td>
                    <td><b>${escapeHtml(p.productName)}</b><div class="ss-muted">${escapeHtml(p.status || '')}</div></td>
                    <td class="ss-right"><b>${fmtMoney(p.revenue)}</b></td>
                    <td class="ss-center">${fmtNum(p.orders, 2)}</td>
                    <td class="ss-center">${fmtPct(p.ctr)}</td>
                    <td class="ss-center">${fmtPct(p.conversionRate)}</td>
                    <td class="ss-right">${fmtMoney(p.avgOrderValue)}</td>
                </tr>`;
            }).join('') || '<tr><td colspan="7" class="ss-center">Không có dữ liệu sản phẩm từ nhóm sheet Đơn đã xác nhận.</td></tr>';
        }

        var daily = (data.orders.confirmed.daily || []).slice(0, 366);
        var dBody = document.getElementById('ss-daily-tbody');
        if (dBody) {
            dBody.innerHTML = daily.map(function (d) {
                return `<tr>
                    <td><b>${escapeHtml(d.date)}</b></td>
                    <td class="ss-right"><b>${fmtMoney(d.revenue)}</b></td>
                    <td class="ss-center">${fmtNum(d.orders, 0)}</td>
                    <td class="ss-center">${fmtNum(d.clicks, 0)}</td>
                    <td class="ss-center">${fmtNum(d.visits, 0)}</td>
                    <td class="ss-center">${fmtPct(d.conversionRate)}</td>
                    <td class="ss-center">${fmtNum(d.buyers, 0)}</td>
                </tr>`;
            }).join('') || '<tr><td colspan="7" class="ss-center">Không có dữ liệu theo ngày từ sheet Đơn đã xác nhận.</td></tr>';
        }
    }

    function destroyChart(key) {
        if (SHOPEE_STATE.charts[key]) {
            try { SHOPEE_STATE.charts[key].destroy(); } catch (e) {}
            SHOPEE_STATE.charts[key] = null;
        }
    }

    function drawCharts(data) {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js chưa sẵn sàng.');
            return;
        }
        drawDailyChart(data);
        drawSourceChart(data);
        drawProductChart(data);
    }

    function drawDailyChart(data) {
        destroyChart('daily');
        var ctx = document.getElementById('ss-daily-chart');
        if (!ctx) return;
        var daily = data.orders.confirmed.daily || [];
        SHOPEE_STATE.charts.daily = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: daily.map(function (d) { return d.date; }),
                datasets: [
                    { label: 'Doanh thu xác nhận', data: daily.map(function (d) { return d.revenue; }), yAxisID: 'y' },
                    { label: 'Số đơn xác nhận', data: daily.map(function (d) { return d.orders; }), type: 'line', yAxisID: 'y1', borderWidth: 3, tension: .25 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: { y: { beginAtZero: true, position: 'left' }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } } }
            }
        });
    }

    function drawSourceChart(data) {
        destroyChart('source');
        var ctx = document.getElementById('ss-source-chart');
        if (!ctx) return;
        var s = data.traffic.confirmed.summary || {};
        var sourceData = [
            ['Thẻ sản phẩm', s.productCardRevenue || 0],
            ['Livestream', s.livestreamRevenue || 0],
            ['Video', s.videoRevenue || 0],
            ['Đối tác liên kết', s.affiliateRevenue || 0],
            ['Quảng cáo Shopee', s.shopeeAdsRevenue || 0]
        ].filter(function (x) { return x[1] > 0; });
        if (sourceData.length === 0) sourceData = [['Chưa có dữ liệu nguồn', 1]];
        SHOPEE_STATE.charts.source = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: sourceData.map(function (x) { return x[0]; }), datasets: [{ data: sourceData.map(function (x) { return x[1]; }) }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    function drawProductChart(data) {
        destroyChart('product');
        var ctx = document.getElementById('ss-product-chart');
        if (!ctx) return;
        var products = (data.products.confirmed || []).slice(0, 8).reverse();
        SHOPEE_STATE.charts.product = new Chart(ctx, {
            type: 'bar',
            data: { labels: products.map(function (p) { return p.productName.length > 34 ? p.productName.slice(0, 34) + '…' : p.productName; }), datasets: [{ label: 'Doanh thu', data: products.map(function (p) { return p.revenue; }) }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    }

    function handleUpload(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (typeof XLSX === 'undefined') {
            toast('Thiếu thư viện XLSX. Hãy kiểm tra script xlsx trong giao diện chính.', 'error');
            e.target.value = '';
            return;
        }
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
            } catch (err) {
                console.error(err);
                toast('Lỗi đọc file Shopee: ' + err.message, 'error');
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function saveToFirebase(parsed) {
        var db = getDb();
        if (!db) return;
        var batchId = Date.now().toString();
        var saveData = Object.assign({}, parsed, { batchId: batchId });
        var updates = {};
        updates['/shopee_shop_stats_logs/' + batchId] = saveData;
        updates['/shopee_shop_stats_latest/' + SHOPEE_STATE.company] = saveData;
        db.ref().update(updates).catch(function (e) { console.warn('Không thể lưu Firebase Shopee:', e); });
    }

    function loadHistory() {
        var db = getDb();
        if (!db) return;
        db.ref('shopee_shop_stats_logs').limitToLast(60).on('value', function (snapshot) {
            var raw = snapshot.val() || {};
            SHOPEE_STATE.history = Object.keys(raw).map(function (key) {
                var item = raw[key];
                item.batchId = item.batchId || key;
                return item;
            }).filter(function (x) { return !x.company || x.company === SHOPEE_STATE.company; })
              .sort(function (a, b) { return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0); });
            if (!SHOPEE_STATE.current && SHOPEE_STATE.history.length) SHOPEE_STATE.current = SHOPEE_STATE.history[0];
            renderHistoryList();
            renderDashboard();
        });
    }

    function renderHistoryList() {
        var box = document.getElementById('ss-history-list');
        if (!box) return;
        var list = SHOPEE_STATE.history || [];
        if (list.length === 0) {
            box.innerHTML = '<div class="ss-empty" style="padding:20px;">Chưa có lịch sử upload.</div>';
            return;
        }
        box.innerHTML = list.slice(0, 12).map(function (item) {
            var active = SHOPEE_STATE.current && SHOPEE_STATE.current.batchId === item.batchId;
            return `<div class="ss-history-item ${active ? 'active' : ''}" onclick="window.selectShopeeStatsBatch('${escapeHtml(item.batchId)}')">
                <div><b>${escapeHtml(item.fileName || 'Shopee stats')}</b><div class="ss-muted">${escapeHtml(item.period || '')} • ${escapeHtml(item.uploader || '')}</div></div>
                <div style="text-align:right;"><b>${fmtMoney(item.metrics ? item.metrics.confirmedRevenue : 0)}</b><div class="ss-muted">${item.uploadedAt ? new Date(item.uploadedAt).toLocaleString('vi-VN') : ''}</div></div>
            </div>`;
        }).join('');
    }

    window.selectShopeeStatsBatch = function (batchId) {
        var found = (SHOPEE_STATE.history || []).find(function (x) { return String(x.batchId) === String(batchId); });
        if (found) {
            SHOPEE_STATE.current = found;
            renderDashboard();
        }
    };

    window.changeShopeeStatsCompany = function (companyId) {
        SHOPEE_STATE.company = companyId || 'NNV';
        SHOPEE_STATE.current = null;
        loadLatestForCompany();
        loadHistory();
    };

    function loadLatestForCompany() {
        var db = getDb();
        if (!db) return;
        db.ref('shopee_shop_stats_latest/' + SHOPEE_STATE.company).once('value').then(function (snapshot) {
            var val = snapshot.val();
            if (val) {
                SHOPEE_STATE.current = val;
                renderDashboard();
            }
        }).catch(function () {});
    }

    window.clearShopeeStatsView = function () {
        SHOPEE_STATE.current = null;
        var spend = document.getElementById('ss-ads-spend');
        if (spend) spend.value = '';
        renderDashboard();
    };

    window.initShopeeShopStatsDashboard = function () {
        console.log('Shopee Shop Stats Dashboard Loaded', SHOPEE_STATS_VERSION);
        renderBase();
        loadLatestForCompany();
        loadHistory();
    };

    // Alias để gọi từ menu TMĐT cha.
    window.initEcomDashboard = window.initShopeeShopStatsDashboard;
})();

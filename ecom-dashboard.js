/**
 * ECOM DASHBOARD LOADER V1.2 - SAFE MODE
 * Chỉ điều phối giao diện tab TMĐT.
 * Không tự xóa/tải script để tránh ảnh hưởng module cũ như Thiết lập giá Shopee.
 *
 * HTML chính gọi sẵn:
 * - ecom-dashboard.js
 * - shopee-shop-stats-dashboardg.js
 * - tiktok-shop-dashboard.js
 */
(function () {
    'use strict';

    var ECOM_VERSION = 'ECOM_V1.2_SAFE_NO_SCRIPT_REMOVE';
    var STATE = { activeTab: 'shopee', retry: { shopee: 0, tiktok: 0 } };

    function qs(id) { return document.getElementById(id); }

    function getRoot() {
        return qs('ecom-dashboard-container') || qs('page-ecom-main');
    }

    function escapeHtml(v) {
        return String(v === null || v === undefined ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function loadingHtml(name) {
        return "<div class='ecom-loader-card'><div class='ecom-loader-dot'></div><div><b>Đang tải Dashboard " + escapeHtml(name) + "...</b><small>Đang khởi tạo module riêng của nền tảng.</small></div></div>";
    }

    function errorHtml(platform, message) {
        var tab = platform === 'TikTok Shop' ? 'tiktok' : 'shopee';
        return "<div class='ecom-error-card'><b>Chưa khởi tạo được Dashboard " + escapeHtml(platform) + "</b><small>" + escapeHtml(message || 'Vui lòng kiểm tra file JS tương ứng đã được gọi trong HTML chưa.') + "</small><button onclick=\"window.switchEcomTab('" + tab + "')\">Thử lại</button></div>";
    }

    function setBoxHtml(id, html) {
        var el = qs(id);
        if (el) el.innerHTML = html;
    }

    function renderShell() {
        var root = getRoot();
        if (!root) return;

        root.innerHTML = `
            <style>
                .ecom-shell {
                    background: #ffffff;
                    border: 1px solid #fed7aa;
                    border-radius: 24px;
                    padding: 14px;
                    box-shadow: 0 14px 34px rgba(15,23,42,.06);
                    font-family: 'Segoe UI', Arial, 'Helvetica Neue', Tahoma, sans-serif !important;
                }
                .ecom-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    flex-wrap: wrap;
                    padding: 6px 6px 14px;
                }
                .ecom-head-title {
                    color: #0f172a;
                    font-size: 16px;
                    font-weight: 900;
                    letter-spacing: -.02em;
                }
                .ecom-head-sub {
                    color: #64748b;
                    font-size: 12px;
                    font-weight: 500;
                    margin-top: 3px;
                }
                .ecom-tabs {
                    display: inline-flex;
                    gap: 6px;
                    padding: 6px;
                    background: #fff7ed;
                    border: 1px solid #ffedd5;
                    border-radius: 999px;
                }
                .ecom-tab-btn {
                    border: 0;
                    background: transparent;
                    color: #9a3412;
                    border-radius: 999px;
                    padding: 10px 18px;
                    min-width: 128px;
                    cursor: pointer;
                    font-family: 'Segoe UI', Arial, 'Helvetica Neue', Tahoma, sans-serif !important;
                    font-size: 13px;
                    font-weight: 700;
                    transition: .18s ease;
                    white-space: nowrap;
                }
                .ecom-tab-btn:hover {
                    background: #ffedd5;
                    color: #c2410c;
                    transform: translateY(-1px);
                }
                .ecom-tab-btn.active {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: #fff;
                    box-shadow: 0 10px 22px rgba(249,115,22,.24);
                }
                .ecom-panel { display: none; min-height: 260px; }
                .ecom-panel.active { display: block; }
                .ecom-loader-card,
                .ecom-error-card {
                    border: 1px dashed #fdba74;
                    background: #fff7ed;
                    border-radius: 18px;
                    padding: 22px;
                    color: #9a3412;
                    min-height: 96px;
                    font-family: 'Segoe UI', Arial, 'Helvetica Neue', Tahoma, sans-serif !important;
                }
                .ecom-loader-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .ecom-error-card {
                    display: block;
                    text-align: center;
                    border-color: #fecaca;
                    background: #fef2f2;
                }
                .ecom-loader-card b,
                .ecom-error-card b {
                    display: block;
                    color: #7c2d12;
                    font-size: 14px;
                    margin-bottom: 4px;
                }
                .ecom-loader-card small,
                .ecom-error-card small {
                    display: block;
                    color: #9a3412;
                    font-size: 12px;
                    line-height: 1.5;
                }
                .ecom-error-card b,
                .ecom-error-card small {
                    color: #991b1b;
                }
                .ecom-loader-dot {
                    width: 20px;
                    height: 20px;
                    border: 3px solid #fed7aa;
                    border-top-color: #f97316;
                    border-radius: 999px;
                    animation: ecomSpin .8s linear infinite;
                    flex: 0 0 auto;
                }
                .ecom-error-card button {
                    margin-top: 12px;
                    border: 0;
                    background: #dc2626;
                    color: #fff;
                    border-radius: 999px;
                    padding: 9px 16px;
                    cursor: pointer;
                    font-family: 'Segoe UI', Arial, 'Helvetica Neue', Tahoma, sans-serif !important;
                    font-weight: 700;
                }
                @keyframes ecomSpin { to { transform: rotate(360deg); } }
                @media(max-width:760px){
                    .ecom-head { align-items: stretch; }
                    .ecom-tabs { width: 100%; border-radius: 16px; }
                    .ecom-tab-btn { flex: 1; min-width: 0; }
                }
            </style>

            <div class='ecom-shell'>
                <div class='ecom-head'>
                    <div>
                        <div class='ecom-head-title'>🛒 Dashboard TMĐT</div>
                        <div class='ecom-head-sub'>Shopee và TikTok Shop dùng module JS riêng, tách biệt với phần thiết lập giá.</div>
                    </div>
                    <div class='ecom-tabs'>
                        <button type='button' class='ecom-tab-btn active' id='ecom-tab-btn-shopee' onclick='window.switchEcomTab("shopee")'>Shopee</button>
                        <button type='button' class='ecom-tab-btn' id='ecom-tab-btn-tiktok' onclick='window.switchEcomTab("tiktok")'>TikTok Shop</button>
                    </div>
                </div>

                <div class='ecom-panel active' id='ecom-panel-shopee'>
                    <div id='ecom-shopee-dashboard-container'>${loadingHtml('Shopee')}</div>
                </div>

                <div class='ecom-panel' id='ecom-panel-tiktok'>
                    <div id='ecom-tiktok-dashboard-container'>${loadingHtml('TikTok Shop')}</div>
                </div>
            </div>
        `;
    }

    function setActiveTab(tab) {
        STATE.activeTab = tab || 'shopee';
        ['shopee', 'tiktok'].forEach(function (name) {
            var btn = qs('ecom-tab-btn-' + name);
            var panel = qs('ecom-panel-' + name);
            if (btn) btn.classList.toggle('active', name === STATE.activeTab);
            if (panel) panel.classList.toggle('active', name === STATE.activeTab);
        });
    }

    function initShopee() {
        if (typeof window.initShopeeShopStatsDashboard === 'function') {
            window.initShopeeShopStatsDashboard();
            return;
        }

        setBoxHtml('ecom-shopee-dashboard-container', loadingHtml('Shopee'));
        if (STATE.retry.shopee < 10) {
            STATE.retry.shopee += 1;
            setTimeout(initShopee, 400);
            return;
        }

        setBoxHtml(
            'ecom-shopee-dashboard-container',
            errorHtml('Shopee', 'Không tìm thấy hàm initShopeeShopStatsDashboard(). Hãy kiểm tra script shopee-shop-stats-dashboardg.js.')
        );
    }

    function initTiktok() {
        if (typeof window.initTiktokShopDashboard === 'function') {
            window.initTiktokShopDashboard();
            return;
        }

        setBoxHtml('ecom-tiktok-dashboard-container', loadingHtml('TikTok Shop'));
        if (STATE.retry.tiktok < 10) {
            STATE.retry.tiktok += 1;
            setTimeout(initTiktok, 400);
            return;
        }

        setBoxHtml(
            'ecom-tiktok-dashboard-container',
            errorHtml('TikTok Shop', 'Không tìm thấy hàm initTiktokShopDashboard(). Hãy kiểm tra script tiktok-shop-dashboard.js.')
        );
    }

    window.initEcomDashboard = function (defaultTab) {
        STATE.retry = { shopee: 0, tiktok: 0 };
        renderShell();
        window.switchEcomTab(defaultTab || 'shopee');
    };

    window.switchEcomTab = function (tab) {
        tab = tab || 'shopee';
        setActiveTab(tab);
        if (tab === 'shopee') initShopee();
        if (tab === 'tiktok') initTiktok();
    };

    window.ECOM_DASHBOARD_VERSION = ECOM_VERSION;
})();

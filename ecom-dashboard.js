/**
 * ECOM DASHBOARD LOADER V1.0
 * Vai trò:
 * - Khi bấm menu TMĐT, hiển thị 2 tab: Shopee / TikTok Shop
 * - Mỗi nền tảng dùng JS riêng:
 *   + Shopee: shopee-shop-stats-dashboardg.js
 *   + TikTok Shop: tiktok-shop-dashboard.js
 * - File này chỉ điều phối tab và tải module, không xử lý số liệu nền tảng.
 */
(function () {
    'use strict';

    var ECOM_VERSION = 'ECOM_V1.0_TABS_LOADER';

    var CONFIG = window.ECOM_DASHBOARD_CONFIG || {};
    CONFIG.shopeeScript = CONFIG.shopeeScript || 'https://raw.githack.com/026nongnghiepviet-cmd/IVY-LEE/main/shopee-shop-stats-dashboardg.js?v=28';
    CONFIG.tiktokScript = CONFIG.tiktokScript || 'https://raw.githack.com/026nongnghiepviet-cmd/IVY-LEE/main/tiktok-shop-dashboard.js?v=1';

    var STATE = {
        activeTab: 'shopee',
        loaded: {},
        loading: {}
    };

    function qs(id) {
        return document.getElementById(id);
    }

    function getRoot() {
        return qs('ecom-dashboard-container') || qs('page-ecom-main');
    }

    function setBoxHtml(id, html) {
        var el = qs(id);
        if (el) el.innerHTML = html;
    }

    function escapeHtml(v) {
        return String(v === null || v === undefined ? '' : v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function loadingHtml(name) {
        return "<div class='ecom-loader-card'><div class='ecom-loader-dot'></div><div><b>Đang tải Dashboard " + escapeHtml(name) + "...</b><small>Hệ thống đang nạp module riêng của nền tảng.</small></div></div>";
    }

    function emptyHtml(title, desc) {
        return "<div class='ecom-empty-card'><b>" + escapeHtml(title) + "</b><small>" + escapeHtml(desc) + "</small></div>";
    }

    function errorHtml(platform, message) {
        return "<div class='ecom-error-card'><b>Không tải được module " + escapeHtml(platform) + "</b><small>" + escapeHtml(message || 'Vui lòng kiểm tra file JS hoặc đường truyền.') + "</small><button onclick=\"window.reloadEcomPlatform('" + platform.toLowerCase() + "')\">Tải lại</button></div>";
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
                .ecom-panel {
                    display: none;
                    min-height: 260px;
                }
                .ecom-panel.active {
                    display: block;
                }
                .ecom-loader-card,
                .ecom-empty-card,
                .ecom-error-card {
                    border: 1px dashed #fdba74;
                    background: #fff7ed;
                    border-radius: 18px;
                    padding: 22px;
                    color: #9a3412;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    min-height: 96px;
                }
                .ecom-empty-card,
                .ecom-error-card {
                    display: block;
                    text-align: center;
                }
                .ecom-loader-card b,
                .ecom-empty-card b,
                .ecom-error-card b {
                    display: block;
                    color: #7c2d12;
                    font-size: 14px;
                    margin-bottom: 4px;
                }
                .ecom-loader-card small,
                .ecom-empty-card small,
                .ecom-error-card small {
                    display: block;
                    color: #9a3412;
                    font-size: 12px;
                    line-height: 1.5;
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
                .ecom-error-card {
                    border-color: #fecaca;
                    background: #fef2f2;
                    color: #991b1b;
                }
                .ecom-error-card b,
                .ecom-error-card small {
                    color: #991b1b;
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
                        <div class='ecom-head-sub'>Mỗi nền tảng chạy bằng một module JS riêng để dễ bảo trì.</div>
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
                    <div id='ecom-tiktok-dashboard-container'>${emptyHtml('TikTok Shop', 'Đang chờ module Dashboard TikTok Shop.')}</div>
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

    function loadScriptOnce(id, src) {
        if (STATE.loaded[id]) return Promise.resolve();
        if (STATE.loading[id]) return STATE.loading[id];

        var existing = qs(id);
        if (existing && existing.getAttribute('data-loaded') === '1') {
            STATE.loaded[id] = true;
            return Promise.resolve();
        }

        STATE.loading[id] = new Promise(function (resolve, reject) {
            if (existing) existing.remove();

            var s = document.createElement('script');
            s.id = id;
            s.src = src;
            s.async = true;

            var done = false;
            var timer = setTimeout(function () {
                if (done) return;
                done = true;
                reject(new Error('Module tải quá lâu hoặc bị cache/CDN chặn.'));
            }, 12000);

            s.onload = function () {
                if (done) return;
                done = true;
                clearTimeout(timer);
                s.setAttribute('data-loaded', '1');
                STATE.loaded[id] = true;
                resolve();
            };

            s.onerror = function () {
                if (done) return;
                done = true;
                clearTimeout(timer);
                reject(new Error('Không tải được file: ' + src));
            };

            document.body.appendChild(s);
        }).finally(function () {
            STATE.loading[id] = null;
        });

        return STATE.loading[id];
    }

    function initShopee() {
        setBoxHtml('ecom-shopee-dashboard-container', loadingHtml('Shopee'));

        var readyNow = typeof window.initShopeeShopStatsDashboard === 'function';
        var p = readyNow ? Promise.resolve() : loadScriptOnce('ecom-shopee-dashboard-script', CONFIG.shopeeScript);

        p.then(function () {
            if (typeof window.initShopeeShopStatsDashboard === 'function') {
                window.initShopeeShopStatsDashboard();
            } else {
                setBoxHtml('ecom-shopee-dashboard-container', errorHtml('Shopee', 'Không tìm thấy hàm initShopeeShopStatsDashboard(). Hãy cập nhật đúng file Shopee JS.'));
            }
        }).catch(function (err) {
            setBoxHtml('ecom-shopee-dashboard-container', errorHtml('Shopee', err && err.message));
        });
    }

    function initTiktok() {
        setBoxHtml('ecom-tiktok-dashboard-container', loadingHtml('TikTok Shop'));

        var readyNow = typeof window.initTiktokShopDashboard === 'function';
        var p = readyNow ? Promise.resolve() : loadScriptOnce('ecom-tiktok-dashboard-script', CONFIG.tiktokScript);

        p.then(function () {
            if (typeof window.initTiktokShopDashboard === 'function') {
                window.initTiktokShopDashboard();
            } else {
                setBoxHtml('ecom-tiktok-dashboard-container', emptyHtml('TikTok Shop', 'Module TikTok Shop chưa khai báo hàm initTiktokShopDashboard().'));
            }
        }).catch(function () {
            setBoxHtml('ecom-tiktok-dashboard-container', emptyHtml('TikTok Shop', 'Đang chờ file cấu trúc TikTok Shop để hoàn thiện dashboard.'));
        });
    }

    window.initEcomDashboard = function (defaultTab) {
        renderShell();
        window.switchEcomTab(defaultTab || 'shopee');
    };

    window.switchEcomTab = function (tab) {
        tab = tab || 'shopee';
        setActiveTab(tab);

        if (tab === 'shopee') {
            initShopee();
            return;
        }

        if (tab === 'tiktok') {
            initTiktok();
        }
    };

    window.reloadEcomPlatform = function (platform) {
        platform = platform || STATE.activeTab || 'shopee';
        if (platform === 'shopee') {
            STATE.loaded['ecom-shopee-dashboard-script'] = false;
            var oldShopee = qs('ecom-shopee-dashboard-script');
            if (oldShopee) oldShopee.remove();
            initShopee();
            return;
        }
        if (platform === 'tiktok') {
            STATE.loaded['ecom-tiktok-dashboard-script'] = false;
            var oldTikTok = qs('ecom-tiktok-dashboard-script');
            if (oldTikTok) oldTikTok.remove();
            initTiktok();
        }
    };

    window.ECOM_DASHBOARD_VERSION = ECOM_VERSION;
})();

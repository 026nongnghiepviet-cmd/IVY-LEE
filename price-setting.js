/* PRICE_SETTING_SHELL_TABS_ONLY_V9_20260524
 * NNV Marketing System - TMĐT > Thiết lập giá
 * FILE NÀY CHỈ LÀ FILE ĐIỀU PHỐI TAB.
 * Không chứa công thức Shopee/TikTok/Lazada.
 * Shopee: price-setting-shopee.js
 * TikTok Shop: price-setting-tiktok.js
 * Lazada: price-setting-lazada.js
 */
(function () {
  'use strict';

  var VERSION_MARKER = 'PRICE_SETTING_SHELL_TABS_ONLY_V9_20260524';
  var ROOT_ID = 'price-setting-container';
  var ACTIVE_KEY = 'NNV_PRICE_SETTING_ACTIVE_TAB_V9';
  var TABS = ['shopee', 'tiktok', 'lazada'];

  var state = {
    activeTab: localStorage.getItem(ACTIVE_KEY) || 'shopee',
    booted: false,
    retryCount: { shopee: 0, tiktok: 0, lazada: 0 }
  };

  if (window.__NNV_PRICE_SETTING_SHELL_VERSION__ === VERSION_MARKER) return;
  window.__NNV_PRICE_SETTING_SHELL_VERSION__ = VERSION_MARKER;

  function byId(id) { return document.getElementById(id); }
  function root() { return byId(ROOT_ID); }

  function platformLogo(name) {
    if (name === 'shopee') {
      return '' +
        '<span class="nnv-platform-logo shopee-logo" aria-hidden="true">' +
          '<svg viewBox="0 0 48 48" role="img" focusable="false">' +
            '<path d="M12 15h24l-2 25H14L12 15Z" fill="#ee4d2d"/>' +
            '<path d="M18 15c.4-6 3.7-9 6-9s5.6 3 6 9" fill="none" stroke="#ee4d2d" stroke-width="3" stroke-linecap="round"/>' +
            '<text x="24" y="33" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" font-weight="700" fill="#fff">S</text>' +
          '</svg>' +
        '</span>';
    }
    if (name === 'tiktok') {
      return '' +
        '<span class="nnv-platform-logo tiktok-logo" aria-hidden="true">' +
          '<svg viewBox="0 0 48 48" role="img" focusable="false">' +
            '<rect x="4" y="4" width="40" height="40" rx="12" fill="#111827"/>' +
            '<path d="M28 11c1.4 5.2 4.4 8.1 9 8.6v6.1c-3.4-.2-6.3-1.3-8.8-3.3v10.2c0 6-4.2 9.9-10 9.9-5.1 0-9.2-3.4-9.2-8.4 0-5.4 4.7-8.8 10.4-8.1v6.2c-2.4-.7-4.3.5-4.3 2.3 0 1.6 1.4 2.7 3.2 2.7 2.2 0 3.6-1.4 3.6-4.1V11h6.1Z" fill="#fff"/>' +
            '<path d="M30 12c1 3.3 3.1 5.4 6.5 6" fill="none" stroke="#25F4EE" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M20.5 27.2c-4.9-.8-8.8 2.1-8.8 6.6" fill="none" stroke="#FE2C55" stroke-width="3" stroke-linecap="round"/>' +
          '</svg>' +
        '</span>';
    }
    return '' +
      '<span class="nnv-platform-logo lazada-logo" aria-hidden="true">' +
        '<svg viewBox="0 0 48 48" role="img" focusable="false">' +
          '<defs><linearGradient id="lz-g-v9" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a00"/><stop offset=".55" stop-color="#7b2cff"/><stop offset="1" stop-color="#1a73e8"/></linearGradient></defs>' +
          '<path d="M24 7 8 16v17l16 9 16-9V16L24 7Z" fill="url(#lz-g-v9)"/>' +
          '<path d="M17 18h14v5h-8v7h8v5H17V18Z" fill="#fff" opacity=".96"/>' +
        '</svg>' +
      '</span>';
  }

  function injectStyle() {
    if (byId('nnv-price-shell-style-v9')) return;
    var css = document.createElement('style');
    css.id = 'nnv-price-shell-style-v9';
    css.textContent = [
      '.nnv-price-shell{font-family:"Segoe UI","Noto Sans",Tahoma,Arial,sans-serif;color:#202124;--ps-blue:#1a73e8;--ps-orange:#ee4d2d;--ps-dark:#111827;--ps-purple:#6d28d9;--ps-border:#e8eaed;--ps-muted:#5f6368;}',
      '.nnv-price-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 14px 0;padding:8px;background:#f6f8fb;border:1px solid var(--ps-border);border-radius:18px;box-shadow:0 4px 16px rgba(60,64,67,.05);}',
      '.nnv-price-tab{appearance:none;border:1px solid transparent;background:transparent;color:var(--ps-muted);border-radius:14px;padding:11px 12px;min-height:62px;font-family:"Segoe UI","Noto Sans",Tahoma,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1.35;cursor:pointer;transition:.18s ease;display:flex;align-items:center;gap:10px;text-align:left;min-width:0;}',
      '.nnv-price-tab:hover{background:#fff;color:var(--ps-blue);border-color:#eef2ff;box-shadow:0 3px 12px rgba(60,64,67,.07);}',
      '.nnv-price-tab.active{background:#fff;box-shadow:0 6px 18px rgba(60,64,67,.10);}',
      '.nnv-price-tab.shopee.active{color:var(--ps-orange);border-color:#ffd8cd;}',
      '.nnv-price-tab.tiktok.active{color:var(--ps-dark);border-color:#d7dbe5;}',
      '.nnv-price-tab.lazada.active{color:var(--ps-purple);border-color:#ddd6fe;}',
      '.nnv-platform-logo{width:38px;height:38px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex:0 0 38px;background:#fff;border:1px solid var(--ps-border);box-shadow:0 2px 8px rgba(60,64,67,.06);overflow:hidden;}',
      '.nnv-platform-logo svg{width:30px;height:30px;display:block;}',
      '.nnv-price-tab.shopee.active .nnv-platform-logo{background:#fff4f0;border-color:#ffd8cd;}',
      '.nnv-price-tab.tiktok.active .nnv-platform-logo{background:#f3f4f6;border-color:#d7dbe5;}',
      '.nnv-price-tab.lazada.active .nnv-platform-logo{background:#faf5ff;border-color:#ddd6fe;}',
      '.nnv-tab-text{display:flex;flex-direction:column;gap:2px;min-width:0;}',
      '.nnv-tab-text b{font-size:14px;font-weight:700;letter-spacing:0;color:inherit;white-space:normal;}',
      '.nnv-tab-text small{font-size:11.5px;font-weight:500;color:#6b7280;white-space:normal;line-height:1.35;}',
      '.nnv-price-panel{display:none;}',
      '.nnv-price-panel.active{display:block;animation:nnvPriceFade .16s ease;}',
      '@keyframes nnvPriceFade{from{opacity:.45;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}',
      '.nnv-price-wait{padding:22px;border:1px dashed #d2e3fc;background:#f8fbff;border-radius:16px;text-align:left;color:#5f6368;font-weight:600;font-size:13px;line-height:1.55;}',
      '.nnv-price-wait b{color:#1a73e8;}',
      '@media(max-width:900px){.nnv-price-tabs{grid-template-columns:1fr;gap:8px;border-radius:16px;padding:7px;margin-bottom:12px}.nnv-price-tab{min-height:56px;padding:10px 12px}.nnv-platform-logo{width:36px;height:36px;flex-basis:36px;border-radius:12px}.nnv-platform-logo svg{width:28px;height:28px}.nnv-tab-text b{font-size:13.5px}.nnv-tab-text small{font-size:11px}}',
      '@media(max-width:420px){.nnv-price-tab{gap:8px}.nnv-tab-text small{display:none}.nnv-price-tabs{padding:6px}.nnv-price-tab{min-height:50px}}'
    ].join('');
    document.head.appendChild(css);
  }

  function hideParentTitle() {
    var r = root();
    if (!r || !r.closest) return;
    var box = r.closest('.section-box');
    if (!box) return;
    var title = box.querySelector('.section-title');
    if (title) {
      title.style.display = 'none';
      title.setAttribute('data-price-title-hidden', '1');
    }
  }

  function tabButton(name, title, desc) {
    return '' +
      '<button type="button" class="nnv-price-tab ' + name + '" id="nnv-tab-' + name + '" data-tab="' + name + '" role="tab" aria-controls="nnv-panel-' + name + '">' +
        platformLogo(name) +
        '<span class="nnv-tab-text"><b>' + title + '</b><small>' + desc + '</small></span>' +
      '</button>';
  }

  function renderShell() {
    var r = root();
    if (!r) return false;
    injectStyle();
    hideParentTitle();

    r.innerHTML = '' +
      '<div class="nnv-price-shell" data-version="' + VERSION_MARKER + '">' +
        '<div class="nnv-price-tabs" role="tablist" aria-label="Thiết lập giá theo sàn">' +
          tabButton('shopee', 'Thiết lập giá Shopee', 'Tạo giá, chiết khấu và kiểm tra tiền về') +
          tabButton('tiktok', 'Thiết lập giá TikTok Shop', 'Module riêng, không ảnh hưởng Shopee') +
          tabButton('lazada', 'Thiết lập giá Lazada', 'Module riêng, sẵn sàng phát triển') +
        '</div>' +
        '<div class="nnv-price-panel" id="nnv-panel-shopee" role="tabpanel"><div id="price-setting-shopee-container" class="nnv-price-wait">Đang tải module <b>Shopee</b>...</div></div>' +
        '<div class="nnv-price-panel" id="nnv-panel-tiktok" role="tabpanel"><div id="price-setting-tiktok-container" class="nnv-price-wait">Đang tải module <b>TikTok Shop</b>...</div></div>' +
        '<div class="nnv-price-panel" id="nnv-panel-lazada" role="tabpanel"><div id="price-setting-lazada-container" class="nnv-price-wait">Đang tải module <b>Lazada</b>...</div></div>' +
      '</div>';

    bindTabs();
    state.booted = true;
    activateTab(state.activeTab, true);
    return true;
  }

  function bindTabs() {
    document.querySelectorAll('.nnv-price-tab[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { activateTab(btn.getAttribute('data-tab')); });
    });
  }

  function normalizeTab(tab) {
    return TABS.indexOf(tab) >= 0 ? tab : 'shopee';
  }

  function activateTab(tab, isFirstRender) {
    tab = normalizeTab(tab);
    state.activeTab = tab;
    localStorage.setItem(ACTIVE_KEY, tab);

    TABS.forEach(function (name) {
      var btn = byId('nnv-tab-' + name);
      var panel = byId('nnv-panel-' + name);
      if (btn) {
        btn.classList.toggle('active', name === tab);
        btn.setAttribute('aria-selected', name === tab ? 'true' : 'false');
      }
      if (panel) panel.classList.toggle('active', name === tab);
    });

    loadActiveModule(tab, isFirstRender);
  }

  function loadActiveModule(tab, isFirstRender) {
    var map = {
      shopee: { fn: 'initPriceSettingShopeeModule', container: 'price-setting-shopee-container', label: 'Shopee', file: 'price-setting-shopee.js' },
      tiktok: { fn: 'initPriceSettingTiktokModule', container: 'price-setting-tiktok-container', label: 'TikTok Shop', file: 'price-setting-tiktok.js' },
      lazada: { fn: 'initPriceSettingLazadaModule', container: 'price-setting-lazada-container', label: 'Lazada', file: 'price-setting-lazada.js' }
    };
    var item = map[tab];
    if (!item) return;

    if (typeof window[item.fn] === 'function') {
      window[item.fn](item.container);
      return;
    }
    showWaiting(item.container, item.label, item.file);
    retryModule(tab);
  }

  function showWaiting(containerId, label, fileName) {
    var box = byId(containerId);
    if (!box) return;
    box.className = 'nnv-price-wait';
    box.innerHTML = 'Chưa load được module <b>' + label + '</b>.<br/>Kiểm tra đã gắn file <b>' + fileName + '</b> trước <b>price-setting.js</b> chưa.';
  }

  function retryModule(tab) {
    state.retryCount[tab] = state.retryCount[tab] || 0;
    if (state.retryCount[tab] >= 10) return;
    state.retryCount[tab] += 1;
    setTimeout(function () { if (state.activeTab === tab) loadActiveModule(tab, false); }, 500);
  }

  function boot() {
    var r = root();
    if (!r) return false;
    return renderShell();
  }

  window.initPriceSettingModule = function () { return boot(); };
  window.NNV_BOOT_PRICE_SETTING_MODULE = function () { return boot(); };
  window.NNV_PRICE_SETTING_TABS = {
    version: VERSION_MARKER,
    boot: boot,
    openShopee: function () { activateTab('shopee'); },
    openTiktok: function () { activateTab('tiktok'); },
    openLazada: function () { activateTab('lazada'); },
    reload: function () { state.booted = false; return boot(); }
  };

  function autoBootIfNeeded() {
    var r = root();
    if (!r) return;
    var page = byId('page-price-setting');
    var isActive = page && page.classList && page.classList.contains('active');
    var stillLoading = r.textContent && r.textContent.indexOf('Đang tải công cụ thiết lập giá') >= 0;
    var noShell = !r.querySelector('.nnv-price-shell');
    if (isActive && (stillLoading || noShell)) boot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBootIfNeeded);
  } else {
    setTimeout(autoBootIfNeeded, 0);
  }

  window.addEventListener('hashchange', function () { setTimeout(autoBootIfNeeded, 80); });

  var guard = setInterval(function () {
    autoBootIfNeeded();
    if (root() && root().querySelector('.nnv-price-shell')) clearInterval(guard);
  }, 700);
})();

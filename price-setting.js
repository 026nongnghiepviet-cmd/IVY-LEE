/* PRICE_SETTING_SHELL_TABS_ONLY_V7_20260524
 * NNV Marketing System - TMĐT > Thiết lập giá
 * FILE NÀY CHỈ LÀ FILE ĐIỀU PHỐI TAB.
 * Không chứa công thức Shopee. Không chứa công thức TikTok Shop.
 * Shopee nằm trong: price-setting-shopee.js
 * TikTok Shop nằm trong: price-setting-tiktok.js
 */
(function () {
  'use strict';

  var VERSION_MARKER = 'PRICE_SETTING_SHELL_TABS_ONLY_V7_20260524';
  var ROOT_ID = 'price-setting-container';
  var ACTIVE_KEY = 'NNV_PRICE_SETTING_ACTIVE_TAB_V7';
  var state = {
    activeTab: localStorage.getItem(ACTIVE_KEY) || 'shopee',
    booted: false,
    retryCount: { shopee: 0, tiktok: 0 }
  };

  if (window.__NNV_PRICE_SETTING_SHELL_VERSION__ === VERSION_MARKER) {
    return;
  }
  window.__NNV_PRICE_SETTING_SHELL_VERSION__ = VERSION_MARKER;

  function byId(id) {
    return document.getElementById(id);
  }

  function root() {
    return byId(ROOT_ID);
  }

  function injectStyle() {
    if (byId('nnv-price-shell-style-v7')) return;
    var css = document.createElement('style');
    css.id = 'nnv-price-shell-style-v7';
    css.textContent = [
      '.nnv-price-shell{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#202124;}',
      '.nnv-price-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px;padding:16px 18px;border:1px solid #e8eaed;border-radius:18px;background:linear-gradient(135deg,#fff,#f8fbff);box-shadow:0 4px 18px rgba(0,0,0,.04);}',
      '.nnv-price-title{font-size:18px;font-weight:900;color:#202124;line-height:1.25;}',
      '.nnv-price-sub{font-size:12px;color:#5f6368;margin-top:4px;font-weight:600;}',
      '.nnv-price-version{font-size:11px;color:#1a73e8;background:#e8f0fe;border:1px solid #d2e3fc;border-radius:999px;padding:6px 10px;font-weight:800;white-space:nowrap;}',
      '.nnv-price-tabs{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px 0;padding:8px;background:#f8f9fa;border:1px solid #e8eaed;border-radius:16px;}',
      '.nnv-price-tab{appearance:none;border:none;background:transparent;color:#5f6368;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:800;cursor:pointer;transition:.18s;display:flex;align-items:center;gap:8px;}',
      '.nnv-price-tab:hover{background:#fff;color:#1a73e8;box-shadow:0 2px 10px rgba(0,0,0,.05);}',
      '.nnv-price-tab.active{background:#fff;color:#1a73e8;box-shadow:0 4px 16px rgba(26,115,232,.14);}',
      '.nnv-price-tab.shopee.active{color:#ee4d2d;}',
      '.nnv-price-tab.tiktok.active{color:#111827;}',
      '.nnv-price-panel{display:none;}',
      '.nnv-price-panel.active{display:block;}',
      '.nnv-price-wait{padding:26px;border:1px dashed #d2e3fc;background:#f8fbff;border-radius:16px;text-align:center;color:#5f6368;font-weight:700;}',
      '.nnv-price-wait b{color:#1a73e8;}',
      '@media(max-width:768px){.nnv-price-top{display:block}.nnv-price-version{display:inline-block;margin-top:10px}.nnv-price-tabs{display:grid;grid-template-columns:1fr}.nnv-price-tab{justify-content:center}}'
    ].join('');
    document.head.appendChild(css);
  }

  function updateParentTitle() {
    var r = root();
    if (!r || !r.closest) return;
    var box = r.closest('.section-box');
    if (!box) return;
    var title = box.querySelector('.section-title');
    if (title && !title.getAttribute('data-price-title-updated')) {
      title.innerHTML = '💵 THIẾT LẬP GIÁ THEO SÀN TMĐT';
      title.setAttribute('data-price-title-updated', '1');
    }
  }

  function renderShell() {
    var r = root();
    if (!r) return false;
    injectStyle();
    updateParentTitle();

    r.innerHTML = '' +
      '<div class="nnv-price-shell" data-version="' + VERSION_MARKER + '">' +
        '<div class="nnv-price-top">' +
          '<div>' +
            '<div class="nnv-price-title">Thiết lập giá TMĐT</div>' +
            '<div class="nnv-price-sub">Tách riêng từng sàn để sau này TikTok Shop không ảnh hưởng Shopee.</div>' +
          '</div>' +
          '<div class="nnv-price-version">Shell V7 · Tabs Only</div>' +
        '</div>' +

        '<div class="nnv-price-tabs" role="tablist">' +
          '<button type="button" class="nnv-price-tab shopee" id="nnv-tab-shopee" data-tab="shopee">🛒 Thiết lập giá Shopee</button>' +
          '<button type="button" class="nnv-price-tab tiktok" id="nnv-tab-tiktok" data-tab="tiktok">🎵 Thiết lập giá TikTok Shop</button>' +
        '</div>' +

        '<div class="nnv-price-panel" id="nnv-panel-shopee">' +
          '<div id="price-setting-shopee-container" class="nnv-price-wait">Đang tải module <b>Shopee</b>...</div>' +
        '</div>' +

        '<div class="nnv-price-panel" id="nnv-panel-tiktok">' +
          '<div id="price-setting-tiktok-container" class="nnv-price-wait">Đang tải module <b>TikTok Shop</b>...</div>' +
        '</div>' +
      '</div>';

    bindTabs();
    state.booted = true;
    activateTab(state.activeTab, true);
    return true;
  }

  function bindTabs() {
    var tabs = document.querySelectorAll('.nnv-price-tab[data-tab]');
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activateTab(btn.getAttribute('data-tab'));
      });
    });
  }

  function activateTab(tab, isFirstRender) {
    if (tab !== 'shopee' && tab !== 'tiktok') tab = 'shopee';
    state.activeTab = tab;
    localStorage.setItem(ACTIVE_KEY, tab);

    ['shopee', 'tiktok'].forEach(function (name) {
      var btn = byId('nnv-tab-' + name);
      var panel = byId('nnv-panel-' + name);
      if (btn) btn.classList.toggle('active', name === tab);
      if (panel) panel.classList.toggle('active', name === tab);
    });

    loadActiveModule(tab, isFirstRender);
  }

  function loadActiveModule(tab, isFirstRender) {
    if (tab === 'shopee') {
      if (typeof window.initPriceSettingShopeeModule === 'function') {
        window.initPriceSettingShopeeModule('price-setting-shopee-container');
        return;
      }
      showWaiting('price-setting-shopee-container', 'Shopee', 'price-setting-shopee.js');
      retryModule('shopee');
      return;
    }

    if (tab === 'tiktok') {
      if (typeof window.initPriceSettingTiktokModule === 'function') {
        window.initPriceSettingTiktokModule('price-setting-tiktok-container');
        return;
      }
      showWaiting('price-setting-tiktok-container', 'TikTok Shop', 'price-setting-tiktok.js');
      retryModule('tiktok');
    }
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
    setTimeout(function () {
      if (state.activeTab === tab) loadActiveModule(tab, false);
    }, 500);
  }

  function boot() {
    var r = root();
    if (!r) return false;
    return renderShell();
  }

  window.initPriceSettingModule = function () {
    return boot();
  };

  window.NNV_BOOT_PRICE_SETTING_MODULE = function () {
    return boot();
  };

  window.NNV_PRICE_SETTING_TABS = {
    version: VERSION_MARKER,
    boot: boot,
    openShopee: function () { activateTab('shopee'); },
    openTiktok: function () { activateTab('tiktok'); },
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

  window.addEventListener('hashchange', function () {
    setTimeout(autoBootIfNeeded, 80);
  });

  // Fallback nhẹ: tránh tình trạng Blogger mở page nhưng không gọi initPriceSettingModule.
  var guard = setInterval(function () {
    autoBootIfNeeded();
    if (root() && root().querySelector('.nnv-price-shell')) clearInterval(guard);
  }, 700);
})();

/* PRICE_SETTING_SHELL_TABS_ONLY_V8_20260524
 * NNV Marketing System - TMĐT > Thiết lập giá
 * FILE NÀY CHỈ LÀ FILE ĐIỀU PHỐI TAB.
 * Không chứa công thức Shopee. Không chứa công thức TikTok Shop.
 * Shopee nằm trong: price-setting-shopee.js
 * TikTok Shop nằm trong: price-setting-tiktok.js
 */
(function () {
  'use strict';

  var VERSION_MARKER = 'PRICE_SETTING_SHELL_TABS_ONLY_V8_20260524';
  var ROOT_ID = 'price-setting-container';
  var ACTIVE_KEY = 'NNV_PRICE_SETTING_ACTIVE_TAB_V8';
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
    if (byId('nnv-price-shell-style-v8')) return;
    var css = document.createElement('style');
    css.id = 'nnv-price-shell-style-v8';
    css.textContent = [
      '.nnv-price-shell{font-family:"Segoe UI","Noto Sans",Tahoma,Arial,sans-serif;color:#202124;--ps-blue:#1a73e8;--ps-orange:#ee4d2d;--ps-dark:#111827;--ps-border:#e8eaed;--ps-muted:#5f6368;}',
      '.nnv-price-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 14px 0;padding:8px;background:#f6f8fb;border:1px solid var(--ps-border);border-radius:18px;box-shadow:0 4px 16px rgba(60,64,67,.05);}',
      '.nnv-price-tab{appearance:none;border:1px solid transparent;background:transparent;color:var(--ps-muted);border-radius:14px;padding:12px 14px;min-height:58px;font-family:"Segoe UI","Noto Sans",Tahoma,Arial,sans-serif;font-size:14px;font-weight:650;line-height:1.35;cursor:pointer;transition:.18s ease;display:flex;align-items:center;gap:10px;text-align:left;min-width:0;}',
      '.nnv-price-tab:hover{background:#fff;color:var(--ps-blue);border-color:#eef2ff;box-shadow:0 3px 12px rgba(60,64,67,.07);}',
      '.nnv-price-tab.active{background:#fff;box-shadow:0 6px 18px rgba(60,64,67,.10);}',
      '.nnv-price-tab.shopee.active{color:var(--ps-orange);border-color:#ffd8cd;}',
      '.nnv-price-tab.tiktok.active{color:var(--ps-dark);border-color:#d7dbe5;}',
      '.nnv-tab-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:0 0 36px;background:#fff;border:1px solid var(--ps-border);font-size:19px;box-shadow:0 2px 8px rgba(60,64,67,.06);}',
      '.nnv-price-tab.shopee.active .nnv-tab-icon{background:#fff4f0;border-color:#ffd8cd;}',
      '.nnv-price-tab.tiktok.active .nnv-tab-icon{background:#f3f4f6;border-color:#d7dbe5;}',
      '.nnv-tab-text{display:flex;flex-direction:column;gap:2px;min-width:0;}',
      '.nnv-tab-text b{font-size:14px;font-weight:700;letter-spacing:0;color:inherit;white-space:normal;}',
      '.nnv-tab-text small{font-size:11.5px;font-weight:500;color:#6b7280;white-space:normal;}',
      '.nnv-price-panel{display:none;}',
      '.nnv-price-panel.active{display:block;animation:nnvPriceFade .16s ease;}',
      '@keyframes nnvPriceFade{from{opacity:.45;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}',
      '.nnv-price-wait{padding:22px;border:1px dashed #d2e3fc;background:#f8fbff;border-radius:16px;text-align:center;color:#5f6368;font-weight:600;font-size:13px;line-height:1.55;}',
      '.nnv-price-wait b{color:#1a73e8;}',
      '@media(max-width:768px){.nnv-price-tabs{grid-template-columns:1fr;gap:8px;border-radius:16px;padding:7px;margin-bottom:12px}.nnv-price-tab{min-height:54px;padding:10px 12px}.nnv-tab-icon{width:34px;height:34px;flex-basis:34px}.nnv-tab-text b{font-size:13.5px}.nnv-tab-text small{font-size:11px}}',
      '@media(max-width:420px){.nnv-price-tab{gap:8px}.nnv-tab-text small{display:none}}'
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

  function renderShell() {
    var r = root();
    if (!r) return false;
    injectStyle();
    hideParentTitle();

    r.innerHTML = '' +
      '<div class="nnv-price-shell" data-version="' + VERSION_MARKER + '">' +
        '<div class="nnv-price-tabs" role="tablist" aria-label="Thiết lập giá theo sàn">' +
          '<button type="button" class="nnv-price-tab shopee" id="nnv-tab-shopee" data-tab="shopee" role="tab" aria-controls="nnv-panel-shopee">' +
            '<span class="nnv-tab-icon">🛒</span>' +
            '<span class="nnv-tab-text"><b>Thiết lập giá Shopee</b><small>Tạo file giá, chiết khấu và kiểm tra tiền về</small></span>' +
          '</button>' +
          '<button type="button" class="nnv-price-tab tiktok" id="nnv-tab-tiktok" data-tab="tiktok" role="tab" aria-controls="nnv-panel-tiktok">' +
            '<span class="nnv-tab-icon">🎵</span>' +
            '<span class="nnv-tab-text"><b>Thiết lập giá TikTok Shop</b><small>Module riêng, không ảnh hưởng Shopee</small></span>' +
          '</button>' +
        '</div>' +

        '<div class="nnv-price-panel" id="nnv-panel-shopee" role="tabpanel">' +
          '<div id="price-setting-shopee-container" class="nnv-price-wait">Đang tải module <b>Shopee</b>...</div>' +
        '</div>' +

        '<div class="nnv-price-panel" id="nnv-panel-tiktok" role="tabpanel">' +
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
      if (btn) {
        btn.classList.toggle('active', name === tab);
        btn.setAttribute('aria-selected', name === tab ? 'true' : 'false');
      }
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

  var guard = setInterval(function () {
    autoBootIfNeeded();
    if (root() && root().querySelector('.nnv-price-shell')) clearInterval(guard);
  }, 700);
})();

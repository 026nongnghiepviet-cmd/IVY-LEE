/* PRICE_SETTING_TIKTOK_MODULE_ONLY_V5_20260524
 * NNV Marketing System - TMĐT > Thiết lập giá > TikTok Shop
 * FILE RIÊNG CHO TIKTOK SHOP.
 * Không dùng chung công thức với Shopee/Lazada.
 */
(function () {
  'use strict';

  var VERSION_MARKER = 'PRICE_SETTING_TIKTOK_MODULE_ONLY_V5_20260524';

  if (window.__NNV_PRICE_SETTING_TIKTOK_VERSION__ === VERSION_MARKER) return;
  window.__NNV_PRICE_SETTING_TIKTOK_VERSION__ = VERSION_MARKER;

  function byId(id) { return document.getElementById(id); }

  function injectStyle() {
    if (byId('nnv-price-tiktok-style-v3')) return;
    var style = document.createElement('style');
    style.id = 'nnv-price-tiktok-style-v3';
    style.textContent = [
      '.ptk-wrap{font-family:"Segoe UI","Noto Sans",Tahoma,Arial,sans-serif;color:#202124;}',
      '.ptk-card{border:1px solid #e8eaed;border-radius:16px;background:#fff;padding:18px;box-shadow:0 4px 16px rgba(60,64,67,.05);}',
      '.ptk-label{display:inline-flex;align-items:center;background:#f3f4f6;color:#111827;border:1px solid #e5e7eb;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;margin-bottom:12px;}',
      '.ptk-title{font-size:17px;font-weight:700;margin:0 0 8px 0;letter-spacing:0;text-align:left;}',
      '.ptk-text{font-size:13px;color:#5f6368;line-height:1.55;max-width:820px;text-align:left;}',
      '.ptk-list{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;}',
      '.ptk-item{background:#f8f9fa;border:1px solid #e8eaed;border-radius:13px;padding:11px;font-size:13px;font-weight:600;color:#3c4043;}',
      '@media(max-width:768px){.ptk-card{padding:14px;border-radius:15px}.ptk-list{grid-template-columns:1fr}.ptk-label{font-size:11.5px}.ptk-title{font-size:16px}}'
    ].join('');
    document.head.appendChild(style);
  }

  window.initPriceSettingTiktokModule = function (containerId) {
    injectStyle();
    var box = byId(containerId || 'price-setting-tiktok-container');
    if (!box) return false;

    box.className = '';
    box.innerHTML = '' +
      '<div class="ptk-wrap" data-version="' + VERSION_MARKER + '">' +
        '<div class="ptk-card">' +
          '<div class="ptk-label">TikTok Shop · Module riêng</div>' +
          '<h2 class="ptk-title">Thiết lập giá TikTok Shop</h2>' +
          '<div class="ptk-text">Khu vực này đã được tách riêng để sau này viết công thức TikTok Shop mà không ảnh hưởng tới Shopee hoặc Lazada. Cấu trúc file TikTok Shop khác Shopee, nên logic upload, cột dữ liệu, phí sàn và file xuất sẽ được viết trong file <b>price-setting-tiktok.js</b>.</div>' +
          '<div class="ptk-list">' +
            '<div class="ptk-item">File riêng: price-setting-tiktok.js</div>' +
            '<div class="ptk-item">Không dùng chung công thức Shopee</div>' +
            '<div class="ptk-item">Sẵn sàng thêm phí TikTok Shop</div>' +
            '<div class="ptk-item">Sẵn sàng đọc cấu trúc file TikTok</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    return true;
  };
})();

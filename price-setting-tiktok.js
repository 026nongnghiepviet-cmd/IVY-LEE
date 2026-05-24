/* PRICE_SETTING_TIKTOK_MODULE_ONLY_V1_20260524
 * NNV Marketing System - TMĐT > Thiết lập giá > TikTok Shop
 * FILE RIÊNG CHO TIKTOK SHOP.
 * Không dùng chung công thức với Shopee.
 */
(function () {
  'use strict';

  var VERSION_MARKER = 'PRICE_SETTING_TIKTOK_MODULE_ONLY_V1_20260524';

  if (window.__NNV_PRICE_SETTING_TIKTOK_VERSION__ === VERSION_MARKER) {
    return;
  }
  window.__NNV_PRICE_SETTING_TIKTOK_VERSION__ = VERSION_MARKER;

  function byId(id) {
    return document.getElementById(id);
  }

  function injectStyle() {
    if (byId('nnv-price-tiktok-style-v1')) return;
    var style = document.createElement('style');
    style.id = 'nnv-price-tiktok-style-v1';
    style.textContent = [
      '.ptk-wrap{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#202124;}',
      '.ptk-card{border:1px solid #e8eaed;border-radius:18px;background:#fff;padding:22px;box-shadow:0 4px 18px rgba(0,0,0,.04);}',
      '.ptk-badge{display:inline-flex;align-items:center;gap:8px;background:#111827;color:#fff;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:800;margin-bottom:12px;}',
      '.ptk-title{font-size:18px;font-weight:900;margin-bottom:8px;}',
      '.ptk-text{font-size:13px;color:#5f6368;line-height:1.6;max-width:780px;}',
      '.ptk-list{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;}',
      '.ptk-item{background:#f8f9fa;border:1px solid #e8eaed;border-radius:14px;padding:12px;font-size:13px;font-weight:700;color:#3c4043;}'
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
          '<div class="ptk-badge">🎵 TikTok Shop · Module riêng</div>' +
          '<div class="ptk-title">Thiết lập giá TikTok Shop</div>' +
          '<div class="ptk-text">Khu vực này đã được tách riêng để sau này viết công thức TikTok Shop mà không ảnh hưởng tới Shopee. Cấu trúc file TikTok Shop khác Shopee, nên logic upload, cột dữ liệu, phí sàn và file xuất sẽ được viết trong file <b>price-setting-tiktok.js</b>.</div>' +
          '<div class="ptk-list">' +
            '<div class="ptk-item">✅ File riêng: price-setting-tiktok.js</div>' +
            '<div class="ptk-item">✅ Không dùng chung công thức Shopee</div>' +
            '<div class="ptk-item">✅ Sẵn sàng thêm phí TikTok Shop</div>' +
            '<div class="ptk-item">✅ Sẵn sàng đọc cấu trúc file TikTok</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    return true;
  };
})();

/* PRICE_SETTING_LAZADA_MODULE_ONLY_V1_20260524
 * NNV Marketing System - TMĐT > Thiết lập giá > Lazada
 * FILE RIÊNG CHO LAZADA.
 * Không dùng chung công thức với Shopee/TikTok Shop.
 */
(function () {
  'use strict';

  var VERSION_MARKER = 'PRICE_SETTING_LAZADA_MODULE_ONLY_V1_20260524';

  if (window.__NNV_PRICE_SETTING_LAZADA_VERSION__ === VERSION_MARKER) return;
  window.__NNV_PRICE_SETTING_LAZADA_VERSION__ = VERSION_MARKER;

  function byId(id) { return document.getElementById(id); }

  function injectStyle() {
    if (byId('nnv-price-lazada-style-v1')) return;
    var style = document.createElement('style');
    style.id = 'nnv-price-lazada-style-v1';
    style.textContent = [
      '.plz-wrap{font-family:"Segoe UI","Noto Sans",Tahoma,Arial,sans-serif;color:#202124;}',
      '.plz-card{border:1px solid #e8eaed;border-radius:16px;background:#fff;padding:18px;box-shadow:0 4px 16px rgba(60,64,67,.05);}',
      '.plz-label{display:inline-flex;align-items:center;background:#faf5ff;color:#6d28d9;border:1px solid #ddd6fe;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;margin-bottom:12px;}',
      '.plz-title{font-size:17px;font-weight:700;margin:0 0 8px 0;letter-spacing:0;text-align:left;}',
      '.plz-text{font-size:13px;color:#5f6368;line-height:1.55;max-width:820px;text-align:left;}',
      '.plz-list{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;}',
      '.plz-item{background:#f8f9fa;border:1px solid #e8eaed;border-radius:13px;padding:11px;font-size:13px;font-weight:600;color:#3c4043;}',
      '@media(max-width:768px){.plz-card{padding:14px;border-radius:15px}.plz-list{grid-template-columns:1fr}.plz-label{font-size:11.5px}.plz-title{font-size:16px}}'
    ].join('');
    document.head.appendChild(style);
  }

  window.initPriceSettingLazadaModule = function (containerId) {
    injectStyle();
    var box = byId(containerId || 'price-setting-lazada-container');
    if (!box) return false;

    box.className = '';
    box.innerHTML = '' +
      '<div class="plz-wrap" data-version="' + VERSION_MARKER + '">' +
        '<div class="plz-card">' +
          '<div class="plz-label">Lazada · Module riêng</div>' +
          '<h2 class="plz-title">Thiết lập giá Lazada</h2>' +
          '<div class="plz-text">Khu vực này đã được tách riêng để sau này viết công thức Lazada mà không ảnh hưởng tới Shopee hoặc TikTok Shop. Khi có file mẫu Lazada, mình sẽ viết logic đọc file, tính phí, xuất bảng giá và kiểm tra tiền về trong file <b>price-setting-lazada.js</b>.</div>' +
          '<div class="plz-list">' +
            '<div class="plz-item">File riêng: price-setting-lazada.js</div>' +
            '<div class="plz-item">Không dùng chung công thức Shopee</div>' +
            '<div class="plz-item">Sẵn sàng thêm phí Lazada</div>' +
            '<div class="plz-item">Sẵn sàng đọc cấu trúc file Lazada</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    return true;
  };
})();

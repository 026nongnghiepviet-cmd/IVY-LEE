/* PRICE_SETTING_TIKTOK_PLACEHOLDER_V1_20260524
 * NNV Marketing System - TMĐT > Thiết lập giá > TikTok Shop
 * File riêng cho TikTok Shop. Sau này viết code TikTok tại đây, không đụng Shopee.
 */
(function () {
  "use strict";

  var VERSION_MARKER = "PRICE_SETTING_TIKTOK_PLACEHOLDER_V1_20260524";

  if (window.__NNV_PRICE_SETTING_TIKTOK_VERSION__ === VERSION_MARKER) {
    return;
  }
  window.__NNV_PRICE_SETTING_TIKTOK_VERSION__ = VERSION_MARKER;

  function $(id) {
    return document.getElementById(id);
  }

  function injectStyles() {
    if ($("price-setting-tiktok-style")) return;
    var style = document.createElement("style");
    style.id = "price-setting-tiktok-style";
    style.innerHTML = `
      .pt-shell{
        font-family:'Segoe UI',Tahoma,sans-serif;
        color:#202124;
      }
      .pt-card{
        border:1px solid #e8eaed;
        border-radius:18px;
        background:#fff;
        padding:22px;
        box-shadow:0 3px 14px rgba(0,0,0,.04);
      }
      .pt-head{
        display:flex;
        align-items:center;
        gap:14px;
        margin-bottom:14px;
      }
      .pt-icon{
        width:48px;
        height:48px;
        border-radius:16px;
        background:#111827;
        color:#fff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:22px;
        font-weight:900;
      }
      .pt-card h2{
        margin:0;
        font-size:21px;
        font-weight:850;
      }
      .pt-card p{
        color:#5f6368;
        line-height:1.6;
        margin:8px 0 0;
        font-size:13px;
      }
      .pt-note{
        margin-top:16px;
        border:1px dashed #dadce0;
        background:#f8f9fa;
        padding:14px;
        border-radius:14px;
        font-size:13px;
        color:#5f6368;
        line-height:1.55;
      }
      .pt-version{
        display:inline-block;
        margin-top:14px;
        font-size:11px;
        font-weight:800;
        color:#5f6368;
        background:#f1f3f4;
        border-radius:999px;
        padding:6px 10px;
      }
    `;
    document.head.appendChild(style);
  }

  window.initPriceSettingTiktokModule = function (containerId) {
    var container = $(containerId || "price-setting-tiktok-container");
    if (!container) return;
    injectStyles();
    container.innerHTML = `
      <div class="pt-shell">
        <div class="pt-card">
          <div class="pt-head">
            <div class="pt-icon">♪</div>
            <div>
              <h2>Thiết lập giá TikTok Shop</h2>
              <p>Đây là module riêng cho TikTok Shop. Hiện tại để khung chờ vì cấu trúc file TikTok Shop khác Shopee.</p>
            </div>
          </div>
          <div class="pt-note">
            Khi anh gửi file giá gốc TikTok Shop và file giá bán mẫu, mình sẽ viết logic riêng trong file <b>price-setting-tiktok.js</b>. Module này không dùng biến, hàm hay công thức của Shopee nên cập nhật TikTok sẽ không ảnh hưởng Shopee.
          </div>
          <div class="pt-version">${VERSION_MARKER}</div>
        </div>
      </div>
    `;
  };

  window.NNV_PRICE_SETTING_TIKTOK_MARKER = VERSION_MARKER;
})();

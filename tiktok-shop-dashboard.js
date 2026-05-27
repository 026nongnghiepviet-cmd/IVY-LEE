/**
 * TIKTOK SHOP DASHBOARD V0.1 - PLACEHOLDER
 * File riêng cho Dashboard TikTok Shop.
 * Sau khi có file cấu trúc TikTok Shop, module này sẽ được nâng cấp để đọc file, lưu Firebase và vẽ biểu đồ.
 */
(function () {
    'use strict';

    function getContainer() {
        return document.getElementById('ecom-tiktok-dashboard-container') ||
               document.getElementById('tiktok-shop-dashboard-container') ||
               document.getElementById('page-tiktok');
    }

    window.initTiktokShopDashboard = function () {
        var box = getContainer();
        if (!box) return;

        box.innerHTML = `
            <div style="
                background:#ffffff;
                border:1px solid #e2e8f0;
                border-radius:22px;
                padding:24px;
                box-shadow:0 10px 28px rgba(15,23,42,.05);
                font-family:'Segoe UI', Arial, 'Helvetica Neue', Tahoma, sans-serif !important;
            ">
                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:14px;
                    flex-wrap:wrap;
                    margin-bottom:16px;
                ">
                    <div>
                        <div style="color:#0f172a;font-size:22px;font-weight:900;letter-spacing:-.03em;">🎵 Dashboard TikTok Shop</div>
                        <div style="color:#64748b;font-size:13px;font-weight:500;margin-top:4px;">
                            Đang chờ file cấu trúc TikTok Shop để hoàn thiện module riêng.
                        </div>
                    </div>
                    <span style="
                        background:#fdf2f8;
                        color:#be185d;
                        border:1px solid #fbcfe8;
                        border-radius:999px;
                        padding:7px 12px;
                        font-size:12px;
                        font-weight:800;
                    ">TIKTOK_V0.1</span>
                </div>

                <div style="
                    border:1px dashed #f9a8d4;
                    background:#fdf2f8;
                    color:#9d174d;
                    border-radius:18px;
                    padding:22px;
                    text-align:center;
                    font-weight:600;
                    line-height:1.6;
                ">
                    Gửi file TikTok Shop lên, mình sẽ map sheet/cột và làm dashboard giống chuẩn Shopee:
                    doanh thu, đơn hàng, chi phí, tỉ lệ chuyển đổi, sản phẩm/SKU, biểu đồ và bộ lọc thời gian.
                </div>
            </div>
        `;
    };
})();

/**
 * TIKTOK RECONCILE MODULE (V2 - SYNCHRONIZED UI)
 */
document.addEventListener('DOMContentLoaded', initTiktokModule);

function initTiktokModule() {
    const container = document.getElementById('page-tiktok');
    if (!container || container.innerHTML.includes('tiktok-reconcile-area')) return;

    container.innerHTML = `
        <style>
            #tiktokResultTable tfoot th { position: sticky; bottom: -1px; z-index: 10; background: #fffcfc; border-top: 2px solid #000 !important; box-shadow: 0 -4px 6px rgba(0,0,0,0.05); }
            .btn-tiktok-action { background: #000; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
            .btn-tiktok-action:hover { background: #333; transform: translateY(-2px); }
            .platform-badge-tiktok { display:inline-block; background:#000; color:#fff; padding:2px 10px; border-radius:12px; font-size:10px; font-weight:bold; margin-left:10px; vertical-align:middle;}
            
            .platform-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .platform-tab { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 2px solid transparent; background: #f8f9fa; color: #555; transition: 0.2s; display: flex; align-items: center; gap: 10px; fill: #555; }
            .platform-tab svg { width: 18px; height: 18px; }
            
            .platform-tab.tab-shopee:hover { background: #fdf2f0; color: #ee4d2d; fill: #ee4d2d; }
            .platform-tab.tab-tiktok.active { background: #f0f0f0; color: #000; border-color: #000; fill: #000; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        </style>

        <div class="section-box" id="tiktok-reconcile-area">
            <div class="section-title">🛒 ĐỐI SOÁT ĐƠN HÀNG <span class="platform-badge-tiktok">Nền tảng TikTok Shop</span></div>

            <div class="platform-tabs">
                <div class="platform-tab tab-shopee" onclick="window.goPage('shopee')">
                    <svg viewBox="0 0 24 24"><path d="M8.2 8.4l-.8-3.4c-.1-.5.3-1 1-1h6.6c.6 0 1.1.5 1 1l-.8 3.4h-7zM20 9.5v9c0 1.9-1.5 3.5-3.5 3.5h-9C5.5 22 4 20.4 4 18.5v-9c0-1.4 1.1-2.5 2.5-2.5h11c1.4 0 2.5 1.1 2.5 2.5zM12 18.2c2.4 0 4.1-1.3 4.1-3.2 0-2.3-2.1-2.6-3.8-3-.9-.2-1.3-.5-1.3-1s.6-1 1.5-1c.9 0 2 .5 2.5 1.2l1.3-1.6c-.9-1.1-2.2-1.6-3.7-1.6-2 0-3.8 1-3.8 3 0 2.2 2 2.6 3.8 3 .9.2 1.4.5 1.4 1s-.7 1-1.6 1c-1.1 0-2.3-.6-3-1.6l-1.4 1.4c1 1.5 2.5 2.4 4 2.4z"/></svg> Shopee
                </div>
                <div class="platform-tab tab-tiktok active">
                    <svg viewBox="0 0 448 512"><path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z"/></svg> TikTok Shop
                </div>
            </div>
            
            <div style="background:#f8f9fa; padding:20px; border-radius:8px; border:1px solid #eee; margin-bottom:20px;">
                <p style="color:#555; font-style:italic;">⚠️ Module Đối soát TikTok đang chờ cung cấp file mẫu và công thức để code logic tính toán.</p>
            </div>
            
            <button class="btn-tiktok-action" onclick="alert('Đang chờ file Excel TikTok mẫu để thiết lập cột dữ liệu!')">
                ⚙️ XỬ LÝ DỮ LIỆU TIKTOK
            </button>
        </div>
    `;
}

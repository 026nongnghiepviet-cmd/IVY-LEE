/**
 * MKT PERMISSION RBAC V20.8
 * File phân quyền riêng cho Marketing System Blogspot.
 * - Ba cấp sử dụng: Cấp 1, Cấp 2, Khách - Chỉ xem; Quản trị hệ thống là cấp đặc biệt được khóa toàn quyền.
 * - Cho phép Admin tạo thêm phân quyền mặc định có tên riêng.
 * - Quyền theo module: none / view / edit
 * - Admin là quyền cao nhất, không cho chỉnh/xóa hoặc hạ quyền Admin.
 * - Tương thích dữ liệu cũ: features boolean -> permissions string.
 * - V5: sửa triệt để menu Thiết lập giá/Soạn đơn bị ẩn do legacy style display:none và cache RBAC.
 * - V6: reset quyền/menu ngay khi đổi phiên đăng nhập, tránh logout/login vẫn còn menu cũ.
 * - V7: đổi tên file để né cache, ép render lại trang quản trị mới, bổ sung giao diện quản trị hiện đại rõ ràng hơn.
 * - V8: Control Center UI rõ khác biệt.
 * - V9: sửa quyền Đối soát đơn hàng/Shopee/TikTok, hỗ trợ alias ecom/reconcile, reset tiêu đề dropdown đúng quyền.
 * - V8: dựng lại giao diện quản trị dạng Control Center, quyền mặc định theo phân quyền dạng card, nhấn mạnh thay đổi UI rõ ràng.
 * - V10: sửa hiển thị Shopee/TikTok trong Đối soát đơn hàng, chống legacy hide và tối ưu menu mobile.
 * - V12: Session Safe không phá quyền: khóa menu lúc đổi tài khoản, chỉ mở khi có dữ liệu user; nếu user không map thì rơi về guest thay vì treo.
 * - V13: Dọn xung đột selector Thiết lập giá, tránh ép display:flex vào section/title và ổn định RBAC với Blogspot V167.
 * - V14: Tách menu Quảng cáo thành nút cha chỉ hiển thị, thêm quyền riêng Tổng quan FB Ads và Thống kê ROAS.
 * - V15: Đổi tên vai trò thành cấp quyền; Khách được xem toàn bộ module nhưng khóa mọi thao tác ghi/upload/lưu/xóa và chặn ghi Firebase ở tầng client.
 * - V15: Quyền mặc định theo phân quyền chỉ là mẫu; khi lưu user, bộ quyền riêng được lưu trực tiếp trên user và không làm thay đổi user khác.
 * - V16: Rút còn Cấp 1/Cấp 2/Khách; thêm phân quyền mặc định tùy chỉnh có tên riêng, lưu tại Firebase và vẫn cho phép quyền riêng từng user.
 * - V17: Khách mặc định chỉ xem nhưng Admin được chỉnh Ẩn/Xem; bộ quyền mặc định hiển thị dạng bảng gọn; sửa user bằng popup; tab Tạo phân quyền/Thêm người dùng và lưu thẳng Firebase.
 * - V18: Thêm user một lần trong Quản trị hệ thống sẽ tự tạo Firebase Authentication bằng app phụ và đồng thời lưu hồ sơ/quyền vào Realtime Database, không làm đăng xuất Admin.
 * - V19: Đồng bộ UID với hồ sơ phân quyền, loại bỏ cơ chế cấp quyền ghi mặc định cho tài khoản chưa có permissions_by_uid và tương thích Rules chặt hơn.
 * - V19.1: Cho phép mọi tài khoản đã đăng nhập tham gia đồng bộ Meta Live tại đúng 3 nhánh hệ thống; vẫn chặn toàn bộ ghi dữ liệu nghiệp vụ khác.
 * - V19.2: Popup sửa user được portal ra document.body để không bị top menu che.
 * - V20: Dọn phân quyền theo module còn hoạt động; bỏ Report/Plan/KPI đã ngưng. Quản trị hệ thống chuyển khỏi menu chính vào menu xổ xuống khi bấm tên tài khoản.
 * - V20.3: Chỉ Anonymous Guest bị chặn Meta Live và hiện thông báo. Google Workspace @phanbon.com.vn luôn được phép dùng Meta Live; RBAC/quyền module vẫn quản lý độc lập và user chưa có hồ sơ vẫn có thể mang role guest trên giao diện.
 * - V20.4: Thêm nút chuyển thẳng từ Guest sang Google Workspace; phối hợp Router V2 để giữ nguyên deep-link/hash qua login, F5, Google popup/redirect và chỉ kiểm tra quyền route sau khi RBAC sẵn sàng.
 * - V20.5: Cảnh báo Meta Guest chỉ bật sau khi người dùng thật sự bấm nút Khách và Firebase Anonymous đăng nhập thành công; không tự bật khi vừa mở deep-link/khôi phục phiên cũ. Đăng xuất trở lại ngoài tên tài khoản; dropdown tên tài khoản chỉ giữ Quản trị hệ thống.
 * - V20.6: Google Workspace @phanbon.com.vn chưa có hồ sơ RBAC mặc định chỉ được Xem Tổng quan FB Ads; khi Admin thêm/chỉnh user thì quyền Firebase ghi đè mặc định này. Ổn định render quyền bằng permission signature để menu không nhảy giật khi nhiều listener Firebase cùng cập nhật. Thông báo ngưng Meta chỉ dành cho Firebase Anonymous Guest.
 * - V20.7: Guest giữ banner đăng nhập Google sau khi đóng popup; popup quyền Meta cho tài khoản không được xem dữ liệu thật; bỏ caret tài khoản desktop, chỉ avatar/tên mở menu; căn giữa Đăng xuất mobile.
 * - V20.8: Tiêu đề cảnh báo Guest Meta Live chuyển đỏ nổi bật; banner Guest dùng tone cảnh báo rõ hơn nhưng giữ nút Google responsive.
 * - V19.2: Popup Sửa user được portal trực tiếp ra document.body để luôn nổi trên top menu/stacking context của Blogspot.
 */
(function () {
  'use strict';

  var VERSION = 'MKT_RBAC_V20.8_GUEST_ALERT_RED_MOBILE_UI';
  var BOOT_GATE_CLASS = 'mkt-rbac-booting';
  var USER_PATH = 'system_settings/users';
  var ROLE_DEFAULTS_PATH = 'system_settings/role_permissions';
  var CUSTOM_ROLES_PATH = 'system_settings/custom_permission_roles';
  var PERMISSIONS_BY_UID_PATH = 'system_settings/permissions_by_uid';
  var UID_USER_MAP_PATH = 'system_settings/uid_user_map';
  var USER_PROVISION_APP_NAME = 'MKT_RBAC_USER_PROVISIONING';
  var ACTIVE_ROLE_PERMISSIONS = null;
  var CUSTOM_ROLE_DEFS = {};
  var CUSTOM_ROLE_REF = null;
  var booted = false;
  var original = {};
  var ADMIN_UID_FLAG = false;
  var ADMIN_UID_REF = null;
  var ADMIN_UID_BOUND_UID = '';
  var LAST_AUTH_UID = '__BOOT__';
  var LAST_UID_MAP_SIGNATURE = '';
  var UID_MAP_READY_SIGNATURE = '';
  var UID_MAP_PENDING_SIGNATURE = '';
  var UID_MAP_LAST_ERROR = '';
  var LAST_PERMISSION_UI_SIGNATURE_V206 = '';
  var PERMISSION_APPLY_RUNNING_V206 = false;
  var WORKSPACE_DEFAULT_DOMAIN_V206 = 'phanbon.com.vn';

  var MODULES = {
    home: { label: 'Trang chủ', page: 'home', navSelector: '.nav-link[data-page="home"]', alwaysVisible: true },
    ads: { label: 'Tổng quan FB Ads', page: 'ads', navSelector: '.dropdown-item[data-page="ads"], [data-rbac-page="ads"]' },
    roas: { label: 'Thống kê ROAS', page: 'roas-stats', navSelector: '.dropdown-item[data-page="roas-stats"], [data-rbac-page="roas-stats"]' },
    ecom: { label: 'TMĐT / Đối soát đơn hàng', page: 'ecom-main', navSelector: '.nav-dropdown[data-group="ecom"], .nav-link[data-group="ecom"]' },
    price: { label: 'Thiết lập giá', page: 'price-setting', navSelector: '.dropdown-item[data-page="price-setting"], [data-rbac-page="price-setting"]' },
    compose: { label: 'Soạn đơn', page: 'compose', navSelector: '.nav-link[data-page="compose"], [data-rbac-module="compose"]' },
    admin: { label: 'Quản trị hệ thống', page: 'admin', navSelector: '#account-admin-menu-item, #account-admin-menu-item-mobile' }
  };

  // Chỉ các chức năng đang còn tồn tại mới xuất hiện trong bảng phân quyền.
  var ACTIVE_PERMISSION_MODULES = ['ads','roas','ecom','price','compose'];

  var PAGE_TO_MODULE = {
    home: 'home',
    ads: 'ads',
    'roas-stats': 'roas',
    roas: 'roas',
    'ecom-main': 'ecom',
    shopee: 'ecom',
    tiktok: 'ecom',
    'price-setting': 'price',
    compose: 'compose',
    admin: 'admin'
  };

  // Ba cấp cố định. Các key cũ được ánh xạ về Cấp 1/Cấp 2 để không làm hỏng dữ liệu Firebase hiện có.
  var CORE_ROLES = {
    admin: { label: 'Quản trị hệ thống', icon: '🛡️', core: true },
    level1: { label: 'Cấp 1', icon: '1️⃣', core: true },
    level2: { label: 'Cấp 2', icon: '2️⃣', core: true },
    guest: { label: 'Khách - Chỉ xem', icon: '👀', core: true }
  };

  // ROLES là registry động: 4 role lõi + các phân quyền mặc định do Admin tự tạo.
  // Giữ cùng object để window.MKTRBAC.roles luôn nhận dữ liệu mới sau khi Firebase cập nhật.
  var ROLES = {
    admin: { label: 'Quản trị hệ thống', icon: '🛡️', core: true },
    level1: { label: 'Cấp 1', icon: '1️⃣', core: true },
    level2: { label: 'Cấp 2', icon: '2️⃣', core: true },
    guest: { label: 'Khách - Chỉ xem', icon: '👀', core: true }
  };

  var ROLE_ALIAS = {
    super_admin: 'admin',
    admin: 'admin',
    boss: 'level1',
    level1: 'level1', level_1: 'level1', cap1: 'level1', cap_1: 'level1',
    manager: 'level2', deputy: 'level2',
    mkt: 'level2', staff: 'level2', marketing: 'level2', employee: 'level2',
    sale: 'level2', leader: 'level2',
    level2: 'level2', level_2: 'level2', cap2: 'level2', cap_2: 'level2',
    guest: 'guest',
    workspace: 'workspace'
  };

  var DEFAULT_ROLE_PERMISSIONS = {
    // Chỉ giữ module đang còn hoạt động trong Marketing System V182+.
    // Quản trị hệ thống là quyền đặc biệt, không cấp từ bảng quyền thông thường.
    admin:  { ads:'edit', roas:'edit', ecom:'edit', price:'edit', compose:'edit', admin:'edit' },
    level1: { ads:'edit', roas:'edit', ecom:'edit', price:'edit', compose:'edit', admin:'none' },
    level2: { ads:'edit', roas:'edit', ecom:'edit', price:'edit', compose:'edit', admin:'none' },
    guest:  { ads:'view', roas:'view', ecom:'view', price:'view', compose:'view', admin:'none' }
  };

  function workspaceDefaultPermissionsV206() {
    // Workspace chưa được Admin cấu hình: chỉ mở menu Quảng cáo ở chế độ Xem.
    // Khi email đã có trong system_settings/users, quyền lưu trên Firebase luôn ưu tiên.
    return { ads:'view', roas:'none', ecom:'none', price:'none', compose:'none', admin:'none' };
  }

  function isWorkspaceDomainAuthSessionV206() {
    try {
      var user = window.sysAuth && window.sysAuth.currentUser;
      if (!user || user.isAnonymous === true) return false;
      var email = safe(user.email).trim().toLowerCase();
      return !!email && email.endsWith('@' + WORKSPACE_DEFAULT_DOMAIN_V206);
    } catch(e) {
      return false;
    }
  }

  function isUnregisteredWorkspaceSessionV206() {
    if (!isWorkspaceDomainAuthSessionV206()) return false;
    var email = getCurrentEmail();
    return !!email && !findUserByEmail(email);
  }

  function permissionUiSignatureV206(role, perms) {
    var p = perms || {};
    return [
      getCurrentUid(),
      safe(role),
      ADMIN_UID_FLAG ? '1' : '0',
      ACTIVE_PERMISSION_MODULES.map(function(k){ return k + ':' + normalizePermissionValue(p[k]); }).join('|')
    ].join('||');
  }

  function $(id) { return document.getElementById(id); }

  function safe(v) { return (v === null || v === undefined) ? '' : String(v); }

  function esc(v) {
    return safe(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
    else console.warn(msg);
  }


  // =========================================================
  // V20.3 — META LIVE TÁCH KHỎI RBAC CHO GOOGLE WORKSPACE
  // - Chỉ tài khoản Anonymous tạo từ nút Đăng nhập Khách bị chặn Meta Live.
  // - Google Workspace @phanbon.com.vn luôn được phép đi luồng Meta Direct.
  // - Nếu Workspace chưa có hồ sơ system_settings/users thì RBAC vẫn có thể gán guest
  //   để giới hạn các module khác; trạng thái guest đó KHÔNG được dùng để chặn Meta Live.
  // =========================================================
  var META_GUEST_NOTICE_TITLE = 'Meta Live đã ngưng hỗ trợ trên tài khoản khách';
  var META_GUEST_NOTICE_DETAIL = 'Hãy đăng nhập bằng tài khoản Google Workspace vd: mkt@phanbon.com.vn để có thể sử dụng được tính năng này.';
  var META_GUEST_LOGIN_PENDING_KEY = 'MKT_META_GUEST_NOTICE_PENDING_V20_5';
  var META_GUEST_LOGIN_CONFIRMED_KEY = 'MKT_META_GUEST_LOGIN_CONFIRMED_V20_5';

  function ensureMetaGuestNoticeUi() {
    if (!document || !document.body) return null;

    if (!$('mkt-meta-guest-notice-style')) {
      var style = document.createElement('style');
      style.id = 'mkt-meta-guest-notice-style';
      style.textContent = [
        '.mkt-meta-guest-notice{display:none;position:fixed;inset:0;z-index:260000;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.54);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);}',
        '.mkt-meta-guest-notice.open{display:flex;}',
        '.mkt-meta-guest-notice-card{width:min(520px,94vw);background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:24px;box-shadow:0 30px 80px rgba(15,23,42,.28);text-align:center;font-family:Tahoma,Arial,\"Segoe UI\",sans-serif;}',
        '.mkt-meta-guest-notice-icon{width:54px;height:54px;margin:0 auto 14px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:#eff6ff;color:#2563eb;font-size:25px;}',
        '.mkt-meta-guest-notice-title{margin:0;color:#0f172a;font-size:19px;line-height:1.35;font-weight:800;}',
        '.mkt-meta-guest-notice-detail{display:block;margin-top:9px;color:#64748b;font-size:12px;line-height:1.65;font-weight:500;}',
        '.mkt-meta-guest-notice-actions{display:flex;gap:9px;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:18px;}',
        '.mkt-meta-guest-notice-btn{margin-top:0;border:0;border-radius:999px;padding:11px 18px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 10px 22px rgba(37,99,235,.20);transition:.16s ease;}',
        '.mkt-meta-guest-notice-btn:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(37,99,235,.25);}',
        '.mkt-meta-guest-notice-btn.secondary{background:#fff;color:#475569;border:1px solid #dbe3ef;box-shadow:none;}',
        '.mkt-meta-guest-inline{position:relative;z-index:30;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;margin:14px 0;padding:15px 16px;border:1px solid #bfdbfe;border-radius:18px;background:linear-gradient(135deg,#eff6ff,#fff);font-family:Tahoma,Arial,"Segoe UI",sans-serif;text-align:left;box-shadow:0 8px 22px rgba(37,99,235,.07);}',
        '.mkt-meta-guest-inline-copy{min-width:0;}',
        '.mkt-meta-guest-inline strong{display:block;color:#1e3a8a;font-size:14px;line-height:1.4;}',
        '.mkt-meta-guest-inline small{display:block;margin-top:5px;color:#64748b;font-size:11px;line-height:1.55;}',
        '.mkt-meta-guest-inline-actions{display:flex;align-items:center;justify-content:flex-end;}',
        '.mkt-meta-guest-google-btn{min-height:40px;border:0;border-radius:999px;padding:0 16px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font:800 11.5px Tahoma,Arial,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 9px 20px rgba(37,99,235,.20);}',
        '.mkt-meta-guest-google-btn:hover{transform:translateY(-1px);}',
        '@media(max-width:700px){.mkt-meta-guest-notice-card{padding:20px 16px;}.mkt-meta-guest-notice-actions{display:grid;grid-template-columns:1fr;width:100%;}.mkt-meta-guest-notice-btn{width:100%;}.mkt-meta-guest-inline{grid-template-columns:1fr;gap:11px;margin:10px 0 12px;padding:13px;border-radius:15px;}.mkt-meta-guest-inline-actions{justify-content:stretch;}.mkt-meta-guest-google-btn{width:100%;min-height:42px;}}'
      ].join('');
      document.head.appendChild(style);
    }

    var modal = $('mkt-meta-guest-notice');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mkt-meta-guest-notice';
      modal.className = 'mkt-meta-guest-notice';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML =
        '<div class="mkt-meta-guest-notice-card" role="dialog" aria-modal="true">' +
          '<div class="mkt-meta-guest-notice-icon">ⓘ</div>' +
          '<h3 class="mkt-meta-guest-notice-title">' + esc(META_GUEST_NOTICE_TITLE) + '</h3>' +
          '<small class="mkt-meta-guest-notice-detail">' + esc(META_GUEST_NOTICE_DETAIL) + '</small>' +
          '<div class="mkt-meta-guest-notice-actions">' +
            '<button type="button" class="mkt-meta-guest-notice-btn mkt-meta-guest-login-google">Đăng nhập bằng Google</button>' +
            '<button type="button" class="mkt-meta-guest-notice-btn secondary mkt-meta-guest-close">Đóng</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);

      var close = function(){
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      };
      var closeBtn = modal.querySelector('.mkt-meta-guest-close');
      if (closeBtn) closeBtn.addEventListener('click', close);
      var googleBtn = modal.querySelector('.mkt-meta-guest-login-google');
      if (googleBtn) googleBtn.addEventListener('click', function(){
        close();
        loginGoogleWorkspaceFromGuest();
      });
      modal.addEventListener('click', function(ev){ if (ev.target === modal) close(); });
    }
    return modal;
  }

  function loginGoogleWorkspaceFromGuest() {
    try {
      if (window.MKTRouter && typeof window.MKTRouter.rememberCurrentRoute === 'function') {
        window.MKTRouter.rememberCurrentRoute();
      }
    } catch(e) {}

    var startGoogle = function(){
      if (typeof window.doLoginWithGoogle === 'function') {
        return window.doLoginWithGoogle();
      }
      toast('Chưa tải được chức năng Đăng nhập bằng Google. Vui lòng thử lại.');
      return null;
    };

    try {
      var auth = window.sysAuth;
      var current = auth && auth.currentUser;
      if (auth && current && current.isAnonymous === true) {
        return auth.signOut()
          .catch(function(){ return null; })
          .then(function(){ return startGoogle(); });
      }
    } catch(e) {}

    return startGoogle();
  }

  function showMetaGuestNotice() {
    var modal = ensureMetaGuestNoticeUi();
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeMetaAccessNoticeV207() {
    var modal = $('mkt-meta-access-notice');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function loginAnotherAccountFromMetaNoticeV207() {
    closeMetaAccessNoticeV207();
    try {
      if (window.MKTRouter && typeof window.MKTRouter.rememberCurrentRoute === 'function') window.MKTRouter.rememberCurrentRoute();
    } catch(e) {}
    if (typeof window.authLogout === 'function') { window.authLogout(); return; }
    try { if (window.sysAuth) window.sysAuth.signOut(); } catch(e) {}
  }

  function ensureMetaAccessNoticeUiV207() {
    ensureMetaGuestNoticeUi();
    var modal = $('mkt-meta-access-notice');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'mkt-meta-access-notice';
    modal.className = 'mkt-meta-guest-notice mkt-meta-access-notice';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="mkt-meta-guest-notice-card" role="dialog" aria-modal="true">' +
        '<div class="mkt-meta-guest-notice-icon">🔒</div>' +
        '<h3 class="mkt-meta-guest-notice-title" id="mkt-meta-access-title">Không thể xem dữ liệu Meta Live</h3>' +
        '<small class="mkt-meta-guest-notice-detail" id="mkt-meta-access-detail"></small>' +
        '<div class="mkt-meta-guest-notice-actions">' +
          '<button type="button" class="mkt-meta-guest-notice-btn mkt-meta-access-login-other">Đăng nhập tài khoản khác</button>' +
          '<button type="button" class="mkt-meta-guest-notice-btn secondary mkt-meta-access-close">Đóng</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    var closeBtn = modal.querySelector('.mkt-meta-access-close');
    if (closeBtn) closeBtn.addEventListener('click', closeMetaAccessNoticeV207);
    var loginBtn = modal.querySelector('.mkt-meta-access-login-other');
    if (loginBtn) loginBtn.addEventListener('click', loginAnotherAccountFromMetaNoticeV207);
    modal.addEventListener('click', function(ev){ if (ev.target === modal) closeMetaAccessNoticeV207(); });
    return modal;
  }

  function showMetaAccessNoticeV207(errorMessage) {
    var message = safe(errorMessage).replace(/^Error:\s*/i, '').trim();
    var lower = message.toLowerCase();
    var email = getCurrentEmail();
    var title = 'Không thể xem dữ liệu Meta Live';
    var detail = message || 'Tài khoản hiện tại chưa thể tải dữ liệu Meta Live.';
    if (lower.indexOf('chưa được thêm vào marketing system') !== -1) {
      title = 'Tài khoản chưa được cấp quyền Meta Live';
      detail = (email ? ('Tài khoản ' + email + ' ') : 'Tài khoản này ') + 'chưa được thêm vào Marketing System. Vui lòng đăng nhập bằng tài khoản đã được cấp quyền hoặc liên hệ Quản trị hệ thống.';
    } else if (lower.indexOf('không có quyền') !== -1 || lower.indexOf('chưa được cấp quyền') !== -1 || lower.indexOf('permission') !== -1) {
      title = 'Tài khoản không có quyền xem Meta Live';
      detail = 'Tài khoản hiện tại không được phép đọc dữ liệu Meta Live. Vui lòng dùng tài khoản đã được cấp quyền hoặc liên hệ Quản trị hệ thống.';
    } else if (lower.indexOf('phiên đăng nhập') !== -1 || lower.indexOf('hết hạn') !== -1) {
      title = 'Phiên đăng nhập Meta Live không còn hợp lệ';
      detail = 'Vui lòng đăng nhập lại để hệ thống xác thực quyền xem dữ liệu Meta Live.';
    }
    var modal = ensureMetaAccessNoticeUiV207();
    if (!modal) return;
    var titleEl = $('mkt-meta-access-title');
    var detailEl = $('mkt-meta-access-detail');
    if (titleEl) titleEl.textContent = title;
    if (detailEl) detailEl.textContent = detail;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function isMetaGuestSessionReady() {
    /*
     * V20.3: Meta Guest chỉ có nghĩa là Firebase Anonymous được tạo từ
     * nút "Đăng nhập tài khoản Khách". Không dùng role RBAC = guest để
     * suy ra quyền Meta, vì một Google Workspace chưa được thêm hồ sơ vẫn
     * có thể tạm mang role guest nhưng phải được xem/cập nhật Meta Live.
     */
    try {
      var authUser = window.sysAuth && window.sysAuth.currentUser;
      return !!(authUser && authUser.isAnonymous === true);
    } catch(e) {}
    return false;
  }

  function renderMetaGuestInlineNotice() {
    var page = $('page-ads');
    if (!page) return;

    var old = $('mkt-meta-guest-inline-notice');
    var confirmed = false;
    try { confirmed = sessionStorage.getItem(META_GUEST_LOGIN_CONFIRMED_KEY) === '1'; } catch(e) {}
    if (!isMetaGuestSessionReady() || !confirmed) {
      if (old && old.parentNode) old.parentNode.removeChild(old);
      return;
    }

    if (!old) {
      old = document.createElement('div');
      old.id = 'mkt-meta-guest-inline-notice';
      old.className = 'mkt-meta-guest-inline';
      old.innerHTML =
        '<div class="mkt-meta-guest-inline-copy">' +
          '<strong>' + esc(META_GUEST_NOTICE_TITLE) + '</strong>' +
          '<small>' + esc(META_GUEST_NOTICE_DETAIL) + '</small>' +
        '</div>' +
        '<div class="mkt-meta-guest-inline-actions"><button type="button" class="mkt-meta-guest-google-btn">Đăng nhập bằng Google Workspace</button></div>';
      var inlineGoogle = old.querySelector('.mkt-meta-guest-google-btn');
      if (inlineGoogle) inlineGoogle.addEventListener('click', loginGoogleWorkspaceFromGuest);
      page.insertBefore(old, page.firstChild || null);
    }
  }

  function patchGuestLoginNotice() {
    if (!window.doLoginAsGuest || window.doLoginAsGuest.__metaGuestNoticeWrappedV205) return;

    var oldGuestLogin = window.doLoginAsGuest;
    var wrapped = function(){
      /*
       * V20.5: KHÔNG đánh dấu trước khi signInAnonymously thành công.
       * Chỉ sau khi Firebase thực sự phát ra một user Anonymous mới ghi cờ.
       * Vì vậy mở link/deep-link bình thường hoặc khôi phục một phiên Guest cũ
       * không tự bật popup "Meta Live đã ngưng hỗ trợ".
       */
      var auth = window.sysAuth;
      var unsubscribe = null;
      var timeoutId = null;
      try {
        if (auth && typeof auth.onAuthStateChanged === 'function') {
          unsubscribe = auth.onAuthStateChanged(function(user){
            if (!user || user.isAnonymous !== true) return;
            try {
              sessionStorage.setItem(META_GUEST_LOGIN_PENDING_KEY, '1');
              sessionStorage.setItem(META_GUEST_LOGIN_CONFIRMED_KEY, '1');
            } catch(e) {}
            try { if (typeof unsubscribe === 'function') unsubscribe(); } catch(e) {}
            if (timeoutId) clearTimeout(timeoutId);
            setTimeout(function(){ maybeShowPendingGuestNotice(); renderMetaGuestInlineNotice(); }, 120);
          });
          timeoutId = setTimeout(function(){
            try { if (typeof unsubscribe === 'function') unsubscribe(); } catch(e) {}
          }, 30000);
        }
      } catch(e) {}
      return oldGuestLogin.apply(this, arguments);
    };
    wrapped.__metaGuestNoticeWrappedV205 = true;
    wrapped.__metaGuestNoticeOriginal = oldGuestLogin;
    window.doLoginAsGuest = wrapped;
  }

  function maybeShowPendingGuestNotice() {
    if (!isMetaGuestSessionReady()) return;
    var pending = false;
    try { pending = sessionStorage.getItem(META_GUEST_LOGIN_PENDING_KEY) === '1'; } catch(e) {}
    if (!pending) return;
    try { sessionStorage.removeItem(META_GUEST_LOGIN_PENDING_KEY); } catch(e) {}
    setTimeout(showMetaGuestNotice, 180);
  }

  function roleKey(role) {
    var raw = safe(role || 'level2').toLowerCase().trim();
    var r = ROLE_ALIAS[raw] || raw || 'level2';
    if (r === 'workspace') return 'workspace';
    if (ROLES[r]) return r;
    // Giữ key custom trong lúc listener Firebase chưa tải xong để không làm mất vai trò đã lưu trên user.
    if (r.indexOf('custom_') === 0) return r;
    return 'level2';
  }

  function roleMeta(role) {
    var r = roleKey(role);
    if (r === 'workspace') return { label:'Google Workspace', icon:'G', transient:true };
    if (ROLES[r]) return ROLES[r];
    if (CUSTOM_ROLE_DEFS[r]) {
      return { label: CUSTOM_ROLE_DEFS[r].name || 'Phân quyền tùy chỉnh', icon: CUSTOM_ROLE_DEFS[r].icon || '🧩', custom:true };
    }
    return { label: 'Cấp 2', icon: '2️⃣', core:true };
  }

  function roleLabel(role) {
    var meta = roleMeta(role);
    return meta.icon + ' ' + meta.label;
  }

  function getAllRoleKeys() {
    var coreOrder = ['admin','level1','level2','guest'];
    var custom = Object.keys(ROLES).filter(function(k){ return coreOrder.indexOf(k) === -1 && k !== 'workspace'; });
    custom.sort(function(a,b){ return safe(roleMeta(a).label).localeCompare(safe(roleMeta(b).label), 'vi'); });
    return coreOrder.concat(custom);
  }

  function isCustomRole(role) {
    var r = roleKey(role);
    return r.indexOf('custom_') === 0 && !!(ROLES[r] || CUSTOM_ROLE_DEFS[r]);
  }

  function normalizePermissionValue(v) {
    if (v === true) return 'edit';
    if (v === false || v === null || v === undefined || v === '') return 'none';
    v = safe(v).toLowerCase();
    if (v === 'access' || v === 'read' || v === 'readonly' || v === 'xem') return 'view';
    if (v === 'write' || v === 'full' || v === 'modify' || v === 'sua' || v === 'edit') return 'edit';
    if (v === 'hide' || v === 'off' || v === 'false' || v === 'none') return 'none';
    return ['none','view','edit'].indexOf(v) !== -1 ? v : 'none';
  }

  function copy(obj) { return JSON.parse(JSON.stringify(obj || {})); }

  function fixedGuestPermissions() {
    return {
      ads:'view', roas:'view', ecom:'view', price:'view', compose:'view', admin:'none'
    };
  }

  function blankNonAdminPermissions() {
    return { ads:'none', roas:'none', ecom:'none', price:'none', compose:'none', admin:'none' };
  }

  function clampGuestPermissions(perms) {
    var defaults = fixedGuestPermissions();
    var out = copy(perms || defaults);
    Object.keys(defaults).forEach(function(key){
      if (key === 'admin') {
        out[key] = 'none';
        return;
      }
      var value = normalizePermissionValue(out[key]);
      // Khách luôn an toàn: Admin được chọn Ẩn hoặc Chỉ xem, không cấp quyền ghi.
      out[key] = value === 'none' ? 'none' : 'view';
    });
    return out;
  }

  function rebuildRoleRegistry(data) {
    data = data || {};
    CUSTOM_ROLE_DEFS = {};
    Object.keys(ROLES).forEach(function(k){ delete ROLES[k]; });
    Object.keys(CORE_ROLES).forEach(function(k){ ROLES[k] = copy(CORE_ROLES[k]); });

    Object.keys(data).forEach(function(key){
      var role = safe(key).toLowerCase().trim();
      var item = data[key] || {};
      if (role.indexOf('custom_') !== 0) return;
      var name = safe(item.name || item.label).trim();
      if (!name) return;
      var perms = copy(item.permissions || blankNonAdminPermissions());
      Object.keys(blankNonAdminPermissions()).forEach(function(m){ perms[m] = normalizePermissionValue(perms[m]); });
      perms.admin = 'none';
      CUSTOM_ROLE_DEFS[role] = {
        name: name,
        icon: safe(item.icon || '🧩'),
        permissions: perms,
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || ''
      };
      ROLES[role] = { label:name, icon:CUSTOM_ROLE_DEFS[role].icon, custom:true };
    });
    window.MKT_CUSTOM_ROLE_DEFS = copy(CUSTOM_ROLE_DEFS);
  }

  function mergeRoleDefaults(data) {
    data = data || {};
    var base = copy(DEFAULT_ROLE_PERMISSIONS);
    var modules = Object.keys(DEFAULT_ROLE_PERMISSIONS.admin);

    Object.keys(CUSTOM_ROLE_DEFS).forEach(function(role){
      base[role] = copy(CUSTOM_ROLE_DEFS[role].permissions || blankNonAdminPermissions());
      base[role].admin = 'none';
    });

    getAllRoleKeys().forEach(function(role){
      var saved = data[role] || {};
      if (!base[role]) base[role] = blankNonAdminPermissions();
      modules.forEach(function(moduleKey){
        if (role === 'admin') {
          base[role][moduleKey] = 'edit';
        } else if (role === 'guest') {
          if (moduleKey === 'admin') base[role][moduleKey] = 'none';
          else if (Object.prototype.hasOwnProperty.call(saved, moduleKey)) base[role][moduleKey] = normalizePermissionValue(saved[moduleKey]);
          else base[role][moduleKey] = normalizePermissionValue(base[role][moduleKey]);
        } else if (Object.prototype.hasOwnProperty.call(saved, moduleKey)) {
          base[role][moduleKey] = normalizePermissionValue(saved[moduleKey]);
        } else {
          base[role][moduleKey] = normalizePermissionValue(base[role][moduleKey]);
        }
      });
      if (role === 'guest') base[role] = clampGuestPermissions(base[role]);
      if (role !== 'admin') base[role].admin = 'none';
    });
    return base;
  }

  function getRoleDefaultsSource() {
    return ACTIVE_ROLE_PERMISSIONS || mergeRoleDefaults({});
  }

  function defaultPermissionsForRole(role) {
    var r = roleKey(role);
    var source = getRoleDefaultsSource();
    if (source[r]) return copy(source[r]);
    if (CUSTOM_ROLE_DEFS[r] && CUSTOM_ROLE_DEFS[r].permissions) return copy(CUSTOM_ROLE_DEFS[r].permissions);
    return copy(source.level2 || DEFAULT_ROLE_PERMISSIONS.level2);
  }

  function loadCustomRoles() {
    if (!window.sysDb || window.__MKT_RBAC_CUSTOM_ROLES_BOUND) {
      rebuildRoleRegistry(CUSTOM_ROLE_DEFS || {});
      ACTIVE_ROLE_PERMISSIONS = mergeRoleDefaults(ACTIVE_ROLE_PERMISSIONS || {});
      return;
    }
    window.__MKT_RBAC_CUSTOM_ROLES_BOUND = true;
    try {
      CUSTOM_ROLE_REF = window.sysDb.ref(CUSTOM_ROLES_PATH);
      CUSTOM_ROLE_REF.on('value', function(snap){
        rebuildRoleRegistry(snap.val() || {});
        ACTIVE_ROLE_PERMISSIONS = mergeRoleDefaults(ACTIVE_ROLE_PERMISSIONS || {});
        window.MKT_ROLE_DEFAULTS = copy(ACTIVE_ROLE_PERMISSIONS);
        applyCurrentPermissions();
        if (isAdminUser() && $('page-admin')) renderAdminPermissionUI();
      });
    } catch(e) {
      console.warn('Không tải được phân quyền mặc định tùy chỉnh:', e);
      rebuildRoleRegistry({});
    }
  }

  function loadRoleDefaults() {
    if (!window.sysDb || window.__MKT_RBAC_ROLE_DEFAULTS_BOUND) {
      ACTIVE_ROLE_PERMISSIONS = mergeRoleDefaults(ACTIVE_ROLE_PERMISSIONS || {});
      return;
    }
    window.__MKT_RBAC_ROLE_DEFAULTS_BOUND = true;
    try {
      window.sysDb.ref(ROLE_DEFAULTS_PATH).on('value', function (snap) {
        ACTIVE_ROLE_PERMISSIONS = mergeRoleDefaults(snap.val() || {});
        window.MKT_ROLE_DEFAULTS = copy(ACTIVE_ROLE_PERMISSIONS);
        applyCurrentPermissions();
        if (isAdminUser() && $('rbac-role-default-rows')) renderRoleDefaultRows();
      });
    } catch (e) {
      console.warn('Không tải được quyền mặc định theo phân quyền:', e);
      ACTIVE_ROLE_PERMISSIONS = mergeRoleDefaults({});
    }
  }


  function getCurrentUid() {
    try {
      return (window.sysAuth && window.sysAuth.currentUser && window.sysAuth.currentUser.uid) ? window.sysAuth.currentUser.uid : '';
    } catch(e) { return ''; }
  }

  function unbindAdminUidFlag() {
    try {
      if (ADMIN_UID_REF && typeof ADMIN_UID_REF.off === 'function') ADMIN_UID_REF.off();
    } catch(e) {}
    ADMIN_UID_REF = null;
    ADMIN_UID_BOUND_UID = '';
    ADMIN_UID_FLAG = false;
  }

  function setBootGate(locked, reason) {
    try {
      if (!document.body) return;
      document.body.classList.toggle(BOOT_GATE_CLASS, !!locked);
      document.body.setAttribute('data-rbac-session-state', locked ? ('pending-' + (reason || 'auth')) : 'ready');
    } catch(e) {}
  }

  function usersConfigLoaded() {
    return !!(window.SYS_DB_USERS && typeof window.SYS_DB_USERS === 'object');
  }

  function forceHideProtectedMenus(reason) {
    if (reason) setBootGate(true, reason);
    Object.keys(MODULES).forEach(function(key){
      if (key === 'home') return;
      var mod = MODULES[key];
      if (mod.navSelector) hideBySelector(mod.navSelector, false);
      if (mod.page) hideGoPageButtons(mod.page, false);
    });
    showSelector('.nav-dropdown[data-group="ads"], .nav-link[data-group="ads"]', false);
    showSelector('.dropdown-section-ads, .dropdown-title[data-rbac-module="ads-menu"], .dropdown-title.rbac-ads-title, .dropdown-item[data-page="ads"], .dropdown-item[data-page="roas-stats"]', false);
    showSelector('.nav-dropdown[data-group="ecom"], .nav-link[data-group="ecom"]', false);
    showSelector('.dropdown-item[data-page="shopee"], .dropdown-item[data-page="tiktok"], .dropdown-item[data-page="price-setting"]', false);
    showSelector('.nav-link[data-page="compose"], [data-rbac-module="compose"]', false);
    var adminTools = $('admin-tools');
    if (adminTools) adminTools.style.display = 'none';
    var legacyAdminNav = $('admin-nav-link');
    if (legacyAdminNav) legacyAdminNav.style.setProperty('display', 'none', 'important');
    ['account-admin-menu-item','account-admin-menu-item-mobile'].forEach(function(id){
      var el = $(id);
      if (el) el.style.display = 'none';
    });
    window.MKT_CURRENT_ROLE = 'guest';
    window.MKT_PERMISSIONS = defaultPermissionsForRole('guest');
    window.USER_PERMISSIONS = window.MKT_PERMISSIONS;
  }

  function bindAdminUidFlag(force) {
    if (!window.sysDb || !window.sysAuth || !window.sysAuth.currentUser) {
      unbindAdminUidFlag();
      return;
    }
    try {
      var uid = window.sysAuth.currentUser.uid;
      if (!force && ADMIN_UID_BOUND_UID === uid && ADMIN_UID_REF) return;

      // Quan trọng: khi logout/login tài khoản khác, phải bỏ listener UID cũ.
      unbindAdminUidFlag();
      ADMIN_UID_BOUND_UID = uid;
      ADMIN_UID_REF = window.sysDb.ref('system_settings/admin_uids/' + uid);
      ADMIN_UID_REF.on('value', function(snap){
        ADMIN_UID_FLAG = snap.val() === true;
        applyCurrentPermissions({ skipSessionSync: true });
        if (ADMIN_UID_FLAG && $('page-admin')) renderAdminPermissionUI();
      });
    } catch(e) {
      console.warn('Không đọc được admin_uids:', e);
      unbindAdminUidFlag();
    }
  }

  function syncAuthSessionState() {
    var uid = getCurrentUid();
    if (uid === LAST_AUTH_UID && (!uid || ADMIN_UID_BOUND_UID === uid || ADMIN_UID_REF)) return false;
    LAST_AUTH_UID = uid;
    LAST_UID_MAP_SIGNATURE = '';
    UID_MAP_READY_SIGNATURE = '';
    UID_MAP_PENDING_SIGNATURE = '';
    UID_MAP_LAST_ERROR = '';

    // Đổi phiên đăng nhập: khóa và xóa quyền cũ ngay, tránh user mới nhìn thấy menu của user trước.
    setBootGate(true, uid ? 'switch-user' : 'logout');
    unbindAdminUidFlag();
    forceHideProtectedMenus();
    if (uid) bindAdminUidFlag(true);
    return true;
  }

  function patchAuthLogout() {
    if (!window.authLogout || window.authLogout.__rbacWrapped) return;
    var oldLogout = window.authLogout;
    var fn = function(){
      setBootGate(true, 'logout');
      forceHideProtectedMenus();
      unbindAdminUidFlag();
      LAST_AUTH_UID = '';
      LAST_UID_MAP_SIGNATURE = '';
      UID_MAP_READY_SIGNATURE = '';
      UID_MAP_PENDING_SIGNATURE = '';
      UID_MAP_LAST_ERROR = '';
      return oldLogout.apply(this, arguments);
    };
    fn.__rbacWrapped = true;
    window.authLogout = fn;
  }

  function featuresToPermissions(features, role) {
    var out = defaultPermissionsForRole(role);
    if (!features) return out;
    ACTIVE_PERMISSION_MODULES.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(features, key)) {
        out[key] = features[key] ? 'edit' : 'none';
      }
    });
    // Tương thích dữ liệu cũ chưa tách ROAS khỏi Ads.
    if (Object.prototype.hasOwnProperty.call(features, 'ads') && !Object.prototype.hasOwnProperty.call(features, 'roas')) {
      out.roas = features.ads ? (out.roas === 'none' ? 'view' : out.roas) : 'none';
    }
    // Tương thích dữ liệu cũ dùng ecom chung cho đối soát + thiết lập giá.
    if (Object.prototype.hasOwnProperty.call(features, 'ecom')) {
      out.ecom = features.ecom ? (out.ecom === 'none' ? 'view' : out.ecom) : 'none';
      if (!Object.prototype.hasOwnProperty.call(features, 'price')) out.price = features.ecom ? (out.price === 'none' ? 'view' : out.price) : 'none';
    }
    return out;
  }

  function permissionsToFeatures(perms) {
    var p = perms || {};
    return {
      ads: p.ads !== 'none',
      roas: p.roas !== 'none',
      ecom: p.ecom !== 'none',
      price: p.price !== 'none',
      compose: p.compose !== 'none'
    };
  }

  function normalizePermissions(perms, role, features) {
    var r = roleKey(role);
    var base = perms ? defaultPermissionsForRole(r) : featuresToPermissions(features, r);
    if (perms) {
      Object.keys(base).forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(perms, k)) base[k] = normalizePermissionValue(perms[k]);
      });
    }
    if (r === 'admin') return defaultPermissionsForRole('admin');
    if (r === 'guest') return clampGuestPermissions(base);
    base.admin = 'none';
    return base;
  }

  function normalizeUser(u) {
    u = Object.assign({}, u || {});
    u.role = roleKey(u.role || (u.isGuest ? 'guest' : 'level2'));
    u.permissions = normalizePermissions(u.permissions, u.role, u.features);
    u.features = permissionsToFeatures(u.permissions);
    if (u.role === 'admin') {
      u.permissions = defaultPermissionsForRole('admin');
      u.features = permissionsToFeatures(u.permissions);
    }
    return u;
  }

  function normalizeUsers(data) {
    data = data || {};
    var out = {};
    Object.keys(data).forEach(function (k) { out[k] = normalizeUser(data[k]); });
    return out;
  }

  function getCurrentEmail() {
    try {
      if (window.sysAuth && window.sysAuth.currentUser && window.sysAuth.currentUser.email) {
        return window.sysAuth.currentUser.email.toLowerCase();
      }
    } catch(e) {}
    return '';
  }

  function findUserByEmail(email) {
    email = safe(email).toLowerCase();
    var users = window.SYS_DB_USERS || {};
    for (var k in users) {
      if (!Object.prototype.hasOwnProperty.call(users, k)) continue;
      var u = users[k] || {};
      if (safe(u.email).toLowerCase() === email) return { key:k, user:normalizeUser(u) };
    }
    return null;
  }

  function findUserByIdentity() {
    var email = getCurrentEmail();
    var found = email ? findUserByEmail(email) : null;
    if (found) return found;

    /*
     * V20.2 SECURITY:
     * User Google/Firebase có email nhưng email đó chưa tồn tại trong
     * system_settings/users thì PHẢI là guest/unregistered.
     * Không được fallback theo displayName vì có thể trùng tên một nhân sự khác.
     */
    if (email) return null;

    // Chỉ giữ fallback tên cho phiên legacy/anonymous không có email.
    var name = safe(window.myIdentity);
    var users = window.SYS_DB_USERS || {};
    for (var k in users) {
      if (!Object.prototype.hasOwnProperty.call(users, k)) continue;
      var u = users[k] || {};
      if (safe(u.name) === name) return { key:k, user:normalizeUser(u) };
    }
    if (name.indexOf('Khách') !== -1) return { key:'guest', user:{ email:'guest@system.local', name:name, role:'guest', permissions: defaultPermissionsForRole('guest') } };
    return null;
  }

  function ensureUidUserMap(found) {
    try {
      if (!found || !found.user || !found.key || found.key === 'guest') return true;
      if (!window.sysDb || !window.sysAuth || !window.sysAuth.currentUser) return false;
      var authUser = window.sysAuth.currentUser;
      if (authUser.isAnonymous || !authUser.uid || !authUser.email) return true;

      var profileEmail = safe(found.user.email).toLowerCase();
      var authEmail = safe(authUser.email).toLowerCase();
      if (!profileEmail || profileEmail !== authEmail) {
        UID_MAP_LAST_ERROR = 'Email Firebase Authentication không trùng hồ sơ phân quyền.';
        return false;
      }

      var signature = authUser.uid + '|' + found.key;
      if (UID_MAP_READY_SIGNATURE === signature) return true;
      if (UID_MAP_PENDING_SIGNATURE === signature) return false;

      LAST_UID_MAP_SIGNATURE = signature;
      UID_MAP_PENDING_SIGNATURE = signature;
      UID_MAP_LAST_ERROR = '';

      var ref = window.sysDb.ref(UID_USER_MAP_PATH + '/' + authUser.uid);
      ref.once('value').then(function(snap){
        var currentKey = safe(snap && snap.val && snap.val());
        if (currentKey === found.key) return true;
        if (currentKey && currentKey !== found.key) {
          throw new Error('UID đang liên kết với hồ sơ khác: ' + currentKey);
        }
        return ref.set(found.key);
      }).then(function(){
        UID_MAP_READY_SIGNATURE = signature;
        UID_MAP_PENDING_SIGNATURE = '';
        UID_MAP_LAST_ERROR = '';
        setTimeout(function(){ applyCurrentPermissions({ skipSessionSync:true }); }, 0);
      }).catch(function(error){
        UID_MAP_PENDING_SIGNATURE = '';
        UID_MAP_READY_SIGNATURE = '';
        LAST_UID_MAP_SIGNATURE = '';
        UID_MAP_LAST_ERROR = safe(error && error.message) || 'Không đồng bộ được UID với hồ sơ phân quyền.';
        console.warn('Không đồng bộ được UID với hồ sơ phân quyền:', error);
        setBootGate(false, 'uid-map-error');
        toast('Không đồng bộ được UID phân quyền với Firebase. Hãy đăng xuất rồi đăng nhập lại hoặc cập nhật user trong Quản trị hệ thống.');
      });
      return false;
    } catch (e) {
      UID_MAP_PENDING_SIGNATURE = '';
      UID_MAP_READY_SIGNATURE = '';
      LAST_UID_MAP_SIGNATURE = '';
      UID_MAP_LAST_ERROR = safe(e && e.message);
      console.warn('Lỗi đồng bộ UID người dùng:', e);
      return false;
    }
  }

  function isAdminUser(user) {
    user = user || (findUserByIdentity() || {}).user;
    return !!(ADMIN_UID_FLAG || (user && roleKey(user.role) === 'admin') || window.myIdentity === 'SUPER_ADMIN');
  }

  function getCurrentPermissions() {
    var found = findUserByIdentity();
    if (!found || !found.user) {
      // V20.6: Workspace chưa được thêm RBAC vẫn có quyền mặc định xem FB Ads.
      // Hồ sơ do Admin tạo/chỉnh sẽ tự động ghi đè ngay khi findUserByIdentity() tìm thấy.
      if (isWorkspaceDomainAuthSessionV206()) return workspaceDefaultPermissionsV206();
      return defaultPermissionsForRole('guest');
    }
    var u = normalizeUser(found.user);
    if (isAdminUser(u)) return defaultPermissionsForRole('admin');
    return u.permissions || defaultPermissionsForRole(u.role);
  }

  function getModuleFromPage(page) {
    return PAGE_TO_MODULE[page] || page || 'home';
  }

  function permissionFor(moduleKey) {
    if (moduleKey === 'home') return 'edit';
    var perms = getCurrentPermissions();
    if (isAdminUser()) return 'edit';

    if (moduleKey === 'roas') {
      return normalizePermissionValue(perms.roas || perms.roas_stats || perms['roas-stats'] || perms.roasStats);
    }

    // V9: chấp nhận nhiều key cũ/mới cho nhóm Đối soát đơn hàng.
    // Một số dữ liệu Firebase/role cũ có thể lưu ecom, reconcile, order_reconcile, shopee hoặc tiktok.
    if (moduleKey === 'ecom') {
      var keys = ['ecom', 'reconcile', 'order_reconcile', 'orderReconcile', 'reconcile_orders', 'orders', 'order', 'shopee', 'tiktok', 'shopee_reconcile', 'tiktok_reconcile', 'shop_reconcile'];
      var hasView = false;
      for (var i = 0; i < keys.length; i++) {
        var val = normalizePermissionValue(perms[keys[i]]);
        if (val === 'edit') return 'edit';
        if (val === 'view') hasView = true;
      }
      return hasView ? 'view' : 'none';
    }

    if (moduleKey === 'price') {
      return normalizePermissionValue(perms.price || perms.price_setting || perms.setting_price);
    }

    if (moduleKey === 'compose') {
      return normalizePermissionValue(perms.compose || perms.order_compose || perms.order);
    }

    return normalizePermissionValue(perms[moduleKey]);
  }

  function canAccess(moduleKey) { return permissionFor(moduleKey) !== 'none'; }
  function canEdit(moduleKey) { return permissionFor(moduleKey) === 'edit'; }

  function preferredDisplay(el) {
    if (!el) return '';
    var old = el.dataset.rbacDisplay;
    // Nếu lần đầu RBAC nhìn thấy phần tử đã bị legacy code set display:none,
    // không được lưu 'none' làm trạng thái gốc, nếu không Admin cũng không mở lại được.
    if (!old || old === 'none') {
      if (el.classList && (el.classList.contains('nav-link') || el.classList.contains('nav-dropdown'))) return 'flex';
      if (el.classList && el.classList.contains('dropdown-item')) return 'block';
      if (el.id === 'admin-tools') return 'block';
      return '';
    }
    return old;
  }

  function setDisplay(nodes, visible) {
    Array.prototype.forEach.call(nodes || [], function (el) {
      if (!el) return;
      if (!el.dataset.rbacDisplay || el.dataset.rbacDisplay === 'none') {
        el.dataset.rbacDisplay = (el.style.display && el.style.display !== 'none') ? el.style.display : '';
      }
      el.style.display = visible ? preferredDisplay(el) : 'none';
      if (visible) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', 'true');
    });
  }

  function hideBySelector(selector, visible) {
    if (!selector) return;
    setDisplay(document.querySelectorAll(selector), visible);
  }

  function hideGoPageButtons(page, visible) {
    var selectors = [
      '[onclick*="goPage(&quot;' + page + '&quot;)"]',
      '[onclick*="goPage(\'' + page + '\')"]',
      '[onclick*="goPage(\\\"' + page + '\\\")"]',
      '[onclick*="goPage(\"' + page + '\")"]'
    ];
    selectors.forEach(function(sel){ try { hideBySelector(sel, visible); } catch(e){} });
  }

  function showSelector(selector, visible) {
    try { hideBySelector(selector, !!visible); } catch(e) {}
  }
  function forceVisibleSelector(selector, visible, displayValue) {
    try {
      Array.prototype.forEach.call(document.querySelectorAll(selector), function(el){
        if (!el) return;
        if (visible) {
          el.style.setProperty('display', displayValue || preferredDisplay(el) || 'block', 'important');
          el.removeAttribute('aria-hidden');
        } else {
          el.style.setProperty('display', 'none', 'important');
          el.setAttribute('aria-hidden', 'true');
        }
      });
    } catch(e) {}
  }

  function syncAdsMenuVisibility(adsAllowed, roasAllowed) {
    var parentVisible = !!(adsAllowed || roasAllowed);
    forceVisibleSelector('.nav-dropdown[data-group="ads"]', parentVisible, 'flex');
    forceVisibleSelector('.nav-link[data-group="ads"], .nav-dropdown-trigger[data-group="ads"]', parentVisible, 'flex');
    forceVisibleSelector('.dropdown-section-ads, .dropdown-title[data-rbac-module="ads-menu"], .dropdown-title.rbac-ads-title', parentVisible, 'block');
    forceVisibleSelector('.dropdown-item[data-page="ads"], [data-rbac-page="ads"]', !!adsAllowed, 'flex');
    forceVisibleSelector('.dropdown-item[data-page="roas-stats"], [data-rbac-page="roas-stats"]', !!roasAllowed, 'flex');
  }

  function syncReconcileMenuVisibility(ecomAllowed, priceAllowed) {
    var parentVisible = !!(ecomAllowed || priceAllowed);
    forceVisibleSelector('.nav-dropdown[data-group="ecom"]', parentVisible, 'flex');
    forceVisibleSelector('.nav-link[data-group="ecom"], .nav-dropdown-trigger[data-group="ecom"]', parentVisible, 'flex');
    forceVisibleSelector('.dropdown-section-reconcile, .dropdown-title[data-rbac-module="ecom"], .dropdown-title.rbac-ecom-title', !!ecomAllowed, 'block');
    forceVisibleSelector('.dropdown-item[data-page="shopee"], .dropdown-item[data-page="tiktok"], [data-rbac-page="shopee"], [data-rbac-page="tiktok"]', !!ecomAllowed, 'flex');
    forceVisibleSelector('.dropdown-section-price, .dropdown-title[data-rbac-module="price"], .dropdown-title.rbac-price-title', !!priceAllowed, 'block');
    forceVisibleSelector('.dropdown-item[data-page="price-setting"], [data-rbac-page="price-setting"]', !!priceAllowed, 'flex');
    forceVisibleSelector('.dropdown-divider', !!(ecomAllowed && priceAllowed), 'block');
  }

  function closeAccountMenus() {
    var host = document.querySelector('.user-profile-mini.rbac-account-host');
    if (host) host.classList.remove('rbac-account-open');
    var mobileFooter = document.querySelector('.mobile-nav-footer');
    if (mobileFooter) mobileFooter.classList.remove('rbac-mobile-account-open');
  }

  function ensureAccountMenus() {
    var legacyAdminNav = $('admin-nav-link');
    if (legacyAdminNav) legacyAdminNav.style.setProperty('display', 'none', 'important');

    var host = document.querySelector('.user-profile-mini');
    if (host) {
      var staleCaret = host.querySelector('.rbac-account-caret');
      if (staleCaret && staleCaret.parentNode) staleCaret.parentNode.removeChild(staleCaret);
    }
    if (host && !$('rbac-account-dropdown')) {
      host.classList.add('rbac-account-host');
      host.setAttribute('title', 'Bấm avatar hoặc tên để mở menu tài khoản');

      var menu = document.createElement('div');
      menu.id = 'rbac-account-dropdown';
      menu.className = 'rbac-account-dropdown';
      menu.innerHTML =
        '<div class="rbac-account-summary"><strong id="rbac-account-menu-name">Tài khoản</strong><small id="rbac-account-menu-role">Đang xác thực</small></div>' +
        '<button id="account-admin-menu-item" class="rbac-account-action" type="button" style="display:none">⚙️ Quản trị hệ thống</button>';
      host.appendChild(menu);

      host.addEventListener('click', function(ev){
        if (ev.target && ev.target.closest && ev.target.closest('.logout-mini')) return;
        if (ev.target && ev.target.closest && ev.target.closest('.rbac-account-dropdown')) return;
        var trigger = ev.target && ev.target.closest ? ev.target.closest('#user-avatar, #header-user-display') : null;
        if (!trigger) return;
        ev.preventDefault();
        ev.stopPropagation();
        host.classList.toggle('rbac-account-open');
      });
      var adminBtn = $('account-admin-menu-item');
      if (adminBtn) adminBtn.addEventListener('click', function(ev){
        ev.stopPropagation(); closeAccountMenus();
        if (window.goPage) window.goPage('admin');
      });
    }

    var mobileFooter = document.querySelector('.mobile-nav-footer');
    var mobileUser = document.querySelector('.mobile-nav-user');
    if (mobileFooter && mobileUser && !$('rbac-mobile-account-menu')) {
      mobileUser.classList.add('rbac-mobile-account-toggle');
      var mobileMenu = document.createElement('div');
      mobileMenu.id = 'rbac-mobile-account-menu';
      mobileMenu.className = 'rbac-mobile-account-menu';
      mobileMenu.innerHTML =
        '<button id="account-admin-menu-item-mobile" class="rbac-account-action" type="button" style="display:none">⚙️ Quản trị hệ thống</button>';
      mobileFooter.appendChild(mobileMenu);
      var oldMobileLogout = mobileFooter.querySelector('.mobile-nav-logout');
      if (oldMobileLogout) oldMobileLogout.style.removeProperty('display');

      mobileUser.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        mobileFooter.classList.toggle('rbac-mobile-account-open');
      });
      var adminMobileBtn = $('account-admin-menu-item-mobile');
      if (adminMobileBtn) adminMobileBtn.addEventListener('click', function(ev){
        ev.stopPropagation(); closeAccountMenus();
        if (window.closeMobileAppMenu) window.closeMobileAppMenu();
        if (window.goPage) window.goPage('admin');
      });
    }

    if (!window.__MKT_RBAC_ACCOUNT_OUTSIDE_BOUND) {
      window.__MKT_RBAC_ACCOUNT_OUTSIDE_BOUND = true;
      document.addEventListener('click', function(ev){
        var desktop = document.querySelector('.user-profile-mini.rbac-account-host');
        var mobile = document.querySelector('.mobile-nav-footer');
        var insideDesktop = desktop && desktop.contains(ev.target);
        var insideMobile = mobile && mobile.contains(ev.target);
        if (!insideDesktop && !insideMobile) closeAccountMenus();
      });
      document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') closeAccountMenus(); });
    }
  }

  function syncAccountMenuState(role) {
    ensureAccountMenus();
    var admin = isAdminUser();
    ['account-admin-menu-item','account-admin-menu-item-mobile'].forEach(function(id){
      var el = $(id);
      if (el) el.style.display = admin ? 'block' : 'none';
    });
    var name = safe(window.myIdentity || (($('header-user-display') || {}).textContent) || 'Tài khoản');
    var nameEl = $('rbac-account-menu-name');
    if (nameEl) nameEl.textContent = name;
    var roleEl = $('rbac-account-menu-role');
    if (roleEl) roleEl.textContent = roleMeta(role || window.MKT_CURRENT_ROLE || 'guest').label;
  }

  function applyMenuPermissions() {
    var adsAllowed = canAccess('ads');
    var roasAllowed = canAccess('roas');
    var adsGroupVisible = adsAllowed || roasAllowed;
    var ecomAllowed = canAccess('ecom');
    var priceAllowed = canAccess('price');
    var ecomGroupVisible = ecomAllowed || priceAllowed;

    Object.keys(MODULES).forEach(function (key) {
      var mod = MODULES[key];
      if (mod.alwaysVisible) return;

      var visible = canAccess(key);
      if (key === 'ads') visible = adsAllowed;
      if (key === 'roas') visible = roasAllowed;
      if (key === 'ecom') visible = ecomGroupVisible;
      if (key === 'price') visible = priceAllowed;
      if (key === 'compose') visible = canAccess('compose');

      if (mod.navSelector) hideBySelector(mod.navSelector, visible);
      if (mod.page) hideGoPageButtons(mod.page, visible);
    });

    // Nhóm Quảng cáo: cha dropdown chỉ hiển thị/mở menu, không điều hướng; con hiện theo quyền riêng.
    showSelector('.nav-dropdown[data-group="ads"], .nav-link[data-group="ads"]', adsGroupVisible);
    showSelector('.dropdown-section-ads, .dropdown-title[data-rbac-module="ads-menu"], .dropdown-title.rbac-ads-title', adsGroupVisible);
    showSelector('.dropdown-item[data-page="ads"], [data-rbac-page="ads"]', adsAllowed);
    showSelector('.dropdown-item[data-page="roas-stats"], [data-rbac-page="roas-stats"]', roasAllowed);

    // Nhóm TMĐT: cha dropdown hiện nếu có quyền Đối soát đơn hàng hoặc Thiết lập giá.
    showSelector('.nav-dropdown[data-group="ecom"], .nav-link[data-group="ecom"]', ecomGroupVisible);

    // Tách quyền con: Shopee/TikTok theo ecom, Thiết lập giá theo price.
    showSelector('.dropdown-item[data-page="shopee"], [onclick*="goPage(&quot;shopee&quot;)"], [onclick*="goPage(\"shopee\")"]', ecomAllowed);
    showSelector('.dropdown-item[data-page="tiktok"], [onclick*="goPage(&quot;tiktok&quot;)"], [onclick*="goPage(\"tiktok\")"]', ecomAllowed);
    showSelector('.dropdown-item[data-page="price-setting"], [data-rbac-page="price-setting"], [onclick*="goPage(&quot;price-setting&quot;)"], [onclick*="goPage(\"price-setting\")"]', priceAllowed);
    showSelector('.nav-link[data-page="compose"], [data-rbac-module="compose"], [onclick*="goPage(&quot;compose&quot;)"], [onclick*="goPage(\"compose\")"]', canAccess('compose'));

    // Nếu chỉ có quyền Thiết lập giá, bấm nút cha TMĐT sẽ đi thẳng vào Thiết lập giá.
    var ecomParent = document.querySelector('.nav-dropdown > .nav-link[data-page="ecom-main"]');
    if (ecomParent) {
      if (!ecomParent.dataset.rbacOriginalOnclick) ecomParent.dataset.rbacOriginalOnclick = ecomParent.getAttribute('onclick') || '';
      ecomParent.style.display = ecomGroupVisible ? 'flex' : 'none';
      if (!ecomAllowed && priceAllowed) ecomParent.setAttribute('onclick', 'window.goPage("price-setting")');
      else if (ecomParent.dataset.rbacOriginalOnclick) ecomParent.setAttribute('onclick', ecomParent.dataset.rbacOriginalOnclick);
    }

    // V9: hiện/ẩn tiêu đề dropdown theo module, không phụ thuộc duy nhất vào text.
    showSelector('.dropdown-title[data-rbac-module="ecom"], .dropdown-title.rbac-ecom-title', ecomAllowed);
    showSelector('.dropdown-title[data-rbac-module="price"], .dropdown-title.rbac-price-title', priceAllowed);

    Array.prototype.forEach.call(document.querySelectorAll('.dropdown-title'), function(t){
      var text = safe(t.innerText).toLowerCase();
      var mod = safe(t.getAttribute('data-rbac-module')).toLowerCase();
      if (mod === 'ecom' || text.indexOf('đối soát') !== -1) t.style.display = ecomAllowed ? 'block' : 'none';
      if (mod === 'price' || text.indexOf('thiết lập') !== -1) t.style.display = priceAllowed ? 'block' : 'none';
    });

    Array.prototype.forEach.call(document.querySelectorAll('.dropdown-divider'), function(d){ d.style.display = (ecomAllowed && priceAllowed) ? 'block' : 'none'; });

    // V14: ép lại lần cuối bằng !important để legacy code không làm mất dropdown Quảng cáo.
    syncAdsMenuVisibility(adsAllowed, roasAllowed);

    // V10: ép lại lần cuối bằng !important để legacy code không làm mất Shopee/TikTok.
    syncReconcileMenuVisibility(ecomAllowed, priceAllowed);

    // V20: Quản trị không còn nằm trên menu chính/sidebar. Chỉ xuất hiện trong menu tài khoản.
    var adminTools = $('admin-tools');
    if (adminTools) adminTools.style.setProperty('display', 'none', 'important');
    var legacyAdminNav = $('admin-nav-link');
    if (legacyAdminNav) legacyAdminNav.style.setProperty('display', 'none', 'important');
    syncAccountMenuState(window.MKT_CURRENT_ROLE || 'guest');
    if (window.MKTRouter && typeof window.MKTRouter.onPermissionsReady === 'function') {
      setTimeout(function(){ window.MKTRouter.onPermissionsReady(); }, 0);
    }
  }

  function pageKeyFromElement(el) {
    if (!el || !el.id || el.id.indexOf('page-') !== 0) return '';
    return el.id.replace('page-', '');
  }

  function isGuestReadOnlySession() {
    try {
      var current = window.sysAuth && window.sysAuth.currentUser;
      if (!current) return false;
      if (current.isAnonymous) return true;
      var found = findUserByIdentity();
      if (found && found.user) return roleKey(found.user.role) === 'guest';
      // Workspace chưa cấu hình được xem Ads nhưng chưa có quyền ghi nghiệp vụ.
      if (isWorkspaceDomainAuthSessionV206()) return true;
      return usersConfigLoaded() && !isAdminUser();
    } catch(e) {
      return false;
    }
  }

  function getElementModule(el) {
    try {
      var pageEl = el && el.closest ? el.closest('.page') : null;
      if (pageEl && pageEl.id && pageEl.id.indexOf('page-') === 0) {
        return getModuleFromPage(pageEl.id.replace('page-', ''));
      }
    } catch(e) {}
    return getModuleFromPage((location.hash || '').replace('#', '') || 'home');
  }

  /**
   * Nút tải lại Meta Live là thao tác đồng bộ dữ liệu hệ thống,
   * không phải thao tác chỉnh sửa dữ liệu nghiệp vụ của người dùng.
   */
  function isMetaLiveSystemControl(el) {
    if (!el) return false;

    var id = safe(el.id).toLowerCase();
    var className = safe(el.className).toLowerCase();
    var handler = safe(
      el.getAttribute && el.getAttribute('onclick')
    ).toLowerCase();

    return (
      id === 'meta-live-refresh-btn' ||
      className.indexOf('meta-live-refresh-btn') !== -1 ||
      handler.indexOf('refreshmetaadslive') !== -1
    );
  }

  function isWriteActionElement(el) {
    if (!el) return false;

    // Khách/view vẫn được bấm cập nhật Meta Live.
    // Firebase transaction sẽ bảo đảm chỉ một máy thực sự gọi Meta.
    if (isMetaLiveSystemControl(el)) return false;
    var tag = safe(el.tagName).toLowerCase();
    var type = safe(el.getAttribute && el.getAttribute('type')).toLowerCase();
    if (tag === 'input' && type === 'file') return true;
    if (tag === 'form') return true;

    var text = safe(el.innerText || el.value).toLowerCase();
    var idClass = (safe(el.id) + ' ' + safe(el.className)).toLowerCase();
    var handler = [
      safe(el.getAttribute && el.getAttribute('onclick')),
      safe(el.getAttribute && el.getAttribute('onchange')),
      safe(el.getAttribute && el.getAttribute('onsubmit'))
    ].join(' ').toLowerCase();

    var writeText = /(^|\s)(lưu|xóa|xoá|thêm|upload|import|tải lên|nhập file|cập nhật|ghi dữ liệu|giao deadline|áp dụng cấu hình|đồng bộ lên)(\s|$|:)/i;
    var writeCode = /(save|delete|remove|upload|import|addrow|addassign|addlp|update|create|submit|write|setconfig|applyconfig|handle.*file|trigger.*upload)/i;
    var writeClass = /(^|[-_\s])(save|delete|remove|upload|import|add|write|submit|file-input|danger-action)([-_\s]|$)/i;

    return writeText.test(text) || writeCode.test(handler) || writeClass.test(idClass);
  }

  function setWriteElementLocked(el, locked) {
    if (!el) return;
    if (locked) {
      if (!el.hasAttribute('data-rbac-write-locked')) {
        el.setAttribute('data-rbac-write-locked', '1');
        el.setAttribute('data-rbac-write-display', el.style.display || '');
      }
      el.style.setProperty('display', 'none', 'important');
      el.setAttribute('aria-hidden', 'true');
      return;
    }
    if (!el.hasAttribute('data-rbac-write-locked')) return;
    var oldDisplay = el.getAttribute('data-rbac-write-display') || '';
    el.style.removeProperty('display');
    if (oldDisplay) el.style.display = oldDisplay;
    el.removeAttribute('data-rbac-write-locked');
    el.removeAttribute('data-rbac-write-display');
    el.removeAttribute('aria-hidden');
  }

  function lockSelector(selector, locked) {
    try {
      Array.prototype.forEach.call(document.querySelectorAll(selector), function(el){
        setWriteElementLocked(el, !!locked);
      });
    } catch(e) {}
  }

  function applyReadonlyToPage(page, moduleKey) {
    var pageEl = $('page-' + page);
    if (!pageEl) return;
    var mode = permissionFor(moduleKey);
    var readonly = (mode === 'view');

    pageEl.classList.toggle('mkt-rbac-view-only', readonly);
    pageEl.classList.toggle('mkt-rbac-no-access', mode === 'none');

    // Khi quyền được nâng lại thành edit, trả đúng trạng thái inline ban đầu.
    Array.prototype.forEach.call(pageEl.querySelectorAll('[data-rbac-write-locked="1"]'), function(el){
      if (!readonly) setWriteElementLocked(el, false);
    });

    if (!readonly) return;

    // Cho phép lọc, chuyển tab, xem biểu đồ, tải lại và xuất dữ liệu.
    // Chỉ ẩn file upload và các hành động có khả năng ghi/thay đổi dữ liệu.
    Array.prototype.forEach.call(pageEl.querySelectorAll('input[type="file"], button, a, [role="button"], form'), function(el){
      if (isWriteActionElement(el)) setWriteElementLocked(el, true);
    });

    // Báo cáo: khóa vùng nhập liệu nhưng vẫn cho chọn ngày, tab và xem lịch sử.
    if (moduleKey === 'report') {
      Array.prototype.forEach.call(pageEl.querySelectorAll('textarea, input[type="text"], input[type="number"]'), function(el){
        el.disabled = true;
        el.setAttribute('data-rbac-readonly-control', '1');
      });
    }
  }

  function installReadonlyInteractionGuard() {
    if (window.__MKT_RBAC_READONLY_GUARD) return;
    window.__MKT_RBAC_READONLY_GUARD = true;

    document.addEventListener('click', function(ev){
      var el = ev.target && ev.target.closest ? ev.target.closest('button, a, [role="button"], input[type="file"]') : null;
      if (!el || !isWriteActionElement(el)) return;
      var moduleKey = getElementModule(el);
      if (isGuestReadOnlySession() || permissionFor(moduleKey) === 'view') {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        guardMessage(moduleKey);
      }
    }, true);

    document.addEventListener('change', function(ev){
      var el = ev.target;
      if (!el) return;
      var moduleKey = getElementModule(el);
      var handler = safe(el.getAttribute && el.getAttribute('onchange')).toLowerCase();
      var writeChange = (safe(el.type).toLowerCase() === 'file') || /(save|update|upload|import|write|set)/i.test(handler);
      if (writeChange && (isGuestReadOnlySession() || permissionFor(moduleKey) === 'view')) {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        try { if (safe(el.type).toLowerCase() === 'file') el.value = ''; } catch(e) {}
        guardMessage(moduleKey);
      }
    }, true);

    document.addEventListener('submit', function(ev){
      var form = ev.target;
      var moduleKey = getElementModule(form);
      if (isGuestReadOnlySession() || permissionFor(moduleKey) === 'view') {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        guardMessage(moduleKey);
      }
    }, true);
  }

  var LAST_GUEST_DB_BLOCK_TS = 0;

  function rejectGuestDatabaseWrite(methodName) {
    var now = Date.now();
    if (now - LAST_GUEST_DB_BLOCK_TS > 900) {
      LAST_GUEST_DB_BLOCK_TS = now;
      toast('Tài khoản Khách chỉ được xem. Hệ thống đã chặn thao tác ghi cơ sở dữ liệu.');
    }
    var err = new Error('RBAC_GUEST_READ_ONLY: ' + methodName);
    err.code = 'RBAC_GUEST_READ_ONLY';
    return Promise.reject(err);
  }

  /**
   * Lấy đường dẫn tương đối của Firebase Reference.
   * Ví dụ:
   * https://...firebaseio.com/meta_live_locks_v1/NNV/.../
   * -> meta_live_locks_v1/NNV/...
   */
  function getFirebaseReferencePath(ref) {
    if (!ref) return '';

    try {
      if (
        ref.path &&
        typeof ref.path.toString === 'function'
      ) {
        var internalPath = safe(
          ref.path.toString()
        )
          .replace(/^\/+|\/+$/g, '');

        if (internalPath) return internalPath;
      }
    } catch(e) {}

    try {
      var rawUrl = safe(
        typeof ref.toString === 'function'
          ? ref.toString()
          : ''
      );

      if (!rawUrl) return '';

      rawUrl = rawUrl
        .split('#')[0]
        .split('?')[0];

      if (
        typeof URL === 'function' &&
        /^https?:\/\//i.test(rawUrl)
      ) {
        var parsedUrl = new URL(rawUrl);
        return decodeURIComponent(
          parsedUrl.pathname || ''
        ).replace(/^\/+|\/+$/g, '');
      }

      return decodeURIComponent(
        rawUrl.replace(
          /^https?:\/\/[^/]+\/?/i,
          ''
        )
      ).replace(/^\/+|\/+$/g, '');
    } catch(e) {
      return '';
    }
  }

  /**
   * Ba nhánh này chỉ phục vụ cơ chế Meta Live dùng chung:
   * - transaction để bầu một máy làm leader;
   * - leader ghi snapshot;
   * - gửi yêu cầu cập nhật dùng chung.
   *
   * Firebase Rules vẫn kiểm tra auth.uid, ownerUid, writerUid
   * và cấu trúc dữ liệu. Ngoại lệ client này không mở quyền
   * cho upload, doanh thu, sao kê hoặc dữ liệu nghiệp vụ khác.
   */
  function isMetaLiveSystemReference(ref) {
    var path = getFirebaseReferencePath(ref);

    return (
      path === 'meta_live_snapshots_v1' ||
      path.indexOf(
        'meta_live_snapshots_v1/'
      ) === 0 ||
      path === 'meta_live_locks_v1' ||
      path.indexOf(
        'meta_live_locks_v1/'
      ) === 0 ||
      path === 'meta_live_refresh_requests_v1' ||
      path.indexOf(
        'meta_live_refresh_requests_v1/'
      ) === 0
    );
  }

  function patchGuestDatabaseWriteShield() {
    if (!window.sysDb) return;

    try {
      var sampleRef = window.sysDb.ref();
      var proto =
        sampleRef &&
        Object.getPrototypeOf(sampleRef);

      if (!proto) return;

      var shieldVersion =
        'MKT_RBAC_META_LIVE_EXCEPTION_V1';

      [
        'set',
        'update',
        'remove',
        'transaction',
        'setPriority',
        'setWithPriority'
      ].forEach(function(methodName){
        var currentMethod = proto[methodName];
        if (!currentMethod) return;

        if (
          currentMethod.__rbacGuestShieldVersion ===
          shieldVersion
        ) {
          return;
        }

        /*
         * Nếu bản RBAC cũ đã bọc method trong cùng phiên,
         * lấy lại method Firebase gốc rồi bọc bằng luật mới.
         */
        var old =
          currentMethod.__rbacOriginal ||
          currentMethod;

        var wrapped = function(){
          if (
            isGuestReadOnlySession() &&
            !isMetaLiveSystemReference(this)
          ) {
            return rejectGuestDatabaseWrite(
              methodName
            );
          }

          return old.apply(this, arguments);
        };

        wrapped.__rbacGuestShield = true;
        wrapped.__rbacGuestShieldVersion =
          shieldVersion;
        wrapped.__rbacOriginal = old;

        proto[methodName] = wrapped;
      });

      if (proto.push) {
        var currentPush = proto.push;

        if (
          currentPush.__rbacGuestShieldVersion !==
          shieldVersion
        ) {
          var oldPush =
            currentPush.__rbacOriginal ||
            currentPush;

          var wrappedPush = function(){
            /*
             * push() không truyền dữ liệu chỉ tạo key.
             * Khi có dữ liệu, chỉ ba nhánh Meta Live
             * được dùng ngoại lệ.
             */
            if (
              isGuestReadOnlySession() &&
              arguments.length > 0 &&
              !isMetaLiveSystemReference(this)
            ) {
              return rejectGuestDatabaseWrite(
                'push'
              );
            }

            return oldPush.apply(
              this,
              arguments
            );
          };

          wrappedPush.__rbacGuestShield = true;
          wrappedPush.__rbacGuestShieldVersion =
            shieldVersion;
          wrappedPush.__rbacOriginal = oldPush;

          proto.push = wrappedPush;
        }
      }

      window.__MKT_RBAC_DB_WRITE_SHIELD = true;
      window.__MKT_RBAC_DB_WRITE_SHIELD_VERSION =
        shieldVersion;
    } catch(e) {
      console.warn(
        'Không gắn được lớp chặn ghi Firebase cho Khách:',
        e
      );
    }
  }

  function applyUploadAndWriteLocks() {
    var adsLocked = permissionFor('ads') !== 'edit';
    lockSelector('#ads-upload-area, #upload-buttons-row, #revenue-file-input, #statement-file-input, .delete-btn-admin, .ads-upload-btn, .ads-delete-btn', adsLocked);

    var roasLocked = permissionFor('roas') !== 'edit';
    lockSelector('#roas-upload-area, #roas-file-input, #roas-upload-actions, .roas-upload-btn, .roas-delete-btn, [data-roas-write="true"]', roasLocked);

    var ecomLocked = permissionFor('ecom') !== 'edit';
    lockSelector('.ss-upload-btn, .ss-delete-btn, #ss-file-input, .tt-upload-btn, .tt-delete-btn, #tt-file-input, [data-ecom-write="true"]', ecomLocked);

    var priceLocked = permissionFor('price') !== 'edit';
    lockSelector('#page-price-setting input[type="file"], #page-price-setting [data-write-action="true"], #page-price-setting .save-btn, #page-price-setting .delete-btn, #page-price-setting .upload-btn', priceLocked);

    var composeLocked = permissionFor('compose') !== 'edit';
    lockSelector('#page-compose input[type="file"], #page-compose [data-write-action="true"], #page-compose .save-btn, #page-compose .delete-btn, #page-compose .upload-btn', composeLocked);

    Array.prototype.forEach.call(document.querySelectorAll('.page'), function(pg){
      var p = pageKeyFromElement(pg);
      if (!p) return;
      applyReadonlyToPage(p, getModuleFromPage(p));
    });
  }

  function applyCurrentPermissions(options) {
    options = options || {};
    if (PERMISSION_APPLY_RUNNING_V206) return;
    PERMISSION_APPLY_RUNNING_V206 = true;

    try {
      if (!options.skipSessionSync) syncAuthSessionState();

      var uid = getCurrentUid();
      var found = findUserByIdentity();

      // Chưa tải danh sách user thì giữ boot gate. Không mở Workspace mặc định sớm
      // vì Admin có thể đã cấu hình ads=none trên Firebase; chờ dữ liệu để tránh flash/jitter.
      if (uid && !found && !ADMIN_UID_FLAG && window.myIdentity !== 'SUPER_ADMIN' && !usersConfigLoaded()) {
        forceHideProtectedMenus('waiting-users-config');
        return;
      }

      // Chờ liên kết UID -> hồ sơ hoàn tất trước khi mở quyền ghi.
      if (uid && found && found.user && !isAdminUser(found.user) && roleKey(found.user.role) !== 'guest') {
        if (!ensureUidUserMap(found)) {
          setBootGate(true, 'sync-uid-map');
          return;
        }
      } else if (uid && found && found.user) {
        ensureUidUserMap(found);
      }

      var workspaceDefault = !!(uid && !found && isWorkspaceDomainAuthSessionV206());
      var role = found && found.user ? roleKey(found.user.role) : (workspaceDefault ? 'workspace' : 'guest');
      var perms = found && found.user
        ? getCurrentPermissions()
        : (workspaceDefault ? workspaceDefaultPermissionsV206() : defaultPermissionsForRole('guest'));

      if (isAdminUser(found && found.user)) {
        role = 'admin';
        perms = defaultPermissionsForRole('admin');
      }

      setBootGate(false, 'ready');

      window.MKT_CURRENT_ROLE = role;
      window.MKT_PERMISSIONS = perms;
      window.USER_PERMISSIONS = perms;
      window.MKT_PERMISSION_VERSION = VERSION;
      window.MKT_WORKSPACE_DEFAULT_ACCESS = workspaceDefault;
      window.MKT_DATABASE_READONLY = (role === 'guest' || role === 'workspace');

      var anonymousGuest = isMetaGuestSessionReady();
      if (document.body) {
        // Chỉ role Guest thực sự dùng skin guest; Workspace mặc định là một trạng thái riêng.
        document.body.classList.toggle('guest-mode', role === 'guest');
        document.body.classList.toggle('mkt-rbac-guest-readonly', role === 'guest');
        document.body.classList.toggle('mkt-rbac-workspace-default', role === 'workspace');
      }

      // Rời Anonymous Guest thì dọn cờ cảnh báo để tài khoản có vai trò/Workspace
      // tuyệt đối không nhìn thấy thông báo "Meta Live đã ngưng hỗ trợ".
      if (!anonymousGuest) {
        try {
          sessionStorage.removeItem(META_GUEST_LOGIN_PENDING_KEY);
          sessionStorage.removeItem(META_GUEST_LOGIN_CONFIRMED_KEY);
        } catch(e) {}
        var guestModalV206 = $('mkt-meta-guest-notice');
        if (guestModalV206) {
          guestModalV206.classList.remove('open');
          guestModalV206.setAttribute('aria-hidden', 'true');
        }
      }

      patchGuestDatabaseWriteShield();
      renderMetaGuestInlineNotice();
      maybeShowPendingGuestNotice();

      var roleEl = $('home-role-label');
      if (roleEl) roleEl.innerText = roleMeta(role).label;
      syncAccountMenuState(role);

      // V20.6: nhiều listener Firebase có thể gọi applyCurrentPermissions liên tiếp.
      // Chỉ repaint menu khi UID/role/quyền thực sự đổi; đây là điểm dừng hiện tượng menu giật.
      var uiSignature = permissionUiSignatureV206(role, perms);
      var permissionChanged = uiSignature !== LAST_PERMISSION_UI_SIGNATURE_V206;

      if (permissionChanged || options.forceMenu === true) {
        LAST_PERMISSION_UI_SIGNATURE_V206 = uiSignature;
        applyMenuPermissions();
      }

      // Lock write controls vẫn có thể chạy lại vì module Ads/TMĐT tạo DOM động.
      applyUploadAndWriteLocks();

      if (permissionChanged) {
        if (window.MKTV166SyncEcomMenu) window.MKTV166SyncEcomMenu();
        else if (window.MKTV164SyncEcomMenu) window.MKTV164SyncEcomMenu();
      }
    } finally {
      PERMISSION_APPLY_RUNNING_V206 = false;
    }
  }

  function guardMessage(moduleKey) {
    var label = MODULES[moduleKey] ? MODULES[moduleKey].label : moduleKey;
    toast('Tài khoản của bạn chỉ có quyền xem ở mục ' + label + ', không được thao tác chỉnh sửa.');
  }

  function wrapFunction(name, moduleKey, editRequired) {
    if (!window[name] || window[name].__rbacWrapped) return;
    var old = window[name];
    var fn = function () {
      if (editRequired && !canEdit(moduleKey)) {
        guardMessage(moduleKey);
        return false;
      }
      return old.apply(this, arguments);
    };
    fn.__rbacWrapped = true;
    window[name] = fn;
  }

  function wrapWriteFunctions() {
    [
      ['deleteUploadBatch','ads'], ['handleRevenueUpload','ads'], ['handleStatementUpload','ads'],
      ['triggerRevenueUpload','ads'], ['triggerStatementUpload','ads'],
      ['handleRoasFileUpload','roas'], ['deleteRoasFile','roas'], ['removeRoasFile','roas'],
      ['deleteShopeeStatsBatch','ecom'], ['deleteTiktokBatch','ecom'],
      ['savePriceConfig','price'], ['updatePriceConfig','price'], ['deletePriceConfig','price'],
      ['saveComposeConfig','compose'], ['deleteComposeData','compose'],
      ['adminSaveUser','admin'], ['adminDeleteUser','admin']
    ].forEach(function(x){ wrapFunction(x[0], x[1], true); });
  }

  function patchGoPage() {
    if (!window.goPage || window.goPage.__rbacWrapped) return;
    original.goPage = window.goPage;
    var fn = function (p) {
      var moduleKey = getModuleFromPage(p);
      if (!canAccess(moduleKey)) {
        toast('Bạn chưa được cấp quyền truy cập mục này.');
        if (window.MKTRouter && typeof window.MKTRouter.navigate === 'function') {
          return window.MKTRouter.navigate('home', { replace:true, reason:'rbac-denied' });
        }
        return original.goPage.call(window, 'home');
      }
      if (p === 'admin' && !isAdminUser()) {
        toast('Chỉ Admin mới được vào Quản trị phân quyền.');
        if (window.MKTRouter && typeof window.MKTRouter.navigate === 'function') {
          return window.MKTRouter.navigate('home', { replace:true, reason:'rbac-admin-denied' });
        }
        return original.goPage.call(window, 'home');
      }
      return original.goPage.apply(window, arguments);
    };
    fn.__rbacWrapped = true;
    window.goPage = fn;
  }

  function patchBuildUsers() {
    if (!window.buildSystemUsersUI || window.buildSystemUsersUI.__rbacWrapped) return;
    original.buildSystemUsersUI = window.buildSystemUsersUI;
    var fn = function (data, user) {
      data = normalizeUsers(data);
      window.SYS_DB_USERS = data;
      try { return original.buildSystemUsersUI.call(window, data, user); }
      finally {
        setTimeout(function(){
          applyCurrentPermissions();
          renderAdminPermissionUI();
        }, 50);
        setTimeout(function(){ applyCurrentPermissions(); }, 180);
        setTimeout(function(){ applyCurrentPermissions(); }, 520);
      }
    };
    fn.__rbacWrapped = true;
    window.buildSystemUsersUI = fn;
  }

  function optionHtml(value, current) {
    var labels = { none:'Ẩn menu', view:'Truy cập / Chỉ xem', edit:'Chỉnh sửa' };
    return '<option value="' + value + '" ' + (current === value ? 'selected' : '') + '>' + labels[value] + '</option>';
  }

  function permissionSelect(moduleKey, value, disabled, scope, guestLimited) {
    value = normalizePermissionValue(value);
    scope = safe(scope || 'add');
    if (guestLimited && value === 'edit') value = 'view';
    var options = optionHtml('none', value) + optionHtml('view', value);
    if (!guestLimited) options += optionHtml('edit', value);
    return '<select class="rbac-user-perm-select" data-user-scope="' + esc(scope) + '" data-perm="' + esc(moduleKey) + '" ' + (disabled ? 'disabled' : '') + '>' + options + '</select>';
  }

  function roleOptions(current, disabled) {
    current = roleKey(current);
    var keys = getAllRoleKeys().filter(function(k){ return k !== 'admin' || current === 'admin'; });
    return '<select id="rbac-role" class="rbac-input" ' + (disabled ? 'disabled' : '') + '>' +
      keys.map(function(k){ var meta=roleMeta(k); return '<option value="' + esc(k) + '" ' + (k === current ? 'selected' : '') + '>' + esc(meta.icon + ' ' + meta.label) + '</option>'; }).join('') +
      '</select>';
  }

  function getAdminContainer() {
    return $('page-admin');
  }

  function injectAdminCss() {
    if ($('mkt-rbac-style')) return;
    var st = document.createElement('style');
    st.id = 'mkt-rbac-style';
    st.textContent = `
      /* ===== V20 ACCOUNT MENU ===== */
      #admin-nav-link{display:none!important;}
      .user-profile-mini.rbac-account-host{position:relative!important;cursor:default;user-select:none;}
      .user-profile-mini.rbac-account-host > #user-avatar,.user-profile-mini.rbac-account-host > #header-user-display{cursor:pointer;}
      .user-profile-mini.rbac-account-host > .logout-mini{display:inline-flex!important;align-items:center;position:relative;z-index:2;}
      .rbac-account-dropdown{display:none;position:absolute;right:0;top:calc(100% + 10px);width:260px;padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 20px 50px rgba(15,23,42,.18);z-index:250000;}
      .user-profile-mini.rbac-account-host.rbac-account-open .rbac-account-dropdown{display:block;}
      .rbac-account-summary{padding:10px 11px 11px;border-bottom:1px solid #eef2f7;margin-bottom:6px;}
      .rbac-account-summary strong{display:block;color:#0f172a;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .rbac-account-summary small{display:block;color:#64748b;font-size:11px;margin-top:3px;}
      .rbac-account-action{width:100%;border:0;background:transparent;border-radius:11px;padding:10px 11px;text-align:left;cursor:pointer;color:#334155;font:700 12px Tahoma,Arial,sans-serif!important;}
      .rbac-account-action:hover{background:#f1f5f9;color:#1d4ed8;}
      .rbac-account-action.danger{color:#dc2626;}
      .rbac-account-action.danger:hover{background:#fef2f2;color:#b91c1c;}
      .rbac-mobile-account-menu{display:none;margin-top:8px;padding:7px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.10);}
      .mobile-nav-footer.rbac-mobile-account-open .rbac-mobile-account-menu{display:block;}
      .mobile-nav-user.rbac-mobile-account-toggle{cursor:pointer;}
      .mobile-nav-footer > .mobile-nav-logout{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;line-height:1!important;padding:0 14px!important;}
      .rbac-mobile-account-menu .rbac-account-action{color:#334155;}
      .rbac-mobile-account-menu .rbac-account-action:hover{background:#f1f5f9;color:#1d4ed8;}
      .rbac-mobile-account-menu .rbac-account-action.danger{color:#dc2626;}
      .mkt-rbac-view-only .rbac-hide-on-view{display:none!important;}
      body.mkt-rbac-guest-readonly .mkt-rbac-view-only::before{
        content:"CHẾ ĐỘ KHÁCH · CHỈ XEM · KHÔNG GHI DỮ LIỆU";
        display:block;margin:0 0 14px;padding:10px 14px;border:1px solid #bfdbfe;
        border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;
      }
      .rbac-admin-shell,
      .rbac-admin-shell *{
        font-family:Tahoma,Arial,Verdana,sans-serif!important;
        letter-spacing:0!important;
        text-rendering:optimizeLegibility;
        -webkit-font-smoothing:antialiased;
        -moz-osx-font-smoothing:grayscale;
        font-synthesis-weight:none;
      }
      .rbac-admin-shell{color:#0f172a;font-weight:400;line-height:1.45;display:flex;flex-direction:column;gap:18px;}
      .rbac-control-hero{position:relative;overflow:hidden;border-radius:30px;padding:24px;border:1px solid rgba(37,99,235,.18);background:radial-gradient(circle at 10% 10%,rgba(37,99,235,.20),transparent 28%),radial-gradient(circle at 88% 12%,rgba(16,185,129,.16),transparent 28%),linear-gradient(135deg,#f8fbff,#ffffff 58%,#f1f5f9);box-shadow:0 18px 48px rgba(15,23,42,.08);}
      .rbac-control-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap;}
      .rbac-version-pill{display:inline-flex;align-items:center;gap:7px;background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:7px 12px;font-size:11px;font-weight:700;margin-bottom:12px;}
      .rbac-title{font-size:27px;font-weight:700;margin:0 0 7px;color:#0f172a;letter-spacing:-.01em!important;}
      .rbac-sub{color:#64748b;font-size:13px;line-height:1.65;font-weight:400;max-width:820px;}
      .rbac-status-chip{display:inline-flex;align-items:center;gap:8px;background:#0f172a;color:#fff;border-radius:18px;padding:11px 14px;box-shadow:0 14px 28px rgba(15,23,42,.16);font-weight:700;font-size:12px;white-space:nowrap;}
      .rbac-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px;}
      .rbac-metric-card{background:rgba(255,255,255,.88);border:1px solid #e2e8f0;border-radius:20px;padding:14px;box-shadow:0 10px 26px rgba(15,23,42,.05);}
      .rbac-metric-card span{display:block;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:7px;}
      .rbac-metric-card strong{display:block;color:#0f172a;font-size:22px;font-weight:700;line-height:1;}
      .rbac-workspace{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:start;}
      .rbac-side-panel{position:sticky;top:12px;border-radius:24px;background:#0f172a;color:#fff;padding:16px;box-shadow:0 18px 42px rgba(15,23,42,.18);}
      .rbac-side-title{font-size:15px;font-weight:700;margin-bottom:8px;}
      .rbac-side-sub{font-size:12px;color:#cbd5e1;line-height:1.6;margin-bottom:14px;}
      .rbac-nav-card{display:flex;align-items:center;gap:10px;border-radius:17px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);padding:12px;margin-top:9px;}
      .rbac-nav-card b{display:block;font-size:13px;font-weight:700;color:#fff;}.rbac-nav-card span{display:block;font-size:11px;color:#cbd5e1;margin-top:3px;line-height:1.4;}
      .rbac-main-stack{display:flex;flex-direction:column;gap:16px;min-width:0;}
      .rbac-card{background:rgba(255,255,255,.95);border:1px solid #e2e8f0;border-radius:24px;padding:16px;box-shadow:0 10px 28px rgba(15,23,42,.05);min-width:0;backdrop-filter:blur(12px);}
      .rbac-card-title{font-weight:700;margin-bottom:12px;color:#0f172a;display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:15px;}
      .rbac-table-wrap{width:100%;overflow:auto;border:1px solid #e2e8f0;border-radius:18px;background:#fff;}
      .rbac-table{width:100%;min-width:920px;border-collapse:separate;border-spacing:0;font-size:12px;}
      .rbac-table th{background:#f8fafc;color:#475569;text-transform:uppercase;font-size:10px;font-weight:700;letter-spacing:0!important;padding:11px;border-bottom:1px solid #e2e8f0;text-align:left;}
      .rbac-table td{padding:11px;border-bottom:1px solid #eef2f7;background:#fff;vertical-align:middle;font-weight:400;}
      .rbac-table tr:hover td{background:#f8fbff!important;}
      .rbac-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:700;background:#f1f5f9;color:#334155;white-space:nowrap;}
      .rbac-badge.admin{background:#fef2f2;color:#dc2626}.rbac-badge.level1{background:#fff7ed;color:#ea580c}.rbac-badge.level2{background:#eff6ff;color:#2563eb}.rbac-badge.guest{background:#f8fafc;color:#64748b}.rbac-badge.custom-role{background:#f5f3ff;color:#7c3aed}
      .rbac-btn{border:0;border-radius:999px;padding:9px 15px;font-family:Tahoma,Arial,Verdana,sans-serif!important;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 10px 18px rgba(37,99,235,.18);letter-spacing:0!important;font-size:12px;transition:transform .16s ease,box-shadow .16s ease,background .16s ease;}.rbac-btn:hover{transform:translateY(-1px);box-shadow:0 14px 24px rgba(37,99,235,.22);}
      .rbac-btn.secondary{background:#fff;color:#2563eb;border:1px solid #bfdbfe;box-shadow:none;}.rbac-btn.dark{background:#0f172a;color:#fff;}.rbac-btn.danger{background:#dc2626;}.rbac-btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
      .rbac-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .rbac-form{display:grid;gap:12px;}.rbac-field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:0!important;color:#64748b;font-weight:700;margin-bottom:6px;}
      .rbac-input,.rbac-perm-select,.rbac-role-perm-select{width:100%;border:1px solid #dbe3ef;border-radius:13px;background:#fff;padding:10px 11px;outline:none;color:#0f172a;font-family:Tahoma,Arial,Verdana,sans-serif!important;font-weight:600;font-size:12px;letter-spacing:0!important;box-shadow:0 1px 0 rgba(15,23,42,.02);}.rbac-input:focus,.rbac-perm-select:focus,.rbac-role-perm-select:focus{border-color:#93c5fd;box-shadow:0 0 0 4px rgba(37,99,235,.12);}
      .rbac-input::placeholder{font-family:Tahoma,Arial,Verdana,sans-serif!important;font-weight:400;color:#94a3b8;}
      .rbac-perm-matrix{display:grid;grid-template-columns:1fr;gap:8px;}.rbac-perm-row{display:grid;grid-template-columns:1fr 165px;gap:8px;align-items:center;padding:10px;border:1px solid #e2e8f0;border-radius:15px;background:linear-gradient(135deg,#f8fafc,#fff);}
      .rbac-perm-name{font-weight:600;color:#334155;font-size:12px;}.rbac-note{background:linear-gradient(135deg,#fffbeb,#fff);border:1px dashed #f59e0b;color:#92400e;border-radius:17px;padding:12px;font-size:12px;line-height:1.55;font-weight:600;}
      .rbac-lock{color:#dc2626;font-weight:700;font-size:11px;}.rbac-mini{font-size:11px;color:#64748b;font-weight:600;margin-top:3px;}
      .rbac-role-default-card{background:linear-gradient(135deg,#ffffff,#f8fafc);border-color:#bfdbfe;}
      .rbac-role-default-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;}
      .rbac-role-card{border:1px solid #dbeafe;background:#fff;border-radius:20px;padding:13px;box-shadow:0 8px 22px rgba(37,99,235,.05);}
      .rbac-role-card-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;}
      .rbac-role-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
      .rbac-role-perm-item{border:1px solid #eef2f7;background:#f8fafc;border-radius:14px;padding:8px;}
      .rbac-role-perm-item label{display:block;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:5px;}
      .rbac-font-fix-note{font-size:11px;color:#64748b;font-weight:400;line-height:1.5;margin-top:10px;}
      .rbac-custom-create{margin-top:14px;padding:14px;border:1px dashed #8b5cf6;border-radius:18px;background:linear-gradient(135deg,#faf5ff,#fff);}
      .rbac-custom-create-title{font-size:14px;font-weight:700;color:#6d28d9;margin-bottom:8px;}
      .rbac-custom-create-grid{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:12px;align-items:start;}
      .rbac-new-role-matrix{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
      .rbac-new-role-item{border:1px solid #ede9fe;background:#fff;border-radius:13px;padding:8px;}
      .rbac-new-role-item label{display:block;font-size:10px;color:#6d28d9;font-weight:700;text-transform:uppercase;margin-bottom:5px;}
      @media(max-width:1180px){.rbac-workspace{grid-template-columns:1fr}.rbac-side-panel{position:relative;top:auto}.rbac-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.rbac-role-default-grid{grid-template-columns:1fr}}
      @media(max-width:760px){.rbac-metrics{grid-template-columns:1fr}.rbac-perm-row{grid-template-columns:1fr}.rbac-role-card-grid{grid-template-columns:1fr}.rbac-control-hero{padding:18px}.rbac-custom-create-grid,.rbac-new-role-matrix{grid-template-columns:1fr}}

      /* ===== V17 COMPACT DEFAULTS + TABS + USER POPUP ===== */
      .rbac-admin-shell{gap:14px;max-width:1680px;margin:0 auto;}
      .rbac-hero-compact{padding:20px 22px;border-radius:24px;}
      .rbac-hero-compact .rbac-title{font-size:24px;}
      .rbac-hero-compact .rbac-metrics{margin-top:14px;gap:9px;}
      .rbac-hero-compact .rbac-metric-card{padding:11px 13px;border-radius:16px;}
      .rbac-hero-compact .rbac-metric-card strong{font-size:19px;}
      .rbac-card{border-radius:20px;padding:15px;}
      .rbac-default-matrix-wrap{margin-top:10px;}
      .rbac-default-matrix-scroll{width:100%;overflow:auto;border:1px solid #e2e8f0;border-radius:16px;background:#fff;}
      .rbac-default-matrix{width:100%;min-width:1180px;border-collapse:separate;border-spacing:0;font-size:11px;}
      .rbac-default-matrix th{position:sticky;top:0;z-index:2;background:#f8fafc;color:#64748b;padding:8px 7px!important;text-align:center;font-size:9.5px;font-weight:700;white-space:normal;line-height:1.25;border-bottom:1px solid #e2e8f0;}
      .rbac-default-matrix th:first-child{left:0;z-index:4;text-align:left;min-width:170px;}
      .rbac-default-matrix td{padding:7px!important;border-bottom:1px solid #eef2f7;background:#fff;text-align:center;}
      .rbac-default-matrix td:first-child{position:sticky;left:0;z-index:1;text-align:left;background:#fff;box-shadow:6px 0 12px rgba(15,23,42,.035);}
      .rbac-default-matrix tr:hover td{background:#f8fbff!important;}
      .rbac-default-role-cell small{display:block;margin-top:4px;color:#94a3b8;font-size:9.5px;font-weight:600;}
      .rbac-compact-select{min-width:94px;width:100%;height:32px;padding:5px 7px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#334155;font-size:10.5px;font-weight:700;}
      .rbac-compact-select:disabled{background:#f1f5f9;color:#64748b;opacity:.8;}
      .rbac-default-actions{width:54px;}
      .rbac-default-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:9px;color:#64748b;font-size:10.5px;font-weight:700;}
      .rbac-default-legend span{display:inline-flex;align-items:center;gap:6px;}
      .rbac-default-legend i{width:8px;height:8px;border-radius:99px;display:inline-block;}.rbac-default-legend i.none{background:#cbd5e1}.rbac-default-legend i.view{background:#3b82f6}.rbac-default-legend i.edit{background:#16a34a}
      .rbac-muted-dash{color:#cbd5e1;}
      .rbac-icon-btn{width:34px;height:34px;border:0;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;background:#f1f5f9;color:#475569;transition:.16s ease;}
      .rbac-icon-btn:hover{transform:translateY(-1px);}.rbac-icon-btn.danger{background:#fef2f2;color:#dc2626}.rbac-icon-btn:disabled{opacity:.35;cursor:not-allowed;transform:none;}
      .rbac-create-center{padding:0;overflow:hidden;}
      .rbac-create-tabs{display:flex;gap:4px;padding:7px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;}
      .rbac-create-tab{border:0;background:transparent;color:#64748b;border-radius:12px;padding:10px 14px;font-weight:700;font-size:12px;cursor:pointer;}
      .rbac-create-tab.active{background:#fff;color:#2563eb;box-shadow:0 5px 14px rgba(15,23,42,.08);}
      .rbac-create-panel{display:none;padding:16px;}.rbac-create-panel.active{display:block;}
      .rbac-custom-create{margin:0;padding:0;border:0;background:transparent;}
      .rbac-custom-create-title{font-size:16px;color:#0f172a;margin-bottom:7px;}
      .rbac-new-role-matrix{grid-template-columns:repeat(4,minmax(130px,1fr));}
      .rbac-user-form{display:flex;flex-direction:column;gap:13px;}
      .rbac-user-basic-grid{display:grid;grid-template-columns:1.1fr 1fr .8fr 1fr;gap:10px;}
      .rbac-password-row{display:flex;gap:7px;align-items:center}.rbac-password-row .rbac-input{min-width:0}.rbac-password-generate{flex:0 0 auto;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:10px;padding:9px 10px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap}
      .rbac-inline-note{padding:10px 12px;border:1px solid #dbeafe;background:#eff6ff;border-radius:12px;color:#1e3a8a;font-size:11px;line-height:1.5;}
      .rbac-user-perm-grid{display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:8px;}
      .rbac-user-perm-item{display:grid;grid-template-columns:minmax(0,1fr) 132px;align-items:center;gap:8px;padding:8px 9px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;}
      .rbac-user-perm-item label{font-size:10.5px;color:#475569;font-weight:700;}
      .rbac-user-perm-select{width:100%;height:34px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;padding:5px 7px;color:#0f172a;font-size:10.5px;font-weight:700;}
      .rbac-form-actions{justify-content:flex-end;padding-top:2px;}
      .rbac-user-modal{display:none;position:fixed;inset:0;z-index:2147483000!important;align-items:center;justify-content:center;padding:18px;isolation:isolate;}
      .rbac-user-modal.open{display:flex;}
      .rbac-user-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(7px);}
      .rbac-user-modal-dialog{position:relative;z-index:1;width:min(980px,96vw);max-height:90vh;overflow:auto;background:#fff;border:1px solid rgba(255,255,255,.8);border-radius:24px;box-shadow:0 30px 80px rgba(15,23,42,.28);animation:rbacModalIn .18s ease-out;}
      @keyframes rbacModalIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
      .rbac-user-modal-head{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:18px 20px 13px;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid #e2e8f0;}
      .rbac-user-modal-head h3{margin:3px 0 0;color:#0f172a;font-size:20px;}.rbac-modal-kicker{font-size:9.5px;color:#2563eb;font-weight:800;letter-spacing:.12em;}
      .rbac-modal-close{width:38px;height:38px;border:0;border-radius:12px;background:#f1f5f9;color:#334155;font-size:24px;line-height:1;cursor:pointer;}
      .rbac-user-modal-body{padding:18px 20px 20px;}
      body.rbac-modal-open{overflow:hidden;}
      @media(max-width:1100px){.rbac-user-basic-grid{grid-template-columns:1fr 1fr}.rbac-user-perm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rbac-new-role-matrix{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.rbac-user-basic-grid,.rbac-user-perm-grid,.rbac-new-role-matrix{grid-template-columns:1fr}.rbac-user-basic-grid .rbac-field:last-child{grid-column:auto}.rbac-user-perm-item{grid-template-columns:1fr}.rbac-user-modal{padding:8px}.rbac-user-modal-dialog{width:100%;max-height:96vh;border-radius:18px}.rbac-create-tabs{overflow:auto}.rbac-create-tab{white-space:nowrap}}
    `;
    document.head.appendChild(st);
  }


  function roleDefaultPermissionSelect(role, moduleKey, value) {
    role = roleKey(role);
    value = normalizePermissionValue(value);
    var disabled = role === 'admin' || moduleKey === 'admin';
    if (role === 'guest' && value === 'edit') value = 'view';
    var options = optionHtml('none', value) + optionHtml('view', value);
    if (role !== 'guest') options += optionHtml('edit', value);
    return '<select class="rbac-role-perm-select rbac-compact-select" data-role="' + esc(role) + '" data-module="' + esc(moduleKey) + '" ' + (disabled ? 'disabled' : '') + '>' + options + '</select>';
  }

  function newRolePermissionSelect(moduleKey, value) {
    value = normalizePermissionValue(value);
    return '<select class="rbac-role-perm-select rbac-new-role-perm-select" data-new-role-module="' + esc(moduleKey) + '">' +
      optionHtml('none', value) + optionHtml('view', value) + optionHtml('edit', value) + '</select>';
  }

  function renderCustomRoleCreator() {
    var seed = blankNonAdminPermissions();
    return '<div class="rbac-custom-create">' +
      '<div class="rbac-custom-create-title">Tạo mới phân quyền mặc định</div>' +
      '<div class="rbac-note" style="margin-bottom:10px">Đặt tên quyền mới, cấu hình quyền mặc định rồi tạo. Vai trò mới sẽ xuất hiện trong ô “Cấp quyền” khi thêm/chỉnh user. Sau khi áp, vẫn chỉnh riêng từng user mà không ảnh hưởng người khác.</div>' +
      '<div class="rbac-custom-create-grid"><div>' +
        '<div class="rbac-field"><label>Tên phân quyền</label><input id="rbac-new-role-name" class="rbac-input" type="text" maxlength="60" placeholder="VD: Nhân viên Ads, Kế toán TMĐT"></div>' +
        '<button class="rbac-btn" style="width:100%;margin-top:10px" onclick="window.MKTRBAC.createCustomRole()">Tạo và lưu Firebase</button>' +
      '</div><div class="rbac-new-role-matrix">' +
        ACTIVE_PERMISSION_MODULES.map(function(m){
          return '<div class="rbac-new-role-item"><label>' + esc(MODULES[m].label) + '</label>' + newRolePermissionSelect(m, seed[m]) + '</div>';
        }).join('') +
      '</div></div></div>';
  }


  function renderAdminCreateTabsSection() {
    return '<section class="rbac-card rbac-create-center">' +
      '<div class="rbac-create-tabs" role="tablist">' +
        '<button class="rbac-create-tab active" id="rbac-tab-role" onclick="window.MKTRBAC.switchCreateTab(\'role\')">🧩 Tạo phân quyền mặc định</button>' +
        '<button class="rbac-create-tab" id="rbac-tab-user" onclick="window.MKTRBAC.switchCreateTab(\'user\')">👤 Thêm người dùng</button>' +
      '</div>' +
      '<div class="rbac-create-panel active" id="rbac-create-panel-role">' + renderCustomRoleCreator() + '</div>' +
      '<div class="rbac-create-panel" id="rbac-create-panel-user"><div id="rbac-add-user-form-box"></div></div>' +
      '</section>';
  }

  function switchCreateTab(tab) {
    tab = tab === 'user' ? 'user' : 'role';
    ['role','user'].forEach(function(key){
      var btn = $('rbac-tab-' + key);
      var panel = $('rbac-create-panel-' + key);
      if (btn) btn.classList.toggle('active', key === tab);
      if (panel) panel.classList.toggle('active', key === tab);
    });
    if (tab === 'user') renderUserForm('add', null);
  }

  function renderRoleDefaultsSection() {
    return '<section class="rbac-card rbac-role-default-card">' +
      '<div class="rbac-card-title"><div><span>🧩 Quyền mặc định</span><div class="rbac-mini">Bảng quyền gọn theo từng cấp. Khách mặc định chỉ xem nhưng Admin được đổi giữa Ẩn và Chỉ xem.</div></div>' +
      '<div class="rbac-actions"><button class="rbac-btn secondary" onclick="window.MKTRBAC.resetRoleDefaultsForm()">Khôi phục mẫu</button><button class="rbac-btn" onclick="window.MKTRBAC.saveRoleDefaults()">Lưu vào Firebase</button></div></div>' +
      '<div id="rbac-role-default-rows" class="rbac-default-matrix-wrap"></div>' +
      '</section>';
  }

  function renderRoleDefaultRows(useSystemDefault) {
    var box = $('rbac-role-default-rows');
    if (!box) return;
    var source = useSystemDefault ? mergeRoleDefaults({}) : getRoleDefaultsSource();
    var modules = ACTIVE_PERMISSION_MODULES.slice();
    var html = '<div class="rbac-default-matrix-scroll"><table class="rbac-default-matrix"><thead><tr><th>Phân quyền</th>' +
      modules.map(function(m){ return '<th>' + esc(MODULES[m] ? MODULES[m].label : m) + '</th>'; }).join('') +
      '<th>Thao tác</th></tr></thead><tbody>';

    getAllRoleKeys().forEach(function(role){
      var perms = copy((source && source[role]) || defaultPermissionsForRole(role));
      if (role === 'admin') perms = copy(DEFAULT_ROLE_PERMISSIONS.admin);
      if (role === 'guest') perms = clampGuestPermissions(perms);
      if (role !== 'admin') perms.admin = 'none';
      var custom = isCustomRole(role);
      var badgeClass = custom ? 'custom-role' : role;
      var note = role === 'admin' ? 'Khóa toàn quyền' : (role === 'guest' ? 'Mặc định chỉ xem' : (custom ? 'Quyền tự tạo' : 'Quyền hệ thống'));
      html += '<tr><td class="rbac-default-role-cell"><span class="rbac-badge ' + esc(badgeClass) + '">' + esc(roleLabel(role)) + '</span><small>' + esc(note) + '</small></td>';
      modules.forEach(function(m){
        html += '<td>' + roleDefaultPermissionSelect(role, m, perms[m]) + '</td>';
      });
      html += '<td class="rbac-default-actions">' + (custom ? '<button class="rbac-icon-btn danger" title="Xóa phân quyền" onclick="window.MKTRBAC.deleteCustomRole(\'' + esc(role) + '\')">🗑</button>' : '<span class="rbac-muted-dash">—</span>') + '</td></tr>';
    });
    html += '</tbody></table></div><div class="rbac-default-legend"><span><i class="none"></i>Ẩn menu</span><span><i class="view"></i>Chỉ xem</span><span><i class="edit"></i>Chỉnh sửa</span></div>';
    box.innerHTML = html;
  }

  function readRoleDefaultsFromForm() {
    var out = copy(getRoleDefaultsSource());
    getAllRoleKeys().forEach(function(role){
      out[role] = out[role] || defaultPermissionsForRole(role);
      if (role === 'admin') out[role] = copy(DEFAULT_ROLE_PERMISSIONS.admin);
      if (role === 'guest') out[role] = clampGuestPermissions(out[role]);
      if (role !== 'admin') out[role].admin = 'none';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.rbac-role-perm-select:not(.rbac-new-role-perm-select)'), function(sel){
      var role = roleKey(sel.getAttribute('data-role'));
      var moduleKey = sel.getAttribute('data-module');
      if (!out[role]) out[role] = defaultPermissionsForRole(role);
      if (role === 'admin' || moduleKey === 'admin') return;
      out[role][moduleKey] = normalizePermissionValue(sel.value);
      if (role === 'guest') out[role][moduleKey] = out[role][moduleKey] === 'none' ? 'none' : 'view';
    });
    out.guest = clampGuestPermissions(out.guest);
    return mergeRoleDefaults(out);
  }

  function saveRoleDefaultsFromForm() {
    if (!isAdminUser()) return toast('Chỉ Quản trị hệ thống mới được lưu quyền mặc định.');
    if (!window.sysDb) return toast('Không kết nối được Firebase Database.');
    var data = readRoleDefaultsFromForm();
    data.admin = copy(DEFAULT_ROLE_PERMISSIONS.admin);
    data.guest = clampGuestPermissions(data.guest);
    var updates = {};
    updates[ROLE_DEFAULTS_PATH] = data;
    Object.keys(CUSTOM_ROLE_DEFS).forEach(function(role){
      updates[CUSTOM_ROLES_PATH + '/' + role + '/permissions'] = copy(data[role] || blankNonAdminPermissions());
      updates[CUSTOM_ROLES_PATH + '/' + role + '/updatedAt'] = new Date().toISOString();
    });
    window.sysDb.ref().update(updates).then(function(){
      ACTIVE_ROLE_PERMISSIONS = mergeRoleDefaults(data);
      window.MKT_ROLE_DEFAULTS = copy(ACTIVE_ROLE_PERMISSIONS);
      renderRoleDefaultRows();
      toast('Đã cập nhật quyền mặc định trực tiếp trên Firebase. Quyền riêng của từng user không bị thay đổi.');
    }).catch(function(e){ toast('Lỗi lưu quyền mặc định: ' + e.message); });
  }

  function resetRoleDefaultsForm() {
    renderRoleDefaultRows(true);
    toast('Đã đưa Cấp 1, Cấp 2, Khách và quyền tự tạo về bộ mặc định hiện có. Bấm “Lưu quyền mặc định” để áp dụng.');
  }

  function slugCustomRoleName(name) {
    var v = safe(name).trim().toLowerCase();
    try { v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch(e) {}
    v = v.replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    if (!v) v = 'phan_quyen';
    return 'custom_' + v;
  }

  function readNewCustomRolePermissions() {
    var out = blankNonAdminPermissions();
    Array.prototype.forEach.call(document.querySelectorAll('.rbac-new-role-perm-select'), function(sel){
      var moduleKey = sel.getAttribute('data-new-role-module');
      if (moduleKey) out[moduleKey] = normalizePermissionValue(sel.value);
    });
    out.admin = 'none';
    return out;
  }

  function createCustomRoleFromForm() {
    if (!isAdminUser()) return toast('Chỉ Quản trị hệ thống mới được tạo phân quyền mặc định.');
    if (!window.sysDb) return toast('Không kết nối được Firebase Database.');
    var nameEl = $('rbac-new-role-name');
    var name = safe(nameEl && nameEl.value).trim();
    if (name.length < 2) return toast('Vui lòng nhập tên phân quyền từ 2 ký tự trở lên.');
    var duplicated = getAllRoleKeys().some(function(k){ return safe(roleMeta(k).label).toLowerCase() === name.toLowerCase(); });
    if (duplicated) return toast('Tên phân quyền này đã tồn tại.');

    var base = slugCustomRoleName(name);
    var key = base;
    var index = 2;
    while (ROLES[key] || CUSTOM_ROLE_DEFS[key]) { key = base + '_' + index; index++; }
    var permissions = readNewCustomRolePermissions();
    var now = new Date().toISOString();
    var updates = {};
    updates[CUSTOM_ROLES_PATH + '/' + key] = { name:name, icon:'🧩', permissions:permissions, createdAt:now, updatedAt:now };
    updates[ROLE_DEFAULTS_PATH + '/' + key] = permissions;

    window.sysDb.ref().update(updates).then(function(){
      if (nameEl) nameEl.value = '';
      toast('Đã tạo phân quyền mặc định “' + name + '”.');
    }).catch(function(e){ toast('Lỗi tạo phân quyền: ' + e.message); });
  }

  function deleteCustomRoleByKey(role) {
    role = roleKey(role);
    if (!isAdminUser()) return toast('Chỉ Quản trị hệ thống mới được xóa phân quyền mặc định.');
    if (!isCustomRole(role)) return toast('Không thể xóa cấp quyền cố định.');
    var users = normalizeUsers(window.SYS_DB_USERS || {});
    var usedBy = Object.keys(users).filter(function(k){ return roleKey((users[k] || {}).role) === role; });
    if (usedBy.length) return toast('Phân quyền này đang được gán cho ' + usedBy.length + ' user. Hãy chuyển các user sang quyền khác trước.');
    var label = roleMeta(role).label;
    if (!confirm('Xóa phân quyền mặc định “' + label + '”?')) return;
    var updates = {};
    updates[CUSTOM_ROLES_PATH + '/' + role] = null;
    updates[ROLE_DEFAULTS_PATH + '/' + role] = null;
    window.sysDb.ref().update(updates).then(function(){ toast('Đã xóa phân quyền “' + label + '”.'); })
      .catch(function(e){ toast('Lỗi xóa phân quyền: ' + e.message); });
  }


  // V19.2: #page-admin nằm trong nhiều stacking context của Blogspot
  // (backdrop-filter/position/z-index). Một modal fixed nằm bên trong đó vẫn có thể
  // bị top-nav che. Đưa modal thành con trực tiếp của body để tạo top-layer ổn định.
  function removeOldPortaledUserModal() {
    try {
      var oldModal = document.getElementById('rbac-user-modal');
      if (oldModal && oldModal.parentNode === document.body) oldModal.remove();
    } catch(e) {}
  }

  function portalUserModalToBody() {
    var modal = $('rbac-user-modal');
    if (!modal || !document.body) return modal;
    try {
      if (modal.parentNode !== document.body) document.body.appendChild(modal);
    } catch(e) {}
    return modal;
  }


  function renderAdminPermissionUI() {
    injectAdminCss();
    var page = getAdminContainer();
    if (!page) return;
    if (!isAdminUser()) {
      page.innerHTML = '<div class="section-box"><div class="section-title">⚠️ Không có quyền</div><div style="color:#64748b;font-weight:700;">Chỉ Quản trị hệ thống mới được truy cập phân quyền.</div></div>';
      return;
    }

    // Nếu lần render trước đã portal modal ra body, dọn bản cũ trước khi dựng UI mới.
    removeOldPortaledUserModal();

    var users = normalizeUsers(window.SYS_DB_USERS || {});
    window.SYS_DB_USERS = users;
    var roleCounts = {};
    Object.keys(ROLES).forEach(function(k){ roleCounts[k] = 0; });
    Object.keys(users).forEach(function(k){ var r = roleKey((users[k] || {}).role); roleCounts[r] = (roleCounts[r] || 0) + 1; });
    var userCount = Object.keys(users).length;
    var editCount = 0;
    Object.keys(users).forEach(function(k){ var u = normalizeUser(users[k]); if (u.permissions && Object.keys(u.permissions).some(function(m){ return u.permissions[m] === 'edit'; })) editCount++; });

    page.innerHTML = '<div class="rbac-admin-shell">' +
      '<section class="rbac-control-hero rbac-hero-compact"><div class="rbac-control-top"><div><div class="rbac-version-pill">RBAC V20 · FIREBASE LIVE CONFIG</div><h2 class="rbac-title">🛡️ Trung tâm phân quyền</h2>' +
      '<div class="rbac-sub">Chỉ hiển thị các chức năng đang còn hoạt động. Tạo user, sửa tên và sửa quyền đều ghi trực tiếp Firebase; Quản trị hệ thống nằm trong menu tài khoản.</div></div>' +
      '<div class="rbac-status-chip">● Kết nối Firebase</div></div>' +
      '<div class="rbac-metrics"><div class="rbac-metric-card"><span>Tài khoản</span><strong>' + userCount + '</strong></div><div class="rbac-metric-card"><span>Quản trị</span><strong>' + (roleCounts.admin || 0) + '</strong></div><div class="rbac-metric-card"><span>Nhóm quyền</span><strong>' + getAllRoleKeys().length + '</strong></div><div class="rbac-metric-card"><span>Có quyền sửa</span><strong>' + editCount + '</strong></div></div></section>' +
      renderRoleDefaultsSection() +
      renderAdminCreateTabsSection() +
      '<section class="rbac-card"><div class="rbac-card-title"><div><span>👥 Danh sách tài khoản & quyền riêng</span><div class="rbac-mini">Bấm Sửa để mở popup. Cập nhật chỉ áp dụng cho user được chọn.</div></div><button class="rbac-btn secondary" onclick="window.MKTRBAC.renderAdmin()">Làm mới</button></div>' +
      '<div class="rbac-table-wrap"><table class="rbac-table"><thead><tr><th>Email</th><th>Tên</th><th>Phân quyền</th><th>Quyền nhanh</th><th>Thao tác</th></tr></thead><tbody id="rbac-user-rows"></tbody></table></div></section>' +
      '<div class="rbac-user-modal" id="rbac-user-modal" aria-hidden="true"><div class="rbac-user-modal-backdrop" onclick="window.MKTRBAC.closeUserModal()"></div><div class="rbac-user-modal-dialog" role="dialog" aria-modal="true">' +
        '<div class="rbac-user-modal-head"><div><span class="rbac-modal-kicker">QUYỀN RIÊNG THEO USER</span><h3 id="rbac-user-modal-title">Chỉnh sửa tài khoản</h3></div><button class="rbac-modal-close" onclick="window.MKTRBAC.closeUserModal()" title="Đóng">×</button></div>' +
        '<div class="rbac-user-modal-body" id="rbac-edit-user-form-box"></div>' +
      '</div></div>' +
      '</div>';

    // V19.2: tách modal khỏi .main-content/#page-admin để không bị top menu đè.
    portalUserModalToBody();

    renderRoleDefaultRows();
    renderUserRows(users);
    renderUserForm('add', null);
  }

  function summarizePerms(perms, role) {
    var p = normalizePermissions(perms, role || 'level2');
    var counts = { edit:0, view:0, none:0 };
    ACTIVE_PERMISSION_MODULES.forEach(function(k){ counts[normalizePermissionValue(p[k])] = (counts[normalizePermissionValue(p[k])] || 0) + 1; });
    return '<span class="rbac-mini">Sửa: <b>' + counts.edit + '</b> • Xem: <b>' + counts.view + '</b> • Ẩn: <b>' + counts.none + '</b></span>';
  }

  function renderUserRows(users) {
    var tb = $('rbac-user-rows');
    if (!tb) return;
    var html = '';
    Object.keys(users).sort(function(a,b){ return safe(users[a].name).localeCompare(safe(users[b].name), 'vi'); }).forEach(function(key){
      var u = normalizeUser(users[key]);
      var r = roleKey(u.role);
      var locked = r === 'admin';
      html += '<tr><td><b style="color:#2563eb">' + esc(u.email) + '</b></td>' +
        '<td><b>' + esc(u.name) + '</b></td>' +
        '<td><span class="rbac-badge ' + esc(isCustomRole(r) ? 'custom-role' : r) + '">' + esc(roleLabel(r)) + '</span>' + (locked ? '<div class="rbac-lock">Đã khóa quyền Admin</div>' : '') + '</td>' +
        '<td>' + summarizePerms(u.permissions, r) + '</td>' +
        '<td><div class="rbac-actions">' +
          '<button class="rbac-btn secondary" onclick="window.MKTRBAC.editUser(\'' + esc(key) + '\')" ' + (locked ? 'disabled title="Không chỉnh quyền Admin"' : '') + '>Sửa</button>' +
          '<button class="rbac-icon-btn danger" onclick="window.MKTRBAC.deleteUser(\'' + esc(key) + '\')" ' + (locked ? 'disabled title="Không xóa Admin"' : 'title="Xóa tài khoản khỏi phân quyền"') + '>🗑</button>' +
        '</div></td></tr>';
    });
    tb.innerHTML = html || '<tr><td colspan="5" style="text-align:center;color:#64748b">Chưa có tài khoản.</td></tr>';
  }

  function syncUserFormPermissionLocks(scope, role, adminLocked) {
    var r = roleKey(role);
    Array.prototype.forEach.call(document.querySelectorAll('.rbac-user-perm-select[data-user-scope="' + scope + '"]'), function(sel){
      var moduleKey = sel.getAttribute('data-perm');
      var editOption = sel.querySelector('option[value="edit"]');
      if (editOption) editOption.disabled = (r === 'guest');
      if (r === 'guest' && sel.value === 'edit') sel.value = 'view';
      sel.disabled = !!adminLocked || moduleKey === 'admin';
    });
  }


  function roleOptionsScoped(current, disabled, scope) {
    current = roleKey(current);
    return '<select id="rbac-' + esc(scope) + '-role" class="rbac-input rbac-user-role-select" data-user-scope="' + esc(scope) + '" ' + (disabled ? 'disabled' : '') + '>' +
      getAllRoleKeys().map(function(k){ return '<option value="' + k + '" ' + (k === current ? 'selected' : '') + '>' + esc(roleLabel(k)) + '</option>'; }).join('') +
      '</select>';
  }

  function generateTemporaryPasswordValue() {
    var upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    var lower = 'abcdefghijkmnopqrstuvwxyz';
    var digits = '23456789';
    var symbols = '!@#$%';
    var all = upper + lower + digits + symbols;
    var chars = [
      upper.charAt(Math.floor(Math.random() * upper.length)),
      lower.charAt(Math.floor(Math.random() * lower.length)),
      digits.charAt(Math.floor(Math.random() * digits.length)),
      symbols.charAt(Math.floor(Math.random() * symbols.length))
    ];
    while (chars.length < 12) chars.push(all.charAt(Math.floor(Math.random() * all.length)));
    for (var i = chars.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp;
    }
    return chars.join('');
  }

  function regenerateTemporaryPassword() {
    var el = $('rbac-add-password');
    if (!el) return;
    el.value = generateTemporaryPasswordValue();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value);
    } catch(e) {}
    toast('Đã tạo mật khẩu tạm thời mới' + ((navigator.clipboard && navigator.clipboard.writeText) ? ' và sao chép vào bộ nhớ tạm.' : '.'));
  }

  function getProvisioningAuth() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      throw new Error('Firebase chưa được khởi tạo.');
    }
    var app = null;
    try { app = firebase.app(USER_PROVISION_APP_NAME); }
    catch(e) { app = firebase.initializeApp(firebase.app().options, USER_PROVISION_APP_NAME); }
    return app.auth();
  }

  function provisionFirebaseAuthUser(email, password) {
    var auth;
    try { auth = getProvisioningAuth(); }
    catch(e) { return Promise.reject(e); }

    return auth.signOut().catch(function(){ return null; }).then(function(){
      return auth.createUserWithEmailAndPassword(email, password);
    }).then(function(credential){
      return {
        auth: auth,
        user: credential && credential.user ? credential.user : null,
        uid: credential && credential.user ? credential.user.uid : '',
        created: true,
        existed: false
      };
    }).catch(function(error){
      if (error && error.code === 'auth/email-already-in-use') {
        return { auth: auth, user: null, uid: '', created: false, existed: true };
      }
      throw error;
    });
  }

  function authErrorText(error) {
    var code = safe(error && error.code);
    if (code === 'auth/operation-not-allowed') return 'Firebase Authentication chưa bật phương thức Email/Mật khẩu.';
    if (code === 'auth/weak-password') return 'Mật khẩu tạm thời phải có ít nhất 6 ký tự.';
    if (code === 'auth/invalid-email') return 'Email đăng nhập không hợp lệ.';
    if (code === 'auth/too-many-requests') return 'Firebase đang tạm giới hạn thao tác. Vui lòng thử lại sau.';
    return safe(error && error.message) || 'Không tạo được tài khoản Firebase Authentication.';
  }

  function renderUserForm(scope, userKey) {
    scope = scope === 'edit' ? 'edit' : 'add';
    var box = $(scope === 'edit' ? 'rbac-edit-user-form-box' : 'rbac-add-user-form-box');
    if (!box) return;
    var users = normalizeUsers(window.SYS_DB_USERS || {});
    var u = userKey ? normalizeUser(users[userKey]) : null;
    var locked = !!(u && roleKey(u.role) === 'admin');
    var role = u ? roleKey(u.role) : 'level2';
    var perms = u ? normalizePermissions(u.permissions, role, u.features) : defaultPermissionsForRole(role);
    var prefix = 'rbac-' + scope + '-';
    var generatedPassword = scope === 'add' ? generateTemporaryPasswordValue() : '';

    var permRows = ACTIVE_PERMISSION_MODULES.map(function(k){
      return '<div class="rbac-user-perm-item"><label>' + esc(MODULES[k].label) + '</label>' + permissionSelect(k, perms[k], locked || k === 'admin', scope, role === 'guest') + '</div>';
    }).join('');

    var passwordField = scope === 'add' ?
      '<div class="rbac-field"><label>Mật khẩu tạm thời</label><div class="rbac-password-row"><input id="rbac-add-password" class="rbac-input" type="text" minlength="6" autocomplete="new-password" value="' + esc(generatedPassword) + '"><button class="rbac-password-generate" type="button" onclick="window.MKTRBAC.generatePassword()">Tạo lại</button></div></div>' : '';

    box.innerHTML = '<div class="rbac-user-form">' +
      '<input type="hidden" id="' + prefix + 'key" value="' + esc(userKey || '') + '">' +
      '<div class="rbac-user-basic-grid">' +
        '<div class="rbac-field"><label>Email đăng nhập</label><input id="' + prefix + 'email" class="rbac-input" type="email" placeholder="VD: 026.nongnghiepviet@gmail.com" value="' + esc(u && u.email || '') + '" ' + (u ? 'disabled' : '') + '></div>' +
        '<div class="rbac-field"><label>Tên hiển thị</label><input id="' + prefix + 'name" class="rbac-input" type="text" placeholder="Tên nhân sự" value="' + esc(u && u.name || '') + '" ' + (locked ? 'disabled' : '') + '></div>' +
        '<div class="rbac-field"><label>Phân quyền mặc định</label>' + roleOptionsScoped(role, locked, scope) + '</div>' + passwordField +
      '</div>' +
      '<div class="rbac-inline-note">' + (scope === 'add' ?
        'Bấm lưu một lần để hệ thống tự tạo tài khoản trong <b>Firebase Authentication</b> và đồng thời lưu hồ sơ/quyền tại <b>system_settings/users</b>. Admin hiện tại không bị đăng xuất.' :
        'Cập nhật tên, cấp quyền và quyền riêng của user trực tiếp tại <b>system_settings/users</b> trên Firebase.') + '</div>' +
      '<div class="rbac-user-perm-grid">' + permRows + '</div>' +
      '<div class="rbac-actions rbac-form-actions"><button class="rbac-btn" onclick="window.MKTRBAC.saveUser(\'' + scope + '\')" ' + (locked ? 'disabled' : '') + '>' + (scope === 'edit' ? 'Cập nhật Firebase' : 'Tạo tài khoản và lưu Firebase') + '</button>' +
      '<button class="rbac-btn secondary" onclick="window.MKTRBAC.applyRoleDefault(\'' + scope + '\')" ' + (locked ? 'disabled' : '') + '>Áp quyền mặc định</button>' +
      (scope === 'edit' ? '<button class="rbac-btn secondary" onclick="window.MKTRBAC.closeUserModal()">Hủy</button>' : '<button class="rbac-btn secondary" onclick="window.MKTRBAC.resetAddUserForm()">Làm mới</button>') + '</div>' +
      (locked ? '<div class="rbac-lock">Tài khoản Quản trị hệ thống không cho chỉnh quyền hoặc hạ cấp.</div>' : '') +
      '</div>';

    var roleEl = $(prefix + 'role');
    if (roleEl) {
      syncUserFormPermissionLocks(scope, role, locked);
      roleEl.addEventListener('change', function(){
        applyRoleDefaultToForm(scope, roleEl.value);
        syncUserFormPermissionLocks(scope, roleEl.value, locked);
        toast('Đã áp quyền mặc định ' + roleLabel(roleEl.value) + '. Có thể tinh chỉnh riêng trước khi lưu Firebase.');
      });
    }
  }

  function readFormPermissions(scope) {
    scope = scope === 'edit' ? 'edit' : 'add';
    var role = roleKey(safe(($('rbac-' + scope + '-role') || {}).value || 'level2'));
    var out = defaultPermissionsForRole(role);
    Array.prototype.forEach.call(document.querySelectorAll('.rbac-user-perm-select[data-user-scope="' + scope + '"]'), function(sel){
      out[sel.getAttribute('data-perm')] = normalizePermissionValue(sel.value);
    });
    if (role === 'guest') out = clampGuestPermissions(out);
    if (role !== 'admin') out.admin = 'none';
    return out;
  }

  function applyRoleDefaultToForm(scope, role) {
    scope = scope === 'edit' ? 'edit' : 'add';
    var r = roleKey(role);
    var perms = defaultPermissionsForRole(r);
    Array.prototype.forEach.call(document.querySelectorAll('.rbac-user-perm-select[data-user-scope="' + scope + '"]'), function(sel){
      var k = sel.getAttribute('data-perm');
      if (sel.disabled && k === 'admin') return;
      var value = perms[k] || 'none';
      if (r === 'guest' && value === 'edit') value = 'view';
      sel.value = value;
    });
  }

  // =========================================================
  // V20.1 — FIREBASE SINGLE SOURCE OF TRUTH
  // Mọi thao tác quản trị tài khoản phải phản ánh vào Firebase thật.
  // Xóa user không được phép chỉ xóa UI/Realtime Database; phải xóa
  // Firebase Authentication trước, sau đó dọn hồ sơ + UID mapping.
  // =========================================================
  var RBAC_ADMIN_BRIDGE_STATE = {
    frame:null, channel:'', ready:false, confirmed:false, origin:'', targetWindow:null,
    readyPromise:null, resolveReady:null, rejectReady:null, pending:{}, listenerStarted:false
  };

  function rbacAdminBridgeChannel() {
    try {
      var bytes = new Uint8Array(18);
      window.crypto.getRandomValues(bytes);
      return Array.prototype.map.call(bytes, function(v){ return v.toString(16).padStart(2,'0'); }).join('');
    } catch(e) {
      return ('rbac_' + Date.now() + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,'');
    }
  }

  function isTrustedRbacBridgeOrigin(origin) {
    try {
      var host = new URL(origin).hostname.toLowerCase();
      return host === 'script.google.com' || host === 'script.googleusercontent.com' || host.endsWith('-script.googleusercontent.com');
    } catch(e) { return false; }
  }

  function startRbacAdminBridgeListener() {
    if (RBAC_ADMIN_BRIDGE_STATE.listenerStarted) return;
    RBAC_ADMIN_BRIDGE_STATE.listenerStarted = true;
    window.addEventListener('message', function(event){
      if (!isTrustedRbacBridgeOrigin(event.origin)) return;
      var message = event.data || {};
      if (message.bridgeChannel !== RBAC_ADMIN_BRIDGE_STATE.channel) return;

      if (message.type === 'MKT_META_ADS_BRIDGE_READY_V3') {
        RBAC_ADMIN_BRIDGE_STATE.targetWindow = event.source;
        RBAC_ADMIN_BRIDGE_STATE.origin = event.origin;
        RBAC_ADMIN_BRIDGE_STATE.ready = true;
        try {
          event.source.postMessage({
            type:'MKT_META_ADS_BRIDGE_ACK_V3',
            bridgeChannel:RBAC_ADMIN_BRIDGE_STATE.channel
          }, event.origin);
        } catch(e) {
          if (RBAC_ADMIN_BRIDGE_STATE.rejectReady) RBAC_ADMIN_BRIDGE_STATE.rejectReady(e);
        }
        return;
      }

      if (message.type === 'MKT_META_ADS_BRIDGE_CONFIRMED_V3') {
        RBAC_ADMIN_BRIDGE_STATE.confirmed = true;
        if (RBAC_ADMIN_BRIDGE_STATE.resolveReady) RBAC_ADMIN_BRIDGE_STATE.resolveReady(true);
        RBAC_ADMIN_BRIDGE_STATE.resolveReady = null;
        RBAC_ADMIN_BRIDGE_STATE.rejectReady = null;
        return;
      }

      if (message.type === 'MKT_META_ADS_BRIDGE_DENIED_V3') {
        var err = new Error('Apps Script từ chối kết nối quản trị tài khoản.');
        if (RBAC_ADMIN_BRIDGE_STATE.rejectReady) RBAC_ADMIN_BRIDGE_STATE.rejectReady(err);
        return;
      }

      if (message.type !== 'MKT_SYSTEM_ADMIN_RESPONSE_V1') return;
      if (RBAC_ADMIN_BRIDGE_STATE.targetWindow && event.source !== RBAC_ADMIN_BRIDGE_STATE.targetWindow) return;
      if (RBAC_ADMIN_BRIDGE_STATE.origin && event.origin !== RBAC_ADMIN_BRIDGE_STATE.origin) return;
      var requestId = safe(message.requestId);
      var pending = RBAC_ADMIN_BRIDGE_STATE.pending[requestId];
      if (!pending) return;
      clearTimeout(pending.timeout);
      delete RBAC_ADMIN_BRIDGE_STATE.pending[requestId];
      if (message.success) pending.resolve(message.result || {});
      else pending.reject(new Error(message.error && message.error.message ? message.error.message : 'Không thực hiện được thao tác Firebase Admin.'));
    });
  }

  function ensureRbacAdminBridgeReady() {
    startRbacAdminBridgeListener();
    if (RBAC_ADMIN_BRIDGE_STATE.ready && RBAC_ADMIN_BRIDGE_STATE.confirmed && RBAC_ADMIN_BRIDGE_STATE.targetWindow) return Promise.resolve(true);
    if (RBAC_ADMIN_BRIDGE_STATE.readyPromise) return RBAC_ADMIN_BRIDGE_STATE.readyPromise;
    RBAC_ADMIN_BRIDGE_STATE.readyPromise = new Promise(function(resolve,reject){
      RBAC_ADMIN_BRIDGE_STATE.resolveReady = resolve;
      RBAC_ADMIN_BRIDGE_STATE.rejectReady = reject;
      if (!window.META_ADS_BRIDGE_URL) return reject(new Error('Chưa cấu hình Apps Script Bridge.'));
      if (!RBAC_ADMIN_BRIDGE_STATE.channel) RBAC_ADMIN_BRIDGE_STATE.channel = rbacAdminBridgeChannel();
      var url = new URL(window.META_ADS_BRIDGE_URL);
      url.searchParams.set('bridge_channel', RBAC_ADMIN_BRIDGE_STATE.channel);
      url.searchParams.set('_rbac_admin_v', Date.now().toString());
      var frame = document.createElement('iframe');
      frame.id = 'mkt-rbac-admin-bridge-frame';
      frame.src = url.toString();
      frame.setAttribute('aria-hidden','true');
      frame.setAttribute('tabindex','-1');
      frame.style.cssText = 'position:fixed;width:2px;height:2px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;border:0;';
      RBAC_ADMIN_BRIDGE_STATE.frame = frame;
      document.body.appendChild(frame);
      setTimeout(function(){
        if (!RBAC_ADMIN_BRIDGE_STATE.confirmed) {
          RBAC_ADMIN_BRIDGE_STATE.readyPromise = null;
          reject(new Error('Apps Script quản trị tài khoản không phản hồi.'));
        }
      }, 20000);
    });
    return RBAC_ADMIN_BRIDGE_STATE.readyPromise;
  }

  function requestFirebaseAdminAction(action, payload) {
    if (!window.sysAuth || !window.sysAuth.currentUser) return Promise.reject(new Error('Chưa đăng nhập Firebase.'));
    var user = window.sysAuth.currentUser;
    return Promise.all([ensureRbacAdminBridgeReady(), user.getIdToken(true)]).then(function(results){
      var requestId = 'RBAC-' + Date.now() + '-' + Math.random().toString(36).slice(2,10);
      return new Promise(function(resolve,reject){
        var timeout = setTimeout(function(){
          delete RBAC_ADMIN_BRIDGE_STATE.pending[requestId];
          reject(new Error('Thao tác Firebase Admin phản hồi quá thời gian.'));
        }, 60000);
        RBAC_ADMIN_BRIDGE_STATE.pending[requestId] = {resolve:resolve,reject:reject,timeout:timeout};
        RBAC_ADMIN_BRIDGE_STATE.targetWindow.postMessage({
          type:'MKT_SYSTEM_ADMIN_REQUEST_V1',
          bridgeChannel:RBAC_ADMIN_BRIDGE_STATE.channel,
          requestId:requestId,
          payload:Object.assign({}, payload || {}, {
            action:safe(action),
            firebaseIdToken:results[1]
          })
        }, RBAC_ADMIN_BRIDGE_STATE.origin);
      });
    });
  }

  function invalidateAppsScriptUserCacheQuietly() {
    requestFirebaseAdminAction('invalidate_users_cache', {}).catch(function(){ return null; });
  }

  function saveUserFromForm(scope) {
    if (!isAdminUser()) return toast('Chỉ Quản trị hệ thống mới được lưu phân quyền.');
    scope = scope === 'edit' ? 'edit' : 'add';
    var prefix = 'rbac-' + scope + '-';
    var key = safe(($(prefix + 'key') || {}).value);
    var emailEl = $(prefix + 'email'), nameEl = $(prefix + 'name'), roleEl = $(prefix + 'role');
    var email = safe(emailEl && emailEl.value).trim().toLowerCase();
    var name = safe(nameEl && nameEl.value).trim();
    var role = roleKey(roleEl && roleEl.value);
    var users = normalizeUsers(window.SYS_DB_USERS || {});
    var password = scope === 'add' ? safe(($('rbac-add-password') || {}).value) : '';

    if (!email || email.indexOf('@') === -1) return toast('Email không hợp lệ.');
    if (!name) return toast('Vui lòng nhập tên hiển thị.');
    if (scope === 'add' && password.length < 6) return toast('Mật khẩu tạm thời phải có ít nhất 6 ký tự.');
    if (key && users[key] && roleKey(users[key].role) === 'admin') return toast('Không được thay đổi quyền của Quản trị hệ thống.');
    if (role === 'admin') return toast('Không tạo hoặc nâng quyền Quản trị hệ thống từ giao diện này.');

    if (!key) {
      var duplicateKey = Object.keys(users).find(function(k){ return safe((users[k] || {}).email).toLowerCase() === email; });
      if (duplicateKey) return toast('Email này đã có trong danh sách phân quyền. Hãy bấm Sửa tại tài khoản hiện có.');
    }

    var permissions = normalizePermissions(readFormPermissions(scope), role);
    if (role === 'guest') permissions = clampGuestPermissions(permissions);
    var now = new Date().toISOString();
    var data = {
      email: email,
      name: name,
      role: role,
      permissions: permissions,
      features: permissionsToFeatures(permissions),
      permissionMode: 'user_override',
      roleDefaultSnapshot: defaultPermissionsForRole(role),
      updatedAt: now
    };
    if (!key) data.createdAt = now;
    var db = window.sysDb;
    if (!db) return toast('Không kết nối được Firebase Database.');

    var saveKey = key || email.replace(/[.#$\[\]@]/g, '_');

    function finishDatabaseSave(authResult) {
      var existingUser = users[saveKey] || {};
      var effectiveUid = safe((authResult && authResult.uid) || data.authUid || existingUser.authUid);

      if (authResult) {
        if (authResult.uid) data.authUid = authResult.uid;
        else if (existingUser.authUid) data.authUid = existingUser.authUid;
        data.authStatus = authResult.created ? 'created' : (authResult.existed ? 'already_exists' : 'unknown');
        data.authSyncedAt = now;
      } else if (existingUser.authUid) {
        data.authUid = existingUser.authUid;
      }

      var updates = {};
      Object.keys(data).forEach(function(field){
        updates[USER_PATH + '/' + saveKey + '/' + field] = data[field];
      });

      if (effectiveUid) {
        updates[UID_USER_MAP_PATH + '/' + effectiveUid] = saveKey;
        updates[PERMISSIONS_BY_UID_PATH + '/' + effectiveUid] = {
          userKey: saveKey,
          email: email,
          name: name,
          role: role,
          permissions: copy(permissions),
          updatedAt: now
        };
      }

      return db.ref().update(updates).then(function(){
        users[saveKey] = Object.assign({}, users[saveKey] || {}, data);
        window.SYS_DB_USERS = users;
        if (scope === 'edit') closeUserEditModal();
        renderAdminPermissionUI();
        if (scope === 'add') setTimeout(function(){ switchCreateTab('user'); }, 0);
        applyCurrentPermissions();
        // V20.1: Firebase đã đổi thì xóa cache user phía Apps Script để quyền/Meta nhận ngay.
        invalidateAppsScriptUserCacheQuietly();

        if (scope === 'add') {
          if (authResult && authResult.created) toast('Đã tạo tài khoản đăng nhập và lưu quyền của ' + name + ' trên Firebase.');
          else if (authResult && authResult.existed) toast('Email đã tồn tại trong Firebase Authentication; hệ thống đã cập nhật hồ sơ và quyền của ' + name + '.');
          else toast('Đã thêm người dùng ' + name + ' trên Firebase.');
        } else {
          toast('Đã cập nhật quyền của ' + name + ' trực tiếp trên Firebase.');
        }
      }).catch(function(dbError){
        if (authResult && authResult.created && authResult.user && typeof authResult.user.delete === 'function') {
          return authResult.user.delete().catch(function(){ return null; }).then(function(){ throw dbError; });
        }
        throw dbError;
      }).finally(function(){
        if (authResult && authResult.auth) authResult.auth.signOut().catch(function(){ return null; });
      });
    }

    if (scope === 'edit') {
      finishDatabaseSave(null).catch(function(e){ toast('Lỗi cập nhật Firebase: ' + safe(e && e.message)); });
      return;
    }

    toast('Đang tạo tài khoản Firebase và lưu phân quyền...');
    provisionFirebaseAuthUser(email, password).then(function(authResult){
      return finishDatabaseSave(authResult);
    }).catch(function(error){
      toast('Lỗi tạo người dùng: ' + authErrorText(error));
    });
  }


  function openUserEditModal(key) {
    var users = normalizeUsers(window.SYS_DB_USERS || {});
    var u = users[key];
    if (!u) return toast('Không tìm thấy tài khoản cần sửa.');
    if (roleKey(u.role) === 'admin') return toast('Tài khoản Quản trị hệ thống được khóa.');
    var modal = portalUserModalToBody();
    if (!modal) {
      renderAdminPermissionUI();
      modal = portalUserModalToBody();
    }
    renderUserForm('edit', key);
    var title = $('rbac-user-modal-title');
    if (title) title.innerText = 'Chỉnh quyền: ' + (u.name || u.email);
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('rbac-modal-open');
    }
  }

  function closeUserEditModal() {
    var modal = $('rbac-user-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('rbac-modal-open');
  }

  function resetAddUserForm() {
    renderUserForm('add', null);
  }

  function deleteUserByKey(key) {
    if (!isAdminUser()) return toast('Chỉ Admin mới được xóa tài khoản.');
    var users = normalizeUsers(window.SYS_DB_USERS || {});
    var u = users[key];
    if (!u) return;
    if (roleKey(u.role) === 'admin') return toast('Không được xóa tài khoản Admin.');
    if (!confirm('Xóa hoàn toàn tài khoản [' + (u.name || u.email) + '] khỏi Firebase Authentication và hệ thống?')) return;
    if (!window.sysDb) return toast('Không kết nối được Firebase Database.');

    var linkedUid = safe(u.authUid);
    toast('Đang xóa tài khoản khỏi Firebase Authentication và dữ liệu hệ thống...');

    // Fail-closed: nếu backend Auth không xóa được thì KHÔNG xóa riêng hồ sơ RTDB.
    // Như vậy giao diện và Firebase không rơi vào trạng thái lệch nhau.
    requestFirebaseAdminAction('delete_user', {
      userKey:key,
      authUid:linkedUid,
      email:safe(u.email),
      name:safe(u.name)
    }).then(function(result){
      if (!result || result.success !== true) {
        throw new Error(result && result.error ? result.error : 'Firebase chưa xác nhận xóa hoàn toàn tài khoản.');
      }

      delete users[key];
      window.SYS_DB_USERS = users;
      renderAdminPermissionUI();
      applyCurrentPermissions();
      toast('Đã xóa hoàn toàn ' + (u.name || u.email) + ' khỏi Firebase Authentication và hệ thống.');
    }).catch(function(error){
      toast('Không xóa tài khoản: ' + safe(error && error.message) + '. Hệ thống giữ nguyên dữ liệu để tránh lệch Firebase.');
    });
  }

  function patchOldAdminFunctions() {
    window.adminSaveUser = function(){ saveUserFromForm('add'); };
    window.adminDeleteUser = function(key){ deleteUserByKey(key); };
    window.adminEditUser = function(key){ openUserEditModal(key); };
    window.adminCancelEdit = closeUserEditModal;
  }

  function observeDom() {
    if (window.__MKT_RBAC_OBSERVER) return;
    var timer = null;
    var observer = new MutationObserver(function(){
      clearTimeout(timer);
      timer = setTimeout(function(){
        ensureAccountMenus();
        // DOM động chỉ cần khóa các control ghi mới sinh ra. Không repaint menu mỗi mutation.
        if (window.MKT_PERMISSIONS) applyUploadAndWriteLocks();
        wrapWriteFunctions();
      }, 180);
    });
    observer.observe(document.body, { childList:true, subtree:true });
    window.__MKT_RBAC_OBSERVER = observer;
  }

  function handleDirectHash() {
    // Router V2 giữ deep-link trong lúc chưa đăng nhập/RBAC đang boot.
    // Chỉ cưỡng chế quyền khi Firebase Auth + system_settings/users đã sẵn sàng.
    var authUser = window.sysAuth && window.sysAuth.currentUser;
    if (!authUser) return;
    if (document.body && document.body.classList.contains(BOOT_GATE_CLASS)) return;
    if (!usersConfigLoaded() && !ADMIN_UID_FLAG && window.myIdentity !== 'SUPER_ADMIN') return;

    if (window.MKTRouter && typeof window.MKTRouter.enforceCurrentRoute === 'function') {
      window.MKTRouter.enforceCurrentRoute();
      return;
    }

    var raw = (location.hash || '').replace(/^#\/?/, '');
    var p = raw.split('?')[0] || '';
    if (!p) return;
    var moduleKey = getModuleFromPage(p);
    if (!canAccess(moduleKey) || (p === 'admin' && !isAdminUser())) {
      toast('Bạn chưa được cấp quyền truy cập mục này.');
      if (window.goPage) window.goPage('home');
      else location.hash = '#/home';
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    injectAdminCss();
    ensureAccountMenus();
    setBootGate(true, 'boot');
    forceHideProtectedMenus('boot');
    loadCustomRoles();
    loadRoleDefaults();
    bindAdminUidFlag(true);
    patchBuildUsers();
    patchGoPage();
    patchAuthLogout();
    patchGuestLoginNotice();
    patchOldAdminFunctions();
    wrapWriteFunctions();
    installReadonlyInteractionGuard();
    patchGuestDatabaseWriteShield();
    observeDom();
    applyCurrentPermissions();
    if ((location.hash || '').replace('#','') === 'admin') { setTimeout(renderAdminPermissionUI, 120); }

    if (window.sysAuth && !window.__MKT_RBAC_AUTH_STATE_WATCH) {
      window.__MKT_RBAC_AUTH_STATE_WATCH = true;
      try {
        window.sysAuth.onAuthStateChanged(function(user){
          if (!user) {
            setBootGate(true, 'logged-out');
            unbindAdminUidFlag();
            LAST_AUTH_UID = '';
            forceHideProtectedMenus('logged-out');
          } else {
            setBootGate(true, 'auth-change');
            forceHideProtectedMenus('auth-change');
            syncAuthSessionState();
            setTimeout(function(){ applyCurrentPermissions(); renderAdminPermissionUI(); }, 80);
            setTimeout(function(){ applyCurrentPermissions(); }, 300);
            setTimeout(function(){ applyCurrentPermissions(); }, 800);
            setTimeout(function(){ applyCurrentPermissions(); }, 1500);
          }
        });
      } catch(e) { console.warn('Không gắn được watcher phiên RBAC:', e); }
    }

    window.addEventListener('hashchange', function(){ setTimeout(function(){ handleDirectHash(); applyCurrentPermissions(); }, 60); });
    setInterval(function(){ ensureAccountMenus(); patchAuthLogout(); patchGuestLoginNotice(); wrapWriteFunctions(); patchGuestDatabaseWriteShield(); applyCurrentPermissions(); }, 1200);
  }

  window.MKTRBAC = {
    version: VERSION,
    roles: ROLES,
    modules: MODULES,
    activePermissionModules: ACTIVE_PERMISSION_MODULES.slice(),
    defaults: getRoleDefaultsSource(),
    normalizeUsers: normalizeUsers,
    normalizeUser: normalizeUser,
    getCurrentPermissions: getCurrentPermissions,
    canAccess: canAccess,
    canEdit: canEdit,
    apply: applyCurrentPermissions,
    renderAdmin: renderAdminPermissionUI,
    editUser: openUserEditModal,
    closeUserModal: closeUserEditModal,
    cancelEdit: closeUserEditModal,
    resetAddUserForm: resetAddUserForm,
    generatePassword: regenerateTemporaryPassword,
    switchCreateTab: switchCreateTab,
    applyRoleDefault: function(scope){ scope = scope === 'edit' ? 'edit' : 'add'; applyRoleDefaultToForm(scope, safe(($('rbac-' + scope + '-role') || {}).value || 'level2')); },
    saveRoleDefaults: saveRoleDefaultsFromForm,
    createCustomRole: createCustomRoleFromForm,
    deleteCustomRole: deleteCustomRoleByKey,
    resetRoleDefaultsForm: resetRoleDefaultsForm,
    renderRoleDefaultRows: renderRoleDefaultRows,
    saveUser: function(scope){ saveUserFromForm(scope || 'add'); },
    deleteUser: deleteUserByKey,
    roleLabel: roleLabel,
    isAdmin: isAdminUser,
    isGuestReadOnly: isGuestReadOnlySession,
    setBootGate: setBootGate,
    forceHideProtectedMenus: forceHideProtectedMenus,
    closeAccountMenu: closeAccountMenus,
    firebaseAdminAction: requestFirebaseAdminAction,
    loginGoogleWorkspace: loginGoogleWorkspaceFromGuest,
    isWorkspaceDefaultSession: isUnregisteredWorkspaceSessionV206,
    workspaceDefaultPermissions: workspaceDefaultPermissionsV206,
    showMetaGuestNotice: showMetaGuestNotice,
    renderMetaGuestInlineNotice: renderMetaGuestInlineNotice,
    showMetaAccessNotice: showMetaAccessNoticeV207,
    closeMetaAccessNotice: closeMetaAccessNoticeV207,
    maybeShowPendingGuestNotice: maybeShowPendingGuestNotice,
    isAnonymousMetaGuest: isMetaGuestSessionReady,
    isMetaGuestSession: isMetaGuestSessionReady
  };

  function waitForCore() {
    if (window.goPage && window.buildSystemUsersUI) boot();
    else setTimeout(waitForCore, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForCore);
  else waitForCore();
})();


/* ===== V20.8 GUEST META ALERT VISUAL ===== */
(function installRbacV208GuestAlertStyle(){
  if (document.getElementById('mkt-rbac-v208-guest-alert-style')) return;
  var style = document.createElement('style');
  style.id = 'mkt-rbac-v208-guest-alert-style';
  style.textContent = [
    '.mkt-meta-guest-notice-title{color:#d93025!important;text-shadow:0 1px 0 rgba(217,48,37,.04);}',
    '#mkt-meta-guest-inline-notice{border-color:#fecaca!important;background:linear-gradient(135deg,#fff5f4,#ffffff)!important;box-shadow:0 10px 24px rgba(217,48,37,.07)!important;}',
    '#mkt-meta-guest-inline-notice strong{color:#d93025!important;font-weight:900!important;}',
    '#mkt-meta-guest-inline-notice small{color:#7f1d1d!important;}',
    '#mkt-meta-guest-inline-notice .mkt-meta-guest-google-btn{background:linear-gradient(135deg,#2563eb,#1d4ed8)!important;color:#fff!important;border:0!important;box-shadow:0 10px 22px rgba(37,99,235,.22)!important;}',
    '@media(max-width:700px){#mkt-meta-guest-inline-notice{display:grid!important;grid-template-columns:1fr!important;}#mkt-meta-guest-inline-notice .mkt-meta-guest-google-btn{width:100%!important;min-height:44px!important;}}'
  ].join('');
  document.head.appendChild(style);
})();

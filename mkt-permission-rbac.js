/**
 * MKT PERMISSION RBAC V2.0
 * File phân quyền riêng cho Marketing System Blogspot.
 * - Vai trò: Admin, Trưởng phòng, Phó phòng, Nhân viên MKT, Nhân viên Sale, Ban Lãnh Đạo, Khách
 * - Quyền theo module: none / view / edit
 * - Admin là quyền cao nhất, không cho chỉnh/xóa hoặc hạ quyền Admin.
 * - Tương thích dữ liệu cũ: features boolean -> permissions string.
 */
(function () {
  'use strict';

  var VERSION = 'MKT_RBAC_V3.0_ROLE_DEFAULTS_ADMIN_FONT_ONLY';
  var USER_PATH = 'system_settings/users';
  var ROLE_DEFAULTS_PATH = 'system_settings/role_permissions';
  var ACTIVE_ROLE_PERMISSIONS = null;
  var booted = false;
  var original = {};

  var MODULES = {
    home: { label: 'Trang chủ', page: 'home', navSelector: '.nav-link[data-page="home"]', alwaysVisible: true },
    report: { label: 'Báo cáo CV', page: 'report', navSelector: '.nav-link[data-page="report"]' },
    plan: { label: 'Hiệu suất MKT', page: 'plan', navSelector: '.nav-link[data-page="plan"]' },
    ads: { label: 'Hiệu quả Ads', page: 'ads', navSelector: '.nav-link[data-page="ads"]' },
    kpi: { label: 'KPI / Dashboard tổng', page: 'kpi', navSelector: '.nav-link[data-page="kpi"]' },
    ecom: { label: 'Dashboard TMĐT', page: 'ecom-main', navSelector: '.nav-dropdown[data-group="ecom"], .nav-link[data-group="ecom"]' },
    price: { label: 'Thiết lập giá', page: 'price-setting' },
    compose: { label: 'Soạn đơn', page: 'compose', navSelector: '.nav-link[data-page="compose"]' },
    admin: { label: 'Quản trị phân quyền', page: 'admin', navSelector: '#admin-tools' }
  };

  var PAGE_TO_MODULE = {
    home: 'home',
    report: 'report',
    plan: 'plan',
    ads: 'ads',
    kpi: 'kpi',
    'ecom-main': 'ecom',
    shopee: 'ecom',
    tiktok: 'ecom',
    'price-setting': 'price',
    compose: 'compose',
    admin: 'admin'
  };

  var ROLES = {
    admin: { label: 'Admin', icon: '🛡️' },
    boss: { label: 'Trưởng phòng', icon: '👑' },
    manager: { label: 'Phó phòng', icon: '⭐' },
    mkt: { label: 'Nhân viên MKT', icon: '📣' },
    sale: { label: 'Nhân viên Sale', icon: '🧾' },
    leader: { label: 'Ban Lãnh Đạo (Sếp)', icon: '🏛️' },
    guest: { label: 'Khách', icon: '👀' }
  };

  var ROLE_ALIAS = {
    super_admin: 'admin',
    staff: 'mkt',
    marketing: 'mkt',
    employee: 'mkt',
    deputy: 'manager',
    boss: 'boss',
    manager: 'manager',
    admin: 'admin',
    mkt: 'mkt',
    sale: 'sale',
    leader: 'leader',
    guest: 'guest'
  };

  var DEFAULT_ROLE_PERMISSIONS = {
    admin:   { report:'edit', plan:'edit', ads:'edit', kpi:'edit', ecom:'edit', price:'edit', compose:'edit', admin:'edit' },
    boss:    { report:'edit', plan:'edit', ads:'edit', kpi:'edit', ecom:'edit', price:'edit', compose:'edit', admin:'none' },
    manager: { report:'edit', plan:'edit', ads:'edit', kpi:'edit', ecom:'edit', price:'edit', compose:'edit', admin:'none' },
    mkt:     { report:'edit', plan:'view', ads:'edit', kpi:'view', ecom:'view', price:'none', compose:'none', admin:'none' },
    sale:    { report:'edit', plan:'none', ads:'view', kpi:'view', ecom:'view', price:'view', compose:'edit', admin:'none' },
    leader:  { report:'view', plan:'view', ads:'view', kpi:'view', ecom:'view', price:'view', compose:'view', admin:'none' },
    guest:   { report:'view', plan:'view', ads:'view', kpi:'view', ecom:'view', price:'none', compose:'none', admin:'none' }
  };

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

  function roleKey(role) {
    var r = safe(role || 'mkt').toLowerCase().trim();
    return ROLE_ALIAS[r] || r || 'mkt';
  }

  function roleLabel(role) {
    var r = roleKey(role);
    return (ROLES[r] ? (ROLES[r].icon + ' ' + ROLES[r].label) : r);
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

  function mergeRoleDefaults(data) {
    var base = copy(DEFAULT_ROLE_PERMISSIONS);
    data = data || {};
    Object.keys(ROLES).forEach(function (role) {
      base[role] = base[role] || {};
      var saved = data[role] || {};
      Object.keys(base[role]).forEach(function (moduleKey) {
        if (role === 'admin') {
          base[role][moduleKey] = 'edit';
        } else if (Object.prototype.hasOwnProperty.call(saved, moduleKey)) {
          base[role][moduleKey] = normalizePermissionValue(saved[moduleKey]);
        }
      });
      if (role !== 'admin') base[role].admin = 'none';
    });
    return base;
  }

  function getRoleDefaultsSource() {
    return ACTIVE_ROLE_PERMISSIONS || DEFAULT_ROLE_PERMISSIONS;
  }

  function defaultPermissionsForRole(role) {
    var r = roleKey(role);
    var source = getRoleDefaultsSource();
    return copy(source[r] || source.mkt || DEFAULT_ROLE_PERMISSIONS.mkt);
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
      console.warn('Không tải được quyền mặc định theo vai trò:', e);
      ACTIVE_ROLE_PERMISSIONS = mergeRoleDefaults({});
    }
  }

  function featuresToPermissions(features, role) {
    var out = defaultPermissionsForRole(role);
    if (!features) return out;
    Object.keys(out).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(features, key)) {
        out[key] = features[key] ? 'edit' : 'none';
      }
    });
    // dữ liệu cũ dùng ecom chung cho Shopee/TikTok/Thiết lập giá.
    if (Object.prototype.hasOwnProperty.call(features, 'ecom')) {
      out.ecom = features.ecom ? (out.ecom === 'none' ? 'view' : out.ecom) : 'none';
      if (!Object.prototype.hasOwnProperty.call(features, 'price')) out.price = features.ecom ? (out.price || 'view') : 'none';
    }
    return out;
  }

  function permissionsToFeatures(perms) {
    var p = perms || {};
    return {
      report: p.report !== 'none',
      plan: p.plan !== 'none',
      ads: p.ads !== 'none',
      kpi: p.kpi !== 'none',
      ecom: p.ecom !== 'none' || p.price !== 'none',
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
    if (r === 'guest') return defaultPermissionsForRole('guest');
    base.admin = 'none';
    return base;
  }

  function normalizeUser(u) {
    u = Object.assign({}, u || {});
    u.role = roleKey(u.role || (u.isGuest ? 'guest' : 'mkt'));
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

  function isAdminUser(user) {
    user = user || (findUserByIdentity() || {}).user;
    return !!(user && (roleKey(user.role) === 'admin' || window.myIdentity === 'SUPER_ADMIN'));
  }

  function getCurrentPermissions() {
    var found = findUserByIdentity();
    if (!found || !found.user) return defaultPermissionsForRole('guest');
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
    return normalizePermissionValue(perms[moduleKey]);
  }

  function canAccess(moduleKey) { return permissionFor(moduleKey) !== 'none'; }
  function canEdit(moduleKey) { return permissionFor(moduleKey) === 'edit'; }

  function setDisplay(nodes, visible) {
    Array.prototype.forEach.call(nodes || [], function (el) {
      if (!el) return;
      if (!el.dataset.rbacDisplay) el.dataset.rbacDisplay = el.style.display || '';
      el.style.display = visible ? (el.dataset.rbacDisplay || '') : 'none';
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

  function applyMenuPermissions() {
    Object.keys(MODULES).forEach(function (key) {
      var mod = MODULES[key];
      if (mod.alwaysVisible) return;
      var visible = canAccess(key);
      if (mod.navSelector) hideBySelector(mod.navSelector, visible);
      if (mod.page) hideGoPageButtons(mod.page, visible);
    });

    // Nhóm TMĐT dùng các page con.
    ['ecom-main','shopee','tiktok'].forEach(function(p){ hideGoPageButtons(p, canAccess('ecom')); });
    hideGoPageButtons('price-setting', canAccess('price'));

    var adminTools = $('admin-tools');
    if (adminTools) adminTools.style.display = isAdminUser() ? 'block' : 'none';
  }

  function pageKeyFromElement(el) {
    if (!el || !el.id || el.id.indexOf('page-') !== 0) return '';
    return el.id.replace('page-', '');
  }

  function applyReadonlyToPage(page, moduleKey) {
    var pageEl = $('page-' + page);
    if (!pageEl) return;
    var mode = permissionFor(moduleKey);
    var readonly = (mode === 'view');

    pageEl.classList.toggle('mkt-rbac-view-only', readonly);
    pageEl.classList.toggle('mkt-rbac-no-access', mode === 'none');

    if (!readonly) return;

    // Chỉ khóa thao tác ghi, vẫn cho select/input lọc ngày hoạt động ở các dashboard.
    if (moduleKey === 'report') {
      Array.prototype.forEach.call(pageEl.querySelectorAll('textarea, input[type="text"], input[type="number"]'), function(el){ el.disabled = true; });
      Array.prototype.forEach.call(pageEl.querySelectorAll('.btn-save, .btn-add, .btn-del, button[onclick*="save"], button[onclick*="add"], button[onclick*="delete"], button[onclick*="Delete"]'), function(btn){ btn.style.display = 'none'; });
    }

    if (moduleKey === 'compose' || moduleKey === 'price') {
      Array.prototype.forEach.call(pageEl.querySelectorAll('input, textarea, select'), function(el){ el.disabled = true; });
      Array.prototype.forEach.call(pageEl.querySelectorAll('button'), function(btn){
        var txt = safe(btn.innerText).toLowerCase();
        if (/lưu|xóa|thêm|tải|upload|nhập|import|xuất/.test(txt)) btn.style.display = 'none';
      });
    }
  }

  function applyUploadAndWriteLocks() {
    // Ads: module này đã hiểu USER_PERMISSIONS.ads='view', nhưng vẫn khóa DOM thêm cho chắc.
    var adsMode = permissionFor('ads');
    if (adsMode === 'view' || adsMode === 'none') {
      hideBySelector('#ads-upload-area, #upload-buttons-row, #revenue-file-input, #statement-file-input, .delete-btn-admin', false);
    }

    // TMĐT: Shopee/TikTok upload và nút xóa nằm trong module riêng.
    var ecomMode = permissionFor('ecom');
    if (ecomMode === 'view' || ecomMode === 'none') {
      hideBySelector('.ss-upload-btn, .ss-delete-btn, #ss-file-input, .tt-upload-btn, .tt-delete-btn, #tt-file-input', false);
      hideBySelector('input[type="file"]#ss-file-input, input[type="file"]#tt-file-input', false);
    }

    // Thiết lập giá.
    if (permissionFor('price') === 'view' || permissionFor('price') === 'none') {
      var pricePage = $('page-price-setting');
      if (pricePage) {
        Array.prototype.forEach.call(pricePage.querySelectorAll('button'), function(btn){
          var txt = safe(btn.innerText).toLowerCase();
          if (/lưu|xóa|thêm|upload|tải|nhập|import|cập nhật/.test(txt)) btn.style.display = 'none';
        });
      }
    }

    // Tất cả page đang mở.
    Array.prototype.forEach.call(document.querySelectorAll('.page'), function(pg){
      var p = pageKeyFromElement(pg);
      if (!p) return;
      applyReadonlyToPage(p, getModuleFromPage(p));
    });
  }

  function applyCurrentPermissions() {
    var found = findUserByIdentity();
    var role = found && found.user ? roleKey(found.user.role) : (safe(window.myIdentity).indexOf('Khách') !== -1 ? 'guest' : 'mkt');
    var perms = getCurrentPermissions();

    // Biến tương thích module cũ.
    window.MKT_CURRENT_ROLE = role;
    window.MKT_PERMISSIONS = perms;
    window.USER_PERMISSIONS = perms;
    window.MKT_PERMISSION_VERSION = VERSION;

    // Đồng bộ lại role label ở Home.
    var roleEl = $('home-role-label');
    if (roleEl) roleEl.innerText = ROLES[role] ? ROLES[role].label : role;

    applyMenuPermissions();
    applyUploadAndWriteLocks();
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
      ['saveReportOnly','report'], ['saveReceivedDeadlines','report'], ['saveAssignedDeadlines','report'],
      ['addRow','report'], ['addAssignRow','report'], ['addLpRow','report'], ['saveLpData','report'],
      ['deleteUploadBatch','ads'], ['handleRevenueUpload','ads'], ['handleStatementUpload','ads'],
      ['triggerRevenueUpload','ads'], ['triggerStatementUpload','ads'],
      ['deleteShopeeStatsBatch','ecom'], ['deleteTiktokBatch','ecom'],
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
        return original.goPage.call(window, 'home');
      }
      if (p === 'admin' && !isAdminUser()) {
        toast('Chỉ Admin mới được vào Quản trị phân quyền.');
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
      }
    };
    fn.__rbacWrapped = true;
    window.buildSystemUsersUI = fn;
  }

  function optionHtml(value, current) {
    var labels = { none:'Ẩn menu', view:'Truy cập / Chỉ xem', edit:'Chỉnh sửa' };
    return '<option value="' + value + '" ' + (current === value ? 'selected' : '') + '>' + labels[value] + '</option>';
  }

  function permissionSelect(moduleKey, value, disabled) {
    value = normalizePermissionValue(value);
    return '<select class="rbac-perm-select" data-perm="' + esc(moduleKey) + '" ' + (disabled ? 'disabled' : '') + '>' +
      optionHtml('none', value) + optionHtml('view', value) + optionHtml('edit', value) + '</select>';
  }

  function roleOptions(current, disabled) {
    current = roleKey(current);
    return '<select id="rbac-role" class="rbac-input" ' + (disabled ? 'disabled' : '') + '>' +
      Object.keys(ROLES).map(function(k){ return '<option value="' + k + '" ' + (k === current ? 'selected' : '') + '>' + ROLES[k].icon + ' ' + ROLES[k].label + '</option>'; }).join('') +
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
      .mkt-rbac-view-only .rbac-hide-on-view{display:none!important;}
      .rbac-admin-shell,
      .rbac-admin-shell *{
        font-family:Tahoma,Arial,Verdana,sans-serif!important;
        letter-spacing:0!important;
        text-rendering:optimizeLegibility;
        -webkit-font-smoothing:antialiased;
        -moz-osx-font-smoothing:grayscale;
        font-synthesis-weight:none;
      }
      .rbac-admin-shell{color:#0f172a;display:flex;flex-direction:column;gap:18px;font-weight:400;line-height:1.45;}
      .rbac-hero{border:1px solid #dbeafe;background:linear-gradient(135deg,#eff6ff,#fff);border-radius:24px;padding:22px;box-shadow:0 10px 26px rgba(15,23,42,.05);}
      .rbac-title{font-size:22px;font-weight:700;margin:0 0 6px;color:#0f172a;letter-spacing:0!important;}
      .rbac-sub{color:#64748b;font-size:13px;line-height:1.6;font-weight:400;}
      .rbac-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;align-items:start;}
      .rbac-card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:16px;box-shadow:0 8px 22px rgba(15,23,42,.04);min-width:0;}
      .rbac-card-title{font-weight:700;margin-bottom:12px;color:#0f172a;display:flex;justify-content:space-between;gap:8px;align-items:center;}
      .rbac-table-wrap{width:100%;overflow:auto;border:1px solid #e2e8f0;border-radius:16px;}
      .rbac-table{width:100%;min-width:980px;border-collapse:separate;border-spacing:0;font-size:12px;}
      .rbac-table th{background:#f8fafc;color:#475569;text-transform:uppercase;font-size:10px;font-weight:700;letter-spacing:0!important;padding:10px;border-bottom:1px solid #e2e8f0;text-align:left;}
      .rbac-table td{padding:10px;border-bottom:1px solid #eef2f7;background:#fff;vertical-align:middle;font-weight:400;}
      .rbac-table tr:hover td{background:#f8fbff!important;}
      .rbac-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:700;background:#f1f5f9;color:#334155;white-space:nowrap;}
      .rbac-badge.admin{background:#fef2f2;color:#dc2626}.rbac-badge.boss{background:#fff7ed;color:#ea580c}.rbac-badge.manager{background:#fffbeb;color:#b45309}.rbac-badge.mkt{background:#eff6ff;color:#2563eb}.rbac-badge.sale{background:#ecfdf3;color:#16a34a}.rbac-badge.leader{background:#f5f3ff;color:#7c3aed}.rbac-badge.guest{background:#f8fafc;color:#64748b}
      .rbac-btn{border:0;border-radius:999px;padding:9px 14px;font-family:Tahoma,Arial,Verdana,sans-serif!important;font-weight:700;cursor:pointer;background:#2563eb;color:#fff;box-shadow:0 10px 18px rgba(37,99,235,.18);letter-spacing:0!important;font-size:12px;}
      .rbac-btn.secondary{background:#fff;color:#2563eb;border:1px solid #bfdbfe;box-shadow:none;}.rbac-btn.danger{background:#dc2626;}.rbac-btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
      .rbac-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .rbac-form{display:grid;gap:12px;}.rbac-field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:0!important;color:#64748b;font-weight:700;margin-bottom:6px;}
      .rbac-input,.rbac-perm-select,.rbac-role-perm-select{width:100%;border:1px solid #dbe3ef;border-radius:12px;background:#fff;padding:10px 11px;outline:none;color:#0f172a;font-family:Tahoma,Arial,Verdana,sans-serif!important;font-weight:600;font-size:12px;letter-spacing:0!important;}
      .rbac-input::placeholder{font-family:Tahoma,Arial,Verdana,sans-serif!important;font-weight:400;color:#94a3b8;}
      .rbac-perm-matrix{display:grid;grid-template-columns:1fr;gap:8px;}.rbac-perm-row{display:grid;grid-template-columns:1fr 165px;gap:8px;align-items:center;padding:9px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;}
      .rbac-perm-name{font-weight:600;color:#334155;font-size:12px;}.rbac-note{background:#fffbeb;border:1px dashed #f59e0b;color:#92400e;border-radius:16px;padding:12px;font-size:12px;line-height:1.55;font-weight:600;}
      .rbac-lock{color:#dc2626;font-weight:700;font-size:11px;}.rbac-mini{font-size:11px;color:#64748b;font-weight:600;margin-top:3px;}
      .rbac-role-default-card{background:linear-gradient(135deg,#ffffff,#f8fafc);}
      .rbac-role-default-table{width:100%;min-width:980px;border-collapse:separate;border-spacing:0;font-size:12px;}
      .rbac-role-default-table th{background:#eff6ff!important;color:#1d4ed8!important;text-transform:uppercase;font-size:10px;font-weight:700;letter-spacing:0!important;padding:9px;border-bottom:1px solid #bfdbfe;text-align:left;}
      .rbac-role-default-table td{padding:8px;border-bottom:1px solid #eef2f7;background:#fff;vertical-align:middle;font-weight:400;}
      .rbac-role-default-table .role-cell{min-width:165px;}
      .rbac-font-fix-note{font-size:11px;color:#64748b;font-weight:400;line-height:1.5;}
      @media(max-width:980px){.rbac-grid{grid-template-columns:1fr}.rbac-perm-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function currentEditKey() { return safe(($('rbac-edit-key') || {}).value); }


  function roleDefaultPermissionSelect(role, moduleKey, value) {
    role = roleKey(role);
    value = normalizePermissionValue(value);
    var disabled = role === 'admin' || moduleKey === 'admin';
    return '<select class="rbac-role-perm-select" data-role="' + esc(role) + '" data-module="' + esc(moduleKey) + '" ' + (disabled ? 'disabled' : '') + '>' +
      optionHtml('none', value) + optionHtml('view', value) + optionHtml('edit', value) + '</select>';
  }

  function renderRoleDefaultsSection() {
    return '<section class="rbac-card rbac-role-default-card">' +
      '<div class="rbac-card-title"><span>⚙️ Quyền mặc định theo vai trò</span><div class="rbac-actions"><button class="rbac-btn secondary" onclick="window.MKTRBAC.resetRoleDefaultsForm()">Lấy mặc định hệ thống</button><button class="rbac-btn" onclick="window.MKTRBAC.saveRoleDefaults()">Lưu quyền mặc định</button></div></div>' +
      '<div class="rbac-note">Thiết lập này là bộ quyền gốc của từng vai trò. Khi thêm hoặc chỉnh nhân sự, chỉ cần chọn vai trò là hệ thống tự áp quyền mặc định; sau đó vẫn có thể tinh chỉnh riêng từng người.</div>' +
      '<div class="rbac-table-wrap"><table class="rbac-role-default-table"><thead><tr><th>Vai trò</th><th>Báo cáo</th><th>Hiệu suất</th><th>Ads</th><th>KPI</th><th>TMĐT</th><th>Giá</th><th>Soạn đơn</th><th>Admin</th></tr></thead><tbody id="rbac-role-default-rows"></tbody></table></div>' +
      '<div class="rbac-font-fix-note">Font Tahoma/Arial chỉ áp dụng trong trang Quản trị vai trò & phân quyền để chữ tiếng Việt và nút hiển thị rõ nét.</div>' +
      '</section>';
  }

  function renderRoleDefaultRows(useSystemDefault) {
    var tb = $('rbac-role-default-rows');
    if (!tb) return;
    var source = useSystemDefault ? DEFAULT_ROLE_PERMISSIONS : getRoleDefaultsSource();
    var modules = ['report','plan','ads','kpi','ecom','price','compose','admin'];
    var html = '';
    Object.keys(ROLES).forEach(function(role){
      var perms = copy((source && source[role]) || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.mkt);
      if (role === 'admin') perms = copy(DEFAULT_ROLE_PERMISSIONS.admin);
      if (role !== 'admin') perms.admin = 'none';
      html += '<tr><td class="role-cell"><span class="rbac-badge ' + esc(role) + '">' + roleLabel(role) + '</span>' + (role === 'admin' ? '<div class="rbac-lock">Admin luôn toàn quyền, không cho chỉnh.</div>' : '') + '</td>';
      modules.forEach(function(m){ html += '<td>' + roleDefaultPermissionSelect(role, m, perms[m]) + '</td>'; });
      html += '</tr>';
    });
    tb.innerHTML = html;
  }

  function readRoleDefaultsFromForm() {
    var out = copy(getRoleDefaultsSource());
    Object.keys(ROLES).forEach(function(role){
      out[role] = out[role] || defaultPermissionsForRole(role);
      if (role === 'admin') out[role] = copy(DEFAULT_ROLE_PERMISSIONS.admin);
      if (role !== 'admin') out[role].admin = 'none';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.rbac-role-perm-select'), function(sel){
      var role = roleKey(sel.getAttribute('data-role'));
      var moduleKey = sel.getAttribute('data-module');
      if (!out[role]) out[role] = defaultPermissionsForRole(role);
      if (role === 'admin' || moduleKey === 'admin') return;
      out[role][moduleKey] = normalizePermissionValue(sel.value);
    });
    return mergeRoleDefaults(out);
  }

  function saveRoleDefaultsFromForm() {
    if (!isAdminUser()) return toast('Chỉ Admin mới được lưu quyền mặc định theo vai trò.');
    if (!window.sysDb) return toast('Không kết nối được Firebase Database.');
    var data = readRoleDefaultsFromForm();
    // Không ghi Admin vào form chỉnh sửa để tránh ai đó cố hạ quyền Admin.
    data.admin = copy(DEFAULT_ROLE_PERMISSIONS.admin);
    window.sysDb.ref(ROLE_DEFAULTS_PATH).set(data).then(function(){
      ACTIVE_ROLE_PERMISSIONS = mergeRoleDefaults(data);
      window.MKT_ROLE_DEFAULTS = copy(ACTIVE_ROLE_PERMISSIONS);
      renderRoleDefaultRows();
      toast('Đã lưu quyền mặc định theo vai trò.');
    }).catch(function(e){ toast('Lỗi lưu quyền mặc định: ' + e.message); });
  }

  function resetRoleDefaultsForm() {
    renderRoleDefaultRows(true);
    toast('Đã đưa form về bộ quyền mặc định hệ thống. Bấm “Lưu quyền mặc định” nếu muốn áp dụng.');
  }

  function renderAdminPermissionUI() {
    injectAdminCss();
    var page = getAdminContainer();
    if (!page) return;
    if (!isAdminUser()) {
      page.innerHTML = '<div class="section-box"><div class="section-title">⚠️ Không có quyền</div><div style="color:#64748b;font-weight:700;">Chỉ Admin mới được truy cập quản trị phân quyền.</div></div>';
      return;
    }

    var users = normalizeUsers(window.SYS_DB_USERS || {});
    window.SYS_DB_USERS = users;

    page.innerHTML = '<div class="rbac-admin-shell">' +
      '<section class="rbac-hero"><h2 class="rbac-title">🛡️ Quản trị vai trò & phân quyền</h2>' +
      '<div class="rbac-sub">Admin là quyền cao nhất. Các tài khoản Admin được khóa quyền, không thể bị hạ quyền hoặc xóa từ giao diện. Mỗi công cụ có 3 mức: <b>Ẩn menu</b>, <b>Truy cập/chỉ xem</b>, <b>Chỉnh sửa</b>.</div></section>' +
      renderRoleDefaultsSection() + '<div class="rbac-grid"><section class="rbac-card"><div class="rbac-card-title"><span>Danh sách tài khoản</span><button class="rbac-btn secondary" onclick="window.MKTRBAC.renderAdmin()">Làm mới</button></div><div class="rbac-table-wrap"><table class="rbac-table"><thead><tr><th>Email</th><th>Tên</th><th>Vai trò</th><th>Quyền nhanh</th><th>Thao tác</th></tr></thead><tbody id="rbac-user-rows"></tbody></table></div></section>' +
      '<section class="rbac-card"><div class="rbac-card-title"><span id="rbac-form-title">Thêm / chỉnh tài khoản</span></div><div id="rbac-form-box"></div></section></div></div>';

    renderRoleDefaultRows();
    renderUserRows(users);
    renderForm(null);
  }

  function summarizePerms(perms, role) {
    var p = normalizePermissions(perms, role || 'mkt');
    var counts = { edit:0, view:0, none:0 };
    Object.keys(MODULES).forEach(function(k){ if(k !== 'home') counts[normalizePermissionValue(p[k])] = (counts[normalizePermissionValue(p[k])] || 0) + 1; });
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
        '<td><span class="rbac-badge ' + esc(r) + '">' + roleLabel(r) + '</span>' + (locked ? '<div class="rbac-lock">Đã khóa quyền Admin</div>' : '') + '</td>' +
        '<td>' + summarizePerms(u.permissions, r) + '</td>' +
        '<td><div class="rbac-actions">' +
          '<button class="rbac-btn secondary" onclick="window.MKTRBAC.editUser(\'' + esc(key) + '\')" ' + (locked ? 'disabled title="Không chỉnh quyền Admin"' : '') + '>Sửa</button>' +
          '<button class="rbac-btn danger" onclick="window.MKTRBAC.deleteUser(\'' + esc(key) + '\')" ' + (locked ? 'disabled title="Không xóa Admin"' : '') + '>Xóa</button>' +
        '</div></td></tr>';
    });
    tb.innerHTML = html || '<tr><td colspan="5" style="text-align:center;color:#64748b">Chưa có tài khoản.</td></tr>';
  }

  function renderForm(userKey) {
    var box = $('rbac-form-box');
    if (!box) return;
    var users = normalizeUsers(window.SYS_DB_USERS || {});
    var u = userKey ? normalizeUser(users[userKey]) : null;
    var locked = u && roleKey(u.role) === 'admin';
    var role = u ? roleKey(u.role) : 'mkt';
    var perms = u ? normalizePermissions(u.permissions, role, u.features) : defaultPermissionsForRole(role);

    var permRows = Object.keys(MODULES).filter(function(k){ return k !== 'home'; }).map(function(k){
      return '<div class="rbac-perm-row"><div class="rbac-perm-name">' + esc(MODULES[k].label) + '</div>' + permissionSelect(k, perms[k], locked || k === 'admin') + '</div>';
    }).join('');

    box.innerHTML = '<div class="rbac-form">' +
      '<input type="hidden" id="rbac-edit-key" value="' + esc(userKey || '') + '">' +
      '<div class="rbac-field"><label>Email đăng nhập</label><input id="rbac-email" class="rbac-input" type="email" placeholder="VD: 026.nongnghiepviet@gmail.com" value="' + esc(u && u.email || '') + '" ' + (u ? 'disabled' : '') + '></div>' +
      '<div class="rbac-field"><label>Tên hiển thị</label><input id="rbac-name" class="rbac-input" type="text" placeholder="Tên nhân sự" value="' + esc(u && u.name || '') + '" ' + (locked ? 'disabled' : '') + '></div>' +
      '<div class="rbac-field"><label>Vai trò</label>' + roleOptions(role, locked) + '</div>' +
      '<div class="rbac-note">Gợi ý: chọn vai trò là quyền mặc định tự áp ngay. Sau đó có thể tinh chỉnh riêng từng công cụ cho người này.</div>' +
      '<div class="rbac-perm-matrix">' + permRows + '</div>' +
      '<div class="rbac-actions"><button class="rbac-btn" onclick="window.MKTRBAC.saveUser()" ' + (locked ? 'disabled' : '') + '>Lưu phân quyền</button>' +
      '<button class="rbac-btn secondary" onclick="window.MKTRBAC.applyRoleDefault()" ' + (locked ? 'disabled' : '') + '>Áp quyền mặc định</button>' +
      '<button class="rbac-btn secondary" onclick="window.MKTRBAC.cancelEdit()">Làm mới form</button></div>' +
      (locked ? '<div class="rbac-lock">Tài khoản Admin không cho chỉnh quyền, hạ vai trò hoặc xóa.</div>' : '') +
      '</div>';

    var roleEl = $('rbac-role');
    if (roleEl) {
      roleEl.addEventListener('change', function(){
        applyRoleDefaultToForm(roleEl.value);
        toast('Đã áp quyền mặc định của vai trò ' + roleLabel(roleEl.value) + '. Anh vẫn có thể chỉnh riêng từng quyền trước khi lưu.');
      });
    }
  }

  function readFormPermissions() {
    var out = defaultPermissionsForRole(safe(($('rbac-role') || {}).value || 'mkt'));
    Array.prototype.forEach.call(document.querySelectorAll('.rbac-perm-select'), function(sel){
      out[sel.getAttribute('data-perm')] = normalizePermissionValue(sel.value);
    });
    if (roleKey(safe(($('rbac-role') || {}).value)) !== 'admin') out.admin = 'none';
    return out;
  }

  function applyRoleDefaultToForm(role) {
    var perms = defaultPermissionsForRole(role);
    Array.prototype.forEach.call(document.querySelectorAll('.rbac-perm-select'), function(sel){
      var k = sel.getAttribute('data-perm');
      if (sel.disabled) return;
      sel.value = perms[k] || 'none';
    });
  }

  function saveUserFromForm() {
    if (!isAdminUser()) return toast('Chỉ Admin mới được lưu phân quyền.');
    var key = currentEditKey();
    var emailEl = $('rbac-email'), nameEl = $('rbac-name'), roleEl = $('rbac-role');
    var email = safe(emailEl && emailEl.value).trim().toLowerCase();
    var name = safe(nameEl && nameEl.value).trim();
    var role = roleKey(roleEl && roleEl.value);
    var users = normalizeUsers(window.SYS_DB_USERS || {});

    if (!email || email.indexOf('@') === -1) return toast('Email không hợp lệ.');
    if (!name) return toast('Vui lòng nhập tên hiển thị.');

    if (key && users[key] && roleKey(users[key].role) === 'admin') {
      return toast('Không được thay đổi quyền của Admin.');
    }
    if (role === 'admin') return toast('Không tạo hoặc nâng quyền Admin từ giao diện này. Admin phải được thiết lập thủ công bởi chủ hệ thống.');

    var permissions = normalizePermissions(readFormPermissions(), role);
    var data = { email: email, name: name, role: role, permissions: permissions, features: permissionsToFeatures(permissions), updatedAt: new Date().toISOString() };
    var db = window.sysDb;
    if (!db) return toast('Không kết nối được Firebase Database.');

    var saveKey = key || email.replace(/[.#$\[\]@]/g, '_');
    db.ref(USER_PATH + '/' + saveKey).update(data).then(function(){
      users[saveKey] = data;
      window.SYS_DB_USERS = users;
      renderAdminPermissionUI();
      applyCurrentPermissions();
      toast('Đã lưu phân quyền cho ' + name + '.');
    }).catch(function(e){ toast('Lỗi lưu phân quyền: ' + e.message); });
  }

  function deleteUserByKey(key) {
    if (!isAdminUser()) return toast('Chỉ Admin mới được xóa tài khoản.');
    var users = normalizeUsers(window.SYS_DB_USERS || {});
    var u = users[key];
    if (!u) return;
    if (roleKey(u.role) === 'admin') return toast('Không được xóa tài khoản Admin.');
    if (!confirm('Xóa tài khoản khỏi phân quyền: ' + (u.name || u.email) + '?')) return;
    if (!window.sysDb) return toast('Không kết nối được Firebase Database.');
    window.sysDb.ref(USER_PATH + '/' + key).remove().then(function(){
      delete users[key];
      window.SYS_DB_USERS = users;
      renderAdminPermissionUI();
      toast('Đã xóa tài khoản.');
    }).catch(function(e){ toast('Lỗi xóa: ' + e.message); });
  }

  function patchOldAdminFunctions() {
    window.adminSaveUser = saveUserFromForm;
    window.adminDeleteUser = function(key){ deleteUserByKey(key); };
    window.adminEditUser = function(key){ renderAdminPermissionUI(); setTimeout(function(){ window.MKTRBAC.editUser(key); }, 30); };
    window.adminCancelEdit = function(){ renderForm(null); };
  }

  function observeDom() {
    if (window.__MKT_RBAC_OBSERVER) return;
    var timer = null;
    var observer = new MutationObserver(function(){
      clearTimeout(timer);
      timer = setTimeout(function(){ applyCurrentPermissions(); wrapWriteFunctions(); }, 120);
    });
    observer.observe(document.body, { childList:true, subtree:true });
    window.__MKT_RBAC_OBSERVER = observer;
  }

  function handleDirectHash() {
    var p = (location.hash || '').replace('#', '');
    if (!p) return;
    var moduleKey = getModuleFromPage(p);
    if (!canAccess(moduleKey) || (p === 'admin' && !isAdminUser())) {
      toast('Bạn chưa được cấp quyền truy cập mục này.');
      if (window.goPage) window.goPage('home');
      else location.hash = '#home';
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    injectAdminCss();
    loadRoleDefaults();
    patchBuildUsers();
    patchGoPage();
    patchOldAdminFunctions();
    wrapWriteFunctions();
    observeDom();
    applyCurrentPermissions();

    window.addEventListener('hashchange', function(){ setTimeout(function(){ handleDirectHash(); applyCurrentPermissions(); }, 60); });
    setInterval(function(){ wrapWriteFunctions(); applyCurrentPermissions(); }, 1800);
  }

  window.MKTRBAC = {
    version: VERSION,
    roles: ROLES,
    modules: MODULES,
    defaults: getRoleDefaultsSource(),
    normalizeUsers: normalizeUsers,
    normalizeUser: normalizeUser,
    getCurrentPermissions: getCurrentPermissions,
    canAccess: canAccess,
    canEdit: canEdit,
    apply: applyCurrentPermissions,
    renderAdmin: renderAdminPermissionUI,
    editUser: function(key){ renderForm(key); var t=$('rbac-form-title'); if(t) t.innerText='Chỉnh phân quyền'; },
    cancelEdit: function(){ renderForm(null); var t=$('rbac-form-title'); if(t) t.innerText='Thêm / chỉnh tài khoản'; },
    applyRoleDefault: function(){ applyRoleDefaultToForm(safe(($('rbac-role') || {}).value || 'mkt')); },
    saveRoleDefaults: saveRoleDefaultsFromForm,
    resetRoleDefaultsForm: resetRoleDefaultsForm,
    renderRoleDefaultRows: renderRoleDefaultRows,
    saveUser: saveUserFromForm,
    deleteUser: deleteUserByKey,
    roleLabel: roleLabel
  };

  function waitForCore() {
    if (window.goPage && window.buildSystemUsersUI) boot();
    else setTimeout(waitForCore, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForCore);
  else waitForCore();
})();

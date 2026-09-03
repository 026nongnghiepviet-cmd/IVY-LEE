/* V298: NHẬN DẠNG NHÂN VIÊN TỪ TÊN NHÓM MỚI — với Meta row có adsetNamingMode=pipe_qc_v293, dữ liệu “Của tôi” nhận đúng người theo họ tên đầy đủ trong tên nhóm, kể cả campaign_employee_links_v1 chưa kịp có. Liên kết campaign hiện có vẫn được ưu tiên/giữ nguyên. */
/* V297: Notification Ad Popup — nút “Xem quảng cáo” chỉ dùng cho thông báo cấp Bài; bấm mở trực tiếp popup nội dung + media Facebook qua Ads V289. Campaign/Adset vẫn dùng “Mở quảng cáo”. */
/* =========================================================
   USER WORKSPACE - V296 ATTENTION-ONLY MINI BADGE + ACTIVE/PERIOD CAMPAIGNS + SPECIAL PHÒNG MKT
   Phạm vi:
   1) Công việc của tôi
   3) Thông báo có hành động
   4) Cần chú ý
   5) Lịch sử của tôi
   6) Tìm kiếm của tôi

   Nguyên tắc:
   - Không thay đổi RBAC hoặc cơ chế gửi thông báo hiện tại.
   - Không đọc Global Ads Feed để dựng dữ liệu cá nhân.
   - Chỉ dùng inbox cá nhân, liên kết campaign -> userKey, lịch sử do chính tài khoản thực hiện.
   - Không ghi Firebase mới; chỉ dùng cơ chế markRead hiện có khi người dùng bấm "Đã xem".
   - Mobile-first, nút tiếng Việt, font Tahoma/Arial/Segoe UI, font-weight 600.
   ========================================================= */
(function installMktUserWorkspaceV294(){
  'use strict';
  if (window.__MKT_USER_WORKSPACE_V298) return;
  window.__MKT_USER_WORKSPACE_V298 = true;
  window.__MKT_USER_WORKSPACE_V297 = true;
  window.__MKT_USER_WORKSPACE_V296 = true;
  window.__MKT_USER_WORKSPACE_V295 = true;
  window.__MKT_USER_WORKSPACE_V294 = true;
  window.__MKT_USER_WORKSPACE_V293 = true;
  window.__MKT_USER_WORKSPACE_V292 = true;

  var VERSION = 'V298_STRUCTURED_ADSET_OWNER';
  var SESSION_KEY = 'MKT_USER_WORKSPACE_OPEN_V296';
  var COMPANIES = ['NNV','VN','KF','ABC'];
  var COMPANY_NAMES = { NNV:'Nông Nghiệp Việt', VN:'Hóa Nông Việt Nhật', KF:'KingFarm', ABC:'ABC Việt Nam' };

  var state = {
    opened:false,
    active:'overview',
    user:null,
    userKey:'',
    profile:null,
    links:[],
    rawCampaignActivity:[],
    rawAccountActivity:[],
    uploadLogs:[],
    roasUploads:[],
    loadedAt:0,
    loading:false,
    searchQuery:'',
    searchResults:[],
    notificationObserver:null,
    homeBound:false,
    refreshTimer:null,
    attentionDerivedSignature:'',
    linkedModalOpen:false,
    attentionContextLoadedAt:0,
    attentionContextLoading:false,
    campaignStatesByCompany:{}
  };

  function text(v){ return String(v === null || v === undefined ? '' : v); }
  function esc(v){ return text(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function norm(v){
    return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }
  // V295: không chuẩn hóa MKT = MARKETING ở lớp người dùng.
  // Ngoại lệ "Phòng MKT" được xử lý duy nhất tại nguồn liên kết campaign trong ads-firebase V284.
  // Ở đây luôn giữ tên campaign đúng như Meta/Firebase để không ảnh hưởng các user khác.
  function normCampaignV294(v){
    return norm(v);
  }
  function arr(v){
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === 'object') return Object.keys(v).map(function(k){ var x=v[k]; if(x&&typeof x==='object'&&!x.id)x=Object.assign({id:k},x); return x; }).filter(Boolean);
    return [];
  }
  function toMs(v){
    if (typeof v === 'number' && isFinite(v)) return v;
    var n = Number(v); if (n > 1000000000000) return n;
    var d = new Date(v || 0); return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  function fmtTime(v){
    var ms=toMs(v); if(!ms) return 'Chưa ghi nhận';
    try { return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms)); }
    catch(e){ return new Date(ms).toLocaleString('vi-VN'); }
  }
  function ago(v){
    var ms=toMs(v); if(!ms) return '';
    var s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    if(s<60)return s+' giây trước';
    var m=Math.floor(s/60); if(m<60)return m+' phút trước';
    var h=Math.floor(m/60); if(h<24)return h+' giờ trước';
    var d=Math.floor(h/24); return d+' ngày trước';
  }
  function getDb(){ try { if(window.sysDb)return window.sysDb; if(window.firebase&&firebase.apps&&firebase.apps.length)return firebase.database(); }catch(e){} return null; }
  function getAuth(){ try { if(window.sysAuth)return window.sysAuth; if(window.firebase&&firebase.apps&&firebase.apps.length)return firebase.auth(); }catch(e){} return null; }
  function getUser(){ var a=getAuth(); return a&&a.currentUser ? a.currentUser : null; }
  function canAccess(moduleKey){
    try { return !!(window.MKTRBAC && typeof window.MKTRBAC.canAccess==='function' && window.MKTRBAC.canAccess(moduleKey)); }
    catch(e){ return false; }
  }
  function isAdmin(){
    try { return !!(window.MKTRBAC && typeof window.MKTRBAC.isAdmin==='function' && window.MKTRBAC.isAdmin()); }
    catch(e){ return false; }
  }
  function showToast(msg,type){ if(typeof window.showToast==='function')window.showToast(msg,type||'info'); }

  function findProfile(user){
    user=user||getUser(); if(!user)return null;
    var users=window.SYS_DB_USERS||{},email=text(user.email).toLowerCase(),uid=text(user.uid);
    for(var key in users){
      if(!Object.prototype.hasOwnProperty.call(users,key))continue;
      var p=users[key]||{};
      if((email&&text(p.email).toLowerCase()===email)||(uid&&text(p.authUid)===uid)) return {key:key,user:p};
    }
    return null;
  }
  function resolveUserKey(){
    try {
      if(window.MKTNotificationRouterV269&&typeof window.MKTNotificationRouterV269.getState==='function'){
        var r=window.MKTNotificationRouterV269.getState(); if(r&&r.userKey)return text(r.userKey);
      }
    }catch(e){}
    var p=findProfile(); return p?p.key:'';
  }
  function displayName(){
    var p=state.profile&&state.profile.user||{},u=state.user||getUser();
    return text(p.name||window.myIdentity||(u&&u.displayName)||(u&&u.email)||'Tài khoản hiện tại');
  }
  function roleLabel(){
    var p=state.profile&&state.profile.user||{};
    try { if(window.MKTRBAC&&typeof window.MKTRBAC.roleLabel==='function'&&p.role)return window.MKTRBAC.roleLabel(p.role); }catch(e){}
    return text(p.role||window.MKT_CURRENT_ROLE||'Người dùng');
  }

  function ensureStyle(){
    if(document.getElementById('mkt-user-workspace-v292-style'))return;
    var s=document.createElement('style'); s.id='mkt-user-workspace-v292-style';
    s.textContent=[
      '#mkt-user-workspace-v292,#mkt-user-workspace-v292 *{box-sizing:border-box;font-family:Tahoma,Arial,"Segoe UI",sans-serif}',
      '.mkt-my-nav-v292{cursor:pointer}',
      '#mkt-user-workspace-v292{display:none;min-width:0;color:#0f172a}',
      '.mkt-my-shell-v292{display:grid;gap:14px}',
      '.mkt-my-hero-v292{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:18px;border:1px solid #dbe4f0;border-radius:22px;background:linear-gradient(135deg,#f8fbff,#fff 70%);box-shadow:0 10px 28px rgba(15,23,42,.05)}',
      '.mkt-my-hero-v292 h2{margin:0;font-size:22px;line-height:1.25;font-weight:700;color:#0f172a;letter-spacing:-.02em}.mkt-my-hero-v292 p{margin:6px 0 0;color:#64748b;font-size:11px;line-height:1.55}.mkt-my-role-v292{display:inline-flex;margin-top:9px;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:600}.mkt-my-refresh-v292{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:11px;padding:9px 12px;font-size:10px;font-weight:600;cursor:pointer}.mkt-my-refresh-v292:hover{background:#f8fafc;border-color:#93c5fd;color:#1d4ed8}',
      '.mkt-my-tabs-v292{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:7px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.mkt-my-tab-v292{border:1px solid transparent;background:transparent;color:#64748b;border-radius:11px;padding:9px 10px;font-size:10px;font-weight:600;cursor:pointer}.mkt-my-tab-v292.active{background:#fff;border-color:#dbe4f0;color:#0f172a;box-shadow:0 5px 14px rgba(15,23,42,.06)}',
      '.mkt-my-kpis-v292{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.mkt-my-kpi-v292{border:1px solid #e2e8f0;border-radius:17px;background:#fff;padding:13px}.mkt-my-kpi-v292 span{display:block;color:#64748b;font-size:9px;font-weight:600}.mkt-my-kpi-v292 strong{display:block;margin-top:5px;color:#0f172a;font-size:21px;font-weight:700;line-height:1}.mkt-my-kpi-v292 small{display:block;margin-top:6px;color:#94a3b8;font-size:8.5px;line-height:1.4}.mkt-my-kpi-v292.warn{border-color:#fde68a;background:#fffdf5}.mkt-my-kpi-v292.bad{border-color:#fecaca;background:#fff8f8}.mkt-my-kpi-v292.good{border-color:#bbf7d0;background:#f8fff9}',
      '.mkt-my-grid-v292{display:grid;grid-template-columns:1.05fr .95fr;gap:11px}.mkt-my-card-v292{border:1px solid #e2e8f0;border-radius:18px;background:#fff;overflow:hidden;min-width:0}.mkt-my-card-head-v292{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #eef2f7;background:#fbfdff}.mkt-my-card-head-v292 strong{font-size:11px;font-weight:700;color:#0f172a}.mkt-my-card-head-v292 small{font-size:8.5px;color:#94a3b8}.mkt-my-list-v292{display:grid}.mkt-my-empty-v292{padding:28px 16px;text-align:center;color:#94a3b8;font-size:10px;line-height:1.6}',
      '.mkt-my-item-v292{display:grid;grid-template-columns:9px minmax(0,1fr) auto;gap:9px;align-items:start;padding:11px 13px;border-bottom:1px solid #f1f5f9}.mkt-my-item-v292:last-child{border-bottom:0}.mkt-my-dot-v292{width:7px;height:7px;border-radius:50%;margin-top:5px;background:#94a3b8}.mkt-my-item-v292.warn .mkt-my-dot-v292{background:#f59e0b}.mkt-my-item-v292.bad .mkt-my-dot-v292{background:#dc2626}.mkt-my-item-v292.good .mkt-my-dot-v292{background:#16a34a}.mkt-my-item-v292.info .mkt-my-dot-v292{background:#2563eb}.mkt-my-copy-v292 b{display:block;color:#0f172a;font-size:10.3px;line-height:1.4;font-weight:600}.mkt-my-copy-v292 p{margin:3px 0 0;color:#64748b;font-size:9px;line-height:1.5}.mkt-my-copy-v292 small{display:block;margin-top:5px;color:#94a3b8;font-size:8px}.mkt-my-actions-v292{display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.mkt-my-btn-v292{border:1px solid #dbe4f0;background:#fff;color:#334155;border-radius:9px;padding:6px 8px;font-size:8.5px;font-weight:600;cursor:pointer;white-space:nowrap}.mkt-my-btn-v292.primary{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}.mkt-my-btn-v292:hover{transform:translateY(-1px)}',
      '.mkt-my-quick-v292{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:12px}.mkt-my-quick-v292 button{border:1px solid #e2e8f0;background:#fff;color:#334155;border-radius:12px;padding:10px;text-align:left;font-size:9.5px;font-weight:600;cursor:pointer}.mkt-my-quick-v292 button small{display:block;margin-top:3px;color:#94a3b8;font-size:8px;font-weight:400}.mkt-my-quick-v292 button:hover{border-color:#bfdbfe;background:#f8fbff;color:#1d4ed8}',
      '.mkt-my-attention-summary-v292{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.mkt-my-chip-v292{display:inline-flex;border:1px solid #e2e8f0;background:#fff;color:#64748b;border-radius:999px;padding:6px 9px;font-size:8.5px;font-weight:600}.mkt-my-chip-v292.warn{border-color:#fde68a;background:#fffbeb;color:#92400e}.mkt-my-chip-v292.bad{border-color:#fecaca;background:#fef2f2;color:#991b1b}',
      '.mkt-my-history-tools-v292,.mkt-my-search-line-v292{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.mkt-my-input-v292{width:100%;height:42px;border:1px solid #dbe4f0!important;border-radius:12px!important;background:#fff!important;color:#0f172a!important;padding:0 12px!important;font-size:10.5px!important;font-weight:500!important;outline:none!important}.mkt-my-input-v292:focus{border-color:#93c5fd!important;box-shadow:0 0 0 3px rgba(37,99,235,.09)!important}.mkt-my-search-btn-v292{border:1px solid #2563eb;background:#2563eb;color:#fff;border-radius:12px;padding:0 14px;font-size:10px;font-weight:600;cursor:pointer}.mkt-my-filter-v292{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.mkt-my-filter-v292 button{border:1px solid #dbe4f0;background:#fff;color:#64748b;border-radius:999px;padding:6px 9px;font-size:8.5px;font-weight:600;cursor:pointer}.mkt-my-filter-v292 button.active{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}',
      '.mkt-my-search-result-v292{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 11px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}.mkt-my-search-icon-v292{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:14px}.mkt-my-search-result-v292 b{display:block;color:#0f172a;font-size:10px;font-weight:600}.mkt-my-search-result-v292 p{margin:3px 0 0;color:#64748b;font-size:8.8px;line-height:1.45}.mkt-my-search-result-v292 small{display:block;margin-top:3px;color:#94a3b8;font-size:7.9px}',
      '.mkt-user-notif-actions-v292{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.mkt-user-notif-action-v292{border:1px solid #dbe4f0;background:#fff;color:#334155;border-radius:8px;padding:5px 7px;font:600 8px Tahoma,Arial,"Segoe UI",sans-serif;cursor:pointer}.mkt-user-notif-action-v292.primary{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}',
      '.mkt-my-account-action-v293{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;font-weight:600!important}.mkt-my-account-action-v293.active{background:#eff6ff!important;color:#1d4ed8!important}.mkt-my-menu-count-v293{display:none;min-width:21px;height:19px;padding:0 6px;border-radius:999px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font:600 9px/17px Tahoma,Arial,"Segoe UI",sans-serif;text-align:center;white-space:nowrap}.mkt-my-menu-count-v293.show{display:inline-block}',
      '.mkt-my-account-mini-v293{display:none;align-items:center;justify-content:center;min-height:20px;padding:2px 7px;border:1px solid #fed7aa;border-radius:999px;background:#fff7ed;color:#c2410c;font:600 8.5px/1.2 Tahoma,Arial,"Segoe UI",sans-serif;white-space:nowrap;cursor:pointer}.mkt-my-account-mini-v293.show{display:inline-flex}.mkt-my-account-mini-v293:hover{background:#ffedd5;border-color:#fdba74}.mobile-nav-user-copy .mkt-my-account-mini-v293{align-self:flex-start;margin-top:4px}',
      '.mkt-my-kpi-click-v293{appearance:none;width:100%;text-align:left;cursor:pointer;font:inherit;color:inherit}.mkt-my-kpi-click-v293:hover{border-color:#93c5fd!important;box-shadow:0 8px 22px rgba(37,99,235,.08)}.mkt-my-kpi-click-v293:focus-visible{outline:3px solid rgba(37,99,235,.15);outline-offset:2px}.mkt-my-kpi-link-v293{display:block;margin-top:5px;color:#2563eb;font-size:8.5px;font-weight:600}',
      '.mkt-my-linked-modal-v293{display:none;position:fixed;inset:0;z-index:2147483250;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.48);backdrop-filter:blur(5px)}.mkt-my-linked-modal-v293.open{display:flex}.mkt-my-linked-dialog-v293{width:min(620px,96vw);max-height:min(78vh,700px);overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.28);font-family:Tahoma,Arial,"Segoe UI",sans-serif}.mkt-my-linked-head-v293{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px 16px;border-bottom:1px solid #eef2f7}.mkt-my-linked-head-v293 h3{margin:0;color:#0f172a;font-size:14px;font-weight:600}.mkt-my-linked-head-v293 small{display:block;margin-top:3px;color:#64748b;font-size:9px}.mkt-my-linked-close-v293{width:32px;height:32px;border:0;border-radius:10px;background:#f1f5f9;color:#475569;font:600 18px/1 Tahoma,Arial,sans-serif;cursor:pointer}.mkt-my-linked-list-v293{display:grid;gap:8px;padding:12px;overflow:auto;max-height:calc(min(78vh,700px) - 68px)}.mkt-my-linked-row-v293{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}.mkt-my-linked-row-v293 b{display:block;color:#0f172a;font-size:10.5px;font-weight:600;line-height:1.45}.mkt-my-linked-row-v293 p{margin:4px 0 0;color:#64748b;font-size:9px;line-height:1.45}.mkt-my-linked-company-v293{display:inline-flex;margin-top:6px;padding:3px 7px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:8px;font-weight:600}',
      '@media(max-width:950px){.mkt-my-grid-v292{grid-template-columns:1fr}.mkt-my-kpis-v292{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media(max-width:700px){.mkt-my-hero-v292{grid-template-columns:1fr;padding:14px;border-radius:18px}.mkt-my-hero-v292 h2{font-size:18px}.mkt-my-hero-v292 p{font-size:9.5px}.mkt-my-refresh-v292{width:100%}.mkt-my-tabs-v292{display:flex;overflow-x:auto;scrollbar-width:none;padding:6px}.mkt-my-tabs-v292::-webkit-scrollbar{display:none}.mkt-my-tab-v292{flex:0 0 auto;min-width:118px}.mkt-my-kpis-v292{grid-template-columns:1fr 1fr;gap:7px}.mkt-my-kpi-v292{padding:11px}.mkt-my-kpi-v292 strong{font-size:18px}.mkt-my-item-v292{grid-template-columns:8px minmax(0,1fr);padding:10px 11px}.mkt-my-item-v292>.mkt-my-actions-v292{grid-column:2;justify-content:flex-start}.mkt-my-quick-v292{grid-template-columns:1fr 1fr;padding:10px}.mkt-my-history-tools-v292,.mkt-my-search-line-v292{grid-template-columns:1fr}.mkt-my-search-btn-v292{height:40px}.mkt-my-search-result-v292{grid-template-columns:32px minmax(0,1fr)}.mkt-my-search-result-v292>.mkt-my-actions-v292{grid-column:2;justify-content:flex-start}}',
      '@media(max-width:430px){.mkt-my-kpis-v292{grid-template-columns:1fr}.mkt-my-quick-v292{grid-template-columns:1fr}.mkt-my-linked-row-v293{grid-template-columns:1fr}.mkt-my-linked-row-v293 .mkt-my-btn-v292{width:100%}}'
    ].join('');
    document.head.appendChild(s);
  }

  function closeAccountMenusLocal(){
    var host=document.querySelector('.user-profile-mini.rbac-account-host');
    if(host)host.classList.remove('rbac-account-open');
    var footer=document.querySelector('.mobile-nav-footer');
    if(footer)footer.classList.remove('rbac-mobile-account-open');
  }

  function ensureAccountMenu(){
    // Dọn nút Của tôi trên top-nav của V292 nếu trang đang hot-reload mà chưa F5.
    Array.prototype.forEach.call(document.querySelectorAll('[data-mkt-user-workspace-nav-v292="1"],[data-mkt-user-workspace-nav-v293="1"]'),function(el){
      if(el&&el.parentNode)el.parentNode.removeChild(el);
    });

    var u=getUser();
    var visible=!!(u&&u.isAnonymous!==true);
    var desktop=document.getElementById('rbac-account-dropdown');
    if(desktop){
      var btn=document.getElementById('account-my-workspace-menu-item-v293');
      if(!btn){
        btn=document.createElement('button');
        btn.id='account-my-workspace-menu-item-v293';
        btn.className='rbac-account-action mkt-my-account-action-v293';
        btn.type='button';
        btn.innerHTML='<span>👤 Của tôi</span><span id="mkt-my-menu-count-v293" class="mkt-my-menu-count-v293"></span>';
        var adminBtn=document.getElementById('account-admin-menu-item');
        desktop.insertBefore(btn,adminBtn||null);
        btn.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();closeAccountMenusLocal();openWorkspace('overview');});
      }
      btn.style.display=visible?'flex':'none';
      btn.classList.toggle('active',!!state.opened);
    }

    var mobile=document.getElementById('rbac-mobile-account-menu');
    if(mobile){
      var mbtn=document.getElementById('account-my-workspace-menu-item-mobile-v293');
      if(!mbtn){
        mbtn=document.createElement('button');
        mbtn.id='account-my-workspace-menu-item-mobile-v293';
        mbtn.className='rbac-account-action mkt-my-account-action-v293';
        mbtn.type='button';
        mbtn.innerHTML='<span>👤 Của tôi</span><span id="mkt-my-menu-count-mobile-v293" class="mkt-my-menu-count-v293"></span>';
        var adminMobile=document.getElementById('account-admin-menu-item-mobile');
        mobile.insertBefore(mbtn,adminMobile||null);
        mbtn.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();closeAccountMenusLocal();if(window.closeMobileAppMenu)window.closeMobileAppMenu();openWorkspace('overview');});
      }
      mbtn.style.display=visible?'flex':'none';
      mbtn.classList.toggle('active',!!state.opened);
    }

    ensureAccountMiniBadges();
  }

  function ensureAccountMiniBadges(){
    var u=getUser(),visible=!!(u&&u.isAnonymous!==true);
    var name=document.getElementById('header-user-display');
    if(name&&visible&&!document.getElementById('mkt-my-account-mini-v293')){
      var badge=document.createElement('span');
      badge.id='mkt-my-account-mini-v293';
      badge.className='mkt-my-account-mini-v293';
      badge.title='Có việc cần chú ý';
      name.insertAdjacentElement('afterend',badge);
      badge.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();openWorkspace('attention');});
    }
    var mobileRole=document.getElementById('mobile-user-role');
    if(mobileRole&&visible&&!document.getElementById('mkt-my-account-mini-mobile-v293')){
      var mbadge=document.createElement('span');
      mbadge.id='mkt-my-account-mini-mobile-v293';
      mbadge.className='mkt-my-account-mini-v293';
      mbadge.title='Có việc cần chú ý';
      mobileRole.insertAdjacentElement('afterend',mbadge);
      mbadge.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();if(window.closeMobileAppMenu)window.closeMobileAppMenu();openWorkspace('attention');});
    }
  }

  // V296: mini cạnh tài khoản CHỈ phản ánh việc thật sự cần chú ý/xử lý.
  // Thông báo thông thường đã có chuông riêng nên không được cộng vào đây.
  // Nếu một thông báo cá nhân có mức warning/danger và được attentionItems() xem là cần chú ý,
  // nó vẫn được tính đúng một lần như một việc cần chú ý.
  function pendingWorkCount(){
    var seen={},count=0;
    attentionItems().forEach(function(x){
      if(x.notificationId){
        var nk='N|'+text(x.notificationId);
        if(seen[nk])return;
        seen[nk]=true;
        count++;
        return;
      }
      var k='A|'+norm(x.title+'|'+x.message);
      if(!k||seen[k])return;
      seen[k]=true;
      count++;
    });
    return count;
  }

  function syncAccountMini(){
    ensureAccountMenu();
    var count=pendingWorkCount();
    var label=count>99?'99+':String(count);
    [['mkt-my-account-mini-v293',count?label+' cần chú ý':''],['mkt-my-account-mini-mobile-v293',count?label+' cần chú ý':'']].forEach(function(pair){
      var el=document.getElementById(pair[0]);if(!el)return;el.textContent=pair[1];el.classList.toggle('show',count>0);
    });
    [['mkt-my-menu-count-v293',label],['mkt-my-menu-count-mobile-v293',label]].forEach(function(pair){
      var el=document.getElementById(pair[0]);if(!el)return;el.textContent=count?pair[1]:'';el.classList.toggle('show',count>0);
    });
  }

  function setAccountMenuActive(on){
    ['account-my-workspace-menu-item-v293','account-my-workspace-menu-item-mobile-v293'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.toggle('active',!!on);});
  }

  function ensureMount(){
    var page=document.getElementById('page-home'); if(!page)return null;
    var box=document.getElementById('mkt-user-workspace-v292');
    if(!box){
      box=document.createElement('div'); box.id='mkt-user-workspace-v292';
      var shell=page.querySelector('.home-shell'); if(shell)page.insertBefore(box,shell);else page.insertBefore(box,page.firstChild||null);
    }
    return box;
  }

  function showWorkspaceUi(){
    var page=document.getElementById('page-home'),box=ensureMount(); if(!page||!box)return;
    var shell=page.querySelector('.home-shell'); if(shell)shell.style.display='none';
    box.style.display='block'; state.opened=true; setAccountMenuActive(true);
    try{sessionStorage.setItem(SESSION_KEY,'1');}catch(e){}
    render(); loadData(false);
  }

  function openWorkspace(targetTab){
    if(targetTab)state.active=targetTab;
    ensureAccountMenu(); ensureMount();
    var current=''; try{current=window.MKTRouter&&window.MKTRouter.getCurrentRoute?window.MKTRouter.getCurrentRoute():'';}catch(e){}
    if(current!=='home'&&typeof window.goPage==='function'){
      window.goPage('home'); setTimeout(showWorkspaceUi,70);
    } else showWorkspaceUi();
    if(window.closeMobileAppMenu)window.closeMobileAppMenu();
  }

  function closeWorkspace(clearSession){
    var box=document.getElementById('mkt-user-workspace-v292'); if(box)box.style.display='none';
    var page=document.getElementById('page-home'),shell=page&&page.querySelector('.home-shell'); if(shell)shell.style.display='';
    state.opened=false; setAccountMenuActive(false);
    if(clearSession!==false){try{sessionStorage.removeItem(SESSION_KEY);}catch(e){}}
  }

  function notificationState(){
    try { return window.MKTNotificationsV263&&typeof window.MKTNotificationsV263.getState==='function'?window.MKTNotificationsV263.getState():null; }
    catch(e){ return null; }
  }
  function personalNotificationItems(){
    var ns=notificationState()||{},out=[];
    Object.keys(ns.items||{}).forEach(function(id){var x=ns.items[id]||{};out.push(Object.assign({id:id,source:'system_personal'},x));});
    ['ads_personal_v269','account_personal_v269'].forEach(function(src){
      var list=(ns.derived&&ns.derived[src])||[]; list.forEach(function(x){out.push(Object.assign({source:src},x||{}));});
    });
    var seen={};
    out=out.filter(function(x){var id=text(x.activityId||x.id);if(!id||seen[id])return false;seen[id]=true;x.id=id;return true;});
    out.sort(function(a,b){return Number(b.createdAtMs||0)-Number(a.createdAtMs||0);});
    return out;
  }
  function isRead(id){ var ns=notificationState()||{}; return !!(ns.read&&ns.read[id]); }

  function findPersonalNotification(id){
    id=text(id);
    if(!id)return null;
    var list=personalNotificationItems();
    for(var i=0;i<list.length;i++){
      var x=list[i]||{};
      if(text(x.id||x.activityId)===id)return x;
    }
    return null;
  }
  function isExactAdNotification(item){
    item=item||{};
    return text(item.page)==='ads'&&text(item.objectType).toLowerCase()==='ad'&&!!text(item.objectId||item.adId||item.ad_id);
  }
  function actionLabel(page,item){
    if(page==='ads')return isExactAdNotification(item)?'Xem quảng cáo':'Mở quảng cáo';
    var map={'roas-stats':'Xem ROAS','ecom-main':'Mở TMĐT',shopee:'Mở Shopee',tiktok:'Mở TikTok Shop','price-setting':'Mở thiết lập giá',compose:'Mở soạn đơn',admin:'Mở quản trị',home:'Về trang chủ'};
    return map[page]||'Mở nội dung';
  }
  function openPage(page,id){
    if(id&&window.MKTNotificationsV263&&typeof window.MKTNotificationsV263.markRead==='function')window.MKTNotificationsV263.markRead(id);
    if(page&&typeof window.goPage==='function'){closeWorkspace(true);window.goPage(page);}
  }
  async function openNotificationAction(id,page){
    var item=findPersonalNotification(id)||{};
    if(id&&window.MKTNotificationsV263&&typeof window.MKTNotificationsV263.markRead==='function')window.MKTNotificationsV263.markRead(id);
    if(page==='ads'&&isExactAdNotification(item)&&typeof window.openMetaAdFromNotificationV289==='function'){
      var ok=await window.openMetaAdFromNotificationV289(item);
      if(ok){scheduleRender();return true;}
      return false;
    }
    openPage(page,id);
    return true;
  }
  function markSeen(id){ if(window.MKTNotificationsV263&&typeof window.MKTNotificationsV263.markRead==='function')window.MKTNotificationsV263.markRead(id); scheduleRender(); }
  function openNotificationPanel(){ var bell=document.getElementById('mkt-notification-bell-v263'); if(bell)bell.click(); }

  function decorateNotificationRows(){
    var list=document.getElementById('mkt-notification-list-v263'); if(!list)return;
    var items=personalNotificationItems(),map={}; items.forEach(function(x){map[text(x.id)]=x;});
    Array.prototype.forEach.call(list.querySelectorAll('[data-notification-id-v263]'),function(row){
      if(row.querySelector('.mkt-user-notif-actions-v292'))return;
      var id=text(row.getAttribute('data-notification-id-v263')),item=map[id]||{},page=text(row.getAttribute('data-notification-page-v263')||item.page);
      var host=row.querySelector('.mkt-notification-copy-v263'); if(!host)return;
      var bar=document.createElement('div');bar.className='mkt-user-notif-actions-v292';
      if(page){
        var open=document.createElement('button');open.type='button';open.className='mkt-user-notif-action-v292 primary';open.textContent=actionLabel(page,item);
        open.addEventListener('click',async function(ev){ev.preventDefault();ev.stopPropagation();if(window.MKTNotificationsV263)window.MKTNotificationsV263.close();await openNotificationAction(id,page);});bar.appendChild(open);
      }
      if(!isRead(id)){
        var seen=document.createElement('button');seen.type='button';seen.className='mkt-user-notif-action-v292';seen.textContent='Đã xem';
        seen.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();markSeen(id);});bar.appendChild(seen);
      }
      if(bar.childNodes.length)host.appendChild(bar);
    });
  }

  function installNotificationDecorator(){
    var list=document.getElementById('mkt-notification-list-v263');
    if(!list){setTimeout(installNotificationDecorator,700);return;}
    if(state.notificationObserver)return;
    state.notificationObserver=new MutationObserver(function(){setTimeout(decorateNotificationRows,0);syncAccountMini();scheduleRender();});
    state.notificationObserver.observe(list,{childList:true,subtree:true}); decorateNotificationRows();
  }

  async function loadLinks(){
    var db=getDb(); if(!db||!state.userKey){state.links=[];return;}
    try{
      var snap=await db.ref('campaign_employee_links_v1').once('value'),root=snap.val()||{},out=[];
      Object.keys(root).forEach(function(company){Object.keys(root[company]||{}).forEach(function(key){var x=root[company][key]||{};if(text(x.userKey)===state.userKey)out.push(Object.assign({id:key,company:company},x));});});
      out.sort(function(a,b){return text(a.company).localeCompare(text(b.company))||text(a.campaignName).localeCompare(text(b.campaignName),'vi');});state.links=out;
    }catch(e){state.links=[];}
  }

  async function loadCampaignStatesV294(){
    var db=getDb();
    state.campaignStatesByCompany={};
    if(!db)return;
    await Promise.all(COMPANIES.map(function(company){
      return db.ref('campaign_activity_state_v1/'+company+'/campaigns').once('value').then(function(snap){
        state.campaignStatesByCompany[company]=arr(snap.val()||{});
      }).catch(function(){state.campaignStatesByCompany[company]=[];});
    }));
  }

  function currentMetaRowsV294(){
    var pools=[];
    try{if(Array.isArray(window.META_LIVE_DATA))pools.push(window.META_LIVE_DATA);}catch(e){}
    try{if(typeof META_LIVE_DATA!=='undefined'&&Array.isArray(META_LIVE_DATA))pools.push(META_LIVE_DATA);}catch(e){}
    try{if(Array.isArray(window.META_LIVE_REPORT_DATA))pools.push(window.META_LIVE_REPORT_DATA);}catch(e){}
    try{if(typeof META_LIVE_REPORT_DATA!=='undefined'&&Array.isArray(META_LIVE_REPORT_DATA))pools.push(META_LIVE_REPORT_DATA);}catch(e){}
    var out=[],seen=[];
    pools.forEach(function(list){list.forEach(function(row){if(!row||seen.indexOf(row)!==-1)return;seen.push(row);out.push(row);});});
    return out;
  }

  function currentPeriodV294(){
    var from='',to='';
    try{if(typeof DATE_FROM!=='undefined')from=text(DATE_FROM);}catch(e){}
    try{if(typeof DATE_TO!=='undefined')to=text(DATE_TO);}catch(e){}
    try{if((!from||!to)&&typeof getMetaLivePeriod==='function'){var p=getMetaLivePeriod()||{};from=from||text(p.from);to=to||text(p.to);}}catch(e){}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)){
      var d=new Date(),yyyy=d.getFullYear(),mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
      from=yyyy+'-'+mm+'-01';to=yyyy+'-'+mm+'-'+dd;
    }
    return {from:from,to:to};
  }

  function rowIsInCurrentPeriodV294(row){
    var p=currentPeriodV294(),rf=text(row&& (row.report_start_iso||row.report_start||row.date_start||'' )).slice(0,10),rt=text(row&&(row.report_end_iso||row.report_end||row.date_stop||'')).slice(0,10);
    if(!rf&&!rt)return true;
    if(!rf)rf=rt;if(!rt)rt=rf;
    return !(rt<p.from||rf>p.to);
  }

  function rowHasPeriodDataV294(row){
    if(!row||!rowIsInCurrentPeriodV294(row))return false;
    if(row.has_insights===true||row.has_delivery_data===true)return true;
    var fields=['spend','impressions','reach','messages','result','linkClicks','clicks','purchases'];
    return fields.some(function(k){return Number(row[k]||0)>0;});
  }

  function activeStatusV294(value){
    var n=norm(value);
    return ['ACTIVE','IN PROCESS','PREPARING','PENDING REVIEW','PENDING BILLING INFO','PREAPPROVED','SCHEDULED'].indexOf(n)!==-1;
  }

  function linkCampaignRowsV294(link){
    var company=norm(link&&link.company),campaign=normCampaignV294(link&&link.campaignName);
    if(!company||!campaign)return[];
    return currentMetaRowsV294().filter(function(r){
      return norm(r.company||window.CURRENT_COMPANY)===company&&normCampaignV294(r.campaignName||r.campaign||'')===campaign;
    });
  }

  function linkCampaignStateV294(link){
    var company=text(link&&link.company).toUpperCase(),campaign=normCampaignV294(link&&link.campaignName),rows=state.campaignStatesByCompany[company]||[];
    for(var i=0;i<rows.length;i++){
      var x=rows[i]||{};
      if(normCampaignV294(x.campaignName||x.objectName||'')===campaign)return x;
    }
    return null;
  }

  function linkIsCurrentV294(link){
    var campaignState=linkCampaignStateV294(link),rows=linkCampaignRowsV294(link);
    var active=!!(campaignState&&activeStatusV294(campaignState.status))||rows.some(function(r){return activeStatusV294(r.delivery_status||r.status||r.effective_status||r.configured_status);});
    var hasData=rows.some(rowHasPeriodDataV294);
    return active||hasData;
  }

  function linkDisplayStateV294(link){
    var campaignState=linkCampaignStateV294(link),rows=linkCampaignRowsV294(link);
    var active=!!(campaignState&&activeStatusV294(campaignState.status))||rows.some(function(r){return activeStatusV294(r.delivery_status||r.status||r.effective_status||r.configured_status);});
    if(active)return 'Đang hoạt động';
    if(rows.some(rowHasPeriodDataV294))return 'Đã tắt · Có dữ liệu trong kỳ';
    return 'Không thuộc kỳ hiện tại';
  }

  function structuredMetaRowsForCurrentUserV298(){
    if(!canAccess('ads'))return[];
    var me=norm(displayName());
    if(!me)return[];
    return currentMetaRowsV294().filter(function(r){
      if(!rowIsInCurrentPeriodV294(r))return false;
      if(text(r&&r.adsetNamingMode)!=='pipe_qc_v293')return false;
      return norm(r&&r.employee)===me;
    });
  }

  function currentLinkedCampaignsV294(){
    var out=[],seen={};
    (state.links||[]).forEach(function(link){
      if(!linkIsCurrentV294(link))return;
      var key=norm(link.company)+'|'+normCampaignV294(link.campaignName);
      if(!key||seen[key])return;
      seen[key]=true;out.push(link);
    });

    // V298: nếu Campaign chưa có link Firebase nhưng tên nhóm mới đã chứa đúng họ tên
    // của tài khoản hiện tại, tạo một liên kết chỉ dùng trong giao diện cá nhân.
    // Không ghi ngược Firebase và không thay campaign_employee_links_v1.
    structuredMetaRowsForCurrentUserV298().forEach(function(r){
      var company=text(r.company||window.CURRENT_COMPANY).toUpperCase();
      var campaignName=text(r.campaignName||r.campaign||'').trim();
      if(!company||!campaignName)return;
      var key=norm(company)+'|'+normCampaignV294(campaignName);
      if(seen[key])return;
      seen[key]=true;
      out.push({
        company:company,
        campaignName:campaignName,
        employeeLabel:text(r.employee||displayName()),
        userKey:state.userKey,
        userName:displayName(),
        source:'adset_structured_v298',
        transient:true
      });
    });

    out.sort(function(a,b){return text(a.company).localeCompare(text(b.company))||text(a.campaignName).localeCompare(text(b.campaignName),'vi');});
    return out;
  }

  async function loadAttentionContext(force){
    if(state.attentionContextLoading)return;
    var u=getUser();state.user=u;state.userKey=resolveUserKey();state.profile=findProfile(u);
    if(!u||u.isAnonymous===true||!state.userKey){syncAccountMini();return;}
    if(!force&&state.attentionContextLoadedAt&&Date.now()-state.attentionContextLoadedAt<60000){syncAttentionToNotifications();syncAccountMini();return;}
    state.attentionContextLoading=true;
    try{await Promise.all([loadLinks(),loadCampaignStatesV294()]);state.attentionContextLoadedAt=Date.now();}
    catch(e){}
    finally{state.attentionContextLoading=false;syncAttentionToNotifications();syncAccountMini();}
  }

  async function loadRawActivity(){
    var db=getDb(); if(!db||!state.userKey){state.rawCampaignActivity=[];state.rawAccountActivity=[];return;}
    var p1=db.ref('campaign_activity_notifications_v1/'+state.userKey).orderByChild('createdAtMs').limitToLast(120).once('value').then(function(s){return arr(s.val()||{});}).catch(function(){return[];});
    var p2=db.ref('account_activity_notifications_v1/by_user/'+state.userKey).orderByChild('createdAtMs').limitToLast(120).once('value').then(function(s){return arr(s.val()||{});}).catch(function(){return[];});
    var v=await Promise.all([p1,p2]); state.rawCampaignActivity=v[0];state.rawAccountActivity=v[1];
  }

  function sameActorName(value){var n=norm(value),me=norm(displayName()),email=norm(state.user&&state.user.email);return !!n&&(n===me||n===email||me.indexOf(n)!==-1||n.indexOf(me)!==-1);}
  async function loadUploadLogs(){
    var db=getDb(); if(!db){state.uploadLogs=[];return;}
    try{
      var snap=await db.ref('upload_logs').limitToLast(160).once('value'),rows=arr(snap.val()||{}),uid=text(state.user&&state.user.uid),email=text(state.user&&state.user.email).toLowerCase();
      state.uploadLogs=rows.filter(function(x){
        return text(x.uploaderUid)===uid || text(x.updatedByUid)===uid || text(x.uploaderEmail).toLowerCase()===email || text(x.updatedByEmail).toLowerCase()===email || sameActorName(x.uploader)||sameActorName(x.revenueUploader)||sameActorName(x.statementUploader);
      }).map(function(x){return Object.assign({kind:'upload_log'},x);});
    }catch(e){state.uploadLogs=[];}
  }

  function idTimestamp(id){var m=text(id).match(/(\d{13})/);return m?Number(m[1]):0;}
  async function firebaseRest(path,shallow){
    var u=state.user||getUser(); if(!u||!u.getIdToken)return null;
    var app=null,url=''; try{app=firebase.app();url=text(app.options&&app.options.databaseURL).replace(/\/$/,'');}catch(e){}
    if(!url)return null;
    var token=await u.getIdToken();
    var full=url+'/'+path.replace(/^\/+|\/+$/g,'')+'.json?auth='+encodeURIComponent(token)+(shallow?'&shallow=true':'');
    var r=await fetch(full,{method:'GET',cache:'no-store'}); if(!r.ok)throw new Error('HTTP '+r.status); return r.json();
  }
  async function loadOwnRoasMeta(){
    if(!canAccess('roas')){state.roasUploads=[];return;}
    var uid=text(state.user&&state.user.uid),email=text(state.user&&state.user.email).toLowerCase(),out=[];
    try{
      for(var ci=0;ci<COMPANIES.length;ci++){
        var c=COMPANIES[ci],keys=await firebaseRest('roas_statistics/uploads/'+c,true); keys=Object.keys(keys||{}).sort(function(a,b){return idTimestamp(b)-idTimestamp(a);}).slice(0,14);
        var metas=await Promise.all(keys.map(function(k){return firebaseRest('roas_statistics/uploads/'+c+'/'+encodeURIComponent(k)+'/meta',false).then(function(m){return m?Object.assign({id:k,company:c,kind:'roas_ads'},m):null;}).catch(function(){return null;});}));
        metas.filter(Boolean).forEach(function(m){if(text(m.uploaderUid)===uid||text(m.uploaderEmail).toLowerCase()===email)out.push(m);});
      }
      var chatKeys=await firebaseRest('roas_statistics/chatbot_revenue_uploads',true);chatKeys=Object.keys(chatKeys||{}).sort(function(a,b){return idTimestamp(b)-idTimestamp(a);}).slice(0,20);
      var chatMetas=await Promise.all(chatKeys.map(function(k){return firebaseRest('roas_statistics/chatbot_revenue_uploads/'+encodeURIComponent(k)+'/meta',false).then(function(m){return m?Object.assign({id:k,kind:'roas_revenue'},m):null;}).catch(function(){return null;});}));
      chatMetas.filter(Boolean).forEach(function(m){if(text(m.uploaderUid)===uid||text(m.uploaderEmail).toLowerCase()===email)out.push(m);});
    }catch(e){}
    state.roasUploads=out;
  }

  async function loadData(force){
    if(state.loading)return;
    var u=getUser(); state.user=u; state.userKey=resolveUserKey(); state.profile=findProfile(u);
    if(!u){render();return;}
    if(!force&&state.loadedAt&&Date.now()-state.loadedAt<20000){render();return;}
    state.loading=true;render();
    try{await Promise.all([loadLinks(),loadCampaignStatesV294(),loadRawActivity(),loadUploadLogs(),loadOwnRoasMeta()]);state.loadedAt=Date.now();}
    finally{state.loading=false;render();syncAttentionToNotifications();syncAccountMini();}
  }

  function myMetaRows(){
    if(!canAccess('ads'))return[];
    var rows=currentMetaRowsV294(),links=currentLinkedCampaignsV294();
    if(!rows.length)return[];
    var lookup={};links.forEach(function(l){lookup[norm(l.company)+'|'+normCampaignV294(l.campaignName)]=true;});
    var me=norm(displayName());
    return rows.filter(function(r){
      if(!rowIsInCurrentPeriodV294(r))return false;
      var linked=!!lookup[norm(r.company||window.CURRENT_COMPANY)+'|'+normCampaignV294(r.campaignName||r.campaign||'')];
      var structuredExact=text(r&&r.adsetNamingMode)==='pipe_qc_v293'&&me&&norm(r&&r.employee)===me;
      return linked||structuredExact;
    });
  }

  function attentionItems(){
    var out=[],notifs=personalNotificationItems();
    notifs.forEach(function(n){
      if(isRead(n.id))return;
      var t=text(n.type).toLowerCase(),msg=norm(n.title+' '+n.message);
      var bad=t==='danger'||/KHONG DUOC DUYET|CO VAN DE|BI HAN CHE|LOI|XOA|REMOVED|DISAPPROVED/.test(msg);
      var warn=t==='warning'||/GIAM NGAN SACH|CAN TOI UU|SAP KET THUC|THEO DOI/.test(msg);
      if(bad||warn)out.push({kind:bad?'bad':'warn',title:n.title||'Thông báo cần chú ý',message:n.message||'',createdAtMs:n.createdAtMs||0,page:n.page||'',notificationId:n.id,source:'notification'});
    });
    myMetaRows().forEach(function(r){
      var raw=norm(r.delivery_status||r.status||r.effective_status||''),statusBad=/DISAPPROVED|WITH ISSUES|LIMITED|KHONG DUOC DUYET|CO VAN DE|BI HAN CHE/.test(raw);
      if(statusBad)out.push({kind:'bad',title:'Quảng cáo cần kiểm tra',message:(r.campaignName||'Chiến dịch')+' · '+(r.fullName||r.adName||r.adsetName||'Nhóm quảng cáo')+' · '+text(r.status||r.delivery_status),createdAtMs:toMs(r.syncedAt)||Date.now(),page:'ads',source:'meta'});
      var end=toMs(r.run_end||r.end_time||r.end);if(end){var diff=end-Date.now();if(diff>=0&&diff<=2*86400000)out.push({kind:'warn',title:'Sắp kết thúc lịch chạy',message:(r.campaignName||'Chiến dịch')+' kết thúc '+fmtTime(end),createdAtMs:Date.now(),page:'ads',source:'meta'});}
    });
    var seen={};out=out.filter(function(x){var k=norm(x.title+'|'+x.message);if(seen[k])return false;seen[k]=true;return true;});out.sort(function(a,b){var pa=a.kind==='bad'?2:1,pb=b.kind==='bad'?2:1;return pb-pa||Number(b.createdAtMs||0)-Number(a.createdAtMs||0);});return out;
  }

  function stableHashV293(value){
    var str=text(value),hash=2166136261;
    for(var i=0;i<str.length;i++){hash^=str.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return ('00000000'+(hash>>>0).toString(16)).slice(-8);
  }

  function syncAttentionToNotifications(){
    if(!window.MKTNotificationsV263||typeof window.MKTNotificationsV263.setDerived!=='function')return;
    var derived=attentionItems().filter(function(x){return x.source!=='notification';}).map(function(x){
      var key=stableHashV293(norm(x.title+'|'+x.message+'|'+x.page));
      return {
        id:'user_attention_v293_'+key,
        title:x.title||'Cần chú ý',
        message:x.message||'',
        createdAtMs:Number(x.createdAtMs||Date.now()),
        page:x.page||'home',
        type:x.kind==='bad'?'danger':'warning',
        userAttentionV293:true
      };
    });
    derived.sort(function(a,b){return Number(b.createdAtMs||0)-Number(a.createdAtMs||0);});
    var sig=derived.map(function(x){return x.id+'|'+x.title+'|'+x.message+'|'+x.type;}).join('||');
    if(sig===state.attentionDerivedSignature)return;
    state.attentionDerivedSignature=sig;
    window.MKTNotificationsV263.setDerived('user_attention_v293',derived);
  }

  function showLinkedCampaigns(){
    ensureStyle();
    var modal=document.getElementById('mkt-my-linked-modal-v293');
    if(!modal){
      modal=document.createElement('div');
      modal.id='mkt-my-linked-modal-v293';
      modal.className='mkt-my-linked-modal-v293';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(ev){if(ev.target===modal)closeLinkedCampaigns();});
    }
    var rows=currentLinkedCampaignsV294();
    modal.innerHTML='<div class="mkt-my-linked-dialog-v293" role="dialog" aria-modal="true"><div class="mkt-my-linked-head-v293"><div><h3>Chiến dịch liên kết của tôi</h3><small>'+rows.length+' chiến dịch đang hoạt động hoặc có dữ liệu trong kỳ thuộc tài khoản '+esc(displayName())+'</small></div><button type="button" class="mkt-my-linked-close-v293" aria-label="Đóng">×</button></div><div class="mkt-my-linked-list-v293">'+(rows.length?rows.map(function(x){return '<div class="mkt-my-linked-row-v293"><div><b>'+esc(x.campaignName||'Chiến dịch chưa có tên')+'</b><p>'+(x.employeeLabel?('Nhân sự: '+esc(x.employeeLabel)):'Đã liên kết đúng tài khoản')+'</p><p>Trạng thái: '+esc(linkDisplayStateV294(x))+'</p><span class="mkt-my-linked-company-v293">'+esc(COMPANY_NAMES[x.company]||x.company||'')+'</span></div><button class="mkt-my-btn-v292 primary" type="button" data-linked-campaign-v293="'+esc(x.campaignName||'')+'">Xem quảng cáo</button></div>';}).join(''):'<div class="mkt-my-empty-v292">Không có chiến dịch đang hoạt động hoặc có dữ liệu trong kỳ được liên kết với tài khoản này.</div>')+'</div></div>';
    var close=modal.querySelector('.mkt-my-linked-close-v293');if(close)close.addEventListener('click',closeLinkedCampaigns);
    Array.prototype.forEach.call(modal.querySelectorAll('[data-linked-campaign-v293]'),function(btn){btn.addEventListener('click',function(){closeLinkedCampaigns();openPage('ads');});});
    modal.classList.add('open');state.linkedModalOpen=true;
  }
  function closeLinkedCampaigns(){var modal=document.getElementById('mkt-my-linked-modal-v293');if(modal)modal.classList.remove('open');state.linkedModalOpen=false;}

  function historyItems(){
    var uid=text(state.user&&state.user.uid),out=[];
    (state.rawAccountActivity||[]).forEach(function(x){
      var mine=text(x.actorUid)===uid;
      out.push({time:x.createdAtMs||0,kind:'account',badge:mine?'Tôi thực hiện':'Liên quan đến tôi',title:x.title||'Hoạt động tài khoản',message:x.message||'',page:'admin',mine:mine});
    });
    (state.rawCampaignActivity||[]).forEach(function(x){
      var mine=text(x.writerUid)===uid;
      out.push({time:x.createdAtMs||0,kind:'ads',badge:mine?'Tôi ghi nhận':'Liên quan quảng cáo',title:x.title||'Hoạt động quảng cáo',message:x.message||'',page:'ads',mine:mine});
    });
    (state.uploadLogs||[]).forEach(function(x){
      var t=x.timestamp||x.updatedAt||x.statementTime||x.revenueTime||0;
      out.push({time:t,kind:'file',badge:'Tệp của tôi',title:x.fileName||x.revenueFileName||x.statementFileName||'Tải dữ liệu',message:(x.company?'Công ty '+x.company+' · ':'')+(x.rowCount!==undefined?x.rowCount+' dòng':'')+(x.reportLabel?' · '+x.reportLabel:''),page:'ads',mine:true});
    });
    (state.roasUploads||[]).forEach(function(x){
      out.push({time:x.uploadedAt||x.savedAt||idTimestamp(x.id),kind:'roas',badge:'ROAS của tôi',title:x.fileName||x.id||'Tệp ROAS',message:(x.company?x.company+' · ':'')+(x.type==='chatbot_revenue'?'Doanh thu chatbot':'Chi phí quảng cáo'),page:'roas-stats',mine:true});
    });
    out.sort(function(a,b){return toMs(b.time)-toMs(a.time);});return out;
  }

  function quickModules(){
    var list=[{k:'ads',page:'ads',title:'Quảng cáo',sub:'Xem dữ liệu Meta Live và hiệu quả'},{k:'roas',page:'roas-stats',title:'Thống kê ROAS',sub:'Đối chiếu chi phí và doanh thu'},{k:'ecom',page:'ecom-main',title:'Thương mại điện tử',sub:'Đối soát Shopee và TikTok Shop'},{k:'price',page:'price-setting',title:'Thiết lập giá',sub:'Kiểm tra cấu hình giá đang được cấp quyền'},{k:'compose',page:'compose',title:'Soạn đơn',sub:'Tạo và xử lý đơn hàng'}];
    return list.filter(function(x){return canAccess(x.k);});
  }

  function itemHtml(x){
    var actions='',notif=x.notificationId?findPersonalNotification(x.notificationId):null;
    if(x.page){
      if(x.notificationId)actions+='<button class="mkt-my-btn-v292 primary" onclick="window.MKTUserWorkspaceV293.openNotificationAction(\''+esc(x.notificationId)+'\',\''+esc(x.page)+'\')">'+esc(actionLabel(x.page,notif))+'</button>';
      else actions+='<button class="mkt-my-btn-v292 primary" onclick="window.MKTUserWorkspaceV293.openPage(\''+esc(x.page)+'\')">'+esc(actionLabel(x.page,x))+'</button>';
    }
    if(x.notificationId&&!isRead(x.notificationId))actions+='<button class="mkt-my-btn-v292" onclick="window.MKTUserWorkspaceV293.markSeen(\''+esc(x.notificationId)+'\')">Đã xem</button>';
    return '<div class="mkt-my-item-v292 '+esc(x.kind||'info')+'"><span class="mkt-my-dot-v292"></span><div class="mkt-my-copy-v292"><b>'+esc(x.title||'Thông tin')+'</b><p>'+esc(x.message||'')+'</p><small>'+esc(x.createdAtMs?fmtTime(x.createdAtMs):(x.time?fmtTime(x.time):''))+'</small></div><div class="mkt-my-actions-v292">'+actions+'</div></div>';
  }

  function renderOverview(container){
    var notifs=personalNotificationItems(),unread=notifs.filter(function(x){return !isRead(x.id);}).length,attention=attentionItems(),links=currentLinkedCampaignsV294().length,hist7=historyItems().filter(function(x){return toMs(x.time)>=Date.now()-7*86400000;}).length;
    var recent=notifs.slice(0,6),quick=quickModules();
    container.innerHTML='<div class="mkt-my-kpis-v292">'+
      '<div class="mkt-my-kpi-v292 '+(unread?'warn':'good')+'"><span>Thông báo chưa xem</span><strong>'+unread+'</strong><small>Chỉ tính thông báo cá nhân</small></div>'+
      '<div class="mkt-my-kpi-v292 '+(attention.length?'bad':'good')+'"><span>Cần chú ý</span><strong>'+attention.length+'</strong><small>Việc đang cần kiểm tra</small></div>'+
      '<button type="button" class="mkt-my-kpi-v292 mkt-my-kpi-click-v293" onclick="window.MKTUserWorkspaceV293.showLinkedCampaigns()"><span>Chiến dịch liên kết</span><strong>'+links+'</strong><small>Đang hoạt động hoặc có dữ liệu trong kỳ</small><em class="mkt-my-kpi-link-v293">Bấm để xem cụ thể chiến dịch</em></button>'+
      '<div class="mkt-my-kpi-v292"><span>Hoạt động 7 ngày</span><strong>'+hist7+'</strong><small>Thao tác và sự kiện liên quan</small></div></div>'+
      '<div class="mkt-my-grid-v292">'+
        '<section class="mkt-my-card-v292"><div class="mkt-my-card-head-v292"><strong>Ưu tiên hiện tại</strong><small>'+attention.length+' mục</small></div><div class="mkt-my-list-v292">'+(attention.length?attention.slice(0,5).map(itemHtml).join(''):'<div class="mkt-my-empty-v292">Hiện chưa có cảnh báo cá nhân cần xử lý.</div>')+'</div></section>'+
        '<section class="mkt-my-card-v292"><div class="mkt-my-card-head-v292"><strong>Lối tắt của tôi</strong><small>Theo quyền hiện tại</small></div><div class="mkt-my-quick-v292">'+(quick.length?quick.map(function(q){return '<button onclick="window.MKTUserWorkspaceV293.openPage(\''+q.page+'\')">'+esc(q.title)+'<small>'+esc(q.sub)+'</small></button>';}).join(''):'<div class="mkt-my-empty-v292">Chưa có module được cấp quyền.</div>')+'<button onclick="window.MKTUserWorkspaceV293.openNotificationPanel()">Thông báo của tôi<small>Mở hộp thông báo cá nhân</small></button></div></section>'+
      '</div>'+
      '<section class="mkt-my-card-v292"><div class="mkt-my-card-head-v292"><strong>Thông báo gần đây</strong><small>Có nút xử lý nhanh</small></div><div class="mkt-my-list-v292">'+(recent.length?recent.map(function(n){return itemHtml({kind:(text(n.type).toLowerCase()==='danger'?'bad':(text(n.type).toLowerCase()==='warning'?'warn':'info')),title:n.title,message:n.message,createdAtMs:n.createdAtMs,page:n.page,notificationId:n.id});}).join(''):'<div class="mkt-my-empty-v292">Chưa có thông báo cá nhân.</div>')+'</div></section>';
  }

  function renderAttention(container){
    var rows=attentionItems(),bad=rows.filter(function(x){return x.kind==='bad';}).length,warn=rows.filter(function(x){return x.kind==='warn';}).length;
    container.innerHTML='<div class="mkt-my-attention-summary-v292"><span class="mkt-my-chip-v292 bad">'+bad+' mức cần kiểm tra</span><span class="mkt-my-chip-v292 warn">'+warn+' mức theo dõi</span><span class="mkt-my-chip-v292">Chỉ hiển thị dữ liệu liên quan tài khoản này</span></div><section class="mkt-my-card-v292"><div class="mkt-my-card-head-v292"><strong>Cần chú ý</strong><small>Sắp xếp theo mức độ</small></div><div class="mkt-my-list-v292">'+(rows.length?rows.map(itemHtml).join(''):'<div class="mkt-my-empty-v292">Không có mục cá nhân nào cần chú ý lúc này.</div>')+'</div></section>';
  }

  function renderHistory(container){
    var rows=historyItems(),q=norm(state.searchQuery),filtered=q?rows.filter(function(x){return norm(x.title+' '+x.message+' '+x.badge).indexOf(q)!==-1;}):rows;
    container.innerHTML='<div class="mkt-my-history-tools-v292"><input id="mkt-my-history-search-v292" class="mkt-my-input-v292" placeholder="Tìm trong lịch sử của tôi..." value="'+esc(state.searchQuery)+'"/><button class="mkt-my-refresh-v292" onclick="window.MKTUserWorkspaceV293.refresh()">Làm mới</button></div><section class="mkt-my-card-v292" style="margin-top:10px"><div class="mkt-my-card-head-v292"><strong>Lịch sử của tôi</strong><small>'+filtered.length+' mục gần đây</small></div><div class="mkt-my-list-v292">'+(filtered.length?filtered.slice(0,100).map(function(x){return itemHtml({kind:x.mine?'good':'info',title:x.badge+' · '+x.title,message:x.message,time:x.time,page:x.page});}).join(''):'<div class="mkt-my-empty-v292">Chưa có lịch sử phù hợp.</div>')+'</div></section>';
    var input=document.getElementById('mkt-my-history-search-v292');if(input)input.addEventListener('input',function(){state.searchQuery=input.value;renderHistory(container);var n=document.getElementById('mkt-my-history-search-v292');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}});
  }

  function searchData(query){
    var q=norm(query);if(!q)return[];var out=[];
    personalNotificationItems().forEach(function(n){if(norm(n.title+' '+n.message+' '+n.company+' '+n.campaignName).indexOf(q)!==-1)out.push({icon:'🔔',title:n.title||'Thông báo',message:n.message||'',meta:'Thông báo cá nhân · '+fmtTime(n.createdAtMs),page:n.page||'',notificationId:n.id});});
    historyItems().forEach(function(h){if(norm(h.title+' '+h.message+' '+h.badge).indexOf(q)!==-1)out.push({icon:'🕘',title:h.title,message:h.message,meta:h.badge+' · '+fmtTime(h.time),page:h.page||''});});
    currentLinkedCampaignsV294().forEach(function(l){if(normCampaignV294(l.company+' '+l.campaignName+' '+l.employeeLabel).indexOf(normCampaignV294(q))!==-1)out.push({icon:'📣',title:l.campaignName||'Chiến dịch',message:(l.company||'')+' · '+(l.employeeLabel||''),meta:'Chiến dịch đã liên kết với tài khoản này',page:'ads'});});
    myMetaRows().forEach(function(r){var hay=[r.company,r.campaignName,r.fullName,r.adName,r.adsetName,r.sku,r.skus].join(' ');if(norm(hay).indexOf(q)!==-1)out.push({icon:'📊',title:r.fullName||r.adName||r.campaignName||'Quảng cáo',message:(r.campaignName||'')+(r.company?' · '+r.company:''),meta:'Dữ liệu quảng cáo của tôi đang có trong bộ nhớ hiện tại',page:'ads'});});
    state.roasUploads.forEach(function(r){if(norm(r.fileName+' '+r.company+' '+r.id).indexOf(q)!==-1)out.push({icon:'📁',title:r.fileName||r.id,message:(r.company||'')+' · '+(r.type==='chatbot_revenue'?'Doanh thu chatbot':'Chi phí quảng cáo'),meta:'Tệp ROAS do tôi tải lên',page:'roas-stats'});});
    var seen={};return out.filter(function(x){var k=norm(x.icon+'|'+x.title+'|'+x.message+'|'+x.meta);if(seen[k])return false;seen[k]=true;return true;}).slice(0,80);
  }

  function renderSearch(container){
    var results=state.searchResults||[];
    container.innerHTML='<div class="mkt-my-search-line-v292"><input id="mkt-my-search-input-v292" class="mkt-my-input-v292" placeholder="Tìm chiến dịch, SKU, tên file, thông báo..." value="'+esc(state.searchQuery)+'"/><button class="mkt-my-search-btn-v292" id="mkt-my-search-btn-v292">Tìm kiếm</button></div><div class="mkt-my-filter-v292"><span class="mkt-my-chip-v292">Phạm vi: dữ liệu của chính tài khoản này</span>'+(canAccess('ads')?'<span class="mkt-my-chip-v292">Quảng cáo</span>':'')+(canAccess('roas')?'<span class="mkt-my-chip-v292">ROAS</span>':'')+'</div><div id="mkt-my-search-results-v292" style="display:grid;gap:8px;margin-top:10px">'+(state.searchQuery?(results.length?results.map(function(x){return '<div class="mkt-my-search-result-v292"><div class="mkt-my-search-icon-v292">'+esc(x.icon)+'</div><div><b>'+esc(x.title)+'</b><p>'+esc(x.message)+'</p><small>'+esc(x.meta)+'</small></div><div class="mkt-my-actions-v292">'+(x.page?'<button class="mkt-my-btn-v292 primary" onclick="'+(x.notificationId?'window.MKTUserWorkspaceV293.openNotificationAction(\''+esc(x.notificationId)+'\',\''+esc(x.page)+'\')':'window.MKTUserWorkspaceV293.openPage(\''+esc(x.page)+'\')')+'">'+esc(actionLabel(x.page,x.notificationId?findPersonalNotification(x.notificationId):x))+'</button>':'')+'</div></div>';}).join(''):'<div class="mkt-my-empty-v292">Không tìm thấy dữ liệu cá nhân phù hợp.</div>'):'<div class="mkt-my-empty-v292">Nhập nội dung để tìm trong dữ liệu cá nhân của bạn.</div>')+'</div>';
    var input=document.getElementById('mkt-my-search-input-v292'),btn=document.getElementById('mkt-my-search-btn-v292');
    function run(){state.searchQuery=input?input.value:'';state.searchResults=searchData(state.searchQuery);renderSearch(container);var n=document.getElementById('mkt-my-search-input-v292');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}}
    if(btn)btn.addEventListener('click',run);if(input)input.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();run();}});
  }

  function render(){
    var box=ensureMount();if(!box)return;
    ensureStyle();ensureAccountMenu();
    state.user=getUser();state.userKey=resolveUserKey();state.profile=findProfile(state.user);
    var anonymous=!!(state.user&&state.user.isAnonymous===true),body='';
    if(!state.user){body='<div class="mkt-my-empty-v292">Vui lòng đăng nhập để xem không gian làm việc cá nhân.</div>';}
    else if(anonymous||!state.userKey){body='<div class="mkt-my-empty-v292">Tài khoản Khách hoặc tài khoản chưa có hồ sơ hệ thống không có lịch sử cá nhân. Bạn vẫn có thể sử dụng các module được cấp quyền xem.</div>';}
    else {
      var content='<div id="mkt-my-content-v292"></div>';
      body='<div class="mkt-my-shell-v292"><section class="mkt-my-hero-v292"><div><h2>Công việc của '+esc(displayName())+'</h2><p>Tập trung các thông báo, việc cần chú ý, lịch sử và tìm kiếm liên quan trực tiếp tới tài khoản đang đăng nhập.</p><span class="mkt-my-role-v292">'+esc(roleLabel())+'</span></div><button class="mkt-my-refresh-v292" onclick="window.MKTUserWorkspaceV293.refresh()">Làm mới dữ liệu</button></section><div class="mkt-my-tabs-v292"><button class="mkt-my-tab-v292 '+(state.active==='overview'?'active':'')+'" data-mkt-my-tab-v292="overview">Công việc của tôi</button><button class="mkt-my-tab-v292 '+(state.active==='attention'?'active':'')+'" data-mkt-my-tab-v292="attention">Cần chú ý</button><button class="mkt-my-tab-v292 '+(state.active==='history'?'active':'')+'" data-mkt-my-tab-v292="history">Lịch sử của tôi</button><button class="mkt-my-tab-v292 '+(state.active==='search'?'active':'')+'" data-mkt-my-tab-v292="search">Tìm kiếm của tôi</button></div>'+(state.loading?'<div class="mkt-my-chip-v292">Đang đồng bộ dữ liệu cá nhân...</div>':'')+content+'</div>';
    }
    box.innerHTML=body;
    Array.prototype.forEach.call(box.querySelectorAll('[data-mkt-my-tab-v292]'),function(tab){tab.addEventListener('click',function(){state.active=tab.getAttribute('data-mkt-my-tab-v292')||'overview';state.searchQuery='';state.searchResults=[];render();});});
    var c=document.getElementById('mkt-my-content-v292');if(c){if(state.active==='overview')renderOverview(c);else if(state.active==='attention')renderAttention(c);else if(state.active==='history')renderHistory(c);else renderSearch(c);}
    decorateNotificationRows();
  }

  var renderTimer=null;
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(function(){var box=document.getElementById('mkt-user-workspace-v292'),ae=document.activeElement;if(state.opened&&box&&ae&&box.contains(ae)&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT')){decorateNotificationRows();return;}if(state.opened)render();decorateNotificationRows();syncAttentionToNotifications();syncAccountMini();},120);}
  async function refresh(){state.loadedAt=0;await loadData(true);syncAttentionToNotifications();syncAccountMini();showToast('Đã làm mới dữ liệu cá nhân.','success');}

  function boot(){
    ensureStyle();ensureAccountMenu();ensureMount();installNotificationDecorator();
    var auth=getAuth();
    if(auth&&typeof auth.onAuthStateChanged==='function')auth.onAuthStateChanged(function(u){state.user=u||null;state.userKey='';state.profile=null;state.loadedAt=0;setTimeout(function(){state.userKey=resolveUserKey();state.profile=findProfile(u);state.attentionContextLoadedAt=0;ensureAccountMenu();loadAttentionContext(true);if(state.opened)loadData(true);render();syncAttentionToNotifications();syncAccountMini();},500);});
    window.addEventListener('hashchange',function(){var raw=text(location.hash).replace(/^#\/?/,'').split('?')[0]||'home';if(raw!=='home')closeWorkspace(true);else{try{if(sessionStorage.getItem(SESSION_KEY)==='1')setTimeout(showWorkspaceUi,60);}catch(e){}}});
    setInterval(function(){ensureAccountMenu();var box=ensureMount();decorateNotificationRows();loadAttentionContext(false);syncAttentionToNotifications();syncAccountMini();if(state.opened&&box&&!box.firstElementChild)render();},5000);
    document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&state.linkedModalOpen)closeLinkedCampaigns();});
    try{if(sessionStorage.getItem(SESSION_KEY)==='1'&&(!location.hash||/home/.test(location.hash)))setTimeout(showWorkspaceUi,900);}catch(e){}
  }

  var apiV294={
    version:VERSION,
    open:openWorkspace,
    openAttention:function(){openWorkspace('attention');},
    close:function(){closeWorkspace(true);},
    refresh:refresh,
    render:render,
    openPage:openPage,
    openNotificationAction:openNotificationAction,
    markSeen:markSeen,
    openNotificationPanel:openNotificationPanel,
    showLinkedCampaigns:showLinkedCampaigns,
    closeLinkedCampaigns:closeLinkedCampaigns,
    syncAttentionToNotifications:syncAttentionToNotifications,
    getState:function(){return state;}
  };
  window.MKTUserWorkspaceV296=apiV294;
  window.MKTUserWorkspaceV295=apiV294;
  window.MKTUserWorkspaceV294=apiV294; // alias tương thích V294
  window.MKTUserWorkspaceV293=apiV294; // alias tương thích V293
  window.MKTUserWorkspaceV292=apiV294; // alias tương thích V292

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

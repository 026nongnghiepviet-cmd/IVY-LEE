/* =========================================================
   USER WORKSPACE - V292 PERSONAL OPERATIONS
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
(function installMktUserWorkspaceV292(){
  'use strict';
  if (window.__MKT_USER_WORKSPACE_V292) return;
  window.__MKT_USER_WORKSPACE_V292 = true;

  var VERSION = 'V292_PERSONAL_OPERATIONS';
  var SESSION_KEY = 'MKT_USER_WORKSPACE_OPEN_V292';
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
    refreshTimer:null
  };

  function text(v){ return String(v === null || v === undefined ? '' : v); }
  function esc(v){ return text(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function norm(v){
    return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
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
      '@media(max-width:950px){.mkt-my-grid-v292{grid-template-columns:1fr}.mkt-my-kpis-v292{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media(max-width:700px){.mkt-my-hero-v292{grid-template-columns:1fr;padding:14px;border-radius:18px}.mkt-my-hero-v292 h2{font-size:18px}.mkt-my-hero-v292 p{font-size:9.5px}.mkt-my-refresh-v292{width:100%}.mkt-my-tabs-v292{display:flex;overflow-x:auto;scrollbar-width:none;padding:6px}.mkt-my-tabs-v292::-webkit-scrollbar{display:none}.mkt-my-tab-v292{flex:0 0 auto;min-width:118px}.mkt-my-kpis-v292{grid-template-columns:1fr 1fr;gap:7px}.mkt-my-kpi-v292{padding:11px}.mkt-my-kpi-v292 strong{font-size:18px}.mkt-my-item-v292{grid-template-columns:8px minmax(0,1fr);padding:10px 11px}.mkt-my-item-v292>.mkt-my-actions-v292{grid-column:2;justify-content:flex-start}.mkt-my-quick-v292{grid-template-columns:1fr 1fr;padding:10px}.mkt-my-history-tools-v292,.mkt-my-search-line-v292{grid-template-columns:1fr}.mkt-my-search-btn-v292{height:40px}.mkt-my-search-result-v292{grid-template-columns:32px minmax(0,1fr)}.mkt-my-search-result-v292>.mkt-my-actions-v292{grid-column:2;justify-content:flex-start}}',
      '@media(max-width:430px){.mkt-my-kpis-v292{grid-template-columns:1fr}.mkt-my-quick-v292{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  function ensureNav(){
    var menu=document.querySelector('.top-nav .nav-menu'); if(!menu)return;
    var nav=menu.querySelector('[data-mkt-user-workspace-nav-v292="1"]');
    if(!nav){
      nav=document.createElement('div');
      nav.className='nav-link mkt-my-nav-v292';
      nav.setAttribute('data-mkt-user-workspace-nav-v292','1');
      nav.textContent='Của tôi';
      nav.addEventListener('click',function(ev){ev.preventDefault();openWorkspace();});
      var home=menu.querySelector('.nav-link[data-page="home"]');
      if(home&&home.nextSibling)menu.insertBefore(nav,home.nextSibling);else if(home)menu.appendChild(nav);else menu.insertBefore(nav,menu.firstChild||null);
    }
    if(!state.homeBound){
      var homeNav=menu.querySelector('.nav-link[data-page="home"]');
      if(homeNav){homeNav.addEventListener('click',function(){closeWorkspace(true);},true);state.homeBound=true;}
    }
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

  function setNavActive(on){
    var nav=document.querySelector('[data-mkt-user-workspace-nav-v292="1"]');
    var home=document.querySelector('.top-nav .nav-link[data-page="home"]');
    if(nav)nav.classList.toggle('active',!!on);
    if(home&&on)home.classList.remove('active');
  }

  function showWorkspaceUi(){
    var page=document.getElementById('page-home'),box=ensureMount(); if(!page||!box)return;
    var shell=page.querySelector('.home-shell'); if(shell)shell.style.display='none';
    box.style.display='block'; state.opened=true; setNavActive(true);
    try{sessionStorage.setItem(SESSION_KEY,'1');}catch(e){}
    render(); loadData(false);
  }

  function openWorkspace(){
    ensureNav(); ensureMount();
    var current=''; try{current=window.MKTRouter&&window.MKTRouter.getCurrentRoute?window.MKTRouter.getCurrentRoute():'';}catch(e){}
    if(current!=='home'&&typeof window.goPage==='function'){
      window.goPage('home'); setTimeout(showWorkspaceUi,70);
    } else showWorkspaceUi();
    if(window.closeMobileAppMenu)window.closeMobileAppMenu();
  }

  function closeWorkspace(clearSession){
    var box=document.getElementById('mkt-user-workspace-v292'); if(box)box.style.display='none';
    var page=document.getElementById('page-home'),shell=page&&page.querySelector('.home-shell'); if(shell)shell.style.display='';
    state.opened=false; setNavActive(false);
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

  function actionLabel(page){
    var map={ads:'Xem quảng cáo','roas-stats':'Xem ROAS','ecom-main':'Mở TMĐT',shopee:'Mở Shopee',tiktok:'Mở TikTok Shop','price-setting':'Mở thiết lập giá',compose:'Mở soạn đơn',admin:'Mở quản trị',home:'Về trang chủ'};
    return map[page]||'Mở nội dung';
  }
  function openPage(page,id){
    if(id&&window.MKTNotificationsV263&&typeof window.MKTNotificationsV263.markRead==='function')window.MKTNotificationsV263.markRead(id);
    if(page&&typeof window.goPage==='function'){closeWorkspace(true);window.goPage(page);}
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
        var open=document.createElement('button');open.type='button';open.className='mkt-user-notif-action-v292 primary';open.textContent=actionLabel(page);
        open.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();openPage(page,id);if(window.MKTNotificationsV263)window.MKTNotificationsV263.close();});bar.appendChild(open);
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
    state.notificationObserver=new MutationObserver(function(){setTimeout(decorateNotificationRows,0);scheduleRender();});
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
    try{await Promise.all([loadLinks(),loadRawActivity(),loadUploadLogs(),loadOwnRoasMeta()]);state.loadedAt=Date.now();}
    finally{state.loading=false;render();}
  }

  function myMetaRows(){
    if(!canAccess('ads'))return[];
    var rows=Array.isArray(window.META_LIVE_DATA)?window.META_LIVE_DATA:[],links=state.links||[];
    if(!rows.length||!links.length)return[];
    var lookup={};links.forEach(function(l){lookup[norm(l.company)+'|'+norm(l.campaignName)]=true;});
    return rows.filter(function(r){return !!lookup[norm(r.company||window.CURRENT_COMPANY)+'|'+norm(r.campaignName||r.campaign||'')];});
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
    var actions='';
    if(x.page)actions+='<button class="mkt-my-btn-v292 primary" onclick="window.MKTUserWorkspaceV292.openPage(\''+esc(x.page)+'\',\''+esc(x.notificationId||'')+'\')">'+esc(actionLabel(x.page))+'</button>';
    if(x.notificationId&&!isRead(x.notificationId))actions+='<button class="mkt-my-btn-v292" onclick="window.MKTUserWorkspaceV292.markSeen(\''+esc(x.notificationId)+'\')">Đã xem</button>';
    return '<div class="mkt-my-item-v292 '+esc(x.kind||'info')+'"><span class="mkt-my-dot-v292"></span><div class="mkt-my-copy-v292"><b>'+esc(x.title||'Thông tin')+'</b><p>'+esc(x.message||'')+'</p><small>'+esc(x.createdAtMs?fmtTime(x.createdAtMs):(x.time?fmtTime(x.time):''))+'</small></div><div class="mkt-my-actions-v292">'+actions+'</div></div>';
  }

  function renderOverview(container){
    var notifs=personalNotificationItems(),unread=notifs.filter(function(x){return !isRead(x.id);}).length,attention=attentionItems(),links=state.links.length,hist7=historyItems().filter(function(x){return toMs(x.time)>=Date.now()-7*86400000;}).length;
    var recent=notifs.slice(0,6),quick=quickModules();
    container.innerHTML='<div class="mkt-my-kpis-v292">'+
      '<div class="mkt-my-kpi-v292 '+(unread?'warn':'good')+'"><span>Thông báo chưa xem</span><strong>'+unread+'</strong><small>Chỉ tính thông báo cá nhân</small></div>'+
      '<div class="mkt-my-kpi-v292 '+(attention.length?'bad':'good')+'"><span>Cần chú ý</span><strong>'+attention.length+'</strong><small>Việc đang cần kiểm tra</small></div>'+
      '<div class="mkt-my-kpi-v292"><span>Chiến dịch liên kết</span><strong>'+links+'</strong><small>Đã xác định thuộc tài khoản này</small></div>'+
      '<div class="mkt-my-kpi-v292"><span>Hoạt động 7 ngày</span><strong>'+hist7+'</strong><small>Thao tác và sự kiện liên quan</small></div></div>'+
      '<div class="mkt-my-grid-v292">'+
        '<section class="mkt-my-card-v292"><div class="mkt-my-card-head-v292"><strong>Ưu tiên hiện tại</strong><small>'+attention.length+' mục</small></div><div class="mkt-my-list-v292">'+(attention.length?attention.slice(0,5).map(itemHtml).join(''):'<div class="mkt-my-empty-v292">Hiện chưa có cảnh báo cá nhân cần xử lý.</div>')+'</div></section>'+
        '<section class="mkt-my-card-v292"><div class="mkt-my-card-head-v292"><strong>Lối tắt của tôi</strong><small>Theo quyền hiện tại</small></div><div class="mkt-my-quick-v292">'+(quick.length?quick.map(function(q){return '<button onclick="window.MKTUserWorkspaceV292.openPage(\''+q.page+'\')">'+esc(q.title)+'<small>'+esc(q.sub)+'</small></button>';}).join(''):'<div class="mkt-my-empty-v292">Chưa có module được cấp quyền.</div>')+'<button onclick="window.MKTUserWorkspaceV292.openNotificationPanel()">Thông báo của tôi<small>Mở hộp thông báo cá nhân</small></button></div></section>'+
      '</div>'+
      '<section class="mkt-my-card-v292"><div class="mkt-my-card-head-v292"><strong>Thông báo gần đây</strong><small>Có nút xử lý nhanh</small></div><div class="mkt-my-list-v292">'+(recent.length?recent.map(function(n){return itemHtml({kind:(text(n.type).toLowerCase()==='danger'?'bad':(text(n.type).toLowerCase()==='warning'?'warn':'info')),title:n.title,message:n.message,createdAtMs:n.createdAtMs,page:n.page,notificationId:n.id});}).join(''):'<div class="mkt-my-empty-v292">Chưa có thông báo cá nhân.</div>')+'</div></section>';
  }

  function renderAttention(container){
    var rows=attentionItems(),bad=rows.filter(function(x){return x.kind==='bad';}).length,warn=rows.filter(function(x){return x.kind==='warn';}).length;
    container.innerHTML='<div class="mkt-my-attention-summary-v292"><span class="mkt-my-chip-v292 bad">'+bad+' mức cần kiểm tra</span><span class="mkt-my-chip-v292 warn">'+warn+' mức theo dõi</span><span class="mkt-my-chip-v292">Chỉ hiển thị dữ liệu liên quan tài khoản này</span></div><section class="mkt-my-card-v292"><div class="mkt-my-card-head-v292"><strong>Cần chú ý</strong><small>Sắp xếp theo mức độ</small></div><div class="mkt-my-list-v292">'+(rows.length?rows.map(itemHtml).join(''):'<div class="mkt-my-empty-v292">Không có mục cá nhân nào cần chú ý lúc này.</div>')+'</div></section>';
  }

  function renderHistory(container){
    var rows=historyItems(),q=norm(state.searchQuery),filtered=q?rows.filter(function(x){return norm(x.title+' '+x.message+' '+x.badge).indexOf(q)!==-1;}):rows;
    container.innerHTML='<div class="mkt-my-history-tools-v292"><input id="mkt-my-history-search-v292" class="mkt-my-input-v292" placeholder="Tìm trong lịch sử của tôi..." value="'+esc(state.searchQuery)+'"/><button class="mkt-my-refresh-v292" onclick="window.MKTUserWorkspaceV292.refresh()">Làm mới</button></div><section class="mkt-my-card-v292" style="margin-top:10px"><div class="mkt-my-card-head-v292"><strong>Lịch sử của tôi</strong><small>'+filtered.length+' mục gần đây</small></div><div class="mkt-my-list-v292">'+(filtered.length?filtered.slice(0,100).map(function(x){return itemHtml({kind:x.mine?'good':'info',title:x.badge+' · '+x.title,message:x.message,time:x.time,page:x.page});}).join(''):'<div class="mkt-my-empty-v292">Chưa có lịch sử phù hợp.</div>')+'</div></section>';
    var input=document.getElementById('mkt-my-history-search-v292');if(input)input.addEventListener('input',function(){state.searchQuery=input.value;renderHistory(container);var n=document.getElementById('mkt-my-history-search-v292');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}});
  }

  function searchData(query){
    var q=norm(query);if(!q)return[];var out=[];
    personalNotificationItems().forEach(function(n){if(norm(n.title+' '+n.message+' '+n.company+' '+n.campaignName).indexOf(q)!==-1)out.push({icon:'🔔',title:n.title||'Thông báo',message:n.message||'',meta:'Thông báo cá nhân · '+fmtTime(n.createdAtMs),page:n.page||'',notificationId:n.id});});
    historyItems().forEach(function(h){if(norm(h.title+' '+h.message+' '+h.badge).indexOf(q)!==-1)out.push({icon:'🕘',title:h.title,message:h.message,meta:h.badge+' · '+fmtTime(h.time),page:h.page||''});});
    state.links.forEach(function(l){if(norm(l.company+' '+l.campaignName+' '+l.employeeLabel).indexOf(q)!==-1)out.push({icon:'📣',title:l.campaignName||'Chiến dịch',message:(l.company||'')+' · '+(l.employeeLabel||''),meta:'Chiến dịch đã liên kết với tài khoản này',page:'ads'});});
    myMetaRows().forEach(function(r){var hay=[r.company,r.campaignName,r.fullName,r.adName,r.adsetName,r.sku,r.skus].join(' ');if(norm(hay).indexOf(q)!==-1)out.push({icon:'📊',title:r.fullName||r.adName||r.campaignName||'Quảng cáo',message:(r.campaignName||'')+(r.company?' · '+r.company:''),meta:'Dữ liệu quảng cáo của tôi đang có trong bộ nhớ hiện tại',page:'ads'});});
    state.roasUploads.forEach(function(r){if(norm(r.fileName+' '+r.company+' '+r.id).indexOf(q)!==-1)out.push({icon:'📁',title:r.fileName||r.id,message:(r.company||'')+' · '+(r.type==='chatbot_revenue'?'Doanh thu chatbot':'Chi phí quảng cáo'),meta:'Tệp ROAS do tôi tải lên',page:'roas-stats'});});
    var seen={};return out.filter(function(x){var k=norm(x.icon+'|'+x.title+'|'+x.message+'|'+x.meta);if(seen[k])return false;seen[k]=true;return true;}).slice(0,80);
  }

  function renderSearch(container){
    var results=state.searchResults||[];
    container.innerHTML='<div class="mkt-my-search-line-v292"><input id="mkt-my-search-input-v292" class="mkt-my-input-v292" placeholder="Tìm chiến dịch, SKU, tên file, thông báo..." value="'+esc(state.searchQuery)+'"/><button class="mkt-my-search-btn-v292" id="mkt-my-search-btn-v292">Tìm kiếm</button></div><div class="mkt-my-filter-v292"><span class="mkt-my-chip-v292">Phạm vi: dữ liệu của chính tài khoản này</span>'+(canAccess('ads')?'<span class="mkt-my-chip-v292">Quảng cáo</span>':'')+(canAccess('roas')?'<span class="mkt-my-chip-v292">ROAS</span>':'')+'</div><div id="mkt-my-search-results-v292" style="display:grid;gap:8px;margin-top:10px">'+(state.searchQuery?(results.length?results.map(function(x){return '<div class="mkt-my-search-result-v292"><div class="mkt-my-search-icon-v292">'+esc(x.icon)+'</div><div><b>'+esc(x.title)+'</b><p>'+esc(x.message)+'</p><small>'+esc(x.meta)+'</small></div><div class="mkt-my-actions-v292">'+(x.page?'<button class="mkt-my-btn-v292 primary" onclick="window.MKTUserWorkspaceV292.openPage(\''+esc(x.page)+'\',\''+esc(x.notificationId||'')+'\')">'+esc(actionLabel(x.page))+'</button>':'')+'</div></div>';}).join(''):'<div class="mkt-my-empty-v292">Không tìm thấy dữ liệu cá nhân phù hợp.</div>'):'<div class="mkt-my-empty-v292">Nhập nội dung để tìm trong dữ liệu cá nhân của bạn.</div>')+'</div>';
    var input=document.getElementById('mkt-my-search-input-v292'),btn=document.getElementById('mkt-my-search-btn-v292');
    function run(){state.searchQuery=input?input.value:'';state.searchResults=searchData(state.searchQuery);renderSearch(container);var n=document.getElementById('mkt-my-search-input-v292');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}}
    if(btn)btn.addEventListener('click',run);if(input)input.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();run();}});
  }

  function render(){
    var box=ensureMount();if(!box)return;
    ensureStyle();ensureNav();
    state.user=getUser();state.userKey=resolveUserKey();state.profile=findProfile(state.user);
    var anonymous=!!(state.user&&state.user.isAnonymous===true),body='';
    if(!state.user){body='<div class="mkt-my-empty-v292">Vui lòng đăng nhập để xem không gian làm việc cá nhân.</div>';}
    else if(anonymous||!state.userKey){body='<div class="mkt-my-empty-v292">Tài khoản Khách hoặc tài khoản chưa có hồ sơ hệ thống không có lịch sử cá nhân. Bạn vẫn có thể sử dụng các module được cấp quyền xem.</div>';}
    else {
      var content='<div id="mkt-my-content-v292"></div>';
      body='<div class="mkt-my-shell-v292"><section class="mkt-my-hero-v292"><div><h2>Công việc của '+esc(displayName())+'</h2><p>Tập trung các thông báo, việc cần chú ý, lịch sử và tìm kiếm liên quan trực tiếp tới tài khoản đang đăng nhập.</p><span class="mkt-my-role-v292">'+esc(roleLabel())+'</span></div><button class="mkt-my-refresh-v292" onclick="window.MKTUserWorkspaceV292.refresh()">Làm mới dữ liệu</button></section><div class="mkt-my-tabs-v292"><button class="mkt-my-tab-v292 '+(state.active==='overview'?'active':'')+'" data-mkt-my-tab-v292="overview">Công việc của tôi</button><button class="mkt-my-tab-v292 '+(state.active==='attention'?'active':'')+'" data-mkt-my-tab-v292="attention">Cần chú ý</button><button class="mkt-my-tab-v292 '+(state.active==='history'?'active':'')+'" data-mkt-my-tab-v292="history">Lịch sử của tôi</button><button class="mkt-my-tab-v292 '+(state.active==='search'?'active':'')+'" data-mkt-my-tab-v292="search">Tìm kiếm của tôi</button></div>'+(state.loading?'<div class="mkt-my-chip-v292">Đang đồng bộ dữ liệu cá nhân...</div>':'')+content+'</div>';
    }
    box.innerHTML=body;
    Array.prototype.forEach.call(box.querySelectorAll('[data-mkt-my-tab-v292]'),function(tab){tab.addEventListener('click',function(){state.active=tab.getAttribute('data-mkt-my-tab-v292')||'overview';state.searchQuery='';state.searchResults=[];render();});});
    var c=document.getElementById('mkt-my-content-v292');if(c){if(state.active==='overview')renderOverview(c);else if(state.active==='attention')renderAttention(c);else if(state.active==='history')renderHistory(c);else renderSearch(c);}
    decorateNotificationRows();
  }

  var renderTimer=null;
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(function(){var box=document.getElementById('mkt-user-workspace-v292'),ae=document.activeElement;if(state.opened&&box&&ae&&box.contains(ae)&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT')){decorateNotificationRows();return;}if(state.opened)render();decorateNotificationRows();},120);}
  async function refresh(){state.loadedAt=0;await loadData(true);showToast('Đã làm mới dữ liệu cá nhân.','success');}

  function boot(){
    ensureStyle();ensureNav();ensureMount();installNotificationDecorator();
    var auth=getAuth();
    if(auth&&typeof auth.onAuthStateChanged==='function')auth.onAuthStateChanged(function(u){state.user=u||null;state.userKey='';state.profile=null;state.loadedAt=0;setTimeout(function(){state.userKey=resolveUserKey();state.profile=findProfile(u);if(state.opened)loadData(true);render();},500);});
    window.addEventListener('hashchange',function(){var raw=text(location.hash).replace(/^#\/?/,'').split('?')[0]||'home';if(raw!=='home')closeWorkspace(true);else{try{if(sessionStorage.getItem(SESSION_KEY)==='1')setTimeout(showWorkspaceUi,60);}catch(e){}}});
    setInterval(function(){ensureNav();var box=ensureMount();decorateNotificationRows();if(state.opened&&box&&!box.firstElementChild)render();},5000);
    try{if(sessionStorage.getItem(SESSION_KEY)==='1'&&(!location.hash||/home/.test(location.hash)))setTimeout(showWorkspaceUi,900);}catch(e){}
  }

  window.MKTUserWorkspaceV292={
    version:VERSION,
    open:openWorkspace,
    close:function(){closeWorkspace(true);},
    refresh:refresh,
    render:render,
    openPage:openPage,
    markSeen:markSeen,
    openNotificationPanel:openNotificationPanel,
    getState:function(){return state;}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

/* =========================================================
   MKT SYSTEM ANNOUNCEMENT CENTER - V1
   - Broadcast thông báo thường: 1 bản ghi chung, hiện trong chuông hiện có.
   - Maintenance mode: 1 trạng thái current, khóa giao diện realtime cho non-admin.
   - Admin UI được render trong Admin Control Center.
   - Không nhân bản cùng thông báo vào từng user.
   ========================================================= */
(function(){
  'use strict';
  if (window.__MKT_SYSTEM_ANNOUNCEMENT_CENTER_V1) return;
  window.__MKT_SYSTEM_ANNOUNCEMENT_CENTER_V1 = true;

  var ROOT = 'system_announcements_v1';
  var VERSION = 'MKT_SYSTEM_ANNOUNCEMENT_CENTER_V1';
  var state = {
    user:null,
    broadcasts:{},
    maintenance:null,
    broadcastRef:null,
    maintenanceRef:null,
    adminMode:'normal',
    adminMounted:false
  };

  function getDb(){
    try { if (window.sysDb) return window.sysDb; } catch(e) {}
    try { if (typeof firebase!=='undefined' && firebase.apps && firebase.apps.length) return firebase.database(); } catch(e) {}
    return null;
  }
  function getAuth(){
    try { if (window.sysAuth) return window.sysAuth; } catch(e) {}
    try { if (typeof firebase!=='undefined' && firebase.apps && firebase.apps.length) return firebase.auth(); } catch(e) {}
    return null;
  }
  function esc(v){return String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function safe(v){return String(v===null||v===undefined?'':v).trim()}
  function safeKey(v){return safe(v).replace(/[.#$\[\]\/]/g,'_')}
  function now(){return Date.now()}
  function fmt(ms){try{return new Date(Number(ms||0)).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
  function toast(msg,type){try{if(typeof window.showToast==='function')return window.showToast(msg,type||'success')}catch(e){}; console.log(msg)}
  function isAdminSync(){
    try { if (window.MKTRBAC && typeof window.MKTRBAC.isAdmin==='function') return window.MKTRBAC.isAdmin()===true; } catch(e) {}
    try { if (String(window.MKT_CURRENT_ROLE||'').toLowerCase()==='admin') return true; } catch(e) {}
    var user=state.user;
    return !!(user && safe(user.email).toLowerCase()==='aichatgptnnv@gmail.com');
  }
  function isAdminAsync(){
    if (isAdminSync()) return Promise.resolve(true);
    var db=getDb(), user=state.user;
    if(!db||!user||!user.uid) return Promise.resolve(false);
    return db.ref('system_settings/admin_uids/'+safeKey(user.uid)).once('value').then(function(s){return s.val()===true}).catch(function(){return false});
  }
  function normalizeLink(raw){
    var s=safe(raw);
    if(!s) return '';
    if(/^#\/?[a-z0-9_-]+(?:[?&].*)?$/i.test(s)) return s;
    if(/^https?:\/\//i.test(s)) return s;
    return '';
  }
  function openLink(url){
    url=normalizeLink(url); if(!url) return;
    if(url.charAt(0)==='#'){
      var route=url.replace(/^#\/?/,'').split(/[?&]/)[0];
      if(route && typeof window.goPage==='function') window.goPage(route);
      else window.location.hash=url;
      return;
    }
    try { window.open(url,'_blank','noopener,noreferrer'); } catch(e) { window.location.href=url; }
  }

  function ensureStyles(){
    if(document.getElementById('mkt-system-announcement-style-v1')) return;
    var st=document.createElement('style'); st.id='mkt-system-announcement-style-v1';
    st.textContent=`
      .mkt-ann-admin-v1,.mkt-ann-admin-v1 *{font-family:Tahoma,Arial,"Segoe UI",sans-serif!important;font-synthesis:none;letter-spacing:0}
      .mkt-ann-admin-v1{display:grid;gap:14px;color:#0f172a}.mkt-ann-toolbar-v1{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}.mkt-ann-title-v1 h3{margin:0;font-size:18px;font-weight:700}.mkt-ann-title-v1 p{margin:5px 0 0;color:#64748b;font-size:11px;line-height:1.5}.mkt-ann-mode-v1{display:flex;gap:7px;padding:4px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.mkt-ann-mode-v1 button{border:0;background:transparent;color:#64748b;border-radius:10px;padding:8px 12px;font-size:11px;font-weight:600;cursor:pointer}.mkt-ann-mode-v1 button.active{background:#fff;color:#1d4ed8;box-shadow:0 4px 12px rgba(15,23,42,.08)}
      .mkt-ann-grid-v1{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:14px}.mkt-ann-card-v1{border:1px solid #e2e8f0;border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.04)}.mkt-ann-card-head-v1{padding:13px 15px;border-bottom:1px solid #eef2f7;background:#fbfdff}.mkt-ann-card-head-v1 strong{font-size:12px;font-weight:700}.mkt-ann-card-head-v1 small{display:block;margin-top:4px;color:#94a3b8;font-size:9px;line-height:1.45}.mkt-ann-form-v1{padding:14px;display:grid;gap:11px}.mkt-ann-field-v1{display:grid;gap:5px}.mkt-ann-field-v1 label{color:#334155;font-size:10px;font-weight:600}.mkt-ann-input-v1,.mkt-ann-textarea-v1,.mkt-ann-select-v1{width:100%;border:1px solid #dbe4f0!important;border-radius:12px!important;background:#fff!important;color:#0f172a!important;padding:10px 11px!important;font:500 11px Tahoma,Arial,sans-serif!important;outline:none!important}.mkt-ann-textarea-v1{min-height:110px;resize:vertical;line-height:1.55}.mkt-ann-input-v1:focus,.mkt-ann-textarea-v1:focus,.mkt-ann-select-v1:focus{border-color:#93c5fd!important;box-shadow:0 0 0 3px rgba(37,99,235,.09)!important}.mkt-ann-row-v1{display:grid;grid-template-columns:1fr 1fr;gap:9px}.mkt-ann-actions-v1{display:flex;gap:8px;flex-wrap:wrap}.mkt-ann-btn-v1{border:1px solid #dbe4f0;background:#fff;color:#334155;border-radius:11px;padding:9px 13px;font:600 10.5px Tahoma,Arial,sans-serif!important;cursor:pointer}.mkt-ann-btn-v1.primary{background:#2563eb;border-color:#2563eb;color:#fff}.mkt-ann-btn-v1.danger{background:#fff5f5;border-color:#fecaca;color:#b91c1c}.mkt-ann-btn-v1.warning{background:#fffbeb;border-color:#fde68a;color:#92400e}.mkt-ann-btn-v1:hover{transform:translateY(-1px)}
      .mkt-ann-preview-v1{margin:14px;border:1px solid #dbeafe;border-radius:18px;background:linear-gradient(135deg,#f8fbff,#fff);padding:15px;position:relative;overflow:hidden}.mkt-ann-preview-v1:before{content:"";position:absolute;width:130px;height:130px;border-radius:50%;background:rgba(37,99,235,.08);right:-55px;top:-65px}.mkt-ann-preview-v1 .tag{display:inline-flex;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:5px 8px;font-size:8.5px;font-weight:600}.mkt-ann-preview-v1 h4{position:relative;margin:10px 0 0;font-size:14px;font-weight:700}.mkt-ann-preview-v1 p{position:relative;margin:6px 0 0;color:#64748b;font-size:10px;line-height:1.55;white-space:pre-wrap}.mkt-ann-preview-v1 .cta{position:relative;display:inline-flex;margin-top:11px;border-radius:10px;padding:7px 10px;background:#0f172a;color:#fff;font-size:9px;font-weight:600}.mkt-ann-list-v1{display:grid;max-height:460px;overflow:auto}.mkt-ann-item-v1{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:12px 14px;border-bottom:1px solid #eef2f7}.mkt-ann-item-v1:last-child{border-bottom:0}.mkt-ann-item-v1 b{font-size:10.5px;font-weight:700}.mkt-ann-item-v1 p{margin:4px 0 0;color:#64748b;font-size:9.2px;line-height:1.45}.mkt-ann-item-v1 small{display:block;margin-top:5px;color:#94a3b8;font-size:8.3px}.mkt-ann-item-v1 button{align-self:center}.mkt-ann-empty-v1{padding:30px;text-align:center;color:#94a3b8;font-size:10px}
      .mkt-maint-status-v1{display:flex;align-items:center;gap:8px;margin:14px;border-radius:14px;padding:11px 12px;background:#f8fafc;border:1px solid #e2e8f0}.mkt-maint-status-v1.on{background:#fff7ed;border-color:#fed7aa}.mkt-maint-status-v1 .dot{width:9px;height:9px;border-radius:50%;background:#94a3b8}.mkt-maint-status-v1.on .dot{background:#f97316;box-shadow:0 0 0 5px rgba(249,115,22,.12);animation:mktMaintPulseV1 1.6s infinite}.mkt-maint-status-v1 b{font-size:10.5px;font-weight:700}.mkt-maint-status-v1 span{margin-left:auto;color:#64748b;font-size:9px}
      #mkt-maintenance-overlay-v1{display:none;position:fixed;inset:0;z-index:2147483000;background:radial-gradient(circle at 18% 16%,rgba(37,99,235,.18),transparent 34%),radial-gradient(circle at 82% 78%,rgba(249,115,22,.15),transparent 35%),linear-gradient(145deg,#f8fbff,#fff 48%,#fff8f3);align-items:center;justify-content:center;padding:22px;overflow:auto;font-family:Tahoma,Arial,"Segoe UI",sans-serif}.mkt-maintenance-active-v1 #mkt-maintenance-overlay-v1{display:flex}.mkt-maintenance-active-v1{overflow:hidden!important}.mkt-maint-card-v1{width:min(720px,96vw);position:relative;border:1px solid rgba(203,213,225,.9);border-radius:30px;background:rgba(255,255,255,.92);box-shadow:0 34px 90px rgba(15,23,42,.16);padding:clamp(24px,5vw,46px);text-align:center;overflow:hidden;backdrop-filter:blur(18px)}.mkt-maint-signal-v1{width:112px;height:112px;margin:0 auto 22px;position:relative;display:grid;place-items:center}.mkt-maint-signal-v1 .core{width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;display:grid;place-items:center;font-size:30px;box-shadow:0 14px 30px rgba(37,99,235,.25);position:relative;z-index:3;animation:mktMaintFloatV1 3s ease-in-out infinite}.mkt-maint-signal-v1 .ring{position:absolute;border:1px solid rgba(37,99,235,.24);border-radius:50%;animation:mktMaintRingV1 2.8s ease-out infinite}.mkt-maint-signal-v1 .r1{width:82px;height:82px}.mkt-maint-signal-v1 .r2{width:110px;height:110px;animation-delay:.7s}.mkt-maint-signal-v1 .dot{position:absolute;width:8px;height:8px;border-radius:50%;background:#f97316;box-shadow:0 0 0 5px rgba(249,115,22,.12);animation:mktMaintOrbitV1 4.8s linear infinite}.mkt-maint-card-v1 .eyebrow{display:inline-flex;padding:6px 10px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:9px;font-weight:700}.mkt-maint-card-v1 h1{margin:14px 0 0;color:#0f172a;font-size:clamp(24px,5vw,38px);font-weight:700;line-height:1.2}.mkt-maint-card-v1 .message{margin:12px auto 0;max-width:570px;color:#64748b;font-size:clamp(12px,2.8vw,15px);line-height:1.7;white-space:pre-wrap}.mkt-maint-card-v1 .resume{display:inline-flex;margin-top:16px;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:12px;padding:9px 12px;font-size:10.5px;font-weight:600}.mkt-maint-card-v1 .buttons{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin-top:22px}.mkt-maint-card-v1 .buttons button,.mkt-maint-card-v1 .buttons a{border:1px solid #dbe4f0;border-radius:12px;padding:10px 14px;background:#fff;color:#334155;text-decoration:none;font:600 10.5px Tahoma,Arial,sans-serif;cursor:pointer}.mkt-maint-card-v1 .buttons .primary{background:#0f172a;border-color:#0f172a;color:#fff}.mkt-maint-card-v1 .foot{margin-top:18px;color:#94a3b8;font-size:9px}.mkt-maint-admin-banner-v1{display:none;position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:260000;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:999px;padding:7px 12px;font:600 9.5px Tahoma,Arial,sans-serif;box-shadow:0 7px 20px rgba(15,23,42,.08)}.mkt-maint-admin-banner-v1.show{display:block}
      @keyframes mktMaintPulseV1{50%{box-shadow:0 0 0 9px rgba(249,115,22,0)}}@keyframes mktMaintFloatV1{50%{transform:translateY(-5px)}}@keyframes mktMaintRingV1{0%{transform:scale(.72);opacity:.9}100%{transform:scale(1.2);opacity:0}}@keyframes mktMaintOrbitV1{0%{transform:rotate(0deg) translateX(50px) rotate(0deg)}100%{transform:rotate(360deg) translateX(50px) rotate(-360deg)}}
      @media(max-width:760px){.mkt-ann-grid-v1{grid-template-columns:1fr}.mkt-ann-row-v1{grid-template-columns:1fr}.mkt-ann-toolbar-v1{align-items:stretch}.mkt-ann-mode-v1{width:100%;overflow-x:auto}.mkt-ann-mode-v1 button{white-space:nowrap;flex:1}.mkt-maint-card-v1{border-radius:23px;padding:26px 18px}.mkt-maint-signal-v1{margin-bottom:16px}.mkt-ann-list-v1{max-height:none}.mkt-ann-actions-v1 .mkt-ann-btn-v1{flex:1}.mkt-maint-admin-banner-v1{top:7px;max-width:92vw;text-align:center}}
    `;
    document.head.appendChild(st);
  }

  function ensureMaintenanceOverlay(){
    ensureStyles();
    var el=document.getElementById('mkt-maintenance-overlay-v1');
    if(el) return el;
    el=document.createElement('div'); el.id='mkt-maintenance-overlay-v1';
    el.innerHTML='<div class="mkt-maint-card-v1" role="dialog" aria-modal="true">'+
      '<div class="mkt-maint-signal-v1"><span class="ring r1"></span><span class="ring r2"></span><span class="dot"></span><div class="core">📣</div></div>'+
      '<span class="eyebrow">MARKETING SYSTEM · BẢO TRÌ HỆ THỐNG</span>'+
      '<h1 id="mkt-maint-title-v1">Hệ thống đang được bảo trì</h1>'+
      '<div class="message" id="mkt-maint-message-v1">Chúng tôi đang nâng cấp hệ thống để phục vụ công việc ổn định hơn.</div>'+
      '<div class="resume" id="mkt-maint-resume-v1" style="display:none"></div>'+
      '<div class="buttons" id="mkt-maint-buttons-v1"><button type="button" id="mkt-maint-logout-v1">Đăng xuất</button></div>'+
      '<div class="foot">Dữ liệu đang được bảo toàn. Vui lòng quay lại sau khi bảo trì hoàn tất.</div></div>';
    document.body.appendChild(el);
    var logout=el.querySelector('#mkt-maint-logout-v1');
    if(logout) logout.onclick=function(){try{if(typeof window.authLogout==='function')window.authLogout();else if(getAuth())getAuth().signOut()}catch(e){}};
    var banner=document.createElement('div'); banner.id='mkt-maint-admin-banner-v1'; banner.className='mkt-maint-admin-banner-v1'; banner.textContent='Bảo trì đang bật · Admin vẫn được truy cập để quản lý hệ thống'; document.body.appendChild(banner);
    return el;
  }

  function renderMaintenanceOverlay(){
    ensureMaintenanceOverlay();
    var m=state.maintenance||{};
    isAdminAsync().then(function(admin){
      var enabled=m && m.enabled===true;
      document.body.classList.toggle('mkt-maintenance-active-v1', enabled && !admin);
      var banner=document.getElementById('mkt-maint-admin-banner-v1'); if(banner) banner.classList.toggle('show',enabled&&admin);
      if(!enabled||admin) return;
      var t=document.getElementById('mkt-maint-title-v1'), msg=document.getElementById('mkt-maint-message-v1'), resume=document.getElementById('mkt-maint-resume-v1'), buttons=document.getElementById('mkt-maint-buttons-v1');
      if(t)t.textContent=safe(m.title)||'Hệ thống đang được bảo trì';
      if(msg)msg.textContent=safe(m.message)||'Chúng tôi đang nâng cấp hệ thống để phục vụ công việc ổn định hơn.';
      if(resume){var r=safe(m.expectedResumeText);resume.textContent=r?'Dự kiến: '+r:'';resume.style.display=r?'inline-flex':'none'}
      if(buttons){
        var existing=buttons.querySelector('.mkt-maint-cta-v1'); if(existing)existing.remove();
        var link=normalizeLink(m.ctaUrl), label=safe(m.ctaLabel)||'Xem thông tin';
        if(link){var a=document.createElement('a');a.href=link.charAt(0)==='#'?'javascript:void(0)':link;a.className='primary mkt-maint-cta-v1';a.textContent=label;if(link.charAt(0)==='#')a.onclick=function(e){e.preventDefault();openLink(link)};else{a.target='_blank';a.rel='noopener noreferrer'};buttons.insertBefore(a,buttons.firstChild)}
      }
    });
  }

  function activeBroadcastItems(){
    var n=now(), items=[];
    Object.keys(state.broadcasts||{}).forEach(function(id){
      var x=state.broadcasts[id]||{};
      if(x.active===false) return;
      if(Number(x.expiresAtMs||0)>0 && Number(x.expiresAtMs)<n) return;
      items.push({
        id:'broadcast_'+safeKey(id),
        title:safe(x.title)||'Thông báo hệ thống',
        message:safe(x.message),
        createdAtMs:Number(x.createdAtMs||0),
        type:safe(x.tone)||'info',
        page:'',
        broadcastId:id,
        ctaLabel:safe(x.ctaLabel),
        ctaUrl:normalizeLink(x.ctaUrl),
        source:'admin_broadcast_v1'
      });
    });
    items.sort(function(a,b){return b.createdAtMs-a.createdAtMs});
    return items.slice(0,30);
  }
  function publishDerived(){
    var items=activeBroadcastItems();
    if(window.MKTNotificationsV263 && typeof window.MKTNotificationsV263.setDerived==='function') window.MKTNotificationsV263.setDerived('admin_broadcast_v1',items);
    else {
      window.__MKT_DERIVED_NOTIFICATIONS_V263=window.__MKT_DERIVED_NOTIFICATIONS_V263||{};
      window.__MKT_DERIVED_NOTIFICATIONS_V263.admin_broadcast_v1=items;
    }
    setTimeout(enhanceNotificationCtas,30);
  }
  function enhanceNotificationCtas(){
    var api=window.MKTNotificationsV263; if(!api||typeof api.getState!=='function') return;
    var ns=api.getState()||{}, derived=(ns.derived&&ns.derived.admin_broadcast_v1)||[];
    var map={}; derived.forEach(function(x){map[x.id]=x});
    Array.prototype.forEach.call(document.querySelectorAll('[data-notification-id-v263]'),function(row){
      var id=row.getAttribute('data-notification-id-v263'), item=map[id]; if(!item||!item.ctaUrl) return;
      var copy=row.querySelector('.mkt-notification-copy-v263'); if(!copy||copy.querySelector('.mkt-broadcast-cta-v1')) return;
      var b=document.createElement('button');b.type='button';b.className='mkt-broadcast-cta-v1';b.textContent=item.ctaLabel||'Mở liên kết';
      b.style.cssText='margin-top:7px;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:8px;padding:5px 8px;font:600 8.8px Tahoma,Arial,sans-serif;cursor:pointer';
      b.onclick=function(ev){ev.preventDefault();ev.stopPropagation();try{if(api.markRead)api.markRead(id)}catch(e){};openLink(item.ctaUrl)};
      copy.appendChild(b);
    });
  }
  function bindRefs(){
    var db=getDb(); if(!db) return;
    if(state.broadcastRef)try{state.broadcastRef.off()}catch(e){}
    if(state.maintenanceRef)try{state.maintenanceRef.off()}catch(e){}
    state.broadcastRef=db.ref(ROOT+'/broadcasts').limitToLast(50);
    state.maintenanceRef=db.ref(ROOT+'/maintenance/current');
    state.broadcastRef.on('value',function(s){state.broadcasts=s.val()||{};publishDerived();if(state.adminMounted)renderAdminCurrent()});
    state.maintenanceRef.on('value',function(s){state.maintenance=s.val()||null;renderMaintenanceOverlay();if(state.adminMounted)renderAdminCurrent()});
  }
  function bindAuth(user){ state.user=user||null; if(user)bindRefs(); else{state.broadcasts={};state.maintenance=null;publishDerived();document.body.classList.remove('mkt-maintenance-active-v1')} }

  function adminActor(){var u=state.user||{};return {uid:safe(u.uid),email:safe(u.email).toLowerCase(),name:safe(window.myIdentity||u.displayName||u.email||'Admin')}}
  function expireMsFromSelect(v){var d=Number(v||0);return d>0?now()+d*86400000:0}
  function publishNormal(){
    if(!isAdminSync())return toast('Chỉ Quản trị hệ thống mới được tạo thông báo.','error');
    var title=safe((document.getElementById('mkt-ann-title-input-v1')||{}).value), message=safe((document.getElementById('mkt-ann-message-input-v1')||{}).value), ctaLabel=safe((document.getElementById('mkt-ann-cta-label-v1')||{}).value), ctaUrl=normalizeLink((document.getElementById('mkt-ann-cta-url-v1')||{}).value), tone=safe((document.getElementById('mkt-ann-tone-v1')||{}).value)||'info', exp=safe((document.getElementById('mkt-ann-expire-v1')||{}).value)||'7';
    if(!title||!message)return toast('Vui lòng nhập Tiêu đề và Nội dung thông báo.','warning');
    var rawLink=safe((document.getElementById('mkt-ann-cta-url-v1')||{}).value);if(rawLink&&!ctaUrl)return toast('Link chỉ chấp nhận https://... hoặc route nội bộ dạng #/ads.','warning');
    var db=getDb(),actor=adminActor(),ref=db.ref(ROOT+'/broadcasts').push(),created=now();
    var payload={version:1,type:'normal',active:true,title:title,message:message,tone:tone,ctaLabel:ctaUrl?(ctaLabel||'Xem chi tiết'):'',ctaUrl:ctaUrl,createdAtMs:created,expiresAtMs:expireMsFromSelect(exp),createdByUid:actor.uid,createdByEmail:actor.email,createdByName:actor.name};
    ref.set(payload).then(function(){toast('Đã phát thông báo tới toàn hệ thống.','success');clearNormalForm()}).catch(function(e){toast('Không phát được thông báo: '+safe(e&&e.message),'error')});
  }
  function clearNormalForm(){['mkt-ann-title-input-v1','mkt-ann-message-input-v1','mkt-ann-cta-label-v1','mkt-ann-cta-url-v1'].forEach(function(id){var el=document.getElementById(id);if(el)el.value=''});updateNormalPreview()}
  function deleteBroadcast(id){if(!isAdminSync()||!id)return; if(!window.confirm('Xóa thông báo này khỏi toàn hệ thống?'))return;var db=getDb();db.ref(ROOT+'/broadcasts/'+safeKey(id)).remove().then(function(){toast('Đã xóa thông báo.','success')}).catch(function(e){toast('Không xóa được: '+safe(e&&e.message),'error')})}
  function saveMaintenance(enable){
    if(!isAdminSync())return toast('Chỉ Quản trị hệ thống mới được bật bảo trì.','error');
    var db=getDb(); if(!enable){db.ref(ROOT+'/maintenance/current').remove().then(function(){toast('Đã tắt chế độ bảo trì.','success')}).catch(function(e){toast('Không tắt được bảo trì: '+safe(e&&e.message),'error')});return}
    var title=safe((document.getElementById('mkt-maint-admin-title-v1')||{}).value),message=safe((document.getElementById('mkt-maint-admin-message-v1')||{}).value),resume=safe((document.getElementById('mkt-maint-admin-resume-v1')||{}).value),ctaLabel=safe((document.getElementById('mkt-maint-admin-cta-label-v1')||{}).value),raw=safe((document.getElementById('mkt-maint-admin-cta-url-v1')||{}).value),ctaUrl=normalizeLink(raw);
    if(!title||!message)return toast('Vui lòng nhập Tiêu đề và Nội dung bảo trì.','warning'); if(raw&&!ctaUrl)return toast('Link bảo trì không hợp lệ.','warning');
    var actor=adminActor(),old=state.maintenance||{},payload={version:1,enabled:true,title:title,message:message,expectedResumeText:resume,ctaLabel:ctaUrl?(ctaLabel||'Xem thông tin'):'',ctaUrl:ctaUrl,createdAtMs:Number(old.createdAtMs||now()),updatedAtMs:now(),createdByUid:safe(old.createdByUid||actor.uid),createdByEmail:safe(old.createdByEmail||actor.email),createdByName:safe(old.createdByName||actor.name),updatedByUid:actor.uid,updatedByEmail:actor.email,updatedByName:actor.name};
    db.ref(ROOT+'/maintenance/current').set(payload).then(function(){toast('Đã bật bảo trì. Người dùng thường sẽ chỉ thấy màn hình bảo trì.','success')}).catch(function(e){toast('Không bật được bảo trì: '+safe(e&&e.message),'error')});
  }
  function updateNormalPreview(){var box=document.getElementById('mkt-ann-preview-v1');if(!box)return;var title=safe((document.getElementById('mkt-ann-title-input-v1')||{}).value)||'Tiêu đề thông báo',msg=safe((document.getElementById('mkt-ann-message-input-v1')||{}).value)||'Nội dung thông báo sẽ hiển thị tại đây.',label=safe((document.getElementById('mkt-ann-cta-label-v1')||{}).value),url=normalizeLink((document.getElementById('mkt-ann-cta-url-v1')||{}).value);box.innerHTML='<span class="tag">THÔNG BÁO HỆ THỐNG</span><h4>'+esc(title)+'</h4><p>'+esc(msg)+'</p>'+(url?'<span class="cta">'+esc(label||'Xem chi tiết')+'</span>':'')}

  function normalAdminHtml(){
    var list=Object.keys(state.broadcasts||{}).map(function(id){return {id:id,x:state.broadcasts[id]||{}}}).sort(function(a,b){return Number(b.x.createdAtMs||0)-Number(a.x.createdAtMs||0)}).slice(0,30);
    var history=list.length?list.map(function(r){var x=r.x;return '<div class="mkt-ann-item-v1"><div><b>'+esc(x.title||'Thông báo')+'</b><p>'+esc(x.message||'')+'</p><small>'+esc(fmt(x.createdAtMs))+' · '+esc(x.createdByName||x.createdByEmail||'Admin')+(Number(x.expiresAtMs||0)?' · hết hạn '+esc(fmt(x.expiresAtMs)):' · không hết hạn')+'</small></div><button class="mkt-ann-btn-v1 danger" data-delete-broadcast-v1="'+esc(r.id)+'">Xóa</button></div>'}).join(''):'<div class="mkt-ann-empty-v1">Chưa có thông báo do Admin tạo.</div>';
    return '<div class="mkt-ann-grid-v1"><section class="mkt-ann-card-v1"><div class="mkt-ann-card-head-v1"><strong>Tạo thông báo thường</strong><small>Phát một bản chung tới toàn hệ thống, tự xuất hiện trong chuông của người dùng.</small></div><div class="mkt-ann-form-v1">'+
      '<div class="mkt-ann-field-v1"><label>Tiêu đề</label><input id="mkt-ann-title-input-v1" class="mkt-ann-input-v1" placeholder="Ví dụ: Cập nhật quy trình chạy quảng cáo"></div>'+
      '<div class="mkt-ann-field-v1"><label>Nội dung</label><textarea id="mkt-ann-message-input-v1" class="mkt-ann-textarea-v1" placeholder="Nội dung ngắn gọn, rõ việc cần người dùng biết..."></textarea></div>'+
      '<div class="mkt-ann-row-v1"><div class="mkt-ann-field-v1"><label>Chữ trên nút (không bắt buộc)</label><input id="mkt-ann-cta-label-v1" class="mkt-ann-input-v1" placeholder="Xem hướng dẫn"></div><div class="mkt-ann-field-v1"><label>Link khi bấm nút</label><input id="mkt-ann-cta-url-v1" class="mkt-ann-input-v1" placeholder="https://... hoặc #/ads"></div></div>'+
      '<div class="mkt-ann-row-v1"><div class="mkt-ann-field-v1"><label>Mức hiển thị</label><select id="mkt-ann-tone-v1" class="mkt-ann-select-v1"><option value="info">Thông tin</option><option value="success">Thông báo tốt</option><option value="warning">Cần chú ý</option><option value="danger">Quan trọng</option></select></div><div class="mkt-ann-field-v1"><label>Thời gian lưu trên chuông</label><select id="mkt-ann-expire-v1" class="mkt-ann-select-v1"><option value="1">1 ngày</option><option value="3">3 ngày</option><option value="7" selected>7 ngày</option><option value="30">30 ngày</option><option value="0">Không hết hạn</option></select></div></div>'+
      '<div class="mkt-ann-actions-v1"><button id="mkt-ann-publish-v1" class="mkt-ann-btn-v1 primary">Phát thông báo</button><button id="mkt-ann-clear-v1" class="mkt-ann-btn-v1">Làm mới nội dung</button></div></div></section>'+
      '<section class="mkt-ann-card-v1"><div class="mkt-ann-card-head-v1"><strong>Xem trước & lịch sử</strong><small>Người dùng sẽ nhận realtime trong chuông thông báo hiện tại.</small></div><div id="mkt-ann-preview-v1" class="mkt-ann-preview-v1"></div><div class="mkt-ann-list-v1">'+history+'</div></section></div>';
  }
  function maintenanceAdminHtml(){
    var m=state.maintenance||{}, on=m.enabled===true;
    return '<div class="mkt-ann-grid-v1"><section class="mkt-ann-card-v1"><div class="mkt-ann-card-head-v1"><strong>Chế độ bảo trì hệ thống</strong><small>Khi bật, người dùng thường không thao tác được hệ thống và chỉ thấy màn hình bảo trì. Admin vẫn truy cập được để tắt.</small></div><div class="mkt-maint-status-v1 '+(on?'on':'')+'"><span class="dot"></span><b>'+(on?'Bảo trì đang bật':'Hệ thống đang hoạt động bình thường')+'</b><span>'+(on?('Cập nhật '+esc(fmt(m.updatedAtMs))):'Không khóa người dùng')+'</span></div><div class="mkt-ann-form-v1">'+
      '<div class="mkt-ann-field-v1"><label>Tiêu đề màn hình</label><input id="mkt-maint-admin-title-v1" class="mkt-ann-input-v1" value="'+esc(m.title||'Hệ thống đang được bảo trì')+'"></div>'+
      '<div class="mkt-ann-field-v1"><label>Nội dung</label><textarea id="mkt-maint-admin-message-v1" class="mkt-ann-textarea-v1">'+esc(m.message||'Chúng tôi đang nâng cấp Marketing System để hệ thống hoạt động ổn định và hiệu quả hơn. Vui lòng quay lại sau khi bảo trì hoàn tất.')+'</textarea></div>'+
      '<div class="mkt-ann-field-v1"><label>Dự kiến hoàn tất (không bắt buộc)</label><input id="mkt-maint-admin-resume-v1" class="mkt-ann-input-v1" value="'+esc(m.expectedResumeText||'')+'" placeholder="Ví dụ: 14:30 hôm nay"></div>'+
      '<div class="mkt-ann-row-v1"><div class="mkt-ann-field-v1"><label>Chữ nút liên kết</label><input id="mkt-maint-admin-cta-label-v1" class="mkt-ann-input-v1" value="'+esc(m.ctaLabel||'')+'" placeholder="Xem thông báo chi tiết"></div><div class="mkt-ann-field-v1"><label>Link</label><input id="mkt-maint-admin-cta-url-v1" class="mkt-ann-input-v1" value="'+esc(m.ctaUrl||'')+'" placeholder="https://..."></div></div>'+
      '<div class="mkt-ann-actions-v1"><button id="mkt-maint-enable-v1" class="mkt-ann-btn-v1 warning">'+(on?'Cập nhật nội dung bảo trì':'Bật chế độ bảo trì')+'</button>'+(on?'<button id="mkt-maint-disable-v1" class="mkt-ann-btn-v1 primary">Tắt bảo trì · Mở hệ thống</button>':'')+'</div></div></section>'+
      '<section class="mkt-ann-card-v1"><div class="mkt-ann-card-head-v1"><strong>Xem trước màn hình người dùng</strong><small>Hiệu ứng tín hiệu chiến dịch chuyển động nhẹ; tối ưu cả desktop và mobile.</small></div><div class="mkt-ann-preview-v1"><span class="tag" style="background:#fff7ed;color:#c2410c">BẢO TRÌ HỆ THỐNG</span><h4>'+esc(safe(m.title)||'Hệ thống đang được bảo trì')+'</h4><p>'+esc(safe(m.message)||'Người dùng sẽ chỉ nhìn thấy màn hình bảo trì khi chế độ được bật.')+'</p><span class="cta">📣 Marketing System đang nâng cấp</span></div></section></div>';
  }
  function renderAdminCurrent(){
    var view=document.getElementById('mkt-admin-ops-view-v289'); if(!view||!isAdminSync())return;
    var title='<div class="mkt-ann-admin-v1"><div class="mkt-ann-toolbar-v1"><div class="mkt-ann-title-v1"><h3>Tạo thông báo</h3><p>Phát thông báo tới người dùng hoặc khóa giao diện bằng chế độ bảo trì mà không cần sửa code.</p></div><div class="mkt-ann-mode-v1"><button data-ann-mode-v1="normal" class="'+(state.adminMode==='normal'?'active':'')+'">Thông báo thường</button><button data-ann-mode-v1="maintenance" class="'+(state.adminMode==='maintenance'?'active':'')+'">Bảo trì hệ thống</button></div></div>'+(state.adminMode==='maintenance'?maintenanceAdminHtml():normalAdminHtml())+'</div>';
    view.innerHTML=title; state.adminMounted=true;
    Array.prototype.forEach.call(view.querySelectorAll('[data-ann-mode-v1]'),function(b){b.onclick=function(){state.adminMode=b.getAttribute('data-ann-mode-v1');renderAdminCurrent()}});
    if(state.adminMode==='normal'){
      ['mkt-ann-title-input-v1','mkt-ann-message-input-v1','mkt-ann-cta-label-v1','mkt-ann-cta-url-v1'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',updateNormalPreview)});updateNormalPreview();
      var pub=document.getElementById('mkt-ann-publish-v1'),clr=document.getElementById('mkt-ann-clear-v1');if(pub)pub.onclick=publishNormal;if(clr)clr.onclick=clearNormalForm;
      Array.prototype.forEach.call(view.querySelectorAll('[data-delete-broadcast-v1]'),function(b){b.onclick=function(){deleteBroadcast(b.getAttribute('data-delete-broadcast-v1'))}});
    } else {
      var en=document.getElementById('mkt-maint-enable-v1'),dis=document.getElementById('mkt-maint-disable-v1');if(en)en.onclick=function(){saveMaintenance(true)};if(dis)dis.onclick=function(){saveMaintenance(false)};
    }
  }
  function renderAdmin(view){ ensureStyles(); if(!view)return; state.adminMounted=true; renderAdminCurrent(); }

  window.MKTSystemAnnouncementCenterV1={version:VERSION,renderAdmin:renderAdmin,refreshAdmin:renderAdminCurrent,openLink:openLink,getState:function(){return state}};

  ensureStyles();ensureMaintenanceOverlay();
  var auth=getAuth();if(auth&&typeof auth.onAuthStateChanged==='function'){auth.onAuthStateChanged(bindAuth);if(auth.currentUser)bindAuth(auth.currentUser)}
  setInterval(function(){publishDerived();enhanceNotificationCtas();if(state.maintenance&&state.maintenance.enabled)renderMaintenanceOverlay()},2500);
})();

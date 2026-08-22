/* =========================================================
   ADMIN CONTROL CENTER - V291 SEARCH FOCUS STABLE
   Tách từ Blogspot V289.
   Phạm vi: Sức khỏe hệ thống + Nhật ký thao tác + Tìm kiếm toàn hệ thống.
   - Không chứa / không thay đổi logic Phân quyền RBAC.
   - Không ghi Firebase; chỉ đọc dữ liệu/trạng thái hiện có.
   - Giữ nguyên ID/hàm nội bộ V289 để tránh thay đổi hành vi.
   ========================================================= */
(function installAdminControlCenterExternalV291(){
    'use strict';
    if (window.__MKT_ADMIN_CONTROL_CENTER_EXTERNAL_V291) return;
    window.__MKT_ADMIN_CONTROL_CENTER_EXTERNAL_V291 = true;

    if (!document.getElementById('mkt-admin-ops-v289-style')) {
        var style = document.createElement('style');
        style.id = 'mkt-admin-ops-v289-style';
        style.textContent = "#mkt-admin-ops-nav-v289,#mkt-admin-ops-view-v289{font-family:Inter,\"Segoe UI\",Arial,Tahoma,sans-serif}\n#mkt-admin-ops-nav-v289{margin:0 0 16px;padding:14px;border:1px solid #dbe4f0;border-radius:22px;background:linear-gradient(135deg,#f8fbff,#fff);box-shadow:0 10px 28px rgba(15,23,42,.05)}\n.mkt-ops-head-v289{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}\n.mkt-ops-head-v289 h2{margin:0;color:#0f172a;font-size:19px;line-height:1.25;font-weight:850;letter-spacing:-.02em}.mkt-ops-head-v289 p{margin:5px 0 0;color:#64748b;font-size:11px;line-height:1.55;font-weight:500}.mkt-ops-admin-chip-v289{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:7px 10px;font-size:9.5px;font-weight:800}\n.mkt-ops-tabs-v289{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.mkt-ops-tab-v289{border:1px solid #e2e8f0;background:#fff;color:#475569;border-radius:13px;padding:10px 11px;font-size:10.5px;font-weight:800;cursor:pointer;transition:.16s ease;text-align:center}.mkt-ops-tab-v289:hover{border-color:#bfdbfe;background:#f8fbff;color:#2563eb}.mkt-ops-tab-v289.active{border-color:#0f172a;background:#0f172a;color:#fff;box-shadow:0 8px 18px rgba(15,23,42,.13)}\n#mkt-admin-ops-view-v289{display:none}.mkt-ops-page-v289{display:grid;gap:14px}.mkt-ops-toolbar-v289{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}.mkt-ops-title-v289 h3{margin:0;color:#0f172a;font-size:19px;font-weight:850;letter-spacing:-.02em}.mkt-ops-title-v289 p{margin:5px 0 0;color:#64748b;font-size:10.5px;line-height:1.5}.mkt-ops-actions-v289{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.mkt-ops-btn-v289{border:1px solid #dbe4f0;background:#fff;color:#334155;border-radius:11px;padding:8px 11px;font-size:10px;font-weight:800;cursor:pointer}.mkt-ops-btn-v289.primary{background:#2563eb;border-color:#2563eb;color:#fff}.mkt-ops-btn-v289:hover{transform:translateY(-1px)}\n.mkt-health-kpis-v289{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.mkt-health-kpi-v289{border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:13px}.mkt-health-kpi-v289 span{display:block;color:#64748b;font-size:9.5px;font-weight:750}.mkt-health-kpi-v289 strong{display:block;margin-top:6px;color:#0f172a;font-size:20px;font-weight:850;line-height:1.05}.mkt-health-kpi-v289 small{display:block;margin-top:5px;color:#94a3b8;font-size:8.8px;line-height:1.4}.mkt-health-kpi-v289.good{border-color:#bbf7d0;background:#f7fff9}.mkt-health-kpi-v289.warn{border-color:#fde68a;background:#fffdf5}.mkt-health-kpi-v289.bad{border-color:#fecaca;background:#fff8f8}\n.mkt-ops-grid-2-v289{display:grid;grid-template-columns:1.08fr .92fr;gap:12px}.mkt-ops-card-v289{border:1px solid #e2e8f0;border-radius:18px;background:#fff;overflow:hidden}.mkt-ops-card-head-v289{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #edf2f7;background:#fbfdff}.mkt-ops-card-head-v289 strong{color:#0f172a;font-size:11px;font-weight:850}.mkt-ops-card-head-v289 small{color:#94a3b8;font-size:8.8px}.mkt-health-row-v289{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(0,1.4fr) auto;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #f1f5f9}.mkt-health-row-v289:last-child{border-bottom:0}.mkt-health-row-v289 b{color:#334155;font-size:10px}.mkt-health-row-v289 .detail{color:#64748b;font-size:9.2px;line-height:1.45;min-width:0;word-break:break-word}.mkt-status-v289{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 8px;font-size:8.7px;font-weight:850;white-space:nowrap;background:#f1f5f9;color:#475569}.mkt-status-v289:before{content:\"\";width:6px;height:6px;border-radius:50%;background:#94a3b8}.mkt-status-v289.good{background:#ecfdf3;color:#166534}.mkt-status-v289.good:before{background:#16a34a}.mkt-status-v289.warn{background:#fffbeb;color:#92400e}.mkt-status-v289.warn:before{background:#f59e0b}.mkt-status-v289.bad{background:#fef2f2;color:#991b1b}.mkt-status-v289.bad:before{background:#dc2626}.mkt-status-v289.info{background:#eff6ff;color:#1d4ed8}.mkt-status-v289.info:before{background:#2563eb}\n.mkt-company-health-v289{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px}.mkt-company-health-item-v289{border:1px solid #edf2f7;border-radius:14px;padding:10px;background:#fbfdff}.mkt-company-health-item-v289 b{display:block;color:#0f172a;font-size:10px}.mkt-company-health-item-v289 span{display:block;margin-top:4px;color:#64748b;font-size:8.8px;line-height:1.4}.mkt-company-health-item-v289 em{display:block;margin-top:5px;color:#2563eb;font-size:8.5px;font-style:normal;font-weight:750}\n.mkt-audit-filters-v289{display:grid;grid-template-columns:minmax(220px,1.6fr) repeat(2,minmax(150px,.55fr));gap:8px}.mkt-ops-input-v289,.mkt-ops-select-v289{width:100%;height:38px;border:1px solid #dbe4f0!important;border-radius:12px!important;background:#fff!important;color:#0f172a!important;padding:0 11px!important;font-size:10.5px!important;font-weight:600!important;outline:none!important}.mkt-ops-input-v289:focus,.mkt-ops-select-v289:focus{border-color:#93c5fd!important;box-shadow:0 0 0 3px rgba(37,99,235,.09)!important}.mkt-audit-summary-v289{display:flex;gap:7px;flex-wrap:wrap}.mkt-audit-chip-v289{border:1px solid #e2e8f0;background:#fff;border-radius:999px;padding:6px 9px;color:#64748b;font-size:9px;font-weight:750}.mkt-audit-list-v289{border:1px solid #e2e8f0;border-radius:18px;background:#fff;overflow:hidden}.mkt-audit-row-v289{display:grid;grid-template-columns:128px 92px minmax(170px,.65fr) minmax(260px,1.4fr) 94px;gap:10px;align-items:start;padding:11px 13px;border-bottom:1px solid #edf2f7}.mkt-audit-row-v289:last-child{border-bottom:0}.mkt-audit-row-v289:hover{background:#fbfdff}.mkt-audit-time-v289{color:#64748b;font-size:9px;line-height:1.4}.mkt-audit-source-v289{font-size:8.5px;font-weight:850;border-radius:999px;padding:5px 7px;text-align:center;background:#f1f5f9;color:#475569}.mkt-audit-who-v289 b{display:block;color:#0f172a;font-size:9.8px}.mkt-audit-who-v289 small{display:block;color:#94a3b8;font-size:8.3px;margin-top:3px;word-break:break-word}.mkt-audit-main-v289 b{display:block;color:#0f172a;font-size:10px}.mkt-audit-main-v289 p{margin:4px 0 0;color:#64748b;font-size:9px;line-height:1.45}.mkt-audit-change-v289{margin-top:5px;color:#2563eb;font-size:8.6px;font-weight:700}.mkt-audit-empty-v289{padding:28px;text-align:center;color:#94a3b8;font-size:10px}\n.mkt-search-box-v289{border:1px solid #dbe4f0;border-radius:20px;background:linear-gradient(135deg,#f8fbff,#fff);padding:14px}.mkt-search-line-v289{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.mkt-search-line-v289 .mkt-ops-input-v289{height:44px;font-size:12px!important;padding-left:14px!important}.mkt-search-scope-v289{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.mkt-search-scope-v289 button{border:1px solid #dbe4f0;background:#fff;color:#64748b;border-radius:999px;padding:6px 9px;font-size:8.8px;font-weight:800;cursor:pointer}.mkt-search-scope-v289 button.active{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}.mkt-search-note-v289{margin-top:8px;color:#94a3b8;font-size:8.8px;line-height:1.45}.mkt-search-results-v289{display:grid;gap:8px}.mkt-search-result-v289{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid #e2e8f0;border-radius:15px;background:#fff;padding:10px 11px}.mkt-search-icon-v289{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:15px}.mkt-search-result-v289 b{display:block;color:#0f172a;font-size:10.5px}.mkt-search-result-v289 p{margin:3px 0 0;color:#64748b;font-size:9px;line-height:1.4}.mkt-search-result-v289 small{display:block;margin-top:3px;color:#94a3b8;font-size:8.3px}.mkt-search-open-v289{border:1px solid #dbe4f0;background:#fff;color:#2563eb;border-radius:9px;padding:6px 8px;font-size:8.5px;font-weight:850;cursor:pointer}.mkt-ops-footnote-v289{border:1px dashed #cbd5e1;border-radius:14px;background:#f8fafc;padding:9px 11px;color:#64748b;font-size:8.8px;line-height:1.5}\n@media(max-width:1100px){.mkt-health-kpis-v289{grid-template-columns:repeat(2,minmax(0,1fr))}.mkt-ops-grid-2-v289{grid-template-columns:1fr}.mkt-audit-row-v289{grid-template-columns:110px 82px minmax(150px,.55fr) minmax(220px,1.2fr) 84px}}\n@media(max-width:760px){#mkt-admin-ops-nav-v289{margin-bottom:11px;padding:11px;border-radius:17px}.mkt-ops-head-v289{align-items:center}.mkt-ops-head-v289 h2{font-size:16px}.mkt-ops-head-v289 p{font-size:9.5px}.mkt-ops-admin-chip-v289{display:none}.mkt-ops-tabs-v289{display:flex;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.mkt-ops-tabs-v289::-webkit-scrollbar{display:none}.mkt-ops-tab-v289{flex:0 0 auto;min-width:116px;padding:9px 10px}.mkt-health-kpis-v289{grid-template-columns:1fr 1fr;gap:7px}.mkt-health-kpi-v289{padding:11px;border-radius:15px}.mkt-health-kpi-v289 strong{font-size:17px}.mkt-ops-toolbar-v289{align-items:stretch}.mkt-ops-actions-v289{width:100%}.mkt-ops-actions-v289 .mkt-ops-btn-v289{flex:1}.mkt-health-row-v289{grid-template-columns:minmax(0,1fr) auto;gap:6px;padding:10px 11px}.mkt-health-row-v289 .detail{grid-column:1/-1}.mkt-company-health-v289{grid-template-columns:1fr;padding:10px}.mkt-audit-filters-v289{grid-template-columns:1fr}.mkt-audit-list-v289{border:0;background:transparent;display:grid;gap:8px}.mkt-audit-row-v289{grid-template-columns:1fr auto;gap:6px;border:1px solid #e2e8f0;border-radius:15px;background:#fff;padding:10px}.mkt-audit-time-v289{grid-column:1}.mkt-audit-source-v289{grid-column:2;grid-row:1}.mkt-audit-who-v289{grid-column:1/-1}.mkt-audit-main-v289{grid-column:1/-1}.mkt-audit-row-v289>.mkt-status-v289{grid-column:1/-1;justify-self:start}.mkt-search-line-v289{grid-template-columns:1fr}.mkt-search-line-v289 .mkt-ops-btn-v289{height:40px}.mkt-search-result-v289{grid-template-columns:32px minmax(0,1fr);padding:9px}.mkt-search-icon-v289{width:31px;height:31px}.mkt-search-open-v289{grid-column:2;justify-self:start}.mkt-ops-title-v289 h3{font-size:17px}}\n@media(max-width:420px){.mkt-health-kpis-v289{grid-template-columns:1fr}.mkt-ops-tab-v289{min-width:108px}}";
        document.head.appendChild(style);

        // V290: Typography ưu tiên tiếng Việt, đồng đều nét chữ trên toàn bộ nút/ô điều khiển.
        var viStyle = document.createElement('style');
        viStyle.id = 'mkt-admin-ops-v290-vi-typography';
        viStyle.textContent = [
            '#mkt-admin-ops-nav-v289,#mkt-admin-ops-view-v289{font-family:Tahoma,Arial,"Segoe UI",sans-serif!important;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}',
            '.mkt-ops-tab-v289,.mkt-ops-btn-v289,.mkt-search-scope-v289 button,.mkt-search-open-v289{font-family:Tahoma,Arial,"Segoe UI",sans-serif!important;font-weight:600!important;letter-spacing:0!important;font-synthesis:none!important}',
            '.mkt-ops-tab-v289{font-size:11px!important}',
            '.mkt-ops-btn-v289{font-size:10.5px!important}',
            '.mkt-search-scope-v289 button,.mkt-search-open-v289{font-size:9.5px!important}'
        ].join('');
        document.head.appendChild(viStyle);
    }

(function installMktAdminOpsV289(){
    'use strict';
    if (window.MKTAdminOpsV289) return;

    var VERSION='V291_ADMIN_CONTROL_CENTER_SEARCH_FOCUS_STABLE';
    var COMPANIES=['NNV','VN','KF','ABC'];
    var COMPANY_NAMES={NNV:'Nông Nghiệp Việt',VN:'Việt Nhật',KF:'KingFarm',ABC:'ABC Việt Nam'};
    var state={
        active:'permissions',
        healthLoading:false,
        healthData:null,
        auditLoading:false,
        auditLoadedAt:0,
        auditItems:[],
        auditRaw:{},
        auditFilter:{q:'',source:'all',period:'7d'},
        searchScope:'all',
        revenueCache:null,
        revenueLoadedAt:0,
        observer:null,
        mountTimer:null,
        healthTimer:null,
        renderedTab:'',
        renderedView:null
    };

    try { state.active=sessionStorage.getItem('MKT_ADMIN_OPS_TAB_V289')||'permissions'; } catch(e) {}

    function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
    function text(v){return String(v==null?'':v).trim()}
    function lower(v){return text(v).toLocaleLowerCase('vi-VN')}
    function num(v){var n=Number(v);return Number.isFinite(n)?n:0}
    function getDb(){try{return window.sysDb||(typeof firebase!=='undefined'&&firebase.apps&&firebase.apps.length?firebase.database():null)}catch(e){return null}}
    function getUser(){try{return window.sysAuth&&window.sysAuth.currentUser?window.sysAuth.currentUser:(typeof firebase!=='undefined'&&firebase.auth?firebase.auth().currentUser:null)}catch(e){return null}}
    function isAdmin(){try{return !!(window.MKTRBAC&&typeof window.MKTRBAC.isAdmin==='function'&&window.MKTRBAC.isAdmin())}catch(e){return false}}
    function toMs(v){if(!v&&v!==0)return 0;if(typeof v==='number')return v;var n=Number(v);if(Number.isFinite(n)&&n>100000000000)return n;var d=new Date(v);return isNaN(d.getTime())?0:d.getTime()}
    function fmtTime(ms){ms=toMs(ms);if(!ms)return 'Chưa ghi nhận';try{return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(ms))}catch(e){return new Date(ms).toLocaleString('vi-VN')}}
    function ago(ms){ms=toMs(ms);if(!ms)return 'chưa có';var d=Math.max(0,Date.now()-ms),m=Math.floor(d/60000);if(m<1)return 'vừa xong';if(m<60)return m+' phút trước';var h=Math.floor(m/60);if(h<24)return h+' giờ trước';var day=Math.floor(h/24);return day+' ngày trước'}
    function money(v){return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(num(v))+' đ'}
    function arr(obj){return Object.keys(obj||{}).map(function(k){var v=obj[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&!v.__key)v=Object.assign({__key:k},v);return v})}
    function readOnce(ref,timeoutMs){return new Promise(function(resolve,reject){var done=false;var t=setTimeout(function(){if(done)return;done=true;reject(new Error('Quá thời gian đọc Firebase'))},timeoutMs||12000);ref.once('value').then(function(s){if(done)return;done=true;clearTimeout(t);resolve(s.val())}).catch(function(e){if(done)return;done=true;clearTimeout(t);reject(e)})})}
    function safeRead(ref,def){return readOnce(ref).catch(function(){return def})}
    function databaseUrl(){
        try {
            var app=(typeof firebase!=='undefined'&&firebase.app)?firebase.app():null;
            return text(app&&app.options&&app.options.databaseURL||'').replace(/\/+$/,'');
        } catch(e){ return ''; }
    }
    function restPath(path){return String(path||'').split('/').filter(Boolean).map(function(part){return encodeURIComponent(part)}).join('/')}
    async function firebaseRestRead(path,shallow){
        var user=getUser(),base=databaseUrl();
        if(!user||!base||typeof fetch!=='function')throw new Error('REST Firebase chưa sẵn sàng');
        var token=await user.getIdToken(false);
        var url=base+'/'+restPath(path)+'.json?auth='+encodeURIComponent(token)+(shallow?'&shallow=true':'');
        var response=await fetch(url,{method:'GET',credentials:'omit',cache:'no-store'});
        if(!response.ok)throw new Error('Firebase REST '+response.status);
        return await response.json();
    }
    async function recentMetaRecords(path,count){
        count=Math.max(1,Number(count||1));
        try {
            var keysObj=await firebaseRestRead(path,true);
            var keys=Object.keys(keysObj||{}).sort().reverse().slice(0,count);
            var metas=await Promise.all(keys.map(function(key){
                return firebaseRestRead(path+'/'+key+'/meta',false).then(function(meta){
                    if(!meta||typeof meta!=='object')return null;
                    meta.__key=key;
                    return meta;
                }).catch(function(){return null});
            }));
            return metas.filter(Boolean);
        } catch(e){ return []; }
    }
    function statusHtml(label,kind){return '<span class="mkt-status-v289 '+esc(kind||'')+'">'+esc(label)+'</span>'}

    function adminPage(){return document.getElementById('page-admin')}
    function scheduleMount(){clearTimeout(state.mountTimer);state.mountTimer=setTimeout(mount,40)}
    function markPermissionContent(page){Array.prototype.forEach.call(page.children,function(el){if(!el||el.id==='mkt-admin-ops-nav-v289'||el.id==='mkt-admin-ops-view-v289')return;el.setAttribute('data-mkt-admin-permission-content-v289','1')})}

    function mount(){
        var page=adminPage();
        if(!page||!isAdmin())return;
        if(!document.getElementById('mkt-admin-ops-nav-v289')){
            var nav=document.createElement('section');
            nav.id='mkt-admin-ops-nav-v289';
            nav.innerHTML='<div class="mkt-ops-head-v289"><div><h2>Trung tâm điều hành</h2><p>Kiểm soát quyền, sức khỏe hệ thống, nhật ký và tìm kiếm dữ liệu từ một nơi.</p></div><span class="mkt-ops-admin-chip-v289">QUẢN TRỊ</span></div>'+
                '<div class="mkt-ops-tabs-v289">'+
                '<button class="mkt-ops-tab-v289" data-mkt-ops-tab-v289="permissions">Phân quyền</button>'+
                '<button class="mkt-ops-tab-v289" data-mkt-ops-tab-v289="health">Sức khỏe hệ thống</button>'+
                '<button class="mkt-ops-tab-v289" data-mkt-ops-tab-v289="audit">Nhật ký thao tác</button>'+
                '<button class="mkt-ops-tab-v289" data-mkt-ops-tab-v289="search">Tìm kiếm</button></div>';
            page.insertBefore(nav,page.firstChild||null);
            var view=document.createElement('div');view.id='mkt-admin-ops-view-v289';
            if(nav.nextSibling)page.insertBefore(view,nav.nextSibling);else page.appendChild(view);
            nav.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest?ev.target.closest('[data-mkt-ops-tab-v289]'):null;if(b)switchTab(b.getAttribute('data-mkt-ops-tab-v289'))});
        }
        markPermissionContent(page);
        syncView();
        bindObserver();
    }

    function bindObserver(){
        var page=adminPage();if(!page||state.observer)return;
        try{state.observer=new MutationObserver(function(){if(!document.getElementById('mkt-admin-ops-nav-v289'))scheduleMount()});state.observer.observe(page,{childList:true})}catch(e){}
    }

    function switchTab(tab){
        if(['permissions','health','audit','search'].indexOf(tab)===-1)tab='permissions';
        state.active=tab;try{sessionStorage.setItem('MKT_ADMIN_OPS_TAB_V289',tab)}catch(e){}
        syncView();
    }

    function syncView(){
        var page=adminPage();if(!page)return;
        var view=document.getElementById('mkt-admin-ops-view-v289');
        Array.prototype.forEach.call(page.querySelectorAll('[data-mkt-ops-tab-v289]'),function(b){b.classList.toggle('active',b.getAttribute('data-mkt-ops-tab-v289')===state.active)});
        Array.prototype.forEach.call(page.querySelectorAll('[data-mkt-admin-permission-content-v289="1"]'),function(el){if(state.active==='permissions')el.style.removeProperty('display');else el.style.setProperty('display','none','important')});
        if(!view)return;

        var tabChanged=state.renderedTab!==state.active;
        var viewChanged=state.renderedView!==view;
        var viewEmpty=!view.firstElementChild;

        if(state.active==='permissions'){
            view.style.display='none';
            state.renderedTab='permissions';
            state.renderedView=view;
        }else{
            view.style.display='block';
            /*
             * V291: Không render lại tab đang mở ở mỗi lần mount nền.
             * Trước đây mount chạy định kỳ 1,4 giây -> renderSearch() thay toàn bộ
             * innerHTML -> input bị mất focus/con trỏ khi người dùng đang gõ.
             * Chỉ dựng lại khi đổi tab, view bị RBAC tạo lại, hoặc DOM thực sự rỗng.
             */
            if(tabChanged||viewChanged||viewEmpty){
                if(state.active==='health')renderHealth();
                if(state.active==='audit')renderAudit();
                if(state.active==='search')renderSearch();
                state.renderedTab=state.active;
                state.renderedView=view;
            }
        }

        /* Không reset timer Health ở mỗi mount nền. */
        if(state.active==='health'){
            if(!state.healthTimer){
                state.healthTimer=setInterval(function(){
                    var p=adminPage();
                    if(state.active==='health'&&p&&p.classList.contains('active'))loadHealth(false);
                },30000);
            }
        }else if(state.healthTimer){
            clearInterval(state.healthTimer);
            state.healthTimer=null;
        }
    }

    function latestUploadByCompany(root){
        var result={};COMPANIES.forEach(function(c){var rows=arr((root||{})[c]||{}).map(function(x){return x&&x.meta?x.meta:x}).filter(Boolean);rows.sort(function(a,b){return toMs(b.uploadedAt||b.savedAt)-toMs(a.uploadedAt||a.savedAt)});result[c]=rows[0]||null});return result;
    }
    function latestChatbot(root){var rows=arr(root||{}).map(function(x){return x&&x.meta?x.meta:x}).filter(Boolean);rows.sort(function(a,b){return toMs(b.uploadedAt||b.savedAt)-toMs(a.uploadedAt||a.savedAt)});return rows[0]||null}
    function countOnline(connections){var uids=Object.keys(connections||{}),count=0,sessions=0;uids.forEach(function(uid){var c=connections[uid]||{};var keys=Object.keys(c);if(keys.length){count++;sessions+=keys.length}});return {users:count,sessions:sessions}}

    async function loadHealth(force){
        if(state.healthLoading)return;
        if(!force&&state.healthData&&Date.now()-state.healthData.loadedAt<15000){paintHealth();return}
        var db=getDb(),user=getUser();if(!db){state.healthData={loadedAt:Date.now(),firebase:false,error:'Firebase Database chưa sẵn sàng'};paintHealth();return}
        state.healthLoading=true;paintHealth(true);
        try{
            var roasMetaPromise=Promise.all(COMPANIES.map(function(company){
                return recentMetaRecords('roas_statistics/uploads/'+company,1);
            }));
            var chatbotMetaPromise=recentMetaRecords('roas_statistics/chatbot_revenue_uploads',1);
            var refs=[
                safeRead(db.ref('.info/connected'),false),
                safeRead(db.ref('meta_bridge_health_v1'),{}),
                safeRead(db.ref('marketing_report_sync_v1/current'),{}),
                roasMetaPromise,
                chatbotMetaPromise,
                safeRead(db.ref('system_presence_v1/profiles'),{}),
                safeRead(db.ref('system_presence_v1/connections'),{})
            ];
            var v=await Promise.all(refs),bridge={};try{bridge=typeof window.getMetaAdsBridgeStatus==='function'?window.getMetaAdsBridgeStatus():{}}catch(e){bridge={lastError:text(e.message)}}
            var roasLatest={};COMPANIES.forEach(function(c,index){roasLatest[c]=(v[3][index]&&v[3][index][0])||null});
            state.healthData={loadedAt:Date.now(),firebase:v[0]===true,auth:!!(user&&user.uid),user:user,sharedBridge:v[1]||{},reportSync:v[2]||{},roasLatest:roasLatest,chatbotLatest:(v[4]&&v[4][0])||null,profiles:v[5]||{},connections:v[6]||{},online:countOnline(v[6]||{}),bridge:bridge};
        }catch(e){state.healthData={loadedAt:Date.now(),firebase:false,error:text(e.message)}}finally{state.healthLoading=false;paintHealth()}
    }

    function bridgeRow(key,label){
        var d=state.healthData||{},b=(d.bridge||{})[key]||{},shared=(d.sharedBridge||{})[key]||{};
        var kind='info',status='Chưa kích hoạt',detail='Bridge được mở khi hệ thống thực sự cần tải Meta.';
        if(!b.configured){kind='bad';status='Chưa cấu hình';detail='Không tìm thấy URL Bridge.'}
        else if(b.quotaBlocked||shared.status==='quota_exhausted'){kind='bad';status='Đang bị giới hạn';detail=text(b.quotaReason||shared.message)||'Quota đang bị khóa tạm thời.'}
        else if(b.ready&&b.confirmed){kind='good';status='Sẵn sàng';detail='Handshake đã xác nhận'+(b.pendingRequests?' · '+b.pendingRequests+' request đang chờ':'')}
        else if(b.frameMounted&&b.lastError){kind='warn';status='Có cảnh báo';detail=text(b.lastError)}
        else if(b.frameMounted){kind='warn';status='Đang kết nối';detail='Iframe đã mở nhưng handshake chưa hoàn tất.'}
        return '<div class="mkt-health-row-v289"><b>'+esc(label)+'</b><div class="detail">'+esc(detail)+'</div>'+statusHtml(status,kind)+'</div>';
    }

    function paintHealth(loading){
        var view=document.getElementById('mkt-admin-ops-view-v289');if(!view||state.active!=='health')return;
        if(loading&&!state.healthData){view.innerHTML='<div class="mkt-audit-empty-v289">Đang kiểm tra sức khỏe hệ thống...</div>';return}
        var d=state.healthData||{},online=d.online||{users:0,sessions:0};
        var blocked=0;['workspace','public1','public2'].forEach(function(k){var b=(d.bridge||{})[k]||{},s=(d.sharedBridge||{})[k]||{};if(b.quotaBlocked||s.status==='quota_exhausted')blocked++});
        var coord=(d.bridge||{}).coordinatorLastState||null;
        var stale=coord&&coord.status==='fetching'&&num(coord.lockExpiresAt)<Date.now()?1:0;
        var coordLabel=coord?(text(coord.status||'Chưa rõ')+(coord.company?' · '+coord.company:'')):'Chưa có request trong phiên';
        var reportEnabled=d.reportSync&&d.reportSync.enabled!==false;
        var overall=d.firebase&&d.auth&&blocked===0?'Ổn định':(d.firebase?'Cần chú ý':'Có lỗi');
        var overallKind=d.firebase&&d.auth&&blocked===0?'good':(d.firebase?'warn':'bad');
        var companies='';COMPANIES.forEach(function(c){var u=(d.roasLatest||{})[c];companies+='<div class="mkt-company-health-item-v289"><b>'+esc(c+' · '+COMPANY_NAMES[c])+'</b><span>'+(u?esc(u.fileName||u.id||'File chi phí'):'Chưa có file chi phí')+'</span><em>'+(u?esc(fmtTime(u.uploadedAt)):'Chưa ghi nhận')+'</em></div>'});
        view.innerHTML='<div class="mkt-ops-page-v289">'+
            '<div class="mkt-ops-toolbar-v289"><div class="mkt-ops-title-v289"><h3>Sức khỏe hệ thống</h3><p>Kiểm tra kết nối và dữ liệu nền hiện có. Màn hình này chỉ đọc trạng thái, không gọi Meta và không sửa dữ liệu.</p></div><div class="mkt-ops-actions-v289"><button class="mkt-ops-btn-v289 primary" onclick="window.MKTAdminOpsV289.refreshHealth()">Làm mới</button></div></div>'+
            '<div class="mkt-health-kpis-v289">'+
              '<div class="mkt-health-kpi-v289 '+overallKind+'"><span>Tình trạng chung</span><strong>'+esc(overall)+'</strong><small>Cập nhật '+esc(ago(d.loadedAt))+'</small></div>'+
              '<div class="mkt-health-kpi-v289 '+(d.firebase?'good':'bad')+'"><span>Firebase</span><strong>'+(d.firebase?'Kết nối':'Mất kết nối')+'</strong><small>'+(d.auth?'Đã xác thực tài khoản':'Chưa xác thực')+'</small></div>'+
              '<div class="mkt-health-kpi-v289 '+(blocked?'bad':'good')+'"><span>Meta Bridge</span><strong>'+blocked+'</strong><small>Bridge đang bị giới hạn quota</small></div>'+
              '<div class="mkt-health-kpi-v289 '+(online.users?'good':'')+'"><span>Đang online</span><strong>'+esc(online.users)+'</strong><small>'+esc(online.sessions)+' phiên đang kết nối</small></div>'+
            '</div>'+
            '<div class="mkt-ops-grid-2-v289">'+
              '<section class="mkt-ops-card-v289"><div class="mkt-ops-card-head-v289"><strong>Meta Multi-Bridge</strong><small>Workspace → Gmail 1 → Gmail 2</small></div>'+bridgeRow('workspace','Workspace')+bridgeRow('public1','Gmail 1')+bridgeRow('public2','Gmail 2')+'</section>'+
              '<section class="mkt-ops-card-v289"><div class="mkt-ops-card-head-v289"><strong>Dịch vụ nền</strong><small>Trạng thái vận hành</small></div>'+
                '<div class="mkt-health-row-v289"><b>Request Coordinator</b><div class="detail">'+esc(coordLabel+(stale?' · lock đã quá hạn':''))+'</div>'+statusHtml(stale?'Cần kiểm tra':(coord?'Đã ghi nhận':'Chưa hoạt động'),stale?'warn':(coord?'good':'info'))+'</div>'+
                '<div class="mkt-health-row-v289"><b>Báo cáo Marketing</b><div class="detail">'+esc(reportEnabled?'Đang dùng dữ liệu live':'Dữ liệu đang được khóa theo thao tác người dùng')+'</div>'+statusHtml(reportEnabled?'Đang đồng bộ':'Đang dừng',reportEnabled?'good':'warn')+'</div>'+
                '<div class="mkt-health-row-v289"><b>System Admin Bridge</b><div class="detail">'+esc(window.MKT_SYSTEM_ADMIN_BRIDGE_URL?'Gmail 1 đã được cấu hình cố định':'Chưa có URL quản trị Firebase Auth')+'</div>'+statusHtml(window.MKT_SYSTEM_ADMIN_BRIDGE_URL?'Đã cấu hình':'Thiếu cấu hình',window.MKT_SYSTEM_ADMIN_BRIDGE_URL?'good':'bad')+'</div>'+
                '<div class="mkt-health-row-v289"><b>RBAC</b><div class="detail">'+esc(window.MKTRBAC&&window.MKTRBAC.version||'Chưa tải')+'</div>'+statusHtml(window.MKTRBAC?'Đã tải':'Chưa tải',window.MKTRBAC?'good':'warn')+'</div>'+
              '</section>'+
            '</div>'+
            '<section class="mkt-ops-card-v289"><div class="mkt-ops-card-head-v289"><strong>Nguồn ROAS gần nhất</strong><small>Chỉ hiển thị metadata, không tải rows</small></div><div class="mkt-company-health-v289">'+companies+'</div>'+
              '<div class="mkt-health-row-v289"><b>Doanh thu chatbot gần nhất</b><div class="detail">'+esc(d.chatbotLatest?(d.chatbotLatest.fileName||d.chatbotLatest.id||'File doanh thu'):'Chưa có file')+'</div>'+statusHtml(d.chatbotLatest?fmtTime(d.chatbotLatest.uploadedAt):'Chưa ghi nhận',d.chatbotLatest?'info':'')+'</div></section>'+
            '<div class="mkt-ops-footnote-v289">System Health V289 chỉ dùng dữ liệu trạng thái đã có trong Firebase và bộ Multi-Bridge hiện tại. “Chưa kích hoạt” không đồng nghĩa Bridge bị lỗi; iframe chỉ được mở khi hệ thống cần gọi Meta.</div>'+
        '</div>';
    }

    function flattenManualBudget(root,out){
        Object.keys(root||{}).forEach(function(company){var c=root[company]||{};Object.keys(c).forEach(function(entity){var events=c[entity]||{};Object.keys(events).forEach(function(id){var e=events[id]||{};if(!e||typeof e!=='object')return;var ms=toMs(e.changedAtMs||e.stoppedAtMs||e.manualUpdatedAt||e.changedAt||e.detectedAt);if(!ms)return;out.push({id:'budget_'+company+'_'+id,ms:ms,source:'Ngân sách',sourceKey:'budget',category:'budget',actor:text(e.manualCreatedBy||e.manualCreatedByEmail||e.writerEmail||e.writerUid||'Hệ thống'),actorSub:text(e.manualCreatedByEmail||''),title:e.reason==='manual_stop'?'Ngưng theo dõi ngân sách':'Thay đổi ngân sách',summary:text(e.manualNote||e.reason||'Mốc ngân sách được ghi nhận'),target:text(e.fullName||e.entityName||e.adsetName||entity),company:company,before:e.fromBudget!=null?money(e.fromBudget):'',after:e.toBudget!=null?money(e.toBudget):'',severity:'info',page:'ads'})})})})
    }
    function flattenRoasMetaLists(lists,out){
        COMPANIES.forEach(function(company,index){
            (lists[index]||[]).forEach(function(m){
                var ms=toMs(m.uploadedAt||m.savedAt);if(!ms)return;
                out.push({id:'roas_'+company+'_'+(m.id||m.__key||ms),ms:ms,source:'ROAS',sourceKey:'roas',category:'upload',actor:text(m.uploader||m.uploaderEmail||'Hệ thống'),actorSub:text(m.uploaderEmail||''),title:'Upload file chi phí',summary:text(m.fileName||m.id||m.__key||'File chi phí')+' · '+num(m.rows)+' dòng · '+num(m.groups)+' nhóm',target:COMPANY_NAMES[company]||company,company:company,severity:'info',page:'roas-stats'});
            });
        });
    }
    function flattenChatbotMetaList(list,out){
        (list||[]).forEach(function(m){
            var ms=toMs(m.uploadedAt||m.savedAt);if(!ms)return;
            out.push({id:'chat_'+(m.id||m.__key||ms),ms:ms,source:'Doanh thu',sourceKey:'revenue',category:'upload',actor:text(m.uploader||m.uploaderEmail||'Hệ thống'),actorSub:text(m.uploaderEmail||''),title:'Upload doanh thu chatbot',summary:text(m.fileName||m.id||m.__key||'File doanh thu')+' · '+num(m.rows)+' dòng · khớp '+num(m.matched)+' / '+num(m.rows),target:text(m.companyName||m.company||'Nhiều công ty'),company:text(m.company||''),severity:num(m.unmatched)>0?'warning':'info',page:'roas-stats'});
        });
    }
    function flattenLegacyLogs(root,out,source){Object.keys(root||{}).forEach(function(id){if(id.charAt(0)==='_')return;var x=root[id]||{};if(!x||typeof x!=='object')return;var ms=toMs(x.timestamp||x.createdAtMs||x.createdAt||x.exportedAt||x.uploadedAt);if(!ms)return;out.push({id:source+'_'+id,ms:ms,source:source==='upload'?'Ads Upload':'Xuất file',sourceKey:source,category:source,actor:text(x.uploader||x.user||x.exporter||'Hệ thống'),actorSub:text(x.email||''),title:source==='upload'?'Upload dữ liệu Ads':'Xuất dữ liệu',summary:text(x.fileName||x.name||id)+(x.rowCount!=null?' · '+num(x.rowCount)+' dòng':''),target:text(x.company||''),company:text(x.company||''),severity:'info',page:'ads'})})}

    async function loadAudit(force){
        if(state.auditLoading)return;
        if(!force&&state.auditLoadedAt&&Date.now()-state.auditLoadedAt<30000){paintAudit();return}
        var db=getDb();if(!db)return;
        state.auditLoading=true;paintAudit(true);
        try{
            var roasRecentPromise=Promise.all(COMPANIES.map(function(company){
                return recentMetaRecords('roas_statistics/uploads/'+company,3);
            }));
            var chatbotRecentPromise=recentMetaRecords('roas_statistics/chatbot_revenue_uploads',6);
            var vals=await Promise.all([
                safeRead(db.ref('campaign_activity_global_v1').orderByChild('createdAtMs').limitToLast(500),{}),
                safeRead(db.ref('account_activity_notifications_v1/admin_feed').orderByChild('createdAtMs').limitToLast(300),{}),
                safeRead(db.ref('meta_budget_manual_events_v1'),{}),
                safeRead(db.ref('export_logs').limitToLast(80),{}),
                roasRecentPromise,
                chatbotRecentPromise
            ]),items=[];
            arr(vals[0]||{}).forEach(function(x){if(!x)return;var r=x.deliveryReceipt||{};var before=x.fromBudget!=null?money(x.fromBudget):(x.fromStatus||x.fromName||x.fromValue||'');var after=x.toBudget!=null?money(x.toBudget):(x.toStatus||x.toName||x.toValue||'');items.push({id:'ads_'+(x.activityId||x.__key),ms:toMs(x.createdAtMs||x.createdAt),source:'Ads',sourceKey:'ads',category:'ads',actor:'Meta Sync',actorSub:text(x.writerEmail?('Ghi nhận bởi '+x.writerEmail):''),title:text(x.title||x.eventType||'Hoạt động Ads'),summary:text(x.message||''),target:text(x.objectName||x.campaignName||''),company:text(x.company||''),before:text(before),after:text(after),severity:(x.type==='warning'||r.personalStatus==='not_sent'||r.personalStatus==='error')?'warning':'info',status:r.personalStatus==='error'?'Lỗi phát':(r.personalStatus==='not_sent'?'Chưa gửi cá nhân':(r.personalStatus==='processing'?'Đang ghi nhận':'Đã ghi')),statusKind:r.personalStatus==='error'?'bad':(r.personalStatus==='not_sent'?'warn':(r.personalStatus==='processing'?'info':'good')),page:'ads'})});
            arr(vals[1]||{}).forEach(function(x){if(!x)return;items.push({id:'acct_'+(x.activityId||x.__key),ms:toMs(x.createdAtMs||x.createdAt),source:'Tài khoản',sourceKey:'account',category:'account',actor:text(x.actorName||x.actorEmail||'Admin'),actorSub:text(x.actorEmail||''),title:text(x.title||x.eventType||'Hoạt động tài khoản'),summary:text(x.message||''),target:text(x.targetUserName||x.targetUserEmail||''),before:text(x.beforeRole||''),after:text(x.afterRole||''),severity:x.type==='warning'?'warning':'info',status:'Đã ghi',statusKind:'good',page:'admin'})});
            flattenManualBudget(vals[2]||{},items);
            flattenLegacyLogs(vals[3]||{},items,'export');
            flattenRoasMetaLists(vals[4]||[],items);
            flattenChatbotMetaList(vals[5]||[],items);
            try {
                if(window.RoasStatsModule&&typeof window.RoasStatsModule.getState==='function'){
                    var rs=window.RoasStatsModule.getState()||{};
                    var localRoas=[[],[],[],[]];
                    (rs.uploadHistory||[]).forEach(function(m){var idx=COMPANIES.indexOf(text(m.company));if(idx>=0)localRoas[idx].push(m)});
                    flattenRoasMetaLists(localRoas,items);
                    flattenChatbotMetaList(rs.chatbotRevenueUploads||[],items);
                }
            } catch(e){}
            var uniqueAudit={},deduped=[];items.forEach(function(i){var key=i.id||[i.sourceKey,i.ms,i.title,i.target].join('|');if(uniqueAudit[key])return;uniqueAudit[key]=1;deduped.push(i)});items=deduped;
            items.forEach(function(i){if(!i.status){i.status='Đã ghi';i.statusKind=i.severity==='warning'?'warn':'good'}});items.sort(function(a,b){return b.ms-a.ms});
            state.auditItems=items;state.auditRaw={ads:vals[0]||{},account:vals[1]||{},budget:vals[2]||{},export:vals[3]||{},roasMeta:vals[4]||[],chatbotMeta:vals[5]||[]};state.auditLoadedAt=Date.now();
        }catch(e){state.auditItems=[];state.auditLoadedAt=Date.now()}finally{state.auditLoading=false;paintAudit()}
    }

    function auditFiltered(){
        var q=lower(state.auditFilter.q),source=state.auditFilter.source,cut=0;if(state.auditFilter.period==='24h')cut=Date.now()-86400000;else if(state.auditFilter.period==='7d')cut=Date.now()-7*86400000;else if(state.auditFilter.period==='30d')cut=Date.now()-30*86400000;
        return state.auditItems.filter(function(i){if(cut&&i.ms<cut)return false;if(source!=='all'&&i.sourceKey!==source)return false;if(!q)return true;var h=[i.source,i.actor,i.actorSub,i.title,i.summary,i.target,i.company,i.before,i.after].join(' ').toLocaleLowerCase('vi-VN');return h.indexOf(q)!==-1}).slice(0,300)
    }
    function paintAudit(loading){
        var view=document.getElementById('mkt-admin-ops-view-v289');if(!view||state.active!=='audit')return;
        if((loading||!state.auditLoadedAt)&&!state.auditItems.length){view.innerHTML='<div class="mkt-audit-empty-v289">Đang tổng hợp nhật ký từ các nguồn hiện có...</div>';return}
        var rows=auditFiltered(),last24=state.auditItems.filter(function(i){return i.ms>Date.now()-86400000}).length,warns=state.auditItems.filter(function(i){return i.severity==='warning'}).length;
        var html='';rows.forEach(function(i){var change=(i.before||i.after)?'<div class="mkt-audit-change-v289">'+esc(i.before||'—')+' → '+esc(i.after||'—')+'</div>':'';html+='<div class="mkt-audit-row-v289"><div class="mkt-audit-time-v289">'+esc(fmtTime(i.ms))+'<br>'+esc(ago(i.ms))+'</div><div class="mkt-audit-source-v289">'+esc(i.source)+'</div><div class="mkt-audit-who-v289"><b>'+esc(i.actor||'Hệ thống')+'</b><small>'+esc(i.actorSub||i.target||'')+'</small></div><div class="mkt-audit-main-v289"><b>'+esc(i.title)+'</b><p>'+esc(i.summary||i.target||'')+'</p>'+change+'</div>'+statusHtml(i.status||'Đã ghi',i.statusKind||'good')+'</div>'});
        if(!html)html='<div class="mkt-audit-empty-v289">Không có nhật ký phù hợp bộ lọc.</div>';
        view.innerHTML='<div class="mkt-ops-page-v289"><div class="mkt-ops-toolbar-v289"><div class="mkt-ops-title-v289"><h3>Nhật ký thao tác</h3><p>Tổng hợp chỉ đọc từ hoạt động quảng cáo, hoạt động tài khoản, ROAS, mốc ngân sách và lịch sử tải lên/xuất file hiện có.</p></div><div class="mkt-ops-actions-v289"><button class="mkt-ops-btn-v289 primary" onclick="window.MKTAdminOpsV289.refreshAudit()">Làm mới</button></div></div>'+
            '<div class="mkt-audit-summary-v289"><span class="mkt-audit-chip-v289">'+state.auditItems.length+' bản ghi đang tải</span><span class="mkt-audit-chip-v289">'+last24+' trong 24 giờ</span><span class="mkt-audit-chip-v289">'+warns+' cần chú ý</span><span class="mkt-audit-chip-v289">Cập nhật '+esc(ago(state.auditLoadedAt))+'</span></div>'+
            '<div class="mkt-audit-filters-v289"><input class="mkt-ops-input-v289" id="mkt-audit-q-v289" placeholder="Tìm người, chiến dịch, file, nội dung..." value="'+esc(state.auditFilter.q)+'"><select class="mkt-ops-select-v289" id="mkt-audit-source-v289"><option value="all">Tất cả nguồn</option><option value="ads">Ads</option><option value="account">Tài khoản</option><option value="roas">ROAS</option><option value="revenue">Doanh thu</option><option value="budget">Ngân sách</option><option value="upload">Ads Upload</option><option value="export">Xuất file</option></select><select class="mkt-ops-select-v289" id="mkt-audit-period-v289"><option value="24h">24 giờ</option><option value="7d">7 ngày</option><option value="30d">30 ngày</option><option value="all">Tất cả đang tải</option></select></div>'+
            '<div class="mkt-audit-list-v289">'+html+'</div><div class="mkt-ops-footnote-v289">V289 không tạo node Audit mới và không thay logic nghiệp vụ. Ads/Tài khoản đọc log gần nhất; ROAS chỉ lấy metadata gần đây bằng REST shallow và tự bổ sung toàn bộ lịch sử nếu module ROAS đã được mở trong phiên. Thao tác cũ chưa từng được hệ thống ghi log thì không thể suy đoán ngược.</div></div>';
        var q=document.getElementById('mkt-audit-q-v289'),so=document.getElementById('mkt-audit-source-v289'),pe=document.getElementById('mkt-audit-period-v289');if(so)so.value=state.auditFilter.source;if(pe)pe.value=state.auditFilter.period;
        var timer=null;if(q)q.oninput=function(){state.auditFilter.q=this.value;clearTimeout(timer);timer=setTimeout(paintAudit,180)};if(so)so.onchange=function(){state.auditFilter.source=this.value;paintAudit()};if(pe)pe.onchange=function(){state.auditFilter.period=this.value;paintAudit()};
    }

    function userSearchRecords(){var users=window.SYS_DB_USERS||{},out=[];Object.keys(users).forEach(function(k){var u=users[k]||{};out.push({kind:'account',icon:'👤',title:text(u.name||u.email||k),desc:[u.email,window.getMktRoleLabel?window.getMktRoleLabel(u.role):u.role].filter(Boolean).join(' · '),meta:'Tài khoản · '+k,page:'admin',isAudit:false,hay:[u.name,u.email,u.role,k,Object.keys(u.permissions||{}).join(' ')].join(' ')})});return out}
    function auditSearchRecords(){return state.auditItems.map(function(i){return {kind:i.sourceKey,icon:i.sourceKey==='ads'?'📣':(i.sourceKey==='roas'?'📊':(i.sourceKey==='revenue'?'💰':'🧾')),title:i.title,desc:[i.actor,i.target,i.summary].filter(Boolean).join(' · '),meta:i.source+' · '+fmtTime(i.ms),page:i.page||'',isAudit:true,hay:[i.source,i.actor,i.actorSub,i.title,i.summary,i.target,i.company,i.before,i.after].join(' ')}})}
    function needsDeepRevenue(q,scope){return scope==='revenue'||(scope==='all'&&(/\d{5,}/.test(q)||/(?:O?NNV|O?VN|O?KF|ABC)\s*[-_]?\s*\d+/i.test(q)))}
    async function loadRevenueRecent(){
        if(state.revenueCache&&Date.now()-state.revenueLoadedAt<300000)return state.revenueCache;
        var db=getDb();
        if(!db)return [];
        var vals=await Promise.all(COMPANIES.map(function(c){
            return safeRead(db.ref('roas_statistics/revenue_ledger_v1/'+c).limitToLast(4),{});
        }));
        var rows=[];
        vals.forEach(function(root,ci){
            var company=COMPANIES[ci];
            Object.keys(root||{}).forEach(function(uploadId){
                var upload=root[uploadId]||{};
                Object.keys(upload).forEach(function(key){
                    if(key==='_meta')return;
                    var x=upload[key]||{};
                    rows.push({
                        kind:'revenue',
                        icon:'💰',
                        title:x.orderId?'Mã đơn '+x.orderId:'Đơn doanh thu '+key,
                        desc:[x.customer,x.employee,(Array.isArray(x.skus)?x.skus.join(', '):''),money(x.amount)].filter(Boolean).join(' · '),
                        meta:company+' · '+(x.createdAtDisplay||fmtTime(x.createdAtMs))+' · '+text(x.sourceFileName||uploadId),
                        page:'roas-stats',
                        hay:[x.orderId,x.customer,x.employee,(x.skus||[]).join(' '),x.matchedSku,x.matchedAdsetName,x.sourceFileName,x.adText,x.fingerprint,company].join(' ')
                    });
                });
            });
        });
        state.revenueCache=rows;
        state.revenueLoadedAt=Date.now();
        return rows;
    }
    function scopeAccept(rec,scope){if(scope==='all')return true;if(scope==='account')return rec.kind==='account';if(scope==='ads')return rec.kind==='ads'||rec.kind==='budget'||rec.kind==='upload'||rec.kind==='export';if(scope==='roas')return rec.kind==='roas'||rec.kind==='revenue';if(scope==='revenue')return rec.kind==='revenue';if(scope==='audit')return rec.isAudit===true;return true}
    async function runSearch(){
        var qEl=document.getElementById('mkt-global-search-q-v289'),view=document.getElementById('mkt-search-results-v289');if(!qEl||!view)return;var q=text(qEl.value);if(q.length<2){view.innerHTML='<div class="mkt-audit-empty-v289">Nhập ít nhất 2 ký tự để tìm kiếm.</div>';return}
        view.innerHTML='<div class="mkt-audit-empty-v289">Đang tìm kiếm...</div>';if(!state.auditLoadedAt)await loadAudit(false);var records=userSearchRecords().concat(auditSearchRecords());if(needsDeepRevenue(q,state.searchScope)){try{records=records.concat(await loadRevenueRecent())}catch(e){}}
        var needle=lower(q),seen={},results=records.filter(function(r){if(!scopeAccept(r,state.searchScope))return false;var h=lower(r.hay+' '+r.title+' '+r.desc+' '+r.meta);if(h.indexOf(needle)===-1)return false;var key=r.kind+'|'+r.title+'|'+r.meta;if(seen[key])return false;seen[key]=1;return true}).slice(0,100);paintSearchResults(results,q)
    }
    function paintSearchResults(results,q){var box=document.getElementById('mkt-search-results-v289');if(!box)return;if(!results.length){box.innerHTML='<div class="mkt-audit-empty-v289">Không tìm thấy kết quả cho “'+esc(q)+'”.</div>';return}var html='';results.forEach(function(r){html+='<div class="mkt-search-result-v289"><div class="mkt-search-icon-v289">'+esc(r.icon||'🔎')+'</div><div><b>'+esc(r.title)+'</b><p>'+esc(r.desc||'')+'</p><small>'+esc(r.meta||'')+'</small></div>'+(r.page?'<button class="mkt-search-open-v289" data-open-page-v289="'+esc(r.page)+'">Mở mục</button>':'')+'</div>'});box.innerHTML=html;Array.prototype.forEach.call(box.querySelectorAll('[data-open-page-v289]'),function(b){b.onclick=function(){var p=b.getAttribute('data-open-page-v289');if(p==='admin')switchTab('permissions');if(p&&window.goPage)window.goPage(p)}})}
    function renderSearch(){
        var view=document.getElementById('mkt-admin-ops-view-v289');if(!view||state.active!=='search')return;
        view.innerHTML='<div class="mkt-ops-page-v289"><div class="mkt-ops-toolbar-v289"><div class="mkt-ops-title-v289"><h3>Tìm kiếm toàn hệ thống</h3><p>Tìm một lần qua tài khoản, nhật ký quảng cáo, ROAS, tệp tải lên và doanh thu gần đây.</p></div></div><div class="mkt-search-box-v289"><div class="mkt-search-line-v289"><input class="mkt-ops-input-v289" id="mkt-global-search-q-v289" placeholder="Tên nhân viên, email, SKU, mã đơn, chiến dịch, tên file..."><button class="mkt-ops-btn-v289 primary" id="mkt-global-search-btn-v289">Tìm kiếm</button></div><div class="mkt-search-scope-v289">'+
            '<button data-search-scope-v289="all">Tất cả</button><button data-search-scope-v289="account">Tài khoản</button><button data-search-scope-v289="ads">Quảng cáo</button><button data-search-scope-v289="roas">ROAS</button><button data-search-scope-v289="revenue">Doanh thu</button><button data-search-scope-v289="audit">Nhật ký</button></div><div class="mkt-search-note-v289">Tìm sâu dữ liệu doanh thu tự kích hoạt khi nhập mã đơn/SKU hoặc chọn phạm vi Doanh thu; kết quả được lưu tạm 5 phút để giảm tải Firebase.</div></div><div class="mkt-search-results-v289" id="mkt-search-results-v289"><div class="mkt-audit-empty-v289">Nhập từ khóa để bắt đầu.</div></div><div class="mkt-ops-footnote-v289">Tìm kiếm chỉ sử dụng dữ liệu mà tài khoản Quản trị hiện có quyền đọc. Chức năng này không thay đổi dữ liệu và không gọi Meta API.</div></div>';
        Array.prototype.forEach.call(view.querySelectorAll('[data-search-scope-v289]'),function(b){var sc=b.getAttribute('data-search-scope-v289');b.classList.toggle('active',sc===state.searchScope);b.onclick=function(){state.searchScope=sc;Array.prototype.forEach.call(view.querySelectorAll('[data-search-scope-v289]'),function(x){x.classList.toggle('active',x===b)})}});var q=document.getElementById('mkt-global-search-q-v289'),btn=document.getElementById('mkt-global-search-btn-v289');if(btn)btn.onclick=runSearch;if(q)q.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();runSearch()}};
    }

    function renderHealth(){var view=document.getElementById('mkt-admin-ops-view-v289');if(view)view.innerHTML='<div class="mkt-audit-empty-v289">Đang chuẩn bị kiểm tra...</div>';loadHealth(false)}
    function renderAudit(){var view=document.getElementById('mkt-admin-ops-view-v289');if(view&&!state.auditLoadedAt)view.innerHTML='<div class="mkt-audit-empty-v289">Đang chuẩn bị nhật ký...</div>';loadAudit(false)}

    window.MKTAdminOpsV289={
        version:VERSION,
        switchTab:switchTab,
        mount:mount,
        refreshHealth:function(){state.healthData=null;return loadHealth(true)},
        refreshAudit:function(){state.auditLoadedAt=0;return loadAudit(true)},
        search:runSearch,
        getState:function(){return state}
    };

    function boot(){
        mount();
        var page=adminPage();if(page)bindObserver();
        window.addEventListener('hashchange',function(){setTimeout(mount,80)});
        document.addEventListener('click',function(ev){var t=ev.target&&ev.target.closest?ev.target.closest('[data-page="admin"],#account-admin-menu-item,#account-admin-menu-item-mobile'):null;if(t)setTimeout(mount,120)},true);
        setInterval(function(){var p=adminPage();if(p&&p.classList.contains('active'))mount()},1400);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,200)});else setTimeout(boot,200);
})();
})();

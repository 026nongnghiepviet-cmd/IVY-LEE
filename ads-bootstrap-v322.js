/* V322 ADS BOOTSTRAP — GitHub only. Blogger contains no Ads JavaScript logic. */
(function installAdsBootstrapV322(){
  'use strict';
  if (window.__MKT_ADS_BOOTSTRAP_V322) return;
  window.__MKT_ADS_BOOTSTRAP_V322 = true;

  var EXPECTED_CORE = 'V322_ADS_CORE';
  var EXPECTED_UI = 'V322_ADS_UI';
  var EXPECTED_READY = 'V322_ADS_READY';
  var FILES = [
    {
      key:'core',
      name:'ads-firebase-v322-core.js',
      urls:[
        'https://cdn.jsdelivr.net/gh/026nongnghiepviet-cmd/IVY-LEE@main/ads-firebase-v322-core.js?v=V322FULLSEP',
        'https://raw.githack.com/026nongnghiepviet-cmd/IVY-LEE/main/ads-firebase-v322-core.js?v=V322FULLSEP',
        'https://raw.githubusercontent.com/026nongnghiepviet-cmd/IVY-LEE/main/ads-firebase-v322-core.js?v=V322FULLSEP'
      ],
      ok:function(){ return window.MKT_ADS_PART1_BUILD === EXPECTED_CORE; }
    },
    {
      key:'ui',
      name:'ads-firebase-v322-ui.js',
      urls:[
        'https://cdn.jsdelivr.net/gh/026nongnghiepviet-cmd/IVY-LEE@main/ads-firebase-v322-ui.js?v=V322FULLSEP',
        'https://raw.githack.com/026nongnghiepviet-cmd/IVY-LEE/main/ads-firebase-v322-ui.js?v=V322FULLSEP',
        'https://raw.githubusercontent.com/026nongnghiepviet-cmd/IVY-LEE/main/ads-firebase-v322-ui.js?v=V322FULLSEP'
      ],
      ok:function(){
        return window.MKT_ADS_PART2_BUILD === EXPECTED_UI &&
               window.MKT_ADS_MODULE_BUILD === EXPECTED_READY &&
               typeof window.initAdsAnalysis === 'function';
      }
    }
  ];

  var fileIndex=0, sourceIndex=0, loading=false, loadedSources={}, lastError='';
  var watchdog=null;
  function page(){ return document.getElementById('page-ads'); }
  function mount(){ return document.getElementById('ads-analysis-result'); }
  function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ready(){
    return window.MKT_ADS_PART1_BUILD===EXPECTED_CORE &&
           window.MKT_ADS_PART2_BUILD===EXPECTED_UI &&
           window.MKT_ADS_MODULE_BUILD===EXPECTED_READY &&
           typeof window.initAdsAnalysis==='function';
  }
  function purgeLegacyUpload(){
    var p=page(); if(!p) return;
    var old=p.querySelector('#ads-upload-area'); if(old) old.remove();
    p.querySelectorAll('.upload-area').forEach(function(el){
      if(/Upload File Excel|Tự động cộng dồn/i.test(String(el.textContent||''))) el.remove();
    });
    var m=mount(); if(m) m.style.display='block';
  }
  function ensureWatchdog(){
    purgeLegacyUpload();
    if(watchdog || !window.MutationObserver) return;
    var p=page(); if(!p) return;
    watchdog=new MutationObserver(purgeLegacyUpload);
    watchdog.observe(p,{childList:true,subtree:true});
  }
  function showState(title,detail,error){
    purgeLegacyUpload();
    var m=mount(); if(!m) return;
    if(ready() && m.querySelector('.ads-enterprise-shell')) return;
    m.innerHTML='<div class="ads-v322-loader-state '+(error?'is-error':'')+'"><b>'+esc(title)+'</b><span>'+detail+'</span>'+
      (error?'<button type="button" onclick="window.retryAdsV322()">↻ Tải lại giao diện Ads</button>':'')+'</div>';
  }
  function shouldBoot(){
    var p=page(); if(p&&p.classList.contains('active')) return true;
    try{return !!(window.MKTRouter&&window.MKTRouter.getCurrentRoute&&window.MKTRouter.getCurrentRoute()==='ads');}catch(e){return false;}
  }
  function boot(){
    ensureWatchdog();
    if(!ready()) return false;
    if(!shouldBoot()) return true;
    if(!(window.sysAuth&&window.sysAuth.currentUser)){
      showState('Đang chờ đăng nhập','Frontend Ads V322 đã tải và sẽ khởi tạo sau khi xác thực.',false);
      return true;
    }
    try{
      window.initAdsAnalysis();
      purgeLegacyUpload();
      var m=mount();
      if(!m || !m.querySelector('.ads-enterprise-shell')) throw new Error('initAdsAnalysis() chưa tạo giao diện Ads.');
      return true;
    }catch(err){
      lastError=String(err&&err.stack||err&&err.message||err||'');
      console.error('V322 Ads boot error:',err);
      showState('Module Ads khởi tạo lỗi',esc(err&&err.message||err),true);
      return false;
    }
  }
  function currentFile(){ return FILES[fileIndex]||null; }
  function resetExpected(file){
    if(!file) return;
    if(file.key==='core'){
      window.MKT_ADS_PART1_BUILD=''; window.MKT_ADS_PART2_BUILD=''; window.MKT_ADS_MODULE_BUILD='';
      try{window.initAdsAnalysis=undefined;}catch(e){}
    }else{
      window.MKT_ADS_PART2_BUILD=''; window.MKT_ADS_MODULE_BUILD='';
      try{window.initAdsAnalysis=undefined;}catch(e){}
    }
  }
  function fail(msg){
    var f=currentFile(); lastError=msg||'';
    showState('Frontend Ads V322 chưa đầy đủ','Không tải hợp lệ <b>'+(f?esc(f.name):'file')+'</b>.<br/>'+esc(msg||''),true);
  }
  function loadCurrent(){
    if(loading) return;
    if(ready()){boot();return;}
    var f=currentFile();
    if(!f){boot();return;}
    if(f.ok()){fileIndex++;sourceIndex=0;loadCurrent();return;}
    if(sourceIndex>=f.urls.length){fail('Marker xác minh không xuất hiện.');return;}
    var url=f.urls[sourceIndex++];
    loading=true;
    showState('Đang tải Nội dung Ads','Đang tải '+esc(f.name)+' · nguồn '+sourceIndex+'/'+f.urls.length+'…',false);
    var s=document.createElement('script');
    s.src=url; s.async=false; s.setAttribute('data-mkt-ads-v322',f.key+'|'+url);
    var done=false;
    var timer=setTimeout(function(){
      if(done)return; done=true; loading=false; try{s.remove();}catch(e){} lastError='Timeout '+f.name; loadCurrent();
    },20000);
    s.onload=function(){
      if(done)return; done=true; clearTimeout(timer); loading=false;
      if(f.ok()){loadedSources[f.key]=url;fileIndex++;sourceIndex=0;loadCurrent();}
      else{try{s.remove();}catch(e){} resetExpected(f);loadCurrent();}
    };
    s.onerror=function(){
      if(done)return; done=true; clearTimeout(timer); loading=false; try{s.remove();}catch(e){} lastError='Không tải được '+f.name;loadCurrent();
    };
    document.head.appendChild(s);
  }

  window.retryAdsV322=function(){
    document.querySelectorAll('script[data-mkt-ads-v322]').forEach(function(s){try{s.remove();}catch(e){}});
    fileIndex=0;sourceIndex=0;loading=false;loadedSources={};lastError='';resetExpected(FILES[0]);loadCurrent();return true;
  };
  window.ensureAdsV322=function(){ensureWatchdog();if(ready())return boot();loadCurrent();return false;};
  window.getAdsFrontendStatusV322=function(){
    var m=mount(); return {expected:EXPECTED_READY,core:String(window.MKT_ADS_PART1_BUILD||''),ui:String(window.MKT_ADS_PART2_BUILD||''),actual:String(window.MKT_ADS_MODULE_BUILD||''),initType:typeof window.initAdsAnalysis,loadedSources:loadedSources,lastError:lastError,shellMounted:!!(m&&m.querySelector('.ads-enterprise-shell'))};
  };

  ensureWatchdog();
  loadCurrent();
  document.addEventListener('visibilitychange',function(){if(!document.hidden)purgeLegacyUpload();});
  window.addEventListener('pageshow',purgeLegacyUpload);
})();

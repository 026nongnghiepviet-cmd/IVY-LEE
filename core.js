/* core.js — V55 core + router SPA (không reload) */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytCi6lhtqbqNFyFpRq1jltz8DJAgdwnUlwGO1sVs-0Bzw7peJr9GyPKKhoHwuI3spFiw/exec";

const BOSS = "Lê Minh Nhựt";
const DEPUTY = "Danh Thanh Liêm";
const STAFF_LIST = ["Lê Minh Nhựt", "Danh Thanh Liêm", "Trần Thành Tài", "Nguyễn Thị Kiều Duy"];
const USER_PINS = { "Lê Minh Nhựt":"9999", "Danh Thanh Liêm":"8888", "Trần Thành Tài":"Tai123", "Nguyễn Thị Kiều Duy":"Duy124" };

let myIdentity = "";
let activeUser = "";
let globalData = [];
let isSyncLocked = false;

let __syncInFlight = false;
let __lastVersion = "";
let __verTimer = null;

function getTodayVN() {
  const d = new Date();
  return d.getDate().toString().padStart(2,'0')+"/"+(d.getMonth()+1).toString().padStart(2,'0')+"/"+d.getFullYear();
}
let viewingDate = getTodayVN();
const todayStr = getTodayVN();

const stdDate = (v) => {
  if(!v) return "";
  let d = new Date(v);
  if(!isNaN(d.getTime()) && v.toString().includes('T')) return d.getDate().toString().padStart(2,'0')+"/"+(d.getMonth()+1).toString().padStart(2,'0')+"/"+d.getFullYear();
  let p = v.toString().trim().split(/[\s./-]/);
  if(p.length<2) return v;
  return p[0].padStart(2,'0')+"/"+p[1].padStart(2,'0')+"/"+(p[2]||"2026");
};

const getNorm = (d) => {
  if(!d) return "";
  let p = stdDate(d).split('/');
  return p.length<3 ? d : parseInt(p[0])+"-"+parseInt(p[1])+"-"+p[2];
};

function generateUID() { return 'ID-'+Date.now()+'-'+Math.floor(Math.random()*1000); }

function fixProgValue(p) {
  if(p===null||p===undefined||p==="") return "";
  let val=parseFloat(p);
  if(!isNaN(val)&&val<=1&&val>0&&p.toString().includes('.')) return Math.round(val*100).toString();
  return p.toString().replace('%','');
}

function getTom() {
  let d=new Date(); d.setDate(d.getDate()+1);
  return d.getDate().toString().padStart(2,'0')+"/"+(d.getMonth()+1).toString().padStart(2,'0')+"/"+d.getFullYear();
}

function showToast(m) {
  const x = document.getElementById("toast");
  if(!x) return;
  x.innerText = m;
  x.className = "show";
  setTimeout(() => x.className = "", 30000);
}

function updateUI() {
  document.querySelectorAll('tr').forEach(row => {
    const pIn = row.querySelector('.dl-prog, .in-prog');
    if(!pIn) return;

    let pVal = (pIn.value || "").trim();
    const stt = row.querySelector('.col-stt');

    row.classList.remove('row-green', 'row-yellow', 'row-red');
    if (pVal === "100") {
      row.classList.add('row-green');
      if(row.classList.contains('row-saved') && stt) stt.innerText = "✓";
    } else if (pVal !== "" && pVal !== "0") {
      row.classList.add('row-yellow');
      if(row.classList.contains('row-saved') && stt) stt.innerText = "...";
    } else {
      row.classList.add('row-red');
      if(row.classList.contains('row-saved') && stt) stt.innerText = "!";
    }
  });
}

function setSyncOverlay(on, silent=false) {
  const screen = document.getElementById('sync-screen');
  if(!screen) return;
  if(silent) return;
  screen.style.display = on ? 'flex' : 'none';
}

async function fetchAllData() {
  const r = await fetch(SCRIPT_URL + "?t=" + Date.now());
  return r.json();
}

async function fetchVersionMeta() {
  try {
    const r = await fetch(SCRIPT_URL + "?meta=1&t=" + Date.now());
    const o = await r.json();
    return (o && (o.version !== undefined)) ? String(o.version) : null;
  } catch(e){ return null; }
}

async function syncData(silent=true) {
  if(isSyncLocked) return;
  if(__syncInFlight) return;

  __syncInFlight = true;
  setSyncOverlay(true, silent);

  try {
    const o = await fetchAllData();
    if(o && o.data){
      globalData = o.data.filter(r => !r[5] || !r[5].toString().includes("[VOID]"));
    }

    // nếu đang ở report tab thì render lại
    if(getCurrentPage() === "report"){
      if(activeUser === "" && myIdentity !== "") window.openReport?.(myIdentity);
      else if(activeUser !== "") window.loadTableForDate?.(activeUser, viewingDate);
    }
  } catch(e) {
  } finally {
    setSyncOverlay(false, silent);
    __syncInFlight = false;
  }
}

/* ===================== ROUTER SPA (KHÔNG RELOAD) ===================== */
const __pages = ["report","plan","kpi"];
let __currentPage = "report";

function getCurrentPage(){ return __currentPage; }

function setNavActive(page){
  const map = {
    report: document.getElementById("nav-report"),
    plan: document.getElementById("nav-plan"),
    kpi: document.getElementById("nav-kpi"),
  };
  Object.values(map).forEach(el => el && el.classList.remove("active"));
  map[page]?.classList.add("active");
}

function showPage(page){
  const pr = document.getElementById("page-report");
  const pp = document.getElementById("page-plan");
  const pk = document.getElementById("page-kpi");

  if(pr) pr.style.display = (page==="report") ? "block" : "none";
  if(pp) pp.style.display = (page==="plan") ? "block" : "none";
  if(pk) pk.style.display = (page==="kpi") ? "block" : "none";

  setNavActive(page);
}

function navigatePage(page, opts){
  opts = opts || {};
  if(!__pages.includes(page)) page = "report";

  __currentPage = page;
  showPage(page);

  // cập nhật hash để back/forward vẫn mượt (không reload)
  if(opts.setHash !== false){
    const h = "#"+page;
    if(location.hash !== h) location.hash = h;
  }

  // gọi module onShow nếu có
  if(page==="plan") window.PlanModule?.onShow?.();
  if(page==="kpi") window.KpiModule?.onShow?.();

  // vào report thì đảm bảo render đúng
  if(page==="report" && myIdentity){
    if(activeUser) window.loadTableForDate?.(activeUser, viewingDate);
    else window.openReport?.(myIdentity);
  }
}

window.navigatePage = navigatePage;

window.addEventListener("hashchange", () => {
  const page = (location.hash || "#report").replace("#","");
  navigatePage(page, { setHash:false });
});

function bootRouter(){
  const page = (location.hash || "#report").replace("#","");
  navigatePage(page, { setHash:false });
}
/* ===================== /ROUTER ===================== */

function checkLogin() {
  const u = localStorage.getItem('MKT_USER_V55');
  if(u){
    myIdentity = u;
    document.getElementById('login-overlay').style.display='none';
    document.getElementById('header-user-display').innerText="👤 "+myIdentity;

    // vào report mặc định
    bootRouter();
    syncData(false);
  } else {
    document.getElementById('login-overlay').style.display='flex';
    bootRouter();
  }
}

function loginAs(n) {
  let p = prompt("Mật khẩu "+n+":");
  if(p===USER_PINS[n]){
    localStorage.setItem('MKT_USER_V55',n);
    checkLogin();
  } else {
    if(p!==null) alert("Sai mật khẩu!");
  }
}

function clearLogin() {
  if(confirm("Đăng xuất?")){
    localStorage.removeItem('MKT_USER_V55');
    location.reload();
  }
}

// lock khi đang nhập (để polling không giật)
(function bindLock(){
  const workArea = document.getElementById('work-area');
  if(!workArea) return;

  let unlockTimer = null;
  workArea.addEventListener('focusin', () => {
    isSyncLocked = true;
    if(unlockTimer) clearTimeout(unlockTimer);
  });
  workArea.addEventListener('focusout', () => {
    if(unlockTimer) clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => { isSyncLocked = false; }, 700);
  });
})();

// Enter save giữ y nguyên
document.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') {
    e.preventDefault();
    if(e.target.closest?.('#assign-dl-rows')) window.saveAssignedDeadlines?.();
    else if(e.target.closest?.('#receive-dl-rows')) window.saveReceivedDeadlines?.();
    else if(e.target.closest?.('#input-rows')) window.saveReportOnly?.();
  }
});

document.getElementById('work-area')?.addEventListener('input', updateUI);

// Version polling
function startVersionPolling() {
  const base = 1100; // Nhựt muốn 500 thì đổi ở đây
  const jitter = () => Math.floor(200 + Math.random() * 300);

  async function loop() {
    if(!myIdentity || document.hidden || isSyncLocked || __syncInFlight){
      __verTimer = setTimeout(loop, base + jitter());
      return;
    }

    try {
      let v = await fetchVersionMeta();
      if(v === null){
        const o = await fetchAllData();
        v = (o && o.version !== undefined) ? String(o.version) : "";
      }
      if(__lastVersion === "" && v) __lastVersion = v;

      if(v && v !== __lastVersion){
        __lastVersion = v;
        await syncData(true);
      }
    } catch(e){}

    __verTimer = setTimeout(loop, base + jitter());
  }

  if(__verTimer) clearTimeout(__verTimer);
  loop();
}

// expose (để report.js dùng)
window.SCRIPT_URL = SCRIPT_URL;
window.BOSS = BOSS;
window.DEPUTY = DEPUTY;
window.STAFF_LIST = STAFF_LIST;

Object.defineProperty(window, "myIdentity", { get: ()=>myIdentity, set:(v)=>{myIdentity=v;} });
Object.defineProperty(window, "activeUser", { get: ()=>activeUser, set:(v)=>{activeUser=v;} });
Object.defineProperty(window, "globalData", { get: ()=>globalData, set:(v)=>{globalData=v;} });
Object.defineProperty(window, "isSyncLocked", { get: ()=>isSyncLocked, set:(v)=>{isSyncLocked=v;} });
Object.defineProperty(window, "viewingDate", { get: ()=>viewingDate, set:(v)=>{viewingDate=v;} });

window.todayStr = todayStr;
window.stdDate = stdDate;
window.getNorm = getNorm;
window.generateUID = generateUID;
window.fixProgValue = fixProgValue;
window.getTom = getTom;

window.showToast = showToast;
window.updateUI = updateUI;

window.checkLogin = checkLogin;
window.loginAs = loginAs;
window.clearLogin = clearLogin;

window.syncData = syncData;
window.startVersionPolling = startVersionPolling;
window.getCurrentPage = getCurrentPage;

// boot
bootRouter();
checkLogin();
startVersionPolling();
setInterval(()=>syncData(true), 30000);

/* ORDER MANAGEMENT V1 - isolated addon for existing Blogger route #/compose.
   Stores no customer information in GitHub/localStorage. Firebase RTDB is the only record store.
   Fail-closed security probe: will not read/write orders while old root ".read": "auth != null" is active.
*/
(function(){
"use strict";
if(window.MKTOrderManagementV1)return;
var ROOT="order_management_v1/orders", AUDIT="order_management_v1/audit", TOMBSTONES="order_management_v1/deleted_orders";
var PAGE_SIZE=10;
var STATUS={pending:"Chờ đối soát",confirmed:"Đã xác nhận",delivered:"Đã giao",cancelled:"Đã hủy"};
var COMPANY={UNASSIGNED:"Chưa xác định",NNV:"Nông Nghiệp Việt",VN:"Việt Nhật",KF:"KingFarm",ABC:"ABC Việt Nam"};
function companyBySku(raw){
 var v=String(raw===null||raw===undefined?"":raw).trim().toUpperCase().replace(/[\s_-]/g,"");
 if(v.startsWith("ONNV")||v.startsWith("NNV"))return "NNV";
 if(v.startsWith("OVN")||v.startsWith("VN"))return "VN";
 if(v.startsWith("OKF")||v.startsWith("KF"))return "KF";
 if(v.startsWith("ABC"))return "ABC";
 return "UNASSIGNED";
}
function companyOfOrder(row){
 var derived=companyBySku(row&&row.sku),stored=String(row&&row.company||"");
 return derived!=="UNASSIGNED"?derived:(COMPANY[stored]?stored:"UNASSIGNED");
}
var state={loaded:false,loading:false,security:false,securityChecked:false,rows:[],hasMore:false,cursor:null,loadingMore:false,searchMode:"recent",searchRows:[],searchLoading:false,loadedForUid:"",tab:"entry",search:"",sku:"",province:"",statSku:"",statCompany:"",showUnknownCompany:false,draft:null,pasteText:"",manuallyEdited:{},editing:"",batch:null,importing:false,importReport:null,deleting:false,statsFrom:"",statsTo:"",statsLoading:false,statsError:"",statsCache:[],error:"",message:""};
function el(id){return document.getElementById(id);}
function str(v){return String(v===null||v===undefined?"":v).trim();}
function esc(s){return str(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function norm(v){return str(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function uniq(a){return Array.from(new Set(a.filter(Boolean)));}
function number(v){var s=str(v).replace(/[^\d]/g,"");return s?Number(s):0;}
function money(v){return Number(v||0).toLocaleString("vi-VN")+"đ";}
function auth(){return window.sysAuth&&window.sysAuth.currentUser;}
function db(){return window.sysDb;}
function viewable(){try{return !!(auth()&&!auth().isAnonymous&&window.MKTRBAC&&window.MKTRBAC.canAccess("compose"));}catch(e){return false;}}
function editable(){try{return !!(viewable()&&window.MKTRBAC.canEdit("compose"));}catch(e){return false;}}
function gateMessage(){return 'Bảo vệ dữ liệu khách hàng chưa được xác nhận. Hãy áp dụng Firebase Rules đi kèm trước khi mở kho đơn. Hệ thống hiện khóa đọc/ghi để tránh lộ thông tin.';}
function area(address){var a=str(address).split(",").map(function(x){return x.trim();}).filter(Boolean);var result={province:"",district:"",ward:"",hamlet:""};a.forEach(function(x){if(/^(tỉnh|thành phố)\s/i.test(x))result.province=x;else if(/^(huyện|quận|thị xã)\s/i.test(x))result.district=x;else if(/^(xã|phường|thị trấn)\s/i.test(x))result.ward=x;else if(/^(ấp|thôn|bản|khu phố|tổ dân phố)\s/i.test(x))result.hamlet=x;});return result;}

function vnParts(){var parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(new Date()),v={};parts.forEach(function(p){v[p.type]=p.value;});return {y:+v.year,m:+v.month,d:+v.day};}
function isoDate(y,m,d){return String(y).padStart(4,"0")+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");}
function todayVN(){var p=vnParts();return isoDate(p.y,p.m,p.d);}
function lastThirtyDaysVN(){var p=vnParts(),d=new Date(Date.UTC(p.y,p.m-1,p.d-29));return isoDate(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());}
function rangeMs(a,b){return {start:Date.parse(a+"T00:00:00+07:00"),end:Date.parse(b+"T23:59:59.999+07:00")};}
function validRange(a,b){var p=rangeMs(a,b);return /^\d{4}-\d{2}-\d{2}$/.test(a)&&/^\d{4}-\d{2}-\d{2}$/.test(b)&&Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.start<=p.end&&a<=todayVN()&&b<=todayVN();}
function formatTime(ms){if(!Number(ms))return "Chưa có";try{return new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(+ms));}catch(e){return "Chưa có";}}
function base(){return {customerName:"",phone:"",addressOld:"",addressNew:"",sku:"",productName:"",quantity:1,unit:"xô",price:0,company:"UNASSIGNED",status:"pending",proof:"",trackingCode:"",orderDateMs:0,note:"",source:"manual",sourceRef:""};}
function parse(text){
 var t=str(text).replace(/\r/g,""), r=base(),m;
 function field(pattern){var a=t.match(pattern);return a?str(a[1]):"";}
 r.customerName=field(/(?:^|\n)\s*(?:Khách hàng|Người nhận|Khách)\s*:\s*(.+)$/im);
 r.phone=field(/(?:^|\n)\s*(?:SĐT|Số điện thoại)\s*:\s*([0-9\s.+-]+)/im).replace(/\D/g,"");
 r.addressOld=field(/(?:^|\n)\s*(?:ĐC\s*CŨ|ĐỊA\s*CHỈ\s*CŨ|Địa chỉ|ĐC)\s*:[ \t]*([^\r\n]*)/im);
 r.addressNew=field(/(?:^|\n)\s*(?:ĐC\s*MỚI|ĐỊA\s*CHỈ\s*MỚI)\s*:[ \t]*([^\r\n]*)/im);
 r.trackingCode=field(/(?:^|\n)[ \t]*(?:Mã\s*vận\s*đơn|MVD|Tracking(?:\s*(?:code|number))?)[ \t]*:[ \t]*([A-Za-z0-9_-]{5,100})/im).toUpperCase();
 // Conservative fallback for raw four-line customer messages: only unambiguous candidates.
 var lines=t.split(/\n/).map(function(x){return str(x).replace(/^\*+|\*+$/g,"");}).filter(Boolean);
 if(!r.phone){var loosePhone=t.match(/(?:^|\D)(0\d{9}|84\d{9})(?!\d)/);if(loosePhone)r.phone=loosePhone[1];}
 if(!r.addressOld){
   var addrLines=lines.filter(function(x){return /(?:^|\s)(?:ấp|thôn|bản|xã|phường|thị trấn|huyện|quận|thành phố|tỉnh|đường|số nhà|ngõ|khu phố|ấp|xa|thon|huyen|tinh)(?:\s|$)/i.test(x)&&!/OVN\d+/i.test(x);});
   if(addrLines.length===1)r.addressOld=addrLines[0];
 }
 if(!r.customerName){
   var nameLines=lines.filter(function(x){
     return !/\d/.test(x)&&!/(?:OVN|BOSS|ĐẠM|PHÂN BÓN|MAX FRUIT|xô|can|chai|thùng|gói|bao|bịch|ĐC MỚI|ĐC CŨ|Địa chỉ)/i.test(x)
       &&!/(?:^|\s)(?:ấp|thôn|bản|xã|phường|thị trấn|huyện|quận|tỉnh|đường|khu phố|xa|thon|huyen|tinh)(?:\s|$)/i.test(x);
   });
   if(nameLines.length===1)r.customerName=nameLines[0];
 }
 // ĐC MỚI: preserve the explicit value supplied by the user. Empty field stays empty; no administrative guesswork.
 m=t.match(/(?:^|\n)\s*(\d{1,4})\s+(xô|can|chai|thùng|gói|bao|bịch)\s+([^\r\n]+)/i);
 if(m){
   r.quantity=Number(m[1]);r.unit=m[2].toLowerCase();
   var detail=str(m[3]),sku=detail.match(/(?:^|[\s(])((?:ONNV|OVN|OKF|NNV|ABC|VN|KF)[A-Za-z0-9_-]{1,48})(?=$|[\s)])/i);
   r.sku=sku?sku[1].replace(/[\s_-]/g,"").toUpperCase():"";
   r.productName=str((sku?detail.replace(sku[1],""):detail).replace(/\s*[-–—]\s*$/,"").replace(/^\s*[-–—]\s*/,""));
   if(!r.productName)r.productName="Chưa xác định";
 }else{r.quantity=0;}
 var p=t.match(/(\d{1,3}(?:[.,]\d{3})+)\s*đ/i);if(p)r.price=number(p[1]);
 // Keep the parsed company in sync with SKU immediately, not only upon Firebase save.
 r.company=companyBySku(r.sku);
 return clean(r);
}
function clean(d){
 var r=base();Object.keys(r).forEach(function(k){if(d&&d[k]!==undefined&&d[k]!==null)r[k]=d[k];});
 r.customerName=str(r.customerName).slice(0,150);
 r.phone=str(r.phone).replace(/\D/g,"");
 r.addressOld=str(r.addressOld).slice(0,800);
 r.addressNew=str(r.addressNew).slice(0,800);
 r.sku=str(r.sku).toUpperCase().replace(/\s/g,"").slice(0,50);
 r.productName=str(r.productName).slice(0,250);
 r.quantity=Math.floor(Number(r.quantity)||0);r.unit=str(r.unit).slice(0,32);
 r.price=Math.floor(Number(r.price)||0);
 r.company=companyOfOrder(r);
 r.status=STATUS[str(r.status)]?str(r.status):"pending";
 r.proof=str(r.proof).slice(0,500);r.trackingCode=str(r.trackingCode).replace(/\s+/g,"").toUpperCase().slice(0,100);r.note=str(r.note).slice(0,1500);
 r.source=str(r.source).slice(0,80);r.sourceRef=str(r.sourceRef).slice(0,150);
 r.orderDateMs=Number(r.orderDateMs)||0;
 var a=area(r.addressOld);r.province=a.province;r.district=a.district;r.ward=a.ward;r.hamlet=a.hamlet;
 return r;
}
function invalid(r){
 if(!r.customerName)return "Chưa có tên người nhận.";
 if(!/^(?:0\d{9}|84\d{9})$/.test(r.phone))return "Số điện thoại không hợp lệ (cần kiểm tra 10 số).";
 if(!r.addressOld)return "Địa chỉ cũ còn trống.";
 if(!r.productName||r.productName==="Chưa xác định")return "Chưa xác định sản phẩm.";
 if(!r.quantity||r.quantity<1||r.quantity>9999)return "Số lượng sản phẩm chưa hợp lệ.";
 if(r.price<0||r.price>1000000000)return "Đơn giá không hợp lệ.";
 if(r.trackingCode&&!/^[A-Z0-9_-]{5,100}$/.test(r.trackingCode))return "Mã vận đơn chỉ được chứa chữ, số, dấu gạch ngang hoặc gạch dưới (5–100 ký tự).";
 if((r.status==="confirmed"||r.status==="delivered")&&!r.proof)return "Trạng thái đã xác nhận/đã giao cần mã vận đơn, chứng từ hoặc bằng chứng đối soát.";
 return "";
}
function secure(){
 if(state.securityChecked)return Promise.resolve(state.security);
 if(!db()||!auth())return Promise.reject(new Error("Firebase Authentication chưa sẵn sàng."));
 return db().ref("order_management_v1/__security_probe_deny__").once("value").then(function(){
   state.securityChecked=true;state.security=false;return false;
 }).catch(function(e){
   if(e&&(e.code==="PERMISSION_DENIED"||/permission_denied|permission denied/i.test(str(e.message)))){
     state.securityChecked=true;state.security=true;return true;
   }
   throw e;
 });
}
function alertBox(t,kind){return '<div class="om-notice '+(kind||"")+'">'+esc(t)+'</div>';}
function style(){
 if(el("om-style-v1"))return;var s=document.createElement("style");s.id="om-style-v1";
 s.textContent=[
 "#page-compose .om-shell{font-family:Tahoma,Arial,sans-serif;color:#172033;max-width:100%;min-width:0}",
 "#page-compose .om-hero{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:22px;background:linear-gradient(115deg,#eef6ff,#fff);border:1px solid #dbeafe;border-radius:22px;margin-bottom:14px}",
 "#page-compose .om-hero h2{margin:5px 0;font-size:25px;letter-spacing:-.4px}#page-compose .om-hero p{margin:0;color:#64748b;font-size:13px}",
 "#page-compose .om-tag{color:#1d4ed8;font-size:10px;font-weight:900;letter-spacing:1px}",
 "#page-compose .om-tabs{display:flex;gap:8px;overflow:auto;padding:4px 0 14px;scrollbar-width:thin}",
 "#page-compose .om-tab{font-size:12px;flex-shrink:0;padding:12px 14px;border:1px solid #dbe3f0;border-radius:12px;background:#fff;color:#475569;cursor:pointer;font-weight:800;width:auto}",
 "#page-compose .om-tab.active{background:#2563eb;color:#fff;border-color:#2563eb}",
 "#page-compose .om-panel{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:18px;min-width:0}",
 "#page-compose .om-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 14px}",
 "#page-compose .om-kpi{background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:14px}",
 "#page-compose .om-kpi small{display:block;color:#64748b;font-size:11px}#page-compose .om-kpi b{display:block;font-size:23px;margin-top:5px}",
 "#page-compose .om-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:14px}",
 "#page-compose .om-btn{width:auto;max-width:100%;border:1px solid #dbe3f0;border-radius:10px;padding:10px 13px;font-size:12px;font-weight:800;cursor:pointer;background:#fff;color:#1e40af}",
 "#page-compose .om-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}#page-compose .om-btn.danger{color:#b91c1c}",
 "#page-compose .om-btn:disabled{opacity:.5;cursor:not-allowed}",
 "#page-compose .om-input,#page-compose .om-select,#page-compose .om-textarea{display:block;width:100%!important;min-height:39px;padding:10px 11px!important;background:#fff!important;border:1px solid #cbd5e1!important;border-radius:10px!important;color:#172033!important;outline:none!important;font-size:12px!important}",
 "#page-compose .om-textarea{height:125px!important;resize:vertical!important;line-height:1.6!important}",
 "#page-compose .om-field label{font-size:11px;color:#475569;display:block;font-weight:800;margin-bottom:5px}#page-compose .om-field{min-width:0}",
 "#page-compose .om-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}",
 "#page-compose .om-wide{grid-column:1 / -1}#page-compose .om-duo{display:grid;grid-template-columns:1fr 1fr;gap:16px}",
 "#page-compose .om-table-wrap{width:100%;overflow:auto;max-height:600px;border:1px solid #e2e8f0;border-radius:14px}",
 "#page-compose table.om-table{min-width:840px!important;width:100%;border-collapse:collapse!important}#page-compose .om-table th{font-size:10px;padding:11px!important;background:#f8fafc}#page-compose .om-table td{font-size:12px;padding:12px!important}",
 "#page-compose .om-subtle{font-size:11px;color:#64748b;line-height:1.65}#page-compose .om-notice{padding:12px 14px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;line-height:1.6;margin:9px 0}",
 "#page-compose .om-notice.danger{background:#fef2f2;border-color:#fecaca;color:#991b1b}",
 "#page-compose .om-pill{display:inline-block;padding:4px 7px;border-radius:7px;background:#f1f5f9;font-size:10px}",
 "#page-compose .om-bar{height:11px;border-radius:8px;background:#e2e8f0;overflow:hidden;flex:1}#page-compose .om-bar i{display:block;height:100%;background:#2563eb}",
 "#page-compose .om-statline{display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid #e2e8f0;font-size:12px}",
 "#page-compose .om-statline strong{flex:0 0 190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
 "#page-compose .om-statline small{flex:0 0 55px;text-align:right;color:#334155}",
 "#page-compose .om-modal{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}",
 "#page-compose .om-modal-card{max-width:670px;width:100%;max-height:90vh;overflow:auto;background:#fff;padding:22px;border-radius:20px;box-shadow:0 24px 65px #0f172a55}",
 "#page-compose .om-table th:last-child,#page-compose .om-table td:last-child{text-align:right!important;position:sticky;right:0;min-width:125px;width:125px;white-space:nowrap;padding-right:6px!important;box-shadow:-8px 0 14px -14px #0f172a66}",
 "#page-compose .om-table td:last-child{background:#fff!important;z-index:2}#page-compose .om-table th:last-child{background:#f8fafc!important;z-index:11}",
 "#page-compose .om-table td:last-child .om-btn{padding:9px 10px!important}",
 "#page-compose .om-unknown-link{display:inline;border:none;background:transparent;padding:0;color:#1d4ed8;font-weight:850;cursor:pointer;text-decoration:underline;font-size:12px;white-space:nowrap;text-align:left}",
 "#page-compose .om-unknown-note{background:#fff7ed;border:1px solid #fed7aa;border-radius:13px;padding:12px 14px;margin:12px 0;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}",
 "#page-compose .om-legacy{border:1px solid #f2d5cd;border-radius:17px;padding:14px;background:#fff}",
 "@media(max-width:970px){#page-compose .om-form{grid-template-columns:1fr 1fr}#page-compose .om-duo{grid-template-columns:1fr}#page-compose .om-kpis{grid-template-columns:1fr 1fr}}",
 "@media(max-width:580px){#page-compose .om-hero{padding:16px;display:block}#page-compose .om-hero h2{font-size:21px}#page-compose .om-form{grid-template-columns:1fr}#page-compose .om-kpis{grid-template-columns:1fr 1fr}#page-compose .om-panel{padding:12px}#page-compose .om-statline strong{flex-basis:120px}}"
 ].join("\n");document.head.appendChild(s);
}
function root(){return el("order-management-container");}
function mount(){
 var host=root();if(!host)return;style();
 if(!el("om-app-v1"))host.innerHTML='<section id="om-app-v1" class="om-shell"><div class="om-hero"><div><span class="om-tag">MARKETING SYSTEM / ORDER HUB</span><h2>Quản lý đơn hàng</h2><p>Lưu trữ • Khách hàng • Thị trường tiêu thụ • Soạn đơn PDF</p></div><button class="om-btn" data-om-action="reload">↻ Làm mới</button></div><div class="om-tabs" id="om-tabs"></div><div id="om-body" class="om-panel"></div></section>';
 var app=el("om-app-v1");if(!app.dataset.events){
 app.dataset.events="yes";
 app.addEventListener("click",click);
 app.addEventListener("change",change);
 app.addEventListener("input",input);
 }
 render();
}
function render(){
 if(!el("om-app-v1"))return;
 var oldList=el("om-app-v1").querySelector(".om-table-wrap"),oldScroll=oldList?oldList.scrollTop:0;
 var tabs=[["entry","Nhập đơn"],["orders","Danh sách đơn"],["customers","Khách hàng"],["stats","Thống kê khu vực"],["pdf","Soạn đơn từ PDF"]];
 el("om-tabs").innerHTML=tabs.map(function(t){return '<button type="button" data-om-tab="'+t[0]+'" class="om-tab '+(state.tab===t[0]?"active":"")+'">'+t[1]+'</button>';}).join("");
 var out=el("om-body");var legacyWrapper=el("om-legacy-wrapper");if(legacyWrapper)legacyWrapper.style.display=state.tab==="pdf"?"block":"none";if(state.tab==="pdf"){out.innerHTML=alertBox("Công cụ soạn đơn từ bill PDF cũ được giữ nguyên, không thay đổi cách xử lý.");return;}
 if(!viewable()){out.innerHTML=alertBox("Tài khoản chưa có quyền truy cập Quản lý đơn hàng.","danger");return;}
 if(!state.securityChecked){out.innerHTML=alertBox("Đang kiểm tra bảo mật dữ liệu khách hàng…");return;}
 if(!state.security){out.innerHTML=alertBox(gateMessage(),"danger");return;}
 if(state.loading&&!state.loaded){out.innerHTML=alertBox("Đang đọc danh sách đơn hàng từ Firebase…");return;}
 if(state.error)out.innerHTML=alertBox(state.error,"danger");
 else out.innerHTML=state.message?alertBox(state.message):"";
 if(state.tab==="orders")out.innerHTML+=renderOrders();
 if(state.tab==="entry")out.innerHTML+=renderEntry();
 if(state.tab==="customers")out.innerHTML+=renderCustomers();
 if(state.tab==="stats")out.innerHTML+=renderStats();
 var newList=el("om-app-v1").querySelector(".om-table-wrap");if(newList&&oldScroll>0)newList.scrollTop=oldScroll;
}
function kpis(){
 var a=state.rows.filter(function(r){return r.status!=="cancelled";});
 return '<div class="om-kpis"><div class="om-kpi"><small>Đơn đã tải trong phiên</small><b>'+a.length+'</b></div><div class="om-kpi"><small>Sản phẩm (đơn vị)</small><b>'+a.reduce(function(s,r){return s+Number(r.quantity||0);},0)+'</b></div><div class="om-kpi"><small>Khách hàng (theo SĐT)</small><b>'+uniq(a.map(function(r){return r.phone;})).length+'</b></div><div class="om-kpi"><small>Khu vực tỉnh/thành</small><b>'+uniq(a.map(function(r){return r.province;})).length+'</b></div></div>';
}
function options(a,current,placeholder){return '<option value="">'+esc(placeholder||"Tất cả")+'</option>'+a.map(function(x){return '<option value="'+esc(x)+'" '+(current===x?"selected":"")+'>'+esc(x)+'</option>';}).join("");}
function filtered(){
 return (state.searchMode==="recent"?state.rows:state.searchRows).filter(function(r){
  if(state.sku&&r.sku!==state.sku)return false;
  if(state.province&&r.province!==state.province)return false;
  if(state.search&&!norm([r.customerName,r.phone,r.addressOld,r.sku,r.productName,r.company].join(" ")).includes(norm(state.search)))return false;
  return true;
 });
}
function renderOrders(){
 var rows=filtered();
 return kpis()+'<div class="om-actions">'+
 '<button class="om-btn primary" data-om-action="new">+ Thêm đơn</button>'+
 '<button class="om-btn" data-om-action="searchRemote">Tìm toàn kho bằng SĐT/mã đơn</button>'+
 '<button class="om-btn" data-om-action="resetSearch">Về 10 đơn gần nhất</button>'+
 '<button class="om-btn" data-om-action="export" '+(!editable()?'disabled':'')+'>Xuất CSV</button>'+
 '<input id="om-search" class="om-input" aria-label="Tìm kiếm đơn" style="max-width:310px" placeholder="Tên, SĐT, SKU, địa chỉ..." value="'+esc(state.search)+'"/>'+
 '<select id="om-sku-filter" class="om-select" style="max-width:180px">'+options(uniq(state.rows.map(function(r){return r.sku;})).sort(),state.sku,"Mã SP")+'</select>'+
 '<select id="om-province-filter" class="om-select" style="max-width:250px">'+options(uniq(state.rows.map(function(r){return r.province;})).sort(),state.province,"Khu vực")+'</select></div>'+
 '<div class="om-subtle" style="margin-bottom:9px">Hiển thị '+rows.length+'/'+(state.searchMode==="recent"?state.rows.length:state.searchRows.length)+' đơn đã tải. CHỈ bấm Xem thêm mới tải 10 đơn tiếp theo; cuộn trang không tự tải. Thời gian là lúc ghi nhận trên hệ thống, không mặc nhiên là ngày mua.</div>'+
 '<div class="om-table-wrap"><table class="om-table"><thead><tr><th>Khách hàng</th><th>Điện thoại</th><th>Sản phẩm</th><th>SL</th><th>Tỉnh / Thành phố</th><th>Trạng thái</th><th>Thời gian ghi nhận</th><th>Thao tác</th></tr></thead><tbody>'+
 (rows.length?rows.map(function(r){return '<tr><td><b>'+esc(r.customerName)+'</b><br><span class="om-subtle">'+esc(COMPANY[r.company]||"")+'</span></td><td>'+esc(r.phone)+'</td><td>'+esc(r.productName)+'<br><span class="om-pill">'+esc(r.sku)+'</span></td><td>'+Number(r.quantity||0)+' '+esc(r.unit)+'</td><td>'+esc(r.province||"Chưa xác định")+'</td><td><span class="om-pill">'+esc(STATUS[r.status]||r.status)+'</span></td><td style="white-space:nowrap">'+esc(formatTime(r.createdAtMs))+'</td><td><div style="display:flex;justify-content:flex-end;gap:5px;white-space:nowrap"><button class="om-btn" data-om-action="view" data-om-id="'+esc(r.id)+'">Xem</button><button class="om-btn danger" data-om-action="deleteOrder" data-om-id="'+esc(r.id)+'" '+(!editable()||state.deleting||state.importing?"disabled":"")+'>Xóa</button></div></td></tr>';}).join(""):'<tr><td colspan="8">Không có đơn hàng phù hợp.</td></tr>')+
 '</tbody></table></div>'+
 (state.searchMode==="recent"&&state.hasMore?'<div style="text-align:center;margin-top:15px"><button class="om-btn primary" data-om-action="loadMore" '+(state.loadingMore?'disabled':'')+'>'+(state.loadingMore?'Đang tải…':'Xem thêm 10 đơn cũ hơn')+'</button></div>':'');
}
function field(k,label,value,type,opts){return '<div class="om-field '+(opts&&opts.wide?"om-wide":"")+'"><label for="om-f-'+k+'">'+label+'</label>'+(type==="textarea"?'<textarea id="om-f-'+k+'" class="om-textarea">'+esc(value)+'</textarea>':type==="select"?'<select id="om-f-'+k+'" class="om-select">'+opts.options.map(function(o){return '<option value="'+esc(o[0])+'" '+(String(o[0])===String(value)?"selected":"")+'>'+esc(o[1])+'</option>';}).join("")+'</select>':'<input id="om-f-'+k+'" class="om-input" type="'+(type||"text")+'" value="'+esc(value)+'"/>')+'</div>';}
function renderEntry(){
 var r=state.draft||base();
 var toolbar='<div class="om-actions"><button class="om-btn" data-om-action="new">+ Đơn mới</button><button class="om-btn" data-om-action="toOrders">← Danh sách</button></div>';
 var paste='<div class="om-field"><label>Dán / nhập đơn hàng — tự nhận diện</label><textarea id="om-paste" class="om-textarea" style="height:220px!important" placeholder="Khách hàng: ...&#10;SĐT: ...&#10;ĐC CŨ: ...&#10;ĐC MỚI: ...&#10;2 xô BOSS 1 - OVN150&#10;Mã vận đơn: KMS..." >'+esc(state.pasteText)+'</textarea><div class="om-subtle" id="om-paste-status">Nhập hoặc dán nội dung; khung bên phải tự cập nhật ngay, không cần bấm nút. Không tự lưu lên Firebase.</div><div class="om-subtle" style="margin-top:5px">Địa chỉ mới chỉ điền theo nội dung được cung cấp. Sau khi tự nhận diện, có thể chỉnh sửa các ô bên phải; hệ thống sẽ giữ phần anh đã sửa tay.</div></div>';
 var f='<div class="om-form">'+
 field("customerName","Khách hàng",r.customerName)+field("phone","Số điện thoại",r.phone)+field("company","Công ty (tự xác định từ mã SP)",r.company,"select",{options:Object.keys(COMPANY).map(function(k){return[k,COMPANY[k]];})})+
 field("addressOld","Địa chỉ cũ",r.addressOld,"textarea",{wide:true})+field("addressNew","Địa chỉ mới (nếu đã xác minh)",r.addressNew,"textarea",{wide:true})+
 field("productName","Sản phẩm",r.productName)+field("sku","Mã SKU",r.sku)+field("quantity","Số lượng",r.quantity,"number")+
 field("unit","Đơn vị",r.unit,"select",{options:["xô","can","chai","thùng","gói","bao","bịch"].map(function(x){return[x,x];})})+
 field("price","Đơn giá (để trống nếu chưa biết)",r.price||"","number")+
 field("status","Trạng thái",r.status,"select",{options:Object.keys(STATUS).map(function(x){return[x,STATUS[x]];})})+
 field("trackingCode","Mã vận đơn (để gửi tin Messenger)",r.trackingCode,"text",{wide:true})+field("proof","Bằng chứng đối soát / chứng từ",r.proof,"text",{wide:true})+
 field("note","Ghi chú",r.note,"textarea",{wide:true})+'</div>'+
 '<div class="om-actions" style="margin-top:14px"><button class="om-btn primary" data-om-action="save" '+(!editable()?"disabled":"")+'>'+(state.editing?"Lưu cập nhật":"Lưu đơn mới")+'</button><button class="om-btn" data-om-action="preview">Xem mẫu đơn</button></div>';
 var batchErrors=state.batch?state.batch.filter(function(r){return !r.sourceRef||r.quantity===undefined||!!invalid(clean(r));}).length:0;
 var batch='<div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px"><b>Nhập nhiều đơn lịch sử</b><p class="om-subtle">Chọn tệp JSON có danh sách đơn; kiểm tra số lượng và lỗi trước khi xác nhận. Dùng sourceRef cố định để chống nhập trùng. Có thể chọn lại file đầy đủ để tiếp tục các đơn chưa lưu mà không ghi đè những đơn trước.</p><input id="om-bulk-file" type="file" accept=".json,application/json" class="om-input"/><div id="om-bulk-preview">'+
 (state.batch?alertBox("Xem trước: "+state.batch.length+" dòng; "+batchErrors+" dòng thiếu/trái định dạng. Mã nguồn đã nhập sẽ được bỏ qua.")+'<button class="om-btn primary" data-om-action="batchSave" ' +(!editable()||state.importing?"disabled":"")+'>Xác nhận nhập '+state.batch.length+' đơn</button>':"")+'</div></div>';
 var imp=state.importing?alertBox("Đang tiếp tục đối chiếu và lưu dữ liệu. Không đóng trang. "+str(state.message)):"";
 if(state.importReport){imp+=alertBox(state.importReport.summary,(state.importReport.missing||state.importReport.errors.length)?"danger":"");imp+='<button type="button" class="om-btn" data-om-action="downloadImportReport">Tải báo cáo nhập đơn (.txt)</button>';if(state.importReport.errors.length)imp+='<div class="om-subtle">Lỗi/khác biệt: '+state.importReport.errors.slice(0,8).map(function(x){return esc(x.sourceRef)+": "+esc(x.reason);}).join("; ")+(state.importReport.errors.length>8?" ...":"")+'</div>';}
 var messengerNote='<div class="om-notice" style="margin-top:12px">Messenger: chưa liên kết cuộc trò chuyện khách hàng (PSID/Page). Hiện tại chỉ hỗ trợ sao chép tin vận đơn sau khi lưu, <b>chưa tự gửi Messenger</b>. Không thể gửi chỉ dựa vào số điện thoại.</div>';
 return toolbar+'<div class="om-duo"><div>'+paste+batch+imp+'</div><div><b>'+(state.editing?"Chỉnh sửa đơn đã có":"Thông tin đơn hàng")+'</b><p class="om-subtle">Thông tin nhận diện được điền tự động, anh cần kiểm tra trước khi lưu. Mã vận đơn phải là mã thật do đơn vị vận chuyển cung cấp.</p>'+f+messengerNote+'</div></div>';
}
function renderCustomers(){
 var map={},seen={};
 state.rows.concat(state.searchRows).concat(state.statsCache.reduce(function(out,c){return out.concat(c.rows);},[])).forEach(function(r){if(!r.phone||seen[r.id])return;seen[r.id]=true;(map[r.phone]=map[r.phone]||[]).push(r);});
 var rows=Object.keys(map).map(function(phone){
  var a=map[phone].slice().sort(sortNewest),names=uniq(a.map(function(x){return str(x.customerName);}));
  return {phone:phone,name:a[0].customerName||names[0]||"Chưa rõ",otherNames:names.filter(function(n){return n!==a[0].customerName;}),count:a.length,qty:a.reduce(function(sum,r){return sum+Number(r.quantity||0);},0),last:a[0].province};
 }).sort(function(a,b){return b.count-a.count;});
 return alertBox("Một SĐT đại diện một khách hàng. Các đơn vẫn riêng biệt. Dùng chung danh sách, dữ liệu tra cứu và các kỳ thống kê đã tải trong phiên; ngoài các khoảng đã tải có thể còn đơn khác.")+
 '<div class="om-table-wrap"><table class="om-table"><thead><tr><th>Khách hàng</th><th>Điện thoại</th><th>Đơn đã tải</th><th>Số lượng</th><th>Địa phương</th><th>Tra cứu</th></tr></thead><tbody>'+
 rows.map(function(r){return '<tr><td>'+esc(r.name)+(r.otherNames.length?'<small class="om-subtle" style="display:block">Tên từng ghi: '+esc(r.otherNames.join(", "))+'</small>':'')+'</td><td>'+esc(r.phone)+'</td><td>'+r.count+'</td><td>'+r.qty+'</td><td>'+esc(r.last)+'</td><td><div style="display:flex;justify-content:flex-end;gap:5px;white-space:nowrap"><button class="om-btn" data-om-action="findPhone" data-om-phone="'+esc(r.phone)+'">Xem đơn</button><button class="om-btn danger" data-om-action="deleteCustomer" data-om-phone="'+esc(r.phone)+'" '+(!editable()||state.deleting||state.importing?"disabled":"")+'>Xóa</button></div></td></tr>';}).join("")+'</tbody></table></div>';
}
function bars(rows,title,metric,clickUnknown){
 metric=metric==="orders"?"orders":"units";
 var ranked=rows.slice().sort(function(a,b){return Number(b[metric]||0)-Number(a[metric]||0);});
 var max=ranked.length?Number(ranked[0][metric])||1:1;
 return '<div><h3 style="font-size:15px">'+esc(title)+'</h3>'+(ranked.length?ranked.slice(0,20).map(function(r){
  var val=Number(r[metric])||0,w=Math.round(val/Math.max(1,max)*100);
  var name=(clickUnknown&&r.key==="Chưa xác định")
   ?'<button type="button" data-om-action="showUnknownCompany" class="om-unknown-link" title="Xem các đơn chưa rõ công ty để sửa">Chưa xác định ↗</button>'
   :esc(r.key);
  return '<div class="om-statline"><strong title="'+esc(r.key)+'">'+name+'</strong><div class="om-bar"><i style="width:'+w+'%"></i></div><small>'+val+'</small></div>';
 }).join(""):'<p class="om-subtle">Chưa đủ dữ liệu.</p>')+'</div>';
}
function group(rows,keyfn){var o={};rows.forEach(function(r){var k=keyfn(r)||"Chưa xác định";o[k]=o[k]||{key:k,units:0,orders:0};o[k].units+=Number(r.quantity)||0;o[k].orders++;});return Object.keys(o).map(function(k){return o[k];}).sort(function(a,b){return b.units-a.units;});}
function cachedStats(from,to){
 var r=rangeMs(from,to),key=from+"|"+to;
 var exact=state.statsCache.find(function(x){return x.key===key;});if(exact)return {rows:exact.rows,source:"cached"};
 var wider=state.statsCache.find(function(x){return x.start<=r.start&&x.end>=r.end;});
 if(wider)return {rows:wider.rows.filter(function(x){return Number(x.createdAtMs)>=r.start&&Number(x.createdAtMs)<=r.end;}),source:"covered"};
 if(state.loaded&&!state.hasMore&&!state.loadingMore&&state.searchMode==="recent")
   return {rows:state.rows.filter(function(x){return Number(x.createdAtMs)>=r.start&&Number(x.createdAtMs)<=r.end;}),source:"loadedAll"};
 return null;
}
function alterStatsRow(row,deleted){
 state.statsCache.forEach(function(c){
  c.rows=c.rows.filter(function(r){return r.id!==row.id;});
  if(!deleted&&Number(row.createdAtMs)>=c.start&&Number(row.createdAtMs)<=c.end)c.rows.push(row);
 });
}
function resetStats(){state.statsCache=[];state.statsError="";}
async function ensureStats(force){
 if(state.statsLoading||!viewable())return;
 if(!state.statsFrom)state.statsFrom=lastThirtyDaysVN();
 if(!state.statsTo)state.statsTo=todayVN();
 var from=state.statsFrom,to=state.statsTo,period=rangeMs(from,to);
 if(!validRange(from,to)){state.statsError="Khoảng ngày không hợp lệ. Ngày kết thúc không được vượt hôm nay.";render();return;}
 if(!force&&cachedStats(from,to)){state.statsError="";render();return;}
 var uid=auth().uid;state.statsLoading=true;state.statsError="";render();
 try{
  // Rules V1.4 index createdAtMs. Full range only once; in-memory cache for subsequent filters.
  var snap=await db().ref(ROOT).orderByChild("createdAtMs").startAt(period.start).endAt(period.end).once("value");
  if(!auth()||auth().uid!==uid){resetPrivate();return;}
  state.statsCache=state.statsCache.filter(function(x){return x.key!==from+"|"+to;});
  state.statsCache.unshift({key:from+"|"+to,start:period.start,end:period.end,rows:snapshotRows(snap),at:Date.now()});
  state.statsCache=state.statsCache.slice(0,3);
  state.statsError="";
 }catch(e){state.statsError="Không tải đủ dữ liệu theo khoảng ngày: "+str(e&&e.message||e)+". Không dùng 10 đơn gần nhất thay thế thống kê toàn kỳ.";}
 finally{state.statsLoading=false;render();}
}
function renderStats(){
 if(!state.statsFrom)state.statsFrom=lastThirtyDaysVN();
 if(!state.statsTo)state.statsTo=todayVN();
 var from=state.statsFrom,to=state.statsTo;
 var maxFrom=(to&&to<todayVN()?to:todayVN());
 var header='<div class="om-actions" style="align-items:flex-end">'+
 '<div class="om-field"><label>Từ ngày</label><input id="om-stats-from" class="om-input" type="date" max="'+esc(maxFrom)+'" value="'+esc(from)+'"/></div>'+
 '<div class="om-field"><label>Đến ngày</label><input id="om-stats-to" class="om-input" type="date" max="'+esc(todayVN())+'" value="'+esc(to)+'"/></div>'+
 '<button class="om-btn primary" data-om-action="applyStats" '+(state.statsLoading?'disabled':'')+'>Áp dụng</button>'+
 '<button class="om-btn" data-om-action="refreshStats" '+(state.statsLoading?'disabled':'')+'>↻ Tải lại kỳ</button></div>';
 if(state.statsError)return header+alertBox(state.statsError,"danger");
 var cache=cachedStats(from,to);
 if(!cache)return header+alertBox(state.statsLoading?"Đang tổng hợp toàn bộ đơn trong khoảng ngày từ Firebase…":"Chưa có dữ liệu kỳ này. Bấm Áp dụng.");
 var rows=cache.rows.filter(function(r){return r.status!=="cancelled";});
 var unknownRows=rows.filter(function(r){return companyOfOrder(r)==="UNASSIGNED";});
 var companyRows=rows.filter(function(r){return !state.statCompany||companyOfOrder(r)===state.statCompany;});
 var choices=uniq(companyRows.map(function(r){return r.sku;})).sort();
 var selected=companyRows.filter(function(r){return !state.statSku||r.sku===state.statSku;});
 var kpi='<div class="om-kpis"><div class="om-kpi"><small>Đơn ghi nhận trong kỳ</small><b>'+selected.length+'</b></div><div class="om-kpi"><small>Quy cách sản phẩm</small><b>'+uniq(selected.map(function(r){return [r.sku,r.unit].join("|");})).length+'</b></div><div class="om-kpi"><small>Khách hàng theo SĐT</small><b>'+uniq(selected.map(function(r){return r.phone;})).length+'</b></div><div class="om-kpi"><small>Tỉnh/thành</small><b>'+uniq(selected.map(function(r){return r.province;})).length+'</b></div></div>';
 var unknownAlert=unknownRows.length?'<div class="om-unknown-note"><div><b>⚠ '+unknownRows.length+' đơn chưa xác định công ty</b><div class="om-subtle">Có thể mở từng đơn để kiểm tra và cập nhật mã sản phẩm.</div></div><button type="button" class="om-btn" data-om-action="showUnknownCompany">Xem đơn cần sửa →</button></div>':'';
 var showUnknown=(state.showUnknownCompany||state.statCompany==="UNASSIGNED");
 var unknownTable=showUnknown?('<section id="om-unknown-orders" style="margin:18px 0"><h3 style="font-size:15px">Đơn chưa xác định công ty ('+unknownRows.length+')</h3><p class="om-subtle">Hiển thị từ dữ liệu thống kê đã tải của khoảng ngày đang chọn. Bấm Sửa đơn để chuyển sang Nhập đơn; không tải Firebase thêm.</p><div class="om-table-wrap"><table class="om-table"><thead><tr><th>Thời gian ghi nhận</th><th>Khách hàng</th><th>Số điện thoại</th><th>Mã SP hiện tại</th><th>Sản phẩm</th><th>Thao tác</th></tr></thead><tbody>'+(unknownRows.length?unknownRows.map(function(r){return '<tr><td>'+esc(formatTime(r.createdAtMs))+'</td><td>'+esc(r.customerName)+'</td><td>'+esc(r.phone)+'</td><td>'+esc(r.sku||"Chưa có mã")+'</td><td>'+esc(r.productName)+'</td><td><button type="button" data-om-action="editFromStats" data-om-id="'+esc(r.id)+'" class="om-btn primary" '+(!editable()?"disabled":"")+'>Sửa đơn</button></td></tr>';}).join(""):'<tr><td colspan="6">Không có đơn chưa xác định trong khoảng thời gian này.</td></tr>')+'</tbody></table></div></section>'):'';
 return header+kpi+unknownAlert+'<div class="om-actions"><b style="font-size:12px">Công ty:</b><select id="om-stats-company" class="om-select" style="max-width:210px">'+
 options(["NNV","VN","KF","ABC","UNASSIGNED"],state.statCompany,"Tất cả công ty").replace(/>NNV</g,">Nông Nghiệp Việt<").replace(/>VN</g,">Việt Nhật<").replace(/>KF</g,">KingFarm<").replace(/>ABC</g,">ABC Việt Nam<").replace(/>UNASSIGNED</g,">Chưa xác định<")+
 '</select><b style="font-size:12px">Mã sản phẩm:</b><select id="om-stats-sku" class="om-select" style="max-width:250px">'+options(choices,state.statSku,"Mã SP")+'</select><span class="om-subtle">Đã tính '+selected.length+' đơn</span></div>'+
 alertBox("Thống kê TOÀN KỲ "+from+" đến "+to+" theo THỜI GIAN GHI NHẬN (không mặc nhiên là ngày mua). Đơn lịch sử được tính theo ngày nhập hệ thống. "+(cache.source!=="cached"?"Dữ liệu sử dụng lại từ một kỳ đầy đủ đã tải.":"Dữ liệu kỳ đã được lưu trong phiên."))+
 '<div class="om-duo">'+ bars(group(selected,function(r){return COMPANY[companyOfOrder(r)]||"Chưa xác định";}),"Số đơn theo công ty","orders",true)+bars(group(selected,function(r){return r.province;}),"Số đơn theo tỉnh / thành","orders")+'</div><div class="om-duo" style="margin-top:20px">'+bars(group(selected,function(r){return [r.sku||r.productName,r.unit].filter(Boolean).join(" / ");}),"Số lượng theo mã SP / đơn vị","units")+bars(group(selected,function(r){return [r.district,r.province].filter(Boolean).join(", ");}),"Số đơn theo huyện / quận","orders")+'</div>'+unknownTable;
}
/* Live paste parser: only updates untouched form fields, never saves to Firebase. */
function syncPasteToForm(raw){
 state.pasteText=String(raw===null||raw===undefined?"":raw).slice(0,20000);
 var parsed=parse(state.pasteText),fields=["customerName","phone","addressOld","addressNew","productName","sku","quantity","unit","price","company","trackingCode"];
 if(!state.draft)state.draft=base();
 fields.forEach(function(k){
  if(state.manuallyEdited[k])return;
  if(state.editing&&!parsed[k]&&k!=="addressNew")return;
  var next=parsed[k];
  if(k==="addressNew"&&state.editing&&!/(?:^|\n)[ \t]*(?:ĐC\s*MỚI|ĐỊA\s*CHỈ\s*MỚI)\s*:/im.test(state.pasteText))return;
  state.draft[k]=next;
  var control=el("om-f-"+k);
  if(control&&String(control.value)!==String(next))control.value=String(next);
 });
 var box=el("om-paste-status");
 if(box){
  if(!state.pasteText.trim())box.textContent="Nhập hoặc dán nội dung; khung bên phải sẽ tự điền.";
  else{
   var found=["customerName","phone","addressOld","addressNew","sku"].filter(function(k){return !!parsed[k];}).length;
   box.textContent="Đã tự nhận diện "+found+"/5 trường chính"+(parsed.sku?" · "+parsed.sku+" → "+(COMPANY[parsed.company]||"Chưa xác định"):"")+" · Chưa lưu Firebase.";
  }
 }
 return parsed;
}
function makeTrackingMessage(row){
 var code=str(row&&row.trackingCode).toUpperCase(),name=str(row&&row.customerName),product=str(row&&row.productName);
 if(!code)return "";
 return "Dạ anh/chị "+(name||"")+", công ty gửi thông tin đơn hàng"+(product?" "+product:"")+".\nMã vận đơn: "+code+"\nAnh/chị vui lòng lưu lại mã để tra cứu với đơn vị vận chuyển. Cảm ơn anh/chị!";
}
function readForm(){
 var r=Object.assign({},state.draft||base());
 ["customerName","phone","addressOld","addressNew","productName","sku","quantity","unit","price","status","company","proof","trackingCode","note"].forEach(function(k){if(el("om-f-"+k))r[k]=el("om-f-"+k).value;});
 return clean(r);
}
function standard(r){return 'Khách hàng: '+r.customerName+'\nSĐT: '+r.phone+'\nĐC CŨ: '+r.addressOld+'\nĐC MỚI: '+(r.addressNew||"")+'\n'+r.quantity+' '+r.unit+' '+r.productName+(r.sku?' - '+r.sku:"");}
function modal(title,content){var a=document.createElement("div");a.className="om-modal";a.id="om-modal";a.innerHTML='<div class="om-modal-card"><div class="om-actions" style="justify-content:space-between"><b>'+esc(title)+'</b><button class="om-btn" data-om-action="closeModal">Đóng ×</button></div>'+content+'</div>';el("om-app-v1").appendChild(a);}
function findCachedOrderById(id){
 var rows=state.rows.concat(state.searchRows);
 for(var i=0;i<state.statsCache.length;i++)rows=rows.concat(state.statsCache[i].rows||[]);
 return rows.find(function(r){return r&&r.id===id;})||null;
}
function openOrderEditor(id){
 if(!editable()){notify("Bạn không có quyền chỉnh sửa đơn.",true);return;}
 var r=findCachedOrderById(id);
 if(!r){notify("Không tìm thấy đơn trong dữ liệu đã tải.",true);return;}
 var oldModal=el("om-modal");if(oldModal)oldModal.remove();
 state.draft=Object.assign({},r);state.editing=id;state.pasteText="";state.manuallyEdited={};state.tab="entry";
 state.message="Đang chỉnh sửa đơn "+id+". Kiểm tra mã SKU để hệ thống tự nhận diện đúng công ty.";
 state.error="";render();
}
function view(id){
 var r=state.rows.concat(state.searchRows).find(function(x){return x.id===id;});if(!r)return;
 modal("Chi tiết đơn hàng",'<pre style="white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.8;background:#f8fafc;padding:14px;border-radius:12px">'+esc(standard(r))+'</pre>'+
 '<p class="om-subtle">Ghi nhận: '+esc(formatTime(r.createdAtMs))+' · Cập nhật: '+esc(formatTime(r.updatedAtMs))+'<br>Trạng thái: '+esc(STATUS[r.status])+' · Công ty: '+esc(COMPANY[r.company])+' · Đơn giá: '+(r.price?money(r.price):"Chưa xác định")+' · Mã vận đơn: '+esc(r.trackingCode||"Chưa có")+' · Bằng chứng: '+esc(r.proof||"Chưa có")+'</p>'+
 '<div class="om-actions"><button class="om-btn" data-om-action="copy" data-om-id="'+esc(id)+'">Sao chép</button><button class="om-btn" data-om-action="copyTrackingMessage" data-om-id="'+esc(id)+'" '+(!r.trackingCode?'disabled title="Đơn chưa có mã vận đơn"':'')+'>Sao chép tin vận đơn</button><button class="om-btn primary" data-om-action="edit" data-om-id="'+esc(id)+'" '+(!editable()?"disabled":"")+'>Chỉnh sửa</button><button class="om-btn danger" data-om-action="deleteOrder" data-om-id="'+esc(id)+'" '+(!editable()||state.deleting?"disabled":"")+'>Xóa đơn</button></div>');
}
function getRecord(id,r){
 var now=Date.now(),d=clean(r);
 if(!Number(d.orderDateMs)&&d.source!=="chat_history_import")d.orderDateMs=Number(r.createdAtMs)||now;
 return Object.assign({},d,{v:1,id:id,createdAtMs:Number(r.createdAtMs)||now,updatedAtMs:now,createdByUid:str(r.createdByUid)||str(auth().uid),updatedByUid:str(auth().uid)});
}
function audit(action,r){
 var a=db().ref(AUDIT).push(),u=auth();
 return a.set({v:1,id:a.key,orderId:r.id,action:action,actorUid:u.uid,actorEmail:u.email||"",createdAtMs:Date.now()}).catch(function(e){state.message="Đã lưu đơn nhưng chưa ghi được nhật ký: "+e.message;});
}
function save(){
 if(state.deleting||state.importing)return notify("Đang xử lý dữ liệu. Hoàn tất thao tác trước khi lưu đơn khác.",true);
 if(!editable())return notify("Không có quyền sửa dữ liệu.",true);
 var r=readForm(),err=invalid(r);if(err)return notify(err,true);
 var id=state.editing||db().ref(ROOT).push().key;
 var old=findCachedOrderById(id);
 if(old){r.createdAtMs=old.createdAtMs;r.createdByUid=old.createdByUid;r.source=old.source;r.sourceRef=old.sourceRef;}
 var rec=getRecord(id,r);
 var possible=state.rows.some(function(x){return x.id!==id&&x.phone===rec.phone&&x.sku===rec.sku&&x.addressOld===rec.addressOld&&x.quantity===rec.quantity&&x.status!=="cancelled";});
 if(possible&&!window.confirm("Đã có đơn cùng SĐT, sản phẩm, địa chỉ và số lượng. Đây có phải một lần mua khác?"))return;
 notify("Đang lưu dữ liệu…");
 db().ref(ROOT+"/"+id).set(rec).then(function(){return audit(old?"update":"create",rec);}).then(function(){state.draft=null;state.editing="";state.pasteText="";state.manuallyEdited={};state.tab="orders";state.message="Đã lưu đơn vào Firebase; chưa gửi Messenger vì chưa liên kết khách với cuộc trò chuyện Facebook. Mã vận đơn (nếu có) có thể sao chép từ chi tiết đơn." ;var previous=state.rows.length;var wasInRecent=state.rows.some(function(x){return x.id===rec.id;});state.rows=state.rows.filter(function(x){return x.id!==rec.id;});if(!old||wasInRecent)state.rows.push(rec);state.rows.sort(sortNewest);state.rows=state.rows.slice(0,Math.max(PAGE_SIZE,previous));state.searchRows=state.searchRows.map(function(x){return x.id===rec.id?rec:x;});alterStatsRow(rec,false);updateCursor();render();return Promise.resolve();}).catch(function(e){notify("Firebase không cho phép lưu: "+e.message,true);});
}
function notify(t,err){state.message=err?"":t;state.error=err?t:"";render();}

function removeLocalOrders(ids){
 var deleted={};ids.forEach(function(id){deleted[id]=true;});
 state.rows=state.rows.filter(function(r){return !deleted[r.id];});
 state.searchRows=state.searchRows.filter(function(r){return !deleted[r.id];});
 state.statsCache.forEach(function(x){x.rows=x.rows.filter(function(r){return !deleted[r.id];});});
 // Keep pagination cursor as last *fetched* boundary, even if the last row was deleted.
 // Moving it forward could cause gaps or premature end-of-list during "Xem thêm".
 if(state.editing&&deleted[state.editing]){state.editing="";state.draft=null;}
 var modalNode=el("om-modal");if(modalNode)modalNode.remove();
}
function deletionPatch(row,action,uid){
 var id=str(row.id);
 var event=db().ref(AUDIT).push().key,now=Date.now(),patch={};
 if(!/^[^.#$\[\]\/]{1,200}$/.test(id))throw Error("Mã đơn không hợp lệ.");
 patch[ROOT+"/"+id]=null;
 patch[TOMBSTONES+"/"+id]={v:1,orderId:id,deletedAtMs:now,deletedByUid:uid,sourceRef:str(row.sourceRef)};
 patch[AUDIT+"/"+event]={v:1,id:event,orderId:id,action:action,actorUid:uid,actorEmail:str(auth()&&auth().email),createdAtMs:now};
 return patch;
}
async function deleteOrder(id){
 if(!editable()||state.deleting||state.importing)return notify("Bạn không có quyền xóa hoặc hệ thống đang xử lý thao tác khác.",true);
 var u=auth(),uid=u.uid;
 state.deleting=true;state.error="";
 try{
  var snap=await db().ref(ROOT+"/"+id).once("value");
  if(!auth()||auth().uid!==uid)throw Error("Phiên đăng nhập đã thay đổi.");
  if(!snap.exists()){removeLocalOrders([id]);state.message="Đơn này không còn trên Firebase.";return;}
  var row=Object.assign({},snap.val()||{},{id:id});
  if(!window.confirm("XÓA VĨNH VIỄN đơn của "+row.customerName+" ("+row.phone+")?\nMã đơn: "+id+"\nHành động không thể hoàn tác. Nhật ký xóa được lưu riêng."))return;
  await db().ref().update(deletionPatch(row,"delete",uid));
  if(!auth()||auth().uid!==uid){resetPrivate();return;}
  removeLocalOrders([id]);state.message="Đã xóa 1 đơn trên Firebase và ghi nhật ký xóa.";state.error="";
 }catch(e){state.error="Không xóa được đơn: "+str(e&&e.message||e)+". Kiểm tra Firebase Rules XÓA ĐƠN V1.4.";state.message="";}
 finally{state.deleting=false;render();}
}
async function deleteCustomer(phone){
 if(!editable()||state.deleting||state.importing)return notify("Bạn không có quyền xóa hoặc hệ thống đang xử lý thao tác khác.",true);
 phone=str(phone).replace(/\D/g,"");if(!/^(?:0\d{9}|84\d{9})$/.test(phone))return notify("Số điện thoại không hợp lệ.",true);
 var u=auth(),uid=u.uid;
 state.deleting=true;state.error="";state.message="Đang kiểm tra toàn bộ đơn theo số điện thoại từ Firebase…";render();
 var deleted=0,total=0;
 try{
  // Deliberately reads ALL matching orders, not only the ten cached rows.
  // This is a destructive action and requires a server-side count + explicit verification.
  var snap=await db().ref(ROOT).orderByChild("phone").equalTo(phone).once("value");
  if(!auth()||auth().uid!==uid)throw Error("Phiên đăng nhập đã thay đổi.");
  var rows=snapshotRows(snap).filter(function(r){return str(r.phone)===phone;});total=rows.length;
  if(!total){state.message="Không còn đơn nào thuộc số "+phone+" trong kho Quản lý đơn hàng.";return;}
  if(!window.confirm("XÓA KHÁCH HÀNG "+phone+"?\nThao tác sẽ xóa vĩnh viễn TOÀN BỘ "+total+" đơn của số điện thoại này trong Quản lý đơn hàng.\nKhông thể hoàn tác. Bấm OK để tiếp tục xác minh."))return;
  var typed=window.prompt("Để xác nhận xóa "+total+" đơn, nhập chính xác số điện thoại: "+phone,"");
  if(str(typed)!==phone){state.message="Đã hủy: số điện thoại xác nhận không khớp.";return;}
  for(var i=0;i<rows.length;i+=20){
   if(!auth()||auth().uid!==uid)throw Error("Phiên đăng nhập đã thay đổi, dừng để tránh sai quyền.");
   var batch=rows.slice(i,i+20),patch={};
   for(var j=0;j<batch.length;j++)Object.assign(patch,deletionPatch(batch[j],"delete_customer_order",uid));
   await db().ref().update(patch);
   deleted+=batch.length;removeLocalOrders(batch.map(function(x){return x.id;}));
   state.message="Đã xóa "+deleted+"/"+total+" đơn của khách "+phone+" và lưu nhật ký.";render();
  }
  state.message="Đã xóa khách hàng "+phone+" và toàn bộ "+deleted+" đơn liên quan (trong kho Quản lý đơn hàng).";state.error="";
 }catch(e){state.error="Xóa khách hàng chưa hoàn tất: đã xóa "+deleted+"/"+total+" đơn. "+str(e&&e.message||e)+"; kiểm tra quyền Firebase hoặc thử lại.";state.message="";}
 finally{state.deleting=false;render();}
}
function csv(){
 if(!editable())return notify("Không có quyền xuất thông tin khách hàng.",true);
 var cols=["id","customerName","phone","addressOld","addressNew","province","district","productName","sku","quantity","unit","price","company","status","proof","sourceRef"];
 var lines=[cols.join(",")].concat(filtered().map(function(r){return cols.map(function(k){var cell=str(r[k]);if(/^[=+@-]/.test(cell))cell="'"+cell;return '"'+cell.replace(/"/g,'""')+'"';}).join(",");}));
 var blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="quan-ly-don-hang-"+new Date().toISOString().slice(0,10)+".csv";a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function batchKey(o){return "hist_"+str(o.sourceRef).replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,90);}
function sameImportedRecord(a,r){return a&&str(a.sourceRef)===str(r.sourceRef)&&str(a.phone)===str(r.phone)&&str(a.sku)===str(r.sku)&&str(a.customerName)===str(r.customerName)&&Number(a.quantity)===Number(r.quantity);}
function importReportText(){
 var r=state.importReport;if(!r)return "Chưa có báo cáo nhập.";
 return "BÁO CÁO KIỂM TRA NHẬP ĐƠN - MARKETING SYSTEM\n"+
  "Thời điểm: "+new Date(r.at).toLocaleString("vi-VN")+"\n"+
  "Tổng dòng trong file: "+r.total+"\n"+
  "Đã tồn tại đúng dữ liệu: "+r.already+"\n"+
  "Ghi mới thành công lần này: "+r.written+"\n"+
  "Đã xác minh có mặt trên Firebase: "+r.verified+"\n"+
  "Đã xóa chủ động, không nhập lại: "+(r.skippedDeleted||0)+"\n"+
  "Còn thiếu hoặc khác biệt: "+r.missing+"\n"+
  "Dòng thiếu thông tin / bị từ chối / trùng nguồn khác thông tin: "+r.errors.length+"\n\n"+
  r.errors.map(function(x){return "- "+x.sourceRef+" | "+x.reason;}).join("\n")+
  "\n\nKhông tự kết luận các đơn này đã giao thành công hoặc phát sinh doanh thu.";
}
function downloadImportReport(){
 if(!state.importReport)return;
 var blob=new Blob(["\uFEFF"+importReportText()],{type:"text/plain;charset=utf-8"});
 var url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="BAO_CAO_KIEM_TRA_NHAP_DON_"+new Date().toISOString().slice(0,10)+".txt";a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function pauseImport(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
function retryableImportError(err){
 var v=str((err&&err.code)||"")+" "+str((err&&err.message)||"");
 return !/PERMISSION_DENIED|permission denied|permission_denied|validation|invalid data|auth\/|unauthorized/i.test(v);
}
async function batchSave(){
 if(!editable()||!state.batch||state.importing||state.deleting)return;
 var data=state.batch;
 if(!window.confirm("Đối chiếu "+data.length+" đơn với Firebase và chỉ nhập những đơn chưa có? Các đơn đã lưu sẽ không bị ghi đè."))return;
 state.importing=true;state.error="";state.importReport=null;
 var report={at:new Date().toISOString(),total:data.length,already:0,written:0,verified:0,skippedDeleted:0,missing:0,errors:[],summary:""};
 try{
  state.message="Đang kiểm tra các đơn đã có trên Firebase…";render();
  // One consistent read for all historical keys; prevents accidentally treating existing orders as missing.
  var snapshot=await db().ref(ROOT).orderByKey().startAt("hist_").endAt("hist_\uf8ff").once("value");
  var deletedSnap=await db().ref(TOMBSTONES).orderByKey().startAt("hist_").endAt("hist_\uf8ff").once("value");
  var deletedBefore=deletedSnap.val()||{},existing=snapshot.val()||{},want=[],seen={},raceDeleted={};
  for(var i=0;i<data.length;i++){
   var raw=data[i]||{},ref=str(raw.sourceRef),r=clean(raw);
   r.status="pending";r.proof="";r.source="chat_history_import";r.sourceRef=ref;
   var why=invalid(r);
   if(raw.quantity===undefined||raw.quantity===null)why="Thiếu số lượng.";
   if(!ref)why="Thiếu sourceRef.";
   var id=ref?batchKey(raw):"";
   if(id&&seen[id])why="Trùng sourceRef ngay trong file nhập.";
   if(why){report.errors.push({sourceRef:ref||"dòng_"+(i+1),reason:why});continue;}
   seen[id]=true;if(deletedBefore[id]){report.skippedDeleted++;continue;}
   want.push({id:id,sourceRef:ref,record:r});
  }
  var pending=[];
  for(var j=0;j<want.length;j++){
   var o=want[j],old=existing[o.id];
   if(!old)pending.push(o);
   else if(sameImportedRecord(old,o.record))report.already++;
   else report.errors.push({sourceRef:o.sourceRef,reason:"Mã nguồn đã tồn tại nhưng nội dung khác. Không ghi đè; cần kiểm tra thủ công."});
  }
  for(var x=0;x<pending.length;x++){
   var cur=pending[x],error=null,saved=false;
   for(var attempt=0;attempt<3;attempt++){
    try{
     var node=db().ref(ROOT+"/"+cur.id);
     var tomb=await db().ref(TOMBSTONES+"/"+cur.id).once("value");
     if(tomb.exists()){report.skippedDeleted++;raceDeleted[cur.id]=true;saved=true;error=null;break;}
     // Check again to avoid overwriting concurrent imports from another device.
     var current=await node.once("value");
     if(current.exists()){
       if(sameImportedRecord(current.val(),cur.record)){report.already++;saved=true;}
       else report.errors.push({sourceRef:cur.sourceRef,reason:"Đơn được nhập đồng thời trên thiết bị khác nhưng khác dữ liệu."});
       error=null;break;
     }
     await node.set(getRecord(cur.id,cur.record));
     report.written++;saved=true;error=null;break;
    }catch(e){
     error=e;
     if(!retryableImportError(e)||attempt===2)break;
     await pauseImport(400*(attempt+1));
    }
   }
   if(error&&!saved)report.errors.push({sourceRef:cur.sourceRef,reason:"Firebase: "+str(error.code||error.message||"Không xác định")});
   if(x%5===0||x===pending.length-1){
    state.message="Đã xử lý "+(x+1)+"/"+pending.length+" đơn chưa có • ghi mới "+report.written+" • lỗi "+report.errors.length;render();
   }
  }
  state.message="Đang đọc lại Firebase để xác nhận kết quả…";render();
  var verifiedSnap=await db().ref(ROOT).orderByKey().startAt("hist_").endAt("hist_\uf8ff").once("value");
  var store=verifiedSnap.val()||{};
  want.forEach(function(w){
   if(deletedBefore[w.id]||raceDeleted[w.id])return;
   if(store[w.id]&&sameImportedRecord(store[w.id],w.record))report.verified++;
   else if(!report.errors.some(function(e){return e.sourceRef===w.sourceRef;}))report.errors.push({sourceRef:w.sourceRef,reason:"Chưa được xác nhận có mặt trong Firebase sau khi nhập."});
  });
  report.missing=report.total-report.verified-report.skippedDeleted;
  report.summary="Đối chiếu "+report.total+" dòng: Firebase xác nhận "+report.verified+" đơn, trong đó "+report.written+" đơn mới ghi; bỏ qua "+report.skippedDeleted+" đơn đã xóa chủ động; còn "+report.missing+" dòng thiếu hoặc khác biệt.";
  state.importReport=report;state.message=report.summary;if(report.written>0)resetStats();
  // Keep the loaded file in memory until all sourceRef keys are verified; safe to press again.
  if(report.missing===0){state.batch=null;state.tab="orders";}
  else state.tab="entry";
  await load(true);
 }catch(e){
  report.summary="Chưa hoàn thành đối chiếu Firebase: "+str(e&&e.message||e)+". Không xóa file đã chọn; có thể chạy lại.";
  report.missing=report.total-report.verified-report.skippedDeleted;
  report.errors.push({sourceRef:"SYSTEM",reason:str(e&&e.code||e&&e.message||e)});
  state.importReport=report;state.error=report.summary;state.tab="entry";
 }finally{state.importing=false;render();}
}
function handleFile(file){
 if(!file)return;var rd=new FileReader();
 rd.onload=function(){try{var v=JSON.parse(String(rd.result||""));if(v&&Array.isArray(v.orders))v=v.orders;if(!Array.isArray(v)||v.length>2000)throw Error("Tệp phải là mảng JSON, tối đa 2.000 đơn.");state.batch=v;state.message="Đã đọc "+v.length+" đơn để xem trước. Chưa ghi vào Firebase.";state.error="";render();}catch(e){notify("Không đọc được JSON: "+e.message,true);}};
 rd.readAsText(file,"UTF-8");
}

function sortNewest(a,b){var n=(Number(b.createdAtMs)||0)-(Number(a.createdAtMs)||0);return n||str(b.id).localeCompare(str(a.id));}
function snapshotRows(snapshot){var o=snapshot&&snapshot.val?snapshot.val()||{}:{};return Object.keys(o).map(function(id){var r=Object.assign({},o[id]||{},{id:id});r.company=companyOfOrder(r);return r;}).sort(sortNewest);}
function updateCursor(){var r=state.rows[state.rows.length-1];state.cursor=r?{createdAtMs:Number(r.createdAtMs)||0,id:r.id}:null;}
function resetPrivate(){state.rows=[];state.searchRows=[];state.loaded=false;state.hasMore=false;state.cursor=null;state.searchMode="recent";state.search="";state.sku="";state.province="";state.statSku="";state.statCompany="";state.showUnknownCompany=false;state.draft=null;state.pasteText="";state.manuallyEdited={};state.editing="";state.batch=null;state.importReport=null;state.message="";state.error="";state.securityChecked=false;state.security=false;state.loadedForUid="";resetStats();state.statsFrom="";state.statsTo="";state.statsLoading=false;}
function load(force){
 if(state.loading)return Promise.resolve();
 var u=auth();
 if(!u||!viewable()){resetPrivate();render();return Promise.resolve();}
 if(state.loadedForUid&&state.loadedForUid!==u.uid)resetPrivate();
 if(state.loaded&&!force){render();return Promise.resolve();}
 state.loading=true;state.error="";
 return secure().then(function(ok){if(!ok)throw new Error(gateMessage());
   return db().ref(ROOT).orderByChild("createdAtMs").limitToLast(PAGE_SIZE).once("value"); // exactly 10 max
 }).then(function(snap){
   if(!auth()||auth().uid!==u.uid){resetPrivate();return;}
   state.rows=snapshotRows(snap).slice(0,PAGE_SIZE);
   state.hasMore=state.rows.length===PAGE_SIZE;
   updateCursor();state.loadedForUid=u.uid;state.loaded=true;state.loading=false;
   state.searchMode="recent";state.searchRows=[];state.search="";state.sku="";state.province="";
   state.error="";render();
 }).catch(function(e){state.loading=false;state.loaded=true;state.error=e.message||String(e);render();});
}
function loadMore(){
 if(state.loadingMore||!state.hasMore||!state.cursor||!viewable()||state.searchMode!=="recent")return Promise.resolve();
 var uid=auth().uid,cursor=state.cursor;
 var cachedPeriod=state.statsCache.find(function(c){return c.start<=cursor.createdAtMs&&c.end>=cursor.createdAtMs;});
 if(cachedPeriod){
  var cacheRows=cachedPeriod.rows.filter(function(r){
   return sortNewest(r,{createdAtMs:cursor.createdAtMs,id:cursor.id})>0 &&
    !state.rows.some(function(x){return x.id===r.id;});
  }).sort(sortNewest).slice(0,PAGE_SIZE);
  if(cacheRows.length===PAGE_SIZE){
   state.rows=state.rows.concat(cacheRows).sort(sortNewest);
   state.hasMore=true;updateCursor();state.error="";render();
   return Promise.resolve();
  }
  // The period is complete. All remaining rows within its dates are cached.
  // Only query entries older than the period's first millisecond.
  var remainder=PAGE_SIZE-cacheRows.length;
  state.loadingMore=true;state.error="";render();
  return db().ref(ROOT).orderByChild("createdAtMs").endAt(cachedPeriod.start-1).limitToLast(remainder+1).once("value").then(function(snap){
   if(!auth()||auth().uid!==uid){resetPrivate();return;}
   var old=snapshotRows(snap).filter(function(r){return !state.rows.some(function(x){return x.id===r.id;});});
   state.rows=state.rows.concat(cacheRows,old.slice(0,remainder)).sort(sortNewest);
   state.hasMore=old.length>remainder;updateCursor();
  }).catch(function(e){state.error="Lỗi tải tiếp phần cũ hơn kỳ đã thống kê: "+str(e&&e.message||e);})
   .finally(function(){state.loadingMore=false;render();});
 }
 state.loadingMore=true;state.error="";render();
 return db().ref(ROOT).orderByChild("createdAtMs").endAt(cursor.createdAtMs,cursor.id).limitToLast(PAGE_SIZE+1).once("value").then(function(snap){
   if(!auth()||auth().uid!==uid){resetPrivate();return;}
   var next=snapshotRows(snap).filter(function(r){return r.id!==cursor.id&&!state.rows.some(function(x){return x.id===r.id;});}).slice(0,PAGE_SIZE);
   state.rows=state.rows.concat(next).sort(sortNewest);
   state.hasMore=next.length===PAGE_SIZE;updateCursor();
 }).catch(function(e){state.error="Lỗi tải thêm: "+(e.message||e);}).finally(function(){state.loadingMore=false;render();});
}
function searchRemote(raw){
 if(state.searchLoading||!viewable())return Promise.resolve();
 var q=str(raw),phone=q.replace(/[\s.-]/g,""),isPhone=/^(?:0\d{9}|84\d{9})$/.test(phone);
 if(!isPhone&&!/^(?:hist_[A-Za-z0-9_-]{1,90}|[-A-Za-z0-9_]{15,80})$/.test(q)){state.error="Tìm toàn kho cần SĐT đủ 10 chữ số hoặc mã đơn chính xác. Tìm theo tên chỉ lọc trong các đơn đã tải.";render();return Promise.resolve();}
 var uid=auth().uid;state.searchLoading=true;state.error="";render();
 var request=isPhone?db().ref(ROOT).orderByChild("phone").equalTo(phone).limitToFirst(100).once("value"):db().ref(ROOT+"/"+q).once("value");
 return request.then(function(snap){
   if(!auth()||auth().uid!==uid){resetPrivate();return;}
   if(isPhone){state.searchRows=snapshotRows(snap);state.searchMode="phone";state.search=phone;}
   else{var rec=snap.val();state.searchRows=rec?[Object.assign({},rec,{id:q})]:[];state.searchMode="id";state.search=q;}
   state.sku="";state.province="";
   state.message=isPhone&&state.searchRows.length===100?"Tìm kiếm SĐT giới hạn 100 đơn.":"";
 }).catch(function(e){state.error="Không truy vấn được Firebase: "+(e.message||e);}).finally(function(){state.searchLoading=false;render();});
}
function click(e){
 var t=e.target.closest("[data-om-tab],[data-om-action]");if(!t)return;
 var tab=t.getAttribute("data-om-tab"),action=t.getAttribute("data-om-action");
 if(tab){
  state.tab=tab;state.message="";state.error="";render();if(tab==="stats")ensureStats(false);return;
 }
 if(!action)return;
 var id=t.getAttribute("data-om-id")||"";
 if(action==="reload"){state.securityChecked=false;state.loaded=false;load(true);}
 if(action==="loadMore")loadMore();
 if(action==="applyStats"){state.statsFrom=el("om-stats-from")?el("om-stats-from").value:state.statsFrom;state.statsTo=el("om-stats-to")?el("om-stats-to").value:state.statsTo;state.showUnknownCompany=false;ensureStats(false);}
  if(action==="refreshStats"){state.statsFrom=el("om-stats-from")?el("om-stats-from").value:state.statsFrom;state.statsTo=el("om-stats-to")?el("om-stats-to").value:state.statsTo;ensureStats(true);}
 if(action==="searchRemote")searchRemote(state.search);
 if(action==="resetSearch"){state.searchMode="recent";state.searchRows=[];state.search="";state.sku="";state.province="";render();}
 if(action==="toOrders"){state.tab="orders";render();}
 if(action==="new"){state.tab="entry";state.draft=base();state.pasteText="";state.manuallyEdited={};state.editing="";render();}
 // Textarea is parsed directly by the input event; no manual parse button.
 if(action==="save")save();
 if(action==="view")view(id);
 if(action==="deleteOrder")deleteOrder(id);
 if(action==="deleteCustomer")deleteCustomer(t.getAttribute("data-om-phone")||"");
 if(action==="edit"||action==="editFromStats")openOrderEditor(id);
 if(action==="showUnknownCompany"){state.showUnknownCompany=true;state.statCompany="";state.statSku="";render();var target=el("om-unknown-orders");if(target&&target.scrollIntoView)target.scrollIntoView({behavior:"smooth",block:"start"});}
 if(action==="preview"){var r=readForm();modal("Bản soạn đơn",'<pre style="white-space:pre-wrap;line-height:1.8;padding:14px;background:#f8fafc">'+esc(standard(r))+'</pre>');}
 if(action==="closeModal"){if(el("om-modal"))el("om-modal").remove();}
 if(action==="copy"){var r=findCachedOrderById(id);if(r&&navigator.clipboard)navigator.clipboard.writeText(standard(r)).then(function(){notify("Đã sao chép đơn.");});}
 if(action==="copyTrackingMessage"){var order=findCachedOrderById(id),body=makeTrackingMessage(order);if(!body)return notify("Đơn chưa có mã vận đơn.",true);if(!navigator.clipboard)return notify("Trình duyệt không hỗ trợ sao chép tự động.",true);navigator.clipboard.writeText(body).then(function(){notify("Đã sao chép tin vận đơn. Anh cần mở đúng cuộc trò chuyện và gửi thủ công.");}).catch(function(e){notify("Không sao chép được: "+e.message,true);});}
 if(action==="export")csv();
 if(action==="findPhone"){state.search=t.getAttribute("data-om-phone")||"";state.sku="";state.province="";state.tab="orders";searchRemote(state.search);}
 if(action==="batchSave")batchSave();
 if(action==="downloadImportReport")downloadImportReport();
}
function change(e){
 var t=e.target;if(t.id==="om-sku-filter"){state.sku=t.value;render();}
 if(t.id==="om-province-filter"){state.province=t.value;render();}
 if(t.id==="om-stats-sku"){state.statSku=t.value;render();}
 if(t.id==="om-stats-company"){state.statCompany=t.value;state.statSku="";if(t.value==="UNASSIGNED")state.showUnknownCompany=true;render();}
 if(t.id==="om-stats-to"){
  var today=todayVN(),newTo=str(t.value);
  if(newTo&&newTo>today)newTo=today;
  if(!newTo)return;
  state.statsTo=newTo;t.value=newTo;
  var startEl=el("om-stats-from");
  if(startEl){
    startEl.max=newTo;
    if(str(startEl.value)>newTo){startEl.value=newTo;state.statsFrom=newTo;}
    else state.statsFrom=str(startEl.value);
  }
 }
 if(t.id==="om-stats-from"){
  var endEl=el("om-stats-to"),upper=str(endEl&&endEl.value)||state.statsTo||todayVN();
  if(upper>todayVN())upper=todayVN();
  t.max=upper;
  if(t.value&&t.value>upper)t.value=upper;
  state.statsFrom=str(t.value);
 }
 if(t.id&&t.id.indexOf("om-f-")===0){var key=t.id.slice(5);state.manuallyEdited[key]=true;if(!state.draft)state.draft=base();state.draft[key]=t.value;}
 if(t.id==="om-bulk-file"&&t.files)handleFile(t.files[0]);
}
function input(e){
 if(e.target.id==="om-f-sku"){var companyControl=el("om-f-company");if(companyControl){var detected=companyBySku(e.target.value);if(detected!=="UNASSIGNED")companyControl.value=detected;}}
 if(e.target.id==="om-paste"){syncPasteToForm(e.target.value);return;}
 if(e.target.id&&e.target.id.indexOf("om-f-")===0){
  var k=e.target.id.slice(5);
  state.manuallyEdited[k]=true;
  if(!state.draft)state.draft=base();
  state.draft[k]=e.target.value;
 }
 if(e.target.id==="om-search"){state.search=e.target.value;var pos=e.target.selectionStart;render();var x=el("om-search");if(x){x.focus();x.setSelectionRange(pos,pos);}}
}
function init(){
 var host=root();if(!host)return;
 if(state.loadedForUid&&(!auth()||auth().uid!==state.loadedForUid))resetPrivate();
 mount();
 if(!state.securityChecked&&!state.loading&&viewable())load(false);
}
window.MKTOrderManagementV1={version:"1.7.0",init:init,parse:parse,load:load,companyBySku:companyBySku};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
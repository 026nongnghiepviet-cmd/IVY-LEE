/* ORDER MANAGEMENT V1 - isolated addon for existing Blogger route #/compose.
   Stores no customer information in GitHub/localStorage. Firebase RTDB is the only record store.
   Fail-closed security probe: will not read/write orders while old root ".read": "auth != null" is active.
*/
(function(){
"use strict";
if(window.MKTOrderManagementV1)return;
var ROOT="order_management_v1/orders", AUDIT="order_management_v1/audit";
var STATUS={pending:"Chờ đối soát",confirmed:"Đã xác nhận",delivered:"Đã giao",cancelled:"Đã hủy"};
var COMPANY={UNASSIGNED:"Chưa xác định",NNV:"Nông Nghiệp Việt",VN:"Việt Nhật",KF:"King Farm",ABC:"ABC Việt Nam"};
var state={loaded:false,loading:false,security:false,securityChecked:false,rows:[],tab:"orders",search:"",sku:"",province:"",statSku:"",draft:null,editing:"",batch:null,importing:false,importReport:null,error:"",message:""};
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
function base(){return {customerName:"",phone:"",addressOld:"",addressNew:"",sku:"",productName:"",quantity:1,unit:"xô",price:0,company:"UNASSIGNED",status:"pending",proof:"",orderDateMs:0,note:"",source:"manual",sourceRef:""};}
function parse(text){
 var t=str(text).replace(/\r/g,""), r=base(),m;
 function field(pattern){var a=t.match(pattern);return a?str(a[1]):"";}
 r.customerName=field(/(?:^|\n)\s*(?:Khách hàng|Người nhận|Khách)\s*:\s*(.+)$/im);
 r.phone=field(/(?:^|\n)\s*(?:SĐT|Số điện thoại)\s*:\s*([0-9\s.+-]+)/im).replace(/\D/g,"");
 r.addressOld=field(/(?:^|\n)\s*(?:ĐC CŨ|Địa chỉ|ĐC)\s*:\s*(.+)$/im);
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
 // ĐC MỚI deliberately stays blank, even when pasted text includes that line.
 m=t.match(/(?:^|\n)\s*(\d{1,4})\s+(xô|can|chai|thùng|gói|bao|bịch)\s+([^\r\n]+)/i);
 if(m){
   r.quantity=Number(m[1]);r.unit=m[2].toLowerCase();
   var detail=str(m[3]);var sku=detail.match(/\b(OVN\s*[- ]?\s*\d+)\b/i);
   r.sku=sku?sku[1].replace(/[\s-]/g,"").toUpperCase():"";
   r.productName=str(detail.replace(/\(?\s*(?:mã\s*)?OVN\s*[- ]?\s*\d+\s*\)?/ig,"").replace(/\s*[-–—]\s*$/,"").replace(/^\s*[-–—]\s*/,""));
   if(!r.productName)r.productName="Chưa xác định";
 }else{r.quantity=0;}
 var p=t.match(/(\d{1,3}(?:[.,]\d{3})+)\s*đ/i);if(p)r.price=number(p[1]);
 return r;
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
 r.company=COMPANY[str(r.company)]?str(r.company):"UNASSIGNED";
 r.status=STATUS[str(r.status)]?str(r.status):"pending";
 r.proof=str(r.proof).slice(0,500);r.note=str(r.note).slice(0,1500);
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
 var tabs=[["orders","Danh sách đơn"],["entry","Nhập đơn"],["customers","Khách hàng"],["stats","Thống kê khu vực"],["pdf","Soạn đơn từ PDF"]];
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
}
function kpis(){
 var a=state.rows.filter(function(r){return r.status!=="cancelled";});
 return '<div class="om-kpis"><div class="om-kpi"><small>Đơn được ghi nhận</small><b>'+a.length+'</b></div><div class="om-kpi"><small>Sản phẩm (đơn vị)</small><b>'+a.reduce(function(s,r){return s+Number(r.quantity||0);},0)+'</b></div><div class="om-kpi"><small>Số điện thoại khác nhau</small><b>'+uniq(a.map(function(r){return r.phone;})).length+'</b></div><div class="om-kpi"><small>Khu vực tỉnh/thành</small><b>'+uniq(a.map(function(r){return r.province;})).length+'</b></div></div>';
}
function options(a,current){return '<option value="">Tất cả</option>'+a.map(function(x){return '<option value="'+esc(x)+'" '+(current===x?"selected":"")+'>'+esc(x)+'</option>';}).join("");}
function filtered(){
 return state.rows.filter(function(r){
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
 '<button class="om-btn" data-om-action="export" '+(!editable()?'disabled':'')+'>Xuất CSV</button>'+
 '<input id="om-search" class="om-input" aria-label="Tìm kiếm đơn" style="max-width:310px" placeholder="Tên, SĐT, SKU, địa chỉ..." value="'+esc(state.search)+'"/>'+
 '<select id="om-sku-filter" class="om-select" style="max-width:180px">'+options(uniq(state.rows.map(function(r){return r.sku;})).sort(),state.sku)+'</select>'+
 '<select id="om-province-filter" class="om-select" style="max-width:250px">'+options(uniq(state.rows.map(function(r){return r.province;})).sort(),state.province)+'</select></div>'+
 '<div class="om-subtle" style="margin-bottom:9px">Hiển thị '+rows.length+'/'+state.rows.length+' bản ghi; không tính đơn chờ đối soát thành doanh thu. Tối đa 700 đơn mới nhất mỗi lần tải.</div>'+
 '<div class="om-table-wrap"><table class="om-table"><thead><tr><th>Khách hàng</th><th>Điện thoại</th><th>Sản phẩm</th><th>SL</th><th>Tỉnh / Thành phố</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>'+
 (rows.length?rows.map(function(r){return '<tr><td><b>'+esc(r.customerName)+'</b><br><span class="om-subtle">'+esc(COMPANY[r.company]||"")+'</span></td><td>'+esc(r.phone)+'</td><td>'+esc(r.productName)+'<br><span class="om-pill">'+esc(r.sku)+'</span></td><td>'+Number(r.quantity||0)+' '+esc(r.unit)+'</td><td>'+esc(r.province||"Chưa xác định")+'</td><td><span class="om-pill">'+esc(STATUS[r.status]||r.status)+'</span></td><td><button class="om-btn" data-om-action="view" data-om-id="'+esc(r.id)+'">Xem</button></td></tr>';}).join(""):'<tr><td colspan="7">Không có đơn hàng phù hợp.</td></tr>')+
 '</tbody></table></div>';
}
function field(k,label,value,type,opts){return '<div class="om-field '+(opts&&opts.wide?"om-wide":"")+'"><label for="om-f-'+k+'">'+label+'</label>'+(type==="textarea"?'<textarea id="om-f-'+k+'" class="om-textarea">'+esc(value)+'</textarea>':type==="select"?'<select id="om-f-'+k+'" class="om-select">'+opts.options.map(function(o){return '<option value="'+esc(o[0])+'" '+(String(o[0])===String(value)?"selected":"")+'>'+esc(o[1])+'</option>';}).join("")+'</select>':'<input id="om-f-'+k+'" class="om-input" type="'+(type||"text")+'" value="'+esc(value)+'"/>')+'</div>';}
function renderEntry(){
 var r=state.draft||base();
 var toolbar='<div class="om-actions"><button class="om-btn" data-om-action="new">+ Đơn mới</button><button class="om-btn" data-om-action="toOrders">← Danh sách</button></div>';
 var paste='<div class="om-field"><label>Dán đơn hàng theo mẫu ChatGPT</label><textarea id="om-paste" class="om-textarea" style="height:220px!important" placeholder="Khách hàng: ...&#10;SĐT: ...&#10;ĐC CŨ: ...&#10;ĐC MỚI:&#10;1 xô BOSS 1 - OVN150"></textarea><div class="om-subtle">Giữ nguyên địa chỉ được cung cấp. Không tự đoán cấp hành chính. ĐC MỚI mặc định để trống.</div><button class="om-btn primary" style="margin-top:8px" data-om-action="parse">Phân tích văn bản</button></div>';
 var f='<div class="om-form">'+
 field("customerName","Khách hàng",r.customerName)+field("phone","Số điện thoại",r.phone)+field("company","Công ty",r.company,"select",{options:Object.keys(COMPANY).map(function(k){return[k,COMPANY[k]];})})+
 field("addressOld","Địa chỉ cũ",r.addressOld,"textarea",{wide:true})+field("addressNew","Địa chỉ mới (nếu đã xác minh)",r.addressNew,"textarea",{wide:true})+
 field("productName","Sản phẩm",r.productName)+field("sku","Mã SKU",r.sku)+field("quantity","Số lượng",r.quantity,"number")+
 field("unit","Đơn vị",r.unit,"select",{options:["xô","can","chai","thùng","gói","bao","bịch"].map(function(x){return[x,x];})})+
 field("price","Đơn giá (để trống nếu chưa biết)",r.price||"","number")+
 field("status","Trạng thái",r.status,"select",{options:Object.keys(STATUS).map(function(x){return[x,STATUS[x]];})})+
 field("proof","Bằng chứng đối soát / mã vận đơn",r.proof,"text",{wide:true})+
 field("note","Ghi chú",r.note,"textarea",{wide:true})+'</div>'+
 '<div class="om-actions" style="margin-top:14px"><button class="om-btn primary" data-om-action="save" '+(!editable()?"disabled":"")+'>'+(state.editing?"Lưu cập nhật":"Lưu đơn mới")+'</button><button class="om-btn" data-om-action="preview">Xem mẫu đơn</button></div>';
 var batchErrors=state.batch?state.batch.filter(function(r){return !r.sourceRef||r.quantity===undefined||!!invalid(clean(r));}).length:0;
 var batch='<div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px"><b>Nhập nhiều đơn lịch sử</b><p class="om-subtle">Chọn tệp JSON có danh sách đơn; kiểm tra số lượng và lỗi trước khi xác nhận. Dùng sourceRef cố định để chống nhập trùng. Có thể chọn lại file đầy đủ để tiếp tục các đơn chưa lưu mà không ghi đè những đơn trước.</p><input id="om-bulk-file" type="file" accept=".json,application/json" class="om-input"/><div id="om-bulk-preview">'+
 (state.batch?alertBox("Xem trước: "+state.batch.length+" dòng; "+batchErrors+" dòng thiếu/trái định dạng. Mã nguồn đã nhập sẽ được bỏ qua.")+'<button class="om-btn primary" data-om-action="batchSave" ' +(!editable()||state.importing?"disabled":"")+'>Xác nhận nhập '+state.batch.length+' đơn</button>':"")+'</div></div>';
 var imp=state.importing?alertBox("Đang tiếp tục đối chiếu và lưu dữ liệu. Không đóng trang. "+str(state.message)):"";
 if(state.importReport){imp+=alertBox(state.importReport.summary,(state.importReport.missing||state.importReport.errors.length)?"danger":"");imp+='<button type="button" class="om-btn" data-om-action="downloadImportReport">Tải báo cáo nhập đơn (.txt)</button>';if(state.importReport.errors.length)imp+='<div class="om-subtle">Lỗi/khác biệt: '+state.importReport.errors.slice(0,8).map(function(x){return esc(x.sourceRef)+": "+esc(x.reason);}).join("; ")+(state.importReport.errors.length>8?" ...":"")+'</div>';}
 return toolbar+'<div class="om-duo"><div>'+paste+batch+imp+'</div><div><b>'+(state.editing?"Chỉnh sửa đơn đã có":"Thông tin đơn hàng")+'</b><p class="om-subtle">Các trường trống cần được kiểm tra trước khi lưu. Số lượng và mã SKU phải đúng nhãn thực tế.</p>'+f+'</div></div>';
}
function renderCustomers(){
 var map={};state.rows.forEach(function(r){if(!r.phone)return;var key=r.phone+'|'+norm(r.customerName);(map[key]=map[key]||[]).push(r);});
 var rows=Object.keys(map).map(function(p){var a=map[p].slice().sort(function(x,y){return y.createdAtMs-x.createdAtMs;});return {phone:a[0].phone,name:a[0].customerName,count:a.length,qty:a.reduce(function(s,r){return s+Number(r.quantity||0);},0),last:a[0].province};}).sort(function(a,b){return b.count-a.count;});
 return alertBox("Hồ sơ nhóm theo số điện thoại VÀ tên; một số điện thoại có thể thuộc nhiều người. Kiểm tra kỹ trước khi gộp.")+'<div class="om-table-wrap"><table class="om-table"><thead><tr><th>Khách hàng</th><th>Điện thoại</th><th>Số đơn</th><th>Số lượng</th><th>Địa phương</th><th>Tra cứu</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.name)+'</td><td>'+esc(r.phone)+'</td><td>'+r.count+'</td><td>'+r.qty+'</td><td>'+esc(r.last)+'</td><td><button class="om-btn" data-om-action="findPhone" data-om-phone="'+esc(r.phone)+'">Xem đơn</button></td></tr>';}).join("")+'</tbody></table></div>';
}
function bars(rows,title){
 var max=rows.length?rows[0].units:1;
 return '<div><h3 style="font-size:15px">'+esc(title)+'</h3>'+(rows.length?rows.slice(0,20).map(function(r){var w=Math.round(r.units/Math.max(1,max)*100);return '<div class="om-statline"><strong title="'+esc(r.key)+'">'+esc(r.key)+'</strong><div class="om-bar"><i style="width:'+w+'%"></i></div><small>'+r.units+'</small></div>';}).join(""):'<p class="om-subtle">Chưa đủ dữ liệu.</p>')+'</div>';
}
function group(rows,keyfn){var o={};rows.forEach(function(r){var k=keyfn(r)||"Chưa xác định";o[k]=o[k]||{key:k,units:0,orders:0};o[k].units+=Number(r.quantity)||0;o[k].orders++;});return Object.keys(o).map(function(k){return o[k];}).sort(function(a,b){return b.units-a.units;});}
function renderStats(){
 var active=state.rows.filter(function(r){return r.status!=="cancelled";});
 var choices=uniq(active.map(function(r){return r.sku;})).sort();
 var rows=active.filter(function(r){return !state.statSku||r.sku===state.statSku;});
 var skus=group(rows,function(r){return r.sku||r.productName;});
 var prov=group(rows,function(r){return r.province;});
 var district=group(rows,function(r){return [r.district,r.province].filter(Boolean).join(", ");});
 return kpis()+'<div class="om-actions"><b style="font-size:12px">Lọc mã sản phẩm:</b><select id="om-stats-sku" class="om-select" style="max-width:250px">'+options(choices,state.statSku)+'</select><span class="om-subtle">'+rows.length+' đơn trong phạm vi đang xem</span></div>'+
 alertBox("Thống kê theo "+(state.statSku?("mã "+state.statSku):"mọi sản phẩm")+". Đây là đơn ghi nhận, không phải doanh số giao thành công. Địa phương theo địa chỉ cũ, không tự quy đổi sáp nhập.")+
 '<div class="om-duo">'+bars(prov,"Số lượng sản phẩm theo tỉnh / thành")+bars(skus,"Số lượng theo mã sản phẩm")+'</div><div style="margin-top:20px">'+bars(district,"Số lượng theo huyện / quận")+'</div>';
}
function readForm(){
 var r=Object.assign({},state.draft||base());
 ["customerName","phone","addressOld","addressNew","productName","sku","quantity","unit","price","status","company","proof","note"].forEach(function(k){if(el("om-f-"+k))r[k]=el("om-f-"+k).value;});
 return clean(r);
}
function standard(r){return 'Khách hàng: '+r.customerName+'\nSĐT: '+r.phone+'\nĐC CŨ: '+r.addressOld+'\nĐC MỚI: '+(r.addressNew||"")+'\n'+r.quantity+' '+r.unit+' '+r.productName+(r.sku?' - '+r.sku:"");}
function modal(title,content){var a=document.createElement("div");a.className="om-modal";a.id="om-modal";a.innerHTML='<div class="om-modal-card"><div class="om-actions" style="justify-content:space-between"><b>'+esc(title)+'</b><button class="om-btn" data-om-action="closeModal">Đóng ×</button></div>'+content+'</div>';el("om-app-v1").appendChild(a);}
function view(id){
 var r=state.rows.find(function(x){return x.id===id;});if(!r)return;
 modal("Chi tiết đơn hàng",'<pre style="white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.8;background:#f8fafc;padding:14px;border-radius:12px">'+esc(standard(r))+'</pre>'+
 '<p class="om-subtle">Trạng thái: '+esc(STATUS[r.status])+' · Công ty: '+esc(COMPANY[r.company])+' · Đơn giá: '+(r.price?money(r.price):"Chưa xác định")+' · Bằng chứng: '+esc(r.proof||"Chưa có")+'</p>'+
 '<div class="om-actions"><button class="om-btn" data-om-action="copy" data-om-id="'+esc(id)+'">Sao chép</button><button class="om-btn primary" data-om-action="edit" data-om-id="'+esc(id)+'" '+(!editable()?"disabled":"")+'>Chỉnh sửa</button></div>');
}
function getRecord(id,r){
 return Object.assign({},clean(r),{v:1,id:id,createdAtMs:Number(r.createdAtMs)||Date.now(),updatedAtMs:Date.now(),createdByUid:str(r.createdByUid)||str(auth().uid),updatedByUid:str(auth().uid)});
}
function audit(action,r){
 var a=db().ref(AUDIT).push(),u=auth();
 return a.set({v:1,id:a.key,orderId:r.id,action:action,actorUid:u.uid,actorEmail:u.email||"",createdAtMs:Date.now()}).catch(function(e){state.message="Đã lưu đơn nhưng chưa ghi được nhật ký: "+e.message;});
}
function save(){
 if(!editable())return notify("Không có quyền sửa dữ liệu.",true);
 var r=readForm(),err=invalid(r);if(err)return notify(err,true);
 var id=state.editing||db().ref(ROOT).push().key;
 var old=state.rows.find(function(x){return x.id===id;});
 if(old){r.createdAtMs=old.createdAtMs;r.createdByUid=old.createdByUid;r.source=old.source;r.sourceRef=old.sourceRef;}
 var rec=getRecord(id,r);
 var possible=state.rows.some(function(x){return x.id!==id&&x.phone===rec.phone&&x.sku===rec.sku&&x.addressOld===rec.addressOld&&x.quantity===rec.quantity&&x.status!=="cancelled";});
 if(possible&&!window.confirm("Đã có đơn cùng SĐT, sản phẩm, địa chỉ và số lượng. Đây có phải một lần mua khác?"))return;
 notify("Đang lưu dữ liệu…");
 db().ref(ROOT+"/"+id).set(rec).then(function(){return audit(old?"update":"create",rec);}).then(function(){state.draft=null;state.editing="";state.tab="orders";state.message="Đã lưu đơn vào Firebase. Trạng thái mặc định: Chờ đối soát.";return load(true);}).catch(function(e){notify("Firebase không cho phép lưu: "+e.message,true);});
}
function notify(t,err){state.message=err?"":t;state.error=err?t:"";render();}
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
 if(!editable()||!state.batch||state.importing)return;
 var data=state.batch;
 if(!window.confirm("Đối chiếu "+data.length+" đơn với Firebase và chỉ nhập những đơn chưa có? Các đơn đã lưu sẽ không bị ghi đè."))return;
 state.importing=true;state.error="";state.importReport=null;
 var report={at:new Date().toISOString(),total:data.length,already:0,written:0,verified:0,missing:0,errors:[],summary:""};
 try{
  state.message="Đang kiểm tra các đơn đã có trên Firebase…";render();
  // One consistent read for all historical keys; prevents accidentally treating existing orders as missing.
  var snapshot=await db().ref(ROOT).orderByKey().startAt("hist_").endAt("hist_\uf8ff").once("value");
  var existing=snapshot.val()||{},want=[],seen={};
  for(var i=0;i<data.length;i++){
   var raw=data[i]||{},ref=str(raw.sourceRef),r=clean(raw);
   r.status="pending";r.proof="";r.source="chat_history_import";r.sourceRef=ref;
   var why=invalid(r);
   if(raw.quantity===undefined||raw.quantity===null)why="Thiếu số lượng.";
   if(!ref)why="Thiếu sourceRef.";
   var id=ref?batchKey(raw):"";
   if(id&&seen[id])why="Trùng sourceRef ngay trong file nhập.";
   if(why){report.errors.push({sourceRef:ref||"dòng_"+(i+1),reason:why});continue;}
   seen[id]=true;want.push({id:id,sourceRef:ref,record:r});
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
   if(store[w.id]&&sameImportedRecord(store[w.id],w.record))report.verified++;
   else if(!report.errors.some(function(e){return e.sourceRef===w.sourceRef;}))report.errors.push({sourceRef:w.sourceRef,reason:"Chưa được xác nhận có mặt trong Firebase sau khi nhập."});
  });
  report.missing=report.total-report.verified;
  report.summary="Đối chiếu "+report.total+" dòng: Firebase xác nhận "+report.verified+" đơn, trong đó "+report.written+" đơn mới ghi; còn "+report.missing+" dòng thiếu hoặc khác biệt.";
  state.importReport=report;state.message=report.summary;
  // Keep the loaded file in memory until all sourceRef keys are verified; safe to press again.
  if(report.missing===0){state.batch=null;state.tab="orders";}
  else state.tab="entry";
  await load(true);
 }catch(e){
  report.summary="Chưa hoàn thành đối chiếu Firebase: "+str(e&&e.message||e)+". Không xóa file đã chọn; có thể chạy lại.";
  report.missing=report.total-report.verified;
  report.errors.push({sourceRef:"SYSTEM",reason:str(e&&e.code||e&&e.message||e)});
  state.importReport=report;state.error=report.summary;state.tab="entry";
 }finally{state.importing=false;render();}
}
function handleFile(file){
 if(!file)return;var rd=new FileReader();
 rd.onload=function(){try{var v=JSON.parse(String(rd.result||""));if(v&&Array.isArray(v.orders))v=v.orders;if(!Array.isArray(v)||v.length>2000)throw Error("Tệp phải là mảng JSON, tối đa 2.000 đơn.");state.batch=v;state.message="Đã đọc "+v.length+" đơn để xem trước. Chưa ghi vào Firebase.";state.error="";render();}catch(e){notify("Không đọc được JSON: "+e.message,true);}};
 rd.readAsText(file,"UTF-8");
}
function load(force){
 if(state.loading&&!force)return Promise.resolve();
 if(!viewable()){render();return Promise.resolve();}
 state.loading=true;state.error="";
 return secure().then(function(ok){if(!ok)throw new Error(gateMessage());
  return db().ref(ROOT).orderByChild("createdAtMs").limitToLast(700).once("value");
 }).then(function(s){
  var v=s.val()||{};state.rows=Object.keys(v).map(function(k){var r=v[k]||{};r.id=k;return r;}).sort(function(a,b){return(Number(b.createdAtMs)||0)-(Number(a.createdAtMs)||0);});
  state.loaded=true;state.loading=false;state.error="";render();
 }).catch(function(e){state.loading=false;state.loaded=true;state.error=e.message||String(e);render();});
}
function click(e){
 var t=e.target.closest("[data-om-tab],[data-om-action]");if(!t)return;
 var tab=t.getAttribute("data-om-tab"),action=t.getAttribute("data-om-action");
 if(tab){
  state.tab=tab;state.message="";state.error="";render();return;
 }
 if(!action)return;
 var id=t.getAttribute("data-om-id")||"";
 if(action==="reload"){state.securityChecked=false;state.loaded=false;load(true);}
 if(action==="toOrders"){state.tab="orders";render();}
 if(action==="new"){state.tab="entry";state.draft=base();state.editing="";render();}
 if(action==="parse"){var txt=el("om-paste");if(!txt)return;var r=parse(txt.value);state.draft=r;state.editing="";render();notify("Đã tách các trường có thể nhận dạng. Vui lòng kiểm tra dữ liệu trước khi lưu.");}
 if(action==="save")save();
 if(action==="view")view(id);
 if(action==="edit"){var r=state.rows.find(function(x){return x.id===id;});if(r){if(el("om-modal"))el("om-modal").remove();state.draft=Object.assign({},r);state.editing=id;state.tab="entry";render();}}
 if(action==="preview"){var r=readForm();modal("Bản soạn đơn",'<pre style="white-space:pre-wrap;line-height:1.8;padding:14px;background:#f8fafc">'+esc(standard(r))+'</pre>');}
 if(action==="closeModal"){if(el("om-modal"))el("om-modal").remove();}
 if(action==="copy"){var r=state.rows.find(function(x){return x.id===id;});if(r&&navigator.clipboard)navigator.clipboard.writeText(standard(r)).then(function(){notify("Đã sao chép đơn.");});}
 if(action==="export")csv();
 if(action==="findPhone"){state.search=t.getAttribute("data-om-phone")||"";state.sku="";state.province="";state.tab="orders";render();}
 if(action==="batchSave")batchSave();
 if(action==="downloadImportReport")downloadImportReport();
}
function change(e){
 var t=e.target;if(t.id==="om-sku-filter"){state.sku=t.value;render();}
 if(t.id==="om-province-filter"){state.province=t.value;render();}
 if(t.id==="om-stats-sku"){state.statSku=t.value;render();}
 if(t.id==="om-bulk-file"&&t.files)handleFile(t.files[0]);
}
function input(e){
 if(e.target.id==="om-search"){state.search=e.target.value;var pos=e.target.selectionStart;render();var x=el("om-search");if(x){x.focus();x.setSelectionRange(pos,pos);}}
}
function init(){
 var host=root();if(!host)return;
 mount();
 if(!state.securityChecked&&!state.loading&&viewable())load(false);
}
window.MKTOrderManagementV1={version:"1.1.0",init:init,parse:parse,load:load};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
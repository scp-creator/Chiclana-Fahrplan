
let DATA, activeType="bus";
const $=id=>document.getElementById(id);
fetch("data.json").then(r=>r.json()).then(d=>{DATA=d; init();});
function init(){
 const names=[...new Set(DATA.lines.flatMap(l=>l.stops))].sort();
 $("stops").innerHTML=names.map(x=>`<option value="${x}">`).join("");
 const now=new Date(); $("date").value=now.toISOString().slice(0,10);
 document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeType=b.dataset.type;search();});
 ["from","to","date","time"].forEach(id=>$(id).addEventListener("input",search));
 $("from").value="Río Iro Ntra. Sra. Remedios"; $("to").value="Bahía Sur"; search();
}
function mins(t){let [h,m]=t.split(":").map(Number);return h*60+m}
function fmtDuration(a,b){let d=mins(b)-mins(a); if(d<0)d+=1440; return `${d} Min.`}
function search(){
 if(!DATA)return;
 const from=$("from").value.trim(),to=$("to").value.trim(), after=mins($("time").value||"00:00");
 let arr=[];
 DATA.lines.filter(l=>activeType==="all"||l.type===activeType).forEach(line=>{
   let fi=line.stops.findIndex(s=>s.toLowerCase()===from.toLowerCase());
   let ti=line.stops.findIndex(s=>s.toLowerCase()===to.toLowerCase());
   if(fi<0||ti<0||ti<=fi)return;
   line.trips.forEach((trip,idx)=>{
     let a=trip[fi],b=trip[ti]; if(a==="--"||b==="--"||mins(a)<after)return;
     arr.push({line,trip,idx,fi,ti,a,b});
   });
 });
 arr.sort((x,y)=>mins(x.a)-mins(y.a));
 $("count").textContent=arr.length?`${arr.length} gefunden`:"";
 $("results").innerHTML=arr.slice(0,12).map((x,i)=>`
   <article class="result ${x.line.type}" onclick='openDetail(${JSON.stringify(x).replace(/'/g,"&#39;")})'>
    <span class="badge ${x.line.type}">${x.line.type==="bus"?"🚌":"🚋"} ${x.line.name}</span>
    <span class="direction">${x.line.direction}</span>
    <div class="times"><strong>${x.a} → ${x.b}</strong><span class="dur">${fmtDuration(x.a,x.b)}　›</span></div>
    <div class="route-mini">${from} → ${to}</div>
   </article>`).join("") || `<div class="empty">Keine direkte Verbindung mit diesen Angaben gefunden.</div>`;
}
function openDetail(x){
 const l=x.line;
 const stops=l.stops.map((name,i)=>({name,time:x.trip[i],i})).filter(s=>s.time!=="--");
 const visible=stops.map(s=>{
   const personal=s.i===x.fi||s.i===x.ti;
   const start=s.i===0,end=s.i===l.stops.length-1;
   return `<div class="stop ${personal?"personal":""} ${start?"start":""} ${end?"end":""}">
     <div class="time">${s.time}</div><div class="dot"></div><div class="name">${s.name}${personal?` <span class="tag">${s.i===x.fi?"Dein Einstieg":"Dein Ziel"}</span>`:""}</div>
   </div>`}).join("");
 $("detailBody").innerHTML=`<div class="detail-head"><span class="badge ${l.type}">${l.type==="bus"?"🚌":"🚋"} ${l.name}</span><div>${l.direction}</div></div>
 <div class="summary"><div><strong>${x.a}</strong><br><span>Dein Einstieg<br>${l.stops[x.fi]}</span></div><div>${fmtDuration(x.a,x.b)}</div><div style="text-align:right"><strong>${x.b}</strong><br><span>Dein Ziel<br>${l.stops[x.ti]}</span></div></div>
 <div class="timeline">${visible}</div><div class="note">Fahrplan gültig ab ${new Date(l.validFrom).toLocaleDateString("de-DE")}.<br>Die vollständige Tabellenübernahme wird mit weiteren Fahrplandaten ergänzt.</div>`;
 $("detail").classList.remove("hidden");
}
function closeDetail(){$("detail").classList.add("hidden")}

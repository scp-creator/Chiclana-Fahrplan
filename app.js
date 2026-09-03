let DATA, activeType = "bus", stopNames = [];
function detectDeviceLanguage() {
  const langs = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || "de"];
  for (const lang of langs) {
    const base = String(lang).toLowerCase().split("-")[0];
    if (base === "de" || base === "es" || base === "en") return base;
  }
  return "en";
}
const savedLanguage = localStorage.getItem("chiclanaLanguage");
let currentLang = savedLanguage || detectDeviceLanguage();

const $ = id => document.getElementById(id);

const I18N = {
  de: {
    subtitle:"Fahrplan", from:"Von", to:"Nach", date:"Datum", time:"Uhrzeit",
    bus:"Bus", tram:"Tram", both:"Beide", search:"Verbindungen suchen",
    language:"Sprache", available:"Verfügbare Verbindungen",
    navSearch:"Suchen", navFavorites:"Favoriten", navLines:"Linien", navMore:"Mehr",
    stopPlaceholder:"Haltestelle eingeben oder wählen",
    noStop:"Keine passende Haltestelle",
    chooseStops:"Bitte bei „Von“ und „Nach“ eine Haltestelle auswählen oder eingeben.",
    noConnection:"Keine direkte Verbindung für diese Haltestellen gefunden.",
    found:"gefunden", openArrival:"Ankunft offen",
    noPublishedArrival:"Keine veröffentlichte Ankunftszeit",
    yourBoarding:"Dein Einstieg", yourDestination:"Dein Ziel",
    validFrom:"Fahrplan gültig vom", until:"bis"
  },
  es: {
    subtitle:"Horario", from:"Desde", to:"Hasta", date:"Fecha", time:"Hora",
    bus:"Autobús", tram:"Tranvía", both:"Ambos", search:"Buscar conexiones",
    language:"Idioma", available:"Conexiones disponibles",
    navSearch:"Buscar", navFavorites:"Favoritos", navLines:"Líneas", navMore:"Más",
    stopPlaceholder:"Escribe o elige una parada",
    noStop:"No se encontró ninguna parada",
    chooseStops:"Selecciona o introduce una parada en «Desde» y «Hasta».",
    noConnection:"No se encontró una conexión directa para estas paradas.",
    found:"encontradas", openArrival:"Llegada abierta",
    noPublishedArrival:"No hay hora de llegada publicada",
    yourBoarding:"Tu subida", yourDestination:"Tu destino",
    validFrom:"Horario válido del", until:"al"
  },
  en: {
    subtitle:"Timetable", from:"From", to:"To", date:"Date", time:"Time",
    bus:"Bus", tram:"Tram", both:"Both", search:"Search connections",
    language:"Language", available:"Available connections",
    navSearch:"Search", navFavorites:"Favorites", navLines:"Lines", navMore:"More",
    stopPlaceholder:"Enter or choose a stop",
    noStop:"No matching stop",
    chooseStops:"Please select or enter a stop for “From” and “To”.",
    noConnection:"No direct connection found for these stops.",
    found:"found", openArrival:"Arrival open",
    noPublishedArrival:"No published arrival time",
    yourBoarding:"Your boarding", yourDestination:"Your destination",
    validFrom:"Timetable valid from", until:"to"
  }
};

function t(key){ return (I18N[currentLang] && I18N[currentLang][key]) || I18N.de[key] || key; }

function normalizeText(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

fetch("data.json")
  .then(r => r.json())
  .then(d => { DATA = d; init(); })
  .catch(() => { $("results").innerHTML = '<div class="empty">Fahrplandaten konnten nicht geladen werden.</div>'; });

function setCurrentDateTime() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,"0");
  const d = String(now.getDate()).padStart(2,"0");
  const h = String(now.getHours()).padStart(2,"0");
  const min = String(now.getMinutes()).padStart(2,"0");
  $("date").value = `${y}-${m}-${d}`;
  $("time").value = `${h}:${min}`;
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (I18N[currentLang][key]) el.textContent = I18N[currentLang][key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });
  document.querySelectorAll(".lang").forEach(b => b.classList.toggle("active", b.dataset.lang === currentLang));
  document.title = `Chiclana · ${t("subtitle")}`;
  $("date").setAttribute("aria-label", t("date"));
  $("time").setAttribute("aria-label", t("time"));
  $("swapBtn").setAttribute("aria-label", `${t("from")} / ${t("to")} tauschen`);
  $("closeDetail").setAttribute("aria-label", currentLang==="de" ? "Schließen" : currentLang==="es" ? "Cerrar" : "Close");
  search();
}

function init() {
  stopNames = [...new Set(DATA.lines.flatMap(l => l.stops))].sort((a,b) => a.localeCompare(b,"de"));
  setCurrentDateTime();
  setupAutocomplete("from","fromSuggestions");
  setupAutocomplete("to","toSuggestions");

  document.querySelectorAll(".tabs button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      activeType = b.dataset.type;
      search();
    });
  });

  ["from","to","date","time"].forEach(id => {
    $(id).addEventListener("change", search);
  });

  document.querySelectorAll(".lang").forEach(b => {
    b.addEventListener("click", () => {
      currentLang = b.dataset.lang;
      localStorage.setItem("chiclanaLanguage", currentLang);
      applyLanguage();
    });
  });

  $("searchBtn").addEventListener("click", search);
  $("swapBtn").addEventListener("click", () => {
    const a = $("from").value; $("from").value = $("to").value; $("to").value = a; search();
  });
  $("closeDetail").addEventListener("click", closeDetail);
  $("detail").addEventListener("click", e => { if(e.target === $("detail")) closeDetail(); });

  applyLanguage();
}

function setupAutocomplete(inputId, suggestionsId) {
  const input = $(inputId), box = $(suggestionsId);
  function renderSuggestions() {
    const q = normalizeText(input.value);
    const matches = stopNames.filter(name => !q || normalizeText(name).includes(q)).slice(0,8);
    if (!matches.length) {
      box.innerHTML = `<div class="no-suggestion">${escapeHtml(t("noStop"))}</div>`;
      box.classList.remove("hidden"); return;
    }
    box.innerHTML = matches.map(name => `<button type="button" class="suggestion">${escapeHtml(name)}</button>`).join("");
    box.querySelectorAll(".suggestion").forEach(btn => {
      btn.addEventListener("click", () => { input.value = btn.textContent; box.classList.add("hidden"); search(); });
    });
    box.classList.remove("hidden");
  }
  input.addEventListener("focus", renderSuggestions);
  input.addEventListener("input", renderSuggestions);
  input.addEventListener("keydown", e => { if(e.key==="Escape") box.classList.add("hidden"); });
  document.addEventListener("click", e => {
    if(!input.contains(e.target) && !box.contains(e.target)) box.classList.add("hidden");
  });
}

function mins(t) { const [h,m]=t.split(":").map(Number); return h*60+m; }
function fmtDuration(a,b) { let d=mins(b)-mins(a); if(d<0)d+=1440; return `${d} Min.`; }

function findStopIndex(stops, query) {
  const q=normalizeText(query); if(!q)return -1;
  let i=stops.findIndex(s=>normalizeText(s)===q); if(i>=0)return i;
  return stops.findIndex(s=>normalizeText(s).startsWith(q));
}

function search() {
  if(!DATA)return;
  const from=$("from").value.trim(), to=$("to").value.trim();
  const after=mins($("time").value || "00:00"), selectedDate=$("date").value;
  if(!from || !to) {
    $("count").textContent="";
    $("results").innerHTML=`<div class="empty">${escapeHtml(t("chooseStops"))}</div>`;
    return;
  }
  let arr=[];
  DATA.lines
    .filter(l=>activeType==="all" || l.type===activeType)
    .filter(l=>!l.validFrom || selectedDate>=l.validFrom)
    .filter(l=>!l.validUntil || selectedDate<=l.validUntil)
    .forEach(line=>{
      const fi=findStopIndex(line.stops,from), ti=findStopIndex(line.stops,to);
      if(fi<0 || ti<0 || ti<=fi)return;
      const candidates=line.trips.map((trip,idx)=>({line,trip,idx,fi,ti,a:trip[fi],b:trip[ti]})).filter(x=>x.a && x.a!=="--");
      const upcoming=candidates.filter(x=>mins(x.a)>=after).sort((x,y)=>mins(x.a)-mins(y.a));
      if(upcoming.length)arr.push(...upcoming); else if(candidates.length){candidates.sort((x,y)=>mins(x.a)-mins(y.a));arr.push(candidates[0]);}
    });
  arr.sort((x,y)=>mins(x.a)-mins(y.a));
  $("count").textContent=arr.length?`${arr.length} ${t("found")}`:"";
  $("results").innerHTML=arr.slice(0,12).map(x=>{
    const isL7=x.line.name==="L-7";
    const arrival=x.b==="--"?t("openArrival"):x.b;
    const dur=x.b==="--"?t("noPublishedArrival"):fmtDuration(x.a,x.b);
    return `<article class="result ${x.line.type}" data-result-index="${arr.indexOf(x)}">
      <span class="badge ${x.line.type} ${isL7?"l7":""}">${x.line.type==="bus"?"🚌":"🚋"} ${escapeHtml(x.line.name)}</span>
      <span class="direction">${escapeHtml(x.line.direction)}</span>
      <div class="times"><strong>${escapeHtml(x.a)} → ${escapeHtml(arrival)}</strong><span class="dur">${escapeHtml(dur)}${x.b==="--"?"":"　›"}</span></div>
      <div class="route-mini">${escapeHtml(from)} → ${escapeHtml(to)}</div>
    </article>`;
  }).join("") || `<div class="empty">${escapeHtml(t("noConnection"))}</div>`;

  document.querySelectorAll(".result").forEach((el,i)=>el.addEventListener("click",()=>openDetail(arr[i])));
}

function openDetail(x) {
  const l=x.line;
  const visible=l.stops.map((name,i)=>{
    const personal=i===x.fi || i===x.ti, start=i===0, end=i===l.stops.length-1, time=x.trip[i];
    return `<div class="stop ${personal?"personal":""} ${start?"start":""} ${end?"end":""} ${time==="--"?"no-time":""}">
      <div class="time">${time==="--"?"":escapeHtml(time)}</div><div class="dot"></div>
      <div class="name">${escapeHtml(name)} ${personal?`<span class="tag">${i===x.fi?t("yourBoarding"):t("yourDestination")}</span>`:""}</div>
    </div>`;
  }).join("");
  $("detailBody").innerHTML=`<div class="detail-head"><span class="badge ${l.type} ${l.name==="L-7"?"l7":""}">${l.type==="bus"?"🚌":"🚋"} ${escapeHtml(l.name)}</span><div>${escapeHtml(l.direction)}</div></div>
  <div class="summary"><div><strong>${escapeHtml(x.a)}</strong><br><span>${escapeHtml(t("yourBoarding"))}<br>${escapeHtml(l.stops[x.fi])}</span></div>
  <div>${x.b==="--"?escapeHtml(t("openArrival")):escapeHtml(fmtDuration(x.a,x.b))}</div>
  <div style="text-align:right"><strong>${x.b==="--"?escapeHtml(t("openArrival")):escapeHtml(x.b)}</strong><br><span>${escapeHtml(t("yourDestination"))}<br>${escapeHtml(l.stops[x.ti])}</span></div></div>
  <div class="timeline">${visible}</div>
  <div class="note">${escapeHtml(t("validFrom"))} ${new Date(l.validFrom+"T00:00:00").toLocaleDateString(currentLang==="de"?"de-DE":currentLang==="es"?"es-ES":"en-GB")} ${escapeHtml(t("until"))} ${new Date(l.validUntil+"T00:00:00").toLocaleDateString(currentLang==="de"?"de-DE":currentLang==="es"?"es-ES":"en-GB")}.</div>`;
  $("detail").classList.remove("hidden");
}
function closeDetail(){ $("detail").classList.add("hidden"); }

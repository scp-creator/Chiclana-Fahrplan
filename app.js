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
    language:"Sprache", selectedTime:"Fahrten ab", moreTitle:"Mehr", about:"Über diese App", imageCreditTitle:"Bildnachweis", imageCreditText:"Headerbild: Castillo de Sancti Petri bei Sonnenuntergang. Quelle und Lizenz bitte gemäß Originalquelle des verwendeten Fotos beachten.", available:"Verfügbare Verbindungen", earlier:"Frühere Verbindungen", later:"Spätere Verbindungen",
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
    language:"Idioma", selectedTime:"Viajes desde", moreTitle:"Más", about:"Sobre esta app", imageCreditTitle:"Créditos de imagen", imageCreditText:"Imagen de cabecera: Castillo de Sancti Petri al atardecer. Consulta la fuente y licencia original del fotógrafo.", available:"Conexiones disponibles", earlier:"Conexiones anteriores", later:"Conexiones posteriores",
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
    language:"Language", selectedTime:"Trips from", moreTitle:"More", about:"About this app", imageCreditTitle:"Image credits", imageCreditText:"Header image: Castillo de Sancti Petri at sunset. Please follow the original photographer’s source and license terms.", available:"Available connections", earlier:"Earlier connections", later:"Later connections",
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
  updateQuickTime();
  search();
}

function updateQuickTime(){
  const tv=$("time").value || "--:--";
  const dv=$("date").value;
  $("quickTime").textContent=tv;
  if(dv){ const [y,m,d]=dv.split("-"); $("quickDate").textContent=`${d}.${m}.${y}`; }
}

function init() {
  stopNames = [...new Set(DATA.lines.flatMap(l => l.stops))].sort((a,b) => a.localeCompare(b,"de"));
  setCurrentDateTime();
  updateQuickTime();
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
    $(id).addEventListener("change", () => { updateQuickTime(); search(); });
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
  $("closeMore").addEventListener("click", () => $("moreModal").classList.add("hidden"));
  $("languageRow").addEventListener("click", () => $("languagePanel").classList.toggle("hidden"));
  $("aboutRow").addEventListener("click", () => $("aboutPanel").classList.toggle("hidden"));
  document.querySelectorAll("nav a").forEach(a => a.addEventListener("click", () => {
    const n=a.dataset.nav;
    if(n === "more") { $("moreModal").classList.remove("hidden"); return; }
    document.querySelectorAll("nav a").forEach(x=>x.classList.remove("selected")); a.classList.add("selected");
    if(n === "search") window.scrollTo({top:0,behavior:"smooth"});
  }));
  $("moreModal").addEventListener("click", e => { if(e.target === $("moreModal")) $("moreModal").classList.add("hidden"); });
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
  const q = normalizeText(query);
  if (!q) return -1;
  const exact = stops.findIndex(s => normalizeText(s) === q);
  if (exact >= 0) return exact;
  const prefix = stops.findIndex(s => normalizeText(s).startsWith(q));
  if (prefix >= 0) return prefix;
  return stops.findIndex(s => normalizeText(s).includes(q));
}

function firstPublishedTime(trip) {
  const i = trip.findIndex(v => v && v !== "--");
  return i >= 0 ? trip[i] : "--";
}

function buildConnections(from, to, selectedDate) {
  const out = [];
  const requestedFrom = normalizeText(from);
  const requestedTo = normalizeText(to);

  DATA.lines.forEach(line => {
    if (activeType !== "all" && line.type !== activeType) return;
    if (line.validFrom && selectedDate < line.validFrom) return;
    if (line.validUntil && selectedDate > line.validUntil) return;

    const fi = findStopIndex(line.stops, requestedFrom);
    const ti = findStopIndex(line.stops, requestedTo);
    if (fi < 0 || ti < 0 || fi === ti || ti < fi) return;

    line.trips.forEach((trip, idx) => {
      const originTime = firstPublishedTime(trip);
      if (originTime === "--") return;

      // Some timetables (especially L-7) publish only the departure at the
      // first stop. Such a trip is still valid for every later stop on the
      // same direction. Never invent intermediate times.
      const boardingTime = trip[fi] && trip[fi] !== "--" ? trip[fi] : "--";
      const arrivalTime = trip[ti] && trip[ti] !== "--" ? trip[ti] : "--";
      const sortTime = boardingTime !== "--" ? boardingTime : originTime;

      out.push({
        line, trip, idx, fi, ti,
        a: boardingTime,
        b: arrivalTime,
        sortTime,
        originTime,
        boardingPublished: boardingTime !== "--",
        arrivalPublished: arrivalTime !== "--"
      });
    });
  });

  out.sort((a,b) => mins(a.sortTime) - mins(b.sortTime));
  return out;
}

function search() {
  if (!DATA) return;
  const from = $("from").value.trim();
  const to = $("to").value.trim();
  const after = mins($("time").value || "00:00");
  const selectedDate = $("date").value;

  if (!from || !to) {
    $("count").textContent = "";
    $("results").innerHTML = `<div class="empty">${escapeHtml(t("chooseStops"))}</div>`;
    return;
  }

  const all = buildConnections(from, to, selectedDate);
  if (!all.length) {
    $("count").textContent = "";
    $("results").innerHTML = `<div class="empty">${escapeHtml(t("noConnection"))}</div>`;
    return;
  }

  // The first page starts at the current/next trip and contains six trips.
  // For trips without a published intermediate time (L-7), the published
  // origin departure is used to decide whether the trip is earlier/later.
  let pivot = all.findIndex(x => mins(x.sortTime) >= after);
  if (pivot < 0) pivot = Math.max(0, all.length - 1);
  renderResultsWindow(all, from, to, pivot);
}

function renderResultsWindow(all, from, to, pivot) {
  const pageSize = 6;
  // Keep the selected/next connection at the top, then five following ones.
  let startIndex = Math.max(0, Math.min(pivot, Math.max(0, all.length - pageSize)));
  const visible = all.slice(startIndex, startIndex + pageSize);
  const endIndex = startIndex + visible.length - 1;

  $("count").textContent = `${all.length} ${t("found")}`;

  const hasEarlier = startIndex > 0;
  const hasLater = endIndex < all.length - 1;

  const earlierButton = hasEarlier
    ? `<button type="button" class="connection-nav earlier" id="earlierBtn">‹ ${escapeHtml(t("earlier"))}</button>` : "";
  const laterButton = hasLater
    ? `<button type="button" class="connection-nav later" id="laterBtn">${escapeHtml(t("later"))} ›</button>` : "";

  const cards = visible.map(x => {
    const isL7 = x.line.name === "L-7";
    const departure = x.a === "--" ? "—" : x.a;
    const arrival = x.b === "--" ? t("openArrival") : x.b;
    const dur = x.a === "--" || x.b === "--" ? t("noPublishedArrival") : fmtDuration(x.a, x.b);
    return `<article class="result ${x.line.type}" data-result-key="${escapeHtml(x.line.name)}-${x.idx}-${x.fi}-${x.ti}">
      <span class="badge ${x.line.type} ${isL7 ? "l7" : ""}">${x.line.type === "bus" ? "🚌" : "🚋"} ${escapeHtml(x.line.name)}</span>
      <span class="direction">${escapeHtml(x.line.direction)}</span>
      <div class="times"><strong>${escapeHtml(departure)} → ${escapeHtml(arrival)}</strong><span class="dur">${escapeHtml(dur)}${x.b === "--" ? "" : "　›"}</span></div>
      <div class="route-mini">${escapeHtml(from)} → ${escapeHtml(to)}</div>
    </article>`;
  }).join("");

  $("results").innerHTML = `${earlierButton}${cards || `<div class="empty">${escapeHtml(t("noConnection"))}</div>`}${laterButton}`;

  document.querySelectorAll(".result").forEach(el => el.addEventListener("click", () => {
    const key = el.dataset.resultKey;
    const found = all.find(x => `${x.line.name}-${x.idx}-${x.fi}-${x.ti}` === key);
    if (found) openDetail(found);
  }));

  const earlierEl = $("earlierBtn"), laterEl = $("laterBtn");
  if (earlierEl) earlierEl.addEventListener("click", () => {
    const newStart = Math.max(0, startIndex - pageSize);
    renderResultsWindow(all, from, to, newStart);
    $("results").scrollIntoView({behavior:"smooth", block:"start"});
  });
  if (laterEl) laterEl.addEventListener("click", () => {
    const newStart = Math.min(Math.max(0, all.length - pageSize), startIndex + pageSize);
    renderResultsWindow(all, from, to, newStart);
    $("results").scrollIntoView({behavior:"smooth", block:"start"});
  });
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
  <div class="summary"><div><strong>${x.a === "--" ? "—" : escapeHtml(x.a)}</strong><br><span>${escapeHtml(t("yourBoarding"))}<br>${escapeHtml(l.stops[x.fi])}</span></div>
  <div>${x.a==="--" || x.b==="--" ? escapeHtml(t("noPublishedArrival")) : escapeHtml(fmtDuration(x.a,x.b))}</div>
  <div style="text-align:right"><strong>${x.b==="--"?escapeHtml(t("openArrival")):escapeHtml(x.b)}</strong><br><span>${escapeHtml(t("yourDestination"))}<br>${escapeHtml(l.stops[x.ti])}</span></div></div>
  <div class="timeline">${visible}</div>
  <div class="note">${escapeHtml(t("validFrom"))} ${new Date(l.validFrom+"T00:00:00").toLocaleDateString(currentLang==="de"?"de-DE":currentLang==="es"?"es-ES":"en-GB")} ${escapeHtml(t("until"))} ${new Date(l.validUntil+"T00:00:00").toLocaleDateString(currentLang==="de"?"de-DE":currentLang==="es"?"es-ES":"en-GB")}.</div>`;
  $("detail").classList.remove("hidden");
}
function closeDetail(){ $("detail").classList.add("hidden"); }

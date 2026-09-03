
let DATA, activeType = "bus", stopNames = [];

function normalizeText(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const $ = id => document.getElementById(id);

fetch("data.json")
  .then(r => r.json())
  .then(d => {
    DATA = d;
    init();
  });

function setCurrentDateTime() {
  const now = new Date();

  // Lokales Datum und lokale Uhrzeit des iPhones verwenden.
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  $("date").value = `${year}-${month}-${day}`;
  $("time").value = `${hours}:${minutes}`;
}

function init() {
  stopNames = [...new Set(DATA.lines.flatMap(l => l.stops))].sort((a,b) =>
    a.localeCompare(b, "de")
  );

  setCurrentDateTime();

  setupAutocomplete("from", "fromSuggestions");
  setupAutocomplete("to", "toSuggestions");

  document.querySelectorAll(".tabs button").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".tabs button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      activeType = b.dataset.type;
      search();
    };
  });

  ["from", "to", "date", "time"].forEach(id => {
    $(id).addEventListener("input", search);
    $(id).addEventListener("change", search);
  });

  // Start intentionally empty: the user chooses both stops.
  $("from").value = "";
  $("to").value = "";
  search();
}

function setupAutocomplete(inputId, suggestionsId) {
  const input = $(inputId);
  const box = $(suggestionsId);

  function renderSuggestions() {
    const q = normalizeText(input.value);

    // Empty field: show all available stops. While typing: show matching stops.
    const matches = stopNames
      .filter(name => !q || normalizeText(name).includes(q))
      .slice(0, 8);

    if (!matches.length) {
      box.innerHTML = '<div class="no-suggestion">Keine passende Haltestelle</div>';
      box.classList.remove("hidden");
      return;
    }

    box.innerHTML = matches.map(name =>
      `<button type="button" class="suggestion">${escapeHtml(name)}</button>`
    ).join("");

    box.querySelectorAll(".suggestion").forEach(btn => {
      btn.onclick = () => {
        input.value = btn.textContent;
        box.classList.add("hidden");
        search();
      };
    });

    box.classList.remove("hidden");
  }

  input.addEventListener("focus", renderSuggestions);
  input.addEventListener("input", renderSuggestions);
  input.addEventListener("keydown", e => {
    if (e.key === "Escape") box.classList.add("hidden");
  });

  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.classList.add("hidden");
    }
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

function mins(t) {
  let [h,m] = t.split(":").map(Number);
  return h*60+m;
}

function fmtDuration(a,b) {
  let d = mins(b)-mins(a);
  if (d < 0) d += 1440;
  return `${d} Min.`;
}

function normalizeTimeInput() {
  // Native iPhone time picker liefert bereits HH:MM.
}

function search() {
  normalizeTimeInput();
  if (!DATA) return;

  const from = $("from").value.trim();
  const to = $("to").value.trim();
  const after = mins($("time").value || "00:00");
  const selectedDate = $("date").value;

  if (!from || !to) {
    $("count").textContent = "";
    $("results").innerHTML =
      `<div class="empty">Bitte bei „Von“ und „Nach“ eine Haltestelle auswählen oder eingeben.</div>`;
    return;
  }

  let arr = [];

  const activeLines = DATA.lines
    .filter(l => activeType === "all" || l.type === activeType)
    .filter(l => !l.validFrom || selectedDate >= l.validFrom)
    .filter(l => !l.validUntil || selectedDate <= l.validUntil);

  activeLines.forEach(line => {
    const nfrom = normalizeText(from);
    const nto = normalizeText(to);
    const findStopIndex = (stops, query) => {
      const q = normalizeText(query);
      if (!q) return -1;
      // First prefer an exact normalized match.
      let i = stops.findIndex(s => normalizeText(s) === q);
      if (i >= 0) return i;
      // Also allow typing a shortened stop name, e.g. "Rio Iro" for
      // the displayed stop "Río Iro Ntra. Sra. Remedios".
      i = stops.findIndex(s => normalizeText(s).startsWith(q));
      return i;
    };
    const fi = findStopIndex(line.stops, from);
    const ti = findStopIndex(line.stops, to);

    if (fi < 0 || ti < 0 || ti <= fi) return;

    const candidates = line.trips
      .map((trip, idx) => ({line, trip, idx, fi, ti, a: trip[fi], b: trip[ti]}))
      .filter(x => x.a && x.a !== "--");

    // Normalfall: nächste Verbindung ab der gewünschten Uhrzeit.
    const upcoming = candidates
      .filter(x => mins(x.a) >= after)
      .sort((x,y) => mins(x.a) - mins(y.a));

    if (upcoming.length) {
      arr.push(...upcoming);
    } else if (candidates.length) {
      // Keine spätere Fahrt mehr: erste veröffentlichte Fahrt des Tages.
      candidates.sort((x,y) => mins(x.a) - mins(y.a));
      arr.push(candidates[0]);
    }
  });

  arr.sort((x,y) => mins(x.a) - mins(y.a));
  $("count").textContent = arr.length ? `${arr.length} gefunden` : "";

  $("results").innerHTML = arr.slice(0,12).map(x => `
    <article class="result ${x.line.type}" onclick='openDetail(${JSON.stringify(x).replace(/'/g,"&#39;")})'>
      <span class="badge ${x.line.type}">${x.line.type==="bus"?"🚌":"🚋"} ${x.line.name}</span>
      <span class="direction">${escapeHtml(x.line.direction)}</span>
      <div class="times">
        <strong>${x.a} → ${x.b === "--" ? "Ankunft offen" : x.b}</strong>
        <span class="dur">${x.b === "--" ? "Keine veröffentlichte Ankunftszeit" : fmtDuration(x.a,x.b) + "　›"}</span>
      </div>
      <div class="route-mini">${escapeHtml(from)} → ${escapeHtml(to)}</div>
    </article>
  `).join("") || `<div class="empty">Keine direkte Verbindung für diese Haltestellen gefunden.</div>`;
}

function openDetail(x) {
  const l = x.line;
  const stops = l.stops
    .map((name,i) => ({name,time:x.trip[i],i}));

  const visible = stops.map(s => {
    const personal = s.i === x.fi || s.i === x.ti;
    const start = s.i === 0, end = s.i === l.stops.length-1;

    return `<div class="stop ${personal?"personal":""} ${start?"start":""} ${end?"end":""} ${s.time === "--" ? "no-time" : ""}">
      <div class="time">${s.time === "--" ? "" : s.time}</div>
      <div class="dot"></div>
      <div class="name">${escapeHtml(s.name)}
        ${personal ? `<span class="tag">${s.i===x.fi?"Dein Einstieg":"Dein Ziel"}</span>` : ""}
      </div>
    </div>`;
  }).join("");

  $("detailBody").innerHTML = `
    <div class="detail-head">
      <span class="badge ${l.type}">${l.type==="bus"?"🚌":"🚋"} ${l.name}</span>
      <div>${escapeHtml(l.direction)}</div>
    </div>
    <div class="summary">
      <div><strong>${x.a}</strong><br><span>Dein Einstieg<br>${escapeHtml(l.stops[x.fi])}</span></div>
      <div>${x.b === "--" ? "Ankunft offen" : fmtDuration(x.a,x.b)}</div>
      <div style="text-align:right"><strong>${x.b === "--" ? "Ankunft offen" : x.b}</strong><br><span>Dein Ziel<br>${escapeHtml(l.stops[x.ti])}</span></div>
    </div>
    <div class="timeline">${visible}</div>
    <div class="note">
      Fahrplan gültig vom ${new Date(l.validFrom).toLocaleDateString("de-DE")} bis ${new Date(l.validUntil).toLocaleDateString("de-DE")}.
    </div>`;
  $("detail").classList.remove("hidden");
}

function closeDetail() {
  $("detail").classList.add("hidden");
}

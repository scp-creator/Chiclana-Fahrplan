
let DATA, activeType = "bus", stopNames = [];

const $ = id => document.getElementById(id);

fetch("data.json")
  .then(r => r.json())
  .then(d => {
    DATA = d;
    init();
  });

function init() {
  stopNames = [...new Set(DATA.lines.flatMap(l => l.stops))].sort((a,b) =>
    a.localeCompare(b, "de")
  );

  const now = new Date();
  $("date").value = now.toISOString().slice(0,10);

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
    const q = input.value.trim().toLowerCase();

    // Empty field: show all available stops. While typing: show matching stops.
    const matches = stopNames
      .filter(name => !q || name.toLowerCase().includes(q))
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

function search() {
  if (!DATA) return;

  const from = $("from").value.trim();
  const to = $("to").value.trim();
  const after = mins($("time").value || "00:00");

  // Until both stops are selected/entered, don't show fake connections.
  if (!from || !to) {
    $("count").textContent = "";
    $("results").innerHTML =
      `<div class="empty">Bitte bei „Von“ und „Nach“ eine Haltestelle auswählen oder eingeben.</div>`;
    return;
  }

  let arr = [];

  DATA.lines
    .filter(l => activeType === "all" || l.type === activeType)
    .forEach(line => {
      const fi = line.stops.findIndex(s => s.toLowerCase() === from.toLowerCase());
      const ti = line.stops.findIndex(s => s.toLowerCase() === to.toLowerCase());

      if (fi < 0 || ti < 0 || ti <= fi) return;

      line.trips.forEach((trip, idx) => {
        const a = trip[fi], b = trip[ti];
        if (a === "--" || b === "--" || mins(a) < after) return;
        arr.push({line, trip, idx, fi, ti, a, b});
      });
    });

  arr.sort((x,y) => mins(x.a)-mins(y.a));
  $("count").textContent = arr.length ? `${arr.length} gefunden` : "";

  $("results").innerHTML = arr.slice(0,12).map(x => `
    <article class="result ${x.line.type}" onclick='openDetail(${JSON.stringify(x).replace(/'/g,"&#39;")})'>
      <span class="badge ${x.line.type}">${x.line.type==="bus"?"🚌":"🚋"} ${x.line.name}</span>
      <span class="direction">${escapeHtml(x.line.direction)}</span>
      <div class="times">
        <strong>${x.a} → ${x.b}</strong>
        <span class="dur">${fmtDuration(x.a,x.b)}　›</span>
      </div>
      <div class="route-mini">${escapeHtml(from)} → ${escapeHtml(to)}</div>
    </article>
  `).join("") || `<div class="empty">Keine direkte Verbindung mit diesen Angaben gefunden.</div>`;
}

function openDetail(x) {
  const l = x.line;
  const stops = l.stops
    .map((name,i) => ({name,time:x.trip[i],i}))
    .filter(s => s.time !== "--");

  const visible = stops.map(s => {
    const personal = s.i === x.fi || s.i === x.ti;
    const start = s.i === 0, end = s.i === l.stops.length-1;

    return `<div class="stop ${personal?"personal":""} ${start?"start":""} ${end?"end":""}">
      <div class="time">${s.time}</div>
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
      <div>${fmtDuration(x.a,x.b)}</div>
      <div style="text-align:right"><strong>${x.b}</strong><br><span>Dein Ziel<br>${escapeHtml(l.stops[x.ti])}</span></div>
    </div>
    <div class="timeline">${visible}</div>
    <div class="note">
      Fahrplan gültig ab ${new Date(l.validFrom).toLocaleDateString("de-DE")}.<br>
      Die vollständige Tabellenübernahme wird mit weiteren Fahrplandaten ergänzt.
    </div>`;
  $("detail").classList.remove("hidden");
}

function closeDetail() {
  $("detail").classList.add("hidden");
}

(() => {
  // Cleaned bars
  // - Reads pipi.csv
  // - r = luna, m = meowth, t = tom, v = garfield
  // - Bars scale on a fixed global max (normal chart behavior)
  // - Updates on ps:month-change WITHOUT resetting to 0
  // - No globals / no collisions

  const CSV_PATH = "data/pipi.csv";
  const ROOT_ID = "cleaned-bars";
  const root = document.getElementById(ROOT_ID);
  if (!root) return;

  const PEOPLE = [
    { key: "t", name: "Tom",      color: "#f39826" },
    { key: "m", name: "Meowth",   color: "#f27222" },
    { key: "v", name: "Garfield", color: "#c22413" },
    { key: "r", name: "Luna",     color: "#7f050b" }
  ];

  let dataByMonth = new Map(); // month -> {t,m,v,r}
  let globalMax = 1;
  let currentMonth = null;

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const header = lines[0].split(",").map(s => s.trim());
    const idxMonth = header.indexOf("month");

    const idx = {};
    PEOPLE.forEach(p => idx[p.key] = header.indexOf(p.key));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(s => s.trim());
      const month = cols[idxMonth];
      if (!month) continue;

      const obj = {};
      PEOPLE.forEach(p => {
        const j = idx[p.key];
        const v = j >= 0 ? Number(cols[j]) : 0;
        obj[p.key] = Number.isFinite(v) ? v : 0;
      });

      rows.push({ month, ...obj });
    }
    return rows;
  }

  function buildIndex(rows) {
    dataByMonth = new Map();
    globalMax = 1;

    rows.forEach(r => {
      const obj = {};
      PEOPLE.forEach(p => {
        obj[p.key] = r[p.key] ?? 0;
        globalMax = Math.max(globalMax, obj[p.key]);
      });
      dataByMonth.set(r.month, obj);
    });
  }

  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function renderSkeleton() {
    root.innerHTML = "";

    PEOPLE.forEach(p => {
      const block = el("div", "cleaned-person");
      block.dataset.person = p.key;

      const name = el("div", "cleaned-name");
      name.textContent = p.name;

      const track = el("div", "cleaned-track");
      const fill = el("div", "cleaned-fill");
      fill.style.background = p.color;
      fill.style.width = "0%"; // will be set on first month event
      fill.dataset.fill = "1";

      track.appendChild(fill);
      block.appendChild(name);
      block.appendChild(track);
      root.appendChild(block);
    });
  }

  function setBarsForMonth(month) {
    const row = dataByMonth.get(month);
    if (!row) return;

    currentMonth = month;

    PEOPLE.forEach(p => {
      const block = root.querySelector(`.cleaned-person[data-person="${p.key}"]`);
      if (!block) return;

      const fill = block.querySelector(".cleaned-fill");
      if (!fill) return;

      const value = row[p.key] ?? 0;
      const pct = (globalMax > 0) ? (value / globalMax) * 100 : 0;

      // smooth update: width transition is in CSS; we never force to 0
      requestAnimationFrame(() => {
        fill.style.width = `${pct.toFixed(2)}%`;
      });
    });
  }

  async function init() {
    const text = await fetch(CSV_PATH).then(r => r.text());
    const rows = parseCSV(text);

    buildIndex(rows);
    renderSkeleton();

    // If heatmap already dispatched, we might have missed it.
    // So: set an initial month to the first CSV month (if exists),
    // then future updates will come via ps:month-change.
    if (rows.length > 0) {
      setBarsForMonth(rows[0].month);
    }
  }

  // Listen to month changes from heatmap.js
  window.addEventListener("ps:month-change", (e) => {
    const month = e?.detail?.month;
    if (!month) return;
    if (month === currentMonth) return;
    setBarsForMonth(month);
  });

  init().catch(console.error);
})();
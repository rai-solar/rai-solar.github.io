// cabz · site bar
// Every page loads site.js (the map of the site, built by _build/build.py) and this file:
//   <script src="../../site.js" defer></script>
//   <script src="../../nav.js" data-path="pp/mouna/poids.html" [data-version="<id>"] defer></script>
// It draws one bar on top of every page: where you are (cabz / pp / mouna), the other
// projects (‹ ›), the index of everything, and the versions of the project as a git line.
// The bar always stays on top, on every page.
(() => {
  "use strict";
  const me = document.currentScript;
  const S = window.CABZ;
  if (!me || !S) return;

  const root = new URL(".", me.src).href;
  const path = me.dataset.path || "index.html";
  const viewing = me.dataset.version || "";
  const local = location.protocol === "file:";
  // file:// can't open folders, so point straight at their index.html
  const url = (p) => root + p + (local && (p === "" || p.endsWith("/")) ? "index.html" : "");
  const BRAND = "–CABeZa";
  // C A B Z evenly spaced, the small e and a falling in the gaps after B and Z
  // set like the "—HEAD" wordmark, in Spectral: capitals with one even gap between them,
  // then the long dash (the tabs still say CABeZa)
  const BRAND_HTML = '<span class="brand" aria-label="CABeZa"><b>C</b><b>A</b><b>B</b><b>Z</b><b class="dash">—</b></span>';

  // Spectral has to be declared on the page itself (fonts don't load from inside a shadow root)
  if (!document.querySelector("link[data-cabz-font]")) {
    const f = document.createElement("link");
    f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Spectral:wght@500;600&display=swap";
    f.setAttribute("data-cabz-font", "");
    document.head.appendChild(f);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ddmmyy = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y.slice(2)}`; };

  // the home page's own projects (lisière, soleil) sit in a section with an empty id
  let project, section;
  for (const s of S.sections) for (const p of s.projects) if (path.startsWith(p.id + "/")) { project = p; section = s; }
  if (!section) section = S.sections.find((s) => s.id && path.startsWith(s.id + "/"));
  const page = project ? path.slice(project.id.length + 1) : "";

  // versions
  const vs = project ? project.versions : [];
  let cur = vs.findIndex((v) => (viewing ? v.id === viewing : v.live));
  if (cur < 0) cur = vs.length - 1;
  const past = vs.length > 1 && !vs[cur].live;
  const vHref = (v) => {
    const keep = page !== "index.html" && v.pages.includes(page) ? page : "";
    return url(project.id + "/" + (v.live ? "" : "_v/" + v.id + "/") + keep);
  };
  const vName = (i) => "v" + String(i).padStart(2, "0");
  const vLabel = (i) => `<b>${vName(i)}</b> ${ddmmyy(vs[i].date)} <span>${esc(vs[i].msg)}</span>`;

  // neighbours inside the section
  let prev, next;
  if (project && section.projects.length > 1) {
    const i = section.projects.indexOf(project), n = section.projects.length;
    prev = section.projects[(i - 1 + n) % n];
    next = section.projects[(i + 1) % n];
  }
  const pHref = (p) => url(p.href);

  const crumbs = [`<a class="c home${!section && path === "index.html" ? " here" : ""}" href="${url("")}">${BRAND_HTML}</a>`];
  if (section && section.id) crumbs.push(`<i>/</i><a class="c${project ? "" : " here"}" href="${url(section.id + "/")}" title="${esc(section.title)}">${esc(section.short)}</a>`);
  if (project) crumbs.push(`<i>/</i><a class="c here" href="${url(project.id + "/")}" title="${esc(project.title)}">${esc(project.name)}</a>`);
  if (page && page !== "index.html") crumbs.push(`<span class="pg"><i>/</i> ${esc(page.replace(/\.html$/, ""))}</span>`);

  const panel = S.sections.map((s) => `
    <section>
      <a class="sh${s === section && !project ? " here" : ""}" href="${url(s.id ? s.id + "/" : "")}"><b>${s.id ? esc(s.short) : BRAND_HTML}</b> ${esc(s.title)}</a>
      <ol>${s.projects.map((p) => `
        <li><a href="${pHref(p)}"${p === project ? ' class="here" aria-current="page"' : ""}>
          <span class="n">${esc(p.name)}${p.versions.length > 1 ? `<span class="g" title="${p.versions.length} versions">${p.versions.map(() => "<u></u>").join("")}</span>` : ""}</span>
          <span class="t">${p.title.replace(/\s/g, "-") === p.name ? "" : esc(p.title)}${p.note ? ` <em>${esc(p.note)}</em>` : ""}</span>
        </a></li>`).join("")}
      </ol>
    </section>`).join("");

  // the layout grid: 8 columns, 8px gap, 16px margin (same numbers as cabz.css)
  const GRID = { cols: 8, gap: 8, margin: 16 };
  let gridOn = false;
  try { gridOn = localStorage.getItem("cabz-grid") === "1"; } catch (e) {}

  const host = document.createElement("div");
  host.setAttribute("data-cabz-nav", "");
  const sh = host.attachShadow({ mode: "open" });
  sh.innerHTML = `
<style>
  :host { all: initial; --cols: ${GRID.cols}; --gap: ${GRID.gap}px; --m: ${GRID.margin}px; }
  * { box-sizing: border-box; }
  a, button { color: inherit; text-decoration: none; font: inherit; letter-spacing: inherit; }
  button { background: none; border: 0; padding: 0; cursor: pointer; }
  a:focus-visible, button:focus-visible { outline: 1px solid #fff; outline-offset: 3px; }
  .cols { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); column-gap: var(--gap); padding: 0 var(--m); }

  .wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483646;
    font: 400 13px/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace; letter-spacing: .06em; color: #fff;
    transition: transform .35s ease; }
  .bar { height: 32px; align-items: center;
    background: rgba(0, 0, 0, .86); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    border-bottom: 3px solid ${past ? "#cb5f3c" : "rgba(0,0,0,.86)"}; }

  /* columns 1–2: where you are · 3–6: versions · 7–8: tools */
  .here-group { grid-column: 1 / 7; display: flex; align-items: center; gap: 16px; min-width: 0; }
  .crumbs { flex: none; max-width: 60%; display: flex; align-items: center; gap: 8px; min-width: 0; white-space: nowrap; overflow: hidden; }
  .crumbs > i, .pg i { font-style: normal; color: #555; }
  .brand { --g: 0.42em; display: inline-flex; align-items: baseline;
    font: 600 16px/1 Spectral, Georgia, "Times New Roman", serif; letter-spacing: 0; }
  .brand b { position: relative; font-weight: inherit; }
  .brand b + b { margin-left: var(--g); }
  .brand .dash { font-weight: 500; }
  .brand b:last-child { margin-right: calc(var(--g) * 0.8); }
  .c { color: #999; }
  .c:hover, .c.here { color: #fff; }
  .pg { color: #777; overflow: hidden; text-overflow: ellipsis; }
  .pg i { margin-right: 4px; }
  .vg { flex: 1; display: flex; align-items: center; gap: 16px; min-width: 0; }
  .tools { grid-column: 7 / -1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }

  ol.v { list-style: none; margin: 0; padding: 0; display: flex; align-items: center; flex: none; }
  ol.v li { display: flex; align-items: center; }
  ol.v li + li::before { content: ""; width: 16px; height: 1px; background: #666; }
  .dot { display: block; width: 9px; height: 9px; border: 1px solid #fff; border-radius: 50%; transition: transform .15s; }
  .dot:hover, .dot:focus-visible { transform: scale(1.35); background: #fff; outline: none; }
  .dot.cur { background: #fff; }
  .past .dot.cur { background: #cb5f3c; border-color: #cb5f3c; }
  .info { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #777; }
  .info b { font-weight: 400; color: #fff; }
  .latest, .warn { color: #cb5f3c; white-space: nowrap; }
  .latest:hover { color: #fff; }

  .steps { display: flex; }
  .step { display: grid; place-items: center; width: 24px; height: 24px; font-size: 15px; color: #999; }
  .step:hover { color: #fff; }
  .btn { padding: 4px 8px; border: 1px solid #444; border-radius: 2px; color: #ccc; }
  .btn:hover, .btn[aria-expanded="true"], .btn[aria-pressed="true"] { border-color: #fff; color: #fff; }
  .btn[aria-pressed="true"] { border-color: #ff2a68; color: #ff2a68; }

  .panel { background: rgba(0, 0, 0, .94); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    padding-top: 32px; padding-bottom: 40px; row-gap: 32px;
    max-height: calc(100vh - 32px); overflow: auto; border-bottom: 1px solid #222; }
  .panel[hidden] { display: none; }
  .panel section { grid-column: span 4; display: grid; grid-template-columns: subgrid; align-content: start; }
  .sh { grid-column: 1 / -1; margin-bottom: 16px; color: #777; }
  .sh b { font-weight: 400; color: #fff; margin-right: 8px; }
  .sh:hover, .sh.here { color: #fff; }
  .panel ol { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; list-style: none; margin: 0; padding: 0; }
  .panel li { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; }
  .panel li a { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: baseline; padding: 4px 0; color: #888; }
  .panel li a:hover, .panel li a.here { color: #fff; }
  .panel .n { grid-column: 1 / 3; display: flex; align-items: center; font-size: 16px; letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .panel li a.here .n::before { content: "→"; margin-right: 8px; }
  .panel .t { grid-column: 3 / -1; display: flex; align-items: center; gap: 8px; color: #555; white-space: nowrap; overflow: hidden; }
  .panel li a:hover .t { color: #999; }
  .panel em { font-style: normal; color: #444; }
  .g { display: inline-flex; align-items: center; margin-left: 12px; flex: none; vertical-align: middle; }
  .g u { width: 5px; height: 5px; border: 1px solid #555; border-radius: 50%; }
  .g u + u { margin-left: 8px; position: relative; }
  .g u + u::before { content: ""; position: absolute; right: 100%; top: 50%; width: 8px; height: 1px; background: #555; }
  .g u:last-child { background: #555; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  /* the grid overlay */
  .overlay { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
  .overlay[hidden] { display: none; }
  .overlay i { background: rgba(255, 42, 104, .08); border-left: 1px solid rgba(255, 42, 104, .45); border-right: 1px solid rgba(255, 42, 104, .45); }
  .overlay::before, .overlay::after { content: ""; position: absolute; top: 0; bottom: 0; width: var(--m); background: repeating-linear-gradient(45deg, rgba(255,42,104,.10) 0 1px, transparent 1px 6px); }
  .overlay::before { left: 0; }
  .overlay::after { right: 0; }
  .overlay span { position: fixed; right: var(--m); bottom: 8px; font: 400 10px/1 ui-monospace, Menlo, monospace; letter-spacing: .06em; color: #ff2a68; background: rgba(0,0,0,.7); padding: 4px 8px; }

  @media (max-width: 600px) {
    .here-group { gap: 8px; }
    .tools { grid-column: 7 / -1; }
    .pg, .info, .warn, .latest, .steps { display: none; }
    ol.v li + li::before { width: 8px; }
    .panel section { grid-column: 1 / -1; }
    .panel .n { grid-column: 1 / 5; }
    .panel .t { grid-column: 5 / -1; }
  }
  @media (max-width: 600px) and (min-width: 0) { .tools { gap: 4px; } .btn { padding: 4px 6px; } }
  @media (prefers-reduced-motion: reduce) { .wrap, .dot { transition: none; } }
</style>
<div class="wrap${past ? " past" : ""}">
  <nav class="bar cols" aria-label="${BRAND}">
    <div class="here-group">
    <div class="crumbs">${crumbs.join("")}</div>
    <div class="vg">${vs.length > 1 ? `
      <ol class="v" aria-label="versions">${vs.map((v, i) => `<li><a class="dot${i === cur ? " cur" : ""}" href="${vHref(v)}" data-i="${i}"${i === cur ? ' aria-current="true"' : ""}><span class="sr">${vName(i)}, ${ddmmyy(v.date)}, ${esc(v.msg)}</span></a></li>`).join("")}</ol>
      <span class="info" aria-hidden="true">${vLabel(cur)}</span>
      ${past ? `<a class="latest" href="${vHref(vs[vs.length - 1])}">latest →</a>` : ""}` : ""}
      ${local ? `<span class="warn" title="pages that load data need a local server: double-click open-locally.command">local file</span>` : ""}
    </div>
    </div>
    <div class="tools">
      ${prev ? `<span class="steps">
        <a class="step" href="${pHref(prev)}" title="${esc(prev.name)}" aria-label="previous: ${esc(prev.name)}">‹</a>
        <a class="step" href="${pHref(next)}" title="${esc(next.name)}" aria-label="next: ${esc(next.name)}">›</a></span>` : ""}
      <button class="btn grid-btn" type="button" aria-pressed="${gridOn}" title="show the 8-column grid">grid</button>
      <button class="btn menu" type="button" aria-expanded="false" aria-controls="panel">index</button>
    </div>
  </nav>
  <div class="panel cols" id="panel" hidden>${panel}</div>
</div>
<div class="overlay cols" aria-hidden="true"${gridOn ? "" : " hidden"}>${"<i></i>".repeat(GRID.cols)}<span>${GRID.cols} col · ${GRID.gap}px gap · ${GRID.margin}px margin</span></div>`;
  // the bar lives on <html>, outside <body>, so it stays put whatever the page does
  document.documentElement.appendChild(host);

  // full-screen projects start below the bar instead of under it: <body> becomes the
  // viewport for their fixed layers (the transform makes it their containing block)
  const off = project && project.offset;
  if (off === true || (Array.isArray(off) && off.includes(page))) {
    const st = document.createElement("style");
    st.textContent = "html{height:100%;padding-top:32px!important;box-sizing:border-box!important}" +
      "body{height:100%!important;min-height:0!important;transform:translateZ(0)}";
    document.head.appendChild(st);
  }

  const wrap = sh.querySelector(".wrap");
  const menu = sh.querySelector(".menu");
  const pnl = sh.querySelector(".panel");
  const info = sh.querySelector(".info");
  const isOpen = () => !pnl.hidden;
  const setMenu = (open) => {
    pnl.hidden = !open;
    menu.setAttribute("aria-expanded", String(open));
    if (open) { const h = sh.querySelector(".panel a.here") || sh.querySelector(".panel a"); if (h) h.focus({ preventScroll: true }); }
  };

  menu.addEventListener("click", () => setMenu(!isOpen()));

  const gridBtn = sh.querySelector(".grid-btn");
  const overlay = sh.querySelector(".overlay");
  gridBtn.addEventListener("click", () => {
    gridOn = !gridOn;
    overlay.hidden = !gridOn;
    gridBtn.setAttribute("aria-pressed", String(gridOn));
    try { localStorage.setItem("cabz-grid", gridOn ? "1" : "0"); } catch (e) {}
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) { setMenu(false); menu.focus(); } });
  document.addEventListener("pointerdown", (e) => { if (isOpen() && !e.composedPath().includes(host)) setMenu(false); });

  if (info) {
    sh.querySelectorAll(".dot").forEach((d) => {
      const show = () => { info.innerHTML = vLabel(+d.dataset.i); };
      d.addEventListener("pointerenter", show);
      d.addEventListener("focus", show);
    });
    sh.querySelector("ol.v").addEventListener("pointerleave", () => { info.innerHTML = vLabel(cur); });
  }


  // index pages: a small git line next to every project that has older versions
  document.querySelectorAll("[data-project]").forEach((el) => {
    let p;
    for (const s of S.sections) for (const q of s.projects) if (q.id === el.dataset.project) p = q;
    const meta = el.querySelector(".meta");
    if (!p || !meta || p.versions.length < 2) return;
    const g = document.createElement("span");
    g.className = "vers";
    g.title = p.versions.length + " versions, v00–" + "v" + String(p.versions.length - 1).padStart(2, "0");
    g.innerHTML = p.versions.map(() => "<i></i>").join("");
    meta.prepend(g);
  });
})();

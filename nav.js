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
  // projects marked "cursor": "normal" in projects.json keep the system cursor instead of the home page's
  const plainCursor = S.sections.some((s) => s.projects.some((p) => p.cursor === "normal" && (me.dataset.path || "").startsWith(p.id + "/")));
  if (plainCursor) {
    // nothing to load
  } else if (!document.querySelector('link[data-cabz-cursor]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = root + "cursor.css";
    css.setAttribute("data-cabz-cursor", ""); document.head.append(css);
  }
  if (!plainCursor && !window.cabzCursorStarted && !document.querySelector('script[src="' + root + 'cursor.js"]')) {
    const script = document.createElement("script"); script.src = root + "cursor.js";
    document.head.append(script);
  }
  const path = me.dataset.path || "index.html";
  const viewing = me.dataset.version || new URLSearchParams(location.search).get("version") || "";
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
    f.href = "https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600&display=swap";
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
    if (v.href) return url(v.href);
    const keep = page !== "index.html" && v.pages.includes(page) ? page : "";
    return url(project.id + "/" + (v.live ? "" : "_v/" + v.id + "/") + keep);
  };
  const vNameOf = (i, version) => version?.label || "v" + String(i).padStart(2, "0");
  const versionText = (version, i) => `${vNameOf(i, version)} [${version?.date ? ddmmyy(version.date) : "—"}]`;
  const vLabel = (i) => esc(versionText(vs[i], i));

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
  // an older version can carry the name the project had then
  if (project) crumbs.push(`<i>/</i><a class="c here" href="${url(project.id + "/")}" title="${esc(project.title)}">${esc(vs[cur]?.header || project.activeLabel || project.name)}</a>`);
  if (page && page !== "index.html") crumbs.push(`<span class="pg"><i>/</i> ${esc(page.replace(/\.html$/, ""))}</span>`);

  const versionMarks = (p, includeSingle) => {
    const versions = p.versions.length ? p.versions : [{}];
    const count = includeSingle ? versions.length : p.versions.length;
    return count > (includeSingle ? 0 : 1)
      ? `<span class="g${includeSingle ? " before" : ""}">${versions.map((v, i) => `<u data-tooltip="${esc(versionText(v, i))}" aria-label="${esc(versionText(v, i))}"></u>`).join("")}</span>` : "";
  };
  const projectTitle = (p) => p.strike && p.title.startsWith(p.strike + " ")
    ? `<s>${esc(p.strike)}</s>${esc(p.title.slice(p.strike.length))}` : esc(p.title);
  const panel = S.sections.map((s) => `
    <section>
      <a class="sh${s === section && !project ? " here" : ""}" href="${url(s.id ? s.id + "/" : "")}"><b>${s.id ? esc(s.short) : BRAND_HTML}</b> ${esc(s.title)}</a>
      <ol>${s.projects.map((p) => `
        <li><a href="${pHref(p)}"${p === project ? ' class="here" aria-current="page"' : ""}>
          <span class="n">${s.id === "pp" ? versionMarks(p, true) : ""}${esc(p === project ? (p.activeLabel || p.name) : p.name)}${s.id !== "pp" ? versionMarks(p, false) : ""}</span>
          <span class="t">${p.title.replace(/\s/g, "-") === p.name ? "" : projectTitle(p)}${p.note ? ` <em>${esc(p.note)}</em>` : ""}</span>
        </a></li>`).join("")}
      </ol>
    </section>`).join("");

  // the layout grid: 8 columns, 8px gap, 8px margin (same numbers as cabz.css)
  const GRID = { cols: 8, gap: 8, margin: 8 };


  const host = document.createElement("div");
  host.setAttribute("data-cabz-nav", "");
  host.toggleAttribute("data-home", document.body.classList.contains("home"));
  const sh = host.attachShadow({ mode: "open" });
  sh.innerHTML = `
<style>
  /* The shared bar follows the actual page surface, including dark project pages. */
  :host { all: initial; --cols: ${GRID.cols}; --gap: ${GRID.gap}px; --m: ${GRID.margin}px;
    --nbg: var(--nav-bg, var(--bg, #efb4a5)); --nfg: var(--nav-fg, var(--fg, #222222));
    --nsky: var(--nbg); }
  :host([data-dark]) { --nav-fg: #C16CFF; }
  :host([data-home]) { --nfg: var(--fg, #222222); }
  :host([data-surface]) .bar { background: var(--nbg); }
  * { box-sizing: border-box; }
  a, button { color: inherit; text-decoration: none; font: inherit; letter-spacing: inherit; cursor: var(--cursor, pointer); }
  button { background: none; border: 0; padding: 0; cursor: var(--cursor, pointer); }
  a:focus-visible, button:focus-visible { outline: 1px solid currentColor; outline-offset: 3px; }
  .cols { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); column-gap: var(--gap); padding: 0 var(--m); }

  .wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483646;
    font: 400 13px/1 Spectral, Georgia, "Times New Roman", serif; letter-spacing: .06em; color: var(--nfg); }
  .bar { height: 32px; align-items: center; background: transparent;
    border-bottom: 1px solid var(--nfg); }

  /* columns 1–6: where you are + versions · 7–8: tools */
  .here-group { grid-column: 1 / 7; display: flex; align-items: center; gap: 16px; min-width: 0; }
  .crumbs { flex: none; max-width: 60%; display: flex; align-items: center; gap: 8px; min-width: 0; white-space: nowrap; overflow: hidden; }
  .crumbs > i, .pg i { font-style: normal; opacity: 1; }
  .brand { --g: 0.42em; display: inline-flex; align-items: baseline;
    font: 600 16px/1 Spectral, Georgia, "Times New Roman", serif; letter-spacing: 0; }
  .brand b { position: relative; font-weight: inherit; }
  .brand b + b { margin-left: var(--g); }
  .brand .dash { font-weight: 500; }
  .brand b:last-child { margin-right: calc(var(--g) * 0.8); }
  .c { opacity: 1; }
  .c:hover, .c.here { opacity: 1; }
  .pg { opacity: 1; overflow: hidden; text-overflow: ellipsis; }
  .pg i { margin-right: 4px; }
  .vg { flex: 1; display: flex; align-items: center; gap: 16px; min-width: 0; }
  .tools { grid-column: 7 / -1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }

  ol.v { list-style: none; margin: 0; padding: 0; display: flex; align-items: center; flex: none; }
  ol.v li { display: flex; align-items: center; }
  ol.v li + li::before { content: ""; width: 16px; height: 1px; background: var(--nfg); opacity: 1; }
  .dot { display: block; width: 9px; height: 9px; border: 1px solid var(--nfg); border-radius: 50%; }
  .dot:hover, .dot.cur:hover, .dot:focus-visible { background: #222222; }
  .dot:focus-visible { outline: 1px solid var(--nfg); outline-offset: 3px; }
  .dot.cur { background: var(--nfg); }
  .info { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 1; }
  .info b { font-weight: 400; }
  .latest, .warn { color: var(--nfg); white-space: nowrap; }
  .latest:hover { text-decoration: underline; }

  .steps { display: flex; position: relative; }
  .step-name { position: absolute; top: calc(100% + 8px); right: 0; padding: 3px 7px; white-space: nowrap; pointer-events: none;
    background: var(--nsky); color: var(--nfg); font: 400 13px/1.3 Spectral, Georgia, serif; letter-spacing: .02em; }
  .step-name[hidden] { display: none; }
  .step { display: grid; place-items: center; width: 24px; height: 24px; font-size: 15px; opacity: 1; }
  .step:hover { opacity: 1; }
  .btn { padding: 4px 8px; border: 1px solid var(--nfg); border-radius: 2px; opacity: 1; }
  .btn:hover, .btn[aria-expanded="true"], .btn[aria-pressed="true"] { opacity: 1; }
  .btn[aria-pressed="true"] { background: var(--nfg); color: var(--nbg); }
  .grid-btn, .grid-btn[aria-pressed="true"] { width: 28px; height: 24px; display: grid; place-items: center; padding: 0; border: 0; background: transparent; color: inherit; }
  .grid-btn svg { display: block; width: 22px; height: 22px; overflow: visible; }
  .cursor-dev { font-size: 11px; padding: 4px 2px; }
  .cursor-dev:hover { text-decoration: underline; text-underline-offset: 3px; }
  @media (pointer: coarse) { .cursor-dev { display: none; } }
  .grid-btn path { fill: none; stroke: currentColor; stroke-width: 1.1; stroke-linecap: round; }
  :host([data-river]) { --nfg: #f5f2e7; --nsky: #1a2625; }
  :host([data-river]) .bar { background: transparent; border-bottom-color: #f5f2e766; }

  .panel { background: var(--nsky); padding-top: 32px; padding-bottom: 40px; row-gap: 32px;
    max-height: calc(100vh - 32px); overflow: auto; border-bottom: 1px solid var(--nfg); }
  .panel[hidden] { display: none; }
  .panel section { grid-column: span 4; display: grid; grid-template-columns: subgrid; align-content: start; }
  .sh { grid-column: 1 / -1; justify-self: start; margin-bottom: 16px; opacity: 1; }
  .sh b { font-weight: 400; margin-right: 8px; }
  .sh:hover, .sh.here { opacity: 1; }
  .panel ol { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; list-style: none; margin: 0; padding: 0; }
  .panel li { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; border-top: 1px solid var(--nfg); }
  .panel li:last-child { border-bottom: 1px solid var(--nfg); }
  .panel li a { grid-column: 1 / -1; justify-self: start; display: inline-flex; align-items: baseline; gap: 16px; padding: 6px 0; opacity: 1; max-width: 100%; }
  .panel li a:hover, .panel li a.here { opacity: 1; }
  .panel .n { grid-column: 1 / 3; display: flex; align-items: center; font-size: 16px; letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .panel li a.here .n::before { content: "→"; margin-right: 8px; }
  .panel .t { grid-column: 3 / -1; display: flex; align-items: center; gap: 8px; opacity: 1; white-space: nowrap; overflow: hidden; }
  .panel em { font-style: normal; }
  .g { display: inline-flex; align-items: center; margin-left: 16px; flex: none; vertical-align: middle; }
  .g.before { margin-left: 0; margin-right: 16px; }
  .g u { width: 5px; height: 5px; border: 1px solid var(--nfg); border-radius: 50%; }
  .g u + u { margin-left: 8px; position: relative; }
  .g u + u::before { content: ""; position: absolute; right: 100%; top: 50%; width: 8px; height: 1px; background: var(--nfg); }
  .g u:last-child { background: var(--nfg); }
  .g u:hover { background: #222222; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .tooltip {
    position: fixed; z-index: 2147483647; width: max-content;
    max-width: min(34ch, calc(100vw - 16px)); padding: 5px 8px;
    border: 0; background: transparent; color: var(--nfg);
    font: 400 13px/1.3 Spectral, Georgia, serif; letter-spacing: .02em;
    overflow-wrap: anywhere; pointer-events: none;
  }
  .tooltip[hidden] { display: none; }
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
  @media (prefers-reduced-motion: reduce) { .dot { transition: none; } }
</style>
<div class="wrap${past ? " past" : ""}">
  <nav class="bar cols" aria-label="${BRAND}">
    <div class="here-group">
    <div class="crumbs">${crumbs.join("")}</div>
    <div class="vg">${vs.length > 1 ? `
      <ol class="v" aria-label="versions">${vs.map((v, i) => `<li><a class="dot${i === cur ? " cur" : ""}" href="${vHref(v)}" data-i="${i}" data-tooltip="${esc(versionText(v, i))}"${i === cur ? ' aria-current="true"' : ""}><span class="sr">${esc(versionText(v, i))}</span></a></li>`).join("")}</ol>
      <span class="info" aria-hidden="true">${vLabel(cur)}</span>
      ${past ? `<a class="latest" href="${vHref(vs[vs.length - 1])}">latest →</a>` : ""}` : ""}
      ${local ? `<span class="warn" title="pages that load data need a local server: double-click open-locally.command">local file</span>` : ""}
    </div>
    </div>
    <div class="tools">
      ${prev ? `<span class="steps">
        <a class="step" href="${pHref(prev)}" data-name="‹ ${esc(prev.name)}" aria-label="previous: ${esc(prev.name)}">‹</a>
        <a class="step" href="${pHref(next)}" data-name="${esc(next.name)} ›" aria-label="next: ${esc(next.name)}">›</a>
        <span class="step-name" aria-hidden="true" hidden></span></span>` : ""}
      <button class="btn grid-btn" type="button" aria-pressed="false" aria-label="switch to river navigation (R)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3V21"/><path d="M16 3V21"/><path d="M3 8H21"/><path d="M3 16H21"/></svg></button>
      ${plainCursor ? "" : `<button class="cursor-dev" type="button" aria-label="adjust cursor" aria-expanded="false">cursor</button>`}
      <button class="btn menu" type="button" aria-expanded="false" aria-controls="panel">index</button>
    </div>
  </nav>
  <div class="panel cols" id="panel" hidden>${panel}</div>
</div>

<div class="tooltip" id="cabz-tooltip" role="tooltip" hidden></div>`;
  // the bar lives on <html>, outside <body>, so it stays put whatever the page does
  document.documentElement.appendChild(host);

  // Resolve body/root colours instead of assuming every project uses --bg.
  // Dark projects use a readable purple even when their own text is white.
  const rgba = (value) => {
    const channels = value.match(/[\d.]+/g)?.map(Number);
    return channels?.length >= 3 ? [...channels.slice(0, 3), channels[3] ?? 1] : [0, 0, 0, 0];
  };
  const blend = (top, below) => top.slice(0, 3).map((v, i) => v * top[3] + below[i] * (1 - top[3]));
  let themeFrame = 0;
  const syncTheme = () => {
    themeFrame = 0;
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const rootColor = rgba(rootStyle.backgroundColor), bodyColor = rgba(bodyStyle.backgroundColor);
    const fallback = rootStyle.colorScheme.includes("dark") ? [0, 0, 0] : [255, 255, 255];
    const rootSurface = blend(rootColor, fallback);
    const surface = blend(bodyColor, rootSurface);
    const linear = surface.map((v) => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    host.toggleAttribute("data-dark", luminance < .12);
    document.documentElement.classList.toggle("cabz-cursor-dark", luminance < .12 && !document.body.classList.contains("home"));
    const colour = `rgb(${surface.map(Math.round).join(",")})`;
    if (host.style.getPropertyValue("--nav-bg") !== colour) host.style.setProperty("--nav-bg", colour);
    // Some fullscreen projects reserve 32px on a transparent html canvas. Fill
    // only that gap with their page colour so purple never sits on a white strip.
    host.toggleAttribute("data-surface", rootColor[3] < 1 || surface.some((v, i) => Math.abs(v - rootSurface[i]) > 1));
  };
  const scheduleTheme = () => { if (!themeFrame) themeFrame = requestAnimationFrame(syncTheme); };
  const themeObserver = new MutationObserver(scheduleTheme);
  for (const el of [document.documentElement, document.body]) {
    themeObserver.observe(el, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  }
  addEventListener("load", scheduleTheme);
  document.addEventListener("transitionend", scheduleTheme, true);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", scheduleTheme);
  syncTheme();

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
  sh.querySelector('.cursor-dev')?.addEventListener('click', () => dispatchEvent(new Event('cabz:cursor-settings')));
  addEventListener('cabz:cursor-settings-state', event => sh.querySelector('.cursor-dev')?.setAttribute('aria-expanded', String(event.detail.open)));
  const modePaths = [...gridBtn.querySelectorAll("path")];
  const riverRhythms = [
    { frequency: 5.2, speed: 1.7, phase: .3, amplitude: 1.05 },
    { frequency: 7.1, speed: 1.17, phase: 2.4, amplitude: 1.35 },
    { frequency: 4.6, speed: 1.9, phase: 4.9, amplitude: 1.1 },
    { frequency: 6.3, speed: 1.43, phase: 1.2, amplitude: 1.3 }
  ];
  const homeModePage = document.body.classList.contains("home");
  if (!homeModePage) gridBtn.style.display = "none";
  const reduceIcon = matchMedia("(prefers-reduced-motion: reduce)");
  let riverMode = false, iconProgress = 0, iconFrame = 0, iconLast = 0, requestedMode = null;
  const iconGrid = [t => [8, 3 + t * 18], t => [16, 3 + t * 18], t => [3 + t * 18, 8], t => [3 + t * 18, 16]];
  const drawModeIcon = now => {
    iconFrame = 0;
    const dt = Math.min((now - (iconLast || now)) / 1000, .04); iconLast = now;
    const target = riverMode ? 1 : 0;
    iconProgress = reduceIcon.matches ? target : iconProgress + (target - iconProgress) * (1 - Math.exp(-dt * 7));
    if (Math.abs(iconProgress - target) < .001) iconProgress = target;
    modePaths.forEach((path, i) => {
      const points = [];
      for (let k = 0; k <= 24; k++) {
        const t = k / 24, [gx, gy] = iconGrid[i](t);
        const rhythm = riverRhythms[i], clock = reduceIcon.matches ? 0 : now * .001;
        const wave = Math.sin(t * rhythm.frequency - clock * rhythm.speed + rhythm.phase) * rhythm.amplitude
          + Math.sin(t * 10.3 + clock * rhythm.speed * .61 + rhythm.phase * 1.7) * .28;
        const rx = 6 + i * 5.4 - t * 7 + wave, ry = 2 + t * 20;
        points.push(`${k ? 'L' : 'M'}${(gx + (rx - gx) * iconProgress).toFixed(2)} ${(gy + (ry - gy) * iconProgress).toFixed(2)}`);
      }
      path.setAttribute("d", points.join(' '));
    });
    if ((!reduceIcon.matches && riverMode && !document.hidden) || iconProgress !== target) iconFrame = requestAnimationFrame(drawModeIcon);
  };
  const syncMode = mode => {
    riverMode = mode === "river";
    host.toggleAttribute("data-river", riverMode);
    gridBtn.setAttribute("aria-pressed", String(riverMode));
    gridBtn.setAttribute("aria-label", `switch to ${riverMode ? 'grid' : 'river'} navigation (R)`);
    if (!iconFrame) { iconLast = 0; iconFrame = requestAnimationFrame(drawModeIcon); }
  };
  const toggleNavigation = () => {
    if (!homeModePage) return;
    if (window.RiverExperiment) window.RiverExperiment.toggle();
    else { requestedMode = requestedMode === 'river' ? 'grid' : 'river'; syncMode(requestedMode); }
  };
  gridBtn.addEventListener("click", toggleNavigation);
  addEventListener("cabz:navigation-mode", event => syncMode(event.detail.mode));
  // cmd/ctrl+R reloads the page into the other mode; the URL wins over storage, so it carries the mode too
  const reloadInto = mode => {
    try { localStorage.setItem('cabz-navigation-mode', mode); } catch {}
    const url = new URL(location.href);
    url.searchParams.set('mode', mode);
    location.replace(url);
  };
  addEventListener("keydown", event => {
    const target = event.composedPath()[0];
    if (event.key.toLowerCase() !== 'r' || event.repeat || event.altKey || target?.isContentEditable || target?.matches?.('input,textarea,select')) return;
    if (event.metaKey || event.ctrlKey) {
      if (!homeModePage) return;
      event.preventDefault(); reloadInto(riverMode ? 'grid' : 'river');
      return;
    }
    event.preventDefault(); toggleNavigation();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !iconFrame) { iconLast = 0; iconFrame = requestAnimationFrame(drawModeIcon); } });
  if (homeModePage) {
    const riverCSS = document.createElement("link"); riverCSS.rel = "stylesheet"; riverCSS.href = root + "river/river.css"; document.head.append(riverCSS);
    const configScript = document.createElement("script"); configScript.src = root + "river/config.js";
    configScript.onload = () => {
      const experiment = document.createElement("script"); experiment.src = root + "river/river.js";
      experiment.onload = () => { if (requestedMode) window.RiverExperiment.setMode(requestedMode); syncMode(window.RiverExperiment.mode); };
      document.head.append(experiment);
    };
    document.head.append(configScript);
  }
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


  // Project selection pages keep version links; the homepage stays uncluttered.
  document.querySelectorAll("body:not(.home) .list > li[data-project]").forEach((el) => {
    const meta = el.querySelector(".meta");
    let p;
    for (const s of S.sections) for (const q of s.projects) if (q.id === el.dataset.project) p = q;
    if (!meta || !p) return;
    const includeSingle = p.id.startsWith("pp/");
    if (!includeSingle && p.versions.length < 2) return;
    const versions = p.versions.length ? p.versions : [{ live: true, href: p.href, msg: p.title }];
    const g = document.createElement("span");
    g.className = "vers";
    g.innerHTML = versions.map((v, i) => {
      const href = v.href ? url(v.href) : url(p.id + "/" + (v.live ? "" : "_v/" + v.id + "/"));
      const description = versionText(v, i);
      return `<a href="${href}" data-tooltip="${esc(description)}" aria-label="${esc(description)}"><i></i></a>`;
    }).join("");
    meta.prepend(g);
  });

  const stepName = sh.querySelector(".step-name");
  sh.querySelectorAll(".step").forEach((a) => {
    const show = () => { stepName.textContent = a.dataset.name; stepName.hidden = false; };
    const hide = () => { stepName.hidden = true; };
    a.addEventListener("pointerenter", show); a.addEventListener("focus", show);
    a.addEventListener("pointerleave", hide); a.addEventListener("blur", hide);
  });
  // nothing pops up at the pointer along the bar: the versions already show in the bar itself
  sh.querySelectorAll("nav.bar [title], nav.bar [data-tooltip]").forEach((el) => { el.removeAttribute("title"); el.removeAttribute("data-tooltip"); });

  // Custom hints replace native title tooltips, with no timers or fade-in delay.
  for (const root of [sh, document.querySelector(".list")]) {
    root?.querySelectorAll("[title]").forEach((el) => {
      el.dataset.tooltip = el.getAttribute("title");
      el.removeAttribute("title");
    });
  }
  const tooltip = sh.querySelector(".tooltip");
  let hintTarget = null, priorDescription = null;
  const hideHint = () => {
    if (hintTarget) {
      if (priorDescription === null) hintTarget.removeAttribute("aria-describedby");
      else hintTarget.setAttribute("aria-describedby", priorDescription);
    }
    hintTarget = null; priorDescription = null;
    tooltip.hidden = true;
  };
  const positionHint = (x, y) => {
    const box = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(8, Math.min(x + 12, innerWidth - box.width - 8)) + "px";
    tooltip.style.top = Math.max(8, Math.min(y - box.height - 12, innerHeight - box.height - 8)) + "px";
  };
  const showHint = (event) => {
    const target = event.composedPath().find((el) => el instanceof Element && el.hasAttribute("data-tooltip"));
    if (!target || target === hintTarget) return;
    hideHint();
    hintTarget = target;
    priorDescription = target.getAttribute("aria-describedby");
    target.setAttribute("aria-describedby", [priorDescription, "cabz-tooltip"].filter(Boolean).join(" "));
    tooltip.textContent = target.dataset.tooltip;
    tooltip.hidden = false;
    tooltip.style.left = "0px"; tooltip.style.top = "0px";
    const anchor = target.getBoundingClientRect();
    const pointer = event.type.startsWith("pointer");
    positionHint(pointer ? event.clientX : anchor.left, pointer ? event.clientY : anchor.top);
  };
  const leaveHint = (event) => {
    if (hintTarget && !hintTarget.contains(event.relatedTarget)) hideHint();
  };
  for (const root of [document, sh]) {
    root.addEventListener("pointerover", showHint);
    root.addEventListener("pointerout", leaveHint);
    root.addEventListener("pointermove", (event) => {
      if (hintTarget && !tooltip.hidden) positionHint(event.clientX, event.clientY);
    });
    root.addEventListener("focusin", showHint);
    root.addEventListener("focusout", leaveHint);
    root.addEventListener("pointerdown", hideHint);
  }
  addEventListener("resize", hideHint);
  addEventListener("scroll", hideHint, true);
  addEventListener("keydown", (event) => { if (event.key === "Escape") hideHint(); });
})();

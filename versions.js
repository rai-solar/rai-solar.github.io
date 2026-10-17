// cabz · version bar
// Pages of a project with more than one version load this script:
//   <script src="/versions.js" data-project="pp/v00" defer></script>
// Archived snapshots (built into <project>/_v/<id>/ by _build/versions.py) also carry
// data-version="<id>". The bar reads /versions.json, draws the history as a little
// git line, and lets you jump between versions, staying on the same page when it exists.
(() => {
  "use strict";
  const me = document.currentScript;
  const project = me && me.dataset.project;
  if (!project) return;
  const viewing = me.dataset.version || "";

  const ddmmyy = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y.slice(2)}`; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  fetch("/versions.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((all) => { const p = all && all[project]; if (p && p.versions.length > 1) mount(p); })
    .catch(() => {});

  function mount(p) {
    const vs = p.versions;
    const base = "/" + project + "/";
    const parent = base.replace(/[^/]+\/$/, "");
    const here = viewing ? base + "_v/" + viewing + "/" : base;
    let rel = decodeURIComponent(location.pathname);
    rel = rel.startsWith(here) ? rel.slice(here.length) : "";
    if (rel === "") rel = "index.html";
    let cur = vs.findIndex((v) => (viewing ? v.id === viewing : v.live));
    if (cur < 0) cur = vs.length - 1;
    const past = !vs[cur].live;
    const href = (v) => (v.live ? base : base + "_v/" + v.id + "/") +
      (rel !== "index.html" && v.pages.includes(rel) ? rel : "");
    const label = (i) => `<b>v${i + 1}</b> ${ddmmyy(vs[i].date)} <span>${esc(vs[i].msg)}</span>`;

    const host = document.createElement("div");
    host.setAttribute("data-cabz-versions", "");
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
<style>
  :host { all: initial; }
  .bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    height: 30px; box-sizing: border-box; padding: 0 12px;
    display: flex; align-items: center; gap: 14px;
    background: rgba(0, 0, 0, .84);
    -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    border-bottom: 3px solid ${past ? "#cb5f3c" : "rgba(0,0,0,.84)"};
    color: #fff; font: 400 11px/1 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .06em;
    transition: transform .35s ease;
  }
  .bar.min { transform: translateY(calc(-100% + 3px)); }
  .bar::after { content: ""; position: absolute; left: 0; right: 0; top: 100%; height: 12px; }
  a { color: inherit; text-decoration: none; }
  .back { font: 400 16px/1 "Helvetica Neue", Helvetica, Arial, sans-serif; opacity: .7; }
  .back:hover, .back:focus-visible { opacity: 1; outline: none; }
  .name { color: #888; }
  ol { list-style: none; margin: 0; padding: 0; display: flex; align-items: center; flex: none; }
  li { display: flex; align-items: center; }
  li + li::before { content: ""; width: 20px; height: 1px; background: #666; }
  .dot { display: block; width: 9px; height: 9px; box-sizing: border-box; border: 1px solid #fff; border-radius: 50%; transition: transform .15s, background .15s; }
  .dot:hover, .dot:focus-visible { transform: scale(1.35); outline: none; background: #fff; }
  .dot.cur { background: #fff; }
  .past .dot.cur { background: #cb5f3c; border-color: #cb5f3c; }
  .info { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #888; }
  .info b { font-weight: 400; color: #fff; }
  .latest { flex: none; color: #cb5f3c; }
  .latest:hover, .latest:focus-visible { color: #fff; outline: none; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  @media (max-width: 480px) { .name { display: none; } li + li::before { width: 12px; } }
  @media (prefers-reduced-motion: reduce) { .bar, .dot { transition: none; } }
</style>
<nav class="bar${past ? " past" : ""}" aria-label="versions of ${esc(p.name)}">
  <a class="back" href="${parent}" aria-label="back">←</a>
  <span class="name">${esc(p.name)}</span>
  <ol>${vs.map((v, i) => `<li><a class="dot${i === cur ? " cur" : ""}" href="${href(v)}" data-i="${i}"${i === cur ? ' aria-current="page"' : ""}><span class="sr">v${i + 1}, ${ddmmyy(v.date)}, ${esc(v.msg)}</span></a></li>`).join("")}</ol>
  <span class="info" aria-hidden="true">${label(cur)}</span>
  ${past ? `<a class="latest" href="${href(vs[vs.length - 1])}">latest →</a>` : ""}
</nav>`;
    (document.body || document.documentElement).appendChild(host);

    const bar = root.querySelector(".bar");
    const info = root.querySelector(".info");
    let t;
    const open = () => { clearTimeout(t); bar.classList.remove("min"); };
    const close = (ms) => { clearTimeout(t); t = setTimeout(() => bar.classList.add("min"), ms); };

    root.querySelectorAll(".dot").forEach((d) => {
      const show = () => { info.innerHTML = label(+d.dataset.i); };
      d.addEventListener("pointerenter", show);
      d.addEventListener("focus", show);
    });
    root.querySelector("ol").addEventListener("pointerleave", () => { info.innerHTML = label(cur); });

    bar.addEventListener("pointerenter", open);
    bar.addEventListener("pointerleave", () => close(900));
    bar.addEventListener("focusin", open);
    bar.addEventListener("focusout", () => close(900));
    // a tap on the folded strip unfolds it instead of hitting the page below
    bar.addEventListener("click", (e) => { if (bar.classList.contains("min")) { e.preventDefault(); open(); close(4000); } });
    addEventListener("pointermove", (e) => { if (e.clientY < 6) open(); }, { passive: true });

    close(past ? 4000 : 2200);
  }
})();

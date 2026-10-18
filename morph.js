// cabz · morph
// <a data-morph="stage one|stage two"><span class="m">short</span></a>
// On hover / keyboard focus the label changes into each stage in turn, pausing between
// them, and changes back on leave. How it changes depends on <html data-transition>
// (set by layouts.js): scramble · melt (an SVG-filter "Dreams" melt that runs from the
// top of the letters down, the text stays real HTML) · type (erased and typed) · none.
(() => {
  "use strict";
  const GLYPHS = "abcdefghijklmnopqrstuvwxyz";
  const HOLD = 950;      // pause on each intermediate stage (ms)
  const SCRAMBLE = 140;  // how long each letter flickers before it settles (ms)
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mode = () => document.documentElement.dataset.transition || "scramble";
  function morph(el, to, done) {
    const m = mode();
    if (m === "melt") return melt(el, to, done);
    if (m === "type") return type(el, to, done);
    return scramble(el, to, done);
  }

  /* ---------- melt: the top of the letters goes first, the new word settles top-down ---------- */
  let fid = 0, defs = null;
  function filterFor(el) {
    if (el._melt) return el._melt;
    if (!defs) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      defs = document.createElementNS(svg.namespaceURI, "defs");
      svg.appendChild(defs);
      document.body.appendChild(svg);
    }
    const id = "cabz-melt-" + (++fid);
    defs.insertAdjacentHTML("beforeend",
      `<filter id="${id}" x="-10%" y="-30%" width="120%" height="180%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.015 0.09" numOctaves="2" seed="${fid}" result="n"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
      `<feGaussianBlur in="d" stdDeviation="0"/></filter>`);
    const f = defs.lastElementChild;
    el._melt = { id, disp: f.querySelector("feDisplacementMap"), blur: f.querySelector("feGaussianBlur") };
    return el._melt;
  }
  function melt(el, to, done) {
    cancelAnimationFrame(el._raf);
    if (reduce || el.textContent === to) { el.textContent = to; if (done) done(); return; }
    const f = filterFor(el);
    el.style.display = "inline-block";
    el.style.filter = `url(#${f.id})`;
    const OUT = 420, IN = 560, t0 = performance.now();
    let swapped = false;
    const set = (k, front, out) => {
      // the melting front runs down the letters: above it they're gone (out) or not there yet (in)
      const g = out
        ? `linear-gradient(to bottom, transparent ${front - 25}%, #000 ${front + 5}%)`
        : `linear-gradient(to bottom, #000 ${front - 5}%, transparent ${front + 25}%)`;
      el.style.webkitMaskImage = el.style.maskImage = g;
      f.disp.setAttribute("scale", (k * 26).toFixed(1));
      f.blur.setAttribute("stdDeviation", (k * 2.2).toFixed(2));
      el.style.transform = `translateY(${(k * 0.08).toFixed(3)}em)`;   // the top sags as it goes
    };
    const tick = (now) => {
      const t = now - t0;
      if (t < OUT) {
        const u = t / OUT;
        set(u, -25 + 150 * u, true);
      } else if (t < OUT + IN) {
        if (!swapped) { el.textContent = to; swapped = true; }
        const u = (t - OUT) / IN;
        set(1 - u, -25 + 150 * u, false);
      } else {
        el.textContent = to;
        el.style.filter = el.style.maskImage = el.style.webkitMaskImage = el.style.transform = "";
        f.disp.setAttribute("scale", "0"); f.blur.setAttribute("stdDeviation", "0");
        if (done) done();
        return;
      }
      el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  }

  /* ---------- type: erased letter by letter, then typed ---------- */
  function type(el, to, done) {
    cancelAnimationFrame(el._raf);
    if (reduce || el.textContent === to) { el.textContent = to; if (done) done(); return; }
    let from = el.textContent, last = 0;
    const tick = (now) => {
      if (now - last > 28) {
        last = now;
        if (from.length && !to.startsWith(from)) from = from.slice(0, -1);
        else if (from.length < to.length) from = to.slice(0, from.length + 1);
        el.textContent = from;
        if (from === to) { if (done) done(); return; }
      }
      el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  }

  /* ---------- scramble ---------- */
  function scramble(el, to, done) {
    cancelAnimationFrame(el._raf);
    const from = el.textContent;
    if (reduce || from === to) { el.textContent = to; if (done) done(); return; }
    const len = Math.max(from.length, to.length);
    const dur = 200 + len * 24;
    // letters settle roughly left to right, with a little jitter
    const settle = Array.from({ length: len }, (_, i) =>
      SCRAMBLE + (i / len) * dur * 0.75 + Math.random() * dur * 0.25);
    const end = Math.max(...settle);
    const t0 = performance.now();
    const tick = (now) => {
      const t = now - t0;
      let out = "";
      for (let i = 0; i < len; i++) {
        if (t >= settle[i]) out += to[i] ?? "";
        else if (t >= settle[i] - SCRAMBLE) out += to[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += from[i] ?? "";
      }
      el.textContent = out;
      if (t < end) el._raf = requestAnimationFrame(tick);
      else { el.textContent = to; if (done) done(); }
    };
    el._raf = requestAnimationFrame(tick);
  }

  // letters on the grid: measure the monospace letter width, then give each name
  // exactly the columns its letters need so whatever follows starts on the next column
  const probe = document.createElement("span");
  probe.textContent = "0".repeat(100);
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:400 100px/1 " +
    (getComputedStyle(document.documentElement).getPropertyValue("--mono") || "monospace");
  document.body.appendChild(probe);
  document.documentElement.style.setProperty("--adv", (probe.getBoundingClientRect().width / 10000).toFixed(4));
  probe.remove();

  function spans() {
    document.querySelectorAll(".list").forEach((list) => {
      const cs = getComputedStyle(list);
      const k = parseFloat(cs.getPropertyValue("--k")) || 3;
      const start = parseInt(cs.getPropertyValue("--start"), 10) || 2;
      list.querySelectorAll(":scope > li > a").forEach((a) => {
        const m = a.querySelector(".m");
        if (!a.dataset.n) a.dataset.n = (m || a).textContent.length;
        a.style.gridColumn = start + " / span " + Math.max(1, Math.ceil(a.dataset.n / k));
      });
    });
  }
  spans();
  addEventListener("resize", spans);

  document.querySelectorAll("[data-morph]").forEach((link) => {
    const label = link.querySelector(".m");
    if (!label) return;
    const base = label.textContent;
    const stages = link.dataset.morph.split("|");
    let run = 0, timer;

    const play = () => {
      if (mode() === "none") return;
      const id = ++run;
      clearTimeout(timer);
      let i = 0;
      const next = () => {
        if (id !== run || i >= stages.length) return;
        morph(label, stages[i++], () => {
          if (id === run && i < stages.length) timer = setTimeout(next, HOLD);
        });
      };
      next();
    };
    const back = () => { ++run; clearTimeout(timer); morph(label, base); };

    // mouse only: on touch screens a tap should just open the link
    link.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") play(); });
    link.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") back(); });
    link.addEventListener("focus", () => { if (link.matches(":focus-visible")) play(); });
    link.addEventListener("blur", back);
    // coming back with the browser's back button: reset the label
    addEventListener("pageshow", () => { ++run; clearTimeout(timer); cancelAnimationFrame(label._raf); label.textContent = base; });
  });
})();

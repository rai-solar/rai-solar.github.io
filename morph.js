// cabz · morph
// <a data-morph="stage one|stage two"><span class="m">short</span></a>
// On hover / keyboard focus the label scrambles through each stage in turn,
// pausing between them, and scrambles back to its short form on leave.
(() => {
  "use strict";
  const GLYPHS = "abcdefghijklmnopqrstuvwxyz";
  const HOLD = 950;      // pause on each intermediate stage (ms)
  const SCRAMBLE = 140;  // how long each letter flickers before it settles (ms)
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function morph(el, to, done) {
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

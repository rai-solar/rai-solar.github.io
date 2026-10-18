// CABeZa · descending shear
// Turns one word into another: a slightly uneven front runs down through the letters, the old
// word stays below it, the new one appears above it, and fine horizontal strips of the old
// word slip sideways and drop just behind the front. The text stays real, selectable HTML;
// the copies that make the effect are decorative and hidden from screen readers and selection.
//
//   const s = Shear(element)      // element: <span class="shear"><span class="t">text</span></span>
//   s.to("new text", done)        // runs the effect (1 s); done() when settled
//   s.set("text")                 // jumps there, no effect
(() => {
  "use strict";
  const N = 24, INTENSITY = 0.58, DURATION = 1000;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = (p) => p * p * (3 - 2 * p);
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const edge = (front, amp, seed, p) => {
    const pts = [];
    for (let x = 0; x <= 100; x += 5) {
      const wave = Math.sin(x * 0.185 + p * 11 + seed) * 0.58
        + Math.sin(x * 0.51 - p * 17 + seed * 2.7) * 0.28
        + Math.sin(x * 0.91 + p * 7 + seed * 1.33) * 0.14;
      pts.push([x, clamp(front + amp * wave)]);
    }
    return pts;
  };
  const poly = (pts) => "polygon(" + pts.map(([x, y]) => `${x}% ${y}%`).join(",") + ")";
  const clip = (el, v) => { el.style.clipPath = v; el.style.webkitClipPath = v; };

  window.Shear = function (box) {
    const primary = box.querySelector(".t") || box.appendChild(Object.assign(document.createElement("span"), { className: "t" }));
    const layer = (cls) => {
      const s = document.createElement("span");
      s.className = cls;
      s.setAttribute("aria-hidden", "true");
      box.appendChild(s);
      return s;
    };
    const incoming = layer("in");
    const strips = Array.from({ length: N }, () => layer("strip"));
    let raf = 0, current = primary.textContent;

    const show = (t) => t || "​";   // an empty word keeps its line height and baseline

    function render(p, from, to) {
      const f = -5 + 111 * ease(p), amp = 1.35 * INTENSITY;
      const out = edge(f, amp, 5, p), inn = edge(f - 2.5, amp * 0.62, 5.6, p);
      primary.textContent = show(from);
      clip(primary, poly([...out, [100, 100], [0, 100]]));          // the old word, below the front
      incoming.textContent = show(to);
      incoming.style.visibility = "visible";
      clip(incoming, poly([[0, 0], [100, 0], ...inn.reverse()]));   // the new word, above it
      strips.forEach((s, i) => {
        const y = (i + 0.5) * 100 / N, passed = (f - y) / 23;
        const life = passed > 0 && passed < 1 ? Math.sin(Math.PI * passed) : 0;
        if (!life) { s.style.visibility = "hidden"; return; }
        const sign = Math.sin(i * 2.8 + 0.4) > 0 ? 1 : -1;
        s.textContent = show(from);
        s.style.visibility = "visible";
        s.style.opacity = (life * INTENSITY * 0.88).toFixed(3);
        clip(s, `inset(${i * 100 / N}% 0 ${100 - (i + 1) * 100 / N}% 0)`);
        s.style.transform = `translate(${(sign * 12 * INTENSITY * life).toFixed(2)}px, ${(life * 7 * INTENSITY).toFixed(2)}px)`;
      });
    }
    function set(text) {
      cancelAnimationFrame(raf);
      current = text;
      primary.textContent = show(text);
      clip(primary, "");
      incoming.style.visibility = "hidden";
      strips.forEach((s) => { s.style.visibility = "hidden"; });
    }
    function to(text, done) {
      cancelAnimationFrame(raf);
      const from = current;
      if (reduce || from === text) { set(text); if (done) done(); return; }
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / DURATION);
        if (p >= 1) { set(text); if (done) done(); return; }
        render(p, from, text);
        raf = requestAnimationFrame(tick);
      };
      current = text;
      raf = requestAnimationFrame(tick);
    }
    set(current);
    return { to, set, get text() { return current; }, DURATION };
  };
})();

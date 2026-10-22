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
    const strike = box.closest("[data-strike]")?.dataset.strike;
    const setText = (el, text) => {
      const value = show(text);
      if (el.textContent === value) return;
      if (strike && value.startsWith(strike + " ")) {
        const crossed = document.createElement("s");
        crossed.textContent = strike;
        el.replaceChildren(crossed, document.createTextNode(value.slice(strike.length)));
      } else el.textContent = value;
    };


    function render(p, from, to, options = {}) {
      const bottom = options.direction === "bottom";
      const path = (points) => poly(bottom ? points.map(([x, y]) => [x, 100 - y]) : points);
      const f = -5 + 111 * ease(p), amp = 1.35 * INTENSITY;
      const out = edge(f, amp, 5, p), inn = edge(f - 2.5, amp * 0.62, 5.6, p);
      setText(primary, from);
      clip(primary, path([...out, [100, 100], [0, 100]]));          // the old word, below the front
      setText(incoming, to);
      incoming.style.visibility = "visible";
      clip(incoming, path([[0, 0], [100, 0], ...inn.reverse()]));   // the new word, above it
      strips.forEach((s, i) => {
        const y = (i + 0.5) * 100 / N, passed = (f - y) / 23;
        const life = passed > 0 && passed < 1 ? Math.sin(Math.PI * passed) : 0;
        if (!life) { s.style.visibility = "hidden"; return; }
        const sign = bottom ? -1 : Math.sin(i * 2.8 + 0.4) > 0 ? 1 : -1;
        // Fragment the incoming word for bottom-up arrivals and the first word
        // after p., so the whole new word participates in the shear.
        setText(s, (bottom || options.incomingFragments) && to ? to : from);
        s.style.visibility = "visible";
        s.style.opacity = (life * INTENSITY * 0.88).toFixed(3);
        const top = bottom ? 100 - (i + 1) * 100 / N : i * 100 / N;
        const below = bottom ? i * 100 / N : 100 - (i + 1) * 100 / N;
        clip(s, `inset(${top}% 0 ${below}% 0)`);
        s.style.transform = `translate(${(sign * 12 * INTENSITY * life).toFixed(2)}px, ${(life * 7 * INTENSITY * (bottom ? -1 : 1)).toFixed(2)}px)`;
      });
    }
    // Cache glyph ink once per word/font. Geometry and strip offsets below are the
    // same as render(), so layout can reserve the ink without clipping any letters.
    const metricCache = new Map();
    function ink(word) {
      const style = getComputedStyle(primary);
      const key = [word, style.font, style.letterSpacing, style.lineHeight].join("|");
      if (metricCache.has(key)) return metricCache.get(key);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const configure = () => { ctx.font = font; ctx.letterSpacing = style.letterSpacing; };
      configure();
      const width = ctx.measureText(word).width;
      const height = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.15;
      canvas.width = Math.max(1, Math.ceil(width + 24));
      canvas.height = Math.ceil(height + 16);
      configure();
      const m = ctx.measureText("Mg");
      const ascent = m.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .9;
      const descent = m.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .25;
      ctx.fillText(word, 12, 8 + (height - ascent - descent) / 2 + ascent);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const points = [], rows = [];
      for (let x = canvas.width - 1; x >= 0; x--) {
        for (let y = 0; y < canvas.height; y++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] <= 2) continue;
          points.push({ x: x - 12 + 1, y: (y - 8 + .5) / height * 100 });
          rows[y] = Math.max(rows[y] ?? 0, x - 12 + 1);
        }
      }
      const slices = Array.from({ length: N }, (_, i) => {
        let right = 0;
        rows.forEach((x, y) => {
          const py = (y - 8 + .5) / height * 100;
          if (py >= i * 100 / N && py <= (i + 1) * 100 / N) right = Math.max(right, x);
        });
        return right;
      });
      const metric = { width, points, slices, right: points[0]?.x || 0,
        top: points.reduce((top, point) => Math.min(top, point.y), 100),
        bottom: points.reduce((bottom, point) => Math.max(bottom, point.y), 0) };
      metricCache.set(key, metric);
      return metric;
    }
    function measure(p, from, to, options = {}) {
      const old = ink(from), next = ink(to);
      if (p >= 1) return next.right;
      const bottom = options.direction === "bottom";
      const f = -5 + 111 * ease(p), amp = 1.35 * INTENSITY;
      const out = edge(f, amp, 5, p), inn = edge(f - 2.5, amp * .62, 5.6, p);
      const front = (points, x, width) => {
        const position = Math.max(0, Math.min(20, x / Math.max(1, width) * 20));
        const i = Math.min(19, Math.floor(position)), t = position - i;
        return points[i][1] * (1 - t) + points[i + 1][1] * t;
      };
      const visible = (metric, points, incomingWord) => {
        for (const point of metric.points) {
          const y = bottom ? 100 - point.y : point.y;
          const boundary = front(points, point.x, metric.width);
          if (incomingWord ? y <= boundary : y >= boundary) return point.x;
        }
        return 0;
      };
      let right = Math.max(visible(old, out, false), visible(next, inn, true));
      const fragments = (bottom || options.incomingFragments) && to ? next : old;
      for (let i = 0; i < N; i++) {
        const y = (i + .5) * 100 / N, passed = (f - y) / 23;
        const life = passed > 0 && passed < 1 ? Math.sin(Math.PI * passed) : 0;
        if (!life) continue;
        const x = fragments.slices[bottom ? N - 1 - i : i];
        const sign = bottom ? -1 : Math.sin(i * 2.8 + .4) > 0 ? 1 : -1;
        if (x) right = Math.max(right, x + sign * 12 * INTENSITY * life);
      }
      return right;
    }
    function set(text) {
      cancelAnimationFrame(raf);
      current = text;
      setText(primary, text);
      clip(primary, "");
      incoming.style.visibility = "hidden";
      strips.forEach((s) => { s.style.visibility = "hidden"; });
    }
    function to(text, done, options = {}) {
      cancelAnimationFrame(raf);
      const from = current;
      if (reduce || from === text) { set(text); options.onFrame?.(1); if (done) done(); return; }
      let first = 0;
      if (options.immediate && text) {
        const metric = ink(text);
        const firstInk = options.direction === "bottom" ? 100 - metric.bottom : metric.top;
        // Start on actual ink, rather than animating invisibly through the line-box padding.
        const target = firstInk + 5;
        let low = 0, high = 1;
        for (let i = 0; i < 20; i++) {
          const mid = (low + high) / 2;
          if (-5 + 111 * ease(mid) - 2.5 < target) low = mid; else high = mid;
        }
        first = high;
        render(first, from, text, options);
      }
      const t0 = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - t0) / (options.duration || DURATION));
        const p = first + (1 - first) * progress;
        if (p >= 1) { set(text); options.onFrame?.(1); if (done) done(); return; }
        render(p, from, text, options);
        options.onFrame?.(p);
        raf = requestAnimationFrame(tick);
      };
      current = text;
      raf = requestAnimationFrame(tick);
    }
    set(current);
    function frame(p, from, to, options = {}) {
      cancelAnimationFrame(raf);
      if (p >= 1) set(to);
      else render(p, from, to, options);
    }
    return { to, set, frame, measure, get text() { return current; }, DURATION };
  };
})();

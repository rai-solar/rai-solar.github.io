// CABeZa · raimundo p. solar
// The page opens on "raimundo p. solar". Then ". solar" slides right, leaving room for the
// longest p-word, and the p grows into words, one after another, with a "descending shear":
// a slightly uneven front runs down through the letters, the old word stays below it, the new
// one appears above it, and fine horizontal strips of the old word slip sideways and drop just
// behind the front. Everything is real HTML text; the copies are decorative and hidden.
(() => {
  "use strict";
  const host = document.querySelector(".name-line");
  if (!host) return;

  // the curated words first, then the whole list in a shuffled order
  const FIRST = ["perro", "pizza", "pesto", "puente", "plage", "projet", "poesie", "piste", "parfum", "pajaro", "paz", "plaza", "puerto"];
  const RAW = `pájaro oiseau bird|palabra|palette|palmera|papel papier paper|páramo|parcela|parcours|pared paroi|paréntesis|parfum perfume|parpadeo|pasaje passage|paseo promenade|paso|patio|pattern|pause pausa|pavé pavement|paz paix peace|peau|pellicule|pénombre|pente|perder|perro|persiana persienne|perspectiva perspective|pesto|pétalo pétale|phare|photo|phrase|piedra pierre|pigment pigmento|pincel pinceau|pintura|pista piste|pixel|pizza|place plaza|plage playa|planer|planeta|pli pliegue|plume pluma|pocket poche|poésie poesía poetry|point punto|pollen|pont puente|port puerto|portal|postal|poussière polvo|prairie prado|précipice precipicio|prender|présence presencia|printemps|prisma|process proceso|profondeur|projet proyecto project|prototype prototipo|proxy|prueba|pueblo|pulse pulso|pebble|pin pine pino|paciencia|preciso|plaine|pond|proche|profondeurs|piscis|puzzle`;
  const ALL = [...new Set(RAW.split(/[|\s]+/).filter((w) => /^p/i.test(w)))];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let queue = [...FIRST], last = "";
  const nextWord = () => {
    if (!queue.length) queue = shuffle(ALL.filter((w) => w !== last));
    return (last = queue.shift());
  };

  // markup: raimundo p[slot]. solar — the slot holds the rest of the word
  host.setAttribute("aria-label", "raimundo p. solar");
  host.innerHTML =
    '<span aria-hidden="true">raimundo p</span><span class="slot" aria-hidden="true">' +
    '<span class="shear"><span class="t"></span></span></span><span aria-hidden="true">. solar</span>';
  const slot = host.querySelector(".slot"), box = host.querySelector(".shear"), primary = box.querySelector(".t");

  // the room the longest word needs (its letters after the p)
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
  host.appendChild(probe);
  const room = () => Math.max(...ALL.map((w) => { probe.textContent = w.slice(1); return probe.getBoundingClientRect().width; }));
  let ROOM = room();
  addEventListener("resize", () => { ROOM = room(); if (slot.style.width) slot.style.width = ROOM + "px"; });

  /* ---------- the descending shear ---------- */
  const N = 24, INTENSITY = 0.58, DURATION = 1000;
  const layer = (cls) => { const s = document.createElement("span"); s.className = cls; s.setAttribute("aria-hidden", "true"); box.appendChild(s); return s; };
  const incoming = layer("in");
  const strips = Array.from({ length: N }, () => layer("strip"));
  const ease = (p) => p * p * (3 - 2 * p);
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const edge = (front, amp, seed, p) => {
    const pts = [];
    for (let x = 0; x <= 100; x += 5) {
      const wave = Math.sin(x * 0.185 + p * 11 + seed) * 0.58 + Math.sin(x * 0.51 - p * 17 + seed * 2.7) * 0.28 + Math.sin(x * 0.91 + p * 7 + seed * 1.33) * 0.14;
      pts.push([x, clamp(front + amp * wave)]);
    }
    return pts;
  };
  const poly = (pts) => "polygon(" + pts.map(([x, y]) => `${x}% ${y}%`).join(",") + ")";

  function render(p, from, to) {
    const f = -5 + 111 * ease(p), amp = 1.35 * INTENSITY;
    const out = edge(f, amp, 5, p), inn = edge(f - 2.5, amp * 0.62, 5.6, p);
    primary.textContent = from || "\u200b";
    primary.style.clipPath = poly([...out, [100, 100], [0, 100]]);        // old word: below the front
    incoming.textContent = to;
    incoming.style.visibility = "visible";
    incoming.style.clipPath = poly([[0, 0], [100, 0], ...inn.reverse()]);  // new word: above it
    strips.forEach((s, i) => {
      const y = (i + 0.5) * 100 / N, passed = (f - y) / 23;
      const life = passed > 0 && passed < 1 ? Math.sin(Math.PI * passed) : 0;
      if (!life) { s.style.visibility = "hidden"; return; }
      const sign = Math.sin(i * 2.8 + 0.4) > 0 ? 1 : -1;
      s.textContent = from;
      s.style.visibility = "visible";
      s.style.opacity = (life * INTENSITY * 0.88).toFixed(3);
      s.style.clipPath = `inset(${i * 100 / N}% 0 ${100 - (i + 1) * 100 / N}% 0)`;
      s.style.transform = `translate(${(sign * 12 * INTENSITY * life).toFixed(2)}px, ${(life * 7 * INTENSITY).toFixed(2)}px)`;
    });
  }
  function settle(text) {
    primary.textContent = text || "\u200b";   // keeps the baseline while empty
    primary.style.clipPath = "";
    incoming.style.visibility = "hidden";
    strips.forEach((s) => { s.style.visibility = "hidden"; });
  }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0;
  function shear(from, to, done) {
    cancelAnimationFrame(raf);
    if (reduce) { settle(to); done(); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / DURATION);
      if (p >= 1) { settle(to); done(); return; }
      render(p, from, to);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  /* ---------- choreography ---------- */
  const HOLD = 1800;
  const loop = (current) => {
    setTimeout(() => {
      if (document.hidden) { loop(current); return; }
      const w = nextWord();
      shear(current, w.slice(1), () => loop(w.slice(1)));
    }, HOLD);
  };
  settle("");
  slot.style.width = "0px";
  setTimeout(() => {
    slot.style.width = ROOM + "px";                        // ". solar" moves right
    setTimeout(() => {
      const w = nextWord();
      shear("", w.slice(1), () => loop(w.slice(1)));
    }, reduce ? 0 : 900);
  }, reduce ? 0 : 1200);
})();

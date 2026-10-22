// CABeZa · raimundo p. solar
// The descending shear and solar share one clock. Explicit equal gaps keep
// raimundo, the changing word, and solar separate on a common baseline.
(() => {
  "use strict";
  const host = document.querySelector(".name-line");
  if (!host || !window.Shear) return;

  // the curated words first, then the whole list in a shuffled order
  const FIRST = ["perro", "pizza", "pesto", "puente", "plage", "projet", "poesie", "piste", "parfum", "pajaro", "paz", "plaza", "puerto", "prototype", "pantoufles"];
  const RAW = `pájaro oiseau bird|palabra|palette|palmera|pantoufles|papel papier paper|páramo|parcela|parcours|pared paroi|paréntesis|parfum perfume|parpadeo|pasaje passage|paseo promenade|paso|patio|pattern|pause pausa|pavé pavement|paz paix peace|peau|pellicule|pénombre|pente|perder|perro|persiana persienne|perspectiva perspective|pesto|pétalo pétale|phare|photo|phrase|piedra pierre|pigment pigmento|pincel pinceau|pintura|pista piste|pixel|pizza|place plaza|plage playa|planer|planeta|pli pliegue|plume pluma|pocket poche|poésie poesía poetry|point punto|pollen|pont puente|port puerto|portal|postal|poussière polvo|prairie prado|précipice precipicio|prender|présence presencia|printemps|prisma|process proceso|profondeur|projet proyecto project|prototype prototipo|proxy|prueba|pueblo|pulse pulso|pebble|pin pine pino|paciencia|preciso|plaine|pond|proche|profondeurs|piscis|puzzle`;
  const ALL = [...new Set(RAW.split(/[|\s]+/).filter((w) => /^p/i.test(w)))];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let queue = [...FIRST], last = "";
  const nextWord = () => {
    if (!queue.length) queue = shuffle(ALL.filter((w) => w !== last));
    return (last = queue.shift());
  };

  host.setAttribute("aria-label", "raimundo p. solar");
  host.innerHTML = '<span aria-hidden="true">raimundo</span><span class="slot" aria-hidden="true"></span><span aria-hidden="true">solar</span>';
  const slot = host.querySelector(".slot");
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
  host.appendChild(probe);
  const widthOf = (word) => { probe.textContent = word; return probe.getBoundingClientRect().width; };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const duration = 2200;
  let current = "p.", timer, raf, original;
  const settle = (word) => {
    original?.set(current);
    const baseline = document.createElement("span");
    baseline.className = "word-baseline";
    baseline.textContent = "p.";
    const box = document.createElement("span");
    box.className = "shear original-word";
    slot.replaceChildren(baseline, box);
    original = Shear(box);
    original.set(word);
    slot.style.width = (original.measure(1, "", word) + 3) + "px";
    current = word;
  };
  // Smooth the measured ink envelope in advance, rather than snapping solar to
  // a changing pixel boundary. Every sample remains above the measured ink.
  const planSpace = (stateAt, from, word) => {
    const count = 180;
    const floor = Array.from({ length: count + 1 }, (_, i) => {
      const state = stateAt(i / count);
      return original.measure(state.p, state.from, state.to, state.options) + 3;
    });
    const returning = word === "p.";
    const stop = returning ? Math.round(count * .78) : count;
    const target = original.measure(1, "", word) + 3;
    const expanding = target >= from;
    // Make the required envelope monotonic before smoothing. Small strip motions
    // must never make solar overshoot a word and then bounce back into place.
    for (let i = 0; i <= count; i++) {
      floor[i] = Math.max(Math.min(from, target), Math.min(Math.max(from, target), floor[i]));
    }
    if (expanding) {
      for (let i = 1; i <= count; i++) floor[i] = Math.max(floor[i], floor[i - 1]);
    } else {
      for (let i = count - 1; i >= 0; i--) floor[i] = Math.max(floor[i], floor[i + 1]);
    }
    if (returning) for (let i = stop; i <= count; i++) floor[i] = target;
    const widths = [...floor];
    widths[0] = from;
    // A projected smoothing pass anticipates appearing ink and follows receding
    // fragments gradually. It cannot move the label through a surviving fragment.
    for (let pass = 0; pass < 1600; pass++) {
      const previous = [...widths];
      for (let i = 1; i < stop; i++) {
        widths[i] = Math.max(floor[i], (previous[i - 1] + previous[i] * 2 + previous[i + 1]) / 4);
      }
    }
    return { widths, count };
  };
  const go = (word, hold, then, morph = false) => {
    if (reduce) { settle(word); timer = setTimeout(then, hold); return; }
    const from = parseFloat(slot.style.width) || widthOf(current);
    const fromInitial = current === "p.";
    const stateAt = (p) => {
      // Start the p.-to-word shear immediately; the space plan gives solar only
      // the lead actually needed by the incoming ink.
      if (fromInitial) return { p, from: current, to: word, options: { incomingFragments: true } };
      if (morph) return { p, from: current, to: word };
      const split = .45;
      return p < split
        ? { p: p / split, from: current, to: "" }
        : { p: (p - split) / (1 - split), from: "", to: word, options: { direction: "bottom" } };
    };
    const { widths, count } = planSpace(stateAt, from, word);
    const start = performance.now();
    const tick = (now) => {
      const p = clamp((now - start) / duration);
      const state = stateAt(p);
      original.frame(state.p, state.from, state.to, state.options);
      const at = p * count, i = Math.min(count - 1, Math.floor(at));
      const width = widths[i] + (widths[i + 1] - widths[i]) * (at - i);
      slot.style.width = width + "px";
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        current = word;
        timer = setTimeout(then, hold);
      }
    };
    raf = requestAnimationFrame(tick);
  };
  let morphRound = false;
  const similarWord = () => {
    const width = widthOf(current);
    const reserved = parseFloat(slot.style.width) || width;
    const slack = parseFloat(getComputedStyle(host).fontSize) * .12;
    const candidates = ALL.filter((word) => word !== current && word !== last &&
      Math.abs(widthOf(word) - width) <= width * .12 && widthOf(word) >= reserved - slack);
    if (!candidates.length) return null;
    return (last = candidates[Math.floor(Math.random() * candidates.length)]);
  };
  const cycle = () => {
    if (document.hidden) { timer = setTimeout(cycle, 1000); return; }
    morphRound = !morphRound;
    const count = morphRound ? 2 + Math.floor(Math.random() * 2) : 0;
    const continueWords = (remaining) => {
      const next = remaining > 0 ? similarWord() : null;
      if (next) go(next, 0, () => continueWords(remaining - 1), true);
      else timer = setTimeout(() => go("p.", 400, cycle), 1500);
    };
    go(nextWord(), 0, () => continueWords(count));
  };
  addEventListener("resize", () => { clearTimeout(timer); cancelAnimationFrame(raf); settle(current); timer = setTimeout(cycle, 500); });
  document.fonts.ready.then(() => { settle("p."); timer = setTimeout(cycle, 1400); });
})();

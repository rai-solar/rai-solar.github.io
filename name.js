// CABeZa · raimundo p. solar
// "raimundo p. solar". The "p." goes (descending shear), a p-word comes in its place, goes
// again, "p." comes back, and so on. "solar" always keeps the same distance after the word:
// the gap between them is a plain space, and solar glides along as the word changes width.
(() => {
  "use strict";
  const host = document.querySelector(".name-line");
  if (!host || !window.Shear) return;

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

  host.setAttribute("aria-label", "raimundo p. solar");
  host.innerHTML = '<span aria-hidden="true">raimundo </span><span class="slot" aria-hidden="true">' +
    '<span class="shear"><span class="t">p.</span></span></span><span aria-hidden="true"> solar</span>';
  const slot = host.querySelector(".slot");
  const shear = Shear(host.querySelector(".shear"));

  // the slot takes the width of whichever word it holds, so " solar" always follows at one space
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
  host.appendChild(probe);
  const widthOf = (w) => { probe.textContent = w; return probe.getBoundingClientRect().width; };
  const fit = (w) => { slot.style.width = widthOf(w) + "px"; };
  fit("p.");
  addEventListener("resize", () => fit(shear.text));

  const HOLD_WORD = 1700, HOLD_P = 500;
  // a longer word: solar steps aside first, then the shear; a shorter one: the shear, then solar
  // comes back. Either way the letters never run into "solar".
  const STEP = 350;
  const go = (word, hold, then) => {
    const wider = widthOf(word) > slot.getBoundingClientRect().width;
    const after = () => setTimeout(then, hold);
    if (wider) { fit(word); setTimeout(() => shear.to(word, after), STEP); }
    else shear.to(word, () => { fit(word); setTimeout(after, STEP); });
  };
  const cycle = () => {
    if (document.hidden) { setTimeout(cycle, 1000); return; }
    go(nextWord(), HOLD_WORD, () => go("p.", HOLD_P, cycle));   // a word, then the p. again
  };
  setTimeout(cycle, 1400);
})();

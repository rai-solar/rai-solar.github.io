/* v02 · the app's name evolves: one creator of the Sun after another.
   Each name types itself in, then what they did, then where it comes from (in brackets).
   Click the name for the next one. */
(function () {
  "use strict";

  const MYTHS = [
    { name: "Viracocha", origin: "Inca", text: "Created the Sun, Moon, and stars, bringing light into a dark world." },
    { name: "Izanagi", origin: "Japanese", text: "Gave birth to the Sun goddess Amaterasu while washing his left eye." },
    { name: "Pangu", origin: "Chinese", text: "After his death, his left eye became the Sun and his right eye the Moon." },
    { name: "Nanahuatzin", origin: "Aztec", text: "Sacrificed himself in a sacred fire and transformed into the Fifth Sun." },
    { name: "Odin × Vili × Vé", origin: "Norse", text: "Placed sparks from the fiery realm of Muspelheim in the heavens to illuminate the world." },
    { name: "Purusha", origin: "Vedic", text: "The Sun emerged from the eye of the primordial cosmic being during a cosmic sacrifice." }
  ];

  const NAME_MS = 60;     // per letter of the name
  const TEXT_MS = 12;     // per letter of the description
  const HOLD_MS = 3000;   // how long a complete myth stays
  const OUT_MS = 30;      // per letter when the name un-types

  const title = document.getElementById("appName");
  const box = document.getElementById("appNameBox");
  const origin = document.getElementById("mythOrigin");
  const text = document.getElementById("mythText");
  const live = document.getElementById("mythLive");
  if (!title || !box || !origin || !text) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = Math.floor(Math.random() * MYTHS.length), timer = null, run = 0;   // a random creator first

  // the longest names would overflow: shrink the type until the name fits on one line
  function fit(full) {
    title.style.fontSize = "";
    const probe = title.cloneNode();
    probe.removeAttribute("id");
    probe.textContent = full;
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;width:auto";
    box.appendChild(probe);
    const room = box.clientWidth, need = probe.getBoundingClientRect().width;
    box.removeChild(probe);
    if (need > room) {
      const base = parseFloat(getComputedStyle(title).fontSize);
      title.style.fontSize = Math.floor(base * room / need) + "px";
    }
  }

  const wait = (ms, id) => new Promise((ok) => { timer = setTimeout(() => { if (id === run) ok(); }, ms); });

  async function type(el, str, ms, id) {
    for (let k = 1; k <= str.length; k++) {
      if (id !== run) return;
      el.textContent = str.slice(0, k);
      await wait(ms, id);
    }
  }

  async function untype(el, ms, id) {
    for (let k = el.textContent.length - 1; k >= 0; k--) {
      if (id !== run) return;
      el.textContent = el.textContent.slice(0, k);
      await wait(ms, id);
    }
  }

  async function show(m) {
    const id = ++run;
    clearTimeout(timer);
    box.classList.add("typing");
    if (live) live.textContent = m.name + ", " + m.origin + ". " + m.text;
    if (reduce) {
      fit(m.name);
      title.textContent = m.name; origin.textContent = m.origin; text.textContent = m.text;
    } else {
      origin.textContent = "";
      await untype(text, 4, id);
      await untype(title, OUT_MS, id);
      if (id !== run) return;
      fit(m.name);
      await type(title, m.name, NAME_MS, id);
      await wait(250, id);
      await type(text, m.text, TEXT_MS, id);
      await type(origin, m.origin, TEXT_MS * 2, id);   // where it comes from, last, in ()
    }
    if (id !== run) return;
    box.classList.remove("typing");
    await wait(HOLD_MS, id);
    next();
  }

  function next() { i = (i + 1) % MYTHS.length; show(MYTHS[i]); }

  title.addEventListener("click", next);
  title.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } });
  window.addEventListener("resize", () => fit(MYTHS[i].name));

  title.textContent = "";
  show(MYTHS[i]);
})();

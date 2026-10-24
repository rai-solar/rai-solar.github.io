// Project names change only inside a circular window carried by the pointer.
(() => {
  "use strict";
  if (!window.Shear) return;
  // Pages without the sun (cabz, pp…) get the same moon as the home page, so the index names
  // get their round of night there too. On home sun.js makes it; here it's made the same size:
  // the sun is one column wide (two on phones, from .sun's own CSS, measured with an empty .sun),
  // the moon 0.321 of that (sun.js: the sun's round body × 1.06). It only shows over a name.
  if (!document.querySelector(".sun, .sun-ball") && document.querySelector(".list a.name[data-full]")) {
    const ruler = document.createElement("div");
    ruler.className = "sun";
    ruler.setAttribute("aria-hidden", "true");
    ruler.style.cssText = "visibility:hidden;pointer-events:none";
    const moon = document.createElement("div");
    moon.className = "sun-ball moon-only";
    moon.setAttribute("aria-hidden", "true");
    document.body.append(ruler, moon);
    addEventListener("pointermove", (e) => {
      const d = ruler.getBoundingClientRect().width * 0.321;
      moon.style.width = moon.style.height = d + "px";
      moon.style.left = e.clientX - d / 2 + "px";
      moon.style.top = e.clientY - d / 2 + "px";
    }, { passive: true });
  }
  document.querySelectorAll(".list a.name[data-full]").forEach((a) => {
    const box = a.querySelector(".shear");
    if (!box) return;
    const short = box.textContent.trim(), full = a.dataset.full;
    const phrases = a.dataset.phrases?.split("|").filter(Boolean) || [full];
    const nightLocked = () => document.body.classList.contains("eclipse-locked");
    const idleLabel = () => nightLocked() ? full : short;
    const base = Shear(box);
    const shortWidth = () => {
      const primary = box.querySelector(":scope > .t");
      return primary.getBoundingClientRect().width;
    };
    const reveal = document.createElement("span");
    reveal.className = "project-reveal";
    reveal.setAttribute("aria-hidden", "true");
    const animated = document.createElement("span");
    animated.className = "shear";
    const text = document.createElement("span");
    text.className = "t";
    text.textContent = short;
    animated.appendChild(text);
    reveal.appendChild(animated);
    box.appendChild(reveal);
    const s = Shear(animated);
    a.setAttribute("aria-label", full);
    let hovering = false, active = false, phraseTimer;
    let phraseQueue = [], lastPhrase = "";
    const nextPhrase = () => {
      if (!phraseQueue.length) {
        phraseQueue = [...phrases];
        for (let i = phraseQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [phraseQueue[i], phraseQueue[j]] = [phraseQueue[j], phraseQueue[i]];
        }
        if (phraseQueue.length > 1 && phraseQueue[0] === lastPhrase) {
          [phraseQueue[0], phraseQueue[1]] = [phraseQueue[1], phraseQueue[0]];
        }
      }
      return (lastPhrase = phraseQueue.shift());
    };
    const showPhrase = (first = false) => {
      if (!active) return;
      s.to(nextPhrase(), () => {
        if (active && phrases.length > 1) phraseTimer = setTimeout(() => showPhrase(), 700);
      }, { immediate: first, incomingFragments: true });
    };
    const startPhrases = () => {
      clearTimeout(phraseTimer);
      phraseQueue = []; lastPhrase = "";
      s.set(nightLocked() ? base.text : "");
      showPhrase(true);
    };
    const position = (e) => {
      if (nightLocked()) return;
      const r = box.getBoundingClientRect();
      const moon = document.querySelector(".sun-ball");
      const diameter = moon?.getBoundingClientRect().width || 80;
      box.style.setProperty("--lens-r", diameter / 2 + "px");
      box.style.setProperty("--lens-x", e.clientX - r.left + "px");
      box.style.setProperty("--lens-y", e.clientY - r.top + "px");
    };
    const expand = () => {
      // Reserve the full label while it is revealed, so crossing the old short
      // label's edge does not end the hover. The link itself stays content-sized.
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
      box.appendChild(probe);
      let width = box.getBoundingClientRect().width;
      for (const phrase of phrases) {
        probe.textContent = phrase;
        width = Math.max(width, probe.getBoundingClientRect().width);
      }
      probe.remove();
      box.style.width = width + "px";
    };
    const on = (e) => {
      if (nightLocked()) return;
      hovering = active = true;
      base.set(idleLabel());
      box.style.width = "";
      expand();
      position(e);
      box.classList.add("project-lens");
      document.body.classList.add("project-hover");
      startPhrases();
    };
    const off = () => {
      if (!active || nightLocked()) return;
      hovering = active = false;
      clearTimeout(phraseTimer);
      base.set(idleLabel());
      const width = shortWidth();
      box.classList.remove("project-lens");
      document.body.classList.remove("project-hover");
      box.style.setProperty("--lens-r", "0px");
      s.set("");
      box.style.width = width + "px";
      base.set("");
      base.to(idleLabel(), () => {
        if (!active) box.style.width = "";
      }, { direction: "bottom", immediate: true, incomingFragments: true });
    };
    addEventListener("cabz:eclipse", () => {
      hovering = active = false;
      clearTimeout(phraseTimer);
      s.set("");
      box.classList.remove("project-lens");
      box.style.setProperty("--lens-r", "0px");
      document.body.classList.remove("project-hover");
      const target = idleLabel();
      base.set(base.text);
      expand();
      base.to(target, () => {
        if (!active) box.style.width = "";
      }, { immediate: true, incomingFragments: true, direction: nightLocked() ? "top" : "bottom" });
    });
    a.addEventListener("pointerenter", on);
    a.addEventListener("pointermove", position);
    a.addEventListener("pointerleave", off);
    // Keyboard focus reveals the complete name without requiring a pointer.
    a.addEventListener("focus", () => {
      if (hovering || nightLocked()) return;
      active = true;
      base.set(idleLabel());
      box.style.width = "";
      expand();
      box.classList.add("project-lens");
      box.style.setProperty("--lens-r", "200vmax");
      startPhrases();
    });
    a.addEventListener("blur", off);
    if (nightLocked()) base.set(full);
  });

  // Match the heading's lowercase o height, but draw a true CSS circle.
  const sizeDots = () => {
    const heading = document.querySelector(".name-line");
    if (!heading) return;
    const style = getComputedStyle(heading);
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = ctx.measureText("o");
    const diameter = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    if (diameter > 0) document.documentElement.style.setProperty("--project-dot", diameter + "px");
  };
  document.fonts.ready.then(sizeDots);
  addEventListener("resize", sizeDots);
})();

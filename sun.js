// CABeZa · the sun on the home page: soleil.png, the original sun with its asymmetric rays
// (soleil's first picture, transparent), drawn on a canvas so the eclipse can fade its rays.
//
// The mouse carries a moon: a disc the colour of the background, a touch bigger than the sun's body,
// always under the pointer (it hides whatever it passes over). Bring it onto the centre of
// the sun and the rays fade with the distance: gone when it sits on the centre (almost exactly).
// Click a total eclipse to park the moon and lock night; pick it up to return to day.
// The whole page darkens with it: the painted sky goes to night, charcoal type → neon purple.
(() => {
  "use strict";
  const link = document.querySelector(".sun");
  const picture = link && link.querySelector("img");
  if (!link || !picture) return;

  // measured in soleil.png (1024 px): the round body the rays grow from is 15.1% of the width
  // across its radius (155 px); everything below works in a 1000-unit box like soleil's engine
  const BOX = 1000, C = 500;
  const built = { core: 0.1514 * BOX };
  const sunImage = new Image();
  sunImage.src = picture.currentSrc || picture.src;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  link.prepend(canvas);
  link.classList.add("live");
  const ctx = canvas.getContext("2d");

  const resize = () => {
    const px = Math.round(link.clientWidth * Math.min(2, devicePixelRatio || 1));
    if (px && canvas.width !== px) canvas.width = canvas.height = px;
  };
  resize();
  addEventListener("resize", resize);

  /* ---------- the moon under the mouse ---------- */

  const moon = document.createElement("button");
  moon.type = "button";
  moon.tabIndex = -1;
  moon.setAttribute("aria-label", "Pick up the moon");
  moon.className = "sun-ball";
  moon.setAttribute("aria-hidden", "true");
  document.body.appendChild(moon);
  // the moon covers the whole round body of the sun (the circle the rays grow from), plus a hair
  const discPx = () => link.clientWidth * (2 * built.core * 1.06) / BOX;

  let mx = -1e4, my = -1e4, locked = false;
  const geometry = () => {
    const r = link.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: r.width * built.core / BOX };
  };
  const placeMoon = (x, y) => {
    const d = discPx();
    moon.style.width = moon.style.height = d + "px";
    moon.style.left = (x - d / 2) + "px";
    moon.style.top = (y - d / 2) + "px";
    moon.style.visibility = "visible";
  };
  const eclipseAt = (x, y) => {
    const { cx, cy, radius } = geometry();
    const off = Math.hypot(x - cx, y - cy);
    const far = radius + discPx() / 2, near = radius * MARGIN;
    return Math.max(0, Math.min(1, (far - off) / (far - near)));
  };
  const hitZone = (x, y) => {
    const { cx, cy, radius } = geometry();
    const distance = Math.hypot(x - cx, y - cy);
    if (distance <= radius * MARGIN) return "eclipse";
    if (distance <= radius * 1.06) return "none";
    const rect = link.getBoundingClientRect();
    return distance <= rect.width * 0.48 ? "rays" : "none";
  };
  const updateSunCursor = () => {
    const zone = locked ? "none" : hitZone(mx, my);
    link.style.cursor = zone !== "none" ? "var(--cursor-hand, pointer)" : "none";
    // the moon lined up on the sun: the hand comes back, so it's clear a click locks the eclipse (cursor.js)
    link.classList.toggle("eclipse-ready", zone === "eclipse");
  };
  const LOCK_KEY = "cabz-eclipse-locked";
  const savedLock = () => { try { return localStorage.getItem(LOCK_KEY) === "1"; } catch { return locked; } };
  const setLocked = (value) => {
    try { if (value) localStorage.setItem(LOCK_KEY, "1"); else localStorage.removeItem(LOCK_KEY); } catch {}
    locked = value;
    document.body.classList.toggle("eclipse-locked", locked);
    moon.classList.toggle("parked", locked);
    moon.tabIndex = locked ? 0 : -1;
    if (locked) {
      moon.removeAttribute("aria-hidden");

      const { cx, cy } = geometry();
      placeMoon(cx, cy);
      setSky(1);
    } else {
      if (document.activeElement === moon) link.focus({ preventScroll: true });
      moon.setAttribute("aria-hidden", "true");
      delete moon.dataset.tooltip;
      placeMoon(mx, my);
    }
    dispatchEvent(new CustomEvent("cabz:eclipse", { detail: { locked } }));
  };
  addEventListener("pointermove", (event) => {
    mx = event.clientX; my = event.clientY;
    if (!locked) placeMoon(mx, my);
    updateSunCursor();
  }, { passive: true });
  addEventListener("resize", () => {
    if (locked) { const { cx, cy } = geometry(); placeMoon(cx, cy); }
    else if (mx > -1000) placeMoon(mx, my);
  });
  document.documentElement.addEventListener("pointerleave", () => {
    if (!locked) { moon.style.visibility = "hidden"; mx = my = -1e4; }
  });
  link.addEventListener("click", (event) => {
    if (locked) { event.preventDefault(); return; }
    // Keyboard activation retains the link's Soleil destination.
    if (!event.detail) return;
    const zone = hitZone(event.clientX, event.clientY);
    if (zone !== "rays") event.preventDefault();
    if (zone === "eclipse") setLocked(true);
  });
  moon.addEventListener("click", (event) => {
    if (!locked) return;
    event.preventDefault(); event.stopPropagation();
    if (event.detail) { mx = event.clientX; my = event.clientY; }
    else { const { cx, cy } = geometry(); mx = cx; my = cy; }
    setLocked(false);
  });

  /* ---------- the moon over raimundo ---------- */
  // Over the name at bottom left the moon's round is a patch of night: the sky dark, the type purple
  // (the same as over the index names, style.css).
  const identity = document.querySelector(".identity");
  let nightName = null;   // a purple copy of the name, seen only through the round
  let nameGrow = 0, nameLast = 0;
  const updateInvert = () => {
    if (!identity) return;
    const r = identity.getBoundingClientRect(), radius = discPx() / 2;
    const nx = Math.max(r.left, Math.min(r.right, mx)), ny = Math.max(r.top, Math.min(r.bottom, my));
    const over = !locked && !river && Math.hypot(mx - nx, my - ny) < radius;
    moon.classList.toggle("night-name", over);
    // grows out of the pointer like the round itself (style.css, .16s), and shrinks back on the way out
    const now = performance.now(), dt = Math.min(.05, (now - (nameLast || now)) / 1000); nameLast = now;
    nameGrow = reduce ? +over : Math.max(0, Math.min(1, nameGrow + (over ? 1 : -1) * dt / .16));
    if (over || nameGrow > 0) {
      if (!nightName) {
        nightName = document.createElement("div");
        nightName.className = "identity name-night";
        nightName.setAttribute("aria-hidden", "true");
        document.body.appendChild(nightName);
      }
      nightName.innerHTML = identity.innerHTML;   // the p-word keeps changing, so copy it every frame
      const g = 1 - Math.pow(1 - nameGrow, 3);   // ease-out
      nightName.style.clipPath = `circle(${radius * g}px at ${mx - r.left}px ${my - r.top}px)`;
      nightName.hidden = false;
    } else if (nightName) nightName.hidden = true;
  };

  /* ---------- river: the sun drifts as its reflection ---------- */
  // On the river the sun goes liquid where it is and drifts with the current, at the river's own
  // speed, like the other objects: once it has drifted off, it comes back in upstream. Back on the grid it stops
  // and drowns where it is, then rises at home, from water back to plasma.
  const NS = "http://www.w3.org/2000/svg";
  const liquid = document.createElementNS(NS, "svg");
  liquid.setAttribute("aria-hidden", "true");
  liquid.style.cssText = "position:absolute;width:0;height:0";
  // long, flat noise: the disc breaks into horizontal ripples, the way light does on moving water
  liquid.innerHTML = '<filter id="sun-liquid" x="-40%" y="-40%" width="180%" height="180%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.008 0.07" numOctaves="2" seed="7"/>' +
    '<feDisplacementMap in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.appendChild(liquid);
  const ripples = liquid.querySelector("feTurbulence"), displace = liquid.querySelector("feDisplacementMap");
  const MELT = .8, DROWN = .4, RISE = .45;   // seconds: back on the grid, the sun is home almost at once
  const ease = (x) => x * x * (3 - 2 * x);
  // sky → river → drown → rise → sky
  let river = false, phase = "sky", melt = 0, phaseTime = 0, px = 0, py = 0, flowLast = 0, firstMode = true;
  addEventListener("cabz:navigation-mode", (event) => {
    river = event.detail.mode === "river";
    if (river && phase !== "river") {
      if (phase !== "drown") { px = py = 0; }      // from home, or from wherever it was sinking
      phase = "river";
      if (firstMode || reduce) melt = 1;           // a page that opens on the river starts liquid
    } else if (!river && phase === "river") {
      phase = reduce ? "sky" : "drown"; phaseTime = 0;
    }
    firstMode = false;
  });
  const current = () => {
    const c = window.RiverExperiment?.config || {};
    const [x, y] = Array.isArray(c.flowDirection) ? c.flowDirection : [-1, 1];
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length, speed: Number.isFinite(c.flowSpeed) ? c.flowSpeed : 49 };
  };
  const riverPaused = () => document.querySelector(".river-pause")?.getAttribute("aria-pressed") === "true";
  const show = (x, y, amount, opacity, scale, now) => {
    link.classList.add("liquid");
    const sway = Math.sin(now / 1700) * 6 * amount;   // a little lateral wander, never a push
    link.style.transform = `translate(${x + sway}px, ${y}px) scale(${scale * (1 - .1 * amount)}, ${scale * (1 + .3 * amount)}) rotate(${Math.sin(now / 2300) * 4 * amount}deg)`;
    link.style.filter = amount > .01 ? "url(#sun-liquid)" : "";
    link.style.opacity = String(opacity);
    displace.setAttribute("scale", (30 * amount).toFixed(1));
    ripples.setAttribute("baseFrequency", `0.008 ${(0.07 + 0.015 * Math.sin(now / 650)).toFixed(4)}`);
  };
  const updateFlow = (now) => {
    const dt = Math.min((now - (flowLast || now)) / 1000, .05); flowLast = now;
    link.classList.toggle("reflection", phase === "river" || phase === "drown");
    if (phase === "sky") {
      if (link.classList.contains("liquid")) { link.classList.remove("liquid"); link.style.transform = link.style.filter = link.style.opacity = ""; }
      return;
    }
    if (phase === "river") {
      melt = Math.min(1, melt + dt / MELT);
      if (!reduce && !riverPaused()) {
        const c = current();
        px += c.x * c.speed * dt; py += c.y * c.speed * dt;
        // once it has drifted off, it comes back in upstream, the way river.js brings its objects back:
        // a point somewhere on screen, walked back against the current until it is just out of sight
        const w = link.offsetWidth, h = link.offsetHeight, far = Math.max(w, h);
        const cx = link.offsetLeft + w / 2 + px, cy = link.offsetTop + h / 2 + py;
        if (cx < -far || cx > innerWidth + far || cy < -far || cy > innerHeight + far) {
          let x = innerWidth * (.15 + Math.random() * .7), y = innerHeight * (.2 + Math.random() * .6);
          const tx = Math.abs(c.x) < .001 ? Infinity : (c.x > 0 ? x + far : innerWidth + far - x) / Math.abs(c.x);
          const ty = Math.abs(c.y) < .001 ? Infinity : (c.y > 0 ? y + far : innerHeight + far - y) / Math.abs(c.y);
          const back = Math.min(tx, ty) * .98;
          x -= c.x * back; y -= c.y * back;
          px = x - link.offsetLeft - w / 2; py = y - link.offsetTop - h / 2;
        }
      }
      show(px, py, ease(melt), 1 - .2 * melt, 1, now);
    } else if (phase === "drown") {
      // it stops where it is and sinks: ripples harder, shrinks a little, slips under
      phaseTime = Math.min(1, phaseTime + dt / DROWN);
      const k = ease(phaseTime);
      show(px, py + 18 * k, 1 + .8 * k, .8 * (1 - k), 1 - .25 * k, now);
      if (phaseTime >= 1) { phase = "rise"; phaseTime = 0; px = py = 0; melt = 0; }
    } else if (phase === "rise") {
      // home again: from water to plasma, the ripples settle as it comes back
      phaseTime = Math.min(1, phaseTime + dt / RISE);
      const k = ease(phaseTime);
      show(0, 0, 1 - k, k, .92 + .08 * k, now);
      if (phaseTime >= 1) phase = "sky";
    }
  };

  /* ---------- drawing ---------- */

  const MARGIN = 0.12;               // within this share of the sun's radius from the centre: rays fully gone
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // the page follows the eclipse: the painted sky with black type → night with neon purple type
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const SKY = { bg: [hex("#EFB4A5"), hex("#222222")], fg: [hex("#222222"), hex("#B026FF")] };   // type: charcoal → neon purple
  const mix = (pair, k) => "rgb(" + pair[0].map((v, i) => Math.round(v + (pair[1][i] - v) * k)).join(",") + ")";
  const root = document.documentElement.style;
  let lastK = -1;
  function setSky(k) {
    const q = Math.round(k * 100) / 100;
    if (q === lastK) return;
    lastK = q;
    document.body.classList.toggle("eclipse-dark", q >= 0.72);
    root.setProperty("--night", q);                       // the painted sky darkens to charcoal
    root.setProperty("--bg", mix(SKY.bg, q));
    root.setProperty("--fg", mix(SKY.fg, q));
    const [r, g, b] = mix(SKY.fg, q).match(/\d+/g);
    root.setProperty("--dim", `rgba(${r},${g},${b},${0.42 + 0.3 * q})`);
  }

  if (savedLock()) setLocked(true);
  addEventListener("pageshow", () => { if (savedLock() !== locked) setLocked(savedLock()); });

  function draw(now) {
    updateFlow(now);
    const k = locked ? 1 : river || phase !== "sky" ? 0 : eclipseAt(mx, my);
    setSky(k);
    updateInvert();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sunImage.complete && sunImage.naturalWidth) ctx.drawImage(sunImage, 0, 0, canvas.width, canvas.height);
    updateSunCursor();

    if (k > 0.002) {
      // totality: the rays fade out, the round body of the sun stays (under the moon)
      const sc = canvas.width / BOX;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${k})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      // the body itself comes back untouched: the picture again, cut to its round
      ctx.save();
      ctx.beginPath(); ctx.arc(C * sc, C * sc, built.core * sc, 0, Math.PI * 2); ctx.clip();
      if (sunImage.complete) ctx.drawImage(sunImage, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  const tick = (now) => {
    if (!document.hidden) draw(now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

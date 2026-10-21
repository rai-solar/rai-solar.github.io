// CABeZa · the sun on the home page, drawn live with soleil's own engine
// (soleil/js/config, state, geometry, draw) and rippling: the waves run along its rays.
//
// The mouse carries a moon: a disc the colour of the background, a touch bigger than the sun's body,
// always under the pointer (it hides whatever it passes over). Bring it onto the centre of
// the sun and the rays fade with the distance: gone when it sits on the centre (almost exactly).
// Click a total eclipse to park the moon and lock night; pick it up to return to day.
// The whole page darkens with it: the painted sky goes to night, charcoal type → neon purple.
(() => {
  "use strict";
  const Sun = window.Sun;
  const link = document.querySelector(".sun");
  if (!Sun || !Sun.paint || !link) return;

  // as close as the engine gets to soleil.png: 24 wavy rays, scarlet, a carrot disc
  const s = Object.assign(Sun.defaults(), {
    count: 24, ray: "#E83700", disc: "#FF4500", discSize: 89, ring: "solid"
  });
  const built = Sun.buildSun(s);

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

  const BOX = Sun.config.BOX, C = Sun.config.C;
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
    link.style.cursor = !locked && hitZone(mx, my) !== "none" ? "var(--cursor-hand, pointer)" : "none";
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

  /* ---------- drawing ---------- */

  const LOOP = 3000;                 // one ripple every 3 s
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
    const k = locked ? 1 : eclipseAt(mx, my);
    setSky(k);

    const t = reduce ? 0 : (now % LOOP) / LOOP;
    const settings = Object.assign({}, s, { wavePhase: -2 * Math.PI * t });
    const frame = Sun.buildSun(settings);
    Sun.paint(canvas, settings, frame);
    updateSunCursor();

    if (k > 0.002) {
      // totality: the rays fade out, the round body of the sun stays (under the moon)
      const sc = canvas.width / BOX;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${k})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath(); ctx.arc(C * sc, C * sc, built.core * sc, 0, Math.PI * 2);
      ctx.fillStyle = s.ray; ctx.fill();
      ctx.beginPath(); ctx.arc(C * sc, C * sc, built.disc * sc, 0, Math.PI * 2);
      ctx.fillStyle = s.disc; ctx.fill();
    }
  }

  const tick = (now) => {
    if (!document.hidden) draw(now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

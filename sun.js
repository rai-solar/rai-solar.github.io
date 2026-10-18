// CABeZa · the sun on the home page, drawn live with soleil's own engine
// (soleil/js/config, state, geometry, draw) and rippling: the waves run along its rays.
//
// The mouse carries a moon: a disc the colour of the background, as big as the sun's disc,
// always under the pointer (it hides whatever it passes over). Bring it onto the centre of
// the sun, almost exactly, and the rays go out: an eclipse.
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
  const moon = document.createElement("div");
  moon.className = "sun-ball";
  moon.setAttribute("aria-hidden", "true");
  document.body.appendChild(moon);
  const discPx = () => link.clientWidth * (2 * built.disc) / BOX;   // the disc's diameter on screen

  let mx = -1e4, my = -1e4;
  addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    const d = discPx();
    moon.style.width = moon.style.height = d + "px";
    moon.style.transform = `translate(${mx - d / 2}px, ${my - d / 2}px)`;
    moon.style.visibility = "visible";
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { moon.style.visibility = "hidden"; mx = my = -1e4; });

  /* ---------- drawing ---------- */

  const LOOP = 3000;                 // one ripple every 3 s
  const MARGIN = 0.14;               // how close to the centre counts, as a share of the disc's radius
  const ease = (x) => x * x * (3 - 2 * x);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let e = 0, last = performance.now();

  function draw(now) {
    const dt = Math.min(64, now - last); last = now;
    // is the moon on the sun's centre?
    const r = link.getBoundingClientRect();
    const off = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
    const aligned = off < (r.width * built.disc / BOX) * MARGIN;
    e += ((aligned ? 1 : 0) - e) * Math.min(1, dt / (aligned ? 260 : 420));
    const k = ease(Math.max(0, Math.min(1, e)));

    const t = reduce ? 0 : (now % LOOP) / LOOP;
    Sun.paint(canvas, Object.assign({}, s, { wavePhase: -2 * Math.PI * t }));

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

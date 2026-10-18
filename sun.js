// CABeZa · the sun on the home page, drawn live with soleil's own engine
// (soleil/js/config, state, geometry, draw) and rippling: the waves run along its rays.
//
// Hovering it does one of three things (try them with the debug button under the sun):
//   extend  the disc's colour spreads out over the rays to the edge
//   shrink  the sun shrinks until it's gone
//   eclipse the mouse becomes a huge black ball
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

  /* ---------- hover mode, chosen with the debug button ---------- */

  const MODES = ["extend", "shrink", "eclipse"];
  let mode = "extend";
  try { if (MODES.includes(localStorage.getItem("cabz-sun-hover"))) mode = localStorage.getItem("cabz-sun-hover"); } catch (e) {}

  const debug = document.createElement("button");
  debug.type = "button";
  debug.className = "sun-debug";
  const label = () => { debug.textContent = "debug · hover: " + mode; link.dataset.hover = mode; };
  label();
  debug.addEventListener("click", () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    try { localStorage.setItem("cabz-sun-hover", mode); } catch (e) {}
    label();
  });
  link.after(debug);

  // the black ball that replaces the mouse
  const ball = document.createElement("div");
  ball.className = "sun-ball";
  ball.setAttribute("aria-hidden", "true");
  document.body.appendChild(ball);

  /* ---------- hover amount h: 0 → 1, eased ---------- */

  let target = 0, h = 0, last = performance.now();
  link.addEventListener("pointerenter", (e) => { target = 1; moveBall(e); });
  link.addEventListener("pointerleave", () => { target = 0; });
  link.addEventListener("pointermove", moveBall);
  link.addEventListener("focus", () => { target = 1; });
  link.addEventListener("blur", () => { target = 0; });
  function moveBall(e) { ball.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`; }

  /* ---------- drawing ---------- */

  const LOOP = 3000;   // one ripple every 3 s
  const ease = (x) => x * x * (3 - 2 * x);

  function draw(now) {
    const dt = Math.min(64, now - last); last = now;
    h += (target - h) * Math.min(1, dt / 220);           // smooth follow
    const k = ease(Math.max(0, Math.min(1, h)));
    const t = reduce ? 0 : (now % LOOP) / LOOP;
    const f = Object.assign({}, s, { wavePhase: -2 * Math.PI * t });

    if (mode === "shrink" && k > 0) {
      // the whole sun shrinks into its centre
      f.size = s.size * (1 - k);
      if (f.size < 0.5) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    }
    Sun.paint(canvas, f);

    if (mode === "extend" && k > 0) {
      // the disc's colour grows past the rays, out to the edge of the square
      const box = Sun.config.BOX, c = Sun.config.C, sc = canvas.width / box;
      const r = built.disc + k * (c - built.disc);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.arc(c * sc, c * sc, r * sc, 0, Math.PI * 2);
      ctx.fillStyle = s.disc;
      ctx.fill();
    }

    if (mode === "eclipse") {
      const size = link.clientWidth * 0.75 * k;
      ball.style.width = ball.style.height = size + "px";
      ball.style.opacity = k > 0.01 ? 1 : 0;
    } else {
      ball.style.opacity = 0;
    }
  }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tick = (now) => {
    if (!document.hidden) draw(now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// CABeZa · the sun on the home page, drawn live with soleil's own engine
// (soleil/js/config, state, geometry, draw) and rippling: the waves run along its rays.
//
// Hovering it does one of three things; the sun keeps its shape, only its colours change
// (try them with the debug button under the sun):
//   extend   the disc's orange spreads out through the rays
//   shrink   the disc's orange shrinks until it's gone
//   eclipse  a disc the colour of the background follows the mouse, appearing at once
//            as soon as it would touch the sun
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
    ball.style.visibility = "hidden";
    label();
  });
  link.after(debug);

  // eclipse: the background-coloured disc that follows the mouse
  const ball = document.createElement("div");
  ball.className = "sun-ball";
  ball.setAttribute("aria-hidden", "true");
  document.body.appendChild(ball);
  const ballSize = () => link.clientWidth * 0.75;
  addEventListener("pointermove", (e) => {
    if (mode !== "eclipse") { ball.style.visibility = "hidden"; return; }
    const r = link.getBoundingClientRect(), d = ballSize();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // shows up in one go, as soon as the disc would reach the sun's rays
    const near = Math.hypot(e.clientX - cx, e.clientY - cy) < r.width / 2 + d / 2;
    ball.style.width = ball.style.height = d + "px";
    ball.style.transform = `translate(${e.clientX - d / 2}px, ${e.clientY - d / 2}px)`;
    ball.style.visibility = near ? "visible" : "hidden";
  }, { passive: true });
  document.addEventListener("pointerleave", () => { ball.style.visibility = "hidden"; });

  /* ---------- hover amount h: 0 → 1, eased (extend, shrink) ---------- */

  let target = 0, h = 0, last = performance.now();
  link.addEventListener("pointerenter", () => { target = 1; });
  link.addEventListener("pointerleave", () => { target = 0; });
  link.addEventListener("focus", () => { target = 1; });
  link.addEventListener("blur", () => { target = 0; });

  /* ---------- drawing ---------- */

  const LOOP = 3000;   // one ripple every 3 s
  const ease = (x) => x * x * (3 - 2 * x);

  function draw(now) {
    const dt = Math.min(64, now - last); last = now;
    h += (target - h) * Math.min(1, dt / 220);           // smooth follow
    const k = ease(Math.max(0, Math.min(1, h)));
    const t = reduce ? 0 : (now % LOOP) / LOOP;
    const f = Object.assign({}, s, { wavePhase: -2 * Math.PI * t });

    // shrink: the disc gets smaller until only the ray colour is left
    if (mode === "shrink") f.discSize = s.discSize * (1 - k);
    Sun.paint(canvas, f);

    // extend: the disc colour grows outwards, painted only where the sun already is
    if (mode === "extend" && k > 0.001) {
      const sc = canvas.width / Sun.config.BOX, c = Sun.config.C;
      const r = built.disc + k * (c - built.disc);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-atop";
      ctx.beginPath();
      ctx.arc(c * sc, c * sc, r * sc, 0, Math.PI * 2);
      ctx.fillStyle = s.disc;
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
  }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tick = (now) => {
    if (!document.hidden) draw(now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

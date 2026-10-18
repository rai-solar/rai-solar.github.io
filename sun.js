// CABeZa · the sun on the home page, drawn live with soleil's own engine
// (soleil/js/config, state, geometry, draw) and rippling: the waves run along its rays.
//
// The mouse carries a moon: a disc the colour of the background, a touch bigger than the sun's body,
// always under the pointer (it hides whatever it passes over). Bring it onto the centre of
// the sun and the rays fade with the distance: gone when it sits on the centre (almost exactly).
// The whole page darkens with it: pink → black, black type → flashy blue.
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
  // the moon covers the whole round body of the sun (the circle the rays grow from), plus a hair
  const discPx = () => link.clientWidth * (2 * built.core * 1.06) / BOX;

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
  const MARGIN = 0.12;               // within this share of the sun's radius from the centre: rays fully gone
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // the page follows the eclipse: pink with black type → black with flashy blue type
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const SKY = { bg: [hex("#FFB7AF"), hex("#000000")], fg: [hex("#000000"), hex("#1E3CFF")] };
  const mix = (pair, k) => "rgb(" + pair[0].map((v, i) => Math.round(v + (pair[1][i] - v) * k)).join(",") + ")";
  const root = document.documentElement.style;
  let lastK = -1;
  function setSky(k) {
    const q = Math.round(k * 100) / 100;
    if (q === lastK) return;
    lastK = q;
    root.setProperty("--bg", mix(SKY.bg, q));
    root.setProperty("--fg", mix(SKY.fg, q));
    const [r, g, b] = mix(SKY.fg, q).match(/\d+/g);
    root.setProperty("--dim", `rgba(${r},${g},${b},${0.42 + 0.3 * q})`);
  }

  function draw(now) {
    // how far is the moon from the sun's centre? the rays follow that distance directly:
    // fully there while the moon doesn't touch the sun, gone once it sits on the centre
    const r = link.getBoundingClientRect();
    const off = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
    const R = r.width * built.core / BOX;                  // the sun's body, in screen pixels
    const far = R + discPx() / 2, near = R * MARGIN;       // moon just touching → centred
    const k = Math.max(0, Math.min(1, (far - off) / (far - near)));
    setSky(k);

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

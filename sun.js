// CABeZa · the sun on the home page, drawn live with soleil's own engine
// (soleil/js/config, state, geometry, draw) and rippling: the waves run along its rays.
(() => {
  "use strict";
  const Sun = window.Sun;
  const link = document.querySelector(".sun");
  if (!Sun || !Sun.paint || !link) return;

  // as close as the engine gets to soleil.png: 24 wavy rays, scarlet, a carrot disc
  const s = Object.assign(Sun.defaults(), {
    count: 24, ray: "#E83700", disc: "#FF4500", discSize: 89, ring: "solid"
  });

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  link.prepend(canvas);
  link.classList.add("live");

  const size = () => {
    const px = Math.round(link.clientWidth * Math.min(2, devicePixelRatio || 1));
    if (canvas.width !== px) canvas.width = canvas.height = px;
  };
  size();
  addEventListener("resize", size);

  const LOOP = 3000;   // one ripple every 3 s
  const draw = (t) => Sun.paint(canvas, Object.assign({}, s, { wavePhase: -2 * Math.PI * t }));

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { draw(0); return; }
  const tick = (now) => {
    if (!document.hidden) draw((now % LOOP) / LOOP);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

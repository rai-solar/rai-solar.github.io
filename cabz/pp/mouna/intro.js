(() => {
  'use strict';

  const canvas = document.getElementById('introLiquid');
  const btn = document.getElementById('introEnter');
  if (!canvas || !btn) return;

  const ctx = canvas.getContext('2d');

  const css = getComputedStyle(document.documentElement);
  const BG = css.getPropertyValue('--intro-bg').trim() || '#FFFFFF';
  const FILL = css.getPropertyValue('--intro-fill').trim() || '#FFFEEE';
  const T_FILL = parseInt(css.getPropertyValue('--t-intro-fill')) || 2400;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let rafId = null;
  let isAnimating = false;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  function ease(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
  }

  function draw(progress, time) {
    ctx.clearRect(0, 0, w, h);

    const p = ease(progress);
    const fillHeight = h * p;
    const yTop = h - fillHeight;

    const waveAmp = (1 - p) * 20 + 6;
    const waveLen = Math.max(300, w * 0.6);

    ctx.fillStyle = FILL;
    ctx.beginPath();

    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.lineTo(w, yTop);

    const steps = Math.floor(w / 8);

    for (let i = 0; i <= steps; i++) {
      const x = w - (i / steps) * w;
      const a = (x / waveLen) * Math.PI * 2;

      const wave =
        Math.sin(a + time * 0.002) * waveAmp * 0.6 +
        Math.sin(a * 2 - time * 0.0015) * waveAmp * 0.3;

      ctx.lineTo(x, yTop + wave);
    }

    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  function animate(duration, done) {
    const start = performance.now();
    isAnimating = true;

    const loop = (t) => {
      const p = Math.min(1, (t - start) / duration);
      draw(p, t);

      if (p < 1) {
        rafId = requestAnimationFrame(loop);
      } else {
        isAnimating = false;
        done && done();
      }
    };

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  btn.addEventListener('click', () => {
    if (isAnimating) return;

    btn.disabled = true;
    document.body.classList.add('is-filling');

    animate(T_FILL, () => {
      setTimeout(() => {
        window.location.href = './poids.html';
      }, 150);
    });
  });
})();
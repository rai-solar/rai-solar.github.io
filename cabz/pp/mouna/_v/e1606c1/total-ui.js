(() => {
  'use strict';

  const overlay = document.getElementById('pee-overlay');
  const monthEl = document.getElementById('total-month');
  const prevBtn = document.getElementById('total-prev');
  const nextBtn = document.getElementById('total-next');
  const graph = document.getElementById('total-graph');

  if (!overlay || !monthEl || !prevBtn || !nextBtn || !graph) return;

  const gctx = graph.getContext('2d');

  const months = [
    '2024-09','2024-10','2024-11','2024-12',
    '2025-01','2025-02','2025-03','2025-04','2025-05','2025-06','2025-07'
  ];

  let currentIdx = months.length - 1;

  function daysInMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function resizeGraph() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = graph.getBoundingClientRect();
    const w = Math.max(10, Math.round(rect.width));
    const h = Math.max(10, Math.round(rect.height));
    graph.width = Math.round(w * dpr);
    graph.height = Math.round(h * dpr);
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawGraph(ym) {
    resizeGraph();

    const rect = graph.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    gctx.clearRect(0, 0, W, H);

    const padX = Math.max(10, W * 0.03);
    const padY = Math.max(10, H * 0.10);

    const innerW = W - padX * 2;
    const innerH = H - padY * 2;

    const nDays = daysInMonth(ym);
    const seed = hashStr(ym);

    const vals = new Array(nDays).fill(0).map((_, i) => {
      const t = (seed % 1000) / 1000;
      const a = Math.sin((i / nDays) * Math.PI * 2 + t * 6.28) * 0.5 + 0.5;
      const b = Math.sin((i / nDays) * Math.PI * 6 - t * 8.2) * 0.5 + 0.5;
      return Math.max(0, Math.round(0.3 + 2.2 * a + 1.0 * b));
    });

    const maxV = Math.max(1, ...vals);

    // minimal axes
    gctx.globalAlpha = 0.28;
    gctx.strokeStyle = '#111';
    gctx.lineWidth = 1;
    gctx.beginPath();
    gctx.moveTo(padX, padY);
    gctx.lineTo(padX, padY + innerH);
    gctx.lineTo(padX + innerW, padY + innerH);
    gctx.stroke();

    // bars
    gctx.globalAlpha = 0.9;
    gctx.fillStyle = '#111';

    const gap = Math.max(1, innerW / nDays * 0.28);
    const bw = (innerW - gap * (nDays - 1)) / nDays;

    for (let i = 0; i < nDays; i++) {
      const x = padX + i * (bw + gap);
      const bh = (vals[i] / maxV) * innerH;
      const y = padY + innerH - bh;
      gctx.fillRect(x, y, bw, bh);
    }

    gctx.globalAlpha = 1;
  }

  function setMonthByIdx(idx) {
    currentIdx = Math.max(0, Math.min(months.length - 1, idx));
    const ym = months[currentIdx];
    monthEl.textContent = ym;
    drawGraph(ym);
  }

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    setMonthByIdx(currentIdx - 1);
  });

  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    setMonthByIdx(currentIdx + 1);
  });

  window.addEventListener('ps:month-change', (ev) => {
    const d = ev.detail || {};
    const key = d.monthKey || d.month || d.key || d.label;
    if (typeof key === 'string') {
      const maybe = key.slice(0, 7);
      const found = months.indexOf(maybe);
      if (found !== -1) setMonthByIdx(found);
    }
  });

  window.addEventListener('resize', () => {
    setMonthByIdx(currentIdx);
  });

  setMonthByIdx(currentIdx);
})();
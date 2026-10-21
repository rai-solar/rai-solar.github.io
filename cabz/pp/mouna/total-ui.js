(() => {
  "use strict";

  const overlay = document.getElementById("pee-overlay");
  const canvas = document.getElementById("pee-ui-canvas");
  if (!overlay || !canvas) return;

  const ctx = canvas.getContext("2d");

  const PERSON_TOTALS = {
    Tom: 387,
    Meowth: 400,
    Garfield: 232,
    Luna: 570,
  };

  const MONTHLY_TOTALS = [116, 177, 166, 186, 160, 144, 208, 206, 226];
  const MONTH_DAY_COUNTS = [30, 31, 30, 31, 31, 28, 31, 30, 31];

  const TOTAL_DAYS = 273;

  const TOTAL_PISSES = 1589;
  const TOTAL_PISSES_ERR = 100;

  const TOTAL_LITRES = 70;
  const TOTAL_LITRES_ERR = 5;

  const TOTAL_HOURS = 39;
  const TOTAL_HOURS_ERR = 3;

  const DAILY_PISSES = TOTAL_PISSES / TOTAL_DAYS;
  const DAILY_PISSES_ERR = TOTAL_PISSES_ERR / TOTAL_DAYS;

  const DAILY_LITRES = TOTAL_LITRES / TOTAL_DAYS;
  const DAILY_LITRES_ERR = TOTAL_LITRES_ERR / TOTAL_DAYS;

  const DAILY_MINUTES = (TOTAL_HOURS * 60) / TOTAL_DAYS;
  const DAILY_MINUTES_ERR = (TOTAL_HOURS_ERR * 60) / TOTAL_DAYS;

  const GRID_LINES = [500, 1000, 1500];
  const GRAPH_MAX = 1600;

  const bottleImg = new Image();
  let bottleReady = false;
  bottleImg.onload = () => {
    bottleReady = true;
    render();
  };
  bottleImg.src = "imgs/bouteille.svg";

  function remToPx(rem) {
    const fs =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * fs;
  }

  function cssPxVar(name, fallback) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();

    if (!raw) return fallback;
    if (raw.endsWith("rem")) return remToPx(parseFloat(raw));
    if (raw.endsWith("px")) return parseFloat(raw);
    return parseFloat(raw) || fallback;
  }

  function setCanvasSize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function setFont(size, weight = 400) {
    ctx.font = `${weight} ${size}px "Helvetica Neue", Helvetica, Arial`;
  }

  function drawText(text, x, y, opt = {}) {
    const {
      size = 16,
      weight = 400,
      color = "#111",
      align = "left",
      baseline = "top",
    } = opt;

    setFont(size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
  }

  function drawLines(lines, x, y, opt = {}) {
    const size = opt.size || 16;
    const lh = opt.lineHeight || size * 1.45;

    lines.forEach((line, i) => {
      drawText(line, x, y + i * lh, opt);
    });
  }

  function makeDailySeries(monthTotals, monthDayCounts) {
    const out = [];

    for (let m = 0; m < monthTotals.length; m++) {
      const total = monthTotals[m];
      const nDays = monthDayCounts[m];
      const base = total / nDays;

      const weights = [];
      let sum = 0;

      for (let d = 0; d < nDays; d++) {
        const t = d / Math.max(1, nDays - 1);

        const w1 = 1 + 0.18 * Math.sin(t * Math.PI * 2 + m * 0.65);
        const w2 = 1 + 0.1 * Math.sin(t * Math.PI * 5 - m * 0.4);
        const w3 = 1 + 0.06 * Math.cos(t * Math.PI * 3.5 + d * 0.12);

        const weight = Math.max(0.2, w1 * w2 * w3);
        weights.push(weight);
        sum += weight;
      }

      for (let d = 0; d < nDays; d++) {
        out.push(base * nDays * (weights[d] / sum));
      }
    }

    return out;
  }

  function cumulative(values) {
    let acc = 0;
    return values.map((v) => {
      acc += v;
      return acc;
    });
  }

  function monthStarts(dayCounts) {
    const starts = [0];
    let acc = 0;

    for (let i = 0; i < dayCounts.length; i++) {
      acc += dayCounts[i];
      starts.push(acc);
    }

    return starts;
  }

  function drawAxes(x, y, w, h) {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 0.8;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  }

  function drawGridLines(x, y, w, h, maxVal) {
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 0.8;

    GRID_LINES.forEach((val) => {
      const py = y + h - (val / maxVal) * h;

      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();

      drawText(String(val), x + w - 6, py - 7, {
        size: 14,
        color: "#666",
        align: "right",
        baseline: "bottom",
      });
    });
  }

  function drawCurve(x, y, w, h, dailyValues) {
    const cum = cumulative(dailyValues);
    const n = cum.length;

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 0.6;
    ctx.beginPath();

    cum.forEach((v, i) => {
      const px = x + (i / Math.max(1, n - 1)) * w;
      const py = y + h - (v / GRAPH_MAX) * h;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    ctx.stroke();
  }

  function drawMonths(x, y, w, dayCounts) {
    const starts = monthStarts(dayCounts);
    const labels = [
      "01.10",
      "01.11",
      "01.12",
      "01.01",
      "01.02",
      "01.03",
      "01.04",
      "01.05",
      "01.06",
    ];
    const total = dayCounts.reduce((a, b) => a + b, 0);

    for (let i = 1; i < starts.length; i++) {
      const px = x + (starts[i] / total) * w;
      drawText(labels[i - 1], px, y, {
        size: 15,
        color: "#666",
        align: "center",
      });
    }

    // final 01.06 at the end
    drawText("01.06", x + w, y, {
      size: 15,
      color: "#666",
      align: "center",
    });
  }

  function drawBars(x, startY, width) {
    const order = [
      { name: "Tom", value: 387, color: "#e39b24" },
      { name: "Meowth", value: 400, color: "#e46b23" },
      { name: "Garfield", value: 232, color: "#d72d18" },
      { name: "Luna", value: 570, color: "#9f0010" },
    ];

    const max = 570;
    const maxWidth = width * 0.8;
    const barH = 10;
    const gap = 44;

    order.forEach((p, i) => {
      const y = startY + i * gap;

      drawText(p.name, x, y - 17, {
        size: 14,
        color: "#666",
      });

      const bw = (p.value / max) * maxWidth;

      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, bw, barH);

      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, bw, barH);
    });

    return startY + order.length * gap;
  }

  function drawRightColumn(x, y) {
    drawLines(
      ["273 jours =", `1589 ± 100 mictions`, `70 ± 5 litres`, `39 ± 3 heures`],
      x,
      y,
      {
        size: 17,
        color: "#111",
        lineHeight: 30,
      },
    );

    drawLines(
      [
        "1 jour =",
        `${DAILY_PISSES.toFixed(1)} ± ${DAILY_PISSES_ERR.toFixed(1)} mictions`,
        `${DAILY_LITRES.toFixed(2)} ± ${DAILY_LITRES_ERR.toFixed(2)} litres`,
        `${DAILY_MINUTES.toFixed(1)} ± ${DAILY_MINUTES_ERR.toFixed(1)} minutes`,
      ],
      x,
      y + 170,
      {
        size: 17,
        color: "#111",
        lineHeight: 30,
      },
    );
  }

  function drawBottlesLine(x, y, availableW) {
    if (!bottleReady) return;

    const count = 40;

    // base spacing between bottles
    const spacing = 6;

    // compute base width
    const baseW = (availableW - spacing * (count - 1)) / count;

    // make bottles slightly thicker (15%)
    const bottleW = baseW * 1.15;

    const ratio =
      bottleImg.naturalWidth && bottleImg.naturalHeight
        ? bottleImg.naturalHeight / bottleImg.naturalWidth
        : 3;

    const bottleH = bottleW * ratio;

    // recompute step so the row still fills the width
    const step = (availableW - bottleW) / (count - 1);

    for (let i = 0; i < count; i++) {
      const bx = x + i * step;
      ctx.drawImage(bottleImg, bx, y - bottleH, bottleW, bottleH);
    }
  }

  function draw() {
    const { w, h } = setCanvasSize();

    ctx.clearRect(0, 0, w, h);

    const margin = cssPxVar("--page-margin", 20);
    const gap = cssPxVar("--gap-x", 20);

    const innerW = w - margin * 2;
    const rightW = (innerW - gap) / 4;
    const leftW = innerW - gap - rightW;

    const leftX = margin;
    const rightX = leftX + leftW + gap;
    const titleY = margin;

    drawText("Total", leftX, titleY + 4, {
      size: 28,
      weight: 700,
    });

    const graphTop = titleY + 80;
    const graphLeft = leftX + 8;
    const graphW = leftW - 16;
    const graphH = Math.min(h * 0.43, 400);

    drawAxes(graphLeft, graphTop, graphW, graphH);
    drawGridLines(graphLeft, graphTop, graphW, graphH, GRAPH_MAX);

    const daily = makeDailySeries(MONTHLY_TOTALS, MONTH_DAY_COUNTS);
    drawCurve(graphLeft, graphTop, graphW, graphH, daily);

    drawMonths(graphLeft, graphTop + graphH + 8, graphW, MONTH_DAY_COUNTS);

    drawText(
      "Fig. 1 — Nombre total de mictions nettoyées sur toute la période (01.09.2024–31.05.2025)",
      graphLeft,
      graphTop + graphH + 30,
      { size: 17, weight: 400, color: "#666" },
    );

    const barsStart = graphTop + graphH + 92;
    const barsEnd = drawBars(graphLeft + 2, barsStart, leftW);

    drawText(
      "Fig. 2 — Nombre total de mictions nettoyées par personne (01.09.2024–31.05.2025)",
      graphLeft,
      barsEnd - 22,
      { size: 17, weight: 400, color: "#666" },
    );

    drawRightColumn(rightX, graphTop);

    drawBottlesLine(leftX, h - margin - 44, innerW);

    ctx.globalCompositeOperation = "destination-out";
  }

  function render() {
    if (!overlay.classList.contains("is-active")) return;
    draw();
  }

  window.addEventListener("ps:pee-open", () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(render);
    });
  });

  window.addEventListener("resize", () => {
    if (!overlay.classList.contains("is-active")) return;
    render();
  });
})();

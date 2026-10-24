(() => {
  // Heatmap + month cylinders
  // - Caches month point clouds (no new random pattern on hover)
  // - Cylinders start empty, fill on first hover/selection
  // - Emits ps:month-change so other scripts (cleaned-bars) can update

  const OPACITY = 0.10;
  const RADIUS = 14;
  const THRESHOLDS = [0.10, 0.25, 0.50, 0.95];

  const OVERLAY_SVG_EARLY = "imgs/coco_03.svg";
  const OVERLAY_SVG_LATE = "imgs/coco_03-2.svg";

  const HOTSPOTS_CSV = "data/hotspots_02.csv";
  const PIPI_CSV = "data/pipi.csv";

  const MAX_LITERS = 8;
  const ML_PER_PEE = 25;
  const TARGET_WIDTH = 1021;

  const FILL_BASE = "#FCFD99";
  const FILL_HOVER = "#F4C340";

  const CYL_STROKE = 0.75;

  const canvas = document.getElementById("heatmap");
  const monthCylContainer = document.getElementById("month-cylinders");
  if (!canvas || !monthCylContainer) return;

  const ctx = canvas.getContext("2d");

  let overlayImg = null;
  let hotspotData = null;
  let monthData = [];
  let currentIdx = 0;

  const monthPointsCache = new Map(); // idx -> points[]
  const cylFillState = new Map(); // idx -> { targetH, currentH, done }
  const overlayCache = new Map(); // path -> { text, img }

  function dispatchMonthChange(idx) {
    const m = monthData[idx];
    if (!m) return;
    window.dispatchEvent(
      new CustomEvent("ps:month-change", {
        detail: { idx, month: m.month, total: m.total, label: m.label }
      })
    );
  }

  function parseCSV(csvText) {
    const lines = csvText.trim().split("\n");
    const header = lines[0].split(",").map((s) => s.trim());
    return lines.slice(1).map((line) => {
      const obj = {};
      line.split(",").forEach((value, i) => {
        const key = header[i];
        value = (value ?? "").trim();
        if (["x", "y", "hotspot_weight", "sublocation_weight"].includes(key)) {
          obj[key] = Number(value);
        } else {
          obj[key] = value;
        }
      });
      return obj;
    });
  }

  function parsePipi(csvText) {
    const lines = csvText.trim().split("\n");
    const header = lines[0].split(",").map((s) => s.trim());
    const idxMonth = header.indexOf("month");
    const idxTotal = header.indexOf("total");
    return lines
      .slice(1)
      .map((line) => {
        const cols = line.split(",").map((s) => s.trim());
        return { month: cols[idxMonth], total: parseInt(cols[idxTotal], 10) };
      })
      .filter((d) => d.month && Number.isFinite(d.total));
  }

  function monthLabel(month) {
    const mm = month.split("-")[1];
    const map = {
      "01": "Jan",
      "02": "Feb",
      "03": "Mar",
      "04": "Apr",
      "05": "May",
      "06": "Jun",
      "07": "Jul",
      "08": "Aug",
      "09": "Sep",
      "10": "Oct",
      "11": "Nov",
      "12": "Dec"
    };
    return map[mm] || month;
  }

  function getPeriodForMonth(month) {
    if (["24-09", "24-10", "24-11", "24-12"].includes(month)) return "sept-dec";
    if (month === "25-01") return "jan";
    if (["25-02", "25-03"].includes(month)) return "feb-mar";
    if (["25-04", "25-05"].includes(month)) return "apr+";
    return "apr+";
  }

  function getOverlayPathForMonth(month) {
    const mm = month.split("-")[1];
    return mm === "04" || mm === "05" ? OVERLAY_SVG_LATE : OVERLAY_SVG_EARLY;
  }

  function getWeightedLocations(rows, pointsPerMonth) {
    const pool = [];
    rows.forEach((row) => {
      const w = row.hotspot_weight * row.sublocation_weight * pointsPerMonth;
      for (let i = 0; i < Math.round(w); ++i) {
        pool.push({ x: row.x, y: row.y });
      }
    });

    // Randomness ONLY once per month (cached)
    return pool.map((p) => ({
      x: p.x + (Math.random() - 0.5) * 20,
      y: p.y + (Math.random() - 0.5) * 20
    }));
  }

  function inferCanvasSizeFromSvgText(svgText) {
    const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
    if (!viewBoxMatch) {
      return { w: TARGET_WIDTH, h: Math.round((TARGET_WIDTH * 454) / 1021) };
    }

    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length !== 4) {
      return { w: TARGET_WIDTH, h: Math.round((TARGET_WIDTH * 454) / 1021) };
    }

    const vbW = parts[2];
    const vbH = parts[3];
    const w = TARGET_WIDTH;
    const h = Math.round((vbH / vbW) * w);
    return { w, h };
  }

  function svgTextToImage(svgText) {
    const blob = new Blob([svgText], {
      type: "image/svg+xml;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function loadSvgAsImage(path) {
    const text = await fetch(path).then((r) => r.text());
    const img = await svgTextToImage(text);
    return { text, img };
  }

  async function ensureOverlayForMonth(month) {
    const path = getOverlayPathForMonth(month);

    if (!overlayCache.has(path)) {
      overlayCache.set(path, await loadSvgAsImage(path));
    }

    const cached = overlayCache.get(path);
    overlayImg = cached.img;

    const { w, h } = inferCanvasSizeFromSvgText(cached.text);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function render(points, highlight = false) {
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const octx = off.getContext("2d", { willReadFrequently: true });

    points.forEach((p) => {
      const op = highlight ? OPACITY * 1.45 : OPACITY;
      const c = highlight ? "255,241,80" : "255,235,59";

      const grad = octx.createRadialGradient(p.x, p.y, 0, p.x, p.y, RADIUS);
      grad.addColorStop(0.0, `rgba(${c},${op})`);
      grad.addColorStop(0.7, `rgba(${c},${op * 0.5})`);
      grad.addColorStop(0.88, `rgba(${c},${op * 0.15})`);
      grad.addColorStop(1.0, `rgba(${c},0)`);

      octx.beginPath();
      octx.arc(p.x, p.y, RADIUS, 0, 2 * Math.PI);
      octx.fillStyle = grad;
      octx.fill();
    });

    const imgData = octx.getImageData(0, 0, W, H);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const alphaValue = d[i + 3] / 255;
      if (alphaValue === 0) {
        d[i + 3] = 0;
        continue;
      }

      let r, g, b;
      if (alphaValue < THRESHOLDS[0]) {
        r = 255;
        g = 235;
        b = 59;
      } else if (alphaValue < THRESHOLDS[1]) {
        r = 255;
        g = 193;
        b = 7;
      } else if (alphaValue < THRESHOLDS[2]) {
        r = 255;
        g = 152;
        b = 0;
      } else if (alphaValue < THRESHOLDS[3]) {
        r = 255;
        g = 87;
        b = 34;
      } else {
        r = 244;
        g = 33;
        b = 54;
      }

      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }

    octx.putImageData(imgData, 0, 0);
    ctx.drawImage(off, 0, 0);

    if (overlayImg) ctx.drawImage(overlayImg, 0, 0, W, H);
  }

  function getCachedMonthPoints(idx) {
    if (monthPointsCache.has(idx)) return monthPointsCache.get(idx);

    const m = monthData[idx];
    const period = getPeriodForMonth(m.month);
    const periodRows = hotspotData.filter((d) => d.period === period);
    const pts = getWeightedLocations(periodRows, m.total);

    monthPointsCache.set(idx, pts);
    return pts;
  }

  function showPeeCount(idx) {
    document.querySelectorAll(".pee-count").forEach((el, i) => {
      el.style.opacity = i === idx ? 1 : 0;
    });
  }

  async function renderHeatmapForMonth(idx, highlight = false) {
    currentIdx = idx;

    document.querySelectorAll(".month-cylinder").forEach((el, i) =>
      el.classList.toggle("selected", i === idx)
    );

    const m = monthData[idx];
    await ensureOverlayForMonth(m.month);

    const pts = getCachedMonthPoints(idx);
    render(pts, highlight);
    showPeeCount(idx);
    dispatchMonthChange(idx);
  }

  function animateCylinderFill(idx) {
    const st = cylFillState.get(idx);
    if (!st || st.done) return;

    const container = document.querySelectorAll(".month-cylinder")[idx];
    if (!container) return;

    const liquid = container.querySelector(".liquid");
    if (!liquid) return;

    const pxPerLiter = 15;
    const maxPx = MAX_LITERS * pxPerLiter;

    const outerY = 1.5;
    const startH = st.currentH || 0;
    const endH = st.targetH;

    const duration = 520;
    const t0 = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      const k = easeOutCubic(t);
      const h = Math.round(startH + (endH - startH) * k);

      const y = outerY + maxPx - h;
      liquid.setAttribute("height", String(Math.max(0, h)));
      liquid.setAttribute("y", String(y));

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        st.currentH = endH;
        st.done = true;
        cylFillState.set(idx, st);
      }
    }

    requestAnimationFrame(frame);
  }

  function renderMonthCylinders() {
    monthCylContainer.innerHTML = "";

    const pxPerLiter = 15;
    const maxPx = MAX_LITERS * pxPerLiter;
    const w = 52;

    const fullLen = Math.round((w * 4) / 8);
    const halfLen = Math.round((w * 3) / 8);
    const quarterLen = Math.round((w * 1.5) / 8);

    const outerX = 4;
    const outerY = 1.5;
    const outerW = w - 8;
    const outerH = maxPx;
    const svgH = maxPx + 4;

    monthData.forEach((m, idx) => {
      const totalL = (m.total * ML_PER_PEE) / 1000;
      const targetH = Math.max(22, Math.round(Math.min(totalL * pxPerLiter, maxPx)));

      cylFillState.set(idx, { targetH, currentH: 0, done: false });

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", w);
      svg.setAttribute("height", svgH);
      svg.setAttribute("viewBox", `0 0 ${w} ${svgH}`);
      svg.classList.add("svg-cylinder");

      const liquidY0 = outerY + maxPx;

      let elements = `
        <rect class="liquid" x="${outerX}" y="${liquidY0}" width="${outerW}" height="0" fill="${FILL_BASE}"/>
        <rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" fill="none" stroke="#000" stroke-width="${CYL_STROKE}"/>
      `;

      for (let l = 0; l <= MAX_LITERS * 4; ++l) {
        const liter = l / 4;
        const y = outerY + maxPx - liter * pxPerLiter;
        let tickLen = quarterLen;

        if (l % 4 === 0) {
          tickLen = fullLen;
          if (liter === 5) {
            elements += `<text x="${outerX + fullLen - 4}" y="${y - 2}" fill="#000" font-size="9.5" font-family="Helvetica Neue,Arial" text-anchor="start" alignment-baseline="middle">10L</text>`;
          }
        } else if (l % 2 === 0) {
          tickLen = halfLen;
        }

        const x1 = outerX;
        const x2 = outerX + tickLen;
        elements += `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="#000" stroke-width="${CYL_STROKE}" stroke-opacity="${l % 4 === 0 ? 0.9 : 0.7}"/>`;
      }

      svg.innerHTML = elements;

      const cyl = document.createElement("div");
      cyl.className = "month-cylinder" + (idx === 0 ? " selected" : "");
      cyl.appendChild(svg);

      const label = document.createElement("div");
      label.className = "cyl-label";
      label.innerText = m.label;
      cyl.appendChild(label);

      const countDiv = document.createElement("div");
      countDiv.className = "pee-count";
      countDiv.innerText = `${m.total} mictions`;
      countDiv.style.opacity = idx === 0 ? 1 : 0;
      cyl.appendChild(countDiv);

      cyl.addEventListener("mouseenter", async () => {
        animateCylinderFill(idx);
        await renderHeatmapForMonth(idx, true);
      });

      cyl.addEventListener("mouseleave", async () => {
        await renderHeatmapForMonth(currentIdx, false);
      });

      cyl.tabIndex = 0;

      cyl.addEventListener("focus", async () => {
        animateCylinderFill(idx);
        await renderHeatmapForMonth(idx, true);
      });

      cyl.addEventListener("blur", async () => {
        await renderHeatmapForMonth(currentIdx, false);
      });

      monthCylContainer.appendChild(cyl);
    });

    showPeeCount(0);
    animateCylinderFill(0);
  }

  (async function main() {
    const hotspotText = await fetch(HOTSPOTS_CSV).then((r) => r.text());
    hotspotData = parseCSV(hotspotText);

    const pipiText = await fetch(PIPI_CSV).then((r) => r.text());
    const pipiRows = parsePipi(pipiText);

    const monthOrder = [
      "24-09",
      "24-10",
      "24-11",
      "24-12",
      "25-01",
      "25-02",
      "25-03",
      "25-04",
      "25-05"
    ];

    const byId = Object.fromEntries(pipiRows.map((d) => [d.month, d.total]));

    monthData = monthOrder
      .filter((id) => byId[id] != null)
      .map((id) => ({
        month: id,
        total: byId[id],
        label: monthLabel(id)
      }));

    // preload both overlays once, keep crisp rendering pipeline
    await Promise.all([
      ensureOverlayForMonth("24-09"),
      ensureOverlayForMonth("25-04")
    ]);

    monthPointsCache.clear();
    monthData.forEach((_, idx) => getCachedMonthPoints(idx));

    renderMonthCylinders();
    await renderHeatmapForMonth(0, false);
  })().catch(console.error);
})();
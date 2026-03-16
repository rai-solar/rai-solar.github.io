(() => {
  const btn = document.getElementById("chiffon-btn");
  const overlay = document.getElementById("pee-overlay");

  const peeCanvas = document.getElementById("pee-canvas");
  const textCanvas = document.getElementById("pee-text-canvas"); // transition.js text
  const uiCanvas = document.getElementById("pee-ui-canvas");     // raster UI (optional)

  if (!btn || !overlay || !peeCanvas) {
    console.error("[chiffon] missing required elements", { btn, overlay, peeCanvas });
    return;
  }

  const pctx = peeCanvas.getContext("2d");
  const tctx = textCanvas ? textCanvas.getContext("2d") : null;
  const uctx = uiCanvas ? uiCanvas.getContext("2d") : null;

  const RADIUS = 78;
  const THRESHOLD = 0.50;
  const SAMPLE_STEP = 24;

  let dragging = false;
  let grabOffsetX = 0;
  let grabOffsetY = 0;

  let lastCheck = 0;
  const CHECK_EVERY_MS = 140;

  function resizeCanvas(c, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);

    c.width = w;
    c.height = h;
    c.style.width = "100%";
    c.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function prepEraser(ctx) {
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
  }

  function fillPeeLayer() {
    resizeCanvas(peeCanvas, pctx);

    pctx.globalCompositeOperation = "source-over";
    pctx.fillStyle = "#FCFD99";
    pctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    prepEraser(pctx);
  }

  function ensureAllErasersReady() {
    // Important: transition.js may draw into pee-text-canvas after open.
    // We force destination-out again on next frame so text becomes erasable.
    requestAnimationFrame(() => {
      prepEraser(pctx);
      prepEraser(tctx);
      prepEraser(uctx);
    });
  }

  function resetChiffonToCorner() {
    btn.classList.remove("is-dragging");
    btn.classList.remove("is-grabbing");
    btn.style.left = "auto";
    btn.style.top = "var(--page-margin)";
    btn.style.right = "var(--page-margin)";
    btn.style.bottom = "auto";
    btn.style.transform = "scale(1)";
  }

  function pointerPos(e) {
    return { x: e.clientX, y: e.clientY };
  }

  function eraseCircle(ctx, x, y) {
    if (!ctx) return;
    // be robust in case another script changed composite mode
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  function eraseAt(x, y) {
    eraseCircle(pctx, x, y); // background
    eraseCircle(tctx, x, y); // legacy text canvas
    eraseCircle(uctx, x, y); // raster UI canvas
  }

  function estimateClearedRatio() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const img = pctx.getImageData(0, 0, w, h).data;

    let total = 0;
    let cleared = 0;

    for (let y = 0; y < h; y += SAMPLE_STEP) {
      for (let x = 0; x < w; x += SAMPLE_STEP) {
        const i = (y * w + x) * 4 + 3;
        total++;
        if (img[i] === 0) cleared++;
      }
    }
    return total ? cleared / total : 0;
  }

  function hardStopDrag(e) {
    dragging = false;
    btn.classList.remove("is-grabbing");
    try { btn.releasePointerCapture(e.pointerId); } catch {}
  }

  function maybeClose(e) {
    if (!window.psTransition || typeof window.psTransition.close !== "function") return;
    if (!overlay.classList.contains("is-active")) return;

    const now = performance.now();
    if (now - lastCheck < CHECK_EVERY_MS) return;
    lastCheck = now;

    const ratio = estimateClearedRatio();
    if (ratio >= THRESHOLD) {
      if (dragging) hardStopDrag(e);
      window.psTransition.close();
    }
  }

  function placeChiffonUnderPointer(x, y) {
    const left = x - grabOffsetX;
    const top = y - grabOffsetY;

    btn.style.left = `${Math.round(left)}px`;
    btn.style.top = `${Math.round(top)}px`;
    btn.style.right = "auto";
    btn.style.bottom = "auto";
  }

  function onDown(e) {
    if (!overlay.classList.contains("is-active")) return;

    dragging = true;
    btn.classList.add("is-dragging");
    btn.classList.add("is-grabbing");

    const rect = btn.getBoundingClientRect();
    const { x, y } = pointerPos(e);

    grabOffsetX = x - rect.left;
    grabOffsetY = y - rect.top;

    try { btn.setPointerCapture(e.pointerId); } catch {}

    placeChiffonUnderPointer(x, y);
    eraseAt(x, y);
    maybeClose(e);

    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;

    const { x, y } = pointerPos(e);

    placeChiffonUnderPointer(x, y);
    eraseAt(x, y);
    maybeClose(e);

    e.preventDefault();
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    btn.classList.remove("is-grabbing");
    try { btn.releasePointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  }

  // events from transition.js
  window.addEventListener("ps:pee-open", () => {
    fillPeeLayer();
    resetChiffonToCorner();
    lastCheck = 0;

    // make sure ALL layers are in destination-out after transition.js paints
    ensureAllErasersReady();
  });

  window.addEventListener("ps:pee-close", () => {
    window.setTimeout(() => {
      fillPeeLayer();
      resetChiffonToCorner();
      lastCheck = 0;
      ensureAllErasersReady();
    }, 900);
  });

  btn.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp, { passive: false });

  window.addEventListener("resize", () => {
    if (overlay.classList.contains("is-active")) {
      fillPeeLayer();
      ensureAllErasersReady();
    }
  });

  // init
  fillPeeLayer();
  ensureAllErasersReady();
})();
// transition.js
// - Handles TOTAL click -> puddle scale/translate -> pee overlay appears
// - Fixes flash by delaying puddle opacity=0
// - Removes latent stroke on open; restores it on close (homepage state)

(() => {
  const totalBlock = document.getElementById("total-block");
  const puddle = document.getElementById("pipi-total");

  const peeOverlay = document.getElementById("pee-overlay");
  const chiffonBtn = document.getElementById("chiffon-btn");

  if (!totalBlock || !puddle || !peeOverlay || !chiffonBtn) {
    console.error("[transition] missing elements");
    return;
  }

  // Calibrated from pee.html debug
  const END_TX = 948;
  const END_TY = 326;
  const END_SCALE = 15.0;

  // Main expand duration
  const DURATION_MS = 1600;

  // matches --t-ui (used for puddle opacity fade)
  const FADE_MS = 220;

  // delay before hiding puddle (avoids white flash / repaint gap)
  const HIDE_DELAY_MS = 500;

  // Soft close timing (match your text feel)
  const CLOSE_FADE_MS = 700;   // should match --t-close
  const CLOSE_DELAY_MS = 120;  // should match --t-close-delay

  let state = "idle"; // idle | opening | open | closing
  let saved = null;

  function forceReflow(el) { void el.offsetWidth; }

  function saveInlineStyles(el) {
    return {
      position: el.style.position,
      left: el.style.left,
      top: el.style.top,
      right: el.style.right,
      bottom: el.style.bottom,
      width: el.style.width,
      height: el.style.height,
      maxWidth: el.style.maxWidth,
      zIndex: el.style.zIndex,
      transform: el.style.transform,
      transformOrigin: el.style.transformOrigin,
      transition: el.style.transition,
      margin: el.style.margin,
      pointerEvents: el.style.pointerEvents,
      opacity: el.style.opacity
    };
  }

  function restoreInlineStyles(el, s) {
    el.style.position = s.position;
    el.style.left = s.left;
    el.style.top = s.top;
    el.style.right = s.right;
    el.style.bottom = s.bottom;
    el.style.width = s.width;
    el.style.height = s.height;
    el.style.maxWidth = s.maxWidth;
    el.style.zIndex = s.zIndex;
    el.style.transform = s.transform;
    el.style.transformOrigin = s.transformOrigin;
    el.style.transition = s.transition;
    el.style.margin = s.margin;
    el.style.pointerEvents = s.pointerEvents;
    el.style.opacity = s.opacity;
  }

  // show overlay instantly (no fade-in)
  function showOverlayInstant() {
    const prev = peeOverlay.style.transition;
    peeOverlay.style.transition = "none";
    peeOverlay.classList.add("is-active");
    forceReflow(peeOverlay);
    peeOverlay.style.transition = prev;
  }

  function open() {
    if (state !== "idle") return;
    state = "opening";

    // Remove latent “hairline stroke” on click
    totalBlock.classList.remove("is-latent");

    chiffonBtn.classList.remove("is-visible");
    peeOverlay.classList.remove("is-active");

    saved = saveInlineStyles(puddle);
    const r = puddle.getBoundingClientRect();

    // Lift puddle into fixed position (same screen coords)
    puddle.style.position = "fixed";
    puddle.style.left = `${Math.round(r.left)}px`;
    puddle.style.top = `${Math.round(r.top)}px`;
    puddle.style.right = "auto";
    puddle.style.bottom = "auto";
    puddle.style.width = `${Math.round(r.width)}px`;
    puddle.style.height = `${Math.round(r.height)}px`;
    puddle.style.maxWidth = "none";
    puddle.style.margin = "0";
    puddle.style.zIndex = "9999";
    puddle.style.pointerEvents = "none";
    puddle.style.opacity = "1";

    // Prepare initial transform
    puddle.style.transition = "none";
    puddle.style.transformOrigin = "100% 100%";
    puddle.style.transform = "translate(0px, 0px) scale(1)";
    forceReflow(puddle);

    // Animate transform
    puddle.style.transition = `transform ${DURATION_MS}ms linear`;
    puddle.style.transform = `translate(${END_TX}px, ${END_TY}px) scale(${END_SCALE})`;

    window.setTimeout(() => {
      state = "open";

      // Prepare wipe canvases + text (handled by chiffon.js)
      window.dispatchEvent(new CustomEvent("ps:pee-open"));

      requestAnimationFrame(() => {
        // Show overlay (erasable layer) immediately
        showOverlayInstant();

        // Show chiffon UI
        chiffonBtn.classList.add("is-visible");

        // Keep puddle briefly, then fade it out (avoids flash)
        puddle.style.transition = `opacity ${FADE_MS}ms ease`;
        window.setTimeout(() => {
          puddle.style.opacity = "0";
        }, HIDE_DELAY_MS);
      });
    }, DURATION_MS + 30);
  }

  function close() {
    if (state !== "open") return;
    state = "closing";

    chiffonBtn.classList.remove("is-visible");

    // Let chiffon.js fade out its text etc.
    window.dispatchEvent(new CustomEvent("ps:pee-close"));

    // Smooth overlay fade-out (less “violent”)
    const prev = peeOverlay.style.transition;
    peeOverlay.style.transition = `opacity ${CLOSE_FADE_MS}ms ease ${CLOSE_DELAY_MS}ms`;
    peeOverlay.classList.remove("is-active");

    window.setTimeout(() => {
      peeOverlay.style.transition = prev;

      // Restore puddle back into layout (no reverse transform)
      restoreInlineStyles(puddle, saved);
      saved = null;

      // Restore latent stroke for homepage state
      totalBlock.classList.add("is-latent");

      state = "idle";
    }, CLOSE_DELAY_MS + CLOSE_FADE_MS + 40);
  }

  window.psTransition = { open, close, getState: () => state };

  totalBlock.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });

  totalBlock.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
})();
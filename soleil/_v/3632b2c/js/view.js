/* Repaints the preview and brings the dependent bits of the page up to date. */
(function (Sun) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  Sun.$ = $;
  Sun.ui = { sliders: {}, palettes: {} };    // filled in by controls.js

  const s = Sun.state;
  const stage = $("stage");
  const avatars = document.querySelectorAll(".avatar");

  Sun.say = (text) => { $("status").textContent = text; };

  /* ---------- the "label the parts" overlay ---------- */

  const C = Sun.config.C;
  const setAttrs = (el, attrs) => { Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k])); };

  function placeParts(sun) {
    setAttrs($("aRays"), { d: sun.rays });
    setAttrs($("aCore"), { r: sun.core });
    setAttrs($("aDisc"), { r: sun.disc });

    setAttrs($("lDisc"), { x: C, y: C + 10 });
    const ringR = (sun.core + sun.disc) / 2;
    setAttrs($("lRing"), { x: C, y: C - Math.max(ringR, sun.disc) + 10 });

    // First ray: from its base point to its tip, for the RAYS and TIP labels.
    const first = /^M(-?[\d.]+),(-?[\d.]+)/.exec(sun.rays || "");
    const tip = /L(-?[\d.]+),(-?[\d.]+)/.exec(sun.rays || "");
    const none = !first || !tip;
    $("lRays").style.display = $("lTip").style.display = none ? "none" : "";
    if (none) return;
    const bx = +first[1], by = +first[2], tx = +tip[1], ty = +tip[2];
    const clamp = (v) => Math.max(20, Math.min(900, v));
    setAttrs($("lRays"), { x: clamp((bx + tx) / 2 + 14), y: clamp((by + ty) / 2) });
    setAttrs($("lTip"), { x: clamp(tx + 10), y: clamp(ty - 10) });
  }

  Sun.render = function () {
    const sun = Sun.buildSun(s);
    Sun.paint(stage, s, sun);
    placeParts(sun);
    $("specLine").textContent =
      (s.count ? s.count + " rays" : "no rays") + " · " + s.rayName + " " + s.ray.slice(1);
    avatars.forEach((c) => {
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(stage, 0, 0, c.width, c.height);
    });

    stage.setAttribute("aria-label",
      s.rayName + " sun with " + (s.count ? s.count + " rays" : "no rays") +
      (s.img ? " and your image in the centre" : ""));

    const sliders = Sun.ui.sliders, specs = Sun.config.SLIDERS;
    Object.keys(sliders).forEach((key) => {
      const ui = sliders[key];
      if (+ui.input.value !== s[key]) ui.input.value = s[key];
      ui.out.textContent = specs[key].show(s[key]);
    });
    if (s.len === 0 && s.round && s.tip > 0) sliders.len.out.textContent = "dots";

    // Dim what has no effect right now.
    const none = s.count === 0;
    ["len", "width", "tip", "curve", "gap", "short", "rot", "wave", "bend", "irr"].forEach((key) => {
      sliders[key].host.classList.toggle("off", none);
    });
    sliders.freq.host.classList.toggle("off", none || s.wave === 0);
    $("mirrorWrap").classList.toggle("off", none || (s.wave === 0 && s.bend === 0));
    $("shuffle").disabled = none || s.irr === 0;
    $("shuffle").style.opacity = $("shuffle").disabled ? 0.4 : 1;

    // The space around the disc only exists once the disc is smaller.
    $("ringWrap").classList.toggle("off", s.discSize === 100);
    const unseen = !s.disc && s.discSize < 100 && s.discSize > 0 && s.ring !== "empty";
    $("discHint").hidden = !unseen;
    $("discHint").textContent = unseen ? "Give the disc its own colour to see it inside the rays." : "";

    $("sunName").textContent = s.rayName;
    $("sunHex").textContent = s.ray.slice(1);

    const has = !!s.img;
    $("chooseImg").textContent = has ? "Replace image" : "Choose image";
    $("removeImg").hidden = !has;
    $("imgOptions").hidden = !has;
    $("imgHelp").textContent = has
      ? "Drag the image in the preview to move it."
      : "Or drop one onto the preview, or paste it with ⌘V.";
    stage.classList.toggle("movable", has);
    if (has) stage.tabIndex = 0; else stage.removeAttribute("tabindex");
    if (has) {
      $("tintOn").disabled = s.img.opaque;
      $("tintHelp").hidden = !s.img.opaque;
      $("tintRow").hidden = !Sun.tinting(s);
    }

    $("bgPicker").disabled = !s.bgOn;
  };

  let queued = false;
  Sun.scheduleRender = function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; Sun.render(); });
  };
})(window.Sun);

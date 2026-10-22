/* Everything you can touch in the controls column, except the saved-suns list. */
(function (Sun) {
  "use strict";

  const { BOX, PALETTE, PRESETS, BLANK, SLIDERS, MAX_IMAGE } = Sun.config;
  const $ = Sun.$, s = Sun.state;
  const render = Sun.render, scheduleRender = Sun.scheduleRender;

  /* ---------- sliders ---------- */

  document.querySelectorAll("[data-slider]").forEach((host) => {
    const key = host.dataset.slider, def = SLIDERS[key];
    host.innerHTML = '<label class="label" for="' + key + '"><span>' + def.label + '</span><output id="' + key +
      'Out"></output></label><input type="range" id="' + key + '" min="' + def.min + '" max="' + def.max +
      '" step="' + (def.step || 1) + '">';
    const ui = { host: host, input: host.querySelector("input"), out: host.querySelector("output") };
    Sun.ui.sliders[key] = ui;
    ui.input.addEventListener("input", () => {
      s[key] = +ui.input.value;
      if (key === "short") evenCount();
      scheduleRender();
    });
  });

  // Alternating long and short rays needs an even number of them.
  function evenCount() {
    const alternate = s.short < 100;
    Sun.ui.sliders.count.input.step = alternate ? 2 : 1;
    if (alternate && s.count % 2 === 1) s.count += 1;
  }

  /* ---------- colour choosers: a grid of labelled squares ---------- */

  function buildPalette(hostId, cfg) {
    const grid = document.createElement("div");
    grid.className = "pal";
    grid.setAttribute("role", "radiogroup");
    grid.setAttribute("aria-label", cfg.label);
    const radios = [];

    const add = (value, text, colour) => {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = cfg.name;
      input.id = cfg.name + "-" + value;
      input.checked = value === cfg.start;
      const label = document.createElement("label");
      label.htmlFor = input.id;
      label.className = "cell" + (colour ? "" : " text");
      label.title = text;
      label.style.setProperty("--c", colour || "transparent");
      label.innerHTML = '<span class="chip"></span><span class="code">' +
        (colour ? colour.slice(1) : cfg.leadCode) + "</span>";
      input.addEventListener("change", () => {
        well.classList.remove("active");
        wellCell.classList.remove("on");
        cfg.pick(colour || null, text);
      });
      grid.append(input, label);
      radios.push(input);
    };

    const wellCell = document.createElement("div");
    wellCell.className = "well-cell";
    const well = document.createElement("input");
    well.type = "color";
    well.value = cfg.custom;
    well.title = "Any other colour";
    well.setAttribute("aria-label", cfg.label + ": any other colour");
    const wellCode = document.createElement("span");
    wellCode.className = "code";
    wellCode.textContent = "OTHER";
    wellCell.append(well, wellCode);

    if (cfg.lead) add("lead", cfg.lead, null);
    PALETTE.forEach(([hex, name]) => add(hex, name, "#" + hex));

    const useWell = () => {
      radios.forEach((r) => { r.checked = false; });
      well.classList.add("active");
      wellCell.classList.add("on");
      wellCode.textContent = well.value.slice(1).toUpperCase();
      cfg.pick(well.value.toUpperCase(), "Your own colour");
    };
    well.addEventListener("input", useWell);
    well.addEventListener("click", useWell);

    grid.append(wellCell);
    $(hostId).append(grid);

    // Shows a colour from outside (loading a saved sun) without firing pick.
    Sun.ui.palettes[cfg.name] = {
      show: (colour) => {
        const key = colour ? colour.slice(1).toUpperCase() : "lead";
        const match = radios.find((r) => r.id === cfg.name + "-" + key);
        radios.forEach((r) => { r.checked = r === match; });
        well.classList.toggle("active", !match);
        wellCell.classList.toggle("on", !match);
        if (!match && colour) well.value = colour.toLowerCase();
        wellCode.textContent = !match && colour ? colour.slice(1).toUpperCase() : "OTHER";
      }
    };
  }

  buildPalette("rayColour", {
    name: "ray", label: "Ray colour", start: "E04A1C", custom: "#ffc53d",
    pick: (colour, name) => { s.ray = colour; s.rayName = name; scheduleRender(); }
  });
  buildPalette("discColour", {
    name: "disc", label: "Disc colour", lead: "Same as rays", leadCode: "AS RAYS", start: "lead", custom: "#ffe3b8",
    pick: (colour) => { s.disc = colour; scheduleRender(); }
  });
  buildPalette("tipColour", {
    name: "tip", label: "Ray tip colour", lead: "No fade", leadCode: "NONE", start: "lead", custom: "#ffc53d",
    pick: (colour) => { s.tipColour = colour; scheduleRender(); }
  });

  /* ---------- pushing the state back into every control ---------- */

  const radio = (name, value) => {
    const el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) el.checked = true;
  };

  Sun.syncControls = function () {
    evenCount();
    Object.keys(Sun.ui.sliders).forEach((key) => { Sun.ui.sliders[key].input.value = s[key]; });
    $("round").checked = s.round;
    $("mirror").checked = s.mirror;
    $("clip").checked = s.clip;

    Sun.ui.palettes.ray.show(s.ray);
    Sun.ui.palettes.disc.show(s.disc);
    Sun.ui.palettes.tip.show(s.tipColour);
    radio("ring", s.ring);
    radio("tint", s.tintOn ? "on" : "off");
    radio("bg", s.bgOn ? "fill" : "none");
    $("outlinePicker").value = s.outlineColour.toLowerCase();
    $("tintPicker").value = s.tint.toLowerCase();
    $("tintHex").value = s.tint.slice(1);
    $("bgPicker").value = s.bg.toLowerCase();
    render();
  };

  /* ---------- ray controls ---------- */

  $("presets").addEventListener("click", (e) => {
    const name = e.target.dataset && e.target.dataset.preset;
    if (!name) return;
    Object.assign(s, BLANK, PRESETS[name]);
    Sun.syncControls();
  });

  $("round").addEventListener("change", (e) => { s.round = e.target.checked; render(); });
  $("mirror").addEventListener("change", (e) => { s.mirror = e.target.checked; render(); });
  $("shuffle").addEventListener("click", () => {
    s.seed = (Math.random() * 2147483647) | 0;
    render();
  });

  // Choosing a gap or a gradient needs a smaller disc to show anything,
  // so the disc shrinks the first time one of them is picked.
  document.querySelectorAll('input[name="ring"]').forEach((el) => {
    el.addEventListener("change", () => {
      s.ring = el.value;
      if (s.discSize === 100 && el.value !== "solid") s.discSize = el.value === "empty" ? 78 : 55;
      render();
    });
  });

  $("outlinePicker").addEventListener("input", (e) => {
    s.outlineColour = e.target.value.toUpperCase();
    scheduleRender();
  });

  /* ---------- loading an image ---------- */

  let imageCount = 0;

  function hasTransparency(el) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(el, 0, 0, 64, 64);
    try {
      const data = ctx.getImageData(0, 0, 64, 64).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
    } catch (err) { /* treated as opaque */ }
    return false;
  }

  function useImage(el, url, type) {
    const vector = type === "image/svg+xml";
    let w = el.naturalWidth || 512, h = el.naturalHeight || 512;

    // Very large photos are scaled down so the page and the SVG stay light.
    if (!vector && Math.max(w, h) > MAX_IMAGE) {
      const k = MAX_IMAGE / Math.max(w, h);
      const c = document.createElement("canvas");
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(el, 0, 0, c.width, c.height);
      url = type === "image/jpeg" ? c.toDataURL("image/jpeg", 0.92) : c.toDataURL("image/png");
      el = c; w = c.width; h = c.height;
    }

    const opaque = !hasTransparency(el);
    s.img = { el: el, url: url, w: w, h: h, opaque: opaque, vector: vector, id: ++imageCount };
    // A photo fills the disc; a cut-out symbol sits inside it with some air.
    s.imgSize = opaque ? Math.min(400, Math.ceil(100 * Math.max(w, h) / Math.min(w, h))) : 62;
    s.imgX = s.imgY = 0;
    if (opaque) { s.tintOn = false; $("tintOff").checked = true; }
    $("imgHint").textContent = "";
    render();
  }

  function loadFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      $("imgHint").textContent = "That file is not an image. Choose a PNG, JPG, SVG, WebP or GIF.";
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => { $("imgHint").textContent = "The file could not be read. Try choosing it again."; };
    reader.onload = () => {
      const el = new Image();
      el.onload = () => useImage(el, reader.result, file.type);
      el.onerror = () => {
        $("imgHint").textContent = "This browser cannot open that image. Save it as a PNG or JPG and try again.";
      };
      el.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  $("chooseImg").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", (e) => { loadFile(e.target.files[0]); e.target.value = ""; });
  $("removeImg").addEventListener("click", () => { s.img = null; render(); $("chooseImg").focus(); });
  $("centreImg").addEventListener("click", () => { s.imgX = s.imgY = 0; render(); });

  const stageBox = $("stageBox");
  ["dragenter", "dragover"].forEach((type) => stageBox.addEventListener(type, (e) => {
    e.preventDefault();
    stageBox.classList.add("over");
  }));
  ["dragleave", "drop"].forEach((type) => stageBox.addEventListener(type, (e) => {
    e.preventDefault();
    stageBox.classList.remove("over");
  }));
  stageBox.addEventListener("drop", (e) => loadFile(e.dataTransfer.files[0]));
  // Dropping a file anywhere else should not navigate away from the page.
  ["dragover", "drop"].forEach((type) => window.addEventListener(type, (e) => e.preventDefault()));

  document.addEventListener("paste", (e) => {
    const files = e.clipboardData && e.clipboardData.files;
    if (files && files.length) { e.preventDefault(); loadFile(files[0]); }
  });

  /* ---------- moving the image ---------- */

  const stage = $("stage");
  const clampOffset = (v) => Math.max(-600, Math.min(600, v));
  let drag = null;

  stage.addEventListener("pointerdown", (e) => {
    if (!s.img) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: s.imgX, oy: s.imgY };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add("dragging");
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const k = BOX / stage.clientWidth;
    s.imgX = clampOffset(drag.ox + (e.clientX - drag.x) * k);
    s.imgY = clampOffset(drag.oy + (e.clientY - drag.y) * k);
    scheduleRender();
  });
  ["pointerup", "pointercancel"].forEach((type) => stage.addEventListener(type, () => {
    drag = null;
    stage.classList.remove("dragging");
  }));

  stage.addEventListener("keydown", (e) => {
    if (!s.img) return;
    const step = e.shiftKey ? 25 : 5;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    s.imgX = clampOffset(s.imgX + move[0]);
    s.imgY = clampOffset(s.imgY + move[1]);
    render();
  });

  /* ---------- image and frame controls ---------- */

  function normaliseHex(value) {
    let v = value.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/./g, "$&$&");
    return /^[0-9a-f]{6}$/i.test(v) ? "#" + v.toUpperCase() : null;
  }

  function setTint(hex, from) {
    s.tint = hex;
    if (from !== "picker") $("tintPicker").value = hex.toLowerCase();
    if (from !== "text") $("tintHex").value = hex.slice(1);
    $("tintHex").removeAttribute("aria-invalid");
    $("hexHint").textContent = "";
    scheduleRender();
  }

  $("clip").addEventListener("change", (e) => { s.clip = e.target.checked; render(); });

  document.querySelectorAll('input[name="tint"]').forEach((el) => {
    el.addEventListener("change", () => { s.tintOn = el.value === "on"; render(); });
  });

  $("tintPicker").addEventListener("input", (e) => setTint(e.target.value.toUpperCase(), "picker"));
  $("tintHex").addEventListener("input", (e) => {
    const hex = normaliseHex(e.target.value);
    if (hex) setTint(hex, "text"); else e.target.setAttribute("aria-invalid", "true");
  });
  $("tintHex").addEventListener("blur", (e) => {
    if (normaliseHex(e.target.value)) {
      e.target.value = s.tint.slice(1);
    } else {
      $("hexHint").textContent = "Enter a hex code such as FFC53D. Still showing " + s.tint.slice(1) + ".";
    }
  });
  document.querySelectorAll(".quick button").forEach((btn) => {
    btn.addEventListener("click", () => setTint(btn.dataset.c, "quick"));
  });

  document.querySelectorAll('input[name="bg"]').forEach((el) => {
    el.addEventListener("change", () => { s.bgOn = el.value === "fill"; render(); });
  });
  $("bgPicker").addEventListener("input", (e) => { s.bg = e.target.value.toUpperCase(); scheduleRender(); });

  /* ---------- naming the parts on the sun ---------- */

  const wrap = $("stageWrap");
  const all = "rays tip disc ring";
  let hover = "";
  const showParts = () => {
    wrap.dataset.part = ($("labelParts").checked ? all + " " : "") + hover;
  };
  document.querySelectorAll("[data-part]").forEach((block) => {
    if (block === wrap) return;
    const on = () => { hover = block.dataset.part; showParts(); };
    const off = () => { hover = ""; showParts(); };
    block.addEventListener("mouseenter", on);
    block.addEventListener("mouseleave", off);
    block.addEventListener("focusin", on);
    block.addEventListener("focusout", off);
  });
  $("labelParts").addEventListener("change", showParts);
})(window.Sun);

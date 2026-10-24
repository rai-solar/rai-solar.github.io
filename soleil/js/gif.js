/* v02 · moving suns: preview the motion on the stage and record it as an animated GIF.
   The GIF encoder is written out here (palette + LZW), so it works offline with no library.
   Every motion loops seamlessly: one full cycle per recording. */
(function (Sun) {
  "use strict";

  const $ = Sun.$, s = Sun.state;
  const say = (text) => { $("gifStatus").textContent = text; };
  const TAU = Math.PI * 2;
  const FPS = 25;

  /* ---------- the motion: the sun at time t (0 → 1, loops) ---------- */

  function motions() {
    return {
      spin: $("gifSpin").checked,
      pulse: $("gifPulse").checked,
      ripple: $("gifRipple").checked
    };
  }

  function frameState(t, m) {
    const f = Object.assign({}, s);
    if (m.spin) {
      // turn just far enough that the sun looks the same again: one ray, two when
      // every other ray differs, a full turn when the rays are irregular
      const step = s.count > 0 ? 360 / s.count : 360;
      const period = s.irr > 0 ? 360 : (s.short < 100 || s.mirror) ? step * 2 : step;
      f.rot = s.rot + t * period;
    }
    if (m.pulse) f.size = s.size * (0.9 + 0.1 * Math.cos(TAU * t));      // the sun breathes
    if (m.ripple) f.wavePhase = -TAU * t;
    return f;
  }

  const anyMotion = (m) => m.spin || m.pulse || m.ripple;

  /* ---------- live preview on the stage ---------- */

  let raf = 0, t0 = 0;
  function loop(now) {
    const m = motions();
    const secs = +$("gifLength").value;
    const t = (((now - t0) / 1000) % secs) / secs;
    Sun.paint($("stage"), frameState(t, m));
    raf = requestAnimationFrame(loop);
  }
  function setPreview(on) {
    cancelAnimationFrame(raf);
    raf = 0;
    $("gifPreview").setAttribute("aria-pressed", String(on));
    $("gifPreview").textContent = on ? "Stop" : "Preview";
    if (on) { t0 = performance.now(); raf = requestAnimationFrame(loop); }
    else Sun.render();
  }

  /* ---------- GIF encoding ---------- */

  // One palette for the whole animation: the most used colours (5 bits per channel),
  // plus a transparent slot when the background is see-through.
  function buildPalette(frames, transparent) {
    const count = new Uint32Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
    for (const d of frames) {
      for (let i = 0; i < d.length; i += 4) {
        if (transparent && d[i + 3] < 128) continue;
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        count[k]++; sr[k] += d[i]; sg[k] += d[i + 1]; sb[k] += d[i + 2];
      }
    }
    const keys = [];
    for (let k = 0; k < 32768; k++) if (count[k]) keys.push(k);
    keys.sort((a, b) => count[b] - count[a]);
    const room = transparent ? 255 : 256;
    const pal = keys.slice(0, room).map((k) => [sr[k] / count[k], sg[k] / count[k], sb[k] / count[k]].map(Math.round));
    // every 5-bit colour maps to its nearest palette entry (computed once, on demand)
    const map = new Int16Array(32768).fill(-1);
    const offset = transparent ? 1 : 0;
    function index(k) {
      if (map[k] >= 0) return map[k];
      const r = ((k >> 10) & 31) * 8 + 4, g = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4;
      let best = 0, bd = Infinity;
      for (let i = 0; i < pal.length; i++) {
        const p = pal[i], dr = p[0] - r, dg = p[1] - g, db = p[2] - b;
        const dist = dr * dr * 2 + dg * dg * 4 + db * db * 3;
        if (dist < bd) { bd = dist; best = i; }
      }
      return (map[k] = best + offset);
    }
    const table = new Uint8Array(768);
    pal.forEach((p, i) => table.set(p, (i + offset) * 3));
    return { table, index };
  }

  function lzw(px, minSize, out) {
    const clear = 1 << minSize, eoi = clear + 1;
    let size = minSize + 1, next = eoi + 1, dict = new Map();
    let cur = 0, bits = 0;
    const bytes = [];
    const emit = (c) => {
      cur |= c << bits; bits += size;
      while (bits >= 8) { bytes.push(cur & 255); cur >>>= 8; bits -= 8; }
    };
    emit(clear);
    let prefix = px[0];
    for (let i = 1; i < px.length; i++) {
      const k = px[i], key = (prefix << 8) | k;
      const hit = dict.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      emit(prefix);
      if (next === 4096) {
        emit(clear); dict = new Map(); next = eoi + 1; size = minSize + 1;
      } else {
        if (next >= (1 << size)) size++;
        dict.set(key, next++);
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (bits > 0) bytes.push(cur & 255);
    out.push(minSize);
    for (let i = 0; i < bytes.length; i += 255) {
      const chunk = bytes.slice(i, i + 255);
      out.push(chunk.length, ...chunk);
    }
    out.push(0);
  }

  function encode(frames, w, h, delayCs, transparent) {
    const { table, index } = buildPalette(frames, transparent);
    const out = [];
    const u16 = (v) => out.push(v & 255, (v >> 8) & 255);
    const ascii = (str) => { for (const c of str) out.push(c.charCodeAt(0)); };
    ascii("GIF89a"); u16(w); u16(h);
    out.push(0xF7, 0, 0);                                  // global table, 256 colours
    for (let i = 0; i < 768; i++) out.push(table[i]);
    out.push(0x21, 0xFF, 11); ascii("NETSCAPE2.0"); out.push(3, 1, 0, 0, 0);   // loop forever
    const px = new Uint8Array(w * h);
    for (const d of frames) {
      out.push(0x21, 0xF9, 4, transparent ? 0x09 : 0x04); u16(delayCs); out.push(0, 0);
      out.push(0x2C); u16(0); u16(0); u16(w); u16(h); out.push(0);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        px[j] = transparent && d[i + 3] < 128 ? 0
          : index(((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3));
      }
      lzw(px, 8, out);
    }
    out.push(0x3B);
    return new Uint8Array(out);
  }

  /* ---------- recording ---------- */

  let busy = false;
  async function record() {
    if (busy) return;
    const m = motions();
    if (!anyMotion(m)) { say("Pick at least one motion first."); return; }
    if (m.ripple && !m.spin && !m.pulse && !(s.wave > 0)) { say("Ripple moves the waves: raise Wave height (03) first."); return; }
    busy = true;
    $("gifRecord").disabled = true;
    const size = +$("gifSize").value, secs = +$("gifLength").value;
    const n = Math.round(secs * FPS);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const frames = [];
    try {
      for (let i = 0; i < n; i++) {
        Sun.paint(canvas, frameState(i / n, m));
        frames.push(ctx.getImageData(0, 0, size, size).data);
        if (i % 5 === 0) { say("Recording… frame " + (i + 1) + " of " + n); await new Promise((r) => setTimeout(r)); }
      }
      say("Encoding the GIF…");
      await new Promise((r) => setTimeout(r));
      const gif = encode(frames, size, size, Math.round(100 / FPS), !s.bgOn);
      const url = URL.createObjectURL(new Blob([gif], { type: "image/gif" }));
      const a = document.createElement("a");
      const name = "inti-" + s.ray.slice(1) + "-" + Object.keys(m).filter((k) => m[k]).join("-") + ".gif";
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
      say("Downloading " + name + " (" + Math.round(gif.length / 1024) + " KB)" +
        (s.bgOn ? "" : " · tip: a background colour gives smoother edges"));
    } catch (err) {
      say("The GIF could not be made: " + err.message);
    }
    $("gifRecord").disabled = false;
    busy = false;
  }

  $("gifPreview").addEventListener("click", () => setPreview(!raf));
  $("gifRecord").addEventListener("click", record);
  ["gifSpin", "gifPulse", "gifRipple"].forEach((id) => $(id).addEventListener("change", () => {
    if (raf && !anyMotion(motions())) setPreview(false);
  }));

  Sun.gif = { encode, frameState };
})(window.Sun);

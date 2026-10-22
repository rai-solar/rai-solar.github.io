/* Draws a settings object onto a canvas, or writes it out as SVG markup. */
(function (Sun) {
  "use strict";

  const { BOX, C, TAU, MAX_IMAGE } = Sun.config;
  const n2 = Sun.n2;

  // The image redrawn in a single colour, keeping only its transparency.
  const tintCache = { key: "", canvas: null };
  function tintedImage(s) {
    const img = s.img, key = img.id + s.tint;
    if (tintCache.key !== key) {
      const k = img.vector ? MAX_IMAGE / Math.max(img.w, img.h) : 1;
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.w * k));
      c.height = Math.max(1, Math.round(img.h * k));
      const ctx = c.getContext("2d");
      ctx.drawImage(img.el, 0, 0, c.width, c.height);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = s.tint;
      ctx.fillRect(0, 0, c.width, c.height);
      tintCache.key = key;
      tintCache.canvas = c;
    }
    return tintCache.canvas;
  }

  Sun.tinting = (s) => s.tintOn && s.img && !s.img.opaque;
  const fading = (s) => s.tipColour && s.count > 0;

  Sun.paint = function (canvas, s, built) {
    const sun = built || Sun.buildSun(s);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(canvas.width / BOX, canvas.height / BOX);

    if (s.bgOn) {
      ctx.fillStyle = s.bg;
      ctx.fillRect(0, 0, BOX, BOX);
    }

    const rays = sun.rays ? new Path2D(sun.rays) : null;
    const circle = (r) => { const c = new Path2D(); c.arc(C, C, r, 0, TAU); return c; };
    const core = sun.hollow ? null : circle(sun.core);
    const disc = sun.disc > 0 ? circle(sun.disc) : null;

    // The outline is drawn first, twice as wide, so the fills on top leave
    // only its outer half showing: one clean line around the whole sun.
    if (s.outline > 0) {
      ctx.strokeStyle = s.outlineColour;
      ctx.lineWidth = s.outline * 2;
      ctx.lineJoin = "round";
      if (rays) ctx.stroke(rays);
      if (core) ctx.stroke(core);
      if (disc) ctx.stroke(disc);
    }

    if (rays) {
      if (fading(s)) {
        const g = ctx.createRadialGradient(C, C, sun.fadeFrom, C, C, sun.fadeTo);
        g.addColorStop(0, s.ray);
        g.addColorStop(1, s.tipColour);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = s.ray;
      }
      ctx.fill(rays);
    }

    const discColour = s.disc || s.ray;
    if (core) {
      if (sun.blend) {
        const g = ctx.createRadialGradient(C, C, sun.disc, C, C, sun.core);
        g.addColorStop(0, discColour);
        g.addColorStop(1, s.ray);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = s.ray;
      }
      ctx.fill(core);
    }
    if (disc) {
      ctx.fillStyle = discColour;
      ctx.fill(disc);
    }

    const box = Sun.imageBox(s, sun);
    if (box) {
      ctx.save();
      if (s.clip) ctx.clip(circle(sun.imgR));
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(Sun.tinting(s) ? tintedImage(s) : s.img.el, box.x, box.y, box.w, box.h);
      ctx.restore();
    }
  };

  Sun.svgMarkup = function (s) {
    const sun = Sun.buildSun(s), box = Sun.imageBox(s, sun);
    const circle = (r) => '<circle cx="' + C + '" cy="' + C + '" r="' + r + '"';
    const discColour = s.disc || s.ray;
    let defs = "", body = "";

    if (s.bgOn) body += '<rect width="' + BOX + '" height="' + BOX + '" fill="' + s.bg + '"/>';

    if (s.outline > 0) {
      body += '<g fill="none" stroke="' + s.outlineColour + '" stroke-width="' + s.outline * 2 +
              '" stroke-linejoin="round">' + (sun.rays ? '<path d="' + sun.rays + '"/>' : "") +
              (sun.hollow ? "" : circle(sun.core) + "/>") + (sun.disc > 0 ? circle(sun.disc) + "/>" : "") + "</g>";
    }

    if (sun.rays) {
      let fill = s.ray;
      if (fading(s)) {
        defs += '<radialGradient id="fade" gradientUnits="userSpaceOnUse" cx="' + C + '" cy="' + C + '" r="' + sun.fadeTo +
                '"><stop offset="' + n2(sun.fadeFrom / sun.fadeTo) + '" stop-color="' + s.ray +
                '"/><stop offset="1" stop-color="' + s.tipColour + '"/></radialGradient>';
        fill = "url(#fade)";
      }
      body += '<path d="' + sun.rays + '" fill="' + fill + '"/>';
    }

    if (!sun.hollow) {
      let fill = s.ray;
      if (sun.blend) {
        defs += '<radialGradient id="core" gradientUnits="userSpaceOnUse" cx="' + C + '" cy="' + C + '" r="' + sun.core +
                '"><stop offset="' + n2(sun.disc / sun.core) + '" stop-color="' + discColour +
                '"/><stop offset="1" stop-color="' + s.ray + '"/></radialGradient>';
        fill = "url(#core)";
      }
      body += circle(sun.core) + ' fill="' + fill + '"/>';
    }
    if (sun.disc > 0) body += circle(sun.disc) + ' fill="' + discColour + '"/>';

    if (box) {
      let image = '<image x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h +
                  '" preserveAspectRatio="none"';
      if (Sun.tinting(s)) {
        defs += '<filter id="tint" color-interpolation-filters="sRGB"><feFlood flood-color="' + s.tint +
                '"/><feComposite in2="SourceAlpha" operator="in"/></filter>';
        image += ' filter="url(#tint)"';
      }
      image += ' xlink:href="' + s.img.url + '"/>';
      if (s.clip) {
        defs += '<clipPath id="disc">' + circle(sun.imgR) + "/></clipPath>";
        image = '<g clip-path="url(#disc)">' + image + "</g>";
      }
      body += image;
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' +
           BOX + " " + BOX + '" width="' + BOX + '" height="' + BOX + '">' +
           (defs ? "<defs>" + defs + "</defs>" : "") + body + "</svg>";
  };
})(window.Sun);

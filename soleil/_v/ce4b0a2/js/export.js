/* Download PNG / SVG and copy SVG code. */
(function (Sun) {
  "use strict";

  const $ = Sun.$, s = Sun.state, say = Sun.say;

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    say("Downloading " + name);
  }

  const fileName = (ext) => "inti-" + s.ray.slice(1) + "." + ext;

  $("savePng").addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = +$("pngSize").value;
    Sun.paint(canvas, s);
    canvas.toBlob((blob) => {
      if (blob) download(blob, fileName("png"));
      else say("The PNG could not be created. Reload the page and try again.");
    }, "image/png");
  });

  $("saveSvg").addEventListener("click", () => {
    const file = '<?xml version="1.0" encoding="UTF-8"?>\n' + Sun.svgMarkup(s) + "\n";
    download(new Blob([file], { type: "image/svg+xml;charset=utf-8" }), fileName("svg"));
  });

  $("copySvg").addEventListener("click", () => {
    const code = Sun.svgMarkup(s);
    const fallback = () => {
      const area = document.createElement("textarea");
      area.value = code;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      area.remove();
      say(ok ? "SVG code copied" : "Copying is blocked here. Use Download SVG instead.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => say("SVG code copied"), fallback);
    } else {
      fallback();
    }
  });
})(window.Sun);

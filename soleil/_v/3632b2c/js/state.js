/* The one mutable settings object, plus saving and restoring a sun's look. */
(function (Sun) {
  "use strict";

  const { BLANK, PRESETS } = Sun.config;

  Sun.defaults = function () {
    return Object.assign({
      ray: "#E04A1C",
      rayName: "Spicy Paprika",
      disc: null,          // null = same as the rays
      discSize: 100,       // disc radius, % of the circle the rays grow from
      ring: "solid",       // what fills the space around a smaller disc: solid, empty or blend
      tipColour: null,     // null = no fade
      outline: 0,
      outlineColour: "#1F0A03",
      seed: 20261005,
      rot: 0,
      size: 100,
      img: null,           // { el, url, w, h, opaque, vector, id }
      imgSize: 62,         // longest side of the image, % of the disc diameter
      imgX: 0,
      imgY: 0,
      clip: true,
      tintOn: false,
      tint: "#FFFFFF",
      bgOn: false,
      bg: "#1B2F73"
    }, BLANK, PRESETS.flames);
  };

  Sun.state = Sun.defaults();

  // What a saved sun remembers: everything except the centre image and where it sits.
  const IMAGE_KEYS = ["img", "imgSize", "imgX", "imgY"];
  Sun.SAVED_KEYS = Object.keys(Sun.defaults()).filter((k) => IMAGE_KEYS.indexOf(k) < 0);

  Sun.snapshot = function () {
    const out = {};
    Sun.SAVED_KEYS.forEach((k) => { out[k] = Sun.state[k]; });
    return out;
  };

  // A full state for drawing a saved sun on its own (thumbnails).
  Sun.fromSaved = function (saved) {
    const s = Sun.defaults();
    Sun.SAVED_KEYS.forEach((k) => { if (k in saved) s[k] = saved[k]; });
    return s;
  };

  Sun.apply = function (saved) {
    const s = Sun.fromSaved(saved);
    Sun.SAVED_KEYS.forEach((k) => { Sun.state[k] = s[k]; });
  };
})(window.Sun);

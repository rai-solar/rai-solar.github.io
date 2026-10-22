/* Constants, palette, ray styles and slider definitions. No DOM in here. */
window.Sun = window.Sun || {};

(function (Sun) {
  "use strict";

  const pct = (v) => v + "%";
  const signed = (v) => (v > 0 ? "+" : "") + v;

  Sun.config = {
    BOX: 1000,          // everything is laid out on a 1000 x 1000 square
    C: 500,
    EDGE: 480,          // the sun never reaches past this radius
    MAX_IMAGE: 2048,    // larger uploads are scaled down to this
    TAU: Math.PI * 2,

    PALETTE: [
      ["E04A1C", "Spicy Paprika"],
      ["E54513", "Molten Orange"],
      ["E83700", "Scarlet Fire"],
      ["FF4500", "Crimson Carrot"],
      ["C13C1B", "Rusty Spice"]
    ],

    // Each style is only a starting point: it sets the ray sliders, nothing more.
    BLANK: { tip: 0, gap: 0, short: 100, curve: 0, round: true, wave: 0, freq: 1.3, bend: 0, irr: 0, mirror: false },
    PRESETS: {
      flames:    { count: 26, len: 185, width: 100, short: 62, curve: -12, wave: 30, freq: 1.1, irr: 8 },
      lines:     { count: 8,  len: 70,  width: 20, tip: 100, gap: 50, short: 55 },
      starburst: { count: 20, len: 30,  width: 100 },
      sunbeams:  { count: 12, len: 120, width: 28, tip: 230, gap: 18, round: false },
      sparkle:   { count: 8,  len: 330, width: 100, short: 42, curve: 55 },
      swirl:     { count: 14, len: 110, width: 100, curve: 15, bend: 70 },
      disc:      { count: 0,  len: 100, width: 100 }
    },

    SLIDERS: {
      count:    { label: "Number", min: 0, max: 64, show: (v) => (v === 0 ? "none" : v) },
      len:      { label: "Length", min: 0, max: 300, show: pct },
      width:    { label: "Width", min: 4, max: 100, show: pct },
      tip:      { label: "Tip width", min: 0, max: 250, show: (v) => (v === 0 ? "pointed" : v + "%") },
      curve:    { label: "Side curve", min: -100, max: 100, show: (v) => (v === 0 ? "straight" : v > 0 ? "hollow " + v : "full " + -v) },
      gap:      { label: "Distance from disc", min: 0, max: 150, show: (v) => (v === 0 ? "attached" : v + "%") },
      short:    { label: "Every other ray", min: 20, max: 100, show: (v) => (v === 100 ? "same length" : v + "% long") },
      rot:      { label: "Rotation", min: 0, max: 360, step: 0.5, show: (v) => v + "°" },
      wave:     { label: "Wave height", min: 0, max: 100, show: (v) => (v === 0 ? "none" : v + "%") },
      freq:     { label: "Waves per ray", min: 0.5, max: 4, step: 0.1, show: (v) => v.toFixed(1) },
      bend:     { label: "Bend", min: -100, max: 100, show: (v) => (v === 0 ? "none" : signed(v)) },
      irr:      { label: "Irregularity", min: 0, max: 100, show: (v) => (v === 0 ? "none" : v + "%") },
      discSize: { label: "Size", min: 0, max: 100, show: (v) => (v === 100 ? "full" : v === 0 ? "hidden" : v + "%") },
      outline:  { label: "Outline", min: 0, max: 40, show: (v) => (v === 0 ? "none" : v) },
      size:     { label: "Sun size in the frame", min: 40, max: 100, show: pct },
      imgSize:  { label: "Size", min: 10, max: 400, show: pct }
    }
  };
})(window.Sun);

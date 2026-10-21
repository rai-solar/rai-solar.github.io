// Edit these values, or call RiverExperiment.configure({ flowSpeed: 42 }) live.
window.CABZ_RIVER_CONFIG = {
  video: 'assets/river.mp4',
  poster: 'assets/river-poster.jpg',
  flowDirection: [-0.16, 1], // [horizontal, vertical]; normalized automatically
  flowSpeed: 49,            // pixels per second, before local currents
  density: 5,               // maximum simultaneous objects (clamped to 3–6)
  objectScale: 1,
  distortionStrength: 6.8,  // SVG displacement in pixels
  rotationIntensity: 0.95,
  reappearanceDelay: [7, 20], // seconds, randomized for each return
  hoverSpeed: 0.025,        // 0 = stop; 1 = keep drifting
  hoverDistortion: 0.12,
  arrivalInterval: [3.5, 7.5],
  currentStrength: 1.25
};

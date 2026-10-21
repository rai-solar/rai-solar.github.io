# 01 / Floating River

A self-contained, vanilla HTML/CSS/JS experiment for CABeZa. The rest of the portfolio remains in its current structure.

## Try it

Serve CABZ with the existing local server (`open-locally.command`), or `python3 -m http.server 8000` from CABZ.

- `/river/` opens the experiment directly.
- `/?mode=river` opens the existing homepage in river mode.
- `/?mode=grid` opens the existing homepage in grid mode.
- Press **R** or use the small four-line grid/water icon in the header to switch interaction modes. Your choice is saved locally. Typing in a field does not trigger the shortcut.
- The old development grid-overlay button has become this mode selector. “Grid” means the existing portfolio navigation, rather than an overlay on the river.
- On a project page the river icon / R returns to the homepage in river mode.
- Every floating object and every index entry has a real link to `project.html?id=...`, with a unique title and a return link. Replace those dummy destinations in the `projects` array in `river.js`.

## Tune

Edit `config.js`. During development you can also use the console:

```js
RiverExperiment.configure({
  flowDirection: [-0.16, 1],
  flowSpeed: 49,
  density: 5,
  objectScale: 1,
  distortionStrength: 6.8,
  rotationIntensity: 0.95,
  reappearanceDelay: [7, 20],
  hoverSpeed: 0.025,
  hoverDistortion: 0.12,
  arrivalInterval: [3.5, 7.5],
  currentStrength: 1.25
});
```

Direction is a normalized `[x,y]` vector, speed is pixels/second, delays are seconds. Density is limited to 3–6 active objects. Offscreen objects may be entering, so the actual visible number naturally varies. `hoverSpeed: 0` stops the cargo completely; `hoverDistortion: 0` removes its distortion during inspection. The hit target and label remain undistorted. Parameter changes are live, with no page reload.

The shared current field combines downstream flow, crossing ribbons, and moving eddies. Position, angular velocity, and deformation all sample that field. Paths are not prerecorded; items have different drag/phase values and randomized returns. The field is art-directed, not optical-flow analysis of the footage: set its direction/speed to match replacement video.

Object distortion uses independent SVG turbulence/displacement filters, updated at ~11 Hz, plus subtle strain-based elastic scaling and perspective. Motion uses one requestAnimationFrame loop and transform-only positioning, with a capped delta after backgrounding. The video has no filter displacement. Its muted autoplay is deferred until river mode is opened, and playback pauses when the page is hidden or the mode is closed.

## Replace the footage

Replace **`river/assets/river.mp4`** with your own **`river.mp4`**. No code changes required. Use H.264 MP4 with fast start, and preferably a pre-looped fixed-camera clip. Replace `river-poster.jpg` with a frame from the new video. Other paths can be set through `video` and `poster` in `config.js` (relative to `river/`). Adjust `flowDirection` and `flowSpeed` to fit the visible current, and update the on-screen sources and CREDITS.md. Your replacement clip is used as-is; create a seamless loop during export if needed.

The supplied real stream video is locally stored, silent, and crossfaded into a continuous loop. An alternate blue water-surface study is included for comparison; its separate credit requirements are documented in CREDITS.md.

## Access and motion

- Keyboard: normal links, visible focus, and the stationary **objects (10)** index; focused cargo slows and is kept in view.
- Touch: first tap holds and labels an object; second tap follows its link. Tapping the water releases it. The index offers direct one-tap navigation.
- Reduced motion: the video is a still poster, all ten objects are arranged in a static, responsive composition, displacement is disabled, and mode/icon transitions are immediate.
- Pause: stops both the video and drifting; the index remains usable.
- If autoplay is blocked, a play button appears over the poster.

## Files

- `config.js` — public tuning parameters.
- `river.js` — current field, lifecycle, interaction, SVG filters, mode state.
- `river.css` — isolated scene and transitions.
- `index.html` — direct preview entry.
- `project.html` — dummy project destination.
- `assets/` and `CREDITS.md` — local footage, poster, photographic cutout, credits.
- `../nav.js` — header mode selector, icon morph, shortcut, and lazy experiment loading on home pages.

No framework, build dependency, or remote media endpoint is required.

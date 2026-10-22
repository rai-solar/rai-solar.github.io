/* Turns a settings object into ray outlines and circle radii. Pure maths. */
(function (Sun) {
  "use strict";

  const { C, EDGE, TAU } = Sun.config;

  const n2 = (v) => Math.round(v * 100) / 100;
  const pt = (q) => n2(q[0]) + "," + n2(q[1]);

  // A steady pseudo-random number in 0..1 for ray k, so a ray keeps its
  // quirks while other sliders move. Shuffle changes the seed.
  function hash(s, k, channel) {
    let t = (s.seed + Math.imul(k + 1, 374761393) + Math.imul(channel + 1, 668265263)) | 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177);
    t ^= t >>> 16;
    return (t >>> 0) / 4294967296;
  }
  const jitter = (s, k, channel) => (hash(s, k, channel) * 2 - 1) * (s.irr / 100);

  // Works out every ray with the disc radius fixed at 100, then scales the
  // whole sun so its furthest point touches the edge of the frame.
  Sun.buildSun = function (s) {
    const R = 100, n = s.count;
    const gap = s.gap / 100;
    const attached = gap < 0.005;
    const rb = R * (1 + gap);                           // radius where rays begin
    const turn = -Math.PI / 2 + (s.rot * Math.PI) / 180;
    const power = Math.pow(2, s.curve / 40);            // >1 hollow sides, <1 full sides
    const hollow = s.ring === "empty";                  // no solid core behind the disc
    const alternate = s.short < 100;
    const rays = [];
    let reach = R;

    for (let k = 0; k < n; k++) {
      const short = alternate && k % 2 === 1;
      const angle = turn + (k * TAU) / n + jitter(s, k, 0) * 0.55 * (TAU / n);
      const len = Math.max(0, R * (s.len / 100) * (short ? s.short / 100 : 1) * (1 + 0.6 * jitter(s, k, 1)));
      const half = Math.min(1, (s.width / 100) * (1 + 0.4 * jitter(s, k, 2))) * Math.PI / n;
      const wb = 2 * rb * Math.sin(half);               // width at the base
      const wt = wb * s.tip / 100;                      // width at the tip
      const side = s.mirror && k % 2 === 1 ? -1 : 1;
      const amp = (s.wave / 100) * 0.3 * (1 + 0.5 * jitter(s, k, 3));
      const phase = jitter(s, k, 4) * Math.PI + (s.wavePhase || 0);   // wavePhase: v02 ripple animation
      const bend = (s.bend / 100) * 0.9 * (1 + 0.8 * jitter(s, k, 5));
      const freq = s.freq;

      const curvedSides = s.curve !== 0 && wt !== wb;
      const steps = len < 0.5 ? 1
        : s.wave > 0 ? Math.min(48, Math.max(10, Math.ceil(freq * 12)))
        : (s.bend !== 0 || curvedSides) ? 10 : 1;

      const left = [], right = [];
      let end = [0, 0];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = TAU * freq * t + phase;
        const x = t * len;
        const y = side * len * (amp * t * Math.sin(a) + bend * t * t);
        let dx = len;
        let dy = side * len * (amp * (Math.sin(a) + t * TAU * freq * Math.cos(a)) + 2 * bend * t);
        if (len < 0.5) { dx = 1; dy = 0; }
        const m = Math.hypot(dx, dy);
        const nx = -dy / m, ny = dx / m;
        const w = wb + (wt - wb) * (1 - Math.pow(1 - t, power));
        let l = [x + nx * w / 2, y + ny * w / 2];
        let r = [x - nx * w / 2, y - ny * w / 2];
        if (i === 0 && attached) {                      // base corners sit exactly on the disc's edge
          const inset = -rb * (1 - Math.cos(half));
          l = [inset, wb / 2];
          r = [inset, -wb / 2];
        }
        left.push(l);
        right.push(r);
        reach = Math.max(reach, Math.hypot(rb + l[0], l[1]), Math.hypot(rb + r[0], r[1]));
        end = [x, y];
      }

      const capTip = s.round && wt > 0.01 ? wt / 2 : 0;
      const capBase = s.round && !attached ? wb / 2 : 0;
      if (capTip) reach = Math.max(reach, Math.hypot(rb + end[0], end[1]) + capTip);
      rays.push({ angle: angle, left: left, right: right, capTip: capTip, capBase: capBase });
    }

    const k = Math.max(1, EDGE * s.size / 100 - s.outline) / reach;

    // A smooth curve through a run of points, continuing from the first one.
    const through = (pts) => {
      if (pts.length === 2) return "L" + pt(pts[1]);
      let d = "";
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        d += "C" + pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + " " +
                   pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + " " + pt(p2);
      }
      return d;
    };
    const arcTo = (radius, to) => "A" + n2(radius) + "," + n2(radius) + " 0 0,0 " + pt(to);

    let d = "";
    rays.forEach((ray) => {
      const ux = Math.cos(ray.angle), uy = Math.sin(ray.angle);
      const place = (q) => [C + k * ((rb + q[0]) * ux - q[1] * uy), C + k * ((rb + q[0]) * uy + q[1] * ux)];
      const L = ray.left.map(place), Rv = ray.right.map(place).reverse();
      d += "M" + pt(L[0]) + through(L);
      d += ray.capTip ? arcTo(ray.capTip * k, Rv[0]) : "L" + pt(Rv[0]);
      d += through(Rv);
      if (ray.capBase) d += arcTo(ray.capBase * k, L[0]);
      else if (attached && hollow) d += "A" + n2(rb * k) + "," + n2(rb * k) + " 0 0,1 " + pt(L[0]);  // base follows the circle
      else if (attached) d += "L" + C + "," + C;        // tucks the base under the core
      d += "Z";
    });

    const core = n2(R * k);                             // the circle the rays grow from
    const disc = n2(R * k * s.discSize / 100);          // the visible centre disc
    return {
      rays: d, core: core, disc: disc, hollow: hollow,
      blend: s.ring === "blend" && s.discSize < 100,
      imgR: disc > 1 ? disc : core,                     // what the centre image is measured against
      fadeFrom: n2(rb * k), fadeTo: n2(reach * k)
    };
  };

  Sun.imageBox = function (s, sun) {
    if (!s.img) return null;
    const k = (s.imgSize / 100) * (sun.imgR * 2) / Math.max(s.img.w, s.img.h);
    const w = s.img.w * k, h = s.img.h * k;
    return { x: n2(C + s.imgX - w / 2), y: n2(C + s.imgY - h / 2), w: n2(w), h: n2(h) };
  };

  Sun.n2 = n2;
})(window.Sun);

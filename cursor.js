// On the river: an outlined pointer with a gently flexing stem, drawn here because it moves.
// The grid's arrow and hand, the river's paw and the version rounds are system cursors (cursor.css, nav.js).
(() => {
  if (window.cabzCursorStarted || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  window.cabzCursorStarted = true;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-12 -4 48 52');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('cabz-cursor');
  svg.style.overflow = 'visible';
  const shape = document.createElementNS(svg.namespaceURI, 'path');
  svg.append(shape);
  document.documentElement.append(svg);
  document.documentElement.classList.add("cabz-cursor-ready");
  document.body.classList.add('cursor-ready');
  // the river cursor, as settled in v01
  const settings = { roundness: 1.3, tailWidth: 5, movement: .75 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let x = 0, y = 0, previousX = 0, previousY = 0, initialized = false, visible = false;
  let bend = 0, velocity = 0, swing = 0, swingVelocity = 0, curl = 3.8, last = 0;
  let curlSide = 1, stretch = 0;
  let cursorTarget = null;
  let styledTarget = null, styledCursor = 'auto';
  const spineAngles = Array.from({ length: 32 }, (_, i) => .24 + 3.8 * ((i + .5) / 32) ** 2);
  const arrow = () => {
    // Build a tapered ribbon around a flexible spine, so the curl can face either way.
    const spine = [{ x: 9.5, y: 17 }];
    let px = 9.5, py = 17;
    for (let i = 1; i <= 32; i++) {
      const t = (i - .5) / 32;
      // Integrate a smooth turning spine: the tip hooks back instead of merely leaning.
      const turn = spineAngles[i - 1];
      px += Math.sin(turn) * .94;
      py += Math.cos(turn) * .94;
      spine.push({ x: px, y: py });
    }
    const left = [], right = [];
    spine.forEach((point, i) => {
      const before = spine[Math.max(0, i - 1)], after = spine[Math.min(32, i + 1)];
      const dx = after.x - before.x, dy = after.y - before.y;
      const length = Math.hypot(dx, dy) || 1;
      const radius = settings.tailWidth / 2 - (i / 32) * settings.tailWidth * .1875;
      left.push(`${point.x - dy / length * radius} ${point.y + dx / length * radius}`);
      right.push(`${point.x + dy / length * radius} ${point.y - dx / length * radius}`);
    });
    const r = Math.min(5.6, settings.roundness * 4.5);
    const tipRadius = settings.tailWidth * .3125;
    return `M2 2 Q1.5 10 2 ${22 - r} Q2 22 ${2 + r * .8} ${22 - r * .6} L${left.join(' L')} A${tipRadius} ${tipRadius} 0 0 0 ${right[32]} L${right.slice(0,32).reverse().join(' L')} Q11.9 16 ${12 + r * .12} 16 L${18.5 - r} 16 Q18.5 16 ${18.5 - r * .75} ${16 - r * .64} Q9.1 6.8 2 2 Z`;
  };
  const update = event => {
    x = event.clientX; y = event.clientY;
    if (!initialized) { previousX = x; previousY = y; initialized = true; }
    const target = event.composedPath().find(node => node instanceof Element);
    cursorTarget = target;
    // reading the style forces a layout: only when the pointer reaches a new element
    if (target !== styledTarget) { styledTarget = target; styledCursor = target ? getComputedStyle(target).cursor : 'auto'; }
    const locked = document.body.classList.contains('eclipse-locked');
    // over an index name the moon's lens shows the real name; over the sun the moon is the only pointer
    const overName = (target?.closest?.('.list a.name[data-full]') || target?.closest?.('.sun:not(.eclipse-ready)')) && !locked;
    // only the river's pointer is drawn here, where the system one is hidden (cursor.css): over text too, never the I-beam.
    // Everything else, the paw and a version dot's round included, is a system cursor.
    visible = !overName && document.documentElement.classList.contains('river-active') && ['none', 'auto', 'default', 'text', 'vertical-text'].includes(styledCursor);
    if (visible && !shape.getAttribute('d')) shape.setAttribute('d', arrow());
    svg.style.visibility = visible ? 'visible' : 'hidden';
    svg.style.transform = `translate(${x - 14}px, ${y - 6}px)`;
  };
  addEventListener('pointermove', update, { passive: true });
  addEventListener('pointerover', update, { passive: true });
  const hide = () => { visible = false; svg.style.visibility = 'hidden'; };
  document.documentElement.addEventListener('pointerleave', hide);
  addEventListener('blur', hide);
  // switching grid ↔ river changes the cursor where it stands, without waiting for the mouse to move
  addEventListener('cabz:navigation-mode', () => { styledTarget = null; if (initialized) update({ clientX: x, clientY: y, composedPath: () => cursorTarget ? [cursorTarget] : [] }); });
  const draw = time => {
    const dt = Math.min((time - (last || time)) / 1000, .032); last = time;
    const dx = x - previousX, dy = y - previousY;
    previousX = x; previousY = y;
    if (reduce.matches) { bend = velocity = swing = swingVelocity = 0; curl = 3.8; stretch = 0; }
    else {
      // Sideways acceleration swings the tail around its root; damping lets it settle.
      swingVelocity += Math.max(-60, Math.min(60, -dx + dy * .15)) * .075;
      const trailingAngle = -Math.atan2(dx / Math.max(dt, .001), 450 + Math.abs(dy) / Math.max(dt, .001)) * .85;
      swingVelocity += ((trailingAngle - swing) * 65 - swingVelocity * 9) * dt;
      swing = Math.max(-1.05, Math.min(1.05, swing + swingVelocity * dt));
      velocity += Math.max(-14, Math.min(14, -dx + dy * .35)) * 2.1;
      const target = (Math.sin(time / 390) * 2.3 + Math.sin(time / 710) * .8) * settings.movement;
      velocity += ((target - bend) * 95 - velocity * 11) * dt;
      bend = Math.max(-4, Math.min(4, bend + velocity * dt));
      const speed = Math.hypot(dx, dy) / Math.max(dt, .001);
      if (Math.abs(dx) > 3) curlSide = dx > 0 ? -1 : 1;
      const activity = Math.min(1, speed / 1500);
      stretch += (activity - stretch) * (1 - Math.exp(-dt * (activity > stretch ? 22 : 4)));
      const restingCurl = curlSide * (3.9 + Math.sin(time / 950) * .35);
      const targetCurl = restingCurl * (1 - stretch * .83);
      curl += (targetCurl - curl) * (1 - Math.exp(-dt * 7));
    }
    spineAngles.forEach((angle, i) => {
      const t = (i + .5) / 32;
      // The root stays fixed to the arrow; the movement eases in further down, so the tail never folds over the body.
      const free = Math.min(1, Math.max(0, (t - .06) / .24)), hold = free * free * (3 - 2 * free);
      const target = .24 + hold * (swing * settings.movement + bend * .055 + curl * t * t);
      // Each successive section responds more slowly, carrying a wave down to the tip.
      spineAngles[i] = reduce.matches ? target : angle + (target - angle) * (1 - Math.exp(-dt * (26 - t * 17)));
    });
    if (visible) shape.setAttribute('d', arrow());
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();

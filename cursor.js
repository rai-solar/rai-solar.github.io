// An outlined pointer with a gently flexing stem and a matching, tailless hand.
(() => {
  if (window.cabzCursorStarted || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  window.cabzCursorStarted = true;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-12 -4 48 52');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('cabz-cursor');
  svg.style.overflow = 'visible';
  const makePath = () => { const p = document.createElementNS(svg.namespaceURI, 'path'); svg.append(p); return p; };
  const shape = makePath();
  const pads = makePath();
  // Detached claw marks use the same fill and outline as the paw pads.
  pads.dataset.part = 'claws';
  pads.style.display = 'none';
  document.documentElement.append(svg);
  document.documentElement.classList.add("cabz-cursor-ready");
  document.body.classList.add('cursor-ready');
  const defaults = { roundness: 1.3, tailWidth: 5, movement: .75, pawGap: 1.5 };
  // v01 settled these values; its own key, so v00 keeps whatever was tuned there
  const STORE = 'cabz-cursor-settings-v01';
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch {}
  const settings = { ...defaults };
  for (const key of Object.keys(defaults)) if (Number.isFinite(saved?.[key])) settings[key] = saved[key];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let x = 0, y = 0, previousX = 0, previousY = 0, initialized = false, visible = false;
  let bend = 0, velocity = 0, swing = 0, swingVelocity = 0, curl = 3.8, last = 0;
  let curlSide = 1, stretch = 0;
  let hand = false, round = false, cursorTarget = null;
  // version dots: no arrow, no paw. The home page's moon turns orange there (sun.js);
  // where there is no moon, the cursor itself becomes that orange round.
  const VERSIONS = '.dot, .vers a, .g u';
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
    const cursor = target ? getComputedStyle(target).cursor : 'auto';
    hand = cursor.includes('pointer');
    // over an index name the moon's lens shows the real name: nothing should sit on it
    const overName = target?.closest?.('.list a.name[data-full]') && !document.body.classList.contains('eclipse-locked');
    const overVersion = target?.closest?.(VERSIONS);
    const moonFollows = document.querySelector('.sun-ball') && !document.body.classList.contains('eclipse-locked');
    round = !!overVersion && !moonFollows;
    visible = !overName && !(overVersion && moonFollows) && (round || hand || ['none', 'auto', 'default'].includes(cursor));
    svg.dataset.shape = round ? 'round' : hand ? 'paw' : 'arrow';
    svg.style.color = round ? '#FF4500' : '';
    pads.style.display = hand && !round ? '' : 'none';
    // Four compact toe pads and a single broad metacarpal pad, drawn from real canine references.
    // The extra path contains detached claws only; the paw never gains a tail.
    const gap = settings.pawGap - 1.2;
    pads.setAttribute('d', 'M4.7 10 Q2.9 6.7 4.5 7 Q6.3 7.2 6.2 10 Q5.6 10.6 4.7 10 Z M11.1 5.8 Q10.8 2.5 12.2 2.8 Q13.7 3.3 13 5.8 Q12 6.4 11.1 5.8 Z M18.7 5.8 Q18.2 2.5 19.7 2.8 Q21.2 3.3 20.7 5.8 Q19.7 6.4 18.7 5.8 Z M25.5 10 Q25.7 6.5 27.3 7 Q28.9 7.4 27 10 Q26.3 10.6 25.5 10 Z');
    pads.setAttribute('transform', `translate(0,${-gap})`);
    const toePads = 'M4.7 14.6 C4.3 11.1 7.3 10.5 9.1 13.1 C11 15.7 10.7 19.3 8.1 19.7 C5.8 20 4.9 17.4 4.7 14.6 Z M9.6 11.4 C9.3 7.3 12.3 6.4 14.2 9 C15.8 11.2 15.5 15.8 13 16.5 C10.6 17 9.8 14.1 9.6 11.4 Z M17 11.4 C16.7 7.3 19.7 6.4 21.6 9 C23.2 11.2 22.9 15.8 20.4 16.5 C18 17 17.2 14.1 17 11.4 Z M22.8 13.1 C24.5 10.6 27.4 11.1 27 14.6 C26.7 17.4 25.8 20 23.5 19.7 C20.9 19.3 20.8 15.7 22.8 13.1 Z';
    const heel = 'M6.8 25 C6.4 21.9 11.8 20.2 13.7 18.8 Q16 16.8 18.3 18.8 C20.2 20.2 25.6 21.9 25.2 25 C24.9 29.7 22.4 31 19.3 29.4 Q16 27.8 12.7 29.4 C9.6 31 7.1 29.7 6.8 25 Z';
    // Offset only the toe subpaths for the live spacing control.
    shape.setAttribute('d', round ? 'M1 20 A11 11 0 1 0 23 20 A11 11 0 1 0 1 20 Z' : hand ? `${toePads} ${heel}` : arrow());
    if (hand && !round && gap) {
      const numbers = toePads.match(/-?\d+(?:\.\d+)?/g).map(Number);
      let index = 0;
      const adjusted = toePads.replace(/-?\d+(?:\.\d+)?/g, () => { const value = numbers[index]; return String(index++ % 2 ? value - gap : value); });
      shape.setAttribute('d', `${adjusted} ${heel}`);
    }
    svg.style.visibility = visible ? 'visible' : 'hidden';
    svg.style.transform = round ? `translate(${x - 24}px, ${y - 24}px)` : `translate(${x - (hand ? 28 : 14)}px, ${y - (hand ? 22 : 6)}px)`;
  };
  addEventListener('pointermove', update, { passive: true });
  addEventListener('pointerover', update, { passive: true });
  const hide = () => { visible = false; svg.style.visibility = 'hidden'; };
  document.documentElement.addEventListener('pointerleave', hide);
  addEventListener('blur', hide);
  // Temporary tuning UI requested for this study. Values persist across site pages.
  const devHost = document.createElement('aside');
  devHost.dataset.cursorDev = '';
  devHost.style.cssText = 'position:fixed;top:42px;right:8px;z-index:2147483646';
  devHost.hidden = true;
  const dev = devHost.attachShadow({ mode: 'open' });
  const controls = [
    ['roundness', 'Corner roundness', 0, 1.3, .01],
    ['tailWidth', 'Tail width', 3, 7, .1],
    ['movement', 'Tail movement', 0, 2, .05],
    ['pawGap', 'Paw spacing', .2, 3, .1]
  ];
  dev.innerHTML = `<style>
    :host{font:400 12px/1.4 Spectral,Georgia,serif;color:var(--fg,#222)}
    *{box-sizing:border-box}section{width:272px;max-width:calc(100vw - 16px);padding:14px;background:var(--bg,#efb4a5);border:1px solid currentColor;box-shadow:0 4px 25px #0002}
    header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}h2{font:inherit;margin:0;letter-spacing:.03em}
    button{font:inherit;color:inherit;border:0;background:none;padding:2px;cursor:var(--cursor-hand,pointer)}
    label{display:grid;grid-template-columns:1fr auto;gap:4px;margin:12px 0}output{font-variant-numeric:tabular-nums;opacity:.65}input{grid-column:1/-1;width:100%;accent-color:currentColor;margin:4px 0;cursor:var(--cursor-hand,pointer)}
    .preview{padding:20px 8px;border:1px dashed currentColor;text-align:center;margin:14px 0;cursor:none}.preview button{display:block;margin:10px auto 0;text-decoration:underline;text-underline-offset:3px}
    p{margin:12px 0 0;opacity:.6;font-size:10px}button:focus-visible,input:focus-visible{outline:1px solid currentColor;outline-offset:3px}
  </style><section aria-label="Cursor tuning"><header><h2>cursor / live adjustments</h2><button type="button" data-close aria-label="close cursor settings">×</button></header>
  ${controls.map(([key,label,min,max,step]) => `<label>${label}<output for="${key}">${settings[key]}</output><input id="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${settings[key]}" aria-label="${label}"></label>`).join('')}
  <div class="preview">move here to try the arrow<button type="button">hover here for the paw</button></div>
  <button type="button" data-reset>reset defaults ↺</button><p>Changes apply everywhere and are saved in this browser.</p></section>`;
  document.documentElement.append(devHost);
  const renderSettings = () => {
    controls.forEach(([key]) => { dev.getElementById(key).value = settings[key]; dev.querySelector(`output[for="${key}"]`).textContent = Number(settings[key]).toFixed(2); });
    try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch {}
    update({ clientX: x, clientY: y, composedPath: () => cursorTarget ? [cursorTarget] : [] });
  };
  dev.addEventListener('input', event => { if (event.target.matches('input')) { settings[event.target.id] = Number(event.target.value); renderSettings(); } });
  const setDevOpen = open => {
    devHost.hidden = !open;
    dispatchEvent(new CustomEvent('cabz:cursor-settings-state', { detail: { open } }));
  };
  addEventListener('cabz:cursor-settings', () => setDevOpen(devHost.hidden));
  dev.querySelector('[data-close]').addEventListener('click', () => setDevOpen(false));
  dev.querySelector('[data-reset]').addEventListener('click', () => { Object.assign(settings, defaults); renderSettings(); });
  addEventListener('keydown', event => { if (event.key === 'Escape') setDevOpen(false); });
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
      const target = .24 + swing * settings.movement + bend * .055 + curl * t * t;
      // Each successive section responds more slowly, carrying a wave down to the tip.
      spineAngles[i] = reduce.matches ? target : angle + (target - angle) * (1 - Math.exp(-dt * (26 - t * 17)));
    });
    if (!hand && !round) shape.setAttribute('d', arrow());
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();

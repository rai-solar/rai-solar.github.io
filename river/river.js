/* Floating River / 01. No build step, no framework, no dependencies. */
(() => {
  'use strict';
  if (window.RiverExperiment) return;
  const script = document.currentScript;
  const base = new URL('.', script.src);
  const asset = name => new URL(name, base).href;
  const config = { ...window.CABZ_RIVER_CONFIG };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const random = (a, b) => a + Math.random() * (b - a);
  const between = range => random(...range);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const svgNS = 'http://www.w3.org/2000/svg';
  const projects = [
    { id: 'lisiere', title: 'lisière', kind: 'leaf', size: 145, content: `<img src="${asset('assets/leaf.png')}" alt="">` },
    { id: 'future-web', title: 'future web', kind: 'duck', size: 95, content: '<span class="river-emoji" style="--emoji-size:80px">🦆</span>' },
    { id: 'pas-a-pas', title: 'pas à pas', kind: 'type', size: 135, content: '<span class="river-type">pas<br>à pas.</span>' },
    { id: 'field-notes', title: 'field notes', kind: 'postcard', size: 158, content: `<span class="river-postcard"><img src="${asset('assets/river-study.jpg')}" alt=""><small>EAU COURANTE / ÉTUDE 01</small></span>` },
    { id: 'soleil', title: 'soleil', kind: 'ring', size: 100, content: '<span class="river-ring"></span>' },
    { id: 'pesca', title: 'pesca', kind: 'fish', size: 100, content: '<span class="river-emoji" style="--emoji-size:82px">🐟</span>' },
    { id: 'no-fixed-point', title: 'no fixed point', kind: 'ticket', size: 88, content: '<span class="river-ticket"><b>NO<br>FIXED<br>POINT</b><small>028 — ONE WAY<br>NE PAS JETER</small></span>' },
    { id: 'wild-gardens', title: 'wild gardens', kind: 'flower', size: 110, content: '<svg class="river-flower" viewBox="0 0 120 120" aria-hidden="true"><path d="M60 7C82-10 86 29 85 35C111 14 131 48 98 61C130 76 107 109 85 88C93 124 53 131 52 95C29 122 0 95 28 73C-9 73-4 36 32 42C10 17 39-7 60 25Z"/></svg>' },
    { id: 'small-signals', title: 'small signals', kind: 'asterisk', size: 105, content: '<span class="river-asterisk">✳</span>' },
    { id: 'in-between', title: 'in between', kind: 'seal', size: 105, content: '<span class="river-seal">流</span>' }
  ];
  const scene = document.createElement('section');
  scene.className = 'river-scene';
  scene.setAttribute('aria-label', 'Floating river navigation');
  scene.inert = true;
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = `<div class="river-bed"></div>
    <video class="river-video" autoplay muted loop playsinline preload="none" poster="${asset(config.poster)}" aria-hidden="true"></video>
    <svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs></defs></svg>
    <div class="river-drifters" aria-label="Drifting projects"></div>
    <button type="button" class="river-play" hidden>play the river ↗</button>
    <div class="river-controls">
      <button type="button" class="river-pause" aria-pressed="false">pause</button>
      <details class="river-credits"><summary>sources</summary><div>
        <p>Overhead river · Dmytro Mogilenets<br><a href="https://www.pexels.com/video/directly-above-view-on-flowing-water-in-river-10001446/" target="_blank" rel="noopener">Pexels ↗</a> · <a href="https://www.pexels.com/license/" target="_blank" rel="noopener">Pexels License</a><br>Silent excerpt with a crossfaded loop.</p>
        <p>Leaf · Santhaladevi · <a href="https://commons.wikimedia.org/wiki/File:Leaf_of_Sonchus_oleraceus.png" target="_blank" rel="noopener">source ↗</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>. Source thumbnail.</p>
        <p>Postcard photograph: jLasWilson · <a href="https://commons.wikimedia.org/wiki/File:Running_Stream_Of_Water.webm" target="_blank" rel="noopener">source ↗</a> · CC0. Extracted frame.</p>
      </div></details>
      <details class="river-index"><summary>objects (10) ↗</summary><nav aria-label="All river projects">${projects.map((p, i) => `<a href="${asset('project.html')}?id=${p.id}"><small>${String(i + 1).padStart(2, '0')}</small><span>${p.title}</span></a>`).join('')}</nav></details>
    </div>
    <span class="river-sr" role="status" aria-live="polite"></span>`;
  document.body.append(scene);
  const video = scene.querySelector('video');
  video.muted = true;
  const drifters = scene.querySelector('.river-drifters');
  const defs = scene.querySelector('defs');
  const pauseButton = scene.querySelector('.river-pause');
  const playButton = scene.querySelector('.river-play');
  const status = scene.querySelector('[role="status"]');
  scene.querySelectorAll('details').forEach(details => details.addEventListener('toggle', () => {
    if (details.open) scene.querySelectorAll('details').forEach(other => { if (other !== details) other.open = false; });
  }));
  let switching = 0, active = false, paused = false, frameId = 0, last = 0, time = 0, filterTime = 0;
  let width = innerWidth, height = innerHeight, nextArrival = 0, initialized = false, touchTarget = null;
  let scheduledPause = 0;
  const objects = projects.map((project, i) => {
    const filter = document.createElementNS(svgNS, 'filter');
    filter.id = `river-ripple-${i}`;
    filter.setAttribute('x', '-25%'); filter.setAttribute('y', '-25%');
    filter.setAttribute('width', '150%'); filter.setAttribute('height', '150%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.innerHTML = `<feTurbulence type="fractalNoise" baseFrequency=".018 .028" numOctaves="2" seed="${i + 7}" stitchTiles="stitch" result="noise"/>
      <feOffset in="noise" dx="0" dy="0" result="current"/>
      <feDisplacementMap in="SourceGraphic" in2="current" scale="5" xChannelSelector="R" yChannelSelector="G"/>`;
    defs.append(filter);
    const a = document.createElement('a');
    a.className = `river-object river-kind-${project.kind}`;
    a.href = asset('project.html') + '?id=' + project.id;
    a.setAttribute('aria-label', project.title);
    a.style.setProperty('--ripple', `url(#${filter.id})`);
    a.innerHTML = `<span class="river-cargo" aria-hidden="true">${project.content}</span><span class="river-label" aria-hidden="true">${String(i + 1).padStart(2, '0')} / ${project.title} ↗</span>`;
    a.hidden = true; a.tabIndex = -1;
    drifters.append(a);
    const item = { ...project, el: a, cargo: a.firstElementChild, label: a.lastElementChild,
      noise: filter.children[0], offset: filter.children[1], displacement: filter.children[2],
      x: 0, y: 0, vx: 0, vy: 0, angle: random(-.4, .4), angular: 0,
      visible: false, hovered: false, focused: false, clarity: 0, phase: random(0, Math.PI * 2),
      weight: random(.78, 1.2), ready: 0 };
    a.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') item.hovered = true; });
    a.addEventListener('pointerleave', () => { item.hovered = false; });
    a.addEventListener('focus', () => {
      item.focused = true;
      item.x = clamp(item.x, 90, width - 90); item.y = clamp(item.y, 160, height - 140);
      render(item, 0);
    });
    a.addEventListener('blur', () => { item.focused = false; });
    a.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' && touchTarget !== item) {
        clearTouch(); touchTarget = item; item.hovered = true;
        a.dataset.held = ''; item.previewTap = true;
      }
    });
    a.addEventListener('click', e => {
      if (item.previewTap) { e.preventDefault(); item.previewTap = false; }
    });
    return item;
  });
  function clearTouch() {
    if (!touchTarget) return;
    touchTarget.hovered = false; delete touchTarget.el.dataset.held; touchTarget = null;
  }
  scene.addEventListener('pointerdown', e => { if (!e.target.closest('.river-object')) clearTouch(); });
  const direction = () => {
    const [x, y] = config.flowDirection, magnitude = Math.hypot(x, y) || 1;
    return !x && !y ? [0, 1] : [x / magnitude, y / magnitude];
  };
  // All objects sample this one continuous spatial field: downstream flow + crossing
  // ribbons + two broad, slowly migrating eddies. Deformation uses its local gradient.
  function current(x, y, t) {
    const [dx, dy] = direction(), nx = -dy, ny = dx;
    const u = x / width, v = y / height;
    const ribbon = Math.sin(u * 9 + v * 5 - t * .38) * 13 + Math.sin(v * 12 + t * .29) * 7;
    const pulse = 1 + .18 * Math.sin(u * 5 - v * 6 + t * .4);
    let vx = dx * config.flowSpeed * pulse + nx * ribbon * config.currentStrength;
    let vy = dy * config.flowSpeed * pulse + ny * ribbon * config.currentStrength;
    for (let i = 0; i < 2; i++) {
      const ex = (.32 + i * .35 + Math.sin(t * .055 + i) * .07) * width;
      const ey = (.37 + i * .32 + Math.cos(t * .061 + i) * .09) * height;
      const rx = (x - ex) / Math.min(width, height), ry = (y - ey) / Math.min(width, height);
      const strength = Math.exp(-(rx * rx + ry * ry) * 15) * (i ? -62 : 70) * config.currentStrength;
      vx -= ry * strength; vy += rx * strength;
    }
    return { x: vx, y: vy };
  }
  function resize() {
    const oldW = width, oldH = height; width = innerWidth; height = innerHeight;
    for (const item of objects) {
      item.x *= width / oldW; item.y *= height / oldH;
      const size = item.size * config.objectScale * (width < 600 ? .78 : 1);
      item.el.style.setProperty('--size', size + 'px');
    }
    if (reduced.matches) arrangeStill();
  }
  function spawn(item, inside = false, seed = 0) {
    const [dx, dy] = direction();
    let x = inside ? width * (.17 + (seed * .27) % .68) : random(width * .12, width * .88);
    let y = inside ? height * (.2 + (seed * .19) % .59) : random(height * .2, height * .8);
    if (!inside) {
      const margin = 150 * config.objectScale;
      const tx = Math.abs(dx) < .001 ? Infinity : (dx > 0 ? x + margin : width + margin - x) / Math.abs(dx);
      const ty = Math.abs(dy) < .001 ? Infinity : (dy > 0 ? y + margin : height + margin - y) / Math.abs(dy);
      const distance = Math.min(tx, ty);
      x -= dx * distance; y -= dy * distance;
    }
    item.x = x; item.y = y; item.visible = true; item.el.hidden = false; item.el.tabIndex = 0;
    const flow = current(x, y, time); item.vx = flow.x; item.vy = flow.y;
    item.angle = random(-.4, .4); item.angular = 0; item.clarity = 0;
    render(item, 0);
  }
  function retire(item) {
    item.visible = false; item.el.hidden = true; item.el.tabIndex = -1;
    item.ready = time + between(config.reappearanceDelay);
    item.hovered = item.focused = false;
    if (touchTarget === item) clearTouch();
  }
  function arrangeStill() {
    objects.forEach((item, i) => {
      item.visible = true; item.el.hidden = false; item.el.tabIndex = 0;
      const cols = width < 600 ? 2 : 5, rows = Math.ceil(objects.length / cols);
      item.x = width * ((i % cols + .5) / cols);
      item.y = 110 + (height - 240) * ((Math.floor(i / cols) + .5) / rows);
      item.angle = 0; item.clarity = 1; render(item, 0);
    });
  }
  function render(item, strain) {
    const angle = item.angle * 180 / Math.PI;
    item.el.style.transform = `translate3d(${item.x}px,${item.y}px,0) translate(-50%,-50%)`;
    // The hit area never rotates or distorts: only the visible cargo is affected.
    const elastic = reduced.matches ? 0 : clamp(strain * .003, -.075, .075) * (1 - item.clarity);
    const tilt = reduced.matches ? 0 : Math.sin(time * .68 + item.phase) * 4.7 * (1 - item.clarity);
    item.cargo.style.transform = `rotate(${angle}deg) rotateX(${tilt}deg) scale(${1 + elastic},${1 - elastic * .7})`;
    item.label.style.left = '50%'; item.label.style.top = '-19px';
    item.label.style.transform = 'translateX(-50%)';
  }
  function tick(now) {
    if (!active || document.hidden) { frameId = 0; return; }
    const dt = Math.min((now - (last || now)) / 1000, .04); last = now;
    if (!paused && !reduced.matches) time += dt;
    const updateFilter = now - filterTime > 90;
    if (updateFilter) filterTime = now;
    let count = objects.filter(o => o.visible).length;
    if (!paused && !reduced.matches && time >= nextArrival && count < config.density) {
      const available = objects.filter(o => !o.visible && time >= o.ready);
      if (available.length) { spawn(available[Math.floor(Math.random() * available.length)]); count++; }
      nextArrival = time + between(config.arrivalInterval);
    }
    for (const item of objects) {
      if (!item.visible) continue;
      const held = item.hovered || item.focused;
      item.clarity += ((held || reduced.matches ? 1 : 0) - item.clarity) * (1 - Math.exp(-dt * 9));
      let strain = 0;
      if (!paused && !reduced.matches) {
        const flow = current(item.x, item.y, time);
        const right = current(item.x + 18, item.y, time), below = current(item.x, item.y + 18, time);
        const vorticity = (right.y - flow.y - (below.x - flow.x)) / 18;
        strain = right.x - flow.x - (below.y - flow.y);
        const speed = 1 - item.clarity * (1 - config.hoverSpeed);
        const response = 1 - Math.exp(-dt * 1.6);
        item.vx += (flow.x * item.weight - item.vx) * response;
        item.vy += (flow.y * item.weight - item.vy) * response;
        item.x += item.vx * dt * speed; item.y += item.vy * dt * speed;
        const targetRotation = (vorticity * .48 + Math.sin(time * .53 + item.phase) * .07) * config.rotationIntensity;
        item.angular += (targetRotation - item.angular) * (1 - Math.exp(-dt * 1.4));
        item.angle += item.angular * dt * speed;
        // Never remove an object while it is being inspected or keyboard-focused.
        if (!held && (item.x < -230 || item.x > width + 230 || item.y < -230 || item.y > height + 230)) {
          retire(item); continue;
        }
      }
      render(item, strain);
      if (updateFilter) {
        const clarity = 1 - item.clarity * (1 - config.hoverDistortion);
        item.displacement.setAttribute('scale', reduced.matches ? 0 : config.distortionStrength * clarity * (1 + .2 * Math.sin(time * .8 + item.phase)));
        item.noise.setAttribute('baseFrequency', `${.018 + Math.sin(time * .13 + item.phase) * .002} ${.028 + Math.cos(time * .17 + item.phase) * .003}`);
        const flow = current(item.x, item.y, time);
        item.offset.setAttribute('dx', Math.sin(time * .15 + item.phase) * 8 + flow.x * .08);
        item.offset.setAttribute('dy', Math.cos(time * .13 + item.phase) * 8 + flow.y * .08);
      }
    }
    frameId = requestAnimationFrame(tick);
  }
  function resumeFrame() {
    last = 0;
    if (active && !document.hidden && !frameId) frameId = requestAnimationFrame(tick);
  }
  function playVideo() {
    if (!active || paused || reduced.matches || document.hidden) return;
    if (!video.src) video.src = asset(config.video);
    video.play().then(() => { playButton.hidden = true; }).catch(() => { playButton.hidden = false; });
  }
  function setPaused(value) {
    paused = value; pauseButton.textContent = paused ? 'resume' : 'pause';
    pauseButton.setAttribute('aria-pressed', String(paused));
    if (paused) video.pause(); else playVideo();
  }
  function setMode(mode, persist = true) {
    const wasActive = active;
    active = mode === 'river';
    document.documentElement.classList.toggle('river-active', active);
    if (active !== wasActive) {
      document.documentElement.classList.add('river-switching');
      clearTimeout(switching); switching = setTimeout(() => document.documentElement.classList.remove('river-switching'), 900);
    }
    scene.inert = !active; scene.setAttribute('aria-hidden', String(!active));
    // Hidden homepage links are removed from keyboard navigation in river mode.
    document.querySelectorAll('body.home > .list, body.home > .sun').forEach(el => { el.inert = active; });
    if (persist) { try { localStorage.setItem('cabz-navigation-mode', active ? 'river' : 'grid'); } catch {} }
    if (active) {
      clearTimeout(scheduledPause);
      if (!initialized) {
        resize();
        if (reduced.matches) arrangeStill();
        else [0, 1, 3, 4].slice(0, config.density).forEach((i, n) => spawn(objects[i], true, n));
        initialized = true; nextArrival = time + between(config.arrivalInterval);
      }
      playVideo(); resumeFrame();
    } else {
      cancelAnimationFrame(frameId); frameId = 0; clearTouch();
      // Let the last video frame carry the closing transition.
      scheduledPause = setTimeout(() => video.pause(), 1100);
      if (scene.contains(document.activeElement)) document.querySelector('[data-cabz-nav]')?.shadowRoot?.querySelector('.grid-btn')?.focus();
    }
    if (active !== wasActive) status.textContent = active ? 'River navigation. All projects are also available in the objects index.' : 'Grid navigation.';
    dispatchEvent(new CustomEvent('cabz:navigation-mode', { detail: { mode: active ? 'river' : 'grid' } }));
  }
  pauseButton.addEventListener('click', () => setPaused(!paused));
  playButton.addEventListener('click', () => { if (reduced.matches) { video.src ||= asset(config.video); video.play().catch(() => {}); playButton.hidden = true; } else playVideo(); });
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else { playVideo(); resumeFrame(); } });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { video.pause(); arrangeStill(); }
    else { objects.forEach(retire); objects.slice(0, 4).forEach((o, i) => spawn(o, true, i)); playVideo(); }
  });
  window.RiverExperiment = {
    config,
    get mode() { return active ? 'river' : 'grid'; },
    setMode,
    toggle() { setMode(active ? 'grid' : 'river'); },
    configure(values) {
      Object.assign(config, values);
      config.density = clamp(Math.round(config.density), 3, 6);
      config.flowSpeed = clamp(config.flowSpeed, 0, 180);
      config.objectScale = clamp(config.objectScale, .4, 2);
      if (!Array.isArray(config.flowDirection) || !config.flowDirection.every(Number.isFinite) || Math.hypot(...config.flowDirection) < .001) config.flowDirection = [0, 1];
      resize();
      if (!reduced.matches) objects.filter(o => o.visible && !o.focused && !o.hovered).slice(config.density).forEach(retire);
      if (values.video) { video.src = asset(config.video); playVideo(); }
      return { ...config };
    },
    // Snapshot is read-only, useful for tuning and browser verification.
    snapshot() { return { mode: active ? 'river' : 'grid', time, paused, reduced: reduced.matches,
      objects: objects.map(o => ({ id: o.id, x: o.x, y: o.y, visible: o.visible, ready: o.ready, clarity: o.clarity })) }; }
  };
  let stored = 'grid'; try { stored = localStorage.getItem('cabz-navigation-mode') || stored; } catch {}
  const initial = new URLSearchParams(location.search).get('mode') || (document.body.hasAttribute('data-river-entry') ? 'river' : stored);
  setMode(initial === 'river' ? 'river' : 'grid', false);
})();

'use strict';
// Unified input: keyboard + gamepad + PSP-style touch overlay.
const Input = (() => {
  const ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'special', 'super', 'jump', 'start', 'back'];
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyJ: 'punch', KeyZ: 'punch', KeyK: 'kick', KeyX: 'kick', KeyL: 'special', KeyC: 'special', KeyI: 'super', KeyV: 'super',
    Space: 'jump', Enter: 'start', KeyP: 'start', Escape: 'back', Backspace: 'back',
  };
  const kb = {}, touch = {};
  let pad = {}, prev = {}, cur = {};
  let lastSource = 'keyboard';

  const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  addEventListener('keydown', e => {
    if (typing(e)) return;
    const a = KEYMAP[e.code];
    if (a) { kb[a] = true; e.preventDefault(); lastSource = 'keyboard'; }
  });
  addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) kb[a] = false; });
  // a focused text field must not leave game keys stuck down
  addEventListener('focusin', e => { if (typing(e)) for (const k in kb) kb[k] = false; });
  addEventListener('blur', () => { for (const k in kb) kb[k] = false; });

  function pollPad() {
    pad = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const b = i => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (ax < -0.45 || b(14)) pad.left = true;
      if (ax > 0.45 || b(15)) pad.right = true;
      if (ay < -0.55 || b(12)) pad.up = true;
      if (ay > 0.55 || b(13)) pad.down = true;
      if (b(2)) pad.punch = true;
      if (b(0)) pad.kick = true;
      if (b(1)) pad.special = true;
      if (b(3)) pad.jump = true;
      if (b(5) || b(7)) pad.super = true;
      if (b(9)) pad.start = true;
      if (b(8)) pad.back = true;
      if (Object.keys(pad).length) lastSource = 'gamepad';
    }
  }

  function update() {
    pollPad();
    prev = cur; cur = {};
    for (const a of ACTIONS) cur[a] = !!(kb[a] || touch[a] || pad[a]);
  }

  const held = a => !!cur[a];
  const pressed = a => !!cur[a] && !prev[a];

  // ---------------- touch overlay ----------------
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;

  function buzz(ms) {
    const ua = navigator.userActivation;
    if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(ms);
  }

  function setupTouch() {
    if (!isTouch) return;
    document.body.classList.add('touch');
    lastSource = 'touch';

    // joystick
    const zone = document.getElementById('stick-zone');
    const base = document.getElementById('stick-base');
    const knob = document.getElementById('stick-knob');
    let stickId = null;
    const clearDirs = () => { touch.left = touch.right = touch.up = touch.down = false; };
    function moveStick(e) {
      const r = base.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      const max = R * 0.62;
      const k = d > max ? max / d : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      clearDirs();
      if (d < R * 0.28) return;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI; // -180..180, 0 = right
      // 8-way with generous diagonals
      if (ang > -67.5 && ang < 67.5) touch.right = true;
      if (ang > 112.5 || ang < -112.5) touch.left = true;
      if (ang > 22.5 && ang < 157.5) touch.down = true;
      if (ang < -22.5 && ang > -157.5) touch.up = true;
    }
    zone.addEventListener('pointerdown', e => {
      if (stickId !== null) return;
      stickId = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (_) {}
      moveStick(e); e.preventDefault();
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
    const endStick = e => {
      if (e.pointerId !== stickId) return;
      stickId = null; clearDirs(); knob.style.transform = '';
    };
    zone.addEventListener('pointerup', endStick);
    zone.addEventListener('pointercancel', endStick);

    // face buttons — supports sliding a thumb between buttons
    const btns = [...document.querySelectorAll('.pbtn, #btn-pause')];
    const owner = new Map(); // pointerId -> button
    const refresh = () => {
      for (const b of btns) {
        const on = [...owner.values()].includes(b);
        b.classList.toggle('on', on);
        touch[b.dataset.act] = on;
      }
    };
    for (const b of btns) {
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        owner.set(e.pointerId, b);
        try { b.releasePointerCapture(e.pointerId); } catch (_) {}
        refresh();
        buzz(8);
      });
    }
    addEventListener('pointermove', e => {
      if (!owner.has(e.pointerId)) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const b = el && el.closest('.pbtn');
      if (b && b !== owner.get(e.pointerId)) { owner.set(e.pointerId, b); refresh(); }
    });
    const up = e => { if (owner.delete(e.pointerId)) refresh(); };
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);

    document.getElementById('btn-full').addEventListener('click', () => toggleFullscreen());
  }

  // iPhone Safari has no element fullscreen; the only way is a home-screen web app
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPod|iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true ||
    matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  const fsSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const needsGuide = isTouch && !standalone && !fsSupported;

  function showGuide() { document.body.classList.add('guide'); }
  function hideGuide() { document.body.classList.remove('guide'); }
  document.getElementById('guide-ok').addEventListener('click', hideGuide);
  document.getElementById('guide').addEventListener('pointerdown', e => { if (e.target.id === 'guide') hideGuide(); });
  if (standalone) document.body.classList.add('standalone');

  // shown once automatically on the first tap, afterwards via the fullscreen button
  function guideOnce() {
    if (!needsGuide || localStorage.getItem('ghostfighter_guide_seen')) return;
    localStorage.setItem('ghostfighter_guide_seen', '1');
    showGuide();
  }

  function toggleFullscreen(force) {
    if (needsGuide) { if (!force) showGuide(); return; }
    const d = document, el = d.documentElement;
    const fs = d.fullscreenElement || d.webkitFullscreenElement;
    if (fs && !force) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    if (fs) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    Promise.resolve(req.call(el, { navigationUI: 'hide' }))
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => {});
  }

  return {
    update, held, pressed, setupTouch, buzz, toggleFullscreen, guideOnce, isTouch, isIOS, standalone,
    get guideOpen() { return document.body.classList.contains('guide'); },
    get source() { return lastSource; },
    confirm: () => pressed('punch') || pressed('jump') || pressed('start') || pressed('special'),
    cancel: () => pressed('kick') || pressed('back'),
    anyPressed: () => ACTIONS.some(pressed),
  };
})();

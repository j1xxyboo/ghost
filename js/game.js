'use strict';
/* =========================================================================
   GHOST FIGHTER — retro 16-bit browser fighting game
   ========================================================================= */
const W = 640, H = 360, GROUND = 334, GRAV = 0.55;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const POSES = ['idle', 'walk', 'punch', 'kick', 'jump', 'crouch', 'block', 'hit', 'ko', 'special', 'uppercut', 'win',
  'superup', 'supercharge', 'punch2', 'punch3', 'punch4', 'kick2', 'kick3', 'kick4'];

const CHARS = [
  { id: 'hero', name: 'GHOST', title: 'THE STREET LEGEND', from: 'NORTH AFRICA', stage: 'street',
    hp: 100, spd: 1.0, pow: 1.0, proj: ['#e6f6ff', '#3d8bff'], vo: 'vo_special',
    ult: { name: 'PHANTOM CANNON', type: 'beam', colors: ['#ffffff', '#3d8bff', '#9fe0ff'] },
    stats: [4, 4, 5] },
  { id: 'kaze', name: 'KAZE', title: 'MASTER OF THE WIND FIST', from: 'JAPAN', stage: 'dojo',
    hp: 100, spd: 1.0, pow: 1.05, proj: ['#ffffff', '#58b8ff'], stats: [4, 4, 4],
    ult: { name: 'TEMPEST DRAGON', type: 'beam', colors: ['#f4fff8', '#19d980', '#b8ffd8'] } },
  { id: 'volta', name: 'VOLTA', title: 'THE LIGHTNING KICK', from: 'BRAZIL', stage: 'street',
    hp: 92, spd: 1.2, pow: 0.92, proj: ['#fffbd0', '#ffb800'], stats: [3, 5, 3],
    ult: { name: 'THUNDER STORM', type: 'rush', colors: ['#ffffff', '#ffd000', '#fff7a0'] } },
  { id: 'brutus', name: 'BRUTUS', title: 'THE IRON BEAR', from: 'RUSSIA', stage: 'dojo',
    hp: 118, spd: 0.82, pow: 1.25, proj: ['#ffe2b0', '#ff4a12'], stats: [5, 2, 3],
    ult: { name: 'IRON METEOR', type: 'quake', colors: ['#fff0c0', '#ff4a12', '#ffb03a'] } },
  { id: 'shade', name: 'SHADE', title: 'THE GHOST OF THE ROOFTOPS', from: '???', stage: 'rooftop',
    hp: 112, spd: 1.12, pow: 1.12, proj: ['#eaffff', '#1de9ff'], boss: true, stats: [5, 5, 5],
    ult: { name: 'SOUL REAPER', type: 'beam', colors: ['#f0ffff', '#9a3dff', '#1de9ff'] } },
  { id: 'ryona', name: 'RYONA', title: 'THE GOTHIC CAT QUEEN', from: 'NORTH AFRICA', stage: 'rooftop',
    hp: 96, spd: 1.1, pow: 0.98, proj: ['#f3e6ff', '#9b30ff'], vo: 'vo_special_ryona', stats: [3, 4, 5],
    style: { start: -1, dmg: 0.92 }, // agile street-cat: quicker, lighter hits
    ult: { name: 'LUTCHI CLAW', type: 'summon', colors: ['#ffffff', '#9b30ff', '#e3b8ff'] } },
  { id: 'jaxxy', name: 'JAXXY', title: 'THE SKYFALL WRESTLER', from: 'NORTH AFRICA', stage: 'dojo',
    hp: 108, spd: 1.0, pow: 1.12, proj: ['#eaf6ff', '#3da8ff'], vo: 'vo_special_jaxxy', stats: [5, 3, 4],
    style: { start: 1, dmg: 1.12, push: 1.3 }, // brawler-wrestler: slower, heavier hits
    ult: { name: "TYRANT'S CALL", type: 'khufra', colors: ['#ffffff', '#ffb400', '#ffe08a'], vo: 'vo_ult_jaxxy2' } },
];
CHARS.sort((a, b) => (a.boss ? 1 : 0) - (b.boss ? 1 : 0));
const CHAR = Object.fromEntries(CHARS.map(c => [c.id, c]));
const CAT_POSES = ['run', 'pounce', 'swipe', 'hiss'];
const CAT_SCALE = 1.3; // the summoned cat is a giant
const KHUFRA_POSES = ['idle', 'charge', 'dash', 'pull', 'smash', 'ball'];
const KHUFRA_SCALE = 1.15;
const STAGES = {
  street: { img: 'assets/bg/bg_street.jpg', name: 'MEDINA NIGHTS' },
  dojo: { img: 'assets/bg/bg_dojo.jpg', name: 'SAKURA DOJO' },
  rooftop: { img: 'assets/bg/bg_rooftop.jpg', name: 'HAUNTED ROOFTOP' },
};

const MOVES = {
  // chain combos: each press continues the string with a new animation (punch & kick can be mixed)
  punch:    { pose: 'punch',    start: 4,  active: 5,  rec: 9,  dmg: 6,  stun: 18, push: 2,   sfx: 'sfx_punch' },
  punch2:   { pose: 'punch2',   start: 4,  active: 4,  rec: 10, dmg: 6,  stun: 18, push: 1.8, sfx: 'sfx_punch', lunge: 2.6, reach: 54 },
  punch3:   { pose: 'punch3',   start: 5,  active: 5,  rec: 12, dmg: 7,  stun: 19, push: 1.8, sfx: 'sfx_punch', lunge: 2 },
  punch4:   { pose: 'punch4',   start: 7,  active: 6,  rec: 20, dmg: 11, stun: 0,  push: 5,   sfx: 'sfx_kick', knock: true, lunge: 4, finisher: true },
  kick:     { pose: 'kick',     start: 7,  active: 6,  rec: 14, dmg: 9,  stun: 20, push: 2.5, sfx: 'sfx_kick' },
  kick2:    { pose: 'kick2',    start: 5,  active: 5,  rec: 12, dmg: 7,  stun: 19, push: 1.8, sfx: 'sfx_kick', low: true, lunge: 2.6 },
  kick3:    { pose: 'kick3',    start: 6,  active: 6,  rec: 14, dmg: 8,  stun: 20, push: 2,   sfx: 'sfx_kick', lunge: 2 },
  kick4:    { pose: 'kick4',    start: 7,  active: 8,  rec: 18, dmg: 12, stun: 0,  push: 5,   sfx: 'sfx_kick', knock: true, lunge: 3.5, hop: -5.5, finisher: true },
  uppercut: { pose: 'uppercut', start: 3,  active: 14, rec: 18, dmg: 12, stun: 0,  push: 3,   sfx: 'sfx_kick', knock: true, rise: -9.5 },
  special:  { pose: 'special',  start: 13, active: 1,  rec: 24, dmg: 0,  proj: true },
  airpunch: { pose: 'punch',    start: 3,  active: 99, rec: 0,  dmg: 7,  stun: 17, push: 3,   sfx: 'sfx_punch', air: true },
  airkick:  { pose: 'kick',     start: 4,  active: 99, rec: 0,  dmg: 9,  stun: 19, push: 4,   sfx: 'sfx_kick', air: true },
};

// per-character fighting style: tweaks timing/damage of the shared move table
function styledMoves(def) {
  const st = def.style;
  if (!st) return MOVES;
  const out = {};
  for (const [k, m] of Object.entries(MOVES)) {
    const c = { ...m };
    if (!m.proj && !m.air) c.start = Math.max(2, m.start + (st.start || 0));
    if (c.dmg) c.dmg = m.dmg * (st.dmg || 1);
    if (c.push) c.push = m.push * (st.push || 1);
    out[k] = c;
  }
  return out;
}

const Settings = Object.assign({ difficulty: 1, music: 6, sfx: 8, crt: true },
  JSON.parse(localStorage.getItem('ghostfighter_settings') || '{}'));
function saveSettings() {
  localStorage.setItem('ghostfighter_settings', JSON.stringify(Settings));
  Sound.setVolumes(Settings.music / 10, Settings.sfx / 10);
  document.body.classList.toggle('no-crt', !Settings.crt);
}

/* ------------------------------ assets ------------------------------ */
const IMG = {};
const SPR = {};

function loadImage(src) {
  return new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(src); i.src = src; });
}
function whiteVersion(img, color = '#fff') {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
async function loadAssets(progress) {
  const jobs = [];
  let done = 0, total = 0;
  const add = p => { total++; jobs.push(p.then(v => { done++; progress(done / total); return v; })); };
  for (const c of CHARS) {
    SPR[c.id] = {};
    for (const p of [...POSES, ...(c.extra || [])]) {
      add(loadImage(`assets/sprites/${c.id}/${p}.png`).then(img => {
        const m = SPRITE_META[c.id][p];
        let ax = m.ax;
        // recoil pose leans back: anchor on the body centre instead of the head
        if (p === 'hit') ax = m.w * 0.55;
        SPR[c.id][p] = { img, white: whiteVersion(img), glow: whiteVersion(img, c.ult.colors[1]), w: m.w, h: m.h, ax };
      }));
    }
  }
  for (const [k, s] of Object.entries(STAGES)) add(loadImage(s.img).then(i => { IMG[k] = i; }));
  add(loadImage('assets/bg/title.jpg').then(i => { IMG.title = i; }));
  SPR.khufra = {};
  for (const p of KHUFRA_POSES) {
    add(loadImage(`assets/sprites/khufra/${p}.png`).then(img => {
      const m = SPRITE_META.khufra[p];
      SPR.khufra[p] = { img, white: whiteVersion(img), glow: whiteVersion(img, '#ffb400'), w: m.w, h: m.h, ax: m.w / 2 };
    }));
  }
  SPR.cat = {};
  for (const p of CAT_POSES) {
    add(loadImage(`assets/sprites/cat/${p}.png`).then(img => {
      const m = SPRITE_META.cat[p];
      SPR.cat[p] = { img, white: whiteVersion(img), glow: whiteVersion(img, '#9b30ff'), w: m.w, h: m.h, ax: m.w / 2 };
    }));
  }
  for (const c of CHARS) add(loadImage(`assets/cutin/${c.id}.jpg`).then(i => { IMG['cut_' + c.id] = i; }));
  let audioP = 0;
  const audio = Sound.load(p => { audioP = p; });
  await Promise.all(jobs);
  await audio;
}

/* ------------------------------ helpers ------------------------------ */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const overlap = (a, b) => a && b && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
let tick = 0;

function text(str, x, y, { size = 8, color = '#fff', align = 'left', shadow = '#000', outline = false } = {}) {
  ctx.font = `${size}px PS2P, monospace`;
  ctx.textAlign = align; ctx.textBaseline = 'top';
  if (outline) {
    ctx.fillStyle = shadow;
    const o = Math.max(1, Math.round(size / 8));
    for (let dx = -o; dx <= o; dx += o) for (let dy = -o; dy <= o + o; dy += o) ctx.fillText(str, x + dx, y + dy);
  } else if (shadow) {
    ctx.fillStyle = shadow; ctx.fillText(str, x + Math.max(1, size / 8), y + Math.max(1, size / 8));
  }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
function bigText(str, x, y, size, top = '#fff6b0', bottom = '#ff8a00') {
  ctx.font = `${size}px PS2P, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const o = Math.max(2, Math.round(size / 10));
  ctx.fillStyle = '#000';
  for (let dx = -o; dx <= o; dx += o) for (let dy = -o; dy <= o * 2; dy += o) ctx.fillText(str, x + dx, y + dy);
  const g = ctx.createLinearGradient(0, y, 0, y + size);
  g.addColorStop(0, top); g.addColorStop(0.55, top); g.addColorStop(0.56, bottom); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillText(str, x, y);
}
function drawSprite(spr, x, y, facing, { scaleY = 1, scale = 1, white = 0, alpha = 1, glowOnly = false } = {}) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing * scale, scale * scaleY);
  ctx.globalAlpha = alpha;
  if (glowOnly) { ctx.drawImage(spr.glow, -Math.round(spr.ax), -spr.h); ctx.restore(); return; }
  ctx.drawImage(spr.img, -Math.round(spr.ax), -spr.h);
  if (white > 0) { ctx.globalAlpha = alpha * white; ctx.drawImage(spr.white, -Math.round(spr.ax), -spr.h); }
  ctx.restore();
}
function drawPortrait(id, x, y, w, h, { flip = false, dim = false } = {}) {
  const s = SPR[id].idle;
  const sh = s.h * 0.42, sw = sh * (w / h);
  const sx = clamp(s.ax - sw / 2, 0, Math.max(0, s.w - sw));
  ctx.save();
  if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); x = 0; y = 0; }
  ctx.drawImage(s.img, sx, 0, Math.min(sw, s.w), sh, x, y, w, h);
  if (dim) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}
function drawStageBg(key, parallax = 0, dark = 0) {
  const img = IMG[key];
  const bw = 672, bh = 378;
  ctx.drawImage(img, Math.round(-16 + parallax), H - bh, bw, bh);
  if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, W, H); }
}
function stripesBg(c1, c2, speed = 0.5) {
  ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c2;
  const off = (tick * speed) % 40;
  for (let x = -H - 40; x < W + 40; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + off, 0); ctx.lineTo(x + off + 20, 0); ctx.lineTo(x + off + 20 + H, H); ctx.lineTo(x + off + H, H);
    ctx.fill();
  }
}

/* ------------------------------ menu widget ------------------------------ */
class Menu {
  constructor(items, { x = W / 2, y = 200, gap = 20, size = 10 } = {}) {
    this.items = items; this.sel = 0; this.x = x; this.y = y; this.gap = gap; this.size = size;
  }
  label(it) { return typeof it.label === 'function' ? it.label() : it.label; }
  rect(i) {
    ctx.font = `${this.size}px PS2P, monospace`;
    const w = ctx.measureText(this.label(this.items[i])).width + 40;
    return { x0: this.x - w / 2, x1: this.x + w / 2, y0: this.y + i * this.gap - 5, y1: this.y + i * this.gap + this.size + 5 };
  }
  update() {
    const n = this.items.length;
    if (Input.pressed('up')) { this.sel = (this.sel + n - 1) % n; Sound.play('sfx_move', { vol: 0.6 }); }
    if (Input.pressed('down')) { this.sel = (this.sel + 1) % n; Sound.play('sfx_move', { vol: 0.6 }); }
    const it = this.items[this.sel];
    if (it.change) {
      if (Input.pressed('left')) { it.change(-1); Sound.play('sfx_move', { vol: 0.6 }); }
      if (Input.pressed('right')) { it.change(1); Sound.play('sfx_move', { vol: 0.6 }); }
    }
    if (Game.tap) {
      for (let i = 0; i < n; i++) {
        const r = this.rect(i);
        if (Game.tap.x > r.x0 && Game.tap.x < r.x1 && Game.tap.y > r.y0 && Game.tap.y < r.y1) {
          this.sel = i; return this.activate(this.items[i]);
        }
      }
    }
    if (Input.confirm()) return this.activate(it);
  }
  activate(it) {
    if (it.change && !it.action) { it.change(1); Sound.play('sfx_move'); return; }
    Sound.play('sfx_select');
    it.action && it.action();
  }
  draw() {
    this.items.forEach((it, i) => {
      const on = i === this.sel;
      const y = this.y + i * this.gap;
      const lbl = this.label(it);
      if (on) {
        const r = this.rect(i);
        ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.fillRect(r.x0, r.y0 + 2, r.x1 - r.x0, r.y1 - r.y0 - 4);
        const bob = Math.sin(tick * 0.2) * 2;
        text('▶', r.x0 + 6 + bob, y, { size: this.size, color: '#ffd84a' });
      }
      text(lbl, this.x, y, { size: this.size, align: 'center', color: on ? '#ffd84a' : '#fff' });
    });
  }
}

/* ------------------------------ fighters ------------------------------ */
// buttons that travel over the network each frame (start/back stay local)
const NET_ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'special', 'super', 'jump'];
const NET_DELAY = 4; // frames of input delay that hide network latency
const bit = a => 1 << NET_ACTIONS.indexOf(a);
class VPad {
  constructor() { this.cur = 0; this.prev = 0; }
  feed(m) { this.prev = this.cur; this.cur = m; }
  held(a) { return !!(this.cur & bit(a)); }
  pressed(a) { const b = bit(a); return !!(this.cur & b) && !(this.prev & b); }
}

class PlayerCtrl {
  constructor(src = Input) { this.src = src; this.buf = {}; this.queue = []; }
  get() {
    const src = this.src;
    const o = {
      left: src.held('left'), right: src.held('right'), up: src.held('up'), down: src.held('down'),
    };
    for (const a of ['special', 'jump', 'super']) o[a] = this.buf[a] > 0;
    // attacks come from a queue so every mashed tap becomes one hit of the chain
    const next = this.queue[0];
    o.punch = !!next && next.b === 'punch';
    o.kick = !!next && next.b === 'kick';
    return o;
  }
  consume(a) {
    if (a === 'punch' || a === 'kick') { const i = this.queue.findIndex(q => q.b === a); if (i >= 0) this.queue.splice(i, 1); }
    else this.buf[a] = 0;
  }
  // called every frame, even during hit-stop / super freeze, so mashed presses are never dropped
  poll(frozen) {
    for (const a of ['special', 'jump', 'super']) {
      if (this.src.pressed(a)) this.buf[a] = 9;
      else if (!frozen && this.buf[a] > 0) this.buf[a]--;
    }
    for (const b of ['punch', 'kick']) if (this.src.pressed(b) && this.queue.length < 4) this.queue.push({ b, ttl: 24 });
    if (!frozen) { for (const q of this.queue) q.ttl--; this.queue = this.queue.filter(q => q.ttl > 0); }
  }
}

class CpuCtrl {
  constructor(level) { this.lv = clamp(level, 0, 1); this.plan = null; this.think = 30; this.seen = new Set(); }
  consume() {}
  get(me, opp, g) {
    const o = { left: false, right: false, up: false, down: false, punch: false, kick: false, special: false, jump: false, super: false };
    if (g.phase !== 'fight' || me.state === 'ko') return o;
    const dist = Math.abs(opp.x - me.x);
    const lv = this.lv;

    // ---- reactive layer (each event judged once) ----
    if (opp.state === 'attack' && opp.moveId && !this.seen.has(opp.moveId) && dist < 150) {
      this.seen.add(opp.moveId);
      if (Math.random() < 0.12 + 0.6 * lv) this.plan = { hold: ['back'], t: 24 };
    }
    for (const p of g.projectiles) {
      if (p.owner === opp && !this.seen.has(p.id) && Math.abs(p.x - me.x) < 220) {
        this.seen.add(p.id);
        const r = Math.random();
        if (r < 0.25 + 0.35 * lv) this.plan = { hold: ['fwd', 'up'], t: 3 };
        else if (r < 0.3 + 0.6 * lv) this.plan = { hold: ['back'], t: 40 };
      }
    }
    if (opp.state === 'air' && opp.jumpId && !this.seen.has(opp.jumpId) && dist < 130) {
      this.seen.add(opp.jumpId);
      if (Math.random() < 0.08 + 0.55 * lv) this.plan = { hold: ['down'], tap: 'punch', delay: Math.round(lerp(10, 4, lv)), t: 16 };
    }
    if (opp.state === 'super' && !this.seen.has(opp.superId)) {
      this.seen.add(opp.superId);
      if (Math.random() < 0.15 + 0.55 * lv) this.plan = { hold: ['back'], t: 90 };
    }
    if (me.meter >= 100 && me.canAct() && opp.state !== 'down' && opp.state !== 'knock') {
      const type = me.def.ult.type;
      const inRange = type === 'beam' || type === 'summon' || type === 'khufra' || (type === 'rush' ? dist < 300 : dist < 250);
      if (inRange && Math.random() < 0.012 + 0.035 * lv) o.super = true;
    }
    if (me.state === 'air' && !me.airMove && dist < 95 && Math.random() < 0.08) o[Math.random() < 0.5 ? 'kick' : 'punch'] = true;

    // ---- planning layer ----
    if (!this.plan && --this.think <= 0) {
      this.think = Math.round(lerp(26, 6, lv) + rand(0, 10));
      this.plan = this.decide(me, opp, dist);
    }
    const p = this.plan;
    if (p) {
      const fwd = me.facing === 1 ? 'right' : 'left', back = me.facing === 1 ? 'left' : 'right';
      for (const k of p.hold || []) o[k === 'fwd' ? fwd : k === 'back' ? back : k] = true;
      if (p.tap) {
        if (p.delay > 0) p.delay--;
        else if (!p.done) { o[p.tap] = true; p.done = true; }
      }
      if (p.chain) {
        const ready = p.ci === 0 ? me.canAct()
          : me.state === 'attack' && me.chainStep === p.ci &&
            (me.hasHit || me.timer >= me.move.start + me.move.active) && me.timer >= me.move.start + p.wait;
        if (ready && p.ci < p.chain.length) { o[p.chain[p.ci]] = true; p.ci++; }
        if (p.ci >= p.chain.length && me.state !== 'attack') p.t = 0;
      }
      if (--p.t <= 0) this.plan = null;
    }
    return o;
  }
  combo() {
    const len = clamp(Math.round(1 + this.lv * 3 * Math.random() + Math.random()), 1, 4);
    const first = Math.random() < 0.5 ? 'punch' : 'kick';
    const chain = [first];
    for (let i = 1; i < len; i++) chain.push(Math.random() < 0.7 ? chain[i - 1] : (chain[i - 1] === 'punch' ? 'kick' : 'punch'));
    return { chain, ci: 0, wait: Math.round(rand(0, 4)), t: 90 };
  }
  decide(me, opp, dist) {
    const r = Math.random(), lv = this.lv;
    if (r < 0.22 * (1 - lv)) return { t: rand(10, 30) }; // hesitate (easier CPUs)
    if (dist > 230) {
      if (me.specialCd === 0 && r < 0.45) return { tap: 'special', t: 4 };
      if (r < 0.6) return { hold: ['fwd', 'up'], t: 3 };
      return { hold: ['fwd'], t: rand(20, 40) };
    }
    if (dist > 115) {
      if (me.specialCd === 0 && r < 0.25) return { tap: 'special', t: 4 };
      if (r < 0.45) return { hold: ['fwd', 'up'], t: 3 };
      return { hold: ['fwd'], t: rand(12, 25) };
    }
    if (dist > 68) {
      if (r < 0.25) return { tap: 'kick', t: 4 };
      if (r < 0.42) return this.combo();
      if (r < 0.55) return { hold: ['back'], t: rand(8, 16) };
      if (r < 0.62 && me.specialCd === 0) return { tap: 'special', t: 4 };
      return { hold: ['fwd'], t: rand(6, 14) };
    }
    if (r < 0.5) return this.combo();
    if (r < 0.6) return { hold: ['down'], tap: 'punch', t: 4 };
    if (r < 0.72) return { tap: 'kick', t: 4 };
    if (r < 0.85) return { hold: ['back'], t: rand(10, 18) };
    return { hold: ['back', 'down'], t: 20 };
  }
}

let uid = 1;
class Fighter {
  constructor(def, side, ctrl) {
    this.def = def; this.spr = SPR[def.id]; this.ctrl = ctrl; this.side = side;
    this.moves = styledMoves(def);
    this.wins = 0;
    this.meter = 0; // super meter carries over between rounds
    this.reset();
  }
  reset() {
    this.x = this.side === 0 ? 210 : 430; this.y = GROUND; this.vx = 0; this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.maxHp = this.def.hp; this.hp = this.maxHp; this.dispHp = this.maxHp;
    this.state = 'intro'; this.timer = 0; this.move = null; this.pose = 'idle';
    this.flash = 0; this.specialCd = 0; this.walkT = 0; this.invuln = 0; this.combo = 0;
    this.blocking = false; this.airMove = null; this.hasHit = false;
    this.sub = null; this.trail = []; this.superHits = 0; this.auraT = 0; this.chainStep = 0; this.rot = 0;
  }
  gainMeter(v) { this.meter = clamp(this.meter + v, 0, 100); }
  get frame() { return this.spr[this.pose]; }
  get grounded() { return this.y >= GROUND && this.vy >= 0; }
  canAct() { return this.state === 'stand' || this.state === 'crouch'; }

  hurtbox() {
    if (this.state === 'down' || this.state === 'ko' || this.state === 'held' || this.invuln > 0) return null;
    const f = this.frame, bw = this.spr.idle.w * 0.42;
    return { x0: this.x - bw / 2, x1: this.x + bw / 2, y0: this.y - f.h * 0.94, y1: this.y };
  }
  hitbox() {
    const m = this.move;
    if (!m || m.proj || this.hasHit) return null;
    if (this.state !== 'attack' && !(this.state === 'air' && this.airMove)) return null;
    const t = this.timer;
    if (t < m.start || t >= m.start + m.active) return null;
    const f = this.frame;
    const front = Math.max(f.w - f.ax, m.reach || 38);
    const a = this.x + this.facing * front * 0.35, b = this.x + this.facing * front;
    const y0 = this.y - f.h * (m.pose === 'uppercut' ? 1 : 0.95);
    const y1 = this.y - f.h * (m.air || m.low ? 0.02 : 0.38);
    return { x0: Math.min(a, b), x1: Math.max(a, b), y0, y1 };
  }

  startMove(name) {
    const m = this.moves[name];
    this.move = m; this.moveId = uid++; this.timer = 0; this.hasHit = false;
    this.pose = m.pose; this.chainStep = 0;
    if (m.air) { this.airMove = m; return; }
    this.state = 'attack';
    this.vx = 0;
    if (name !== 'special') Sound.play('sfx_whoosh', { vol: 0.45, rate: rand(0.9, 1.15) });
  }

  update(opp, g) {
    const inp = g.phase === 'fight' ? this.ctrl.get(this, opp, g) : {};
    if (this.specialCd > 0) this.specialCd--;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    const fwdHeld = this.facing === 1 ? inp.right : inp.left;
    const backHeld = this.facing === 1 ? inp.left : inp.right;
    const spd = this.def.spd;
    this.blocking = false;
    const threatened = opp.state === 'attack' || (opp.state === 'air' && opp.airMove) ||
      g.projectiles.some(p => p.owner === opp && Math.abs(p.x - this.x) < 160);

    switch (this.state) {
      case 'intro': case 'idle-lock':
        this.pose = 'idle'; this.vx = 0; break;

      case 'stand': case 'crouch': {
        this.facing = opp.x >= this.x ? 1 : -1;
        if (inp.super && this.meter >= 100) { this.ctrl.consume('super'); this.startSuper(g); break; }
        if (inp.punch && inp.down) { this.ctrl.consume('punch'); this.startMove('uppercut'); break; }
        if (inp.special && this.specialCd === 0) { this.ctrl.consume('special'); this.startMove('special'); break; }
        if (inp.punch) { this.ctrl.consume('punch'); this.startMove('punch'); this.chainStep = 1; break; }
        if (inp.kick) { this.ctrl.consume('kick'); this.startMove('kick'); this.chainStep = 1; break; }
        if (inp.up || inp.jump) {
          this.ctrl.consume('jump');
          this.state = 'air'; this.vy = -11.3; this.airMove = null; this.jumpId = uid++;
          this.vx = (fwdHeld ? 1 : backHeld ? -1 : 0) * this.facing * 3.3 * spd;
          this.pose = 'jump';
          Sound.play('sfx_jump', { vol: 0.5 });
          break;
        }
        if (inp.down) {
          this.state = 'crouch'; this.vx = 0; this.walkT = 0;
          this.blocking = backHeld;
          this.pose = 'crouch';
          break;
        }
        this.state = 'stand';
        if (fwdHeld) {
          this.vx = this.facing * 2.3 * spd; this.walkT++;
          this.pose = Math.floor(this.walkT / 9) % 2 ? 'walk' : 'idle';
        } else if (backHeld) {
          this.vx = -this.facing * 1.8 * spd; this.walkT++;
          this.blocking = true;
          this.pose = threatened ? 'block' : (Math.floor(this.walkT / 11) % 2 ? 'walk' : 'idle');
        } else { this.vx = 0; this.walkT = 0; this.pose = 'idle'; }
        break;
      }

      case 'air': {
        if (!this.airMove && (inp.punch || inp.kick)) {
          const k = inp.kick ? 'kick' : 'punch';
          this.ctrl.consume(k);
          this.startMove(k === 'kick' ? 'airkick' : 'airpunch');
          Sound.play('sfx_whoosh', { vol: 0.4 });
        }
        if (this.airMove) this.timer++;
        else this.pose = 'jump';
        break;
      }

      case 'attack': {
        this.timer++;
        const m = this.move;
        if (!m) { this.state = 'stand'; this.pose = 'idle'; this.chainStep = 0; break; }
        // chain combo: once the current hit is out, the next press continues the string
        if (this.chainStep && (this.hasHit || this.timer >= m.start + m.active)) {
          if (this.hasHit && inp.super && this.meter >= 100) { this.ctrl.consume('super'); this.startSuper(g); break; }
          if (this.hasHit && inp.special && this.specialCd === 0) { this.ctrl.consume('special'); this.startMove('special'); break; }
          if (this.hasHit && inp.punch && inp.down) { this.ctrl.consume('punch'); this.startMove('uppercut'); break; }
          if (this.chainStep < 4 && (inp.punch || inp.kick)) {
            const b = inp.kick ? 'kick' : 'punch';
            const next = this.chainStep + 1;
            this.ctrl.consume(b);
            this.startMove(b + next);
            this.chainStep = next;
            break;
          }
        }
        if (m.rise && this.timer === m.start) { this.vy = m.rise; this.vx = this.facing * 1.6; }
        if (m.hop && this.timer === m.start - 2) { this.vy = m.hop; }
        if (m.proj && this.timer === m.start) g.spawnProjectile(this);
        if (m.lunge && this.timer <= m.start + 2) this.vx = this.facing * m.lunge;
        else if (this.timer < 3) this.vx = this.facing * 0.8; else if (this.grounded) this.vx *= 0.7;
        if (this.timer >= m.start + m.active + m.rec && this.grounded) { this.state = 'stand'; this.move = null; this.pose = 'idle'; this.chainStep = 0; }
        break;
      }

      case 'hitstun': case 'blockstun':
        this.pose = this.state === 'hitstun' ? 'hit' : (this.pose === 'crouch' ? 'crouch' : 'block');
        this.vx *= 0.82;
        if (--this.timer <= 0) { this.state = 'stand'; this.pose = 'idle'; this.combo = 0; }
        break;

      case 'knock':
        this.pose = 'hit';
        break;

      case 'down':
        this.pose = 'ko'; this.vx *= 0.8;
        if (--this.timer <= 0) {
          if (this.hp > 0) { this.state = 'stand'; this.pose = 'crouch'; this.invuln = 30; this.combo = 0; }
          else this.state = 'ko';
        }
        break;

      case 'super': this.updateSuper(opp, g); break;
      case 'held': break; // carried by a grab - position is driven by the grabber
      case 'ko': this.pose = 'ko'; this.vx *= 0.8; break;
      case 'win': this.pose = 'win'; this.vx = 0; break;
    }

    // physics
    if (this.state !== 'held') this.x += this.vx;
    if (this.state !== 'held' && (this.y < GROUND || this.vy < 0)) {
      this.vy += GRAV; this.y += this.vy;
      if (this.y >= GROUND) {
        this.y = GROUND; this.vy = 0;
        this.onLand(g);
      }
    }
    this.x = clamp(this.x, 28, W - 28);
    this.dispHp += (this.hp - this.dispHp) * 0.06;
    if (Math.abs(this.dispHp - this.hp) < 0.3) this.dispHp = this.hp;
  }

  onLand(g) {
    if (this.state === 'air') {
      this.state = 'stand'; this.airMove = null; this.move = null; this.pose = 'crouch'; this.vx = 0;
      g.dust(this.x, 4);
    } else if (this.state === 'knock') {
      this.state = 'down'; this.timer = this.hp > 0 ? 42 : 9999; this.pose = 'ko';
      Sound.play('sfx_land', { vol: 0.9 });
      g.dust(this.x, 10); g.shake = Math.max(g.shake, 5);
    } else if (this.state === 'attack' && this.move && this.move.rise) {
      this.vx = 0;
    } else if (this.state === 'super' && this.sub === 'meteor') {
      this.sub = 'slam'; this.timer = 0; this.vx = 0;
      g.quakeSlam(this);
    } else if (this.state === 'super' && this.sub === 'finish') {
      this.endSuper();
    }
  }

  /* ---------------- ultimates ---------------- */
  startSuper(g) {
    this.meter = 0; this.state = 'super'; this.timer = 0; this.move = null; this.vx = 0;
    this.sub = 'charge'; this.superHits = 0; this.superId = uid++; this.trail = [];
    this.pose = 'superup';
    g.beginSuper(this);
  }
  endSuper() { this.state = 'stand'; this.pose = 'idle'; this.sub = null; this.vx = 0; this.trail = []; }
  updateSuper(opp, g) {
    const type = this.def.ult.type;
    const t = ++this.timer;
    if (type === 'beam') {
      if (this.sub === 'charge') {
        this.pose = 'supercharge'; this.invuln = 2;
        g.chargeOrb(this);
        if (t >= 24) { this.sub = 'fire'; this.timer = 0; this.pose = 'special'; g.fireBeam(this); }
      } else if (t > 76) this.endSuper();
    } else if (type === 'rush') {
      if (this.sub === 'charge') {
        this.pose = 'supercharge'; this.invuln = 2;
        if (t >= 10) { this.sub = 'dash'; this.timer = 0; Sound.play('sfx_thunder', { vol: 0.8 }); }
      } else if (this.sub === 'dash') {
        this.pose = 'kick'; this.vx = this.facing * 10; this.invuln = 2;
        if (t % 2 === 0) this.trail.push({ x: this.x, y: this.y, pose: this.pose, life: 12 });
        const body = { x0: this.x - 20, x1: this.x + 20 + this.facing * 30, y0: this.y - 120, y1: this.y };
        if (body.x0 > body.x1) [body.x0, body.x1] = [body.x1, body.x0];
        if (overlap(body, opp.hurtbox())) {
          this.vx = 0; this.timer = 0;
          if (g.superHit(this, opp, 4, false)) { this.sub = 'combo'; Sound.play('sfx_rush'); }
          else this.sub = 'whiff';
        } else if (t > 34) { this.sub = 'whiff'; this.timer = 0; }
      } else if (this.sub === 'combo') {
        this.vx = 0;
        this.x += ((opp.x - this.facing * 44) - this.x) * 0.5;
        opp.state = 'hitstun'; opp.timer = 30; opp.vx = 0;
        this.pose = Math.floor(t / 5) % 2 ? 'kick' : 'punch';
        if (t % 5 === 0) {
          this.superHits++;
          if (this.superHits % 3 === 0) { g.thunderBolt(opp.x); Sound.play('sfx_thunder', { vol: 0.7 }); }
          if (this.superHits < 9) g.superHit(this, opp, 3, false);
          else {
            this.sub = 'finish'; this.pose = 'uppercut'; this.vy = -9; this.vx = this.facing * 1.5;
            g.thunderBolt(opp.x); Sound.play('sfx_thunder');
            g.superHit(this, opp, 9, true);
          }
        }
      } else if (this.sub === 'finish') {
        this.pose = 'uppercut';
      } else { // whiff
        this.vx *= 0.75; this.pose = 'crouch';
        if (t > 22) this.endSuper();
      }
    } else if (type === 'khufra') {
      if (this.sub === 'charge') {
        this.pose = 'supercharge'; this.invuln = 2;
        if (t >= 12) { this.sub = 'command'; this.timer = 0; g.summonKhufra(this, opp); }
      } else {
        this.pose = t < 40 ? 'superup' : 'win';
        const k = g.khufras.find(c => c.owner === this);
        if (!k || k.phase === 'leave' || t > 320) this.endSuper();
      }
    } else if (type === 'summon') {
      if (this.sub === 'charge') {
        this.pose = 'supercharge'; this.invuln = 2;
        if (t >= 14) { this.sub = 'command'; this.timer = 0; g.summonCat(this, opp); }
      } else {
        // Ryona keeps commanding while her cat does the work
        this.pose = 'superup';
        const cat = g.cats.find(c => c.owner === this);
        if (!cat || cat.phase === 'exit' || t > 200) this.endSuper();
      }
    } else if (type === 'quake') {
      if (this.sub === 'charge') {
        this.pose = 'supercharge'; this.invuln = 2;
        if (t >= 12) {
          this.sub = 'meteor'; this.vy = -13.5;
          const flight = 2 * 13.5 / GRAV;
          this.vx = clamp((opp.x - this.x) / flight, -6.5, 6.5);
          Sound.play('sfx_jump');
        }
      } else if (this.sub === 'meteor') {
        this.pose = this.vy < 0 ? 'uppercut' : 'jump'; this.invuln = 2;
        if (t % 2 === 0) this.trail.push({ x: this.x, y: this.y, pose: this.pose, life: 10 });
      } else if (this.sub === 'slam') {
        this.pose = 'crouch';
        if (t > 32) this.endSuper();
      }
    }
    for (const tr of this.trail) tr.life--;
    this.trail = this.trail.filter(tr => tr.life > 0);
  }

  knockdown(dir) {
    this.rot = 0;
    this.state = 'knock'; this.vy = -6.5; this.vx = dir * 3.2; this.move = null; this.airMove = null;
    this.y = Math.min(this.y, GROUND - 1);
  }

  draw() {
    const f = this.frame;
    // shadow
    const air = clamp((GROUND - this.y) / 120, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.35 - air * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(this.x, GROUND + 1, this.spr.idle.w * 0.42 * (1 - air * 0.4), 5, 0, 0, Math.PI * 2);
    ctx.fill();

    let scaleY = 1, ox = 0;
    if (this.pose === 'idle' && this.state !== 'ko') scaleY = 1 + Math.sin(tick * 0.09 + this.side * 2) * 0.012;
    if (this.state === 'hitstun' && this.timer > 10) ox = (tick % 2 ? 2 : -2);
    const blink = this.invuln > 0 && this.state !== 'super' && tick % 4 < 2;
    // after-images (rush / meteor)
    for (const tr of this.trail) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      drawSprite(this.spr[tr.pose], tr.x, tr.y, this.facing, { glowOnly: true, alpha: tr.life / 14 });
      ctx.restore();
    }
    // super aura
    if (this.state === 'super' || this.auraT > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        drawSprite(f, this.x + rand(-3, 3), this.y + rand(-2, 1), this.facing, { glowOnly: true, alpha: 0.35, scale: 1.04 + i * 0.03 });
      }
      ctx.restore();
    }
    if (this.def.boss) {
      // ghostly after-image for the boss
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      drawSprite(f, this.x - this.facing * 4 + Math.sin(tick * 0.1) * 2, this.y, this.facing, { scaleY, alpha: 0.18 });
      ctx.restore();
    }
    if (this.rot) {
      const cy = this.y - f.h / 2;
      ctx.save(); ctx.translate(this.x, cy); ctx.rotate(this.rot); ctx.translate(-this.x, -cy);
    }
    drawSprite(f, this.x + ox, this.y, this.facing, { scaleY, white: this.flash > 0 ? 0.85 : 0, alpha: blink ? 0.4 : 1 });
    if (this.rot) ctx.restore();
  }
}

/* ------------------------------ scenes ------------------------------ */
const Game = { scene: null, tap: null, run: null };
function go(scene) {
  document.body.classList.remove('super-ready');
  Game.scene = scene; scene.enter && scene.enter();
}

class LoadScene {
  constructor() { this.p = 0; this.ready = false; }
  enter() {
    Promise.all([document.fonts.load('8px PS2P').catch(() => {}),
      loadAssets(p => { this.p = p; })]).then(() => { this.ready = true; })
      .catch(err => { this.err = String(err); });
  }
  update() { if (this.ready) go(new PressStartScene()); }
  draw() {
    ctx.fillStyle = '#07060f'; ctx.fillRect(0, 0, W, H);
    text('LOADING', W / 2, 150, { size: 12, align: 'center' });
    ctx.fillStyle = '#333'; ctx.fillRect(170, 175, 300, 12);
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(172, 177, 296 * this.p, 8);
    if (this.err) text('FAILED: ' + this.err, W / 2, 210, { size: 6, align: 'center', color: '#f55' });
  }
}

function drawLogo(y) {
  const s = 1 + Math.sin(tick * 0.05) * 0.02;
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(s, s);
  bigText('GHOST', 0, -2, 40, '#e8f4ff', '#3d8bff');
  bigText('FIGHTER', 0, 42, 30, '#fff6b0', '#ff5a00');
  ctx.restore();
}

class PressStartScene {
  enter() { this.t = 0; }
  update() {
    this.t++;
    if (Input.anyPressed() || Game.tap) {
      Sound.unlock();
      if (Input.isTouch) { Input.toggleFullscreen(true); Input.guideOnce(); }
      Sound.play('sfx_select');
      Sound.play('vo_title', { vol: 1 });
      saveSettings();
      Sound.playMusic('music_title', true);
      const invite = new URLSearchParams(location.search).get('room');
      if (invite) { history.replaceState(null, '', location.pathname); go(new OnlineMenuScene('join', invite)); }
      else go(new TitleScene());
    }
  }
  draw() {
    ctx.drawImage(IMG.title, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,10,.25)'; ctx.fillRect(0, 0, W, H);
    drawLogo(18);
    if (Math.floor(this.t / 30) % 2 === 0)
      text(Input.isTouch ? 'TAP TO START' : 'PRESS ANY KEY', W / 2, 300, { size: 12, align: 'center', color: '#ffd84a', outline: true });
    text('© 2026 GHOST FIGHTER  ·  16-BIT EDITION', W / 2, 344, { size: 6, align: 'center', color: '#aab' });
  }
}

class TitleScene {
  enter() {
    Sound.playMusic('music_title');
    this.menu = new Menu([
      { label: 'ARCADE', action: () => go(new SelectScene('arcade')) },
      { label: 'VERSUS CPU', action: () => go(new SelectScene('versus')) },
      { label: 'ONLINE', action: () => go(new OnlineMenuScene()) },
      { label: 'HOW TO PLAY', action: () => go(new HowToScene()) },
      { label: 'OPTIONS', action: () => go(new OptionsScene()) },
    ], { x: 530, y: 212, gap: 22, size: 10 });
  }
  update() { this.menu.update(); }
  draw() {
    ctx.drawImage(IMG.title, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,10,.45)'; ctx.fillRect(0, 0, W, H);
    drawLogo(18);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(430, 198, 200, 118);
    this.menu.draw();
  }
}

class OptionsScene {
  enter() {
    const DIFF = ['EASY', 'NORMAL', 'HARD'];
    const bar = v => '■'.repeat(v) + '□'.repeat(10 - v);
    this.menu = new Menu([
      { label: () => `DIFFICULTY  ${DIFF[Settings.difficulty]}`, change: d => { Settings.difficulty = (Settings.difficulty + d + 3) % 3; saveSettings(); } },
      { label: () => `MUSIC ${bar(Settings.music)}`, change: d => { Settings.music = clamp(Settings.music + d, 0, 10); saveSettings(); } },
      { label: () => `SFX   ${bar(Settings.sfx)}`, change: d => { Settings.sfx = clamp(Settings.sfx + d, 0, 10); saveSettings(); Sound.play('sfx_punch'); } },
      { label: () => `CRT FILTER  ${Settings.crt ? 'ON' : 'OFF'}`, change: () => { Settings.crt = !Settings.crt; saveSettings(); } },
      { label: 'BACK', action: () => go(new TitleScene()) },
    ], { y: 120, gap: 26, size: 10 });
    // tap on volume rows cycles up and wraps, so taps alone can reach every value
    this.menu.items[1].change = d => { Settings.music = d > 0 && Settings.music === 10 && Game.tap ? 0 : clamp(Settings.music + d, 0, 10); saveSettings(); };
    this.menu.items[2].change = d => { Settings.sfx = d > 0 && Settings.sfx === 10 && Game.tap ? 0 : clamp(Settings.sfx + d, 0, 10); saveSettings(); Sound.play('sfx_punch'); };
  }
  update() { if (Input.cancel()) { Sound.play('sfx_select'); return go(new TitleScene()); } this.menu.update(); }
  draw() {
    stripesBg('#120c2a', '#1a1238');
    bigText('OPTIONS', W / 2, 50, 24);
    this.menu.draw();
    text('◀ ▶ CHANGE    ' + (Input.isTouch ? 'TAP TO CYCLE' : 'ESC BACK'), W / 2, 320, { size: 6, align: 'center', color: '#99a' });
  }
}

class HowToScene {
  update() { if (Input.confirm() || Input.cancel() || Game.tap) { Sound.play('sfx_select'); go(new TitleScene()); } }
  draw() {
    stripesBg('#120c2a', '#1a1238');
    bigText('HOW TO PLAY', W / 2, 20, 20);
    const rows = [
      ['MOVE / BLOCK', '← →  (HOLD BACK TO BLOCK)', 'STICK'],
      ['JUMP', '↑  OR  SPACE', '△ / STICK UP'],
      ['CROUCH', '↓', 'STICK DOWN'],
      ['PUNCH', 'J  OR  Z', '□'],
      ['KICK', 'K  OR  X', '✕'],
      ['ENERGY BLAST', 'L  OR  C', '○'],
      ['RISING UPPERCUT', '↓ + PUNCH', 'DOWN + □'],
      ['4-HIT COMBO', 'TAP J / K  UP TO 4X', 'TAP □ / ✕  UP TO 4X'],
      ['AIR ATTACK', 'PUNCH/KICK IN AIR', '□ / ✕ IN AIR'],
      ['ULTIMATE (MAX METER)', 'I  OR  V', 'SUPER BUTTON'],
      ['PAUSE', 'ENTER  /  ESC', '❚❚'],
    ];
    text('ACTION', 40, 64, { size: 7, color: '#ffd84a' });
    text('KEYBOARD', 210, 64, { size: 7, color: '#ffd84a' });
    text('TOUCH', 470, 64, { size: 7, color: '#ffd84a' });
    rows.forEach((r, i) => {
      const y = 80 + i * 19;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; ctx.fillRect(30, y - 5, 580, 17);
      text(r[0], 40, y, { size: 7 });
      text(r[1], 210, y, { size: 7, color: '#bde' });
      text(r[2], 470, y, { size: 7, color: '#bde' });
    });
    text('GAMEPADS WORK TOO.  WIN 2 ROUNDS TO TAKE THE MATCH!', W / 2, 302, { size: 6, align: 'center', color: '#aab' });
    if (tick % 60 < 40) text('PRESS ANY BUTTON', W / 2, 322, { size: 8, align: 'center', color: '#ffd84a' });
  }
}

class SelectScene {
  constructor(mode) { this.mode = mode; }
  enter() {
    Sound.playMusic('music_select');
    this.phase = 0; // 0 = choose player, 1 = choose CPU (versus)
    this.cur = 0; this.p1 = null; this.cpu = 1; this.t = 0; this.lockT = 0;
  }
  slots() {
    const n = CHARS.length, size = 64, gap = 12;
    const total = n * size + (n - 1) * gap, x0 = (W - total) / 2;
    return CHARS.map((c, i) => ({ c, x: x0 + i * (size + gap), y: 262, w: size, h: size }));
  }
  update() {
    this.t++;
    if (this.lockT) {
      if (--this.lockT === 0) this.finish();
      return;
    }
    const n = CHARS.length;
    let c = this.phase === 0 ? this.cur : this.cpu;
    if (Input.pressed('left')) { c = (c + n - 1) % n; Sound.play('sfx_move', { vol: 0.6 }); }
    if (Input.pressed('right')) { c = (c + 1) % n; Sound.play('sfx_move', { vol: 0.6 }); }
    let picked = Input.confirm();
    if (Game.tap) {
      for (const [i, s] of this.slots().entries()) {
        if (Game.tap.x > s.x && Game.tap.x < s.x + s.w && Game.tap.y > s.y && Game.tap.y < s.y + s.h) {
          if (c === i) picked = true; else { c = i; Sound.play('sfx_move', { vol: 0.6 }); }
        }
      }
    }
    if (this.phase === 0) this.cur = c; else this.cpu = c;
    if (Input.cancel()) {
      Sound.play('sfx_select');
      if (this.phase === 1) { this.phase = 0; this.p1 = null; } else go(new TitleScene());
      return;
    }
    if (picked) {
      Sound.play('sfx_select');
      Sound.play('sfx_punch', { vol: 0.7 });
      if (this.phase === 0) {
        this.p1 = CHARS[this.cur];
        if (this.mode === 'versus') { this.phase = 1; this.cpu = (this.cur + 1) % n; }
        else this.lockT = 50;
      } else this.lockT = 50;
    }
  }
  finish() {
    if (this.mode === 'arcade') {
      const others = CHARS.filter(c => c !== this.p1 && !c.boss).sort(() => Math.random() - 0.5);
      const boss = this.p1.boss ? CHAR.hero : CHAR.shade;
      Game.run = { mode: 'arcade', p1: this.p1, ladder: [...others.filter(c => c !== boss), boss], stage: 0 };
    } else {
      Game.run = { mode: 'versus', p1: this.p1, ladder: [CHARS[this.cpu]], stage: 0 };
    }
    go(new VsScene());
  }
  draw() {
    stripesBg('#0e0a24', '#171037', 0.6);
    bigText(this.phase === 0 ? 'SELECT YOUR FIGHTER' : 'SELECT OPPONENT', W / 2, 12, 16);
    const show = CHARS[this.cur];
    // player side
    this.drawBig(show, 130, 1, this.phase === 0 ? '#3d8bff' : '#3d8bff', 'P1');
    if (this.mode === 'versus' && this.phase === 1) this.drawBig(CHARS[this.cpu], 510, -1, '#ff3d3d', 'CPU');
    else if (this.mode === 'arcade') {
      text('ARCADE MODE', 510, 120, { size: 8, align: 'center', color: '#ffd84a' });
      text('DEFEAT EVERY', 510, 140, { size: 7, align: 'center' });
      text('CHALLENGER AND', 510, 154, { size: 7, align: 'center' });
      text('FACE THE GHOST', 510, 168, { size: 7, align: 'center' });
      text('OF THE ROOFTOPS', 510, 182, { size: 7, align: 'center' });
    }
    // grid
    for (const [i, s] of this.slots().entries()) {
      const p1here = this.cur === i, cpuhere = this.phase === 1 && this.cpu === i;
      ctx.fillStyle = '#05040c'; ctx.fillRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
      const grad = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
      grad.addColorStop(0, '#2a2560'); grad.addColorStop(1, '#0b0920');
      ctx.fillStyle = grad; ctx.fillRect(s.x, s.y, s.w, s.h);
      drawPortrait(s.c.id, s.x, s.y, s.w, s.h, { dim: !p1here && !cpuhere });
      const blinkOn = tick % 16 < 11 || this.lockT;
      if (p1here && blinkOn) { ctx.strokeStyle = '#3d8bff'; ctx.lineWidth = 3; ctx.strokeRect(s.x - 1.5, s.y - 1.5, s.w + 3, s.h + 3); text('1P', s.x + 2, s.y + 2, { size: 6, color: '#7cb4ff' }); }
      if (cpuhere && blinkOn) { ctx.strokeStyle = '#ff3d3d'; ctx.lineWidth = 3; ctx.strokeRect(s.x + 1.5, s.y + 1.5, s.w - 3, s.h - 3); text('CPU', s.x + s.w - 2, s.y + s.h - 9, { size: 6, color: '#ff8080', align: 'right' }); }
      text(s.c.name, s.x + s.w / 2, s.y + s.h + 5, { size: 6, align: 'center', color: p1here || cpuhere ? '#ffd84a' : '#889' });
    }
    if (this.lockT && tick % 8 < 4) { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, 0, W, H); }
  }
  drawBig(c, x, facing, color, tag) {
    const s = SPR[c.id][this.lockT && ((tag === 'P1' && this.phase === 0) || tag === 'CPU' || this.mode === 'arcade') ? 'win' : 'idle'];
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(x, 248, 44, 6, 0, 0, Math.PI * 2); ctx.fill();
    drawSprite(s, x, 248, facing, { scaleY: 1 + Math.sin(tick * 0.09) * 0.012, scale: 1.0 });
    text(c.name, x, 38, { size: 14, align: 'center', color: '#fff', outline: true, shadow: color });
    text(c.title, x, 58, { size: 6, align: 'center', color: '#ffd84a' });
    const labels = ['POWER', 'SPEED', 'SPECIAL'];
    c.stats.forEach((v, i) => {
      const yy = 72 + i * 9;
      text(labels[i], x - 60, yy, { size: 5, color: '#bbc' });
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k < v ? color : '#333'; ctx.fillRect(x + 4 + k * 11, yy, 9, 5); }
    });
  }
}

class VsScene {
  enter() {
    const r = Game.run;
    this.p1 = r.p1; this.p2 = r.ladder[r.stage]; this.t = 0;
    Sound.playMusic(null);
    Sound.play('sfx_explode', { vol: 0.7 });
  }
  update() {
    this.t++;
    const online = Game.run.mode === 'online';
    if (this.t > 170 || (!online && this.t > 40 && Input.confirm())) go(new FightScene());
  }
  draw() {
    const t = this.t, slide = Math.max(0, 1 - t / 20);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // diagonal split
    ctx.fillStyle = '#123a9a';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W / 2 + 40, 0); ctx.lineTo(W / 2 - 40, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#8a1212';
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W / 2 + 40, 0); ctx.lineTo(W / 2 - 40, H); ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(W / 2 + 40, 0); ctx.lineTo(W / 2 - 40, H); ctx.stroke();
    // speed lines
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i < 12; i++) { const y = (i * 37 + t * 9) % H; ctx.fillRect(0, y, W, 2); }
    drawSprite(SPR[this.p1.id].idle, 150 - slide * 300, 320, 1, { scale: 1.6 });
    drawSprite(SPR[this.p2.id].idle, 490 + slide * 300, 320, -1, { scale: 1.6 });
    text(this.p1.name, 40 - slide * 300, 30, { size: 16, color: '#fff', outline: true, shadow: '#000' });
    text(this.p2.name, W - 40 + slide * 300, 30, { size: 16, color: '#fff', align: 'right', outline: true, shadow: '#000' });
    text(this.p1.from, 40 - slide * 300, 52, { size: 6, color: '#9cf' });
    text(this.p2.from, W - 40 + slide * 300, 52, { size: 6, color: '#f99', align: 'right' });
    if (t > 18) {
      const s = t < 30 ? 3 - (t - 18) / 6 : 1 + Math.sin(t * 0.3) * 0.04;
      ctx.save(); ctx.translate(W / 2, H / 2 - 28); ctx.scale(s, s);
      bigText('VS', 0, 0, 44, '#fff6b0', '#ff3d00');
      ctx.restore();
    }
    const r = Game.run;
    if (r.mode === 'online') text(`ONLINE MATCH  ·  ROOM ${Net.code}`, W / 2, 334, { size: 8, align: 'center', color: '#7cff9a', outline: true });
    if (r.mode === 'arcade') text(this.p2.boss || r.stage === r.ladder.length - 1 ? 'FINAL BATTLE' : `STAGE ${r.stage + 1}`, W / 2, 334, { size: 8, align: 'center', color: '#ffd84a', outline: true });
    text(STAGES[this.p2.stage].name, W / 2, 314, { size: 6, align: 'center', color: '#ddd', outline: true });
  }
}

class FightScene {
  enter() {
    const r = Game.run;
    this.p2def = r.ladder[r.stage];
    this.stageKey = this.p2def.stage;
    if (this.p2def === r.p1 && this.stageKey === 'street') this.stageKey = 'dojo';
    this.online = r.mode === 'online';
    if (this.online) {
      // both browsers run this exact simulation; only button masks are exchanged (lockstep)
      this.stageKey = r.stageKey;
      this.pads = [new VPad(), new VPad()];
      this.p1 = new Fighter(r.p1, 0, new PlayerCtrl(this.pads[0]));
      this.p2 = new Fighter(this.p2def, 1, new PlayerCtrl(this.pads[1]));
      this.localSide = Net.isHost ? 0 : 1;
      this.mid = r.mid; this.simF = 0; this.sentTo = NET_DELAY - 1;
      this.localIn = new Map(); this.latch = 0; this.stall = 0; this.pendingHash = []; this.desync = false;
    } else {
      const level = [0.12, 0.42, 0.8][Settings.difficulty] + (r.mode === 'arcade' ? r.stage * 0.07 : 0);
      this.p1 = new Fighter(r.p1, 0, new PlayerCtrl());
      this.p2 = new Fighter(this.p2def, 1, new CpuCtrl(level));
      this.localSide = 0;
    }
    this.local = this.localSide ? this.p2 : this.p1;
    this.round = 1;
    this.projectiles = []; this.parts = []; this.texts = [];
    this.beams = []; this.bolts = []; this.waves = []; this.freeze = null; this.flashT = 0;
    this.cats = []; this.slashes = []; this.khufras = [];
    this.paused = false;
    this.pauseMenu = new Menu(this.online ? [
      { label: 'RESUME', action: () => { this.paused = false; } },
      { label: 'LEAVE MATCH', action: () => { Net.close(); Game.run = null; go(new TitleScene()); } },
    ] : [
      { label: 'RESUME', action: () => { this.paused = false; } },
      { label: 'RESTART MATCH', action: () => go(new FightScene()) },
      { label: 'QUIT TO TITLE', action: () => go(new TitleScene()) },
    ], { y: 160, gap: 22, size: 10 });
    Sound.playMusic(this.p2def.boss ? 'music_boss' : 'music_fight', true);
    this.startRound();
  }
  get fighters() { return [this.p1, this.p2]; }

  startRound() {
    this.p1.reset(); this.p2.reset();
    this.projectiles = []; this.parts = [];
    this.beams = []; this.bolts = []; this.waves = []; this.freeze = null; this.flashT = 0; this.orb = null;
    this.cats = []; this.slashes = []; this.khufras = [];
    this.time = 99; this.timeTick = 0;
    this.phase = 'intro'; this.phaseT = 0;
    this.hitstop = 0; this.shake = 0; this.slow = 0;
    this.banner = null; this.result = null;
    const final = this.p1.wins === 1 && this.p2.wins === 1;
    this.roundLabel = final ? 'FINAL ROUND' : `ROUND ${this.round}`;
    this.roundVo = final ? 'vo_final' : this.round === 1 ? 'vo_round1' : 'vo_round2';
  }

  spawnProjectile(f) {
    const fr = f.frame;
    const x = f.x + f.facing * Math.max(30, (fr.w - fr.ax) * 0.85);
    const y = f.y - fr.h * 0.6;
    this.projectiles.push({ id: uid++, owner: f, x, y, vx: f.facing * 4.6, t: 0, colors: f.def.proj, dmg: Math.round(11 * f.def.pow) });
    f.specialCd = 95;
    f.gainMeter(4);
    Sound.play('sfx_fireball', { vol: 0.9 });
    if (f.def.vo) Sound.play(f.def.vo, { vol: 0.9 });
  }

  dust(x, n) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + rand(-14, 14), y: GROUND - 2, vx: rand(-1.6, 1.6), vy: rand(-1.4, -0.2), life: rand(14, 26), max: 26, size: rand(2, 4), color: '#d8c8a8', grav: 0.02 });
  }
  sparks(x, y, color, n = 12, power = 4) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(1, power);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(8, 18), max: 18, size: rand(2, 4), color, grav: 0.15 });
    }
    this.parts.push({ ring: true, x, y, life: 10, max: 10, color });
  }
  popText(str, x, y, color, tag) {
    if (tag) this.texts = this.texts.filter(t => t.tag !== tag);
    this.texts.push({ str, x, y, color, life: 50, tag });
  }

  /* ---------------- ultimate effects ---------------- */
  beginSuper(f) {
    this.freeze = { f, t: 0, dur: 78 };
    this.flashT = 4;
    f.auraT = 1;
    Sound.play('sfx_superflash');
    Sound.play('sfx_charge', { vol: 0.7 });
    Sound.play(f.def.ult.vo || 'vo_ult_' + f.def.id, { vol: 1 });
    if (f === this.local) Input.buzz(60);
  }
  superHit(att, def, dmg, knock) {
    dmg = Math.round(dmg * att.def.pow);
    const dir = def.x < att.x ? -1 : 1;
    const hx = def.x - dir * 10, hy = def.y - def.frame.h * 0.6;
    const [core, glow] = att.def.ult.colors;
    if (def.blocking && (def.state === 'stand' || def.state === 'crouch' || def.state === 'blockstun')) {
      def.hp = Math.max(1, def.hp - Math.max(1, Math.round(dmg * 0.25)));
      def.state = 'blockstun'; def.timer = 16; def.vx = dir * 1.2;
      this.sparks(hx, hy, '#8fd0ff', 6, 3);
      Sound.play('sfx_block', { vol: 0.7 });
      return false;
    }
    def.hp = Math.max(0, def.hp - dmg);
    def.flash = 4;
    def.combo++;
    if (def.combo >= 2) this.popText(`${def.combo} HITS!`, def.side === 0 ? 70 : W - 70, 92, '#ffd84a', 'combo' + def.side);
    if (knock || def.hp <= 0) def.knockdown(dir);
    else { def.state = 'hitstun'; def.timer = 26; def.vx = dir * 0.5; def.move = null; }
    this.sparks(hx + rand(-8, 8), hy + rand(-12, 12), glow, 10, 5);
    this.sparks(hx, hy, core, 4, 3);
    Sound.play(Math.random() < 0.5 ? 'sfx_punch' : 'sfx_kick', { vol: 0.8, rate: rand(0.9, 1.15) });
    this.shake = Math.max(this.shake, knock ? 10 : 4);
    this.hitstop = def.hp <= 0 ? 14 : knock ? 8 : 2;
    if (def === this.local) Input.buzz(20);
    return true;
  }
  chargeOrb(f) {
    const fr = f.frame;
    const x = f.x - f.facing * 10, y = f.y - fr.h * 0.42;
    const [core, glow] = f.def.ult.colors;
    for (let i = 0; i < 2; i++) {
      const a = rand(0, Math.PI * 2), r = rand(26, 40);
      this.parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r / 8, vy: -Math.sin(a) * r / 8, life: 8, max: 8, size: 2, color: i ? core : glow, grav: 0 });
    }
    this.orb = { x, y, r: 6 + f.timer * 0.4, colors: f.def.ult.colors, life: 2 };
  }
  fireBeam(f) {
    const fr = f.frame;
    const x = f.x + f.facing * Math.max(30, (fr.w - fr.ax) * 0.9);
    const y = f.y - fr.h * 0.6;
    this.beams.push({ owner: f, x, y, dir: f.facing, t: 0, dur: 66, hits: 0, colors: f.def.ult.colors, kind: f.def.id });
    Sound.play('sfx_beam');
    Sound.play('sfx_explode', { vol: 0.7 });
    this.shake = Math.max(this.shake, 8);
  }
  summonCat(owner, target) {
    const dir = owner.facing;
    this.cats.push({ owner, target, dir, x: dir === 1 ? -90 : W + 90, y: GROUND, vx: 0, vy: 0, phase: 'run', t: 0, hits: 0, pose: 'run' });
    Sound.play('sfx_bigmeow', { vol: 1 });
    this.shake = Math.max(this.shake, 4);
  }
  clawSlash(x, y, dir) {
    this.slashes.push({ x, y, dir, life: 10 });
    Sound.play('sfx_claw', { vol: 0.8, rate: rand(0.9, 1.15) });
  }
  updateCats() {
    for (const c of this.cats) {
      c.t++;
      const tg = c.target;
      if (c.phase === 'run') {
        c.pose = Math.floor(c.t / 5) % 2 ? 'run' : 'pounce';
        c.x += c.dir * 9;
        if (c.t % 4 === 0) this.dust(c.x - c.dir * 30, 2);
        if (Math.abs(tg.x - c.x) < 200 || c.t > 120) {
          c.phase = 'leap'; c.t = 0; c.vy = -9;
          c.vx = (tg.x - c.dir * 60 - c.x) / (2 * 9 / 0.5);
          Sound.play('sfx_hiss', { vol: 0.9 });
        }
      } else if (c.phase === 'leap') {
        c.pose = 'pounce';
        c.x += c.vx; c.vy += 0.5; c.y += c.vy;
        if (c.y >= GROUND) {
          c.y = GROUND; c.phase = 'maul'; c.t = 0;
          this.shake = Math.max(this.shake, 10); this.dust(c.x, 14);
          Sound.play('sfx_land', { vol: 1 });
          if (!tg.hurtbox() || !this.superHit(c.owner, tg, 4, false)) { c.phase = 'exit'; c.t = 0; Sound.play('sfx_hiss'); }
          else this.clawSlash(tg.x, tg.y - 70, c.dir);
        }
      } else if (c.phase === 'maul') {
        c.pose = Math.floor(c.t / 6) % 2 ? 'swipe' : 'hiss';
        tg.state = 'hitstun'; tg.timer = 30; tg.vx = 0;
        tg.x += ((c.x + c.dir * 80) - tg.x) * 0.3;
        if (c.t % 6 === 0) {
          c.hits++;
          if (c.hits <= 7) {
            this.superHit(c.owner, tg, 3, false);
            this.clawSlash(tg.x + rand(-6, 6), tg.y - rand(50, 100), c.dir);
          } else {
            this.superHit(c.owner, tg, 8, true);
            this.clawSlash(tg.x, tg.y - 80, c.dir);
            Sound.play('sfx_bigmeow', { vol: 0.9 });
            this.shake = Math.max(this.shake, 12);
            c.phase = 'exit'; c.t = 0;
          }
        }
      } else { // exit: bound over the opponent and off screen
        c.pose = 'pounce';
        if (c.t === 1) { c.vy = -10; c.vx = c.dir * 8; }
        c.x += c.vx; c.vy += 0.5; c.y = Math.min(GROUND, c.y + c.vy);
        if (c.y >= GROUND) c.vy = Math.min(c.vy, -6);
      }
    }
    this.cats = this.cats.filter(c => c.x > -260 && c.x < W + 260 && c.t < 400);
    for (const sl of this.slashes) sl.life--;
    this.slashes = this.slashes.filter(sl => sl.life > 0);
  }
  drawCat(c) {
    const spr = SPR.cat[c.pose];
    const air = clamp((GROUND - c.y) / 140, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.4 - air * 0.25})`;
    ctx.beginPath(); ctx.ellipse(c.x, GROUND + 1, spr.w * 0.5 * (1 - air * 0.4), 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawSprite(spr, c.x + rand(-2, 2), c.y, c.dir, { glowOnly: true, alpha: 0.3, scale: CAT_SCALE * 1.04 });
    ctx.restore();
    drawSprite(spr, c.x, c.y, c.dir, { scale: CAT_SCALE });
  }
  drawSlash(sl) {
    const a = sl.life / 10, len = 70 * (1 - a * 0.3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = -1; i <= 1; i++) {
      for (const [w, col, al] of [[7, '#9b30ff', 0.6], [2.5, '#ffffff', 1]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = al * a;
        ctx.beginPath();
        ctx.moveTo(sl.x - sl.dir * len / 2 + i * 14, sl.y - len / 2);
        ctx.lineTo(sl.x + sl.dir * len / 2 + i * 14, sl.y + len / 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  /* ---- Khufra (summoned by Jaxxy): Tyrant's Revenge -> Tyrant's Rage -> Bouncing Ball ---- */
  summonKhufra(owner, target) {
    const dir = owner.facing;
    this.khufras.push({ owner, target, dir, x: clamp(owner.x - dir * 70, 40, W - 40), y: GROUND, vy: 0, phase: 'arrive', t: 0, bounces: 0, pose: 'idle', rise: 1 });
    Sound.play('sfx_sand', { vol: 1 }); Sound.play('vo_khufra', { vol: 1 });
    this.shake = Math.max(this.shake, 4);
  }
  sandBurst(x, n) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + rand(-40, 40), y: GROUND - rand(0, 10), vx: rand(-2.5, 2.5), vy: rand(-5, -1), life: rand(18, 34), max: 34, size: rand(2, 4), color: i % 3 ? '#d9b26a' : '#f3dc9a', grav: 0.12 });
  }
  // keep the victim under Khufra's control (airborne / pulled)
  khufraHold(tg, x, y, rot) {
    tg.state = 'held'; tg.vx = 0; tg.vy = 0; tg.pose = 'hit';
    tg.x = clamp(x, 24, W - 24); tg.y = y; tg.rot = rot;
  }
  updateKhufras() {
    for (const k of this.khufras) {
      k.t++;
      const tg = k.target, t = k.t;
      const done = () => { k.phase = 'leave'; k.t = 0; };
      if (k.phase === 'arrive') { // rise out of a sand vortex
        k.pose = 'idle'; k.rise = Math.max(0, 1 - t / 24);
        if (t % 2 === 0) this.sandBurst(k.x, 3);
        if (t >= 30) { k.phase = 'charge'; k.t = 0; Sound.play('sfx_whip', { vol: 0.8 }); }
      } else if (k.phase === 'charge') { // pulls his bandages taut
        k.pose = 'charge';
        if (t >= 16) { k.phase = 'dash'; k.t = 0; Sound.play('sfx_whip'); Sound.play('sfx_whoosh', { vol: 0.9, rate: 0.8 }); }
      } else if (k.phase === 'dash') { // TYRANT'S REVENGE
        k.pose = 'dash'; k.x += k.dir * 14;
        if (Math.abs(tg.x - k.x) < 64 || t > 50 || k.x < -60 || k.x > W + 60) {
          k.x = clamp(k.x, 30, W - 30);
          this.popText("TYRANT'S REVENGE", W / 2, 74, '#ffd23a', 'khufra');
          this.shake = Math.max(this.shake, 8);
          if (!tg.hurtbox() || !this.superHit(k.owner, tg, 6, false) || tg.hp <= 0) { done(); continue; }
          k.phase = 'air'; k.t = 0; k.vx0 = tg.x; k.vy0 = tg.y;
        }
      } else if (k.phase === 'air') { // victim knocked airborne
        k.pose = 'idle';
        const a = Math.min(1, t / 18);
        this.khufraHold(tg, k.vx0 + k.dir * 20 * a, GROUND - Math.sin(a * Math.PI * 0.5) * 110, -k.dir * a * Math.PI * 1.5);
        if (t >= 22) { k.phase = 'pull'; k.t = 0; Sound.play('sfx_whip', { vol: 1 }); }
      } else if (k.phase === 'pull') { // TYRANT'S RAGE: yank them in front of him...
        k.pose = 'pull';
        const a = Math.min(1, t / 10);
        const fx = k.x + k.dir * 74;
        this.khufraHold(tg, lerp(tg.x, fx, a), lerp(tg.y, GROUND - 120, a), -k.dir * Math.PI * (1.5 + a * 0.5));
        if (t >= 12) { k.phase = 'smash'; k.t = 0; }
      } else if (k.phase === 'smash') { // ...and slam them down
        k.pose = 'smash';
        const a = Math.min(1, t / 6);
        this.khufraHold(tg, tg.x, lerp(GROUND - 120, GROUND - 2, a), Math.PI / 2 * -k.dir);
        if (t >= 6) {
          tg.rot = 0; tg.state = 'hitstun';
          const wall = tg.x < 70 || tg.x > W - 70;
          Sound.play('sfx_bodyslam'); Sound.play('sfx_quake', { vol: 0.6 });
          this.shake = 16; this.flashT = 3; this.dust(tg.x, 20); this.sandBurst(tg.x, 16);
          this.waves.push({ x: tg.x, t: 0, colors: k.owner.def.ult.colors });
          this.popText(wall ? 'WALL SLAM!!' : "TYRANT'S RAGE", W / 2, 74, wall ? '#ff5a3a' : '#ffd23a', 'khufra');
          if (!this.superHit(k.owner, tg, wall ? 16 : 10, false) || tg.hp <= 0) { done(); continue; }
          tg.state = 'hitstun'; tg.timer = 90; tg.vx = 0; tg.y = GROUND; // stunned
          k.phase = 'ballup'; k.t = 0;
        }
      } else if (k.phase === 'ballup' || k.phase === 'ball') { // BOUNCING BALL
        k.pose = 'ball';
        if (k.phase === 'ballup') { k.phase = 'ball'; k.vy = -9; k.bx = k.x; }
        k.x += (tg.x - k.x) * 0.12;
        k.vy += 0.6; k.y += k.vy;
        tg.state = 'hitstun'; tg.timer = Math.max(tg.timer, 30); tg.vx = 0;
        if (k.y >= GROUND) {
          k.y = GROUND; k.bounces++;
          Sound.play('sfx_bounce', { vol: 1 }); this.dust(k.x, 10); this.sandBurst(k.x, 8);
          this.shake = Math.max(this.shake, 8);
          const last = k.bounces >= 3;
          this.superHit(k.owner, tg, last ? 8 : 4, last);
          if (last || tg.hp <= 0) { done(); continue; }
          k.vy = -9 - k.bounces;
        }
      } else { // leave: bounce off screen
        k.pose = 'ball';
        if (t === 1) { k.vy = -11; }
        k.x += k.dir * 7; k.vy += 0.6; k.y = Math.min(GROUND, k.y + k.vy);
        if (k.y >= GROUND && k.vy > 0) { k.vy = -8; Sound.play('sfx_bounce', { vol: 0.6 }); }
      }
    }
    this.khufras = this.khufras.filter(k => k.x > -160 && k.x < W + 160 && k.t < 300);
  }
  drawKhufra(k) {
    const spr = SPR.khufra[k.pose];
    const air = clamp((GROUND - k.y) / 140, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.4 - air * 0.25})`;
    ctx.beginPath(); ctx.ellipse(k.x, GROUND + 1, spr.w * 0.45 * (1 - air * 0.4), 7, 0, 0, Math.PI * 2); ctx.fill();
    // sand vortex while he emerges
    if (k.phase === 'arrive') {
      ctx.save(); ctx.globalAlpha = 0.6 * (1 - k.t / 34);
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i % 2 ? '#d9b26a' : '#f3dc9a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(k.x, GROUND, 50 + i * 16 + Math.sin(tick * 0.3 + i) * 6, 10 + i * 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    // stretched bandages while charging / dashing
    if (k.phase === 'charge' || k.phase === 'dash') {
      ctx.save(); ctx.strokeStyle = '#a8865a'; ctx.lineWidth = 4;
      const back = k.phase === 'charge' ? 70 + k.t * 3 : 90;
      for (const dy of [-70, -95]) { ctx.beginPath(); ctx.moveTo(k.x, k.y + dy); ctx.lineTo(k.x - k.dir * back, k.y + dy + rand(-3, 3)); ctx.stroke(); }
      ctx.restore();
    }
    const rise = (k.rise || 0) * spr.h * KHUFRA_SCALE;
    ctx.save();
    if (rise) { ctx.beginPath(); ctx.rect(-50, 0, W + 100, GROUND + 2); ctx.clip(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawSprite(spr, k.x + rand(-1.5, 1.5), k.y + rise, k.dir, { glowOnly: true, alpha: 0.22, scale: KHUFRA_SCALE * 1.04 });
    ctx.restore();
    drawSprite(spr, k.x, k.y + rise, k.dir, { scale: KHUFRA_SCALE });
    ctx.restore();
  }
  thunderBolt(x) {
    this.bolts.push({ x, life: 9 });
    this.flashT = Math.max(this.flashT, 2);
    this.shake = Math.max(this.shake, 6);
  }
  quakeSlam(f) {
    const opp = f === this.p1 ? this.p2 : this.p1;
    Sound.play('sfx_quake'); Sound.play('sfx_explode', { vol: 0.8 });
    this.shake = 18; this.flashT = 3;
    this.dust(f.x, 30);
    for (let i = 0; i < 26; i++) this.parts.push({ x: f.x + rand(-30, 30), y: GROUND - 4, vx: rand(-5, 5), vy: rand(-9, -3), life: rand(30, 50), max: 50, size: rand(3, 6), color: i % 3 ? '#7a5a3a' : '#ffb03a', grav: 0.4 });
    this.waves.push({ x: f.x, t: 0, colors: f.def.ult.colors });
    const near = Math.abs(opp.x - f.x);
    if (opp.hurtbox() && ((opp.y >= GROUND - 6 && near < 270) || near < 60)) this.superHit(f, opp, 28, true);
  }
  updateFx() {
    for (const b of this.beams) {
      b.t++;
      const len = Math.min(W + 80, b.t * 45);
      const hh = 26;
      const box = { x0: Math.min(b.x, b.x + b.dir * len), x1: Math.max(b.x, b.x + b.dir * len), y0: b.y - hh, y1: b.y + hh };
      for (const p of this.projectiles) if (p.owner !== b.owner && overlap(box, { x0: p.x - 10, x1: p.x + 10, y0: p.y - 10, y1: p.y + 10 })) { p.dead = true; this.sparks(p.x, p.y, '#fff', 12, 4); }
      const target = b.owner === this.p1 ? this.p2 : this.p1;
      if (b.t >= 4 && b.t % 5 === 0 && b.hits < 10 && b.t < b.dur - 4 && overlap(box, target.hurtbox())) {
        b.hits++;
        this.superHit(b.owner, target, b.hits === 10 ? 6 : 3, b.hits === 10);
      }
      this.shake = Math.max(this.shake, 3);
      if (b.kind === 'shade' && b.t % 3 === 0) this.parts.push({ skull: true, x: b.x + b.dir * rand(20, len), y: b.y + rand(-14, 14), vx: b.dir * 3, vy: rand(-0.5, 0.5), life: 20, max: 20, color: '#eaffff', grav: 0 });
    }
    this.beams = this.beams.filter(b => b.t < b.dur);
    for (const b of this.bolts) b.life--;
    this.bolts = this.bolts.filter(b => b.life > 0);
    for (const w of this.waves) w.t++;
    this.updateCats();
    this.updateKhufras();
    this.waves = this.waves.filter(w => w.t < 26);
    if (this.orb && --this.orb.life <= 0) this.orb = null;
  }

  applyHit(att, def, m, hx, hy, dmgOverride) {
    const dmg = dmgOverride != null ? dmgOverride : Math.round(m.dmg * att.def.pow);
    const away = def.x < att.x ? -1 : 1;
    const canBlock = def.blocking && (def.state === 'stand' || def.state === 'crouch' || def.state === 'blockstun');
    if (canBlock) {
      def.hp = Math.max(1, def.hp - Math.max(1, Math.round(dmg * 0.12)));
      if (def.state !== 'crouch') def.pose = 'block';
      def.state = 'blockstun'; def.timer = 13;
      def.vx = away * 3.4;
      this.sparks(hx, hy, '#8fd0ff', 8, 3);
      Sound.play('sfx_block', { vol: 0.9 });
      this.hitstop = 4;
      att.gainMeter(dmg * 0.6); def.gainMeter(dmg * 0.4);
      return;
    }
    def.combo = (def.state === 'hitstun' || def.state === 'knock') ? def.combo + 1 : 1;
    const scaled = Math.max(1, Math.round(dmg * Math.max(0.6, 1 - 0.07 * (def.combo - 1))));
    att.gainMeter(scaled * 1.8); def.gainMeter(scaled * 1.1);
    def.hp = Math.max(0, def.hp - scaled);
    def.flash = 6;
    if (def.combo >= 2) this.popText(`${def.combo} HITS!`, def.side === 0 ? 70 : W - 70, 92, '#ffd84a', 'combo' + def.side);
    if (m.knock || def.y < GROUND - 2 || def.hp <= 0) def.knockdown(away);
    else { def.state = 'hitstun'; def.timer = m.stun; def.vx = away * m.push; def.move = null; }
    this.sparks(hx, hy, '#fff1a0', 14, 5);
    Sound.play(m.sfx || 'sfx_explode', { vol: 1, rate: rand(0.92, 1.08) });
    this.hitstop = def.hp <= 0 ? 14 : 7;
    this.shake = Math.max(this.shake, dmg >= 9 ? 6 : 3);
    if (m.finisher) {
      this.hitstop = Math.max(this.hitstop, 12); this.shake = 10; this.flashT = 2;
      this.sparks(hx, hy, att.def.proj[1], 20, 7);
      Sound.play('sfx_explode', { vol: 0.7 });
      if (def.combo >= 3) this.popText('COMBO FINISH!', W / 2, 74, '#ff8a3a', 'finish');
    }
    if (def === this.local) Input.buzz(30);
  }

  checkHits() {
    for (const [a, d] of [[this.p1, this.p2], [this.p2, this.p1]]) {
      const hb = a.hitbox(), hu = d.hurtbox();
      if (overlap(hb, hu)) {
        a.hasHit = true;
        const hx = (Math.max(hb.x0, hu.x0) + Math.min(hb.x1, hu.x1)) / 2;
        const hy = (Math.max(hb.y0, hu.y0) + Math.min(hb.y1, hu.y1)) / 2;
        this.applyHit(a, d, a.move, hx, hy);
      }
    }
    // projectiles
    for (const p of this.projectiles) {
      if (p.dead) continue;
      for (const q of this.projectiles) {
        if (q !== p && !q.dead && q.owner !== p.owner && Math.abs(q.x - p.x) < 20) {
          p.dead = q.dead = true;
          this.sparks((p.x + q.x) / 2, p.y, '#ffffff', 22, 6);
          Sound.play('sfx_explode', { vol: 0.8 });
        }
      }
      if (p.dead) continue;
      const target = p.owner === this.p1 ? this.p2 : this.p1;
      const box = { x0: p.x - 12, x1: p.x + 12, y0: p.y - 12, y1: p.y + 12 };
      if (overlap(box, target.hurtbox())) {
        p.dead = true;
        this.applyHit(p.owner, target, { stun: 20, push: 4, sfx: 'sfx_explode' }, p.x, p.y, p.dmg);
        this.sparks(p.x, p.y, p.colors[1], 18, 5);
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead && p.x > -40 && p.x < W + 40);
  }

  separate() {
    const a = this.p1, b = this.p2;
    if (a.state === 'down' || b.state === 'down' || a.state === 'ko' || b.state === 'ko' || a.state === 'held' || b.state === 'held') return;
    const minD = (a.spr.idle.w + b.spr.idle.w) * 0.22;
    const dx = b.x - a.x;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 90) {
      const push = (minD - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      a.x -= s * push; b.x += s * push;
      for (const f of [a, b]) f.x = clamp(f.x, 28, W - 28);
      // if one is cornered, push the other out
      if (Math.abs(b.x - a.x) < minD) { if (a.x <= 28 || a.x >= W - 28) b.x = a.x + s * minD; else a.x = b.x - s * minD; }
    }
  }

  update() {
    if (this.online) return this.netUpdate();
    if (this.paused) {
      if (Input.pressed('start') || Input.pressed('back')) { this.paused = false; return; }
      this.pauseMenu.update();
      return;
    }
    if (Input.pressed('start') || Input.pressed('back')) {
      if (this.phase === 'fight' || this.phase === 'intro') { this.paused = true; this.pauseMenu.sel = 0; Sound.play('sfx_select'); return; }
    }
    this.simStep();
  }

  // online: exchange inputs, then advance the shared simulation only when both sides' inputs exist
  netUpdate() {
    // the menu is local only - the match keeps running underneath
    if (this.paused) {
      if (Input.pressed('start') || Input.pressed('back')) this.paused = false;
      else this.pauseMenu.update();
      if (Game.scene !== this) return;
    } else if (Input.pressed('start') || Input.pressed('back')) { this.paused = true; this.pauseMenu.sel = 0; }
    // remember taps that happen while the sim is stalled so they are never lost
    for (const a of NET_ACTIONS) if (Input.pressed(a)) this.latch |= bit(a);

    const ahead = Net.lastRemoteFrame(this.mid) - NET_DELAY; // rival's approximate sim frame
    const maxSteps = ahead > this.simF + 1 ? 2 : 1;           // catch up if we fell behind
    for (let step = 0; step < maxSteps; step++) {
      const f = this.simF;
      if (this.sentTo < f + NET_DELAY) {
        let m = 0;
        if (!this.paused && !Game.portrait) { for (const a of NET_ACTIONS) if (Input.held(a)) m |= bit(a); m |= this.latch; }
        this.latch = 0;
        const tf = f + NET_DELAY;
        this.localIn.set(tf, m);
        Net.send({ t: 'in', mid: this.mid, f: tf, m });
        this.sentTo = tf;
      }
      const rm = f < NET_DELAY ? 0 : Net.remoteInput(this.mid, f);
      if (rm === undefined) { if (step === 0) this.stall++; break; }
      const lm = f < NET_DELAY ? 0 : this.localIn.get(f);
      this.localIn.delete(f);
      this.pads[this.localSide].feed(lm);
      this.pads[1 - this.localSide].feed(rm);
      this.stall = 0;
      this.simStep();
      if (Game.scene !== this) return; // match ended inside the step
      this.simF++;
      if (this.simF % 120 === 0) {
        const h = this.stateHash();
        Net.send({ t: 'hash', mid: this.mid, f: this.simF, h });
        Net.checkHash(this.mid, this.simF, h);
        this.pendingHash.push(this.simF);
      }
    }
    this.pendingHash = this.pendingHash.filter(f => {
      const ok = Net.remoteHashFor(this.mid, f);
      if (ok === false && !this.desync) { this.desync = true; console.warn('Ghost Fighter: desync at frame', f); }
      return ok === null;
    });
  }

  stateHash() {
    let h = 7;
    for (const f of this.fighters) {
      for (const v of [f.x, f.y, f.hp, f.meter, f.wins, f.specialCd]) h = (h * 31 + Math.round(v * 10)) | 0;
    }
    return (h * 31 + this.time * 7 + this.round) | 0;
  }

  simStep() {
    this.phaseT++;
    // particles & texts always animate
    for (const p of this.parts) { if (!p.ring) { p.x += p.vx; p.y += p.vy; p.vy += p.grav; } p.life--; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const t of this.texts) { t.life--; t.y -= 0.3; }
    this.texts = this.texts.filter(t => t.life > 0);
    if (this.shake > 0) this.shake *= 0.85, this.shake < 0.3 && (this.shake = 0);

    if (this.flashT > 0) this.flashT--;
    document.body.classList.toggle('super-ready', this.local.meter >= 100);
    for (const f of this.fighters) f.ctrl.poll && f.ctrl.poll(!!this.freeze || this.hitstop > 0);
    if (this.freeze) {
      const z = this.freeze; z.t++;
      // energy rising off the fighter during the cut-in
      const f = z.f, [core, glow] = f.def.ult.colors;
      for (let i = 0; i < 3; i++) this.parts.push({ x: f.x + rand(-28, 28), y: f.y - rand(0, f.frame.h), vx: rand(-0.3, 0.3), vy: rand(-3.5, -1.5), life: rand(10, 22), max: 22, size: rand(2, 4), color: i ? glow : core, grav: -0.02 });
      if (z.t >= z.dur) { this.freeze = null; f.auraT = 0; }
      return;
    }
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.slow > 0) { this.slow--; if (this.slow % 3) return; }

    const ph = this.phase;
    if (ph === 'intro') {
      if (this.phaseT === 10) Sound.play(this.roundVo);
      if (this.phaseT === 70) Sound.play('vo_fight');
      if (this.phaseT >= 95) { this.phase = 'fight'; this.phaseT = 0; for (const f of this.fighters) f.state = 'stand'; }
    }

    for (const p of this.projectiles) { p.x += p.vx; p.t++; }
    this.updateFx();
    this.p1.update(this.p2, this);
    this.p2.update(this.p1, this);
    this.separate();
    if (this.phase === 'fight') this.checkHits();

    if (this.phase === 'fight') {
      if (this.p1.state !== 'super' && this.p2.state !== 'super' && ++this.timeTick >= 60) { this.timeTick = 0; this.time = Math.max(0, this.time - 1); }
      const ko1 = this.p1.hp <= 0, ko2 = this.p2.hp <= 0;
      if (ko1 || ko2) {
        this.phase = 'ko'; this.phaseT = 0; this.slow = 70;
        this.result = ko1 && ko2 ? 'draw' : ko2 ? 'p1' : 'p2';
        this.banner = 'K.O.';
        Sound.play('vo_ko'); Sound.play('sfx_crowd', { vol: 0.6 });
      } else if (this.time === 0) {
        this.phase = 'ko'; this.phaseT = 0;
        this.result = this.p1.hp === this.p2.hp ? 'draw' : this.p1.hp > this.p2.hp ? 'p1' : 'p2';
        this.banner = 'TIME OVER';
        for (const f of this.fighters) if (f.state !== 'knock' && f.state !== 'down') { f.state = 'idle-lock'; }
      }
    } else if (this.phase === 'ko') {
      const settled = this.fighters.every(f => f.state !== 'knock' && f.state !== 'attack' && f.state !== 'air' && f.y >= GROUND);
      if (this.phaseT > 100 && settled) {
        this.phase = 'roundend'; this.phaseT = 0;
        const w = this.result === 'p1' ? this.p1 : this.result === 'p2' ? this.p2 : null;
        for (const f of this.fighters) if (f.hp > 0) { f.state = f === w ? 'win' : 'idle-lock'; f.vx = 0; }
        if (w) {
          w.wins++;
          this.banner = w === this.local ? 'YOU WIN' : 'YOU LOSE';
          if (w.hp === w.maxHp) { this.banner = 'PERFECT!'; Sound.play('vo_perfect'); }
          else Sound.play(w === this.local ? 'vo_youwin' : 'vo_youlose');
        } else this.banner = 'DRAW GAME';
      }
    } else if (this.phase === 'roundend') {
      if (this.phaseT > 150) {
        if (this.p1.wins >= 2 || this.p2.wins >= 2 || this.round >= 5) this.endMatch(this.local.wins > (this.local === this.p1 ? this.p2 : this.p1).wins);
        else { this.round++; this.startRound(); }
      }
    }
  }

  endMatch(won) {
    const r = Game.run;
    if (r.mode === 'online') return go(new OnlineResultScene(won));
    if (r.mode === 'arcade') {
      if (won) {
        r.stage++;
        if (r.stage >= r.ladder.length) go(new EndingScene());
        else go(new ResultScene(true, () => go(new VsScene())));
      } else go(new ContinueScene());
    } else go(new ResultScene(won, null));
  }

  draw() {
    const sx = this.shake ? rand(-this.shake, this.shake) : 0, sy = this.shake ? rand(-this.shake, this.shake) : 0;
    ctx.save(); ctx.translate(Math.round(sx), Math.round(sy));
    const mid = (this.p1.x + this.p2.x) / 2;
    drawStageBg(this.stageKey, (W / 2 - mid) * 0.05);
    if (this.p2def.boss) { // ghostly mist pulse on the boss stage
      ctx.fillStyle = `rgba(80,0,140,${0.08 + Math.sin(tick * 0.03) * 0.05})`; ctx.fillRect(0, 0, W, H);
    }
    const dim = this.freeze ? 0.6 : this.beams.length ? 0.3 : 0;
    if (dim) { ctx.fillStyle = `rgba(0,0,10,${dim})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    for (const b of this.bolts) this.drawBolt(b);
    for (const w of this.waves) this.drawWave(w);
    // draw the attacker on top
    const active = f => f.state === 'attack' || f.state === 'super';
    const order = active(this.p2) ? [this.p1, this.p2] : [this.p2, this.p1];
    for (const f of order) f.draw();
    for (const k of this.khufras) this.drawKhufra(k);
    for (const c of this.cats) this.drawCat(c);
    for (const sl of this.slashes) this.drawSlash(sl);
    for (const p of this.projectiles) this.drawProjectile(p);
    for (const b of this.beams) this.drawBeam(b);
    if (this.orb) this.drawOrb(this.orb);
    for (const p of this.parts) {
      const a = p.life / p.max;
      if (p.skull) {
        ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(p.x - 3, p.y + 2, 6, 4);
        ctx.fillStyle = '#4a0080'; ctx.fillRect(p.x - 3, p.y - 1, 2, 2); ctx.fillRect(p.x + 1, p.y - 1, 2, 2);
        ctx.globalAlpha = 1;
      } else if (p.ring) {
        ctx.strokeStyle = p.color; ctx.globalAlpha = a; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, (1 - a) * 26 + 4, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.min(1, a * 1.5);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    if (this.freeze) this.drawCutin(this.freeze);
    if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashT / 5})`; ctx.fillRect(0, 0, W, H); }
    this.drawHud();
    for (const t of this.texts) text(t.str, t.x, t.y, { size: 8, align: 'center', color: t.color, outline: true });

    // banners
    if (this.phase === 'intro') {
      if (this.phaseT < 68) bigText(this.roundLabel, W / 2, 140, 24);
      else bigText('FIGHT!', W / 2, 128, 40, '#fff', '#ff2a2a');
    } else if (this.banner && (this.phase === 'ko' || this.phase === 'roundend')) {
      const s = this.phase === 'ko' && this.phaseT < 12 ? 2.4 - this.phaseT / 10 : 1;
      ctx.save(); ctx.translate(W / 2, 130); ctx.scale(s, s);
      if (this.banner === 'K.O.') bigText('K.O.', 0, 0, 48, '#fff', '#ff2a2a');
      else bigText(this.banner, 0, 8, 28);
      ctx.restore();
    }
    if (this.online) {
      const lx = this.localSide === 0 ? 24 : W - 24;
      text('YOU', lx, 64, { size: 7, align: this.localSide === 0 ? 'left' : 'right', color: '#7cff9a', outline: true });
      if (this.stall > 30 && tick % 40 < 28) text('WAITING FOR RIVAL...', W / 2, 300, { size: 9, align: 'center', color: '#ffd84a', outline: true });
      if (this.desync) text('SYNC ERROR', W / 2, 44, { size: 6, align: 'center', color: '#ff5050' });
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, W, H);
      bigText(this.online ? 'MENU' : 'PAUSE', W / 2, 110, 24);
      if (this.online) text('THE MATCH IS STILL RUNNING!', W / 2, 140, { size: 7, align: 'center', color: '#ff8080' });
      this.pauseMenu.draw();
    }
  }

  drawCutin(z) {
    const f = z.f, t = z.t, img = IMG['cut_' + f.def.id];
    const left = f.side === 0;
    const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
    let off = 0;
    if (t < 12) off = (1 - ease(t / 12)) * (left ? -W : W);
    else if (t > z.dur - 12) off = ease((t - (z.dur - 12)) / 12) * (left ? W : -W);
    const by = 98, bh = 116, skew = 26;
    ctx.save();
    ctx.translate(off, 0);
    ctx.beginPath();
    ctx.moveTo(skew, by); ctx.lineTo(W + skew, by); ctx.lineTo(W - skew, by + bh); ctx.lineTo(-skew, by + bh); ctx.closePath();
    ctx.save(); ctx.clip();
    const sy = Math.round(img.height * 0.16), sh = Math.round(img.width * bh / W);
    const drift = (t - z.dur / 2) * 0.4 * (left ? 1 : -1);
    if (left) ctx.drawImage(img, 0, sy, img.width, sh, drift - 10, by, W + 20, bh);
    else { ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, sy, img.width, sh, -drift - 10, by, W + 20, bh); }
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    if (t > 10 && t < z.dur - 8) {
      const name = f.def.ult.name;
      const nx = left ? W - 150 : 150;
      const k = t < 20 ? (20 - t) / 10 : 0;
      ctx.save(); ctx.translate(nx, by + bh - 36); ctx.scale(1 + k, 1 + k);
      bigText(name, 0, 0, 18, '#ffffff', f.def.ult.colors[1]);
      ctx.restore();
      text('ULTIMATE', nx, by + 10, { size: 8, align: 'center', color: '#ffd84a', outline: true });
    }
  }

  drawOrb(o) {
    const [core, glow] = o.colors;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5; ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 1.7 + rand(0, 2), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawBeam(b) {
    const [core, glow, edge] = b.colors;
    const len = Math.min(W + 80, b.t * 45);
    const fade = b.t > b.dur - 12 ? (b.dur - b.t) / 12 : Math.min(1, b.t / 4);
    const hh = (24 + Math.sin(b.t * 0.9) * 4) * fade;
    const x0 = b.x, x1 = b.x + b.dir * len;
    const L = Math.min(x0, x1), R = Math.max(x0, x1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3; ctx.fillStyle = glow; ctx.fillRect(L, b.y - hh * 1.6, R - L, hh * 3.2);
    ctx.globalAlpha = 0.75; ctx.fillRect(L, b.y - hh, R - L, hh * 2);
    ctx.globalAlpha = 1; ctx.fillStyle = edge; ctx.fillRect(L, b.y - hh * 0.62, R - L, hh * 1.24);
    ctx.fillStyle = core; ctx.fillRect(L, b.y - hh * 0.38, R - L, hh * 0.76);
    // travelling rings
    ctx.strokeStyle = core; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 * fade;
    for (let i = 0; i < 6; i++) {
      const rx = x0 + b.dir * ((b.t * 18 + i * 110) % (len + 1));
      ctx.beginPath(); ctx.ellipse(rx, b.y, 6, Math.max(1, hh * 1.3), 0, 0, Math.PI * 2); ctx.stroke();
    }
    // wind spiral for Kaze
    if (b.kind === 'kaze') {
      ctx.strokeStyle = edge; ctx.globalAlpha = 0.7 * fade;
      ctx.beginPath();
      for (let x = 0; x < len; x += 4) {
        const yy = b.y + Math.sin((x + b.t * 20) * 0.08) * hh * 1.4;
        x === 0 ? ctx.moveTo(x0 + b.dir * x, yy) : ctx.lineTo(x0 + b.dir * x, yy);
      }
      ctx.stroke();
    }
    // crackle
    ctx.strokeStyle = edge; ctx.globalAlpha = fade; ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      let yy = b.y + (k ? -1 : 1) * hh;
      ctx.moveTo(x0, yy);
      for (let x = 0; x < len; x += 18) { yy = b.y + (k ? -1 : 1) * hh * rand(0.8, 1.5); ctx.lineTo(x0 + b.dir * x, yy); }
      ctx.stroke();
    }
    // muzzle and tip
    ctx.globalAlpha = 0.6 * fade; ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x0, b.y, Math.max(1, hh * 1.8), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = fade; ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x0, b.y, Math.max(1, hh * 1.1), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x1, b.y, Math.max(1, hh * 1.3 + rand(0, 4)), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawBolt(b) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [w, c, a] of [[9, '#ffd000', 0.5], [3, '#ffffff', 1]]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.globalAlpha = a * b.life / 9;
      ctx.beginPath(); ctx.moveTo(b.x + rand(-30, 30), -10);
      for (let y = 20; y < GROUND; y += 28) ctx.lineTo(b.x + rand(-18, 18), y);
      ctx.lineTo(b.x, GROUND); ctx.stroke();
    }
    ctx.restore();
  }

  drawWave(w) {
    const d = w.t * 13, a = 1 - w.t / 26;
    ctx.save();
    for (const dir of [-1, 1]) {
      const x = w.x + dir * d;
      for (let i = 0; i < 4; i++) {
        const sx = x - dir * i * 14, hgt = (30 - i * 7) * a + rand(0, 6);
        ctx.fillStyle = i % 2 ? '#6b4a2e' : '#9a7048'; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.moveTo(sx - 9, GROUND + 2); ctx.lineTo(sx + rand(-3, 3), GROUND - hgt); ctx.lineTo(sx + 9, GROUND + 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = w.colors[1]; ctx.globalAlpha = 0.5 * a;
      ctx.fillRect(Math.min(w.x, x), GROUND - 6, Math.abs(x - w.x), 8);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  drawProjectile(p) {
    const [c1, c2] = p.colors;
    const pulse = 1 + Math.sin(p.t * 0.6) * 0.15;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 4; i >= 1; i--) { // trail
      ctx.fillStyle = c2; ctx.globalAlpha = 0.12 * (5 - i);
      ctx.beginPath(); ctx.ellipse(p.x - Math.sign(p.vx) * i * 9, p.y, 14 - i * 2, 9 - i, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.5; ctx.fillStyle = c2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 15 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = c1;
    ctx.beginPath(); ctx.arc(p.x, p.y, 8 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawHud() {
    const bw = 248, bh = 12, y = 14;
    const bars = [[this.p1, 24, 1], [this.p2, W - 24 - bw, -1]];
    for (const [f, x, dir] of bars) {
      ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4);
      ctx.fillStyle = '#b3141e'; ctx.fillRect(x, y, bw, bh);
      const disp = bw * f.dispHp / f.maxHp, real = bw * f.hp / f.maxHp;
      // damage trail (white), then current health (yellow); bars drain toward the centre timer
      ctx.fillStyle = '#fff';
      if (dir === 1) ctx.fillRect(x + bw - disp, y, disp, bh); else ctx.fillRect(x, y, disp, bh);
      const low = f.hp / f.maxHp < 0.25 && tick % 20 < 10;
      ctx.fillStyle = low ? '#ff7a00' : '#ffd400';
      if (dir === 1) ctx.fillRect(x + bw - real, y, real, bh); else ctx.fillRect(x, y, real, bh);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      if (dir === 1) ctx.fillRect(x + bw - real, y, real, 3); else ctx.fillRect(x, y, real, 3);
      // name, portrait-ish chip, wins
      text(f.def.name, dir === 1 ? x : x + bw, y + bh + 5, { size: 8, align: dir === 1 ? 'left' : 'right', outline: true });
      for (let i = 0; i < f.wins; i++) {
        const wx = dir === 1 ? x + bw - 10 - i * 14 : x + 2 + i * 14;
        ctx.fillStyle = '#000'; ctx.fillRect(wx - 1, y + bh + 4, 12, 12);
        ctx.fillStyle = '#ffd84a'; ctx.fillRect(wx + 1, y + bh + 6, 8, 8);
        ctx.fillStyle = '#ff6a00'; ctx.fillRect(wx + 3, y + bh + 8, 4, 4);
      }
      // special meter
      const ready = f.specialCd === 0;
      const sw = 70, sxm = dir === 1 ? x : x + bw - sw, sym = y + bh + 18;
      ctx.fillStyle = '#000'; ctx.fillRect(sxm - 1, sym - 1, sw + 2, 6);
      ctx.fillStyle = ready ? (tick % 20 < 10 ? f.def.proj[1] : f.def.proj[0]) : '#335';
      const fill = ready ? sw : sw * (1 - f.specialCd / 95);
      ctx.fillRect(dir === 1 ? sxm : sxm + sw - fill, sym, fill, 4);
      text(ready ? 'SP READY' : 'SP', dir === 1 ? sxm + sw + 4 : sxm - 4, sym - 1, { size: 5, align: dir === 1 ? 'left' : 'right', color: ready ? '#fff' : '#889' });
    }
    // super meters (under the health bars so touch controls never cover them)
    for (const [f, dir] of [[this.p1, 1], [this.p2, -1]]) {
      const mw = 120, mh = 6, my = 54;
      const mx = dir === 1 ? 24 : W - 24 - mw;
      const full = f.meter >= 100;
      ctx.fillStyle = '#000'; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
      ctx.fillStyle = '#1a1a33'; ctx.fillRect(mx, my, mw, mh);
      const fill = mw * f.meter / 100;
      const g = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      g.addColorStop(0, '#1b4dff'); g.addColorStop(1, f.def.ult.colors[1]);
      ctx.fillStyle = full ? (tick % 10 < 5 ? '#ffffff' : f.def.ult.colors[1]) : g;
      ctx.fillRect(dir === 1 ? mx : mx + mw - fill, my, fill, mh);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(dir === 1 ? mx : mx + mw - fill, my, fill, 2);
      const label = full ? 'MAX! ULTIMATE' : 'SUPER';
      const hint = full && f === this.local ? (Input.isTouch ? '' : '  [I]') : '';
      text(label + hint, dir === 1 ? mx + mw + 5 : mx - 5, my - 1, { size: 6, align: dir === 1 ? 'left' : 'right', color: full ? '#ffd84a' : '#9ab', outline: true });
    }
    // timer
    ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 20, 8, 40, 28);
    text(String(this.time).padStart(2, '0'), W / 2, 13, { size: 18, align: 'center', color: this.time <= 10 ? '#ff5050' : '#ffd84a' });
  }
}

class ResultScene {
  constructor(won, next) { this.won = won; this.next = next; }
  enter() {
    this.t = 0;
    const r = Game.run;
    Sound.playMusic(null);
    if (this.won) Sound.play('jingle_win', { vol: 0.8 });
    if (!this.next) {
      this.menu = new Menu([
        { label: 'REMATCH', action: () => go(new VsScene()) },
        { label: 'CHARACTER SELECT', action: () => go(new SelectScene(r.mode)) },
        { label: 'TITLE SCREEN', action: () => go(new TitleScene()) },
      ], { x: 440, y: 262, gap: 22, size: 9 });
    }
    this.quotes = [
      'THE STREETS REMEMBER MY NAME.', 'GO TRAIN FOR TEN MORE YEARS.', 'YOU FIGHT LIKE A SHADOW. I AM THE LIGHT.',
      'NEXT TIME, BRING FRIENDS.', 'THAT WAS JUST MY WARM-UP.',
    ];
    this.quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
  }
  update() {
    this.t++;
    if (this.menu) { if (this.t > 40) this.menu.update(); }
    else if (this.t > 60 && (Input.confirm() || Game.tap)) this.next();
    else if (this.t > 330) this.next();
  }
  draw() {
    const r = Game.run;
    const winner = this.won ? r.p1 : r.ladder[Math.min(r.stage, r.ladder.length - 1)];
    stripesBg(this.won ? '#0b1c46' : '#3a0b0b', this.won ? '#10275e' : '#4a1010');
    drawSprite(SPR[winner.id].win, 170, 300, 1, { scale: 1.5 });
    bigText(this.won ? 'YOU WIN!' : 'YOU LOSE', 440, 70, 22, this.won ? '#fff6b0' : '#fff', this.won ? '#ff8a00' : '#ff2a2a');
    text(winner.name + ':', 300, 130, { size: 8, color: '#ffd84a' });
    const words = (this.won ? this.quote : 'IS THAT ALL YOU GOT?').split(' ');
    let line = '', ly = 148;
    for (const w of words) {
      if ((line + w).length > 24) { text(line, 300, ly, { size: 8 }); ly += 14; line = ''; }
      line += w + ' ';
    }
    text(line, 300, ly, { size: 8 });
    if (this.menu) this.menu.draw();
    else if (tick % 60 < 40) text('NEXT CHALLENGER APPROACHING...', 440, 290, { size: 7, align: 'center', color: '#fff' });
  }
}

class ContinueScene {
  enter() { this.n = 9; this.t = 0; Sound.playMusic(null); Sound.play('vo_youlose'); }
  update() {
    this.t++;
    if (this.t > 30 && (Input.confirm() || Game.tap)) { Sound.play('sfx_select'); return go(new VsScene()); }
    if (Input.cancel()) return go(new TitleScene());
    if (this.t % 60 === 0) { this.n--; Sound.play('sfx_move'); if (this.n < 0) go(new TitleScene()); }
  }
  draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const p = Game.run.p1;
    drawSprite(SPR[p.id].ko, W / 2, 300, 1, { scale: 1.4, alpha: 0.9 });
    bigText('CONTINUE?', W / 2, 60, 26, '#fff', '#ff2a2a');
    bigText(String(Math.max(0, this.n)), W / 2, 110, 48);
    if (tick % 50 < 34) text(Input.isTouch ? 'TAP TO CONTINUE' : 'PRESS START TO CONTINUE', W / 2, 186, { size: 8, align: 'center', color: '#ffd84a' });
  }
}

class EndingScene {
  enter() { this.t = 0; Sound.playMusic('music_title', true); Sound.play('jingle_win'); Sound.play('sfx_crowd', { vol: 0.7 }); }
  update() { this.t++; if (this.t > 120 && (Input.confirm() || Game.tap)) go(new TitleScene()); }
  draw() {
    const p = Game.run.p1;
    ctx.drawImage(IMG.title, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,20,.55)'; ctx.fillRect(0, 0, W, H);
    // confetti
    for (let i = 0; i < 60; i++) {
      const x = (i * 97 + this.t * (1 + i % 3)) % W, y = (i * 53 + this.t * (1.5 + (i % 4) * 0.5)) % H;
      ctx.fillStyle = ['#ffd84a', '#ff4d4d', '#4da3ff', '#3fe0a0'][i % 4]; ctx.fillRect(x, y, 3, 3);
    }
    drawSprite(SPR[p.id].win, 150, 330, 1, { scale: 1.6 });
    bigText('CONGRATULATIONS!', 410, 70, 16);
    text(`${p.name} IS THE NEW`, 410, 120, { size: 9, align: 'center', outline: true });
    text('CHAMPION OF THE STREETS!', 410, 136, { size: 9, align: 'center', outline: true });
    text('THE GHOST OF THE ROOFTOPS', 410, 176, { size: 7, align: 'center', color: '#bcd' });
    text('HAS BEEN DEFEATED...', 410, 190, { size: 7, align: 'center', color: '#bcd' });
    text('...FOR NOW.', 410, 214, { size: 7, align: 'center', color: '#c8f' });
    if (this.t > 120 && tick % 60 < 40) text('PRESS START', 410, 290, { size: 9, align: 'center', color: '#ffd84a', outline: true });
  }
}

/* ------------------------------ online ------------------------------ */
function startOnline(msg) {
  Game.run = { mode: 'online', p1: CHAR[msg.p1], ladder: [CHAR[msg.p2]], stage: 0, stageKey: msg.stage, mid: msg.mid };
  Game.netMid = msg.mid;
  go(new VsScene());
}
function hostStart(p1, p2) {
  const keys = Object.keys(STAGES);
  const msg = { t: 'start', mid: (Game.netMid || 0) + 1, p1, p2, stage: keys[Math.floor(Math.random() * keys.length)] };
  Net.send(msg);
  startOnline(msg);
}
Net.onMessage = msg => {
  if (msg.t === 'start') return startOnline(msg);
  if (msg.t === 'reselect') return go(new OnlineSelectScene());
  if (msg.t === 'leave') { Net.close(); return go(new NetMessageScene('YOUR RIVAL LEFT THE ROOM')); }
  if (msg.t === 'full') { Net.close(); return go(new NetMessageScene('THAT ROOM IS FULL')); }
  Game.scene.onNet && Game.scene.onNet(msg);
};
Net.onDisconnect = () => {
  if (Game.scene.isOnline || (Game.run && Game.run.mode === 'online')) go(new NetMessageScene('CONNECTION LOST'));
};
const inviteLink = () => `${location.origin}${location.pathname}?room=${Net.code}`;

class OnlineMenuScene {
  constructor(mode = 'menu', code = '') { this.mode = mode; this.code = code; this.isOnline = true; }
  enter() {
    Sound.playMusic('music_select');
    this.menu = new Menu([
      { label: 'CREATE ROOM', action: () => this.setMode('host') },
      { label: 'JOIN ROOM', action: () => this.setMode('join') },
      { label: 'BACK', action: () => go(new TitleScene()) },
    ], { y: 180, gap: 26, size: 10 });
    this.hostMenu = new Menu([
      { label: 'COPY INVITE LINK', action: () => this.share() },
      { label: 'CANCEL', action: () => { Net.close(); this.setMode('menu'); } },
    ], { y: 262, gap: 24, size: 9 });
    this.toast = ''; this.toastT = 0;
    const ui = document.getElementById('netui');
    this.input = document.getElementById('room-input');
    this.err = document.getElementById('room-error');
    this.onJoin = () => {
      const code = this.input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 5) { this.err.textContent = 'CODE IS 5 CHARACTERS'; return; }
      this.code = code; this.setMode('connecting');
    };
    this.onCancel = () => this.setMode('menu');
    this.onKey = e => { if (e.key === 'Enter') this.onJoin(); if (e.key === 'Escape') this.onCancel(); };
    document.getElementById('room-join').onclick = this.onJoin;
    document.getElementById('room-cancel').onclick = this.onCancel;
    this.input.onkeydown = this.onKey;
    this.input.oninput = () => { this.input.value = this.input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); };
    this.ui = ui;
    this.setMode(this.mode);
    if (this.mode === 'join' && this.code) { this.input.value = this.code.toUpperCase(); this.setMode('connecting'); }
  }
  setMode(m) {
    this.mode = m; this.t = 0;
    document.body.classList.toggle('netui', m === 'join');
    if (m === 'join') {
      if (!this.lastError) this.input.value = '';
      this.err.textContent = this.lastError || '';
      setTimeout(() => this.input.focus(), 50);
    }
    else this.input.blur();
    if (m === 'host') Net.host();
    if (m === 'connecting') { this.lastError = ''; Net.join(this.code); }
    if (m === 'menu') Net.close();
  }
  share() {
    const link = inviteLink();
    const done = () => { this.toast = 'INVITE LINK COPIED!'; this.toastT = 120; };
    if (navigator.share && Input.isTouch) navigator.share({ title: 'Ghost Fighter', text: `Fight me in Ghost Fighter! Room ${Net.code}`, url: link }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, () => { this.toast = link; this.toastT = 300; });
    else { this.toast = link; this.toastT = 300; }
  }
  leave() { document.body.classList.remove('netui'); }
  update() {
    this.t++;
    if (this.toastT > 0) this.toastT--;
    if (Net.connected && (this.mode === 'host' || this.mode === 'connecting')) { this.leave(); return go(new OnlineSelectScene()); }
    if (this.mode === 'menu') { if (Input.cancel()) return go(new TitleScene()); this.menu.update(); }
    else if (this.mode === 'host') {
      if (Input.cancel()) { Net.close(); return this.setMode('menu'); }
      this.hostMenu.update();
    } else if (this.mode === 'connecting') {
      if (Net.status === 'error') { this.lastError = Net.error; Net.close(); this.setMode('join'); }
      else if (Input.cancel()) this.setMode('menu');
    }
    if (Game.scene !== this) this.leave();
  }
  draw() {
    stripesBg('#08142a', '#0d1d3c', 0.5);
    bigText('ONLINE', W / 2, 30, 30, '#e8f4ff', '#3d8bff');
    text('FIGHT A FRIEND WITH A ROOM CODE', W / 2, 76, { size: 7, align: 'center', color: '#9ab' });
    const dots = '.'.repeat(1 + Math.floor(tick / 20) % 3);
    if (this.mode === 'menu') {
      this.menu.draw();
      text('BOTH PLAYERS NEED A GOOD CONNECTION', W / 2, 300, { size: 6, align: 'center', color: '#778' });
    } else if (this.mode === 'host') {
      text('YOUR ROOM CODE', W / 2, 112, { size: 9, align: 'center', color: '#ffd84a' });
      if (Net.status === 'waiting' || Net.code) {
        const code = Net.status === 'opening' ? '·····' : Net.code;
        ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 150, 130, 300, 64);
        ctx.strokeStyle = '#3d8bff'; ctx.lineWidth = 3; ctx.strokeRect(W / 2 - 150, 130, 300, 64);
        bigText(code.split('').join(' '), W / 2, 144, 32, '#ffffff', '#7cb4ff');
      }
      const status = Net.status === 'error' ? Net.error : Net.status === 'waiting' ? 'WAITING FOR YOUR RIVAL' + dots : 'CREATING ROOM' + dots;
      text(status, W / 2, 212, { size: 8, align: 'center', color: Net.status === 'error' ? '#ff6060' : '#fff' });
      text('SEND THE CODE OR THE LINK TO A FRIEND', W / 2, 232, { size: 6, align: 'center', color: '#9ab' });
      this.hostMenu.draw();
    } else if (this.mode === 'connecting') {
      text(`JOINING ROOM ${this.code}${dots}`, W / 2, 170, { size: 10, align: 'center', color: '#ffd84a' });
      text(Input.isTouch ? 'PRESS ✕ TO CANCEL' : 'ESC TO CANCEL', W / 2, 200, { size: 6, align: 'center', color: '#9ab' });
    }
    if (this.toastT > 0) text(this.toast, W / 2, 330, { size: this.toast.length > 40 ? 5 : 8, align: 'center', color: '#7cff9a', outline: true });
  }
}

class OnlineSelectScene {
  constructor() { this.isOnline = true; }
  enter() {
    Sound.playMusic('music_select');
    document.body.classList.remove('netui');
    const prev = Game.lastPicks || {};
    this.me = { cur: prev.me != null ? prev.me : (Net.isHost ? 0 : 1), locked: false };
    this.them = { cur: prev.them != null ? prev.them : (Net.isHost ? 1 : 0), locked: false, seen: false };
    this.started = false; this.t = 0;
    this.sync();
  }
  sync() { Net.send({ t: 'sel', cur: this.me.cur, locked: this.me.locked }); }
  onNet(m) {
    if (m.t === 'sel') { this.them = { cur: m.cur, locked: m.locked, seen: true }; }
    if (m.t === 'hello') this.sync();
  }
  slots() {
    const n = CHARS.length, size = 64, gap = 12, x0 = (W - (n * size + (n - 1) * gap)) / 2;
    return CHARS.map((c, i) => ({ c, x: x0 + i * (size + gap), y: 262, w: size, h: size }));
  }
  update() {
    this.t++;
    if (this.t % 30 === 0) this.sync(); // keep the rival's view fresh (covers late joins)
    const n = CHARS.length;
    if (!this.me.locked) {
      let c = this.me.cur, picked = Input.confirm();
      if (Input.pressed('left')) c = (c + n - 1) % n;
      if (Input.pressed('right')) c = (c + 1) % n;
      if (Game.tap) for (const [i, s] of this.slots().entries()) {
        if (Game.tap.x > s.x && Game.tap.x < s.x + s.w && Game.tap.y > s.y && Game.tap.y < s.y + s.h) { if (c === i) picked = true; else c = i; }
      }
      if (c !== this.me.cur) { this.me.cur = c; Sound.play('sfx_move', { vol: 0.6 }); this.sync(); }
      if (picked) { this.me.locked = true; Sound.play('sfx_select'); Sound.play('sfx_punch', { vol: 0.7 }); this.sync(); }
      if (Input.cancel()) { Net.close(); return go(new OnlineMenuScene()); }
    } else if (Input.cancel()) { this.me.locked = false; Sound.play('sfx_move'); this.sync(); }
    if (Net.isHost && this.me.locked && this.them.locked && !this.started && this.t > 20) {
      this.started = true;
      Game.lastPicks = { me: this.me.cur, them: this.them.cur };
      hostStart(CHARS[this.me.cur].id, CHARS[this.them.cur].id);
    }
    if (!Net.isHost && this.me.locked && this.them.locked) Game.lastPicks = { me: this.me.cur, them: this.them.cur };
  }
  draw() {
    stripesBg('#0e0a24', '#171037', 0.6);
    bigText('ONLINE BATTLE', W / 2, 12, 16);
    text(`ROOM ${Net.code}`, W / 2, 34, { size: 7, align: 'center', color: '#7cff9a' });
    const p1 = Net.isHost ? this.me : this.them, p2 = Net.isHost ? this.them : this.me;
    for (const [sel, x, facing, color, isMe] of [[p1, 130, 1, '#3d8bff', Net.isHost], [p2, 510, -1, '#ff3d3d', !Net.isHost]]) {
      const c = CHARS[sel.cur];
      const s = SPR[c.id][sel.locked ? 'win' : 'idle'];
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, 248, 44, 6, 0, 0, Math.PI * 2); ctx.fill();
      if (isMe || sel.seen) drawSprite(s, x, 248, facing, { scaleY: 1 + Math.sin(tick * 0.09) * 0.012 });
      text(isMe ? 'YOU' : 'RIVAL', x, 52, { size: 8, align: 'center', color: isMe ? '#7cff9a' : '#ff9090' });
      text(isMe || sel.seen ? c.name : '???', x, 66, { size: 12, align: 'center', outline: true, shadow: color });
      const st = sel.locked ? 'READY!' : isMe ? 'CHOOSE' : (sel.seen ? 'CHOOSING' : 'CONNECTING');
      text(st, x, 84, { size: 7, align: 'center', color: sel.locked ? '#ffd84a' : '#889' });
    }
    for (const [i, s] of this.slots().entries()) {
      const a = p1.cur === i, b = p2.cur === i && (this.them.seen || !Net.isHost);
      ctx.fillStyle = '#05040c'; ctx.fillRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
      ctx.fillStyle = '#1b1745'; ctx.fillRect(s.x, s.y, s.w, s.h);
      drawPortrait(s.c.id, s.x, s.y, s.w, s.h, { dim: !a && !b });
      if (a) { ctx.strokeStyle = '#3d8bff'; ctx.lineWidth = 3; ctx.strokeRect(s.x - 1.5, s.y - 1.5, s.w + 3, s.h + 3); text('1P', s.x + 2, s.y + 2, { size: 6, color: '#7cb4ff' }); }
      if (b) { ctx.strokeStyle = '#ff3d3d'; ctx.lineWidth = 3; ctx.strokeRect(s.x + 1.5, s.y + 1.5, s.w - 3, s.h - 3); text('2P', s.x + s.w - 2, s.y + s.h - 9, { size: 6, color: '#ff8080', align: 'right' }); }
      text(s.c.name, s.x + s.w / 2, s.y + s.h + 5, { size: 6, align: 'center', color: a || b ? '#ffd84a' : '#889' });
    }
    if (this.me.locked && !this.them.locked) text('WAITING FOR RIVAL...', W / 2, 236, { size: 7, align: 'center', color: '#ffd84a' });
  }
}

class OnlineResultScene {
  constructor(won) { this.won = won; this.isOnline = true; }
  enter() {
    this.t = 0; this.wantMe = false; this.wantThem = false; this.sent = false;
    Sound.playMusic(null);
    if (this.won) Sound.play('jingle_win', { vol: 0.8 });
    this.menu = new Menu([
      { label: () => this.wantMe ? 'REMATCH  (READY)' : 'REMATCH', action: () => { this.wantMe = true; Net.send({ t: 'rematch' }); } },
      { label: 'CHANGE FIGHTER', action: () => { Net.send({ t: 'reselect' }); go(new OnlineSelectScene()); } },
      { label: 'LEAVE ROOM', action: () => { Net.close(); Game.run = null; go(new TitleScene()); } },
    ], { x: 440, y: 236, gap: 22, size: 9 });
  }
  onNet(m) { if (m.t === 'rematch') this.wantThem = true; }
  update() {
    this.t++;
    if (this.t > 40) this.menu.update();
    if (Game.scene !== this) return;
    if (Net.isHost && this.wantMe && this.wantThem && !this.sent) {
      this.sent = true;
      hostStart(Game.run.p1.id, Game.run.ladder[0].id);
    }
  }
  draw() {
    const r = Game.run;
    const local = Net.isHost ? r.p1 : r.ladder[0], rival = Net.isHost ? r.ladder[0] : r.p1;
    const shown = this.won ? local : rival;
    stripesBg(this.won ? '#0b1c46' : '#3a0b0b', this.won ? '#10275e' : '#4a1010');
    drawSprite(SPR[shown.id].win, 170, 300, 1, { scale: 1.5 });
    bigText(this.won ? 'YOU WIN!' : 'YOU LOSE', 440, 70, 22, this.won ? '#fff6b0' : '#fff', this.won ? '#ff8a00' : '#ff2a2a');
    text(`${local.name} (YOU)  VS  ${rival.name}`, 440, 120, { size: 7, align: 'center' });
    text(`ROOM ${Net.code}`, 440, 136, { size: 6, align: 'center', color: '#7cff9a' });
    if (this.wantThem && !this.wantMe) text('YOUR RIVAL WANTS A REMATCH!', 440, 170, { size: 7, align: 'center', color: '#ffd84a' });
    if (this.wantMe && !this.wantThem) text('WAITING FOR RIVAL...', 440, 170, { size: 7, align: 'center', color: '#ffd84a' });
    this.menu.draw();
  }
}

class NetMessageScene {
  constructor(msg) { this.msg = msg; }
  enter() { this.t = 0; Game.run = null; document.body.classList.remove('netui', 'super-ready'); Sound.playMusic('music_title'); }
  update() { if (++this.t > 30 && (Input.confirm() || Input.cancel() || Game.tap)) go(new OnlineMenuScene()); }
  draw() {
    stripesBg('#1a0b1a', '#240f24');
    bigText('ONLINE', W / 2, 90, 24, '#e8f4ff', '#3d8bff');
    text(this.msg, W / 2, 160, { size: 10, align: 'center', color: '#ff8080', outline: true });
    if (tick % 60 < 40) text('PRESS ANY BUTTON', W / 2, 220, { size: 8, align: 'center', color: '#ffd84a' });
  }
}

/* ------------------------------ boot ------------------------------ */
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const st = document.getElementById('stage');
  st.style.width = Math.floor(W * s) + 'px';
  st.style.height = Math.floor(H * s) + 'px';
  const portrait = Input.isTouch && innerHeight > innerWidth;
  document.body.classList.toggle('portrait', portrait);
  Game.portrait = portrait;
}
addEventListener('resize', fit);
if (window.visualViewport) visualViewport.addEventListener('resize', fit); // iOS toolbars showing/hiding
addEventListener('orientationchange', () => setTimeout(fit, 200));

canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  Game.tap = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
});
document.getElementById('rotate').addEventListener('pointerdown', () => Input.toggleFullscreen(true));

Input.setupTouch();
saveSettings();
fit();
go(new LoadScene());

let last = performance.now(), acc = 0;
const STEP = 1000 / 60;
function loop(now) {
  acc += Math.min(200, now - last); last = now;
  while (acc >= STEP) {
    acc -= STEP;
    Input.update();
    // phone held upright: freeze the game (and auto-pause a fight) until rotated
    if (Game.portrait && !Net.connected) {
      if (Game.scene instanceof FightScene && !Game.scene.paused && Game.scene.phase === 'fight') Game.scene.paused = true;
      Game.tap = null;
      continue;
    }
    tick++;
    Game.scene.update();
    Game.tap = null;
  }
  Game.scene.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

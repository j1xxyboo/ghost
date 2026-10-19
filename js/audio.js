'use strict';
// SFX through WebAudio (low latency, overlapping), music through a single <audio> element
// (streams instead of decoding minutes of PCM into memory on phones).
const Sound = (() => {
  const SFX = ['sfx_punch', 'sfx_kick', 'sfx_block', 'sfx_whoosh', 'sfx_fireball', 'sfx_explode',
    'sfx_jump', 'sfx_land', 'sfx_select', 'sfx_move', 'sfx_crowd',
    'vo_round1', 'vo_round2', 'vo_final', 'vo_fight', 'vo_ko', 'vo_youwin', 'vo_youlose',
    'vo_perfect', 'vo_special', 'vo_title', 'jingle_win',
    'sfx_superflash', 'sfx_charge', 'sfx_beam', 'sfx_thunder', 'sfx_quake', 'sfx_rush', 'vo_super',
    'vo_ult_hero', 'vo_ult_kaze', 'vo_ult_volta', 'vo_ult_brutus', 'vo_ult_shade',
    'vo_ult_ryona', 'vo_special_ryona', 'sfx_bigmeow', 'sfx_hiss', 'sfx_claw',
    'vo_ult_jaxxy2', 'vo_special_jaxxy', 'sfx_bodyslam', 'vo_khufra', 'sfx_sand', 'sfx_whip', 'sfx_bounce'];
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = AC ? new AC() : null;
  const buffers = {}, fallback = {};
  let sfxGain = null, sfxVol = 0.9, musicVol = 0.6;
  if (ctx) { sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination); }

  const music = new Audio();
  music.loop = true; music.preload = 'auto';
  let musicName = null, unlocked = false;

  async function loadOne(name) {
    const url = `assets/audio/${name}.mp3`;
    try {
      if (!ctx) throw 0;
      const res = await fetch(url);
      if (!res.ok) throw 0;
      const data = await res.arrayBuffer();
      buffers[name] = await new Promise((ok, bad) => ctx.decodeAudioData(data, ok, bad));
    } catch (_) {
      // file:// or no WebAudio: fall back to media elements
      const a = new Audio(url); a.preload = 'auto'; fallback[name] = a;
    }
  }

  function load(onProgress) {
    let done = 0;
    return Promise.all(SFX.map(n => loadOne(n).then(() => onProgress(++done / SFX.length))));
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (ctx && ctx.state !== 'running') ctx.resume();
    // iOS: prime the music element inside the gesture
    music.muted = true;
    music.play().then(() => { music.pause(); music.muted = false; if (musicName) playMusic(musicName, true); })
      .catch(() => { music.muted = false; });
  }

  function play(name, { vol = 1, rate = 1 } = {}) {
    if (sfxVol <= 0) return;
    if (buffers[name] && ctx) {
      const src = ctx.createBufferSource();
      src.buffer = buffers[name];
      src.playbackRate.value = rate;
      const g = ctx.createGain(); g.gain.value = vol;
      src.connect(g).connect(sfxGain);
      src.start();
    } else if (fallback[name]) {
      const a = fallback[name].cloneNode();
      a.volume = Math.min(1, vol * sfxVol); a.playbackRate = rate;
      a.play().catch(() => {});
    }
  }

  function playMusic(name, force) {
    if (name === musicName && !force) return;
    musicName = name;
    if (!name) { music.pause(); return; }
    const src = `assets/audio/${name}.mp3`;
    if (!music.src.endsWith(src)) music.src = src;
    music.currentTime = 0;
    music.volume = musicVol;
    if (unlocked && musicVol > 0) music.play().catch(() => {});
  }

  function setVolumes(m, s) {
    musicVol = m; sfxVol = s;
    music.volume = m;
    if (m <= 0) music.pause(); else if (unlocked && musicName && music.paused) music.play().catch(() => {});
    if (sfxGain) sfxGain.gain.value = s;
  }

  // pause everything when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { music.pause(); ctx && ctx.suspend(); }
    else if (unlocked) { ctx && ctx.resume(); if (musicName && musicVol > 0) music.play().catch(() => {}); }
  });

  return { load, unlock, play, playMusic, setVolumes, get unlocked() { return unlocked; } };
})();

'use strict';
// Online play: WebRTC peer-to-peer via PeerJS. The public PeerJS server is only used to find
// the other player by room code; match traffic flows directly between the two browsers.
const Net = (() => {
  const VERSION = 'gf-9';
  const PREFIX = 'ghostfighter-' + VERSION + '-';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] };

  let peer = null, conn = null;
  const inputs = new Map(); // `${matchId}:${frame}` -> remote input mask
  const hashes = new Map();
  const lastFrame = {}; // matchId -> newest input frame received from the rival
  const S = {
    isHost: false, code: '', connected: false, status: '', error: '',
    onMessage: null, onDisconnect: null,
  };

  const makeCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

  function wire(c) {
    conn = c;
    c.on('open', () => {
      S.connected = true; S.status = 'connected';
      send({ t: 'hello', v: VERSION });
    });
    c.on('data', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'in') {
        inputs.set(msg.mid + ':' + msg.f, msg.m);
        if (!(lastFrame[msg.mid] >= msg.f)) lastFrame[msg.mid] = msg.f;
        return;
      }
      if (msg.t === 'hash') { hashes.set('r' + msg.mid + ':' + msg.f, msg.h); return; }
      if (msg.t === 'hello' && msg.v !== VERSION) { S.error = 'VERSION MISMATCH - RELOAD BOTH GAMES'; }
      S.onMessage && S.onMessage(msg);
    });
    const lost = () => {
      if (c !== conn) return; // an old connection we already replaced or closed
      const was = S.connected;
      S.connected = false; conn = null;
      if (was && S.onDisconnect) S.onDisconnect();
    };
    c.on('close', lost);
    c.on('error', lost);
  }

  function friendly(err) {
    const t = err && err.type;
    if (t === 'peer-unavailable') return 'ROOM NOT FOUND';
    if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'CANNOT REACH SERVER';
    if (t === 'browser-incompatible') return 'BROWSER NOT SUPPORTED';
    return 'CONNECTION FAILED';
  }

  function host(tries = 0) {
    close();
    S.isHost = true; S.code = makeCode(); S.status = 'opening'; S.error = '';
    peer = new Peer(PREFIX + S.code, { config: ICE });
    peer.on('open', () => { S.status = 'waiting'; });
    peer.on('connection', c => {
      if (conn) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; }
      wire(c);
    });
    peer.on('error', err => {
      if (err.type === 'unavailable-id' && tries < 4) return host(tries + 1);
      if (!S.connected) { S.error = friendly(err); S.status = 'error'; }
    });
    peer.on('disconnected', () => { if (peer && !peer.destroyed) peer.reconnect(); });
  }

  function join(code) {
    close();
    S.isHost = false; S.code = code.toUpperCase(); S.status = 'connecting'; S.error = '';
    peer = new Peer({ config: ICE });
    peer.on('open', () => {
      wire(peer.connect(PREFIX + S.code, { reliable: true, serialization: 'json' }));
      setTimeout(() => { if (!S.connected && S.status === 'connecting') { S.error = 'ROOM NOT FOUND'; S.status = 'error'; } }, 12000);
    });
    peer.on('error', err => { if (!S.connected) { S.error = friendly(err); S.status = 'error'; } });
  }

  function send(msg) { if (conn && conn.open) conn.send(msg); }

  function close() {
    // detach first: closing our own side must not fire the "connection lost" handler
    const c = conn, p = peer;
    peer = null; conn = null; S.connected = false; S.status = ''; inputs.clear(); hashes.clear();
    if (c) { try { if (c.open) c.send({ t: 'leave' }); c.close(); } catch (_) {} }
    if (p) { try { p.destroy(); } catch (_) {} }
  }

  // ---- lockstep helpers ----
  function remoteInput(mid, f) {
    const k = mid + ':' + f;
    if (!inputs.has(k)) return undefined;
    const m = inputs.get(k); inputs.delete(k);
    return m;
  }
  function checkHash(mid, f, h) {
    hashes.set('l' + mid + ':' + f, h);
    const r = hashes.get('r' + mid + ':' + f);
    if (r === undefined) return null;
    hashes.delete('r' + mid + ':' + f);
    return r === h;
  }
  function remoteHashFor(mid, f) {
    const l = hashes.get('l' + mid + ':' + f), r = hashes.get('r' + mid + ':' + f);
    if (l === undefined || r === undefined) return null;
    return l === r;
  }
  window.addEventListener('beforeunload', () => close());

  const lastRemoteFrame = mid => (lastFrame[mid] === undefined ? -1 : lastFrame[mid]);
  return Object.assign(S, { host, join, send, close, remoteInput, checkHash, remoteHashFor, lastRemoteFrame, VERSION });
})();

// 효과음 (Kenney RPG Audio / Interface Sounds, CC0). ogg 를 못 트는 브라우저에서는 조용히 넘어간다.
WS.Sfx = (() => {
  const FILES = {
    door_open: 'door_open', door_close: 'door_close', coins: 'coins', coins2: 'coins2',
    blade: 'blade', page: 'page', cloth: 'cloth', latch: 'latch', creak: 'creak', click: 'click',
    knock: 'knock.wav', // 문 두드리는 소리 (직접 합성한 나무 문 타격음)
  };
  const KEY = 'armsdealer_muted';
  const VKEY = 'armsdealer_volume';
  const MAX_GAIN = 0.6; // 최대 음량은 예전의 60% (사용자 요청: 최대 음량 40% 감소)
  let muted = false, vol = 1; // vol: 0~1 (슬라이더). 실제 음량 = 효과음 기본값 × vol × MAX_GAIN
  try {
    muted = localStorage.getItem(KEY) === '1';
    const v = parseFloat(localStorage.getItem(VKEY));
    if (v >= 0 && v <= 1) vol = v;
  } catch (e) { /* 저장소 없음 */ }
  const ok = (() => { try { return !!new Audio().canPlayType('audio/ogg'); } catch (e) { return false; } })();
  const sfxPath = f => `assets/sfx/${f.includes('.') ? f : f + '.ogg'}`;
  const pool = {};

  function play(name, volume = 0.6) {
    if (muted || !ok || !FILES[name]) return;
    try {
      const a = (pool[name] = pool[name] || new Audio(sfxPath(FILES[name]))).cloneNode();
      a.volume = Math.min(1, Math.max(0, volume * vol * MAX_GAIN));
      a.play().catch(() => {});
    } catch (e) { /* 재생 실패는 무시 */ }
  }

  // 로딩 화면에서 미리 받아 둔다 — 첫 재생 때 끊기지 않게. 끝났거나 실패하면 resolve (3초 상한)
  function preload() {
    if (!ok) return [];
    return Object.entries(FILES).map(([name, file]) => new Promise(res => {
      const a = pool[name] = pool[name] || new Audio(sfxPath(file));
      a.preload = 'auto';
      const done = () => res();
      a.addEventListener('canplaythrough', done, { once: true });
      a.addEventListener('error', done, { once: true });
      setTimeout(done, 3000);
      a.load();
    }));
  }

  function toggle() {
    muted = !muted;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* 무시 */ }
  }

  function setVolume(v) {
    vol = Math.min(1, Math.max(0, +v || 0));
    try { localStorage.setItem(VKEY, String(vol)); } catch (e) { /* 무시 */ }
  }

  return { play, toggle, preload, setVolume, get volume() { return vol; }, get muted() { return muted; }, get supported() { return ok; } };
})();

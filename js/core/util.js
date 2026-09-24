// 전역 네임스페이스와 공용 유틸. 모든 스크립트는 classic <script>로 로드되어 file:// 에서도 동작한다.
window.WS = window.WS || {};
WS.data = WS.data || {};
WS.sys = WS.sys || {};

WS.util = (() => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const range = v => (Array.isArray(v) ? randInt(v[0], v[1]) : v);
  const copy = o => JSON.parse(JSON.stringify(o));
  const round1 = v => Math.round(v * 10) / 10;

  function weightedPick(list, weightFn) {
    const total = list.reduce((s, x) => s + Math.max(0, weightFn(x)), 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const x of list) {
      r -= Math.max(0, weightFn(x));
      if (r <= 0) return x;
    }
    return list[list.length - 1];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const fmtTime = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  // "{item} {qty}개" 같은 템플릿 치환
  const fill = (text, ctx) =>
    String(text).replace(/\{(\w+)\}/g, (m, k) => (ctx && ctx[k] !== undefined ? ctx[k] : m));

  const esc = s =>
    String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 받침에 따라 조사 고르기: josa('왕국', '과', '와') → '왕국과', josa('드워프', '과', '와') → '드워프와'
  const josa = (word, withJong, noJong) => {
    const w = String(word);
    const code = w.charCodeAt(w.length - 1) - 0xac00;
    return w + (code >= 0 && code <= 11171 && code % 28 !== 0 ? withJong : noJong);
  };

  let uidSeq = 0;
  const uid = p => `${p || 'u'}${Date.now().toString(36)}${(uidSeq++).toString(36)}`;

  return { clamp, rand, randInt, pick, range, copy, round1, weightedPick, shuffle, fmtTime, fill, esc, uid, josa };
})();

// 가게 상태 레이어 그리기 — 표는 js/data/decor.js, 조건 평가는 js/systems/Decor.js. Scene.js 가 매 프레임 step() 과 draw(layer) 를 부른다.
//  · 절차형(rects) 항목은 한 번 오프스크린 캔버스로 구워 두고 drawImage 만 한다 (수십 개여도 프레임 비용은 그림 몇 장 값)
//  · dyn(움직이는 것)은 작은 캔버스에 매 프레임 그린 뒤 얹는다 · src(그림)는 파일이 없으면 onerror 로 건너뛴다
//  · 켜지면 0.5초에 걸쳐 나타나고 꺼지면 0.5초에 걸쳐 사라진다. 새로 켜진 것은 작은 알림(토스트)을 한 번 띄운다
WS.DecorLayer = (() => {
  const W = 144;
  const FADE = 0.5;        // 초
  const TICK = 0.25;       // 조건을 다시 보는 간격 (초)
  const S = () => WS.Game.state;
  const D = () => WS.sys.Decor;
  const win = () => WS.data.decor.window;

  const art = {};          // id → Image (src 항목)
  const cache = {};        // id → { c: canvas, x, y } (rects 항목)
  const fade = {};         // id → 0..1
  let realOn = new Set();  // 조건이 실제로 참인 id (개발 패널 덮어쓰기 전)
  let effective = new Set();
  let lastTick = -9, lastTime = null, primed = false;
  const scratch = document.createElement('canvas');
  const dev = { mode: 'auto', ids: {} };   // 개발 패널: 'auto' 실제 조건대로 / 'on' 전부 / 'off' 전부 숨김, ids 는 하나씩 덮어쓰기 { id: true|false }

  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const isImg = e => !!e.src;

  // 그림 파일은 그 데코가 켜질 때에야 부른다 (없는 파일을 미리 다 부르면 콘솔에 404 가 줄줄이 뜬다). 없으면 onerror 로 실패를 적어 두고 건너뛴다
  function loadArt(e) {
    if (art[e.id]) return art[e.id];
    const im = new Image();
    im.onerror = () => { im.failed = true; };
    im.src = e.src;
    return (art[e.id] = im);
  }
  const drawable = (e, peek) => {
    if (isImg(e)) { const im = peek ? art[e.id] : loadArt(e); return !!(im && im.complete && im.naturalWidth && !im.failed); }
    return !!(e.rects || e.dyn);
  };
  // 엔진이 "알림을 띄워도 되는가" 를 물을 때 — true 그릴 수 있다 / false 그림이 없다(알리지 않는다) / null 그림을 부르는 중(잠시 뒤 다시 묻는다)
  D().readyFn = e => {
    if (!isImg(e)) return true;
    const im = loadArt(e);
    if (im.failed) return false;
    return im.complete ? !!im.naturalWidth : null;
  };

  function bake(e) {
    if (cache[e.id]) return cache[e.id];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    e.rects.forEach(([x, y, w, h]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h); });
    const c = document.createElement('canvas');
    c.width = x1 - x0; c.height = y1 - y0;
    const g = c.getContext('2d');
    e.rects.forEach(([x, y, w, h, col]) => { g.fillStyle = col; g.fillRect(x - x0, y - y0, w, h); });
    return (cache[e.id] = { c, x: x0, y: y0 });
  }

  // 켜짐/꺼짐 — 개발 패널 덮어쓰기까지 반영
  function want(e) {
    if (dev.ids[e.id] !== undefined) return dev.ids[e.id];
    if (dev.mode === 'on') return true;
    if (dev.mode === 'off') return !!e.base;
    return realOn.has(e.id);
  }

  function evaluate(time) {
    const st = S();
    if (!st) { realOn = new Set(); effective = new Set(); return; }
    const r = D().update(st);
    realOn = new Set(r.on.map(e => e.id));
    effective = new Set(D().list().filter(want).map(e => e.id));
    // 처음 평가(새 게임·불러오기 직후)는 애니메이션 없이 곧바로 켠다
    if (!primed) { primed = true; effective.forEach(id => { fade[id] = 1; }); }
    r.fresh.forEach(e => toast(D().toastText(e)));
  }

  function step(time) {
    const dt = lastTime === null ? 0 : Math.min(0.1, time - lastTime);
    lastTime = time;
    if (time - lastTick >= TICK) { lastTick = time; evaluate(time); }
    D().list().forEach(e => {
      const f = fade[e.id] || 0, target = effective.has(e.id) ? 1 : 0;
      if (f === target) return;
      fade[e.id] = target > f ? Math.min(1, f + dt / FADE) : Math.max(0, f - dt / FADE);
    });
  }

  // 위아래·좌우 흔들림 (픽셀이 깨지지 않게 정수로)
  function wobble(e, t) {
    const ph = (hash(e.id) % 628) / 100;
    if (e.anim === 'sway') return { dx: Math.round(Math.sin(t * 1.3 + ph) * 1.3), dy: 0, a: 1 };
    if (e.anim === 'bob') return { dx: 0, dy: Math.round(Math.sin(t * 1.7 + ph)), a: 1 };
    if (e.anim === 'peck') return { dx: 0, dy: (t + ph) % 3.7 < 0.22 ? 1 : 0, a: 1 };
    if (e.anim === 'flicker') return { dx: 0, dy: 0, a: 0.72 + 0.28 * (hash(e.id + Math.floor(t * 7)) % 100) / 100 };
    return { dx: 0, dy: 0, a: 1 };
  }

  // layer: 'street' | 'window' | 'shop' | 'counter'.  dy = 그림 좌표 → 화면 y 보정(Scene 의 artDy)
  function draw(ctx, layer, time, dy) {
    const st = S();
    if (!st || !D()) return;
    const items = D().list().filter(e => e.layer === layer && (fade[e.id] || 0) > 0.01 && drawable(e));
    if (!items.length) return;
    items.sort((a, b) => (a.z || 0) - (b.z || 0));
    const street = layer === 'street', w = win();
    ctx.save();
    if (street) { ctx.beginPath(); ctx.rect(w.x, w.y + dy, w.w, w.h); ctx.clip(); ctx.translate(w.x, w.y + dy); } else ctx.translate(0, dy);
    for (const e of items) {
      const o = wobble(e, time);
      ctx.globalAlpha = fade[e.id] * o.a;
      if (isImg(e)) ctx.drawImage(art[e.id], e.x + o.dx, e.y + o.dy);
      else if (e.rects) { const b = bake(e); ctx.drawImage(b.c, b.x + o.dx, b.y + o.dy); }
      else if (e.dyn) {
        const sw = street ? w.w : W, sh = street ? w.h : 256 + 90;
        if (scratch.width !== sw || scratch.height !== sh) { scratch.width = sw; scratch.height = sh; }
        const g = scratch.getContext('2d');
        g.clearRect(0, 0, sw, sh);
        g.globalAlpha = 1;
        e.dyn(g, time, st);
        ctx.drawImage(scratch, o.dx, o.dy);
      }
    }
    ctx.restore();
  }

  function reset() {
    primed = false; lastTick = -9;
    Object.keys(fade).forEach(k => delete fade[k]);
    realOn = new Set(); effective = new Set();
  }

  // ───────── 알림 (새로 켜진 데코 한 줄) ─────────
  const queue = [];
  let showing = false;
  function toast(text) {
    if (queue.length < 6) queue.push(text);
    pump();
  }
  function pump() {
    if (showing || !queue.length) return;
    const stage = document.getElementById('stage'), cv = document.getElementById('scene');
    if (!stage || !cv) { queue.length = 0; return; }
    showing = true;
    const el = document.createElement('div');
    el.className = 'decor-toast';
    el.setAttribute('role', 'status');
    el.textContent = queue.shift();
    const sr = stage.getBoundingClientRect(), cr = cv.getBoundingClientRect();
    el.style.left = `${cr.left - sr.left + cr.width / 2}px`;
    el.style.top = `${cr.top - sr.top + Math.max(92, cr.height * 0.13)}px`; // 위쪽 금화·시계 줄과 "응대 테이블" 제목 아래
    el.style.maxWidth = `${Math.max(140, cr.width - 28)}px`;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 3300);
    setTimeout(() => { showing = false; pump(); }, 3500);
  }

  // 개발 패널 도우미
  const state = () => ({ realOn: [...realOn], effective: [...effective], drawable: id => { const e = D().byId(id); return !!e && drawable(e); } });
  const forceEval = () => { lastTick = -9; };
  const refresh = () => evaluate(performance.now() / 1000);
  const wants = id => { const e = D().byId(id); return !!e && want(e); };

  return { step, draw, reset, toast, dev, state, forceEval, refresh, wants, drawable };
})();

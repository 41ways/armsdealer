// 결말 컷신(제목 카드 · 정체 공개) — 스톱모션처럼: 부드럽게 움직이지 않고 한 컷을 350~500ms씩 붙잡았다가 넘긴다.
// 컷마다 인물 자리가 1~2px 흔들리고 밝기가 살짝 떨려서 손으로 옮겨 찍은 느낌이 난다.
// 모든 엔딩이 컷신을 본다: 제목 자막 → (endings.js 에 cinematic: '<id>' 가 있으면 정체 드러내기). 결과 그림 세 장(assets/ending/<id>_outcome_1..3.png, outcomeFor)은 컷신이 아니라 결말 화면 앨범(UIManager.ending)이 보여 준다. UIManager.playCinema 가 튼다.
// 누르거나 아무 키나 누르면 건너뛴다. 그림이 없으면(404) 그 인물 없이 지나간다.
WS.Cinematic = (() => {
  const W = 144, K = 4; // 논리 144px 장면을 4배 캔버스에 — 배경은 ×4, 인물 원화는 ×2 로 원화 픽셀을 살린다
  const BG = 'assets/scene/shop_bg.png';
  const imgs = {};
  const I = src => imgs[src] || (imgs[src] = Object.assign(new Image(), { src }));
  const ok = im => im && im.complete && im.naturalWidth;
  const ART_H = 256, ART_COUNTER = 131, HAND_SHOW = 34;
  const ART_PLATE = 128; // 카운터 앞면 철판의 윗줄 — 인물은 여기서부터 가려야 철판 위에 얹혀 보이지 않는다
  // 그림 속 문짝 안쪽 (shop_bg 기준 좌표)
  const DOOR = { x: 57, y: 49, w: 30, h: 50 };

  // ───────── 컷신 대본 ─────────
  // 컷: { hold(ms), door: 'closed'|'ajar'|'open', fig: { src, x(가운데), top, s(원화 1px → 논리 px), dim(밝기), floor(치맛자락을 늘일 바닥선) }, sfx, line, flashIn }
  // 좌표는 배경 그림 기준(카운터 윗선 131) — 화면 높이가 다르면 그림처럼 아래에 맞춘다
  // 검은 화면(제목 자막, playReveal 이 재생 때마다 그 결말의 title 로 직접 그린다) → 문 열리는 소리 + 화면이 밝아지며(flashIn) 이미 카운터 앞에 서 있는
  // 모습으로 시작 → 원화 2~4장(손을 올림 · 벗음 · 정체) → 대사. 걸어 들어오는 중간 컷을 없앤 건 그 자리가 카운터와 어색하게 겹쳐 보였기 때문.
  // 원화 네 장(141×304, 투명)만 있으면 누구든 같은 흐름으로 (last: 마지막 장의 효과음)
  const reveal = (name, speaker, line, last) => {
    const F = n => `assets/ending/${name}_${n}.png`;
    return {
      speaker, line,
      cuts: [
        // top 55 — 손이 카운터 위로 삐져나와 "테이블 위에 얹힌" 것처럼 보이던 것을 고쳐, 손이 카운터 뒤로 깨끗이 숨고
        // 평소 손님처럼 가슴 위쪽만 보이게 맞췄다 (Scene.js 의 일반 손님 자리와 같은 원리)
        { hold: 1900, door: 'closed', fig: { src: F(1), x: 72, top: 55, s: 0.5, dim: 1 }, sfx: ['door_open', 0.55], flashIn: true },
        { hold: 640, door: 'closed', sfx: ['cloth', 0.5], fig: { src: F(2), x: 72, top: 55, s: 0.5, dim: 1 } },
        { hold: 700, door: 'closed', fig: { src: F(3), x: 72, top: 55, s: 0.5, dim: 1 } },
        { hold: 1500, door: 'closed', sfx: last, fig: { src: F(4), x: 72, top: 55, s: 0.5, dim: 1 } },
        { hold: 2800, door: 'closed', fig: { src: F(4), x: 72, top: 55, s: 0.5, dim: 1 }, line: true },
      ],
    };
  };
  const SCRIPTS = {
    // 「두건을 벗은 왕」 — 카운터 앞에 이미 선 두건 쓴 청년이 두건을 벗는다
    prince_reveal: reveal('prince_reveal', '알드릭', '…나를 알아보겠나, 상인?', ['blade', 0.35]),
    // 「베일을 걷은 여왕」 — 카운터 앞에 이미 선 베일 쓴 수녀가 베일을 걷는다
    princess_reveal: reveal('princess_reveal', '세레나', '구호소 물약, 기억하고 있어요.', ['coins', 0.3]),
  };
  const has = id => !!SCRIPTS[id];

  // ───────── "그 뒤" 컷신 (모든 엔딩) ─────────
  // 엔딩 id 마다 assets/ending/<그림 접두사>_outcome_1..3.png 세 장이 있으면 그 장면을 붙잡는다 (브라우저는 폴더를 못 읽으니 id 를 여기 한 곳에 적어 둔다).
  // 그림이 새로 생기면 OUTCOME_IDS 에만 더하면 된다. 접두사가 엔딩 id 와 다르면 ART_ALIAS 에.
  const OUTCOME_IDS = [
    'smuggle_king', 'bankrupt', 'red_ford_again', 'double_dealer', 'demonlord_dominion', 'dragon_ash', 'grey_march', 'night_court',
    'goblin_nation', 'dragon_nest', 'dragonfall', 'moonlit_market', 'star_guests', 'forest_benefactor', 'informant', 'perfect_ledger',
    'balance_keeper', 'pin_heir', 'iron_king', 'candle_queen', 'golem_age', 'thunder_age', 'knight_commander', 'kingdom_armory',
    'steel_age', 'fairy_friend', 'neutral', 'opportunist',
  ];
  const ART_ALIAS = { candle_queen: 'queen', opportunist: 'double_dealer' }; // opportunist: 새 그림이 나오기 전까지 박쥐 그림을 임시로
  const outcomeFor = id => {
    if (!OUTCOME_IDS.includes(id)) return null;
    const name = ART_ALIAS[id] || id;
    return { id, frames: [1, 2, 3].map(n => `assets/ending/${name}_outcome_${n}.png`) };
  };
  const outcomeSrcs = o => o.frames;
  // 결말이 정해질 때 미리 받기 시작한다 (첫 로딩을 가볍게) — 제목 자막이 뜨는 동안 나머지가 온다
  const preload = id => {
    const o = outcomeFor(id); if (o) outcomeSrcs(o).forEach(I);
    const it = introFor(id); if (it) it.frames.forEach(I);
  };
  // 도입 컷 — WS.data.endingArt[id].intro = { speaker, line, frames:[f1, f2] } (js/data/ending_art.js). 없으면 null
  const introFor = id => {
    const a = WS.data && WS.data.endingArt && WS.data.endingArt[id];
    const it = a && a.intro;
    return it && Array.isArray(it.frames) && it.frames.length >= 1 && it.line ? it : null;
  };
  // 이 결말에서 틀 컷신이 있는가 (1단계 정체 드러내기 또는 그 뒤 컷)
  const available = (id, revealId) => !!(SCRIPTS[revealId] || outcomeFor(id) || introFor(id));

  const SHARED = [BG, 'assets/scene/hand_L.png', 'assets/scene/hand_R.png', 'assets/scene/magnifier.png'];
  const srcsOf = sc => [...new Set(SHARED.concat(sc.cuts.filter(c => c.fig).map(c => c.fig.src)))];
  // 로딩 화면(Boot)이 미리 받아 둘 그림 — 여기서 Image 를 만들어 두어야 컷신 첫 컷에 그림이 빠지지 않는다
  const assets = () => [...new Set(Object.values(SCRIPTS).flatMap(srcsOf))].map(src => (I(src), src));
  // 그림이 다 왔는지 (404 로 실패한 것도 "끝남"으로 친다)
  const settled = sc => srcsOf(sc).every(src => I(src).complete);

  // ───────── 한 컷 그리기 ─────────
  // 검은 화면 제목 자막 — "ENDING" 작게, 그 아래 결말 제목. 문/인물 없이 이것만 그리고 끝낸다
  function drawTitleCard(g, H, title) {
    g.fillStyle = '#050302';
    g.fillRect(0, 0, W * K, H * K);
    const cx = W * K / 2, cy = H * K * 0.46;
    g.textAlign = 'center';
    g.fillStyle = 'rgba(232,220,192,.6)';
    g.font = `${Math.round(6.5 * K)}px 'Noto Sans KR', sans-serif`;
    g.fillText('E N D I N G', cx, cy);
    g.fillStyle = '#e8dcc0';
    g.font = `700 ${Math.round(13 * K)}px 'Gowun Batang', serif`;
    g.fillText(title || '', cx, cy + 19 * K);
  }

  function drawCut(g, H, cut, jit) {
    if (cut.title !== undefined) { drawTitleCard(g, H, cut.title); return; }
    const dy = H - ART_H;
    const bg = I(BG);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#050302';
    g.fillRect(0, 0, W * K, H * K);
    if (ok(bg)) {
      if (dy > 0) g.drawImage(bg, 0, 0, W, 1, 0, 0, W * K, dy * K);
      g.drawImage(bg, 0, 0, W, ART_H, 0, dy * K, W * K, ART_H * K);
    }
    // 문 — 열리면 바깥 밤거리가 보인다 (살짝 열림: 오른쪽 틈만)
    if (cut.door !== 'closed') {
      const gap = cut.door === 'ajar' ? 7 : DOOR.w;
      const x = (DOOR.x + DOOR.w - gap) * K, y = (DOOR.y + dy) * K;
      const night = g.createLinearGradient(0, y, 0, y + DOOR.h * K);
      night.addColorStop(0, '#0a0e1c'); night.addColorStop(0.75, '#131a2c'); night.addColorStop(1, '#222b3e');
      g.fillStyle = night;
      g.fillRect(x, y, gap * K, DOOR.h * K);
      if (cut.door === 'open') { // 안쪽으로 젖혀진 문짝 모서리
        g.fillStyle = '#1c120b';
        g.fillRect(DOOR.x * K, y, 3 * K, DOOR.h * K);
      }
    }
    const f = cut.fig;
    const im = f && I(f.src);
    if (ok(im)) {
      const s = f.s * K;
      const w = Math.round(im.naturalWidth * s), h = Math.round(im.naturalHeight * s);
      const x = Math.round(f.x * K - w / 2 + jit.x), y = Math.round((f.top + dy) * K + jit.y);
      g.save();
      if (f.dim < 1 && 'filter' in g) g.filter = `brightness(${f.dim})`;
      g.drawImage(im, x, y, w, h);
      // 멀리 선 인물: 망토 자락(원화 맨 아랫줄)을 바닥까지 늘인다 — 허리에서 잘린 그림이 떠 보이지 않게
      if (f.floor !== undefined) {
        const fy = (f.floor + dy) * K;
        if (fy > y + h) g.drawImage(im, 0, im.naturalHeight - 1, im.naturalWidth, 1, x, y + h - 1, w, fy - (y + h) + 1);
      }
      g.restore();
    }
    // 카운터(테이블)를 인물 앞에 다시 덮는다
    if (ok(bg)) g.drawImage(bg, 0, ART_PLATE, W, ART_H - ART_PLATE, 0, (ART_PLATE + dy) * K, W * K, (ART_H - ART_PLATE) * K);
    // 내 손과 테이블 위 확대경 (장면 Scene.js 와 같은 자리)
    const L = I('assets/scene/hand_L.png'), R = I('assets/scene/hand_R.png'), M = I('assets/scene/magnifier.png');
    if (ok(L)) g.drawImage(L, 6 * K, (H - HAND_SHOW) * K, L.naturalWidth * K, L.naturalHeight * K);
    if (ok(R)) g.drawImage(R, (W - 6 - R.naturalWidth) * K, (H - HAND_SHOW) * K, R.naturalWidth * K, R.naturalHeight * K);
    if (ok(M)) {
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(M, 11 * K, (H - HAND_SHOW - 29) * K, 46 * K, Math.round(46 * M.naturalHeight / M.naturalWidth) * K);
      g.imageSmoothingEnabled = false;
    }
    // 밤의 가게: 가장자리를 어둡게 + 필름처럼 밝기가 컷마다 살짝 떨린다
    const v = g.createRadialGradient(W * K / 2, H * K * 0.45, H * K * 0.16, W * K / 2, H * K * 0.5, H * K * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.78)');
    g.fillStyle = v; g.fillRect(0, 0, W * K, H * K);
    g.fillStyle = `rgba(8,10,30,${0.22 + jit.flick})`;
    g.fillRect(0, 0, W * K, H * K);
  }

  // ───────── 재생 ─────────
  let cur = null; // { el, timers, done, keyH }
  const playing = () => !!cur;

  function finish() {
    if (!cur) return;
    const c = cur;
    cur = null;
    c.timers.forEach(clearTimeout);
    document.removeEventListener('keydown', c.keyH, true);
    c.el.classList.add('out');
    setTimeout(() => c.el.remove(), 260);
    c.done && c.done();
  }

  function playReveal(sc, title, done) {
    const stage = document.getElementById('stage');
    if (!sc || !stage) { done && done(); return; }
    if (cur) finish();
    const rect = stage.getBoundingClientRect();
    const H = Math.max(240, Math.min(340, Math.round((W * rect.height) / (rect.width || 1))));
    const el = document.createElement('div');
    el.className = 'cine';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '결말 장면 — 누르면 넘어간다');
    el.innerHTML = `<canvas width="${W * K}" height="${H * K}"></canvas>
      <div class="cine-flash"></div>
      <div class="cine-cap" hidden><b>${WS.util.esc(sc.speaker || '')}</b><p>${WS.util.esc(sc.line || '')}</p></div>
      <div class="cine-skip">눌러서 넘기기 ▸▸</div>`;
    stage.appendChild(el);
    const g = el.querySelector('canvas').getContext('2d');
    const cap = el.querySelector('.cine-cap');
    const flash = el.querySelector('.cine-flash');
    const keyH = e => { if (e.repeat) return; e.preventDefault(); e.stopPropagation(); finish(); };
    cur = { el, timers: [], done, keyH };
    const me = cur;
    el.addEventListener('click', e => { e.stopPropagation(); finish(); });
    document.addEventListener('keydown', keyH, true);
    // 검은 화면 제목 자막(문/인물 없이 그 결말의 제목만) 을 맨 앞에 붙인다 — sc.cuts 자체는 그대로 두고 재생할 때만 이어 붙인다
    const cuts = [{ title: title || '', hold: 1500 }, ...sc.cuts];
    // 한 컷이 길면 같은 컷을 여러 번 다시 "찍는다" (자리 · 밝기만 살짝 달리)
    const shots = [];
    cuts.forEach(cut => {
      const n = Math.max(1, Math.round(cut.hold / 450)); // 한 장은 350~520ms 정도
      for (let i = 0; i < n; i++) shots.push({ cut, ms: cut.hold / n, first: i === 0 });
    });
    const rnd = () => Math.round((Math.random() * 2 - 1) * 1.5);
    let i = 0;
    const next = () => {
      if (cur !== me) return;
      if (i >= shots.length) { finish(); return; }
      const s = shots[i++];
      drawCut(g, H, s.cut, { x: s.cut.fig ? rnd() : 0, y: s.cut.fig ? Math.round(Math.random() * 1.5) : 0, flick: Math.random() * 0.06 });
      if (s.first && s.cut.sfx) WS.Sfx.play(...s.cut.sfx);
      // flashIn — 문 여는 소리와 함께, 이미 그려진 장면을 덮은 검은 막을 부드럽게 걷어 "화면이 밝아지는" 느낌을 낸다
      if (s.first && s.cut.flashIn) { flash.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => flash.classList.remove('on'))); }
      if (s.cut.line) cap.hidden = false;
      me.timers.push(setTimeout(next, s.ms));
    };
    // 검은 막(화면 전환)이 걷히고 그림이 다 온 뒤에 시작한다 (그림은 최대 3초까지만 기다린다) — 그 전에는 첫 컷만 깔아 둔다
    drawCut(g, H, cuts[0], { x: 0, y: 0, flick: 0 });
    const t0 = performance.now();
    const wait = () => {
      if (cur !== me) return;
      const curtain = document.getElementById('curtain');
      const busy = (curtain && curtain.classList.contains('on')) || (!settled(sc) && performance.now() - t0 < 3000);
      if (busy) { me.timers.push(setTimeout(wait, 100)); return; }
      next();
    };
    wait();
  }

  // ───────── 제목 카드만 재생 — 정체 공개 컷이 없는 결말. 카드가 지나면 곧바로 결말 화면(왼쪽 문구 + 오른쪽 앨범) ─────────
  function playTitle(title, done) {
    const stage = document.getElementById('stage');
    if (!stage) { done && done(); return; }
    if (cur) finish();
    const el = document.createElement('div');
    el.className = 'cine';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '결말 제목 — 누르면 넘어간다');
    const rect = stage.getBoundingClientRect();
    const H = Math.max(240, Math.min(340, Math.round((W * rect.height) / (rect.width || 1))));
    el.innerHTML = `<canvas width="${W * K}" height="${H * K}"></canvas><div class="cine-skip">눌러서 넘기기 ▸▸</div>`;
    stage.appendChild(el);
    drawTitleCard(el.querySelector('canvas').getContext('2d'), H, title || '');
    const keyH = e => { if (e.repeat) return; e.preventDefault(); e.stopPropagation(); finish(); };
    cur = { el, timers: [], done, keyH };
    const me = cur;
    el.addEventListener('click', e => { e.stopPropagation(); finish(); });
    document.addEventListener('keydown', keyH, true);
    // 검은 막(화면 전환)이 걷힌 뒤부터 1.5초
    const wait = () => {
      if (cur !== me) return;
      const curtain = document.getElementById('curtain');
      if (curtain && curtain.classList.contains('on')) { me.timers.push(setTimeout(wait, 100)); return; }
      me.timers.push(setTimeout(() => { if (cur === me) finish(); }, 1500));
    };
    wait();
  }

  // revealId — 정체 드러내기(endings.js 의 cinematic) 대본 id (없을 수 있다) · id — 엔딩 id (앨범 그림을 미리 받는다)
  // 흐름: 제목 카드 (→ 있으면 정체 드러내기) → 결말 화면. 결과 컷 세 장은 스톱모션이 아니라 결말 화면의 앨범에서 넘겨 본다
  function play(revealId, id, title, done) {
    preload(id);
    const sc = SCRIPTS[revealId];
    const after = () => playIntro(id, done);
    if (sc) playReveal(sc, title, after);
    else playTitle(title, after);
  }

  // ───────── 도입 컷 — 엔딩에 어울리는 사람이 와서 대사 한 줄 (스톱모션 2컷 + 타자 대사) → 고서 ─────────
  // frames[0] 0.9초 → frames[1] (즉시 교체, 보간 없음). 대사가 다 뜬 뒤 1.2초 유지하고 페이드. 누르면 대사 완성 → 한 번 더 누르면 건너뜀
  function playIntro(id, done) {
    const it = introFor(id), stage = document.getElementById('stage');
    if (!it || !stage) { done && done(); return; }
    if (cur) finish();
    const f = it.frames;
    const el = document.createElement('div');
    el.className = 'cine ci-intro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '결말 도입 — 누르면 대사를 완성하고, 한 번 더 누르면 넘어간다');
    el.innerHTML = `<img class="ci-img" alt="" draggable="false" src="${WS.util.esc(f[0])}">
      <div class="ci-say"><small>${WS.util.esc(it.speaker || '')}</small><p aria-live="polite"></p></div>
      <button type="button" class="ci-book" hidden aria-label="결말 보기"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 5h17a4 4 0 0 1 4 4v18H9a4 4 0 0 1-4-4z" fill="currentColor"/><path d="M5 23a4 4 0 0 1 4-4h17" fill="none" stroke="#2b1608" stroke-width="1.6"/><path d="M11 9h10M11 13h7" stroke="#2b1608" stroke-width="1.6"/></svg><span>결말 보기</span></button>`;
    stage.appendChild(el);
    const bookBtn = el.querySelector('.ci-book');
    const img = el.querySelector('.ci-img'), p = el.querySelector('.ci-say p');
    const chars = Array.from(it.line);
    let typed = 0, doneTyping = false;
    const keyH = e => {
      if (e.repeat) return;
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!doneTyping) complete(); else finish(); }
    };
    cur = { el, timers: [], done, keyH };
    const me = cur;
    const later = (fn, ms) => me.timers.push(setTimeout(() => { if (cur === me) fn(); }, ms));
    const complete = () => { typed = chars.length; p.textContent = it.line; doneTyping = true; bookBtn.hidden = false; };
    // 화면을 누르면 대사만 즉시 완성 — 넘어가는 건 '결말 보기' 책 버튼(또는 Enter/Space)뿐
    el.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('.ci-book')) finish(); else if (!doneTyping) complete(); });
    document.addEventListener('keydown', keyH, true);
    el.style.visibility = 'hidden';
    const t0 = performance.now();
    const start = () => {
      if (cur !== me) return;
      const curtain = document.getElementById('curtain');
      const settledAll = f.every(src => I(src).complete);
      if ((curtain && curtain.classList.contains('on')) || (!settledAll && performance.now() - t0 < 3000)) { later(start, 100); return; }
      if (!ok(I(f[0]))) { finish(); return; } // 그림이 없으면 건너뛴다
      el.style.visibility = '';
      if (f[1] && ok(I(f[1]))) later(() => { img.src = f[1]; }, 900);
      const tick = () => {
        if (doneTyping) return;
        typed++; p.textContent = chars.slice(0, typed).join('');
        if (typed >= chars.length) { complete(); return; }
        later(tick, /[ ,.…?!]/.test(chars[typed - 1]) ? 110 : 55);
      };
      later(tick, 350);
    };
    start();
  }

  // ───────── 작은 스톱모션 프레임 플레이어 (화면 위 <img> 하나를 대상으로) ─────────
  // 결말 컷신과 같은 결 — 한 장을 350~500ms 붙잡고, 넘길 때마다 자리가 1~2px 흔들리고, 보간 없이 뚝뚝 바뀐다.
  // 캔버스 컷신과 달리 밤의 문 두드림처럼 이미 그려진 <img> 에 프레임만 갈아 끼울 때 쓴다 (UIManager.night).
  // frames: [src, ...] · opts.holds: 프레임별 붙잡는 ms (배열이면 돌려 쓴다) · opts.jitter: 흔들림 px · opts.loop: 한 바퀴 뒤 처음부터
  // 돌려주는 { stop() } — 다시 그리면(innerHTML 교체) 그 <img> 가 사라지므로 부른 쪽이 먼저 stop 한다
  function playFrames(img, frames, opts = {}) {
    const holds = [].concat(opts.holds || [420]);
    const jitter = opts.jitter === undefined ? 1.5 : opts.jitter;
    const loop = opts.loop !== false;
    let alive = true, timer = null, i = 0;
    const rnd = () => Math.round((Math.random() * 2 - 1) * jitter);
    const step = () => {
      if (!alive || !img.isConnected) { alive = false; return; }
      if (i >= frames.length) { if (!loop) { alive = false; return; } i = 0; }
      img.src = frames[i];
      img.style.transform = `translate(${rnd()}px, ${rnd()}px)`;
      timer = setTimeout(step, holds[i % holds.length]);
      i++;
    };
    step();
    return { stop() { alive = false; clearTimeout(timer); } };
  }

  return { play, playIntro, introFor, available, outcomeFor, preload, assets, playing, skip: finish, playFrames };
})();

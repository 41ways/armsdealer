// 1인칭 상점 장면. 저해상도 캔버스(가로 144px)에 그리고 CSS로 픽셀 그대로 확대한다.
WS.Scene = (() => {
  const P = WS.Pixel;
  const SP = () => WS.Sprites;
  const W = 144;
  let H = 256;
  let cv, ctx, bg, counterLayer, vignette;
  let time = performance.now() / 1000;
  const S = () => WS.Game.state;

  let shown = null;    // 지금 그려지는 손님 { uid, sprite, enterAt, exitAt, result, reactAt }
  let incoming = null; // 퇴장 애니메이션이 끝나면 들어올 손님 uid
  const flies = [];    // 날아가는 아이템/동전
  const wisps = [];    // 위험한 물건 위 보랏빛 기운

  // 제미나이로 뽑은 상점 내부(assets/raw/shop_scene_v1_gemini.png → 144×256)와 손.
  // 그림 기준 좌표: 카운터 윗선(철 테두리) 131행, 문 앞 바닥선 100행, 횃불 불꽃 (14, 50).
  const ART = {};
  ['shop_bg', 'hand_L', 'hand_R', 'magnifier'].forEach(n => { const i = new Image(); i.src = `assets/scene/${n}.png`; ART[n] = i; });
  const artReady = () => ['shop_bg', 'hand_L', 'hand_R'].every(n => ART[n].complete && ART[n].naturalWidth); // 확대경은 없어도 장면은 굽는다
  const ART_H = 256, ART_COUNTER = 131, ART_FLOOR = 100;
  // 카운터 앞면에 덧댄 철판의 윗줄(shop_bg 128행) — 손님 아랫부분은 이 줄부터 가려져야 철판 위에 얹혀 보이지 않는다
  const ART_PLATE = 128;
  // 손을 테이블에 올려놓는 손님 — 거칠고 스스럼없는 무리만. 시의·왕자·귀족·관리·사제·후드 쓴 사람처럼 격식 차리거나
  // 몸을 사리는 손님은 손을 내리고 있는다 (여기 없는 외형은 모두 손을 내린다)
  const HANDS_ON = new Set(['goblin_raider', 'goblin_raider2', 'goblin_trader', 'goblin_envoy', 'orc_chief', 'bandit', 'bandit_chief',
    'mercenary', 'merc_captain', 'soldier', 'soldier2', 'dwarf', 'dwarf2', 'dwarf_smith', 'golem_smith', 'pirate', 'pirate_captain',
    'hunter', 'lodge_hunter', 'hunter_scout', 'adventurer', 'herbalist', 'fence', 'kobold', 'syndicate_boss', 'demon_soldier', 'necromancer']);
  // 시트의 표정 프레임 중에는 머리 위치가 idle 프레임보다 눈에 띄게 낮거나 높게 그려진 것이 있다(특히 용병 talk/blink 27px).
  // 그대로 갈아 끼우면 손님이 앉았다 일어서는 것처럼 보이므로, 프레임마다 머리 꼭대기를 idle 에 맞춰 옮겨 그린다.
  // 값 = (프레임 알파 윗선 − idle 알파 윗선) 원본 픽셀, 5px 이상만. tools 로 sprites/*.png 를 훑어 구했다.
  const HEAD_DY = {
    court_poisoner: [0,0,0,0,13,13,13,13], disguised_buyer: [0,0,0,0,13,13,13,13], dwarf_smith: [0,0,0,0,6,5,5,6],
    fake_knight: [0,0,0,0,14,14,14,11], gem_thief: [0,0,0,0,13,13,13,13], guild_mage: [0,0,0,0,-5,-5,-5,-5],
    guild_merchant: [0,0,0,0,5,5,5,5], kassim: [0,0,0,0,13,13,13,13], liga_hooded: [0,0,0,0,13,13,13,13],
    liga_member: [0,0,0,0,6,6,6,6], mercenary: [0,0,27,26,27,26,27,27], militia_forager: [0,0,0,0,14,14,14,14],
    noble_courier: [0,0,0,0,6,7,7,7], noble_quartermaster: [0,0,0,0,0,6,6,6], physician: [0,0,0,0,5,5,5,5],
    redford_orto: [0,0,0,-9,-9,-9,-9,-13], smuggle_lord: [0,0,0,0,6,7,7,7], star_keeper: [0,0,0,0,6,6,6,6],
    thrall: [0,9,0,9,14,13,14,13], widow_eda: [0,0,0,0,10,10,10,10],
  };
  const artDy = () => H - ART_H; // 화면 높이가 256이 아니면 그림을 아래(카운터)에 맞추고 위를 자르거나 채운다
  const lay = () => ({ counterTop: ART_COUNTER + artDy(), floorTop: ART_FLOOR + artDy() });
  const ease = t => 1 - (1 - t) ** 3;
  const clamp01 = t => Math.max(0, Math.min(1, t));

  // ───────── 정적 배경 (크기 바뀔 때만 다시 굽기) ─────────
  function buildBackground() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const img = ART.shop_bg;
    const oy = artDy();
    // 화면이 그림보다 길면 위쪽 빈 곳은 천장 첫 줄로 늘려 채운다
    if (oy > 0) g.drawImage(img, 0, 0, W, 1, 0, 0, W, oy);
    g.drawImage(img, 0, oy);
    return c;
  }

  // 카운터(테이블) 층: 손님보다 앞에 그려져 손님 하반신을 가린다. 그림의 카운터 윗선 아래 부분 그대로.
  function buildCounter() {
    const { counterTop } = lay();
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(ART.shop_bg, 0, ART_PLATE, W, ART_H - ART_PLATE, 0, counterTop - (ART_COUNTER - ART_PLATE), W, ART_H - ART_PLATE);
    return c;
  }

  function buildVignette() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const v = g.createRadialGradient(W / 2, H * 0.5, H * 0.18, W / 2, H * 0.5, H * 0.6);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.72)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c;
  }

  function resize() {
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    const nh = Math.max(240, Math.min(340, Math.round((W * rect.height) / rect.width)));
    if (!artReady()) return; // 그림이 다 오기 전에는 굽지 않는다 (로딩 화면이 기다려 준다)
    if (nh === H && bg) return;
    H = nh;
    cv.width = W; cv.height = H;
    ctx.imageSmoothingEnabled = false;
    bg = buildBackground();
    counterLayer = buildCounter();
    vignette = buildVignette();
  }

  // ───────── 상태 동기화 (UI render 때마다 호출) ─────────
  function lookFor(c) {
    const tpl = WS.sys.Customers.tplById(c.tpl);
    const arch = findArchetype(c.tpl);
    return c.look || (tpl && tpl.look) || (arch && arch.look) || WS.data.lookByRace[c.race] || 'soldier';
  }
  function findArchetype(id) {
    for (const f of Object.values(WS.data.factions)) {
      const a = (f.archetypes || []).find(x => x.id === id);
      if (a) return a;
    }
    return null;
  }
  const customerById = uid => S() && S().queue && S().queue.find(q => q.uid === uid);

  function sync() {
    const st = S();
    const cur = st && st.phase === 'shop' ? WS.sys.Day.current() : null;
    const wantUid = cur ? cur.uid : null;
    if (shown && shown.uid !== wantUid && !shown.exitAt) shown.exitAt = time;
    if (!shown && wantUid) enter(wantUid);
    else if (shown && shown.uid !== wantUid) incoming = wantUid;
    if (shown && cur && shown.uid === cur.uid && cur.result && shown.result !== cur.result) react(cur);
    if (shown && cur && shown.uid === cur.uid) { if (cur.angry && !shown.angry) shown.angryAt = time; shown.angry = !!cur.angry; }
    // 손님이 새로 말하면 입을 움직인다
    if (shown && cur && shown.uid === cur.uid && cur.dialog.length > shown.lines) {
      if (cur.dialog[cur.dialog.length - 1].who === 'c') shown.talkAt = time;
      shown.lines = cur.dialog.length;
    }
  }

  // 시트 프레임 고르기: 말하기 > 반응 표정 > 깜빡임 > 대기/숨쉬기
  const HAPPY = ['sold', 'bought', 'traded', 'talked'];
  const ANGRY = ['refused', 'left'];
  function sheetFrame(spr, settled) {
    const idx = name => Math.max(0, spr.frames.indexOf(name));
    if (!settled) return idx('idle');
    const since = time - shown.enterAt - 0.7;
    const talking = time - Math.max(shown.talkAt, shown.enterAt + 0.7) < 1.4 && since > 0;
    if (shown.reactAt !== null && ANGRY.includes(shown.result) && time - shown.reactAt < 0.5) return idx('surprised');
    // talk/talk2 는 시트의 서로 다른 줄(1줄=idle 계열, 2줄=표정 계열)에 있어 AI가 그릴 때
    // 체형이 미세하게 달라지는 경우가 있다(가슴선 등). 빠르게 번갈아 쓰면 그 차이가 깜빡임처럼
    // 도드라지므로, 말하는 동안은 idle과 같은 줄인 talk(입 벌림)만 쓰고 idle로 살짝 다물게 한다.
    if (talking) return idx(Math.floor(time / 0.13) % 2 ? 'talk' : 'idle');
    if (HAPPY.includes(shown.result) && shown.result !== 'talked') return idx('happy');
    if (ANGRY.includes(shown.result)) return idx('angry');
    if (time % 4.2 < 0.14) return idx('blink');
    return idx(Math.floor(time / 0.8) % 2 ? 'breathe' : 'idle');
  }

  function enter(uid, at) {
    const c = customerById(uid);
    if (!c) return;
    const seed = c.random ? c.uid : c.tpl;
    const look = lookFor(c);
    const sprite = SP().sheet(look) || SP().character(look, seed);
    shown = { uid, sprite, look, handsOn: HANDS_ON.has(look), enterAt: at ?? time, exitAt: null, result: c.result, reactAt: null, itemGone: !!c.result, talkAt: at ?? time, lines: c.dialog.length };
    incoming = null;
  }

  function react(c) {
    shown.result = c.result;
    shown.reactAt = time;
    const { counterTop } = lay();
    const toCustomer = { x: 58, y: counterTop - 30 };
    const toPlayer = { x: 60, y: H + 10 };
    if (c.kind === 'trade' && c.trade) {
      reactTrade(c, toCustomer, toPlayer);
      shown.itemGone = true;
      return;
    }
    const r = c.request;
    if (!r) return;
    const itemPos = { x: 44, y: counterTop + 20 };
    const coinPos = { x: 106, y: counterTop + 34 };
    if (c.result === 'sold') {
      flies.push({ kind: 'item', id: r.item, qty: Math.min(r.qty, 3), from: itemPos, to: toCustomer, at: time, dur: 0.6 });
      flies.push({ kind: 'coins', n: coinCount(r.offer), from: coinPos, to: { x: 110, y: H + 10 }, at: time + 0.15, dur: 0.6 });
    } else if (c.result === 'bought') {
      flies.push({ kind: 'item', id: r.item, qty: Math.min(r.qty, 3), from: itemPos, to: toPlayer, at: time, dur: 0.6 });
      flies.push({ kind: 'coins', n: coinCount(r.price), from: coinPos, to: toCustomer, at: time + 0.15, dur: 0.6 });
    } else if (c.result === 'refused' || c.result === 'left') {
      flies.push({ kind: 'item', id: r.item, qty: Math.min(r.qty, 3), from: itemPos, to: { x: itemPos.x, y: H + 20 }, at: time, dur: 0.5 });
    }
    shown.itemGone = true;
  }

  // 교환 카운터 배치: 왼쪽 = 손님이 원하는 내 물건, 오른쪽(동전 자리) = 손님이 내놓은 물건
  const TRADE = { mineX: 12, theirsX: 80, dy: 22, scale: 0.8, coinX: 116, coinDy: 40 };

  // 교환 성사: 두 물건이 카운터 위에서 엇갈려 자리를 바꾼 뒤 각자에게 간다
  function reactTrade(c, toCustomer, toPlayer) {
    const { counterTop } = lay();
    const t = c.trade;
    const mine = { x: TRADE.mineX, y: counterTop + TRADE.dy };
    const theirs = { x: TRADE.theirsX, y: counterTop + TRADE.dy };
    const w = t.want[0], g = t.give[0];
    if (c.result === 'traded') {
      const mid = { x: 46, y: counterTop + 8 };
      flies.push({ kind: 'item', id: w.item, qty: Math.min(w.qty, 3), from: mine, to: { x: theirs.x, y: mid.y }, at: time, dur: 0.45, scale: TRADE.scale });
      flies.push({ kind: 'item', id: g.item, qty: Math.min(g.qty, 3), from: theirs, to: { x: mine.x, y: mid.y + 10 }, at: time, dur: 0.45, scale: TRADE.scale });
      flies.push({ kind: 'item', id: w.item, qty: Math.min(w.qty, 3), from: { x: theirs.x, y: mid.y }, to: toCustomer, at: time + 0.45, dur: 0.5, scale: TRADE.scale });
      flies.push({ kind: 'item', id: g.item, qty: Math.min(g.qty, 3), from: { x: mine.x, y: mid.y + 10 }, to: toPlayer, at: time + 0.45, dur: 0.5, scale: TRADE.scale });
      if (t.gold > 0) flies.push({ kind: 'coins', n: coinCount(t.gold), from: { x: TRADE.coinX, y: counterTop + TRADE.coinDy }, to: { x: 110, y: H + 10 }, at: time + 0.6, dur: 0.6 });
      if (t.gold < 0) flies.push({ kind: 'coins', n: coinCount(-t.gold), from: { x: 110, y: H + 10 }, to: toCustomer, at: time + 0.6, dur: 0.6 });
    } else if (c.result === 'refused' || c.result === 'left') {
      // 손님은 자기 물건을 거둬 가고, 내 물건은 제자리로
      flies.push({ kind: 'item', id: g.item, qty: Math.min(g.qty, 3), from: theirs, to: toCustomer, at: time, dur: 0.5, scale: TRADE.scale });
      flies.push({ kind: 'item', id: w.item, qty: Math.min(w.qty, 3), from: mine, to: { x: mine.x, y: H + 20 }, at: time, dur: 0.5, scale: TRADE.scale });
    }
  }

  const coinCount = amount => Math.max(1, Math.min(15, Math.round(amount / 25)));

  // ───────── 그리기 ─────────
  function drawTorch() {
    const { floorTop } = lay();
    const tx = 14, ty = floorTop - 46; // 그림 속 횃불 불꽃 자리 위에 일렁임을 덧그린다
    const f = Math.floor(time * 10);
    const r = P.rng('t' + f);
    const hgt = 5 + Math.floor(r() * 3);
    ctx.fillStyle = '#e0501a'; ctx.fillRect(tx - 2, ty - 3, 5, 4);
    ctx.fillStyle = '#ff9a2a'; ctx.fillRect(tx - 1, ty - hgt, 3, hgt);
    ctx.fillStyle = '#ffe07a'; ctx.fillRect(tx, ty - hgt + 1 + Math.floor(r() * 2), 1, hgt - 2);
    if (r() < 0.5) { ctx.fillStyle = '#ffb040'; ctx.fillRect(tx + (r() < 0.5 ? -1 : 1), ty - hgt - 1 - Math.floor(r() * 3), 1, 1); }
    return { tx, ty: ty - 3, flicker: 0.85 + r() * 0.15 };
  }


  // 손님은 카운터 너머 한 걸음 뒤에 선다 — 머리 위로 말풍선이 뜰 자리를 남긴다
  const CUST_SCALE = 0.8;
  let custRect = null;
  // 장면 비율 좌표(0~1)가 서 있는 손님 몸 위인지 — 좌우 여백은 조금 좁혀 잡는다
  function customerAt(fx, fy) {
    if (!shown || !custRect) return false;
    const px = fx * W, py = fy * H, r = custRect, m = r.w * 0.18;
    return px >= r.x + m && px <= r.x + r.w - m && py >= r.y && py <= r.y + r.h;
  }

  function drawCustomer() {
    if (!shown) { custRect = null; return; }
    const { counterTop, floorTop } = lay();
    const spr = shown.sprite;
    const eIn = ease(clamp01((time - shown.enterAt) / 0.7));
    const eOut = shown.exitAt ? ease(clamp01((time - shown.exitAt) / 0.45)) : 0;
    const k = eIn * (1 - eOut);
    const s = (0.38 + 0.62 * k) * CUST_SCALE;
    let w = spr.w * s, h = spr.h * s;
    const finalY = counterTop + (spr.isSheet ? 10 : 18) - spr.h * CUST_SCALE;
    const farY = floorTop - h + 2;
    let x = 72 - w / 2;
    let y = farY + (finalY - farY) * k;
    const settled = eIn >= 1 && !shown.exitAt;
    if (settled && !spr.isSheet) y += Math.sin(time * 2.4) > 0.4 ? 1 : 0;
    if (shown.reactAt !== null) {
      const t = (time - shown.reactAt) / 0.45;
      if (t < 1) {
        if (shown.result === 'sold' || shown.result === 'bought' || shown.result === 'traded' || shown.result === 'talked') y -= Math.round(4 * Math.sin(Math.PI * t));
        else x += Math.round(Math.sin(t * 40) * 1.5);
      }
    }
    // 화난 손님: 한 발 다가섰다 물러난다 (1~2px 확대·이동, 픽셀 유지)
    if (shown.angryAt != null && settled) {
      const t = (time - shown.angryAt) / 0.7;
      if (t > 0 && t < 1) { const p = Math.sin(Math.PI * t), w0 = w, h0 = h; w = Math.round(w * (1 + 0.05 * p)); h = Math.round(h * (1 + 0.05 * p)); x -= (w - w0) / 2; y -= (h - h0) + Math.round(2 * p); }
    }
    // 누르면 말을 다시 듣는 자리 (카운터 윗선까지만 — 테이블 위는 물건 자리)
    custRect = settled ? { x, y, w, h: Math.min(h, counterTop - y) } : null;
    ctx.save();
    ctx.globalAlpha = shown.exitAt ? 1 - eOut : Math.min(1, 0.3 + k);
    if ('filter' in ctx) ctx.filter = `brightness(${0.45 + 0.55 * k})${shown.angry ? ' sepia(.45) saturate(3.2) hue-rotate(-32deg)' : ''}`;
    if (spr.isSheet) {
      if (spr.img.complete && spr.img.naturalWidth) {
        const f = sheetFrame(spr, settled);
        const dyf = (HEAD_DY[shown.look] || [])[f] || 0, dy = Math.round(dyf * s);
        // 머리를 idle 높이에 맞춰 올리면 아래가 비므로, 그 자리는 idle 프레임 몸통으로 받쳐 둔다
        if (dy > 0) ctx.drawImage(spr.img, 0, 0, spr.fw, spr.fh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        ctx.drawImage(spr.img, f * spr.fw, 0, spr.fw, spr.fh, Math.round(x), Math.round(y) - dy, Math.round(w), Math.round(h));
      }
    } else {
      ctx.drawImage(spr.canvas, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    ctx.restore();
    // 눈 깜빡임 (코드로 그린 초상만)
    if (!spr.isSheet && settled && time % 4 < 0.13) {
      ctx.fillStyle = spr.eyeSkin;
      spr.eyes.forEach(([ex, ey, ew, eh]) => ctx.fillRect(Math.round(x + ex * s), Math.round(y + ey * s), Math.max(1, Math.round(ew * s)), Math.max(1, Math.round(eh * s))));
    }
    if (shown.exitAt && eOut >= 1) {
      const end = shown.exitAt + 0.45;
      shown = null;
      if (incoming) enter(incoming, end);
    }
  }

  function drawCustomerHands() {
    if (!shown || !shown.handsOn || shown.exitAt || time - shown.enterAt < 0.7) return;
    const { counterTop } = lay();
    const hand = SP().customerHand(shown.sprite.skin);
    const dx = Math.round(28 * CUST_SCALE);
    ctx.drawImage(hand, 72 - dx - 8, counterTop - 4);
    ctx.drawImage(hand, 72 + dx - 8, counterTop - 4);
  }

  function drawItemStack(id, qty, x, y, scale, alpha) {
    const img = SP().item(id);
    ctx.save();
    ctx.globalAlpha = alpha;
    const n = Math.min(qty, 3);
    for (let i = n - 1; i >= 0; i--) {
      ctx.drawImage(img, Math.round(x + i * 4 * scale), Math.round(y - i * 3 * scale), Math.round(56 * scale), Math.round(20 * scale));
    }
    ctx.restore();
  }

  function drawCoins(n, x, y, alpha) {
    const img = SP().coin();
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / 5), row = i % 5;
      ctx.drawImage(img, Math.round(x + col * 8 - (col % 2) * 2), Math.round(y - row * 2 + col * 3));
    }
    ctx.restore();
  }

  // 테이블 위 물건 — 개수를 셀 수 있게 한 개씩 줄지어 놓는다 (Papers, Please 책상 위 서류처럼).
  // 많을수록 작게 놓아서 테이블 안에 다 들어가게 한다.
  function tableLayout(qty) {
    const { counterTop } = lay();
    const x0 = 8, x1 = 104, y0 = counterTop + 9, y1 = H - HAND_SHOW - 2;
    let L = null;
    for (const s of [0.6, 0.5, 0.42, 0.34]) {
      const iw = Math.round(56 * s), ih = Math.round(20 * s);
      const gapX = iw + 3, gapY = ih + 4;
      const cols = Math.max(1, Math.floor((x1 - x0 + 3) / gapX));
      const rows = Math.max(1, Math.floor((y1 - y0 + 4) / gapY));
      L = { iw, ih, gapX, gapY, cols, rows, x0, y0 };
      if (cols * rows >= qty) break;
    }
    return L;
  }

  // 테이블 위 물건을 한 개씩 풀어 놓은 목록 — [{ itemId, x, y, w, h }] (그리는 것과 집는 것이 같은 배치를 쓴다)
  function tableUnits(lines) {
    const ids = [];
    lines.forEach(l => { for (let i = 0; i < l.qty; i++) ids.push(l); });
    const L = tableLayout(ids.length);
    const n = Math.min(ids.length, L.cols * L.rows);
    const out = [];
    for (let i = 0; i < n; i++) {
      const col = i % L.cols, row = Math.floor(i / L.cols);
      out.push({
        itemId: ids[i].itemId, line: ids[i], w: L.iw, h: L.ih,
        x: L.x0 + col * L.gapX + ((i * 37) % 3) - 1,
        y: L.y0 + row * L.gapY + ((i * 53) % 3) - 1,
      });
    }
    return out;
  }

  function drawTableGoods(lines, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const u of tableUnits(lines)) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(u.x + 1, u.y + u.h - 1, u.w - 2, 2);
      ctx.drawImage(SP().item(u.itemId), 0, 0, 56, 20, u.x, u.y, u.w, u.h);
    }
    ctx.restore();
  }

  // UI가 "테이블 위에 놓았는지" 판정할 때 쓰는 테이블 영역 (캔버스 높이 대비 비율)
  const tableTopFrac = () => lay().counterTop / H;

  // 캔버스 비율 좌표(fx, fy)에 놓인 테이블 위 물건 — 겹치면 나중에 놓인(위에 그려진) 것
  function itemAtTable(fx, fy, lines) {
    const x = fx * W, y = fy * H;
    const hit = tableUnits(lines).filter(u => x >= u.x - 2 && x <= u.x + u.w + 2 && y >= u.y - 3 && y <= u.y + u.h + 3);
    return hit.length ? hit[hit.length - 1].line : null; // 그 물건이 속한 테이블 줄 {itemId, qty, stash?}
  }

  function drawCounterGoods() {
    const st = S();
    if (!shown || shown.itemGone || shown.exitAt || time - shown.enterAt < 0.5) return;
    const c = customerById(shown.uid);
    if (c && c.kind === 'trade' && c.trade) return drawTradeGoods(c);
    if (!c || !c.request) return;
    const { counterTop } = lay();
    const r = c.request;
    let lines, amount, k = 1;
    if (c.kind === 'sell') {
      // 손님이 파는 물건 — 이미 정해져 있으니 그대로 보여준다
      lines = [{ itemId: r.item, qty: r.qty }];
      amount = r.price;
      k = ease(clamp01((time - shown.enterAt - 0.5) / 0.35));
    } else {
      // 손님에게 파는 경우 — 플레이어가 창고에서 테이블로 내려놓은 것만 나타난다
      lines = (WS.UI.trayLines && WS.UI.trayLines()) || [];
      if (!lines.length) return;
      amount = WS.UI.trayOffer();
    }
    drawTableGoods(lines, k);
    if (amount > 0) drawCoins(coinCount(amount), 114, counterTop + 30, k);
    for (const l of lines) {
      const it = WS.sys.Items.get(l.itemId);
      if (it && (it.danger >= 3 || it.rarity === '희귀')) spawnWisps(it.rarity === '희귀' ? '#6ef0ff' : '#b070ff', counterTop + 22);
      if (st.trend && st.trend.item === l.itemId && Math.random() < 0.1) spawnWisps('#ffd060', counterTop + 22);
    }
  }

  // 교환 손님: 동전 대신 손님이 가져온 물건이 카운터 오른쪽에 놓인다
  function drawTradeGoods(c) {
    const { counterTop } = lay();
    const t = c.trade;
    const k = ease(clamp01((time - shown.enterAt - 0.5) / 0.35));
    const y = counterTop + TRADE.dy + (1 - k) * 12;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(TRADE.mineX + 2, counterTop + 36, 44, 3);
    ctx.fillRect(TRADE.theirsX + 2, counterTop + 36, 44, 3);
    const w = t.want[0], g = t.give[0];
    drawItemStack(w.item, w.qty, TRADE.mineX, y, TRADE.scale, k);
    drawItemStack(g.item, g.qty, TRADE.theirsX, y, TRADE.scale, k);
    // 가운데 ⇄ 표시 (픽셀 화살표 두 개)
    ctx.save();
    ctx.globalAlpha = k * (0.6 + 0.4 * Math.sin(time * 4));
    ctx.fillStyle = '#e0aa45';
    ctx.fillRect(64, counterTop + 24, 10, 1); ctx.fillRect(72, counterTop + 23, 1, 3);
    ctx.fillRect(66, counterTop + 28, 10, 1); ctx.fillRect(67, counterTop + 27, 1, 3);
    ctx.restore();
    if (t.gold > 0) drawCoins(coinCount(t.gold), TRADE.coinX, counterTop + TRADE.coinDy, k);
    const it = WS.sys.Items.get(g.item);
    if (it.danger >= 3 || it.rarity === '희귀') spawnWisps(it.rarity === '희귀' ? '#6ef0ff' : '#b070ff', counterTop + 22);
    if (WS.sys.Items.hasTag(g.item, 'cursed') && Math.random() < 0.3) spawnWisps('#ff3a6a', counterTop + 20);
  }

  function spawnWisps(col, y) {
    if (Math.random() < 0.35) wisps.push({ x: 48 + Math.random() * 44, y: y + Math.random() * 6, col, at: time, life: 0.8 + Math.random() * 0.6 });
  }

  function drawWisps() {
    for (let i = wisps.length - 1; i >= 0; i--) {
      const p = wisps[i];
      const t = (time - p.at) / p.life;
      if (t >= 1) { wisps.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x + Math.sin(t * 6 + p.x) * 2), Math.round(p.y - t * 14), 1, t < 0.3 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawFlies() {
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i];
      const t = clamp01((time - f.at) / f.dur);
      if (time < f.at) continue;
      if (t >= 1) { flies.splice(i, 1); continue; }
      const e = ease(t);
      const x = f.from.x + (f.to.x - f.from.x) * e;
      const y = f.from.y + (f.to.y - f.from.y) * e - Math.sin(Math.PI * t) * 6;
      if (f.kind === 'item') drawItemStack(f.id, f.qty, x, y, (f.scale || 1) * (1 - 0.4 * e), 1 - t * 0.8);
      else drawCoins(f.n, x, y, 1 - t * 0.7);
    }
  }

  // ───────── 테이블 위 확대경 (누르면 소속을 묻고 인장을 본다) ─────────
  // 제미나이 그림 assets/scene/magnifier.png (402×291, 손잡이 왼쪽 아래 → 렌즈 오른쪽 위) 를 MAG.w 폭으로 한 번 줄여 두고,
  // 카운터 왼쪽 아래 — 왼손 바로 앞에 비스듬히 놓는다. 손보다 나중에 그려서 손가락 위에 살짝 걸친다. 손과 함께 들썩이지 않는다.
  // x: 캔버스 x, dy: 손 윗선(H - HAND_SHOW) 기준 확대경 윗변, w: 폭(논리 px). 테이블 나무판은 손 윗선 2px 위까지 —
  // 렌즈와 손잡이는 나무판 위에, 손잡이 끝만 손가락 끝에 살짝 걸친다. (결말 컷신 Cinematic.js 도 같은 자리에 그린다)
  // 마우스를 올리면 테가 밝아지며 가운데를 기준으로 한 단계(MAG.mid) 거쳐 MAG.big 폭으로 커진다 — 크기마다 원본에서 따로 줄여 픽셀이 또렷하다
  const MAG = { x: 11, dy: -29, w: 46, mid: 49, big: 52 };
  const magSets = {}; // 폭 → { base, bright, shadow, w, h }
  // 큰 그림을 반씩 줄여 가며(상자 평균에 가깝게) 목표 크기까지 → 알파를 0/1로 잘라 가장자리를 픽셀처럼 또렷하게
  function shrinkMagnifier(img, w, h) {
    let src = img, sw = img.naturalWidth, sh = img.naturalHeight;
    while (sw / 2 >= w * 1.5) {
      const c = document.createElement('canvas');
      c.width = Math.round(sw / 2); c.height = Math.round(sh / 2);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, sw, sh, 0, 0, c.width, c.height);
      src = c; sw = c.width; sh = c.height;
    }
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, sw, sh, 0, 0, w, h);
    try { // file:// 로 열면 픽셀을 못 읽는다 — 그때는 부드러운 가장자리 그대로
      const d = g.getImageData(0, 0, w, h);
      for (let i = 3; i < d.data.length; i += 4) {
        const a = d.data[i];
        if (a < 110) { d.data[i] = 0; continue; }
        // 반투명 가장자리는 미리 곱해진 색을 되살려 불투명하게
        for (let k = 1; k <= 3; k++) d.data[i - k] = Math.min(255, Math.round(d.data[i - k] * 255 / a));
        d.data[i] = 255;
      }
      g.putImageData(d, 0, 0);
    } catch (e) { /* 그대로 */ }
    return out;
  }
  // 마우스를 올렸을 때의 그림: 놋쇠 테·자루 고리를 따뜻하게 밝히고, 테 바깥 가장자리 1px 을 금빛으로(실루엣 안쪽이라 테두리가 번지지 않는다),
  // 유리에는 비스듬한 빛줄기 두 가닥. 나무 자루는 아주 조금만 밝힌다
  function brightMagnifier(base) {
    const w = base.width, h = base.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(base, 0, 0);
    try {
      const d = g.getImageData(0, 0, w, h), p = d.data;
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : p[(y * w + x) * 4 + 3];
      const isGlass = i => p[i + 2] > p[i] + 12 && p[i + 1] > p[i];
      const isBrass = i => p[i] > 90 && p[i + 1] > p[i] * 0.66 && p[i] > p[i + 2] + 20;
      let gx0 = w, gy0 = h, gx1 = 0, gy1 = 0; // 유리 자리
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (p[i + 3] && isGlass(i)) { gx0 = Math.min(gx0, x); gy0 = Math.min(gy0, y); gx1 = Math.max(gx1, x); gy1 = Math.max(gy1, y); }
      }
      const out = new Uint8ClampedArray(p);
      const mix = (i, r, gg, b, k) => { out[i] += (r - out[i]) * k; out[i + 1] += (gg - out[i + 1]) * k; out[i + 2] += (b - out[i + 2]) * k; };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!p[i + 3]) continue;
        if (isGlass(i)) {
          mix(i, 235, 255, 255, 0.16);
          const s = (x - gx0) / Math.max(1, gx1 - gx0) + (y - gy0) / Math.max(1, gy1 - gy0);
          if (s > 0.42 && s < 0.6) mix(i, 250, 255, 255, 0.8);
          else if (s > 0.72 && s < 0.81) mix(i, 250, 255, 255, 0.5);
        } else if (isBrass(i)) {
          const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
          if (edge) mix(i, 255, 226, 150, 0.85);
          else { out[i] = Math.min(255, p[i] * 1.22 + 14); out[i + 1] = Math.min(255, p[i + 1] * 1.2 + 10); out[i + 2] = Math.min(255, p[i + 2] * 1.05); }
        } else {
          out[i] = Math.min(255, p[i] * 1.08); out[i + 1] = Math.min(255, p[i + 1] * 1.08); out[i + 2] = Math.min(255, p[i + 2] * 1.06);
        }
      }
      p.set(out);
      g.putImageData(d, 0, 0);
    } catch (e) { // file:// 로 열어 픽셀을 못 읽으면 통째로 살짝 밝게
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18; g.drawImage(base, 0, 0);
    }
    return c;
  }
  const magH = w => Math.round(w * ART.magnifier.naturalHeight / ART.magnifier.naturalWidth);
  const magSize = () => ({ w: MAG.w, h: magH(MAG.w) });
  function magSet(w) {
    if (magSets[w]) return magSets[w];
    const h = magH(w);
    const base = shrinkMagnifier(ART.magnifier, w, h);
    const shadow = document.createElement('canvas');
    shadow.width = w; shadow.height = h;
    const sg = shadow.getContext('2d');
    sg.drawImage(base, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = 'rgba(12,6,2,0.4)'; sg.fillRect(0, 0, w, h);
    return (magSets[w] = { base, bright: brightMagnifier(base), shadow, w, h });
  }
  const magTop = () => H - HAND_SHOW + MAG.dy;
  // 마우스가 확대경 위에 있는지 — UI 가 깔아 둔 투명한 누름 자리의 :hover 로 본다. 첫 손님 안내 중이면 테가 천천히 밝아졌다 어두워진다
  const magHover = () => { try { return !!document.querySelector('.affil-hit:hover'); } catch (e) { return false; } };
  const magHint = () => { try { return !!document.querySelector('.affil-hit.tut-glow'); } catch (e) { return false; } };
  const magAnim = { hover: false, at: -9 };
  function drawMagnifier() {
    const img = ART.magnifier;
    if (!img.complete || !img.naturalWidth) return;
    const hover = magHover();
    if (hover !== magAnim.hover) { magAnim.hover = hover; magAnim.at = time; }
    // 커질 때도 작아질 때도 가운데 크기를 한 박자(≈2프레임) 거친다
    const w = time - magAnim.at < 0.04 ? MAG.mid : hover ? MAG.big : MAG.w;
    const m = magSet(w), b = magSet(MAG.w);
    const cx = MAG.x + b.w / 2, cy = magTop() + b.h / 2;
    const x = Math.round(cx - m.w / 2), y = Math.round(cy - m.h / 2);
    ctx.drawImage(b.shadow, MAG.x + 1, magTop() + 2); // 테이블에 드리운 그림자 (크기는 그대로)
    if (hover || w !== MAG.w) { ctx.drawImage(m.bright, x, y); return; }
    ctx.drawImage(m.base, x, y);
    if (magHint()) {
      ctx.save();
      ctx.globalAlpha = 0.5 - 0.5 * Math.cos(time * Math.PI * 2 / 1.2);
      ctx.drawImage(m.bright, x, y);
      ctx.restore();
    }
  }
  // 확대경 누름 자리 — 캔버스 비율 좌표 (UI 가 화면 위 투명 버튼을 여기에 맞춘다). 렌즈 쪽을 넉넉히, 손잡이 끝은 조금 덜
  const magnifierBox = () => {
    const { w, h } = ART.magnifier.naturalWidth ? magSize() : { w: MAG.w, h: 29 };
    const x = MAG.x - 1, y = magTop() - 2;
    return { fx: x / W, fy: y / H, fw: (w + 2) / W, fh: (h + 3) / H };
  };

  // 내 손 — 화면 아래 끝에 손가락과 장갑만 걸치게 (소매는 화면 밖). 확대경은 왼손 앞 테이블 위에 (손과 함께 들썩이지 않는다)
  function drawHands() {
    const b = Math.sin(time * 1.3) > 0.6 ? 1 : 0;
    const L = ART.hand_L, R = ART.hand_R;
    ctx.drawImage(L, 6, H - HAND_SHOW + b);
    ctx.drawImage(R, W - 6 - R.width, H - HAND_SHOW + b);
    drawMagnifier();
  }
  const HAND_SHOW = 34;

  function drawLighting(torch) {
    const st = S();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(torch.tx, torch.ty, 2, torch.tx, torch.ty, 90);
    g.addColorStop(0, `rgba(255,150,60,${0.4 * torch.flicker})`);
    g.addColorStop(0.35, `rgba(255,120,40,${0.12 * torch.flicker})`);
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // 시간대 색조
    let tint = null;
    const phase = st ? st.phase : 'title';
    if (phase === 'shop') {
      const t = clamp01((st.time - 13 * 60) / (5 * 60));
      tint = `rgba(255,110,30,${0.12 * t})`;
    } else if (phase === 'closing' || phase === 'ending') tint = 'rgba(8,12,40,0.5)';
    else if (phase === 'morning' || phase === 'prep') tint = 'rgba(255,220,170,0.05)';
    else tint = 'rgba(0,0,0,0.35)';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(vignette, 0, 0);
  }

  function frame() {
    time = performance.now() / 1000;
    if (bg) {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0);
      const DL = WS.DecorLayer, dyDecor = artDy();
      if (DL) { DL.step(time); DL.draw(ctx, 'street', time, dyDecor); DL.draw(ctx, 'window', time, dyDecor); DL.draw(ctx, 'shop', time, dyDecor); } // 가게 상태 데코 (js/data/decor.js)
      const torch = drawTorch();
      // 선반 물건은 이제 그림 속 무기 거치대가 대신한다
      drawCustomer();
      ctx.drawImage(counterLayer, 0, 0);
      if (DL) DL.draw(ctx, 'counter', time, dyDecor);
      drawCustomerHands();
      drawCounterGoods();
      drawFlies();
      drawWisps();
      drawHands();
      drawLighting(torch);
    }
    requestAnimationFrame(frame);
  }

  function mount(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
    requestAnimationFrame(frame);
  }

  function reset() {
    shown = null;
    incoming = null;
    flies.length = 0;
    wisps.length = 0;
    if (WS.DecorLayer) WS.DecorLayer.reset();
  }

  return { mount, sync, resize, reset, tableTopFrac, itemAtTable, customerAt, magnifierBox };
})();

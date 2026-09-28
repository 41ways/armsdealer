#!/usr/bin/env node
// Next! 머리 없는(headless) 밸런스 시뮬레이터 — 게임 파일은 읽기만 한다 (js/ 아래를 고치지 않는다).
//
// 쓰는 법:
//   nice -n 10 node tools/sim.js N [--policy=beginner|intermediate|expert|natural|merchant|kind] [--buyall] [--seed=S]
//                                  [--cfg='{"rentSchedule":[...]}'] [--set='{"shop.guard.wage":15}']
//                                  [--paper=0|1] [--buffer=일수] [--dump=0|1] [--loan=0] [--midday] [--json=out.json] [--quiet] [--trace]
//   --buyall  돈 쓰는 곳을 다 쓴다: 신문 구독 · 경비 고용 · 가게 물품 전부 · 창고 확장 3단계 (모두 Letters.send, UI 의 mail-send 와 같은 호출)
//             초보는 오늘 밤 낼 돈만 남으면 곧장 / 중수는 임대료 이틀치 + 곧 올 할부를 남기고 / 고수는 거기에 200G 더 남기고 산다
//   --set     WS.data 아래 경로의 값을 덮어쓴다 (배열은 번호나 id: "shop.goods.sign.cost", "config.storageExpand.steps.0.cost")
//   --loan=0  초보의 대출을 끈다 / --midday 초보가 영업 중에도 한 번 더 주문한다 (기본 꺼짐)
//   --buffer  도매·매입 때 금고에 남길 (임대료+구독료) 일수 (기본 natural·kind 2, merchant 1.5)
//   --dump=0  금고가 오늘 밤 임대료에 못 미칠 때 도매상에 처분하는 규칙을 끈다
//   --trace   --json 의 판마다 하루 금고·수입·지출 기록을 남긴다
//   환경변수 WS_CFG='{"...":...}' 도 받는다 (--cfg 가 있으면 --cfg 가 이긴다).
//
// 하는 일:
//   - index.html 과 같은 순서로 js/core/util.js · js/data/* · js/GameManager.js · js/systems/* 를 node vm 문맥에 올린다.
//     js/render/*, js/ui/*, Boot.js, Sfx.js 는 올리지 않는다 (시스템 코드는 이것들을 부르지 않는다. WS.Cinematic 은 없으면 건너뛴다).
//     localStorage 는 메모리 가짜, Date.now 는 증가 계수기, Math.random 은 시드 고정 mulberry32 로 바꾼다 → 같은 시드면 같은 판.
//   - config.js 가 실행된 직후 --cfg / WS_CFG 의 키를 WS.data.config 에 얕게 덮어쓴다 (파일을 고치지 않고 후보 값 시험).
//   - 판마다 새 vm 문맥을 만든다 (모듈 안에 숨은 상태가 판 사이에 새지 않게). 시드 = 기본 시드 + 판 번호.
//   - 플레이어 행동은 UIManager.js 의 onClick 이 부르는 시스템 함수를 그대로 부른다:
//       아침 도매: Day.toPrep → Day.cartAdjust(+1씩) → Day.confirmCart (UI buyCart) / 상인회 빚: Day.repayGuild
//       영업: Day.openShop → Day.nextCustomer → (Trade.sellLines | Trade.refuse | Trade.buyFrom | Trade.exchange | Trade.choose
//             | Trade.forgive | Letters.promiseReturn | Letters.angerGift) → … → Day.closeShop
//       1일째 마감 뒤 신문 구독 안내(tut-sub): Letters.send('paper_sub')
//       밤: Day.nightDue → Day.startNight → Day.nightState/nightChoose → (Day.startWhisper) → Day.nextDay
//     판매는 UI 처럼 "테이블 위 줄"을 만들어 sellLines 로 넘긴다 (값 = UI linePrice 와 같은 계산, 대표 물건·값을 c.request 에 적는 것까지).
//
// 숙련도 정책 (--policy):
//   beginner      natural 바탕. 여유 0.5일치, 도매 목표를 0.6~1.8배로 들쭉날쭉(가끔 과하게), 마진을 따지지 않고 아무 순서로,
//                 요구 기억이 짧다(하루 0.4배 감쇠). 도매상 처분은 하지 않고, 오늘 밤 낼 돈이 모자라면 까마귀 대출(200/400/700 중
//                 모자란 돈 + 50 이상인 가장 작은 것)을 받는다. 갚을 돈 + 하루치가 모이면 갚는다. 임대료를 깨는 선택지를 30% 는 그냥 고른다.
//                 빚 수금원에게는 낼 수 있으면(임대료 생각 없이) 낸다.
//   intermediate  natural 과 같다 + 사흘 안에 올 할부와 밀린 빚을 도매·구매 때 남겨 둔다. 처분으로도 모자라면 대출.
//   expert        merchant 와 같다 (신문 없음, 간판 자동 구매 없음) + 할부 몫을 남겨 둔다.
// 옛 정책 (단순하지만 그럴듯하게):
//   natural  재고가 있으면 누구에게나 판다(부분 판매 허용 시 있는 만큼). 하나도 없으면 「내일 다시 오시오」, 안 되면 거절.
//            대화·밤 선택지는 고를 수 있는 것 중 무작위. 매입 손님은 금고 여유(임대료 이틀치)가 있으면 산다. 교환은 가치가 90% 이상이면.
//            아침 도매: 최근 손님 요청(지수 감쇠 수요) + 오늘 오는 약속 손님 몫만큼 재고 목표 → 마진 큰 것부터 +1씩, 금고는 임대료 이틀치 남김.
//            금고가 오늘 밤 임대료에도 못 미치면 수요가 적은 물건부터 도매상에 넘긴다.
//   공통     confirm 선택지(열쇠를 넘긴다 등)는 다른 게 없을 때만, 금화를 내는 선택지로 오늘 밤 임대료를 못 내게 되면 고르지 않는다.
//            빚 수금원(debt_*)에게는 임대료를 남기고 낼 수 있으면 낸다(merchant 제외). 파산 원인을 임대료/압류/상회 구제대출로 나눠 센다.
//            신문은 1일째 안내에서 구독한다 (--paper=0 으로 끔).
//   merchant 원가 밑으로는 팔지 않고, 재고 목표 1.3배, 여유 1.5일치. 선택지는 금화가 가장 느는 것. 7일째 이후 금고가 넉넉하면 간판을 산다.
//            신문은 구독하지 않는다.
//   kind     natural 과 같되 궁핍한 손님에겐 덤을 얹거나(70%) 값을 면제하고(30%), 화난 손님은 사과 덤으로 달랜다. 선택지는 늘 첫 번째.
//
// 한계 (결과 해석 때 꼭 볼 것):
//   - 인장 대조(돋보기)·소속 묻기·인상서 대조를 하지 않는다 → needs:'inspect'/'poster' 선택지, docCheck 결과는 생기지 않는다.
//   - 손님의 extraChoices(기별·정보 캐기)를 쓰지 않는다. 까마귀 편지(밀고·기별·별조각·대출·창고 확장·공급 제안·보험)를 쓰지 않는다.
//     (merchant 의 간판 주문, 1일째 신문 구독만 예외) → 대출 없이 버티는 플레이어다. 경비도 세우지 않는다.
//   - 장물함 물건은 팔지 않는다. 도매상 처분(−)을 하지 않는다.
//   - 대화 선택은 무작위/첫 번째/금화 기준이라 줄거리 엔딩 분포는 사람과 다르다 — 경제(파산율·금고) 비교용으로 본다.
//   - 원래 시뮬 묶음(tools/sim_suite.js 등)과 정책이 달라 이전 보고서 수치와 직접 비교하면 안 된다. 같은 도구 안에서의 전후 비교만 유효.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = (() => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1])
    .filter(f => !/^js\/(render|ui)\//.test(f) && !/(Boot|Sfx)\.js$/.test(f));
})();
const SCRIPTS = FILES.map(f => new vm.Script(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }));

// ───────── 인자 ─────────
function parseArgs(argv) {
  const o = { n: 100, policy: 'natural', seed: 1, cfg: null, paper: null, json: null, quiet: false, dump: null, buffer: null, buyall: false };
  for (const a of argv) {
    const m = a.match(/^--([a-z]+)(?:=(.*))?$/);
    if (!m) { if (/^\d+$/.test(a)) o.n = +a; continue; }
    const [, k, v] = m;
    if (k === 'cfg') o.cfg = JSON.parse(v);
    else if (k === 'policy') o.policy = v;
    else if (k === 'seed') o.seed = +v;
    else if (k === 'paper') o.paper = v !== '0';
    else if (k === 'json') o.json = v;
    else if (k === 'quiet') o.quiet = true;
    else if (k === 'trace') o.trace = true;
    else if (k === 'dump') o.dump = v !== '0';
    else if (k === 'buffer') o.buffer = +v;
    else if (k === 'buyall') o.buyall = v !== '0';
    else if (k === 'set') o.set = JSON.parse(v);
    else if (k === 'midday') o.midday = v !== '0';
    else if (k === 'loan') o.loan = v !== '0';
  }
  if (!o.cfg && process.env.WS_CFG) o.cfg = JSON.parse(process.env.WS_CFG);
  if (!POLICIES.includes(o.policy)) throw new Error('policy: ' + POLICIES.join('|'));
  return fillDefaults(o);
}
const POLICIES = ['beginner', 'intermediate', 'expert', 'natural', 'merchant', 'kind'];
function fillDefaults(o) {
  if (o.paper == null) o.paper = o.buyall || !['merchant', 'expert'].includes(o.policy);
  if (o.dump == null) o.dump = o.policy !== 'beginner';
  return o;
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────── 게임 문맥 ─────────
// --set='{"shop.guard.wage":15,"shop.goods.sign.cost":150,"config.storageExpand.steps.0.cost":250}' — WS.data 아래 경로 (배열은 번호 또는 id)
function applySet(WS, set) {
  for (const [p, v] of Object.entries(set || {})) {
    const keys = p.split('.');
    let o = WS.data;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      o = Array.isArray(o) && !/^\d+$/.test(k) ? o.find(x => x && x.id === k) : o[k];
      if (o == null) throw new Error('--set 경로 없음: ' + p);
    }
    const last = keys[keys.length - 1];
    if (Array.isArray(o) && !/^\d+$/.test(last)) throw new Error('--set 경로 끝은 값이어야 함: ' + p);
    o[last] = v;
  }
}

function makeWorld(seed, cfgOverride, set) {
  const store = {};
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    localStorage: {
      getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }, clear: () => { for (const k in store) delete store[k]; },
    },
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    Audio: function Audio() { return { canPlayType: () => '', play: () => Promise.resolve(), cloneNode() { return this; }, load() {}, addEventListener() {} }; },
    Image: function Image() {},
    matchMedia: () => ({ matches: false }),
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {} }), body: { appendChild() {} } },
    navigator: { userAgent: 'node' },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  ctx.__rand = mulberry32(seed);
  vm.runInContext('Math.random = () => __rand(); (() => { let t = 1.7e12; Date.now = () => (t += 1000); })();', ctx);
  for (let i = 0; i < SCRIPTS.length; i++) {
    SCRIPTS[i].runInContext(ctx);
    if (FILES[i] === 'js/data/config.js' && cfgOverride) Object.assign(ctx.WS.data.config, cfgOverride);
  }
  applySet(ctx.WS, set);
  return ctx;
}

// ───────── 한 판 ─────────
const MAX_DAYS = 60;
const SAMPLE_DAYS = [5, 10, 20, 30, 40];

function playRun(seed, opt) {
  const ctx = makeWorld(seed, opt.cfg, opt.set);
  const WS = ctx.WS;
  const rnd = mulberry32(seed ^ 0x9e3779b9); // 정책 쪽 무작위 (게임 난수와 따로)
  const D = WS.sys.Day, T = WS.sys.Trade, Inv = WS.sys.Inventory, M = WS.sys.Market, L = WS.sys.Letters;
  const S = () => WS.Game.state;
  opt = fillDefaults({ ...opt });
  const TIER = opt.policy;
  const P = { beginner: 'natural', intermediate: 'natural', expert: 'merchant' }[TIER] || TIER; // 판매·선택 규칙의 바탕
  const BEG = TIER === 'beginner';
  const res = { seed, ending: null, bankruptDay: null, days: 0, gold: {}, error: null, stuck: 0, noEnding: false, over60: false,
    promised: 0, sold: 0, refused: 0, minGold: Infinity, loans: 0, sink: 0 };
  const noteLow = () => { if (S().day >= 4) res.minGold = Math.min(res.minGold, S().gold); };
  const demand = {}; // 물건 id → 최근 요구 수량 (지수 감쇠)
  const pickOne = list => list[Math.floor(rnd() * list.length)];
  // 되돌릴 수 없는 선택(ch.confirm — 열쇠를 넘긴다 등)은 다른 게 없을 때만. 빚 수금원에게는 낼 수 있으면(오늘 밤 임대료를 남기고) 낸다
  const choosePolicy = (list, c) => {
    if (list.some(ch => !ch.confirm)) list = list.filter(ch => !ch.confirm);
    // 금화를 내는 선택지로 오늘 밤 임대료·구독료를 못 내게 되면 고르지 않는다 (HUD 에 임대료가 늘 보인다) — 다른 게 있을 때만
    const gOf = ch => (ch.effects && typeof ch.effects.gold === 'number' ? ch.effects.gold : 0);
    const nightly = D.rent() + (S().subscribed ? WS.data.shop.paper.fee : 0);
    if ((!BEG || rnd() < 0.7) && list.some(ch => S().gold + gOf(ch) >= nightly)) list = list.filter(ch => S().gold + gOf(ch) >= nightly);
    if (!list.length) return null;
    if (c && /^debt_/.test(c.tpl || '') && P !== 'merchant') {
      const g = ch => (ch.effects && typeof ch.effects.gold === 'number' ? ch.effects.gold : 0);
      const pay = list.find(ch => /^pay/.test(ch.id) && S().gold + g(ch) >= (BEG ? 0 : D.rent()));
      if (pay) return pay;
      const later = list.find(ch => ch.id === 'delay');
      if (later) return later;
    }
    if (P === 'kind') return list[0];
    if (P === 'merchant') {
      const g = ch => (ch.effects && typeof ch.effects.gold === 'number' ? ch.effects.gold : 0);
      return list.reduce((b, ch) => (g(ch) > g(b) ? ch : b), list[0]);
    }
    return pickOne(list);
  };
  const buffer = () => {
    const st = S();
    const daily = D.rent() + (st.subscribed ? WS.data.shop.paper.fee : 0) + (WS.sys.Shop.guarded() ? WS.data.shop.guard.wage : 0);
    return Math.round(daily * (opt.buffer ?? (BEG ? 0.5 : P === 'merchant' ? 1.5 : 2)));
  };

  // 요청에 맞는 창고 물건 (분류형 요청이면 받아 주는 것만) — 선호 소분류 먼저
  const acceptOf = (r, id) => {
    if (r.item) return id === r.item ? { price: M.price(id), accepted: true, preferred: true } : null;
    const o = T.offerForCategoryItem({ request: { ...r, qty: 1 } }, id);
    return o && o.accepted ? o : null;
  };
  function noteDemand(c) {
    const r = c.request;
    if (!r || c.kind !== 'buy') return;
    if (r.item) { demand[r.item] = (demand[r.item] || 0) + r.qty; return; }
    const ids = M.supplyList().filter(id => acceptOf(r, id));
    const pref = ids.filter(id => acceptOf(r, id).preferred);
    const use = pref.length ? pref : ids;
    use.forEach(id => { demand[id] = (demand[id] || 0) + r.qty / use.length; });
  }

  // UI tableDeal/linePrice 와 같은 값으로 테이블 줄을 만든다. 재고로 채울 수 있는 만큼 (r.qty 한도)
  function planLines(c) {
    const r = c.request;
    const st = S();
    const lines = [];
    const linePrice = (id, q) => (r.category ? (T.offerForCategoryItem({ request: { ...r, qty: q } }, id) || {}).price || 0 : Math.round((r.offer / r.qty) * q));
    if (r.item) {
      const n = Math.min(Inv.count(r.item), r.qty);
      if (n > 0) lines.push({ item: r.item, qty: n, price: linePrice(r.item, n) });
      return lines;
    }
    const ids = Object.keys(st.inventory).filter(id => Inv.count(id) > 0 && acceptOf(r, id));
    if (r.exact) {
      for (const [sub, need] of Object.entries(r.exact)) {
        let left = need;
        for (const id of ids.filter(i => WS.sys.Items.get(i).subtype === sub)) {
          const q = Math.min(left, Inv.count(id));
          if (q > 0) { lines.push({ item: id, qty: q, price: linePrice(id, q) }); left -= q; }
        }
      }
      return lines;
    }
    // 선호 소분류 먼저, 그다음 개당 받는 값 − 원가가 큰 순
    const gain = id => acceptOf(r, id).price - Inv.costBasis(id);
    ids.sort((a, b) => (acceptOf(r, b).preferred ? 1 : 0) - (acceptOf(r, a).preferred ? 1 : 0) || gain(b) - gain(a));
    let left = r.qty;
    for (const id of ids) {
      if (left <= 0) break;
      const q = Math.min(left, Inv.count(id));
      lines.push({ item: id, qty: q, price: linePrice(id, q) });
      left -= q;
    }
    return lines;
  }
  const qtyOf = lines => lines.reduce((s, l) => s + l.qty, 0);
  const costOf = lines => lines.reduce((s, l) => s + Inv.costBasis(l.item) * l.qty, 0);
  const priceOf = lines => lines.reduce((s, l) => s + l.price, 0);
  const exactOk = (r, lines) => {
    if (!r.exact) return true;
    const by = {};
    lines.forEach(l => { const sub = WS.sys.Items.get(l.item).subtype; by[sub] = (by[sub] || 0) + l.qty; });
    return !Object.entries(r.exact).some(([k, n]) => (by[k] || 0) !== n);
  };

  // 궁핍한 손님에게 얹을 덤 (kind) — 요구 밖의 가장 싼 물건 하나, giftCap 안에서
  function giftLine(c, used) {
    const cap = T.giftCap(c);
    const ids = Object.keys(S().inventory).filter(id => Inv.count(id) - (used[id] || 0) > 0 && !acceptOf(c.request, id) && M.price(id) <= cap)
      .sort((a, b) => M.price(a) - M.price(b));
    return ids.length ? { item: ids[0], qty: 1, price: 0, gift: true } : null;
  }

  function doSell(c, lines, extra) {
    c.request = { ...c.request, item: lines[0].item, offer: priceOf(lines) };
    T.sellLines(c, lines.concat(extra || []), []);
    res.sold++;
  }

  function handleBuy(c) {
    const r = c.request;
    if (!r) return T.refuse(c);
    if (c.angry && !c.calmed && P === 'kind' && Object.values(S().inventory).some(n => n > 0)) L.angerGift(c);
    let lines = planLines(c);
    let q = qtyOf(lines);
    if (q < r.qty) {
      // 모자라다 — 없으면 「내일 다시 오시오」, 있으면 부분 판매(허용될 때), 그것도 안 되면 약속, 끝으로 거절
      const canPart = q > 0 && r.partialOk !== false && exactOk(r, lines);
      if (!canPart && L.canPromise(c).ok) {
        L.promiseReturn(c);
        if (c.status === 'done') { if (c.result === 'promised') res.promised++; return; }
        lines = planLines(c); // 'partial' 반응: 있는 만큼으로 줄였다
        q = qtyOf(lines);
      }
      if (!(q > 0 && (q >= c.request.qty || c.request.partialOk !== false) && exactOk(c.request, lines))) { res.refused++; return T.refuse(c); }
    }
    if (!lines.length || !exactOk(r, lines)) { res.refused++; return T.refuse(c); }
    const poor = T.isPoor(c);
    if (P === 'merchant' && priceOf(lines) < costOf(lines)) { res.refused++; return T.refuse(c); }
    if (P === 'kind' && poor && r.item) {
      const used = {}; lines.forEach(l => { used[l.item] = (used[l.item] || 0) + l.qty; });
      const g = giftLine(c, used);
      if (rnd() < 0.3) {
        c.request = { ...c.request, item: lines[0].item, offer: 0 };
        T.forgive(c, lines.map(l => ({ item: l.item, qty: l.qty })), g ? [{ item: g.item, qty: g.qty }] : []);
        res.sold++;
        return;
      }
      return doSell(c, lines, g ? [g] : []);
    }
    doSell(c, lines);
  }

  function handleCustomer(c) {
    if (c.kind === 'buy') noteDemand(c);
    if (c.kind === 'talk') {
      const list = T.availableChoices(c).filter(ch => ch.needs !== 'poster');
      const ch = choosePolicy(list, c);
      if (ch) T.choose(c, ch.id);
    } else if (c.kind === 'buy') handleBuy(c);
    else if (c.kind === 'sell') {
      const r = c.request;
      const okUi = S().gold >= r.price && Inv.canAdd(r.item, r.qty);
      const cheap = P !== 'merchant' || r.price <= M.price(r.item) * r.qty * 0.65;
      if (okUi && cheap && S().gold - r.price >= buffer()) T.buyFrom(c);
      else T.refuse(c);
    } else if (c.kind === 'trade') {
      const t = c.trade;
      const ratio = { natural: 0.9, merchant: 1.0, kind: 0 }[P];
      const fair = T.sideValue(t.give) + t.gold >= T.sideValue(t.want) * ratio;
      if (T.tradeStatus(c).ok && fair) T.exchange(c);
      else T.refuse(c);
    } else T.refuse(c);
    if (c.status !== 'done') {
      // 고를 선택지가 없었다 등 — UI 라면 거절 버튼(대화 손님은 없음)밖에 없다
      if (c.kind !== 'talk') T.refuse(c);
      if (c.status !== 'done') { res.stuck++; c.status = 'done'; c.result = 'stuck'; }
    }
  }

  // ───────── 돈 쓰는 곳 (--buyall) · 대출 ─────────
  // UI 는 모두 까마귀 서신 작성 화면(mail-send → Letters.send)으로 한다: paper_sub · guard_hire · shop{good} · expand · loan{amount} · loan_repay
  const nightlyCost = () => D.rent() + (S().subscribed ? WS.data.shop.paper.fee : 0) + (WS.sys.Shop.guarded() ? WS.data.shop.guard.wage : 0);
  const spend = fn => { const g = S().gold; const r = fn(); if (r && r.ok && S().gold < g) res.sink += g - S().gold; return r; };
  // 은화 저울 상회 할부 (js/data/stories.js — 6·12·18·26일 80·110·140·170G, 수금원이 일정을 말해 준다) + 밀린 빚.
  // 중수·고수는 사흘 안에 올 할부와 밀린 빚을 남겨 두고 물품을 산다 (초보는 따지지 않는다)
  const INST = [[6, 80], [12, 110], [18, 140], [26, 170]];
  function debtReserve() {
    const st = S();
    if (st.flags.debt_cleared !== undefined || st.flags.shop_seized !== undefined) return 0;
    const next = INST.find(([d]) => d >= st.day && d - st.day <= 3);
    return (next ? next[1] : 0) + (WS.sys.World.get('debt_due') || 0);
  }
  function sinks() {
    const st = S();
    if (!opt.buyall || !L.crowReady()) return;
    // 초보는 오늘 밤 낼 돈만 남기면 산다 / 중수는 임대료 이틀치를 남기고 / 고수는 그보다 200G 더 남기고
    const floor = BEG ? nightlyCost() : (TIER === 'expert' || P === 'merchant' ? buffer() + 200 : buffer()) + debtReserve();
    if (!WS.sys.Shop.subscribed()) L.send('paper_sub');
    if (!WS.sys.Shop.guarded() && st.gold - WS.data.shop.guard.wage >= floor) L.send('guard_hire');
    for (const g of WS.sys.Shop.goods()) if (g.ok && st.gold - g.cost >= floor) spend(() => L.send('shop', { good: g.id }));
    const X = Inv.nextStep();
    if (X && !(st.letters && st.letters.expandOrder) && st.gold - X.cost >= floor) spend(() => L.send('expand'));
  }
  // 대출: 초보(와 중수의 마지막 수단)는 오늘 밤 낼 돈이 모자라면 빌린다. 갚을 수 있으면 갚는다
  function loans(allow) {
    const st = S();
    if (!L.crowReady()) return;
    const cl = L.crowLoan && L.crowLoan();
    if (cl) {
      const owed = L.loanOwed(cl);
      if (st.gold - owed >= nightlyCost() * (BEG ? 1 : 2)) spend(() => L.send('loan_repay'));
      return;
    }
    if (!allow || st.gold >= nightlyCost()) return;
    const need = nightlyCost() - st.gold;
    const amt = WS.data.letters.crowLoan.limits.find(v => v >= need + 50) || WS.data.letters.crowLoan.limits.slice(-1)[0];
    if (L.send('loan', { amount: amt }).ok) res.loans++;
  }

  // 아침 도매상 (2일째부터 — 1일째는 도매상 쪽이 없다)
  function wholesale() {
    const st = S();
    D.toPrep();
    // 상인회 구제 대출을 갚는다 (UI guildRepayBox → repayGuild)
    if (st.guildLoan && st.guildLoan.left > 0) {
      const pay = Math.min(st.guildLoan.left, st.gold - buffer());
      if (pay > 0) D.repayGuild(pay);
    }
    // 금고가 오늘 밤 임대료·구독료에도 못 미치면 수요가 적은 물건부터 도매상에 넘긴다 (UI 경고 줄 "이대로면 임대료를 못 낸다")
    const nightly = D.rent() + (st.subscribed ? WS.data.shop.paper.fee : 0);
    for (let g = 0; opt.dump && g < 400 && D.cartPreview().gold < nightly; g++) {
      const pv = D.cartPreview();
      const ids = Object.keys(pv.inv).filter(id => pv.inv[id] > 0 && M.wholesale(id) > 0 && !(WS.sys.Progress.deposited && WS.sys.Progress.deposited(id)))
        .sort((a, b) => (demand[a] || 0) - (demand[b] || 0) || M.wholesale(b) - M.wholesale(a));
      if (!ids.length) break;
      const before = st.cart[ids[0]] || 0;
      D.cartAdjust(ids[0], -1);
      if ((st.cart[ids[0]] || 0) === before) break;
      res.dumped = (res.dumped || 0) + 1;
    }
    const supply = M.supplyList();
    const want = {};
    // 초보: 목표를 들쭉날쭉하게 잡는다 (0.6~1.8배 — 가끔 과하게 들인다)
    for (const [id, d] of Object.entries(demand)) if (supply.includes(id)) want[id] = Math.ceil(d * (BEG ? 0.6 + rnd() * 1.2 : P === 'merchant' ? 1.3 : 1));
    // 오늘 다시 오는 약속 손님 몫 (대기열에 이미 있다)
    for (const c of st.queue) {
      if (!c.returning || !c.request || c.kind !== 'buy') continue;
      const r = c.request;
      const ids = r.item ? [r.item] : supply.filter(id => acceptOf(r, id));
      const id = ids.filter(i => supply.includes(i)).sort((a, b) => M.cost(a) - M.cost(b))[0];
      if (id) want[id] = (want[id] || 0) + r.qty;
    }
    const floor = buffer() + (BEG ? 0 : debtReserve());
    const margin = id => M.price(id) - M.cost(id);
    for (let guard = 0; guard < 400; guard++) {
      const pv = D.cartPreview();
      const cands = Object.keys(want).filter(id => (pv.inv[id] || 0) < want[id] && (BEG || margin(id) > 0) && pv.gold - M.cost(id) >= floor);
      if (!cands.length) break;
      if (BEG) cands.sort(() => rnd() - 0.5); // 초보는 마진을 따지지 않고 눈에 띄는 대로
      else cands.sort((a, b) => ((want[b] - (pv.inv[b] || 0)) * margin(b)) - ((want[a] - (pv.inv[a] || 0)) * margin(a)));
      let moved = false;
      for (const id of cands) {
        const before = st.cart[id] || 0;
        D.cartAdjust(id, 1);
        if ((st.cart[id] || 0) !== before) { moved = true; break; }
        delete want[id]; // 자리가 없다
      }
      if (!moved) break;
    }
    D.confirmCart();
    // merchant: 7일째 이후 넉넉하면 간판 (까마귀 서신 가게 물품)
    if (TIER === 'merchant' && st.day >= 7 && L.crowReady() && !WS.sys.Shop.owned('sign')) {
      const g = WS.sys.Shop.goods().find(x => x.id === 'sign');
      if (g && g.ok && st.gold - g.cost >= floor + 300) L.send('shop', { good: 'sign' });
    }
  }

  function night() {
    if (!D.nightDue()) return;
    if (!D.startNight()) return;
    for (let i = 0; i < 12; i++) {
      const v = D.nightState();
      if (!v || v.step === 'whisper') break;
      if (v.step === 'after') { if (D.whisperPending() && D.startWhisper()) continue; break; }
      const ch = choosePolicy(v.choices.filter(x => x.ok));
      if (!ch || !D.nightChoose(ch.id)) break;
    }
  }

  try {
    WS.Game.newGame();
    for (let guard = 0; guard <= MAX_DAYS; guard++) {
      const st = S();
      if (st.day > MAX_DAYS) { res.over60 = true; break; }
      // 아침: 오늘 온 편지를 읽는다 (UI morningLetters 가 읽음 표시)
      L.inbox().filter(x => x.day === st.day && !x.read).forEach(x => L.markRead(x.id));
      if (st.day > 1) {
        // 편지(가게 물품·경비·증축·대출)는 창고의 까마귀 자리에서 — 도매상 장부를 덮고 문을 연 뒤에 쓴다
        if (BEG) { loans(opt.loan !== false); wholesale(); sinks(); }
        else { wholesale(); sinks(); loans(TIER === 'intermediate'); }
      }
      noteLow();
      for (const k of Object.keys(demand)) demand[k] *= BEG ? 0.4 : 0.7;
      D.openShop();
      for (let i = 0; i < 80; i++) {
        if (!D.waiting().length) break;
        D.nextCustomer();
        const c = D.current();
        if (!c) break;
        if (c.status !== 'done') handleCustomer(c);
        if (BEG && opt.midday && i === 2) sinks(); // 초보는 영업 중에도 금고가 차면 곧장 주문한다
      }
      D.closeShop();
      noteLow();
      res.sink += (st.today.paper || 0) + (st.today.guard || 0);
      if (SAMPLE_DAYS.includes(st.day)) res.gold[st.day] = st.gold;
      if (opt.trace) (res.trace = res.trace || []).push({ day: st.day, gold: st.gold, ...st.today, inv: Object.values(st.inventory).reduce((a, b) => a + b, 0) });
      // 1일째 마감: 까마귀 안내 — 신문 구독 (UI tut-sub / tut-skip)
      if (st.day === 1 && L.crowReady()) {
        (st.progress.tutorialsSeen = st.progress.tutorialsSeen || {}).crow_paper = true;
        if (opt.paper) L.send('paper_sub');
        if (opt.buyall && !WS.sys.Shop.guarded() && st.gold >= WS.data.shop.guard.wage + (BEG ? 0 : buffer())) L.send('guard_hire');
      }
      night();
      res.days = st.day;
      D.nextDay();
      if (st.phase === 'ending' || WS.Game.state.phase === 'ending') break;
    }
    const st = S();
    res.ending = st.ending || null;
    if (!res.ending && !res.over60) res.noEnding = true;
    if (st.flags.bankrupt !== undefined) {
      res.bankruptDay = st.flags.bankrupt;
      res.bankruptCause = st.flags.shop_seized !== undefined ? 'seized' : st.flags.guild_default !== undefined ? 'guild' : 'rent';
    }
  } catch (e) {
    const frame = (String(e.stack || '').split('\n').find(l => /js\/[^)]+:\d+/.test(l)) || '').trim();
    res.error = `${e.message} @ ${frame.replace(/^at\s+/, '')}`;
    res.days = S() ? S().day : 0;
    res.ending = null;
  }
  return res;
}

// ───────── 요약 ─────────
const median = a => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const pctl = (a, q) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))]; };
function summarize(runs, opt) {
  const n = runs.length;
  const mins = runs.filter(r => Number.isFinite(r.minGold)).map(r => r.minGold);
  const bank = runs.filter(r => r.ending === 'bankrupt');
  const byCause = k => bank.filter(r => r.bankruptCause === k);
  const rentB = byCause('rent');
  const endings = {};
  runs.forEach(r => { if (r.ending) endings[r.ending] = (endings[r.ending] || 0) + 1; });
  const errors = {};
  runs.filter(r => r.error).forEach(r => { errors[r.error] = (errors[r.error] || 0) + 1; });
  const gold = {};
  SAMPLE_DAYS.forEach(d => { const v = runs.map(r => r.gold[d]).filter(x => x !== undefined); gold[d] = { median: median(v), n: v.length }; });
  const bankDays = {};
  bank.forEach(r => { const b = r.bankruptDay <= 10 ? '1-10' : r.bankruptDay <= 20 ? '11-20' : r.bankruptDay <= 30 ? '21-30' : '31-40'; bankDays[b] = (bankDays[b] || 0) + 1; });
  return {
    set: opt.set || null, n, policy: opt.policy, seed: opt.seed, paper: opt.paper, dump: opt.dump, buffer: opt.buffer, cfg: opt.cfg || null,
    bankrupt: bank.length, bankruptRate: bank.length / n, bankruptMedianDay: median(bank.map(r => r.bankruptDay)), bankruptByPeriod: bankDays,
    bankruptRent: rentB.length, bankruptRentMedianDay: median(rentB.map(r => r.bankruptDay)), bankruptSeized: byCause('seized').length, bankruptGuild: byCause('guild').length,
    gold, endings: Object.fromEntries(Object.entries(endings).sort((a, b) => b[1] - a[1])),
    exceptions: runs.filter(r => r.error).length, errors, noEnding: runs.filter(r => r.noEnding).length, over60: runs.filter(r => r.over60).length,
    stuckCustomers: runs.reduce((s, r) => s + r.stuck, 0),
    buyall: !!opt.buyall,
    // 4일째부터 판마다 가장 낮았던 금고(아침 구매 뒤 · 마감 뒤)의 중앙값 / 하위 10% / 50G 밑으로 떨어진 판 비율
    minGold: median(mins), minGoldP10: pctl(mins, 0.1), dipUnder50: runs.filter(r => r.minGold < 50).length / n,
    loanRuns: runs.filter(r => r.loans > 0).length / n, sinkMedian: median(runs.map(r => r.sink)),
    endingMax: Object.entries(endings).filter(([k]) => k !== 'bankrupt').reduce((b, e) => (e[1] > b[1] ? e : b), ['-', 0]),
  };
}

function print(sum) {
  const pct = x => `${(x * 100).toFixed(1)}%`;
  console.log(`policy=${sum.policy} buyall=${sum.buyall ? 1 : 0} n=${sum.n} seed=${sum.seed} paper=${sum.paper ? 1 : 0} dump=${sum.dump ? 1 : 0} buffer=${sum.buffer ?? '기본'} cfg=${sum.cfg ? JSON.stringify(sum.cfg) : '(기본)'}${sum.set ? ' set=' + JSON.stringify(sum.set) : ''}`);
  console.log(`파산 ${sum.bankrupt}/${sum.n} (${pct(sum.bankruptRate)}) · 파산일 중앙값 ${sum.bankruptMedianDay ?? '-'} · 시기별 ${JSON.stringify(sum.bankruptByPeriod)}`);
  console.log(`  원인: 임대료 ${sum.bankruptRent}(중앙값 ${sum.bankruptRentMedianDay ?? '-'}일) · 압류(열쇠) ${sum.bankruptSeized} · 상회 구제대출 연체 ${sum.bankruptGuild}`);
  console.log(`금고 중앙값(마감 뒤) ${SAMPLE_DAYS.map(d => `${d}일 ${sum.gold[d].median ?? '-'}(n${sum.gold[d].n})`).join(' · ')}`);
  console.log(`예외 ${sum.exceptions} · 엔딩 없음 ${sum.noEnding} · 60일 초과 ${sum.over60} · 막힌 손님 ${sum.stuckCustomers}`);
  console.log(`최저 금고(4일째~) 중앙값 ${sum.minGold} · 하위10% ${sum.minGoldP10} · 50G 밑 ${pct(sum.dipUnder50)} · 대출 쓴 판 ${pct(sum.loanRuns)} · 돈 쓴 곳 합 중앙값 ${sum.sinkMedian}G · 최다 엔딩 ${sum.endingMax[0]} ${pct(sum.endingMax[1] / sum.n)}`);
  console.log('엔딩: ' + Object.entries(sum.endings).map(([k, v]) => `${k} ${v}`).join(', '));
  for (const [m, k] of Object.entries(sum.errors)) console.log(`  예외 ×${k}: ${m}`);
}

if (require.main === module) {
  const opt = parseArgs(process.argv.slice(2));
  const runs = [];
  for (let i = 0; i < opt.n; i++) {
    runs.push(playRun(opt.seed * 100003 + i, opt));
    if (!opt.quiet && process.stderr.isTTY) process.stderr.write(`\r${i + 1}/${opt.n}`);
  }
  if (!opt.quiet && process.stderr.isTTY) process.stderr.write('\n');
  const sum = summarize(runs, opt);
  print(sum);
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ summary: sum, runs }, null, 1));
}

module.exports = { playRun, summarize, makeWorld };

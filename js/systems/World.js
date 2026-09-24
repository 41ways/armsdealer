// 세계 상태 변수 + 밤사이 자연 변화(시뮬레이션)
WS.sys.World = (() => {
  const S = () => WS.Game.state;
  const def = k => WS.data.worldVars[k] || {};

  function init() {
    const w = {};
    for (const [k, d] of Object.entries(WS.data.worldVars)) w[k] = d.init;
    return w;
  }

  const get = k => S().world[k] ?? 0;

  function set(k, v) {
    const d = def(k);
    S().world[k] = WS.util.clamp(v, d.min ?? 0, d.max ?? 100);
  }

  const add = (k, dv) => set(k, get(k) + dv);

  // ───────── 천칭단의 저울: 주된 세력 사이의 균형 (config.liga) ─────────
  // 주된 세력 = 관계의 절댓값이 가장 큰 mainCount 곳 (많이 얽힌 세력). top = 그중 가장 우호적인 곳
  const facOfRel = v => Object.values(WS.data.factions).find(f => f.visit && f.visit.var === v) || null;
  function balance() {
    const L = WS.data.config.liga;
    const main = L.rels.map(v => ({ v, x: get(v) })).sort((a, b) => Math.abs(b.x) - Math.abs(a.x)).slice(0, L.mainCount);
    const top = main.reduce((a, b) => (b.x > a.x ? b : a));
    const low = main.reduce((a, b) => (b.x < a.x ? b : a));
    // 맞수: 선두 세력의 천적 가운데 지금 관계가 가장 나쁜 곳 (없으면 주된 세력 중 가장 나쁜 곳)
    const foes = ((L.rivals || {})[top.v] || []).filter(v => facOfRel(v));
    const rv = foes.length ? foes.reduce((a, b) => (get(b) < get(a) ? b : a))
      : low.v !== top.v ? low.v : (L.rels.find(v => v !== top.v) || top.v);
    const nm = v => (facOfRel(v) || {}).name || '어느 세력';
    return { main, top, low, gap: top.x - low.x, topName: nm(top.v), rival: rv, rivalName: nm(rv) };
  }
  // 대사·기사에 넣는 자리표: {top}(선두 세력 이름) · {topWa}(…과/와) · {topI}(…이/가) · {topUl}(…을/를) · {topUn}(…은/는)
  //   {rival}(선두 세력의 맞수) · {rivalWa} · {rivalI} · {rivalUl} · {rivalUn} · {stolen}(방금 도둑맞은 금화)
  function textCtx() {
    const b = balance(), J = WS.util.josa;
    const ctx = { stolen: S().lastStolen || 0 };
    [['top', b.topName], ['rival', b.rivalName]].forEach(([k, n]) => {
      Object.assign(ctx, { [k]: n, [k + 'Wa']: J(n, '과', '와'), [k + 'I']: J(n, '이', '가'), [k + 'Ul']: J(n, '을', '를'), [k + 'Un']: J(n, '은', '는') });
    });
    return ctx;
  }

  // 천천히 원래 값으로 돌아가려는 힘
  const toward = (k, target, rate) => add(k, (target - get(k)) * rate);

  // 밤마다 세계가 한 걸음 — config.dayWarp 로 캠페인을 줄였다면 그날 밤의 이야기일 수(eday 차이)만큼 걸음을 되풀이해 늦은 세계 변화도 같이 앞당긴다
  // (dayWarp 가 없거나 dayWarpWorld === false 면 언제나 한 걸음 — 기본 40일 게임은 그대로)
  function nightly() {
    const st = S();
    let steps = 1;
    if (WS.data.config.dayWarp && WS.data.config.dayWarpWorld !== false) {
      const E = WS.sys.Conditions.eday;
      steps = Math.max(1, E(st.day) - E(st.day - 1));
    }
    for (let i = 0; i < steps; i++) worldStep(st);
    driftGems();
  }

  function worldStep(st) {
    add('monster_pop', 0.6);
    add('border_tension', -0.8);
    add('goblin_power', 0.2 + get('goblin_unity') * 0.01);
    toward('kingdom_power', 30, 0.03);
    toward('iron_price', st.flags.war || st.flags.demon_war ? 130 : 100, 0.1);
    add('blackmarket', -0.3);
    toward('economy', 50, 0.05);
    toward('kingdom_morale', 50, 0.03);
    add('village_defense', -0.2);

    // 전쟁 중: 양측이 소모되며 우세한 쪽으로 추세가 기운다
    if (st.flags.war) {
      const diff = get('goblin_power') - get('kingdom_power');
      add('war_progress', diff * 0.25 + (get('goblin_unity') - 20) * 0.05);
      add('goblin_power', -1);
      add('kingdom_power', -1);
      add('border_tension', 2);
    }

    // 악마 영향력은 거래가 끊기면 서서히 옅어진다. 마왕군은 느리지만 꾸준히 불어난다.
    add('demon_influence', -0.3);
    add('demonlord_power', 0.15 + get('demon_influence') * 0.005);
    add('invasion_risk', -0.5 + Math.max(0, get('demonlord_power') - 28) * 0.04);
    if (st.flags.demon_war) {
      add('kingdom_power', -1.2);
      add('demonlord_power', -0.6);
      add('kingdom_morale', -1);
      add('economy', -0.5);
    }

    // 데이터로 정의된 자연 변화: worldVars 의 drift(매일 증감) / toward([목표, 속도])
    for (const [k, d] of Object.entries(WS.data.worldVars)) {
      if (d.drift) add(k, d.drift);
      if (d.toward) toward(k, d.toward[0], d.toward[1]);
    }
    // 세력 사이의 얽힘 (config.js nightlyRules). 값이 [변수, 배율] 이면 그 변수 × 배율만큼
    for (const r of WS.data.nightlyRules || []) {
      if (!WS.sys.Conditions.check(r.when)) continue;
      for (const [k, v] of Object.entries(r.vars)) add(k, Array.isArray(v) ? get(v[0]) * v[1] : v);
    }
  }

  // ───────── 보석 시세 드리프트 (Phase 1) ─────────
  // 보석(newCategory:'gem')은 일반 시세 로직(worldVars 연동)을 타지 않고, 매일 밤 독립적으로
  // ±8% 랜덤워크한다. 0.6~1.8 배율 구간에 붙잡아 둔다. UI(phase 2)는 어제 값과 비교해 ▲/▼를 보여준다.
  const GEM_DRIFT = 0.08;
  const GEM_MIN = 0.6;
  const GEM_MAX = 1.8;

  function driftGems() {
    const st = S();
    st.gemTrend = st.gemTrend || defaultGemTrend();
    st.gemTrendPrev = { ...st.gemTrend };
    for (const sub of Object.keys(WS.data.categories.gem.subtypes)) {
      const cur = st.gemTrend[sub] ?? 1.0;
      const next = cur * (1 + WS.util.rand(-GEM_DRIFT, GEM_DRIFT));
      st.gemTrend[sub] = WS.util.clamp(next, GEM_MIN, GEM_MAX);
    }
  }

  function defaultGemTrend() {
    const t = {};
    for (const sub of Object.keys(WS.data.categories.gem.subtypes)) t[sub] = 1.0;
    return t;
  }

  // 보석 소분류의 현재 배율과 어제 배율 (UI의 ▲/▼ 표시용)
  function gemTrend(subtype) {
    const st = S();
    st.gemTrend = st.gemTrend || defaultGemTrend();
    st.gemTrendPrev = st.gemTrendPrev || { ...st.gemTrend };
    return { current: st.gemTrend[subtype] ?? 1.0, prev: st.gemTrendPrev[subtype] ?? 1.0 };
  }

  return { init, get, set, add, nightly, defaultGemTrend, gemTrend, balance, textCtx };
})();

WS.sys.Items = (() => {
  const get = id => WS.data.items[id];
  const hasTag = (id, tag) => {
    const it = get(id);
    return !!it && (it.category === tag || it.tags.includes(tag));
  };
  // 옛 이름(aliasOf) → 대표 종류. 플레이어는 칼/활/전투도끼… 같은 종류만 다룬다
  const canon = id => {
    const it = get(id);
    return (it && it.aliasOf) || id;
  };
  const isAlias = id => !!(get(id) && get(id).aliasOf);
  // 창고의 어느 자리에 있는 물건인가 (items.js shelf)
  const shelf = id => {
    const it = get(canon(id));
    return (it && it.shelf) || null;
  };
  // 한 자리에 놓이는 물건들 (별칭 제외, items.js 순서)
  const onShelf = place => Object.keys(WS.data.items).filter(id => !isAlias(id) && WS.data.items[id].shelf === place);
  return { get, hasTag, canon, isAlias, shelf, onShelf };
})();

// 재고: 아이템마다 한 칸에 들어가는 수량(stack)이 다르다
WS.sys.Inventory = (() => {
  const S = () => WS.Game.state;
  // 재고는 늘 대표 종류 id 로만 쌓인다 (옛 이름으로 물어도 대표 종류를 센다)
  const C = id => WS.sys.Items.canon(id);
  const count = id => S().inventory[C(id)] || 0;
  // 부피 체계: 물건 1개의 부피 = 창고 한 칸(slotVolume) ÷ stack. 창고 용량 = shopSlots × slotVolume.
  // (예전 함수 이름 slotsFor/usedSlots/capacity 는 그대로 두되 값은 이제 '부피'다.)
  const VOL = () => WS.data.config.slotVolume || 24;
  const unitSize = id => VOL() / WS.sys.Items.get(C(id)).stack;
  const slotsFor = (id, qty) => (qty > 0 ? Math.round(qty * unitSize(id) * 100) / 100 : 0);

  function usedSlots(inv) {
    inv = inv || S().inventory;
    return Object.entries(inv).reduce((s, [id, q]) => s + slotsFor(id, q), 0);
  }

  // 칸 수. 뒷문 배달(튜토리얼 손님이 연 자리의 첫 물건 · 편지 주문 · 이야기 보상)은 force 로 이 제한을 넘을 수 있다
  // 창고 확장 단계 (0~3). 예전 저장본: storageExpanded === true 면 1단계
  const STEPS = () => WS.data.config.storageExpand.steps;
  const level = () => (S().storageLevel != null ? S().storageLevel : (S().storageExpanded ? 1 : 0));
  const maxLevel = () => STEPS().length;
  const nextStep = () => STEPS()[level()] || null;
  const extraSlots = () => STEPS().slice(0, level()).reduce((s, x) => s + x.slots, 0);
  const capacity = () => (WS.data.config.shopSlots + extraSlots()) * VOL();
  // 창고 확장 — 까마귀 편지(증축 의뢰)로: 보낼 때 선불(payExpand), 목수의 답장이 오는 날 단계 +1(applyExpand)
  function payExpand() {
    const X = nextStep();
    if (!X || S().gold < X.cost) return false;
    S().gold -= X.cost;
    return true;
  }
  function applyExpand() {
    if (level() >= maxLevel()) return false;
    S().storageLevel = level() + 1;
    return true;
  }

  function canAdd(id, qty) {
    id = C(id);
    const inv = { ...S().inventory, [id]: count(id) + qty };
    return usedSlots(inv) <= capacity();
  }

  // 발견: 한 번이라도 손에 넣은 물건 (state.discovered[id] = 처음 얻은 날). 이야기 전용(supplyWhen:false) 물건은
  // 발견 전에는 창고 칸에 '미발견'으로만 나온다 (표시 전용)
  function markDiscovered(id) {
    const st = S();
    st.discovered = st.discovered || {};
    if (!st.discovered[id]) st.discovered[id] = st.day || 1;
  }
  function discovered(id) {
    id = C(id);
    const it = WS.sys.Items.get(id);
    if (!it || it.supplyWhen !== false) return true;
    const st = S();
    return !!((st.discovered && st.discovered[id]) || count(id) > 0 || (id === 'star_shard' && st.flags && st.flags.star_bought));
  }

  function add(id, qty, force) {
    id = C(id);
    if (!force && !canAdd(id, qty)) return false;
    S().inventory[id] = count(id) + qty;
    if (qty > 0) markDiscovered(id);
    // 잠긴 궤짝(special) 물건을 처음 손에 넣으면 궤짝이 열린다
    if (qty > 0 && WS.sys.Progress) WS.sys.Progress.noteOwned(id);
    return true;
  }

  function remove(id, qty) {
    id = C(id);
    if (count(id) < qty) return false;
    S().inventory[id] = count(id) - qty;
    if (S().inventory[id] <= 0) delete S().inventory[id];
    return true;
  }

  // ───────── 원가(매입가) 추적 (Phase 1) ─────────
  // 도매 입고나 손님 매입으로 물건이 들어올 때마다 가중평균 원가를 갱신한다.
  // UI(phase 2)는 "시세 대비 %" 대신 "받는 값 − 원가 = 마진"을 보여줄 예정이라 필요하다.
  function recordCost(id, qty, unitCost) {
    id = C(id);
    if (!(qty > 0)) return;
    const st = S();
    st.costBasis = st.costBasis || {};
    const cur = st.costBasis[id];
    if (!cur || !cur.qty) {
      st.costBasis[id] = { avg: unitCost, qty };
      return;
    }
    const totalQty = cur.qty + qty;
    const avg = (cur.avg * cur.qty + unitCost * qty) / totalQty;
    st.costBasis[id] = { avg, qty: totalQty };
  }

  // 아이템 하나의 현재 평균 원가. 매입 이력이 없으면 시세의 60%를 원가로 가정한다(도매가/원가 비율과
  // 비슷한 값이라 손님이 하나도 안 들렀을 때도 마진 표시가 undefined 로 깨지지 않게 한다).
  function costBasis(id) {
    id = C(id);
    const st = S();
    const rec = st.costBasis && st.costBasis[id];
    if (rec && rec.qty > 0) return rec.avg;
    return WS.sys.Market.price(id) * 0.6;
  }

  // 분류/소분류 단위 평균 원가 — 보유 수량으로 가중 평균한다. 보유가 없으면 그 소분류
  // 대표 아이템들의(costBasis 기본값) 단순 평균으로 대체한다.
  function categoryCostBasis(category, subtype) {
    const ids = Object.entries(WS.data.items)
      .filter(([, it]) => it.newCategory === category && (!subtype || it.subtype === subtype))
      .map(([id]) => id);
    if (!ids.length) return 0;
    let ownedSum = 0, ownedQty = 0;
    for (const id of ids) {
      const q = count(id);
      if (q > 0) { ownedSum += costBasis(id) * q; ownedQty += q; }
    }
    if (ownedQty > 0) return ownedSum / ownedQty;
    return ids.reduce((s, id) => s + costBasis(id), 0) / ids.length;
  }

  return { count, slotsFor, usedSlots, capacity, unitSize, level, maxLevel, nextStep, extraSlots, payExpand, applyExpand, canAdd, add, remove, discovered, markDiscovered, recordCost, costBasis, categoryCostBasis };
})();

// 시세: 세계 상태에 따라 매일 변한다
WS.sys.Market = (() => {
  const S = () => WS.Game.state;
  const W = k => WS.sys.World.get(k);

  let noRumor = false; // priceBase 가 켜 두는 동안 소문 시세를 뺀다
  function mult(id) {
    const it = WS.sys.Items.get(id);
    // 보석(newCategory:'gem')은 일반 공급/수요 시세 로직을 타지 않는다 — 매일 밤 독립적으로
    // 드리프트하는 gemTrend 배율만 쓴다 (World.nightly 의 driftGems 참고).
    if (it.newCategory === 'gem') return gemTrend(it.subtype).current;
    const mk = it.market || {};
    let m = 1;
    if (mk.iron) m += mk.iron * (W('iron_price') - 100) / 100;
    if (mk.war) m += mk.war * (W('border_tension') + (S().flags.war ? 30 : 0) + (S().flags.demon_war ? 30 : 0)) / 100;
    if (mk.monster) m += mk.monster * (W('monster_pop') - 30) / 100;
    if (mk.demon) m += mk.demon * (W('demon_influence') - 10) / 100;
    // 그 밖의 키는 세계 변수 이름 — 초기값보다 오른 만큼 시세가 오른다 (예: vampire_power: 0.8)
    for (const [k, v] of Object.entries(mk)) {
      const d = SPECIAL.includes(k) ? null : WS.data.worldVars[k];
      if (d) m += v * (W(k) - d.init) / 100;
    }
    // 열려 있는 소문(신문 ❓)이 잠깐 흔드는 값 — 정정·확인 기사가 나오면 원위치 (Rumors.js). 세계 변수는 건드리지 않는다
    if (WS.sys.Rumors && !noRumor && !(WS.sys.Calendar && WS.sys.Calendar.calm())) m *= WS.sys.Rumors.marketMult(id); // 장날엔 소문이 시세를 흔들지 않는다 (달력 이벤트)
    if (WS.sys.Calendar) m *= WS.sys.Calendar.priceMult(id); // 열병식 · 수확제 · 전염병이 며칠 동안 올리는 값 (state.marketMods)
    return WS.util.clamp(m, 0.5, 3);
  }
  const SPECIAL = ['iron', 'war', 'monster', 'demon'];
  // WS.sys.World 의 보석 드리프트 값 위임 (UI/외부에서는 Market.gemTrend 를 쓴다)
  const gemTrend = subtype => WS.sys.World.gemTrend(subtype);

  // 도매가 보정 (상인 길드 가입 할인, 카르텔 등 — config.js costMods)
  // items: [...] 가 있으면 그 물건에만 (화약 독점 판매상의 도매 할인 등) / category: 'weapon' 이면 그 분류에만 (드워프 왕국 함락 뒤 무기값)
  const costMod = id => (WS.data.config.costMods || []).reduce((m, r) =>
    ((!r.items || r.items.includes(WS.sys.Items.canon(id))) && (!r.category || WS.sys.Items.get(id).category === r.category)
      && WS.sys.Conditions.check(r.when) ? m * r.mult : m), 1);

  const price = id => Math.max(1, Math.round(WS.sys.Items.get(id).basePrice * mult(id)));
  // 소문(신문 ❓)이 흔든 값을 뺀 시세 — 세계 변수에 적히는 값(수비 물자 · 계약가)은 헛소문의 영향을 받지 않도록 이걸 쓴다 (Rumors.js)
  const priceBase = id => { noRumor = true; try { return price(id); } finally { noRumor = false; } };
  const cost = id => Math.max(1, Math.round(WS.sys.Items.get(id).cost * mult(id) * costMod(id)));
  // 처분 비율: 물건이 놓이는 창고 자리별(config.wholesaleSellRateByShelf), 없으면 기본 wholesaleSellRate
  const wholesaleRate = id => {
    const C = WS.data.config;
    const r = (C.wholesaleSellRateByShelf || {})[WS.sys.Items.shelf(id)];
    return r ?? C.wholesaleSellRate;
  };
  const wholesale = id => Math.max(1, Math.floor(cost(id) * wholesaleRate(id)));

  // 도매상에 입고되는 품목 (supplyWhen: false 는 스토리/교환 전용).
  // 옛 이름(aliasOf)은 절대 목록에 오르지 않고, 아직 열리지 않은 창고 자리의 물건도 빠진다 (Progress.canStock).
  // 오늘 튜토리얼 손님이 열 자리의 물건은 그 손님이 자리를 연 다음 날 아침부터 나온다 (첫 물건은 그 손님이 올 때 들어온다).
  // 첫날의 무기 거치대(progress.js startPlaces)만 레온이 오기 전 아침부터 들일 수 있다
  const open = id => !WS.sys.Progress || WS.sys.Progress.canStock(WS.sys.Items.shelf(id));
  const supplyList = () =>
    Object.keys(WS.data.items).filter(id => {
      const it = WS.data.items[id];
      if (it.aliasOf || !open(id)) return false;
      const w = it.supplyWhen;
      return w !== false && WS.sys.Conditions.check(w);
    });

  function setTrend(which) {
    const st = S();
    const C = WS.sys.Items.canon;
    let options = WS.data.goblinTrends;
    if (which !== 'random') options = options.filter(t => C(t.item) === C(which));
    else {
      if (st.trend) options = options.filter(t => C(t.item) !== C(st.trend.item));
      // 아직 창고에 자리가 없는 물건은 유행해 봐야 살 수가 없다
      const reachable = options.filter(t => open(t.item));
      if (reachable.length) options = reachable;
    }
    const t = WS.util.pick(options);
    if (!t) return;
    st.trend = { item: C(t.item), since: st.day };
    // 유행 기사는 NewsManager 가 st.trend 를 보고 직접 쓴다 (시작한 날 + 2~3일마다)
  }

  function snapshot() {
    const snap = {};
    for (const id of Object.keys(WS.data.items)) if (!WS.data.items[id].aliasOf) snap[id] = price(id);
    return snap;
  }

  return { mult, price, priceBase, cost, wholesale, wholesaleRate, supplyList, setTrend, snapshot, gemTrend };
})();

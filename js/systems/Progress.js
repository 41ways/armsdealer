// 튜토리얼 손님이 여는 창고 자리 · 맡은 물건(보관) · 초반 장사 규칙.
// 데이터는 js/data/progress.js (튜토리얼 손님 · 새벽 사건 · 초반 장사 규칙).
//
// 상태
//   WS.Game.state.progress = { unlocked: { place: 해금된 날 }, tutorialsSeen: { id: true }, beats: { scheduleId: 날 } }
//   WS.Game.state.deposits = [{ id, owner, name, items: { itemId: qty }, day, returnDay, customer, status }]
//     status: 'held' 창고에 맡아 둠 / 'gone' 다른 자에게 내줌(주인은 아직 모름) / 'settled' 주인과 정리됨
//
// 자리 해금: 새벽에 저절로 열리지 않는다. 그날 대기열 맨 앞의 튜토리얼 손님(c.tutorial)이 카운터 앞에 서는
//   순간 arrive(c) 가 그 자리를 연다 (DayManager.nextCustomer). 놓친 튜토리얼 손님은 다음 날 다시 맨 앞에 온다.
//   c.tutorial = { id, place, places, hint, unlocked: [이 손님이 방금 연 자리들] }
//   자리가 열리는 순간 그 자리의 첫 물건(progress.js stock)과 튜토리얼 손님이 살 물건 1개가 들어오고,
//   손으로 건네는 인상서(posters)가 서류함에 꽂힌다 (Letters.handPosters — 까마귀가 없어도).
//
// 물건을 들일 수 있는가(도매상 목록·시작 재고·유행): canStock(place) — 이미 열린 자리 + startPlaces(무기).
//   오늘 튜토리얼 손님이 열 자리의 물건은 다음 날 아침 도매상부터 나온다.
// 손님이 가져가거나 내놓을 물건: canGive / canReceive — 오늘 맨 앞 튜토리얼 손님이 열 자리도 친다
//   (그 손님 뒤에 오는 손님은 자리가 열린 뒤에 온다). 교환 손님은 canTradeAway — 어제 이전에 열린 자리만,
//   열린 지 early.tradeCap.days 일 안에는 tradeCap(id, qty) 만큼만 달라고 한다.
//
// UI 가 부르는 것
//   isUnlocked(place) · unlockedPlaces() · justUnlocked() · deposited(itemId) · canStock(place)
//   pendingTutorials() 는 늘 [] (예전 팝업 튜토리얼 — 호환용으로만 남김) · markTutorialSeen(id)
// 데이터(효과 DSL)가 부르는 것
//   unlock: ['gem'] · deposit: { owner, items, inDays } · withdraw: 'owner'   (EventManager.Effects)
//   조건 { deposit: { owner, intact } } · { unlocked: 'gem' }                   (Conditions)
WS.sys.Progress = (() => {
  const S = () => WS.Game.state;
  const D = () => WS.data.progress;
  const I = () => WS.sys.Items;

  function initState() {
    return { unlocked: {}, tutorialsSeen: {}, beats: {} };
  }

  // 상태 보장 (예전 저장본·타이틀 화면에서 불려도 깨지지 않게)
  function P() {
    const st = S();
    const p = st.progress || (st.progress = initState());
    for (const [k, v] of Object.entries(initState())) if (p[k] === undefined) p[k] = v;
    st.deposits = st.deposits || [];
    return p;
  }

  // ───────── 해금 ─────────
  const isUnlocked = place => !!place && P().unlocked[place] !== undefined;
  const unlockedPlaces = () => D().places.filter(isUnlocked);

  function unlock(place) {
    if (!place || isUnlocked(place)) return false;
    P().unlocked[place] = S().day;
    return true;
  }

  // ───────── 튜토리얼 손님 ─────────
  const tutorialList = () => D().tutorialCustomers || [];
  // 오늘까지 왔어야 할 튜토리얼 손님 중 아직 자리를 못 연 것 (그날 대기열 맨 앞에 선다)
  const dueTutorials = () => tutorialList().filter(t => t.day <= S().day && !t.places.every(isUnlocked));
  // 튜토리얼 손님이 살 물건 (틀의 request.item — 말만 하는 손님이면 null)
  function tutorialItem(t) {
    const tpl = WS.data.customers.find(c => c.id === t.customer);
    return tpl && tpl.request && tpl.request.item ? I().canon(tpl.request.item) : null;
  }
  // 이미 열렸거나, 오늘 맨 앞의 튜토리얼 손님이 곧 열 자리인가.
  // 대기열·도매 목록을 짤 때 쓴다 — 튜토리얼 손님 뒤에 오는 손님은 그 자리가 열린 뒤에 온다.
  const opensToday = place => isUnlocked(place) || dueTutorials().some(t => t.places.includes(place));

  // 튜토리얼 손님이 카운터 앞에 섰다 (DayManager.nextCustomer) → 자리를 연다. 방금 연 자리들을 돌려준다
  function arrive(c) {
    if (!c || !c.tutorial) return [];
    const opened = (c.tutorial.places || [c.tutorial.place]).filter(unlock);
    c.tutorial.unlocked = (c.tutorial.unlocked || []).concat(opened);
    const t = tutorialList().find(x => x.id === c.tutorial.id);
    if (opened.length && t) {
      // 새 자리의 첫 물건 + 튜토리얼 손님이 살 물건 1개 (첫 물건과 따로 — 뒷문 배달이라 칸 제한 무시)
      const stock = { ...(t.stock || {}) };
      const tid = tutorialItem(t);
      if (tid) stock[tid] = (stock[tid] || 0) + 1;
      for (const [id, n] of Object.entries(stock)) {
        if (!(n > 0)) continue;
        WS.sys.Inventory.add(id, n, true);
        WS.sys.Inventory.recordCost(id, n, WS.sys.Market.cost(id));
      }
      // 손으로 건네는 인상서 → 서류함 (까마귀 없이)
      if (t.posters && WS.sys.Letters && WS.sys.Letters.handPosters) WS.sys.Letters.handPosters(t.posters);
    }
    // 까마귀가 창틀에 앉은 순간 둥지지기의 안내장(과 아직 못 받은 인상서)이 편지함에 꽂힌다
    if (opened.includes('crow') && WS.sys.Letters && WS.sys.Letters.crowArrived) WS.sys.Letters.crowArrived();
    return opened;
  }

  // 지금 카운터 앞 손님이 방금 연 자리들 (UI 가 문 열리는 연출에 쓴다)
  function justUnlocked() {
    const st = S();
    const c = st && (st.queue || []).find(x => x.uid === st.current);
    return c && c.tutorial ? (c.tutorial.unlocked || []).slice() : [];
  }

  // 물건을 내줄 수 있는가 (손님이 사 가거나 교환으로 가져갈 물건) — 그 자리가 열려 있어야(오늘 열려야) 한다
  const canGive = id => opensToday(I().shelf(id));
  // 물건을 받을 수 있는가 — 잠긴 궤짝(special)은 물건이 들어오는 순간 열리므로 늘 받을 수 있다
  const canReceive = id => I().shelf(id) === 'special' || opensToday(I().shelf(id));
  // 물건을 들일 수 있는가 (도매상 목록 · 시작 재고 · 유행) — 이미 열린 자리, 또는 첫날부터 쓰는 자리(무기).
  // 오늘 튜토리얼 손님이 열 자리의 물건은 다음 날 아침부터 도매상에 나온다
  const canStock = place => isUnlocked(place) || (D().startPlaces || []).includes(place);

  // 교환 손님이 가져갈 물건 — 어제 이전에 열린 자리여야 한다 (연 날엔 도매상에서 채울 틈이 없다)
  const settled = place => isUnlocked(place) && P().unlocked[place] < S().day;
  const canTradeAway = id => settled(I().shelf(id));
  // 자리가 열린 지 tradeCap.days 일 안이면 교환 손님은 한 가지 물건을 tradeCap.max 개까지만 달라고 한다
  function tradeCap(id, qty) {
    const cap = early().tradeCap;
    const since = P().unlocked[I().shelf(id)];
    if (!cap || since === undefined || S().day - since > cap.days) return qty;
    return Math.min(qty, cap.max);
  }

  // Inventory.add 가 부른다
  function noteOwned(id) {
    if (I().shelf(id) === 'special') unlock('special');
  }

  // ───────── 예전 팝업 튜토리얼 (더는 띄우지 않는다 — 안내는 튜토리얼 손님의 c.tutorial.hint) ─────────
  const pendingTutorials = () => [];

  function markTutorialSeen(id) {
    P().tutorialsSeen[id] = true;
  }

  // ───────── 새벽 (DayManager.startDay: 세계 변화 뒤, 까마귀 편지·이벤트·대기열 전에) ─────────
  function dawn() {
    const st = S();
    const p = P();
    for (const e of D().schedule) {
      if (e.day > st.day) continue;
      if (p.beats[e.id] !== undefined) {
        (e.places || []).forEach(unlock);
        continue;
      }
      // when 이 아직 안 맞으면 다음 새벽에 다시 본다
      if (e.when && !WS.sys.Conditions.check(e.when)) continue;
      (e.places || []).forEach(unlock);
      p.beats[e.id] = st.day;
      if (e.effects) WS.sys.Effects.apply(e.effects);
    }
    // 튜토리얼 손님이 살 물건은 그 손님이 카운터 앞에 서는 순간 들어온다 (arrive)
    // 맡긴 물건의 주인이 찾으러 오는 날 (그날 못 만났으면 다음 날 또 온다)
    for (const d of st.deposits) {
      if (d.status === 'settled' || !d.customer || st.day < d.returnDay) continue;
      if (d.spawnedDay === st.day) continue;
      if (st.spawnQueue.some(s => s.customer === d.customer)) continue;
      // after: 이 손님(쥐수염)이 먼저 다녀간 뒤에 온다 — 물건이 아직 맡겨져 있고 그 손님이 안 왔으면 하루씩 미룬다
      // (그 손님이 끝내 안 오는 경우를 위해 원래 날짜에서 나흘까지만)
      if (d.after && d.status === 'held' && st.seenCustomers[d.after] === undefined && st.day < d.returnDay + 4) continue;
      st.spawnQueue.push({ customer: d.customer, day: st.day });
      d.spawnedDay = st.day;
    }
  }

  // ───────── 맡은 물건 ─────────
  // effect: { owner, name, items: { id: qty }, inDays, customer, after }
  //   after: 이 손님 틀 id 가 먼저 다녀가기 전에는 주인이 찾으러 오지 않는다 (dawn)
  function deposit(spec) {
    const st = S();
    const items = {};
    for (const [id, n] of Object.entries(spec.items || {})) {
      const c = I().canon(id);
      items[c] = (items[c] || 0) + n;
      WS.sys.Inventory.add(c, n, true);
    }
    st.deposits = st.deposits || [];
    st.deposits.push({
      id: `dep${st.day}_${st.deposits.length + 1}`, owner: spec.owner, name: spec.name || spec.owner,
      items, day: st.day, returnDay: st.day + (spec.inDays ?? 3), customer: spec.customer || null, status: 'held',
      after: spec.after || null,
    });
  }

  const activeFor = owner => (S().deposits || []).filter(d => d.owner === owner && d.status !== 'settled').pop() || null;

  // 'owner' 또는 { owner, to: 'other' } — 남은 만큼 창고에서 꺼낸다.
  // to 가 있으면 주인이 아닌 자에게 내준 것(status 'gone' — 주인은 아직 찾으러 온다), 없으면 주인과 정리(settled)
  function withdraw(spec) {
    const owner = typeof spec === 'string' ? spec : spec.owner;
    const d = activeFor(owner);
    if (!d) return false;
    if (d.status === 'held') {
      for (const [id, n] of Object.entries(d.items)) WS.sys.Inventory.remove(id, Math.min(n, WS.sys.Inventory.count(id)));
    }
    d.status = typeof spec === 'object' && spec.to ? 'gone' : 'settled';
    d.closedDay = S().day;
    return true;
  }

  // 조건 { deposit: { owner, intact } }: 아직 창고에 맡아 둔 상태인가 (intact: 맡은 수량이 전부 남아 있는가)
  function depositCheck(spec) {
    const d = activeFor(spec.owner);
    if (!d || d.status !== 'held') return false;
    if (!spec.intact) return true;
    return Object.entries(d.items).every(([id, n]) => WS.sys.Inventory.count(id) >= n);
  }

  // 이 물건 중 남의 것(맡아 둔 것)이 몇 개인가 — 창고에 실제로 남은 만큼만 센다 (UI 표시용)
  function deposited(itemId) {
    const id = I().canon(itemId);
    const owed = (S().deposits || []).filter(d => d.status === 'held').reduce((s, d) => s + (d.items[id] || 0), 0);
    return Math.min(owed, WS.sys.Inventory.count(id));
  }

  const deposits = () => (S().deposits || []).map(d => ({ ...d, items: { ...d.items } }));
  // 이 주인이 지금 맡긴 물건 (정리 안 된 것) — { items, status } 또는 null (UI 거래 카드의 ask.deposit 용)
  const depositOf = owner => { const d = activeFor(owner); return d ? { items: { ...d.items }, status: d.status } : null; };

  // ───────── 초반 장사 규칙 (CustomerManager 가 쓴다) ─────────
  const early = () => D().early;
  const isPlainDay = () => S().day <= early().plainUntilDay;

  function customersRange() {
    const r = early().customersPerDay[S().day];
    if (r) return r;
    if (early().tutorialDay && dueTutorials().length) return early().tutorialDay;
    return WS.data.config.customersPerDay;
  }

  // 스크립트 손님(customers.js 틀)을 오늘 들여도 되는가 — 안 되면 이유 문자열, 되면 null.
  // 막힌 손님은 버리지 않고 다음 날로 미룬다 (CustomerManager.buildQueue).
  function blockReason(tpl) {
    const E = early();
    const day = S().day;
    const kind = tpl.kind || 'buy';
    if (day <= E.plainUntilDay && kind !== 'buy') return 'plain_days';
    if ((kind === 'trade' || kind === 'sell') && day < E.tradeFromDay) return 'trade_day';
    const disguised = (tpl.trueFaction && tpl.trueFaction !== tpl.faction) || !!tpl.docCheck;
    if (disguised && !opensToday('docs')) return 'docs_locked';
    if (tpl.request) {
      if (tpl.request.category && day < E.categoryFromDay && !(tpl.spawn && tpl.spawn.day === day)) return 'category_day'; // 그날로 정해 둔 고정 손님은 예외
      if (tpl.request.item && !(kind === 'sell' ? canReceive(tpl.request.item) : canGive(tpl.request.item))) return 'shelf_locked';
    }
    if (tpl.trade) {
      const want = [].concat(tpl.trade.want || []), give = [].concat(tpl.trade.give || []);
      if (!want.every(x => canTradeAway(x.item)) || !give.every(x => canReceive(x.item))) return 'shelf_locked';
    }
    // 이야기 손님의 거래 카드(ask.items): 주는 물건은 받을 자리가, 달라는 물건은 내줄 자리가 있어야 한다
    if (tpl.ask && tpl.ask.items) {
      const ok = tpl.ask.give ? canReceive : canGive;
      if (!Object.keys(tpl.ask.items).every(ok)) return 'shelf_locked';
    }
    return null;
  }

  // ───────── 예전 저장본 ─────────
  // 이미 지난 날의 새벽 사건은 다시 일으키지 않고, 예전 팝업 튜토리얼은 본 것으로 친다.
  // progress 칸이 아예 없는 저장본은 해금 제도가 생기기 전 것 — 그때는 창고가 처음부터 다 열려 있었다.
  // 그래서 잠긴 궤짝(special) 말고는 모두 연 것으로 친다 (0 = 처음부터). special 은 그 물건을 가졌을 때만.
  // (progress 가 있는 저장본은 GameManager 가 그대로 둔다 — 이미 열린 자리는 열린 채로)
  function migrateState(s) {
    const p = initState();
    for (const e of D().schedule) {
      if (e.day > s.day) continue;
      p.beats[e.id] = e.day;
    }
    for (const pl of D().places) if (pl !== 'special') p.unlocked[pl] = 0;
    if (Object.keys(s.inventory || {}).some(id => I().shelf(id) === 'special')) p.unlocked.special = s.day;
    markOldTutorials(p);
    return p;
  }
  // 예전 팝업 튜토리얼은 모두 본 것으로 (저장본에 progress 가 이미 있어도)
  function markOldTutorials(p) {
    p.tutorialsSeen = p.tutorialsSeen || {};
    for (const id of D().oldTutorialIds || []) p.tutorialsSeen[id] = true;
    return p;
  }

  // 옛 이름(aliasOf)으로 저장된 재고·원가·대기열·주문·약속을 대표 종류로 합친다
  function canonSave(s) {
    const C = I().canon;
    const merge = obj => {
      if (!obj) return obj;
      for (const id of Object.keys(obj)) {
        const c = C(id);
        if (c === id) continue;
        obj[c] = (obj[c] || 0) + obj[id];
        delete obj[id];
      }
      return obj;
    };
    merge(s.inventory);
    merge(s.cart);
    if (s.stash) merge(s.stash.items);
    (s.deposits || []).forEach(d => merge(d.items));
    // 없앤 물건(순간이동석·마법 나침반·투명 망토·소환 두루마리)이 옛 저장본에 남아 있으면 조용히 치운다 — 그 종류는 더는 데이터에 없다
    [s.inventory, s.cart, s.costBasis, s.stash && s.stash.items].forEach(obj => {
      if (obj) for (const id of Object.keys(obj)) if (!WS.data.items[id]) delete obj[id];
    });
    if (s.costBasis) {
      for (const id of Object.keys(s.costBasis)) {
        const c = C(id);
        if (c === id) continue;
        const a = s.costBasis[id], b = s.costBasis[c];
        const q = (a.qty || 0) + ((b && b.qty) || 0);
        s.costBasis[c] = q > 0 ? { avg: ((a.avg * (a.qty || 0)) + (b ? b.avg * (b.qty || 0) : 0)) / q, qty: q } : (b || a);
        delete s.costBasis[id];
      }
    }
    const fixReq = c => {
      if (!c) return;
      if (c.request && c.request.item) c.request.item = C(c.request.item);
      if (c.trade) ['give', 'want'].forEach(k => (c.trade[k] || []).forEach(x => (x.item = C(x.item))));
    };
    (s.queue || []).forEach(fixReq);
    if (s.trend && s.trend.item) s.trend.item = C(s.trend.item);
    const l = s.letters;
    if (l) {
      (l.orders || []).forEach(o => (o.item = C(o.item)));
      (l.promises || []).forEach(pr => fixReq(pr.snap));
      (l.inbox || []).forEach(x => x.ref && x.ref.item && (x.ref.item = C(x.ref.item)));
    }
    return s;
  }

  return {
    initState, isUnlocked, unlockedPlaces, unlock, canGive, canReceive, canStock, canTradeAway, tradeCap, noteOwned, opensToday,
    dueTutorials, tutorialItem, arrive, justUnlocked,
    pendingTutorials, markTutorialSeen, markOldTutorials, dawn,
    deposit, withdraw, depositCheck, deposited, deposits, depositOf,
    isPlainDay, customersRange, blockReason, early,
    migrateState, canonSave,
  };
})();

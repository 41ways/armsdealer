// 조건 DSL 평가기. 이벤트, 손님 등장, 선택지, 뉴스, 엔딩이 모두 이걸 쓴다.
// 한 객체 안의 여러 키는 AND 로 묶인다.
WS.sys.Conditions = (() => {
  const S = () => WS.Game.state;

  function compare(v, spec) {
    if (typeof spec === 'number') return v === spec;
    if (spec.gte !== undefined && !(v >= spec.gte)) return false;
    if (spec.gt !== undefined && !(v > spec.gt)) return false;
    if (spec.lte !== undefined && !(v <= spec.lte)) return false;
    if (spec.lt !== undefined && !(v < spec.lt)) return false;
    if (spec.eq !== undefined && !(v === spec.eq)) return false;
    return true;
  }

  // 이야기 날짜 (config.dayWarp) — 캠페인을 줄일 때 "N일 이후" 조건을 앞당겨 순서를 지킨다. dayWarp 가 없으면(기본) 실제 날짜 그대로.
  //   dayWarp: [[실제일, 이야기일], ...] 오름차순 마디 — 마디 사이는 직선으로 이어 반올림, 첫 마디 앞은 그대로(1:1), 마지막 마디 뒤는 기울기 1
  function eday(d) {
    const day = d === undefined ? S().day : d;
    const w = WS.data.config.dayWarp;
    if (!w || !w.length || day <= w[0][0]) return day;
    for (let i = 1; i < w.length; i++) {
      if (day <= w[i][0]) { const a = w[i - 1], b = w[i]; return Math.round(a[1] + (day - a[0]) * (b[1] - a[1]) / (b[0] - a[0])); }
    }
    const l = w[w.length - 1];
    return l[1] + (day - l[0]);
  }

  const val = x => (typeof x === 'number' ? x : WS.sys.World.get(x));

  // 장부 공통 필터 (소속 · 기간). 기본은 "실제 소속" 기준 — 세계가 실제로 받은 영향을 따진다.
  //   fromDay: 9                                  그날부터의 기록만
  //   after: { tpl: 'x', action: 'sign' }         그 손님과 그렇게 거래한 기록(마지막 것) 뒤의 기록만. 그런 기록이 없으면 아무것도 없다
  const ledgerFor = (spec, action) => {
    const st = S();
    let from = 0;
    if (spec.after) {
      const i = st.ledger.map(e => e.tpl === spec.after.tpl && (!spec.after.action || e.action === spec.after.action)).lastIndexOf(true);
      if (i < 0) return [];
      from = i + 1;
    }
    return st.ledger.slice(from)
      .filter(e => (typeof action === 'function' ? action(e) : e.action === action))
      .filter(e => !spec.faction || (spec.claimed ? e.faction : e.trueFaction) === spec.faction)
      .filter(e => spec.fromDay === undefined || e.day >= spec.fromDay)
      .filter(e => spec.withinDays === undefined || st.day - e.day <= spec.withinDays);
  };
  // 옛 이름(aliasOf)으로 적힌 조건도 대표 종류로 센다 (장부에는 대표 종류로만 남는다)
  const C = id => WS.sys.Items.canon(id);
  const itemMatch = (spec, id) => (!spec.item || C(id) === C(spec.item)) && (!spec.tag || WS.sys.Items.hasTag(id, spec.tag));

  // 판매 기록 합산. trades: true 면 교환으로 넘겨준 물건도 판매로 친다.
  function soldQty(spec) {
    const sold = ledgerFor(spec, 'sell').filter(e => itemMatch(spec, e.item)).reduce((s, e) => s + e.qty, 0);
    if (!spec.trades) return sold;
    return sold + ledgerFor(spec, 'trade').reduce((s, e) =>
      s + Object.entries(e.gave || {}).filter(([id]) => itemMatch(spec, id)).reduce((a, [, q]) => a + q, 0), 0);
  }

  // 교환 기록. gave(내가 준 물건) / got(받은 물건)을 지정하면 그 수량, 아니면 교환 건수
  function tradedQty(spec) {
    const gave = spec.gave && C(spec.gave), got = spec.got && C(spec.got);
    return ledgerFor(spec, 'trade').reduce((s, e) => {
      if (!gave && !got) return s + 1;
      if (gave && !(e.gave || {})[gave]) return s;
      if (got && !(e.got || {})[got]) return s;
      return s + (got ? e.got[got] : e.gave[gave]);
    }, 0);
  }

  // 손님에게서 사들인 기록 (장물 매입 등)
  function boughtQty(spec) {
    return ledgerFor(spec, 'buy').filter(e => itemMatch(spec, e.item)).reduce((s, e) => s + e.qty, 0);
  }

  // 어떤 거래든 (팔기 · 사들이기 · 교환, 그리고 물건이나 돈이 오간 대화 선택지 — 효과에 give/take/gold 가 있거나 deal: true)
  // 거절 · "내일 구해 두겠소" 약속 · 빈말은 거래가 아니다. { dealt: { faction: 'goblin', after: {...} } }
  const isDeal = e => {
    if (['sell', 'buy', 'trade'].includes(e.action)) return true;
    const t = WS.sys.Customers && WS.sys.Customers.tplById(e.tpl);
    const ch = t && (t.choices || []).concat(t.extraChoices || []).find(x => x.id === e.action);
    const f = (ch && ch.effects) || {};
    return !!ch && (!!ch.deal || !!f.give || !!f.take || !!f.gold || !!f.goldPct || !!f.goldVar);
  };
  const dealtCount = spec => ledgerFor(spec, isDeal).length;

  const handlers = {
    all: list => list.every(check),
    any: list => list.some(check),
    not: c => !check(c),
    var: (name, c) => compare(WS.sys.World.get(name), c),
    flag: f => !!S().flags[f],
    noFlag: f => !S().flags[f],
    day: spec => compare(eday(), spec),
    dayMod: ([mod, rem]) => S().day % mod === rem,
    gold: spec => compare(S().gold, spec),
    sold: spec => soldQty(spec) >= (spec.min || 1),
    // { soldShare: { a: {faction, tag, min}, b: {faction, tag, min}, share: 0.4 } } 두 쪽 모두 min 이상이고, 둘 중 적은 쪽이 합계의 share 이상 (양쪽에 "고르게" 판 상인 — 박쥐)
    soldShare: spec => {
      const qa = soldQty(spec.a), qb = soldQty(spec.b), tot = qa + qb;
      return qa >= (spec.a.min || 1) && qb >= (spec.b.min || 1) && tot > 0 && Math.min(qa, qb) / tot >= (spec.share === undefined ? 0.4 : spec.share);
    },
    traded: spec => tradedQty(spec) >= (spec.min || 1),
    bought: spec => boughtQty(spec) >= (spec.min || 1),
    dealt: spec => dealtCount(spec) >= (spec.min || 1),
    has: spec => WS.sys.Inventory.count(spec.item) >= (spec.min || 1),
    cmp: ([a, op, b]) => {
      const x = val(a), y = val(b);
      return { '>': x > y, '>=': x >= y, '<': x < y, '<=': x <= y, '==': x === y }[op];
    },
    choice: ([cid, value]) => S().choices[cid] === value,
    eventFired: id => S().eventLog[id] !== undefined,
    customerSeen: id => S().seenCustomers[id] !== undefined,
    trend: item => !!S().trend && C(S().trend.item) === C(item),
    chance: p => Math.random() < p,
    // { deposit: { owner: 'obel' } } 맡은 물건이 아직 맡겨진 상태 / intact: true 면 맡은 수량이 전부 창고에 있다
    deposit: spec => !!WS.sys.Progress && WS.sys.Progress.depositCheck(spec),
    // { unlocked: 'gem' } 창고 자리 해금 여부
    unlocked: place => !!WS.sys.Progress && WS.sys.Progress.isUnlocked(place),
    // { topRel: { gte: 6 } } 주된 세력 가운데 가장 우호적인 곳과의 관계 (천칭단 — World.balance)
    topRel: spec => compare(WS.sys.World.balance().top.x, spec),
    // { balanceGap: { gt: 12 } } 주된 세력 관계의 (최고 − 최저)
    balanceGap: spec => compare(WS.sys.World.balance().gap, spec),
    // { since: { flag: 'x', days: 4 } } 그 플래그가 없거나, 켜진 지 days 일 이상 지났다 (거절한 손님이 다시 오기까지 등)
    since: spec => S().flags[spec.flag] === undefined || S().day - S().flags[spec.flag] >= spec.days,
    // ── 맥락 한마디(remarks.js)용 ──
    // { time: { lt: 12 * 60 } } 지금 시각(분). 문 연 9시 = 540, 닫는 18시 = 1080
    time: spec => compare(S().time, spec),
    // { stock: { gte: 0.85 } } 창고 채움 비율 (쓴 부피 ÷ 용량)
    stock: spec => compare(WS.sys.Inventory.usedSlots() / Math.max(1, WS.sys.Inventory.capacity()), spec),
    // { crow: { gte: 1 } } 까마귀로 보낸 편지 수
    crow: spec => compare(((S().letters || {}).outbox || []).length, spec),
    // { storage: { gte: 2 } } 창고 확장 단계 (0~3) — 가게 데코(decor.js)가 쓴다
    storage: spec => compare(WS.sys.Inventory.level(), spec),
    // { upgrade: 'sign' } 가게 물품을 샀다 (reputationMap · calendar · sign · guard — js/data/shop.js)
    upgrade: k => !!WS.sys.Shop && WS.sys.Shop.owned(k),
    // { todayDone: { gte: 3 } } 오늘 응대를 마친 손님 수
    todayDone: spec => compare((S().queue || []).filter(c => c.status === 'done').length, spec),
  };

  function check(c) {
    if (!c) return true;
    if (Array.isArray(c)) return c.every(check);
    for (const key of Object.keys(c)) {
      if (key === 'var') {
        // { var: 'x', gte: 3 } 형태 — 나머지 비교 키를 모아서 전달
        const { var: name, gte, gt, lte, lt, eq } = c;
        if (!handlers.var(name, { gte, gt, lte, lt, eq })) return false;
        continue;
      }
      if (['gte', 'gt', 'lte', 'lt', 'eq'].includes(key)) continue;
      const h = handlers[key];
      if (!h) {
        console.warn('알 수 없는 조건 키:', key, c);
        return false;
      }
      if (!h(c[key])) return false;
    }
    return true;
  }

  return { check, soldQty, tradedQty, boughtQty, eday };
})();

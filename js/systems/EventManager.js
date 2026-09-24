// 효과 DSL 적용기 + 세계 이벤트 평가.
//
// 효과 DSL
//   vars:     { kingdom_power: +2 }            세계 변수 증감
//   set:      { war_progress: 0 }              세계 변수 대입
//   flags:    ['a'] / unflags: ['b']           플래그
//   gold:     -50                              돈
//   goldPct:  -0.3                             가진 돈의 비율만큼 (용의 조공 등)
//   goldVar:  { dwarf_ore_price: 20 }          세계 변수 × 배율만큼 돈 (계약서에 못 박은 값 — 드워프 광석 납품 등). 받은 돈은 오늘 수입으로 친다
//   setPrice: { dwarf_ore_price: 'iron_ore' }  세계 변수에 그 물건의 지금 시세를 적어 둔다 (계약가 고정)
//   give/take:{ iron_sword: 2 }                재고 (칸 제한 무시)
//   spawn:    [{ customer: 'id', inDays: 1 }]  손님 예약 (0 = 오늘, 새벽에만 의미 있음)
//   schedule: [{ event: 'id', inDays: [2,3] }] 이벤트 예약
//   steal:    100                              금고에서 그만큼 사라진다 (0 밑으로는 안 감 — 실제로 가져간 액수는 {stolen})
//             { pct: 0.4, max: 300 }           가진 돈의 4할, 많아야 300
//   news:     [{ cat, text }]                  다음 날 신문에 실릴 기사. text 의 {top} 등은 싣는 순간의 선두 세력으로 (World.textCtx)
//   trend:    'random' | itemId                고블린 유행 변경
//   newsFrom: 'travelerTales'                  WS.data.newsPools[이름] 에서 조건 맞는 기사 하나를 골라 싣는다
//   unlock:   ['gem']                          창고 자리 해금 (WS.sys.Progress — 튜토리얼이 뜬다)
//   deposit:  { owner, items: {id: n}, inDays } 남의 물건을 맡는다 (재고에 들어가지만 내 것이 아니다)
//   withdraw: 'owner'                          맡은 물건을 (남은 만큼) 창고에서 꺼내 돌려준다
//   notify:   { item, qty, mult?, price? }      "들어오면 알려 주오" — 손님이 그 물건을 기다린다 (Letters.addWish).
//                                              손님 선택지에서만 뜻이 있다 (apply 의 둘째 인자 = 카운터의 손님)
//   stash:    'batch'                          도적단 장물아비가 장물 한 짐을 장물함에 넣는다 (WS.sys.Stash — config.smuggling.batch)
//   crowd:    { n: [2,3], days?: 1, fac?: ['village'] }  그 며칠 동안 하루 손님 수 보정 (음수면 줄어든다), fac 쪽 손님이 더 온다 (WS.sys.Calendar — js/systems/Shop.js)
//   market:   { mult, days, match: { items?, category?, newCategory? } }  그 며칠 동안 그 물건 시세 × mult (달력 이벤트)
//   disaster: true                            화재 · 홍수 — 창고 재고 일부가 상한다 (Calendar.strike). 보험 편지가 함께 온다
//   if:       { when, then, else? } (또는 그 배열)  나머지 효과를 적용한 뒤 조건(조건 DSL)을 따져 then(아니면 else) 효과를 더한다
WS.sys.Effects = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;

  // 기사 글의 자리표({top} 등)를 지금 세계 기준으로 채운다
  const fillNews = n => {
    if (!n || typeof n !== 'object') return n;
    return typeof n.text === 'string' && /\{(top\w*|rival\w*|stolen)\}/.test(n.text) ?{ ...n, text: U.fill(n.text, WS.sys.World.textCtx()) } : { ...n };
  };

  function apply(eff, who) {
    if (!eff) return;
    const st = S();
    // 해금이 먼저 — 같은 효과로 들어오는 물건이 바로 제자리를 찾도록
    if (eff.unlock && WS.sys.Progress) [].concat(eff.unlock).forEach(p => WS.sys.Progress.unlock(p));
    if (eff.vars) for (const [k, v] of Object.entries(eff.vars)) WS.sys.World.add(k, v);
    if (eff.set) for (const [k, v] of Object.entries(eff.set)) WS.sys.World.set(k, v);
    if (eff.flags) eff.flags.forEach(f => (st.flags[f] = st.day));
    if (eff.unflags) eff.unflags.forEach(f => delete st.flags[f]);
    if (eff.gold) st.gold += eff.gold;
    if (eff.goldPct && st.gold > 0) st.gold += Math.round(st.gold * eff.goldPct);
    if (eff.setPrice) for (const [k, id] of Object.entries(eff.setPrice)) WS.sys.World.set(k, WS.sys.Market.priceBase(id)); // 소문이 흔든 값은 계약가에 굳히지 않는다
    if (eff.goldVar) for (const [k, m] of Object.entries(eff.goldVar)) {
      const g = Math.round(WS.sys.World.get(k) * m);
      st.gold += g;
      if (st.today && g > 0) st.today.income += g;
    }
    if (eff.steal) {
      // { pct, max }: 가진 돈의 그만큼 (많아야 max) — 금고를 다 비워 파산으로 끝나지 않게
      const want = typeof eff.steal === 'object' ? Math.min(eff.steal.max ?? Infinity, Math.round(Math.max(0, st.gold) * eff.steal.pct)) : eff.steal;
      st.lastStolen = Math.max(0, Math.min(want, st.gold));
      st.gold -= st.lastStolen;
    }
    if (eff.give) for (const [id, n] of Object.entries(eff.give)) WS.sys.Inventory.add(id, n, true);
    if (eff.take) for (const [id, n] of Object.entries(eff.take)) WS.sys.Inventory.remove(id, Math.min(n, WS.sys.Inventory.count(id)));
    if (eff.spawn) eff.spawn.forEach(sp => st.spawnQueue.push({ customer: sp.customer, day: st.day + (sp.inDays ?? 1) }));
    if (eff.schedule) eff.schedule.forEach(sc => st.scheduled.push({ event: sc.event, day: st.day + Math.max(1, U.range(sc.inDays ?? 1)) }));
    if (eff.news) [].concat(eff.news).forEach(n => st.pendingNews.push(fillNews(n)));
    if (eff.trend) WS.sys.Market.setTrend(eff.trend);
    if (eff.newsFrom) pickNews(eff.newsFrom);
    if (eff.deposit && WS.sys.Progress) WS.sys.Progress.deposit(eff.deposit);
    if (eff.withdraw && WS.sys.Progress) WS.sys.Progress.withdraw(eff.withdraw);
    if (eff.notify && WS.sys.Letters && WS.sys.Letters.addWish) WS.sys.Letters.addWish(eff.notify, who);
    // 인상서를 서류함에 꽂는다 (letters.js wanted 의 id)
    if (eff.posters && WS.sys.Letters && WS.sys.Letters.handPosters) WS.sys.Letters.handPosters(eff.posters);
    if (eff.stash === 'batch' && WS.sys.Stash) WS.sys.Stash.receiveBatch();
    // 지금 이 자리에 곧바로 다음 손님으로 들어선다 (예: 밤중에 문을 열었더니 ??? 가 서 있었다)
    if (eff.spawnNow && st.queue) {
      const t = WS.sys.Customers.tplById(eff.spawnNow);
      if (t) {
        const c = WS.sys.Customers.fromTemplate(t);
        c.arrival = st.time;
        const i = st.queue.findIndex(q => q.status === 'waiting');
        st.queue.splice(i < 0 ? st.queue.length : i, 0, c);
      }
    }
    if (eff.crowd && WS.sys.Calendar) WS.sys.Calendar.crowdAdd(eff.crowd);
    if (eff.market && WS.sys.Calendar) WS.sys.Calendar.marketAdd(eff.market);
    if (eff.disaster && WS.sys.Calendar) WS.sys.Calendar.strike();
    if (eff.if) [].concat(eff.if).forEach(b => apply(WS.sys.Conditions.check(b.when) ? b.then : b.else, who));
  }

  // 소문 풀에서 하나 (여행자가 들려주는 먼 곳 이야기 등). 같은 날 같은 기사는 두 번 싣지 않는다
  function pickNews(poolId) {
    const st = S();
    const pool = ((WS.data.newsPools || {})[poolId] || []).filter(n => WS.sys.Conditions.check(n.when) && !st.pendingNews.some(p => p.text === n.text));
    const n = U.weightedPick(pool, x => x.weight || 1);
    if (n) st.pendingNews.push({ cat: n.cat, text: n.text });
  }

  return { apply, fillNews };
})();

WS.sys.Events = (() => {
  const S = () => WS.Game.state;
  const C = () => WS.sys.Conditions;

  function fire(ev, fired) {
    const st = S();
    st.eventLog[ev.id] = st.day;
    const fill = WS.sys.Effects.fillNews;
    WS.sys.Effects.apply(ev.effects);
    if (ev.news) fired.push(...[].concat(ev.news).map(fill));
    if (ev.outcomes) {
      const oc = ev.outcomes.find(o => C().check(o.when));
      if (oc) {
        WS.sys.Effects.apply(oc.effects);
        if (oc.news) fired.push(...[].concat(oc.news).map(fill));
      }
    }
  }

  // 새벽: 예약 이벤트 + 조건 이벤트를 평가하고 발생한 뉴스를 반환
  function runDawn() {
    const st = S();
    const cfg = WS.data.config;
    const fired = [];
    const due = new Set(st.scheduled.filter(s => s.day <= st.day).map(s => s.event));
    st.scheduled = st.scheduled.filter(s => s.day > st.day);

    const sorted = [...WS.data.events].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    let count = 0;
    for (const ev of sorted) {
      // 달력 이벤트(events.js cal_*) — 달력을 샀든 안 샀든 그날엔 일어난다. 하룻밤 사건 수 제한을 먹지도 않는다
      if (ev.calendar) {
        if (!WS.sys.Calendar || !WS.sys.Calendar.starts(ev.calendar) || st.eventLog[ev.id] === st.day || !C().check(ev.when)) continue;
        fire(ev, fired);
        continue;
      }
      if (count >= cfg.maxEventsPerNight && !due.has(ev.id)) continue;
      if (ev.trigger === 'scheduled') {
        if (!due.has(ev.id)) continue;
      } else {
        const last = st.eventLog[ev.id];
        if (ev.once && last !== undefined) continue;
        if (ev.cooldown && last !== undefined && st.day - last <= ev.cooldown) continue;
        if (last === st.day) continue;
        if (ev.chance !== undefined && Math.random() >= ev.chance) continue;
      }
      if (!C().check(ev.when)) continue;
      fire(ev, fired);
      count++;
    }
    return fired;
  }

  return { runDawn };
})();

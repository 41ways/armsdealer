// 가게 물품(금화로 사는 것) · 달력 이벤트 · 밤 경비. 데이터: js/data/shop.js, 이벤트: js/data/events.js 의 cal_* 이벤트.
//   state.upgrades = { reputationMap, calendar, sign, guard }   (구 저장본은 없음 = 전부 false — up() 가 채운다)
//   state.calRoll  = { plague: 일, disaster: 일 }               판 시작 때 한 번 굴린 재난 날짜 (0 = 이번 판엔 없음). 달력이 없어도 그날엔 일어난다
//   state.crowd    = [{ from, until, n, fac }]                  그날들의 손님 수 보정 (CustomerManager.buildQueue) — n<0 이면 줄어든다
//   state.marketMods = [{ until, mult, match }]                 며칠 동안의 시세 보정 (Market.mult → Calendar.priceMult)
//   state.disaster = { day, kind, name, lost: {id: n}, value, fee, insured, closed }   화재 · 홍수 손실 기록 (보험 편지 · 장부)
// 화면은 바꾸지 않는다 — UIManager 가 이 값을 읽어 그린다.
WS.sys.Shop = (() => {
  const S = () => WS.Game.state;
  const D = () => WS.data.shop;
  const KEYS = ['reputationMap', 'calendar', 'sign', 'guard'];

  function up() {
    const st = S();
    const u = st.upgrades || (st.upgrades = {});
    KEYS.forEach(k => { if (u[k] === undefined) u[k] = false; });
    return u;
  }
  const owned = id => !!up()[id];

  // 진열: [{ id, name, icon, cost, desc, tag, owned, ok, why }]
  function goods() {
    const st = S();
    return D().goods.map(g => {
      const have = owned(g.id);
      const short = st.gold < g.cost;
      return { ...g, owned: have, ok: !have && !short, why: have ? '' : short ? `금화가 ${g.cost}G는 있어야 한다 (지금 ${st.gold}G)` : '' };
    });
  }

  function buy(id) {
    const st = S();
    const g = goods().find(x => x.id === id);
    if (!g) return { ok: false, msg: '그런 물품은 없다.' };
    if (g.owned) return { ok: false, msg: '이미 샀다.' };
    if (!g.ok) return { ok: false, msg: g.why };
    st.gold -= g.cost;
    if (st.today) st.today.spend += g.cost;
    up()[id] = true;
    if (id === 'sign' && g.rep) WS.sys.World.add('reputation', g.rep);
    return { ok: true, msg: `${g.name}을(를) 들였다. −${g.cost}G`, good: g };
  }

  // ───────── 밤 경비 ─────────
  const G = () => D().guard;
  const guarded = () => !!up().guard;
  function hire() {
    const st = S();
    if (guarded()) return { ok: false, msg: '이미 경비를 세워 두었소.' };
    // 마감 뒤에 세우면 오늘 밤 일당을 지금 치른다 (한 밤 공짜 경비는 없다)
    const now = st.phase === 'closing' || st.phase === 'night';
    if (st.gold < G().wage) return { ok: false, msg: `일당 ${G().wage}G가 없소.` };
    if (now) { st.gold -= G().wage; if (st.today) st.today.guard = (st.today.guard || 0) + G().wage; }
    up().guard = true;
    return { ok: true, msg: `경비를 세웠다. 일당 ${G().wage}G — 매일 밤 정산에서 나간다.` };
  }
  function fire() {
    if (!guarded()) return { ok: false, msg: '세워 둔 경비가 없소.' };
    up().guard = false;
    return { ok: true, msg: '경비를 내보냈다.' };
  }
  // 마감 정산 (DayManager.closeShop — 임대료 다음). 금고가 모자라면 그날 해고
  function settleWage() {
    const st = S();
    if (!guarded()) return 0;
    const w = G().wage;
    if (st.gold >= w) {
      st.gold -= w;
      if (st.today) st.today.guard = (st.today.guard || 0) + w;
      return w;
    }
    up().guard = false;
    st.pendingNews.push({ cat: '장부', text: G().fireNews });
    return 0;
  }
  // 문틈으로 살핀 정체 — 문 두드림 틀의 knock.id 별
  const guardLine = knockId => (G().lines[knockId] || G().lines.default);
  const guardLabel = () => G().who;

  return { up, owned, goods, buy, guarded, hire, fire, settleWage, guardLine, guardLabel };
})();

// ───────── 달력 ─────────
WS.sys.Calendar = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;
  const C = () => WS.data.shop.calendar;
  const sched = id => C().schedule.find(x => x.id === id);

  // 재난 날짜 — 처음 필요할 때 한 번 굴린다 (오래된 저장본은 남은 날 안에서)
  function roll() {
    const st = S();
    const r = st.calRoll || (st.calRoll = {});
    for (const x of C().random) {
      if (r[x.id] !== undefined) continue;
      const lo = Math.max(x.range[0], st.day + 1);
      r[x.id] = lo <= x.range[1] && Math.random() < x.chance ? U.randInt(lo, x.range[1]) : 0;
    }
    return r;
  }
  const startDays = id => {
    const s = sched(id);
    if (s) return s.days;
    const d = roll()[id];
    return d ? [d] : [];
  };
  // 그날 시작하는가 / 지금 이어지는 중인가
  const starts = (id, day) => startDays(id).includes(day ?? S().day);
  const active = (id, day) => {
    const d = day ?? S().day, s = sched(id);
    return startDays(id).some(a => d >= a && d < a + ((s && s.span) || 1));
  };
  // 장날엔 소문이 시세를 흔들지 않는다
  const calm = () => active('fair');

  // ── 오늘의 손님 수 · 시세 보정 (Effects 의 crowd · market) ──
  function crowdAdd(spec) {
    const st = S();
    st.crowd = st.crowd || [];
    const n = U.range(spec.n);
    st.crowd.push({ from: st.day, until: st.day + (spec.days || 1) - 1, n, fac: spec.fac || [] });
  }
  function marketAdd(spec) {
    const st = S();
    st.marketMods = st.marketMods || [];
    st.marketMods.push({ until: st.day + (spec.days || 1) - 1, mult: spec.mult, match: spec.match || {} });
  }
  const crowdNow = () => (S().crowd || []).filter(c => S().day >= c.from && S().day <= c.until);
  const crowdBonus = () => crowdNow().reduce((s, c) => s + c.n, 0);
  const crowdFac = () => crowdNow().flatMap(c => c.n > 0 ? c.fac : []);
  function priceMult(id) {
    const mods = (S().marketMods || []).filter(m => S().day <= m.until);
    if (!mods.length) return 1;
    const it = WS.sys.Items.get(id), cid = WS.sys.Items.canon(id);
    let m = 1;
    for (const x of mods) {
      const k = x.match;
      if ((k.items && k.items.includes(cid)) || (k.category && k.category.includes(it.category)) || (k.newCategory && k.newCategory.includes(it.newCategory))) m *= x.mult;
    }
    return m;
  }
  // 하루 한 번 (DayManager.startDay): 지난 보정을 치운다
  function prune() {
    const st = S();
    if (st.crowd) st.crowd = st.crowd.filter(c => c.until >= st.day);
    if (st.marketMods) st.marketMods = st.marketMods.filter(m => m.until >= st.day);
  }

  // ── 재난 (화재 · 홍수): 창고 재고 일부가 상한다. 손실 기록은 장부 · 보험 편지가 쓴다 ──
  function strike() {
    const st = S(), c = C().disaster;
    const kind = U.pick(c.kinds);
    const pct = c.pct[0] + Math.random() * (c.pct[1] - c.pct[0]);
    const lost = {};
    let value = 0;
    for (const [id, n] of Object.entries(st.inventory)) {
      if (!(n > 0)) continue;
      const q = Math.min(n, Math.floor(n * pct + Math.random()));
      if (q <= 0) continue;
      WS.sys.Inventory.remove(id, q);
      lost[id] = q;
      value += q * WS.sys.Market.price(id);
    }
    const parts = Object.entries(lost).map(([id, q]) => `${WS.sys.Items.get(id).name} ${q}개`);
    st.disaster = { day: st.day, kind: kind.id, name: kind.name, lost, value, fee: c.fee, insured: false, closed: false };
    st.pendingNews.push({ cat: '사건', big: true, text: parts.length
      ? `간밤 ${kind.name}! 창고 재고 일부가 상했다 — ${parts.join(', ')} (시가 약 ${value}G)`
      : `간밤 ${kind.name}! 다행히 창고가 비어 있어 잃은 물건은 없다` });
    if (parts.length && WS.sys.Letters && WS.sys.Letters.insuranceOffer) WS.sys.Letters.insuranceOffer(st.disaster);
    return st.disaster;
  }
  // 보험 — 삯을 내면 손실의 절반을 되찾는다 (편지의 '보험을 든다')
  function insure() {
    const st = S(), d = st.disaster, c = C().disaster;
    if (!d || d.insured || d.closed) return { ok: false, msg: '이미 끝난 일이오.' };
    if (st.gold < d.fee) return { ok: false, msg: `금화가 모자라오. (${d.fee}G)` };
    st.gold -= d.fee;
    if (st.today) st.today.spend += d.fee;
    const back = [];
    for (const [id, q] of Object.entries(d.lost)) {
      const n = Math.round(q * c.restore);
      if (n > 0) { WS.sys.Inventory.add(id, n, true); back.push(`${WS.sys.Items.get(id).name} ${n}개`); }
    }
    d.insured = true;
    d.closed = true;
    return { ok: true, msg: back.length ? `보험금이 지급되었다 — ${back.join(', ')}를 되찾았다. (−${d.fee}G)` : `삯 ${d.fee}G를 냈지만 되찾을 물건이 없었다.` };
  }
  const forgoInsurance = () => { const d = S().disaster; if (d) d.closed = true; return { ok: true, msg: '그냥 감수하기로 했다.' }; }
  // 며칠 지난 재난은 더는 보험을 들 수 없다
  const insurable = () => { const d = S().disaster; return !!d && !d.insured && !d.closed && S().day - d.day <= 1 && Object.keys(d.lost).length > 0; };

  // ── 달력 화면 (달력을 산 판만) ──
  // [{ day, until, id, name, icon, hint, today }] 오늘부터 lookahead 일 안에 시작하는(또는 이어지는) 확정 행사
  function upcoming() {
    const st = S(), n = C().lookahead;
    const out = [];
    for (const s of C().schedule) for (const d of s.days) {
      const until = d + (s.span || 1) - 1;
      if (until >= st.day && d <= st.day + n - 1) out.push({ day: d, until, id: s.id, name: s.name, icon: s.icon, hint: s.hint, now: d <= st.day });
    }
    return out.sort((a, b) => a.day - b.day);
  }
  // 재난이 곧 닥친다 — 날짜는 없이 분위기만 (달력을 산 판만 본다)
  function omen() {
    const st = S(), r = roll();
    return Object.values(r).some(d => d > st.day && d <= st.day + C().omenDays);
  }
  const tomorrow = () => upcoming().filter(e => e.day === S().day + 1);
  // 장부 '약속 · 계약'에 얹을 줄: [아이콘, 글, 기한]
  function ledgerLines() {
    const st = S(), out = [];
    if (WS.sys.Shop.owned('calendar')) tomorrow().forEach(e => out.push(['📅', `내일은 ${e.name}`, `${e.day}일째`]));
    const d = st.disaster;
    if (d && st.day - d.day <= 2 && Object.keys(d.lost).length) {
      const parts = Object.entries(d.lost).map(([id, q]) => `${WS.sys.Items.get(id).name}×${q}`).join(' ');
      out.push([d.kind === 'fire' ? '🔥' : '🌊', `${d.name} 손실 — ${parts} (약 ${d.value}G)${d.insured ? ' · 보험으로 절반 되찾음' : insurable() ? ` · 보험 ${d.fee}G (까마귀 편지)` : ''}`, `${d.day}일째`]);
    }
    if (WS.sys.Shop.guarded()) out.push(['💂', `경비 고용 중 — 일당 ${WS.data.shop.guard.wage}G`, '밤마다']);
    return out;
  }

  return { roll, starts, active, calm, crowdAdd, marketAdd, crowdBonus, crowdFac, priceMult, prune, strike, insure, forgoInsurance, insurable, upcoming, omen, tomorrow, ledgerLines, startDays };
})();

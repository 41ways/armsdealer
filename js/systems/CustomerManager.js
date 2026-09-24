// 하루 손님 대기열 생성: 고정 손님 → 예약 손님 → 조건부 손님 → 랜덤 손님
WS.sys.Customers = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;
  const tplById = id => WS.data.customers.find(c => c.id === id);
  // 옛 이름(은검·석궁…) → 대표 종류(칼·활…). 손님이 옛 이름을 입에 올리는 일은 없다
  const C = id => WS.sys.Items.canon(id);
  // 날짜별 해금·초반 장사 규칙 (js/data/progress.js)
  const G = () => WS.sys.Progress;

  // extra: 틀의 wants[].pay (특정 물건에 웃돈을 얹는 세력 — 은을 사들이는 흡혈귀 등)
  function offerFor(itemId, qty, factionId, mult, extra) {
    const f = WS.data.factions[factionId];
    let m = mult ?? f.payMult * U.rand(0.9, 1.12);
    const st = S();
    if (f.trendBonus && st.trend && C(st.trend.item) === C(itemId)) m *= f.trendBonus;
    // payScale: 세계 변수에 따라 씀씀이가 달라진다 (몬스터가 많을수록 후해지는 사냥꾼 등)
    for (const [k, sc] of Object.entries(f.payScale || {})) {
      const d = WS.data.worldVars[k];
      m *= U.clamp(1 + (WS.sys.World.get(k) - (d ? d.init : 0)) * sc, 0.5, 2);
    }
    m *= extra || 1;
    return Math.max(1, Math.round(WS.sys.Market.price(itemId) * qty * m));
  }

  // 랜덤 손님 틀 찾기 (거래 효과·외형이 쓴다)
  function archById(id) {
    for (const f of Object.values(WS.data.factions)) {
      const a = (f.archetypes || []).find(x => x.id === id);
      if (a) return a;
    }
    return null;
  }

  // 지불 방식 안내 (외상 등). 요정 금화처럼 숨겨진 것은 알려 주지 않는다
  function payNote(pay) {
    if (!pay || !pay.credit) return null;
    const d = [].concat(pay.credit.inDays);
    return `${Math.round(pay.credit.now * 100)}%만 지금, 나머지는 ${d[0]}${d[1] ? '~' + d[1] : ''}일 뒤 외상`;
  }

  // ───────── 소속 묻기 · 인장 (왼손 옆 확대경 — UIManager) ─────────
  // c.affil = { claim: 대는 소속(세력 id, 없으면 null), seal: 'real'|'fake'|'none', sealOf: 인장의 실제 세력, line: 대답 }
  // 틀의 affil: { claim, seal, sealOf, line } 로 덮어쓴다. 세력의 affil: { claim: null, seal: false, lines } 는
  // 인장이 없는 무리(나그네 등) — 소속을 대지 않고 인장도 없다.
  const facAffil = id => (WS.data.factions[id] && WS.data.factions[id].affil) || {};
  // 세력이 아닌 인장(국왕 직속 — factions.js WS.data.extraSeals)도 소속으로 댈 수 있다
  const sealMeta = id => WS.data.factions[id] || (WS.data.extraSeals || {})[id];
  const hasSeal = id => !!sealMeta(id) && facAffil(id).seal !== false;
  const fname = id => sealMeta(id).name;
  const AFFIL_LINES = {
    real: ['{f} 소속이오. 인장 여기 있소.', '{f}에서 왔소. 인장을 보시오.', '{f} 사람이오. 자, 인장이오.'],
    none: ['{f} 소속이오. 인장은… 두고 왔소.', '{f} 사람이오. 인장은 숙소에 두고 왔소만.', '{f}에서 왔소. 인장은 챙기질 못했소.'],
    hidden: ['말하기 곤란하오. …인장이라면 이게 있소.', '소속은 묻지 마시오. 인장은 보여 드리지.'],
    nobody: ['그냥 떠돌이요. 인장 같은 건 없소.', '소속이랄 게 없소. 인장도 없고.'],
  };
  function makeAffil(c, tpl) {
    const o = (tpl && tpl.affil) || {};
    const disguised = c.trueFaction !== c.faction;
    const fa = facAffil(c.faction);
    let claim = 'claim' in o ? o.claim : 'claim' in fa ? fa.claim : c.faction;
    if (claim && !sealMeta(claim)) claim = null;
    let seal = o.seal, sealOf = o.sealOf;
    const scripted = !c.random && tpl && tpl.spawn && (tpl.spawn.day || tpl.spawn.queuedOnly);
    if (!seal) {
      if (tpl && tpl.docCheck) seal = tpl.docCheck.forged ? 'fake' : 'real';
      else if (!claim || !hasSeal(claim)) seal = 'none';
      else if (disguised) seal = Math.random() < 0.7 ? 'fake' : 'none';
      else if (c.random && Math.random() < 0.05) {
        // 드물게: 소속은 대지 않는데 남의 세력 인장을 내민다 (훔쳤나? — 얼룩은 아니다)
        const others = Object.keys(WS.data.factions).filter(id => id !== c.faction && hasSeal(id));
        if (others.length) { claim = null; seal = 'real'; sealOf = U.pick(others); }
        else seal = 'real';
      } else seal = scripted || Math.random() < 0.7 ? 'real' : 'none';
    }
    sealOf = sealOf || claim || c.trueFaction;
    let line = o.line;
    if (!line) {
      const pool = !claim ? (seal === 'none' ? fa.lines || AFFIL_LINES.nobody : AFFIL_LINES.hidden) : AFFIL_LINES[seal === 'none' ? 'none' : 'real'];
      line = U.pick(pool).replace(/\{f\}/g, claim ? fname(claim) : '');
    }
    return { claim, seal, sealOf, line };
  }
  // 예전 저장본의 손님이나 편지로 되돌아온 손님처럼 affil 이 없으면 지금 만든다
  function affil(c) {
    if (!c) return null;
    if (!c.affil) c.affil = makeAffil(c, tplById(c.tpl) || archById(c.tpl));
    return c.affil;
  }
  // 장부의 얼룩: 가짜 인장을 내민 손님, 또는 틀에 stain: true (위장·수배된 자) — 화면엔 절대 보이지 않는다
  function isStain(c) {
    const t = tplById(c.tpl) || archById(c.tpl) || {};
    return affil(c).seal === 'fake' || !!t.stain;
  }

  function fromTemplate(tpl) {
    const st = S();
    st.seenCustomers[tpl.id] = st.day;
    const kind = tpl.kind || 'buy';
    const c = {
      uid: U.uid('c'), tpl: tpl.id, kind,
      name: tpl.name, race: tpl.race, job: tpl.job, portrait: tpl.portrait, sprite: tpl.sprite,
      faction: tpl.faction, trueFaction: tpl.trueFaction || tpl.faction,
      lines: tpl.lines || {}, status: 'waiting', dialog: [], usedChoices: [],
      // 초반(평범한 손님만 오는 날)에는 외상·요정 금화 같은 지불 방식이 없다
      late: !!tpl.late, payment: G().isPlainDay() ? null : tpl.payment || null,
      docCheck: tpl.docCheck ? { ...tpl.docCheck } : null, docCheckDone: false,
    };
    c.payNote = payNote(c.payment);
    c.affil = makeAffil(c, tpl);
    if (tpl.hint) c.hint = tpl.hint;
    if (tpl.request && tpl.request.category) {
      // 분류형 요청을 고정 손님 틀에 직접 적은 경우 ("무기 3개 — 칼이든 활이든")
      const r = tpl.request;
      c.request = { category: r.category, qty: r.qty, preferSubtype: r.preferSubtype || null, preferPay: r.preferPay ?? 1, otherPay: r.otherPay ?? 1,
        refuseSubtypes: r.refuseSubtypes || [], partialOk: !!r.partialOk || G().isPlainDay(), exact: r.exact || null };
    } else if (tpl.request) {
      const r = tpl.request;
      const id = C(r.item);
      c.request = { item: id, qty: r.qty, partialOk: !!r.partialOk || G().isPlainDay() };
      if (kind === 'sell') c.request.price = r.price;
      else c.request.offer = typeof r.offer === 'number' ? r.offer : offerFor(id, r.qty, c.faction, r.offer && r.offer.mult);
    }
    // 궁핍한 이야기 손님 (틀의 poor): 부르는 값이 시세보다 한참 낮으면 덤·값 면제를 받을 수 있는 손님이 된다
    if (tpl.poor && kind === 'buy' && c.request && c.request.item && !G().isPlainDay()) {
      const full = WS.sys.Market.price(c.request.item) * c.request.qty;
      if (c.request.offer < full * 0.9) c.poor = { full, short: full - c.request.offer, style: tpl.poor.style || 'hao', done: false };
    }
    if (kind === 'trade' && tpl.trade) c.trade = resolveTrade(tpl.trade);
    // 대사·선택지에 {top} 같은 자리표가 있으면 손님이 온 순간의 선두 세력으로 굳혀 둔다 (천칭단 — World.textCtx)
    // (직업·소속 대답·거래 카드 메모도 같이)
    if (/\{(top|rival)\w*\}/.test(JSON.stringify([tpl.greet, tpl.job, tpl.affil, tpl.ask, tpl.choices, tpl.extraChoices]))) {
      const x = (c.fillCtx = WS.sys.World.textCtx());
      c.job = U.fill(c.job, x);
      c.affil.line = U.fill(c.affil.line, x);
      if (tpl.ask) c.ask = { ...tpl.ask, note: tpl.ask.note && U.fill(tpl.ask.note, x) };
    }
    // fillVars: { total: ['dwarf_ore_price', 20], price: { price: 'iron_ore', qty: 1 } } — 손님이 온 순간의 값으로 {total} 등을 굳힌다
    //   [세계 변수, 배율] 또는 { price: 물건, qty } (지금 시세 × 수량). 인사말 · 선택지 · 대답 · 거래 카드(ask.note, ask.gold: '{total}')에 쓴다
    if (tpl.fillVars) {
      const v = {};
      for (const [k, s] of Object.entries(tpl.fillVars)) {
        v[k] = Array.isArray(s) ? Math.round(WS.sys.World.get(s[0]) * (s[1] ?? 1)) : WS.sys.Market.priceBase(s.price) * (s.qty ?? 1);
      }
      const x = (c.fillCtx = { ...(c.fillCtx || {}), ...v });
      if (tpl.ask) {
        const a = { ...(c.ask || tpl.ask) };
        if (a.note) a.note = U.fill(a.note, x);
        if (typeof a.gold === 'string') a.gold = +U.fill(a.gold, x) || 0;
        c.ask = a;
      }
    }
    // greetWhen: [{ when, text }] — 조건이 맞는 첫 인사말이 greet 대신 (예: 전에 만난 적 있는 손님이 알아본다)
    const alt = (tpl.greetWhen || []).find(x => WS.sys.Conditions.check(x.when));
    c.greet = U.fill(alt ? alt.text : tpl.greet, { ...(c.fillCtx || {}), ...greetCtx(c) });
    return c;
  }

  // ───────── 궁핍한 손님 (config.poor) ─────────
  // 랜덤 손님 하나를 궁핍하게: 값을 시세 쪽 offerRange 배로 깎고, 인사·감사 대사를 말투(style)에 맞게 바꾼다.
  // c.poor = { full: 원래 값, short: 모자란 금액, style, done: 덤·면제를 받았는지 } — 저장에 그대로 들어간다
  function poorify(c, style) {
    const P = WS.data.config.poor;
    const full = c.request.offer;
    c.request.offer = Math.max(1, Math.round(full * U.rand(...P.offerRange)));
    c.poor = { full, short: full - c.request.offer, style, done: false };
    c.lines = { ...c.lines, sold: P.sold[style] };
    c.greet = U.fill(U.pick(P.greet[style]), greetCtx(c));
  }

  // 덤을 받은 손님이 며칠 뒤 다시 온다 (TransactionManager.scheduleGrate 가 spawnQueue 에 담아 둔 grate 로 손님을 꾸민다)
  function applyGrateful(c, g) {
    const P = WS.data.config.poor;
    Object.assign(c, { name: g.name, race: g.race, job: g.job, portrait: g.portrait, look: g.look, faction: g.faction, trueFaction: g.faction, grate: g });
    c.affil = makeAffil(c, tplById(c.tpl));
    c.ask = g.kind === 'item' ? { tag: '보답', items: { [g.item]: g.qty }, give: true, note: '덤에 대한 사례' }
      : { tag: g.kind === 'news' ? '소문' : '보답', gold: g.gold, note: g.kind === 'news' ? '신문에 실릴 소문' : '덤에 대한 사례' };
    c.greet = P.grate.greet[g.kind][g.style];
    c.fillCtx = { gAccept: P.grate.accept[g.style], gDecline: P.grate.decline[g.style] };
  }

  // 교환 틀 → 실제 수량 확정. give/want 는 객체 하나 또는 배열, qty 는 숫자 또는 [최소, 최대]
  // 자리가 열린 지 며칠 안 된 물건은 첫 물건으로 채울 수 있을 만큼만 달라고 한다 (Progress.tradeCap)
  function resolveTrade(spec) {
    const side = list => [].concat(list || []).map(x => ({ item: C(x.item), qty: U.range(x.qty) }));
    const want = side(spec.want).map(x => ({ ...x, qty: G().tradeCap(x.item, x.qty) }));
    return { give: side(spec.give), want, gold: U.range(spec.gold || 0) };
  }

  // 카테고리형 want(§신규 포맷)의 "대표 아이템" — 아직 손님이 뭘 받을지 모르는 상태에서
  // 인사말({item}/{offer})에 쓸 대략적인 예시일 뿐, 실제 값은 offerForCategoryItem 이 정한다.
  function categoryExampleItem(r) {
    const entries = Object.entries(WS.data.items)
      .filter(([, it]) => it.newCategory === r.category && (!r.preferSubtype || it.subtype === r.preferSubtype) && !it.special);
    return entries.length ? entries[0][0] : null;
  }

  function greetCtx(c) {
    if (c.trade) {
      const [g, w] = [c.trade.give[0], c.trade.want[0]];
      return { give: WS.sys.Items.get(g.item).name, giveQty: g.qty, want: WS.sys.Items.get(w.item).name, wantQty: w.qty, gold: c.trade.gold };
    }
    if (!c.request) return {};
    if (c.request.category) {
      const cat = WS.data.categories[c.request.category];
      const label = c.request.preferSubtype ? cat.subtypes[c.request.preferSubtype] : cat.name;
      const example = categoryExampleItem(c.request);
      const offer = example
        ? Math.max(1, Math.round(WS.sys.Market.price(example) * c.request.qty * (c.request.preferPay ?? 1)))
        : 0;
      return { item: label, qty: c.request.qty, offer };
    }
    return { item: WS.sys.Items.get(c.request.item).name, qty: c.request.qty, offer: c.request.offer ?? c.request.price };
  }

  // 틀이 오늘 내밀 수 있는 거래 목록 (buy = wants, trade = trades, sell = offers)
  // want 는 구형(concrete item: {item,...})과 신형(category: {category, preferSubtype, ...}) 둘 다 지원한다.
  // 해금 규칙: 손님이 가져갈 물건은 창고 자리가 열려 있어야 하고(canGive), 손님이 내놓는 물건은 받을 자리가
  // 있어야 한다(canReceive — 잠긴 궤짝은 들어오는 순간 열린다). 교환 손님이 가져갈 물건은 어제 이전에 열린
  // 자리의 것만(canTradeAway). 교환·매입 손님은 tradeFromDay 부터, 분류형 요청("무기가 필요하오…")은 categoryFromDay 부터.
  const categoryOpen = cat => Object.keys(WS.data.items).some(id => {
    const it = WS.data.items[id];
    return !it.aliasOf && it.newCategory === cat && G().isUnlocked(it.shelf);
  });
  function optionsFor(a) {
    const ok = x => (x.category ? !!WS.data.categories[x.category] : !!WS.sys.Items.get(x.item));
    const E = G().early();
    const day = S().day;
    if (a.kind === 'trade') {
      if (day < E.tradeFromDay) return [];
      return a.trades.filter(t => [].concat(t.give, t.want).every(ok)
        && [].concat(t.want).every(x => G().canTradeAway(x.item)) && [].concat(t.give).every(x => G().canReceive(x.item))
        && WS.sys.Conditions.check(t.when));
    }
    if (a.kind === 'sell') {
      if (day < E.tradeFromDay) return [];
      return a.offers.filter(o => ok(o) && G().canReceive(o.item) && WS.sys.Conditions.check(o.when));
    }
    return a.wants.filter(w => ok(w) && WS.sys.Conditions.check(w.when) && (w.category
      ? !G().isPlainDay() && day >= E.categoryFromDay && categoryOpen(w.category)
      : G().canGive(w.item)));
  }

  // 오늘 등장할 수 있는 랜덤 손님 틀
  const archetypesFor = f =>
    (f.archetypes || []).filter(a => (!a.minDay || S().day >= a.minDay) && WS.sys.Conditions.check(a.when) && optionsFor(a).length);

  function visitWeight(f) {
    const v = f.visit;
    let w = v.base + WS.sys.World.get(v.var) * v.relScale;
    for (const [k, s] of Object.entries(v.scaleVars || {})) w += WS.sys.World.get(k) * s;
    // bonus: [{ when, add }] — 조건이 맞으면 발길이 는다 (화약 독점 판매상 소문을 듣고 오는 해적·용병 등)
    for (const b of v.bonus || []) if (WS.sys.Conditions.check(b.when)) w += b.add;
    return Math.max(v.min ?? 0.3, w);
  }

  // 랜덤 손님 공통 뼈대
  function baseCustomer(fx, a, kind) {
    const pay = a.payment || fx.f.payment || null;
    const c = {
      uid: U.uid('c'), tpl: a.id, kind, random: true,
      name: U.pick(a.names), race: a.race || fx.f.race, job: a.job, portrait: a.portrait, sprite: a.sprite,
      faction: fx.id, trueFaction: fx.id, lines: a.lines || {}, status: 'waiting', dialog: [], usedChoices: [],
      late: !!a.late, payment: kind === 'buy' ? pay : null, payNote: kind === 'buy' ? payNote(pay) : null,
    };
    c.affil = makeAffil(c, a);
    return c;
  }

  function randomCustomer(prefer) {
    const st = S();
    const factions = Object.entries(WS.data.factions)
      .map(([id, f]) => ({ id, f, archs: archetypesFor(f) }))
      .filter(x => x.archs.length);
    // prefer: 장날 · 열병식 같은 행사 날 더 오는 세력 (state.crowd — WS.sys.Calendar)
    const fx = U.weightedPick(factions, x => visitWeight(x.f) * (prefer && prefer.includes(x.id) ? 5 : 1));
    const a = U.weightedPick(fx.archs, x => x.weight || 1);
    if (a.kind === 'trade') return randomTrader(fx, a);
    if (a.kind === 'sell') return randomSeller(fx, a);
    const wants = optionsFor(a);
    const plain = G().isPlainDay();
    const want = U.weightedPick(wants, w => (w.w || 1) * (!plain && st.trend && w.item && C(st.trend.item) === C(w.item) && fx.f.trendBonus ? 4 : 1));
    const E = G().early();
    // 초반: 수량은 1~3, 값은 시세 근처, 모자라면 있는 만큼도 산다, 외상 없음 (Papers, Please 첫 며칠처럼)
    const qty = plain ? U.clamp(U.range(want.qty), E.plainQty[0], E.plainQty[1]) : U.range(want.qty);
    const c = baseCustomer(fx, a, 'buy');
    if (plain) {
      c.payment = null;
      c.payNote = null;
    }
    if (want.category) {
      // 신형(카테고리) want — 구체적으로 어떤 아이템을 낼지는 플레이어가 고른다(phase 2 창고 UI).
      // 가격은 그 아이템을 냈을 때 WS.sys.Trade.offerForCategoryItem 이 계산한다.
      c.request = {
        category: want.category, preferSubtype: want.preferSubtype || null,
        preferPay: want.preferPay ?? 1.18, otherPay: want.otherPay ?? 0.85,
        refuseSubtypes: want.refuseSubtypes || [], qty, partialOk: a.partialOk !== false,
      };
    } else {
      const id = C(want.item);
      const offer = plain
        // 초반에도 고블린은 눈에 띄게 후하다 — 생각 없이 고블린에게만 팔다 보면 숲의 나라로 간다
        ? Math.max(1, Math.round(WS.sys.Market.price(id) * qty * U.rand(E.plainOffer[0], E.plainOffer[1]) * (fx.id === 'goblin' ? 1.25 : 1)))
        : offerFor(id, qty, fx.id, undefined, want.pay);
      c.request = { item: id, qty, offer, partialOk: plain || a.partialOk !== false };
    }
    c.greet = U.fill(U.pick(a.greet), greetCtx(c));
    // 서민 계열 손님은 가끔 돈이 모자란다 (config.poor — 구형 물건 요청만, 외상 손님·초반은 제외)
    const P = WS.data.config.poor;
    if (P && !plain && !want.category && !c.payment && st.day >= P.minDay && P.archs[a.id] && Math.random() < P.chance) poorify(c, P.archs[a.id]);
    return c;
  }

  // 교환 손님 (kind: 'trade' 틀)
  function randomTrader(fx, a) {
    const deal = U.weightedPick(optionsFor(a), t => t.w || 1);
    const c = baseCustomer(fx, a, 'trade');
    c.trade = resolveTrade(deal);
    c.greet = U.fill(U.pick(a.greet), greetCtx(c));
    return c;
  }

  // 물건을 팔러 온 손님 (kind: 'sell' 틀). offers: [{ item, qty, price: 시세 대비 배율, w, when }]
  function randomSeller(fx, a) {
    const o = U.weightedPick(optionsFor(a), x => x.w || 1);
    const qty = U.range(o.qty);
    const c = baseCustomer(fx, a, 'sell');
    const id = C(o.item);
    c.request = { item: id, qty, price: Math.max(1, Math.round(WS.sys.Market.price(id) * qty * (o.price ?? 0.6) * U.rand(0.9, 1.1))) };
    c.greet = U.fill(U.pick(a.greet), greetCtx(c));
    return c;
  }

  // 튜토리얼 손님 (js/data/progress.js tutorialCustomers) — 새 창고 자리의 물건을 딱 1개, 시세 그대로 산다.
  // 흥정·추가 선택지·외상·위장 없음. 카운터 앞에 서는 순간 그 자리가 열린다 (Progress.arrive)
  function tutorialCustomer(t) {
    const tpl = tplById(t.customer);
    if (!tpl) return null;
    const c = fromTemplate(tpl);
    c.tutorial = { id: t.id, place: t.places[0], places: t.places.slice(), hint: t.hint, unlocked: [] };
    c.payment = null;
    c.payNote = null;
    c.docCheck = null;
    c.late = false;
    const id = G().tutorialItem(t);
    if (id) {
      c.request = { item: id, qty: 1, offer: WS.sys.Market.price(id), partialOk: true };
      c.greet = U.fill(tpl.greet, greetCtx(c));
    }
    return c;
  }

  // 「밀고자」 길: 감찰청 "공식 제보처"(flag informant_office)가 된 뒤, 왕국 쪽 인간 손님 몇이 인사말에 투덜거린다 (config.mutter).
  // 대화 손님 · 튜토리얼 손님 · 다시 온 손님 · 위장 손님은 빼고. force: 개발 패널용 (확률 무시)
  function mutter(c, force) {
    const M = WS.data.config.mutter;
    if (!M || !c || c.muttered || !c.greet || S().flags.informant_office === undefined) return;
    if (c.kind === 'talk' || c.tutorial || c.returning || c.faction !== c.trueFaction) return;
    if (!M.factions.includes(c.faction) || c.race !== M.race) return;
    if (!force && Math.random() >= M.chance) return;
    c.muttered = true;
    const pre = Math.random() < M.before.length / (M.before.length + M.after.length);
    c.greet = pre ? `${U.pick(M.before)} ${c.greet}` : `${c.greet} ${U.pick(M.after)}`;
  }

  // 궁정 다툼 복선 (config.courtGossip): 다툼이 이어지는 동안 궁정 귀족 · 용병 랜덤 손님 몇이 인사말 끝에 편드는 쪽 이야기를 한다.
  // mutter 와 같은 방식 — 위장 손님 · 이미 한마디 한 손님은 빼고. force: 개발 패널용 (확률 · 시기 무시)
  function gossip(c, force) {
    const G = WS.data.config.courtGossip;
    if (!G || !c || !c.random || c.muttered || c.gossiped || !c.greet || c.faction !== c.trueFaction || (G.except || []).includes(c.tpl)) return;
    const lines = G.lines[c.faction];
    if (!lines || (!force && (!WS.sys.Conditions.check(G.when) || Math.random() >= G.chance))) return;
    c.gossiped = true;
    c.greet = `${c.greet} ${U.pick(lines)}`;
  }

  // ───────── 맥락 한마디 (js/data/remarks.js · design/remarks_guide.md) ─────────
  // 손님이 카운터 앞에 서는 순간(DayManager.nextCustomer) 지금 장부·플래그·세계에 맞는 한 문장을 인사말 앞/뒤에 붙인다.
  // st.remarkLog = { 항목 id: 마지막으로 나온 날 } — 같은 날 · 쿨다운 안 · once 반복 억제 (저장에 그대로 들어간다)
  // c.remark = { id, pos } — 손님에게 붙은 한마디 (저장되는 손님 필드)
  const toneOf = c => {
    const T = WS.data.remarks.tones;
    return T.tpl[c.tpl] || T.faction[c.faction] || null;
  };
  const dealCount = c => S().ledger.filter(e => e.tpl === c.tpl && ['sell', 'buy', 'trade'].includes(e.action)).length;
  function remarkFits(r, c) {
    const w = r.who || {};
    if (r.tone && toneOf(c) !== r.tone) return false;
    const hasF = w.faction && w.faction.length, hasT = w.tpl && w.tpl.length;
    if (hasF || hasT) {
      if (!((hasF && w.faction.includes(c.faction)) || (hasT && w.tpl.includes(c.tpl)))) return false;
    }
    if (!c.random && !hasT) return false; // 이야기 손님은 자기 대사가 우선 — 틀을 콕 집은 항목만
    if (w.notFaction && [].concat(w.notFaction).includes(c.faction)) return false;
    if (w.race && [].concat(w.race).indexOf(c.race) < 0) return false;
    if (w.kind && [].concat(w.kind).indexOf(c.kind) < 0) return false;
    if (w.minDay && S().day < w.minDay) return false;
    if (w.visits) {
      const n = dealCount(c), v = w.visits;
      if ((v.gte !== undefined && n < v.gte) || (v.eq !== undefined && n !== v.eq)) return false;
    }
    return true;
  }
  function remarkCandidates(c) {
    const R = WS.data.remarks, st = S(), log = st.remarkLog || {};
    const cd = R.config.cooldown;
    return R.list.filter(r => {
      const last = log[r.id];
      if (last !== undefined && (r.once || st.day === last || st.day - last < (r.cooldown || cd))) return false;
      return remarkFits(r, c) && WS.sys.Conditions.check(r.when);
    });
  }
  // c 에 한마디를 붙인다. force: 개발 패널·검증용 (확률 · 이어 붙이기 억제 무시). 붙였으면 항목을, 아니면 null
  function remark(c, force) {
    const R = WS.data.remarks, st = S();
    if (!R || !c || c.remark || !c.greet || c.kind === 'talk' || c.tutorial || c.returning || c.grate || c.angry
      || c.muttered || c.gossiped || c.faction !== c.trueFaction) return null;
    if (!force) {
      const q = st.queue || [], prev = q[q.indexOf(c) - 1];
      if (Math.random() >= R.config.chance * (prev && prev.remark ? R.config.chanceAfterRemark : 1)) return null;
    }
    const cands = remarkCandidates(c);
    if (!cands.length) return null;
    const r = U.weightedPick(cands, x => x.weight ?? 1);
    const x = { name: c.name, day: st.day };
    try { Object.assign(x, WS.sys.World.textCtx()); } catch (e) { /* 자리표가 없으면 그대로 */ }
    const text = U.fill(r.text, x);
    const pos = r.pos || (Math.random() < 0.6 ? 'before' : 'after');
    c.greet = pos === 'before' ? `${text} ${c.greet}` : `${c.greet} ${text}`;
    c.remark = { id: r.id, pos };
    st.remarkLog = st.remarkLog || {};
    st.remarkLog[r.id] = st.day;
    return r;
  }

  function buildQueue() {
    const st = S();
    const cfg = WS.data.config;
    // 오늘 새 자리를 여는 튜토리얼 손님 — 누구보다 먼저 온다 (하루 손님 수와는 따로)
    const tutorials = G().dueTutorials().map(tutorialCustomer).filter(Boolean);
    // 아직 열리지 않은 창고 자리의 물건을 찾는 스토리 손님(또는 교환·위장 손님)은 버리지 않고 하루씩 미룬다
    // (held: 미뤄 둔 손님). 자리가 열리는 날부터 온다 (Progress.blockReason).
    // 밀린 손님이 자리가 열리자마자 한꺼번에 몰리지 않게: 튜토리얼 손님이 오는 날은 스토리 손님을
    // early.tutorialDayStory 명까지만, 다른 날은 밀린 손님을 early.backlogPerDay 명까지만 들이고 나머지는 또 하루 미룬다.
    const E = G().early();
    const postponed = [];
    const storyCap = tutorials.length && st.day !== 1 ? (E.tutorialDayStory ?? Infinity) : Infinity;
    const backlogCap = E.backlogPerDay ?? Infinity;
    let story = 0, backlog = 0;
    const admit = (t, held) => {
      const later = () => (postponed.push({ customer: t.id, day: st.day + 1, held: true }), false);
      if (G().blockReason(t)) return later();
      if (story >= storyCap || (held && backlog >= backlogCap)) return later();
      story++;
      if (held) backlog++;
      return true;
    };
    const fixed = WS.data.customers
      .filter(t => t.spawn && t.spawn.day === st.day)
      .sort((a, b) => (a.spawn.order || 0) - (b.spawn.order || 0))
      .filter(t => admit(t, false))
      .map(fromTemplate);

    const extra = [];
    // 이벤트/효과로 예약된 손님 (새로 예약된 손님 먼저, 밀린 손님은 오래 기다린 순서로)
    const due = st.spawnQueue.filter(s => s.day <= st.day).sort((a, b) => (a.held ? 1 : 0) - (b.held ? 1 : 0) || a.day - b.day);
    st.spawnQueue = st.spawnQueue.filter(s => s.day > st.day);
    due.forEach(s => {
      const tpl = tplById(s.customer);
      if (tpl && admit(tpl, !!s.held)) {
        const c = fromTemplate(tpl);
        if (s.grate) applyGrateful(c, s.grate); // 덤 받은 손님의 보답 방문
        extra.push(c);
      } else if (tpl && s.grate) {
        const p = postponed[postponed.length - 1]; // 미뤄진 손님도 보답 내용은 그대로
        if (p && p.customer === s.customer && !p.grate) p.grate = s.grate;
      }
    });
    // 조건부 스토리 손님 (이미 미뤄 둔 손님은 다시 뽑지 않는다)
    // 1일째는 고정 손님만 (플레이 방법을 익히는 날)
    if (st.day !== 1) WS.data.customers
      .filter(t => t.spawn && t.spawn.when && !t.spawn.queuedOnly)
      .filter(t => !(t.spawn.once !== false && st.seenCustomers[t.id] !== undefined))
      .filter(t => !st.spawnQueue.some(s => s.customer === t.id) && !postponed.some(s => s.customer === t.id))
      .filter(t => !t.spawn.minDay || st.day >= t.spawn.minDay)
      .filter(t => WS.sys.Conditions.check(t.spawn.when))
      .filter(t => t.spawn.chance === undefined || Math.random() < t.spawn.chance)
      .filter(t => admit(t, false))
      .forEach(t => extra.push(fromTemplate(t)));
    st.spawnQueue.push(...postponed);

    // 어제 "내일 구해 두겠소" 약속을 받고 다시 오는 손님 (까마귀 서신 — Letters.js). 문 열자마자 온다
    const returners = WS.sys.Letters ? WS.sys.Letters.takeReturners() : [];
    const perDay = G().customersRange();
    // 달력 이벤트(장날·열병식·수확제·전염병)의 손님 수 보정 — 1일째와 튜토리얼 날은 건드리지 않는다
    const cal = WS.sys.Calendar, bonus = cal && st.day > 1 && !G().isPlainDay() ? cal.crowdBonus() : 0, prefer = bonus ? cal.crowdFac() : null;
    const target = st.day === 1 ? returners.length + fixed.length + extra.length
      : Math.max(U.randInt(...perDay) + bonus, returners.length + fixed.length + extra.length);
    const randoms = [];
    while (returners.length + fixed.length + extra.length + randoms.length < target) randoms.push(randomCustomer(prefer));

    // 해가 진 뒤에만 오는 손님(late)은 맨 뒤로
    const mixed = U.shuffle(extra.concat(randoms));
    const queue = tutorials.concat(returners, fixed, mixed.filter(c => !c.late), mixed.filter(c => c.late));
    queue.forEach(c => { mutter(c); gossip(c); if (WS.sys.Rumors) WS.sys.Rumors.tip(c); }); // 소문의 귀띔 (Rumors.tip — 이미 한마디 한 손님은 건너뛴다)
    st.met = st.met || {};
    queue.forEach(c => (st.met[c.faction] = st.met[c.faction] ?? st.day));
    // 도착 시각 배정
    const span = cfg.closeTime - 60 - cfg.openTime;
    const step = span / queue.length;
    queue.forEach((c, i) => {
      const t = cfg.openTime + i * step + Math.random() * step * 0.6;
      c.arrival = Math.round(t / 10) * 10;
    });
    return queue;
  }

  return { buildQueue, tplById, archById, fromTemplate, affil, isStain, mutter, gossip, remark, remarkCandidates, poorify, applyGrateful };
})();

// 까마귀 서신: 편지함(받은 편지) · 보낸 편지 · 공급 제안 배달 · 밀고 · "들어오면 알려 주오"(소원) · "내일 다시 오시오" 약속.
// 문구와 수치는 전부 js/data/letters.js. 상태는 WS.Game.state.letters.
//   inbox    받은 편지 (오래된 것 → 새것 순으로 쌓인다. inbox() 는 새것부터 돌려준다)
//   outbox   보낸 편지 기록
//   orders   배달 대기 물건 { id, day, deliverDay, item, qty, unit, from } — 공급 제안을 받아들인 것
//   loans    (예전 저장본 전용) 빚 { id, principal, requestDay, startDay, dueDay, status: pending|open|overdue|paid, fees, repaid, noticed }
//            급전 청원·대부 권유는 없어졌다. 남은 빚은 전처럼 독촉장 → 상환일 이튿날 금고에서 거둬 가는 식으로 정리된다
//   promises 내일 다시 올 손님 { uid, day, returnDay, name, accused, snap }
//   reports  경비대 밀고 { id, day, resolveDay, uid, name, job, tpl, random, faction, trueFaction, stalled }
//   wishes   "들어오면 알려 주오" 소원 { id, day, tpl, who, job, icon, faction, item, qty, price, status, callDay, comeDay, snap }
//            status: open(기다림) → called(기별함, 내일 온다) → coming(오늘 옴) → done|broken  /  open → expired
//   recent   어제 가게에 든 손님 (밀고 대상 — 까마귀가 영업 중에 오면 전날 손님도 알릴 수 있게)
//   drawer   손으로 건네받은 인상서 { id, day, poster } — 편지가 아니라 서류함에 바로 꽂힌 것 (handPosters)
// 모든 결과는 이튿날 아침 DayManager.startDay → nightly() 에서 처리된다.
// 까마귀는 6일째 둥지지기(튜토리얼 손님)가 들여 준다(Progress 'crow') — 그 전엔 편지가 오가지 않는다.
// 까마귀가 앉는 순간 crowArrived() 가 둥지지기의 안내장(과 아직 못 받은 인상서)을 편지함에 넣는다.
// 인상서 "쥐수염"은 11일째 경비대 전령이 손으로 건넨다 (progress.js tut_docs.posters → handPosters) — 까마귀 없이.
WS.sys.Letters = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;
  const D = () => WS.data.letters;
  const item = id => WS.sys.Items.get(id);
  const txt = (t, ctx) => U.fill(Array.isArray(t) ? U.pick(t) : t, ctx);
  const ok = msg => ({ ok: true, msg });
  const no = msg => ({ ok: false, msg });
  // key: letters.js senders 의 id, 또는 { name, icon } (손님에게 직접 보내는 편지)
  const senderOf = key => (key && typeof key === 'object' ? key : D().senders[key] || { name: key, icon: '✉️' });
  const relVarOf = factionId => {
    const f = WS.data.factions[factionId];
    return f && f.visit && f.visit.var;
  };
  const tplOf = id => (WS.sys.Customers.tplById(id) || WS.sys.Customers.archById(id) || {});

  function initState() {
    return { inbox: [], outbox: [], orders: [], loans: [], promises: [], reports: [], wishes: [], recent: [], seq: 0, welcomed: false, postersSent: {}, drawer: [] };
  }

  // 까마귀는 6일째 둥지지기가 들여 주면 창틀에 자리를 잡는다 (Progress 'crow').
  // 그 전에는 편지가 오지도, 나가지도 않는다 — 공급 제안은 보내지 않고 건너뛴다(쌓아 두지 않는다).
  const crowReady = () => !WS.sys.Progress || WS.sys.Progress.isUnlocked('crow');
  const NO_CROW = '아직 창틀에 까마귀가 없소.';

  // 상태 보장 (예전 저장본에 빠진 칸 채우기)
  function L() {
    const st = S();
    const l = st.letters || (st.letters = initState());
    for (const [k, v] of Object.entries(initState())) if (l[k] === undefined) l[k] = v;
    return l;
  }
  const nextId = p => `${p}${++L().seq}`;

  // ───────── 받은 편지 ─────────
  // extra 에 from/fromIcon 을 넣으면 보낸 이 이름을 덮어쓴다 (손님이 직접 보낸 편지)
  function receive(fromKey, kind, subject, body, extra) {
    const l = L();
    const s = senderOf(fromKey);
    const letter = {
      id: nextId('L'), day: S().day, from: s.name, fromIcon: s.icon, fromKey: typeof fromKey === 'object' ? null : fromKey,
      subject, body, kind, read: false, resolved: false, outcome: null, ref: null, ...extra,
    };
    l.inbox.push(letter);
    // 넘치면 다 읽고 할 일도 없는 오래된 편지부터 버린다
    while (l.inbox.length > D().maxInbox) {
      // 인상서(wanted)는 서류 서랍에서 계속 봐야 하므로 버리지 않는다
      const i = l.inbox.findIndex(x => x.kind !== 'wanted' && x.read && (x.resolved || !actionsFor(x).length));
      l.inbox.splice(i >= 0 ? i : 0, 1);
    }
    return letter;
  }

  function record(type, toKey, subject, body, cost) {
    const l = L();
    const s = senderOf(toKey);
    l.outbox.push({ id: nextId('O'), day: S().day, type, to: s.name, toIcon: s.icon, subject, body, cost: cost || 0 });
    while (l.outbox.length > D().maxOutbox) l.outbox.shift();
  }

  const resolve = (x, outcome) => {
    x.resolved = true;
    x.outcome = outcome || x.outcome;
  };

  function actionsFor(x) {
    if (x.resolved) return [];
    const st = S();
    const lack = cost => (st.gold < cost ? { disabled: true, why: '금화가 모자라오' } : {});
    // 재난 보험 (Calendar.strike 가 보내는 편지) — 손실의 절반을 되찾는 대신 삯을 낸다. 하루가 지나면 더는 못 든다
    if (x.kind === 'insure') {
      const d = st.disaster;
      if (!d || !WS.sys.Calendar.insurable()) return [];
      return [{ id: 'insure', label: `보험을 든다 (${d.fee}G — 손실의 절반 복구)`, ...lack(d.fee) }, { id: 'decline', label: '그냥 감수한다' }];
    }
    if (x.kind === 'offer' && x.ref) {
      return [{ id: 'accept', label: `사겠소 (${x.ref.total}G)`, ...lack(x.ref.total) }, { id: 'decline', label: '됐소' }];
    }
    // (예전 저장본) 남은 빚 독촉장 — 갚기 버튼만. 대부 권유 편지(kind 'loan' + offer)는 더는 받아 줄 수 없다
    if (x.kind === 'loan_due' && x.ref) {
      const loan = findLoan(x.ref.loan);
      if (!loan || loan.status === 'paid' || loan.status === 'pending') return [];
      const owed = owedOf(loan);
      return [{ id: 'repay', label: `${owed}G 갚기`, ...lack(owed) }];
    }
    return [];
  }

  const view = x => ({
    id: x.id, day: x.day, from: x.from, fromIcon: x.fromIcon, subject: x.subject, body: x.body,
    kind: x.kind, read: x.read, resolved: x.resolved, outcome: x.outcome, actions: actionsFor(x),
    ...(x.kind === 'wanted' && x.ref ? { poster: { ...x.ref.poster } } : {}),
  });

  // 서류 서랍에 꽂힌 인상서들 (새것부터). { letterId, day, via, id, look, title, name, marks: [..], wants, reward, note }
  //   via: 'crow' 까마귀 편지로 받음(letterId = 편지 id) / 'hand' 전령에게 손으로 받음(letterId = 'poster:<id>' — 편지는 없다)
  const posters = () => {
    const l = L();
    const byCrow = l.inbox.filter(x => x.kind === 'wanted' && x.ref && x.ref.poster)
      .map((x, i) => ({ n: i, letterId: x.id, day: x.day, via: 'crow', ...x.ref.poster, marks: (x.ref.poster.marks || []).slice() }));
    const byHand = (l.drawer || [])
      .map((x, i) => ({ n: i, letterId: `poster:${x.id}`, day: x.day, via: 'hand', ...x.poster, id: x.id, marks: (x.poster.marks || []).slice() }));
    return byCrow.concat(byHand).sort((a, b) => b.day - a.day || b.n - a.n).map(({ n, ...x }) => x);
  };

  const inbox = () => L().inbox.slice().reverse().map(view);
  const outbox = () => L().outbox.slice().reverse().map(o => ({ ...o }));
  const unreadCount = () => L().inbox.filter(x => !x.read).length;
  const findLetter = id => L().inbox.find(x => x.id === id);

  function markRead(id) {
    const x = findLetter(id);
    if (x) x.read = true;
  }

  // ───────── 배달 (받아들인 공급 제안 · 예전 저장본의 주문) ─────────
  function deliverOrders() {
    const st = S();
    const l = L();
    const due = l.orders.filter(o => o.deliverDay <= st.day);
    l.orders = l.orders.filter(o => o.deliverDay > st.day);
    // 같은 보낸 이 · 같은 물건은 편지 한 통으로 묶는다
    const groups = {};
    for (const o of due) {
      WS.sys.Inventory.add(o.item, o.qty, true);
      WS.sys.Inventory.recordCost(o.item, o.qty, o.unit);
      const k = `${o.from}|${o.item}`;
      (groups[k] = groups[k] || { from: o.from, item: o.item, qty: 0 }).qty += o.qty;
    }
    const O = D().delivery;
    for (const g of Object.values(groups)) {
      const ctx = { item: item(g.item).name, qty: g.qty };
      const body = (O.deliveryBy && O.deliveryBy[g.from]) || O.deliveryBody;
      receive(g.from, 'delivery', txt(O.deliverySubject, ctx), txt(body, ctx), { ref: { item: g.item, qty: g.qty } });
    }
  }

  // ───────── 공급 제안 ─────────
  function itemsMatching(f) {
    return Object.entries(WS.data.items)
      .filter(([, it]) => !it.aliasOf && it.newCategory !== 'special')
      .filter(([, it]) => f.includeSpecial || !it.special)
      .filter(([, it]) => !f.newCategory || it.newCategory === f.newCategory)
      .filter(([, it]) => !f.subtype || it.subtype === f.subtype)
      .filter(([, it]) => !f.rarity || it.rarity === f.rarity)
      .filter(([, it]) => !f.notSupplied || it.supplyWhen === false)
      .map(([id]) => id);
  }

  // 손님이 기다리는데 아직 못 채운 물건 — 그 물건의 공급 제안이 훨씬 자주 온다 (소원이 채워질 수 있게)
  const wantedItems = () => new Set(openWishes().filter(w => !haveFor(w)).map(w => w.item));

  function maybeSupplierOffer() {
    const st = S();
    const d = D();
    const wanted = wantedItems();
    const chance = wanted.size ? Math.max(d.offerChance, d.wish.offerChance) : d.offerChance;
    if (st.day < d.offerFromDay || Math.random() >= chance) return null;
    // 옛 이름(드워프 강철검 등)은 대표 종류로, 아직 창고에 자리가 없는 물건은 제안하지 않는다
    const receivable = id => !WS.sys.Progress || WS.sys.Progress.canReceive(id);
    const pool = d.offers
      .filter(o => WS.sys.Conditions.check(o.when))
      .map(o => ({ o, id: o.item ? WS.sys.Items.canon(o.item) : U.pick(itemsMatching(o.itemFrom || {}).filter(receivable)) }))
      .filter(x => x.id && item(x.id) && receivable(x.id));
    const rw = id => (d.rarityWeight[item(id).rarity] ?? 1) * (wanted.has(id) ? d.wish.offerBoost : 1);
    const pickd = U.weightedPick(pool, x => (x.o.w || 1) * rw(x.id));
    if (!pickd) return null;
    return makeOffer(pickd.o, pickd.id);
  }

  function makeOffer(o, id) {
    const qty = U.range(o.qty || 1);
    const m = Array.isArray(o.mult) ? U.rand(o.mult[0], o.mult[1]) : o.mult || 1;
    const unit = Math.max(1, Math.round(WS.sys.Market.cost(id) * m));
    const total = unit * qty;
    const ctx = { item: item(id).name, qty, unit, total };
    return receive(o.from, 'offer', txt(o.subject, ctx), txt(o.body, ctx), {
      ref: { offer: o.id, item: id, qty, unit, total, from: o.from },
    });
  }

  function acceptOffer(x) {
    const st = S();
    const r = x.ref;
    if (st.gold < r.total) return no('금화가 모자라오.');
    st.gold -= r.total;
    if (st.today) st.today.spend += r.total;
    L().orders.push({ id: nextId('R'), day: st.day, deliverDay: st.day + 1, item: r.item, qty: r.qty, unit: r.unit, from: r.from });
    const o = D().offers.find(z => z.id === r.offer);
    if (o && o.onAccept) WS.sys.Effects.apply(o.onAccept);
    resolve(x, '주문함');
    record('reply', r.from, `답장: ${x.subject}`, `${item(r.item).name} ${r.qty}개, 사겠소. ${r.total}G 동봉하오.`, r.total);
    return ok(`${x.from}에게 답장을 보냈다. 내일 아침 ${item(r.item).name} ${r.qty}개가 도착한다. (−${r.total}G)`);
  }

  // 제안·권유는 받은 날 해 질 때까지만 유효하다 (예전 저장본의 대부 권유 편지도 같이 닫는다)
  function expireOffers() {
    const st = S();
    for (const x of L().inbox) {
      if (x.resolved || x.day >= st.day) continue;
      if (x.kind === 'offer' || (x.kind === 'loan' && x.ref && x.ref.offer)) resolve(x, D().offerExpiredNote);
    }
  }

  // ───────── (예전 저장본) 남은 빚 ─────────
  // 급전 청원·대부 권유는 없어졌다. 이미 진 빚만 전처럼 이자가 붙고, 독촉장의 "갚기" 버튼으로 갚거나
  // 상환일 이튿날 수금원이 금고에서 거둬 간다 (파산으로 끝나지는 않는다).
  const findLoan = id => L().loans.find(l => l.id === id);
  const activeLoans = () => L().loans.filter(l => l.status !== 'paid');

  function owedOf(loan) {
    if (!loan || loan.status === 'paid') return 0;
    if (loan.status === 'pending') return loan.principal || 0;
    const C = D().loan;
    const elapsed = Math.max(0, S().day - (loan.startDay ?? S().day));
    const interest = Math.round((loan.principal || 0) * C.ratePer5Days * elapsed / 5);
    return Math.max(0, (loan.principal || 0) + interest + (loan.fees || 0) - (loan.repaid || 0));
  }

  function repay(loanId) {
    const st = S();
    const C = D().loan;
    const loan = findLoan(loanId);
    if (!loan || !(loan.status === 'open' || loan.status === 'overdue')) return no('갚을 빚이 없소.');
    const owed = owedOf(loan);
    if (st.gold < owed) return no(`금화가 모자라오. (${owed}G 필요)`);
    st.gold -= owed;
    loan.repaid = (loan.repaid || 0) + owed;
    loan.status = 'paid';
    loan.paidDay = st.day;
    L().inbox.forEach(x => x.kind === 'loan_due' && x.ref && x.ref.loan === loan.id && resolve(x, '상환 완료'));
    const ctx = { owed, principal: loan.principal };
    record('repay', C.to, `상환: ${owed}G`, `빌린 ${loan.principal}G, 이자 쳐서 ${owed}G 갚소.`, owed);
    const receipt = receive(C.to, 'notice', txt(C.paidSubject, ctx), txt(C.paidBody, ctx));
    receipt.read = true; // 방금 제 손으로 갚은 영수증
    return ok(`빚 ${owed}G를 갚았다. 길드 장부에서 이름이 지워졌다.`);
  }

  function processLoans() {
    const st = S();
    const C = D().loan;
    for (const loan of L().loans) {
      loan.noticed = loan.noticed || {};
      // 예전에 청원만 넣어 둔 빚 — 청원서는 이미 길드에 닿았으니 금화는 온다
      if (loan.status === 'pending' && loan.requestDay < st.day) {
        loan.status = 'open';
        loan.startDay = st.day;
        loan.dueDay = st.day + C.termDays;
        st.gold += loan.principal;
        WS.sys.Effects.apply(C.onTake);
        receive(C.to, 'loan', txt(C.approvedSubject, { amount: loan.principal, dueDay: loan.dueDay }),
          txt(C.approvedBody, { amount: loan.principal, dueDay: loan.dueDay }), { ref: { loan: loan.id } });
        continue;
      }
      if (loan.status !== 'open' && loan.status !== 'overdue') continue;
      if (loan.dueDay == null) loan.dueDay = st.day;
      const ctx = () => ({ owed: owedOf(loan), principal: loan.principal, dueDay: loan.dueDay });
      const once = key => (loan.noticed[key] ? false : (loan.noticed[key] = true));
      if (st.day > loan.dueDay) {
        seize(loan);
      } else if (st.day === loan.dueDay && once(`due${loan.dueDay}`)) {
        receive(C.to, 'loan_due', txt(C.dueSubject, ctx()), txt(C.dueBody, ctx()), { ref: { loan: loan.id } });
      } else if (st.day === loan.dueDay - C.remindBefore && once(`remind${loan.dueDay}`)) {
        receive(C.to, 'loan_due', txt(C.remindSubject, ctx()), txt(C.remindBody, ctx()), { ref: { loan: loan.id } });
      }
    }
  }

  // 상환일이 지났다: 금고에서 거둬 가되 오늘 세를 낼 만큼은 남긴다 (게임이 끝나지는 않는다)
  function seize(loan) {
    const st = S();
    const C = D().loan;
    const owed = owedOf(loan);
    const floor = WS.sys.Day.rent() + C.keepFloor;
    const seized = Math.max(0, Math.min(owed, st.gold - floor));
    st.gold -= seized;
    loan.repaid = (loan.repaid || 0) + seized;
    WS.sys.Effects.apply(C.onDefault);
    L().inbox.forEach(x => x.kind === 'loan_due' && x.ref && x.ref.loan === loan.id && resolve(x, '연체'));
    let remainText;
    let kind = 'notice';
    if (owedOf(loan) <= 0) {
      loan.status = 'paid';
      loan.paidDay = st.day;
      remainText = C.seizeCleared;
    } else {
      loan.fees = (loan.fees || 0) + Math.round(owedOf(loan) * C.lateFeeRate);
      loan.status = 'overdue';
      loan.dueDay = st.day + C.graceDays;
      remainText = U.fill(C.seizeRemain, { remain: owedOf(loan), dueDay: loan.dueDay });
      kind = 'loan_due'; // 갚기 버튼이 달린 독촉장
    }
    receive(C.to, kind, C.seizeSubject, U.fill(seized > 0 ? C.seizeBody : C.seizeNothingBody, { seized, remainText }), { ref: { loan: loan.id } });
  }

  // ───────── 밀고 ─────────
  const STALL = c => {
    const t = tplOf(c.tpl);
    const ids = (t.extraChoices || []).concat(t.choices || []).filter(ch => ch.stall).map(ch => ch.id);
    return (c.usedChoices || []).some(id => ids.includes(id));
  };
  const lite = c => ({
    uid: c.uid, tpl: c.tpl, name: c.name, job: c.job, faction: c.faction, trueFaction: c.trueFaction,
    random: !!c.random, result: c.result || null, usedChoices: (c.usedChoices || []).slice(), portrait: c.portrait,
  });

  // 어제 가게에 든 손님을 기억해 둔다 (nightly — state.queue 는 아직 어제 것)
  function rememberYesterday() {
    const st = S();
    L().recent = (st.queue || []).filter(c => c.status === 'done' && c.result !== 'missed').map(c => ({ ...lite(c), day: st.day - 1 }));
  }

  // 밀고할 수 있는 손님: 오늘 가게에 든 손님(아직 차례가 안 온 사람은 제외) + 어제 손님 + 내일 다시 오기로 한 손님.
  // 이미 밀고한 손님은 빠진다
  function reportables() {
    const st = S();
    const l = L();
    const reported = new Set(l.reports.map(r => r.uid));
    const seen = new Map();
    for (const c of st.queue || []) if (c.status !== 'waiting') seen.set(c.uid, { ...lite(c), day: st.day, status: c.status });
    for (const p of l.promises) if (!seen.has(p.uid)) seen.set(p.uid, { ...lite(p.snap), result: 'promised', day: p.day });
    for (const c of l.recent || []) if (!seen.has(c.uid)) seen.set(c.uid, c);
    return [...seen.values()].filter(c => !reported.has(c.uid));
  }

  // 경비대가 잡을 만한 자인가: 수배 인상서의 주인공 / 실제 소속이 수상한 세력 / 겉과 속이 다른 위장 손님 / 틀에 suspicious 표시
  function guiltOf(r) {
    const R = D().report;
    const t = tplOf(r.tpl);
    const sent = L().postersSent || {};
    const poster = (D().wanted || []).find(w => sent[w.id] !== undefined && (w.catches || []).includes(r.tpl));
    if (poster) return { poster };
    if (R.shadyFactions.includes(r.trueFaction) || r.faction !== r.trueFaction || !!t.suspicious || !!t.shady) return {};
    return null;
  }

  function sendReport(p) {
    const st = S();
    const R = D().report;
    if (!crowReady()) return no(NO_CROW);
    const c = reportables().find(x => x.uid === p.target);
    if (!c) return no('요즘 가게에 든 손님 중에 그런 자는 없소.');
    const fee = D().crowFee;
    if (st.gold < fee) return no(`까마귀 삯 ${fee}G도 없소.`);
    st.gold -= fee;
    L().reports.push({
      id: nextId('P'), day: st.day, seenDay: c.day ?? st.day, resolveDay: st.day + 1, uid: c.uid, name: c.name, job: c.job,
      tpl: c.tpl, random: !!c.random, faction: c.faction, trueFaction: c.trueFaction, stalled: STALL(c),
    });
    const ctx = { name: c.name, job: c.job };
    record('report', R.to, txt(R.sentSubject, ctx), txt(R.sentBody, ctx), fee);
    return ok(`까마귀가 경비대 초소로 날아갔다. 내일 아침 결과를 알려 올 것이다. (삯 −${fee}G)`);
  }

  function resolveReports() {
    const st = S();
    const R = D().report;
    const l = L();
    const due = l.reports.filter(r => r.resolveDay <= st.day && !r.result);
    for (const r of due) {
      const promise = l.promises.find(p => p.uid === r.uid);
      const t = tplOf(r.tpl);
      const ctx = { name: r.name, job: r.job };
      const g = guiltOf(r);
      // 이미 잡혀간 자 (가게에서 경비대를 불렀다 등) — 헛걸음이지만 탓하지는 않는다
      if (g && t.caughtFlag && st.flags[t.caughtFlag] !== undefined) {
        r.result = 'already';
        receive(R.to, 'report_result', txt(R.alreadySubject, ctx), txt(R.alreadyBody, ctx), { ref: { report: r.id, guilty: true, reward: 0 } });
        continue;
      }
      if (g) {
        r.result = 'guilty';
        // 인상서의 주인공이면 인상서에 적힌 포상금 그대로
        let reward = g.poster ? (g.poster.poster && g.poster.poster.reward) || R.reward.scripted[1] : U.randInt(...(r.random ? R.reward.random : R.reward.scripted));
        const seenDay = r.seenDay ?? r.day;
        const soldTo = st.ledger.some(e => e.day === seenDay && e.name === r.name && e.tpl === r.tpl && (e.action === 'sell' || e.action === 'trade'));
        if (soldTo) reward = Math.round(reward * R.soldToMult);
        else if (r.stalled) reward = Math.round(reward * R.stallMult);
        st.gold += reward;
        r.reward = reward;
        const vars = { reputation: R.guilty.reputation, rel_kingdom: R.guilty.rel_kingdom };
        const rv = relVarOf(r.trueFaction);
        if (rv) vars[rv] = (vars[rv] || 0) + R.guilty.target;
        const f = WS.data.factions[r.trueFaction];
        const news = U.pick(R.news);
        WS.sys.Effects.apply({
          vars,
          flags: r.random ? ['reported_guilty'] : ['reported_guilty', `reported_${r.tpl}`],
          news: [{ cat: news.cat, text: U.fill(news.text, { faction: f ? f.name : '수상한 무리' }) }],
        });
        WS.sys.Effects.apply(R.guiltyEffects); // 감찰청 협력도 · 밀고 적중 (「밀고자」 길)
        // 틀마다 따로 붙는 뒷이야기 (customers.js onReport — 효과 DSL)
        if (!r.random && t.onReport) WS.sys.Effects.apply(t.onReport);
        // 경비대가 데려갔으니 약속한 손님은 오지 않는다
        if (promise) l.promises = l.promises.filter(p => p !== promise);
        const detail = promise ? R.promiseDetail
          : t.reportDetail || (g.poster ? R.details.poster : null) || R.details[r.trueFaction] || R.details.default;
        const rewardLine = txt(soldTo ? R.soldToLine : r.stalled ? R.stallLine : R.rewardLine, { reward });
        const body = txt(R.guiltyBody, { ...ctx, detail, rewardLine });
        receive(R.to, 'report_result', txt(R.guiltySubject, ctx), body, { ref: { report: r.id, guilty: true, reward } });
      } else {
        r.result = 'innocent';
        const vars = { reputation: R.innocent.reputation, rel_kingdom: R.innocent.rel_kingdom };
        const rv = relVarOf(r.faction);
        if (rv) vars[rv] = (vars[rv] || 0) + R.innocent.target;
        WS.sys.Effects.apply({ vars, flags: r.random ? ['reported_innocent'] : ['reported_innocent', `reported_${r.tpl}`] });
        WS.sys.Effects.apply(R.innocentEffects);
        if (!r.random && t.onFalseReport) WS.sys.Effects.apply(t.onFalseReport);
        if (promise) promise.accused = true; // 풀려나서 오긴 오는데, 누가 찔렀는지 안다
        // 억울한 손님이 기다리던 물건이 있었다면 — 이 가게엔 다시 안 온다
        openWishes().filter(w => w.tpl === r.tpl && (!w.snap || w.snap.name === r.name)).forEach(w => (w.status = 'expired'));
        receive(R.to, 'report_result', txt(R.innocentSubject, ctx), txt(R.innocentBody, ctx), { ref: { report: r.id, guilty: false } });
      }
    }
    // 오래된 기록 정리
    l.reports = l.reports.filter(r => !r.result || st.day - r.day <= 10);
  }

  // ───────── "들어오면 알려 주오" (소원) ─────────
  // 손님의 선택지 효과 notify: { item, qty, mult?, price? } → Effects.apply(eff, c) 가 부른다 (c = 카운터의 손님).
  // 물건이 들어오면 "들어왔다고 알리기" 편지로 부르고, 이튿날 웃돈을 얹어 사러 온다.
  const openWishes = () => L().wishes.filter(w => w.status === 'open');
  const freeCount = id => WS.sys.Inventory.count(id) - ((WS.sys.Progress && WS.sys.Progress.deposited) ? WS.sys.Progress.deposited(id) : 0);
  const haveFor = w => freeCount(w.item) >= w.qty;

  function addWish(spec, c) {
    const st = S();
    const l = L();
    const W = D().wish;
    const id = spec && spec.item && WS.sys.Items.canon(spec.item);
    if (!id || !item(id)) return null;
    const who = c || {};
    const tpl = spec.from || who.tpl || null;
    if (l.wishes.some(w => ['open', 'called', 'coming'].includes(w.status) && w.tpl === tpl && w.item === id && w.who === (who.name || w.who))) return null;
    const qty = Math.max(1, spec.qty || 1);
    const mult = spec.mult ?? W.mult;
    const price = spec.price ?? Math.max(1, Math.round(WS.sys.Market.price(id) * qty * mult));
    let snap = null;
    if (c) {
      snap = U.copy(c);
      ['dialog', 'status', 'result', 'arrival', 'docCheckVerdict', 'docCheckCorrect', 'usedChoices', 'tutorial', 'returning', 'wishId'].forEach(k => delete snap[k]);
    }
    const t = tpl ? tplOf(tpl) : {};
    const w = {
      id: nextId('W'), day: st.day, tpl, who: who.name || t.name || '손님', job: who.job || t.job || '',
      icon: who.portrait || t.portrait || '✉️', faction: who.faction || t.faction || null,
      item: id, qty, price, mult, status: 'open', callDay: null, comeDay: null, snap,
    };
    l.wishes.push(w);
    return w;
  }

  // 소원 목록 (UI 표시용) — ready: 지금 창고에 넉넉히 있어 바로 알릴 수 있다
  function wishes() {
    return L().wishes.filter(w => ['open', 'called'].includes(w.status)).map(w => ({
      id: w.id, day: w.day, who: w.who, job: w.job, icon: w.icon, item: w.item, itemName: item(w.item).name, itemIcon: item(w.item).icon,
      qty: w.qty, price: w.price, status: w.status, ready: w.status === 'open' && haveFor(w), comeDay: w.comeDay, expireDay: expireDayOf(w),
    }));
  }

  // 까마귀가 오기 전에 남긴 소원은 까마귀가 온 날부터 센다
  function expireDayOf(w) {
    const st = S();
    const crowDay = st.progress && st.progress.unlocked ? st.progress.unlocked.crow : null;
    if (!crowReady()) return null;
    return Math.max(w.day, crowDay ?? w.day) + D().wish.ttl;
  }

  function expireWishes() {
    const st = S();
    const W = D().wish;
    for (const w of openWishes()) {
      const end = expireDayOf(w);
      if (end == null || st.day <= end) continue;
      w.status = 'expired';
      const ctx = { item: item(w.item).name, qty: w.qty, name: w.who };
      receive({ name: w.who, icon: w.icon }, 'notice', txt(W.expireSubject, ctx), txt(W.expireBody, ctx));
      if (W.expired) {
        const rv = relVarOf(w.faction);
        WS.sys.Effects.apply({ vars: { reputation: W.expired.reputation, ...(rv ? { [rv]: W.expired.rel } : {}) } });
      }
    }
  }

  function sendNotify(p) {
    const st = S();
    const W = D().wish;
    if (!crowReady()) return no(NO_CROW);
    const w = openWishes().find(x => x.id === p.wish);
    if (!w) return no('그런 손님은 기다리고 있지 않소.');
    if (!haveFor(w)) return no(`${item(w.item).name} ${w.qty}개가 아직 없소.`);
    const fee = D().crowFee;
    if (st.gold < fee) return no(`까마귀 삯 ${fee}G도 없소.`);
    st.gold -= fee;
    w.status = 'called';
    w.callDay = st.day;
    w.comeDay = st.day + 1;
    const ctx = { item: item(w.item).name, qty: w.qty, name: w.who };
    record('notify', { name: w.who, icon: w.icon }, txt(W.sentSubject, ctx), txt(W.sentBody, ctx), fee);
    return ok(`까마귀가 ${w.who}에게 날아갔다. 내일 ${item(w.item).name} ${w.qty}개를 사러 온다. 팔지 말고 남겨 두자. (삯 −${fee}G)`);
  }

  // 기별 받은 손님 — 웃돈을 얹은 값으로 사러 온다 (takeReturners 가 부른다)
  function wishCaller(w) {
    const st = S();
    const W = D().wish;
    const tpl = WS.sys.Customers.tplById(w.tpl);
    let c;
    if (w.snap) c = U.copy(w.snap);
    else if (tpl) c = WS.sys.Customers.fromTemplate(tpl);
    else return null;
    if (tpl) st.seenCustomers[tpl.id] = st.day;
    delete c.trade;
    const offer = Math.max(w.price, Math.round(WS.sys.Market.price(w.item) * w.qty * W.minMult));
    Object.assign(c, {
      uid: U.uid('c'), kind: 'buy', status: 'waiting', dialog: [], usedChoices: [], late: false,
      docCheck: null, docCheckDone: false, payment: null, payNote: null,
      returning: true, wishId: w.id, accused: false,
      request: { item: w.item, qty: w.qty, offer, partialOk: w.qty > 1 },
    });
    c.greet = txt(W.returnGreets, { item: item(w.item).name, qty: w.qty, offer });
    c.lines = { ...(c.lines || {}), sold: W.lines.sold, partial: W.lines.partial, refused: W.lines.refused };
    w.status = 'coming';
    return c;
  }

  // ───────── "내일 구해 둘 테니 다시 오시오" ─────────
  function requestLabel(r) {
    if (!r) return '';
    if (r.item) return item(r.item).name;
    const cat = WS.data.categories[r.category];
    if (!cat) return '물건';
    return (r.preferSubtype && cat.subtypes[r.preferSubtype]) || cat.name;
  }

  // 지금 가진 물건만으로 요청을 다 채울 수 있는지
  function fillable(r) {
    if (r.item) return WS.sys.Inventory.count(r.item) >= r.qty;
    const have = Object.keys(S().inventory).reduce((s, id) => {
      const o = WS.sys.Trade.offerForCategoryItem({ request: { ...r, qty: 1 } }, id);
      return s + (o && o.accepted ? WS.sys.Inventory.count(id) : 0);
    }, 0);
    return have >= r.qty;
  }

  function canPromise(c) {
    if (!c || c.kind !== 'buy' || !c.request) return no('물건을 사러 온 손님에게만 할 수 있소.');
    if (c.status === 'done') return no('이미 떠난 손님이오.');
    if (c.returning) return no('이미 한 번 미룬 손님이오. 두 번은 안 통하오.');
    if (L().promises.some(p => p.uid === c.uid)) return no('이미 약속했소.');
    if (c.promiseRefused) return no('이미 미루려 했다가 거절당한 손님이오.');
    if (fillable(c.request)) return no('지금 가진 물건으로도 채울 수 있소.');
    return ok('');
  }

  // 지금 가진 물건으로 채울 수 있는 개수
  function haveOf(r) {
    if (r.item) return Math.min(r.qty, WS.sys.Inventory.count(r.item));
    return Math.min(r.qty, Object.keys(S().inventory).reduce((s, id) => {
      const o = WS.sys.Trade.offerForCategoryItem({ request: { ...r, qty: 1 } }, id);
      return s + (o && o.accepted ? WS.sys.Inventory.count(id) : 0);
    }, 0));
  }

  // 손님이 미루기를 어떻게 받는가: 'accept' | 'partial' | 'leave' — 세력 성격 · 우호도로. 튜토리얼 손님은 늘 받아들인다
  function reactionOf(c) {
    const P = D().promise;
    const R = P.reactions || {};
    const conf = R[c.faction] || R.default;
    if (!conf) return { kind: 'accept', conf: { accept: P.replies } };
    if (c.tutorial) return { kind: 'accept', conf };
    const rv = relVarOf(c.faction);
    const rel = rv ? WS.sys.World.get(rv) : 0;
    const rate = Math.max(0.08, Math.min(0.9, conf.rate + rel * 0.01));
    if (Math.random() < rate) return { kind: 'accept', conf };
    const have = haveOf(c.request);
    return { kind: have > 0 && Math.random() < conf.partialRate ? 'partial' : 'leave', conf, have };
  }

  function promiseReturn(c) {
    const chk = canPromise(c);
    if (!chk.ok) return chk;
    const st = S();
    const P = D().promise;
    const react = reactionOf(c);
    if (react.kind !== 'accept') {
      c.promiseRefused = true;
      c.dialog.push({ who: 'p', text: P.playerLine });
      c.dialog.push({ who: 'c', text: txt(react.conf[react.kind], {}) });
      if (react.kind === 'partial') {
        // 있는 만큼만 사 가겠다 — 요구 수량과 값을 그만큼으로 줄이고 그대로 거래 화면
        const r = c.request, was = r.qty;
        r.qty = react.have;
        if (r.offer != null) r.offer = Math.round(r.offer * react.have / was);
        return ok(`${c.name}은(는) 기다리지 않고, 있는 것만 ${react.have}개 사 가겠다고 한다.`);
      }
      c.status = 'done';
      c.result = 'left';
      const rv = relVarOf(c.faction);
      if (rv) WS.sys.Effects.apply({ vars: { [rv]: -1 } });
      return ok(`${c.name}은(는) "다른 데 가겠다"며 돌아섰다.`);
    }
    const snap = U.copy(c);
    ['dialog', 'status', 'result', 'arrival', 'docCheckVerdict', 'docCheckCorrect'].forEach(k => delete snap[k]);
    L().promises.push({ uid: c.uid, day: st.day, returnDay: st.day + 1, name: c.name, accused: false, snap });
    st.ledger.push({
      day: st.day, time: st.time, name: c.name, tpl: c.tpl, faction: c.faction, trueFaction: c.trueFaction,
      action: P.ledgerAction, item: c.request.item || null, category: c.request.category || null, qty: c.request.qty, price: 0,
    });
    c.dialog.push({ who: 'p', text: P.playerLine });
    c.dialog.push({ who: 'c', text: txt(react.conf.accept || P.replies, {}) });
    c.status = 'done';
    c.result = 'promised';
    return ok(`${c.name}이(가) 내일 아침 다시 오기로 했다. ${requestLabel(c.request)} ${c.request.qty}개를 구해 두자.`);
  }

  // CustomerManager.buildQueue 가 부른다: 오늘 다시 오는 손님들 (대기열 맨 앞) — 약속 손님 + 기별 받은 손님
  function takeReturners() {
    const st = S();
    const l = L();
    const P = D().promise;
    const due = l.promises.filter(p => p.returnDay <= st.day);
    l.promises = l.promises.filter(p => p.returnDay > st.day);
    const back = due.map(p => {
      const c = U.copy(p.snap);
      if (c.request && c.request.item) c.request.item = WS.sys.Items.canon(c.request.item);
      Object.assign(c, {
        status: 'waiting', dialog: [], usedChoices: [], late: false, docCheckDone: false,
        returning: true, promiseDay: p.day, accused: !!p.accused,
      });
      // 무엇을 · 몇 개 · 얼마에 — 값이 정해진 요청이면 값까지 다시 말한다
      const offer = c.request.offer;
      const priced = offer != null;
      const greets = p.accused ? (priced ? P.accusedGreets : P.accusedGreetsNoPrice || P.accusedGreets)
        : (priced ? P.returnGreets : P.returnGreetsNoPrice || P.returnGreets);
      c.greet = txt(greets, { item: requestLabel(c.request), qty: c.request.qty, offer });
      c.lines = { ...(c.lines || {}), sold: P.lines.sold, partial: P.lines.partial, refused: P.lines.refused };
      return c;
    });
    const callers = l.wishes.filter(w => w.status === 'called' && w.comeDay <= st.day).map(wishCaller).filter(Boolean);
    return back.concat(callers);
  }

  // 헛걸음 — 일부러 다시 찾아온 손님(내일 다시 오시오 · 기별 · 소원)인데 요구 물건을 채울 수 없으면 화를 낸다.
  // 우호도 · 평판이 바로 깎이고 (달래면 절반), 화난 대사가 나온다. c.angry 는 저장되는 손님 필드
  const FAST = ['goblin', 'merc', 'bandit', 'orc', 'pirate'];
  function angerConf(c) { const A = D().promise.angry; return A[c.faction] || A.default; }
  function checkArrival(c) {
    if (!c || c.angerChecked || !c.returning || c.kind !== 'buy' || !c.request) return;
    c.angerChecked = true;
    if (fillable(c.request)) return;
    const conf = angerConf(c), pen = FAST.includes(c.faction) ? 3 : conf.rel;
    c.angry = true; c.angerPen = pen;
    const vars = { reputation: -1 }, rv = relVarOf(c.faction);
    if (rv) vars[rv] = -pen;
    WS.sys.Effects.apply({ vars });
    c.dialog[0] = { who: 'c', text: `${txt(conf.lines, {})} ${c.greet}` }; // 화난 한마디 + 처음 인사 (말풍선은 마지막 대사만 뜬다)
  }
  // 사과하고 덤을 준다 — 있는 물건 하나를 덤으로 건네 화를 푼다 (우호도 하락의 절반을 되돌린다)
  function angerGift(c) {
    if (!c || !c.angry || c.calmed) return no('화가 나지 않았소.');
    const st = S();
    const ids = Object.keys(st.inventory).filter(id => st.inventory[id] > 0);
    if (!ids.length) return no('건넬 덤이 없소.');
    const id = ids.sort((a, b) => WS.sys.Market.price(a) - WS.sys.Market.price(b))[0];
    WS.sys.Inventory.remove(id, 1);
    c.angry = false; c.calmed = true;
    const rv = relVarOf(c.faction);
    if (rv) WS.sys.Effects.apply({ vars: { [rv]: Math.ceil((c.angerPen || 2) / 2) } });
    c.dialog.push({ who: 'p', text: `(사과하며 ${item(id).name} 하나를 덤으로 건넨다)` });
    c.dialog.push({ who: 'c', text: txt(angerConf(c).calm, {}) });
    return ok(`${item(id).name} 하나를 덤으로 주고 사과했다.`);
  }

  // 어제 다시 온 손님을 어떻게 보냈는지 — 밤사이 소문이 돈다 (state.queue 는 아직 어제 것)
  function settleReturners() {
    const st = S();
    const P = D().promise;
    const W = D().wish;
    for (const c of st.queue || []) {
      if (!c.returning || c.promiseSettled) continue;
      c.promiseSettled = true;
      const kept = c.result === 'sold';
      const broken = ['refused', 'missed', 'left'].includes(c.result);
      const w = c.wishId ? L().wishes.find(x => x.id === c.wishId) : null;
      if (w) w.status = kept ? 'done' : broken ? 'broken' : 'done';
      if (!kept && !broken) continue;
      if (broken && (c.angry || c.calmed)) continue; // 헛걸음 분노로 이미 깎였다
      const E = w ? W : P;
      const eff = kept ? E.kept : E.broken;
      const vars = { reputation: eff.reputation };
      const rv = relVarOf(c.faction);
      if (rv) vars[rv] = eff.rel;
      WS.sys.Effects.apply({ vars, news: [{ cat: '장부', text: U.fill(kept ? E.keptNews : E.brokenNews, { name: c.name }) }] });
    }
    // 이미 다녀갔어야 할 손님인데 대기열에 없었다 (예전 저장본 등) — 기별을 헛걸음으로 치지 않고 닫는다
    for (const w of L().wishes) if (w.status === 'coming' && w.comeDay < st.day - 1) w.status = 'done';
  }

  // ───────── 편지 쓰기 (UI 작성 화면) ─────────
  function templates() {
    const d = D();
    const noCrow = crowReady() ? null : NO_CROW;
    const tpl = (type, toKey, title, desc, params, block) => {
      const s = senderOf(toKey);
      block = noCrow || block;
      return { type, to: s.name, toIcon: s.icon, title, desc, params, ...(block ? { disabled: true, why: block } : {}) };
    };

    const R = d.report;
    const st = S();
    const people = reportables();
    const statusText = c => {
      if (STALL(c)) return '답을 미룸';
      const r = { sold: '물건을 사 감', refused: '돌려보냄', promised: '내일 다시 옴', bought: '물건을 팔고 감', traded: '교환함', talked: '이야기만 함', missed: '돌려보냄' }[c.result];
      return r || (c.status === 'active' ? '지금 응대 중' : '다녀감');
    };
    const when = c => (c.day != null && c.day < st.day ? '어제 · ' : '');
    const report = tpl('report', R.to, R.title, `${R.desc} (삯 ${d.crowFee}G)`, [
      { key: 'target', label: '수상한 자', options: people.map(c => ({ value: c.uid, label: c.name, sub: `${c.job || ''} · ${when(c)}${statusText(c)}` })) },
    ], people.length ? null : R.nobodyWhy);

    const W = d.wish;
    const open = openWishes();
    const ready = open.filter(haveFor);
    const waitList = open.map(w => `${w.who}: ${item(w.item).name} ${w.qty}`).join(', ');
    const notify = tpl('notify', { name: '기다리는 손님', icon: '🔔' }, W.title, `${W.desc} (삯 ${d.crowFee}G)`, [
      { key: 'wish', label: '기다리는 손님', options: ready.map(w => ({ value: w.id, label: `${w.icon} ${w.who}`, sub: `${item(w.item).icon} ${item(w.item).name} ${w.qty}개 · 약 ${w.price}G에 삼` })) },
    ], ready.length ? null : open.length ? U.fill(W.waitWhy, { list: waitList }) : W.noneWhy);

    // 별조각 보내기 — 밤손님(???)에게 백 닢 주고 받은 하늘 조각. 대성당에 보내 기도하게 하면 하늘이 대답한다
    const star = tpl('star', { name: '받는 이를 고른다', icon: '✴️' }, '별조각 보내기', `별조각을 누군가에게 맡긴다. 쓰임은 받는 이가 정한다 (삯 ${d.crowFee}G)`, [
      { key: 'to', label: '받는 이', options: starTargets().map(t => ({ value: t.id, label: `${t.icon} ${t.name}`, sub: t.sub })) },
    ], WS.sys.Inventory.count('star_shard') > 0 ? null : '보낼 별조각이 없소.');

    const E = d.expand, Inv = WS.sys.Inventory, X = Inv.nextStep();
    const expandWhy = !X ? '창고 확장은 끝났소.' : L().expandOrder ? '증축 공사 중이오.' : st.gold < X.cost ? `삯 ${X.cost}G가 모자라오.` : null;
    const expand = tpl('expand', E.to, `${E.title} (${Inv.level() + 1}/${Inv.maxLevel()}단계)`, `${E.desc} (${X ? X.cost + 'G' : '—'})`, [], expandWhy);

    // 소문 확인 의뢰 — 신문 ❓ 소문의 진위를 정보상에게. 삯 선불, 답장은 다음 날 아침 (Rumors.js)
    const RC = d.rumorCheck, rums = WS.sys.Rumors ? WS.sys.Rumors.askable() : [];
    const rumorWhy = !rums.length ? RC.noneWhy : st.gold < RC.fee ? `삯 ${RC.fee}G가 모자라오.` : null;
    const rumorT = tpl('rumor', RC.to, RC.title, `${RC.desc} (${RC.fee}G)`, [
      { key: 'rumor', label: '확인할 소문', options: rums.map(r => ({ value: r.id, label: r.text, sub: `${r.day}일째 신문` })) },
    ], rumorWhy);

    // 까마귀 대출 (은화 저울 상회 까마귀 창구) — 즉시 금고에 들어온다. 동시에 한 건, 갚으면 다시 가능
    const LN = d.crowLoan, loan = crowLoan();
    const loanDesc = loan ? `갚을 돈 ${loanOwed(loan)}G · ${loanLeftText(loan)}` : `${LN.desc} (${LN.limits.join(' / ')}G)`;
    const loanT = tpl('loan', LN.from, LN.title, loanDesc, [
      { key: 'amount', label: '빌릴 돈', options: LN.limits.map(v => ({ value: v, label: `${v}G`, sub: `갚을 돈 ${Math.round(v * (1 + LN.interest))}G` })) },
    ], loan ? `이미 빌렸소. 갚을 돈 ${loanOwed(loan)}G · ${loanLeftText(loan)}` : null);
    const repayT = loan ? tpl('loan_repay', LN.from, LN.repayTitle, `갚을 돈 ${loanOwed(loan)}G · ${loanLeftText(loan)}`, [], st.gold >= loanOwed(loan) ? null : `금화가 모자라오. (${loanOwed(loan)}G)`) : null;

    // 밤 경비 — 고용하면 일당이 매일 밤 정산에서 나가고, 밤손님의 정체를 문 열기 전에 알려 준다. 해고는 언제든 (js/data/shop.js guard)
    const GD = WS.data.shop.guard, guarded = WS.sys.Shop.guarded();
    const guardT = guarded
      ? tpl('guard_fire', { name: GD.hire.to, icon: GD.hire.icon }, GD.fire.title, GD.fire.desc, [], null)
      : tpl('guard_hire', { name: GD.hire.to, icon: GD.hire.icon }, GD.hire.title, GD.hire.desc, [], st.gold < GD.wage ? `일당 ${GD.wage}G가 없소.` : null);

    return [report, notify, expand, rumorT, loanT, ...(repayT ? [repayT] : []), guardT, ...(S().flags.star_bought !== undefined && !S().flags.star_sent ? [star] : [])];
  }

  // 별조각을 받을 수 있는 곳 — 대성당만 하늘의 대답(엔딩)으로 이어진다
  function starTargets() {
    const f = S().flags;
    const list = [
      { id: 'church', icon: '⛪', name: '대성당', sub: '제단에 올려 기도한다', event: 'star_answer', days: [3, 4] },
      { id: 'dwarf', icon: '⚒️', name: '강철수염 공방', sub: '쇳물에 녹인다', event: 'star_to_dwarf', days: [2, 3] },
      { id: 'tower', icon: '🔭', name: '은빛 탑', sub: '마법사들이 연구한다', event: 'star_to_tower', days: [2, 3] },
    ];
    // 레온이 아직 전투 전이고 살아 있으면 — 칼자루에 박아 부적으로
    if (f.leon_fell === undefined && f.leon_commander === undefined && f.leon_tavern === undefined && S().seenCustomers && S().seenCustomers.d1_knight !== undefined) {
      list.push({ id: 'leon', icon: '🛡️', name: '레온', sub: '칼자루에 박아 부적으로 삼는다', flag: 'leon_charm' });
    }
    return list;
  }

  function sendStar(p) {
    const st = S();
    if (!crowReady()) return no(NO_CROW);
    if (WS.sys.Inventory.count('star_shard') < 1) return no('보낼 별조각이 없소.');
    const t = starTargets().find(x => x.id === p.to);
    if (!t) return no('누구에게 보낼지 고르시오.');
    const fee = D().crowFee;
    if (st.gold < fee) return no(`까마귀 삯 ${fee}G도 없소.`);
    st.gold -= fee;
    WS.sys.Inventory.remove('star_shard', 1);
    st.flags.star_sent = st.day;
    const fx = { flags: [`star_to_${t.id}`] };
    if (t.flag) fx.flags.push(t.flag);
    if (t.event) fx.schedule = [{ event: t.event, inDays: t.days }];
    WS.sys.Effects.apply(fx);
    record('star', { name: t.name, icon: t.icon }, `별조각을 ${t.name}에`, `${t.sub}.`, fee);
    return ok(`까마귀가 별조각을 물고 ${t.name}(으)로 날아갔다. (삯 −${fee}G)`);
  }

  // ───────── 까마귀 대출 (state.letters.crowLoan: { principal, owe, day, due, penalty, lateDays, warned }) ─────────
  const crowLoan = () => L().crowLoan || null;
  const loanOwed = ln => ln.owe + (ln.penalty || 0);
  const loanLeftText = ln => {
    const left = ln.due - S().day;
    return left >= 0 ? `기한 ${ln.due}일째 밤까지 (${left}일 남음)` : `연체 ${ln.lateDays || 1}일째 (가산 ${ln.penalty || 0}G)`;
  };
  function sendLoan(p) {
    const st = S();
    if (!crowReady()) return no(NO_CROW);
    const q = quote('loan', p);
    if (!q.ok) return no(q.msg);
    const LN = D().crowLoan, amt = +p.amount;
    L().crowLoan = { principal: amt, owe: Math.round(amt * (1 + LN.interest)), day: st.day, due: st.day + LN.days, penalty: 0, lateDays: 0 };
    st.gold += amt;
    if (st.today) st.today.spend -= 0;
    record('loan', LN.from, `${LN.title} ${amt}G`, `${amt}G를 받았다. ${LN.days}일째 밤까지 ${L().crowLoan.owe}G를 갚는다.`, 0);
    return ok(`까마귀가 묵직한 주머니를 물고 돌아왔다. (+${amt}G · ${LN.days}일째 밤까지 ${L().crowLoan.owe}G)`);
  }
  function repayLoan() {
    const st = S(), loan = crowLoan();
    if (!loan) return no('갚을 빚이 없소.');
    const owed = loanOwed(loan);
    if (st.gold < owed) return no(`금화가 모자라오. (${owed}G)`);
    st.gold -= owed;
    L().crowLoan = null;
    record('loan_repay', D().crowLoan.from, `${D().crowLoan.repayTitle} ${owed}G`, '대출을 모두 갚았다.', owed);
    return ok(`까마귀가 ${owed}G를 물고 날아갔다. 대출을 모두 갚았다.`);
  }
  // 밤사이: 기한이 지나면 매일 가산금 · 독촉 · 연체 3일째 수금원 모트
  function processCrowLoan() {
    const st = S(), loan = crowLoan(), LN = D().crowLoan;
    if (!loan || st.day <= loan.due) return;
    loan.lateDays = (loan.lateDays || 0) + 1;
    loan.penalty = (loan.penalty || 0) + Math.round(loan.principal * LN.lateRate);
    if (loan.lateDays === 1) receive(LN.from, 'notice', LN.dueLetter.subject, U.fill(LN.dueLetter.body, { owed: loanOwed(loan) }));
    if (loan.lateDays < LN.collectDay) return;
    // 연체 3일째 아침 — 수금원 모트가 원리금 + 벌금을 받아 간다 (금고에서 자동)
    const total = loanOwed(loan) + Math.round(loan.principal * LN.fineRate);
    const took = Math.min(total, Math.max(0, st.gold));
    st.gold -= took;
    const short = took < total;
    if (short) {
      const left = total - took;
      loan.owe = left; loan.penalty = 0; loan.lateDays = 0; loan.due = st.day; // 남은 돈은 다음 사흘 주기로 다시 독촉
      WS.sys.World.add('debt_strikes', 1);
      receive(LN.from, 'notice', LN.collectLetter.subject, U.fill(LN.collectLetter.short, { took, left }));
    } else {
      L().crowLoan = null;
      receive(LN.from, 'notice', LN.collectLetter.subject, U.fill(LN.collectLetter.paid, { total }));
    }
  }

  // 증축 의뢰 — 선불 후 이틀 뒤 아침에 답장과 함께 확장 (nightly → deliverExpand)
  function sendExpand() {
    const st = S();
    if (!crowReady()) return no(NO_CROW);
    const q = quote('expand', {});
    if (!q.ok) return no(q.msg);
    const X = WS.sys.Inventory.nextStep();
    if (!WS.sys.Inventory.payExpand()) return no('금화가 모자라오.');
    L().expandOrder = { day: st.day, doneDay: st.day + D().expand.days };
    record('expand', D().expand.to, D().expand.title, `삯 ${X.cost}G를 미리 냈다. ${D().expand.days}일 뒤 완공.`, X.cost);
    return ok(`까마귀가 목수에게 날아갔다. 삯 ${X.cost}G는 선불, ${D().expand.days}일 뒤 아침에 답장이 온다.`);
  }
  function deliverExpand() {
    const o = L().expandOrder;
    if (!o || S().day < o.doneDay) return;
    L().expandOrder = null;
    const lv = WS.sys.Inventory.level();
    if (!WS.sys.Inventory.applyExpand()) return;
    const E = D().expand;
    receive(E.to, 'news', E.doneSubject, E.done[Math.min(lv, E.done.length - 1)]);
  }

  // 소문 확인 의뢰 — 삯 선불 (Rumors.ask 가 의뢰를 적어 둔다), 다음 날 아침 nightly → deliverRumorReplies 가 답장을 받는다
  function sendRumor(p) {
    const st = S();
    if (!crowReady()) return no(NO_CROW);
    const q = quote('rumor', p);
    if (!q.ok) return no(q.msg);
    const RC = D().rumorCheck, r = WS.sys.Rumors.askable().find(x => x.id === p.rumor);
    if (!WS.sys.Rumors.ask(p.rumor)) return no('그 소문은 이미 알아보는 중이오.');
    st.gold -= RC.fee;
    record('rumor', RC.to, RC.title, `소문 「${r.text}」 — 삯 ${RC.fee}G를 미리 냈다. 답은 내일 아침.`, RC.fee);
    return ok(`까마귀가 정보상에게 날아갔다. 삯 ${RC.fee}G는 선불, 내일 아침 답장이 온다.`);
  }
  function deliverRumorReplies() {
    if (!WS.sys.Rumors) return;
    const RC = D().rumorCheck;
    for (const e of WS.sys.Rumors.dueInquiries()) {
      const a = WS.sys.Rumors.answer(e);
      receive(RC.to, 'news', txt(RC.subject, { answer: RC.answerWord[a.r] }), txt(RC.body[a.r], { rumor: a.text }));
    }
  }

  // 보내기 전에 값만 미리 보기 (UI 확인 버튼용)
  function quote(type, p) {
    p = p || {};
    const d = D();
    const fee = d.crowFee;
    if (type === 'report') {
      const c = reportables().find(x => x.uid === p.target);
      return { ok: crowReady() && !!c && S().gold >= fee, cost: fee, msg: c ? `${c.name}을(를) 경비대에 알린다 · 삯 ${fee}G` : '누구를 알릴지 고르시오.' };
    }
    if (type === 'notify') {
      const w = openWishes().find(x => x.id === p.wish);
      if (!w) return { ok: false, cost: fee, msg: '누구에게 알릴지 고르시오.' };
      return { ok: crowReady() && haveFor(w) && S().gold >= fee, cost: fee, msg: `${w.who} — 내일 ${item(w.item).name} ${w.qty}개를 약 ${w.price}G에 사러 온다 · 삯 ${fee}G` };
    }
    if (type === 'expand') {
      const X = WS.sys.Inventory.nextStep();
      const why = !X ? '창고 확장은 끝났소.' : L().expandOrder ? '증축 공사 중이오.' : S().gold < X.cost ? `삯 ${X.cost}G가 모자라오.` : '';
      return { ok: crowReady() && !why, cost: X ? X.cost : 0, msg: why || `목수에게 증축을 맡긴다 (${WS.sys.Inventory.level() + 1}/${WS.sys.Inventory.maxLevel()}단계) — 용량 +${X.slots * WS.data.config.slotVolume} · ${D().expand.days}일 뒤 완공 · 삯 ${X.cost}G (선불)` };
    }
    if (type === 'rumor') {
      const RC = D().rumorCheck, r = WS.sys.Rumors && WS.sys.Rumors.askable().find(x => x.id === p.rumor);
      if (!r) return { ok: false, cost: RC.fee, msg: WS.sys.Rumors && WS.sys.Rumors.askable().length ? '어느 소문을 알아볼지 고르시오.' : RC.noneWhy };
      return { ok: crowReady() && S().gold >= RC.fee, cost: RC.fee, msg: `정보상이 고른 소문의 진위를 알아본다 · 내일 아침 답장 · 삯 ${RC.fee}G (선불${S().gold >= RC.fee ? '' : ' — 금화가 모자라오'})` };
    }
    if (type === 'loan') {
      const LN = D().crowLoan, loan = crowLoan();
      if (loan) return { ok: false, cost: 0, msg: `이미 빌렸소. 갚을 돈 ${loanOwed(loan)}G · ${loanLeftText(loan)}` };
      const amt = +p.amount;
      if (!LN.limits.includes(amt)) return { ok: false, cost: 0, msg: '얼마를 빌릴지 고르시오.' };
      return { ok: crowReady(), cost: 0, msg: `${amt}G가 바로 금고에 들어온다 · ${LN.days}일째 밤까지 ${Math.round(amt * (1 + LN.interest))}G를 갚는다 (이자 ${Math.round(LN.interest * 100)}%)` };
    }
    if (type === 'loan_repay') {
      const loan = crowLoan();
      if (!loan) return { ok: false, cost: 0, msg: '갚을 빚이 없소.' };
      const owed = loanOwed(loan);
      return { ok: crowReady() && S().gold >= owed, cost: owed, msg: S().gold >= owed ? `${owed}G를 모두 갚는다 · ${loanLeftText(loan)}` : `금화가 모자라오. (${owed}G)` };
    }
    if (type === 'guard_hire') {
      const w = WS.data.shop.guard.wage;
      if (WS.sys.Shop.guarded()) return { ok: false, cost: 0, msg: '이미 경비를 세워 두었소.' };
      return { ok: crowReady() && S().gold >= w, cost: 0, msg: `밤 경비를 세운다 — 일당 ${w}G가 매일 밤 정산에서 나간다 (금고가 모자라면 그날 그만둔다). 밤손님의 정체를 문 열기 전에 알려 준다.` };
    }
    if (type === 'guard_fire') return { ok: crowReady() && WS.sys.Shop.guarded(), cost: 0, msg: '경비를 내보낸다. 일당은 더 나가지 않는다.' };
    if (type === 'star') {
      const t = starTargets().find(x => x.id === p.to);
      if (!t) return { ok: false, cost: fee, msg: '누구에게 보낼지 고르시오.' };
      return { ok: crowReady() && WS.sys.Inventory.count('star_shard') > 0 && S().gold >= fee, cost: fee, msg: `별조각을 ${t.name}에 보낸다 — ${t.sub} · 삯 ${fee}G` };
    }
    return { ok: false, cost: 0, msg: '이제는 쓰지 않는 편지요.' };
  }

  function send(type, params) {
    const p = params || {};
    if (type === 'report') return sendReport(p);
    if (type === 'notify') return sendNotify(p);
    if (type === 'star') return sendStar(p);
    if (type === 'expand') return sendExpand();
    if (type === 'rumor') return sendRumor(p);
    if (type === 'loan') return sendLoan(p);
    if (type === 'loan_repay') return repayLoan();
    if (type === 'guard_hire' || type === 'guard_fire') {
      if (!crowReady()) return no(NO_CROW);
      const r = type === 'guard_hire' ? WS.sys.Shop.hire() : WS.sys.Shop.fire();
      if (r.ok) record(type, { name: WS.data.shop.guard.hire.to, icon: WS.data.shop.guard.hire.icon }, type === 'guard_hire' ? WS.data.shop.guard.hire.title : WS.data.shop.guard.fire.title, r.msg, 0);
      return r.ok ? ok(r.msg) : no(r.msg);
    }
    if (type === 'repay') return repay(p.loan); // 예전 저장본의 빚 (편지 쓰기 목록엔 없다 — 독촉장의 버튼으로)
    return no('이제는 쓰지 않는 편지요.');
  }

  function act(letterId, actionId) {
    const x = findLetter(letterId);
    if (!x) return no('편지를 찾을 수 없소.');
    x.read = true;
    if (x.resolved) return no('이미 답한 편지요.');
    const a = actionsFor(x).find(z => z.id === actionId);
    if (!a) return no('그 편지로는 할 수 없는 일이오.');
    if (a.disabled) return no(a.why || '지금은 할 수 없소.');
    if (x.kind === 'offer') {
      if (actionId === 'accept') return acceptOffer(x);
      resolve(x, '거절함');
      return ok('정중히 사양하는 답장을 보냈다.');
    }
    if (x.kind === 'loan_due' && actionId === 'repay') return repay(x.ref.loan);
    if (x.kind === 'insure') {
      const r = actionId === 'insure' ? WS.sys.Calendar.insure() : WS.sys.Calendar.forgoInsurance();
      if (r.ok) resolve(x, actionId === 'insure' ? '보험을 듦' : '감수함');
      return r.ok ? ok(r.msg) : no(r.msg);
    }
    return no('그 편지로는 할 수 없는 일이오.');
  }

  // (예전 저장본) 빚 현황
  function debts() {
    return activeLoans().map(l => ({ id: l.id, principal: l.principal, owed: owedOf(l), dueDay: l.dueDay, status: l.status }));
  }

  // ───────── 밤사이 (DayManager.startDay 가 부른다: 세계 변화 뒤, 대기열 만들기 전) ─────────
  function nightly() {
    const st = S();
    const l = L();
    settleReturners();
    rememberYesterday();
    // 까마귀가 오기 전(1~12일째)에는 편지가 오가지 않는다. 제안은 쌓아 두지 않고 그냥 건너뛴다
    if (!crowReady()) return st.day;
    expireOffers();
    closeStaleInsurance();
    deliverOrders();
    deliverExpand();
    deliverRumorReplies();
    processCrowLoan();
    resolveReports();
    processLoans();
    expireWishes();
    const firstCrowDay = !l.welcomed;
    welcome();
    deliverPosters();
    // 까마귀가 처음 온 아침은 안내장과 인상서만 — 제안 편지는 이튿날부터
    if (firstCrowDay) return st.day;
    deliverStory();
    maybeSupplierOffer();
    return st.day;
  }

  // 이야기 편지 — letters.js 의 story: [{ id, from, when, subject, body }] (js/data/stories.js 가 채운다).
  // 조건이 맞는 첫 아침에 한 번만 온다 (까마귀가 자리 잡은 이튿날부터). 답할 거리가 없는 소식 편지
  function deliverStory() {
    const l = L();
    l.storySent = l.storySent || {};
    for (const s of D().story || []) {
      if (l.storySent[s.id] !== undefined || !WS.sys.Conditions.check(s.when)) continue;
      l.storySent[s.id] = S().day;
      receive(s.from, 'notice', txt(s.subject, {}), txt(s.body, {}));
    }
  }

  // 까마귀가 처음 자리를 잡으면 둥지지기의 안내장 한 통 (한 번만)
  function welcome() {
    const l = L();
    if (l.welcomed) return;
    l.welcomed = true;
    const W = D().welcome;
    receive(W.from, 'notice', W.subject, W.body);
  }

  // 영업 중 둥지지기가 까마귀를 들여 줬다 (Progress.arrive) — 안내장(과 아직 못 받은 인상서)이 바로 편지함에 꽂힌다
  function crowArrived() {
    if (!crowReady()) return;
    welcome();
    deliverPosters();
  }

  // ───────── 인상서 (경비대 수배 전단 — 서류 서랍) ─────────
  // 경비대 전령이 손으로 건넨 인상서 (Progress.arrive — progress.js tutorialCustomers[].posters).
  // 까마귀가 없어도 서류함(drawer)에 바로 꽂힌다. when 은 따지지 않는다. 같은 인상서는 한 번만 (까마귀 편으로도 다시 안 온다)
  function handPosters(ids) {
    const l = L();
    l.postersSent = l.postersSent || {};
    l.drawer = l.drawer || [];
    for (const id of [].concat(ids || [])) {
      const w = (D().wanted || []).find(x => x.id === id);
      if (!w || l.postersSent[w.id] !== undefined) continue;
      l.postersSent[w.id] = S().day;
      l.drawer.push({ id: w.id, day: S().day, poster: { id: w.id, ...w.poster } });
    }
  }

  // letters.js 의 wanted: [{ id, from, when, subject, body, poster }] — 조건이 맞으면 한 번만 까마귀 편으로 온다
  function deliverPosters() {
    const l = L();
    l.postersSent = l.postersSent || {};
    for (const w of D().wanted || []) {
      if (l.postersSent[w.id] !== undefined || !WS.sys.Conditions.check(w.when)) continue;
      l.postersSent[w.id] = S().day;
      receive(w.from, 'wanted', w.subject, w.body, { ref: { poster: { id: w.id, ...w.poster } } });
    }
  }

  // 화재 · 홍수가 난 아침에 오는 보험 편지 (Calendar.strike). 다음 날까지 답하지 않으면 감수한 것으로 친다
  function insuranceOffer(d) {
    if (!crowReady()) return null;
    const ins = WS.data.shop.calendar.insurer;
    const c = WS.data.shop.calendar.disaster;
    const parts = Object.entries(d.lost).map(([id, q]) => `${item(id).name} ${q}개`).join(', ');
    return receive({ name: ins.name, icon: ins.icon }, 'insure', `[${d.name}] 재난 보험 안내`,
      `간밤 ${d.name}로 창고에서 ${parts}(시가 약 ${d.value}G)가 상했다는 소식을 들었소.
삯 ${d.fee}G를 내면 잃은 물건의 ${Math.round(c.restore * 100)}%를 되찾아 드리오. 내일까지 답하시오.`);
  }
  // 하루 지난 보험 편지는 닫는다 (nightly)
  function closeStaleInsurance() {
    L().inbox.forEach(x => { if (x.kind === 'insure' && !x.resolved && !WS.sys.Calendar.insurable()) resolve(x, '기한이 지남'); });
  }

  return {
    insuranceOffer, initState, inbox, outbox, unreadCount, markRead, act, templates, quote, send,
    promiseReturn, canPromise, checkArrival, angerGift, takeReturners, nightly, debts, crowLoan, loanOwed, loanLeftText, owedOf, posters, crowReady, crowArrived, handPosters,
    addWish, wishes,
  };
})();

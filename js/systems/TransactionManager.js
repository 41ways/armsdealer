// 거래 처리: 판매 / 부분 판매 / 흥정 / 거절 / 손님에게서 매입 / 교환 / 대화 선택지
// 세계 영향은 손님의 "실제 소속"(trueFaction) 기준으로 적용된다. 플레이어는 이를 바로 알 수 없다.
WS.sys.Trade = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;
  // 스토리 손님이면 customers.js 의 틀, 랜덤 손님이면 factions.js 의 archetype (onSell 등 효과를 가질 수 있다)
  const tpl = c => WS.sys.Customers.tplById(c.tpl) || WS.sys.Customers.archById(c.tpl) || {};
  const faction = id => WS.data.factions[id];

  const DEFAULT_LINES = {
    sold: ['좋은 거래였소.', '고맙네.', '또 오지.'],
    refused: ['…그렇군.', '다른 가게를 찾아보지.', '쳇.'],
    partial: '있는 만큼이라도 사 가지.',
    haggleOk: '…좋아, {offer}G. 대신 물건은 확실하겠지?',
    haggleCounter: '{offer}G. 이 이상은 안 되네.',
    haggleLeave: '장난하나? 됐네, 다른 데 가지.',
    bought: '거래 성사로군.',
    declined: '아쉽군.',
    traded: ['거래 성립이오. 후회는 없을 거요.', '공정한 교환이었소.'],
  };
  const line = (c, key, ctx) => {
    const l = c.lines[key] ?? DEFAULT_LINES[key];
    const dflt = c.trade ? { offer: c.trade.gold } : { offer: c.request && (c.request.offer ?? c.request.price) };
    return U.fill(Array.isArray(l) ? U.pick(l) : l, ctx || dflt);
  };

  function record(c, action, extra) {
    const st = S();
    st.ledger.push({
      day: st.day, time: st.time, name: c.name, tpl: c.tpl,
      faction: c.faction, trueFaction: c.trueFaction, action, ...extra,
    });
    if (!c.random) st.choices[c.tpl] = action;
  }

  // 장부의 얼룩 — 가짜 인장을 내민 손님이나 위장·수배된 자(틀의 stain)와 거래하면 남는다.
  // 결말(완벽한 장부)만 이 흔적을 본다. 화면에는 어디에도 보이지 않는다.
  function stain(c) {
    if (!WS.sys.Customers.isStain(c)) return;
    WS.sys.Effects.apply({ flags: ['illegal_sale'], vars: { illegal_sale_count: 1 } });
  }

  // 뒷거래: 정체를 감춘 손님과 거래하면 암시장 활성도가 오른다 (config.smuggling.offBooks — 한 거래에 한 번).
  // 위장(겉 소속 ≠ 실제 소속) · 틀의 suspicious/shady/stain · 가짜 인장 · 소속을 대지 않음(나그네 같은 openFactions 는 빼고) · 두건(looks)
  function offBooks(c) {
    const O = WS.data.config.smuggling && WS.data.config.smuggling.offBooks;
    if (!O) return;
    const t = tpl(c), a = WS.sys.Customers.affil(c) || {};
    const hidden = c.faction !== c.trueFaction || !!t.suspicious || !!t.shady || !!t.stain || a.seal === 'fake'
      || (!a.claim && !O.openFactions.includes(c.trueFaction)) || O.looks.includes(t.look);
    if (hidden) WS.sys.World.add('blackmarket', U.range(O.amount));
  }

  function finish(c, result, reply) {
    c.status = 'done';
    c.result = result;
    if (reply) c.dialog.push({ who: 'c', text: reply });
  }

  function applyWorld(c, itemId, qty, deal, skipDeal) {
    const f = faction(c.trueFaction);
    const it = WS.sys.Items.get(itemId);
    if (it && qty > 0) {
      const per = (f.perUnit && f.perUnit[it.category]) || {};
      for (const [k, v] of Object.entries(per)) WS.sys.World.add(k, v * qty * (it.impact ?? 1));
    }
    // 교환은 따로 정의가 없으면 판매와 같은 관계 변화를 쓴다 (한 거래에 한 번만)
    const pd = f.perDeal || {};
    if (!skipDeal) WS.sys.Effects.apply({ vars: deal === 'trade' ? pd.trade || pd.sell : pd[deal] });
    // 궁정 다툼 중 귀족 · 용병 랜덤 손님에게 팔면 공주 · 왕자 쪽 힘이 조금 (config.courtGossip.sellVars, 한 거래에 한 번)
    const cg = WS.data.config.courtGossip;
    if (!skipDeal && deal === 'sell' && c.random && cg && cg.sellVars[c.trueFaction] && !(cg.except || []).includes(c.tpl) && WS.sys.Conditions.check(cg.when)) {
      WS.sys.Effects.apply({ vars: cg.sellVars[c.trueFaction] });
    }
    const st = S();
    if (deal === 'sell' && c.trueFaction === 'goblin' && st.trend && st.trend.item === itemId) {
      WS.sys.World.add('goblin_unity', 0.4 * qty);
    }
  }

  // give: 플레이어가 테이블에 실제로 올린 개수 (없으면 예전 방식 — 전량 또는 가진 만큼)
  function sell(c, partial, give) {
    const st = S();
    const r = c.request;
    const have = WS.sys.Inventory.count(r.item);
    const qty = give != null ? Math.min(give, r.qty) : partial ? Math.min(have, r.qty) : r.qty;
    if (qty <= 0 || have < qty) return;
    partial = qty < r.qty;
    const price = partial ? Math.round((r.offer * qty) / r.qty) : r.offer;
    WS.sys.Inventory.remove(r.item, qty);
    const paid = settle(c, price);
    st.gold += paid;
    st.today.income += paid;
    st.today.sold += qty;
    applyWorld(c, r.item, qty, 'sell');
    WS.sys.Effects.apply(tpl(c).onSell);
    stain(c);
    offBooks(c);
    record(c, 'sell', { item: r.item, qty, price });
    c.dialog.push({ who: 'p', text: partial ? `(${qty}개만 건넨다)` : '(물건을 건넨다)' });
    finish(c, 'sold', partial && qty < r.qty ? line(c, 'partial') : line(c, 'sold'));
  }

  // 테이블에 여러 가지를 올려 한 번에 파는 경우 (예: 무기 달라는 손님에게 칼 2 + 화살 1).
  // lines = [{ item, qty, price, stash? }] — 손님이 받아 가는 것만. pushedBack = 손님이 밀어낸 물건 이름들
  // stash: true 인 줄은 장물함(WS.sys.Stash)에서 나간다 — 같은 물건의 일반 재고 줄과 섞여도 된다. 장물이 섞이면 적발을 굴린다
  function sellLines(c, lines, pushedBack) {
    const st = S();
    const X = WS.sys.Stash;
    const have = l => (l.stash ? (X ? X.count(l.item) : 0) : WS.sys.Inventory.count(l.item));
    // gift: true 인 줄은 궁핍한 손님에게 얹어 주는 덤 — 값을 받지 않는다 (아래 gift)
    const giftLines = lines.filter(l => l.gift);
    lines = lines.filter(l => !l.gift && l.qty > 0 && have(l) >= l.qty);
    if (!lines.length) return;
    let total = 0, totalQty = 0;
    lines.forEach((l, i) => {
      if (l.stash) X.remove(l.item, l.qty);
      else WS.sys.Inventory.remove(l.item, l.qty);
      applyWorld(c, l.item, l.qty, 'sell', i > 0);
      record(c, 'sell', { item: l.item, qty: l.qty, price: l.price, ...(l.stash ? { stolen: true } : {}) });
      total += l.price;
      totalQty += l.qty;
    });
    // 수비 물자처럼 "얼마나 넘겼나"를 세는 손님 (supplyVar): 넘긴 물건의 시세 합을 더한다
    const sv = tpl(c).supplyVar;
    if (sv) WS.sys.World.add(sv, lines.reduce((s, l) => s + WS.sys.Market.priceBase(l.item) * l.qty, 0)); // 소문 시세는 수비 물자로 치지 않는다
    const paid = settle(c, total);
    st.gold += paid;
    st.today.income += paid;
    st.today.sold += totalQty;
    WS.sys.Effects.apply(tpl(c).onSell);
    stain(c);
    offBooks(c);
    const want = c.request.qty;
    if (pushedBack && pushedBack.length) c.dialog.push({ who: 'c', text: `${pushedBack.join(', ')}은(는) 필요 없소.` });
    c.dialog.push({ who: 'p', text: totalQty < want ? `(${totalQty}개만 건넨다)` : '(물건을 건넨다)' });
    finish(c, 'sold', totalQty < want ? line(c, 'partial') : line(c, 'sold'));
    // 장물: 이 거래에 넘긴 장물 수만 센다 (걸리면 손님이 한마디 더 한다 — Stash.bust)
    const stolen = lines.filter(l => l.stash).reduce((s, l) => s + l.qty, 0);
    if (stolen && X) c.stashBusted = X.sold(c, stolen);
    if (giftLines.length) gift(c, giftLines);
  }

  // 지불 방식 (faction/틀의 payment)
  //   credit:   { now: 0.5, inDays: [2, 4], defaultWhen: 조건, defaultText } → 나머지는 외상. 갚는 날 조건이 맞으면 떼인다
  //   leafGold: { chance: 0.3, frac: [0.3, 0.6] } → 요정 금화. 다음 날 아침 일부가 낙엽이 된다 (미리 알려 주지 않는다)
  function settle(c, price) {
    const st = S();
    const pay = c.payment;
    if (!pay) return price;
    st.receivables = st.receivables || [];
    let now = price;
    if (pay.credit) {
      now = Math.round(price * pay.credit.now);
      st.receivables.push({
        day: st.day + U.range(pay.credit.inDays), amount: price - now, name: c.name, faction: c.trueFaction,
        defaultWhen: pay.credit.defaultWhen || null, defaultText: pay.credit.defaultText || null,
      });
    }
    if (pay.leafGold && Math.random() < pay.leafGold.chance) {
      const lost = Math.round(price * U.rand(...pay.leafGold.frac));
      st.receivables.push({ day: st.day + 1, amount: -lost, name: c.name, faction: c.trueFaction, leaf: true });
    }
    return now;
  }

  function refuse(c) {
    applyWorld(c, c.request ? c.request.item : null, 0, 'refuse');
    WS.sys.Effects.apply(tpl(c).onRefuse);
    S().today.refused++;
    record(c, 'refuse', c.request ? { item: c.request.item, qty: c.request.qty, price: 0 } : {});
    c.dialog.push({ who: 'p', text: { sell: '사지 않겠소.', trade: '바꾸지 않겠소.' }[c.kind] || '팔 수 없소.' });
    const grumble = outOfStockGrumble(c);
    finish(c, 'refused', grumble || line(c, c.kind === 'sell' ? 'declined' : 'refused'));
  }

  // 품절 투덜거림 (config.outOfStockGrumble): 무기를 달라는 손님을, 달라는 무기(분류로 달라면 그 분류의 무엇이든)가
  // 창고에 하나도 없어서 돌려보냈을 때 — 가끔 한 줄 투덜거리고 평판이 조금 깎인다. 대사를 돌려준다 (안 투덜거리면 null)
  function outOfStockGrumble(c) {
    const G = WS.data.config.outOfStockGrumble;
    const r = c.request;
    if (!G || c.kind !== 'buy' || !r || c.tutorial) return null;
    const cat = r.category || (r.item && WS.sys.Items.get(r.item).category);
    if (cat !== G.category) return null;
    const inStock = r.category
      ? Object.keys(WS.data.items).some(id => !WS.data.items[id].aliasOf && WS.data.items[id].newCategory === r.category && WS.sys.Inventory.count(id) > 0)
      : WS.sys.Inventory.count(r.item) > 0;
    if (inStock || Math.random() >= G.chance) return null;
    WS.sys.Effects.apply(G.effects);
    return U.pick(G.lines);
  }

  // 흥정 기능은 제거되었다 (Papers, Please 스타일 두 책상 개편 — 사용자 결정).
  // factions.js 의 haggle: {tolerance, patience} 필드는 더는 쓰이지 않지만, 데이터 전체를
  // 건드리는 대규모 편집을 피하기 위해 이번 단계에서는 그대로 남겨 둔다 (죽은 설정값).

  // 손님이 물건을 파는 경우
  function buyFrom(c) {
    const st = S();
    const r = c.request;
    if (st.gold < r.price || !WS.sys.Inventory.canAdd(r.item, r.qty)) return;
    st.gold -= r.price;
    st.today.spend += r.price;
    WS.sys.Inventory.add(r.item, r.qty);
    WS.sys.Inventory.recordCost(r.item, r.qty, r.price / r.qty);
    applyWorld(c, null, 0, 'buy'); // 사들이는 것도 세계에 흔적을 남긴다 (장물 → 암시장 등)
    WS.sys.Effects.apply(tpl(c).onBuy);
    stain(c);
    offBooks(c);
    record(c, 'buy', { item: r.item, qty: r.qty, price: -r.price });
    c.dialog.push({ who: 'p', text: '사겠소.' });
    finish(c, 'bought', line(c, 'bought'));
  }

  // ───────── 교환 ─────────
  // c.trade = { give: [{item, qty}] 손님이 내놓는 것, want: [{item, qty}] 내 물건, gold: 손님이 얹는 웃돈(음수면 내가 냄) }
  const sideValue = list => list.reduce((s, x) => s + WS.sys.Market.price(x.item) * x.qty, 0);

  // 교환 가능 여부: 줄 물건이 다 있는지, 받은 뒤 가게에 들어가는지, 웃돈을 낼 수 있는지
  function tradeStatus(c) {
    const t = c.trade;
    const lacking = t.want.filter(w => WS.sys.Inventory.count(w.item) < w.qty);
    const inv = { ...S().inventory };
    t.want.forEach(w => (inv[w.item] = (inv[w.item] || 0) - w.qty));
    t.give.forEach(g => (inv[g.item] = (inv[g.item] || 0) + g.qty));
    // 뒷문 배달로 이미 칸이 넘쳤어도, 교환 뒤 칸이 늘지 않으면 된다
    const after = WS.sys.Inventory.usedSlots(inv);
    const room = after <= WS.sys.Inventory.capacity() || after <= WS.sys.Inventory.usedSlots();
    const afford = S().gold + t.gold >= 0;
    return { ok: !lacking.length && room && afford, lacking, room, afford };
  }

  function exchange(c) {
    const st = S();
    const t = c.trade;
    if (!tradeStatus(c).ok) return;
    const gave = {}, got = {};
    t.want.forEach(w => { WS.sys.Inventory.remove(w.item, w.qty); gave[w.item] = (gave[w.item] || 0) + w.qty; });
    t.give.forEach(g => { WS.sys.Inventory.add(g.item, g.qty, true); got[g.item] = (got[g.item] || 0) + g.qty; });
    st.gold += t.gold;
    if (t.gold > 0) st.today.income += t.gold;
    else st.today.spend -= t.gold;
    st.today.sold += t.want.reduce((s, w) => s + w.qty, 0);
    // 넘겨준 물건은 판매와 똑같이 세계에 영향을 준다 (거래 1건 몫의 관계 변화는 한 번만)
    t.want.forEach((w, i) => applyWorld(c, w.item, w.qty, i === 0 ? 'trade' : null));
    WS.sys.Effects.apply(tpl(c).onTrade);
    stain(c);
    offBooks(c);
    record(c, 'trade', { gave, got, price: t.gold });
    c.dialog.push({ who: 'p', text: '(물건을 맞바꾼다)' });
    finish(c, 'traded', line(c, 'traded'));
  }

  // 대화 선택지 / 추가 선택지(extraChoices)
  // extraChoices 는 정보만 캐는 선택지라 손님이 그대로 남는다. 단 ends: true 면 손님이 그 말을 듣고 떠난다
  // ("들어오면 기별하겠소"(효과 notify) · "생각해 보겠소"(stall — 까마귀 밀고 포상금↑) — Letters.js)
  function choose(c, choiceId) {
    const t = tpl(c);
    const all = (t.choices || []).concat(t.extraChoices || []);
    const ch = all.find(x => x.id === choiceId);
    if (!ch) return;
    const say = s => (c.fillCtx && s ? WS.util.fill(s, c.fillCtx) : s);
    c.dialog.push({ who: 'p', text: say(ch.label) });
    WS.sys.Effects.apply(ch.effects, c);
    c.usedChoices.push(ch.id);
    if (ch.grate) collectGrate(c, ch.grate);
    if ((t.extraChoices || []).includes(ch) && !ch.ends) {
      // 정보만 캐는 선택지 — 손님은 그대로 남는다
      c.dialog.push({ who: 'c', text: say(ch.reply) });
      return;
    }
    record(c, ch.id, {});
    finish(c, 'talked', say(ch.reply));
  }

  function availableChoices(c) {
    const t = tpl(c);
    const list = c.kind === 'talk' ? t.choices || [] : t.extraChoices || [];
    // 기별 받고 다시 온 손님·약속하고 다시 온 손님에게는 떠나보내는 선택지(ends)를 다시 내밀지 않는다
    return list.filter(ch => !(ch.once && c.usedChoices.includes(ch.id)) && !(c.returning && ch.ends) && !(ch.needs === 'inspect' && !c.inspected) && WS.sys.Conditions.check(ch.when))
      .map(ch => (c.fillCtx ? { ...ch, label: WS.util.fill(ch.label, c.fillCtx) } : ch)); // {top} 자리표 (천칭단)
  }

  // ───────── 궁핍한 손님: 덤 · 값 면제 (config.poor) ─────────
  // c.poor = { full: 원래 값, short: 모자란 금액, style: 'yo'|'hao', done } — CustomerManager.poorify / 틀의 poor 가 붙인다.
  // 호의를 보이면(덤을 얹거나 값을 받지 않으면) 소속 세력 우호도 + 평판이 오르고, 며칠 뒤 감사 손님이 보답하러 온다 (scheduleGrate).
  const PC = () => WS.data.config.poor;
  const isPoor = c => !!(c && c.poor && !c.poor.done);
  const giftCap = c => Math.max(Math.round(c.poor.full * PC().giftCap), PC().giftMin || 0);
  const pool = (obj, key, c) => U.pick(obj[key][c.poor.style] || obj[key].hao);

  // 테이블에 올린 요구 밖의 물건(lines: [{ item, qty, stash? }]) 가운데 덤으로 받아 줄 것(gifts)과 밀어낼 것(rest).
  // 덤은 시세 합이 giftCap 안에서만 (부분 수량도 가능), 장물은 덤이 못 된다. 순수 계산 — UI 가 매번 부른다
  function giftSplit(c, lines) {
    if (!isPoor(c)) return { gifts: [], rest: lines.slice() };
    let room = giftCap(c);
    const gifts = [], rest = [];
    lines.forEach(l => {
      if (l.stash) return rest.push(l);
      const unit = WS.sys.Market.price(l.item);
      const n = Math.min(l.qty, Math.floor(room / unit));
      if (n > 0) { gifts.push({ ...l, qty: n }); room -= unit * n; }
      if (n < l.qty) rest.push({ ...l, qty: l.qty - n });
    });
    return { gifts, rest };
  }

  // 덤을 실제로 내준다 — { value: 시세 합, loss: 원가 합 }. 장부에는 값 0 의 'gift' 로 남긴다 (st.choices 는 건드리지 않는다)
  function takeGifts(c, gifts) {
    const st = S();
    let value = 0, loss = 0;
    gifts.forEach(l => {
      const n = Math.min(l.qty, WS.sys.Inventory.count(l.item));
      if (n <= 0) return;
      value += WS.sys.Market.price(l.item) * n;
      loss += WS.sys.Inventory.costBasis(l.item) * n;
      WS.sys.Inventory.remove(l.item, n);
      st.ledger.push({ day: st.day, time: st.time, name: c.name, tpl: c.tpl, faction: c.faction, trueFaction: c.trueFaction, action: 'gift', item: l.item, qty: n, price: 0 });
    });
    return { value, loss };
  }

  // 호의의 결과: 우호도(소속 세력) · 평판 · 감사 대사 · 감사 손님 예약 · 소문. o = { value, loss, forgiven }
  function favor(c, o) {
    const P = PC(), st = S(), F = P.favor;
    const rel = o.forgiven ? F.forgive + (o.value > 0 ? 1 : 0) : o.value >= c.poor.full * F.bigRatio ? F.giftBig : F.gift;
    const fac = WS.data.factions[c.trueFaction];
    const relVar = fac && fac.visit && fac.visit.var;
    const vars = { reputation: F.rep };
    if (relVar && WS.data.worldVars[relVar]) vars[relVar] = rel;
    WS.sys.Effects.apply({ vars });
    c.poor.done = true;
    c.poor.result = { value: Math.round(o.value), loss: Math.round(o.loss), rel, forgiven: !!o.forgiven };
    // 감사 대사 — 이미 끝난 거래의 마지막 대사를 바꾼다
    const say = pool(P.thanks, o.forgiven ? 'forgive' : 'gift', c);
    const last = c.dialog[c.dialog.length - 1];
    if (c.status === 'done' && last && last.who === 'c') last.text = say; else c.dialog.push({ who: 'c', text: say });
    scheduleGrate(c, o.loss);
    // 가게 얘기를 퍼뜨린다: 다음 날 마을 손님 한 명 또는 신문 한 줄
    if (Math.random() < P.spread.chance) {
      if (Math.random() < 0.5) {
        if (!st.spawnQueue.some(s => s.customer === 'word_villager')) st.spawnQueue.push({ customer: 'word_villager', day: st.day + 1 });
      } else WS.sys.Effects.apply({ news: [U.pick(P.grate.rumors)] });
    }
    return c.poor.result;
  }

  // 덤: 요구한 물건을 판 뒤(sellLines 가 부른다) 얹어 주는 물건 (lines: [{ item, qty }]). 한도를 넘는 것은 내주지 않는다
  function gift(c, lines) {
    if (!isPoor(c)) return null;
    const { gifts } = giftSplit(c, lines.map(l => ({ item: l.item, qty: l.qty, stash: l.stash })));
    const o = takeGifts(c, gifts);
    return o.value > 0 ? favor(c, o) : null;
  }

  // 값 면제: 요구한 물건(lines: [{ item, qty }])을 값 없이 그냥 준다 (+ 덤 giftLines). 원가만큼 손해, 우호도는 가장 크게 오른다
  function forgive(c, lines, giftLines) {
    if (!isPoor(c) || c.kind !== 'buy' || !c.request) return null;
    const st = S();
    lines = lines.filter(l => l.qty > 0 && WS.sys.Inventory.count(l.item) >= l.qty && l.item === c.request.item);
    if (!lines.length) return null;
    let qty = 0, loss = 0;
    lines.forEach((l, i) => {
      qty += l.qty;
      loss += WS.sys.Inventory.costBasis(l.item) * l.qty;
      WS.sys.Inventory.remove(l.item, l.qty);
      applyWorld(c, l.item, l.qty, 'sell', i > 0);
      st.ledger.push({ day: st.day, time: st.time, name: c.name, tpl: c.tpl, faction: c.faction, trueFaction: c.trueFaction, action: 'forgive', item: l.item, qty: l.qty, price: 0 });
    });
    st.today.sold += qty;
    WS.sys.Effects.apply(tpl(c).onSell);
    const g = takeGifts(c, giftSplit(c, (giftLines || []).map(l => ({ item: l.item, qty: l.qty, stash: l.stash }))).gifts);
    c.dialog.push({ who: 'p', text: '(값은 됐다며 물건을 건넨다)' });
    c.status = 'done';
    c.result = 'sold';
    return favor(c, { value: g.value, loss: loss + g.loss, forgiven: true });
  }

  // 감사 손님 예약: 덤·면제 손해(loss)의 rewardMult 배 안에서 보답 (금화 / 흔한 재료 / 소문 + 약간의 금화). 한 틀에 한 번
  function scheduleGrate(c, loss) {
    const st = S(), G = PC().grate;
    const key = 'grate_' + c.tpl;
    if (st.flags[key] !== undefined) return null;
    st.flags[key] = st.day;
    loss = Math.max(1, loss);
    const target = Math.max(2, loss * U.rand(...G.rewardMult));
    const C = WS.sys.Customers;
    const look = c.look || (C.tplById(c.tpl) || C.archById(c.tpl) || {}).look || (WS.data.lookByRace || {})[c.race];
    const g = { name: c.name, race: c.race, job: c.job, portrait: c.portrait, look, faction: c.trueFaction, style: c.poor.style, loss: Math.round(loss) };
    let kind = U.weightedPick(Object.entries(G.weights), e => e[1])[0];
    if (kind === 'item') {
      const ids = G.items.filter(id => WS.sys.Items.get(id) && (!WS.sys.Progress || WS.sys.Progress.canReceive(id)));
      const id = ids.length ? U.pick(ids) : null;
      const unit = id ? WS.sys.Market.price(id) : 0;
      const qty = U.clamp(Math.round(target / Math.max(1, unit)), 1, 2);
      if (id && unit * qty >= loss * G.rewardMult[0] && unit * qty <= loss * G.rewardMult[1]) Object.assign(g, { item: id, qty });
      else kind = 'gold';
    }
    if (kind === 'news') Object.assign(g, { gold: Math.max(1, Math.round(target * 0.5)), news: U.pick(G.rumors) });
    if (kind === 'gold') g.gold = Math.max(1, Math.round(target));
    g.kind = kind;
    st.spawnQueue.push({ customer: 'grateful_visit', day: st.day + U.range(G.days), grate: g });
    return g;
  }

  // 감사 손님의 보답을 받는다 (choices[].grate: 'accept') / 마음만 받는다 ('decline' — 우호도만 조금)
  function collectGrate(c, how) {
    const g = c.grate, st = S(), G = PC().grate;
    if (!g || g.done) return;
    g.done = true;
    if (how === 'accept') {
      if (g.gold) { st.gold += g.gold; st.today.income += g.gold; }
      if (g.item) WS.sys.Inventory.add(g.item, g.qty, true);
      if (g.news) WS.sys.Effects.apply({ news: [g.news] });
    } else {
      const fac = WS.data.factions[c.trueFaction], v = fac && fac.visit && fac.visit.var;
      if (v && WS.data.worldVars[v]) WS.sys.Effects.apply({ vars: { [v]: G.declineRel } });
    }
  }

  // ───────── 카테고리형 요청 가격 계산 (Phase 1) ─────────
  // c.request 가 { category, preferSubtype, preferPay, otherPay, refuseSubtypes?, qty } 형태(신규 want
  // 포맷 — CustomerManager 참고)일 때, 플레이어가 실제로 내미는 아이템(itemId)에 대해 값을 계산한다.
  // 어떤 물건을 내밀지는 phase 2의 창고 UI(드래그&드롭 픽커)가 고르므로, 여기서는 "그 아이템을
  // 내밀면 얼마에, 받아 줄지"만 계산한다.
  //   - preferSubtype 과 일치하면 preferPay 배율 (기본 웃돈)
  //   - 그 외 소분류는 otherPay 배율 (기본 할인)
  //   - 거절 규칙: want 에 명시된 refuseSubtypes 목록에 있으면 무조건 거절.
  //     명시가 없으면 otherPay < 0.5(반값 미만)인 경우를 "그 물건은 안 산다"는 뜻으로 보고 거절한다.
  function offerForCategoryItem(c, itemId) {
    const r = c.request;
    if (!r || !r.category) return null; // 구형(콘크리트 아이템) 요청에는 쓰지 않는다
    const it = WS.sys.Items.get(itemId);
    if (!it || it.newCategory !== r.category) return { price: 0, accepted: false };
    const preferred = !!r.preferSubtype && it.subtype === r.preferSubtype;
    const payMult = preferred ? (r.preferPay ?? 1) : (r.otherPay ?? 1);
    const refuseList = r.refuseSubtypes || [];
    const refused = !preferred && (refuseList.includes(it.subtype) || payMult < 0.5);
    if (refused) return { price: 0, accepted: false, preferred };
    const price = Math.max(1, Math.round(WS.sys.Market.price(itemId) * r.qty * payMult));
    return { price, accepted: true, preferred };
  }

  return { sell, sellLines, refuse, buyFrom, exchange, tradeStatus, sideValue, choose, availableChoices, offerForCategoryItem,
    isPoor, giftCap, giftSplit, gift, forgive, scheduleGrate, collectGrate };
})();

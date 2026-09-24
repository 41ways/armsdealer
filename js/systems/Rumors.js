// 소문의 진위 (정보전). 데이터는 js/data/rumors.js — 규칙과 사연은 거기 머리말.
// 상태: WS.Game.state.rumors = { list: [entry…], seq }
//   entry = { id, day(신문에 실린 날), resolveDay(정정·확인 기사가 나올 날), done, doneDay, known, inquiry }
//     known:   까마귀 정보상이 알려 준 답 — 'true' | 'false' | 'unsure' (없으면 null)
//     inquiry: { day } — 정보상에게 보낸 의뢰가 답을 기다리는 중
//   진위(truth)는 상태에 저장하지 않는다 — 데이터(rumors.js)에서 읽는다 (저장 왕복은 직렬화 필드만).
// 허위 소문은 세계 변수·플래그를 건드리지 않는다. 열려 있는 동안 시세(Market.mult)만 잠깐 흔든다.
WS.sys.Rumors = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;
  const D = () => WS.data.rumorNews;
  const def = id => D().list.find(r => r.id === id);
  const canon = id => WS.sys.Items.canon(id);

  function R() {
    const st = S();
    if (!st.rumors) st.rumors = { list: [], seq: 0 };
    return st.rumors;
  }
  const entries = () => R().list;
  const open = e => !e.done;

  // ───────── 새벽: 정정·확인 기사 + 새 소문 한 건 (NewsManager.compose 가 부른다) ─────────
  // 돌려주는 값: { fixes: [기사…], fresh: 기사 | null } — 신문에 어떻게 싣는지는 NewsManager 몫
  // baseLen: 신문에 이미 실린 기사 수 — 새 소문은 정정·확인 기사까지 합쳐 4건이 안 될 때만 (안 실리면 등록하지도 않는다)
  function dawn(baseLen) {
    const st = S();
    const out = { fixes: [], fresh: null };
    for (const e of entries()) {
      if (!open(e) || st.day < e.resolveDay) continue;
      const d = def(e.id);
      e.done = true;
      e.doneDay = st.day;
      if (d) out.fixes.push({ cat: d.truth ? '확인' : '정정', text: d.after, fix: e.id });
    }
    const d = (baseLen || 0) + out.fixes.length < 4 ? pickNew() : null;
    if (d) {
      entries().push({ id: d.id, day: st.day, resolveDay: st.day + U.randInt(d.days[0], d.days[1]), done: false, known: null, inquiry: null });
      R().seq++;
      out.fresh = { cat: d.cat || '소문', text: d.text, rumor: d.id };
    }
    return out;
  }

  function pickNew() {
    const st = S(), C = D().config;
    if (st.day < C.from || st.day > WS.data.config.campaignDays - C.lastBefore) return null;
    if (entries().filter(open).length >= C.maxOpen) return null;
    if (Math.random() >= C.chance) return null;
    const used = new Set(entries().map(e => e.id));
    const pool = D().list.filter(r => !used.has(r.id) && WS.sys.Conditions.check(r.when));
    return pool.length ? U.weightedPick(pool, r => r.weight || 1) : null;
  }

  // ───────── 시세: 열려 있는 소문이 물건값을 흔든다 (Market.mult 가 곱한다) ─────────
  function marketMult(id) {
    const list = entries();
    if (!list.length) return 1;
    const st = S(), cid = canon(id);
    let m = 1;
    for (const e of list) {
      if (!open(e) || st.day < e.day) continue;
      const mk = (def(e.id) || {}).market;
      if (!mk) continue;
      const hit = (mk.items && mk.items.some(x => canon(x) === cid)) || (mk.tags && mk.tags.some(t => WS.sys.Items.hasTag(cid, t)));
      if (hit) m *= mk.mult;
    }
    return m;
  }

  // ───────── 진위 알아보기 ─────────
  // 손님의 귀띔: 그 세력 랜덤 손님이 가끔 인사말 끝에 한마디 (진실 쪽으로 기운다). CustomerManager.buildQueue 가 부른다
  function tip(c, force) {
    if (!c || !c.random || c.muttered || c.gossiped || !c.greet || c.kind === 'talk' || c.faction !== c.trueFaction) return;
    const cands = entries().filter(e => open(e) && S().day >= e.day && (def(e.id) || {}).hint && def(e.id).hint.fac === c.faction);
    if (!cands.length || (!force && Math.random() >= 0.35)) return;
    const e = U.pick(cands);
    c.gossiped = true;
    c.greet = `${c.greet} ${def(e.id).hint.line}`;
  }

  // 까마귀 정보상에게 물어볼 수 있는 소문: 아직 정정·확인이 안 났고, 진위를 못 알아냈고, 의뢰 중이 아닌 것
  const askable = () => entries().filter(e => open(e) && e.known !== 'true' && e.known !== 'false' && !e.inquiry).map(e => ({ id: e.id, day: e.day, text: def(e.id).text }));
  function ask(id) {
    const e = entries().find(x => x.id === id);
    if (!e || !open(e) || e.inquiry) return false;
    e.inquiry = { day: S().day };
    return true;
  }
  // 다음 날 아침이 된 의뢰들 (Letters.nightly 가 답장을 쓴다)
  const dueInquiries = () => entries().filter(e => e.inquiry && e.inquiry.day < S().day);
  // 답: 'true' | 'false' | 'unsure' — 정정·확인이 이미 났다면 확실히
  function answer(e) {
    const d = def(e.id);
    const r = !open(e) || Math.random() >= D().config.unsureChance ? (d.truth ? 'true' : 'false') : 'unsure';
    e.inquiry = null;
    e.known = r;
    return { r, text: d.text };
  }

  // ───────── 장부(정세 쪽)에 보여 줄 소문 목록 — 새것부터. status: open | asked | unsure | true | false ─────────
  //   by: 어떻게 알았나 ('news' 정정·확인 기사 / 'crow' 정보상). 열려 있는 소문의 진위는 여기서 새지 않는다
  function ledger(limit) {
    return entries().slice().reverse().slice(0, limit || 99).map(e => {
      const d = def(e.id) || {};
      let status = 'open', by = null;
      if (e.done) { status = d.truth ? 'true' : 'false'; by = 'news'; }
      else if (e.known === 'true' || e.known === 'false') { status = e.known; by = 'crow'; }
      else if (e.inquiry) status = 'asked';
      else if (e.known === 'unsure') status = 'unsure';
      return { id: e.id, day: e.day, text: d.text || e.id, status, by };
    });
  }

  return { dawn, marketMult, tip, askable, ask, dueInquiries, answer, ledger, def };
})();

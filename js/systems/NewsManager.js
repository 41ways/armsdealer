// 아침 신문 조립. 보통 3건, 많아도 5건.
// 우선순위: 사건 기사(새벽 이벤트 · 전날 효과 · 장부) > 고블린 유행 > 큰 시세 변동 > 배경/채움 기사.
// 3건이 안 되면 배경 기사(하루 1건까지)와 채움 기사(아무 정보 없는 동네 이야기)로 3건을 맞춘다.
//
// 기사 객체 (events.js / customers.js 의 news: 필드)
//   { cat, text, big }                      기본
//   text: ['A', 'B']                        같은 기사가 다시 나올 때마다 다음 문구로 (처음엔 A)
//   about: { faction, tag|tags|item, withinDays, claimed, name }
//                                           어제(기본 1일) 그 세력에 판 물건 중 가장 많이 판 것을 {item} 에,
//                                           그 손님 이름을 {who} 에 채운다. 판 게 없으면 name(기본 '무기')
//   alt: [{ buyer: 'tpl' | ['tpl'], when, text }]
//                                           about 으로 찾은 손님이 buyer 이거나 when(조건 DSL)이 맞으면 이 문구
//   {item|을} 처럼 쓰면 받침에 맞는 조사(을/를 · 이/가 · 은/는 · 과/와 · 으로/로)를 붙인다.
//   rumor: 소문 id — 신문에 ✔ 대신 ❓ 뱃지로 실리는 기사 (Rumors.js · js/data/rumors.js). 진위는 정정·확인 기사(cat '정정'/'확인', key)나 까마귀 정보상으로 가려진다
WS.sys.News = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;
  const MIN = 2;             // 평소 2건 — 실을 게 없으면 채움 기사로 2건만 맞춘다
  const TARGET = 3;          // 곁들일 게 있으면 3건
  const MAX = 5;             // 정말 큰 일이 겹친 날만 5건까지
  const MAX_MARKET = 1;      // 시세 기사는 1건까지
  const MARKET_ROOM = 3;     // 시세 기사는 신문이 3건을 넘지 않을 때만 싣는다
  const MARKET_MIN_PCT = 15; // 이만큼은 움직여야 기사가 된다
  const FILLER_COOLDOWN = 10;
  const FILLER_TO = 1;       // 채움(잡담) 기사는 확인할 기사가 하나도 없는 날에 한 건만 — 자리를 억지로 메우지 않는다

  const meta = () => {
    const st = S();
    st.newsMeta = st.newsMeta || {};
    st.newsMeta.seen = st.newsMeta.seen || {};
    return st.newsMeta;
  };

  // ── 조사 ──
  const PAIRS = { 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 은: ['은', '는'], 는: ['은', '는'], 과: ['과', '와'], 와: ['과', '와'] };
  function josa(word, j) {
    const code = String(word).charCodeAt(String(word).length - 1);
    const jong = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
    if (j === '으로' || j === '로') return word + (jong && jong !== 8 ? '으로' : '로'); // ㄹ 받침은 '로'
    const p = PAIRS[j];
    return p ? word + (jong ? p[0] : p[1]) : word + j;
  }
  const fill = (text, ctx) =>
    String(text).replace(/\{(\w+)(?:\|([가-힣]+))?\}/g, (m, k, j) =>
      ctx[k] === undefined ? m : j ? josa(ctx[k], j) : ctx[k]);

  // ── about: 어제 그 세력에 무엇을 팔았나 ──
  function lookup(spec) {
    const st = S();
    const C = WS.sys.Items.canon;
    const within = spec.withinDays ?? 1;
    const byItem = {}, buyers = {};
    for (const e of st.ledger || []) {
      if (e.action !== 'sell' || !e.item || st.day - e.day > within) continue;
      if (spec.faction && (spec.claimed ? e.faction : e.trueFaction) !== spec.faction) continue;
      if (spec.item && C(e.item) !== C(spec.item)) continue;
      if (spec.tag && !WS.sys.Items.hasTag(e.item, spec.tag)) continue;
      if (spec.tags && !spec.tags.some(t => WS.sys.Items.hasTag(e.item, t))) continue;
      const id = C(e.item);
      byItem[id] = (byItem[id] || 0) + (e.qty || 0);
      buyers[e.tpl] = buyers[e.tpl] || e.name;
    }
    const top = Object.keys(byItem).sort((a, b) => byItem[b] - byItem[a])[0];
    const it = top && WS.sys.Items.get(top);
    const who = Object.values(buyers)[0];
    return { item: it ? it.name : spec.name || '무기', who: who || '손님', tpls: Object.keys(buyers) };
  }

  // 이벤트 · 효과가 남긴 기사 한 건을 오늘 실을 문구로
  function resolve(n) {
    const found = n.about ? lookup(n.about) : { tpls: [] };
    let text = n.text;
    for (const a of n.alt || []) {
      const buyerOk = !a.buyer || [].concat(a.buyer).some(t => found.tpls.includes(t));
      if (buyerOk && (!a.when || WS.sys.Conditions.check(a.when))) { text = a.text; break; }
    }
    if (Array.isArray(text)) {
      const m = meta(), key = text[0];
      text = text[(m.seen[key] || 0) % text.length];
      m.seen[key] = (m.seen[key] || 0) + 1;
    }
    const out = { cat: n.cat, text: fill(text, found) };
    if (n.big) out.big = true;
    return out;
  }

  // ── 고블린 유행: 시작한 날, 그 뒤로 2~3일마다 ──
  // 오늘 유행 기사를 실을 차례인가: null / 'fresh'(시작한 날) / 'due'(2~3일 만에 다시)
  function trendDue() {
    const st = S();
    if (!st.trend || !st.trend.item) return null;
    if (st.trend.since === st.day) return 'fresh';
    const m = meta();
    return m.trendItem !== st.trend.item || m.trendNext === undefined || st.day >= m.trendNext ? 'due' : null;
  }
  function trendNews(fresh) {
    const st = S();
    const m = meta();
    m.trendNext = st.day + U.randInt(2, 3);
    m.trendItem = st.trend.item;
    const pool = (WS.data.trendNews || {})[st.trend.item] || WS.data.trendNews._any;
    const it = WS.sys.Items.get(st.trend.item);
    const texts = fresh ? pool.start : pool.ongoing;
    const choice = U.pick(texts.length > 1 ? texts.filter(t => t !== m.trendLast) : texts);
    m.trendLast = choice;
    return { cat: '유행', text: fill(choice, { item: it ? it.name : st.trend.item }) };
  }

  // ── 시세: 크게 움직인 물건만, 쉬운 말로 ──
  function marketNews() {
    const st = S();
    const now = WS.sys.Market.snapshot();
    const out = [];
    if (st.lastPrices) {
      // 아직 창고에 자리가 없는 물건(해금 전)의 시세는 싣지 않는다 — 초반 신문을 단순하게
      const open = id => !WS.sys.Progress || WS.sys.Progress.isUnlocked(WS.sys.Items.shelf(id));
      const moves = Object.keys(now)
        .filter(id => st.lastPrices[id] && open(id))
        .map(id => ({ id, pct: Math.round(((now[id] - st.lastPrices[id]) / st.lastPrices[id]) * 100) }))
        .filter(m => Math.abs(m.pct) >= MARKET_MIN_PCT)
        .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
        .slice(0, MAX_MARKET);
      const P = WS.data.marketNews;
      for (const m of moves) {
        const pool = m.pct >= 30 ? P.upBig : m.pct > 0 ? P.up : m.pct <= -30 ? P.downBig : P.down;
        out.push({ cat: '시세', text: fill(U.pick(pool), { item: WS.sys.Items.get(m.id).name }) });
      }
    }
    st.prevPrices = st.lastPrices || now;
    st.lastPrices = now;
    return out;
  }

  // ── 빈자리 채우기: 배경 기사 1건까지 + 채움 기사 ──
  function pickFrom(list, needed, cooldownDefault) {
    const st = S();
    const pool = list.filter(n => {
      const last = st.ambientLog[n.id];
      if (last !== undefined && st.day - last <= (n.cooldown || cooldownDefault)) return false;
      return WS.sys.Conditions.check(n.when);
    });
    const out = [];
    while (out.length < needed && pool.length) {
      const n = U.weightedPick(pool, x => x.weight || 1);
      pool.splice(pool.indexOf(n), 1);
      st.ambientLog[n.id] = st.day;
      out.push({ cat: n.cat, text: n.text });
    }
    return out;
  }
  function filler(needed) {
    if (needed <= 0) return [];
    const out = pickFrom(WS.data.ambientNews, 1, 3);
    out.push(...pickFrom(WS.data.fillerNews || [], needed - out.length, FILLER_COOLDOWN));
    // 채움 기사도 다 쿨다운이면 아무거나 (신문이 비지 않게)
    while (out.length < needed && (WS.data.fillerNews || []).length) {
      const n = U.pick(WS.data.fillerNews);
      if (!out.some(o => o.text === n.text)) out.push({ cat: n.cat, text: n.text });
    }
    return out;
  }

  function compose(firedNews) {
    const st = S();
    // 1) 사건 기사 — 같은 문구는 한 번만. 큰 기사 먼저, 나머지는 들어온 순서대로
    //    어제 자리가 없어 미뤄 둔 기사가 오늘 새 기사보다 앞선다
    const story = [];
    const raw = [...st.pendingNews.filter(n => n.carried), ...firedNews, ...st.pendingNews.filter(n => !n.carried)];
    st.pendingNews = [];
    for (const n of raw) {
      const r = resolve(n);
      if (r.text && !story.some(s => s.text === r.text)) story.push({ ...r, carried: n.carried });
    }
    story.sort((a, b) => (b.big ? 1 : 0) - (a.big ? 1 : 0));
    // 사건 기사 자리: 보통 2건 (유행이 시작된 날엔 1건). 큰 기사가 더 많을 때만 5건까지 늘어난다
    const tDue = trendDue();
    const keep = tDue === 'fresh' ? 1 : 0;
    const cap = Math.min(MAX - keep, Math.max(MIN - keep, story.filter(n => n.big).length));
    // key: 확인할 정보(사건 · 유행 · 시세) — 신문에 ✔ 를 붙인다. 채움 기사는 분위기용이라 key 가 없다
    let list = story.slice(0, cap).map(n => ({ ...n, key: true }));
    // 못 실은 사건 기사는 내일 신문으로 한 번 미룬다 (이미 미뤄진 기사는 버린다)
    story.slice(cap).filter(n => !n.carried).forEach(n => st.pendingNews.push({ cat: n.cat, text: n.text, big: n.big, carried: true }));
    // 2) 고블린 유행 — 시작한 날은 반드시, 그 뒤엔 자리가 있을 때 (없으면 내일 다시)
    if (tDue === 'fresh' || (tDue === 'due' && list.length < TARGET)) list.push({ ...trendNews(tDue === 'fresh'), key: true });
    // 2.5) 소문의 진위 (Rumors.js) — 정정·확인 기사는 ✔(확인할 정보)로 뒤에 붙이고, 새 소문은 자리가 있을 때만 ❓ 뱃지로 싣는다.
    //      시세 기사보다 먼저: 소문이 열리면 그날 시세가 이미 흔들려 있다
    const rum = WS.sys.Rumors ? WS.sys.Rumors.dawn(list.length) : { fixes: [], fresh: null };
    rum.fixes.forEach(n => list.push({ ...n, key: true }));
    if (rum.fresh) list.push(rum.fresh);
    // 3) 큰 시세 변동 (시세 기록은 매일 갱신)
    const market = marketNews();
    for (const m of market) if (list.length < MARKET_ROOM) list.push({ ...m, key: true });
    // 4) 확인할 기사가 하나도 없으면 채움 기사 1건만
    list = list.concat(filler(FILLER_TO - list.length));
    list = list.map(n => ({ cat: n.cat, text: n.text, ...(n.big ? { big: true } : {}), ...(n.key ? { key: true } : {}), ...(n.rumor ? { rumor: n.rumor } : {}) }));
    st.newsArchive[st.day] = list;
    return list;
  }

  return { compose, josa };
})();

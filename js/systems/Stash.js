// 장물함 — 도적단 장물아비("장부" 닉스)가 맡기고 간 장물. 가게 재고와 따로 둔다 (state.stash).
// 흐름·대사는 js/data/smuggling.js, 숫자는 config.smuggling.
//   receiveBatch  닉스의 짐 한 짐을 장물함에 (효과 DSL stash: 'batch')
//   sold(c, n)    손님에게 장물 n 개를 넘긴 거래 하나 — 얼룩을 남기고, 적발을 굴린다. 걸리면 bust
//   장물함이 걸리지 않고 비면 → returnDays 뒤 닉스가 다음 짐을 들고 온다 (batchesForKing 짐째면 암시장의 큰손)
WS.sys.Stash = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;
  const K = () => WS.data.config.smuggling;

  const initState = () => ({ items: {}, batches: 0, cleared: 0 });
  const st = () => (S().stash = S().stash || initState());
  const count = id => st().items[id] || 0;
  const total = () => Object.values(st().items).reduce((s, n) => s + n, 0);
  const kinds = () => Object.keys(K().batch.weights);
  // 창고에 장물함을 보여 줄지 — 한 번이라도 짐을 받았고, 아직 압수되지 않았을 때
  const shown = () => st().batches > 0 && !S().flags.smuggle_burned;

  function receiveBatch() {
    const s = st(), B = K().batch;
    const ids = kinds();
    const n = Math.max(ids.length, U.range(B.total));
    ids.forEach(id => (s.items[id] = (s.items[id] || 0) + 1));
    for (let i = ids.length; i < n; i++) {
      const id = U.weightedPick(ids, x => B.weights[x] || 1);
      s.items[id] = (s.items[id] || 0) + 1;
    }
    s.batches++;
  }

  function remove(id, n) {
    const s = st();
    s.items[id] = Math.max(0, (s.items[id] || 0) - n);
    if (!s.items[id]) delete s.items[id];
  }

  // 이 손님에게 장물 n 개를 한 번에 넘기면 걸릴 확률 (config.smuggling.detect)
  function detectChance(c, n) {
    const D = K().detect;
    if (!c || n <= 0) return 0;
    if (D.safeFactions.includes(c.trueFaction)) return 0;
    const a = WS.sys.Customers.affil(c) || {};
    if (D.royalFactions.includes(c.trueFaction) || (a.seal === 'real' && D.royalSeals.includes(a.sealOf))) return 1;
    return D.byCount[Math.min(n, D.byCount.length - 1)];
  }

  // 판매 하나가 끝난 뒤 (TransactionManager.sellLines — 장물은 이미 장물함에서 빠졌다). 걸렸으면 true
  function sold(c, n) {
    if (n <= 0) return false;
    WS.sys.Effects.apply(K().saleEffects);
    if (Math.random() < detectChance(c, n)) {
      bust(c);
      return true;
    }
    if (!total()) emptied();
    return false;
  }

  // 적발: 남은 장물 압수 · 벌금(0 밑으로는 안 감) · 평판 → 밀수 길은 영영 끊긴다
  function bust(c) {
    const s = st(), B = K().bust, g = S();
    s.items = {};
    const fine = Math.max(0, Math.min(B.fine, g.gold));
    g.gold -= fine;
    s.busted = { day: g.day, fine, by: c.name };
    if (c.dialog) c.dialog.push({ who: 'c', text: B.line });
    WS.sys.Effects.apply(B.effects);
  }

  // 걸리지 않고 다 팔았다 — 다음 짐 (또는 큰손)
  function emptied() {
    const s = st(), g = S();
    s.cleared++;
    const king = s.cleared >= K().batchesForKing && !g.flags.smuggle_king_offered && !g.flags.smuggle_king_declined;
    if (king) g.flags.smuggle_king_offered = g.day;
    g.spawnQueue.push({ customer: king ? 'smuggle_bigshot' : 'smuggle_fence_return', day: g.day + U.range(K().returnDays) });
  }

  return { initState, count, total, kinds, shown, receiveBatch, remove, detectChance, sold };
})();

// 한 판이 끝날 때 그 판의 요약(엔딩·선택·세력 관계)을 익명으로 한 번 보낸다 — 밸런스와 선택 경향을 보려는 것.
// 엔딩까지 못 가고 탭을 떠나면(숨기거나 닫으면) 그때까지의 요약을 ending 'quit' 로 보낸다 — 워커가 같은 판이면 더 멀리 간 것으로 덮어쓰고, 나중에 끝까지 가면 지운다.
// 개인을 가려낼 정보는 없다: 브라우저가 만든 무작위 sid, 몇 번째로 끝낸 판인지(run) 뿐.
// 받는 곳은 norara-errors 워커의 /run (저장소 41ways/norara 의 errors/). localhost 에서 돌린 판은 보내지도 않고 워커도 버린다.
// 결과 보기: https://41ways.github.io/armsdealer/stats/
WS.sys.RunLog = (() => {
  const URL_RUN = 'https://norara-errors.41ways.workers.dev/run';
  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 막혀 있어도 게임은 계속 */ } },
  };

  function sid() {
    let s = ls.get('ad_sid');
    if (!s || !/^[a-z0-9]{6,32}$/.test(s)) {
      s = Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
      ls.set('ad_sid', s);
    }
    return s;
  }

  // 누구에게 얼마나 팔았고 몇 번 거절했나 (진짜 소속 기준) — "기조" 를 보는 재료
  function sales(ledger) {
    const out = {};
    for (const l of ledger || []) {
      const f = l.trueFaction || l.faction;
      if (!f) continue;
      if (l.action === 'sell') out[f + '_sell'] = (out[f + '_sell'] || 0) + (l.qty || 1);
      else if (l.action === 'refuse') out[f + '_refuse'] = (out[f + '_refuse'] || 0) + 1;
    }
    return out;
  }

  function build(st) {
    const world = {};
    for (const [k, v] of Object.entries(st.world || {})) if (typeof v === 'number' && Number.isFinite(v)) world[k] = v;
    const closed = {};
    for (const [k, v] of Object.entries(st.closedWhy || {})) if (v && v.by) closed[k] = v.by;
    return {
      app: 'armsdealer', v: WS.data.config.version, sid: sid(), run: +ls.get('ad_runs') || 0,
      ending: st.ending, how: st.endingWhy || null, days: st.day, gold: Math.round(st.gold),
      flags: Object.keys(st.flags || {}), choices: st.choices || {}, world, closed,
      clash: (st.clashLog || []).map(c => ({ d: c.day, a: c.a, b: c.b, w: c.winner, how: c.how, backed: c.backed })),
      sales: sales(st.ledger),
      tele: st.tele || {}, lat: st.teleLat || {},
      shop: Object.keys(st.upgrades || {}).filter(k => st.upgrades[k]),
    };
  }

  const local = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  function beacon(payload) {
    const body = JSON.stringify(payload);
    const ok = navigator.sendBeacon && navigator.sendBeacon(URL_RUN, new Blob([body], { type: 'text/plain' }));
    if (!ok) fetch(URL_RUN, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {});
  }
  // 중간에 떠난 판 — 이틀째부터, 판이 진행 중일 때만. run 은 10000 + 지금까지 끝낸 판 수 (끝낸 판의 번호와 겹치지 않게)
  let quitDay = -1;
  function snapshot() {
    try {
      const st = WS.Game && WS.Game.state;
      if (!st || st.replay || st.ending || local()) return;
      if (!['morning', 'prep', 'shop', 'closing', 'night'].includes(st.phase) || st.day < 2 || quitDay === st.day) return;
      quitDay = st.day; // 같은 날 여러 번 숨겼다 켜도 한 번만
      beacon({ ...build(st), ending: 'quit', how: 'quit', run: 10000 + (+ls.get('ad_runs') || 0) });
    } catch (e) { /* 통계 때문에 게임이 막히면 안 된다 */ }
  }
  if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
    addEventListener('pagehide', snapshot);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') snapshot(); });
  }

  function report(st) {
    try {
      if (!st || st.replay || !st.ending) return;
      if (local()) return;
      beacon(build(st));
      ls.set('ad_runs', String((+ls.get('ad_runs') || 0) + 1));
    } catch (e) { /* 통계 때문에 엔딩이 막히면 안 된다 */ }
  }

  return { report, build, snapshot };
})();

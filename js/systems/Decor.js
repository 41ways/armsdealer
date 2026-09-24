// 가게 상태 레이어 엔진 — 데이터는 js/data/decor.js, 그리기는 js/render/DecorLayer.js.
// 이 파일은 화면(DOM·캔버스)을 모른다: 상태를 보고 "지금 켜진 데코"를 가려내는 순수 계산과, 새로 켜진 것을 한 번만 알리는 기록만 한다.
//   active(state)  → 켜진 항목 배열 (상태를 바꾸지 않는다 — 시뮬레이터·저장 왕복과 무관)
//   update(state)  → { on, fresh }  fresh = 이번에 처음 켜져 알림을 띄울 항목. 영업 화면에서만 기록한다 (state.decorSeen: { id: 켜진 날 })
//                    저장에 decorSeen 이 없으면(옛 저장·새 게임의 첫 영업) 지금 켜진 것을 알림 없이 조용히 적어 둔다
//   ready(e)       → 그릴 수 있는가 (절차형은 늘 참, 그림 필요 항목은 파일이 온 뒤). 렌더러가 WS.sys.Decor.readyFn 으로 알려 준다
WS.sys.Decor = (() => {
  const data = () => WS.data.decor || { list: [] };
  const list = () => data().list;

  // Conditions 는 WS.Game.state 를 읽으므로 넘겨받은 상태로 잠깐 바꿔 끼워 평가하고 되돌린다
  function withState(st, fn) {
    const G = WS.Game, prev = G.state;
    if (st === prev) return fn();
    G.state = st;
    try { return fn(); } finally { G.state = prev; }
  }

  const isOn = (e, st) => !!e.base || WS.sys.Conditions.check(e.when);

  function active(st) {
    if (!st) return [];
    return withState(st, () => list().filter(e => isOn(e, st)));
  }

  // true 그릴 수 있다 · false 그림이 없다 · null 그림을 부르는 중 (렌더러가 readyFn 으로 알려 준다)
  const ready = e => ((!e.src && !e.needsArt) ? true : (WS.sys.Decor.readyFn ? WS.sys.Decor.readyFn(e) : false));

  function update(st) {
    const on = active(st), fresh = [];
    if (!st || st.phase !== 'shop') return { on, fresh };
    if (!st.decorSeen) {
      st.decorSeen = {};
      on.forEach(e => { st.decorSeen[e.id] = st.day; });
      return { on, fresh };
    }
    on.forEach(e => {
      if (st.decorSeen[e.id] !== undefined) return;
      const r = ready(e);
      if (r === null) return; // 그림이 오는 중 — 다음에 다시 본다
      st.decorSeen[e.id] = st.day; // 그림이 없는 항목도 적어 둔다 — 그림이 나중에 와도 뒤늦게 알리지 않는다
      if (r && !e.base && !e.silent) fresh.push(e);
    });
    return { on, fresh };
  }

  const byId = id => list().find(e => e.id === id) || null;
  const toastText = e => e.toast || `가게에 「${e.label}」이(가) 생겼다.`;

  return { list, byId, active, update, ready, toastText, readyFn: null };
})();

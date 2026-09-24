// 엔딩 수집품 기록 — 이 브라우저(localStorage)에만 남는다. 서버·계정 없음.
// { [endingId]: { day, gold, at(ms), n(본 횟수) } } — 같은 엔딩을 다시 보면 최초 기록(day·gold·at)은 그대로 두고 횟수만 올린다.
// 개발 페이지(tools/make_dev.py)는 KEY 를 따로 쓴다.
WS.sys.EndingLog = (() => {
  const safe = fn => { try { return fn(); } catch (e) { return null; } };
  const L = {
    KEY: 'armsdealer_endings_v1',
    all: () => safe(() => JSON.parse(localStorage.getItem(L.KEY))) || {},
    has: id => !!L.all()[id],
    count: () => WS.data.endings.filter(e => L.all()[e.id]).length,
    total: () => WS.data.endings.length,
    record(id, day, gold) {
      if (!id) return;
      const a = L.all(), old = a[id];
      a[id] = old ? { ...old, n: (old.n || 1) + 1 } : { day, gold, at: Date.now(), n: 1 };
      safe(() => localStorage.setItem(L.KEY, JSON.stringify(a)));
    },
    set(id, on) {
      const a = L.all();
      if (on) a[id] = a[id] || { day: 1, gold: 0, at: Date.now(), n: 1 }; else delete a[id];
      safe(() => localStorage.setItem(L.KEY, JSON.stringify(a)));
    },
    unlockAll() {
      const a = L.all();
      WS.data.endings.forEach(e => { if (!a[e.id]) a[e.id] = { day: 1, gold: 0, at: Date.now(), n: 1 }; });
      safe(() => localStorage.setItem(L.KEY, JSON.stringify(a)));
    },
    clear: () => safe(() => localStorage.removeItem(L.KEY)),
  };
  return L;
})();

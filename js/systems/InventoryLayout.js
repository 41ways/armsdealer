// 재고 서랍의 공간 배치(그리드 인벤토리) — 순수 표시/조작 레이어.
// World.js의 Inventory(개수·용량 경제 로직)는 건드리지 않는다. 이 모듈은
// state.inventory를 "읽기만" 하고, 배치 정보(state.invLayout)를 관리한다.
WS.sys.InvLayout = (() => {
  const S = () => WS.Game.state;
  const COLS = 5; // 좁은 세로 화면(9:16)에 맞춘 고정 열 수
  const EXTRA_ROWS = 6; // 칸수 큰 장비들이 여유 있게 들어가도록 여분 행

  function dims() {
    const cols = COLS;
    const slots = WS.data.config.shopSlots + (S() ? WS.sys.Inventory.extraSlots() : 0);
    const rows = Math.ceil(slots / cols) + EXTRA_ROWS;
    return { cols, rows };
  }

  // 배치 탐색/검증용 가상 높이 — 실제 표시 rows보다 넉넉히 잡아서
  // (드로어 바디가 overflow-y:auto라 넘쳐도 스크롤된다) 배치 실패를 피한다.
  const packRows = () => dims().rows * 3;

  function footprint(gw, gh, rot) {
    return rot ? { w: gh, h: gw } : { w: gw, h: gh };
  }

  // 아이템 id별로 몇 개의 "배치 가능한 조각(instance)"이 존재하는지 결정한다.
  //  - 칸수 1(가로*세로===1)인 소모품/재료류: 보유 수량 전체를 대표하는 인스턴스 1개.
  //  - 칸수 2 이상인 장비류: 보유 개수만큼, 개당 인스턴스 1개 (#0, #1, ...).
  function instancesMeta() {
    const inv = S().inventory;
    const list = [];
    for (const id of Object.keys(inv)) {
      const count = inv[id] || 0;
      if (count <= 0) continue;
      const it = WS.sys.Items.get(id);
      const [gw, gh] = it.grid;
      if (gw * gh === 1) {
        list.push({ instanceId: `${id}#0`, itemId: id, gw, gh, count });
      } else {
        for (let i = 0; i < count; i++) {
          list.push({ instanceId: `${id}#${i}`, itemId: id, gw, gh, count: 1 });
        }
      }
    }
    return list;
  }

  function metaMap() {
    const m = {};
    instancesMeta().forEach(e => { m[e.instanceId] = e; });
    return m;
  }

  function fits(occ, cols, rows, x, y, w, h) {
    if (x < 0 || y < 0 || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (x + w > cols || y + h > rows) return false;
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (occ[yy] && occ[yy][xx]) return false;
      }
    }
    return true;
  }

  function mark(occ, x, y, w, h, v) {
    for (let yy = y; yy < y + h; yy++) {
      if (!occ[yy]) occ[yy] = [];
      for (let xx = x; xx < x + w; xx++) occ[yy][xx] = v;
    }
  }

  function findSpot(occ, cols, rows, gw, gh, rotatable) {
    for (let rot = 0; rot <= (rotatable ? 1 : 0); rot++) {
      const { w, h } = footprint(gw, gh, rot);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (fits(occ, cols, rows, x, y, w, h)) return { x, y, rot };
        }
      }
    }
    return null;
  }

  // 드로어를 열 때(또는 재고가 바뀐 뒤) 호출. 사라진 조각은 지우고, 새로 생긴
  // 조각은 첫 빈자리(first-fit)에 배치한다. 이미 유효하게 놓인 조각은 건드리지 않는다.
  function sync() {
    const { cols } = dims();
    const rows = packRows();
    const layout = S().invLayout || (S().invLayout = {});
    const meta = metaMap();

    // 더는 존재하지 않는 인스턴스(판매/소모됨) 제거
    for (const id of Object.keys(layout)) if (!meta[id]) delete layout[id];

    // 기존에 유효하게 놓인 것들을 그대로 점유 표시 (안정적 순서로 처리)
    const occ = [];
    const placedIds = Object.keys(layout).sort();
    for (const id of placedIds) {
      const e = meta[id];
      const p = layout[id];
      const { w, h } = footprint(e.gw, e.gh, p.rot);
      if (fits(occ, cols, rows, p.x, p.y, w, h)) {
        mark(occ, p.x, p.y, w, h, true);
      } else {
        // 이론상 발생하면 안 되지만(외부 상태 손상 등) 안전하게 재배치 대상으로
        delete layout[id];
      }
    }

    // 새로 생긴(또는 재배치 필요한) 인스턴스를 first-fit으로 채운다
    const missing = Object.values(meta)
      .filter(e => !layout[e.instanceId])
      .sort((a, b) => (a.instanceId < b.instanceId ? -1 : 1));
    for (const e of missing) {
      const rotatable = e.gw !== e.gh;
      const spot = findSpot(occ, cols, rows, e.gw, e.gh, rotatable) || { x: 0, y: 0, rot: 0 };
      layout[e.instanceId] = { x: spot.x, y: spot.y, rot: spot.rot };
      const { w, h } = footprint(e.gw, e.gh, spot.rot);
      mark(occ, spot.x, spot.y, w, h, true);
    }
  }

  function occupiedExcept(excludeId) {
    const rows = packRows();
    const layout = S().invLayout || {};
    const meta = metaMap();
    const occ = [];
    for (const id of Object.keys(layout)) {
      if (id === excludeId || !meta[id]) continue;
      const e = meta[id];
      const p = layout[id];
      const { w, h } = footprint(e.gw, e.gh, p.rot);
      mark(occ, p.x, p.y, w, h, true);
    }
    return { occ, rows };
  }

  // 실제로 옮기지 않고 (x,y)에 현재 회전 상태로 놓일 수 있는지만 검사 (드래그 중 미리보기용)
  function canPlace(instanceId, x, y) {
    const layout = S().invLayout || {};
    const meta = metaMap();
    const e = meta[instanceId];
    const p = layout[instanceId];
    if (!e || !p) return false;
    const { cols } = dims();
    const { w, h } = footprint(e.gw, e.gh, p.rot);
    const { occ, rows } = occupiedExcept(instanceId);
    return fits(occ, cols, rows, x, y, w, h);
  }

  function moveTo(instanceId, x, y) {
    const layout = S().invLayout || (S().invLayout = {});
    const meta = metaMap();
    const e = meta[instanceId];
    const p = layout[instanceId];
    if (!e || !p) return false;
    const { cols } = dims();
    const { w, h } = footprint(e.gw, e.gh, p.rot);
    const { occ, rows } = occupiedExcept(instanceId);
    if (!fits(occ, cols, rows, x, y, w, h)) return false;
    layout[instanceId] = { x, y, rot: p.rot };
    return true;
  }

  function rotate(instanceId) {
    const layout = S().invLayout || (S().invLayout = {});
    const meta = metaMap();
    const e = meta[instanceId];
    const p = layout[instanceId];
    if (!e || !p) return false;
    if (e.gw === e.gh) return false; // 정사각형은 회전할 필요 없음
    const { cols } = dims();
    const newRot = p.rot ? 0 : 1;
    const { w, h } = footprint(e.gw, e.gh, newRot);
    const { occ, rows } = occupiedExcept(instanceId);
    if (fits(occ, cols, rows, p.x, p.y, w, h)) {
      layout[instanceId] = { x: p.x, y: p.y, rot: newRot };
      return true;
    }
    // 제자리에서 회전이 안 되면 가장 가까운 빈자리를 찾는다
    let best = null, bestDist = Infinity;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (fits(occ, cols, rows, x, y, w, h)) {
          const d = Math.abs(x - p.x) + Math.abs(y - p.y);
          if (d < bestDist) { bestDist = d; best = { x, y }; }
        }
      }
    }
    if (best) {
      layout[instanceId] = { x: best.x, y: best.y, rot: newRot };
      return true;
    }
    return false; // 놓을 곳이 없으면 회전 취소, 원상태 유지
  }

  function at(x, y) {
    const layout = S().invLayout || {};
    const meta = metaMap();
    for (const id of Object.keys(layout)) {
      const e = meta[id];
      if (!e) continue;
      const p = layout[id];
      const { w, h } = footprint(e.gw, e.gh, p.rot);
      if (x >= p.x && x < p.x + w && y >= p.y && y < p.y + h) {
        return { instanceId: id, itemId: e.itemId, x: p.x, y: p.y, w, h, rot: p.rot, count: e.count };
      }
    }
    return null;
  }

  function all() {
    const layout = S().invLayout || {};
    const meta = metaMap();
    const out = [];
    for (const id of Object.keys(layout)) {
      const e = meta[id];
      if (!e) continue;
      const p = layout[id];
      const { w, h } = footprint(e.gw, e.gh, p.rot);
      out.push({
        instanceId: id, itemId: e.itemId,
        x: p.x, y: p.y, w, h, rot: p.rot,
        count: e.count, stackable: e.gw * e.gh === 1,
        rotatable: e.gw !== e.gh,
      });
    }
    return out;
  }

  return { dims, sync, moveTo, rotate, canPlace, at, all };
})();

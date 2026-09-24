// 대륙 정세 — 세계 변수를 말로 옮긴다 (데이터: js/data/intel.js). 게임 상태를 바꾸지 않는다 — 읽기 전용,
// 단 하루에 한 번 record() 가 세력별 점수를 st.intelHist 에 적어 둔다 (최근 5일 추세용, 직렬화되는 단순 객체).
//   st.intelHist = { [day]: { [powerId]: 점수 } }
// 손님 대사·신문과 같은 세계 변수에서 나오므로 서로 모순되지 않는다. 정확한 숫자는 밖으로 내보내지 않는다 (단계 · 추세 화살표만).
WS.sys.Intel = (() => {
  const S = () => WS.Game.state;
  const U = WS.util;
  const D = () => WS.data.intel;
  const W = k => WS.sys.World.get(k);
  const C = c => WS.sys.Conditions.check(c);
  const HIST_KEEP = 8;

  // 지금 이 세력을 아는가: 처음부터 / 조건 / 그 세력 손님을 만났다 / 관련 기사가 신문에 나왔다
  // (아침에는 오늘 대기열이 이미 짜여 met 이 오늘이므로 어제까지 만난 손님만 센다 — 관계 서랍과 같은 규칙)
  function known(p) {
    const st = S();
    if (p.always) return true;
    if (p.known && C(p.known)) return true;
    if (p.fac && st.met && st.met[p.fac] !== undefined && st.met[p.fac] < st.day + (st.phase === 'shop' ? 1 : 0)) return true;
    if (p.keys && p.keys.length) {
      const re = new RegExp(p.keys.join('|'));
      for (const d of Object.keys(st.newsArchive || {})) {
        if (+d > st.day) continue;
        if ((st.newsArchive[d] || []).some(n => !n.rumor && re.test(n.text || ''))) return true; // 소문 기사만으로는 알게 되지 않는다 (헛소문이 세력을 열어 주면 안 된다)
      }
    }
    return false;
  }

  const scoreOf = p => { try { return +p.score(W) || 0; } catch (e) { return 0; } };

  // 하루 한 번 (DayManager.startDay — 새벽 사건까지 끝난 뒤)
  function record() {
    const st = S();
    st.intelHist = st.intelHist || {};
    const row = {};
    for (const p of D().powers) row[p.id] = Math.round(scoreOf(p) * 10) / 10;
    row._rep = Math.round(W('reputation') * 10) / 10; // 평판지(가게 물품)가 보여 줄 평판의 5일 변화
    st.intelHist[st.day] = row;
    for (const d of Object.keys(st.intelHist)) if (+d < st.day - HIST_KEEP) delete st.intelHist[d];
  }

  const level = (p, s) => p.steps.filter(t => s >= t).length; // 0~4
  // 최근 trendDays 일 전(없으면 가장 오래된 기록)의 점수 — 없으면 null
  function baseScore(key) {
    const st = S(), h = st.intelHist || {};
    const want = st.day - D().trendDays;
    const days = Object.keys(h).map(Number).filter(d => d < st.day && h[d][key] !== undefined).sort((a, b) => a - b);
    if (!days.length) return null;
    return h[days.find(d => d >= want) ?? days[days.length - 1]][key];
  }
  function trend(p, s) {
    const base = baseScore(p.id);
    if (base === null) return 0;
    const diff = s - base;
    return diff >= p.eps ? 1 : diff <= -p.eps ? -1 : 0;
  }
  // 평판지용 숫자: pct = 세력 힘 0~100 환산 (강함 문턱 = 80), delta = 5일 변화(같은 눈금), rel = 우호도 원값
  function numbers(p, s, relV) {
    const scale = p.steps[3] / 0.8;
    const base = baseScore(p.id);
    return { pct: Math.round(U.clamp(s / scale * 100, 0, 100)), delta: base === null ? null : Math.round((s - base) / scale * 100), rel: relV === undefined ? null : Math.round(relV * 10) / 10 };
  }
  // 평판 수치와 5일 변화 (평판지)
  function reputation() {
    const v = W('reputation'), base = baseScore('_rep');
    return { v: Math.round(v * 10) / 10, delta: base === null ? null : Math.round((v - base) * 10) / 10 };
  }
  function relTone(varName) {
    if (!varName) return null;
    const v = W(varName);
    const t = D().relTones.find(([lim]) => v < lim) || D().relTones[D().relTones.length - 1];
    return { word: t[1], tone: t[2], v };
  }

  // 세력 한 줄: { id, label, icon, color, known, blur, level(0~4), word, arrow(1/0/-1), rel }
  function powerRow(p) {
    const s = scoreOf(p);
    const kn = known(p);
    const row = { id: p.id, label: p.label, icon: p.icon, color: p.color, known: kn, blur: false, level: 0, word: '', arrow: 0, rel: null };
    if (!kn) return row;
    const f = p.fac && WS.data.factions[p.fac];
    row.rel = f && f.visit ? relTone(f.visit.var) : null;
    if (p.blur && C(p.blur)) { row.blur = true; row.word = '???'; return row; }
    row.level = level(p, s);
    row.word = D().words[row.level];
    row.arrow = trend(p, s);
    row.num = numbers(p, s, row.rel ? row.rel.v : undefined);
    for (const o of p.override || []) if (C(o.when)) { row.word = o.word; row.level = o.level ?? 0; row.arrow = 0; break; }
    return row;
  }

  // 지도 데이터: 장소마다 알려졌나 · 우호도 · 전선 화살표 · 색칠 · 옆글
  function mapModel(rows) {
    const M = D().map;
    const byId = {};
    rows.forEach(r => (byId[r.id] = r));
    const places = M.places.map(pl => {
      const row = byId[pl.power];
      const kn = pl.always || (row && row.known);
      const rel = kn && pl.rel ? relTone(pl.rel) : null;
      return { ...pl, known: !!kn, tone: rel ? rel.tone : 'none', rel };
    });
    const at = id => places.find(p => p.id === id);
    const fronts = M.fronts.filter(f => C(f.when)).map(f => ({ ...f, a: at(f.from), b: at(f.to) }));
    const shades = M.shades.filter(s => C(s.when)).map(s => ({ ...s, p: at(s.place) }));
    const notes = M.notes.filter(n => C(n.when)).map(n => ({ ...n, p: at(n.place) }));
    return { w: M.w, h: M.h, places, fronts, shades, notes };
  }

  // 최근 사건 연표: 신문에 실린 확인된 사건(key/big) 중 최근 것 n 줄
  function chronicle(n) {
    const st = S(), skip = D().chronicleSkip, out = [];
    const days = Object.keys(st.newsArchive || {}).map(Number).filter(d => d <= st.day).sort((a, b) => b - a);
    for (const d of days) {
      for (const a of st.newsArchive[d] || []) {
        if (a.rumor || skip.includes(a.cat) || !(a.big || a.key)) continue;
        out.push({ day: d, cat: a.cat, text: a.text, big: !!a.big });
      }
      if (out.length >= n * 2) break;
    }
    // 큰 기사를 앞세우되 시간 순서(새것부터)는 지킨다: 큰 것 → 나머지, 각각 새것부터, 그다음 날짜순으로 다시 정렬
    const pick = out.filter(x => x.big).concat(out.filter(x => !x.big)).slice(0, n);
    return pick.sort((a, b) => b.day - a.day);
  }

  function model() {
    const rows = D().powers.map(powerRow);
    return {
      rows: rows.filter(r => r.known),
      hidden: rows.filter(r => !r.known).length,
      map: mapModel(rows),
      chron: chronicle(5),
      rumors: WS.sys.Rumors ? WS.sys.Rumors.ledger(6) : [],
    };
  }

  return { record, model, known, powerRow, reputation };
})();

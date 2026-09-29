// 가닥 잡기 — 부딪치는 사건(충돌)의 진행자 · 결말 고르기 (docs/DESIGN_CONVERGENCE.md §5 · §7)
//
// 데이터는 js/data/talks.js:
//   WS.data.routes      줄기(결말 길)마다 — 열린 조건(live) · 앞선 정도(score) · 형세의 힘(power) · 닫힘 플래그(close) · 호소 손님 · 이기면/지면의 글
//   WS.data.clashPairs  인과가 뚜렷한 쌍은 손으로 쓴 장면(gc · dg · dc · dk · dgo · gg) — 그 쌍이 뽑히면 이것을 쓴다
//
// v0.9.7 — 동시 진행 · 끝물 몰아치기 (design/qa_report_4.md 측정: 예전엔 충돌이 하나씩만 돌아 사슬(이긴 줄기가 또 나옴)에 밀린
//   나머지 열린 줄기가 12~28일 내내 아무 일도 안 겪고 그냥 방치되었다 — 중립 결말 대부분이 "누가 뭘 안 해서"였다):
//   · state.clashes 는 배열이다 (예전엔 단수 state.clash 하나) — 열린 줄기가 4개 이상이면 최대 둘까지 동시에 돈다.
//     같은 줄기가 두 충돌에 동시에 낄 수는 없다(잠금). 한 짝의 "예" 여부는 그 짝만의 플래그로 본다(tk_rt_<id>_yes + tk_clvs_<a>_<b> —
//     talks.js 참고. 전엔 전역 tk_cl_yes 하나였는데 두 충돌이 겹치면 섞여 버려서 짝마다로 바꿨다).
//   · 26일이 지나도록 한 번도 충돌에 못 나와 본 "살아 있는"(live) 줄기는 새 짝 고르기에서 확 앞세운다(sweepBoost) — 그래서
//     끝물엔 밀린 줄기부터 몰아서 처리된다. 다만 "실제로 대 줬느냐"로 승패를 가르는 규칙 자체는 그대로다 — 끝물이라고 그냥 승리를 주지 않는다.
//   · 몇몇 줄기(요정 · 안개 상단)는 결말 조건이 충돌과 무관한 딴 사건(오랜 맹세 · 두 번째 계약)에 걸려 있어 충돌만 반복해 이겨도
//     결말에 닿을 길이 없었다 — clashClimax 로 "그 줄기를 (공급으로) 두 번 넘게 이기면" 결말 조건의 실제 플래그를 직접 켜 준다.
//     강철의 시대(드워프)는 공급승 때마다 dwarf_deliveries 를 1 올려 원래 있던 납품 4회 문턱에 자연히 합류하게 했다(talks.js).
//
// 새벽마다 (DayManager.startDay → Events.runDawn 바로 뒤):
//   ① 끝난(resolveDay 지난) 충돌마다 결과를 낸다 — 누가 실제로 물자를 받았나(구매 손님 onSell 플래그)로.
//      한쪽만 받았으면 그쪽 승 / 적대 쪽 호소 손님이 경비대에 잡혔으면 다른 쪽 승 / 둘 다 · 아무도 아니면 형세로 —
//      한쪽 이야기만 이미 절정(결말 조건 충족)이면 그쪽, 아니면 손으로 쓴 장면의 byWorld, 없으면 power(+ 궁정은 편든 적이 있으면 가산).
//      진 줄기에 closed_* 를 켜고, "이긴 쪽이 무엇을 했기에 진 쪽이 닫혔나" 한 줄 기사를 싣는다.
//      천칭단(balance)은 한쪽에만 댄 순간 닫히고, 박쥐(double)는 전쟁 당사자(고블린 · 왕국 · 마왕군 · 기사단 · 궁정)가 낀 충돌에서 한쪽에만 댄 순간 닫힌다.
//   ② 실제 12~28일이면, 잠기지 않은(다른 충돌에 끼지 않은) 열린 줄기 가운데 자리(cap)가 남는 만큼 새 충돌을 연다.
//      cap: 잠기지 않은 열린 줄기가 4개 이상이면 2, 아니면 1 — 가장 앞선 줄기와, 앞선 정도 + 인과로 이어진 쌍(가산) + 손으로 쓴 장면이 있는 쌍(가산) +
//      (26일이 지나도록 한 번도 충돌에 안 나와 봤으면 큰 가산)으로 짝을 고른다. 이긴 줄기는 다음 충돌에 또 나온다 (사슬).
//      보통은 n일 호소 A → n+1일 호소 B → (예라고 하면 이튿날 수레) → n+3일 새벽 결과.
//      열린 줄기가 넷 이상이거나 25일이 지나면 서두른다: 두 호소가 같은 날 → n+2일 새벽 결과.
//   ③ clashClimax — 공급승을 일정 횟수(기본 2) 넘게 거둔 줄기는, 26일이 지났으면 그 줄기의 결말 조건이 실제로 요구하는 플래그를 직접 켠다.
//
// 결말 고르기 (pickEnding — DayManager.nextDay 가 캠페인 끝에 부른다. 곧바로 끝나는 결말(파산 · 밀수왕)은 예전처럼 목록 순서):
//   1. 개인의 길(PERSONAL — 가게 자신의 이야기: 붉은여울 · 완벽한 장부 · 밀고자 · 청출어람 · 별에서 온 그대)이 채워졌으면 목록 순서로 그것.
//      세상의 싸움과 따로 여러 날에 걸쳐 스스로 고른 길이라 먼저 본다. 그때 세상의 결말은 뒷이야기(epilogues.js)로 남는다.
//   2. 세상의 결말(줄기에 딸린 결말)이 하나만 채워졌으면 그것.
//   3. 여럿이면: 가장 최근 충돌부터 거슬러 — 그 충돌에서 플레이어가 밀어 준 줄기(backed: 한쪽만 댔으면 그쪽, 둘 다 댔으면 박쥐, 아무 데도 안 댔으면 천칭단)
//      → 그 충돌에서 이긴 줄기 순으로, 결말이 채워진 첫 줄기. ("마지막으로 당신이 손을 보탠 이야기가 판을 가져간다")
//   4. 충돌에 나온 적 없는 줄기끼리면: 앞선 정도(score)가 큰 줄기, 같으면 목록 순서.
WS.sys.Clash = (() => {
  const S = () => WS.Game.state;
  const Cn = () => WS.sys.Conditions;
  const routes = () => WS.data.routes || [];
  const pairs = () => WS.data.clashPairs || [];
  const byId = id => routes().find(r => r.id === id);
  // 충돌을 여는 실제 날짜 구간 (config.clash 로 덮어쓸 수 있다 — 시뮬에서 충돌 없는 판을 재 볼 때 { start: 99 })
  const cc = () => WS.data.config.clash || {};
  const PERSONAL = ['smuggle_king', 'gambling_end', 'gambler_ruin', 'bankrupt', 'gambler', 'red_ford_again', 'perfect_ledger', 'informant', 'pin_heir', 'star_guests'];
  // 전쟁 당사자 — 이 줄기가 낀 충돌에서 한쪽에만 대면 「박쥐」 길이 닫힌다
  const WAR_SIDES = ['goblin', 'kingdom', 'demonlord', 'knight', 'court'];

  // 줄기 함수가 쓰는 도우미: v(변수) · f(플래그) · sold(세력, 태그|{item}, trades)
  const X = {
    v: k => WS.sys.World.get(k),
    f: k => S().flags[k] !== undefined,
    sold: (faction, tag = 'weapon', trades = false) => Cn().soldQty(typeof tag === 'object' ? { faction, ...tag, trades } : { faction, tag, trades }),
  };
  const flag = f => S().flags[f] !== undefined;
  const isLive = r => !flag(r.close) && Cn().check(r.live);
  const scoreOf = r => (r.score ? r.score(X) : 0);
  const powerOf = r => (r.power ? r.power(X) : 0);
  // 손으로 쓴 장면은 그 글이 맞는 때만 (p.when — 예: 고블린이 이미 이긴 뒤엔 "선봉이 무너졌다"를 쓰지 않는다). 아니면 줄기 블록으로 짠다
  const pairOf = (a, b) => pairs().find(p => ((p.a === a && p.b === b) || (p.a === b && p.b === a)) && (!p.when || Cn().check(p.when)));
  const related = (a, b) => (WS.data.routeLinks || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const txt = (t, ...args) => (typeof t === 'function' ? t(X, ...args) : t);

  // 그 줄기의 결말 가운데 하나라도 지금 조건이 채워졌나
  //   절정이 30일째 밤(대관식)에 오는 줄기(궁정 · 밤의 궁정)는 그 전엔 결말 조건이 채워질 수 없으니 줄기의 climax(X) 로 대신 본다
  const satisfied = r => (r.climax ? !!r.climax(X) : false) || (r.endings || []).some(id => { const e = WS.data.endings.find(x => x.id === id); return !!e && Cn().check(e.when); });
  // 지금 열린 줄기 (충돌에 나올 수 있는 것 — meta 는 빼고)
  const openRoutes = () => routes().filter(r => !r.meta && isLive(r));
  // 지금 어떤 충돌에도 잠기지 않은 열린 줄기
  const lockedIds = () => new Set((S().clashes || []).flatMap(c => [c.a, c.b]));
  const unlockedOpen = () => openRoutes().filter(r => !lockedIds().has(r.id));
  // 이 줄기가 이제껏 어떤 충돌에도(승패 어느 쪽으로도) 나와 본 적이 없나 — 끝물 몰아치기(sweepBoost) 재료
  const everClashed = id => (S().clashLog || []).some(l => l.a === id || l.b === id);
  const forceDay = () => cc().forceDay ?? 26;

  // 짝 고르기 — 잠기지 않은 열린 줄기 중에서. 26일이 지나도록 한 번도 충돌에 못 나와 본 줄기는 크게 앞세운다(끝물 몰아치기).
  function choosePair() {
    const pool = unlockedOpen();
    if (pool.length < 2) return null;
    const sweepOn = S().day >= forceDay();
    const live = pool.map(r => ({ r, s: scoreOf(r) + (sweepOn && !everClashed(r.id) ? 20 : 0) })).sort((x, y) => y.s - x.s);
    const A = live[0].r;
    let best = null, bestV = -Infinity;
    for (const { r, s } of live.slice(1)) {
      const v = s + (related(A.id, r.id) ? 3 : 0) + (pairOf(A.id, r.id) ? 2 : 0);
      if (v > bestV) { bestV = v; best = r; }
    }
    return { A, B: best, n: openRoutes().length };
  }
  // 동시에 돌 수 있는 충돌 수 — 잠기지 않은 열린 줄기가 4개 이상이면 둘, 아니면 하나 (docs/DESIGN_CONVERGENCE.md §5, v0.9.7)
  const capOf = () => (unlockedOpen().length >= 4 ? 2 : 1);

  // ───────── 시작 ─────────
  function start(A, B, n) {
    const st = S();
    const fast = n >= 4 || st.day >= 25;
    const p = pairOf(A.id, B.id);
    const c = { day: st.day, resolveDay: st.day + (fast ? 2 : 3), fast };
    const news = [];
    if (p) {
      Object.keys(st.flags).filter(k => k.startsWith(`tk_${p.key}_`)).forEach(k => delete st.flags[k]);
      Object.assign(c, { key: p.key, a: p.a, b: p.b });
      WS.sys.Effects.apply({ flags: ['tk_clash_active', `tk_${p.key}`], spawn: [{ customer: p.spawn[0], inDays: 0 }, { customer: p.spawn[1], inDays: fast ? 0 : 1 }] });
    } else {
      const [a, b] = [A, B];
      [a, b].forEach(r => ['sup', 'yes', 'caught', 'reported'].forEach(s => delete st.flags[`tk_rt_${r.id}_${s}`]));
      Object.assign(c, { key: null, a: a.id, b: b.id });
      const who = r => (typeof r.appeal === 'function' ? r.appeal(X) : r.appeal);
      WS.sys.Effects.apply({
        flags: ['tk_clash_active', `tk_clvs_${a.id}_${b.id}`, `tk_clvs_${b.id}_${a.id}`],
        spawn: [{ customer: who(a), inDays: 0 }, { customer: who(b), inDays: fast ? 0 : 1 }],
      });
      news.push({ cat: '소문', text: `${WS.sys.News.josa(a.tag, '과')} ${b.tag}, 같은 물자를 두고 맞선다는 말… 상점가 무기점마다 양쪽 사람이 다녀간다` });
    }
    return { c, news };
  }

  // ───────── 결과 ─────────
  // c: 끝난 충돌 하나 (state.clashes 에서 이미 꺼내 온 것 — 이 함수는 그 충돌만 정리한다. 배열 관리는 dawn() 몫)
  function resolve(c) {
    const st = S();
    const A = byId(c.a), B = byId(c.b);
    const p = c.key ? pairs().find(x => x.key === c.key) : null;
    const F = p ? { aSup: `tk_${p.key}_a_sup`, bSup: `tk_${p.key}_b_sup`, aCaught: `tk_${p.key}_a_caught`, bCaught: `tk_${p.key}_b_caught` }
      : { aSup: `tk_rt_${A.id}_sup`, bSup: `tk_rt_${B.id}_sup`, aCaught: `tk_rt_${A.id}_caught`, bCaught: `tk_rt_${B.id}_caught` };
    const aSup = flag(F.aSup), bSup = flag(F.bSup), aC = flag(F.aCaught), bC = flag(F.bCaught);
    let win, how;
    // 충돌 도중 다른 일로 한쪽이 이미 닫혔으면 (섭정 회의의 소탕 등) 남은 쪽이 이긴 것으로 — 닫힌 줄기를 다시 살리지 않는다
    const aShut = flag(A.close), bShut = flag(B.close);
    if (aShut && bShut) { WS.sys.Effects.apply({ flags: ['tk_clash_done'], unflags: ['tk_clash_active', `tk_clvs_${A.id}_${B.id}`, `tk_clvs_${B.id}_${A.id}`] }); return []; }
    if (aShut || bShut) { win = aShut ? 'b' : 'a'; how = 'moot'; }
    else if (bC && !aC) { win = 'a'; how = 'caught'; }
    else if (aC && !bC) { win = 'b'; how = 'caught'; }
    else if (aSup && !bSup) { win = 'a'; how = 'supply'; }
    else if (bSup && !aSup) { win = 'b'; how = 'supply'; }
    else {
      how = aSup && bSup ? 'both' : 'none';
      // 형세: 한쪽 이야기만 이미 절정에 닿았으면(결말 조건이 채워져 있으면) 그쪽 — 도성의 눈은 이미 벌어진 일로 간다.
      //   아니면 손으로 쓴 장면의 byWorld, 없으면 형세의 힘(power + bias)
      const sa = satisfied(A), sb = satisfied(B);
      // 궁정: 편든 후계자가 있고 양쪽에 다 댔으면(궁정을 버리지 않았으니) 궁정이 이긴다 — 궁정은 플레이어가 저쪽만 댔을 때만 진다 (holdsOnBoth)
      const ha = how === 'both' && A.holdsOnBoth && sa, hb = how === 'both' && B.holdsOnBoth && sb;
      if (ha !== hb) win = ha ? 'a' : 'b';
      else if (sa !== sb) win = sa ? 'a' : 'b';
      else if (p && p.byWorld) win = Cn().check(p.byWorld) ? 'a' : 'b';
      else win = worldBias(A) + powerOf(A) >= worldBias(B) + powerOf(B) ? 'a' : 'b';
    }
    const W = win === 'a' ? A : B, L = win === 'a' ? B : A;
    const news = [];
    if (how === 'moot') {
      // 진 쪽은 이미 닫혔다 (그 까닭 기사는 이미 나갔다) — 이긴 쪽의 효과만
      WS.sys.Effects.apply(p ? { vars: (win === 'a' ? p.aWin : p.bWin).vars } : { vars: (W.win || {}).vars });
    } else if (p) {
      WS.sys.Effects.apply(win === 'a' ? p.aWin : p.bWin);
      const n = how === 'caught' && p.caught ? p.caught : how === 'supply' ? (win === 'a' ? p.aNews : p.bNews) : (win === 'a' ? p.aWorld : p.bWorld);
      news.push({ ...n, big: true });
      if (how === 'both') {
        WS.sys.Effects.apply({ flags: [`tk_${p.key}_double`, 'tk_double_dealt'], vars: { reputation: -1, integrity: -1 } });
        news.push(p.double);
      }
    } else {
      const w = W.win || {};
      WS.sys.Effects.apply({ ...w, flags: (w.flags || []).concat([L.close, `tk_rt_${W.id}_won`]) });
      const act = how === 'supply' || how === 'both' ? txt(W.act) : how === 'caught' ? txt(L.caughtAct || W.worldAct) : txt(W.worldAct);
      news.push({ cat: W.cat || '속보', text: `${act}, ${txt(L.fall)}`, big: true });
      if (how === 'both') {
        WS.sys.Effects.apply({ flags: ['tk_double_dealt'], vars: { reputation: -1, integrity: -1 } });
        news.push({ cat: '소문', text: `${A.tag}의 수레와 ${B.tag}의 수레, 같은 가게 각인이라는 소문… "그 집은 누구 편이냐"` });
      }
    }
    if (how === 'supply' && W.supplyWin) WS.sys.Effects.apply(W.supplyWin);
    // 닫힌 까닭 (장부 · 개발 패널 · 결말 책이 읽는다)
    const why = how === 'moot' ? '다른 일로 먼저 닫힘' : how === 'supply' ? `${W.name} 쪽에 물자를 댐` : how === 'caught' ? `${L.name} 쪽 사람을 경비대에 알림` : how === 'both' ? '양쪽에 다 댐 — 형세대로' : '어느 쪽에도 대지 않음 — 형세대로';
    (st.closedWhy = st.closedWhy || {})[L.id] = { day: st.day, by: W.id, how, text: `${L.name} — ${W.name}에 밀려 닫힘 (${why})` };
    // 천칭단 · 박쥐 — 플레이어가 어떻게 댔나
    let backed = how === 'supply' ? W.id : null;
    const bal = byId('balance'), dbl = byId('double');
    if (how === 'supply') {
      if (bal && isLive(bal)) { WS.sys.Effects.apply({ flags: [bal.close] }); news.push({ cat: '소문', text: txt(bal.fall) }); closeWhy(bal, W); }
      if (dbl && isLive(dbl) && (WAR_SIDES.includes(A.id) || WAR_SIDES.includes(B.id))) { WS.sys.Effects.apply({ flags: [dbl.close] }); news.push({ cat: '소문', text: txt(dbl.fall) }); closeWhy(dbl, W); }
    } else if (how === 'both') backed = 'double';
    else if (how === 'none') backed = 'balance';
    WS.sys.Effects.apply({ flags: ['tk_clash_done'], unflags: ['tk_clash_active', `tk_clvs_${A.id}_${B.id}`, `tk_clvs_${B.id}_${A.id}`] });
    (st.clashLog = st.clashLog || []).push({ day: st.day, key: c.key, a: A.id, b: B.id, winner: W.id, loser: L.id, how, backed });
    return news;
  }
  function closeWhy(r, W) {
    (S().closedWhy = S().closedWhy || {})[r.id] = { day: S().day, by: W.id, how: 'supply', text: `${r.name} — ${W.name} 한쪽에만 물자를 대 닫힘` };
  }
  // 형세 판정의 가산: 궁정은 플레이어가 한 후계자라도 편든 적이 있으면 크게 (편든 쪽을 버리지 않았다면 궁정 다툼은 이 가게를 끝까지 붙든다)
  const worldBias = r => (r.bias ? r.bias(X) : 0);

  // ───────── 섭정 회의 (실제 21~22일 — talks.js ⑤) ─────────
  // 그때 왕관을 가장 위협하는 적(regencyEnemies — 닫힌 줄기는 빼고)을 골라, 같은 날 재상과 서부 경비대장(해 질 녘)을 부른다.
  // 적이 뚜렷하지 않으면(sig) 그중 센 쪽을 고르되 경비대장의 말이 누그러진다(tk_rg_mild). 결과는 이틀 뒤 새벽 tk_rg_decide.
  function regency() {
    const st = S();
    if (flag('tk_rg_called') || !flag('interregnum') || flag('crowned')) return [];
    if (!(st.day >= 22 || (st.day === 21 && Math.random() < 0.5))) return [];
    // 이미 닫힌 줄기 · 전쟁이 끝난 적(gone — 이겼거나 졌다)은 빼고
    const list = (WS.data.regencyEnemies || []).filter(e => (!e.close || !flag(e.close)) && !(e.gone || []).some(flag)).map(e => ({ e, t: e.threat(X) })).sort((a, b) => b.t - a.t);
    if (!list.length) return [];
    const en = list[0].e;
    WS.sys.Effects.apply({
      flags: ['tk_rg_called', `tk_rg_enemy_${en.id}`].concat(en.sig(X) ? [] : ['tk_rg_mild']),
      spawn: [{ customer: 'tk_rg_chancellor', inDays: 0 }, { customer: `tk_rg_captain_${en.id}`, inDays: 0 }],
      schedule: [{ event: 'tk_rg_decide', inDays: 2 }],
    });
    return [{ cat: '왕국', text: `섭정 회의 "전쟁이 먼저냐, 왕좌가 먼저냐" — 서부 경비대장은 ${en.name} 소탕을, 재상은 대관식 준비를 먼저 하자며 맞섰다` }];
  }

  // 공급승(실제로 물자를 대 이긴 것)만 센다 — 형세로 이긴 건 "이겼다"기보다 "저쪽이 안 해서"에 가까워 clashClimax 재료로 안 친다
  const supplyWinsOf = id => (S().clashLog || []).filter(l => l.winner === id && l.how === 'supply').length;
  // 몇몇 줄기는 결말 조건이 충돌과 무관한 딴 사건에 걸려 있어 충돌만 거듭 이겨도 결말에 닿을 길이 없다:
  //   · 요정(세 맹세) · 안개 상단(두 번째 계약) — 별도 서사 분기라 아예 못 걸린다 → route.clashClimax = { wins, flags, vars, news } 로 정적으로 켠다.
  //   · 용(재의 산) — dragon_descends(events.js)가 깨고 사흘 뒤 시세를 보고 갈리는데, 용이 25일 가까이 늦게 깨면 그 사흘이 캠페인 끝 뒤로 밀려 아예 못 갈린다
  //     → route.clashClimax = { wins, resolve(X) } 로 events.js 의 문턱(900 · 골렘 450)을 그대로 미리 매겨 준다 (억지 승리가 아니라 "이미 정해진 셈을 앞당겨 본다")
  // 공통: 공급승이 wins 번을 넘고 26일(forceDay)이 지나야 하고, 그 줄기가 여전히 살아 있어야(isLive) 한다. 이미 켜져 있으면 다시 안 켠다.
  function clashClimaxSweep() {
    const news = [];
    if (S().day < forceDay()) return news;
    for (const r of routes()) {
      if (!r.clashClimax || !isLive(r)) continue;
      if (supplyWinsOf(r.id) < (r.clashClimax.wins ?? 2)) continue;
      if (typeof r.clashClimax.resolve === 'function') {
        if (flag(`tk_climax_${r.id}`)) continue;
        const out = r.clashClimax.resolve(X);
        if (!out) continue;
        WS.sys.Effects.apply({ flags: (out.flags || []).concat(`tk_climax_${r.id}`), vars: out.vars || {} });
        if (out.news) news.push({ ...out.news, big: true });
      } else {
        if ((r.clashClimax.flags || []).every(flag)) continue;
        WS.sys.Effects.apply({ flags: r.clashClimax.flags || [], vars: r.clashClimax.vars || {} });
        if (r.clashClimax.news) news.push({ ...r.clashClimax.news, big: true });
      }
    }
    return news;
  }

  // 새벽 — 결과 먼저, 그다음 새 충돌(자리가 남는 만큼 여럿), 그다음 끝물 몰아치기 clashClimax. 기사 배열을 돌려준다 (NewsManager.compose 로)
  function dawn() {
    const st = S();
    st.clashes = st.clashes || [];
    const news = regency();
    // ① 끝난 충돌부터 정리 (하루에 둘 다 끝날 수도 있다)
    const due = st.clashes.filter(c => st.day >= c.resolveDay);
    for (const c of due) news.push(...resolve(c));
    if (due.length) st.clashes = st.clashes.filter(c => !due.includes(c));
    // ② 자리가 남으면 새 충돌을 연다 (열린 줄기가 4개 이상이면 최대 둘 동시에)
    if (st.day >= (cc().start ?? 12) && st.day <= (cc().last ?? 28)) {
      while (st.clashes.length < capOf()) {
        const pick = choosePair();
        if (!pick) break;
        const { c, news: startNews } = start(pick.A, pick.B, pick.n);
        st.clashes.push(c);
        news.push(...startNews);
      }
    }
    // ③ 끝물 — 결말이 딴 사건에 걸려 충돌만으론 못 닿는 줄기를 구제
    news.push(...clashClimaxSweep());
    return news;
  }

  // ───────── 결말 고르기 ─────────
  function routeOf(endingId) {
    return routes().find(r => (r.endings || []).includes(endingId)) || null;
  }
  function pickEnding() {
    const st = S();
    const sat = WS.data.endings.filter(e => e.when && Cn().check(e.when));
    const pers = sat.find(e => PERSONAL.includes(e.id));
    if (pers) return (st.endingWhy = 'personal', pers.id);
    if (!sat.length) return (st.endingWhy = 'none', 'neutral');
    if (sat.length === 1) return (st.endingWhy = 'only', sat[0].id);
    const log = st.clashLog || [];
    for (let i = log.length - 1; i >= 0; i--) {
      for (const rid of [log[i].backed, log[i].winner]) {
        if (!rid) continue;
        const e = sat.find(x => { const r = routeOf(x.id); return r && r.id === rid; });
        if (e) return (st.endingWhy = 'clash', e.id);
      }
    }
    let best = sat[0], bs = -Infinity;
    sat.forEach(e => { const r = routeOf(e.id); const s = r ? scoreOf(r) : -1; if (s > bs) { bs = s; best = e; } });
    return (st.endingWhy = 'score', best.id);
  }

  return { dawn, pickEnding, openRoutes, unlockedOpen, choosePair, routeOf, regency, X };
})();

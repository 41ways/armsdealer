// 지하 도박장 — 노름꾼 카이의 내기를 세 번 받아들이면(flags.casino_open) 영업을 마친 밤마다 갈 수 있다.
// 판돈은 자유(최소 MIN_BET ~ 금고 전부). 게임은 동전 · 야바위 · 주사위 · 룰렛 · 카드 사다리. 모두 기댓값이 1 이하라 오래 하면 잃는다.
// 계산은 여기서만 한다 (UI 는 화면·애니메이션만). 판마다 tele 에 세어 익명 요약에 실린다 (cs_* — stats/README.md).
// 임대료는 영업이 끝날 때 이미 냈으므로 밤에 다 잃어도 그날은 무사하지만, 내일 밤 임대료가 문제다 (DayManager.closeShop).
WS.sys.Casino = (() => {
  const S = () => WS.Game.state;
  const MIN_BET = 10;
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const T = (k, n) => WS.sys.Tele && WS.sys.Tele.bump(k, n);
  const ri = n => Math.floor(Math.random() * n);

  const stats = () => {
    const st = S();
    return st.casino || (st.casino = { rounds: 0, wagered: 0, won: 0, lost: 0, best: 0, pending: null });
  };
  const open = () => !!(S().flags && S().flags.casino_open);
  // 오늘 밤 곧바로 결말로 가는 날(파산 · 압류 · 도박사 수락)에는 도박장에 갈 수 없다
  // ── 감찰관에게 "모른다"고 한 뒤 (flags.casino_denied — js/data/gambler.js gm_inspector) ──
  // 첫 발각(casino_caught1)은 봐준다 → 이튿날 마담 로자가 "경비와 종을 세웠다"고 부른다(casino_guarded) → 다시 가면 마담이 「큰 판」에 끼라고 부른다(bigCallDue)
  // → 동전 던지기 도중 감찰관이 들이닥친다 (casino_arrested → 엔딩 gambling_end 「도박의 끝」)
  const raidDue = () => {
    const f = S().flags;
    return f.casino_denied !== undefined && f.casino_caught1 === undefined ? 1 : 0;
  };
  const bigCallDue = () => {
    const f = S().flags;
    return f.casino_guarded !== undefined && f.casino_arrested === undefined && f.casino_quit === undefined;
  };
  // 문이 닫혀 있다: 첫 발각 뒤 마담의 부름이 있기 전 · 체포된 뒤 · 마담에게 발을 끊겠다고 한 뒤
  const shut = () => {
    const f = S().flags;
    return (f.casino_caught1 !== undefined && f.casino_guarded === undefined) || f.casino_arrested !== undefined || f.casino_quit !== undefined;
  };
  function raid() {
    const n = raidDue();
    if (!n) return 0;
    S().flags['casino_caught' + n] = S().day;
    T('cs_raid');
    if (WS.sys.Save) WS.sys.Save.autosave();
    return n;
  }
  // 큰 판 — 앞뒤를 고르고 동전을 던지는 순간 체포된다. 결과(승패)는 끝내 정해지지 않는다. 던지기 전에 플래그를 켜 두어 새로 불러와도 결말로 간다
  function bigStart(face) {
    if (!bigCallDue() || !['heads', 'tails'].includes(face)) return false;
    S().flags.casino_arrested = S().day;
    T('cs_bigplay');
    if (WS.sys.Save) WS.sys.Save.autosave();
    return true;
  }
  const available = () => open() && !shut() && S().phase === 'closing' && !S().flags.bankrupt && !(WS.sys.Day && WS.sys.Day.endNowLine && WS.sys.Day.endNowLine());
  const canBet = (bet, min = MIN_BET) => Number.isInteger(bet) && bet >= min && bet <= S().gold && !stats().pending;
  const clampBet = (n, min = MIN_BET) => Math.max(min, Math.min(Math.floor(Number(n) || 0), S().gold));

  // 판돈을 낸다 — 이길 때까지 금고에서 뺀 채로 두었다가(pending) 끝나면 돌려받는다
  function stake(game, bet) {
    const c = stats();
    if (bet >= S().gold) T('cs_allin'); // 금고를 통째로 걸었다
    S().gold -= bet;
    c.rounds++; c.wagered += bet;
    T('cs_rounds'); T('cs_wager', bet); T('cs_g_' + game);
    // 단골(3판) · 푹 빠짐(6판) — 패가망신 엔딩이 단골을 본다
    const f = S().flags;
    if (c.rounds >= 3 && f.casino_regular === undefined) f.casino_regular = S().day;
    if (c.rounds >= 6 && f.casino_hooked === undefined) { f.casino_hooked = S().day; }
    if (bet > (c.maxBet || 0)) { c.maxBet = bet; }
  }
  // 판이 끝나 payout(돌려받는 총액, 0 이면 잃음)을 정산한다
  function settle(game, bet, payout, extra) {
    const c = stats();
    S().gold += payout;
    const net = payout - bet;
    if (net > 0) { c.won += net; T('cs_won', net); if (net > c.best) c.best = net; } else if (net < 0) { c.lost -= net; T('cs_lost', -net); }
    c.pending = null;
    if (WS.sys.Save) WS.sys.Save.autosave();
    return { game, bet, payout, net, win: net > 0, ...extra };
  }

  // ───── 동전 던지기 — 앞뒤를 맞히면 두 배. 앞뒤는 반반이 아니다 (48%) ─────
  function coin(bet, side) {
    if (!canBet(bet) || !['heads', 'tails'].includes(side)) return null;
    stake('coin', bet);
    const win = Math.random() < 0.48;
    const face = win ? side : side === 'heads' ? 'tails' : 'heads';
    return settle('coin', bet, win ? bet * 2 : 0, { face, pick: side });
  }

  // ───── 주사위 — 두 개의 합. 낮음(2~6) · 높음(8~12) 은 두 배, 7 은 다섯 배 ─────
  function dice(bet, pick) {
    if (!canBet(bet) || !['low', 'seven', 'high'].includes(pick)) return null;
    stake('dice', bet);
    const a = 1 + ri(6), b = 1 + ri(6), sum = a + b;
    const got = sum < 7 ? 'low' : sum > 7 ? 'high' : 'seven';
    const win = got === pick;
    return settle('dice', bet, win ? bet * (pick === 'seven' ? 5 : 2) : 0, { dice: [a, b], sum, got, pick });
  }

  // ───── 룰렛 — 0~36. 색(빨강·검정)·홀짝은 두 배, 숫자 하나는 서른여섯 배. 0 은 초록 — 색·홀짝은 모두 진다 ─────
  const colorOf = n => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');
  function roulette(bet, pick) {
    // pick: 'red' | 'black' | 'odd' | 'even' | 'n:17'
    const m = /^n:(\d+)$/.exec(pick || '');
    const num = m ? Number(m[1]) : null;
    if (!canBet(bet) || !(['red', 'black', 'odd', 'even'].includes(pick) || (num !== null && num >= 0 && num <= 36))) return null;
    stake('roul', bet);
    const n = ri(37);
    let win, mult = 2;
    if (num !== null) { win = n === num; mult = 36; }
    else if (pick === 'red' || pick === 'black') win = colorOf(n) === pick;
    else win = n !== 0 && (n % 2 === 1) === (pick === 'odd');
    return settle('roul', bet, win ? bet * mult : 0, { n, color: colorOf(n), pick, mult });
  }

  // ───── 야바위 — 공이 든 컵을 눈으로 좇는다. 골랐는데 맞으면 두 배… 인데, 딜러의 손이 스치면 공은 다른 데 있다 (CHEAT) ─────
  const CHEAT = 0.5;
  function shellStart(bet) {
    if (!canBet(bet)) return null;
    stake('shell', bet);
    const n = 8 + ri(3);
    const swaps = [];
    let prev = -1;
    for (let i = 0; i < n; i++) { // 같은 자리 쌍을 연달아 바꾸지 않는다
      let p; do { p = ri(3); } while (p === prev);
      prev = p;
      swaps.push([[0, 1], [1, 2], [0, 2]][p]);
    }
    const sh = { bet, ball: ri(3), swaps };
    stats().pending = { game: 'shell', ...sh };
    return sh;
  }
  // cup: 컵 번호(처음 자리 기준 0~2). 공은 늘 같은 컵 밑에 있다 (딜러가 손대지 않는 한)
  function shellPick(cup) {
    const p = stats().pending;
    if (!p || p.game !== 'shell' || !(cup >= 0 && cup <= 2)) return null;
    let ball = p.ball, cheated = false;
    if (cup === ball && Math.random() < CHEAT) { // 맞혔는데 딜러가 손을 놀렸다
      cheated = true;
      T('cs_cheated');
      ball = [0, 1, 2].filter(x => x !== cup)[ri(2)];
    }
    const win = cup === ball;
    if (cup === p.ball) T('cs_shell_hit'); // 공을 제대로 좇았다 (속임수와 무관하게)
    return settle('shell', p.bet, win ? p.bet * 2 : 0, { pick: cup, ball, cheated });
  }

  // ───── 카드 업다운 (id 는 예전 이름 ladder 그대로) — 카드 한 장(A=1 ~ K=13)을 보고 다음 카드가 높은지 낮은지 맞힌다. 맞힐수록 배율이 쌓이고, 언제든 멈추고 가져간다. 같으면 진다 ─────
  const EDGE = 0.94;
  function ladderOdds(card) {
    const pHi = (13 - card) / 13, pLo = (card - 1) / 13;
    const m = p => (p > 0 ? Math.min(20, Math.round((EDGE / p) * 100) / 100) : 0);
    return { hi: { p: pHi, m: m(pHi) }, lo: { p: pLo, m: m(pLo) } };
  }
  function ladderStart(bet) {
    if (!canBet(bet)) return null;
    stake('ladder', bet);
    const l = { game: 'ladder', bet, card: 1 + ri(13), suit: ri(4), mult: 1, steps: 0 };
    l.hist = [{ n: l.card, s: l.suit }];
    stats().pending = l;
    return l;
  }
  function ladderGuess(dir) {
    const l = stats().pending;
    if (!l || l.game !== 'ladder' || !['hi', 'lo'].includes(dir)) return null;
    const o = ladderOdds(l.card)[dir];
    if (!(o.p > 0)) return null;
    const next = 1 + ri(13), suit = ri(4);
    const win = dir === 'hi' ? next > l.card : next < l.card;
    if (!win) return settle('ladder', l.bet, 0, { from: l.card, next, nextSuit: suit, dir, steps: l.steps, over: true, hist: (l.hist || []).slice() });
    l.prev = l.card; l.card = next; l.suit = suit; l.mult = Math.round(l.mult * o.m * 100) / 100; l.steps++;
    (l.hist = l.hist || []).push({ n: next, s: suit });
    const t = S().tele; if (t && l.steps > (t.cs_ladder_max || 0)) t.cs_ladder_max = l.steps;
    return { game: 'ladder', win: true, over: false, from: l.prev, next, dir, steps: l.steps, mult: l.mult };
  }
  function ladderCash() {
    const l = stats().pending;
    if (!l || l.game !== 'ladder' || l.steps < 1) return null;
    T('cs_stop');
    return settle('ladder', l.bet, Math.floor(l.bet * l.mult), { steps: l.steps, mult: l.mult, cashed: true, hist: (l.hist || []).slice() });
  }

  function markVisit() {
    const st = S();
    const first = st.flags.casino_visited === undefined;
    if (first) st.flags.casino_visited = st.day;
    // 도박장을 찾은 날 수(하루에 몇 번 들어와도 한 번, 문이 열린 그날 밤은 세지 않는다) — 3일이 되면 이튿날 감찰관이 온다 (js/data/gambler.js gm_inspector)
    const c = stats();
    if (c.lastDay !== st.day && st.day > (st.flags.casino_open || 0)) {
      c.lastDay = st.day; c.days = (c.days || 0) + 1;
      T('cs_days');
      if (c.days >= 3 && st.flags.casino_days3 === undefined) st.flags.casino_days3 = st.day;
    }
    T('cs_visits');
    return first;
  }

  return { MIN_BET, open, shut, raidDue, raid, bigCallDue, bigStart, available, canBet, clampBet, stats, coin, dice, roulette, shellStart, shellPick, ladderOdds, ladderStart, ladderGuess, ladderCash, colorOf, markVisit };
})();

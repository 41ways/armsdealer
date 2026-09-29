// 지하 도박장 화면 — 계산은 js/systems/Casino.js, 여기는 그리기와 눌림 · 야바위 애니메이션만.
// UIManager 가 init 으로 render · hud 를 넘기고, closing 화면이 on() 일 때 html() 을 대신 그린다. data-act 는 모두 cs- 로 시작한다.
WS.CasinoView = (() => {
  const U = WS.util;
  const C = () => WS.sys.Casino;
  const S = () => WS.Game.state;
  let host = { render() {}, hud: () => '' };
  let isOn = false, ctx = null, game = null, bet = 50, last = null, intro = false, shell = null;
  let log = [];

  const GAMES = [
    { id: 'coin', name: '동전', icon: '🪙', hint: '앞이냐 뒤냐. 맞히면 두 배.' },
    { id: 'shell', name: '야바위', icon: '🥤', hint: '공이 든 컵을 눈으로 좇아라. 맞히면 두 배.' },
    { id: 'dice', name: '주사위', icon: '🎲', hint: '두 주사위의 합. 낮음·높음 두 배, 7은 다섯 배.' },
    { id: 'roul', name: '룰렛', icon: '🎡', hint: '0~36. 색·홀짝 두 배, 숫자 하나는 서른여섯 배. 0은 다 진다.' },
    { id: 'ladder', name: '카드 사다리', icon: '🃏', hint: '다음 카드가 높은지 낮은지. 맞힐수록 배율이 쌓이고, 언제든 멈춘다. 같으면 진다.' },
    { id: 'vip', name: 'VIP 룸 · 황금 동전', icon: '👑', hint: '위층 큰 판. 최소 200G, 앞뒤를 맞히면 두 배.', vip: true },
  ];
  const SHORT = { coin: '앞이냐 뒤냐', shell: '공 든 컵을 좇아라', dice: '두 주사위의 합', roul: '구슬은 어디에 서나', ladder: '높다 낮다, 멈출 때를 안다', vip: '위층의 큰 판' };
  const NAME = Object.fromEntries(GAMES.map(g => [g.id, g.name]));
  const DIE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const RANK = n => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[n] || String(n));
  const SUIT = ['♠', '♥', '♦', '♣'];
  const sfx = (n, v) => { try { WS.Sfx.play(n, v); } catch (e) { /* 소리가 없어도 진행 */ } };
  const pending = () => C().stats().pending;
  const money = n => `${n < 0 ? '−' : '+'}${Math.abs(n)}G`;

  function init(h) {
    host = h;
    document.addEventListener('input', e => { if (e.target && e.target.id === 'cs-bet') bet = Number(e.target.value) || 0; });
  }
  // 열어 둔 판(state)·날이 바뀌면 저절로 닫힌다 — 새 판·다음 날에 도박장이 남아 있지 않게
  const on = () => isOn && !!ctx && ctx.st === S() && ctx.day === S().day && C().available();

  // ───────── 화면 ─────────
  function html() {
    const st = S(), c = C(), p = pending();
    if (p && p.game === 'shell' && !shell) shell = { bet: p.bet, ball: p.ball, swaps: p.swaps, slot: [0, 1, 2], phase: 'pick', res: null }; // 새로 불러온 판 — 섞는 건 못 봤다
    if (!p && shell && !shell.res) shell = null;
    const rent = WS.sys.Day.rent();
    if (p) game = p.game; // 불러온 판이 진행 중이면 그 테이블에 앉은 채로
    if (game === null || (game === 'vip' && !c.vipOpen())) { game = null; return lobby(); }
    const g = GAMES.find(x => x.id === game);
    const seat = `<div class="cs-seat"><button class="mini" data-act="cs-lobby" ${p ? 'disabled' : ''}>← 테이블 고르기</button><b>${g.icon} ${U.esc(g.name)}</b></div>`;
    const body = panel(p);
    const res = last ? resultLine(last) : '';
    return `<div class="casino">
      <div class="cs-head">
        <h2>검은 주사위 <small>지하 도박장</small></h2>
        <div class="cs-purse"><span>금고</span><b>${st.gold}G</b><em class="${st.gold < rent ? 'bad' : ''}">내일 밤 임대료 ${rent}G</em></div>
      </div>
      ${intro ? '<p class="cs-door">문지기가 손을 내민다. “카이가 보냈소? …들어오시오. 판돈은 마음대로, 나갈 때도 마음대로요.”</p>' : ''}
      ${seat}
      <p class="cs-hint">${U.esc(g.hint)}</p>
      <div class="cs-table">${body}</div>
      ${res}
      ${stakeBox(p)}
      ${log.length ? `<ul class="cs-log">${log.slice(-6).reverse().map(l => `<li class="${l.net > 0 ? 'w' : l.net < 0 ? 'l' : ''}">${U.esc(l.text)}</li>`).join('')}</ul>` : ''}
      <div class="cs-foot"><button class="pbtn wide" data-act="cs-leave" ${p ? 'disabled' : ''}>${p ? '판이 끝나야 나갈 수 있다' : '도박장을 나선다'}</button></div>
    </div>${host.hud()}`;
  }

  // ───── 로비 — 어느 테이블에 앉을지 ─────
  function lobby() {
    const st = S(), c = C();
    const rent = WS.sys.Day.rent();
    const cards = GAMES.map(g => {
      const locked = g.vip && !c.vipOpen();
      const min = g.vip ? c.VIP_MIN : c.MIN_BET;
      return `<button class="cs-tcard ${locked ? 'locked' : ''} ${g.vip ? 'vip' : ''}" ${locked ? 'disabled' : `data-act="cs-game" data-id="${g.id}"`}>
        <span class="cs-timg"><img src="assets/casino/table_${g.id}.png" alt="" draggable="false" onerror="this.remove()"><i>${g.icon}</i></span>
        <b>${U.esc(g.name)}</b><small>${locked ? '초청장이 있어야 앉는다' : U.esc(SHORT[g.id])}</small><em>${locked ? '🔒' : `최소 ${min}G`}</em></button>`;
    }).join('');
    return `<div class="casino cs-lobby">
      <div class="cs-banner"><img src="assets/casino/lobby.jpg" alt="" draggable="false" onerror="this.remove()"><h2>검은 주사위 <small>지하 도박장</small></h2></div>
      <div class="cs-purse cs-purse-l"><span>금고</span><b>${st.gold}G</b><em class="${st.gold < rent ? 'bad' : ''}">내일 밤 임대료 ${rent}G</em></div>
      ${intro ? '<p class="cs-door">문지기가 손을 내민다. “카이가 보냈소? …들어오시오. 판돈은 마음대로, 나갈 때도 마음대로요.”</p>' : ''}
      <p class="cs-ask">어느 테이블에 앉겠소?</p>
      <div class="cs-tcards">${cards}</div>
      <div class="cs-foot"><button class="pbtn wide" data-act="cs-leave">도박장을 나선다</button></div>
    </div>${host.hud()}`;
  }

  function stakeBox(p) {
    if (p || (shell && shell.res)) return '';
    const st = S();
    const min = game === 'vip' ? C().VIP_MIN : C().MIN_BET;
    if (st.gold < min) return `<div class="cs-stake"><p class="cs-broke">판돈으로 걸 돈이 없다. 이 테이블은 최소 ${min}G다.</p></div>`;
    const b = C().clampBet(bet, min);
    const chip = (label, id) => `<button class="mini cs-chip" data-act="cs-chip" data-id="${id}">${label}</button>`;
    return `<div class="cs-stake">
      <label for="cs-bet">판돈</label>
      <input id="cs-bet" type="number" inputmode="numeric" min="${min}" max="${st.gold}" step="10" value="${b}"> <span>G</span>
      <div class="cs-chips">${chip('10', '10')}${chip('50', '50')}${chip('100', '100')}${chip('500', '500')}${chip('절반', 'half')}${chip('전부', 'all')}</div>
    </div>`;
  }

  const btn = (label, id, cls = '') => `<button class="pbtn cs-play ${cls}" data-act="cs-play" data-id="${id}">${label}</button>`;
  function panel(p) {
    const r = last && last.game === game && !p ? last : null;
    if (game === 'coin' || game === 'vip') {
      const face = r ? `<div class="cs-coin ${r.face} flip">${r.face === 'heads' ? '앞' : '뒤'}</div>` : '<div class="cs-coin idle">?</div>';
      return `${face}<div class="cs-row">${btn('앞면 ×2', 'heads', game === 'vip' ? 'gold' : '')}${btn('뒷면 ×2', 'tails', game === 'vip' ? 'gold' : '')}</div>`;
    }
    if (game === 'dice') {
      const dice = r ? `<div class="cs-dice">${r.dice.map(d => `<span class="cs-die roll">${DIE[d]}</span>`).join('')}<b>${r.sum}</b></div>` : '<div class="cs-dice"><span class="cs-die">⚀</span><span class="cs-die">⚁</span></div>';
      return `${dice}<div class="cs-row">${btn('낮음 2~6 ×2', 'low')}${btn('럭키 7 ×5', 'seven', 'gold')}${btn('높음 8~12 ×2', 'high')}</div>`;
    }
    if (game === 'roul') {
      const wheel = r ? `<div class="cs-ball-num ${r.color} spin">${r.n}</div>` : '<div class="cs-ball-num idle">·</div>';
      return `${wheel}<div class="cs-row">${btn('빨강 ×2', 'red', 'red')}${btn('검정 ×2', 'black', 'black')}${btn('홀 ×2', 'odd')}${btn('짝 ×2', 'even')}</div>
        <div class="cs-row cs-num"><label for="cs-n">숫자 하나에 ×36</label><input id="cs-n" type="number" min="0" max="36" value="${last && last.game === 'roul' && last.pick.startsWith('n:') ? last.pick.slice(2) : 7}">${btn('이 숫자에 건다', 'num', 'gold')}</div>`;
    }
    if (game === 'shell') return shellPanel(p);
    return ladderPanel(p);
  }

  // ───── 야바위 ─────
  function shellPanel(p) {
    if (!shell) {
      const r = last && last.game === 'shell' ? last : null;
      return `<div class="cs-shell idle">${[0, 1, 2].map(i => `<div class="cs-slot" style="--slot:${i}"><div class="cs-cup"></div></div>`).join('')}</div>
        <div class="cs-row">${btn('판을 건다 ×2', 'start')}</div>${r ? '' : '<p class="cs-note">공을 보여 준 뒤 컵을 섞는다. 눈을 떼지 말 것.</p>'}`;
    }
    const s = shell, reveal = !!s.res;
    const ball = reveal ? s.res.ball : s.ball;
    const cups = [0, 1, 2].map(i => {
      const lift = (s.phase === 'show' && i === s.ball) || reveal;
      const mine = reveal && i === s.res.pick;
      const click = s.phase === 'pick' ? `data-act="cs-cup" data-id="${i}"` : '';
      return `<div class="cs-slot ${lift ? 'lift' : ''} ${mine ? 'mine' : ''} ${s.phase === 'pick' ? 'pickable' : ''}" data-cup="${i}" style="--slot:${s.slot[i]}" ${click}>${i === ball ? '<div class="cs-ball"></div>' : ''}<div class="cs-cup"></div></div>`;
    }).join('');
    const msg = reveal ? '' : s.phase === 'show' ? '공은 여기 있다…' : s.phase === 'shuffle' ? '눈을 떼지 마라' : '어느 컵이냐?';
    const after = reveal ? `<div class="cs-row">${btn('한 판 더', 'again')}</div>` : '';
    return `<div class="cs-shell ${s.phase}">${cups}</div><p class="cs-note cs-shell-msg">${msg}</p>${after}`;
  }
  function shellApply() {
    if (!shell) return;
    document.querySelectorAll('.cs-slot[data-cup]').forEach(el => {
      const i = Number(el.dataset.cup);
      el.style.setProperty('--slot', shell.slot[i]);
      el.classList.toggle('lift', (shell.phase === 'show' && i === shell.ball) || !!shell.res);
      el.classList.toggle('pickable', shell.phase === 'pick');
      if (shell.phase === 'pick') { el.dataset.act = 'cs-cup'; el.dataset.id = i; } else { delete el.dataset.act; delete el.dataset.id; }
    });
    const box = document.querySelector('.cs-shell'), m = document.querySelector('.cs-shell-msg');
    if (box) box.className = `cs-shell ${shell.phase}`;
    if (m) m.textContent = shell.phase === 'show' ? '공은 여기 있다…' : shell.phase === 'shuffle' ? '눈을 떼지 마라' : '어느 컵이냐?';
  }
  function shellRun() {
    const s = shell, MS = 380;
    const step = () => {
      if (shell !== s || s.res) return;
      if (s.phase === 'show') { s.phase = 'shuffle'; s.i = 0; shellApply(); setTimeout(step, 550); return; }
      if (s.i < s.swaps.length) {
        const [a, b] = s.swaps[s.i++];
        const ia = s.slot.indexOf(a), ib = s.slot.indexOf(b);
        s.slot[ia] = b; s.slot[ib] = a;
        sfx('latch', 0.25);
        shellApply(); setTimeout(step, MS); return;
      }
      s.phase = 'pick'; shellApply();
    };
    setTimeout(step, 1300);
  }

  // ───── 카드 사다리 ─────
  const cardHtml = (n, k, cls = '') => `<div class="cs-card ${cls} ${[1, 2].includes(k % 4) ? 'red' : ''}"><b>${RANK(n)}</b><i>${SUIT[k % 4]}</i></div>`;
  function ladderPanel(p) {
    const l = p && p.game === 'ladder' ? p : null;
    if (!l) {
      const r = last && last.game === 'ladder' ? last : null;
      const shown = r ? `<div class="cs-cards">${cardHtml(r.from, r.steps)}<span class="cs-arrow">→</span>${r.over ? cardHtml(r.next, r.steps + 1, 'flip') : ''}</div>` : '<div class="cs-cards"><div class="cs-card idle"><b>?</b></div></div>';
      return `${shown}<div class="cs-row">${btn('카드를 뽑는다', 'start')}</div><p class="cs-note">맞힐수록 배율이 곱해진다. 한 번 맞히면 그때부터 가져갈 수 있다.</p>`;
    }
    const o = C().ladderOdds(l.card);
    const pct = x => `${Math.round(x.p * 100)}%`;
    const cur = Math.floor(l.bet * l.mult);
    const prev = l.steps ? `<span class="cs-arrow">←</span>${cardHtml(l.prev, l.steps - 1, 'small')}` : '';
    return `<div class="cs-cards">${cardHtml(l.card, l.steps, 'flip')}${prev}</div>
      <p class="cs-mult">배율 ×${l.mult} · 지금 가져가면 <b>${cur}G</b> <small>(판돈 ${l.bet}G)</small></p>
      <div class="cs-row">
        <button class="pbtn cs-play" data-act="cs-guess" data-id="hi" ${o.hi.p > 0 ? '' : 'disabled'}>더 높다 ×${o.hi.m} <small>${pct(o.hi)}</small></button>
        <button class="pbtn cs-play" data-act="cs-guess" data-id="lo" ${o.lo.p > 0 ? '' : 'disabled'}>더 낮다 ×${o.lo.m} <small>${pct(o.lo)}</small></button>
        <button class="pbtn gold" data-act="cs-cash" ${l.steps ? '' : 'disabled'}>가져간다 +${cur}G</button>
      </div>`;
  }

  // ───── 결과 한 줄 ─────
  const SAY = {
    win: ['오늘은 당신 날이군.', '…운이 좋소.', '한 판 더 하시겠소?', '딜러가 이를 간다.'],
    lose: ['아깝게 됐소.', '판은 원래 그런 거요.', '다음엔 되겠지.', '딜러가 슬쩍 웃는다.'],
  };
  const pickSay = w => SAY[w][Math.floor(Math.random() * SAY[w].length)];
  function resultLine(r) {
    if (r.game !== game) return '';
    if (r.game === 'ladder' && !r.over && !r.payout) return ''; // 진행 중
    const win = r.net > 0;
    let extra = '';
    if (r.game === 'shell' && r.cheated) extra = ' 공은 분명 그 컵 밑이었는데… 딜러의 손이 스쳤다.';
    else if (r.game === 'shell' && !win) extra = ' 컵을 잘못 골랐다.';
    if (r.game === 'roul') extra = ` 구슬은 ${r.n}번 (${r.color === 'red' ? '빨강' : r.color === 'black' ? '검정' : '초록'}).`;
    if (r.game === 'ladder' && r.over) extra = ` ${RANK(r.from)} 다음은 ${RANK(r.next)}.`;
    if (r.game === 'ladder' && r.cashed) extra = ` ${r.steps}번 맞히고 손을 뗐다 (×${r.mult}).`;
    return `<p class="cs-result ${win ? 'w' : r.net < 0 ? 'l' : ''}"><b>${money(r.net)}</b>${U.esc(extra)} ${U.esc(pickSay(win ? 'win' : 'lose'))}</p>`;
  }
  function record(r) {
    last = r;
    log.push({ net: r.net, text: `${NAME[r.game]} ${r.bet}G → ${r.net > 0 ? `+${r.net}G` : r.net < 0 ? `−${-r.net}G` : '본전'}` });
    sfx(r.net > 0 ? (Math.random() < 0.5 ? 'coins' : 'coins2') : 'door_close', r.net > 0 ? 0.8 : 0.3);
  }

  // ───────── 눌림 ─────────
  const readBet = () => {
    const el = document.getElementById('cs-bet');
    const min = game === 'vip' ? C().VIP_MIN : C().MIN_BET;
    const v = C().clampBet(el ? el.value : bet, min);
    return S().gold >= min ? v : 0;
  };
  function act(b) {
    const a = b.dataset.act, id = b.dataset.id, c = C();
    switch (a) {
      case 'cs-open': isOn = true; ctx = { st: S(), day: S().day }; game = null; last = null; shell = null; intro = c.markVisit(); break;
      case 'cs-leave': if (pending()) return; isOn = false; intro = false; last = null; shell = null; break;
      case 'cs-game': if (pending() || (id === 'vip' && !c.vipOpen())) return; game = id; last = null; shell = null; intro = false; break;
      case 'cs-lobby': if (pending()) return; game = null; last = null; shell = null; break;
      case 'cs-chip': {
        const g = S().gold;
        const mn = game === 'vip' ? c.VIP_MIN : c.MIN_BET;
        bet = id === 'half' ? Math.max(mn, Math.floor(g / 2)) : id === 'all' ? g : Math.min(g, Math.max(mn, Number(id)));
        break;
      }
      case 'cs-play': {
        intro = false;
        bet = readBet();
        if (!bet) return;
        if (game === 'shell') {
          if (id === 'again') { shell = null; last = null; break; }
          const sh = c.shellStart(bet);
          if (!sh) return;
          last = null;
          shell = { bet: sh.bet, ball: sh.ball, swaps: sh.swaps, slot: [0, 1, 2], phase: 'show', res: null };
          host.render(); shellRun(); return;
        }
        if (game === 'ladder') { if (!c.ladderStart(bet)) return; last = null; break; }
        let r = null;
        if (game === 'coin') r = c.coin(bet, id);
        else if (game === 'vip') r = c.vip(bet, id);
        else if (game === 'dice') r = c.dice(bet, id);
        else if (game === 'roul') {
          const n = document.getElementById('cs-n');
          r = c.roulette(bet, id === 'num' ? `n:${Math.max(0, Math.min(36, Math.floor(Number(n && n.value) || 0)))}` : id);
        }
        if (!r) return;
        record(r);
        break;
      }
      case 'cs-cup': {
        if (!shell || shell.phase !== 'pick' || shell.res) return;
        const r = c.shellPick(Number(id));
        if (!r) return;
        shell.res = r; shell.phase = 'reveal';
        record(r);
        break;
      }
      case 'cs-guess': {
        const r = c.ladderGuess(id);
        if (!r) return;
        if (r.over) record(r); else sfx('latch', 0.4);
        break;
      }
      case 'cs-cash': { const r = c.ladderCash(); if (r) record(r); break; }
      default: return;
    }
    host.render();
  }

  // 지하 도박장이 처음 열린 순간 — 화면 위에서 알림창이 내려온다 (카이의 세 번째 내기 뒤)
  function afterRender() {
    const st = S();
    if (!st || !st.flags || st.replay || !st.flags.casino_open || st.flags.casino_notified !== undefined) return;
    if (!['morning', 'prep', 'shop', 'closing', 'night'].includes(st.phase)) return; // 타이틀·결말 화면에서는 띄우지 않는다
    st.flags.casino_notified = st.day;
    const el = document.createElement('div');
    el.className = 'cs-notice';
    el.setAttribute('role', 'status');
    el.innerHTML = '<i>🎲</i><span><b>지하 도박장이 해금되었습니다</b><small>영업이 끝나면 「검은 주사위」에 갈 수 있다</small></span>';
    const off = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
    el.addEventListener('click', off);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(off, 7000);
    sfx('coins', 0.5);
  }

  return { init, html, act, on, pending, afterRender };
})();

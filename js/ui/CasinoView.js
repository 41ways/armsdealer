// 지하 도박장 화면 — 계산은 js/systems/Casino.js, 여기는 그리기와 눌림 · 야바위 애니메이션만.
// UIManager 가 init 으로 render · hud 를 넘기고, closing 화면이 on() 일 때 html() 을 대신 그린다. data-act 는 모두 cs- 로 시작한다.
WS.CasinoView = (() => {
  const U = WS.util;
  const C = () => WS.sys.Casino;
  const S = () => WS.Game.state;
  let host = { render() {}, hud: () => '' };
  let isOn = false, ctx = null, raidN = 0, big = null, game = null, bet = 50, last = null, shell = null;
  let fx = null; // 승패 연출 — record() 가 켜고 다음 한 번의 그리기에서 쓴다 {kind:'win'|'jackpot'|'lose'|'push', delay}
  let enter = null; // 입장 연출 — {stage:'descend'|'door', first} · 문지기 문답은 첫 입장에만
  let log = [];

  const GAMES = [
    { id: 'coin', name: '동전', icon: '🪙', hint: '앞이냐 뒤냐. 맞히면 두 배.' },
    { id: 'shell', name: '야바위', icon: '🥤', hint: '공이 든 컵을 눈으로 좇아라. 맞히면 두 배.' },
    { id: 'dice', name: '주사위', icon: '🎲', hint: '두 주사위의 합. 낮음·높음 두 배, 7은 다섯 배.' },
    { id: 'roul', name: '룰렛', icon: '🎡', hint: '0~36. 색·홀짝 두 배, 숫자 하나는 서른여섯 배. 0은 다 진다.' },
    { id: 'ladder', name: '카드 업다운', icon: '🃏', hint: '다음 카드가 높을까 낮을까. 맞힐수록 배율이 불어나고, 언제든 멈추고 가져간다. 같은 숫자면 진다.' },
  ];
  const SHORT = { coin: '앞이냐 뒤냐', shell: '공 든 컵을 좇아라', dice: '두 주사위의 합', roul: '구슬은 어디에 서나', ladder: '높을까 낮을까' };
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
  const on = () => isOn && !!ctx && ctx.st === S() && ctx.day === S().day && (!!raidN || !!big || C().available());

  // ───────── 화면 ─────────
  // ───── 단속 — 감찰관에게 모른다고 한 뒤 도박장에 가면 (Casino.raidDue) ─────
  // 컷씬 그림 — 장면마다 따로 그린 것 (제미나이, tools/casino_scene.py 로 워터마크 지움 · 1280×714)
  const ART = {
    raid: 'assets/casino/raid.jpg',     // 첫 단속 — 문간에서 한숨 쉬는 감찰관 마크, 엎어진 탁자
    bell: 'assets/casino/bell.jpg',     // 줄이 잘린 새 종 · 손이 묶인 경비 둘
    big: 'assets/casino/bigtable.jpg',  // 큰 판 — 금화 산 너머의 마담 로자
    burst: 'assets/casino/burst.jpg',   // 급습 — 부서지는 문, 쏟아져 들어오는 병사, 허공의 동전
    guarded: 'assets/casino/entry_guarded.jpg', // 큰 판 날 — 마담이 말한 경비 둘과 새 종이 계단에 (제미나이)
    arrest: 'assets/casino/arrest.jpg',   // 큰 판 앞의 감찰관 마크, 허공의 동전 (제미나이, inspector_theo 외형)
  };
  // 말하는 사람 얼굴 — 손님 표정 시트(js/data/sheets.js)의 한 칸
  function face(look, frame = 'talk') {
    const sh = WS.data.sheets && WS.data.sheets[look];
    if (!sh) return '';
    const n = sh.frames.length, i = Math.max(0, sh.frames.indexOf(frame));
    return `<i class="cs-face" aria-hidden="true" style="background-image:url('${sh.src}');background-size:${n * 100}% 100%;background-position:${(i / (n - 1) * 100).toFixed(3)}% 0;aspect-ratio:${sh.fw} / ${sh.fh}"></i>`;
  }
  const say = (look, frame, who, line, tail) => `<p class="cs-say has-face" ${tail ? `style="--tail:${tail}%"` : ''}>${face(look, frame)}<span><b>${U.esc(who)}</b>${U.esc(line)}</span></p>`; // 칸 아래 말풍선 (css: .cs-say)
  // 만화 한 칸: 그림 + (칸 아래 모서리에 걸친) 해설 상자. 대사는 say() 가 칸 아래 말풍선으로
  // 좁은 화면에서 그림 양옆이 잘릴 때 남길 곳 (가로 %) — 인물이 한쪽에 있는 그림
  const FOCUS = { 'raid.jpg': 20, 'burst.jpg': 32, 'arrest.jpg': 62, 'bell.jpg': 40, 'entry_door.jpg': 50 };
  const focus = src => FOCUS[src.split('/').pop()];
  const scene = (src, cls, inner = '', cap = '') => `<figure class="cs-panel"><div class="cs-scene ${cls || ''}"><img src="${src}" alt="" draggable="false" onerror="this.remove()" ${focus(src) !== undefined ? `style="object-position:${focus(src)}% 50%"` : ''}>${inner}</div>${cap ? `<figcaption class="cs-cap">${U.esc(cap)}</figcaption>` : ''}</figure>`;
  // ───── 입장 — 돌계단을 내려가 문지기를 만난다 (그림: assets/casino/entry_*.jpg, 제미나이) · 문지기 문답은 첫 입장에만 ─────
  const ENTER_LINE = {
    descend: {
      first: '카이가 일러준 골목 끝, 낡은 철문 뒤로 돌계단이 어둠 속으로 굽어 내려간다. 축축한 벽을 타고 낮은 웃음소리와 짤그랑거리는 소리가 새어 올라온다.',
      more: '낯익은 돌계단을 다시 내려간다.',
    },
    door: '돌계단 끝, 육중한 나무문 앞에 문지기가 말없이 서 있다. 횃불이 얼굴의 반쪽만 비춘다.',
  };
  function enterView() {
    const e = enter, first = e.first;
    if (e.stage === 'guarded') {
      return `<div class="casino cs-cine cs-enter">
        ${scene(ART.guarded, 'cs-dolly cs-guardshot', '', '계단 위쪽 벽에 새 놋쇠 종이 걸렸다. 창을 세운 경비 둘이 고개를 끄덕인다.')}
        <p class="cs-think">마담 로자의 말대로다. 오늘 밤은 걱정할 것 없다.</p>
        <div class="cs-foot"><button class="pbtn wide" data-act="cs-enter-next">→ 내려간다</button></div>
      </div>${host.hud()}`;
    }
    if (e.stage === 'door') {
      return `<div class="casino cs-cine cs-enter cs-enter-door">
        ${scene('assets/casino/entry_door.jpg', 'cs-dolly', '', ENTER_LINE.door)}
        <p class="cs-say"><span><b>문지기</b>“카이가 보냈소? …들어오시오. 판돈은 마음대로, 나갈 때도 마음대로요.”</span></p>
        <div class="cs-foot"><button class="pbtn wide" data-act="cs-enter-next">→ 들어선다</button></div>
      </div>${host.hud()}`;
    }
    return `<div class="casino cs-cine cs-enter cs-enter-descend ${first ? '' : 'quick'}" ${first ? '' : 'data-act="cs-enter-next"'}>
      ${scene('assets/casino/entry_stairs.jpg', 'cs-dolly', '', first ? ENTER_LINE.descend.first : ENTER_LINE.descend.more)}
      ${first ? `<div class="cs-foot"><button class="pbtn wide" data-act="cs-enter-next">→ 내려간다</button></div>` : ''}
    </div>${host.hud()}`;
  }
  function enterAdvance() {
    if (!enter) return;
    if (enter.stage === 'descend') { if (enter.first) enter = { stage: 'door', first: true }; else enter = null; }
    else enter = null; // 'door' · 'guarded' 다음은 홀
  }
  // 이후 입장(문지기 문답 없음)은 계단 장면을 클릭 없이도 짧게 지나간다 — 급한 손님은 눌러서 건너뛸 수 있다
  function enterAutoRun() {
    const e = enter;
    sfx('creak', 0.35);
    setTimeout(() => { if (enter !== e) return; enterAdvance(); host.render(); }, 900);
  }

  const RAID = {
    1: {
      narr: '문이 걷어차여 열린다. 딜러가 판을 엎고, 손님들이 벽을 타고 흩어진다. 문간에 감찰관 마크가 서 있다.',
      who: '감찰관 마크',
      line: '“…밤엔 문 닫고 자서 모른다더니, 자네였군.” (한숨을 쉰다) “이번 한 번은 못 본 걸로 해 주겠소. 다음엔 없소.”',
    },
  };
  function raidView() {
    const r = RAID[raidN];
    return `<div class="casino cs-cine cs-raidscene cs-stagger">
      ${scene(ART.raid, 'shake', '<b class="cs-scene-title">단속!</b>', r.narr)}
      ${say('inspector_theo', 'angry', r.who, r.line, 17)}
      <div class="cs-foot"><button class="pbtn wide" data-act="cs-leave">잠자리로 돌아간다 →</button></div>
    </div>${host.hud()}`;
  }

  // ───── 큰 판 — 마담의 부름(Casino.bigCallDue). 동전이 튕기는 동안 감찰관이 들이닥친다 (Casino.bigStart → 엔딩 「도박의 끝」) ─────
  function bigView() {
    const b = big;
    const coin = cls => `<div class="cs-coin big ${b.face === "tails" ? "tails" : ""} ${cls}">${b.face === 'tails' ? '뒤' : '앞'}</div>`;
    if (b.stage === 'intro') {
      return `<div class="casino cs-cine cs-big">
        ${scene(ART.big, '', '<b class="cs-scene-title">큰 판</b>', '홀 한가운데, 금화가 산처럼 쌓인 탁자. 손님들이 숨을 죽이고 둘러섰다.')}
        ${say('madam', 'happy', '마담 로자', '“판돈은 당신의 전부예요. 한 번 던져서, 끝내요.”', 48)}
        <p class="cs-sys">승리하면 승리 엔딩, 패배하면 패배 엔딩으로 이어집니다.</p>
        <div class="cs-row">${btn('앞면', 'heads', 'gold')}${btn('뒷면', 'tails', 'gold')}</div>
        <div class="cs-foot"><button class="pbtn wide" data-act="cs-big-back">…아직 이르다</button></div>
      </div>${host.hud()}`;
    }
    if (b.stage === 'toss') {
      return `<div class="casino cs-cine cs-big tossing">
        ${scene(ART.big, 'dim heart', coin('air on-scene'), '동전이 허공으로 튕긴다…')}
      </div>${host.hud()}`;
    }
    if (b.stage === 'burst') {
      return `<div class="casino cs-cine cs-big burst">
        ${scene(ART.burst, 'flash shake burstshot', '<b class="cs-scene-title cs-sfx">콰직</b>')}
      </div>${host.hud()}`;
    }
    // 계단의 종 — 마담이 세웠다던 경비와 종. 경비는 이미 묶여 있고, 종은 울리지 않았다 (엔딩 앨범 그림)
    if (b.stage === 'bell') {
      return `<div class="casino cs-cine cs-big bell" data-act="cs-big-next">
        ${scene(ART.bell, 'cs-bellshot', '', '종은 끝내 울리지 않았다. 마담이 세웠다던 경비들은 벌써 손이 묶인 채 벽에 기대앉아 있었다.')}
        <p class="cs-tap">눌러서 넘기기</p>
      </div>${host.hud()}`;
    }
    return `<div class="casino cs-cine cs-big arrest cs-stagger">
      ${scene(ART.arrest, '', '<b class="cs-scene-title">현행범</b>', '병사들이 홀을 채웠다. 동전은 허공에 뜬 채, 이제 아무도 그것을 보지 않는다.')}
      ${say('inspector_theo', 'angry', '감찰관 마크', '“움직이지 마시오. 현행범이오.” (수갑을 꺼낸다) “운이 나빠서 걸린 줄 아십니까? 당신은 함구했을지라도, 다른 이들은 아니었소.”', 60)}
      <div class="cs-foot"><button class="pbtn wide" data-act="cs-big-end">끌려간다</button></div>
    </div>${host.hud()}`;
  }
  function bigRun(face) {
    const b = big = { stage: 'toss', face };
    sfx('latch', 0.5);
    setTimeout(() => { if (big !== b) return; b.stage = 'burst'; sfx('door_open', 0.9); sfx('blade', 0.6); host.render(); }, 2300);
    setTimeout(() => { if (big !== b) return; b.stage = 'bell'; host.render(); }, 3700);
    setTimeout(() => { if (big !== b || b.stage !== 'bell') return; b.stage = 'arrest'; host.render(); }, 9000); // 종 장면은 해설을 읽을 만큼 (눌러서 넘길 수 있다)
  }

  // 지금 그리는 화면 이름 — 바뀐 첫 그리기에서만 들어오는 효과(.cs-in)를 붙인다 (칩·판돈을 누를 때마다 효과가 다시 돌지 않게)
  let viewKey = '', lastKey = '';
  const viewOf = () => (raidN ? 'raid' : big ? `big:${big.stage}` : enter ? `enter:${enter.stage}` : game === null && !pending() ? 'lobby' : `table:${pending() ? pending().game : game}`);
  function html() {
    viewKey = viewOf();
    const out = htmlInner();
    const fresh = viewKey !== lastKey;
    lastKey = viewKey;
    return fresh ? out.replace('<div class="casino', '<div class="cs-in casino') : out;
  }
  function htmlInner() {
    if (raidN) return raidView();
    if (big) return bigView();
    if (enter) return enterView();
    const st = S(), c = C(), p = pending();
    if (p && p.game === 'shell' && !shell) shell = { bet: p.bet, ball: p.ball, swaps: p.swaps, slot: [0, 1, 2], phase: 'pick', res: null }; // 새로 불러온 판 — 섞는 건 못 봤다
    if (!p && shell && !shell.res) shell = null;
    const rent = WS.sys.Day.rent();
    if (p) game = p.game; // 불러온 판이 진행 중이면 그 테이블에 앉은 채로
    if (game === null) return lobby();
    const g = GAMES.find(x => x.id === game);
    const seat = `<div class="cs-seat"><button class="mini" data-act="cs-lobby" ${p ? 'disabled' : ''}>← 홀로</button><img src="assets/casino/table_${g.id}.png" alt="" draggable="false" onerror="this.remove()"><b>${g.icon} ${U.esc(g.name)}</b></div>`;
    const f = fx; fx = null;
    const body = panel(p, !!f);
    const res = last ? resultLine(last, !!f) : '';
    return `<div class="casino ${f ? `fx-${f.kind}` : ''}" style="--fxd:${f ? f.delay : 0}s">
      <div class="cs-head">
        <h2>검은 주사위 <small>지하 도박장</small></h2>
        <div class="cs-purse"><span>금고</span><b>${st.gold}G</b><em class="${st.gold < rent ? 'bad' : ''}">내일 밤 임대료 ${rent}G</em></div>
      </div>
      ${seat}
      <p class="cs-hint">${U.esc(g.hint)}</p>
      <div class="cs-table t-${game}">${body}${f ? fxHtml(f) : ''}</div>
      <div class="cs-resslot">${res}</div>
      ${stakeBox(p)}
      <ul class="cs-log">${log.slice(-4).reverse().map(l => `<li class="${l.net > 0 ? 'w' : l.net < 0 ? 'l' : ''}">${U.esc(l.text)}</li>`).join('')}</ul>
      <div class="cs-foot"><button class="pbtn wide" data-act="cs-leave" ${p ? 'disabled' : ''}>${p ? '판이 끝나야 나갈 수 있다' : '도박장을 나선다 (다음 날로) →'}</button></div>
    </div>${host.hud()}`;
  }

  // ───── 로비 — 어느 테이블에 앉을지 ─────
  // 홀 그림 위의 테이블 자리 — [게임, left%, top%, width%, height%] (assets/casino/lobby.jpg 1280×714 기준)
  const HALL = [
    ['coin', 6.5, 63, 12.5, 22],
    ['shell', 27, 38, 11, 31],
    ['dice', 35.5, 59.5, 17, 23.5],
    ['roul', 54.5, 57, 20, 33],
    ['ladder', 75.5, 70, 21, 28],
  ];
  const BIG_SPOT = [42, 33, 13, 24]; // 큰 판 — 홀 한가운데, 마담 로자가 서 있는 자리
  function lobby() {
    const st = S(), c = C();
    const rent = WS.sys.Day.rent();
    const call = c.bigCallDue();
    const pos = (l, t, w, h) => `left:${l}%;top:${t}%;width:${w}%;height:${h}%`;
    const spots = HALL.map(([id, l, t, w, h]) => {
      const g = GAMES.find(x => x.id === id);
      const min = c.MIN_BET;
      return `<button class="spot cs-spot" data-act="cs-game" data-id="${id}" style="${pos(l, t, w, h)}" title="${U.esc(g.hint)}">
        <span class="spot-label">${g.icon} ${U.esc(g.name)}</span><i class="spot-badge">${min}G~</i></button>`;
    }).join('');
    const bigSpot = call ? `<button class="spot call cs-spot cs-bigspot" data-act="cs-big" style="${pos(...BIG_SPOT)}"><span class="spot-label">🎭 마담 로자 — 큰 판</span></button>` : '';
    return `<div class="casino cs-lobby">
      <div class="cs-head"><h2>검은 주사위 <small>지하 도박장</small></h2>
        <div class="cs-purse"><span>금고</span><b>${st.gold}G</b><em class="${st.gold < rent ? 'bad' : ''}">내일 밤 임대료 ${rent}G</em></div></div>
      <div class="cs-hallwrap"><div class="cs-hall"><img class="cs-hall-art" src="assets/casino/lobby.jpg" alt="" draggable="false">${spots}${bigSpot}</div></div>
      ${call ? say('madam', 'happy', '마담 로자', '(홀 한가운데서 손짓한다) “마침 잘 왔어요. 오늘 밤 큰 판이 있어요. 당신도 끼지 않겠어요?”') : ''}
      <p class="cs-swipe">← 옆으로 밀어 홀을 둘러본다 →</p>
      <p class="cs-ask">앉을 테이블을 누른다</p>
      <div class="cs-foot"><button class="pbtn wide" data-act="cs-leave">도박장을 나선다 (다음 날로) →</button></div>
    </div>${host.hud()}`;
  }

  function stakeBox(p) {
    const st = S();
    const lock = !!p || !!(shell && !shell.res); // 판이 도는 동안에도 칸은 그대로 두고 잠근다 — 아래가 들썩이지 않게
    const min = C().MIN_BET;
    if (st.gold < min) return `<div class="cs-stake"><p class="cs-broke">판돈으로 걸 돈이 없다. 이 테이블은 최소 ${min}G다.</p></div>`;
    const b = C().clampBet(bet, min);
    const dis = lock ? 'disabled' : '';
    const chip = (label, id) => `<button class="mini cs-chip ${/^\d+$/.test(id) ? 'c' + id : 'word'}" data-act="cs-chip" data-id="${id}" ${dis}>${label}</button>`;
    return `<div class="cs-stake ${lock ? 'locked' : ''}">
      <label for="cs-bet">판돈</label>
      <input id="cs-bet" type="number" inputmode="numeric" min="${min}" max="${st.gold}" step="10" value="${lock && p ? p.bet : b}" ${dis}> <span>G</span>
      <div class="cs-chips">${chip('10', '10')}${chip('50', '50')}${chip('100', '100')}${chip('500', '500')}${chip('절반', 'half')}${chip('전부', 'all')}</div>
    </div>`;
  }

  const btn = (label, id, cls = '') => `<button class="pbtn cs-play ${cls}" data-act="cs-play" data-id="${id}">${label}</button>`;
  function panel(p, fresh) {
    const r = last && last.game === game && !p ? last : null;
    const an = c => (fresh ? c : ''); // 방금 나온 결과에만 굴러가는 애니메이션 — 칩을 눌러 다시 그릴 때 또 돌지 않게
    if (game === 'coin') {
      const face = r ? `<div class="cs-coin ${r.face} ${an('flip')}">${r.face === 'heads' ? '앞' : '뒤'}</div>` : '<div class="cs-coin idle">?</div>';
      return `${face}<div class="cs-row">${btn('앞면 ×2', 'heads')}${btn('뒷면 ×2', 'tails')}</div>`;
    }
    if (game === 'dice') {
      const dice = r ? `<div class="cs-dice">${r.dice.map(d => `<span class="cs-die ${an('roll')}">${DIE[d]}</span>`).join('')}<b>${r.sum}</b></div>` : '<div class="cs-dice"><span class="cs-die">⚀</span><span class="cs-die">⚁</span></div>';
      return `${dice}<div class="cs-row">${btn('낮음 2~6 ×2', 'low')}${btn('럭키 7 ×5', 'seven', 'gold')}${btn('높음 8~12 ×2', 'high')}</div>`;
    }
    if (game === 'roul') {
      const wheel = r ? `<div class="cs-ball-num ${r.color} ${an('spin')}">${r.n}</div>` : '<div class="cs-ball-num idle">·</div>';
      return `${wheel}<div class="cs-row">${btn('빨강 ×2', 'red', 'red')}${btn('검정 ×2', 'black', 'black')}${btn('홀 ×2', 'odd')}${btn('짝 ×2', 'even')}</div>
        <div class="cs-row cs-num"><label for="cs-n">숫자 하나에 ×36</label><input id="cs-n" type="number" min="0" max="36" value="${last && last.game === 'roul' && last.pick.startsWith('n:') ? last.pick.slice(2) : 7}">${btn('이 숫자에 건다', 'num', 'gold')}</div>`;
    }
    if (game === 'shell') return shellPanel(p);
    return ladderPanel(p, fresh);
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
        shellApply();
        // 두 컵이 한 줄로 겹쳐 지나가지 않게 — 하나는 앞으로(아래·크게), 하나는 뒤로(위·작게) 호를 그리며 자리를 바꾼다
        [[ia, 'arc-front'], [ib, 'arc-back']].forEach(([cup, cls]) => {
          const el = document.querySelector(`.cs-slot[data-cup="${cup}"]`);
          if (!el) return;
          el.classList.remove('arc-front', 'arc-back'); void el.offsetWidth; el.classList.add(cls);
          setTimeout(() => el.classList.remove(cls), MS - 30);
        });
        setTimeout(step, MS); return;
      }
      s.phase = 'pick'; shellApply();
    };
    setTimeout(step, 1300);
  }

  // ───── 카드 사다리 ─────
  const cardHtml = (n, k, cls = '') => `<div class="cs-card ${cls} ${[1, 2].includes(k % 4) ? 'red' : ''}"><b>${RANK(n)}</b><i>${SUIT[k % 4]}</i></div>`;
  // ───── 카드 업다운 ─────
  let udFlash = ''; // 방금 맞혔다 — 새 카드를 한 번 빛낸다
  const udCard = (n, st, cls = '') => {
    const su = SUIT[st % 4], red = st % 4 === 1 || st % 4 === 2;
    return `<div class="ud-card ${red ? 'red' : ''} ${cls}"><span class="ud-c1">${RANK(n)}<i>${su}</i></span><b>${su}</b><span class="ud-c2">${RANK(n)}<i>${su}</i></span></div>`;
  };
  const udBack = (cls = '') => `<div class="ud-card back ${cls}"></div>`;
  const udTrail = (hist, upto) => {
    const h = (hist || []).slice(0, upto);
    if (!h.length) return '';
    const more = h.length > 6 ? `<span class="ud-more">+${h.length - 6}</span>` : '';
    return `<div class="ud-trail">${more}${h.slice(-6).map(x => udCard(x.n, x.s, 'mini')).join('<i class="ud-step">›</i>')}</div>`;
  };
  function ladderPanel(p, fresh) {
    const l = p && p.game === 'ladder' ? p : null;
    if (!l) {
      const r = last && last.game === 'ladder' ? last : null;
      let board;
      if (r && r.over) {
        const h = r.hist || [];
        const cur = h[h.length - 1] || { n: r.from, s: 0 };
        board = `${udTrail(h, h.length - 1)}<div class="ud-main">${udCard(cur.n, cur.s)}<span class="ud-vs lose">${r.dir === 'hi' ? '▲' : '▼'}</span>${udCard(r.next, r.nextSuit || 0, fresh ? 'flip bust' : 'bust')}</div>`;
      } else if (r && r.cashed) {
        board = `${udTrail(r.hist, (r.hist || []).length)}<p class="ud-cashed">✋ 연속 ${r.steps}번 · ×${r.mult} 에서 멈췄다</p>`;
      } else board = `<div class="ud-main">${udBack('deck')}</div>`;
      return `<div class="ud">${board}</div>
        <div class="cs-row">${btn(r ? '다시 뽑는다' : '카드를 뽑는다', 'start', 'gold')}</div>
        <p class="cs-note">A가 가장 낮고 K가 가장 높다. 같은 숫자가 나오면 진다. 한 번 맞히면 그때부터 언제든 멈추고 가져갈 수 있다.</p>`;
    }
    const o = C().ladderOdds(l.card);
    const pct = x => `${Math.round(x.p * 100)}%`;
    const cur = Math.floor(l.bet * l.mult);
    const payIf = x => Math.floor(l.bet * Math.round(l.mult * x.m * 100) / 100);
    const fl = udFlash; udFlash = '';
    const guess = (id, arrow, label, x) => `<button class="ud-btn ${id}" data-act="cs-guess" data-id="${id}" ${x.p > 0 ? '' : 'disabled'}>
        <span class="ud-arrow">${arrow}</span><b>${label}</b><small>${x.p > 0 ? `${pct(x)} · 맞히면 ${payIf(x)}G` : '더는 없다'}</small></button>`;
    return `<div class="ud">
      ${udTrail(l.hist, (l.hist || []).length - 1)}
      <div class="ud-main">${udCard(l.card, l.suit || 0, `flip ${fl}`)}<span class="ud-vs">?</span>${udBack('next')}</div>
      <div class="ud-meter"><span>${l.steps ? `🔥 연속 ${l.steps}` : '첫 장'}</span><b>×${l.mult}</b><span>지금 멈추면 <em>${cur}G</em></span></div>
      <div class="ud-btns">${guess('hi', '▲', '높다', o.hi)}${guess('lo', '▼', '낮다', o.lo)}</div>
      <button class="pbtn gold ud-cash" data-act="cs-cash" ${l.steps ? '' : 'disabled'}>${l.steps ? `✋ 멈추고 ${cur}G 받기` : '한 번은 맞혀야 멈출 수 있다'}</button>
    </div>`;
  }


  // ───── 결과 한 줄 ─────
  const SAY = {
    win: ['오늘은 당신 날이군.', '…운이 좋소.', '한 판 더 하시겠소?', '딜러가 이를 간다.'],
    jackpot: ['홀이 술렁인다. 옆 테이블 손님들이 고개를 돌린다.', '딜러가 입을 다물지 못한다.', '딜러가 금화를 세는 손이 떨린다.'],
    lose: ['아깝게 됐소.', '판은 원래 그런 거요.', '다음엔 되겠지.', '딜러가 슬쩍 웃는다.'],
  };
  const pickSay = w => SAY[w][Math.floor(Math.random() * SAY[w].length)];
  const isJackpot = r => r.net > 0 && (r.payout >= r.bet * 5 || r.net >= 300);
  function resultLine(r, pop) {
    if (r.game !== game) return '';
    if (r.game === 'ladder' && !r.over && !r.payout) return ''; // 진행 중
    const win = r.net > 0;
    let extra = '';
    if (r.game === 'shell' && r.cheated) extra = ' 공은 분명 그 컵 밑이었는데… 딜러의 손이 스쳤다.';
    else if (r.game === 'shell' && !win) extra = ' 컵을 잘못 골랐다.';
    if (r.game === 'roul') extra = ` 구슬은 ${r.n}번 (${r.color === 'red' ? '빨강' : r.color === 'black' ? '검정' : '초록'}).`;
    if (r.game === 'ladder' && r.over) extra = ` ${RANK(r.from)} 다음은 ${RANK(r.next)}.`;
    if (r.game === 'ladder' && r.cashed) extra = ` 연속 ${r.steps}번 맞히고 손을 뗐다 (×${r.mult}).`;
    return `<p class="cs-result ${win ? 'w' : r.net < 0 ? 'l' : ''} ${pop ? 'pop' : ''}"><b>${money(r.net)}</b>${U.esc(extra)} ${U.esc(pickSay(isJackpot(r) ? 'jackpot' : win ? 'win' : 'lose'))}</p>`;
  }
  function record(r) {
    last = r;
    log.push({ net: r.net, text: `${NAME[r.game]} ${r.bet}G → ${r.net > 0 ? `+${r.net}G` : r.net < 0 ? `−${-r.net}G` : '본전'}` });
    const kind = isJackpot(r) ? 'jackpot' : r.net > 0 ? 'win' : r.net < 0 ? 'lose' : 'push';
    const delay = FX_DELAY[r.game === 'ladder' && r.cashed ? 'cash' : r.game] || 0.3;
    fx = { kind, delay };
    const t = delay * 1000;
    if (kind === 'jackpot') { setTimeout(() => sfx('coins', 1), t); setTimeout(() => sfx('coins2', 0.9), t + 260); setTimeout(() => sfx('coins', 0.7), t + 560); }
    else if (kind === 'win') setTimeout(() => sfx(Math.random() < 0.5 ? 'coins' : 'coins2', 0.8), t);
    else if (kind === 'lose') setTimeout(() => sfx('door_close', 0.3), t);
  }
  // 승패 연출 — 게임마다 결과가 드러나는 순간(동전이 떨어지고 · 주사위가 멈추고 · 구슬이 서는 때)에 맞춰 터진다
  const FX_DELAY = { coin: 0.85, dice: 0.75, roul: 0.95, shell: 0.35, ladder: 0.45, cash: 0.1 };
  const rnd = (a, b) => (a + Math.random() * (b - a)).toFixed(2);
  function fxHtml(f) {
    if (f.kind === 'push') return '';
    if (f.kind === 'lose') {
      // 딜러의 갈퀴가 판돈을 쓸어 간다 — 동전 몇 닢이 테이블 아래로 미끄러져 사라진다
      const coins = Array.from({ length: 6 }, (_, i) => `<i style="--x:${rnd(-40, 40)}px;--r:${rnd(-160, 160)}deg;--t:${(i * 0.06).toFixed(2)}s"></i>`).join('');
      return `<div class="cs-fx lose" aria-hidden="true">${coins}</div>`;
    }
    const n = f.kind === 'jackpot' ? 34 : 14;
    const coins = Array.from({ length: n }, () => {
      const a = Math.random() * Math.PI * 2, d = f.kind === 'jackpot' ? 120 + Math.random() * 180 : 70 + Math.random() * 110;
      return `<i style="--x:${(Math.cos(a) * d).toFixed(0)}px;--y:${(Math.sin(a) * d * 0.6 - 60).toFixed(0)}px;--r:${rnd(-540, 540)}deg;--t:${rnd(0, 0.18)}s;--s:${rnd(0.7, 1.25)}"></i>`;
    }).join('');
    return `<div class="cs-fx ${f.kind}" aria-hidden="true">${coins}</div>`;
  }

  // ───────── 눌림 ─────────
  const readBet = () => {
    const el = document.getElementById('cs-bet');
    const min = C().MIN_BET;
    const v = C().clampBet(el ? el.value : bet, min);
    return S().gold >= min ? v : 0;
  };
  function act(b) {
    const a = b.dataset.act, id = b.dataset.id, c = C();
    switch (a) {
      case 'cs-open':
        isOn = true; ctx = { st: S(), day: S().day }; game = null; last = null; shell = null; enter = null;
        raidN = c.raidDue() ? c.raid() : 0; // 감찰관에게 모른다고 했다면 단속에 걸린다
        if (raidN) { sfx('door_open', 0.7); sfx('blade', 0.4); }
        else {
          const first = c.markVisit();
          enter = c.bigCallDue() ? { stage: 'guarded', first } : { stage: 'descend', first }; // 큰 판 날은 경비와 종이 선 계단
          if (!first) { host.render(); enterAutoRun(); return; } // 다음 입장부터는 문지기 문답 없이 계단만 짧게
        }
        break;
      case 'cs-enter-next': enterAdvance(); break;
      case 'cs-big': if (!c.bigCallDue()) return; big = { stage: 'intro' }; break;
      case 'cs-big-back': big = null; break;
      case 'cs-big-next': if (big && big.stage === 'bell') big.stage = 'arrest'; else return; break;
      case 'cs-big-end': big = null; isOn = false; return 'next-day';
      case 'cs-leave': if (pending()) return; raidN = 0; isOn = false; enter = null; last = null; shell = null; return 'next-day'; // 도박장을 나서면 곧장 잠자리로 — 다음 날
      case 'cs-game': if (pending() || !GAMES.some(g => g.id === id)) return; game = id; last = null; shell = null; break;
      case 'cs-lobby': if (pending()) return; game = null; last = null; shell = null; break;
      case 'cs-chip': {
        const g = S().gold;
        const mn = c.MIN_BET;
        bet = id === 'half' ? Math.max(mn, Math.floor(g / 2)) : id === 'all' ? g : Math.min(g, Math.max(mn, Number(id)));
        break;
      }
      case 'cs-play': {
        if (big && big.stage === 'intro') { if (c.bigStart(id)) { bigRun(id); host.render(); } return; }
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
        if (r.over) record(r); else { udFlash = 'hit'; sfx('latch', 0.4); }
        break;
      }
      case 'cs-cash': { const r = c.ladderCash(); if (r) record(r); break; }
      default: return;
    }
    host.render();
  }

  // 지하 도박장이 처음 열린 순간 — 화면 위에서 알림창이 내려온다 (카이의 세 번째 내기 뒤)
  function afterRender() {
    // 좁은 화면에서 홀 그림이 옆으로 넘칠 때 — 처음엔 한가운데를 보여 준다
    const hw = document.querySelector('.cs-hallwrap');
    if (hw && !hw.dataset.centered) { hw.dataset.centered = '1'; hw.scrollLeft = (hw.scrollWidth - hw.clientWidth) / 2; }
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

  // ───── 개발 패널(tools/dev.js)용 — 장면·결과를 곧바로 띄운다. 결과는 보여 주기만 하고 금고는 건드리지 않는다 ─────
  const FAKE = {
    coin: { win: [50, 100, { face: 'heads', pick: 'heads' }], jackpot: [300, 600, { face: 'tails', pick: 'tails' }], lose: [50, 0, { face: 'tails', pick: 'heads' }] },
    dice: { win: [50, 100, { dice: [1, 3], sum: 4, pick: 'low' }], jackpot: [50, 250, { dice: [3, 4], sum: 7, pick: 'seven' }], lose: [50, 0, { dice: [2, 2], sum: 4, pick: 'high' }] },
    roul: { win: [50, 100, { n: 1, color: 'red', pick: 'red' }], jackpot: [20, 720, { n: 17, color: 'black', pick: 'n:17' }], lose: [50, 0, { n: 0, color: 'green', pick: 'red' }] },
    shell: { win: [50, 100, { ball: 1, pick: 1 }], jackpot: [300, 600, { ball: 2, pick: 2 }], lose: [50, 0, { ball: 0, pick: 2, cheated: true }] },
    ladder: {
      win: [100, 210, { cashed: true, steps: 3, mult: 2.1, hist: [{ n: 4, s: 0 }, { n: 9, s: 1 }, { n: 5, s: 2 }, { n: 11, s: 3 }] }],
      jackpot: [100, 620, { cashed: true, steps: 6, mult: 6.2, hist: [{ n: 2, s: 0 }, { n: 8, s: 1 }, { n: 3, s: 2 }, { n: 12, s: 3 }, { n: 6, s: 1 }, { n: 1, s: 2 }, { n: 10, s: 0 }] }],
      lose: [100, 0, { over: true, from: 7, next: 9, dir: 'lo', nextSuit: 1, hist: [{ n: 7, s: 0 }] }],
    },
  };
  function dev(cmd, a = {}) {
    isOn = true; ctx = { st: S(), day: S().day }; raidN = 0; big = null; enter = null; shell = null; last = null; fx = null;
    if (cmd === 'enter') {
      enter = { stage: a.stage, first: !!a.first };
      if (a.stage === 'descend' && !a.first) { host.render(); enterAutoRun(); return; }
    } else if (cmd === 'table') game = a.game;
    else if (cmd === 'result') {
      game = a.game;
      const [bet, payout, extra] = FAKE[a.game][a.kind];
      const r = { game: a.game, bet, payout, net: payout - bet, win: payout > bet, ...extra };
      if (a.game === 'shell') shell = { bet, ball: r.ball, swaps: [], slot: [0, 1, 2], phase: 'reveal', res: r };
      record(r);
    } else if (cmd === 'big') {
      const f = S().flags; ['casino_denied', 'casino_caught1', 'casino_guarded'].forEach(k => { if (f[k] === undefined) f[k] = S().day - 1; }); // 앞/뒤를 누르면 실제로 이어지게
      game = null; big = { stage: a.stage, face: 'heads' };
      if (a.stage === 'toss') bigRun('heads');
    } else if (cmd === 'raid') raidN = 1;
    else game = null;
    host.render();
  }

  return { init, html, act, on, pending, afterRender, dev };
})();

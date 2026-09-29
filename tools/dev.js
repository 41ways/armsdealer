// 이벤트 테스트 패널 — dev.html 에서만 실린다 (tools/make_dev.py 가 index.html 에 이 스크립트를 붙여 만든다).
// 탭: 화면 · 손님 · 상태 · 사건 · 결말. 지금 판에 손님을 끼워 넣고, 날짜·플래그·세계 변수·사건 효과를 바로 넣고,
// 원하는 화면(아침 쪽 · 도매 · 영업 · 밤 · 결말)으로 곧장 간다. 게임 코드는 공개 API(WS.sys.*, WS.UI.devGoto)만 쓴다.
//
// 주소로 바로 열기 — dev.html?day=12&gold=1500&flags=a,b&vars=dragon_stir:8,rel_goblin:5&spawn=wd_ash_delvers&go=shop&tab=cust
//   go: street | letters | news | ledger | prep | shop | night | ending   (ending 이면 &ending=<id>)
//   5일 이후로 열면 창고 자리를 모두 연다 (&unlock=1 이면 날짜와 상관없이)
//   주소가 있으면 새 게임을 시작해 그 상태를 만든 뒤 그 화면을 연다. 패널의 「이 상태 링크」가 지금 설정을 주소로 만든다.
(() => {
  const S = () => WS.Game.state;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const redraw = () => { try { WS.UI.render(); } catch (e) { console.error(e); } };
  const $ = id => document.getElementById(id);
  const say = msg => { const el = $('dev-log'); if (el) el.textContent = msg; };
  const ARC = id => /^(rl|wd|tr)_/.test(id);
  const GROUP = id => (/^rl_/.test(id) ? '왕권·전쟁' : /^wd_/.test(id) ? '괴물·신비' : /^tr_/.test(id) ? '산업·뒷골목' : '기존');
  const SCREENS = [['street', '아침 거리'], ['letters', '편지'], ['news', '신문'], ['ledger', '장부'], ['prep', '도매상'], ['shop', '영업'], ['night', '밤'], ['ending', '결말']];
  const TABS = [['scr', '화면'], ['cust', '손님'], ['state', '상태'], ['ev', '사건'], ['end', '결말'], ['cs', '도박·갈래']];
  const last = { spawn: [], flags: [], vars: {} }; // 「이 상태 링크」에 담을 것

  const css = `
  #dev { position: fixed; right: 8px; top: 8px; z-index: 20000; width: 320px; max-height: calc(100vh - 16px); display: flex; flex-direction: column;
    background: rgba(12,9,7,.96); color: #f0e2c0; font: 12px/1.4 system-ui, sans-serif; border: 1px solid #8a5a24; border-radius: 6px; box-shadow: 0 6px 24px rgba(0,0,0,.6); }
  #dev.min { width: auto; } #dev.min > :not(header) { display: none; }
  #dev header { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 8px; background: #2a1c10; cursor: pointer; border-radius: 6px 6px 0 0; }
  #dev nav { display: flex; border-bottom: 1px solid #5a4028; }
  #dev nav button { flex: 1; margin: 0; border: 0; border-radius: 0; background: transparent; color: #b8a888; padding: 7px 0; font-weight: 700; }
  #dev nav button.on { color: #ffe08a; background: #3a2412; box-shadow: inset 0 -2px 0 #f0c060; }
  #dev .pane { display: none; padding: 8px; overflow: auto; } #dev .pane.on { display: block; }
  #dev h6 { margin: 8px 0 4px; font-size: 11px; color: #f0c878; } #dev h6:first-child { margin-top: 0; }
  #dev input, #dev select { width: 100%; box-sizing: border-box; margin: 2px 0; padding: 4px 5px; background: #1e150e; color: #f0e2c0; border: 1px solid #5a4028; border-radius: 3px; font: inherit; }
  #dev button { margin: 2px 2px 2px 0; padding: 4px 8px; background: #6a3a14; color: #fff4d8; border: 1px solid #3a1a08; border-radius: 3px; font: inherit; cursor: pointer; }
  #dev button:hover { filter: brightness(1.15); } #dev button.ghost { background: #2a1c10; border-color: #5a4028; }
  #dev .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; } #dev .grid button { margin: 0; padding: 8px 4px; }
  #dev .row { display: flex; gap: 4px; align-items: center; } #dev .row > input, #dev .row > select { flex: 1; }
  #dev .list { max-height: 260px; overflow: auto; border: 1px solid #3a2a1a; border-radius: 3px; }
  #dev .item { display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 4px 6px; border-bottom: 1px solid #2a1c10; }
  #dev .item small { color: #9a8a6a; } #dev .item.arc b { color: #ffd98a; } #dev .item.ok b { color: #9fe07a; }
  #dev .item button { flex: none; padding: 2px 7px; }
  #dev .chips { display: flex; flex-wrap: wrap; gap: 3px; } #dev .chips label { padding: 1px 6px; border: 1px solid #5a4028; border-radius: 10px; cursor: pointer; }
  #dev .chips input { display: none; } #dev .chips label:has(input:checked) { background: #6a3a14; color: #fff; }
  #dev-log { color: #9fd0ff; min-height: 16px; padding: 6px 8px; border-top: 1px solid #3a2a1a; }
  #dev-state { color: #c8b890; font-size: 11px; }`;

  // ── 동작 ──
  function ensureGame() { if (!S() || S().phase === 'title') { WS.Game.newGame(); return true; } return false; }

  function spawn(id) {
    const tpl = WS.sys.Customers.tplById(id);
    if (!tpl) return say(`없는 손님: ${id}`);
    const st = S(), c = WS.sys.Customers.fromTemplate(tpl);
    const cur = WS.sys.Day.current && WS.sys.Day.current();
    let i = cur ? st.queue.indexOf(cur) + 1 : st.queue.findIndex(q => q.status === 'waiting');
    if (i < 0) i = st.queue.length;
    // 도착 시각 — 바로 앞 손님(없으면 지금) 뒤로. 비어 있으면 시계가 NaN 이 된다
    const prev = st.queue[i - 1];
    c.arrival = Math.max(st.time || WS.data.config.openTime, prev && prev.arrival ? prev.arrival : 0) + 5;
    st.queue.splice(i, 0, c);
    if (!last.spawn.includes(id)) last.spawn.push(id);
    say(`${id} → 다음 손님${st.phase === 'shop' ? ' (「다음」을 누르면 온다)' : ' (영업을 열면 온다)'}`);
    redraw();
  }
  function setDay(d) { const st = S(); st.day = Math.max(1, Math.min(31, d)); say(`${st.day}일로 옮겼다 — 이야기 손님은 다음 대기열부터 새 날짜 기준`); redraw(); }
  function setFlag(f, on) { if (!f) return; if (on) { S().flags[f] = true; if (!last.flags.includes(f)) last.flags.push(f); } else { delete S().flags[f]; last.flags = last.flags.filter(x => x !== f); } say(`플래그 ${f} ${on ? '켬' : '끔'}`); }
  function setVar(k, v) { if (!k || Number.isNaN(v)) return; WS.sys.World.set(k, v); last.vars[k] = v; say(`${k} = ${v}`); }
  function fireEvent(id) {
    const ev = WS.data.events.find(e => e.id === id);
    if (!ev) return say(`없는 사건: ${id}`);
    const st = S();
    if (ev.effects) WS.sys.Effects.apply(ev.effects);
    (ev.outcomes || []).some(o => { if (!o.when || WS.sys.Conditions.check(o.when)) { if (o.effects) WS.sys.Effects.apply(o.effects); if (o.news) st.pendingNews.push(...[].concat(o.news)); return true; } return false; });
    if (ev.news) st.pendingNews.push(...[].concat(ev.news));
    say(`사건 ${id} 효과 적용 (기사는 다음 신문)`); redraw();
  }
  // 튜토리얼 손님을 건너뛰고 날짜를 옮기면 창고 자리가 잠겨 있다 — 한꺼번에 연다 (Effects 의 unlock)
  function unlockAll() { WS.sys.Effects.apply({ unlock: WS.data.progress.places.slice() }); say('창고 자리를 모두 열었다'); redraw(); }
  // ── 도박장 · 갈래 시나리오 — 새 판을 그 장면 직전 상태로 만든다 (플래그는 오늘-2일에 켜진 것으로 — since 조건이 지나 있게) ──
  // flags: 켜 둘 플래그 · vars: 세계 변수 · spawn: 영업 화면에서 부를 손님 · closing: 영업을 마치고 마감 화면에서 시작 · gold: 금고
  const OPEN = ['casino_open', 'casino_notified'], REG = [...OPEN, 'casino_regular', 'casino_hooked', 'casino_days3'];
  const SCEN = [
    ['도박장', [
      { t: '카이 세 번째 내기 (해금 연출)', d: '내기를 세 번째로 고르면 알림창 + 카이의 초대 대사', day: 12, gold: 800, vars: { gamble_bets: 2 }, spawn: ['gambler_3'] },
      { t: '도박장 열림 (마감 화면)', d: '「🎲 지하 도박장」 → 로비 → 테이블 6종 (VIP 는 잠김)', day: 13, gold: 1500, flags: OPEN, closing: true },
      { t: '도박장 · VIP 열림 (마감 화면)', d: '여섯 판 넘게 놀아 안쪽 금장식 문(VIP)이 열린 상태', day: 16, gold: 2500, flags: [...REG, 'vip_open'], closing: true },
    ]],
    ['도박에 빠지면', [
      { t: '패가망신 (금고 0 → 영업 종료)', d: '단골(3판) 이후 망함 → 「패가망신」', day: 18, gold: 0, flags: [...OPEN, 'casino_regular'], closing: true, goldBeforeClose: true },
    ]],
    ['감찰관 갈래 (모른다 → 큰 판 → 도박의 끝)', [
      { t: '감찰관 마크의 탐문', d: '신고한다 / 모른다 / 소문만 들었다 (모른다 → 아래 갈래)', day: 15, gold: 1500, flags: REG, spawn: ['gm_inspector'] },
      { t: '모른다 뒤 첫 도박장 → 단속(봐줌)', d: '마감 화면 → 도박장 → 「단속!」 화면', day: 15, gold: 1500, flags: [...REG, 'casino_denied'], closing: true },
      { t: '마담의 부름 (낮, 경비와 종)', d: '가 보겠소 / 발을 끊겠소', day: 16, gold: 1500, flags: [...REG, 'casino_denied', 'casino_caught1'], spawn: ['gm_madam_guard'] },
      { t: '큰 판 → 체포 → 「도박의 끝」', d: '마감 화면 → 도박장 → 로비의 「큰 판」 카드 → 앞/뒷면', day: 16, gold: 1500, flags: [...REG, 'casino_denied', 'casino_caught1', 'casino_guarded'], closing: true },
    ]],
  ];
  function runScen(i) {
    const flat = SCEN.flatMap(([, list]) => list), sc = flat[i];
    if (!sc) return;
    WS.Game.newGame();
    const st = S();
    st.day = sc.day; unlockAll();
    st.progress.tutorialsSeen = Object.assign(st.progress.tutorialsSeen || {}, { crow_paper: true });
    (sc.flags || []).forEach(f => { st.flags[f] = Math.max(1, sc.day - 2); });
    Object.entries(sc.vars || {}).forEach(([k, v]) => WS.sys.World.set(k, v));
    if (sc.goldBeforeClose) st.gold = sc.gold;
    go('shop');
    (sc.spawn || []).forEach(spawn);
    if (sc.closing) {
      st.queue.forEach(q => { if (q.status === 'waiting') q.status = 'done'; });
      try { WS.sys.Day.closeShop(); } catch (e) { console.error(e); }
      if (!sc.goldBeforeClose) st.gold = sc.gold;
    } else st.gold = sc.gold;
    redraw();
    say(`${sc.t} — ${sc.d}`);
  }
  const scenHtml = () => { let n = 0; return SCEN.map(([g, list]) => `<h6>${esc(g)}</h6>${list.map(x => `<div class="item"><span><b>${esc(x.t)}</b><br><small>${esc(x.d)}</small></span><button data-dev="scen" data-id="${n++}">가기</button></div>`).join('')}`).join(''); };

  function go(to, opt) {
    const st = S();
    // 신문은 구독한 날만 쪽이 생긴다 — 테스트에서는 오늘 신문을 받은 것으로 친다
    if (to === 'news' && WS.sys.Shop && !WS.sys.Shop.paperComes()) { st.subscribed = true; st.subSince = st.subSince || st.day; st.paperDays = st.paperDays || {}; st.paperDays[st.day] = true; }
    try { WS.UI.devGoto(to, opt); say(`화면: ${to}`); } catch (e) { say(`이 상태에선 ${to} 로 갈 수 없다: ${e.message}`); console.error(e); } }
  const okEnd = e => { try { return !!WS.sys.Conditions.check(e.when); } catch (x) { return false; } };

  function link() {
    const st = S(), p = new URLSearchParams();
    p.set('day', st.day); p.set('gold', st.gold);
    if (last.flags.length) p.set('flags', last.flags.join(','));
    const vs = Object.entries(last.vars).map(([k, v]) => `${k}:${v}`); if (vs.length) p.set('vars', vs.join(','));
    if (last.spawn.length) p.set('spawn', last.spawn.join(','));
    p.set('go', st.phase === 'morning' ? 'street' : st.phase === 'prep' ? 'prep' : st.phase === 'night' ? 'night' : 'shop');
    return `${location.origin}${location.pathname}?${p}`;
  }

  // ── 그리기 ──
  function custList(q, group) {
    const list = WS.data.customers.filter(t => (group === '전체' || GROUP(t.id) === group) && (!q || `${t.id} ${t.name || ''} ${t.job || ''}`.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => (ARC(b.id) - ARC(a.id)) || a.id.localeCompare(b.id)).slice(0, 200);
    $('dev-clist').innerHTML = list.map(t => `<div class="item ${ARC(t.id) ? 'arc' : ''}"><span><b>${esc(t.name || t.id)}</b> <small>${esc(t.job || '')} · ${esc(t.id)}</small></span><button data-dev="spawn" data-id="${esc(t.id)}">부르기</button></div>`).join('') || '<div class="item">없음</div>';
  }
  function evList(q) {
    $('dev-elist').innerHTML = WS.data.events.filter(e => !q || e.id.includes(q)).slice(0, 200)
      .map(e => `<div class="item ${ARC(e.id) ? 'arc' : ''}"><span><b>${esc(e.id)}</b></span><button data-dev="event" data-id="${esc(e.id)}">적용</button></div>`).join('');
  }
  function endList() {
    if (!S()) return;
    $('dev-endlist').innerHTML = WS.data.endings.map(e => `<div class="item ${okEnd(e) ? 'ok' : ''}"><span><b>${esc(e.title || e.id)}</b> <small>${okEnd(e) ? '충족' : ''} · ${esc(e.id)}</small></span><button data-dev="ending" data-id="${esc(e.id)}">화면 보기</button></div>`).join('');
  }
  function stateLine() {
    const st = S(), el = $('dev-state');
    if (el) el.textContent = st ? `${st.day}일 · ${st.phase} · 금화 ${st.gold} · 대기 ${st.queue ? st.queue.filter(q => q.status === 'waiting').length : 0}명` : '게임 시작 전';
  }
  function tab(k) {
    document.querySelectorAll('#dev nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
    document.querySelectorAll('#dev .pane').forEach(p => p.classList.toggle('on', p.dataset.pane === k));
    if (k === 'end') endList();
    try { localStorage.setItem('devTab', k); } catch (e) { /* 저장 안 돼도 된다 */ }
  }

  function build() {
    if ($('dev')) return;
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    const el = document.createElement('div'); el.id = 'dev';
    const groups = ['전체', '왕권·전쟁', '괴물·신비', '산업·뒷골목', '기존'];
    el.innerHTML = `<header data-dev="toggle"><b>이벤트 테스트</b><span id="dev-state"></span></header>
      <nav>${TABS.map(([k, l]) => `<button data-tab="${k}">${l}</button>`).join('')}</nav>
      <div class="pane" data-pane="scr">
        <h6>화면 바로가기</h6><div class="grid">${SCREENS.map(([k, l]) => `<button data-dev="go" data-id="${k}">${l}</button>`).join('')}</div>
        <h6>판</h6><button data-dev="new">새 게임</button><button data-dev="gold">금화 +500</button><button data-dev="clear" class="ghost">남은 손님 보내기</button><button data-dev="unlock">창고 자리 모두 열기</button>
        <h6>이 상태를 주소로</h6><button data-dev="link">이 상태 링크 복사</button>
        <div style="color:#9a8a6a;margin-top:4px">링크를 열면 새 게임에서 같은 날짜·금화·플래그·변수·부른 손님으로 바로 시작한다</div>
      </div>
      <div class="pane" data-pane="cust">
        <div class="chips">${groups.map((g, i) => `<label><input type="radio" name="dev-g" value="${g}" ${i === 0 ? 'checked' : ''}>${g}</label>`).join('')}</div>
        <input id="dev-cq" placeholder="이름 · 직업 · id 로 찾기"><div class="list" id="dev-clist"></div>
      </div>
      <div class="pane" data-pane="state">
        <h6>날짜</h6><div class="row"><input id="dev-day" type="number" min="1" max="31" placeholder="1~31"><button data-dev="day">이 날로</button><button data-dev="dayp" class="ghost">+1</button></div>
        <h6>플래그</h6><div class="row"><input id="dev-flag" list="dev-flags" placeholder="플래그 이름"><button data-dev="flag">켜기</button><button data-dev="unflag" class="ghost">끄기</button></div><datalist id="dev-flags"></datalist>
        <h6>세계 변수</h6><div class="row"><select id="dev-var"></select><input id="dev-val" type="number" placeholder="값" style="max-width:70px"><button data-dev="var">넣기</button></div>
        <div id="dev-varnow" style="color:#9a8a6a"></div>
      </div>
      <div class="pane" data-pane="ev"><input id="dev-eq" placeholder="사건 id 로 찾기"><div class="list" id="dev-elist"></div></div>
      <div class="pane" data-pane="end"><div style="color:#9a8a6a;margin-bottom:4px">초록 = 지금 끝나면 조건 충족 (위에서부터 먼저 맞는 것이 뽑힌다)</div><div class="list" id="dev-endlist"></div></div>
      <div class="pane" data-pane="cs"><div style="color:#9a8a6a;margin-bottom:4px">새 판을 그 장면 직전 상태로 만든다. 마감 화면 시나리오는 「🎲 지하 도박장」을 눌러 이어 본다</div>${scenHtml()}</div>
      <div id="dev-log">탭을 고른다</div>`;
    document.body.appendChild(el);
    custList('', '전체'); evList('');
    $('dev-var').innerHTML = Object.keys(WS.data.worldVars || {}).sort().map(k => `<option>${esc(k)}</option>`).join('');
    const flagNames = new Set(); JSON.stringify([WS.data.customers, WS.data.events, WS.data.endings]).replace(/"(?:flag|noFlag)":"([^"]+)"/g, (m, f) => flagNames.add(f));
    $('dev-flags').innerHTML = [...flagNames].sort().map(f => `<option value="${esc(f)}">`).join('');
    const group = () => (document.querySelector('input[name="dev-g"]:checked') || {}).value || '전체';
    $('dev-cq').addEventListener('input', e => custList(e.target.value, group()));
    el.querySelectorAll('input[name="dev-g"]').forEach(r => r.addEventListener('change', () => custList($('dev-cq').value, group())));
    $('dev-eq').addEventListener('input', e => evList(e.target.value));
    $('dev-var').addEventListener('change', () => { if (S()) $('dev-varnow').textContent = `지금 값 ${WS.sys.World.get($('dev-var').value)}`; });
    el.addEventListener('click', onClick, true);
    let t0 = 'scr'; try { t0 = new URLSearchParams(location.search).get('tab') || localStorage.getItem('devTab') || 'scr'; } catch (e) { /* 기본 탭 */ }
    tab(t0);
  }

  function onClick(e) {
    const tb = e.target.closest('#dev nav button');
    if (tb) { e.stopPropagation(); tab(tb.dataset.tab); return; }
    const b = e.target.closest('[data-dev]');
    if (!b) return;
    e.stopPropagation();
    const act = b.dataset.dev, id = b.dataset.id, v = k => $(k).value.trim();
    if (act === 'toggle') { $('dev').classList.toggle('min'); return; }
    if (act === 'new') { WS.Game.newGame(); last.spawn = []; last.flags = []; last.vars = {}; say('새 게임'); stateLine(); return; }
    if (ensureGame()) say('새 게임을 먼저 시작했다');
    const st = S();
    if (act === 'scen') { runScen(+id); stateLine(); return; }
    if (act === 'go') go(id);
    if (act === 'spawn') spawn(id);
    if (act === 'event') fireEvent(id);
    if (act === 'ending') go('ending', { ending: id });
    if (act === 'gold') { st.gold += 500; redraw(); say('금화 +500'); }
    if (act === 'unlock') unlockAll();
    if (act === 'clear') { st.queue.forEach(q => { if (q.status === 'waiting') q.status = 'done'; }); redraw(); say('남은 손님을 모두 보냈다'); }
    if (act === 'day') setDay(parseInt(v('dev-day'), 10) || st.day);
    if (act === 'dayp') setDay(st.day + 1);
    if (act === 'flag') setFlag(v('dev-flag'), true);
    if (act === 'unflag') setFlag(v('dev-flag'), false);
    if (act === 'var') setVar(v('dev-var'), Number(v('dev-val')));
    if (act === 'link') { const u = link(); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => say('링크를 복사했다'), () => say(u)); }
    if ($('dev-endlist') && document.querySelector('#dev .pane.on[data-pane="end"]')) endList();
    stateLine();
  }

  // 주소로 바로 열기
  function fromUrl() {
    const p = new URLSearchParams(location.search);
    if (![...p.keys()].some(k => k !== 'tab')) return;
    WS.Game.newGame();
    const st = S();
    if (p.get('day')) st.day = Math.max(1, Math.min(31, +p.get('day')));
    if (p.get('gold')) st.gold = +p.get('gold');
    if (st.day >= 5 || p.get('unlock')) unlockAll();
    (p.get('flags') || '').split(',').filter(Boolean).forEach(f => setFlag(f, true));
    (p.get('vars') || '').split(',').filter(Boolean).forEach(kv => { const [k, val] = kv.split(':'); setVar(k, Number(val)); });
    const to = p.get('go') || 'shop';
    if (to === 'shop') go('shop');
    (p.get('spawn') || '').split(',').filter(Boolean).forEach(spawn);
    if (to !== 'shop') go(to, { ending: p.get('ending') });
    say('주소대로 열었다');
  }

  // 로딩 화면(.load-bar)이 걷히고 타이틀이 뜬 뒤에 주소대로 연다 — 먼저 열면 부팅이 화면을 덮어쓴다
  const whenBooted = fn => { const t = setInterval(() => { if (!document.querySelector('.load-bar') && document.querySelector('.title-scene')) { clearInterval(t); setTimeout(fn, 900); } }, 200); };
  const start = () => { build(); setInterval(stateLine, 1000); whenBooted(fromUrl); };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();

// 화면 UI. 1인칭 픽셀 장면(#scene) 위에 HTML 오버레이(#ui)를 얹는다.
// 상태를 읽어 그리고, data-act 속성으로 입력을 받는다.
// ── Phase 2: 응대 테이블(왼쪽) + 창고(오른쪽) 2데스크 구조 (desk_redesign_proposal_v3.html 기준) ──
WS.UI = (() => {
  const U = WS.util;
  const S = () => WS.Game.state;
  const $ui = () => document.getElementById('ui');
  const item = id => WS.sys.Items.get(id);
  const fac = id => WS.data.factions[id];
  let drawer = null; // 열린 서랍 탭 (장부/신문/소문)
  let magnifyOpen = false; // 감정 확대경 오버레이 열림 여부
  let nav = { place: null, sub: null }; // 창고 뒷방에서 연 곳(place) → 소분류(sub)
  let mail = { sel: null, compose: null, params: {}, flash: '' }; // 까마귀 서신 화면 상태
  let mailAnim = ''; // 다음 한 번만 재생할 서신 전환: 'open'(편지가 펼쳐진다) | 'list'(목록이 돌아온다)
  let tray = []; // 테이블(카운터) 위에 올린 물건: [{itemId, qty, stash?}] — stash: 장물함에서 꺼낸 것 (같은 물건의 일반 재고와 따로 센다)
  let mobileView = 'counter'; // 좁은 화면에서 어느 책상을 보여줄지: counter/storage
  let drag = null; // 드래그 중인 물건 { itemId, stash, fromTable, x0, y0, moved }
  let suppressClickUntil = 0; // 드래그 직후 그 자리의 다른 버튼이 오클릭되지 않게 잠깐 막는 시각
  let endingChoiceShown = {}; // 결말 화면의 "선택지" 중 눌러서 펼친 것 (인덱스 → true)
  let lastEndingSeen = null; // 결말이 바뀌면(다른 결말을 보면) endingChoiceShown 을 새로 비운다

  const ico = (id, cls = '') => `<img class="pix-ico ${cls}" src="${WS.Sprites.itemIcon(id)}" alt="${U.esc(item(id).name)}">`;
  // UI 아이콘: 제미나이로 직접 뽑은 그림 (assets/ui)
  const uiIco = (n, cls = '') => `<img class="ui-ico ${cls}" src="assets/ui/kit/hud_${n}.png" alt="">`;
  const catName = c => ({ material: '재료', weapon: '무기', armor: '방어구', consumable: '소모품', curio: '진귀품' }[c]);
  const tradeText = e => `${Object.entries(e.gave || {}).map(([id, q]) => `${U.esc(item(id).name)}×${q}`).join(', ')} → ${Object.entries(e.got || {}).map(([id, q]) => `${U.esc(item(id).name)}×${q}`).join(', ')}`;

  // 되돌릴 수 없는 선택지(ch.confirm — 열쇠를 넘긴다 등)는 한 번 누르면 "정말?"로 바뀌고, 한 번 더 눌러야 실행된다 (3단계 QA: 오클릭 파산 16/19)
  let confirmChoice = null;
  function resetDealState() {
    tray = [];
    drag = null;
    confirmChoice = null;
  }

  function hud() {
    const st = S();
    const used = WS.sys.Inventory.usedSlots();
    const full = used >= WS.sys.Inventory.capacity();
    return `<div class="hud">
      <span class="pill">${uiIco('day')}DAY <b>${st.day}</b><small>/${WS.data.config.campaignDays}</small></span>
      <span class="pill">${uiIco('time')}${U.fmtTime(st.time)}</span>
      <span class="pill gold ${st.gold < WS.sys.Day.rent() ? 'broke' : ''}" title="밤마다 임대료 ${WS.sys.Day.rent()}G">${uiIco('gold')}<span class="g-n" data-gold="${st.gold}">${st.gold}</span></span>
      <span class="pill ${full ? 'warn' : ''}">${uiIco('stock')}${used}/${WS.sys.Inventory.capacity()}</span>
      ${WS.Sfx.supported ? `<button class="pill mute" data-act="mute" aria-label="소리 켜기/끄기">${uiIco(WS.Sfx.muted ? 'sound_off' : 'sound_on')}</button>` : ''}
      <button class="pill menu-pill" data-act="menu-page" data-page="main" aria-label="메뉴 (Esc)" title="메뉴 (Esc)">☰</button>
    </div>`;
  }

  function badge(id) {
    const f = fac(id);
    return `<span class="badge" style="--fc:${f.color}">${f.icon} ${U.esc(f.name)}</span>`;
  }

  function newsList(list) {
    if (!list || !list.length) return '<p class="muted">기사가 없다.</p>';
    return list.map(n => `<article class="news ${n.big ? 'big' : ''}"><span class="cat">${WS.ui.emblemOfCat(n.cat)}[${U.esc(n.cat)}]</span> ${n.rumor ? '<i class="rum-q" title="진위 불명 소문">❓</i>' : ''}${U.esc(n.text)}</article>`).join('');
  }

  // ───────── 타이틀 / 로딩 (같은 밤거리 장면 — 로고 자리를 그대로 두고 아래만 바뀐다) ─────────
  // 불씨·먼지 입자: 위치·속도가 매번 같도록 고정 값으로 (다시 그려도 튀지 않게)
  const EMBERS = (() => {
    let r = 7;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    return Array.from({ length: 18 }, (_, i) => `<i class="${i % 4 === 3 ? 'dust' : ''}" style="--x:${Math.round(rnd() * 96 + 2)}%;--s:${(1.6 + rnd() * 2.2).toFixed(1)}px;--d:${(7 + rnd() * 8).toFixed(1)}s;--dl:${(-rnd() * 12).toFixed(1)}s;--dx:${Math.round(rnd() * 60 - 30)}px;--rise:${Math.round(220 + rnd() * 320)}px"></i>`).join('');
  })();
  function titleScene(bottom, cls = '') {
    return `<div class="title-scene ${cls}">
      <div class="ts-back"></div>
      <div class="ts-col">
        <div class="ts-sky"></div><div class="ts-stars"></div>
        <div class="ts-wide" aria-hidden="true"><div class="tw-img"><i class="tw-glow moon"></i><i class="tw-glow lamp"></i><i class="tw-glow win a"></i><i class="tw-glow win b"></i><i class="tw-glow win c"></i></div></div>
        <div class="ts-art"><i class="ts-win w1"></i><i class="ts-win w2"></i><div class="ts-moonglow"><i></i></div></div>
        <div class="ts-fog f2"></div><div class="ts-fog f1"></div>
        <div class="ts-embers">${EMBERS}</div>
        <div class="ts-shade"></div>
        <div class="ts-content">
          <div class="ts-logo"><i class="ts-perch"></i><div class="in"><h1 class="logo">Next!</h1><span class="sub">Arms Dealer’s Ledger</span></div></div>
          ${bottom}
        </div>
        <div class="ts-fog f3"></div>
      </div>
      <div class="ts-vig"></div>
    </div>`;
  }

  const BUILD = '1.0';
  // 이어하기 버튼 아래 — 저장된 날짜와 금고
  function saveLine() {
    try {
      const sv = WS.sys.Save.load();
      if (!sv || !sv.day) return '';
      return `<small class="sv-line"><span class="sv-day">${sv.day}일째</span><span class="sv-sep">·</span><span class="sv-gold">${U.esc(String(sv.gold))}G</span></small>`;
    } catch (e) { return ''; }
  }
  function title() {
    const has = WS.sys.Save.has();
    const mute = WS.Sfx.supported ? `<button class="pbtn ghost title-mute" data-act="mute" aria-label="소리 켜기/끄기">${uiIco(WS.Sfx.muted ? 'sound_off' : 'sound_on')}</button>` : '';
    return titleScene(`<p class="ts-desc">상점 주인이 되어 매출을 올려보세요!</p><div class="ts-menu">
        <i class="ts-torch l"></i><i class="ts-torch r"></i>
        <button class="pbtn primary" data-act="new">새 게임</button>
        ${has || (WS.sys.Save.anySlot && WS.sys.Save.anySlot()) ? `<button class="pbtn ts-continue" data-act="menu-page" data-page="load">이어하기${saveLine()}</button>` : ''}
        <button class="pbtn ts-coll" data-act="coll-open">수집품</button>
      </div>${mute}<p class="ts-credits"><span>Next! · 무기상의 장부</span><i></i><span>Ver ${BUILD}</span></p>`);
  }

  // ───────── 수집품 (엔딩 해금 현황) — 타이틀의 '수집품' 버튼. 기록은 WS.sys.EndingLog (이 브라우저에만) ─────────
  let collOpen = false, collSel = null;
  const collWide = () => window.matchMedia('(min-width: 760px) and (min-aspect-ratio: 1/1)').matches;
  const collThumb = id => {
    const a = WS.data.endingArt && WS.data.endingArt[id];
    if (a && a.thumb) return a.thumb;
    const o = WS.Cinematic && WS.Cinematic.outcomeFor(id);
    return o ? o.frames[2] : '';
  };
  function collection() {
    const log = WS.sys.EndingLog.all(), list = WS.data.endings;
    const n = list.filter(e => log[e.id]).length, tot = list.length;
    const lock = '<svg class="cl-lock" viewBox="0 0 24 28" aria-hidden="true"><path d="M6 12V8a6 6 0 0 1 12 0v4" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="3" y="12" width="18" height="14" rx="2" fill="currentColor"/><circle cx="12" cy="18.5" r="2" fill="#1b1410"/></svg>';
    const lastU = list.filter(e => log[e.id]).sort((x, y) => (log[y.id].at || 0) - (log[x.id].at || 0))[0];
    const selId = list.some(e => e.id === collSel) ? collSel : (lastU || list[0]).id;
    const cards = list.map(e => {
      const r = log[e.id], src = collThumb(e.id);
      const img = src ? `<img src="${U.esc(src)}" alt="" draggable="false" loading="lazy">` : '';
      const sel = e.id === selId ? ' sel' : '';
      if (!r) return `<button type="button" class="coll-card off${sel}" data-act="coll-sel" data-id="${U.esc(e.id)}" aria-label="아직 보지 못한 엔딩"><div class="cl-art">${img}<i class="cl-fog"></i>${lock}</div><div class="cl-cap"><b>???</b></div></button>`;
      return `<button type="button" class="coll-card on${sel}" data-act="coll-sel" data-id="${U.esc(e.id)}" aria-label="${U.esc(e.title)} 다시 보기"><div class="cl-art">${img}<i class="cl-gloss"></i></div><div class="cl-cap"><b>${U.esc(e.title)}</b><small>DAY ${r.day}</small></div></button>`;
    }).join('');
    const last = list.filter(e => log[e.id]).sort((x, y) => (log[y.id].at || 0) - (log[x.id].at || 0))[0];
    const pct = tot ? Math.round(n / tot * 100) : 0;
    return `<div class="coll"><div class="coll-head">
        <button class="pbtn ghost coll-back" data-act="coll-back">← 뒤로 가기</button>
        <h2><i class="orn"></i>수집품<i class="orn"></i></h2>
        <div class="coll-prog"><span>해금 <b>${n}</b> / ${tot} <em>(${pct}%)</em></span><i class="bar"><i style="width:${pct}%"></i></i>
          <span class="coll-last">${last ? `마지막 해금 · <b>${U.esc(last.title)}</b>` : '아직 해금한 엔딩이 없다'}</span></div>
      </div><div class="coll-body"><div class="coll-grid">${cards}</div>${collDetail(selId, log, lock)}</div></div>`;
  }
  // 오른쪽 상세 패널 (넓은 화면) — 미해금이면 '???'와 자물쇠만. 조건·힌트는 보여 주지 않는다
  function collDetail(id, log, lock) {
    const e = WS.data.endings.find(x => x.id === id), r = log[id], src = collThumb(id);
    const img = src ? `<img src="${U.esc(src)}" alt="" draggable="false">` : '';
    if (!r) return `<aside class="coll-detail off"><div class="cd-art">${img}<i class="cl-fog"></i>${lock}</div><h3>???</h3></aside>`;
    const d = r.at ? new Date(r.at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    return `<aside class="coll-detail"><div class="cd-art">${img}<i class="cl-gloss"></i></div><h3>${U.esc(e.title)}</h3>
      <p class="cd-meta"><span>DAY ${r.day}</span><span>${r.gold}G</span>${d ? `<span>${U.esc(d)}</span>` : ''}</p>
      <button type="button" class="pbtn primary cd-view" data-act="coll-view" data-id="${U.esc(id)}">고서 다시 보기</button></aside>`;
  }
  // 해금한 엔딩을 다시 본다 — 타이틀의 (버려도 되는) 상태를 그 엔딩 화면으로 바꿔 표지 → 고서로. '처음으로' 를 누르면 상태가 새로 만들어지고 수집품으로 돌아온다
  function replayEnding(id) {
    const r = WS.sys.EndingLog.all()[id];
    if (!r || !S() || S().phase !== 'title') return;
    if (WS.Cinematic) WS.Cinematic.skip();
    const st = S();
    Object.assign(st, { ending: id, phase: 'ending', replay: true, endingCinema: id, day: r.day || 1, gold: r.gold || 0 });
    delete st.endingStamp; delete st.endingStampPos; delete st.endingBookOpen;
    collOpen = false; collSel = null;
    render();
  }

  // ───────── 아침 신문 ─────────
  // 1면 머리기사 + 삽화, 아래로 단 나눈 기사, 옆 칸에 장터 시세·유행·광고. (Papers, Please 의 "아르스토츠카의 진실"처럼)
  const NP_DECK = { 사건: '현장 목격담 잇따라', 왕국: '왕궁 발표', 전쟁: '전선 특보', 고블린: '숲 너머 소식', 드워프: '산맥 소식', 경제: '장터 동향', 시세: '장터 동향', 생활: '수도의 하루', 소문: '뒷골목에서', 마을: '지방 소식', 보고: '특보', 정정: '본지 정정 보도', 확인: '확인 보도' };
  const NP_ADS = [
    ['강철수염 대장간', '무뎌진 도끼, 하루면 새것처럼. 드워프 거리 3번지'],
    ['백합 약방', '상처엔 붉은 물약, 근심엔 푸른 물약. 외상 사절'],
    ['모험가 길드', '신입 모집. 겁 없는 자 환영, 겁 많은 자 더 환영'],
    ['까마귀 우편', '왕국 어디든 하루 만에. 답장은 까마귀 기분 따라'],
    ['분실물', '검은 망토에 은단추. 찾아 주시는 분께 후히 사례함'],
    ['은빛 여관', '따뜻한 방, 차가운 맥주. 마구간 있음. 싸움은 문밖에서'],
    ['구인 · 창고지기', '힘센 자 우대. 글 읽을 줄 알면 더 우대. 부둣가 7번 창고'],
    ['재단사 오를라', '갑옷 안감 수선. 얼룩도 감쪽같이. 급한 일은 곱절'],
    ['양초 가게', '밀랍초 한 다발 동화 여섯 닢. 긴 겨울 전에 미리'],
    ['뱃삯 공고', '남쪽 항구행 짐배, 닷새마다. 자리는 먼저 오는 순서'],
  ];
  const NP_WEATHER = ['맑음', '흐림', '가랑비', '안개', '바람', '맑음', '소나기'];

  // 기사 삽화 — 본문 낱말을 먼저, 없으면 분류로 (목판화 9종: assets/ui/kit/np_spot_*.png)
  const NP_SPOT_KEYS = [
    [/괴물|늑대|몬스터|용이|드래곤|짐승|마수|괴수|악령|언데드/, 'monster'], [/혜성|징조|불길|까마귀|유성|예언|저주|별이/, 'omen'],
    [/재판|판결|경비|수배|도적|밀수|체포|범인|포상/, 'court'], [/교회|신전|성직|사제|성당|기도|축복/, 'church'],
    [/왕관|왕세자|왕비|국왕|폐하|왕실|귀족|즉위/, 'crown'], [/전쟁|전선|출정|병사|침공|군대|국경|기사단/, 'war'],
    [/고블린/, 'goblin'], [/드워프|광산|대장간|산맥/, 'dwarf'], [/시세|장터|상인|가격|물가|시장|세금|거래/, 'market'],
  ];
  const NP_SPOT_CAT = { 전쟁: 'war', 왕국: 'crown', 고블린: 'goblin', 드워프: 'dwarf', 경제: 'market', 시세: 'market', 광고: 'market', 생활: 'market', 마을: 'church', 사건: 'court', 소문: 'omen', '먼 곳': 'omen', 날씨: 'omen', 보고: 'war' };
  const npSpot = n => {
    const hit = NP_SPOT_KEYS.find(([re]) => re.test(n.text || ''));
    return hit ? hit[1] : (NP_SPOT_CAT[n.cat] || 'court');
  };

  function marketBox() {
    const st = S();
    const ids = WS.sys.Market.supplyList().slice(0, 5);
    if (!ids.length) return '';
    const rows = ids.map(id => {
      const now = WS.sys.Market.price(id);
      const prev = st.prevPrices && st.prevPrices[id];
      const pct = prev ? Math.round((now / prev - 1) * 100) : 0;
      const mv = pct > 0 ? `<i class="up">▲${pct}</i>` : pct < 0 ? `<i class="down">▼${-pct}</i>` : '<i>—</i>';
      return `<tr><td>${U.esc(item(id).name)}</td><td>${now}G</td><td>${mv}</td></tr>`;
    }).join('');
    return `<div class="np-box"><h5>오늘의 장터 시세</h5><table class="np-market">${rows}</table></div>`;
  }

  // 아침 거리 — 새벽빛이 걷히고 아침이 오면 신문 → 도매상 순으로 넘긴다
  function streetPage() {
    endReached = false; // 새 아침 — 장부 끝까지 넘겨야 문이 열린다
    return `${hud()}<div class="street-scene ${dawnPending ? '' : 'go'}" aria-hidden="true"><i class="street-dawn"></i></div>
    <div class="street-gap"></div>
    ${pageBar('street')}`;
  }

  function morning() {
    if (curPage() === 'street') return streetPage();
    if (curPage() === 'letters') return morningLetters();
    if (curPage() === 'ledger') return ledgerPage();
    return newsPage();
  }

  // ───────── 아침 신문 — 두 장짜리 옛 신문 (1면 · 2면) ─────────
  // 넓은 화면은 두 장을 나란히 펼쳐 놓고, 세로 화면은 1면 → 2면 순서로 넘겨 본다 (npSide).
  // 기사가 적은 날에도 두 장이 위아래로 꽉 차도록 광고·공고·날씨·격언 칸이 남는 자리를 메운다 (기사는 지어내지 않는다).
  let npSide = 1;
  let npTurn = ''; // 세로 화면에서 1면 ↔ 2면을 넘긴 직후 한 번만: 'from-right' | 'from-left'
  const NP_MOON = ['초승달', '상현달', '차오르는 달', '보름달', '기우는 달', '하현달', '그믐달'];
  const NP_SAYINGS = [
    '칼은 녹슬어도 장부는 녹슬지 않는다.',
    '외상은 까마귀보다 느리게 돌아온다.',
    '빈 창고엔 손님도 들지 않는다.',
    '밤에 산 물건은 아침에 다시 보라.',
    '소문은 금화보다 빨리 돈다.',
    '값은 손님이 부르고 이문은 주인이 챙긴다.',
    '싸게 산 칼이 제일 비싸다.',
  ];
  function newsPage() {
    const st = S();
    const list = st.newsArchive[st.day] || [];
    const lead = list.find(n => n.big) || list[0];
    const rest = list.filter(n => n !== lead);
    // ✔(key) 기사를 앞에 — 채움(잡담) 기사는 확인할 기사가 없을 때 한두 줄만 남긴다
    const sorted = rest.filter(n => n.key).concat(rest.filter(n => !n.key));
    const main = sorted[0], briefs = sorted.slice(1, 4).filter(n => n.key || n.rumor), back = sorted.slice(4).filter(n => n.key || n.rumor); // ❓ 소문(rumor)은 key 가 아니어도 싣는다
    const prev = (st.newsArchive[st.day - 1] || []).filter(n => n.key).slice(0, 3); // 지난 호에서는 영향 있는 사건(✔)만
    const ad = k => NP_ADS[(st.day * 3 + k) % NP_ADS.length];
    const adBox = ([t, d]) => `<div class="gz-ad"><b>${U.esc(t)}</b><span>${U.esc(d)}</span></div>`;
    // ✔ = 확인할 정보 (사건 · 유행 · 시세 — NewsManager 가 key 로 표시). 채움 기사 · 광고 · 날씨 · 격언은 표시 없이 연하게
    const CHK = '<i class="gz-chk" aria-label="확인할 정보">✔</i>';
    // ❓ = 진위 불명 소문 (청회색 원) — 헛소문일 수 있다. 며칠 뒤 정정·확인 기사(✔)가 나오고, 까마귀 정보상에게 물어볼 수도 있다 (Rumors.js)
    const RUM = '<i class="gz-rum" aria-label="소문 — 진위 불명">❓</i>';
    const mark = n => (n.rumor ? RUM : n.key ? CHK : '');
    const kick = n => `${mark(n)}<span class="gz-kick">${WS.ui.emblemOfCat(n.cat)}${U.esc(n.cat)}</span>`;
    const li = n => `<li class="${n.rumor ? 'rum' : n.key ? 'key' : 'soft'}">${kick(n)} ${U.esc(n.text)}</li>`;
    const prevList = `<h5 class="gz-sect">지난 호에서 · ${st.day - 1}일째</h5><ul class="gz-list">${prev.map(li).join('')}</ul>`;
    const p1 = `${lead && lead.big ? '<div class="np-extra gz-extra" aria-label="호외"><span>호외!</span></div>' : ''}<i class="gz-blot" aria-hidden="true"></i>
      <header class="gz-mast">
        <div class="gz-ears"><span>제 ${st.day}호</span><h2 class="gz-name">대륙 일보</h2><span>값 동화 두 닢</span></div>
        <div class="gz-date"><span>왕국력 1247년 가을 · ${st.day}일째 아침</span><span>날씨 ${NP_WEATHER[st.day % NP_WEATHER.length]}</span><span class="gz-legend">${CHK} = 확인할 정보</span>${list.some(n => n.rumor) ? `<span class="gz-legend rum">${RUM} = 소문(진위 불명)</span>` : ''}</div>
      </header>
      ${lead ? `<section class="gz-lead">
        <div class="gz-kicker">${mark(lead)}${WS.ui.emblemOfCat(lead.cat)}${U.esc(lead.cat)} · ${U.esc(NP_DECK[lead.cat] || '본지 단독')}</div>
        <h3 class="gz-head ${lead.rumor ? 'rum' : lead.key ? '' : 'soft'}">${U.esc(lead.text)}</h3>
      </section>` : ''}
      <div class="gz-body">
        <figure class="gz-fig"><img src="assets/ui/kit/np_spot_${lead ? npSpot(lead) : 'market'}.png" alt=""><figcaption>▲ 본지 삽화</figcaption></figure>
        <div class="gz-main">
          ${main ? `<h4 class="gz-sub">${kick(main)} 주요 기사</h4><p class="gz-drop ${main.rumor ? 'rum' : main.key ? '' : 'soft'}">${U.esc(main.text)}</p>` : `<h4 class="gz-sub">알림</h4><p class="gz-drop">오늘은 조용한 하루였다. 본지는 내일도 문틈으로 찾아간다.</p>`}
          ${briefs.length ? `<h5 class="gz-sect">단신</h5><ul class="gz-list">${briefs.map(li).join('')}</ul>` : ''}
        </div>
      </div>
      <div class="gz-notices one">${adBox(ad(1))}</div>
      <span class="gz-folio">— 1면 —</span>`;
    const ids = WS.sys.Market.supplyList().slice(0, 6);
    const market = ids.map(id => {
      const now = WS.sys.Market.price(id);
      const was = st.prevPrices && st.prevPrices[id];
      const pct = was ? Math.round((now / was - 1) * 100) : 0;
      return `<tr class="${pct ? 'key' : 'soft'}"><td>${pct ? CHK : ''}${U.esc(item(id).name)}</td><td>${now}G</td><td class="${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}">${pct > 0 ? '▲' + pct : pct < 0 ? '▼' + -pct : '—'}</td></tr>`;
    }).join('');
    const p2 = `<div class="gz-run"><span>대륙 일보 · 제 ${st.day}호</span><span class="gz-legend">${CHK} = 확인할 정보</span><span>2면</span></div>
      <div class="gz-grid">
        <section class="gz-cell c-news">${back.length ? `<h5 class="gz-sect">그 밖의 소식</h5><ul class="gz-list">${back.map(li).join('')}</ul>` : `${prev.length ? prevList : ''}<p class="gz-p gz-quiet">${prev.length ? '' : '오늘 더 전할 소식은 없다. 본지는 내일도 문틈으로 찾아간다.'}</p>`}</section>
        <section class="gz-cell c-market"><h5 class="gz-sect">오늘의 장터 시세</h5>${market ? `<table class="gz-market">${market}</table>` : '<p class="gz-p">장이 서지 않았다.</p>'}</section>
        <section class="gz-cell c-trend"><h5 class="gz-sect">${st.trend ? CHK : ''}이번 주 고블린 유행</h5>${st.trend ? `<div class="gz-trend">${ico(st.trend.item, 'sm')}<b>${U.esc(item(st.trend.item).name)}</b></div><p class="gz-p">숲 너머 사내들이 너도나도 찾는다</p>` : '<p class="gz-p">숲 너머는 조용하다</p>'}</section>
        <section class="gz-cell c-sky"><h5 class="gz-sect">날씨 · 격언</h5><p class="gz-sky"><b>${NP_WEATHER[st.day % NP_WEATHER.length]}</b><span>밤하늘 · ${NP_MOON[st.day % NP_MOON.length]}</span></p><p class="gz-say">“${NP_SAYINGS[st.day % NP_SAYINGS.length]}”</p></section>
        <section class="gz-cell c-ads"><h5 class="gz-sect">광고 · 공고</h5><div class="gz-ads">${[3, 4].map(k => adBox(ad(k))).join('')}</div></section>
        ${back.length && prev.length ? `<section class="gz-cell c-prev">${prevList}</section>` : ''}
      </div>
      <span class="gz-folio">— 2면 —</span>`;
    const turn = npTurn; npTurn = '';
    return `${hud()}
    <div class="gz-spread" data-side="${npSide}">
      <article class="gz-sheet p1 ${npSide === 1 ? turn : ''}">${p1}</article>
      <article class="gz-sheet p2 ${npSide === 2 ? turn : ''}">${p2}</article>
    </div>
    ${pageBar('news')}`;
  }

  // ───────── 장부 — 가죽 장부가 펼쳐진다 ─────────
  // 쪽 순서: 1쪽 장부(어제 장사 · 약속·계약) | 2쪽 달력(산 판만, 아니면 빈 자리)과 최근 사건 | 3쪽 대륙 지도(산 판만) | 4쪽 대륙 정세(평판지) |
  //   창고 (한 펼침, 넘치면 다음 펼침) | — 이어서 도매상(언제나 왼쪽 쪽부터). 지도·정세를 하나도 안 샀으면 3·4쪽 펼침은 건너뛴다.
  let ledgerN = 1;       // 창고 앞의 고정 펼침 수 (ledgerPage 가 센다)
  let stockParts = null; // 창고 펼침의 재료 (ledgerPage 가 만들고 flowBook 이 쪽에 나눈다)
  const bkEmpty = { ledger: {}, prep: {} }; // 비어 있는 쪽 — '펼침번호+l|r' (세로 화면에서 건너뛴다)

  function ledgerLeft() {
    const st = S();
    const y = st.day - 1;
    const label = { sell: '판매', refuse: '거절', left: '결렬', buy: '매입', trade: '교환' };
    const rows = st.ledger.filter(e => e.day === y);
    const deal = rows.filter(e => label[e.action]);
    const income = rows.filter(e => e.price > 0).reduce((s, e) => s + e.price, 0);
    const spend = rows.filter(e => e.price < 0).reduce((s, e) => s - e.price, 0);
    const sold = rows.filter(e => e.action === 'sell').length;
    const line = e => {
      const it = e.item ? item(e.item) : null;
      const what = e.action === 'trade' ? tradeText(e) : it ? `${U.esc(it.name)}×${e.qty}` : '—';
      return `<li class="${e.action}"><span class="lg-who">${WS.ui.emblem(e.faction)}${U.esc(e.name)}</span><span class="lg-what">${label[e.action]} · ${what}</span><b class="lg-g ${e.price > 0 ? 'pos' : e.price < 0 ? 'neg' : ''}">${e.price ? (e.price > 0 ? '+' : '') + e.price + 'G' : '—'}</b></li>`;
    };
    const ps = pledges();
    return `<h2 class="bk-title">장부 <small>${st.day}일째 아침</small></h2>
      <h3 class="bk-h">어제 장사 <small>${y}일째</small></h3>
      ${deal.length ? `<ul class="lg-list">${deal.map(line).join('')}</ul>
        <div class="lg-sum"><span>판매 ${sold}건</span><span>받은 돈 <b class="pos">+${income}G</b></span>${spend ? `<span>치른 돈 <b class="neg">−${spend}G</b></span>` : ''}</div>`
        : '<p class="bk-empty">어제는 장사가 없었다.</p>'}
      <h3 class="bk-h">약속 · 계약</h3>
      ${ps.length ? `<ul class="lg-pledges">${ps.map(([ic, t, d]) => `<li><i>${ic}</i><span>${t}</span>${d ? `<small>${d}</small>` : ''}</li>`).join('')}</ul>` : '<p class="bk-empty">걸려 있는 약속이 없다.</p>'}`;
  }

  // 창고 앞의 고정 펼침들: [{ l, r, lc, rc }] (l · r 이 비면 빈 쪽)
  function ledgerFixed() {
    const W = WS.WorldView.pages();
    const sp = [{ l: ledgerLeft(), r: W.logR, lc: 'bk-log', rc: 'bk-log' }];
    if (W.map || W.intel) sp.push({ l: W.map || '', r: W.intel || '', lc: 'bk-map', rc: 'bk-intel' });
    return sp;
  }

  function ledgerPage() {
    const sp = ledgerFixed();
    ledgerN = sp.length;
    stockParts = stockModel();
    bkEmpty.ledger = {};
    sp.forEach((s, i) => { if (!s.l) bkEmpty.ledger[i + 'l'] = 1; if (!s.r) bkEmpty.ledger[i + 'r'] = 1; });
    let l, r, lc = '', rc = '';
    if (Number.isFinite(bkSpread) && bkSpread < ledgerN) ({ l, r, lc, rc } = sp[bkSpread]);
    else { l = stockParts.left(); r = stockParts.right(); lc = rc = 'bk-stock'; } // 창고 펼침 — flowBook 이 실제 높이를 재서 쪽마다 나눈다
    return `${hud()}
    ${book('ledger', l, r, lc, rc)}
    ${pageBar('ledger')}`;
  }

  // 걸려 있는 약속·계약 — [아이콘, 내용, 기한]. 있는 것만
  function pledges() {
    const st = S(), out = [];
    const L = st.letters || {};
    const C = w => WS.sys.Conditions.check(w);
    const senders = (WS.data.letters && WS.data.letters.senders) || {};
    // 달력의 내일 예고 · 재난 손실 · 경비 고용 (WS.sys.Calendar.ledgerLines)
    if (WS.sys.Calendar) WS.sys.Calendar.ledgerLines().forEach(l => out.push([l[0], U.esc(l[1]), l[2]]));
    // 어제 「내일 다시 오시오」로 미룬 손님 — 오늘 아침 대기열 맨 앞에 와 있다 (아직 안 만난 손님만)
    (st.queue || []).filter(c => c.returning && c.status === 'waiting' && c.request).forEach(c => {
      const r = c.request, what = r.item ? item(r.item).name : ((WS.data.categories[r.category] || {}).name || '물건');
      out.push(['🤝', `오늘 다시 오는 손님 — ${U.esc(c.name)} · ${U.esc(what)} ×${r.qty} 요청(어제)`, '오늘']);
    });
    (L.promises || []).forEach(p => out.push(['🤝', `${U.esc(p.name)} — 다시 오기로 한 손님`, `${p.returnDay}일째`]));
    (L.orders || []).forEach(o => out.push(['📦', `${U.esc((senders[o.from] || {}).name || o.from || '상단')} 배달 · ${U.esc(item(o.item).name)}×${o.qty}`, `${o.deliverDay}일째 도착`]));
    if (WS.sys.Letters && WS.sys.Letters.wishes) WS.sys.Letters.wishes().forEach(w => out.push(['✉️', `${U.esc(w.who)} — ${U.esc(w.itemName)}×${w.qty} 들어오면 알리기 (${w.price}G)`, w.status === 'called' ? '기별함' : w.expireDay ? `${w.expireDay}일째까지` : '']));
    if (WS.sys.Letters && WS.sys.Letters.debts) WS.sys.Letters.debts().forEach(d => out.push(['🪙', `빚 ${d.owed}G`, `${d.dueDay}일째까지`]));
    { const cl = WS.sys.Letters && WS.sys.Letters.crowLoan && WS.sys.Letters.crowLoan();
      if (cl) { const n = cl.due - st.day; out.push(['🐦', `까마귀 대출 — 상환 ${WS.sys.Letters.loanOwed(cl)}G, 기한 ${cl.due}일째 밤까지 (${n >= 0 ? 'D-' + n : '연체 ' + (cl.lateDays || 1) + '일째'})`, n >= 0 ? `${cl.due}일째` : '연체'] ); } }
    if (st.guildLoan && st.guildLoan.left > 0) out.push(['🪙', `상인회 빚 ${st.guildLoan.left}G — 못 갚으면 가게를 잃는다`, `${st.guildLoan.due}일째 밤까지`]);
    (st.receivables || []).filter(r => !r.leaf && r.amount > 0).forEach(r => out.push(['📜', `${U.esc(r.name)} 외상값 ${r.amount}G`, `${r.day}일째 받기로`]));
    (st.deposits || []).filter(d => d.status === 'held').forEach(d => out.push(['🔒', `${U.esc(d.name)}에게서 맡은 것 · ${Object.entries(d.items).map(([id, n]) => `${U.esc(item(id).name)}×${n}`).join(', ')}`, `${d.returnDay}일째 찾으러 옴`]));
    if (C({ all: [{ flag: 'dwarf_contract' }, { noFlag: 'dwarf_contract_broken' }] })) {
      const v = k => WS.sys.World.get(k);
      out.push(['⛏️', `강철수염 씨족 광석 납품 계약 — 철광석 개당 ${v('dwarf_ore_price')}G`, `납품 ${v('dwarf_deliveries')}번`]);
    }
    if (C({ all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] })) out.push(['🧪', '케셀과의 화약 거래 — 도매상이 화약을 싸게 넘긴다', '']);
    if (C({ flag: 'demon_contract' })) out.push(['🕯️', '안개 속 계약서에 이름을 적었다', '']);
    return out;
  }

  // 창고 현황 — 자리(무기 거치대 · 갑옷걸이 …)별 칸으로 한눈에: 위에 큰 용량 게이지, 아래에 물건 타일(큰 그림 · 이름 · 개수 · 부피 몫)
  const STK_ICON = { weapon: '⚔️', defense: '🛡️', potion: '🧪', ore: '⛏️', goods: '🌿', gem: '💎', special: '🗝️', docs: '📜', stash: '🎒', etc: '📦' };
  const STK_CHUNK = 6; // 한 덩이에 담는 물건 수 — 자리가 크면 여러 덩이로 나눠 쪽을 넘긴다
  function stockModel() {
    const st = S(), Inv = WS.sys.Inventory;
    const cap = Inv.capacity(), used = Inv.usedSlots();
    const pct = cap ? Math.min(100, used / cap * 100) : 0;
    const groups = {};
    Object.entries(st.inventory).filter(([, n]) => n > 0).forEach(([id, n]) => {
      const pl = WS.sys.Items.shelf(id) || 'etc';
      (groups[pl] = groups[pl] || []).push([id, n]);
    });
    const order = [...ROOM_SPOTS.map(r => r[0]), ...Object.keys(groups).filter(pl => !ROOM_SPOTS.some(r => r[0] === pl))];
    const kinds = Object.values(groups).reduce((s, g) => s + g.length, 0), total = Object.values(groups).reduce((s, g) => s + g.reduce((a, [, n]) => a + n, 0), 0);
    const tile = ([id, n]) => {
      const v = Inv.slotsFor(id, n), share = used ? Math.max(4, Math.round(v / used * 100)) : 0;
      return `<li class="stk2-tile ${n <= 2 ? 'low' : ''}">${ico(id, 'lg')}<span class="t-name">${U.esc(item(id).name)}${heldTag(id)}</span><b class="t-n">${n}<small>개</small></b>
        <span class="t-v"><i style="width:${share}%"></i><small>부피 ${v}</small></span></li>`;
    };
    const units = [];
    order.filter(pl => groups[pl]).forEach(pl => {
      const list = groups[pl].slice().sort((a, b) => Inv.slotsFor(b[0], b[1]) - Inv.slotsFor(a[0], a[1]));
      for (let i = 0; i < list.length; i += STK_CHUNK) {
        const part = list.slice(i, i + STK_CHUNK);
        const v = list.reduce((s, [id, n]) => s + Inv.slotsFor(id, n), 0);
        units.push(`<section class="stk2-grp"><h4><i aria-hidden="true">${STK_ICON[pl] || STK_ICON.etc}</i>${U.esc(PLACE_NAME[pl] || '그 밖')}${i ? ' <em>(이어서)</em>' : ''}<small>${list.length}종 · 부피 ${v}</small></h4>
          <ul class="stk2-tiles">${part.map(tile).join('')}</ul></section>`);
      }
    });
    if (!units.length) units.push('<p class="bk-empty stk2-empty">창고가 텅 비었다. 도매상에서 물건을 들여 오자.</p>');
    // 끝 덩이: 증축 안내 · 장물함
    const stash = stashOn() ? Object.entries((st.stash && st.stash.items) || {}).filter(([, n]) => n > 0) : [];
    const foot = [];
    { const lv = Inv.level(), mx = Inv.maxLevel(), X = Inv.nextStep();
      if (lv >= mx) foot.push(`<p class="stk2-note done">창고 확장 완료 (${lv}/${mx})</p>`);
      else if (WS.sys.Letters && WS.sys.Letters.crowReady()) {
        const busy = st.letters && st.letters.expandOrder;
        foot.push(`<p class="stk2-note">${busy ? `창고 확장 ${lv}/${mx} · 증축 공사 중 — 곧 목수의 답장이 온다` : `창고 확장 ${lv}/${mx} · 다음 ${X.cost}G — 까마귀 서신으로 목수에게 의뢰`}</p>`);
      } }
    if (stashOn()) foot.push(`<p class="stk2-stash"><b>장물함</b> ${stash.length ? stash.map(([id, n]) => `${U.esc(item(id).name)}×${n}`).join(' · ') : '비었다'}</p>`);
    if (foot.length) units.push(`<div class="stk2-foot">${foot.join('')}</div>`);
    const gauge = `<div class="stk2-gauge ${pct >= 100 ? 'full' : pct >= 80 ? 'high' : ''}">
        <div class="sg-top"><span>쓴 부피</span><b>${used}<small> / ${cap}</small></b><em>${used > cap ? `${used - cap} 넘침` : `${cap - used} 남음`}</em></div>
        <div class="sg-bar" role="img" aria-label="창고 ${Math.round(pct)}% 참"><i style="width:${pct}%"></i></div>
        <div class="sg-sub"><span>물건 ${kinds}종</span><span>모두 ${total}개</span><span>${Math.round(pct)}% 참</span></div>
      </div>`;
    const run = t => `<div class="bk-run"><span>${t}</span><span>${st.day}일째 아침</span></div>`;
    return {
      left: () => `<h2 class="bk-title">창고 <small>${st.day}일째 아침</small></h2>${gauge}<div class="stk-groups">${units.join('')}</div>`,
      right: () => `${run('창고 (이어서)')}<div class="stk-groups"></div>`,
      run,
    };
  }

  // ───────── 상점 준비 (장부의 다음 펼침) ─────────
  // +/− 로 주문서에 담기만 하고, 오른쪽 쪽 아래 '구매'를 눌러야 실제로 사고판다 (DayManager.confirmCart).
  // 구매하지 않고 문을 열면 담아 둔 주문은 없던 일이 된다.
  let buyNote = null; // 방금 구매한 결과 한 줄 { text } — 주문서를 다시 만지면 지운다
  const cartOn = () => Object.values(S().cart || {}).some(n => n);
  function prep() {
    const st = S();
    const pv = WS.sys.Day.cartPreview();
    const cap = WS.sys.Inventory.capacity();
    const supply = WS.sys.Market.supplyList();
    // 도매상이 동나 못 사는 물건(철광석 품절 등)은 목록에서 사라지지 않고 '품절'로 남겨 이유를 알 수 있게 한다
    const soldOut = st.flags && st.flags.ore_shortage && P().isUnlocked('ore') && !supply.includes('iron_ore') ? ['iron_ore'] : [];
    const ids = [...new Set([...supply, ...soldOut, ...Object.keys(st.inventory)])];
    const rowOf = id => {
      const it = item(id);
      const n = st.cart[id] || 0;
      const sup = supply.includes(id);
      return `<div class="shop-row ${n ? 'hl' : ''}">
        <div class="sr-ico">${ico(id)}<span class="sr-cat">${catName(it.category)}</span></div>
        <div class="sr-main">
          <div class="sr-name">${U.esc(it.name)} <span class="muted small"> 보유 ${WS.sys.Inventory.count(id)}</span><span class="sr-cat small">개당 부피 ${WS.sys.Inventory.unitSize(id)}</span>${!sup && soldOut.includes(id) ? '<span class="oos" title="철광석 도매가 동났다 — 길드가 광석을 사들이는 중이다">품절</span>' : ''}</div>
          <div class="sr-prices small"><span>시세 <b>${WS.sys.Market.price(id)}</b></span><span>매입 ${sup ? WS.sys.Market.cost(id) : '—'}</span><span>처분 ${WS.sys.Market.wholesale(id)}</span></div>
        </div>
        <div class="stepper">
          <button class="mini" data-act="cart" data-id="${id}" data-n="-5">−5</button>
          <button class="mini" data-act="cart" data-id="${id}" data-n="-1">−</button>
          <span class="cart-n ${n > 0 ? 'pos' : n < 0 ? 'neg' : ''}">${n > 0 ? '+' + n : n}</span>
          <button class="mini" data-act="cart" data-id="${id}" data-n="1" ${sup ? '' : 'disabled'}>+</button>
          <button class="mini" data-act="cart" data-id="${id}" data-n="5" ${sup ? '' : 'disabled'}>+5</button>
        </div>
      </div>`;
    };
    // 물건 줄은 3쪽부터 채우고, 3쪽이 다 찬 뒤에만 4쪽으로 넘어간다 — 그린 뒤 실제 높이를 재서 flowBook() 이 옮긴다
    const rent = WS.sys.Day.rent();
    const pending = cartOn();
    const left = `<h2 class="bk-title">도매상 <small>${st.day}일째 주문서</small></h2>
      <p class="bk-note">+ 매입 · − 도매상에 처분(매입가의 ${Math.round(WS.data.config.wholesaleSellRate * 100)}%, 보석·귀한 물건은 ${Math.round(Math.max(...Object.values(WS.data.config.wholesaleSellRateByShelf || {}), WS.data.config.wholesaleSellRate) * 100)}%). 담은 뒤 '거래 진행'을 눌러야 거래된다.<br>창고 용량은 ${cap} — 물건마다 개당 부피가 다르다(큰 물건일수록 큼).</p>
      <div class="shop-list">${ids.map(rowOf).join('')}</div>`;
    const right = `<div class="bk-run"><span>도매상</span><span>${st.day}일째 주문서</span></div>
      <div class="shop-list"></div>
      <div class="bk-sum">
        <div class="bk-sum-rows">
          <div><span>지금 금고</span><b>${st.gold}G</b></div>
          <div><span>거래 후</span><b class="${pv.gold < st.gold ? 'neg' : pv.gold > st.gold ? 'pos' : ''}">${pv.gold}G</b></div>
          <div title="창고 용량은 ${cap}. 물건 1개마다 부피가 있고 큰 물건일수록 부피가 크다 (예: 부피 24인 물건은 부피 6인 물건의 4배를 차지한다)"><span>창고 용량 ⓘ</span><b class="${pv.slots > cap ? 'neg' : ''}">${pv.slots}/${cap}</b></div>
          <div class="${pv.gold < rent ? 'neg' : ''}"><span>오늘 밤 임대료</span><b>${rent}G</b></div>
        </div>
        ${guildRepayBox()}
        ${pv.gold < rent ? `<div class="warn-strip">⚠ 이대로 사면 오늘 밤 임대료 ${rent}G를 못 낸다 — 오늘 ${rent - pv.gold}G 이상 팔아야 한다</div>` : ''}
        <div class="buy-row">
          ${buyNote && !pending ? `<span class="buy-done" role="status"><i class="buy-stamp">거래 완료</i>${U.esc(buyNote.text)}</span>` : `<span class="buy-hint">${pending ? '담은 주문 — 거래 진행을 눌러야 거래된다' : '담은 주문이 없다'}</span>`}
          <button class="pbtn primary buy-btn ${pending ? 'hot' : ''}" data-act="buy-cart" ${pending ? '' : 'disabled'}>거래 진행</button>
        </div>
      </div>`;
    return `${hud()}
    ${book('prep', left, right)}
    <div class="cart-warn" role="note" ${pending ? '' : 'style="visibility:hidden"'}>거래 진행을 누르지 않은 주문은 취소된다</div>
    ${pageBar('prep')}`;
  }
  // 주문서 확정 — 산 것 · 판 것을 한 줄로 남기고 동전 소리
  function buyCart() {
    const st = S();
    if (!cartOn()) return;
    const g0 = st.gold;
    const bought = Object.entries(st.cart).filter(([, n]) => n > 0).reduce((s, [, n]) => s + n, 0);
    const soldN = Object.entries(st.cart).filter(([, n]) => n < 0).reduce((s, [, n]) => s - n, 0);
    WS.sys.Day.confirmCart();
    const d = st.gold - g0;
    buyNote = { text: [bought ? `${bought}개 들임` : '', soldN ? `${soldN}개 넘김` : '', `${d >= 0 ? '+' : '−'}${Math.abs(d)}G`].filter(Boolean).join(' · ') };
    WS.Sfx.play('coins', 0.6);
    WS.sys.Save.autosave && WS.sys.Save.autosave();
  }

  // ───────── 아침 쪽 넘기기: 거리 → [서신] → 신문 → 장부 → 도매상 → 문 열기 ─────────
  // 아래 막대의 버튼(과 ← → 키)으로 앞뒤로 넘긴다. 서신 쪽은 까마귀가 있고 간밤에 편지가 왔을 때만.
  // 세로 화면의 신문은 1면 → 2면을 한 번 더 넘긴다 (npSide).
  let morningSub = null; // 'letters' | 'news' | 'ledger'
  let turnDir = '';      // 'from-right' | 'from-left' — 넘긴 방향 (책장 넘김 · 신문 넘김)
  const PAGE_NAME = { street: '거리', letters: '서신', news: '신문', ledger: '장부', prep: '도매상' };
  function lettersToday() {
    const L = WS.sys.Letters;
    if (!L || (P() && !P().isUnlocked('crow'))) return [];
    return L.inbox().filter(x => x.day === S().day);
  }
  // 신문은 구독한 다음 날 아침부터 문틈에 끼워져 온다 (구독하기 전엔 없다 — WS.sys.Shop.paperComes)
  const paperComes = () => !!WS.sys.Shop && WS.sys.Shop.paperComes();
  // 1일째는 도매상 없이 거리에서 곧바로 문을 연다 (시작 물건은 config.startInventory)
  // 서신 쪽은 까마귀가 온 뒤로는 편지가 없는 날에도 있다 ('오늘 서신은 없습니다.')
  const crowOpen = () => !!WS.sys.Letters && !(P() && !P().isUnlocked('crow'));
  const morningPages = () => S().day === 1 ? ['street'] : ['street', ...(crowOpen() ? ['letters'] : []), ...(paperComes() ? ['news'] : []), 'ledger', 'prep'];
  let dawnPending = false; // 날짜 전환 직후 — 새벽 거리에서 아침 거리로 밝아지는 중
  function curPage() {
    if (S().phase === 'prep') return 'prep';
    const pages = morningPages();
    if (!pages.includes(morningSub)) morningSub = pages[0];
    return morningSub;
  }
  const narrow = () => !matchMedia(BOOK_WIDE).matches;
  // 세로 화면: 책 안에서 한 쪽씩 — 비어 있는 쪽(bkEmpty)은 건너뛴다. 움직였으면 true
  function stepPage(kind, dir) {
    const K = bkCount[kind] || 1, E = bkEmpty[kind] || {};
    let s = Number.isFinite(bkSpread) ? bkSpread : K - 1, side = bkSide;
    for (let g = 0; g < 300; g++) {
      if (dir > 0) { if (side === 'l') side = 'r'; else { s++; side = 'l'; } }
      else if (side === 'r') side = 'l'; else { s--; side = 'r'; }
      if (s < 0 || s > K - 1) return false;
      if (!E[s + side]) { bkSpread = s; bkSide = side; return true; }
    }
    return false;
  }
  // 쪽을 옮긴다. 마지막 쪽에서 앞으로 넘기면 문을 연다 (true 를 돌려주면 호출한 쪽이 'open' 을 처리)
  function turnPage(dir) {
    const pages = morningPages();
    const cur = curPage();
    // 세로 화면의 신문: 1면 ↔ 2면
    if (cur === 'news' && narrow() && ((dir > 0 && npSide === 1) || (dir < 0 && npSide === 2))) {
      npSide += dir; npTurn = dir > 0 ? 'from-right' : 'from-left';
      WS.Sfx.play('page', 0.5);
      return true;
    }
    // 장부·도매상 안에서: 펼침(2쪽씩)을 하나씩, 세로 화면은 쪽을 하나씩
    if (cur === 'ledger' || cur === 'prep') {
      const K = bkCount[cur] || 1;
      let moved = false;
      if (narrow()) {
        moved = stepPage(cur, dir);
      } else if (dir > 0 && bkSpread < K - 1) { bkSpread++; moved = true; } else if (dir < 0 && bkSpread > 0) { bkSpread--; moved = true; }
      if (moved) { turnDir = dir > 0 ? 'from-right' : 'from-left'; WS.Sfx.play('page', 0.5); return true; }
    }
    const j = pages.indexOf(cur) + dir;
    if (j < 0) return false;
    if (j >= pages.length) return 'open';
    turnDir = dir > 0 ? 'from-right' : 'from-left';
    const to = pages[j];
    if (to === 'news') npSide = dir > 0 || !narrow() ? 1 : 2;
    if (to === 'ledger' || to === 'prep') { bkSpread = dir > 0 ? 0 : Infinity; bkSide = dir > 0 || !narrow() ? 'l' : 'r'; }
    if (to === 'prep') WS.sys.Day.toPrep();
    else { S().phase = 'morning'; morningSub = to; }
    WS.Sfx.play('page', 0.5);
    return true;
  }
  // 아래 막대 (거리 · 서신 · 신문): 다음/이전 쪽 = 그 쪽을 그린 아이콘 버튼 (글자 없음 — 신문 아이콘을 누르면 신문이 나온다).
  // 장부 · 도매상 안에서는 책 속의 붓 화살표로만 넘기고, 아래 막대에는 쪽 표시와 (도매상 끝에서) 문 열기만 둔다.
  const PAGE_LABEL = { street: '거리로', letters: '서신 — 간밤에 온 편지', news: '신문 보기', ledger: '장부 펼치기' };
  const ic = (body, vb = '0 0 48 48') => `<svg class="pg-svg" viewBox="${vb}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const PAGE_ICON = {
    // 신문: 접힌 귀퉁이 종이, 제호 · 그림 · 단
    news: ic('<path d="M9 8 H35 V38 a4 4 0 0 0 4 4 H12 a3 3 0 0 1-3-3Z" fill="rgba(255,246,214,.55)"/><path d="M35 15 H41 V38 a4 4 0 0 1-4 4"/><path d="M14 15 H30" stroke-width="3.6"/><rect x="14" y="20" width="9" height="8" fill="currentColor" stroke="none" opacity=".75"/><path d="M26 21 H31 M26 25 H31 M26 29 H31 M14 33 H31 M14 37 H27" stroke-width="2"/>'),
    // 서신: 밀랍 도장이 찍힌 편지
    letters: ic('<rect x="6" y="12" width="36" height="25" rx="2" fill="rgba(255,246,214,.55)"/><path d="M6 14 L24 28 L42 14"/><circle cx="24" cy="29" r="5.5" fill="currentColor" stroke="none" opacity=".85"/><path d="M22 29 h4 M24 27 v4" stroke="#f3dcae" stroke-width="1.6"/>'),
    // 장부: 가죽 표지 책과 책갈피
    ledger: ic('<path d="M8 10 H22 a4 4 0 0 1 2 .6 a4 4 0 0 1 2-.6 H40 V37 H26 a3 3 0 0 0-2 .9 a3 3 0 0 0-2-.9 H8Z" fill="rgba(255,246,214,.55)"/><path d="M24 11 V38"/><path d="M12 16 H20 M12 21 H20 M12 26 H20 M28 16 H36 M28 21 H36 M28 26 H36" stroke-width="2"/><path d="M33 37 V44 L36 41.5 L39 44 V37" fill="currentColor" stroke="none" opacity=".8"/>'),
    // 거리: 문 달린 집
    street: ic('<path d="M6 25 L24 9 L42 25"/><path d="M11 22 V41 H37 V22" fill="rgba(255,246,214,.55)"/><path d="M20 41 V29 a4 4 0 0 1 8 0 V41"/><path d="M31 16 V11 H35 V19"/><path d="M5 41 H43"/>'),
  };
  // 굽은 초승달 모양의 굵은 화살표 (책 속 이전·다음 쪽 · 신문 1면↔2면). 오른쪽을 가리키게 그려 두고 이전 쪽은 CSS 로 뒤집는다.
  const BRUSH_ARROW = dir => `<svg class="brush-arw" viewBox="0 0 124 80" aria-hidden="true">
      <path d="M4 44 C34 70 78 68 101 43 L105 54 L121 5 L74 25 L90 32 C66 54 34 54 4 44Z" fill="#1c130d" stroke="#f0d9a0" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>
      <path d="M14 46 C40 58 68 56 88 38" fill="none" stroke="#6b4a2a" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
    </svg>`;
  function pageBar(page) {
    const pages = morningPages();
    const i = pages.indexOf(page);
    const prev = pages[i - 1], next = pages[i + 1];
    const isNews = page === 'news';
    const inBook = page === 'ledger' || page === 'prep';
    const dots = `<div class="page-dots">${pages.map(p => `<span class="${p === page ? 'on' : ''}">${PAGE_NAME[p]}</span>`).join('<i>·</i>')}</div>`;
    // 도매상 끝(장부 끝)에 닿아야 문 열기가 켜진다 (flowBook 이 켠다)
    const ready = S().day === 1 || endReached;
    const openBtn = `<button class="pbtn primary page-next" data-act="open" ${page === 'prep' && !ready ? 'disabled' : ''} title="장부 끝까지 넘겨 주세요">문 열기<small>장부 끝까지 넘겨 주세요</small></button>`;
    if (inBook) {
      return `<div class="bottom-bar page-bar in-book">${dots}${page === 'prep' ? openBtn : ''}</div>`;
    }
    // 신문(세로 화면): 1면 ↔ 2면은 붓 화살표 — 넓은 화면은 두 장이 펼쳐져 있으니 옆 쪽 아이콘
    const btn = (dir, target) => {
      const arrowOnly = isNews && ((dir === 'prev' && npSide === 2) || (dir === 'next' && npSide === 1));
      const wide = `<span class="w-only">${PAGE_ICON[target]}</span>`;
      const body = arrowOnly ? `${wide}<span class="n-only">${BRUSH_ARROW(dir === 'prev' ? 'p' : 'n')}</span>` : PAGE_ICON[target];
      const label = arrowOnly && narrow() ? (dir === 'prev' ? '신문 1면' : '신문 2면') : PAGE_LABEL[target];
      return `<button class="pbtn primary page-ico ${dir} ${arrowOnly ? 'has-arw' : ''}" data-act="page-${dir}" aria-label="${label}" title="${label}">${body}</button>`;
    };
    const prevOn = !!prev || (isNews && npSide === 2);
    const prevBtn = prevOn ? btn('prev', isNews && npSide === 2 && !prev ? 'news' : prev) : '<span class="page-ico ghost"></span>';
    return `<div class="bottom-bar page-bar">
      ${prevBtn}
      ${dots}
      ${next ? btn('next', next) : openBtn}
    </div>`;
  }

  // 간밤에 까마귀가 물고 온 편지 — 책이 아니라 거리 위에 편지지 몇 장. 읽고, 필요하면 여기서 바로 답한다
  function morningLetters() {
    const list = lettersToday();
    const fresh = list.some(x => !x.read);
    list.forEach(x => { if (!x.read) WS.sys.Letters.markRead(x.id); });
    if (fresh) setTimeout(() => crowFly('in'), 250);
    return `${hud()}
    <div class="loose-wrap">
      <h2 class="loose-title">간밤에 온 편지 <small>${list.length ? list.length + '통' : '없음'}</small></h2>
      ${mail.flash ? `<div class="mail-flash">${U.esc(mail.flash)}</div>` : ''}
      <div class="mm-list loose">${list.length ? list.map(x => readPane(x)).join('') : '<div class="letter lt-none"><p>오늘 서신은 없습니다.</p><i class="lt-crow" aria-hidden="true"></i></div>'}</div>
    </div>
    ${pageBar('letters')}`;
  }

  // ───────── 펼친 책 (장부 · 도매상) ─────────
  // 넓은 화면은 좌·우 두 쪽, 세로 화면은 한 쪽씩(1 → 2 → 3 → 4). 쪽 번호는 책 안의 순서대로 매긴다.
  let bkSide = 'l';    // 세로 화면에서 보고 있는 쪽 — 'l' | 'r'
  let bkSpread = 0;    // 장부 · 도매상 안의 몇 번째 펼침 (0부터. Infinity = 마지막)
  const bkCount = { ledger: 1, prep: 1 }; // 각 책의 펼침 수 (flowBook 이 잰다)
  let endReached = false; // 도매상 마지막 쪽에 한 번이라도 닿았다
  function book(kind, left, right, lc = '', rc = '') {
    const base = kind === 'prep' ? bkCount.ledger * 2 : 0;
    const no = base + (Number.isFinite(bkSpread) ? bkSpread : 0) * 2 + 1;
    return `<div class="book-wrap"><div class="book" data-kind="${kind}">
      <div class="bk-sheets" data-side="${bkSide}">
        <section class="bk-page l bk-${kind} ${lc}"><div class="bk-in">${left}</div><span class="bk-no">${no}</span></section>
        <section class="bk-page r bk-${kind} ${rc}"><div class="bk-in">${right}</div><span class="bk-no">${no + 1}</span></section>
      </div>
      <button class="bk-arw prev" data-act="page-prev" aria-label="이전 쪽" title="이전 쪽">${BRUSH_ARROW('bp')}</button>
      <button class="bk-arw next" data-act="page-next" aria-label="다음 쪽" title="다음 쪽">${BRUSH_ARROW('bn')}</button>
      <i class="bk-ribbon" aria-hidden="true"></i>
    </div></div>`;
  }
  // 책장 넘기기 — render() 가 새 쪽을 그린 직후에 부른다. 방금 치운 옛 쪽(old)을 넘어가는 종이에 붙여
  // 앞으로: 오른쪽 쪽이 제본선을 축으로 왼쪽으로 넘어가고(앞면=옛 오른쪽, 뒷면=새 왼쪽), 그 아래 새 오른쪽이 드러난다.
  // 뒤로: 왼쪽 쪽이 오른쪽으로 넘어온다. 거리에서 처음 들어올 때는 표지가 열린다. 세로 화면은 한 쪽이 통째로 넘어간다.
  const BOOK_WIDE = '(min-width: 760px) and (min-aspect-ratio: 1/1)';
  const BOOK_COVER = { ledger: '무기점 장부', prep: '무기점 장부' };
  function bookFlip(old) {
    const nb = $ui().querySelector('.book');
    if (!nb) return;
    nb.classList.add('bk-turning');
    if (reduceMotion()) { nb.classList.add('bk-fade'); return; }
    const sheets = nb.querySelector('.bk-sheets');
    const wide = matchMedia(BOOK_WIDE).matches;
    const fwd = old.dir === 'from-right';
    const el = bkEl;
    const still = n => { if (!n) return n; n.setAttribute('aria-hidden', 'true'); n.inert = true; return n; };
    const copy = n => still(n.cloneNode(true));
    const layer = el('bk-flip');
    // 처음 펼칠 때(신문에서 넘어왔을 때): 닫힌 책 — 표지만 오른쪽 절반에 잠깐 놓였다가 왼쪽으로 넘어가 1쪽이 드러난다
    const opening = fwd && !old.l && !old.r && !old.sheets;
    const D = opening ? 560 : 0;
    let leaf, turn, hideNew = null;
    if (wide) {
      const nl = sheets.querySelector('.bk-page.l'), nr = sheets.querySelector('.bk-page.r');
      if (fwd) {
        // 앞면: 옛 오른쪽(없으면 표지) · 뒷면: 새 왼쪽. 왼쪽 자리는 넘김이 끝날 때까지 옛 왼쪽이 덮는다
        if (old.l) layer.appendChild(el('bk-under l', [still(old.l)]));
        else { hideNew = nl; nb.classList.add('bk-opening'); }
        leaf = el('bk-leaf r', [el('bk-face front', [old.r ? still(old.r) : bkCover(nb)]), el('bk-face back', [copy(nl)])]);
        turn = [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }];
      } else {
        if (old.r) layer.appendChild(el('bk-under r', [still(old.r)]));
        leaf = el('bk-leaf l', [el('bk-face front', [old.l ? still(old.l) : bkCover(nb)]), el('bk-face back', [copy(nr)])]);
        turn = [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }];
      }
    } else {
      // 한 쪽짜리: 앞으로는 옛 쪽(처음이면 표지)이 왼쪽 가장자리를 축으로 넘어가 사라지고, 뒤로는 새 쪽이 넘어와 덮는다
      const oldSheet = old.sheets ? still(old.sheets) : null;
      if (fwd) {
        if (opening) nb.classList.add('bk-opening');
        leaf = el('bk-leaf full', [el('bk-face front', [oldSheet || bkCover(nb)]), el('bk-face back', [el('bk-endpaper')])]);
        turn = [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: 1, offset: .8 }, { transform: 'rotateY(-120deg)', opacity: 0 }];
      } else {
        if (oldSheet) layer.appendChild(el('bk-under full', [oldSheet]));
        leaf = el('bk-leaf full', [el('bk-face front', [copy(sheets)]), el('bk-face back')]);
        turn = [{ transform: 'rotateY(-120deg)', opacity: 0 }, { transform: 'rotateY(-100deg)', opacity: 1, offset: .2 }, { transform: 'rotateY(0deg)', opacity: 1 }];
      }
    }
    // 넘어가는 종이의 그늘 — 들릴수록 앞면이 어두워지고, 내려앉을수록 뒷면이 밝아진다
    leaf.querySelectorAll('.bk-face').forEach(f => f.appendChild(el('bk-shade')));
    layer.appendChild(leaf);
    sheets.appendChild(layer);
    if (hideNew) hideNew.style.visibility = 'hidden';
    // 옛 쪽을 옮겨 붙이면 스크롤이 맨 위로 돌아가므로 보던 자리로
    (old.scroll || []).forEach(([n, y]) => { if (n.isConnected) n.scrollTop = y; });
    const T = opening ? 760 : 620;
    const ease = 'cubic-bezier(.42, .02, .28, 1)';
    let done = false;
    const end = () => { if (done) return; done = true; layer.remove(); if (hideNew) hideNew.style.visibility = ''; nb.classList.remove('bk-opening'); }; // bk-turning 은 남겨 둔다 — 떼면 #ui.fresh 의 등장 효과가 뒤늦게 돈다
    const anims = [];
    try {
      const o = { delay: D, fill: 'both' };
      const a = leaf.animate(turn, { duration: T, easing: ease, ...o });
      anims.push(a);
      a.onfinish = end;
      layer.querySelectorAll('.front .bk-shade').forEach(s => anims.push(s.animate([{ opacity: 0 }, { opacity: .55 }], { duration: T / 2, easing: 'ease-in', ...o })));
      layer.querySelectorAll('.back .bk-shade').forEach(s => anims.push(s.animate([{ opacity: .55 }, { opacity: .55, offset: .5 }, { opacity: 0 }], { duration: T, easing: 'ease-out', ...o })));
      // 닫힌 책은 오른쪽 절반만 — 표지가 절반쯤 넘어간 순간 왼쪽 자리(1쪽)가 생긴다
      if (opening && wide) {
        const p = (D + T * 0.5) / (D + T);
        anims.push(nb.animate([{ clipPath: BK_RIGHT }, { clipPath: BK_RIGHT, offset: p }, { clipPath: BK_ALL, offset: p }, { clipPath: BK_ALL }], { duration: D + T }));
      }
      // 표지를 누르면 기다리지 않고 곧바로 연다
      if (opening) {
        leaf.style.pointerEvents = 'auto'; leaf.style.cursor = 'pointer';
        leaf.addEventListener('click', () => anims.forEach(x => { if (x.currentTime < D) x.currentTime = D; }), { once: true });
      }
    } catch (e) { end(); }
    setTimeout(end, D + T + 400); // 창이 가려져 애니메이션이 멈춰도 넘김 종이가 남지 않게
  }
  // 장부 · 도매상의 쪽 나누기 — 스크롤 없이, 실제 높이를 재서 줄 · 칸을 쪽마다 채운다.
  // 도매상: 3쪽부터 채우고 넘치면 4쪽, 그래도 넘치면 다음 펼침(5·6쪽 …). 창고 현황도 같은 원칙. 지금 펼침만 DOM 에 둔다.
  function flowBook() {
    const nb = $ui().querySelector('.book');
    if (!nb) return;
    const kind = nb.dataset.kind, sh = nb.querySelector('.bk-sheets');
    const pl = sh.querySelector('.bk-page.l'), pr = sh.querySelector('.bk-page.r');
    const bl = pl.querySelector('.bk-in'), br = pr.querySelector('.bk-in');
    const side0 = sh.dataset.side;
    const fixedOf = (box, cont) => { cont.style.minHeight = '4000px'; const f = box.scrollHeight - cont.offsetHeight; cont.style.minHeight = ''; return f; };
    const pack = (hs, cap) => { const pages = [[]]; let used = 0; hs.forEach((h, i) => { const c = cap(pages.length - 1); if (pages[pages.length - 1].length && used + h > c) { pages.push([]); used = 0; } pages[pages.length - 1].push(i); used += h; }); return pages; };
    const runHead = t => { const d = document.createElement('div'); d.className = 'bk-run'; d.innerHTML = `<span>${t}</span><span>${S().day}일째 아침</span>`; return d; };
    let K = 1, place = null;
    const SAFE = 8;
    if (kind === 'prep') {
      const contL = bl.querySelector('.shop-list'), contR = br.querySelector('.shop-list');
      const items = [...contL.children];
      sh.dataset.side = 'l';
      const hs = items.map(e => e.offsetHeight);
      const hdr = contL.getBoundingClientRect().top - bl.firstElementChild.getBoundingClientRect().top;
      const capL1 = bl.clientHeight - fixedOf(bl, contL) - SAFE, capLn = capL1 + hdr;
      sh.dataset.side = 'r';
      const capR = br.clientHeight - fixedOf(br, contR) - SAFE;
      const pages = pack(hs, k => (k % 2 === 1 ? capR : k === 0 ? capL1 : capLn));
      K = Math.max(1, Math.ceil(pages.length / 2));
      bkCount.prep = K; if (!Number.isFinite(bkSpread) || bkSpread > K - 1) bkSpread = K - 1;
      const s0 = bkSpread;
      place = () => {
        contL.replaceChildren(...(pages[2 * s0] || []).map(i => items[i]));
        contR.replaceChildren(...(pages[2 * s0 + 1] || []).map(i => items[i]));
        if (s0 > 0) { [...bl.children].forEach(c => { if (c !== contL) c.remove(); }); bl.prepend(runHead('도매상')); }
      };
    } else if (kind === 'ledger') {
      // 창고 펼침(들) — 고정 펼침(장부 · 달력 · 지도 · 정세) 다음. 물건 덩이를 실제 높이로 재서 쪽마다 채운다 (고정 펼침을 보는 중이면 잠깐 창고를 끼워 재고 되돌린다)
      const nF = ledgerN;
      const onStock = !Number.isFinite(bkSpread) || bkSpread >= nF;
      const savedL = [...bl.childNodes], savedR = [...br.childNodes];
      if (!onStock) { bl.innerHTML = stockParts.left(); br.innerHTML = stockParts.right(); }
      const contL = bl.querySelector('.stk-groups'), contR = br.querySelector('.stk-groups');
      const items = [...contL.children];
      sh.dataset.side = 'l';
      const mb = e => parseFloat(getComputedStyle(e).marginBottom) || 0;
      const hs = items.map(e => e.offsetHeight + mb(e));
      const capL0 = bl.clientHeight - fixedOf(bl, contL) - SAFE;
      sh.dataset.side = 'r';
      const capR = br.clientHeight - fixedOf(br, contR) - SAFE;
      const pages = pack(hs, k => (k === 0 ? capL0 : capR)); // 왼쪽 이어지는 쪽은 머리줄만 있어 오른쪽과 같은 높이
      const KS = Math.max(1, Math.ceil(pages.length / 2));
      K = nF + KS;
      bkCount.ledger = K;
      bkEmpty.ledger[(K - 1) + 'r'] = pages.length % 2 === 1 ? 1 : undefined; // 마지막 펼침의 오른쪽이 비면 세로 화면은 건너뛴다
      if (!onStock) {
        bl.replaceChildren(...savedL); br.replaceChildren(...savedR);
        if (!Number.isFinite(bkSpread)) bkSpread = K - 1;
      } else {
        if (!Number.isFinite(bkSpread) || bkSpread > K - 1) bkSpread = K - 1;
        const k = Math.max(0, bkSpread - nF);
        const put = (cont, idx) => cont.replaceChildren(...(pages[idx] || []).map(i => items[i]));
        put(contR, 2 * k + 1);
        if (k === 0) put(contL, 0);
        else {
          const cont = document.createElement('div'); cont.className = 'stk-groups';
          put(cont, 2 * k);
          bl.replaceChildren(runHead('창고 (이어서)'), cont);
        }
      }
    }
    if (place) place();
    // 세로 화면: 비어 있는 쪽에 서 있으면 옆 쪽으로
    if (kind === 'prep' || kind === 'ledger') {
      const E = bkEmpty[kind] || {};
      if (narrow() && Number.isFinite(bkSpread) && E[bkSpread + side0]) bkSide = side0 === 'l' ? 'r' : 'l';
      else bkSide = side0;
    }
    sh.dataset.side = kind === 'prep' || kind === 'ledger' ? bkSide : side0;
    if (kind === 'prep' || kind === 'ledger') {
      const s0 = bkSpread, wide = !narrow();
      const atLast = s0 >= K - 1 && (wide || bkSide === 'r' || !!(bkEmpty[kind] || {})[(K - 1) + 'r']);
      const pn = nb.querySelector('.bk-page.l .bk-no'), qn = nb.querySelector('.bk-page.r .bk-no');
      const base = kind === 'prep' ? bkCount.ledger * 2 : 0;
      if (pn) pn.textContent = base + s0 * 2 + 1;
      if (qn) qn.textContent = base + s0 * 2 + 2;
      const nx = nb.querySelector('.bk-arw.next'); if (nx) nx.hidden = kind === 'prep' && atLast;
      if (kind === 'prep' && atLast) endReached = true;
      const ob = $ui().querySelector('.page-bar [data-act="open"]');
      if (ob) { ob.disabled = !(endReached || S().day === 1); ob.classList.toggle('ready', !ob.disabled); }
    }
  }
  const BK_ALL = 'polygon(-5% -20%, 105% -20%, 105% 120%, -5% 120%)';
  const BK_RIGHT = 'polygon(50% -20%, 105% -20%, 105% 120%, 50% 120%)';
  const BK_LEFT = 'polygon(-5% -20%, 50% -20%, 50% 120%, -5% 120%)';
  const bkEl = (cls, kids) => { const d = document.createElement('div'); d.className = cls; (kids || []).forEach(k => k && d.appendChild(k)); return d; };
  // 앞표지(제목) · 뒤표지(back) — 가죽에 놋쇠 모서리
  const bkCover = (nb, back) => bkEl(`bk-cover ${back ? 'back' : ''}`, back ? [] : [Object.assign(document.createElement('b'), { textContent: BOOK_COVER[nb.dataset.kind] || '' })]);

  // 책을 덮는다 — 문 열기 직전. 맨 끝장을 넘기듯: 오른쪽 쪽(4쪽)이 왼쪽으로 넘어가고, 이어서 뒤표지가 오른쪽에서 왼쪽으로 덮인다.
  // 책은 왼쪽 절반 자리에 뒤표지를 보인 채 닫히고, 살짝 가라앉으며 사라진 뒤 done() (영업 시작 전환)을 부른다.
  let bookClosing = false;
  function bookClose(done) {
    const nb = $ui().querySelector('.book');
    if (!nb || reduceMotion() || !nb.animate) { done(); return; }
    bookClosing = true;
    const el = bkEl;
    const sheets = nb.querySelector('.bk-sheets');
    const layer = el('bk-flip');
    const ease = 'cubic-bezier(.42, .02, .28, 1)';
    const anims = [];
    let total;
    nb.classList.add('bk-closing');
    WS.Sfx.play('page', 0.5);
    try {
      if (!narrow()) {
        const nr = sheets.querySelector('.bk-page.r');
        const front = nr.cloneNode(true); front.inert = true;
        // 뒤표지(안쪽 면지 → 바깥 가죽)가 아래에, 4쪽이 위에
        const cov = el('bk-leaf r cov', [el('bk-face front', [el('bk-endpaper')]), el('bk-face back', [bkCover(nb, true)])]);
        const pg = el('bk-leaf r pg', [el('bk-face front', [front]), el('bk-face back', [el('bk-endpaper paper')])]);
        [cov, pg].forEach(l => l.querySelectorAll('.bk-face').forEach(f => f.appendChild(el('bk-shade'))));
        layer.append(cov, pg);
        sheets.appendChild(layer);
        nr.style.visibility = 'hidden';
        const E = { easing: ease, fill: 'both' };
        anims.push(pg.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }], { duration: 380, ...E }));
        anims.push(cov.animate([{ transform: 'rotateY(0deg)', zIndex: 1 }, { transform: 'rotateY(-180deg)', zIndex: 3 }], { duration: 400, delay: 280, ...E }));
        pg.querySelectorAll('.front .bk-shade').forEach(x => x.animate([{ opacity: 0 }, { opacity: .5 }], { duration: 190, fill: 'both' }));
        cov.querySelectorAll('.front .bk-shade').forEach(x => x.animate([{ opacity: 0 }, { opacity: .5 }], { duration: 200, delay: 280, fill: 'both' }));
        // 넘어가는 종이는 원근 때문에 책 밖으로 커 보이므로 책을 자르지 않는다 — 표지가 세워져(가장 얇을 때) 있는 순간에만 빈 오른쪽 절반을 재빨리 걷어낸다
        nb.animate([{ clipPath: BK_ALL }, { clipPath: BK_ALL, offset: .7 }, { clipPath: BK_LEFT, offset: .84 }, { clipPath: BK_LEFT }], { duration: 700, fill: 'both' });
        total = 680;
      } else {
        const front = sheets.cloneNode(true); front.inert = true;
        layer.appendChild(el('bk-under full', [bkCover(nb, true)]));
        const pg = el('bk-leaf full', [el('bk-face front', [front]), el('bk-face back', [el('bk-endpaper paper')])]);
        pg.querySelectorAll('.bk-face').forEach(f => f.appendChild(el('bk-shade')));
        layer.appendChild(pg);
        sheets.appendChild(layer);
        anims.push(pg.animate([{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: 1, offset: .8 }, { transform: 'rotateY(-120deg)', opacity: 0 }], { duration: 480, easing: ease, fill: 'both' }));
        total = 480;
      }
      nb.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(26px) scale(.96)', opacity: 0 }], { duration: 300, delay: total + 20, easing: 'ease-in-out', fill: 'forwards' });
    } catch (e) { bookClosing = false; done(); return; }
    let fired = false;
    const go = () => { if (fired) return; fired = true; bookClosing = false; done(); };
    setTimeout(go, total + 230); // 책이 가라앉는 끝자락에 전환 막이 겹쳐 들어온다
  }

  // ───────── 영업: 손님 말풍선(장면 위) → 요구 쪽지(오른쪽) ─────────
  // 손님이 한 말은 머리 위 말풍선으로 잠깐 떴다가 사라지고, 그 자리를 오른쪽의 요구 쪽지가 이어받는다.
  // render()가 자주 다시 그려도 애니메이션이 처음부터 다시 돌지 않게, 말이 처음 뜬 시각을 기억해 두고
  // 지난 시간만큼 음수 animation-delay 로 이어서 재생한다.
  let say = { key: null, at: 0, from: 0 };
  const SAY_ENTER = 650; // 손님이 카운터까지 걸어오는 시간 — 도착한 뒤에 입을 연다
  const sayDur = text => Math.min(5200, 1500 + text.length * 55);

  const ASK_AGAIN = '내가 잘 못 들었소. 다시 말해 주시오.';

  function sayState(c) {
    if (!c || !c.dialog.length) return null;
    const key = `${c.uid}:${c.dialog.length}`;
    if (key !== say.key) {
      const fresh = !say.key || !say.key.startsWith(c.uid + ':');
      say = { key, at: performance.now() + (fresh ? SAY_ENTER : 0), from: fresh ? 0 : Math.max(0, say.len || 0) };
      say.len = c.dialog.length;
      if (fresh) say.from = Math.max(0, c.dialog.length - 1);
    }
    let lines;
    if (say.custom) lines = say.custom; // 소속 묻기: 내 물음 → 손님 대답 (대화 기록엔 남기지 않는다)
    else if (say.ask) {
      // 다시 듣기: 내가 되묻고 → 손님이 마지막으로 한 말을 다시 한다
      const lastC = [...c.dialog].reverse().find(d => d.who === 'c');
      lines = [{ who: 'p', text: ASK_AGAIN }, ...(lastC ? [lastC] : [])];
    } else lines = c.dialog.slice(Math.max(say.from, c.dialog.length - 2));
    const dur = lines.reduce((t, d) => t + sayDur(d.text), 0);
    // 한 번 눌러 말을 다 펼쳐 둔 상태 — 다시 누를 때까지 그대로 떠 있다
    if (say.held) return { lines, dur, left: 1e9, held: true };
    return { lines, dur, left: say.at + dur - performance.now() };
  }

  // 말풍선 넘기기 — 처음 누르면 남은 말을 한꺼번에 펼치고(held), 한 번 더 누르면 닫는다
  function advanceSay() {
    if (!say.held) say.held = true;
    else { say.held = false; say.ask = false; say.custom = null; say.at = performance.now() - 60000; }
  }

  // 타자 치듯 한 글자씩 — 다시 그려도 시작 시각(data-t0)을 기준으로 이어서 찍는다
  const CHAR_MS = 34;
  setInterval(() => {
    const now = performance.now();
    document.querySelectorAll('.say[data-t0]').forEach(el => {
      const ty = el.firstElementChild, rest = el.lastElementChild;
      const full = el.dataset.full || (el.dataset.full = rest.textContent);
      const n = Math.max(0, Math.min(full.length, Math.floor((now - +el.dataset.t0) / CHAR_MS)));
      if (ty.textContent.length !== n) { ty.textContent = full.slice(0, n); rest.textContent = full.slice(n); }
    });
  }, 30);

  // 손님을 누르면 되물어서 다시 듣는다
  function replaySay(c) {
    if (!c || !c.dialog.length) return;
    if (S().progress) (S().progress.tutorialsSeen = S().progress.tutorialsSeen || {}).replay = true;
    say = { key: `${c.uid}:${c.dialog.length}`, at: performance.now(), from: 0, len: c.dialog.length, ask: true, held: false };
  }

  // ───────── 소속 묻기 (왼손 앞 테이블 위 확대경) ─────────
  // 누르면 내 두 손 사이에서 "어디 소속이오?" → 손님 머리 위로 대답. 인장을 내밀면 대답이 끝날 즈음 확대경으로 펼친다.
  // 판정은 없다 — 규정집 원본과 나란히 놓고 눈으로 가린다 (Papers, Please 처럼).
  const AFFIL_Q = '어디 소속이오? 인장 좀 봅시다.';
  let sealOpen = false; // 인장 대조 창 열림
  let sealRef = null;   // 규정집에서 펼친 문장 (세력 id)
  let sealTimer = null;
  const affilOf = c => WS.sys.Customers.affil(c);
  const showsSeal = c => !!c && (!!c.docCheck || affilOf(c).seal !== 'none');
  function askAffil(c) {
    if (!c || c.status === 'done') return;
    const a = affilOf(c);
    const seen = S().progress && (S().progress.tutorialsSeen = S().progress.tutorialsSeen || {});
    if (seen) seen.affil = true;
    // 이미 물어서 인장을 받아 둔 손님 — 다시 누르면 곧바로 인장을 펼친다
    if (c.affilAsked && showsSeal(c)) { openSeal(c); return; }
    c.affilAsked = true;
    const lines = [{ who: 'p', text: AFFIL_Q }, { who: 'c', text: a.line }];
    say = { key: `${c.uid}:${c.dialog.length}`, at: performance.now(), from: 0, len: c.dialog.length, custom: lines, held: false };
    clearTimeout(sealTimer);
    if (!showsSeal(c)) return;
    const mine = say;
    sealTimer = setTimeout(() => {
      const cur = WS.sys.Day.current();
      if (cur !== c || c.status === 'done' || S().phase !== 'shop' || sealOpen || magnifyOpen) return;
      if (say !== mine) return; // 그 사이 다른 말(다시 듣기 등)로 넘어갔다
      openSeal(c);
      render();
    }, sayDur(AFFIL_Q) + sayDur(a.line) - 300);
  }
  function openSeal(c) {
    // 돋보기로 처음 살펴볼 때 손님 틀에 inspectLine 이 있으면 주인이 혼잣말을 하고, 살펴본 뒤에야 열리는 선택지(needs: 'inspect')가 풀린다
    if (!c.inspected) {
      c.inspected = true;
      const tt = WS.sys.Customers.tplById(c.tpl);
      if (tt && tt.inspectLine) c.dialog.push({ who: 'p', text: tt.inspectLine });
    }
    if (c.docCheck) { magnifyOpen = true; return; } // 인장 서류 손님은 원래의 감정 확대경(통과/지적)으로
    sealOpen = true;
    overlayShown = false;
    const a = affilOf(c);
    sealRef = a.claim || null;
  }
  // 인장 주인 — 세력, 또는 세력이 아닌 인장(국왕 직속 등 — factions.js 의 WS.data.extraSeals)
  const sealMeta = id => fac(id) || (WS.data.extraSeals || {})[id] || null;
  // 규정집 목록: 인장이 있는 세력 + 세력이 아닌 인장 (국왕 직속은 왕국 바로 뒤에)
  const sealFactions = () => {
    const list = Object.entries(WS.data.factions).filter(([, f]) => !(f.affil && f.affil.seal === false));
    Object.entries(WS.data.extraSeals || {}).forEach(([id, m]) => {
      const i = list.findIndex(([k]) => k === m.after);
      list.splice(i < 0 ? list.length : i + 1, 0, [id, m]);
    });
    return list;
  };
  // 인장 한 개 — 세력 색의 밀랍 위에 문장. 위조본은 손님마다 어긋난 곳이 다르다
  // 같은 (세력, 위조, 위조범) 이면 같은 그림이므로 한 번 만든 SVG 를 다시 쓴다
  const sealCache = new Map();
  const sealArt = (fid, forged, forgeSeed) => {
    const key = `${fid}|${forged ? 1 : 0}|${forged ? forgeSeed : ''}`;
    let html = sealCache.get(key);
    if (!html) {
      const m = sealMeta(fid) || {};
      const hi = m.sealColor ? `;--wax-hi:${m.sealColor}` : '';
      html = `<div class="wax ${m.gilt ? 'gilt' : ''}" style="--wax:${m.color || '#7a5a3a'}${hi}">${WS.sys.DocCheck.render('seal:' + fid, forged, 132, forgeSeed)}</div>`;
      if (sealCache.size > 200) sealCache.clear();
      sealCache.set(key, html);
    }
    return html;
  };
  // 규정집 원본 쪽 — 문장 이름까지
  const sealRefHtml = () => {
    const m = sealRef && sealMeta(sealRef);
    return m
      ? `${sealArt(sealRef, false)}<b class="seal-name">${m.icon} ${U.esc(m.name)}</b>`
      : '<p class="small muted seal-pick-hint">아래에서 대조해 볼 문장을 고른다</p>';
  };
  // 규정집에서 문장을 바꿀 때는 전체를 다시 그리지 않고 원본 칸만 바꿔 끼운다 (깜빡임 없이 바로)
  function swapSealRef() {
    const slot = document.querySelector('.seal-check .seal-ref-slot');
    if (!slot) return false;
    slot.innerHTML = sealRefHtml();
    document.querySelectorAll('.seal-check .seal-ref').forEach(b => b.classList.toggle('on', b.dataset.id === sealRef));
    return true;
  }
  // 확대경 창이 열린 채 다시 그려질 때 여는 애니메이션(흐려졌다 밝아짐)이 되풀이되지 않게 — 처음 한 번만
  let overlayShown = false;
  let drawerShown = false; // 서랍이 열린 채 다시 그려질 때 미끄러져 들어오는 애니메이션을 되풀이하지 않게
  const overlayAnim = () => { const cls = overlayShown ? 'steady' : ''; overlayShown = true; return cls; };

  function sealOverlay(c) {
    const a = affilOf(c);
    const theirs = sealArt(a.sealOf, a.seal === 'fake', 'forge:' + c.uid);
    const cm = a.claim && sealMeta(a.claim);
    const lead = cm
      ? `손님은 <b>${U.esc(cm.name)}</b> 소속이라 했다. 규정집의 원본 문장과 손님이 내민 인장을 나란히 놓고 대조한다.`
      : '손님은 소속을 대지 않았다. 규정집에서 대조해 볼 문장을 골라 본다.';
    const picks = sealFactions().map(([id, f]) => `<button class="seal-ref ${id === sealRef ? 'on' : ''}" data-act="seal-ref" data-id="${id}" title="${U.esc(f.fullName)}">${f.icon}<small>${U.esc(f.name)}</small></button>`).join('');
    const st = overlayAnim();
    return `<div class="drawer-bg ${st}" data-act="seal-close"></div>
    <div class="magnify-overlay seal-check ${st}">
      <button class="x-close" data-act="seal-close" aria-label="닫기"></button>
      <div class="magnify-head"><b>🔍 소속 인장 대조</b></div>
      <p class="small muted">${lead}</p>
      <div class="magnify-cols">
        <div class="magnify-side"><small class="muted">규정집 원본</small><div class="seal-ref-slot">${sealRefHtml()}</div></div>
        <div class="magnify-side"><small class="muted">손님이 내민 인장</small>${theirs}</div>
      </div>
      <div class="seal-book"><small class="muted">규정집 — 세력 문장</small><div class="seal-refs">${picks}</div></div>
      <div class="btn-row"><button class="pbtn grow" data-act="seal-close">인장을 돌려준다</button></div>
    </div>`;
  }

  // 왼손 앞 테이블 위의 확대경 — 장면(Scene)이 그려 두고(assets/scene/magnifier.png), 그 위에 투명한 누름 자리를 깐다.
  // 카운터에 손님이 있는 동안만. 게임의 첫 손님에게는 한 번 반짝여 알려 준다
  function affilButton(c) {
    if (!c || c.status === 'done') return '';
    const st = S();
    const seen = st.progress && st.progress.tutorialsSeen && st.progress.tutorialsSeen.affil;
    const glow = !seen && st.day === 1 && st.queue && st.queue[0] === c;
    return `<button class="affil-hit ${glow ? 'tut-glow' : ''}" data-act="affil-ask" title="확대경 — 소속을 묻고 인장을 본다" aria-label="소속 묻기 · 인장 보기"></button>`;
  }
  // 캔버스는 무대 크기에 맞춰 늘어나므로, 그려진 확대경 자리에 맞춰 누름 자리를 옮긴다 (렌더·크기 변경 때마다)
  function placeAffilHit() {
    const el = document.querySelector('.affil-hit');
    const cv = document.getElementById('scene');
    if (!el || !cv || !el.offsetParent || !WS.Scene.magnifierBox) return;
    const r = cv.getBoundingClientRect(), p = el.offsetParent.getBoundingClientRect();
    const m = WS.Scene.magnifierBox();
    Object.assign(el.style, {
      left: `${r.left - p.left + m.fx * r.width}px`, top: `${r.top - p.top + m.fy * r.height}px`,
      width: `${m.fw * r.width}px`, height: `${m.fh * r.height}px`,
    });
  }

  // 화면 좌표가 장면 속 손님 몸 위인지 (테이블 위는 제외)
  function overCustomer(x, y) {
    const cv = document.getElementById('scene');
    if (!cv || !WS.Scene.customerAt) return false;
    const r = cv.getBoundingClientRect();
    return WS.Scene.customerAt((x - r.left) / r.width, (y - r.top) / r.height);
  }

  // 손님 말은 머리 위, 내 말은 내 두 손 사이에서 — 한 마디씩 차례로 뜬다
  function sceneBubbles(c) {
    const st = sayState(c);
    if (!st || st.left <= 0) return '';
    let t = say.at - performance.now();
    const top = [], me = [];
    st.lines.forEach(d => {
      const dur = sayDur(d.text);
      // 한 글자씩 찍힌다 (typeTick). 펼쳐 둔 상태(held)면 전부 보인 채 멈춰 있다
      const ang = d.who === 'c' && c.angry && d === c.dialog[c.dialog.length - 1] ? ' angry' : '';
      const html = st.held
        ? `<div class="say ${d.who}${ang} held">${U.esc(d.text)}</div>`
        : `<div class="say ${d.who}${ang}" style="--dur:${dur}ms;--delay:${Math.round(t)}ms" data-t0="${Math.round(performance.now() + t)}"><span class="ty"></span><span class="rest">${U.esc(d.text)}</span></div>`;
      (d.who === 'p' ? me : top).push(html);
      t += dur;
    });
    const skipTip = S().day === 1 ? `<small class="say-tip" style="animation:fadeGone .2s linear ${Math.round(st.left)}ms forwards">오른쪽 아래를 누르면 말이 다 나오고, 한 번 더 누르면 닫힌다</small>` : '';
    return (top.length ? `<div class="say-wrap" data-act="say-skip">${top.join('')}${skipTip}</div>` : '')
      + (me.length ? `<div class="say-wrap me" data-act="say-skip">${me.join('')}</div>` : '');
  }

  // 말풍선이 다 사라진 뒤 요구 쪽지가 들어오는 지연(ms, 음수면 이미 들어와 있음)
  const slipDelay = c => { const st = sayState(c); return st && !say.ask && !say.custom ? Math.round(st.left) : -9999; };

  // 시세 대비 몇 % 인지 한눈에 보이는 배지
  function priceBadge(diff) {
    if (!diff) return `<span class="price-badge flat">시세와 같다</span>`;
    const up = diff > 0;
    return `<span class="price-badge ${up ? 'pos' : 'neg'}">${up ? '▲' : '▼'} 시세보다 ${up ? '+' : ''}${diff}%</span>`;
  }

  // 교환: 왼쪽 = 내가 넘길 물건, 오른쪽 = 손님이 내놓는 물건 (+웃돈)
  function tradeStrip(c) {
    const t = c.trade;
    const T = WS.sys.Trade;
    const mine = t.want.map(w => {
      const have = WS.sys.Inventory.count(w.item);
      return `<div class="trade-item">${ico(w.item, 'sm')}<span><b>${U.esc(item(w.item).name)} ×${w.qty}</b><small class="${have < w.qty ? 'neg' : 'muted'}"> 보유 ${have}</small></span></div>`;
    }).join('');
    const theirs = t.give.map(g => `<div class="trade-item">${ico(g.item, 'sm')}<span><b>${U.esc(item(g.item).name)} ×${g.qty}</b><small class="muted"> ${U.esc(item(g.item).rarity)}</small></span></div>`).join('');
    const gold = t.gold ? `<div class="trade-gold ${t.gold > 0 ? 'pos' : 'neg'}">${t.gold > 0 ? '+ 웃돈 ' + t.gold : '− 내가 ' + -t.gold}G</div>` : '';
    const giveV = T.sideValue(t.want), getV = T.sideValue(t.give) + t.gold;
    const diff = giveV ? Math.round(((getV - giveV) / giveV) * 100) : 0;
    return `<div class="deal trade">
      <div class="trade-cols">
        <div class="trade-side"><small class="muted">내가 줄 것</small>${mine}</div>
        <div class="trade-arrow">⇄</div>
        <div class="trade-side"><small class="muted">받을 것</small>${theirs}${gold}</div>
      </div>
      <div class="trade-sum"><span class="small muted">시세로 치면 줄 것 ${giveV}G · 받을 것 ${getV}G</span> ${priceBadge(diff)}</div>
    </div>`;
  }

  // 구형(콘크리트 아이템) 요청: 판매(kind sell)·매입(kind buy, 구형) 공용
  function dealStrip(c) {
    const r = c.request;
    const it = item(r.item);
    const have = WS.sys.Inventory.count(r.item);
    const market = WS.sys.Market.price(r.item);
    const amount = c.kind === 'sell' ? r.price : r.offer;
    const unit = Math.round(amount / r.qty);
    const diff = Math.round(((unit - market) / market) * 100);
    const lack = c.kind !== 'sell' && have < r.qty;
    return `<div class="deal">
      <div class="deal-main">
        ${ico(r.item)}
        <div class="deal-name"><b>${U.esc(it.name)} ×${r.qty}</b><span class="small ${lack ? 'neg' : 'muted'}">${c.kind === 'sell' ? '매입 제안' : '보유 ' + have + '개'}</span>${c.payNote ? `<span class="small neg">${U.esc(c.payNote)}</span>` : ''}</div>
        <div class="deal-price"><b>${amount}G</b><span class="small muted">개당 ${unit}G · 시세 ${market}G</span>${priceBadge(diff)}</div>
      </div>
    </div>`;
  }

  // 신형(카테고리) 요청: 소분류별 대우(우대/보통/거절)를 나열
  function findRepresentative(category, subtype) {
    const entries = Object.entries(WS.data.items).filter(([, it]) => it.newCategory === category && (!subtype || it.subtype === subtype));
    if (!entries.length) return null;
    const plain = entries.find(([, it]) => !it.special) || entries[0];
    return plain[0];
  }

  function categorySummary(c) {
    const r = c.request;
    const subs = WS.data.categories[r.category].subtypes;
    const rows = Object.entries(subs).map(([sub, label]) => {
      const repId = findRepresentative(r.category, sub);
      if (!repId) return '';
      const pref = r.preferSubtype === sub;
      const payMult = pref ? (r.preferPay ?? 1) : (r.otherPay ?? 1);
      const refused = !pref && ((r.refuseSubtypes || []).includes(sub) || payMult < 0.5);
      const pct = Math.round((payMult - 1) * 100);
      const pxText = refused ? '거절' : (pct === 0 ? '시세대로' : (pct > 0 ? `+${pct}% 웃돈` : `${pct}%`));
      return `<div class="sum-row ${pref ? 'pref' : ''}"><div class="ic">${item(repId).icon}</div><div class="nm">${U.esc(label)}</div><div class="px">${U.esc(pxText)}</div></div>`;
    }).join('');
    // 마진은 왼쪽, 요구사항(무엇을 얼마나 우대·박대하는지)은 오른쪽
    return `<div class="deal-2col">
      <div class="deal-col-margin">${marginBoxHtml(marginInfo(c))}</div>
      <div class="deal-col-req">
        <div class="lbl">▾ ${U.esc(WS.data.categories[r.category].name)}에서 무엇을 내줄지 골라보기</div>
        ${rows}
      </div>
    </div>`;
  }

  function marginBoxHtml(info) {
    const loss = info.margin < 0;
    return `<div class="margin-box ${loss ? 'loss' : ''}">
      <div class="calc">받는 값 <b>${Math.round(info.got)}G</b> − 원가 <b>${Math.round(info.cost)}G</b></div>
      <div class="result">마진 ${info.margin >= 0 ? '+' : ''}${Math.round(info.margin)}G</div>
    </div>`;
  }

  // 마진 계산: 손님 kind·요청 형태(신형/구형)에 따라 "받는 값"과 "원가"를 구한다
  function marginInfo(c) {
    const T = WS.sys.Trade;
    if (c.kind === 'trade') {
      const t = c.trade;
      const giveV = T.sideValue(t.want), getV = T.sideValue(t.give) + t.gold;
      return { got: getV, cost: giveV, margin: getV - giveV };
    }
    const r = c.request;
    if (c.kind === 'sell') {
      const mv = WS.sys.Market.price(r.item) * r.qty;
      return { got: mv, cost: r.price, margin: mv - r.price };
    }
    // 사러 온 손님 — 테이블에 올린 것 중 손님이 받아 갈 것만 계산 (비어 있으면 0)
    const d = tableDeal(c);
    return { got: d.got, cost: d.cost, margin: d.got - d.cost };
  }

  function dealSummary(c) {
    if (c.kind === 'trade') return `${tradeStrip(c)}<div class="deal-sum">${marginBoxHtml(marginInfo(c))}</div>`;
    const r = c.request;
    if (r.category) return categorySummary(c);
    // 마진 왼쪽, 요구사항(물건·수량·가격) 오른쪽
    return `<div class="deal-2col">
      <div class="deal-col-margin">${marginBoxHtml(marginInfo(c))}</div>
      <div class="deal-col-req">${dealStrip(c)}</div>
    </div>`;
  }

  // ───────── 감정 확대경 (서류/인장 대조 미니게임) ─────────
  function magnifyOverlay(c) {
    const dc = c && c.docCheck;
    if (!dc) return '';
    // 인장 서류도 손님이 내민 세력의 문장으로 — 밀랍 색까지 그 세력 것
    const sf = affilOf(c).sealOf, m = sealMeta(sf), fid = m ? sf : null;
    const wax = svg => `<div class="wax ${m && m.gilt ? 'gilt' : ''}" style="--wax:${m ? m.color : '#7a5a3a'}${m && m.sealColor ? `;--wax-hi:${m.sealColor}` : ''}">${svg}</div>`;
    const ref = wax(WS.sys.DocCheck.render(dc.seed, false, 132, null, fid));
    const theirs = wax(WS.sys.DocCheck.render(dc.seed, !!dc.forged, 132, null, fid));
    const st = overlayAnim();
    const verdictText = c.docCheckDone
      ? `<p class="small ${c.docCheckCorrect ? 'pos' : 'neg'}">${c.docCheckVerdict === 'accuse' ? '위조라 지적했다.' : '진짜로 판단해 통과시켰다.'} ${c.docCheckCorrect ? '(판단이 맞았을 것이다…)' : ''}</p>`
      : `<div class="btn-row"><button class="pbtn" data-act="magnify-pass">진짜 같다 → 통과</button><button class="pbtn danger" data-act="magnify-accuse">위조 같다 → 지적한다</button></div>`;
    return `<div class="drawer-bg ${st}" data-act="magnify-close"></div>
    <div class="magnify-overlay ${st}">
      <button class="x-close" data-act="magnify-close" aria-label="닫기"></button>
      <div class="magnify-head"><b>🔍 감정 확대경</b></div>
      <p class="small muted">상단 통상령철의 원본 문장과 손님이 제시한 인장을 확대해 나란히 놓고 대조한다.</p>
      <div class="magnify-cols">
        <div class="magnify-side"><small class="muted">규정집 원본</small>${ref}</div>
        <div class="magnify-side"><small class="muted">손님이 제시한 인장</small>${theirs}</div>
      </div>
      ${verdictText}
    </div>`;
  }

  function resolveDocCheck(c, verdict) {
    if (!c || !c.docCheck || c.docCheckDone) return;
    const dc = c.docCheck;
    const correct = (verdict === 'accuse') === !!dc.forged;
    c.docCheckDone = true;
    c.docCheckVerdict = verdict;
    c.docCheckCorrect = correct;
    WS.sys.Effects.apply(correct ? dc.onCorrect : dc.onWrong);
    WS.sys.Effects.apply({ flags: [correct ? 'docCheck_correct' : 'docCheck_wrong'] });
  }

  // 테이블에 올린 것으로 거래가 성립하는지 — 안 되면 이유를 함께 돌려준다
  function confirmState(c) {
    const T = WS.sys.Trade;
    if (c.kind === 'sell') {
      const ok = S().gold >= c.request.price && WS.sys.Inventory.canAdd(c.request.item, c.request.qty);
      return { ok, label: '매입', why: ok ? '' : '금화나 가게 공간이 부족하다' };
    }
    if (c.kind === 'trade') {
      const ts = T.tradeStatus(c);
      const why = ts.ok ? '' : ts.lacking.length ? `${ts.lacking.map(w => item(w.item).name).join(', ')} 재고 부족` : !ts.room ? '가게 공간이 부족하다' : '웃돈을 낼 금화가 부족하다';
      return { ok: ts.ok, label: '교환', why };
    }
    const r = c.request;
    if (!tray.length) return { ok: false, label: '판매', why: '창고에서 물건을 꺼내 테이블에 올려놓는다' };
    const d = tableDeal(c);
    const poorC = T.isPoor(c);
    const stray = d.other.length ? `${d.other.map(l => item(l.itemId).name).join(', ')} — ${poorC ? `덤은 시세 ${T.giftCap(c)}G어치까지만 받는다고 한다` : '손님이 찾는 게 아니다'}` : '';
    if (poorC && d.gifts.length && !d.qty) return { ok: false, label: '판매', why: '요구한 물건부터 올려야 덤을 얹을 수 있다' };
    if (d.extra.length) {
      const note = `요청 밖의 물건은 시세의 ${Math.round(acceptsAny(c).payRate * 100)}%만 쳐준다`;
      return { ok: true, label: d.qty ? '판매' : '물자만 넘기기', why: d.qty < r.qty ? note : '' };
    }
    if (!d.qty) return { ok: false, label: '판매', why: stray || (r.category ? '손님이 찾는 종류가 아니다' : '손님이 찾는 물건이 아니다') };
    if (r.exact) {
      const by = {};
      d.match.forEach(l => { const st = item(l.itemId).subtype; by[st] = (by[st] || 0) + l.qty; });
      if (Object.entries(r.exact).some(([k, n]) => (by[k] || 0) !== n)) return { ok: false, label: '판매', why: '칼 2개와 활 1개를 올려 달라고 한다' };
    }
    if (d.qty < r.qty && r.partialOk === false) return { ok: false, label: '판매', why: `${r.qty}개 전부가 아니면 안 산다고 한다` };
    return { ok: true, label: d.qty < r.qty ? `${d.qty}개만 판매` : '판매', why: stray || (d.gifts.length ? '덤은 값을 받지 않는다 — 손해지만 우호도가 오른다' : '') };
  }

  // 손님과의 대화 선택지 — 응대 테이블(말풍선 아래)에 둔다
  // 손님에게 할 수 있는 말(선택지) — 판매·거절과 같은 결정 줄에 버튼으로 나란히 둔다
  // 선택지 색 — 거절·부인·신고류는 붉은 ✕, 받아들임·건넴은 녹색 ✓, 나머지는 철. 이웃한 버튼이 같은 색이면 철/황동으로 번갈아 구분한다
  const NO_RX = /안 ?[맡받팔사하들주]|거절|거부|사양|돌려보|쫓|나가 주|못 ?(?:준|주|팔|받|사|하)|없[소다]|아니|안 ?(?:판|사|된|돼)|부인|잡아뗀|모른|경비|신고|감찰|알린다|알리|태워|삭제|생각해|내일 다시|어렵소|받을 수 없|팔 수 없|밤에는|장사는 장사|혼자|무시|아무도/;
  const YES_RX = /낸다|물어 준다|받는다|준다|판다|산다|돌려준다|내준다|약속|갚|믿어|문을 연다|들인다|서명|편에|보탠다|바친다|인정|털어놓|자백|보여 준다|기별|알겠|좋소|맡|열어|사실대로|본 대로|위로금|배상|상여금|보호비|잘했/;
  function choiceTone(ch, armed) {
    if (armed || ch.confirm || ch.needs) return 'no';
    if (/다음에|내일|나중|생각해|기별/.test(ch.label)) return 'plain'; // 미루는 말은 중립
    if (/안 ?[맡받팔사하들주]|못 ?(?:준|주|팔|받|사|하)|없[소다]|아니|거절|거부|사양/.test(ch.label) || (NO_RX.test(ch.label) && !YES_RX.test(ch.label))) return 'no';
    if (YES_RX.test(ch.label) && !NO_RX.test(ch.label)) return 'yes';
    return 'plain';
  }
  // 선택지 버튼에 금화 증감을 부호와 함께 보여 준다 — 내는 돈은 −, 받는 돈은 +. 라벨에 이미 부호 붙은 금액이 있으면 그대로 두고,
  // 부호 없는 금액('위로금 150G')이면 부호를 붙이고, 금액이 없으면 뒤에 (−150G)를 덧붙인다 (효과의 gold 숫자 기준)
  function goldLabel(ch) {
    const g = ch.effects && ch.effects.gold;
    const label = ch.label || '';
    if (typeof g !== 'number' || !g) return label;
    const sign = g > 0 ? '+' : '−', n = Math.abs(g);
    if (/[+−-]\s*\d[\d,]*\s*(G|골드)/.test(label)) return label;
    const re = /(\d[\d,]*)\s*(G|골드)/;
    if (re.test(label)) return label.replace(re, (m, num, unit) => `${sign}${num}${unit}`);
    return `${label} (${sign}${n}G)`;
  }
  function choiceButtons(c) {
    // needs: 'poster' — 인상서를 꺼내 대조해 본 뒤에만 (그 전엔 경비대를 부를 근거가 없다)
    const list = WS.sys.Trade.availableChoices(c).filter(ch => ch.needs !== 'poster' || c.sawPoster);
    const tones = list.map(ch => choiceTone(ch, !!ch.confirm && confirmChoice === `${c.uid}:${ch.id}`));
    // 판매 화면에서는 판매(황동)·거절(붉음)과 이웃하므로 철색으로 두고, 대화 화면에서만 이웃끼리 색을 어긋나게 한다
    if (c.kind === 'talk') tones.forEach((t, i) => { if (i && t === tones[i - 1] && t !== 'no') tones[i] = t === 'yes' ? 'plain' : 'brass'; });
    const out = list.map((ch, i) => {
      const armed = !!ch.confirm && confirmChoice === `${c.uid}:${ch.id}`;
      const t = tones[i];
      const cls = c.kind !== 'talk' ? (t === 'no' ? 'danger no' : 'ghost') : t === 'no' ? 'danger no' : t === 'yes' ? 'yes' : t === 'brass' ? 'primary' : '';
      return `<button class="pbtn ${cls}" data-act="choice" data-id="${ch.id}">${ch.needs === 'poster' ? '📜 ' : ''}${U.esc(armed ? ch.confirm : goldLabel(ch))}</button>`;
    });
    // 조건이 안 맞아 못 고르는 선택지 중 lockedHint 가 있는 것은 흐리게 보여 준다 (왜 안 되는지 한 줄)
    const t = WS.sys.Customers.tplById(c.tpl) || {};
    (t.choices || []).concat(t.extraChoices || []).filter(ch => ch.lockedHint && !WS.sys.Conditions.check(ch.when))
      .forEach(ch => out.push(`<button class="pbtn ghost locked" disabled title="${U.esc(ch.lockedHint)}">🔒 ${U.esc(c.fillCtx ? U.fill(ch.label, c.fillCtx) : ch.label)}<small>${U.esc(ch.lockedHint)}</small></button>`));
    // 궁핍한 손님: 요구한 물건을 값 없이 그냥 준다 — 테이블에 요구한 물건을 올린 뒤에만
    if (c.kind === 'buy' && c.request && c.request.item && WS.sys.Trade.isPoor(c)) {
      const d = tableDeal(c);
      const ok = d.match.some(l => !l.stash);
      out.push(`<button class="pbtn ghost" data-act="forgive" ${ok ? '' : 'disabled'} title="${U.esc(ok ? `값을 받지 않는다 — 원가 ${Math.round(d.cost)}G 손해, 우호도가 크게 오른다` : '요구한 물건을 테이블에 올려야 한다')}">그냥 가져가시오</button>`);
    }
    // 인장 대조는 버튼이 아니다 — 수상하다고 느끼면 테이블 위 돋보기를 직접 눌러야 한다
    // 물건이 없을 때: 내일 구해 둘 테니 다시 오라고 한다 (그 사이 까마귀로 주문하거나, 수상하면 제보)
    // 이야기 손님이 자기만의 「내일 다시 오시오」 선택지를 갖고 있으면 일반 버튼은 감춘다 (같은 말 버튼이 둘 뜨면 특별한 갈림길이 있다는 걸 눈치채게 된다)
    const ownLater = list.some(ch => /내일 다시/.test(ch.label)) || (t.choices || []).concat(t.extraChoices || []).some(ch => /내일 다시/.test(ch.label));
    if (c.angry && !c.calmed && c.status === 'active' && Object.values(S().inventory).some(n => n > 0)) out.push('<button class="pbtn ghost" data-act="appease">🙇 사과하고 덤을 준다</button>');
    if (!ownLater && WS.sys.Letters && WS.sys.Letters.canPromise(c).ok) out.push('<button class="pbtn ghost" data-act="promise">📦 내일 다시 오시오</button>');
    return out;
  }

  // 결정 줄 (오른쪽 맨 아래, 높이 고정): 경고 한 줄 + 버튼 두 줄 자리.
  // 대화 선택지·판매·거절·다음이 모두 여기서 이루어진다 — 버튼이 한 줄이면 아래쪽에 붙는다.
  // 손님이 말하는 동안에는 같은 자리에 '다음 →'(대사 넘기기)이 있다가, 말이 끝나면 선택지로 바뀐다.
  // 버튼이 나타난 뒤 0.3초는 눌림 무시 (말이 끝나는 순간의 오조작 방지) — 손님·대사가 바뀔 때마다 새로 잰다
  const LOCK_MS = 300;
  let lockKey = '', lockUntil = 0, lockTimer = 0;
  function barLock(c, delay) {
    const key = `${c.uid}:${c.dialog ? c.dialog.length : 0}:${c.kind}`;
    if (key !== lockKey) { lockKey = key; lockUntil = 0; }
    // 말이 남았으면 끝나는 때 + 0.3초, 말을 넘겨 버려 버튼이 일찍 나왔으면 그때 + 0.3초 (더 늦어지지는 않는다)
    const want = Date.now() + Math.max(0, delay) + LOCK_MS;
    if (!lockUntil || delay > 0 || want < lockUntil) {
      lockUntil = want;
      clearTimeout(lockTimer);
      lockTimer = setTimeout(() => document.querySelectorAll('.act-grid.lk').forEach(g => g.classList.remove('lk')), lockUntil - Date.now() + 20);
    }
    return Date.now() < lockUntil;
  }
  const barLocked = () => Date.now() < lockUntil;

  function actionBar(c, waiting) {
    const st = S();
    const bar = (btns, why = '', delay = 0, lockCust = null) => `<div class="action-bar">
      <div class="warn-line ${why ? 'on' : ''}">${U.esc(why)}</div>
      <div class="act-wrap"><div class="act-grid ${lockCust && barLock(lockCust, delay) ? 'lk' : ''}" style="--delay:${delay}ms">${btns.slice().reverse().join('')}</div>
      ${delay > 0 ? `<div class="act-grid say-grid" style="--delay:${delay}ms"><button class="pbtn primary grow say-next" aria-label="대사 넘기기">다음 →</button></div>` : ''}</div></div>`;
    // 영업 종료는 기다리는 손님이 다 끝났을 때만 — 거절하다가 실수로 문을 닫지 않게
    const nextOrClose = label => bar([waiting
      ? `<button class="pbtn primary grow" data-act="next">${label} →</button>`
      : '<button class="pbtn primary grow" data-act="close">영업 종료</button>']);
    if (!c) {
      const first = !st.queue.some(q => q.status !== 'waiting');
      const html = nextOrClose(first ? '첫 손님 맞이하기' : '다음');
      return first && st.day === 1 ? html.replace('data-act="next"', 'data-act="next" data-glow="1"').replace('class="pbtn primary grow"', 'class="pbtn primary grow tut-glow"') : html;
    }
    if (c.status === 'done') return nextOrClose('다음');
    const delay = tray.length ? 0 : Math.max(0, slipDelay(c)); // 손님 말이 끝난 뒤에 버튼이 나온다 — 테이블에 물건을 올리면 바로
    if (c.kind === 'talk') return bar(choiceButtons(c).map((b, i) => i === 0 && tutStep(c) ? b.replace('class="pbtn', 'class="pbtn tut-glow') : b), '', delay, c);
    const cs = confirmState(c);
    return bar([...choiceButtons(c),
      `<button class="pbtn primary grow main ${tutStep(c) && tutStep(c).confirm ? 'tut-glow' : ''}" data-act="confirm" ${cs.ok ? '' : 'disabled'}>${U.esc(cs.label)}</button>`,
      '<button class="pbtn danger no hold-btn" data-act="refuse" title="꾹 눌러 거절 (0.5초)">거절</button>'], cs.why, delay, c);
  }

  // ───────── 창고 물건 공통 ─────────
  const ownedOf = ids => ids.reduce((s, id) => s + WS.sys.Inventory.count(id), 0);
  // stash: 장물함 쪽 (WS.sys.Stash) — 같은 물건이라도 일반 재고와 따로 올리고 센다
  const sameLine = (t, id, stash) => t.itemId === id && !!t.stash === !!stash;
  const onTableQty = (id, stash) => { const l = tray.find(t => sameLine(t, id, stash)); return l ? l.qty : 0; };
  const srcCount = (id, stash) => (stash ? (WS.sys.Stash ? WS.sys.Stash.count(id) : 0) : WS.sys.Inventory.count(id));

  // 이 물건이 지금 손님의 요청에 맞는지 — 맞는 것만 손님이 받아 가고, 나머지는 밀어낸다
  function lineMatches(c, id) {
    const r = c && c.request;
    if (!r) return false;
    if (r.category) {
      if (item(id).newCategory !== r.category) return false;
      const off = WS.sys.Trade.offerForCategoryItem({ request: { ...r, qty: 1 } }, id);
      return !!(off && off.accepted);
    }
    return id === r.item;
  }

  // 테이블 위 한 줄(같은 물건 묶음)에 손님이 쳐 줄 값
  function linePrice(c, l) {
    const r = c.request;
    if (r.category) return (WS.sys.Trade.offerForCategoryItem({ request: { ...r, qty: l.qty } }, l.itemId) || {}).price || 0;
    return Math.round((r.offer / r.qty) * l.qty);
  }

  // 테이블 전체를 손님 요청에 맞춰 본 결과
  // 요청 밖의 물건도 헐값에 받아 가는 손님 (customers.js acceptsAny: { payRate, note }) — 예: 용이 깨어났을 때의 성벽 수비대장
  const acceptsAny = c => { const t = c && WS.sys.Customers.tplById(c.tpl); return (t && t.acceptsAny) || null; };
  const extraPrice = (c, l) => Math.max(1, Math.round(WS.sys.Market.price(l.itemId) * l.qty * acceptsAny(c).payRate));

  function tableDeal(c) {
    const match = tray.filter(l => lineMatches(c, l.itemId));
    let other = tray.filter(l => !lineMatches(c, l.itemId));
    const extra = acceptsAny(c) ? other : [];
    if (extra.length) other = [];
    // 궁핍한 손님(c.poor)에게는 요구 밖의 물건을 덤으로 얹어 줄 수 있다 — 시세 합 한도 안에서만 (Trade.giftSplit), 값은 받지 않는다
    let gifts = [];
    const T = WS.sys.Trade;
    if (!extra.length && c.status !== 'done' && T.isPoor(c)) {
      const sp = T.giftSplit(c, other.map(l => ({ item: l.itemId, qty: l.qty, stash: l.stash })));
      gifts = sp.gifts.map(l => ({ itemId: l.item, qty: l.qty }));
      other = sp.rest.map(l => ({ itemId: l.item, qty: l.qty, ...(l.stash ? { stash: true } : {}) }));
    }
    const cost = l => (l.stash ? 0 : WS.sys.Inventory.costBasis(l.itemId)) * l.qty; // 장물은 원가 0
    return {
      match, other, extra, gifts,
      qty: match.reduce((s, l) => s + l.qty, 0),
      got: match.reduce((s, l) => s + linePrice(c, l), 0) + extra.reduce((s, l) => s + extraPrice(c, l), 0),
      cost: match.concat(extra, gifts).reduce((s, l) => s + cost(l), 0),
    };
  }

  // ───────── 창고 뒷방 (제미나이 그림) ─────────
  // 가구를 눌러 연다 — 무기 거치대·갑옷걸이·물약 선반·재료 궤짝·잠긴 궤짝은 3×3 칸(9번 = 뒤로),
  // 보석함은 뚜껑을 열어 벨벳 칸에서, 서류함은 서랍을 당겨 펼친 종이를, 창가의 까마귀로는 편지를 주고받는다.
  // [장소, 이름, left%, top%, width%, height%] — assets/scene/storeroom.png(632×424) 기준
  const ROOM_SPOTS = [
    ['weapon', '무기 거치대', 0.5, 14, 25, 71],
    ['defense', '갑옷걸이', 27, 25, 14.5, 56],
    ['potion', '물약 선반', 48.3, 11.5, 22, 41],
    ['ore', '광석 궤짝', 41.5, 53, 13.5, 33],
    ['goods', '재료 자루', 55, 57, 14.5, 29],
    ['gem', '보석함', 73, 46, 13, 16],
    ['docs', '서류함', 86.5, 42.5, 13.3, 32],
    ['special', '잠긴 궤짝', 81.5, 75.5, 18.3, 22],
    ['crow', '까마귀 서신', 80, 8, 18, 30],
  ];
  const PLACE_NAME = Object.fromEntries(ROOM_SPOTS.map(s => [s[0], s[1]]));
  // 장물함 — 닉스의 장물을 받은 뒤에만 갑옷걸이 발치에 놓인다 (그림에 없는 자루라 CSS 로 그린다 · Stash.shown)
  PLACE_NAME.stash = '장물함';
  const STASH_SPOT = [26, 83, 15, 15];
  const stashOn = () => !!WS.sys.Stash && WS.sys.Stash.shown();
  const P = () => WS.sys.Progress;
  const isOpen = place => !P() || P().isUnlocked(place);
  const shelfItems = place => WS.sys.Items.onShelf(place);
  // 오늘 새로 열려서 아직 한 번도 들여다보지 않은 자리 — 반짝여서 눈길을 끈다
  let visited = {};
  let docsHint = false; // 방금 받은 인상서를 닫은 뒤, 서류함이 어디인지 한 번 빛내 준다
  const isNew = place => S().day > 1 && S().progress && S().progress.unlocked[place] === S().day && !visited[place];
  // 보석함 벨벳 칸 9개 [left%, top%, width%, height%] — assets/scene/jewelbox.png 기준
  const JEWEL_SLOTS = (() => {
    const xs = [[28.8, 13.3], [43.4, 12.9], [57.6, 13.3]];
    const ys = [[39.2, 12.2], [53.3, 12.3], [67.5, 11.7]];
    const out = [];
    ys.forEach(([t, h]) => xs.forEach(([l, w]) => out.push([l, t, w, h])));
    return out;
  })();

  function gemTrendHtml(it) {
    if (it.newCategory !== 'gem') return '';
    const t = WS.sys.Market.gemTrend(it.subtype);
    const up = t.current >= t.prev;
    const pct = t.prev ? Math.round((t.current / t.prev - 1) * 100) : 0;
    return `<span class="trend ${up ? 'up' : 'down'}">${up ? '▲' : '▼'}${Math.abs(pct)}%</span>`;
  }

  // 남에게서 맡아 둔 물건 — 팔면 주인이 찾으러 왔을 때 곤란해진다
  function heldTag(id) {
    const n = P() && P().deposited ? P().deposited(id) : 0;
    return n ? `<span class="held-tag" title="맡아 둔 것 ${n}개 — 주인이 찾으러 온다">맡음 ${n}</span>` : '';
  }

  // 튜토리얼 손님이 있을 때 "지금 눌러야 할 곳" — 자리 → 물건 칸 → 판매 버튼 순으로 하나만 빛난다
  function tutStep(c) {
    if (!c || !c.tutorial || c.status === 'done') return null;
    if (c.kind === 'talk') return { choice: true };
    const want = c.request && c.request.item;
    if (want && onTableQty(want) > 0) return { confirm: true };
    const place = [].concat(c.tutorial.place || c.tutorial.places || [])[0];
    if (nav.place !== place) return { place };
    return { item: want };
  }
  const tutNow = () => tutStep(WS.sys.Day.current()) || {};

  function cellLeaf(id, stash) {
    const it = item(id);
    const left = srcCount(id, stash) - onTableQty(id, stash);
    const sa = stash ? ' data-stash="1"' : '';
    return `<div class="cell leaf ${stash ? 'stolen' : ''} ${left > 0 ? '' : 'none'} ${!stash && tutNow().item === id ? 'tut-glow' : ''}" data-item="${id}"${sa} title="끌어서 테이블에 올리기 · 우클릭으로 내리기">
      ${gemTrendHtml(it)}<span class="qty-badge">${left}</span>${stash ? '<span class="held-tag stolen-tag">장물</span>' : heldTag(id)}
      <img class="cell-art" src="${WS.Sprites.itemIcon(id)}" alt="" draggable="false">
      <b>${U.esc(it.name)}</b><small>시세 ${WS.sys.Market.price(id)}G</small>
      ${left > 0 ? `<div class="put"><button data-act="put" data-id="${id}"${sa} data-n="1">+1</button><button data-act="put" data-id="${id}"${sa} data-n="5">+5</button></div>` : ''}
    </div>`;
  }

  // 아직 손에 넣은 적 없는 이야기 전용 물건 — 어두운 실루엣 + ???. 물건을 올릴 수 없다 (표시 전용)
  const cellUnknown = () => '<div class="cell unknown" title="아직 발견하지 못한 물건"><span class="unk-lock">🔒</span><span class="unk-sil">?</span><b>???</b><small>미발견</small></div>';
  const cellBlank = () => '<div class="cell blank"></div>';
  const cellBack = () => '<button class="cell back" data-act="nav-back"><span class="cell-ic">◀</span><b>뒤로</b></button>';

  function crumbHtml() {
    const parts = ['창고'];
    if (nav.place) parts.push(PLACE_NAME[nav.place]);
    return parts.map((p, i) => i === parts.length - 1 ? `<b>${U.esc(p)}</b>` : `<span>${U.esc(p)}</span>`).join('<i>›</i>');
  }

  // 서류함에 꽂힌 것: 지금 손님의 인장 서류, 오늘 신문의 수배·인상서 기사
  function docEntries(c) {
    const out = [];
    if (c && c.docCheck) {
      out.push({ act: 'magnify', ic: '🔍', ttl: '인장 대조 서류', sub: c.docCheckDone ? (c.docCheckCorrect ? '대조 끝 — 정확했던 듯하다' : '대조 끝 — 뭔가 찜찜하다') : '손님이 내민 인장 · 아직 대조 전' });
    }
    const L = WS.sys.Letters;
    (L && L.posters ? L.posters() : []).forEach(x => out.push({ act: 'poster', id: String(x.letterId), ic: '📜', ttl: `[인상서] ${x.title}`, sub: x.name }));
    return out;
  }

  // 튜토리얼 손님이 가리키는 자리 (그 손님이 오면 열리고, 물건을 올릴 때까지 반짝인다)
  const tutPlaces = c => (c && c.tutorial && c.status !== 'done' && !tray.length) ? [].concat(c.tutorial.place || c.tutorial.places || []) : [];

  function roomView(c) {
    const unread = WS.sys.Letters ? WS.sys.Letters.unreadCount() : 0;
    const docs = docEntries(c).length;
    return `<div class="room"><img class="room-art" src="assets/scene/storeroom.png" alt="" draggable="false">
      ${ROOM_SPOTS.map(([place, label, l, t, w, h]) => {
        if (!isOpen(place)) {
          return `<div class="spot locked" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%"><span class="spot-label">🔒 ${U.esc(label)} — 아직 들이지 않았다</span></div>`;
        }
        let badge = '';
        if (place === 'crow') badge = unread ? `<i class="spot-badge hot">✉ ${unread}</i>` : '';
        else if (place === 'docs') badge = docs ? `<i class="spot-badge hot">${docs}</i>` : '';
        else badge = `<i class="spot-badge">${ownedOf(shelfItems(place))}</i>`;
        const call = (place === 'crow' && unread) || isNew(place);
        const glow = tutNow().place === place || (place === 'docs' && docsHint && nav.place !== 'docs');
        return `<button class="spot ${call ? 'call' : ''} ${glow ? 'tut-glow' : ''}" data-act="open-place" data-id="${place}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%">
          <span class="spot-label">${U.esc(label)}</span>${badge}</button>`;
      }).join('')}
      ${stashOn() ? (([l, t, w, h]) => `<button class="spot stash-sack" data-act="open-place" data-id="stash" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%">
          <span class="stash-label">장물함</span><i class="spot-badge ${WS.sys.Stash.total() ? 'hot' : ''}">${WS.sys.Stash.total()}</i></button>`)(STASH_SPOT) : ''}
    </div>`;
  }

  // 거치대·선반·궤짝 — 같은 3×3 칸이지만 장소마다 생김새가 다르다 (theme-*).
  // 칼·활·전투도끼처럼 종류 하나가 칸 하나. 9번 칸은 뒤로가기.
  const THEME = { ore: 'material', goods: 'material' };
  function containerGrid(place) {
    // 넓은 화면은 5열×3행 = 15칸(물건 14 + 뒤로), 좁은(폰 세로) 화면은 3×3 = 9칸 (CSS 가 .w15 / .n9 로 가른다)
    const ids = shelfItems(place);
    const leaf = i => (ids[i] ? (WS.sys.Inventory.discovered(ids[i]) ? cellLeaf(ids[i], false) : cellUnknown()) : cellBlank());
    const cells = [];
    for (let i = 0; i < 8; i++) cells.push(leaf(i));
    cells.push(cellBack().replace('class="cell back"', 'class="cell back n9"'));
    for (let i = 8; i < 14; i++) cells.push(leaf(i).replace(/class="cell /, 'class="cell w15 '));
    cells.push(cellBack().replace('class="cell back"', 'class="cell back w15"'));
    return `<div class="grid9 g15 theme-${THEME[place] || place}">${cells.join('')}</div>`;
  }

  // 보석함 — 뚜껑을 연 벨벳 칸에 보석이 하나씩 놓여 있다. 끌어서 테이블로.
  function jewelView() {
    const ids = shelfItems('gem');
    const slots = JEWEL_SLOTS.map(([l, t, w, h], i) => {
      const id = ids[i];
      if (!id) return '';
      const it = item(id);
      const left = WS.sys.Inventory.count(id) - onTableQty(id);
      return `<div class="cell leaf gem-slot ${left > 0 ? '' : 'none'}" data-item="${id}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%"
        title="${U.esc(it.name)} · 시세 ${WS.sys.Market.price(id)}G — 끌어서 테이블에 올리기">
        ${gemTrendHtml(it)}<span class="qty-badge">${left}</span>${heldTag(id)}
        <img class="cell-art" src="${WS.Sprites.itemIcon(id)}" alt="" draggable="false"><small>${U.esc(it.name)}</small>
      </div>`;
    }).join('');
    // 보석이 잘 보이게 상자 쪽으로 다가가서 본다 (그림과 칸을 함께 확대)
    return `<div class="room"><div class="zoomer jewel"><img class="room-art" src="assets/scene/jewelbox.png" alt="" draggable="false">
      <button class="shut-spot" data-act="nav-home" style="left:23%;top:4%;width:54%;height:31%" aria-label="뚜껑 닫기"><span class="spot-label">뚜껑을 덮기</span></button>${slots}</div></div>`;
  }

  // 서류함 — 서랍을 당기면 앞쪽 빈 바닥에 서류가 펼쳐져 있다
  // 인상서 얼굴 — 손님 스프라이트 첫 칸에서 머리·어깨만 잘라 쓴다 (카운터에 선 손님과 대조할 수 있게)
  const mugCache = {};
  function mugshot(look) {
    if (!look) return '';
    if (mugCache[look]) return mugCache[look];
    const spr = WS.Sprites.sheet(look);
    if (!spr || !spr.img.complete || !spr.img.naturalWidth) return '';
    const h = Math.round(spr.fh * 0.72);
    const cv = document.createElement('canvas');
    cv.width = spr.fw; cv.height = h;
    cv.getContext('2d').drawImage(spr.img, 0, 0, spr.fw, h, 0, 0, spr.fw, h);
    return (mugCache[look] = cv.toDataURL());
  }

  // 인상서 한 장을 크게 펼친다 — 손님 얼굴·말과 대조하는 용도
  function posterView(id) {
    const x = WS.sys.Letters.posters().find(p => String(p.letterId) === id);
    if (!x) return '';
    // 예전 저장본의 인상서엔 그림 정보가 없다 — 데이터에서 같은 인상서를 찾아 채운다
    if (!x.look) x.look = ((((WS.data.letters || {}).wanted || []).find(w => w.poster && w.poster.title === x.title) || {}).poster || {}).look;
    return `<div class="poster-wrap"><div class="poster">
      <div class="poster-top">왕국 경비대 · 인상서</div>
      <h3 class="poster-h">수 배</h3>
      <div class="poster-title">${U.esc(x.title)}</div>
      <div class="poster-id">
        ${mugshot(x.look) ? `<div class="poster-mug"><img src="${mugshot(x.look)}" alt="인상서 그림"><small>경비대 화공 그림</small></div>` : ''}
        <div><div class="poster-name">${U.esc(x.name)}</div>
        <h5>인상착의</h5><ul>${x.marks.map(m => `<li>${U.esc(m)}</li>`).join('')}</ul></div>
      </div>
      ${x.wants ? `<h5>수법</h5><p>${U.esc(x.wants)}</p>` : ''}
      ${x.reward ? `<div class="poster-reward">신고 포상금 <b>${x.reward}G</b></div>` : ''}
      ${x.note ? `<p class="poster-note">${U.esc(x.note)}</p>` : ''}
      <small class="poster-day">${x.day}일째 ${x.via === 'hand' ? '경비대 전령에게 받음' : '까마귀 편으로 받음'}</small>
    </div><button class="back-tab" data-act="nav-back">서랍에 도로 넣기</button></div>`;
  }

  function docsView(c) {
    if (nav.sub && nav.sub.startsWith('poster:')) return posterView(nav.sub.slice(7));
    const docs = docEntries(c);
    const papers = docs.length
      ? docs.map((d, i) => `<button class="paper" data-act="${d.act}" ${d.id ? `data-id="${d.id}"` : ''} style="--r:${[-3, 2, -1, 3][i % 4]}deg">
          <b>${d.ic} ${U.esc(d.ttl)}</b><small>${U.esc(d.sub)}</small></button>`).join('')
      : '<p class="paper-empty">서랍에 볼 만한 서류가 없다.</p>';
    return `<div class="room"><img class="room-art" src="assets/scene/drawer.png" alt="" draggable="false">
      <div class="paper-area">${papers}</div>
      <button class="shut-spot drawer-front" data-act="nav-home" style="left:15.8%;top:72.8%;width:68.9%;height:18%" aria-label="서랍 닫기" title="밀어서 닫기"><span class="spot-label">밀어서 닫기</span></button></div>`;
  }

  // 들어오면 알려 달라던 손님들 — 물건이 준비되면 ✓, 아니면 기한
  function wishList() {
    const W = WS.sys.Letters.wishes ? WS.sys.Letters.wishes() : [];
    if (!W.length) return '';
    return `<div class="wish-box"><b>⏳ 알림을 기다리는 손님</b>${W.map(w => `<div class="wish ${w.ready ? 'ready' : ''}">
      <span>${w.icon || '•'} ${U.esc(w.who)}</span><small>${U.esc(w.itemName)} ×${w.qty} · ${w.price}G${w.status === 'called' ? ' · 내일 옴' : w.ready ? ' · ✓ 준비됨' : w.expireDay ? ` · ${w.expireDay}일까지` : ''}</small></div>`).join('')}</div>`;
  }

  // 창가의 까마귀 — 받은 편지 읽기 / 편지 쓰기
  function lettersView() {
    const L = WS.sys.Letters;
    const inbox = L.inbox();
    const sel = inbox.find(x => String(x.id) === mail.sel);
    const list = inbox.length
      ? inbox.map(x => `<button class="mail-item ${x.read ? '' : 'unread'} ${sel === x && !mail.compose ? 'on' : ''}" data-act="mail-open" data-id="${U.esc(String(x.id))}">
          <span class="mi-ic">${x.fromIcon}</span><b>${U.esc(x.subject)}</b><small>${x.day}일째 · ${U.esc(x.from)}${x.outcome ? ` · ${U.esc(x.outcome)}` : ''}</small></button>`).join('')
      : '<p class="muted small">아직 온 편지가 없다.</p>';
    // 좁은 화면에서는 목록 ↔ 편지를 한 장씩 (data-pane) — 편지 위의 "← 목록"으로 돌아간다
    const pane = (mail.compose || sel) ? 'read' : 'list';
    const anim = mailAnim; mailAnim = '';
    const guideNow = !sel && !mail.compose && !crowGuideSeen();
    return `<div class="mail" data-pane="${pane}">
      <div class="mail-bar">
        <h3>🐦 까마귀 서신 <small>${inbox.length ? `받은 편지 ${inbox.length}통` : '창가의 까마귀'}</small></h3>
        ${mail.flash ? `<div class="mail-flash">${U.esc(mail.flash)}</div>` : ''}
      </div>
      <div class="mail-list ${anim === 'list' ? 'slide-in' : ''}"><button class="pbtn primary mail-write" data-act="mail-compose">✒ 편지 쓰기</button>${wishList()}${guideNow ? `<div class="crow-guide-inline">${crowGuide()}</div>` : ''}${list}</div>
      <div class="mail-pane ${anim === 'open' ? 'slide-in' : ''}">
        <div class="mail-nav">
          <button class="back-tab sm ghost mail-back-list" data-act="mail-list">목록으로</button>
          ${sel && !mail.compose ? mailStep(inbox, sel) : ''}
        </div>
        ${mail.compose ? composePane() : guideNow ? crowGuide() : readPane(sel, anim === 'open')}</div>
    </div>`;
  }

  // 까마귀를 처음 들였을 때 — 편지로 무엇을 할 수 있는지 한 장으로 알려 준다 (보내는 편지 종류는 Letters 데이터에서 그대로)
  const crowGuideSeen = () => !!(S().progress && S().progress.tutorialsSeen && S().progress.tutorialsSeen.crow_guide);
  function crowGuide() {
    const tpls = WS.sys.Letters.templates();
    return `<div class="letter crow-guide">
      <h4>🐦 까마귀로 할 수 있는 일</h4>
      <p class="cg-lead">편지를 보내면 <b>다음 날 아침</b>에 결과가 온다.</p>
      <ul>${tpls.map(t => `<li><span class="mi-ic">${t.toIcon}</span><b>${U.esc(t.title)}</b><small>${U.esc(t.desc)}</small></li>`).join('')}</ul>
      <p class="cg-tip">💡 귀한 물건을 찾는 손님에게 <b>“들어오면 알리겠소”</b>라고 해 두면, 물건이 들어왔을 때 여기서 알려 웃돈에 팔 수 있다.<br>
      💡 수상한 손님이 수상한 부탁을 하면, 여기서 <b>경비대에 밀고</b>할 수 있다.<br>
      💡 제안·소식 편지가 오면 창가의 까마귀가 반짝인다. 아침엔 <b>서신</b> 쪽에서도 읽을 수 있다.</p>
      <div class="btn-row"><button class="pbtn ghost" data-act="crow-guide-ok">알겠소</button>
        <button class="pbtn primary grow" data-act="crow-guide-write">✒ 첫 편지 써 보기</button></div>
    </div>`;
  }

  // 이전 · 다음 편지 (목록에 보이는 차례 그대로)
  function mailStep(inbox, sel) {
    const i = inbox.indexOf(sel), n = inbox.length;
    if (i < 0 || n < 2) return '';
    const btn = (d, cls, label) => { const t = inbox[i + d]; return `<button class="mini mail-step ${cls}" data-act="mail-open" data-id="${t ? U.esc(String(t.id)) : ''}" ${t ? '' : 'disabled'} aria-label="${label}"></button>`; };
    return `<div class="mail-step-wrap">${btn(-1, 'prev', '앞 편지')}<span class="mn-pos">${i + 1} / ${n}</span>${btn(1, 'next', '다음 편지')}</div>`;
  }

  function readPane(x, unfold) {
    if (!x) return '<div class="letter empty">🐦 까마귀가 창틀에서 고개를 갸웃한다.<small>왼쪽에서 편지를 고르거나, 새 편지를 쓴다.</small></div>';
    const acts = x.actions && x.actions.length && !x.resolved
      ? `<div class="btn-row wrap">${x.actions.map(a => `<button class="pbtn ${/^decline/.test(a.id) ? 'ghost' : 'primary'}" data-act="mail-act" data-id="${U.esc(String(x.id))}" data-n="${U.esc(a.id)}" ${a.disabled ? 'disabled' : ''} title="${U.esc(a.why || '')}">${U.esc(a.label)}</button>`).join('')}</div>`
      : (x.outcome ? `<p class="letter-outcome">— ${U.esc(x.outcome)}</p>` : '');
    return `<div class="letter ${unfold ? 'unfold' : ''}">
      <div class="letter-from">${(x.fromKey && WS.ui.emblemOfSender(x.fromKey)) || x.fromIcon} ${U.esc(x.from)} <small>${x.day}일째</small></div>
      <h4>${U.esc(x.subject)}</h4>
      <p>${U.esc(x.body).replace(/\n/g, '<br>')}</p>
      ${acts}
    </div>`;
  }

  function composePane() {
    const L = WS.sys.Letters;
    const tpls = L.templates();
    const t = tpls.find(x => x.type === mail.compose);
    if (!t) {
      return `<div class="letter compose"><h4>누구에게 까마귀를 보낼까</h4>
        ${tpls.map(x => `<button class="tpl" data-act="mail-tpl" data-id="${x.type}" ${x.disabled ? 'disabled' : ''}>
          <span class="mi-ic">${x.toIcon}</span><b>${U.esc(x.title)}</b><small>${U.esc(x.to)} — ${U.esc(x.disabled ? x.why : x.desc)}</small></button>`).join('')}
      </div>`;
    }
    const q = L.quote(t.type, mail.params);
    const params = t.params.map(p => `<div class="param"><small>${U.esc(p.label)}</small><div class="opts">
      ${p.options.length ? p.options.map(o => `<button class="opt ${String(mail.params[p.key]) === String(o.value) ? 'on' : ''}" data-act="mail-param" data-id="${p.key}" data-n="${U.esc(String(o.value))}">
        ${U.esc(o.label)}${o.sub ? `<small>${U.esc(o.sub)}</small>` : ''}</button>`).join('') : '<span class="muted small">고를 것이 없다</span>'}
    </div></div>`).join('');
    return `<div class="letter compose">
      <div class="letter-from">${t.toIcon} ${U.esc(t.to)} 앞</div><h4>${U.esc(t.title)}</h4>
      ${params}
      <p class="quote">${U.esc(q.msg)}</p>
      <div class="btn-row"><button class="pbtn ghost" data-act="mail-compose">다른 편지</button>
        <button class="pbtn primary grow" data-act="mail-send" ${q.ok ? '' : 'disabled'}><i class="ei ei-crow"></i> 까마귀 날리기</button></div>
    </div>`;
  }

  // 장물함 — 일반 재고와 따로 세고, 따로 테이블에 올린다. 머리줄(개수) · 칸 · 적발 위험표(config.smuggling.detect.byCount)
  function stashGrid() {
    const X = WS.sys.Stash;
    const D = WS.data.config.smuggling.detect;
    const cells = X.kinds().slice(0, 7).map(id => cellLeaf(id, true));
    cells.push(cellBack());
    const pct = v => `${Math.round(v * 100)}%`;
    const risk = D.byCount.slice(1).map((v, i, a) => `<li><span>${i + 1 < a.length ? i + 1 : (i + 1) + '+'}개</span><b class="${v >= 0.5 ? 'neg' : ''}">${pct(v)}</b></li>`).join('');
    return `<div class="stash-panel">
      <div class="stash-head"><b>장물함</b><span>남은 장물 <em>${X.total()}</em>개 · 장부에 없는 물건</span></div>
      <div class="stash-risk"><span class="sr-t">한 번에 넘긴 장물 수별 적발 위험</span><ul>${risk}</ul>
        <span class="sr-n">왕정 쪽 손님 <b class="neg">100%</b> · 고블린 <b class="pos">0%</b></span></div>
      <div class="grid9 theme-stash">${cells.join('')}</div>
    </div>`;
  }

  function storageView(c) {
    const p = nav.place;
    if (!p) return roomView(c);
    if (p === 'stash') return stashOn() ? stashGrid() : roomView(c);
    if (p === 'gem') return jewelView();
    if (p === 'docs') return docsView(c);
    if (p === 'crow') return lettersView();
    return containerGrid(p);
  }

  // ───────── 영업 화면 조립 ─────────
  // ───────── 거래 요약 카드 (손님 머리 위, 말풍선이 사라진 자리) ─────────
  // 대사는 절대 옮겨 적지 않는다 — 거래 내용만: [무엇을 해 달라] 물건 ×수량 값 (그 줄의 마진) … 오른쪽에 마진 합계.
  // 대화 손님은 customers.js 의 ask 필드로 요약한다.
  const unitCost = id => WS.sys.Inventory.costBasis(id) || WS.sys.Market.cost(id) || 0;
  const signG = n => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(Math.round(n))}`;

  function dealLines(c) {
    const T = WS.sys.Trade;
    const L = [];
    const line = (o) => L.push(o);
    if (c.kind === 'talk') {
      const a = c.ask || (WS.data.customers.find(t => t.id === c.tpl) || {}).ask;
      if (!a) return { lines: [{ tag: '대화' }], total: null };
      let items = a.items || {};
      let gone = false;
      if (a.deposit && WS.sys.Progress) {
        const d = (WS.sys.Progress.depositOf || (() => null))(a.deposit);
        if (d) { items = d.items || {}; gone = d.status !== 'held'; }
      }
      const ids = Object.keys(items);
      if (!ids.length) line({ tag: a.tag, note: a.note });
      ids.forEach((id, i) => {
        const miss = !a.give && (gone || WS.sys.Inventory.count(id) < items[id]);
        line({ tag: i ? '' : a.tag, id, qty: items[id], miss, note: i === ids.length - 1 ? a.note : '' });
      });
      return { lines: L, total: a.gold ? a.gold : null, totalLabel: a.gold ? (a.gold > 0 ? '받는 돈' : '내는 돈') : '' };
    }
    if (c.kind === 'trade') {
      const t = c.trade;
      t.want.forEach((w, i) => line({ tag: i ? '' : '줄 것', id: w.item, qty: w.qty, miss: WS.sys.Inventory.count(w.item) < w.qty, sub: `원가 ${Math.round(unitCost(w.item) * w.qty)}G` }));
      t.give.forEach((g, i) => line({ tag: i ? '' : '받을 것', id: g.item, qty: g.qty, sub: `시세 ${WS.sys.Market.price(g.item) * g.qty}G` }));
      if (t.gold) line({ tag: t.gold > 0 ? '웃돈' : '내가 냄', gold: t.gold });
      const giveV = t.want.reduce((s, w) => s + unitCost(w.item) * w.qty, 0);
      const getV = T.sideValue(t.give) + t.gold;
      return { lines: L, total: getV - giveV };
    }
    const r = c.request;
    if (c.kind === 'sell') {
      const m = WS.sys.Market.price(r.item) * r.qty - r.price;
      line({ tag: '사 달라', id: r.item, qty: r.qty, price: r.price, margin: m });
      return { lines: L, total: m };
    }
    // 사러 온 손님
    const d = tableDeal(c);
    if (r.category) {
      if (d.match.length) {
        d.match.forEach((l, i) => { const p = linePrice(c, l); line({ tag: i ? '' : '팔아 달라', id: l.itemId, qty: l.qty, price: p, margin: p - (l.stash ? 0 : unitCost(l.itemId)) * l.qty, sub: l.stash ? '장물' : '' }); });
        return { lines: L, total: d.got - d.cost };
      }
      const cat = WS.data.categories[r.category];
      line({ tag: '팔아 달라', text: `${cat.name} ×${r.qty}`, note: r.preferSubtype ? `${cat.subtypes[r.preferSubtype]}이면 웃돈` : '' });
      return { lines: L, total: null };
    }
    const m = r.offer - unitCost(r.item) * r.qty;
    const poorNow = T.isPoor(c);
    line({ tag: '팔아 달라', id: r.item, qty: r.qty, price: r.offer, margin: m, sub: poorNow ? `가진 돈 모자람 · 시세 ${c.poor.full}G` : '', miss: WS.sys.Inventory.count(r.item) + (WS.sys.Stash ? WS.sys.Stash.count(r.item) : 0) < r.qty });
    // 테이블에 장물을 섞어 올렸으면 몇 개인지 한 줄 (원가 0 — 마진 합계에 이미 들어 있다)
    const stolen = d.match.filter(l => l.stash).reduce((n, l) => n + l.qty, 0);
    if (stolen) line({ tag: '장물', id: r.item, qty: stolen, note: `장부에 없는 물건 · 적발 위험 ${Math.round(WS.sys.Stash.detectChance(c, stolen) * 100)}%` });
    if (poorNow) {
      d.gifts.forEach((l, i) => line({ tag: i ? '' : '덤', id: l.itemId, qty: l.qty, price: 0, margin: -unitCost(l.itemId) * l.qty }));
      if (!d.gifts.length) line({ tag: '덤', text: '뭐든 얹어 줄 수 있다', note: `시세 ${T.giftCap(c)}G어치까지 · 우호도 ↑` });
    }
    const any = acceptsAny(c);
    if (any) {
      d.extra.forEach((l, i) => { const p = extraPrice(c, l); line({ tag: i ? '' : '덤', id: l.itemId, qty: l.qty, price: p, margin: p - unitCost(l.itemId) * l.qty }); });
      if (!d.extra.length) line({ tag: '덤', text: '무기·방어구·물약 뭐든', note: `시세의 ${Math.round(any.payRate * 100)}%` });
    }
    return { lines: L, total: tray.length ? d.got - d.cost : m };
  }

  function reqCard(c) {
    if (!c || c.status === 'done') return '';
    const { lines, total, totalLabel } = dealLines(c);
    const rows = lines.map(l => `<div class="rc-row">
      ${l.tag ? `<span class="rc-tag ${/팔아|줄 것|돌려|대신/.test(l.tag) ? 'out' : ''}">${U.esc(l.tag)}</span>` : '<span class="rc-tag gap"></span>'}
      ${l.id ? `<img class="rc-ico" src="${WS.Sprites.itemIcon(l.id)}" alt=""><b class="${l.miss ? 'miss' : ''}">${U.esc(item(l.id).name)} ×${l.qty}</b>` : ''}
      ${l.text ? `<b>${U.esc(l.text)}</b>` : ''}
      ${l.gold ? `<b class="rc-price">${signG(l.gold)}G</b>` : ''}
      ${l.price !== undefined ? `<span class="rc-price">${l.price}G</span>` : ''}
      ${l.margin !== undefined ? `<small class="rc-lm ${l.margin < 0 ? 'neg' : 'pos'}">${signG(l.margin)}</small>` : ''}
      ${l.miss ? '<small class="rc-miss">없음</small>' : ''}
      ${l.sub ? `<small class="rc-sub">${U.esc(l.sub)}</small>` : ''}
      ${l.note ? `<small class="rc-note">${U.esc(l.note)}</small>` : ''}
    </div>`).join('');
    const tot = total === null || total === undefined ? ''
      : `<div class="rc-total ${total < 0 ? 'neg' : 'pos'}"><small>${totalLabel || '마진'}</small>${signG(total)}G</div>`;
    const hint = c.tutorial && c.tutorial.hint ? `<div class="tut-hint">💡 ${U.esc(c.tutorial.hint)}</div>` : c.hint ? `<div class="tut-hint">💡 ${U.esc(c.hint)}</div>` : '';
    const st = sayState(c); // 말풍선이 떠 있는 동안은 숨었다가, 끝나면 나타난다 (다시 듣기 때도)
    const shownF = WS.ui.shownFaction(c);
    return `<div class="req-card" style="--delay:${st ? Math.round(st.left) : -9999}ms;--fc:${WS.ui.factionColor(shownF)}">
      ${c.angry ? '<div class="rc-angry">화가 났다</div>' : ''}
      <div class="rc-body"><div class="rc-head"><b>${WS.ui.emblem(shownF)}${U.esc(c.name)}</b><span>${U.esc(c.race)} · ${U.esc(c.job)}</span></div>${rows}</div>
      ${tot}${hint}</div>`;
  }

  // 새 자리가 열린 날 — 전 주인이 남긴 쪽지 (해금마다 한 장씩, 읽고 나면 다시 안 뜬다)
  function tutorialNote() {
    const t = P() && P().pendingTutorials()[0];
    if (!t) return '';
    return `<div class="tut-bg"></div>
    <div class="tut-note" role="dialog" aria-label="${U.esc(t.title)}">
      <h3>${U.esc(t.title)}</h3>
      <ol>${t.steps.map(x => `<li>${U.esc(x)}</li>`).join('')}</ol>
      <button class="pbtn primary" data-act="tut-ok" data-id="${U.esc(t.id)}">쪽지를 접어 둔다</button>
    </div>`;
  }

  function shop() {
    const c = WS.sys.Day.current();
    const waiting = WS.sys.Day.waiting().length;
    // 장면(왼쪽)에는 말풍선만 잠깐 뜬다 — 손님 얼굴과 테이블은 가리지 않는다.
    const left = `<div class="desk counter">
      <div class="desk-head"><span class="dh-t">응대 테이블</span> <small>손님과 마주하는 곳</small>${drawerTabsRow()}</div>
      ${c ? sceneBubbles(c) + reqCard(c) + affilButton(c) : ''}
      <div class="counter-actions">${actionBar(c, waiting)}</div>
    </div>`;
    const right = `<div class="desk storage">
      <div class="desk-head crumb">${nav.place ? '<button class="back-tab sm" data-act="nav-back" aria-label="돌아가기">돌아가기</button>' : '<i class="ei ei-stock"></i>'} <div class="crumb-path">${crumbHtml()}</div></div>
      <div class="shelf-body">${storageView(c)}</div>
      ${actionBar(c, waiting)}
    </div>`;
    return `${hud()}
      <div class="queue-tag">대기 ${waiting}명</div>
      <button class="desk-toggle" data-act="toggle-desk" data-view="${mobileView}">${mobileView === 'counter' ? '창고 보기' : '응대 보기'}${waiting ? `<b class="dt-n">${waiting}</b>` : ''}</button>
      <div class="two-desk" data-view="${mobileView}">${left}${right}</div>
      ${drawerHtml()}
      ${magnifyOpen && c ? magnifyOverlay(c) : ''}
      ${sealOpen && c && c.status !== 'done' ? sealOverlay(c) : ''}
`;
  }

  // 장부/신문/소문 — 예전엔 우측 플로팅 아이콘, 이제는 응대 테이블 하단에 작은 버튼 줄로
  // desk-head 안에 작은 아이콘 줄로 — 캐릭터 위에 겹쳐 쌓이지 않도록 제목 줄에 붙여둔다
  function drawerTabsRow() {
    const tabs = [['ledger', 'ledger', '장부'], ...(paperComes() ? [['news', 'news', '신문']] : []), ['world', 'map', '소문']];
    return `<div class="side-icons">${tabs.map(([k, i, l]) => `<button class="side-btn" data-act="drawer" data-id="${k}" aria-label="${U.esc(l)}">${uiIco(i)}</button>`).join('')}</div>`;
  }

  // ───────── 서랍 (장부/신문/소문) ─────────
  function drawerHtml() {
    if (!drawer) return '';
    const tabs = [['ledger', '📒 장부'], ...(paperComes() ? [['news', '📰 신문']] : []), ['world', '🗺️ 소문']];
    const paper = drawer === 'ledger';
    const st = drawerShown ? 'steady' : '';
    drawerShown = true;
    return `<div class="drawer-bg ${st}" data-act="drawer-close"></div>
    <div class="drawer ${st}" data-kind="${drawer}">
      <div class="drawer-tabs">${tabs.map(([k, l]) => `<button class="tab ${drawer === k ? 'on' : ''}" data-act="drawer" data-id="${k}">${l}</button>`).join('')}</div>
      <button class="x-close" data-act="drawer-close" aria-label="닫기"></button>
      <div class="drawer-body ${paper ? 'ledger-paper' : ''}">${drawerBody()}</div>
    </div>`;
  }

  function drawerBody() {
    const st = S();
    if (drawer === 'ledger') {
      if (!st.ledger.length) return '<p class="muted">아직 기록이 없다.</p>';
      const label = { sell: '판매', refuse: '거절', left: '결렬', buy: '매입', trade: '교환', promised: '약속' };
      return `<div class="ledger-head"><b>무기점 거래 장부</b><small>DAY ${st.day} · ${st.ledger.length}건</small><i class="ledger-stamp" aria-hidden="true">검인</i></div><ul class="ledger">${[...st.ledger].reverse().map(e => {
        const it = e.item ? item(e.item) : null;
        const what = e.action === 'trade' ? ` · ${tradeText(e)}` : it ? ` · ${U.esc(it.name)}×${e.qty}` : '';
        return `<li class="${e.action}"><span class="when">D${e.day} ${U.fmtTime(e.time)}</span><span class="who">${U.esc(e.name)} ${fac(e.faction).icon}</span><span class="what">${label[e.action] || '대화'}${what}${e.price ? ` · ${e.price > 0 ? '+' : ''}${e.price}G` : ''}</span></li>`;
      }).join('')}</ul>`;
    }
    if (drawer === 'news') {
      return Object.keys(st.newsArchive).map(Number).filter(d => WS.sys.Shop.paperRead(d)).sort((a, b) => b - a).map(d => `<div class="arch"><h4>DAY ${d}</h4>${newsList(st.newsArchive[d])}</div>`).join('');
    }
    const relWord = v => WS.data.relationWords.find(([t]) => v < t)[1];
    const known = id => ['kingdom', 'goblin', 'dwarf', 'village'].includes(id) || (st.met && st.met[id] !== undefined && st.met[id] < st.day + (st.phase === 'shop' ? 1 : 0));
    const rels = Object.entries(WS.data.factions).filter(([id]) => known(id)).map(([, f]) => {
      const v = WS.sys.World.get(f.visit.var);
      return `<li><span>${f.icon} ${U.esc(f.fullName)}</span><b>${relWord(v)}</b><div class="bar"><i style="width:${((v + 30) / 60) * 100}%;background:${f.color}"></i></div></li>`;
    }).join('');
    const rumors = WS.data.rumors.filter(r => WS.sys.Conditions.check(r.when)).map(r => `<li><span>${U.esc(r.label)}</span><b>${r.steps.find(([t]) => WS.sys.World.get(r.var) < t)[1]}</b></li>`).join('');
    return `<h4>관계</h4><ul class="rels">${rels}</ul><h4>손님들 사이의 소문</h4><ul class="rels">${rumors}</ul>`;
  }

  // ───────── 마감 ─────────
  // 금고 사정 — 내일 밤 임대료를 낼 수 있는지 마감 때마다 알려 준다
  function safeBox() {
    const st = S();
    const rent = WS.sys.Day.rent();
    const days = rent > 0 ? Math.floor(st.gold / rent) : 99;
    const level = st.gold < rent ? 'danger' : days < 3 ? 'warn' : 'ok';
    const msg = level === 'danger'
      ? `⚠ 내일 밤 임대료 ${rent}G를 낼 돈이 없다. 내일 적어도 <b>${rent - st.gold}G</b>는 벌어야 가게가 산다.`
      : level === 'warn'
        ? `⚠ 금고가 얇다. 이대로면 임대료 <b>${days}일치</b>밖에 안 남았다. 도매상에서 너무 많이 사지 말 것.`
        : `금고에 임대료 ${days}일치가 있다.`;
    const rescue = st.today && st.today.rescue
      ? `<div class="rescue-note">🪙 <b>상인회가 모자란 임대료를 대신 냈다.</b><br>“회원은 한 번 봐주는 게 규칙이오. 이자는 없소. 대신 ${st.guildLoan.due}일째까지 ${st.guildLoan.amount}G를 돌려주시오.”</div>` : '';
    return `<div class="safe-box ${level}">
      ${rescue}
      <div class="sb-row"><span>지금 금고</span><b>${st.gold}G</b></div>
      <div class="sb-row"><span>내일 밤 임대료</span><b>${rent}G</b></div>
      ${guildLoanRow()}
      <p>${msg}</p></div>`;
  }

  function guildRepayBox() {
    const st = S(), loan = st.guildLoan;
    if (!loan || loan.left <= 0) return '';
    const leftDays = loan.due - st.day;
    const all = Math.max(0, Math.min(loan.left, st.gold));
    return `<div class="repay-box ${leftDays <= 3 ? 'late' : ''}">
      <span>🪙 상인회 빚 <b>${loan.left}G</b> — ${loan.due}일째 밤까지 (${leftDays > 0 ? `${leftDays}일 남음` : '오늘 밤까지'}). 못 갚으면 가게를 잃는다.</span>
      <div class="btn-row"><button class="mini" data-act="repay-guild" data-n="20" ${st.gold >= 1 ? '' : 'disabled'}>20G 갚기</button>
        <button class="mini" data-act="repay-guild" data-n="${all}" ${all > 0 ? '' : 'disabled'}>${all <= 0 ? '갚을 돈이 없다' : all >= loan.left ? '전부 갚기' : `있는 대로 ${all}G 갚기`}</button></div>
    </div>`;
  }

  // 상인회 구제 대출 — 남은 빚과 기한
  function guildLoanRow() {
    const loan = S().guildLoan;
    if (!loan || loan.left <= 0) return '';
    const leftDays = loan.due - S().day;
    return `<div class="sb-row loan ${leftDays <= 3 ? 'late' : ''}"><span>상인회 빚 (${loan.due}일째까지 · ${leftDays > 0 ? `${leftDays}일 남음` : '오늘 밤까지'})</span><b>${loan.left}G</b></div>`;
  }

  function closing() {
    const st = S();
    const t = st.today;
    const label = { sold: '판매', refused: '거절', left: '결렬', bought: '매입', traded: '교환', talked: '대화', missed: '돌려보냄' };
    const rows = st.queue.map(c => `<li>${fac(c.faction).icon} ${U.esc(c.name)} <span class="muted">(${U.esc(c.job)})</span> — ${label[c.result] || '—'}</li>`).join('');
    const net = st.gold - t.startGold;
    const last = WS.sys.Day.lastNight();
    const endLine = WS.sys.Day.endNowLine(); // 파산 · 압류 · 밀수왕 (config.endNow)
    return `${hud()}
    <div class="sheet closing-sheet">
      <h2>영업 종료 <small>DAY ${st.day}</small></h2>
      <div class="closing-grid">
        <div><span>판매 수입</span><b class="pos">+${t.income}</b></div>
        <div><span>도매 처분</span><b class="pos">+${t.wholesale}</b></div>
        <div><span>매입 지출</span><b class="neg">−${t.spend}</b></div>
        <div><span>임대료</span><b class="neg">−${t.rent}</b></div>
        ${t.guard ? `<div><span>경비 일당</span><b class="neg">−${t.guard}</b></div>` : ''}
        ${t.paper ? `<div><span>신문 구독료</span><b class="neg">−${t.paper}</b></div>` : ''}
        <div class="total"><span>오늘 손익</span><b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${net}G</b></div>
        <div class="gold-row"><span>금고</span><b>${st.gold}G</b></div>
      </div>
      ${last ? '' : safeBox()}
      <h3>오늘의 손님<i class="ink-stamp ${net >= 0 ? 'ok' : 'bad'}" aria-hidden="true">${net >= 0 ? '흑자' : '적자'}</i></h3>
      <ul class="plain small">${rows}</ul>
      ${st.paperLapsed === st.day ? `<div class="warn-strip">⚠ 구독료 ${WS.data.shop.paper.fee}G를 치를 금고가 비어 신문이 끊겼다 — 까마귀 서신으로 다시 구독할 수 있다</div>` : ''}
      ${paperNote ? `<p class="closing-note">${U.esc(paperNote)}</p>` : ''}
      <p class="night-line">${U.esc(endLine ? endLine.text : '가게 불을 끈다. 오늘 팔려 나간 물건들은 지금쯤 어디에 있을까.')}</p>
    </div>
    <div class="bottom-bar"><button class="pbtn primary wide" data-act="next-day">${last ? '결말 보기 →' : '다음 날 →'}</button></div>
    ${crowTutorialOn() ? crowTutorial() : ''}`;
  }

  // ───────── 첫날 밤 까마귀 서신 튜토리얼 — 신문 구독 안내 ─────────
  // 첫날 영업이 끝나면 까마귀가 창틀에 앉는다 (DayManager.closeShop). 편지로 할 수 있는 일과 신문의 쓸모를 차례로 알려 주고, 신문을 구독할지 묻는다.
  let crowTutStep = 0;
  let paperNote = ''; // 튜토리얼에서 고른 결과 한 줄 (다음 날로 넘어가면 지운다)
  const crowTutSeen = () => !!(S().progress && S().progress.tutorialsSeen && S().progress.tutorialsSeen.crow_paper);
  const crowTutorialOn = () => S().day === 1 && S().phase === 'closing' && !crowTutSeen() && !!WS.sys.Letters && WS.sys.Letters.crowReady();
  function crowTutorial() {
    const PP = WS.data.shop.paper, goods = WS.data.shop.goods, Inv = WS.sys.Inventory, X = Inv.nextStep(), LN = WS.data.letters.crowLoan, GD = WS.data.shop.guard;
    const shopRows = goods.map(g => `<li><i>${g.icon}</i><span><b>${U.esc(g.name)}</b> <em>${g.cost}G</em><small>${U.esc(g.desc)}</small></span></li>`).join('');
    const extraRows = [
      X ? `<li><i>🔨</i><span><b>창고 확장</b> <em>${X.cost}G~</em><small>목수에게 증축을 맡긴다. 창고 용량이 늘어난다 (공사 2일).</small></span></li>` : '',
      `<li><i>🪙</i><span><b>까마귀 대출</b> <em>${LN.limits[0]}~${LN.limits[LN.limits.length - 1]}G</em><small>급할 때 바로 금고에 들어온다. ${LN.days}일 안에 원금의 ${1 + LN.interest}배를 갚아야 하니 기한을 넘기지 마시오.</small></span></li>`,
      `<li><i>💂</i><span><b>밤 경비</b> <em>일당 ${GD.wage}G</em><small>밤에 문을 두드리는 자의 정체를 열기 전에 알려 준다.</small></span></li>`,
    ].join('');
    const steps = [
      { h: '첫 장사, 수고 많았소', body: `<p>가게 문을 닫으니 창틀에 까마귀 한 마리가 내려앉았소. 오늘부터 이 녀석이 가게의 우체부요.</p>
        <p>창가의 까마귀를 눌러 <b>✒ 편지 쓰기</b>를 하면 물고 날아가고, 답장과 물건은 <b>이튿날 아침</b>에 도착하오. 경비대에 밀고하기 · 손님을 부르기 · 장사에 보탬이 되는 물건 사기 · 급전 빌리기까지 모두 이 까마귀로 하오.</p>
        <p>그런데 아직 아무 소식도 들어오지 않소. 먼저 <b>신문</b>부터 받아 보시오.</p>` },
      { h: '대륙 일보를 구독하시오', body: `<ul class="ct-list">
        <li><i>📰</i><span>어제 벌어진 <b>사건 · 왕국과 세력들의 소식</b>을 손님 입에서 나오기 전에 먼저 알 수 있소.</span></li>
        <li><i>📈</i><span><b>시세가 왜 뛰고 떨어졌는지</b>, 오늘의 장터 시세표와 이번 주 유행 물건이 실리오.</span></li>
        <li><i>✔</i><span><b>✔ 표시</b>는 장사에 영향을 주는 확인된 정보, <b>❓ 표시</b>는 진위 불명의 소문이오. 정보상에게 까마귀로 물어볼 수도 있소.</span></li>
        <li><i>🗺️</i><span>장부의 <b>최근 사건 · 소문 장부 · 대륙 정세</b>도 신문에서 채워지오. 신문이 없으면 비어 있소.</span></li></ul>
        <p class="ct-fine">구독료는 <b>하루 ${PP.fee}G</b>, 밤마다 정산에서 자동으로 나가오. 금고가 모자라면 그날로 끊기고, 까마귀로 언제든 해지 · 재신청할 수 있소. 구독하지 않으면 신문은 오지 않소.</p>` },
      { h: '신문을 받으면 살 수 있는 것들', body: `<p>모두 창가의 까마귀 → <b>✒ 편지 쓰기</b> → <b>가게 물품 주문</b>에서 신청하오. 삯은 <b>선불</b>, 며칠 뒤 아침 답장과 함께 도착하오. 도매상엔 이제 물건만 있소.</p>
        <ul class="ct-list goods">${shopRows}${extraRows}</ul>` },
      { h: '신문을 구독하시겠소?', body: `<div class="ct-ask"><i>📰</i><p><b>대륙 일보</b> — 하루 <b>${PP.fee}G</b><br>내일(2일째) 아침부터 문틈에 신문이 끼워져 있을 것이오.</p></div>
        <p class="ct-fine">지금 금고에는 ${S().gold}G가 있소. 구독하지 않아도 장사는 할 수 있지만, 세상 돌아가는 소식과 시세의 이유는 알 길이 없소. 마음이 바뀌면 까마귀 서신에서 언제든 신청하시오.</p>` },
    ];
    const n = steps.length, i = Math.min(crowTutStep, n - 1), st = steps[i];
    const last = i === n - 1;
    const dots = steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    return `<div class="crow-tut" role="dialog" aria-modal="true" aria-label="까마귀 서신 안내">
      <div class="ct-card">
        <div class="ct-from"><span class="ct-crow" aria-hidden="true">🐦</span><small>까마귀 둥지지기 레나의 안내 · ${i + 1}/${n}</small></div>
        <h3>${st.h}</h3>
        <div class="ct-body">${st.body}</div>
        <div class="ct-dots">${dots}</div>
        <div class="ct-btns">${last
          ? `<button class="pbtn ghost" data-act="tut-skip">지금은 안 한다</button><button class="pbtn primary grow" data-act="tut-sub">구독한다 <b>하루 ${PP.fee}G</b></button>`
          : `${i ? '<button class="pbtn ghost" data-act="tut-step" data-n="-1">← 이전</button>' : '<span></span>'}<button class="pbtn primary grow" data-act="tut-step" data-n="1">다음 →</button>`}</div>
      </div></div>`;
  }

  // ───────── 밤: 누군가 방문을 두드린다 ─────────
  // 마감 뒤 "잠자리에 든다"를 누르면 (DayManager.nightDue) — 방 안에서 본 문이 쾅쾅 흔들린다 (CSS steps() 스톱모션).
  // 문을 열기 전에는 누군지 모른다. 대사·선택지는 customers.js 의 knock 틀 → opens 틀에서 그대로 (DayManager.nightState)
  const NIGHT_BURST = 2400;           // 두드림 한 묶음의 주기 (css nkKnock 과 같아야 한다)
  const NIGHT_HITS = [0, 800];        // 한 묶음 = 딱 두 번 쾅 (css 의 0% · 33%, 프레임 2 · 4 가 들어서는 때와 같다)
  let knockGen = 0;
  let knockTimer = null;
  // 문이 흔들리는 동안 소리를 맞춰 낸다. 다시 그리면 CSS 애니메이션이 처음부터 도므로 소리도 처음부터
  function knockSfx(on) {
    const gen = ++knockGen;
    clearInterval(knockTimer);
    knockTimer = null;
    if (!on) return;
    const burst = () => NIGHT_HITS.forEach(ms => setTimeout(() => { if (gen === knockGen) WS.Sfx.play('knock', 0.85); }, ms));
    burst();
    knockTimer = setInterval(burst, NIGHT_BURST);
  }

  // 스프라이트 시트의 한 칸을 크게 (배경 그림으로 잘라 쓰고 픽셀은 그대로)
  function nightFigure(t) {
    const spr = t && WS.Sprites.sheet(t.look);
    if (!spr) return '';
    const n = spr.frames.length;
    const f = Math.max(0, spr.frames.indexOf((t.night && t.night.frame) || 'idle'));
    const x = n > 1 ? (f / (n - 1)) * 100 : 0;
    return `<div class="nk-figure" style="aspect-ratio:${spr.fw} / ${spr.fh};background-image:url('${spr.img.src}');background-size:${n * 100}% 100%;background-position:${x}% 0"></div>`;
  }

  // 방문 그림 — 아직 없으면(404) 다시 그릴 때마다 받으려 하지 않고 CSS 로 그린 문만 쓴다
  const doorArt = (() => { const i = new Image(); i.src = 'assets/scene/door_night.png'; return i; })();
  const doorArtMissing = () => doorArt.complete && !doorArt.naturalWidth;

  // 스톱모션 두드림 프레임 — assets/scene/door_knock_1~5.png (tools/make_door_knock.py: 1 정지 · 2 쾅 · 3 가라앉음 · 4 다시 쾅 · 5 가라앉음).
  // 하나라도 없으면(404) 프레임은 쓰지 않고 위의 CSS steps() 흔들림만 쓴다.
  // 소리 묶음이 시작하는 순간 쾅 프레임부터 들어가도록 2 → 3 → 4 → 5 → 1(정지) 순서로 돌리고, 한 바퀴를 NIGHT_BURST 와 같게 맞춘다
  const KNOCK_SEQ = [2, 3, 4, 5, 1].map(n => `assets/scene/door_knock_${n}.png`);
  const KNOCK_HOLDS = [380, 420, 380, 500, NIGHT_BURST - 1680]; // 각 컷 350~500ms(정지 컷만 길게) — 합이 NIGHT_BURST
  const knockImgs = KNOCK_SEQ.map(src => Object.assign(new Image(), { src }));
  const knockFramesMissing = () => knockImgs.some(im => im.complete && !im.naturalWidth);
  let knockPlayer = null;
  // knockSfx 와 같은 자리(render)에서 켜고 끈다 — 다시 그리면 <img> 가 새로 만들어지므로 그때마다 처음부터
  function knockFrames(on) {
    if (knockPlayer) { knockPlayer.stop(); knockPlayer = null; }
    if (!on || !WS.Cinematic || !WS.Cinematic.playFrames) return;
    const img = $ui().querySelector('.nk-door-knock-img');
    if (img) knockPlayer = WS.Cinematic.playFrames(img, KNOCK_SEQ, { holds: KNOCK_HOLDS, jitter: 1.5 });
  }

  function night() {
    const v = WS.sys.Day.nightState();
    const sleepBtn = '<button class="pbtn primary wide" data-act="night-sleep">다음 날 →</button>';
    // 저장본이 어긋났을 때 등 — 그냥 잠자리로
    if (!v) return `<div class="night nk-after"><div class="nk-room"></div><div class="nk-panel"><p class="nk-narr">밤이 조용히 지나간다.</p>${sleepBtn}</div></div>${hud()}`;
    // 천칭단의 소라껍데기가 속삭이는 밤 (DayManager.rollWhisper) — 문은 닫힌 채
    if (v.kind === 'whisper') {
      const narr = v.last ? '머리맡의 소라껍데기가 한참 만에 입을 연다. 파도 소리가 차갑다.' : '잠들려는 참에, 머리맡의 소라껍데기에서 파도 소리 섞인 목소리가 새어 나온다.';
      return `<div class="night nk-after nk-whisper"><div class="nk-room"><div class="nk-vignette"></div></div>
        <div class="nk-panel"><p class="nk-narr">${U.esc(narr)}</p><p class="nk-line">“${U.esc(v.text)}”</p>${sleepBtn}</div></div>${hud()}`;
    }
    const who = v.visitor;
    const enter = (who && who.night && who.night.enter) || 'glow';
    const door = `<div class="nk-door-wrap ${v.step === 'knock' ? 'knocking' : ''}">
        <div class="nk-door-css"></div>
        ${doorArtMissing() ? '' : '<img class="nk-door-img" src="assets/scene/door_night.png" alt="" draggable="false" onerror="this.remove()">'}
        ${v.step === 'knock' && !doorArtMissing() && !knockFramesMissing() ? `<img class="nk-door-img nk-door-knock-img" src="${KNOCK_SEQ[0]}" alt="" draggable="false" onerror="this.remove()">` : ''}
        ${v.step === 'knock' ? '<div class="nk-dust"></div>' : ''}
      </div>`;
    const doorway = who ? `<div class="nk-doorway enter-${enter} ${v.step === 'after' ? 'leaving' : ''}"><div class="nk-light"></div>${nightFigure(who)}</div>` : '';
    const speaker = t => `<div class="nk-who">${U.esc(t.name)}</div>`;
    let text = '';
    if (v.step === 'knock') text = `<p class="nk-narr">${U.esc(v.knock.greet)}</p>${v.guard ? `<div class="nk-who nk-guard">${U.esc(v.guard.who)}</div><p class="nk-line nk-guard-line">${U.esc(v.guard.text)}</p>` : ''}`;
    else if (v.step === 'visitor') text = `${v.narr ? `<p class="nk-narr">${U.esc(v.narr)}</p>` : ''}${speaker(who)}<p class="nk-line">${U.esc(who.greet || '')}</p>`;
    else if (v.by === 'visitor' && who) text = `${speaker(who)}<p class="nk-line">${U.esc(v.reply)}</p>`;
    else text = `<p class="nk-narr">${U.esc(v.reply)}</p>`;
    // 문 두드림이 끝났는데 소라껍데기도 속삭일 밤이면 — 잠자리에 들면 속삭임부터
    const btns = v.step === 'after' ? (WS.sys.Day.whisperPending() ? sleepBtn.replace('night-sleep', 'night-whisper').replace('다음 날 →', '다음 →') : sleepBtn)
      : `<div class="nk-choices">${v.choices.map((ch, i) => `<button class="pbtn ${!ch.ok ? 'ghost locked' : i === 0 ? 'primary' : ''}" data-act="night-choice" data-id="${U.esc(ch.id)}" ${ch.ok ? '' : `disabled title="${U.esc(ch.why)}"`}>
          ${U.esc(ch.label)}${ch.ok ? '' : `<small>${U.esc(ch.why)}</small>`}</button>`).join('')}</div>`;
    return `<div class="night nk-${v.kind} nk-${v.step}">
      <div class="nk-room">${door}${doorway}<div class="nk-vignette"></div></div>
      <div class="nk-panel">${text}${btns}</div>
    </div>${hud()}`;
  }

  // 밤 장면의 선택 — 효과음은 결과에 맞춰
  function nightChoice(id) {
    const D = WS.sys.Day;
    const v = D.nightState();
    const ch = v && v.choices.find(x => x.id === id);
    if (!ch || !ch.ok) return;
    const gold = S().gold;
    if (!D.nightChoose(id)) return;
    const X = WS.Sfx;
    if (ch.opens) { X.play('latch', 0.6); X.play('door_open', 0.7); }
    else if (S().gold !== gold) X.play(Math.random() < 0.5 ? 'coins' : 'coins2');
    else if (ch.effects && (ch.effects.take || ch.effects.give)) X.play('blade');
    else X.play('door_close', 0.35);
    render();
  }

  // ───────── 엔딩 ─────────
  // 그 뒤의 이야기 — 가게를 거쳐 간 사람들이 어떻게 되었는지 (Papers, Please 의 마지막 장처럼 한 줄씩)
  // WS.data.epilogues = [{ id, who, icon, variants: [{ when, text }] }] — 조건이 맞는 첫 variant 하나
  function epilogueHtml() {
    const eps = (WS.data.epilogues || []).map(ep => {
      const v = (ep.variants || []).find(x => WS.sys.Conditions.check(x.when));
      return v ? `<li><span class="ep-who">${ep.icon || '•'} ${U.esc(ep.who)}</span><span>${U.esc(v.text)}</span></li>` : '';
    }).filter(Boolean);
    return eps.length ? `<h3>그 뒤의 이야기</h3><ul class="epilogue">${eps.join('')}</ul>` : '';
  }

  // 결말 컷신 (엔딩의 cinematic 필드 → js/render/Cinematic.js) — 결말 글보다 먼저 한 번. 다 보거나 건너뛰면 글로
  const cinemaPending = () => {
    const st = S(), base = st && st.phase === 'ending' && WS.data.endings.find(x => x.id === st.ending);
    return !!(base && WS.Cinematic && WS.Cinematic.available(base.id, base.cinematic) && st.endingCinema !== st.ending && !WS.Cinematic.skipAll);
  };
  function playCinema() {
    if (!cinemaPending() || WS.Cinematic.playing()) return;
    const st = S();
    const base = WS.data.endings.find(x => x.id === st.ending);
    // 검은 화면 자막에 쓸 제목 — variants 에 제목을 따로 단 갈래면 그쪽 제목으로
    const v = (base.variants || []).find(x => WS.sys.Conditions.check(x.when));
    const title = (v && v.title) || base.title;
    WS.Cinematic.play(base.cinematic, base.id, title, () => {
      st.endingCinema = st.ending;
      render();
    });
  }

  // ───────── 엔딩 고서 ─────────
  // 닫힌 가죽 표지(제목) → 표지가 넘어가며 속지 펼침. 펼침 1: 원문 | 조건 · 펼침 2: 그 뒤의 이야기 | 사진첩 · 펼침 3~: (캡션) | 사진 한 장.
  // 스크롤 없이 실제 렌더 높이를 재서 쪽을 나눈다 (paginate). 폰(세로)은 한 쪽씩.
  let bookIdx = 0, bookCtx = null, bookSpreads = [], bookWired = false, bookBusy = false, coverTimer = null, bookResizeT = null;
  const imgRatio = new Map(); // 그림 경로 → 가로/세로 (0 = 못 불러옴)
  const wideBook = () => window.matchMedia('(min-width: 760px) and (min-aspect-ratio: 1/1)').matches;
  const BOOK_ORN = '<div class="eb-orn"><i></i><b>✦</b><i></i></div>';

  // 조건 문구에서 다른 결말을 알려 주는 대목을 걷어 낸다 — 다른 결말 이름 · 「…」 · "…라면 …" 분기 안내 · 통째로 괄호인 힌트
  function cleanReq(r, others) {
    let t = String(r).trim();
    if (!t || t[0] === '(') return '';
    const hint = s => /[「」]/.test(s) || others.some(o => s.includes(o)) || /(다면|이라면|결말 글)/.test(s);
    let depth = 0, cut = -1;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (ch === '(') depth++; else if (ch === ')') depth--;
      else if (!depth && t.startsWith(' — ', i)) { cut = i; break; }
    }
    if (cut > 0 && hint(t.slice(cut))) t = t.slice(0, cut);
    t = t.replace(/\s*\(([^()]*)\)\s*$/, (m, g) => (hint(g) ? '' : m));
    if (others.some(o => t.includes(o))) return '';
    return t.trim();
  }

  // 블록 목록을 쪽으로 나눈다 — 문단은 낱말 단위로 잘라 다음 쪽으로, 나머지 블록은 통째로. meas = 쪽과 같은 크기의 보이지 않는 상자
  function paginate(blocks, meas) {
    const fits = arr => { meas.innerHTML = arr.map(b => b.html).join(''); return meas.scrollHeight <= meas.clientHeight + 1; };
    const pages = [];
    let cur = [];
    const flush = () => {
      const carry = [];
      while (cur.length > 1 && cur[cur.length - 1].head) carry.unshift(cur.pop()); // 소제목만 쪽 끝에 홀로 남지 않게
      if (cur.length) pages.push(cur);
      cur = carry;
    };
    const queue = blocks.slice();
    for (let guard = 0; queue.length && guard < 800; guard++) {
      const b = queue.shift();
      if (fits(cur.concat(b))) { cur.push(b); continue; }
      if (b.text) {
        const words = b.text.split(' ');
        let lo = 0, hi = words.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (fits(cur.concat(b.mk(words.slice(0, mid).join(' '))))) lo = mid; else hi = mid - 1;
        }
        if (lo > 0) {
          cur.push(b.mk(words.slice(0, lo).join(' ')));
          queue.unshift(b.mk(words.slice(lo).join(' ')));
          flush();
          continue;
        }
      }
      if (!cur.length) { cur.push(b); flush(); continue; } // 한 블록이 쪽보다 커도 멈추지 않는다
      flush();
      queue.unshift(b);
    }
    if (cur.length) pages.push(cur);
    return pages.map(arr => arr.map(b => b.html).join(''));
  }

  const bkP = (text, cls) => ({ text, mk: t => bkP(t, cls), html: `<p class="${cls}">${U.esc(text)}</p>` });
  const bkB = (html, head) => ({ html, head: !!head });
  const bkPhoto = (p, cap) => `<div class="eb-photo ${cap ? 'withcap' : ''}"><div class="eb-pimg"><img src="${U.esc(p.file)}" alt="${U.esc(p.caption || '결말 사진')}" style="--r:${imgRatio.get(p.file) || 0.6667}" draggable="false"></div>${cap && p.caption ? `<p class="eb-pcap">${U.esc(p.caption)}</p>` : ''}</div>`;
  const bkAlbumTitle = '<div class="eb-albumtitle"><i></i><b>사진첩</b><i></i></div>';

  function ending() {
    const st = S();
    if (cinemaPending()) return '<div class="cine-wait"></div>';
    if (st.ending !== lastEndingSeen) { lastEndingSeen = st.ending; endingChoiceShown = {}; } // 다른 결말을 보면 펼친 선택지도 새로
    if (!st.endingBookOpen) bookIdx = 0;
    const base = WS.data.endings.find(x => x.id === st.ending);
    // 한 엔딩 안에서도 상황에 따라 제목·글이 갈린다 (variants: [{ when, title?, text }] — 먼저 맞는 것)
    const v = (base.variants || []).find(x => WS.sys.Conditions.check(x.when));
    const e = v ? { ...base, title: v.title || base.title, text: v.text || base.text } : base;
    const disguised = st.ledger.filter(l => l.action === 'sell' && l.faction !== l.trueFaction).length;
    const others = WS.data.endings.filter(x => x.id !== base.id).map(x => x.title);
    // 「중립 상인」(안전망 결말, 조건이 null)만은 체크리스트 대신 그 판에서 실제로 스쳐 간 큰 사건들을 보여 준다
    const bigNews = e.id === 'neutral'
      ? Object.keys(st.newsArchive).map(Number).sort((a, b) => a - b)
        .flatMap(d => (st.newsArchive[d] || []).filter(n => n.big).map(n => n.text))
      : null;
    const A = [bkB(`<div class="eb-eyebrow">DAY ${st.day} · 결말</div>`), bkB(`<h1>${U.esc(e.title)}</h1>`), bkP(e.text, 'ending-text')];
    const B = [];
    const lis = bigNews ? bigNews : (e.requires || []).map(r => cleanReq(r, others)).filter(Boolean);
    if (lis.length) B.push(bkB(`<h3>${bigNews ? '이 가게가 스쳐 간 사건들' : '이 결말의 조건'}</h3>`, true), ...lis.map(t => bkB(`<div class="eb-li">${bigNews ? '·' : '✓'} ${U.esc(t)}</div>`)));
    // 선택지(있는 결말만) — 눌러 보면 그 자리에 짧은 글이 펼쳐진다. 게임 상태에는 영향 없음
    (e.choices || []).forEach((ch, i) => B.push(bkB(`<div class="end-choices"><button class="pbtn ghost" data-act="ending-choice" data-id="${i}">${U.esc(ch.label)}</button>${endingChoiceShown[i] ? `<p class="end-choice-text">${U.esc(ch.text)}</p>` : ''}</div>`)));
    if (disguised) B.push(bkB(`<p class="eb-note">※ 소속을 속인 손님에게 판 거래 ${disguised}건</p>`));
    B.push(bkB(`<p class="eb-note">최종 금화 ${st.gold}G · 세계 사건 ${Object.keys(st.eventLog).length}건</p>`));
    const C = [];
    const eps = (WS.data.epilogues || []).map(ep => {
      const vv = (ep.variants || []).find(x => WS.sys.Conditions.check(x.when));
      return vv ? bkB(`<div class="eb-ep"><span class="ep-who">${ep.icon || '•'} ${U.esc(ep.who)}</span><span>${U.esc(vv.text)}</span></div>`) : null;
    }).filter(Boolean);
    if (eps.length) C.push(bkB('<h3>그 뒤의 이야기</h3>', true), ...eps);
    // 사진 — design/ending_art 매니페스트(WS.data.endingArt) 우선, 없으면 예전 그림 세 장
    const art = WS.data.endingArt && WS.data.endingArt[base.id];
    let album = art && art.album && art.album.length ? art.album.map(a => ({ file: a.file, caption: a.caption || '' })) : null;
    if (!album) {
      const out = WS.Cinematic && WS.Cinematic.outcomeFor(base.id);
      if (out) { WS.Cinematic.preload(base.id); album = out.frames.map((f, i) => ({ file: f, caption: (base.captions || [])[i] || '' })); }
    }
    bookCtx = { id: base.id, A, B, C, album: album || [] };
    // 고서: 닫힌 표지 → 펼침. 컷신을 건너뛴 경우(개발 패널)는 표지 없이 바로 펼침
    const cover = !WS.Cinematic.skipAll && !st.endingBookOpen;
    const arw = (dir, lab) => `<button type="button" class="eb-arw ${dir < 0 ? 'prev' : 'next'}" data-eb="${dir}" aria-label="${lab}"><svg viewBox="0 0 44 28" aria-hidden="true"${dir > 0 ? ' style="transform:scaleX(-1)"' : ''}><path d="M2 14 L15 3 L15 9 L41 9 Q43 9 43 11 L43 17 Q43 19 41 19 L15 19 L15 25 Z" fill="currentColor"/><path d="M15 3 L15 25" stroke="#3a2410" stroke-width="1" opacity=".55"/><path d="M19 12 H38 M19 16 H38" stroke="#3a2410" stroke-width=".8" opacity=".45"/></svg></button>`;
    return `<div class="end-spread"><div class="end-book ${cover ? 'closed' : ''}">
      <div class="eb-slide"><div class="eb-spread">
        <div class="eb-left"><div class="eb-page"></div></div>
        <div class="eb-right"><div class="eb-page"></div></div>
        <div class="eb-nav">${arw(-1, '이전 쪽')}<span class="eb-no" aria-live="polite"></span>${arw(1, '다음 쪽')}</div>
      </div>
      ${cover ? `<div class="eb-leaf r cov eb-cover" role="button" tabindex="0" aria-label="책을 펼친다"><div class="eb-lf front"><b>${U.esc(e.title)}</b><i class="eb-shade"></i></div><div class="eb-lf back"><div class="eb-page"></div><i class="eb-shade"></i></div></div>` : ''}</div>
    </div>
    <div class="bottom-bar end-bar"><button class="pbtn primary wide" data-act="to-title">${st.replay ? '뒤로 가기' : '처음으로'}</button></div></div>`;
  }

  // 그림 미리 확인 — 못 불러오면(없거나 실패) 그 쪽은 건너뛴다
  function probeImgs(files, cb) {
    const todo = files.filter(f => !imgRatio.has(f));
    if (!todo.length) { cb(); return; }
    let left = todo.length, done = false;
    const fin = () => { if (!done) { done = true; cb(); } };
    todo.forEach(f => {
      const im = new Image();
      im.onload = () => { imgRatio.set(f, im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 0.6667); if (!--left) fin(); };
      im.onerror = () => { imgRatio.set(f, 0); if (!--left) fin(); };
      im.src = f;
    });
    setTimeout(() => { todo.forEach(f => { if (!imgRatio.has(f)) imgRatio.set(f, 0.6667); }); fin(); }, 3000);
  }

  // 화면 크기에 맞춰 쪽을 나누고 펼침면 목록을 만든다
  function layoutBook() {
    const root = document.querySelector('.end-book');
    if (!root || !bookCtx) return;
    const c = bookCtx, wide = wideBook();
    const holder = root.querySelector('.eb-left');
    const meas = document.createElement('div');
    meas.className = 'eb-page eb-measure';
    holder.appendChild(meas);
    const pa = paginate(c.A, meas), pb = paginate(c.B, meas), pc = paginate(c.C, meas);
    meas.remove();
    const photos = c.album.filter(a => imgRatio.get(a.file) !== 0);
    const sp = [];
    if (wide) {
      const n = Math.max(pa.length, pb.length, 1);
      for (let k = 0; k < n; k++) sp.push({ l: pa[k] || BOOK_ORN, r: pb[k] || BOOK_ORN });
      if (pc.length || photos.length) {
        const m = Math.max(pc.length, 1);
        for (let k = 0; k < m; k++) sp.push({ l: pc[k] || BOOK_ORN, r: k === 0 && photos.length ? bkAlbumTitle : BOOK_ORN });
      }
      for (let k = 0; k < photos.length; k += 2) sp.push({ l: bkPhoto(photos[k], false), r: photos[k + 1] ? bkPhoto(photos[k + 1], false) : '' }); // 사진만 — 한 펼침에 두 장, 홀수면 마지막 오른쪽은 빈 속지
    } else {
      [...pa, ...pb, ...pc].forEach(h => sp.push({ l: h }));
      if (photos.length) { sp.push({ l: bkAlbumTitle }); photos.forEach(p => sp.push({ l: bkPhoto(p, false) })); }
    }
    bookSpreads = sp;
    bookIdx = Math.max(0, Math.min(sp.length - 1, bookIdx));
    fillBook(root, sp[bookIdx]);
    const cb = root.querySelector('.eb-cover .eb-page');
    if (cb) cb.innerHTML = sp[0].l; // 표지 뒷면 = 첫 펼침의 왼쪽 쪽
  }
  function fillBook(root, s) {
    root.querySelector('.eb-left > .eb-page:not(.eb-measure)').innerHTML = s.l;
    const r = root.querySelector('.eb-right > .eb-page');
    r.innerHTML = s.r || '';
    updateBookNav(root);
  }
  function updateBookNav(root) {
    const n = bookSpreads.length;
    root.querySelector('.eb-no').textContent = `${bookIdx + 1} / ${n}`;
    root.querySelector('.eb-arw.prev').classList.toggle('off', bookIdx <= 0);
    root.querySelector('.eb-arw.next').classList.toggle('off', bookIdx >= n - 1);
    root.dataset.last = bookIdx >= n - 1 ? '1' : '';
  }
  function buildBook() {
    const root = document.querySelector('.end-book');
    if (!root || !bookCtx) return;
    probeImgs(bookCtx.album.map(a => a.file), () => { if (root.isConnected) layoutBook(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (root.isConnected && !bookBusy) layoutBook(); });
  }

  // 책장 넘김 — 제본선을 축으로 rotateY 0.5초, 뒷면 그림자. 폰은 한 쪽씩 미끄러진다
  function turnBook(d) {
    const root = document.querySelector('.end-book');
    if (!root || bookBusy || root.querySelector('.eb-cover')) return;
    const n = bookIdx + d;
    if (n < 0 || n >= bookSpreads.length) return;
    const cur = bookSpreads[bookIdx], nx = bookSpreads[n];
    bookIdx = n;
    updateBookNav(root);
    WS.Sfx && WS.Sfx.play('page', 0.35);
    const wide = wideBook();
    const Lp = root.querySelector('.eb-left > .eb-page:not(.eb-measure)'), Rp = root.querySelector('.eb-right > .eb-page');
    if (!wide || reduceMotion() || !root.animate) {
      fillBook(root, nx);
      if (!wide && Lp.animate && !reduceMotion()) Lp.animate([{ transform: `translateX(${d * 36}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out' });
      return;
    }
    bookBusy = true;
    const sp = root.querySelector('.eb-spread');
    const leaf = document.createElement('div');
    leaf.className = `eb-leaf ${d > 0 ? 'r' : 'l'}`;
    const front = d > 0 ? cur.r : cur.l, back = d > 0 ? nx.l : nx.r;
    leaf.innerHTML = `<div class="eb-lf front"><div class="eb-page">${front || ''}</div><i class="eb-shade"></i></div><div class="eb-lf back"><div class="eb-page">${back || ''}</div><i class="eb-shade"></i></div>`;
    sp.appendChild(leaf);
    if (d > 0) Rp.innerHTML = nx.r || ''; else Lp.innerHTML = nx.l; // 아래층 — 넘어간 자리에서 반대편이 드러난다
    const E = 'cubic-bezier(.45,.05,.35,1)', ang = d > 0 ? -180 : 180;
    const shades = leaf.querySelectorAll('.eb-shade');
    const done = () => { if (!leaf.isConnected) return; if (d > 0) Lp.innerHTML = nx.l; else Rp.innerHTML = nx.r || ''; leaf.remove(); bookBusy = false; };
    const an = leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${ang}deg)` }], { duration: 600, easing: E, fill: 'forwards' });
    shades[0].animate([{ opacity: 0 }, { opacity: .55, offset: .5 }, { opacity: .55 }], { duration: 600, easing: E, fill: 'forwards' });
    shades[1].animate([{ opacity: .55 }, { opacity: .55, offset: .5 }, { opacity: 0 }], { duration: 600, easing: E, fill: 'forwards' });
    an.onfinish = done;
    setTimeout(() => { if (an.playState !== 'paused') done(); }, 750); // 화면이 가려져 애니메이션이 멈춰도 마무리
  }

  // 표지 열기 — 잠깐 뒤 또는 표지를 누르면. 닫힌 책(오른쪽 절반)이 가운데에서 펼침면 자리로 밀리며, 표지가 제본선을 축으로 넘어가고 왼쪽 속지가 그 뒤로 드러난다
  function openBook() {
    const root = document.querySelector('.end-book'), cv = root && root.querySelector('.eb-cover');
    clearTimeout(coverTimer); coverTimer = null;
    if (!cv || cv.dataset.opening) return;
    if (S()) S().endingBookOpen = true;
    cv.dataset.opening = '1';
    const spread = root.querySelector('.eb-spread'), slide = root.querySelector('.eb-slide');
    const finish = () => { root.classList.remove('closed'); cv.remove(); bookBusy = false; };
    if (reduceMotion() || !cv.animate) { finish(); return; }
    bookBusy = true;
    WS.Sfx && WS.Sfx.play('page', 0.45);
    const E = 'cubic-bezier(.45,.05,.3,1)', D = 1100, wide = wideBook();
    const shades = cv.querySelectorAll('.eb-shade');
    shades[0].animate([{ opacity: 0 }, { opacity: .6, offset: .5 }, { opacity: .6 }], { duration: D, easing: E, fill: 'forwards' });
    shades[1].animate([{ opacity: .6 }, { opacity: .6, offset: .5 }, { opacity: 0 }], { duration: D, easing: E, fill: 'forwards' });
    if (wide) {
      slide.animate([{ transform: 'translateX(-25%)' }, { transform: 'translateX(0)' }], { duration: D, easing: E, fill: 'forwards' });
      spread.animate([{ clipPath: 'inset(0 0 0 50%)' }, { clipPath: 'inset(0 0 0 50%)', offset: .5 }, { clipPath: 'inset(0 0 0 14%)', offset: .78 }, { clipPath: 'inset(0 0 0 0%)' }], { duration: D, easing: E, fill: 'forwards' });
      // 표지 자체에 opacity 를 걸면 3D 가 납작해져 앞면이 거울처럼 비친다 — 마지막에 속지와 섞이는 페이드는 뒷면에만
      cv.querySelector('.eb-lf.back').animate([{ opacity: 1 }, { opacity: 1, offset: .88 }, { opacity: 0 }], { duration: D, easing: E, fill: 'forwards' });
      const an = cv.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }], { duration: D, easing: E, fill: 'forwards' });
      an.onfinish = finish;
    } else {
      spread.animate([{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1 }], { duration: D * .7, fill: 'forwards' });
      const an = cv.animate([{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: 1, offset: .8 }, { transform: 'rotateY(-120deg)', opacity: 0 }], { duration: D * .7, easing: E, fill: 'forwards' });
      an.onfinish = finish;
    }
    setTimeout(() => { if (!document.getAnimations().some(a => a.playState === 'paused')) finish(); }, D + 250);
  }
  function armCover() {
    const cv = document.querySelector('.eb-cover');
    if (!cv || coverTimer) return;
    coverTimer = setTimeout(openBook, 900);
  }
  function wireAlbum() {
    if (bookWired) return;
    bookWired = true;
    let x0 = null, swiped = false;
    document.addEventListener('click', e => {
      const t = e.target;
      if (!t.closest) return;
      if (t.closest('.eb-cover')) { openBook(); return; }
      const b = t.closest('.eb-arw');
      if (b) { turnBook(+b.dataset.eb); return; }
      if (t.closest('.eb-pimg') && !swiped) turnBook(1);
    });
    document.addEventListener('pointerdown', e => { swiped = false; x0 = e.target.closest && e.target.closest('.eb-spread') && !e.target.closest('button') ? e.clientX : null; });
    document.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { swiped = true; turnBook(dx < 0 ? 1 : -1); }
    });
    document.addEventListener('keydown', e => {
      if (!S() || S().phase !== 'ending' || e.repeat || !document.querySelector('.end-book')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); if (document.querySelector('.eb-cover')) openBook(); else turnBook(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); turnBook(-1); }
    });
    window.addEventListener('resize', () => {
      clearTimeout(bookResizeT);
      bookResizeT = setTimeout(() => { if (S() && S().phase === 'ending' && document.querySelector('.end-book') && !bookBusy) layoutBook(); }, 150);
    });
  }

  const ADMIN_CODE = 'ashes-of-kings';
  let adminBuf = '', adminAt = 0;
  function renderDebug() {
    const el = document.getElementById('debug');
    if (!el || el.hidden || !S()) return;
    const st = S();
    const C = WS.sys.Conditions, safe = w => { try { return !!C.check(w); } catch (e) { return false; } };
    const rels = Object.entries(WS.data.worldVars).filter(([k]) => k.startsWith('rel_'));
    let first = null;
    const ends = WS.data.endings.map(e => { const ok = safe(e.when); if (ok && !first) first = e.id; return [e, ok]; });
    el.innerHTML = `<b>ADMIN</b>
      <h5>Relationship</h5><table>${rels.map(([k, d]) => `<tr><td>${d.label}</td><td>${U.round1(st.world[k])}</td></tr>`).join('')}</table>
      <h5>Endings <small>(지금 끝나면 ▶)</small></h5><table>${ends.map(([e, ok]) => `<tr class="${ok ? 'ok' : ''}"><td>${e.id === first ? '▶ ' : ''}${e.title || e.id}</td><td>${ok ? '충족' : '-'}</td></tr>`).join('')}</table>
      <h5>Flags</h5><div>${Object.keys(st.flags).join(', ') || '-'}</div>
      <h5>Scheduled</h5><div>${st.scheduled.map(x => `${x.event}@D${x.day}`).join(', ') || '-'}</div>`;
  }

  // 금화가 바뀌면 숫자가 굴러 올라가고(count-up) +N / −N 이 떠올랐다 사라진다
  let lastGold = null;
  const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function goldFx(same) {
    const el = document.querySelector('.hud .g-n');
    if (!el) { lastGold = null; return; }
    const now = Number(el.dataset.gold);
    const prev = lastGold;
    lastGold = now;
    if (prev === null || prev === now || !same || reduceMotion()) return;
    const pill = el.closest('.pill'), delta = now - prev, t0 = performance.now(), dur = 650;
    pill.classList.add('tick');
    const tick = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      if (!el.isConnected) return;
      el.textContent = Math.round(prev + (now - prev) * e);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const fl = document.createElement('span');
    fl.className = `gold-float ${delta > 0 ? 'pos' : 'neg'}`;
    fl.textContent = `${delta > 0 ? '+' : '−'}${Math.abs(delta)}G`;
    const r = pill.getBoundingClientRect(), sr = document.getElementById('stage').getBoundingClientRect();
    fl.style.left = `${r.left - sr.left + 8}px`; fl.style.top = `${r.bottom - sr.top + 2}px`;
    document.getElementById('stage').appendChild(fl);
    setTimeout(() => fl.remove(), 1200);
    if (delta > 0) {
      // 금화가 늘면 주머니 아이콘 둘레에 금빛 반짝이가 튄다
      const ico = pill.querySelector('.ui-ico');
      const ir = (ico || pill).getBoundingClientRect();
      for (let i = 0; i < 4; i++) {
        const sp = document.createElement('i');
        sp.className = 'gold-spark';
        sp.style.cssText = `left:${ir.left - sr.left + ir.width / 2}px;top:${ir.top - sr.top + ir.height / 2}px;--dx:${Math.round((Math.random() - .5) * 46)}px;--dy:${Math.round(-8 - Math.random() * 26)}px;--d:${(i * 70)}ms;--s:${(0.5 + Math.random() * 0.5).toFixed(2)}`;
        document.getElementById('stage').appendChild(sp);
        setTimeout(() => sp.remove(), 1100);
      }
    }
  }

  // 화면이 처음 열릴 때 마감 표의 숫자가 0 에서 굴러 올라간다 (장부를 넘기며 합산하는 느낌)
  function countUps() {
    if (reduceMotion()) return;
    document.querySelectorAll('.closing-grid b, .safe-box .sb-row b, .summary-bar b').forEach((el, i) => {
      const m = /\d+/.exec(el.textContent);
      if (!m || el.children.length) return;
      const to = Number(m[0]), t0 = performance.now() + 220 + i * 70, dur = 700, txt = el.textContent, at = m.index, len = m[0].length;
      el.textContent = txt.slice(0, at) + '0' + txt.slice(at + len);
      const tick = t => {
        if (!el.isConnected) return;
        const k = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
        el.textContent = txt.slice(0, at) + Math.round(to * e) + txt.slice(at + len);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // 이모지 → 키트 아이콘 (화면 어디서 나온 글이든 같은 그림체로). 진영·분류 아이콘은 데이터 쪽이라 그대로 둔다
  const EMO = { '🐦': 'crow', '✒': 'quill', '🔍': 'seal', '📜': 'scroll', '🔒': 'lock', '📦': 'stock', '💡': 'candle', '👆': 'help', '📒': 'ledger', '📰': 'news', '🗺': 'map', '🪙': 'gold', '⚠': 'warn', '✉': 'letter', '✓': 'check' };
  const EMO_RE = /(🐦|✒️?|🔍|📜|🔒|📦|💡|👆|📒|📰|🗺️?|🪙|⚠️?|✉️?|✓)/;
  function emojiPass(root) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (EMO_RE.test(n.nodeValue) && !n.parentElement.closest('script,style,[data-noemo]')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const hits = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) hits.push(n);
    hits.forEach(n => {
      const frag = document.createDocumentFragment();
      n.nodeValue.split(new RegExp(EMO_RE.source, 'g')).forEach((part, i) => {
        if (i % 2 === 0) { if (part) frag.appendChild(document.createTextNode(part)); return; }
        const key = EMO[part.replace(/️/g, '')];
        const el = document.createElement('i');
        el.className = `ei ei-${key}`; el.setAttribute('aria-hidden', 'true');
        frag.appendChild(el);
      });
      n.parentNode.replaceChild(frag, n);
    });
  }

  function render() {
    // 아침에 넘길 쪽이 도매상뿐이면(신문이 오기 전) 바로 도매상으로
    if (!booting && S().phase === 'morning' && morningPages()[0] === 'prep') WS.sys.Day.toPrep();
    const phase = booting ? 'loading' : S().phase;
    const views = { loading: loadingView, title: () => (collOpen ? collection() : title()), morning, prep, shop, closing, night, ending };
    if (collOpen && phase !== 'loading') views[phase] = collection; // 개발 패널에서 게임 중에도 수집품 화면을 연다
    // 다시 그려도 스크롤 자리를 지킨다 (도매상에서 수량을 올릴 때 맨 위로 튀지 않게)
    const KEEP = ['.gz-sheet.p1', '.gz-sheet.p2', '.loose-wrap', '.shop-list', '.sheet', '.shelf-body', '.mail-list', '.mail-pane', '.np', '.drawer-body', '.mm-list', '.magnify-overlay', '.bk-sheets', '.bk-page.l .bk-in', '.bk-page.r .bk-in', '.coll-grid'];
    // 책장을 넘긴 직후 — 치우기 전의 옛 쪽을 챙겨 두었다가 넘어가는 종이에 붙인다 (bookFlip)
    let oldBook = null;
    if (turnDir) {
      const ob = $ui().querySelector('.book');
      oldBook = { dir: turnDir, l: null, r: null, sheets: null, scroll: [] };
      if (ob) {
        oldBook.sheets = ob.querySelector('.bk-sheets');
        oldBook.l = ob.querySelector('.bk-page.l'); oldBook.r = ob.querySelector('.bk-page.r');
        ob.querySelectorAll('.bk-sheets, .bk-in').forEach(n => { if (n.scrollTop) oldBook.scroll.push([n, n.scrollTop]); });
      }
    }
    if (!sealOpen && !magnifyOpen) overlayShown = false; // 확대경 창이 닫혔다 — 다음에 열 때는 다시 여는 애니메이션
    if (!drawer) drawerShown = false;
    const keep = {};
    const samePage = $ui().dataset.phase === phase && $ui().dataset.page === String(phase === 'morning' ? morningSub : '');
    if (samePage) KEEP.forEach(sel => { const el = $ui().querySelector(sel); if (el) keep[sel] = el.scrollTop; });
    $ui().innerHTML = (views[phase] || title)();
    $ui().classList.toggle('fresh', !samePage); // 화면이 바뀐 직후 한 번만 — 목록이 차례로 올라오는 등장 효과(css #ui.fresh)
    $ui().dataset.page = String(phase === 'morning' ? morningSub : '');
    flowBook();
    KEEP.forEach(sel => { const el = keep[sel] !== undefined && $ui().querySelector(sel); if (el) el.scrollTop = keep[sel]; });
    if (oldBook) bookFlip(oldBook);
    turnDir = ''; // 쪽 넘김 애니메이션은 넘긴 직후 한 번만
    $ui().dataset.phase = phase;
    document.getElementById('stage').dataset.phase = phase;
    const knocking = phase === 'night' && !!$ui().querySelector('.nk-door-wrap.knocking');
    knockSfx(knocking);
    knockFrames(knocking);
    WS.Scene.sync();
    emojiPass($ui());
    const tipEl = document.getElementById('tip'); if (tipEl) tipEl.classList.remove('on');
    if (!samePage) countUps();
    placeAffilHit();
    goldFx(samePage);
    if (phase === 'ending') {
      const st = S();
      if (!st.replay && st.endingLogged !== st.ending) { st.endingLogged = st.ending; WS.sys.EndingLog.record(st.ending, st.day, st.gold); } // 수집품 기록 (엔딩이 시작될 때 한 번)
      wireAlbum(); playCinema(); buildBook(); armCover();
    }
    renderDebug();
  }

  // ───────── 로딩 / 화면 전환 ─────────
  let booting = false;
  let loadPct = 0;
  let transitioning = false;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const LOAD_TIPS = [
    '손님이 말하는 값이 늘 시세는 아니다.',
    '오늘 판 칼 한 자루가 내일 신문 1면이 될 수 있다.',
    '장부는 거짓말을 하지 않는다. 손님은 한다.',
  ];

  function loadingView() {
    return titleScene(`<div class="ts-load">
        <div class="ts-lantern"></div>
        <div class="load-bar"><i style="width:${Math.round(loadPct * 100)}%"></i></div>
        <p class="load-tip">${U.esc(LOAD_TIPS[Math.floor(Math.random() * LOAD_TIPS.length)])}</p>
      </div>`, 'is-loading');
  }

  async function boot() {
    booting = true;
    loadPct = 0;
    render();
    const t0 = performance.now();
    const tipTimer = setInterval(() => { const el = document.querySelector('.load-tip'); if (el) el.textContent = LOAD_TIPS[Math.floor(Math.random() * LOAD_TIPS.length)]; }, 3200);
    await WS.Boot.run(p => {
      loadPct = p;
      const bar = document.querySelector('.load-bar i');
      if (bar) bar.style.width = Math.round(p * 100) + '%';
    });
    await sleep(Math.max(0, 900 - (performance.now() - t0))); // 너무 빨리 스쳐 지나가지 않게
    clearInterval(tipTimer);
    await transition(() => { booting = false; });
  }

  // 검은 막으로 덮고 → 상태를 바꾸고 → (필요하면 제목 카드를 보여 주고) → 걷어낸다.
  // card 는 상태를 바꾼 뒤에 만들어야 하는 경우가 있어 함수로도 받는다.
  // 화면 전환 — 검은 막으로 빠르게 페이드(약 0.7초) + 짧은 한 줄. 막을 누르면 곧바로 걷힌다.
  async function transition(fn, card, hold = 0, mode = '') {
    if (transitioning) return;
    transitioning = true;
    const cur = document.getElementById('curtain');
    const cardEl = cur.querySelector('.curtain-card');
    let skipped = false, wake = null;
    const skip = () => { skipped = true; if (wake) wake(); };
    const nap = ms => new Promise(res => { if (skipped) return res(); wake = res; setTimeout(res, ms); });
    cur.addEventListener('pointerdown', skip);
    if (mode === 'kd' || mode === 'kd-plain') return dawn(cur, cardEl, fn, card, nap, skip, () => skipped, mode === 'kd-plain');
    cur.classList.add('on');
    await sleep(200);
    fn();
    render();
    const html = typeof card === 'function' ? card() : card;
    if (html) {
      cardEl.innerHTML = html;
      cardEl.classList.add('show');
      await nap(hold ? 420 : 0);
      cardEl.classList.remove('show');
    }
    cur.classList.remove('on');
    await sleep(220);
    cur.removeEventListener('pointerdown', skip);
    cardEl.innerHTML = '';
    transitioning = false;
  }

  // 킹덤 투 크라운식 — 밤빛으로 가라앉았다가 새벽빛으로 밝아지고, 위쪽에 그날 로마 숫자가 떴다 사라진다
  async function dawn(cur, cardEl, fn, card, nap, skip, wasSkipped, plain) {
    cur.classList.toggle('kd-plain', !!plain);
    cur.classList.add('kd', 'on');
    await sleep(reduceMotion() ? 60 : plain ? 380 : 550);
    fn();
    render();
    const c = typeof card === 'function' ? card() : card;
    if (c) {
      cardEl.innerHTML = (c.day ? `<div class="kd-roman">${roman(c.day)}</div><div class="kd-day">${c.day}일째</div>` : '')
        + (c.sub ? `<div class="kd-day">${U.esc(c.sub)}</div>` : '');
      cardEl.classList.toggle('quick', !c.day);
      void cardEl.offsetWidth; // 글자를 넣은 프레임을 먼저 확정해야 떠오르는 전환이 돈다 (안 그러면 뚝 나타남)
      cardEl.classList.add('show');
    }
    // '영업 시작' 한 줄: 빨리 떴다가, 막이 걷히며 화면이 밝아지는 동안 함께 사라진다
    if (c && !c.day) {
      await nap(600);
      cur.classList.add('dawn');
      cardEl.classList.add('out');
      cardEl.classList.remove('show');
      await sleep(wasSkipped() ? 150 : 1000);
      cur.classList.remove('on', 'dawn');
      void cur.offsetWidth;
      cur.classList.remove('kd', 'kd-plain');
      cur.removeEventListener('pointerdown', skip);
      cardEl.innerHTML = '';
      cardEl.classList.remove('out', 'quick');
      transitioning = false;
      return;
    }
    await nap(c && c.day ? 900 : c ? 700 : 120);
    cur.classList.add('dawn');
    if (dawnPending && c && c.day) {
      // 새벽빛이 밝아지기 시작하면 곧 숫자가 흐려지고, 새벽 거리가 다 드러나면 아침빛이 번진다
      await nap(400);
      cardEl.classList.add('out');
      cardEl.classList.remove('show');
      await nap(600);
      dawnPending = false;
      const sc = $ui().querySelector('.street-scene');
      if (sc) { void sc.offsetWidth; sc.classList.add('go'); }
      await sleep(wasSkipped() ? 60 : 150);
    } else {
      await nap(c && c.day ? 700 : 500);
      cardEl.classList.add('out');
      cardEl.classList.remove('show');
      await sleep(wasSkipped() ? 150 : 600);
    }
    cur.classList.remove('on', 'dawn');
    void cur.offsetWidth; // 막을 즉시 걷은 상태로 확정한 뒤 kd 를 뗀다 (검은 막이 한 번 더 비치지 않게)
    cur.classList.remove('kd', 'kd-plain');
    // 새벽 거리가 드러난 뒤 — 아침빛으로 밝아지고 신문·도매상 버튼이 나온다
    if (dawnPending) { dawnPending = false; const sc = $ui().querySelector('.street-scene'); if (sc) { void sc.offsetWidth; sc.classList.add('go'); } }
    cur.removeEventListener('pointerdown', skip);
    cardEl.innerHTML = '';
    cardEl.classList.remove('out');
    transitioning = false;
  }
  const roman = n => [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
    .reduce((out, [v, r]) => { while (n >= v) { out += r; n -= v; } return out; }, '');


  // 행동 결과에 맞는 효과음
  function playSfx(act, c, before) {
    const X = WS.Sfx;
    const res = c && c.result !== before ? c.result : null;
    if (act === 'next') return X.play('door_open', 0.5);
    if (act === 'close') return X.play('door_close', 0.5);
    if (act === 'prep' || act === 'back-morning' || act === 'drawer') return X.play('page', 0.5);
    if (act === 'open') return X.play('door_open', 0.55);
    if (act === 'next-day' || act === 'night-in' || act === 'night-sleep' || act === 'night-whisper' || act === 'new' || act === 'continue') return;
    if (act === 'mail-open' || act === 'mail-list' || act === 'mail-compose') return X.play('page', 0.35);
    if (act === 'mail-send') return; // 보낸 뒤 천 스치는 소리는 보낸 자리에서
    if (res === 'sold' || res === 'bought') return X.play(Math.random() < 0.5 ? 'coins' : 'coins2');
    if (res === 'traded') return X.play('blade');
    if (res === 'refused' || res === 'left') return X.play('door_close', 0.4);
    X.play('click', 0.35);
  }

  // ───────── 테이블(카운터) 위 물건 ─────────
  // 여러 가지를 함께 올릴 수 있다 (칼 옆에 활). 사러 온 손님이 있을 때만 올리고,
  // 손님 요청에 맞는 물건은 합쳐서 원하는 수량까지만 — 엉뚱한 물건은 올릴 수는 있지만 손님이 밀어낸다.
  function tableCap(itemId, stash) {
    const c = WS.sys.Day.current();
    if (!c || c.kind !== 'buy' || c.status === 'done' || !c.request) return 0;
    const have = srcCount(itemId, stash);
    if (!lineMatches(c, itemId)) return have;
    const others = tray.filter(l => !sameLine(l, itemId, stash) && lineMatches(c, l.itemId)).reduce((s, l) => s + l.qty, 0);
    return Math.max(0, Math.min(have, c.request.qty - others));
  }

  function addToTray(itemId, amount, stash) {
    const cur = onTableQty(itemId, stash);
    const next = Math.min(tableCap(itemId, stash), cur + amount);
    if (next <= cur) return false;
    const l = tray.find(t => sameLine(t, itemId, stash));
    if (l) l.qty = next; else tray.push(stash ? { itemId, qty: next, stash: true } : { itemId, qty: next });
    return true;
  }

  // itemId 가 없으면 마지막에 올린 물건부터 내린다
  function removeFromTray(amount, itemId, stash) {
    const l = itemId ? tray.find(t => sameLine(t, itemId, stash)) : tray[tray.length - 1];
    if (!l) return false;
    l.qty -= amount;
    if (l.qty <= 0) tray = tray.filter(t => t !== l);
    return true;
  }

  // 화면 좌표 → 장면 속 테이블 위 물건 줄 {itemId, qty, stash?} (Scene 이 그린 배치를 그대로 따른다)
  function tableItemAt(x, y) {
    const r = document.getElementById('scene').getBoundingClientRect();
    return WS.Scene.itemAtTable((x - r.left) / r.width, (y - r.top) / r.height, tray);
  }

  // 화면 좌표가 장면 속 나무 테이블(카운터 윗선 아래) 위인지
  function overTable(x, y) {
    const cv = document.getElementById('scene');
    if (!cv) return false;
    const r = cv.getBoundingClientRect();
    if (x < r.left || x > r.right || y > r.bottom) return false;
    return y >= r.top + r.height * WS.Scene.tableTopFrac();
  }

  function ghostEl() {
    let g = document.getElementById('drag-ghost');
    if (!g) {
      g = document.createElement('img');
      g.id = 'drag-ghost';
      g.alt = '';
      document.body.appendChild(g);
    }
    return g;
  }

  // Papers, Please 책상처럼: 창고 칸 → 테이블로 끌면 하나 올라가고, 테이블 위 물건을 창고 쪽으로 끌어내면 하나 내려온다
  const NOT_TABLE = 'button, .cell, .bubble, .say-wrap, .tut-bg, .tut-note, .speaker, .drawer, .drawer-bg, .magnify-overlay, .hud, .desk-head, .desk.storage, .choices';
  function onPointerDown(e) {
    if (e.button !== 0 || transitioning || booting || S().phase !== 'shop') return;
    const leaf = e.target.closest('.cell.leaf');
    if (leaf && !e.target.closest('button')) {
      const stash = leaf.dataset.stash === '1';
      if (srcCount(leaf.dataset.item, stash) - onTableQty(leaf.dataset.item, stash) <= 0) return;
      drag = { itemId: leaf.dataset.item, stash, fromTable: false, x0: e.clientX, y0: e.clientY, moved: false, held: false };
      startHold(drag);
      e.preventDefault();
      return;
    }
    if (tray.length && !e.target.closest(NOT_TABLE) && overTable(e.clientX, e.clientY)) {
      const hit = tableItemAt(e.clientX, e.clientY);
      if (!hit) return;
      drag = { itemId: hit.itemId, stash: !!hit.stash, fromTable: true, x0: e.clientX, y0: e.clientY, moved: false };
      e.preventDefault();
    }
  }

  // 창고 칸을 꾹 누르고 있으면 잠시 뒤부터 하나씩 연달아 테이블에 올라간다 (점점 빨라진다)
  let holdTimer = null;
  function stopHold() { clearTimeout(holdTimer); holdTimer = null; }
  function startHold(d) {
    stopHold();
    let gap = 170;
    const tick = () => {
      if (drag !== d || d.moved) return stopHold();
      d.held = true;
      if (addToTray(d.itemId, 1, d.stash)) { WS.Sfx.play('blade', 0.25); render(); }
      else return stopHold(); // 더 올릴 수 없으면 멈춘다
      gap = Math.max(70, gap - 20);
      holdTimer = setTimeout(tick, gap);
    };
    holdTimer = setTimeout(tick, 380);
  }

  function onPointerMove(e) {
    if (!drag) {
      const on = S() && S().phase === 'shop' && !e.target.closest(NOT_TABLE) && overCustomer(e.clientX, e.clientY);
      document.body.classList.toggle('over-customer', !!on);
      return;
    }
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    drag.moved = true;
    stopHold();
    document.body.classList.add('dragging');
    const g = ghostEl();
    if (g.dataset.item !== drag.itemId) { g.src = WS.Sprites.itemIcon(drag.itemId); g.dataset.item = drag.itemId; }
    g.hidden = false;
    g.style.left = e.clientX + 'px';
    g.style.top = e.clientY + 'px';
    const on = overTable(e.clientX, e.clientY);
    g.classList.toggle('ok', drag.fromTable ? !on : on && tableCap(drag.itemId, drag.stash) > onTableQty(drag.itemId, drag.stash));
  }

  function onPointerUp(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    stopHold();
    document.body.classList.remove('dragging');
    const g = document.getElementById('drag-ghost');
    if (g) g.hidden = true;
    let changed = false;
    if (!d.moved) {
      if (!d.fromTable && !d.held) changed = addToTray(d.itemId, 1, d.stash); // 칸을 톡 누르면 하나 올린다 (꾹 눌렀으면 이미 올라갔다)
    } else {
      suppressClickUntil = Date.now() + 350; // 놓은 자리 밑의 버튼이 눌린 걸로 오인되지 않게
      const on = overTable(e.clientX, e.clientY);
      if (!d.fromTable && on) changed = addToTray(d.itemId, 1, d.stash);
      if (d.fromTable && !on) changed = removeFromTray(1, d.itemId, d.stash);
    }
    if (changed) WS.Sfx.play(d.fromTable ? 'cloth' : 'blade', 0.3);
    render();
  }

  // 게임 화면 안에서는 브라우저 우클릭 메뉴(복사/붙여넣기)를 띄우지 않는다.
  // 테이블이나, 테이블에 올라간 물건의 창고 칸을 우클릭하면 하나 내린다.
  function onContextMenu(e) {
    if (!e.target.closest('#stage')) return;
    e.preventDefault();
    if (S().phase !== 'shop' || !tray.length) return;
    const leaf = e.target.closest('.cell.leaf');
    let id = null, stash = false;
    if (leaf && onTableQty(leaf.dataset.item, leaf.dataset.stash === '1')) { id = leaf.dataset.item; stash = leaf.dataset.stash === '1'; }
    else if (overTable(e.clientX, e.clientY)) {
      const hit = tableItemAt(e.clientX, e.clientY) || tray[tray.length - 1];
      id = hit.itemId; stash = !!hit.stash;
    }
    if (id && removeFromTray(1, id, stash)) {
      WS.Sfx.play('cloth', 0.3);
      render();
    }
  }

  // ───────── 거절 길게 누르기 (0.5초) ─────────
  const HOLD_MS = 500;
  let hold = null, holdPass = false, holdDoneAt = 0, holdToastT = 0;
  const refBtn = () => document.querySelector('.act-grid:not(.say-grid) .pbtn[data-act="refuse"]');
  function holdToast(msg) {
    const b = refBtn();
    let el = document.getElementById('hold-toast');
    if (!el) { el = document.createElement('div'); el.id = 'hold-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg;
    const r = b ? b.getBoundingClientRect() : { left: innerWidth / 2, width: 0, top: innerHeight - 80 };
    el.style.left = Math.round(Math.min(innerWidth - 12, Math.max(12, r.left + r.width / 2))) + 'px';
    el.style.top = Math.round(r.top - 10) + 'px';
    el.classList.add('on');
    clearTimeout(holdToastT);
    holdToastT = setTimeout(() => el.classList.remove('on'), 800);
  }
  function holdReset() {
    document.querySelectorAll('.hold-btn').forEach(b => { b.classList.remove('holding'); b.style.setProperty('--hold', '0%'); });
  }
  function holdStart(src) {
    if (hold || barLocked() || transitioning || booting || menu || S().phase !== 'shop') return;
    const b = refBtn();
    if (!b || b.disabled) return;
    hold = { t0: Date.now(), src, tm: setInterval(holdTick, 25) };
    b.classList.add('holding');
    holdTick();
  }
  function holdTick() {
    if (!hold) return;
    const p = Math.min(1, (Date.now() - hold.t0) / HOLD_MS);
    const b = refBtn();
    if (!b) { holdCancel(false); return; }
    b.classList.add('holding');
    b.style.setProperty('--hold', (p * 100).toFixed(1) + '%');
    if (p >= 1) {
      clearInterval(hold.tm); hold = null;
      holdDoneAt = Date.now(); holdPass = true;
      b.click();
      holdPass = false;
      holdReset();
    }
  }
  function holdCancel(hint) {
    if (!hold) return;
    clearInterval(hold.tm); hold = null;
    holdReset();
    if (hint) holdToast('꾹 눌러 거절 (0.5초)');
  }
  function initHold() {
    document.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !e.target.closest) return;
      const b = e.target.closest('.hold-btn');
      if (b && !b.disabled) holdStart('pointer');
    });
    const up = e => {
      if (!hold || hold.src !== 'pointer') return;
      const on = e.type === 'pointerup' && e.target.closest && e.target.closest('.hold-btn');
      holdCancel(!!on);
    };
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    document.addEventListener('pointermove', e => {
      if (!hold || hold.src !== 'pointer') return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || !t.closest('.hold-btn')) holdCancel(false);
    });
    document.addEventListener('keydown', e => {
      if ((e.key !== ' ' && e.key !== 'Enter') || !e.target.closest || !e.target.closest('.hold-btn')) return;
      e.preventDefault();
      if (!e.repeat) holdStart('key');
    });
    document.addEventListener('keyup', e => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (hold && hold.src === 'key') { e.preventDefault(); holdCancel(true); } // 다시 그려져 포커스를 잃어도 손을 떼면 취소
      else if (e.target.closest && e.target.closest('.hold-btn')) e.preventDefault();
    });
    document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.hold-btn')) e.preventDefault(); });
    window.addEventListener('blur', () => holdCancel(false));
  }

  function onClick(e) {
    if (Date.now() < suppressClickUntil) return; // 방금 드래그가 끝난 자리 — 클릭 무시
    if (e.target.closest && e.target.closest('#menu')) {
      const mb = e.target.closest('[data-act]');
      if (mb && !mb.disabled) menuAct(mb);
      else if (e.target.id === 'menu') closeMenu();
      return;
    }
    if (S().phase === 'shop' && e.target.closest('.action-bar')) {
      const cur = WS.sys.Day.current();
      const st = cur && sayState(cur);
      if (st && st.left > 0) { advanceSay(); render(); return; } // 말하는 중이면 넘기기만
    }
    const b = e.target.closest('[data-act]');
    if (!b && S().phase === 'shop' && !e.target.closest(NOT_TABLE) && overCustomer(e.clientX, e.clientY)) {
      const cur = WS.sys.Day.current();
      if (cur) { replaySay(cur); render(); }
      return;
    }
    if (!b || b.disabled) return;
    const D = WS.sys.Day;
    let act = b.dataset.act;
    if (act.startsWith('menu-')) { menuAct(b); return; }
    // 손님 버튼은 나타난 뒤 0.3초 동안 눌림 무시 / 거절은 꾹 눌러야만 실행 (holdRefuse)
    if (b.closest('.act-grid:not(.say-grid)') && barLocked()) return;
    if (act === 'refuse') {
      if (holdPass) holdPass = false;
      else return; // 짧은 클릭 — 안내는 포인터/키 쪽에서 이미 띄웠다
    }
    // 아침에 문 열기: 구매하지 않은 주문은 취소하고, 장부를 덮은 뒤에 영업 시작 전환
    if (act === 'open' && (S().phase === 'prep' || S().phase === 'morning')) {
      if (bookClosing || transitioning) return;
      if (cartOn()) S().cart = {};
      buyNote = null;
      if (!b.dataset.closed && $ui().querySelector('.book') && !reduceMotion()) {
        bookClose(() => { b.dataset.closed = '1'; if (b.isConnected) b.click(); });
        return;
      }
    }
    // 잠자리에 들려는데 누군가 문을 두드린다 — 다음 날로 가기 전에 밤 장면
    if (act === 'next-day' && S().phase === 'closing' && D.nightDue()) act = 'night-in';
    if (act === 'night-sleep' && S().phase !== 'night') return;
    const id = b.dataset.id;
    const T = WS.sys.Trade;
    const c = D.current();
    const before = c && c.result;
    if (act !== 'choice') confirmChoice = null;
    // 장면이 크게 바뀌는 행동은 검은 막으로 덮고 넘어간다 (중간 상태가 보이지 않게)
    const toMorning = () => { paperNote = ''; crowTutStep = 0; D.nextDay(); resetDealState(); morningSub = null; turnDir = ''; mail.flash = ''; dawnPending = true; };
    const morningCard = () => ({ day: S().day });
    const curtained = {
      new: [() => { WS.Scene.reset(); WS.Game.newGame(); resetDealState(); morningSub = null; turnDir = ''; mail.flash = ''; visited = {}; nav = { place: null, sub: null }; dawnPending = true; },
        () => ({ day: 1 }), 0, 'kd'],
      continue: [() => { WS.Scene.reset(); if (!WS.Game.continueGame()) WS.Game.newGame(); resetDealState(); morningSub = null; turnDir = ''; mail.flash = ''; dawnPending = S().phase === 'morning'; },
        () => ({ day: S().day }), 0, 'kd'],
      open: [() => { D.openShop(); resetDealState(); visited = {}; nav = { place: null, sub: null }; },
        () => ({ sub: '영업 시작' }), 0, 'kd-plain'],
      'next-day': [toMorning, morningCard, 0, 'kd'],
      'night-in': [() => { if (!D.startNight()) toMorning(); }, () => (S().phase === 'night' ? null : morningCard()), 0, 'kd'],
      'night-sleep': [toMorning, morningCard, 0, 'kd'],
      // 문 두드림 뒤 — 소라껍데기의 속삭임 (DayManager.startWhisper)
      'night-whisper': [() => { if (!D.startWhisper()) toMorning(); }, () => (S().phase === 'night' ? null : morningCard()), 0, 'kd'],
      close: [() => { D.closeShop(); drawer = null; magnifyOpen = false; sealOpen = false; resetDealState(); }, null],
    };
    // 서랍·확대경·인장 창은 곧바로 없애지 않고 밀려나가는 동안 잠깐 둔다
    if (/^(drawer-close|magnify-close|seal-close)$/.test(act) && !reduceMotion() && !b.dataset.closing) {
      const els = $ui().querySelectorAll('.drawer, .drawer-bg, .magnify-overlay');
      if (els.length) {
        els.forEach(el => el.classList.add('out'));
        document.querySelectorAll('[data-act$="-close"]').forEach(el => { el.dataset.closing = '1'; });
        WS.Sfx.play('page', 0.35);
        setTimeout(() => { if (act === 'drawer-close') drawer = null; else if (act === 'magnify-close') magnifyOpen = false; else sealOpen = false; render(); }, 190);
        return;
      }
    }
    if (curtained[act]) {
      if (transitioning) return;
      playSfx(act, c, before);
      const [fn, card, hold, mode] = curtained[act];
      const ts = (act === 'new' || act === 'continue') && document.querySelector('.title-scene');
      if (ts && !reduceMotion()) {
        if (ts.classList.contains('leaving')) return;
        ts.classList.add('leaving'); // 밤거리로 걸어 들어가듯 다가서고 나서 막이 닫힌다
        setTimeout(() => transition(fn, card, hold, mode), 560);
      } else transition(fn, card, hold, mode);
      return;
    }
    switch (act) {
      case 'prep': turnDir = 'from-right'; D.toPrep(); break;
      case 'back-morning': S().phase = 'morning'; morningSub = 'news'; break;
      case 'page-prev': turnPage(-1); render(); return;
      case 'page-next': turnPage(1); render(); return;
      case 'cart': D.cartAdjust(id, Number(b.dataset.n)); buyNote = null; break;
      case 'buy-cart': buyCart(); break;
      case 'repay-guild': D.repayGuild(Number(b.dataset.n)); break;
      case 'next': D.nextCustomer(); { const cc = D.current(); if (cc && cc.angry) WS.Sfx.play('door_close', 0.25); } mobileView = 'counter'; /* 폰: 새 손님이 오면 응대 책상부터 보여 준다 */ magnifyOpen = false; sealOpen = false; resetDealState(); break;
      case 'refuse': T.refuse(c); resetDealState(); break;
      case 'confirm': {
        if (!c) break;
        if (c.kind === 'sell') T.buyFrom(c);
        else if (c.kind === 'trade') T.exchange(c);
        else if (confirmState(c).ok) {
          // 테이블에 올린 것 중 손님 요청에 맞는 것만 받아 가고, 엉뚱한 물건은 밀어낸다
          const d = tableDeal(c);
          const lines = d.match.map(l => ({ item: l.itemId, qty: l.qty, price: linePrice(c, l), ...(l.stash ? { stash: true } : {}) }))
            .concat(d.extra.map(l => ({ item: l.itemId, qty: l.qty, price: extraPrice(c, l), extra: true })))
            .concat(d.gifts.map(l => ({ item: l.itemId, qty: l.qty, price: 0, gift: true }))); // 궁핍한 손님에게 얹는 덤
          c.request = { ...c.request, item: lines[0].item, offer: d.got }; // 장면의 건네주기 연출이 쓰는 대표 물건·값
          if (d.extra.length) c.dialog.push({ who: 'c', text: acceptsAny(c).note || '이건 당장 필요하지 않소. 값은 제대로 못 쳐주오.' });
          T.sellLines(c, lines, d.other.map(l => item(l.itemId).name));
        }
        resetDealState();
        break;
      }
      case 'forgive': {
        // 궁핍한 손님에게 요구한 물건을 값 없이 그냥 준다 (덤이 올라 있으면 함께)
        if (!c || !T.isPoor(c) || c.kind !== 'buy') break;
        const d = tableDeal(c);
        const lines = d.match.filter(l => !l.stash).map(l => ({ item: l.itemId, qty: l.qty }));
        if (!lines.length) break;
        c.request = { ...c.request, item: lines[0].item, offer: 0 };
        T.forgive(c, lines, d.gifts.map(l => ({ item: l.itemId, qty: l.qty })));
        resetDealState();
        break;
      }
      case 'choice': {
        // 되돌릴 수 없는 선택은 두 번 눌러야 한다 — 첫 번째는 "정말?"로 바뀔 뿐
        const cc = c && T.availableChoices(c).find(x => x.id === id);
        if (cc && cc.confirm && confirmChoice !== `${c.uid}:${id}`) { confirmChoice = `${c.uid}:${id}`; break; }
        confirmChoice = null;
        T.choose(c, id);
        // 아직 한 번도 펼쳐 보지 않은 인상서가 있으면(방금 전령에게 받은 것) 바로 펼친다
        const shown = (S().progress.postersShown = S().progress.postersShown || {});
        const fresh = WS.sys.Letters ? WS.sys.Letters.posters().find(p => !shown[p.letterId]) : null;
        if (fresh) { shown[fresh.letterId] = true; nav = { place: 'docs', sub: 'poster:' + fresh.letterId }; docsHint = true; }
        break;
      }
      case 'night-choice': nightChoice(id); return;
      case 'ending-choice': endingChoiceShown[id] = !endingChoiceShown[id]; break;
      case 'drawer': drawer = id; break;
      case 'drawer-close': drawer = null; break;
      case 'magnify': magnifyOpen = true; break;
      case 'magnify-close': magnifyOpen = false; break;
      case 'affil-ask': askAffil(c); break;
      case 'seal-ref':
        sealRef = id;
        if (swapSealRef()) { playSfx(act, c, before); return; } // 원본 칸만 바꿔 끼운다 — 전체를 다시 그리지 않는다
        break;
      case 'seal-close': sealOpen = false; break;
      case 'magnify-pass': resolveDocCheck(c, 'pass'); break;
      case 'magnify-accuse': resolveDocCheck(c, 'accuse'); break;
      case 'to-title': { const rp = S().replay; WS.Game.toTitle(); collOpen = !!rp; break; }
      case 'coll-open': collOpen = true; collSel = null; break;
      case 'coll-sel': collSel = id; if (!collWide() && WS.sys.EndingLog.has(id)) { replayEnding(id); return; } break;
      case 'coll-back': collOpen = false; break;
      case 'coll-view': replayEnding(id); return;
      case 'mute':
        WS.Sfx.toggle();
        if (S().phase === 'title') { b.innerHTML = uiIco(WS.Sfx.muted ? 'sound_off' : 'sound_on'); return; } // 타이틀은 다시 그리지 않는다(등장 효과가 되풀이됨)
        break;
      case 'open-place': visited[id] = true; if (id === 'docs') docsHint = false; nav = { place: id, sub: null }; if (id === 'crow') mail = { sel: null, compose: null, params: {}, flash: '' }; break;
      case 'nav-home': nav = { place: null, sub: null }; break;
      case 'crow-guide-ok': case 'crow-guide-write':
        (S().progress.tutorialsSeen = S().progress.tutorialsSeen || {}).crow_guide = true;
        if (act === 'crow-guide-write') mail = { sel: null, compose: 'pick', params: {}, flash: '' };
        break;
      case 'poster': (S().progress.postersShown = S().progress.postersShown || {})[id] = true; nav = { place: 'docs', sub: 'poster:' + id }; if (c && c.status !== 'done') c.sawPoster = true; break;
      case 'tut-ok': WS.sys.Progress.markTutorialSeen(id); break;
      case 'tut-step': crowTutStep = Math.max(0, crowTutStep + Number(b.dataset.n)); break;
      case 'tut-sub': case 'tut-skip': {
        (S().progress.tutorialsSeen = S().progress.tutorialsSeen || {}).crow_paper = true;
        if (act === 'tut-sub') {
          const r = WS.sys.Letters.send('paper_sub');
          paperNote = r.ok ? '까마귀가 신문 구독을 신청하러 날아갔다. 내일 아침부터 대륙 일보가 온다 (하루 10G).' : r.msg;
          if (r.ok) { crowFly('out'); WS.Sfx.play('cloth', 0.45); }
        } else paperNote = '신문은 구독하지 않았다. 까마귀 서신에서 언제든 신청할 수 있다.';
        crowTutStep = 0;
        WS.sys.Save.autosave && WS.sys.Save.autosave();
        break;
      }
      case 'nav-back':
        // 막 받은 인상서를 닫으면 서랍에 넣고 창고로 — 서류함이 빛나 어디 넣었는지 알려 준다
        if (docsHint && nav.sub && nav.sub.startsWith('poster:')) nav = { place: null, sub: null };
        else nav = nav.sub ? { place: nav.place, sub: null } : { place: null, sub: null };
        break;
      case 'mail-open': {
        const x = WS.sys.Letters.inbox().find(l => String(l.id) === id);
        if (x) { mail = { sel: id, compose: null, params: {}, flash: '' }; WS.sys.Letters.markRead(x.id); mailAnim = 'open'; }
        break;
      }
      case 'mail-list': mail = { sel: null, compose: null, params: {}, flash: '' }; mailAnim = 'list'; break;
      case 'mail-compose': mail = { sel: mail.sel, compose: 'pick', params: {}, flash: '' }; mailAnim = 'open'; break;
      case 'mail-tpl': mail.compose = id; mail.params = {}; mail.flash = ''; break;
      case 'mail-param': {
        const t = WS.sys.Letters.templates().find(x => x.type === mail.compose);
        const pp = t && t.params.find(x => x.key === id);
        const o = pp && pp.options.find(x => String(x.value) === b.dataset.n);
        if (o) mail.params[id] = o.value;
        break;
      }
      case 'mail-send': {
        const r = WS.sys.Letters.send(mail.compose, mail.params);
        mail.flash = r.msg;
        if (r.ok) { mail.compose = null; mail.params = {}; crowFly('out'); WS.Sfx.play('cloth', 0.45); }
        break;
      }
      case 'mail-act': {
        const x = WS.sys.Letters.inbox().find(l => String(l.id) === id);
        if (x) mail.flash = WS.sys.Letters.act(x.id, b.dataset.n).msg;
        break;
      }
      case 'promise': WS.sys.Letters.promiseReturn(c); resetDealState(); break;
      case 'appease': WS.sys.Letters.angerGift(c); break;
      case 'put': addToTray(id, Number(b.dataset.n), b.dataset.stash === '1'); break;
      case 'say-skip': advanceSay(); break;
      case 'say-replay': replaySay(c); break;
      case 'toggle-desk': mobileView = mobileView === 'counter' ? 'storage' : 'counter'; break;
    }
    playSfx(act, c, before);
    render();
  }

  // 맞춤 툴팁 — 브라우저 기본 title 말풍선 대신 양피지 쪽지. (title 은 첫 호버 때 data-tip 으로 옮겨 접근성 이름은 aria-label/글자가 맡는다)
  function initTip() {
    const tip = document.createElement('div');
    tip.id = 'tip'; tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
    let cur = null;
    const hide = () => { cur = null; tip.classList.remove('on'); };
    document.addEventListener('pointerover', e => {
      if (e.pointerType === 'touch') return;
      const el = e.target.closest && e.target.closest('[title],[data-tip]');
      if (!el || !document.getElementById('stage').contains(el)) { if (cur) hide(); return; }
      if (el.hasAttribute('title')) { el.dataset.tip = el.getAttribute('title'); el.removeAttribute('title'); }
      const t = el.dataset.tip;
      if (!t) return;
      cur = el;
      tip.textContent = t;
      const r = el.getBoundingClientRect();
      tip.classList.add('on');
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = `${Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2))}px`;
      tip.style.top = `${r.top - h - 8 < 6 ? r.bottom + 8 : r.top - h - 8}px`;
    });
    document.addEventListener('pointerdown', hide);
    document.addEventListener('scroll', hide, true);
  }

  // 타이틀 시차 — 포인터(또는 기울기)를 따라 층마다 다르게 살짝 밀린다
  function initParallax() {
    let raf = 0, nx = 0, ny = 0;
    const apply = () => {
      raf = 0;
      const ts = document.querySelector('.title-scene');
      if (ts) { ts.style.setProperty('--mx', nx.toFixed(3)); ts.style.setProperty('--my', ny.toFixed(3)); }
    };
    document.addEventListener('pointermove', e => {
      if (reduceMotion() || (S() && S().phase !== 'title' && !booting)) return;
      nx = (e.clientX / innerWidth - .5) * 2; ny = (e.clientY / innerHeight - .5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  // 까마귀가 화면을 가로지른다 — 편지를 보낼 때(out) / 아침 편지가 도착할 때(in)
  function crowFly(dir) {
    if (reduceMotion()) return;
    const st = document.getElementById('stage');
    if (!st) return;
    const el = document.createElement('i');
    el.className = `crow-fly ${dir}`;
    st.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  function init() {
    WS.Scene.mount(document.getElementById('scene'));
    // 장면이 먼저 크기를 다시 잡은 뒤 확대경 누름 자리를 따라 옮긴다
    // (장면 높이 H 가 바뀌면 확대경 자리도 바뀐다 — 순서가 어긋나지 않게 장면 크기부터 다시 잡는다. 같은 크기면 Scene.resize 는 그냥 돌아온다)
    const refit = () => { WS.Scene.resize(); placeAffilHit(); };
    window.addEventListener('resize', refit);
    window.addEventListener('resize', () => { if ($ui().querySelector('.book')) render(); }); // 쪽 높이가 바뀌면 줄을 다시 나눈다
    if (window.ResizeObserver) new ResizeObserver(refit).observe(document.getElementById('scene'));
    initTip();
    initParallax();
    document.addEventListener('click', onClick);
    initHold();
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('keydown', e => {
      const ph = S() && S().phase;
      if (e.key === 'Escape' && !e.repeat) {
        e.preventDefault();
        if (collOpen && ph !== 'loading') { collOpen = false; render(); return; }
        if (menu) { if (menu.page !== 'main' && !(ph === 'title' && menu.page === 'load')) setMenu('main'); else closeMenu(); return; }
        if (!ph || ph === 'title' || ph === 'loading' || ph === 'ending' || transitioning) return;
        setMenu('main');
        return;
      }
      if (menu) return;
      if ((ph === 'morning' || ph === 'prep') && !transitioning && !e.repeat) {
        const dir = ['>', '.', 'ArrowRight'].includes(e.key) ? 1 : ['<', ',', 'ArrowLeft'].includes(e.key) ? -1 : 0;
        if (dir) {
          e.preventDefault();
          const r = turnPage(dir);
          if (r === 'open') document.querySelector('[data-act="open"]')?.click();
          else if (r) render();
          return;
        }
      }
      // 관리자 패널: 한 키가 아니라 비밀 문자열을 이어서 쳐야 열린다 (2초 안에)
      if (e.key.length === 1) {
        const now = performance.now();
        if (now - adminAt > 2000) adminBuf = '';
        adminAt = now;
        adminBuf = (adminBuf + e.key.toLowerCase()).slice(-ADMIN_CODE.length);
        if (adminBuf === ADMIN_CODE) {
          adminBuf = '';
          const el = document.getElementById('debug');
          el.hidden = !el.hidden;
          renderDebug();
        }
      }
    });
    render();
  }

  // Scene.js가 카운터에 그릴 물건을 정할 때 참고 — 플레이어가 제출대에 실제로 내려놓은 것만
  const trayLines = () => tray;
  const trayOffer = () => { const c = WS.sys.Day.current(); return c && c.kind === 'buy' && c.request ? tableDeal(c).got : 0; };

  // 개발 패널(dev.html)이 장면을 바꿀 때 — 테이블·서랍·쪽 넘김 상태를 비운다
  const devReset = () => { resetDealState(); drawer = null; magnifyOpen = false; sealOpen = false; nav = { place: null, sub: null }; morningSub = null; };

  // ───────── Esc 메뉴: 계속하기 · 저장하기 · 불러오기 · 소리 · 처음으로 ─────────
  let menu = null; // { page: 'main'|'save'|'load', arm: 한 번 더 눌러야 하는 버튼, flash: 알림 한 줄 }
  const PH_LABEL = { morning: '아침', prep: '도매상', shop: '영업 중', closing: '영업 종료', night: '밤' };
  const canSave = () => { const ph = S() && S().phase; return !!ph && !['title', 'loading', 'ending'].includes(ph); };
  const slotLine = v => (v ? `DAY ${v.day} · ${v.gold}G${PH_LABEL[v.phase] ? ' · ' + PH_LABEL[v.phase] : ''}` : '비어 있음');
  const slotNums = () => Array.from({ length: WS.sys.Save.SLOTS || 3 }, (_, i) => i + 1);
  function menuHtml() {
    const Sv = WS.sys.Save;
    const inTitle = S().phase === 'title';
    const btn = (act, label, sub = '', attrs = '', cls = '') => `<button class="pbtn em-btn ${cls}" data-act="${act}" ${attrs}><span>${U.esc(label)}</span>${sub ? `<small>${U.esc(sub)}</small>` : ''}</button>`;
    let head, list;
    if (menu.page === 'save') {
      head = '저장하기';
      list = slotNums().map(n => {
        const v = Sv.slotInfo(n);
        const armed = menu.arm === 'save' + n;
        return btn('menu-save', armed ? `${n}번 칸 덮어쓰기 — 한 번 더` : `${n}번 칸`, slotLine(v), `data-n="${n}"`, armed ? 'danger' : '');
      }).join('');
    } else if (menu.page === 'load') {
      head = '불러오기';
      const auto = Sv.load();
      const row = (n, label, v) => {
        const armed = menu.arm === 'load' + n;
        return btn('menu-load', armed ? `${label} 불러오기 — 한 번 더` : label, slotLine(v), `data-n="${n}" ${v ? '' : 'disabled'}`, armed ? 'danger' : '');
      };
      list = row('auto', '자동 저장', auto && auto.day ? auto : null) + slotNums().map(n => row(n, `${n}번 칸`, Sv.slotInfo(n))).join('');
    } else if (menu.page === 'volume') {
      head = '음량';
      const pct = Math.round(WS.Sfx.volume * 100);
      list = `<div class="em-vol"><span class="em-vol-n">${WS.Sfx.muted ? '꺼짐' : pct + '%'}</span>
        <input type="range" class="em-range" min="0" max="100" step="5" value="${pct}" aria-label="음량" style="--p:${pct}%">
        <div class="em-vol-scale"><small>0</small><small>50</small><small>100</small></div></div>`
        + btn('menu-mute', WS.Sfx.muted ? '소리 켜기' : '소리 끄기');
    } else {
      head = '메뉴';
      const armed = menu.arm === 'title';
      list = btn('menu-close', '계속하기', '', '', 'primary')
        + btn('menu-page', '저장하기', '', `data-page="save" ${canSave() ? '' : 'disabled'}`)
        + btn('menu-page', '불러오기', '', 'data-page="load"')
        + btn('menu-page', '음량', WS.Sfx.muted ? '꺼짐' : `${Math.round(WS.Sfx.volume * 100)}%`, 'data-page="volume"')
        + btn('menu-title', armed ? '처음으로 — 한 번 더' : '처음으로', armed ? '저장하지 않은 진행은 사라집니다' : '', '', armed ? 'danger' : '');
    }
    const back = menu.page === 'main' || (inTitle && menu.page === 'load') ? btn('menu-close', '닫기', '', '', 'ghost') : btn('menu-page', '← 뒤로', '', 'data-page="main"', 'ghost');
    return `<div class="em-box" role="dialog" aria-label="${head}"><h2>${head}</h2>
      ${menu.flash ? `<p class="em-flash">${U.esc(menu.flash)}</p>` : ''}
      <div class="em-list">${list}</div>${back}<p class="em-hint">Esc 로 닫기</p></div>`;
  }
  document.addEventListener('input', e => {
    const r = e.target && e.target.classList && e.target.classList.contains('em-range') ? e.target : null;
    if (!r) return;
    WS.Sfx.setVolume(+r.value / 100);
    if (WS.Sfx.muted && +r.value > 0) WS.Sfx.toggle();
    r.style.setProperty('--p', r.value + '%');
    const n = document.querySelector('#menu .em-vol-n'); if (n) n.textContent = r.value + '%';
    clearTimeout(r._t); r._t = setTimeout(() => WS.Sfx.play('coins', 0.6), 120); // 조절하는 동안 들려 주는 확인음
  });
  function renderMenu() {
    let el = document.getElementById('menu');
    if (!menu) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'menu'; document.getElementById('stage').appendChild(el); }
    el.innerHTML = menuHtml();
  }
  const setMenu = (page, flash = '') => { menu = { page, arm: null, flash }; renderMenu(); };
  const closeMenu = () => { menu = null; renderMenu(); };
  function loadGame(data) {
    const ts = document.querySelector('.title-scene');
    if (ts) ts.classList.add('leaving');
    transition(() => {
      WS.Scene.reset();
      WS.Game.continueGame(data);
      resetDealState();
      drawer = null; magnifyOpen = false; sealOpen = false; nav = { place: null, sub: null }; visited = {};
      morningSub = null; turnDir = ''; mail.flash = '';
      dawnPending = S().phase === 'morning';
      WS.sys.Save.autosave();
    }, () => ({ day: S().day }), 0, 'kd');
  }
  function menuAct(b) {
    const a = b.dataset.act, n = b.dataset.n;
    if (a === 'menu-page') { if (b.dataset.page === 'save' && !canSave()) return; setMenu(b.dataset.page); return; }
    if (!menu) return;
    const arm = key => { if (menu.arm === key) return true; menu.arm = key; renderMenu(); return false; };
    if (a === 'menu-close') closeMenu();
    else if (a === 'menu-mute') {
      WS.Sfx.toggle();
      renderMenu();
      if (S().phase === 'title') { const m = document.querySelector('.title-mute'); if (m) m.innerHTML = uiIco(WS.Sfx.muted ? 'sound_off' : 'sound_on'); } else render();
    } else if (a === 'menu-save') {
      if (!canSave()) return;
      if (WS.sys.Save.slotInfo(+n) && !arm('save' + n)) return;
      const ok = WS.sys.Save.saveSlot(+n);
      WS.Sfx.play('page', 0.4);
      setMenu('main', ok ? `${n}번 칸에 저장했습니다` : '저장하지 못했습니다 (브라우저 저장소가 막혀 있음)');
    } else if (a === 'menu-load') {
      if (transitioning) return;
      if (S().phase !== 'title' && !arm('load' + n)) return;
      const data = n === 'auto' ? WS.sys.Save.load() : WS.sys.Save.loadSlot(+n);
      if (!data) return;
      closeMenu();
      loadGame(data);
    } else if (a === 'menu-title') {
      if (!arm('title')) return;
      closeMenu();
      WS.Scene.reset();
      resetDealState();
      drawer = null; magnifyOpen = false; sealOpen = false; nav = { place: null, sub: null }; morningSub = null;
      WS.Game.toTitle();
      render();
    }
  }

  // 개발 패널: 상태는 그대로 두고 날짜 전환만 재생
  const previewDawn = c => transition(() => {}, c, 0, 'kd');
  const openCollection = () => { collOpen = true; collSel = null; render(); };
  return { init, render, boot, openCollection, trayLines, trayOffer, devReset, previewDawn };
})();

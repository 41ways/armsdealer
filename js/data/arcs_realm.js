// 결말 줄기 사이를 채우는 이야기 손님·기사 (realm: 궁정 · 레온 · 왕국 · 고블린 · 박쥐 · 마왕군 · 마르가)
// 결말에 꼭 필요한 손님만 오면 세계가 멈춰 있는 것처럼 보인다 — 필요한 장면 사이에 "이 이야기가 흘러가고 있구나" 싶은
// 손님 몇과 기사 몇 줄을 끼운다. 결말 조건(플래그·판매 수)은 건드리지 않는다. 효과는 작은 세계 변수 이동 · rl_ 플래그 · 기사뿐.
// id 는 모두 rl_ 로 시작한다. 날짜 조건은 쓰지 않고, 줄기 플래그 · 손님 본 기록 · since(플래그가 켜진 지 며칠)로 잇는다.
// customers.js · events.js · news.js · remarks.js 뒤에 읽혀야 한다 (index.html 데이터 칸).
//
// ① 궁정 (iron_king · candle_queen · opportunist)
//    두건 쓴 청년에게 팔았다 → 이틀 뒤 그 "사냥 동무"가 활을 더 사러 온다 (rl_prince_friend)
//    베일 쓴 수녀에게 팔았다 → 이틀 뒤 구호소 수녀가 물약을 더 청한다 (rl_almshouse_sister)
//    신분 숨긴 자에게 판 지 사흘 → 궁정 서기가 "무엇을 팔았고 어디로 간다 했소?" (rl_court_clerk — 사실대로/모른다)
//    공위 기간(대관식은 30일째 밤): 알드릭 우세면 왕자 친위대 징발관(rl_aldric_levy) / 세레나 우세면 공주의 구호소 구호관(rl_serena_almoner) / 양쪽에 팔았다면 입 싼 궁정 시종(rl_court_whisperer)
// ② 레온 (knight_commander)
//    8일의 칼을 받은 뒤 → 레온이 보낸 신병(rl_leon_recruit)
//    분대 방패 무렵 → 척후(rl_west_scout)가 매복 자리를 보러 간다 → 전투 뒤 돌아오거나(rl_scout_back) 실종돼 경비대가 묻는다(rl_scout_missing)
//    납품 계약 뒤 → 기사단 서기가 명부 현판에 가게 이름을 새길지 묻는다 (rl_seventh_clerk)
// ③ 왕국 (kingdom_armory)
//    왕실 인증·조달 뒤 → 검수관(rl_royal_assessor) / 고블린 전쟁 중 → 동원 하사관(rl_muster_sergeant) / 왕국 승리 → 제대병(rl_war_veteran)
// ④ 고블린 (goblin_nation)
//    고블린이 싸움에서 이기면 → 정찰대(rl_goblin_scouts) / 서부 숲 장악 → 쫓겨난 개척민(rl_west_settler)
//    부족 통합 → 족장의 글쟁이가 "인간 친구 명부"(rl_goblin_scribe) / 전쟁 중 → 약 사러 온 고블린(rl_goblin_medic)
// ⑤ 박쥐 (double_dealer) — 양쪽에 꽤 팔았으면 같은 각인을 본 용병이 온다 (rl_two_flags) + 기사
// ⑥ 마왕군 (demonlord_dominion)
//    검은 깃발에 칼을 댔다 → 북쪽 피난민(rl_north_refugee) → 순찰대 실종 조사(rl_patrol_inquiry)
//    동맹 뒤 → 검은 군단 징발병(rl_black_forager) / 마왕군 승리 → 점령지 세리(rl_black_tax)
// ⑦ 마르가 (forest_benefactor)
//    마르가에게 판 이튿날 → 경비병이 "어느 길로 갔소?" (rl_marga_trail — 둘러댄다/사실대로/못 봤다)
//    감찰관 앞에서 지켜 줬다 → 숲에서 약 사러 온 고블린이 안부를 전한다 (rl_forest_word)
(() => {
  const C = WS.data.customers;
  const E = WS.data.events;

  // 신분 숨긴 자(두건 쓴 청년 · 베일 쓴 수녀)에게 판 지 n일
  const secretSince = n => ({ any: [
    { all: [{ flag: 'armed_prince_secret' }, { since: { flag: 'armed_prince_secret', days: n } }] },
    { all: [{ flag: 'armed_princess_secret' }, { since: { flag: 'armed_princess_secret', days: n } }] },
  ] });
  // v0.9.5: 대관식은 30일째 밤 (events.js coronation) — 왕이 죽거나 양위가 정해진 뒤의 공위 기간(interregnum)에도 궁정은 열려 있다
  // v0.9.6: 계승 다툼은 국왕 서거 뒤 공위 기간(interregnum)에만 — 그 전은 복선
  const courtOpen = [{ flag: 'interregnum' }, { noFlag: 'crowned' }, { noFlag: 'king_aldric' }, { noFlag: 'queen_serena' }, { noFlag: 'closed_court' }];
  const leonAlive = [{ noFlag: 'leon_fell' }];
  // 전쟁의 두 편에 꽤 판 가게 (박쥐의 길목 — 결말 조건보다 한참 낮은 문턱)
  const batGoblin = { all: [{ sold: { faction: 'goblin', tag: 'weapon', min: 10 } }, { sold: { faction: 'kingdom', tag: 'weapon', min: 10 } }, { any: [{ flag: 'war' }, { flag: 'goblin_won_skirmish' }, { eventFired: 'border_skirmish' }] }] };
  const batDemon = { all: [{ sold: { faction: 'demonlord', tag: 'weapon', min: 6 } }, { sold: { faction: 'kingdom', tag: 'weapon', min: 10 } }, { any: [{ flag: 'demon_war' }, { flag: 'rl_march_seen' }] }] };

  C.push(
    // ════════════════════ ① 궁정 ════════════════════
    {
      // 두건 쓴 청년(알드릭)의 사냥 동무 — 그 청년이 "조용한 가게"라며 보냈다
      id: 'rl_prince_friend', look: 'noble', name: '사냥복 차림의 젊은 귀족', race: '인간', job: '사냥 모임 회원', faction: 'noble', portrait: '🏹',
      spawn: { when: { all: courtOpen.concat([{ flag: 'armed_prince_secret' }, { since: { flag: 'armed_prince_secret', days: 2 } }]) }, chance: 0.6 },
      affil: { claim: 'noble', seal: 'real', line: '사냥 모임 사람이오. 어느 집안인지는 묻지 마시오.' },
      greet: '두건 쓴 친구가 여길 알려 줬소. 사냥 모임에 {item}이 모자라오. {qty}자루, {offer}G.',
      request: { item: 'bow', qty: 3, partialOk: true },
      lines: { sold: '사냥감은 숲에만 있는 게 아니지. …농담이오.', partial: '이것만으로도 모임이 든든하겠소.', refused: '친구 말과 다르구려. 조용한 가게라더니.' },
      onSell: { vars: { prince_power: 1 }, flags: ['rl_prince_hunt'] },
    },
    {
      // 베일 쓴 수녀(세레나)가 보낸 구호소 수녀
      id: 'rl_almshouse_sister', look: 'priest', name: '수녀 마들렌', race: '인간', job: '성문 밖 구호소 수녀', faction: 'church', portrait: '🕊️',
      spawn: { when: { all: courtOpen.concat([{ flag: 'armed_princess_secret' }, { since: { flag: 'armed_princess_secret', days: 2 } }]) }, chance: 0.6 },
      greet: '베일 쓰신 분이 보내셨어요. 구호소에 {item}이 모자라요. {qty}병, {offer}G요.',
      request: { item: 'potion', qty: 3, partialOk: true },
      lines: { sold: '줄 선 사람들이 다 그분 이름을 물어요. 저는 모른다고 해요.', partial: '이만큼이라도 감사해요.', refused: '…다른 약방을 돌아볼게요.' },
      onSell: { vars: { princess_power: 1, kingdom_morale: 1 }, flags: ['rl_almshouse_fed'] },
    },
    {
      // 궁정 서기 — 신분 숨긴 손님이 무엇을 사 갔고 어디로 간다 했는지 캐묻는다 (경비대 벌금 court_inquiry 와는 따로, 말로만)
      id: 'rl_court_clerk', look: 'noble_courier', name: '궁정 서기 오도', race: '인간', job: '어전 회의 서기', faction: 'kingdom', portrait: '📜', kind: 'talk',
      spawn: { when: { all: courtOpen.concat([secretSince(3)]) }, chance: 0.5 },
      affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '어전 회의 서기요. 왕실 인장이오.' },
      ask: { tag: '심문', note: '신분 숨긴 손님의 행방' },
      greet: '두건이나 베일로 얼굴 가린 손님이 왔었다 들었소. 무엇을 사 갔고, 어디로 간다 했소?',
      choices: [
        {
          id: 'truth', label: '사실대로 말한다',
          reply: '…역시 그랬군. 회의 전에 폐하께 올리겠소.',
          effects: { vars: { crown_power: 1, rel_kingdom: 1, rel_noble: -1 }, flags: ['rl_court_told'], news: [{ cat: '왕국', text: '어전 서기, 도성 무기점 돌며 "얼굴 가린 손님" 탐문' }] },
        },
        {
          id: 'cover', label: '얼굴은 못 봤소',
          reply: '못 봤다라. (장부에 뭔가 적는다)',
          effects: { vars: { rel_noble: 1 }, flags: ['rl_court_covered'] },
        },
      ],
    },
    {
      // 공위 기간에 알드릭 쪽이 우세할 때(leaning_aldric — config.js weaveRules) — 섭정 회의를 쥔 알드릭 파의 "서부 숲 정벌 준비" 징발관
      // (v0.9.5: 대관식이 30일째 밤으로 옮겨 가 즉위 뒤 손님에서 우세한 쪽의 손님으로 바뀌었다)
      id: 'rl_aldric_levy', look: 'soldier2', name: '징발관 가스', race: '인간', job: '알드릭 왕자 친위대 징발관', faction: 'kingdom', portrait: '🪖',
      spawn: { when: { all: [{ flag: 'leaning_aldric' }, { since: { flag: 'leaning_aldric', days: 1 } }, { noFlag: 'crowned' }] }, chance: 0.6 },
      greet: '왕자 전하의 명이오. 대관식 전에 서부 숲 정벌 준비를 마친다 하셨소. {item} {qty}자루, {offer}G. 값은 규정대로.',
      greetWhen: [{ when: { any: [{ flag: 'armed_prince_secret' }, { flag: 'armed_aldric' }] }, text: '전하께서 이 가게를 기억하시오. 두건 쓰시던 때 일 말이오. 대관식 전에 서부 숲 정벌 준비요. {item} {qty}자루, {offer}G.' }],
      request: { item: 'iron_spear', qty: 4, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '친위대가 이 창을 들고 행군 연습을 하오. 대관식 날 행렬 맨 앞이오.', partial: '모자란 건 징발 장부에 달아 두겠소.', refused: '대관식 뒤에도 이 가게를 기억하겠소.' },
      onSell: { vars: { kingdom_power: 1, border_tension: 1, succession: 1 }, flags: ['rl_aldric_levied'], news: [{ cat: '왕국', text: '알드릭 왕자 친위대, 새 창 들고 서부 숲 길목서 행군 연습… "대관식 전에 정벌 준비"' }] },
      onRefuse: { vars: { rel_kingdom: -1 } },
    },
    {
      // 공위 기간에 세레나 쪽이 우세할 때(leaning_serena — config.js weaveRules) — 공주의 구호소 (v0.9.5: 즉위 뒤 손님에서 바뀜)
      id: 'rl_serena_almoner', look: 'noble_lady', name: '구호관 리안', race: '인간', job: '공주의 구호소 구호관', faction: 'church', portrait: '🕯️',
      spawn: { when: { all: [{ flag: 'leaning_serena' }, { since: { flag: 'leaning_serena', days: 1 } }, { noFlag: 'crowned' }] }, chance: 0.6 },
      greet: '공주님의 구호소가 광장에 문을 열었어요. 대관식 전에 광장 줄을 줄이시겠대요. {item} {qty}병, {offer}G.',
      greetWhen: [{ when: { any: [{ flag: 'armed_princess_secret' }, { flag: 'backed_serena' }] }, text: '공주님께서 안부를 전하셨어요. 베일 쓰시던 때를 잊지 않으셨대요. 구호소에 {item} {qty}병, {offer}G.' }],
      request: { item: 'potion', qty: 4, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '광장 줄이 오늘은 조금 짧아지겠네요.', partial: '이만큼이라도요. 고마워요.', refused: '…다른 가게에 가 볼게요.' },
      onSell: { vars: { church_authority: 1, kingdom_morale: 1, succession: -1 }, flags: ['rl_serena_alms'], news: [{ cat: '왕국', text: '세레나 공주의 구호소, 광장에 문 열어… 첫날 빵과 물약 동나' }] },
    },
    {
      // 두 후계자 모두에게 몰래 판 가게 — 궁정 시종 하나가 눈치챘다 (기회주의자의 길목)
      id: 'rl_court_whisperer', look: 'noble', name: '궁정 시종 펠릭스', race: '인간', job: '궁정 시종 (입이 가볍다)', faction: 'noble', portrait: '🎭', kind: 'talk',
      spawn: { when: { all: [{ any: [{ flag: 'armed_prince_secret' }, { flag: 'armed_aldric' }] }, { any: [{ flag: 'armed_princess_secret' }, { flag: 'backed_serena' }] }, { any: [{ flag: 'court_decided' }, { flag: 'interregnum' }, { flag: 'crowned' }, { flag: 'civil_war' }] }, { noFlag: 'closed_court' }] }, chance: 0.6 },
      ask: { tag: '입막음', gold: -30, note: '양쪽에 판 일' },
      greet: '왕자 전하 활도, 공주 전하 물약도 이 가게 것이더군요. 궁정엔 입이 많지요.',
      choices: [
        {
          id: 'hush', label: '30G로 입을 막는다', when: { gold: { gte: 30 } },
          reply: '저는 아무것도 못 봤습니다. 늘 그렇듯이요.',
          effects: { gold: -30, flags: ['rl_court_hushed'] },
        },
        {
          id: 'shrug', label: '장사일 뿐이오',
          reply: '장사라… 궁정에선 그걸 줄타기라고 하지요.',
          effects: { vars: { reputation: -1 }, flags: ['rl_court_known'], news: [{ cat: '소문', text: '궁정 시종들 사이 "두 전하께 다 판 무기점" 뒷말' }] },
        },
      ],
    },

    // ════════════════════ ② 레온 ════════════════════
    {
      // 8일째 레온에게 칼을 준(팔았든 그냥 줬든) 뒤 — 레온이 보낸 신병
      id: 'rl_leon_recruit', look: 'soldier', name: '신병 오토', race: '인간', job: '제7기사단 신병', faction: 'kingdom', portrait: '💂',
      spawn: { when: { all: leonAlive.concat([{ not: { eventFired: 'leon_battle' } }, { noFlag: 'leon_route_closed' },
        { any: [{ all: [{ flag: 'leon_gift' }, { since: { flag: 'leon_gift', days: 2 } }] }, { all: [{ flag: 'leon_rearmed' }, { since: { flag: 'leon_rearmed', days: 2 } }] }] }]) }, chance: 0.6 },
      greet: '제7기사단 신병 오토요. 레온 경이 방패는 이 집이라 했소. {item} {qty}개, {offer}G.',
      request: { item: 'shield', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '레온 경께 이 가게 이름을 대겠소.', partial: '하나라도 들고 가겠소.', refused: '…레온 경 말과 다르군.' },
      onSell: { flags: ['rl_recruit_armed'] },
    },
    {
      // 분대 방패 무렵 — 레온 분대 척후. 사건 rl_scout_call 이 부른다
      id: 'rl_west_scout', look: 'hunter_scout', name: '척후 미렌', race: '인간', job: '레온 분대 척후', faction: 'kingdom', portrait: '🏹',
      spawn: { queuedOnly: true },
      greet: '레온 분대 척후 미렌이오. 서부 숲 매복 자리를 먼저 보러 가오. {item} {qty}자루, {offer}G.',
      request: { item: 'bow', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '해 뜨기 전에 숲 가장자리 참나무 길로 들어가오. 돌아오면 들르겠소.', partial: '한 자루면 되오. 쏠 일이 없길 빌어야지.', refused: '…맨손으로 숲을 보러 가란 말이군.' },
      onSell: { flags: ['rl_scout_armed'] },
      onRefuse: { flags: ['rl_scout_unarmed'] },
    },
    {
      // 전투 뒤 — 활을 들고 간 척후가 돌아왔다 (레온이 살아 있을 때)
      id: 'rl_scout_back', look: 'hunter_scout', name: '척후 미렌', race: '인간', job: '레온 분대 척후 (팔에 붕대)', faction: 'kingdom', portrait: '🏹', kind: 'talk',
      spawn: { when: { all: leonAlive.concat([{ flag: 'rl_scout_armed' }, { flag: 'rl_battle_over' }, { since: { flag: 'rl_battle_over', days: 1 } }]) } },
      ask: { tag: '인사', note: '돌아온 척후' },
      greet: '돌아왔소. 매복 자리를 먼저 봤소. 그 활로 신호를 쏴서 분대가 돌아섰소.',
      choices: [
        { id: 'glad', label: '무사해서 다행이오', reply: '레온 경도 그렇게 말했소. 가게 앞을 지날 때마다 인사하겠소.', effects: { vars: { rel_kingdom: 1 }, flags: ['rl_scout_home'] } },
        { id: 'drink', label: '한 잔 사겠소 (−5G)', when: { gold: { gte: 5 } }, reply: '(웃는다) 다음엔 내가 사겠소.', effects: { gold: -5, vars: { rel_kingdom: 1, reputation: 1 }, flags: ['rl_scout_home'] } },
      ],
    },
    {
      // 전투 뒤 — 척후가 돌아오지 않았다 (활을 못 들고 갔거나, 분대가 무너졌거나). 경비대가 마지막 행선지를 묻는다
      id: 'rl_scout_missing', look: 'soldier2_b', name: '경비대 기록관 루츠', race: '인간', job: '왕국 경비대 실종자 담당', faction: 'kingdom', portrait: '📋', kind: 'talk',
      spawn: { when: { all: [{ customerSeen: 'rl_west_scout' }, { any: [{ flag: 'rl_scout_unarmed' }, { flag: 'leon_fell' }] }, { flag: 'rl_battle_over' }, { since: { flag: 'rl_battle_over', days: 1 } }] } },
      ask: { tag: '행방', note: '척후 미렌' },
      greet: '척후 미렌이 돌아오지 않았소. 이 가게에 들렀다던데, 뭐라 했소? 어디로 간다 했소?',
      choices: [
        {
          id: 'tell', label: '참나무 길로 간다 했소',
          reply: '참나무 길… 수색대를 그리로 보내겠소. 고맙소.',
          effects: { vars: { rel_kingdom: 1 }, flags: ['rl_scout_traced'], news: [{ cat: '왕국', text: '실종 척후 수색대, 서부 숲 참나무 길에서 부러진 화살 찾아' }] },
        },
        {
          id: 'forget', label: '기억나지 않소',
          reply: '…그렇소. 누군가는 기억하겠지.',
          effects: { flags: ['rl_scout_forgotten'] },
        },
      ],
    },
    {
      // 납품 계약 뒤 — 기사단 서기가 납품 명부 현판에 가게 이름을 새길지 묻는다
      id: 'rl_seventh_clerk', look: 'knight_official', name: '서기관 베른', race: '인간', job: '제7기사단 서기관', faction: 'kingdom', portrait: '📜', kind: 'talk',
      spawn: { when: { all: [{ flag: 'leon_contract' }, { noFlag: 'leon_contract_broken' }, { since: { flag: 'leon_contract', days: 3 } }] } },
      ask: { tag: '명부', note: '기사단 현판에 이름' },
      greet: '단장님 분부요. 기사단 납품 명부 현판에 이 가게 이름을 새길까 하오.',
      choices: [
        { id: 'engrave', label: '이름을 새긴다', reply: '병영 정문 옆에 걸리오. 숲 쪽에서도 보일 거요.', effects: { vars: { reputation: 1 }, flags: ['rl_plaque'], news: [{ cat: '왕국', text: '제7기사단 병영 정문에 새 현판… 납품 가게 이름 새겨' }] } },
        { id: 'quiet', label: '이름은 빼 주시오', reply: '조용한 가게로군. 단장님도 그런 쪽을 좋아하시오.', effects: { flags: ['rl_plaque_declined'] } },
      ],
    },

    // ════════════════════ ③ 왕국 ════════════════════
    {
      // 왕실 인증 · 조달 뒤 — 왕실 검수관
      id: 'rl_royal_assessor', look: 'knight_official', name: '검수관 하이모', race: '인간', job: '왕실 보급청 검수관', faction: 'kingdom', portrait: '🔍', kind: 'talk',
      spawn: { when: { any: [{ all: [{ flag: 'royal_certified' }, { since: { flag: 'royal_certified', days: 3 } }] }, { all: [{ flag: 'crown_supplier' }, { since: { flag: 'crown_supplier', days: 3 } }] }] }, chance: 0.5 },
      affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '왕실 보급청이오. 인장 여기 있소.' },
      ask: { tag: '검수', items: { iron_sword: 1 }, note: '시험용 칼 한 자루' },
      greet: '왕실 납품 가게 검수요. 칼 한 자루를 시험 삼아 베어 보겠소.',
      choices: [
        { id: 'give', label: '시험용으로 내준다', when: { has: { item: 'iron_sword' } }, reply: '(짚단이 한 번에 갈린다) 됐소. 보급청 장부에 "쓸 만함"이오.', effects: { take: { iron_sword: 1 }, vars: { rel_kingdom: 1, reputation: 1 }, flags: ['rl_assessed'] } },
        { id: 'ledger', label: '장부만 보여 준다', reply: '장부는 깨끗하군. 칼은 다음에 보겠소.', effects: { flags: ['rl_assessed_ledger'] } },
        { id: 'refuse', label: '검수는 사양하오', reply: '사양이라. 보급청은 그런 말을 오래 기억하오.', effects: { vars: { rel_kingdom: -1 } } },
      ],
    },
    {
      // 고블린 전쟁 중 — 동원 하사관
      id: 'rl_muster_sergeant', look: 'soldier2', name: '하사관 브루노', race: '인간', job: '서부 동원령 하사관', faction: 'kingdom', portrait: '💂',
      spawn: { when: { all: [{ flag: 'war' }, { since: { flag: 'war', days: 1 } }] }, chance: 0.6 },
      greet: '동원령이오. 끌려온 농군들 손에 쥐여 줄 {item}이 모자라오. {qty}자루, {offer}G.',
      request: { item: 'iron_spear', qty: 4, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '창 끝을 앞으로만 두라고 가르치겠소.', partial: '나머지는 쇠스랑을 들려야겠군.', refused: '…농군들 맨손으로 서쪽에 보내란 말이오.' },
      onSell: { vars: { kingdom_power: 1 }, flags: ['rl_muster_armed'], news: [{ cat: '전쟁', text: '동원병들, 새 창 들고 서쪽 성문 나서… 절반은 어제까지 농군' }] },
    },
    {
      // 왕국이 이겼다 — 전쟁에서 돌아온 병사가 방패를 판다
      id: 'rl_war_veteran', look: 'soldier', name: '제대병 한넬', race: '인간', job: '서부 전선 제대병', faction: 'kingdom', portrait: '🛡️', kind: 'sell',
      spawn: { when: { all: [{ flag: 'kingdom_victory' }, { since: { flag: 'kingdom_victory', days: 1 } }] } },
      greet: '전쟁은 끝났소. 고향 갈 노잣돈이 필요하오. {item} {qty}개, {offer}G에 넘기겠소.',
      request: { item: 'shield', qty: 2, price: 40 },
      lines: { bought: '긁힌 자국마다 사연이 있소. 좋은 주인 만나길.', declined: '…고물상에 가 보겠소.' },
      onBuy: { flags: ['rl_veteran_helped'] },
    },

    // ════════════════════ ④ 고블린 ════════════════════
    {
      // 고블린 습격대가 왕국 정찰대를 밀어냈다 — 기세 오른 고블린 정찰대
      id: 'rl_goblin_scouts', look: 'goblin_raider', name: '정찰대장 크릭', race: '고블린', job: '서부 숲 정찰대', faction: 'goblin', portrait: '👺',
      spawn: { when: { all: [{ flag: 'goblin_won_skirmish' }, { since: { flag: 'goblin_won_skirmish', days: 1 } }, { noFlag: 'kingdom_victory' }] } },
      greet: '킥! 기사들 도망갔다구! 이제 인간 초소 구경 간다구. {item} {qty}자루, {offer}G!',
      request: { item: 'bow', qty: 3, partialOk: true },
      lines: { sold: '킥킥! 초소 지붕에 화살 꽂아 두고 올 거라구!', partial: '모자라! 그래도 간다구!', refused: '흥! 인간 편이라구? 크릭은 기억한다구.' },
      onSell: { vars: { goblin_unity: 1 }, flags: ['rl_gob_scouts'] },
    },
    {
      // 서부 숲이 고블린 땅이 됐다 — 쫓겨난 인간 개척민
      id: 'rl_west_settler', look: 'elder_b', name: '개척민 오스발트', race: '인간', job: '서부 숲 개척촌에서 쫓겨난 농부', faction: 'village', portrait: '🧺',
      spawn: { when: { all: [{ flag: 'west_goblin' }, { since: { flag: 'west_goblin', days: 1 } }] } },
      greet: '서부 숲 개척촌에서 왔소. 고블린이 통행세를 받더니 집을 비우라더군. {item} {qty}개… {offer}G뿐이오.',
      request: { item: 'shield', qty: 1, offer: { mult: 0.6 }, partialOk: true },
      lines: { sold: '이걸 수레에 매달고 동쪽으로 가겠소.', refused: '…그렇겠지. 다들 사정이 있지.' },
      onSell: { flags: ['rl_settler_helped'] },
      poor: { style: 'hao' },
    },
    {
      // 부족이 한 족장 아래 뭉쳤다 — 족장의 글쟁이가 "인간 친구 명부"를 들고 온다
      id: 'rl_goblin_scribe', look: 'goblin_trader', name: '글쟁이 스크리블', race: '고블린', job: '족장의 글쟁이', faction: 'goblin', portrait: '📜', kind: 'talk',
      spawn: { when: { all: [{ flag: 'goblin_unified' }, { since: { flag: 'goblin_unified', days: 3 } }, { var: 'rel_goblin', gte: 4 }] }, chance: 0.6 },
      ask: { tag: '명부', note: '부족의 인간 친구' },
      greet: '킥! 족장님이 "인간 친구 명부" 만든다구. 이 가게 이름, 올릴까? 안 올릴까?',
      choices: [
        { id: 'sign', label: '이름을 올린다', reply: '킥킥! 이제 숲에서 이 가게 욕하면 혼난다구!', effects: { vars: { rel_goblin: 1, rel_kingdom: -1 }, flags: ['rl_goblin_ledger'], news: [{ cat: '고블린', text: '통합 족장, "인간 친구 명부" 작성… 도성 가게 이름도 올라' }] } },
        { id: 'decline', label: '이름은 빼 주오', reply: '흥, 겁쟁이 인간! …그래도 물건은 사러 온다구.', effects: { flags: ['rl_goblin_ledger_declined'] } },
      ],
    },
    {
      // 고블린 전쟁 중 — 다친 고블린들 약을 구하러
      id: 'rl_goblin_medic', look: 'goblin_raider2', name: '약바구니 즈룩', race: '고블린', job: '부족 약바구니', faction: 'goblin', portrait: '👺',
      spawn: { when: { all: [{ flag: 'war' }, { since: { flag: 'war', days: 2 } }, { var: 'rel_goblin', gte: 3 }] }, chance: 0.5 },
      greet: '킥… 다친 친구들 많다구. {item} {qty}병, {offer}G. 빨리빨리!',
      request: { item: 'potion', qty: 5, partialOk: true },
      lines: { sold: '킥! 오늘 밤엔 덜 울 거라구.', partial: '이것도 고맙다구…', refused: '…인간은 역시 인간 편이라구.' },
      onSell: { flags: ['rl_goblin_mended'] },
    },

    // ════════════════════ ⑤ 박쥐 ════════════════════
    {
      // 전쟁 양쪽에 꽤 판 가게 — 양쪽 진영을 떠돈 용병이 같은 각인을 봤다
      id: 'rl_two_flags', look: 'mercenary', name: '떠돌이 용병 카르스', race: '인간', job: '양쪽 진영을 떠돈 용병', faction: 'merc', portrait: '🗡️', kind: 'talk',
      spawn: { when: { any: [batGoblin, batDemon] }, chance: 0.4 },
      ask: { tag: '뒷돈', gold: -30, note: '같은 각인 이야기' },
      greet: '양쪽 진영에서 같은 각인 칼을 봤지. 이 가게 거더군. 소문 나면 곤란하겠지?',
      choices: [
        { id: 'pay', label: '30G를 쥐여 준다', when: { gold: { gte: 30 } }, reply: '각인? 무슨 각인. 난 술만 마셨지.', effects: { gold: -30, flags: ['rl_bat_hushed'] } },
        { id: 'shrug', label: '마음대로 하시오', reply: '배짱 좋군. 술집마다 떠들어 주지.', effects: { vars: { reputation: -1 }, flags: ['rl_bat_known'], news: [{ cat: '소문', text: '용병 술집 "전장 양쪽에 같은 각인 칼"… 어느 가게냐 내기' }] } },
      ],
    },

    // ════════════════════ ⑥ 마왕군 ════════════════════
    {
      // 마왕군 선봉이 북쪽을 휩쓸었다 — 피난민
      id: 'rl_north_refugee', look: 'traveler', name: '피난민 엘사', race: '인간', job: '북부 국경 마을에서 온 피난민', faction: 'village', portrait: '🧣',
      spawn: { when: { all: [{ flag: 'rl_march_seen' }, { since: { flag: 'rl_march_seen', days: 1 } }] }, chance: 0.6 },
      greet: '북쪽에서 왔어요. 검은 깃발이 마을을 지나갔어요. 아이들 줄 {item} {qty}병… {offer}G밖에 없어요.',
      request: { item: 'potion', qty: 2, offer: { mult: 0.6 }, partialOk: true },
      lines: { sold: '고마워요. 저 칼들, 인간 가게 각인이 있었어요. 어디 가게인지는 몰라요.', refused: '…네. 알겠어요.' },
      onSell: { flags: ['rl_refugee_helped'] },
      poor: { style: 'yo' },
    },
    {
      // 검은 깃발에 칼을 댄 뒤 선봉이 움직였다 — 북부 순찰대 실종 조사
      id: 'rl_patrol_inquiry', look: 'knight_official', name: '조사관 에른스트', race: '인간', job: '북부 방위청 조사관', faction: 'kingdom', portrait: '🕵️', kind: 'talk',
      spawn: { when: { all: [{ flag: 'armed_demonlord' }, { flag: 'rl_march_seen' }, { since: { flag: 'rl_march_seen', days: 3 } }] }, chance: 0.6 },
      ask: { tag: '심문', note: '마족 손의 각인 칼' },
      greet: '북부 순찰대가 돌아오지 않았소. 마족 칼에 이 가게 각인이 있었소. 그자들이 뭐라 했소? 어디로 간다 했소?',
      choices: [
        { id: 'truth', label: '북쪽 황무지로 간다 했소', reply: '…솔직하구려. 방위청이 황무지 길목을 막겠소.', effects: { vars: { rel_kingdom: 1, rel_demonlord: -1, invasion_risk: -1 }, flags: ['rl_black_told'], news: [{ cat: '왕국', text: '북부 방위청, 황무지 길목에 초소 새로 세워… "무기점 진술 덕"' }] } },
        { id: 'deny', label: '모르는 칼이오', reply: '모르는 칼이라. (각인 탁본을 도로 접는다)', effects: { vars: { rel_kingdom: -1 }, flags: ['rl_black_denied'] } },
      ],
    },
    {
      // 마왕과 손잡은 뒤 — 검은 군단 징발병 (방패는 무기 판매 수에 들지 않는다)
      id: 'rl_black_forager', look: 'demon_soldier', name: '징발병 우르그', race: '마족', job: '검은 군단 징발병', faction: 'demonlord', portrait: '💀',
      spawn: { when: { all: [{ flag: 'demonlord_pact' }, { since: { flag: 'demonlord_pact', days: 2 } }, { noFlag: 'demonlord_repelled' }] } },
      greet: '폐하와 손잡은 가게라지. {item} {qty}개, {offer}G. 묻지 말고 내놔라.',
      request: { item: 'shield', qty: 4, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '동맹의 방패다. 앞줄에 세우지.', partial: '…모자라군. 적어 둔다.', refused: '동맹이 방패 넷도 못 내놓나. 폐하께 전하지.' },
      onSell: { vars: { demonlord_power: 1 }, flags: ['rl_black_shields'] },
      onRefuse: { vars: { rel_demonlord: -1 } },
    },
    {
      // 마왕군이 이겼다 — 점령지 세리
      id: 'rl_black_tax', look: 'demon', name: '세리 모르드', race: '마족', job: '검은 깃발 점령지 세리', faction: 'demonlord', portrait: '🪙', kind: 'talk',
      spawn: { when: { all: [{ flag: 'demonlord_victory' }, { since: { flag: 'demonlord_victory', days: 1 } }] } },
      ask: { tag: '상인세', gold: -40, note: '동맹이면 면제' },
      greet: '휴전 조약 제3조, 점령지 상인세다. 40G. 폐하의 동맹이면 면제다.',
      choices: [
        { id: 'ally', label: '동맹 증표를 보인다', when: { flag: 'demonlord_pact' }, reply: '…흠. 동맹이군. 문에 검은 깃발을 달아 두지.', effects: { vars: { rel_demonlord: 1 }, flags: ['rl_black_banner'] } },
        { id: 'pay', label: '40G를 낸다', when: { all: [{ noFlag: 'demonlord_pact' }, { gold: { gte: 40 } }] }, reply: '영수증이다. 다음 달에도 온다.', effects: { gold: -40, flags: ['rl_black_taxed'] } },
        { id: 'refuse', label: '낼 돈이 없소', when: { noFlag: 'demonlord_pact' }, reply: '없다라. 네 이름을 다른 장부에 옮겨 적지.', effects: { vars: { rel_demonlord: -2, reputation: 1 }, flags: ['rl_black_defied'] } },
      ],
    },

    // ════════════════════ ⑦ 마르가 ════════════════════
    {
      // 마르가에게 판 이튿날 — 경비병이 그 여자가 어느 길로 갔는지 묻는다 (감찰관 필라가 오기 전)
      id: 'rl_marga_trail', look: 'soldier', name: '경비병 디트', race: '인간', job: '왕국 경비대 순찰병', faction: 'kingdom', portrait: '💂', kind: 'talk',
      spawn: { when: { all: [{ flag: 'sold_marga' }, { since: { flag: 'sold_marga', days: 1 } }, { noFlag: 'reported_marga' }, { not: { customerSeen: 'marga_inspector' } }] } },
      ask: { tag: '행방', note: '초승달 흉터 여자' },
      greet: '초승달 흉터 여자를 쫓고 있소. 이 골목에서 봤다는데, 어느 길로 갔소?',
      choices: [
        { id: 'mislead', label: '동쪽 길이라 둘러댄다', reply: '동쪽이라… 고맙소. (서둘러 뛰어간다)', effects: { vars: { rel_goblin: 1, rel_kingdom: -1, integrity: -1 }, flags: ['rl_marga_misled'], news: [{ cat: '왕국', text: '경비대, 초승달 흉터 여인 쫓아 동쪽 길 수색… 헛걸음' }] } },
        { id: 'truth', label: '서쪽 숲길로 갔소', reply: '서쪽이군. 숲에 들어갔으면 이미 늦었겠지만.', effects: { vars: { rel_kingdom: 1, rel_goblin: -1 }, flags: ['rl_marga_trail_told'] } },
        { id: 'unseen', label: '못 봤소', reply: '못 봤다라. 알겠소.', effects: { flags: ['rl_marga_unseen'] } },
      ],
    },
    {
      // 감찰관 앞에서도 마르가를 지켜 줬다 — 숲에서 약을 사러 온 고블린이 안부를 전한다
      id: 'rl_forest_word', look: 'goblin_trader', name: '약초 바구니 꼬마', race: '고블린', job: '서부 숲 약초꾼', faction: 'goblin', portrait: '🌿',
      spawn: { when: { all: [{ flag: 'lied_about_marga' }, { since: { flag: 'lied_about_marga', days: 2 } }, { noFlag: 'marga_caught' }, { noFlag: 'confessed_marga' }] }, chance: 0.6 },
      greet: '킥… 초승달 누나가 숲에 무사히 왔다구. 고맙단 말 전하래. 그리고 {item} {qty}병, {offer}G!',
      request: { item: 'potion', qty: 3, partialOk: true },
      lines: { sold: '누나한테 이 가게 물약이라고 말할 거라구!', partial: '이만큼도 고맙다구!', refused: '…누나가 서운해할 거라구.' },
      onSell: { flags: ['rl_forest_word'] },
    },
  );

  // ───────── 사건: 손님을 부르거나, 줄기 사이에 기사 한 줄 ─────────
  // 우선순위를 낮게 두어 원래 사건들이 먼저 자리(maxEventsPerNight)를 쓴다
  E.push(
    // 레온 분대가 방패를 사 간 무렵 — 척후가 매복 자리를 보러 간다 (서부 숲 전투 전에만)
    {
      id: 'rl_scout_call', once: true, priority: 22,
      when: { all: [{ customerSeen: 'leon_squad' }, { not: { eventFired: 'leon_battle' } }, { noFlag: 'leon_fell' }] },
      effects: { spawn: [{ customer: 'rl_west_scout', inDays: 1 }] },
    },
    // 서부 숲 전투가 끝난 밤 (척후가 돌아오거나 실종 조사가 이튿날부터)
    { id: 'rl_battle_over_ev', once: true, priority: 20, when: { eventFired: 'leon_battle' }, effects: { flags: ['rl_battle_over'] } },
    // 레온과 계약을 맺었다
    {
      id: 'rl_leon_contract_news', once: true, priority: 20,
      when: { all: [{ flag: 'leon_contract' }, { noFlag: 'leon_contract_broken' }] },
      news: { cat: '왕국', text: '레온 기사단장 첫 명령 "숲으로 가는 칼은 한 자루도 없다"… 납품 가게 한 곳 지정' },
    },
    // 두건 쓴 청년에게 활을 판 이튿날
    {
      id: 'rl_prince_bows_news', once: true, priority: 20,
      when: { all: courtOpen.concat([{ flag: 'armed_prince_secret' }]) },
      news: { cat: '소문', text: '왕자 사냥 모임 활터에 새 활 다섯… "어느 가게 것인지 아무도 모른다"' },
    },
    // 베일 쓴 수녀에게 물약을 판 이튿날
    {
      id: 'rl_princess_potions_news', once: true, priority: 20,
      when: { all: courtOpen.concat([{ flag: 'armed_princess_secret' }]) },
      news: { cat: '소문', text: '성문 밖 구호소, 물약 줄 길어져… 베일 쓴 수녀가 직접 나눠 줬다는 말' },
    },
    // 마왕군 선봉이 움직였다 (demonlord_march 는 예약 사건이라 플래그가 없다 — since 로 잇기 위해 여기서 켠다)
    { id: 'rl_march_seen_ev', once: true, priority: 20, when: { eventFired: 'demonlord_march' }, effects: { flags: ['rl_march_seen'] } },
    // 검은 깃발에 칼을 댄 지 사흘 — 북쪽 국경 마을이 비어 간다
    {
      id: 'rl_north_empties', once: true, priority: 20,
      when: { all: [{ flag: 'armed_demonlord' }, { since: { flag: 'armed_demonlord', days: 3 } }, { noFlag: 'demonlord_repelled' }] },
      news: { cat: '보고', text: '북쪽 국경 마을 사람들 짐 싸서 남쪽으로… "검은 천막이 가까워졌다"' },
    },
    // 전장 양쪽에 같은 각인 — 박쥐의 길목
    {
      id: 'rl_same_mark_news', once: true, priority: 20,
      when: { any: [batGoblin, batDemon] },
      news: { cat: '전쟁', text: '양쪽 진영 부상병, 같은 대장간 각인 칼에 베였다는 증언' },
    },
    // 서부 숲이 고블린 땅이 된 지 이틀 — 개척촌이 비어 간다
    {
      id: 'rl_west_settlers_news', once: true, priority: 20,
      when: { all: [{ flag: 'west_goblin' }, { since: { flag: 'west_goblin', days: 2 } }] },
      news: { cat: '마을', text: '서부 숲 개척민 수레 행렬 동쪽으로… "통행세 대신 집을 내놨다"' },
    },
    // 감찰관 앞에서 마르가를 모른다고 했다
    {
      id: 'rl_marga_lost_news', once: true, priority: 20,
      when: { all: [{ flag: 'lied_about_marga' }, { noFlag: 'marga_caught' }] },
      news: { cat: '왕국', text: '감찰청, 초승달 흉터 여인 행방 놓쳐… "서부 숲 쪽 소문만 무성"' },
    },
  );

  // ───────── 맥락 한마디 (랜덤 손님이 인사말에 얹는 말 — remarks.js 와 같은 모양) ─────────
  const R = WS.data.remarks;
  const tone = f => R.tones.faction[f];
  const say = (id, when, faction, text, cd) =>
    R.list.push({ id: `rl_${id}.${faction}`, cat: 'world', tone: tone(faction), who: { faction: [faction] }, text, weight: 2, when, cooldown: cd || 8 });
  say('marga_poster', { all: [{ flag: 'wanted_marga_posted' }, { noFlag: 'reported_marga' }, { noFlag: 'marga_thanked' }] }, 'village', '초승달 흉터 여자 인상서, 우리 마을 우물가에도 붙었어요.');
  say('prince_hunt', { all: [{ flag: 'rl_prince_hunt' }, { noFlag: 'crowned' }] }, 'kingdom', '왕자 전하 사냥 모임에 새 활이 부쩍 늘었다 하오. 사냥감이 짐승만은 아닌 모양이오.');
  say('scout_traced', { flag: 'rl_scout_traced' }, 'kingdom', '실종된 척후 얘기 들으셨소? 참나무 길에서 부러진 화살만 찾았다 하오.');
  say('north_refugees', { all: [{ flag: 'rl_march_seen' }, { noFlag: 'demonlord_repelled' }] }, 'village', '북쪽에서 내려온 사람들이 마을 헛간마다 자고 있어요.');
  say('goblin_ledger', { flag: 'rl_goblin_ledger' }, 'goblin', '인간! 족장님 명부에 이 가게 이름 있다구! 숲에선 다 안다구, 킥!');
  say('aldric_levy', { flag: 'rl_aldric_levied' }, 'kingdom', '친위대가 서부 숲 길목에서 매일 행군 연습이오. 정벌이 머지않았소.');
})();

// ───────── 대화 손님 예시 (설계 docs/DESIGN_CONVERGENCE.md 3.A) — 요약 한 줄 · 이어지는 질문(follow) · 혼잣말(mutter) ─────────
WS.data.customers.push(
  {
    id: 'rl_merc_join', look: 'mercenary', name: '부관 가르스', race: '인간', job: '붉은 늑대 용병단 부관', faction: 'merc', portrait: '🐺', kind: 'talk',
    spawn: { when: { all: [{ flag: 'interregnum' }, { noFlag: 'crowned' }, { noFlag: 'closed_court' }, { var: 'merc_strength', gte: 9 }] }, chance: 0.6 },
    summary: '붉은 늑대 용병단 — 알드릭 왕자 쪽 합류 예정, 내일 칼 주문',
    greet: '내일 우리 단이 왕자님 깃발 아래 들어가오. 칼 열 자루, 내일 준비해 줄 수 있소?',
    choices: [
      { id: 'yes', label: '준비해 두겠소', reply: '좋소. 내일 해 뜨면 애들 데리고 오지.',
        effects: { vars: { succession: 2, rel_merc: 1 }, flags: ['rl_merc_joined'], spawn: [{ customer: 'rl_merc_buyer', inDays: 1 }] } },
      { id: 'no', label: '그런 일엔 안 끼겠소', mutter: '…용병단을 돌려보내면 왕자 쪽은 칼을 잃는다. 그래도?', reply: '흥. 칼 파는 집이 여기뿐인 줄 아나. …입단은 없던 일이오.',
        effects: { vars: { succession: -2, rel_merc: -3, merc_strength: -2 }, flags: ['rl_merc_refused'] } },
    ],
  },
  {
    id: 'rl_merc_buyer', look: 'mercenary', name: '부관 가르스', race: '인간', job: '붉은 늑대 용병단 부관', faction: 'merc', portrait: '🐺',
    spawn: { queuedOnly: true },
    greet: '어제 말한 칼이오. {item} {qty}자루, {offer}골드.',
    request: { item: 'iron_sword', qty: 8, offer: { mult: 1.1 } },
    lines: { sold: '왕자님 깃발 아래서 쓰겠소.', refused: '어제는 준비한다더니. 기억하겠소.' },
    onSell: { vars: { succession: 2, merc_strength: 1 } },
  },
  {
    // 붉은 늑대(rl_merc_join)의 짝 — 대성당 수녀회가 세레나 공주 쪽에 합류한다. 구호소 물약을 대 달라 (공위 기간 · 대성당 권위가 있을 때)
    id: 'rl_church_join', look: 'priest', name: '수녀원장 오델', race: '인간', job: '대성당 수녀회 원장', faction: 'church', portrait: '🕯️', kind: 'talk',
    spawn: { when: { all: [{ flag: 'interregnum' }, { noFlag: 'crowned' }, { noFlag: 'closed_court' }, { var: 'church_authority', gte: 25 }] }, chance: 0.6 },
    summary: '대성당 수녀회 — 세레나 공주 쪽 합류, 내일 물약 주문',
    greet: '내일 우리 수녀회가 공주님 구호소에 들어가요. 광장 줄이 성당 계단까지 이어졌거든요. 물약 열 병, 내일 준비해 주실 수 있나요?',
    choices: [
      { id: 'yes', label: '준비해 두겠소', reply: '고마워요. 내일 아침 수녀 둘이 수레를 끌고 올 거예요.',
        effects: { vars: { succession: -2, rel_church: 1 }, flags: ['rl_church_joined'], spawn: [{ customer: 'rl_church_buyer', inDays: 1 }] } },
      { id: 'no', label: '그런 일엔 안 끼겠소', mutter: '…수녀회를 돌려보내면 공주 쪽 구호소는 물약을 잃는다. 그래도?', reply: '…그래요. 다른 약방을 돌아볼게요.',
        effects: { vars: { succession: 1, rel_church: -2 }, flags: ['rl_church_refused'] } },
    ],
  },
  {
    id: 'rl_church_buyer', look: 'priest', name: '수녀 마들렌', race: '인간', job: '대성당 수녀회', faction: 'church', portrait: '🕊️',
    spawn: { queuedOnly: true },
    greet: '원장님이 보내셨어요. {item} {qty}병, {offer}골드.',
    request: { item: 'potion', qty: 10, offer: { mult: 1.1 }, partialOk: true },
    lines: { sold: '공주님 구호소 천막에서 쓸게요.', partial: '이만큼이라도 고마워요.', refused: '어제는 준비한다고 하셨는데요…' },
    onSell: { vars: { succession: -2, church_authority: 1 }, flags: ['backed_serena'] },
  },
  {
    id: 'rl_mist_serena', look: 'guild_merchant', name: '안개 상단 중개인', race: '???', job: '안개 낀 밤의 상단', faction: 'demon', portrait: '🌫️', kind: 'talk',
    spawn: { when: { all: [{ flag: 'interregnum' }, { noFlag: 'crowned' }, { noFlag: 'closed_court' }, { var: 'demon_influence', gte: 6 }] }, chance: 0.5 },
    summary: '안개 상단 — 세레나 공주와 손잡음, 당신이 누구 편인지 묻는다',
    greet: '우리 상단은 공주님과 계약을 맺었소. 주인장은… 설마 왕자 편은 아니겠지?',
    choices: [
      { id: 'none', label: '누구 편도 아니오', reply: '그렇다면 다행이오. 공주님께 좋은 말씀 전하겠소.',
        effects: { flags: ['rl_mist_asked'], spawn: [{ customer: 'rl_serena_courter', inDays: 1 }] } },
      { id: 'prince', label: '왕자 편이오', reply: '…그렇군. 기억해 두지.',
        effects: { vars: { succession: 1, rel_demon: -2 }, flags: ['rl_told_mist_prince'], spawn: [{ customer: 'rl_aldric_interrogator', inDays: 1 }] } },
    ],
  },
  {
    id: 'rl_serena_courter', look: 'noble_lady', name: '로살린 부인', race: '인간', job: '세레나 공주파 귀부인', faction: 'noble', portrait: '👒', kind: 'talk',
    spawn: { queuedOnly: true },
    summary: '세레나 공주파 — 공주 쪽으로 오라는 회유',
    greet: '상단에서 들었어요. 누구 편도 아니시라고요. 그럼 공주님 편이 되어 주시면 어때요? 구호소 물약 납품을 맡기고 싶어요.',
    choices: [
      { id: 'accept', label: '공주님 쪽 일을 맡겠소', reply: '고마워요. 내일 구호소 수레를 보낼게요.', effects: { vars: { succession: -1, rel_noble: 1 }, flags: ['rl_backed_serena_talk'], spawn: [{ customer: 'serena_relief_cart', inDays: 1 }] } },
      { id: 'decline', label: '아직은 누구 편도 들지 않겠소', reply: '…그래요. 마음이 바뀌면 불러 주세요.', effects: {} },
    ],
  },
  {
    id: 'rl_aldric_interrogator', look: 'noble_lord', name: '베른 경', race: '인간', job: '알드릭 왕자파 기사', faction: 'noble', portrait: '🛡️', kind: 'talk',
    spawn: { queuedOnly: true },
    summary: '알드릭 왕자파 — 안개 상단이 다녀간 일을 추궁',
    greet: '안개 상단 놈들이 다녀갔다지. 왕자님 편이라 했다고 들었소.',
    choices: [
      { id: 'yes', label: '그렇소', reply: '좋소.',
        follow: { say: '그럼 묻겠소. 그놈들 말고 공주 쪽 사람은 없었소?',
          choices: [
            { id: 'tell', label: '사실대로 말한다', reply: '역시. 왕자님께 전하겠소.', effects: { vars: { succession: 2, rel_demon: -3 }, flags: ['rl_informed_aldric'] } },
            { id: 'deny', label: '모르는 일이오', reply: '…그렇다면 그런 거겠지.', effects: { flags: ['rl_aldric_suspects'] } },
          ] } },
      { id: 'no', label: '그냥 해 본 말이오', mutter: '…말을 바꾸면 왕자 쪽은 이 가게를 믿지 않겠지.', reply: '말을 바꾸는 상인은 오래 못 가오.', effects: { vars: { succession: -1 }, flags: ['rl_aldric_distrust'] } },
    ],
  },
);

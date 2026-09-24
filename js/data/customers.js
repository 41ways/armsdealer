// 고정(스크립트) 손님 데이터. 데이터만 추가하면 등장한다.
//
// spawn:
//   { day: N, order: k }             → N일차에 반드시 등장
//   { when: 조건, chance, minDay }     → 조건 만족 시 등장 (기본 1회)
//   { queuedOnly: true }              → 이벤트/효과의 spawn 으로만 등장
// kind: 'buy'(손님이 삼) | 'sell'(손님이 팜) | 'talk'(선택지 대화) | 'trade'(물물교환)
// trade: { give: [{ item, qty }], want: [{ item, qty }], gold } — give = 손님이 내놓는 것, want = 원하는 내 물건,
//        gold = 손님이 얹는 웃돈(음수면 내가 얹는다). 성사되면 onTrade 효과가 적용된다
// faction: 손님이 "주장하는" 소속 / trueFaction: 실제 소속 (세계 영향은 실제 소속 기준)
// request.offer: 숫자(총액) 또는 { mult } (시세 × 배율)
// onSell / onRefuse / onBuy / onTrade / choices[].effects: 효과 DSL (EventManager 참고)
// choices[].needs: 'poster' → 손님이 카운터에 있는 동안 서류함에서 인상서를 꺼내 봐야 나타나는 선택지 (예: 경비대를 부른다)
// extraChoices[].ends: true → 그 말을 듣고 손님이 떠난다 (결과 '대화'). stall: true 면 "답을 미룬" 것 — 까마귀로 밀고하면 포상금↑
// 효과 notify: { item, qty, mult } → "들어오면 알려 주오" 소원 (까마귀 편지 "들어왔다고 알리기" — js/systems/Letters.js)
// 까마귀 밀고(js/data/letters.js report): suspicious: true(수상한 자로 친다) · onReport / onFalseReport(효과 DSL) ·
//   reportDetail(경비대 결과 편지의 한 줄) · caughtFlag(이미 잡혔으면 "이미 데려갔소")
// affil: 왼손 옆 확대경으로 "어디 소속이오? 인장 좀 봅시다" 했을 때의 대답 (없으면 CustomerManager.makeAffil 기본값:
//   정직한 손님 = 자기 소속 + 진짜 인장(대본 손님) / 진짜 7할·"두고 왔소" 3할(그 밖), 위장 손님 = 거짓 소속 + 가짜 인장 7할·없음 3할)
//   { claim: 대는 소속(세력 id, null = 말하지 않음), seal: 'real'|'fake'|'none', sealOf: 인장의 실제 세력(기본 claim), line: 대답 }
// stain: true → 팔거나 사거나 바꾸면 장부의 얼룩(flag illegal_sale — 결말 "완벽한 장부"를 막는다). 가짜 인장 손님은 따로 적지 않아도 얼룩
// ask: kind:'talk' 손님은 반드시 둔다 — 카운터의 "거래 카드"가 대사 대신 보여 주는 거래 요약.
//      (buy/sell/trade 손님은 request/trade 에서 UI가 알아서 만든다.) 대사·분위기는 넣지 말고
//      무엇을·몇 개·돈·조건만. 단계/선택지가 여럿이면 첫 요구(인사말의 부탁) 기준.
//   ask: {
//     tag: '돌려 달라',             // 필수. 2~5자 동사구 (공백 빼고 6자 이하): 돌려 달라 / 맡아 달라 / 사 달라 / 부탁 /
//                                  //   가입 권유 / 신고 / 뒷돈 / 정보 / 심문 / 거래 제안 …
//     items: { ruby: 1, pearl: 2 }, // 선택. items.js 의 대표 id(aliasOf 금지) → 수량. UI가 아이콘·×수량·보유 여부를 보여 준다
//     give: true,                   // 선택. true = 손님이 나에게 주는 물건 / 기본 false = 손님이 나에게 원하는 물건
//     gold: 50,                     // 선택. 오가는 돈 — 양수 = 손님이 나에게 준다, 음수 = 내가 낸다
//     note: '가입비 80G · 나흘마다 40G', // 선택. 18자 이하. items/gold 로 못 적는 조건만
//     deposit: 'obel',              // 선택. items 대신 이 주인이 맡긴 물건(WS.sys.Progress.depositOf(owner))을 보여 준다
//   }
//   예) { tag: '맡아 달라', items: { ruby: 1, pearl: 2 }, give: true, note: '며칠 뒤 찾으러 옴' }
//       { tag: '돌려 달라', deposit: 'obel' } · { tag: '뒷돈', gold: 50 } · { tag: '인상서 전달', note: '서류함 열림' }
//   ask.items 가 있는 손님은 그 물건의 창고 자리가 열려 있어야 온다 (give: true 면 받을 자리, 아니면 내줄 자리 — Progress.blockReason)
//   UI 에서는 손님 객체의 c.tpl(템플릿 id)로 이 템플릿을 찾아 ask 를 읽는다.
WS.data.customers = [
  // ───────── DAY 1 ─────────
  {
    id: 'd1_knight', look: 'knight', name: '레온', race: '인간', job: '기사', faction: 'kingdom', portrait: '🤺',
    spawn: { queuedOnly: true }, // 1일째 튜토리얼 손님 — 무기 거치대를 연다 (js/data/progress.js)
    greet: '제7기사단 레온이오. {item} {qty}자루, {offer}골드에 주시오.',
    request: { item: 'iron_sword', qty: 1 }, // 튜토리얼: 딱 1개, 시세 그대로 (CustomerManager.tutorialCustomer)
    lines: { sold: '고맙소. 이 검으로 백성을 지키겠소.', refused: '…왕국에 협조하지 않는 가게로구려.' },
    onSell: { flags: ['helped_leon'], news: [{ cat: '왕국', text: '제7기사단 레온 경, 서부 숲 순찰 출발… 새 칼이 번쩍' }] },
  },
  // ── 1일째 고정 손님 (튜토리얼): ① 레온(칼 1) ② 고블린(칼 2 + 활 1) ③ 궁수(활 3 — 재고 모자람, "내일 다시 오시오") ④ 기사단원(칼 2 — 1자루뿐, 일부만 판매)
  //    시작 재고는 config.startInventory (칼 3 + 레온용 1, 활 2). 마지막 손님 힌트로 '손님 다시 누르기'·돋보기를 알려 주고, 그 뒤로는 따로 안내하지 않는다.
  {
    id: 'd1_goblin', look: 'goblin_trader', name: '즈긱', race: '고블린', job: '행상', faction: 'goblin', portrait: '👺',
    spawn: { day: 1, order: 1 },
    greet: '킥킥! 인간! 즈긱은 칼 2개랑 활 1개 필요하다구! 기사들보다 값은 후하게 쳐줄게, 킥!',
    request: { category: 'weapon', qty: 3, preferSubtype: 'sword', preferPay: 1.35, otherPay: 1.35, exact: { sword: 2, arrow: 1 } },
    hint: '칼 2개와 활 1개를 테이블에 올린다. 기사단과 달리 고블린은 값을 후하게 쳐 준다 — 종족과 손님의 성격에 따라 값이 다르다.',
    lines: { sold: '좋아 좋아! 즈긱 친구들 데리고 또 올게, 킥킥!', refused: '흥! 인간 기사 편이었네? 즈긱은 기억한다구.' },
    onSell: { flags: ['sold_zgik'] },
  },
  {
    id: 'd1_hunter', look: 'hunter', name: '한스', race: '인간', job: '궁수', faction: 'village', portrait: '🏹',
    spawn: { day: 1, order: 2 },
    greet: '숲에 늑대가 늘었소. 활 {qty}개, {offer}골드에 주시오.',
    request: { item: 'bow', qty: 3, offer: 135 },
    hint: '가진 활이 모자란다. 팔 수 없으면 「내일 다시 오시오」로 돌려보내면 다음 날 다시 온다.',
    lines: { sold: '고맙소. 이걸로 겨울을 나겠군.', refused: '허, 활 하나 구하기 어렵구려.' },
  },
  {
    id: 'd1_adventurer', look: 'soldier', name: '벨', race: '인간', job: '왕국 기사단원', faction: 'kingdom', portrait: '💂',
    spawn: { day: 1, order: 3 },
    greet: '기사단에서 왔소. 칼 {qty}자루, {offer}골드에 주시오.',
    request: { item: 'iron_sword', qty: 2, offer: 106, partialOk: true },
    hint: '칼이 1자루뿐이다 — 있는 만큼만 파는 것도 방법이다. 손님을 누르면 말을 다시 들을 수 있고, 돋보기로 소속과 인장을 확인할 수 있다.',
    lines: { sold: '한 자루라도 고맙소. 나머지는 다음에 오겠소.', partial: '있는 만큼이라도 주시오.', refused: '…왕국에 협조하지 않는 가게로군, 여긴.' },
  },
  {
    id: 'd1_dwarf', look: 'dwarf_smith', name: '브론', race: '드워프', job: '대장장이', faction: 'dwarf', portrait: '🧔',
    spawn: { day: 6, order: 1 }, // 광석 궤짝은 5일째에 열린다 (js/data/progress.js) — 이튿날 도매상에서 채울 틈을 두고 온다
    greet: '강철수염 씨족 브론이네. {item} {qty}개, {offer}골드일세. 허허.',
    request: { item: 'iron_ore', qty: 20, offer: 130 },
    lines: { sold: '좋은 광석이군. 언젠가 갚겠네.', refused: '흠. 다른 데를 알아보겠네.' },
    onSell: { flags: ['sold_bron'], vars: { dwarf_tech: 1 } },
  },

  // ───────── 튜토리얼 손님 (js/data/progress.js tutorialCustomers) ─────────
  // 그날 대기열 맨 앞에 와서 새 창고 자리의 물건을 딱 1개, 시세 그대로 산다. 카운터 앞에 서면 그 자리가 열리고
  // 그 자리의 첫 물건(progress.js stock)과 이 손님이 살 물건 1개가 뒷문으로 들어온다.
  // 1 레온(무기) · 3 오스릭(방어구) · 5 고트·마사(재료) · 7 세실(물약) · 9 오벨(보석) · 11 파울(서류함) · 13 둥지지기(까마귀)
  {
    id: 'tut_shield', look: 'soldier', name: '오스릭', race: '인간', job: '왕국 경비병', faction: 'kingdom', portrait: '💂',
    spawn: { queuedOnly: true },
    greet: '경비병 오스릭이오. {item} {qty}개, {offer}골드에 주시오.',
    request: { item: 'shield', qty: 1 },
    lines: { sold: '고맙소. 튼튼해 보이는군.', refused: '방패가 없단 말이오?' },
  },
  {
    id: 'tut_ore', look: 'goth', name: '대장장이 고트', race: '인간', job: '동쪽 마을 대장장이', faction: 'village', portrait: '🔨',
    spawn: { queuedOnly: true },
    greet: '마을 대장간이오. {item} {qty}개, {offer}골드면 되겠소?',
    request: { item: 'iron_ore', qty: 1 },
    lines: { sold: '좋은 광석이군. 고맙소.', refused: '허탕이로군.' },
  },
  {
    id: 'tut_goods', look: 'herbalist', name: '약초꾼 마사', race: '인간', job: '마을 약초꾼', faction: 'village', portrait: '🌿',
    spawn: { queuedOnly: true },
    greet: '약재로 쓸 {item} {qty}개, {offer}골드에 팔아 주세요.',
    request: { item: 'bone_dust', qty: 1 },
    lines: { sold: '고마워요. 약이 잘 듣겠네요.', refused: '그럼 딴 데 가 봐야겠네요.' },
  },
  {
    id: 'tut_potion', look: 'adventurer', name: '모험가 세실', race: '인간', job: '모험가', faction: 'kingdom', portrait: '🧝',
    spawn: { queuedOnly: true },
    greet: '던전 가는 길이에요. {item} {qty}병, {offer}골드요.',
    request: { item: 'potion', qty: 1 },
    lines: { sold: '살았다! 고마워요.', refused: '아, 없군요….' },
  },
  {
    // 11일째: 인상서를 손으로 건넨다 → 서류함 해금, 인상서가 서류함에 꽂힌다 (Letters.handPosters — 까마귀 없이)
    id: 'guard_courier', look: 'soldier', name: '경비대 전령 파울', race: '인간', job: '왕국 경비대 전령', faction: 'kingdom', portrait: '📯', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '인상서 전달', note: '서류함 열림' },
    greet: '경비대 전령이오. 수배 인상서를 돌리는 중이오.',
    choices: [
      { id: 'take_poster', label: '인상서를 받는다', reply: '서류함에 넣어 두시오. 손님 얼굴과 대조하시오.' },
    ],
  },
  {
    // 6일째: 까마귀를 들여 준다 → 창가의 까마귀 해금, 둥지지기의 안내장이 편지함에 꽂힌다 (Letters.crowArrived)
    id: 'crow_keeper', look: 'crow_keeper', name: '둥지지기 레나', race: '인간', job: '까마귀 둥지지기', faction: 'traveler', portrait: '🐦', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '까마귀 분양', note: '편지 한 통에 삯 2G' },
    greet: '둥지지기예요. 편지 나를 까마귀 한 마리, 들여 주세요.',
    choices: [
      { id: 'take_crow', label: '까마귀를 들인다', reply: '창틀에 앉혀 두세요. 밀고도 기별도 이 녀석이 날라요.' },
    ],
  },

  // ───────── DAY 2 ─────────
  {
    id: 'd2_zgik_friends', look: 'goblin_trader', name: '즈긱과 친구들', race: '고블린', job: '행상단', faction: 'goblin', portrait: '👺',
    spawn: { when: { flag: 'sold_zgik', day: 2 } },
    greet: '친구! 즈긱 친구들 데려왔다구! {item} {qty}개, {offer}골드 줄게, 킥킥!',
    request: { item: 'bow', qty: 3, offer: 165 },
    lines: { sold: '킥킥! 이제 기사들도 숲에 못 온다구!', refused: '어제는 팔았잖아? 변덕쟁이 인간! 즈긱 서운하다구.' },
  },
  {
    id: 'd2_leon_worried', look: 'knight', name: '레온', race: '인간', job: '기사', faction: 'kingdom', portrait: '🤺',
    spawn: { when: { flag: 'helped_leon', day: 2, sold: { faction: 'goblin', tag: 'weapon', min: 3, withinDays: 1 } } },
    greet: '고블린들이 새 칼을 들었더군. {item} {qty}개, {offer}골드.',
    request: { item: 'shield', qty: 3, offer: 90 },
    lines: { sold: '…아무튼 고맙소. 조심하는 게 좋을 거요.', refused: '그런가. 알겠소.' },
  },

  // ───────── 9~13일째: 맡긴 보석 (보석함 해금 · 인상서 연습) ─────────
  // 9일째 오벨(튜토리얼 손님 — progress.js tut_gem)이 오면 보석함이 열리고, 보석을 맡거나 거절한다.
  // 11일째 경비대 전령이 인상서("쥐수염")를 건네 서류함이 열리고, 이튿날(12일째) 보석이 아직 창고에 있으면
  // 쥐수염이 오벨의 심부름꾼 행세를 하며 온다 (progress.js gem_thief_visit). 오벨은 맡긴 지 사흘이 지나고
  // 쥐수염이 다녀간 뒤에 찾으러 온다 — 보통 13일째 (deposit.after — Progress.dawn).
  {
    id: 'obel_deposit', look: 'noble', name: '보석상 오벨', race: '인간', job: '보석방 거리 "은방울" 주인', faction: 'guild', portrait: '💍', kind: 'talk',
    spawn: { queuedOnly: true }, // 9일째 튜토리얼 손님 — 보석함을 연다 (js/data/progress.js)
    ask: { tag: '맡아 달라', items: { ruby: 1, pearl: 2 }, give: true, note: '며칠 뒤 찾으러 옴' },
    greet: '금고털이가 무섭소. 루비 1, 진주 2를 며칠만 맡아 주오.',
    choices: [
      {
        id: 'keep', label: '맡아 준다',
        reply: '고맙소. 며칠 뒤 내가 직접 오겠소. 아무도 주지 마오.',
        effects: { unlock: ['gem'], deposit: { owner: 'obel', name: '보석상 오벨', items: { ruby: 1, pearl: 2 }, inDays: 3, customer: 'obel_return', after: 'gem_thief' }, vars: { rel_guild: 1 }, flags: ['kept_obel_gems'] },
      },
      {
        id: 'decline', label: '남의 보석은 안 맡소',
        reply: '…그렇겠지요. (종종걸음으로 나간다)',
        effects: { unlock: ['gem'], flags: ['refused_obel_gems'] },
      },
    ],
  },
  {
    id: 'gem_thief', look: 'gem_thief', name: '심부름꾼 하인', race: '인간', job: '보석상 심부름꾼(자칭)', faction: 'traveler', trueFaction: 'bandit', portrait: '🐀', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '대신 찾아가기', deposit: 'obel' },
    // 인상서 "쥐수염"의 주인공 (letters.js wanted.catches) — 이튿날 까마귀로 밀고해도 잡힌다
    caughtFlag: 'caught_gem_thief',
    reportDetail: '초록 두건에 귀 끝 잘린 그자, 인상서 그대로였소.',
    onReport: { flags: ['caught_gem_thief', 'caught_gem_thief_by_crow'] },
    greet: '(초록 두건) 오벨 나리 심부름이오. 맡긴 보석 찾으러 왔소.',
    lines: {},
    choices: [
      {
        id: 'hand_over', label: '돌려준다', when: { deposit: { owner: 'obel' } },
        reply: '나리께 잘 전하지요. 수고비요. (서둘러 나간다)',
        effects: { withdraw: { owner: 'obel', to: 'gem_thief' }, gold: 15, vars: { blackmarket: 1 }, flags: ['gave_gems_to_thief'] },
      },
      {
        // 서류함에서 인상서를 꺼내 대조해 봐야 이 선택지가 생긴다 (needs: 'poster')
        id: 'call_guard', label: '경비대를 부른다', needs: 'poster',
        reply: '…쳇. 인상서가 벌써 돌았나.',
        effects: { gold: 50, vars: { reputation: 2, rel_kingdom: 2, rel_bandit: -3 }, flags: ['caught_gem_thief'], news: [{ cat: '왕국', text: '보석 도둑 "쥐수염" 체포… 인상서 알아본 무기점에 포상금', big: true }] },
      },
      {
        id: 'send_away', label: '거절한다',
        reply: '…그렇소? 잘못 찾아왔나 보군.',
        effects: { flags: ['sent_gem_thief_away'] },
      },
    ],
  },
  {
    id: 'obel_return', look: 'noble', name: '보석상 오벨', race: '인간', job: '보석방 거리 "은방울" 주인', faction: 'guild', portrait: '💍', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '돌려 달라', deposit: 'obel' },
    greet: '오벨이오. 맡긴 루비 1, 진주 2를 돌려주시오.',
    choices: [
      {
        id: 'give_back', label: '보석을 돌려준다', when: { deposit: { owner: 'obel', intact: true } },
        reply: '…다 있군. 보관료요. 믿을 만한 가게요.',
        effects: { withdraw: 'obel', gold: 60, vars: { reputation: 2, rel_guild: 3 }, flags: ['obel_gems_returned'] },
      },
      {
        id: 'repay', label: '400G로 물어 준다', when: { all: [{ not: { deposit: { owner: 'obel', intact: true } } }, { gold: { gte: 400 } }] },
        reply: '…돈으로 받을 거면 안 맡겼소. 그래도 됐소.',
        effects: { withdraw: 'obel', gold: -400, vars: { reputation: -1, rel_guild: -1 }, flags: ['obel_repaid'] },
      },
      {
        id: 'confess', label: '없다고 털어놓는다', when: { not: { deposit: { owner: 'obel', intact: true } } },
        reply: '없다고?! …경비대에 가겠소.',
        effects: { withdraw: 'obel', vars: { reputation: -6, rel_guild: -4, rel_kingdom: -1 }, flags: ['obel_gems_lost'], schedule: [{ event: 'obel_complaint', inDays: 1 }] },
      },
    ],
  },

  // ───────── 조건부 스토리 손님 ─────────
  {
    id: 'village_elder', look: 'elder', name: '촌장 헤일', race: '인간', job: '동쪽 마을 촌장', faction: 'village', portrait: '👴',
    spawn: { queuedOnly: true },
    greet: '오우거가 내려온다오. {item} {qty}개… {offer}골드뿐이오.',
    request: { item: 'shield', qty: 4, offer: 80, partialOk: true },
    lines: { sold: '이 은혜는 잊지 않겠소.', refused: '…다른 방법을 찾아보겠소.' },
    onSell: { flags: ['helped_village'] },
    poor: { style: 'hao' },
  },
  {
    id: 'fake_knight', look: 'fake_knight', name: '"기사" 모르간', race: '인간', job: '기사(자칭)', faction: 'kingdom', trueFaction: 'goblin', portrait: '🎭',
    spawn: { queuedOnly: true },
    greet: '제7기사단이다. 서류는 나중에. {item} {qty}개, {offer}골드.',
    request: { item: 'iron_sword', qty: 6, offer: 330, partialOk: true },
    lines: {
      sold: '…좋아. 이 일은 아무한테도 말 마라.',
      refused: '쳇. …아니, 다음에 오지.',
    },
    // 소속을 물으면(왼손 옆 확대경) 기사단 인장을 내민다 — 가짜다
    stain: true,
    affil: { claim: 'kingdom', seal: 'fake', line: '제7… 아니, 제9기사단이다. 인장 여기 있다. 빨리 보고 돌려다오.' },
    extraChoices: [
      { id: 'stall', label: '생각해 보겠소', ends: true, stall: true, reply: '생각? …좋다, 해 지기 전까지만 기다리지.' },
    ],
    reportDetail: '기사단 명부에 없는 이름이더군.',
    onReport: { flags: ['fake_knight_reported'], vars: { border_tension: -1 } },
    onSell: { flags: ['sold_fake_knight'], schedule: [{ event: 'fake_knight_reveal', inDays: 2 }] },
    onRefuse: { flags: ['refused_fake_knight'], schedule: [{ event: 'fake_knight_caught', inDays: 2 }] },
  },
  {
    id: 'inspector', look: 'inspector', name: '조사관 벨라', race: '인간', job: '왕국 감찰관', faction: 'kingdom', portrait: '🕵️', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '심문', note: '고블린 판매 여부' },
    greet: '감찰청이오. 고블린에게 무기를 판 적 있소?',
    choices: [
      {
        id: 'truth', label: '사실대로 말한다',
        reply: '협조에 감사하오. 고블린과는 거래를 삼가시오.',
        effects: { vars: { rel_kingdom: 4, rel_goblin: -5, goblin_power: -2, kingdom_power: 1, collusion: 3, inspector_truth: 1 }, if: { when: { flag: 'informant_office' }, then: { vars: { inspector_truth_after: 1 } } }, flags: ['told_inspector'], news: [{ cat: '왕국', text: '조사관 벨라, 고블린 무기 출처 알아내… 서부 숲 소탕 준비' }] },
      },
      {
        id: 'lie', label: '모른다고 한다',
        reply: '…알겠소. (장부 쪽을 흘끗 본다)',
        effects: { vars: { rel_kingdom: -1 }, flags: ['lied_inspector'], schedule: [{ event: 'inspector_followup', inDays: [3, 5] }] },
      },
      {
        id: 'bribe', label: '50골드를 쥐여 준다', when: { gold: { gte: 50 } },
        reply: '…못 본 걸로 하겠소. 이번뿐이오.',
        effects: { gold: -50, vars: { blackmarket: 3, rel_kingdom: -2 }, flags: ['bribed_inspector'] },
      },
    ],
  },
  {
    id: 'dwarf_supplier', look: 'dwarf_smith', name: '브론', race: '드워프', job: '강철수염 공방장', faction: 'dwarf', portrait: '🧔', kind: 'sell',
    spawn: { queuedOnly: true },
    greet: '새 합금으로 벼린 {item} {qty}자루, {offer}골드에 넘기겠네. 허허.',
    request: { item: 'iron_sword', qty: 3, price: 90 },
    lines: { bought: '잘 팔아 주게. 누구에게 팔든 자네 몫이지.', declined: '아쉽군. 도매상에서 구하게.' },
    onBuy: { vars: { rel_dwarf: 2 } },
  },
  {
    id: 'goblin_envoy', look: 'goblin_envoy', name: '족장의 사절 그르낙', race: '고블린', job: '족장 사절', faction: 'goblin', portrait: '👹',
    spawn: { queuedOnly: true },
    greet: '족장님의 사절 그르낙이다! {item} {qty}개, {offer}골드 낸다구!',
    request: { item: 'iron_sword', qty: 8, offer: 700, partialOk: true },
    lines: { sold: '족장님이 기뻐하신다구! 부족은 하나가 된다, 킥!', refused: '…족장님께 그대로 전할 거다. 그르낙은 다 기억한다구.' },
    onSell: { vars: { goblin_unity: 6 }, flags: ['armed_goblin_chief'] },
    onRefuse: { vars: { rel_goblin: -4 } },
  },
  {
    id: 'royal_quartermaster', look: 'noble_quartermaster', name: '보급관 에드릭', race: '인간', job: '왕실 보급관', faction: 'kingdom', portrait: '🤴',
    spawn: { queuedOnly: true },
    affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '왕실 보급청, 국왕 직속이오. 인장 여기 있소.' },
    greet: '왕실 보급청이오. {item} {qty}개, {offer}골드. 인증도 드리지.',
    request: { item: 'iron_sword', qty: 6, offer: 270, partialOk: true },
    lines: { sold: '인증서를 거시오. 임대료가 절반이오.', refused: '유감이오. 왕실은 기억력이 좋소.' },
    onSell: { flags: ['royal_certified'], vars: { reputation: 5 } },
    onRefuse: { vars: { rel_kingdom: -3 } },
  },

  // ───────── 강철수염 전령 — 요정과 드워프의 갈림길 (config.js fairyDwarf) ─────────
  // pleaDay 에 누구에게나 온다. 철광석 pleaOre 개를 시세에 — 팔면 dwarf_saved → 이튿날 장로의 납품 계약 (아래)
  //   티타니엘의 두 번째 약속(fairy_oath2) 중에 팔면 그 약속을 깬다 (fairy_oath2_broken → events.js fairy_oath2_check)
  //   광석이 없으면 "내일 다시 오시오" 한 번 (dwarf_herald_back — 이튿날 다시 온다). 거절하거나 이튿날에도 못 주면
  //   dwarf_fallen → events.js dwarf_kingdom_falls (무기값 폭등) — 「강철의 시대」는 닫힌다
  {
    id: 'dwarf_herald', look: 'dwarf', name: '전령 도린', race: '드워프', job: '강철수염 씨족 전령', faction: 'dwarf', portrait: '⛏️', kind: 'talk',
    spawn: { day: WS.data.config.fairyDwarf.pleaDay, order: 1 },
    fillVars: { total: { price: 'iron_ore', qty: WS.data.config.fairyDwarf.pleaOre } },
    ask: { tag: '급히 구함', items: { iron_ore: WS.data.config.fairyDwarf.pleaOre }, gold: '{total}', note: '시세 그대로 · 왕국 존망' },
    greet: '철광석을 급히 팔아 주시오. 없으면 내일이라도 다시 오겠소. 이게 없으면 우리 왕국이 망하오.',
    greetWhen: [
      { when: { flag: 'dwarf_herald_back' }, text: '내일이라도 오겠다 했지요. 철광석, 오늘 못 가져가면 산채가 무너지오.' },
    ],
    choices: [
      {
        id: 'sell', label: '판다 ({total}G)', when: { has: { item: 'iron_ore', min: WS.data.config.fairyDwarf.pleaOre } },
        lockedHint: `철광석 ${WS.data.config.fairyDwarf.pleaOre}개가 없다`,
        reply: '(자루를 끌어안는다) 이걸로 성문을 다시 벼리겠소. 이 은혜는 장로님께 꼭 전하리다.',
        effects: {
          setPrice: { dwarf_plea_price: 'iron_ore' }, take: { iron_ore: WS.data.config.fairyDwarf.pleaOre },
          goldVar: { dwarf_plea_price: WS.data.config.fairyDwarf.pleaOre }, vars: { rel_dwarf: 3, dwarf_tech: 2 },
          flags: ['dwarf_saved'], unflags: ['dwarf_herald_back'],
          spawn: [{ customer: 'dwarf_elder_offer', inDays: 1 }],
          if: { when: { flag: 'fairy_oath2' }, then: { flags: ['fairy_oath2_broken'] } },
        },
      },
      {
        id: 'later', label: '없소. 내일 다시 오시오',
        when: { all: [{ noFlag: 'dwarf_herald_back' }, { not: { has: { item: 'iron_ore', min: WS.data.config.fairyDwarf.pleaOre } } }] },
        reply: '내일 이 시각에 다시 오겠소. 부디… 부디 구해 두시오.',
        effects: { flags: ['dwarf_herald_back'], spawn: [{ customer: 'dwarf_herald', inDays: 1 }] },
      },
      {
        id: 'refuse', label: '팔 수 없소',
        when: { not: { all: [{ flag: 'dwarf_herald_back' }, { not: { has: { item: 'iron_ore', min: WS.data.config.fairyDwarf.pleaOre } } }] } },
        reply: '…그렇다면 산채와 함께 식겠소.',
        effects: { flags: ['dwarf_fallen'], unflags: ['dwarf_herald_back'], vars: { rel_dwarf: -4 } },
      },
      {
        id: 'none', label: '끝내 못 구했소',
        when: { all: [{ flag: 'dwarf_herald_back' }, { not: { has: { item: 'iron_ore', min: WS.data.config.fairyDwarf.pleaOre } } }] },
        reply: '…그렇소. 가게 탓은 아니오. 잘 있으시오.',
        effects: { flags: ['dwarf_fallen'], unflags: ['dwarf_herald_back'], vars: { rel_dwarf: -1 } },
      },
    ],
  },

  // ───────── 드워프 납품 계약 → 엔딩 「강철의 시대」 ─────────
  // 강철수염 전령에게 철광석을 판 이튿날(dwarf_saved — 위 dwarf_herald) 장로가 계약을 청한다 (값 = 그날 철광석 시세, dwarf_ore_price 에 못 박음)
  // → 사흘마다 짐꾼이 철광석 20개를 계약가에 받아 간다. 네 번 납품하면 dwarf_golden_age (events.js) → 장로의 답례
  //   "내일 다시 오시오" 첫 번은 봐준다(dwarf_grace_used). 두 번째면 이튿날 한 번 더 와서 받아 가되 계약은 거기까지(dwarf_contract_last)
  //   "납품 못 하겠소" → 그 자리에서 계약 파기. 파기(dwarf_contract_broken) → 이튿날 신문 + 장로의 한마디
  // 유혹: 계약 중 한 번 길드의 철광석 매점(events.js dwarf_ore_hoard — 도매가 두세 배) · 시세 두 배를 부르는 손님 둘(헤파 · 해적 대포장이)
  {
    id: 'dwarf_elder_offer', look: 'dwarf_elder', name: '장로 투르가', race: '드워프', job: '강철수염 씨족 장로', faction: 'dwarf', portrait: '⚒️', kind: 'talk',
    spawn: { queuedOnly: true }, // 전령에게 철광석을 판 이튿날 (dwarf_herald sell) — 17~18일째라 네 번 납품(12일)을 넉넉히 끝낸다
    fillVars: { total: { price: 'iron_ore', qty: 20 }, price: { price: 'iron_ore', qty: 1 } },
    ask: { tag: '납품 계약', items: { iron_ore: 20 }, gold: '{total}', note: '사흘마다 4번 · 값 고정' },
    greet: '전령에게 들었네. 산채를 살린 광석이었지. 이제 용광로를 먹일 차례일세 — 사흘마다 철광석 20개씩 대 주겠나?',
    choices: [
      {
        id: 'sign', label: '계약한다 (개당 {price}G)',
        reply: '개당 {price}G, 계약서에 못 박았네. 쇠값이 뛰든 떨어지든 이 값일세.',
        effects: {
          flags: ['dwarf_contract'], unflags: ['dwarf_grace_used', 'dwarf_contract_last', 'dwarf_porter_back'],
          setPrice: { dwarf_ore_price: 'iron_ore' }, set: { dwarf_deliveries: 0 }, vars: { rel_dwarf: 2 },
          spawn: [{ customer: 'dwarf_porter', inDays: 3 }], schedule: [{ event: 'dwarf_ore_hoard', inDays: [4, 5] }],
        },
      },
      {
        id: 'decline', label: '묶이긴 싫소',
        reply: '그런가. 광석은 다른 데서 찾겠네.',
        effects: { vars: { rel_dwarf: -1 }, flags: ['dwarf_contract_declined'] },
      },
    ],
  },
  {
    id: 'dwarf_porter', look: 'dwarf', name: '짐꾼 발린', race: '드워프', job: '강철수염 씨족 짐꾼', faction: 'dwarf', portrait: '🎒', kind: 'talk',
    spawn: { queuedOnly: true },
    fillVars: { total: ['dwarf_ore_price', 20], price: ['dwarf_ore_price', 1] },
    ask: { tag: '계약 납품', items: { iron_ore: 20 }, gold: '{total}', note: '계약가 개당 {price}G' },
    greet: '강철수염 씨족 짐꾼이오. 계약 물량 철광석 20개, {total}G 가져왔소.',
    greetWhen: [
      { when: { flag: 'dwarf_contract_last' }, text: '약속대로 왔소. 철광석 20개, {total}G. 계약은 오늘로 끝이오.' },
      { when: { flag: 'dwarf_porter_back' }, text: '하루 늦게 다시 왔소. 철광석 20개, {total}G.' },
    ],
    choices: [
      {
        id: 'deliver', label: '납품한다', when: { has: { item: 'iron_ore', min: 20 } }, lockedHint: '철광석 20개가 없다',
        reply: '(자루를 짊어진다) 무게 맞소. 셈은 계약서대로요.',
        effects: {
          take: { iron_ore: 20 }, goldVar: { dwarf_ore_price: 20 }, vars: { dwarf_deliveries: 1, dwarf_tech: 2, rel_dwarf: 1 }, unflags: ['dwarf_porter_back'],
          if: [
            // "내일 다시 오시오"를 두 번 들은 뒤의 마지막 방문 — 받아는 가지만 계약은 끝
            { when: { flag: 'dwarf_contract_last' }, then: { flags: ['dwarf_contract_broken'] } },
            { when: { all: [{ noFlag: 'dwarf_contract_broken' }, { var: 'dwarf_deliveries', gte: 4 }] }, then: { flags: ['dwarf_golden_age'] } },
            { when: { all: [{ noFlag: 'dwarf_contract_broken' }, { noFlag: 'dwarf_golden_age' }] }, then: { spawn: [{ customer: 'dwarf_porter', inDays: 3 }] } },
          ],
        },
      },
      {
        id: 'delay', label: '내일 다시 오시오', when: { all: [{ noFlag: 'dwarf_grace_used' }, { noFlag: 'dwarf_contract_last' }] },
        reply: '하루요. 이번 한 번은 장로님께 말 안 하겠소.',
        effects: { flags: ['dwarf_grace_used', 'dwarf_porter_back'], spawn: [{ customer: 'dwarf_porter', inDays: 1 }] },
      },
      {
        id: 'delay_again', label: '내일 다시 오시오', when: { all: [{ flag: 'dwarf_grace_used' }, { noFlag: 'dwarf_contract_last' }] },
        reply: '또요? …내일 오겠소. 허나 계약은 그걸로 끝이오.',
        effects: { flags: ['dwarf_contract_last', 'dwarf_porter_back'], vars: { rel_dwarf: -1 }, spawn: [{ customer: 'dwarf_porter', inDays: 1 }] },
      },
      {
        id: 'fail', label: '납품 못 하겠소',
        reply: '…장로님께 그대로 전하겠소.',
        effects: { flags: ['dwarf_contract_broken'], unflags: ['dwarf_porter_back'] },
      },
    ],
  },
  {
    // 네 번째 납품 이튿날 (events.js dwarf_golden_age)
    id: 'dwarf_elder_thanks', look: 'dwarf_elder', name: '장로 투르가', race: '드워프', job: '강철수염 씨족 장로', faction: 'dwarf', portrait: '⚒️', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '답례', items: { dwarf_steel_sword: 1 }, give: true, note: '해마다 첫 강철' },
    greet: '손해를 보면서도 약속을 지킨 인간은 처음일세.',
    choices: [
      {
        id: 'accept', label: '칼을 받는다',
        reply: '씨족의 첫 강철일세. 해마다 첫 쇳덩이는 이 가게로 보내겠네.',
        effects: { give: { dwarf_steel_sword: 1 }, vars: { reputation: 2 }, flags: ['dwarf_first_steel'] },
      },
      {
        id: 'humble', label: '약속을 지켰을 뿐이오',
        reply: '그 "뿐"을 지키는 인간이 드물다네.',
        effects: { vars: { rel_dwarf: 2, reputation: 1 } },
      },
    ],
  },
  {
    // 계약이 깨진 이튿날 (events.js dwarf_contract_broken_ev)
    id: 'dwarf_elder_broken', look: 'dwarf_elder', name: '장로 투르가', race: '드워프', job: '강철수염 씨족 장로', faction: 'dwarf', portrait: '⚒️', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '계약 파기', note: '씨족 장부에서 지움' },
    greet: '쇠는 식으면 다시 달구면 되지. 약속은 아니라네.',
    choices: [
      {
        id: 'apologize', label: '미안하오',
        reply: '(수염을 쓸어내린다) …광석은 이제 다른 데서 사겠네.',
      },
      {
        id: 'shrug', label: '장사가 다 그렇소',
        reply: '그래서 인간과는 계약을 안 했던 걸세.',
        effects: { vars: { rel_dwarf: -2 } },
      },
    ],
  },
  {
    // 유혹 ① 계약 이틀째부터 — 첫 납품 전에 시세 두 배
    id: 'dwarf_bid_golem', look: 'golem_smith', name: '공방장 헤파', race: '인간', job: '청동심장 공방장', faction: 'golem', portrait: '🔧',
    spawn: { when: { all: [{ flag: 'dwarf_contract' }, { noFlag: 'dwarf_contract_broken' }, { noFlag: 'dwarf_golden_age' }, { since: { flag: 'dwarf_contract', days: 2 } }] } },
    greet: '드워프 몫 광석이 있다 들었소. {item} {qty}개, {offer}골드. 시세 두 배요.',
    request: { item: 'iron_ore', qty: 20, offer: { mult: 2 }, partialOk: true },
    lines: { sold: '(톱니가 째깍인다) 드워프는 기다려도 골렘은 안 기다리오.', partial: '모자라도 받지. 톱니 몇 개 덜 깎으면 되오.', refused: '의리라. 톱니엔 없는 부품이군.' },
    onSell: { vars: { golem_tech: 2, rel_golem: 2 } },
  },
  {
    // 유혹 ② 길드 매점으로 광석값이 치솟은 동안 — 그 값의 두 배
    id: 'dwarf_bid_pirate', look: 'pirate', name: '대포장이 브레그', race: '인간', job: '소금까마귀 해적단 대포장이', faction: 'pirate', portrait: '💣',
    spawn: { when: { all: [{ flag: 'dwarf_contract' }, { noFlag: 'dwarf_contract_broken' }, { noFlag: 'dwarf_golden_age' }, { flag: 'ore_hoard' }] } },
    greet: '포신 부을 쇠가 모자라. {item} {qty}개, {offer}골드. 요즘 값의 두 배다.',
    request: { item: 'iron_ore', qty: 20, offer: { mult: 2 }, partialOk: true },
    lines: { sold: '크하하! 드워프 영감들 수염 좀 타겠군.', partial: '이것뿐이야? 포신이 짧아지겠군.', refused: '의리 지키다 굶어 죽는 놈 여럿 봤지.' },
    onSell: { vars: { pirate_power: 2, rel_pirate: 2 } },
  },

  // ───────── 안개 상단 ─────────
  // (faction id · 플래그 · 변수는 옛 이름 demon_* 그대로 — 저장·조건 호환)
  // 안개 낀 밤에만 오는 얼굴 흐린 상인들. 금화만이 아니라 기억도 값으로 받는다.
  // 첫 계약: demon_bazaar(events.js) 또는 흐린 손거울 행상(mist_mirror_peddler) → demon_contract
  // 두 번째 계약: 첫 계약 서명 뒤 9~11일 → mist_return(events.js) → mist_contract2 → 엔딩 moonlit_market(안개가 드리운 마을)
  {
    id: 'demon_ring_offer', look: 'hooded', name: '이름을 잊은 수집가', race: '안개 상인', job: '골동품 수집가', faction: 'demon', portrait: '🌫️', kind: 'trade', late: true,
    spawn: { when: { day: { gte: 3 } } },
    greet: '{want} {wantQty}개와 이 반지를 바꾸겠소? 좀 무겁지만. 내 손엔 이제 맞지 않아서.',
    trade: { give: [{ item: 'cursed_ring', qty: 1 }], want: [{ item: 'potion', qty: 10 }], gold: 0 },
    lines: {
      traded: '반지가 새 주인을 좋아하는군. …농담이오.',
      refused: '아쉽구려. 반지는 다른 가게로 가겠지.',
      haggleOk: '웃돈 {offer}G라… 좋소.',
      haggleCounter: '웃돈 {offer}G. 더는 안 되오.',
      haggleLeave: '욕심이 과하군.',
    },
    extraChoices: [
      { id: 'ask_ring', label: '반지의 내력을 묻는다', once: true, reply: '한때 어느 왕의 반지였소. 어느 쪽 왕인지는… 그 기억은 벌써 팔았다오.' },
    ],
    onTrade: { flags: ['has_cursed_ring'], schedule: [{ event: 'ring_awakens', inDays: [3, 4] }] },
    onRefuse: { flags: ['refused_ring'] },
  },
  {
    id: 'demon_contract', look: 'stranger', name: '흐린 얼굴의 중개인', race: '안개 상인', job: '안개 상단 중개인', faction: 'demon', portrait: '📜', kind: 'talk', late: true,
    spawn: { queuedOnly: true },
    ask: { tag: '계약', gold: 200, note: '대가는 제7조' },
    greet: '안개 낀 밤에만 서는 장이 있네. 계약 하나 하세. 선금 200골드. 대가는 제7조에 있고.',
    choices: [
      {
        id: 'sign', label: '서명한다 (+200G)',
        reply: '(잉크가 종이 위에서 안개처럼 번진다) 좋은 동업자가 될 걸세. 무얼 치렀는지는… 곧 잊을 테니 걱정 말게.',
        effects: { gold: 200, vars: { rel_demon: 4, demon_influence: 3 }, flags: ['demon_contract'], schedule: [{ event: 'contract_clause', inDays: [3, 4] }, { event: 'mist_return', inDays: [9, 11] }] },
      },
      {
        id: 'amend', label: '제7조 삭제 (+60G)',
        reply: '지우지. 기억은 자네가 가지고 있게. 대신 선금은 60골드일세.',
        effects: { gold: 60, vars: { rel_demon: 1, demon_influence: 1 }, flags: ['demon_contract', 'demon_contract_amended'], schedule: [{ event: 'contract_clause', inDays: [3, 4] }, { event: 'mist_return', inDays: [9, 11] }] },
      },
      {
        id: 'decline', label: '거절한다',
        reply: '안개는 또 끼네. 계약서도 늘 다시 나타나는 법이지.',
        effects: { vars: { rel_demon: -2 }, flags: ['refused_contract'] },
      },
    ],
    extraChoices: [
      { id: 'ask_clause', label: '제7조엔 뭐가 적혀 있소?', once: true, reply: '기억 하나. 아주 작은 걸로. 없어진 줄도 모를 걸세.' },
      { id: 'ask_face', label: '얼굴이 왜 그리 흐릿하오?', once: true, reply: '값으로 치렀지, 오래전에. 누구에게였는지는… 그것도 기억나지 않네.' },
    ],
  },
  {
    // 두 번째 계약 — 첫 계약(서명·조항 삭제) 9~11일 뒤 mist_return 이벤트가 부른다. 서명하면 엔딩 moonlit_market(안개가 드리운 마을)
    id: 'mist_contract2', look: 'stranger', name: '흐린 얼굴의 중개인', race: '안개 상인', job: '안개 상단 중개인 (두 번째 장)', faction: 'demon', portrait: '📜', kind: 'talk', late: true,
    spawn: { queuedOnly: true },
    ask: { tag: '계약', gold: 300, note: '간판 문양, 또는 기억' },
    greet: '두 번째 장일세. 간판에 안개 문양을 새기게. 그러면 금고가 다시는 비지 않을 걸세.',
    choices: [
      {
        id: 'sign_mark', label: '간판에 문양을 새긴다 (+300G)',
        reply: '(간판 모서리부터 김이 서린다) 이제 안개가 이 집을 알아볼 걸세. 안개 낀 밤마다.',
        effects: { gold: 300, vars: { rel_demon: 4, demon_influence: 5, reputation: -2 }, flags: ['mist_second_contract', 'mist_sign_mark'] },
      },
      {
        id: 'pay_memory', label: '간판 대신 기억으로 치른다 (+300G)',
        reply: '첫 손님의 얼굴을 기억하나? 그걸로 값을 치르겠네. …(무언가 조용히 빠져나간다) 거보게, 벌써 흐릿하지 않나.',
        effects: { gold: 300, vars: { rel_demon: 3, demon_influence: 4 }, flags: ['mist_second_contract', 'mist_paid_memory'] },
      },
      {
        id: 'tear', label: '계약서를 찢는다',
        reply: '첫 장까지 무르겠다? …좋네. 다만 안개는 빚을 잊지 않네. 잊는 건 늘 자네들 쪽이지.',
        effects: { vars: { rel_demon: -5, demon_influence: -3, reputation: 1 }, flags: ['mist_contract_broken'] },
      },
    ],
    extraChoices: [
      { id: 'ask_coffer', label: '금고가 비지 않는다니?', once: true, reply: '비면 채워지네. 어디서 오는지는 묻지 말게. 누구 것이었는지도.' },
    ],
  },
  {
    // 첫 계약으로 가는 또 하나의 길 — 손거울을 사면 이튿날 밤 중개인이 찾아온다 (demon_bazaar 가 아직 안 떴을 때만)
    id: 'mist_mirror_peddler', look: 'traveler', name: '떠돌이 행상 오다', race: '인간', job: '잡동사니 행상', faction: 'traveler', portrait: '🔮', kind: 'talk',
    spawn: { minDay: 7, chance: 0.2, when: { all: [{ day: { lte: 20 } }, { noFlag: 'demon_contract' }, { noFlag: 'refused_contract' }, { not: { eventFired: 'demon_bazaar' } }, { not: { customerSeen: 'demon_contract' } }] } },
    ask: { tag: '거래 제안', gold: -30, note: '흐린 손거울' },
    greet: '안개 낀 밤에 주운 손거울이오. 30골드면 넘기지. …비춰 봐도 얼굴이 잘 안 보이는 게 흠이지만.',
    choices: [
      {
        id: 'buy', label: '손거울을 산다 (-30G)', when: { gold: { gte: 30 } },
        reply: '(거울 속 당신 얼굴이 김 서린 듯 번진다) 이 거울 가진 집엔 밤손님이 온다던데. 문단속 잘 하시오.',
        effects: { gold: -30, vars: { rel_demon: 1, demon_influence: 1 }, flags: ['mist_mirror'], spawn: [{ customer: 'demon_contract', inDays: 1 }] },
      },
      { id: 'pass', label: '됐소', reply: '그러시오. 어차피 이 거울은 제 주인을 찾아가더군.' },
    ],
  },

  // ───────── 마왕군 ─────────
  {
    id: 'demonlord_envoy', look: 'demon_herald', name: '흑기사 그라우스', race: '마족', job: '마왕의 전령', faction: 'demonlord', portrait: '💀',
    spawn: { queuedOnly: true },
    greet: '마왕 폐하의 명이다. {item} {qty}자루, {offer}골드.',
    request: { item: 'iron_sword', qty: 12, offer: 1000, partialOk: true },
    lines: {
      sold: '폐하께 네 이름을 올리겠다.',
      partial: '…모자라군. 폐하는 숫자를 기억하신다.',
      refused: '그렇게 전하겠다. 폐하는 기억하신다.',
      haggleOk: '{offer}G. 폐하의 금고는 깊다.',
      haggleLeave: '흥정은 폐하에 대한 모욕이다.',
    },
    onSell: { flags: ['armed_demonlord'], vars: { demonlord_power: 5, invasion_risk: 6 }, schedule: [{ event: 'demonlord_march', inDays: [3, 4] }], spawn: [{ customer: 'demonlord_envoy2', inDays: 2 }] },
    onRefuse: { flags: ['refused_demonlord'], vars: { rel_demonlord: -5 }, schedule: [{ event: 'envoy_grudge', inDays: 2 }] },
  },
  {
    id: 'demonlord_envoy2', look: 'demon_soldier', name: '보급대장 볼가르', race: '마족', job: '검은 군단 보급대장', faction: 'demonlord', portrait: '💀',
    spawn: { queuedOnly: true },
    greet: '보급대장 볼가르다. {item} {qty}병, {offer}골드.',
    request: { item: 'potion', qty: 20, offer: 600, partialOk: true },
    lines: { sold: '좋다. 북쪽에서 곧 소식이 들릴 거다.', refused: '…네 이름은 다른 목록에 오르겠지.' },
    onSell: { vars: { demonlord_power: 3, invasion_risk: 4 }, flags: ['supplied_demonlord'] },
    onRefuse: { vars: { rel_demonlord: -3 } },
  },
  {
    id: 'demon_king', look: 'demon_king', name: '???', race: '마족', job: '두건 쓴 귀빈', faction: 'demonlord', portrait: '👑', kind: 'talk',
    spawn: { when: { all: [{ var: 'rel_demonlord', gte: 8 }, { flag: 'armed_demonlord' }] }, minDay: 8, chance: 0.5 },
    ask: { tag: '동맹 제안', gold: 300, note: '마왕군 편에 선다' },
    greet: '(불빛이 기운다) 짐의 군대가 네 칼을 든다. 편에 서겠나?',
    choices: [
      {
        id: 'pledge', label: '편에 선다 (+300G)',
        reply: '좋다. 전쟁이 끝나면 이 거리는 네 것이다.',
        effects: { gold: 300, vars: { demonlord_power: 8, invasion_risk: 10, rel_demonlord: 6, rel_kingdom: -6 }, flags: ['demonlord_pact'], news: [{ cat: '소문', text: '"두건 쓴 귀빈이 마왕이었다"는 괴담… 경비대 "헛소문"' }] },
      },
      {
        id: 'offer_ring', label: '반지를 내민다', when: { has: { item: 'cursed_ring' } },
        reply: '…짐의 인장이로군. 합당한 보상을 주마.',
        effects: { take: { cursed_ring: 1 }, gold: 800, unflags: ['ring_cursed'], flags: ['ring_returned'], vars: { demonlord_power: 15, invasion_risk: 12, rel_demonlord: 8 } },
      },
      {
        id: 'refuse_king', label: '누구 편도 아니다',
        reply: '장사꾼답군. 중립이 얼마나 가는지 보자.',
        effects: { vars: { rel_demonlord: -3, reputation: 1 }, flags: ['defied_demon_king'] },
      },
    ],
  },

  // ───────── 반지의 행방 ─────────
  {
    id: 'ring_collector', look: 'demon_noble', name: '"왕실 수집가" 오르반', race: '인간', job: '골동품 수집가(자칭)', faction: 'kingdom', trueFaction: 'demonlord', portrait: '🎩',
    spawn: { queuedOnly: true },
    greet: '글자 새긴 금반지 {qty}개, {offer}골드에 사겠소. 지금 당장.',
    request: { item: 'cursed_ring', qty: 1, offer: 700 },
    stain: true,
    affil: { claim: 'kingdom', seal: 'fake', line: '왕실 수집가의 인장이오. 어느 왕실인지는… 인장이 말해 주겠지.' },
    lines: { sold: '(눈이 노랗게 빛난다) …훌륭하오.', refused: '…후회할 거요. 반지 주인은 늘 그렇지.' },
    extraChoices: [
      { id: 'ask_buyer', label: '누구 부탁이오?', once: true, reply: '순수한 수집가요. 어느 왕실인지는 비밀이고.' },
      { id: 'stall', label: '생각해 보겠소', ends: true, stall: true, reply: '…생각할 시간은 길지 않소. (눈이 노랗게 번뜩인다)' },
    ],
    reportDetail: '소매에서 검은 군단 밀서가 나왔소.',
    onReport: { flags: ['orban_reported'], vars: { demonlord_power: -3 } },
    onSell: { unflags: ['ring_cursed'], flags: ['ring_to_demonlord'], vars: { demonlord_power: 10, invasion_risk: 6 } },
    onRefuse: { vars: { rel_demonlord: -2 } },
  },
  {
    id: 'ring_priest', look: 'oswin', name: '사제 오스윈', race: '인간', job: '대성당 퇴마 사제', faction: 'kingdom', portrait: '⛪',
    spawn: { queuedOnly: true },
    greet: '{item} {qty}개, {offer}골드에요. 대성당이 봉인해 드릴게요.',
    request: { item: 'cursed_ring', qty: 1, offer: 40 },
    lines: { sold: '빛이 함께하길. 금화는 이제 안 사라질 거예요.', refused: '…그 반지는 당신을 놓아주지 않을 거예요.' },
    onSell: { unflags: ['ring_cursed'], flags: ['ring_sealed'], vars: { demon_influence: -4, rel_kingdom: 2, reputation: 2 } },
  },
  {
    id: 'demon_hunter', look: 'paladin', name: '성기사 아우렐리아', race: '인간', job: '대성당 성기사단장', faction: 'kingdom', portrait: '🛡️',
    spawn: { queuedOnly: true },
    greet: '성기사단이오. 안개 속 얼굴 없는 것들을 베러 가오. {item} {qty}자루, {offer}골드.',
    request: { item: 'iron_sword', qty: 3, offer: 180, partialOk: true },
    lines: { sold: '빛의 이름으로. 어둠을 몰아내겠소.', refused: '…믿음으로 싸우는 수밖에 없겠구려.' },
    onSell: { flags: ['armed_paladins'], vars: { demon_influence: -3, rel_demon: -3, rel_kingdom: 2 } },
  },

  // ════════════════════ 확장 세력 스토리 손님 ════════════════════
  // 대부분 events.js 의 이벤트가 spawn 으로 부른다. 결과는 며칠 뒤 다른 세력의 이벤트에서 드러난다.

  // ───────── 요정: 숲의 약속 ─────────
  // 세 번의 약속 → 결말 「요정의 가호」 (config.js fairyDwarf · events.js 요정 줄기)
  //   ① 첫 약속 (events.js fairy_court_appears — firstVisit 사이 하루, 반드시): 사흘 드워프·골렘에 광석 금지
  {
    id: 'fairy_envoy', look: 'fairy_queen', name: '이슬궁의 티타니엘', race: '요정', job: '요정 여왕의 사절', faction: 'fairy', portrait: '🧚', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '판매 금지', items: { fairy_dust: 3 }, give: true, note: '사흘 드워프·골렘 쇠 금지' },
    greet: '숲이 아파요. 사흘만 드워프·골렘에 쇠를 팔지 말아 줘요.',
    choices: [
      {
        id: 'promise', label: '약속한다 (가루 3병)',
        reply: '요정과의 약속은 풀잎에 적혀요.',
        effects: { give: { fairy_dust: 3 }, vars: { rel_fairy: 3 }, flags: ['fairy_oath'], schedule: [{ event: 'fairy_oath_check', inDays: 3 }] },
      },
      {
        id: 'bargain', label: '대신 물약 5병을 준다', when: { has: { item: 'potion', min: 5 } },
        reply: '약속 대신 물약… 인간다운 셈이네요.',
        effects: { take: { potion: 5 }, vars: { rel_fairy: 2, fairy_grace: 4 } },
      },
      {
        id: 'decline', label: '장사는 장사다',
        reply: '쇠는 쇠의 길, 숲은 숲의 길이겠죠.',
        effects: { vars: { rel_fairy: -3, fairy_grace: -2 }, flags: ['fairy_spurned'] },
      },
    ],
  },
  {
    // ② 두 번째 약속 (secondVisit, 첫 약속을 지켰을 때만) — 사흘 더, 쇠를 캐는 이들(드워프·골렘·길드)에게 광석 금지.
    //    이튿날 강철수염 전령이 광석을 청하러 온다 (dwarf_herald) → events.js fairy_oath2_check
    id: 'fairy_envoy_return', look: 'fairy_queen', name: '이슬궁의 티타니엘', race: '요정', job: '요정 여왕의 사절', faction: 'fairy', portrait: '🧚', kind: 'talk',
    spawn: { when: { all: [{ day: WS.data.config.fairyDwarf.secondVisit }, { flag: 'fairy_blessing' }, { noFlag: 'fairy_betrayed' }] } },
    ask: { tag: '판매 금지', note: '사흘 드워프·골렘·길드 광석 금지' },
    greet: '또 왔어요. 사흘만 더, 쇠를 캐는 이들에게 광석을 주지 말아 줘요.',
    choices: [
      {
        id: 'promise', label: '또 약속한다',
        reply: '풀잎이 두 장이 됐네요. 고마워요.',
        effects: { vars: { rel_fairy: 2 }, flags: ['fairy_oath2'], unflags: ['fairy_oath2_broken'], schedule: [{ event: 'fairy_oath2_check', inDays: 3 }] },
      },
      {
        id: 'decline', label: '이번엔 어렵소',
        reply: '그래요. 한 번 지켜 준 것만으로도 숲은 고마워해요.',
        effects: { vars: { rel_fairy: -1 }, flags: ['fairy_oath2_declined'] },
      },
    ],
  },
  {
    // ③ 마지막 부탁 — 두 번째 약속을 지켰고(fairy_oath2_kept) 드워프 왕국이 무너진 뒤, 무기값이 안정된 날(+finalAfter).
    //    사흘 동안 무기를 아무에게도 팔거나 바꾸지 않기 (갑옷·물약·재료는 괜찮다) → events.js fairy_oath3_check → forest_remembers
    //    그 사흘 동안 요정·마을 손님이 조금 더 온다 (factions.js visit.bonus — config.fairyDwarf.oathVisit)
    id: 'fairy_envoy_final', look: 'fairy_queen', name: '이슬궁의 티타니엘', race: '요정', job: '요정 여왕의 사절', faction: 'fairy', portrait: '🧚', kind: 'talk',
    spawn: { when: { all: [{ flag: 'fairy_oath2_kept' }, { flag: 'dwarf_fallen' },
      { since: { flag: 'dwarf_fallen', days: WS.data.config.fairyDwarf.fallSpike.days + 1 + WS.data.config.fairyDwarf.finalAfter } }] } },
    ask: { tag: '판매 금지', items: { fairy_dust: WS.data.config.fairyDwarf.finalDust }, give: true, note: '사흘 무기 판매·교환 금지' },
    greet: '부탁만 해서 미안해요. 무기를 아무에게도 팔지 말아 줘요, 사흘만. 무기가 있는 한 평화는 올 수 없어요.',
    choices: [
      {
        id: 'promise', label: `약속한다 (가루 ${WS.data.config.fairyDwarf.finalDust}병)`,
        reply: '세 번째 풀잎이에요. 숲은 이런 건 잊지 않아요.',
        effects: { give: { fairy_dust: WS.data.config.fairyDwarf.finalDust }, vars: { rel_fairy: 3 }, flags: ['fairy_oath3'], schedule: [{ event: 'fairy_oath3_check', inDays: 3 }] },
      },
      {
        id: 'decline', label: '무기상이 무기를 안 팔 순 없소',
        reply: '…알아요. 당신도 살아야 하니까요. 두 번이면 충분히 고마워요.',
        effects: { flags: ['fairy_final_declined'] },
      },
    ],
  },

  // ───────── 마법사 길드: 차원문 실험 ─────────
  {
    id: 'archmage_vey', look: 'guild_mage', name: '대마법사 베이', race: '인간', job: '은빛 탑 수석 연구관', faction: 'mage', portrait: '🧙',
    spawn: { queuedOnly: true },
    greet: '차원문 실험일세. {item} {qty}개, {offer}골드.',
    request: { item: 'mana_crystal', qty: 8, offer: 540, partialOk: true },
    lines: { sold: '역사에 이름이 남을 걸세. 어느 쪽으로든.', partial: '모자라군. 문이 좀 작아지겠지.', refused: '과학은 안 기다리네. 딴 데서 구하겠네.' },
    extraChoices: [
      { id: 'ask_door', label: '문 너머엔 뭐가 있소?', once: true, reply: '성당은 지옥이라 부르지. 안개 상단은… 고향이라더군.' },
    ],
    onSell: { flags: ['portal_research'], vars: { arcane_power: 6, rel_mage: 3 }, schedule: [{ event: 'portal_experiment', inDays: [3, 4] }] },
    onRefuse: { vars: { rel_mage: -2 } },
  },

  // ───────── 골렘 공방 ─────────
  {
    id: 'golem_foreman', look: 'golem_smith', name: '공방장 헤파', race: '인간', job: '청동심장 공방장', faction: 'golem', portrait: '🔧',
    spawn: { queuedOnly: true },
    greet: '골렘을 만드오. {item} {qty}개, {offer}골드. 전량이어야 하오.',
    request: { item: 'iron_ore', qty: 40, offer: 400 },
    lines: { sold: '(톱니가 째깍인다) 이 도시는 달라질 거요.', refused: '길드 창고에서 구하지. 더 비싸겠지만.' },
    onSell: { vars: { golem_tech: 5, rel_golem: 3, fairy_grace: -2 }, flags: ['armed_golems'] },
    onRefuse: { vars: { guild_grip: 3, rel_golem: -2 } },
  },

  // ───────── 용병단 ─────────
  {
    id: 'merc_captain', look: 'merc_captain', name: '단장 바르고', race: '인간', job: '붉은 늑대 용병단장', faction: 'merc', portrait: '🐺',
    spawn: { queuedOnly: true },
    greet: '큰 계약이 걸렸다. {item} {qty}자루, {offer}골드.',
    request: { item: 'iron_sword', qty: 8, offer: 460, partialOk: true },
    lines: { sold: '좋은 쇠다. 누굴 겨눌지는 금화가 정하지.', refused: '다른 데서 구하지. 기억은 해 두마.' },
    // 돋보기로 인장을 살펴보면 주인이 이 한마디를 하고, 그때부터 고용주를 묻는 선택지가 열린다
    inspectLine: '(용병이라면 고용주에 따라 다른 인장을 들고 다닐 수도 있겠군.)',
    extraChoices: [
      { id: 'ask_client', label: '누가 당신들을 고용하오?', needs: 'inspect', once: true, reply: '왕국, 숲, 황무지, 궁정… 다들 편지를 보냈지.' },
    ],
    onSell: { flags: ['armed_mercs'], vars: { merc_strength: 6, rel_merc: 3 }, schedule: [{ event: 'merc_contract', inDays: [2, 3] }] },
    onRefuse: { vars: { rel_merc: -3 }, schedule: [{ event: 'merc_contract', inDays: [2, 3] }] },
  },

  // ───────── 사냥꾼 · 흡혈귀: 은의 사냥 ─────────
  {
    id: 'hunter_master', look: 'lodge_hunter', name: '조합장 쥬드', race: '인간', job: '은화살 사냥꾼 조합장', faction: 'hunter', portrait: '🏹',
    spawn: { queuedOnly: true },
    greet: '흡혈귀 사냥이오. {item} {qty}자루, {offer}골드. 전 재산이오.',
    request: { item: 'bow', qty: 6, offer: 300, partialOk: true },
    lines: { sold: '이걸로 밤이 조금은 짧아지겠소.', partial: '모자라도 있는 걸로 싸우겠소.', refused: '은 없이도 가겠소. 우린 사냥꾼이니.' },
    onSell: { flags: ['silver_hunt_armed'], vars: { rel_hunter: 3 } },
  },
  {
    id: 'vampire_count', look: 'vampire_count', name: '베른하르트 백작', race: '흡혈귀', job: '밤의 궁정 주인', faction: 'vampire', portrait: '🦇', kind: 'talk', late: true,
    spawn: { queuedOnly: true },
    ask: { tag: '사 달라', items: { holy_water: 3, sun_charm: 2 }, gold: 450, note: '둘 중 하나 · 전량' },
    greet: '(해 진 뒤) 성물을 전부 사겠소. 아니면 무도회에 오시겠소?',
    choices: [
      {
        id: 'sell_silver', label: '성물 매각 (+450G)', when: { any: [{ has: { item: 'holy_water', min: 3 } }, { has: { item: 'sun_charm', min: 2 } }] },
        reply: '현명하시구려. 이 도시의 밤은 평화로울 것이오.',
        effects: { take: { holy_water: 99, sun_charm: 99 }, gold: 450, vars: { vampire_power: 6, rel_vampire: 6, rel_hunter: -6 }, flags: ['silver_hoarded'] },
      },
      {
        id: 'invite', label: '무도회 (+150G)',
        reply: '(아침, 목덜미가 가렵다. 주머니엔 금화 150닢)',
        effects: { gold: 150, vars: { rel_vampire: 5, vampire_power: 3, rel_church: -3 }, flags: ['vampire_friend'] },
      },
      {
        id: 'refuse', label: '나가 주시오',
        reply: '…문턱의 법을 아는구려. 밤은 길다오.',
        effects: { vars: { rel_vampire: -5 }, flags: ['vampire_refused'] },
      },
    ],
  },

  // ───────── 언데드 ─────────
  {
    id: 'necro_prophet', look: 'necromancer', name: '예언자 모라크', race: '인간', job: '잿빛 수의 교단 사제', faction: 'undead', portrait: '☠️', kind: 'trade', late: true,
    spawn: { queuedOnly: true },
    greet: '방패 5개, 칼 4자루를 주오. 대신 무덤에서 나온 것들을.',
    trade: { give: [{ item: 'bone_dust', qty: 10 }, { item: 'pearl', qty: 2 }], want: [{ item: 'shield', qty: 5 }, { item: 'iron_sword', qty: 4 }], gold: 40 },
    lines: { traded: '곧 이 칼들이 행진할 거요. 조용히.', refused: '괜찮소. 죽은 자는 기다림에 익숙하오.' },
    onTrade: { flags: ['armed_dead'], vars: { undead_power: 8, rel_undead: 4, rel_church: -4 } },
  },

  {
    // 해골 행렬이 출발하면 이틀 동안 온다. 성수 4병을 청하지만, 물약·방패·칼 뭐든 헐값(시세 35%)에 받아 간다.
    // 넘긴 물자의 시세 합이 undead_defense 에 쌓이고, 600 이상이면 행렬을 막는다 (events.js dead_march_resolution)
    id: 'march_priest', look: 'priest', name: '대성당 사제 이본', race: '인간', job: '대성당 방비 담당 사제', faction: 'church', portrait: '🕯️', kind: 'buy',
    spawn: { queuedOnly: true },
    greet: '해골들이 와요. 성수 4병, 그리고 뭐든 더요.',
    request: { item: 'holy_water', qty: 4, offer: 120, partialOk: true },
    acceptsAny: { payRate: 0.35, note: '성수가 아니면 제값은 못 드려요. 그래도 받을게요.' },
    supplyVar: 'undead_defense',
    lines: { sold: '주님께서 기억하실 거예요. 아직 모자라요.', partial: '이것뿐인가요… 받을게요.', refused: '문을 걸어 잠그세요. 오늘 밤부터요.' },
  },

  // ───────── 궁정: 왕위 다툼의 불씨 ─────────
  {
    // 독병을 사 가면 국왕이 쓰러진다 (events.js king_ailing_poison). 수상한 손님 — 까마귀로 밀고하면 음모가 막힌다
    id: 'court_poisoner', look: 'court_poisoner', name: '가면 쓴 귀족', race: '인간', job: '이름을 대지 않는 귀족', faction: 'noble', portrait: '🎭',
    spawn: { when: { all: [{ day: { gte: 8, lte: 13 } }, { noFlag: 'succession_crisis' }] }, chance: 0.35 },
    suspicious: true,
    stain: true,
    affil: { claim: null, seal: 'none', line: '소속도 이름도 묻지 말게. 그 값까지 치르는 걸세.' },
    greet: '독병 2병. 값은 넉넉히 치르지. 묻지는 말게.',
    request: { item: 'poison_vial', qty: 2, offer: 120 },
    lines: { sold: '현명하군. 우린 만난 적 없네.', refused: '…다른 가게를 찾지.' },
    onSell: { flags: ['king_poison_sold'], vars: { integrity: -3 } },
    onReport: { flags: ['poison_plot_foiled'] },
  },
  {
    // 사실은 왕궁 시의 — 신분을 밝히지 않는다. 팔면 국왕이 무사하고, 안 팔면 반드시 쓰러진다 (king_ailing_neglect),
    // "내일 다시 오시오"면 국왕이 쓰러지고 왕자·공주·밤의 궁정이 모두 세를 키운다 (king_ailing_delay)
    id: 'court_physician', look: 'physician', name: '차려입은 신사', race: '인간', job: '어디 높은 집안 사람 같다', faction: 'kingdom', portrait: '🎩',
    spawn: { when: { all: [{ day: { gte: 8, lte: 12 } }, { noFlag: 'succession_crisis' }] }, chance: 0.4 },
    // 소속은 대지 않지만 왕실 인장을 지녔다 — 알아보는 사람만 알아본다
    affil: { claim: null, seal: 'real', sealOf: 'royal', line: '신분은 밝힐 수 없소. …인장만 보여 드리지.' },
    greet: '회복 물약 5병. 까닭은 묻지 마시오. 값은 후하오.',
    request: { item: 'potion', qty: 5, offer: 140, partialOk: true },
    lines: { sold: '…됐소. 오늘 일은 잊으시오.', partial: '모자라지만… 가져가겠소.', refused: '그렇다면 할 수 없지.' },
    extraChoices: [
      { id: 'come_tomorrow', label: '내일 다시 오시오', ends: true, when: { noFlag: 'physician_delayed' }, reply: '내일이라… 내일이면 늦을지도 모르오.', effects: { flags: ['physician_delayed'], spawn: [{ customer: 'court_physician', inDays: 1 }] } },
    ],
    onSell: { flags: ['physician_helped'] },
    onRefuse: { flags: ['physician_refused'] },
  },

  {
    // 왕·왕자·공주 다툼 중: 왕정 조달관 — 늘 값싸게 사 간다 (시세의 7할). 팔면 왕정 쪽 힘이 는다
    id: 'crown_quartermaster', look: 'knight_official', name: '왕정 조달관 마르텔', race: '인간', job: '왕실 보급 담당', faction: 'kingdom', portrait: '📜',
    spawn: { when: { all: [{ flag: 'court_struggle' }, { noFlag: 'crowned' }] }, once: false, chance: 0.5 },
    affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '국왕 직속 조달청이오. 왕실 인장을 보시오.' },
    greet: '왕실 조달이오. 칼 4자루, 값은 규정대로.',
    request: { item: 'iron_sword', qty: 4, offer: 150, partialOk: true },
    lines: { sold: '왕실 장부에 적어 두겠소.', refused: '왕실의 부탁을 거절하다니.' },
    onSell: { vars: { crown_power: 3, kingdom_power: 1, rel_kingdom: 1 }, flags: ['crown_supplier'] },
  },
  {
    // 신분을 숨긴 왕자(알드릭 본인 — 계승 위기 때 prince_agent 로 다시 온다) — 활을 비싸게 산다 (시세의 1.7배쯤). 팔면 왕자 쪽으로 기운다
    id: 'prince_hooded', look: 'prince', name: '두건 쓴 청년', race: '인간', job: '말투가 지나치게 곱다', faction: 'traveler', trueFaction: 'noble', portrait: '🧥',
    spawn: { when: { all: [{ flag: 'court_struggle' }, { noFlag: 'crowned' }] }, once: false, chance: 0.45 },
    suspicious: true,
    // 소속은 못 대지만 진짜 왕실(국왕 직속) 인장을 지녔다 — 얼룩이 아니다
    affil: { claim: null, seal: 'real', sealOf: 'royal', line: '말하기 곤란하오. …인장이라면, 이것뿐이오. 부디 조용히.' },
    greet: '활 5자루. 값은 두 배라도 좋소. 조용히만.',
    request: { item: 'bow', qty: 5, offer: 340, partialOk: true },
    lines: { sold: '…곧 이 값의 몇 배로 갚지.', refused: '다른 가게도 많소.' },
    onSell: { vars: { succession: 2, prince_power: 3, crown_power: -1 }, flags: ['armed_prince_secret', 'armed_aldric'] },
  },
  {
    // 신분을 숨긴 공주(세레나 본인 — 계승 위기 때 serena_agent 로 다시 온다) — 비싸게 산다. 물약을 모은다 (민심을 사려고). 팔면 공주 쪽으로 기운다
    id: 'princess_veiled', look: 'princess', name: '베일 쓴 수녀', race: '인간', job: '손이 너무 곱다', faction: 'church', trueFaction: 'noble', portrait: '🕊️',
    spawn: { when: { all: [{ flag: 'court_struggle' }, { noFlag: 'crowned' }] }, once: false, chance: 0.45 },
    suspicious: true,
    affil: { claim: null, seal: 'real', sealOf: 'royal', line: '말하기… 곤란해요. 인장은 있어요. 성당 것은 아니지만요.' },
    greet: '회복 물약 6병. 구호소에 쓸 거예요. 값은 넉넉히.',
    request: { item: 'potion', qty: 6, offer: 210, partialOk: true },
    lines: { sold: '고마워요. 이 은혜는 잊지 않을게요.', refused: '…그럼 다른 길을 찾죠.' },
    onSell: { vars: { succession: -2, princess_power: 3, crown_power: -1 }, flags: ['armed_princess_secret', 'backed_serena'] },
  },
  {
    // 왕위 다툼이 시작된 이튿날 — 밤의 궁정 사절. 편에 서면 "왕정 대 밤", 거절하면 "왕자 대 공주"의 다툼이 된다
    id: 'night_envoy', look: 'vampire', name: '창백한 시종', race: '흡혈귀', job: '밤의 궁정 사절', faction: 'vampire', portrait: '🦇', kind: 'talk', late: true,
    spawn: { queuedOnly: true },
    ask: { tag: '편들기', gold: 150, note: '밤의 궁정 편' },
    greet: '왕좌가 비면 밤이 다스리지요. 우리 편에 서겠소?',
    choices: [
      { id: 'back_night', label: '편에 선다 (+150G)', reply: '현명하오. 해가 지면 다시 찾아오겠소.', effects: { gold: 150, vars: { vampire_power: 5, rel_vampire: 5, rel_church: -3, rel_noble: -2 }, flags: ['vampire_backed'] } },
      { id: 'refuse_night', label: '밤에는 문을 닫소', reply: '…낮의 왕들 싸움이나 구경하시오.', effects: { vars: { rel_vampire: -3 }, flags: ['vampire_rejected'] } },
    ],
  },

  // ───────── 용 ─────────
  {
    // 용이 깨어나면 사흘 동안 매일 온다. 활 6자루를 청하지만, 테이블에 올린 무기·방어구·물약은 뭐든 헐값(시세 35%)에 받아 간다.
    // 넘긴 물자의 시세 합이 dragon_defense 에 쌓이고, 900 이상이면 용을 막는다 (events.js dragon_descends)
    id: 'wall_captain', look: 'wall_captain', name: '성벽 수비대장 브란트', race: '인간', job: '성벽 수비 용병대장', faction: 'merc', portrait: '🏰', kind: 'buy',
    spawn: { queuedOnly: true },
    greet: '용이 깨어났소. 활 6자루, 그리고 뭐든 더 주시오.',
    request: { item: 'bow', qty: 6, offer: 270, partialOk: true },
    acceptsAny: { payRate: 0.35, note: '이건 당장 필요하지 않소. 값은 제대로 못 쳐주오.' },
    supplyVar: 'dragon_defense',
    lines: { sold: '받겠소. 성벽엔 아직 턱없이 모자라오.', partial: '이것뿐이오? …받긴 하겠소.', refused: '용이 오면 이 가게도 타오.' },
  },
  {
    id: 'dragon_herald', look: 'kobold', name: '시종장 스크리크', race: '코볼트', job: '붉은 용의 전령', faction: 'dragon', portrait: '🦎', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '조공', note: '금고의 3할' },
    greet: '스크리크가 알린다, 캬! 주인님이 깨어나셨다! 조공을 바치면 눈여겨보신다! 사흘 뒤 오신다!',
    choices: [
      {
        id: 'tribute', label: '금고의 3할을 바친다',
        reply: '주인님이 기뻐하실 거다, 캬. 아마.',
        effects: { goldPct: -0.3, vars: { rel_dragon: 6, dragon_stir: -4 }, flags: ['dragon_tribute'] },
      },
      {
        id: 'treasure', label: '진귀품을 바친다', when: { any: [{ has: { item: 'pearl', min: 2 } }, { has: { item: 'abyss_pearl' } }, { has: { item: 'star_shard' } }, { has: { item: 'cursed_ring' } }] },
        reply: '반짝반짝! 이건 답례다, 캬! 주인님 허물!',
        effects: { take: { pearl: 3, abyss_pearl: 2, star_shard: 1, cursed_ring: 1 }, give: { dragon_scale: 1 }, vars: { rel_dragon: 9, dragon_stir: -6 }, flags: ['dragon_tribute'] },
      },
      {
        id: 'defy', label: '한 닢도 못 준다',
        reply: '주인님께 그대로 전하겠다, 캬!',
        effects: { vars: { rel_dragon: -8, dragon_stir: 3 }, flags: ['dragon_defied'] },
      },
    ],
  },
  {
    id: 'ember_dragon', look: 'dragon', name: '재의 이그니아', race: '용', job: '재의 산의 주인 (인간의 모습)', faction: 'dragon', portrait: '🐉', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '금고지기', gold: 600 },
    greet: '조공은 받았다, 작은 상인. 내 금고지기가 되어라.',
    choices: [
      {
        id: 'pact', label: '금고지기 (+600G)',
        reply: '좋다. 이 도시는 이제 내 둥지다.',
        effects: { gold: 600, vars: { rel_dragon: 10, dragon_stir: -10, economy: -3, rel_kingdom: -3 }, flags: ['dragon_pact'] },
      },
      {
        id: 'decline_pact', label: '사양하겠소',
        reply: '좋다. 다음에 뒤척일 때 다시 오지.',
        effects: { vars: { rel_dragon: -2, dragon_stir: -5 } },
      },
    ],
  },

  // ───────── 상인 길드 ─────────
  {
    id: 'guild_master', look: 'guild_merchant', name: '길드장 오르신', race: '인간', job: '금저울 상인 길드장', faction: 'guild', portrait: '💼', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '가입 권유', gold: -80, note: '나흘마다 20G' },
    greet: '길드 가입비 80, 나흘마다 20일세. 도매가는 깎아 주지.',
    choices: [
      {
        id: 'join', label: '가입한다 (−80G)', when: { gold: { gte: 80 } },
        reply: '현명하군. 이제 같은 저울에 올라탔네.',
        effects: { gold: -80, vars: { rel_guild: 5, guild_grip: 2 }, flags: ['guild_member'] },
      },
      {
        id: 'decline', label: '혼자 장사하겠소',
        reply: '혼자라. 건물주도 좋아할지 모르겠군.',
        effects: { vars: { rel_guild: -4 }, flags: ['guild_declined'] },
      },
    ],
  },
  {
    id: 'guild_iron_agent', look: 'guild_agent', name: '매입관 클라우스', race: '인간', job: '금저울 길드 철광 담당', faction: 'guild', portrait: '💼',
    spawn: { queuedOnly: true },
    greet: '길드가 철광석을 모으오. {item} {qty}개, {offer}골드.',
    request: { item: 'iron_ore', qty: 40, offer: { mult: 1.3 }, partialOk: true },
    lines: { sold: '좋소. 곧 철값이 오를 거요.', refused: '드워프도 곧 길드 값을 따를 거요.' },
    onSell: { vars: { guild_grip: 8, rel_guild: 3, rel_dwarf: -2 }, flags: ['sold_to_cartel'], schedule: [{ event: 'iron_cartel_check', inDays: 3 }] },
    onRefuse: { vars: { rel_guild: -3 }, flags: ['refused_cartel'], schedule: [{ event: 'iron_cartel_check', inDays: 3 }] },
  },

  // ───────── 해적: 밀수 항로 (도적단 장물아비의 밀수는 js/data/smuggling.js) ─────────
  {
    id: 'pirate_captain', look: 'pirate_captain', name: '선장 모르웬', race: '인간', job: '소금까마귀 해적단 선장', faction: 'pirate', portrait: '🏴‍☠️', kind: 'trade',
    spawn: { queuedOnly: true },
    greet: '진주 4알, 향신료 6자루 줄게. 활 3, 칼 4랑 바꾸자.',
    trade: { give: [{ item: 'pearl', qty: 4 }, { item: 'eastern_spice', qty: 6 }], want: [{ item: 'bow', qty: 3 }, { item: 'iron_sword', qty: 4 }], gold: 0 },
    lines: { traded: '크하하! 우리 배에도 이빨이 생겼군.', refused: '육지 놈들은 겁이 많아. 다음에 보자고.' },
    onTrade: { flags: ['armed_pirates'], vars: { pirate_power: 6, rel_pirate: 4, trade_routes: -4 } },
  },

  // ───────── 대성당: 파문 ─────────
  {
    id: 'inquisitor', look: 'inquisitor', name: '심문관 헬가', race: '인간', job: '대성당 이단 심문관', faction: 'church', portrait: '⛪', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '고해 요구', gold: -100, note: '안개 상단·망자 거래 건' },
    greet: '안개 상단·망자와 거래한 기록이 있구려. 고해하시오.',
    choices: [
      {
        id: 'confess', label: '고해·헌금 100골드', when: { gold: { gte: 100 } },
        reply: '장부가 더 깨끗해지길 바라오.',
        effects: { gold: -100, vars: { rel_church: 5, church_authority: 2, demon_influence: -2, undead_power: -2, collusion: 2, integrity: 1, inspector_truth: 1 }, if: { when: { flag: 'informant_office' }, then: { vars: { inspector_truth_after: 1 } } }, flags: ['absolved'] },
      },
      {
        id: 'deny', label: '그런 거래는 없다',
        reply: '거짓말도 하늘의 장부에 적히는 법이오.',
        effects: { vars: { rel_church: -2, integrity: -1 }, schedule: [{ event: 'excommunication', inDays: 2 }] },
      },
      {
        id: 'defy', label: '장사에 신은 없소',
        reply: '그럼 신 없이 장사해 보시오.',
        effects: { vars: { rel_church: -6, reputation: 1 }, schedule: [{ event: 'excommunication', inDays: 1 }] },
      },
    ],
  },

  // ───────── 궁정: 왕위 계승 ─────────
  {
    id: 'prince_agent', look: 'prince', name: '알드릭 왕자', race: '인간', job: '제1왕자 (변장했지만 티가 난다)', faction: 'noble', portrait: '🤴',
    spawn: { queuedOnly: true },
    affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '왕가의 사람이다. 이 인장이면 됐겠지.' },
    greet: '왕자다. {item} {qty}자루, {offer}골드. 반은 대관식 날 주마.',
    // 궁정 다툼 때 두건을 쓰고 활을 사 간 그 청년이다 — 그때 팔았으면 알아본다 (greetWhen: 먼저 맞는 것이 greet 대신)
    greetWhen: [
      { when: { flag: 'armed_prince_secret' }, text: '그때 사 간 활, 잘 썼네. 앞으로도 잘 부탁하네. {item} {qty}자루, {offer}골드. 반은 대관식 날 주마.' },
    ],
    request: { item: 'bow', qty: 4, offer: { mult: 1.6 }, partialOk: true },
    payment: { credit: { now: 0.5, inDays: [5, 7], defaultWhen: { any: [{ flag: 'queen_serena' }, { flag: 'vampire_regent' }] }, defaultText: '알드릭 왕자에게 받을 외상값 {amount}G는 휴지 조각이 되었다. 왕이 되지 못한 자의 약속이다.' } },
    lines: { sold: '이 활들이 왕관을 지킨다. 기억하겠다.', partial: '모자란 만큼 덜 기억하겠지.', refused: '누이 쪽이냐? …상인은 이길 쪽에 걸지.' },
    onSell: { flags: ['armed_aldric'], vars: { succession: 7, rel_noble: 3, merc_strength: 3 } },
    onRefuse: { vars: { succession: -1, rel_noble: -2 } },
  },
  {
    id: 'serena_agent', look: 'princess', name: '세레나 공주', race: '인간', job: '제1왕녀 (수녀복 차림)', faction: 'noble', portrait: '👸', kind: 'talk',
    spawn: { queuedOnly: true },
    affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '왕가의 사람이에요. 인장은 여기 있어요.' },
    ask: { tag: '기부', gold: -120, note: '구호소' },
    greet: '칼 대신 빵을 사요. 구호소에 기부해 주시겠어요?',
    // 궁정 다툼 때 베일을 쓰고 물약을 사 간 그 수녀다 — 그때 팔았으면 알아본다 (왕자 prince_agent 와 짝)
    greetWhen: [
      { when: { flag: 'armed_princess_secret' }, text: '그때 사 간 물약, 잘 썼어요. 앞으로도 잘 부탁해요. 오늘은 칼 대신 빵을 사요. 구호소에 기부해 주시겠어요?' },
    ],
    choices: [
      {
        id: 'donate', label: '120골드 기부', when: { gold: { gte: 120 } },
        reply: '고마워요. 광장에 이름이 걸릴 거예요.',
        effects: { gold: -120, vars: { succession: -7, church_authority: 3, rel_noble: 3, kingdom_morale: 2 }, flags: ['backed_serena'] },
      },
      {
        id: 'tip_prince', label: '동선을 판다 (+90G)',
        reply: '(왕자파 기사가 금화 주머니를 두고 간다)',
        effects: { gold: 90, vars: { succession: 4, rel_noble: -1 }, flags: ['betrayed_serena'] },
      },
      {
        id: 'neutral', label: '끼지 않겠소',
        reply: '중립도 선택이지요. 왕좌는 기억해요.',
        effects: { vars: { rel_noble: -1 } },
      },
    ],
  },

  // ───────── 도적단 ─────────
  {
    id: 'bandit_king', look: 'bandit_chief', name: '도적왕 룩', race: '인간', job: '검은 두건 두목', faction: 'bandit', portrait: '🗡️', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '보호비', gold: -100, note: '또는 동업 +150G' },
    greet: '가도는 이제 내 거다. 동업하든지, 보호비를 내든지.',
    choices: [
      {
        id: 'partner', label: '동업한다 (+150G)',
        reply: '좋아. 네 가게는 이제 우리 창고다.',
        effects: { gold: 150, vars: { rel_bandit: 8, bandit_power: 5, blackmarket: 4, trade_routes: -5, rel_village: -3 }, flags: ['bandit_partner'] },
      },
      {
        id: 'pay', label: '보호비 100골드', when: { gold: { gte: 100 } },
        reply: '현명해. 지켜 주지. 우리한테서.',
        effects: { gold: -100, vars: { rel_bandit: 5, bandit_power: 2 }, flags: ['protection_paid'] },
      },
      {
        id: 'inform', label: '은신처를 알린다',
        reply: '(룩이 나간 뒤 경비대 초소로 향한다)',
        effects: { vars: { rel_kingdom: 3, rel_bandit: -10 }, flags: ['informed_bandits'], schedule: [{ event: 'bandit_hideout_raid', inDays: 2 }] },
      },
    ],
  },

  // ───────── 잿빛 엄니 전투단 ─────────
  {
    id: 'warchief', look: 'orc_chief', name: '족장 그루크', race: '오크', job: '잿빛 엄니 전투단 족장', faction: 'orc', portrait: '🪓',
    spawn: { queuedOnly: true },
    greet: '{item} {qty}자루 전부, {offer}골드. 산에서 캔 금이다.',
    request: { item: 'war_axe', qty: 6, offer: { mult: 1.45 } },
    lines: {
      sold: '좋은 도끼다. 우린 강한 자 편에 선다.',
      refused: '"안 판다"고? 마음에 든다. 기억하지.',
      haggleOk: '{offer}. 강하게 부르는군. 좋다.',
      haggleLeave: '두 번 부르는 건 약한 자의 짓이다.',
    },
    onSell: { flags: ['armed_warband'], vars: { warband_power: 8, rel_orc: 3 }, schedule: [{ event: 'warband_choice', inDays: [3, 4] }] },
    onRefuse: { flags: ['orcs_respect'], vars: { rel_orc: 2 }, schedule: [{ event: 'warband_choice', inDays: [3, 4] }] },
  },

  // ───────── 연금술: 천둥 가루 ─────────
  // 발명 소식(events.js powder_invented)과 함께 왕국 포고가 먼저 붙고, 케셀은 하루이틀 뒤에 온다 (kessel_visit).
  // 독점권은 세 단계 — 많이 살수록 통당 값이 싸다 (시세 60G·도매 34G 안팎). 어느 것이든 powder_dealer:
  //   도매상이 화약을 "케셀 몫"으로 싸게 넘기고(items.js supplyWhen · config.js costMods), 해적·용병·드워프·암시장의 발길이 는다 (factions.js visit.bonus).
  // 여기서 알리면(report) 화약 길이 막히고 뒤탈도 없다. 판 뒤에 신고하면 해적이 앙갚음하러 온다 (powder_inspector → powder_revenge)
  {
    // 능글맞은 돌팔이 — 하오체 대신 기름진 존댓말(-요/-습니다요)에 "낄낄". 그림은 시트 kessel (assets/sprites/kessel.png)
    id: 'alchemist_kessel', look: 'kessel', name: '케셀 박사', race: '인간', job: '녹색 증류탑 학회장', faction: 'alchemist', portrait: '⚗️', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '독점 판매', items: { black_powder: 6 }, give: true, gold: -150, note: '15통 300G·30통 500G' },
    greet: '낄낄, 사장님. 천둥 가루 들어 보셨지요? 많이 사실수록 싸게 드립니다요. 독점 판매상이 되시면 화약만 팔아도 먹고사실 수 있답니다, 낄낄.',
    choices: [
      {
        id: 'exclusive', label: '6통 (−150G)', when: { gold: { gte: 150 } },
        reply: '낄낄, 조심성 있으시네요. 다 팔리시면 도매상 조합에 "케셀 몫"이라고만 하세요. 싸게 넘겨 드릴 겁니다요.',
        effects: { gold: -150, give: { black_powder: 6 }, vars: { rel_alchemist: 5, alchemy_progress: 3 }, flags: ['powder_dealer'] },
      },
      {
        id: 'exclusive_15', label: '15통 (−300G)', when: { gold: { gte: 300 } },
        reply: '통당 스무 닢! 이 값엔 두 번 다시 없습니다요, 낄낄. 촛불만 조심하시고요.',
        effects: { gold: -300, give: { black_powder: 15 }, vars: { rel_alchemist: 6, alchemy_progress: 3 }, flags: ['powder_dealer'] },
      },
      {
        id: 'exclusive_30', label: '30통 (−500G)', when: { gold: { gte: 500 } },
        reply: '낄낄낄! 역사적인 거래입니다요. 오늘부터 여기가 천둥 가게예요. 창고에 불씨만은 들이지 마세요.',
        effects: { gold: -500, give: { black_powder: 30 }, vars: { rel_alchemist: 8, alchemy_progress: 4 }, flags: ['powder_dealer', 'powder_bulk'] },
      },
      {
        id: 'report', label: '대성당에 알린다',
        reply: '어이쿠, 신고요? 낄낄… 두고 보세요. 성당 양반들도 결국 이걸 사러 올 겁니다요.',
        effects: { vars: { church_authority: 4, alchemy_progress: -6, rel_alchemist: -6, rel_church: 3, rel_kingdom: 2 }, flags: ['powder_banned'] },
      },
      {
        id: 'pass', label: '관심 없소',
        reply: '낄낄, 후회하실 텐데요. 역사는 천둥처럼 온답니다요. 문은 제가 닫고 나가지요.',
        effects: { vars: { rel_alchemist: -1 } },
      },
    ],
  },
  {
    // 화약을 한 통이라도 넘긴 뒤 이따금 (events.js powder_inquiry) — 포고를 들고 감찰관이 들른다.
    // 뒤늦은 신고: 화약 길이 막히고(powder_banned — 결말 「천둥의 시대」도 막힌다) 해적과 원수가 된다 →
    //   1~3일 뒤 밤 도적 (powder_revenge — 왕국과 사이가 좋고 왕국에 무기를 판 적이 있으면 경비대가 쫓아낸다)
    id: 'powder_inspector', look: 'knight_official', name: '감찰관 브란트', race: '인간', job: '왕국 감찰청 화약 단속반', faction: 'kingdom', portrait: '📜', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '신고', note: '화약 거래 · 포고령' },
    greet: '포고는 보셨겠지. 검은 가루가 이 거리에서 돈다는 말이 있소. 아는 게 있으면 지금 말하시오.',
    choices: [
      {
        id: 'report_late', label: '화약 거래를 신고한다',
        reply: '…늦었지만 용기 있는 신고요. 거래선은 우리가 끊겠소. 한동안 문단속 잘 하시오.',
        effects: {
          vars: { rel_pirate: -20, pirate_power: -3, rel_alchemist: -4, rel_kingdom: 1, church_authority: 1 },
          flags: ['powder_reported_late', 'powder_banned'], schedule: [{ event: 'powder_revenge', inDays: [1, 3] }],
        },
      },
      {
        id: 'deny', label: '모르는 일이오',
        reply: '그렇다면 다행이고. 포고는 아직 붙어 있소.',
        effects: {},
      },
    ],
  },

  // ───────── 나그네: 대상 ─────────
  {
    id: 'caravan_master', look: 'caravan_master', name: '대상주 사이다', race: '인간', job: '동방 대상 우두머리', faction: 'traveler', portrait: '🐪', kind: 'trade',
    spawn: { queuedOnly: true },
    greet: '향신료 10자루 줄 테니 물약 8병, 활 2자루를 주오.',
    trade: { give: [{ item: 'eastern_spice', qty: 10 }], want: [{ item: 'potion', qty: 8 }, { item: 'bow', qty: 2 }], gold: 30 },
    lines: { traded: '사막의 신이 이 가게를 기억하길.', refused: '맨손으로 가야겠군. 도적들이 좋아하겠소.' },
    onTrade: { flags: ['caravan_backed'], vars: { trade_routes: 5, rel_traveler: 5 }, schedule: [{ event: 'caravan_return', inDays: [5, 6] }] },
    onRefuse: { vars: { rel_traveler: -2 } },
  },

  // ───────── 미지의 종족 ─────────
  // ════════════════════ 인상서(수배) 시스템 — 재사용 가능한 패턴 ════════════════════
  // STORY.md 2장의 시너지 매트릭스를 데이터로 구현한 것. 아래 3개 사건이 모두 같은 뼈대를 쓴다.
  //
  //   1. 발령 이벤트(events.js) — 신문에 인상서/소문이 실리고, schedule 로 며칠 뒤 손님 예약
  //   2. 등장 손님(customers.js, 이 섹션) — 인상착의와 일치하는 손님이 온다
  //      · 축 A 가 2択이면 kind:'buy' 로 onSell(=돕는다)/onRefuse(=신고한다) 로 표현
  //      · 축 A 가 3択이면 kind:'talk' 로 choices[] 에 "돕는다/신고한다/침묵한다" 를 각각 둔다
  //   3. 후속 손님(축 B) — onSell 이 schedule 로 이벤트를 예약하고, 그 이벤트가 talk 손님을 spawn.
  //      선택지 자백/부인 중 부인은 lied_about_X 플래그를 남긴다
  //   4. 감사 이벤트(events.js) — lied_about_X 가 있으면 반복 평가되는 이벤트. cooldown + chance 로
  //      "걸릴 때까지 계속 위험이 남아 있음"을 구현. 천칭단원(liga_member)이면 소라껍데기가 미리 귀띔해 주는
  //      deny_safe 선택지가 열리고(marga/lisa) 감사에 걸릴 확률이 낮아진다(marga/lisa/kassim) — 천칭단 시너지
  //   5. 후일담 이벤트(4막, events.js) — 어느 세력이 이겼는지(축 C)에 따라 보상/낙인이 갈린다
  //
  // 신고(A2)를 고르면 즉시 안전하게 종결되고 이후 스토리가 전부 잠긴다 — "돕지 않으면 안전하지만
  // 재미와 보상이 준다"는 설계 의도 그대로.

  // ───────── 사건 1: 마르가 (STORY.md 2장 원안) — 축 B: 감찰청에 자백/부인 ─────────
  {
    id: 'marga', look: 'marga', name: '곡물 상인', race: '인간', job: '행상 (두건을 깊이 눌러썼다)', faction: 'village', trueFaction: 'goblin', portrait: '🌾',
    suspicious: true,
    stain: true,
    affil: { claim: 'village', seal: 'none', line: '동쪽 마을이요. 장사꾼한테 인장이 어디 있어요.' },
    spawn: { queuedOnly: true },
    greet: '(억양이 묘하다) 여행길에 {item} {qty}개, {offer}골드면 되죠?',
    request: { item: 'potion', qty: 4, offer: 48 },
    lines: {
      sold: '고마워요… (뺨의 흉터를 가리며 나간다)',
      refused: '…실례했어요. (서둘러 사라진다)',
    },
    onSell: { flags: ['sold_marga'], vars: { integrity: -1 }, schedule: [{ event: 'marga_inspector_visit', inDays: [3, 5] }] },
    onRefuse: { flags: ['refused_marga'] },
    // 인상서를 꺼내 대조해 봐야 부를 수 있다 (까마귀로 밀고해도 된다)
    extraChoices: [
      {
        id: 'call_guard', label: '감찰청에 알린다', needs: 'poster', ends: true,
        reply: '…(흉터를 감싸 쥔다) 그럴 줄 알았어요.',
        effects: { flags: ['reported_marga'], gold: 25, vars: { reputation: 1, rel_kingdom: 1, integrity: 2, collusion: 1, rel_goblin: -3 }, news: [{ cat: '왕국', text: '곡물 상인 마르가, 무기점 신고로 감찰청에 넘겨져' }] },
      },
    ],
    onReport: { flags: ['reported_marga'], vars: { rel_goblin: -3 } },
  },
  {
    id: 'marga_inspector', look: 'inspector_pila', name: '조사관 필라', race: '인간', job: '왕국 감찰관', faction: 'kingdom', portrait: '🕵️', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '심문', note: '마르가 판매 여부' },
    greet: '감찰청이오. 인상서 속 여인에게 판 적 있소?',
    choices: [
      { id: 'confess', label: '자백한다', reply: '협조에 감사하오. 벌금 30골드로 끝내겠소.', effects: { gold: -30, flags: ['confessed_marga'], vars: { collusion: 3, integrity: 1, rel_kingdom: 1, inspector_truth: 1 }, if: { when: { flag: 'informant_office' }, then: { vars: { inspector_truth_after: 1 } } } } },
      { id: 'deny', label: '잡아뗀다', reply: '…알겠소. (장부를 오래 본다)', effects: { flags: ['lied_about_marga'], vars: { integrity: -1 } } },
      { id: 'deny_safe', label: '귀띔대로 부인한다', when: { flag: 'marga_tipped' },
        reply: '…그렇소? 협조에 감사하오.',
        effects: { flags: ['lied_about_marga', 'marga_protected'] } },
    ],
  },
  {
    id: 'marga_returns', look: 'marga', name: '마르가', race: '인간', job: '서부 숲의 밀사 (정체를 숨기지 않는다)', faction: 'goblin', portrait: '🌙', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '답례', gold: 250 },
    greet: '그때 절 살렸죠. 족장님이 "숲의 은인"이래요. 답례예요.',
    choices: [
      { id: 'accept', label: '감사히 받는다', reply: '숲은 은혜를 잊지 않아요, 은인님.', effects: { gold: 250, vars: { rel_goblin: 5 }, flags: ['marga_thanked'] } },
    ],
  },

  // ───────── 사건 2: 두건 쓴 행상 카심 — 마왕군 첩자, 축 B: 감찰청 끄나풀에게 알릴지 숨길지 ─────────
  {
    id: 'kassim', look: 'kassim', name: '두건 쓴 행상 카심', race: '인간', job: '떠돌이 약재상(자칭)', faction: 'traveler', trueFaction: 'demonlord', portrait: '🧕',
    spawn: { queuedOnly: true },
    stain: true,
    affil: { claim: null, seal: 'none', line: '떠돌이 약재상한테 소속이며 인장이 어디 있겠소.' },
    greet: '(낮은 목소리) {item} {qty}개, {offer}골드. 묻지는 마시오.',
    request: { item: 'mana_crystal', qty: 3, offer: 90 },
    lines: { sold: '…좋은 거래였소.', refused: '…쳇. 딴 데를 알아보지.' },
    onSell: { flags: ['sold_kassim'], vars: { integrity: -1 }, schedule: [{ event: 'kassim_liga_contact', inDays: [3, 5] }] },
    onRefuse: {
      flags: ['reported_kassim'], gold: 20, vars: { reputation: 1, rel_kingdom: 1, integrity: 2 },
      news: [{ cat: '왕국', text: '두건 쓴 약재상 카심, 무기점 신고로 체포' }],
    },
  },
  {
    // id 는 옛 이름 그대로 (저장본·플래그 호환) — 지금은 천칭단이 아니라 감찰청 끄나풀
    id: 'liga_tipster_kassim', look: 'hooded', name: '이름 없는 전언자', race: '인간', job: '감찰청 끄나풀', faction: 'traveler', portrait: '🕵️', kind: 'talk',
    spawn: { queuedOnly: true },
    affil: { claim: null, seal: 'none', line: '누가 보냈는지는 알 것 없소. 감찰청 서류함은 귀가 밝다는 것만 알아 두시오.' },
    ask: { tag: '제보 요청', note: '카심 정체' },
    greet: '두건 쓴 약재상, 겉과 속이 다르다더군. 감찰청에 알릴 텐가?',
    choices: [
      { id: 'tell_liga', label: '감찰청에 알린다', reply: '현명하군. 감찰청은 협조를 기억하오.', effects: { vars: { integrity: 1, collusion: 2, inspector_truth: 1 }, if: { when: { flag: 'informant_office' }, then: { vars: { inspector_truth_after: 1 } } }, flags: ['kassim_told_liga'] } },
      { id: 'stay_silent', label: '말하지 않는다', reply: '좋을 대로. 서류함은 침묵도 적어 두지.', effects: { vars: { blackmarket: 2 }, flags: ['kassim_silent'], schedule: [{ event: 'kassim_audit', inDays: [5, 8] }] } },
    ],
  },

  // ───────── 사건 3: 여관 하녀 리사 — 축 A 3択 (돕는다 / 신고한다 / 침묵한다) ─────────
  {
    id: 'lisa_thrall', look: 'thrall', name: '여관 하녀 리사', race: '인간', job: '은서리 여관 하녀 (안색이 유난히 창백하다)', faction: 'village', kind: 'talk', portrait: '🕯️',
    spawn: { queuedOnly: true },
    ask: { tag: '사 달라', items: { potion: 3 }, gold: 40 },
    greet: '(목도리로 목을 가렸다) 물약 좀 나눠 주세요. 값은 넉넉히요.',
    choices: [
      { id: 'help', label: '물약 3병 (+40G)', when: { has: { item: 'potion', min: 3 } },
        reply: '…정말 감사해요. 잊지 않을게요.',
        effects: { take: { potion: 3 }, gold: 40, vars: { vampire_power: 3, rel_vampire: 2, integrity: -1 }, flags: ['helped_lisa'], schedule: [{ event: 'lisa_hunter_inquiry', inDays: [3, 5] }] } },
      { id: 'report', label: '사냥꾼에 알린다', reply: '…그렇군요. 어쩔 수 없죠.',
        effects: { vars: { rel_hunter: 3, reputation: 2, integrity: 2, collusion: 2 }, gold: 15, flags: ['reported_lisa'] } },
      { id: 'ignore', label: '못 본 척한다', reply: '…이해해요. 없던 일로 할게요.',
        effects: { vars: { integrity: 1 }, flags: ['refused_lisa_silent'] } },
    ],
  },
  {
    id: 'hunter_inquiry_lisa', look: 'hunter_scout', name: '조합원 데스', race: '인간', job: '은화살 사냥꾼 조합원', faction: 'hunter', portrait: '🏹', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '심문', note: '리사 행방' },
    greet: '창백한 여자애가 이 가게에 들렀다 들었소.',
    choices: [
      { id: 'confess', label: '사실대로 말한다', reply: '협조 고맙소. 벌금은 25골드요.', effects: { gold: -25, vars: { rel_hunter: 1, collusion: 2, integrity: 1, inspector_truth: 1 }, if: { when: { flag: 'informant_office' }, then: { vars: { inspector_truth_after: 1 } } }, flags: ['confessed_lisa'] } },
      { id: 'deny', label: '모른다고 한다', reply: '…그렇소? (문가에서 돌아본다)', effects: { vars: { rel_hunter: -1, integrity: -1 }, flags: ['lied_about_lisa'] } },
      { id: 'deny_safe', label: '귀띔대로 부인한다', when: { flag: 'lisa_tipped' },
        reply: '(데스가 어깨를 으쓱하고 나간다)', effects: { flags: ['lied_about_lisa', 'lisa_protected'] } },
    ],
  },

  // ════════════════════ 천칭단 — 어느 편도 아닌 "균형의 수호자" ════════════════════
  // 입버릇: "균형을 지키시오."  흐름: 평범한 행상의 질문 → 두건 쓴 자의 장부 제안(시험) → 정식 방문(소라껍데기) →
  // 밤마다 소라껍데기의 속삭임 (DayManager.rollWhisper · config.liga) → 세 번째 경고면 끝 (events.js liga_robbery)
  // {top} = 손님이 온 순간 주된 세력 중 가장 우호적인 곳, {rival} = 그 맞수 (World.textCtx)
  {
    // 1. 겉보기엔 그냥 행상 — 실은 천칭단. 어느 편이냐는 물음에 "장사를 할 뿐"이라 답해야 길이 열린다
    id: 'liga_merchant', look: 'traveler', name: '떠돌이 행상', race: '인간', job: '행상', faction: 'traveler', portrait: '🎒', kind: 'talk',
    spawn: { minDay: 12, when: { all: [{ topRel: { gte: 6 } }, { noFlag: 'liga_open' }, { noFlag: 'liga_closed' }] }, chance: 0.5 },
    ask: { tag: '질문', note: '어느 편인지' },
    greet: '요즘 {top} 쪽 손님이 부쩍 드나든다던데… 주인장은 요즘 어느 편이오?',
    choices: [
      { id: 'side', label: '{top} 편이오', reply: '그렇군. 장사 잘 되시오.', effects: { flags: ['liga_closed'] } },
      { id: 'neutral', label: '난 그냥 장사를 할 뿐이오', reply: '…알겠소.', effects: { flags: ['liga_open'], schedule: [{ event: 'liga_hooded_visit', inDays: [2, 3] }] } },
    ],
  },
  {
    // 2. 선두 세력의 맞수가 보낸 거간꾼인 척 — 선두 세력과의 거래 장부를 큰돈에 사겠다는 시험.
    //    팔면 "잠시 기다리게" 하고 사라진다(돈도 없고 아무것도 열리지 않는다). 거절하면 이튿날 정식 방문
    id: 'liga_hooded', look: 'liga_hooded', name: '두건 쓴 거간꾼', race: '인간', job: '{rival} 쪽 거간꾼 (자칭)', faction: 'traveler', portrait: '🧥', kind: 'talk',
    spawn: { queuedOnly: true },
    affil: { claim: null, seal: 'none', line: '{rival} 쪽 일을 봐 주는 사람이라고만 해 두지. 인장 같은 걸 들고 다닐 일은 아니오.' },
    ask: { tag: '제안', gold: 300, note: '{top} 거래 장부' },
    greet: '{top} 쪽과 거래한 장부, 300골드에 사겠소. 장부는 장부일 뿐 누구 손해도 아니오. 팔면 {rival} 쪽 손님들을 이 가게로 보내 주지.',
    choices: [
      { id: 'sell_ledger', label: '장부를 판다 (+300G)', reply: '…잠시 기다리게. (두건이 문밖으로 사라진 뒤, 다시 돌아오지 않는다)', effects: { flags: ['liga_leaked', 'liga_closed'] } },
      { id: 'refuse', label: '손님 장부는 못 파오', reply: '…그렇소. (문을 나서며 중얼거린다) 균형을 지키시오.', effects: { flags: ['liga_kept_quiet'], schedule: [{ event: 'liga_formal_visit', inDays: 1 }] } },
    ],
  },
  {
    // 3. 정식 방문 — 속삭이는 소라껍데기를 건네며 저울의 눈과 귀가 되어 달라고 한다.
    //    받으면 liga_member (+ 신문엔 "새로운 조직? {top} 세력이 커진 것으로 보여…" — 선두 세력의 앞잡이로 오해하게)
    //    liga_grace = 가입한 날 — 소라껍데기는 그 뒤 며칠(config.liga.warnEvery)은 말이 없다
    id: 'liga_envoy', look: 'liga_member', name: '천칭단원', race: '인간', job: '천칭단 (저울 문양 브로치)', faction: 'traveler', portrait: '⚖️', kind: 'talk',
    spawn: { queuedOnly: true },
    affil: { claim: null, seal: 'none', line: '우리는 어느 편에도 서지 않소. 균형을 지키시오.' },
    ask: { tag: '가입 권유', note: '속삭이는 소라껍데기' },
    greet: '천칭단이오. 당신은 장사꾼으로 남기에 아까운 존재요. 이 소라껍데기를 받고, 저울의 눈과 귀가 되어 주시오.',
    choices: [
      { id: 'accept', label: '소라껍데기를 받는다', reply: '밤마다 귀를 대 보시오. 저울이 기울면 껍데기가 먼저 알 거요. …균형을 지키시오.',
        effects: { flags: ['liga_member', 'liga_grace'], news: [{ cat: '소문', text: '새로운 조직의 등장? {top} 세력이 커진 것으로 보여…' }] } },
      { id: 'decline', label: '정중히 거절한다', reply: '아쉽군. 그래도 한마디는 남기지. 균형을 지키시오.', effects: { flags: ['liga_declined', 'liga_closed'] } },
    ],
  },

  // ════════════════════ "들어오면 알려 주오" — 귀한 물건을 기다리는 손님 ════════════════════
  // 찾는 물건이 없으면 "들어오면 기별하겠소"(효과 notify, ends)로 소원을 남기고 떠난다 → state.letters.wishes.
  // 물건을 구하면 까마귀 편지 "들어왔다고 알리기"로 부르고, 이튿날 웃돈을 얹어 사러 온다 (js/systems/Letters.js).
  // 8·10·12일째 손님은 까마귀(6일째부터)로 기별을 받는다. 물건은 도매상(미스릴 10일째~)·공급 제안 편지로 구한다.
  {
    id: 'wish_mithril', look: 'dwarf_smith', name: '갑옷장이 두린', race: '드워프', job: '떠돌이 갑옷장이', faction: 'dwarf', portrait: '⛏️',
    spawn: { day: 8, order: 3 },
    greet: '미스릴 갑옷 주문을 받았네. {item} {qty}개, {offer}골드.',
    request: { item: 'mithril_ore', qty: 1, offer: { mult: 1.4 } },
    lines: { sold: '이 빛깔이야. 좋은 갑옷이 나오겠네.', refused: '없나. 흠, 딴 데를 뒤지지.' },
    extraChoices: [
      { id: 'notify', label: '들어오면 기별하겠소', ends: true, when: { not: { has: { item: 'mithril_ore' } } },
        reply: '고맙네. 까마귀 편지를 기다리지.', effects: { notify: { item: 'mithril_ore', qty: 1, mult: 1.6 } } },
    ],
    onSell: { vars: { rel_dwarf: 1 } },
  },
  {
    id: 'wish_scale', look: 'knight_official', name: '갑옷장 세드릭', race: '인간', job: '제7기사단 갑옷장', faction: 'kingdom', portrait: '🛡️',
    spawn: { day: 10, order: 3 },
    greet: '단장님 흉갑에 댈 {item} {qty}장, {offer}골드.',
    request: { item: 'dragon_scale', qty: 1, offer: { mult: 1.4 } },
    lines: { sold: '용비늘이라니… 단장님이 기뻐하시겠소.', refused: '그렇소. 다른 방도를 찾지.' },
    extraChoices: [
      { id: 'notify', label: '들어오면 기별하겠소', ends: true, when: { not: { has: { item: 'dragon_scale' } } },
        reply: '부탁하오. 값은 더 쳐 드리리다.', effects: { notify: { item: 'dragon_scale', qty: 1, mult: 1.7 } } },
    ],
    onSell: { vars: { rel_kingdom: 1, kingdom_power: 1 } },
  },
  {
    id: 'wish_star', look: 'star_keeper', name: '별지기 오르나', race: '인간', job: '언덕 위 별지기 노파', faction: 'mage', portrait: '🔭', kind: 'talk',
    spawn: { day: 12, order: 3 },
    ask: { tag: '구해 달라', note: '별조각 1 · 들어오면 기별' },
    greet: '별조각을 찾소. 하나면 되오. 들어오면 알려 주겠소?',
    choices: [
      { id: 'notify', label: '들어오면 기별하겠소', when: { not: { has: { item: 'star_shard' } } },
        reply: '고맙구려. 별이 떨어지면 까마귀를 보내 주오.', effects: { notify: { item: 'star_shard', qty: 1, mult: 1.8 } } },
      { id: 'sell_now', label: '마침 있소 (340G)', when: { has: { item: 'star_shard' } },
        reply: '오, 따스하구려… 값은 넉넉히 쳤소.', effects: { take: { star_shard: 1 }, gold: 340, vars: { rel_mage: 1 } } },
      { id: 'decline', label: '구할 길이 없소', reply: '그렇겠지. 별은 제 마음대로 떨어지니.' },
    ],
  },
  {
    id: 'wish_fairy', look: 'noble_lady', name: '향수 장인 리네트', race: '인간', job: '"달빛 병" 향수 공방 주인', faction: 'guild', portrait: '🌸',
    spawn: { day: 15, order: 3 },
    greet: '새 향수에 넣을 {item} {qty}병, {offer}골드면 될까요?',
    request: { item: 'fairy_dust', qty: 3, offer: { mult: 1.4 } },
    lines: { sold: '반짝이는 향이 나겠네요. 고마워요.', refused: '아쉽네요. 딴 데를 알아볼게요.' },
    extraChoices: [
      { id: 'notify', label: '들어오면 기별하겠소', ends: true, when: { not: { has: { item: 'fairy_dust', min: 3 } } },
        reply: '좋아요. 까마귀 편지 기다릴게요.', effects: { notify: { item: 'fairy_dust', qty: 3, mult: 1.7 } } },
    ],
    onSell: { vars: { rel_guild: 1 } },
  },
  {
    id: 'wish_golem', look: 'puppeteer', name: '인형술사 핍', race: '인간', job: '태엽 인형 공방 견습', faction: 'golem', portrait: '🤖',
    spawn: { day: 18, order: 3 },
    greet: '제 인형에 심장을 달고 싶어요. {item} {qty}개, {offer}골드!',
    request: { item: 'golem_core', qty: 1, offer: { mult: 1.4 } },
    lines: { sold: '째깍! 움직여요! 고마워요!', refused: '역시 귀한 물건이구나….' },
    extraChoices: [
      { id: 'notify', label: '들어오면 기별하겠소', ends: true, when: { not: { has: { item: 'golem_core' } } },
        reply: '정말요? 매일 창밖만 볼게요!', effects: { notify: { item: 'golem_core', qty: 1, mult: 1.7 } } },
    ],
    onSell: { vars: { rel_golem: 1, golem_tech: 1 } },
  },

  // ════════════════════ 위장 감찰 ════════════════════
  {
    id: 'disguised_buyer', look: 'disguised_buyer', name: '낯선 손님', race: '인간', job: '신원 불명', faction: 'kingdom', trueFaction: 'bandit', portrait: '🕶',
    spawn: { queuedOnly: true },
    greet: '(속삭인다) 서류 없이 {item} {qty}개, {offer}골드. 비밀로.',
    request: { item: 'bow', qty: 2, offer: 260 },
    lines: { sold: '…고맙습니다. 오늘 일은 잊어 주세요.', refused: '…쳇, 다른 데 가 보죠.' },
    extraChoices: [
      { id: 'stall', label: '생각해 보겠소', ends: true, stall: true, reply: '…오래 기다리진 않아요. (문간에서 뒤를 돌아본다)' },
    ],
    reportDetail: '서류 없이 활을 모으던 자였소.',
    onReport: { vars: { integrity: 2, blackmarket: -1 } },
    stain: true, // 장부의 얼룩(illegal_sale)은 TransactionManager 가 남긴다
    affil: { claim: 'kingdom', seal: 'none', line: '…왕국 사람이에요. 인장은, 없어요. 그러니 조용히 온 거죠.' },
    onSell: { vars: { integrity: -2 }, schedule: [{ event: 'disguised_audit', inDays: [4, 7] }] }, // 암시장 활성도는 뒷거래 규칙이 올린다 (config.smuggling.offBooks)
    onRefuse: { vars: { integrity: 2 } },
  },

  // 「밀고자」 길 — "공식 제보처"가 된 가게에 담당 감찰관이 이따금 들른다 (events.js office_inspector_visit)
  {
    id: 'office_inspector', look: 'inspector_theo', name: '감찰관 테오', race: '인간', job: '왕국 감찰관 (제보처 담당)', faction: 'kingdom', portrait: '🕵️', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '심문', note: '드나든 수상한 손님' },
    greet: '제보처 담당 감찰관이오. 요즘 수상한 손님, 있었소?',
    choices: [
      { id: 'truth', label: '본 대로 말한다', reply: '협조에 감사하오. 서류함에 적어 두겠소.',
        effects: { vars: { collusion: 2, rel_kingdom: 1, inspector_truth: 1 }, if: { when: { flag: 'informant_office' }, then: { vars: { inspector_truth_after: 1 } } },
          news: [{ cat: '왕국', text: '감찰청, 제보처 진술 따라 뒷골목 탐문' }] } },
      { id: 'lie', label: '아무도 못 봤다', reply: '…그렇소? 제보처가 조용하면 곤란한데 말이오.',
        effects: { vars: { collusion: -1, rel_kingdom: -1 } } },
    ],
  },

  // ════════════════════ 4막: 적대 세력 동시 방문 ════════════════════
  {
    id: 'envoy_kingdom_final', look: 'knight_official', name: '기사단 특사 로델', race: '인간', job: '제7기사단 특사', faction: 'kingdom', portrait: '🤺',
    spawn: { queuedOnly: true },
    greet: '마지막 기회요. {item} {qty}자루, {offer}골드. 지금 답하시오.',
    request: { item: 'iron_sword', qty: 4, offer: 220 },
    lines: { sold: '좋소. 왕국은 이 순간을 기억할 것이오.', refused: '…그쪽으로 마음을 정했구려.' },
    onSell: { flags: ['helped_kingdom_final'], vars: { kingdom_power: 4 } },
    onRefuse: { vars: { rel_kingdom: -3 } },
  },
  {
    id: 'envoy_goblin_final', look: 'goblin_envoy', name: '부족 특사 크루낙', race: '고블린', job: '족장의 최종 사절', faction: 'goblin', portrait: '👹',
    spawn: { queuedOnly: true },
    greet: '지금이라구, 인간! {item} {qty}개, {offer}골드다구! 대답해, 대답!',
    request: { item: 'iron_sword', qty: 4, offer: 320 },
    lines: { sold: '킥킥! 이제 뒤는 안 돌아본다구!', refused: '…흥. 크루낙은 어느 쪽인지 알겠다구.' },
    onSell: { flags: ['helped_goblin_final'], vars: { goblin_power: 4 } },
    onRefuse: { vars: { rel_goblin: -3 } },
  },
  {
    id: 'envoy_demonlord_final', look: 'demon_herald', name: '흑기사 그라우스', race: '마족', job: '마왕의 최종 전령', faction: 'demonlord', portrait: '💀',
    spawn: { queuedOnly: true },
    greet: '폐하의 마지막 물음이다. {item} {qty}자루, {offer}골드.',
    request: { item: 'iron_sword', qty: 5, offer: 400 },
    lines: { sold: '현명하다. 폐하께서 기억하신다.', refused: '…후회하게 될 거다.' },
    onSell: { flags: ['helped_demonlord_final'], vars: { demonlord_power: 5, invasion_risk: 4 } },
    onRefuse: { vars: { rel_demonlord: -3 } },
  },

  {
    // 밤중 문 두드림 — 가게 손님으로는 오지 않는다 (spawn.queuedOnly). 마감 때 DayManager.closeShop 이 knock 으로 굴려 두고,
    // "잠자리에 든다"를 누르면 방문 너머에서 두드리는 밤 장면이 뜬다 (UIManager night). 열기 전에는 누군지 모른다.
    // knock: { id, when, chance, once } — 먼저 적힌 틀부터 굴린다. once 면 한 번 두드린 뒤 {id}_knocked 플래그로 다시 오지 않는다.
    // opens: 문을 열면 서 있는 자 (그 틀의 greet · choices · reply 가 이어진다)
    // 12일 이후 매일 밤 5%, 한 번뿐. 열면 ??? (star_visitor)
    id: 'night_knock', look: 'hooded', name: '…', race: '?', job: '문밖 (얼굴이 보이지 않는다)', faction: 'unknown', portrait: '🚪', kind: 'talk', late: true,
    spawn: { queuedOnly: true },
    knock: { id: 'star', when: { day: { gte: 12 } }, chance: 0.05, once: true }, // 3단계: 15일~1% 는 복권이었다 (자연 플레이 120판 중 별조각 3판)
    ask: { tag: '문 두드림', note: '밤늦게 누군가' },
    greet: '(잠자리에 들려는데, 누군가 방문을 두드린다.)',
    choices: [
      { id: 'open', label: '문을 연다', reply: '(문틈으로 차가운 빛이 스민다)', opens: 'star_visitor' },
      { id: 'ignore', label: '모른 척한다', reply: '(두드림이 멎었다. 발소리는 들리지 않았다.)', effects: { flags: ['star_ignored'] } },
    ],
  },
  {
    // 똑같이 문을 두드리지만 열어 보면 강도 — 12일 이후 매일 밤 3%, 여러 번. 선택지는 하나뿐, 금고의 25%(최대 300G)를 잃는다
    id: 'night_knock_robber', look: 'hooded', name: '…', race: '?', job: '문밖 (얼굴이 보이지 않는다)', faction: 'unknown', trueFaction: 'bandit', portrait: '🚪', kind: 'talk', late: true,
    spawn: { queuedOnly: true },
    knock: { id: 'robber', when: { day: { gte: 12 } }, chance: 0.03 },
    ask: { tag: '문 두드림', note: '밤늦게 누군가' },
    greet: '(잠자리에 들려는데, 누군가 방문을 두드린다.)',
    choices: [
      { id: 'open', label: '문을 연다', reply: '(문이 열리자마자 누군가 밀고 들어온다)', opens: 'night_robber' },
    ],
  },
  {
    // 밤 장면에서 문을 열었을 때 (night_knock_robber → opens). night: 밤 장면에서 쓸 그림 칸 · 들어서는 모양
    id: 'night_robber', look: 'bandit', name: '복면 쓴 사내', race: '인간', job: '밤손님', faction: 'bandit', portrait: '🗡️', kind: 'talk', late: true,
    spawn: { queuedOnly: true },
    night: { frame: 'angry', enter: 'burst' },
    ask: { tag: '강도', note: '금고' },
    greet: '조용히. 소리 내지 말고 금고나 열어.',
    choices: [
      { id: 'give_gold', label: '…고개를 숙인다', reply: '(사내가 금고를 뒤져 금화를 쓸어 담고 사라진다. 문이 활짝 열린 채 흔들린다)',
        effects: { steal: { pct: 0.25, max: 300 }, vars: { bandit_power: 1 }, news: [{ cat: '장부', text: '밤사이 누가 다녀갔다… 금고에서 {stolen}골드가 사라졌다.' }] } },
    ],
  },
  {
    // 밤중에 문을 열었더니 서 있던 자. 100G 를 주면 별조각을 준다.
    // 별조각은 까마귀로 대성당에 보내 기도하게 하면 하늘이 대답한다 (letters.js star → events.js star_answer → 엔딩 star_guests).
    // 다른 곳에 보내면 그쪽 이야기로 이어질 뿐이고, 갖고만 있으면 아무 일도 없다.
    id: 'star_visitor', look: 'star_visitor', name: '???', race: '???', job: '별 아래에서 온 자', faction: 'unknown', portrait: '✴️', kind: 'talk', late: true,
    spawn: { queuedOnly: true },
    night: { frame: 'idle', enter: 'glow' }, // 밤 장면: 차가운 역광 속 실루엣
    ask: { tag: '교환', gold: -100, items: { star_shard: 1 }, give: true, note: '반짝이는 것 백 닢' },
    greet: '(머릿속 목소리) …반짝이는 것 백 닢. 대신 하늘 한 조각을 주마.',
    choices: [
      {
        id: 'pay', label: '100G를 준다', when: { gold: { gte: 100 } },
        reply: '…이것으로 하늘에 물을 수 있다. 누구에게 맡길지는 너의 몫.',
        effects: { gold: -100, give: { star_shard: 1 }, vars: { rel_unknown: 4 }, flags: ['star_bought'] },
      },
      {
        id: 'decline', label: '문을 닫는다',
        reply: '…닫힌 문. 그것도 대답이다.',
        effects: { vars: { rel_unknown: -2 }, flags: ['star_silence'] },
      },
    ],
  },

  // ───────── 감정 확대경: 밀랍 인장 대조 ─────────
  // docCheck: { seed, forged, onCorrect, onWrong } — UIManager의 "🔍 감정 확대경" 버튼이
  // WS.sys.DocCheck.render(seed, false)(규정집 원본)와 render(seed, forged)(손님의 인장)를
  // 나란히 그린다. forged:false 면 항상 원본과 완전히 같고, forged:true 면 딱 하나만 다르다.
  // 판정 자체는 onSell/onRefuse와 별개로 즉시 적용되며(flags: docCheck_correct/docCheck_wrong),
  // 실제 판매 여부는 평소처럼 매입/거절 버튼으로 따로 정한다.
  {
    id: 'permit_dubious', look: 'hooded', name: '두건 쓴 통행인', race: '인간', job: '통행 인장을 든 나그네', faction: 'kingdom', trueFaction: 'bandit', portrait: '🎭',
    spawn: { queuedOnly: true },
    stain: true,
    affil: { claim: 'royal', seal: 'fake', sealOf: 'royal', line: '왕실 통행 인장이오. 보면 알 거요.' },
    greet: '왕실 통행 인장이오. {item} {qty}자루, {offer}골드.',
    request: { item: 'iron_sword', qty: 2, offer: 60 },
    lines: { sold: '고맙군. 이 인장은 어디서든 통하오.', refused: '흥. 다른 가게를 찾지.' },
    docCheck: {
      seed: 'permit_dubious', forged: true,
      onCorrect: { vars: { reputation: 3, rel_kingdom: 2, blackmarket: -2 }, flags: ['caught_forged_permit'] },
      onWrong: { flags: ['let_forger_through'], vars: { blackmarket: 2 }, schedule: [{ event: 'forged_permit_fallout', inDays: [3, 4] }] },
    },
    onSell: { flags: ['sold_permit_dubious'] },
  },
  {
    id: 'noble_courier', look: 'noble_courier', name: '전령 다리우스', race: '인간', job: '왕실 전령', faction: 'kingdom', portrait: '📯',
    spawn: { queuedOnly: true },
    affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '국왕 직속 전령이오. 신분패의 인장을 보시오.' },
    greet: '왕실 전령이오. 신분패요. {item} {qty}개, {offer}골드.',
    request: { item: 'bow', qty: 2, offer: 90 },
    lines: { sold: '고맙소. 왕실은 신뢰를 잊지 않소.', refused: '…신분패가 가짜로 보였나 보오.' },
    docCheck: {
      seed: 'noble_courier', forged: false,
      onCorrect: { vars: { rel_kingdom: 3, reputation: 1 }, flags: ['trusted_courier'] },
      onWrong: { vars: { rel_kingdom: -4, reputation: -2 }, flags: ['wrongly_accused_courier'] },
    },
    onSell: { vars: { rel_kingdom: 1 } },
  },
  {
    id: 'militia_forager', look: 'militia_forager', name: '"자경단원"', race: '인간', job: '동쪽 마을 자경단원(자칭)', faction: 'village', trueFaction: 'bandit', portrait: '🎭',
    spawn: { queuedOnly: true },
    stain: true,
    affil: { claim: 'village', seal: 'fake', line: '동쪽 마을 자경단이오. 허가서에 인장 찍혀 있소.' },
    greet: '자경단이오. 구매 허가서요. {item} {qty}개, {offer}골드.',
    request: { item: 'shield', qty: 2, offer: 45 },
    lines: { sold: '고맙소. 마을을 위해 쓰겠소.', refused: '…쳇. 마을 사정을 몰라주는군.' },
    docCheck: {
      seed: 'militia_forager', forged: true,
      onCorrect: { vars: { reputation: 2, rel_village: 2 }, flags: ['caught_militia_forger'] },
      onWrong: { flags: ['armed_bandit_disguise'], vars: { blackmarket: 1 }, schedule: [{ event: 'militia_forger_fallout', inDays: [2, 3] }] },
    },
    onSell: { flags: ['sold_militia_forager'] },
  },
  // ───────── 궁핍한 손님 (config.poor · TransactionManager.gift / forgive) ─────────
  // poor: { style } → 시세보다 낮은 값을 부르는 이 손님에게 덤을 얹거나 값을 면제해 줄 수 있다. 말투 style: 'yo' 해요체 / 'hao' 하오체
  {
    id: 'poor_goth', look: 'goth', name: '대장장이 고트', race: '인간', job: '동쪽 마을 대장장이', faction: 'village', portrait: '🔨',
    spawn: { when: { day: { gte: 6 } }, chance: 0.04, minDay: 6 },
    poor: { style: 'hao' },
    greet: '마을 대장간이 쉰 지 오래요. {item} {qty}개, 가진 게 {offer}골드뿐이오… 외상은 안 되겠소?',
    request: { item: 'iron_ore', qty: 3, offer: { mult: 0.6 } },
    lines: { sold: '…고맙소. 화덕에 다시 불을 지피겠소.', refused: '허탕이로군. 그럼 이만.' },
  },
  {
    id: 'poor_masa', look: 'herbalist', name: '약초꾼 마사', race: '인간', job: '마을 약초꾼', faction: 'village', portrait: '🌿',
    spawn: { when: { day: { gte: 6 } }, chance: 0.04, minDay: 6 },
    poor: { style: 'yo' },
    greet: '약재로 쓸 {item} {qty}개만요. 아픈 아이가 있는데 가진 돈이 {offer}골드뿐이에요…',
    request: { item: 'bone_dust', qty: 2, offer: { mult: 0.6 } },
    lines: { sold: '고마워요. 아이가 좋아질 거예요.', refused: '그럼 딴 데 가 봐야겠네요…' },
  },
  // 덤을 받은 궁핍한 손님이 며칠 뒤 보답하러 온다 — 이름·모습·보답은 예약할 때(TransactionManager.scheduleGrate) 정해 spawnQueue 의 grate 에 담긴다 (CustomerManager.applyGrateful)
  {
    id: 'grateful_visit', look: 'traveler', name: '지난번 손님', race: '인간', job: '보답하러 온 손님', faction: 'village', portrait: '🙇', kind: 'talk',
    spawn: { queuedOnly: true },
    ask: { tag: '보답', note: '덤을 받은 손님' },
    greet: '지난번 은혜를 갚으러 왔소.',
    choices: [
      { id: 'grate_accept', label: '고맙게 받겠소', grate: 'accept', reply: '{gAccept}' },
      { id: 'grate_decline', label: '마음만 받겠소', grate: 'decline', reply: '{gDecline}' },
    ],
  },
  // 덤 받은 손님이 가게 얘기를 퍼뜨려 다음 날 찾아온 마을 사람 (config.poor.spread)
  {
    id: 'word_villager', look: 'traveler', name: '마을 주민', race: '인간', job: '동쪽 마을 주민', faction: 'village', portrait: '🧑‍🌾',
    spawn: { queuedOnly: true },
    greet: '덤을 얹어 주는 가게가 있다고 들었어요. {item} {qty}개, {offer}G에 부탁해요.',
    request: { item: 'potion', qty: 2, offer: { mult: 1 } },
    lines: { sold: '고마워요. 소문대로네요.', refused: '아… 없어요? 다음에 다시 올게요.' },
  },
];

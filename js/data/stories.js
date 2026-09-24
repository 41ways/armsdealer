// 인물 이야기 네 편 — 같은 얼굴이 몇 번이고 다시 찾아오고, 그때 한 선택이 나중 얼굴·편지·신문·엔딩에 드러난다.
// (Papers, Please 의 단골들처럼.) 데이터만 — 손님은 WS.data.customers, 사건은 WS.data.events 에 덧붙인다.
// 이 파일은 customers.js · events.js · news.js · letters.js · config.js 뒤에 읽혀야 한다 (index.html 데이터 칸).
//
// ① 레온 (d1_knight 의 뒷이야기)
//    1일 칼 → 2일 방패(고블린에게 칼을 팔았을 때) → 8일 이 나간 칼(leon_chipped / 고블린에게 칼 3자루 넘게 팔았으면 leon_chipped_g)
//    → 17일 분대 방패 외상(leon_squad) → 24일 새벽 서부 숲 전투(leon_battle) → 25일~ 마지막 방문 하나
//      · leon_commander  기사단장 — 납품 계약(leon_commander_visit: 계약 / 누구에게나 판다) → 엔딩 knight_commander '기사단장의 친구'
//      · leon_fell       전사 — 종자가 유품을 들고 온다(leon_squire). 분대 외상값은 떼인다
//      · leon_tavern     칼을 내려놓고 여관 — 갑옷을 팔러 온다(leon_innkeeper)
//                        (기사단장 조건을 채웠는데 단장길이 닫혔으면 leon_passed_over — 습격대는 막았지만 단장 자리는 남에게, 역시 여관)
//    정(leon_bond): 1일 판매 +1 / 거절 −2 · 2일 판매 +1 / 거절 −1 · 8일 +3~−2 · 17일 ±2
//    전사: 고블린에게 무기 14자루 이상, 또는 8자루 이상 팔고 분대 방패를 안 댔을 때, 또는 정이 −2 이하인데 방패도 안 댔을 때
//    기사단장: 분대 방패를 댔고, 정 3 이상, 고블린에게 판 무기 8자루 미만 (위장 손님에게 판 것도 센다 — 가짜 기사 모르간의 6자루 등)
//              그리고 단장길이 닫히지 않았을 것 — 9일째부터 고블린에게 칼(태그 blade — 붉은 칼날·강철검·은검 같은 옛 이름도 칼이다)을 한 자루라도
//              팔거나 교환으로 넘기면 leon_route_closed (활·도끼·방패·물약 등은 괜찮다)
//    계약 뒤(leon_contract): 고블린과는 어떤 거래도 안 된다 — 팔기·사들이기·교환·물건이나 돈이 오간 대화 (조건 dealt).
//      한 번이라도 하면 이튿날 새벽 leon_contract_broken + 레온의 편지("계약은 없던 걸로 하지")
//      계약이 이어지는 동안 이틀마다 제7기사단 보급관이 칼(leon_supply_swords)이나 방패(leon_supply_shields)를 시세 그대로 사 간다
//      고블린을 돌려보내면 관계가 1씩 준다 (factions.js goblin perDeal.refuse) — 발길은 줄어도 끊기진 않는다 (visit.min)
//
// ② 견습생 핀 (새 인물)
//    4일 일자리(pin_hire): 들인다 / 빵값만 / 내보낸다
//      들였으면 → 10일 가불(pin_advance) → 16일 "쥐꼬리" 벤이 견습생을 빌려 달라(ben_fence: 몫 / 핀에게 알림 / 경비대)
//        → 19일 새벽 그날 밤(pin_night): 훔쳤으면 pin_caught(믿는다 / 경비대 / 빚을 갚아 준다), 버텼으면 pin_proud
//        → 28일 진로(pin_future): 가게를 물려받아라(믿음 8+) / 브론 공방 / 기사단 / 제 길을 가라 → 36일 대장장이가 되어 칼을 팔러 옴
//      안 들였으면 → 14일 길에서(pin_street): 칼 한 자루(종자 → 병사) / 이제라도 들인다 / 없다(행방불명·도둑)
//    결말: 가게 후계(pin_heir → 엔딩 pin_heir) · 대장장이 · 병사 · 도둑 · 행방불명
//    하루 삯은 기본 임대료의 2할(원래 4G)로 임대료에 붙는다 (config.js rentMods). 대신 사흘마다 심부름 삯 8G · 평판 +1
//
// ③ 은화 저울 상회 — 가게를 살 때 진 빚 500G
//    수금 6·12·18·26일 (80 · 110 · 140 · 170G) → 밀린 게 있으면 34일 잔금 청산
//    평범한 대부업자(상인 길드 쪽)다. 뒷골목과 얽힌 데는 없다.
//    선택: 낸다(밀린 것까지 한꺼번에 내면 경고가 지워진다) / 이번 것만 / 손님 장부·독병으로 낸다(그 할부 대신)
//          / 다음에(이자 30G, 경고 +1) / 내쫓는다(이자 30G, 경고 +2, 이튿날 밤 유리창이 깨진다)
//    경고 3 → 26일 전에는 행패(debt_pressure, 나흘마다)로 압박만 한다. 26일(마지막 할부) 뒤에도 경고가 3이면 집행관(debt_bailiff):
//    전부 낸다(금화가 있을 때만) / 열쇠를 넘긴다(→ 압류 = 파산 엔딩 bankrupt 의 shop_seized 변형). 너무 일찍 게임이 끝나지 않게 압류는 뒤쪽에만 둔다
//    34일 잔금 청산(debt_final)도 같다 — 못 내면 열쇠를 넘긴다
//    결말: debt_cleared 완납 · shop_seized 압류(→ 파산) · garret_paid_debt 전 주인이 대신 갚음
//    예고: 수금원 대사 · 관계·소문 탭("은화 저울 상회 장부") · 독촉장/수금 예고 편지(14일~) · 신문
//
// ④ 전 주인의 비밀 — 붉은여울 학살
//    14일 목수가 서류함 밑에서 옛 장부를 찾는다(carpenter_ledger: 간직 / 태움 / 경비대)
//    → 20일 붉은여울 과부 에다(widow_eda: 장부를 보여 줌 / 위로금 / 모른다) → 25일 가렛의 편지
//    → 27일 전 주인 가렛(garret_return: 동업 / 빚 대신 동업 / 장부를 판다 / 경비대 / 나가라)
//    → 동업하면 사나흘 뒤 짐마차(garret_caravan): 붙잡힘(garret_caught) 또는 마을 습격(garret_raid → 엔딩 red_ford_again)
//    → 33일~ 에다가 다시 온다: 가렛이 붙잡혔으면 eda_gift, 습격이 났으면 eda_curse(자수하면 엔딩을 피한다)
//
// 뒷이야기 한 줄씩은 js/data/epilogues.js.
(() => {
  const C = WS.data.customers;
  const E = WS.data.events;

  const gobWeapons = min => ({ sold: { faction: 'goblin', tag: 'weapon', min } });
  // 9일째부터 고블린에게 칼을 한 자루라도 (교환 포함) — 레온의 단장길이 닫힌다
  const gobBladeLate = { sold: { faction: 'goblin', tag: 'blade', fromDay: 9, trades: true } };
  // 레온과 계약서를 쓴 뒤의 고블린 거래 (종류 불문 — Conditions dealt)
  const gobDealAfterContract = { dealt: { faction: 'goblin', after: { tpl: 'leon_commander_visit', action: 'sign' } } };
  const contractLive = [{ flag: 'leon_contract' }, { noFlag: 'leon_contract_broken' }];

  // ════════════════════ ① 레온 ════════════════════
  C.push(
    {
      // 8일째: 고블린에게 칼을 3자루 넘게 팔지 않았을 때
      id: 'leon_chipped', look: 'knight', name: '레온', race: '인간', job: '제7기사단 기사', faction: 'kingdom', portrait: '🤺', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 8 } }, { not: gobWeapons(3) }, { not: { customerSeen: 'leon_chipped_g' } }] } },
      ask: { tag: '칼 교체', items: { iron_sword: 1 }, gold: 40, note: '이 나간 칼 대신' },
      greet: '고블린들이 강철을 들었더군. 칼 이가 나갔소. …참, 단장님 말씀이오. 숲에 칼을 대는 가게는 기사단 납품 명부에서 뺀다고 하셨소.',
      greetWhen: [{ when: { var: 'leon_bond', gte: 2 }, text: '고블린들이 강철을 들었더군. 칼 이가 나갔네. …참, 단장님 말씀일세. 숲에 칼을 대는 가게는 기사단 납품 명부에서 뺀다고 하시더군.' }],
      choices: [
        {
          id: 'gift', label: '새 칼을 그냥 준다', when: { has: { item: 'iron_sword' } },
          reply: '…빚을 졌구려. 레온은 빚을 잊지 않소.',
          effects: { take: { iron_sword: 1 }, vars: { leon_bond: 2, rel_kingdom: 1 }, flags: ['leon_gift'] },
        },
        {
          id: 'sell', label: '새 칼을 판다 (+40G)', when: { has: { item: 'iron_sword' } },
          reply: '값은 치르겠소. 기사 봉급이 박해서.',
          effects: { take: { iron_sword: 1 }, gold: 40, vars: { leon_bond: 1 }, flags: ['leon_rearmed'] },
        },
        {
          id: 'none', label: '줄 칼이 없소',
          reply: '…이 칼로 버텨 보겠소.',
          effects: { vars: { leon_bond: -1 }, flags: ['leon_unarmed'] },
        },
      ],
    },
    {
      // 8일째: 고블린에게 칼을 3자루 넘게 팔았을 때 — 그 칼이 이 가게 것이란 걸 안다
      id: 'leon_chipped_g', look: 'knight', name: '레온', race: '인간', job: '제7기사단 기사', faction: 'kingdom', portrait: '🤺', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 8 } }, gobWeapons(3), { not: { customerSeen: 'leon_chipped' } }] } },
      ask: { tag: '칼 교체', items: { iron_sword: 1 }, gold: 40, note: '이 나간 칼 대신' },
      greet: '고블린 칼에 이가 나갔소. 그 칼, 이 가게 각인이더군. 단장님 귀에 들어가면 이 가게는 명부에서 빠질 것이오.',
      choices: [
        {
          id: 'admit', label: '인정하고 칼을 준다', when: { has: { item: 'iron_sword' } },
          reply: '…솔직하구려. 다음엔 숲에 팔지 마시오.',
          effects: { take: { iron_sword: 1 }, vars: { leon_bond: 3, rel_goblin: -1 }, flags: ['leon_told_truth', 'leon_gift'] },
        },
        {
          id: 'lie', label: '모르는 칼이오 (+40G)', when: { has: { item: 'iron_sword' } },
          reply: '…그렇다 치겠소. (칼값을 세어 둔다)',
          effects: { take: { iron_sword: 1 }, gold: 40, flags: ['leon_lied', 'leon_rearmed'] },
        },
        {
          id: 'none', label: '줄 칼이 없소',
          reply: '숲에는 칼이 넘치는데 말이오.',
          effects: { vars: { leon_bond: -2 }, flags: ['leon_unarmed'] },
        },
      ],
    },
    {
      // 17일째: 분대장이 되어 방패를 외상으로. 레온이 쓰러지면 외상값은 떼인다
      id: 'leon_squad', look: 'knight', name: '분대장 레온', race: '인간', job: '제7기사단 분대장', faction: 'kingdom', portrait: '🤺',
      spawn: { when: { day: { gte: 17 } } },
      greet: '분대장이 됐소. {item} {qty}개, {offer}G. 대부분 외상이오.',
      greetWhen: [{ when: { var: 'leon_bond', gte: 2 }, text: '분대장이 됐다네. {item} {qty}개, {offer}G. 대부분 외상이네만, 자네 가게니 믿고 오네.' }],
      request: { item: 'shield', qty: 4, offer: { mult: 1 }, partialOk: true },
      payment: { credit: { now: 0.25, inDays: [9, 10], defaultWhen: { flag: 'leon_fell' }, defaultText: '레온 분대의 외상값 {amount}G는 받을 사람이 없다. 분대는 서부 숲에서 돌아오지 않았다.' } },
      lines: { sold: '분대원 넷이 이 방패 뒤에 서게 되오. 고맙소.', partial: '모자란 자리는 내가 서겠소.', refused: '…외상은 안 되는군. 알겠소.' },
      onSell: { vars: { leon_bond: 2, rel_kingdom: 1 }, flags: ['leon_squad_armed'], news: [{ cat: '왕국', text: '레온 분대, 새 방패 넷 들고 서부 숲 초소로' }] },
      onRefuse: { vars: { leon_bond: -2 }, flags: ['leon_squad_refused'] },
    },
    {
      id: 'leon_commander_visit', look: 'knight', name: '기사단장 레온', race: '인간', job: '제7기사단 단장', faction: 'kingdom', portrait: '🤺', kind: 'talk',
      spawn: { when: { all: [{ flag: 'leon_commander' }, { day: { gte: 25 } }] } },
      ask: { tag: '납품 계약', gold: 150, note: '고블린과 거래 금지' },
      greet: '기사단장이 됐네. 납품을 맡기겠네. 단, 고블린과는 어떤 거래도 하지 말게. 칼 한 자루라도 숲으로 가면 계약은 끝일세.',
      choices: [
        {
          id: 'sign', label: '계약한다 (+150G)',
          reply: '좋네. 이틀마다 보급관이 들를 걸세. 값은 시세대로 치르지.',
          effects: { gold: 150, vars: { rel_kingdom: 4, reputation: 2, leon_bond: 1 }, flags: ['leon_contract'] },
        },
        {
          id: 'decline', label: '누구에게나 판다',
          reply: '장사꾼이로군. …그래도 고마웠네.',
          effects: { vars: { leon_bond: -1 }, flags: ['leon_contract_declined'] },
        },
      ],
    },
    // 계약 보급 마차 — 계약이 이어지는 동안 이틀마다 둘 중 하나가 온다 (사건 leon_supply_wagon). 시세 그대로
    {
      id: 'leon_supply_swords', look: 'soldier', name: '보급관 에드윈', race: '인간', job: '제7기사단 보급관', faction: 'kingdom', portrait: '📦',
      spawn: { queuedOnly: true },
      greet: '제7기사단 보급 마차요. 계약 물량 {item} {qty}자루, {offer}G. 값은 시세대로 치르오.',
      request: { item: 'iron_sword', qty: 3, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '단장님께 그대로 전하겠소.', partial: '모자란 건 다음 마차에 싣겠소.', refused: '…계약 물량인데. 단장님께 말씀드리겠소.' },
      onSell: { vars: { rel_kingdom: 1 } },
    },
    {
      id: 'leon_supply_shields', look: 'soldier', name: '보급관 에드윈', race: '인간', job: '제7기사단 보급관', faction: 'kingdom', portrait: '📦',
      spawn: { queuedOnly: true },
      greet: '제7기사단 보급 마차요. 계약 물량 {item} {qty}개, {offer}G. 값은 시세대로 치르오.',
      request: { item: 'shield', qty: 4, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '초소마다 하나씩 걸겠소.', partial: '모자란 건 다음 마차에 싣겠소.', refused: '…계약 물량인데. 단장님께 말씀드리겠소.' },
      onSell: { vars: { rel_kingdom: 1 } },
    },
    {
      id: 'leon_squire', look: 'soldier', name: '종자 토마스', race: '인간', job: '레온 경의 종자', faction: 'kingdom', portrait: '🛡️', kind: 'talk',
      spawn: { when: { all: [{ flag: 'leon_fell' }, { day: { gte: 25 } }] } },
      ask: { tag: '유품', items: { iron_sword: 1 }, give: true, note: '레온 경의 칼' },
      greet: '레온 경의 칼이에요. 이 가게에 돌려드리랬어요.',
      choices: [
        {
          id: 'keep', label: '칼을 받는다',
          reply: '…경은 이 가게 칼을 좋아했어요.',
          effects: { give: { iron_sword: 1 }, flags: ['leon_sword_kept'] },
        },
        {
          id: 'funeral', label: '장례비 50G를 보탠다', when: { gold: { gte: 50 } },
          reply: '분대원들이 고마워할 거예요.',
          effects: { gold: -50, vars: { rel_kingdom: 2, reputation: 1 }, flags: ['leon_mourned'] },
        },
        {
          id: 'refuse', label: '받을 수 없소',
          reply: '…그럼 무덤에 꽂아 두죠.',
          effects: { flags: ['leon_sword_refused'] },
        },
      ],
    },
    {
      id: 'leon_innkeeper', look: 'knight', name: '레온', race: '인간', job: '전직 기사 (여관을 차린다)', faction: 'kingdom', portrait: '🍺', kind: 'sell',
      spawn: { when: { all: [{ flag: 'leon_tavern' }, { day: { gte: 25 } }] } },
      greet: '칼을 내려놓았소. 여관 밑천으로 {item} {qty}벌, {offer}G.',
      greetWhen: [{ when: { var: 'leon_bond', gte: 3 }, text: '칼을 내려놨네. 여관 밑천으로 {item} {qty}벌, {offer}G.' }],
      request: { item: 'plate_armor', qty: 1, price: 90 },
      lines: { bought: '여관 이름은 "이 빠진 칼"이오. 들르시오.', declined: '…고철상에 가 보겠소.' },
      onBuy: { vars: { leon_bond: 1 }, flags: ['leon_armor_bought'] },
      onRefuse: { flags: ['leon_armor_declined'] },
    },
    {
      // 레온 분대원의 한마디 — 분대 방패를 댄 뒤
      id: 'squad_soldier', look: 'soldier', name: '분대원 해롤드', race: '인간', job: '레온 분대 창병', faction: 'kingdom', portrait: '💂',
      spawn: { when: { all: [{ flag: 'leon_squad_armed' }, { day: { gte: 20 } }, { noFlag: 'leon_fell' }] } },
      greet: '레온 분대원이오. 방패 덕에 살았소. {item} {qty}병.',
      request: { item: 'potion', qty: 2, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '분대장님이 이 가게 얘길 자주 하오.', refused: '…분대장님 말과 다르군.' },
    },
  );

  E.push(
    // 1·2일의 선택이 레온의 정에 남는다 (customers.js d1_knight · d2_leon_worried)
    { id: 'leon_bond_d1', once: true, priority: 95, when: { choice: ['d1_knight', 'sell'] }, effects: { vars: { leon_bond: 1 } } },
    { id: 'leon_bond_d1_refused', once: true, priority: 95, when: { choice: ['d1_knight', 'refuse'] }, effects: { vars: { leon_bond: -2 }, flags: ['refused_leon'] } },
    { id: 'leon_bond_d2', once: true, priority: 95, when: { choice: ['d2_leon_worried', 'sell'] }, effects: { vars: { leon_bond: 1 } } },
    { id: 'leon_bond_d2_refused', once: true, priority: 95, when: { choice: ['d2_leon_worried', 'refuse'] }, effects: { vars: { leon_bond: -1 } } },
    {
      // 24일 새벽: 서부 숲 전투 — 고블린에게 판 칼 × 분대 방패 × 레온과의 정
      id: 'leon_battle', once: true, priority: 72,
      when: { all: [{ day: { gte: 24 } }, { customerSeen: 'd1_knight' }] },
      outcomes: [
        {
          // 별조각 부적(leon_charm)이 있으면 쓰러지지 않는다 (letters.js star → 레온)
          when: { all: [{ noFlag: 'leon_charm' }, { any: [gobWeapons(14), { all: [gobWeapons(8), { noFlag: 'leon_squad_armed' }] }, { all: [{ var: 'leon_bond', lte: -2 }, { noFlag: 'leon_squad_armed' }] }] }] },
          effects: { flags: ['leon_fell'], vars: { kingdom_morale: -3, border_tension: 3 } },
          news: { cat: '속보', text: '서부 숲 매복… 제7기사단 레온 분대 전멸', big: true },
        },
        {
          when: { all: [{ flag: 'leon_squad_armed' }, { var: 'leon_bond', gte: 3 }, { not: gobWeapons(8) }, { noFlag: 'leon_route_closed' }, { not: gobBladeLate }] },
          effects: { flags: ['leon_commander'], vars: { kingdom_power: 2, goblin_power: -2, border_tension: -2 } },
          news: { cat: '왕국', text: '레온 분대, 습격대 격퇴… 레온 경 기사단장에', big: true },
        },
        {
          // 단장감이었지만 9일째 뒤 고블린에게 칼을 댄 게 들통났다 — 습격대는 막았어도 단장 자리는 남에게. 레온은 칼을 내려놓는다
          when: { all: [{ flag: 'leon_squad_armed' }, { var: 'leon_bond', gte: 3 }, { not: gobWeapons(8) }] },
          effects: { flags: ['leon_tavern', 'leon_passed_over'], vars: { kingdom_power: 1, goblin_power: -1 } },
          news: { cat: '왕국', text: '레온 분대, 습격대 격퇴… 단장 자리는 다른 이에게. 레온 경, 칼을 내려놓다' },
        },
        {
          effects: { flags: ['leon_tavern'] },
          news: { cat: '왕국', text: '레온 분대 간신히 귀환… 레온 경, 칼을 내려놓다' },
        },
      ],
    },
    {
      // 9일째부터 고블린에게 칼을 한 자루라도 넘기면 단장길이 닫힌다 (24일 전투 전까지만 뜻이 있다 — 전투 결과도 직접 다시 따진다)
      id: 'leon_route_closed_ev', once: true, priority: 90,
      when: { all: [gobBladeLate, { not: { eventFired: 'leon_battle' } }, { customerSeen: 'd1_knight' }] },
      effects: { flags: ['leon_route_closed'] },
    },
    {
      // 계약서를 쓴 뒤 고블린과 무슨 거래든 하면 계약이 깨진다. 같은 새벽 레온의 편지가 온다 (아래 leon_contract_broken_letter)
      id: 'leon_contract_broken_ev', once: true, priority: 90,
      when: { all: [{ flag: 'leon_contract' }, gobDealAfterContract] },
      effects: { flags: ['leon_contract_broken'], vars: { rel_kingdom: -5, reputation: -2, leon_bond: -3 } },
      news: { cat: '왕국', text: '기사단, 고블린과 거래한 납품 가게와 계약 파기', big: true },
    },
    {
      // 계약 보급 마차 — 계약한 이튿날 뒤로 이틀마다 (cooldown 1 = 하루 걸러). 칼 아니면 방패
      id: 'leon_supply_wagon', cooldown: 1, priority: 50,
      when: { all: contractLive.concat([{ since: { flag: 'leon_contract', days: 2 } }, { not: gobDealAfterContract }]) },
      effects: { if: { when: { chance: 0.5 }, then: { spawn: [{ customer: 'leon_supply_swords', inDays: 0 }] }, else: { spawn: [{ customer: 'leon_supply_shields', inDays: 0 }] } } },
    },
  );

  // ════════════════════ ② 견습생 핀 ════════════════════
  C.push(
    {
      id: 'pin_hire', look: 'pin', name: '핀', race: '인간', job: '떠돌이 고아', faction: 'village', portrait: '🧒', kind: 'talk',
      spawn: { day: 4, order: 1 },
      ask: { tag: '일자리', note: '하루 삯 4G' },
      greet: '(맨발 소년) 비질이든 뭐든 할게요. 먹여만 주세요.',
      choices: [
        {
          id: 'hire', label: '견습생으로 들인다',
          reply: '정말요? 핀이에요! 창고부터 쓸게요!',
          effects: { vars: { pin_trust: 2 }, flags: ['pin_hired'] },
        },
        {
          id: 'feed', label: '빵값만 준다 (−5G)', when: { gold: { gte: 5 } },
          reply: '…고마워요. 빵값은 꼭 갚을게요.',
          effects: { gold: -5, vars: { pin_trust: 1 }, flags: ['pin_fed'] },
        },
        {
          id: 'shoo', label: '내보낸다',
          reply: '…네. (문간에 잠깐 서 있다 간다)',
          effects: { vars: { pin_trust: -1 }, flags: ['pin_refused'] },
        },
      ],
    },
    {
      id: 'pin_advance', look: 'pin', name: '견습생 핀', race: '인간', job: '이 가게 견습생', faction: 'village', portrait: '🧒', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 10 } }, { flag: 'pin_hired' }, { noFlag: 'pin_gone' }, { noFlag: 'pin_late_hire' }] } },
      ask: { tag: '가불', gold: -30, note: '동생 약값' },
      greet: '동생이 열이 펄펄 나요. 삯 30G만 미리 주세요.',
      choices: [
        {
          id: 'advance', label: '30G를 준다', when: { gold: { gte: 30 } },
          reply: '꼭 갚을게요! 곱절로 일할게요!',
          effects: { gold: -30, vars: { pin_trust: 1 }, flags: ['pin_advanced'] },
        },
        {
          id: 'potion', label: '물약을 준다', when: { has: { item: 'potion' } },
          reply: '물약이다! 동생한테 뛰어갈게요!',
          effects: { take: { potion: 1 }, vars: { pin_trust: 1 }, flags: ['pin_potion'] },
        },
        {
          id: 'refuse', label: '가불은 안 된다',
          reply: '…네. 알겠어요.',
          effects: { vars: { pin_trust: -2 }, flags: ['pin_advance_refused'] },
        },
      ],
    },
    {
      // 안 들인 핀 — 14일째 길에서 다시 만난다
      id: 'pin_street', look: 'pin', name: '핀', race: '인간', job: '떠돌이 고아 (더 여위었다)', faction: 'village', portrait: '🧒', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 14 } }, { any: [{ flag: 'pin_fed' }, { flag: 'pin_refused' }] }, { noFlag: 'pin_hired' }] } },
      ask: { tag: '외상', items: { iron_sword: 1 }, note: '기사단 종자 모집' },
      greet: '기사단 종자 모집이래요. 칼 한 자루만 외상요.',
      choices: [
        {
          id: 'sword', label: '칼을 준다', when: { has: { item: 'iron_sword' } },
          reply: '살아서 꼭 갚으러 올게요!',
          effects: { take: { iron_sword: 1 }, vars: { pin_trust: 2 }, flags: ['pin_squire', 'pin_gone'] },
        },
        {
          id: 'hire', label: '이제라도 들인다',
          reply: '…정말요? 오늘부터 쓸게요!',
          effects: { vars: { pin_trust: 1 }, flags: ['pin_hired', 'pin_late_hire'] },
        },
        {
          id: 'refuse', label: '줄 게 없다',
          reply: '…네. 다들 그러더라고요.',
          effects: { flags: ['pin_lost', 'pin_gone'] },
        },
      ],
    },
    {
      // "쥐꼬리" 벤 — 까마귀 편지로 밀수품을 파는 그 벤 (letters.js smuggler). 도적단 장물 조직. 서류함이 열린 뒤라 위장할 수 있다
      id: 'ben_fence', look: 'fence', name: '"쥐꼬리" 벤', race: '인간', job: '헌 옷 장수(자칭)', faction: 'traveler', trueFaction: 'bandit', portrait: '🐀', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 16 } }, { flag: 'pin_hired' }, { noFlag: 'pin_gone' }] } },
      suspicious: true,
      ask: { tag: '거래 제안', gold: 80, note: '견습생을 빌려 달라' },
      greet: '당신 견습생, 밤에 뒷문만 열어 주쇼. 몫은 80G요.',
      choices: [
        {
          id: 'deal', label: '몫을 받는다 (+80G)',
          reply: '현명하군. 꼬마는 우리가 잘 쓰지.',
          effects: { gold: 80, vars: { blackmarket: 3, rel_bandit: 2, pin_trust: -3 }, flags: ['pin_sold_out'], schedule: [{ event: 'pin_night', inDays: 3 }] },
        },
        {
          id: 'warn', label: '핀에게 알린다',
          reply: '…후회할 거요. 꼬마는 빚이 있거든.',
          effects: { vars: { pin_trust: 1 }, flags: ['pin_warned'], schedule: [{ event: 'pin_night', inDays: 3 }] },
        },
        {
          id: 'report', label: '경비대에 알린다',
          reply: '(벤이 웃으며 나간다) 기억해 두지.',
          effects: { vars: { rel_kingdom: 2, rel_bandit: -4, blackmarket: -2 }, flags: ['ben_reported'], news: [{ cat: '왕국', text: '경비대, 헌 옷 장수 "쥐꼬리" 벤 패거리 급습' }], schedule: [{ event: 'pin_night', inDays: 3 }] },
        },
      ],
    },
    {
      id: 'pin_caught', look: 'pin', name: '견습생 핀', race: '인간', job: '이 가게 견습생 (자루를 끌어안았다)', faction: 'village', portrait: '🧒', kind: 'talk',
      spawn: { when: { all: [{ flag: 'pin_stole' }, { noFlag: 'pin_gone' }] } },
      ask: { tag: '용서', note: '창고 물건을 훔쳤다' },
      greet: '벤한테 빚이 있었어요… 죄송해요. 정말 죄송해요.',
      choices: [
        {
          id: 'trust', label: '한 번 믿어 준다',
          reply: '다시는… 다시는 안 그럴게요.',
          effects: { vars: { pin_trust: 3 }, flags: ['pin_forgiven'] },
        },
        {
          // 경비대가 훔친 물건은 찾아 준다
          id: 'catch', label: '경비대에 넘긴다',
          reply: '…네. 제가 잘못했으니까요.',
          effects: { give: { potion: 2, iron_sword: 1 }, vars: { rel_kingdom: 1, integrity: 1 }, flags: ['pin_jailed', 'pin_gone'] },
        },
        {
          id: 'cover', label: '빚 60G를 갚아 준다', when: { gold: { gte: 60 } },
          reply: '(벤의 쪽지를 찢는다) 이제 자유예요!',
          effects: { gold: -60, vars: { pin_trust: 4, rel_bandit: 1 }, flags: ['pin_covered'] },
        },
      ],
    },
    {
      id: 'pin_proud', look: 'pin', name: '견습생 핀', race: '인간', job: '이 가게 견습생 (몽둥이를 들었다)', faction: 'village', portrait: '🧒', kind: 'talk',
      spawn: { when: { all: [{ flag: 'pin_loyal' }, { noFlag: 'ben_reported' }, { noFlag: 'pin_gone' }] } },
      ask: { tag: '상여금', note: '밤도둑을 쫓아냈다' },
      greet: '벤 패거리가 문 열라길래 몽둥이 들었어요!',
      choices: [
        {
          id: 'bonus', label: '상여금 20G', when: { gold: { gte: 20 } },
          reply: '헤헤, 동생 신발 사 줄래요!',
          effects: { gold: -20, vars: { pin_trust: 3 } },
        },
        {
          id: 'praise', label: '잘했다고 한다',
          reply: '헤헤. 이 가게는 제가 지켜요!',
          effects: { vars: { pin_trust: 1 } },
        },
      ],
    },
    {
      id: 'pin_future', look: 'pin', name: '견습생 핀', race: '인간', job: '이 가게 견습생 (키가 컸다)', faction: 'village', portrait: '🧒', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 28 } }, { flag: 'pin_hired' }, { noFlag: 'pin_gone' }] } },
      ask: { tag: '진로', note: '견습생의 앞날' },
      greet: '사장님, 저 이제 뭐가 되면 좋을까요?',
      choices: [
        {
          id: 'heir', label: '가게를 물려받아라', when: { var: 'pin_trust', gte: 8 }, lockedHint: '핀은 아직 자신이 없어 보인다',
          reply: '제가요? …장부부터 배울게요!',
          effects: { vars: { pin_trust: 2 }, flags: ['pin_heir'] },
        },
        {
          id: 'smith', label: '공방에 보낸다 (−50G)', when: { gold: { gte: 50 } },
          reply: '브론 아저씨 공방이요? 망치 잘 쥘게요!',
          effects: { gold: -50, vars: { rel_dwarf: 1 }, flags: ['pin_to_smith', 'pin_gone'] },
        },
        {
          id: 'army', label: '기사단에 보낸다',
          reply: '방패는 이 가게 걸로 들게요!',
          effects: { vars: { rel_kingdom: 1 }, flags: ['pin_to_army', 'pin_gone'] },
        },
        {
          id: 'free', label: '제 길을 가라',
          reply: '…네. 그동안 고마웠어요.',
          effects: { flags: ['pin_let_go', 'pin_gone'] },
        },
      ],
    },
    {
      id: 'pin_smith_return', look: 'pin', name: '대장장이 핀', race: '인간', job: '강철수염 공방 견습 대장장이', faction: 'dwarf', portrait: '🔨', kind: 'sell',
      spawn: { when: { all: [{ day: { gte: 36 } }, { flag: 'pin_to_smith' }] } },
      greet: '제가 벼린 {item} {qty}자루예요! {offer}G만 주세요.',
      request: { item: 'iron_sword', qty: 3, price: 60 },
      lines: { bought: '사장님이 첫 손님이라 다행이에요!', declined: '…더 잘 벼려서 다시 올게요.' },
      onBuy: { flags: ['pin_first_blades'] },
    },
  );

  E.push(
    {
      // 견습생 심부름: 사흘마다 배달 삯 · 깔끔한 가게
      id: 'pin_errand', cooldown: 3, priority: 25,
      when: { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }, { day: { gte: 6 } }] },
      effects: { gold: 8, vars: { reputation: 1 } },
    },
    {
      // 벤이 다녀간 사흘 뒤 밤
      id: 'pin_night', trigger: 'scheduled', priority: 60,
      outcomes: [
        {
          when: { flag: 'pin_sold_out' },
          effects: { take: { iron_sword: 3, potion: 3 }, flags: ['pin_joined_ring', 'pin_gone'] },
          news: { cat: '사건', text: '견습생 사라진 무기점, 칼·물약이 밤새 증발' },
        },
        {
          when: { flag: 'ben_reported' },
          effects: { vars: { pin_trust: 1 }, flags: ['pin_loyal'] },
          news: { cat: '생활', text: '벤 패거리 잠잠… 무기점 견습생은 콧노래' },
        },
        {
          when: { any: [{ all: [{ flag: 'pin_warned' }, { var: 'pin_trust', gte: 3 }] }, { var: 'pin_trust', gte: 5 }] },
          effects: { vars: { pin_trust: 1, reputation: 2 }, flags: ['pin_loyal'] },
          news: { cat: '사건', text: '무기점 견습생, 밤도둑들 몽둥이로 쫓아내' },
        },
        {
          effects: { take: { potion: 2, iron_sword: 1 }, flags: ['pin_stole'] },
          news: { cat: '사건', text: '무기점 창고서 칼·물약 사라져… 뒷문은 열려 있었다' },
        },
      ],
    },
  );

  // ════════════════════ ③ 은화 저울 상회 ════════════════════
  // 할부 80 · 110 · 140 · 170G (6 · 12 · 18 · 26일). 미루면 그 할부에 이자 30G 가 붙어 밀린 빚(debt_due)이 된다.
  // 밀린 빚은 늘 [110, 140, 170, 200] 중 몇 개의 합이다 — 선택지는 그 값마다 하나씩 만들어 두고 when 으로 하나만 보인다.
  const INST = [80, 110, 140, 170];
  const LATE = 30;
  const sums = list => list.reduce((acc, x) => acc.concat(acc.map(s => s + x)), [0]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const overdueBefore = k => sums(INST.slice(0, k).map(x => x + LATE));
  const ALL_OVERDUE = sums(INST.map(x => x + LATE)).filter(x => x > 0);
  const clean = { set: { debt_due: 0, debt_strikes: 0 } };
  const debtOpen = [{ noFlag: 'shop_seized' }, { noFlag: 'debt_cleared' }];
  const COLLECTOR = { look: 'guild_agent', name: '수금원 모트', race: '인간', job: '은화 저울 상회 수금원', faction: 'guild', portrait: '🪙', kind: 'talk' };
  // 열쇠를 넘기면 가게가 압류된다 — 그날 밤 파산 엔딩(bankrupt 의 shop_seized 변형)
  const surrender = { id: 'surrender', label: '열쇠를 넘긴다', confirm: '정말 넘긴다 — 가게를 잃고 이야기가 끝난다', reply: '(간판을 떼어 낸다) 장사는 오늘까지다.', effects: { flags: ['shop_seized', 'bankrupt'] } };
  const payAllChoices = (values, extra, reply) => values.map(x => ({
    id: `pay_${x}`, label: `${x}G 모두 낸다`, when: { all: [{ var: 'debt_due', eq: x }, { gold: { gte: x } }] },
    reply, effects: { gold: -x, ...clean, ...extra },
  }));

  function collectorVisit(k, day, greet, note) {
    const inst = INST[k];
    const last = k === INST.length - 1;
    const prev = k === 0 ? [{ day: { gte: day } }] : [{ day: { gte: day } }, { customerSeen: `debt_collector_${k}` }];
    const done = last ? { flags: ['debt_cleared'] } : {};
    const choices = [
      {
        id: 'pay', label: `${inst}G를 낸다`, when: { all: [{ var: 'debt_due', eq: 0 }, { gold: { gte: inst } }] },
        reply: last ? '완납이다. 이제 이 가게는 네 거다.' : '영수증이다. 다음 수금일에 보자.',
        effects: { gold: -inst, ...clean, ...done },
      },
      ...overdueBefore(k).filter(x => x > 0).map(x => ({
        id: `pay_all_${x}`, label: `${inst + x}G 모두 낸다`, when: { all: [{ var: 'debt_due', eq: x }, { gold: { gte: inst + x } }] },
        reply: '밀린 것까지 깨끗하군. 경고는 지워 주지.',
        effects: { gold: -(inst + x), ...clean, ...done },
      })),
      {
        // 밀린 빚을 한꺼번에 낼 돈은 없을 때 — 이번 할부만
        id: 'pay_part', label: `${inst}G만 낸다`,
        when: { all: [{ var: 'debt_due', gt: 0 }, { gold: { gte: inst } }, ...overdueBefore(k).filter(x => x > 0).map(x => ({ not: { all: [{ var: 'debt_due', eq: x }, { gold: { gte: inst + x } }] } }))] },
        reply: '이번 것만이냐? 밀린 건 그대로다.',
        effects: { gold: -inst },
      },
      {
        id: 'contraband', label: '독병 3병으로 낸다', when: { has: { item: 'poison_vial', min: 3 } },
        reply: '독병이라… 상회엔 쓸 데가 많지.',
        effects: { take: { poison_vial: 3 }, vars: { blackmarket: 1 } },
      },
      {
        id: 'ledger', label: '손님 장부를 넘긴다', when: { not: { has: { item: 'poison_vial', min: 3 } } },
        reply: '(장부를 훑는다) …상회가 좋아하겠군.',
        effects: { vars: { blackmarket: 1, integrity: -2 } },
      },
      {
        id: 'delay', label: '다음에 갚겠소',
        reply: `이자 ${LATE}G 붙는다. 세 번 밀리면 집행관이다.`,
        effects: { vars: { debt_due: inst + LATE, debt_strikes: 1 } },
      },
      {
        id: 'threaten', label: '문밖으로 내쫓는다',
        reply: '…상회는 이 일을 기억한다.',
        effects: { vars: { debt_due: inst + LATE, debt_strikes: 2 }, flags: ['debt_threatened'], schedule: [{ event: 'debt_thugs', inDays: 1 }] },
      },
    ];
    return {
      id: `debt_collector_${k + 1}`, ...COLLECTOR,
      spawn: { when: { all: prev.concat(debtOpen) } },
      ask: { tag: '할부금', gold: -inst, note },
      greet, choices,
    };
  }

  C.push(
    collectorVisit(0, 6, '은화 저울 상회다. 가게 빚 500G, 첫 할부 80G.', '6·12·18·26일 수금'),
    collectorVisit(1, 12, '두 번째 할부 110G다. 밀린 게 있으면 같이 받는다.', '밀린 빚 있으면 더함'),
    collectorVisit(2, 18, '세 번째 할부 140G. 상회는 기다리는 걸 싫어한다.', '밀린 빚 있으면 더함'),
    collectorVisit(3, 26, '마지막 할부 170G다. 이걸로 끝나면 좋겠군.', '밀리면 34일 청산'),
    {
      // 26일 뒤에도 밀린 빚이 남았으면 34일에 잔금 청산
      id: 'debt_final', ...COLLECTOR,
      spawn: { when: { all: [{ day: { gte: 34 } }, { customerSeen: 'debt_collector_4' }, { var: 'debt_due', gt: 0 }].concat(debtOpen) } },
      ask: { tag: '잔금 청산', note: '밀린 할부+이자 전부' },
      greet: '잔금 청산일이다. 밀린 할부와 이자, 오늘 다 받는다.',
      choices: [
        ...payAllChoices(ALL_OVERDUE, { flags: ['debt_cleared'] }, '완납이다. 늦었지만 깨끗하군.'),
        surrender,
      ],
    },
    {
      // 연체 경고 3 → 이튿날 집행관
      id: 'debt_bailiff', look: 'merc_captain', name: '집행관 드레크', race: '인간', job: '은화 저울 상회 집행관', faction: 'guild', portrait: '📜', kind: 'talk',
      spawn: { queuedOnly: true },
      ask: { tag: '압류', note: '밀린 빚 전부 또는 열쇠' },
      greet: '세 번 밀렸다. 오늘 다 갚든지, 열쇠를 내놓든지.',
      choices: [
        ...payAllChoices(ALL_OVERDUE, { unflags: ['debt_bailiff_due'] }, '…운이 좋군. 다음은 없다.'),
        surrender,
      ],
    },
  );

  E.push(
    {
      id: 'debt_thugs', trigger: 'scheduled', priority: 55,
      effects: { gold: -40, take: { iron_sword: 2, potion: 2 } },
      news: { cat: '사건', text: '밤사이 무기점 유리창 박살… 쪽지엔 "기한은 지키시오"' },
    },
    {
      id: 'debt_bailiff_call', priority: 74,
      when: { all: [{ day: { gte: 27 } }, { var: 'debt_strikes', gte: 3 }, { noFlag: 'debt_bailiff_due' }, { noFlag: 'shop_seized' }] },
      effects: { flags: ['debt_bailiff_due'], spawn: [{ customer: 'debt_bailiff', inDays: 0 }] },
      news: { cat: '경제', text: '은화 저울 상회, 할부 세 번 밀린 가게에 집행관', big: true },
    },
    {
      // 26일 전 — 경고가 쌓여도 압류 대신 행패로 조인다 (나흘에 한 번)
      id: 'debt_pressure', cooldown: 4, priority: 56,
      when: { all: [{ day: { lte: 26 } }, { var: 'debt_strikes', gte: 3 }].concat(debtOpen) },
      effects: { gold: -30, take: { iron_sword: 1, potion: 1 }, vars: { reputation: -1 } },
      news: { cat: '사건', text: '무기점 문짝에 붉은 낙서 "빚 갚아라"… 손님들 발길 뚝' },
    },
    {
      // 마지막 할부 뒤 밀린 빚이 없으면(장부로 냈든, 전 주인이 갚았든) 완납
      id: 'debt_cleared_check', once: true, priority: 40,
      when: { all: [{ customerSeen: 'debt_collector_4' }, { var: 'debt_due', eq: 0 }, { noFlag: 'debt_cleared' }, { noFlag: 'shop_seized' }] },
      effects: { flags: ['debt_cleared'] },
    },
    {
      id: 'debt_cleared_news', once: true, priority: 40,
      when: { flag: 'debt_cleared' },
      news: { cat: '경제', text: '은화 저울 상회, 무기점 빚 장부에 붉은 줄' },
    },
  );

  // ════════════════════ ④ 전 주인의 비밀 ════════════════════
  C.push(
    {
      id: 'carpenter_ledger', look: 'dwarf', name: '목수 드발', race: '드워프', job: '떠돌이 목수', faction: 'dwarf', portrait: '🪚', kind: 'talk',
      spawn: { day: 14, order: 1 },
      ask: { tag: '발견물', note: '서류함 밑 옛 장부' },
      greet: '서류함 밑에 옛 장부가 있었네. "붉은여울행 칼 40, 가렛"',
      choices: [
        {
          id: 'keep', label: '장부를 간직한다',
          reply: '붉은여울… 스무 해 전 불탄 마을이네.',
          effects: { flags: ['old_ledger_kept'] },
        },
        {
          id: 'burn', label: '태워 버린다',
          reply: '…못 본 걸로 하지. 수리비는 됐네.',
          effects: { vars: { integrity: -1 }, flags: ['old_ledger_burned'] },
        },
        {
          id: 'report', label: '경비대에 넘긴다',
          reply: '붉은여울이라… 경비대가 반기겠군.',
          effects: { vars: { reputation: 1, rel_kingdom: 1, integrity: 1 }, flags: ['old_ledger_reported'], news: [{ cat: '왕국', text: '20년 전 붉은여울 학살, 무기 출처 재조사' }] },
        },
      ],
    },
    {
      id: 'widow_eda', look: 'widow_eda', name: '에다', race: '인간', job: '붉은여울 과부', faction: 'village', portrait: '🕯️', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 20 } }, { customerSeen: 'carpenter_ledger' }] } },
      ask: { tag: '진실', note: '20년 전 칼 판 자' },
      greet: '붉은여울에서 왔소. 그날 칼을 판 자를 찾고 있소.',
      choices: [
        {
          id: 'show', label: '장부를 보여 준다', when: { any: [{ flag: 'old_ledger_kept' }, { flag: 'old_ledger_reported' }] },
          reply: '가렛… 이 이름을 스무 해 찾았소.',
          effects: { vars: { rel_village: 2, integrity: 1 }, flags: ['widow_told'] },
        },
        {
          id: 'pay', label: '위로금 150G', when: { gold: { gte: 150 } },
          reply: '돈으로 그이가 오진 않지만… 받겠소.',
          effects: { gold: -150, vars: { rel_village: 3, reputation: 1 }, flags: ['widow_compensated'] },
        },
        {
          id: 'deny', label: '모르는 일이오',
          reply: '…이 가게도 모른다는군.',
          effects: { vars: { integrity: -1 }, flags: ['widow_denied'] },
        },
      ],
    },
    {
      id: 'garret_return', look: 'noble_lord', name: '가렛', race: '인간', job: '이 가게 전 주인', faction: 'traveler', trueFaction: 'bandit', portrait: '🗝️', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 27 } }, { customerSeen: 'carpenter_ledger' }] } },
      suspicious: true,
      // 까마귀로 밀고하면 짐마차가 떠나기 전에 경비대가 지켜본다 (garret_caravan 에서 붙잡힘)
      onReport: { flags: ['garret_reported'] },
      ask: { tag: '거래 제안', gold: 250, note: '동업 또는 가게 반환' },
      greet: '전 주인 가렛일세. 서랍 장부는 봤겠지? 동업하세.',
      choices: [
        {
          id: 'partner', label: '동업한다 (+250G)', when: { var: 'debt_due', eq: 0 },
          reply: '옛 거래처가 아직 칼을 찾네. 좋은 날이군.',
          effects: { gold: 250, vars: { blackmarket: 3, bandit_power: 3, rel_bandit: 3, integrity: -2 }, flags: ['garret_partner'], schedule: [{ event: 'garret_caravan', inDays: [3, 4] }] },
        },
        {
          // 상회 빚이 밀려 있으면 — 가렛이 대신 갚아 준다
          id: 'partner_debt', label: '빚 대신 동업한다', when: { var: 'debt_due', gt: 0 },
          reply: '상회 빚은 내가 지우지. 뒷문은 내 걸세.',
          effects: { set: { debt_due: 0, debt_strikes: 0 }, unflags: ['debt_bailiff_due'], vars: { blackmarket: 3, bandit_power: 3, rel_bandit: 3, integrity: -2 }, flags: ['garret_partner', 'garret_paid_debt'], schedule: [{ event: 'garret_caravan', inDays: [3, 4] }] },
        },
        {
          id: 'hush', label: '장부를 판다 (+150G)', when: { all: [{ flag: 'old_ledger_kept' }, { noFlag: 'widow_told' }] },
          reply: '현명하군. (장부를 난로에 넣는다)',
          effects: { gold: 150, vars: { integrity: -2 }, flags: ['garret_hushed'], unflags: ['old_ledger_kept'] },
        },
        {
          id: 'expose', label: '경비대를 부른다', when: { any: [{ flag: 'old_ledger_kept' }, { flag: 'old_ledger_reported' }, { flag: 'widow_told' }] },
          reply: '…스무 해를 숨었는데, 서랍 하나에.',
          effects: { vars: { reputation: 3, rel_kingdom: 2, rel_village: 3, rel_bandit: -3, integrity: 2 }, flags: ['garret_exposed'], news: [{ cat: '속보', text: '붉은여울 학살 무기상 가렛, 스무 해 만에 체포', big: true }] },
        },
        {
          id: 'refuse', label: '나가 주시오',
          reply: '이 가게 칼이 뭘 했는지 소문내 주지.',
          effects: { flags: ['garret_refused'], schedule: [{ event: 'garret_grudge', inDays: 2 }] },
        },
      ],
    },
    {
      id: 'eda_gift', look: 'widow_eda', name: '에다', race: '인간', job: '붉은여울 과부', faction: 'village', portrait: '🕯️', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 33 } }, { flag: 'garret_exposed' }, { customerSeen: 'widow_eda' }] } },
      ask: { tag: '답례', note: '녹인 칼자루 방울' },
      greet: '가렛이 교수대에 섰소. 그이 칼자루로 만든 방울이오.',
      choices: [
        {
          id: 'hang', label: '문에 방울을 단다',
          reply: '손님이 올 때마다 그이가 인사하겠군.',
          effects: { vars: { reputation: 2, rel_village: 1 }, flags: ['eda_peace', 'eda_bell'] },
        },
        {
          id: 'return', label: '마을 제단에 돌려준다',
          reply: '…그래, 그이는 붉은여울에 있어야지.',
          effects: { vars: { rel_village: 3, integrity: 1 }, flags: ['eda_peace'] },
        },
      ],
    },
    {
      id: 'eda_curse', look: 'widow_eda', name: '에다', race: '인간', job: '붉은여울 과부 (재를 뒤집어썼다)', faction: 'village', portrait: '🕯️', kind: 'talk',
      spawn: { when: { all: [{ day: { gte: 33 } }, { flag: 'garret_raid' }] } },
      ask: { tag: '책임', gold: -300, note: '두 번째 습격' },
      greet: '또 붉은여울이오. 이번엔 당신 가게 칼이었소.',
      choices: [
        {
          id: 'confess', label: '경비대에 자수한다',
          reply: '…스무 해 만에 처음 듣는 말이오.',
          effects: { vars: { reputation: -6, rel_kingdom: -2, rel_village: 4, integrity: 3, bandit_power: -3 }, flags: ['garret_confessed'], news: [{ cat: '왕국', text: '무기점 주인 자수… "가렛의 짐마차는 내 칼이었다"', big: true }] },
        },
        {
          id: 'pay', label: '배상금 300G', when: { gold: { gte: 300 } },
          reply: '…우물 셋은 다시 파겠군.',
          effects: { gold: -300, vars: { rel_village: 3 }, flags: ['eda_paid'] },
        },
        {
          id: 'deny', label: '나와 무관하오',
          reply: '가렛도 꼭 그렇게 말했소.',
          effects: { vars: { rel_village: -3 }, flags: ['eda_cursed'] },
        },
      ],
    },
    {
      // 붉은여울 사람들의 한마디 — 에다에게 어떻게 했는지 안다
      id: 'redford_grateful', look: 'redford_orto', name: '붉은여울 사람 오르토', race: '인간', job: '붉은여울 과수원지기', faction: 'village', portrait: '🍎',
      spawn: { when: { all: [{ day: { gte: 23 } }, { any: [{ flag: 'widow_told' }, { flag: 'widow_compensated' }] }] } },
      greet: '붉은여울에서 왔소. 에다 일, 고맙소. {item} {qty}개.',
      request: { item: 'shield', qty: 2, offer: { mult: 1.3 }, partialOk: true },
      lines: { sold: '마을 사람들한테 이 가게 얘길 하겠소.', refused: '…그래도 고마웠소.' },
    },
    {
      id: 'redford_cold', look: 'redford_orto', name: '붉은여울 사람 오르토', race: '인간', job: '붉은여울 과수원지기', faction: 'village', portrait: '🍎',
      spawn: { when: { all: [{ day: { gte: 23 } }, { flag: 'widow_denied' }] } },
      greet: '붉은여울 사람이오. 모른다 했다지? {item} {qty}개.',
      request: { item: 'shield', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '…값은 이것뿐이오.', refused: '역시 그 가게답군.' },
    },
  );

  E.push(
    {
      id: 'garret_grudge', trigger: 'scheduled', priority: 50,
      effects: { vars: { reputation: -3, rel_village: -2 } },
      news: { cat: '소문', text: '"그 무기점 칼이 붉은여울을 불태웠다"는 소문' },
    },
    {
      // 동업 사나흘 뒤: 가렛의 짐마차 — 순찰이 세면 붙잡히고, 아니면 또 한 마을이 불탄다
      id: 'garret_caravan', trigger: 'scheduled', priority: 62,
      outcomes: [
        {
          when: { any: [{ flag: 'garret_reported' }, { var: 'rel_kingdom', gte: 8 }, { var: 'kingdom_power', gte: 38 }, { flag: 'bandits_crushed' }, { flag: 'leon_commander' }] },
          effects: { vars: { reputation: -5, rel_kingdom: -3, bandit_power: -3 }, flags: ['garret_caught'] },
          news: { cat: '속보', text: '가렛의 칼 짐마차 적발… 동업한 무기점도 명단에', big: true },
        },
        {
          effects: { vars: { rel_village: -6, village_defense: -3, kingdom_morale: -3, bandit_power: 3 }, flags: ['garret_raid'] },
          news: { cat: '속보', text: '동쪽 마을 또 습격… 칼자루마다 이 가게 각인', big: true },
        },
      ],
    },
  );

  // ════════════════════ 편지 · 신문 · 소문 ════════════════════
  const L = WS.data.letters;
  Object.assign(L.senders, {
    silverscale: { name: '은화 저울 상회', icon: '🪙' },
    leon: { name: '레온', icon: '🤺' },
    pin: { name: '핀', icon: '🧒' },
    eda: { name: '붉은여울의 에다', icon: '🕯️' },
    garret: { name: '가렛', icon: '🗝️' },
  });
  const debtLive = [{ noFlag: 'shop_seized' }, { noFlag: 'debt_cleared' }];
  L.story = (L.story || []).concat([
    // 은화 저울 상회 — 경고와 수금 예고 (까마귀는 6일째부터)
    { id: 'debt_warn1', from: 'silverscale', when: { all: [{ var: 'debt_strikes', gte: 1 }].concat(debtLive) }, subject: '독촉장', body: '할부가 밀렸소. 이자 30G를 얹었소. 끝까지 밀리면 집행관이 열쇠를 받으러 가오. — 은화 저울 상회' },
    { id: 'debt_warn2', from: 'silverscale', when: { all: [{ var: 'debt_strikes', gte: 2 }].concat(debtLive) }, subject: '마지막 경고', body: '두 번 밀렸소. 더 밀리면 가게가 편하지 않을 거요. 한꺼번에 내면 경고는 지워 드리오. — 은화 저울 상회' },
    { id: 'debt_notice3', from: 'silverscale', when: { all: [{ day: { gte: 17 } }, { not: { customerSeen: 'debt_collector_3' } }].concat(debtLive) }, subject: '세 번째 수금 안내', body: '곧 세 번째 할부 140G를 받으러 간다. 밀린 빚이 있으면 함께 준비해 둬. — 수금원 모트' },
    { id: 'debt_notice4', from: 'silverscale', when: { all: [{ day: { gte: 25 } }, { not: { customerSeen: 'debt_collector_4' } }].concat(debtLive) }, subject: '마지막 할부 안내', body: '곧 마지막 할부 170G를 받으러 간다. 그때도 밀린 게 남으면 34일째에 잔금을 청산한다. — 수금원 모트' },
    { id: 'debt_notice_final', from: 'silverscale', when: { all: [{ day: { gte: 33 } }, { customerSeen: 'debt_collector_4' }, { var: 'debt_due', gt: 0 }].concat(debtLive) }, subject: '잔금 청산 예고', body: '내일 잔금 청산일이오. 밀린 할부와 이자를 모두 받겠소. 못 내면 가게 열쇠를 받겠소. — 은화 저울 상회' },
    { id: 'debt_paid', from: 'silverscale', when: { flag: 'debt_cleared' }, subject: '완납 증서', body: '가게 빚을 모두 받았소. 이 증서를 액자에 거시오. 상회는 좋은 채무자를 잊지 않소. — 은화 저울 상회' },
    // 강철수염 씨족 — 16일 전령이 오기 전의 귀띔 (events.js ore_run_begins: 14일부터 나흘 도매상 철광석이 동난다)
    { id: 'dwarf_ore_notice', from: 'dwarf', when: { all: [{ day: { gte: 11 } }, { noFlag: 'dwarf_saved' }, { noFlag: 'dwarf_fallen' }] }, subject: '광석을 쌓아 두시오', body: '산채 성문이 갈라졌네. 며칠 안에 우리 전령이 철광석 서른 개를 청하러 갈 걸세. 창고 궤짝의 스무 개로는 모자라고, 그 무렵엔 도매상 광석이 동날 테니 미리 더 사 두게. 값은 시세대로 치르겠네. — 강철수염 씨족 교역소' },
    // 레온
    { id: 'leon_squad_letter', from: 'leon', when: { all: [{ flag: 'leon_squad_armed' }, { day: { gte: 19 } }, { noFlag: 'leon_fell' }] }, subject: '초소에서', body: '방패 넷, 전부 서부 숲 초소에 걸었소. 외상은 반드시 갚겠소. 숲이 조용하지 않소. — 레온' },
    // 계약 뒤 고블린과 거래한 이튿날 아침 (사건 leon_contract_broken_ev 와 같은 조건 — 같은 새벽)
    { id: 'leon_contract_broken_letter', from: 'leon', when: { all: [{ flag: 'leon_contract' }, gobDealAfterContract] }, subject: '계약', body: '숲에서 우리 쪽 물건을 봤소. 계약은 없던 걸로 하겠소. — 레온' },
    { id: 'leon_tavern_letter', from: 'leon', when: { all: [{ flag: 'leon_armor_bought' }, { day: { gte: 27 } }] }, subject: '"이 빠진 칼" 개업', body: '여관 문을 열었네. 자네 몫의 첫 잔은 공짜일세. 칼 이야기는 사절이네. — 레온' },
    // 핀
    { id: 'pin_smith_letter', from: 'pin', when: { all: [{ flag: 'pin_to_smith' }, { day: { gte: 31 } }] }, subject: '망치를 쥐었어요', body: '브론 아저씨가 망치를 쥐여 줬어요. 손이 다 까졌지만 재밌어요! 첫 칼은 사장님한테 팔래요. — 핀' },
    { id: 'pin_army_letter', from: 'pin', when: { all: [{ any: [{ flag: 'pin_to_army' }, { flag: 'pin_squire' }] }, { day: { gte: 30 } }] }, subject: '초소에서 핀이에요', body: '방패 닦는 건 제가 분대에서 제일 잘해요. 밥도 하루 두 번 나와요! — 핀' },
    { id: 'ben_thanks_letter', from: 'smuggler', when: { flag: 'pin_joined_ring' }, subject: '고맙소', body: '꼬마 핀은 손이 빠르더군. 좋은 견습생을 두셨소. 몫은 이미 드렸지? — 벤' },
    // 전 주인 · 에다
    { id: 'garret_warning', from: 'garret', when: { all: [{ day: { gte: 25 } }, { customerSeen: 'carpenter_ledger' }, { noFlag: 'old_ledger_reported' }] }, subject: '내 옛 서랍', body: '내 옛 서랍을 열었다지. 곧 들르겠네. 옛 주인에게 찻값 정도는 내주겠지? — 가렛' },
    { id: 'eda_well_letter', from: 'eda', when: { all: [{ flag: 'widow_compensated' }, { day: { gte: 24 } }] }, subject: '우물', body: '위로금으로 붉은여울 우물을 다시 팠소. 물맛이 달다오. 이름은 끝내 몰라도 되오. — 에다' },
  ]);

  WS.data.ambientNews.push(
    { id: 'amb_leon_list', cat: '왕국', text: '제7기사단 보급관 "숲에 칼 넘기는 상인은 납품 명부에서 뺀다"… 단장 자리는 손이 깨끗한 쪽에', when: { all: [{ day: { gte: 8, lte: 24 } }, { customerSeen: 'd1_knight' }, { noFlag: 'leon_route_closed' }, { noFlag: 'leon_fell' }] }, weight: 4, cooldown: 4 },
    { id: 'amb_leon_struck', cat: '왕국', text: '기사단 납품 명부에서 지워진 가게들… "숲에 칼을 판 곳"', when: { all: [{ flag: 'leon_route_closed' }, { day: { lte: 26 } }] }, weight: 2, cooldown: 5 },
    { id: 'amb_redford', cat: '마을', text: '붉은여울 과부 에다, 스무 해 전 무기상 찾아 수도로', when: { all: [{ customerSeen: 'carpenter_ledger' }, { day: { gte: 18 } }, { noFlag: 'garret_exposed' }] }, weight: 2, cooldown: 6 },
    { id: 'amb_debt_bailiff', cat: '경제', text: '은화 저울 상회 집행관, 상점가 돌며 딱지 준비', when: { all: [{ var: 'debt_strikes', gte: 2 }].concat(debtLive) }, weight: 3, cooldown: 3 },
    { id: 'amb_leon_squad', cat: '왕국', text: '서부 숲 초소에 새 방패 넷… "이번엔 버틴다"', when: { all: [{ flag: 'leon_squad_armed' }, { noFlag: 'leon_fell' }, { noFlag: 'leon_commander' }] }, weight: 2, cooldown: 5 },
    { id: 'amb_leon_tavern', cat: '생활', text: '여관 "이 빠진 칼" 개업… 주인은 전직 기사', when: { flag: 'leon_tavern' }, weight: 2, cooldown: 6 },
    { id: 'amb_pin_ring', cat: '사건', text: '쥐꼬리 벤 패거리에 새 얼굴… 날쌘 소년', when: { flag: 'pin_joined_ring' }, weight: 3, cooldown: 5 },
  );
})();

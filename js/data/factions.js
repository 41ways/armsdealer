// 세력 데이터.
// payMult: 시세 대비 지불 배율 / haggle: 흥정 허용폭·인내심
// perUnit[category]: 해당 분류 물건 1개(× item.impact) 판매 시 세계 변수 변화
// perDeal: 거래 1건당 변화 (sell / refuse / trade — trade 가 없으면 sell 을 쓴다)
// visit: 방문 가중치 = base + 관계 × relScale + Σ(scaleVars 변수 × 배율) + Σ(bonus[].when 이 맞으면 add). 등장 가능한 archetype 이 없으면 오지 않는다
// archetypes: 랜덤 손님 생성 틀. wants[].when 으로 조건부 요청 가능. minDay / when 으로 등장 시기 제한
//   kind: 'trade' 인 틀은 wants 대신 trades: [{ w, give: {item, qty}, want: {item, qty}, gold, when }] 를 쓴다
//   (give = 손님이 내놓는 것, want = 손님이 원하는 내 물건, gold = 손님이 얹는 웃돈. 음수면 내가 얹는다)
WS.data.factions = {
  kingdom: {
    name: '왕국', fullName: '루멘 왕국 · 용사단', icon: '👑', color: '#5b86d6', race: '인간',
    payMult: 0.95, haggle: { tolerance: 0.1, patience: 1 },
    visit: { base: 3, relScale: 0.08, var: 'rel_kingdom' },
    perUnit: {
      weapon: { kingdom_power: 0.5, monster_pop: -0.25, iron_price: 0.1 },
      armor: { kingdom_power: 0.35, monster_pop: -0.1 },
      consumable: { kingdom_power: 0.08, monster_pop: -0.05 },
      material: {},
    },
    perDeal: { sell: { rel_kingdom: 1.5, reputation: 0.5 }, refuse: { rel_kingdom: -1 } },
    archetypes: [
      {
        id: 'k_adventurer', look: 'adventurer', job: '모험가', portrait: '🧝', weight: 3,
        names: ['아렌', '미라', '토르벤', '세실', '카일'],
        wants: [
          { item: 'potion', w: 3, qty: [2, 5] }, { item: 'bow', w: 2, qty: [1, 2] },
          { item: 'iron_sword', w: 2, qty: [1, 1] }, { item: 'shield', w: 1, qty: [1, 1] },
          { item: 'iron_spear', w: 1, qty: [1, 1] }, { item: 'iron_helmet', w: 1, qty: [1, 1] },
        ],
        lines: { sold: ['고마워요! 이거면 든든해요.', '살았다, 고마워요!'], refused: ['아, 없어요? 다른 데 가 볼게요.', '그럼 어쩔 수 없죠…'], partial: '있는 만큼만이라도 주세요!' },
        greet: ['내일 던전 가요. {item} {qty}개, {offer}G 돼요?', '길드 의뢰예요. {item} {qty}개, {offer}G면 되죠?'],
      },
      {
        id: 'k_soldier', look: 'soldier', job: '왕국 병사', portrait: '💂', weight: 1.5,
        names: ['한스', '브랜', '오스릭', '페넬'],
        wants: [
          { item: 'shield', w: 3, qty: [2, 4] },
          // Phase 1 proof of concept: 신형 카테고리 want. "화살이 특히 부족해" 류 대사를 쓰지 않는 대신,
          // 검(sword)을 우대(preferPay)하고 다른 무기 소분류는 할인(otherPay)해서 받는다.
          { category: 'weapon', preferSubtype: 'sword', preferPay: 1.15, otherPay: 0.85, w: 3, qty: [2, 4] },
          { item: 'potion', w: 1, qty: [3, 6] },
          { item: 'iron_spear', w: 2, qty: [2, 4] }, { item: 'iron_helmet', w: 1, qty: [2, 4] },
        ],
        lines: { sold: ['수령했소. 수고 많소.', '보급 완료요. 고맙소.'], refused: ['…없다니 어쩔 수 없군. 다른 곳을 알아보겠소.', '납품처를 바꾸겠소.'], partial: '있는 만큼이라도 받겠소.' },
        greet: ['부대 보급이오. {item} {qty}개, {offer}G.', '{item} {qty}개, {offer}G. 영수증은 꼭 써 주시오.'],
      },
      {
        // 왕국 병사 외형 다양화용 — 같은 랜덤 병사 풀, 얼굴만 다르다 (visual variety only)
        id: 'k_soldier2', look: 'soldier2', job: '왕국 병사', portrait: '💂', weight: 1.5,
        names: ['한스', '브랜', '오스릭', '페넬'],
        wants: [
          { item: 'shield', w: 3, qty: [2, 4] },
          { category: 'weapon', preferSubtype: 'sword', preferPay: 1.15, otherPay: 0.85, w: 3, qty: [2, 4] },
          { item: 'potion', w: 1, qty: [3, 6] },
          { item: 'iron_spear', w: 2, qty: [2, 4] }, { item: 'iron_helmet', w: 1, qty: [2, 4] },
        ],
        lines: { sold: ['수령했소. 수고 많소.', '보급 완료요. 고맙소.'], refused: ['…없다니 어쩔 수 없군. 다른 곳을 알아보겠소.', '납품처를 바꾸겠소.'], partial: '있는 만큼이라도 받겠소.' },
        greet: ['부대 보급이오. {item} {qty}개, {offer}G.', '{item} {qty}개, {offer}G. 영수증은 꼭 써 주시오.'],
      },
      {
        id: 'k_hero', look: 'hero', job: '견습 용사', portrait: '🤴', weight: 1, minDay: 3,
        names: ['아서', '레이나'],
        wants: [{ item: 'dwarf_steel_sword', w: 3, qty: [1, 1], when: { flag: 'dwarf_steel_unlocked' } }, { item: 'iron_sword', w: 1, qty: [1, 1] }, { item: 'shield', w: 1, qty: [1, 1] }],
        lines: { sold: ['와, 고마워요! 이걸로 오우거도 문제없어요!'], refused: ['에이… 다음에 또 올게요.'], partial: '있는 것만이라도 살게요!' },
        greet: ['오우거 잡으러 가요! {item} {qty}개, {offer}G요!', '용사 수련 중이에요. {item} {qty}개, {offer}G뿐인데…'],
      },
      {
        id: 'k_mage', look: 'mage', job: '궁정 마법사', portrait: '🧙', weight: 1, minDay: 4,
        names: ['엘로웬', '마그누스', '티르'],
        wants: [
          { item: 'mana_crystal', w: 3, qty: [2, 4] }, { item: 'abyss_pearl', w: 1, qty: [1, 1] },
          { item: 'potion', w: 1, qty: [2, 4] }, { item: 'mana_potion', w: 1, qty: [2, 4] },
          { item: 'sapphire', w: 1, qty: [1, 1], pay: 1.05 }, // 궁정 마법사가 연구용으로 — 왕국 배율 0.95 × 1.05 ≈ 시세
        ],
        lines: { sold: ['좋소. 연구에 쓰겠소.'], refused: ['아쉽군. 다른 연구소를 알아보겠소.'], partial: '모자라지만 우선 받겠소.' },
        greet: ['연구용이오. {item} {qty}개, {offer}G. 출처는 안 묻겠소.', '궁정 예산이오. {item} {qty}개, {offer}G까지 드리지.'],
      },
      {
        id: 'k_paladin', look: 'paladin', job: '성기사', portrait: '🛡️', weight: 2,
        when: { var: 'demon_influence', gte: 12 },
        names: ['아우렐', '세라핀', '가브릴'],
        wants: [{ item: 'silver_sword', w: 4, qty: [1, 3] }, { item: 'potion', w: 1, qty: [3, 5] }],
        lines: { sold: ['빛의 이름으로 감사하오.'], refused: ['…성당은 기억하겠소.'], partial: '있는 것만이라도 받겠소.' },
        greet: ['밤안개가 짙소. 얼굴 없는 것들이 돌아다니오. {item} {qty}개, {offer}G.', '성당의 명이오. {item} {qty}개, {offer}G.'],
      },
    ],
  },

  goblin: {
    name: '고블린', fullName: '서부 숲 고블린 부족', icon: '👺', color: '#6fae3f', race: '고블린',
    payMult: 1.45, haggle: { tolerance: 0.35, patience: 2 },
    // 관계가 바닥이어도 발길이 끊기진 않는다 (min — 레온과 계약한 뒤 계속 돌려보내도 가끔은 온다)
    visit: { base: 2.5, relScale: 0.1, var: 'rel_goblin', min: 0.8 },
    trendBonus: 1.6,
    perUnit: {
      weapon: { goblin_power: 0.6, border_tension: 0.35, iron_price: 0.15 },
      armor: { goblin_power: 0.35, border_tension: 0.1 },
      consumable: { goblin_power: 0.1 },
      material: { goblin_power: 0.03, blackmarket: 0.05 },
    },
    perDeal: {
      sell: { rel_goblin: 2, rel_kingdom: -0.4, blackmarket: 0.4 },
      refuse: { rel_goblin: -1 }, // 돌려보낼 때마다 1씩 — 발길이 서서히 준다 (visit.relScale)
    },
    archetypes: [
      {
        id: 'g_raider', look: 'goblin_raider', job: '전사', portrait: '👺', weight: 1.5,
        names: ['크랙', '즐록', '비끄', '구르쉬', '낙낙'],
        wants: [
          { item: 'iron_sword', w: 3, qty: [2, 5] },
          // Phase 1 proof of concept: "무기 필요해, 화살이 특히 부족해" 류 — 화살을 우대하고 나머지 무기는 싸게 받는다.
          { category: 'weapon', preferSubtype: 'arrow', preferPay: 1.2, otherPay: 0.8, w: 1, qty: [2, 4] },
          { item: 'red_blade', w: 3, qty: [2, 4], when: { trend: 'red_blade' } },
          { item: 'shield', w: 1, qty: [2, 3], when: { trend: 'shield' } },
        ],
        lines: { sold: ['킥킥! 좋아 좋아, 칼이 번쩍번쩍이다구!', '인간, 좋은 인간! 또 온다구, 킥!'], refused: ['흥! 인간, 기억한다구.', '안 판다고? 킥… 인간, 기억할게.'], partial: '있는 만큼만! 나머지는 나중에 받는다구, 킥.' },
        greet: ['{item}! {qty}개! {offer}골드! 빨리빨리 줘, 인간!', '킥킥, 돈 많다구! {item} {qty}개, {offer}골드 줄게, 킥!'],
      },
      {
        // 고블린 전사 외형 다양화용 — 같은 랜덤 전사 풀, 얼굴만 다르다 (visual variety only)
        id: 'g_raider2', look: 'goblin_raider2', job: '전사', portrait: '👺', weight: 1.5,
        names: ['크랙', '즐록', '비끄', '구르쉬', '낙낙'],
        wants: [
          { item: 'iron_sword', w: 3, qty: [2, 5] },
          { category: 'weapon', preferSubtype: 'arrow', preferPay: 1.2, otherPay: 0.8, w: 1, qty: [2, 4] },
          { item: 'red_blade', w: 3, qty: [2, 4], when: { trend: 'red_blade' } },
          { item: 'shield', w: 1, qty: [2, 3], when: { trend: 'shield' } },
        ],
        lines: { sold: ['킥킥! 좋아 좋아, 칼이 번쩍번쩍이다구!', '인간, 좋은 인간! 또 온다구, 킥!'], refused: ['흥! 인간, 기억한다구.', '안 판다고? 킥… 인간, 기억할게.'], partial: '있는 만큼만! 나머지는 나중에 받는다구, 킥.' },
        greet: ['{item}! {qty}개! {offer}골드! 빨리빨리 줘, 인간!', '킥킥, 돈 많다구! {item} {qty}개, {offer}골드 줄게, 킥!'],
      },
      {
        id: 'g_trader', look: 'goblin_trader', job: '행상', portrait: '👺', weight: 2,
        names: ['즈긱', '패트낙', '미끄럼', '도둑잽이'],
        wants: [
          { item: 'potion', w: 2, qty: [4, 8] }, { item: 'bow', w: 2, qty: [3, 5] },
          { item: 'iron_ore', w: 1, qty: [10, 20] },
          { item: 'red_blade', w: 3, qty: [3, 5], when: { trend: 'red_blade' } },
        ],
        lines: { sold: ['킥킥! 장사 잘했다구, 인간!', '좋아 좋아! 부족한테 자랑한다구!'], refused: ['에이, 심술쟁이 인간!', '딴 데 간다구. 킥.'], partial: '있는 만큼! 있는 만큼만 줘, 킥!' },
        greet: ['{item} {qty}개, {offer}골드다구. 우리 부족이 좋아한다구, 킥킥!', '장사하자, 인간! 킥. {item} {qty}개, {offer}골드! 딴 데선 못 받는다구!'],
      },
    ],
  },

  dwarf: {
    name: '드워프', fullName: '강철수염 씨족', icon: '⚒️', color: '#c9803a', race: '드워프',
    payMult: 1.05, haggle: { tolerance: 0.06, patience: 0 },
    // 강철수염 왕국이 무너지면(dwarf_fallen — customers.js dwarf_herald) 발길이 거의 끊긴다: 대장장이·수집가는 오지 않고 피난민만 드문드문
    visit: { base: 2, relScale: 0.08, var: 'rel_dwarf', bonus: [{ when: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] }, add: 0.4 },
      { when: { flag: 'dwarf_fallen' }, add: WS.data.config.fairyDwarf.fallenVisit }] },
    perUnit: {
      weapon: { dwarf_tech: 0.05 },
      armor: {},
      consumable: {},
      material: { dwarf_tech: 0.12, iron_price: 0.08 },
    },
    perDeal: { sell: { rel_dwarf: 1.5, economy: 0.3 }, refuse: { rel_dwarf: -1 } },
    archetypes: [
      {
        id: 'd_smith', look: 'dwarf', job: '대장장이', portrait: '🧔', weight: 1.5, when: { noFlag: 'dwarf_fallen' },
        names: ['브론', '두린', '감리', '토르긴', '발린'],
        wants: [{ item: 'iron_ore', w: 5, qty: [10, 30] }, { item: 'potion', w: 1, qty: [2, 3] }],
        lines: { sold: ['좋은 쇠로군. 허허.', '망치질이 즐거워지겠구먼.'], refused: ['흠. 다른 광산을 알아보겠네.', '쇠 없는 무기점이라… 허허, 그럼 가겠네.'], partial: '있는 만큼만 가져가겠네.' },
        greet: ['{item} {qty}개, {offer}G일세. 흥정은 안 하네. 허허.', '용광로가 식겠네. {item} {qty}개, {offer}G에 주게.'],
      },
      {
        // 드워프 대장장이 외형 다양화용 — 같은 랜덤 대장장이 풀, 얼굴만 다르다 (visual variety only)
        id: 'd_smith2', look: 'dwarf2', job: '대장장이', portrait: '🧔', weight: 1.5, when: { noFlag: 'dwarf_fallen' },
        names: ['브론', '두린', '감리', '토르긴', '발린'],
        wants: [{ item: 'iron_ore', w: 5, qty: [10, 30] }, { item: 'potion', w: 1, qty: [2, 3] }],
        lines: { sold: ['좋은 쇠로군. 허허.', '망치질이 즐거워지겠구먼.'], refused: ['흠. 다른 광산을 알아보겠네.', '쇠 없는 무기점이라… 허허, 그럼 가겠네.'], partial: '있는 만큼만 가져가겠네.' },
        greet: ['{item} {qty}개, {offer}G일세. 흥정은 안 하네. 허허.', '용광로가 식겠네. {item} {qty}개, {offer}G에 주게.'],
      },
      {
        id: 'd_collector', look: 'dwarf', job: '광물 수집가', portrait: '🧔', weight: 1, minDay: 3, when: { noFlag: 'dwarf_fallen' },
        names: ['노리', '글로인'],
        wants: [{ item: 'iron_ore', w: 3, qty: [20, 40] }, { item: 'iron_sword', w: 1, qty: [2, 3] }],
        lines: { sold: ['좋은 광석이네. 허허.'], refused: ['흠. 딴 데를 뒤져 보겠네.'], partial: '있는 만큼이라도 챙겨 가겠네.' },
        greet: ['녹여 쓸 걸세. {item} {qty}개, {offer}G. 허허.'],
      },
      {
        // 산채가 무너진 뒤 — 피난 나온 드워프
        id: 'd_refugee', look: 'dwarf', job: '강철수염 피난민', portrait: '🧔', weight: 1, when: { flag: 'dwarf_fallen' },
        names: ['오인', '도리', '니알라'],
        wants: [{ item: 'potion', w: 3, qty: [1, 3] }, { item: 'shield', w: 1, qty: [1, 1] }],
        lines: { sold: ['고맙네… 이 은혜는 잊지 않겠네.'], refused: ['…그런가. 어쩔 수 없지.'], partial: '있는 것만이라도… 고맙네.' },
        greet: ['산채에서 걸어 나왔네. {item} {qty}개, {offer}G. 가진 게 이게 다일세.', '용광로가 식었네. {item} {qty}개만… {offer}G.'],
      },
      {
        // 화약 독점 판매상이 된 가게 — 쇠 대롱(총)을 시험하는 드워프가 찾아온다
        id: 'd_gunsmith', look: 'dwarf', job: '쇠 대롱 장인', portrait: '🧔', weight: 2,
        when: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] },
        names: ['브론의 조카 킬리', '둔', '바린'],
        wants: [{ item: 'black_powder', w: 5, qty: [3, 6], pay: 1.15 }, { item: 'iron_ore', w: 1, qty: [10, 20] }],
        lines: { sold: ['좋군! 쇠 대롱이 노래하겠네, 허허.'], refused: ['흠, 딴 데를 알아보겠네.'], partial: '모자라도 가져가겠네.' },
        greet: ['쇠 대롱에 넣어 볼 걸세. {item} {qty}개, {offer}G.', '천둥 가루는 여기서만 판다지? {item} {qty}개, {offer}G.'],
      },
    ],
  },

  village: {
    name: '마을', fullName: '동쪽 마을 주민', icon: '🌾', color: '#b8a96a', race: '인간',
    payMult: 0.75, haggle: { tolerance: 0.05, patience: 0 },
    // 티타니엘의 마지막 부탁(사흘 무기 금지 — flag fairy_oath3) 동안 발길이 는다. 그동안 사냥꾼도 활은 찾지 않는다
    visit: { base: 1, relScale: 0.05, var: 'rel_village', bonus: [{ when: { flag: 'fairy_oath3' }, add: WS.data.config.fairyDwarf.oathVisit.village }] },
    perUnit: {
      weapon: { village_defense: 1.2 },
      armor: { village_defense: 1 },
      consumable: { village_defense: 0.3 },
      material: {},
    },
    perDeal: { sell: { rel_village: 2, kingdom_morale: 0.8, reputation: 0.8 }, refuse: { rel_village: -1.5, kingdom_morale: -0.3 } },
    archetypes: [
      {
        id: 'v_hunter', look: 'hunter', job: '사냥꾼', portrait: '🧑‍🌾', weight: 2,
        names: ['마르타', '겔', '로빈'],
        wants: [{ item: 'bow', w: 3, qty: [1, 2], when: { noFlag: 'fairy_oath3' } }, { item: 'potion', w: 1, qty: [1, 3] }],
        lines: { sold: ['고마워요. 늑대 걱정 좀 덜겠어요.'], refused: ['…없나요. 딴 데 가 볼게요.'], partial: '있는 만큼만이라도 주세요.' },
        greet: ['늑대가 내려와요. {item} {qty}개, {offer}G뿐이에요.', '{item} {qty}개만요. 가진 게 {offer}G가 다라서.', '늑대가 내려왔소. {item} {qty}개, {offer}G뿐이오.'],
      },
      {
        // 무기 금지 약속 사흘 동안 — "요정불이 마을까지 내려왔대요" 하고 물약·방어구를 사러 오는 마을 사람들
        id: 'v_oath_folk', look: 'traveler', job: '동쪽 마을 주민', portrait: '🧑‍🌾', weight: 3, when: { flag: 'fairy_oath3' },
        names: ['한나', '톰', '베스', '오드'],
        wants: [{ item: 'potion', w: 3, qty: [2, 4] }, { item: 'shield', w: 2, qty: [1, 2] }, { item: 'iron_helmet', w: 1, qty: [1, 2] }, { item: 'holy_water', w: 1, qty: [1, 3] }],
        lines: { sold: ['고마워요. 마을 사람들이 좋아할 거예요.'], refused: ['그럼 딴 데 가 볼게요…'], partial: '있는 만큼만이라도 주세요.' },
        greet: ['칼 안 파신다면서요? 그럼 {item} {qty}개요. {offer}G.', '요정불이 마을까지 내려왔대요. {item} {qty}개, {offer}G에 주세요.'],
      },
    ],
  },

  // 안개 상단 (내부 id 는 옛 이름 demon 그대로 — rel_demon · demon_influence · demon_contract 등 저장/조건 호환):
  //   안개 낀 밤에만 오는, 얼굴이 흐릿한 상인들. 무기보다 물약·마력 재료·진귀품을 찾는다.
  //   돈보다 "조건"을 중시하고, 교환을 좋아하며, 금화 대신 기억을 받아 가기도 한다.
  // 거래의 결과는 늘 늦게, 다른 얼굴로 돌아온다.
  demon: {
    name: '안개 상단', fullName: '안개 낀 밤의 상단', icon: '🌫️', color: '#8e9aae', race: '안개 상인',
    payMult: 1.25, haggle: { tolerance: 0.3, patience: 1 },
    visit: { base: 0.6, relScale: 0.08, var: 'rel_demon', scaleVars: { demon_influence: 0.06 } },
    perUnit: {
      weapon: { demon_influence: 0.2, monster_pop: 0.1 },
      armor: { demon_influence: 0.1 },
      consumable: { demon_influence: 0.2 },
      material: { demon_influence: 0.35, demonlord_power: 0.05 },
      curio: { demon_influence: 0.6 },
    },
    perDeal: {
      sell: { rel_demon: 1.5, demon_influence: 0.6, kingdom_morale: -0.2 },
      trade: { rel_demon: 2, demon_influence: 1, blackmarket: 0.3 },
      refuse: { rel_demon: -1 },
    },
    archetypes: [
      {
        id: 'dm_broker', look: 'stranger', job: '계약 중개인', portrait: '🌫️', weight: 3, minDay: 3, late: true,
        names: ['흐린 목소리', '젖은 장갑', '회색 외투', '등불 없는 이', '이름을 두고 온 이'],
        wants: [
          { item: 'potion', w: 4, qty: [3, 8] }, { item: 'mana_crystal', w: 3, qty: [2, 4] },
          { item: 'abyss_pearl', w: 1, qty: [1, 1] }, { item: 'iron_ore', w: 1, qty: [5, 10] },
        ],
        lines: { sold: ['거래는 거래일세. 얼굴은 잊게.'], refused: ['안개는 또 끼네. 그때 다시 오지.'], partial: '있는 만큼만 받겠네. 나머지는… 기억으로 치르게.' },
        greet: ['{item} {qty}개, {offer}G… 모자라면 다른 걸로 치르지. 기억 같은 걸로.', '얼굴은 보지 말게, 어차피 잊을 테니. {item} {qty}개, {offer}G.'],
      },
      {
        id: 'dm_barterer', look: 'hooded', job: '안개 행상', portrait: '🌫️', weight: 3, minDay: 3, kind: 'trade', late: true,
        names: ['이름 모를 행상', '물기 어린 외투', '잿빛 장갑', '늦은 손님'],
        trades: [
          { w: 3, give: { item: 'mana_crystal', qty: [2, 4] }, want: { item: 'potion', qty: [4, 7] } },
          { w: 2, give: { item: 'abyss_pearl', qty: 1 }, want: { item: 'potion', qty: [6, 9] } },
          { w: 2, give: { item: 'mana_crystal', qty: [3, 5] }, want: { item: 'iron_ore', qty: [15, 25] }, gold: [0, 20] },
          { w: 1, give: { item: 'abyss_pearl', qty: 1 }, want: { item: 'shield', qty: [2, 3] }, gold: [10, 40] },
        ],
        lines: { traded: ['거래 성사일세. 안개 걷히기 전에 가겠네.'], refused: ['아쉽군. 안개가 걷히면 다시 오겠네.'] },
        greet: ['{want} {wantQty}개 주면 {give} {giveQty}개 드리지. 안개 걷히기 전에.', '교환하세. 내 {give} {giveQty}개, 자네 {want} {wantQty}개.'],
      },
    ],
  },

  // 마왕군: 마왕은 좀처럼 오지 않는다. 사자와 보급관이 대량으로, 비싸게 사 간다.
  // 여기에 판 물건은 북쪽에서 한꺼번에 돌아온다.
  demonlord: {
    name: '마왕군', fullName: '마왕군 · 검은 군단', icon: '💀', color: '#9a2a3a', race: '마족',
    payMult: 1.35, haggle: { tolerance: 0.2, patience: 1 },
    visit: { base: 0.3, relScale: 0.05, var: 'rel_demonlord', scaleVars: { demonlord_power: 0.015 } },
    perUnit: {
      weapon: { demonlord_power: 0.55, invasion_risk: 0.4, iron_price: 0.15 },
      armor: { demonlord_power: 0.35, invasion_risk: 0.25 },
      consumable: { demonlord_power: 0.08, invasion_risk: 0.03 },
      material: { demonlord_power: 0.08 },
      curio: { demonlord_power: 2, demon_influence: 0.5 },
    },
    perDeal: {
      sell: { rel_demonlord: 2, rel_kingdom: -1.2, invasion_risk: 1, kingdom_morale: -0.5, blackmarket: 0.5 },
      refuse: { rel_demonlord: -2 },
    },
    archetypes: [
      {
        id: 'dl_quartermaster', look: 'demon_soldier', job: '검은 군단 보급관', portrait: '💀', weight: 3,
        when: { any: [{ day: { gte: 5 } }, { var: 'demonlord_power', gte: 22 }] },
        names: ['모르그', '카르낙', '스크래치', '볼그'],
        wants: [
          { item: 'iron_sword', w: 3, qty: [3, 6] }, { item: 'shield', w: 2, qty: [3, 5] },
          { item: 'potion', w: 2, qty: [5, 8] }, { item: 'bow', w: 1, qty: [3, 5] },
          { item: 'dwarf_steel_sword', w: 2, qty: [2, 3], when: { flag: 'dwarf_steel_unlocked' } },
        ],
        lines: { sold: ['좋다. 폐하께 보고하겠다.'], refused: ['…그렇게 전하겠다. 폐하는 기억하신다.'], partial: '모자라도 받아 간다. 나머진 다음에 채워라.' },
        greet: ['군단 보급이다. {item} {qty}개, {offer}G. 넉넉하다.', '마왕 폐하의 명이다. {item} {qty}개, {offer}G.'],
      },
    ],
  },

  // ════════════════════ 확장 세력 ════════════════════
  // 대부분은 세계가 그들을 부를 때만 나타난다 (archetype 의 minDay / when). 한 판에 모든 세력을 만나지는 않는다.
  // 추가 필드
  //   visit.min  : 방문 가중치 하한 (기본 0.3 — 용·미지의 종족처럼 아주 드문 세력은 낮춘다)
  //   payScale   : { 변수: 배율 } 그 변수가 초기값보다 높을수록 씀씀이가 커진다
  //   payment    : 지불 방식 — credit(외상) / leafGold(요정 금화). TransactionManager.settle 참고
  //   perDeal.buy: 손님에게서 사들였을 때의 세계 변화 (장물 등)
  //   archetype  : kind 'sell' + offers: [{ item, qty, price(시세 배율), w, when }] 는 물건을 팔러 온 손님
  //                late: true 는 해가 진 뒤(맨 마지막)에 온다 / partialOk: false 는 전량이 아니면 사지 않는다
  //                wants[].pay: 그 물건에만 얹는 웃돈 배율 / onSell·onBuy·onTrade·onRefuse: 거래마다 효과

  // 요정: 쇠붙이를 싫어하고 물약·활·성수를 찾는다. 값은 후하게 치르지만 "요정 금화"라 다음 날 일부가 낙엽이 된다.
  // 흥정을 놀이로 여긴다. 숲의 생기가 꺼지면(드워프 용광로·골렘 공방) 발길을 끊는다.
  fairy: {
    name: '요정', fullName: '동쪽 숲 요정 궁정', icon: '🧚', color: '#8ad0a0', race: '요정',
    payMult: 1.5, haggle: { tolerance: 0.45, patience: 3 },
    payment: { leafGold: { chance: 0.45, frac: [0.3, 0.7] } },
    // 티타니엘의 마지막 부탁(사흘 무기 금지 — flag fairy_oath3) 동안은 숲의 심부름꾼이 자주 온다 (config.fairyDwarf.oathVisit)
    visit: { base: 0.2, relScale: 0.05, var: 'rel_fairy', scaleVars: { fairy_grace: 0.02 }, min: 0.1, bonus: [{ when: { flag: 'fairy_oath3' }, add: WS.data.config.fairyDwarf.oathVisit.fairy }] },
    perUnit: {
      weapon: { fairy_grace: 0.3, monster_pop: -0.25 },
      armor: { fairy_grace: -0.1 },
      consumable: { fairy_grace: 0.35, village_defense: 0.1 },
      material: { fairy_grace: -0.4 },
      curio: { fairy_grace: 0.3 },
    },
    perDeal: { sell: { rel_fairy: 2 }, trade: { rel_fairy: 2.5, fairy_grace: 0.5 }, refuse: { rel_fairy: -1 } },
    archetypes: [
      {
        id: 'f_sprite', look: 'fairy', job: '숲의 요정', portrait: '🧚', weight: 3, minDay: 5,
        when: { all: [{ eventFired: 'fairy_court_appears' }, { var: 'fairy_grace', gte: 14 }] },
        names: ['피오', '린들', '세이렌', '모스', '티티'],
        wants: [
          { item: 'potion', w: 3, qty: [2, 5] }, { item: 'bow', w: 2, qty: [1, 3], when: { noFlag: 'fairy_oath3' } },
          { item: 'holy_water', w: 1, qty: [2, 4] }, { item: 'sun_charm', w: 1, qty: [1, 1] },
          { item: 'eastern_spice', w: 1, qty: [2, 3], when: { has: { item: 'eastern_spice' } } },
        ],
        lines: { sold: ['와, 고마워요! 반짝반짝!'], refused: ['치이, 심술쟁이! 그래도 안녕이에요.'], partial: '있는 만큼만 가져갈게요!' },
        greet: ['{item} {qty}개예요! 금화 {offer}닢 줄게요. 오늘은 진짜예요.', '으, 쇠 냄새. 그래도 {item} {qty}개, {offer}G예요!', '깎기 놀이 할래요? {item} {qty}개에 {offer}G부터요!'],
      },
      {
        id: 'f_barter', look: 'fairy', job: '이슬 행상', portrait: '🧚', weight: 2, minDay: 5, kind: 'trade',
        when: { all: [{ eventFired: 'fairy_court_appears' }, { var: 'fairy_grace', gte: 18 }] },
        names: ['방울', '나리', '엘린'],
        trades: [
          { w: 3, give: { item: 'fairy_dust', qty: [3, 5] }, want: { item: 'potion', qty: [3, 6] } },
          { w: 2, give: { item: 'fairy_dust', qty: [4, 6] }, want: { item: 'bow', qty: [2, 3] }, when: { noFlag: 'fairy_oath3' } },
          { w: 1, give: { item: 'fairy_dust', qty: [2, 3] }, want: { item: 'eastern_spice', qty: [2, 3] }, when: { has: { item: 'eastern_spice' } } },
        ],
        lines: { traded: ['좋아요, 바꿔요! 숲의 선물이에요.'], refused: ['아쉬워요. 이슬은 마르기 전에 써야 하는데.'] },
        greet: ['금화는 무거워요. {want} {wantQty}개 주면 {give} {giveQty}병 드려요!', '바꿔요! 당신 {want} {wantQty}개랑 내 {give} {giveQty}개요!'],
      },
      {
        // 티타니엘의 마지막 부탁(사흘 무기 금지) 동안 — 약속을 지키는 가게를 먹여 살리러 오는 심부름꾼.
        // payment: {} → 요정 금화가 아니라 진짜 금화로 치른다 (factions payment.leafGold 를 덮어쓴다)
        id: 'f_oath_kin', look: 'fairy', job: '숲의 심부름꾼', portrait: '🧚', weight: 4, when: { flag: 'fairy_oath3' }, payment: {},
        names: ['이슬', '버들', '초롱', '달래'],
        wants: [
          { item: 'potion', w: 3, qty: [3, 5] }, { item: 'holy_water', w: 2, qty: [2, 4] }, { item: 'shield', w: 1, qty: [1, 2] },
          { item: 'mana_potion', w: 1, qty: [1, 3] }, { item: 'sun_charm', w: 1, qty: [1, 1] },
        ],
        lines: { sold: ['고마워요. 티타니엘 님께 전할게요.'], refused: ['…그럼 다음에 올게요.'], partial: '있는 만큼만 가져갈게요.' },
        greet: ['티타니엘 님 심부름이에요. {item} {qty}개, {offer}G. 오늘 건 진짜 금화예요!', '약속 지키는 가게죠? {item} {qty}개, {offer}G. 낙엽 아니에요.'],
      },
    ],
  },

  // 마법사 길드: 무기엔 관심 없다. 마력 결정·요정 가루·용비늘·별조각 같은 "연구 재료"에 돈을 아끼지 않는다.
  // 가게에 진귀품이 있으면 귀신같이 알고 찾아온다(when: has). 연구가 쌓이면 골렘·차원문으로 이어진다.
  mage: {
    name: '마법사 길드', fullName: '은빛 탑 마법사 길드', icon: '🪄', color: '#7a6ad8', race: '인간',
    payMult: 1.2, haggle: { tolerance: 0.15, patience: 2 },
    payScale: { arcane_power: 0.008 },
    visit: { base: 0.2, relScale: 0.06, var: 'rel_mage', scaleVars: { arcane_power: 0.02 } },
    perUnit: {
      weapon: {}, armor: {},
      consumable: { arcane_power: 0.1 },
      material: { arcane_power: 0.45 },
      curio: { arcane_power: 1.2, demon_influence: 0.2 },
    },
    perDeal: { sell: { rel_mage: 1.5 }, refuse: { rel_mage: -0.8 } },
    archetypes: [
      {
        id: 'mg_scholar', look: 'guild_mage', job: '길드 연구원', portrait: '🧙', weight: 3, minDay: 4,
        names: ['아르카', '펠릭스', '노바', '이그니스', '루미'],
        wants: [
          { item: 'mana_crystal', w: 4, qty: [2, 5] }, { item: 'alchemy_reagent', w: 1, qty: [3, 5] },
          { item: 'fairy_dust', w: 3, qty: [2, 4], when: { has: { item: 'fairy_dust' } }, pay: 1.2 },
          { item: 'dragon_scale', w: 4, qty: [1, 1], when: { has: { item: 'dragon_scale' } }, pay: 1.3 },
          { item: 'star_shard', w: 4, qty: [1, 1], when: { has: { item: 'star_shard' } }, pay: 1.4 },
          { item: 'abyss_pearl', w: 2, qty: [1, 1], when: { has: { item: 'abyss_pearl' } } },
          { item: 'mana_potion', w: 2, qty: [2, 4] },
          { item: 'sapphire', w: 2, qty: [1, 1], pay: 0.85 }, // 마법사 길드 배율 1.2 × 0.85 ≈ 시세 (보석 마진은 도매 원가 대비 +30% 안팎)
        ],
        lines: { sold: ['흥미롭군. 고맙네.'], refused: ['아쉽군. 연구는 계속되어야 하는데.'], partial: '있는 만큼이라도 가져가겠네.' },
        greet: ['{item}의 기운이 느껴지는군. {qty}개, {offer}G일세.', '{item} {qty}개, {offer}G. 영수증엔 "문구류"로 써 주게.'],
      },
      {
        id: 'mg_apprentice', look: 'guild_mage', job: '견습 마법사', portrait: '🧙', weight: 2, minDay: 4,
        names: ['토비', '에이미', '릭'],
        wants: [{ item: 'potion', w: 3, qty: [2, 4] }, { item: 'mana_crystal', w: 2, qty: [1, 2] }, { item: 'alchemy_reagent', w: 2, qty: [2, 3] }, { item: 'mana_potion', w: 3, qty: [2, 4] }],
        lines: { sold: ['고마워요! 스승님이 좋아하실 거예요.'], refused: ['으, 스승님께 혼나겠어요…'], partial: '있는 만큼이라도 주세요!' },
        greet: ['스승님 심부름이에요. {item} {qty}개, {offer}G 돼요?', '실험실이 또 터졌어요! {item} {qty}개, {offer}G요!'],
      },
    ],
  },

  // 용병: 칼과 석궁을 대량으로 산다. 돈이 모자라면 전리품으로 치른다(교환). 충성은 돈을 따라간다 —
  // 무장시킨 용병단은 나중에 가장 많이 주는 쪽에 붙고, 판세가 바뀌면 창끝을 돌린다 (events.js merc_*)
  merc: {
    name: '용병', fullName: '붉은 늑대 용병단', icon: '🐺', color: '#a8583a', race: '인간',
    payMult: 1.1, haggle: { tolerance: 0.25, patience: 2 },
    payScale: { merc_strength: 0.015 },
    visit: { base: 0.4, relScale: 0.06, var: 'rel_merc', scaleVars: { merc_strength: 0.04 }, bonus: [{ when: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] }, add: 0.6 }] },
    perUnit: {
      weapon: { merc_strength: 0.45, iron_price: 0.1 },
      armor: { merc_strength: 0.35 },
      consumable: { merc_strength: 0.05 },
      material: {}, curio: {},
    },
    perDeal: { sell: { rel_merc: 1.5, blackmarket: 0.2 }, refuse: { rel_merc: -1 } },
    archetypes: [
      {
        id: 'mc_sellsword', look: 'mercenary', job: '용병', portrait: '🐺', weight: 3, minDay: 5,
        when: { any: [{ flag: 'war' }, { flag: 'demon_war' }, { flag: 'civil_war' }, { var: 'border_tension', gte: 16 }, { var: 'invasion_risk', gte: 18 }, { var: 'merc_strength', gte: 12 }] },
        names: ['바르고', '레드', '실라', '곤', '말로'],
        wants: [
          { item: 'iron_sword', w: 3, qty: [3, 6] }, { item: 'crossbow', w: 3, qty: [2, 4] },
          { item: 'shield', w: 2, qty: [2, 4] }, { item: 'war_axe', w: 1, qty: [2, 3] },
          { item: 'plate_armor', w: 1, qty: [1, 2] }, { item: 'potion', w: 1, qty: [4, 6] },
          { item: 'iron_spear', w: 2, qty: [3, 5] }, { item: 'iron_helmet', w: 1, qty: [2, 4] },
        ],
        lines: { sold: ['좋아, 받아 간다.', '돈값은 하겠지. 고맙다.'], refused: ['쳇. 다른 데서 구하지.', '없으면 됐다.'], partial: '있는 것만 챙긴다.' },
        greet: ['일감이 들어왔다. {item} {qty}개, {offer}G.', '전쟁 냄새가 난다. {item} {qty}개, {offer}G. 현금이다.'],
      },
      {
        id: 'mc_looter', look: 'mercenary', job: '전리품 담당', portrait: '🐺', weight: 2, minDay: 6, kind: 'trade',
        when: { any: [{ flag: 'war' }, { flag: 'demon_war' }, { flag: 'succession_crisis' }, { var: 'merc_strength', gte: 14 }] },
        names: ['자루', '핀', '오르소'],
        trades: [
          { w: 3, give: { item: 'pearl', qty: [1, 2] }, want: { item: 'iron_sword', qty: [3, 4] } },
          { w: 2, give: { item: 'eastern_spice', qty: [4, 6] }, want: { item: 'shield', qty: [2, 3] } },
          { w: 1, give: { item: 'abyss_pearl', qty: 1 }, want: { item: 'crossbow', qty: [2, 3] } },
          { w: 2, give: { item: 'dragon_scale', qty: 1 }, want: { item: 'crossbow', qty: [3, 4] }, when: { flag: 'dragon_slain' } },
        ],
        lines: { traded: ['거래 성사다. 출처는 묻지 마라.'], refused: ['쳇, 됐다. 딴 데 간다.'] },
        greet: ['금화 대신 이걸로. {give} {giveQty}개 줄 테니 {want} {wantQty}개.', '출처는 묻지 마. {give} {giveQty}개랑 네 {want} {wantQty}개.'],
      },
      {
        // 화약 독점 판매상 소문을 듣고 온 화약병 — 전쟁이 없어도 온다
        id: 'mc_powder', look: 'mercenary', job: '용병단 화약병', portrait: '🐺', weight: 3,
        when: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] },
        names: ['퓨즈', '검댕', '귀머거리 올라프'],
        wants: [{ item: 'black_powder', w: 5, qty: [3, 6], pay: 1.2 }, { item: 'crossbow', w: 1, qty: [1, 2] }],
        lines: { sold: ['좋아. 성문이 좀 시끄럽겠군.'], refused: ['쳇. 화약 없이 성문을 어떻게 열라고.'], partial: '있는 것만 챙긴다.' },
        greet: ['성문 하나 날릴 거다. {item} {qty}개, {offer}G.', '화약은 이 집이라며? {item} {qty}개, {offer}G. 현금이다.'],
      },
    ],
  },

  // 사냥꾼 조합: 활·은화살·성수를 산다. 몬스터와 흡혈귀가 많을수록 현상금이 올라 씀씀이가 커진다.
  // 이들에게 판 은은 밤의 궁정을 무너뜨리고 — 궁정이 무너지면 무덤이 열린다.
  hunter: {
    name: '사냥꾼 조합', fullName: '은화살 사냥꾼 조합', icon: '🦌', color: '#6a8a4a', race: '인간',
    payMult: 0.9, haggle: { tolerance: 0.1, patience: 1 },
    payScale: { monster_pop: 0.015, vampire_power: 0.01 },
    visit: { base: 0.3, relScale: 0.06, var: 'rel_hunter', scaleVars: { monster_pop: 0.012 } },
    perUnit: {
      weapon: { monster_pop: -0.3, vampire_power: -0.15 },
      armor: {},
      consumable: { monster_pop: -0.05, undead_power: -0.1 },
      material: {},
      curio: { vampire_power: -0.5 },
    },
    perDeal: { sell: { rel_hunter: 1.5, rel_village: 0.3 }, refuse: { rel_hunter: -1 } },
    archetypes: [
      {
        id: 'ht_tracker', look: 'lodge_hunter', job: '조합 사냥꾼', portrait: '🏹', weight: 3, minDay: 3,
        when: { any: [{ var: 'monster_pop', gte: 38 }, { flag: 'vampire_known' }, { var: 'undead_power', gte: 12 }] },
        names: ['쥬드', '카산드라', '올릭', '벤', '레아'],
        wants: [
          // Phase 1 proof of concept: 화살을 우대하고, 창(spear)은 사냥꾼 조합이 안 쓰는 무기라 아예 거절한다.
          { category: 'weapon', preferSubtype: 'arrow', preferPay: 1.25, otherPay: 0.7, refuseSubtypes: ['spear'], w: 2, qty: [1, 3] },
          { item: 'silver_arrow', w: 3, qty: [3, 8] }, { item: 'potion', w: 2, qty: [2, 4] },
          { item: 'silver_sword', w: 2, qty: [1, 2], when: { flag: 'vampire_known' } },
          { item: 'sun_charm', w: 2, qty: [1, 2], when: { flag: 'vampire_known' } },
          { item: 'holy_water', w: 2, qty: [3, 5], when: { var: 'undead_power', gte: 12 } },
        ],
        lines: { sold: ['고맙소. 사냥이 수월해지겠소.'], refused: ['…알겠소. 다른 데를 찾겠소.'], partial: '있는 만큼만 주시오.' },
        greet: ['현상금이 올랐소. {item} {qty}개, {offer}G. 서두르시오.', '{item} {qty}개, {offer}G. 밤 사냥감은… 사람 얼굴이오.'],
      },
      {
        id: 'ht_trophy', look: 'lodge_hunter', job: '전리품 사냥꾼', portrait: '🏹', weight: 1, minDay: 5, kind: 'sell',
        when: { any: [{ var: 'monster_pop', gte: 36 }, { flag: 'dragon_slain' }, { var: 'undead_power', gte: 15 }] },
        names: ['브랜트', '미샤'],
        offers: [
          { w: 2, item: 'bone_dust', qty: [5, 10], price: 0.5 },
          { w: 4, item: 'dragon_scale', qty: [1, 2], price: 0.6, when: { flag: 'dragon_slain' } },
        ],
        lines: { bought: ['좋소. 흥정은 않겠소.'], declined: ['…그럼 다른 데 팔겠소.'] },
        greet: ['사냥감에서 나온 {item} {qty}개요. {offer}G에 넘기겠소.'],
      },
    ],
  },

  // 흡혈귀 궁정: 해가 진 뒤에만 온다(late). 겉으로는 귀족. 숨은 목적은 시장에서 "은"을 치우는 것 —
  // 은검·은화살·태양 부적·성수를 웃돈을 얹어 사들인다. 여기에 판 은은 사냥꾼 손에 들어가지 않는다.
  vampire: {
    name: '흡혈귀', fullName: '밤의 궁정 · 흡혈귀 귀족', icon: '🦇', color: '#8a1a3a', race: '흡혈귀',
    payMult: 1.5, haggle: { tolerance: 0.3, patience: 2 },
    visit: { base: 0.1, relScale: 0.06, var: 'rel_vampire', scaleVars: { vampire_power: 0.03 }, min: 0.1 },
    perUnit: {
      weapon: { vampire_power: 0.4 },
      armor: { vampire_power: 0.2 },
      consumable: { vampire_power: 0.3 },
      material: {},
      curio: { vampire_power: 0.8 },
    },
    perDeal: {
      sell: { rel_vampire: 2, rel_hunter: -0.8 },
      trade: { rel_vampire: 2.5, rel_hunter: -0.8, blackmarket: 0.3 },
      refuse: { rel_vampire: -1.5 },
    },
    archetypes: [
      {
        id: 'vp_collector', look: 'vampire', job: '밤의 귀족', portrait: '🦇', weight: 3, minDay: 6, late: true,
        when: { any: [{ flag: 'vampire_known' }, { var: 'vampire_power', gte: 18 }] },
        names: ['마르셀', '비비안', '루시앙', '카르밀라', '오데트'],
        wants: [
          { item: 'silver_arrow', w: 3, qty: [5, 10], pay: 1.6 }, { item: 'silver_sword', w: 3, qty: [1, 3], pay: 1.4 },
          { item: 'sun_charm', w: 2, qty: [1, 3], pay: 1.8 }, { item: 'holy_water', w: 2, qty: [3, 6], pay: 1.5 },
          { item: 'eastern_spice', w: 1, qty: [2, 4] },
        ],
        lines: { sold: ['고맙구려. 좋은 수집품이 되겠소.'], refused: ['아쉽구려. 밤은 길고, 가게는 많으니.'], partial: '있는 것만이라도 받겠소.' },
        greet: ['(해 진 뒤) {item} {qty}개, {offer}G. 수집이 취미라오.', '{item} {qty}개, {offer}G. 은은… 아주 싫어한다오.'],
      },
      {
        id: 'vp_courtier', look: 'vampire', job: '궁정 집사', portrait: '🦇', weight: 2, minDay: 7, late: true, kind: 'trade',
        when: { any: [{ flag: 'vampire_known' }, { var: 'vampire_power', gte: 20 }] },
        names: ['세바스', '모르티머'],
        trades: [
          { w: 3, give: { item: 'pearl', qty: [1, 2] }, want: { item: 'silver_sword', qty: [1, 2] }, gold: [20, 60] },
          { w: 2, give: { item: 'abyss_pearl', qty: 1 }, want: { item: 'silver_arrow', qty: [4, 6] } },
          { w: 1, give: { item: 'pearl', qty: 1 }, want: { item: 'eastern_spice', qty: [3, 4] } },
        ],
        lines: { traded: ['현명한 교환이오. 주인께 그리 전하겠소.'], refused: ['유감이오. 주인께 그리 전하겠소.'] },
        greet: ['금화 대신이오. {give} {giveQty}개로 {want} {wantQty}개를 청하오.', '{give} {giveQty}개에 웃돈 {gold}G. {want} {wantQty}개를 주시구려.'],
      },
    ],
  },

  // 사령술 교단: 죽은 자는 흥정하지 않는다(인내심 0). 거절해도 원한을 품지 않는다 — 기다릴 뿐이다.
  // 칼과 방패로 해골 병사를 무장시키고, 무덤에서 나온 것(뼛가루·진주)으로 값을 치른다.
  undead: {
    name: '사령술 교단', fullName: '잿빛 수의 사령술 교단', icon: '☠️', color: '#6a8a6a', race: '언데드',
    payMult: 0.85, haggle: { tolerance: 0, patience: 0 },
    visit: { base: 0.1, relScale: 0.05, var: 'rel_undead', scaleVars: { undead_power: 0.035 }, min: 0.05 },
    perUnit: {
      weapon: { undead_power: 0.6 },
      armor: { undead_power: 0.4 },
      consumable: { undead_power: 0.1 },
      material: { undead_power: 0.3 },
      curio: { undead_power: 0.8, demon_influence: 0.2 },
    },
    perDeal: {
      sell: { rel_undead: 2, rel_church: -1.5, reputation: -0.5 },
      trade: { rel_undead: 2, rel_church: -1.5, reputation: -0.5 },
      refuse: {},
    },
    archetypes: [
      {
        id: 'ud_acolyte', look: 'necromancer', job: '교단 복사', portrait: '☠️', race: '인간', weight: 3, minDay: 5, late: true,
        when: { any: [{ var: 'undead_power', gte: 12 }, { flag: 'graves_opened' }] },
        names: ['모라크', '셀라', '그레이브', '노스'],
        wants: [
          { item: 'iron_sword', w: 3, qty: [3, 6] }, { item: 'shield', w: 3, qty: [3, 5] },
          { item: 'alchemy_reagent', w: 1, qty: [3, 5] }, { item: 'abyss_pearl', w: 1, qty: [1, 1], when: { has: { item: 'abyss_pearl' } } },
        ],
        lines: { sold: ['고맙소. 죽은 자도 감사할 것이오.'], refused: ['…괜찮소. 죽은 자는 기다림에 익숙하니.'], partial: '있는 만큼만 받겠소.' },
        greet: ['{item} {qty}개, {offer}G. 쓸 자는… 곧 일어나오.', '(흙냄새) {item} {qty}개, {offer}G. 두 번 말하지 않소.'],
      },
      {
        id: 'ud_bones', look: 'skeleton', job: '해골 짐꾼', portrait: '💀', weight: 2, minDay: 7, late: true, kind: 'trade',
        when: { var: 'undead_power', gte: 20 },
        names: ['(이름 없음)', '(이름이 지워진 자)'],
        trades: [
          { w: 3, give: { item: 'bone_dust', qty: [6, 10] }, want: { item: 'iron_sword', qty: [2, 4] } },
          { w: 2, give: { item: 'pearl', qty: [1, 2] }, want: { item: 'shield', qty: [3, 4] } },
          { w: 1, give: { item: 'abyss_pearl', qty: 1 }, want: { item: 'iron_sword', qty: [4, 5] } },
        ],
        lines: { traded: ['(달그락)'], refused: ['(달그락…)'] },
        greet: ['(달그락) …{give}… {giveQty}… {want}… {wantQty}…', '(쏟아 놓는다) {give} {giveQty}개. (가리킨다) {want} {wantQty}개.'],
      },
    ],
  },

  // 용: 거의 오지 않는다. 오면 크다. 반짝이는 것(진주·반지·별조각)에 금화를 산처럼 쏟는다.
  // 한 번은 흥정을 웃어넘기지만 두 번은 없다. 거절은 기억한다 — 산 위의 뒤척임이 커진다.
  dragon: {
    name: '용', fullName: '재의 산의 붉은 용', icon: '🐉', color: '#c0401e', race: '용',
    payMult: 2.2, haggle: { tolerance: 0.5, patience: 0 },
    visit: { base: 0.2, relScale: 0.02, var: 'rel_dragon', min: 0.05 },
    perUnit: {
      weapon: {}, armor: {}, consumable: {},
      material: { dragon_stir: -0.3 },
      curio: { dragon_stir: -1.5 },
    },
    perDeal: { sell: { rel_dragon: 3 }, trade: { rel_dragon: 3 }, refuse: { rel_dragon: -3, dragon_stir: 1 } },
    archetypes: [
      {
        id: 'dr_kobold', look: 'kobold', job: '용의 시종', portrait: '🦎', race: '코볼트', weight: 3,
        when: { all: [{ flag: 'dragon_awake' }, { noFlag: 'dragon_slain' }] },
        names: ['스닉', '쿠르르', '잽'],
        wants: [
          { item: 'pearl', w: 3, qty: [1, 3] }, { item: 'silver_sword', w: 1, qty: [1, 2] },
          { item: 'dwarf_steel_sword', w: 1, qty: [1, 2] }, { item: 'cursed_ring', w: 3, qty: [1, 1], when: { has: { item: 'cursed_ring' } } },
          { item: 'abyss_pearl', w: 2, qty: [1, 1], when: { has: { item: 'abyss_pearl' } } },
          { item: 'star_shard', w: 3, qty: [1, 1], when: { has: { item: 'star_shard' } } },
        ],
        lines: { sold: ['좋아, 캬! 주인님께 바친다!'], refused: ['안 판다고? 주인님께 이를 거다, 캬!'], partial: '있는 만큼! 캬!' },
        greet: ['주인님이 반짝이 원한다, 캬! {item} {qty}개! {offer}G!', '{item} {qty}개, {offer}G다, 캬. 안 팔면 주인님께 이를 거다!'],
      },
      {
        id: 'dr_hoard', look: 'kobold', job: '보물 창고지기', portrait: '🦎', race: '코볼트', weight: 2, kind: 'trade',
        when: { all: [{ flag: 'dragon_awake' }, { noFlag: 'dragon_slain' }] },
        names: ['그락', '팁'],
        trades: [
          { w: 3, give: { item: 'dragon_scale', qty: 1 }, want: { item: 'pearl', qty: [2, 3] }, gold: [50, 150] },
          { w: 2, give: { item: 'dragon_scale', qty: 1 }, want: { item: 'silver_sword', qty: [2, 3] } },
          { w: 1, give: { item: 'dragon_scale', qty: 2 }, want: { item: 'star_shard', qty: 1 } },
        ],
        lines: { traded: ['캬! 반짝이가 온다!'], refused: ['에이, 주인님이 화낸다, 캬…'] },
        greet: ['허물 {give} {giveQty}장에 웃돈 {gold}G, 캬! 대신 {want} {wantQty}개!'],
      },
    ],
  },

  // 상인 길드: 경쟁자이자 동업자. 재료를 시세보다 싸게, 대신 꾸준히 대량으로 사 간다. 흥정이 곧 대화다.
  // 가입을 권하고(도매 할인), 거절하면 임대료로 조이고, 철광석을 매점해 시장을 쥐려 한다.
  guild: {
    name: '상인 길드', fullName: '금저울 상인 길드', icon: '⚖️', color: '#c8a838', race: '인간',
    payMult: 0.85, haggle: { tolerance: 0.2, patience: 3 },
    visit: { base: 0.6, relScale: 0.05, var: 'rel_guild', scaleVars: { guild_grip: 0.02 } },
    perUnit: {
      weapon: { guild_grip: 0.1 },
      armor: { guild_grip: 0.1 },
      consumable: { guild_grip: 0.08, economy: 0.05 },
      material: { guild_grip: 0.1, iron_price: 0.12 },
      curio: { guild_grip: 0.3 },
    },
    perDeal: { sell: { rel_guild: 1, economy: 0.3 }, buy: { rel_guild: 0.8, guild_grip: 0.3 }, refuse: { rel_guild: -0.5 } },
    archetypes: [
      {
        id: 'gd_broker', look: 'guild_merchant', job: '길드 중개인', portrait: '💼', weight: 3, minDay: 3,
        names: ['오르신', '데보라', '클라우스', '핌'],
        wants: [
          { item: 'iron_ore', w: 4, qty: [15, 30] }, { item: 'potion', w: 2, qty: [5, 10] },
          { item: 'alchemy_reagent', w: 1, qty: [4, 6] }, { item: 'eastern_spice', w: 2, qty: [3, 6], pay: 1.2 }, // 재고가 없어도 찾는다 — 없으면 빈손으로 돌려보내고 내일 다시 온다
          // 보석 — 길드 배율 0.85 × 1.2 ≈ 시세. 시세(gemTrend)가 오르내리는 대로 값이 따라간다
          { item: 'pearl', w: 1, qty: [1, 2], pay: 1.2 }, { item: 'diamond', w: 0.6, qty: [1, 1], pay: 1.2 },
          { item: 'ruby', w: 0.6, qty: [1, 2], pay: 1.2 }, { item: 'emerald', w: 0.6, qty: [1, 2], pay: 1.2 },
        ],
        lines: { sold: ['거래 성립이오. 길드는 신용을 잊지 않소.'], refused: ['…아쉽지만 물건이 없다니 어쩔 수 없소.'], partial: '있는 만큼이라도 사겠소.' },
        greet: ['길드 도매가요. {item} {qty}개, {offer}G. 꾸준히 사지요.', '{item} {qty}개, {offer}G부터. 흥정은 길드의 예절이오.'],
      },
      {
        id: 'gd_supplier', look: 'guild_merchant', job: '길드 납품업자', portrait: '💼', weight: 2, minDay: 4, kind: 'sell',
        names: ['마티아스', '훌다'],
        offers: [
          { w: 3, item: 'potion', qty: [6, 10], price: 0.8 }, { w: 2, item: 'iron_ore', qty: [15, 25], price: 0.8 },
          { w: 1, item: 'shield', qty: [2, 3], price: 0.8 },
          { w: 2, item: 'eastern_spice', qty: [4, 6], price: 0.75, when: { var: 'trade_routes', gte: 30 } },
        ],
        lines: { bought: ['좋소. 거래가 성립이오.'], declined: ['그렇소? 그럼 딴 데 넘기겠소.'] },
        greet: ['재고 {item} {qty}개, {offer}G. 조건은… 아직 없소.'],
      },
    ],
  },

  // 대성당: 성수·은·태양 부적을 산다. 값은 박하다(십일조라 여긴다) — 대신 평판과 민심이 오른다.
  // 흥정하는 상인은 소문이 난다. 안개 상단·언데드와 거래한 가게는 결국 파문을 당할 수 있다.
  church: {
    name: '대성당', fullName: '빛의 대성당', icon: '⛪', color: '#e0cc70', race: '인간',
    payMult: 0.8, haggle: { tolerance: 0.03, patience: 0 },
    visit: { base: 0.3, relScale: 0.06, var: 'rel_church', scaleVars: { church_authority: 0.012 } },
    perUnit: {
      weapon: { church_authority: 0.3, undead_power: -0.3, vampire_power: -0.2, demon_influence: -0.2 },
      armor: { church_authority: 0.15 },
      consumable: { church_authority: 0.1, undead_power: -0.15 },
      material: {},
      curio: { church_authority: 0.3, vampire_power: -0.4 },
    },
    perDeal: { sell: { rel_church: 1.5, reputation: 1, kingdom_morale: 0.3 }, refuse: { rel_church: -1.5, reputation: -0.3 } },
    archetypes: [
      {
        id: 'ch_priest', look: 'priest', job: '대성당 사제', portrait: '⛪', weight: 3, minDay: 4,
        when: { any: [{ var: 'church_authority', gte: 27 }, { var: 'demon_influence', gte: 10 }, { var: 'undead_power', gte: 10 }, { var: 'monster_pop', gte: 36 }, { flag: 'war' }, { flag: 'succession_crisis' }] },
        names: ['베네딕트', '아그네스', '요한', '클라라'],
        wants: [
          { item: 'holy_water', w: 3, qty: [4, 8] }, { item: 'potion', w: 3, qty: [4, 8] },
          { item: 'sun_charm', w: 1, qty: [1, 2] },
          { item: 'silver_sword', w: 1, qty: [1, 2], when: { any: [{ var: 'demon_influence', gte: 12 }, { var: 'undead_power', gte: 15 }] } },
          { item: 'mana_potion', w: 1, qty: [2, 4], pay: 1.3 }, // 대성당 배율 0.8 — 성직자도 기도력은 필요하다
          { item: 'ruby', w: 1, qty: [1, 1], pay: 1.25 }, // 제단 장식용 (0.8 × 1.25 ≈ 시세)
        ],
        lines: { sold: ['고마워요. 주님이 기억하실 거예요.'], refused: ['…어쩔 수 없네요. 주님의 뜻이겠죠.'], partial: '있는 만큼이라도 감사히 받을게요.' },
        greet: ['구호소 물자가 모자라요. {item} {qty}개, {offer}G에 부탁드려요.', '{item} {qty}개, {offer}G. 봉헌이니 값은 다투지 마세요.'],
      },
      {
        id: 'ch_templar', look: 'paladin', job: '성당 기사', portrait: '🛡️', weight: 2, minDay: 6,
        when: { any: [{ var: 'church_authority', gte: 30 }, { var: 'undead_power', gte: 15 }, { flag: 'vampire_known' }] },
        names: ['울릭', '마틸다', '테오'],
        wants: [
          { item: 'silver_sword', w: 3, qty: [1, 3] }, { item: 'holy_water', w: 2, qty: [5, 8] },
          { item: 'plate_armor', w: 1, qty: [1, 2] }, { item: 'silver_arrow', w: 1, qty: [4, 8] },
        ],
        lines: { sold: ['성당이 기억하겠소.'], refused: ['…성당은 기억하겠소.'], partial: '있는 것만이라도 받겠소.' },
        greet: ['어둠이 짙어지고 있소. {item} {qty}개, {offer}G.', '대성당의 명이오. {item} {qty}개, {offer}G. 성당이 보고 있소.'],
      },
    ],
  },

  // 궁정 귀족: 좋은 무기와 사치품에 후하게 부른다. 단, 절반만 내고 나머지는 "가문의 이름으로" 외상.
  // 왕위 계승 분쟁이 터지면 두 파벌이 따로 찾아온다 — 진 쪽의 외상값은 떼인다.
  noble: {
    name: '궁정 귀족', fullName: '루멘 궁정 · 계승 파벌', icon: '🏰', color: '#9a5ad0', race: '인간',
    payMult: 1.6, haggle: { tolerance: 0.12, patience: 1 },
    payment: { credit: { now: 0.5, inDays: [2, 4] } },
    visit: { base: 0.3, relScale: 0.05, var: 'rel_noble' },
    perUnit: {
      weapon: { kingdom_power: 0.15 },
      armor: { kingdom_power: 0.1 },
      consumable: {}, material: {},
      curio: { vampire_power: 0.2 },
    },
    perDeal: { sell: { rel_noble: 1.5, reputation: 0.3 }, refuse: { rel_noble: -1.5 } },
    archetypes: [
      {
        id: 'nb_courtier', look: 'noble_lord', job: '궁정 귀족', portrait: '🎩', weight: 2, minDay: 6,
        when: { all: [{ noFlag: 'succession_crisis' }, { any: [{ var: 'economy', gte: 53 }, { has: { item: 'eastern_spice' } }, { has: { item: 'pearl' } }, { has: { item: 'diamond' } }, { has: { item: 'ruby' } }] }] },
        names: ['폰 하겐 경', '로샤 백작부인', '에드몽 자작'],
        wants: [
          { item: 'eastern_spice', w: 2, qty: [3, 5], pay: 0.85 },
          { item: 'plate_armor', w: 2, qty: [1, 1] }, { item: 'silver_sword', w: 2, qty: [1, 2] },
          { item: 'dwarf_steel_sword', w: 1, qty: [1, 1] }, { item: 'transform_potion', w: 1, qty: [1, 2], pay: 0.8 },
          // 보석 — 귀족 배율 1.6 × 0.62 ≈ 시세 (도매 원가 대비 +30% 안팎). 하루 한두 번 나오는 고가 물품
          { item: 'diamond', w: 2, qty: [1, 2], pay: 0.62 }, { item: 'ruby', w: 2, qty: [1, 2], pay: 0.62 },
          { item: 'pearl', w: 2, qty: [1, 2], pay: 0.62 },
        ],
        lines: { sold: ['좋소. 가문의 이름으로 셈을 치르겠소.'], refused: ['…무례하구려. 가문이 기억하겠소.'], partial: '있는 만큼만 받겠소.' },
        greet: ['{item} {qty}개, {offer}G. 절반은 가문의 이름으로 외상이오.', '가문 문장이 보증이오. {item} {qty}개, {offer}G. 반은 외상이오.'],
      },
      {
        id: 'nb_aldric', look: 'noble_lord', job: '알드릭 왕자파 기사', portrait: '⚔️', weight: 3,
        when: { all: [{ flag: 'succession_crisis' }, { noFlag: 'crowned' }] },
        payment: { credit: { now: 0.5, inDays: [3, 5], defaultWhen: { any: [{ flag: 'queen_serena' }, { flag: 'vampire_regent' }] }, defaultText: '{name}의 외상값 {amount}G는 떼였다. 왕자파 가문들은 새 치세에서 영지를 몰수당했다.' } },
        names: ['가웨인 경', '브루노 경', '하랄드 경'],
        wants: [
          { item: 'crossbow', w: 3, qty: [2, 4] }, { item: 'plate_armor', w: 2, qty: [1, 2] },
          { item: 'dwarf_steel_sword', w: 2, qty: [1, 2] }, { item: 'iron_sword', w: 2, qty: [3, 5] },
          { item: 'diamond', w: 1, qty: [1, 1], pay: 0.62 }, { item: 'iron_helmet', w: 2, qty: [3, 5] }, { item: 'iron_spear', w: 2, qty: [3, 5] },
        ],
        onSell: { vars: { succession: 2 } },
        lines: { sold: ['좋다. 전하께 보고하겠다.'], refused: ['…뭐라? 상인 주제에. 기억해 두마.'], partial: '있는 만큼만 받는다.' },
        greet: ['왕자 전하의 사병용이다. {item} {qty}개, {offer}G. 반은 외상.', '즉위하시면 열 배로 갚지. {item} {qty}개, {offer}G.'],
      },
      {
        id: 'nb_serena', look: 'noble_lady', job: '세레나 공주파 귀부인', portrait: '👸', weight: 3,
        when: { all: [{ flag: 'succession_crisis' }, { noFlag: 'crowned' }] },
        payment: { credit: { now: 0.5, inDays: [3, 5], defaultWhen: { any: [{ flag: 'king_aldric' }, { flag: 'vampire_regent' }] }, defaultText: '{name}의 외상값 {amount}G는 떼였다. 공주파 귀부인들은 수도를 떠나 수녀원으로 들어갔다.' } },
        names: ['이졸데 부인', '마리안 백작부인', '엘레오노르'],
        wants: [
          { item: 'holy_water', w: 2, qty: [4, 8] }, { item: 'potion', w: 2, qty: [5, 8] },
          { item: 'silver_sword', w: 1, qty: [1, 2] }, { item: 'eastern_spice', w: 2, qty: [3, 5], pay: 0.85 },
          { item: 'sun_charm', w: 1, qty: [1, 2] },
          { item: 'emerald', w: 2, qty: [1, 2], pay: 0.62 }, { item: 'sapphire', w: 1, qty: [1, 2], pay: 0.62 }, { item: 'pearl', w: 1, qty: [1, 2], pay: 0.62 },
        ],
        onSell: { vars: { succession: -2, church_authority: 0.5 } },
        lines: { sold: ['고마워요. 공주님께서 기뻐하실 거예요.'], refused: ['…어쩔 수 없죠. 다음에 또 올게요.'], partial: '있는 만큼만이라도 주세요.' },
        greet: ['공주님 구호소용이에요. {item} {qty}개, {offer}G. 반은 외상.', '칼보다 민심이죠. {item} {qty}개, {offer}G. 절반은 외상.'],
      },
    ],
  },

  // 도적단: 싼 칼과 활을 원한다. 훔친 물건으로 값을 치르기도 한다. 거절은 기억된다 — 밤에 찾아온다.
  // 이들에게 판 칼은 가도를 끊고(교역로↓), 나그네의 발길이 줄어든다.
  // 뒷골목 장물 시장도 도적단 몫이다 (예전 "그림자 조합"): 매입꾼은 무엇이든 사고, 장물아비는 장물을 헐값에 넘긴다 —
  // 사들인 장물은 장부에 남는다(bought). 소속을 대지 않는 손님이라 거래마다 암시장 활성도가 오른다 (config.smuggling.offBooks)
  bandit: {
    name: '도적단', fullName: '검은 두건 도적단', icon: '🗡️', color: '#7a3a2a', race: '인간',
    affil: { claim: null, seal: false, lines: ['그런 걸 왜 묻소. 물건이나 내놓으시오.', '소속? 인장? 칼자루면 됐지.'] },
    payMult: 1.15, haggle: { tolerance: 0.2, patience: 1 },
    visit: { base: 0.2, relScale: 0.05, var: 'rel_bandit', scaleVars: { bandit_power: 0.035, blackmarket: 0.03 }, bonus: [{ when: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] }, add: 0.3 }] },
    perUnit: {
      weapon: { bandit_power: 0.5, trade_routes: -0.4 },
      armor: { bandit_power: 0.3 },
      consumable: { bandit_power: 0.05 },
      material: {}, curio: {},
    },
    perDeal: {
      sell: { rel_bandit: 1.5, rel_village: -0.5, rel_kingdom: -0.2 },
      trade: { rel_bandit: 1.5, rel_village: -0.5 },
      buy: { rel_bandit: 1, reputation: -0.3 },
      refuse: { rel_bandit: -2.5 },
    },
    archetypes: [
      {
        id: 'bd_cutthroat', look: 'bandit', job: '두건 쓴 사내', portrait: '🗡️', weight: 3, minDay: 4,
        when: { any: [{ var: 'bandit_power', gte: 11 }, { var: 'trade_routes', lt: 42 }, { var: 'economy', lt: 45 }, { flag: 'village_fell' }] },
        names: ['까마귀', '외팔이', '토끼', '녹슨칼'],
        wants: [
          { item: 'iron_sword', w: 3, qty: [2, 4] }, { item: 'bow', w: 2, qty: [2, 4] },
          { item: 'crossbow', w: 2, qty: [1, 3] }, { item: 'shield', w: 1, qty: [1, 3] },
          { item: 'transform_potion', w: 1, qty: [1, 2] },
        ],
        lines: { sold: ['흐흐, 좋아. 우린 만난 적 없다.'], refused: ['…쳇. 밤길 조심해라.'], partial: '있는 것만 내놔.' },
        greet: ['{item} {qty}개, {offer}G. 팔 거지? 요즘 밤길 험하던데.', '(복면 속 웃음) {item} {qty}개, {offer}G. 가게 오래 가야지.'],
      },
      {
        id: 'bd_loot', look: 'bandit', job: '약탈품 짐꾼', portrait: '🗡️', weight: 2, minDay: 5, kind: 'trade',
        when: { any: [{ var: 'bandit_power', gte: 13 }, { var: 'rel_bandit', gte: 4 }] },
        names: ['자루', '짝귀'],
        trades: [
          { w: 3, give: { item: 'eastern_spice', qty: [3, 6] }, want: { item: 'iron_sword', qty: [2, 3] } },
          { w: 2, give: { item: 'pearl', qty: 1 }, want: { item: 'bow', qty: [3, 4] } },
          { w: 1, give: { item: 'silver_sword', qty: 1 }, want: { item: 'crossbow', qty: [1, 2] } },
        ],
        lines: { traded: ['흐흐, 거래 끝이다.'], refused: ['쳇, 됐다.'] },
        greet: ['"주운" {give} {giveQty}개. 네 {want} {wantQty}개랑 바꾸자.'],
      },
      {
        id: 'sy_buyer', look: 'fence', job: '뒷골목 매입꾼', portrait: '🕶️', weight: 3, minDay: 4,
        when: { any: [{ var: 'blackmarket', gte: 14 }, { flag: 'bribed_inspector' }, { var: 'rel_bandit', gte: 3 }] },
        names: ['쥐', '반장', '미소', '장갑'],
        wants: [
          { item: 'iron_sword', w: 2, qty: [3, 6] }, { item: 'crossbow', w: 2, qty: [1, 3] }, { item: 'potion', w: 1, qty: [4, 8] },
          { item: 'black_powder', w: 3, qty: [2, 4], pay: 1.3 },
          { item: 'cursed_ring', w: 3, qty: [1, 1], when: { has: { item: 'cursed_ring' } }, pay: 1.5 },
          { item: 'dragon_scale', w: 2, qty: [1, 1], when: { has: { item: 'dragon_scale' } } },
          { item: 'bone_dust', w: 1, qty: [4, 8], when: { has: { item: 'bone_dust' } } },
          { item: 'silver_sword', w: 1, qty: [1, 2] },
        ],
        lines: { sold: ['좋아. 뒷일은 묻지 마.'], refused: ['…쳇. 딴 데 가지.'], partial: '있는 것만 내놔.' },
        greet: ['{item} {qty}개, {offer}G. 어디 쓰냐고 묻지 마.', '뭐든 사. {item} {qty}개, {offer}G. 장부엔 안 적어도 돼.'],
      },
      {
        id: 'sy_fence', look: 'fence', job: '장물아비', portrait: '🕶️', weight: 2, minDay: 4, kind: 'sell',
        when: { any: [{ var: 'blackmarket', gte: 16 }, { var: 'rel_bandit', gte: 4 }] },
        names: ['손가락', '먼지', '할멈'],
        offers: [
          { w: 3, item: 'iron_sword', qty: [3, 6], price: 0.45 }, { w: 2, item: 'silver_sword', qty: [1, 2], price: 0.45 },
          { w: 1, item: 'plate_armor', qty: 1, price: 0.45 }, { w: 2, item: 'pearl', qty: [1, 2], price: 0.6 }, // 장물 진주 — 0.6 미만이면 사서 도매상(75%)에 되파는 차익이 난다
          { w: 2, item: 'dwarf_steel_sword', qty: [1, 2], price: 0.5, when: { flag: 'dwarf_steel_unlocked' } },
          { w: 1, item: 'crossbow', qty: [1, 3], price: 0.5, when: { day: { gte: 6 } } },
        ],
        lines: { bought: ['좋아, 거래 끝. 아무도 못 봤어.'], declined: ['쳇. 딴 데 팔지.'] },
        greet: ['쉿. {item} {qty}개, {offer}G. 출처는 묻지 마.', '(보따리를 푼다) {item} {qty}개, {offer}G. 주인은 없어.'],
      },
    ],
  },

  // 잿빛 엄니 전투단 (오크·오우거): 고블린과 다르다 — 유행 따윈 없고, 도끼와 판금을 전부 아니면 안 산다.
  // 강하게 부르면 한 번은 받아 주지만 두 번은 없다(인내심 0). 거절한 상인은 오히려 존중한다.
  orc: {
    name: '전투단', fullName: '잿빛 엄니 오크·오우거 전투단', icon: '🪓', color: '#7a7a4a', race: '오크',
    payMult: 1.25, haggle: { tolerance: 0.4, patience: 0 },
    visit: { base: 0.2, relScale: 0.05, var: 'rel_orc', scaleVars: { warband_power: 0.04 } },
    perUnit: {
      weapon: { warband_power: 0.6, monster_pop: 0.1 },
      armor: { warband_power: 0.4 },
      consumable: { warband_power: 0.05 },
      material: { warband_power: 0.02 },
      curio: {},
    },
    perDeal: {
      sell: { rel_orc: 1.5, rel_goblin: -0.5, rel_village: -0.5 },
      trade: { rel_orc: 1.5, rel_goblin: -0.5 },
      refuse: { rel_orc: -0.3 },
    },
    archetypes: [
      {
        id: 'or_warrior', look: 'orc', job: '전투단 전사', portrait: '🪓', weight: 3, partialOk: false,
        when: { flag: 'warband_sighted' },
        names: ['우르가', '볼록', '크라쉬', '마그'],
        wants: [
          { item: 'war_axe', w: 4, qty: [2, 4] }, { item: 'shield', w: 2, qty: [2, 4] },
          { item: 'plate_armor', w: 1, qty: [1, 2] }, { item: 'iron_sword', w: 1, qty: [3, 5] },
          { item: 'iron_spear', w: 1, qty: [2, 4] }, { item: 'iron_helmet', w: 1, qty: [2, 4] },
        ],
        lines: { sold: ['좋다. 강한 자 편이다.'], refused: ['…약한 가게다. 다른 데 간다.'] },
        greet: ['{item} {qty}개. 전부. 모자라면 안 사. {offer}G.', '{item} {qty}개, {offer}G. 불러 봐. 한 번은 들어 준다.'],
      },
      {
        id: 'or_plunder', look: 'orc', job: '약탈품 운반꾼', portrait: '🪓', weight: 2, kind: 'trade',
        when: { flag: 'warband_sighted' },
        names: ['고르', '닥'],
        trades: [
          { w: 3, give: { item: 'iron_ore', qty: [20, 30] }, want: { item: 'war_axe', qty: [2, 3] } },
          { w: 1, give: { item: 'pearl', qty: [1, 2] }, want: { item: 'plate_armor', qty: 1 } },
        ],
        lines: { traded: ['좋다. 거래 끝.'], refused: ['흥. 다른 놈한테 간다.'] },
        greet: ['광산 털었다. {give} {giveQty}개 줄게. {want} {wantQty}개 내놔.'],
      },
    ],
  },

  // 해적: 금화 대신 진주와 이국의 향신료로 치른다(교환). 화약을 손에 넣으면 항구의 주인이 바뀐다.
  // 여기에 판 물건은 교역로를 끊고, 암시장으로 흘러 들어간다.
  pirate: {
    name: '해적', fullName: '소금까마귀 해적단', icon: '🏴‍☠️', color: '#2a5a7a', race: '인간',
    payMult: 1.2, haggle: { tolerance: 0.3, patience: 2 },
    visit: { base: 0.2, relScale: 0.06, var: 'rel_pirate', scaleVars: { pirate_power: 0.035 },
      bonus: [{ when: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }, { noFlag: 'powder_reported_late' }] }, add: 0.7 }] },
    perUnit: {
      weapon: { pirate_power: 0.5, trade_routes: -0.25 },
      armor: { pirate_power: 0.2 },
      consumable: { pirate_power: 0.05 },
      material: { pirate_power: 0.4 },
      curio: {},
    },
    perDeal: {
      sell: { rel_pirate: 1.5, blackmarket: 0.6 },
      trade: { rel_pirate: 2, blackmarket: 0.8, pirate_power: 0.5 },
      refuse: { rel_pirate: -1 },
    },
    archetypes: [
      {
        id: 'pr_deckhand', look: 'pirate', job: '갑판장', portrait: '🏴‍☠️', weight: 3, kind: 'trade',
        when: { flag: 'port_open' },
        names: ['소금이', '빌지', '안나 보니', '앵무'],
        trades: [
          { w: 3, give: { item: 'pearl', qty: [1, 3] }, want: { item: 'iron_sword', qty: [3, 5] } },
          { w: 2, give: { item: 'eastern_spice', qty: [4, 8] }, want: { item: 'potion', qty: [5, 8] } },
          { w: 2, give: { item: 'pearl', qty: [2, 3] }, want: { item: 'crossbow', qty: [2, 3] } },
          { w: 3, give: { item: 'pearl', qty: [3, 4] }, want: { item: 'black_powder', qty: [2, 4] }, when: { flag: 'powder_invented' } },
        ],
        lines: { traded: ['크하하! 좋은 거래다, 친구!'], refused: ['에이, 육지 놈들은 겁이 많아!'] },
        greet: ['{give} {giveQty}개랑 {want} {wantQty}개 바꾸자, 친구.', '크하하! {give} {giveQty}개 줄게. 네 {want} {wantQty}개랑!'],
      },
      {
        id: 'pr_quartermaster', look: 'pirate', job: '해적 보급관', portrait: '🏴‍☠️', weight: 2,
        when: { flag: 'port_open' },
        names: ['키드', '레드 메리', '갈고리'],
        wants: [
          { item: 'crossbow', w: 3, qty: [2, 3] }, { item: 'iron_sword', w: 2, qty: [3, 5] },
          { item: 'potion', w: 2, qty: [5, 8] }, { item: 'black_powder', w: 6, qty: [2, 4], pay: 1.5, when: { flag: 'powder_invented' } },
          { item: 'eastern_spice', w: 1, qty: [3, 6], pay: 0.9 }, { item: 'pearl', w: 1, qty: [1, 2], pay: 0.85 },
        ],
        lines: { sold: ['크하하! 세관엔 비밀이다!'], refused: ['쳇, 딴 항구에서 구하지.'], partial: '있는 만큼만! 나머진 항해 중에 구하지.' },
        greet: ['{item} {qty}개, 외국 금화로 {offer}G. 녹이면 똑같아.', '크하하, 항해 준비다. {item} {qty}개, {offer}G. 세관엔 비밀.'],
      },
      {
        // 화약 독점 판매상 소문을 듣고 온 포수 — 항구가 열리지 않았어도 뭍으로 올라온다
        id: 'pr_gunner', look: 'pirate', job: '해적선 포수', portrait: '🏴‍☠️', weight: 3,
        when: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }, { noFlag: 'powder_reported_late' }] },
        names: ['귀먹은 잭', '화승', '검은 손'],
        wants: [{ item: 'black_powder', w: 6, qty: [4, 8], pay: 1.45 }],
        lines: { sold: ['크하하! 포문이 노래하겠군!'], refused: ['쳇. 포문이 굶는다.'], partial: '있는 만큼만 실어 간다!' },
        greet: ['포문마다 먹일 거다. {item} {qty}통, {offer}G.', '크하하, 천둥 가게가 여기군! {item} {qty}통, {offer}G.'],
      },
    ],
  },

  // 연금술 학회: 재료(시약·뼛가루·요정 가루)를 사 가고, 만든 물약을 헐값에 되판다.
  // 실험에는 부작용이 따른다 — 폭발, 기적, 걸어 다니는 해골, 그리고 언젠가 "천둥 가루".
  alchemist: {
    name: '연금술 학회', fullName: '녹색 증류탑 연금술 학회', icon: '⚗️', color: '#4ab06a', race: '인간',
    payMult: 1.1, haggle: { tolerance: 0.15, patience: 2 },
    visit: { base: 0.3, relScale: 0.06, var: 'rel_alchemist', scaleVars: { alchemy_progress: 0.02 } },
    perUnit: {
      weapon: {}, armor: {},
      consumable: { alchemy_progress: 0.1 },
      material: { alchemy_progress: 0.45 },
      curio: { alchemy_progress: 0.8 },
    },
    perDeal: { sell: { rel_alchemist: 1.5 }, buy: { rel_alchemist: 0.5 }, refuse: { rel_alchemist: -0.8 } },
    archetypes: [
      {
        id: 'al_researcher', look: 'alchemist', job: '연금술사', portrait: '⚗️', weight: 3, minDay: 4,
        when: { any: [{ var: 'arcane_power', gte: 14 }, { has: { item: 'alchemy_reagent', min: 3 } }, { has: { item: 'bone_dust' } }, { has: { item: 'fairy_dust' } }] },
        names: ['테오프라', '파라셀', '니콜라', '마리아'], // 케셀은 따로 오는 손님 (customers.js alchemist_kessel)
        wants: [
          { item: 'alchemy_reagent', w: 4, qty: [3, 6] }, { item: 'mana_crystal', w: 1, qty: [1, 2] }, { item: 'iron_ore', w: 1, qty: [5, 10] },
          { item: 'bone_dust', w: 3, qty: [4, 8], when: { has: { item: 'bone_dust' } } },
          { item: 'fairy_dust', w: 3, qty: [2, 4], when: { has: { item: 'fairy_dust' } } },
          { item: 'dragon_scale', w: 3, qty: [1, 1], when: { has: { item: 'dragon_scale' } }, pay: 1.2 },
          { item: 'transform_potion', w: 1, qty: [1, 2] },
        ],
        lines: { sold: ['고맙네. 실험이 성공하길 빌어 주게.'], refused: ['흠, 실험이 미뤄지겠군.'], partial: '있는 만큼이라도 가져가겠네.' },
        greet: ['{item} {qty}개! {offer}G! 오늘 실험은 성공할 걸세.', '{item} {qty}개, {offer}G. 뭘 만들지는 나도 모른다네.'],
      },
      {
        id: 'al_peddler', look: 'alchemist', job: '물약 행상', portrait: '⚗️', weight: 2, minDay: 5, kind: 'sell',
        when: { any: [{ var: 'alchemy_progress', gte: 9 }, { var: 'monster_pop', gte: 36 }, { flag: 'war' }] },
        names: ['탈리아', '보리스'],
        offers: [
          { w: 4, item: 'potion', qty: [5, 10], price: 0.55 }, { w: 2, item: 'holy_water', qty: [3, 6], price: 0.6, when: { day: { gte: 5 } } },
          { w: 3, item: 'black_powder', qty: [2, 3], price: 0.7, when: { flag: 'powder_invented' } },
        ],
        lines: { bought: ['좋소. 효과는 보장하오. …아마.'], declined: ['그렇소? 딴 데 팔지.'] },
        greet: ['"부산물"이오. {item} {qty}개, {offer}G. 효과는 같소.', '{item} {qty}개, {offer}G. 라벨 색은 신경 쓰지 마시오.'],
      },
    ],
  },

  // 골렘 공방: 후반 기술. 공방이 세워진 뒤에만 온다. 철광석·마력 결정을 한 번에 대량으로, 전량이 아니면 사지 않는다.
  // 흥정도 없다. 골렘이 늘면 숲이 줄고, 용병은 일자리를 잃는다.
  golem: {
    name: '골렘 공방', fullName: '청동심장 골렘 공방', icon: '🗿', color: '#b08040', race: '인간',
    payMult: 1.05, haggle: { tolerance: 0.02, patience: 0 },
    visit: { base: 0.4, relScale: 0.05, var: 'rel_golem', scaleVars: { golem_tech: 0.05 } },
    perUnit: {
      weapon: {},
      armor: { golem_tech: 0.1 },
      consumable: {},
      material: { golem_tech: 0.12, iron_price: 0.1, fairy_grace: -0.05 },
      curio: { golem_tech: 0.5 },
    },
    perDeal: { sell: { rel_golem: 1.5, economy: 0.4 }, refuse: { rel_golem: -1 } },
    archetypes: [
      {
        id: 'gl_engineer', look: 'golem_smith', job: '골렘 기술자', portrait: '🔧', weight: 3, partialOk: false,
        when: { flag: 'golem_workshop' },
        names: ['코그', '브라스', '헤파', '렌치'],
        wants: [
          { item: 'iron_ore', w: 4, qty: [20, 35] }, { item: 'mana_crystal', w: 3, qty: [3, 6] },
          { item: 'golem_core', w: 1, qty: [1, 2] }, { item: 'dragon_scale', w: 2, qty: [1, 1], when: { has: { item: 'dragon_scale' } } },
        ],
        lines: { sold: ['수령 확인. 오차 없음.'], refused: ['불성립. 다른 공급처를 찾겠소.'] },
        greet: ['{item} 정확히 {qty}개. {offer}G. 모자라면 불성립.', '설계도상 {item} {qty}개. 계산 끝. {offer}G.'],
      },
      {
        id: 'gl_courier', look: 'golem', job: '청동 짐꾼', portrait: '🗿', race: '골렘', weight: 2, partialOk: false,
        when: { all: [{ flag: 'golem_workshop' }, { var: 'golem_tech', gte: 5 }] },
        names: ['C-7', '짐꾼 4호', '톱니'],
        wants: [{ item: 'iron_ore', w: 3, qty: [25, 40] }, { item: 'mana_crystal', w: 2, qty: [4, 6] }],
        lines: { sold: ['(째깍) 수령 완료.'], refused: ['(째깍) 거래 불성립.'] },
        greet: ['(째깍) {item}. 수량 {qty}. 대금 {offer}G. 흥정 없음.', '(째깍) {item} {qty}개. {offer}G. 정확히 셌음.'],
      },
    ],
  },

  // 나그네: 교역로가 안전할 때만 온다. 먼 곳의 물건(향신료·진주, 가끔은 용비늘)을 팔고, 길에서 쓸 것을 산다.
  // 거래할 때마다 먼 땅의 소문을 남긴다 — 다음 날 신문에 실린다 (newsPools.travelerTales)
  traveler: {
    name: '나그네', fullName: '먼 길의 나그네들', icon: '🧳', color: '#c89a4a', race: '인간',
    // 소속을 물으면(왼손 옆 확대경): 댈 소속도, 인장도 없다 (CustomerManager.makeAffil)
    affil: { claim: null, seal: false, lines: ['그냥 떠돌이요. 인장 같은 건 없소.', '길 위의 사람이오. 소속이랄 게 없지.', '소속? 낙타 등이 내 소속이오.'] },
    payMult: 1.05, haggle: { tolerance: 0.2, patience: 2 },
    visit: { base: 0.05, relScale: 0.05, var: 'rel_traveler', scaleVars: { trade_routes: 0.005 }, min: 0.05 },
    perUnit: { weapon: {}, armor: {}, consumable: { trade_routes: 0.05 }, material: {}, curio: {} },
    perDeal: { sell: { rel_traveler: 1.5, trade_routes: 0.3 }, buy: { rel_traveler: 1, economy: 0.2 }, refuse: { rel_traveler: -0.5 } },
    archetypes: [
      {
        id: 'tv_pilgrim', look: 'traveler', job: '순례자', portrait: '🧳', weight: 3, minDay: 4,
        when: { var: 'trade_routes', gte: 45 },
        names: ['사이다', '하산', '마르코', '이븐'],
        wants: [{ item: 'potion', w: 3, qty: [2, 4] }, { item: 'bow', w: 1, qty: [1, 1] }, { item: 'iron_sword', w: 1, qty: [1, 1] }, { item: 'holy_water', w: 1, qty: [1, 3] },
          { item: 'eastern_spice', w: 1, qty: [2, 4] }, { item: 'transform_potion', w: 1, qty: [1, 1] }],
        onSell: { newsFrom: 'travelerTales' },
        lines: { sold: ['고맙소. 길이 한결 가벼워지겠소.'], refused: ['괜찮소. 길은 길고, 가게는 많으니.'], partial: '있는 만큼만 가져가겠소.' },
        greet: ['사막을 건너왔소. {item} {qty}개, {offer}G. 이야기는 덤이오.', '{item} {qty}개, {offer}G. 길에서 들은 얘기, 들어 보겠소?'],
      },
      {
        id: 'tv_peddler', look: 'traveler', job: '이국 행상', portrait: '🧳', weight: 2, minDay: 4, kind: 'sell',
        when: { var: 'trade_routes', gte: 45 },
        names: ['자파르', '린', '오마르'],
        offers: [
          { w: 4, item: 'eastern_spice', qty: [4, 8], price: 0.7 }, { w: 2, item: 'pearl', qty: [1, 2], price: 0.8 },
          { w: 1, item: 'mana_crystal', qty: [2, 3], price: 0.8 },
          { w: 2, item: 'dragon_scale', qty: 1, price: 0.75, when: { any: [{ flag: 'dragon_slain' }, { var: 'dragon_stir', gte: 8 }] } },
        ],
        onBuy: { newsFrom: 'travelerTales' },
        lines: { bought: ['좋은 거래였소. 먼 길 온 보람이 있구려.'], declined: ['그렇소? 다음 마을에서 팔겠소.'] },
        greet: ['먼 곳의 {item} {qty}개, {offer}G. 여기선 못 구하오.', '낙타 값이 들었지만, {item} {qty}개를 {offer}G에 드리리다.'],
      },
    ],
  },

  // 미지의 종족: 아주 드물게, 밤하늘의 신호가 커졌을 때만. 무엇을 원하는지 알 수 없다 — 쇠 한 조각, 물약 한 병.
  // 값으로 별조각을 두고 간다. 결과는 아주 늦게, 신문 한구석에 온다.
  unknown: {
    name: '???', fullName: '별 아래에서 온 자들', icon: '✴️', color: '#8aa0e0', race: '???',
    affil: { claim: null, seal: false, lines: ['…소속. 별. 아래.', '(고개를 갸웃한다. 인장이라는 말을 모르는 듯하다)'] },
    payMult: 1, haggle: { tolerance: 0, patience: 0 },
    visit: { base: 0.01, relScale: 0.01, var: 'rel_unknown', scaleVars: { star_signal: 0.008 }, min: 0.02 },
    perUnit: { weapon: { star_signal: 0.5 }, armor: {}, consumable: { star_signal: 0.3 }, material: { star_signal: 0.3 }, curio: {} },
    perDeal: { sell: { rel_unknown: 2, star_signal: 1 }, trade: { rel_unknown: 3, star_signal: 1.5 }, refuse: { rel_unknown: -1 } },
    archetypes: [
      {
        id: 'uk_visitor', look: 'stranger', job: '???', portrait: '✴️', weight: 1, minDay: 8, kind: 'trade', late: true,
        when: { var: 'star_signal', gte: 3.5 },
        names: ['???', '(발음할 수 없는 이름)'],
        trades: [
          { w: 2, give: { item: 'star_shard', qty: 1 }, want: { item: 'iron_ore', qty: 1 } },
          { w: 2, give: { item: 'star_shard', qty: 1 }, want: { item: 'potion', qty: 1 } },
          { w: 1, give: { item: 'star_shard', qty: 1 }, want: { item: 'bow', qty: 1 } },
          { w: 1, give: { item: 'star_shard', qty: 1 }, want: { item: 'shield', qty: 1 } },
        ],
        onTrade: { schedule: [{ event: 'star_echo', inDays: [3, 5] }] },
        lines: { traded: ['(빛이 일렁인다) …좋다.'], refused: ['(빛이 잦아든다) …'] },
        greet: ['(목소리만 들린다) …{want} {wantQty}. 대신 {give} {giveQty}.', '(촛불이 기운다) {want} {wantQty}. 대신 {give} {giveQty}.'],
      },
    ],
  },
};

// 세력이 아닌 인장 — 관계·방문·거래 효과 없이 "인장"으로만 쓴다 (소속 묻기의 규정집 목록·affil.claim/sealOf 에 쓸 수 있다)
// 그림은 DocCheck.SPECS[id], 밀랍 색은 color, 문장 색은 sealColor, gilt: 금 고리. after: 규정집 목록에서 이 세력 바로 뒤에
WS.data.extraSeals = {
  // 국왕 직속: 왕실 조달·전령, 그리고 왕자·공주 본인. 왕국(왕관) 인장과 닮았지만 왕관 아래 엇갈린 홀, 진주 테두리, 보랏빛 밀랍에 금빛
  royal: { name: '국왕 직속', fullName: '국왕 직속 — 왕실 인장 (조달청·전령·왕가)', icon: '⚜️', color: '#5a2a78', sealColor: '#f0cf6a', gilt: true, after: 'kingdom' },
};

// 세력 표식 — 이름 옆에 붙는 색 + 12×12 픽셀 문양 (그리기: js/ui/Emblem.js). 색은 어두운 칩 위에서 4.5:1 이상
Object.entries({
  kingdom:   { color: '#6a9cf5', icon: 'crest' },   // 왕국: 파랑 + 방패
  goblin:    { color: '#7ccc4a', icon: 'tooth' },   // 고블린: 초록 + 이빨
  dwarf:     { color: '#c98a4a', icon: 'hammer' },  // 드워프: 갈색 + 망치
  village:   { color: '#b4b4a8', icon: 'wheat' },   // 마을: 회색 + 밀 이삭
  demon:     { color: '#9db0c8', icon: 'mist' },    // 안개 상단: 안개빛 + 안개
  demonlord: { color: '#a97bff', icon: 'horn' },    // 마왕군: 보라 + 뿔
  fairy:     { color: '#8ad0a0', icon: 'leaf' },    // 요정: 연두 + 잎
  mage:      { color: '#8f8cff', icon: 'star' },    // 마법사 길드: 청자색 + 별
  merc:      { color: '#ff5a6a', icon: 'wolf' },    // 용병: 진홍 + 늑대
  hunter:    { color: '#4fb26e', icon: 'arrow' },   // 사냥꾼 조합: 진녹 + 화살
  vampire:   { color: '#e2447f', icon: 'bat' },     // 흡혈귀: 자주 + 박쥐
  undead:    { color: '#90c4a0', icon: 'skull' },   // 사령술 교단: 회록 + 해골
  dragon:    { color: '#ff6a3a', icon: 'eye' },     // 용: 붉은색 + 용의 눈
  guild:     { color: '#d8ae48', icon: 'scale' },   // 상인 길드: 황동 + 저울
  church:    { color: '#f5ecc8', icon: 'cross' },   // 대성당: 흰금 + 십자
  noble:     { color: '#d68ad8', icon: 'crown' },   // 궁정 귀족: 자주금 + 왕관
  bandit:    { color: '#d8704e', icon: 'dagger' },  // 도적단: 적갈색 + 단검
  orc:       { color: '#b4b44e', icon: 'axe' },     // 전투단: 황록 + 도끼
  pirate:    { color: '#5aaad0', icon: 'anchor' },  // 해적: 남색 + 닻
  alchemist: { color: '#4ad08a', icon: 'flask' },   // 연금술 학회: 청록 + 플라스크
  golem:     { color: '#cc9c5c', icon: 'golem' },   // 골렘 공방: 청동 + 골렘 얼굴
  traveler:  { color: '#dcc494', icon: 'staff' },   // 나그네: 모래색 + 지팡이
  unknown:   { color: '#9aa4d8', icon: 'quest' },   // ???: 별빛 + 물음표
  liga:      { color: '#c9964a', icon: 'conch' },   // (천칭단이 생기면) 청동 + 소라
}).forEach(([id, e]) => { const f = WS.data.factions[id]; if (f) f.emblem = e; });
if (WS.data.extraSeals.royal) WS.data.extraSeals.royal.emblem = { color: '#f0cf6a', icon: 'fleur' }; // 국왕 직속: 금 + 백합 문장

// 주간 고블린 유행 후보
WS.data.goblinTrends = [
  { item: 'red_blade', text: '이번 주 고블린들 사이 유행: "붉은 칼날". 붉게 칠한 칼을 차지 않으면 촌스럽다는 분위기.' },
  { item: 'bow', text: '고블린 청년들 사이에서 활쏘기 내기가 대유행. 활 수요가 늘 것으로 보인다.' },
  { item: 'shield', text: '"방패 두드리기 춤"이 서부 숲을 휩쓸다. 고블린들이 방패를 사 모으는 중.' },
  { item: 'potion', text: '고블린 부족 축제 시즌. 물약을 "취하는 음료"로 오해한 고블린들이 물약을 찾는다.' },
];

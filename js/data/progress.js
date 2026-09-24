// 해금표 · 튜토리얼 손님 · 초반 장사 규칙 (데이터). 엔진은 js/systems/Progress.js.
//
// 창고 자리(place): weapon 무기 거치대 / defense 갑옷걸이 / ore 광석 궤짝(광석·금속·결정) /
//   goods 재료 자루(가죽·약재·가루·향신료) / potion 물약 선반 / gem 보석함 / special 잠긴 궤짝 /
//   docs 서류함(인상서·규정집) / crow 창가의 까마귀(편지)
// 아이템이 어느 자리에 놓이는지는 items.js 의 shelf 필드.
//
// 해금 순서: 1 무기 · 3 방어구 · 5 재료(광석+재료 자루) · 6 까마귀 · 7 물약 · 9 보석 · 11 서류함.
//   special 은 날짜가 아니라 잠긴 궤짝 물건(shelf: 'special')을 처음 손에 넣는 순간 열린다.
//
// tutorialCustomers: 자리는 새벽에 저절로 열리지 않는다. 그날 대기열 맨 앞에 "튜토리얼 손님"이 서고,
//   그 손님이 카운터 앞에 서는 순간(Day.nextCustomer → Progress.arrive) places 가 열린다.
//   customer 는 customers.js 의 틀 id (spawn: { queuedOnly: true }). 물건을 사는 손님이면 틀의 request.item 을
//   딱 1개, 시세 그대로 산다 (흥정·추가 선택지·위장 없음). 놓친 튜토리얼 손님은 다음 날 다시 맨 앞에 온다.
//   stock: 자리가 열리는 순간 뒷문에 들어오는 첫 물건 (공짜 · 칸 제한 무시). 튜토리얼 손님이 살 물건 1개는
//     이와 따로 하나 더 들어온다 — 튜토리얼 판매가 첫 물건을 깎아 먹지 않게.
//   posters: 이 손님이 손으로 건네는 인상서 (letters.js wanted 의 id) — 까마귀 없이 서류함에 바로 꽂힌다.
//   hint: UI 가 보여 줄 한 줄 안내 (30자 이내).
// startPlaces: 첫날 아침부터 물건을 들일 수 있는 자리 (시작 재고 · 1일째 도매상). 문은 레온이 오면 열린다.
// schedule: 새벽(DayManager.startDay)에 한 번만 일어나는 일. day 가 되었고 when(조건)이 맞는 첫 새벽에 일어난다.
//   places 는 튜토리얼 손님을 끝내 못 만났을 때를 위한 안전장치뿐이다.
// early: 초반 장사를 Papers, Please 첫 며칠처럼 단순하게 — CustomerManager 가 쓴다.
WS.data.progress = {
  places: ['weapon', 'defense', 'ore', 'goods', 'potion', 'gem', 'docs', 'crow', 'special'],
  startPlaces: ['weapon'],

  tutorialCustomers: [
    { id: 'tut_weapon', day: 1, customer: 'd1_knight', places: ['weapon'], hint: '무기 거치대에서 칼을 꺼내 테이블에 올린다' },
    {
      id: 'tut_defense', day: 3, customer: 'tut_shield', places: ['defense'], hint: '갑옷걸이에서 방패를 꺼내 테이블에 올린다',
      stock: { shield: 4, iron_helmet: 2, plate_armor: 1 },
    },
    // 5일째 "재료": 광석 궤짝과 재료 자루가 함께 열린다 (튜토리얼 손님 둘)
    {
      id: 'tut_ore', day: 5, customer: 'tut_ore', places: ['ore'], hint: '광석 궤짝에서 철광석을 꺼내 올린다',
      stock: { iron_ore: 30 },
    },
    {
      id: 'tut_goods', day: 5, customer: 'tut_goods', places: ['goods'], hint: '재료 자루에서 뼛가루를 꺼내 올린다',
      stock: { bone_dust: 5, alchemy_reagent: 4 },
    },
    {
      id: 'tut_potion', day: 7, customer: 'tut_potion', places: ['potion'], hint: '물약 선반에서 회복 물약을 꺼내 올린다',
      stock: { potion: 10, mana_potion: 3, poison_vial: 2 },
    },
    // 보석상 오벨이 보석을 맡기러 온다 (맡든 거절하든 보석함은 열린다 — customers.js obel_deposit)
    { id: 'tut_gem', day: 9, customer: 'obel_deposit', places: ['gem'], hint: '맡은 보석은 보석함에 들어간다' },
    // 경비대 전령이 인상서를 손으로 건넨다 → 서류함이 열리고 인상서가 서류함에 꽂힌다 (까마귀는 아직 없다)
    { id: 'tut_docs', day: 11, customer: 'guard_courier', places: ['docs'], posters: ['ratwhisker'], hint: '인상서를 받으면 서류함에 꽂힌다' },
    // 6일째 둥지지기가 까마귀를 들여 준다 → 창가의 까마귀가 열리고 둥지지기의 안내장이 편지함에 꽂힌다 (인상서는 11일째 서류함이 열린 뒤에)
    { id: 'tut_crow', day: 6, customer: 'crow_keeper', places: ['crow'], hint: '창가의 까마귀를 눌러 편지를 써 본다' },
  ],

  schedule: [
    { id: 'gem_fallback', day: 12, places: ['gem'] },
    // 인상서가 도는 아침 — 신문에 실리고, 그날 경비대 전령이 가게에도 들른다 (tut_docs)
    {
      id: 'wanted_poster', day: 11,
      effects: {
        flags: ['wanted_ratwhisker_posted'],
        news: [{ cat: '왕국', text: '경비대, 보석방 금고털이 "쥐수염" 수배… 가게마다 인상서', big: true }],
      },
    },
    // 서류함이 열린 다음 날(이후) 아침, 오벨의 보석이 아직 창고에 있으면 쥐수염이 심부름꾼 행세를 하며 온다.
    // 오벨은 쥐수염이 다녀간 뒤에 찾으러 온다 (deposit 의 after — Progress.dawn)
    {
      id: 'gem_thief_visit', day: 12,
      when: { all: [{ unlocked: 'docs' }, { deposit: { owner: 'obel' } }, { not: { customerSeen: 'gem_thief' } }] },
      effects: { spawn: [{ customer: 'gem_thief', inDays: 0 }] },
    },
  ],

  // 예전 팝업 튜토리얼 id — 예전 저장본은 모두 본 것으로 친다 (팝업은 더 이상 없다)
  oldTutorialIds: ['first_day', 'backroom', 'potions', 'gem_box', 'crow_letters', 'doc_drawer', 'locked_chest'],

  early: {
    plainUntilDay: 2,    // 이날까지는 모든 손님이 "구체적인 물건을 사러 온" 평범한 손님
    plainQty: [1, 3],    // 평범한 손님의 수량
    plainOffer: [0.95, 1.1], // 시세 대비 제시가 (공정한 값)
    tradeFromDay: 4,     // 교환 손님 · 물건을 팔러 온 손님
    categoryFromDay: 6,  // "무기가 필요하오, 화살이 특히…" 같은 분류형 요청
    // 교환 손님이 가져갈 물건: 그 자리가 어제 이전에 열렸어야 한다 (연 날엔 도매상에서 채울 틈이 없다).
    // 자리가 열린 뒤 days 일 동안은 한 가지 물건을 max 개까지만 달라고 한다 (첫 물건으로 채울 수 있게)
    tradeCap: { days: 3, max: 5 },
    // 하루 손님 수 (튜토리얼 손님은 따로 — 이 수에 더해진다).
    // 날짜에 없으면: 튜토리얼 손님이 오는 날은 tutorialDay, 아니면 config.customersPerDay
    customersPerDay: { 1: [3, 4], 2: [3, 4] },
    tutorialDay: [3, 4],
    // 자리가 열리길 기다리며 밀린 스토리 손님이 한꺼번에 몰리지 않게 (CustomerManager.buildQueue):
    // 튜토리얼 손님이 오는 날은 스토리 손님을 이만큼만, 다른 날은 밀린 손님을 하루 이만큼만 들인다
    tutorialDayStory: 2,
    backlogPerDay: 2,
  },
};

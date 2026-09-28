// ═══════════ 30일 캠페인의 날짜 (v0.9.3) — 다른 데이터 파일을 쓸 때 먼저 읽을 것 ═══════════
// 게임은 실제 30일. 30일째 밤이 지나면(= "31일째") 결말을 판정한다 (config.campaignDays — 중립 결말 neutral 도 이때).
// 이야기 날짜(옛 40일 눈금)는 config.dayWarp = [[4,4],[9,12],[18,24],[27,36],[30,40]] 로 실제 날짜에 겹쳐진다.
//
//   실제일   1  2  3  4 |  5  6  7  8  9 | 10 11 12 13 14 15 16 17 18 | 19 20 21 22 23 24 25 26 27 | 28 29 30
//   이야기일 1  2  3  4 |  6  7  9 10 12 | 13 15 16 17 19 20 21 23 24 | 25 27 28 29 31 32 33 35 36 | 37 39 40
//   (1~4 튜토리얼 · 5~9 첫 이야기들 · 10~18 옛 13~24일 · 19~27 옛 25~36일 · 28~30 옛 37~40일)
//
// 무엇이 어느 날짜인가
//   이야기일 — 조건 DSL 의 { day: … } (events · customers spawn.when · news · letters · endings …), 세계 변수의 밤 변화(하룻밤에 이야기일 수만큼).
//     { day: N } 은 "오늘이 덮는 이야기일 (어제의 이야기일, 오늘의 이야기일] 에 N 이 있는가" 라서 이야기일이 건너뛰어져도 놓치지 않는다
//     (예: 실제 23일은 이야기 30·31일을 덮는다). { gte / lte } 구간도 같은 방식 (Conditions.dayMatch).
//   실제일 — spawn.day · spawn.minDay · 랜덤 손님 archetype minDay · 이 파일의 tutorialCustomers/schedule/early · config.rentSchedule ·
//     shop.js 달력(장날 등) · 효과의 inDays · 조건 since/withinDays/fromDay · 조건 { realDay: … }.
//   새 이야기 손님은 flags/vars/eventFired 와 상대 inDays 로 잇는 것이 가장 안전하다. 날짜로 걸 때는 이야기일 { day: { gte: N } } 로.
//   글에 날짜를 적어야 하면 WS.data.realDay(이야기일) / WS.data.storyDay(실제일) (config.js 맨 끝).
//
// 튜토리얼 (1~4일, 평범한 손님만 — early.plainUntilDay)
//   1일 레온(무기) + 즈긱 · 한스 · 벨 → 영업 끝나면 까마귀 · 신문 구독 안내
//   2일 오스릭(갑옷걸이) · 고트(광석 궤짝) · 마사(재료 자루) + 레온 · 즈긱 친구들(1일의 뒷이야기)
//   3일 세실(물약 선반) · 오벨(보석함 — 보석을 맡긴다)
//   4일 경비대 전령(서류함 — 인상서 "쥐수염") + 브론(철광석 20)
//   5일부터 이야기 손님이 하루 두셋씩 (early.storyFromDay · backlogPerDay) · 6일 쥐수염 · 7일 오벨이 보석을 찾으러 온다
//
// 해금표 · 튜토리얼 손님 · 초반 장사 규칙 (데이터). 엔진은 js/systems/Progress.js.
//
// 창고 자리(place): weapon 무기 거치대 / defense 갑옷걸이 / ore 광석 궤짝(광석·금속·결정) /
//   goods 재료 자루(가죽·약재·가루·향신료) / potion 물약 선반 / gem 보석함 / special 잠긴 궤짝 /
//   docs 서류함(인상서·규정집) / crow 창가의 까마귀(편지)
// 아이템이 어느 자리에 놓이는지는 items.js 의 shelf 필드.
//
// 해금 순서: 1 무기(첫날 밤 까마귀) · 2 방어구 · 광석 · 재료 자루 · 3 물약 · 보석 · 4 서류함.
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
    // 2일째: 갑옷걸이 · 광석 궤짝 · 재료 자루 (튜토리얼 손님 셋 — 그날 평범한 손님은 early.customersPerDay[2])
    {
      id: 'tut_defense', day: 2, customer: 'tut_shield', places: ['defense'], hint: '갑옷걸이에서 방패를 꺼내 테이블에 올린다',
      stock: { shield: 4, iron_helmet: 2, plate_armor: 1 },
    },
    {
      id: 'tut_ore', day: 2, customer: 'tut_ore', places: ['ore'], hint: '광석 궤짝에서 철광석을 꺼내 올린다',
      stock: { iron_ore: 30 },
    },
    {
      id: 'tut_goods', day: 2, customer: 'tut_goods', places: ['goods'], hint: '재료 자루에서 뼛가루를 꺼내 올린다',
      stock: { bone_dust: 5, alchemy_reagent: 4 },
    },
    // 3일째: 물약 선반 · 보석함
    {
      id: 'tut_potion', day: 3, customer: 'tut_potion', places: ['potion'], hint: '물약 선반에서 회복 물약을 꺼내 올린다',
      stock: { potion: 10, mana_potion: 3, poison_vial: 2 },
    },
    // 보석상 오벨이 보석을 맡기러 온다 (맡든 거절하든 보석함은 열린다 — customers.js obel_deposit). 7일째 찾으러 온다
    { id: 'tut_gem', day: 3, customer: 'obel_deposit', places: ['gem'], hint: '맡은 보석은 보석함에 들어간다' },
    // 4일째: 경비대 전령이 인상서를 손으로 건넨다 → 서류함이 열리고 인상서가 서류함에 꽂힌다
    { id: 'tut_docs', day: 4, customer: 'guard_courier', places: ['docs'], posters: ['ratwhisker'], hint: '인상서를 받으면 서류함에 꽂힌다 — 얼굴을 기억해 두자' },
    // (까마귀는 첫날 영업 종료 뒤 튜토리얼에서 들어온다 — DayManager.closeShop 이 'crow' 를 열고 둥지지기의 안내장을 꽂는다)
  ],

  schedule: [
    // 오벨을 끝내 못 만났을 때 (튜토리얼 손님은 놓치면 다음 날 다시 맨 앞에 오므로 거의 쓰이지 않는다)
    { id: 'gem_fallback', day: 5, places: ['gem'] },
    // 인상서가 도는 아침 — 신문에 실리고(이튿날 신문), 그날 경비대 전령이 가게에도 들른다 (tut_docs)
    {
      id: 'wanted_poster', day: 4,
      effects: {
        flags: ['wanted_ratwhisker_posted'],
        news: [{ cat: '왕국', text: '경비대, 보석방 금고털이 "쥐수염" 수배… 가게마다 인상서', big: true }],
      },
    },
    // 6일째(이후) 아침, 오벨의 보석이 아직 창고에 있고 서류함이 열렸으면 쥐수염이 심부름꾼 행세를 하며 온다.
    // 오벨은 쥐수염이 다녀간 뒤에 찾으러 온다 (deposit 의 after — Progress.dawn) — 보통 7일째
    {
      id: 'gem_thief_visit', day: 6,
      when: { all: [{ unlocked: 'docs' }, { deposit: { owner: 'obel' } }, { not: { customerSeen: 'gem_thief' } }] },
      effects: { spawn: [{ customer: 'gem_thief', inDays: 0 }] },
    },
  ],

  // 예전 팝업 튜토리얼 id — 예전 저장본은 모두 본 것으로 친다 (팝업은 더 이상 없다)
  oldTutorialIds: ['first_day', 'backroom', 'potions', 'gem_box', 'crow_letters', 'doc_drawer', 'locked_chest'],

  early: {
    plainUntilDay: 4,    // 이날까지는 모든 손님이 "구체적인 물건을 사러 온" 평범한 손님 (튜토리얼 1~4일)
    plainQty: [1, 3],    // 평범한 손님의 수량
    plainOffer: [0.95, 1.1], // 시세 대비 제시가 (공정한 값)
    storyFromDay: 5,     // 이야기 손님(대본 손님)은 이날부터 — 그 전에 조건이 맞은 손님은 하루씩 미뤄 5일째부터 backlogPerDay 명씩 온다.
                         //   예외: 그날로 정해 둔 고정 손님(spawn.day) · spawn.early (2일째 레온 · 즈긱 친구들) · 튜토리얼 손님
    tradeFromDay: 6,     // 교환 손님 · 물건을 팔러 온 손님
    categoryFromDay: 7,  // "무기가 필요하오, 화살이 특히…" 같은 분류형 요청
    // 교환 손님이 가져갈 물건: 그 자리가 어제 이전에 열렸어야 한다 (연 날엔 도매상에서 채울 틈이 없다).
    // 자리가 열린 뒤 days 일 동안은 한 가지 물건을 max 개까지만 달라고 한다 (첫 물건으로 채울 수 있게)
    tradeCap: { days: 3, max: 5 },
    // 하루 손님 수 (튜토리얼 손님은 따로 — 이 수에 더해진다).
    // 날짜에 없으면: 튜토리얼 손님이 오는 날은 tutorialDay, 아니면 config.customersPerDay (9일째부터 [5, 7])
    customersPerDay: { 1: [3, 4], 2: [3, 4], 3: [3, 4], 4: [3, 4], 5: [4, 6], 6: [4, 6], 7: [4, 6], 8: [4, 6] },
    tutorialDay: [3, 4],
    // 자리가 열리길 기다리며 밀린 스토리 손님이 한꺼번에 몰리지 않게 (CustomerManager.buildQueue):
    // 튜토리얼 손님이 오는 날은 스토리 손님을 이만큼만, 다른 날은 밀린 손님을 하루 이만큼만 들인다
    tutorialDayStory: 2,
    backlogPerDay: 2,
    // 튜토리얼 직후 며칠의 이야기 손님 상한 (그날 새로 온 손님 + 밀린 손님 합). 넘치면 하루씩 미룬다 — spawn.pinned 손님은 예외
    storyPerDay: { 5: 2, 6: 2, 7: 2, 8: 2 },
    // 이 며칠은 이야기 손님이 하루 손님 수(customersPerDay)에 들지 않고 그 위에 온다 — 물건을 사는 손님이 이야기 손님에게 밀려나지 않게
    storyOnTop: [5, 8],
  },
};

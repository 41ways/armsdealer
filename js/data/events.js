// 세계 이벤트. 매일 새벽(뉴스 직전)에 평가된다.
//
// when      : 조건 DSL (ConditionEvaluator 참고)
// trigger   : 'scheduled' 이면 schedule 효과로 예약됐을 때만 발생
// once      : 한 번만 / cooldown: 재발생까지 최소 일수 / chance: 확률
// priority  : 높을수록 먼저 평가 (같은 밤 다른 이벤트의 조건에 영향)
// effects   : 효과 DSL / news: 다음 날 아침 신문 기사
// outcomes  : [{ when, effects, news }] 중 처음 맞는 것 하나가 추가 적용 (else = when 생략)
//
// 조건 예시
//   { var: 'goblin_power', gte: 30 }                    세계 변수
//   { flag: 'x' } / { noFlag: 'x' }                     플래그
//   { day: 3 } / { day: { gte: 4 } } / { dayMod: [7, 2] }  날짜
//   { sold: { faction, item|tag, min, withinDays } }    판매 기록 (실제 소속 기준, trades: true 면 교환으로 넘긴 물건 포함)
//   { traded: { faction, gave, got, min, withinDays } } 교환 기록 (gave/got 지정 시 해당 물건 수량, 아니면 교환 건수)
//   { bought: { faction, item|tag, min, withinDays } }  손님에게서 사들인 기록 (장물 등)
//   { has: { item, min } }                              재고 보유
//   { cmp: ['goblin_power', '>', 'kingdom_power'] }     변수끼리 비교
//   { choice: ['inspector', 'lie'] }                    과거 선택
//   { eventFired: 'id' } / { customerSeen: 'id' }       기록
//   { all: [...] } / { any: [...] } / { not: {...} } / { chance: 0.5 }
WS.data.events = [
  // ───────── 고정 ─────────
  {
    id: 'day1_intro', when: { day: 1 }, once: true, priority: 100,
    news: [
      { cat: '사건', text: '서부 숲에서 고블린 활동 증가', big: true },
      { cat: '왕국', text: '제7기사단, 서부 숲 순찰 인원 보강 검토' },
    ],
  },
  {
    id: 'goblin_trend', when: { any: [{ day: 2 }, { dayMod: [7, 2] }] }, priority: 90,
    effects: { trend: 'random' },
  },

  // ───────── 판매 → 즉각적 반응 (다음 날) ─────────
  {
    id: 'goblin_arming', cooldown: 1, priority: 50,
    when: { sold: { faction: 'goblin', tag: 'weapon', min: 3, withinDays: 1 } },
    effects: { vars: { border_tension: 2 } },
    news: { cat: '보고', text: ['서부 숲 고블린들, 새 {item|을} 들고 다닌다는 목격담', '고블린 무리, 새 {item|을} 휘두르며 숲을 누빈다'], about: { faction: 'goblin', tag: 'weapon' }, alt: [{ buyer: ['d1_goblin', 'd2_zgik_friends'], text: '고블린 즈긱 패거리, 새 {item|을} 차고 숲을 활보' }] },
  },
  {
    id: 'knights_patrol', cooldown: 1, priority: 50,
    when: { sold: { faction: 'kingdom', tag: 'weapon', min: 2, withinDays: 1 } },
    effects: { vars: { monster_pop: -1 } },
    news: { cat: '왕국', text: ['기사단 순찰대, 새로 산 {item|을} 들고 서부 숲으로', '왕국 순찰대, 새 {item|으로} 무장하고 숲길 정찰'], about: { faction: 'kingdom', tag: 'weapon' }, alt: [{ buyer: 'd1_knight', text: '제7기사단 레온 경, 서부 숲 순찰 출발… 새 {item|이} 번쩍' }] },
  },
  {
    id: 'dwarf_forge_hot', cooldown: 1, priority: 50,
    when: { sold: { faction: 'dwarf', tag: 'material', min: 15, withinDays: 1 } },
    news: { cat: '드워프', text: '드워프 공방, 사 간 {item|으로} 밤새 망치질… "새 합금 실험"', about: { faction: 'dwarf', tag: 'material', name: '광석' }, alt: [{ buyer: ['d1_dwarf', 'dwarf_supplier'], text: '브론의 대장간, 사 간 {item|으로} 밤새 새 합금 시험' }] },
  },
  {
    id: 'village_arming', cooldown: 2, priority: 50,
    when: { sold: { faction: 'village', min: 1, withinDays: 1 } },
    news: { cat: '마을', text: '동쪽 마을 주민들, {item|을} 사 들고 자경단 결성', about: { faction: 'village', tags: ['weapon', 'armor', 'consumable'], name: '무기' } },
  },

  // ───────── 드워프 기술 ─────────
  {
    id: 'dwarf_steel_unlock', once: true, priority: 60,
    when: { all: [{ var: 'dwarf_tech', gte: 16 }, { noFlag: 'dwarf_fallen' }] },
    effects: { flags: ['dwarf_steel_unlocked'], spawn: [{ customer: 'dwarf_supplier', inDays: 0 }] },
    news: { cat: '드워프', text: '철광석 사 간 드워프들, 새 강철 개발 성공!', big: true },
  },
  // 강철수염 전령의 부탁 (customers.js dwarf_herald — config.fairyDwarf.pleaDay) — 철광석을 팔았나, 못 팔았나
  {
    // 팔았다 → 이튿날 장로가 납품 계약을 청하러 온다 (전령의 선택지가 부른다)
    id: 'dwarf_kingdom_saved', once: true, priority: 62,
    when: { flag: 'dwarf_saved' },
    effects: { vars: { dwarf_tech: 3, rel_dwarf: 2, warband_power: -2 } },
    news: { cat: '드워프', text: '강철수염 산채, 마지막 광석으로 성문 다시 벼려… 잿빛 엄니 물러가', big: true },
  },
  {
    // 거절했거나 이튿날에도 못 줬다 → 무기 도매가 폭등 (config.fairyDwarf.fallSpike — 사흘 동안 ×2) · 드워프 발길이 끊긴다 (factions.js)
    id: 'dwarf_kingdom_falls', once: true, priority: 62,
    when: { flag: 'dwarf_fallen' },
    effects: { vars: { dwarf_tech: -8, rel_dwarf: -3, economy: -3, warband_power: 4 } },
    news: [
      { cat: '속보', text: '강철수염 산채 함락… 드워프 왕국 용광로가 식었다', big: true },
      { cat: '경제', text: '무기 가격 폭등! 드워프 칼·도끼 끊겨 도매가 두 배', big: true },
    ],
  },
  {
    // 폭등이 끝난 아침. 두 번째 약속을 지켰으면 이날(fairyDwarf.finalAfter) 티타니엘의 마지막 부탁 (customers.js fairy_envoy_final)
    id: 'dwarf_prices_settle', once: true, priority: 62,
    when: { all: [{ flag: 'dwarf_fallen' }, { since: { flag: 'dwarf_fallen', days: WS.data.config.fairyDwarf.fallSpike.days + 1 } }] },
    news: { cat: '경제', text: '무기 가격 안정화! 인간 대장간들 밤낮으로 쇠 두드려', big: true },
  },
  // 드워프 납품 계약 (customers.js dwarf_elder_offer · dwarf_porter) — 네 번 납품하면 황금기 → 엔딩 steel_age
  {
    id: 'dwarf_golden_age', once: true, priority: 60,
    when: { flag: 'dwarf_golden_age' },
    effects: { vars: { economy: 5, kingdom_power: 2, goblin_power: 2, dwarf_tech: 5, rel_dwarf: 4 }, spawn: [{ customer: 'dwarf_elder_thanks', inDays: 0 }] },
    news: { cat: '드워프', text: '드워프 강철 황금기… 대륙 곳곳 군대에 강철수염 칼', big: true },
  },
  {
    // 짐꾼에게 "납품 못 하겠소", 또는 "내일 다시 오시오"를 두 번 — 이튿날 신문과 장로의 한마디
    id: 'dwarf_contract_broken_ev', once: true, priority: 60,
    when: { flag: 'dwarf_contract_broken' },
    effects: { vars: { rel_dwarf: -4, dwarf_tech: -2 }, spawn: [{ customer: 'dwarf_elder_broken', inDays: 0 }] },
    news: { cat: '드워프', text: '강철수염 씨족, 무기점과 광석 계약 파기… "약속은 쇠보다 무겁다"' },
  },
  {
    // 강철수염 산채가 성문을 고치느라 도매상 철광석을 쓸어 간다 — 이튿날 전령(16일)이 광석 20개를 청하러 오니, 그날 도매상에서 사려는 사람은 늦다.
    // 미리 쟁여 둔 사람만 낼 수 있다. 복선: 신문(amb_dwarf_gate) · 강철수염 교역소의 편지(letters dwarf_ore_notice) · 도매상 품절 기사
    id: 'ore_run_begins', once: true, priority: 58,
    when: { day: { gte: 14 } },
    effects: { flags: ['ore_shortage'], schedule: [{ event: 'ore_run_ends', inDays: 4 }] },
    news: { cat: '경제', text: '도매상 철광석 동났다… 강철수염 산채가 쓸어 갔다 "성문 수리"', big: true },
  },
  {
    id: 'ore_run_ends', trigger: 'scheduled', priority: 58,
    effects: { unflags: ['ore_shortage'] },
    news: { cat: '경제', text: '도매상 철광석 다시 들어와… 값은 그대로' },
  },
  {
    // 유혹: 계약 나흘~닷새째 길드가 철광석을 매점한다 — 도매가 두세 배 (철값 지수 + config costMods ore_hoard ×1.5). 나흘~닷새 간다
    id: 'dwarf_ore_hoard', trigger: 'scheduled', priority: 55,
    when: { all: [{ flag: 'dwarf_contract' }, { noFlag: 'dwarf_contract_broken' }, { noFlag: 'dwarf_golden_age' }] },
    effects: { flags: ['ore_hoard'], vars: { iron_price: 80, guild_grip: 3 }, schedule: [{ event: 'dwarf_ore_hoard_end', inDays: [4, 5] }] },
    news: { cat: '경제', text: '금저울 길드, 철광석 매점… 도매가 두세 배로 치솟아', big: true },
  },
  {
    id: 'dwarf_ore_hoard_end', trigger: 'scheduled', priority: 55,
    effects: { unflags: ['ore_hoard'] },
    news: { cat: '경제', text: '길드 철광석 창고 풀려… 광석값 한풀 꺾여' },
  },

  // ───────── 서부 숲 분쟁 ─────────
  {
    id: 'border_skirmish', cooldown: 4, priority: 70,
    when: { all: [{ var: 'goblin_power', gte: 21 }, { var: 'border_tension', gte: 14 }, { noFlag: 'war' }] },
    effects: { vars: { iron_price: 10, border_tension: 4 } },
    news: { cat: '속보', text: '서부 숲에서 고블린 무리와 왕국군 충돌', big: true },
    outcomes: [
      {
        when: { cmp: ['goblin_power', '>', 'kingdom_power'] },
        effects: { vars: { kingdom_power: -4, goblin_power: -1, kingdom_morale: -5, goblin_unity: 4 }, flags: ['goblin_won_skirmish'], schedule: [{ event: 'west_takeover', inDays: [2, 3] }] },
        news: { cat: '전쟁', text: '고블린 습격대, 새 {item|을} 휘둘렀다는 증언… 정찰대 퇴각', about: { faction: 'goblin', tag: 'weapon', withinDays: 7, name: '칼' } },
      },
      {
        effects: { vars: { goblin_power: -5, kingdom_power: -1, kingdom_morale: 2, rel_goblin: -1 } },
        news: { cat: '전쟁', text: '왕국군, 고블린 격퇴… 부상병 많아 회복 물약 모자랄 듯' },
      },
    ],
  },
  {
    id: 'west_takeover', trigger: 'scheduled', priority: 70,
    outcomes: [
      {
        when: { cmp: ['goblin_power', '>', 'kingdom_power'] },
        effects: { flags: ['west_goblin'], vars: { goblin_unity: 6, kingdom_morale: -6, economy: -4, border_tension: 5 } },
        news: { cat: '전쟁', text: '고블린 부족, 서부 숲 장악… 왕국은 서부 교역로 봉쇄', big: true },
      },
      {
        effects: { vars: { border_tension: -3 } },
        news: { cat: '전쟁', text: '서부 숲 전선 교착… 양쪽 다 지원군 기다리는 중' },
      },
    ],
  },
  {
    id: 'war_outbreak', once: true, priority: 80,
    when: { all: [{ var: 'goblin_power', gte: 28 }, { var: 'kingdom_power', gte: 25 }, { var: 'border_tension', gte: 24 }] },
    effects: { flags: ['war'], vars: { iron_price: 25, economy: -8 } },
    news: { cat: '속보', text: '왕국-고블린 전쟁 발발! 서부 전역에 동원령', big: true },
  },
  {
    id: 'war_goblin_victory', once: true, priority: 85,
    when: { all: [{ flag: 'war' }, { var: 'war_progress', gte: 20 }] },
    effects: { flags: ['goblin_victory'], unflags: ['war'], vars: { kingdom_power: -6, kingdom_morale: -10 } }, // 3단계: −10/−15 였다 — 같은 kingdom_power 를 마왕군 전쟁도 봐서 「검은 깃발 아래」가 「명예 고블린」를 가렸다
    news: { cat: '속보', text: '고블린 연합 승리… 왕국, 서부 숲 포기 선언', big: true },
  },
  {
    id: 'war_kingdom_victory', once: true, priority: 85,
    when: { all: [{ flag: 'war' }, { var: 'war_progress', lte: -20 }] },
    effects: { flags: ['kingdom_victory'], unflags: ['war'], vars: { goblin_power: -15, kingdom_morale: 10 } },
    news: { cat: '속보', text: '왕국군, 서부 숲 평정… 고블린 부족들 뿔뿔이', big: true },
  },

  // ───────── 오우거 위협 (같은 사건, 다른 결말) ─────────
  {
    id: 'ogre_threat', once: true, priority: 65,
    when: { all: [{ day: { gte: 4 } }, { var: 'monster_pop', gte: 31 }] },
    effects: { flags: ['ogre_threat'], spawn: [{ customer: 'village_elder', inDays: 0 }], schedule: [{ event: 'ogre_resolution', inDays: 3 }] },
    news: { cat: '사건', text: '북쪽 산맥 오우거 떼 남하… 동쪽 마을이 위험하다', big: true },
  },
  {
    id: 'ogre_resolution', trigger: 'scheduled', priority: 65,
    outcomes: [
      {
        when: { var: 'village_defense', gte: 4 },
        effects: { vars: { monster_pop: -6, kingdom_morale: 4, reputation: 3 }, flags: ['village_saved'] },
        news: { cat: '마을', text: '헤일 촌장네 마을, 방패를 들고 오우거 격퇴!', big: true },
      },
      {
        when: { all: [{ var: 'goblin_power', gte: 22 }, { var: 'rel_goblin', gte: 4 }] },
        effects: { vars: { monster_pop: -6, kingdom_morale: -2, goblin_unity: 3 }, flags: ['village_saved', 'goblins_saved_village'] },
        news: { cat: '사건', text: '고블린 전사들이 오우거 쫓아내… 동쪽 마을 "고블린에게 빚졌다"', big: true },
      },
      {
        when: { var: 'kingdom_power', gte: 32 },
        effects: { vars: { monster_pop: -6, kingdom_power: -2, kingdom_morale: 3 }, flags: ['village_saved'] },
        news: { cat: '왕국', text: '제7기사단, 동쪽 마을 오우거 토벌 성공', big: true },
      },
      {
        effects: { vars: { monster_pop: 4, economy: -6, kingdom_morale: -6 }, flags: ['village_fell'] },
        news: { cat: '사건', text: '동쪽 마을 괴멸… 피난민 몰려 물약·식량 값 급등', big: true },
      },
    ],
  },

  // ───────── 기사단 사칭 밀매 ─────────
  {
    id: 'smuggling_probe', once: true, priority: 55,
    when: { day: { gte: 4 }, chance: 0.6 },
    effects: { flags: ['probe_7th'], spawn: [{ customer: 'fake_knight', inDays: 0 }] },
    news: { cat: '왕국', text: '기사단 사칭 무기 밀매꾼 주의… "제7기사단이라 속인다"' },
  },
  {
    id: 'fake_knight_reveal', trigger: 'scheduled', priority: 55,
    effects: { vars: { border_tension: 3, rel_kingdom: -2 } },
    news: { cat: '사건', text: '가짜 기사 모르간, 사 간 칼을 고블린에게 넘겨… 판매처 조사' },
  },
  {
    id: 'fake_knight_caught', trigger: 'scheduled', priority: 55,
    effects: { vars: { reputation: 3, rel_kingdom: 2 } },
    news: { cat: '왕국', text: '기사단 사칭범 모르간 검거… 칼은 한 자루도 못 구했다' },
  },

  // ───────── 관계 기반 ─────────
  {
    id: 'inspector_arrives', once: true, priority: 45,
    when: { sold: { faction: 'goblin', tag: 'weapon', min: 8 } },
    effects: { spawn: [{ customer: 'inspector', inDays: 0 }] },
    news: { cat: '왕국', text: '감찰청, 고블린이 든 무기 출처 추적… 상점가 탐문 예정' },
  },
  {
    id: 'inspector_followup', trigger: 'scheduled', priority: 45,
    outcomes: [
      {
        when: { sold: { faction: 'goblin', tag: 'weapon', min: 12 } },
        effects: { vars: { rel_kingdom: -6, reputation: -4 }, gold: -80, flags: ['fined'] },
        news: { cat: '왕국', text: '감찰청, 고블린에 무기 판 가게 적발… 벌금 80골드' },
      },
      { news: { cat: '왕국', text: '감찰청 고블린 무기 수사, 성과 없이 종결' } },
    ],
  },
  {
    id: 'goblin_chief_notice', once: true, priority: 40,
    when: { var: 'rel_goblin', gte: 10 },
    effects: { spawn: [{ customer: 'goblin_envoy', inDays: 0 }] },
    news: { cat: '고블린', text: '서부 숲 부족장들 비밀 회합… "인간 친구 상인" 언급' },
  },
  {
    id: 'royal_contract', once: true, priority: 40,
    when: { var: 'rel_kingdom', gte: 8 },
    effects: { spawn: [{ customer: 'royal_quartermaster', inDays: 0 }] },
    news: { cat: '왕국', text: '왕실 보급청, 민간 무기상 납품 계약 늘린다' },
  },

  // ───────── 세계 상태 문턱 ─────────
  {
    id: 'iron_spike', cooldown: 5, priority: 30,
    when: { var: 'iron_price', gte: 122 },
    news: { cat: '경제', text: '철광석 값 급등… 대장간 "칼 한 자루 값이 달라졌다"' },
  },
  {
    id: 'monster_surge', cooldown: 4, priority: 30,
    when: { var: 'monster_pop', gte: 42 },
    effects: { vars: { economy: -2 } },
    news: { cat: '사건', text: '가도에 몬스터 출몰 잇따라… 상인 행렬 피해' },
  },
  {
    id: 'blackmarket_rumor', cooldown: 5, priority: 30,
    when: { var: 'blackmarket', gte: 18 },
    effects: { vars: { rel_kingdom: -1 } },
    news: { cat: '사건', text: '암시장에 출처 모를 무기 넘쳐… "상점가에서 흘러나온다"' },
  },
  {
    id: 'goblin_unified', once: true, priority: 60,
    when: { var: 'goblin_unity', gte: 24 },
    effects: { flags: ['goblin_unified'], vars: { goblin_power: 4 } },
    news: { cat: '고블린', text: '서부 숲 고블린 부족들, 한 족장 아래 통합 선언', big: true },
  },

  // ───────── 안개 상단 (결과는 늘 늦게, 다른 얼굴로 온다) ─────────
  // (id · 플래그 · 변수는 옛 이름 demon_* 그대로 — 저장·조건 호환)
  {
    id: 'demon_first_sighting', once: true, priority: 60,
    when: { day: 3 },
    effects: { vars: { demon_influence: 2 } },
    news: { cat: '사건', text: '안개 낀 밤, 얼굴이 흐린 상인들 목격… "거래하러 왔다더라"', big: true },
  },
  {
    id: 'demon_trade_rumor', cooldown: 2, priority: 50,
    when: { traded: { faction: 'demon', withinDays: 1 } },
    effects: { vars: { blackmarket: 1 } },
    news: { cat: '소문', text: '"금화 대신 물건으로, 가끔은 기억으로 값 치르는 손님" 이야기가 돈다' },
  },
  {
    id: 'demon_bazaar', once: true, priority: 45,
    // 흐린 손거울(customers.js mist_mirror_peddler)로 중개인이 먼저 왔으면 뜨지 않는다
    when: { all: [{ day: { gte: 4 } }, { noFlag: 'mist_mirror' }, { not: { customerSeen: 'demon_contract' } }, { any: [{ var: 'demon_influence', gte: 9 }, { var: 'rel_demon', gte: 3 }] }] },
    effects: { vars: { demon_influence: 2 }, spawn: [{ customer: 'demon_contract', inDays: 0 }] },
    news: { cat: '사건', text: '안개 짙은 자정, 뒷골목에 "안개 시장"… 계약서 든 자들이 가게를 돈다' },
  },
  {
    id: 'contract_clause', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { flag: 'demon_contract_amended' },
        effects: { take: { potion: 5 }, vars: { reputation: 3, demon_influence: 2 } },
        news: { cat: '소문', text: '안개 걷힌 아침, 물약 5병이 사라진 가게… 대신 손님이 몰렸다' },
      },
      {
        when: { var: 'rel_demon', gte: 8 },
        effects: { flags: ['demon_protected'], vars: { blackmarket: -3, rel_kingdom: -2, demon_influence: 3 } },
        news: { cat: '사건', text: '도둑들, 한 가게만 피해 다녀… "그 집 앞은 안개가 안 걷히더라"' },
      },
      {
        effects: { gold: -120, take: { potion: 5 }, vars: { demon_influence: 3 }, flags: ['contract_collected'] },
        news: { cat: '사건', text: '계약서 쓴 무기점, 금화 120닢이 젖은 모래로… 주인은 기억 못 해' },
      },
    ],
  },
  {
    // 두 번째 계약 — 첫 계약(customers.js demon_contract 서명·조항 삭제) 9~11일 뒤. 중개인이 두 번째 장을 들고 온다
    id: 'mist_return', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { noFlag: 'mist_contract_broken' },
        effects: { vars: { demon_influence: 2 }, spawn: [{ customer: 'mist_contract2', inDays: 0 }] },
        news: { cat: '사건', text: '안개가 사흘째 걷히지 않아… 상점가 문마다 젖은 발자국' },
      },
    ],
  },
  {
    // 두 번째 계약 "간판에 안개 문양" — 금고가 비면 밤새 채워진다. 대신 도시는 조금씩 더 흐려진다
    id: 'mist_coffer', cooldown: 3, priority: 40,
    when: { all: [{ flag: 'mist_sign_mark' }, { gold: { lt: 80 } }] },
    effects: { gold: 80, vars: { demon_influence: 1, reputation: -1 } },
    news: { cat: '소문', text: '안개 문양 간판 가게, 빈 금고에 밤새 금화가… 동전마다 물기' },
  },
  {
    id: 'ring_awakens', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { all: [{ has: { item: 'cursed_ring' } }, { any: [{ var: 'demonlord_power', gte: 22 }, { chance: 0.5 }] }] },
        effects: { spawn: [{ customer: 'ring_collector', inDays: 0 }] },
        news: { cat: '소문', text: '저주받은 반지를 비싸게 사겠다는 수집가가 있다는 소문' },
      },
      {
        when: { has: { item: 'cursed_ring' } },
        effects: { gold: -40, vars: { reputation: -3, demon_influence: 2 }, flags: ['ring_cursed'], spawn: [{ customer: 'ring_priest', inDays: 0 }] },
        news: { cat: '사건', text: '반지를 들인 가게, 밤마다 금화 굴러가는 소리… 금고가 가볍다', big: true },
      },
      { news: { cat: '소문', text: '"오래된 금반지" 찾는 낯선 자들, 상점가를 돌다 사라져' } },
    ],
  },
  {
    id: 'ring_curse_tick', cooldown: 1, priority: 40,
    when: { all: [{ flag: 'ring_cursed' }, { has: { item: 'cursed_ring' } }] },
    effects: { gold: -15 },
    news: { cat: '생활', text: '반지 가진 가게, 금고에서 또 금화가 사라졌다' },
  },
  {
    id: 'demon_influence_alarm', once: true, priority: 45,
    when: { var: 'demon_influence', gte: 14 },
    effects: { spawn: [{ customer: 'demon_hunter', inDays: 0 }] },
    news: { cat: '왕국', text: '대성당 "안개 낀 밤엔 문 열지 말라" 경고… 성기사단 수도 순찰' },
  },
  {
    id: 'silver_patrol', cooldown: 3, priority: 45,
    // (물건 종류 단순화) 은검이 칼로 합쳐졌다 — 성기사단이 무장한 뒤 왕국에 칼을 대면 순찰이 돈다
    when: { all: [{ flag: 'armed_paladins' }, { sold: { faction: 'kingdom', item: 'iron_sword', min: 2, withinDays: 1 } }] },
    effects: { vars: { demon_influence: -3, rel_demon: -1, demonlord_power: -1 } },
    news: { cat: '왕국', text: '새 칼 찬 성기사들, "안개 시장" 급습… 얼굴 없는 상인들 안개 속으로' },
  },

  // ───────── 마왕군 ─────────
  {
    id: 'demonlord_stirs', once: true, priority: 60,
    when: { any: [{ day: { gte: 6 } }, { all: [{ day: { gte: 5 } }, { var: 'demonlord_power', gte: 16 }] }] },
    effects: { vars: { invasion_risk: 4 }, spawn: [{ customer: 'demonlord_envoy', inDays: 0 }] },
    news: { cat: '속보', text: '북쪽 황무지에 검은 깃발… 마왕군 사절이 남쪽으로', big: true },
  },
  {
    id: 'demonlord_arming', cooldown: 1, priority: 50,
    when: { sold: { faction: 'demonlord', tag: 'weapon', min: 4, withinDays: 1 } },
    effects: { vars: { invasion_risk: 3, kingdom_morale: -2 } },
    news: { cat: '보고', text: '마왕군 병사들, 인간 가게 {item|을} 차고 다닌다는 보고', about: { faction: 'demonlord', tag: 'weapon', name: '칼' }, alt: [{ buyer: 'demonlord_envoy2', text: '보급대장 볼가르가 사 간 {item}, 마왕군 병사들 손에' }] },
  },
  {
    id: 'envoy_grudge', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { var: 'rel_kingdom', gte: 4 },
        effects: { vars: { reputation: 3, rel_kingdom: 2, rel_demonlord: -2 } },
        news: { cat: '왕국', text: '"마왕의 돈을 거절한 상인"… 기사단, 그 가게 경비 강화' },
      },
      {
        effects: { vars: { reputation: -2, demon_influence: 2 }, gold: -30 },
        news: { cat: '사건', text: '마왕 전령을 돌려보낸 가게 문에 검은 낙인… 지워도 다시' },
      },
    ],
  },
  {
    id: 'demonlord_march', trigger: 'scheduled', priority: 75,
    outcomes: [
      {
        when: { all: [{ var: 'demonlord_power', gte: 30 }, { noFlag: 'demon_war' }] },
        effects: { flags: ['demon_war'], vars: { iron_price: 20, economy: -8, kingdom_morale: -6, invasion_risk: 10 }, schedule: [{ event: 'demon_war_resolution', inDays: [3, 4] }] },
        news: { cat: '속보', text: '마왕군 남하! 북부 요새 세 곳 함락… 전국 동원령', big: true },
      },
      {
        effects: { vars: { invasion_risk: 5, kingdom_power: -2, monster_pop: 3 } },
        news: { cat: '전쟁', text: '마왕군 선봉, 북부 마을 약탈하고 황무지로 물러가' },
      },
    ],
  },
  {
    id: 'demon_war_outbreak', once: true, priority: 78,
    when: { all: [{ noFlag: 'demon_war' }, { noFlag: 'demonlord_repelled' }, { var: 'demonlord_power', gte: 40 }, { var: 'invasion_risk', gte: 32 }] },
    effects: { flags: ['demon_war'], vars: { iron_price: 20, economy: -8, kingdom_morale: -6 }, schedule: [{ event: 'demon_war_resolution', inDays: [3, 4] }] },
    news: { cat: '속보', text: '마왕군 총공세! 검은 군단, 북부 국경 넘다', big: true },
  },
  {
    id: 'demon_war_resolution', trigger: 'scheduled', priority: 85,
    outcomes: [
      {
        // 은검으로 무장한 성기사단은 웬만한 군세 차이는 뒤집는다
        // (단순화) 은검 판매 기록 대신: 성기사단 무장 또는 대성당에 무기 3자루 이상
        when: { all: [{ any: [{ sold: { faction: 'church', tag: 'weapon', min: 3 } }, { flag: 'armed_paladins' }] }, { var: 'demonlord_power', lte: 50 }] },
        effects: { flags: ['demonlord_repelled'], unflags: ['demon_war'], vars: { demonlord_power: -15, kingdom_morale: 10, reputation: 4, invasion_risk: -20 } },
        news: { cat: '속보', text: '칼 든 성기사단, 마왕군 선봉 격파! 검은 군단 퇴각', big: true },
      },
      {
        when: { cmp: ['demonlord_power', '>', 'kingdom_power'] },
        effects: { flags: ['demonlord_victory'], unflags: ['demon_war'], vars: { kingdom_power: -10, kingdom_morale: -15, economy: -10, demon_influence: 8 } },
        news: { cat: '속보', text: '북부 방어선 붕괴… 왕국, 마왕과 굴욕적 휴전', big: true },
      },
      {
        effects: { flags: ['demonlord_repelled'], unflags: ['demon_war'], vars: { demonlord_power: -10, kingdom_power: -4, kingdom_morale: 3, invasion_risk: -15 } },
        news: { cat: '전쟁', text: '왕국군, 큰 희생 끝에 마왕군 격퇴… 북부 마을은 잿더미', big: true },
      },
    ],
  },

  // ════════════════════ 확장 세력 ════════════════════
  // 각 줄기는 다른 세력의 상태에 따라 다르게 끝난다. 같은 사건, 다른 결말.

  // ───────── 요정: 숲의 약속 (← 드워프·골렘에게 판 광석) ─────────
  // 세 번의 약속 → 결말 「요정의 가호」 (흐름은 config.js fairyDwarf 설명 참고)
  //   ① fairy_envoy (firstVisit 사이 하루, 반드시) → fairy_oath_check → fairy_blessing / fairy_betrayed
  //   ② fairy_envoy_return (secondVisit, ①을 지켰을 때) → fairy_oath2_check → fairy_oath2_kept / fairy_betrayed
  //   ③ fairy_envoy_final (②를 지켰고 드워프 왕국이 무너진 뒤) → fairy_oath3_check → forest_remembers / fairy_last_broken
  {
    // 첫 방문 날을 정한다: firstVisit[0]−1 일째 새벽에, 그 사이 하루로 예약 (예약 이벤트는 하룻밤 이벤트 수 제한을 받지 않는다)
    id: 'fairy_court_herald', once: true, priority: 99,
    when: { day: { gte: WS.data.config.fairyDwarf.firstVisit[0] - 1 } },
    effects: { schedule: [{ event: 'fairy_court_appears', inDays: [1, WS.data.config.fairyDwarf.firstVisit[1] - WS.data.config.fairyDwarf.firstVisit[0] + 1] }] },
  },
  {
    // 요정 궁정이 사람의 도시로 내려온다 — 누구에게나 한 번 (용광로 연기·골렘 공방·늑대 떼로 숲이 아프다)
    id: 'fairy_court_appears', trigger: 'scheduled', priority: 45,
    effects: { spawn: [{ customer: 'fairy_envoy', inDays: 0 }] },
    news: { cat: '마을', text: '동쪽 숲에 요정불 행렬… "요정 궁정이 누굴 찾아 내려왔다"' },
  },
  {
    id: 'fairy_oath_check', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { any: [{ sold: { faction: 'dwarf', tag: 'material', withinDays: 3 } }, { sold: { faction: 'golem', tag: 'material', withinDays: 3 } }, { sold: { faction: 'guild', item: 'iron_ore', withinDays: 3 } }] },
        effects: { take: { iron_sword: 3, war_axe: 2 }, vars: { rel_fairy: -8, fairy_grace: -3 }, flags: ['fairy_betrayed'] },
        news: { cat: '사건', text: '광석 판 무기점, 칼·전투도끼가 밤새 새빨갛게 녹슬어', big: true },
      },
      {
        effects: { give: { fairy_dust: 4 }, vars: { rel_fairy: 4, fairy_grace: 7, village_defense: 3, monster_pop: -3 }, flags: ['fairy_blessing'] },
        news: { cat: '마을', text: '약속 지킨 가게에 요정 가루… 동쪽 숲 늑대들 물러가', big: true },
      },
    ],
  },
  {
    // 두 번째 약속 사흘 뒤 — 강철수염 전령에게 광석을 줬거나(fairy_oath2_broken), 쇠를 캐는 이들에게 광석을 팔았으면 첫 약속을 깼을 때처럼
    id: 'fairy_oath2_check', trigger: 'scheduled', priority: 55,
    effects: { unflags: ['fairy_oath2'] },
    outcomes: [
      {
        when: { any: [
          { flag: 'fairy_oath2_broken' },
          { sold: { faction: 'dwarf', tag: 'material', trades: true, after: { tpl: 'fairy_envoy_return', action: 'promise' } } },
          { sold: { faction: 'golem', tag: 'material', trades: true, after: { tpl: 'fairy_envoy_return', action: 'promise' } } },
          { sold: { faction: 'guild', item: 'iron_ore', trades: true, after: { tpl: 'fairy_envoy_return', action: 'promise' } } },
        ] },
        effects: { take: { iron_sword: 3, war_axe: 2 }, vars: { rel_fairy: -8, fairy_grace: -3 }, flags: ['fairy_betrayed'] },
        news: { cat: '사건', text: '또 광석 판 무기점, 칼·전투도끼 밤새 새빨갛게 녹슬어', big: true },
      },
      {
        effects: { give: { fairy_dust: 2 }, vars: { rel_fairy: 3, fairy_grace: 4 }, flags: ['fairy_oath2_kept'] },
        news: { cat: '마을', text: '동쪽 숲 요정불, 두 번째 약속 지킨 무기점 창가에 머물러' },
      },
    ],
  },
  {
    // 마지막 약속 사흘 뒤 — 약속한 뒤로 무기를 한 자루라도 팔거나 바꿔 줬나 (갑옷·물약·재료는 괜찮다)
    id: 'fairy_oath3_check', trigger: 'scheduled', priority: 55,
    effects: { unflags: ['fairy_oath3'] },
    outcomes: [
      {
        when: { sold: { tag: 'weapon', trades: true, after: { tpl: 'fairy_envoy_final', action: 'promise' } } },
        effects: { vars: { rel_fairy: -4 }, flags: ['fairy_last_broken'] },
        news: { cat: '마을', text: '무기점 문간에 시든 들꽃 한 송이… 요정불은 숲으로 돌아가' },
      },
      {
        effects: { vars: { rel_fairy: 5, fairy_grace: 6, monster_pop: -3, village_defense: 2 }, flags: ['forest_remembers'] },
        news: { cat: '마을', text: '사흘 칼을 거둔 무기점… 동쪽 숲에 요정불 천 개가 떴다', big: true },
      },
    ],
  },
  {
    id: 'forest_withers', once: true, priority: 50,
    when: { all: [{ day: { gte: 5 } }, { var: 'fairy_grace', lte: 12 }] },
    effects: { flags: ['fairy_exodus'], vars: { monster_pop: 5, rel_fairy: -5, economy: -2 } },
    news: { cat: '사건', text: '동쪽 숲 요정불 모두 꺼져… 요정 떠난 자리에 늑대', big: true },
  },

  // ───────── 마법사 길드: 차원문 (← 대성당 권위 · 안개의 짙기 demon_influence) ─────────
  {
    id: 'mage_grant', once: true, priority: 45,
    when: { all: [{ day: { gte: 6 } }, { var: 'arcane_power', gte: 15 }] },
    effects: { spawn: [{ customer: 'archmage_vey', inDays: 0 }] },
    news: { cat: '생활', text: '은빛 탑 베이, "공간 접기" 실험 예고… 대성당 반발' },
  },
  {
    id: 'portal_experiment', trigger: 'scheduled', priority: 60,
    outcomes: [
      {
        when: { var: 'church_authority', gte: 32 },
        effects: { vars: { arcane_power: -8, church_authority: 4, rel_mage: -2 }, flags: ['mage_trial'] },
        news: { cat: '속보', text: '대성당, 은빛 탑 급습… 대마법사 베이 이단 혐의로 연행', big: true },
      },
      {
        when: { var: 'demon_influence', gte: 16 },
        effects: { vars: { demon_influence: 8, monster_pop: 4, arcane_power: 3 }, flags: ['portal_opened'] },
        news: { cat: '속보', text: '은빛 탑 실험 중 "문" 열려… 쏟아진 안개가 사흘 밤 걷히지 않아', big: true },
      },
      {
        effects: { vars: { arcane_power: 8, economy: 2 }, flags: ['mage_breakthrough'] },
        news: { cat: '속보', text: '베이의 공간 접기 성공! 편지가 한 시간 만에 국경 넘어', big: true },
      },
    ],
  },

  // ───────── 골렘 공방 (← 드워프 기술 + 마법사 연구) ─────────
  {
    id: 'golem_workshop_founded', once: true, priority: 50,
    when: { any: [{ all: [{ var: 'dwarf_tech', gte: 17 }, { var: 'arcane_power', gte: 17 }] }, { all: [{ flag: 'mage_breakthrough' }, { var: 'dwarf_tech', gte: 12 }] }] },
    effects: { flags: ['golem_workshop'], vars: { golem_tech: 2 }, spawn: [{ customer: 'golem_foreman', inDays: 0 }] },
    news: { cat: '드워프', text: '"청동심장 공방" 개업… 첫 골렘이 광장을 세 바퀴 걸었다', big: true },
  },
  {
    id: 'golem_army', once: true, priority: 55,
    when: { var: 'golem_tech', gte: 12 },
    effects: { flags: ['golem_army'], vars: { merc_strength: -6, fairy_grace: -4 } },
    outcomes: [
      {
        when: { any: [{ var: 'rel_kingdom', gte: 6 }, { var: 'kingdom_power', gte: 34 }] },
        effects: { flags: ['golem_kingdom'], vars: { kingdom_power: 10, border_tension: -3, kingdom_morale: 2 } },
        news: { cat: '속보', text: '왕국, 청동 골렘 군단 창설… 병사들은 집으로', big: true },
      },
      {
        when: { var: 'guild_grip', gte: 24 },
        effects: { flags: ['golem_guild'], vars: { economy: 6, kingdom_morale: -6, guild_grip: 6 } },
        news: { cat: '속보', text: '금저울 길드, 골렘 일꾼 백 기 도입… 짐꾼·광부 실직', big: true },
      },
      {
        when: { var: 'rel_demonlord', gte: 5 },
        effects: { flags: ['golem_demonlord'], vars: { demonlord_power: 8, invasion_risk: 5 } },
        news: { cat: '속보', text: '골렘 수십 기, "북쪽 고객"에게 납품… 황무지에 청동 번쩍', big: true },
      },
      {
        effects: { vars: { dwarf_tech: 5, economy: 3 } },
        news: { cat: '드워프', text: '골렘 광부 투입된 드워프 광산, 채굴량 세 배', big: true },
      },
    ],
  },

  // ───────── 용병단: 칼은 금화를 따라간다 ─────────
  {
    id: 'merc_company_forms', once: true, priority: 45,
    when: { all: [{ day: { gte: 6 } }, { any: [{ var: 'merc_strength', gte: 13 }, { flag: 'war' }, { flag: 'demon_war' }, { flag: 'succession_crisis' }] }] },
    effects: { spawn: [{ customer: 'merc_captain', inDays: 0 }] },
    news: { cat: '생활', text: '붉은 늑대 용병단, 수도 외곽에 천막… "돈만 주면 간다"' },
  },
  {
    id: 'merc_contract', trigger: 'scheduled', priority: 60,
    effects: { schedule: [{ event: 'merc_turncoat', inDays: [3, 4] }] },
    outcomes: [
      {
        when: { all: [{ var: 'rel_demonlord', gte: 4 }, { cmp: ['demonlord_power', '>', 'kingdom_power'] }] },
        effects: { flags: ['merc_black'], vars: { demonlord_power: 6, invasion_risk: 3 } },
        news: { cat: '속보', text: '붉은 늑대 용병단, 마왕군에 붙었다… "금화가 제일 무거웠다"', big: true },
      },
      {
        when: { all: [{ flag: 'succession_crisis' }, { noFlag: 'crowned' }, { var: 'succession', gte: 3 }] },
        effects: { flags: ['merc_prince'], vars: { succession: 6 } },
        news: { cat: '왕국', text: '붉은 늑대 용병단, 알드릭 왕자의 사병 됐다', big: true },
      },
      {
        when: { all: [{ var: 'rel_goblin', gte: 5 }, { cmp: ['goblin_power', '>', 'kingdom_power'] }] },
        effects: { flags: ['merc_goblin'], vars: { goblin_power: 5, border_tension: 3 } },
        news: { cat: '속보', text: '붉은 늑대 용병단, 고블린에 고용돼… 왕국 "반역이다"', big: true },
      },
      {
        effects: { flags: ['merc_kingdom'], vars: { kingdom_power: 5 } },
        news: { cat: '왕국', text: '붉은 늑대 용병단, 왕국과 국경 수비 계약', big: true },
      },
    ],
  },
  {
    id: 'merc_turncoat', trigger: 'scheduled', priority: 60,
    outcomes: [
      {
        when: { flag: 'golem_army' },
        effects: { flags: ['mercs_to_bandits'], vars: { merc_strength: -8, bandit_power: 8, trade_routes: -6 } },
        news: { cat: '사건', text: '골렘에 일자리 뺏긴 용병단, 가도 도적 됐다… 칼은 그대로', big: true },
      },
      {
        when: { all: [{ flag: 'merc_kingdom' }, { cmp: ['demonlord_power', '>', 'kingdom_power'] }] },
        effects: { flags: ['merc_betrayal'], unflags: ['merc_kingdom'], vars: { kingdom_power: -6, demonlord_power: 6, kingdom_morale: -4 } },
        news: { cat: '속보', text: '용병단, 북부 요새서 배신! 왕국이 사 준 칼로 성문 열어', big: true },
      },
      {
        when: { all: [{ flag: 'merc_kingdom' }, { cmp: ['goblin_power', '>', 'kingdom_power'] }] },
        effects: { flags: ['merc_betrayal'], unflags: ['merc_kingdom'], vars: { kingdom_power: -5, goblin_power: 5, border_tension: 4 } },
        news: { cat: '속보', text: '서부 전선 용병단, 고블린 쪽으로 넘어갔다', big: true },
      },
      {
        when: { all: [{ flag: 'merc_black' }, { cmp: ['kingdom_power', '>', 'demonlord_power'] }] },
        effects: { flags: ['merc_betrayal'], unflags: ['merc_black'], vars: { demonlord_power: -6, kingdom_power: 5 } },
        news: { cat: '속보', text: '마왕군 편 용병단, 왕국에 귀순… 적 보급로 불태워', big: true },
      },
      {
        when: { all: [{ flag: 'merc_prince' }, { cmp: ['succession', '<', 0] }] },
        effects: { flags: ['merc_betrayal'], unflags: ['merc_prince'], vars: { succession: -8 } },
        news: { cat: '왕국', text: '왕자의 용병들, 공주 쪽으로 돌아섰다… 급료 밀려', big: true },
      },
      { news: { cat: '생활', text: '붉은 늑대 용병단, 계약 연장… "금화가 오는 한"' } },
    ],
  },

  // ───────── 사냥꾼 · 흡혈귀: 은의 사냥 → 무덤이 열린다 ─────────
  {
    id: 'vampire_revealed', once: true, priority: 50, chance: 0.3,
    when: { all: [{ day: { gte: 6 } }, { any: [{ var: 'vampire_power', gte: 16 }, { flag: 'succession_crisis' }] }] }, // (3단계: 몬스터 수와 흡혈귀 발각은 무관 — monster_pop 조건을 뺐다)
    effects: { flags: ['vampire_known'], spawn: [{ customer: 'hunter_master', inDays: 0 }, { customer: 'vampire_count', inDays: 1 }], schedule: [{ event: 'vampire_hunt', inDays: 3 }] },
    news: { cat: '속보', text: '귀족가 하녀 연쇄 실종… 목엔 이빨 자국 두 개', big: true },
  },
  {
    id: 'vampire_hunt', trigger: 'scheduled', priority: 65,
    outcomes: [
      {
        when: { flag: 'silver_hoarded' },
        effects: { vars: { vampire_power: 6, rel_hunter: -3, monster_pop: 3 }, flags: ['hunters_fell'] },
        news: { cat: '속보', text: '은이 동나 백작 저택 급습 실패… 사냥꾼들 못 돌아와', big: true },
      },
      {
        // (단순화) 은화살·은검이 활·칼로 합쳐졌다 — 사냥꾼에게 활, 대성당·왕국에 성물(성수 등)
        when: { any: [{ flag: 'silver_hunt_armed' }, { sold: { faction: 'hunter', item: 'bow', min: 8 } }, { sold: { faction: 'church', tag: 'holy', min: 4 } }, { sold: { faction: 'kingdom', tag: 'holy', min: 5 } }] },
        effects: { vars: { vampire_power: -12, rel_hunter: 3, kingdom_morale: 3 }, flags: ['vampire_court_fell'], schedule: [{ event: 'undead_vacuum', inDays: [2, 3] }] },
        news: { cat: '속보', text: '화살 비 속에 백작 저택 함락! 밤의 궁정 무너져', big: true },
      },
      {
        effects: { vars: { vampire_power: -3, rel_hunter: -1 } },
        news: { cat: '사건', text: '사냥꾼들, 백작 저택 포위했다 물러나… 은이 모자랐다' },
      },
    ],
  },
  {
    id: 'undead_vacuum', trigger: 'scheduled', priority: 60,
    effects: { vars: { undead_power: 10 }, flags: ['graves_opened'] },
    news: { cat: '사건', text: '밤의 궁정 무너진 뒤, 공동묘지 흙이 움직인다', big: true },
  },

  // ───────── 언데드: 잿빛 행진 (← 대성당·사냥꾼의 성물 / 흡혈귀 궁정) ─────────
  {
    id: 'graves_stir', once: true, priority: 50,
    when: { any: [{ var: 'undead_power', gte: 12 }, { flag: 'graves_opened' }] },
    effects: { flags: ['graves_opened'], spawn: [{ customer: 'necro_prophet', inDays: 0 }] },
    news: { cat: '사건', text: '잿빛 수의 교단, 공동묘지서 밤 미사… 경비대 "기도일 뿐"' },
  },
  {
    id: 'dead_march', once: true, priority: 60,
    when: { var: 'undead_power', gte: 22 },
    effects: { schedule: [{ event: 'dead_march_resolution', inDays: 2 }], vars: { kingdom_morale: -3 }, set: { undead_defense: 0 }, spawn: [{ customer: 'march_priest', inDays: 0 }, { customer: 'march_priest', inDays: 1 }] },
    news: { cat: '속보', text: '해골 행렬, 녹슨 칼과 새 방패 들고 동쪽으로 행진', big: true },
  },
  {
    id: 'dead_march_resolution', trigger: 'scheduled', priority: 70,
    outcomes: [
      {
        // 대성당 사제에게 이틀 동안 넘긴 물자가 시세로 600G 어치를 넘거나, 대성당 권위가 아주 높으면 막는다
        when: { any: [{ var: 'undead_defense', gte: 600 }, { var: 'church_authority', gte: 36 }] },
        effects: { vars: { undead_power: -20, church_authority: 6, reputation: 3 }, flags: ['dead_repelled'] },
        news: { cat: '속보', text: '성수와 은이 해골 행렬 막았다! 대성당 종소리', big: true },
      },
      {
        when: { var: 'vampire_power', gte: 18 },
        effects: { vars: { undead_power: -16, vampire_power: 4, kingdom_morale: -2 }, flags: ['vampires_saved_city'] },
        news: { cat: '속보', text: '창백한 귀족들이 해골 행렬 부숴… "이 도시 피는 우리 것"', big: true },
      },
      {
        effects: { flags: ['undead_tide', 'village_fell'], vars: { economy: -8, kingdom_morale: -8, undead_power: 6, rel_village: -3 } },
        news: { cat: '속보', text: '해골 행렬, 동쪽 마을 삼켜… 주민들도 행렬에 합류', big: true },
      },
    ],
  },

  // ───────── 용: 금 냄새 (← 가게 금고 · 도시의 호황) ─────────
  {
    id: 'dragon_wakes', once: true, priority: 60, chance: 0.4,
    when: { all: [{ day: { gte: 18 } }, { var: 'dragon_stir', gte: 10 }] },
    effects: { flags: ['dragon_awake'], set: { dragon_defense: 0 }, spawn: [{ customer: 'dragon_herald', inDays: 0 }, { customer: 'wall_captain', inDays: 0 }, { customer: 'wall_captain', inDays: 1 }, { customer: 'wall_captain', inDays: 2 }], schedule: [{ event: 'dragon_descends', inDays: 3 }] },
    news: { cat: '속보', text: '재의 산 붉은 용 깨어나… "도시의 금 냄새 때문"', big: true },
  },
  {
    id: 'dragon_descends', trigger: 'scheduled', priority: 75,
    outcomes: [
      {
        // 성벽 수비대장에게 사흘 동안 넘긴 물자가 시세로 900G 어치를 넘거나, 골렘 군단이 성벽을 지키면 용이 떨어진다
        when: { any: [{ var: 'dragon_defense', gte: 900 }, { all: [{ flag: 'golem_kingdom' }, { var: 'dragon_defense', gte: 450 }] }] },
        effects: { flags: ['dragon_slain'], unflags: ['dragon_awake'], set: { dragon_stir: 0 }, vars: { economy: 6, kingdom_power: 4, kingdom_morale: 6, rel_dragon: -10 } },
        news: { cat: '속보', text: '붉은 용 추락! 성벽의 활과 방패가 버텼다', big: true },
      },
      {
        when: { flag: 'dragon_tribute' },
        effects: { spawn: [{ customer: 'ember_dragon', inDays: 0 }], vars: { dragon_stir: -3 } },
        news: { cat: '사건', text: '붉은 용, 도시 돌고 산으로… 조공 바친 가게 위에서 멈칫', big: true },
      },
      {
        effects: { flags: ['dragon_razed'], goldPct: -0.35, take: { iron_sword: 4, shield: 3, potion: 6 }, vars: { economy: -12, kingdom_morale: -8, kingdom_power: -4, dragon_stir: -6 } },
        news: { cat: '속보', text: '붉은 용, 상점가 불태워… 금고 녹고 칼·방패·물약 잿더미', big: true },
      },
    ],
  },

  {
    // 조공도 바치고 수비 물자도 넘겼는데 용이 떨어졌다 — 조공은 헛돈
    id: 'dragon_tribute_wasted', once: true, priority: 40,
    when: { all: [{ flag: 'dragon_slain' }, { flag: 'dragon_tribute' }] },
    news: { cat: '소문', text: '용에게 조공 바친 가게, 용이 떨어지자 머쓱' },
  },

  // ───────── 상인 길드: 가입 권유 → 철의 매점 → 임대료 압박 ─────────
  {
    id: 'guild_invitation', once: true, priority: 40,
    when: { all: [{ day: { gte: 4 } }, { any: [{ gold: { gte: 450 } }, { day: { gte: 6 } }] }] },
    effects: { spawn: [{ customer: 'guild_master', inDays: 0 }] },
    news: { cat: '경제', text: '금저울 길드, 가입 권유… "혼자 하는 장사는 외롭다"' },
  },
  {
    id: 'guild_dues', priority: 30,
    when: { all: [{ flag: 'guild_member' }, { dayMod: [4, 0] }] },
    effects: { gold: -20 },
    news: { cat: '장부', text: '길드 회비 20골드 빠져나감… 영수증엔 "상호 번영"' },
  },
  {
    id: 'iron_monopoly_bid', once: true, priority: 45,
    when: { all: [{ day: { gte: 7 } }, { var: 'guild_grip', gte: 15 }] },
    effects: { spawn: [{ customer: 'guild_iron_agent', inDays: 0 }] },
    news: { cat: '경제', text: '금저울 길드, 철광석 싹쓸이 중… 드워프 "값이 이상하다"' },
  },
  {
    id: 'iron_cartel_check', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { sold: { faction: 'dwarf', item: 'iron_ore', min: 25, withinDays: 5 } },
        effects: { vars: { guild_grip: -8, rel_dwarf: 3, rel_guild: -4, dwarf_tech: 2 }, flags: ['cartel_broken'] },
        news: { cat: '드워프', text: '드워프에 판 철광석으로 용광로 재가동… 길드 매점 실패', big: true },
      },
      {
        when: { var: 'guild_grip', gte: 22 },
        effects: { flags: ['iron_cartel'], vars: { iron_price: 30, dwarf_tech: -3, rel_dwarf: -2, golem_tech: -2, guild_grip: 4 } },
        news: { cat: '경제', text: '금저울 길드, 철광석 독점… 철값 폭등, 대장간 줄폐업', big: true },
      },
      { news: { cat: '경제', text: '길드 철광석 매점 흐지부지… 창고 광석만 녹슨다' } },
    ],
  },
  {
    id: 'cartel_eases', once: true, priority: 40,
    when: { all: [{ flag: 'iron_cartel' }, { any: [{ var: 'guild_grip', lt: 18 }, { flag: 'king_aldric' }] }] },
    effects: { unflags: ['iron_cartel'], vars: { iron_price: -15 } },
    news: { cat: '경제', text: '왕실 칙령, 철광석 유통 자유화… 길드 독점 끝' },
  },
  {
    id: 'guild_squeeze_ev', once: true, priority: 40,
    when: { all: [{ any: [{ flag: 'guild_declined' }, { flag: 'refused_cartel' }] }, { var: 'guild_grip', gte: 18 }, { var: 'rel_guild', lt: 3 }] },
    effects: { flags: ['guild_squeeze'] },
    news: { cat: '경제', text: '길드 안 든 가게만 임대료 5할 인상 통보… 건물주 속셈?' },
  },
  {
    id: 'guild_squeeze_ends', once: true, priority: 40,
    when: { all: [{ flag: 'guild_squeeze' }, { any: [{ var: 'rel_guild', gte: 5 }, { flag: 'cartel_broken' }, { var: 'guild_grip', lt: 14 }, { flag: 'king_aldric' }] }] },
    effects: { unflags: ['guild_squeeze'] },
    news: { cat: '경제', text: '임대료 인상 철회… 건물주 "착오였다"' },
  },

  // ───────── 임대료 인상 예고 — 하루 전 신문에 (config.rentSchedule). 3단계 QA: 예고 없이 오르면 임대료가 함정이 된다 ─────────
  ...WS.data.config.rentSchedule.filter(r => r.from > 1).map(r => ({
    id: `rent_notice_${r.from}`, once: true, priority: 60,
    when: { day: r.from - 1 },
    news: { cat: '경제', text: `건물주 "${r.from}일째부터 임대료 하루 ${r.rent}골드"… 상점가 술렁`, big: true },
  })),

  // ───────── 중반의 압박 — 돈 문제가 "거절"이 아니라 내가 한 거래에서 온다 (3단계 QA: 임대료·빚만으로는 신중한 사람만 벌받았다) ─────────
  {
    // 장부에 얼룩(장물 · 가짜 인장 손님과의 거래)이 남은 가게를 감찰청이 한 번 훑는다 — 벌금 (금고의 15%, 많아야 220G).
    // 복선: 밀수 뉴스(smuggle_route_news) · 장부 얼룩은 서류 대조로 피할 수 있다 (11일째 서류함)
    id: 'ledger_audit', once: true, priority: 46, chance: 0.3,
    when: { all: [{ day: { gte: 18, lte: 34 } }, { flag: 'illegal_sale' }] },
    effects: { steal: { pct: 0.15, max: 220 }, vars: { reputation: -2, rel_kingdom: -1 } },
    news: { cat: '왕국', text: '감찰청, 출처 흐린 거래가 장부에 남은 가게들 훑어… 벌금 {stolen}골드', big: true },
  },
  {
    // 전시 군수 부담금 — 전쟁(왕국-고블린 · 마왕군)이 한창이면 조달청이 상점가에서 걷어 간다 (금고의 10%, 많아야 180G). 이긴 쪽·진 쪽이 갈리면 끝난다
    id: 'war_levy', cooldown: 8, priority: 44, chance: 0.5,
    when: { any: [{ flag: 'war' }, { flag: 'demon_war' }] },
    effects: { steal: { pct: 0.1, max: 180 }, vars: { rel_kingdom: 1 } },
    news: { cat: '경제', text: '전시 군수 부담금 고지… 상점가 가게마다 {stolen}골드씩', big: false },
  },

  // ───────── 해적 · 암시장: 밀수 항로 (도적단 장물아비의 밀수는 js/data/smuggling.js) ─────────
  {
    id: 'port_opens', once: true, priority: 45, chance: 0.35,
    when: { all: [{ day: { gte: 6 } }, { any: [{ var: 'blackmarket', gte: 14 }, { var: 'economy', gte: 54 }, { var: 'pirate_power', gte: 10 }] }] },
    effects: { flags: ['port_open'], spawn: [{ customer: 'pirate_captain', inDays: 1 }] },
    news: { cat: '경제', text: '남쪽 항구 다시 열려… 국적 모를 배들 입항', big: true },
  },
  {
    id: 'stolen_goods_trace', once: true, priority: 40,
    when: { bought: { faction: 'bandit', min: 5 } },
    outcomes: [
      {
        when: { any: [{ flag: 'bribed_inspector' }, { var: 'rel_kingdom', lte: -4 }] },
        effects: { gold: -60, vars: { reputation: -3, rel_kingdom: -2 } },
        news: { cat: '왕국', text: '장물 사들인 가게 적발, 벌금 60골드… "내 칼이 진열대에"' },
      },
      {
        effects: { vars: { reputation: -1 } },
        news: { cat: '왕국', text: '경비대 장물 주의보… "출처 없는 헐값엔 이유가 있다"' },
      },
    ],
  },
  {
    id: 'pirate_cannons', once: true, priority: 50,
    when: { sold: { faction: 'pirate', item: 'black_powder', min: 3, trades: true } },
    effects: { flags: ['pirate_cannons'], vars: { pirate_power: 10 }, schedule: [{ event: 'port_blockade', inDays: 2 }] },
    news: { cat: '속보', text: '해적에게 간 흑색 화약, 대포가 되어 등대를 무너뜨려', big: true },
  },
  {
    id: 'port_blockade', trigger: 'scheduled', priority: 60,
    outcomes: [
      {
        when: { any: [{ var: 'kingdom_power', gte: 38 }, { flag: 'golem_kingdom' }] },
        effects: { vars: { pirate_power: -10, kingdom_power: -2 } },
        news: { cat: '왕국', text: '왕국 함대, 해적 봉쇄선 돌파' },
      },
      {
        effects: { flags: ['pirate_port'], vars: { trade_routes: -15, economy: -6, blackmarket: 6 } },
        news: { cat: '속보', text: '소금까마귀 해적단, 남쪽 항구 장악… 배마다 통행세', big: true },
      },
    ],
  },

  // ───────── 대성당: 파문 (← 안개 상단·언데드·흡혈귀와의 거래) ─────────
  {
    id: 'church_denunciation', once: true, priority: 45,
    when: {
      all: [
        { day: { gte: 6 } }, { var: 'church_authority', gte: 26 },
        { any: [{ traded: { faction: 'demon', min: 3 } }, { sold: { faction: 'demon', min: 10 } }, { flag: 'demon_contract' }, { sold: { faction: 'undead', min: 4, trades: true } }, { sold: { faction: 'demonlord', min: 12 } }, { flag: 'vampire_friend' }] },
      ],
    },
    effects: { spawn: [{ customer: 'inquisitor', inDays: 0 }] },
    news: { cat: '왕국', text: '대성당 "어둠과 거래한 가게" 명단 작성… 장부 조사' },
  },
  {
    id: 'excommunication', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { flag: 'demon_protected' },
        effects: { vars: { church_authority: -5, demon_influence: 3 } },
        news: { cat: '사건', text: '파문장 든 심문관, 상점가 골목에서 사라져' },
      },
      {
        when: { var: 'church_authority', gte: 25 },
        effects: { flags: ['excommunicated'], vars: { reputation: -8, rel_village: -5, rel_kingdom: -3, rel_church: -10, rel_demon: 2, rel_undead: 2 } },
        news: { cat: '속보', text: '대성당, 어둠과 거래한 무기점 공개 파문', big: true },
      },
      { news: { cat: '왕국', text: '대성당 파문 논의 무산… 추기경들 이견' } },
    ],
  },

  // ───────── 궁정: 왕위 계승 (← 용병·대성당·흡혈귀·상인 길드) ─────────
  {
    id: 'king_ailing', once: true, priority: 55, chance: 0.11,
    when: { day: { gte: 7, lte: 13 } },
    effects: { flags: ['succession_crisis'], spawn: [{ customer: 'prince_agent', inDays: 0 }, { customer: 'serena_agent', inDays: 1 }, { customer: 'night_envoy', inDays: 1 }], schedule: [{ event: 'king_dies', inDays: [6, 7] }] },
    news: { cat: '속보', text: '국왕 와병! 알드릭 왕자·세레나 공주 왕위 다툼', big: true },
  },
  {
    // 가면 쓴 귀족에게 독병을 팔았다 → 국왕이 반드시 쓰러진다 (까마귀로 밀고했으면 음모가 막힌다)
    id: 'king_ailing_poison', once: true, priority: 56,
    when: { all: [{ flag: 'king_poison_sold' }, { noFlag: 'succession_crisis' }, { noFlag: 'poison_plot_foiled' }] },
    effects: { flags: ['succession_crisis'], spawn: [{ customer: 'prince_agent', inDays: 0 }, { customer: 'serena_agent', inDays: 1 }, { customer: 'night_envoy', inDays: 1 }], schedule: [{ event: 'king_dies', inDays: [6, 7] }] },
    news: { cat: '왕국', text: '국왕 국정 연설 돌연 취소… 궁 "일정 조정일 뿐"', big: true },
  },
  {
    // 차려입은 신사(왕궁 시의)에게 물약을 팔지 않았다 → 국왕이 반드시 쓰러진다
    id: 'king_ailing_neglect', once: true, priority: 56,
    when: { all: [{ flag: 'physician_refused' }, { noFlag: 'succession_crisis' }] },
    effects: { flags: ['succession_crisis'], spawn: [{ customer: 'prince_agent', inDays: 0 }, { customer: 'serena_agent', inDays: 1 }, { customer: 'night_envoy', inDays: 1 }], schedule: [{ event: 'king_dies', inDays: [6, 7] }] },
    news: { cat: '속보', text: '국왕 쓰러져… 궁 "과로" 왕자·공주 궁으로', big: true },
  },
  {
    // "내일 다시 오시오"로 미뤘다가 다음 날 물약을 팔았다 → 그래도 절반은 늦었다 (50%)
    id: 'king_ailing_delay', once: true, priority: 57, chance: 0.5,
    when: { all: [{ flag: 'physician_delayed' }, { flag: 'physician_helped' }, { noFlag: 'succession_crisis' }] },
    effects: { flags: ['succession_crisis', 'crisis_heated'], vars: { vampire_power: 6, merc_strength: 3, church_authority: 2 }, spawn: [{ customer: 'prince_agent', inDays: 0 }, { customer: 'serena_agent', inDays: 1 }, { customer: 'night_envoy', inDays: 1 }], schedule: [{ event: 'king_dies', inDays: [6, 7] }] },
    news: { cat: '속보', text: '궁 불빛 밤새 안 꺼져… 왕자·공주·밤의 귀족들 궁으로', big: true },
  },
  {
    // 궁정 다툼의 자연 발생 — 국왕이 쓰러지기 전(9~14일), 왕자·공주 측근들이 먼저 세를 모은다. 궁정 의사에게 "내일 다시 오시오"를 눌러야만 열리던 길(heirs_rising)을
    // 누구나 만날 수 있게 (3단계 QA: 사람처럼 놀아도 court_struggle 이 0%였다). 복선: 신문 amb_court_ladies · amb_court_physician
    id: 'heirs_rising_rumor', once: true, priority: 54, chance: 0.14,
    when: { all: [{ day: { gte: 8, lte: 14 } }, { noFlag: 'succession_crisis' }, { noFlag: 'court_struggle' }] },
    effects: { flags: ['court_struggle'], vars: { crown_power: -3 }, schedule: [{ event: 'court_council', inDays: 8 }] },
    news: { cat: '왕국', text: '왕자·공주 측근들 도성 곳곳서 사람 모아… 궁 "평소와 같다"', big: true },
  },
  {
    // 하루를 미룬 사이 왕자와 공주가 세를 키웠다 — 왕이 살아 있어도 왕·왕자·공주 셋의 세력 다툼이 시작된다
    id: 'heirs_rising', once: true, priority: 55,
    when: { flag: 'physician_delayed' },
    effects: { flags: ['court_struggle'], vars: { crown_power: -3 }, schedule: [{ event: 'court_council', inDays: 8 }] },
    news: { cat: '왕국', text: '왕자·공주 측근들 도성 곳곳서 사람 모아… 궁 "평소와 같다"', big: true },
  },
  {
    // 어전 회의 — 셋 중 가장 센 쪽이 이긴다 (왕이 이미 쓰러져 왕위 다툼 중이면 왕의 죽음이 결판이므로 열리지 않는다)
    id: 'court_council', trigger: 'scheduled', priority: 82,
    effects: { flags: ['court_decided'], unflags: ['court_struggle'] },
    outcomes: [
      {
        when: { flag: 'succession_crisis' },
        news: { cat: '왕국', text: '어전 회의 무기한 연기… 궁은 국왕 병세에 매달려' },
      },
      {
        when: { all: [{ cmp: ['crown_power', '>', 'prince_power'] }, { cmp: ['crown_power', '>', 'princess_power'] }] },
        effects: { flags: ['crown_holds', 'royal_certified'], vars: { kingdom_power: 3, rel_kingdom: 3, kingdom_morale: 3 } },
        news: { cat: '속보', text: '어전 회의, 국왕 편에… 왕자·공주 변방으로', big: true },
      },
      {
        when: { all: [{ cmp: ['prince_power', '>', 'princess_power'] }, { cmp: ['prince_power', '>', 'crown_power'] }] },
        effects: { flags: ['king_aldric', 'crowned'], vars: { kingdom_power: 6, border_tension: 5, merc_strength: 4 } },
        news: { cat: '속보', text: '국왕 양위… 알드릭 왕 즉위, "서부 숲 정벌 준비"', big: true },
      },
      {
        when: { all: [{ cmp: ['princess_power', '>', 'prince_power'] }, { cmp: ['princess_power', '>', 'crown_power'] }] },
        effects: { flags: ['queen_serena', 'crowned'], vars: { church_authority: 5, guild_grip: 4, economy: 4, border_tension: -3 } },
        news: { cat: '속보', text: '국왕 양위… 세레나 여왕 즉위, "상업세 인하"', big: true },
      },
      {
        // 엇비슷하면 내전
        effects: { flags: ['civil_war'], vars: { kingdom_power: -8, merc_strength: 8, kingdom_morale: -6, economy: -4 }, schedule: [{ event: 'civil_war_end', inDays: [3, 4] }] },
        news: { cat: '속보', text: '어전 회의 결렬… 왕자·공주 모두 군사 일으켜', big: true },
      },
    ],
  },
  {
    // 신분을 숨긴 손님에게 비싸게 판 대가 — 가끔 경비대가 조사하러 온다
    id: 'court_inquiry', cooldown: 5, priority: 45, chance: 0.2,
    when: { all: [{ flag: 'court_struggle' }, { any: [{ flag: 'armed_prince_secret' }, { flag: 'armed_princess_secret' }] }] },
    effects: { gold: -40, vars: { reputation: -2, rel_kingdom: -2 } },
    news: { cat: '사건', text: '경비대, 신분 숨긴 자들에 칼 판 가게 조사… 벌금' },
  },
  {
    id: 'poison_plot_foiled_ev', once: true, priority: 50,
    when: { flag: 'poison_plot_foiled' },
    effects: { vars: { reputation: 2, rel_kingdom: 2 } },
    news: { cat: '왕국', text: '경비대, 궁정 독살 음모 적발… "무기점 제보 덕"' },
  },
  {
    id: 'king_dies', trigger: 'scheduled', priority: 80,
    effects: { flags: ['crowned'] },
    outcomes: [
      {
        // 밤의 궁정 편에 섰고 (사절에게 "편에 선다"), 그들이 충분히 강하면 — 왕정과 밤의 다툼에서 밤이 이긴다
        when: { all: [{ flag: 'vampire_backed' }, { var: 'vampire_power', gte: 22 }] },
        effects: { flags: ['vampire_regent'], vars: { vampire_power: 8, church_authority: -6, kingdom_morale: -4 } },
        news: { cat: '속보', text: '국왕 서거… 두 후계자 쓰러지고 베른하르트 백작 섭정', big: true },
      },
      {
        when: { var: 'succession', gte: 3 },
        effects: { flags: ['king_aldric'], vars: { kingdom_power: 6, border_tension: 5, merc_strength: 4, church_authority: -3 } },
        news: { cat: '속보', text: '알드릭 왕 즉위… 첫 칙령은 "서부 숲 정벌 준비"', big: true },
      },
      {
        when: { var: 'succession', lte: -3 },
        effects: { flags: ['queen_serena'], vars: { church_authority: 5, guild_grip: 4, economy: 4, border_tension: -3, kingdom_morale: 4 } },
        news: { cat: '속보', text: '세레나 여왕 즉위… 첫 칙령은 "상업세 인하"', big: true },
      },
      {
        effects: { unflags: ['crowned'], flags: ['civil_war'], vars: { kingdom_power: -8, merc_strength: 8, kingdom_morale: -6, economy: -4 }, schedule: [{ event: 'civil_war_end', inDays: [3, 4] }] },
        news: { cat: '속보', text: '국왕 서거… 두 후계자 모두 왕관 써 내전 발발', big: true },
      },
    ],
  },
  {
    id: 'civil_war_end', trigger: 'scheduled', priority: 80,
    effects: { flags: ['crowned'], unflags: ['civil_war'] },
    outcomes: [
      {
        when: { any: [{ flag: 'merc_prince' }, { var: 'succession', gt: 0 }] },
        effects: { flags: ['king_aldric'], vars: { kingdom_power: 3, border_tension: 4 } },
        news: { cat: '속보', text: '내전 끝, 용병들 칼이 알드릭 왕을 지켰다', big: true },
      },
      {
        effects: { flags: ['queen_serena'], vars: { church_authority: 4, economy: 2 } },
        news: { cat: '속보', text: '내전 끝, 세레나 여왕 승리… 왕자는 국경 너머로', big: true },
      },
    ],
  },

  // ───────── 도적단: 거절은 기억된다 ─────────
  {
    id: 'bandit_raid', cooldown: 4, priority: 45,
    when: { all: [{ var: 'rel_bandit', lte: -5 }, { var: 'bandit_power', gte: 12 }, { noFlag: 'bandits_crushed' }] },
    outcomes: [
      {
        when: { any: [{ var: 'village_defense', gte: 6 }, { flag: 'merc_kingdom' }, { var: 'kingdom_power', gte: 38 }, { flag: 'protection_paid' }] },
        effects: { vars: { bandit_power: -3 } },
        news: { cat: '사건', text: '상점가 야간 습격 미수… 도적들 순찰 횃불 보고 도망' },
      },
      {
        effects: { gold: -60, take: { iron_sword: 2, potion: 3 }, vars: { bandit_power: 1 } },
        news: { cat: '사건', text: '퇴짜 맞은 도적들 앙갚음… 무기점서 칼·물약·금화 털려' },
      },
    ],
  },
  {
    id: 'bandit_king_rises', once: true, priority: 50,
    when: { all: [{ day: { gte: 6 } }, { var: 'bandit_power', gte: 16 }] },
    effects: { spawn: [{ customer: 'bandit_king', inDays: 0 }] },
    news: { cat: '속보', text: '가도 도적들, "도적왕 룩" 아래 뭉쳐… 통행세 선언', big: true },
  },
  {
    id: 'bandit_hideout_raid', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { any: [{ var: 'kingdom_power', gte: 30 }, { flag: 'merc_kingdom' }, { flag: 'golem_kingdom' }] },
        effects: { vars: { bandit_power: -12, trade_routes: 10, reputation: 3 }, flags: ['bandits_crushed'] },
        news: { cat: '왕국', text: '기사단, 도적 소굴 소탕! 도적왕 룩 체포', big: true },
      },
      {
        effects: { vars: { bandit_power: 4, rel_bandit: -5, kingdom_power: -2 } },
        news: { cat: '사건', text: '기사단 도적 소굴 급습 실패… 도적들 "밀고자" 찾는 중' },
      },
    ],
  },

  // ───────── 잿빛 엄니 전투단: 도끼는 강한 쪽에 선다 (← 마왕군·고블린·마을 방비) ─────────
  {
    id: 'warband_descends', once: true, priority: 50, chance: 0.25,
    when: { all: [{ day: { gte: 7 } }, { any: [{ var: 'monster_pop', gte: 38 }, { var: 'warband_power', gte: 13 }, { flag: 'village_fell' }] }] },
    effects: { flags: ['warband_sighted'], spawn: [{ customer: 'warchief', inDays: 1 }] },
    news: { cat: '속보', text: '잿빛 엄니 전투단 남하… 오크·오우거가 한 깃발 아래', big: true },
  },
  {
    id: 'warband_choice', trigger: 'scheduled', priority: 65,
    outcomes: [
      {
        when: { any: [{ var: 'rel_demonlord', gte: 5 }, { var: 'demonlord_power', gte: 34 }] },
        effects: { flags: ['orcs_join_legion'], vars: { demonlord_power: 8, invasion_risk: 6, warband_power: -4 } },
        news: { cat: '속보', text: '잿빛 엄니 전투단, 마왕군에 합류', big: true },
      },
      {
        when: { all: [{ var: 'goblin_power', gte: 20 }, { cmp: ['warband_power', '>', 'goblin_power'] }] },
        effects: { flags: ['orcs_crushed_goblins'], vars: { goblin_power: -8, goblin_unity: -5, border_tension: -4, warband_power: -3, monster_pop: 2 } },
        news: { cat: '속보', text: '전투단, 서부 숲 고블린 부족들 궤멸', big: true },
      },
      {
        when: { var: 'goblin_power', gte: 20 },
        effects: { flags: ['goblins_repel_orcs'], vars: { warband_power: -8, goblin_unity: 6, goblin_power: -2 } },
        news: { cat: '고블린', text: '고블린들, 전투단 격퇴… "우리 칼은 인간 가게에서 샀다"', big: true },
      },
      {
        when: { flag: 'orcs_respect' },
        effects: { flags: ['orc_auxiliaries'], vars: { kingdom_power: 5, warband_power: -4, monster_pop: -3 } },
        news: { cat: '왕국', text: '족장 그루크, 왕국과 용병 계약… "도끼 장수가 우릴 존중했다"' },
      },
      {
        when: { var: 'village_defense', gte: 5 },
        effects: { vars: { warband_power: -6, village_defense: -2, reputation: 2 } },
        news: { cat: '마을', text: '동쪽 마을 자경단 방패벽, 전투단 도끼를 버텼다' },
      },
      {
        effects: { flags: ['village_fell'], vars: { economy: -5, kingdom_morale: -5, monster_pop: 3 } },
        news: { cat: '속보', text: '전투단, 동쪽 마을 약탈… 성문엔 도끼 자국만', big: true },
      },
    ],
  },

  // ───────── 연금술: 부작용과 천둥 가루 ─────────
  {
    id: 'alchemy_mishap', cooldown: 4, priority: 35, chance: 0.5,
    when: { sold: { faction: 'alchemist', tag: 'material', min: 4, withinDays: 1 } },
    outcomes: [
      {
        when: { sold: { faction: 'alchemist', item: 'bone_dust', withinDays: 2 } },
        effects: { vars: { undead_power: 4, rel_church: -1 } },
        news: { cat: '사건', text: '뼛가루 실험 중 증류탑에서 해골이 걸어 나갔다' },
      },
      {
        when: { chance: 0.5 },
        effects: { vars: { economy: -2, alchemy_progress: 2 } },
        news: { cat: '사건', text: '녹색 증류탑 폭발! 사흘간 개구리 비' },
      },
      {
        effects: { vars: { kingdom_morale: 3, monster_pop: -1, alchemy_progress: 1 } },
        news: { cat: '생활', text: '연금술 학회, 해독제 무료 배포… "어느 가게 재료 덕"' },
      },
    ],
  },
  // ── 「천둥의 시대」: 화약 상인의 길 ──
  // 발명 → 왕국 포고가 먼저 1면에 → 하루이틀 뒤 케셀이 독점권을 팔러 온다 (customers.js alchemist_kessel — 6/15/30통).
  // 독점 판매상이 되어 화약을 25통 넘게 팔면(교환 포함) powder_age → 결말 thunder_age.
  // 케셀에게 바로 알리면 뒤탈 없이 끝. 판 뒤 감찰관에게 신고하면(powder_inspector) 해적의 앙갚음 (powder_revenge)
  {
    id: 'powder_invented', once: true, priority: 55,
    when: { var: 'alchemy_progress', gte: 13 },
    effects: { flags: ['powder_invented'], schedule: [{ event: 'kessel_visit', inDays: [1, 2] }] },
    news: [
      { cat: '왕국', text: '[포고] 검은 가루(화약) 발견 시 즉시 신고!', big: true },
      { cat: '속보', text: '녹색 증류탑서 천둥! 학회 "불붙는 검은 가루" 발명' },
    ],
  },
  { id: 'kessel_visit', trigger: 'scheduled', priority: 45, effects: { spawn: [{ customer: 'alchemist_kessel', inDays: 0 }] } },
  {
    id: 'powder_spread', once: true, priority: 55,
    when: { all: [{ sold: { tag: 'powder', min: 25, trades: true } }, { noFlag: 'powder_banned' }, { noFlag: 'powder_reported_late' }] },
    effects: { flags: ['powder_age'], vars: { kingdom_power: 3, dwarf_tech: 3, merc_strength: 3, church_authority: -3 } },
    news: { cat: '속보', text: '흑색 화약이 퍼진다… 해적은 대포, 용병은 화약통', big: true },
  },
  {
    // 화약을 한 통이라도 넘긴 가게에 감찰관이 이따금 들른다 — 뒤늦게라도 신고할 수 있다
    id: 'powder_inquiry', cooldown: 6, chance: 0.35, priority: 45,
    when: { all: [{ sold: { item: 'black_powder', min: 1, trades: true } }, { noFlag: 'powder_banned' }] },
    effects: { spawn: [{ customer: 'powder_inspector', inDays: 0 }] },
  },
  {
    // 뒤늦은 신고 1~3일 뒤 밤 — 도적이 든다. 사실은 해적이지만 신문은 흔적만 적는다 (물 자국·모래)
    // 왕국과 사이가 좋고(관계 5 이상) 왕국에 무기를 판 적이 있으면 경비대가 가게를 지켜 준다
    id: 'powder_revenge', trigger: 'scheduled', priority: 70,
    outcomes: [
      {
        when: { all: [{ var: 'rel_kingdom', gte: 5 }, { sold: { faction: 'kingdom', tag: 'weapon' } }] },
        effects: { flags: ['powder_thief_foiled'], vars: { rel_kingdom: 1 } },
        news: { cat: '왕국', text: '경비대, 무기점 노린 괴한 쫓아내', big: true },
      },
      {
        effects: {
          steal: { pct: 0.4, max: 300 }, take: { black_powder: 999, iron_sword: 4, bow: 3, war_axe: 2, pearl: 99, eastern_spice: 99 },
          flags: ['powder_robbed'], schedule: [{ event: 'powder_thief_rumor', inDays: [3, 4] }],
        },
        news: { cat: '장부', text: '밤사이 도적이 들었다. 금고에서 {stolen}골드, 화약통 전부와 칼 몇 자루가 사라졌다. 바닥에 물 자국이 번져 있고, 모래가 흩어져 있다.', big: true },
      },
    ],
  },
  { id: 'powder_thief_rumor', trigger: 'scheduled', priority: 40, news: { cat: '소문', text: '항구 술집에 낯익은 칼이 헐값에 돈다' } },

  // ───────── 나그네: 대상의 귀로 (← 도적·해적에게 판 칼) ─────────
  {
    id: 'caravan_arrives', once: true, priority: 40, chance: 0.4,
    when: { all: [{ day: { gte: 5 } }, { var: 'trade_routes', gte: 42 }] },
    effects: { spawn: [{ customer: 'caravan_master', inDays: 0 }] },
    news: { cat: '경제', text: '동방 대상 낙타 마흔 마리 입성… 돌아갈 길 걱정' },
  },
  {
    id: 'caravan_return', trigger: 'scheduled', priority: 50,
    outcomes: [
      {
        when: { all: [{ any: [{ var: 'bandit_power', gte: 15 }, { var: 'trade_routes', lt: 32 }, { flag: 'pirate_port' }] }, { sold: { faction: 'bandit', tag: 'weapon', min: 4, trades: true } }] },
        effects: { vars: { rel_traveler: -5, bandit_power: 3, trade_routes: -5, reputation: -2 } },
        news: { cat: '사건', text: '사이다의 대상 귀로에 전멸… 도적들 손엔 수도 무기점 칼', big: true },
      },
      {
        when: { any: [{ var: 'bandit_power', gte: 15 }, { var: 'trade_routes', lt: 32 }, { flag: 'pirate_port' }] },
        effects: { vars: { rel_traveler: -3, bandit_power: 3, trade_routes: -5 } },
        news: { cat: '사건', text: '사이다의 대상 귀로에 전멸… 낙타 한 마리만 돌아와', big: true },
      },
      {
        effects: { gold: 260, give: { eastern_spice: 4 }, vars: { economy: 3, trade_routes: 5, rel_traveler: 3, star_signal: 1 } },
        news: { cat: '경제', text: '사이다의 대상 무사 귀환… 무기점에 금화와 "별" 선물' },
      },
    ],
  },

  // ───────── 미지의 종족: 아주 늦게 오는 대답 ─────────
  {
    id: 'star_blink', once: true, priority: 30,
    when: { var: 'star_signal', gte: 2 },
    news: { cat: '생활', text: '천문대 "북쪽 별 하나가 신호처럼 깜빡인다"' },
  },
  {
    id: 'star_echo', trigger: 'scheduled', priority: 40,
    outcomes: [
      {
        when: { traded: { faction: 'unknown', gave: 'iron_ore' } },
        effects: { vars: { dwarf_tech: 3, star_signal: 1 } },
        news: { cat: '먼 곳', text: '사막 너머에 하룻밤 새 쇠탑… 철광석으로 지은 듯' },
      },
      {
        when: { traded: { faction: 'unknown', gave: 'potion' } },
        effects: { vars: { kingdom_morale: 2, star_signal: 1 } },
        news: { cat: '먼 곳', text: '먼 마을 역병, 하룻밤 새 사라져… 물약 냄새가 났다고' },
      },
      {
        effects: { vars: { star_signal: 1 } },
        news: { cat: '먼 곳', text: '"하늘에서 내려와 물건 하나씩 사 가는 자들" 소문' },
      },
    ],
  },
  // ════════════════════ 인상서(수배) 시스템 — 2막 가동 (customers.js 상단 주석에 패턴 설명) ════════════════════

  // ───────── 사건 1: 마르가 ─────────
  {
    id: 'wanted_marga', once: true, priority: 50,
    when: { day: { gte: 11 } },
    effects: { flags: ['wanted_marga_posted'], posters: ['marga'], schedule: [{ event: 'marga_arrives', inDays: [3, 5] }] },
    news: { cat: '왕국', text: '[포고] 뺨에 초승달 흉터, 고블린 억양 여자 보면 신고', big: true },
  },
  {
    // 마르가를 뺀 다른 인상서의 수배자를 모두 잡았는가 (새 인상서를 더하면 여기에 그 잡힘 조건을 더할 것)
    // 쥐수염이 아예 오지 않은 판(오벨의 보석을 안 맡음)은 잡을 사람이 없으니 된 것으로 친다
    id: 'wanted_cleared', once: true, priority: 30,
    when: { all: [{ day: { gte: 12 } }, { any: [{ flag: 'caught_gem_thief' }, { all: [{ day: { gte: 14 } }, { not: { customerSeen: 'gem_thief' } }] }] }] },
    effects: { flags: ['posters_cleared'] },
  },
  { id: 'marga_arrives', trigger: 'scheduled', priority: 50, effects: { spawn: [{ customer: 'marga', inDays: 0 }] } },
  { id: 'marga_inspector_visit', trigger: 'scheduled', priority: 50, effects: { spawn: [{ customer: 'marga_inspector', inDays: 0 }] } },
  {
    // 천칭단원이면 소라껍데기가 미리 귀띔한다 → 감찰관 앞에서 "귀띔대로 부인한다"
    id: 'liga_tip_marga', cooldown: 6, priority: 48,
    when: { all: [{ flag: 'liga_member' }, { noFlag: 'liga_failed' }, { flag: 'wanted_marga_posted' }, { noFlag: 'marga_tipped' }] },
    effects: { flags: ['marga_tipped'] },
    news: { cat: '소문', text: '밤중에 소라껍데기가 속삭였다 — "인상서 속 여자, 조심하게."' },
  },
  {
    id: 'marga_audit', cooldown: 3, priority: 46,
    when: { all: [{ flag: 'lied_about_marga' }, { noFlag: 'marga_protected' }, { noFlag: 'marga_audit_resolved' }, { day: { gte: 14 } }] },
    // 천칭단원(소라껍데기)이면 적발 확률 12%, 아니면 30%
    outcomes: [
      {
        when: { all: [{ flag: 'liga_member' }, { noFlag: 'liga_failed' }, { chance: 0.12 }] },
        effects: { gold: -120, vars: { reputation: -10 }, flags: ['marga_caught', 'marga_audit_resolved'] },
        news: { cat: '속보', text: '마르가 일로 거짓 진술한 가게, 뒤늦게 적발… 벌금 120골드', big: true },
      },
      {
        when: { all: [{ any: [{ noFlag: 'liga_member' }, { flag: 'liga_failed' }] }, { chance: 0.3 }] },
        effects: { gold: -120, vars: { reputation: -10 }, flags: ['marga_caught', 'marga_audit_resolved'] },
        news: { cat: '속보', text: '마르가 일로 거짓 진술한 가게, 뒤늦게 적발… 벌금 120골드', big: true },
      },
    ],
  },
  {
    id: 'marga_epilogue', once: true, priority: 60,
    when: { all: [{ day: { gte: 33 } }, { flag: 'sold_marga' }, { noFlag: 'reported_marga' } ] },
    outcomes: [
      {
        // 끝까지 지켜 줬다 — 팔았고, 신고하지 않았고, 감찰관 앞에서도 모른다고 했다
        when: { all: [{ flag: 'lied_about_marga' }, { noFlag: 'confessed_marga' }] },
        effects: { spawn: [{ customer: 'marga_returns', inDays: 1 }] },
        news: { cat: '사건', text: '서부 숲에서 사절단… 맨 앞 여인의 뺨에 초승달 흉터', big: true },
      },
      {
        // 자백(confessed_marga)한 경우는 이미 그때 벌금으로 정리된 사건 — 은닉(거짓말)한 경우만 후일 낙인이 찍힌다
        when: { all: [{ flag: 'lied_about_marga' }, { any: [{ flag: 'kingdom_victory' }, { all: [{ flag: 'royal_certified' }, { var: 'rel_kingdom', gte: 10 }] }] }] },
        effects: { vars: { reputation: -6, rel_kingdom: -3 }, flags: ['marga_stigma'] },
        news: { cat: '왕국', text: '왕실 기록 "적국 밀사 도운 가게"… 단골 몇이 발길 끊어', big: true },
      },
      { news: { cat: '소문', text: '초승달 흉터 여인 마르가, 다시는 나타나지 않았다' } },
    ],
  },

  // ───────── 사건 2: 두건 쓴 행상 카심 (축 B: 감찰청 끄나풀에게 알릴지 숨길지) ─────────
  {
    id: 'wanted_kassim', once: true, priority: 50,
    when: { day: { gte: 13 } },
    effects: { flags: ['wanted_kassim_posted'], schedule: [{ event: 'kassim_arrives', inDays: [3, 5] }] },
    news: { cat: '왕국', text: '[포고] 두건 쓰고 마력 결정·물약만 찾는 자 주의', big: true },
  },
  { id: 'kassim_arrives', trigger: 'scheduled', priority: 50, effects: { spawn: [{ customer: 'kassim', inDays: 0 }] } },
  // id 는 옛 이름 그대로 — 찾아오는 건 감찰청 끄나풀 (customers.js liga_tipster_kassim)
  { id: 'kassim_liga_contact', trigger: 'scheduled', priority: 50, effects: { spawn: [{ customer: 'liga_tipster_kassim', inDays: 0 }] } },
  {
    // 천칭단원이면 소라껍데기 덕에 걸려도 가볍고(15%), 아니면 40% 확률로 크게 걸린다
    id: 'kassim_audit', trigger: 'scheduled', priority: 46,
    outcomes: [
      {
        when: { all: [{ flag: 'liga_member' }, { noFlag: 'liga_failed' }, { chance: 0.15 }] },
        effects: { gold: -60, vars: { reputation: -4 }, flags: ['kassim_caught'] },
        news: { cat: '사건', text: '카심에게 결정 판 거래 뒤늦게 발각… 벌금은 가벼웠다' },
      },
      {
        when: { all: [{ any: [{ noFlag: 'liga_member' }, { flag: 'liga_failed' }] }, { chance: 0.4 }] },
        effects: { gold: -150, vars: { reputation: -10, rel_kingdom: -4 }, flags: ['kassim_caught'] },
        news: { cat: '속보', text: '감찰청, 카심에게 결정 넘긴 가게 적발… 벌금 150골드', big: true },
      },
      { news: { cat: '소문', text: '두건 쓴 행상 카심 소문, 조용히 잦아들어' } },
    ],
  },
  {
    id: 'kassim_resolution', once: true, priority: 55,
    when: { day: { gte: 30 } },
    outcomes: [
      {
        when: { all: [{ any: [{ var: 'demonlord_power', gte: 38 }, { var: 'invasion_risk', gte: 30 }] }, { flag: 'kassim_told_liga' } ] },
        effects: { vars: { collusion: 3, reputation: 4, rel_kingdom: 2 }, flags: ['kassim_liga_credit'] },
        news: { cat: '속보', text: '감찰청, 카심 밀서 가로채 마왕군 보급선 끊었다', big: true },
      },
      {
        when: { all: [{ any: [{ var: 'demonlord_power', gte: 38 }, { var: 'invasion_risk', gte: 30 }] }, { flag: 'kassim_silent' }, { noFlag: 'kassim_caught' }] },
        effects: { gold: 150, vars: { blackmarket: 5 }, flags: ['kassim_profiteer'] },
        news: { cat: '경제', text: '카심 다녀간 뒤 뒷골목에 묘하게 돈이 돈다' },
      },
      {
        when: { all: [{ any: [{ var: 'demonlord_power', gte: 38 }, { var: 'invasion_risk', gte: 30 }] }, { flag: 'kassim_caught' }] },
        effects: { vars: { reputation: -6 } },
        news: { cat: '속보', text: '카심은 진짜 마왕군 첩자였다… 거래한 가게 다시 도마에', big: true },
      },
      {
        when: { flag: 'kassim_told_liga' },
        effects: { vars: { collusion: -1 } },
        news: { cat: '소문', text: '카심은 그냥 약재상이었다… 감찰청 헛걸음' },
      },
      { news: { cat: '소문', text: '카심 소식은 그 뒤로 끊겼다' } },
    ],
  },

  // ───────── 사건 3: 여관 하녀 리사 (축 A 3택: 돕는다 / 신고한다 / 침묵한다) ─────────
  {
    id: 'wanted_lisa', once: true, priority: 50,
    when: { day: { gte: 15 } },
    effects: { flags: ['wanted_lisa_posted'], schedule: [{ event: 'lisa_arrives', inDays: [3, 5] }] },
    news: { cat: '왕국', text: '[사냥꾼 조합] 창백하고 목 가린 젊은 여자 보면 신고', big: true },
  },
  { id: 'lisa_arrives', trigger: 'scheduled', priority: 50, effects: { spawn: [{ customer: 'lisa_thrall', inDays: 0 }] } },
  { id: 'lisa_hunter_inquiry', trigger: 'scheduled', priority: 50, effects: { spawn: [{ customer: 'hunter_inquiry_lisa', inDays: 0 }] } },
  {
    id: 'liga_tip_lisa', cooldown: 6, priority: 48,
    when: { all: [{ flag: 'liga_member' }, { noFlag: 'liga_failed' }, { flag: 'wanted_lisa_posted' }, { noFlag: 'lisa_tipped' }] },
    effects: { flags: ['lisa_tipped'] },
    news: { cat: '소문', text: '소라껍데기가 속삭였다 — "창백한 하녀 얘기엔 입 다물게."' },
  },
  {
    id: 'lisa_audit', cooldown: 3, priority: 46,
    when: { all: [{ flag: 'lied_about_lisa' }, { noFlag: 'lisa_protected' }, { noFlag: 'lisa_audit_resolved' }, { day: { gte: 18 } }] },
    outcomes: [
      {
        when: { all: [{ flag: 'liga_member' }, { noFlag: 'liga_failed' }, { chance: 0.12 }] },
        effects: { gold: -100, vars: { reputation: -8, rel_hunter: -3 }, flags: ['lisa_caught', 'lisa_audit_resolved'] },
        news: { cat: '사건', text: '리사 일로 거짓 진술한 가게, 사냥꾼 조합에 걸려… 벌금 100골드', big: true },
      },
      {
        when: { all: [{ any: [{ noFlag: 'liga_member' }, { flag: 'liga_failed' }] }, { chance: 0.3 }] },
        effects: { gold: -100, vars: { reputation: -8, rel_hunter: -3 }, flags: ['lisa_caught', 'lisa_audit_resolved'] },
        news: { cat: '사건', text: '리사 일로 거짓 진술한 가게, 사냥꾼 조합에 걸려… 벌금 100골드', big: true },
      },
    ],
  },
  {
    id: 'lisa_epilogue', once: true, priority: 60,
    when: { all: [{ day: { gte: 30 } }, { flag: 'helped_lisa' }, { noFlag: 'reported_lisa' }] },
    outcomes: [
      {
        when: { any: [{ var: 'vampire_power', gte: 30 }, { flag: 'vampire_regent' }] },
        effects: { gold: 200, vars: { rel_vampire: 6 }, flags: ['lisa_vampire_friend'] },
        news: { cat: '사건', text: '밤의 궁정 사자, 리사를 도운 가게에 금화 자루 두고 가', big: true },
      },
      {
        when: { any: [{ flag: 'vampire_court_fell' }, { var: 'vampire_power', lte: 10 }] },
        effects: { vars: { reputation: -5 }, flags: ['lisa_branded'] },
        news: { cat: '사건', text: '밤의 궁정 무너진 뒤 "흡혈귀 하녀 도운 가게" 낙인', big: true },
      },
      { news: { cat: '소문', text: '창백한 하녀 리사, 그 뒤로 보이지 않는다' } },
    ],
  },

  // ════════════════════ 천칭단 — 균형의 수호자 ════════════════════
  // 행상의 질문(customers.js liga_merchant, 12일째~ 선두 세력과 관계 6 이상) → 두건 쓴 거간꾼 → 이튿날 정식 방문 →
  // 밤마다 소라껍데기 (DayManager.rollWhisper) → 세 번째 경고 밤에 누군가 다녀간다
  { id: 'liga_hooded_visit', trigger: 'scheduled', priority: 45, effects: { spawn: [{ customer: 'liga_hooded', inDays: 0 }] } },
  { id: 'liga_formal_visit', trigger: 'scheduled', priority: 45, effects: { spawn: [{ customer: 'liga_envoy', inDays: 0 }] } },
  {
    // 세 번째 경고를 받은 밤 (DayManager.rollWhisper 가 예약) — 누가 왔는지는 말하지 않는다
    id: 'liga_robbery', trigger: 'scheduled', priority: 70,
    effects: { steal: 100, flags: ['liga_shell_lost'] },
    news: { cat: '장부', text: '밤사이 누가 다녀갔다. 금고에서 {stolen}골드, 그리고 소라껍데기가 사라졌다.', big: true },
  },

  // ════════════════════ 위장 감찰 (반복, 8일차~) ════════════════════
  {
    id: 'disguised_inspection', cooldown: 3, chance: 0.12, priority: 45,
    when: { day: { gte: 8 } },
    effects: { spawn: [{ customer: 'disguised_buyer', inDays: 0 }] },
  },
  // ════════════════════ 「밀고자」 길 (config.js mutter 설명) ════════════════════
  // 까마귀 밀고가 세 번 맞고 감찰청 협력도가 8 이상이면 — 감찰청이 이 가게를 "공식 제보처"로 삼는다 (지정한 날 = flag 값)
  {
    id: 'informant_office_named', once: true, priority: 55,
    when: { all: [{ var: 'report_hits', gte: 3 }, { var: 'collusion', gte: 8 }] },
    effects: { flags: ['informant_office'] },
    news: { cat: '왕국', text: "감찰청, 한 무기점을 '공식 제보처'로 지정", big: true },
  },
  // 제보처가 된 뒤로는 담당 감찰관이 이따금 들러 묻는다 — 사실대로 말하면 결말 「밀고자」 쪽으로
  {
    id: 'office_inspector_visit', cooldown: 4, chance: 0.5, priority: 45,
    when: { flag: 'informant_office' },
    effects: { spawn: [{ customer: 'office_inspector', inDays: 0 }] },
  },
  {
    id: 'disguised_audit', trigger: 'scheduled', priority: 46,
    // 적발 확률은 reputation(반비례)·blackmarket(비례) — 조건을 만족할수록 별도의 chance 판정을 하나씩 더 통과해야
    // 하므로, 나쁜 평판·활발한 암시장일수록 실질 적발 확률이 눈에 띄게 누적된다
    outcomes: [
      { when: { all: [{ var: 'reputation', lte: 5 }, { var: 'blackmarket', gte: 20 }, { chance: 0.55 }] },
        effects: { gold: -150, vars: { reputation: -8 }, flags: ['disguised_caught'] },
        news: { cat: '속보', text: '서류 없이 판 손님은 위장 감찰관… 벌금 150골드', big: true } },
      { when: { all: [{ var: 'reputation', lte: 10 }, { chance: 0.4 }] },
        effects: { gold: -100, vars: { reputation: -6 }, flags: ['disguised_caught'] },
        news: { cat: '왕국', text: '서류 없이 판 거래 적발, 벌금 100골드… 평판 나쁜 가게부터' } },
      { when: { all: [{ var: 'blackmarket', gte: 20 }, { chance: 0.35 }] },
        effects: { gold: -100, vars: { reputation: -6 }, flags: ['disguised_caught'] },
        news: { cat: '왕국', text: '암시장 추적하던 감찰청, 서류 없는 거래 적발… 벌금 100골드' } },
      { when: { all: [{ var: 'reputation', lte: 20 }, { chance: 0.25 }] },
        effects: { gold: -80, vars: { reputation: -4 }, flags: ['disguised_caught'] },
        news: { cat: '왕국', text: '감찰청 순찰, 서류 없는 거래 적발… 벌금 80골드' } },
      { when: { chance: 0.1 },
        effects: { gold: -60, vars: { reputation: -3 }, flags: ['disguised_caught'] },
        news: { cat: '왕국', text: '평판 좋은 가게도 무작위 감사에… 벌금 60골드' } },
      { news: { cat: '생활', text: '"서류 없이 급하다"던 손님 일은 조용히 묻혔다' } },
    ],
  },

  // ════════════════════ 3막·4막 ════════════════════
  {
    id: 'act3_begins', once: true, priority: 70,
    when: { day: { gte: 23 } },
    effects: { flags: ['act3_start'], vars: { border_tension: 3, invasion_risk: 3, demonlord_power: 2, bandit_power: 2 } },
    news: [
      { cat: '속보', text: '3막: 대륙 곳곳 긴장 치솟아… 국경이 술렁인다', big: true },
      { cat: '왕국', text: '왕실 상무청, 통상령에 새 조항 무더기… "전시 수준 통제"' },
      { cat: '사건', text: '거리마다 위장 순찰 늘어… 서로 믿지 못하는 계절' },
    ],
  },
  {
    id: 'act4_rival_visit', once: true, priority: 75,
    when: { day: { gte: 33 } },
    outcomes: [
      {
        when: { all: [{ cmp: ['goblin_power', '>', 'kingdom_power'] }, { cmp: ['goblin_power', '>', 'demonlord_power'] }] },
        effects: { flags: ['act4_goblin_kingdom'], spawn: [{ customer: 'envoy_goblin_final', inDays: 0 }, { customer: 'envoy_kingdom_final', inDays: 0 }], schedule: [{ event: 'act4_showdown_result', inDays: 1 }] },
        news: { cat: '속보', text: '4막: 고블린 특사와 왕국 특사가 같은 날 찾아온다', big: true },
      },
      {
        when: { cmp: ['demonlord_power', '>', 'kingdom_power'] },
        effects: { flags: ['act4_demonlord_kingdom'], spawn: [{ customer: 'envoy_demonlord_final', inDays: 0 }, { customer: 'envoy_kingdom_final', inDays: 0 }], schedule: [{ event: 'act4_showdown_result', inDays: 1 }] },
        news: { cat: '속보', text: '4막: 마왕군 전령과 왕국 특사가 같은 날 찾아온다', big: true },
      },
      {
        effects: { flags: ['act4_goblin_kingdom'], spawn: [{ customer: 'envoy_goblin_final', inDays: 0 }, { customer: 'envoy_kingdom_final', inDays: 0 }], schedule: [{ event: 'act4_showdown_result', inDays: 1 }] },
        news: { cat: '속보', text: '4막: 서로 다른 깃발의 두 사절이 같은 날 찾아온다', big: true },
      },
    ],
  },
  {
    id: 'act4_showdown_result', trigger: 'scheduled', priority: 75,
    outcomes: [
      { when: { all: [{ flag: 'act4_goblin_kingdom' }, { flag: 'helped_goblin_final' }, { noFlag: 'helped_kingdom_final' }] },
        effects: { vars: { goblin_power: 6, kingdom_power: -4, border_tension: 5 }, flags: ['act4_goblin_wins_showdown'] },
        news: { cat: '속보', text: '고블린 특사, 웃으며 돌아갔다… 왕국 사절은 굳은 얼굴', big: true } },
      { when: { all: [{ flag: 'act4_goblin_kingdom' }, { flag: 'helped_kingdom_final' }, { noFlag: 'helped_goblin_final' }] },
        effects: { vars: { kingdom_power: 6, goblin_power: -4, border_tension: -3 }, flags: ['act4_kingdom_wins_showdown'] },
        news: { cat: '속보', text: '왕국 특사, 칼을 받아 들고 돌아갔다… 고블린 사절은 빈손', big: true } },
      { when: { all: [{ flag: 'act4_goblin_kingdom' }, { flag: 'helped_goblin_final' }, { flag: 'helped_kingdom_final' }] },
        effects: { vars: { reputation: -5, rel_goblin: -2, rel_kingdom: -2, collusion: -2 }, flags: ['act4_double_dealt'] },
        news: { cat: '사건', text: '두 특사 모두에게 칼을 판 가게… 이제 누구도 안 믿는다', big: true } },
      { when: { all: [{ flag: 'act4_demonlord_kingdom' }, { flag: 'helped_demonlord_final' }, { noFlag: 'helped_kingdom_final' }] },
        effects: { vars: { demonlord_power: 8, invasion_risk: 6, kingdom_power: -4 }, flags: ['act4_demonlord_wins_showdown'] },
        news: { cat: '속보', text: '마왕군 전령, 칼을 받아 들고 흡족히 돌아가', big: true } },
      { when: { all: [{ flag: 'act4_demonlord_kingdom' }, { flag: 'helped_kingdom_final' }, { noFlag: 'helped_demonlord_final' }] },
        effects: { vars: { kingdom_power: 6, demonlord_power: -6, invasion_risk: -5 }, flags: ['act4_kingdom_repels_showdown'] },
        news: { cat: '속보', text: '왕국 기사단, 마왕군 전령을 빈손으로 돌려보냈다', big: true } },
      { when: { all: [{ flag: 'act4_demonlord_kingdom' }, { flag: 'helped_demonlord_final' }, { flag: 'helped_kingdom_final' }] },
        effects: { vars: { reputation: -6, collusion: -3 }, flags: ['act4_double_dealt'] },
        news: { cat: '사건', text: '왕국과 마왕군 양쪽에 칼을 댄 가게, 소문 퍼져', big: true } },
      { effects: { vars: { reputation: 2, rel_kingdom: -1 }, flags: ['act4_opportunist'] },
        news: { cat: '소문', text: '두 특사 누구 편도 안 든 가게… 실망했지만 원한은 없다' } },
    ],
  },

  {
    // 별조각을 받은 대성당이 사흘 밤낮 기도했다 → 하늘이 대답한다 (엔딩 star_guests)
    id: 'star_answer', trigger: 'scheduled', priority: 45,
    effects: { flags: ['star_answered'], vars: { undead_power: -12, monster_pop: -6, kingdom_morale: 6, church_authority: 4 } },
    news: { cat: '속보', text: '대성당 기도 사흘째 밤, 하늘에서 따뜻한 비… 상처가 아물었다', big: true },
  },
  {
    // 강철수염 공방에 보냈다 → 별쇠. 한동안 무기 도매가가 싸진다 (config costMods)
    id: 'star_to_dwarf', trigger: 'scheduled', priority: 45,
    effects: { flags: ['star_iron'], vars: { dwarf_tech: 5, iron_price: -20 }, give: { iron_ore: 10 } },
    news: { cat: '드워프', text: '강철수염 공방, 별에서 떨어진 쇠로 칼 벼려… "이런 쇠는 처음"', big: true },
  },
  {
    // 은빛 탑에 보냈다 → 마법사들의 연구
    id: 'star_to_tower', trigger: 'scheduled', priority: 45,
    effects: { flags: ['star_tower'], vars: { arcane_power: 6, rel_mage: 3 } },
    news: { cat: '생활', text: '은빛 탑 꼭대기에서 밤새 별빛… 마법사들 "조각 하나로 충분했다"' },
  },

  // ───────── 맡긴 보석 (customers.js obel_*) ─────────
  {
    id: 'obel_complaint', trigger: 'scheduled', priority: 50,
    outcomes: [
      {
        when: { flag: 'gave_gems_to_thief' },
        effects: { gold: -40, vars: { reputation: -2, rel_kingdom: -1 } },
        news: { cat: '사건', text: '오벨 보석 "쥐수염" 손에… 심부름꾼에 내준 가게 벌금 40골드', big: true },
      },
      {
        effects: { gold: -80, vars: { reputation: -2 } },
        news: { cat: '사건', text: '보석상 오벨 "맡긴 보석 떼였다" 고발… 가게에 벌금 80골드', big: true },
      },
    ],
  },

  // ───────── 감정 확대경: 밀랍 인장 대조 (customers.js 의 docCheck 손님들) ─────────
  {
    id: 'forged_seal_rumor', once: true, priority: 40,
    when: { all: [{ day: { gte: 5 } }, { any: [{ var: 'blackmarket', gte: 12 }, { day: { gte: 8 } }] }] },
    effects: { spawn: [{ customer: 'permit_dubious', inDays: 0 }, { customer: 'militia_forager', inDays: 1 }] },
    news: { cat: '소문', text: '위조 통행 인장 나돈다… "확대경으로 문장을 비춰 보라"' },
  },
  {
    id: 'royal_courier_visit', once: true, priority: 40,
    when: { var: 'rel_kingdom', gte: 4 },
    effects: { spawn: [{ customer: 'noble_courier', inDays: 1 }] },
    news: { cat: '왕국', text: '왕실 전령, 믿을 만한 가게 골라 급한 전갈 맡긴다' },
  },
  {
    id: 'forged_permit_fallout', trigger: 'scheduled', priority: 55,
    outcomes: [
      {
        when: { var: 'blackmarket', gte: 18 },
        effects: { vars: { blackmarket: 6, reputation: -4, rel_kingdom: -3 }, flags: ['forged_permit_ring'] },
        news: { cat: '사건', text: '위조 인장 든 자들 잇따라 적발… 한 가게가 통로였다', big: true },
      },
      {
        effects: { vars: { reputation: -2 }, gold: -30 },
        news: { cat: '왕국', text: '위조 인장 받아 준 가게에 경고… 벌금 30골드' },
      },
    ],
  },
  {
    id: 'militia_forger_fallout', trigger: 'scheduled', priority: 50,
    outcomes: [
      {
        when: { var: 'collusion', gte: 10 },
        effects: { vars: { rel_kingdom: 2, rel_village: -3, bandit_power: 3 } },
        news: { cat: '왕국', text: '"자경단" 사칭해 방패 빼돌린 도적 추적 중… "가게 협조 덕"', big: true },
      },
      {
        effects: { vars: { rel_village: -5, bandit_power: 4 }, flags: ['village_betrayed_by_forger'] },
        news: { cat: '마을', text: '"자경단원"이라며 방패 사 간 자, 알고 보니 도적', big: true },
      },
    ],
  },
  // ════════════════════ 달력 이벤트 (js/data/shop.js calendar · js/systems/Shop.js) ════════════════════
  // calendar: 그날 시작하는 일정 (장날 8·16·24·32일 / 열병식 12·30일 사흘 / 수확제 20일 이틀 / 전염병 · 재난은 판당 한 번 미리 굴린 날).
  // 달력을 샀든 안 샀든 그날엔 일어난다 — 달력은 미리 보여 줄 뿐. 하룻밤 사건 수 제한에 들지 않는다 (EventManager.runDawn)
  {
    // 장날: 마을·상인 손님이 2~3명 더 오고 그날은 소문이 시세를 흔들지 않는다 (Market.mult → Calendar.calm)
    id: 'cal_fair', calendar: 'fair', priority: 100,
    effects: { crowd: { n: [2, 3], fac: ['village', 'guild', 'traveler'] } },
    news: { cat: '행사', text: '오늘은 장날 — 읍내 골목마다 사람이 넘친다. 시세도 잠잠하다', big: true },
  },
  {
    // 왕실 열병식: 사흘간 칼 · 방어구 시세 ×1.1, 왕국 손님이 하루 한 명 더
    id: 'cal_parade', calendar: 'parade', priority: 100,
    effects: { crowd: { n: 1, days: 3, fac: ['kingdom'] }, market: { mult: 1.1, days: 3, match: { category: ['weapon', 'armor'] } } },
    news: { cat: '행사', text: '왕실 열병식 사흘 — 기사단 행진에 도시가 들썩, 칼과 방어구를 찾는 손이 늘었다', big: true },
  },
  {
    // 수확제: 마을 손님이 더 오고 물약 · 향신료 시세 ×1.15
    id: 'cal_harvest', calendar: 'harvest', priority: 100,
    effects: { crowd: { n: [1, 2], days: 2, fac: ['village'] }, market: { mult: 1.15, days: 2, match: { newCategory: ['potion'], items: ['eastern_spice'] } } },
    news: { cat: '행사', text: '수확제 이틀 — 마을 잔칫상에 물약과 향신료가 불티나게 팔린다', big: true },
  },
  {
    // 전염병: 며칠 동안 물약 · 성수 시세 ×1.4, 손님이 준다. 끝나면 신문 (cal_plague_end)
    id: 'cal_plague', calendar: 'plague', priority: 100,
    effects: { crowd: { n: [-2, -1], days: WS.data.shop.calendar.plague.days - 1 }, market: { mult: WS.data.shop.calendar.plague.mult, days: WS.data.shop.calendar.plague.days, match: { newCategory: ['potion'] } },
      schedule: [{ event: 'cal_plague_end', inDays: WS.data.shop.calendar.plague.days }] },
    news: { cat: '사건', text: '역병 번져 — 거리가 한산하다. 물약과 성수 값이 치솟는다', big: true },
  },
  {
    id: 'cal_plague_end', trigger: 'scheduled', priority: 100,
    news: { cat: '사건', text: '역병 잦아들어 — 거리에 사람이 돌아오고 물약 값도 내려앉는다' },
  },
  {
    // 화재 · 홍수: 창고 재고 5~10%가 상한다 — 기사와 보험 편지는 Calendar.strike 가 만든다
    id: 'cal_disaster', calendar: 'disaster', priority: 100,
    effects: { disaster: true },
  },
];

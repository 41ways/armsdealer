// 아이템 데이터베이스.
// stack: (예전 '한 칸에 들어가는 수량') — 이제는 부피 = 24 ÷ stack 으로 쓴다. 1개가 차지하는 부피가 클수록 창고가 빨리 찬다 (stack 1 은 stack 4 의 4배) / impact: 판매 1개당 세계 영향 배율
// market: 시세 민감도 (iron = 철 가격 지수, war = 국경 긴장/전쟁, monster = 몬스터 개체수, demon = 안개의 짙기(demon_influence))
// supplyWhen: 도매상에 입고되는 조건 (조건 DSL). false 면 도매상에 나오지 않는다 (스토리/교환 전용)
// category: weapon / armor / material / consumable / curio(진귀품 — 안개 상단이 들고 오는 물건)
//
// ── 신규 분류 체계 (Phase 1 추가) ──────────────────────────────────────────
// newCategory / subtype: js/data/categories.js 의 6대분류(무기/방어구/물약/재료/보석/특별아이템) 참조.
// 기존 category(위 주석)와는 별개 필드다 — 세계 영향(perUnit)·구세대 로직은 category를 계속 쓴다.
// special: true 면 그 subtype 안에서 "평범한 대표 아이템"이 아니라 확장/롱프레스로만 드러나는
// 특수 변형(은검/드워프 강철검처럼 이름 있는 희귀 변종)이라는 표시. 평범한 대표 아이템은 표시 없음.
//
// ── 단순화 (물건 종류만 다룬다) ──────────────────────────────────────────
// aliasOf: 이 id 는 플레이어에게 보이지 않는 "옛 이름"이다. 재고·손님 요청·도매·편지 경계에서
//   WS.sys.Items.canon(id) 로 대표 종류(칼/활…)로 바뀐다. 옛 스토리 데이터가 그대로 돌아가게 남겨 둔 것.
// shelf: 창고의 어느 자리에 두는가 — weapon(무기 거치대) / defense(방어구 선반) / potion(물약 선반) /
//   ore(나무 궤짝: 광석·금속·결정) / goods(자루: 가죽·약재·가루·향신료) / gem(보석함) / special(잠긴 궤짝).
//   자리마다 (별칭 제외) 8종 이하 — 창고 UI 가 3×3 칸(9번째는 "뒤로")으로 보여 준다. 보석함은 9종까지.
//   어느 자리가 열려 있는지는 WS.sys.Progress (js/data/progress.js 의 날짜별 해금표).
WS.data.items = {
  iron_sword: {
    name: '칼', icon: '🗡️', category: 'weapon', tags: ['weapon', 'blade', 'iron'],
    newCategory: 'weapon', subtype: 'sword', shelf: 'weapon',
    basePrice: 50, cost: 30, attack: 12, rarity: '일반', weight: 3, stack: 4, grid: [1, 3], impact: 1, danger: 2,
    affinity: { 인간: '보통', 고블린: '보통', 언데드: '약함', 오우거: '약함' },
    craftable: true, storyTags: [], market: { iron: 0.6, war: 0.8 },
    desc: '어디서나 볼 수 있는 표준 철검. 누구 손에 들리느냐가 문제다.',
  },
  bow: {
    name: '활', icon: '🏹', category: 'weapon', tags: ['weapon', 'ranged', 'wood'],
    newCategory: 'weapon', subtype: 'arrow', shelf: 'weapon',
    basePrice: 40, cost: 24, attack: 9, rarity: '일반', weight: 1, stack: 6, grid: [1, 3], impact: 0.8, danger: 2,
    affinity: { 인간: '보통', 고블린: '강함(숲)', 오우거: '보통' },
    craftable: true, storyTags: [], market: { war: 0.5, monster: 0.4 },
    desc: '사냥에도, 매복에도 쓰인다. 숲에서 특히 무섭다.',
  },
  shield: {
    name: '방패', icon: '🛡️', category: 'armor', tags: ['armor', 'wood', 'iron'],
    newCategory: 'defense', subtype: 'shield', shelf: 'defense',
    basePrice: 32, cost: 19, attack: 0, defense: 10, rarity: '일반', weight: 4, stack: 3, grid: [2, 2], impact: 0.7, danger: 1,
    affinity: { 오우거: '강함' },
    craftable: true, storyTags: [], market: { iron: 0.3, war: 0.6, monster: 0.3 },
    desc: '막는 것은 죄가 아니다… 아마도.',
  },
  iron_ore: {
    name: '철광석', icon: '⛏️', category: 'material', tags: ['material', 'iron'],
    newCategory: 'material', subtype: 'iron_ore', shelf: 'ore',
    basePrice: 6, cost: 4, attack: 0, rarity: '일반', weight: 5, stack: 12, grid: [1, 1], impact: 1, danger: 0,
    affinity: {}, craftable: false, storyTags: [], market: { iron: 1.0 },
    // 강철수염 산채가 철광석을 쓸어 가는 나흘(events.js ore_run_begins ~ ore_run_ends)은 도매상에 나오지 않는다 — 전령이 오기 전에 미리 쟁여 둔 사람만 20개를 낼 수 있다
    supplyWhen: { noFlag: 'ore_shortage' },
    desc: '마진은 박하고 자리만 차지한다. 하지만 모든 칼은 여기서 시작된다.',
  },
  potion: {
    name: '회복 물약', icon: '🧪', category: 'consumable', tags: ['consumable', 'alchemy'],
    newCategory: 'potion', subtype: 'hp_potion', shelf: 'potion',
    basePrice: 20, cost: 11, attack: 0, rarity: '일반', weight: 0.5, stack: 12, grid: [1, 1], impact: 1, danger: 0,
    affinity: {}, craftable: true, storyTags: [], market: { war: 0.6, monster: 0.5 },
    desc: '다친 자를 살린다. 다친 자가 누구든.',
  },
  red_blade: {
    name: '붉은 칼날', icon: '🔪', category: 'weapon', tags: ['weapon', 'blade', 'iron', 'goblin_fashion'],
    newCategory: 'weapon', subtype: 'sword', special: true, shelf: 'weapon', aliasOf: 'iron_sword',
    basePrice: 70, cost: 42, attack: 14, rarity: '고급', weight: 3, stack: 4, grid: [1, 3], impact: 1.2, danger: 3,
    affinity: { 인간: '보통', 고블린: '사기 진작' },
    craftable: true, storyTags: ['goblin_trend'], market: { iron: 0.5, war: 0.6 },
    supplyWhen: { day: { gte: 2 } },
    desc: '칼날에 붉은 옻칠을 했다. 성능보다 "멋"이 중요한 자들이 찾는다.',
  },
  dwarf_steel_sword: {
    name: '드워프 강철검', icon: '⚔️', category: 'weapon', tags: ['weapon', 'blade', 'steel', 'dwarf_made'],
    newCategory: 'weapon', subtype: 'sword', special: true, shelf: 'weapon', aliasOf: 'iron_sword',
    basePrice: 130, cost: 78, attack: 24, rarity: '희귀', weight: 3, stack: 3, grid: [1, 3], impact: 2, danger: 4,
    affinity: { 인간: '강함', 고블린: '강함', 오우거: '보통' },
    craftable: true, storyTags: ['dwarf_tech'], market: { iron: 0.4, war: 0.9 },
    supplyWhen: { flag: 'dwarf_steel_unlocked' },
    desc: '드워프의 신형 합금. 철검 두 자루 몫을 한다. 전장의 균형을 바꿀 수 있다.',
  },

  // ───────── 안개 상단 / 마왕군 관련 ─────────
  mana_crystal: {
    name: '마력 결정', icon: '🔮', category: 'material', tags: ['material', 'magic'],
    newCategory: 'material', subtype: 'mana_crystal', shelf: 'ore',
    basePrice: 45, cost: 28, attack: 0, rarity: '고급', weight: 1, stack: 6, grid: [1, 1], impact: 1, danger: 2,
    affinity: { '안개 상인': '먹이', 마법사: '촉매' },
    craftable: false, storyTags: ['demon'], market: { demon: 0.9, war: 0.2 },
    supplyWhen: { day: { gte: 3 } },
    desc: '보랏빛으로 맥동하는 결정. 마법사는 촉매로 쓰고, 안개 상단은… 삼킨다는 소문이 있다.',
  },
  silver_sword: {
    name: '은검', icon: '🗡️', category: 'weapon', tags: ['weapon', 'blade', 'silver', 'holy'],
    newCategory: 'weapon', subtype: 'sword', special: true, shelf: 'weapon', aliasOf: 'iron_sword',
    basePrice: 110, cost: 66, attack: 16, rarity: '고급', weight: 3, stack: 3, grid: [1, 3], impact: 1.3, danger: 3,
    affinity: { 인간: '보통', '안개 상인': '강함', 언데드: '매우 강함', 고블린: '보통' },
    craftable: true, storyTags: ['anti_demon'], market: { demon: 0.8, war: 0.3 },
    supplyWhen: { any: [{ day: { gte: 5 } }, { var: 'demon_influence', gte: 12 }] },
    desc: '성수로 담금질한 은 칼날. 사람을 베기엔 아깝고, 사람 아닌 것들을 베기엔 이만한 게 없다.',
  },
  cursed_ring: {
    name: '저주받은 반지', icon: '💍', category: 'curio', tags: ['curio', 'cursed', 'magic'],
    // 딱 맞는 소분류가 없는 진귀품 — "정령석"(마력이 깃든 물건) 쪽에 가장 가깝다고 보고 묶었다.
    newCategory: 'material', subtype: 'spirit_stone', special: true, shelf: 'special',
    basePrice: 60, cost: 40, attack: 0, rarity: '희귀', weight: 0.1, stack: 1, grid: [1, 1], impact: 3, danger: 5,
    affinity: { '안개 상인': '???', 마왕군: '인장?' },
    craftable: false, storyTags: ['cursed_ring'], market: { demon: 1.5 },
    supplyWhen: false,
    desc: '검게 식은 금반지. 안쪽에 읽을 수 없는 글자가 새겨져 있다. 밤이 되면 조금 따뜻해진다.',
  },
  abyss_pearl: {
    name: '심연 진주', icon: '⚫', category: 'curio', tags: ['curio', 'magic'],
    newCategory: 'gem', subtype: 'pearl', special: true, shelf: 'gem',
    basePrice: 140, cost: 85, attack: 0, rarity: '희귀', weight: 0.2, stack: 3, grid: [1, 1], impact: 1.5, danger: 3,
    affinity: { '안개 상인': '화폐', 마법사: '연구 재료' },
    craftable: false, storyTags: ['demon'], market: { demon: 0.6 },
    supplyWhen: false,
    desc: '빛을 빨아들이는 검은 진주. 안개 상단 사이에선 금화보다 흔히 쓰이는 "잔돈"이라고 한다.',
  },

  // ───────── 확장 세력 관련 ─────────
  // market 에 세계 변수 이름을 쓰면 그 변수가 초기값보다 오른 만큼 시세가 움직인다 (Market.mult)
  holy_water: {
    name: '성수', icon: '🫗', category: 'consumable', tags: ['consumable', 'holy'],
    // 해독/정화 성격이 가장 가까워 해독제 소분류의 대표 아이템으로 묶었다.
    newCategory: 'potion', subtype: 'antidote', shelf: 'potion',
    basePrice: 28, cost: 16, attack: 0, rarity: '일반', weight: 0.5, stack: 8, grid: [1, 1], impact: 1, danger: 1,
    affinity: { 언데드: '치명적', 흡혈귀: '화상', '안개 상인': '따가움' },
    craftable: true, storyTags: ['church'], market: { undead_power: 0.8, demon: 0.3 },
    supplyWhen: { day: { gte: 4 } },
    desc: '대성당 샘물에 기도를 세 번 올렸다. 죽은 자에게는 불, 산 자에게는 그냥 물.',
  },
  silver_arrow: {
    name: '은화살 묶음', icon: '🏹', category: 'weapon', tags: ['weapon', 'ranged', 'silver', 'holy'],
    newCategory: 'weapon', subtype: 'arrow', special: true, shelf: 'weapon', aliasOf: 'bow',
    basePrice: 36, cost: 22, attack: 8, rarity: '고급', weight: 1, stack: 12, grid: [1, 2], impact: 0.6, danger: 2,
    affinity: { 흡혈귀: '매우 강함', 언데드: '강함', 인간: '보통' },
    craftable: true, storyTags: ['hunt'], market: { vampire_power: 0.9, monster: 0.3 },
    supplyWhen: { day: { gte: 4 } },
    desc: '촉에 은을 입힌 화살 열두 대. 밤에 사냥하는 사람들이 산다. 무엇을 사냥하는지는 말하지 않는다.',
  },
  sun_charm: {
    name: '태양 부적', icon: '☀️', category: 'curio', tags: ['curio', 'holy'],
    newCategory: 'material', subtype: 'spirit_stone', special: true, shelf: 'gem',
    basePrice: 55, cost: 32, attack: 0, rarity: '고급', weight: 0.1, stack: 4, grid: [1, 1], impact: 1, danger: 1,
    affinity: { 흡혈귀: '접근 불가' },
    craftable: true, storyTags: ['anti_vampire'], market: { vampire_power: 1.0 },
    supplyWhen: { any: [{ flag: 'vampire_known' }, { day: { gte: 9 } }] },
    desc: '정오의 햇빛을 가둔 호박 부적. 목에 걸면 초대받지 않은 손님이 문턱을 못 넘는다고.',
  },
  bone_dust: {
    name: '뼛가루', icon: '🦴', category: 'material', tags: ['material', 'necro'],
    // 생물에서 나온 가공 재료라는 점에서 "가죽" 소분류에 가장 가깝게 묶었다 (다소 억지스러운 대응).
    newCategory: 'material', subtype: 'leather', special: true, shelf: 'goods',
    basePrice: 18, cost: 10, attack: 0, rarity: '일반', weight: 0.5, stack: 12, grid: [1, 1], impact: 1, danger: 3,
    affinity: { 언데드: '몸', 연금술사: '시약' },
    craftable: false, storyTags: ['undead'], market: { undead_power: 0.9 },
    supplyWhen: false,
    desc: '곱게 빻은 뼈. 누구의 것인지는 적혀 있지 않다. 연금술사는 시약으로, 사령술사는… 재료로 쓴다.',
  },
  dragon_scale: {
    name: '용비늘', icon: '🐉', category: 'material', tags: ['material', 'magic', 'legendary'],
    newCategory: 'material', subtype: 'dragon_scale', shelf: 'goods',
    basePrice: 260, cost: 160, attack: 0, defense: 30, rarity: '전설', weight: 2, stack: 2, grid: [2, 2], impact: 2, danger: 3,
    affinity: { 마법사: '최고의 촉매', 드워프: '갑옷 재료', 용: '치욕' },
    craftable: false, storyTags: ['dragon'], market: { dragon_stir: 0.5 },
    supplyWhen: false,
    desc: '방패만 한 붉은 비늘. 아직 따뜻하다. 어떤 용에게서 떨어졌는지에 따라 축복도, 선전포고도 된다.',
  },
  black_powder: {
    name: '흑색 화약', icon: '💥', category: 'material', tags: ['material', 'powder', 'alchemy'],
    // 딱 맞는 소분류가 없다 — 연금 계열 재료로 보고 정령석에 묶었다 (다소 억지스러운 대응).
    newCategory: 'material', subtype: 'spirit_stone', special: true, shelf: 'goods',
    basePrice: 60, cost: 34, attack: 0, rarity: '희귀', weight: 1, stack: 6, grid: [1, 1], impact: 2, danger: 5,
    affinity: { 용: '비늘을 뚫는다', 성벽: '무너진다', 기사: '시대의 끝' },
    craftable: true, storyTags: ['new_era'], market: { war: 0.8 },
    // 도매상은 독점 판매상(케셀과 계약한 가게)에게만 넘긴다 — 값도 "케셀 몫"으로 싸게 (config.js costMods)
    supplyWhen: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] },
    desc: '연금술사들이 실수로 만든 검은 가루. 불을 붙이면 칼 백 자루보다 시끄럽다. 세상이 바뀌는 소리일지도.',
  },
  alchemy_reagent: {
    name: '연금 시약', icon: '⚗️', category: 'material', tags: ['material', 'alchemy'],
    newCategory: 'material', subtype: 'spirit_stone', special: true, shelf: 'goods',
    basePrice: 22, cost: 13, attack: 0, rarity: '일반', weight: 0.5, stack: 8, grid: [1, 1], impact: 1, danger: 2,
    affinity: { 연금술사: '필수품' },
    craftable: false, storyTags: [], market: { alchemy_progress: 0.6 },
    supplyWhen: { day: { gte: 3 } },
    desc: '유황, 수은, 이름 모를 초록 가루가 든 상자. 흔들지 말 것. 절대로.',
  },
  golem_core: {
    name: '골렘 핵', icon: '⚙️', category: 'material', tags: ['material', 'magic', 'golem'],
    // 마력 결정을 심장으로 삼은 물건 — 마력결정 소분류의 특수 변형으로 묶었다.
    newCategory: 'material', subtype: 'mana_crystal', special: true, shelf: 'ore',
    basePrice: 180, cost: 110, attack: 0, rarity: '희귀', weight: 3, stack: 2, grid: [2, 2], impact: 2.5, danger: 4,
    affinity: { 골렘: '심장', 마법사: '연구 대상' },
    craftable: true, storyTags: ['golem'], market: { golem_tech: 1.0 },
    supplyWhen: { flag: 'golem_workshop' },
    desc: '청동 톱니 안에 마력 결정이 박혀 맥박처럼 째깍거린다. 이것 하나로 병사 열 명이 필요 없어진다.',
  },
  sea_pearl: {
    name: '남해 진주', icon: '🦪', category: 'curio', tags: ['curio', 'treasure'],
    newCategory: 'gem', subtype: 'pearl', special: true, shelf: 'gem', aliasOf: 'pearl',
    basePrice: 90, cost: 55, attack: 0, rarity: '고급', weight: 0.1, stack: 6, grid: [1, 1], impact: 1, danger: 0,
    affinity: { 해적: '화폐', 용: '보물' },
    craftable: false, storyTags: ['pirate'], market: { pirate_power: -0.5 },
    supplyWhen: false,
    desc: '분홍빛이 도는 굵은 진주. 해적들은 금화 대신 이걸 던지고 간다. 어느 배에서 나온 것인지는 묻지 말 것.',
  },
  fairy_dust: {
    name: '요정 가루', icon: '✨', category: 'material', tags: ['material', 'magic', 'fey'],
    newCategory: 'material', subtype: 'spirit_stone', special: true, shelf: 'goods',
    basePrice: 40, cost: 24, attack: 0, rarity: '고급', weight: 0.1, stack: 8, grid: [1, 1], impact: 1, danger: 1,
    affinity: { 마법사: '촉매', 연금술사: '비약 재료' },
    craftable: false, storyTags: ['fairy'], market: { fairy_grace: -0.8 },
    supplyWhen: false,
    desc: '병 속에서 저절로 반짝이는 가루. 숲이 건강할수록 흔하고, 숲이 병들면 귀해진다.',
  },
  war_axe: {
    name: '전투도끼', icon: '🪓', category: 'weapon', tags: ['weapon', 'heavy', 'iron'],
    newCategory: 'weapon', subtype: 'axe', shelf: 'weapon',
    basePrice: 65, cost: 38, attack: 18, rarity: '일반', weight: 5, stack: 3, grid: [1, 3], impact: 1.3, danger: 3,
    affinity: { 오크: '신성한 무기', 오우거: '장난감', 인간: '무거움' },
    craftable: true, storyTags: ['warband'], market: { iron: 0.5, war: 0.7 },
    supplyWhen: { day: { gte: 4 } },
    desc: '양날 도끼. 방패를 쪼개는 물건이다. 산맥의 전사들은 이걸 들어야 어른 대접을 받는다.',
  },
  crossbow: {
    name: '석궁', icon: '🎯', category: 'weapon', tags: ['weapon', 'ranged', 'iron'],
    newCategory: 'weapon', subtype: 'arrow', special: true, shelf: 'weapon', aliasOf: 'bow',
    basePrice: 85, cost: 50, attack: 20, rarity: '고급', weight: 4, stack: 3, grid: [2, 2], impact: 1.4, danger: 4,
    affinity: { 기사: '천적', 용: '비늘 틈을 노림', 인간: '훈련 불필요' },
    craftable: true, storyTags: [], market: { war: 0.8, iron: 0.3 },
    supplyWhen: { any: [{ day: { gte: 6 } }, { var: 'merc_strength', gte: 14 }] },
    desc: '농부도 하루면 기사를 쏠 수 있게 된다. 그래서 귀족들이 싫어한다.',
  },
  plate_armor: {
    name: '갑옷', icon: '🦾', category: 'armor', tags: ['armor', 'iron', 'heavy'],
    newCategory: 'defense', subtype: 'armor', shelf: 'defense',
    basePrice: 150, cost: 90, attack: 0, defense: 26, rarity: '고급', weight: 12, stack: 1, grid: [2, 3], impact: 1.8, danger: 2,
    affinity: { 오크: '강함', 귀족: '신분의 상징' },
    craftable: true, storyTags: [], market: { iron: 0.7, war: 0.6 },
    supplyWhen: { day: { gte: 5 } },
    desc: '한 벌에 철검 세 자루 값. 입은 사람은 잘 죽지 않는다. 그래서 전쟁이 길어진다.',
  },
  star_shard: {
    name: '별조각', icon: '🌠', category: 'curio', tags: ['curio', 'magic', 'unknown'],
    newCategory: 'material', subtype: 'star_shard', shelf: 'special',
    basePrice: 200, cost: 120, attack: 0, rarity: '???', weight: 0.3, stack: 3, grid: [1, 1], impact: 1, danger: 4,
    affinity: { 마법사: '해석 불가', '???': '???' },
    craftable: false, storyTags: ['unknown'], market: { star_signal: 1.5 },
    supplyWhen: false,
    desc: '손바닥 위에서 아주 천천히 돈다. 밤하늘의 어느 별과 같은 박자로 깜빡인다.',
  },
  eastern_spice: {
    name: '동방 향신료', icon: '🌶️', category: 'consumable', tags: ['consumable', 'exotic'],
    // 딱 맞는 소분류가 없는 교역품 — 가공 원자재 계열로 보고 가죽에 묶었다 (다소 억지스러운 대응).
    newCategory: 'material', subtype: 'leather', special: true, shelf: 'goods',
    basePrice: 35, cost: 20, attack: 0, rarity: '고급', weight: 0.5, stack: 12, grid: [1, 1], impact: 0.5, danger: 0,
    affinity: { 귀족: '사치품', 흡혈귀: '피 맛을 가림' },
    craftable: false, storyTags: [], market: { trade_routes: -1.0 },
    // 도매상에서도 살 수 있다 (6일째부터) — 사서 귀족·길드·해적·나그네에게 팔 수 있다. 교환 카드로도 들어온다
    supplyWhen: { day: { gte: 6 } },
    desc: '먼 사막 너머에서 낙타 세 마리를 갈아타고 왔다. 길이 끊기면 값이 뛴다.',
  },

  // ═══════════ Phase 1 신규 아이템 — 빈 소분류를 채운다 ═══════════
  iron_spear: {
    name: '창', icon: '🔱', category: 'weapon', tags: ['weapon', 'polearm', 'iron'],
    newCategory: 'weapon', subtype: 'spear', shelf: 'weapon',
    basePrice: 55, cost: 33, attack: 14, rarity: '일반', weight: 4, stack: 3, grid: [1, 3], impact: 1, danger: 2,
    affinity: { 오크: '대형 전술', 오우거: '거리 유지' },
    craftable: true, storyTags: [], market: { iron: 0.5, war: 0.7 },
    supplyWhen: { day: { gte: 1 } },
    desc: '긴 자루 끝의 쇳조각 하나. 대열을 짜면 벽이 되고, 혼자면 그저 막대기다.',
  },
  iron_helmet: {
    name: '투구', icon: '⛑️', category: 'armor', tags: ['armor', 'iron'],
    newCategory: 'defense', subtype: 'helmet', shelf: 'defense',
    basePrice: 40, cost: 24, attack: 0, defense: 12, rarity: '일반', weight: 2, stack: 3, grid: [1, 1], impact: 0.8, danger: 1,
    affinity: { 인간: '보통', 오크: '보통' },
    craftable: true, storyTags: [], market: { iron: 0.4, war: 0.5 },
    supplyWhen: { day: { gte: 1 } },
    desc: '머리 하나는 지켜 준다. 값도, 무게도 그만큼만 요구한다.',
  },
  mana_potion: {
    name: '마나 물약', icon: '💧', category: 'consumable', tags: ['consumable', 'alchemy', 'magic'],
    newCategory: 'potion', subtype: 'mp_potion', shelf: 'potion',
    basePrice: 24, cost: 14, attack: 0, rarity: '일반', weight: 0.5, stack: 12, grid: [1, 1], impact: 1, danger: 0,
    affinity: { 마법사: '필수품' },
    craftable: true, storyTags: [], market: { war: 0.2 },
    supplyWhen: { day: { gte: 3 } },
    desc: '파랗게 빛나는 물약. 마시면 머릿속이 잠깐 맑아진다는, 마법사들 사이의 정설.',
  },
  poison_vial: {
    name: '독병', icon: '☠️', category: 'consumable', tags: ['consumable', 'alchemy', 'illicit'],
    newCategory: 'potion', subtype: 'poison', shelf: 'potion',
    basePrice: 18, cost: 9, attack: 0, rarity: '일반', weight: 0.3, stack: 8, grid: [1, 1], impact: 1, danger: 4,
    affinity: { 암살자: '도구', 사냥꾼: '화살촉에' },
    craftable: true, storyTags: [], market: { blackmarket: 0.4 },
    supplyWhen: false,
    desc: '누구에게 팔았는지는, 팔고 나면 상관없는 일이 된다. 값은 박하지만 사려는 눈빛은 늘 진지하다.',
  },
  transform_potion: {
    name: '변신 물약', icon: '🧬', category: 'consumable', tags: ['consumable', 'alchemy', 'novelty'],
    newCategory: 'potion', subtype: 'transform_potion', shelf: 'potion',
    basePrice: 30, cost: 16, attack: 0, rarity: '고급', weight: 0.4, stack: 6, grid: [1, 1], impact: 0.5, danger: 1,
    affinity: { 마법사: '호기심', 요정: '장난' },
    craftable: true, storyTags: [], market: {},
    supplyWhen: { day: { gte: 8 } },
    desc: '마시면 한 시간쯤 다른 모습이 된다고 적혀 있다. 어떤 모습이 될지는… 병에 안 적혀 있다.',
  },
  copper_ore: {
    name: '구리광석', icon: '🟤', category: 'material', tags: ['material', 'copper'],
    newCategory: 'material', subtype: 'copper', shelf: 'ore', aliasOf: 'iron_ore',
    basePrice: 9, cost: 5, attack: 0, rarity: '일반', weight: 4, stack: 12, grid: [1, 1], impact: 1, danger: 0,
    affinity: { 드워프: '합금 재료' },
    craftable: false, storyTags: [], market: { iron: 0.2 },
    supplyWhen: { day: { gte: 1 } },
    desc: '철광석보다 무르고, 철광석보다 흔하지 않다. 그래도 늘 조금씩은 팔린다.',
  },
  mithril_ore: {
    name: '미스릴 원석', icon: '💠', category: 'material', tags: ['material', 'legendary', 'dwarf_made'],
    newCategory: 'material', subtype: 'mithril', shelf: 'ore',
    basePrice: 320, cost: 200, attack: 0, rarity: '전설', weight: 0.5, stack: 2, grid: [1, 1], impact: 1.5, danger: 2,
    affinity: { 드워프: '최고급 합금', 마법사: '가벼운 촉매' },
    craftable: false, storyTags: ['dwarf_tech'], market: { dwarf_tech: 0.3 },
    supplyWhen: { any: [{ flag: 'dwarf_steel_unlocked' }, { day: { gte: 10 } }] },
    desc: '깃털처럼 가볍고 강철보다 단단하다. 드워프 공방에서도 한 세대에 몇 덩이 나올까 말까.',
  },
  spirit_stone: {
    name: '정령석', icon: '🔷', category: 'material', tags: ['material', 'magic', 'fey'],
    newCategory: 'material', subtype: 'spirit_stone', shelf: 'ore', aliasOf: 'mana_crystal',
    basePrice: 50, cost: 30, attack: 0, rarity: '고급', weight: 0.3, stack: 6, grid: [1, 1], impact: 1, danger: 1,
    affinity: { 요정: '숨결', 마법사: '촉매' },
    craftable: false, storyTags: ['fairy'], market: { fairy_grace: 0.3 },
    supplyWhen: { day: { gte: 4 } },
    desc: '숲의 정령이 깃들었다 빠져나간 자리. 손에 쥐면 아주 잠깐 숲 냄새가 난다.',
  },
  diamond: {
    name: '다이아몬드', icon: '💎', category: 'curio', tags: ['curio', 'gem', 'investment'],
    newCategory: 'gem', subtype: 'diamond', shelf: 'gem',
    basePrice: 420, cost: 260, attack: 0, rarity: '희귀', weight: 0.1, stack: 6, grid: [1, 1], impact: 1, danger: 0,
    affinity: { 귀족: '사치품', 용: '보물' },
    craftable: false, storyTags: [], market: {},
    supplyWhen: { day: { gte: 6 } },
    desc: '값은 세계 정세가 아니라 그날의 기분을 따라 움직인다. 상인들도 정확한 이유는 모른다.',
  },
  ruby: {
    name: '루비', icon: '🔴', category: 'curio', tags: ['curio', 'gem', 'investment'],
    newCategory: 'gem', subtype: 'ruby', shelf: 'gem',
    basePrice: 220, cost: 135, attack: 0, rarity: '고급', weight: 0.1, stack: 6, grid: [1, 1], impact: 1, danger: 0,
    affinity: { 귀족: '사치품' },
    craftable: false, storyTags: [], market: {},
    supplyWhen: { day: { gte: 6 } },
    desc: '핏빛보다 진하다. 값이 오르내리는 걸 지켜보는 것도 일종의 도박이다.',
  },
  sapphire: {
    name: '사파이어', icon: '🔵', category: 'curio', tags: ['curio', 'gem', 'investment'],
    newCategory: 'gem', subtype: 'sapphire', shelf: 'gem',
    basePrice: 200, cost: 125, attack: 0, rarity: '고급', weight: 0.1, stack: 6, grid: [1, 1], impact: 1, danger: 0,
    affinity: { 마법사: '연구자의 취미' },
    craftable: false, storyTags: [], market: {},
    supplyWhen: { day: { gte: 6 } },
    desc: '밤하늘 조각처럼 짙푸르다. 오늘 값이 어제와 다르다고 놀랄 것 없다.',
  },
  emerald: {
    name: '에메랄드', icon: '🟢', category: 'curio', tags: ['curio', 'gem', 'investment'],
    newCategory: 'gem', subtype: 'emerald', shelf: 'gem',
    basePrice: 210, cost: 130, attack: 0, rarity: '고급', weight: 0.1, stack: 6, grid: [1, 1], impact: 1, danger: 0,
    affinity: { 요정: '숲의 색' },
    craftable: false, storyTags: [], market: {},
    supplyWhen: { day: { gte: 6 } },
    desc: '숲처럼 짙은 초록. 요정들도 가끔 흥미롭다는 듯 쳐다본다.',
  },
  pearl: {
    name: '진주', icon: '⚪', category: 'curio', tags: ['curio', 'gem', 'investment'],
    newCategory: 'gem', subtype: 'pearl', shelf: 'gem',
    basePrice: 130, cost: 80, attack: 0, rarity: '고급', weight: 0.1, stack: 6, grid: [1, 1], impact: 1, danger: 0,
    affinity: { 해적: '화폐' },
    craftable: false, storyTags: [], market: {},
    supplyWhen: { day: { gte: 6 } },
    desc: '가장 수수한 보석. 그래도 매일 값이 조금씩 다르게 매겨진다.',
  },
};

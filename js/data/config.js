// 게임 전역 설정과 세계 상태 변수 정의 (데이터)
WS.data.config = {
  title: 'Next!',
  startGold: 300,
  rent: 20,
  // 날짜별 기본 임대료 — 가게가 자리 잡을수록 오른다. 3단계 QA: 10/15/20 은 하루 이문(≈130G)의 1할이라 자연스러운 플레이어는 250판 중 1판만 망했다 → 30/45/80/100
  rentSchedule: [
    { from: 1, rent: 30 },
    { from: 11, rent: 45 },
    { from: 21, rent: 80 },
    { from: 31, rent: 100 },
  ],
  shopSlots: 20,
  storageExpand: { steps: [{ cost: 300, slots: 10 }, { cost: 500, slots: 10 }, { cost: 700, slots: 10 }] }, // 창고 확장 3단계 (까마귀로 목수에게 의뢰): 단계마다 창고 10칸(부피 +240) — 최종 (20+30)칸 × 24 = 1200
  slotVolume: 24, // 창고 한 칸의 부피. 물건 1개의 부피 = slotVolume ÷ stack (창고 용량 = shopSlots × slotVolume)
  campaignDays: 40, // 4막 구조 (1~10 개점 / 11~22 확장 / 23~32 격변 / 33~40 결산). 1~20일 콘텐츠는 그대로 둔다
  // 이야기 날짜 보정 (기본 없음 = 40일 그대로). 캠페인을 줄일 때만 쓴다: [[실제일, 이야기일], ...] — "N일 이후" 조건·임대료 단계가 이야기일 기준이 된다.
  // 예) campaignDays: 35 + dayWarp: [[25, 25], [35, 40]] → 26~35일이 이야기상 26.5~40일. tools/sim_lib.js 는 환경변수 WS_CFG='{"campaignDays":35,...}' 로 덮어쓴다.
  dayWarp: null,
  dayWarpWorld: true, // dayWarp 가 있을 때 세계 변수의 밤 변화도 이야기일 수만큼 되풀이한다 (false 면 조건 날짜만 앞당김)
  openTime: 9 * 60,
  closeTime: 18 * 60,
  customersPerDay: [4, 6],
  maxEventsPerNight: 5,
  wholesaleSellRate: 0.5, // 도매상 처분 시 매입가 대비 비율
  // 창고 자리(items.js shelf)별 처분 비율 — 보석·잠긴 궤짝 물건은 되팔 때 덜 깎인다 (그래도 100% 미만이라 사서 곧장 되파는 차익은 없다)
  wholesaleSellRateByShelf: { gem: 0.75, special: 0.75 },
  haggleStep: 0.15,
  // 시작 재고 — 첫날 열리는 무기 거치대 것만 (다른 자리의 첫 물건은 progress.js tutorialCustomers[].stock)
  startInventory: { iron_sword: 3, bow: 2 }, // 1일째 튜토리얼 손님 순서에 맞춘 값 (customers.js d1_*)
  // 임대료 보정: 조건이 맞는 것끼리 곱한다
  rentMods: [
    { when: { flag: 'royal_certified' }, mult: 0.5 },
    { when: { flag: 'guild_squeeze' }, mult: 1.5 },        // 상인 길드가 건물주를 움직였다 (2배 → 1.5배: 기본 임대료가 오른 만큼 완화)
    { when: { flag: 'queen_serena' }, mult: 0.8 },         // 새 여왕의 상업 장려책
    { when: { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }] }, mult: 1.2 }, // 견습생 핀의 하루 삯 = 기본 임대료의 2할 (원래 4G — 임대료가 오른 만큼 6~20G, js/data/stories.js)
  ],
  // 도매가 보정
  costMods: [
    { when: {}, mult: 1.25 },                               // 3단계 QA: 도매 원가 전반 +25% — 초반(5일 300→900G)이 너무 후해서
    { when: { flag: 'star_iron' }, mult: 0.85 },           // 강철수염 공방의 별쇠
    { when: { flag: 'guild_member' }, mult: 0.88 },        // 길드 조합원 할인
    { when: { flag: 'iron_cartel' }, mult: 1.15 },         // 길드 카르텔
    { when: { flag: 'ore_hoard' }, mult: 1.5, items: ['iron_ore'] }, // 길드의 철광석 매점 — 드워프 납품 계약 중 한 번 (events.js dwarf_ore_hoard)
    { when: { var: 'trade_routes', lt: 25 }, mult: 1.1 },  // 끊긴 교역로
    // 화약 독점 판매상 (케셀과 계약 — customers.js alchemist_kessel): 도매상 조합이 "케셀 몫"을 싸게 넘긴다
    { when: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] }, mult: 0.6, items: ['black_powder'] },
    // (강철수염 왕국이 무너진 뒤의 무기값 폭등은 아래 fairyDwarf.fallSpike 로 — 이 파일 맨 끝에서 여기에 붙인다)
  ],
  // 요정과 드워프의 갈림길 → 결말 「요정의 가호」(forest_remembers) 또는 「강철의 시대」(dwarf_golden_age)
  // (customers.js fairy_envoy · fairy_envoy_return · dwarf_herald · fairy_envoy_final · dwarf_elder_offer, events.js)
  //   ① 티타니엘 첫 약속 (firstVisit 사이 하루, 반드시) — 사흘 드워프·골렘에 광석 금지 → 지키면 fairy_blessing
  //   ② 두 번째 약속 (secondVisit, ①을 지켰을 때만) — 사흘 더, 쇠를 캐는 이들에게 광석 금지 → fairy_oath2
  //   ③ 강철수염 전령 (pleaDay, 누구에게나) — 철광석 pleaOre개를 시세에. 팔면 dwarf_saved (② 중이면 약속을 깬다) → 이튿날 장로의 납품 계약.
  //      "내일 다시 오시오"는 광석이 없을 때 한 번. 거절하거나 이튿날에도 못 주면 dwarf_fallen
  //      → "무기 가격 폭등!" 무기 도매가 fallSpike.mult 배로 도매상 fallSpike.days 번 → "무기 가격 안정화!" (events.js dwarf_prices_settle)
  //   ④ ②를 지켰고 왕국이 무너졌으면 안정화 finalAfter 일 뒤(0 = 그날) 티타니엘의 마지막 부탁 — 사흘 무기를 아무에게도 팔거나 바꾸지 않기 → forest_remembers
  fairyDwarf: {
    firstVisit: [6, 8],   // 첫 방문 날 (이 사이 하루 — 광석 궤짝은 5일째에 열린다)
    secondVisit: 15,
    pleaDay: 16,          // "내일이라도 다시 오겠소" → 이튿날(17일) 한 번 더
    pleaOre: 30,          // 5일째 열리는 광석 궤짝(progress.js)은 20개 — 나머지는 전령이 오기 전에 사 두어야 한다 (14일부터 나흘 도매상 철광석이 동난다: events.js ore_run_begins)
    fallSpike: { mult: 2, days: 3 }, // 무너진 이튿날부터 도매상 days 번 동안 무기 도매가 ×mult, 그 뒤 원래대로
    finalAfter: 0,        // 무기값이 안정된 날로부터 며칠 뒤
    finalDust: 2,         // 마지막 약속에 두고 가는 요정 가루
    // 무기 금지 약속 사흘 동안 발길 (factions.js visit.bonus) — 물약·방어구를 사 가는 요정·마을 손님이 조금 는다 (임대료를 겨우 낼 만큼)
    oathVisit: { fairy: 0.5, village: 0.4 },
    fallenVisit: -3,      // 왕국이 무너진 뒤 드워프 발길 (visit.min 0.3 까지 — 피난민만 드문드문)
  },
  // 품절 투덜거림 — 이 분류의 물건을 달라는 손님을, 그 물건이 하나도 없어서 돌려보내면 (TransactionManager.refuse)
  // chance 만큼 refused 대사 대신 이 가운데 한 줄 + effects. 튜토리얼 손님은 빼고
  outOfStockGrumble: {
    category: 'weapon', chance: 0.4,
    lines: [
      '무기를 안 파는 무기상이라니, 그게 무기상이오?',
      '시세대로 사겠다는데 왜 물건을 안 갖다 놓소?',
      '칼 한 자루 없는 무기점은 처음 보오.',
    ],
    effects: { vars: { reputation: -0.5 } },
  },
  // 궁핍한 손님 — 돈이 모자란 서민 손님(랜덤 archs 의 chance, 이야기 손님은 틀의 poor)이 요구 물건을 시세의 offerRange 배로만 치르겠다고 한다.
  // 덤(요구 밖 물건을 얹어 줌: 시세 합 ≤ 원래 값 × giftCap) 이나 「그냥 가져가시오」(값 면제)로 호의를 보이면 소속 세력 우호도가 오르고,
  // 며칠 뒤 감사 손님(customers.js grateful_visit)이 작은 보답을 하러 온다 (한 틀에 한 번 — flag grate_<틀>). TransactionManager.gift / forgive
  poor: {
    chance: 0.12, minDay: 3, offerRange: [0.55, 0.75], giftCap: 2, giftMin: 40, // 덤 시세 합의 상한 = max(원래 값 x giftCap, giftMin)
    archs: { v_hunter: 'yo', v_oath_folk: 'yo', k_adventurer: 'yo', k_soldier: 'hao', k_soldier2: 'hao', tv_pilgrim: 'hao' }, // 틀 id → 말투 (voice_guide: 마을·모험가 해요체 / 병사·순례자 하오체)
    favor: { gift: 1, giftBig: 2, bigRatio: 0.5, forgive: 2, rep: 1 }, // giftBig: 덤 시세가 원래 값의 bigRatio 배 이상
    greet: {
      yo: ['{item} {qty}개만요… 가진 돈이 {offer}G뿐이에요. 모자란 줄은 아는데…', '죄송해요, {item} {qty}개에 {offer}G밖에 없어요. 어떻게 안 될까요?'],
      hao: ['{item} {qty}개가 필요하오. 헌데 가진 게 {offer}G뿐이오…', '돈이 모자라오. {item} {qty}개에 {offer}G가 전부요. 사정 좀 봐주시오.'],
    },
    sold: { yo: ['고마워요. 이것만으로도 큰 도움이에요.'], hao: ['고맙소. 없는 살림에 큰 도움이오.'] },
    thanks: {
      gift: { yo: ['덤까지 얹어 주시다니… 고마워요, 잊지 않을게요.', '어떻게 갚아야 할지 모르겠어요. 정말 고마워요!'], hao: ['덤까지 얹어 주다니, 고맙소. 꼭 갚으러 오겠소.', '가진 것 없는 처지에 이런 후의라니… 고맙소.'] },
      forgive: { yo: ['값도 안 받으시고… 이 은혜, 꼭 갚을게요.', '정말 그냥 가져가도 돼요? 고마워요, 정말요…'], hao: ['값을 받지 않겠다니… 고맙소. 이 신세는 꼭 갚으리다.', '이 은혜는 잊지 않겠소. 반드시 갚으러 오겠소.'] },
    },
    // 감사 손님: 덤·면제 손해(원가)의 rewardMult 배 안에서 보답 (금화 / 흔한 재료 / 소문 한 줄 + 약간의 금화). days 뒤에 온다
    grate: {
      days: [2, 5], rewardMult: [0.5, 1.2], weights: { gold: 5, item: 3, news: 2 }, items: ['iron_ore', 'bone_dust'],
      greet: {
        gold: { yo: '지난번엔 정말 고마웠어요. 약소하지만 보답하러 왔어요.', hao: '지난번 은혜를 갚으러 왔소. 약소하지만 받아 주시오.' },
        item: { yo: '지난번 은혜예요. 변변찮지만 이거라도 받아 주세요.', hao: '변변찮지만 지난번 은혜의 표시요. 받아 주시오.' },
        news: { yo: '오는 길에 들은 소문이에요. 신세 진 값으로 알려 드릴게요.', hao: '길에서 들은 소문이오. 신세 진 값으로 알려 드리리다.' },
      },
      accept: { yo: '고마워요. 또 들를게요.', hao: '고맙소. 또 들르겠소.' },
      decline: { yo: '그래도… 이 마음은 잊지 않을게요.', hao: '허허, 이 마음은 잊지 않겠소.' },
      declineRel: 1,
      rumors: [
        { cat: '소문', text: '"형편이 어려우면 그 무기점으로 가라"… 골목 사람들 사이에 도는 말' },
        { cat: '생활', text: '덤 얹어 주는 무기점 이야기, 서민 동네에 조용히 퍼져' },
        { cat: '소문', text: '"돈이 모자라도 얼굴 붉히지 않는 가게가 있다더라"' },
      ],
    },
    // 소문이 퍼짐 (덤·면제를 받은 손님이 가게 얘기를 하고 다닌다): chance 로 다음 날 마을 손님 한 명(customers.js word_villager) 또는 신문 한 줄
    spread: { chance: 0.3 },
  },
  // 천칭단 — 어느 편도 아닌 "균형의 수호자" (customers.js liga_* · events.js · DayManager 밤의 속삭임)
  // 주된 세력 = rels 가운데 관계의 절댓값이 가장 큰 mainCount 곳. 그 관계의 (최고 − 최저)가 tolerance 를 넘으면
  // 소라껍데기가 경고한다 (warnEvery 일에 한 번까지). maxWarnings 번째 경고로 끝 — 그날 밤 누군가 다녀간다 (events.js liga_robbery)
  liga: {
    rels: ['rel_kingdom', 'rel_goblin', 'rel_dwarf', 'rel_village', 'rel_demon', 'rel_demonlord', 'rel_church', 'rel_noble', 'rel_undead',
      'rel_vampire', 'rel_dragon', 'rel_mage', 'rel_merc', 'rel_guild', 'rel_bandit', 'rel_fairy', 'rel_hunter', 'rel_orc'],
    // 선두 세력의 "맞수" ({rival}) — 적힌 것 가운데 지금 관계가 가장 나쁜 곳. 없으면 주된 세력 중 관계가 가장 나쁜 곳
    rivals: {
      rel_kingdom: ['rel_goblin', 'rel_demonlord'], rel_goblin: ['rel_kingdom', 'rel_dwarf'], rel_dwarf: ['rel_goblin', 'rel_orc'],
      rel_village: ['rel_bandit', 'rel_goblin'], rel_demon: ['rel_church'], rel_demonlord: ['rel_kingdom', 'rel_church'],
      rel_church: ['rel_undead', 'rel_vampire'], rel_noble: ['rel_bandit'], rel_undead: ['rel_church'], rel_vampire: ['rel_hunter', 'rel_church'],
      rel_dragon: ['rel_kingdom'], rel_mage: ['rel_church'], rel_merc: ['rel_guild'], rel_guild: ['rel_bandit'],
      rel_bandit: ['rel_village', 'rel_kingdom'], rel_fairy: ['rel_dwarf'], rel_hunter: ['rel_vampire'], rel_orc: ['rel_dwarf', 'rel_kingdom'],
    },
    mainCount: 4,
    tolerance: 25,        // 3단계 QA: 12 는 한 세력에 조금만 쏠려도 9일 안에 실패했다 (가입 뒤 실패율 ≈ 90%)
    warnEvery: 3,
    maxWarnings: 3,
    recoverDays: 3,       // 균형이 돌아온 채로 이만큼 지나면 경고가 하나 줄어든다 (잠깐 한쪽으로 기운 사람도 되돌릴 수 있다)
    lines: {
      warn: '자네 요즘 {topWa} 친해 보이는군. 조심하게.',
      last: '…세 번째일세. 저울은 더는 자네를 믿지 않네.',
    },
  },
  // 궁정 다툼 · 계승 위기 복선 — 궁정 귀족은 세레나 공주 편, 붉은 늑대 용병단은 알드릭 왕자 편.
  // 다툼이 이어지는 동안(when): 그 세력의 랜덤 손님 몇이 인사말 끝에 한마디 (CustomerManager.gossip, chance),
  // 그 세력 랜덤 손님에게 팔면 편드는 쪽 힘이 조금 오른다 (TransactionManager.applyWorld, sellVars). 신문 복선은 news.js amb_court_ladies 등
  courtGossip: {
    when: { all: [{ any: [{ flag: 'court_struggle' }, { flag: 'succession_crisis' }] }, { noFlag: 'crowned' }, { noFlag: 'king_aldric' }, { noFlag: 'queen_serena' }] },
    chance: 0.2,
    lines: {
      noble: [
        '요즘 궁정 부인들은 다 공주님 구호소에 줄을 서지요.',
        '왕자 측 초대장이요? 다들 뜯지도 않고 돌려보냈답니다.',
        '공주님이 수녀복을 입으셔도 궁정 사람들은 다 알아봐요.',
      ],
      merc: [
        '왕자님은 금화를 아끼지 않지. 우리 단장이 요즘 궁에 자주 들어가.',
        '왕자님 사냥 모임엔 우리 단장 자리가 늘 있다더군.',
        '"왕자님 금화는 무겁다" — 요즘 막사에서 부르는 노래야.',
      ],
    },
    sellVars: { noble: { princess_power: 1 }, merc: { prince_power: 1 } },
    except: ['nb_aldric'], // 궁정 귀족 가운데 왕자파 기사는 빼고 (factions.js)
  },
  // 「밀고자」 길 — 까마귀 밀고가 맞으면 report_hits·collusion↑ (letters.js report.guiltyEffects) → 적게 쌓여도
  // 감찰청 "공식 제보처" 지정 (events.js informant_office_named, flag informant_office) → 그 뒤 인간 쪽 손님 몇이
  // 인사말에 투덜거린다 (CustomerManager.mutter) → 지정 뒤에도 밀고 2번 + 감찰관 앞 사실대로 1번이면 결말 「밀고자」
  mutter: {
    chance: 0.2,
    factions: ['kingdom', 'village', 'noble', 'church', 'guild', 'hunter'],
    race: '인간',
    // before: 인사말 앞에 / after: 인사말 뒤에
    before: [
      '(목소리를 낮춘다) 이 가게, 감찰청 끄나풀이라며?',
      '여기서 말 잘못하면 끌려간다던데…',
      '…우리 형님이 여기서 한 말 때문에 잡혀갔소.',
      '요즘 이 골목 사람들 입이 무거워졌어.',
      '(두리번거린다) 감찰관은 없지요?',
    ],
    after: [
      '물건만 사고 갈 거요. 아무 말도 안 했소.',
      '…딴말은 안 하겠소. 장부에 적히기 싫으니.',
      '이름은 묻지 마시오. 여긴 적어 두는 가게라면서.',
    ],
  },
  // 그날 밤 곧바로 끝나는 결말 — 이 가운데 하나라도 맞으면 밤 장면 없이 결말로 간다 (DayManager.endingDue).
  // text: 마감 화면 한 줄 (위에서부터 처음 맞는 것)
  endNow: [
    { when: { flag: 'smuggle_king_accepted' }, text: '가게 불을 끈다. 뒷문 밖에 짐마차 바퀴 소리가 멎는다. 오늘 밤부터는 다른 장사다.' },
    { when: { flag: 'shop_seized' }, text: '열쇠는 집행관 손에 넘어갔다. 오늘이 마지막 장사였다.' },
    { when: { flag: 'bankrupt' }, text: '금고가 비었다. 임대료를 낼 수 없다…' },
  ],
  // 밀수 — 도적단 장물아비의 장물함 (js/data/smuggling.js · js/systems/Stash.js) → 결말 「밀수왕」
  smuggling: {
    unlock: { blackmarket: 12, rel_bandit: 3 }, // 둘 다 넘으면 장물아비 "장부" 닉스가 찾아온다 (3단계 QA: 20/8 이면 중앙값 21일째라 세 짐이 40일 안에 안 끝났다)
    retryDays: 3,          // 거절하면 며칠 뒤 다시 온다
    returnDays: [1, 2],    // 장물함이 비면 며칠 뒤 다음 짐을 들고 온다 (비기 전엔 오지 않는다)
    batchesForKing: 3,     // 걸리지 않고 다 판 짐이 이만큼이면 암시장의 큰손이 찾아온다
    // 한 짐: total 개를 아래 네 종류에 나눈다 (종류마다 적어도 하나, 나머지는 weights 비율로).
    // 다이아·진주는 뺐다 — 다이아를 사려는 손님이 데이터에 없어 장물함이 영영 안 비었다 (3단계 QA)
    batch: { total: [4, 6], weights: { iron_sword: 3, bow: 2, shield: 2, potion: 3 } },
    // 장물 원가는 0 — 닉스는 몫을 떼지 않는다 (판 값은 전부 가게 몫. 대가는 적발 위험)
    // 적발 확률 — 한 거래에 넘긴 장물 수 n 만 센다 (섞어 넘긴 일반 물건은 세지 않는다)
    detect: {
      safeFactions: ['goblin'],   // 실제 소속이 이 세력이면 몇 개를 넘겨도 0% (고블린은 왕국에 찌르지 않는다)
      royalFactions: ['kingdom'], // 실제 소속이 왕정 쪽(감찰관·경비대 포함)이면 한 개만 넘겨도 100%
      royalSeals: ['royal'],      // 진짜 국왕 직속 인장을 내민 손님도 100%
      byCount: [0, 0.01, 0.10, 0.30, 0.50, 0.70, 1], // 그 밖의 손님: [n] (n ≥ 6 은 마지막 값)
    },
    saleEffects: { flags: ['illegal_sale'], vars: { illegal_sale_count: 1, blackmarket: 1 } }, // 장물이 섞인 판매는 모두 장부의 얼룩 (「완벽한 장부」) · 뒷거래
    // 적발: 남은 장물 압수 · 벌금(금고가 0 밑으로는 안 감) · 평판 · 얼룩 → 밀수 길은 영영 끊긴다
    bust: {
      fine: 100,
      line: '…잠깐. 이거 도난 신고된 물건 아니오? 경비대를 부르겠소.',
      effects: {
        vars: { reputation: -5, rel_kingdom: -2 }, flags: ['smuggle_burned', 'illegal_sale'],
        news: [{ cat: '왕국', text: '무기점 진열대서 도난품 적발… 장물 압수에 벌금까지', big: true }],
        spawn: [{ customer: 'smuggle_fence_cut', inDays: 1 }],
      },
    },
    // 뒷거래 — 정체를 감춘 손님과 거래하면 암시장 활성도가 오른다 (TransactionManager.offBooks, 한 거래에 한 번)
    // 위장(겉 소속 ≠ 실제 소속) · 수상한 자(틀의 suspicious/shady/stain) · 가짜 인장 · 소속을 대지 않음(openFactions 는 빼고) · 두건 쓴 자(looks)
    offBooks: { amount: [1, 2], openFactions: ['traveler', 'unknown'], looks: ['hooded'] },
  },
};

// min/max 생략 시 0~100
WS.data.worldVars = {
  kingdom_power:   { label: '왕국 군사력', init: 30 },
  goblin_power:    { label: '고블린 군사력', init: 15 },
  dwarf_tech:      { label: '드워프 기술력', init: 10 },
  // 몬스터 개체수 — 여러 세력의 등장 문턱이 이 한 변수에 걸려 있다 (문턱을 옮길 때는 아래를 함께 볼 것):
  //   31 오우거 위협(events.js ogre_threat) · 36 사냥꾼 전리품 상인 · 대성당 사제 · 연금술 행상(factions.js) ·
  //   38 사냥꾼 추적자(factions.js) · 잿빛 엄니 전투단 출현(events.js warband_descends) · 신문 현상금 · 42 가도 몬스터 출몰(events.js monster_surge)
  // (흡혈귀 발각은 3단계에서 이 변수와 떼어 냈다 — vampire_power 와 계승 위기만 본다)
  monster_pop:     { label: '몬스터 개체수', init: 30 },
  border_tension:  { label: '서부 국경 긴장', init: 8 },
  war_progress:    { label: '전쟁 추세 (+고블린 / -왕국)', init: 0, min: -30, max: 30 },
  kingdom_morale:  { label: '왕국 민심', init: 50 },
  goblin_unity:    { label: '고블린 결속력', init: 10 },
  village_defense: { label: '동쪽 마을 방비', init: 0 },
  blackmarket:     { label: '암시장 활성도', init: 10 },
  reputation:      { label: '상점 평판', init: 10 },
  rel_kingdom:     { label: '왕국과의 관계', init: 0, min: -30, max: 30 },
  rel_goblin:      { label: '고블린과의 관계', init: 0, min: -30, max: 30 },
  rel_dwarf:       { label: '드워프와의 관계', init: 0, min: -30, max: 30 },
  rel_village:     { label: '마을과의 관계', init: 0, min: -30, max: 30 },
  iron_price:      { label: '철 가격 지수', init: 100, min: 50, max: 250 },
  economy:         { label: '경제 상황', init: 50 },
  // 안개 상단(id 는 옛 이름 demon) / 마왕군
  demon_influence: { label: '안개의 짙기', init: 4 },
  demonlord_power: { label: '마왕군 군세', init: 12 },
  invasion_risk:   { label: '마왕군 침공 위기', init: 5 },
  rel_demon:       { label: '안개 상단과의 관계', init: 0, min: -30, max: 30 },
  rel_demonlord:   { label: '마왕군과의 관계', init: 0, min: -30, max: 30 },

  // ───────── 확장 세력 ─────────
  // drift: 매일 밤 증감 / toward: [목표, 속도] — 천천히 돌아가려는 값 (World.nightly)
  fairy_grace:      { label: '요정 숲의 생기', init: 22, toward: [22, 0.04] },
  arcane_power:     { label: '마법사 길드 연구', init: 12, drift: 0.15 },
  merc_strength:    { label: '용병단 규모', init: 8, drift: -0.2 },
  vampire_power:    { label: '흡혈귀 궁정 세력', init: 14, drift: 0.12 },
  undead_power:     { label: '언데드 발호', init: 4, drift: 0.1 },
  dragon_stir:      { label: '용의 뒤척임', init: 0 },
  dragon_defense:   { label: '성벽 수비 물자', init: 0, max: 99999 },
  undead_defense:   { label: '대성당 방비 물자', init: 0, max: 99999 },
  crown_power:      { label: '왕정의 힘', init: 10, min: 0, max: 40 }, // 왕·왕자·공주 다툼에서 늙은 왕 쪽의 힘
  prince_power:     { label: '왕자 측의 힘', init: 8, min: 0, max: 40 },
  princess_power:   { label: '공주 측의 힘', init: 8, min: 0, max: 40 }, // 해골 행렬이 출발한 이틀 동안 대성당 사제에게 넘긴 물자(시세 합) // 용이 깨어난 사흘 동안 수비대장에게 넘긴 물자(시세 합)
  guild_grip:       { label: '상인 길드 장악력', init: 12, drift: 0.15 },
  church_authority: { label: '대성당 권위', init: 25, toward: [25, 0.03] },
  succession:       { label: '왕위 계승 (+알드릭 / -세레나)', init: 0, min: -30, max: 30 },
  bandit_power:     { label: '도적단 세력', init: 8, drift: 0.15 },
  warband_power:    { label: '잿빛 엄니 전투단', init: 8, drift: 0.15 },
  pirate_power:     { label: '해적 세력', init: 8, drift: 0.1 },
  alchemy_progress: { label: '연금술 진척', init: 4, drift: 0.2 },
  golem_tech:       { label: '골렘 기술', init: 0 },
  trade_routes:     { label: '교역로 안전', init: 50, toward: [50, 0.04] },
  star_signal:      { label: '밤하늘의 신호', init: 0 },
  rel_fairy:        { label: '요정과의 관계', init: 0, min: -30, max: 30 },
  rel_mage:         { label: '마법사 길드와의 관계', init: 0, min: -30, max: 30 },
  rel_merc:         { label: '용병단과의 관계', init: 0, min: -30, max: 30 },
  rel_hunter:       { label: '사냥꾼 조합과의 관계', init: 0, min: -30, max: 30 },
  rel_vampire:      { label: '흡혈귀 궁정과의 관계', init: 0, min: -30, max: 30 },
  rel_undead:       { label: '사령술 교단과의 관계', init: 0, min: -30, max: 30 },
  rel_dragon:       { label: '용과의 관계', init: 0, min: -30, max: 30 },
  rel_guild:        { label: '상인 길드와의 관계', init: 0, min: -30, max: 30 },
  rel_church:       { label: '대성당과의 관계', init: 0, min: -30, max: 30 },
  rel_noble:        { label: '궁정 귀족과의 관계', init: 0, min: -30, max: 30 },
  rel_bandit:       { label: '도적단과의 관계', init: 0, min: -30, max: 30 },
  rel_orc:          { label: '전투단과의 관계', init: 0, min: -30, max: 30 },
  rel_pirate:       { label: '해적과의 관계', init: 0, min: -30, max: 30 },
  rel_alchemist:    { label: '연금술 학회와의 관계', init: 0, min: -30, max: 30 },
  rel_golem:        { label: '골렘 공방과의 관계', init: 0, min: -30, max: 30 },
  rel_traveler:     { label: '나그네들과의 관계', init: 0, min: -30, max: 30 },
  rel_unknown:      { label: '???', init: 0, min: -30, max: 30 },

  // ───────── 3·4막: 서류 심사 성향 · 지하조직 ─────────
  liga_warnings:    { label: '소라껍데기의 경고', init: 0, min: 0, max: 9 }, // 천칭단 (config.liga)
  integrity:        { label: '원칙주의 성향', init: 0, min: -30, max: 30 }, // + 원칙주의 / - 현실주의
  collusion:        { label: '감찰청 협력도', init: 0, min: -30, max: 30 },
  illegal_sale_count: { label: '위장 거래 이력', init: 0, min: 0, max: 999 },
  // 「밀고자」 길 (config.mutter 설명 참고). _after 는 "공식 제보처" 지정(flag informant_office) 뒤에만 센다
  report_hits:      { label: '까마귀 밀고 적중', init: 0, min: 0, max: 999 },
  report_hits_after: { label: '제보처 지정 뒤 밀고 적중', init: 0, min: 0, max: 999 },
  inspector_truth:  { label: '감찰관 앞에서 사실대로', init: 0, min: 0, max: 999 },
  inspector_truth_after: { label: '제보처 지정 뒤 사실대로', init: 0, min: 0, max: 999 },

  // ───────── 인물 이야기 (js/data/stories.js) ─────────
  leon_bond:        { label: '레온과의 정', init: 0, min: -10, max: 10 },
  pin_trust:        { label: '견습생 핀의 믿음', init: 0, min: -10, max: 10 },
  debt_due:         { label: '은화 저울 상회 밀린 빚(G)', init: 0, min: 0, max: 9999 },
  debt_strikes:     { label: '은화 저울 상회 연체 경고', init: 0, min: 0, max: 9 },
  // 강철수염 씨족 광석 납품 계약 (customers.js dwarf_elder_offer · dwarf_porter)
  dwarf_ore_price:  { label: '드워프 계약 광석값(G, 개당)', init: 0, min: 0, max: 999 },
  dwarf_deliveries: { label: '드워프 계약 납품 횟수', init: 0, min: 0, max: 99 },
  dwarf_plea_price: { label: '강철수염 전령에게 판 광석값(G, 개당)', init: 0, min: 0, max: 999 }, // customers.js dwarf_herald
};

// 강철수염 왕국이 무너진 뒤 무기값 폭등 (config.fairyDwarf.fallSpike — events.js dwarf_kingdom_falls / dwarf_prices_settle).
// 무너진 날부터 days 일 동안(= 이튿날부터 도매상 days 번) 무기 분류의 도매가 ×mult
(cfg => {
  const s = cfg.fairyDwarf.fallSpike;
  cfg.costMods.push({ when: { all: [{ flag: 'dwarf_fallen' }, { not: { since: { flag: 'dwarf_fallen', days: s.days + 1 } } }] }, mult: s.mult, category: 'weapon' });
})(WS.data.config);

// 세력 사이의 얽힘 — 매일 밤 조건이 맞으면 적용된다. 값이 [변수, 배율] 이면 (그 변수 × 배율)
WS.data.nightlyRules = [
  // 흡혈귀 궁정은 "먹잇감을 망치는" 사령술사를 눌러 왔다. 궁정이 무너지면 무덤이 열린다
  { when: { var: 'vampire_power', gte: 12 }, vars: { undead_power: -0.35 } },
  { when: { var: 'vampire_power', lt: 8 }, vars: { undead_power: 0.3 } }, // 저절로는 천천히 — 크게 키우는 건 교단에 판 무기다
  // 전쟁과 괴멸은 시체를 남긴다
  { when: { any: [{ flag: 'war' }, { flag: 'demon_war' }, { flag: 'village_fell' }, { flag: 'dragon_razed' }, { flag: 'civil_war' }] }, vars: { undead_power: 0.7 } },
  // 도적과 해적은 교역로를 갉아먹고, 끊긴 길은 경제를 말린다
  { vars: { trade_routes: ['bandit_power', -0.03] } },
  { vars: { trade_routes: ['pirate_power', -0.025] } },
  { when: { var: 'trade_routes', lt: 30 }, vars: { economy: -0.4 } }, // 암시장 활성도는 도시 형편이 아니라 가게의 뒷거래로만 오른다 (config.smuggling.offBooks)
  // 가난과 폐허는 도적을 낳는다
  { when: { any: [{ var: 'economy', lt: 45 }, { flag: 'village_fell' }, { flag: 'civil_war' }] }, vars: { bandit_power: 0.5 } },
  // 금이 쌓이면 산 너머 용이 뒤척인다 (가게 금고도, 도시의 호황도)
  { when: { gold: { gte: 1000 } }, vars: { dragon_stir: 0.4 } },
  { when: { gold: { gte: 2000 } }, vars: { dragon_stir: 0.4 } },
  { when: { var: 'economy', gte: 60 }, vars: { dragon_stir: 0.2 } },
  // 숲은 용광로와 톱니에 약하다
  { vars: { fairy_grace: ['dwarf_tech', -0.015] } },
  { when: { var: 'golem_tech', gte: 8 }, vars: { fairy_grace: -0.6 } },
  { when: { var: 'fairy_grace', gte: 30 }, vars: { monster_pop: -0.2, economy: 0.15 } },
  // 두려움은 신앙을 키운다
  { when: { any: [{ var: 'demon_influence', gte: 15 }, { var: 'undead_power', gte: 18 }] }, vars: { church_authority: 0.4 } },
  // 산의 몬스터가 늘면 전투단도 불어난다
  { vars: { warband_power: ['monster_pop', 0.006] } },
  // 전쟁·계승 분쟁은 용병의 대목
  { when: { any: [{ flag: 'war' }, { flag: 'demon_war' }, { flag: 'succession_crisis' }, { flag: 'civil_war' }] }, vars: { merc_strength: 0.5 } },
  // 연구는 연구를 낳는다
  { vars: { alchemy_progress: ['arcane_power', 0.012] } },
  { when: { flag: 'golem_workshop' }, vars: { golem_tech: 0.3 } },
  { when: { day: { gte: 5 } }, vars: { star_signal: 0.35 } },
];

// 관계 탭에 보이는 "소문" — 정확한 수치 대신 흐릿한 체감 정보만 준다.
WS.data.rumors = [
  { var: 'kingdom_power', label: '왕국군', steps: [[20, '약화됨'], [35, '평시 전력'], [50, '강성함'], [999, '전시 동원']] },
  { var: 'goblin_power', label: '서부 고블린', steps: [[15, '흩어진 부족들'], [25, '무장하는 중'], [35, '위협적'], [999, '군대 수준']] },
  { var: 'dwarf_tech', label: '드워프 공방', steps: [[15, '전통 방식'], [25, '활발한 연구'], [40, '기술 혁신기'], [999, '황금기']] },
  { var: 'monster_pop', label: '몬스터', steps: [[20, '드묾'], [35, '평소 수준'], [50, '자주 출몰'], [999, '창궐']] },
  { var: 'border_tension', label: '서부 국경', steps: [[10, '조용함'], [20, '술렁임'], [30, '일촉즉발'], [999, '전장']] },
  { var: 'demon_influence', label: '안개 낀 밤', steps: [[8, '가끔 낀다'], [18, '잦아짐'], [30, '밤마다 낀다'], [999, '낮에도 걷히지 않음']] },
  { var: 'demonlord_power', label: '북쪽 황무지', steps: [[18, '잠잠함'], [28, '검은 깃발이 늘어남'], [40, '대군 집결'], [999, '진군 준비 완료']] },
  { var: 'invasion_risk', label: '북부 국경', steps: [[10, '평온'], [22, '봉화 점검 중'], [35, '피난 준비'], [999, '침공 임박']] },
  // when 이 있는 소문은 조건이 맞을 때만 손님들 입에 오른다
  { var: 'trade_routes', label: '가도와 항로', when: { day: { gte: 3 } }, steps: [[25, '끊기다시피 함'], [40, '위험함'], [60, '평소 수준'], [999, '활기참']] },
  { var: 'fairy_grace', label: '동쪽 숲의 요정불', when: { day: { gte: 4 } }, steps: [[12, '꺼져 감'], [20, '희미함'], [30, '밤마다 반짝임'], [999, '숲이 노래함']] },
  { var: 'church_authority', label: '대성당 종소리', when: { day: { gte: 4 } }, steps: [[20, '성기다'], [30, '평소대로'], [42, '설교가 길어짐'], [999, '이단 심문 중']] },
  { var: 'guild_grip', label: '상인 길드', when: { day: { gte: 3 } }, steps: [[15, '느슨함'], [25, '가격표를 돌림'], [35, '시장을 쥠'], [999, '길드가 곧 시장']] },
  { var: 'vampire_power', label: '밤의 궁정', when: { any: [{ flag: 'vampire_known' }, { var: 'vampire_power', gte: 20 }] }, steps: [[8, '몰락'], [18, '가면 뒤에 숨음'], [28, '귀족 저택마다 초대장'], [999, '밤이 곧 궁정']] },
  { var: 'undead_power', label: '공동묘지', when: { var: 'undead_power', gte: 10 }, steps: [[15, '가끔 흙이 파여 있음'], [25, '밤에 발소리'], [35, '무덤이 비어 감'], [999, '죽은 자의 행진']] },
  { var: 'succession', label: '왕위 계승', when: { flag: 'succession_crisis' }, steps: [[-10, '세레나 공주 우세'], [-3, '공주 쪽으로 기움'], [3, '팽팽함'], [10, '왕자 쪽으로 기움'], [999, '알드릭 왕자 우세']] },
  { var: 'bandit_power', label: '가도의 도적', when: { var: 'bandit_power', gte: 12 }, steps: [[15, '좀도둑 수준'], [22, '무리를 지음'], [30, '산채를 세움'], [999, '도적왕의 영지']] },
  { var: 'warband_power', label: '북쪽 산맥 북소리', when: { flag: 'warband_sighted' }, steps: [[15, '멀리서 들림'], [25, '가까워짐'], [35, '골짜기를 울림'], [999, '전투단 집결']] },
  { var: 'pirate_power', label: '남쪽 항구', when: { flag: 'port_open' }, steps: [[12, '어선만 오감'], [20, '검은 돛이 보임'], [30, '해적이 부두를 활보'], [999, '항구의 주인이 바뀜']] },
  { var: 'alchemy_progress', label: '증류탑 연기', when: { day: { gte: 5 } }, steps: [[10, '평범함'], [20, '색이 자꾸 바뀜'], [30, '밤새 폭음'], [999, '하늘이 녹색']] },
  { var: 'dragon_stir', label: '재의 산', when: { var: 'dragon_stir', gte: 4 }, steps: [[8, '연기 한 줄'], [14, '땅이 가끔 울림'], [999, '정상이 붉게 빛남']] },
  { var: 'star_signal', label: '밤하늘', when: { var: 'star_signal', gte: 3 }, steps: [[4, '별 하나가 깜빡임'], [7, '별이 규칙적으로 깜빡임'], [999, '누군가 대답을 기다림']] },
  // 천칭단의 소라껍데기 — 받았을 때만. 잃으면 "사라졌다"
  { var: 'liga_warnings', label: '속삭이는 소라껍데기', when: { all: [{ flag: 'liga_member' }, { noFlag: 'liga_failed' }] }, steps: [[1, '머리맡에서 조용하다'], [2, '한 번 속삭였다'], [3, '두 번 속삭였다 — 저울이 기운다'], [999, '…']] },
  { var: 'liga_warnings', label: '속삭이는 소라껍데기', when: { flag: 'liga_failed' }, steps: [[999, '어느 밤 사라졌다']] },
  // 인물 이야기 (js/data/stories.js) — 손님들이 수군대는 말로만
  { var: 'debt_strikes', label: '은화 저울 상회 장부', when: { all: [{ customerSeen: 'debt_collector_1' }, { noFlag: 'debt_cleared' }, { noFlag: 'shop_seized' }] }, steps: [[1, '밀린 할부 없음'], [2, '독촉장 한 번'], [3, '"한 번 더 밀리면 집행관"'], [999, '집행관이 열쇠를 노림']] },
  { var: 'leon_bond', label: '레온 경', when: { customerSeen: 'd1_knight' }, steps: [[-1, '이 가게 얘길 피함'], [2, '가끔 들름'], [5, '"칼은 저 집에서"'], [999, '전우처럼 여김']] },
  { var: 'pin_trust', label: '견습생 핀', when: { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }] }, steps: [[1, '눈치만 봄'], [3, '성실함'], [8, '가게를 제 집처럼'], [999, '주인 흉내를 냄']] }, // 8 이상이면 28일에 "가게를 물려받아라"를 고를 수 있다
];

WS.data.relationWords = [[-15, '적대'], [-5, '냉담'], [5, '중립'], [15, '우호'], [999, '신뢰']];

// ───────── 캠페인 길이 프리셋 ─────────
// campaignDays 를 프리셋이 있는 값(35)으로 바꾸면 그 프리셋이 config 에 깊이 합쳐진다 (객체는 합치고 배열·숫자는 덮어쓴다). 40(기본)에는 프리셋이 없어 아무 일도 안 한다.
// 이 파일이 맨 앞에 읽히므로 이후의 데이터 파일들(events.js · endings.js …)이 프리셋이 적용된 config 를 본다. 자세한 근거: design/campaign_35.md
WS.data.campaignPresets = {
  35: {
    dayWarp: [[25, 25], [35, 40]], // 26~35일이 이야기상 27~40일 — "N일 이후" 조건 · 임대료 단계 · 세계 변수의 밤 변화가 이야기일 기준 (dayWarpWorld)
    dayWarpWorld: true,
    // 밀수왕: 세 짐을 5일 안에 더 빨리 — 장물아비가 3일 일찍(암시장 12→10 · 도적단 3→2) 오고, 짐은 4개(칼·활·방패·물약 하나씩), 비면 이튿날 새 짐 (40일 31% → 35일 원안 12% → 27%)
    smuggling: { unlock: { blackmarket: 10, rel_bandit: 2 }, retryDays: 2, returnDays: [1, 1], batch: { total: [4, 4] } },
    // 「완벽한 장부」: 칭찬받을 일(포스터 신고·고해)을 만날 날이 5일 줄어든 만큼 청렴도 문턱을 15 → 14 (40일 33% → 35일 원안 20% → 32%)
    ledgerIntegrity: 14,
  },
};
WS.data.applyCampaignPreset = () => {
  const C = WS.data.config, P = WS.data.campaignPresets[C.campaignDays];
  const merge = (t, s) => Object.keys(s).forEach(k => {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) merge(t[k], s[k]);
    else t[k] = s[k];
  });
  if (P) merge(C, P);
};
WS.data.applyCampaignPreset();

// 까마귀 서신 — 보내는 이, 제목·본문 틀, 공급 제안 목록, 밀고 규칙, "들어오면 알려 주오"(소원) 규칙 (데이터).
// 보낼 수 있는 편지는 두 가지: 경비대에 밀고(report) · 들어왔다고 알리기(notify). 물건 주문·급전 청원은 없어졌다
// (도매상은 이튿날 아침 가게에서 바로 살 수 있으니). loan 은 예전 저장본에 남은 빚을 정리하는 문구만 남긴다.
// 엔진은 js/systems/Letters.js. 문구는 {이름} 자리표시자를 WS.util.fill 로 채운다.
// 문구 항목이 배열이면 그중 하나를 고른다. 새 공급 제안은 offers 에 한 줄 추가하면 된다.
WS.data.letters = {
  // 까마귀 삯 (편지 한 통에 드는 모이값)
  crowFee: 2,

  senders: {
    roost:      { name: '까마귀 둥지지기', icon: '🪶' },
    wholesaler: { name: '도매상 조합', icon: '📦' },
    guard:      { name: '왕국 경비대', icon: '🛡️' },
    lender:     { name: '금저울 상인 길드 대부계', icon: '⚖️' },
    dwarf:      { name: '강철수염 씨족 교역소', icon: '⚒️' },
    smuggler:   { name: '"쥐꼬리" 벤', icon: '🐀' },
    tinker:     { name: '청동심장 공방', icon: '⚙️' },
    carpenter:  { name: '목수 드발', icon: '🔨' },
    crowdesk:   { name: '은화 저울 상회 까마귀 창구', icon: '🪙' },
    informant:  { name: '까마귀 정보상 "깃털"', icon: '🕵️' },
    mapmaker:   { name: '지도 공방 "나침반"', icon: '🧭' },
    gazetter:   { name: '평판지 서기 "잉크"', icon: '📜' },
  },
  // 증축 의뢰 — 창고를 늘린다 (config.storageExpand). 보낼 때 선불, 2일 뒤 아침 답장과 함께 공사 끝
  expand: {
    title: '증축 의뢰', to: 'carpenter', days: 2,
    desc: '창고를 넓힌다. 삯은 선불, 공사는 이틀',
    doneSubject: '증축 끝났소',
    // 단계별 목수 답장 (드워프 퉁명 하오체)
    done: [
      '증축 끝났소. 뒷방 벽을 밀었소.\n물건 좀 더 쌓아 두시오. 삯은 이미 받았소.',
      '지붕 밑 다락을 텄소. 사다리는 알아서 놓으시오.\n더 넓어졌으니 잔소리는 그만하시오.',
      '지하 저장고를 팠소. 돌이 단단해서 애먹었소.\n이보다 더 파면 이웃집이 무너지오. 이게 끝이오.',
    ],
  },

  // 소문 확인 의뢰 — 신문 ❓ 소문의 진위를 정보상에게 알아본다 (js/data/rumors.js · Rumors.js). 삯은 선불, 답장은 다음 날 아침
  //   답: 사실 / 거짓 / 불확실 (rumorNews.config.unsureChance). 이미 정정·확인 기사가 난 소문은 물을 수 없다
  rumorCheck: {
    to: 'informant', title: '소문 확인 의뢰', fee: 150,
    desc: '신문의 ❓ 소문 한 건이 참인지 정보상에게 알아본다. 삯은 선불, 답은 내일 아침',
    noneWhy: '확인할 소문이 없소.',
    subject: '[소문 확인] 그 소문은 {answer}',
    body: {
      true: [
        '소문 「{rumor}」 — 알아봤소. 사실이오. 내 눈으로 본 사람을 둘 만났소.\n소문대로 움직이시오. 대신 값이 뜬 물건은 비싸게 사지 마시오. — 깃털',
        '소문 「{rumor}」 — 사실이오. 뒷골목 세 곳에서 같은 말이 나왔소. 돈이 아깝지 않았기를. — 깃털',
      ],
      false: [
        '소문 「{rumor}」 — 거짓이오. 소문의 출처를 따라가 보니 술집 탁자에서 끝났소.\n사재기한 물건이 있다면 서두르시오. — 깃털',
        '소문 「{rumor}」 — 거짓이오. 누가 값을 띄우려 퍼뜨린 냄새가 나오. 삯값은 한 셈이오. — 깃털',
      ],
      unsure: [
        '소문 「{rumor}」 — 알 수가 없소. 말이 두 갈래로 갈리오. 사실 같기도, 아닌 것 같기도 하오.\n삯은 이미 나갔소. 며칠 뒤 다시 물어보시오. — 깃털',
      ],
    },
    answerWord: { true: '사실이오', false: '거짓이오', unsure: '알 수 없소' },
  },

  // 까마귀 대출 — 은화 저울 상회 까마귀 창구. 신청 즉시 금고에 들어오고, 7일 안에 원금 x 1.2 로 갚는다
  //   연체: 매일 아침 원금의 5% 가산, 이튿날 독촉장, 연체 3일째 아침 수금원 모트가 다녀간다(금액 + 벌금 자동 차감, 모자라면 경고 +1)
  crowLoan: {
    from: 'crowdesk', title: '대출 신청', repayTitle: '대출 상환',
    limits: [200, 400, 700], days: 7, interest: 0.2, lateRate: 0.05, fineRate: 0.1, collectDay: 3,
    desc: '까마귀가 돈주머니를 물고 온다. 7일 안에 원금의 1.2배를 갚아야 한다',
    dueLetter: {
      subject: '기한이 지났소',
      body: '까마귀 대출 상환 기한이 지났소. 오늘부터 매일 원금의 5%가 더 붙소.\n갚을 돈은 지금 {owed}G요. 까마귀 창구로 갚으시오. 사흘 넘기면 수금원 모트가 가게로 가오.',
    },
    collectLetter: {
      subject: '수금원 모트가 다녀갔소',
      paid: '수금원 모트가 가게에 다녀갔소. 대출금과 벌금 {total}G를 금고에서 받아 갔소.\n거래는 이것으로 끝이오.',
      short: '수금원 모트가 가게에 다녀갔소. 금고가 모자라 {took}G만 받아 갔소. 남은 {left}G는 그대로요.\n경고 한 번이 장부에 올랐소. 세 번이면 집행관이 오오.',
    },
  },

  // 까마귀가 처음 자리를 잡을 때의 안내장 (첫날 영업이 끝난 밤 — 둥지지기가 들여 준 녀석이 창틀에 눌러앉는다. 튜토리얼 화면과 같은 내용)
  welcome: {
    from: 'roost',
    subject: '까마귀를 들이셨소 — 신문부터 받아 보시오',
    body: `첫 장사를 마치셨소. 수고 많았소. 창틀에 까마귀 한 마리를 두고 가오. 편지 심부름은 이 녀석이 하오. 답은 이튿날 아침에 오오.

첫째, 대륙 일보를 받아 보시오. 하루 10G, 구독하면 내일 아침부터 문틈에 신문이 끼워져 있을 것이오. 신문이 없으면 시세가 왜 뛰는지, 어느 세력이 힘을 얻는지 알 길이 없소. 손님 입에서 나오는 소문만으로는 모자라오.

둘째, 신문을 받으면 장사에 보탬이 되는 물건을 까마귀로 살 수 있소. 대륙 지도(장부 3쪽), 평판지(4쪽 대륙 정세의 정확한 숫자), 정보통(가게 평판·왕국 우세도가 며칠 새 몇 움직였는지), 달력(장날·행사를 이레 앞서), 간판 교체(평판이 오르고 손님이 늘어나오). 창고 확장은 목수에게 맡기시오.

셋째, 돈이 급하면 까마귀 대출이 있소. 다만 이자가 붙으니 갚을 날을 꼭 지키시오. — 둥지지기 레나`,
  },

  // ───────── 인상서 (경비대 수배 전단 → 서류 서랍) ─────────
  // 두 길로 온다. ① 튜토리얼 손님이 손으로 건넨다 (progress.js tutorialCustomers[].posters — when 무시, 까마귀 없이 서류함에)
  //   — "쥐수염"은 11일째 경비대 전령이 건넨다. ② 아직 못 받았고 when 이 맞으면 까마귀 편으로 한 번 온다 (Letters.deliverPosters).
  // poster 는 서류함(UI)이 보여 줄 내용. catches: 이 인상서의 주인공인 손님 틀 id — 까마귀로 밀고하면
  //   (인상서를 받은 뒤라면) 틀림없이 잡히고 포상금은 poster.reward 그대로 (Letters.guiltOf).
  //   look: 인상서에 찍힌 얼굴(looks/sheets id) / marks: 대조할 인상착의 / wants: 찾는 물건 / reward: 신고 포상금(안내용)
  wanted: [
    {
      // 11일 이후 경비대 포고와 함께 서류함에 꽂힌다 (events.js wanted_marga → posters)
      id: 'marga', from: 'guard', when: { day: { gte: 999 } }, catches: ['marga'],
      subject: '[인상서] 고블린 억양의 여인',
      body: '서부 숲 쪽 첩자로 의심되는 여인. 곡물 상인 행세를 한다. 보면 거래하지 말고 알리시오. — 왕국 감찰청',
      poster: {
        look: 'traveler',
        title: '서부 숲 첩자 의심',
        name: '이름 미상 (곡물 상인 행세)',
        marks: ['왼쪽 뺨에 초승달 모양 흉터', '억양이 묘하다 — 고블린 말투', '물약을 찾는다'],
        wants: '물약 — 여행길에 쓴다며 여러 병',
        reward: 25,
        note: '거래하지 말 것. 감찰청에 알릴 것.',
      },
    },
    {
      id: 'ratwhisker', from: 'guard', when: { all: [{ day: { gte: 11 } }, { unlocked: 'docs' }] }, catches: ['gem_thief'],
      subject: '[인상서] 보석방 거리 금고털이',
      body: '보석방 거리 금고 두 곳이 털렸소. 범인 "쥐수염"은 남의 심부름꾼 행세를 하오. 보석을 찾으러 오면 경비대를 부르시오. — 경비대 제3초소',
      poster: {
        look: 'hooded', // 인상서 그림 — 실제로 찾아오는 손님(gem_thief)의 모습과 같다
        title: '보석방 거리 금고털이',
        name: '"쥐수염" (본명 미상, 가명 여럿)',
        marks: ['초록 두건을 눌러쓴다', '쥐 꼬리처럼 가늘고 긴 수염', '왼쪽 귀 끝이 잘려 뭉툭하다'],
        wants: '보석 — 남의 이름을 대며 "대신 찾으러 왔다"고 한다',
        reward: 50,
        note: '거래하지 말 것. 발견 즉시 경비대에 알릴 것.',
      },
    },
  ],

  // ───────── 배달 (받아들인 공급 제안 → 이튿날 아침 뒷문) ─────────
  // 예전 저장본에 남은 "물건 주문"도 이 문구로 배달된다.
  delivery: {
    deliverySubject: '{item} {qty}개 도착',
    deliveryBody: [
      '{item} {qty}개, 새벽에 뒷문에 두었소. — 도매상 조합',
      '{item} {qty}개 배달 끝. 물건은 멀쩡하오. — 도매상 조합',
      '{item} {qty}개, 뒷문 앞에 있소. 비 오기 전에 들이시오. — 도매상 조합',
    ],
    // 공급 제안을 받아들인 물건은 보낸 이의 말투로 온다
    deliveryBy: {
      dwarf: '{item} {qty}개, 씨족 짐마차로 보냈네. 무게는 우리가 달았네. — 강철수염 교역소',
      smuggler: '뒷문 거적 밑을 보쇼. {item} {qty}개. 하늘에서 떨어진 거요. — 벤',
      tinker: '{item} {qty}개, 태엽 수레로 보냈소. — 청동심장 공방',
    },
  },

  // ───────── 밀고 (왕국 경비대) ─────────
  report: {
    to: 'guard',
    title: '경비대에 밀고',
    desc: '오늘·어제 온 수상한 손님을 알린다. 헛짚으면 평판이 깎인다.',
    nobodyWhy: '알릴 만한 손님이 아직 없소.',
    // "잡을 만한 자" (Letters.guiltOf): 인상서의 주인공(wanted[].catches) / 실제 소속이 아래 세력 /
    //   겉과 속이 다른(faction ≠ trueFaction) 위장 손님 / customers.js 틀에 suspicious: true.
    // 틀의 onReport(효과 DSL)는 잡혔을 때, onFalseReport 는 헛짚었을 때 더해진다. reportDetail 은 결과 편지의 한 줄.
    // caughtFlag: 이 플래그가 이미 있으면(가게에서 경비대를 불렀다 등) "이미 잡혔소" — 포상도 벌도 없다.
    // 손님에게 "생각해 보겠소"(선택지 stall: true)로 답을 미뤄 두고 밀고하면 포상금이 조금 더 붙는다.
    shadyFactions: ['bandit', 'demon', 'demonlord', 'undead'],
    reward: { random: [30, 55], scripted: [55, 80] }, // 포상금 범위. 스토리 손님(위장 손님 등)이 더 크다
    soldToMult: 0.5,             // 그날 그자에게 물건을 팔았다면 포상금 절반
    stallMult: 1.3,              // 팔지 않고 답을 미뤄 붙잡아 뒀다면
    guilty: { reputation: 2, rel_kingdom: 1, target: -3 },   // target: 잡힌 자의 실제 세력과의 관계
    innocent: { reputation: -3, rel_kingdom: -1, target: -3 }, // target: 억울한 자(주장 세력)와의 관계
    // 「밀고자」 길 (config.mutter 설명): 맞으면 감찰청 협력도 +2 · 적중 +1 (공식 제보처 지정 뒤면 report_hits_after 도), 헛짚으면 −1
    guiltyEffects: { vars: { collusion: 2, report_hits: 1 }, if: { when: { flag: 'informant_office' }, then: { vars: { report_hits_after: 1 } } } },
    innocentEffects: { vars: { collusion: -1 } },
    sentSubject: '밀고: {name}',
    sentBody: '{name}({job})이(가) 수상하오. 뒤를 밟아 주시오.',
    guiltySubject: '제보 건: {name} 체포',
    guiltyBody: [
      '{name}, 간밤에 붙잡았소. {detail} {rewardLine} — 왕국 경비대',
      '{name}, 새벽에 여관에서 잡았소. {detail} {rewardLine} — 왕국 경비대',
    ],
    // {rewardLine}: 세 문장을 넘지 않게 포상금 문장 하나에 사정을 담는다
    rewardLine: ['포상금 {reward}G 동봉하오.', '포상금 {reward}G요.'],
    soldToLine: '그자 물건이 이 가게 것이라 포상금은 절반, {reward}G요.',
    stallLine: '답을 미뤄 붙잡아 둔 덕이오, 포상금 {reward}G요.',
    alreadySubject: '제보 건: {name}',
    alreadyBody: '{name}은(는) 이미 우리가 데려갔소. 그래도 눈여겨봐 줘서 고맙소. — 왕국 경비대',
    promiseDetail: '내일 가게에 가기로 했다던데, 이제 못 가오.', // 다시 오기로 한 손님이었으면 {detail} 대신
    // 실제 소속별 한 줄 (없으면 default)
    details: {
      bandit: '봇짐에서 검은 두건이 나왔소.',
      demon: '몽타주 화가가 얼굴을 끝내 못 그렸소.',
      demonlord: '소매에 검은 군단 밀서가 있었소.',
      undead: '살갗이 차가워 대성당이 맡았소.',
      poster: '인상서 그대로였소.',
      default: '이름도 소속도 가짜였소.',
    },
    innocentSubject: '제보 건: 헛걸음',
    innocentBody: [
      '{name} 건은 헛걸음이었소. 이 일은 기록에 남기겠소. — 왕국 경비대',
      '{name}은(는) 그냥 {job}이었소. 확실할 때만 까마귀를 보내시오. — 왕국 경비대',
    ],
    news: [
      { cat: '사건', text: '경비대, 상점가 제보로 {faction} 끄나풀 체포… "시민의 눈이 곧 성벽"' },
      { cat: '사건', text: '새벽 여관가 급습, 수상한 {faction} 연루자 연행. 제보자는 "어느 무기상"으로만 알려져' },
    ],
  },

  // ───────── (예전 저장본) 남은 빚 — 금저울 상인 길드 대부계 ─────────
  // 급전 청원·대부 권유는 없어졌다. 예전에 진 빚만 이 규칙으로 이자가 붙고 정리된다 (Letters.processLoans).
  loan: {
    to: 'lender',
    ratePer5Days: 0.10,   // 닷새마다 원금의 1할 (날짜 비례, 단리)
    termDays: 7,
    remindBefore: 2,      // 상환일 이틀 전 독촉장
    graceDays: 3,         // 연체 시 말미
    lateFeeRate: 0.10,    // 연체 시 남은 빚의 1할 가산
    keepFloor: 20,        // 압류해도 금고에 (오늘 임대료 + 이만큼)은 남겨 둔다 — 파산으로 끝나지 않게
    onTake: { vars: { guild_grip: 0.5 } },
    onDefault: { vars: { reputation: -3, rel_guild: -3 } },
    approvedSubject: '대부 승인: {amount}G',
    approvedBody: '{amount}G 보내오. 닷새마다 이자 1할, {dueDay}일째까지 갚으시오. — 대부계',
    remindSubject: '상환 기일 안내: {owed}G',
    remindBody: '빌린 {principal}G가 지금 {owed}G요. {dueDay}일째 해 지기 전까지 갚으시오. — 대부계',
    dueSubject: '오늘이 상환일이오: {owed}G',
    dueBody: '오늘까지 {owed}G요. 내일은 수금원이 문을 두드릴 것이오.',
    paidSubject: '영수증: {owed}G',
    paidBody: '{owed}G, 잘 받았소. 장부에서 이름을 지웠소. — 대부계',
    seizeSubject: '압류 통지',
    seizeBody: '기한이 지났소. 수금원이 금고에서 {seized}G를 거둬 갔소. {remainText}',
    seizeNothingBody: '기한이 지났소. 금고엔 세 낼 돈뿐이라 두고 왔소. {remainText}',
    seizeCleared: '빚은 이것으로 청산되었소.',
    seizeRemain: '남은 {remain}G는 연체료를 붙여 {dueDay}일째까지 받겠소.',
  },

  // ───────── 공급 제안 (들어오는 편지) ─────────
  // item 또는 itemFrom({ newCategory, subtype, rarity, notSupplied, includeSpecial }) — 조건에 맞는 것 중 하나.
  //   notSupplied: 도매 목록에 없는 물건(supplyWhen:false)만 / includeSpecial: 이름 있는 특수 변형도 포함
  //   (newCategory 'special' — 순간이동석 같은 유물 — 은 언제나 제외)
  // qty: 수량 범위 / mult: 도매가(Market.cost) 대비 배율 범위 / w: 가중치 (희귀도 가중치와 곱한다)
  // onAccept: 효과 DSL (밀수품이면 암시장 활성도 상승 등)
  offerChance: 0.35,
  offerFromDay: 2,
  rarityWeight: { '일반': 0.6, '고급': 1, '희귀': 1.6, '전설': 2.2, '???': 2.2 },
  // 손님이 기다리는 물건(소원 — wish)은 가중치 × wish.offerBoost, 못 채운 소원이 있으면 확률 wish.offerChance.
  offers: [
    {
      id: 'ws_dragon_scale', from: 'wholesaler', item: 'dragon_scale', qty: [1, 3], mult: [1.05, 1.2], w: 1.2,
      when: { day: { gte: 4 } },
      subject: '용비늘 입하',
      body: '용비늘 {qty}장이 들어왔소. 장당 {unit}G, 모두 {total}G. 답하면 내일 아침 보내리다.',
    },
    {
      id: 'ws_gem', from: 'wholesaler', itemFrom: { newCategory: 'gem' }, qty: [1, 3], mult: [1.0, 1.15], w: 1,
      when: { day: { gte: 5 } },
      subject: '{item} 몇 알',
      body: '문 닫는 보석상이 {item} {qty}알을 넘겼소. 알당 {unit}G, 모두 {total}G. 시세는 알아서 보시오.',
    },
    {
      id: 'ws_pearl_spice', from: 'wholesaler', itemFrom: { rarity: '고급', notSupplied: true, includeSpecial: true }, qty: [2, 4], mult: [1.0, 1.15], w: 0.8,
      when: { day: { gte: 3 } },
      subject: '보기 드문 {item}',
      body: '항구 짐에 {item} {qty}개가 섞여 왔소. 도매 목록엔 없는 물건이오. 개당 {unit}G, 모두 {total}G.',
    },
    {
      id: 'dw_mithril', from: 'dwarf', item: 'mithril_ore', qty: [1, 2], mult: [1.0, 1.1], w: 1.2,
      when: { any: [{ var: 'rel_dwarf', gte: 3 }, { day: { gte: 7 } }] },
      subject: '미스릴 원석 {qty}개',
      body: '깊은 갱도에서 미스릴 원석 {qty}개가 나왔네. 개당 {unit}G, 모두 {total}G. 자네 가게라 넘기지.',
    },
    {
      id: 'dw_steel', from: 'dwarf', item: 'iron_sword', qty: [1, 2], mult: [0.95, 1.05], w: 1,
      when: { flag: 'dwarf_steel_unlocked' },
      subject: '씨족 대장간의 {item}',
      body: '새 합금으로 벼린 {item} {qty}자루가 있네. 자루당 {unit}G, 모두 {total}G.',
    },
    {
      id: 'dw_ore', from: 'dwarf', item: 'iron_ore', qty: [10, 20], mult: [0.75, 0.85], w: 1.5,
      subject: '철광석 헐값 정리',
      body: '철광석이 산더미라 헐값에 넘기네. {qty}개, 모두 {total}G.',
    },
    {
      id: 'sm_dragon_scale', from: 'smuggler', item: 'dragon_scale', qty: [1, 2], mult: [0.75, 0.9], w: 1,
      when: { day: { gte: 6 } }, onAccept: { vars: { blackmarket: 1.5 } },
      subject: '출처는 묻지 마쇼',
      body: '벤이오. 용비늘 {qty}장, 장당 {unit}G. 출처는 용한테 물어보쇼.',
    },
    {
      id: 'sm_gem', from: 'smuggler', itemFrom: { newCategory: 'gem' }, qty: [2, 4], mult: [0.7, 0.85], w: 1,
      when: { day: { gte: 6 } }, onAccept: { vars: { blackmarket: 1.5 } },
      subject: '반짝이는 것 좀 보쇼',
      body: '벤이오. {item} {qty}알, 알당 {unit}G, 모두 {total}G. 의심은 비싸니 하지 마쇼.',
    },
    {
      id: 'sm_poison', from: 'smuggler', item: 'poison_vial', qty: [3, 6], mult: [0.8, 0.95], w: 0.8,
      when: { day: { gte: 4 } }, onAccept: { vars: { blackmarket: 2 } },
      subject: '쥐약 좀 필요하쇼?',
      body: '벤이오. "쥐약" {qty}병, 병당 {unit}G. 진열대 앞에 둘 물건은 아니지.',
    },
    {
      id: 'sm_powder', from: 'smuggler', item: 'black_powder', qty: [2, 4], mult: [0.8, 0.95], w: 1,
      when: { flag: 'powder_invented' }, onAccept: { vars: { blackmarket: 2 } },
      subject: '천둥 가루',
      body: '벤이오. 학회에서 "잃어버린" 흑색 화약 {qty}통, 통당 {unit}G. 불 근처엔 두지 마쇼.',
    },
    {
      id: 'ws_fairy_dust', from: 'wholesaler', item: 'fairy_dust', qty: [3, 5], mult: [1.0, 1.15], w: 0.5,
      when: { day: { gte: 10 } },
      subject: '요정 가루 몇 병',
      body: '숲 가장자리 약초꾼이 요정 가루 {qty}병을 넘겼소. 병당 {unit}G, 모두 {total}G. 재채기 조심하시오.',
    },
    {
      id: 'tk_golem_core', from: 'tinker', item: 'golem_core', qty: [1, 2], mult: [1.0, 1.15], w: 0.5,
      when: { any: [{ flag: 'golem_workshop' }, { day: { gte: 14 } }] },
      subject: '남는 골렘 핵',
      body: '시험에 쓰고 남은 골렘 핵 {qty}개가 있소. 개당 {unit}G, 모두 {total}G. 밤에 째깍대도 놀라지 마시오.',
    },
  ],
  offerExpiredNote: '기한 지남',

  // ───────── "들어오면 알려 주오" (소원 — wish) ─────────
  // 귀한 물건을 찾는 손님이 물건이 없으면 선택지 효과 notify: { item, qty, mult } 로 소원을 남기고 떠난다
  // (customers.js wish_* 손님 — Effects.apply(eff, 손님) → Letters.addWish). 까마귀 전이면 까마귀가 올 때까지 기다린다.
  // 창고에 그 물건이 넉넉하면 편지 "들어왔다고 알리기"로 부르고, 이튿날 시세 × mult 값(적어도 × minMult)으로 사러 온다.
  wish: {
    mult: 1.6,          // notify.mult 가 없을 때의 웃돈 배율 (시세 × 수량 × 배율)
    minMult: 1.25,      // 다시 올 때 시세가 올라 있어도 적어도 이만큼은 쳐 준다
    ttl: 10,            // 까마귀가 온 뒤(또는 소원을 남긴 뒤) 이 날수가 지나면 다른 데서 구한다
    offerBoost: 5,      // 기다리는 물건의 공급 제안 가중치 배율
    offerChance: 0.6,   // 못 채운 소원이 있는 동안의 공급 제안 확률
    expired: { reputation: 0, rel: -1 },
    kept: { reputation: 1, rel: 2 },
    broken: { reputation: -2, rel: -3 },
    title: '들어왔다고 알리기',
    desc: '기다리는 손님을 부른다. 내일 웃돈을 얹어 사러 온다.',
    noneWhy: '물건을 기다리는 손님이 없소.',
    waitWhy: '아직 못 구한 물건 — {list}',
    sentSubject: '기별: {item} 들어왔소',
    sentBody: '찾던 {item} {qty}개가 들어왔소. 내일 들르시오.',
    returnGreets: [
      '기별 받고 왔소. {item} {qty}개, {offer}G에 주시오.',
      '까마귀 편지 받았소! {item} {qty}개, 약속대로 {offer}G요.',
    ],
    lines: {
      sold: ['기다린 보람이 있군. 잊지 않겠소.', '역시 이 가게요. 소문 내 두지.'],
      partial: '다는 없구려. 있는 만큼 가져가지.',
      refused: ['불러 놓고 없다니… 헛걸음이군.', '까마귀까지 보내 놓고? 다시는 안 믿겠소.'],
    },
    keptNews: '{name}이(가) "귀한 물건도 구해 주는 가게"라며 이 가게를 자랑하고 다닌다.',
    brokenNews: '{name}이(가) "불러 놓고 물건은 없는 가게"라며 상점가에서 투덜댔다.',
    expireSubject: '{item}은(는) 됐소',
    expireBody: [
      '{item}은(는) 다른 데서 구했소. 신경 써 줘서 고맙소.',
      '기다리다 지쳐 {item}은(는) 딴 데서 샀소. 다음에 또 보지.',
    ],
  },

  // ───────── "내일 구해 두겠소" 약속 ─────────
  promise: {
    playerLine: '내일까지 구해 둘 테니 다시 오시오.',
    replies: [
      '…좋소. 내일 다시 오지.',
      '약속이오? 믿어 보겠소.',
      '내일이라… 기다리지.',
    ],
    // 「내일 다시 오시오」에 대한 손님의 반응 — 세력(faction) 키로 나눠 둔다. 없는 세력은 default.
    //   rate: 받아들일 바탕 확률(우호도 rel_<세력> 이 높을수록 오른다) / partialRate: 받아들이지 않을 때 "있는 것만" 쪽으로 갈 몫
    //   accept: 받아들임 / partial: 있는 만큼만 사 가겠다(부분 판매) / leave: 그럼 됐소, 떠남
    // 헛걸음 — 일부러 다시 찾아왔는데 물건이 없을 때의 분노 (세력별). fast: 성급한 계열은 우호도 -3, 그 밖은 -2
    angry: {
      default: { rel: 2, lines: ['헛걸음을 시키다니, 시간 낭비했소.', '구해 둔다더니 이게 뭐요. 시간만 버렸소.'], calm: ['…됐소. 이번엔 이걸로 넘어가겠소.'] },
      kingdom: { rel: 2, lines: ['헛걸음을 시키다니 무례하오.', '규정을 어긴 것이나 다름없소. 실망이오.'], calm: ['…성의는 받아 두겠소.'] },
      goblin: { rel: 3, lines: ['킥! 또 없다구?! 두 번 걸음 시키냐!', '없어?! 없다구?! 이 가게 진짜 못 믿겠어!'], calm: ['킥, 그럼 이거라도 받아 간다. 다음엔 있어야 해.'] },
      merc: { rel: 3, lines: ['헛걸음이라니. 칼 뽑기 전에 말조심하시오.', '두 번은 안 참소. 물건이 없다니.'], calm: ['…덤이라니 이번만 넘어가겠소.'] },
      bandit: { rel: 3, lines: ['이 자식, 사람 갖고 노는 거냐!', '없어? 또? 손해는 네가 볼 거다.'], calm: ['…쳇, 이거라도 챙기지.'] },
      dwarf: { rel: 2, lines: ['흥, 약속을 한 입으로 두 번 하는 상인이 다 있나.', '헛걸음이오. 강철수염은 이걸 기억하오.'], calm: ['…덤은 받겠소. 다음엔 물건으로 봅시다.'] },
      village: { rel: 2, lines: ['또 없어요? 먼 길 왔는데…', '기다렸는데… 너무해요.'], calm: ['…그래요. 이거라도 감사히 받을게요.'] },
    },
    reactions: {
      default: { rate: 0.6, partialRate: 0.55,
        accept: ['…좋소. 내일 다시 오지.', '약속이오? 믿어 보겠소.', '내일이라… 기다리지.'],
        partial: ['내일까진 못 기다리오. 있는 것만이라도 주시오.', '있는 만큼이라도 사 가겠소.'],
        leave: ['그럼 됐소. 다른 데 가 보겠소.', '기다릴 시간 없소. 다른 가게로 가겠소.'] },
      kingdom: { rate: 0.3, partialRate: 0.85,
        accept: ['규정상 미루는 건 달갑지 않으나… 내일 다시 오겠소.'],
        partial: ['미룰 수 없소. 지금 있는 것만 받아 가겠소.', '있는 것만 넘기시오. 나머지는 다른 곳에서 구하겠소.'],
        leave: ['납품이 늦으면 곤란하오. 다른 상점에 맡기겠소.'] },
      goblin: { rate: 0.3, partialRate: 0.4,
        accept: ['흐음, 내일? 좋아. 속이면 안 돼.', '내일 온다. 물건 준비해라.'],
        partial: ['기다리기 싫다. 있는 것만 내놔.', '있는 거라도 줘. 값은 그만큼만 낸다.'],
        leave: ['안 기다린다. 다른 가게 간다.', '없으면 됐어. 딴 데 가.'] },
      merc: { rate: 0.3, partialRate: 0.5,
        accept: ['내일이라… 그때까진 안 굶어 죽겠지. 다시 오지.'],
        partial: ['시간이 없소. 있는 것만 챙겨 가겠소.'],
        leave: ['물건 없는 가게에 볼일 없소. 가겠소.'] },
      bandit: { rate: 0.25, partialRate: 0.4,
        accept: ['…내일이다. 허튼수작 하지 마라.'],
        partial: ['있는 것만 내놔. 시끄럽게 굴기 전에.'],
        leave: ['쳇, 시간 낭비했군.'] },
      village: { rate: 0.8, partialRate: 0.5,
        accept: ['그럼 내일 다시 올게요. 부탁드려요.', '내일이요? 네, 기다릴게요.'],
        partial: ['그럼 있는 것만이라도 주세요.'],
        leave: ['그럼 다른 데 가 볼게요…'] },
    },
    returnGreets: [
      '어제 말한 {item} {qty}개, {offer}G. 준비됐소?',
      '약속대로 왔소. {item} {qty}개, {offer}G에 주시오.',
      '어제 그 {item} {qty}개 말이오. {offer}G, 구해 놨소?',
    ],
    // 분류형 요청(값이 정해지지 않은 요청)으로 다시 온 손님
    returnGreetsNoPrice: [
      '어제 말한 {item} {qty}개, 준비됐소?',
      '약속대로 왔소. {item} {qty}개, 있겠지?',
    ],
    accusedGreetsNoPrice: [
      '경비대를 보낸 게 당신이오? …{item} {qty}개, 있소?',
    ],
    accusedGreets: [
      '경비대를 보낸 게 당신이오? …{item} {qty}개, {offer}G.',
    ],
    lines: {
      sold: [
        '약속을 지키는 가게로군. 기억하지.',
        '두 번 걸음 한 보람이 있소.',
      ],
      partial: '다 못 구했구려. 있는 만큼 가져가지.',
      refused: [
        '구해 둔다 하지 않았소? 헛걸음이군.',
        '허탕이로군. 다시는 안 오겠소.',
      ],
    },
    kept: { reputation: 1, rel: 1 },
    broken: { reputation: -2, rel: -2 },
    keptNews: '{name}이(가) "약속 지키는 가게"라며 동료들에게 이 가게를 권했다고 한다.',
    brokenNews: '{name}이(가) 상점가에서 "약속만 하고 물건은 없는 가게"라며 험담을 늘어놓았다.',
    ledgerAction: 'promised',
  },

  // 편지함 크기 제한
  maxInbox: 80,
  maxOutbox: 50,
};

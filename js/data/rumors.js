// 소문의 진위 (정보전) — 신문에 '❓ 소문' 뱃지로 실리는 기사. 일부는 헛소문이다.
// 엔진: js/systems/Rumors.js (NewsManager.compose 가 dawn() 을 부른다). 상태: WS.Game.state.rumors = { list: [...], seq }
//
// 규칙
//  · truth:false — 거짓 소문. 세계 변수·플래그·엔딩에는 아무 영향이 없다. 시세(market)만 days 동안 잠깐 흔들다가
//    정정 기사(after)와 함께 원위치. 믿고 사 둔 사람만 손해(도매가도 같이 오른다).
//  · truth:true  — 진짜 소문. 실제 사건(foreshadows = events.js id)의 전조다. 새 사건을 일으키지는 않는다 —
//    when 이 그 사건의 발동 조건 가까이에 있을 때만 나오도록 짜서 "곧 그렇게 될 만한 때"에만 사실로 확인된다.
//  · days: [최소, 최대] — 소문이 실린 뒤 정정/확인 기사가 나오기까지 며칠 (2~4일)
//  · market: { items|tags, mult } — 그 물건들의 시세(와 도매가) 배율. 소문이 열려 있는 동안만 (World.js Market.mult)
//  · hint: { fac, line } — 그 세력의 랜덤 손님이 가끔 인사말 끝에 흘리는 귀띔 (진실 쪽으로 기운다 — Rumors.tip)
//  · when: 조건 DSL — 거짓 소문은 "그렇지 않은 상태"에서, 진짜 소문은 "그런 조짐이 있는 상태"에서만
WS.data.rumorNews = {
  config: {
    from: 3,          // 이 날짜부터 나온다
    chance: 0.5,      // 새 소문이 실릴 확률 (열린 소문이 maxOpen 미만일 때만)
    maxOpen: 2,       // 동시에 열려 있는 소문 수
    lastBefore: 2,    // 마지막 이 며칠 전부터는 새 소문 없음
    unsureChance: 0.15, // 정보상이 "불확실"이라고 답할 확률
  },
  list: [
    // ───────── 진짜 소문 8 (실제 사건의 전조) ─────────
    {
      id: 'rm_war_mobilize', fac: 'kingdom', cat: '소문', truth: true, days: [2, 4], foreshadows: 'war_outbreak', weight: 1.4,
      when: { all: [{ var: 'goblin_power', gte: 19 }, { var: 'border_tension', gte: 12 }, { noFlag: 'war' }, { noFlag: 'goblin_victory' }, { noFlag: 'kingdom_victory' }] },
      text: '"서부 국경에 곧 동원령이 떨어진다"… 병영 술집 소문',
      after: '병영 창고 문 열려… 서부 국경 동원 준비, 소문대로였다',
      market: { tags: ['weapon', 'consumable'], mult: 1.2 },
      hint: { fac: 'kingdom', line: '(목소리를 낮추며) 병영 분위기가 심상치 않소. 그 소문, 완전히 헛말은 아닐 거요.' },
    },
    {
      id: 'rm_north_gather', fac: 'demonlord', cat: '소문', truth: true, days: [2, 4], foreshadows: 'demonlord_march', weight: 1.2,
      when: { all: [{ var: 'demonlord_power', gte: 24 }, { noFlag: 'demon_war' }, { noFlag: 'demonlord_repelled' }] },
      text: '북부 봉화대 "황무지에 검은 천막이 끝없다"는 전언',
      after: '북부 요새 "황무지 대군 집결 확인"… 전언은 사실이었다',
      market: { items: ['potion', 'shield', 'iron_sword'], mult: 1.18 },
      hint: { fac: 'kingdom', line: '북부 국경 순찰이 돌아오질 않는다고들 하오. 불길하오.' },
    },
    {
      id: 'rm_dead_graves', fac: 'undead', cat: '소문', truth: true, days: [2, 4], foreshadows: 'dead_march', weight: 1.2,
      when: { all: [{ var: 'undead_power', gte: 15 }, { noFlag: 'dead_repelled' }, { noFlag: 'vampires_saved_city' }] },
      text: '공동묘지 관리인 "무덤이 밤마다 비어 간다"',
      after: '공동묘지 빈 무덤 여럿 확인… 관리인 말이 맞았다',
      market: { items: ['holy_water', 'potion'], mult: 1.2 },
      hint: { fac: 'church', line: '묘지 쪽에서 밤마다 발소리가 난다는 신고가 끊이질 않습니다.' },
    },
    {
      id: 'rm_dragon_glow', fac: 'dragon', cat: '소문', truth: true, days: [2, 4], foreshadows: 'dragon_wakes', weight: 1.2,
      when: { all: [{ var: 'dragon_stir', gte: 8 }, { noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }] },
      text: '재의 산 정상이 밤마다 붉다… 광부들 "땅이 울린다"',
      after: '재의 산 진동 관측 기록 확인… "울린다"는 말, 사실이었다',
      market: { items: ['shield', 'plate_armor', 'iron_helmet'], mult: 1.2 },
      hint: { fac: 'dragon', line: '…산이 깨어날 채비를 하고 있소. 이건 소문이 아니오.' },
    },
    {
      id: 'rm_bandit_king', fac: 'bandit', cat: '소문', truth: true, days: [2, 4], foreshadows: 'bandit_king_rises', weight: 1.1,
      when: { all: [{ var: 'bandit_power', gte: 13 }, { day: { gte: 5 } }] },
      text: '가도 도적들이 "왕을 세운다"는 소문… 통행세 얘기도',
      after: '가도 도적 무리 결집 확인… 우두머리 추대 준비 사실',
      market: { items: ['bow', 'iron_sword'], mult: 1.16 },
      hint: { fac: 'bandit', line: '큰형님이 곧 크게 판을 짠다더군. …내가 한 말 아니오.' },
    },
    {
      id: 'rm_warband_drums', fac: 'orc', cat: '소문', truth: true, days: [2, 4], foreshadows: 'warband_descends', weight: 1.1,
      when: { all: [{ any: [{ var: 'warband_power', gte: 11 }, { var: 'monster_pop', gte: 36 }] }, { noFlag: 'warband_sighted' }, { day: { gte: 6 } }] },
      text: '북쪽 골짜기마다 북소리… "잿빛 엄니가 내려온다"',
      after: '북쪽 산맥 북소리 정찰대가 확인… 전투단 움직임 사실',
      market: { tags: ['weapon'], mult: 1.15 },
      hint: { fac: 'hunter', line: '산에서 짐승이 다 내려오고 있소. 뭔가에 쫓기는 거요.' },
    },
    {
      id: 'rm_tower_lightning', fac: 'mage', cat: '소문', truth: true, days: [2, 4], foreshadows: 'mage_grant', weight: 1.0,
      when: { all: [{ var: 'arcane_power', gte: 13 }, { day: { gte: 5 } }] },
      text: '은빛 탑 밤새 번개… "공간을 접는 실험을 한다"',
      after: '은빛 탑 "공간 접기 실험 준비 중" 시인… 소문은 사실',
      market: { items: ['mana_crystal', 'mana_potion', 'potion'], mult: 1.18 },
      hint: { fac: 'mage', line: '스승님 실험이 잘 되면… 아니, 아무것도 아닙니다.' },
    },
    {
      id: 'rm_dwarf_steel', fac: 'dwarf', cat: '소문', truth: true, days: [2, 4], foreshadows: 'dwarf_steel_unlock', weight: 1.0,
      when: { all: [{ var: 'dwarf_tech', gte: 12 }, { noFlag: 'dwarf_steel_unlocked' }, { noFlag: 'dwarf_fallen' }] },
      text: '드워프 공방 굴뚝에 푸른 불꽃… "새 강철이 곧 나온다"',
      after: '강철수염 공방 "시험 담금질 성공 직전" — 푸른 불꽃 소문 사실',
      market: { tags: ['weapon'], mult: 1.12 },
      hint: { fac: 'dwarf', line: '흠, 우리 공방 굴뚝 불이 이상한 색이라고? …곧 알게 될 걸세.' },
    },

    // ───────── 거짓 소문 12 (믿고 사 두면 손해) ─────────
    {
      id: 'rm_goblin_horde', fac: 'goblin', cat: '소문', truth: false, days: [2, 4], weight: 1.5,
      when: { all: [{ var: 'goblin_power', lt: 24 }, { noFlag: 'war' }, { day: { gte: 3 } }] },
      text: '"서부 숲 고블린 대군이 곧 수도로 남하한다"',
      after: '정정 — 왕국 정찰대 "대군은 없다", 숲의 북소리는 축제였다',
      market: { items: ['iron_sword', 'shield', 'bow'], mult: 1.28 },
      hint: { fac: 'goblin', line: '남하? 우린 그냥 노래 부르며 놀았을 뿐이오. 누가 그런 소릴.' },
    },
    {
      id: 'rm_dwarf_embargo', fac: 'dwarf', cat: '소문', truth: false, days: [2, 4], weight: 1.0,
      when: { all: [{ noFlag: 'dwarf_fallen' }, { noFlag: 'dwarf_contract_broken' }] },
      text: '"드워프 산채가 인간과 거래를 끊는다"는 술집 소문',
      after: '정정 — 강철수염 교역소 "거래는 이전과 같다" 공고',
      market: { tags: ['weapon'], mult: 1.22 },
      hint: { fac: 'dwarf', line: '거래를 끊다니 무슨 소린가. 우린 팔 게 많은데.' },
    },
    {
      id: 'rm_dwarf_no_ore', fac: 'dwarf', cat: '소문', truth: false, days: [2, 4], weight: 0.9,
      when: { all: [{ noFlag: 'dwarf_fallen' }, { noFlag: 'ore_hoard' }] },
      text: '"드워프가 광석 없이 강철을 만든다"… 철광석 값 폭락설',
      after: '정정 — 드워프 장로 "광석 없는 강철? 웃기는 소리"',
      market: { items: ['iron_ore'], mult: 0.72 },
      hint: { fac: 'dwarf', line: '광석 없이 강철을? 하하, 그게 되면 우리가 왜 캐겠나.' },
    },
    {
      id: 'rm_north_fort_fell', fac: 'demonlord', cat: '소문', truth: false, days: [2, 4], weight: 1.2,
      when: { all: [{ var: 'demonlord_power', lt: 30 }, { noFlag: 'demon_war' }, { day: { gte: 4 } }] },
      text: '"북부 요새 한 곳이 이미 함락됐다"… 역마차 마부 전언',
      after: '정정 — 북부 봉화대 "요새는 무사", 마부는 술이 과했다',
      market: { items: ['potion', 'shield', 'iron_sword'], mult: 1.3 },
      hint: { fac: 'kingdom', line: '요새가 함락? 방금 초소 교대가 왔는데 멀쩡하다더이다.' },
    },
    {
      id: 'rm_mist_crystal', fac: 'demon', cat: '소문', truth: false, days: [2, 4], weight: 1.0,
      when: { all: [{ var: 'demon_influence', lt: 24 }, { day: { gte: 5 } }] },
      text: '"안개 상단이 마력 결정을 싹쓸이한다"… 값 폭등설',
      after: '정정 — 마력 결정 창고는 가득, 폭등설은 투기꾼의 입',
      market: { items: ['mana_crystal', 'mana_potion', 'holy_water'], mult: 1.35 },
      hint: { fac: 'demon', line: '…결정을 싹쓸이? 우린 값을 올릴 필요가 없소. 팔기만 하면 되니.' },
    },
    {
      id: 'rm_church_ration', fac: 'church', cat: '소문', truth: false, days: [2, 4], weight: 1.0,
      when: { all: [{ var: 'undead_power', lt: 20 }, { day: { gte: 4 } }] },
      text: '"대성당이 성수를 배급제로 돌린다"는 신자들 사이 소문',
      after: '정정 — 대성당 "성수는 누구에게나", 배급 계획 없음',
      market: { items: ['holy_water'], mult: 1.42 },
      hint: { fac: 'church', line: '배급제요? 성수는 원하는 이에게 나누는 것입니다. 누가 그런 말을…' },
    },
    {
      id: 'rm_dragon_tonight', fac: 'dragon', cat: '소문', truth: false, days: [2, 4], weight: 1.1,
      when: { all: [{ var: 'dragon_stir', lt: 6 }, { noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { day: { gte: 5 } }] },
      text: '"재의 산 붉은 용이 오늘 밤 깨어난다"… 도시가 술렁',
      after: '정정 — 재의 산은 연기 한 줄뿐, 용은 코까지 골며 잔다',
      market: { items: ['shield', 'plate_armor', 'iron_helmet'], mult: 1.3 },
      hint: { fac: 'mage', line: '재의 산이요? 관측 기록엔 별 변화가 없습니다. 헛소문이에요.' },
    },
    {
      id: 'rm_bandit_thousand', fac: 'bandit', cat: '소문', truth: false, days: [2, 4], weight: 1.0,
      when: { all: [{ var: 'bandit_power', lt: 14 }, { day: { gte: 4 } }] },
      text: '"동쪽 가도에 도적 천 명이 모였다"… 상인들 발 묶여',
      after: '정정 — 가도 경비대 "도적은 고작 열댓", 천 명은 부풀린 말',
      market: { items: ['iron_sword', 'bow', 'shield'], mult: 1.25 },
      hint: { fac: 'bandit', line: '천 명이라니, 우리 식구 다 합쳐도 그렇게 못 채워.' },
    },
    {
      id: 'rm_pirate_fleet', fac: 'pirate', cat: '소문', truth: false, days: [2, 4], weight: 0.9,
      when: { all: [{ var: 'pirate_power', lt: 14 }, { day: { gte: 5 } }] },
      text: '"해적 함대 수십 척이 수도 앞바다에 나타났다"',
      after: '정정 — 항만청 "검은 돛은 어선 세 척", 수십 척은 안개 탓',
      market: { items: ['iron_sword', 'shield', 'potion'], mult: 1.24 },
      hint: { fac: 'traveler', line: '남쪽 바다를 지나왔는데 해적은 코빼기도 못 봤소이다.' },
    },
    {
      id: 'rm_mage_war', fac: 'mage', cat: '소문', truth: false, days: [2, 4], weight: 0.9,
      when: { all: [{ var: 'arcane_power', lt: 18 }, { day: { gte: 4 } }] },
      text: '"은빛 탑 마법사들이 전쟁을 준비한다"… 마나 물약 사재기',
      after: '정정 — 탑 "실험일 뿐 전쟁 아님", 사재기 물약은 도로 풀려',
      market: { items: ['mana_potion', 'mana_crystal', 'potion'], mult: 1.3 },
      hint: { fac: 'mage', line: '전쟁이라니요! 저흰 빨래 건조 마법이나 연구하는걸요.' },
    },
    {
      id: 'rm_guild_price', fac: 'guild', cat: '소문', truth: false, days: [2, 4], weight: 0.9,
      when: { all: [{ var: 'guild_grip', lt: 22 }, { day: { gte: 4 } }] },
      text: '"금저울 길드, 무기 통일가 곧 공표"… 헐값 처분 러시',
      after: '정정 — 길드 "그런 공고는 낸 적 없다", 처분 물량 되사기',
      market: { tags: ['weapon'], mult: 0.82 },
      hint: { fac: 'guild', line: '통일가? 길드가 그런 걸 냈다면 내가 제일 먼저 알았을 거요.' },
    },
    {
      id: 'rm_requisition', fac: 'kingdom', cat: '소문', truth: false, days: [2, 4], weight: 1.0,
      when: { all: [{ var: 'kingdom_power', lt: 46 }, { noFlag: 'war' }, { day: { gte: 4 } }] },
      text: '"왕국이 상점 방패를 전부 징발한다"는 소문… 사재기 조짐',
      after: '정정 — 재무대신 "징발령 없다", 방패 값 도로 내려',
      market: { items: ['shield', 'iron_helmet'], mult: 1.3 },
      hint: { fac: 'kingdom', line: '징발이오? 상부에서 그런 명은 받은 적 없소.' },
    },
  ],
};

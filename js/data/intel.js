// 대륙 정세 — 장부(아침 쪽 넘기기)의 '대륙 정세' 펼침이 보여 주는 세력 현황 · 지도 · 최근 사건의 데이터.
// 엔진: js/systems/Intel.js (계산) · js/ui/WorldView.js (그리기). 게임 상태는 바꾸지 않는다 — 세계 변수를 읽어 말로만 옮긴다.
//
// powers[]  세력 한 줄
//   score(w)   세력의 힘·기세를 한 숫자로 (w = 세계 변수 읽기). 정확한 값은 화면에 나오지 않고 steps 로 다섯 단계 말로만 보인다
//   steps      [a, b, c, d] — score 가 a 미만 미약 / b 미만 약함 / c 미만 팽팽 / d 미만 강함 / 그 이상 압도
//   eps        5일 사이 이만큼 움직여야 ▲▼ (아니면 —)
//   fac        손님 세력 id (st.met — 그 세력 손님을 한 번이라도 만났으면 알게 된다). rel 은 그 세력과 내 가게의 우호도(visit.var)
//   always     처음부터 아는 세력
//   known      조건 DSL — 맞으면 안다
//   keys       정규식 — 지금까지 신문 기사(newsArchive)에 이 낱말이 한 번이라도 나오면 안다
//   override   [{ when, word, level }] — 조건이 맞으면 단계 말·눈금을 덮어쓴다 (몰락 · 각성 …). level 없으면 눈금 0
//   blur       조건 DSL — 맞으면 단계를 감추고 '???' 로 흐리게 (용: 깨어나기 전엔 힘을 가늠할 수 없다)
WS.data.intel = {
  words: ['미약', '약함', '팽팽', '강함', '압도'],
  // 우호도 다섯 단계 — 관계 서랍(relationWords)과 같은 문턱, 이름만 정세 표기
  relTones: [[-15, '적대', 'hostile'], [-5, '냉담', 'cold'], [5, '중립', 'neutral'], [15, '우호', 'warm'], [999, '돈독', 'bond']],
  trendDays: 5,
  powers: [
    { id: 'kingdom', label: '루멘 왕국', icon: '👑', color: '#5b86d6', fac: 'kingdom', always: true, steps: [14, 26, 38, 52], eps: 2,
      score: w => w('kingdom_power') + (w('kingdom_morale') - 50) * 0.25 },
    { id: 'goblin', label: '서부 고블린', icon: '🪓', color: '#5f9a4a', fac: 'goblin', always: true, steps: [12, 22, 32, 44], eps: 1.5,
      score: w => w('goblin_power') + w('goblin_unity') * 0.35 },
    { id: 'dwarf', label: '강철수염 드워프', icon: '⚒️', color: '#b8863a', fac: 'dwarf', always: true, steps: [8, 16, 26, 40], eps: 1.2,
      score: w => w('dwarf_tech'),
      override: [{ when: { flag: 'dwarf_fallen' }, word: '몰락' }, { when: { flag: 'dwarf_golden_age' }, word: '황금기', level: 4 }] },
    { id: 'village', label: '동쪽 마을', icon: '🏘️', color: '#a39468', fac: 'village', always: true, steps: [2, 8, 16, 28], eps: 1,
      score: w => w('village_defense'),
      override: [{ when: { flag: 'village_fell' }, word: '괴멸' }] },
    { id: 'demonlord', label: '마왕군', icon: '🏴', color: '#7a2f3f', fac: 'demonlord', keys: ['마왕', '황무지', '검은 깃발', '북부 (요새|봉화)'], steps: [14, 24, 34, 46], eps: 1.5,
      score: w => w('demonlord_power') + w('invasion_risk') * 0.3,
      override: [{ when: { flag: 'demonlord_victory' }, word: '압도', level: 4 }] },
    { id: 'demon', label: '안개 상단', icon: '🌫️', color: '#8e9aae', fac: 'demon', keys: ['안개'], steps: [6, 14, 24, 34], eps: 1.5,
      score: w => w('demon_influence') },
    { id: 'church', label: '대성당 교단', icon: '⛪', color: '#a29368', fac: 'church', keys: ['대성당', '성당', '교단', '사제'], steps: [16, 24, 34, 46], eps: 1.5,
      score: w => w('church_authority') },
    { id: 'guild', label: '금저울 상인 길드', icon: '⚖️', color: '#c8a13a', fac: 'guild', keys: ['금저울', '상인 길드', '상인회'], steps: [10, 18, 28, 40], eps: 1.5,
      score: w => w('guild_grip') },
    { id: 'fairy', label: '동쪽 숲의 요정', icon: '🧚', color: '#7bbfa0', fac: 'fairy', keys: ['요정', '숲이 웃'], steps: [12, 20, 30, 42], eps: 1.5,
      score: w => w('fairy_grace') },
    { id: 'mage', label: '은빛 탑 마법사', icon: '🔮', color: '#8a6ac8', fac: 'mage', keys: ['은빛 탑', '마법사'], steps: [10, 16, 24, 34], eps: 1.2,
      score: w => w('arcane_power') },
    { id: 'merc', label: '붉은 늑대 용병단', icon: '🐺', color: '#b04a3a', fac: 'merc', keys: ['용병'], steps: [6, 12, 20, 30], eps: 1.5,
      score: w => w('merc_strength') },
    { id: 'bandit', label: '가도의 도적', icon: '🗡️', color: '#8a7050', fac: 'bandit', keys: ['도적'], steps: [8, 14, 22, 32], eps: 1.2,
      score: w => w('bandit_power') },
    { id: 'orc', label: '잿빛 엄니 전투단', icon: '🦷', color: '#6a7a68', fac: 'orc', keys: ['잿빛 엄니', '전투단', '오우거'], steps: [8, 14, 24, 34], eps: 1.2,
      score: w => w('warband_power') },
    { id: 'pirate', label: '남쪽 항구의 해적', icon: '🏴‍☠️', color: '#3a6a8a', fac: 'pirate', keys: ['해적', '검은 돛'], steps: [8, 14, 22, 32], eps: 1.2,
      score: w => w('pirate_power') },
    { id: 'vampire', label: '밤의 궁정', icon: '🦇', color: '#8a2a5a', fac: 'vampire', known: { flag: 'vampire_known' }, keys: ['흡혈', '이빨 자국', '밤의 궁정', '창백한'], steps: [8, 16, 26, 38], eps: 1.5,
      score: w => w('vampire_power') },
    { id: 'undead', label: '망자 · 사령 교단', icon: '💀', color: '#7a8a7a', fac: 'undead', keys: ['해골', '공동묘지', '잿빛 수의', '무덤'], steps: [4, 12, 22, 34], eps: 1.5,
      score: w => w('undead_power') },
    { id: 'dragon', label: '재의 산의 용', icon: '🐉', color: '#c8542a', fac: 'dragon', keys: ['재의 산', '붉은 용', '용비늘'], steps: [4, 8, 12, 16], eps: 1,
      score: w => w('dragon_stir'),
      blur: { all: [{ noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { noFlag: 'dragon_razed' }] },
      override: [{ when: { flag: 'dragon_slain' }, word: '쓰러짐' }, { when: { all: [{ flag: 'dragon_awake' }, { noFlag: 'dragon_slain' }] }, word: '각성', level: 4 }] },
    { id: 'liga', label: '천칭단', icon: '⚖', color: '#9aa7b8', fac: null, known: { any: [{ flag: 'liga_member' }, { customerSeen: 'liga_envoy' }, { customerSeen: 'liga_hooded' }] }, steps: [8, 16, 26, 40], eps: 2,
      // 저울의 기울기 = 주된 세력(관계의 절댓값이 큰 곳) 사이 우호도 (최고 − 최저) — World.balance().gap 과 같은 값
      score: w => { const L = WS.data.config.liga, xs = L.rels.map(v => w(v)).sort((a, b) => Math.abs(b) - Math.abs(a)).slice(0, L.mainCount); return Math.max(...xs) - Math.min(...xs); } },
  ],

  // 지도 — SVG 좌표(0~420 × 0~300). 장소는 세력이 알려졌을 때만 색이 든다 (모르면 점선 '?').
  //   power: 위 powers 의 id (알려짐·우호도를 따른다) / always: 처음부터 이름이 보인다 / rel: 우호도 변수 (없으면 회색)
  map: {
    w: 420, h: 300,
    places: [
      { id: 'capital', x: 210, y: 152, label: '수도 루멘', glyph: '왕', power: 'kingdom', rel: 'rel_kingdom', always: true, big: true },
      { id: 'forest_w', x: 58, y: 160, label: '서부 숲', glyph: '고', power: 'goblin', rel: 'rel_goblin', always: true },
      { id: 'mount_e', x: 352, y: 102, label: '동쪽 산맥', glyph: '드', power: 'dwarf', rel: 'rel_dwarf', always: true },
      { id: 'village', x: 334, y: 192, label: '동쪽 마을', glyph: '촌', power: 'village', rel: 'rel_village', always: true },
      { id: 'waste_n', x: 206, y: 40, label: '북부 황무지', glyph: '마', power: 'demonlord', rel: 'rel_demonlord' },
      { id: 'mist', x: 108, y: 222, label: '안개 낀 골목', glyph: '안', power: 'demon', rel: 'rel_demon' },
      { id: 'cathedral', x: 246, y: 120, label: '대성당', glyph: '성', power: 'church', rel: 'rel_church' },
      { id: 'guild', x: 176, y: 128, label: '길드 거리', glyph: '길', power: 'guild', rel: 'rel_guild' },
      { id: 'forest_e', x: 376, y: 240, label: '동쪽 숲', glyph: '요', power: 'fairy', rel: 'rel_fairy' },
      { id: 'tower', x: 132, y: 100, label: '은빛 탑', glyph: '탑', power: 'mage', rel: 'rel_mage' },
      { id: 'camp', x: 250, y: 184, label: '용병 천막', glyph: '병', power: 'merc', rel: 'rel_merc' },
      { id: 'road', x: 290, y: 150, label: '동쪽 가도', glyph: '도', power: 'bandit', rel: 'rel_bandit' },
      { id: 'mount_n', x: 96, y: 62, label: '북쪽 산맥', glyph: '엄', power: 'orc', rel: 'rel_orc' },
      { id: 'port', x: 248, y: 268, label: '남부 항구', glyph: '항', power: 'pirate', rel: 'rel_pirate' },
      { id: 'quarter', x: 180, y: 182, label: '귀족가', glyph: '밤', power: 'vampire', rel: 'rel_vampire' },
      { id: 'grave', x: 160, y: 248, label: '공동묘지', glyph: '망', power: 'undead', rel: 'rel_undead' },
      { id: 'ash', x: 392, y: 46, label: '재의 산', glyph: '용', power: 'dragon', rel: 'rel_dragon' },
      { id: 'scale', x: 62, y: 262, label: '천칭단', glyph: '칭', power: 'liga', rel: null },
    ],
    // 전선 — when 이 맞으면 화살표 (from → to 는 place id). 화살촉이 향하는 쪽이 밀고 들어오는 쪽
    fronts: [
      { id: 'war_w', when: { all: [{ flag: 'war' }, { var: 'war_progress', gte: 0 }] }, from: 'forest_w', to: 'capital', label: '서부 전선 — 고블린 우세', cls: 'hot' },
      { id: 'war_w2', when: { all: [{ flag: 'war' }, { var: 'war_progress', lt: 0 }] }, from: 'capital', to: 'forest_w', label: '서부 전선 — 왕국 우세', cls: 'hot' },
      { id: 'tension_w', when: { all: [{ noFlag: 'war' }, { noFlag: 'goblin_victory' }, { noFlag: 'kingdom_victory' }, { var: 'border_tension', gte: 20 }] }, from: 'forest_w', to: 'capital', label: '서부 국경 일촉즉발', cls: 'warn' },
      { id: 'war_n', when: { flag: 'demon_war' }, from: 'waste_n', to: 'capital', label: '북부 전선 — 마왕군 진군', cls: 'hot' },
      { id: 'tension_n', when: { all: [{ noFlag: 'demon_war' }, { noFlag: 'demonlord_victory' }, { var: 'invasion_risk', gte: 24 }] }, from: 'waste_n', to: 'capital', label: '북부 국경 봉화 점검', cls: 'warn' },
      { id: 'dragon', when: { all: [{ flag: 'dragon_awake' }, { noFlag: 'dragon_slain' }] }, from: 'ash', to: 'capital', label: '붉은 용, 도시로', cls: 'hot' },
      { id: 'dead', when: { any: [{ flag: 'undead_tide' }, { all: [{ flag: 'graves_opened' }, { var: 'undead_power', gte: 22 }, { noFlag: 'dead_repelled' }] }] }, from: 'grave', to: 'village', label: '해골 행렬', cls: 'warn' },
    ],
    // 색칠 — 영토가 바뀐 곳 (조건이 맞으면 그 장소 둘레가 색을 띤다)
    shades: [
      { place: 'forest_w', when: { any: [{ flag: 'west_goblin' }, { flag: 'goblin_victory' }] }, label: '고블린 영토', color: '#5f9a4a' },
      { place: 'waste_n', when: { flag: 'demonlord_victory' }, label: '검은 깃발', color: '#7a2f3f' },
      { place: 'village', when: { flag: 'village_fell' }, label: '폐허', color: '#555555' },
      { place: 'mount_e', when: { flag: 'dwarf_fallen' }, label: '함락', color: '#555555' },
    ],
    // 어느 세력에게 붙는 표시 (소식으로 확인된 것): 장소 옆 작은 글씨
    notes: [
      { place: 'capital', when: { flag: 'civil_war' }, text: '내전' },
      { place: 'capital', when: { flag: 'succession_crisis' }, text: '계승 다툼' },
    ],
  },
  // 연표에서 뺄 기사 분류 (정보성이 아닌 것)
  chronicleSkip: ['시세', '유행', '정정', '확인', '장부', '광고', '날씨', '생활'],
};

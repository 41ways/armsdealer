// 손님 외형 프리셋. customers.js / factions.js 의 look 필드가 여기를 가리킨다.
// ~s 로 끝나는 배열(skins, hairColors, bodyColors, beardColors)은 손님마다 시드로 하나 고른다.
// 나중에 AI로 뽑은 이미지가 생기면 손님 데이터에 sprite: 'assets/...png' 를 넣으면 이 대신 쓰인다.
WS.data.looks = {
  knight: {
    skin: '#e3ae88', eyes: '#35557f', ears: 'human', brows: '#6b4a2f',
    helmet: 'knight', helmetColor: '#aab4c0', plume: '#c23b2e',
    body: 'armor', bodyColor: '#98a3b0', tabard: '#2f58a8', trim: '#d9a441', mouth: 'plain', scar: true,
  },
  // 왕실 조달관 마르텔·특사 로델·감찰관 브란트·갑옷장 세드릭 — 레온과 다른, 더 나이 들고 격식 차린 왕실 관리들.
  // 그림은 시트(assets/sprites/knight_official.png), 이건 대비용
  knight_official: {
    skin: '#d8a888', eyes: '#3a2a1a', ears: 'human', brows: '#8a8a90',
    helmet: 'widehat', hatColor: '#2a2a40',
    body: 'noble', bodyColor: '#3a3a58', trim: '#c8a850', mouth: 'plain', wrinkles: true,
  },
  soldier: {
    skins: ['#e3ae88', '#c98f68', '#f0c2a0'], eyes: '#3a2a1a', ears: 'human', brows: '#4a3020',
    helmet: 'kettle', helmetColor: '#8d96a0',
    body: 'armor', bodyColor: '#7f8a96', tabard: '#2f58a8', trim: '#b8902e', mouth: 'plain',
  },
  // 왕국 병사 외형 다양화용 (factions.js k_soldier2) — soldier 대비 어둡고 다부진 색, 짧은 수염
  soldier2: {
    skins: ['#c98f68', '#a97350', '#d8a878'], eyes: '#2a1a12', ears: 'human', brows: '#2a1a10',
    beard: 'small', beardColors: ['#2a1a10', '#6a4a2a', '#8a8a90'],
    helmet: 'kettle', helmetColor: '#6a747c',
    body: 'armor', bodyColor: '#63707a', tabard: '#2f58a8', trim: '#8a8060', mouth: 'plain', scar: true,
  },
  adventurer: {
    skins: ['#f0c2a0', '#e3ae88', '#b97d58'], eyes: '#2f6a3a', ears: 'elf',
    hair: 'long', hairColors: ['#d8b25a', '#6a3a1e', '#2a1a14', '#b5541e', '#e6e0d0'],
    helmet: 'headband', band: '#3f8a4a',
    body: 'leather', bodyColors: ['#6a4a2e', '#4d5e3a', '#5a3a4a'], mouth: 'smile',
  },
  // 여관 하녀 리사 (customers.js lisa_thrall) — 안색이 창백하고 눈빛이 아련하다, 겉으론 평범한 하녀 차림.
  // 그림은 시트(assets/sprites/thrall.png), 이건 대비용
  thrall: {
    skin: '#e6dde2', eyes: '#7d8f9a', ears: 'human', hair: 'long', hairColor: '#c9c2b4',
    body: 'apron', bodyColor: '#4a3f52', apron: '#cfc7b8', mouth: 'plain',
  },
  hero: {
    skin: '#f0c2a0', eyes: '#3a6ab0', ears: 'human', hair: 'short', hairColor: '#e0bc5a',
    helmet: 'circlet', body: 'armor', bodyColor: '#c9ced6', tabard: '#b8322a', trim: '#e8c050', mouth: 'smile',
  },
  noble: {
    skin: '#ecb894', eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColor: '#5a3a22', beard: 'small', beardColor: '#5a3a22',
    body: 'noble', bodyColor: '#6a2440', trim: '#e0b040', mouth: 'plain',
  },
  // 왕실 전령 다리우스 (customers.js noble_courier) — 단정한 여행 망토, 급사 가방. 그림은 시트(assets/sprites/noble_courier.png), 이건 대비용
  noble_courier: {
    skin: '#e3ae88', eyes: '#2a2a1a', ears: 'human', hair: 'short', hairColor: '#2a1a14',
    body: 'cloak', bodyColor: '#2f4a6a', trim: '#c8a850', mouth: 'plain',
  },
  // 왕실 보급관 에드릭 (customers.js royal_quartermaster) — 나이 들고 통통한 관료, 장부·재고 담당. 그림은 시트(assets/sprites/noble_quartermaster.png), 이건 대비용
  noble_quartermaster: {
    skin: '#d8a888', eyes: '#4a3a2a', ears: 'human', hair: 'short', hairColor: '#8a8a90', beard: 'small', beardColor: '#8a8a90',
    body: 'noble', bodyColor: '#4a3a2a', trim: '#b89040', mouth: 'plain', wrinkles: true,
  },
  // 천칭단원 (customers.js liga_envoy) — 비밀 결사, 저울 문양 브로치. 그림은 시트(assets/sprites/liga_member.png), 이건 대비용
  liga_member: {
    skin: '#d8b090', eyes: '#2a2a2a', ears: 'human', hair: 'short', hairColor: '#1a1a1a',
    body: 'cloak', bodyColor: '#241f2a', trim: '#c8a850', mouth: 'plain',
  },
  goblin_raider: {
    goblin: true, skins: ['#7fa05a', '#6b8f4a', '#8aa860', '#6f9448'], ears: 'goblin', mouth: 'fangs',
    body: 'leather', bodyColors: ['#5a3e28', '#4a3422', '#6a4a30'], spikes: true, paint: '#b8322a', earring: true,
  },
  // 고블린 전사 외형 다양화용 (factions.js g_raider2) — 누런 피부, 뼈 문신, 다른 전투 물감
  goblin_raider2: {
    goblin: true, skins: ['#9a8a3a', '#8a7a2e', '#a89848'], ears: 'goblin', mouth: 'fangs', scar: true,
    body: 'leather', bodyColors: ['#3a2e1a', '#2e2412', '#4a3a20'], spikes: true, paint: '#d8d0c0', earring: true,
  },
  goblin_trader: {
    goblin: true, skins: ['#8aa860', '#7fa05a', '#94b068'], ears: 'goblin', mouth: 'grin',
    body: 'tunic', bodyColors: ['#7a5a3a', '#6a4a6a', '#3e5a6a'], earring: true, helmet: 'cap', capColor: '#a0402a',
  },
  goblin_envoy: {
    goblin: true, skin: '#5e7f45', ears: 'goblin', mouth: 'fangs',
    body: 'leather', bodyColor: '#3a2a1e', spikes: true, helmet: 'bonecrown', necklace: true, paint: '#e0d8c0', earring: true,
  },
  dwarf: {
    skins: ['#e2a47e', '#d4926c', '#c98260'], eyes: '#2a1a12', ears: 'human', brows: '#5a2a10',
    beard: 'big', beardColors: ['#b5541e', '#7a4a22', '#5a3a1a', '#9a9088'],
    helmet: 'dwarf', helmetColor: '#8d8578',
    body: 'apron', bodyColors: ['#7a3b2a', '#4a5a6a', '#5a4a3a'], apron: '#4e321c',
  },
  // 드워프 대장장이 외형 다양화용 (factions.js d_smith2) — 짙은 회색 수염, 검푸른 작업복
  dwarf2: {
    skins: ['#c98260', '#b5714e', '#e2a47e'], eyes: '#3a2410', ears: 'human', brows: '#2a1408',
    beard: 'big', beardColors: ['#2a2420', '#5a5048', '#8a8a90'],
    helmet: 'dwarf', helmetColor: '#5a5248',
    body: 'apron', bodyColors: ['#2e4a5a', '#5a3a2a', '#3a4a30'], apron: '#3a281a',
  },
  // 장로 투르가 (customers.js dwarf_elder_offer/_thanks/_broken) — 늙은 씨족 장로, 길게 땋은 백발 수염, 소박한 전통 예복.
  // 그림은 시트(assets/sprites/dwarf_elder.png), 이건 대비용
  dwarf_elder: {
    skin: '#d4926c', eyes: '#2a1a12', ears: 'human', brows: '#c8c0b4',
    beard: 'big', beardColor: '#d8d4c8',
    helmet: 'none',
    body: 'tunic', bodyColor: '#4a5a4a', wrinkles: true, mouth: 'plain',
  },
  // 브론(대장장이, customers.js d1_dwarf/dwarf_supplier)과 갑옷장이 두린(wish_mithril) — 그을음 묻은 중년 대장장이, 가죽 앞치마.
  // 그림은 시트(assets/sprites/dwarf_smith.png), 이건 대비용
  dwarf_smith: {
    skins: ['#d4926c', '#c98260'], eyes: '#2a1a12', ears: 'human', brows: '#5a2a10',
    beard: 'big', beardColors: ['#7a4a22', '#5a3a1a'],
    helmet: 'none',
    body: 'apron', bodyColors: ['#7a3b2a', '#5a4a3a'], apron: '#4e321c',
  },
  elder: {
    skin: '#d8a080', eyes: '#3a2a1a', ears: 'human', hair: 'sides', hairColor: '#e8e2d6', brows: '#d8d0c4',
    beard: 'small', beardColor: '#e8e2d6', body: 'tunic', bodyColor: '#6a5a3a', wrinkles: true, mouth: 'plain',
  },
  // 약초꾼 마사 (customers.js tut_goods) — 마을 약초꾼, 실용적이고 볕에 그을린 옷차림. 그림은 시트(assets/sprites/herbalist.png), 이건 대비용
  herbalist: {
    skin: '#d8a878', eyes: '#3a4a2a', ears: 'human', hair: 'long', hairColor: '#6a4a2a',
    body: 'tunic', bodyColor: '#5a6a3a', trim: '#8a6a3a', wrinkles: true, mouth: 'plain',
  },
  // 별지기 오르나 (customers.js wish_star) — 언덕 위 늙은 천문가, 짙은 남색 로브에 별빛 같은 은장식.
  // 그림은 시트(assets/sprites/star_keeper.png), 이건 대비용
  star_keeper: {
    skin: '#d0a888', eyes: '#5a6a9a', ears: 'human', hair: 'sides', hairColor: '#d8d4cc', brows: '#c8c4bc',
    body: 'robe', bodyColor: '#22284a', trim: '#c8d0e8', wrinkles: true, mouth: 'plain',
  },
  hunter: {
    skins: ['#e3ae88', '#c98f68'], eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColors: ['#6a3a1e', '#2a1a14', '#b5541e'],
    helmet: 'straw', body: 'tunic', bodyColors: ['#4a6a3a', '#6a5a3a', '#5a4a3a'], mouth: 'plain',
  },
  inspector: {
    skin: '#eab896', eyes: '#2a1a14', ears: 'human', hair: 'long', hairColor: '#2a1a14',
    helmet: 'widehat', hatColor: '#1e1a2a', body: 'robe', bodyColor: '#2a2440', trim: '#c0a060', monocle: true, mouth: 'plain',
  },
  // 조사관 필라 (customers.js marga_inspector) — 벨라와 같은 왕국 감찰관이지만 더 젊고 갈색 머리, 외투 색이 다르다.
  // 그림은 시트(assets/sprites/inspector_pila.png), 이건 대비용
  inspector_pila: {
    skin: '#e8c0a0', eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColor: '#8a5a2a',
    helmet: 'widehat', hatColor: '#3a1e1e', body: 'robe', bodyColor: '#4a1e2a', trim: '#c8a060', monocle: true, mouth: 'plain',
  },
  // 감찰관 테오 (customers.js office_inspector) — 제보처 담당, 수염을 길렀고 짙은 녹색 외투. 그림은 시트(assets/sprites/inspector_theo.png), 이건 대비용
  inspector_theo: {
    skin: '#c08860', eyes: '#2a2a2a', ears: 'human', hair: 'short', hairColor: '#1a1a1a', beard: 'small', beardColor: '#1a1a1a',
    helmet: 'widehat', hatColor: '#242038', body: 'robe', bodyColor: '#1e3a2e', trim: '#8a9060', wrinkles: true, mouth: 'plain',
  },
  hooded: {
    skin: '#b08060', eyes: '#d8d0a8', ears: 'none', helmet: 'hood', hoodColor: '#2a2630', mask: '#1a171e',
    body: 'cloak', bodyColor: '#2a2630',
  },
  // 암시장의 큰손 (smuggling.js smuggle_bigshot) — 두건 밑 금반지. 그림은 시트(assets/sprites/smuggle_lord.png), 이건 대비용
  smuggle_lord: {
    skin: '#b08060', eyes: '#d8d0a8', ears: 'none', helmet: 'hood', hoodColor: '#241f28', mask: '#141116',
    body: 'cloak', bodyColor: '#241f28', trim: '#e0b040',
  },
  mage: {
    skin: '#e8b898', eyes: '#3a4a8a', ears: 'human', hair: 'sides', hairColor: '#d8d4cc', brows: '#c8c4bc',
    beard: 'small', beardColor: '#d8d4cc', helmet: 'widehat', hatColor: '#2a3a6a',
    body: 'robe', bodyColor: '#34407a', trim: '#e0c050', wrinkles: true, mouth: 'plain',
  },
  paladin: {
    skin: '#f0c8a8', eyes: '#3a6ab0', ears: 'human', hair: 'long', hairColor: '#f0e0a8', brows: '#c8b070',
    helmet: 'circlet', body: 'armor', bodyColor: '#e0e4ea', tabard: '#f4f0e0', trim: '#d8a830', mouth: 'plain',
  },
  // ───────── 악마 / 마왕군 ─────────
  // horns: 'curved' | 'ram' | 'spike' | 'great' / hornColor / glowEyes: 흰자 없이 빛나는 눈 / fangs: 송곳니
  demon: {
    skins: ['#b8323a', '#8a2a6a', '#a03050', '#7a3a8a'], eyes: '#ffd23a', glowEyes: true, ears: 'elf', brows: '#1a0a10',
    hair: 'short', hairColors: ['#1a1018', '#2a1a2a', '#e8e0d8'], horns: 'curved', hornColor: '#2a2024',
    body: 'noble', bodyColors: ['#1e1a24', '#2a1430', '#3a1420'], trim: '#d0a040', mouth: 'smile', fangs: true,
  },
  demon_noble: {
    skin: '#8a3a7a', eyes: '#ffd23a', glowEyes: true, ears: 'elf', brows: '#1a0a14',
    hair: 'long', hairColor: '#e8e4ec', horns: 'ram', hornColor: '#3a2a26',
    body: 'robe', bodyColor: '#3a1a4a', trim: '#e0b040', monocle: true, mouth: 'smile', fangs: true,
  },
  demon_herald: {
    skin: '#5a4a5a', eyes: '#ff5a2a', ears: 'none', helmet: 'horned', helmetColor: '#3a3238', horns: 'great', hornColor: '#d8ccb4',
    body: 'armor', bodyColor: '#34303a', tabard: '#6a0e1e', trim: '#a01a2a', spikes: true,
  },
  demon_soldier: {
    skins: ['#6a5a6a', '#5a4a3a'], eyes: '#ff3a2a', ears: 'none', helmet: 'skull', helmetColor: '#d8ccb4',
    body: 'armor', bodyColors: ['#3a3438', '#2e2a30', '#403028'], trim: '#6a1a22', spikes: true,
  },
  demon_king: {
    skin: '#4a3a5a', eyes: '#ff2a2a', glowEyes: true, ears: 'elf', brows: '#0a0408',
    hair: 'long', hairColor: '#0e0a12', horns: 'great', hornColor: '#1a1418',
    helmet: 'bonecrown', body: 'cloak', bodyColor: '#140a12', mouth: 'plain', fangs: true,
  },

  // ───────── 확장 세력 ─────────
  // 새 기능 플래그: wings(날개 색) / collar(세운 옷깃 색) / tusks(엄니) / eyepatch(안대) / faceMask(복면 색)
  //   goggles: 'forehead' | 'eyes' / dragon(용 머리) + scales(비늘 색) / blankFace(코·입 없는 얼굴)
  //   helmet: 'pointy'(고깔) | 'tricorn'(삼각모) | 'crown'(왕관) | 'mitre'(주교관) | 'turban'(터번) | 'bandana'(두건)
  fairy: {
    skins: ['#f6dce8', '#e8f0d8', '#f0e0f8'], eyes: '#3a8a5a', ears: 'elf', brows: '#a07a9a',
    hair: 'long', hairColors: ['#f0c8e8', '#c8f0d8', '#f8f0b0', '#b8d8ff'],
    wings: '#cfeefa', helmet: 'circlet', body: 'robe', bodyColors: ['#6aa05a', '#8ab860', '#5a9a8a'], trim: '#f0e080', mouth: 'smile',
  },
  fairy_queen: {
    skin: '#f4e8f4', eyes: '#6a3ab0', ears: 'elf', brows: '#c0a0c8', hair: 'long', hairColor: '#e8e0ff',
    wings: '#e8d8ff', helmet: 'crown', crownColor: '#c8e8a0', body: 'robe', bodyColor: '#4a7a4a', trim: '#e0f0a0', mouth: 'plain',
  },
  guild_mage: {
    skins: ['#e8b898', '#d8a888', '#f0c8a8'], eyes: '#5a3a8a', ears: 'human', hair: 'sides', hairColors: ['#8a8a90', '#5a3a22', '#d8d4cc'],
    beard: 'small', beardColors: ['#8a8a90', '#5a3a22', '#d8d4cc'], helmet: 'pointy', hatColor: '#4a2a6a', trim: '#e0c050',
    body: 'robe', bodyColors: ['#4a2a6a', '#2a3a6a', '#5a1a4a'], mouth: 'plain',
  },
  mercenary: {
    skins: ['#e3ae88', '#c98f68', '#a87050'], eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColors: ['#2a1a14', '#6a3a1e', '#8a8070'],
    body: 'armor', bodyColors: ['#6a6058', '#5a5048', '#707880'], tabard: '#8a2a1e', trim: '#3a2a1a', mouth: 'plain', scar: true,
  },
  merc_captain: {
    skin: '#c98f68', eyes: '#2a1a12', ears: 'human', hair: 'long', hairColor: '#3a2a22', beard: 'small', beardColor: '#3a2a22',
    body: 'armor', bodyColor: '#4a4440', tabard: '#8a2a1e', trim: '#c8a040', eyepatch: true, mouth: 'plain', scar: true,
  },
  // 성벽 수비대장 브란트 (customers.js wall_captain) — 왕국 수비대의 단정한 정규 장교, 용병단장 바르고보다 격식 차리고 단단한 인상.
  // 그림은 시트(assets/sprites/wall_captain.png), 이건 대비용
  wall_captain: {
    skin: '#d8a888', eyes: '#2a3a5a', ears: 'human', hair: 'short', hairColor: '#2a2420', brows: '#2a2420',
    helmet: 'kettle', helmetColor: '#9aa4b0',
    body: 'armor', bodyColor: '#7f8a96', tabard: '#2f58a8', trim: '#c8a040', mouth: 'plain', wrinkles: true,
  },
  lodge_hunter: {
    skins: ['#e3ae88', '#c98f68', '#f0c2a0'], eyes: '#3a4a2a', ears: 'human', hair: 'long', hairColors: ['#6a3a1e', '#2a1a14', '#9a9088'],
    helmet: 'widehat', hatColor: '#3a2a1a', body: 'leather', bodyColors: ['#4a3a2a', '#3a4a2a'], mouth: 'plain', scar: true,
  },
  // 조합원 데스 (customers.js hunter_inquiry_lisa) — 젊은 추적자, 조합장 쥬드보다 마르고 날렵하며 경계하는 인상.
  // 그림은 시트(assets/sprites/hunter_scout.png), 이건 대비용
  hunter_scout: {
    skins: ['#e3ae88', '#f0c2a0'], eyes: '#4a5a2a', ears: 'human', hair: 'short', hairColors: ['#2a1a14', '#6a3a1e'],
    helmet: 'headband', band: '#3a4a2a', body: 'leather', bodyColors: ['#3a4a2a', '#4a3a2a'], mouth: 'plain',
  },
  vampire: {
    skins: ['#ece8f0', '#e0dce8', '#f0e8e8'], eyes: '#e0283a', glowEyes: true, ears: 'elf', brows: '#1a0a10',
    hair: 'short', hairColors: ['#14101a', '#2a1a2a', '#e8e0d8'], collar: '#5a0e1e',
    body: 'noble', bodyColors: ['#14101a', '#2a0e1a', '#1a1a2a'], trim: '#c0a060', mouth: 'smile', fangs: true,
  },
  vampire_count: {
    skin: '#f0ecf4', eyes: '#ff2a3a', glowEyes: true, ears: 'elf', brows: '#d8d0d8', hair: 'long', hairColor: '#e8e4ec',
    collar: '#6a0e1e', body: 'noble', bodyColor: '#1a0a14', trim: '#e0b040', monocle: true, mouth: 'smile', fangs: true,
  },
  necromancer: {
    skins: ['#c8c0b0', '#b8b0a8'], eyes: '#7aff6a', ears: 'none', helmet: 'hood', hoodColor: '#1e2a1e',
    body: 'robe', bodyColors: ['#1e2a1e', '#2a2a2a'], trim: '#8ac070',
  },
  skeleton: {
    skin: '#e0d8c4', eyes: '#6affc0', ears: 'none', helmet: 'skull', helmetColor: '#e0d8c4',
    body: 'armor', bodyColors: ['#5a4a3a', '#4a4a4a'], trim: '#3a2a1a',
  },
  dragon: {
    skin: '#a8321e', scales: '#7a1e10', eyes: '#ffc02a', dragon: true, ears: 'none', horns: 'spike', hornColor: '#e6dcc4',
    body: 'robe', bodyColor: '#5a1a14', trim: '#e0b040',
  },
  kobold: {
    skins: ['#a86a3a', '#8a5a2a', '#b87a4a'], eyes: '#ffe04a', dragon: true, ears: 'none', horns: 'curved', hornColor: '#d8ccb4',
    body: 'tunic', bodyColors: ['#6a4a2a', '#5a3a4a'],
  },
  guild_merchant: {
    skins: ['#ecb894', '#e0a888', '#f0c8a8'], eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColors: ['#5a3a22', '#2a1a14', '#9a9088'],
    beard: 'small', beardColors: ['#5a3a22', '#2a1a14', '#9a9088'], helmet: 'widehat', hatColor: '#1e3a24',
    body: 'noble', bodyColors: ['#1e4a2a', '#2a3a1e'], trim: '#e0c050', monocle: true, mouth: 'smile',
  },
  // 매입관 클라우스 (customers.js guild_iron_agent) — 길드장 오르신보다 수수하고 실무적인 중간급 감정사, 장부·저울 인상.
  // 그림은 시트(assets/sprites/guild_agent.png), 이건 대비용
  guild_agent: {
    skins: ['#ecb894', '#e0a888'], eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColors: ['#5a3a22', '#2a1a14'],
    body: 'tunic', bodyColors: ['#3a4a5a', '#4a3a2a'], trim: '#c8a850', mouth: 'plain',
  },
  fence: {
    skins: ['#c09070', '#a88060'], eyes: '#d8c890', ears: 'none', helmet: 'hood', hoodColor: '#1c1a1e', mask: '#3a2a2a',
    body: 'cloak', bodyColors: ['#1c1a1e', '#2a2226'],
  },
  syndicate_boss: {
    skin: '#e0b090', eyes: '#2a1a12', ears: 'human', hair: 'short', hairColor: '#0e0a0a', brows: '#0e0a0a',
    body: 'noble', bodyColor: '#141014', trim: '#a0a0a8', scar: true, mouth: 'smile',
  },
  priest: {
    skins: ['#ecc0a0', '#e0b090'], eyes: '#3a4a6a', ears: 'human', hair: 'sides', hairColors: ['#d8d4cc', '#8a8070'],
    helmet: 'mitre', hatColor: '#f4f0e4', trim: '#d8a830', body: 'robe', bodyColor: '#f0ece0', mouth: 'plain', wrinkles: true,
  },
  inquisitor: {
    skin: '#d8b090', eyes: '#e8e0c0', ears: 'none', helmet: 'hood', hoodColor: '#6a0e14',
    body: 'robe', bodyColor: '#5a0e14', trim: '#e0c050',
  },
  noble_lord: {
    skins: ['#ecb894', '#f0c8a8'], eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColors: ['#5a3a22', '#c8a050', '#2a1a14'],
    beard: 'small', beardColors: ['#5a3a22', '#c8a050', '#2a1a14'], body: 'noble', bodyColors: ['#4a1a5a', '#1a2a5a', '#5a1a1a'], trim: '#e0c050', mouth: 'plain',
  },
  // 차려입은 신사 (customers.js court_physician) — 실은 왕궁 시의, 수수하고 단정한 의사 차림. 그림은 시트(assets/sprites/physician.png), 이건 대비용
  physician: {
    skin: '#e8c8a8', eyes: '#3a3a3a', ears: 'human', hair: 'short', hairColor: '#4a4a4a',
    body: 'robe', bodyColor: '#2a3038', trim: '#5a6068', mouth: 'plain', wrinkles: true,
  },
  noble_lady: {
    skins: ['#f0c8a8', '#ecb894'], eyes: '#3a5a8a', ears: 'human', hair: 'long', hairColors: ['#c8a050', '#6a3a1e', '#1a1418'],
    helmet: 'circlet', body: 'noble', bodyColors: ['#6a2a6a', '#2a4a7a'], trim: '#e0c050', mouth: 'smile',
  },
  prince: {
    skin: '#ecb894', eyes: '#3a6ab0', ears: 'human', hair: 'short', hairColor: '#c8a050', helmet: 'crown',
    body: 'armor', bodyColor: '#c9ced6', tabard: '#6a1a2a', trim: '#e8c050', mouth: 'plain', scar: true,
  },
  princess: {
    skin: '#f4d0b0', eyes: '#3a6a5a', ears: 'human', hair: 'long', hairColor: '#e0c070', helmet: 'crown',
    body: 'noble', bodyColor: '#f0ece0', trim: '#5a8ad0', mouth: 'plain',
  },
  bandit: {
    skins: ['#e3ae88', '#c98f68', '#b07a58'], eyes: '#2a1a12', ears: 'human', brows: '#2a1a12',
    helmet: 'bandana', hatColor: '#a0282a', faceMask: '#3a2a22', body: 'leather', bodyColors: ['#4a3a2a', '#3a3028'], mouth: 'plain',
  },
  bandit_chief: {
    skin: '#c98f68', eyes: '#2a1a12', ears: 'human', hair: 'long', hairColor: '#1a1210', beard: 'small', beardColor: '#1a1210',
    helmet: 'bandana', hatColor: '#1a1a1a', eyepatch: true, body: 'leather', bodyColor: '#3a2a1e', spikes: true, mouth: 'plain', scar: true,
  },
  orc: {
    skins: ['#7a8a5a', '#6a7a5a', '#8a8a6a', '#5a6a4a'], eyes: '#e0b020', ears: 'elf', brows: '#2a2a1a',
    hair: 'short', hairColors: ['#1a1a14', '#3a2a1a'], tusks: true, body: 'leather', bodyColors: ['#4a3a2a', '#3a2e22'], spikes: true, mouth: 'plain', scar: true,
  },
  orc_chief: {
    skin: '#6a7a4a', eyes: '#ff8a20', ears: 'elf', brows: '#1a1a10', hair: 'long', hairColor: '#1a1410', tusks: true,
    helmet: 'bonecrown', body: 'armor', bodyColor: '#4a4440', trim: '#8a2a1e', spikes: true, necklace: true, mouth: 'plain', scar: true,
  },
  pirate: {
    skins: ['#c98f68', '#b07a58', '#e3ae88'], eyes: '#2a1a12', ears: 'human', hair: 'long', hairColors: ['#1a1210', '#6a3a1e', '#8a2a1e'],
    beard: 'small', beardColors: ['#1a1210', '#6a3a1e', '#8a2a1e'], helmet: 'tricorn', hatColor: '#1e1a1e',
    body: 'tunic', bodyColors: ['#8a2a2a', '#2a3a5a', '#e0d8c8'], mouth: 'smile',
  },
  pirate_captain: {
    skin: '#b07a58', eyes: '#2a1a12', ears: 'human', hair: 'long', hairColor: '#1a1210', beard: 'small', beardColor: '#1a1210',
    helmet: 'tricorn', hatColor: '#140e14', trim: '#e0b040', eyepatch: true, body: 'noble', bodyColor: '#6a1a1a', mouth: 'smile', scar: true,
  },
  alchemist: {
    skins: ['#e8b898', '#d8a888'], eyes: '#3a6a3a', ears: 'human', hair: 'sides', hairColors: ['#e8e2d6', '#a05a2a', '#5a5a5a'],
    goggles: 'forehead', body: 'apron', bodyColors: ['#4a6a4a', '#5a4a6a'], apron: '#6a5a3a', mouth: 'smile', wrinkles: true,
  },
  // 케셀 박사 (돌팔이 연금술사 — customers.js alchemist_kessel). 그림은 시트(assets/sprites/kessel.png), 이건 대비용
  kessel: {
    skin: '#e0a882', eyes: '#3a6a8a', ears: 'human', hair: 'sides', hairColor: '#4a4a4a',
    goggles: 'forehead', body: 'apron', bodyColor: '#3e2e44', apron: '#5a4a3a', mouth: 'smile', wrinkles: true,
  },
  golem_smith: {
    skins: ['#e2a47e', '#c98260'], eyes: '#2a1a12', ears: 'human', beard: 'big', beardColors: ['#6a6a6a', '#9a5a2a'],
    goggles: 'eyes', body: 'apron', bodyColors: ['#6a5a3a', '#4a4a5a'], apron: '#3a2a1a',
  },
  // 인형술사 핍 (customers.js wish_golem) — 공방장 헤파보다 왜소하고 기발한 태엽인형 장인, 확대경과 정밀한 손.
  // 그림은 시트(assets/sprites/puppeteer.png), 이건 대비용
  puppeteer: {
    skin: '#e8c0a0', eyes: '#5a3a7a', ears: 'human', hair: 'sides', hairColor: '#8a5a3a',
    goggles: 'forehead', body: 'apron', bodyColor: '#5a4a6a', apron: '#7a6040', mouth: 'smile',
  },
  golem: {
    skin: '#b08040', eyes: '#6ae0ff', blankFace: true, ears: 'none',
    body: 'armor', bodyColor: '#a07838', trim: '#6ae0ff',
  },
  traveler: {
    skins: ['#b07a58', '#c98f68', '#8a5a3a'], eyes: '#2a1a12', ears: 'human', beard: 'small', beardColors: ['#1a1210', '#e8e2d6'],
    helmet: 'turban', hatColor: '#e8dcc0', body: 'cloak', bodyColors: ['#b8883a', '#6a4a8a', '#3a6a6a'], mouth: 'smile',
  },
  stranger: {
    skin: '#c8d0e8', eyes: '#14121e', blankFace: true, ears: 'none',
    body: 'robe', bodyColor: '#2a3050', trim: '#c8d8ff',
  },
  // ??? (customers.js star_visitor) — 밤에 별조각을 들고 오는 정체불명의 방문객. 얼굴은 끝까지 보이지 않아야 한다.
  // 그림은 시트(assets/sprites/star_visitor.png), 이건 대비용
  star_visitor: {
    skin: '#1a1830', eyes: '#cfe8ff', glowEyes: true, blankFace: true, ears: 'none',
    helmet: 'hood', hoodColor: '#0e0c1c',
    body: 'cloak', bodyColor: '#0e0c1c', trim: '#9fd8ff',
  },
  // ── 개인 얼굴 (2026-09-24 완성도 점검) — 이름 있는 손님마다 자기 얼굴. 그림은 시트(assets/sprites/<id>.png), 아래는 시트가 안 왔을 때의 대비용 ──
  kassim: {
    skin: '#a87850', eyes: '#2a1a12', ears: 'none', beard: 'small', beardColor: '#1a1210',
    helmet: 'hood', hoodColor: '#3a1a22', mask: '#1a171e', body: 'cloak', bodyColor: '#3a1a22', mouth: 'plain',
  },
  gem_thief: {
    skin: '#d8c0a0', eyes: '#2a2a2a', ears: 'none', helmet: 'hood', hoodColor: '#2f5a34', mask: '#1a171e',
    body: 'tunic', bodyColor: '#6a5238', mouth: 'smile',
  },
  fake_knight: {
    skin: '#c98f68', eyes: '#3a2a1a', ears: 'human', brows: '#2a1a10', helmet: 'kettle', helmetColor: '#8d96a0',
    body: 'armor', bodyColor: '#7f8a96', tabard: '#a8b0c0', trim: '#8a8060', mouth: 'smile', scar: true,
  },
  disguised_buyer: {
    skin: '#d8c4ae', eyes: '#6a6a72', ears: 'human', hair: 'sides', hairColor: '#7a6a5a', brows: '#6a5a4a',
    body: 'cloak', bodyColor: '#8a8a90', mouth: 'smile', wrinkles: true,
  },
  court_poisoner: {
    skin: '#e8dcd0', eyes: '#2a2a2a', ears: 'human', hair: 'short', hairColor: '#1a1414',
    body: 'noble', bodyColor: '#4a1f4a', trim: '#c0c0d0', mask: '#f0ece4', mouth: 'plain',
  },
  militia_forager: {
    skin: '#b88660', eyes: '#3a2a1a', ears: 'human', beard: 'small', beardColor: '#3a2a1a',
    helmet: 'kettle', helmetColor: '#6a4a2a', body: 'leather', bodyColor: '#6a4a2e', mouth: 'smile', scar: true,
  },
  liga_hooded: {
    skin: '#d8b090', eyes: '#3a3a3a', ears: 'human', beard: 'small', beardColor: '#9a9a9a',
    helmet: 'hood', hoodColor: '#484850', mask: '#1a171e', body: 'cloak', bodyColor: '#484850', mouth: 'plain', wrinkles: true,
  },
  marga: {
    skin: '#c08c68', eyes: '#3a2a1a', ears: 'human', helmet: 'hood', hoodColor: '#7a4a2a', mask: '#1a171e',
    body: 'tunic', bodyColor: '#a89878', mouth: 'smile',
  },
  pin: {
    skin: '#e8c09c', eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColor: '#b88a48', brows: '#8a6a3a',
    body: 'apron', bodyColor: '#e0d0b0', apron: '#8a6a3a', mouth: 'plain',
  },
  crow_keeper: {
    skin: '#e6d4c4', eyes: '#2a2a2a', ears: 'human', hair: 'short', hairColor: '#1a1414',
    body: 'cloak', bodyColor: '#3a3a44', mouth: 'plain',
  },
  goth: {
    skin: '#c88c6c', eyes: '#3a2a1a', ears: 'human', brows: '#4a4a4a', helmet: 'headband', band: '#2a2018',
    body: 'apron', bodyColor: '#a89880', apron: '#6a4226', mouth: 'plain',
  },
  widow_eda: {
    skin: '#d8b090', eyes: '#5a5a6a', ears: 'none', helmet: 'hood', hoodColor: '#2a242c', mask: '#1a171e',
    body: 'tunic', bodyColor: '#2a242c', mouth: 'plain', wrinkles: true,
  },
  oswin: {
    skin: '#e0c0a0', eyes: '#4a4a5a', ears: 'human', hair: 'sides', hairColor: '#e8e2d6', beard: 'small', beardColor: '#cfc8bc',
    helmet: 'hood', hoodColor: '#b8a888', mask: '#1a171e', body: 'cloak', bodyColor: '#b8a888', mouth: 'plain', wrinkles: true,
  },
  caravan_master: {
    skin: '#b0603a', eyes: '#2a1a12', ears: 'human', brows: '#1a1210', helmet: 'turban', hatColor: '#c8b48a',
    body: 'cloak', bodyColor: '#6a4a2e', mouth: 'smile',
  },
  redford_orto: {
    skin: '#c8a080', eyes: '#3a2a1a', ears: 'human', hair: 'short', hairColor: '#3a2a1a', beard: 'small', beardColor: '#2a1a12',
    body: 'tunic', bodyColor: '#a89878', mouth: 'plain', scar: true,
  },
};

// look 이 지정되지 않은 손님은 종족으로 추정
WS.data.lookByRace = {
  인간: 'soldier', 고블린: 'goblin_raider', 드워프: 'dwarf', '안개 상인': 'stranger', 악마: 'demon', 마족: 'demon_soldier', // 악마: 옛 저장 호환
  요정: 'fairy', 흡혈귀: 'vampire', 언데드: 'skeleton', 용: 'dragon', 오크: 'orc', 골렘: 'golem', '???': 'stranger',
};

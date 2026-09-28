// 결말 줄기 사이를 채우는 이야기 손님·기사 (trade — 산업 · 상인 · 뒷골목). 기존 데이터에 덧붙이기만 한다.
// 필수 손님(엔딩 조건을 채우는 손님) 사이에 "아, 이 이야기가 흘러가고 있구나" 싶은 사람 몇과 신문 몇 줄.
// 결말 조건은 건드리지 않는다 — 선택지가 있어도 세계 변수를 조금 밀거나 이야기용 깃발(tr_*)만 남긴다.
//
//   강철의 시대      산채에서 내려온 부상 광부(전령 전) → 용광로 불지기(납품 1번 뒤) → 강철수염 칼을 찾는 기사(납품 2번 뒤) · 교역소 편지
//   톱니의 시대      태엽장이 견습(공방 전) → 시제품 방패 시험(공방 뒤) → 일감 잃은 짐꾼 → 골렘 군단 뒤 방패를 팔러 온 용병
//   천둥의 시대      그을린 연구생(발명 전) → 발파꾼 드워프(독점권 뒤) → 어부(해적이 화약을 산 뒤) → 칼을 넘기는 늙은 칼장이(천둥의 시대 뒤)
//   밀수왕          망보는 사내(닉스 전) → 경비대 장물 대조반(짐을 받은 뒤 — 왕국 손님이라 장물을 넘기면 걸린다) → 털린 상인 → 큰손의 눈
//   두 번째 붉은여울  늙은 파수꾼(에다 전) → 가렛의 심부름꾼 → 짐마차꾼(동업 뒤) → 불탄 마을 피난민(습격 뒤)
//   완벽한 장부      금화를 두 배로 낸 종자 → 장부 한 줄을 지우자는 세리 보좌 → 길드 공증인의 "깨끗한 장부" 명단
//   밀고자          고맙다는 경비병(첫 적중 뒤) → 생선 장수의 경고(제보처 뒤) → 끌려간 짐꾼의 아내
//   균형의 수호자     저울 고치는 노인 → 저울 문양의 여인(소라껍데기가 운 뒤) → 천칭단 노인(끝 무렵)
//   청출어람        빵집 주인 → 장부를 배우고 싶은 핀 → 브론 공방 도제(진로 상담 전) → 새 주인 핀의 첫 단골
//
// 한꺼번에 몰리지 않게: 이 파일의 손님은 다녀가며 tr_beat 깃발을 남기고, 다음 손님은 그 뒤 이틀이 지나야 온다 (시한이 짧은 둘은 예외).
// 날짜 조건 { day } 는 이야기 날짜(40일 기준 — Conditions.eday). 가능하면 깃발 · 세계 변수 · 앞 손님을 봤는지로 잇는다.
(() => {
  const C = WS.data.customers;
  const E = WS.data.events;
  const K = WS.data.config.smuggling;

  // 다녀간 표시 — 효과에 tr_beat 를 얹는다
  const B = (eff = {}) => ({ ...eff, flags: (eff.flags || []).concat('tr_beat') });
  // 이 파일의 다른 손님이 다녀간 지 이틀은 지났다
  const calm = { since: { flag: 'tr_beat', days: 2 } };
  const w = (...conds) => ({ all: conds.concat(calm) });

  const dwarfContractLive = [{ flag: 'dwarf_contract' }, { noFlag: 'dwarf_contract_broken' }];
  const powderLive = [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }, { noFlag: 'powder_reported_late' }];
  const stashLive = [{ flag: 'smuggle_route' }, { noFlag: 'smuggle_burned' }, { noFlag: 'smuggle_king_accepted' }];
  const pinHere = [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }];
  const ligaLive = [{ flag: 'liga_member' }, { noFlag: 'liga_failed' }];

  C.push(
    // ════════════════════ 강철의 시대 ════════════════════
    {
      // 전령(pleaDay)보다 먼저 — 산채가 왜 광석을 청하는지 몸으로 보여 준다
      id: 'tr_dwarf_wounded', look: 'dwarf2', name: '광부 그림', race: '드워프', job: '강철수염 산채 광부 (팔에 붕대)', faction: 'dwarf', portrait: '🩹',
      spawn: { chance: 0.6, when: w({ day: { gte: 11 } }, { noFlag: 'dwarf_saved' }, { noFlag: 'dwarf_fallen' }, { not: { customerSeen: 'dwarf_herald' } }) },
      greet: '산채에서 내려왔네. 잿빛 엄니 놈들이 성문 밑을 파고 있다네. {item} {qty}병, {offer}G일세.',
      request: { item: 'potion', qty: 3, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '허허, 이걸로 성벽 위 녀석들 며칠은 버티겠군.', partial: '있는 만큼이라도 지고 올라가겠네.', refused: '…빈손으로 산을 올라야 하나.' },
      onSell: B({ vars: { rel_dwarf: 1 }, news: [{ cat: '드워프', text: '강철수염 광부들 부상자 업고 하산… "성문 밑에서 곡괭이 소리"' }] }),
      onRefuse: B(),
    },
    {
      // 납품을 한 번 한 뒤 — 내가 댄 광석으로 용광로가 다시 탄다
      id: 'tr_dwarf_furnace', look: 'dwarf', name: '불지기 욘', race: '드워프', job: '강철수염 용광로 불지기', faction: 'dwarf', portrait: '🔥',
      spawn: { chance: 0.6, when: w(...dwarfContractLive, { var: 'dwarf_deliveries', gte: 1 }, { noFlag: 'dwarf_golden_age' }) },
      greet: '용광로 불지기 욘이네. 자네 광석 덕에 불이 다시 붙었지. 쇳물이 튀어서 {item} {qty}개가 필요하다네. {offer}G일세.',
      request: { item: 'iron_helmet', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '허허, 이제 불 앞에서 눈썹 걱정은 덜겠군.', partial: '하나라도 고맙네. 둘이 번갈아 쓰지.', refused: '그럼 젖은 가죽이라도 덮어써야지.' },
      onSell: B({ vars: { rel_dwarf: 1 } }),
      onRefuse: B(),
    },
    {
      // 납품 두 번 뒤 — 강철수염 쇠가 다시 돈다는 소문이 왕국까지 닿았다
      id: 'tr_steel_knight', look: 'soldier2_b', name: '기사 오웬', race: '인간', job: '왕국 기사 (강철검을 찾는다)', faction: 'kingdom', portrait: '⚔️',
      spawn: { chance: 0.5, when: w(...dwarfContractLive, { var: 'dwarf_deliveries', gte: 2 }) },
      greet: '강철수염 쇠가 다시 돈다길래 왔소. 산채에 광석을 대는 집이 여기라지. {item} {qty}자루, {offer}G.',
      request: { item: 'iron_sword', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '다음엔 강철수염 각인이 찍힌 걸로 부탁하오.', partial: '한 자루라도 받겠소.', refused: '…산채에 직접 가 봐야겠군.' },
      onSell: B(),
      onRefuse: B(),
    },

    // ════════════════════ 톱니의 시대 ════════════════════
    {
      // 공방이 서기 전 — 드워프 기술과 마법사 연구가 같이 오를 때
      id: 'tr_tinker_apprentice', look: 'puppeteer', name: '태엽장이 롤로', race: '인간', job: '은빛 탑 견습 (태엽 연구)', faction: 'mage', portrait: '⚙️',
      spawn: { chance: 0.35, when: w({ day: { gte: 10 } }, { var: 'dwarf_tech', gte: 12 }, { var: 'arcane_power', gte: 13 }, { noFlag: 'golem_workshop' }) },
      greet: '태엽 심장에 마력을 먹이면 인형이 혼자 걸을 거예요. {item} {qty}개, {offer}G요!',
      request: { item: 'mana_crystal', qty: 2, offer: { mult: 1.05 }, partialOk: true },
      lines: { sold: '째깍! 오늘 밤엔 세 걸음은 걸을 거예요.', partial: '하나로도 한 걸음은 걷겠죠.', refused: '탑 창고에서 몰래 꺼내 와야겠네요….' },
      onSell: B({ news: [{ cat: '생활', text: '광장에 태엽 개 한 마리 혼자 걸어 다녀… 주인은 은빛 탑 견습생' }] }),
      onRefuse: B(),
    },
    {
      // 공방이 선 뒤, 군단 전 — 시제품에 방패를 달아 본다
      id: 'tr_golem_shield_test', look: 'golem_smith', name: '시험관 브라스', race: '인간', job: '청동심장 공방 시험관', faction: 'golem', portrait: '🔧',
      spawn: { chance: 0.6, when: w({ flag: 'golem_workshop' }, { noFlag: 'golem_army' }) },
      greet: '시제품 7호, 팔에 방패를 단다. {item} {qty}개. {offer}G. 모자라면 불성립.',
      request: { item: 'shield', qty: 3, offer: { mult: 1 }, partialOk: false },
      lines: { sold: '수령 확인. 7호가 오늘 성벽을 걷는다.', refused: '불성립. 7호는 맨팔로 걷겠군.', needAll: '셋이어야 하오. 팔이 셋이오.' },
      onSell: B({ vars: { golem_tech: 1 }, news: [{ cat: '드워프', text: '청동심장 공방 시제품, 방패 들고 성벽 걷기 시험… 병사들 구경' }] }),
      onRefuse: B(),
    },
    {
      // 골렘 짐꾼이 늘자 일감을 잃은 사람
      id: 'tr_porter_jobless', look: 'traveler', name: '짐꾼 오도', race: '인간', job: '일감 잃은 짐꾼', faction: 'village', portrait: '🧺',
      spawn: { chance: 0.5, when: w({ flag: 'golem_workshop' }, { var: 'golem_tech', gte: 6 }) },
      greet: '공방 청동 짐꾼이 들어온 뒤로 일감이 뚝 끊겼어요. 사냥이라도 해야죠. {item} {qty}개, {offer}G요.',
      request: { item: 'bow', qty: 1, offer: { mult: 0.95 }, partialOk: true },
      lines: { sold: '고마워요. 청동 짐꾼은 토끼는 못 잡겠죠.', refused: '…그럼 뭘 해 먹고 살죠.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 골렘 군단이 선 뒤 — 군단이 누구 손에 들어갔는지에 따라 말이 다르다 (events.js golem_army outcomes)
      id: 'tr_golem_aftermath', look: 'mercenary', name: '용병 카를', race: '인간', job: '일감 잃은 용병', faction: 'merc', portrait: '🛡️', kind: 'sell',
      spawn: { chance: 0.7, when: w({ flag: 'golem_army' }) },
      greet: '골렘이 광산에 들어가고부터 호위 일감이 말랐다. {item} {qty}개, {offer}G에 넘긴다.',
      greetWhen: [
        { when: { flag: 'golem_kingdom' }, text: '왕국이 청동 골렘을 성벽에 세웠다. 칼잡이는 필요 없대. {item} {qty}개, {offer}G에 가져가.' },
        { when: { flag: 'golem_guild' }, text: '길드가 골렘 백 기로 호위를 바꿨다. 호위 용병은 끝났지. {item} {qty}개, {offer}G에 넘긴다.' },
        { when: { flag: 'golem_demonlord' }, text: '청동 행렬이 북쪽으로 가더라. 누구 손에 들어갔는지 생각하면 잠이 안 와. {item} {qty}개, {offer}G.' },
      ],
      request: { item: 'shield', qty: 2, price: 40 },
      lines: { bought: '이걸로 한 달은 먹겠군. 톱니 놈들.', declined: '고철상으로 가야겠군.' },
      onBuy: B(),
      onRefuse: B(),
    },

    // ════════════════════ 천둥의 시대 ════════════════════
    {
      // 발명 전 — 증류탑에서 "쾅" 소리가 잦아진다
      id: 'tr_singed_alchemist', look: 'alchemist', name: '그을린 연구생 필로', race: '인간', job: '녹색 증류탑 연구생 (눈썹이 없다)', faction: 'alchemist', portrait: '🧪',
      spawn: { chance: 0.35, when: w({ day: { gte: 8 } }, { var: 'alchemy_progress', gte: 9 }, { noFlag: 'powder_invented' }) },
      greet: '눈썹이 왜 이러냐고? 케셀 박사 실험실이 또 "쾅" 했다네. {item} {qty}개, {offer}G. 박사 말로는 거의 다 왔다더군.',
      request: { item: 'alchemy_reagent', qty: 4, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '고맙네. 이번엔 창문을 열어 두고 하겠네.', partial: '있는 만큼이라도. 박사는 기다려 주질 않네.', refused: '흠, 박사한테 또 한 소리 듣겠군.' },
      onSell: B({ news: [{ cat: '사건', text: '녹색 증류탑 창문 또 깨져… 학회 "천둥 비슷한 소리, 실험은 순조"' }] }),
      onRefuse: B(),
    },
    {
      // 독점 판매상이 된 뒤 — 해적 말고도 화약을 찾는 사람들
      id: 'tr_quarry_blaster', look: 'dwarf', name: '발파꾼 돌기', race: '드워프', job: '채석장 발파꾼', faction: 'dwarf', portrait: '🪨',
      spawn: { chance: 0.5, when: w(...powderLive) },
      greet: '허허, 곡괭이로 한 달 걸릴 바위를 한 통으로 깬다더군. {item} {qty}통, {offer}G일세.',
      request: { item: 'black_powder', qty: 3, offer: { mult: 1.05 }, partialOk: true },
      lines: { sold: '불씨는 멀리 두겠네. 허허, 수염이 아까우니.', partial: '한 통이라도. 바위 반쪽은 깨지겠지.', refused: '그럼 곡괭이로 한 달일세.' },
      onSell: B({ vars: { dwarf_tech: 1 }, news: [{ cat: '드워프', text: '드워프 채석장서 천둥… "검은 가루 한 통에 바위 반쪽"' }] }),
      onRefuse: B(),
    },
    {
      // 해적이 화약을 사 간 뒤 — 밤바다에서 대포 소리
      id: 'tr_harbor_fisher', look: 'hunter', name: '어부 네드', race: '인간', job: '항구 어부', faction: 'village', portrait: '🎣',
      spawn: { chance: 0.6, when: w({ sold: { faction: 'pirate', item: 'black_powder', min: 4, trades: true } }, { noFlag: 'powder_age' }) },
      greet: '밤바다에서 천둥이 쳐요. 소금까마귀 배가 대포를 시험한대요. 뱃전에 걸게 {item} {qty}개, {offer}G요.',
      request: { item: 'shield', qty: 1, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '이걸로 막아질지는 모르겠지만요.', refused: '…그물이나 기우러 가야겠네요.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 천둥의 시대가 열린 뒤 — 칼장이가 칼을 내려놓는다
      id: 'tr_old_swordsmith', look: 'elder', name: '늙은 칼장이 베른', race: '인간', job: '마흔 해 칼을 벼린 대장장이', faction: 'village', portrait: '🗡️', kind: 'sell',
      spawn: { chance: 0.7, when: w({ flag: 'powder_age' }) },
      greet: '칼의 시대는 끝났다더군. 대포 한 방에 성문이 날아가는데. {item} {qty}자루, {offer}G에 넘기겠소.',
      request: { item: 'iron_sword', qty: 3, price: 90 },
      lines: { bought: '잘 써 주시오. 쇠는 거짓말을 안 하오.', declined: '…녹여서 쟁기나 만들어야겠군.' },
      onBuy: B(),
      onRefuse: B(),
    },

    // ════════════════════ 밀수왕 ════════════════════
    {
      // 닉스가 오기 전 — 뒷골목이 이 가게를 눈여겨본다
      id: 'tr_alley_lookout', look: 'bandit', name: '망보는 사내', race: '인간', job: '뒷골목 망꾼', faction: 'bandit', portrait: '👀',
      spawn: { chance: 0.4, when: w({ day: { gte: 8 } }, { var: 'blackmarket', gte: K.unlock.blackmarket - 4 }, { var: 'rel_bandit', gte: 1 },
        { noFlag: 'smuggle_route' }, { noFlag: 'smuggle_burned' }, { not: { customerSeen: 'smuggle_fence' } }) },
      greet: '닉스 형님이 입 무거운 가게를 찾더라. {item} {qty}개, {offer}G. …난 아무 말도 안 했다.',
      request: { item: 'bow', qty: 2, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '입 무거운 가게 맞네. 형님한테 그렇게 전하지.', partial: '이것뿐이야? 됐어.', refused: '흥, 깐깐한 가게라고 전하지.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 장물을 받은 뒤 — 왕국 경비대가 칼을 사러 온다. 여기에 장물을 섞어 넘기면 반드시 걸린다 (config.smuggling.detect)
      id: 'tr_stash_guard', look: 'soldier_b', name: '경비병 한센', race: '인간', job: '왕국 경비대 장물 대조반', faction: 'kingdom', portrait: '📋',
      spawn: { chance: 0.5, when: w(...stashLive) },
      greet: '경비대 장물 대조반이오. 목록 돌리는 김에 {item} {qty}자루 사 가겠소. {offer}G. …각인은 하나하나 보겠소.',
      request: { item: 'iron_sword', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '각인 깨끗하군. 좋은 가게요.', partial: '한 자루라도 받겠소.', refused: '…칼 가게가 칼을 안 판다? 적어 두겠소.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 첫 짐이 비고 닉스가 다음 짐을 들고 온 뒤 — 장물의 주인
      id: 'tr_robbed_merchant', look: 'guild_merchant', name: '털린 상인 요스트', race: '인간', job: '금저울 길드 행상 (짐마차를 털렸다)', faction: 'guild', portrait: '📦', kind: 'talk',
      spawn: { chance: 0.6, when: w({ customerSeen: 'smuggle_fence_return' }, { noFlag: 'smuggle_burned' }) },
      ask: { tag: '수소문', note: '털린 짐마차의 칼' },
      greet: '가도에서 짐마차를 털렸소. 내 각인이 찍힌 칼이 이 골목에서 돈다던데… 혹시 본 적 있소?',
      choices: [
        { id: 'none', label: '못 봤소', reply: '…그렇소. 경비대 목록에 이름을 올려 두겠소.', effects: B() },
        { id: 'tip', label: '뒷골목 얘기를 해 준다', reply: '고맙소. 경비대에 그대로 전하겠소.',
          effects: B({ vars: { rel_bandit: -2, blackmarket: -1, integrity: 1 }, flags: ['tr_tipped_merchant'] }) },
      ],
    },
    {
      // 장물을 여러 번 넘긴 뒤, 큰손이 오기 전 — 누가 이 가게를 재 본다
      id: 'tr_bigshot_eye', look: 'hooded', name: '금반지 낀 손님', race: '인간', job: '두건 밑으로 금반지가 번쩍인다', faction: 'traveler', trueFaction: 'bandit', portrait: '💍',
      spawn: { chance: 0.6, when: w(...stashLive, { var: 'illegal_sale_count', gte: 6 }, { noFlag: 'smuggle_king_offered' }) },
      suspicious: true,
      affil: { claim: null, seal: 'none', line: '소속이라… 큰손 밑이라고만 해 두지.' },
      greet: '{item} {qty}병, {offer}G. …큰손께서 이 가게 얘길 하시더군. 짐이 깨끗하게 빠진다고.',
      request: { item: 'potion', qty: 2, offer: { mult: 1.3 }, partialOk: true },
      lines: { sold: '(금반지를 만지작거린다) 곧 다시 보지.', partial: '이것뿐인가. 뭐, 됐소.', refused: '흠. 큰손께 그대로 전하겠소.' },
      onSell: B(),
      onRefuse: B(),
    },

    // ════════════════════ 두 번째 붉은여울 ════════════════════
    {
      // 옛 장부가 나온 뒤, 에다가 오기 전 — 그날을 기억하는 사람
      id: 'tr_redford_veteran', look: 'elder_b', name: '늙은 파수꾼 오스', race: '인간', job: '붉은여울 옛 파수꾼', faction: 'village', portrait: '🏮',
      spawn: { chance: 0.45, when: w({ day: { gte: 15 } }, { customerSeen: 'carpenter_ledger' }, { not: { customerSeen: 'widow_eda' } }) },
      greet: '스무 해 전 붉은여울 파수꾼이었소. 불탄 칼자루마다 같은 각인이 있었지. …{item} {qty}병, {offer}G 주시오.',
      request: { item: 'potion', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '그 각인을 아직도 꿈에서 보오.', partial: '하나면 됐소.', refused: '…그 가게 서랍엔 아직 뭐가 남았으려나.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 가렛이 오기 전 — 심부름꾼이 먼저 들른다 (가렛의 편지 무렵)
      id: 'tr_garret_runner', look: 'bandit', name: '낯선 심부름꾼', race: '인간', job: '누군가의 심부름꾼', faction: 'traveler', trueFaction: 'bandit', portrait: '🗝️', kind: 'talk',
      spawn: { chance: 0.6, when: w({ day: { gte: 22 } }, { customerSeen: 'carpenter_ledger' }, { noFlag: 'old_ledger_reported' }, { not: { customerSeen: 'garret_return' } }) },
      suspicious: true,
      affil: { claim: null, seal: 'none', line: '가렛 어른 사람이다. 인장 같은 거 없어.' },
      ask: { tag: '전갈', note: '뒷문 자물쇠' },
      greet: '가렛 어른 심부름이다. 뒷문 자물쇠, 아직 옛날 그대로냐고 물으시더라.',
      choices: [
        { id: 'same', label: '그대로요', reply: '어른이 좋아하시겠네. 곧 들르신대.', effects: B() },
        { id: 'changed', label: '바꿨다고 전하시오', reply: '…그렇게 전하지. 어른은 자물쇠 따는 것도 잘하셔.', effects: B({ flags: ['tr_lock_changed'] }) },
      ],
    },
    {
      // 가렛과 동업한 뒤, 짐마차가 떠나기 전 (사나흘) — 시한이 짧아 쉬는 틈을 따지지 않는다
      id: 'tr_wagon_driver', look: 'bandit', name: '짐마차꾼', race: '인간', job: '가렛의 짐마차꾼', faction: 'traveler', trueFaction: 'bandit', portrait: '🐴',
      spawn: { chance: 0.8, when: { all: [{ flag: 'garret_partner' }, { noFlag: 'garret_raid' }, { noFlag: 'garret_caught' }] } },
      suspicious: true,
      affil: { claim: null, seal: 'none', line: '짐마차꾼한테 무슨 인장이야.' },
      greet: '가렛 어른 짐마차에 실을 거다. {item} {qty}개, {offer}G. 어디로 가냐고? 동쪽 여울 쪽. 더는 묻지 마.',
      request: { item: 'bow', qty: 3, offer: { mult: 1.2 }, partialOk: true },
      lines: { sold: '바퀴에 헝겊 감고 밤에 떠난다.', partial: '모자란 건 칼로 채우지.', refused: '어른한테 이르겠다. 동업이라며?' },
      onSell: B({ vars: { bandit_power: 1 } }),
      onRefuse: B(),
    },
    {
      // 습격이 난 뒤, 에다가 오기 전 — 시한이 짧아 쉬는 틈을 따지지 않는다
      id: 'tr_raid_survivor', look: 'traveler_b', name: '그을린 피난민', race: '인간', job: '불탄 동쪽 마을에서 왔다', faction: 'village', portrait: '🔥',
      spawn: { chance: 0.8, when: { all: [{ flag: 'garret_raid' }, { not: { customerSeen: 'eda_curse' } }] } },
      poor: { style: 'yo' },
      greet: '마을이 또 탔어요. 칼자루마다 같은 각인이 찍혀 있었대요. {item} {qty}병… {offer}G밖에 없어요.',
      request: { item: 'potion', qty: 3, offer: { mult: 0.7 }, partialOk: true },
      lines: { sold: '…고마워요.', partial: '이것만이라도요.', refused: '…네.' },
      onSell: B(),
      onRefuse: B(),
    },

    // ════════════════════ 완벽한 장부 ════════════════════
    {
      // 금화를 두 배로 낸 종자 — 모른 척하면 이득, 돌려주면 한 줄 깨끗해진다
      id: 'tr_overpay_squire', look: 'soldier_b', name: '종자 미켈', race: '인간', job: '갓 들어온 기사단 종자', faction: 'kingdom', portrait: '🪙', kind: 'talk',
      spawn: { chance: 0.4, when: w({ day: { gte: 10 } }, { var: 'reputation', gte: 3 }, { noFlag: 'illegal_sale' }) },
      ask: { tag: '사 달라', items: { shield: 1 }, gold: 64, note: '방패값의 두 배를 냈다' },
      greet: '방패 하나 주세요! 여기 금화요. (셈도 안 하고 한 움큼을 내민다)',
      choices: [
        { id: 'fair', label: '제값만 받는다 (+32G)', when: { has: { item: 'shield' } }, lockedHint: '방패가 없다',
          reply: '어? 이렇게 많이 드렸어요? …고맙습니다! 단장님께 이 가게 얘기할게요.',
          effects: B({ take: { shield: 1 }, gold: 32, vars: { integrity: 1 } }) },
        { id: 'keep', label: '그냥 받는다 (+64G)', when: { has: { item: 'shield' } }, lockedHint: '방패가 없다',
          reply: '감사합니다! (신이 나서 뛰어나간다)',
          effects: B({ take: { shield: 1 }, gold: 64, vars: { integrity: -1 } }) },
        { id: 'none', label: '방패가 없소', reply: '아, 그럼 다른 데 가 볼게요!', effects: B() },
      ],
    },
    {
      // 청렴이 조금 쌓인 뒤 — 장부 한 줄을 지우자는 제안
      id: 'tr_tax_clerk', look: 'guild_agent', name: '세리 보좌 크람', race: '인간', job: '상점가 세금 장부 담당', faction: 'guild', portrait: '🧾', kind: 'talk',
      spawn: { chance: 0.5, when: w({ day: { gte: 16 } }, { var: 'integrity', gte: 4 }, { noFlag: 'illegal_sale' }) },
      ask: { tag: '뒷돈', gold: 40, note: '장부 한 줄 지우기' },
      greet: '세금 장부 정리하러 왔소. 한 줄만 빼 드리면 세금이 줄지. 그 절반만 내 주머니에 넣으면 되오.',
      choices: [
        { id: 'take', label: '한 줄 지운다 (+40G)', reply: '현명하시오. 장부는 원래 좀 가벼운 게 좋소.',
          effects: B({ gold: 40, vars: { integrity: -2 }, flags: ['tr_ledger_cooked'] }) },
        { id: 'refuse', label: '장부는 그대로 두시오', reply: '…고지식하시구려. 세금은 적힌 대로 매기겠소.', effects: B() },
      ],
    },
    {
      // 끝 무렵 — 깨끗한 장부를 알아보는 사람 (결말 「완벽한 장부」의 예고)
      id: 'tr_guild_notary', look: 'guild_merchant', name: '공증인 에밀', race: '인간', job: '금저울 길드 공증인', faction: 'guild', portrait: '📜', kind: 'talk',
      spawn: { chance: 0.6, when: w({ day: { gte: 26 } }, { var: 'integrity', gte: 9 }, { var: 'reputation', gte: 10 }, { noFlag: 'illegal_sale' }, { noFlag: 'tr_ledger_cooked' }) },
      ask: { tag: '장부 열람', note: '"깨끗한 장부" 명단' },
      greet: '금저울 길드 공증인이오. 올해 "깨끗한 장부" 명단을 만드오. 장부를 한번 보여 주겠소?',
      choices: [
        { id: 'show', label: '장부를 보여 준다', reply: '…한 줄도 흐트러짐이 없구려. 명단 맨 위에 올리겠소.',
          effects: B({ flags: ['tr_clean_list'], news: [{ cat: '경제', text: '금저울 길드 "깨끗한 장부" 명단 첫 공개… 무기점 한 곳 이름 올라' }] }) },
        { id: 'decline', label: '장부는 가게 것이오', reply: '그 말도 장부만큼 깨끗하구려.', effects: B() },
      ],
    },

    // ════════════════════ 밀고자 ════════════════════
    {
      // 밀고가 처음 맞은 뒤, 제보처가 되기 전
      id: 'tr_guard_thanks', look: 'soldier2_b', name: '경비병 로크', race: '인간', job: '왕국 경비대', faction: 'kingdom', portrait: '🛡️',
      spawn: { chance: 0.5, when: w({ var: 'report_hits', gte: 1 }, { noFlag: 'informant_office' }) },
      greet: '지난번 까마귀 편지, 여기서 날린 거 맞소? 덕분에 한 놈 잡았소. {item} {qty}개, {offer}G.',
      request: { item: 'shield', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '감찰청에서도 이 가게 이름을 적어 뒀다더군.', partial: '하나라도 고맙소.', refused: '…그래도 편지는 계속 보내 주시오.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 공식 제보처가 된 뒤 — 뒷골목이 먼저 안다
      id: 'tr_alley_threat', look: 'fence', name: '생선 장수', race: '인간', job: '생선 장수 (손에 비린내가 없다)', faction: 'village', trueFaction: 'bandit', portrait: '🐟', kind: 'talk',
      spawn: { chance: 0.6, when: w({ flag: 'informant_office' }, { since: { flag: 'informant_office', days: 1 } }) },
      suspicious: true,
      ask: { tag: '경고', note: '입조심하라는 말' },
      greet: '생선 좀 보고 가요… (목소리를 낮춘다) 요즘 이 골목 입들이 무거워졌대요. 누구 때문인지 다들 알아요.',
      choices: [
        { id: 'ignore', label: '생선은 필요 없소', reply: '…그래요. 까마귀 조심하세요. 요즘 새 사냥꾼이 많거든요.', effects: B() },
        { id: 'who', label: '누가 보냈소?', reply: '(대답 없이 바구니를 들고 사라진다)', effects: B() },
      ],
    },
    {
      // 제보처가 된 뒤 밀고가 한 번 더 맞았을 때 — 끌려간 사람의 가족
      id: 'tr_arrested_wife', look: 'traveler_b', name: '나래', race: '인간', job: '끌려간 짐꾼의 아내', faction: 'village', portrait: '🕯️', kind: 'talk',
      spawn: { chance: 0.6, when: w({ flag: 'informant_office' }, { var: 'report_hits_after', gte: 1 }) },
      ask: { tag: '하소연', note: '남편이 끌려갔다' },
      greet: '제 남편이 감찰청에 끌려갔어요. 여기서 뭘 봤다고 누가 적어 냈대요. …사장님은 아시죠?',
      choices: [
        { id: 'sorry', label: '미안하오', reply: '미안하다는 건… 맞다는 거네요.', effects: B({ vars: { rel_village: -1 } }) },
        { id: 'deny', label: '나는 모르는 일이오', reply: '…네. 다들 그렇게 말해요.', effects: B() },
      ],
    },

    // ════════════════════ 균형의 수호자 ════════════════════
    {
      // 소라껍데기를 받은 뒤 — 저울을 보는 눈이 이 가게를 한번 훑는다
      id: 'tr_liga_scalemender', look: 'traveler', name: '저울 고치는 노인', race: '인간', job: '떠돌이 저울장이', faction: 'traveler', portrait: '⚖️',
      spawn: { chance: 0.6, when: w(...ligaLive, { since: { flag: 'liga_member', days: 3 } }) },
      affil: { claim: null, seal: 'none', line: '어느 편도 아니오. 요즘은 {top} 쪽 손님이 많더이다만.' },
      greet: '저울을 고치러 다니오. 이 가게 저울은 눈금이 곧구려. {item} {qty}병, {offer}G.',
      greetWhen: [
        { when: { balanceGap: { gt: 15 } }, text: '저울을 고치러 다니오. 이 가게 저울은 {top} 쪽으로 좀 기울었구려. {item} {qty}병, {offer}G.' },
      ],
      request: { item: 'potion', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '눈금은 가끔 들여다보시오.', partial: '하나면 됐소.', refused: '그럼 저울이나 닦고 가겠소.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 소라껍데기가 한 번 운 뒤 — 세 번째가 오기 전에 한 번 더 일러 준다
      id: 'tr_liga_warner', look: 'liga_member', name: '저울 문양의 여인', race: '인간', job: '천칭단 (저울 문양 브로치)', faction: 'traveler', portrait: '🐚', kind: 'talk',
      spawn: { chance: 0.7, when: w(...ligaLive, { var: 'liga_warnings', gte: 1 }) },
      affil: { claim: null, seal: 'none', line: '우리는 어느 편에도 서지 않소.' },
      ask: { tag: '경고', note: '저울이 기울었다' },
      greet: '소라껍데기가 울었지요? {top} 쪽으로 너무 기울었소. {rival} 쪽 손님도 빈손으로 보내지 마시오.',
      choices: [
        { id: 'nod', label: '명심하겠소', reply: '균형을 지키시오.', effects: B() },
        { id: 'shrug', label: '장사는 장사요', reply: '…세 번째 울음 뒤엔 우리도 어쩔 수 없소.', effects: B() },
      ],
    },
    {
      // 끝 무렵, 저울을 지켜 온 가게에 — 결말 「균형의 수호자」의 예고
      id: 'tr_liga_elder', look: 'elder', name: '천칭단 노인', race: '인간', job: '저울 문양 지팡이', faction: 'traveler', portrait: '🐚', kind: 'talk',
      spawn: { chance: 0.6, when: w(...ligaLive, { day: { gte: 32 } }, { var: 'liga_warnings', lte: 1 }) },
      affil: { claim: null, seal: 'none', line: '저울 편이오. 그것뿐이오.' },
      ask: { tag: '안부', note: '천칭단의 인사' },
      greet: '당신 같은 저울이 몇 더 있소. 북쪽 항구에 하나, 서쪽 숲 어귀에 하나. 올해는 어느 쪽도 넘어지지 않았소.',
      choices: [
        { id: 'thanks', label: '장사를 했을 뿐이오', reply: '그 말이 우리 문장이오. 균형을 지키시오.', effects: B() },
      ],
    },

    // ════════════════════ 청출어람 ════════════════════
    {
      // 핀을 들인 뒤 — 동네가 핀을 알아본다
      id: 'tr_pin_baker', look: 'traveler_b', name: '빵집 주인 모야', race: '인간', job: '광장 빵집 주인', faction: 'village', portrait: '🥖',
      spawn: { chance: 0.5, when: w(...pinHere, { day: { gte: 7 } }) },
      greet: '핀이 빵 배달을 거들어 줘서 고마워요. 발이 어찌나 빠른지. {item} {qty}병, {offer}G요.',
      request: { item: 'potion', qty: 2, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '핀한테 갓 구운 거 하나 들려 보낼게요.', partial: '하나면 돼요.', refused: '어머, 다음에 올게요.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 벤의 밤을 넘기고 자리를 잡은 핀 — 장부를 배우고 싶어 한다
      id: 'tr_pin_ledger', look: 'pin', name: '견습생 핀', race: '인간', job: '이 가게 견습생', faction: 'village', portrait: '🧒', kind: 'talk',
      spawn: { chance: 0.6, when: w(...pinHere, { day: { gte: 21 } }, { var: 'pin_trust', gte: 3 }, { not: { customerSeen: 'pin_future' } }) },
      ask: { tag: '부탁', note: '장부 쓰는 법' },
      greet: '사장님, 장부 쓰는 법 가르쳐 주세요. 누가 뭘 사 갔는지 저도 적어 보고 싶어요.',
      choices: [
        { id: 'teach', label: '가르쳐 준다', reply: '(혀를 내밀고 한 줄씩 따라 적는다) 칼… 두… 자루.', effects: B({ vars: { pin_trust: 1 }, flags: ['tr_pin_ledger'] }) },
        { id: 'later', label: '아직 이르다', reply: '…네. 그럼 먼지부터 털게요.', effects: B() },
      ],
    },
    {
      // 진로 상담 전 — 핀을 탐내는 공방
      id: 'tr_smith_apprentice', look: 'dwarf2', name: '도제 킬리', race: '드워프', job: '브론 공방 도제', faction: 'dwarf', portrait: '🔨',
      spawn: { chance: 0.5, when: w(...pinHere, { day: { gte: 24 } }, { not: { customerSeen: 'pin_future' } }) },
      greet: '허허, 브론 공방 도제 킬리네. 핀이라는 꼬마, 손이 야무지다고 장인께서 눈독을 들이시더군. {item} {qty}개, {offer}G일세.',
      request: { item: 'iron_ore', qty: 10, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '핀한테 공방 구경 한번 오라고 전해 주게.', partial: '있는 만큼 지고 가겠네.', refused: '허, 광석 없는 무기점이라니.' },
      onSell: B(),
      onRefuse: B(),
    },
    {
      // 가게를 물려받기로 한 뒤 — 새 주인의 첫 단골
      id: 'tr_pin_regular', look: 'herbalist', name: '단골 베사 할멈', race: '인간', job: '골목 어귀 약초 노점', faction: 'village', portrait: '👵',
      spawn: { chance: 0.7, when: w({ flag: 'pin_heir' }, { noFlag: 'pin_gone' }) },
      greet: '새 주인 핀한테 샀다고 하면 되지요? 꼬마가 거스름돈 한 닢 안 틀리더라고요. {item} {qty}개, {offer}G.',
      request: { item: 'shield', qty: 1, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '핀아, 할멈 간다!', refused: '핀한테 다시 물어볼게요.' },
      onSell: B({ news: [{ cat: '마을', text: '무기점 견습생 핀, 혼자 첫 손님 받아… "거스름돈 한 닢 안 틀려"' }] }),
      onRefuse: B(),
    },
  );

  // ════════════════════ 신문 (배경 기사 — 하루 1건까지) ════════════════════
  WS.data.ambientNews.push(
    // 강철의 시대
    { id: 'tr_amb_dwarf_furnace', cat: '드워프', text: '강철수염 산채 용광로 밤새 타올라… "인간 가게 광석이 들어왔다"', when: { all: [...dwarfContractLive, { var: 'dwarf_deliveries', gte: 1 }, { noFlag: 'dwarf_golden_age' }] }, weight: 3, cooldown: 5 },
    { id: 'tr_amb_dwarf_cold', cat: '드워프', text: '강철수염 짐꾼들 빈 수레로 귀환… 산채 용광로 절반 꺼져', when: { flag: 'dwarf_contract_broken' }, weight: 2, cooldown: 6 },
    // 톱니의 시대
    { id: 'tr_amb_golem_smoke', cat: '드워프', text: '청동심장 공방 굴뚝 밤새 연기… 철광석 수레 줄지어', when: { all: [{ flag: 'golem_workshop' }, { noFlag: 'golem_army' }] }, weight: 3, cooldown: 5 },
    { id: 'tr_amb_golem_fountain', cat: '생활', text: '골렘 한 기 광장 분수에 빠져… 공방 "설계 수정 중"', when: { all: [{ flag: 'golem_workshop' }, { var: 'golem_tech', gte: 8 }, { noFlag: 'golem_army' }] }, weight: 2, cooldown: 8 },
    // 천둥의 시대
    { id: 'tr_amb_powder_sea', cat: '소문', text: '항구 앞바다서 밤마다 대포 연습… 어부들 그물 거둬', when: { all: [...powderLive, { sold: { faction: 'pirate', item: 'black_powder', min: 4, trades: true } }, { noFlag: 'powder_age' }] }, weight: 3, cooldown: 5 },
    { id: 'tr_amb_powder_walls', cat: '왕국', text: '성벽 수비대, 돌벽에 쇠판 덧대기… "대포엔 돌이 약하다"', when: { flag: 'powder_age' }, weight: 3, cooldown: 5 },
    // 밀수왕
    { id: 'tr_amb_night_wagons', cat: '사건', text: '검은 두건 짐마차, 밤마다 수도 뒷문 드나들어… 경비대 "추적 중"', when: { all: stashLive }, weight: 2, cooldown: 5 },
    // 두 번째 붉은여울
    { id: 'tr_amb_east_wagons', cat: '마을', text: '밤마다 동쪽 여울길로 짐마차… 바퀴에 헝겊을 감았다', when: { all: [{ flag: 'garret_partner' }, { noFlag: 'garret_raid' }, { noFlag: 'garret_caught' }] }, weight: 5, cooldown: 2 },
    { id: 'tr_amb_redford_again', cat: '마을', text: '동쪽 마을 두 번째 장례… 주민들 "스무 해 전과 같은 각인"', when: { all: [{ flag: 'garret_raid' }, { noFlag: 'garret_confessed' }] }, weight: 3, cooldown: 5 },
    // 완벽한 장부
    { id: 'tr_amb_honest_shop', cat: '생활', text: '상점가에 "저 무기점은 거스름돈 한 닢도 안 틀린다"는 말', when: { all: [{ var: 'integrity', gte: 10 }, { noFlag: 'illegal_sale' }] }, weight: 2, cooldown: 7 },
    // 밀고자
    { id: 'tr_amb_informant_line', cat: '왕국', text: '감찰청 제보 창구 앞에 줄… "이웃이 이웃을 적어 낸다"', when: { flag: 'informant_office' }, weight: 3, cooldown: 5 },
    { id: 'tr_amb_crow_graffiti', cat: '사건', text: '뒷골목 담벼락에 까마귀 낙서… "저 가게를 조심하라"', when: { var: 'report_hits', gte: 4 }, weight: 2, cooldown: 6 },
    // 균형의 수호자
    { id: 'tr_amb_liga_brooch', cat: '소문', text: '먼 항구 거래소에 저울 문양 브로치… "어느 편도 아닌 상인들"', when: { all: ligaLive }, weight: 2, cooldown: 6 },
    { id: 'tr_amb_liga_gone', cat: '소문', text: '저울 문양 브로치 단 사람들, 이 골목에서 자취 감춰', when: { flag: 'liga_failed' }, weight: 2, cooldown: 8 },
    // 청출어람
    { id: 'tr_amb_pin_club', cat: '사건', text: '쥐꼬리 벤 패거리, 무기점 뒷문서 몽둥이 맞고 줄행랑', when: { all: [{ flag: 'pin_loyal' }, { noFlag: 'pin_gone' }] }, weight: 3, cooldown: 8 },
  );

  // ════════════════════ 소문 (❓ — js/data/rumors.js 규칙) ════════════════════
  WS.data.rumorNews.list.push(
    {
      id: 'tr_rm_golem_order', fac: 'golem', cat: '소문', truth: true, days: [2, 4], foreshadows: 'golem_army', weight: 1.2,
      when: { all: [{ flag: 'golem_workshop' }, { var: 'golem_tech', gte: 9 }, { noFlag: 'golem_army' }] },
      text: '"청동심장 공방이 골렘 백 기 주문을 받았다"… 대장간 골목 소문',
      after: '공방 창고에 청동 팔다리 수백 개… 대량 주문 사실로',
      market: { items: ['iron_ore', 'mana_crystal'], mult: 1.15 },
      hint: { fac: 'golem', line: '(째깍) 주문 대장 두께 증가. 소문 오차 적음.' },
    },
    {
      id: 'tr_rm_cannons', fac: 'pirate', cat: '소문', truth: true, days: [2, 4], foreshadows: 'powder_spread', weight: 1.2,
      when: { all: [...powderLive, { sold: { faction: 'pirate', item: 'black_powder', min: 6, trades: true } }, { noFlag: 'powder_age' }] },
      text: '"소금까마귀 해적단이 대포 스무 문을 새로 달았다"… 항구 소문',
      after: '해적선 뱃전에 새 포문 줄지어… 항구 감시탑 확인',
      hint: { fac: 'pirate', line: '크하하, 포문 세는 놈이 있더라. 스물이 맞다.' },
    },
    {
      id: 'tr_rm_stash_sweep', fac: 'kingdom', cat: '소문', truth: false, days: [2, 3], weight: 1,
      when: { all: stashLive },
      text: '"경비대가 내일부터 상점 창고를 전부 뒤진다"… 상점가 술렁',
      after: '경비대 "창고 일제 수색 계획 없다"… 헛소문으로',
    },
  );

  // ════════════════════ 편지 ════════════════════
  const L = WS.data.letters;
  L.senders.tr_nix = { name: '"장부" 닉스', icon: '🕶️' };
  L.story = (L.story || []).concat([
    { id: 'tr_dwarf_second_letter', from: 'dwarf', when: { all: [...dwarfContractLive, { var: 'dwarf_deliveries', gte: 2 }] }, subject: '두 번째 짐', body: '두 번째 짐 잘 받았네. 용광로가 이제 제 소리를 내네. 첫 강철이 나오면 한 자루는 자네 몫으로 떼어 두겠네. — 강철수염 씨족 교역소' },
    { id: 'tr_nix_first_letter', from: 'tr_nix', when: { all: [{ customerSeen: 'smuggle_fence_return' }, { noFlag: 'smuggle_burned' }] }, subject: '첫 짐', body: '첫 짐 깔끔했다. 위에서도 봤어. 왕국 쪽 손님은 계속 조심해. — 닉스' },
    { id: 'tr_tinker_workshop_letter', from: 'tinker', when: { all: [{ flag: 'golem_workshop' }, { noFlag: 'golem_army' }, { var: 'golem_tech', gte: 7 }] }, subject: '공방 소식', body: '시제품이 성벽을 한 바퀴 돌았소. 철광석이 모자라오. 들어오는 대로 받겠소. — 청동심장 공방' },
  ]);
})();

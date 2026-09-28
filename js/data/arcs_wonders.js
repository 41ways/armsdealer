// 결말 줄기 사이를 채우는 이야기 손님·기사 (wonders) — 기존 데이터에 덧붙인다.
// 용(재의 도시 · 용의 금고지기 · 드래곤 슬레이어) · 밤의 궁정 · 잿빛 행진 · 안개 상단 · 별조각 · 요정의 가호.
// 결말 조건은 건드리지 않는다. 필수 손님 사이사이에 "이 줄기가 흘러가고 있구나" 싶은 손님·신문·한마디만 얹는다.
// 선택지가 있어도 세계 변수를 1 안팎으로 조금 미는 정도다.
//
// id 는 모두 wd_ 로 시작한다. 날짜 조건은 쓰지 않는다 — 줄기 플래그 · 손님 본 기록 · 이벤트 기록 · since(플래그가 켜진 지 며칠)로 잇는다.
// customers.js · events.js · news.js · remarks.js 뒤에 읽혀야 한다 (index.html 데이터 칸).
(() => {
  const after = (flag, days) => ({ all: [{ flag }, { since: { flag, days } }] });
  // 줄기가 여럿 겹쳐도 하루에 몰리지 않게 — 기한 없는 손님은 사흘에 하루(날짜 나머지)씩 나눠 온다. 기한이 짧은 손님(피난민 등)은 빼고
  const slot = (n, when) => ({ all: [when, { dayMod: [3, n] }] });
  const dragonUp = [{ noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { noFlag: 'dragon_razed' }, { noFlag: 'dragon_pact' }];

  WS.data.customers.push(
    // ═════════ 용: 재의 산 (dragon_ash · dragon_nest · dragonfall 공통 줄기) ═════════
    // 연기(dragon_stir 4+) → 옛 광산 금을 노린 모험가 셋이 칼을 산다 → 사흘 뒤 기슭 마을 파수꾼이 행방을 묻는다
    // → (말해 주면 이틀 뒤 / 산이 더 뒤척이면) 왕국 정찰대가 활을 사서 산으로 → 정찰대 귀환 기사
    // → 용이 깨면: 살아 돌아온 모험가 하나 · 기슭 마을 피난민 → 결말마다 뒷손님 하나 (수비대 부관 / 재건 인부 / 코볼트 짐꾼)
    {
      id: 'wd_ash_delvers', look: 'adventurer', name: '모험가 토르벤', race: '인간', job: '셋이 다니는 떠돌이 모험가', faction: 'traveler', portrait: '⛏️',
      spawn: { when: slot(0, { all: [{ var: 'dragon_stir', gte: 4 }, ...dragonUp] }), chance: 0.64 },
      greet: '재의 산 옛 광산 동굴에 금이 산더미래요. 우리 셋이 먼저 가 보려고요. {item} {qty}자루, {offer}골드.',
      request: { item: 'iron_sword', qty: 3, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '금 캐 오면 한턱낼게요!', partial: '셋이 나눠 쓰면 되죠, 뭐.', refused: '칼 없으면 곡괭이라도 들고 가죠.' },
      extraChoices: [
        { id: 'ask_gold', label: '그 금, 누가 쌓아 뒀다던가?', once: true, reply: '광부들이 버리고 간 거겠죠. 산이 가끔 연기를 뿜는다는데, 그게 대수예요?' },
        { id: 'warn', label: '그 산엔 가지 마시오', once: true, reply: '겁주지 마세요. 금은 먼저 본 사람 거예요.', effects: { flags: ['wd_delvers_warned'] } },
      ],
      onSell: {
        flags: ['wd_delvers_armed'], vars: { dragon_stir: 1 },
        news: [{ cat: '생활', text: '모험가 셋, 새 칼 차고 재의 산 옛 광산으로… "금 캐 오겠다"' }],
        spawn: [{ customer: 'wd_ash_watch', inDays: 3 }],
      },
      onRefuse: { spawn: [{ customer: 'wd_ash_watch', inDays: 3 }] },
    },
    {
      id: 'wd_ash_watch', look: 'hunter_scout', name: '파수꾼 오드', race: '인간', job: '재의 산 기슭 마을 파수꾼', faction: 'village', portrait: '🔦', kind: 'talk',
      spawn: { queuedOnly: true },
      ask: { tag: '행방 수소문', note: '모험가 셋이 간 곳' },
      greet: '모험가 셋이 사흘째 안 내려와요. 이 가게에서 칼을 샀다던데… 어디로 간다던가요?',
      greetWhen: [
        { when: { noFlag: 'wd_delvers_armed' }, text: '모험가 셋이 사흘째 안 내려와요. 떠나기 전에 이 가게에 들렀다던데… 어디로 간다던가요?' },
      ],
      choices: [
        {
          id: 'tell', label: '재의 산 옛 광산이라 했소',
          reply: '…하필 거기를. 산 밑에서 연기가 짙어진 게 그 뒤부터예요. 기사단에 알릴게요.',
          effects: {
            flags: ['wd_ash_reported'], vars: { rel_village: 1 },
            news: [{ cat: '마을', text: '재의 산 기슭 마을, 실종 모험가 셋 수색… 동굴 입구엔 그을린 칼자국' }],
            spawn: [{ customer: 'wd_ash_scouts', inDays: 2 }],
          },
        },
        {
          id: 'hush', label: '기억나지 않소',
          reply: '그렇군요… 산이 요즘 이상해요. 밤마다 땅이 울려요.',
          effects: { vars: { rel_village: -1 } },
        },
      ],
    },
    {
      id: 'wd_ash_scouts', look: 'soldier2', name: '정찰대장 고드윈', race: '인간', job: '왕국 기사단 정찰대장', faction: 'kingdom', portrait: '🔭',
      spawn: { when: slot(1, { all: [{ customerSeen: 'wd_ash_watch' }, { var: 'dragon_stir', gte: 8 }, ...dragonUp] }), chance: 0.64 },
      greet: '재의 산으로 정찰 나가오. 모험가들이 사라진 동굴을 봐야겠소. {item} {qty}자루, {offer}골드.',
      greetWhen: [
        { when: { flag: 'dragon_awake' }, text: '정찰은 늦었소. 산이 먼저 깼으니. 성벽 수비대에 보탤 {item} {qty}자루, {offer}골드.' },
      ],
      request: { item: 'bow', qty: 4, offer: { mult: 1.05 }, partialOk: true },
      lines: { sold: '돌아오면 무엇을 봤는지 신문에서 보시오.', partial: '모자라도 가겠소. 보고만 오면 되니.', refused: '맨손으로 동굴을 들여다보라는 거요?' },
      onSell: {
        flags: ['wd_ash_scouts_armed'],
        news: [{ cat: '왕국', text: '기사단 정찰대, 활 메고 재의 산으로… "실종 모험가 행방 확인"' }],
        schedule: [{ event: 'wd_ash_scout_report', inDays: [3, 4] }],
      },
    },
    {
      // 용이 깬 이튿날부터 — 모험가 셋 가운데 하나만 돌아왔다. 동굴에서 긁어 온 비늘 한 장을 치료비로 판다 (시세보다 조금 싸게)
      id: 'wd_ash_survivor', look: 'adventurer', name: '모험가 토르벤', race: '인간', job: '재의 산에서 혼자 돌아온 모험가 (눈썹이 타 버렸다)', faction: 'traveler', portrait: '🔥', kind: 'sell',
      spawn: { when: slot(0, { all: [{ customerSeen: 'wd_ash_delvers' }, { any: [after('dragon_awake', 2), { flag: 'dragon_slain' }, { flag: 'dragon_razed' }, { flag: 'dragon_pact' }] }] }), chance: 0.8 },
      greet: '셋이 갔는데 나만 나왔어요. 금 더미 위에 뭔가 자고 있었어요. 치료비가 필요해요. {item} {qty}장, {offer}골드.',
      greetWhen: [
        { when: { flag: 'wd_delvers_warned' }, text: '가지 말라 하셨죠. 들을 걸 그랬어요. 나만 나왔어요. 치료비로 {item} {qty}장, {offer}골드.' },
      ],
      request: { item: 'dragon_scale', qty: 1, price: 200 },
      lines: { bought: '…이 비늘이 떨어진 자리에서 그 녀석이 눈을 떴어요.', declined: '그렇겠죠. 이런 걸 누가 사겠어요.' },
    },
    {
      id: 'wd_ash_refugee', look: 'elder', name: '기슭 마을 노인 베른', race: '인간', job: '재의 산 기슭 마을에서 내려온 피난민', faction: 'village', portrait: '🧓',
      spawn: { when: { all: [after('dragon_awake', 1), { not: { eventFired: 'dragon_descends' } }] }, chance: 0.5 },
      greet: '마을이 통째로 내려왔소. 등에 불똥을 맞은 아이가 있소. {item} {qty}병, 가진 게 {offer}골드뿐이오.',
      request: { item: 'potion', qty: 2, offer: { mult: 0.7 }, partialOk: true },
      poor: { style: 'hao' },
      lines: { sold: '고맙소. 산이 조용해지면 꼭 갚으러 오겠소.', partial: '한 병이라도 고맙소.', refused: '…성벽 쪽 구호소로 가 보겠소.' },
    },
    {
      id: 'wd_ash_mason', look: 'soldier', name: '수비대 부관 이다', race: '인간', job: '성벽 수비대 부관', faction: 'merc', portrait: '🧱',
      spawn: { when: slot(0, after('dragon_slain', 1)), chance: 0.8 },
      greet: '브란트 대장이 인사 전하라 했소. 무너진 성가퀴에 새로 걸 {item} {qty}개, {offer}골드.',
      request: { item: 'shield', qty: 3, offer: { mult: 1.0 }, partialOk: true },
      lines: { sold: '용이 떨어진 자리에서 아직 김이 나오. 구경 오시오.', partial: '있는 만큼 걸겠소.', refused: '다른 가게를 돌겠소.' },
      onSell: { news: [{ cat: '왕국', text: '성벽 수비대, 용 떨어뜨린 성가퀴 보수… 새 방패 줄지어 걸어' }] },
    },
    {
      id: 'wd_ash_rebuild', look: 'traveler', name: '인부 보르', race: '인간', job: '잿더미 상점가 재건 인부', faction: 'village', portrait: '🔨',
      spawn: { when: slot(0, after('dragon_razed', 1)), chance: 0.8 },
      greet: '상점가를 다시 세우오. 못 칠 쇠가 없소. {item} {qty}개, {offer}골드.',
      request: { item: 'iron_ore', qty: 12, offer: { mult: 1.05 }, partialOk: true },
      lines: { sold: '이 가게는 운이 좋았소. 옆 골목은 기둥만 남았으니.', partial: '이만큼이라도 박겠소.', refused: '…재 속에서 쇠를 골라 쓰겠소.' },
      onSell: { news: [{ cat: '마을', text: '잿더미 상점가에 망치 소리… 녹은 금화가 기둥 밑에서 나와' }] },
    },
    {
      // 금고지기 계약 뒤 — 도시의 금을 산으로 나르는 짐꾼. 금화는 오가지 않는다 (장부 정리만)
      id: 'wd_ash_porter', look: 'kobold', name: '짐꾼 치크', race: '코볼트', job: '재의 산 금 짐꾼', faction: 'dragon', portrait: '🦎', kind: 'talk', late: true,
      spawn: { when: slot(0, after('dragon_pact', 2)), chance: 0.8 },
      ask: { tag: '금 운반', note: '도시의 금을 산으로' },
      greet: '금고지기! 치크가 짐 나르러 왔다, 캬! 이번 달 도시 금 자루는 어디 있냐, 캬?',
      choices: [
        {
          id: 'hand', label: '상인들 몫은 여기 있소',
          reply: '반짝반짝! 주인님이 코를 골며 좋아하신다, 캬!',
          effects: { vars: { rel_dragon: 1, rel_guild: -1 }, news: [{ cat: '사건', text: '코볼트 짐꾼들, 밤마다 금 자루 지고 재의 산으로… 상인들 한숨' }] },
        },
        {
          id: 'short', label: '이번엔 모자라오',
          reply: '주인님께 이른다, 캬! …아니, 이번만 봐준다. 치크는 착하다, 캬.',
          effects: { vars: { rel_dragon: -1, dragon_stir: 1 } },
        },
      ],
    },

    // ═════════ 밤의 궁정 (night_court) ═════════
    // 하녀 실종(vampire_known) → 야경꾼이 성수를 산다 → 밤의 궁정 편에 서면(vampire_backed) 창백한 시동이 사냥꾼 소식을 묻고,
    // 집사가 붉은 보석을 사 간다 → 섭정이 서면(vampire_regent) 사냥꾼 조합원이 도시를 떠난다
    {
      id: 'wd_night_watchman', look: 'soldier', name: '야경꾼 한네스', race: '인간', job: '경비대 야경꾼', faction: 'kingdom', portrait: '🏮',
      spawn: { when: slot(1, { all: [after('vampire_known', 1), { noFlag: 'vampire_regent' }, { noFlag: 'vampire_court_fell' }] }), chance: 0.64 },
      greet: '하녀들이 사라진 골목을 밤마다 도오. 목에 이빨 자국이라니… {item} {qty}병, {offer}골드.',
      request: { item: 'holy_water', qty: 3, offer: { mult: 1.05 }, partialOk: true },
      lines: { sold: '이걸 허리에 차면 좀 덜 떨리겠소.', partial: '한 병이라도 차고 나가겠소.', refused: '…맨정신으로 밤을 도는 수밖에.' },
      onSell: {
        flags: ['wd_watch_holy'], vars: { vampire_power: -1 },
        news: [{ cat: '사건', text: '야경꾼들, 성수 병 차고 골목 순찰… 실종 신고 이틀째 잠잠' }],
      },
    },
    {
      id: 'wd_night_page', look: 'thrall', name: '창백한 시동 엘로', race: '인간', job: '밤의 궁정 시동 (손이 얼음장 같다)', faction: 'vampire', portrait: '🕯️', kind: 'talk', late: true,
      spawn: { when: { all: [after('vampire_backed', 1), { flag: 'succession_crisis' }, { noFlag: 'crowned' }, { noFlag: 'vampire_court_fell' }] }, chance: 0.6 },
      ask: { tag: '정보', note: '사냥꾼 조합이 사 간 것' },
      greet: '주인께서 안부를 전하셨어요. …사냥꾼 조합이 요즘 무얼 사 가는지, 여쭤도 될까요?',
      choices: [
        {
          id: 'tell', label: '아는 대로 말해 준다',
          reply: '고마워요. 주인께서는 은혜를 해 질 녘마다 세어 보세요.',
          effects: { vars: { vampire_power: 1, rel_vampire: 1, rel_hunter: -1 }, flags: ['wd_told_court'] },
        },
        {
          id: 'silent', label: '손님 일은 말하지 않소',
          reply: '…장부를 지키시는군요. 주인께서도 그런 가게를 좋아하세요. 조금은요.',
          effects: { vars: { rel_vampire: -1, integrity: 1 } },
        },
      ],
    },
    {
      id: 'wd_night_steward', look: 'vampire', name: '집사 레지날드', race: '흡혈귀', job: '밤의 궁정 집사', faction: 'vampire', portrait: '🍷', late: true,
      spawn: { when: slot(0, { all: [{ any: [after('vampire_backed', 2), after('vampire_friend', 2)] }, { noFlag: 'vampire_court_fell' }] }), chance: 0.64 },
      greet: '(해 진 뒤) 주인께서 대관식… 아니, 연회에 쓸 붉은 돌을 찾으시오. {item} {qty}개, {offer}골드.',
      greetWhen: [
        { when: { flag: 'vampire_regent' }, text: '(해 진 뒤) 섭정 전하의 연회에 쓸 붉은 돌이오. {item} {qty}개, {offer}골드.' },
      ],
      request: { item: 'ruby', qty: 1, offer: { mult: 1.15 } },
      lines: { sold: '피처럼 붉구려. 주인께서 흡족해하실 거요.', refused: '유감이오. 밤은 길고, 보석상은 많으니.' },
    },
    {
      id: 'wd_night_last_hunter', look: 'hunter', name: '사냥꾼 베른', race: '인간', job: '해산된 은화살 조합 조합원', faction: 'hunter', portrait: '🎒',
      spawn: { when: slot(1, after('vampire_regent', 1)), chance: 0.8 },
      greet: '섭정청이 조합을 해산시켰소. 남쪽으로 가오. 가는 길에 쓸 {item} {qty}자루, {offer}골드.',
      request: { item: 'bow', qty: 2, offer: { mult: 1.0 }, partialOk: true },
      lines: { sold: '해 지기 전에 성문을 나가야 하오. 잘 있으시오.', partial: '한 자루면 충분하오. 쏠 일이 없길 바라오.', refused: '…그렇구려. 이 도시엔 이제 밤 손님이 더 반갑겠지.' },
      onSell: { news: [{ cat: '사건', text: '은화살 조합원들, 해 지기 전 남문으로… 섭정청 "자진 출국"' }] },
    },

    // ═════════ 잿빛 행진 (grey_march) ═════════
    // 무덤이 열리면(graves_opened) 상복 입은 조문객이 "장례 행렬"에 쓸 방패를 산다 → 이틀 뒤 묘지기가 누가 사 갔는지 묻는다
    // → 말해 주면 대성당 기사가 묘지 순찰에 쓸 성수를 산다 → 행렬이 출발하면 동쪽 마을 피난민 → 행렬이 지나간 뒤 해골 하나가 방패를 돌려준다
    {
      id: 'wd_grey_mourner', look: 'hooded', name: '상복 입은 조문객', race: '인간', job: '장례 행렬 상주 (흙냄새가 난다)', faction: 'village', trueFaction: 'undead', portrait: '⚱️',
      spawn: { when: slot(2, { all: [{ flag: 'graves_opened' }, { not: { eventFired: 'dead_march' } }] }), chance: 0.64 },
      affil: { claim: null, seal: 'none', line: '장례 치르는 집안이오. 인장 같은 건 관 속에 넣었소.' },
      greet: '장례 행렬에 쓸 {item} {qty}개요. 관을 지키는 풍습이라. {offer}골드면 되겠소.',
      request: { item: 'shield', qty: 3, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '고맙소. 고인들이 든든해하실 거요.', partial: '행렬 앞줄만이라도 들겠소.', refused: '…괜찮소. 고인들은 기다리는 데 익숙하니.' },
      onSell: {
        flags: ['wd_grey_shields'],
        news: [{ cat: '생활', text: '상복 입은 행렬, 새 방패 들고 공동묘지 한 바퀴… "옛 장례 풍습"' }],
        spawn: [{ customer: 'wd_grey_gravedigger', inDays: 2 }],
      },
      onRefuse: { spawn: [{ customer: 'wd_grey_gravedigger', inDays: 2 }] },
    },
    {
      id: 'wd_grey_gravedigger', look: 'elder', name: '묘지기 노인 베슬', race: '인간', job: '동쪽 공동묘지 묘지기', faction: 'village', portrait: '🪦', kind: 'talk',
      spawn: { queuedOnly: true },
      ask: { tag: '수소문', note: '방패를 사 간 자' },
      greet: '무덤을 다시 덮다가 새 방패가 나왔소. 이 가게 각인이더이다. 누가 사 갔소?',
      greetWhen: [
        { when: { noFlag: 'wd_grey_shields' }, text: '상복 입은 자들이 이 가게에 들렀다던데… 그 뒤로 무덤이 안에서부터 파여 있소. 뭘 찾던가요?' },
      ],
      choices: [
        {
          id: 'tell', label: '상복 입은 조문객들이오',
          reply: '조문객이라… 그 무덤들엔 조문 올 식구가 없었소. 대성당에 알리겠소.',
          effects: {
            flags: ['wd_grey_reported'], vars: { church_authority: 1, undead_power: -1, rel_village: 1 },
            news: [{ cat: '사건', text: '대성당, 묘지에 새 방패 묻은 "상복 행렬" 수소문' }],
            spawn: [{ customer: 'wd_grey_templar', inDays: 2 }],
          },
        },
        {
          id: 'hush', label: '모르는 일이오',
          reply: '그렇소… 밤마다 흙 긁는 소리가 나오. 문 단단히 잠그시오.',
          effects: { vars: { rel_village: -1 } },
        },
      ],
    },
    {
      id: 'wd_grey_templar', look: 'knight_official', name: '대성당 기사 로렌', race: '인간', job: '대성당 묘지 순찰대', faction: 'church', portrait: '✝️',
      spawn: { when: slot(0, { all: [{ customerSeen: 'wd_grey_gravedigger' }, { var: 'undead_power', gte: 18 }, { not: { eventFired: 'dead_march' } }] }), chance: 0.64 },
      greet: '묘지 순찰을 나가오. 무덤마다 뿌릴 {item} {qty}병, {offer}골드.',
      greetWhen: [
        { when: { eventFired: 'dead_march' }, text: '행렬이 벌써 떠났소. 뒤쫓으며 뿌릴 {item} {qty}병, {offer}골드.' },
      ],
      request: { item: 'holy_water', qty: 4, offer: { mult: 1.05 }, partialOk: true },
      lines: { sold: '빛이 이 가게를 기억할 것이오.', partial: '있는 만큼 뿌리겠소.', refused: '…기도만으로 버텨 보겠소.' },
      onSell: {
        vars: { undead_power: -1 },
        news: [{ cat: '왕국', text: '대성당 기사단, 공동묘지 밤샘 순찰… 무덤마다 성수' }],
      },
    },
    {
      id: 'wd_grey_refugee', look: 'traveler', name: '피난민 오스카', race: '인간', job: '동쪽 마을에서 달아난 농부', faction: 'village', portrait: '🧺',
      spawn: { when: { all: [{ eventFired: 'dead_march' }, { not: { eventFired: 'dead_march_resolution' } }] }, chance: 0.5 },
      greet: '해골들이 밭을 가로질러 왔어요. 우리 옆집 영감도 그 줄에 섞여 있었어요. {item} {qty}병, {offer}골드뿐이에요.',
      request: { item: 'potion', qty: 2, offer: { mult: 0.7 }, partialOk: true },
      poor: { style: 'yo' },
      lines: { sold: '고마워요. 수도 성벽 안이면 괜찮겠죠?', partial: '한 병이라도 고마워요.', refused: '…대성당 구호소로 가 볼게요.' },
    },
    {
      // 행렬이 지나간 뒤 — 해골 하나가 이 가게 방패를 들고 온다 (그냥 돌려준다)
      id: 'wd_grey_returned', look: 'skeleton', name: '(이름이 지워진 자)', race: '언데드', job: '행렬에서 떨어져 나온 해골', faction: 'undead', portrait: '💀', kind: 'talk', late: true,
      spawn: { when: slot(1, after('undead_tide', 2)), chance: 0.8 },
      ask: { tag: '돌려줌', items: { shield: 1 }, give: true, note: '말없이 내려놓는다' },
      greet: '(달그락… 해골 하나가 녹슨 방패를 카운터에 내려놓는다.)',
      greetWhen: [
        { when: { any: [{ flag: 'wd_grey_shields' }, { flag: 'armed_dead' }] }, text: '(달그락… 해골 하나가 방패를 카운터에 내려놓는다. 안쪽에 이 가게 각인이 선명하다.)' },
      ],
      choices: [
        { id: 'take', label: '방패를 받는다', reply: '(해골이 고개를 한 번 끄덕이고, 서쪽으로 걸어 나간다.)', effects: { give: { shield: 1 } } },
        { id: 'push', label: '도로 밀어 준다', reply: '(해골이 방패를 다시 들고, 한참 서 있다가 서쪽으로 걸어 나간다.)', effects: { vars: { rel_undead: 1 } } },
      ],
    },

    // ═════════ 안개 상단 (moonlit_market) ═════════
    // 첫 계약(demon_contract) 뒤 — 옆 골목 포목상도 "제7조"에 서명했다 → 조항이 걷힌 뒤(contract_clause) 진주를 사러 다니는 서기
    // → 기억을 잃은 아버지를 찾는 딸 → 두 번째 계약 뒤(mist_second_contract) 가게 앞에 좌판이 선다
    {
      id: 'wd_mist_neighbor', look: 'noble_lady', name: '포목상 하넬', race: '인간', job: '옆 골목 포목점 주인', faction: 'guild', portrait: '🧵', kind: 'talk',
      spawn: { when: slot(1, { all: [after('demon_contract', 2), { noFlag: 'mist_contract_broken' }, { not: { customerSeen: 'mist_contract2' } }] }), chance: 0.64 },
      ask: { tag: '질문', note: '안개 낀 밤의 계약서' },
      greet: '주인장도 안개 낀 밤에 서명했어요? 난 어제 뭘 팔았는지 기억이 안 나요. 장부엔 내 글씨로 "제7조"라고만…',
      choices: [
        {
          id: 'admit', label: '나도 서명했소',
          reply: '…그럼 우리 둘 다 뭘 내줬는지 모르는 거네요. 이상하게 마음이 놓여요.',
          effects: { vars: { rel_guild: 1 }, flags: ['wd_mist_admitted'] },
        },
        {
          id: 'deny', label: '모르는 일이오',
          reply: '그래요? …당신 장부도 한번 들춰 봐요. 모르는 글씨가 있는지.',
          effects: {},
        },
      ],
    },
    {
      id: 'wd_mist_clerk', look: 'stranger', name: '흐린 얼굴의 서기', race: '안개 상인', job: '안개 상단 서기', faction: 'demon', portrait: '🪶', late: true,
      spawn: { when: slot(0, { all: [{ eventFired: 'contract_clause' }, { noFlag: 'mist_contract_broken' }, { noFlag: 'mist_second_contract' }] }), chance: 0.56 },
      greet: '두 번째 장이 곧 오네. 그 전에 저울을 맞춰 둬야 해서. {item} {qty}알, {offer}골드.',
      request: { item: 'pearl', qty: 2, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '(진주가 손바닥에서 물방울처럼 굴러간다) 좋은 무게로군.', partial: '한 알이라도 저울은 기우네.', refused: '괜찮네. 저울엔 다른 걸 올리면 되지.' },
      onSell: { news: [{ cat: '소문', text: '안개 짙은 밤, 진주 사러 가게마다 도는 서기… 동전마다 물기' }] },
    },
    {
      id: 'wd_mist_daughter', look: 'thrall', name: '여관집 딸 모나', race: '인간', job: '은서리 골목 여관집 딸', faction: 'village', portrait: '🫖', kind: 'talk',
      spawn: { when: slot(2, { all: [after('demon_contract', 5), { noFlag: 'mist_contract_broken' }, { not: { customerSeen: 'mist_contract2' } }] }), chance: 0.56 },
      ask: { tag: '수소문', note: '얼굴 흐린 상인' },
      greet: '아버지가 안개 낀 밤 뒤로 제 이름을 몰라요. 이 골목에서 얼굴 흐린 상인을 봤대요. 아세요?',
      choices: [
        {
          id: 'tell', label: '안개 상단이오. 계약서를 조심하시오',
          reply: '…계약서요? 아버지 장롱에서 젖은 종이가 나왔어요. 태워 볼게요.',
          effects: { vars: { demon_influence: -1, reputation: 1 }, flags: ['wd_mist_told'] },
        },
        {
          id: 'hush', label: '본 적 없소',
          reply: '그래요… 저도 요즘 가끔 뭘 잊은 것 같아요.',
          effects: { vars: { demon_influence: 1 } },
        },
      ],
    },
    {
      id: 'wd_mist_stall', look: 'stranger', name: '안개 장터 좌판상', race: '안개 상인', job: '가게 앞 좌판 주인 (얼굴이 흐리다)', faction: 'demon', portrait: '🏮', late: true,
      spawn: { when: slot(2, after('mist_second_contract', 1)), chance: 0.8 },
      greet: '간판 아래 좌판을 폈네. 자릿세 대신 물건을 사 주지. {item} {qty}자루, {offer}골드.',
      request: { item: 'iron_sword', qty: 2, offer: { mult: 1.0 }, partialOk: true },
      lines: { sold: '안개가 걷히면 좌판도 걷히네. 또 끼면 또 오지.', partial: '한 자루면 충분하네.', refused: '자릿세는 달리 받아 가지. 걱정 말게.' },
    },

    // ═════════ 별조각 (star_guests) ═════════
    // 밤하늘 신호(star_signal) → 천문대 견습생이 밤샘용 물약을 산다 → 별조각을 샀으면(star_bought) 대성당 수녀가 떨어진 별을 묻는다
    // → 대성당에 보냈으면(star_to_church) 사흘 기도에 모인 순례자 → 하늘이 대답했으면(star_answered) 다리가 나은 사냥꾼
    {
      id: 'wd_star_apprentice', look: 'mage', name: '천문대 견습생 피오', race: '인간', job: '언덕 천문대 견습생', faction: 'mage', portrait: '🔭',
      spawn: { when: slot(1, { all: [{ var: 'star_signal', gte: 4 }, { noFlag: 'star_bought' }] }), chance: 0.4 },
      greet: '북쪽 별 하나가 짧게 셋, 길게 하나 깜빡여요. 밤새 지켜보려고요. {item} {qty}병, {offer}골드.',
      request: { item: 'potion', qty: 2, offer: { mult: 1.05 }, partialOk: true },
      lines: { sold: '오늘 밤엔 박자를 끝까지 받아 적을 거예요.', partial: '한 병이면 새벽까진 버텨요.', refused: '졸면서 보면 되죠, 뭐.' },
      extraChoices: [
        { id: 'ask_star', label: '그 별이 뭐라는 것 같소?', once: true, reply: '짧게 셋, 길게 하나… 누가 문을 두드리는 박자 같아요. 이상하죠?' },
      ],
    },
    {
      id: 'wd_star_nun', look: 'priest', name: '수녀 아가타', race: '인간', job: '대성당 제단지기 수녀', faction: 'church', portrait: '🕯️', kind: 'talk',
      spawn: { when: slot(0, { all: [after('star_bought', 1), { noFlag: 'star_sent' }] }), chance: 0.8 },
      ask: { tag: '질문', note: '별이 떨어진 밤' },
      greet: '별이 떨어진 밤에 제단 촛불이 저절로 켜졌어요. 혹시… 이상한 손님이 오지 않았나요?',
      choices: [
        {
          id: 'tell', label: '하늘 조각을 받았소',
          reply: '…제단은 언제나 비어 있어요. 무엇을 올릴지는 당신이 정하세요. 주교님께 말씀드려 둘게요.',
          effects: { vars: { rel_church: 1 }, flags: ['wd_star_told_church'] },
        },
        {
          id: 'hide', label: '아무도 안 왔소',
          reply: '그래요. 촛불이 그냥 켜지기도 하겠죠.',
          effects: {},
        },
      ],
    },
    {
      id: 'wd_star_pilgrim', look: 'elder', name: '순례자 노인 마테오', race: '인간', job: '대성당 앞에 모인 순례자', faction: 'traveler', portrait: '🙏',
      spawn: { when: { all: [after('star_to_church', 1), { noFlag: 'star_answered' }] }, chance: 0.7 },
      greet: '대성당이 사흘 밤낮 기도한다기에 왔소. 쓰러지는 이가 많소. {item} {qty}병, 가진 게 {offer}골드뿐이오.',
      request: { item: 'potion', qty: 3, offer: { mult: 0.72 }, partialOk: true },
      poor: { style: 'hao' },
      lines: { sold: '고맙소. 하늘이 대답하면 당신 몫도 빌겠소.', partial: '있는 만큼이라도 나누겠소.', refused: '…기도로 버티겠소.' },
      onSell: { news: [{ cat: '생활', text: '대성당 앞 순례자 행렬… 사흘 밤 기도에 촛불 동나' }] },
    },
    {
      id: 'wd_star_healed', look: 'hunter', name: '사냥꾼 마렌', race: '인간', job: '다리가 나은 마을 사냥꾼', faction: 'village', portrait: '🌧️',
      spawn: { when: slot(1, after('star_answered', 1)), chance: 0.8 },
      greet: '그 비를 맞고 한 해 절던 다리가 나았소. 다시 사냥을 나가오. {item} {qty}개, {offer}골드.',
      request: { item: 'bow', qty: 1, offer: { mult: 1.1 } },
      lines: { sold: '비 냄새가 아직 나오. 따뜻한 비였소.', refused: '다른 데서 구하지. 오늘은 기분이 좋으니.' },
    },

    // ═════════ 요정의 가호 (fairy_friend) — 강철수염 쪽(「강철의 시대」) 이야기는 따로 ═════════
    // 첫 약속 사흘 동안 청동 심부름꾼이 광석을 사러 온다(팔면 약속을 깬다 — 원래 규칙 그대로) → 가호(fairy_blessing) 뒤 나무꾼
    // → 두 번째 약속을 지켜 산채가 무너졌으면 드워프 피난민 → 마지막 약속(사흘 무기 금지) 동안 한스가 방패를 산다 → 숲이 기억하면 심부름꾼
    {
      id: 'wd_fairy_tempter', look: 'golem', name: '청동 심부름꾼 7호', race: '골렘', job: '청동심장 공방 심부름꾼', faction: 'golem', portrait: '⚙️',
      spawn: { when: { all: [after('fairy_oath', 1), { not: { eventFired: 'fairy_oath_check' } }] }, chance: 0.5 },
      greet: '수령 요청. {item} {qty}개. 지급액 {offer}골드. 요정 약속 여부: 조회 불가.',
      request: { item: 'iron_ore', qty: 12, offer: { mult: 1.3 }, partialOk: true },
      lines: { sold: '수령 완료. 공방 가동률 상승 예상.', partial: '부분 수령. 기록함.', refused: '거절 기록. 공방장에게 보고. 쇠는 쇠.' },
    },
    {
      id: 'wd_fairy_woodcutter', look: 'hunter_scout', name: '나무꾼 욘', race: '인간', job: '동쪽 숲 나무꾼', faction: 'village', portrait: '🪓',
      spawn: { when: slot(2, after('fairy_blessing', 1)), chance: 0.64 },
      greet: '늑대가 물러가서 숲 깊이 들어갈 수 있게 됐소. 참나무 베러 가오. {item} {qty}자루, {offer}골드.',
      request: { item: 'war_axe', qty: 1, offer: { mult: 1.1 } },
      lines: { sold: '좋은 날이오. 요정불이 길을 다 비춰 주니.', refused: '헌 도끼로 가겠소.' },
      extraChoices: [
        { id: 'warn', label: '요정숲 나무는 베지 마시오', once: true, reply: '…하긴, 길을 비춰 준 숲이오. 마른 가지만 줍겠소.', effects: { vars: { fairy_grace: 1 }, flags: ['wd_woodcutter_warned'] } },
      ],
      onSell: { if: { when: { noFlag: 'wd_woodcutter_warned' }, then: { vars: { fairy_grace: -1 } } } },
    },
    {
      id: 'wd_fairy_dwarf_refugee', look: 'dwarf2', name: '피난민 브리다', race: '드워프', job: '무너진 강철수염 산채에서 온 피난민', faction: 'dwarf', portrait: '🧳', kind: 'sell',
      spawn: { when: slot(0, { all: [{ choice: ['fairy_envoy_return', 'promise'] }, after('dwarf_fallen', 2)] }), chance: 0.8 },
      greet: '산채 용광로가 식었소. 마지막으로 벼린 {item}이오. {qty}자루, {offer}골드면 넘기겠소.',
      request: { item: 'iron_sword', qty: 1, price: 40 },
      lines: { bought: '…숲은 푸르러졌다지. 쇠 한 자루 덜 남았으니 요정들이 좋아하겠구려.', declined: '그렇구려. 칼은 넘쳐 나는 세상이니.' },
    },
    {
      // 마지막 약속(사흘 무기 금지) 동안 — 첫날의 궁수 한스. 칼 대신 방패를 청한다 (약속을 깨지 않는다)
      id: 'wd_fairy_hans', look: 'hunter', name: '한스', race: '인간', job: '마을 궁수', faction: 'village', portrait: '🏹',
      spawn: { when: after('fairy_oath3', 1), chance: 0.6 },
      greet: '칼 안 파는 무기점이라는 소문 들었소. 활은 됐고, 울타리에 세울 {item} {qty}개, {offer}골드.',
      greetWhen: [
        { when: { choice: ['d1_hunter', 'sell'] }, text: '첫날 활 사 간 한스요. 칼 안 파는 무기점이 됐다더군. 울타리에 세울 {item} {qty}개, {offer}골드.' },
      ],
      request: { item: 'shield', qty: 2, offer: { mult: 1.05 }, partialOk: true },
      lines: { sold: '요정불이 울타리까지 내려왔소. 늑대가 얼씬도 안 하오.', partial: '한 개면 대문에 세우겠소.', refused: '울타리는 나뭇가지로도 되오.' },
    },
    {
      id: 'wd_fairy_sprite', look: 'fairy', name: '숲의 심부름꾼 리프', race: '요정', job: '이슬궁 심부름꾼', faction: 'fairy', portrait: '🍃', kind: 'talk',
      spawn: { when: slot(0, after('forest_remembers', 1)), chance: 0.8 },
      ask: { tag: '선물', items: { fairy_dust: 1 }, give: true, note: '문고리에 묻은 반짝이' },
      greet: '티타니엘 님이 인사 전하래요. 이건 숲이 당신 문고리에 두고 간 거예요.',
      choices: [
        { id: 'accept', label: '고맙게 받는다', reply: '숲은 세 번 지킨 약속을 잊지 않아요. 또 올게요.', effects: { give: { fairy_dust: 1 }, vars: { rel_fairy: 1 } } },
        { id: 'decline', label: '숲에 두시오', reply: '그럼 숲 어귀에 뿌려 둘게요. 당신 이름으로요.', effects: { vars: { fairy_grace: 1, rel_fairy: 1 } } },
      ],
    },
  );

  // ───────── 사건: 정찰대 귀환 (wd_ash_scouts 에게 활을 팔았을 때) ─────────
  WS.data.events.push({
    id: 'wd_ash_scout_report', trigger: 'scheduled', priority: 12,
    outcomes: [
      {
        when: { any: [{ flag: 'dragon_awake' }, { flag: 'dragon_slain' }, { flag: 'dragon_razed' }, { flag: 'dragon_pact' }] },
        news: { cat: '왕국', text: '정찰대 귀환 "동굴에서 본 게 바로 그 용"… 모험가 칼 한 자루 주워 와' },
      },
      {
        effects: { vars: { rel_kingdom: 1 } },
        news: { cat: '왕국', text: '정찰대 귀환… "옛 광산 금 더미가 숨을 쉰다" 동굴 입구 봉쇄' },
      },
    ],
  });

  // ───────── 배경 기사 (하루 1건까지 — NewsManager) ─────────
  WS.data.ambientNews.push(
    { id: 'wd_amb_ash_missing', cat: '마을', text: '재의 산 옛 광산 간 모험가들 소식 끊겨… 기슭 마을 "연기만 짙어"', when: { all: [{ customerSeen: 'wd_ash_delvers' }, { noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { noFlag: 'dragon_razed' }] }, weight: 3, cooldown: 5 },
    { id: 'wd_amb_ash_refugees', cat: '마을', text: '재의 산 기슭 마을들 통째로 피난… 성문 앞 수레 행렬', when: { all: [{ flag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { not: { eventFired: 'dragon_descends' } }] }, weight: 4, cooldown: 2 },
    { id: 'wd_amb_night_carriage', cat: '왕국', text: '궁 뒷문에 밤마다 검은 마차… 창마다 두꺼운 커튼', when: { all: [{ flag: 'succession_crisis' }, { flag: 'vampire_backed' }, { noFlag: 'crowned' }] }, weight: 3, cooldown: 3 },
    { id: 'wd_amb_night_curfew', cat: '왕국', text: '섭정청 포고 "해 진 뒤 통행은 초대장 지닌 자만"', when: { flag: 'vampire_regent' }, weight: 4, cooldown: 4 },
    { id: 'wd_amb_grey_shields', cat: '사건', text: '묘지기 "무덤 속 해골이 새 방패를 안고 있더라"', when: { all: [{ flag: 'wd_grey_shields' }, { not: { eventFired: 'dead_march' } }] }, weight: 3, cooldown: 4 },
    { id: 'wd_amb_grey_west', cat: '먼 곳', text: '잿빛 행렬, 서쪽 가도로… 지나간 마을마다 불은 켜져 있다', when: { flag: 'undead_tide' }, weight: 3, cooldown: 4 },
    { id: 'wd_amb_mist_forget', cat: '생활', text: '상점가 주인들 "어제 장부가 기억 안 나"… 안개 낀 밤 뒤 잇따라', when: { all: [{ flag: 'demon_contract' }, { noFlag: 'mist_second_contract' }, { noFlag: 'mist_contract_broken' }] }, weight: 2, cooldown: 5 },
    { id: 'wd_amb_mist_market', cat: '소문', text: '안개 낀 밤마다 골목 장터… 금화·진주·"기억"이 한 저울에', when: { all: [{ flag: 'mist_second_contract' }, { noFlag: 'mist_contract_broken' }] }, weight: 3, cooldown: 3 },
    { id: 'wd_amb_star_vigil', cat: '생활', text: '대성당 종탑, 밤새 불 밝혀… 주교 "하늘에 물을 게 있다"', when: { all: [{ flag: 'star_to_church' }, { noFlag: 'star_answered' }] }, weight: 5, cooldown: 2 },
    { id: 'wd_amb_star_rain', cat: '마을', text: '따뜻한 비 맞은 마을, 앓아누운 이가 하나도 없다', when: { flag: 'star_answered' }, weight: 3, cooldown: 4 },
    { id: 'wd_amb_fairy_forge_cold', cat: '먼 곳', text: '강철수염 산채 용광로 식어… 동쪽 숲 가장자리엔 새순', when: { all: [{ flag: 'dwarf_fallen' }, { any: [{ flag: 'fairy_oath2_kept' }, { flag: 'fairy_blessing' }] }] }, weight: 2, cooldown: 5 },
  );

  // ───────── 맥락 한마디 (랜덤 손님 인사말 — remarks.js 규칙: 세력 기본 말투와 같아야 붙는다) ─────────
  const REM = WS.data.remarks && WS.data.remarks.list;
  if (REM) {
    const r = (id, when, faction, tone, text, cd) => REM.push({ id, cat: 'world', tone, who: { faction: [faction] }, text, weight: 2, when, cooldown: cd || 6 });
    const ashOpen = [{ noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { noFlag: 'dragon_razed' }];
    r('wd_ash_missing.village', { all: [{ customerSeen: 'wd_ash_watch' }, ...ashOpen] }, 'village', 'hae', '재의 산에 간 모험가들, 아직 소식이 없대요.');
    r('wd_ash_scouts.kingdom', { all: [{ flag: 'wd_ash_scouts_armed' }, ...ashOpen] }, 'kingdom', 'hao', '정찰대가 재의 산에 올랐다 하오. 무얼 보고 올지.');
    r('wd_night_curfew.kingdom', { flag: 'vampire_regent' }, 'kingdom', 'hao', '해가 지면 곧장 들어가시오. 요즘 법이 그렇소.');
    r('wd_night_curfew.village', { flag: 'vampire_regent' }, 'village', 'hae', '요즘은 해 지기 전에 장을 다 봐야 해요.');
    r('wd_grey_reported.village', { flag: 'wd_grey_reported' }, 'village', 'hae', '묘지에 새 방패를 묻은 사람들이 있었대요. 소름 끼쳐요.');
    r('wd_mist_ledger.guild', { all: [{ flag: 'demon_contract' }, { noFlag: 'mist_contract_broken' }] }, 'guild', 'hao', '요즘 장부를 펴면 모르는 글씨가 있소. 나만 그런 거요?', 8);
    r('wd_star_vigil.church', { all: [{ flag: 'star_to_church' }, { noFlag: 'star_answered' }] }, 'church', 'hao', '대성당이 사흘째 밤새 기도하오. 무얼 기다리는지는 주교님만 아시오.', 3);
    r('wd_fairy_oath3.village', { flag: 'fairy_oath3' }, 'village', 'hae', '칼 안 파는 무기점이라니, 신기해요. 그래도 여기 오면 마음이 놓여요.', 3);
  }
})();

// 엔딩 화면 "그 뒤의 이야기" — 가게를 거쳐 간 사람들이 어떻게 되었는지 한 줄씩 (Papers, Please 의 마지막 장처럼).
// WS.data.epilogues = [{ id, who, icon, variants: [{ when, text }] }]
//   variants 는 위에서부터 조건(Conditions DSL)이 맞는 첫 줄 하나만 보인다. 맞는 줄이 없으면 그 사람은 나오지 않는다.
//   text 는 60자 안쪽. 인물 이야기의 흐름은 js/data/stories.js 머리말.
(() => {
  const gobWeapons = min => ({ sold: { faction: 'goblin', tag: 'weapon', min } });

  WS.data.epilogues = [
    // ───────── 인물 이야기 (js/data/stories.js) ─────────
    {
      id: 'leon', who: '기사 레온', icon: '🤺',
      variants: [
        { when: { all: [{ flag: 'leon_contract' }, { noFlag: 'leon_contract_broken' }] }, text: '기사단장이 되었다. 보급 마차는 오늘도 이 가게 앞에 선다.' },
        { when: { flag: 'leon_contract_broken' }, text: '기사단장이 되었다. 이 가게와 쓴 계약서는 벽난로에 넣었다.' },
        { when: { flag: 'leon_commander' }, text: '기사단장이 되었다. 이 가게 이름은 보급 명부에 없다.' },
        { when: { all: [{ flag: 'leon_fell' }, { flag: 'leon_mourned' }] }, text: '서부 숲에 묻혔다. 비석 옆에는 당신이 보탠 촛대가 탄다.' },
        { when: { all: [{ flag: 'leon_fell' }, gobWeapons(6)] }, text: '서부 숲에서 돌아오지 않았다. 그를 벤 칼에는 익숙한 각인이 있었다.' },
        { when: { flag: 'leon_fell' }, text: '서부 숲에서 돌아오지 않았다. 종자가 방패를 들고 고향에 갔다.' },
        { when: { flag: 'leon_passed_over' }, text: '습격대를 막아 냈지만 단장 자리는 다른 이에게 갔다. 숲에서 이 가게 각인이 찍힌 칼이 나왔다는 보고 때문이다.' },
        { when: { all: [{ flag: 'leon_tavern' }, { flag: 'leon_armor_bought' }] }, text: '갑옷 판 돈으로 여관 "이 빠진 칼"을 차렸다. 네 몫의 첫 잔은 공짜다.' },
        { when: { flag: 'leon_tavern' }, text: '칼을 내려놓고 여관을 차렸다. 무기상은 손님으로 받지 않는다.' },
        { when: { flag: 'refused_leon' }, text: '첫날 칼을 못 산 기사. 그해 이 가게 문턱을 다시 넘지 않았다.' },
        { when: { customerSeen: 'd1_knight' }, text: '제7기사단 레온. 그해 내내 서부 숲 순찰을 돌았다.' },
      ],
    },
    {
      id: 'pin', who: '견습생 핀', icon: '🧒',
      variants: [
        { when: { all: [{ flag: 'pin_heir' }, { noFlag: 'pin_gone' }, { noFlag: 'shop_seized' }] }, text: '가게를 물려받았다. 장부 첫 장에 당신 이름을 적어 두었다.' },
        { when: { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }, { flag: 'shop_seized' }] }, text: '가게가 넘어가던 날, 떼어 낸 간판을 끝까지 붙들고 있었다.' },
        { when: { all: [{ flag: 'pin_to_smith' }, { flag: 'pin_first_blades' }] }, text: '강철수염 공방의 대장장이가 되었다. 첫 칼 세 자루는 당신이 샀다.' },
        { when: { flag: 'pin_to_smith' }, text: '강철수염 공방의 대장장이가 되었다. 망치 소리가 제법 곱다.' },
        { when: { all: [{ any: [{ flag: 'pin_to_army' }, { flag: 'pin_squire' }, { flag: 'pin_jailed' }] }, { flag: 'leon_commander' }] }, text: '기사단장 레온의 종자가 되었다. 방패 닦는 솜씨가 으뜸이다.' },
        { when: { flag: 'pin_jailed' }, text: '감옥에서 징집되어 서부 전선으로 갔다. 편지는 한 통도 없었다.' },
        { when: { all: [{ any: [{ flag: 'pin_to_army' }, { flag: 'pin_squire' }] }, { flag: 'leon_fell' }] }, text: '레온이 쓰러진 숲에서 살아 돌아왔다. 지금은 그 분대를 맡았다.' },
        { when: { any: [{ flag: 'pin_to_army' }, { flag: 'pin_squire' }] }, text: '서부 초소의 창병이 되었다. 휴가 때마다 가게 앞을 지나간다.' },
        { when: { flag: 'pin_joined_ring' }, text: '쥐꼬리 벤 패거리의 날쌘 손이 되었다. 이 가게 자물쇠를 잘 안다.' },
        { when: { all: [{ any: [{ flag: 'pin_lost' }, { flag: 'pin_let_go' }] }, { var: 'blackmarket', gte: 16 }] }, text: '뒷골목 소매치기 두목이 되었다. 이 가게 손님만은 건드리지 않는다.' },
        { when: { all: [{ flag: 'pin_fed' }, { flag: 'pin_lost' }] }, text: '빵값을 갚겠다던 소년. 그해 겨울 이후로 본 사람이 없다.' },
        { when: { any: [{ flag: 'pin_lost' }, { flag: 'pin_let_go' }, { flag: 'pin_refused' }] }, text: '그해 겨울 이후로 핀을 본 사람은 없다.' },
        { when: { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }] }, text: '아직 이 가게에서 비질을 한다. 가끔 장부를 몰래 읽는다.' },
      ],
    },
    {
      // 안개 상단 (faction id demon) — 두 계약 (customers.js demon_contract · mist_contract2)
      id: 'mist', who: '안개 상단', icon: '🌫️',
      variants: [
        { when: { all: [{ flag: 'mist_paid_memory' }, { customerSeen: 'd1_knight' }, { noFlag: 'leon_fell' }] }, text: '첫 손님의 얼굴을 받아 갔다. 레온이 들러도 당신은 알아보지 못한다.' },
        { when: { flag: 'mist_paid_memory' }, text: '첫 손님의 얼굴을 받아 갔다. 장부 첫 장의 이름이 낯설다.' },
        { when: { flag: 'mist_sign_mark' }, text: '간판의 안개 문양은 지워지지 않는다. 금고는 한 번도 비지 않았다.' },
        { when: { flag: 'mist_contract_broken' }, text: '두 번째 계약서를 찢었다. 안개 낀 밤엔 문 두드리는 소리만 난다.' },
        { when: { flag: 'demon_contract_amended' }, text: '제7조를 지운 계약서. 글자가 해마다 조금씩 흐려진다.' },
        { when: { flag: 'demon_contract' }, text: '첫 계약서는 금고 밑에 있다. 무엇을 치렀는지는 기억나지 않는다.' },
        { when: { flag: 'refused_contract' }, text: '계약을 거절당한 상단. 안개 낀 밤마다 가게 앞을 천천히 지나간다.' },
      ],
    },
    {
      id: 'silverscale', who: '은화 저울 상회', icon: '🪙',
      variants: [
        { when: { flag: 'shop_seized' }, text: '압류한 가게를 경매에 부쳤다. 낙찰자는 길 건너 대장간이었다.' },
        { when: { flag: 'garret_paid_debt' }, text: '빚은 가렛의 금화로 청산됐다. 그 금화의 출처는 묻지 않았다.' },
        { when: { all: [{ flag: 'debt_cleared' }, { flag: 'debt_threatened' }] }, text: '빚은 다 받았다. 깨진 유리창 이야기는 서로 꺼내지 않는다.' },
        { when: { flag: 'debt_cleared' }, text: '빚 장부의 당신 이름에 붉은 줄이 그어졌다. 모트가 처음 웃었다.' },
        { when: { customerSeen: 'debt_collector_1' }, text: '받지 못한 빚이 상회 장부에 남았다. 모트는 아직 날짜를 센다.' },
      ],
    },
    {
      // 밀수 (js/data/smuggling.js)
      id: 'nix', who: '"장부" 닉스', icon: '🕶️',
      variants: [
        { when: { flag: 'smuggle_burned' }, text: '꼬리 밟힌 가게와는 다시 일하지 않았다. 요즘은 다른 뒷문을 두드린다.' },
        { when: { flag: 'smuggle_king_declined' }, text: '큰손의 제안은 거절당했지만, 짐마차는 여전히 뒷문에 선다.' },
        { when: { all: [{ flag: 'smuggle_route' }, { var: 'illegal_sale_count', gte: 6 }] }, text: '장물 판 기록이 여섯 번을 넘었다. 뒷골목은 이 가게 서랍을 "닉스의 두 번째 금고"라 부른다.' },
        { when: { flag: 'smuggle_route' }, text: '장물함이 비면 사흘 안에 짐마차가 선다. 장부에는 적히지 않는다.' },
        { when: { flag: 'smuggle_declined' }, text: '장물을 맡기려다 거절당했다. 뒷골목에선 고지식한 가게라 부른다.' },
      ],
    },
    {
      // 감찰관 앞에서 사실대로 말한 횟수 (inspector_truth — 고해 · 자백 · 귀띔)
      id: 'inspector', who: '왕국 감찰관', icon: '🕵️',
      variants: [
        { when: { var: 'inspector_truth', gte: 3 }, text: '이 가게 진술은 늘 사실대로였다. 재조사 목록에서 이름이 조용히 빠졌다.' },
        { when: { var: 'inspector_truth', gte: 1 }, text: '한두 번은 사실대로 말했다. 수첩에는 "협조적"이라고만 적혔다.' },
      ],
    },
    {
      id: 'garret', who: '전 주인 가렛', icon: '🗝️',
      variants: [
        { when: { flag: 'garret_exposed' }, text: '교수대에 올랐다. 판결문에 칼 40자루의 행방이 한 줄씩 적혔다.' },
        { when: { all: [{ flag: 'garret_raid' }, { flag: 'garret_confessed' }] }, text: '당신의 자수로 붙잡혔다. 법정에서 끝까지 당신을 동업자라 불렀다.' },
        { when: { flag: 'garret_raid' }, text: '마을이 불탄 뒤 남쪽 항구로 사라졌다. 몫은 꼬박꼬박 보내온다.' },
        { when: { flag: 'garret_caught' }, text: '짐마차와 함께 붙잡혔다. 심문에서 동업자 이름을 순순히 댔다.' },
        { when: { flag: 'garret_hushed' }, text: '장부를 받아 들고 남쪽 항구로 떠났다. 거기서도 칼을 판다.' },
        { when: { flag: 'garret_refused' }, text: '가게 앞을 몇 번 서성이다 사라졌다. 험담만 남기고.' },
        { when: { flag: 'old_ledger_burned' }, text: '서랍 속 장부는 재가 되었다. 가렛이라는 이름도 함께 탔다.' },
        { when: { customerSeen: 'carpenter_ledger' }, text: '서랍 속 장부의 주인. 그해 끝내 가게에 나타나지 않았다.' },
      ],
    },
    {
      id: 'eda', who: '붉은여울의 에다', icon: '🕯️',
      variants: [
        { when: { flag: 'eda_bell' }, text: '남편 칼자루로 만든 방울은 지금도 이 가게 문에서 울린다.' },
        { when: { flag: 'eda_peace' }, text: '붉은여울로 돌아가 과수원을 다시 일궜다. 방울은 제단에 걸렸다.' },
        { when: { flag: 'eda_paid' }, text: '배상금으로 우물 셋을 팠다. 우물에 이 가게 이름은 새기지 않았다.' },
        { when: { flag: 'garret_confessed' }, text: '법정에서 당신의 자수를 들었다. 그날 처음으로 울지 않았다.' },
        { when: { flag: 'eda_cursed' }, text: '두 번째 불길에서 살아남았다. 이번엔 가게 이름을 안다.' },
        { when: { flag: 'widow_compensated' }, text: '위로금으로 우물을 다시 팠다. 가렛의 이름은 끝내 몰랐다.' },
        { when: { flag: 'widow_told' }, text: '가렛이라는 이름을 들고 스무 해 만에 남편 무덤을 찾았다.' },
        { when: { flag: 'widow_denied' }, text: '끝내 답을 듣지 못했다. 이듬해 봄에도 가게 문을 두드리고 다녔다.' },
      ],
    },

    // ───────── 앞선 이야기의 얼굴들 ─────────
    {
      id: 'obel', who: '보석상 오벨', icon: '💍',
      variants: [
        { when: { flag: 'obel_gems_returned' }, text: '"금고보다 믿을 가게"라며 은방울 단골들을 이 가게로 보낸다.' },
        { when: { flag: 'obel_repaid' }, text: '400G는 받았지만, 그 루비만은 끝내 다시 찾지 못했다.' },
        { when: { flag: 'obel_gems_lost' }, text: '보석방 거리에서 이 가게 이름이 나오면 조용히 자리를 뜬다.' },
        { when: { flag: 'refused_obel_gems' }, text: '보석은 다른 금고에 맡겼다. 그 금고는 그해 털렸다.' },
      ],
    },
    {
      id: 'ratwhisker', who: '"쥐수염"', icon: '🐀',
      variants: [
        { when: { flag: 'caught_gem_thief' }, text: '지하 감옥에서 두건을 벗었다. 귀 끝이 정말 잘려 있었다.' },
        { when: { flag: 'gave_gems_to_thief' }, text: '오벨의 루비를 팔아 남쪽 배에 올랐다. 인상서는 아직 붙어 있다.' },
        { when: { flag: 'sent_gem_thief_away' }, text: '다른 가게에서 심부름꾼 행세를 하다 붙잡혔다고 한다.' },
      ],
    },
    {
      id: 'bron', who: '대장장이 브론', icon: '🧔',
      variants: [
        { when: { all: [{ flag: 'sold_bron' }, { flag: 'dwarf_steel_unlocked' }] }, text: '당신이 판 광석으로 새 강철을 벼렸다. 씨족 연대기에 한 줄 올랐다.' },
        { when: { flag: 'sold_bron' }, text: '강철수염 대장간에서는 이 가게 칼을 반값에 갈아 준다.' },
        { when: { choice: ['d1_dwarf', 'refuse'] }, text: '다른 광석상을 찾았다. 그 집 광석엔 모래가 반이었다고 투덜댄다.' },
      ],
    },
    {
      id: 'marga', who: '곡물 상인 마르가', icon: '🌙',
      variants: [
        { when: { flag: 'marga_thanked' }, text: '서부 숲 밀사로 국경을 오간다. 당신 이름을 암호로 쓴다고 한다.' },
        { when: { flag: 'marga_stigma' }, text: '왕실 기록에 적국 밀사로 남았다. 도운 가게 이름도 함께.' },
        { when: { flag: 'reported_marga' }, text: '감찰청에 넘겨진 뒤 소식이 끊겼다. 숲은 밀사 하나를 잃었다.' },
        { when: { flag: 'sold_marga' }, text: '초승달 흉터 여인은 다시 나타나지 않았다. 물약 값은 정확했다.' },
      ],
    },
    {
      id: 'lisa', who: '여관 하녀 리사', icon: '🧣',
      variants: [
        { when: { flag: 'lisa_vampire_friend' }, text: '밤의 궁정 시녀장이 되었다. 해 진 뒤 가끔 금화를 두고 간다.' },
        { when: { flag: 'lisa_branded' }, text: '궁정이 무너진 날 사라졌다. 가게엔 "흡혈귀 편" 낙인만 남았다.' },
        { when: { flag: 'reported_lisa' }, text: '사냥꾼 조합에 넘겨졌다. 목도리만 가게 앞에서 발견되었다.' },
        { when: { flag: 'helped_lisa' }, text: '은서리 여관에 더는 나오지 않는다. 목도리만 걸려 있다.' },
        { when: { flag: 'refused_lisa_silent' }, text: '그날 밤 다른 가게 문을 두드렸다. 그 뒤는 아무도 모른다.' },
      ],
    },
    {
      // 세상 쪽 뒷이야기 — 엔딩으로 이어지지 않은 큰일 (내가 관여하지 않은 전쟁의 결과 등)
      id: 'world_north', who: '북부', icon: '🏴',
      variants: [
        { when: { all: [{ flag: 'demonlord_victory' }, { noFlag: 'demonlord_pact' }, { noFlag: 'armed_demonlord' }] }, text: '휴전 뒤 북부엔 마왕군 징세관이 돌아다닌다. 이 가게 칼이 그들 손에 들린 적은 없다.' },
        { when: { flag: 'demonlord_repelled' }, text: '마왕군은 황무지로 물러갔다. 북부 마을들은 아직 다시 짓는 중이다.' },
      ],
    },
  ];
})();

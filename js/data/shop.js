// 금화로 사는 것들 · 달력 이벤트 일정 · 밤 경비 — 문구와 수치 (데이터). 엔진: js/systems/Shop.js
//
// goods    가게 물품 — 까마귀 서신(가게 물품 주문)으로 한 번만 산다. 삯은 선불, days 일 뒤 아침 답장과 함께 들어온다 (Letters.sendShop → Shop.grant, state.upgrades[id] = true)
//   map(장부 3쪽 대륙 지도) · reputationMap(4쪽 대륙 정세 — 정확한 숫자) · informant(4쪽 평판·왕국 우세도 변화) · calendar(2쪽 7일 달력) · sign(평판 +rep, 손님 +customers)
// paper    신문 구독 — 구독하기 전엔 신문이 오지 않는다 (state.subscribed). 구독료 fee G/일
// calendar 달력 이벤트 — events.js 의 cal_* 이벤트가 이 일정을 본다 (Conditions 'calendar', EventManager.runDawn).
//   schedule[]  확정 일정: days = 시작일 목록, span = 며칠 이어지나. 달력을 산 판은 예정·내일 예고가 장부에 보인다 (안 사도 그날엔 일어난다)
//   random[]    재난 — 판당 한 번, chance 로 발생 여부를 굴리고 range 안에서 날짜를 정한다 (판이 시작될 때 한 번). 달력에는 날짜가 없고 '흉흉한 징조'만 (omenDays 일 전부터)
// guard    밤 경비 — 까마귀 편지로 고용/해고 (Letters.js). 일당은 마감 정산에서 (DayManager.closeShop), 모자라면 그날 해고
//   lines[knock id]  문틈으로 살핀 정체 (하오체, 무뚝뚝) — 없는 종류는 lines.default
WS.data.shop = {
  goods: [
    { id: 'map', name: '대륙 지도', icon: '🗺️', cost: 120, days: 1, tag: '장부 3쪽', sender: 'mapmaker',
      desc: '장부에 대륙 지도가 그려진다. 세력이 있는 곳과 전선, 내 가게와의 우호도가 색으로 보인다.',
      letter: { subject: '대륙 지도를 보내오', body: '주문하신 대륙 지도요. 장부 3쪽에 붙여 두었소. 아는 곳은 색을 칠하고, 모르는 곳은 물음표로 두었소.\n새 소식이 들어올 때마다 알아서 채워지오. — 지도 공방 "나침반"' } },
    { id: 'reputationMap', name: '평판지', icon: '📜', cost: 100, days: 1, tag: '장부 4쪽 · 대륙 정세', sender: 'gazetter',
      desc: '장부 4쪽에 대륙 정세가 실린다. 세력 힘 · 우호도가 정확한 숫자로 적히고, 최근 5일의 변화량이 붙는다.',
      letter: { subject: '평판지를 들이오', body: '평판지를 장부에 끼워 두었소. 세력마다 힘이 0에서 100까지 숫자로 적히고, 닷새 사이 얼마나 움직였는지도 붙소.\n숫자는 거짓말을 하지 않소. — 평판지 서기 "잉크"' } },
    { id: 'informant', name: '정보통', icon: '🕵️', cost: 150, days: 2, tag: '장부 4쪽 · 평판·우세도', sender: 'informant',
      desc: '가게 평판과 왕국 우세도가 최근 5일 사이 몇 오르고 내렸는지 알려 준다. 평판지가 없어도 4쪽에 실린다.',
      letter: { subject: '귀를 열어 두었소', body: '뒷골목에 귀를 심어 두었소. 이제 이 가게 평판이 얼마나 올랐는지, 왕국 쪽 기세가 얼마나 꺾였는지 닷새 단위로 알려 주겠소.\n헛소문은 걸러 보내니 걱정 마시오. — 깃털' } },
    { id: 'calendar', name: '달력', icon: '📅', cost: 100, days: 1, tag: '장부 2쪽', sender: 'mapmaker',
      desc: '장부 2쪽에 앞으로 7일의 장날 · 행사가 적힌다. 내일 있을 일은 아침에 한 줄로 알려 준다.',
      letter: { subject: '달력을 보내오', body: '올해 달력이오. 장날과 왕실 행사는 미리 적어 두었소.\n재난은 날짜를 알 수 없으니 흉흉한 낌새만 표시하겠소. — 지도 공방 "나침반"' } },
    { id: 'sign', name: '간판 교체', icon: '🏷️', cost: 200, days: 2, tag: '가게', rep: 2, customers: 1, sender: 'carpenter',
      desc: '새 간판을 단다. 가게 평판이 2 오르고, 하루에 오는 손님이 1명 늘어난다 (한 번뿐).',
      letter: { subject: '간판 달았소', body: '간판을 새로 달았소. 글씨는 큼직하게 했소. 지나가는 사람 눈에 띌 거요.\n삯은 이미 받았소. — 목수 드발' } },
  ],
  // 신문 구독 — 까마귀로 신청한다. 신청한 다음 날 아침부터 대륙 일보가 문틈에 끼워져 오고, 구독료는 마감 정산에서 (모자라면 그날 끊긴다)
  paper: {
    fee: 10, name: '대륙 일보', from: 'roost',
    lapseNews: '구독료 10G를 치를 금고가 비어 신문이 끊겼다.',
    lapse: { subject: '신문이 끊겼소', body: '어젯밤 정산에서 구독료 {fee}G를 받지 못해 대륙 일보 배달을 멈췄소.\n다시 받아 보려면 까마귀로 구독을 신청하시오. — 둥지지기 레나' },
    subscribed: { subject: '구독을 받았소', body: '대륙 일보를 내일 아침부터 문틈에 끼워 두겠소. 구독료는 하루 {fee}G, 밤마다 정산에서 나가오. — 둥지지기 레나' },
    cancelled: { subject: '구독을 멈췄소', body: '대륙 일보 배달을 멈췄소. 언제든 다시 신청하시오. — 둥지지기 레나' },
  },

  calendar: {
    lookahead: 7,
    schedule: [
      { id: 'fair', name: '장날', icon: '🎪', days: [8, 16, 24, 32], span: 1, hint: '읍내에 장이 선다 — 사람이 몰리고 시세가 잠잠하다' },
      { id: 'parade', name: '왕실 열병식', icon: '🎺', days: [12, 30], span: 3, hint: '왕실 열병식 — 사흘간 칼·방어구를 찾는다' },
      { id: 'harvest', name: '수확제', icon: '🌾', days: [20], span: 2, hint: '수확제 — 마을 사람이 물약·향신료를 찾는다' },
    ],
    random: [
      { id: 'plague', chance: 0.08, range: [10, 30] },
      { id: 'disaster', chance: 0.05, range: [15, 35] },
    ],
    omenDays: 3,
    omenText: '흉흉한 징조 — 저잣거리 분위기가 심상치 않다',
    // 재난: 창고 재고 일부가 상한다 (pct 범위에서 하나 굴려 모든 물건에 같은 비율). 보험은 손실의 절반을 되찾는다 (삯 fee, 그다음 날까지)
    disaster: { pct: [0.05, 0.10], fee: 50, restore: 0.5, kinds: [{ id: 'fire', name: '화재' }, { id: 'flood', name: '홍수' }] },
    // 전염병: days 일 동안 물약·성수 시세 × mult, 앞의 days-1 일은 손님이 준다 (events.js cal_plague)
    plague: { days: 4, mult: 1.4 },
    insurer: { name: '재난 보상 조합', icon: '🛡️' },
  },

  guard: {
    wage: 20,
    hire: { title: '경비 고용', to: '경비 중개소 "쇠문"', icon: '💂', desc: '밤 경비를 세운다. 일당 20G — 밤에 문을 두드리는 자가 누구인지 문 열기 전에 알려 준다' },
    fire: { title: '경비 해고', desc: '경비를 내보낸다. 일당은 더 나가지 않는다' },
    // 밤 장면 — 경비가 문틈으로 먼저 살핀다 (문 두드림 틀의 knock.id 별)
    lines: {
      robber: '칼 든 그림자요. 도둑이오.',
      star: '이상한 빛이 문틈으로 스미오. 사람 같지 않소.',
      liga: '저울 브로치를 단 사람이오.',
      default: '낯선 손님이오.',
    },
    who: '경비',
    // 밤 장면 선택지 (문 두드림 틀의 선택지와 함께 보인다)
    driveOff: { label: '경비에게 쫓아내게 한다', reply: '(경비가 문 뒤로 성큼 나서자 발소리가 급히 멀어진다.)' },
    fireNews: '경비의 일당 20G를 치를 금고가 비어 경비가 그만두었다.',
  },
};

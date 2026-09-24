// 금화로 사는 것들 · 달력 이벤트 일정 · 밤 경비 — 문구와 수치 (데이터). 엔진: js/systems/Shop.js
//
// goods    가게 물품 — 도매상 펼침 맨 끝 '가게 물품' 구역에서 한 번만 산다 (state.upgrades[id] = true). 즉시 결제 (거래 진행과 별개)
//   effect 는 Shop.buy 가 처리한다: reputationMap(정세에 정확한 숫자) · calendar(장부에 7일 예정) · sign(평판 +rep, 간판 그림 sign_new)
// calendar 달력 이벤트 — events.js 의 cal_* 이벤트가 이 일정을 본다 (Conditions 'calendar', EventManager.runDawn).
//   schedule[]  확정 일정: days = 시작일 목록, span = 며칠 이어지나. 달력을 산 판은 예정·내일 예고가 장부에 보인다 (안 사도 그날엔 일어난다)
//   random[]    재난 — 판당 한 번, chance 로 발생 여부를 굴리고 range 안에서 날짜를 정한다 (판이 시작될 때 한 번). 달력에는 날짜가 없고 '흉흉한 징조'만 (omenDays 일 전부터)
// guard    밤 경비 — 까마귀 편지로 고용/해고 (Letters.js). 일당은 마감 정산에서 (DayManager.closeShop), 모자라면 그날 해고
//   lines[knock id]  문틈으로 살핀 정체 (하오체, 무뚝뚝) — 없는 종류는 lines.default
WS.data.shop = {
  goods: [
    { id: 'reputationMap', name: '평판지', icon: '📜', cost: 100, tag: '대륙 정세',
      desc: '대륙 정세에 세력 힘 · 우호도 · 평판이 정확한 숫자로 적히고, 최근 5일의 변화량이 붙는다.' },
    { id: 'calendar', name: '달력', icon: '📅', cost: 100, tag: '장부',
      desc: '앞으로 7일의 장날 · 행사 예정이 장부에 적힌다. 내일 있을 일은 아침에 한 줄로 알려 준다.' },
    { id: 'sign', name: '간판 교체', icon: '🏷️', cost: 200, tag: '가게', rep: 2,
      desc: '새 간판을 단다. 가게 평판이 2 오른다 (한 번뿐).' },
  ],

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

// 노름꾼 카이 — 여섯 번 찾아와 같은 내기를 건다. "확실한 돈을 받을래, 동전을 던질래."
// 위험 선호를 재는 손님이다 (기댓값이 같거나 손해인 판도 섞여 있다). 내기는 카이가 자기 돈으로 하므로 플레이어의 금고는 줄지 않는다.
// 세 번 받아들이면 영업 뒤 밤마다 지하 도박장에 갈 수 있다 (flags.casino_open — js/systems/Casino.js).
// 내기를 config.gamblerBets 번 이상 고르면 엔딩 gambler (js/data/endings.js). 고른 것은 state.choices[gambler_N] = safe | bet | pass 로 남는다 (stats/choice_tags.json).
(() => {
  const C = WS.data.customers;
  const KAI = { look: 'gambler', name: '노름꾼 카이', race: '인간', job: '떠돌이 노름꾼', faction: 'traveler', portrait: '🎲', kind: 'talk' };
  // [약속한 날, 확실한 돈, 상금, 이길 확률, 인사]
  const ROUNDS = [
    [4, 50, 100, 0.5, '어젯밤 판에서 좀 땄소. 그냥 가긴 아깝고… 한 판 하지. 50G를 그냥 받든가, 동전 던져서 앞이면 100G, 뒤면 빈손.'],
    [8, 80, 200, 0.5, '또 왔소. 이번엔 확실한 80G, 아니면 앞뒤로 200G. 앞뒤 확률은 반반이지.'],
    [12, 40, 200, 0.2, '주사위 다섯 개 중 하나만 맞으면 200G요. 아니면 40G를 그냥 받든가. 어느 쪽이오?'],
    [16, 150, 200, 0.8, '오늘은 후한 날이오. 150G를 그냥 주겠소. 대신 던지면 열에 여덟은 200G. 뭐, 던질 사람은 없겠지만.'],
    [20, 60, 300, 0.2, '이 가게 문턱을 넘으면 운이 붙는다더군. 60G를 받든가, 5분의 1에 300G를 걸든가.'],
    [24, 100, 500, 0.1, '마지막이 될지도 모르겠소. 100G를 그냥 받든가, 열에 한 번 500G. 손해 보는 판인 건 나도 아오.'],
  ];
  const pct = p => `${Math.round(p * 100)}%`;
  ROUNDS.forEach(([day, sure, prize, p, greet], k) => {
    const n = k + 1;
    C.push({
      id: `gambler_${n}`, ...KAI,
      spawn: { when: { all: [{ realDay: { gte: day } }].concat(k ? [{ customerSeen: `gambler_${k}` }] : []) }, pinned: true },
      ask: { tag: '내기', note: `확실한 ${sure}G · 도박 ${pct(p)}로 ${prize}G` },
      greet,
      choices: [
        { id: 'safe', label: `${sure}G를 받는다`, reply: '확실한 게 좋지. 현명하오.', effects: { gold: sure } },
        {
          id: 'bet', label: `던진다 (${pct(p)}로 ${prize}G)`,
          reply: '(동전이 돈다)',
          effects: {
            vars: { gamble_bets: 1 },
            if: { when: { var: 'gamble_bets', gte: 3 }, then: { flags: ['casino_open'] } }, // 세 번째부터 밤의 지하 도박장 (js/systems/Casino.js)
            chance: { p,
              tails: [{ when: { var: 'gamble_bets', eq: 3 }, text: '…그나저나, 당신 같은 사람이 갈 데가 있소. 가게 문 닫고 나면 뒷골목 지하로 내려와 보시오. 판돈은 마음대로요.' }],
              win: { effects: { gold: prize, vars: { gamble_wins: 1 } }, say: `앞이다! ${prize}G, 가져가시오. …운이 좋군.` },
              lose: { say: '뒤요. 아깝게 됐군. 그래도 이 맛에 하는 거지.' } },
          },
        },
        { id: 'pass', label: '노름꾼 돈은 안 받는다', reply: '깐깐하군. 뭐, 좋소.', effects: {} },
      ],
    });
  });
})();

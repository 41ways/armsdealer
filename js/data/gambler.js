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
              tails: [{ when: { var: 'gamble_bets', eq: 3 }, text: '…자네가 이렇게 좋아할 줄은 몰랐네. 그럼 가게 끝나면 지하 도박장으로 오게. 뒷골목 「검은 주사위」요. 판돈은 마음대로고, 판도 이런 동전 던지기만 있는 게 아니야.' }],
              win: { effects: { gold: prize, vars: { gamble_wins: 1 } }, say: `앞이다! ${prize}G, 가져가시오. …운이 좋군.` },
              lose: { say: '뒤요. 아깝게 됐군. 그래도 이 맛에 하는 거지.' } },
          },
        },
        { id: 'pass', label: '노름꾼 돈은 안 받는다', reply: '깐깐하군. 뭐, 좋소.', effects: {} },
      ],
    });
  });

  // ───────── 도박사의 길 — 지하 도박장이 열린 뒤 (js/systems/Casino.js 가 플래그를 켠다) ─────────
  // casino_regular(세 판 이상 놀았다) → 그 상태에서 망하면 엔딩 gambler_ruin 「패가망신」 (endings.js · config.endNow)
  // casino_hooked (여섯 판 이상) → 마담 로자의 초대(VIP 룸) → 카이의 부탁 → 서기 에릭의 차용증 → 로자의 마지막 제안 → 받아들이면 그날 밤 엔딩 gambler_pro 「도박사」
  const MADAM = { look: 'madam', name: '마담 로자', race: '인간', job: '「검은 주사위」 주인', faction: 'traveler', portrait: '🎭', kind: 'talk' };
  const CLERK = { look: 'clerk', name: '서기 에릭', race: '인간', job: '왕실 조달청 서기', faction: 'kingdom', portrait: '📜', kind: 'talk' };
  C.push(
    {
      id: 'gm_madam', ...MADAM,
      spawn: { when: { all: [{ flag: 'casino_hooked' }, { realDay: { gte: 13 } }] }, pinned: true },
      ask: { tag: '초대장', note: '위층 VIP 룸' },
      greet: '아래층에서 당신 손을 지켜봤어요. 판돈을 밀 때 눈빛이 변하더군요. 위층 방 초대장을 가져왔어요. 앉겠어요?',
      choices: [
        { id: 'accept', label: '초대를 받는다', reply: '좋아요. 오늘 밤부터 위층 문이 열려 있을 거예요. 판돈은 아래층의 두 배부터예요.', effects: { flags: ['vip_open'] } },
        { id: 'decline', label: '나는 장사꾼이오', reply: '쳇. …문은 열어 둘게요. 마음이 바뀌면 오세요.', effects: { flags: ['vip_declined'], vars: { integrity: 1 } } },
      ],
    },
    {
      id: 'gm_kai_broke', ...KAI,
      spawn: { when: { all: [{ flag: 'vip_open' }, { since: { flag: 'vip_open', days: 2 } }] }, pinned: true },
      ask: { tag: '부탁', gold: -100, note: '노름꾼 카이가 빌려 달라 함' },
      greet: '…털렸소. 위층에서 마지막 한 푼까지. 100G만 빌려주시오. 다음 판에 반드시 갚겠소. 정말이오.',
      choices: [
        { id: 'lend', label: '100G를 빌려준다', when: { gold: { gte: 100 } }, reply: '고맙소… 자네는 나 같은 놈 되지 마시오. 이건 진심이오.', effects: { gold: -100, flags: ['kai_lent', 'pro_v2'] } },
        { id: 'refuse', label: '더는 못 빌려준다', reply: '…그렇겠지. 나라도 안 빌려주지. 동전 값은 내가 알아서 하겠소.', effects: { flags: ['kai_refused', 'pro_v2'] } },
      ],
    },
    {
      id: 'gm_clerk', ...CLERK,
      spawn: { when: { all: [{ flag: 'vip_open' }, { customerSeen: 'gm_kai_broke' }, { flag: 'pro_v2' }, { since: { flag: 'pro_v2', days: 2 } }] }, pinned: true },
      ask: { tag: '차용증', gold: 250, note: '조달청 공금으로 건 판돈' },
      greet: '어젯밤 위층에서 당신께 250G를 잃은 사람입니다. …제 돈이 아닙니다. 조달청 금고 돈입니다. 차용증을 물러 주십시오. 사흘 뒤 감사가 옵니다.',
      choices: [
        { id: 'forgive', label: '차용증을 찢는다', reply: '…감사합니다. 이 은혜는 잊지 않겠습니다. 다시는 그 계단을 내려가지 않겠습니다.', effects: { flags: ['pro_mercy', 'pro_v3'], vars: { reputation: 1 } } },
        { id: 'collect', label: '판은 판이오. 갚으시오', reply: '(품에서 봉투를 꺼내 놓는다) …여기 250G입니다. 저는 이제 끝났군요.', effects: { gold: 250, flags: ['pro_cruel', 'pro_v3'], vars: { integrity: -1 } } },
        { id: 'report', label: '감찰관에게 알린다', reply: '…그러시군요. 옳은 일을 하시는 겁니다. 제가 가서 자수하겠습니다.', effects: { flags: ['pro_reported', 'pro_v3'], vars: { rel_kingdom: 2, integrity: 1 } } },
      ],
    },
  );
  // 마지막 제안 — 한 번 거절하면 사흘 뒤 한 번 더 온다
  const offer = (id, prev, greet) => ({
    id, ...MADAM,
    spawn: { when: { all: prev }, pinned: true },
    ask: { tag: '마지막 제안', note: '가게를 접고 지하로' },
    greet,
    choices: [
      { id: 'accept', label: '가게를 접고 내려간다', confirm: '정말 내려간다 — 가게 문을 닫고 이야기가 끝난다', reply: '현명해요. 계약서는 위층에 준비돼 있어요. 오늘 밤부터 당신도 판을 벌이는 쪽이에요.', effects: { flags: ['gambler_pro_accepted'] } },
      { id: 'decline', label: '아직은 칼이 좋소', reply: '…그래요. 하지만 손은 이미 판 위에 있어요. 마음이 바뀌면 부르세요.', effects: { flags: ['pro_declined'] } },
    ],
  });
  C.push(
    offer('gm_madam_final', [{ flag: 'vip_open' }, { customerSeen: 'gm_clerk' }, { flag: 'pro_v3' }, { since: { flag: 'pro_v3', days: 2 } }, { realDay: { gte: 17 } }],
      '위층 방이 당신 없이는 심심해졌어요. 그래서 제안이에요. 도박장 절반을 당신 이름으로 올리겠어요. 대신 낮의 칼 장사는 접고 아래로 내려와요. 이쪽이 벌이도 낫잖아요?'),
    offer('gm_madam_final2', [{ customerSeen: 'gm_madam_final' }, { flag: 'pro_declined' }, { since: { flag: 'pro_declined', days: 3 } }, { noFlag: 'gambler_pro_accepted' }, { realDay: { lte: 27 } }],
      '한 번 더 물어볼게요. 절반은 아직 당신 몫이에요. 칼은 언제든 다른 사람이 팔지만, 그 자리에 앉을 손은 흔치 않아요.'),
  );
})();

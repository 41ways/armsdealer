// 노름꾼 카이 — 6·9·12·15·18일에 찾아와 동전 내기를 건다. 판돈을 걸면(금고에서 나감) 이기면 상금을 돌려받는다.
// 이 가운데 세 번 걸면 영업 뒤 밤마다 지하 도박장에 갈 수 있다 (flags.casino_open — js/systems/Casino.js).
// 가장 빠른 도박 길: 6·9·12일에 걸기 → 12일 밤 개장 → 13·14·15일 밤 출근(개장한 날 밤은 세지 않는다) → 16일 감찰관 마크의 탐문(모른다)
//   → 16일 밤 단속(봐줌) → 17일 마담의 회유 → 17일 밤 큰 판·체포 → 엔딩 「도박의 끝」. 18일에 열리면 23일에 끝난다.
// 고른 것은 state.choices[gambler_N] = bet | pass 로 남는다 (stats/choice_tags.json).
(() => {
  const C = WS.data.customers;
  const KAI = { look: 'gambler', name: '노름꾼 카이', race: '인간', job: '떠돌이 노름꾼', faction: 'traveler', portrait: '🎲', kind: 'talk' };
  const P = 0.5; // 동전 앞이 나올 확률
  // [찾아오는 날, 판돈, 이기면 돌려받는 돈, 인사]
  const ROUNDS = [
    [6, 10, 30, '어젯밤 판에서 좀 땄소. 그냥 가긴 아깝고… 한 판 하지. 10G만 걸어 보시오. 앞이 나오면 30G로 돌려주겠소.'],
    [9, 20, 50, '또 왔소. 지난번 맛이 어땠소? 이번엔 20G를 걸면 앞이 나올 때 50G요.'],
    [12, 50, 100, '판을 좀 키워 볼까. 50G를 걸면 앞이 나올 때 100G요. 반반이지.'],
    [15, 50, 100, '이 가게 문턱을 넘으면 운이 붙는다더군. 50G 걸고, 앞이면 100G. 어떻소?'],
    [18, 50, 100, '마지막이 될지도 모르겠소. 50G에 100G. 한 판만 더 하지.'],
  ];
  const INVITE = '…자네가 이렇게 좋아할 줄은 몰랐네. 그럼 가게 끝나면 지하 도박장으로 오게. 뒷골목 「검은 주사위」요. 판돈은 마음대로고, 판도 이런 동전 던지기만 있는 게 아니야.';
  ROUNDS.forEach(([day, stake, prize, greet], k) => {
    const n = k + 1;
    C.push({
      id: `gambler_${n}`, ...KAI,
      spawn: { when: { all: [{ realDay: { gte: day } }].concat(k ? [{ customerSeen: `gambler_${k}` }] : []) }, pinned: true },
      ask: { tag: '내기', gold: -stake, note: `${stake}G 걸고 앞이면 ${prize}G` },
      greet,
      choices: [
        {
          id: 'bet', label: `${stake}G를 건다 (앞이면 ${prize}G)`, when: { gold: { gte: stake } },
          reply: '(동전이 돈다)',
          effects: {
            gold: -stake,
            vars: { gamble_bets: 1 },
            // 세 번째 건 날 밤부터 지하 도박장 (이미 열렸으면 날짜를 덮지 않는다 — 출근 날 수를 개장 다음 날부터 센다)
            if: { when: { all: [{ var: 'gamble_bets', gte: 3 }, { noFlag: 'casino_open' }] }, then: { flags: ['casino_open'] } },
            chance: { p: P,
              tails: [{ when: { var: 'gamble_bets', eq: 3 }, text: INVITE }],
              win: { effects: { gold: prize, vars: { gamble_wins: 1 } }, say: `앞이다! ${prize}G, 가져가시오. …운이 좋군.` },
              lose: { say: '뒤요. 아깝게 됐군. 그래도 이 맛에 하는 거지.' } },
          },
        },
        { id: 'pass', label: '노름은 안 하오', reply: '깐깐하군. 뭐, 좋소.', effects: {} },
      ],
    });
  });

  // ───────── 지하 도박장이 열린 뒤 (js/systems/Casino.js 가 플래그를 켠다) ─────────
  // casino_regular(세 판 이상) 상태에서 망하면 엔딩 gambler_ruin 「패가망신」
  const MADAM = { look: 'madam', name: '마담 로자', race: '인간', job: '「검은 주사위」 주인', faction: 'traveler', portrait: '🎭', kind: 'talk' };
  // 감찰관의 탐문 — 도박장을 사흘 넘게(서로 다른 사흘) 찾은 다음 날 (flags.casino_days3). 도박 엔딩은 이 답을 보고 이을 것
  C.push({
    id: 'gm_inspector', look: 'inspector_theo', name: '감찰관 마크', race: '인간', job: '왕국 감찰관', faction: 'kingdom', portrait: '🕵️', kind: 'talk',
    spawn: { when: { all: [{ flag: 'casino_days3' }, { since: { flag: 'casino_days3', days: 1 } }] }, pinned: true },
    ask: { tag: '탐문', note: '밤마다 도박이 성행한다는 제보' },
    greet: '요즘 밤마다 이 근처 어디선가 도박이 성행한다는 보고가 올라오고 있소. 상점가에서 장사하는 자네라면 밤 사정에 밝을 텐데, 아는 거 있소?',
    choices: [
      { id: 'report', label: '뒷골목 지하에 「검은 주사위」라는 도박장이 있소', reply: '「검은 주사위」라… 협조에 감사하오. 감찰청이 알아서 하겠소.', effects: { flags: ['casino_reported'], vars: { rel_kingdom: 2, integrity: 1 } } },
      { id: 'deny', label: '밤엔 문 닫고 자서 모르오', reply: '…그렇소? 알겠소. 혹시 기억나는 게 있으면 감찰청으로 오시오.', effects: { flags: ['casino_denied'], vars: { integrity: -1 } } },
      { id: 'evade', label: '소문은 들었소만 직접 본 건 없소', reply: '소문이라. 그것도 단서이긴 하오. 또 들르겠소.', effects: { flags: ['casino_evaded'] } },
    ],
  });
  // 「모른다」고 한 뒤 — 도박장에 가면 발각(한 번은 봐줌) → 마담의 부름 → 다시 가면 마담이 큰 판에 끼라고 부름 → 동전이 튕기는 동안 감찰관이 들이닥침 → 엔딩 gambling_end 「도박의 끝」
  //  (발각·큰 판 장면은 js/ui/CasinoView.js · 조건은 js/systems/Casino.js raidDue / bigCallDue)
  C.push(
    {
      id: 'gm_madam_guard', ...MADAM,
      spawn: { when: { all: [{ flag: 'casino_caught1' }, { noFlag: 'casino_guarded' }, { noFlag: 'casino_quit' }, { since: { flag: 'casino_caught1', days: 1 } }] }, pinned: true },
      ask: { tag: '다시 문 열기', note: '경비를 세우고 종을 달았다' },
      greet: '어젯밤엔 놀랐죠? 걱정 마요. 이번에는 경비를 세웠고 골목 끝에 종도 달았어요. 감찰관 발소리가 나면 종이 울려요. 걸릴 일 없어요. 오늘 밤에 다시 와요.',
      choices: [
        { id: 'go', label: '알겠소, 가 보겠소', reply: '그래야죠. 판은 당신을 기다려요.', effects: { flags: ['casino_guarded'] } },
        { id: 'quit', label: '…이제 발을 끊겠소', reply: '아쉽네요. 그래도 문은 열어 둘게요. …원하시면요.', effects: { flags: ['casino_quit'], vars: { integrity: 1 } } },
      ],
    },
  );
})();

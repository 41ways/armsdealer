// 흐름별 대화 손님 · 부딪치는 사건(충돌) · 결말 길의 대가 — docs/DESIGN_CONVERGENCE.md 3.A · 4 · 5 · 6
//
// id 는 모두 tk_ 로 시작한다. arcs_*.js 뒤에 읽힌다 (index.html).
// 다른 파일이 켜 주는 플래그(약속):
//   interregnum    왕이 죽고 대관식(30일째 밤)을 기다리는 공위 기간
//   regency_war    공위 기간인데 밖에서 적이 밀려온다 (전시 섭정)
//   leaning_aldric 공위 기간 succession ≥ 5 / leaning_serena ≤ −5
//   closed_*       충돌에 진 줄기 — 이 파일이 켜고, endings.js 가 noFlag 로 막는다
//
// ① 공위 기간의 회유 (4절) — 앞선 쪽은 세 번까지 점점 좋은 조건으로, 뒤진 쪽은 웃돈 · 비밀 납품 · 외상으로.
//    전시 섭정이면 두 후계자가 "서부 토벌 물자를 누가 대느냐"로 다툰다.
// ② 충돌 (5절) — 실제 18일부터 열린 줄기 둘이 같은 물자를 두고 부딪친다. 한 번에 하나, 끝나고 이틀 쉬고.
//    n일 호소 A → n+1일 호소 B → (예라고 하면 이튿날 사러 온다) → n+3일 새벽 결과.
//    결과는 "누구에게 예라고 했나"가 아니라 "누구 손님에게 실제로 팔았나"(구매 손님의 onSell 플래그)로 난다.
//    둘 다 팔았으면 양다리 기록 + 형세대로, 아무에게도 안 팔았으면 형세대로. 진 쪽 closed_* 와 그 까닭을 적은 기사.
//    셋이 열려 있으면 이긴 쪽이 며칠 뒤 남은 하나와 다시 부딪친다 (열린 조건이 그대로 사슬을 만든다).
// ③ 결말 길의 대가 (6절) — 왕실 조달관(원가 납품 → 헌납 → 외상), 고블린 쪽 경비대 감시, 검은 깃발의 저주품 값.
(() => {
  const C = WS.data.customers, E = WS.data.events;
  const FEE = WS.data.letters.crowFee;
  const cost = id => WS.data.items[id].cost;
  const after = (flag, days) => ({ all: [{ flag }, { since: { flag, days } }] });

  // ───────── 열린 줄기 (그 이야기의 첫 핵심 장면을 지났고 아직 닫히지 않은 것) ─────────
  const courtOpen = { all: [
    { any: [{ flag: 'succession_crisis' }, { flag: 'court_struggle' }, { flag: 'interregnum' }] },
    { noFlag: 'crowned' }, { noFlag: 'court_decided' }, { noFlag: 'civil_war' }, { noFlag: 'vampire_regent' }, { noFlag: 'closed_court' },
  ] };
  const goblinOpen = { all: [
    { any: [{ sold: { faction: 'goblin', tag: 'weapon', min: 10 } }, { customerSeen: 'goblin_envoy' }, { flag: 'goblin_unified' }, { flag: 'goblin_won_skirmish' }, { flag: 'war' }] },
    { noFlag: 'goblin_victory' }, { noFlag: 'kingdom_victory' }, { noFlag: 'closed_goblin' },
  ] };
  const dragonOpen = { all: [
    { any: [{ customerSeen: 'wd_ash_watch' }, { customerSeen: 'wd_ash_scouts' }, { var: 'dragon_stir', gte: 8 }] },
    { noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { noFlag: 'dragon_razed' }, { noFlag: 'dragon_pact' }, { noFlag: 'closed_dragon' },
  ] };
  const demonlordOpen = { all: [
    { any: [{ flag: 'armed_demonlord' }, { flag: 'demonlord_pact' }, { flag: 'supplied_demonlord' }, { sold: { faction: 'demonlord', tag: 'weapon', min: 6 } }] },
    { noFlag: 'demonlord_victory' }, { noFlag: 'demonlord_repelled' }, { noFlag: 'closed_demonlord' },
  ] };
  const kingdomOpen = { all: [
    { any: [{ flag: 'royal_certified' }, { flag: 'crown_supplier' }, { flag: 'tk_levy1_ok' }, { sold: { faction: 'kingdom', tag: 'weapon', min: 15 } }] },
    { noFlag: 'kingdom_victory' }, { noFlag: 'closed_kingdom' },
  ] };

  // ═════════════════════════ ① 공위 기간의 회유 ═════════════════════════
  const woo = (lean, extra) => ({ all: [{ flag: 'interregnum' }, { flag: lean }, { noFlag: 'regency_war' }, { noFlag: 'crowned' }, { noFlag: 'closed_court' }, { realDay: { lte: 29 } }].concat(extra || []) });
  const sidedSerena = { any: [{ flag: 'backed_serena' }, { flag: 'armed_princess_secret' }] };
  const sidedAldric = { any: [{ flag: 'armed_aldric' }, { flag: 'armed_prince_secret' }] };

  C.push(
    // ───── 알드릭이 앞설 때: 왕자파의 회유 세 번 ─────
    {
      id: 'tk_ald_woo1', look: 'noble_lord', name: '오스문드 경', race: '인간', job: '알드릭 왕자파 친위대 부관', faction: 'noble', portrait: '🛡️', kind: 'talk',
      spawn: { when: woo('leaning_aldric', [after('interregnum', 1)]), chance: 0.7 },
      summary: '알드릭 왕자파 — 대세는 기울었다, 지금 오면 친위대 납품 자리를 약속',
      greet: '섭정 회의 귀족 태반이 왕자님 쪽에 섰소. 대세는 기울었소. 지금 오면 대관식 뒤 친위대 납품 자리를 약속하오. 우선 내일 창 여섯 자루를 받으러 오겠소.',
      greetWhen: [{ when: sidedSerena, text: '공주 쪽에 물건을 댔다는 말은 들었소. 상관없소. 대세는 기울었고, 왕자님은 늦게 온 사람도 받아 주시오. 내일 창 여섯 자루, 받으러 와도 되겠소?' }],
      choices: [
        { id: 'join', label: '왕자님 쪽 일을 맡겠소', reply: '현명하오. 내일 해 뜨면 친위대 수레를 보내겠소.',
          effects: { vars: { succession: 1, rel_noble: 1 }, flags: ['tk_ald_joined'], spawn: [{ customer: 'tk_ald_order', inDays: 1 }] } },
        { id: 'wait', label: '대관식까진 누구 편도 아니오', reply: '…그 말, 오래 못 갈 거요. 다시 오겠소.', effects: { flags: ['tk_ald_wait1'] } },
      ],
    },
    {
      id: 'tk_ald_woo2', look: 'noble_lord', name: '오스문드 경', race: '인간', job: '알드릭 왕자파 친위대 부관', faction: 'noble', portrait: '🛡️', kind: 'talk',
      spawn: { when: woo('leaning_aldric', [after('tk_ald_wait1', 2), { noFlag: 'tk_ald_joined' }]), chance: 0.8 },
      summary: '알드릭 왕자파 — 두 번째 회유, 서부 원정 보급을 통째로 맡기겠다',
      greet: '왕자님께 이 가게 얘기를 올렸소. 대관식 뒤 서부 원정 보급을 통째로 맡기시겠다 하오. 이번 창 값엔 웃돈도 얹겠소. 내일 여섯 자루, 어떻소?',
      choices: [
        { id: 'join', label: '그 조건이면 맡겠소', reply: '좋소. 왕자님은 약속을 지키시는 분이오.',
          effects: { vars: { succession: 1, rel_noble: 1 }, flags: ['tk_ald_joined'], spawn: [{ customer: 'tk_ald_order2', inDays: 1 }] } },
        { id: 'wait', label: '아직은 답하지 않겠소', reply: '한 번만 더 오겠소. 그다음은 없소.', effects: { flags: ['tk_ald_wait2'] } },
      ],
    },
    {
      id: 'tk_ald_woo3', look: 'prince', name: '두건 쓴 청년', race: '인간', job: '말투가 지나치게 곱다', faction: 'noble', portrait: '🧥', kind: 'talk',
      spawn: { when: woo('leaning_aldric', [after('tk_ald_wait2', 2), { noFlag: 'tk_ald_joined' }]), chance: 0.9 },
      summary: '알드릭 왕자 본인 — 마지막 회유, 간판에 왕실 문장을 걸게 해 주겠다',
      greet: '(두건을 반쯤 걷는다) 부관을 두 번 보냈는데 두 번 다 빈손이더군. 그래서 내가 왔네. 대관식 날 이 가게 간판에 왕실 문장을 걸게 해 주지. 내일 창 여섯 자루만 대 주게.',
      greetWhen: [{ when: sidedAldric, text: '(두건을 반쯤 걷는다) 두건 쓰던 때 활을 대 준 가게지. 그런데 부관을 두 번 돌려보냈더군. 그래서 내가 왔네. 대관식 날 간판에 왕실 문장을 걸게 해 주지. 내일 창 여섯 자루만.' }],
      choices: [
        { id: 'join', label: '전하 뜻대로 하겠습니다', reply: '빚은 잊지 않네.',
          effects: { vars: { succession: 2, rel_noble: 2, rel_kingdom: 1 }, flags: ['tk_ald_joined', 'tk_ald_banner'], spawn: [{ customer: 'tk_ald_order2', inDays: 1 }] } },
        { id: 'snub', label: '가게는 어느 깃발도 걸지 않소', mutter: '…왕관을 쓸 사람을 세 번째 돌려보낸다. 그 문은 다시 열리지 않겠지.',
          reply: '…그렇군. 기억해 두지.', effects: { vars: { rel_noble: -2, succession: -1 }, flags: ['tk_ald_snubbed'] } },
      ],
    },
    {
      id: 'tk_ald_order', look: 'soldier2', name: '친위대 수레꾼', race: '인간', job: '알드릭 왕자파 친위대', faction: 'noble', portrait: '🪖',
      spawn: { queuedOnly: true },
      greet: '오스문드 경이 보냈소. {item} {qty}자루, {offer}G.',
      request: { item: 'iron_spear', qty: 6, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '대관식 날 이 창들이 제일 앞줄에 설 거요.', partial: '모자라도 받아 가겠소.', refused: '어제는 맡겠다더니… 그대로 전하겠소.' },
      onSell: { vars: { succession: 2, merc_strength: 1 }, flags: ['armed_aldric', 'tk_ald_supplied'] },
      onRefuse: { vars: { rel_noble: -2 } },
    },
    {
      id: 'tk_ald_order2', look: 'soldier2', name: '친위대 수레꾼', race: '인간', job: '알드릭 왕자파 친위대', faction: 'noble', portrait: '🪖',
      spawn: { queuedOnly: true },
      greet: '왕자님 몫이오. {item} {qty}자루, 웃돈 얹어 {offer}G.',
      request: { item: 'iron_spear', qty: 6, offer: { mult: 1.3 }, partialOk: true },
      lines: { sold: '왕자님이 이 가게 이름을 직접 적으셨소.', partial: '이것도 받아 가겠소.', refused: '왕자님께 뭐라 말씀드리라는 거요.' },
      onSell: { vars: { succession: 2, merc_strength: 1 }, flags: ['armed_aldric', 'tk_ald_supplied'] },
      onRefuse: { vars: { rel_noble: -3, succession: -1 } },
    },

    // ───── 세레나가 앞설 때: 공주파의 회유 세 번 ─────
    {
      id: 'tk_ser_woo1', look: 'noble_lady', name: '로살린 부인', race: '인간', job: '세레나 공주파 귀부인', faction: 'noble', portrait: '👒', kind: 'talk',
      spawn: { when: woo('leaning_serena', [after('interregnum', 1)]), chance: 0.7 },
      summary: '세레나 공주파 — 대세는 기울었다, 지금 오면 구호소 납품을 맡긴다',
      greet: '길드도 대성당도 공주님 쪽이에요. 대관식은 이제 날짜 문제죠. 지금 오시면 구호소 물약 납품을 맡길게요. 내일 여섯 병부터요.',
      greetWhen: [{ when: sidedAldric, text: '왕자 쪽에 칼을 댔다는 얘기는 들었어요. 괜찮아요, 공주님은 문을 닫지 않으세요. 대세는 기울었고요. 내일 구호소 물약 여섯 병, 받으러 가도 될까요?' }],
      choices: [
        { id: 'join', label: '공주님 쪽 일을 맡겠소', reply: '고마워요. 내일 수녀들이 수레를 끌고 올 거예요.',
          effects: { vars: { succession: -1, rel_noble: 1 }, flags: ['tk_ser_joined'], spawn: [{ customer: 'tk_ser_order', inDays: 1 }] } },
        { id: 'wait', label: '대관식까진 누구 편도 아니오', reply: '그래요. 그래도 또 올게요.', effects: { flags: ['tk_ser_wait1'] } },
      ],
    },
    {
      id: 'tk_ser_woo2', look: 'noble_lady', name: '로살린 부인', race: '인간', job: '세레나 공주파 귀부인', faction: 'noble', portrait: '👒', kind: 'talk',
      spawn: { when: woo('leaning_serena', [after('tk_ser_wait1', 2), { noFlag: 'tk_ser_joined' }]), chance: 0.8 },
      summary: '세레나 공주파 — 두 번째 회유, 상업세 면제를 약속',
      greet: '공주님이 새 치세 첫해 이 가게 상업세를 면해 주시겠대요. 그리고 이번 물약엔 값을 더 얹을게요. 내일 여섯 병, 어떠세요?',
      choices: [
        { id: 'join', label: '그 조건이면 맡겠소', reply: '공주님이 기뻐하실 거예요.',
          effects: { vars: { succession: -1, rel_noble: 1 }, flags: ['tk_ser_joined'], spawn: [{ customer: 'tk_ser_order2', inDays: 1 }] } },
        { id: 'wait', label: '아직은 답하지 않겠소', reply: '…한 번만 더 올게요.', effects: { flags: ['tk_ser_wait2'] } },
      ],
    },
    {
      id: 'tk_ser_woo3', look: 'princess', name: '베일 쓴 수녀', race: '인간', job: '말씨가 궁중 말씨다', faction: 'noble', portrait: '🕯️', kind: 'talk',
      spawn: { when: woo('leaning_serena', [after('tk_ser_wait2', 2), { noFlag: 'tk_ser_joined' }]), chance: 0.9 },
      summary: '세레나 공주 본인 — 마지막 회유, 왕실 구호소 전속 상인 자리',
      greet: '(베일을 조금 걷는다) 두 번이나 사람을 보냈는데 답이 없어서 제가 왔어요. 대관식 뒤 왕실 구호소 전속 상인 자리를 드릴게요. 내일 물약 여섯 병이면 돼요.',
      greetWhen: [{ when: sidedSerena, text: '(베일을 조금 걷는다) 수녀복 입고 물약을 사던 때를 기억해요. 그런데 사람을 두 번 돌려보내셨죠. 그래서 제가 왔어요. 왕실 구호소 전속 상인 자리예요. 내일 물약 여섯 병.' }],
      choices: [
        { id: 'join', label: '공주님 뜻대로 하겠습니다', reply: '고마워요. 잊지 않을게요.',
          effects: { vars: { succession: -2, rel_noble: 2, rel_church: 1 }, flags: ['tk_ser_joined', 'tk_ser_chartered'], spawn: [{ customer: 'tk_ser_order2', inDays: 1 }] } },
        { id: 'snub', label: '가게는 어느 편에도 서지 않소', mutter: '…왕관을 쓸 사람을 세 번째 돌려보낸다. 그 문은 다시 열리지 않겠지.',
          reply: '…알겠어요. 더는 오지 않을게요.', effects: { vars: { rel_noble: -2, succession: 1 }, flags: ['tk_ser_snubbed'] } },
      ],
    },
    {
      id: 'tk_ser_order', look: 'priest', name: '구호소 수녀', race: '인간', job: '세레나 공주파 구호소', faction: 'church', portrait: '🕯️',
      spawn: { queuedOnly: true },
      greet: '로살린 부인이 보냈어요. {item} {qty}병, {offer}G.',
      request: { item: 'potion', qty: 6, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '구호소 줄이 오늘은 짧아지겠어요.', partial: '이만큼이라도 고마워요.', refused: '…어제는 맡겠다고 하셨는데요.' },
      onSell: { vars: { succession: -2, church_authority: 1 }, flags: ['backed_serena', 'tk_ser_supplied'] },
      onRefuse: { vars: { rel_noble: -2 } },
    },
    {
      id: 'tk_ser_order2', look: 'priest', name: '구호소 수녀', race: '인간', job: '세레나 공주파 구호소', faction: 'church', portrait: '🕯️',
      spawn: { queuedOnly: true },
      greet: '공주님 몫이에요. {item} {qty}병, 값을 얹어 {offer}G.',
      request: { item: 'potion', qty: 6, offer: { mult: 1.3 }, partialOk: true },
      lines: { sold: '공주님이 장부에 이 가게 이름을 직접 적으셨어요.', partial: '이것도 받아 갈게요.', refused: '공주님께 뭐라고 전하죠…' },
      onSell: { vars: { succession: -2, church_authority: 1 }, flags: ['backed_serena', 'tk_ser_supplied'] },
      onRefuse: { vars: { rel_noble: -3, succession: 1 } },
    },

    // ───── 뒤진 쪽의 절박한 제안: 알드릭이 앞서면 세레나 쪽이, 세레나가 앞서면 알드릭 쪽이 ─────
    {
      id: 'tk_ser_plea1', look: 'noble_lady', name: '하녀장 이젤', race: '인간', job: '세레나 공주 저택 하녀장', faction: 'noble', portrait: '🧺', kind: 'talk',
      spawn: { when: woo('leaning_aldric', [after('interregnum', 2)]), chance: 0.6 },
      summary: '세레나 공주파 — 왕자 쪽으로 기울자 웃돈 얹은 비밀 납품을 청한다',
      greet: '섭정 회의가 왕자님 쪽으로 기울면서 길드 상인들이 우리 주문을 안 받아요. 웃돈을 얹을게요. 물약 여덟 병, 내일 저녁에 뒷문으로. 장부엔 수도원 이름으로 적어 주세요.',
      choices: [
        { id: 'yes', label: '뒷문으로 대겠소', reply: '…고마워요. 이 일은 공주님만 아실 거예요.', effects: { flags: ['tk_ser_plea_yes'], spawn: [{ customer: 'tk_ser_secret', inDays: 1 }] } },
        { id: 'no', label: '지는 쪽 일은 안 맡소', reply: '지는 쪽이라… 대관식 날 다시 말해 보죠.', effects: { vars: { rel_noble: -1 } } },
      ],
    },
    {
      id: 'tk_ser_secret', look: 'priest', name: '두건 쓴 수녀', race: '인간', job: '수도원 심부름', faction: 'church', trueFaction: 'noble', portrait: '🕯️', late: true,
      spawn: { queuedOnly: true },
      greet: '수도원 심부름이에요. {item} {qty}병, {offer}G. 이름은 적지 말아 주세요.',
      request: { item: 'potion', qty: 8, offer: { mult: 1.5 }, partialOk: true },
      lines: { sold: '(물약을 망토 안에 감춘다) 공주님이 기억하실 거예요.', partial: '이것도요. 고마워요.', refused: '…그래요. 다들 왕자님 쪽이죠.' },
      onSell: { vars: { succession: -2 }, flags: ['armed_princess_secret', 'tk_ser_secret_sold'] },
    },
    {
      id: 'tk_ser_plea2', look: 'noble_lady', name: '하녀장 이젤', race: '인간', job: '세레나 공주 저택 하녀장', faction: 'noble', portrait: '🧺', kind: 'talk',
      spawn: { when: woo('leaning_aldric', [{ customerSeen: 'tk_ser_plea1' }, { since: { flag: 'tk_ser_plea_yes', days: 2 } }]), chance: 0.5 },
      summary: '세레나 공주파 — 금고가 비었다, 방패를 외상으로 (대관식 뒤 두 배)',
      greet: '공주님 금고가 바닥났어요. 구호소 앞을 지킬 방패 여섯 개, 값은 대관식 뒤에 두 배로 치를게요. 공주님이 왕관을 못 쓰시면… 그땐 저도 드릴 말이 없어요.',
      choices: [
        { id: 'yes', label: '외상으로 대겠소', reply: '공주님께 꼭 전할게요. 내일 수레를 보낼게요.', effects: { spawn: [{ customer: 'tk_ser_credit', inDays: 1 }] } },
        { id: 'no', label: '외상은 안 되오', reply: '…그렇죠. 누구라도 그럴 거예요.', effects: {} },
      ],
    },
    {
      id: 'tk_ser_credit', look: 'priest', name: '구호소 수녀', race: '인간', job: '세레나 공주파 구호소', faction: 'church', trueFaction: 'noble', portrait: '🕯️',
      spawn: { queuedOnly: true },
      greet: '하녀장님이 보냈어요. {item} {qty}개, 값은 대관식 뒤 {offer}G.',
      request: { item: 'shield', qty: 6, offer: { mult: 2 }, partialOk: true },
      payment: { credit: { now: 0.1, inDays: [5, 8], defaultWhen: { any: [{ flag: 'leaning_aldric' }, { flag: 'king_aldric' }] }, defaultText: '{name}의 외상값 {amount}G는 끝내 들어오지 않았다. 공주 저택 금고는 대관식 전에 봉인됐다.' } },
      lines: { sold: '공주님이 왕관을 쓰시면 두 배로 돌아올 거예요.', partial: '이만큼이라도요.', refused: '…어제는 된다고 하셨잖아요.' },
      onSell: { vars: { succession: -2 }, flags: ['backed_serena', 'tk_ser_credit_sold'] },
    },
    {
      id: 'tk_ald_plea1', look: 'mercenary', name: '용병 대리인 크로그', race: '인간', job: '알드릭 왕자파 뒷일꾼', faction: 'merc', trueFaction: 'noble', portrait: '🗝️', kind: 'talk',
      spawn: { when: woo('leaning_serena', [after('interregnum', 2)]), chance: 0.6 },
      summary: '알드릭 왕자파 — 공주 쪽으로 기울자 밤중 뒷문 납품에 웃돈',
      greet: '길드가 공주 편에 서면서 왕자님 쪽엔 칼 파는 가게가 씨가 말랐소. 웃돈을 얹겠소. 내일 해 진 뒤 칼 여섯 자루, 뒷문으로. 장부엔 사냥 모임이라 적으시오.',
      choices: [
        { id: 'yes', label: '뒷문으로 대겠소', reply: '말이 통하는군. 내일 밤 두 번 두드리겠소.', effects: { flags: ['tk_ald_plea_yes'], spawn: [{ customer: 'tk_ald_secret', inDays: 1 }] } },
        { id: 'no', label: '지는 쪽 일은 안 맡소', reply: '지는 쪽? 대관식은 아직 안 끝났소.', effects: { vars: { rel_merc: -1 } } },
      ],
    },
    {
      id: 'tk_ald_secret', look: 'hooded', name: '두건 쓴 사냥꾼', race: '인간', job: '사냥 모임 (손에 굳은살이 없다)', faction: 'traveler', trueFaction: 'noble', portrait: '🧥', late: true,
      spawn: { queuedOnly: true },
      greet: '(문을 두 번 두드렸다) 사냥 모임이오. {item} {qty}자루, {offer}G.',
      request: { item: 'iron_sword', qty: 6, offer: { mult: 1.5 }, partialOk: true },
      lines: { sold: '(칼을 자루에 싸서 멘다) 사냥감은 곧 정해지오.', partial: '이것도 챙기겠소.', refused: '…다들 공주 편이로군.' },
      onSell: { vars: { succession: 2, merc_strength: 1 }, flags: ['armed_prince_secret', 'tk_ald_secret_sold'] },
    },
    {
      id: 'tk_ald_plea2', look: 'mercenary', name: '용병 대리인 크로그', race: '인간', job: '알드릭 왕자파 뒷일꾼', faction: 'merc', trueFaction: 'noble', portrait: '🗝️', kind: 'talk',
      spawn: { when: woo('leaning_serena', [{ customerSeen: 'tk_ald_plea1' }, { since: { flag: 'tk_ald_plea_yes', days: 2 } }]), chance: 0.5 },
      summary: '알드릭 왕자파 — 금고가 비었다, 창을 외상으로 (서부 원정 전리품으로 갚음)',
      greet: '솔직히 말하겠소. 왕자님 금고가 비었소. 창 여덟 자루, 값은 대관식 뒤 서부 원정 전리품으로 두 배 가까이 치르겠소. 왕자님이 못 이기면… 그땐 나도 할 말이 없소.',
      choices: [
        { id: 'yes', label: '외상으로 대겠소', reply: '배짱이 있군. 내일 수레를 보내겠소.', effects: { spawn: [{ customer: 'tk_ald_credit', inDays: 1 }] } },
        { id: 'no', label: '외상은 안 되오', reply: '그렇겠지. 이긴 쪽에만 줄을 서는 게 장사지.', effects: {} },
      ],
    },
    {
      id: 'tk_ald_credit', look: 'soldier2', name: '친위대 수레꾼', race: '인간', job: '알드릭 왕자파 친위대', faction: 'noble', portrait: '🪖',
      spawn: { queuedOnly: true },
      greet: '크로그가 보냈소. {item} {qty}자루, 값은 원정 뒤 {offer}G.',
      request: { item: 'iron_spear', qty: 8, offer: { mult: 1.8 }, partialOk: true },
      payment: { credit: { now: 0.1, inDays: [5, 8], defaultWhen: { any: [{ flag: 'leaning_serena' }, { flag: 'queen_serena' }] }, defaultText: '{name}의 외상값 {amount}G는 끝내 들어오지 않았다. 왕자파 친위대는 대관식 전에 흩어졌다.' } },
      lines: { sold: '원정에서 돌아오면 두 배로 갚겠소.', partial: '이것도 받아 가겠소.', refused: '어제는 된다더니.' },
      onSell: { vars: { succession: 2 }, flags: ['armed_aldric', 'tk_ald_credit_sold'] },
    },

    // ───── 전시 섭정: 두 후계자가 서부 토벌 물자를 두고 다툰다 ─────
    {
      id: 'tk_war_ald', look: 'noble_lord', name: '오스문드 경', race: '인간', job: '알드릭 왕자파 친위대 부관', faction: 'noble', portrait: '🛡️', kind: 'talk',
      spawn: { queuedOnly: true },
      summary: '전시 섭정 — 서부 토벌 물자를 누가 대느냐, 왕자 이름으로 내일 창 8',
      greet: '적이 문 앞이라 섭정 회의가 왕좌 다툼을 접었소. 대신 서부 토벌 물자를 누가 대느냐로 대관식이 갈릴 거요. 왕자님 이름으로 내일 창 여덟 자루를 전선에 보내 주시오.',
      choices: [
        { id: 'yes', label: '왕자님 이름으로 보내겠소', reply: '좋소. 전선에 왕자님 깃발이 먼저 서겠군.', effects: { flags: ['tk_war_ald_yes'], spawn: [{ customer: 'tk_war_ald_cart', inDays: 1 }] } },
        { id: 'no', label: '전쟁 물자에 이름은 안 붙이오', reply: '이름 없는 창은 없소. 누구 이름이든 붙게 돼 있소.', effects: {} },
      ],
    },
    {
      id: 'tk_war_ser', look: 'noble_lady', name: '로살린 부인', race: '인간', job: '세레나 공주파 귀부인', faction: 'noble', portrait: '👒', kind: 'talk',
      spawn: { queuedOnly: true },
      summary: '전시 섭정 — 부상병 물약을 누가 대느냐, 공주 이름으로 내일 물약 8',
      greet: '전쟁은 창이 아니라 살아 돌아온 병사가 이겨요. 공주님은 부상병 구호소를 맡으셨어요. 공주님 이름으로 내일 물약 여덟 병, 전선에 보내 주세요.',
      greetWhen: [{ when: { flag: 'tk_war_ald_yes' }, text: '어제 왕자 쪽 부관이 다녀갔다죠. 창을 대기로 하셨다고요. …그래도 여쭤요. 공주님 이름으로 내일 물약 여덟 병, 전선 구호소에 보내 주시겠어요?' }],
      choices: [
        { id: 'yes', label: '공주님 이름으로 보내겠소', reply: '고마워요. 구호소 천막에 공주님 문장이 걸릴 거예요.', effects: { flags: ['tk_war_ser_yes'], spawn: [{ customer: 'tk_war_ser_cart', inDays: 1 }] } },
        { id: 'no', label: '전쟁 물자에 이름은 안 붙이오', reply: '…그래요. 부상병들은 이름을 안 묻겠죠.', effects: {} },
      ],
    },
    {
      id: 'tk_war_ald_cart', look: 'soldier2', name: '서부 토벌대 보급병', race: '인간', job: '왕자 깃발 아래 토벌대', faction: 'kingdom', portrait: '🪖',
      spawn: { queuedOnly: true },
      greet: '왕자님 이름으로 왔소. {item} {qty}자루, {offer}G.',
      request: { item: 'iron_spear', qty: 8, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '토벌대 맨 앞줄에 서겠소.', partial: '모자란 건 전선에서 주워 쓰겠소.', refused: '전선에 뭐라 전하라는 거요.' },
      onSell: { vars: { succession: 2, kingdom_power: 1, border_tension: -1 }, flags: ['armed_aldric', 'tk_war_ald_sup'] },
    },
    {
      id: 'tk_war_ser_cart', look: 'priest', name: '전선 구호소 수녀', race: '인간', job: '공주 깃발 아래 구호소', faction: 'church', portrait: '🕯️',
      spawn: { queuedOnly: true },
      greet: '공주님 이름으로 왔어요. {item} {qty}병, {offer}G.',
      request: { item: 'potion', qty: 8, offer: { mult: 1 }, partialOk: true },
      lines: { sold: '오늘 밤 천막에서 우는 소리가 줄겠어요.', partial: '이만큼이라도요.', refused: '…부상병들한테 뭐라고 하죠.' },
      onSell: { vars: { succession: -2, kingdom_morale: 2, church_authority: 1 }, flags: ['backed_serena', 'tk_war_ser_sup'] },
    },
  );

  // ═════════════════════════ ② 충돌 ═════════════════════════
  // 실제 18~25일에 시작해야 28일 새벽까지 결과가 난다. 한 번에 하나, 끝난 뒤 이틀은 쉰다.
  const clashGate = [{ realDay: { gte: 18, lte: 25 } }, { noFlag: 'tk_clash_active' }, { since: { flag: 'tk_clash_done', days: 2 } }];
  const startClash = (key, priority, open, a, b) => E.push({
    id: `tk_${key}_start`, once: true, priority,
    when: { all: clashGate.concat(open) },
    effects: { flags: ['tk_clash_active', `tk_${key}`], spawn: [{ customer: a, inDays: 0 }, { customer: b, inDays: 1 }], schedule: [{ event: `tk_${key}_resolve`, inDays: 3 }] },
  });
  // 결과: B 가 경비대에 잡힘 → A 승 / A 만 채움 → A 승 / B 만 채움 → B 승 / 나머지(아무도 · 둘 다) → 형세(byWorld)대로
  const resolveClash = (key, r) => E.push({
    id: `tk_${key}_resolve`, trigger: 'scheduled', priority: 86,
    effects: {
      flags: ['tk_clash_done'], unflags: ['tk_clash_active'],
      if: { when: { all: [{ flag: `tk_${key}_a_sup` }, { flag: `tk_${key}_b_sup` }] },
        then: { flags: [`tk_${key}_double`, 'tk_double_dealt'], vars: { reputation: -1, integrity: -1 }, news: [r.double] } },
    },
    outcomes: [
      ...(r.caught ? [{ when: { flag: `tk_${key}_b_caught` }, effects: r.aWin, news: { ...r.caught, big: true } }] : []),
      { when: { all: [{ flag: `tk_${key}_a_sup` }, { noFlag: `tk_${key}_b_sup` }] }, effects: r.aWin, news: { ...r.aNews, big: true } },
      { when: { all: [{ flag: `tk_${key}_b_sup` }, { noFlag: `tk_${key}_a_sup` }] }, effects: r.bWin, news: { ...r.bNews, big: true } },
      { when: r.byWorld, effects: r.aWin, news: { ...r.aWorld, big: true } },
      { effects: r.bWin, news: { ...r.bWorld, big: true } },
    ],
  });
  // 적대 세력의 부탁엔 "돌려보내고 까마귀로 알린다" — 삯은 까마귀 편지와 같고, 이튿날 새벽 경비대가 움직인다.
  // 호소 손님은 suspicious 라 까마귀 편지(밀고)로 나중에 알려도 똑같이 잡힌다 (onReport · caughtFlag).
  const reportChoice = (key, mutter, reply) => ({
    id: 'report', label: '(돌려보내고, 까마귀로 경비대에 알린다)', mutter, when: { gold: { gte: FEE } }, reply,
    effects: { gold: -FEE, flags: [`tk_${key}_reported`], schedule: [{ event: `tk_${key}_caught`, inDays: 1 }] },
  });
  const caughtEvent = (key, rel, news) => E.push({
    id: `tk_${key}_caught`, trigger: 'scheduled', priority: 87,
    effects: { gold: 60, flags: [`tk_${key}_b_caught`], vars: { reputation: 2, rel_kingdom: 1, [rel]: -3, collusion: 2, report_hits: 1 } },
    news: { ...news, big: true },
  });
  const reportHooks = key => ({ suspicious: true, caughtFlag: `tk_${key}_b_caught`, onReport: { flags: [`tk_${key}_b_caught`] } });
  const buyer = (id, base, req, supFlag, onSell, lines, extra) => ({
    id, ...base, spawn: { queuedOnly: true }, request: { ...req, partialOk: true }, lines,
    onSell: { ...onSell, flags: [supFlag].concat((onSell && onSell.flags) || []) }, ...(extra || {}),
  });

  // ───── 충돌 1: 고블린 ↔ 궁정 (gc) — 서부 방어 물자 ─────
  startClash('gc', 69, [goblinOpen, courtOpen], 'tk_gc_guard', 'tk_gc_envoy');
  const guardBase = { look: 'knight_official', name: '서부 경비대장 하르트', race: '인간', job: '서부 국경 초소 경비대장', faction: 'kingdom', portrait: '🛡️' };
  const zrakBase = { look: 'goblin_envoy', name: '부족 전령 즈락', race: '고블린', job: '서부 숲 부족 전령', faction: 'goblin', portrait: '👹' };
  C.push(
    {
      id: 'tk_gc_guard', ...guardBase, kind: 'talk', spawn: { queuedOnly: true },
      summary: '서부 경비대 — 계승 다툼에 지원이 끊김, 내일 창 8자루',
      greet: '계승 문제로 궁이 골치요. 섭정 회의는 서로 삿대질만 하고 서부 초소엔 창이 모자라오. 지금 고블린이 치면 끝장이오. 내일 창 여덟 자루, 받으러 와도 되겠소?',
      greetWhen: [{ when: { flag: 'leon_contract' }, text: '레온 단장이 이 가게를 믿으라 했소. 계승 문제로 궁이 서부를 잊었소. 초소엔 창이 모자라고, 지금 고블린이 치면 끝장이오. 내일 창 여덟 자루, 대 주겠소?' }],
      choices: [
        { id: 'yes', label: '내일 준비해 두겠소', reply: '고맙소.',
          effects: { flags: ['tk_gc_a_yes'], spawn: [{ customer: 'tk_gc_guard_cart', inDays: 1 }] },
          follow: { say: '하나만 더 묻겠소. 요즘 숲 놈들이 이 가게에 드나든다던데, 사실이오?',
            choices: [
              { id: 'tell', label: '드나드는 건 사실이오', reply: '솔직해서 좋소. 초소에 알려 두겠소.', effects: { vars: { rel_kingdom: 1, rel_goblin: -1, border_tension: 1 }, flags: ['tk_gc_told_guard'] } },
              { id: 'deny', label: '칼 사러 오는 손님이야 많소', reply: '…그렇다면 그런 거겠지.', effects: { flags: ['tk_gc_guard_doubts'] } },
            ] } },
        { id: 'no', label: '창은 못 대겠소', mutter: '…서부 초소가 빈손이면 숲이 먼저 움직이겠지.', reply: '그렇소. 그럼 초소는 몽둥이로 버티겠소.', effects: { vars: { rel_kingdom: -1 } } },
      ],
    },
    buyer('tk_gc_guard_cart', guardBase, { item: 'iron_spear', qty: 8, offer: { mult: 1 } }, 'tk_gc_a_sup',
      { vars: { kingdom_power: 1, border_tension: -1 } },
      { sold: '초소에 오늘 밤 안에 걸겠소.', partial: '모자라도 이게 어디요.', refused: '어제는 준비한다더니…' }),
    {
      id: 'tk_gc_envoy', ...zrakBase, kind: 'talk', spawn: { queuedOnly: true }, ...reportHooks('gc'),
      reportDetail: '서부 숲 부족 전령이었소. 공세 날짜까지 캐냈소.',
      summary: '고블린 부족 — 왕국이 흔들릴 때 서부를 친다, 내일 칼 10자루',
      greet: '킥! 인간 왕좌가 비었다구. 궁은 서로 싸우느라 서부를 못 본다구. 지금 우릴 도우면 서부는 우리 거다! 내일 칼 열 자루, 도와 달라구!',
      greetWhen: [
        { when: { flag: 'tk_gc_told_guard' }, text: '킥… 경비대장한테 우리 얘기 했다며? 숲은 다 안다구. 그래도 한 번 더 묻는다구. 궁이 싸우는 지금이 기회다. 내일 칼 열 자루, 도와줄 거냐구!' },
        { when: { flag: 'tk_gc_a_yes' }, text: '킥, 어제 경비대장한테 창 준다 했다며? 숲은 다 안다구. 그래도 묻는다구. 인간 왕좌가 빈 지금이 기회다. 내일 칼 열 자루!' },
      ],
      choices: [
        { id: 'yes', label: '내일 준비해 두겠소', reply: '킥킥! 내일 해 지기 전에 온다구!', effects: { flags: ['tk_gc_b_yes'], spawn: [{ customer: 'tk_gc_envoy_cart', inDays: 1 }] } },
        { id: 'no', label: '숲에 칼은 못 대오', mutter: '…숲을 빈손으로 돌려보내면, 부족의 봄은 여기서 끝이다.', reply: '흥! 인간은 인간 편이라구. 즈락은 기억한다구.', effects: { vars: { rel_goblin: -2 } } },
        reportChoice('gc', '…경비대에 알리면 공세 계획이 샌다. 숲 쪽 길은 거기서 끝이겠지.', '킥? 좋다구, 좋다구… (뒷걸음질로 나간다)'),
      ],
    },
    buyer('tk_gc_envoy_cart', zrakBase, { item: 'iron_sword', qty: 10, offer: { mult: 1.15 } }, 'tk_gc_b_sup',
      { vars: { goblin_unity: 2, border_tension: 1 } },
      { sold: '킥킥! 초소 지붕에 이 칼 꽂아 두고 올 거라구!', partial: '모자라! 그래도 간다구!', refused: '어제는 준다며! 숲은 다 기억한다구!' }),
  );
  caughtEvent('gc', 'rel_goblin', { cat: '왕국', text: '경비대, 서부 숲 부족 전령 붙잡아… "공세 날짜 캐냈다"' });
  resolveClash('gc', {
    aWin: { flags: ['closed_goblin', 'tk_gc_court_won'], vars: { goblin_power: -3, goblin_unity: -5, border_tension: -4, kingdom_power: 2 } },
    bWin: { flags: ['closed_court', 'tk_gc_goblin_won'], vars: { goblin_power: 4, goblin_unity: 4, border_tension: 5, kingdom_power: -3, kingdom_morale: -3, war_progress: 3 } },
    caught: { cat: '전쟁', text: '붙잡힌 전령 입에서 공세 날짜 새어… 서부 초소 매복에 고블린 선봉 무너져, 부족들 숲 깊이 물러나' },
    aNews: { cat: '전쟁', text: '서부 초소에 새 창 여덟 자루… 고블린 선봉 발 돌려 숲 깊이. 궁은 한숨 돌리고 다시 왕좌 다툼으로' },
    bNews: { cat: '속보', text: '고블린 대공세, 서부 초소 셋 함락… 섭정 회의 "전쟁이 끝날 때까지 왕좌 다툼은 없다", 대관식 미뤄질 듯' },
    byWorld: { cmp: ['kingdom_power', '>=', 'goblin_power'] },
    aWorld: { cat: '전쟁', text: '고블린 선봉, 서부 초소 앞에서 멈칫… 왕국군 수에 밀려 숲으로. 부족 연합은 흩어졌다' },
    bWorld: { cat: '속보', text: '서부 초소 무너져… 궁이 싸우는 사이 고블린이 먼저 움직였다. 섭정 회의 계승 논의 접고 전쟁부터' },
    double: { cat: '소문', text: '서부 초소의 창과 고블린의 칼, 같은 가게 각인이라는 소문' },
  });

  // ───── 충돌 2: 용 ↔ 고블린 (dg) — 재의 산 정찰 vs 서방 원정 ─────
  startClash('dg', 68, [dragonOpen, goblinOpen], 'tk_dg_scout', 'tk_dg_marshal');
  const godwinBase = { look: 'soldier2', name: '정찰대장 고드윈', race: '인간', job: '왕국 기사단 정찰대장', faction: 'kingdom', portrait: '🔭' };
  const bartolBase = { look: 'knight', name: '원정대장 바르톨', race: '인간', job: '서부 원정대 대장', faction: 'kingdom', portrait: '⚔️' };
  C.push(
    {
      id: 'tk_dg_scout', ...godwinBase, kind: 'talk', spawn: { queuedOnly: true },
      summary: '기사단 정찰대 — 재의 산이 연기를 뿜는다, 지금 정찰대를 보내야 한다. 내일 활 6',
      greet: '재의 산이 사흘째 연기를 뿜소. 지금 정찰대를 보내 입구를 봉하지 않으면 늦소. 그런데 원정대장은 서방 고블린부터 치자며 활을 다 가져가려 하오. 내일 활 여섯 자루, 우리 쪽에 대 주겠소?',
      greetWhen: [{ when: { flag: 'wd_ash_scouts_armed' }, text: '지난번 활로 동굴 입구까진 갔소. 금 더미가 숨을 쉬더군. 지금 입구를 봉해야 하오. 그런데 원정대장이 서방부터 치자며 활을 다 가져가려 하오. 내일 활 여섯 자루, 우리 쪽에 대 주겠소?' }],
      choices: [
        { id: 'yes', label: '정찰대 몫으로 준비하겠소', reply: '고맙소. 산이 깨기 전에 가겠소.', effects: { flags: ['tk_dg_a_yes'], spawn: [{ customer: 'tk_dg_scout_cart', inDays: 1 }] } },
        { id: 'no', label: '활은 못 대겠소', mutter: '…정찰대가 못 가면 산은 제 발로 깨어나겠지.', reply: '그럼 산이 먼저 답하겠지.', effects: {} },
      ],
    },
    buyer('tk_dg_scout_cart', godwinBase, { item: 'bow', qty: 6, offer: { mult: 1.05 } }, 'tk_dg_a_sup', { vars: { dragon_stir: -1 } },
      { sold: '돌아오면 무엇을 봤는지 신문에서 보시오.', partial: '모자라도 가겠소.', refused: '맨손으로 산에 오르라는 거요?' }),
    {
      id: 'tk_dg_marshal', ...bartolBase, kind: 'talk', spawn: { queuedOnly: true },
      summary: '서부 원정대 — 산이 아니라 서방 고블린부터, 내일 창 8',
      greet: '산은 백 년을 잤소. 깨지도 않은 용 때문에 서방을 비울 순 없지. 고블린부터 처리해야 하오. 정찰대에 활을 대면 원정은 한 달 늦어지오. 내일 창 여덟 자루, 원정대에 대 주시오.',
      greetWhen: [{ when: { flag: 'tk_dg_a_yes' }, text: '정찰대에 활을 대기로 했다고? 산은 백 년을 잤소. 서방 고블린부터 처리해야 하오. 그래도 창 여덟 자루는 내일 받아 가겠소. 대 주겠소?' }],
      choices: [
        { id: 'yes', label: '원정대 몫으로 준비하겠소', reply: '좋소. 이번엔 숲 끝까지 가겠소.', effects: { flags: ['tk_dg_b_yes'], spawn: [{ customer: 'tk_dg_marshal_cart', inDays: 1 }] } },
        { id: 'no', label: '창은 못 대겠소', mutter: '…원정이 늦어지면 부족들은 한 계절을 더 버티겠지.', reply: '용 타령만 하다가 숲을 잃을 거요.', effects: {} },
      ],
    },
    buyer('tk_dg_marshal_cart', bartolBase, { item: 'iron_spear', qty: 8, offer: { mult: 1.05 } }, 'tk_dg_b_sup', { vars: { kingdom_power: 1 } },
      { sold: '원정대 깃발 아래 서겠소.', partial: '모자란 건 징발하겠소.', refused: '어제는 준비한다더니.' }),
  );
  resolveClash('dg', {
    aWin: { flags: ['closed_dragon', 'tk_dg_scouts_won'], set: { dragon_stir: 0 }, vars: { goblin_power: 2, border_tension: 2, rel_kingdom: 1 } },
    bWin: { flags: ['closed_goblin', 'tk_dg_march_won'], vars: { goblin_power: -5, goblin_unity: -6, border_tension: -4, dragon_stir: 4 } },
    aNews: { cat: '속보', text: '정찰대가 재의 산 입구를 봉했다 — 용은 다시 잠들었다. 원정은 미뤄지고 서부 숲 부족들 숨 돌려' },
    bNews: { cat: '속보', text: '서부 원정으로 고블린은 흩어졌다. 그사이 산이 비었다 — 재의 산 연기 더 짙어져' },
    byWorld: { var: 'dragon_stir', gte: 9 },
    aWorld: { cat: '속보', text: '재의 산 연기에 기사단 겁먹어 정찰대 먼저 보내… 입구 봉쇄, 용은 다시 잠들어. 원정은 무기한 연기' },
    bWorld: { cat: '속보', text: '"산은 백 년을 잤다" 원정대 서방으로… 고블린 부족 흩어져. 재의 산엔 파수꾼 하나 안 남았다' },
    double: { cat: '소문', text: '정찰대 활과 원정대 창, 같은 가게에서 나갔다는 말… 기사단 안에서 "누구 편이냐"' },
  });

  // ───── 충돌 3: 용 ↔ 궁정 (dc) — 성벽 보강 vs 대관식 비용 ─────
  startClash('dc', 67, [dragonOpen, courtOpen], 'tk_dc_wall', 'tk_dc_clerk');
  const brandtBase = { look: 'wall_captain', name: '성벽 수비대장 브란트', race: '인간', job: '성벽 수비 용병대장', faction: 'merc', portrait: '🏰' };
  const felixBase = { look: 'noble_courier', name: '서기 에드문트', race: '인간', job: '섭정 회의 서기', faction: 'noble', portrait: '📜' };
  C.push(
    {
      id: 'tk_dc_wall', ...brandtBase, kind: 'talk', spawn: { queuedOnly: true },
      summary: '성벽 수비대 — 대관식 비단값에 성벽 예산이 깎였다, 내일 방패 6',
      greet: '섭정 회의가 대관식 비단값으로 성벽 예산을 깎았소. 재의 산이 저리 끓는데 말이오. 내일 방패 여섯 개, 성벽 쪽에 대 주겠소?',
      choices: [
        { id: 'yes', label: '성벽 몫으로 준비하겠소', reply: '고맙소. 성벽은 비단보다 오래가오.', effects: { flags: ['tk_dc_a_yes'], spawn: [{ customer: 'tk_dc_wall_cart', inDays: 1 }] } },
        { id: 'no', label: '방패는 못 대겠소', mutter: '…성벽이 빈손이면 섭정 회의는 용 이야기를 또 웃어넘기겠지.', reply: '용이 오면 이 가게도 타오.', effects: {} },
      ],
    },
    buyer('tk_dc_wall_cart', brandtBase, { item: 'shield', qty: 6, offer: { mult: 1 } }, 'tk_dc_a_sup', { vars: { dragon_defense: 60 } },
      { sold: '성벽 망루마다 하나씩 걸겠소.', partial: '이것도 받겠소.', refused: '용이 오면 기억하시오.' }),
    {
      id: 'tk_dc_clerk', ...felixBase, kind: 'talk', spawn: { queuedOnly: true },
      summary: '섭정 회의 — 대관식 의장대 무장, 내일 칼 6 (웃돈)',
      greet: '대관식은 나라의 얼굴이오. 의장대가 녹슨 칼을 들 순 없지. 성벽? 용 이야기는 백 년째 나오는 소리요. 내일 칼 여섯 자루, 값은 넉넉히 치르겠소.',
      greetWhen: [{ when: { flag: 'tk_dc_a_yes' }, text: '수비대장이 다녀갔다지. 방패 타령이겠지. 대관식은 나라의 얼굴이오, 의장대가 녹슨 칼을 들 순 없소. 내일 칼 여섯 자루, 값은 넉넉히 치르겠소.' }],
      choices: [
        { id: 'yes', label: '의장대 몫으로 준비하겠소', reply: '좋소. 대관식 날 이 가게 칼이 햇빛에 번쩍일 거요.', effects: { flags: ['tk_dc_b_yes'], spawn: [{ customer: 'tk_dc_clerk_cart', inDays: 1 }] } },
        { id: 'no', label: '의장용 칼은 안 대겠소', mutter: '…대관식이 초라하면 섭정 회의는 왕좌 다툼을 성벽 뒤로 미루겠지.', reply: '장사꾼이 나랏일을 가르치는군.', effects: { vars: { rel_noble: -1 } } },
      ],
    },
    buyer('tk_dc_clerk_cart', felixBase, { item: 'iron_sword', qty: 6, offer: { mult: 1.25 } }, 'tk_dc_b_sup', { vars: { rel_noble: 1 } },
      { sold: '의장대장이 흡족해하겠소.', partial: '모자라지만 앞줄은 채우겠소.', refused: '섭정 회의에 그대로 올리겠소.' }),
  );
  resolveClash('dc', {
    aWin: { flags: ['closed_court', 'tk_dc_wall_won'], vars: { dragon_defense: 100, kingdom_morale: 2, rel_noble: -1 } },
    bWin: { flags: ['closed_dragon', 'tk_dc_crown_won'], set: { dragon_stir: 0 }, vars: { rel_noble: 1, economy: -2 } },
    aNews: { cat: '왕국', text: '성벽 망루마다 새 방패… 섭정 회의 "대관식은 산이 잠잠해진 뒤에", 왕좌 다툼은 식었다' },
    bNews: { cat: '왕국', text: '섭정 회의, 재의 산 옛 광산 갱도 무너뜨려 막아… "금 냄새 나는 구멍부터 막았다" 연기 멎어. 대관식 준비는 예정대로' },
    byWorld: { var: 'dragon_stir', gte: 9 },
    aWorld: { cat: '왕국', text: '재의 산 연기에 섭정 회의 대관식 예산 성벽으로 돌려… 대관식도 두 후계자 다툼도 산이 잠잠해진 뒤로' },
    bWorld: { cat: '왕국', text: '섭정 회의 "용은 없다"… 대신 옛 광산 갱도를 무너뜨려 막아, 연기 멎어. 대관식 준비 예정대로' },
    double: { cat: '소문', text: '성벽 방패와 의장대 칼, 같은 가게 것… 섭정 회의 서기 "누가 누구 편이냐"' },
  });

  // ───── 충돌 4: 마왕군 ↔ 왕국 (dk) / 마왕군 ↔ 고블린 (dgo) — 공동 전선 vs 검은 깃발 동맹 ─────
  startClash('dk', 66, [demonlordOpen, kingdomOpen], 'tk_dk_fort', 'tk_dk_black');
  startClash('dgo', 65, [demonlordOpen, goblinOpen, { not: kingdomOpen }], 'tk_dgo_goblin', 'tk_dgo_black');
  const evanBase = { look: 'soldier', name: '북부 요새 전령 에반', race: '인간', job: '북부 요새 전령', faction: 'kingdom', portrait: '🏯' };
  const morgasBase = { look: 'demon_herald', name: '검은 사절 모르가스', race: '마족', job: '마왕의 사절', faction: 'demonlord', portrait: '💀' };
  const krakBase = { look: 'goblin_raider', name: '족장 전령 크락', race: '고블린', job: '서부 숲 족장 전령', faction: 'goblin', portrait: '👺' };
  // 검은 깃발의 값: 금화는 절반도 안 되고 나머지는 마석 · 심연 진주 (결말 「검은 깃발 아래」 길의 대가)
  const blackPay = { give: { mana_crystal: 2, abyss_pearl: 1 }, vars: { reputation: -2, demonlord_power: 3, invasion_risk: 3, rel_demonlord: 2 }, flags: ['tk_black_paid_in_curse'] };
  C.push(
    {
      id: 'tk_dk_fort', ...evanBase, kind: 'talk', spawn: { queuedOnly: true },
      summary: '북부 요새 — 검은 깃발이 온다, 공동 전선에 방패. 내일 방패 6',
      greet: '북부 요새에서 왔소. 검은 깃발이 황무지를 넘었소. 요새 셋이 한 줄로 버텨야 하는데 방패가 모자라오. 내일 방패 여섯 개, 대 줄 수 있소?',
      greetWhen: [{ when: { flag: 'armed_demonlord' }, text: '북부 요새에서 왔소. 저쪽 병사들이 이 거리 칼을 찼다는 보고가 있소. 따지러 온 건 아니오. 요새 셋이 버티려면 방패가 모자라오. 내일 방패 여섯 개, 대 줄 수 있소?' }],
      choices: [
        { id: 'yes', label: '요새 몫으로 준비하겠소', reply: '고맙소. 요새 문에 이 가게 방패를 걸겠소.', effects: { flags: ['tk_dk_a_yes'], spawn: [{ customer: 'tk_dk_fort_cart', inDays: 1 }] } },
        { id: 'no', label: '방패는 못 대겠소', mutter: '…요새가 무너지면 왕실 납품 장부도 같이 불타겠지.', reply: '그럼 요새는 맨몸으로 서겠소.', effects: { vars: { rel_kingdom: -1 } } },
      ],
    },
    buyer('tk_dk_fort_cart', evanBase, { item: 'shield', qty: 6, offer: { mult: 1 } }, 'tk_dk_a_sup', { vars: { kingdom_power: 1, invasion_risk: -2 } },
      { sold: '요새 셋이 한 줄로 서겠소.', partial: '이것만이라도.', refused: '어제는 된다더니.' }),
    {
      id: 'tk_dk_black', ...morgasBase, kind: 'talk', spawn: { queuedOnly: true }, ...reportHooks('dk'),
      reportDetail: '검은 깃발 사절이었소. 북부 요새 문을 열 날짜를 들고 있었소.',
      summary: '마왕군 — 검은 깃발 동맹을 청한다, 내일 칼 10 (값은 마석으로)',
      greet: '폐하께서 이 도시 몫의 동맹을 청하신다. 북부 요새가 무너지면 이 거리는 폐하의 것이다. 내일 칼 열 자루. 값은 금화 조금과 마석으로 치르겠다.',
      greetWhen: [{ when: { flag: 'tk_dk_a_yes' }, text: '요새 전령에게 방패를 약속했다지. 폐하는 그것도 아신다. 그래도 묻는다. 요새가 무너지면 이 거리는 폐하의 것이다. 내일 칼 열 자루, 값은 마석으로.' }],
      choices: [
        { id: 'yes', label: '내일 준비해 두겠소', reply: '현명하다. 폐하의 목록에 네 이름이 오른다.', effects: { flags: ['tk_dk_b_yes'], spawn: [{ customer: 'tk_dk_black_cart', inDays: 1 }] } },
        { id: 'no', label: '검은 깃발엔 칼을 안 대오', mutter: '…사절을 돌려보내면 검은 깃발 쪽 문은 닫힌다.', reply: '폐하는 기억하신다.', effects: { vars: { rel_demonlord: -2 } } },
        reportChoice('dk', '…경비대에 알리면 요새 문을 열 계획이 샌다. 검은 깃발 쪽 문은 영영 닫히겠지.', '…후회하게 될 거다. (그림자처럼 나간다)'),
      ],
    },
    buyer('tk_dk_black_cart', morgasBase, { item: 'iron_sword', qty: 10, offer: { mult: 0.45 } }, 'tk_dk_b_sup', blackPay,
      { sold: '금화는 그만큼이다. 나머지는 이 돌들로 받아라. 폐하의 돈은 늘 이렇다.', partial: '모자라군. 값도 그만큼이다.', refused: '폐하는 숫자를 기억하신다.' }),
    {
      id: 'tk_dgo_goblin', ...krakBase, kind: 'talk', spawn: { queuedOnly: true },
      summary: '고블린 부족 — 검은 깃발이 숲을 내놓으라 한다, 내일 활 8',
      greet: '킥… 검은 깃발 놈들이 숲을 통째로 내놓으래. 오크까지 데리고 와서! 우린 안 준다구! 내일 활 여덟 자루, 숲 지키게 도와 달라구!',
      choices: [
        { id: 'yes', label: '내일 준비해 두겠소', reply: '킥킥! 숲이 이 가게를 기억할 거라구!', effects: { flags: ['tk_dgo_a_yes'], spawn: [{ customer: 'tk_dgo_goblin_cart', inDays: 1 }] } },
        { id: 'no', label: '활은 못 대겠소', mutter: '…숲이 무너지면 부족은 검은 깃발 밑으로 흩어지겠지.', reply: '…인간은 숲이 타도 모른 척한다구.', effects: { vars: { rel_goblin: -1 } } },
      ],
    },
    buyer('tk_dgo_goblin_cart', krakBase, { item: 'bow', qty: 8, offer: { mult: 1.1 } }, 'tk_dgo_a_sup', { vars: { goblin_unity: 2 } },
      { sold: '킥! 검은 놈들 등짝에 꽂아 줄 거라구!', partial: '모자라! 그래도 쏜다구!', refused: '어제는 준다며!' }),
    {
      id: 'tk_dgo_black', ...morgasBase, kind: 'talk', spawn: { queuedOnly: true }, ...reportHooks('dgo'),
      reportDetail: '검은 깃발 사절이었소. 서부 숲을 칠 날짜를 들고 있었소.',
      summary: '마왕군 — 서부 숲을 치는 데 칼을 대라, 내일 칼 10 (값은 마석으로)',
      greet: '숲의 작은 것들이 폐하의 길을 막는다. 숲을 태우고 나면 서부 교역로는 이 거리 차지다. 내일 칼 열 자루. 값은 금화 조금과 마석으로.',
      greetWhen: [{ when: { flag: 'tk_dgo_a_yes' }, text: '어제 숲 것들에게 활을 약속했다지. 폐하는 그것도 아신다. 숲을 태우고 나면 서부 교역로는 이 거리 차지다. 내일 칼 열 자루, 값은 마석으로.' }],
      choices: [
        { id: 'yes', label: '내일 준비해 두겠소', reply: '현명하다. 숲이 타면 네 몫도 있다.', effects: { flags: ['tk_dgo_b_yes'], spawn: [{ customer: 'tk_dgo_black_cart', inDays: 1 }] } },
        { id: 'no', label: '검은 깃발엔 칼을 안 대오', mutter: '…사절을 돌려보내면 검은 깃발 쪽 문은 닫힌다.', reply: '폐하는 기억하신다.', effects: { vars: { rel_demonlord: -2 } } },
        reportChoice('dgo', '…경비대에 알리면 숲을 칠 날짜가 샌다. 검은 깃발 쪽 문은 영영 닫히겠지.', '…후회하게 될 거다. (그림자처럼 나간다)'),
      ],
    },
    buyer('tk_dgo_black_cart', morgasBase, { item: 'iron_sword', qty: 10, offer: { mult: 0.45 } }, 'tk_dgo_b_sup', blackPay,
      { sold: '금화는 그만큼이다. 나머지는 이 돌들로 받아라.', partial: '모자라군. 값도 그만큼이다.', refused: '폐하는 숫자를 기억하신다.' }),
  );
  caughtEvent('dk', 'rel_demonlord', { cat: '왕국', text: '경비대, 검은 깃발 사절 붙잡아… "북부 요새 문 열 날짜 캐냈다"' });
  caughtEvent('dgo', 'rel_demonlord', { cat: '왕국', text: '경비대, 검은 깃발 사절 붙잡아… "서부 숲 칠 날짜 캐냈다"' });
  resolveClash('dk', {
    aWin: { flags: ['closed_demonlord', 'tk_dk_front_won'], vars: { demonlord_power: -6, invasion_risk: -8, kingdom_morale: 3 } },
    bWin: { flags: ['closed_kingdom', 'tk_dk_black_won'], vars: { kingdom_power: -4, kingdom_morale: -4, demonlord_power: 5, invasion_risk: 6, rel_kingdom: -2 } },
    caught: { cat: '전쟁', text: '붙잡힌 사절 입에서 요새 문 열 날짜 새어… 북부 요새 매복에 검은 선봉 무너져, 황무지로 물러나' },
    aNews: { cat: '전쟁', text: '북부 요새 세 곳 방패벽… 검은 깃발 황무지로 물러나. "마왕군은 올해 남쪽을 못 본다"' },
    bNews: { cat: '속보', text: '북부 요새 하나 안에서 문 열려… 검은 깃발 병사들 도성 칼 차고. 왕실 보급청 "민간 납품 계약 전면 중단"' },
    byWorld: { cmp: ['kingdom_power', '>=', 'demonlord_power'] },
    aWorld: { cat: '전쟁', text: '북부 요새 셋, 저희 힘으로 버텨… 검은 깃발 황무지로 물러나' },
    bWorld: { cat: '속보', text: '북부 요새 하나 무너져… 왕국군 뒤로 밀려. 왕실 보급청 "민간 납품 계약 전면 중단"' },
    double: { cat: '소문', text: '북부 요새 방패와 검은 깃발 칼, 같은 가게에서… 감찰청 "두 쪽 다 조사"' },
  });
  resolveClash('dgo', {
    aWin: { flags: ['closed_demonlord', 'tk_dgo_forest_won'], vars: { demonlord_power: -5, invasion_risk: -5, goblin_unity: 3, rel_goblin: 1 } },
    bWin: { flags: ['closed_goblin', 'tk_dgo_black_won'], vars: { goblin_power: -6, goblin_unity: -6, demonlord_power: 4, invasion_risk: 3 } },
    caught: { cat: '전쟁', text: '붙잡힌 사절 입에서 날짜 새어… 경비대 귀띔 받은 부족들 매복, 검은 선봉 숲에서 쫓겨나' },
    aNews: { cat: '전쟁', text: '숲에 발 들인 검은 선봉, 부족 화살에 쫓겨… 마왕군 북부로 물러나' },
    bNews: { cat: '속보', text: '검은 깃발, 서부 숲 부족 마을 불태워… 흩어진 고블린 일부는 검은 깃발 아래로' },
    byWorld: { cmp: ['goblin_power', '>=', 'demonlord_power'] },
    aWorld: { cat: '전쟁', text: '서부 숲 부족들, 검은 선봉 막아… 오크들 숲 앞에서 발 돌려' },
    bWorld: { cat: '속보', text: '검은 깃발, 서부 숲 삼켜… 부족 연합 흩어지고 일부는 검은 깃발 아래로' },
    double: { cat: '소문', text: '숲의 화살과 검은 깃발의 칼, 같은 가게 각인… 부족들 "인간 상인은 믿을 게 못 된다"' },
  });

  // 전시 섭정 — 두 후계자가 이틀에 걸쳐 온다
  E.push({
    id: 'tk_regency_bid', once: true, priority: 64,
    when: { all: [{ flag: 'regency_war' }, { flag: 'interregnum' }, { noFlag: 'crowned' }, { noFlag: 'closed_court' }, { realDay: { lte: 28 } }] },
    effects: { spawn: [{ customer: 'tk_war_ald', inDays: 0 }, { customer: 'tk_war_ser', inDays: 1 }] },
    news: { cat: '왕국', text: '섭정 회의 "전시 섭정"… 두 후계자, 서부 토벌 물자 누가 대느냐로 겨룬다' },
  });

  // ═════════════════════════ ③ 결말 길의 대가 ═════════════════════════
  // ───── 왕실 공식 무기상: 조달관 세 번 — 원가 납품 → 헌납 → 외상 ─────
  // 결말 kingdom_armory 는 royal_certified + rel_kingdom 12 (또는 crown_holds + crown_supplier). 세 번 다 받아 주면 관계 +9 · 인증.
  // 한 번 거절하면 다음 박자는 오지 않는다.
  const odricBase = { look: 'noble_quartermaster', name: '감사관 오드릭', race: '인간', job: '왕실 조달청 감사관', faction: 'kingdom', portrait: '📜',
    affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '왕실 조달청이오. 인장을 보시오.' } };
  const spearCost = cost('iron_spear') * 6;
  const levyOk = { flags: ['tk_levy1_ok', 'crown_supplier'], vars: { rel_kingdom: 3, kingdom_power: 1, rel_guild: -1 } };
  const levyLive = [{ noFlag: 'closed_kingdom' }, { noFlag: 'kingdom_victory' }, { realDay: { lte: 28 } }];
  C.push(
    {
      id: 'tk_levy1', ...odricBase, kind: 'talk',
      spawn: { when: { all: [{ var: 'rel_kingdom', gte: 6 }, { realDay: { gte: 10 } }, ...levyLive,
        { any: [{ flag: 'royal_certified' }, { flag: 'crown_supplier' }, { customerSeen: 'royal_quartermaster' }, { customerSeen: 'crown_quartermaster' }, { sold: { faction: 'kingdom', tag: 'weapon', min: 8 } }] }] }, chance: 0.6 },
      summary: `왕실 조달관 — 도매가를 알고 왔다, 창 6자루를 원가(${spearCost}G)에`,
      greet: `왕실 조달청 감사관 오드릭이오. 도매가를 알고 왔소 — 창 한 자루 ${cost('iron_spear')}G. 서부 초소에 걸 창 여섯 자루, 원가 ${spearCost}G에 넘기시오. 국가에 충성하시오.`,
      choices: [
        { id: 'now', label: `원가에 넘기겠소 (창 6 → ${spearCost}G)`, when: { has: { item: 'iron_spear', min: 6 } },
          reply: '장부에 충성스러운 가게로 적겠소. 다음엔 인증 이야기를 하지.',
          effects: { take: { iron_spear: 6 }, gold: spearCost, ...levyOk } },
        { id: 'tomorrow', label: '내일 원가로 대겠소', reply: '좋소. 내일 수레를 보내겠소.', effects: { flags: ['tk_levy1_promised'], spawn: [{ customer: 'tk_levy_cart', inDays: 1 }] } },
        { id: 'refuse', label: '원가로는 못 넘기오', mutter: '…원가를 거절하면 왕실 장부에서 이 가게 이름이 빠진다. 공식 무기상 자리도.',
          reply: '장사꾼은 역시 장사꾼이군. 왕실은 기억력이 좋소.', effects: { vars: { rel_kingdom: -3 }, flags: ['tk_levy_refused'] } },
      ],
    },
    {
      id: 'tk_levy_cart', ...odricBase, spawn: { queuedOnly: true },
      greet: '어제 약속한 창이오. {item} {qty}자루, 원가 {offer}G.',
      request: { item: 'iron_spear', qty: 6, offer: spearCost, partialOk: true },
      lines: { sold: '국가가 기억하겠소.', partial: '모자란 건 다음에 채우시오.', refused: '약속을 어기는 가게라… 적어 두겠소.' },
      onSell: levyOk,
      onRefuse: { vars: { rel_kingdom: -3 }, flags: ['tk_levy_refused'] },
    },
    {
      id: 'tk_levy2', ...odricBase, kind: 'talk',
      spawn: { when: { all: [after('tk_levy1_ok', 2), { noFlag: 'tk_levy_refused' }, ...levyLive] }, chance: 0.8 },
      summary: '왕실 조달관 — 서부 방위 헌납, 방패 4개를 값 없이 (대신 왕실 인증)',
      greet: '지난번 창은 서부 초소에 잘 걸렸소. 이번엔 헌납을 청하오 — 방패 네 개, 값은 없소. 대신 왕실 인증 목록 맨 위에 이 가게를 올리겠소. 인증이 붙으면 임대료 절반은 왕실이 대오.',
      choices: [
        { id: 'now', label: '방패 넷을 헌납하겠소', when: { has: { item: 'shield', min: 4 } }, reply: '국가가 이 가게를 기억하겠소. 인증서는 오늘 밤 걸어 두시오.',
          effects: { take: { shield: 4 }, flags: ['tk_levy2_ok', 'royal_certified'], vars: { rel_kingdom: 3, reputation: 2 } } },
        { id: 'tomorrow', label: '내일 헌납하겠소', reply: '좋소. 내일 수레를 보내겠소.', effects: { spawn: [{ customer: 'tk_levy_gift_cart', inDays: 1 }] } },
        { id: 'refuse', label: '값 없인 못 내주오', mutter: '…헌납을 거절하면 인증 목록 맨 위 자리는 없던 일이 된다.',
          reply: '충성에도 값을 매기는군.', effects: { vars: { rel_kingdom: -3 }, flags: ['tk_levy_refused'] } },
      ],
    },
    {
      id: 'tk_levy_gift_cart', ...odricBase, spawn: { queuedOnly: true },
      greet: '헌납 수레요. {item} {qty}개, 값은 없소. 대신 인증서를 가져왔소.',
      request: { item: 'shield', qty: 4, offer: 0, partialOk: true },
      lines: { sold: '국가가 기억하겠소. 인증서는 오늘 밤 걸어 두시오.', partial: '이만큼도 헌납으로 적겠소.', refused: '어제 한 말은 바람이었소?' },
      onSell: { flags: ['tk_levy2_ok', 'royal_certified'], vars: { rel_kingdom: 3, reputation: 2 } },
      onRefuse: { vars: { rel_kingdom: -3 }, flags: ['tk_levy_refused'] },
    },
    {
      id: 'tk_levy3', ...odricBase, kind: 'talk',
      spawn: { when: { all: [after('tk_levy2_ok', 2), { noFlag: 'tk_levy_refused' }, ...levyLive] }, chance: 0.8 },
      summary: '왕실 조달관 — 칼 8자루 외상 납품, 값은 전쟁이 끝나면',
      greet: '인증 가게니 이제 외상이 통하오. 칼 여덟 자루, 지금은 두 할만 치르고 나머지는 전쟁이 끝나면 왕실 금고에서 나가오. 언제 끝나느냐고? …국가에 충성하시오.',
      choices: [
        { id: 'yes', label: '외상으로 대겠소', reply: '좋소. 내일 수레를 보내겠소. 감찰청엔 이 가게를 건드리지 말라 일러 두지.', effects: { flags: ['tk_levy3_promised'], spawn: [{ customer: 'tk_levy_credit_cart', inDays: 1 }] } },
        { id: 'refuse', label: '외상은 안 되오', mutter: '…외상을 거절하면 공식 무기상 자리도 거기까지다.', reply: '인증은 주되 기억은 하겠소.', effects: { vars: { rel_kingdom: -2 } } },
      ],
    },
    {
      id: 'tk_levy_credit_cart', ...odricBase, spawn: { queuedOnly: true },
      greet: '외상 수레요. {item} {qty}자루, {offer}G — 두 할은 지금, 나머지는 전쟁 뒤.',
      request: { item: 'iron_sword', qty: 8, offer: { mult: 1 }, partialOk: true },
      payment: { credit: { now: 0.2, inDays: [6, 9], defaultWhen: { flag: 'closed_kingdom' }, defaultText: '{name}의 외상값 {amount}G는 끝내 들어오지 않았다. 왕실 보급청은 민간 납품 계약을 모두 거둬들였다.' } },
      lines: { sold: '왕실 장부에 적었소. 이 가게는 이제 왕실 무기상이오.', partial: '모자란 건 다음에 채우시오.', refused: '어제 한 말은 바람이었소?' },
      onSell: { flags: ['tk_levy3_ok', 'crown_supplier', 'tk_crown_protected'], vars: { rel_kingdom: 3, kingdom_power: 2 } },
      onRefuse: { vars: { rel_kingdom: -2 } },
    },

    // ───── 명예 고블린: 숲에 칼이 흘러간 곳을 경비대가 캔다 ─────
    {
      id: 'tk_gob_watch', look: 'inspector', name: '경비대 감시관 브람', race: '인간', job: '왕국 경비대 서부 감시관', faction: 'kingdom', portrait: '🔍', kind: 'talk',
      spawn: { when: { all: [{ sold: { faction: 'goblin', tag: 'weapon', min: 20 } }, goblinOpen, { realDay: { gte: 11, lte: 27 } }, { noFlag: 'tk_crown_protected' }] }, chance: 0.6 },
      summary: '경비대 — 고블린 손의 새 칼 각인이 이 가게 것, 장부를 보자',
      greet: '고블린 손에 새 칼이 스무 자루 넘게 들렸소. 각인을 보니 이 거리 물건이더군. 장부 좀 봅시다.',
      choices: [
        { id: 'show', label: '장부를 보여 준다', reply: '…숲 손님이 많구려.',
          follow: { say: '숲에 더 팔면 다음엔 벌금이오. 그만 팔겠다고 약속하겠소?',
            choices: [
              { id: 'promise', label: '그러겠소', reply: '말은 적어 두겠소.', effects: { vars: { rel_kingdom: 1, rel_goblin: -1 }, flags: ['tk_gob_promised'] } },
              { id: 'trade', label: '장사는 장사요', mutter: '…여기서 고개를 들면 경비대가 가게 앞에 선다. 그래도 숲은 이 가게 칼을 기다린다.',
                reply: '그렇다면 오늘부터 가게 앞에 사람을 세우겠소.', effects: { vars: { rel_kingdom: -3 }, flags: ['tk_gob_watched'], crowd: { n: -1, days: 3 } } },
            ] } },
        { id: 'refuse', label: '영장 없이는 못 보여 주오', mutter: '…장부를 닫으면 경비대는 가게 앞에 선다. 손님이 줄겠지.',
          reply: '영장은 곧 가져오겠소. 그때까지 가게 앞에 사람을 세우겠소.', effects: { vars: { rel_kingdom: -3, reputation: -1 }, flags: ['tk_gob_watched'], crowd: { n: -1, days: 3 } } },
      ],
    },

    // ───── 검은 깃발 아래: 값은 금화가 아니라 마석과 저주받은 반지 ─────
    {
      id: 'tk_black_paymaster', look: 'demon_soldier', name: '징수관 우르막', race: '마족', job: '검은 군단 징수관', faction: 'demonlord', portrait: '💀',
      spawn: { when: { all: [{ any: [{ flag: 'armed_demonlord' }, { flag: 'demonlord_pact' }] }, { var: 'rel_demonlord', gte: 5 }, demonlordOpen,
        { realDay: { gte: 12, lte: 28 } }, { not: { has: { item: 'cursed_ring' } } }, { noFlag: 'ring_returned' }] }, chance: 0.6 },
      greet: '폐하의 군단이 칼을 더 원한다. {item} {qty}자루. 금화는 {offer}G, 나머지는 폐하의 보물로 치른다.',
      request: { item: 'iron_sword', qty: 6, offer: { mult: 0.35 }, partialOk: true },
      lines: { sold: '(검게 식은 반지와 마석을 내려놓는다) 폐하의 보물이다. 금화보다 귀하다.', partial: '모자라군. 그래도 반지는 두고 간다.', refused: '폐하의 돈을 거절하는 자는 드물다. 기억하겠다.' },
      onSell: { give: { cursed_ring: 1, mana_crystal: 1 }, vars: { reputation: -2, demonlord_power: 2, rel_demonlord: 2 }, flags: ['tk_black_paid_in_curse'], schedule: [{ event: 'ring_awakens', inDays: [2, 3] }] },
      onRefuse: { vars: { rel_demonlord: -3 } },
    },
  );

  // ───────── 배경 기사 (하루 1건까지) ─────────
  WS.data.ambientNews.push(
    { id: 'tk_amb_interregnum', cat: '왕국', text: '섭정 회의 "대관식은 서른째 날"… 두 후계자 저택 앞엔 밤새 마차', when: { all: [{ flag: 'interregnum' }, { noFlag: 'crowned' }] }, weight: 3, cooldown: 4 },
    { id: 'tk_amb_lean_aldric', cat: '왕국', text: '섭정 회의 귀족들 하나둘 왕자 저택으로… "대세는 기울었다"', when: { all: [{ flag: 'interregnum' }, { flag: 'leaning_aldric' }, { noFlag: 'crowned' }] }, weight: 3, cooldown: 4 },
    { id: 'tk_amb_lean_serena', cat: '왕국', text: '길드 상인들·대성당, 공주 구호소에 줄 서… "대관식은 날짜 문제"', when: { all: [{ flag: 'interregnum' }, { flag: 'leaning_serena' }, { noFlag: 'crowned' }] }, weight: 3, cooldown: 4 },
    { id: 'tk_amb_double', cat: '소문', text: '"한 입으로 두 말 하는 가게"… 상점가에 같은 각인 도는 소문', when: { flag: 'tk_double_dealt' }, weight: 2, cooldown: 6 },
    { id: 'tk_amb_gob_watch', cat: '왕국', text: '경비대, 상점가 무기점 앞에 감시병… "숲으로 가는 칼 막는다"', when: { flag: 'tk_gob_watched' }, weight: 2, cooldown: 5 },
    { id: 'tk_amb_levy', cat: '왕국', text: '왕실 조달청 "원가 납품 가게에 인증"… 상인 길드 "징발이나 다름없다"', when: { flag: 'tk_levy1_ok' }, weight: 2, cooldown: 6 },
  );
})();

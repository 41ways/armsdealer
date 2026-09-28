// 흐름별 대화 손님 · 부딪치는 사건(충돌) · 결말 길의 대가 — docs/DESIGN_CONVERGENCE.md 3.A · 4 · 5 · 6
//
// id 는 모두 tk_ 로 시작한다. arcs_*.js 뒤에 읽힌다 (index.html).
// 다른 파일이 켜 주는 플래그(약속):
//   interregnum    왕이 죽고(16~17일) 대관식(30일째 밤)을 기다리는 공위 기간 — 계승 다툼은 이때만
//   regency_war    섭정 회의(⑤, 21~22일)가 "전쟁이 먼저" — 경비대장에게 칼을 팔았다 / regency_court "왕좌가 먼저"
//   leaning_aldric 공위 기간 succession ≥ 5 / leaning_serena ≤ −5
//   closed_*       충돌에 진 줄기 — 이 파일이 켜고, endings.js 가 noFlag 로 막는다
//
// ① 공위 기간의 회유 (4절) — 앞선 쪽은 세 번까지 점점 좋은 조건으로, 뒤진 쪽은 웃돈 · 비밀 납품 · 외상으로.
//    전시 섭정이면 두 후계자가 "서부 토벌 물자를 누가 대느냐"로 다툰다.
// ② 충돌 (5절) — 진행자는 js/systems/Clash.js. 실제 12~28일, 열린 줄기 둘이 같은 물자를 두고 부딪친다. 한 번에 하나, 결과 날 새벽 다음 충돌.
//    n일 호소 A → n+1일 호소 B → (예라고 하면 이튿날 사러 온다) → n+3일 새벽 결과 (줄기가 넷 이상이거나 25일 뒤면 호소 둘이 같은 날, n+2일).
//    결과는 "누구에게 예라고 했나"가 아니라 "누구 손님에게 실제로 팔았나"(구매 손님의 onSell 플래그)로 난다.
//    둘 다 팔았으면 양다리 기록 + 형세대로, 아무에게도 안 팔았으면 형세대로. 진 쪽 closed_* 와 그 까닭을 적은 기사.
//    이긴 쪽은 며칠 뒤 남은 줄기와 다시 부딪친다 (사슬). 손으로 쓴 장면(gc · dg · dc · dk · dgo · gg)이 없는 쌍은 ④ 줄기 블록으로 짠다.
// ③ 결말 길의 대가 (6절) — 왕실 조달관(원가 납품 → 헌납 → 외상), 고블린 쪽 경비대 감시, 검은 깃발의 저주품 값.
// ④ 줄기 블록 — 어느 두 줄기든 부딪칠 수 있게 (WS.data.routes · routeLinks). 결말 고르기(Clash.pickEnding)도 이 표를 쓴다.
// ⑤ 섭정 회의(21~22일: 재상 → 서부 경비대장, 칼을 팔면 전쟁이 먼저) · 밀리는 후계자의 부름(25일: 안개 상단 / 붉은 늑대와 손잡음).
(() => {
  const C = WS.data.customers, E = WS.data.events;
  const FEE = WS.data.letters.crowFee;
  const cost = id => WS.data.items[id].cost;
  const after = (flag, days) => ({ all: [{ flag }, { since: { flag, days } }] });
  // 왕실 조달청 감사관 (③ 대가 · ④ 왕국 줄기의 호소 손님)
  const odricBase = { look: 'noble_quartermaster', name: '감사관 오드릭', race: '인간', job: '왕실 조달청 감사관', faction: 'kingdom', portrait: '📜',
    affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '왕실 조달청이오. 인장을 보시오.' } };

  // ───────── 열린 줄기 (그 이야기의 첫 핵심 장면을 지났고 아직 닫히지 않은 것) ─────────
  const courtOpen = { all: [
    { flag: 'interregnum' }, // v0.9.6: 계승 다툼은 국왕 서거 뒤에만
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
      id: 'tk_ald_woo1', look: 'noble_lord_osmund', name: '오스문드 경', race: '인간', job: '알드릭 왕자파 친위대 부관', faction: 'noble', portrait: '🛡️', kind: 'talk',
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
      id: 'tk_ald_woo2', look: 'noble_lord_osmund', name: '오스문드 경', race: '인간', job: '알드릭 왕자파 친위대 부관', faction: 'noble', portrait: '🛡️', kind: 'talk',
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
      id: 'tk_ald_order', look: 'soldier2_c', name: '친위대 수레꾼', race: '인간', job: '알드릭 왕자파 친위대', faction: 'noble', portrait: '🪖',
      spawn: { queuedOnly: true },
      greet: '오스문드 경이 보냈소. {item} {qty}자루, {offer}G.',
      request: { item: 'iron_spear', qty: 6, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '대관식 날 이 창들이 제일 앞줄에 설 거요.', partial: '모자라도 받아 가겠소.', refused: '어제는 맡겠다더니… 그대로 전하겠소.' },
      onSell: { vars: { succession: 2, merc_strength: 1 }, flags: ['armed_aldric', 'tk_ald_supplied'] },
      onRefuse: { vars: { rel_noble: -2 } },
    },
    {
      id: 'tk_ald_order2', look: 'soldier2_c', name: '친위대 수레꾼', race: '인간', job: '알드릭 왕자파 친위대', faction: 'noble', portrait: '🪖',
      spawn: { queuedOnly: true },
      greet: '왕자님 몫이오. {item} {qty}자루, 웃돈 얹어 {offer}G.',
      request: { item: 'iron_spear', qty: 6, offer: { mult: 1.3 }, partialOk: true },
      lines: { sold: '왕자님이 이 가게 이름을 직접 적으셨소.', partial: '이것도 받아 가겠소.', refused: '왕자님께 뭐라 말씀드리라는 거요.' },
      onSell: { vars: { succession: 2, merc_strength: 1 }, flags: ['armed_aldric', 'tk_ald_supplied'] },
      onRefuse: { vars: { rel_noble: -3, succession: -1 } },
    },

    // ───── 세레나가 앞설 때: 공주파의 회유 세 번 ─────
    {
      id: 'tk_ser_woo1', look: 'noble_lady_rosalind', name: '로살린 부인', race: '인간', job: '세레나 공주파 귀부인', faction: 'noble', portrait: '👒', kind: 'talk',
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
      id: 'tk_ser_woo2', look: 'noble_lady_rosalind', name: '로살린 부인', race: '인간', job: '세레나 공주파 귀부인', faction: 'noble', portrait: '👒', kind: 'talk',
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
      id: 'tk_ser_order', look: 'priest_c', name: '구호소 수녀', race: '인간', job: '세레나 공주파 구호소', faction: 'church', portrait: '🕯️',
      spawn: { queuedOnly: true },
      greet: '로살린 부인이 보냈어요. {item} {qty}병, {offer}G.',
      request: { item: 'potion', qty: 6, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '구호소 줄이 오늘은 짧아지겠어요.', partial: '이만큼이라도 고마워요.', refused: '…어제는 맡겠다고 하셨는데요.' },
      onSell: { vars: { succession: -2, church_authority: 1 }, flags: ['backed_serena', 'tk_ser_supplied'] },
      onRefuse: { vars: { rel_noble: -2 } },
    },
    {
      id: 'tk_ser_order2', look: 'priest_c', name: '구호소 수녀', race: '인간', job: '세레나 공주파 구호소', faction: 'church', portrait: '🕯️',
      spawn: { queuedOnly: true },
      greet: '공주님 몫이에요. {item} {qty}병, 값을 얹어 {offer}G.',
      request: { item: 'potion', qty: 6, offer: { mult: 1.3 }, partialOk: true },
      lines: { sold: '공주님이 장부에 이 가게 이름을 직접 적으셨어요.', partial: '이것도 받아 갈게요.', refused: '공주님께 뭐라고 전하죠…' },
      onSell: { vars: { succession: -2, church_authority: 1 }, flags: ['backed_serena', 'tk_ser_supplied'] },
      onRefuse: { vars: { rel_noble: -3, succession: 1 } },
    },

    // ───── 뒤진 쪽의 절박한 제안: 알드릭이 앞서면 세레나 쪽이, 세레나가 앞서면 알드릭 쪽이 ─────
    {
      id: 'tk_ser_plea1', look: 'noble_lady_b', name: '하녀장 이젤', race: '인간', job: '세레나 공주 저택 하녀장', faction: 'noble', portrait: '🧺', kind: 'talk',
      spawn: { when: woo('leaning_aldric', [after('interregnum', 2)]), chance: 0.6 },
      summary: '세레나 공주파 — 왕자 쪽으로 기울자 웃돈 얹은 비밀 납품을 청한다',
      greet: '섭정 회의가 왕자님 쪽으로 기울면서 길드 상인들이 우리 주문을 안 받아요. 웃돈을 얹을게요. 물약 여덟 병, 내일 저녁에 뒷문으로. 장부엔 수도원 이름으로 적어 주세요.',
      choices: [
        { id: 'yes', label: '뒷문으로 대겠소', reply: '…고마워요. 이 일은 공주님만 아실 거예요.', effects: { flags: ['tk_ser_plea_yes'], spawn: [{ customer: 'tk_ser_secret', inDays: 1 }] } },
        { id: 'no', label: '지는 쪽 일은 안 맡소', reply: '지는 쪽이라… 대관식 날 다시 말해 보죠.', effects: { vars: { rel_noble: -1 } } },
      ],
    },
    {
      id: 'tk_ser_secret', look: 'priest_b', name: '두건 쓴 수녀', race: '인간', job: '수도원 심부름', faction: 'church', trueFaction: 'noble', portrait: '🕯️', late: true,
      spawn: { queuedOnly: true },
      greet: '수도원 심부름이에요. {item} {qty}병, {offer}G. 이름은 적지 말아 주세요.',
      request: { item: 'potion', qty: 8, offer: { mult: 1.5 }, partialOk: true },
      lines: { sold: '(물약을 망토 안에 감춘다) 공주님이 기억하실 거예요.', partial: '이것도요. 고마워요.', refused: '…그래요. 다들 왕자님 쪽이죠.' },
      onSell: { vars: { succession: -2 }, flags: ['armed_princess_secret', 'tk_ser_secret_sold'] },
    },
    {
      id: 'tk_ser_plea2', look: 'noble_lady_b', name: '하녀장 이젤', race: '인간', job: '세레나 공주 저택 하녀장', faction: 'noble', portrait: '🧺', kind: 'talk',
      spawn: { when: woo('leaning_aldric', [{ customerSeen: 'tk_ser_plea1' }, { since: { flag: 'tk_ser_plea_yes', days: 2 } }]), chance: 0.5 },
      summary: '세레나 공주파 — 금고가 비었다, 구호소 물약을 외상으로 (대관식 뒤 두 배)',
      greet: '공주님 금고가 바닥났어요. 구호소 물약 열 병, 값은 대관식 뒤에 두 배로 치를게요. 공주님이 왕관을 못 쓰시면… 그땐 저도 드릴 말이 없어요.',
      choices: [
        { id: 'yes', label: '외상으로 대겠소', reply: '공주님께 꼭 전할게요. 내일 수레를 보낼게요.', effects: { spawn: [{ customer: 'tk_ser_credit', inDays: 1 }] } },
        { id: 'no', label: '외상은 안 되오', reply: '…그렇죠. 누구라도 그럴 거예요.', effects: {} },
      ],
    },
    {
      id: 'tk_ser_credit', look: 'priest_c', name: '구호소 수녀', race: '인간', job: '세레나 공주파 구호소', faction: 'church', trueFaction: 'noble', portrait: '🕯️',
      spawn: { queuedOnly: true },
      greet: '하녀장님이 보냈어요. {item} {qty}개, 값은 대관식 뒤 {offer}G.',
      request: { item: 'potion', qty: 10, offer: { mult: 2 }, partialOk: true },
      payment: { credit: { now: 0.1, inDays: [5, 8], defaultWhen: { any: [{ flag: 'leaning_aldric' }, { flag: 'king_aldric' }] }, defaultText: '{name}의 외상값 {amount}G는 끝내 들어오지 않았다. 공주 저택 금고는 대관식 전에 봉인됐다.' } },
      lines: { sold: '공주님이 왕관을 쓰시면 두 배로 돌아올 거예요.', partial: '이만큼이라도요.', refused: '…어제는 된다고 하셨잖아요.' },
      onSell: { vars: { succession: -2 }, flags: ['backed_serena', 'tk_ser_credit_sold'] },
    },
    {
      id: 'tk_ald_plea1', look: 'mercenary_krogh', name: '용병 대리인 크로그', race: '인간', job: '알드릭 왕자파 뒷일꾼', faction: 'merc', trueFaction: 'noble', portrait: '🗝️', kind: 'talk',
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
      id: 'tk_ald_plea2', look: 'mercenary_krogh', name: '용병 대리인 크로그', race: '인간', job: '알드릭 왕자파 뒷일꾼', faction: 'merc', trueFaction: 'noble', portrait: '🗝️', kind: 'talk',
      spawn: { when: woo('leaning_serena', [{ customerSeen: 'tk_ald_plea1' }, { since: { flag: 'tk_ald_plea_yes', days: 2 } }]), chance: 0.5 },
      summary: '알드릭 왕자파 — 금고가 비었다, 창을 외상으로 (서부 원정 전리품으로 갚음)',
      greet: '솔직히 말하겠소. 왕자님 금고가 비었소. 창 여덟 자루, 값은 대관식 뒤 서부 원정 전리품으로 두 배 가까이 치르겠소. 왕자님이 못 이기면… 그땐 나도 할 말이 없소.',
      choices: [
        { id: 'yes', label: '외상으로 대겠소', reply: '배짱이 있군. 내일 수레를 보내겠소.', effects: { spawn: [{ customer: 'tk_ald_credit', inDays: 1 }] } },
        { id: 'no', label: '외상은 안 되오', reply: '그렇겠지. 이긴 쪽에만 줄을 서는 게 장사지.', effects: {} },
      ],
    },
    {
      id: 'tk_ald_credit', look: 'soldier2_c', name: '친위대 수레꾼', race: '인간', job: '알드릭 왕자파 친위대', faction: 'noble', portrait: '🪖',
      spawn: { queuedOnly: true },
      greet: '크로그가 보냈소. {item} {qty}자루, 값은 원정 뒤 {offer}G.',
      request: { item: 'iron_spear', qty: 8, offer: { mult: 1.8 }, partialOk: true },
      payment: { credit: { now: 0.1, inDays: [5, 8], defaultWhen: { any: [{ flag: 'leaning_serena' }, { flag: 'queen_serena' }] }, defaultText: '{name}의 외상값 {amount}G는 끝내 들어오지 않았다. 왕자파 친위대는 대관식 전에 흩어졌다.' } },
      lines: { sold: '원정에서 돌아오면 두 배로 갚겠소.', partial: '이것도 받아 가겠소.', refused: '어제는 된다더니.' },
      onSell: { vars: { succession: 2 }, flags: ['armed_aldric', 'tk_ald_credit_sold'] },
    },

    // ───── 전시 섭정: 두 후계자가 서부 토벌 물자를 두고 다툰다 ─────
    {
      id: 'tk_war_ald', look: 'noble_lord_osmund', name: '오스문드 경', race: '인간', job: '알드릭 왕자파 친위대 부관', faction: 'noble', portrait: '🛡️', kind: 'talk',
      spawn: { queuedOnly: true },
      summary: '전시 섭정 — 서부 토벌 물자를 누가 대느냐, 왕자 이름으로 내일 창 8',
      greet: '적이 문 앞이라 섭정 회의가 왕좌 다툼을 접었소. 대신 서부 토벌 물자를 누가 대느냐로 대관식이 갈릴 거요. 왕자님 이름으로 내일 창 여덟 자루를 전선에 보내 주시오.',
      choices: [
        { id: 'yes', label: '왕자님 이름으로 보내겠소', reply: '좋소. 전선에 왕자님 깃발이 먼저 서겠군.', effects: { flags: ['tk_war_ald_yes'], spawn: [{ customer: 'tk_war_ald_cart', inDays: 1 }] } },
        { id: 'no', label: '전쟁 물자에 이름은 안 붙이오', reply: '이름 없는 창은 없소. 누구 이름이든 붙게 돼 있소.', effects: {} },
      ],
    },
    {
      id: 'tk_war_ser', look: 'noble_lady_rosalind', name: '로살린 부인', race: '인간', job: '세레나 공주파 귀부인', faction: 'noble', portrait: '👒', kind: 'talk',
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
      id: 'tk_war_ald_cart', look: 'soldier2_b', name: '서부 토벌대 보급병', race: '인간', job: '왕자 깃발 아래 토벌대', faction: 'kingdom', portrait: '🪖',
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
  // 진행은 js/systems/Clash.js (새벽마다 — 짝 고르기 · 호소 손님 부르기 · 결과). 이 파일은 그 재료:
  //   WS.data.clashPairs  손으로 쓴 장면 — 인과가 뚜렷한 쌍 (gc 고블린↔궁정 · dg 용↔고블린 · dc 용↔궁정 · dk 마왕군↔왕국 · dgo 마왕군↔고블린 · gg 골렘↔고블린)
  //                       { key, a, b(줄기 id), spawn: [호소 A, 호소 B], when(이 글이 맞는 때 — 절정 전), aWin, bWin(진 쪽 closed_* 포함), caught, aNews, bNews, byWorld(참이면 A 승), aWorld, bWorld, double }
  //                       구매 손님이 팔리면 tk_<key>_a_sup / _b_sup, 적대 쪽이 경비대에 잡히면 tk_<key>_b_caught
  //   WS.data.routes      줄기마다의 블록 — 다른 쌍은 이것으로 장면을 짠다 (아래 ④)
  WS.data.clashPairs = WS.data.clashPairs || [];
  const pair = (key, a, b, spawn, r) => WS.data.clashPairs.push({ key, a, b, spawn, ...r });
  // 궁정 쪽 형세 가산: 한 후계자라도 편든 적이 있으면 궁정은 형세 판정에서 쉽게 지지 않는다 (편든 가게를 끝까지 붙든다)
  const courtSided = { any: [{ flag: 'armed_prince_secret' }, { flag: 'armed_aldric' }, { flag: 'armed_princess_secret' }, { flag: 'backed_serena' }] };
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
  const guardBase = { look: 'knight_official_hart', name: '서부 경비대장 하르트', race: '인간', job: '서부 국경 초소 경비대장', faction: 'kingdom', portrait: '🛡️' };
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
  pair('gc', 'court', 'goblin', ['tk_gc_guard', 'tk_gc_envoy'], {
    when: { all: [{ noFlag: 'goblin_victory' }, { noFlag: 'west_goblin' }] },
    aWin: { flags: ['closed_goblin', 'tk_gc_court_won'], vars: { goblin_power: -3, goblin_unity: -5, border_tension: -4, kingdom_power: 2 } },
    bWin: { flags: ['closed_court', 'tk_gc_goblin_won'], vars: { goblin_power: 4, goblin_unity: 4, border_tension: 5, kingdom_power: -3, kingdom_morale: -3, war_progress: 3 } },
    caught: { cat: '전쟁', text: '붙잡힌 전령 입에서 공세 날짜 새어… 서부 초소 매복에 고블린 선봉 무너져, 부족들 숲 깊이 물러나' },
    aNews: { cat: '전쟁', text: '서부 초소에 새 창 여덟 자루… 고블린 선봉 발 돌려 숲 깊이. 궁은 한숨 돌리고 다시 왕좌 다툼으로' },
    bNews: { cat: '속보', text: '고블린 대공세, 서부 초소 셋 함락… 섭정 회의 "전쟁이 끝날 때까지 왕좌 다툼은 없다", 대관식 미뤄질 듯' },
    byWorld: { any: [courtSided, { cmp: ['kingdom_power', '>=', 'goblin_power'] }] }, // 편든 후계자가 있으면 궁정 쪽으로
    aWorld: { cat: '전쟁', text: '고블린 선봉, 서부 초소 앞에서 멈칫… 왕국군 수에 밀려 숲으로. 부족 연합은 흩어졌다' },
    bWorld: { cat: '속보', text: '서부 초소 무너져… 궁이 싸우는 사이 고블린이 먼저 움직였다. 섭정 회의 계승 논의 접고 전쟁부터' },
    double: { cat: '소문', text: '서부 초소의 창과 고블린의 칼, 같은 가게 각인이라는 소문' },
  });

  // ───── 충돌 2: 용 ↔ 고블린 (dg) — 재의 산 정찰 vs 서방 원정 ─────
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
  pair('dg', 'goblin', 'dragon', ['tk_dg_scout', 'tk_dg_marshal'], {
    when: { all: [{ noFlag: 'goblin_victory' }, { noFlag: 'west_goblin' }, { noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { noFlag: 'dragon_razed' }, { noFlag: 'dragon_pact' }] },
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
  pair('dc', 'dragon', 'court', ['tk_dc_wall', 'tk_dc_clerk'], {
    when: { all: [{ noFlag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { noFlag: 'dragon_razed' }, { noFlag: 'dragon_pact' }] },
    aWin: { flags: ['closed_court', 'tk_dc_wall_won'], vars: { dragon_defense: 100, kingdom_morale: 2, rel_noble: -1, dragon_stir: 4 } },
    bWin: { flags: ['closed_dragon', 'tk_dc_crown_won'], set: { dragon_stir: 0 }, vars: { rel_noble: 1, economy: -2 } },
    aNews: { cat: '왕국', text: '성벽 망루마다 새 방패… 섭정 회의 "대관식은 산이 잠잠해진 뒤에", 왕좌 다툼은 식었다' },
    bNews: { cat: '왕국', text: '섭정 회의, 재의 산 옛 광산 갱도 무너뜨려 막아… "금 냄새 나는 구멍부터 막았다" 연기 멎어. 대관식 준비는 예정대로' },
    byWorld: { all: [{ var: 'dragon_stir', gte: 9 }, { not: courtSided }] }, // 편든 후계자가 있으면 궁정 쪽으로
    aWorld: { cat: '왕국', text: '재의 산 연기에 섭정 회의 대관식 예산 성벽으로 돌려… 대관식도 두 후계자 다툼도 산이 잠잠해진 뒤로' },
    bWorld: { cat: '왕국', text: '섭정 회의 "용은 없다"… 대신 옛 광산 갱도를 무너뜨려 막아, 연기 멎어. 대관식 준비 예정대로' },
    double: { cat: '소문', text: '성벽 방패와 의장대 칼, 같은 가게 것… 섭정 회의 서기 "누가 누구 편이냐"' },
  });

  // ───── 충돌 4: 마왕군 ↔ 왕국 (dk) / 마왕군 ↔ 고블린 (dgo) — 공동 전선 vs 검은 깃발 동맹 ─────
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
  pair('dk', 'kingdom', 'demonlord', ['tk_dk_fort', 'tk_dk_black'], {
    when: { all: [{ noFlag: 'demonlord_victory' }, { noFlag: 'kingdom_victory' }] },
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
  pair('dgo', 'goblin', 'demonlord', ['tk_dgo_goblin', 'tk_dgo_black'], {
    when: { all: [{ noFlag: 'goblin_victory' }, { noFlag: 'west_goblin' }, { noFlag: 'demonlord_victory' }] },
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

  // ───── 충돌 6: 골렘 ↔ 고블린 (gg) — 서부 숲 가장자리 광맥 · 톱니 대 숲 ─────
  // ★8 골렘 군단이 서면 칼 든 사람(용병 · 부족)은 설 자리를 잃는다. 공방은 숲 가장자리 옛 광맥을 원하고, 부족은 그 숲이 사냥터다.
  const hepaBase = { look: 'golem_smith', name: '공방장 헤파', race: '인간', job: '청동심장 공방장', faction: 'golem', portrait: '🔧' };
  C.push(
    {
      id: 'tk_gg_foreman', ...hepaBase, kind: 'talk', spawn: { queuedOnly: true },
      summary: '청동심장 공방 — 서부 숲 가장자리 광맥으로 증설, 내일 철광석 15',
      greet: '공방을 늘려야 하오. 서부 숲 가장자리에 옛 광맥이 드러났는데, 부족들이 창을 들고 막아서오. 골렘 열 기면 부족도 길을 비킬 거요. 골렘 다리에 들어갈 철광석 열다섯, 내일 받으러 오겠소. 골렘이 성문을 지키면 용병 삯도 아낄 수 있소.',
      greetWhen: [{ when: { flag: 'golem_army' }, text: '군단은 섰지만 광석이 모자라오. 서부 숲 가장자리 옛 광맥을 파야 하는데, 부족들이 창을 들고 막아서오. 골렘 열 기를 더 세우면 길을 비킬 거요. 내일 철광석 열다섯, 받으러 오겠소.' }],
      choices: [
        { id: 'yes', label: '공방 몫으로 준비하겠소', reply: '좋소. 톱니는 거짓말을 안 하오.', effects: { flags: ['tk_gg_a_yes'], spawn: [{ customer: 'tk_gg_foreman_cart', inDays: 1 }] } },
        { id: 'no', label: '광석은 못 대겠소', mutter: '…광석을 안 대면 공방 증설은 멈춘다. 톱니의 시대도 거기까지겠지.', reply: '길드 창고에서 구하지. 더 비싸겠지만.', effects: { vars: { rel_golem: -1 } } },
      ],
    },
    buyer('tk_gg_foreman_cart', hepaBase, { item: 'iron_ore', qty: 15, offer: { mult: 1.05 } }, 'tk_gg_a_sup', { vars: { golem_tech: 2, rel_golem: 1, fairy_grace: -1 } },
      { sold: '(톱니가 째깍인다) 광맥 길목에 골렘 열 기를 세우겠소.', partial: '모자라도 다리 몇 개는 되겠소.', refused: '어제는 준비한다더니.' }),
    {
      id: 'tk_gg_envoy', ...zrakBase, kind: 'talk', spawn: { queuedOnly: true }, ...reportHooks('gg'),
      reportDetail: '서부 숲 부족 전령이었소. 광맥 길목 매복 자리까지 캐냈소.',
      summary: '고블린 부족 — 쇠 인형이 숲 가장자리를 파헤친다, 내일 창 8',
      greet: '킥! 쇠 인형들이 숲 가장자리를 파헤친다구! 나무를 뿌리째 뽑고 광맥을 판다구. 거긴 우리 사냥터라구! 내일 창 여덟 자루, 광맥 길목 막게 도와 달라구!',
      greetWhen: [{ when: { flag: 'tk_gg_a_yes' }, text: '킥… 공방장한테 광석 준다 했다며? 숲은 다 안다구. 그래도 묻는다구. 쇠 인형들이 우리 사냥터를 파헤친다구! 내일 창 여덟 자루, 도와줄 거냐구!' }],
      choices: [
        { id: 'yes', label: '내일 준비해 두겠소', reply: '킥킥! 쇠 인형 다리에 창을 꽂아 줄 거라구!', effects: { flags: ['tk_gg_b_yes'], spawn: [{ customer: 'tk_gg_envoy_cart', inDays: 1 }] } },
        { id: 'no', label: '숲에 창은 못 대오', mutter: '…숲을 빈손으로 돌려보내면 광맥은 공방 차지다. 부족의 봄도 거기서 끝이겠지.', reply: '흥! 인간은 쇠 인형 편이라구.', effects: { vars: { rel_goblin: -2 } } },
        reportChoice('gg', '…경비대에 알리면 매복 자리가 샌다. 숲 쪽 길은 거기서 끝이겠지.', '킥? 좋다구, 좋다구… (뒷걸음질로 나간다)'),
      ],
    },
    buyer('tk_gg_envoy_cart', zrakBase, { item: 'iron_spear', qty: 8, offer: { mult: 1.1 } }, 'tk_gg_b_sup', { vars: { goblin_unity: 2, border_tension: 1 } },
      { sold: '킥킥! 광맥 길목에 이 창을 세워 둘 거라구!', partial: '모자라! 그래도 간다구!', refused: '어제는 준다며! 숲은 다 기억한다구!' }),
  );
  caughtEvent('gg', 'rel_goblin', { cat: '왕국', text: '경비대, 서부 숲 부족 전령 붙잡아… "광맥 길목 매복 자리 캐냈다"' });
  pair('gg', 'golem', 'goblin', ['tk_gg_foreman', 'tk_gg_envoy'], {
    when: { all: [{ noFlag: 'goblin_victory' }, { noFlag: 'west_goblin' }] },
    aWin: { flags: ['closed_goblin', 'tk_gg_golem_won'], vars: { golem_tech: 3, goblin_power: -4, goblin_unity: -5, merc_strength: -2 } },
    bWin: { flags: ['closed_golem', 'tk_gg_goblin_won'], vars: { golem_tech: -4, goblin_unity: 3, goblin_power: 2 } },
    caught: { cat: '전쟁', text: '붙잡힌 전령 입에서 매복 자리가 새어… 골렘 열 기가 광맥 길목을 지나, 부족들 사냥터 잃고 숲 깊이 흩어져' },
    aNews: { cat: '속보', text: '청동 골렘 열 기, 서부 숲 가장자리 광맥에 말뚝 박아… 부족 연합 사냥터 잃고 흩어져, 용병 천막도 하나둘 걷혀' },
    bNews: { cat: '속보', text: '서부 숲 부족들, 광맥 길목에서 골렘 작업대 불태워… 청동심장 공방 증설 멈춰, "골렘 군단은 없던 일"' },
    byWorld: { any: [{ flag: 'golem_army' }, { var: 'golem_tech', gte: 12 }] },
    aWorld: { cat: '속보', text: '청동심장 공방, 제 광석으로 골렘 줄지어 세워 서부 숲 가장자리 광맥 차지… 흩어진 부족들 숲 깊이 물러나' },
    bWorld: { cat: '속보', text: '서부 숲 부족들, 수로 광맥 길목 지켜… 청동심장 공방 증설 계획 접어' },
    double: { cat: '소문', text: '골렘 다리의 광석과 부족의 창, 같은 가게에서… 공방장 "누구 편이오"' },
  });

  // ═════════════════════════ ④ 줄기 블록 — 어느 두 줄기든 부딪칠 수 있게 ═════════════════════════
  // 줄기마다: live(열린 조건 — 이야기가 살아 있고 그 결말에 닿을 만함) · score(앞선 정도 0~10, 짝 고르기와 결말 고르기) ·
  //   power(형세의 힘 — 아무도 · 둘 다 댔을 때) · bias(형세 가산) · endings(딸린 결말) · close(닫힘 플래그 — endings.js 가 noFlag 로 막는다)
  //   tag(기사에 쓰는 이름) · threat(상대 호소 손님이 이 줄기를 탓할 때 쓰는 한 문장) · act / worldAct(이겼을 때의 까닭 — "…하자,") · fall(졌을 때의 기사)
  //   win(이기면 효과) · supplyWin(플레이어가 이 줄기에 대서 이겼을 때 더하는 효과 — 결말에 닿게) · scenes(호소 손님: 요약 · 인사 · 내일 필요한 물자와 그 까닭 · 혼잣말 · 사러 오는 수레)
  //   meta: true — 충돌의 한쪽으로 나오지 않고, 플레이어가 어떻게 댔는지로만 닫힌다 (천칭단 · 박쥐 — js/systems/Clash.js)
  // 인사말은 "{누가} {상대 줄기의 threat}. {이 줄기의 사정} {내일 필요한 것}" — 상대가 누구든 까닭이 이어지게 (greetWhen 을 상대마다 만든다: tk_clvs_<나>_<상대>)
  const soldW = (faction, min) => ({ sold: { faction, tag: 'weapon', min } });
  const aldSided = { any: [{ flag: 'armed_aldric' }, { flag: 'armed_prince_secret' }] };
  const serSided = { any: [{ flag: 'backed_serena' }, { flag: 'armed_princess_secret' }] };
  const nSided = x => ['armed_aldric', 'armed_prince_secret', 'backed_serena', 'armed_princess_secret'].filter(x.f).length;
  WS.data.routes = [
    {
      id: 'court', name: '왕좌 다툼', tag: '섭정 회의', cat: '왕국', endings: ['iron_king', 'candle_queen', 'opportunist'], close: 'closed_court',
      live: { all: [courtOpen, courtSided] },
      score: x => 3 + nSided(x) + (x.f('interregnum') ? 2 : 0) + Math.min(3, Math.abs(x.v('succession')) / 5),
      power: x => 25 + Math.min(15, Math.abs(x.v('succession'))),
      // 한 후계자 편에 섰으면 크게, 양쪽을 다 밀었으면(기회주의) 작게 — 어느 쪽도 그 가게를 끝까지 붙들지는 않는다
      bias: x => (!nSided(x) ? 0 : WS.sys.Conditions.check({ backing: 'both' }) ? 12 : 30),
      // 대관식(30일째 밤) 전의 "절정에 닿음": 한 후계자라도 편들어 공위 기간을 지나는 중이면
      climax: x => nSided(x) > 0 && x.f('interregnum'),
      holdsOnBoth: true, // 양쪽에 다 댄 충돌은 궁정 승 (js/systems/Clash.js)
      // 플레이어가 더 민 후계자 쪽 사람이 온다 (편든 적 없는 쪽은 오지 않는다)
      appeal: x => {
        const ser = x.f('backed_serena') || x.f('armed_princess_secret'), ald = x.f('armed_aldric') || x.f('armed_prince_secret');
        return ser && (!ald || x.v('back_ser') > x.v('back_ald')) ? 'tk_rt_court_ser' : 'tk_rt_court_ald';
      },
      threat: '섭정 회의가 대관식 준비로 도성의 물자와 사람을 끌어모은다',
      act: '섭정 회의가 가게 물자로 대관식 준비를 굳히자', worldAct: '섭정 회의가 왕좌 다툼을 끝까지 끌고 가기로 하자',
      fall: '섭정 회의는 왕좌 다툼을 궁 문 안으로 거둬들였다 — 대관식은 이 가게와 상관없는 일이 되었다',
      win: { vars: { rel_noble: 1 } },
      scenes: [
        { id: 'tk_rt_court_ald', who: { look: 'noble_lord_osmund', name: '오스문드 경', race: '인간', job: '알드릭 왕자파 친위대 부관', faction: 'noble', portrait: '🛡️' },
          summary: '알드릭 왕자파 — 대관식까지 친위대를 채워야 한다, 내일 창 6',
          open: '왕자님 쪽 부관이오.', plea: '대관식까지 친위대가 버텨야 하오. 왕자님은 이 가게를 기억하시오.', ask: '내일 창 여섯 자루, 친위대 수레를 보내겠소.',
          yesReply: '좋소. 대관식 행렬 맨 앞에 이 창이 서겠소.', noLabel: '창은 못 대겠소', noReply: '왕자님께 그대로 전하겠소.',
          mutter: '…친위대를 빈손으로 돌려보내면, 왕좌 다툼에서 이 가게 자리는 없다.', noEffects: { vars: { rel_noble: -1 } },
          cart: { greet: '오스문드 경이 보냈소. {item} {qty}자루, {offer}G.', item: 'iron_spear', qty: 6, mult: 1.15, onSell: { vars: { succession: 3, merc_strength: 1 }, flags: ['armed_aldric'] },
            lines: { sold: '왕자님이 이 가게 이름을 적으셨소.', partial: '모자라도 받아 가겠소.', refused: '어제는 댄다더니…' } } },
        { id: 'tk_rt_court_ser', who: { look: 'noble_lady_rosalind', name: '로살린 부인', race: '인간', job: '세레나 공주파 귀부인', faction: 'noble', portrait: '👒' },
          summary: '세레나 공주파 — 대관식까지 구호소를 열어 둬야 한다, 내일 물약 8',
          open: '공주님 쪽 사람이에요.', plea: '대관식까지 광장 구호소 줄이 끊기면 안 돼요. 공주님은 이 가게를 기억하세요.', ask: '내일 물약 여덟 병, 구호소 수레를 보낼게요.',
          yesReply: '고마워요. 구호소 천막에 공주님 문장이 걸릴 거예요.', noLabel: '물약은 못 대겠소', noReply: '…공주님께 그대로 전할게요.',
          mutter: '…구호소를 빈손으로 돌려보내면, 왕좌 다툼에서 이 가게 자리는 없다.', noEffects: { vars: { rel_noble: -1 } },
          cart: { who: { look: 'priest_c', name: '구호소 수녀', race: '인간', job: '세레나 공주파 구호소', faction: 'church', portrait: '🕯️' },
            greet: '로살린 부인이 보냈어요. {item} {qty}병, {offer}G.', item: 'potion', qty: 8, mult: 1.15, onSell: { vars: { succession: -3, church_authority: 1 }, flags: ['backed_serena'] },
            lines: { sold: '구호소 줄이 오늘은 짧아지겠어요.', partial: '이만큼이라도 고마워요.', refused: '…어제는 된다고 하셨는데요.' } } },
      ],
    },
    {
      id: 'night', name: '밤의 궁정', tag: '밤의 궁정', cat: '왕국', endings: ['night_court'], close: 'closed_night', hostile: true, rel: 'rel_vampire',
      live: { all: [{ flag: 'vampire_backed' }, { noFlag: 'vampire_court_fell' }, { noFlag: 'crowned' }, { any: [{ flag: 'succession_crisis' }, { flag: 'interregnum' }, { flag: 'court_struggle' }] }, { var: 'vampire_power', gte: 14 }] },
      score: x => x.v('vampire_power') / 4 + (x.f('night_regent') ? 3 : 0),
      power: x => x.v('vampire_power') * 1.5,
      climax: x => x.f('vampire_backed') && x.v('vampire_power') >= 22,
      appeal: 'tk_rt_night',
      threat: '밤의 궁정 마차가 해 진 뒤 궁 뒷문을 드나든다',
      act: '백작가 사병이 가게 칼을 차고 궁 뒷문을 지키자', worldAct: '밤의 궁정이 해 진 뒤 섭정 회의를 먼저 쥐자',
      caughtAct: '경비대가 붙잡은 창백한 시종 입에서 백작 저택의 밤길이 새자',
      caughtNews: { cat: '왕국', text: '경비대, 궁 뒷문 드나들던 창백한 시종 붙잡아… 백작 저택 앞에 은 화살 겨눠' },
      fall: '베른하르트 백작 저택은 문을 닫아걸었다 — 대관식 밤을 노리던 밤의 궁정은 물러났다',
      win: { vars: { vampire_power: 3 } },
      scenes: [
        { id: 'tk_rt_night', late: true, who: { look: 'vampire', name: '창백한 시종', race: '흡혈귀', job: '밤의 궁정 사절', faction: 'vampire', portrait: '🦇' },
          summary: '밤의 궁정 — 대관식 밤 궁 뒷문을 지킬 칼, 내일 해 진 뒤 칼 6',
          open: '백작님의 심부름이오.', plea: '백작님은 대관식 밤을 기다리시오. 그 밤 궁 뒷문을 지킬 칼이 모자라오.', ask: '내일 해 진 뒤 칼 여섯 자루. 값은 넉넉히.',
          yesReply: '백작님은 이 가게를 잊지 않으실 거요.', noLabel: '밤손님에겐 칼을 안 대오', noReply: '…밤은 길고, 기억도 길다오.',
          mutter: '…밤의 시종을 돌려보내면, 백작 저택 문은 이 가게에 다시 열리지 않는다.', noEffects: { vars: { rel_vampire: -2 } },
          report: '…경비대에 알리면 백작 저택의 밤길이 샌다. 밤의 궁정 쪽 문은 영영 닫히겠지.',
          reportDetail: '밤의 궁정 시종이었소. 궁 뒷문 드나드는 밤길을 캐냈소.',
          cart: { item: 'iron_sword', qty: 6, mult: 1.3, onSell: { vars: { vampire_power: 2 }, flags: ['vampire_friend'] },
            lines: { sold: '(칼을 검은 천에 싼다) 대관식 밤에 쓰일 거요.', partial: '이것도 받겠소.', refused: '…어제는 된다더니.' } } },
      ],
    },
    {
      id: 'knight', name: '기사단장의 친구', tag: '제7기사단', cat: '왕국', endings: ['knight_commander'], close: 'closed_knight',
      live: { all: [{ flag: 'leon_contract' }, { noFlag: 'leon_contract_broken' }] },
      score: x => 3 + x.v('leon_bond') + x.v('rel_kingdom') / 10,
      power: x => x.v('kingdom_power') + x.v('leon_bond') * 3,
      appeal: 'tk_rt_knight',
      threat: '제7기사단이 서부 숲 길목마다 초소를 세운다',
      act: '제7기사단이 가게 방패를 걸고 서부 길목을 틀어막자', worldAct: '제7기사단이 제 힘으로 서부 길목을 틀어막자',
      fall: '레온의 기사단은 다른 보급처를 찾았다 — 계약서는 서랍 속에서 누렇게 바랬다',
      win: { vars: { rel_kingdom: 1, leon_bond: 1 } },
      scenes: [
        { id: 'tk_rt_knight', who: { look: 'knight', name: '기사단장 레온', race: '인간', job: '제7기사단 단장', faction: 'kingdom', portrait: '🤺' },
          summary: '제7기사단 — 서부 초소가 비었다, 계약과 따로 내일 방패 6',
          open: '레온이오.', plea: '서부 초소가 비었소. 계약서 밖의 부탁이라 미안하오.', ask: '내일 방패 여섯, 보급관을 보내겠소.',
          yesReply: '고맙소. 초소에 이 가게 방패를 걸겠소.', noLabel: '이번엔 못 대겠소', noReply: '…알겠소. 다른 데를 알아보겠소.',
          mutter: '…레온을 빈손으로 보내면, 기사단 보급 장부에서 이 가게 이름이 흐려진다.', noEffects: { vars: { leon_bond: -1 } },
          cart: { who: { look: 'soldier_b', name: '보급관 에드윈', race: '인간', job: '제7기사단 보급관', faction: 'kingdom', portrait: '📦' },
            item: 'shield', qty: 6, mult: 1, onSell: { vars: { rel_kingdom: 1, kingdom_power: 1 } },
            lines: { sold: '단장님이 고맙다 전하랍니다.', partial: '모자라도 초소 하나는 채우겠소.', refused: '단장님께 뭐라 전하라는 거요.' } } },
      ],
    },
    {
      id: 'goblin', name: '서부 숲 부족', tag: '서부 숲 부족', cat: '전쟁', endings: ['goblin_nation', 'forest_benefactor'], close: 'closed_goblin', hostile: true, rel: 'rel_goblin',
      // 「명예 고블린」(부족에 칼 45 · 부족이 서부 숲을 차지하거나 전쟁에 이김) · 「숲의 은인」(마르가의 답례)에 닿을 만할 때
      live: { all: [{ any: [
        { all: [soldW('goblin', 30), { any: [{ flag: 'war' }, { flag: 'goblin_unified' }, { flag: 'west_goblin' }, { var: 'goblin_power', gte: 45 }] }] },
        { flag: 'goblin_victory' }, { all: [{ flag: 'goblin_unified' }, { flag: 'west_goblin' }] }, { all: [{ flag: 'marga_thanked' }, { var: 'rel_goblin', gte: 6 }] },
      ] }, { noFlag: 'kingdom_victory' }] },
      score: x => x.sold('goblin') / 8 + (x.f('goblin_unified') ? 2 : 0) + (x.f('west_goblin') ? 2 : 0) + (x.f('goblin_victory') ? 4 : 0),
      power: x => x.v('goblin_power'),
      appeal: 'tk_rt_goblin',
      threat: '서부 숲 부족들이 창을 맞대고 숲 가장자리를 막아선다',
      act: '서부 숲 부족들이 가게 칼을 들고 숲 가장자리를 막아서자', worldAct: '서부 숲 부족들이 수로 밀어붙이자',
      caughtAct: '경비대가 붙잡은 전령 입에서 부족의 공세 날짜가 새자',
      caughtNews: { cat: '왕국', text: '경비대, 서부 숲 부족 전령 붙잡아… "공세 날짜 캐냈다"' },
      fall: x => (x.f('goblin_victory') || x.f('west_goblin')
        ? '서부 숲의 부족들은 새 칼을 다른 데서 구했다 — "건국의 상인"이라는 이름은 이 가게에 오지 않는다'
        : '서부 숲 부족 연합은 흩어져 숲 깊이 물러났다 — 숲에 고블린의 깃발은 서지 않는다'),
      win: { vars: { goblin_power: 3, goblin_unity: 3 } },
      supplyWin: { vars: { goblin_unity: 3, rel_goblin: 2 } },
      scenes: [
        { id: 'tk_rt_goblin', who: zrakBase,
          summary: '고블린 부족 — 숲을 지킬 칼이 모자라다, 내일 칼 10',
          open: '킥! 즈락이다.', plea: '숲은 우리 거라구! 칼이 모자라다구.', ask: '내일 칼 열 자루, 받으러 와도 되냐구?',
          pleaWhen: [{ when: { flag: 'war' }, text: '전쟁이 한창이라구! 칼이 모자라다구.' }],
          yesReply: '킥킥! 내일 해 지기 전에 온다구!', noLabel: '숲에 칼은 못 대오', noReply: '흥! 인간은 인간 편이라구.',
          mutter: '…숲을 빈손으로 돌려보내면, 부족의 봄은 여기서 끝이다.', noEffects: { vars: { rel_goblin: -2 } },
          report: '…경비대에 알리면 공세 날짜가 샌다. 숲 쪽 길은 거기서 끝이겠지.',
          reportDetail: '서부 숲 부족 전령이었소. 공세 날짜까지 캐냈소.',
          cart: { greet: '킥, 어제 말한 칼 받으러 왔다구. {item} {qty}자루, {offer}G.', item: 'iron_sword', qty: 10, mult: 1.15, onSell: { vars: { goblin_unity: 2, border_tension: 1 } },
            lines: { sold: '킥킥! 숲이 이 가게를 기억할 거라구!', partial: '모자라! 그래도 간다구!', refused: '어제는 준다며! 숲은 다 기억한다구!' } } },
      ],
    },
    {
      id: 'kingdom', name: '왕실 공식 무기상', tag: '왕실 조달청', cat: '왕국', endings: ['kingdom_armory'], close: 'closed_kingdom',
      // 「왕실 공식 무기상」 — 왕국이 전쟁에 이기거나 왕실 인증 + 관계 12 (인증은 조달관의 헌납 · 이 줄기가 가게 창으로 충돌에 이긴 때)
      live: { any: [{ flag: 'kingdom_victory' }, { flag: 'royal_certified' }, { all: [{ flag: 'tk_levy1_ok' }, { noFlag: 'tk_levy_refused' }] }, { all: [{ flag: 'crown_supplier' }, { var: 'rel_kingdom', gte: 10 }] }] },
      score: x => x.v('rel_kingdom') / 5 + (x.f('royal_certified') ? 2 : 0) + (x.f('crown_supplier') ? 1 : 0) + (x.f('kingdom_victory') ? 4 : 0),
      power: x => x.v('kingdom_power'),
      appeal: 'tk_rt_kingdom',
      threat: '왕실 조달청이 도성 무기점의 창을 규정가로 거둬 간다',
      act: '왕실 조달청이 가게 창으로 왕국군 창고를 채우자', worldAct: '왕국군이 제 창고만으로 버티자',
      fall: '왕실 조달청은 이 가게와의 납품 계약을 거둬들였다 — 금박 왕실 문장은 다른 가게 간판에 걸린다',
      win: { vars: { kingdom_power: 3, rel_kingdom: 2 } },
      supplyWin: { flags: ['royal_certified', 'crown_supplier'], vars: { rel_kingdom: 2 } }, // 가게 창으로 이겼으면 왕실 인증
      scenes: [
        { id: 'tk_rt_kingdom', who: { ...odricBase },
          summary: '왕실 조달청 — 왕국군 창고가 비었다, 내일 창 8 (규정가)',
          open: '왕실 조달청 감사관 오드릭이오.', plea: '왕국군 창고가 비었소. 공식 무기상 자리는 이럴 때 채워 주는 가게 몫이오.', ask: '내일 창 여덟 자루, 값은 규정가요 — 시세보다 조금 낮소.',
          yesReply: '장부에 적겠소. 국가가 기억하오.', noLabel: '규정가로는 못 대오', noReply: '장사꾼은 역시 장사꾼이군.',
          mutter: '…조달청을 돌려보내면, 왕실 장부에서 이 가게 이름이 빠진다.', noEffects: { vars: { rel_kingdom: -2 } },
          cart: { item: 'iron_spear', qty: 8, mult: 0.9, onSell: { vars: { rel_kingdom: 2, kingdom_power: 1 }, flags: ['crown_supplier'] },
            lines: { sold: '왕국군 창고에 오늘 밤 안에 들이겠소.', partial: '모자란 건 다음에 채우시오.', refused: '약속을 어기는 가게라… 적어 두겠소.' } } },
      ],
    },
    {
      id: 'dragon', name: '재의 산의 용', tag: '성벽 수비대', cat: '속보', endings: ['dragon_ash', 'dragon_nest', 'dragonfall'], close: 'closed_dragon',
      // 용이 깨어났거나 끝났거나, 아직 깰 시간이 남았을 때 (깨고 사흘 뒤 내려온다 — 25일이 지나 잠든 채면 닿지 못한다)
      live: { any: [{ flag: 'dragon_awake' }, { flag: 'dragon_slain' }, { flag: 'dragon_razed' }, { flag: 'dragon_pact' },
        { all: [{ realDay: { lte: 25 } }, { any: [{ var: 'dragon_stir', gte: 6 }, { customerSeen: 'wd_ash_watch' }, { customerSeen: 'wd_ash_scouts' }] }] }] },
      score: x => x.v('dragon_stir') / 2 + (x.f('dragon_awake') ? 4 : 0) + (x.f('dragon_slain') || x.f('dragon_razed') || x.f('dragon_pact') ? 5 : 0),
      power: x => x.v('dragon_stir') * 4 + (x.f('dragon_awake') ? 30 : 0) + (x.f('dragon_slain') || x.f('dragon_razed') || x.f('dragon_pact') ? 30 : 0),
      appeal: 'tk_rt_dragon',
      threat: '재의 산 연기에 성벽 수비대가 도성 물자를 먼저 거둬 간다',
      act: '성벽 수비대가 가게 방패로 망루를 채우고 도성의 눈을 재의 산으로 돌리자', worldAct: '재의 산 연기가 짙어져 도성의 눈이 모두 산으로 쏠리자',
      fall: x => (x.f('dragon_slain') || x.f('dragon_razed') || x.f('dragon_pact')
        ? '재의 산 이야기는 다른 소식에 묻혔다 — 그해 성벽 물자를 누가 댔는지 묻는 사람은 없다'
        : '재의 산 정찰은 뒤로 밀리고 옛 갱도는 무너뜨려 막혔다 — 용 이야기는 산속에 묻혔다'),
      win: { vars: { dragon_stir: 3, dragon_defense: 100 } },
      supplyWin: { vars: { dragon_stir: 2 } },
      // 「용」 삼형제 결말은 events.js dragon_descends(깨고 사흘 뒤)가 dragon_defense 시세로 가른다 — 용이 25일 가까이 늦게 깨면
      // 그 사흘이 캠페인 끝(30일) 뒤로 밀려 셋 다 못 걸린다. 공급승을 한 번이라도 거뒀는데 여전히 안 갈렸으면(끝물, 26일+)
      // events.js 가 쓰는 바로 그 문턱(900 · 골렘 있으면 450)으로 앞당겨 갈라 준다 — 새 규칙이 아니라 같은 셈을 늦지 않게 매길 뿐
      clashClimax: { wins: 0, resolve: x => {
        if (x.f('dragon_slain') || x.f('dragon_razed') || x.f('dragon_pact') || !x.f('dragon_awake')) return null;
        const slain = x.v('dragon_defense') >= 900 || (x.f('golem_kingdom') && x.v('dragon_defense') >= 450);
        return slain
          ? { flags: ['dragon_slain'], vars: { economy: 6, kingdom_power: 4, kingdom_morale: 6, rel_dragon: -10 },
            news: { cat: '속보', text: '붉은 용 추락! 뒤늦게 도착한 수비 물자가 그래도 성벽을 버텨 냈다' } }
          : { flags: ['dragon_razed'], vars: { economy: -12, kingdom_morale: -8, kingdom_power: -4 },
            news: { cat: '속보', text: '재의 산 이야기가 매듭짓지 못한 채 해가 저문다 — 용은 결국 상점가를 스쳐 지나며 불을 놓았다' } };
      } },
      scenes: [
        { id: 'tk_rt_dragon', who: { look: 'wall_captain', name: '성벽 수비대장 브란트', race: '인간', job: '성벽 수비 용병대장', faction: 'merc', portrait: '🏰' },
          summary: '성벽 수비대 — 재의 산이 연기를 뿜는다, 내일 방패 6',
          open: '성벽 수비대장 브란트요.', plea: '재의 산이 연기를 뿜는데 성벽 예산은 늘 뒷전이오.', ask: '내일 방패 여섯, 망루에 걸 몫이오.',
          pleaWhen: [{ when: { any: [{ flag: 'dragon_slain' }, { flag: 'dragon_razed' }] }, text: '용이 지나간 성벽이 아직 무너진 채요. 다음 불이 오기 전에 망루를 세워야 하오.' }],
          yesReply: '고맙소. 성벽은 비단보다 오래가오.', noLabel: '방패는 못 대겠소', noReply: '용이 오면 이 가게도 타오.',
          mutter: '…성벽을 빈손으로 두면, 도성은 재의 산 이야기를 또 웃어넘기겠지.', noEffects: {},
          cart: { item: 'shield', qty: 6, mult: 1, onSell: { vars: { dragon_defense: 60 } },
            lines: { sold: '망루마다 하나씩 걸겠소.', partial: '이것도 받겠소.', refused: '용이 오면 기억하시오.' } } },
      ],
    },
    {
      id: 'demonlord', name: '검은 깃발', tag: '검은 군단', cat: '전쟁', endings: ['demonlord_dominion'], close: 'closed_demonlord', hostile: true, rel: 'rel_demonlord',
      // 「검은 깃발 아래」 — 마왕군에 칼 25 (동맹 · 사절과 손잡았으면 12) + 마왕군 승리, 또는 동맹 + 세력 45
      live: { all: [{ any: [{ flag: 'demonlord_pact' }, { all: [{ any: [{ flag: 'armed_demonlord' }, { flag: 'ring_to_demonlord' }] }, soldW('demonlord', 8)] }, soldW('demonlord', 15)] }, { noFlag: 'demonlord_repelled' }] },
      score: x => x.v('demonlord_power') / 10 + (x.f('demonlord_pact') ? 2 : 0) + (x.f('armed_demonlord') ? 1 : 0) + (x.f('demonlord_victory') ? 4 : 0),
      power: x => x.v('demonlord_power'),
      appeal: 'tk_rt_demonlord',
      threat: '검은 깃발 모병관이 북쪽 황무지에서 칼을 사 모은다',
      act: '검은 군단이 가게 칼을 차고 북부 요새 앞에 진을 치자', worldAct: '검은 군단이 수로 북부 국경을 밀어붙이자',
      caughtAct: '경비대가 붙잡은 검은 사절 입에서 요새를 칠 날짜가 새자',
      caughtNews: { cat: '왕국', text: '경비대, 검은 깃발 사절 붙잡아… "북부 요새 칠 날짜 캐냈다"' },
      fall: x => (x.f('demonlord_victory')
        ? '휴전 조약의 "협력 상점" 명단에서 이 가게 이름이 빠졌다 — 검은 깃발 아래의 약속은 없던 일이 되었다'
        : '검은 깃발은 황무지 너머로 물러났다 — 검은 깃발 아래의 약속은 없던 일이 되었다'),
      win: { vars: { demonlord_power: 4, invasion_risk: 3 } },
      supplyWin: { flags: ['armed_demonlord'], vars: { rel_demonlord: 2 } },
      scenes: [
        { id: 'tk_rt_demonlord', who: morgasBase,
          summary: '마왕군 — 검은 군단의 칼, 내일 칼 10 (값은 마석으로)',
          open: '폐하의 사절이다.', plea: '폐하의 군단이 남쪽을 본다. 이 거리 몫의 칼을 청하신다.', ask: '내일 칼 열 자루. 값은 금화 조금과 마석으로.',
          yesReply: '현명하다. 폐하의 목록에 네 이름이 오른다.', noLabel: '검은 깃발엔 칼을 안 대오', noReply: '폐하는 기억하신다.',
          mutter: '…사절을 돌려보내면 검은 깃발 쪽 문은 닫힌다.', noEffects: { vars: { rel_demonlord: -2 } },
          report: '…경비대에 알리면 요새를 칠 날짜가 샌다. 검은 깃발 쪽 문은 영영 닫히겠지.',
          reportDetail: '검은 깃발 사절이었소. 북부 요새를 칠 날짜를 들고 있었소.',
          cart: { greet: '폐하의 몫이다. {item} {qty}자루. 금화는 {offer}G, 나머지는 마석으로 치른다.', item: 'iron_sword', qty: 10, mult: 0.45, onSell: blackPay,
            lines: { sold: '금화는 그만큼이다. 나머지는 이 돌들로 받아라.', partial: '모자라군. 값도 그만큼이다.', refused: '폐하는 숫자를 기억하신다.' } } },
      ],
    },
    {
      id: 'golem', name: '톱니의 시대', tag: '청동심장 공방', cat: '드워프', endings: ['golem_age'], close: 'closed_golem',
      live: { all: [{ any: [{ flag: 'armed_golems' }, { sold: { faction: 'golem', tag: 'material', min: 10, trades: true } }] }, { any: [{ flag: 'golem_workshop' }, { flag: 'golem_army' }] }] },
      score: x => x.v('golem_tech') / 3 + (x.f('golem_army') ? 4 : 0) + (x.f('armed_golems') ? 1 : 0),
      power: x => x.v('golem_tech') * 3 + (x.f('golem_army') ? 20 : 0),
      appeal: 'tk_rt_golem',
      threat: '청동심장 공방이 광맥과 일손을 싹쓸이한다 — 골렘이 성문을 지키면 칼 든 사람은 설 자리를 잃는다',
      act: '청동심장 공방이 가게 광석으로 새 골렘을 줄지어 세우자', worldAct: '청동심장 공방이 제 광석으로 골렘을 줄지어 세우자',
      fall: x => (x.f('golem_army')
        ? '청동심장 공방은 광석을 길드 창고에서 들이기로 했다 — 골렘 가슴판에 이 가게 쇠는 없다'
        : '청동심장 공방 증설은 멈췄다 — 광장의 골렘은 멈춘 채 녹슨다'),
      win: { vars: { golem_tech: 3 } },
      supplyWin: { flags: ['armed_golems'], vars: { golem_tech: 3 } }, // 가게 광석으로 이겼으면 공방에 손을 보탠 가게
      scenes: [
        { id: 'tk_rt_golem', who: hepaBase,
          summary: '청동심장 공방 — 증설이 코앞, 내일 철광석 15',
          open: '공방장 헤파요.', plea: '공방 증설이 코앞이오. 골렘은 흥정하지 않고 지치지도 않소.', ask: '내일 철광석 열다섯, 골렘 다리에 들어갈 몫이오.',
          yesReply: '좋소. 톱니는 거짓말을 안 하오.', noLabel: '광석은 못 대겠소', noReply: '길드 창고에서 구하지. 더 비싸겠지만.',
          mutter: '…광석을 안 대면 공방 증설은 멈춘다. 톱니의 시대도 거기까지겠지.', noEffects: { vars: { rel_golem: -1 } },
          cart: { item: 'iron_ore', qty: 15, mult: 1.05, onSell: { vars: { golem_tech: 2, rel_golem: 1, fairy_grace: -1 } },
            lines: { sold: '(톱니가 째깍인다) 새 골렘 다리가 서겠소.', partial: '모자라도 다리 몇 개는 되겠소.', refused: '어제는 준비한다더니.' } } },
      ],
    },
    {
      id: 'dwarf', name: '강철의 시대', tag: '강철수염 씨족', cat: '드워프', endings: ['steel_age'], close: 'closed_dwarf',
      live: { any: [{ all: [{ flag: 'dwarf_contract' }, { noFlag: 'dwarf_contract_broken' }] }, { flag: 'dwarf_golden_age' }] },
      score: x => x.v('dwarf_deliveries') * 1.5 + (x.f('dwarf_golden_age') ? 5 : 0) + 1,
      power: x => x.v('dwarf_tech') * 2,
      appeal: 'tk_rt_dwarf',
      threat: '강철수염 씨족이 산을 더 깊이 파고 광석을 끌어모은다',
      act: '강철수염 용광로가 가게 광석으로 밤새 타오르자', worldAct: '강철수염 씨족이 제 광산만으로 용광로를 지피자',
      fall: x => (x.f('dwarf_golden_age')
        ? '강철수염 장로는 연대기에서 이 가게 이름을 지웠다 — "약속보다 다른 일이 먼저인 인간"이라며'
        : '강철수염 용광로는 절반이 꺼졌다 — 드워프 강철의 시대는 오지 않는다'),
      win: { vars: { dwarf_tech: 3, rel_dwarf: 1 } },
      // 공급으로 이겼을 때만 dwarf_deliveries 를 1 올린다 — 원래 있던 "납품 4회 → 황금기"(customers.js dwarf_porter) 문턱에 자연히 합류한다.
      // 형세로 이긴 건(공급 없이) 안 친다 — 「실제로 광석을 댔느냐」가 여전히 기준
      supplyWin: { vars: { dwarf_deliveries: 1 } },
      scenes: [
        { id: 'tk_rt_dwarf', who: { look: 'dwarf', name: '전령 도린', race: '드워프', job: '강철수염 씨족 전령', faction: 'dwarf', portrait: '⛏️' },
          summary: '강철수염 씨족 — 용광로를 더 지펴야 한다, 계약과 따로 내일 철광석 12',
          open: '강철수염 전령 도린이오.', plea: '용광로를 더 지펴야 하오. 계약 물량과는 따로요.', ask: '내일 철광석 열둘, 받으러 오겠소.',
          yesReply: '장로께 전하겠소. 약속을 지키는 인간이라고.', noLabel: '이번엔 못 대겠소', noReply: '…계약 물량만이라도 지켜 주시오.',
          mutter: '…용광로가 식으면, 강철수염의 황금기도 거기까지다.', noEffects: { vars: { rel_dwarf: -1 } },
          cart: { item: 'iron_ore', qty: 12, mult: 1, onSell: { vars: { dwarf_tech: 2, rel_dwarf: 1 } },
            lines: { sold: '용광로가 오늘 밤 붉게 타겠소.', partial: '이것도 받겠소.', refused: '장로께 뭐라 말씀드리오.' } } },
      ],
    },
    {
      id: 'fairy', name: '요정의 가호', tag: '동쪽 숲 요정', cat: '생활', endings: ['fairy_friend'], close: 'closed_fairy',
      live: { all: [{ any: [{ flag: 'fairy_blessing' }, { flag: 'fairy_oath2' }, { flag: 'fairy_oath3' }, { flag: 'forest_remembers' }] }, { noFlag: 'fairy_betrayed' }, { noFlag: 'fairy_spurned' }] },
      score: x => ['fairy_blessing', 'fairy_oath2', 'fairy_oath2_kept', 'fairy_oath3'].filter(x.f).length * 2 + (x.f('forest_remembers') ? 5 : 0),
      power: x => x.v('fairy_grace') * 2,
      // 「요정의 가호」는 원래 세 맹세(광석 두 번 · 사흘 무기 안 팖 — customers.js fairy_oath 흐름)를 다 지켜야만 forest_remembers 가 켜진다.
      // 그 맹세는 충돌과 무관해서, 이 줄기만 거듭 이겨도(물약을 계속 대 줘도) 결말엔 못 닿았다 — 공급승 2번을 넘고 끝물(26일+)이면 숲이 그 헌신을 맹세로 쳐준다
      clashClimax: { wins: 2, flags: ['forest_remembers'], vars: { fairy_grace: 3, rel_fairy: 2 },
        news: { cat: '생활', text: '요정불이 밤마다 가게 문턱까지 내려온다 — 거듭 손을 내민 상인을, 숲은 맹세를 지킨 셈 치기로 했다' } },
      appeal: 'tk_rt_fairy',
      threat: '동쪽 숲 요정불이 숲 가장자리마다 경계를 친다',
      act: '요정들이 가게 물약으로 숲 가장자리를 되살리자', worldAct: '동쪽 숲이 제 힘으로 가장자리를 되살리자',
      fall: '요정불은 숲 깊이 물러났다 — 숲은 이 가게를 기억하지 않는다',
      win: { vars: { fairy_grace: 4, rel_fairy: 1 } },
      scenes: [
        { id: 'tk_rt_fairy', who: { look: 'fairy_queen', name: '이슬궁의 티타니엘', race: '요정', job: '요정 여왕의 사절', faction: 'fairy', portrait: '🧚' },
          summary: '동쪽 숲 요정 — 숲 가장자리가 앓는다, 내일 물약 6',
          open: '티타니엘이에요.', plea: '숲 가장자리 나무들이 앓아요. 칼은 필요 없어요.', ask: '내일 물약 여섯 병, 뿌리에 부을 몫이에요.',
          yesReply: '고마워요. 풀잎에 적어 둘게요.', noLabel: '이번엔 못 대겠소', noReply: '…그래요. 숲은 기다릴게요.',
          mutter: '…숲을 빈손으로 보내면, 풀잎에 적힌 약속도 바래겠지.', noEffects: { vars: { rel_fairy: -1 } },
          cart: { who: { look: 'fairy', name: '숲의 심부름꾼', race: '요정', job: '티타니엘의 심부름꾼', faction: 'fairy', portrait: '🧚' },
            greet: '티타니엘 님 심부름이에요. {item} {qty}병, {offer}G.', item: 'potion', qty: 6, mult: 1, onSell: { vars: { fairy_grace: 2, rel_fairy: 1 } },
            lines: { sold: '(반짝이는 가루가 카운터에 떨어진다) 숲이 고마워해요.', partial: '이만큼이라도요.', refused: '…어제는 된다고 했잖아요.' } } },
      ],
    },
    {
      id: 'undead', name: '잿빛 행진', tag: '잿빛 수의 교단', cat: '사건', endings: ['grey_march'], close: 'closed_undead', hostile: true, rel: 'rel_undead',
      live: { any: [{ flag: 'undead_tide' }, { flag: 'armed_dead' }, { all: [{ flag: 'graves_opened' }, { var: 'undead_power', gte: 16 }] }] },
      score: x => x.v('undead_power') / 5 + (x.f('undead_tide') ? 5 : 0),
      power: x => x.v('undead_power') * 2,
      appeal: 'tk_rt_undead',
      threat: '잿빛 수의 교단이 공동묘지마다 밤 미사를 올린다',
      act: '잿빛 행렬이 가게 방패를 들고 서쪽 가도를 걷자', worldAct: '잿빛 행렬이 수로 서쪽 가도를 메우자',
      caughtAct: '경비대가 붙잡은 교단 사제 입에서 행렬의 길이 새자',
      caughtNews: { cat: '사건', text: '경비대, 잿빛 수의 사제 붙잡아… "행렬이 지날 길 캐냈다"' },
      fall: x => (x.f('undead_tide')
        ? '잿빛 행렬은 서쪽 가도 너머로 사라졌다 — 행렬의 방패에 이 가게 각인은 없다'
        : '잿빛 행렬은 흩어졌다 — 공동묘지 흙이 다시 굳었다'),
      win: { vars: { undead_power: 4 } },
      // 「잿빛 행진」은 events.js dead_march(세력 22 문턱)가 뜬 이틀 뒤 dead_march_resolution 이 갈라 준다 — 세력이 22를 캠페인 막바지에야
      // 넘으면 그 이틀이 30일 뒤로 밀려 아예 못 갈린다. 끝물(26일+)에 이미 22를 넘겼는데도 안 갈렸으면 그 사건이 쓰는 바로 그 문턱으로 앞당겨 매긴다
      clashClimax: { wins: 0, resolve: x => {
        if (x.f('undead_tide') || x.f('dead_repelled') || x.f('vampires_saved_city') || x.v('undead_power') < 22) return null;
        if (x.v('undead_defense') >= 600 || x.v('church_authority') >= 36)
          return { flags: ['dead_repelled'], vars: { undead_power: -20, church_authority: 6, reputation: 3 }, news: { cat: '속보', text: '뒤늦게 모인 성수와 은이 그래도 해골 행렬을 막았다! 대성당 종소리' } };
        if (x.v('vampire_power') >= 18)
          return { flags: ['vampires_saved_city'], vars: { undead_power: -16, vampire_power: 4, kingdom_morale: -2 }, news: { cat: '속보', text: '창백한 귀족들이 뒤늦게 해골 행렬을 부숴… "이 도시 피는 우리 것"' } };
        return { flags: ['undead_tide', 'village_fell'], vars: { economy: -8, kingdom_morale: -8, undead_power: 6, rel_village: -3 }, news: { cat: '속보', text: '해골 행렬, 매듭짓지 못한 채 동쪽 마을을 삼켰다' } };
      } },
      scenes: [
        { id: 'tk_rt_undead', late: true, who: { look: 'necromancer', name: '예언자 모라크', race: '인간', job: '잿빛 수의 교단 사제', faction: 'undead', portrait: '☠️' },
          summary: '잿빛 수의 교단 — 행렬이 서쪽으로 걷는다, 내일 방패 6',
          open: '예언자 모라크요.', plea: '잿빛 행렬이 서쪽으로 걷소. 죽은 자들은 물건을 오래 쓰오.', ask: '내일 해 진 뒤 방패 여섯.',
          yesReply: '행렬이 이 가게 앞은 조용히 지나갈 거요.', noLabel: '망자에겐 안 대오', noReply: '산 자의 셈이군.',
          mutter: '…교단을 돌려보내면, 잿빛 행렬에 이 가게 각인은 없다.', noEffects: { vars: { rel_undead: -2 } },
          report: '…경비대에 알리면 행렬의 길이 샌다. 교단 쪽 문은 영영 닫히겠지.',
          reportDetail: '잿빛 수의 교단 사제였소. 행렬이 지날 길을 캐냈소.',
          cart: { item: 'shield', qty: 6, mult: 1.2, onSell: { vars: { undead_power: 2 }, flags: ['armed_dead'] },
            lines: { sold: '(달그락) 오래 쓰겠소.', partial: '이것도 받겠소.', refused: '…산 자의 약속이란.' } } },
      ],
    },
    {
      id: 'mist', name: '안개 상단', tag: '안개 상단', cat: '소문', endings: ['moonlit_market'], close: 'closed_mist', hostile: true, rel: 'rel_demon',
      live: { all: [{ any: [{ flag: 'mist_second_contract' }, { all: [{ flag: 'demon_contract' }, { var: 'demon_influence', gte: 8 }] }] }, { noFlag: 'mist_contract_broken' }] },
      score: x => x.v('demon_influence') / 4 + (x.f('mist_second_contract') ? 3 : 0),
      power: x => x.v('demon_influence') * 3,
      // 「안개가 드리운 마을」은 원래 두 번째 계약(customers.js mist_contract2 — 별도 서사 분기)에 서명해야만 닿는다.
      // 그 계약 제안은 충돌과 무관해서, 첫 계약만 들고 이 줄기를 거듭 이겨도 결말엔 못 닿았다 — 공급승 2번을 넘고 끝물(26일+)이면
      // 안개 상단이 알아서 둘째 장을 내민 것으로 친다 (값은 여느 때처럼 기억으로 — mist_paid_memory 변형 글로 이어진다)
      clashClimax: { wins: 1, flags: ['mist_second_contract', 'mist_paid_memory'], vars: { demon_influence: 3 },
        news: { cat: '소문', text: '안개 상단이 거듭된 거래 끝에 계약서 둘째 장을 내밀었다 — 값은 여느 때처럼, 기억으로' } },
      appeal: 'tk_rt_mist',
      threat: '안개 상단이 밤마다 골목에 장을 편다',
      act: '안개 상단이 가게 물건으로 밤 시장을 넓히자', worldAct: '안개가 짙어져 밤 시장이 골목을 삼키자',
      caughtAct: '경비대가 붙잡은 중개인 입에서 밤 시장 자리가 새자',
      caughtNews: { cat: '사건', text: '경비대, 안개 상단 중개인 붙잡아… "밤 시장 자리 캐냈다"' },
      fall: '안개 상단의 밤 시장은 걷혔다 — 계약서의 글씨가 안개처럼 흐려졌다',
      win: { vars: { demon_influence: 3 } },
      scenes: [
        { id: 'tk_rt_mist', late: true, who: { look: 'stranger', name: '흐린 얼굴의 중개인', race: '안개 상인', job: '안개 상단 중개인', faction: 'demon', portrait: '📜' },
          summary: '안개 상단 — 밤 시장을 넓힌다, 내일 해 진 뒤 물약 6',
          open: '안개 상단이오.', plea: '안개 낀 밤 시장이 커지고 있소. 계약한 가게가 채워 줘야 하오.', ask: '내일 해 진 뒤 물약 여섯 병. 값은 넉넉히, 금화로.',
          yesReply: '계약서에 한 줄 더 적어 두겠소.', noLabel: '이번엔 못 대겠소', noReply: '…안개는 기다리는 데 익숙하오.',
          mutter: '…중개인을 돌려보내면, 안개 낀 밤 시장에 이 가게 자리는 없다.', noEffects: { vars: { rel_demon: -2 } },
          report: '…경비대에 알리면 밤 시장 자리가 샌다. 안개 쪽 문은 영영 닫히겠지.',
          reportDetail: '안개 상단 중개인이었소. 밤 시장 자리를 캐냈소.',
          cart: { item: 'potion', qty: 6, mult: 1.3, onSell: { vars: { demon_influence: 2, rel_demon: 1 } },
            lines: { sold: '(금화가 조금 차갑다) 안개가 기억하오.', partial: '이것도 받겠소.', refused: '…계약은 계약이오.' } } },
      ],
    },
    {
      id: 'powder', name: '천둥의 시대', tag: '소금까마귀 해적단', cat: '사건', endings: ['thunder_age'], close: 'closed_powder', hostile: true, rel: 'rel_pirate',
      live: { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }, { noFlag: 'powder_reported_late' }, { sold: { faction: 'pirate', item: 'black_powder', min: 3, trades: true } }] },
      score: x => x.sold('pirate', { item: 'black_powder' }, true) / 3 + (x.f('powder_age') ? 3 : 0),
      power: x => x.v('pirate_power') * 2,
      appeal: 'tk_rt_powder',
      threat: '소금까마귀 해적단이 항구마다 화약을 사 모은다',
      act: '소금까마귀 함대가 가게 화약으로 대포를 채우자', worldAct: '해적 함대가 제 화약으로 항구를 휩쓸자',
      caughtAct: '경비대가 붙잡은 선장 입에서 화약 창고 자리가 새자',
      caughtNews: { cat: '사건', text: '경비대, 소금까마귀 선장 붙잡아… "화약 창고 캐냈다"' },
      fall: '소금까마귀 함대는 먼바다로 물러났다 — 천둥은 이 항구에서 울리지 않는다',
      win: { vars: { pirate_power: 3 } },
      scenes: [
        { id: 'tk_rt_powder', who: { look: 'pirate_captain', name: '선장 모르웬', race: '인간', job: '소금까마귀 해적단 선장', faction: 'pirate', portrait: '🏴‍☠️' },
          summary: '소금까마귀 해적단 — 대포를 채운다, 내일 화약 6통',
          open: '모르웬이다.', plea: '함대가 대포를 싣고 있다. 칼의 시대는 끝났어.', ask: '내일 화약 여섯 통.',
          yesReply: '좋아. 천둥은 네 편이다.', noLabel: '화약은 못 대겠소', noReply: '뭍사람은 겁이 많군.',
          mutter: '…해적을 돌려보내면, 천둥은 이 항구에서 울리지 않겠지.', noEffects: { vars: { rel_pirate: -2 } },
          report: '…경비대에 알리면 화약 창고가 샌다. 바다 쪽 문은 영영 닫히겠지.',
          reportDetail: '소금까마귀 해적단 선장이었소. 화약 창고를 캐냈소.',
          cart: { who: { look: 'pirate', name: '포수 쿨', race: '인간', job: '소금까마귀 포수', faction: 'pirate', portrait: '🏴‍☠️' },
            greet: '선장이 보냈다. {item} {qty}통, {offer}G.', item: 'black_powder', qty: 6, mult: 1.2, onSell: { vars: { pirate_power: 2 } },
            lines: { sold: '(통을 굴린다) 쾅, 하는 소리 기대해.', partial: '이것도 챙긴다.', refused: '어제는 된다며.' } } },
      ],
    },
    // ── meta: 충돌의 한쪽으로 나오지 않는다 — 플레이어가 충돌에 어떻게 댔는지로만 닫힌다 (js/systems/Clash.js resolve) ──
    {
      id: 'balance', name: '균형의 수호자', tag: '천칭단', meta: true, endings: ['balance_keeper'], close: 'closed_balance',
      live: { all: [{ flag: 'liga_member' }, { noFlag: 'liga_failed' }] },
      score: x => 3 - x.v('liga_warnings'),
      fall: '카운터 밑 소라껍데기가 조용해졌다 — 천칭단은 한쪽 접시에만 물건을 얹은 가게를 떠났다',
    },
    {
      id: 'double', name: '박쥐', tag: '양쪽에 판 가게', meta: true, endings: ['double_dealer'], close: 'closed_double',
      live: { any: [
        { all: [{ any: [{ flag: 'demon_war' }, { flag: 'demonlord_victory' }, { flag: 'demonlord_repelled' }] }, { any: [{ flag: 'demonlord_pact' }, soldW('demonlord', 8)] }] },
        { all: [{ any: [{ flag: 'war' }, { flag: 'goblin_victory' }, { flag: 'kingdom_victory' }] }, soldW('goblin', 20), soldW('kingdom', 20)] },
      ] },
      score: x => Math.min(x.sold('goblin'), x.sold('kingdom')) / 10 + x.sold('demonlord') / 10,
      fall: '"그 집은 결국 한쪽 편에 섰다" — 양쪽에 각인을 찍던 장사는 거기까지였다',
    },
  ];
  // 인과로 이어진 쌍 (docs/DESIGN_CONVERGENCE.md §3 ★ 연결과 3.4b) — 짝 고르기에서 가산
  WS.data.routeLinks = [
    ['court', 'kingdom'], ['court', 'night'], ['court', 'goblin'], ['court', 'dragon'], ['court', 'undead'], ['court', 'mist'], ['court', 'golem'], ['court', 'dwarf'],
    ['kingdom', 'goblin'], ['kingdom', 'demonlord'], ['kingdom', 'knight'], ['kingdom', 'powder'],
    ['knight', 'goblin'], ['goblin', 'dragon'], ['goblin', 'demonlord'], ['goblin', 'golem'], ['goblin', 'fairy'],
    ['dragon', 'dwarf'], ['dragon', 'golem'], ['dwarf', 'fairy'], ['golem', 'fairy'], ['golem', 'dwarf'],
    ['demonlord', 'mist'], ['demonlord', 'night'], ['demonlord', 'undead'], ['night', 'undead'], ['undead', 'mist'], ['powder', 'dwarf'],
  ];

  // 줄기 블록 → 대화 손님 · 사러 오는 수레 · 경비대 사건
  (() => {
    const R = WS.data.routes.filter(r => !r.meta);
    const rtReport = (r, mutter) => ({
      id: 'report', label: '(돌려보내고, 까마귀로 경비대에 알린다)', mutter, when: { gold: { gte: FEE } }, reply: '…후회하게 될 거요. (서둘러 나간다)',
      effects: { gold: -FEE, flags: [`tk_rt_${r.id}_reported`], schedule: [{ event: `tk_rt_${r.id}_caught_ev`, inDays: 1 }] },
    });
    for (const r of R) {
      if (r.hostile) E.push({
        id: `tk_rt_${r.id}_caught_ev`, trigger: 'scheduled', priority: 87,
        effects: { gold: 60, flags: [`tk_rt_${r.id}_caught`], vars: { reputation: 2, rel_kingdom: 1, [r.rel]: -3, collusion: 2, report_hits: 1 } },
        news: { ...r.caughtNews, big: true },
      });
      for (const sc of r.scenes) {
        const others = R.filter(o => o.id !== r.id);
        const line = (plea, o) => `${sc.open} ${o ? o.threat + '. ' : ''}${plea} ${sc.ask}`;
        const pleas = (sc.pleaWhen || []).concat([{ when: null, text: sc.plea }]);
        const greetWhen = [];
        pleas.forEach(pv => others.forEach(o => greetWhen.push({ when: pv.when ? { all: [pv.when, { flag: `tk_clvs_${r.id}_${o.id}` }] } : { flag: `tk_clvs_${r.id}_${o.id}` }, text: line(pv.text, o) })));
        (sc.pleaWhen || []).forEach(pv => greetWhen.push({ when: pv.when, text: line(pv.text) }));
        const cartId = `${sc.id}_cart`;
        // 이 짝(r ↔ o)이 "지금" 부딪치는 중이고(tk_clvs_r_o — 이 충돌이 살아있는 동안만 참) 그 상대가 이미 예라고 했나 (tk_rt_o_yes).
        //   전엔 전역 플래그 tk_cl_yes 하나로 봤는데, 두 충돌이 동시에 도는 동안(js/systems/Clash.js 동시 진행)엔
        //   서로 다른 짝의 "예"가 섞여 버린다 — 그래서 짝마다 따로 본다 (tk_clvs_* 는 그 충돌이 열려 있는 동안만 선다)
        const partnerYes = { any: others.map(o => ({ all: [{ flag: `tk_clvs_${r.id}_${o.id}` }, { flag: `tk_rt_${o.id}_yes` }] })) };
        const yes = extra => ({ label: '내일 준비해 두겠소', reply: sc.yesReply, effects: { flags: [`tk_rt_${r.id}_yes`], spawn: [{ customer: cartId, inDays: 1 }] }, ...extra });
        C.push({
          id: sc.id, ...sc.who, kind: 'talk', spawn: { queuedOnly: true }, late: !!sc.late,
          ...(r.hostile ? { suspicious: true, caughtFlag: `tk_rt_${r.id}_caught`, onReport: { flags: [`tk_rt_${r.id}_caught`] }, reportDetail: sc.reportDetail } : {}),
          summary: sc.summary, greet: line(sc.plea), greetWhen,
          choices: [
            yes({ id: 'yes', when: { not: partnerYes } }),
            // 상대 쪽에 이미 예라고 했으면 한 번 더 묻는다 (둘 다 채우면 양쪽 다 의심한다 — 박쥐의 재료)
            yes({ id: 'yes2', when: partnerYes,
              follow: { say: '저쪽 사람도 다녀갔다지. 양쪽에 다 대면 양쪽 다 이 가게를 의심할 거요. 누구 수레를 채울 거요?',
                choices: [
                  { id: 'ours', label: '이쪽 수레를 채우겠소', reply: '그 말, 믿겠소. 저쪽 수레가 오면 돌려보내시오.', effects: { flags: [`tk_rt_${r.id}_pledged`] } },
                  { id: 'both', label: '둘 다 채우겠소', mutter: '…양쪽에 다 대면 양쪽 다 이 가게를 믿지 않겠지. 박쥐라는 말이 따라붙는다.', reply: '…장사꾼답군. 두고 보겠소.', effects: {} },
                ] } }),
            { id: 'no', label: sc.noLabel, mutter: sc.mutter, reply: sc.noReply, effects: sc.noEffects || {} },
            ...(r.hostile ? [rtReport(r, sc.report)] : []),
          ],
        });
        const cw = sc.cart.who || sc.who;
        C.push({
          id: cartId, ...cw, spawn: { queuedOnly: true }, late: !!sc.late,
          greet: sc.cart.greet || '어제 말한 물건이오. {item} {qty}개, {offer}G.',
          request: { item: sc.cart.item, qty: sc.cart.qty, offer: { mult: sc.cart.mult }, partialOk: true },
          lines: sc.cart.lines,
          onSell: { ...sc.cart.onSell, flags: [`tk_rt_${r.id}_sup`].concat((sc.cart.onSell && sc.cart.onSell.flags) || []) },
          onRefuse: { vars: r.rel ? { [r.rel]: -1 } : {} },
        });
      }
    }
  })();

  // 전시 섭정 — 두 후계자가 이틀에 걸쳐 온다
  E.push({
    id: 'tk_regency_bid', once: true, priority: 64,
    when: { all: [{ flag: 'regency_war' }, { flag: 'interregnum' }, { noFlag: 'crowned' }, { noFlag: 'closed_court' }, { realDay: { lte: 28 } }] }, // 섭정 회의(21~22일)가 "전쟁이 먼저"를 고른 날
    effects: { spawn: [{ customer: 'tk_war_ald', inDays: 0 }, { customer: 'tk_war_ser', inDays: 1 }] },
    news: { cat: '왕국', text: '섭정 회의 "전시 섭정"… 두 후계자, 서부 토벌 물자 누가 대느냐로 겨룬다' },
  });

  // 왕좌가 먼저 (섭정 회의 — ⑤ tk_rg_decide 의 regency_court) — 두 후계자 측근이 대관식 몫을 주문하러 온다 (왕자: 창 / 공주: 물약)
  E.push({
    id: 'tk_court_bid', once: true, priority: 64,
    when: { all: [{ flag: 'regency_court' }, { flag: 'interregnum' }, { noFlag: 'crowned' }, { noFlag: 'closed_court' }, { realDay: { lte: 28 } }] },
    effects: { spawn: [{ customer: 'tk_rt_court_ald', inDays: 0 }, { customer: 'tk_rt_court_ser', inDays: 1 }] },
    news: { cat: '왕국', text: '"왕좌가 먼저" — 두 후계자 측근들, 도성 무기점과 약방을 돌며 대관식 몫을 주문' },
  });

  // ═════════════════════════ ⑤ 섭정 회의 (실제 21~22일) · 밀리는 쪽의 부름 (25일) ═════════════════════════
  // 21~22일 새벽 js/systems/Clash.js regency() 가 그때 왕관을 가장 위협하는 적(regencyEnemies — 고블린 · 검은 군단 · 전투단 · 도적단, 용은 적 세력이 아니라 뺀다)을 고르고
  //   같은 날 재상(먼저) → 서부 경비대장(해 질 녘)을 부른다. 이틀 뒤 새벽 tk_rg_decide 가 가게가 실제로 한 일로 정한다:
  //   경비대장에게 칼을 팔았다 → "전쟁이 먼저"(regency_war): 그 적을 소탕한다 — 왕국군(+ 가게 칼)이 적보다 세면 성공, 적의 줄기가 닫힌다(까닭 기사) / 모자라면 실패, 적이 기세를 얻는다
  //   안 팔았다 → "왕좌가 먼저"(regency_court): 두 후계자 다툼이 짙어진다 (tk_court_bid)
  //   재상에게 약속하고 칼을 팔았으면 재상이, 경비대장 편을 들고도 칼을 안 팔았으면 경비대장이 기억한다 (관계 − · 기사 한 줄)
  WS.data.regencyEnemies = [
    { id: 'goblin', name: '서부 숲 고블린 부족', short: '숲의 부족들', v: 'goblin_power', close: 'closed_goblin', rel: 'rel_goblin', gone: ['goblin_victory', 'kingdom_victory'],
      threat: x => x.v('goblin_power') + (x.f('war') ? 20 : 0), sig: x => x.f('war') || x.v('goblin_power') >= 40,
      hit: { goblin_power: -15, goblin_unity: -6, border_tension: -8, rel_goblin: -3 }, gain: { goblin_power: 5, border_tension: 4, kingdom_morale: -3 },
      won: '서부 경비대, 이 거리 칼을 들고 숲의 부족들을 소탕… 부족 연합은 흩어져 숲 깊이 물러났다. 서부 숲에 고블린의 깃발은 서지 않는다',
      lost: '서부 경비대의 숲 소탕 실패… 부족들은 매복으로 되받아쳤다, 서부 초소 둘 불타' },
    { id: 'demonlord', name: '북부의 검은 군단', short: '검은 군단', v: 'demonlord_power', close: 'closed_demonlord', rel: 'rel_demonlord', gone: ['demonlord_victory', 'demonlord_repelled'],
      threat: x => x.v('demonlord_power') + (x.f('demon_war') ? 20 : 0), sig: x => x.f('demon_war') || x.v('demonlord_power') >= 40,
      hit: { demonlord_power: -15, invasion_risk: -12, rel_demonlord: -3 }, gain: { demonlord_power: 5, invasion_risk: 5, kingdom_morale: -3 },
      won: '왕국군, 이 거리 칼을 들고 북부 국경의 검은 선봉을 쓸어 냈다… 검은 깃발은 황무지 너머로 물러났다',
      lost: '북부 소탕 실패… 검은 선봉이 요새 앞에서 버텼다, 왕국군 퇴각' },
    { id: 'warband', name: '잿빛 엄니 전투단', short: '오크 전투단', v: 'warband_power', close: null, rel: 'rel_orc',
      threat: x => x.v('warband_power') * 2, sig: x => x.v('warband_power') >= 20,
      hit: { warband_power: -10, monster_pop: -2 }, gain: { warband_power: 4, border_tension: 2 },
      won: '서부 경비대, 이 거리 칼을 들고 골짜기의 오크 전투단을 몰아냈다… 약탈 천막이 걷혔다',
      lost: '오크 전투단 소탕 실패… 골짜기에서 경비대가 되레 쫓겨났다' },
    { id: 'bandit', name: '가도의 도적단', short: '도적단', v: 'bandit_power', close: null, rel: 'rel_bandit',
      threat: x => x.v('bandit_power') * 2, sig: x => x.v('bandit_power') >= 20,
      hit: { bandit_power: -10, trade_routes: 4 }, gain: { bandit_power: 4, trade_routes: -3 },
      won: '서부 경비대, 이 거리 칼을 들고 가도의 도적 소굴을 쓸어 냈다… 상인 마차가 다시 달린다',
      lost: '도적 소탕 실패… 경비대가 숲길에서 길을 잃었다, 도적들은 더 대담해졌다' },
  ];
  const chanBase = { look: 'noble_lord_alberic', name: '재상 알베릭', race: '인간', job: '섭정 회의 재상', faction: 'noble', portrait: '📜',
    affil: { claim: 'royal', seal: 'real', sealOf: 'royal', line: '섭정 회의 재상이네. 왕실 인장일세.' } };
  const capBase = { look: 'knight_official_hart', name: '서부 경비대장 하르트', race: '인간', job: '서부 국경 초소 경비대장', faction: 'kingdom', portrait: '🛡️' };
  C.push({
    id: 'tk_rg_chancellor', ...chanBase, kind: 'talk', spawn: { queuedOnly: true },
    summary: '섭정 회의 재상 — 곧 올 서부 경비대장을 "내사가 먼저"라며 돌려보내 달라',
    greet: '급하네. 곧 서부 경비대장이 올 걸세. 칼을 사러. 내사가 먼저라고 거절해 주게. 왕의 자리가 언제까지 비어 있을 순 없네.',
    choices: [
      { id: 'promise', label: '그러겠소. 내사가 먼저요', reply: '고맙네. 섭정 회의는 이 가게를 기억할 걸세.', effects: { flags: ['tk_rg_promised'] } },
      { id: 'war', label: '경비대장 말도 들어 보겠소', mutter: '…칼을 팔면 섭정 회의는 전쟁부터 한다. 왕좌 다툼은 전쟁의 공과로 갈리겠지.',
        reply: '…그 칼이 왕좌를 또 미루게 될 걸세.', effects: { flags: ['tk_rg_heard_war'] } },
    ],
  });
  for (const en of WS.data.regencyEnemies) {
    C.push({
      id: `tk_rg_captain_${en.id}`, ...capBase, late: true, spawn: { queuedOnly: true },
      greet: `재상이 다녀갔다지. 왕은 결국 정해지오. 지금은 ${en.short}을(를) 소탕하는 게 먼저요. 소탕하지 않으면 위험하오. {item} {qty}자루, {offer}G.`,
      greetWhen: [{ when: { flag: 'tk_rg_mild' }, text: `재상이 다녀갔다지. 왕은 결국 정해지오. 아직 크지는 않지만, ${en.short}은(는) 왕좌가 빈 틈을 노리오. 지금 쳐 두는 게 먼저요. {item} {qty}자루, {offer}G.` }],
      request: { item: 'iron_sword', qty: 10, offer: { mult: 1 }, partialOk: true },
      lines: { sold: `이 칼로 ${en.short}부터 치겠소. 섭정 회의엔 "전쟁이 먼저"라 올리겠소.`, partial: '모자라도 소탕대는 나가오.', refused: '…내사가 먼저라. 섭정 회의에 그대로 전하겠소.' },
      extraChoices: [{ id: 'internal', label: '내사가 먼저요', ends: true, reply: '…왕좌부터라. 그사이 적이 기다려 줄지는 모르겠소.', effects: { flags: ['tk_rg_refused'] } }],
      onSell: { flags: ['tk_rg_sold'], vars: { kingdom_power: 4 } },
      onRefuse: { flags: ['tk_rg_refused'] },
    });
  }
  E.push({
    id: 'tk_rg_decide', trigger: 'scheduled', priority: 89,
    effects: {
      if: [
        { when: { all: [{ flag: 'tk_rg_promised' }, { flag: 'tk_rg_sold' }] },
          then: { vars: { rel_noble: -2 }, news: [{ cat: '왕국', text: '재상 알베릭, "약속을 어긴 가게"라며 섭정 회의 납품 명부에서 한 이름을 지웠다는 소문' }] } },
        { when: { all: [{ flag: 'tk_rg_heard_war' }, { noFlag: 'tk_rg_sold' }] },
          then: { vars: { rel_kingdom: -2 }, news: [{ cat: '왕국', text: '서부 경비대장 하르트, "말만 앞선 가게"라며 초소 납품처를 바꿨다는 소문' }] } },
      ],
    },
    outcomes: WS.data.regencyEnemies.flatMap(en => [
      { when: { all: [{ flag: 'tk_rg_sold' }, { flag: `tk_rg_enemy_${en.id}` }, { cmp: ['kingdom_power', '>=', en.v] }] },
        effects: { flags: ['regency_war', 'tk_rg_swept'].concat(en.close ? [en.close] : []), vars: en.hit },
        news: { cat: '속보', text: `섭정 회의 "전쟁이 먼저다" — ${en.won}`, big: true } },
      { when: { all: [{ flag: 'tk_rg_sold' }, { flag: `tk_rg_enemy_${en.id}` }] },
        effects: { flags: ['regency_war', 'tk_rg_sweep_failed'], vars: en.gain },
        news: { cat: '속보', text: `섭정 회의 "전쟁이 먼저다" — ${en.lost}. 왕관은 전쟁의 공과로 가른다`, big: true } },
    ]).concat([
      { effects: { flags: ['regency_court'] },
        news: { cat: '왕국', text: '섭정 회의 "왕좌가 먼저다" — 서부 경비대장은 빈손으로 돌아갔다, 대관식까지 두 후계자 다툼에 힘을 싣는다', big: true } },
    ]),
  });

  // 25일 — 형세가 드러나면 밀리는 후계자 쪽이 가게를 부른다. 공주가 밀리면 안개 상단과, 왕자가 밀리면 붉은 늑대 용병단과 손잡았다며.
  //   받으면 그 후계자 쪽 플래그가 켜지고 양쪽을 다 민 가게가 된다(tk_weak_joined — 「기회주의자」 쪽). 누가 왕관을 쓸지는 그 뒤의 장사(무기 → 알드릭 / 물약 → 세레나)가 가른다
  E.push({
    id: 'tk_weak_call', once: true, priority: 63,
    when: { all: [{ realDay: { gte: 25, lte: 27 } }, { flag: 'interregnum' }, { noFlag: 'crowned' }, { noFlag: 'closed_court' }] },
    outcomes: [
      { when: { var: 'succession', gt: 0 }, effects: { spawn: [{ customer: 'tk_weak_ser', inDays: 0 }] } },
      { when: { var: 'succession', lt: 0 }, effects: { spawn: [{ customer: 'tk_weak_ald', inDays: 0 }] } },
    ],
  });
  const weakJoin = '…한쪽에 선 가게가 다른 쪽에도 선다. 누가 왕관을 쓰든 둘 다 이 가게를 기억하겠지.';
  C.push(
    {
      id: 'tk_weak_ser', look: 'noble_lady_b', name: '하녀장 이젤', race: '인간', job: '세레나 공주 저택 하녀장', faction: 'noble', portrait: '🧺', kind: 'talk', spawn: { queuedOnly: true },
      summary: '세레나 공주파 — 밀리자 안개 상단과 손잡았다, 이 가게도 함께하자 (내일 물약)',
      greet: '섭정 회의가 왕자님 쪽으로 기울었어요. 그래서 공주님이 안개 상단과 손을 잡으셨어요. 밤 시장 물약 줄이 구호소로 이어져요. 이 가게도 함께해 주세요. 내일부터 물약을 대 주시면 돼요.',
      choices: [
        { id: 'join', label: '함께하겠소', mutter: weakJoin, reply: '고마워요. 내일 구호소 수레가 올 거예요.',
          effects: { flags: ['backed_serena', 'tk_weak_joined'], vars: { succession: -2, demon_influence: 2, rel_noble: 1 }, spawn: [{ customer: 'serena_relief_cart', inDays: 1 }] } },
        { id: 'no', label: '이미 한쪽에 섰소', reply: '…그래요. 대관식 날 다시 말해 보죠.', effects: {} },
      ],
    },
    {
      id: 'tk_weak_ald', look: 'mercenary_krogh', name: '용병 대리인 크로그', race: '인간', job: '알드릭 왕자파 뒷일꾼', faction: 'merc', trueFaction: 'noble', portrait: '🗝️', kind: 'talk', spawn: { queuedOnly: true },
      summary: '알드릭 왕자파 — 밀리자 붉은 늑대 용병단과 손잡았다, 이 가게도 함께하자 (내일 칼)',
      greet: '섭정 회의가 공주 쪽으로 기울었소. 그래서 왕자님이 붉은 늑대 용병단과 손을 잡으셨소. 용병 천막이 친위대가 됐소. 이 가게도 함께하시오. 내일부터 칼을 대 주면 되오.',
      choices: [
        { id: 'join', label: '함께하겠소', mutter: weakJoin, reply: '말이 통하는군. 내일 수레를 보내겠소.',
          effects: { flags: ['armed_aldric', 'tk_weak_joined'], vars: { succession: 2, merc_strength: 2, rel_merc: 1 }, spawn: [{ customer: 'tk_weak_ald_cart', inDays: 1 }] } },
        { id: 'no', label: '이미 한쪽에 섰소', reply: '그렇겠지. 대관식은 아직 안 끝났소.', effects: {} },
      ],
    },
    {
      id: 'tk_weak_ald_cart', look: 'mercenary', name: '붉은 늑대 용병', race: '인간', job: '알드릭 왕자 친위대가 된 용병', faction: 'merc', trueFaction: 'noble', portrait: '🐺', spawn: { queuedOnly: true },
      greet: '크로그가 보냈소. {item} {qty}자루, {offer}G.',
      request: { item: 'iron_sword', qty: 8, offer: { mult: 1.1 }, partialOk: true },
      lines: { sold: '왕자님 깃발 아래서 쓰겠소.', partial: '이것도 받아 가겠소.', refused: '어제는 함께한다더니.' },
      onSell: { vars: { succession: 3, merc_strength: 1 } },
    },
  );

  // ═════════════════════════ ③ 결말 길의 대가 ═════════════════════════
  // ───── 왕실 공식 무기상: 조달관 세 번 — 원가 납품 → 헌납 → 외상 ─────
  // 결말 kingdom_armory 는 royal_certified + rel_kingdom 12 (또는 crown_holds + crown_supplier). 세 번 다 받아 주면 관계 +9 · 인증.
  // 한 번 거절하면 다음 박자는 오지 않는다.
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

  // ═════════════════════════ ⑥ 정치적 결단 — 섭정 회의(재상 · 서부 경비대장, ⑤)와 같은 꼴을 다른 줄기에도 ═════════════════════════
  // 섭정 회의는 "판다/안 판다"가 그 자리에서 다른 세력의 형세를 흔들고 다른 줄기를 닫기도 하는 결단이었다 — 그 꼴을 서부 숲·재의 산·검은 깃발·
  // 청동심장 공방에도 하나씩 둔다. 여기서도 "판다"만으로 정해지는 게 아니라, 판 물자(칼/방패 수량)가 그대로 형세 변수에 실려 다음 충돌·엔딩까지 간다.
  // 결단마다 그 원인과 딴 줄기로 번지는 효과를 신문 한 줄로 남긴다 (docs/DESIGN_CONVERGENCE.md §3.0 규칙1).
  C.push(
    // ───── 서부 숲: 화친파 대 전쟁파 — 받아들이면 서부 전선이 식으며 고블린 줄기 자체가 닫히고(명예 고블린은 물 건너간다), 대신 용·섭정 회의 쪽 부담이 준다 ─────
    {
      id: 'tk_gb_truce', look: 'goblin_envoy', name: '화친파 사절 나락', race: '고블린', job: '서부 숲 화친파', faction: 'goblin', trueFaction: 'goblin', portrait: '🕊️', kind: 'talk',
      spawn: { when: { all: [goblinOpen, { realDay: { gte: 15, lte: 23 } }, { noFlag: 'goblin_truce' }, { noFlag: 'goblin_hardline' }] }, chance: 0.5 },
      summary: '서부 숲 화친파 — 전쟁파를 밀어내고 휴전을 청한다, 받을지 말지',
      greet: '즈락 패거리 말고 내 말도 들어 보라구. 전쟁파는 이기지도 못할 싸움에 부족을 다 건다구. 화친을 받아들이면 창을 거둔다구 — 대신 다시는 숲에 칼 대지 말라구.',
      choices: [
        { id: 'truce', label: '화친을 받아들이겠소', mutter: '…화친을 받으면 숲은 더 이상 왕국과 부딪치지 않는다. 대신 「명예 고블린」으로 가는 길은 여기서 끊긴다.',
          reply: '킥, 잘 골랐다구. 창은 광 속에 처박아 둔다구.',
          effects: { flags: ['goblin_truce', 'closed_goblin'], vars: { border_tension: -6, goblin_power: -5, kingdom_power: 2, dragon_stir: -2 } },
          news: { cat: '왕국', text: '서부 숲 화친파, 전쟁파를 밀어내고 창을 거뒀다… 국경 초소 병력 일부가 재의 산 쪽으로 옮겨 갔다' } },
        { id: 'war', label: '전쟁파 편을 들겠소', mutter: '…화친을 걷어차면 숲은 계속 왕국과 부딪친다. 서부는 더 뜨거워지겠지.',
          reply: '흥! 그럴 줄 알았다구. 전쟁파에 그대로 전한다구.',
          effects: { flags: ['goblin_hardline'], vars: { goblin_power: 4, border_tension: 5 } },
          news: { cat: '왕국', text: '서부 숲 화친파가 밀려나… 전쟁파가 다시 창을 벼린다' } },
      ],
    },
    // ───── 재의 산: 공개경보 대 조용한 격리 — 공개경보는 국경 병력을 도성으로 끌어와 서부(고블린)가 술렁이고, 격리는 서부는 그대로지만 소문이 낮게 오래 간다 ─────
    {
      id: 'tk_dr_alarm', look: 'noble_lord', name: '시장 대리 게런', race: '인간', job: '도성 관리', faction: 'kingdom', portrait: '📯', kind: 'talk',
      spawn: { when: { all: [{ flag: 'dragon_awake' }, { noFlag: 'dragon_alarm' }, { noFlag: 'dragon_contained' }] }, once: true },
      summary: '도성 관리 — 재의 산 용을 공개경보로 알릴지, 조용히 틀어막을지',
      greet: '용이 깼소. 공개경보를 울리면 사람들은 대비하겠지만 저잣거리는 사흘 얼어붙소. 조용히 틀어막으면 장사는 돌아가지만, 소문이 새면 더 나쁘오. 주인장 생각은 어떻소?',
      choices: [
        { id: 'alarm', label: '공개경보를 울리시오', mutter: '…경보를 울리면 국경 초소 병력까지 도성으로 끌어온다. 그사이 서부 숲이 빈틈을 노릴 것이다.',
          reply: '알겠소. 종을 울리겠소.', effects: { flags: ['dragon_alarm'], vars: { kingdom_morale: -4, economy: -6, kingdom_power: 3, border_tension: 3, goblin_power: 2 } },
          news: { cat: '속보', text: '재의 산 공개경보! 국경 초소 병력까지 도성으로… 서부 숲이 술렁인다' } },
        { id: 'contain', label: '조용히 틀어막으시오', mutter: '…조용히 덮으면 국경은 그대로 유지되지만, 소문은 낮게 오래 돈다. 용도 그만큼 오래 뒤척인다.',
          reply: '…알겠소. 입단속부터 하겠소.', effects: { flags: ['dragon_contained'], vars: { kingdom_morale: 1, economy: -1, dragon_stir: 1, demonlord_power: -1 } },
          news: { cat: '사건', text: '재의 산 소식, 조용히 덮었다… 서부 국경은 그대로, 낮은 소문만 오래 돈다' } },
      ],
    },
    // ───── 검은 깃발: 임시 동맹 제안 대 완강한 저항 — 동맹은 마왕군 압박을 줄이지만 그 틈에 고블린이 세를 불리고, 저항은 사기가 오르는 대신 북부는 그대로 팽팽하다 ─────
    {
      id: 'tk_dm_decision', look: 'demon_noble', name: '밀사 카일룬', race: '마족', job: '검은 군단 밀사', faction: 'demonlord', trueFaction: 'demonlord', portrait: '🕶️', kind: 'talk',
      spawn: { when: { all: [demonlordOpen, { realDay: { gte: 16, lte: 24 } }, { noFlag: 'demonlord_truce' }, { noFlag: 'demonlord_resist' }] }, chance: 0.5 },
      summary: '검은 군단 밀사 — 임시 동맹을 제안한다, 받을지 완강히 버틸지',
      greet: '폐하께서 잠시 창을 거두자 하신다. 임시 동맹이다. 받으면 이 거리는 당분간 조용하다. 거절하면… 폐하의 인내심은 길지 않다.',
      choices: [
        { id: 'ally', label: '임시 동맹을 받아들이겠소', mutter: '…동맹을 받으면 북부는 당분간 잠잠해진다. 하지만 그 틈에 서부 숲이 세를 불릴 것이다.',
          reply: '현명한 선택이다. 폐하께 그리 전하겠다.', effects: { flags: ['demonlord_truce'], vars: { demonlord_power: -3, invasion_risk: -4, goblin_power: 3, border_tension: 2 } },
          news: { cat: '왕국', text: '검은 군단과 임시 휴전… 그 틈에 서부 숲 부족이 세를 불린다는 소문' } },
        { id: 'resist', label: '완강히 저항하겠소', mutter: '…동맹을 걷어차면 폐하는 창을 거두지 않는다. 대신 왕국의 사기는 오른다.',
          reply: '…후회하게 될 거다.', effects: { flags: ['demonlord_resist'], vars: { demonlord_power: 2, invasion_risk: 3, kingdom_morale: 2 } },
          news: { cat: '왕국', text: '검은 군단의 동맹 제안을 걷어찼다… 왕국의 사기는 올랐지만 북부 국경은 여전히 팽팽하다' } },
      ],
    },
    // ───── 청동심장 공방: 전력투구 대 제한 생산 — 전력투구는 톱니의 시대를 앞당기지만 강철수염 광부와 요정 숲 양쪽에서 곡소리가 난다 ─────
    {
      id: 'tk_gl_allin', look: 'golem_smith', name: '공방장 헤파', race: '인간', job: '청동심장 공방장', faction: 'golem', trueFaction: 'golem', portrait: '⚙️', kind: 'talk',
      spawn: { when: { all: [{ any: [{ flag: 'golem_workshop' }, { flag: 'golem_army' }] }, { realDay: { gte: 14, lte: 26 } }, { noFlag: 'golem_allin' }, { noFlag: 'golem_limited' }] }, chance: 0.5 },
      summary: '청동심장 공방 — 전력투구할지, 생산을 자제할지',
      greet: '이대로 밀어붙이면 골렘을 곱절로 뽑아내겠소. 다만 광석은 강철수염 광산을, 숯은 요정 숲 가장자리를 더 파고들어야 하오. 밀어붙이리까, 자제하리까?',
      choices: [
        { id: 'allin', label: '전력투구하시오', mutter: '…전력투구하면 톱니의 시대는 성큼 다가온다. 대신 강철수염 광부와 요정 숲 양쪽이 등을 돌릴 것이다.',
          reply: '좋소. 광맥이랑 숲이랑, 남는 대로 다 쓰겠소.', effects: { flags: ['golem_allin'], vars: { golem_tech: 4, dwarf_tech: -3, fairy_grace: -3, rel_dwarf: -2, rel_fairy: -2 } },
          news: { cat: '드워프', text: '청동심장 공방이 전력투구… 강철수염 광부와 요정 숲 양쪽에서 곡소리' } },
        { id: 'limit', label: '생산을 자제시키시오', mutter: '…자제시키면 공방은 더디지만, 광산도 숲도 한숨 돌린다.',
          reply: '…알겠소. 무리는 안 하겠소.', effects: { flags: ['golem_limited'], vars: { golem_tech: 1 } },
          news: { cat: '드워프', text: '청동심장 공방, 생산을 자제… 광부도 숲도 한숨 돌린다' } },
      ],
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

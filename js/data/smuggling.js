// 밀수 — 도적단 장물아비 "장부" 닉스가 장물을 들여오고, 가게는 팔기만 한다 → 결말 「밀수왕」 (endings.js smuggle_king)
// 숫자는 config.smuggling, 장물함 처리는 js/systems/Stash.js. 이 파일은 config.js · customers.js · events.js · news.js 뒤에 읽혀야 한다.
//
//   암시장 활성도 ≥ unlock.blackmarket · 도적단과의 관계 ≥ unlock.rel_bandit → 닉스(smuggle_fence)
//     받는다 → 장물 한 짐이 장물함(state.stash)으로 — 가게 재고와 따로 / 거절 → retryDays 뒤 다시 온다
//   장물함 물건은 평소처럼 손님에게 건넨다 (일반 물건과 섞어도 된다). 한 거래의 장물 수로 적발을 굴린다 (config.smuggling.detect)
//     걸리면 → 장물 압수 · 벌금 · 평판 → smuggle_burned. 이튿날 닉스가 손을 뗀다(smuggle_fence_cut)
//   장물함이 비면 returnDays 뒤 다음 짐(smuggle_fence_return). 걸리지 않고 batchesForKing 짐을 비우면 암시장의 큰손(smuggle_bigshot)
//     받는다 → smuggle_king_accepted → 그날 밤 결말 「밀수왕」 (config.endNow) / 거절 → smuggle_king_declined, 닉스는 계속 온다
(() => {
  const C = WS.data.customers;
  const E = WS.data.events;
  const K = WS.data.config.smuggling;
  const NIX = { look: 'syndicate_boss', name: '"장부" 닉스', race: '인간', job: '검은 두건 도적단 장물아비', faction: 'bandit', portrait: '🕶️', kind: 'talk', suspicious: true };
  const BATCH = { tag: '장물 위탁', note: `칼·활·방패·물약 ${K.batch.total[0]}~${K.batch.total[1]}개 · 판 값은 전부 내 몫` };
  // 받으면 한 짐 — 장물함이 따로 생긴다. 닉스가 요령을 일러 준다 (적발 규칙)
  const take = (id, reply) => ({ id, label: '장물을 받는다', reply, effects: { stash: 'batch', flags: ['smuggle_route'], vars: { rel_bandit: 1 } } });
  const TIP = '장물함은 따로 둬. 왕국 쪽엔 한 개도 넘기지 말고, 한 손님한테 몰아 팔지도 마. 고블린은 안 찌르니까.';

  C.push(
    {
      id: 'smuggle_fence', ...NIX,
      spawn: { once: false, when: { all: [
        { var: 'blackmarket', gte: K.unlock.blackmarket }, { var: 'rel_bandit', gte: K.unlock.rel_bandit },
        { noFlag: 'smuggle_route' }, { noFlag: 'smuggle_burned' }, { since: { flag: 'smuggle_declined', days: K.retryDays } },
      ] } },
      ask: BATCH,
      greet: '우리가 물건을 들여올 테니, 넌 팔기만 해.',
      choices: [
        take('accept', TIP),
        { id: 'decline', label: '거절한다', reply: '마음이 바뀌면 또 들르지.', effects: { flags: ['smuggle_declined'] } },
      ],
    },
    {
      // 장물함이 걸리지 않고 비면 (Stash.emptied) — 다음 짐
      id: 'smuggle_fence_return', ...NIX,
      spawn: { queuedOnly: true },
      ask: BATCH,
      greet: '장물함 비었다며? 다음 짐이다.',
      choices: [
        take('accept', '늘 하던 대로. 왕국 쪽 손님은 조심해.'),
        { id: 'later', label: '이번엔 쉬겠소', reply: '며칠 뒤에 다시 오지.', effects: { spawn: [{ customer: 'smuggle_fence_return', inDays: K.retryDays }] } },
      ],
    },
    {
      // 장물을 팔다 걸린 이튿날 (config.smuggling.bust)
      id: 'smuggle_fence_cut', ...NIX,
      spawn: { queuedOnly: true },
      ask: { tag: '거래 끊김', note: '남은 장물은 압수됐다 · 밀수 길 끝' },
      greet: '꼬리 밟힌 가게랑은 일 안 해.',
      choices: [
        { id: 'ok', label: '…알겠소', reply: '(닉스가 뒷문으로 사라진다)' },
      ],
    },
    {
      // 걸리지 않고 batchesForKing 짐을 비웠을 때 — 받으면 그날 밤 결말 「밀수왕」
      id: 'smuggle_bigshot', look: 'smuggle_lord', name: '암시장의 큰손', race: '인간', job: '두건 밑으로 금반지가 번쩍인다', faction: 'traveler', trueFaction: 'bandit', portrait: '💰', kind: 'talk',
      spawn: { queuedOnly: true },
      suspicious: true,
      ask: { tag: '밀수왕 제안', note: '받으면 오늘 밤으로 가게 장사는 끝' },
      greet: '밀수왕이 되어 보지 않겠소?',
      choices: [
        { id: 'accept', label: '밀수왕이 된다', reply: '오늘 밤부터 이 가게 뒷문은 우리 것이오.', effects: { flags: ['smuggle_king_accepted'] } },
        { id: 'decline', label: '가게 주인으로 남겠소', reply: '아깝군. 닉스는 계속 보내 주지.', effects: { flags: ['smuggle_king_declined'], spawn: [{ customer: 'smuggle_fence_return', inDays: 3 }] } },
      ],
    },
  );

  E.push(
    {
      id: 'smuggle_route_news', once: true, priority: 40,
      when: { flag: 'smuggle_route' },
      news: { cat: '사건', text: '뒷골목에 출처 없는 칼·진주 다시 돌아… 경비대 "장물 신고하라"' },
    },
  );

  WS.data.ambientNews.push(
    { id: 'amb_stolen_goods', cat: '사건', text: '경비대, 도난품 목록 상점가에 돌려… "칼 한 자루도 대조한다"', when: { all: [{ flag: 'smuggle_route' }, { noFlag: 'smuggle_burned' }] }, weight: 2, cooldown: 4 },
  );
})();

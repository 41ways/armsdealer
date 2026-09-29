// 행동 계측 — 판마다 "어떻게 플레이했나"를 숫자로만 센다 (도덕 성향·꼼꼼함·신중함 같은 분석 재료).
// 값은 state.tele (이름 → 횟수/초) 와 state.teleLat (손님 틀 → 결정까지 걸린 초) 에 쌓이고, 저장에 그대로 들어간다.
// 판이 끝날 때 RunLog 가 익명 요약에 실어 보낸다. 개인을 가려낼 내용은 없다.
// 이름은 [a-z0-9_] — 워커의 키 규칙과 같다. 새 계측을 더하면 stats/README.md 의 변수표에도 적을 것.
WS.sys.Tele = (() => {
  const S = () => WS.Game.state;
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : 0);
  const MAX_DT = 300; // 자리를 비운 손님은 결정 시간으로 치지 않는다

  function bump(k, n) {
    const st = S();
    if (!st || st.replay) return;
    const t = st.tele || (st.tele = {});
    t[k] = Math.round(((t[k] || 0) + (n == null ? 1 : n)) * 10) / 10;
  }

  // 손님이 카운터 앞에 선 순간
  function arrive(c) {
    if (!c) return;
    c.tShown = now();
    bump('customers');
    if (c.poor && !c.poor.done) bump('poor_seen');
  }

  // 손님 한 명의 일이 끝난 순간 — 도착부터 결정까지. 대화 손님(talk)은 틀별로, 나머지는 결과별 평균을 낼 수 있게 합과 수를 둔다
  function decide(c, result) {
    const st = S();
    if (!st || st.replay || !c || !c.tShown) return;
    const dt = (now() - c.tShown) / 1000;
    if (!(dt > 0) || dt > MAX_DT) return;
    if (c.kind === 'talk') {
      const lat = st.teleLat || (st.teleLat = {});
      lat[c.tpl] = Math.round(dt * 10) / 10;
    } else {
      bump('dec_n_' + result);
      bump('dec_s_' + result, dt);
    }
  }

  // 1초마다 UI 가 부른다 — 화면이 보이고 최근에 손을 댄 때만 센다 (켜 두기만 한 시간은 뺀다)
  function tick() { bump('sec'); }

  return { bump, arrive, decide, tick };
})();

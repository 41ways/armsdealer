// 서류 확대경 대조 — 밀랍 인장 문장을 결정론적으로 그려서
// "규정집 원본"과 "손님이 내민 것"을 나란히 비교하는 미니게임의 렌더링 엔진.
// 그림은 외부 이미지 없이 SVG 문자열로 만든다.
//
// 세력마다 인장이 생김새부터 다르다: 테두리 모양(원·방패·팔각·육각·물결·가시), 테두리 무늬
// (글자·점·눈금·별·밧줄), 가운데 문장(왕관·떡갈잎·망치와 모루·밀 다발 …).
// 진짜(forged:false)는 항상 규정집 원본과 100% 같고, 위조(forged:true)는 딱 한 군데만 어긋난다
// — 점/눈금 하나 더·덜, 글자 하나 닮은꼴로 바뀜, 문장 좌우 뒤집힘, 잔무늬 하나 빠짐,
//   문장 속 개수(왕관 뾰족·꽃잎·톱니…) 하나 다름, 테두리 한 줄 빠짐/살짝 돌아감, 문장 살짝 기울어짐.
// 어느 것이 어긋날지는 forgeSeed(위조범)마다 결정론적으로 정해진다.
WS.sys.DocCheck = (() => {
  // 문자열 → 32bit 해시 (UIManager.hashHue 와 같은 계열의 결정론적 해시)
  function hashStr(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return (h ^= h >>> 16) >>> 0;
  }

  // mulberry32 결정론적 PRNG — 같은 시드면 항상 같은 수열
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ───────── SVG 조각 도우미 (viewBox 0..100, 가운데 50,50) ─────────
  const f = v => +v.toFixed(2);
  const polar = (a, r, cx = 50, cy = 50) => [f(cx + Math.sin(a * Math.PI / 180) * r), f(cy - Math.cos(a * Math.PI / 180) * r)];
  const pts = arr => arr.map(p => p.join(',')).join(' ');
  const E = (d, x = '') => `<path d="${d}" class="seal-em ${x}"/>`;          // 선
  const F = d => `<path d="${d}" class="seal-emf"/>`;                          // 채움
  const Ci = (x, y, r, fill, x2 = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" class="${fill ? 'seal-emf' : 'seal-em'} ${x2}"/>`;
  const Li = (x1, y1, x2, y2, x = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="seal-em ${x}"/>`;
  const G = (tr, s) => `<g transform="${tr}">${s}</g>`;

  // ───────── 문장들 — (n) → { core: [...], detail: [...] } ─────────
  // core 는 뼈대, detail 은 잔무늬(위조본에서 하나가 빠질 수 있다). 문장은 반지름 ~32 안에 그린 뒤 0.84배로 줄여 넣는다.
  const EMBLEMS = {
    // 왕국: 왕관 — 뾰족 n개, 끝마다 구슬, 띠에 보석
    crown: { n: 5, asym: false, fn: n => {
      const step = 36 / (n - 1), xs = Array.from({ length: n }, (_, i) => 32 + i * step);
      let d = 'M32 62 L32 38';
      for (let i = 0; i < n - 1; i++) d += ` L${f(xs[i] + step / 2)} 51 L${f(xs[i + 1])} 38`;
      d += ' L68 62 Z';
      return {
        core: [E(d), E('M32 62 H68 V69 H32 Z')],
        detail: [...xs.map(x => Ci(x, 34.5, 2.3, true)), F('M50 62.5 L53 65.5 L50 68.5 L47 65.5 Z'), Ci(40, 65.5, 1.3, true), Ci(60, 65.5, 1.3, true)],
      };
    } },
    // 국왕 직속: 작은 왕관(뾰족 n개, 끝마다 진주) 아래 엇갈린 두 홀 — 홀 머리는 백합꽃, 엇갈린 곳에 진주
    regalia: { n: 5, asym: false, fn: n => {
      const step = 28 / (n - 1), xs = Array.from({ length: n }, (_, i) => 36 + i * step);
      let d = 'M36 40 L36 26';
      for (let i = 0; i < n - 1; i++) d += ` L${f(xs[i] + step / 2)} 33 L${f(xs[i + 1])} 26`;
      d += ' L64 40 Z';
      // 백합 홀머리 — (x,y) 에서 a 도 기울어진 쪽을 향해
      const fleur = (x, y, a) => G(`translate(${x} ${y}) rotate(${a})`, F('M0 0 Q-2.4 -4.5 0 -9 Q2.4 -4.5 0 0 Z'));
      const curls = (x, y, a) => G(`translate(${x} ${y}) rotate(${a})`, E('M-0.6 -1.5 Q-4.6 -2.4 -5 -6.4') + E('M0.6 -1.5 Q4.6 -2.4 5 -6.4') + Li(-3.4, 0.6, 3.4, 0.6));
      return {
        core: [E(d), E('M36 40 H64 V45 H36 Z'), Li(31, 49, 69, 82, 'thick'), Li(69, 49, 31, 82, 'thick'), fleur(31, 49, -49), fleur(69, 49, 49)],
        detail: [...xs.map(x => Ci(x, 23.3, 1.9, true)), F('M50 40.2 L52.3 42.5 L50 44.8 L47.7 42.5 Z'), Ci(41.5, 42.5, 1.1, true), Ci(58.5, 42.5, 1.1, true),
          curls(31, 49, -49), curls(69, 49, 49), Ci(50, 65.5, 2.4, true), Ci(69, 82, 1.9, true), Ci(31, 82, 1.9, true)],
      };
    } },
    // 고블린: 비스듬한 떡갈잎 — 한쪽 잎맥 n개
    leaf: { n: 3, asym: true, fn: n => {
      const w = t => 12 * Math.sin(Math.PI * t) * (0.74 + 0.26 * Math.abs(Math.sin(Math.PI * 3 * t)));
      const R = [], L = [];
      for (let i = 0; i <= 36; i++) { const t = i / 36, y = 22 + 48 * t; R.push([f(50 + w(t)), f(y)]); L.unshift([f(50 - w(t)), f(y)]); }
      const tr = 'rotate(-28 50 50)';
      const veins = [];
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1), y = 22 + 48 * t, ww = w(t) * 0.72;
        veins.push(G(tr, Li(50, y + 4, 50 - ww, y - 2)), G(tr, Li(50, y + 4, 50 + ww, y - 2)));
      }
      return { core: [G(tr, `<polygon points="${pts([...R, ...L])}" class="seal-em"/>`), G(tr, Li(50, 24, 50, 80))], detail: veins };
    } },
    // 드워프: 망치와 모루 + 불똥
    hammer: { asym: true, fn: () => ({
      core: [F('M20 55 H72 V59 L65 61 H59 L62 71 H38 L41 61 H35 Q25 61 20 55 Z'), Li(61, 29, 41, 51, 'thick'), F('M57 20 L70 32 L65 38 L52 26 Z')],
      detail: [Li(36, 49, 33, 45), Li(41, 47, 40, 42), Li(31, 52, 27, 50)],
    }) },
    // 마을: 밀 다발 세 줄기 — 줄기마다 한쪽 낟알 n개
    wheat: { n: 4, asym: false, fn: n => {
      const core = [], detail = [];
      [-20, 0, 20].forEach(a => {
        const tr = `rotate(${a} 50 74)`;
        core.push(G(tr, Li(50, 74, 50, 34)));
        detail.push(G(tr, `<ellipse cx="50" cy="30.5" rx="1.8" ry="3.4" class="seal-emf"/>`));
        for (let k = 0; k < n; k++) {
          const y = 36 + k * 5.5;
          detail.push(G(tr, `<ellipse cx="47.4" cy="${y}" rx="1.8" ry="3.4" transform="rotate(-30 47.4 ${y})" class="seal-emf"/>`));
          detail.push(G(tr, `<ellipse cx="52.6" cy="${y}" rx="1.8" ry="3.4" transform="rotate(30 52.6 ${y})" class="seal-emf"/>`));
        }
      });
      core.push(E('M41 62 Q50 67 59 62'));
      return { core, detail };
    } },
    // 안개 상단: 소용돌이 안개 + 물결 두 줄 + 물방울
    mist: { asym: true, fn: () => {
      const p = [];
      for (let t = 0; t <= 11; t += 0.25) { const r = 1.2 + t * 1.35; p.push([f(50 + Math.cos(t) * r), f(44 + Math.sin(t) * r)]); }
      return {
        core: [`<polyline points="${pts(p)}" class="seal-em"/>`],
        detail: [E('M28 66 q4 -3.5 8 0 t8 0 t8 0 t8 0 t8 0'), E('M34 72 q4 -3.5 8 0 t8 0 t8 0 t8 0'), Ci(66, 30, 1.6, true), Ci(71, 37, 1.1, true), Ci(31, 33, 1.3, true)],
      };
    } },
    // 마왕군: 뿔 달린 해골 — 이빨 n개
    hornskull: { n: 4, asym: false, fn: n => {
      const teeth = [];
      for (let k = 1; k <= n; k++) { const x = 43 + 14 * k / (n + 1); teeth.push(Li(x, 59, x, 64)); }
      return {
        core: [E('M39 50 Q39 34 50 34 Q61 34 61 50 Q61 55 57 57 L57 64 L43 64 L43 57 Q39 55 39 50 Z'),
          F('M41 40 Q29 36 27 23 Q33 33 43 35 Z'), F('M59 40 Q71 36 73 23 Q67 33 57 35 Z')],
        detail: [Ci(45, 48, 3.2, true), Ci(55, 48, 3.2, true), F('M50 52 L48 56 H52 Z'), ...teeth],
      };
    } },
    // 요정: 나방 — 윗날개마다 점 n개
    moth: { n: 2, asym: false, fn: n => {
      const spots = [];
      for (let k = 0; k < n; k++) { const t = n === 1 ? 0.5 : k / (n - 1); const x = 31 + 9 * t, y = 36 + 8 * t, r = 2.6 - t; spots.push(Ci(x, y, f(r), true), Ci(100 - x, y, f(r), true)); }
      return {
        core: [`<ellipse cx="50" cy="52" rx="2.6" ry="13" class="seal-emf"/>`,
          E('M48 46 C38 28 24 26 22 36 C21 46 34 52 48 52 Z'), E('M52 46 C62 28 76 26 78 36 C79 46 66 52 52 52 Z'),
          E('M48 54 C38 54 30 60 32 68 C36 74 44 66 48 58 Z'), E('M52 54 C62 54 70 60 68 68 C64 74 56 66 52 58 Z')],
        detail: [E('M49 40 Q46 30 40 28'), E('M51 40 Q54 30 60 28'), ...spots, Ci(39, 64, 1.5, true), Ci(61, 64, 1.5, true)],
      };
    } },
    // 마법사 길드: n각 별 + 가운데 원 + 별 사이 점
    star: { n: 8, asym: false, rotsym: true, fn: n => {
      const p = [];
      for (let i = 0; i < n * 2; i++) p.push(polar(180 * i / n, i % 2 ? 11 : 27));
      return {
        core: [`<polygon points="${pts(p)}" class="seal-em"/>`, Ci(50, 50, 5, false)],
        detail: [Ci(50, 50, 1.8, true), ...Array.from({ length: n }, (_, i) => { const [x, y] = polar(180 * (2 * i + 1) / n, 24); return Ci(x, y, 1.4, true); })],
      };
    } },
    // 용병: 늑대 머리 옆얼굴 (왼쪽을 본다)
    wolf: { asym: true, fn: () => ({
      core: [E('M66 26 L62 38 L58 30 L54 40 Q42 40 34 48 L24 54 Q22 58 26 60 L38 60 Q40 66 48 68 Q56 76 70 74 Q76 60 72 44 Z')],
      detail: [E('M43 47 L50 45', 'thick'), Ci(25.5, 55.5, 1.9, true), Li(29, 60, 38, 58), E('M55 70 L59 63 L62 71 L66 64'), Li(62, 32, 63, 38)],
    }) },
    // 사냥꾼 조합: 사슴뿔 + 화살 — 뿔마다 가지 n개
    antler: { n: 3, asym: false, fn: n => {
      const q = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
      const beam = s => s < 1 ? [q(48, 36, 32, s), q(58, 56, 44, s)] : [q(32, 30, 26, s - 1), q(44, 36, 30, s - 1)];
      const tines = [];
      for (let k = 1; k <= n; k++) {
        const [bx, by] = beam(0.35 + 1.45 * k / (n + 1));
        tines.push(Li(bx, by, bx + 3, by - 8), Li(100 - bx, by, 100 - bx - 3, by - 8));
      }
      return {
        core: [Li(50, 76, 50, 27), F('M50 19 L55.5 29 L44.5 29 Z'), E('M48 58 Q36 56 32 44 Q30 36 26 30'), E('M52 58 Q64 56 68 44 Q70 36 74 30')],
        detail: [E('M50 70 L45 76 M50 70 L55 76'), E('M50 65 L45 71 M50 65 L55 71'), ...tines],
      };
    } },
    // 흡혈귀: 박쥐 — 날개 끝 물결 n개
    bat: { n: 3, asym: false, fn: n => {
      const wing = sx => {
        const X = x => f(sx ? 100 - x : x);
        const tip = [20, 38], root = [46, 55];
        let d = `M${X(46)} 46 Q${X(36)} 32 ${X(tip[0])} ${tip[1]}`;
        const bones = [];
        for (let k = 1; k <= n; k++) {
          const t = k / n, px = tip[0] + (root[0] - tip[0]) * t, py = tip[1] + (root[1] - tip[1]) * t;
          const t0 = (k - 0.5) / n, cx = tip[0] + (root[0] - tip[0]) * t0 + 2.5, cy = tip[1] + (root[1] - tip[1]) * t0 - 5;
          d += ` Q${X(cx)} ${f(cy)} ${X(px)} ${f(py)}`;
          if (k < n) bones.push(Li(sx ? 54 : 46, 47, sx ? 100 - px : px, py));
        }
        return { d: d + ' Z', bones };
      };
      const l = wing(false), r = wing(true);
      return {
        core: [E(l.d), E(r.d), `<ellipse cx="50" cy="51" rx="5" ry="9" class="seal-emf"/>`, Ci(50, 41, 4.5, true)],
        detail: [F('M46.5 39 L46 31.5 L49 37 Z'), F('M53.5 39 L54 31.5 L51 37 Z'), ...l.bones, ...r.bones],
      };
    } },
    // 사령술 교단: 해골과 엇갈린 뼈 — 이빨 n개
    skull: { n: 3, asym: false, fn: n => {
      const knob = (x, y, dx, dy) => [Ci(x + dy * 2.2, y - dx * 2.2, 2.4, true), Ci(x - dy * 2.2, y + dx * 2.2, 2.4, true)];
      const s = Math.SQRT1_2, teeth = [];
      for (let k = 1; k <= n; k++) { const x = 42 + 16 * k / (n + 1); teeth.push(Li(x, 57, x, 61)); }
      return {
        core: [Li(30, 34, 70, 74, 'thick'), Li(70, 34, 30, 74, 'thick'),
          E('M38 46 Q38 30 50 30 Q62 30 62 46 Q62 52 58 54 L58 60 Q50 63 42 60 L42 54 Q38 52 38 46 Z', 'seal-cut'),
          Ci(45, 45, 3.4, true), Ci(55, 45, 3.4, true)],
        detail: [...knob(30, 34, s, s), ...knob(70, 34, -s, s), ...knob(30, 74, s, -s), ...knob(70, 74, -s, -s), F('M50 49 L48.3 53 H51.7 Z'), ...teeth],
      };
    } },
    // 용: 발톱 — 비틀린 네 발톱 + 비늘
    claw: { asym: true, fn: () => ({
      core: [E('M40 24 Q50 20 60 24 L62 42 Q50 48 38 42 Z'), F('M47 44 Q46 60 52 72 Q50 58 53 45 Z'),
        F('M40 41 Q32 54 34 68 Q36 56 44 44 Z'), F('M57 44 Q66 52 68 64 Q62 54 54 45 Z'), F('M38 32 Q28 34 24 44 Q30 38 39 37 Z')],
      detail: [E('M43 30 q3 3 6 0'), E('M50 30 q3 3 6 0'), E('M46.5 36 q3 3 6 0')],
    }) },
    // 상인 길드: 저울 — 왼쪽 접시에 금화 한 닢
    scales: { asym: true, fn: () => ({
      core: [Li(50, 30, 50, 70), Li(40, 72, 60, 72, 'thick'), Li(28, 36, 72, 36),
        E('M28 36 L22 54 M28 36 L34 54'), E('M72 36 L66 54 M72 36 L78 54'), E('M20 54 Q28 62 36 54 Z'), E('M64 54 Q72 62 80 54 Z')],
      detail: [Ci(28, 51, 3, true), Ci(50, 28, 2.6, true), Li(44, 68, 56, 68)],
    }) },
    // 암시장: 쥐 옆모습 (오른쪽을 본다)
    rat: { asym: true, fn: () => ({
      core: [E('M30 58 Q30 44 46 42 Q56 40 62 46 L72 52 Q74 54 72 55 L62 58 Q56 64 44 64 Q32 64 30 58 Z'), Ci(57, 42, 3.6, false), E('M30 58 Q20 60 22 70 Q24 76 34 74')],
      detail: [Ci(65, 50, 1.3, true), Li(71, 54, 78, 51), Li(71, 55, 78, 58), Li(40, 64, 38, 68), Li(54, 64, 56, 68)],
    }) },
    // 대성당: 해 십자 — 햇살 n가닥
    sun: { n: 12, asym: false, rotsym: true, fn: n => ({
      core: [Ci(50, 50, 11, false), Li(50, 29, 50, 71), Li(29, 50, 71, 50)],
      detail: [Ci(50, 50, 2.2, true), ...Array.from({ length: n }, (_, i) => { const a = 180 * (2 * i + 1) / n; const [x1, y1] = polar(a, 15), [x2, y2] = polar(a, 25); return Li(x1, y1, x2, y2); })],
    }) },
    // 궁정 귀족: 장미 — 꽃잎 n장, 비대칭 잎 두 장
    rose: { n: 5, asym: true, fn: n => {
      const p = [];
      for (let i = 0; i < 120; i++) { const a = 360 * i / 120; p.push(polar(a, 10.5 + 3.2 * Math.cos(n * a * Math.PI / 180), 50, 43)); }
      return {
        core: [`<polygon points="${pts(p)}" class="seal-em"/>`, Ci(50, 43, 5, false), E('M50 57 Q48 66 50 77')],
        detail: [E('M50 43 m-2 0 a2 2 0 1 1 2 2'), F('M49 66 Q40 60 35 64 Q42 69 49 67 Z'), F('M50 61 Q60 55 65 59 Q58 63 50 63 Z'), Li(49.3, 71, 46, 72)],
      };
    } },
    // 도적단: 비스듬한 단검
    dagger: { asym: true, fn: () => {
      const tr = 'rotate(35 50 50)';
      return {
        core: [G(tr, E('M50 78 L45.5 45 H54.5 Z')), G(tr, Li(39, 45, 61, 45, 'thick')), G(tr, E('M48 45 V31 H52 V45'))],
        detail: [G(tr, Ci(50, 27.5, 3, true)), G(tr, Li(50, 49, 50, 68)), G(tr, Ci(39, 45, 1.7, true)), G(tr, Ci(61, 45, 1.7, true))],
      };
    } },
    // 오크 전투단: 양날 도끼 — 자루 감개 n줄
    axe: { n: 3, asym: false, fn: n => ({
      core: [Li(50, 22, 50, 78, 'thick'), E('M48 30 Q34 26 26 34 Q30 44 26 54 Q34 62 48 56 Z'), E('M52 30 Q66 26 74 34 Q70 44 74 54 Q66 62 52 56 Z')],
      detail: [Ci(43, 43, 1.5, true), Ci(57, 43, 1.5, true), F('M50 16 L53 23 H47 Z'), ...Array.from({ length: n }, (_, k) => Li(46.5, 63 + k * 4, 53.5, 63 + k * 4))],
    }) },
    // 해적: 닻 — 밧줄이 한쪽으로 감긴다
    anchor: { asym: true, fn: () => ({
      core: [Ci(50, 26, 4, false), Li(50, 30, 50, 72, 'thick'), Li(40, 37, 60, 37, 'thick'), E('M30 57 Q32 72 50 72 Q68 72 70 57')],
      detail: [F('M30 53 L25.5 62 L34.5 60 Z'), F('M70 53 L74.5 62 L65.5 60 Z'), Ci(39, 37, 1.8, true), Ci(61, 37, 1.8, true), E('M50 30 Q61 40 56 50 Q51 58 58 65')],
    }) },
    // 연금술 학회: 둥근 플라스크 — 거품 n개
    flask: { n: 3, asym: true, fn: n => {
      const B = [[45, 50, 1.8], [53, 46, 1.3], [48, 40, 1.1], [55, 52, 1.5], [51, 35, 0.9]];
      return {
        core: [E('M46 26 V41 A16 16 0 1 0 54 41 V26'), E('M35 59 Q42 55 50 59 Q58 63 65 59')],
        detail: [Li(43, 26, 57, 26, 'thick'), ...B.slice(0, n).map(([x, y, r]) => Ci(x, y, r, false))],
      };
    } },
    // 골렘 공방: 톱니바퀴 n개 + 가운데 심장
    gear: { n: 8, asym: false, fn: n => {
      const s = 360 / n, p = [];
      for (let i = 0; i < n; i++) { const a = s * i; p.push(polar(a - 0.28 * s, 19), polar(a - 0.16 * s, 25), polar(a + 0.16 * s, 25), polar(a + 0.28 * s, 19)); }
      return {
        core: [`<polygon points="${pts(p)}" class="seal-em"/>`, Ci(50, 50, 10, false), F('M50 55 L45 50 Q43 46 47 45 Q49 45 50 47 Q51 45 53 45 Q57 46 55 50 Z')],
        detail: [45, 135, 225, 315].map(a => { const [x, y] = polar(a, 14.5); return Ci(x, y, 1.4, true); }),
      };
    } },
    // 나그네: 나침반 별
    compass: { asym: false, fn: () => {
      const p = [];
      for (let i = 0; i < 8; i++) p.push(polar(45 * i, i % 2 ? 6 : 27));
      return {
        core: [`<polygon points="${pts(p)}" class="seal-em"/>`, Ci(50, 50, 15, false)],
        detail: [F(`M${polar(0, 27).join(' ')} L${polar(12, 6).join(' ')} L50 50 Z`), ...[45, 135, 225, 315].map(a => { const [x1, y1] = polar(a, 17), [x2, y2] = polar(a, 23); return Li(x1, y1, x2, y2); })],
      };
    } },
    // ???: 별 아래의 눈
    eye: { asym: false, fn: () => ({
      core: [E('M22 52 Q50 32 78 52 Q50 72 22 52 Z'), Ci(50, 52, 8, false), Ci(50, 52, 3.6, true)],
      detail: [-50, -25, 0, 25, 50].map(a => { const [x1, y1] = polar(a, 20, 50, 52), [x2, y2] = polar(a, 29, 50, 52); return Li(x1, y1, x2, y2); }),
    }) },
  };

  // 세력별 인장 규격 — rim: 테두리 모양(rn: 물결/가시 개수), border: 테두리 무늬, em: 문장
  const SPECS = {
    kingdom: { rim: 'round', border: { t: 'text', s: 'LVMEN·REGNVM·' }, em: 'crown' },
    // 국왕 직속 (세력이 아닌 인장 — factions.js WS.data.extraSeals.royal): 왕국 인장의 친척 — 글자 테두리는 같고, 바깥 테에 진주 rn 알
    royal: { rim: 'pearl', rn: 24, border: { t: 'text', s: 'DOMVS·REGIA·REX·' }, em: 'regalia' },
    goblin: { rim: 'scallop', rn: 9, border: { t: 'ticks', n: 18 }, em: 'leaf' },
    dwarf: { rim: 'oct', border: { t: 'dots', n: 16 }, em: 'hammer' },
    village: { rim: 'round', border: { t: 'dots', n: 24 }, em: 'wheat' },
    demon: { rim: 'scallop', rn: 14, border: { t: 'dots', n: 10 }, em: 'mist' },
    demonlord: { rim: 'shield', border: { t: 'ticks', n: 14 }, em: 'hornskull' },
    fairy: { rim: 'scallop', rn: 6, border: { t: 'stars', n: 6 }, em: 'moth' },
    mage: { rim: 'oct', border: { t: 'text', s: 'TVRRIS·ARGENTEA·' }, em: 'star' },
    merc: { rim: 'shield', border: { t: 'dots', n: 12 }, em: 'wolf' },
    hunter: { rim: 'round', border: { t: 'ticks', n: 24 }, em: 'antler' },
    vampire: { rim: 'hex', border: { t: 'text', s: 'NOX·AETERNA·' }, em: 'bat' },
    undead: { rim: 'round', border: { t: 'ticks', n: 13 }, em: 'skull' },
    dragon: { rim: 'spike', rn: 11, border: { t: 'dots', n: 14 }, em: 'claw' },
    guild: { rim: 'round', border: { t: 'text', s: 'LIBRA·AVREA·' }, em: 'scales' },
    church: { rim: 'scallop', rn: 20, border: { t: 'text', s: 'LVX·SANCTA·' }, em: 'sun' },
    noble: { rim: 'shield', border: { t: 'stars', n: 8 }, em: 'rose' },
    bandit: { rim: 'hex', border: { t: 'ticks', n: 12 }, em: 'dagger' },
    orc: { rim: 'spike', rn: 9, border: { t: 'ticks', n: 10 }, em: 'axe' },
    pirate: { rim: 'round', border: { t: 'rope', n: 40 }, em: 'anchor' },
    alchemist: { rim: 'hex', border: { t: 'dots', n: 18 }, em: 'flask' },
    golem: { rim: 'oct', border: { t: 'ticks', n: 16 }, em: 'gear' },
    traveler: { rim: 'round', border: { t: 'dots', n: 8 }, em: 'compass' },
    unknown: { rim: 'spike', rn: 12, border: { t: 'stars', n: 12 }, em: 'eye' },
  };

  // 글자 하나를 닮은꼴로 (위조범의 손버릇)
  const LOOKALIKE = { E: 'F', F: 'E', O: 'Q', C: 'G', G: 'C', R: 'P', P: 'R', V: 'U', N: 'M', M: 'N', T: 'I', I: 'T', L: 'I', A: 'Λ', B: 'R', X: 'K' };

  // ───────── 테두리 ─────────
  const SHIELD = 'M14 9 H86 L92 15 V48 C92 74 72 88 50 96 C28 88 8 74 8 48 V15 Z'; // 윗모서리를 깎아 둥근 밀랍 안에 들게
  function rimShape(rim, rn, scale, rot) {
    const tr = `translate(50 50) rotate(${rot || 0}) scale(${scale}) translate(-50 -50)`;
    const poly = p => `<polygon points="${pts(p)}" class="seal-rim" transform="${tr}"/>`;
    if (rim === 'shield') return `<path d="${SHIELD}" class="seal-rim" transform="${tr}"/>`;
    if (rim === 'oct') return poly(Array.from({ length: 8 }, (_, i) => polar(22.5 + 45 * i, 47)));
    if (rim === 'hex') return poly(Array.from({ length: 6 }, (_, i) => polar(60 * i, 48)));
    if (rim === 'scallop') return poly(Array.from({ length: 240 }, (_, i) => { const a = 360 * i / 240; return polar(a, 44 + 2.6 * Math.cos(rn * a * Math.PI / 180)); }));
    if (rim === 'spike') return poly(Array.from({ length: rn * 2 }, (_, i) => polar(180 * i / rn, i % 2 ? 42 : 47.5)));
    // 진주 테: 바깥 테 위에 진주 rn 알 (안쪽 테는 민 원)
    if (rim === 'pearl') {
      const ring = `<circle cx="50" cy="50" r="45" class="seal-rim"/>`;
      if (scale < 1) return `<g transform="${tr}">${ring}</g>`;
      return `<g transform="${tr}">${ring}${Array.from({ length: rn }, (_, i) => { const [x, y] = polar(360 * i / rn, 45); return `<circle cx="${x}" cy="${y}" r="1.9" class="seal-dot"/>`; }).join('')}</g>`;
    }
    return `<circle cx="50" cy="50" r="45.5" class="seal-rim" transform="${tr}"/>`;
  }

  // 테두리 무늬 반지름 — 물결·가시 테두리는 안쪽 선이 더 들어오므로 조금 안으로
  function borderMarks(b, v, rim) {
    const BR = rim === 'scallop' || rim === 'spike' ? 32.6 : 34.5;
    const out = [];
    if (b.t === 'text') {
      const chars = [...v.text], step = 360 / chars.length;
      chars.forEach((ch, i) => {
        const a = step * i, [x, y] = polar(a, BR);
        out.push(`<text x="${x}" y="${y}" transform="rotate(${f(a)} ${x} ${y})" class="seal-txt" text-anchor="middle" dominant-baseline="central">${ch}</text>`);
      });
    } else if (b.t === 'rope') {
      for (let i = 0; i < v.n; i++) { const a = 360 * i / v.n, [x1, y1] = polar(a, BR - 2.2), [x2, y2] = polar(a + 5, BR + 2.2); out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="seal-tick"/>`); }
    } else {
      for (let i = 0; i < v.n; i++) {
        const a = 360 * i / v.n;
        if (b.t === 'dots') { const [x, y] = polar(a, BR); out.push(`<circle cx="${x}" cy="${y}" r="1.5" class="seal-dot"/>`); }
        else if (b.t === 'ticks') { const [x1, y1] = polar(a, BR - 2.6), [x2, y2] = polar(a, BR + 2.6); out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="seal-tick"/>`); }
        else { const p = [polar(a, BR + 2.6), polar(a + 3, BR), polar(a, BR - 2.6), polar(a - 3, BR)]; out.push(`<polygon points="${pts(p)}" class="seal-dot"/>`); }
      }
    }
    return out.join('');
  }

  // ───────── 원본 규격 → 위조 변형 ─────────
  // 원본 모양 값(variant): 이 값들이 같으면 그림이 완전히 같다
  function baseVariant(spec) {
    const em = EMBLEMS[spec.em];
    return {
      text: spec.border.s || '', n: spec.border.n || 0, rn: spec.rn || 0, emN: em.n || 0,
      innerRim: true, rimRot: 0, mirror: false, emRot: 0, drop: -1,
    };
  }
  function mutateVariant(spec, base, seed) {
    const v = { ...base };
    const r = mulberry32(hashStr(String(seed) + '::forge:' + spec.em)); // 같은 위조범이라도 세력마다 어긋나는 곳이 다르게
    const em = EMBLEMS[spec.em];
    const nDetail = em.fn(v.emN || undefined).detail.length;
    const kinds = [];
    if (spec.border.t === 'text') kinds.push('smudge');
    else if (spec.border.t !== 'rope') kinds.push('count');
    if (nDetail) kinds.push('drop');
    if (em.asym) kinds.push('mirror');
    if (em.n) kinds.push('emN');
    kinds.push('rim');
    if (!em.rotsym) kinds.push('emRot');
    const type = kinds[Math.floor(r() * kinds.length)];
    const pm = r() < 0.5 ? -1 : 1;
    let detail = null;
    if (type === 'smudge') {
      const idx = [...v.text].map((ch, i) => (LOOKALIKE[ch] ? i : -1)).filter(i => i >= 0);
      const i = idx[Math.floor(r() * idx.length)];
      const chars = [...v.text]; chars[i] = LOOKALIKE[chars[i]]; v.text = chars.join(''); detail = i;
    } else if (type === 'count') v.n += pm;
    else if (type === 'drop') { v.drop = Math.floor(r() * nDetail); detail = v.drop; }
    else if (type === 'mirror') v.mirror = true;
    else if (type === 'emN') v.emN = em.n <= 3 ? em.n + 1 : em.n + pm;
    else if (type === 'rim') {
      if (spec.rim === 'scallop' || spec.rim === 'spike' || spec.rim === 'pearl') v.rn += pm;
      else if (spec.rim === 'oct' || spec.rim === 'hex') v.rimRot = 7 * pm;
      else v.innerRim = false;
    } else if (type === 'emRot') v.emRot = 9 * pm;
    v._mutation = { type, detail };
    return v;
  }

  function factionOf(seed, fid) {
    if (fid && SPECS[fid]) return fid;
    const m = /^seal:(.+)$/.exec(String(seed));
    return m && SPECS[m[1]] ? m[1] : null;
  }

  function sealBody(spec, v) {
    const em = EMBLEMS[spec.em];
    const parts = em.fn(v.emN || undefined);
    const detail = parts.detail.filter((_, i) => i !== v.drop);
    const emb = [...parts.core, ...detail].join('');
    let tr = 'translate(50 50) scale(0.84) translate(-50 -50)';
    if (v.emRot) tr = `rotate(${v.emRot} 50 50) ` + tr;
    if (v.mirror) tr = 'translate(100 0) scale(-1 1) ' + tr;
    return rimShape(spec.rim, v.rn, 1, v.rimRot)
      + (v.innerRim ? rimShape(spec.rim, v.rn, 0.87, v.rimRot) : '')
      + borderMarks(spec.border, v, spec.rim)
      + `<g transform="${tr}">${emb}</g>`;
  }

  // ───────── 예전 방식(세력을 모를 때): 시드로 만든 별 무늬 ─────────
  const N_POINTS = 7, RING_R = 0.86, INNER_R = 0.3;
  function pattern(seed) {
    const rng = mulberry32(hashStr(String(seed)));
    const points = [];
    for (let i = 0; i < N_POINTS; i++) {
      points.push({ angle: (360 / N_POINTS) * i + (rng() * 10 - 5), r: 0.6 + (rng() * 0.14 - 0.07) });
    }
    return { points, ringTicks: 12 + Math.floor(rng() * 5), ringR: RING_R, innerR: INNER_R };
  }
  function mutate(base, seed) {
    const clone = JSON.parse(JSON.stringify(base));
    const mrng = mulberry32(hashStr(String(seed) + '::mutate'));
    const type = Math.floor(mrng() * 3);
    const idx = Math.floor(mrng() * clone.points.length);
    if (type === 0) clone.points[idx].angle += 20 + mrng() * 6;
    else if (type === 1) clone.points[idx].r *= 0.42;
    else clone.ringTicks = Math.max(6, clone.ringTicks - 1);
    clone._mutation = { type, idx };
    return clone;
  }
  function legacyBody(seed, forged, forgeSeed) {
    const base = pattern(seed);
    const fp = forged ? mutate(base, forgeSeed || seed) : base;
    const toXY = (a, rel) => polar(a, rel * 42);
    const spokes = fp.points.map(p => { const [x, y] = toXY(p.angle, p.r); return `<line x1="50" y1="50" x2="${x}" y2="${y}" class="seal-em"/><circle cx="${x}" cy="${y}" r="1.6" class="seal-dot"/>`; }).join('');
    const ticks = Array.from({ length: fp.ringTicks }, (_, i) => { const a = 360 / fp.ringTicks * i, [x1, y1] = toXY(a, fp.ringR - 0.05), [x2, y2] = toXY(a, fp.ringR + 0.04); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="seal-tick"/>`; }).join('');
    return `<circle cx="50" cy="50" r="${f(fp.ringR * 42)}" class="seal-rim"/><circle cx="50" cy="50" r="${f(fp.innerR * 42)}" class="seal-rim"/>${ticks}`
      + `<polygon points="${pts(fp.points.map(p => toXY(p.angle, p.r)))}" class="seal-em"/>${spokes}<circle cx="50" cy="50" r="2.2" class="seal-emf"/>`;
  }

  // 실제로 그릴 모양 값 — forged=false 면 원본 그대로, true 면 딱 하나 어긋난 변형본
  // forgeSeed: 위조범마다 어긋나는 곳이 다르게 (없으면 seed — 같은 원본의 위조본은 늘 같은 결함)
  function fingerprint(seed, forged, forgeSeed, fid) {
    const id = factionOf(seed, fid);
    if (!id) { const b = pattern(seed); return forged ? mutate(b, forgeSeed || seed) : b; }
    const base = baseVariant(SPECS[id]);
    return forged ? mutateVariant(SPECS[id], base, forgeSeed || seed) : base;
  }

  // 디버그 전용: 위조본이 원본과 정확히 어디서 다른지 (플레이어에게는 보여주지 않는다)
  function diffHint(seed, forgeSeed, fid) {
    return fingerprint(seed, true, forgeSeed, fid)._mutation || null;
  }

  // ── SVG 렌더링 ──
  // viewBox 0..100 에 그린 뒤 width/height=size 로 표시. 같은 그림을 두 번 겹쳐(아래는 어두운 그림자)
  // 밀랍에 눌러 찍은 것처럼 보이게 한다. 색은 CSS(.seal-*)가 감싼 .wax 의 --wax 에서 섞는다.
  // fid: 인장의 세력 (없으면 seed 가 'seal:세력' 꼴일 때 거기서 읽고, 그래도 모르면 예전 별 무늬)
  function svg(seed, forged, size, forgeSeed, fid) {
    size = size || 220;
    const id = factionOf(seed, fid);
    const body = id ? sealBody(SPECS[id], fingerprint(seed, forged, forgeSeed, id)) : legacyBody(seed, forged, forgeSeed);
    return `<svg class="seal-svg" viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="인장 문장">
      <g class="seal-deb" transform="translate(0.9 1.1)">${body}</g><g class="seal-top">${body}</g>
    </svg>`;
  }

  return { pattern, fingerprint, diffHint, svg, render: svg, SPECS };
})();

// 가게 상태 레이어 — 세계 상태(플래그·변수·우호도·창고 단계·직원 …)를 보고 카운터 장면 위에 얹는 데코 표 (데이터).
// 엔진: js/systems/Decor.js (조건 평가 · 새로 켜진 것 알림), 그리기: js/render/DecorLayer.js (오프스크린 캐시 · 0.5초 페이드), 미리보기: js/dev/DevPanel.js
//
// 항목 = {
//   id, label(도움말·개발 패널 이름), toast('처음 켜질 때 한 번 뜨는 알림 — 없으면 label 로'), when(조건 DSL — js/systems/Conditions.js),
//   layer: 'street'|'window'|'shop'|'counter',
//     street  창밖 풍경. 창문 안쪽(14×18) 안에서만 보인다 — 좌표는 창문 안쪽 왼쪽 위가 (0,0)
//     window  창틀·창가·유리 위 (창문 바깥 틀보다 앞) — 좌표는 장면 그림 좌표
//     shop    가게 안 벽·바닥 (손님 뒤)          — 장면 그림 좌표(144×256 기준, 문 앞 바닥선 y=100, 카운터 윗선 y=131)
//     counter 카운터 위 (손님 앞)                  — 장면 그림 좌표
//   z: 같은 레이어 안의 그리는 순서 (작을수록 먼저),
//   anim: 'flicker'(깜빡) | 'sway'(좌우 1~2px) | 'bob'(위아래 둥실) | 'peck'(가끔 콕) | 없으면 정지,
//   그리는 법 (하나): rects:[[x,y,w,h,'색'],…] 절차형 픽셀 도형 / dyn:(g,t,st)=>{…} 매 프레임 그리는 움직이는 것 / src:'assets/scene/decor/<id>.png' + x,y,w,h (그림),
//   needsArt: true — 그림이 필요한 항목. 그림 파일이 없으면 조용히 건너뛴다(알림도 없다),
//   base: true — 늘 있는 배경 요소(알림 없음), silent: true — 켜져도 알림을 띄우지 않는다,
//   brief: 그림 목록 문서(design/decor_art_list.md)에 들어갈 설명과 제미나이 프롬프트 초안 { desc, size:[w,h], pos, prompt }
// }
// 새 데코를 더할 때: 여기 한 줄만 적으면 된다. 그림이 없는 동안은 rects 로 흉내 내도 되고, 그림이 필요하면 needsArt 로 두고 파일만 넣으면 켜진다.
(() => {
  // 도우미 — 상대 좌표 도형을 (ox,oy) 만큼 옮긴다
  const at = (ox, oy, list) => list.map(([x, y, w, h, c]) => [x + ox, y + oy, w, h, c]);
  // 나무 궤짝 w×h
  const crate = (x, y, w, h) => [
    [x, y, w, h, '#2a1a10'], [x + 1, y + 1, w - 2, h - 2, '#7a5230'], [x + 1, y + 1, w - 2, 1, '#94663a'],
    [x + 1, Math.floor(y + h / 2), w - 2, 1, '#5a3a20'], [x + 1, y + 1, 1, h - 2, '#5a3a20'], [x + w - 2, y + 1, 1, h - 2, '#5a3a20'],
  ];
  const barrel = (x, y, w, h) => [
    [x + 1, y, w - 2, h, '#2a1a10'], [x, y + 2, w, h - 4, '#2a1a10'], [x + 1, y + 1, w - 2, h - 2, '#6a4222'], [x + 1, y + 1, 1, h - 2, '#8a5a30'],
    [x, y + 3, w, 1, '#3a3a40'], [x, y + h - 4, w, 1, '#3a3a40'],
  ];
  const sack = (x, y, w, h, c) => [
    [x + 1, y + 2, w - 2, h - 2, '#2a1a10'], [x, y + 3, w, h - 4, '#2a1a10'], [x + 1, y + 3, w - 2, h - 4, c || '#8a7850'],
    [x + 2, y, w - 4, 3, '#2a1a10'], [x + 2, y + 1, w - 4, 2, c || '#8a7850'], [x + 2, y + 3, w - 4, 1, '#3a2a18'],
    [x + w - 2, y + 4, 1, h - 6, 'rgba(0,0,0,.28)'],
  ];
  const keg = (x, y) => [
    [x + 1, y, 6, 1, '#1a1010'], [x, y + 1, 8, 9, '#1a1010'], [x + 1, y + 10, 6, 1, '#1a1010'],
    [x + 1, y + 1, 6, 9, '#5a3a1e'], [x + 1, y + 1, 1, 9, '#7a5230'], [x + 1, y + 3, 6, 1, '#2c2c32'], [x + 1, y + 7, 6, 1, '#2c2c32'],
    [x + 3, y + 4, 2, 3, '#b02a20'], [x + 3, y + 4, 1, 1, '#f0a040'],
  ];
  const wanted = (x, y, hair) => [
    [x, y, 7, 9, '#5a4a30'], [x + 1, y + 1, 5, 7, '#d8c592'], [x + 2, y + 2, 3, 3, '#8a6a4a'], [x + 2, y + 1, 3, 2, hair],
    [x + 1, y + 6, 5, 1, '#a02828'], [x + 2, y + 7, 3, 1, '#6a5a3a'],
  ];
  const roof = [
    [0, 13, 14, 5, '#1b1a20'], [1, 12, 3, 1, '#1b1a20'], [2, 11, 1, 1, '#1b1a20'], [6, 12, 4, 1, '#1b1a20'], [7, 11, 2, 1, '#1b1a20'],
    [11, 12, 3, 1, '#1b1a20'], [10, 9, 1, 3, '#1b1a20'], [4, 8, 2, 5, '#232631'],
    [3, 15, 1, 1, '#e8b050'], [8, 16, 1, 1, '#e8b050'], [12, 14, 1, 1, '#c88a3a'],
  ];

  const D = {};
  const L = D.list = [];
  const def = e => L.push(e);
  const art = (id, size, pos, desc, prompt) => ({ desc, size, pos, prompt });

  // ───────────────── 늘 있는 것: 창문 (밖은 지붕과 하늘, 시간이 지나면 저녁빛) ─────────────────
  def({
    id: 'window_sky', label: '창밖 지붕과 하늘', layer: 'street', z: 0, base: true, when: {},
    rects: [
      [0, 0, 14, 4, '#34435a'], [0, 4, 14, 4, '#46566e'], [0, 8, 14, 3, '#5d6b80'], [0, 11, 14, 2, '#7b8592'],
      [2, 3, 2, 1, '#8090a8'], [9, 6, 3, 1, '#7080a0'], ...roof,
    ],
  });
  def({
    id: 'window_dusk', label: '저녁빛', layer: 'street', z: 1, base: true, when: {},
    dyn: (g, t, st) => {
      const k = Math.max(0, Math.min(1, (st.time - 13 * 60) / (5 * 60)));
      if (k <= 0.02) return;
      g.globalAlpha = 0.5 * k; g.fillStyle = '#ff7a24'; g.fillRect(0, 0, 14, 18);
      g.globalAlpha = 0.5 * k; g.fillStyle = '#ffb040'; g.fillRect(0, 11, 14, 3); g.globalAlpha = 1;
    },
  });
  def({
    id: 'window_frame', label: '창틀', layer: 'window', z: 9, base: true, when: {},
    rects: [
      [32, 27, 20, 3, '#2b1a10'], [32, 27, 20, 1, '#4a2e1a'], [32, 27, 3, 24, '#2b1a10'], [49, 27, 3, 24, '#2b1a10'],
      [32, 48, 20, 3, '#33200f'], [31, 50, 22, 1, '#4a2e1a'], [32, 48, 20, 1, '#5a3a20'],
      [40, 30, 2, 18, '#2b1a10'], [35, 38, 14, 1, '#2b1a10'],
      [35, 30, 14, 1, 'rgba(0,0,0,.38)'], [35, 31, 14, 1, 'rgba(0,0,0,.18)'],
    ],
  });

  // ───────────────── 왕국 · 왕실 ─────────────────
  def({
    id: 'royal_crest', label: '금박 왕실 문장', toast: '문 위에 금박 왕실 문장이 걸렸다.', layer: 'shop', z: 4,
    when: { any: [{ flag: 'royal_certified' }, { flag: 'kingdom_victory' }] },
    rects: at(67, 29, [
      [1, 2, 10, 2, '#d6a532'], [1, 0, 2, 3, '#d6a532'], [5, 0, 2, 3, '#f3d675'], [9, 0, 2, 3, '#d6a532'],
      [0, 4, 12, 6, '#c9982c'], [1, 10, 10, 1, '#c9982c'], [2, 11, 8, 1, '#c9982c'], [4, 12, 4, 1, '#c9982c'],
      [1, 5, 10, 5, '#7a1a22'], [2, 10, 8, 1, '#7a1a22'], [3, 11, 6, 1, '#7a1a22'], [5, 6, 2, 5, '#f0d060'], [3, 7, 6, 1, '#f0d060'],
      [0, 4, 12, 1, '#f3d675'],
    ]),
  });
  def({
    id: 'kingdom_banner', label: '왕국 승전 깃발', toast: '벽에 왕국의 승전 깃발이 걸렸다.', layer: 'shop', z: 3,
    when: { flag: 'kingdom_victory' }, needsArt: true, src: 'assets/scene/decor/kingdom_banner.png', x: 91, y: 30, w: 14, h: 40,
    brief: art('kingdom_banner', [14, 40], '문 오른쪽 벽 (91,30)', '왕국이 이긴 뒤 벽에 걸린 길쭉한 남색 승전 깃발. 금실 사자 문장, 아래가 제비꼬리로 갈라진다.',
      'pixel art, tall dark-blue heraldic banner with gold lion emblem and swallowtail bottom, hanging from a wooden rod, dark medieval fantasy shop wall, transparent background'),
  });
  def({
    id: 'dwarf_plate', label: '드워프 명패', toast: '문틀 위에 드워프의 놋쇠 명패가 붙었다.', layer: 'shop', z: 5,
    when: { any: [{ var: 'rel_dwarf', gte: 6 }, { flag: 'dwarf_contract' }, { flag: 'dwarf_golden_age' }] },
    rects: at(66, 44, [
      [0, 0, 14, 4, '#b8862c'], [0, 0, 14, 1, '#e0b050'], [0, 3, 14, 1, '#6a4a18'], [0, 1, 1, 1, '#6a4a18'], [13, 1, 1, 1, '#6a4a18'],
      [2, 1, 1, 2, '#5a3a10'], [4, 1, 2, 1, '#5a3a10'], [4, 2, 1, 1, '#5a3a10'], [7, 1, 1, 2, '#5a3a10'], [9, 1, 3, 1, '#5a3a10'],
    ]),
  });
  def({
    id: 'dwarf_anvil', label: '드워프가 두고 간 모루', toast: '바닥 한구석에 드워프가 선물한 작은 모루가 놓였다.', layer: 'shop', z: 6,
    when: { any: [{ var: 'rel_dwarf', gte: 12 }, { flag: 'dwarf_golden_age' }] }, needsArt: true, src: 'assets/scene/decor/dwarf_anvil.png', x: 10, y: 104, w: 15, h: 11,
    brief: art('dwarf_anvil', [15, 11], '왼쪽 바닥 (10,104)', '드워프 장로가 선물한 작은 모루. 검게 그을린 강철, 옆면에 강철수염 공방의 룬.',
      'pixel art, small black iron blacksmith anvil with glowing rune engraved on side, sitting on wooden floor, dark medieval fantasy, transparent background'),
  });

  // ───────────────── 고블린 ─────────────────
  def({
    id: 'goblin_flag', label: '창가 초록 깃발 조각', toast: '창가에 고블린이 묶어 둔 초록 깃발 조각이 펄럭인다.', layer: 'window', z: 6, anim: 'sway',
    when: { any: [{ var: 'rel_goblin', gte: 6 }, { flag: 'goblin_unified' }] },
    rects: at(43, 30, [
      [0, 0, 6, 1, '#6b4a2a'], [1, 1, 6, 6, '#4f8a3a'], [2, 7, 4, 2, '#4f8a3a'], [3, 9, 2, 1, '#4f8a3a'], [1, 3, 6, 1, '#2f5a26'],
      [3, 4, 2, 2, '#d8d0b0'], [3, 5, 1, 1, '#1a1a1a'], [4, 5, 1, 1, '#1a1a1a'], [1, 1, 6, 1, '#6aa84a'],
    ]),
  });
  def({
    id: 'goblin_charm', label: '고블린 부적', toast: '문 옆에 고블린 부적이 매달렸다.', layer: 'shop', z: 4, anim: 'sway',
    when: { var: 'rel_goblin', gte: 10 },
    rects: at(58, 47, [
      [2, 0, 1, 3, '#5a3a20'], [0, 3, 5, 1, '#8a7a5a'], [1, 4, 1, 4, '#d8d0b0'], [3, 4, 1, 3, '#d8d0b0'], [2, 4, 1, 2, '#4f8a3a'],
      [2, 8, 1, 1, '#c8a030'],
    ]),
  });
  def({
    id: 'goblin_totem', label: '고블린 뼈 토템', toast: '한쪽 벽에 고블린 뼈 토템이 세워졌다.', layer: 'shop', z: 3,
    when: { any: [{ flag: 'goblin_victory' }, { flag: 'act4_goblin_kingdom' }] }, needsArt: true, src: 'assets/scene/decor/goblin_totem.png', x: 24, y: 66, w: 10, h: 30,
    brief: art('goblin_totem', [10, 30], '왼쪽 벽 (24,66)', '고블린이 이긴 뒤 세워 준 뼈와 깃털 토템. 나무 기둥에 해골 세 개, 초록 천 조각.',
      'pixel art, tall goblin tribal totem pole of bones and skulls with green cloth scraps and feathers, dark medieval fantasy, transparent background'),
  });

  // ───────────────── 장물 · 밀수 ─────────────────
  def({
    id: 'smuggle_sacks', label: '구석의 수상한 자루', toast: '구석에 출처를 묻기 어려운 자루가 쌓였다.', layer: 'shop', z: 1,
    when: { any: [{ flag: 'smuggle_route' }, { flag: 'smuggle_burned' }, { var: 'illegal_sale_count', gte: 3 }] },
    rects: at(23, 93, [...sack(0, 4, 7, 7, '#6a5a3c'), ...sack(6, 2, 7, 9, '#7a6a48'), [8, 6, 2, 2, '#1a1010'], [9, 7, 1, 1, '#a02020'], [2, 8, 2, 2, '#1a1010']]),
  });

  // ───────────────── 견습생 핀 ─────────────────
  def({
    id: 'pin_broom', label: '견습생의 빗자루', toast: '문 옆에 견습생이 쓰는 빗자루가 기대어 있다.', layer: 'shop', z: 2,
    when: { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }] },
    rects: at(91, 78, [[3, 0, 1, 7, '#7a5a30'], [2, 7, 1, 7, '#7a5a30'], [1, 14, 1, 8, '#7a5a30'], [0, 21, 5, 1, '#5a3a20'], [0, 22, 5, 5, '#b09050'], [0, 26, 5, 1, '#8a7038'], [1, 23, 1, 3, '#d0b070']]),
  });
  def({
    id: 'pin_stool', label: '견습생의 작은 의자', toast: '카운터 옆에 견습생의 작은 의자가 놓였다.', layer: 'shop', z: 3,
    when: { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }] },
    rects: at(34, 104, [[0, 9, 10, 1, 'rgba(0,0,0,.35)'], [0, 0, 10, 3, '#8a5a30'], [0, 0, 10, 1, '#a8743c'], [0, 2, 10, 1, '#5a3a20'], [1, 3, 1, 6, '#5a3a20'], [8, 3, 1, 6, '#5a3a20'], [1, 6, 8, 1, '#4a2e18']]),
  });

  // ───────────────── 창고 확장 (storageLevel 1~3) ─────────────────
  def({
    id: 'storage_1', label: '창고 확장 1단계', toast: '벽 쪽에 짐 궤짝이 늘었다.', layer: 'shop', z: 2, when: { storage: { gte: 1 } },
    rects: [...crate(41, 93, 8, 9), ...crate(48, 94, 8, 8)],
  });
  def({
    id: 'storage_2', label: '창고 확장 2단계', toast: '통과 궤짝이 한 층 더 쌓였다.', layer: 'shop', z: 3, when: { storage: { gte: 2 } },
    rects: [...barrel(31, 87, 9, 15), ...crate(42, 85, 8, 8)],
  });
  def({
    id: 'storage_3', label: '창고 확장 3단계', toast: '짐 더미가 벽을 따라 가득 찼다.', layer: 'shop', z: 4, when: { storage: { gte: 3 } },
    rects: [...crate(49, 86, 8, 8), ...sack(31, 101, 8, 8, '#8a7850'), ...sack(39, 103, 8, 7, '#7a6a48'), [40, 100, 1, 3, '#5a3a20']],
  });

  // ───────────────── 까마귀 ─────────────────
  def({
    id: 'crow_perch', label: '창가 횃대', toast: '창가에 까마귀가 앉을 횃대가 생겼다.', layer: 'window', z: 5, when: { unlocked: 'crow' },
    rects: [[35, 45, 14, 1, '#5a3a20'], [35, 46, 14, 1, '#3a2412'], [36, 44, 1, 1, '#5a3a20'], [47, 44, 1, 1, '#5a3a20']],
  });
  def({
    id: 'crow_raven', label: '까마귀', silent: true, layer: 'window', z: 6, anim: 'peck', when: { unlocked: 'crow' },
    rects: at(38, 38, [
      [1, 5, 3, 2, '#15131a'], [3, 3, 6, 4, '#15131a'], [8, 1, 4, 4, '#15131a'], [12, 3, 3, 1, '#c09030'], [10, 2, 1, 1, '#e8e0c0'],
      [4, 4, 3, 1, '#2c2a38'], [5, 7, 1, 1, '#4a3a20'], [7, 7, 1, 1, '#4a3a20'], [0, 6, 2, 1, '#15131a'],
    ]),
  });

  // ───────────────── 용 ─────────────────
  const dragonUp = { any: [{ flag: 'dragon_awake' }, { flag: 'dragon_razed' }, { flag: 'dragon_defied' }] };
  def({
    id: 'dragon_sky', label: '붉게 물든 창밖 하늘', toast: '창밖 하늘이 불타는 듯 붉다.', layer: 'street', z: 4, anim: 'flicker', when: dragonUp,
    rects: [[0, 0, 14, 18, 'rgba(190,36,20,.34)'], [0, 7, 14, 11, 'rgba(255,90,20,.28)'], [0, 12, 14, 6, 'rgba(255,150,40,.3)']],
  });
  def({
    id: 'dragon_ash', label: '날리는 재', silent: true, layer: 'street', z: 7, when: dragonUp,
    dyn: (g, t) => {
      for (let i = 0; i < 9; i++) {
        const x = ((i * 37 + t * (1.2 + (i % 3) * 0.5)) % 16) - 1, y = (t * (2 + (i % 3) * 1.3) + i * 7) % 20 - 1;
        g.fillStyle = i % 4 === 0 ? '#ff9a3a' : '#c8c0b8'; g.globalAlpha = i % 4 === 0 ? 0.9 : 0.7;
        g.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      }
      g.globalAlpha = 1;
    },
  });
  def({
    id: 'dragon_flyby', label: '하늘을 가르는 그림자', silent: true, layer: 'street', z: 6, when: { flag: 'dragon_awake' },
    dyn: (g, t) => {
      const c = t % 26; if (c > 4) return;
      const x = Math.floor(-6 + c / 4 * 24), y = 3 + Math.floor(Math.sin(c * 2) * 1);
      g.fillStyle = '#120808';
      g.fillRect(x + 2, y + 1, 4, 1); g.fillRect(x, y, 2, 1); g.fillRect(x + 6, y, 2, 1); g.fillRect(x + 3, y + 2, 2, 1); g.fillRect(x + 7, y + 1, 2, 1);
    },
  });
  def({
    id: 'dragon_skull', label: '용의 두개골 전리품', toast: '문 위에 용의 두개골이 걸렸다.', layer: 'shop', z: 4,
    when: { flag: 'dragon_slain' }, needsArt: true, src: 'assets/scene/decor/dragon_skull.png', x: 60, y: 8, w: 26, h: 16,
    brief: art('dragon_skull', [26, 16], '문 위 어두운 천장 아래 (60,8)', '용을 쓰러뜨린 뒤 걸어 둔 용의 두개골 전리품. 긴 주둥이와 뿔, 벽에 박은 쇠못.',
      'pixel art, dragon skull trophy mounted on wall with iron spikes, long snout and two horns, aged ivory bone, dark medieval fantasy, transparent background'),
  });

  // ───────────────── 전쟁 ─────────────────
  const atWar = { any: [{ flag: 'war' }, { flag: 'civil_war' }, { flag: 'demon_war' }] };
  def({
    id: 'war_soldiers', label: '창밖을 지나가는 병사 행렬', toast: '창밖으로 무장한 병사들이 지나간다.', layer: 'street', z: 5, when: atWar,
    dyn: (g, t) => {
      g.fillStyle = '#0f0d12';
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(((t * 1.6 + i * 6) % 20) - 4), y = 13 + (Math.floor(t * 3 + i) % 2 ? 0 : 1);
        g.fillRect(x, y, 2, 3); g.fillRect(x, y - 1, 2, 1); g.fillRect(x + 2, y - 3, 1, 5);
      }
    },
  });
  def({
    id: 'war_notice', label: '전시 포고문', toast: '벽에 전시 포고문이 붙었다.', layer: 'shop', z: 2, when: atWar,
    rects: at(92, 32, [
      [0, 0, 12, 15, '#5a4a30'], [1, 1, 10, 13, '#c9b48a'], [2, 2, 8, 2, '#8a2020'], [2, 5, 8, 1, '#5a4a30'], [2, 7, 8, 1, '#5a4a30'],
      [2, 9, 6, 1, '#5a4a30'], [2, 11, 8, 1, '#5a4a30'], [3, 12, 3, 1, '#8a2020'], [0, 0, 1, 1, '#3a3a3a'], [11, 0, 1, 1, '#3a3a3a'],
    ]),
  });
  def({
    id: 'demonlord_banner', label: '창밖의 검은 깃발', toast: '창밖 먼 탑에 검은 깃발이 올랐다.', layer: 'street', z: 6,
    when: { any: [{ flag: 'demonlord_victory' }, { flag: 'act4_demonlord_wins_showdown' }] },
    dyn: (g, t) => {
      g.fillStyle = '#2a2a30'; g.fillRect(11, 1, 1, 12);
      for (let c = 0; c < 7; c++) {
        const y = 1 + Math.round(Math.sin(t * 3 + c * 0.9) * 1);
        g.fillStyle = '#0c0a10'; g.fillRect(10 - c, y, 1, 5);
        if (c === 3) { g.fillStyle = '#a01828'; g.fillRect(10 - c, y + 2, 2, 1); }
      }
    },
  });

  // ───────────────── 화약 ─────────────────
  const powder = { all: [{ flag: 'powder_dealer' }, { noFlag: 'powder_banned' }] };
  def({
    id: 'powder_kegs', label: '화약통 더미', toast: '문 옆에 화약통이 쌓였다.', layer: 'shop', z: 3, when: powder,
    rects: [...keg(93, 92), ...keg(101, 93), ...keg(97, 83)],
  });
  def({
    id: 'powder_bulk', label: '더 쌓인 화약통', toast: '화약통이 한 줄 더 늘었다.', layer: 'shop', z: 4, when: { all: [{ flag: 'powder_dealer' }, { flag: 'powder_bulk' }, { noFlag: 'powder_banned' }] },
    rects: [...keg(84, 93), ...keg(91, 104)],
  });

  // ───────────────── 가게 물품: 새 간판 (도매상 '간판 교체' — js/data/shop.js) ─────────────────
  def({
    id: 'sign_new', label: '새 간판', toast: '문 위에 새 간판이 걸렸다.', layer: 'shop', z: 6, when: { upgrade: 'sign' },
    rects: at(60, 30, [
      [0, 0, 28, 1, '#1a1010'], [2, 1, 1, 3, '#3a3a40'], [25, 1, 1, 3, '#3a3a40'],
      [0, 4, 28, 12, '#1a1010'], [1, 5, 26, 10, '#7a5230'], [1, 5, 26, 1, '#94663a'], [1, 14, 26, 1, '#5a3a20'], [1, 5, 1, 10, '#94663a'], [26, 5, 1, 10, '#5a3a20'],
      [10, 7, 8, 6, '#2a1a10'], [11, 8, 6, 4, '#e8b050'], [12, 9, 4, 2, '#f8d878'], [13, 9, 2, 2, '#c88a3a'],
      [3, 8, 4, 1, '#e8d8a8'], [3, 10, 3, 1, '#e8d8a8'], [21, 8, 4, 1, '#e8d8a8'], [22, 10, 3, 1, '#e8d8a8'],
    ]),
    brief: art('sign_new', [28, 16], '문 위 (60,30)', '새로 단 가게 간판. 짙은 나무판에 금빛 검과 저울, 사슬로 매달았다.',
      'pixel art, hanging wooden shop sign with golden sword and scales emblem on chains, dark medieval fantasy, transparent background'),
  });

  // ───────────────── 빚 · 압류 ─────────────────
  def({
    id: 'seizure_notice', label: '창문의 압류 딱지', toast: '창문에 붉은 압류 딱지가 붙었다.', layer: 'window', z: 7,
    when: { any: [{ flag: 'debt_threatened' }, { flag: 'debt_bailiff_due' }, { flag: 'shop_seized' }] },
    rects: at(37, 33, [
      [0, 0, 9, 11, '#7a6a44'], [1, 1, 7, 9, '#cbb98a'], [1, 1, 7, 2, '#a02020'], [2, 4, 5, 1, '#6a5a3a'], [2, 6, 4, 1, '#6a5a3a'],
      [5, 7, 3, 3, '#a02020'], [6, 8, 1, 1, '#e08070'],
    ]),
  });
  def({
    id: 'seized_planks', label: '문에 박힌 판자', toast: '문에 판자가 X자로 박혔다.', layer: 'shop', z: 8,
    when: { flag: 'shop_seized' }, needsArt: true, src: 'assets/scene/decor/seized_planks.png', x: 57, y: 45, w: 33, h: 55,
    brief: art('seized_planks', [33, 55], '문짝 위 (57,45)', '압류당한 가게의 문에 X자로 못 박은 거친 널빤지 두 장과 붉은 봉인 밀랍.',
      'pixel art, two rough wooden planks nailed across a door in X shape with red wax seal, dark medieval fantasy, transparent background'),
  });

  // ───────────────── 안개 계약 · 언데드 ─────────────────
  const fog = { any: [{ var: 'demon_influence', gte: 12 }, { flag: 'demon_contract' }, { flag: 'mist_sign_mark' }] };
  def({
    id: 'demon_fog', label: '창밖 안개', toast: '창밖에 안개가 끼기 시작했다.', layer: 'street', z: 4, anim: 'sway', when: fog,
    rects: [[-3, 9, 20, 3, 'rgba(190,195,200,.25)'], [-3, 12, 20, 6, 'rgba(180,185,195,.36)']],
  });
  def({
    id: 'demon_fog_thick', label: '짙은 안개', toast: '창밖이 안개로 뒤덮여 아무것도 보이지 않는다.', layer: 'street', z: 5, anim: 'sway',
    when: { any: [{ var: 'demon_influence', gte: 22 }, { flag: 'mist_contract_broken' }, { flag: 'mist_second_contract' }] },
    rects: [[-3, 0, 20, 18, 'rgba(170,175,185,.5)'], [-3, 9, 20, 9, 'rgba(170,175,185,.35)'], [-3, 0, 20, 18, 'rgba(90,40,120,.16)'], [7, 8, 1, 1, 'rgba(200,30,50,.7)'], [10, 8, 1, 1, 'rgba(200,30,50,.7)']],
  });
  const deadUp = { any: [{ flag: 'undead_tide' }, { flag: 'graves_opened' }, { var: 'undead_power', gte: 14 }] };
  def({
    id: 'dead_glow', label: '창밖의 청록빛', toast: '창밖이 밤도 아닌데 청록빛으로 물들었다.', layer: 'street', z: 4, anim: 'flicker', when: deadUp,
    rects: [[0, 0, 14, 18, 'rgba(40,220,190,.2)'], [0, 10, 14, 8, 'rgba(60,240,200,.26)']],
  });
  def({
    id: 'dead_wisps', label: '떠오르는 넋불', silent: true, layer: 'street', z: 7, when: deadUp,
    dyn: (g, t) => {
      for (let i = 0; i < 5; i++) {
        const x = 2 + ((i * 5) % 11) + Math.round(Math.sin(t * 0.9 + i) * 1), y = 17 - ((t * 1.6 + i * 4) % 16);
        g.fillStyle = '#9ff8e4'; g.globalAlpha = 0.85; g.fillRect(x, Math.floor(y), 1, 2); g.globalAlpha = 0.35; g.fillRect(x - 1, Math.floor(y) + 1, 3, 1);
      }
      g.globalAlpha = 1;
    },
  });
  def({
    id: 'star_omen', label: '이상한 별', toast: '창밖 하늘에 낯선 별이 떴다.', layer: 'street', z: 3, anim: 'flicker',
    when: { any: [{ var: 'star_signal', gte: 6 }, { flag: 'star_tower' }] },
    rects: [[9, 2, 3, 3, 'rgba(180,140,255,.3)'], [10, 1, 1, 5, '#ffffff'], [8, 3, 5, 1, '#e8dcff'], [10, 3, 1, 1, '#ffffff']],
  });
  def({
    id: 'fairy_motes', label: '창가의 반딧불', toast: '창가에 반딧불 같은 요정 가루가 맴돈다.', layer: 'street', z: 7,
    when: { any: [{ flag: 'fairy_blessing' }, { flag: 'forest_remembers' }] },
    dyn: (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1);
        g.globalAlpha = 0.25 + 0.7 * a; g.fillStyle = i % 2 ? '#b8f070' : '#f0f8a0';
        g.fillRect(Math.floor(2 + ((i * 7) % 11) + Math.sin(t * 0.6 + i) * 1.4), Math.floor(4 + ((i * 5) % 9) + Math.cos(t * 0.5 + i) * 1.4), 1, 1);
      }
      g.globalAlpha = 1;
    },
  });

  // ───────────────── 벽 게시판 · 문 ─────────────────
  const noClear = { noFlag: 'posters_cleared' };
  def({ id: 'wanted_marga', label: '마르가 수배서', toast: '게시판에 수배서가 한 장 붙었다.', layer: 'shop', z: 5, when: { all: [{ flag: 'wanted_marga_posted' }, noClear] }, rects: wanted(33, 55, '#5a3a20') });
  def({ id: 'wanted_lisa', label: '리사 수배서', silent: true, layer: 'shop', z: 5, when: { all: [{ flag: 'wanted_lisa_posted' }, noClear] }, rects: wanted(43, 57, '#c08040') });
  def({ id: 'wanted_kassim', label: '카심 수배서', silent: true, layer: 'shop', z: 5, when: { all: [{ flag: 'wanted_kassim_posted' }, noClear] }, rects: wanted(38, 65, '#303040') });
  def({
    id: 'excommunication_mark', label: '문에 그려진 파문의 표식', toast: '누가 문에 붉은 표식을 그려 놓았다.', layer: 'shop', z: 6,
    when: { flag: 'excommunicated' }, needsArt: true, src: 'assets/scene/decor/excommunication_mark.png', x: 63, y: 58, w: 20, h: 22,
    brief: art('excommunication_mark', [20, 22], '문짝 가운데 (63,58)', '대성당에서 파문당한 가게 문에 붉은 페인트로 그려진 거꾸로 된 성인장. 흘러내린 붉은 물감.',
      'pixel art, red painted inverted holy symbol with dripping paint on dark wooden door, dark medieval fantasy, transparent background'),
  });

  // ───────────────── 우호 세력의 선물 · 단골 ─────────────────
  def({
    id: 'guild_plaque', label: '상인 길드 조합패', toast: '벽에 상인 길드의 저울 조합패가 걸렸다.', layer: 'shop', z: 3,
    when: { any: [{ flag: 'guild_member' }, { var: 'rel_guild', gte: 6 }] },
    rects: at(93, 74, [[0, 0, 12, 9, '#2a1c12'], [1, 1, 10, 7, '#5a4630'], [2, 3, 8, 1, '#d0a030'], [5, 2, 2, 5, '#d0a030'], [1, 5, 3, 1, '#d0a030'], [8, 5, 3, 1, '#d0a030'], [1, 1, 10, 1, '#7a6040']]),
  });
  def({
    id: 'mage_orb', label: '마법사 길드의 부유등', toast: '천장 아래 마법사 길드의 푸른 부유등이 떠올랐다.', layer: 'shop', z: 7, anim: 'bob',
    when: { any: [{ var: 'rel_mage', gte: 6 }, { flag: 'mage_breakthrough' }] },
    rects: at(20, 16, [[0, 0, 9, 9, 'rgba(90,140,255,.2)'], [1, 1, 7, 7, 'rgba(90,140,255,.25)'], [2, 2, 5, 5, '#6ea0ff'], [3, 3, 3, 3, '#a8c8ff'], [4, 4, 1, 1, '#ffffff']]),
  });
  def({
    id: 'counter_vase', label: '카운터의 작은 꽃병', toast: '카운터 한쪽에 단골이 두고 간 꽃병이 놓였다.', layer: 'counter', z: 2,
    when: { any: [{ var: 'reputation', gte: 20 }, { dealt: { min: 30 } }] },
    rects: at(5, 120, [
      [3, 8, 5, 8, '#2a2a34'], [2, 10, 7, 5, '#2a2a34'], [3, 9, 5, 6, '#5a6a7a'], [3, 9, 1, 6, '#7a8a9a'], [4, 6, 3, 3, '#5a6a7a'],
      [1, 2, 2, 2, '#c0303a'], [5, 1, 2, 2, '#e0c040'], [8, 3, 2, 2, '#e8e0d0'], [3, 4, 1, 3, '#3a7a3a'], [6, 3, 1, 4, '#3a7a3a'], [8, 5, 1, 2, '#3a7a3a'],
    ]),
  });
  def({
    id: 'elf_pot', label: '요정의 화분', toast: '카운터 끝에 요정이 두고 간 화분이 자란다.', layer: 'counter', z: 2, anim: 'sway',
    when: { any: [{ var: 'rel_fairy', gte: 6 }, { flag: 'fairy_blessing' }] },
    rects: at(122, 118, [
      [6, 2, 1, 8, '#357a3a'], [3, 4, 3, 2, '#4f9a4a'], [7, 3, 3, 2, '#7ac060'], [2, 7, 3, 2, '#4f9a4a'], [8, 6, 3, 2, '#7ac060'], [6, 0, 2, 2, '#d8b0e8'],
      [2, 9, 9, 2, '#a8663a'], [3, 11, 7, 6, '#8a5030'], [3, 11, 1, 6, '#a8663a'],
    ]),
  });
  def({
    id: 'liga_shell', label: '천칭단의 소라껍데기', toast: '카운터에 소라껍데기가 놓였다.', layer: 'counter', z: 3,
    when: { flag: 'liga_member' }, needsArt: true, src: 'assets/scene/decor/liga_shell.png', x: 17, y: 124, w: 10, h: 8,
    brief: art('liga_shell', [10, 8], '카운터 왼쪽 (17,124)', '천칭단이 맡긴 은빛 소라껍데기 통신구. 아주 작게, 카운터 위에 놓인 모습.',
      'pixel art, small silvery conch shell with faint blue glow lying on wooden counter, dark medieval fantasy, transparent background'),
  });
  def({
    id: 'golem_figure', label: '골렘 공방의 소형 골렘', toast: '바닥에 골렘 공방이 보낸 작은 골렘이 서 있다.', layer: 'shop', z: 6,
    when: { any: [{ flag: 'golem_workshop' }, { var: 'rel_golem', gte: 8 }] }, needsArt: true, src: 'assets/scene/decor/golem_figure.png', x: 100, y: 104, w: 12, h: 14,
    brief: art('golem_figure', [12, 14], '오른쪽 바닥 (100,104)', '골렘 공방이 마스코트로 보낸 어깨 높이의 작은 석조 골렘. 눈에 희미한 주황 불빛.',
      'pixel art, small stone golem figurine with glowing orange eyes standing, dark medieval fantasy, transparent background'),
  });

  // 조건에서 창문 안쪽 위치 (Scene 그림 좌표) — DecorLayer 가 street 를 이 안으로 자른다
  D.window = { x: 35, y: 30, w: 14, h: 18 };
  WS.data.decor = D;
})();

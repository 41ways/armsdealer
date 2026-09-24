// 코드로 그리는 픽셀 스프라이트: 손님(외형 프리셋 조합), 아이템, 동전, 손
WS.Sprites = (() => {
  const P = WS.Pixel;
  const { Layer, shade, mirror } = P;
  const CW = 72, CH = 92; // 손님 스프라이트 크기
  const cache = new Map();
  const m = pts => mirror(pts, CW);

  // ───────── 손님 ─────────
  // 어깨 가시 (고블린 가죽 갑옷, 마왕군 판금 공용)
  function shoulderSpikes(L) {
    const spikes = [[[7, 54], [4, 44], [11, 52]], [[13, 51], [13, 40], [17, 50]], [[19, 52], [22, 43], [22, 53]]];
    spikes.forEach(s => { L.next(); L.poly(s, '#d6cfc4', true); L.next(); L.poly(m(s), '#d6cfc4', true); });
  }

  // 뿔 모양 (왼쪽 기준, 오른쪽은 반전)
  const HORNS = {
    curved: [[28, 21], [24, 15], [22, 8], [25, 2], [26, 9], [29, 14], [32, 18]],
    ram: [[27, 20], [20, 17], [15, 21], [15, 28], [19, 31], [22, 28], [19, 25], [21, 21], [26, 23]],
    spike: [[28, 21], [26, 6], [32, 19]],
    great: [[25, 22], [14, 17], [6, 8], [5, 0], [11, 8], [19, 13], [28, 17]],
  };

  function body(L, lk) {
    const c = lk.bodyColor;
    const dark = shade(c, -0.35);
    L.next();
    const wide = lk.body === 'robe' || lk.body === 'cloak' || lk.body === 'noble';
    const torso = wide
      ? [[18, 50], [54, 50], [64, 62], [69, 92], [3, 92], [8, 62]]
      : [[17, 50], [55, 50], [64, 60], [66, 92], [6, 92], [8, 60]];
    L.poly(torso, c, true);

    if (lk.body === 'armor') {
      if (lk.tabard) {
        L.next();
        L.poly([[26, 58], [46, 58], [45, 92], [27, 92]], lk.tabard, true);
        L.flat = true;
        L.rect(35, 66, 2, 10, lk.trim);
        L.rect(32, 69, 8, 2, lk.trim);
        L.flat = false;
      } else {
        L.flat = true;
        L.rect(36, 56, 1, 36, dark);
        L.flat = false;
      }
      L.next(); L.ellipse(14, 57, 10, 8, shade(c, 0.05), true);
      L.next(); L.ellipse(58, 57, 10, 8, shade(c, 0.05), true);
      if (lk.spikes) shoulderSpikes(L);
      L.next(); L.rect(27, 47, 18, 4, lk.trim || dark);
    } else if (lk.body === 'leather') {
      L.flat = true;
      L.line(19, 52, 53, 92, dark);
      L.line(20, 52, 54, 92, dark);
      L.rect(35, 70, 3, 3, '#c8a040');
      L.flat = false;
      const pad = lk.spikes ? '#5d5752' : shade(c, -0.15);
      L.next(); L.ellipse(14, 57, 9, 7, pad, true);
      L.next(); L.ellipse(58, 57, 9, 7, pad, true);
      if (lk.spikes) shoulderSpikes(L);
    } else if (lk.body === 'apron') {
      L.next(); L.poly([[22, 60], [50, 60], [53, 92], [19, 92]], lk.apron, true);
      L.flat = true; L.rect(22, 60, 28, 1, shade(lk.apron, -0.3)); L.flat = false;
      L.next(); L.ellipse(14, 58, 8, 7, shade(c, -0.1), true);
      L.next(); L.ellipse(58, 58, 8, 7, shade(c, -0.1), true);
    } else if (lk.body === 'robe' || lk.body === 'noble') {
      L.next(); L.poly([[29, 50], [43, 50], [36, 66]], lk.body === 'noble' ? '#f0e8d8' : '#e8e0d0');
      L.flat = true;
      [70, 77, 84].forEach(y => L.rect(35, y, 2, 2, lk.trim));
      L.line(36, 66, 36, 92, shade(c, -0.3));
      L.flat = false;
      if (lk.body === 'noble') {
        L.next(); L.ellipse(20, 53, 11, 5, '#e8e0cc', true);
        L.next(); L.ellipse(52, 53, 11, 5, '#e8e0cc', true);
        L.flat = true; L.rect(12, 64, 1, 28, lk.trim); L.rect(59, 64, 1, 28, lk.trim); L.flat = false;
      }
    } else if (lk.body === 'tunic') {
      L.next(); L.rect(8, 82, 57, 4, '#4a3020');
      L.flat = true; L.rect(34, 82, 4, 4, '#c8a040'); L.rect(35, 83, 2, 2, '#4a3020'); L.flat = false;
      L.flat = true; L.line(36, 52, 36, 62, shade(c, -0.3)); L.flat = false;
    } else if (lk.body === 'cloak') {
      L.next(); L.ellipse(36, 53, 3, 2, '#c8a040', true);
    }
    if (lk.necklace) {
      L.flat = true;
      for (let i = 0; i < 9; i++) {
        const x = 24 + i * 3, y = 56 + Math.round(Math.sin((i / 8) * Math.PI) * 5);
        L.rect(x, y, 2, 3, '#e8e0c8');
      }
      L.flat = false;
    }
  }

  function character(lookId, seed) {
    const key = `c:${lookId}:${seed}`;
    if (cache.has(key)) return cache.get(key);
    const base = WS.data.looks[lookId] || WS.data.looks.soldier;
    const r = P.rng(seed);
    const pv = (arr, fb) => (arr && arr.length ? arr[Math.floor(r() * arr.length)] : fb);
    const lk = {
      ...base,
      skin: pv(base.skins, base.skin),
      hairColor: pv(base.hairColors, base.hairColor),
      bodyColor: pv(base.bodyColors, base.bodyColor),
      beardColor: pv(base.beardColors, base.beardColor),
    };
    const L = new Layer(CW, CH);
    const gob = !!lk.goblin;
    // 얼굴을 통째로 덮는 투구 — 얼굴 디테일 대신 눈구멍의 빛만 그린다
    const fullHelm = lk.helmet === 'horned' || lk.helmet === 'skull';
    let eyeSkin = null;
    let skin = lk.skin;
    if (lk.helmet === 'hood') skin = shade(skin, -0.45);
    const skinD = shade(skin, -0.3);

    // 맨 뒤: 날개 (요정) — 어깨 뒤로 비친다
    if (lk.wings) {
      const up = [[24, 54], [9, 28], [1, 32], [2, 48], [12, 62]];
      const low = [[22, 60], [5, 64], [6, 78], [18, 72]];
      [up, low].forEach(w => { L.next(); L.poly(w, lk.wings, true); L.next(); L.poly(m(w), lk.wings, true); });
      const vein = shade(lk.wings, -0.22);
      L.flat = true;
      [[22, 54, 6, 34], [20, 61, 8, 70]].forEach(([x0, y0, x1, y1]) => { L.line(x0, y0, x1, y1, vein); L.line(CW - 1 - x0, y0, CW - 1 - x1, y1, vein); });
      L.flat = false;
    }
    // 뒤쪽: 긴 머리 / 후드
    if (lk.hair === 'long') { L.next(); L.rect(23, 26, 26, 30, shade(lk.hairColor, -0.15)); }
    if (lk.helmet === 'hood') { L.next(); L.ellipse(36, 32, 16, 19, lk.hoodColor, true); }

    body(L, lk);
    L.next(); L.rect(31, 42, 10, 10, skinD);
    // 높이 세운 옷깃 (흡혈귀 망토) — 머리 뒤에서 솟는다
    if (lk.collar) {
      const col = [[23, 51], [13, 26], [24, 34], [30, 50]];
      L.next(); L.poly(col, lk.collar, true); L.next(); L.poly(m(col), lk.collar, true);
    }

    // 귀
    if (lk.ears === 'goblin') {
      const ear = [[27, 27], [3, 12], [9, 24], [26, 38]];
      const inner = [[25, 29], [9, 17], [13, 24], [25, 34]];
      L.next(); L.poly(ear, skin, true); L.next(); L.poly(inner, shade(skin, -0.25));
      L.next(); L.poly(m(ear), skin, true); L.next(); L.poly(m(inner), shade(skin, -0.25));
      if (lk.earring) { L.flat = true; L.rect(12, 26, 2, 2, '#e0b040'); L.rect(58, 26, 2, 2, '#e0b040'); L.flat = false; }
    } else if (lk.ears === 'elf') {
      L.next(); L.poly([[26, 30], [18, 23], [26, 37]], skin, true);
      L.next(); L.poly(m([[26, 30], [18, 23], [26, 37]]), skin, true);
    } else if (lk.ears === 'human' && lk.helmet !== 'knight') {
      L.next(); L.ellipse(25, 34, 2.5, 3.5, skin, true);
      L.next(); L.ellipse(47, 34, 2.5, 3.5, skin, true);
    }

    // 기사 투구 (얼굴보다 먼저)
    let fx = 36, fy = 32, frx = 11, fry = 13;
    if (lk.helmet === 'knight') {
      L.next(); L.ellipse(36, 30, 14, 17, lk.helmetColor, true);
      L.next(); L.poly([[36, 14], [40, 7], [49, 3], [55, 6], [48, 10], [42, 16]], lk.plume, true);
      frx = 8; fry = 10; fy = 34;
    }

    // 머리
    L.next();
    if (gob) {
      L.ellipse(36, 29, 12, 13, skin, true);
      L.poly([[25, 32], [47, 32], [43, 45], [36, 48], [29, 45]], skin, true);
    } else if (lk.dragon) {
      // 용(인간의 옷을 걸친 모습): 둥근 정수리 + 길게 내민 주둥이
      L.ellipse(36, 27, 12, 11, skin, true);
      L.next(); L.poly([[27, 31], [45, 31], [44, 42], [40, 48], [32, 48], [28, 42]], shade(skin, 0.06), true);
    } else if (lk.helmet === 'hood') {
      L.ellipse(36, 35, 8, 10, skin, true);
    } else {
      L.ellipse(fx, fy, frx, fry, skin, true);
    }

    // 고블린 코는 입체로
    if (gob) { L.next(); L.poly([[34, 30], [38, 30], [42, 39], [36, 42], [30, 39]], shade(skin, 0.05), true); }

    // 얼굴 디테일 (평면)
    L.next();
    L.flat = true;
    let eyes;
    if (gob) {
      L.line(27, 24, 33, 27, '#23301a'); L.line(45, 24, 39, 27, '#23301a');
      L.rect(29, 28, 4, 2, '#ff4a12'); L.px(30, 28, '#ffe08a');
      L.rect(39, 28, 4, 2, '#ff4a12'); L.px(41, 28, '#ffe08a');
      eyes = [[29, 28, 4, 2], [39, 28, 4, 2]];
      if (lk.paint) { L.rect(27, 32, 5, 1, lk.paint); L.rect(27, 34, 4, 1, lk.paint); L.rect(40, 32, 5, 1, lk.paint); L.rect(41, 34, 4, 1, lk.paint); }
      L.poly([[28, 41], [44, 41], [41, 46], [31, 46]], '#2a0c0c');
      if (lk.mouth === 'grin') {
        for (let x = 30; x <= 42; x += 2) L.px(x, 42, '#efe6c8');
      } else {
        [[30, 42], [30, 43], [42, 42], [42, 43], [33, 42], [39, 42]].forEach(([x, y]) => L.px(x, y, '#efe6c8'));
        [[33, 45], [33, 44], [39, 45], [39, 44]].forEach(([x, y]) => L.px(x, y, '#efe6c8'));
      }
    } else if (fullHelm) {
      eyes = []; // 투구에서 채운다
    } else if (lk.dragon) {
      const eyeC = lk.eyes || '#ffc02a';
      // 비늘: 엇갈린 점무늬
      for (let y = 18; y <= 46; y += 3) {
        for (let x = 25 + ((y / 3) % 2 ? 1 : 0); x <= 47; x += 3) {
          const inHead = ((x - 36) / 12) ** 2 + ((y - 27) / 11) ** 2 < 0.9 || (y > 31 && y < 47 && x > 29 && x < 43);
          if (inHead) L.px(x, y, lk.scales || shade(skin, -0.18));
        }
      }
      L.line(27, 25, 33, 27, skinD); L.line(45, 25, 39, 27, skinD);
      L.rect(28, 28, 5, 2, eyeC); L.rect(30, 28, 1, 2, '#1a0a00');
      L.rect(39, 28, 5, 2, eyeC); L.rect(41, 28, 1, 2, '#1a0a00');
      eyes = [[28, 28, 5, 2], [39, 28, 5, 2]];
      L.px(33, 43, '#2a0a06'); L.px(39, 43, '#2a0a06');
      L.rect(31, 46, 10, 1, '#3a0a0a');
      L.px(32, 47, '#f4efe6'); L.px(39, 47, '#f4efe6');
    } else if (lk.blankFace) {
      // 미지의 종족: 코도 입도 없이 커다란 검은 눈만
      const ey = fy + 1, eyeC = lk.eyes || '#14121e';
      L.poly([[28, ey - 1], [33, ey - 3], [35, ey + 2], [30, ey + 3]], eyeC);
      L.poly([[44, ey - 1], [39, ey - 3], [37, ey + 2], [42, ey + 3]], eyeC);
      L.px(31, ey - 1, '#e8f0ff'); L.px(40, ey - 1, '#e8f0ff');
      L.rect(35, ey + 7, 2, 1, skinD);
      eyes = [[29, ey - 2, 6, 5], [37, ey - 2, 6, 5]];
    } else {
      const ey = fy + 1;
      const eyeC = lk.eyes || '#2a1a12';
      if (lk.glowEyes) {
        // 흰자 없이 빛나는 눈, 치켜 올라간 눈썹
        L.rect(30, ey, 3, 2, eyeC); L.px(31, ey, '#fff8c0');
        L.rect(39, ey, 3, 2, eyeC); L.px(40, ey, '#fff8c0');
        eyes = [[30, ey, 3, 2], [39, ey, 3, 2]];
        L.line(28, ey - 4, 33, ey - 2, lk.brows || shade(skin, -0.5));
        L.line(44, ey - 4, 39, ey - 2, lk.brows || shade(skin, -0.5));
        L.rect(36, ey + 3, 1, 2, skinD); L.px(35, ey + 5, skinD);
        if (lk.mouth === 'smile') { L.rect(33, ey + 8, 6, 1, '#3a0a14'); L.px(32, ey + 7, '#3a0a14'); L.px(39, ey + 7, '#3a0a14'); }
        else L.rect(33, ey + 8, 6, 1, '#3a0a14');
        if (lk.fangs) { L.px(33, ey + 9, '#f4efe6'); L.px(38, ey + 9, '#f4efe6'); }
        if (lk.monocle) {
          [[38, ey - 2], [41, ey - 2], [42, ey], [42, ey + 1], [41, ey + 3], [38, ey + 3], [37, ey], [37, ey + 1], [39, ey - 2], [40, ey - 2], [39, ey + 3], [40, ey + 3]].forEach(([x, y]) => L.px(x, y, '#e0c050'));
          L.line(42, ey + 2, 44, ey + 12, '#c0a040');
        }
      } else if (lk.helmet === 'hood') {
        L.rect(31, 33, 2, 1, eyeC); L.rect(39, 33, 2, 1, eyeC);
        eyes = [[31, 33, 2, 1], [39, 33, 2, 1]];
        L.rect(28, 37, 16, 9, lk.mask);
      } else {
        L.rect(30, ey, 1, 2, '#f4efe6'); L.rect(31, ey, 2, 2, eyeC);
        L.rect(41, ey, 1, 2, '#f4efe6'); L.rect(39, ey, 2, 2, eyeC);
        eyes = [[30, ey, 3, 2], [39, ey, 3, 2]];
        L.rect(29, ey - 3, 4, 1, lk.brows || shade(lk.hairColor || skin, -0.4));
        L.rect(39, ey - 3, 4, 1, lk.brows || shade(lk.hairColor || skin, -0.4));
        L.rect(36, ey + 3, 1, 2, skinD); L.px(35, ey + 5, skinD);
        if (lk.beard !== 'big') {
          if (lk.mouth === 'smile') { L.rect(33, ey + 8, 6, 1, '#7a3a30'); L.px(32, ey + 7, '#7a3a30'); L.px(39, ey + 7, '#7a3a30'); }
          else L.rect(33, ey + 8, 6, 1, '#7a3a30');
        }
        if (lk.wrinkles) { L.rect(27, ey + 3, 2, 1, skinD); L.rect(43, ey + 3, 2, 1, skinD); L.rect(32, ey - 5, 8, 1, skinD); }
        if (lk.scar) L.line(41, ey + 3, 42, ey + 6, '#a0524a');
        if (lk.monocle) {
          [[38, ey - 2], [41, ey - 2], [42, ey], [42, ey + 1], [41, ey + 3], [38, ey + 3], [37, ey], [37, ey + 1], [39, ey - 2], [40, ey - 2], [39, ey + 3], [40, ey + 3]].forEach(([x, y]) => L.px(x, y, '#e0c050'));
          L.line(42, ey + 2, 44, ey + 12, '#c0a040');
        }
      }
    }
    L.flat = false;

    // 얼굴 위 소품: 엄니(오크) / 복면(도적) / 안대(해적)
    if (!gob && !fullHelm && !lk.dragon && lk.helmet !== 'hood') {
      const ey = fy + 1;
      if (lk.tusks) {
        L.flat = true;
        [[32, ey + 8], [32, ey + 7], [32, ey + 6], [40, ey + 8], [40, ey + 7], [40, ey + 6]].forEach(([x, y]) => L.px(x, y, '#efe6c8'));
        L.flat = false;
      }
      if (lk.faceMask) { L.next(); L.poly([[25, ey + 4], [47, ey + 4], [45, ey + 11], [36, ey + 14], [27, ey + 11]], lk.faceMask, true); }
      if (lk.eyepatch) {
        L.next(); L.rect(38, ey - 1, 5, 4, '#1a1210');
        L.flat = true; L.line(25, ey - 5, 38, ey - 1, '#1a1210'); L.line(43, ey, 47, ey + 1, '#1a1210'); L.flat = false;
        eyes = eyes.filter(e => e[0] < 36);
      }
    }

    // 머리카락 / 수염 / 모자
    const hc = lk.hairColor;
    if (lk.hair === 'short' || lk.hair === 'long') {
      L.next(); L.poly([[24, 32], [25, 22], [30, 18], [36, 17], [42, 18], [47, 22], [48, 32], [45, 25], [36, 23], [27, 25]], hc, true);
      if (lk.hair === 'long') { L.next(); L.rect(22, 26, 4, 28, hc); L.next(); L.rect(46, 26, 4, 28, hc); }
    } else if (lk.hair === 'sides') {
      L.next(); L.rect(23, 27, 4, 12, hc); L.next(); L.rect(45, 27, 4, 12, hc);
    }
    if (lk.beard === 'big') {
      const bc = lk.beardColor;
      L.next(); L.poly([[24, 34], [48, 34], [52, 46], [47, 64], [36, 73], [25, 64], [20, 46]], bc, true);
      L.next(); L.ellipse(36, 40, 8, 3, shade(bc, -0.12), true);
      L.next(); L.rect(28, 64, 3, 9, shade(bc, -0.1)); L.next(); L.rect(41, 64, 3, 9, shade(bc, -0.1));
      L.flat = true; L.rect(28, 72, 3, 2, '#e0b040'); L.rect(41, 72, 3, 2, '#e0b040'); L.flat = false;
    } else if (lk.beard === 'small') {
      L.next(); L.poly([[28, 41], [44, 41], [43, 49], [36, 53], [29, 49]], lk.beardColor, true);
    }
    const hat = lk.helmet;
    if (hat === 'kettle') {
      L.next(); L.ellipse(36, 22, 18, 4, lk.helmetColor, true);
      L.next(); L.ellipse(36, 20, 11, 8, lk.helmetColor, true, (x, y) => y <= 21);
    } else if (hat === 'dwarf') {
      L.next(); L.ellipse(36, 26, 14, 11, lk.helmetColor, true, (x, y) => y <= 25);
      L.next(); L.rect(21, 24, 30, 3, shade(lk.helmetColor, -0.1));
      L.next(); L.rect(35, 26, 2, 10, lk.helmetColor);
      const horn = [[23, 22], [15, 16], [11, 5], [17, 11], [25, 18]];
      L.next(); L.poly(horn, '#e6dcc4', true); L.next(); L.poly(m(horn), '#e6dcc4', true);
    } else if (hat === 'widehat') {
      L.next(); L.ellipse(36, 21, 21, 4, lk.hatColor, true);
      L.next(); L.rect(27, 8, 18, 13, lk.hatColor);
      L.flat = true; L.rect(27, 17, 18, 2, '#8a2a3a'); L.flat = false;
    } else if (hat === 'straw') {
      L.next(); L.ellipse(36, 21, 19, 4, '#c9a95a', true);
      L.next(); L.ellipse(36, 17, 9, 6, '#d6b868', true, (x, y) => y <= 20);
    } else if (hat === 'circlet') {
      L.flat = true; L.rect(26, 23, 20, 1, '#e8c050'); L.rect(35, 21, 2, 3, '#4ab0e0'); L.flat = false;
    } else if (hat === 'headband') {
      L.next(); L.rect(25, 23, 22, 3, lk.band);
    } else if (hat === 'cap') {
      L.next(); L.ellipse(36, 19, 10, 6, lk.capColor, true, (x, y) => y <= 20);
      L.next(); L.poly([[40, 14], [46, 6], [48, 10], [44, 16]], shade(lk.capColor, 0.1), true);
    } else if (hat === 'bonecrown') {
      [[26, 18], [31, 14], [36, 12], [41, 14], [46, 18]].forEach(([x, y]) => {
        L.next(); L.poly([[x - 2, y + 4], [x, y - 7], [x + 2, y + 4]], '#e6dcc4', true);
      });
      L.next(); L.rect(24, 19, 24, 3, '#6a3a22');
      L.next(); L.poly([[46, 18], [56, 4], [52, 16]], '#b8322a', true);
    } else if (hat === 'horned') {
      // 마왕군 흑철 투구: 턱가리개 + 가로 눈 트임
      const hc2 = lk.helmetColor, slit = '#0a0608', eyeC = lk.eyes || '#ff5a2a';
      L.next(); L.ellipse(36, 30, 14, 16, hc2, true);
      L.next(); L.poly([[22, 34], [50, 34], [47, 46], [36, 51], [25, 46]], shade(hc2, -0.1), true);
      L.flat = true;
      L.rect(36, 14, 1, 17, shade(hc2, 0.3));
      L.rect(26, 31, 20, 4, slit);
      L.rect(35, 38, 2, 9, slit);
      L.rect(28, 32, 4, 2, eyeC); L.rect(40, 32, 4, 2, eyeC);
      L.flat = false;
      eyes = [[28, 32, 4, 2], [40, 32, 4, 2]];
      eyeSkin = slit;
    } else if (hat === 'skull') {
      // 해골 투구: 눈구멍 속에서 빛만 보인다
      const bone = lk.helmetColor, hole = '#140a0a', eyeC = lk.eyes || '#ff3a2a';
      L.next(); L.ellipse(36, 29, 13, 14, bone, true);
      L.next(); L.poly([[27, 38], [45, 38], [43, 48], [29, 48]], shade(bone, -0.08), true);
      L.flat = true;
      L.ellipse(31, 31, 3.5, 3, hole); L.ellipse(41, 31, 3.5, 3, hole);
      L.rect(30, 31, 2, 1, eyeC); L.rect(40, 31, 2, 1, eyeC);
      L.poly([[35, 36], [38, 36], [36.5, 39]], hole);
      for (let x = 30; x <= 42; x += 2) L.rect(x, 43, 1, 3, hole);
      L.rect(29, 40, 14, 1, shade(bone, -0.3));
      L.flat = false;
      eyes = [[30, 31, 2, 1], [40, 31, 2, 1]];
      eyeSkin = hole;
    } else if (hat === 'pointy') {
      // 마법사 고깔모자 (끝이 꺾였다)
      const hc2 = lk.hatColor;
      L.next(); L.ellipse(36, 21, 20, 4, hc2, true);
      L.next(); L.poly([[26, 21], [46, 21], [41, 10], [45, 3], [50, 1], [39, 4], [31, 11]], hc2, true);
      L.flat = true; L.rect(28, 17, 17, 2, lk.trim || '#e0c050'); L.px(36, 12, '#fff0a0'); L.px(33, 15, '#fff0a0'); L.px(40, 8, '#fff0a0'); L.flat = false;
    } else if (hat === 'tricorn') {
      const tc = lk.hatColor || '#1e1a1e', edge = lk.trim || '#c8a040';
      L.next(); L.poly([[16, 24], [56, 24], [51, 13], [36, 16], [21, 13]], tc, true);
      L.flat = true;
      L.line(16, 24, 21, 13, edge); L.line(56, 24, 51, 13, edge);
      L.rect(34, 18, 4, 3, '#e8e0d0'); L.px(35, 19, '#1a1210'); L.px(36, 19, '#1a1210');
      L.flat = false;
    } else if (hat === 'crown') {
      const gold = lk.crownColor || '#e0b040';
      L.next(); L.rect(27, 17, 18, 5, gold);
      [28, 32, 36, 40, 44].forEach(x => { L.next(); L.poly([[x - 2, 18], [x, 10], [x + 2, 18]], gold, true); });
      L.flat = true; L.px(36, 19, '#c0283a'); L.px(30, 19, '#3a6ad0'); L.px(42, 19, '#3a6ad0'); L.flat = false;
    } else if (hat === 'mitre') {
      const mc = lk.hatColor || '#f0ece0', gold = lk.trim || '#d8a830';
      L.next(); L.poly([[27, 22], [45, 22], [43, 9], [36, 1], [29, 9]], mc, true);
      L.flat = true; L.rect(35, 3, 2, 19, gold); L.rect(28, 19, 16, 2, gold); L.flat = false;
    } else if (hat === 'turban') {
      const tc = lk.hatColor || '#e8dcc0';
      L.next(); L.ellipse(36, 21, 14, 6, tc, true);
      L.next(); L.ellipse(36, 15, 11, 6, shade(tc, 0.08), true);
      L.flat = true; L.line(26, 19, 44, 13, shade(tc, -0.25)); L.rect(35, 17, 3, 3, '#3ab0a0'); L.px(36, 17, '#c0fff0'); L.flat = false;
    } else if (hat === 'bandana') {
      const bc = lk.hatColor || '#a0282a';
      L.next(); L.ellipse(36, 24, 12.5, 7.5, bc, true, (x, y) => y <= 25);
      L.next(); L.poly([[45, 21], [55, 24], [52, 31], [46, 25]], shade(bc, -0.1), true);
      L.flat = true; [[30, 20], [38, 19], [42, 22], [34, 23]].forEach(([x, y]) => L.px(x, y, '#f0e8d8')); L.flat = false;
    }

    // 고글 (연금술사·골렘 기술자): 이마에 올리거나('forehead') 눈에 쓴다('eyes')
    if (lk.goggles) {
      const gy = lk.goggles === 'eyes' ? fy + 2 : fy - 8;
      L.next(); L.rect(24, gy - 1, 24, 2, '#4a3020');
      L.next(); L.ellipse(31, gy, 4, 3.5, '#b8862e', true);
      L.next(); L.ellipse(41, gy, 4, 3.5, '#b8862e', true);
      L.flat = true; L.rect(30, gy - 1, 3, 2, '#8ad8e0'); L.rect(40, gy - 1, 3, 2, '#8ad8e0'); L.px(30, gy - 1, '#e8ffff'); L.px(40, gy - 1, '#e8ffff'); L.flat = false;
      if (lk.goggles === 'eyes') eyes = [];
    }

    // 뿔 (모자·투구 위로 솟는다)
    if (lk.horns && HORNS[lk.horns]) {
      const hornC = lk.hornColor || '#2a2024';
      const pts = HORNS[lk.horns];
      L.next(); L.poly(pts, hornC, true);
      L.next(); L.poly(m(pts), hornC, true);
    }

    const sprite = { canvas: L.bake(), eyes, skin: lk.helmet === 'hood' ? lk.hoodColor : skin, eyeSkin: eyeSkin || skin, w: CW, h: CH, lookId };
    cache.set(key, sprite);
    return sprite;
  }

  // ───────── 아이템 (카운터 위에 눕힌 모습, 56x20) ─────────
  function sword(L, blade, edge, guard, grip, pommel, wide) {
    L.next(); L.poly(wide ? [[18, 6], [48, 6], [53, 9.5], [48, 13], [18, 13]] : [[18, 7.5], [48, 7.5], [52, 9.5], [48, 11.5], [18, 11.5]], blade, true);
    L.flat = true; L.rect(20, wide ? 9 : 9, 26, 1, edge); L.flat = false;
    L.next(); L.rect(14, wide ? 2 : 4, 4, wide ? 15 : 11, guard);
    L.next(); L.rect(6, 8, 8, 3, grip);
    L.flat = true; [7, 10, 13].forEach(x => L.px(x, 8, shade(grip, 0.3))); L.flat = false;
    L.next(); L.ellipse(4, 9.5, 2.8, 2.8, pommel, true);
  }

  const itemDraw = {
    iron_sword: L => sword(L, '#c6ced8', '#8a949e', '#7a6a58', '#5a3a22', '#b89040'),
    red_blade: L => sword(L, '#b8322a', '#ffb0a0', '#2a2020', '#3a1a1a', '#b8322a'),
    dwarf_steel_sword: L => sword(L, '#8fb0c8', '#6ef0ff', '#e0b040', '#2a2a3a', '#e0b040', true),
    bow: L => {
      L.next();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const y = 5 + Math.round(10 * (1 - (2 * t - 1) ** 2));
        L.rect(6 + i, y, 1, 3, '#8a5a2e');
      }
      L.flat = true; L.line(6, 6, 46, 6, '#e8e0c8'); L.flat = false;
      L.next(); L.rect(23, 13, 6, 5, '#4a2e1a');
    },
    shield: L => {
      L.next(); L.ellipse(28, 10, 14, 9, '#9aa4ae', true);
      L.next(); L.ellipse(28, 10, 12, 7.5, '#8a5a2e', true);
      L.flat = true; [22, 28, 34].forEach(x => L.rect(x, 3, 1, 15, '#5e3a1c')); L.flat = false;
      L.next(); L.ellipse(28, 10, 3.5, 2.5, '#c0c8d0', true);
    },
    iron_ore: L => {
      [[16, 12, 7, 5], [27, 10, 8, 6], [37, 13, 6, 4], [24, 15, 5, 3]].forEach(([x, y, rx, ry]) => { L.next(); L.ellipse(x, y, rx, ry, '#6a6560', true); });
      L.flat = true; [[14, 11], [25, 8], [29, 12], [36, 12], [18, 14]].forEach(([x, y]) => L.px(x, y, '#b8622d')); [[24, 7], [13, 9]].forEach(([x, y]) => L.px(x, y, '#d8d4cc')); L.flat = false;
    },
    potion: L => {
      L.next(); L.ellipse(22, 10, 9, 7.5, '#c0283a', true);
      L.next(); L.rect(30, 7, 6, 6, '#a8c8d0');
      L.next(); L.rect(36, 7, 4, 6, '#b08050');
      L.flat = true; L.rect(17, 6, 3, 1, '#ffd0d8'); L.px(16, 7, '#ffd0d8'); L.flat = false;
    },
    silver_sword: L => {
      sword(L, '#e8eef4', '#a8c8ff', '#d8d0c0', '#3a4a7a', '#c8d8f0');
      // 칼자루의 작은 성표
      L.flat = true; L.rect(15, 9, 2, 1, '#fff8d0'); L.rect(15.5, 8, 1, 3, '#fff8d0'); L.flat = false;
    },
    mana_crystal: L => {
      L.next(); L.ellipse(29, 17, 17, 2.5, '#4a3a4a', true);
      [[[14, 17], [17, 9], [21, 17]], [[20, 17], [24, 4], [29, 17]], [[27, 17], [33, 1], [38, 17]], [[36, 17], [41, 8], [44, 17]]]
        .forEach((pts, i) => { L.next(); L.poly(pts, ['#7a3ac0', '#9a5ae0', '#b070ff', '#8a4ad0'][i], true); });
      L.flat = true; [[32, 5], [33, 8], [24, 7], [41, 11]].forEach(([x, y]) => L.px(x, y, '#f0d8ff')); L.flat = false;
    },
    cursed_ring: L => {
      // 가운데가 빈 금반지 (고리) + 검붉은 보석
      L.next();
      for (let y = 3; y <= 18; y++) {
        for (let x = 16; x <= 40; x++) {
          const nx = (x + 0.5 - 28) / 11, ny = (y + 0.5 - 11.5) / 6.5;
          const ix = (x + 0.5 - 28) / 7.5, iy = (y + 0.5 - 11.5) / 3.5;
          if (nx * nx + ny * ny > 1 || ix * ix + iy * iy < 1) continue;
          L.px(x, y, ny < -0.2 ? '#e0b848' : ny < 0.5 ? '#b89030' : '#7a5a1e');
        }
      }
      L.next(); L.ellipse(28, 5, 3.5, 3, '#4a0a2a', true);
      L.flat = true; L.px(27, 4, '#ff3a6a'); [[22, 16], [31, 17], [35, 15]].forEach(([x, y]) => L.px(x, y, '#2a1a10')); L.flat = false;
    },
    abyss_pearl: L => {
      L.next(); L.ellipse(28, 14, 15, 4, '#5a1a3a', true);
      L.flat = true; L.rect(15, 14, 26, 1, '#8a3a5a'); L.flat = false;
      L.next(); L.ellipse(28, 9, 6.5, 6.5, '#1a1422', true);
      L.flat = true; L.px(25, 6, '#9a8ab8'); L.px(26, 6, '#6a5a88'); L.px(25, 7, '#6a5a88'); L.px(31, 13, '#6a3a8a'); L.flat = false;
    },

    // ───────── 확장 세력 물건 ─────────
    holy_water: L => {
      // 둥근 유리병 + 금빛 성표
      L.next(); L.ellipse(24, 11, 9, 7, '#a8d8f0', true);
      L.next(); L.rect(32, 8, 7, 6, '#d8e8f0');
      L.next(); L.rect(39, 8, 3, 6, '#d8b060');
      L.flat = true; L.rect(23, 7, 2, 8, '#f0d060'); L.rect(20, 9, 8, 2, '#f0d060'); L.px(18, 7, '#ffffff'); L.px(19, 7, '#ffffff'); L.flat = false;
    },
    silver_arrow: L => {
      [5, 9, 13].forEach((y, i) => {
        L.next(); L.rect(11 + i, y, 33, 2, '#8a5a2e');
        L.next(); L.poly([[44 + i, y - 2], [51 + i, y + 1], [44 + i, y + 4]], '#e8eef8', true);
        L.next(); L.poly([[6 + i, y - 2], [13 + i, y], [13 + i, y + 2], [6 + i, y + 4]], '#e8e0d0', true);
      });
      L.flat = true; L.px(47, 4, '#ffffff'); L.px(48, 8, '#ffffff'); L.flat = false;
    },
    sun_charm: L => {
      L.flat = true; L.line(6, 3, 19, 9, '#6a4a2a'); L.line(50, 3, 37, 9, '#6a4a2a'); L.flat = false;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const at = (r, rr, d) => [28 + Math.cos(a + d) * r, 11 + Math.sin(a + d) * rr];
        L.next(); L.poly([at(6, 5, -0.3), at(11, 8.5, 0), at(6, 5, 0.3)], '#e0a030', true);
      }
      L.next(); L.ellipse(28, 11, 6, 5, '#f0b838', true);
      L.flat = true; L.px(26, 9, '#fff4c0'); L.px(27, 9, '#fff4c0'); L.px(26, 10, '#fff4c0'); L.flat = false;
    },
    bone_dust: L => {
      // 뼛가루 자루 + 뼈 한 토막
      L.next(); L.ellipse(21, 12, 11, 7, '#8a7a5a', true);
      L.next(); L.poly([[15, 6], [27, 6], [25, 2], [17, 2]], '#7a6a4a', true);
      L.flat = true; L.rect(16, 6, 10, 1, '#4a3a22'); L.flat = false;
      L.next(); L.ellipse(40, 17, 10, 2, '#e0d8c4', true);
      L.next(); L.rect(35, 9, 13, 3, '#e8e0cc');
      L.next(); L.ellipse(35, 10.5, 2.5, 2.5, '#e8e0cc', true);
      L.next(); L.ellipse(48, 10.5, 2.5, 2.5, '#e8e0cc', true);
    },
    dragon_scale: L => {
      L.next(); L.poly([[10, 10], [21, 1], [41, 1], [51, 10], [41, 19], [21, 19]], '#b8321e', true);
      L.flat = true;
      [[19, 5, 24], [16, 10, 30], [19, 15, 24]].forEach(([x, y, w]) => L.rect(x, y, w, 1, '#e8683a'));
      L.rect(22, 3, 7, 1, '#ffb070');
      L.flat = false;
      L.next(); L.ellipse(31, 10, 4, 3, '#7a1a10', true);
    },
    black_powder: L => {
      // 화약통 + 도화선
      L.next(); L.ellipse(25, 10, 13, 8, '#6a4424', true);
      L.flat = true; [15, 25, 35].forEach(x => L.rect(x, 3, 2, 15, '#3a3a3a')); L.flat = false;
      L.next(); L.ellipse(39, 10, 3, 7, '#8a5a30', true);
      L.flat = true; L.line(40, 9, 49, 4, '#c8b890'); L.px(50, 3, '#ff9a2a'); L.px(51, 2, '#ffe060'); L.px(49, 2, '#ff5a1a'); L.flat = false;
      L.next(); L.ellipse(13, 18, 5, 1.5, '#1a1a1a', true);
    },
    alchemy_reagent: L => {
      L.next(); L.ellipse(19, 12, 8, 6.5, '#4ac060', true);
      L.next(); L.rect(26, 9, 6, 5, '#c8e0d8');
      L.next(); L.rect(32, 9, 3, 5, '#6a4a2a');
      L.next(); L.rect(38, 4, 13, 4, '#e8b030');
      L.next(); L.rect(38, 12, 13, 4, '#a040c0');
      L.flat = true;
      L.px(16, 9, '#d0ffd8'); L.px(21, 14, '#2a8040'); L.px(23, 11, '#2a8040');
      L.rect(38, 4, 1, 4, '#f0f0f0'); L.rect(38, 12, 1, 4, '#f0f0f0');
      L.flat = false;
    },
    golem_core: L => {
      // 청동 톱니 + 가운데 푸른 결정
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        L.next(); L.rect(Math.round(28 + Math.cos(a) * 10) - 1, Math.round(10 + Math.sin(a) * 8) - 1, 3, 3, '#a8742e');
      }
      L.next(); L.ellipse(28, 10, 9, 7.5, '#c08a3a', true);
      L.next(); L.ellipse(28, 10, 4.5, 4, '#3ab0e0', true);
      L.flat = true; L.px(27, 8, '#e0ffff'); L.px(29, 9, '#b0f0ff'); L.flat = false;
    },
    sea_pearl: L => {
      L.next(); L.ellipse(28, 14, 16, 5, '#8a8a98', true);
      L.next(); L.ellipse(28, 12, 13, 4, '#d8c8d0', true);
      L.next(); L.ellipse(28, 9, 5, 5, '#f4d8e0', true);
      L.flat = true; L.px(26, 7, '#ffffff'); L.px(27, 7, '#ffffff'); [14, 20, 36, 42].forEach(x => L.px(x, 16, '#5a5a68')); L.flat = false;
    },
    fairy_dust: L => {
      L.next(); L.rect(20, 6, 14, 12, '#c8e8f8');
      L.next(); L.rect(22, 2, 10, 4, '#a07a4a');
      L.flat = true;
      L.rect(21, 11, 12, 6, '#f0c0ff');
      [[23, 12], [28, 14], [31, 11], [25, 15]].forEach(([x, y]) => L.px(x, y, '#ffffff'));
      [[40, 5], [44, 9], [38, 12], [14, 8], [46, 14], [11, 14]].forEach(([x, y]) => { L.px(x, y, '#fff0a0'); L.px(x + 1, y, '#f0c0ff'); });
      L.flat = false;
    },
    war_axe: L => {
      L.next(); L.rect(4, 9, 40, 3, '#6a4424');
      L.flat = true; [8, 12, 16].forEach(x => L.rect(x, 9, 1, 3, '#3a2414')); L.flat = false;
      L.next(); L.poly([[40, 2], [46, 6], [52, 1], [54, 10], [52, 19], [46, 14], [40, 18], [42, 10]], '#9aa4ae', true);
      L.flat = true; L.line(53, 3, 53, 17, '#e0e8f0'); L.flat = false;
    },
    crossbow: L => {
      L.next(); L.poly([[6, 9], [40, 8], [42, 12], [6, 13], [3, 16], [2, 11]], '#7a4a26', true);
      L.next(); L.poly([[38, 1], [42, 2], [44, 10], [42, 18], [38, 19], [40, 10]], '#8a949e', true);
      L.flat = true;
      L.line(39, 2, 30, 10, '#e8e0c8'); L.line(30, 10, 39, 18, '#e8e0c8');
      L.rect(22, 9, 20, 1, '#c8c0a8'); L.rect(18, 13, 3, 4, '#3a2a1a');
      L.flat = false;
    },
    plate_armor: L => {
      L.next(); L.poly([[16, 3], [40, 3], [44, 8], [42, 18], [14, 18], [12, 8]], '#b8c0ca', true);
      L.next(); L.ellipse(11, 6, 6, 4, '#a0a8b2', true);
      L.next(); L.ellipse(45, 6, 6, 4, '#a0a8b2', true);
      L.flat = true; L.rect(28, 4, 1, 14, '#7a848e'); L.rect(16, 12, 24, 1, '#7a848e'); L.rect(21, 5, 3, 1, '#f0f4f8'); L.flat = false;
    },
    star_shard: L => {
      L.next(); L.poly([[28, 1], [33, 9], [30, 19], [24, 11]], '#b8d8ff', true);
      L.next(); L.poly([[33, 9], [40, 12], [30, 19]], '#7a9ae0', true);
      L.flat = true;
      L.px(28, 5, '#ffffff'); L.px(27, 7, '#ffffff');
      [[16, 6], [42, 4], [18, 15], [45, 16], [12, 10]].forEach(([x, y]) => L.px(x, y, '#e0f0ff'));
      L.flat = false;
    },
    eastern_spice: L => {
      L.next(); L.ellipse(21, 13, 12, 6, '#c89a4a', true);
      L.next(); L.ellipse(21, 9, 9, 3, '#c0381e', true);
      L.flat = true; [[16, 8], [21, 7], [25, 9]].forEach(([x, y]) => L.px(x, y, '#ff7a3a')); L.rect(11, 14, 20, 1, '#8a6a2a'); L.flat = false;
      L.next(); L.poly([[37, 12], [49, 9], [53, 11], [41, 15]], '#c0281e', true);
      L.next(); L.rect(34, 11, 3, 3, '#3a7a2a');
    },
  };

  // 제미나이로 따로 뽑은 물건 그림 (assets/items/*.png) — 있으면 코드로 그린 것 대신 쓴다
  const ART_IDS = ['diamond', 'ruby', 'sapphire', 'emerald', 'pearl', 'abyss_pearl', 'sea_pearl', 'amethyst', 'topaz',
    'iron_sword', 'bow', 'war_axe', 'iron_spear', 'shield', 'plate_armor', 'iron_helmet', 'potion', 'mana_potion'];
  const art = {};
  ART_IDS.forEach(id => { const img = new Image(); img.src = `assets/items/${id}.png`; art[id] = img; });
  const artReady = id => art[id] && art[id].complete && art[id].naturalWidth;
  const artList = () => ART_IDS.map(id => art[id]);

  function item(id) {
    const key = `i:${id}`;
    if (cache.has(key)) return cache.get(key);
    if (art[id] && !artReady(id)) { // 그림이 아직 안 왔으면 임시로 그려 주고 캐시는 하지 않는다
      const L = new Layer(56, 20);
      (itemDraw[id] || itemDraw.iron_ore)(L);
      return L.bake();
    }
    let cv;
    if (art[id]) {
      // 테이블에 놓이는 56×20 칸 안에 들어가게 줄여, 바닥에 맞춰 가운데 앉힌다
      cv = document.createElement('canvas');
      cv.width = 56; cv.height = 20;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = true;
      const img = art[id];
      const k = Math.min(54 / img.naturalWidth, 19 / img.naturalHeight);
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      g.drawImage(img, Math.round((56 - w) / 2), 20 - h, w, h);
    } else {
      const L = new Layer(56, 20);
      (itemDraw[id] || itemDraw.iron_ore)(L);
      cv = L.bake();
    }
    cache.set(key, cv);
    return cv;
  }

  // UI용 아이콘 (dataURL)
  function itemIcon(id) {
    if (art[id]) return `assets/items/${id}.png`; // 큰 그림 그대로 (UI 칸은 넉넉하다)
    const key = `icon:${id}`;
    if (cache.has(key)) return cache.get(key);
    const url = item(id).toDataURL();
    cache.set(key, url);
    return url;
  }

  function coin() {
    if (cache.has('coin')) return cache.get('coin');
    const L = new Layer(9, 6);
    L.next(); L.ellipse(4.5, 3, 3.6, 2.4, '#e8b83a', true);
    L.flat = true; L.px(3, 2, '#fff0a0'); L.flat = false;
    const cv = L.bake();
    cache.set('coin', cv);
    return cv;
  }

  // 플레이어의 손 (왼손 기준, 오른손은 좌우 반전해서 그린다)
  function playerHand() {
    if (cache.has('phand')) return cache.get('phand');
    const L = new Layer(50, 50);
    const skin = '#d49a74';
    // 소매
    L.next(); L.capsule(2, 58, 12, 38, 9, '#3e2a1e', true);
    L.flat = true; L.line(4, 32, 21, 42, '#6a4a30'); L.flat = false;
    // 손등
    L.next(); L.poly([[12, 34], [17, 24], [30, 20], [36, 25], [34, 34], [22, 40]], skin, true);
    // 손가락: 앞(화면 위)을 향해 조금 안쪽으로
    [[19, 24, 19, 14, 2], [23.5, 22, 24.5, 11, 2.1], [28, 21.5, 29.5, 11, 2], [32, 23, 34, 14, 1.8]].forEach(([x0, y0, x1, y1, r]) => {
      L.next(); L.capsule(x0, y0, x1, y1, r, skin, true);
      L.flat = true; L.px(x1, y1 - 1, '#f0cdb4'); L.flat = false;
    });
    // 엄지는 몸 안쪽으로
    L.next(); L.capsule(33, 31, 42, 27, 2.3, skin, true);
    const cv = L.bake();
    cache.set('phand', cv);
    return cv;
  }

  // 카운터에 올린 손님의 손
  function customerHand(skin) {
    const key = `ch:${skin}`;
    if (cache.has(key)) return cache.get(key);
    const L = new Layer(16, 11);
    L.next(); L.ellipse(8, 4, 7, 3.5, skin, true);
    [3, 6.3, 9.6, 12.8].forEach(x => { L.next(); L.ellipse(x, 7.5, 1.6, 3, skin, true); });
    const cv = L.bake();
    cache.set(key, cv);
    return cv;
  }

  // AI로 뽑은 스프라이트 시트 (js/data/sheets.js). 외형 id 로 찾고, 없으면 null
  function sheet(lookId) {
    const meta = WS.data.sheets && WS.data.sheets[lookId];
    if (!meta) return null;
    const key = `s:${lookId}`;
    if (cache.has(key)) return cache.get(key);
    const img = new Image();
    img.src = meta.src;
    const look = WS.data.looks[lookId] || {};
    const spr = {
      isSheet: true, img, fw: meta.fw, fh: meta.fh, w: meta.fw, h: meta.fh,
      frames: meta.frames, skin: look.skin || (look.skins && look.skins[0]) || '#c89070',
    };
    cache.set(key, spr);
    return spr;
  }

  return { character, sheet, item, itemIcon, coin, playerHand, customerHand, artList, CW, CH };
})();

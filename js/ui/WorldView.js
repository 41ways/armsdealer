// 장부 안의 대륙 쪽들 — 2쪽 오른쪽: 달력(달력을 산 판만)과 최근 사건 / 3쪽: 대륙 지도(지도를 산 판만) / 4쪽: 대륙 정세(평판지를 산 판만, 정보통은 평판·왕국 우세도 변화).
// 계산은 WS.sys.Intel(js/systems/Intel.js), 문구·좌표는 WS.data.intel. 여기서는 HTML 만 만든다 — 게임 상태를 바꾸지 않는다.
// UIManager.ledgerSpreads 가 pages() 를 불러 쪽에 끼운다. 4쪽의 세력 줄은 항목이 많아지면 그 쪽 안에서 스크롤한다 (.wl-scroll).
WS.WorldView = (() => {
  const S = () => WS.Game.state;
  const esc = s => WS.util.esc(s);
  const TONE_COLOR = { hostile: '#a3261a', cold: '#6d7f96', neutral: '#b59a62', warm: '#5f8f4a', bond: '#c8981f', none: '#8a7a62' };
  const ARW = { 1: ['up', '▲'], '-1': ['down', '▼'], 0: ['flat', '—'] };

  const owned = k => !!(WS.sys.Shop && WS.sys.Shop.owned(k));
  const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
  const dcls = n => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');
  function row(r) {
    const segs = [0, 1, 2, 3, 4].map(i => `<i class="${!r.blur && i <= r.level ? 'on' : ''}"></i>`).join('');
    const a = ARW[r.arrow];
    // 평판지: 정확한 숫자 — 힘 0~100 · 5일 변화 · 우호도 원값
    const num = owned('reputationMap') && !r.blur && r.num;
    const numHtml = num ? `<span class="wl-num" title="세력 힘 0~100 환산 · 최근 5일 변화"><b>${num.pct}</b>${num.delta === null ? '' : `<i class="wl-d ${dcls(num.delta)}">${sgn(num.delta)}</i>`}</span>` : '';
    return `<li class="wl-row ${r.blur ? 'blur' : ''} ${num ? 'has-num' : ''}" style="--fc:${r.color}" data-power="${r.id}">
      <span class="wl-name"><i class="wl-ico" aria-hidden="true">${r.icon}</i>${esc(r.label)}</span>
      ${r.rel ? `<span class="wl-rel tone-${r.rel.tone}" title="내 가게와의 우호도">${r.rel.word}${num && num.rel !== null ? ` <b>${sgn(num.rel)}</b>` : ''}</span>` : '<span class="wl-rel none"></span>'}
      <span class="wl-word">${esc(r.word)}${r.blur ? '' : ` <b class="wl-arw ${a[0]}" title="최근 5일 추세">${a[1]}</b>`}</span>
      <span class="wl-bar" role="img" aria-label="${esc(r.word)}">${segs}</span>${numHtml}
    </li>`;
  }

  // ───────── 지도 (SVG · 양피지 위 잉크) ─────────
  // 좌표계: 장소 좌표는 WS.data.intel.map (0~420 × 0~300) 그대로, 그릴 때 fx · fy 로 옮겨 쪽을 꽉 채우는 440 × 540 판에 얹는다.
  const MW = 440, MH = 540;
  const fx = x => Math.round(x + 10), fy = y => Math.round(46 + y * 1.5);
  const INK = '#2a1c10';
  // 점들을 부드러운 곡선으로 (Catmull-Rom → Bézier)
  function smooth(pts, closed) {
    const n = pts.length, g = i => pts[((i % n) + n) % n];
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = closed ? g(i - 1) : pts[Math.max(0, i - 1)], p1 = g(i), p2 = g(i + 1), p3 = closed ? g(i + 2) : pts[Math.min(n - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d + (closed ? 'Z' : '');
  }
  const P2 = pts => pts.map(([x, y]) => [fx(x), fy(y)]);
  const COAST = P2([[22, 66], [40, 38], [84, 26], [130, 34], [172, 20], [226, 16], [284, 26], [336, 18], [384, 24], [406, 46], [402, 86], [410, 128], [398, 170], [408, 212], [400, 254],
    [372, 280], [334, 286], [304, 274], [276, 286], [256, 292], [240, 282], [228, 264], [210, 272], [192, 290], [160, 286], [130, 274], [98, 288], [68, 284], [42, 270], [24, 238], [32, 196], [18, 152], [30, 106]]);
  const RIVER1 = P2([[342, 122], [320, 156], [302, 194], [284, 222], [262, 244], [240, 262], [230, 272]]);
  const RIVER2 = P2([[126, 86], [110, 122], [98, 158], [72, 194], [40, 212], [30, 218]]);

  const peak = (x, y, s = 1) => `<path d="M${x - 9 * s} ${y} L${x - 2 * s} ${y - 15 * s} L${x + 3 * s} ${y - 8 * s} L${x + 6 * s} ${y - 13 * s} L${x + 10 * s} ${y}Z" fill="rgba(255,246,214,.35)"/><path d="M${x - 2 * s} ${y - 15 * s} L${x + 1 * s} ${y - 3 * s} M${x + 6 * s} ${y - 13 * s} L${x + 4 * s} ${y - 2 * s}" />`;
  const tree = (x, y) => `<path d="M${x} ${y - 10} L${x - 5.5} ${y - 1} L${x + 5.5} ${y - 1}Z M${x} ${y - 5} L${x - 6.5} ${y + 3} L${x + 6.5} ${y + 3}Z M${x} ${y + 3} L${x} ${y + 7}" fill="rgba(95,143,74,.28)"/>`;
  const wave = (x, y) => `<path d="M${x} ${y} q4 -4.5 8 0 t8 0 t8 0" />`;
  const ship = (x, y) => `<g class="wm-ship" transform="translate(${x} ${y})"><path d="M-9 0 L9 0 L6 5 L-6 5Z M0 0 L0 -13 M0 -12 L9 -3 L0 -3Z" fill="rgba(255,246,214,.6)"/></g>`;

  function mapSvg(m) {
    const T = p => ({ ...p, x: fx(p.x), y: fy(p.y) });
    const places = m.places.map(T);
    const at = id => places.find(p => p.id === id);
    const coast = smooth(COAST, true);
    const landscape = `<g fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity=".6">
      ${[[336, 90], [352, 84, 1.25], [368, 92], [344, 114], [366, 120, 1.1], [382, 108, .9]].map(([x, y, s]) => peak(fx(x), fy(y), s)).join('')}
      ${[[74, 52], [88, 44, 1.2], [112, 52], [122, 70, .9], [66, 72, .9]].map(([x, y, s]) => peak(fx(x), fy(y), s)).join('')}
      ${[[380, 64, .8], [402, 60, 1]].map(([x, y, s]) => peak(fx(x), fy(y), s)).join('')}
      ${[[34, 136], [48, 146], [40, 174], [76, 184], [88, 150], [58, 198], [24, 168]].map(([x, y]) => tree(fx(x), fy(y))).join('')}
      ${[[350, 226], [396, 224], [360, 262], [390, 266], [338, 248]].map(([x, y]) => tree(fx(x), fy(y))).join('')}
      ${[[150, 60], [166, 70], [230, 66], [220, 84]].map(([x, y]) => tree(fx(x), fy(y))).join('')}
    </g>`;
    const rivers = `<g fill="none" stroke="#5c7f96" stroke-width="2.6" stroke-linecap="round" opacity=".7"><path d="${smooth(RIVER1, false)}"/><path d="${smooth(RIVER2, false)}"/></g>
      <ellipse cx="${fx(292)}" cy="${fy(84)}" rx="18" ry="9" fill="rgba(110,150,170,.4)" stroke="#5c7f96" stroke-width="1.6" opacity=".8"/>`;
    const roads = m.places.filter(pl => pl.id !== 'capital' && !['scale', 'mount_n', 'ash', 'waste_n', 'grave'].includes(pl.id) || pl.id === 'waste_n').map(pl => {
      const a = at('capital'), b = at(pl.id);
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.08, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.08;
      return `<path d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}"/>`;
    }).join('');
    const seaWaves = [[42, 318], [96, 322], [150, 318], [204, 322], [318, 318], [366, 310], [14, 250], [8, 120], [418, 150], [420, 240]].map(([x, y]) => wave(fx(x) - 4, fy(y))).join('');
    const shades = m.shades.filter(s => s.p).map(s => { const p = at(s.place); return `<g class="wm-shade"><circle cx="${p.x}" cy="${p.y}" r="38" fill="${s.color}" opacity=".22" stroke="${s.color}" stroke-width="1.4" stroke-dasharray="4 3"/><text x="${p.x}" y="${p.y + 42}" text-anchor="middle" class="wm-tag" fill="${s.color}">${esc(s.label)}</text></g>`; }).join('');
    const trim = (a, b, d) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return [a.x + dx / L * d, a.y + dy / L * d, b.x - dx / L * d, b.y - dy / L * d]; };
    const fronts = m.fronts.filter(f => f.a && f.b).map(f => {
      const [x1, y1, x2, y2] = trim(at(f.from), at(f.to), 19);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return `<g class="wm-front ${f.cls}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#wv-arw-${f.cls})"/><text x="${mx}" y="${my - 7}" text-anchor="middle" class="wm-flabel">${esc(f.label)}</text></g>`;
    }).join('');
    const mark = pl => {
      const r = pl.big ? 16 : 12.5;
      if (!pl.known) return `<g class="wm-place unk"><circle cx="${pl.x}" cy="${pl.y}" r="${r - 1}" /><text x="${pl.x}" y="${pl.y + 5}" text-anchor="middle" class="wm-q">?</text></g>`;
      const col = TONE_COLOR[pl.tone] || TONE_COLOR.none;
      const note = m.notes.find(n => n.place === pl.id);
      return `<g class="wm-place tone-${pl.tone}" data-place="${pl.id}"><title>${esc(pl.label)}${pl.rel ? ' — ' + pl.rel.word : ''}</title>
        <circle cx="${pl.x + 1.2}" cy="${pl.y + 2}" r="${r}" fill="rgba(42,28,16,.35)"/>
        <circle cx="${pl.x}" cy="${pl.y}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="1.8"/>
        <circle cx="${pl.x}" cy="${pl.y}" r="${r - 3}" fill="none" stroke="rgba(255,246,224,.5)" stroke-width="1"/>
        ${pl.big ? `<circle cx="${pl.x}" cy="${pl.y}" r="${r + 4}" fill="none" stroke="${INK}" stroke-width="1.1"/>` : ''}
        <text x="${pl.x}" y="${pl.y + 5}" text-anchor="middle" class="wm-glyph">${esc(pl.glyph)}</text>
        <text x="${pl.x}" y="${pl.y + r + 14}" text-anchor="middle" class="wm-name">${esc(pl.label)}</text>
        ${note ? `<text x="${pl.x}" y="${pl.y - r - 6}" text-anchor="middle" class="wm-tag" fill="#8a1e14">${esc(note.text)}</text>` : ''}</g>`;
    };
    const compass = `<g class="wm-compass" transform="translate(${MW - 46} ${MH - 44})" fill="none" stroke="${INK}" stroke-width="1.2">
      <circle r="22" opacity=".55"/><circle r="17" opacity=".35"/>
      <path d="M0 -30 L5 -5 L0 0 L-5 -5Z M0 30 L5 5 L0 0 L-5 5Z" fill="${INK}" opacity=".7"/><path d="M-30 0 L-5 -5 L0 0 L-5 5Z M30 0 L5 -5 L0 0 L5 5Z" fill="${INK}" opacity=".35"/>
      <path d="M0 -30 L5 -5 L0 0Z" fill="#a3261a" stroke="none"/><text y="-34" text-anchor="middle" class="wm-tag" fill="${INK}" stroke="none">북</text></g>`;
    const scale = `<g transform="translate(28 ${MH - 26})" stroke="${INK}" stroke-width="1.4"><path d="M0 0 H70 M0 -4 V4 M35 -3 V3 M70 -4 V4"/><text x="35" y="-7" text-anchor="middle" class="wm-tag" fill="${INK}" stroke="none">사흘 길</text></g>`;
    const banner = `<g class="wm-banner"><path d="M116 8 H324 L314 21 L324 34 H116 L126 21Z" fill="#e8d6a2" stroke="${INK}" stroke-width="1.6"/><text x="${MW / 2}" y="27" text-anchor="middle" class="wm-title">루멘 대륙</text></g>`;
    const orn = (x, y, sx, sy) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".75"><path d="M0 0 H16 M0 0 V16 M4 4 H12 M4 4 V12"/><path d="M7 7 l3 3 l-3 3 l-3 -3Z" fill="${INK}"/></g>`;
    const defs = `<defs>
      <marker id="wv-arw-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#a3261a"/></marker>
      <marker id="wv-arw-warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#b7791a"/></marker>
      <linearGradient id="wv-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe1b8"/><stop offset="1" stop-color="#dcc790"/></linearGradient>
      <filter id="wv-rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/></filter>
    </defs>`;
    return `<svg class="wm" viewBox="0 0 ${MW} ${MH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="대륙 지도">
      ${defs}
      <rect x="4" y="4" width="${MW - 8}" height="${MH - 8}" rx="4" class="wm-sea"/>
      <g fill="none" stroke="#4d6e7e" stroke-width="1.2" stroke-linecap="round" opacity=".55">${seaWaves}</g>
      <path d="${coast}" fill="none" stroke="#5c7f96" stroke-width="16" stroke-linejoin="round" opacity=".13"/>
      <path d="${coast}" fill="none" stroke="#5c7f96" stroke-width="8" stroke-linejoin="round" opacity=".2"/>
      <g filter="url(#wv-rough)"><path d="${coast}" fill="url(#wv-land)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></g>
      <g fill="none" stroke="#6a4a22" stroke-width="1.3" stroke-dasharray="1 5" stroke-linecap="round" opacity=".55">${roads}</g>
      ${rivers}${landscape}
      ${ship(fx(140), fy(306))}${ship(fx(340), fy(308))}
      ${shades}${fronts}${places.map(mark).join('')}
      ${banner}${compass}${scale}
      <rect x="4" y="4" width="${MW - 8}" height="${MH - 8}" rx="4" class="wm-frame"/>
      <rect x="10" y="10" width="${MW - 20}" height="${MH - 20}" rx="2" class="wm-frame2"/>
      ${orn(6, 6, 1, 1)}${orn(MW - 6, 6, -1, 1)}${orn(6, MH - 6, 1, -1)}${orn(MW - 6, MH - 6, -1, -1)}
    </svg>`;
  }

  // 3쪽: 대륙 지도 (지도를 산 판만)
  function mapPage(mod) {
    const m = mod.map, st = S();
    const legend = [['hostile', '적대'], ['cold', '냉담'], ['neutral', '중립'], ['warm', '우호'], ['bond', '돈독']]
      .map(([t, w]) => `<span><i style="background:${TONE_COLOR[t]}"></i>${w}</span>`).join('');
    const fronts = m.fronts.length
      ? `<ul class="wm-fronts">${m.fronts.map(f => `<li class="${f.cls}"><i>${f.cls === 'hot' ? '⚔' : '⚠'}</i>${esc(f.label)}</li>`).join('')}</ul>`
      : '<p class="wm-quiet">지금 전선이 그어진 곳은 없다.</p>';
    return `<div class="wm-page"><h2 class="bk-title">대륙 지도 <small>${st.day}일째 아침</small></h2>
      ${mapSvg(m)}
      <div class="wm-index"><b class="wm-idx-h">색인 · 내 가게와의 우호도</b>
        <div class="wm-legend">${legend}<span class="wm-l-unk"><i></i>미확인</span></div>
        <b class="wm-idx-h">전선</b>${fronts}</div></div>`;
  }

  // 2쪽 오른쪽: 달력 — 오늘부터 7일의 확정 행사. 재난은 날짜 없이 '흉흉한 징조'만. 달력을 안 샀으면 그 자리는 빈 공간
  function calendarSlot() {
    if (!owned('calendar')) return '<section class="wr-calslot empty" aria-hidden="true"></section>';
    const C = WS.sys.Calendar, st = S(), n = WS.data.shop.calendar.lookahead;
    const ev = C.upcoming();
    const rows = [];
    for (let i = 0; i < n; i++) {
      const d = st.day + i, hit = ev.filter(e => d >= e.day && d <= e.until);
      const txt = hit.length ? hit.map(e => `<span class="cal-ev">${e.icon} <b>${esc(e.name)}</b>${e.day === d ? ` — ${esc(e.hint)}` : ' <small>이어지는 중</small>'}</span>`).join('') : '<span class="cal-none">—</span>';
      rows.push(`<li class="${i === 0 ? 'now' : ''} ${hit.length ? 'has' : ''}"><i class="cal-d"><b>${d}</b>${i === 0 ? '<small>오늘</small>' : i === 1 ? '<small>내일</small>' : '<small>일째</small>'}</i>${txt}</li>`);
    }
    return `<section class="wr-calslot"><h3 class="bk-h">달력 <small>앞으로 ${n}일</small></h3>
      <ol class="cal-week">${rows.join('')}</ol>
      ${C.omen() ? `<p class="wc-omen">🌫 ${esc(WS.data.shop.calendar.omenText)}</p>` : ''}</section>`;
  }
  function chronSlot(mod) {
    const li = c => `<li class="${c.big ? 'big' : ''}"><b>${c.day}일</b><span>${esc(c.text)}</span></li>`;
    return `<section class="wr-chron"><h3 class="bk-h">최근 사건 <small>신문에서 확인된 것</small></h3>
      ${mod.chron.length ? `<ol class="wc-list">${mod.chron.map(li).join('')}</ol>` : '<p class="bk-empty">아직 이렇다 할 사건이 없다.</p>'}</section>`;
  }

  const RUM_MARK = {
    open: ['open', '❓', '미확인'], asked: ['open', '❓', '정보상 답 기다리는 중'], unsure: ['open', '❓', '정보상 — 불확실'],
    true: ['true', '✔', '사실'], false: ['false', '✘', '거짓'],
  };
  function rumorBlock(mod) {
    if (!mod.rumors.length) return '';
    const li = r => {
      const [cls, mk, word] = RUM_MARK[r.status];
      const by = r.by === 'crow' ? ' · 정보상' : r.by === 'news' ? (r.status === 'true' ? ' · 확인 기사' : ' · 정정 기사') : '';
      return `<li class="${cls}"><i class="wr-mk ${cls}" aria-hidden="true">${mk}</i><span class="wr-tx">${esc(r.text)}<small>${word}${by}</small></span></li>`;
    };
    return `<section class="wr-blk wr-rum"><h3 class="bk-h">소문 장부 <small>진위</small></h3><ul class="wr-list">${mod.rumors.map(li).join('')}</ul></section>`;
  }

  // 정보통 — 가게 평판과 왕국 우세도가 최근 5일 사이 몇 움직였는가
  function informantBlock() {
    const I = WS.sys.Intel, r = I.reputation(), k = I.kingdomEdge();
    const cell = (label, v, d) => `<div class="wi-cell"><span>${label}</span><b>${v}</b>${d === null ? '<i class="wl-d flat">기록 없음</i>' : `<i class="wl-d ${dcls(d)}">${sgn(d)}</i>`}</div>`;
    return `<section class="wi-box"><h3 class="bk-h">정보통 <small>최근 5일의 움직임</small></h3>
      <div class="wi-grid">${cell('가게 평판', r.v, r.delta)}${cell('왕국 우세도', k.v, k.delta)}</div></section>`;
  }

  // 4쪽: 대륙 정세 — 평판지(세력 줄 + 정확한 숫자) · 정보통(평판·우세도 변화). 줄이 많으면 이 쪽 안에서 스크롤
  function intelPage(mod) {
    const st = S();
    const rows = owned('reputationMap') || st.legacyIntel;
    const unk = mod.hidden ? `<li class="wl-row wl-unk"><span class="wl-name"><i class="wl-ico" aria-hidden="true">？</i>알려지지 않음 ×${mod.hidden}</span><span class="wl-word">???</span><span class="wl-bar"><i></i><i></i><i></i><i></i><i></i></span></li>` : '';
    const note = owned('reputationMap')
      ? '평판지를 들였다 — 막대 옆 숫자는 세력 힘(0~100), 작은 수는 최근 5일 변화, 우호도 옆 수는 그 원값.'
      : '손님들 입과 신문에서 모은 소식. 막대는 서술 단계(미약 · 약함 · 팽팽 · 강함 · 압도), 화살표는 최근 5일의 흐름.';
    return `<h2 class="bk-title">대륙 정세 <small>${st.day}일째 아침</small></h2>
      ${owned('informant') ? informantBlock() : ''}
      ${rows ? `<p class="bk-note">${note}</p>
      <div class="wl-scroll"><ul class="wl-list">${mod.rows.map(row).join('')}${unk}</ul>${rumorBlock(mod)}</div>` : ''}`;
  }

  // 펼침에 끼울 쪽들 — { logR, map, intel }: 각각 그 쪽의 HTML (해당 물품이 없으면 null)
  function pages() {
    const mod = WS.sys.Intel.model(), st = S();
    return {
      logR: `<div class="wr-log">${calendarSlot()}${chronSlot(mod)}</div>`,
      map: owned('map') ? mapPage(mod) : null,
      intel: WS.sys.Shop.intelPage() ? intelPage(mod) : null,
    };
  }

  return { pages };
})();

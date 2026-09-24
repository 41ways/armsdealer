// 대륙 정세 펼침 (장부 안, 창고 다음 · 도매상 앞) — 왼쪽 쪽: 세력 현황 / 오른쪽 쪽: 지도 · 최근 사건 · 소문 장부.
// 계산은 WS.sys.Intel(js/systems/Intel.js), 문구·좌표는 WS.data.intel. 여기서는 HTML 만 만든다 — 게임 상태를 바꾸지 않는다.
// UIManager.flowBook 이 build() 를 불러 .wl-list(세력 줄) · .wr-blocks(오른쪽 덩어리)를 쪽 높이에 맞게 나눈다 (스크롤 없이, 넘치면 다음 펼침).
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
    // 평판지(가게 물품)를 샀으면 정확한 숫자: 힘 0~100 · 5일 변화 · 우호도 원값
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
  const trim = (a, b, d) => {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return [a.x + dx / L * d, a.y + dy / L * d, b.x - dx / L * d, b.y - dy / L * d];
  };
  function mapSvg(m) {
    const P = id => m.places.find(p => p.id === id);
    const INK = '#2a1c10';
    // 배경 풍경: 산 · 숲 · 물결 · 길 (알려진 것과 상관없는 땅의 모양)
    const peak = (x, y, s = 1) => `<path d="M${x - 8 * s} ${y} L${x} ${y - 14 * s} L${x + 8 * s} ${y} M${x - 3 * s} ${y - 6 * s} L${x + 1 * s} ${y - 10 * s}" />`;
    const tree = (x, y) => `<path d="M${x} ${y - 9} L${x - 5} ${y} L${x + 5} ${y} Z M${x} ${y} L${x} ${y + 4}" />`;
    const wave = (x, y) => `<path d="M${x} ${y} q5 -5 10 0 t10 0" />`;
    const land = `<g class="wm-land" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity=".5">
      ${peak(336, 88)}${peak(352, 84, 1.2)}${peak(368, 90)}${peak(80, 44)}${peak(96, 40, 1.2)}${peak(112, 46)}${peak(384, 32, .9)}${peak(400, 30, 1.1)}
      ${tree(30, 140)}${tree(44, 132)}${tree(38, 152)}${tree(74, 176)}${tree(86, 150)}${tree(56, 190)}${tree(360, 226)}${tree(392, 226)}${tree(376, 258)}${tree(350, 250)}
      ${wave(200, 288)}${wave(226, 292)}${wave(262, 290)}${wave(290, 286)}${wave(168, 284)}
      <path d="M210 152 L290 150 L334 192 M210 152 L248 268 M210 152 L246 120 M210 152 L176 128" stroke-dasharray="3 4" opacity=".7" />
    </g>`;
    const shades = m.shades.filter(s => s.p).map(s => `<g class="wm-shade"><circle cx="${s.p.x}" cy="${s.p.y}" r="34" fill="${s.color}" opacity=".2" stroke="${s.color}" stroke-width="1.2" stroke-dasharray="4 3"/><text x="${s.p.x}" y="${s.p.y + 34}" text-anchor="middle" class="wm-tag" fill="${s.color}">${esc(s.label)}</text></g>`).join('');
    const fronts = m.fronts.filter(f => f.a && f.b).map(f => {
      const [x1, y1, x2, y2] = trim(f.a, f.b, 17);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return `<g class="wm-front ${f.cls}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#wv-arw-${f.cls})"/><text x="${mx}" y="${my - 6}" text-anchor="middle" class="wm-flabel">${esc(f.label)}</text></g>`;
    }).join('');
    const mark = pl => {
      const r = pl.big ? 14 : 11;
      if (!pl.known) return `<g class="wm-place unk"><circle cx="${pl.x}" cy="${pl.y}" r="${r - 1}" /><text x="${pl.x}" y="${pl.y + 4}" text-anchor="middle" class="wm-q">?</text></g>`;
      const col = TONE_COLOR[pl.tone] || TONE_COLOR.none;
      const note = m.notes.find(n => n.place === pl.id);
      return `<g class="wm-place tone-${pl.tone}" data-place="${pl.id}"><title>${esc(pl.label)}${pl.rel ? ' — ' + pl.rel.word : ''}</title>
        <circle cx="${pl.x}" cy="${pl.y}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="1.5"/>
        ${pl.big ? `<circle cx="${pl.x}" cy="${pl.y}" r="${r + 3.5}" fill="none" stroke="${INK}" stroke-width=".9"/>` : ''}
        <text x="${pl.x}" y="${pl.y + 4.2}" text-anchor="middle" class="wm-glyph">${esc(pl.glyph)}</text>
        <text x="${pl.x}" y="${pl.y + r + 11}" text-anchor="middle" class="wm-name">${esc(pl.label)}</text>
        ${note ? `<text x="${pl.x}" y="${pl.y - r - 5}" text-anchor="middle" class="wm-tag" fill="#8a1e14">${esc(note.text)}</text>` : ''}</g>`;
    };
    const compass = `<g class="wm-compass" transform="translate(30 32)" fill="none" stroke="${INK}" stroke-width="1.1"><circle r="12" opacity=".6"/><path d="M0 -17 L4 0 L0 17 L-4 0 Z" fill="${INK}" opacity=".55"/><path d="M-17 0 L0 -3 L17 0 L0 3 Z" opacity=".6"/><text y="-21" text-anchor="middle" class="wm-tag" fill="${INK}" stroke="none">북</text></g>`;
    const defs = ['hot', 'warn'].map(c => `<marker id="wv-arw-${c}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${c === 'hot' ? '#a3261a' : '#b7791a'}"/></marker>`).join('');
    return `<svg class="wm" viewBox="0 0 ${m.w} ${m.h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="대륙 지도">
      <defs>${defs}</defs>
      <rect x="4" y="4" width="${m.w - 8}" height="${m.h - 8}" rx="6" class="wm-frame"/>
      ${land}${shades}${fronts}${m.places.map(mark).join('')}${compass}
    </svg>`;
  }

  function mapBlock(mod) {
    const m = mod.map;
    const legend = [['hostile', '적대'], ['cold', '냉담'], ['neutral', '중립'], ['warm', '우호'], ['bond', '돈독']]
      .map(([t, w]) => `<span><i style="background:${TONE_COLOR[t]}"></i>${w}</span>`).join('');
    const fronts = m.fronts.length
      ? `<ul class="wm-fronts">${m.fronts.map(f => `<li class="${f.cls}">${f.cls === 'hot' ? '⚔' : '⚠'} ${esc(f.label)}</li>`).join('')}</ul>`
      : '<p class="wm-quiet">지금 전선이 그어진 곳은 없다.</p>';
    return `<section class="wr-blk wr-map"><h3 class="bk-h">대륙 지도 <small>색 = 내 가게와의 우호도</small></h3>
      ${mapSvg(m)}
      <div class="wm-legend">${legend}<span class="wm-l-unk"><i></i>미확인</span></div>
      ${fronts}</section>`;
  }

  function chronBlock(mod) {
    const li = c => `<li class="${c.big ? 'big' : ''}"><b>${c.day}일</b><span>${esc(c.text)}</span></li>`;
    return `<section class="wr-blk wr-chron"><h3 class="bk-h">최근 사건 <small>신문에서 확인된 것</small></h3>
      ${mod.chron.length ? `<ol class="wc-list">${mod.chron.map(li).join('')}</ol>` : '<p class="bk-empty">아직 이렇다 할 사건이 없다.</p>'}</section>`;
  }

  const RUM_MARK = {
    open: ['open', '❓', '미확인'], asked: ['open', '❓', '정보상 답 기다리는 중'], unsure: ['open', '❓', '정보상 — 불확실'],
    true: ['true', '✔', '사실'], false: ['false', '✘', '거짓'],
  };
  function rumorBlock(mod) {
    const li = r => {
      const [cls, mk, word] = RUM_MARK[r.status];
      const by = r.by === 'crow' ? ' · 정보상' : r.by === 'news' ? (r.status === 'true' ? ' · 확인 기사' : ' · 정정 기사') : '';
      return `<li class="${cls}"><i class="wr-mk ${cls}" aria-hidden="true">${mk}</i><span class="wr-tx">${esc(r.text)}<small>${word}${by}</small></span></li>`;
    };
    return `<section class="wr-blk wr-rum" data-float="rumor"><h3 class="bk-h">소문 장부 <small>진위</small></h3>
      ${mod.rumors.length ? `<ul class="wr-list">${mod.rumors.map(li).join('')}</ul>` : '<p class="bk-empty">아직 귀에 들어온 소문이 없다.</p>'}</section>`;
  }

  // 달력 (가게 물품) — 앞으로 7일의 확정 행사. 재난은 날짜 없이 '흉흉한 징조'만
  function calBlock() {
    const C = WS.sys.Calendar, st = S();
    const ev = C.upcoming();
    const li = e => `<li class="${e.now ? 'now' : ''}"><b>${e.day === st.day ? '오늘' : e.day + '일'}${e.until > e.day ? `<small>~${e.until}일</small>` : ''}</b><span>${e.icon} ${esc(e.hint)}</span></li>`;
    return `<section class="wr-blk wr-cal"><h3 class="bk-h">달력 <small>앞으로 ${WS.data.shop.calendar.lookahead}일</small></h3>
      ${ev.length ? `<ul class="wc-cal">${ev.map(li).join('')}</ul>` : '<p class="bk-empty">이번 주에는 잡힌 행사가 없다.</p>'}
      ${C.omen() ? `<p class="wc-omen">🌫 ${esc(WS.data.shop.calendar.omenText)}</p>` : ''}</section>`;
  }

  // 평판 한 줄 (평판지) — 가게 평판 수치와 5일 변화
  function repLine() {
    const r = WS.sys.Intel.reputation();
    return `<p class="wl-rep" title="가게 평판 수치와 최근 5일 변화">📜 가게 평판 <b>${r.v}</b>${r.delta === null ? '' : ` <i class="wl-d ${dcls(r.delta)}">${sgn(r.delta)}</i>`}<small>평판지</small></p>`;
  }

  // 빈 쪽이 생겼을 때만 얹는 안내 (flowBook 이 data-float 덩어리를 자리가 남는 쪽에 놓는다)
  function guideBlock() {
    return `<section class="wr-blk wr-guide" data-float="guide"><h3 class="bk-h">정세 읽는 법</h3>
      <ul class="wg-list">
        <li><b>막대</b><span>미약 · 약함 · 팽팽 · 강함 · 압도 다섯 단계. 정확한 힘은 알 길이 없다.</span></li>
        <li><b>▲ ▼ —</b><span>최근 5일의 흐름. 커지는 중인지, 꺾이는 중인지.</span></li>
        <li><b>우호도</b><span>적대 · 냉담 · 중립 · 우호 · 돈독 — 그 세력이 내 가게를 보는 눈.</span></li>
        <li><b>❓ ✔ ✘</b><span>미확인 소문 · 사실 · 거짓. 정정·확인 기사가 나오거나 까마귀 정보상이 답하면 바뀐다.</span></li>
        <li><b>알려지지 않음</b><span>그 세력 손님을 만나거나 관련 기사가 나오면 항목이 열린다.</span></li>
      </ul></section>`;
  }

  // 펼침 하나: { left, right } HTML. 쪽 나누기용 표지: 왼쪽 .wl-list > li, 오른쪽 .wr-blocks > section (data-float 덩어리는 자리가 남는 쪽에)
  function build() {
    const st = S(), mod = WS.sys.Intel.model();
    const unk = mod.hidden ? `<li class="wl-row wl-unk"><span class="wl-name"><i class="wl-ico" aria-hidden="true">？</i>알려지지 않음 ×${mod.hidden}</span><span class="wl-word">???</span><span class="wl-bar"><i></i><i></i><i></i><i></i><i></i></span></li>` : '';
    const left = `<h2 class="bk-title">대륙 정세 <small>${st.day}일째 아침</small></h2>
      <p class="bk-note">${owned('reputationMap') ? '평판지를 들였다 — 막대 옆 숫자는 세력 힘(0~100), 작은 수는 최근 5일 변화, 우호도 옆 수는 그 원값.' : '손님들 입과 신문에서 모은 소식. 막대는 서술 단계(미약 · 약함 · 팽팽 · 강함 · 압도), 화살표는 최근 5일의 흐름.'}</p>
      ${owned('reputationMap') ? repLine() : ''}
      <ul class="wl-list">${mod.rows.map(row).join('')}${unk}</ul>`;
    const right = `<div class="bk-run"><span>지도 · 사건</span><span>${st.day}일째 아침</span></div>
      <div class="wr-blocks">${mapBlock(mod)}${owned('calendar') ? calBlock() : ''}${chronBlock(mod)}${rumorBlock(mod)}${guideBlock()}</div>`;
    return { left, right };
  }

  return { build };
})();

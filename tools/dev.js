// 이벤트 테스트 패널 — dev.html 에서만 실린다 (tools/make_dev.py 가 index.html 에 이 스크립트를 붙여 만든다).
// 지금 판에 손님을 끼워 넣고, 날짜를 옮기고, 플래그·세계 변수·사건 효과를 바로 넣어 이야기 줄기를 확인한다.
// 게임 코드는 건드리지 않는다 — 공개 API(WS.sys.*)와 상태(WS.Game.state)만 쓴다.
(() => {
  const S = () => WS.Game.state;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const redraw = () => { try { WS.UI.render(); } catch (e) { console.error(e); } };
  const say = msg => { const el = document.getElementById('dev-log'); if (el) el.textContent = msg; };
  const ARC = id => /^(rl|wd|tr)_/.test(id);

  const css = `
  #dev { position: fixed; right: 8px; top: 8px; z-index: 20000; width: 300px; max-height: calc(100vh - 16px); overflow: auto;
    background: rgba(12,9,7,.95); color: #f0e2c0; font: 12px/1.4 system-ui, sans-serif; border: 1px solid #8a5a24; border-radius: 6px; box-shadow: 0 6px 24px rgba(0,0,0,.6); }
  #dev.min > :not(header) { display: none; }
  #dev header { position: sticky; top: 0; display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: #2a1c10; cursor: pointer; }
  #dev section { padding: 6px 8px; border-top: 1px solid #3a2a1a; }
  #dev h6 { margin: 0 0 4px; font-size: 11px; color: #f0c878; }
  #dev input, #dev select { width: 100%; box-sizing: border-box; margin: 2px 0; padding: 3px 4px; background: #1e150e; color: #f0e2c0; border: 1px solid #5a4028; border-radius: 3px; font: inherit; }
  #dev button { margin: 2px 2px 2px 0; padding: 3px 7px; background: #6a3a14; color: #fff4d8; border: 1px solid #3a1a08; border-radius: 3px; font: inherit; cursor: pointer; }
  #dev button:hover { filter: brightness(1.15); }
  #dev .row { display: flex; gap: 4px; } #dev .row > * { flex: 1; }
  #dev ul { margin: 0; padding-left: 16px; } #dev li.ok { color: #9fe07a; }
  #dev-log { color: #9fd0ff; min-height: 16px; }`;

  function customers() {
    return WS.data.customers.map(t => ({ id: t.id, label: `${ARC(t.id) ? '★ ' : ''}${t.id} — ${t.name || ''}${t.job ? ' · ' + t.job : ''}` }))
      .sort((a, b) => (ARC(b.id) - ARC(a.id)) || a.id.localeCompare(b.id));
  }

  // 대기열에서 지금 손님 바로 다음 자리에 끼워 넣는다 (영업 중이 아니면 내일 첫 손님처럼 맨 앞에)
  function spawn(id) {
    const tpl = WS.sys.Customers.tplById(id);
    if (!tpl) return say(`없는 손님: ${id}`);
    const st = S();
    const c = WS.sys.Customers.fromTemplate(tpl);
    const cur = WS.sys.Day.current && WS.sys.Day.current();
    const i = cur ? st.queue.indexOf(cur) + 1 : st.queue.findIndex(q => q.status === 'waiting');
    st.queue.splice(i < 0 ? st.queue.length : i, 0, c);
    say(`${id} 를 대기열 ${i + 1}번째에 넣었다${st.phase === 'shop' ? ' — 「다음」을 누르면 온다' : ' (영업을 시작하면 온다)'}`);
    redraw();
  }

  function fireEvent(id) {
    const ev = WS.data.events.find(e => e.id === id);
    if (!ev) return say(`없는 사건: ${id}`);
    const st = S();
    if (ev.effects) WS.sys.Effects.apply(ev.effects);
    (ev.outcomes || []).some(o => { if (!o.when || WS.sys.Conditions.check(o.when)) { if (o.effects) WS.sys.Effects.apply(o.effects); if (o.news) st.pendingNews.push(...[].concat(o.news)); return true; } return false; });
    if (ev.news) st.pendingNews.push(...[].concat(ev.news));
    st.eventLog = st.eventLog || {};
    say(`사건 ${id} 효과를 적용했다 (기사는 내일 신문)`);
    redraw();
  }

  function endings() {
    const ok = w => { try { return !!WS.sys.Conditions.check(w); } catch (e) { return false; } };
    return WS.data.endings.map(e => `<li class="${ok(e.when) ? 'ok' : ''}">${esc(e.title || e.id)} <small>${esc(e.id)}</small></li>`).join('');
  }

  function build() {
    if (document.getElementById('dev')) return;
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    const el = document.createElement('div'); el.id = 'dev';
    el.innerHTML = `<header data-dev="toggle"><b>이벤트 테스트</b><small>눌러서 접기</small></header>
      <section><div id="dev-log">새 게임을 시작하면 쓸 수 있다</div><div id="dev-state"></div></section>
      <section><h6>손님 부르기 (★ = 이번에 더한 이야기 손님)</h6>
        <input id="dev-cq" placeholder="이름·id 로 거르기"><select id="dev-cs" size="6"></select>
        <button data-dev="spawn">다음 손님으로 넣기</button></section>
      <section><h6>날짜 · 금화</h6>
        <div class="row"><input id="dev-day" type="number" min="1" max="31" placeholder="날짜"><button data-dev="day">이 날로</button></div>
        <button data-dev="gold">금화 +500</button><button data-dev="end">오늘 영업 끝내기</button></section>
      <section><h6>플래그 · 세계 변수</h6>
        <div class="row"><input id="dev-flag" placeholder="플래그 이름"><button data-dev="flag">켜기</button><button data-dev="unflag">끄기</button></div>
        <div class="row"><select id="dev-var"></select><input id="dev-val" type="number" placeholder="값"><button data-dev="var">넣기</button></div></section>
      <section><h6>사건 효과 바로 넣기</h6>
        <input id="dev-eq" placeholder="사건 id 로 거르기"><select id="dev-es" size="5"></select>
        <button data-dev="event">효과 적용</button></section>
      <section><h6>지금 끝나면 충족하는 결말 <button data-dev="refresh">새로고침</button></h6><ul id="dev-end"></ul></section>`;
    document.body.appendChild(el);
    const fillC = q => { document.getElementById('dev-cs').innerHTML = customers().filter(c => !q || c.label.toLowerCase().includes(q.toLowerCase())).map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join(''); };
    const fillE = q => { document.getElementById('dev-es').innerHTML = WS.data.events.filter(e => !q || e.id.includes(q)).map(e => `<option value="${esc(e.id)}">${esc(e.id)}</option>`).join(''); };
    fillC(''); fillE('');
    document.getElementById('dev-var').innerHTML = Object.keys(WS.data.worldVars || {}).sort().map(k => `<option>${esc(k)}</option>`).join('');
    document.getElementById('dev-cq').addEventListener('input', e => fillC(e.target.value));
    document.getElementById('dev-eq').addEventListener('input', e => fillE(e.target.value));
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-dev]');
      if (!b) return;
      e.stopPropagation();
      const act = b.dataset.dev;
      if (act === 'toggle') { el.classList.toggle('min'); return; }
      if (!S()) return say('먼저 새 게임을 시작한다');
      const st = S(), v = id => document.getElementById(id).value.trim();
      if (act === 'spawn') spawn(v('dev-cs'));
      if (act === 'day') { const d = Math.max(1, parseInt(v('dev-day'), 10) || st.day); st.day = d; say(`날짜를 ${d}일로 옮겼다 — 이야기 손님은 다음 날 아침부터 새 날짜에 맞춰 온다`); redraw(); }
      if (act === 'gold') { st.gold += 500; redraw(); say('금화 +500'); }
      if (act === 'end') { st.queue.forEach(q => { if (q.status === 'waiting') q.status = 'done'; }); say('남은 손님을 모두 보냈다 — 「영업 종료」를 누른다'); redraw(); }
      if (act === 'flag') { st.flags[v('dev-flag')] = true; say(`플래그 ${v('dev-flag')} 켬`); }
      if (act === 'unflag') { delete st.flags[v('dev-flag')]; say(`플래그 ${v('dev-flag')} 끔`); }
      if (act === 'var') { WS.sys.World.set(v('dev-var'), Number(v('dev-val'))); say(`${v('dev-var')} = ${v('dev-val')}`); }
      if (act === 'event') fireEvent(v('dev-es'));
      document.getElementById('dev-end').innerHTML = endings();
      tick();
    }, true);
  }

  function tick() {
    const st = S(), box = document.getElementById('dev-state');
    if (!box) return;
    box.textContent = st ? `${st.day}일 · ${st.phase} · 금화 ${st.gold} · 대기 ${st.queue ? st.queue.filter(q => q.status === 'waiting').length : 0}` : '';
  }

  const start = () => { build(); setInterval(tick, 1000); };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();

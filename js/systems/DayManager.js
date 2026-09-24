// 하루 흐름: 새벽(세계 변화·이벤트·신문) → 아침 신문 → 상점 준비 → 영업 → 마감 → 다음 날
WS.sys.Day = (() => {
  const S = () => WS.Game.state;
  const cfg = () => WS.data.config;

  function startDay() {
    const st = S();
    st.day++;
    if (st.day > 1) WS.sys.World.nightly();
    settleReceivables();
    if (WS.sys.Progress) WS.sys.Progress.dawn(); // 새벽 사건 · 튜토리얼 손님 물건 채우기 · 맡긴 물건 주인의 방문 (편지·대기열보다 먼저)
    if (WS.sys.Letters) WS.sys.Letters.nightly(); // 까마귀 서신: 배달·밀고 결과·빚·공급 제안
    if (WS.sys.Calendar) { WS.sys.Calendar.roll(); WS.sys.Calendar.prune(); } // 달력 이벤트: 재난 날짜 굴리기 · 지난 손님 수/시세 보정 치우기
    const fired = WS.sys.Events.runDawn();
    if (WS.sys.Intel) WS.sys.Intel.record(); // 대륙 정세의 추세 (새벽 사건까지 끝난 세계의 세력별 점수)
    WS.sys.News.compose(fired);
    st.queue = WS.sys.Customers.buildQueue();
    st.current = null;
    st.time = cfg().openTime;
    st.today = { income: 0, spend: 0, wholesale: 0, sold: 0, refused: 0, rent: 0, guard: 0, paper: 0, startGold: st.gold };
    st.cart = {};
    if (WS.sys.Shop) WS.sys.Shop.notePaper(); // 오늘 신문이 왔는가 (구독 중일 때만)
    st.phase = 'morning';
    WS.sys.Save.autosave();
  }

  // 외상값 회수 / 요정 금화가 낙엽으로 변하는 아침
  function settleReceivables() {
    const st = S();
    st.receivables = st.receivables || [];
    const due = st.receivables.filter(r => r.day <= st.day);
    st.receivables = st.receivables.filter(r => r.day > st.day);
    for (const r of due) {
      if (r.leaf) {
        st.gold += r.amount;
        st.pendingNews.push({ cat: '장부', text: `${r.name}에게 받은 금화 중 ${-r.amount}G어치가 아침에 보니 마른 낙엽이었다. 금고에서 숲 냄새가 난다.` });
      } else if (r.defaultWhen && WS.sys.Conditions.check(r.defaultWhen)) {
        st.pendingNews.push({ cat: '장부', text: WS.util.fill(r.defaultText || '{name}의 외상값 {amount}G는 끝내 들어오지 않았다.', r) });
      } else {
        st.gold += r.amount;
        st.pendingNews.push({ cat: '장부', text: `${r.name}의 심부름꾼이 밀린 외상값 ${r.amount}G를 갚고 갔다.` });
      }
    }
  }

  // 임대료 (config.js rentMods: 왕실 인증 할인, 상인 길드의 압박 등)
  const GUILD_RESCUE_DAYS = 14;   // 상인회 구제 대출 기한
  const GUILD_RESCUE_CUSHION = 40; // 모자란 임대료에 얹어 주는 여유 (이틀치)
  // 그날의 기본 임대료 (config.rentSchedule) × 조건별 보정 (rentMods)
  const baseRent = () => (cfg().rentSchedule || []).filter(r => WS.sys.Conditions.eday() >= r.from).reduce((v, r) => r.rent, cfg().rent);
  const rent = () => Math.round((cfg().rentMods || []).reduce((m, r) => (WS.sys.Conditions.check(r.when) ? m * r.mult : m), baseRent()));

  function toPrep() {
    S().phase = 'prep';
  }

  // 도매상 장바구니: 양수 = 매입, 음수 = 처분
  function cartPreview() {
    const st = S();
    const inv = { ...st.inventory };
    let gold = st.gold;
    for (const [id, n] of Object.entries(st.cart)) {
      if (!n) continue;
      inv[id] = (inv[id] || 0) + n;
      gold += n > 0 ? -n * WS.sys.Market.cost(id) : -n * WS.sys.Market.wholesale(id);
    }
    return { inv, gold, slots: WS.sys.Inventory.usedSlots(inv) };
  }

  function cartAdjust(id, delta) {
    const st = S();
    const cur = st.cart[id] || 0;
    // 도매상 목록에 없는 물건(철광석 품절 나흘 등)은 새로 사 들일 수 없다 (UI 는 목록에 없으니 눌러 볼 수도 없다)
    if (delta > 0 && !WS.sys.Market.supplyList().includes(id)) return;
    const next = Math.max(-WS.sys.Inventory.count(id), cur + delta);
    const before = cartPreview();
    st.cart[id] = next;
    const p = cartPreview();
    // 불가능하면 되돌림. 뒷문 배달로 이미 칸이 넘친 창고에서도 덜어 내는(칸을 늘리지 않는) 조정은 된다
    if (p.gold < 0 || (p.slots > WS.sys.Inventory.capacity() && p.slots > before.slots)) st.cart[id] = cur;
  }

  function confirmCart() {
    const st = S();
    for (const [id, n] of Object.entries(st.cart)) {
      if (n > 0) {
        const c = n * WS.sys.Market.cost(id);
        st.gold -= c;
        st.today.spend += c;
        WS.sys.Inventory.add(id, n, true);
        WS.sys.Inventory.recordCost(id, n, WS.sys.Market.cost(id));
      } else if (n < 0) {
        const g = -n * WS.sys.Market.wholesale(id);
        st.gold += g;
        st.today.wholesale += g;
        WS.sys.Inventory.remove(id, -n);
      }
    }
    st.cart = {};
  }

  function openShop() {
    confirmCart();
    S().phase = 'shop';
  }

  const current = () => S().queue.find(c => c.uid === S().current) || null;
  const waiting = () => S().queue.filter(c => c.status === 'waiting');

  function nextCustomer() {
    const st = S();
    const c = waiting()[0];
    if (!c) {
      st.current = null;
      return;
    }
    st.current = c.uid;
    st.time = Math.max(st.time, c.arrival);
    c.status = 'active';
    if (WS.sys.Customers.remark) WS.sys.Customers.remark(c); // 이 가게의 과거를 기억하는 한마디 (remarks.js)
    c.dialog = [{ who: 'c', text: c.greet }];
    if (WS.sys.Letters && WS.sys.Letters.checkArrival) WS.sys.Letters.checkArrival(c); // 헛걸음이면 화를 낸다
    // 튜토리얼 손님이 카운터 앞에 서는 순간 그 창고 자리가 열린다 (c.tutorial.unlocked)
    if (c.tutorial && WS.sys.Progress) WS.sys.Progress.arrive(c);
  }

  function closeShop() {
    const st = S();
    // 기다리던 손님을 돌려보내면 조금 서운해한다
    waiting().forEach(c => {
      c.status = 'done';
      c.result = 'missed';
      const f = WS.data.factions[c.faction];
      if (f) WS.sys.World.add(f.visit.var, -0.5);
    });
    st.time = cfg().closeTime;
    st.current = null;
    const r = rent();
    st.gold -= r;
    st.today.rent = r;
    st.today.rescue = 0;
    if (WS.sys.Shop) { WS.sys.Shop.settleWage(); WS.sys.Shop.settlePaper(); } // 밤 경비 일당 · 신문 구독료 — 금고가 모자라면 그날 해고 · 구독 중단
    // 첫날 영업이 끝나면 까마귀가 창틀에 앉는다 — 둥지지기의 안내장(까마귀 서신 튜토리얼)이 편지함에 꽂힌다 (UIManager 영업 종료 화면이 안내한다)
    if (st.day === 1 && WS.sys.Progress && !WS.sys.Progress.isUnlocked('crow')) { WS.sys.Progress.unlock('crow'); if (WS.sys.Letters) WS.sys.Letters.crowArrived(); }
    // 상인회 구제 대출 — 기한(14일)이 지났는데 아직 다 못 갚았으면 오늘 밤으로 끝
    const loan = st.guildLoan;
    if (loan && loan.left > 0 && st.day >= loan.due) {
      st.flags.bankrupt = st.day;
      st.flags.guild_default = st.day;
    } else if (st.gold < 0) {
      // 상인회 회원이면 딱 한 번, 모자란 임대료에 이틀치 여유를 얹어 이자 없이 빌려준다 (가입할 때는 말해 주지 않는 혜택)
      if (st.flags.guild_member && !st.flags.guild_rescued) {
        const lend = -st.gold + GUILD_RESCUE_CUSHION;
        st.gold += lend;
        st.guildLoan = { amount: lend, left: lend, day: st.day, due: st.day + GUILD_RESCUE_DAYS };
        st.flags.guild_rescued = st.day;
        st.today.rescue = lend;
      } else st.flags.bankrupt = st.day;
    }
    // 오늘 밤 누가 문을 두드릴지 — 마감 화면에서는 알려 주지 않고, 잠자리에 들 때 밤 장면으로 (UIManager night)
    st.nightKnock = rollKnock();
    // 천칭단 소라껍데기 — 경고는 지금 바로 센다 (밤 장면을 건너뛰어도). 보여 주는 건 잠자리에 든 뒤
    st.nightWhisper = rollWhisper();
    st.night = null;
    st.phase = 'closing';
  }

  // ───────── 천칭단: 머리맡의 소라껍데기 (config.liga) ─────────
  // 가입(liga_member) 뒤, 주된 세력 관계의 (최고 − 최저)가 tolerance 를 넘으면 속삭인다 — warnEvery 일에 한 번까지
  // (가입한 날·지난 경고가 liga_grace 플래그 = 그날부터 다시 셈). 경고는 liga_warnings 로 센다.
  // maxWarnings 번째는 다른 말 → liga_failed · liga_enemy, 그날 밤 누군가 다녀간다 (events.js liga_robbery)
  function rollWhisper() {
    const st = S();
    const L = cfg().liga;
    const W = WS.sys.World;
    if (!L || !st.flags.liga_member || st.flags.liga_failed) return null;
    if (st.flags.liga_grace && st.day - st.flags.liga_grace < L.warnEvery) return null;
    if (W.balance().gap <= L.tolerance) {
      // 균형이 돌아왔다 — recoverDays 동안 잘 버티면 경고가 하나 지워진다
      const since = st.flags.liga_grace;
      if (L.recoverDays && W.get('liga_warnings') > 0 && since !== undefined && st.day - since >= L.recoverDays) {
        W.add('liga_warnings', -1);
        st.flags.liga_grace = st.day;
      }
      return null;
    }
    W.add('liga_warnings', 1);
    st.flags.liga_grace = st.day;
    const n = W.get('liga_warnings');
    if (n >= L.maxWarnings) {
      WS.sys.Effects.apply({ flags: ['liga_failed', 'liga_enemy'], schedule: [{ event: 'liga_robbery', inDays: 1 }] });
      return { n, last: true, text: L.lines.last, shown: false };
    }
    return { n, last: false, text: WS.util.fill(L.lines.warn, W.textCtx()), shown: false };
  }
  const whisperPending = () => !!S().nightWhisper && !S().nightWhisper.shown && !lastNight();

  // 문 두드림이 없는 밤, 또는 두드림이 끝난 뒤 — 소라껍데기가 속삭인다
  function startWhisper() {
    const st = S();
    if (!whisperPending()) return false;
    st.nightWhisper.shown = true;
    st.night = { step: 'whisper' };
    st.phase = 'night';
    return true;
  }

  // ───────── 밤중 문 두드림 ─────────
  // customers.js 의 knock 필드가 있는 틀(night_knock · night_knock_robber)이 대사·선택지를 들고 있다.
  // knock: { id, when, chance, once } — 먼저 적힌 틀부터 굴려서 하나만. once 면 한 번 두드린 뒤로 다시 오지 않는다 ({id}_knocked 플래그)
  const knockTpls = () => WS.data.customers.filter(t => t.knock);
  const knockTpl = id => knockTpls().find(t => t.knock.id === id) || null;
  // 오늘 밤 곧바로 결말로 가는가 (파산 · 압류 · 밀수왕 — config.endNow)
  const endNowLine = () => (cfg().endNow || []).find(e => WS.sys.Conditions.check(e.when)) || null;
  const endingDue = () => !!endNowLine() || !!S().flags.bankrupt;
  const lastNight = () => endingDue() || S().day >= cfg().campaignDays;

  function rollKnock() {
    const st = S();
    if (lastNight()) return null;
    for (const t of knockTpls()) {
      const k = t.knock;
      if (k.once && st.flags[`${k.id}_knocked`] !== undefined) continue;
      if (!WS.sys.Conditions.check(k.when)) continue;
      if (k.chance !== undefined && Math.random() >= k.chance) continue;
      return k.id;
    }
    return null;
  }

  // "잠자리에 든다"를 눌렀을 때 밤 장면을 먼저 보여 줄지
  const nightDue = () => ((!!S().nightKnock && !!knockTpl(S().nightKnock)) || whisperPending()) && !lastNight();

  function startNight() {
    const st = S();
    const t = knockTpl(st.nightKnock);
    if (!t && !lastNight()) { st.nightKnock = null; return startWhisper(); }
    if (!t || lastNight()) { st.nightKnock = null; return false; }
    st.flags[`${t.knock.id}_knocked`] = st.day;
    st.seenCustomers[t.id] = st.day;
    st.night = { step: 'knock' };
    st.phase = 'night';
    return true;
  }

  // 못 고르는 선택지의 이유 한 줄
  function whyNot(ch) {
    if (ch.lockedHint) return ch.lockedHint;
    const g = ch.when && ch.when.gold;
    if (g && g.gte !== undefined) return `금화가 ${g.gte}G는 있어야 한다 (지금 ${S().gold}G)`;
    return '지금은 할 수 없다';
  }

  // 밤 장면이 그릴 것: step 'knock'(두드림) → 'visitor'(문을 열었다) → 'after'(대답 · 잠자리로)
  function nightState() {
    const st = S();
    const n = st.night;
    if (n && n.step === 'whisper') {
      const w = st.nightWhisper;
      return w ? { kind: 'whisper', step: 'whisper', text: w.text, last: w.last, choices: [] } : null;
    }
    const kt = knockTpl(st.nightKnock);
    if (!n || !kt) return null;
    const vt = n.visitor ? WS.sys.Customers.tplById(n.visitor) : null;
    const src = n.step === 'knock' ? kt : n.step === 'visitor' ? vt : null;
    const choices = ((src && src.choices) || []).map(ch => {
      const ok = WS.sys.Conditions.check(ch.when);
      return { id: ch.id, label: ch.label, ok, why: ok ? '' : whyNot(ch), effects: ch.effects || null, opens: ch.opens || null };
    });
    // 경비를 세워 두었으면 문을 열기 전에 문틈으로 먼저 살펴 정체를 알려 준다 (WS.data.shop.guard) — 도둑에겐 '쫓아내게 한다'가 더해진다
    let guard = null;
    if (n.step === 'knock' && WS.sys.Shop && WS.sys.Shop.guarded()) {
      const kid = kt.knock.id;
      guard = { who: WS.sys.Shop.guardLabel(), text: WS.sys.Shop.guardLine(kid) };
      guardChoices(kt).forEach(ch => choices.push({ id: ch.id, label: ch.label, ok: true, why: '', effects: null, opens: null }));
    }
    return { kind: kt.knock.id, step: n.step, knock: kt, visitor: vt, narr: n.narr || '', reply: n.reply || '', by: n.by || '', choice: n.choice || '', choices, guard };
  }
  // 경비가 더해 주는 선택지 — 도둑은 쫓아내게 할 수 있다 (그 밤의 도둑 사건을 건너뛴다). 그 밖의 손님은 원래의 '모른 척한다'가 있으면 그것으로
  function guardChoices(kt) {
    const G = WS.data.shop.guard;
    if (kt.knock.id === 'robber') return [{ id: 'guard_drive', label: G.driveOff.label, reply: G.driveOff.reply }];
    if (!(kt.choices || []).some(c => c.id === 'ignore') && !(kt.choices || []).some(c => !c.opens)) return [{ id: 'guard_ignore', label: '문을 열지 않는다', reply: '(두드림이 멎었다. 경비가 빗장을 지른다.)' }];
    return [];
  }

  function recordNight(t, ch) {
    const st = S();
    st.ledger.push({ day: st.day, time: st.time, name: t.name, tpl: t.id, faction: t.faction, trueFaction: t.trueFaction || t.faction, action: ch.id });
    st.choices[t.id] = ch.id;
  }

  function nightChoose(choiceId) {
    const st = S();
    const n = st.night;
    if (!n || n.step === 'after' || n.step === 'whisper') return false;
    const t = n.step === 'knock' ? knockTpl(st.nightKnock) : WS.sys.Customers.tplById(n.visitor);
    let ch = t && (t.choices || []).find(x => x.id === choiceId);
    // 경비가 더해 준 선택지 (nightState.guardChoices)
    if (!ch && t && n.step === 'knock' && WS.sys.Shop && WS.sys.Shop.guarded()) ch = guardChoices(t).find(x => x.id === choiceId);
    if (!ch || !WS.sys.Conditions.check(ch.when)) return false;
    WS.sys.Effects.apply(ch.effects);
    recordNight(t, ch);
    if (n.step === 'knock' && ch.opens && WS.sys.Customers.tplById(ch.opens)) {
      st.seenCustomers[ch.opens] = st.day;
      st.night = { step: 'visitor', visitor: ch.opens, narr: ch.reply || '' };
    } else {
      st.night = { step: 'after', visitor: n.visitor || null, by: n.step, choice: ch.id, reply: ch.reply || '' };
    }
    return true;
  }

  // 상인회 빚 갚기 (도매상 화면) — 나눠 갚아도 된다
  function repayGuild(amount) {
    const st = S();
    const loan = st.guildLoan;
    if (!loan || loan.left <= 0) return 0;
    const pay = Math.max(0, Math.min(amount, loan.left, st.gold));
    st.gold -= pay;
    loan.left -= pay;
    if (loan.left <= 0) st.flags.guild_repaid = st.day;
    return pay;
  }

  function nextDay() {
    const st = S();
    // 밤 장면은 여기서 끝난다 (보지 않고 넘겼어도 — 개발 패널의 빨리 감기 등)
    st.nightKnock = null;
    st.night = null;
    st.nightWhisper = null;
    if (endingDue() || st.day >= cfg().campaignDays) {
      st.ending = WS.data.endings.find(e => WS.sys.Conditions.check(e.when)).id;
      st.phase = 'ending';
      if (WS.Cinematic && WS.Cinematic.preload) WS.Cinematic.preload(st.ending); // 결말 컷신 그림을 미리 받기 시작
      WS.sys.Save.clear();
      return;
    }
    startDay();
  }

  return { startDay, rent, toPrep, cartPreview, cartAdjust, confirmCart, openShop, current, waiting, nextCustomer, closeShop, nextDay, repayGuild,
    nightDue, startNight, nightState, nightChoose, rollWhisper, whisperPending, startWhisper, endingDue, endNowLine, lastNight };
})();

WS.sys.Save = (() => {
  const safe = fn => {
    try {
      return fn();
    } catch (e) {
      return null;
    }
  };
  // KEY: 자동 저장(아침마다 · 이어하기). 저장 칸 1~3은 Esc 메뉴에서 손으로 저장한다 (KEY_slotN)
  const Save = {
    KEY: 'armsdealer_save_v1',
    SLOTS: 3,
    autosave: () => safe(() => localStorage.setItem(Save.KEY, JSON.stringify(WS.Game.state))),
    load: () => safe(() => JSON.parse(localStorage.getItem(Save.KEY))),
    has: () => !!safe(() => localStorage.getItem(Save.KEY)),
    clear: () => safe(() => localStorage.removeItem(Save.KEY)),
    slotKey: n => `${Save.KEY}_slot${n}`,
    saveSlot: n => !!safe(() => { localStorage.setItem(Save.slotKey(n), JSON.stringify({ at: Date.now(), state: WS.Game.state })); return true; }),
    loadSlot: n => { const v = safe(() => JSON.parse(localStorage.getItem(Save.slotKey(n)))); return v ? v.state : null; },
    slotInfo: n => {
      const v = safe(() => JSON.parse(localStorage.getItem(Save.slotKey(n))));
      return v && v.state ? { day: v.state.day, gold: v.state.gold, phase: v.state.phase, at: v.at } : null;
    },
    anySlot: () => Array.from({ length: Save.SLOTS }, (_, i) => i + 1).some(n => !!safe(() => localStorage.getItem(Save.slotKey(n)))),
  };
  return Save;
})();

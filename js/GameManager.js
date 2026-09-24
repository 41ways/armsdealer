// 게임 상태 생성과 최상위 흐름
WS.Game = {
  state: null,

  createState() {
    const cfg = WS.data.config;
    // 시작 재고는 첫날부터 쓰는 자리(progress.js startPlaces — 무기 거치대)의 물건만.
    // 다른 자리의 첫 물건은 그 자리를 여는 튜토리얼 손님이 올 때 들어온다 (progress.js tutorialCustomers[].stock)
    const startPlaces = (WS.data.progress && WS.data.progress.startPlaces) || [];
    const startInventory = {};
    for (const [id, n] of Object.entries(cfg.startInventory)) {
      if (startPlaces.includes(WS.sys.Items.shelf(id))) startInventory[WS.sys.Items.canon(id)] = n;
    }
    const st = {
      version: 1,
      day: 0,
      phase: 'title',
      time: cfg.openTime,
      gold: cfg.startGold,
      inventory: startInventory,
      invLayout: {},
      world: WS.sys.World.init(),
      flags: {},
      ledger: [],
      newsArchive: {},
      pendingNews: [],
      scheduled: [],
      spawnQueue: [],
      eventLog: {},
      ambientLog: {},
      seenCustomers: {},
      choices: {},
      trend: null,
      lastPrices: null,
      queue: [],
      current: null,
      today: null,
      cart: {},
      ending: null,
      receivables: [],
      met: {},
      gemTrend: WS.sys.World.defaultGemTrend(),
      gemTrendPrev: WS.sys.World.defaultGemTrend(),
      costBasis: {},
      discovered: {},
      letters: { inbox: [], outbox: [], orders: [], loans: [], promises: [], reports: [], seq: 0 },
      // 날짜별 창고 해금 · 튜토리얼 (Progress.js) / 남에게서 맡아 둔 물건
      progress: WS.sys.Progress.initState(),
      deposits: [],
      // 도적단 장물아비가 맡긴 장물 — 가게 재고와 따로 (Stash.js)
      stash: WS.sys.Stash.initState(),
      // 소문의 진위 (Rumors.js) · 세력별 최근 점수 기록 (Intel.js — 정세 화면의 추세 화살표)
      rumors: { list: [], seq: 0 },
      intelHist: {},
    };
    WS.sys.Shop.newGameState(st); // 신문 구독 · 가게 물품은 처음엔 아무것도 없다
    return st;
  },

  newGame() {
    this.state = this.createState();
    WS.sys.Day.startDay();
  },

  continueGame(data) {
    const s = data || WS.sys.Save.load();
    if (!s) return false;
    // 예전 저장본: 새로 생긴 세계 변수·필드를 채운다
    for (const [k, d] of Object.entries(WS.data.worldVars)) if (s.world[k] === undefined) s.world[k] = d.init;
    s.receivables = s.receivables || [];
    s.met = s.met || {};
    s.invLayout = s.invLayout || {};
    s.gemTrend = s.gemTrend || WS.sys.World.defaultGemTrend();
    s.gemTrendPrev = s.gemTrendPrev || { ...s.gemTrend };
    s.costBasis = s.costBasis || {};
    // 발견한 물건 기록 (예전 저장본: 지금 가진 것 · 별조각을 산 적이 있으면 발견한 것으로)
    if (!s.discovered) {
      s.discovered = {};
      Object.entries(s.inventory || {}).forEach(([id, n]) => { if (n > 0) s.discovered[id] = s.day || 1; });
      if (s.flags && s.flags.star_bought) s.discovered.star_shard = s.day || 1;
    }
    s.letters = s.letters || { inbox: [], outbox: [], orders: [], loans: [], promises: [], reports: [], seq: 0 };
    // 물건 종류 단순화: 옛 이름(은검·석궁…)으로 쌓인 재고·주문·대기열을 대표 종류(칼·활…)로 합친다
    WS.sys.Progress.canonSave(s);
    // 날짜별 해금: 해금 기록이 있는 저장본은 그대로 둔다 (이미 열린 자리는 열린 채 — 해금표가 바뀌어도).
    // 해금 제도 이전 저장본(progress 없음)은 잠긴 궤짝 말고 다 연 것으로 친다. 예전 팝업 튜토리얼은 본 것으로 친다
    s.progress = s.progress || WS.sys.Progress.migrateState(s);
    WS.sys.Progress.markOldTutorials(s.progress);
    s.deposits = s.deposits || [];
    s.stash = s.stash || WS.sys.Stash.initState();
    s.rumors = s.rumors || { list: [], seq: 0 };
    s.intelHist = s.intelHist || {};
    // 그림자 조합은 도적단으로 합쳐졌다 — 예전 저장본의 손님·장부 기록을 옮긴다
    const fix = o => {
      if (!o) return;
      if (o.faction === 'syndicate') o.faction = 'bandit';
      if (o.trueFaction === 'syndicate') o.trueFaction = 'bandit';
      if (o.affil) ['claim', 'sealOf'].forEach(k => { if (o.affil[k] === 'syndicate') o.affil[k] = 'bandit'; });
    };
    (s.queue || []).forEach(fix);
    (s.ledger || []).forEach(fix);
    (s.receivables || []).forEach(fix);
    if (s.met && s.met.syndicate !== undefined) { s.met.bandit = s.met.bandit ?? s.met.syndicate; delete s.met.syndicate; }
    WS.sys.Shop.migrate(s); // 옛 저장본: 지도·정세·신문은 있던 그대로
    if (s.day >= 2 && s.progress && s.progress.unlocked && s.progress.unlocked.crow === undefined) s.progress.unlocked.crow = s.day; // 까마귀는 이제 첫날 밤에 온다
    this.state = s;
    return true;
  },

  toTitle() {
    this.state = this.createState();
  },
};

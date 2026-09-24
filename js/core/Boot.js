// 로딩 — 손님 스프라이트 시트·UI 아이콘·효과음·글꼴을 미리 받아 둔다.
// 받지 않고 시작하면 첫 손님이 반쯤 그려진 채 등장하거나 첫 효과음이 늦게 나온다.
WS.Boot = (() => {
  const UI_ICONS = ['gold', 'ledger', 'map', 'news', 'stock', 'time']; // 제미나이로 직접 뽑은 그림

  // 새 UI 키트(assets/ui/kit) — 첫 화면과 버튼·액자·HUD 에 쓰이는 것만 미리. 없으면 404 로 그냥 넘어간다 (나머지 신문 삽화·서신 그림은 CSS 가 필요할 때 받는다)
  const KIT_EARLY = ['title_bg', 'title_fog', 'title_logo_frame', 'title_sign', 'title_torch_1', 'title_torch_2', 'title_torch_3', 'title_moon', 'lantern', 'iron_bar', 'chain', 'crow_idle', 'crow_flap1', 'crow_flap2'];
  const KIT_UI = [
    ...['primary', 'secondary', 'danger', 'ghost'].flatMap(k => ['normal', 'hover', 'pressed', 'disabled'].map(s => `btn_${k}_${s}`)),
    'frame_wood', 'frame_brass', 'frame_iron', 'frame_parchment', 'vignette_frame', 'curtain_left', 'curtain_right', 'letter_tab',
    'icon_close', 'icon_prev', 'icon_next', 'divider_1', 'divider_2', 'divider_3', 'corner_ornament_tl', 'corner_ornament_tr', 'corner_ornament_bl', 'corner_ornament_br',
    'hud_day', 'hud_time', 'hud_gold', 'hud_stock', 'hud_ledger', 'hud_news', 'hud_map', 'hud_sound_on', 'hud_sound_off', 'wax_seal_red', 'np_masthead', 'np_rule', 'paper_letter', 'paper_news',
  ];

  const loadImg = src => new Promise(res => {
    const img = new Image();
    img.onload = img.onerror = () => res();
    img.src = src;
  });

  const imgReady = img => (img.complete && img.naturalWidth)
    ? Promise.resolve()
    : new Promise(res => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    });

  async function run(onProgress) {
    const tasks = [];
    // Sprites 캐시를 데워 두면 손님이 나올 때 같은 Image 객체를 그대로 쓴다
    for (const id of Object.keys(WS.data.sheets || {})) {
      const spr = WS.Sprites.sheet(id);
      if (spr) tasks.push(imgReady(spr.img));
    }
    WS.Sprites.artList().forEach(img => tasks.push(imgReady(img)));
    [...KIT_EARLY, ...KIT_UI].forEach(n => tasks.push(loadImg(`assets/ui/kit/${n}.png`)));
    // 2차: 가로 화면이면 파노라마 타이틀을, 종이·가죽 바탕은 작아서 함께. 나머지(도장·리본·반짝이 …)는 CSS 가 그 화면에서 처음 쓸 때 받는다
    if (window.matchMedia && matchMedia('(min-width: 760px) and (min-aspect-ratio: 1/1)').matches) tasks.push(loadImg('assets/ui/kit/title_wide.png'));
    ['paper_tile', 'leather_tile'].forEach(n => tasks.push(loadImg(`assets/ui/kit/${n}.png`)));
    UI_ICONS.forEach(n => tasks.push(loadImg(`assets/ui/${n}.png`)));
    // door_night · door_knock_1~5(스톱모션 두드림 프레임): 밤중 문 두드림 장면 (없으면 404 — loadImg 가 그냥 넘어가고, 장면은 CSS 로 그린 문을 쓴다)
    ['title', 'shop_bg', 'hand_L', 'hand_R', 'magnifier', 'storeroom', 'jewelbox', 'drawer', 'door_night', 'door_knock_1', 'door_knock_2', 'door_knock_3', 'door_knock_4', 'door_knock_5'].forEach(n => tasks.push(loadImg(`assets/scene/${n}.png`)));
    // 결말 컷신 그림 (js/render/Cinematic.js) — 없으면 404 로 넘어가고 컷신이 그 장면을 건너뛴다
    if (WS.Cinematic) WS.Cinematic.assets().forEach(src => tasks.push(loadImg(src)));
    ['cursor', 'cursor_grab', 'cursor_grabbing'].forEach(n => tasks.push(loadImg(`assets/ui/${n}.png`)));
    tasks.push(...WS.Sfx.preload());
    if (document.fonts && document.fonts.load) tasks.push(document.fonts.load("104px 'IM Fell English SC'", 'Next!')); // 타이틀 로고
    if (document.fonts && document.fonts.load) ['400 16px Hahmlet', '700 16px Hahmlet', '400 16px Diphylleia', '400 16px GowunBatangK', '700 16px GowunBatangK'].forEach(f => tasks.push(document.fonts.load(f, '가나다 일째 영업 시작'))); // 본문 · 엔딩 · 전환 글꼴
    if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready);
    const total = tasks.length;
    let done = 0;
    await Promise.all(tasks.map(p => Promise.resolve(p).catch(() => {}).then(() => onProgress(++done / total))));
  }

  return { run };
})();

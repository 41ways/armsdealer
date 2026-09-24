// 맥락 한마디(remark) 표 — 손님이 카운터에 서는 순간, "이 가게의 과거"를 기억하는 한 문장을 인사말에 얹는다.
// 엔진: CustomerManager.remark (DayManager.nextCustomer 가 부른다). 작성법·규칙: design/remarks_guide.md
//
// 한 항목 = { id, cat, when, who, tone, text, weight, cooldown, once, pos }
//   when    조건 DSL (Conditions.check — 없으면 언제나). 지금 장부·플래그·세계 변수를 본다
//   who     { faction: [..], tpl: [..], race, notFaction, kind, visits: {gte..}, minDay }  — faction·tpl 은 "또는", 나머지는 "그리고"
//   tone    말투 키 (아래 TONE). 손님의 말투와 다르면 절대 붙지 않는다 (design/voice_guide.md)
//   text    한 문장. {name} {day} {top} 같은 자리표 사용 가능
//   weight  뽑힐 무게 (기본: 선택 반응 3 · 관계/평판/세계 2 · 나머지 1)
//   cooldown 같은 항목이 다시 나오기까지 일수 (기본 config: remarks.cooldown) / once: 한 판에 한 번
//   pos     'before' | 'after' — 인사말 앞/뒤 (없으면 앞 60%)
// 아래 R(...) 도우미가 한 조건에 여러 말투의 대사를 한 번에 펼쳐 준다 (키 = 세력 id, 틀 id, 또는 'a|b' 묶음).
(() => {
  // 말투 배정 — 세력 기본 말투, 그리고 다른 말투를 쓰는 틀
  const FT = {
    kingdom: 'hao', goblin: 'goblin', dwarf: 'dwarf', village: 'hae', demon: 'hage', demonlord: 'hara', fairy: 'hae',
    mage: 'hage', merc: 'hara', hunter: 'hao', vampire: 'hao', undead: 'hao', dragon: 'kobold', guild: 'hao', church: 'hao',
    noble: 'hao', bandit: 'hara', orc: 'hara', pirate: 'hara', alchemist: 'hage', golem: 'golem', traveler: 'hao', unknown: 'mystic',
  };
  const TT = {
    k_adventurer: 'hae', k_hero: 'hae', mg_apprentice: 'hae', ch_priest: 'hae', nb_serena: 'hae', nb_aldric: 'hara', al_peddler: 'hao',
    ch_templar: 'hao', nb_courtier: 'hao', k_soldier: 'hao', k_soldier2: 'hao', k_mage: 'hao', k_paladin: 'hao',
    d_smith: 'dwarf', d_smith2: 'dwarf', d_collector: 'dwarf', d_refugee: 'dwarf', d_gunsmith: 'dwarf',
    mg_scholar: 'hage', al_researcher: 'hage', v_hunter: 'hae', v_oath_folk: 'hae', mc_powder: 'hara', mc_sellsword: 'hara', gl_engineer: 'golem', gl_courier: 'golem',
    dr_kobold: 'kobold', dr_hoard: 'kobold',
  };
  const WHO_DEFAULT_WEIGHT = { choice: 3, rel: 2, rep: 2, world: 2, shop: 1, time: 1, repeat: 1, ambient: 1 };
  const list = [];
  let cat = 'ambient';
  const S = c => { cat = c; };
  const R = (id, when, map, o = {}) => {
    for (const [key, v] of Object.entries(map)) {
      const keys = key.split('|');
      const facs = keys.filter(k => FT[k]), tpls = keys.filter(k => !FT[k]);
      const who = {};
      if (facs.length) who.faction = facs;
      if (tpls.length) who.tpl = tpls;
      Object.assign(who, o.who);
      const tone = TT[keys[0]] || FT[keys[0]];
      [].concat(v).forEach((text, i) => {
        const r = { id: `${id}.${keys[0]}${i ? i + 1 : ''}`, cat, tone, who, text, weight: o.w ?? WHO_DEFAULT_WEIGHT[cat] };
        if (when) r.when = when;
        if (o.cd) r.cooldown = o.cd;
        if (o.once) r.once = true;
        if (o.pos) r.pos = o.pos;
        list.push(r);
      });
    }
  };

  // ═════════ (a) 과거 선택 반응 — 누구에게 팔았나 · 누구를 도왔나 ═════════
  S('choice');
  R('goblin_arms', { sold: { faction: 'goblin', tag: 'weapon', min: 6 } }, {
    kingdom: '숲 놈들에게 칼을 꽤 파셨다지. 병영에도 그 소문이 돌았소.',
    village: '고블린한테 칼을 많이 파셨다는 얘기, 마을까지 들렸어요.',
    'noble|guild': '고블린에게 무기를 대신다는 말이 들리던데, 나는 못 들은 걸로 하겠소.',
    hunter: '숲에서 고블린 손에 새 칼이 들려 있더이다. 어디서 났는지는 묻지 않겠소.',
    goblin: '인간! 여기 칼 좋다고 숲에서 소문났다구! 다들 줄 선다구!',
    orc: '고블린 놈들 칼이 이 가게 거라며. 우리 몫도 남겨 뒀겠지.',
    merc: '고블린한테도 파는 가게라며. 돈 되면 누구든 좋지. 마음에 들어.',
    dwarf: '허허, 숲 꼬마들에게 칼을 대셨다지? 이쪽 손님도 잊지 말게나.',
    k_adventurer: '고블린한테 칼을 파신다는 얘기가 있던데… 소문이죠? 그렇죠?',
  });
  R('kingdom_arms', { sold: { faction: 'kingdom', tag: 'weapon', min: 6 } }, {
    kingdom: '우리 병영 칼이 죄다 이 가게 물건이라지. 믿음직스럽소.',
    village: '병사 아저씨들 허리춤 칼이 이 가게 거라던데요. 든든해요.',
    goblin: '왕국 병사 칼이 다 이 가게 거라며, 인간? 그럼 우리 것도 팔아야 공평하다구, 킥킥!',
    bandit: '왕국 병사들 칼을 대는 집이라며. 말조심해서 다녀야겠군.',
    merc: '병사 놈들 칼도 여기 거고 우리 칼도 여기 거고. 편한 세상이야.',
    dwarf: '왕국 병영에 칼을 넉넉히 대신다지? 허허, 철값이 오르겠구먼.',
    orc: '왕국 놈들에게 칼을 대는 가게로군. 우리한텐 안 판다면 곤란하다.',
  });
  R('dwarf_ore', { sold: { faction: 'dwarf', tag: 'material', min: 12 } }, {
    dwarf: '허허, 철 좋다고 대장간마다 자네 가게 얘기라네. 화로 앞에서 다들 그러더군.',
    goblin: '드워프 땅꾼들한테 철을 잔뜩 팔았다며, 인간? 흥! 우리 몫도 남기라구!',
    kingdom: '드워프 대장간에 철을 대신다지. 병기창에 물건이 들어오는 건 그쪽 덕이오.',
    merc: '철은 드워프한테 몰아주나 봐? 우린 뭘로 칼을 가나.',
    orc: '드워프 놈들 철 창고만 채우지 마라.',
  });
  R('village_sold', { sold: { faction: 'village', min: 4 } }, {
    village: '이 가게 물건, 마을 사람들 사이에서 평이 좋아요. 값도 정직하대요.',
    hunter: '마을 사람들 사이에서 이 가게 평이 좋소. 사냥 나가는 이도 여기서 채우더이다.',
    kingdom: '마을 사람들도 이 가게를 자주 찾는다지. 병영 근처 마을에선 이만한 곳이 없소.',
    bandit: '마을 촌뜨기들도 여기 드나든다더군. 털 게 없는 손님이지만.',
  });
  R('sold_yday_own', { sold: { min: 1, withinDays: 1, faction: 'goblin' } }, {
    goblin: '어제 우리 애가 여기서 칼 사 갔다구! 좋다고 자랑했다구, 인간!',
    kingdom: '어제 고블린 하나가 이 가게에서 나오는 걸 봤소. …그저 봤다는 얘기요.',
    village: '어제 이 가게에서 고블린이 나오는 걸 봤어요. 무서워서 돌아서 갔어요.',
    hunter: '어제 이 가게 앞에서 고블린 발자국을 봤소. 손님이었나 보구려.',
  }, { cd: 3 });
  R('sold_yday_kingdom', { sold: { min: 2, withinDays: 1, faction: 'kingdom' } }, {
    goblin: '어제 왕국 병사들이 이 가게에 몰려갔다구. 냄새난다구, 인간!',
    kingdom: '어제 이 가게에서 산 물건을 동료가 자랑하더이다. 나도 하나 장만하려 하오.',
    orc: '어제 왕국 놈들이 이 가게를 드나들었더군. 우리도 지지 않는다.',
  }, { cd: 3 });
  R('sold_yday_village', { sold: { min: 1, withinDays: 1, faction: 'village' } }, {
    village: '어제 옆집 아저씨가 이 가게에서 쟁기 날을 사 갔어요. 좋다고 하더라고요.',
    goblin: '어제 마을 놈들도 여기 왔다며. 인간끼리 잘 지낸다구, 킥킥!',
  }, { cd: 3 });
  R('bought_loot', { bought: { faction: 'bandit', min: 3 } }, {
    k_soldier: '출처 모를 물건이 이 근처에서 돈다는 소문이오. 그저 소문이오.',
    guild: '출처가 불분명한 물건은 조심하시오. 감찰청이 들여다보기 시작하면 골치 아프오.',
    bandit: '이 가게 장물도 받는다며. 고맙다, 아주.',
    pirate: '뒤가 구린 물건도 받아 준다지. 다음엔 우리 물건도 봐라.',
  });
  R('fairy_forest', { flag: 'fairy_blessing' }, {
    fairy: '숲이 이 가게를 기억해요. 나무들이 속삭였어요, 좋은 곳이라고.',
    hunter: '숲에서 요정 불빛이 이 가게 쪽으로 흐르더이다. 좋은 징조 같소.',
  });
  R('fairy_betrayed', { flag: 'fairy_betrayed' }, {
    fairy: '숲은 약속을 어긴 가게를 기억해요. …물건만 살게요.',
  });
  R('fairy_exodus', { flag: 'fairy_exodus' }, { fairy: '숲이 시들어서 다들 떠나고 있어요. 저도 곧 가야 해요.' });
  R('village_helped', { flag: 'helped_village' }, {
    village: '이 가게가 우리 마을에 물건을 대 주셨다면서요. 다들 고마워해요.',
    hunter: '마을 사람들이 이 가게 얘기를 하며 웃더이다. 좋은 일이오.',
  });
  R('dwarf_contract', { all: [{ flag: 'dwarf_contract' }, { noFlag: 'dwarf_contract_broken' }] }, {
    dwarf: '계약대로 철을 내주는 인간은 자네뿐이라네. 산채에서도 다들 아네.',
    guild: '드워프 산채와 장기 계약을 맺으셨다지. 길드 장부에도 오를 만한 거래요.',
  });
  R('dwarf_contract_broken', { flag: 'dwarf_contract_broken' }, {
    dwarf: '…계약을 어긴 가게에서 사려니 속이 쓰리군. 허허, 물건은 필요하니 어쩌겠나.',
    goblin: '드워프 놈들 계약을 깼다며! 인간, 배짱 있다구, 킥킥!',
  });
  R('leon_contract', { all: [{ flag: 'leon_contract' }, { noFlag: 'leon_contract_broken' }, { noFlag: 'leon_fell' }] }, {
    'k_soldier|k_soldier2|k_paladin': '레온 단장님이 이 가게 단골이시라구요. 병영에서도 소문이 자자하오.',
    village: '레온 경이 이 가게를 아끼신다고 들었어요. 마을에서도 든든하다고들 해요.',
    'k_adventurer|k_hero': '레온 단장님 단골 가게라면서요! 저도 이 가게 물건 써 보고 싶었어요!',
  });
  R('leon_fell', { flag: 'leon_fell' }, {
    kingdom: '레온 경이 전사하셨소. 병영에서 아직도 이름을 입에 올리지 못하오.',
    village: '레온 경이 돌아가셨대요. 마을 사람들이 모두 울었어요.',
    hunter: '레온 경의 소식을 들었소. 좋은 사람이 먼저 가는구려.',
  }, { cd: 10 });
  R('leon_tavern', { flag: 'leon_tavern' }, {
    'kingdom|hunter|guild': '레온 경이 여관을 열었다지. 나도 한잔하러 가야겠소.',
    village: '레온 경이 여관을 열었대요! 마을에서도 한번 가 보자고들 해요.',
  });
  R('leon_refused', { flag: 'refused_leon' }, {
    kingdom: '레온 경의 부탁을 거절하셨다더군. …기사단이 섭섭해하오.',
  });
  R('leon_broken', { flag: 'leon_contract_broken' }, {
    kingdom: '레온 단장님과의 계약을 저버리셨다지. 병영 분위기가 차갑소.',
  });
  R('leon_commander', { flag: 'leon_commander' }, {
    kingdom: '레온 경이 기사단장에 오르셨소. 이 가게에서 칼을 맞추신 뒤로 운이 트였다고들 하오.',
  });
  R('pin_hired', { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }] }, {
    village: '가게에서 일하는 저 애, 착하더군요. 핀이라고 했죠? 열심히 하던데요.',
    kingdom: '꼬마 하나가 뒷일을 돕던데, 눈치가 빠르더군. 잘 두셨소.',
    fairy: '이 가게에 마음이 맑은 아이가 있네요. 숲이 좋아할 거예요.',
  });
  R('pin_squire', { flag: 'pin_squire' }, {
    kingdom: '핀이라는 아이가 레온 경 종자가 되었다지. 잘 컸소.',
    village: '핀이 기사님 종자가 됐대요! 마을에서도 자랑이에요.',
  });
  R('pin_smith', { flag: 'pin_to_smith' }, {
    village: '핀이 대장간에서 일한대요. 손이 야무진 애라서요.',
    dwarf: '핀이란 꼬마 말일세, 드발네 대장간에서 제법 손이 빠르다네. 허허.',
  });
  R('pin_army', { flag: 'pin_to_army' }, {
    kingdom: '핀이라는 소년이 입대했다더군. 나이에 비해 기특하다고들 하오.',
    village: '핀이 군대에 갔대요… 무사히 돌아오면 좋겠어요.',
  });
  R('pin_jailed', { flag: 'pin_jailed' }, { village: '핀이 옥에 갇혔다면서요… 그런 애가 아닌데.' });
  R('pin_gone_generic', { all: [{ flag: 'pin_gone' }, { noFlag: 'pin_squire' }, { noFlag: 'pin_to_smith' }, { noFlag: 'pin_to_army' }, { noFlag: 'pin_jailed' }] }, {
    village: '그 아이가 가게를 떠났다면서요. 어디서든 잘 지내면 좋겠어요.',
  });
  R('marga_reported', { flag: 'reported_marga' }, {
    'kingdom|hunter': '수배자 마르가를 넘겨 준 가게라 들었소. 왕국을 위한 일이었소.',
    village: '마르가 아주머니 일은… 저는 뭐라 못 하겠어요. 그저 안타까워요.',
    goblin: '곡식 아줌마를 감찰관한테 넘겼다며, 인간? 그건 좀 그렇다구.',
  });
  R('told_inspector', { flag: 'told_inspector' }, {
    kingdom: '감찰관에게 사실대로 답하셨다지. 청렴하다는 평이 있소.',
    guild: '감찰청에 협조하셨다는 소문이오. 신용을 얻으셨을 것이오.',
    goblin: '인간이 감찰관한테 다 불었다며? 고블린 편 아니었냐구!',
    village: '감찰관님께 정직하게 말씀하셨다면서요. 존경스러워요.',
  });
  R('lied_inspector', { flag: 'lied_inspector' }, {
    bandit: '감찰관을 속였다지? 배짱 하나는 좋군.',
    merc: '감찰관 앞에서 거짓말을 했다며? 재미있는 가게로군.',
    k_soldier: '감찰청이 이 가게 진술을 다시 들여다본다는 소문이오. 조심하시오.',
  });
  R('integrity_high', { var: 'integrity', gte: 8 }, {
    kingdom: '원칙대로 장사하는 가게라 들었소. 요즘 보기 드문 일이오.',
    village: '이 가게는 값을 속이지 않는다고 소문이 났어요.',
    church: '이 가게는 원칙을 지킨다 하오. 빛이 그런 이를 굽어살피기를.',
  });
  R('integrity_low', { var: 'integrity', lte: -8 }, {
    bandit: '이 가게는 융통성이 있다더군. 그게 좋아.',
    guild: '이 가게는 셈이 유연하다는 평이오. 위험하지만 이해는 하오.',
    merc: '융통성 있는 가게라며. 마음에 들어.',
  });
  R('audit_rumor', { flag: 'illegal_sale' }, {
    k_soldier: '이 가게 장부 감사가 곧 있다는 소문이 병영에 돌고 있소.',
    guild: '장부를 깨끗이 해 두시오. 감찰청이 곧 움직일 거라 들었소.',
    bandit: '장부 감사가 온다며? 우린 장부를 태우면 그만인데, 넌 어쩔 거냐.',
  });
  R('smuggle_rumor', { flag: 'smuggle_route' }, {
    bandit: '이 가게 뒷문으로 짐이 드나든다지. 우린 아무 말도 안 했다.',
    guild: '이 가게 뒷골목 거래 소문이 있소. 나는 못 들은 걸로 하겠소.',
    k_soldier: '밤중에 이 가게 뒷문 근처에서 수레 소리가 난다는 신고가 있었소. 확인된 바는 없소.',
    pirate: '뒷문 장사 한다며. 항구에서도 다 알아.',
  });
  R('secret_arms', { any: [{ flag: 'armed_prince_secret' }, { flag: 'armed_princess_secret' }] }, {
    nb_courtier: '궁정 무기고가 어딘가에서 몰래 채워진다는 말이 있소. 출처는 묻지 않겠소.',
    k_soldier: '궁에서 무기가 몰래 오간다는 얘기가 있소. 우리 눈은 못 속이오.',
  });
  R('court_inquiry', { eventFired: 'court_inquiry' }, {
    'kingdom|noble': '궁정 조사 소식 들으셨소? 수상한 물자 흐름을 캐고 있다 하오.',
  });
  R('crow_seen', { crow: { gte: 3 } }, {
    village: '이 가게 지붕에 까마귀가 자주 앉더라고요. 편지 쓰시나 봐요?',
    hunter: '지붕 위 까마귀, 훈련이 잘 된 놈이오. 전서용이구려.',
    guild: '까마귀 편지를 쓰신다지. 길드도 편지 거래소를 열어야 하나 고민이오.',
    goblin: '인간 가게에 까마귀 있다구! 나도 한 마리 갖고 싶다구, 킥킥!',
    'mg_scholar|al_researcher': '까마귀를 통신에 쓰다니, 기본에 충실하군. 우리 쪽엔 더 빠른 것이 있네만.',
  });
  R('crow_many', { crow: { gte: 8 } }, {
    bandit: '까마귀 자주 날리더군. 우리 애들도 그 까마귀가 어디로 가는지 지켜본다.',
    merc: '까마귀 날리는 가게라… 소식통이겠군. 말 좀 아껴야겠어.',
  });
  R('informant', { flag: 'informant_office' }, {
    goblin: '감찰청이 이 가게를 제보처로 삼았다며? 인간, 입조심하라구!',
    bandit: '감찰청 끄나풀 가게라며. 우린 입 다물고 물건만 산다.',
    merc: '제보처라며. 말은 아끼지.',
  });
  R('excommunicated', { flag: 'excommunicated' }, {
    village: '이 가게 파문당했다면서요… 그래도 저는 상관없어요.',
    ch_templar: '파문된 자의 가게에서 물건을 사는 것은 꺼려지오. 그러나 오늘은 어쩔 수 없소.',
  });
  R('demon_contract', { flag: 'demon_contract' }, {
    ch_templar: '안개 상단과 계약을 맺었다는 소문이 있소. 성당은 그것을 좋게 보지 않소.',
    hunter: '안개 상단 사람이 이 가게를 들락거린다더이다. 눈여겨보고 있소.',
  });
  R('vampire_friend', { any: [{ flag: 'vampire_friend' }, { flag: 'vampire_backed' }] }, {
    vampire: '궁정에서 이 가게 이야기가 들리더이다. 좋은 뜻으로 말이오.',
    hunter: '이 가게가 흡혈귀 궁정과 가깝다는 말이 있소. 사실이 아니길 바라오.',
  });
  R('powder_dealer', { flag: 'powder_dealer' }, {
    'merc|pirate': '네가 검은 가루를 다룬다며. 나도 한 통 얹어 다오.',
    kingdom: '화약을 다루신다는 소문이 있소. 감찰청이 눈여겨보고 있소.',
    dwarf: '검은 가루 장사를 하신다지? 허허, 위험한 물건이라네. 조심하게.',
  });
  R('gold_rich', { gold: { gte: 1500 } }, {
    bandit: '요즘 금고가 두둑하다는 소문이야. 문단속 잘해라.',
    guild: '장사가 번창하신다니 반갑소. 길드에 들 생각은 없으시오?',
    village: '이 가게 요즘 잘된다면서요? 부러워요.',
    merc: '돈 좀 만졌다며. 한턱 내야지.',
  });
  R('gold_poor', { gold: { lt: 120 } }, {
    guild: '자금이 빠듯하다는 소문이 있소. 길드의 문은 열려 있소.',
    bandit: '요즘 금고가 얇다며? 도둑맞을 것도 없어 좋겠군.',
    village: '가게가 힘들다는 소문이 돌아요. 힘내세요.',
  });

  // ═════════ (b) 우호도 구간 — 그 세력과 가까우면 호의, 멀면 경계 (rel_<세력>) ═════════
  S('rel');
  const REL_HI = {
    kingdom: '왕실 조달 쪽에서 이 가게 얘기를 자주 하오. 잘하고 계시오.',
    goblin: '인간, 넌 숲의 친구다구! 우리 애들이 다 안다구, 킥킥!',
    dwarf: '허허, 이 가게라면 믿고 거래한다네. 산채에서도 자네 이름이 오르내리지.',
    village: '이 가게에 오면 마음이 놓여요. 마을 사람들이 다들 그렇게 말해요.',
    demon: '안개 속에서도 이 가게의 등불은 잘 보이더군. 좋은 인연일세.',
    demonlord: '여기 물건은 군세에 도움이 된다. 상관께서도 이 가게 이름을 아신다.',
    fairy: '이 가게 앞에 서면 숲 냄새가 나요. 좋은 뜻이에요.',
    mage: '이 가게라면 길드 사이에서도 평이 좋다네. 재료 취급이 정직하다더군.',
    merc: '우리 단장이 이 가게는 믿을 만하다고 했어. 값도 후하고.',
    hunter: '조합에서 이 가게 평이 좋소. 사냥꾼에게 정직하다고들 하오.',
    vampire: '궁정에서 이 가게를 기억하고 있소. 좋은 뜻으로 말이오.',
    ch_priest: '성당에서 이 가게 이야기가 좋게 나와요. 축복이 있기를요.',
    ch_templar: '성당 기사단에서도 이 가게는 믿을 만하다 하오.',
    nb_courtier: '궁정 부인들이 이 가게 이야기를 하더이다. 안목이 좋으시다고.',
    guild: '길드 장부에서 이 가게 신용은 상당하오. 좋은 거래처요.',
    bandit: '이 가게, 우리 사이엔 입이 무겁다고 소문났지. 그거 좋은 거야.',
    orc: '전투단 놈들이 네 가게 물건 좋다더라. 나도 써 보러 왔다.',
    pirate: '항구에서 이 가게 소문이 자자하더라. 값이 후하다고.',
    alchemist: '학회에서도 이 가게 재료는 순도가 좋다 하더군.',
  };
  const REL_LO = {
    kingdom: '요즘 이 가게가 왕국에 그리 우호적이지 않다는 얘기가 있소. 사실이 아니길 바라오.',
    goblin: '…인간, 요즘 너 마음에 안 든다구. 물건만 사고 간다구.',
    dwarf: '흥, 자네 요즘 산채에서 미운털이 박혔다네. …그래도 철은 필요하니 사겠네.',
    village: '요즘 마을에선 이 가게를 좀… 아니에요, 물건만 볼게요.',
    demon: '이 가게와의 인연이 식었다는 얘기가 안개 상단에 돌더군. 아쉬운 일일세.',
    demonlord: '…네 가게 이름이 군막에서 좋게 불리진 않는다. 조심해라.',
    fairy: '숲이 이 가게를 조금 경계해요. 저는 그래도 볼게요.',
    mage: '길드에서 이 가게를 미덥지 않다 하더군. 나는 직접 보러 왔네.',
    merc: '단장이 이 가게 뒷말을 하더군. 난 물건만 볼 거야.',
    hunter: '조합원들이 이 가게를 곱게 안 보오. …나는 일단 물건부터 보겠소.',
    ch_priest: '성당에선 이 가게가 조금 걱정이라고들 해요…',
    ch_templar: '성당은 이 가게를 주시하고 있소. 처신을 조심하시오.',
    nb_courtier: '궁정에서 이 가게를 두고 말이 많소. 좋은 쪽은 아니오.',
    guild: '길드 장부에서 이 가게 이름 옆에 물음표가 붙었소. 알고 계시오?',
    bandit: '…이 가게, 우리한테 등 돌렸다며. 칼은 사 가겠지만 말이야.',
    orc: '우리 대장이 이 가게를 싫어한다. 난 상관없다. 칼만 있으면 돼.',
  };
  // 세력별 rel 변수가 있는 키만 (틀 키는 세력 이름으로 매핑)
  const REL_FAC = { ch_priest: 'church', ch_templar: 'church', nb_courtier: 'noble' };
  for (const [k, text] of Object.entries(REL_HI)) R(`rel_hi_${k}`, { var: `rel_${REL_FAC[k] || k}`, gte: 8 }, { [k]: text }, { cd: 7 });
  for (const [k, text] of Object.entries(REL_LO)) R(`rel_lo_${k}`, { var: `rel_${REL_FAC[k] || k}`, lte: -6 }, { [k]: text }, { cd: 7 });

  // ═════════ (c) 평판 구간 ═════════
  S('rep');
  R('rep_hi', { var: 'reputation', gte: 25 }, {
    'kingdom|hunter|guild': '소문이 좋소. 이 도시에서 무기를 구하려면 이 가게라고들 하더이다.',
    'village|fairy': '이 가게 평판이 좋다고 들었어요. 믿고 왔어요.',
    goblin: '인간 가게 소문 좋다구! 그래서 왔다구!',
    'merc|bandit|pirate': '소문이 좋더군. 값도 정직하다던데 어디 보자.',
    dwarf: '허허, 평판이 좋은 가게라 들었네. 기대하겠네.',
    'mg_scholar|al_researcher': '이 가게가 정직하다는 소문이 길드까지 왔더군. 기대해 보지.',
  }, { cd: 8 });
  R('rep_lo', { var: 'reputation', lte: 3 }, {
    'kingdom|hunter|guild': '이 가게 평판이 그리 좋지는 않더이다. 직접 보러 왔소.',
    'village|fairy': '이 가게, 좋은 말만 있진 않더라고요… 그래도 왔어요.',
    goblin: '인간 가게 소문이 별로라구. 그래도 물건은 볼 만하다구!',
    'merc|bandit|pirate': '소문이 시원찮더군. 물건이나 보자.',
    dwarf: '허허, 평판이 좀 그렇다지만 물건이 좋으면 됐지 않겠나.',
  }, { cd: 8 });

  // ═════════ (d) 세계 사건 — 진행 중인 일이 화제가 된다 ═════════
  S('world');
  const WAR = { all: [{ flag: 'war' }, { noFlag: 'goblin_victory' }, { noFlag: 'kingdom_victory' }] };
  R('war', WAR, {
    kingdom: '전선 소식 들었소? 곧 우리 부대에도 징집 명령이 내려올 거요.',
    'k_adventurer|k_hero': '전쟁이 났다고 다들 칼을 찾아요. 저도 조금 무서워요.',
    village: '전쟁 소식에 마을 사람들이 겁먹었어요. 아이들이 밤에 잠을 못 자요.',
    goblin: '왕국이랑 싸움이 났다구! 우리가 이긴다구, 인간!',
    dwarf: '허허, 전쟁이라… 철값이 뛰겠구먼. 대장간엔 바쁜 시절이지.',
    merc: '전쟁이라, 좋은 계절이야. 칼값 두둑이 받아야지.',
    guild: '전쟁으로 교역로가 흔들리오. 재고를 넉넉히 쌓아 두시오.',
    bandit: '전쟁 통에 세상이 어수선하군. 우리한텐 기회지.',
    ch_priest: '전쟁터에 보낼 붕대와 약이 모자라요. 기도만으로는 안 돼요.',
  }, { cd: 5 });
  R('war_goblin_won', { flag: 'goblin_victory' }, {
    goblin: '우리가 이겼다구! 왕국 놈들 성벽이 무너졌다구!',
    kingdom: '패전 소식에 병영이 조용하오. …그래도 살아남은 이들에겐 칼이 필요하오.',
    village: '전쟁이 끝났다는데… 아직도 무서워요.',
  }, { cd: 8 });
  R('war_kingdom_won', { flag: 'kingdom_victory' }, {
    kingdom: '승전 소식이오! 술집마다 노랫소리가 끊이지 않소.',
    goblin: '왕국 놈들이 이겼다구… 다음엔 안 진다구!',
    village: '전쟁이 끝났대요! 이제 발 뻗고 잘 수 있겠어요.',
  }, { cd: 8 });
  R('demon_war', { all: [{ flag: 'demon_war' }, { noFlag: 'demonlord_repelled' }, { noFlag: 'demonlord_victory' }] }, {
    kingdom: '북쪽에서 마왕군이 내려온다 하오. 이런 때 무기가 잠들어서야 되겠소.',
    village: '북쪽 하늘이 붉대요… 마을 어른들이 짐을 싸고 있어요.',
    ch_templar: '마왕군을 물리쳐야 하오. 빛의 이름으로.',
    demonlord: '곧 끝난다. 준비해 둬라.',
    merc: '마왕군이라니… 몸값이 올라가겠어.',
  }, { cd: 5 });
  R('demonlord_repelled', { flag: 'demonlord_repelled' }, {
    kingdom: '마왕군을 몰아냈소. 이 도시가 버텨 냈소.',
    village: '마왕군이 물러났대요. 정말 다행이에요.',
  }, { cd: 8 });
  R('dragon_awake', { all: [{ flag: 'dragon_awake' }, { noFlag: 'dragon_slain' }, { noFlag: 'dragon_razed' }] }, {
    kingdom: '북쪽 산에서 용이 깼다 하오. 성벽 수비대가 밤낮으로 고생이오.',
    village: '용이 깼다는 소문에 마을이 텅 비어 가요.',
    dwarf: '허허, 산 밑에서 뭔가 뒤척이는 소리가 났다네. 용이란 게 정말 있었을 줄이야.',
    'dr_kobold|dr_hoard': '주인님이 깨어나셨다, 캬! 곧 세상이 뜨거워진다, 캬!',
    guild: '용이 깨어난 뒤로 북쪽 교역로가 끊겼소. 손해가 막심하오.',
  }, { cd: 5 });
  R('dragon_slain', { flag: 'dragon_slain' }, {
    kingdom: '용을 잡았다니 아직도 꿈만 같소.',
    village: '용이 죽었대요. 정말로 사람이 해냈다니.',
    goblin: '용이 죽었다구? 인간들 무섭다구, 킥킥.',
    hunter: '용 비늘이 어디로 팔릴지 궁금하오. 사냥꾼이라면 누구나 그렇소.',
  }, { cd: 8 });
  R('dragon_razed', { flag: 'dragon_razed' }, {
    kingdom: '성이 불탄 자리를 아직 치우고 있소.',
    village: '용이 지나간 자리에서 아직도 연기가 나요.',
  }, { cd: 8 });
  R('succession', { all: [{ flag: 'succession_crisis' }, { noFlag: 'crowned' }] }, {
    nb_courtier: '폐하께서 편찮으신 뒤로 궁정이 어수선하오.',
    kingdom: '국왕 폐하께서 많이 편찮으시다 하오. 병영도 술렁이고 있소.',
    village: '임금님이 편찮으시다는데… 나라가 어떻게 되려나요.',
    merc: '왕이 병들면 왕자님들이 칼을 뽑겠지. 우린 그때 바빠질 거야.',
  }, { cd: 5 });
  R('crowned_aldric', { flag: 'king_aldric' }, {
    kingdom: '새 폐하께서 즉위하셨소. 병영 기강이 달라졌소.',
    village: '새 임금님은 무서운 분이라던데요…',
    nb_courtier: '즉위식이 성대했소. 이제 궁정도 안정될 것이오.',
    merc: '왕이 알드릭이면 우리 대접이 달라지지.',
  }, { cd: 8 });
  R('crowned_serena', { flag: 'queen_serena' }, {
    kingdom: '여왕 폐하께서 즉위하셨소. 신전 종소리가 사흘 울렸소.',
    village: '여왕님이 백성 이야기를 들어 주신다고 해요.',
    guild: '여왕 폐하의 통상 칙령이 곧 나온다 하오. 상인들은 벌써 셈을 하고 있소.',
  }, { cd: 8 });
  R('civil_war', { flag: 'civil_war' }, {
    kingdom: '왕위를 둘러싼 내전이오. 병영도 반으로 갈렸소.',
    village: '내전이라니… 우리 마을은 어느 쪽 편도 안 들어요.',
  }, { cd: 6 });
  R('powder_new', { all: [{ flag: 'powder_invented' }, { noFlag: 'powder_banned' }] }, {
    'mg_scholar|al_researcher': '검은 가루라는 게 나왔다지. 학회에서도 화제일세.',
    dwarf: '허허, 그 검은 가루 말일세. 대장장이들 사이에서도 말이 많다네.',
    merc: '검은 가루 얘기 들었어? 그게 있으면 창칼은 필요 없다던데.',
    pirate: '화약이란 게 나왔다며. 배에 대포를 달 수 있겠어.',
    village: '검은 가루가 폭발한다면서요? 무서워서 부엌불도 조심하게 돼요.',
  }, { cd: 5 });
  R('powder_banned', { flag: 'powder_banned' }, {
    kingdom: '검은 가루는 금지되었소. 아시겠지만 말이오.',
    guild: '화약 금지령이 내려온 뒤로 거래가 뒷골목으로 숨었소.',
    'merc|pirate|bandit': '검은 가루가 금지라니, 불티나겠군. 뒷값이 오르니까.',
  }, { cd: 6 });
  R('mist', { var: 'demon_influence', gte: 10 }, {
    village: '요즘 안개가 심해요. 앞이 한 치도 안 보여요.',
    kingdom: '안개가 짙어 순찰이 힘드오. 어제도 길을 잃은 병사가 있었소.',
    dwarf: '허허, 산에까지 안개가 올라오네. 화로 불이 다 꺼질 지경일세.',
    goblin: '안개가 짙다구, 인간! 숲에서 길 잃은 애들이 많다구!',
    hunter: '안개 속에서는 발자국도 못 쫓소. 사냥하기 나쁜 때요.',
    merc: '안개 낀 날은 어째 기분이 별로야.',
    fairy: '안개가 짙어서 숲의 빛이 잘 안 보여요. 조금 쓸쓸해요.',
  }, { cd: 4 });
  R('graves', { any: [{ flag: 'graves_opened' }, { var: 'undead_power', gte: 18 }] }, {
    ch_priest: '밤마다 공동묘지가 소란스럽다고 해요. 성당에서도 걱정이 커요.',
    kingdom: '묘지에서 이상한 소리가 난다는 신고가 늘었소. 순찰이 부족하오.',
    village: '밤엔 마을 밖에 안 나가요. 무덤 쪽에서 소리가 나서요.',
    hunter: '묘지 근처 발자국이 이상하오. 사람의 것이 아니오.',
  }, { cd: 5 });
  R('dead_march', { eventFired: 'dead_march' }, {
    kingdom: '망자 행렬이 성문 쪽으로 온다 하오. 방어 물자가 시급하오.',
    village: '죽은 사람들이 걸어온대요… 무서워서 문을 걸어 잠갔어요.',
  }, { cd: 6 });
  R('dwarf_fallen', { flag: 'dwarf_fallen' }, {
    dwarf: '산채가 무너진 뒤로 대장간 불이 다 꺼졌네. …그래도 자네 가게는 아직 불이 켜져 있군, 허허.',
    kingdom: '드워프 산채가 함락됐다니… 철 수급이 걱정이오.',
    goblin: '드워프 놈들 산채가 무너졌다구! 통쾌하다구, 킥킥!',
    guild: '드워프 광산이 멈춘 뒤로 철값이 요동치오.',
  }, { cd: 6 });
  R('dwarf_saved', { flag: 'dwarf_saved' }, { dwarf: '산채가 무사한 건 자네 같은 인간이 있어서일세. 허허, 잊지 않겠네.' }, { cd: 8 });
  R('dwarf_golden', { flag: 'dwarf_golden_age' }, { dwarf: '허허, 요즘 산채엔 좋은 시절이네. 용광로가 밤새 타오른다네.' }, { cd: 8 });
  R('iron_high', { var: 'iron_price', gte: 130 }, {
    dwarf: '철값이 하늘로 솟았네. 대장간 사람들 얼굴이 어둡다네.',
    kingdom: '철값이 뛰어서 병기창 예산이 빠듯하오.',
    village: '쟁기 하나 고치는 데도 돈이 두 배예요.',
    merc: '철값이 이렇게 뛰면 칼값도 올려 받아야지.',
  }, { cd: 5 });
  R('iron_low', { var: 'iron_price', lte: 85 }, {
    dwarf: '허허, 철값이 내려서 대장간엔 활기가 없네만, 사는 쪽은 좋겠군.',
    village: '철값이 내려서 농기구를 새로 샀어요.',
  }, { cd: 5 });
  R('monsters', { var: 'monster_pop', gte: 36 }, {
    hunter: '짐승 수가 심상치 않소. 숲 가장자리까지 내려오고 있소.',
    village: '요즘 밤마다 짐승 울음이 가까워요. 아이들을 밖에 못 내보내요.',
    kingdom: '가도에 몬스터가 늘었소. 순찰을 두 배로 늘렸소.',
    'k_adventurer|k_hero': '요즘 몬스터가 많아서 일거리가 넘쳐요! 무섭긴 하지만요.',
  }, { cd: 5 });
  R('routes_bad', { var: 'trade_routes', lte: 35 }, {
    guild: '교역로가 위험하오. 물자가 제때 들어오지 않소.',
    pirate: '가도가 어수선해서 바닷길이 바빠졌다. 값이 올랐지.',
  }, { cd: 6 });
  R('economy_good', { var: 'economy', gte: 62 }, {
    guild: '경기가 풀렸소. 상인들 지갑이 열리는 때요.',
    village: '요즘 장터에 활기가 돌아서 좋아요.',
  }, { cd: 6 });
  R('economy_bad', { var: 'economy', lte: 38 }, {
    guild: '경기가 얼어붙었소. 장사하기 힘든 때요.',
    village: '장에 나가도 사는 사람이 없어요.',
  }, { cd: 6 });
  R('vampire_known', { flag: 'vampire_known' }, {
    ch_priest: '성당에서 흡혈귀 얘기가 나와요. 정말 이 도시에 있대요?',
    hunter: '흡혈귀가 도시에 있다는 게 밝혀진 뒤로 조합이 바쁘오.',
    village: '흡혈귀가 있다는 게 정말이래요. 밤에 문을 두 번 잠가요.',
    vampire: '…사냥꾼들의 발걸음이 요란해졌소. 이 가게는 조용해서 좋구려.',
  }, { cd: 6 });
  R('golem_workshop', { flag: 'golem_workshop' }, {
    dwarf: '골렘 공방이 세워졌다더군. 대장장이가 할 일을 기계가 한다네.',
    'mg_scholar|al_researcher': '골렘 공방 소식은 들었나? 길드에서도 화제일세.',
    guild: '골렘 공방이 생기고 인력 수요가 바뀌었소.',
  }, { cd: 6 });
  R('goblin_unified', { flag: 'goblin_unified' }, {
    goblin: '고블린 부족이 하나가 됐다구! 이제 인간들 큰일이라구!',
    kingdom: '고블린들이 뭉쳤다는 보고가 있소. 국경 순찰을 늘려야 하오.',
    village: '고블린들이 뭉쳤다면서요? 마을 방비를 더 굳혀야겠어요.',
  }, { cd: 6 });
  R('border', { all: [{ var: 'border_tension', gte: 18 }, { noFlag: 'war' }] }, {
    kingdom: '서부 국경이 심상치 않소. 병영에서도 휴가가 취소됐소.',
    goblin: '왕국 놈들이 국경에 병사를 늘렸다구, 인간! 심상치 않다구!',
    merc: '국경이 달아오르는군. 우리 단장이 벌써 계산기를 두드려.',
  }, { cd: 5 });
  R('warband', { flag: 'warband_sighted' }, {
    village: '숲 너머에서 잿빛 엄니 전투단이 보였대요…',
    hunter: '잿빛 엄니 깃발이 보였소. 오크들이 내려오고 있소.',
    orc: '전투단이 내려간다. 길 비켜라.',
  }, { cd: 5 });
  R('act3', { flag: 'act3_start' }, {
    kingdom: '요즘 대륙 곳곳이 술렁이오. 오늘 아침에도 전령이 세 번이나 지나갔소.',
    village: '무서운 소문이 너무 많아요. 뭘 믿어야 할지 모르겠어요.',
    guild: '정세가 급하오. 물자를 미리 쌓아 두는 것이 상책이오.',
    merc: '곧 큰일이 터질 것 같아. 칼은 미리 사 두는 게 상책이지.',
  }, { cd: 6 });

  // ═════════ (e) 다녀간 손님 — 단골 · 처음 온 손님 ═════════
  S('repeat');
  R('visit1', null, {
    kingdom: '지난번에 산 물건이 아직 멀쩡하오. 그래서 또 들렀소.',
    village: '지난번 물건 잘 썼어요. 그래서 또 왔어요.',
    goblin: '지난번 거 좋았다구! 그래서 또 왔다구, 인간!',
    dwarf: '지난번 거래가 마음에 들었네. 그래서 또 들렀지.',
    'merc|bandit|pirate|orc': '저번 물건 쓸 만하더군. 또 왔다.',
    hunter: '지난번 물건이 잘 맞았소. 다시 왔소.',
    'mage|alchemist': '지난번 재료가 쓸 만했네. 또 들렀네.',
    fairy: '지난번 물건이 마음에 들었어요. 또 왔어요.',
    guild: '지난번 거래가 만족스러웠소. 다시 찾았소.',
  }, { who: { visits: { gte: 1 } }, cd: 3 });
  R('visit3', null, {
    kingdom: '이제 이 가게 단골이 된 셈이오. 잘 부탁하오.',
    village: '저 이제 이 가게 단골이죠? 덤은 없나요?',
    goblin: '단골이라구, 인간! 우리 이제 친구라구!',
    dwarf: '이제 단골이라 부를 만하지? 허허.',
    merc: '단골 대접 좀 해 줘. 이 얼굴 기억하지.',
    hunter: '이 가게가 이제 내 단골집이오.',
    bandit: '자주 오니까 말인데, 값 좀 봐줘라.',
  }, { who: { visits: { gte: 3 } }, cd: 6, w: 2 });
  R('first', null, {
    kingdom: '이 가게는 처음이오. 평판을 듣고 왔소.',
    village: '처음 와 봤어요. 다들 이 가게 얘기를 하기에요.',
    goblin: '처음 왔다구! 인간 가게는 신기하다구!',
    dwarf: '허허, 이 가게는 처음일세. 물건부터 구경하겠네.',
    merc: '이 가게는 처음이군. 어디 한번 보자.',
    fairy: '이곳은 처음이에요. 조금 떨려요.',
  }, { who: { visits: { eq: 0 }, minDay: 4 }, cd: 4 });

  // ═════════ (f) 가게 상태 — 창고 · 손님 수 · 신문 ═════════
  S('shop');
  R('stock_full', { stock: { gte: 0.9 } }, {
    kingdom: '선반이 가득하오. 이 정도면 병영 하나는 채우겠소.',
    village: '선반에 물건이 가득해서 눈이 부셔요.',
    goblin: '물건이 가득 쌓였다구! 구경만 해도 배부르다구, 킥킥!',
    dwarf: '허허, 선반이 그득하군. 장사꾼은 이래야지.',
  }, { cd: 5 });
  R('stock_empty', { stock: { lte: 0.2 } }, {
    kingdom: '선반이 휑하오. 물건이 다 팔린 것이오?',
    village: '선반이 텅 비었네요. 물건이 없어서 걱정이세요?',
    goblin: '선반이 텅텅이다구! 팔 물건이 없다구?',
    merc: '선반이 텅 비었네. 값이나 올려 받아야겠어.',
  }, { cd: 5 });
  R('busy', { todayDone: { gte: 6 } }, {
    kingdom: '오늘 손님이 많구려. 병영 앞까지 줄이 섰소.',
    village: '오늘 이 가게 사람이 많네요. 인기가 많으신가 봐요.',
    goblin: '인간, 오늘 손님 많다구! 돈 많이 벌겠다구!',
    merc: '오늘 붐비는군. 서둘러 처리해 줘.',
  }, { cd: 4 });
  R('first_today', { todayDone: { eq: 0 } }, {
    village: '제가 첫 손님인가요? 오늘 좋은 일이 있을 거예요.',
    kingdom: '첫 손님이오? 영업 개시를 축하하오.',
    goblin: '첫 손님이다구! 복 받는다구, 인간!',
    dwarf: '허허, 첫 손님이라니 운이 좋군. 좋은 값에 부탁하네.',
    merc: '첫 손님이 나야? 개시 서비스는 없나?',
  }, { cd: 4 });
  R('news_talk', { day: { gte: 3 } }, {
    village: '오늘 신문에 국경 소식이 나왔던데… 걱정돼요.',
    guild: '신문에 물가 소식이 실렸소. 훑어보셨소?',
    kingdom: '오늘 신문 보셨소? 궁금하면 병영 게시판에도 붙어 있소.',
    'mg_scholar|al_researcher': '신문 기사란 것은 반은 과장이지. 그래도 읽게 되더군.',
  }, { cd: 6, w: 0.6 });

  // ═════════ (g) 시간 · 요일 · 시기 ═════════
  S('time');
  R('morning', { time: { lt: 570 } }, {
    kingdom: '이른 아침부터 문을 열었구려. 근무 교대 전에 들렀소.',
    village: '아침 일찍부터 열었네요! 장 보러 나오는 길에 들렀어요.',
    goblin: '아침부터 왔다구! 일찍 일어나는 고블린이 좋은 칼 잡는다구!',
    dwarf: '새벽 화로 불이 아직 붉다네. 그 길에 들렀지.',
    merc: '아침부터 이 몸이 서 있으니 놀랍지?',
    guild: '아침 장부 정리 전에 들렀소.',
    hunter: '새벽 사냥길에 들렀소. 아직 이슬이 마르지 않았소.',
    fairy: '이슬이 채 마르기 전에 왔어요. 이 시간 숲이 예쁘거든요.',
  }, { cd: 3 });
  R('afternoon', { time: { gte: 900, lt: 1020 } }, {
    kingdom: '해가 기울기 전에 서둘러야 하오. 성문 닫는 시각이 가깝소.',
    village: '해 지기 전에 돌아가야 해요. 서둘러 볼게요.',
    goblin: '해 지기 전에 숲으로 돌아가야 한다구! 빨리 하자구!',
    dwarf: '저녁 화로에 불을 넣을 시간이라네. 서두르세.',
    hunter: '해 지기 전에 숲에 돌아가야 하오.',
    merc: '곧 술집이 열릴 시간이야. 빨리 끝내지.',
    bandit: '해 지기 전에 끝내자. 어두워지면 눈이 많아.',
  }, { cd: 3 });
  R('dusk', { time: { gte: 1020 } }, {
    kingdom: '곧 문 닫을 시각이구려. 늦지 않아 다행이오.',
    village: '곧 닫으실 시간이죠? 얼른 살게요.',
    goblin: '문 닫기 전이다구! 늦지 않았다구, 인간!',
    pirate: '문 닫기 전에 왔군. 선창 일이 늦게 끝났다.',
    vampire: '해가 지는 시각이 좋구려. 나는 이 시간이 편하오.',
    undead: '땅거미가 내리는 시각이오. 우리에게는 이때부터가 낮이오.',
  }, { cd: 3 });
  R('market_day', { dayMod: [7, 0] }, {
    village: '오늘이 장날이라 시내가 북적여요. 사람 틈에 끼어 왔어요.',
    kingdom: '장날이라 순찰이 바쁘오. 소매치기도 많고.',
    guild: '장날이니 손님이 많을 것이오. 재고는 넉넉하시오?',
    goblin: '장날 구경 왔다구, 인간! 재미있다구!',
    merc: '장날이라 사람이 많군. 소매치기 조심해.',
  }, { cd: 6 });
  R('month_old', { day: { gte: 28 } }, {
    kingdom: '이 가게가 문을 연 지도 꽤 됐구려. 이제 이 골목의 얼굴이오.',
    village: '이 가게가 생긴 지도 한 달이 넘었네요. 이젠 눈에 익어요.',
    goblin: '인간 가게가 꽤 오래 버틴다구! 대단하다구!',
    dwarf: '허허, 이 가게도 이제 뿌리를 내렸군. 장하네.',
  }, { cd: 8, w: 0.8 });
  R('end_near', { day: { gte: 36 } }, {
    kingdom: '이 도시가 어찌 될지 모르겠소. 오늘 살 수 있는 건 오늘 사 두는 게 낫겠소.',
    village: '요즘 하루하루가 아슬아슬해요. 그래도 물건은 사야죠.',
    guild: '결판이 가까워 오는 듯하오. 미리 사 두는 편이 좋소.',
    merc: '곧 큰일이 터질 것 같아. 칼은 미리 사 두는 게 상책이지.',
  }, { cd: 5, w: 1.2 });

  // ═════════ 그 밖의 잡담 — 종족·소속의 결이 드러나는 한마디 ═════════
  S('ambient');
  R('chat_kingdom', null, {
    kingdom: ['오늘 성문 앞 순찰이 유난히 길었소. 다리가 뻐근하구려.', '병영 밥은 늘 식어서 나오오. 그래서 이 가게 근처 국밥집이 반갑소.'],
    'k_adventurer|k_hero': ['길드 의뢰가 밀려서 정신이 없어요. 그래도 칼은 챙겨야죠!'],
  }, { cd: 8 });
  R('chat_village', null, {
    village: ['밭일하다 손을 다쳐서 약초를 사러 나왔다가 들렀어요.', '우리 마을 우물이 마르고 있어요. 올해는 걱정이 많아요.'],
  }, { cd: 8 });
  R('chat_goblin', null, {
    goblin: ['숲에서 맛있는 버섯을 찾았다구, 킥킥! 인간은 못 먹는다구!', '우리 부족 꼬맹이가 칼 흉내를 낸다구! 귀엽다구, 인간!'],
  }, { cd: 8 });
  R('chat_dwarf', null, {
    dwarf: ['허허, 오늘 화로 불이 잘 붙어서 기분이 좋다네.', '자네 가게 지붕이 좀 낮구먼. 우리 산채였다면 두 배는 올렸을 걸세, 허허.'],
  }, { cd: 8 });
  R('chat_merc', null, {
    merc: ['어젯밤 술값이 만만치 않더군. 그래서 오늘은 돈 되는 일만 찾아.', '단장이 돈 얘기만 하면 귀를 막고 싶어져.'],
  }, { cd: 8 });
  R('chat_hunter', null, {
    hunter: ['오늘은 사슴 한 마리도 못 봤소. 이런 날은 칼이나 갈아야겠소.'],
  }, { cd: 8 });
  R('chat_fairy', null, {
    fairy: ['가게 앞 도로 틈에서 작은 풀이 자라는 걸 봤어요. 잘 살고 있어요.', '여긴 쇠 냄새가 진해요. 조금 어지럽지만 괜찮아요.'],
  }, { cd: 8 });
  R('chat_mage', null, {
    mage: ['이 가게 선반의 배치가 마력 흐름에 나쁘지 않군. 우연이겠지만.'],
    mg_apprentice: ['스승님께 심부름 왔는데, 자꾸 길을 잃어요…'],
  }, { cd: 8 });
  R('chat_bandit', null, {
    bandit: ['뒷골목에서 잘 나가던 놈이 어제 붙잡혔지. 남 일 같지가 않아.'],
    pirate: ['땅 위는 흔들리지 않아서 어색하다. 자꾸 발이 헛디뎌.'],
    orc: ['오늘 아침 도끼 날이 나갔다. 새 날이 필요해.'],
  }, { cd: 8 });
  R('chat_vampire', null, {
    vampire: ['낮이 이렇게 긴 줄 몰랐구려. 그림자를 따라 왔소.'],
    undead: ['이 몸은 잠이 없소. 그래서 가게가 열리기만 기다렸소.'],
  }, { cd: 8 });
  R('chat_kobold', null, {
    'dr_kobold|dr_hoard': ['금은 반짝여서 좋다, 캬! 이 가게 물건도 반짝인다, 캬!'],
  }, { cd: 8 });
  R('chat_golem', null, {
    'gl_engineer|gl_courier': ['수령 위치 확인. 카운터 높이 적정. 대기 시간 오차 무시 가능.'],
  }, { cd: 10 });
  R('chat_guild', null, {
    guild: ['장부만 보고 사는 인생이라 이렇게 물건을 만져 보는 게 오랜만이오.'],
    'al_peddler': ['행상 짐이 무거워 죽겠소. 그래도 이 골목은 자리가 좋소.'],
  }, { cd: 8 });
  R('chat_church', null, {
    ch_priest: ['오늘도 성당 종을 세 번 쳤어요. 손이 아플 만큼요.'],
    ch_templar: ['빛의 이름으로 순찰하오. 오늘은 이 골목이 조용하오.'],
  }, { cd: 8 });
  R('chat_noble', null, {
    nb_courtier: ['궁정 연회 준비로 눈코 뜰 새가 없소. 장신구 하나 살 겨를이 없구려.'],
    nb_serena: ['성당에 들렀다 오는 길이에요. 이 가게 앞을 지날 때마다 궁금했어요.'],
  }, { cd: 8 });
  R('chat_demon', null, {
    demon: ['안개 낀 밤에만 서는 장이 있네. 이 가게 물건도 그리로 가져가고 싶군.'],
  }, { cd: 8 });
  R('chat_traveler', null, {
    traveler: ['먼 길을 걸어왔소. 이 도시에 도착하니 발이 다 아프구려.'],
  }, { cd: 8 });

  const cfg = { chance: 0.5, chanceAfterRemark: 0.5, cooldown: 6, storyCustomers: false };
  WS.data.remarks = { config: cfg, tones: { faction: FT, tpl: TT }, list };
})();

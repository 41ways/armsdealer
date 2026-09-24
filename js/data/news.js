// 신문 데이터. 조립 규칙은 js/systems/NewsManager.js (보통 3건, 많아도 5건).
//
// 기사 한 줄은 짧고 구체적으로 — "누가 + 무슨 물건 + 어떻게 됐나". 40자 안쪽.
// 기사 텍스트의 {item} {who} 는 NewsManager 가 채운다. {item|을} 처럼 쓰면 받침에 맞는 조사(을/를)를 붙인다.

// 배경 뉴스. 사건이 적은 날 신문을 채우면서 세계 상태에 대한 힌트를 준다 (하루 1건까지).
// when: 조건 DSL / weight: 선택 가중치 / cooldown: 재등장 최소 일수
WS.data.ambientNews = [
  { id: 'amb_king_cough', cat: '왕국', text: '국왕, 사냥 대회 또 불참… 궁 "가벼운 감기"', when: { all: [{ day: { gte: 6, lte: 13 } }, { noFlag: 'succession_crisis' }] }, weight: 3, cooldown: 3 },
  { id: 'amb_dragon_smoke', cat: '소문', text: '재의 산 연기 짙어져… "금 쌓아 둔 집부터 조심"', when: { all: [{ var: 'dragon_stir', gte: 5 }, { noFlag: 'dragon_awake' }] }, weight: 6, cooldown: 4 },
  { id: 'amb_quiet', cat: '생활', text: '광장 빵집, 신메뉴 "용사 빵" 출시', weight: 1, cooldown: 6 },
  { id: 'amb_guild', cat: '생활', text: '모험가 길드 신입 등록 늘어… "회복 물약 챙길 것"', weight: 1, cooldown: 5 },
  { id: 'amb_tension_low', cat: '왕국', text: '서부 국경 순찰대 "특이사항 없음"', when: { var: 'border_tension', lt: 10 }, weight: 2, cooldown: 3 },
  { id: 'amb_tension_mid', cat: '왕국', text: '서부 숲 근처 마을, 밤마다 북소리가 들린다', when: { var: 'border_tension', gte: 12 }, weight: 3, cooldown: 3 },
  { id: 'amb_goblin_rich', cat: '고블린', text: '고블린 행상들, 금화를 물 쓰듯… "숲에 금광이라도?"', when: { var: 'goblin_power', gte: 18 }, weight: 2, cooldown: 4 },
  { id: 'amb_goblin_feud', cat: '고블린', text: '고블린 부족끼리 영역 다툼… 서로 "더 좋은 칼" 자랑', when: { var: 'goblin_unity', lt: 20 }, weight: 2, cooldown: 4 },
  { id: 'amb_monster', cat: '사건', text: '북쪽 산맥 늑대 떼 목격담 늘어', when: { var: 'monster_pop', gte: 30 }, weight: 2, cooldown: 3 },
  { id: 'amb_dwarf', cat: '드워프', text: '드워프 강철수염 씨족, 철광석 매입 공고… "양 불문"', when: { all: [{ var: 'dwarf_tech', lt: 16 }, { noFlag: 'dwarf_fallen' }] }, weight: 2, cooldown: 3 },
  { id: 'amb_dwarf_gate', cat: '드워프', text: '강철수염 산채 성문 갈라져… 장로 "철광석 서른 개만 있어도" — 광석 상인들 "곧 동날 것"', when: { all: [{ day: { gte: 9, lte: 15 } }, { noFlag: 'dwarf_saved' }, { noFlag: 'dwarf_fallen' }] }, weight: 6, cooldown: 2 },
  { id: 'amb_iron_low', cat: '경제', text: '철광 풍년… 철광석 값 안정세', when: { var: 'iron_price', lt: 100 }, weight: 1, cooldown: 4 },
  { id: 'amb_morale_low', cat: '왕국', text: '수도 술집마다 왕국군 욕하는 소리', when: { var: 'kingdom_morale', lt: 42 }, weight: 2, cooldown: 3 },
  { id: 'amb_blackmarket', cat: '사건', text: '뒷골목에 "싸게 파는 칼" 호객 늘어', when: { var: 'blackmarket', gte: 14 }, weight: 2, cooldown: 4 },
  { id: 'amb_war', cat: '전쟁', text: '서부 전선 부상병 행렬… 회복 물약 품귀', when: { flag: 'war' }, weight: 4, cooldown: 1 },
  { id: 'amb_west_goblin', cat: '고블린', text: '고블린 땅 된 서부 숲, 의외로 질서정연… "통행세만 내면 통과"', when: { flag: 'west_goblin' }, weight: 3, cooldown: 3 },
  { id: 'amb_goblin_savior', cat: '마을', text: '동쪽 마을 아이들 사이에 "고블린 기사 놀이" 유행', when: { flag: 'goblins_saved_village' }, weight: 3, cooldown: 5 },
  { id: 'amb_village_fell', cat: '마을', text: '동쪽 마을 피난민, 수도 성문 앞 노숙… 대책 없어', when: { flag: 'village_fell' }, weight: 3, cooldown: 3 },
  { id: 'amb_demon_whisper', cat: '소문', text: '술집 유행가 "안개 낀 밤, 얼굴 없는 손님에겐 이름 대지 말라"', when: { day: { gte: 3 } }, weight: 1, cooldown: 6 },
  { id: 'amb_demon_market', cat: '경제', text: '마력 결정 값 들썩… "금화보다 결정"으로 셈하는 가게도', when: { var: 'demon_influence', gte: 12 }, weight: 2, cooldown: 4 },
  { id: 'amb_demon_city', cat: '생활', text: '귀족들 사이 "베일 모자" 유행… 벗겨 보니 얼굴이 흐릿했다는 말도', when: { var: 'demon_influence', gte: 22 }, weight: 3, cooldown: 4 },
  // 안개 상단과 계약한 뒤 도시가 조금씩 흐려진다
  { id: 'amb_mist_forget', cat: '생활', text: '안개 낀 밤이 잦아져… 아침마다 제 이름을 잊은 사람들', when: { any: [{ var: 'demon_influence', gte: 18 }, { all: [{ flag: 'demon_contract' }, { day: { gte: 12 } }] }] }, weight: 3, cooldown: 4 },
  { id: 'amb_mist_portrait', cat: '생활', text: '초상화가들 울상… "요즘 손님들 얼굴이 자꾸 흐려진다"', when: { any: [{ var: 'demon_influence', gte: 24 }, { flag: 'mist_second_contract' }] }, weight: 3, cooldown: 4 },
  { id: 'amb_mist_sign', cat: '생활', text: '안개 문양 새긴 간판 하나둘… 문 닫은 뒤에도 불이 켜져 있다', when: { flag: 'mist_sign_mark' }, weight: 3, cooldown: 4 },
  { id: 'amb_mist_memory', cat: '소문', text: '"첫 손님이 누구였더라"… 상인들 사이 이상한 건망증', when: { flag: 'mist_paid_memory' }, weight: 3, cooldown: 4 },
  { id: 'amb_north_quiet', cat: '왕국', text: '북부 봉화대 "황무지 쪽 특이사항 없음"', when: { var: 'invasion_risk', lt: 10 }, weight: 1, cooldown: 5 },
  { id: 'amb_north_flags', cat: '보고', text: '북부 사냥꾼 "황무지 검은 깃발이 매일 하나씩 는다"', when: { var: 'demonlord_power', gte: 22 }, weight: 3, cooldown: 3 },
  { id: 'amb_north_refugees', cat: '왕국', text: '북부 주민들 남쪽으로 피난… 역마차 표 매진', when: { var: 'invasion_risk', gte: 25 }, weight: 3, cooldown: 3 },
  { id: 'amb_demon_war', cat: '전쟁', text: '북부 요새, 밤새 마왕군 투석기에… 회복 물약이 바닥', when: { flag: 'demon_war' }, weight: 4, cooldown: 1 },
  { id: 'amb_demon_protected', cat: '소문', text: '좀도둑들 사이에 "안개가 지키는 가게" 괴담', when: { flag: 'demon_protected' }, weight: 2, cooldown: 4 },
  { id: 'amb_black_flag_north', cat: '왕국', text: '휴전 뒤 북부엔 마왕군 징세관 활보… 왕국은 침묵', when: { flag: 'demonlord_victory' }, weight: 3, cooldown: 2 },
  { id: 'amb_dwarf_steel', cat: '드워프', text: '드워프 강철로 벼린 칼, 용사 지망생들의 "꿈의 칼"로', when: { flag: 'dwarf_steel_unlocked' }, weight: 2, cooldown: 4 },
  // 강철수염 씨족 광석 납품 계약 (customers.js dwarf_elder_offer)
  { id: 'amb_dwarf_contract', cat: '드워프', text: '강철수염 짐꾼, 사흘마다 광석 자루 지고 상점가로', when: { all: [{ flag: 'dwarf_contract' }, { noFlag: 'dwarf_contract_broken' }, { noFlag: 'dwarf_golden_age' }] }, weight: 2, cooldown: 4 },
  { id: 'amb_ore_hoard', cat: '경제', text: '대장간마다 "광석이 금값"… 길드 창고 앞 긴 줄', when: { flag: 'ore_hoard' }, weight: 3, cooldown: 2 },
  { id: 'amb_dwarf_golden', cat: '드워프', text: '강철수염 용광로, 밤에도 산등성이가 붉다', when: { flag: 'dwarf_golden_age' }, weight: 2, cooldown: 4 },
  // 강철수염 왕국이 무너진 뒤 (customers.js dwarf_herald — config.fairyDwarf)
  { id: 'amb_dwarf_fallen', cat: '드워프', text: '강철수염 피난민, 상점가 처마 밑에서 밤을 난다', when: { flag: 'dwarf_fallen' }, weight: 2, cooldown: 4 },
  { id: 'amb_dwarf_saved', cat: '드워프', text: '강철수염 산채 성문에 새 쇠빗장… "인간 가게 광석으로"', when: { all: [{ flag: 'dwarf_saved' }, { noFlag: 'dwarf_contract' }] }, weight: 2, cooldown: 4 },
  { id: 'amb_no_blades', cat: '마을', text: '"칼 안 파는 무기점" 소문… 요정불이 그 집 창가에만 머문다', when: { flag: 'fairy_oath3' }, weight: 4, cooldown: 1 },

  // ───────── 확장 세력 ─────────
  // 요정
  { id: 'amb_fairy_lights', cat: '생활', text: '동쪽 숲 가장자리에 밤마다 춤추는 "요정불"', when: { all: [{ day: { gte: 4 } }, { var: 'fairy_grace', gte: 20 }] }, weight: 1, cooldown: 6 },
  { id: 'amb_fairy_leaves', cat: '경제', text: '"아침이면 낙엽 되는 금화" 주의보… 한 번 깨물어 볼 것', when: { traded: { faction: 'fairy' } }, weight: 2, cooldown: 5 },
  { id: 'amb_forest_sick', cat: '마을', text: '동쪽 숲 나무들 잎을 일찍 떨궈… "용광로 연기 탓"', when: { var: 'fairy_grace', lt: 14 }, weight: 2, cooldown: 4 },
  { id: 'amb_fairy_blessing', cat: '마을', text: '동쪽 마을 사과 풍년… 촌로들 "숲이 웃는 해"', when: { flag: 'fairy_blessing' }, weight: 3, cooldown: 4 },
  // 마법사 길드 / 연금술
  { id: 'amb_mage_tower', cat: '생활', text: '은빛 탑에 밤새 보랏빛 번개… "빨래가 또 공중에 떴다"', when: { var: 'arcane_power', gte: 20 }, weight: 2, cooldown: 4 },
  { id: 'amb_alchemy_smoke', cat: '생활', text: '녹색 증류탑에 초록 연기… 학회 "무해함. 아마도"', when: { var: 'alchemy_progress', gte: 10 }, weight: 2, cooldown: 4 },
  { id: 'amb_powder', cat: '경제', text: '흑색 화약 한 통 값이 칼 한 자루를 넘었다', when: { flag: 'powder_invented' }, weight: 3, cooldown: 3 },
  // 용병 / 사냥꾼
  { id: 'amb_merc_tavern', cat: '생활', text: '선술집마다 붉은 늑대 용병단 모병 벽보… "일당 두 배"', when: { var: 'merc_strength', gte: 14 }, weight: 2, cooldown: 4 },
  { id: 'amb_hunter_bounty', cat: '사건', text: '사냥꾼 조합 현상금 목록, 두 장으로 늘었다', when: { var: 'monster_pop', gte: 38 }, weight: 2, cooldown: 4 },
  // 흡혈귀 / 언데드 / 대성당
  { id: 'amb_vampire_ball', cat: '생활', text: '귀족가 무도회는 올해도 해 진 뒤에만… 창백한 손님들', when: { var: 'vampire_power', gte: 18 }, weight: 2, cooldown: 4 },
  { id: 'amb_vampire_missing', cat: '사건', text: '빈민가 또 실종 신고… 경비대는 "가출"로 처리', when: { flag: 'vampire_known' }, weight: 2, cooldown: 3 },
  { id: 'amb_graveyard', cat: '사건', text: '공동묘지 관리인 사직… "밤마다 안에서 흙을 판다"', when: { var: 'undead_power', gte: 14 }, weight: 3, cooldown: 3 },
  { id: 'amb_church_sermon', cat: '왕국', text: '대성당 설교 "어둠과 거래한 자의 저울은 기운다"', when: { var: 'church_authority', gte: 32 }, weight: 2, cooldown: 4 },
  { id: 'amb_excommunicated', cat: '생활', text: '파문당한 가게 앞에서 신자들 성호… 손님은 오히려 늘어', when: { flag: 'excommunicated' }, weight: 3, cooldown: 3 },
  // 용
  { id: 'amb_ash_mountain', cat: '사건', text: '재의 산에 연기 한 줄… 광부들 "금 냄새 맡은 거다"', when: { var: 'dragon_stir', gte: 5 }, weight: 3, cooldown: 3 },
  { id: 'amb_dragon_shadow', cat: '사건', text: '들판 위로 구름보다 큰 그림자… 양 떼가 풀을 안 먹어', when: { all: [{ flag: 'dragon_awake' }, { noFlag: 'dragon_slain' }] }, weight: 4, cooldown: 2 },
  { id: 'amb_dragon_scales', cat: '경제', text: '용비늘 방패, 귀족들 사이 유행… "녹일 불이 없다"', when: { flag: 'dragon_slain' }, weight: 3, cooldown: 3 },
  // 상인 길드 / 암시장
  { id: 'amb_guild_prices', cat: '경제', text: '금저울 길드 "권장 가격표" 배포… 안 따르는 가게 명단도', when: { var: 'guild_grip', gte: 20 }, weight: 2, cooldown: 4 },
  { id: 'amb_cartel', cat: '경제', text: '철광석 창고마다 길드 자물쇠… "칼 만들 쇠가 없다"', when: { flag: 'iron_cartel' }, weight: 3, cooldown: 3 },
  { id: 'amb_fence', cat: '사건', text: '도난 신고된 칼이 상점가 진열대에… 주인 "정식으로 샀다"', when: { bought: { faction: 'bandit', min: 2 } }, weight: 2, cooldown: 4 },
  // 귀족 / 계승
  { id: 'amb_succession', cat: '왕국', text: '궁정 연회, 왕자파와 공주파가 다른 문으로 입장', when: { all: [{ flag: 'succession_crisis' }, { noFlag: 'crowned' }] }, weight: 3, cooldown: 2 },
  // 복선: 궁정 귀족은 세레나 공주 편, 붉은 늑대 용병단은 알드릭 왕자 편 (config.courtGossip — 손님 인사말 · 판매 효과와 짝)
  { id: 'amb_court_physician', cat: '왕국', text: '왕궁 시의들 도성 약방 돌며 회복 물약 사재기… "국왕 침소 불빛이 안 꺼진다"', when: { all: [{ day: { gte: 8, lte: 13 } }, { noFlag: 'succession_crisis' }, { noFlag: 'physician_helped' }] }, weight: 4, cooldown: 3 },
  { id: 'amb_court_ladies', cat: '왕국', text: '귀족 부인들, 공주의 구호소 후원 모임… 왕자 측 초대장은 반송', when: { all: [{ any: [{ flag: 'court_struggle' }, { flag: 'succession_crisis' }, { day: { gte: 10 } }] }, { noFlag: 'crowned' }, { noFlag: 'king_aldric' }, { noFlag: 'queen_serena' }] }, weight: 3, cooldown: 5 },
  { id: 'amb_merc_hunt', cat: '왕국', text: '붉은 늑대 용병단장, 왕자의 사냥 모임에 동석', when: { all: [{ any: [{ flag: 'court_struggle' }, { flag: 'succession_crisis' }, { day: { gte: 10 } }] }, { noFlag: 'crowned' }, { noFlag: 'king_aldric' }, { noFlag: 'queen_serena' }] }, weight: 3, cooldown: 5 },
  { id: 'amb_merc_song', cat: '생활', text: '용병 술집에 새 노래 "왕자님 금화는 무겁다"', when: { all: [{ any: [{ flag: 'court_struggle' }, { flag: 'succession_crisis' }] }, { noFlag: 'crowned' }, { noFlag: 'king_aldric' }, { noFlag: 'queen_serena' }] }, weight: 2, cooldown: 5 },
  { id: 'amb_noble_debt', cat: '경제', text: '귀족 외상 주의… "문장만 믿고 물건 내주지 말 것"', when: { day: { gte: 7 } }, weight: 1, cooldown: 6 },
  // 가게가 한 선택의 여운 — 손님 한마디(remarks.js)와 짝: 판 것 · 도운 것이 거리 소문으로 돌아온다
  { id: 'amb_echo_goblin_blades', cat: '사건', text: '서부 숲 고블린 야영지에 새 칼이 번쩍… "인간 가게에서 샀다더라"', when: { sold: { faction: 'goblin', tag: 'weapon', min: 6 } }, weight: 2, cooldown: 6 },
  { id: 'amb_echo_barracks', cat: '왕국', text: '병영 창고 칼 새로 채워… 병사들 "이번 칼은 날이 좋다"', when: { sold: { faction: 'kingdom', tag: 'weapon', min: 6 } }, weight: 2, cooldown: 6 },
  { id: 'amb_echo_pin', cat: '생활', text: '무기점 견습 소년, 골목 심부름 도맡아… 이웃들 "눈치가 빠르다"', when: { all: [{ flag: 'pin_hired' }, { noFlag: 'pin_gone' }] }, weight: 2, cooldown: 8 },
  { id: 'amb_echo_leon', cat: '왕국', text: '제7기사단장 허리에 새 칼… 기사단 "칼은 저 집에서 맞춘다"', when: { all: [{ flag: 'leon_contract' }, { noFlag: 'leon_contract_broken' }, { noFlag: 'leon_fell' }] }, weight: 2, cooldown: 8 },
  { id: 'amb_echo_informant', cat: '생활', text: '골목 사람들 말수 줄어… "감찰청 귀는 어디에나 있다"', when: { flag: 'informant_office' }, weight: 2, cooldown: 6 },
  { id: 'amb_echo_ledger', cat: '경제', text: '감찰청, 도성 무기점 장부 열람 준비 소문… 상인들 서류함 정리', when: { flag: 'illegal_sale' }, weight: 2, cooldown: 8 },
  { id: 'amb_echo_backdoor', cat: '사건', text: '항구 뒷골목 짐수레 밤마다 늘어… 경비대 "확인 중"', when: { flag: 'smuggle_route' }, weight: 2, cooldown: 8 },
  { id: 'amb_echo_crows', cat: '생활', text: '도성 지붕마다 까마귀가 눈에 띄게 늘어… 전서 장사가 뜬다', when: { crow: { gte: 4 } }, weight: 2, cooldown: 8 },
  { id: 'amb_echo_honest', cat: '왕국', text: '감찰청 "협조적인 상점이 있다"… 상인들 사이 신용 화제', when: { flag: 'told_inspector' }, weight: 2, cooldown: 8 },
  // 도적 / 전투단 / 해적 / 교역로
  { id: 'amb_bandit_road', cat: '사건', text: '동쪽 가도 역마차 습격… 도적들 손엔 "새 칼"', when: { var: 'bandit_power', gte: 14 }, weight: 3, cooldown: 3 },
  { id: 'amb_warband_drums', cat: '보고', text: '북쪽 산맥 골짜기마다 북소리… 오우거 발자국이 수레바퀴만', when: { flag: 'warband_sighted' }, weight: 3, cooldown: 3 },
  { id: 'amb_black_sails', cat: '사건', text: '남쪽 항구 앞바다에 검은 돛 세 척… 어부들 그물 걷어', when: { flag: 'port_open' }, weight: 2, cooldown: 3 },
  { id: 'amb_routes_cut', cat: '경제', text: '교역로 끊겨 향신료 값 폭등… 귀족 식탁에 후추가 없다', when: { var: 'trade_routes', lt: 30 }, weight: 3, cooldown: 3 },
  { id: 'amb_caravans', cat: '경제', text: '동방 낙타 행렬 도착… 광장에 이국의 향', when: { var: 'trade_routes', gte: 55 }, weight: 1, cooldown: 5 },
  // 골렘 / 미지
  { id: 'amb_golem_street', cat: '생활', text: '청동 골렘이 광장 청소 시작… 청소부들 "우리 일은?"', when: { var: 'golem_tech', gte: 6 }, weight: 3, cooldown: 3 },
  { id: 'amb_star_blink', cat: '생활', text: '천문대 견습생 "북쪽 별 하나가 짧게 셋, 길게 하나 깜빡"', when: { var: 'star_signal', gte: 2.5 }, weight: 1, cooldown: 5 },
];

// 채움 기사. 아무 정보도 없는 동네 이야기 — 기사가 3건이 안 되는 날에만 빈자리를 메운다.
// cooldown 동안은 다시 나오지 않는다 (기본 10일). 30자 안쪽.
WS.data.fillerNews = [
  { id: 'fil_pigeon', cat: '생활', text: '수도 광장 비둘기, 올해도 동상 머리 점령' },
  { id: 'fil_croissant', cat: '생활', text: '빵집 주인 "크루아상은 원래 초승달 모양" 주장' },
  { id: 'fil_fountain', cat: '생활', text: '분수대 동전 건지던 소년, 단추 한 주먹 건져' },
  { id: 'fil_cat_hat', cat: '생활', text: '시청 고양이, 경비대 모자 위에서 낮잠' },
  { id: 'fil_dog', cat: '생활', text: '대장간 골목 개, 망치 소리 맞춰 짖는다는 제보' },
  { id: 'fil_inn_menu', cat: '생활', text: '여관 "금잔디" 새 메뉴는 삶은 달걀 두 개' },
  { id: 'fil_bread_contest', cat: '생활', text: '제빵 대회 우승작은 "성벽 모양 식빵"' },
  { id: 'fil_busker', cat: '생활', text: '광장 악사, 같은 노래만 사흘째… "새 곡 원함"' },
  { id: 'fil_pumpkin', cat: '생활', text: '채소 시장 호박 크기 대회… 우승 호박은 수레째' },
  { id: 'fil_fashion', cat: '생활', text: '재봉사 조합 "올가을 유행 색은 진흙색"' },
  { id: 'fil_library', cat: '생활', text: '도서관 사서 "안 돌아온 책 목록이 두루마리 한 권"' },
  { id: 'fil_weather_clear', cat: '날씨', text: '내일은 대체로 맑음… 오후엔 구름 조금' },
  { id: 'fil_weather_fog', cat: '날씨', text: '아침 안개 짙음… 마차는 천천히' },
  { id: 'fil_weather_wind', cat: '날씨', text: '가을바람 선선… 빨래 널기 좋은 날' },
  { id: 'fil_weather_rain', cat: '날씨', text: '밤사이 소나기 예보… 우산 챙길 것' },
  { id: 'fil_statue', cat: '소문', text: '"광장 동상이 밤에 윙크한다"… 확인 안 됨' },
  { id: 'fil_tab', cat: '소문', text: '술집 단골이 외상 없이 계산… 주인 "기적이다"' },
  { id: 'fil_crow', cat: '소문', text: '우체국 까마귀, 편지 대신 반짝이를 물어와' },
  { id: 'fil_shepherd', cat: '소문', text: '양치기 "구름이 양 같아서 자꾸 센다" 호소' },
  { id: 'fil_helmet', cat: '소문', text: '투구를 거꾸로 쓰고 행진한 병사… 본인만 몰라' },
  { id: 'fil_cobbler', cat: '광고', text: '구두 수선 반값! 뒷골목 두 번째 집' },
  { id: 'fil_lost_cat', cat: '광고', text: '고양이 찾습니다. 이름은 "대장", 부르면 안 옴' },
  { id: 'fil_lodger', cat: '광고', text: '하숙생 구함. 닭 울음소리 괜찮은 분' },
  { id: 'fil_barber', cat: '광고', text: '이발소 개업… 첫 손님 수염 무료 다듬기' },
  { id: 'fil_cart', cat: '광고', text: '중고 수레 팝니다. 바퀴 셋은 멀쩡함' },
  { id: 'fil_choir', cat: '광고', text: '대성당 성가대 단원 모집… 음치도 환영' },
];

// 고블린 유행 기사 (st.trend). 유행이 시작된 날 start, 그 뒤 2~3일마다 ongoing 중 하나.
// 숫자 없이 "요즘 고블린들이 ○○을 많이 찾는다"는 관찰로만 — 무엇이 잘 팔릴지는 플레이어가 짐작한다.
WS.data.trendNews = {
  iron_sword: {
    start: ['요즘 고블린들, 너도나도 칼을 차고 다녀', '숲 고블린들 사이에 칼 바람… "칼 없으면 촌놈"'],
    ongoing: ['고블린 행상들, 여전히 칼 타령', '서부 숲 고블린들, 칼을 붉게 칠해 자랑 중'],
  },
  bow: {
    start: ['요즘 고블린들, 너도나도 활을 메고 다녀', '고블린 청년들 사이에 활쏘기 내기 대유행'],
    ongoing: ['숲 고블린들 활쏘기 내기 계속… 과녁이 모자라', '활 멘 고블린들, 오늘도 숲 어귀에 줄지어'],
  },
  shield: {
    start: ['서부 숲에 "방패 두드리기 춤" 대유행', '요즘 고블린들, 방패 없이는 외출도 안 해'],
    ongoing: ['고블린들 방패 춤 열기 여전… 방패 소리에 잠 못 자', '숲 고블린들, 방패에 얼굴 그리기 경쟁'],
  },
  potion: {
    start: ['고블린 축제 철… 회복 물약을 음료로 알고 찾는 중', '요즘 고블린들, 회복 물약을 병째 들고 다녀'],
    ongoing: ['고블린 축제 계속… 회복 물약 건배 소리 요란', '숲 고블린들, 여전히 회복 물약 타령'],
  },
  war_axe: {
    start: ['숲 고블린들 사이에 전투도끼 바람', '요즘 고블린들, 너도나도 전투도끼를 둘러메'],
    ongoing: ['고블린들 나무 찍기 시합 한창… 전투도끼 인기 여전'],
  },
  iron_spear: {
    start: ['요즘 고블린들, 창 들고 줄 서는 게 유행', '서부 숲 고블린들 사이에 창 바람'],
    ongoing: ['숲 고블린들, 여전히 창 끝 자랑 중'],
  },
  iron_helmet: {
    start: ['요즘 고블린들, 너도나도 투구를 쓰고 다녀', '숲 고블린들 사이에 투구 바람… 귀가 끼어도 쓴다'],
    ongoing: ['고블린들 투구 사랑 여전… 잘 때도 쓴다고'],
  },
  plate_armor: {
    start: ['요즘 고블린들, 갑옷 입고 뽐내는 게 유행', '숲 고블린들 사이에 갑옷 바람… 걸음마다 철컹'],
    ongoing: ['고블린들 갑옷 자랑 여전… 숲이 철컹철컹'],
  },
  _any: {
    start: ['요즘 고블린들 사이에 {item} 바람', '요즘 고블린들, 너도나도 {item|을} 찾는다'],
    ongoing: ['고블린들의 {item} 사랑은 여전하다'],
  },
};

// 시세 기사 — 변동이 클 때만, 하루 2건까지. 숫자 없이 쉬운 말로.
WS.data.marketNews = {
  upBig: ['{item} 값 폭등… 부르는 게 값', '{item} 값이 하늘로 치솟았다'],
  up: ['{item} 값이 크게 올랐다', '{item} 값 껑충'],
  down: ['{item} 값 뚝', '{item} 값이 크게 떨어졌다'],
  downBig: ['{item} 값 폭락… 창고마다 재고 산더미', '{item} 값 바닥… 도매상 한숨'],
};

// 소문 풀: 효과 DSL 의 newsFrom 으로 하나를 골라 다음 날 신문에 싣는다.
// 나그네의 이야기는 가끔 세계의 숨은 수치를 흘린다 — 믿을지는 플레이어 몫.
WS.data.newsPools = {
  travelerTales: [
    { cat: '먼 곳', text: '나그네 왈 "황무지 대장간 불빛, 셀 수가 없었소"', when: { var: 'demonlord_power', gte: 25 } },
    { cat: '먼 곳', text: '나그네 왈 "황무지는 조용했소. 까마귀도 심심해 보였지"', when: { var: 'demonlord_power', lt: 20 } },
    { cat: '먼 곳', text: '나그네 왈 "고블린들이 칼 차고 줄 맞춰 행진하더이다"', when: { var: 'goblin_power', gte: 24 } },
    { cat: '먼 곳', text: '나그네 왈 "재의 산 마을들, 금붙이를 땅에 묻더군"', when: { var: 'dragon_stir', gte: 4 } },
    { cat: '먼 곳', text: '나그네 왈 "해적들이 진주로 값을 치러 진주가 흔하오"', when: { var: 'pirate_power', gte: 12 } },
    { cat: '먼 곳', text: '나그네 왈 "사막 너머선 쇠 대롱에 검은 가루를 넣어 쏘오"' },
    { cat: '먼 곳', text: '나그네 왈 "동쪽 숲에서 누가 날 불렀소. 반딧불뿐이었지"', when: { var: 'fairy_grace', gte: 18 } },
    { cat: '먼 곳', text: '나그네 왈 "귀족 저택에 밤새 음악… 창엔 아무도 없었소"', when: { var: 'vampire_power', gte: 16 } },
    { cat: '먼 곳', text: '나그네 왈 "북쪽 산맥 오우거 발자국이 수레바퀴만 했소"', when: { var: 'warband_power', gte: 12 } },
    { cat: '먼 곳', text: '나그네 왈 "사막에 떨어진 별돌을 봤소. 아직 따뜻했지"', when: { var: 'star_signal', gte: 2 } },
    { cat: '먼 곳', text: '나그네 왈 "가도에 도적이 들끓소. 다음엔 못 올지도"', when: { var: 'trade_routes', lt: 40 } },
    { cat: '먼 곳', text: '나그네 왈 "묘지 옆 여관에서 밤새 누가 벽을 긁었소"', when: { var: 'undead_power', gte: 12 } },
    { cat: '먼 곳', text: '나그네 왈 "마법사들이 드워프 공방을 드나들더군"', when: { all: [{ var: 'arcane_power', gte: 16 }, { var: 'dwarf_tech', gte: 14 }] } },
  ],
};

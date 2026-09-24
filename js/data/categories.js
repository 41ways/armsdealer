// 신규 분류 체계 (Phase 1 — 데이터/엔진 레이어). UI(두 책상/창고 화면)는 phase 2가 담당한다.
// 6개 대분류, 각 대분류는 고정된 소분류(subtype) 목록을 가진다.
// 기존 items.js 의 category(weapon/armor/consumable/material/curio)와는 별개 체계다 —
// 기존 필드는 세계 영향(perUnit)·시세 계산에 계속 쓰이므로 건드리지 않는다.
// 이 새 category/subtype 은 아이템에 추가 필드로 붙어(§2 참고) 손님 요청·창고 UI가 "분류" 단위로 다루게 한다.
WS.data.categories = {
  weapon: { name: '무기', subtypes: { sword: '칼', arrow: '화살', axe: '도끼', spear: '창' } },
  defense: { name: '방어구', subtypes: { shield: '방패', armor: '갑옷', helmet: '투구' } },
  potion: { name: '물약', subtypes: { hp_potion: '체력포션', mp_potion: '마나포션', antidote: '해독제', poison: '독', transform_potion: '변신포션' } },
  material: {
    name: '재료',
    subtypes: {
      iron_ore: '철광석', copper: '구리', mithril: '미스릴', leather: '가죽',
      spirit_stone: '정령석', dragon_scale: '용비늘', star_shard: '별조각', mana_crystal: '마력결정',
    },
  },
  gem: { name: '보석', subtypes: { diamond: '다이아몬드', ruby: '루비', sapphire: '사파이어', emerald: '에메랄드', pearl: '진주' } },
  // 특별아이템: 순간이동석·마법 나침반·투명 망토·소환 두루마리는 쓰이는 곳이 없어 없앴다 (design/items_cleanup.md). 잠긴 궤짝(shelf 'special')에는 저주받은 반지·별조각이 놓인다.
  special: { name: '특별아이템', subtypes: {} },
};

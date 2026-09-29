#!/usr/bin/env node
// stats/choice_tags.json 의 손님 틀·선택지 id 가 게임 데이터에 실제로 있는지 본다 (오타 방지). 콘텐츠를 고친 뒤에 돌린다.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const tags = JSON.parse(fs.readFileSync(path.join(ROOT, 'stats', 'choice_tags.json'), 'utf8'));
const src = fs.readFileSync(path.join(ROOT, 'stats', 'labels.js'), 'utf8');
const L = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1).replace(/^window\.LABELS\s*=\s*/, ''));
const dims = new Set(Object.keys(tags.dimensions));
let bad = 0;
for (const [tpl, opts] of Object.entries(tags.tags)) {
  const c = L.customers[tpl];
  if (!c) { console.log('없는 손님 틀:', tpl); bad++; continue; }
  for (const [id, list] of Object.entries(opts)) {
    for (const d of list) if (!dims.has(d)) { console.log('없는 성향:', tpl, id, d); bad++; }
    // labels.js 는 배열로 적힌 선택지만 담는다 — 대화 손님(talk)은 비어 있을 수 있어 그땐 건너뛴다
    if (Object.keys(c.choices).length && !(id in c.choices)) { console.log('없는 선택지:', tpl, id, '(있는 것:', Object.keys(c.choices).join(','), ')'); bad++; }
  }
}
console.log(bad ? `문제 ${bad}건` : '태그표 이상 없음', '· 손님 틀', Object.keys(tags.tags).length);
process.exit(bad ? 1 : 0);

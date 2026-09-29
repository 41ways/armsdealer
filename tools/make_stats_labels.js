#!/usr/bin/env node
// stats/labels.js 를 만든다 — 통계 화면이 엔딩 제목·손님 이름·선택지 문구를 사람 말로 보여 주는 표.
// 게임 데이터(WS.data)를 읽기만 한다. 콘텐츠를 고친 뒤에는 다시 돌려 커밋한다:  node tools/make_stats_labels.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const FILES = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1])
  .filter(f => !/^js\/(render|ui)\//.test(f) && !/(Boot|Sfx)\.js$/.test(f));
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  performance: { now: () => 0 }, requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  Audio: function () { return { canPlayType: () => '', play: () => Promise.resolve(), cloneNode() { return this; }, load() {}, addEventListener() {} }; },
  Image: function () {}, matchMedia: () => ({ matches: false }),
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {} }), body: { appendChild() {} } },
  navigator: { userAgent: 'node' },
};
ctx.window = ctx; vm.createContext(ctx);
for (const f of FILES) new vm.Script(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }).runInContext(ctx);
const WS = ctx.WS;
const strip = s => String(s == null ? '' : s).replace(/\{[^}]*\}/g, '…').replace(/\s+/g, ' ').trim();

const endings = {};
for (const e of WS.data.endings) endings[e.id] = e.title || e.id;

// 손님(틀) id → 이름 · 선택지 id → 문구. talk 손님은 choices 가 함수(talkList)일 수 있어 있는 것만 뽑는다
const customers = {};
for (const t of WS.data.customers) {
  const ch = {};
  const add = list => { for (const c of (Array.isArray(list) ? list : [])) if (c && c.id) ch[c.id] = strip(c.label); };
  add(t.choices); add(t.extraChoices);
  for (const c of (Array.isArray(t.choices) ? t.choices : [])) if (c && c.follow) add(c.follow.choices);
  customers[t.id] = { name: strip(t.name), job: strip(t.job), choices: ch };
}

// 굵직한 결정 — 플래그 이름 → 사람 말. (직접 고른 표: 새 갈림길이 생기면 여기에 더한다)
const decisions = [
  { title: '섭정 회의 (21~22일)', flags: { regency_war: '전쟁이 먼저 (경비대장 편)', regency_court: '왕좌가 먼저 (재상 편)' } },
  { title: '왕이 죽은 뒤 계승', flags: { king_aldric: '알드릭 즉위', queen_serena: '세레나 즉위', crowned: '대관식이 치러짐' } },
  { title: '고블린', flags: { goblin_truce: '휴전', goblin_hardline: '강경' } },
  { title: '용', flags: { dragon_alarm: '경종을 울림', dragon_contained: '조용히 가둠' } },
  { title: '마왕군', flags: { demonlord_truce: '휴전', demonlord_resist: '저항' } },
  { title: '골렘', flags: { golem_allin: '전부 건다', golem_limited: '제한적으로' } },
  { title: '기타 큰 갈림', flags: { guild_member: '상인회 가입', liga_closed: '천칭단 결별', pin_heir: '핀에게 가게를 물려줌', smuggle_route: '밀수 길을 텄음', illegal_sale: '불법 판매', king_poison_sold: '왕에게 독을 판 일' } },
];
// 존재하지 않는 플래그 이름을 오타로 남기지 않게 — 게임 데이터 어디에도 없으면 경고
const src = FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
for (const g of decisions) for (const k of Object.keys(g.flags)) if (!src.includes(k)) console.error('경고: 게임 데이터에 없는 플래그', k);

const worldLabels = {};
for (const [k, d] of Object.entries(WS.data.worldVars)) worldLabels[k] = d.label || k;

const out = '// 자동 생성 — node tools/make_stats_labels.js\nwindow.LABELS = ' + JSON.stringify({ built: WS.data.config.version, endings, customers, decisions, worldLabels }) + ';\n';
fs.writeFileSync(path.join(ROOT, 'stats', 'labels.js'), out);
console.log('stats/labels.js', out.length, '바이트 · 엔딩', Object.keys(endings).length, '· 손님', Object.keys(customers).length);

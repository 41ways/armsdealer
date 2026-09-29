# 플레이 통계 · 분석 자료

`runs` 표(Cloudflare D1 `norara-errors`)에 판마다 한 줄이 쌓인다. 화면은 `stats/index.html`, 코드는 `js/systems/RunLog.js`(전송)·`Tele.js`(계측).
익명이다 — 이름·IP·기기 정보 없이 브라우저가 만든 무작위 `sid` 와 "몇 번째로 끝낸 판인지(`run`)"뿐. localhost 판·다시 보기는 보내지 않는다.

## 열 (runs)
| 열 | 뜻 |
|---|---|
| `ending` · `data.how` | 엔딩 id · 고른 방식(only/clash/personal/score/none) |
| `days` · `gold` | 끝난 날 · 마지막 금고 |
| `run` | 이 브라우저에서 이번이 몇 번째로 끝낸 판인지 (0 = 첫 판) |
| `flags` | 켜진 플래그 목록 (굵직한 결정 포함) |
| `choices` | 손님 틀 id → 고른 선택 id (판매/거절도 `sell`/`refuse` 로) |
| `data.world` | 끝날 때 세력·관계 수치 |
| `data.clash` · `data.closed` | 충돌 결과 · 닫힌 줄기와 닫은 쪽 |
| `data.sales` | 진짜 소속별 판매 수량(`_sell`)·거절 횟수(`_refuse`) |
| `data.tele` | 행동 계측 (아래) |
| `data.lat` | 대화 손님 틀 → 도착부터 결정까지 걸린 초 |

## 행동 계측 (`data.tele`, 없는 이름은 0)
| 이름 | 뜻 | 성향 해석 |
|---|---|---|
| `sec` | 총 플레이 초 (보이는 화면에서 45초 안에 손댄 때만) | 몰입·신중 |
| `customers` | 만난 손님 수 | |
| `dec_n_<결과>` · `dec_s_<결과>` | 결과별(sold/refused/bought…) 결정 수와 걸린 초 합 | 신중함(평균=합÷수) |
| `affil_ask` | 소속 물어본 횟수 | 꼼꼼함 |
| `inspect_seal` · `inspect_doc` | 인장을 처음 살핀 손님 수(일반/서류 손님) | 꼼꼼함 |
| `dc_pass` `dc_accuse` `dc_correct` `dc_wrong` | 위조 판정: 통과/지적, 정답/오답 | 판단력·의심 |
| `open_ledger` `open_news` `open_world` | 장부·신문·소문 서랍을 연 횟수 | 정보 탐색 |
| `poster_view` · `poster_sent` | 수배서를 본 것 · 받아 둔 것 | |
| `poor_seen` · `gift` · `forgive` | 궁핍한 손님 만남 · 덤 준 횟수 · 값 면제 횟수 | 배려 (배려율=(gift+forgive)÷poor_seen) |
| `anger_gift` · `promise` | 화난 손님에게 사과 덤 · 내일 다시 오라는 약속 | 배려·성실 |
| `stain_deal` · `stain_refuse` | 가짜 인장·수배된 손님과 거래 · 거절 | 규칙 준수 (거절률) |
| `offbooks` · `stash_sell` | 뒷거래 · 장물 판 개수 | 위험·불법 감수 |
| `l_report` `l_notify` `l_rumor` `l_star` `l_loan` … | 까마귀 편지를 보낸 횟수(종류별). `l_report`=경비대 신고 | 권위 순응 |
| `cs_visits` `cs_rounds` `cs_wager` `cs_won` `cs_lost` | 지하 도박장(카이의 내기를 세 번 받아들여야 열림): 찾은 밤 수 · 판 수 · 건 돈 합 · 딴 돈 · 잃은 돈 | 위험 선호 (평균 판돈=`cs_wager`÷`cs_rounds`) |
| `cs_allin` · `cs_stop` · `cs_ladder_max` | 금고를 통째로 건 판 수 · 카드 사다리에서 멈추고 가져간 수 · 가장 길게 이은 연속 | 절제·탐욕 |
| `cs_g_coin` `cs_g_shell` `cs_g_dice` `cs_g_roul` `cs_g_ladder` | 게임별 판 수 | 선호 게임 (동전·주사위=운, 야바위=관찰) |
| `cs_raid` · `cs_bigplay` | 감찰관 첫 단속에 걸림 · 마담의 큰 판에 끼어 동전을 던짐 (모른다고 한 갈래) | 규칙 무시·중독 |
| `cs_days` | 도박장을 찾은 서로 다른 날 수 (3일이면 감찰관 탐문) | 습관 |
| `cs_shell_hit` · `cs_cheated` | 야바위에서 공 든 컵을 맞힌 수 · 그중 딜러가 속인 수 | 집중력 |

플래그(`data.flags`): `casino_open`(도박장 해금) · `casino_regular`(3판) · `casino_hooked`(6판) · `vip_open`(6판에 열림) · `casino_days3` · `casino_reported`/`casino_denied`/`casino_evaded`(감찰관 마크에게) · `casino_caught1`(단속, 봐줌) · `casino_guarded`/`casino_quit`(마담의 부름) · `casino_arrested`(큰 판에서 체포 → 엔딩 「도박의 끝」). 엔딩 `gambler_ruin`(패가망신)·`gambler_pro`(도박사, v0.9.x 에만 있었음 — 지금은 없음)·`gambler`(마지막 한 판).

월드 변수 `gamble_bets` · `gamble_wins`(`data.world`): 노름꾼 카이의 내기(여섯 번 중)를 고른 수 · 딴 수. `choices` 의 `gambler_1..6` 은 `safe`/`bet`/`pass`.

## 선택 성향 태그 (`choice_tags.json`)
갈림길 72곳·선택지 178개에 성향 태그(배려·외면·정직·은폐·권위 순응·권위 거부·편들기·중립·이익·위험·배신)를 붙인 표.
`choices` 와 맞춰 사람마다 성향 점수를 만든다. 코딩 규칙은 파일의 `rules` 참고. 콘텐츠를 고쳤으면 `node tools/make_stats_labels.js && node tools/check_choice_tags.js`.

## 분석할 때 주의
- 표본이 작으면(집단당 100 미만) "경향"으로만 쓴다. 링크를 돌린 범위에 표본이 쏠린다.
- 첫 판(`run`=0)과 여러 번째 판은 따로 본다 — 두 번째부터는 결말을 노리고 고른다.
- 버전(`v`)이 바뀌면 콘텐츠가 달라진 것이니 섞기 전에 확인한다.
- 다시 본 판·개발 판은 애초에 안 들어온다. 봇 의심 판(하루 수십 건이 한 곳에서)은 `sid`·시각으로 걸러낸다.

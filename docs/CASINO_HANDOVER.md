# 지하 도박장 인계 (2026-09-29, v0.9.12)

> **새 세션에서 이 문서를 읽었다고 바로 작업을 시작하지 말 것.** 사용자가 "시작해"라고 할 때만 진행한다.

## 이번에 할 일 (사용자가 정한 범위)
1. ~~**도박장 입장 연출**~~ ✅ (v0.9.13) — 첫 입장: 돌계단(`entry_stairs.jpg`) → 「→ 내려간다」 → 문지기(`entry_door.jpg`, 문답) → 「→ 들어선다」 → 홀. 그다음부터: 계단 장면만 0.9초 보이고 저절로 홀로(눌러서 건너뛰기). 단속 날은 계단 없이 곧장 단속 장면. `CasinoView.js` `enter`/`enterView`/`enterAdvance`/`enterAutoRun`.
2. ~~**도박장 안 게임의 승리·패배 연출**~~ ✅ (v0.9.14) — 결과가 드러나는 순간(`FX_DELAY`: 동전 .85s · 주사위 .75s · 룰렛 .95s · 야바위 .35s · 카드 .45s)에 맞춰: 이김 = 금화 14닢이 튀고 테이블 금빛, **큰 승리**(×5 이상 또는 +300G) = 금화 34닢 · 화면 금빛 섬광 · 흔들림 · 소리 세 번 · 딜러 반응 대사(`SAY.jackpot`), 짐 = 테이블 붉게 흔들리고 동전이 쓸려 나감. 결과 줄은 그 순간에 튀어나온다(미리 보이지 않음). `CasinoView.js` `fx`/`fxHtml`/`record`, `casino.css` 맨 끝.
3. **버튼·이미지 다듬기** — 칩 버튼, 판돈 입력, 게임별 버튼, 홀 그림 속 테이블 이름표, 테이블 그림 등.
4. **「도박의 끝」으로 이어지는 흐름 다듬기** — 감찰관 탐문 → 첫 단속(봐줌) → 마담의 부름 → 큰 판 → 체포 → 엔딩.

사용자는 시안이면 그림(스크린샷)을 같이 보여 주기를 원한다. 이미지는 Gemini(크롬 탭)로 뽑는다 (아래 참고).

## 지금 흐름
- **입구**: 노름꾼 카이가 실제 **6·9·12·15·18일**에 온다(`js/data/gambler.js` ROUNDS). 판돈을 걸거나(금고에서 나감) 안 건다. 동전 앞(50%)이면 돌려받는다.
  - 첫 번째 10G 걸고 30G · 두 번째 20G 걸고 50G · 세 번째 이후 50G 걸고 100G (몇 번째로 오든 회차 기준 — 6일 10/30, 9일 20/50, 12·15·18일 50/100).
  - 다섯 번 중 **세 번** 걸면 그날 밤 `casino_open` + 카이의 초대 대사 + 해금 알림.
- **정해진 일정 (사용자 확정)** — 시뮬로 확인함:
  - 가장 빠른 길: 6·9·12일에 걺 → 12일 밤 개장 → 13·14·15일 밤 출근(**개장한 날 밤은 출근으로 세지 않는다**) → 16일 감찰관 마크의 탐문(모른다) → 16일 밤 단속(봐줌) → 17일 마담의 회유 → 17일 밤 큰 판·체포 → 「도박의 끝」.
  - 18일에 열리면 19·20·21 출근 → 22 탐문·단속 → 23 회유·체포.
  - 「도박의 끝」은 다른 어떤 결말과 겹쳐도 **가장 먼저** 잡힌다 (endings.js 목록 맨 앞 · Clash PERSONAL 맨 앞 · config.endNow 맨 앞).
- **도박장**: 영업 마감 화면에 버튼. 들어가면 홀 그림(`assets/casino/lobby.jpg`) 위 테이블을 눌러 앉는다(창고 뒷방과 같은 방식). **나서면 곧장 다음 날**(next-day 흐름 그대로, 밤 손님·결말 포함).
  - 게임: 동전(48%) · 야바위(맞혀도 50% 확률로 딜러가 속임) · 주사위(낮음/높음 ×2, 7 ×5) · 룰렛(색·홀짝 ×2, 숫자 ×36, 0 은 다 짐) · **카드 업다운**(id 는 `ladder`) · VIP 황금 동전(최소 200G, 49%, 여섯 판 넘게 놀면 금장식 문이 열림).
  - 판돈 자유(10G ~ 금고 전부). 모두 기댓값 1 이하.
- **감찰관 마크의 탐문**: 도박장을 서로 다른 사흘 찾은 다음 날(`casino_days3`). 신고 / 모른다 / 소문만 들었다.
  - **모른다** → 도박장에 가면 첫 단속(봐줌, 엔딩 그림 `canary_album_1`) → 도박장 닫힘 → 이튿날 마담 로자("경비와 종을 세웠다") → 가면 홀 한가운데 「큰 판」 → 앞/뒤 고르면 "승리하면 승리 엔딩, 패배하면 패배 엔딩" 문구 → 동전이 튕기는 동안 급습(섬광) → 체포 화면 → 「끌려간다」 → 엔딩 **「도박의 끝」** (본문 + 조지 워싱턴 인용구를 기울임꼴로 아래에).
  - **신고 / 소문만** → 지금은 아무 일도 없다 (사용자가 정하지 않음).
- **패가망신**: 도박장에서 세 판 넘게 논 뒤(`casino_regular`) 파산하면 「문 닫힌 가게」 대신 이 엔딩.
- 삭제된 것(되살리지 말 것): 도박사의 길(마담 VIP 초대·카이의 부탁·서기 에릭·도박장 매각 제안), 엔딩 「도박사」·「마지막 한 판」·「카나리아」.

## 파일
| 파일 | 내용 |
|---|---|
| `js/data/gambler.js` | 카이 6회 · 감찰관 탐문 `gm_inspector` · 마담의 부름 `gm_madam_guard` |
| `js/systems/Casino.js` | 계산만 (판돈·게임·플래그 `casino_*`·단속 `raidDue/raid`·큰 판 `bigCallDue/bigStart`) |
| `js/ui/CasinoView.js` | 화면 전부 (홀 `lobby()` + `HALL` 좌표, 테이블 `html()/panel()`, 야바위 애니메이션 `shellRun`, 카드 업다운 `ladderPanel`, 단속 `raidView`, 큰 판 `bigView/bigRun`, 해금 알림 `afterRender`) |
| `css/casino.css` | 도박장 스타일 전부 (뒤로 갈수록 나중에 덮은 규칙) |
| `js/data/endings.js` | `gambling_end`(quote 필드), `gambler_ruin` |
| `js/ui/UIManager.js` | 마감 화면 버튼, `cs-` 동작을 CasinoView 로 넘김(`next-day` 반환 시 다음 날), 엔딩 인용구(`e.quote`) |
| `assets/casino/` | 입장(`entry_stairs.jpg`·`entry_door.jpg`, `tools/casino_scene.py` 로 워터마크 지움)·홀·테이블 6종·소품(컵·구슬·동전 앞뒤·카드 뒷면)·큰 판 그림(`bigtable.jpg`) |
| `assets/ending/hires/canary_album_*.jpg` | 「도박의 끝」 앨범 4장 (급습·제보서·종·카나리아) |
| `assets/sprites/gambler.png`, `madam.png` | 카이·마담 로자 표정 시트 (`tools/make_sprite_sheet.py`) |

## 테스트
- `python3 tools/make_dev.py` → `http://localhost:8765/dev.html?tab=cs` (미리보기 서버 이름 `armsdealer`). 패널의 **「도박·갈래」** 탭에서 장면 직전 상태로 바로 간다. 마감 화면 시나리오는 「🎲 지하 도박장」을 눌러 이어 본다.
- 시뮬: `nice -n 10 node tools/sim.js 40 --quiet --gamble=bet --casino=0.1:2 --inspector=deny` (`--casino=F:R` 밤마다 금고의 F 비율로 R 판, `--inspector=deny|report|evade`). 고친 뒤 예외 0 확인.
- 태그표: `node tools/make_stats_labels.js && node tools/check_choice_tags.js` (손님·선택지를 바꾸면).

## 참고
- 이미지: Chrome 의 Gemini 탭(claude-in-chrome). 입력은 `[contenteditable=true]` focus 후 type, 보내기는 aria-label 「메시지 보내기」 버튼 클릭, 받기는 aria-label 「원본 크기 이미지 다운로드」 마지막 버튼 클릭 → `~/Downloads/Gemini_Generated_Image_*` (가끔 .jpeg). 오른쪽 아래에 Gemini 별 워터마크가 있으니 잘라 내거나 지운다. 글자가 섞여 나오면 "글자 없이" 다시 뽑는다. 투명 배경 소품은 순수 마젠타 배경으로 뽑아 키잉.
- 카드 테이블에 **초록 펠트 금지**. 커밋·PR 에 Co-Authored-By 금지. 작업이 끝나면 사용자가 맥북 소리 알림(`afplay /System/Library/Sounds/Glass.aiff`)을 원했다.
- 카이의 내기 수치는 사용자가 정한 값이다 (`ROUNDS` 배열) — 바꿀 땐 인사말 속 금액도 같이.
- 시뮬: `--gamble=bet --casino=0.05:1 --inspector=deny` 면 40판 모두 17일 「도박의 끝」이어야 한다.

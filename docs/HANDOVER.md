# Next! 인수인계 문서 (HANDOVER)

작성 시점: 2026-09-25 · 게임 버전 v0.9.0 · 이 문서는 다른 LLM/개발자가 작업을 이어받을 때 읽는 것이다.
(공개 사본 — 관리자 패널 여는 법은 가려져 있다. 전체본은 로컬 원본 폴더에 있다.)

---
## 0. 먼저 읽을 것 — 사용자(제작자)와 일하는 규칙
사용자는 1인 제작자이고 게임 디자인 결정권자다. 아래는 지금까지 명시적으로 확정된 선호다.

1. **모든 답변·질문·선택지는 한국어**로 쓴다.
2. **설치 없이 플레이**되어야 한다. 빌드 도구·npm·서버·DB를 도입하지 않는다. `<script>` 순서 로드 + 전역 `WS` 네임스페이스 유지. 유료 서비스·유료 업그레이드 금지(제미나이 유료 전환 등도 하지 않는다).
3. **시안(디자인 후보)은 단일 HTML 파일**로 준다. 글꼴은 파일 안에 base64 로 박아 넣는다(외부 링크 금지 — 사용자 PC에서 글꼴이 안 불려 시안이 똑같아 보인 적이 있다). 번호를 붙여 나란히 두고 결정은 사용자가 한다. 예시: `design/open_button_proposals*.html`.
4. **레퍼런스 게임을 지정하면 문자 그대로 따른다**(Papers, Please · 스타크래프트 창고 UI 등). 새 기획을 덧붙이지 않는다.
5. 게임 요소는 **데이터로**(js/data/*.js) 추가한다. 코드 수정 없이 콘텐츠를 늘리는 구조가 핵심이다.
6. UI 수정 후에는 **로컬 서버로 실제로 열어 확인**한다(콘솔 에러 0, 스크린샷). 확인하지 못했으면 못 했다고 말한다.
7. 손님 카드는 대사 대신 **거래 요약만**([태그] 물건×수량·값·줄마진). 새 대화형(talk) 손님에는 `ask` 필수. 신문은 2~3건, 중요한 정보만.
8. 사용자는 위치·크기를 px 단위로 미세 조정 요청을 자주 한다("8픽셀 아래로"). 그대로 반영한다.
9. 되돌리기 어려운 작업(파일 삭제, 원격 푸시, 외부 게시)은 확인 후 한다. 단, 사용자가 "푸시해"라고 명시했으면 푸시한다. **GitHub 토큰을 출력·저장하지 않는다.**
10. 대사 문체는 캐릭터별로 다르다(`design/voice_guide.md`, `design/remarks_guide.md`). 드워프·용병 등은 하오체/무뚝뚝 등 고유 말투.

---
## 1. 프로젝트 현황
- 40일 캠페인(4막: 1~10 개점 / 11~22 확장 / 23~32 격변 / 33~40 결산), **엔딩 28개**, 스토리 손님 약 100명(+세력별 랜덤 손님 틀), 세력 23개, 물건 정의 39개(7개 선반: 무기·방어구·재료·물약·특별·보석·잡화).
- 엔딩은 **40일째에만** 판정된다(예외: 파산 `bankrupt`, 밀수왕 `smuggle_king` 은 즉시). `js/data/endings.js` 를 위에서부터 훑어 처음 조건이 맞는 것이 채택된다 → **순서가 우선순위**.
- 배포: https://41ways.github.io/armsdealer/ (GitHub Pages, 저장소 `41ways/armsdealer`, main 브랜치 루트).
- 저장은 브라우저 localStorage 전용. **주소(origin)가 바뀌면 기존 저장이 이어지지 않는다** → 배포 주소를 유지할 것.
  키: `armsdealer_save_v1`(자동저장), `armsdealer_save_v1_slot1..3`(수동), `armsdealer_volume`, `armsdealer_endings_v1`(수집품). dev.html 은 `armsdealer_dev_save`·`armsdealer_dev_endings_v1` 로 분리.

### 최근에 끝낸 것 (이번 세션 후반)
- **아침 화면 내비게이션 전면 개편**: 거리 → 서신 → (신문) → 장부 → 창고 → 도매상. 이동은 오직 좌우 굽은 검은 화살표(`.pg-arw`, 위치·크기 고정)와 키보드(← → , . < >). 하단 이동 버튼·쪽 표시줄 없음. 화면 전환은 슬라이드(오른쪽에서 왼쪽; 뒤로는 반대; reduced-motion 은 페이드). 신문→장부는 신문 두 장이 겹쳐 왼쪽으로 사라지며 장부가 오른쪽에서 들어온다.
- **하루 시작 / 문 열기**: 버튼 틀 없이 촛불처럼 깜박이는 글자만(`.day-start`, `.open-door`, 글꼴 Diphylleia). 둘 다 무대 오른쪽 아래. 문 열기는 도매상 끝에서 다음 화살표를 눌러 책이 닫힌 뒤에만 나타난다. 1일차는 거리에서 바로 시작.
- **까마귀 서신 상점**: 대륙지도·평판지·정보통·달력·간판 교체·창고 확장은 전부 까마귀 서신으로 주문(삯 선불, 1~2일 뒤 아침 답장과 함께 도착). 도매상의 '가게 물품' 구역은 없앴다. 새 게임은 **장부만 가지고 시작**한다.
- **신문 구독**: 첫날 영업 종료 후 까마귀 튜토리얼로 구독(하루 10G, 마감 정산에서 차감, 금고가 모자라면 중단·안내 편지). 구독 전엔 신문이 오지 않고 2일차부터 받는다. 옛 저장본은 구독한 것으로 간주(호환).
- 장부 페이지: 1쪽 장부·약속·계약, 2쪽 7일 달력(달력 구매 시)+최근 사건, 3쪽 대륙지도(구매 시), 4쪽 대륙정세(평판지 구매 시, 항목 많으면 스크롤), 이어서 창고(게이지·타일), 도매상(항상 왼쪽 쪽부터).
- **정보통**(신규 물품): 가게 평판·왕국 우세도의 ± 변화를 보여 준다. 평판지는 정세의 정확한 숫자.
- 창고 세부 칸은 **3×3 고정**(물건 최대 9종) + 칸 아래 한 줄 '뒤로'. (예전 5×3 폐기)
- 장부 높이가 흔들리던 문제 수정: 하단 막대 높이 고정(94px/좁은 화면 80px), '주문은 취소된다' 안내는 absolute 오버레이.
- 우상단 **버전 표기** `v0.9.0`, **관리자 패널** 재설계(아래 §7).
- 엔딩 그림: 5개 엔딩의 앨범 4장, 새 썸네일 등 25장 추가(§9).

---
## 2. 저장소·폴더 구조
- **원본은 로컬 `C:\Users\정한결\armsdealer`** (git 아님). GitHub 는 `tools/deploy_web.py` 가 만드는 **배포 사본**(`C:\Users\정한결\armsdealer-web`, 원격 origin = `https://github.com/41ways/armsdealer.git`)만 가진다.
- 배포 사본에 포함: `index.html`, `css/`, `js/`(js/dev 제외), `assets/`(raw · `_backup*` · vendor 제외), `CREDITS.md`, `README.md`(원본은 `tools/deploy_readme.md`), `.nojekyll`.
- 배포 절차(수동):
  ```
  cd armsdealer && python tools/deploy_web.py      # 배포 폴더 재생성 + 참조 파일 존재 검사
  cd ../armsdealer-web && git add -A && git commit -m "..." && git push origin main
  ```
  `gh` CLI 가 없다. 인증은 PC 의 Git Credential Manager(이미 로그인됨). 저장소 생성/Pages 설정은 REST API 를 curl 로 썼다(한글 JSON 은 UTF-8 파일로 보낼 것).
- `deploy_web.py` 가 보고하는 "참조되지만 없는 파일 10개"는 의도된 것: 데코 그림 8개(`assets/scene/decor/*.png`, 아직 미제작 — 게임이 조용히 건너뜀)와 코드 주석 속 경로.
- 로컬 시작 시 `dev.html` 은 스크립트/CSS 를 mtime 으로 캐시버스팅한다 → **CSS/JS 수정 후 `python tools/make_dev.py`** 를 다시 돌려야 dev.html 에 반영된다(안 하면 옛 파일이 보인다).
- `index.html`, `artifact.html`, `dev-artifact.html` 의 스크립트·CSS 목록은 **항상 동일**해야 한다. 새 JS/CSS 를 추가하면 셋 다(+ make_dev.py) 갱신.

---
## 3. 코드 구조 (전역 `WS`)
| 영역 | 파일 | 역할 |
|---|---|---|
| core | `js/core/util.js`(네임스페이스·유틸 `U`), `Sfx.js`(효과음·음량, MAX_GAIN 0.6), `Boot.js` | 시작·프리로드 |
| 상태 | `js/GameManager.js` | 새 게임 상태 생성, `WS.Game.state` |
| DSL | `systems/Conditions.js`, `EventManager.js` | 조건/효과 DSL, 새벽 이벤트 평가 |
| 세계 | `systems/World.js` | 세계 변수·밤사이 시뮬·Items/Inventory(부피 체계)/Market(시세) |
| 진행 | `systems/DayManager.js`, `Progress.js`, `CustomerManager.js`, `TransactionManager.js`, `Stash.js`, `DocCheck.js` | 하루 흐름·마감 정산·해금·손님 큐·거래·장물함·서류 대조 |
| 서신/상점 | `systems/Letters.js`, `Shop.js`, `Intel.js`, `Rumors.js`, `Decor.js`, `NewsManager.js`, `InventoryLayout.js`, `EndingLog.js` | 까마귀 서신(구매·대출·소문 확인·경비), 가게 물품·달력 이벤트·경비, 정세/평판 정보, 소문 진위, 가게 데코, 신문, 수집품 기록 |
| render | `render/Pixel.js`, `Sprites.js`, `Scene.js`, `DecorLayer.js`, `Cinematic.js` | 카운터 너머 손님을 그리는 픽셀 캔버스(#scene 144×256), 데코 레이어, 엔딩 인트로 연출 |
| ui | `ui/UIManager.js`(약 3400줄, 화면 대부분), `WorldView.js`(정세·지도), `Emblem.js`(세력 표식 SVG) | |
| data | `js/data/*.js` | 아래 참고 |
| dev | `js/dev/DevPanel.js` | dev.html 전용 패널(엔딩 보기·날짜 이동·장면 호출) |

### 데이터 파일
`config.js`(수치·세계 변수·**version**), `items.js`(39개 정의), `categories.js`, `factions.js`, `customers.js`(스토리 손님·거짓 소속·대화 선택지·`inspectLine`), `looks.js`(외형 프리셋), `events.js`, `news.js`, `endings.js`, `ending_art.js`(**자동 생성** — 직접 고치지 말 것), `epilogues.js`, `stories.js`, `smuggling.js`, `letters.js`, `progress.js`(해금 일정), `sheets.js`(스프라이트 시트 정의), `remarks.js`(손님 맥락 한마디 385개), `rumors.js`(소문 20개), `intel.js`, `decor.js`(가게 데코 45개), `shop.js`(물품 목록·달력·경비).

### 조건 DSL (`Conditions.js`) 예
`{flag:'x'}` `{noFlag:'x'}` `{any:[…]}` `{all:[…]}` `{var:'goblin_power',gte:30}` `{has:{item,min}}` `{day:{gte:20}}` `{soldShare:{…}}` `{time}` `{stock}` `{crow}` `{todayDone}` `{storage}` …
효과 DSL: `{vars:{…}, flags:[…], spawn:[{customer, inDays}], schedule:…, gold, …}`. 정확한 목록은 두 파일을 읽을 것. 이벤트 한 개 예시는 `DATA_GUIDE.md`.

### 부피/창고 체계 (World.js)
칸(slot) 대신 **부피**: `slotVolume 24`, 물건 부피 = `24 / 칸당 수량`, 용량 = `(shopSlots + 확장) × slotVolume`(기본 480). 창고 확장은 서신으로 3단계 300/500/700G(각 +240 → 최대 1200). 도매상은 '개당 부피'로 정량 비교 표시.

### 경제·규칙 요약 (수치는 `config.js`/`shop.js` 가 원본)
- 까마귀 해금 6일차. 대출 200/400/700G, 7일 안 상환 ×1.2, 연체 5%/일, 연체 3일째 '모트'가 받으러 온다.
- 신문 구독 10G/일. 평판지·달력 100G, 간판 200G(평판 +2, 손님 +1). 정보통 150G(`shop.js` 의 goods).
- 달력 이벤트: 장날 8/16/24/32일, 왕실 열병식 12·30일, 수확제 20일, 전염병 8%·화재/홍수 5%(판당 1회 굴림). 경비 고용 20G/일(밤 방문자 정체 예고·도둑 쫓아내기).
- 별조각은 '???' 손님에게서만 100G 로 산다(도매상 편지로 못 산다). 스토리 전용 물건은 미발견 상태에서 "미발견"으로 표시.
- 거절은 **0.5초 길게 누르기**(붉은 게이지) — 실수로 판매 거절을 누르는 것을 막기 위함. 버튼이 나타난 뒤 0.3초는 눌림 무시.
- 첫날은 고정 5명(레온 칼1, 즈긱 칼2+활1, 한스 활3 → "내일 다시 오시오", 벨 기사단원 칼2 인데 재고 1) 튜토리얼.

---
## 4. UI 규칙 (확정된 것 — 되돌리지 말 것)
- 글꼴: 게임 전체 **Hahmlet(함렛)**, 제목류·엔딩 화면·날짜 전환은 **Diphylleia(디필레이아)** + 고운바탕, 로마 숫자·영문은 **IM Fell English SC**. 폰트 파일은 `assets/fonts/`.
- 색/장식: 길드 **놋쇠** 톤(다크 브라운+황동). 버튼 라벨은 "다음 →" 식. 선택지 금화 표기는 부호(−/+) 포함, 위로금 등 지급은 초록 +.
- 날짜 전환: KTC 새벽 전환(≤4초, 로마 숫자 + "N일째" 가운데, "영업 시작" 카드가 밝아지며 사라짐). 신문은 두 장짜리.
- 결말(엔딩) 화면: **가죽 표지(제목만) → 펼치면 양피지 안쪽**(왼쪽 원문, 오른쪽 조건; 다음 펼침에 '그 뒤의 이야기'+사진첩 2장씩, 캡션 없음, 스크롤 없음, 테두리 없는 화살표). 인트로는 컷 1장+대사 1줄, '결말 보기' 버튼을 눌러야 진행. 앨범은 엔딩당 4장.
- ESC 메뉴: 계속하기·저장(3칸)·불러오기·음량(슬라이더)·처음으로. 음량 최대는 −40%(`MAX_GAIN 0.6`). 타이틀: 새 게임 / 이어하기(→저장 목록) / 수집품.
- 창고 세부 = 3×3 + 뒤로 줄. 화면 높이가 페이지마다 변하면 안 된다.
- 용병단장 돋보기(`inspectLine`) 등 손님을 다시 누르면 대사를 다시 들을 수 있고, 돋보기로 소속·인장 확인 가능. "인장 대조" 별도 버튼은 없앴다.
- 손님 카드는 거래 요약만(§0-7).

---
## 5. 응대·서신·신문 흐름 (요약)
1. 아침: 거리 → (서신 있으면/없어도 서신 페이지) → 신문(구독 시) → 장부 → 창고 → 도매상 → 마지막에서 책이 닫히면 '문 열기'.
2. 영업: 왼쪽 응대 테이블(손님·제출대 드래그앤드롭), 오른쪽 창고(카테고리→3×3 선반, 장물함, 서류함). 거래/거절(길게 누르기)/내일 다시 오시오/대화 선택지.
3. 마감: 임대료·경비·구독료 정산 → 밤(문 두드림 이벤트) → 다음 날 전환.
4. 서신(`Letters.js`): 편지 쓰기 유형(증축 의뢰·대출·소문 확인·경비 고용·물품 주문 …), 답장 지연, 인상서(수배) 접수.

---
## 6. 개발·검수 도구
- **로컬 서버**: `python tools/serve.py 8765` (캐시를 끈 서버. 그냥 `http.server` 는 브라우저가 옛 JS/CSS 를 붙들어 수정이 안 보일 수 있음). 본편 `index.html`, 개발 `dev.html`.
- **dev.html**: 오른쪽 개발 패널 — 날짜 이동, 엔딩 바로 보기(컷씬 건너뛰기 옵션), 수집품 해금/초기화, 장면·손님 호출. 상태를 바꾸려면 콘솔에서 `WS.Game.state.day = 3; WS.UI.render();` 처럼 직접 만질 수 있다(해금은 `WS.Game.state.progress.unlocked.<place>=1`).
- **node 스크립트**(`tools/`): `data_lint.js`(데이터 정합성), `qa_checks.js [save|scan|all] [N]`(저장 왕복·N판 예외 스캔·멈춘 판), `sim_suite.js [N] [--tag=]`(엔딩 도달률·밸런스·줄거리 탐침), `sim_probe/sim_human/sim_dragon.js`, `content_audit.js`, `remarks_check.js`, `asset_refs.js`, `look_audit.js`, `story_map.js`(스토리 지도 HTML 생성). 결과는 `design/qa_*.json|md`.
- 브라우저 캐시 주의: 스크립트가 stale 하게 남으면 `fetch(url,{cache:'reload'})` 후 새로고침.

---
## 7. 관리자 패널 (플레이어에게 숨겨 둔 기능)
- **여는 법**: (공개 사본에서는 생략)
- **내용**: Relationship(세력 우호도), Endings(28개 조건 충족 여부, 지금 끝나면 채택될 엔딩에 ▶, **해금/해제 버튼·전부 해금·전부 잠금** → 수집품에 반영), Flags(켜진 플래그), Scheduled(예약된 이벤트).
- 코드: `UIManager.js` 의 `ADMIN_CODE`, `renderDebug()`, keydown 핸들러. **소스에 그대로 있으므로 보안 수단이 아니라 우연히 열리지 않게 하는 장치**다.

---
## 8. 에셋 제작 파이프라인
- **손님 스프라이트**: AI 생성 시트(4×2, 마젠타 배경) → `tools/process_sheet.py` → `assets/sprites/*.png` + `js/data/sheets.js`. 출처는 `CREDITS.md`.
- **엔딩 그림**(1024×1536): 제미나이(Gemini 웹, 사용자 로그인 세션을 Claude-in-Chrome 으로 조작)로 생성 → `tools/g_take.sh <이름>`(다운로드 최신 파일 → 가공) 또는 `cut_sheet.py`/`dewatermark.py` → `assets/ending/hires/<id>_{album_N,thumb,intro_N}.png`.
  매니페스트 `design/ending_art/<id>.json`(캡션·인트로 대사 포함, `tools/ending_json.py` 가 갱신) → `python tools/build_ending_art.py` 가 `js/data/ending_art.js` 생성(없는 파일은 걸러냄, 없으면 옛 `assets/ending/<id>_outcome_1..3.png` 로 폴백).
  기획: `design/ending_album_confirmed.md`(엔딩 24개의 앨범·인트로·썸네일 계획이 한 개씩 사용자 확정됨), `ending_album_plan.md`, `ending_art_brief.md`, `ending_art_user_specs.md`.
- **제미나이 규칙**: 무료 한도가 있고 계정 공유 → **동시에 에이전트 2개 이하**. 한도가 차면 즉시 멈추고 `design/PROGRESS_ending_art.md` 에 재개 지점 기록. 다운로드 폴더는 사용자 개인 파일이 섞여 있으니 **가장 최근 파일만** 집고 실제 내용을 열어 확인한 뒤 채택. 채팅이 길어지면 렌더러가 느려지니 새 채팅 권장.
- **아직 없는 그림**: 엔딩 앨범 약 91장 + 인트로 24장, 데코 그림 8개(`design/decor_art_list.md`). 배포 용량 174MB(대부분 hires PNG) — WebP 변환은 미진행.
- 엔딩 그림 현황(2026-09-25): 썸네일은 28개 전부 hires 존재. 앨범 4장 완료: smuggle_king(3장+인트로2), informant, fairy_friend, knight_commander, bankrupt, red_ford_again, perfect_ledger, balance_keeper, iron_king. candle_queen 1장. 나머지는 미제작. 재개 지점은 `design/PROGRESS_ending_art.md`.

---
## 9. 남은 일 / 알려진 이슈 (우선순위 순)
1. **엔딩 그림 마저 만들기**(§8) → `build_ending_art.py` → dev.html 확인 → 배포.
2. **밸런스 재조정**: 물건 정리(38→31종) 뒤 자연 플레이 파산율이 ~21%로 올랐다(원래 16%, 목표 ≤12%). 임대료·하루 손님 수·시작 재고로 조정하고 `sim_suite.js` 로 검증. 신문 구독(10G/일)·경비·대출 이후 수치는 아직 재측정하지 않았다.
3. **원본 폴더 정리**: 안 쓰는 CSS/JS/에셋(옛 커튼 그림·저해상 엔딩 outcome 이미지·`_backup*`·`assets/raw`)을 `tools/asset_refs.js`/`qa_checks.js` 로 검증한 뒤 정리(원본 그림은 삭제하지 말고 게임 폴더 밖으로 이동). 배포 사본은 이미 이것들을 제외한다.
4. 데코 그림 8개 미제작. 세력 표식 크기(16×16)·천칭단 표식 미결정.
5. **확인이 덜 된 UI**: 좁은(폰) 화면에서의 하루 시작/문 열기 위치, 서신 여러 통 넘김, 대출 흐름 UI, 신문 진입 시 슬라이드+기존 등장 효과가 겹치는 점(어색하면 등장 효과 제거).
6. 아이디어 로드맵(사용자 승인 전): 밤 행동, 라이벌 무기점, 단골 연속극, 장인의 일, 직원, 다회차. (완료: 가게·거리 변화, 정세 화면, 소문 진위, 달력·재난 일부)
7. 배포 용량(174MB) 줄이기 — 큰 PNG 를 WebP 로.

---
## 10. 함정 (실제로 겪은 것)
- **Windows/Git Bash**: 파이썬 heredoc 안의 `\\n` 같은 이스케이프가 도구 계층에서 납작해질 수 있다 → 여러 줄 문자열은 파일 쓰기 도구로 만들고, 한글 출력은 `PYTHONIOENCODING=utf-8`. `git` 이 LF→CRLF 경고를 낸다(무시해도 됨).
- 한글 JSON 을 curl 로 보낼 때 인코딩 400 → UTF-8 파일(`--data-binary @file`).
- CSS 는 뒤 파일이 앞을 덮는다(`round3.css`·`shop.css` 가 마지막). `#stage:not([data-phase="shop"]) #ui > * { width: min(100%, 660px) }` 규칙 때문에 넓은 화면에서 `#ui` 직계 자식이 660px 로 갇힌다 → 무대 전체 폭이 필요한 요소는 `width:100%` 를 명시(하루 시작 버튼에서 실제로 문제였음).
- 창고 5×3→3×3 통일 시 무기 선반이 물건 9종이라 '뒤로'를 칸 밖으로 뺐다.
- `js/data/ending_art.js` 는 생성물 — 직접 편집하면 다음 빌드에서 사라진다.
- 게임 상태 저장 호환: 필드를 추가하면 옛 저장에서 undefined 일 수 있으니 기본값 처리(신문 구독처럼 옛 저장은 구독으로 간주).
- 에이전트 다수 병렬 작업 시 `UIManager.js`(3400줄) 동시 수정 충돌 위험 — 한 번에 한 작업자.
- Claude Artifact 게시본(`artifact.html`, `dev-artifact.html`)은 Claude 전용 배포 경로다. 게시할 때 바뀐 css/js/assets 를 `files` 목록으로 함께 올려야 한다(한 번에 최대 255개, 64MB). 다른 LLM 환경이면 무시해도 된다(핵심 배포는 GitHub Pages).

---
## 11. 검수자(리뷰 LLM)에게 부탁할 것
1. `node tools/data_lint.js` · `node tools/qa_checks.js all 200` 이 통과하는지, 경고가 무엇인지.
2. `index.html` / `artifact.html` / `dev-artifact.html` 의 스크립트·CSS 목록이 일치하는지, 참조 파일 404 가 없는지(`node tools/asset_refs.js`).
3. UIManager 의 아침 내비게이션(`morningPages`, `pageBar`, `pageSlide`, `streetPage`, `morningLetters`)에서 상태 꼬임(문 열기 표시 조건 `doorReady`, `endReached`, 서신 인덱스 `ltIdx`)이 없는지.
4. 세이브 왕복 시 새 필드(구독·주문 서신·물품 보유) 누락이 없는지.
5. 엔딩 조건(`endings.js`)의 순서 우선순위·도달 불가 엔딩이 없는지(`sim_suite.js` 도달률).
6. 밸런스 §9-2 수치를 재측정하고 제안(사용자 승인 후 반영).
7. 보안/프라이버시: 이 프로젝트는 서버가 없고 localStorage 만 쓴다. 공개 저장소에 비밀 값이 없는지(관리자 코드는 소스에 평문이므로 '보안'이 아니다).

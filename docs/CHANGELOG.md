# Changelog

## [2026-02-28]

### 우측 패널 토글 제거: 운명의 리포트 단일 흐름화 (v6.3.20)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.20.md`

#### 변경 사항
- 우측 패널의 `운명의 리포트 / 아르카나 탐구` 탭 UI를 제거.
- 결과 화면을 `운명의 리포트` 단일 흐름으로 고정해 토글 없이 바로 핵심 결과를 읽도록 변경.
- 우측 토글과 연계된 상태/핸들러 정리:
  - `resultTab` 상태 제거
  - `handleTabSwitch()` 제거
  - 스크롤 하단 이동 effect 의존성에서 `resultTab` 제거
  - reset 시 탭 초기화 로직 제거
- 우측 `study` 분기 렌더링(아르카나 탐구 탭 콘텐츠) 제거.

#### 효과
- 우측 결과 영역의 상단 조작 요소가 줄어 리포트 집중도가 향상됨.
- 사용자 동선이 단순화되어 결과 확인까지의 클릭 단계가 감소.
- 좌측 토글(카드 스프레드/아르카나 탐구)과 우측 리포트 역할 분리가 명확해짐.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.20.md`

### 좌측 패널 토글 전환: 카드 스프레드/아르카나 탐구 단일 뷰화 (v6.3.19)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.19.md`

#### 변경 사항
- 좌측 패널 표시 방식을 고정 2분할에서 탭 토글 방식으로 전환.
  - 탭: `카드 스프레드` / `아르카나 탐구`
  - 한 번에 하나의 뷰만 렌더링해 각 콘텐츠가 더 넓은 영역을 사용하도록 변경.
- 좌측 레이아웃 구조 변경.
  - `leftPane`을 상하 그리드에서 단일 뷰포트(`leftPaneViewport`) 중심 구조로 변경.
  - 상단에 좌측 전용 탭 버튼(`leftPaneTabs`, `leftPaneTabBtn`) 추가.
- 스프레드/탐구 전환 상태 관리 추가.
  - `leftPaneTab` 상태(`spread | study`) 도입.
  - 새 리딩 시작(`handleStartRitual`) 및 초기화(`handleReset`) 시 기본 탭을 `spread`로 자동 복귀.
- 탐구 패널은 기존 탐구 카드 스타일을 유지하되, 토글 전환에 맞춰 전체 높이를 사용하도록 조정.

#### 효과
- 카드 이미지와 탐구 텍스트가 동시에 공간을 나눠 갖지 않아, 선택된 콘텐츠의 가시성이 개선됨.
- 좌측 영역에서 사용자 의도(카드 보기 vs 탐구 읽기)에 맞게 집중 가능한 정보 밀도 제공.
- 화면 폭이 넓을수록 토글 뷰의 체감 이점이 커져 탐색 효율이 향상됨.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.19.md`

### 좌측 패널 아르카나 탐구 대체 + 성소 전반 폰트 스케일 상향 (v6.3.18)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.18.md`

#### 변경 사항
- 좌측 하단 패널 대체
  - `기본 카드 설명` 영역을 `아르카나 탐구` 패널로 전면 교체.
  - 카드별 출력을 탐구 카드 구조(`포지션 라벨 + 카드명 + 포지션 설명 + 카드 상세 설명 + 키워드`)로 통일.
  - 기존 요약 전용 함수 기반 렌더링을 제거하고 `description || summary` 본문 중심으로 표시.
- 폰트 크기 전반 상향
  - 성소 헤더, 좌측 패널 제목/본문, 탭 버튼, 리포트 텍스트, 배지/목록, 입력창/버튼 폰트를 단계적으로 상향.
  - 메시지 버블(`MessageBubble`) 기본/액션/모바일 폰트 크기를 함께 상향해 채팅 영역 가독성 균형 유지.
- 반응형 정리
  - 모바일 탭 버튼 폰트 규칙 중복을 제거해 최종 크기 규칙을 단일화.

#### 효과
- 좌측 패널 정보 밀도가 `탐구 탭`과 동일한 수준으로 맞춰져 학습 흐름이 일관됨.
- 데스크톱/모바일 모두에서 작은 글씨로 인한 피로도가 줄고 핵심 문장 스캔 속도가 개선됨.
- 채팅/리포트/탐구의 타이포그래피 레벨이 맞춰져 화면 전체 톤이 안정화됨.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.18.md`

### 질문 프로파일 단일화 + 운영 계측 API + 성소 UX 신뢰성 강화 (v6.3.17)

#### 변경 파일
- `apps/api/src/domains/reading/questionType.js` (신규)
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/web/src/services/tarotService.ts`
- `apps/web/src/services/analytics.ts`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/common/TarotCard.tsx`
- `apps/web/src/components/common/TarotCard.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.17.md`

#### 변경 사항
- 질문 분류 규칙 단일화
  - `questionType` 및 `targetCardCount` 추론 로직을 API 공용 유틸(`questionType.js`)로 통합.
  - `hybrid.js`와 `index.js`가 동일 규칙을 사용하도록 변경.
  - 신규 API `POST /api/question-profile` 추가, 프론트가 서버 기준 분류/카드 수를 사용하도록 전환.
- 운영 계측 실연결
  - 신규 API `POST /api/analytics` 추가.
  - 프론트 `trackEvent()`가 `sendBeacon` 우선 + `fetch(keepalive)` 폴백으로 이벤트를 전송하도록 개선.
  - 세션 단위 추적을 위해 `sessionStorage` 기반 `sessionId` 도입.
- 리딩 메타 타입 정합성 회복
  - 웹 `ReadingResponse.meta`에 `attempts`, `failureStage`, `timings.anthropicRepairMs` 반영.
- 성소 화면 신뢰성/접근성 강화
  - 리딩 단계 타이머를 ref 큐로 관리하고 reset/unmount 시 clear하여 경쟁 상태 제거.
  - 카드 공개 메시지를 문자열 split 중심에서 `report.evidence` 우선 조합으로 변경해 파싱 취약성 완화.
  - 진단 배지는 기본 사용자 화면에서 숨기고, `?debug=1` 또는 개발 환경에서만 노출.
  - 카드 뒤집기 인터랙션을 `button` 시맨틱으로 교체하고 `focus-visible` 스타일/ARIA 라벨 제공.
  - `aria-live` 안내 영역을 추가해 로딩/결과 상태를 보조기기에 전달.

#### 효과
- 질문 유형 드리프트(FE/BE 불일치) 위험을 구조적으로 축소.
- 사용자 행동 지표를 수집할 기반 확보(완독/탭전환/재질문 등 후속 지표 분석 가능).
- 리딩 중 reset/재시작 시 간헐적 UI 경합 및 메시지 꼬임 가능성 감소.
- 기본 사용자 경험에서 기술 진단 정보 노출을 줄여 몰입도 개선.
- 키보드 사용자 접근성과 상태 인지성이 개선.

#### 검증
- `npm run build --prefix apps/web` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- `npm run test:hybrid --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.17.md`

## [2026-02-28]

### 아르카나 성소 와이드 확장 + 우측 스크롤바 노출 강화 + 기본 카드 설명 심화 (v6.3.16)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.16.md`

#### 변경 사항
- 화면 가로폭 확장
  - `.page` 최대 폭을 `1520px -> 1720px`로 확대.
  - `workspaceGrid` 비율을 `46/54`에서 `44/56`으로 조정하고 우측 최소 폭을 확대해 리포트 패널 가용 폭 확보.
- 우측 스크롤바 가시성 강화
  - 스크롤 주체를 메시지 내부(`.messages`)에서 우측 패널 컨테이너(`.rightPane`)로 이동.
  - `overflow-y: scroll` + `scrollbar-gutter: stable both-edges` 적용으로 스크롤 인지성과 폭 안정성 강화.
  - 파이어폭스/웹킷 모두에서 눈에 띄는 커스텀 스크롤바 트랙/썸 스타일 적용.
- 기본 카드 설명 심화
  - 카드별 출력 정보를 `포지션 의미 + 카드 본문(최대 3문장) + 키워드 태그(최대 5개)`로 확장.
  - `getCardBaseDescription()`를 개선해 `description/summary`를 정규화 후 결합, 텍스트 길이가 짧을 때 요약을 보강하도록 로직 추가.

#### 효과
- 데스크톱에서 좌우 패널이 덜 답답하게 보이며 긴 리딩 텍스트 가독성 향상.
- 우측 패널이 스크롤 가능 영역임을 즉시 인지 가능하고, 탭/메시지 길이 변화 시 폭 점프가 줄어듦.
- 좌하단 기본 카드 설명이 단순 요약을 넘어 맥락/키워드까지 제공해 학습 밀도 상승.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.16.md`

### 하이브리드 리딩 fallback 저감 안정화 (v6.3.15)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/package.json`
- `docs/SETUP_SECURITY.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.15.md`

#### 변경 사항
- Anthropic 타임아웃 기본값을 안정성 우선으로 재조정.
  - `ANTHROPIC_TIMEOUT_MS`: `60000`
  - `ANTHROPIC_RETRY_TIMEOUT_MS`: `25000`
  - `ANTHROPIC_REPAIR_TIMEOUT_MS`: `12000` (신규)
- 실패 원인별 재시도 정책 도입.
  - 재시도: timeout/fetch 오류/parse 오류/5xx
  - 비재시도: `404`(model_not_found), `401/403`(auth), `429`(rate limited)
- JSON 파싱 실패 시 repair 전용 프롬프트로 1회 복구 시도 추가.
- 응답 정규화/검증 로직 보강으로 과도한 fallback 감소.
  - evidence를 카드 수/카드 ID에 맞게 정규화
  - 치명 이슈(요약/판정/evidence 길이) 중심으로 fallback 판정
  - 낮은 evidence 품질은 점수 페널티로만 반영
- 운영 진단 메타 확장.
  - `meta.attempts`(primary/retry/repair 단계별 결과)
  - `meta.failureStage`(network/http/parse/validation 등)
  - `meta.timings.anthropicRepairMs` 추가
- 복원력 회귀 테스트 추가.
  - `npm run test:hybrid --prefix apps/api`

#### 효과
- parse/부분 구조 불안정 응답에서 deterministic fallback 직행 비율이 감소.
- fallback 발생 시 원인을 단계별로 추적할 수 있어 운영 디버깅 속도 향상.
- 문서 기본값과 코드 기본값 정합성 회복.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.15.md`

## [2026-02-28]

### 아르카나 성소 우측 패널 스크롤바 가시성 개선 (v6.3.14)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.14.md`

#### 변경 사항
- `아르카나 성소` 우측 패널(`.messages`)의 세로 스크롤 동작을 `auto`에서 `scroll`로 변경.
- `scrollbar-gutter: stable`을 추가해 콘텐츠 길이에 따라 레이아웃 폭이 흔들리지 않도록 고정.
- 기존 `thin` 스크롤바 스타일(파이어폭스/웹킷 커스텀)은 유지해 테마 일관성을 보존.

#### 효과
- 우측 리딩 영역에서 스크롤바가 항상 표시되어 스크롤 가능 상태를 즉시 인지할 수 있음.
- 결과 탭 전환 및 메시지 길이 변화 시 우측 패널의 가로 폭 점프가 감소해 읽기 흐름이 안정화됨.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.14.md`

## [2026-02-28]

### 리딩 화면 3분할 레이아웃 전환 및 와이드 뷰 확장 (v6.3.13)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.13.md`

#### 변경 사항
- 리딩 화면 메인 구조를 3분할로 재배치.
  - 좌상단: 카드 스프레드 영역
  - 좌하단: 기본 카드 설명 패널(포지션/카드명/요약)
  - 우측: 운명의 리포트/아르카나 탐구 탭 및 대화 영역
- 질문 입력 전에도 좌상단에 플레이스홀더를 제공해 화면 구조를 고정.
- 우측 리포트 영역은 독립 패널로 분리해 스크롤/가독성 안정화.
- 전체 페이지 최대 폭을 확장(`1100px -> 1520px`)해 가로 레이아웃 활용도 개선.
- 모바일에서는 1열 스택으로 자동 전환되도록 반응형 규칙 추가.

#### 효과
- 카드/기본설명/리포트가 동시에 보여 탐색 동선이 단축됨.
- 기존 대비 넓은 가로 구성을 활용해 데스크톱에서 정보 밀도와 가시성 향상.
- 리딩 진행 중/완료 후 화면 점프를 줄여 UX 일관성 강화.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.13.md`

## [2026-02-28]

### 완드 9 카드 이미지 로드 실패 핫픽스 (v6.3.12)

#### 변경 파일
- `apps/api/src/data/wands.js`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.12.md`

#### 변경 사항
- `w09`(지팡이 9) 카드의 이미지 URL을 404 경로에서 정상 응답(200) 경로로 교체.
  - 기존: `https://commons.wikimedia.org/wiki/Special:FilePath/Wands09.jpg`
  - 변경: `https://commons.wikimedia.org/wiki/Special:FilePath/Tarot%20Nine%20of%20Wands.jpg`

#### 원인
- Wikimedia `Special:FilePath/Wands09.jpg` 리다이렉션 체인의 최종 응답이 404로 반환되어 해당 카드만 이미지가 깨짐.

#### 효과
- 지팡이 9 카드가 정상적으로 렌더링됨.
- 특정 카드 단일 이미지 누락으로 인한 UI 불일치 해소.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.12.md`

## [2026-02-28]

### 결과 화면 가독성 개선: 폰트 상향 + 탐구 섹션 상하 분할 (v6.3.11)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.11.md`

#### 변경 사항
- 결과 화면 전반의 폰트 크기를 소폭 상향해 장문 리딩 가독성 개선.
  - 마스터 리포트, 요약 박스, 지침, 진단 배지, 탭 버튼, 입력창, 메시지 버블 텍스트 조정.
- `아르카나 탐구` 섹션의 다열(좌우 분할) 레이아웃을 1열(상하 분할) 고정으로 변경.
  - `studyGrid`를 단일 컬럼으로 통일하고, 데스크톱에서 최대 폭을 제한해 줄 길이 안정화.
- 모바일에서도 동일한 상하 흐름을 유지하도록 반응형 설정 정리.

#### 효과
- 카드 해석/결론/지침 문단을 더 쉽게 훑을 수 있어 피로도 감소.
- 탐구 카드가 좌우로 분산되지 않고 세로로 이어져 읽기 흐름이 자연스러워짐.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.11.md`

## [2026-02-28]

### 결과 요약 중복 제거 및 보조 인사이트 차별화 (v6.3.10)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.10.md`

#### 변경 사항
- 결과 화면의 `운명의 마스터 리포트`와 `사서의 통찰/유보(신중/긍정)의 기운` 문구가 사실상 동일하게 반복되던 문제 수정.
- `conclusion`과 `report.summary/verdict.rationale`의 중복 여부를 정규화 비교로 판별하는 로직 추가.
- 중복 감지 시 보조 텍스트를 아래 우선순위로 치환:
  - `사서의 통찰`: 첫 카드 근거(`evidence`) 기반 문장
  - `~의 기운`: 첫 실천 지침(`action`) 기반 문장
- 중복이 아닌 경우 기존 생성 텍스트를 그대로 유지.

#### 효과
- 같은 의미가 반복되는 체감을 줄이고, 보조 박스가 “요약 반복”이 아니라 “근거/실천 보강” 역할을 수행.
- concise 모드 결과에서 정보 밀도와 가독성 개선.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.10.md`

## [2026-02-28]

### Claude 전용 엔진 전환 + 응답 다양성/속도 최적화 (v6.3.9)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.9.md`

#### 변경 사항
- 하이브리드 엔진을 **Claude 전용 경로**로 전환.
  - OpenAI 호출 경로 및 관련 분기 제거.
  - Anthropic 1차 실패 시 1회 재시도 후 deterministic fallback으로 전환.
- 응답 속도 개선을 위한 Anthropic 호출 파라미터 튜닝:
  - 기본 타임아웃: `60000ms -> 10000ms`
  - 재시도 타임아웃: `7000ms` 추가
  - 모드별 `max_tokens`/`temperature` 동적 적용.
- 응답 다양성 자동 모드 도입:
  - `responseMode: concise | balanced | creative`
  - 질문 유형/길이에 따라 프롬프트 스타일 가이드 자동 선택.
- 운영 진단 메타 확장:
  - `meta.responseMode`
  - `meta.path` (`anthropic_primary`, `anthropic_retry`, `fallback`)
  - `meta.timings` (`totalMs`, `anthropicPrimaryMs`, `anthropicRetryMs`)
- 프론트 결과 화면 진단 배지 확장:
  - `responseMode`, `path`, `totalMs` 표시 추가.

#### 효과
- OpenAI 비사용 정책을 코드 레벨에서 강제.
- 짧은 질문은 더 빠르고 간결하게, 깊은 질문은 표현 다양성을 유지하도록 자동 최적화.
- 요청 단위 처리 경로/지연시간이 노출되어 성능 디버깅 및 운영 관측성 향상.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.9.md`

## [2026-02-28]

### 초간단 질문 간결 모드 및 2카드 스프레드 최적화 (v6.3.8)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.8.md`

#### 변경 사항
- 짧은 일상형 질문(`light`)과 짧은 이진 질문(`binary` + 20자 이하)에 대해 **간결 모드**를 도입.
- 프롬프트에 스타일 가드(`styleGuard`)를 추가해 과장된 세계관/장문 서사를 억제하고 직접 결론을 강제.
- 간결 모드 응답은 `conclusion/evidence/action`을 압축 형식으로 재구성:
  - `conclusion`: 요약 + `[운명의 판정]` 한 줄 결론
  - `evidence`: 카드별 핵심 주장만 출력
  - `action`: 최대 2개 지침만 노출
- 프론트 스프레드 선택 로직 개선:
  - 짧은 이진 질문은 5카드 커리어 스프레드 대신 2카드 `choice` 스프레드 선택.

#### 효과
- "커피를 마실까 말까?" 같은 초간단 질문에서 과도하게 장황한 리딩을 방지.
- 질문 무게와 결과 톤을 맞춰 사용자 체감 품질 개선.
- 운영 중 fallback 여부와 무관하게 결과 길이 일관성 확보.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.8.md`

## [2026-02-28]

### API 진단 메타 표준화 및 fallback 이유 일관화 (v6.3.7)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/QUALITY_GATE.md`
- `docs/RELEASE_NOTES_v6.3.7.md`

#### 변경 사항
- `/api/reading` 응답에 `requestId/serverRevision/serverTimestamp` 메타 추가.
- fallback 이유 코드를 정규화하고, 모든 응답 경로에서 `meta.fallbackReason` 일관 제공.
- UI 진단 배지에서 `fallbackReason` fallback 체인(`meta -> top-level -> unavailable`) 적용.
- 결과 화면에 `serverRevision`/`requestId` 표시 추가.

#### 효과
- "fallback인데 reason이 none" 같은 진단 불일치 해소.
- 배포 버전 혼선/구버전 API 응답 혼입을 요청 단위로 추적 가능.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.7.md`

## [2026-02-28]

### 리딩 결과 API 사용 상태 가시화 (v6.3.6)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/types/tarot.ts`
- `docs/RELEASE_NOTES_v6.3.6.md`

#### 변경 사항
- 결과 화면 상단에 `apiUsed`, `fallbackUsed`, `fallbackReason` 진단 배지 추가.
- `ReadingResponse` 타입에 `apiUsed` 필드 추가.
- 진단 배지 전용 스타일 추가.

#### 효과
- API 성공/폴백 여부를 사용자 화면에서 즉시 확인 가능.
- 서버 로그 의존도를 낮추고 운영 디버깅 속도 향상.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.6.md`

## [2026-02-28]

### 개발 방식 표준화 문서 도입 (v6.3.5)

#### 변경 파일
- `docs/DEVELOPMENT_WORKFLOW.md`
- `README.md`
- `.github/pull_request_template.md`

#### 변경 사항
- AGENTS/CLAUDE 원칙을 웹 앱 실무 절차로 고정한 `Development Workflow Standard` 문서 추가.
- README에 개발 워크플로우 표준 문서 링크 추가.
- PR 템플릿에 `Scope & Success`, `Facts/Assumptions/Open Questions` 섹션 추가.

#### 효과
- 구현 전 범위/성공조건 명시가 일관화되어 요구사항 누락 감소.
- 실패 대응 루프(증상-가설-검증-수정-재검증)와 문서 동기화 규칙을 작업 표준으로 정착.
- 리뷰 단계에서 사실/가정/미해결 이슈가 분리되어 의사결정 속도 향상.

#### 상세 문서
- `docs/RELEASE_NOTES_v6.3.5.md`


## [2026-02-28]

### Anthropic 호출 안정화: 모델/타임아웃 재정렬 (v6.3.4)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `docs/SETUP_SECURITY.md`
- `docs/RELEASE_NOTES_v6.3.4.md`

#### 변경 사항
- 기본 모델을 계정 가용값인 `claude-haiku-4-5-20251001`로 조정.
- Anthropic 타임아웃을 `ANTHROPIC_TIMEOUT_MS`(기본 60000ms)로 환경변수화.
- Fetch 실패 로그에 `timeout_ms`, `timed_out`, `cause`를 포함해 원인 분리 가능성 강화.

#### 원인 결론
- `EAI_AGAIN`(DNS 불안정), 모델 404, 20초 abort가 복합적으로 fallback을 유발.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- 샘플 호출에서 `apiUsed=anthropic`, `fallbackUsed=false` 확인.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.4.md`

## [2026-02-28]

### Anthropic 실패 진단성 강화 및 모델 롤백 (v6.3.3)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `docs/RELEASE_NOTES_v6.3.3.md`

#### 변경 사항
- Anthropic 기본 모델을 `claude-3-5-haiku-20241022`로 롤백.
- Anthropic 호출에 20초 타임아웃(`AbortController`) 적용.
- 실패 로그에 `status/model/body` 또는 `message/cause`를 포함하도록 확장.

#### 효과
- fallback 원인 파악 속도 개선(권한/한도/네트워크 문제 분리).
- 운영 중 "왜 API를 못 불렀는지"를 로그만으로 추적 가능.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.3.md`

## [2026-02-28]

### Anthropic 기본 모델/토큰 상향 (v6.3.2)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `docs/RELEASE_NOTES_v6.3.2.md`

#### 변경 사항
- Anthropic 기본 모델을 `claude-haiku-4-5-20251001`로 상향.
- Anthropic 호출의 `max_tokens`를 `2500 -> 4096`으로 상향.

#### 효과
- 긴 서사(fullNarrative)와 다카드 근거 출력에서 응답 절단 위험 완화.
- 고정 스키마(JSON) 하에서 품질 안정성 강화.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.2.md`

## [2026-02-28]

### 리딩 결과 미노출 UI 핫픽스 (v6.3.1)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/RELEASE_NOTES_v6.3.1.md`

#### 변경 사항
- 상단 스프레드 렌더링의 고정 배율(0.5) 의존을 제거하고 스프레드 좌표 범위 기반 동적 스케일링 도입.
- 스프레드 영역 높이를 최소/최대 범위로 제한해 결과 영역이 화면 아래로 밀리지 않도록 수정.
- 5장/7장 등 좌표 범위가 큰 스프레드에서도 결과 리포트가 즉시 보이도록 레이아웃 안정화.

#### 원인
- 리딩 데이터는 정상 생성되었으나, 상단 카드 영역이 과도하게 확장되어 결과 패널이 가시 영역 밖으로 밀리던 프론트 레이아웃 문제.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.1.md`

## [2026-02-28]

### Claude API 리딩 품질 개선 (v6.3.0)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`

#### 변경 사항

- **`callAnthropic()` system 메시지 강화**:
    - 기존 "JSON만 반환하세요" 수준에서 카드 생생한 묘사·질문 직접 연결 특기를 명시하는 지시문으로 교체.
    - 마크다운 코드 블록·설명 텍스트·주석 일절 금지 조건 추가.

- **`buildPrompt()` 전면 재작성 — 질문 유형별 fullNarrative 지시 구체화**:
    - `questionType` 파라미터 추가 후 `isBinary` / `isLight` 플래그로 3종 `fullNarrativeGuide` 분기.
    - **binary**: 4문단 구조 강제 (오프닝 → A 카드 이미지 묘사·흐름 → B 카드 이미지 묘사·흐름 → "~쪽이 더 좋아요!" 형태 직접 추천).
    - **light**: 2~3문단, 가볍고 친근한 한 줄 결론.
    - **default**: 포지션 순서대로 카드 이미지 묘사 + 핵심 메시지 + 행동 제안.
    - `evidence[].claim` 서술형 문장 강제, `actions[]` 범용 표현 금지 지침 추가.
    - `generateReadingHybrid()` 내 `buildPrompt` 호출에 `questionType` 전달.

- **이진 질문 카드 수 2장 → 5장 (`TarotMastery.tsx`)**:
    - 5장 스프레드(현재상황 + A단기·A장기 + B단기·B장기)로 각 선택지별 단기/장기 흐름 비교 가능.

- **`extractBinaryEntities()` 카드 수 조건 확장**:
    - `cardCount !== 2` → `cardCount !== 2 && cardCount !== 5` — 5장 드로우에서도 이진 감지 유지.
    - `detectQuestionType()` 내 조건도 동일하게 `cardCount === 2 || cardCount === 5`로 수정.

- **`max_tokens` 2000 → 2500**:
    - 5장 스프레드 + 상세 `fullNarrative` 생성을 위한 토큰 여유 확보.

#### 검증
- `npm run build:web` 통과 (vite build 3.03s).

---

## [2026-02-28]

### 페르소나 기반 유지보수 체계 전면 도입 (v6.2.0)

#### 변경 사항
- **운영 기준 문서 신설 (`docs/PERSONA_CONTRACT.md`, `docs/QUALITY_GATE.md`)**:
    - 개발자/기획자/사용자 페르소나의 책임, 승인권, 우선순위를 명시.
    - 릴리스 품질 게이트(필수 응답 무결성, fallback 보장, 질문 유형 일관성) 기준을 고정.

- **리뷰 프로세스 강화 (`.github/pull_request_template.md`)**:
    - PR 단계에서 3페르소나 체크리스트를 강제해 회귀 가능성을 사전 차단.

- **리딩 API 메타 확장 (`apps/api/src/domains/reading/hybrid.js`, `apps/api/src/index.js`)**:
    - 응답에 `meta.questionType`, `meta.fallbackReason`을 추가해 운영 진단 가능성 강화.
    - 하이브리드 실패 시 서버 레벨 폴백 응답에도 동일 메타를 제공.

- **프론트 타입/계측 확장 (`apps/web/src/types/tarot.ts`, `apps/web/src/pages/TarotMastery.tsx`, `apps/web/src/services/analytics.ts`)**:
    - `ReadingResponse` 타입에 `meta` 필드를 추가.
    - 질문 제출/결과 노출/탭 전환/새 질문 클릭 이벤트를 계측하여 체감 품질 분석 기반 마련.

- **회귀 시나리오 자동 검증 도입 (`apps/api/tests/reading-persona-regression.json`, `apps/api/tests/validate-persona-regression.js`)**:
    - light/deep/relationship/career/binary/emotional 케이스를 고정 입력으로 검증.
    - `npm run test:persona --prefix apps/api`로 계약 무결성과 fallback 지속성을 자동 확인.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.2.0.md`

## [2026-02-28]

### 하이브리드 리딩 엔진 v6.1.3: 정밀 진단 시스템(Diagnostic Layer) 도입

#### 변경 사항
- **에러 원인 세분화(Error Mapping) 구현 (`apps/api/src/domains/reading/hybrid.js`)**:
    - `model_unavailable`로 통합 관리되던 에러 범주를 6가지 세부 원인으로 분리.
    - `auth_failed` (401), `model_not_found` (404), `quota_exceeded` (429), `dns_error` (EAI_AGAIN), `validation_failed` 등을 명확히 구분.
    - 리딩 실패 시 `fallbackReason` 필드를 통해 프론트엔드에 구체적인 실패 원인을 전달.

- **API 호출부 구조 개선**:
    - `callAnthropic`, `callOpenAI` 함수가 단순 결과(null)가 아닌 `{ report, reason }` 객체를 반환하도록 인터페이스 변경.
    - HTTP 상태 코드에 따른 동적 에러 맵핑 로직(`mapErrorReason`) 추가.

- **서버 로그 강화**:
    - API 에러 발생 시 HTTP 상태 코드와 서버 응답 본문(Error Body)을 상세히 출력하여 Vercel 대시보드에서의 디버깅 편의성 증대.

#### 검증
- 존재하지 않는 모델명 호출 시 `model_not_found` 반환 확인.
- 네트워크 단절 시 `dns_error` 또는 `network_error` 감지 확인.

## [2026-02-28]

### 하이브리드 리딩 엔진 v6.1.2: 초안정성 강화 및 Vercel 최적화

#### 변경 사항
- **무정지 리딩 시스템(Ultimate Fallback) 구축 (`apps/api/src/domains/reading/hybrid.js`)**:
    - Anthropic/OpenAI API 호출 실패, 타임아웃, 또는 유효성 검증 실패 시 즉시 로컬 엔진(`v3.js`)으로 전환되는 3중 안전장치 구현.
    - 이제 API 서버나 네트워크에 문제가 생겨도 사용자에게는 끊김 없는 리딩 서비스 제공 가능.

- **정밀 디버깅 로그 시스템 도입**:
    - API 호출 실패 시 HTTP 상태 코드 및 상세 에러 메시지(Anthropic/OpenAI 측 응답)를 서버 로그에 기록하도록 개선.
    - Vercel 로그 대시보드에서 환경 변수 설정 오류나 할당량 초과 문제를 즉시 파악 가능.

- **Vercel 서버리스 환경 최적화 (`apps/api/src/index.js`)**:
    - Express 서버를 Vercel 서버리스 함수(Serverless Functions) 규격에 맞게 조정 (`export default app`).
    - 프로덕션 환경에서는 `app.listen`을 비활성화하여 리소스 낭비 방지 및 콜드 스타트 개선.

- **네트워크 탄력성 보강**:
    - API 호출부 전역에 `try-catch` 예외 처리를 적용하여 예기치 않은 런타임 에러로 인한 서버 다운 방지.

#### 검증
- API Key 부재 환경에서 로컬 엔진 자동 전환 확인.
- Vercel 배포 환경 호환성 검증.

## [2026-02-28]

### 하이브리드 리딩 엔진 v6.1.1: 문서 체계 혁신 및 보안 강화

#### 변경 사항
- **문서 아키텍처 재구축 (`docs/`)**:
    - `README.md`: 프로젝트 전체 조감도 및 빠른 시작 가이드로 전면 개편.
    - `docs/ARCHITECTURE.md`: 다층 엔진 구조(Claude/GPT/Legacy) 및 서사 생성 프로세스 상세 기록.
    - `docs/FEATURES.md`: 양자택일 분석, 질문 무게 감지, 동적 스프레드 시스템 명세화.
    - `docs/SETUP_SECURITY.md`: API 키 관리 지침 및 환경 변수 설정 가이드 신설.
    - 레거시 문서(`TAROT_LIBRARY_UPDATE.md`) 제거 및 정보 통합.

- **보안 프로세스 정교화**:
    - `.env` 파일의 Git 추적 방지를 위한 `.gitignore` 설정 재확인.
    - 커밋 프로세스에서 민감 정보(API Key) 포함 여부를 강제 점검하는 보안 워크플로우 적용.

#### 검증
- 모든 문서 링크 및 마크다운 문법 확인.
- `.env` 파일의 추적 제외 상태(Untracked) 재검증.

## [2026-02-28]

### 하이브리드 리딩 엔진 v6.1: 클로드(Anthropic) 서사 혁신

#### 변경 사항
- **Anthropic Claude 3.5 Haiku 엔진 연동 (`apps/api/src/domains/reading/hybrid.js`)**:
    - 문학적이고 공감적인 표현이 뛰어난 Claude 모델을 최우선 리딩 엔진으로 도입.
    - `ANTHROPIC_API_KEY` 환경 변수 기반의 안전한 API 통신 구조 구축.
    - 폴백 체인 강화: Anthropic (1순위) -> OpenAI (2순위) -> Legacy/Deterministic (3순위).

- **지능형 서사 생성(fullNarrative) 구현**:
    - 기존의 분절된 텍스트 합치기 방식에서 탈피하여, AI가 리딩 전체를 하나의 완결된 이야기로 써 내려가도록 개선.
    - 질문의 무게(가벼운 일상 질문 vs 진중한 고민)를 감지하여 어휘의 톤앤매너를 자동 조절하는 '지능형 톤 필터' 적용.
    - 조사 불일치 및 문장 연결 비문 문제를 근본적으로 해결.

- **양자택일(Binary) 분석 고도화**:
    - "할까 말까", "A vs B" 등 한국어 특유의 선택형 질문 패턴 인식률 향상.
    - 두 카드를 별개의 선택지로 완벽하게 대조 분석하여 명확한 선택의 근거를 제시.

- **인프라 및 보안 강화**:
    - `.env` 파일 명칭 및 위치 최적화 (`.env.txt` -> `.env`).
    - API 키 유출 방지를 위한 `.gitignore` 보안 설정 강화.

#### 검증
- `apps/api/src/domains/reading/hybrid.js` 코드 무결성 확인.
- Anthropic/OpenAI 다중 모델 지원 구조 검증.

## [2026-02-28]

### 하이브리드 리딩 품질 복원 패치 (v6.0.2)

#### 변경 사항
- **프론트엔드 UI 감성 정돈 (`apps/web/src/pages/TarotMastery.tsx`, `TarotMastery.module.css`)**:
    - 리포트 탭에서 "품질 지표", "신뢰도", "근거 이탈" 등 기계적인 기술 용어 노출을 전면 제거.
    - 리포트 본문의 서사성을 강화하기 위해 `v3.js`의 풍부한 텍스트를 최상단에 배치.
    - 하이브리드 요약문을 "사서의 통찰" 박스로 재구성하고, "운명의 판정"을 긍정/신중 배지 형태로 시각화.
    - 카드별 중복 근거 리스트를 제거하여 정보 과잉 해소.

- **리딩 엔진 페르소나 강화 (`apps/api/src/domains/reading/hybrid.js`)**:
    - AI 프롬프트를 "아르카나 도서관 사서" 페르소나에 맞춰 전면 수정하여 더 따뜻하고 통찰력 있는 문장 생성을 유도.
    - 폴백(Fallback) 서사 생성기(`toLegacyResponse`)와 판정 톤(`verdictTone`)을 감성적인 어조로 순화.
    - 기술적인 `verdict`, `rationale` 용어를 운명의 흐름과 기운에 대한 설명으로 대체.

#### 검증
- `vite build` 성공 (프론트엔드).
- `apps/api` 무결성 확인.
- UI/UX 테마 일관성 확인.

## [2026-02-28]

### 하이브리드 리딩 품질 복원 패치 (v6.0.1)

#### 변경 사항
- **기본 리딩 품질 복원 (`apps/api/src/domains/reading/hybrid.js`)**:
    - 하이브리드 응답에서도 `conclusion/evidence/action`은 기존 `generateReadingV3` 결과를 기본으로 사용하도록 변경.
    - API 키 미설정/모델 미사용 환경에서도 기존 서사형 리딩 품질을 유지.
    - 구조화 리포트(`report`)는 본문 대체가 아닌 근거 보강 계층으로 유지.

- **문장 품질 보정 (`apps/api/src/domains/reading/hybrid.js`)**:
    - deterministic 근거 문장에서 `"입니다.의 흐름"` 같은 비문이 발생하지 않도록 `claim` 생성 로직을 정리.
    - 카드 요약문 말미 마침표를 정규화해 자연스러운 문장 출력 보장.

- **리포트 탭 렌더링 우선순위 조정 (`apps/web/src/pages/TarotMastery.tsx`)**:
    - 마스터 리포트 본문은 다시 `reading.conclusion`(기존 고품질 서사)을 우선 출력.
    - `reading.report.summary`는 `근거 요약`으로 분리해 보조 정보로 제시.
    - 실행 지침은 구조화 보조 액션 대신 기존 `reading.action`을 기본 출력하도록 복원.

#### 검증
- `vite build` 성공.
- `POST /api/reading` 응답 검증:
    - 레거시 서사 본문(`conclusion`) 유지 확인
    - 구조화 리포트(`report/quality`) 동시 제공 확인
    - fallback 환경에서도 품질 저하 없이 동작 확인

### 하이브리드 리딩 엔진 도입 (Reading Hybrid v6.0)

#### 변경 사항
- **하이브리드 엔진 신규 추가 (`apps/api/src/domains/reading/hybrid.js`)**:
    - 규칙 기반 카드 팩트 추출 + 구조화 리포트 생성 + 검증(Consistency) 계층을 구현.
    - OpenAI API 키가 있을 때는 모델 기반 구조화 리포트를 시도하고, 실패 시 deterministic 결과로 자동 폴백.
    - `unsupportedClaimCount`, `consistencyScore`, `regenerationCount`를 산출하여 품질을 수치화.
    - `A vs B` 및 `A 할까 B 할까` 계열 질문의 엔티티 추출을 보강하여 양자택일 해석 정확도 개선.

- **리딩 API 계약 확장 (`apps/api/src/index.js`)**:
    - `POST /api/reading`가 `mode`, `spreadId`, `sessionContext`, `structure`, `debug` 파라미터를 지원.
    - `mode=legacy`일 때 기존 v3 서사 응답 유지, 기본값은 `hybrid`.
    - 하이브리드 실패 시 서버 레벨에서 레거시 폴백 응답 제공.
    - `POST /api/reading/ab` 신규 추가: 동일 입력으로 legacy/hybrid 결과를 병렬 비교 가능.

- **프론트 타입/서비스 확장 (`apps/web/src/types/tarot.ts`, `apps/web/src/services/tarotService.ts`)**:
    - `ReadingResponse`에 `report`, `quality`, `fallbackUsed`, `mode` 필드 추가.
    - `getReading` 호출 옵션 확장(모드/구조/세션 컨텍스트/디버그).

- **TarotMastery UI 개편 (`apps/web/src/pages/TarotMastery.tsx`)**:
    - 요청 시 하이브리드 모드 및 세션 최근 질문 컨텍스트를 전달.
    - 결과 화면을 근거 중심으로 개선:
        - 핵심 요약/판정
        - 카드별 근거(claim/rationale/caution)
        - 반례/주의점
        - 품질 지표(consistency, unsupported claims, regeneration)
    - 구조화 리포트가 없는 경우 기존 결론/지침 필드를 사용하도록 하위호환 유지.

#### 검증
- `vite build` 성공으로 프론트 번들 안정성 확인.
- 하이브리드 엔진 모듈 로드 및 샘플 질문 실행으로 런타임 정상 동작 확인.
- API 키 미설정 환경에서 deterministic fallback 경로 정상 동작 확인.

### Vercel 배포 실패 해결: Web 앱 설정 파일 복구

#### 변경 사항
- **Vite 및 TypeScript 설정 파일 생성 (`apps/web/`)**:
    - **`vite.config.ts`**: `@vitejs/plugin-react`를 추가하여 JSX/TSX 문법 해석을 활성화하고 API 프록시 설정을 구성함.
    - **`tsconfig.json`**: React-Vite 환경에 최적화된 TypeScript 컴파일 옵션을 설정하여 타입 체크 및 빌드 안정성 확보.
    - **`tsconfig.node.json`**: Node.js 기반의 설정 파일(`vite.config.ts` 등)에 대한 별도의 TS 환경 분리.
- **빌드 파이프라인 정상화**:
    - `vite build` 실행 시 발생하던 파싱 에러(Unexpected token)를 해결하여 Vercel 배포가 가능하도록 조치함.

### 양자택일(Binary Choice) 인지 및 정밀도 고도화

#### 변경 사항
- **프런트엔드 스프레드 자동 선택 로직 개선 (`TarotMastery.tsx`)**:
    - 질문 내 양자택일 키워드(`할까`, `아니면`, `vs` 등) 감지 로직 추가.
    - 선택형 질문 시 자동으로 2장(양자택일) 스프레드를 선택하도록 강제하여, 시스템이 병렬적 선택 상황임을 정확히 인지하도록 수정.
- **백엔드 객체 추출(Entity Extraction) 정밀도 향상 (`v3.js`)**:
    - **컨텍스트 분리 로직**: "집으로 걸어갈 때 버스 탈까 걸어갈까?"와 같은 문장에서 앞부분의 상황 설명('집으로 걸어갈 때')을 필터링하고 핵심 객체('버스', '걸어')만 추출하는 2단계 파싱 알고리즘 적용.
    - **동사 유연성 확보**: `할까`, `갈까`, `탈까` 등 다양한 선택형 동사를 지원하도록 정규식 확장.
- **병렬 리딩 서사 안정화**:
    - 질문 의도와 스프레드 개수가 일치하게 됨에 따라, 양자택일 시 시간적 순서(과거-현재-미래)가 아닌 대조적 병렬 리딩이 확실하게 출력되도록 보장.

### 지능형 상황 인지 리딩 엔진 도입 (Reading V3 - Context-Aware V5.2)

#### 변경 사항
- **질문 객체 추출(Entity Extraction) 로직 구현**:
    - "A 아니면 B", "A 할까 B 할까" 등의 양자택일 질문에서 핵심 객체(Entity)를 자동으로 추출하는 NLP-lite 정규식 적용.
- **질문 무게(Gravity) 감지 및 페르소나 톤 조절**:
    - 일상적 키워드 및 질문 길이를 바탕으로 질문의 무게를 분류하여 페르소나의 톤을 자동 조절.
- **상황적 의미 합성(Contextual Meaning Synthesis)**:
    - 카드 고유의 원소 상징을 추출된 질문 객체와 동적으로 결합하여 도메인 맞춤형 리딩 생성.

### AI 리딩 엔진 고도화 (Reading V3 - Narrator V5.1)

#### 변경 사항
- **서사적 위치(Position) 설명 개선**:
    - 실제 스프레드 위치 라벨을 문장에 자연스럽게 녹여내도록 수정.
- **문법적 자연스러움 강화**:
    - **조사 처리 헬퍼(`getJosa`) 확장**: '을/를', '은/는' 처리를 추가.
    - **조언 문구 연결 최적화**: 명령형 조언과 서사 사이의 문법적 단절 해결.

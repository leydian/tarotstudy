# 세션 인수인계 상세 (2026-02-23)

## 1) 요약
- 원카드/일별 질문 의도 분기를 보정했습니다.
- 카드 의미와 출력 문체의 정합성을 맞췄습니다.
- 학습 리더 코치를 행동 코칭에서 타로 해석 복기 중심으로 전환했습니다.
- 일별 개선 패턴을 전 스프레드로 확장했습니다.

## 2) 원카드/일별 분기 보정

### 2.1 질문 의도 분기
- 변경 파일:
  - `apps/api/src/index.js`
  - `apps/api/src/content.js`
- 핵심:
  - `오늘 운세는?`를 yes/no 질문에서 제외
  - 정보형 운세 질문(`운세/흐름/해석`)을 daily intent로 분리
  - 결론 문체를 `진행/가능` 중심에서 `흐름/운영` 중심으로 조정

### 2.2 카드 의미 정합성
- 변경 파일:
  - `apps/api/src/data/cards.js`
  - `apps/api/src/content.js`
- 핵심 보정:
  - `컵 4`: 감정 점검/권태/거리두기
  - `소드 8`: 제약/불안/관점 전환
  - `소드 킹`: 판단/원칙/명료함

## 3) 학습 리더 코치 관점 전환
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 핵심:
  - 행동 코칭 문장을 카드 해석 복기 중심 문장으로 전환
  - `카드 키워드/정역방향/포지션` 근거 점검 문구 강화
  - 라벨 중복 제거 및 `리딩 검증` 포맷 통일

## 4) 일별 품질 패턴의 전 스프레드 확장
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
- 적용 스프레드:
  - `weekly-fortune`
  - `monthly-fortune`
  - `three-card`
  - `choice-a-b`
  - `celtic-cross`
- 적용 함수:
  - `buildSpreadConsultingGuide()`
  - `buildOrientationCounselLine()`
  - `buildKeywordCounselLine()`
  - `buildCoreContextLine()`
  - `buildSpreadCoreLead()`
  - `buildLearningCoachFrame()`

## 5) 벤치마킹 반영 기준
- 채택:
  - 포지션 기반 스토리 연결
  - 카드 근거에서 실행 문장으로 이어지는 흐름
  - 종합 리딩 한 줄 테마
- 배제:
  - 과장된 감탄
  - 운명 단정/과신 표현
  - 과잉 친밀 문체

## 6) 푸시/운영 이슈
- 이슈:
  - OAuth 토큰 `workflow` scope 부재로 `main` 푸시 거절
- 조치:
  - 워크플로우 커밋 제외 브랜치 `publish/no-workflow-v2` 생성/푸시
  - PR 링크:
    - `https://github.com/leydian/tarotstudy/pull/new/publish/no-workflow-v2`

## 7) 검증 로그
- `npm run test:api` 통과
- `npm run build:web` 통과
- `node --check apps/api/src/content.js` 통과
- `node --check apps/api/src/index.js` 통과

## 8) 관련 커밋
- `666321c` Improve relationship-recovery summary variation by context and risk theme
- `5180d76` Refine one-card repair tone and learning coach phrasing
- `8e30e75` Shift learning coach output to tarot interpretation review focus
- `3399153` Fix one-card daily-fortune intent and yes/no question detection
- `b254feb` Refine one-card daily reading tone, card semantics, and coach labels
- `bcbb6e7` Refine daily-fortune reading consistency and learning coach structure
- `f377bf9` Extend daily reading quality patterns across spreads and add theme summaries

## 9) 2026-02-23 추가 후속 (UI/요약/학습코치 실전형 개편)

### 9.1 스프레드 카드 가독성 및 토글 UX 개선
- 변경 파일:
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/styles.css`
- 핵심:
  - 전 스프레드 카드 이미지 썸네일 크기 확대
  - 스프레드별 시각 프리셋(`scale/rowHeight/minColWidth`) 적용
  - `스프레드 리딩 결과` / `스프레드 가이드·복기` 토글 도입
  - 스프레드/변형 변경 시 토글 뷰를 리딩 결과 탭으로 자동 초기화

### 9.2 월별/주별/관계회복 요약 품질 보정
- 변경 파일:
  - `apps/api/src/index.js`
- 핵심:
  - `monthly-fortune` 전용 요약기 추가
    - `총평`
    - `주차 흐름`
    - `월-주 연결`
    - `실행 가이드`
    - `한 줄 테마`
  - 관계 질문은 `서사 요약` 이후 `판정`이 나오도록 순서 조정
  - `우세` 판정 보수화:
    - 고위험 역방향/리스크 누적 시 `조건부`로 다운그레이드
  - 근거 문구 다양화:
    - 포지션 중복 완화
    - 관계 질문에서 기계적 `축` 표현을 대화/오해/속도 조절 표현으로 완화

### 9.3 양자택일 요약을 질문 형태 기반으로 분기
- 변경 파일:
  - `apps/api/src/index.js`
- 핵심:
  - 명시적 A/B 질문: 비교형 출력 유지
  - 단일 판단 질문: A/B 레이블 노출 없이 단일판단형 출력
  - 관계 질문 비교 축 교정:
    - `감정 소모·대화 안정성·오해 가능성·지속 가능성`
  - 근거 우선순위 조정:
    - `현재 상황 + 결과 포지션` 우선
  - 문장 정리:
    - 조사 오류 방지
    - 물음표 앞 공백 정리

### 9.4 학습 리더 코치 내역 레벨별 실전형 차등 강화
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 핵심:
  - 입문:
    - 카드 근거 1개 + 행동 1개 + 당일 복기 중심
  - 중급:
    - 가설/반례/검증 지표/오차 분류 중심
  - 코치 문장 생성 함수 레벨별 분기 강화:
    - `buildLearningCoachOpening`
    - `buildLearningCoachFrame`
    - `buildLearningCoachReview`
  - 학습 요약 패널 간결화:
    - `오늘 할 일`
    - `복기 기준`
    - `다음 리딩에서 바꿀 점 1개`

### 9.5 검증 로그 (추가)
- `node --check apps/api/src/index.js` 통과
- `node --check apps/api/src/content.js` 통과
- `npm run test:api` 통과
- `npm run build:web` 통과

### 9.6 관련 커밋 (추가)
- `9021afe` Adjust spread card image sizing across all spread layouts
- `539995c` Add toggle view for spread reading results and guide sections
- `a30569a` Improve monthly/weekly fortune summary consistency and verdict logic
- `fb90f37` Refine relationship-reading tone and stabilize spread view UX
- `edaf90a` Improve choice spread branching and simplify learning digest output
- `ba9e199` Differentiate beginner/intermediate coaching with practical execution flows

## 10) 2026-02-23 추가 후속 2 (카드 도감 리더양성/코스확장/QA 마감)

### 10.1 카드 도감 입문·중급 문체를 리더 양성 관점으로 재정렬
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/data/cards.js`
- 핵심:
  - `입문` 카드 도감 문구를 내담자 행동 코칭형에서 리더 해석 훈련형으로 전환
    - 해석 결론/근거 분리
    - 포지션/카드/맥락 근거 체크
    - 적중/오차 복기 문장 강화
  - `중급` 카드 도감 기본 설명도 동일 관점으로 재작성
    - "오늘 행동 지시" 중심 문장을 "리더 해석 기준" 중심으로 교체
  - `중급` fallback/generated 섹션은 5줄 이상 정책 유지 + 리더 관점 문구 통일

### 10.2 코스 체계 대폭 확장(2 -> 14) 및 단계 세분화
- 변경 파일:
  - `apps/api/src/data/courses.js`
  - `apps/web/src/pages/CoursesPage.tsx`
  - `apps/web/src/types.ts`
- 핵심:
  - 코스 수를 14개로 확장
  - 학습 단계를 아래 7개로 세분화
    - `기초 입문`
    - `입문 실전`
    - `입문 심화`
    - `중급 코어`
    - `중급 심화`
    - `고급 운영`
    - `전문가 랩`
  - 코스 페이지에서 단계별 개수/현황을 노출하도록 UI 갱신

### 10.3 카드 상세(도감) 가독성 보강
- 변경 파일:
  - `apps/web/src/pages/CardDetailPage.tsx`
  - `apps/web/src/styles.css`
- 핵심:
  - 해설 문장을 번호형(`1.` `2.` …)으로 렌더링
  - 생성 섹션을 박스 단위로 분리해 스캔성 향상
  - 행간/마진 보정으로 장문 읽기 피로 완화

### 10.4 품질 게이트 실패 원인 보정 및 최종 통과
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
- 핵심:
  - `qa:learning-leader`
    - 실패 원인: 문장 길이 과다(5문장 초과)
    - 조치: 학습 리더 문장 압축(`compactLearningPoint`) + 질문부호로 인한 문장 분리 오탐 교정
  - `qa:yearly-fortune`
    - 실패 원인: 커리어 타이밍 문맥 오탐/닫는 문단 규칙 누락
    - 조치: `isCareerTimingContext()` 추가, 타이밍 문맥 판정 강화, 닫는 문단 규칙 정렬
- 최종 검증:
  - `npm run lint` 통과
  - `npm run typecheck:web` 통과
  - `npm run test:web` 통과
  - `npm run test:api` 통과

## 11) 2026-02-23 추가 후속 3 (운세 자연어 고도화 + 리딩 UI 전면 가독성 개선)

### 11.1 월간/전스프레드 문체를 일상 언어로 통일
- 변경 파일:
  - `apps/api/src/index.js`
- 핵심:
  - 월간 요약의 `실행 탄력`, `~축` 중심 문구를 일상어로 교체
    - 예: `~축에서 실행 탄력이 확인됨` -> `~쪽으로 움직일 힘이 붙는 흐름`
  - 전 스프레드 공통 후처리에 일상어 정규화 단계(`normalizeEverydaySummaryTone`)를 추가
    - `중심축/결과축/장애축` 등 기술어를 자연어로 완화
  - 공통 판정 블록(`buildSpreadDecisionBlock`)을 전면 개선
    - 판정 서두를 스프레드/질문 맥락 맞춤으로 생성
    - 근거 문장을 포지션 맥락형 자연어로 재구성
  - 양자택일(`choice-a-b`)은 질문 맥락(특히 이직/커리어)을 반영하도록 강화
    - 단기 반응보다 `3개월 유지 가능성` 기준을 우선 안내
    - 결과 근거에 `통근/생활비/업무강도` 같은 실전 점검 축 반영
  - 월간에서 중복되는 1차 판정 문장을 총평에서 제거해 충돌 방지

### 11.2 종합 학습 내역/코치 문장 품질 개선
- 변경 파일:
  - `apps/web/src/pages/spreads-helpers.ts`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 핵심:
  - 종합 학습 내역 생성 로직을 카드 기반 실전형으로 재구성
    - `핵심 카드/실행 카드/주의 카드`를 선택해 실사용 문장 생성
  - 메타/번역투 표현 제거
    - `monthly-fortune`, `질문 맥락`, `1차 이유` 등 노출 문구 치환
  - 학습 코치 요약 문단을 자연스러운 일상어로 재작성
    - 과도한 지시형/기계형 문장 축소

### 11.3 강조(하이라이트) 로직을 중요도 단계형으로 전환
- 변경 파일:
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/styles/spreads.css`
- 핵심:
  - 단순 키워드 난사형 강조 -> 문맥 우선 강조로 전환
  - 3단계 강조 도입
    - `high`: 형광펜 + 강한 굵기
    - `mid`: 굵기 + 밑줄
    - `low`: 색상 중심 약강조
  - 문단별 강조 수를 단계별 제한해 과밀 강조 방지
  - stopword(흐름/신호/기준 등) 과강조 억제

### 11.4 리딩 결과 UI를 전 스프레드/개별 카드까지 통일
- 변경 파일:
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/styles/spreads.css`
  - `apps/web/src/pages/spreads-helpers.ts`
- 핵심:
  - 월간에 먼저 도입한 카드형 자연어 레이아웃을 전 스프레드로 확장
    - `UnifiedSummaryView`, `NaturalFlowView` 공통 렌더링 도입
  - 개별 카드의 `타로 리더 리딩`/`학습 코치 요약`도 동일한 카드형 흐름으로 통일
  - 월간 파서(`parseMonthlySummary`) 추가로 주차별 카드 렌더 안정화
    - 설명 문장이 주차 카드에 섞이는 문제 제거
  - 인사이트 블록 위치를 상단으로 이동
    - `핵심 실행/중간 점검/주의점`이 종합 리딩보다 먼저 보이도록 조정

### 11.5 스프레드 보드 가독성 개선(카드 최소크기 + 자동 배치)
- 변경 파일:
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/styles/spreads.css`
- 핵심:
  - 스프레드 밀도에 따라 메타 배치를 자동 전환
    - 고밀도(열 수 5+)는 상하 배치
    - 저밀도는 좌우 배치
  - 카드 최소 크기 보장을 위해 preset 보정 및 가로 스크롤 허용
  - 텍스트 깨짐(세로 낙하/글자 분절) 완화
  - 최종 요청 반영: 카드형 문단은 좌우 분할 없이 위아래 단일열 고정

### 11.6 검증 로그 (추가)
- `node scripts/summary-regression-check.mjs` 통과 (최종 `18/18`)
- `npm --workspace apps/web run build` 반복 실행 기준 모두 통과

### 11.7 관련 커밋 (추가)
- `e451037` Refine monthly fortune summary wording and flow
- `c01ce51` Make learning digest beginner-friendly and easier to scan
- `a72867d` Unify spread summaries with everyday Korean tone
- `315acc3` Replace monthly evidence jargon with everyday wording
- `5fc8345` Naturalize coach summary copy and learning digest phrasing
- `f4882bc` Add tiered highlight emphasis with context-aware priorities
- `23504d5` Refine monthly summary layout and clean week card grouping
- `93eaf78` Unify reading layouts and stack flow cards vertically
- `c401c4f` Move reading insights above summary panel
- `8c2e8ca` Improve spread readability with adaptive meta layout
- `8b8d34f` Enhance spread decision narratives with context-aware detail
  - `npm run qa:learning-leader` 통과
  - `npm run qa:relationship-recovery` 통과
  - `npm run qa:yearly-fortune` 통과
  - `npm run verify:quality` 통과

### 10.5 운영 정리(문서/산출물 정책)
- 변경 파일:
  - `docs/handoff/INDEX.md`
  - `.gitignore`
- 핵심:
  - 인수인계 인덱스 최신일 동기화
  - `tmp` QA 산출물 ignore 정책 추가

### 10.6 관련 커밋 (추가)
- `cf7642a` Refocus intermediate guide text for tarot-reader training
- `45ffe13` Expand course tracks and harden card-guide quality gates
- `b97a0f6` Refine beginner card guide readability and update handoff docs

## 11) 2026-02-23 추가 후속 3 (퀴즈-레슨 정렬 + 전 레슨 스토리텔링 전환)

### 11.1 퀴즈 아키타입 다각화 + 문제은행 1,000+ 구축
- 변경 파일:
  - `apps/api/src/quiz.js`
  - `apps/api/test/quiz-bank.test.js`
- 핵심:
  - 단일 키워드형 출제에서 다중 아키타입 출제로 확장
    - 키워드(대표/보조/조합)
    - 아르카나 분류
    - 수트/랭크
    - 정방향/역방향 행동
    - 관계/커리어/학습 맥락
    - 근거 구조/실행 문장
  - 카드 전역 기준 문제은행 1,000+ 구성
  - 출제 시 아키타입 혼합도를 유지하도록 다변화 로직 적용

### 11.2 레슨 범위와 퀴즈 범위를 lessonId 기반으로 정렬
- 변경 파일:
  - `apps/api/src/quiz.js`
  - `apps/api/src/index.js`
  - `apps/api/test/quiz-bank.test.js`
- 핵심:
  - `lessonId` prefix별 허용 아키타입 매핑 도입
    - `fz-*`: 정/역/기본 키워드/실행 문장 중심
    - `ubs-*`: 수트/랭크 중심
    - `icb-*`: 관계/커리어/학습 맥락 중심
  - `/api/quiz/generate`에서 `lessonMeta`를 전달해 레슨 정렬 출제 활성화
  - 정렬 회귀 테스트 추가(`fz-1` 케이스)

### 11.3 레슨 콘텐츠 전면 실전형(스토리텔링 우선) 전환
- 변경 파일:
  - `apps/api/src/data/courses.js`
  - `apps/web/src/pages/LessonPage.tsx`
  - `apps/web/src/types.ts`
- 핵심:
  - 전 레슨(42개)에 대해 `lessonId`별 전용 스토리 블루프린트 적용
    - `character`, `situation`, `question`, `action`, `review`
  - 본문을 공통 이론형에서 장면형 실전 스토리로 변경
    - 시작 → 질문 → 카드선택 → 결론 → 근거 → 실행 → 복기
  - `한 번에 읽는 실전 스크립트`를 미션형으로 고정
  - `예시 리딩`에 스토리텔링 스크립트 + A/B/C 실전 스크립트 통합
  - 비어 있는 섹션은 UI에서 렌더링 생략

### 11.4 검증 로그 (추가)
- `node --check apps/api/src/quiz.js` 통과
- `node --check apps/api/src/index.js` 통과
- `node --check apps/api/src/data/courses.js` 통과
- `npm run test:api` 통과
- `npm run typecheck:web` 통과
- `npm run build:web` 통과

### 11.5 관련 커밋 (추가)
- `6cd8112` Diversify quiz archetypes and add 1000+ question bank coverage
- `3e8e8a0` Align quiz archetypes to lesson scope and add story-driven lesson flows
- `2ffd296` Refine lessons into mission-driven scripts and verify quiz scope alignment

## 12) 2026-02-23 추가 후속 4 (소설 선배치 + 소설/레슨 분리 UI)

### 12.1 전 레슨 소설 도입(`storyNovel`)
- 변경 파일:
  - `apps/api/src/data/courses.js`
- 핵심:
  - `lessonId`별 스토리 블루프린트를 사용해 전 레슨에 소설형 도입 문단을 생성
  - 소설 문단 구성:
    - 시작 상황
    - 질문 고정
    - 카드 선택
    - 결론/근거
    - 실행 고정
    - 복기 마무리

### 12.2 레슨 화면 패널 분리(가독성 강화)
- 변경 파일:
  - `apps/web/src/pages/LessonPage.tsx`
  - `apps/web/src/types.ts`
- 핵심:
  - `레슨 소설` 패널을 최상단 별도 카드로 분리
  - 기존 학습 요소(`한 번에 읽는 실전 스크립트`, 목표, 진행 순서 등)는 별도 패널에서 유지
  - 타입에 `storyNovel` 필드 추가

### 12.3 검증 로그 (추가)
- `node --check apps/api/src/data/courses.js` 통과
- `npm run test:api` 통과
- `npm run typecheck:web` 통과
- `npm run build:web` 통과

## 13) 2026-02-23 추가 후속 5 (스타일 분리/QA 갱신/운영 안정화)

### 13.1 웹 스타일 구조 분리 + 공통 컴포넌트 도입
- 변경 파일:
  - `apps/web/src/styles.css`
  - `apps/web/src/styles/theme.css`
  - `apps/web/src/styles/layout.css`
  - `apps/web/src/styles/spreads.css`
  - `apps/web/src/components/PageHero.tsx`
  - `apps/web/src/components/KpiRow.tsx`
  - `apps/web/src/pages/HomePage.tsx`
  - `apps/web/src/pages/CoursesPage.tsx`
  - `apps/web/src/pages/DashboardPage.tsx`
- 핵심:
  - 단일 대형 스타일 파일을 `theme/layout/spreads` 3개로 분리
  - 홈/코스/대시보드의 히어로/KPI 블록을 공통 컴포넌트로 추출
  - 레이아웃 중복 렌더링을 줄여 화면 수정 시 변경 지점을 단순화

### 13.2 QA 케이스셋 자동 갱신 체계
- 변경 파일:
  - `scripts/refresh-qa-cases.mjs`
  - `scripts/learning-leader-eval-set.json`
  - `scripts/yearly-fortune-regression-cases.json`
  - `scripts/qa-cases-registry.json`
  - `scripts/run-learning-leader-qa.mjs`
  - `package.json`
- 핵심:
  - 질문 뱅크를 기반으로 학습 리더/연간운세 회귀 케이스를 자동 생성
  - 실행 명령 추가: `npm run qa:refresh-cases`
  - QA 실행기에서 케이스 갱신을 옵션으로 연동할 수 있게 확장

### 13.3 텔레메트리 저장 로테이션 + 문서 무결성 체크 자동화
- 변경 파일:
  - `apps/api/src/telemetry.js`
  - `apps/api/test/telemetry-store.test.js`
  - `scripts/check-handoff-docs.mjs`
  - `package.json`
  - `README.md`
  - `docs/handoff/details/docs-ops-structure-2026-02-22.md`
- 핵심:
  - 텔레메트리 저장소에 크기/기간 기반 로테이션, 보관 개수 제한 정책 추가
  - 핸드오프 문서 계층(메인/인덱스/상세) 필수 링크/표기 검사 스크립트 추가
  - 실행 명령 추가: `npm run docs:check-handoff`
  - `verify:quality`에 문서 무결성 검사를 포함해 운영 누락을 조기 탐지

### 13.4 스프레드 복기 히스토리 가독성 개선
- 변경 파일:
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/styles/spreads.css`
  - `apps/web/src/styles/layout.css`
- 핵심:
  - 기록 기본 노출을 요약 중심으로 전환하고 상세는 토글
  - 판정(맞음/부분/다름/미복기) 필터를 추가해 복기 큐 탐색 속도 개선
  - 긴 요약/코칭 문장을 축약해 스캔성 강화

### 13.5 검증 로그 (추가)
- `npm run qa:refresh-cases` 통과
- `npm run docs:check-handoff` 통과
- `npm run typecheck:web` 통과
- `npm run test:api` 통과
- `npm run build:web` 통과
- `npm run lint` 통과

### 13.6 관련 커밋 (추가)
- `a415cbb` Refactor UI/docs ops and improve review history workflow

## 14) 2026-02-23 추가 후속 6 (리드모델 API + 퍼널 기반 화면 연동)

### 14.1 학습 리드모델 모듈/엔드포인트 추가
- 변경 파일:
  - `apps/api/src/learning-read-models.js`
  - `apps/api/src/index.js`
  - `apps/api/src/telemetry.js`
  - `apps/api/test/learning-read-models.test.js`
- 핵심:
  - 사용자 행동 루프를 위한 리드모델 빌더 추가
    - `buildNextActions`: 다음 레슨/저점수 복습/미복기/휴면 재시작 액션 생성
    - `buildReviewInbox`: 미복기 기록 인박스 생성
    - `buildLearningFunnel`: 활성→레슨→퀴즈→드로우→복기 전환율 계산
  - API 추가:
    - `GET /api/learning/next-actions?userId=...`
    - `GET /api/reviews/inbox?userId=...&spreadId=...&limit=...`
    - `GET /api/analytics/funnel?window=7d|30d`
    - `POST /api/events/batch`

### 14.2 프론트 타입/API/화면 연동
- 변경 파일:
  - `apps/web/src/types.ts`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/state/progress.ts`
  - `apps/web/src/pages/HomePage.tsx`
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/pages/DashboardPage.tsx`
- 핵심:
  - 신규 응답 타입(`NextActions`, `ReviewInbox`, `LearningFunnel`) 추가
  - 홈에서 서버 `next-actions` 노출
  - 스프레드에서 서버 `review inbox` 노출
  - 대시보드에 7일 퍼널 카드 노출
  - 페이지 조회/드로우/복기 이벤트를 배치 전송해 퍼널 집계 정합성 강화

### 14.3 효과
- 사용자:
  - “다음에 무엇을 해야 하는지”가 서버 기준으로 일관되게 노출되어 학습 완주 루프가 명확해짐
  - 미복기 인박스 노출로 복기 누락이 줄고 재방문 동기가 강화됨
- 기획:
  - 단일 KPI 외에 단계별 전환율(퍼널) 기반 병목 탐지가 가능해짐
- 개발/운영:
  - 프론트 계산 의존 일부를 서버 리드모델로 이동해 화면 로직 중복 감소
  - 이벤트 수집이 단건 호출에서 배치 호출로 정리되어 추적 일관성 개선

### 14.4 검증 로그 (추가)
- `npm run typecheck:web` 통과
- `npm run test:api` 통과
  - 신규: `apps/api/test/learning-read-models.test.js`
- `npm run build:web` 통과
- `npm run lint` 통과
- `npm run docs:check-handoff` 통과

### 14.5 관련 커밋 (추가)
- `de1cae9` Add learning read-model APIs and funnel-driven UI integration

## 15) 2026-02-23 추가 후속 7 (전 스프레드 요약 회귀 차단 자동화)

### 15.1 회귀 케이스셋 추가
- 변경 파일:
  - `scripts/summary-regression-cases.json`
  - `apps/api/test/summary-regression.test.js`
- 핵심:
  - 전 스프레드(원카드/일별/3카드/양자택일/주별/월별/연간/관계회복/켈틱) 대상 회귀 케이스 18건 고정
  - 스프레드별 최소 2케이스 커버리지를 테스트로 강제
  - 케이스 정의에 `requiredAll`/`requiredAny`/`forbidden` 규칙 필드 추가

### 15.2 요약 회귀 검사기 신설
- 변경 파일:
  - `scripts/summary-regression-check.mjs`
  - `apps/api/src/index.js`
- 핵심:
  - `START_API_SERVER=false` 모드에서 서버 기동 없이 요약 엔진 직접 호출
  - 공통 정책 검사:
    - `판정: 우세|조건부|박빙`
    - `근거` 라인 최소 1개
    - 문장부호/조사 오류 금지 패턴
  - 스프레드별 구조 검사:
    - 주별: 월~일 + 레거시 라벨 금지
    - 월별: `총평/주차 흐름/월-주 연결/실행 가이드/한 줄 테마`
    - 연간: 분기/월(1~12월)/연말 구조
    - 관계회복: `핵심 진단/관계 리스크/7일 행동 계획`
  - 결과 리포트: `tmp/summary-regression-report.md`

### 15.3 품질게이트 연결
- 변경 파일:
  - `package.json`
  - `scripts/qa-cases-registry.json`
- 핵심:
  - `qa:summary-regression` 명령 추가
  - `verify:quality`에 `qa:summary-regression` 포함
  - QA 케이스 레지스트리에 `summaryCases`(18) 반영

### 15.4 검증 로그 (추가)
- `npm run test:api` 통과
- `npm run qa:summary-regression` 통과

## 16) 2026-02-23 추가 후속 8 (질문 이해 엔진 1차 개선)

### 16.1 question-understanding 모듈 신설
- 변경 파일:
  - `apps/api/src/question-understanding/index.js`
  - `apps/api/src/question-understanding/local-classifier.js`
  - `apps/api/src/question-understanding/external-classifier.js`
  - `apps/api/src/question-understanding/choice-parser.js`
- 핵심:
  - `legacy|hybrid|shadow` 모드 기반 질문 이해 파이프라인 도입
  - 로컬 분류기 점수 기반 intent/questionType 판별
  - 저신뢰 케이스 외부 분류기 폴백 인터페이스 추가
  - 선택지 파싱(`vs`, `A/B`, `할까/갈까/살까`) 강화

### 16.2 API/콘텐츠 연동
- 변경 파일:
  - `apps/api/src/index.js`
  - `apps/api/src/content.js`
- 핵심:
  - `inferYearlyIntent`/choice 파싱 로직을 신모듈 기반으로 교체
  - `POST /api/question-understanding` 진단 엔드포인트 추가

### 16.3 평가/테스트 추가
- 변경 파일:
  - `apps/api/test/question-understanding.test.js`
  - `scripts/question-understanding-eval-set.json`
  - `scripts/question-understanding-eval.mjs`
  - `package.json`
- 핵심:
  - QA 명령 추가: `npm run qa:question-understanding`
  - 평가 기준: intent/질문형/choice-mode 정확도 리포트 생성

### 16.4 구현 상세(추가)
- 질문 이해 파이프라인(`question-understanding/index.js`)
  - `analyzeQuestionContextSync()`: `legacy|hybrid|shadow` 모드별 동기 판별
  - `analyzeQuestionContext()`: `hybrid` 모드에서 외부 폴백까지 포함한 비동기 판별
  - `inferQuestionIntentEnhanced()`: 기존 의도 분기 호출부 치환용 경량 wrapper
- 로컬 분류기(`local-classifier.js`)
  - 키워드 가중치 + 기존 분기 결과(legacy intent) 앵커를 결합해 최종 intent 산출
  - 신뢰도 점수(상위-차상위 점수 간격 기반) 계산 후 폴백 여부 결정
- 선택지 파서(`choice-parser.js`)
  - `vs|A/B|또는|혹은|...중 무엇` + `할까/갈까/살까` 패턴 지원
  - 구매형/근무형/지역형 축 메타를 통일된 구조로 반환
  - 근무형 인식 보정(`일할`) 추가
- 콘텐츠 연동(`content.js`)
  - `inferChoiceContextMeta()`를 공통 parser 기반으로 전환
  - 구매형 양자택일에서 축 문구(`예산 압박/활용도/스타일 적합성`)가 유지되도록 회귀 보정
- API 연동(`index.js`)
  - `POST /api/question-understanding` 엔드포인트 추가
  - 요약/분기 함수의 기존 `inferQuestionIntent` 호출을 신엔진 기반으로 교체

### 16.5 정량 결과(추가)
- 실행: `npm run qa:question-understanding`
- 핵심셋: 20문장
- 결과:
  - intent 정확도: `100%`
  - questionType 정확도: `90%`
  - choice mode 정확도: `100%`
  - 판정: `pass`
- 리포트:
  - `tmp/question-understanding-eval-report.md`

### 16.6 회귀/검증 로그 (추가)
- `npm run test:api` 통과
  - 신규 `apps/api/test/question-understanding.test.js`
  - 기존 `apps/api/test/choice-a-b-reading.test.js` 회귀 통과
- `npm run qa:question-understanding` 통과
- `npm run qa:summary-regression` 통과
- `npm run docs:check-handoff` 통과

### 16.7 운영 리스크 및 롤백 경로
- 런타임 모드:
  - `QUESTION_UNDERSTANDING_MODE=legacy|hybrid|shadow`
- 운영 리스크:
  - API 자동기동형 QA는 실행 환경의 포트 바인딩 정책에 영향받을 수 있음
- 롤백:
  - `legacy` 모드 전환으로 즉시 기존 규칙 기반 분기로 복귀 가능

## 17) 질문 이해 엔진 2차 고도화 착수 (정밀 분류 + 평가셋 확장)

### 17.1 질문형 분류 보정
- 변경 파일:
  - `apps/api/src/question-understanding/local-classifier.js`
  - `apps/api/src/question-understanding/index.js`
- 핵심:
  - `yes_no` 정규식 확장:
    - `가능성이 있을까`, `있을까` 패턴 추가
    - 영문 질문(`can i`, `should i`, `is it okay`) 대응
  - `forecast` 정규식 확장:
    - `luck`, `fortune`, `horoscope`, `monthly/weekly/yearly luck` 대응
  - 영문 운세 표현(`monthly luck for me`)의 경계값 fallback을 줄이기 위해 `daily` 가중치 보강

### 17.2 선택지 파서 오탐 축소
- 변경 파일:
  - `apps/api/src/question-understanding/choice-parser.js`
- 핵심:
  - `or` 매칭을 단어 경계(`\\bor\\b`) 기반으로 보정해 `for` 오탐 제거
  - `어느 쪽이 더 나을까?`처럼 옵션이 없는 질문에서 가짜 `A안/B안` 생성 차단
  - `A안이랑 B안 중` 표현을 명시적 A/B로 인식하도록 패턴 추가

### 17.3 평가/게이트 강화
- 변경 파일:
  - `scripts/question-understanding-eval-set.json`
  - `scripts/question-understanding-eval.mjs`
  - `apps/api/test/question-understanding.test.js`
- 핵심:
  - 평가셋: `20 -> 25` 문장 확장(영문 운세/가능성/가짜 A/B/명시 A안-B안 포함)
  - QA 통과 기준 강화:
    - intent 정확도 `>=95`
    - questionType 정확도 `>=95` (신규 반영)
    - choiceMode 정확도 `>=93`
  - 단위 테스트에 누락 케이스 회귀 검증 추가

### 17.4 결과
- `npm run qa:question-understanding`
  - total: `25`
  - intentAccuracy: `100%`
  - typeAccuracy: `100%`
  - choiceModeAccuracy: `100%`
  - pass: `true`
- `npm run test:api` 통과

## 18) 질문 이해/리딩 엔진 v2 구현 (전 스프레드 대응 기반)

### 18.1 질문 이해 엔진 v2.5 추가
- 변경 파일:
  - `apps/api/src/question-understanding/index.js`
  - `apps/api/src/question-understanding/short-utterance-rules.js` (신규)
  - `apps/api/src/question-understanding/external-classifier.js`
- 핵심:
  - `analyzeQuestionContextV2Sync`, `analyzeQuestionContextV2` 추가
  - v2 출력 필드 확장:
    - `subIntent`, `domain`, `timeHorizon`, `riskClass`, `confidenceBand`, `templateVersion`
  - 초단문 질문 보정:
    - `지금 잘까`, `연락?`, `사도 돼?`, `today luck?` 등 짧은 질문 전용 규칙 추가
  - 외부 분류기 적극 라우팅:
    - 저신뢰(`QUESTION_UNDERSTANDING_EXTERNAL_THRESHOLD`, 기본 0.72) 또는 고위험(`riskClass=high`)이면 외부 분류 호출

### 18.2 v2 API 엔드포인트 추가
- 변경 파일:
  - `apps/api/src/index.js`
- 핵심:
  - 질문 이해 v2:
    - `POST /api/v2/question-understanding`
    - 응답: `{ ok, analysis }`
  - 스프레드 리딩 v2:
    - `POST /api/v2/spreads/:spreadId/draw`
    - 기존 draw 결과 + `readingV2` 블록 반환
  - 기존 v1 엔드포인트는 유지(하위호환)

### 18.3 리딩 엔진 v2 블록 추가
- 변경 파일:
  - `apps/api/src/index.js`
- 핵심:
  - 공통 draw 로직 분리(`performSpreadDraw`)
  - `readingV2` 생성기 추가(`buildReadingV2`)
    - `verdict`, `narrative`, `evidence`, `actionPlan`, `reviewPlan`, `safety`, `meta`, `summary`
  - `READING_STYLE_MODE`(기본 `immersive_safe`) 반영

### 18.4 프론트 타입/API 클라이언트 확장
- 변경 파일:
  - `apps/web/src/types.ts`
  - `apps/web/src/lib/api.ts`
- 핵심:
  - 타입 추가:
    - `QuestionUnderstandingV2`
    - `SpreadReadingV2`
    - `SpreadDrawResultV2`
  - API 메서드 추가:
    - `api.analyzeQuestionV2()`
    - `api.drawSpreadV2()`

### 18.5 평가/테스트 강화
- 변경 파일:
  - `apps/api/test/question-understanding.test.js`
  - `scripts/question-understanding-eval-set.json`
  - `scripts/question-understanding-eval.mjs`
- 핵심:
  - 초단문 케이스 포함 평가셋 확장: `25 -> 30`
  - QA 기준 상향:
    - intent/type/choice 정확도 각각 `>=97`
    - 도메인별 floor 정확도 `>=97`
  - v2 스키마 회귀 테스트 추가

### 18.6 검증 로그
- `npm run qa:question-understanding` 통과
  - total: 30
  - intent/type/choice/domainFloor: 모두 100%
- `npm run test:api` 통과
- `npm run typecheck:web` 통과
- `npm run lint` 통과
- `npm run docs:check-handoff` 통과

## 19) 원카드 초간단 질문 응답 품질 전면 업그레이드 (벤치마크 반영)

### 19.1 초간단 질문 유형 뱅크 100+ 확장
- 변경 파일:
  - `apps/api/src/question-understanding/short-utterance-rules.js`
  - `apps/api/test/question-understanding.test.js`
- 핵심:
  - 초단문 발화 유형을 100개 이상으로 확장(`SHORT_QUESTION_TYPE_BANK`)
  - 수면/연락/결제/운동/이직/학습/일반 선택형까지 초단문 커버리지 확장
  - 유형 수 회귀 테스트 추가(100+ 보장)

### 19.2 초간단 질문 원카드 압축 응답 적용
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
  - `apps/api/test/content-fallback.test.js`
- 핵심:
  - `one-card + short_utterance_rules` 매칭 시 장문 템플릿 대신 압축 템플릿 적용
  - 상단 종합 리딩과 하단 리더 리딩 모두 짧은 실행형 구조로 통일
  - 학습 리더 코치 문구도 초간단 질문에서는 짧은 복기형으로 축약

### 19.3 yes/no 및 초간단 질문 결론 강제
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
  - `apps/api/test/content-fallback.test.js`
- 핵심:
  - 초간단 질문 또는 `questionType=yes_no`이면 결론을 반드시 명시
  - 결론 포맷:
    - `결론: 예`
    - `결론: 아니오`
    - `결론: 조건부 예`
  - 종합 리딩(summary)에도 동일 결론 라인을 강제

### 19.4 벤치마크형 구어체 톤 반영
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
- 핵심:
  - 딱딱한 보고서체를 대화형 구어체로 완화
  - 부정 결론 완충(실망 완화), 근거 해석, 대체 행동 제시 흐름 강화
  - 정방향/역방향과 결론의 어색한 충돌을 줄이도록 결론 매핑 보정

### 19.5 원카드 형식 통일(모든 질문 적용)
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
  - `scripts/summary-regression-check.mjs`
- 핵심:
  - 원카드 출력 형식을 모든 질문에 통일:
    - `의미`
    - `한줄 결론`
    - `권장 행동`
    - `복기`
    - `한 줄 테마`(요약)
  - 원카드 문장 길이 정책 조정: 해석 문장 최대 7문장(5~7문장 목표)
  - 요약 회귀 정책에서 원카드는 기존 `판정/근거` 강제 규칙 예외 처리

### 19.6 검증 로그
- `node --test apps/api/test/question-understanding.test.js` 통과
- `node --test apps/api/test/content-fallback.test.js` 통과
- `npm run qa:question-understanding` 통과
  - total: 30
  - intent/type/choice/domainFloor: 모두 100%
- `npm run qa:summary-regression` 통과
- `npm run test:api` 통과

### 19.7 관련 커밋
- `f1f5ea2` Expand short-question type bank to 100+ utterance patterns
- `6f1a818` Compact one-card outputs for short-utterance question bank
- `d64461a` Force explicit conclusions for short and yes-no one-card questions
- `a2d1c50` Refine one-card yes-no output with conversational Korean tone
- `305af3b` Reshape one-card answers to meaning-conclusion-action conversational format

## 20) 원카드 마이크로-질문 커버리지 확장 + 출력 형식 완전 통일 (추가)

### 20.1 전 리딩 문체/구조 정책 강화
- 변경 파일:
  - `apps/api/src/index.js`
  - `apps/api/src/content.js`
  - `apps/api/test/content-fallback.test.js`
  - `scripts/summary-regression-check.mjs`
- 핵심:
  - 존댓말 기반 자연어 스토리텔링을 기본 출력 정책으로 고정
  - 항목 나열형 문장을 문단형 상담 서사로 변환
  - 원카드/스프레드 모두 결론-근거-실행-복기의 읽기 흐름 유지

### 20.2 초간단 yes/no 질문에서 직답 누락 문제 수정
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
  - `apps/api/test/content-fallback.test.js`
- 핵심:
  - `지금 잘까?` 같은 초단문 질문에서 첫 문장에 직답 강제
  - 수면 질문 전용 분기 우선 적용:
    - `예/조건부 예/아니오`를 바로 제시
    - 실행 문장과 복기 문장을 수면 맥락으로 정렬
  - 종합 리딩(summary)과 포지션 리딩(interpretation)의 결론 충돌 완화

### 20.3 전 스프레드 포지션 리딩 출력 포맷 단일화
- 변경 파일:
  - `apps/api/src/content.js`
- 핵심:
  - `buildTarotConsultingInterpretation()`의 최종 출력을 공통 템플릿으로 통합
  - 통일된 포맷:
    - 직답
    - 카드 근거
    - 실행
    - 복기
    - 한 줄 테마
  - 도메인별 세부 정보(예: A/B 비교 축)는 유지하면서 형식만 통일

### 20.4 질문군 커버리지 확장(“1만 질문 대응” 기반 강화)
- 변경 파일:
  - `apps/api/src/content.js`
- 핵심:
  - 원카드 질문군 분류 확장:
    - `caffeine`(커피/카페인)
    - `alcohol`(음주)
    - `meal`(식사/야식)
    - `medicine`(약복용)
    - `exercise`(운동)
    - `travel`(이동/외출/출발)
    - `contact`(연락)
    - `payment`(결제/구매)
    - `daily`(일상)
  - 질문군별 결론/실행 문장을 분리해 질문-행동 정합성 강화
  - A/B 구매형 질문에는 축 비교 + 리스크 키워드(유혹/과열/경계/통제) 동시 반영
  - 수면/초단문 복기 문장을 테스트 패턴과 실사용 맥락 모두 만족하도록 보정

### 20.5 검증 로그
- `npm run test:api` 통과
- `npm run qa:summary-regression` 통과

### 20.6 관련 커밋
- `4843efb` Unify tarot reading tone into honorific narrative style
- `8c3bbf3` Fix one-card short yes/no to lead with direct sleep answer
- `e4f2a41` Unify all tarot interpretation outputs into one narrative format

## 21) 하이브리드 QA 대규모화 + 공감형 리딩 정교화 + 시험/커리어 템플릿 확장 (추가)

### 21.1 질문 이해 QA셋 3,000건 확장 및 게이트 강화
- 변경 파일:
  - `scripts/refresh-qa-cases.mjs`
  - `scripts/question-understanding-eval.mjs`
  - `scripts/question-understanding-eval-set.json`
  - `scripts/qa-cases-registry.json`
  - `docs/question-understanding-labeling-guide.md`
  - `README.md`
- 핵심:
  - question-understanding 평가셋을 기본 3,000건으로 생성(환경변수로 1,000~10,000 조정)
  - 후보셋(`tmp/question-understanding-candidate-set.json`) 별도 생성
  - 의도 균형 샘플링 + short utterance bank 합류
  - 평가 게이트를 98% 기준(intent/type/choice/domainFloor)으로 상향
  - 버킷 리포트(intent/style/length/risk) + 실패 패턴 리포트 추가
  - 수동 라벨링 가이드 문서 추가

### 21.2 공감형+설명형 리딩 프레임 도입
- 변경 파일:
  - `apps/api/src/content.js`
- 핵심:
  - one-card를 포함한 공통 내러티브 경로(`buildUnifiedInterpretationNarrative`)를 공감형 구조로 보정
    - 공감 완충(negative/conditional 중심)
    - 답변 결론
    - 테마
    - 실행
    - 카드 근거+의미 해설
    - 재점검/복기
  - 결론 톤 분류 함수 추가:
    - `detectConclusionTone`
  - 문장 구성 헬퍼 추가:
    - `buildEmpathyLeadLine`
    - `buildCardMeaningDetailLine`
    - `buildRecheckGuideLine`

### 21.3 어색함 교정(시험 질문 실사례 기반)
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/web/src/pages/spreads-helpers.ts`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 핵심:
  - 카드명 불일치 방지:
    - 리딩 본문에 다른 카드명이 섞이면 현재 카드명으로 정규화(`sanitizeCardNameConsistency`)
  - 시험 질문 전용 실행 템플릿 보강:
    - `기출 1세트 + 오답 복기` 중심으로 실행 문구 재설계
  - 메타형 코치 문구 완화:
    - `결론 1문장/근거 1문장/실행 1문장` 문구를 자연형으로 보정
  - UI 라벨 개선:
    - `학습 리더 코치 내역` → `학습 코치 요약`
  - one-card 판정문 보정:
    - 종합 인사이트에서 one-card는 별도 기준으로 `go/conditional/hold` 판정
    - 시험 질문에서는 `합격 가능성 + 조건` 문구로 이유를 구체화

### 21.4 동일 템플릿 확장(시험 → 커리어 의사결정)
- 변경 파일:
  - `apps/api/src/content.js`
- 핵심:
  - 시험/학습 템플릿과 동일한 방식으로 커리어 질문(면접/지원/이직/오퍼)까지 확장
  - 커리어 질문에서도 동일 프레임 사용:
    - 공감 완충
    - 결론
    - 준비 품질 기준
    - 1-step 실행
    - 재평가 기준

### 21.5 검증 로그
- `npm run qa:refresh-cases` 통과
- `npm run qa:question-understanding` 통과
  - total: 3000
  - intent/type/choice/domainFloor: 모두 100%
- `npm run test:api` 통과
- `npm run test:web` 통과
- `npm run qa:summary-regression` 통과

### 21.6 관련 커밋
- `8717a27` Expand question-understanding QA set to 3k with stronger eval gates
- `f888b88` Refine reading narrative with empathy-first explanatory flow

## 22) 챗봇/스프레드 자동추천 고도화 + 스프레드 50종 확장 (2026-02-23 추가)

### 22.1 스프레드 정의 50종 확장
- 변경 파일:
  - `apps/api/src/data/spreads.js`
  - `scripts/summary-regression-cases.json`
- 핵심:
  - 스프레드 정의를 50종으로 확장(기존 19종 + 신규 31종)
  - 신규 스프레드 예시:
    - 시험/면접/커리어 전환/프로젝트/번아웃/재정 점검/투자/이사/대화 리셋/내면 정리 등
  - 회귀 케이스셋을 50종 기준으로 확장하여 스프레드당 최소 2건 규칙 유지

### 22.2 추천 엔진 공용화(챗봇/카드뷰 공통)
- 변경 파일:
  - `apps/web/src/lib/spread-recommendation.ts` (신규)
  - `apps/web/src/pages/ChatSpreadPage.tsx`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 핵심:
  - 점수형 추천 엔진 도입:
    - 질문 분석 API(`intent/questionType/timeHorizon`) 신호
    - 질문 키워드 매칭
    - 스프레드 메타(이름/목적/사용 시점) 어휘 유사도
  - 챗봇/카드뷰가 동일 추천 모듈을 사용하도록 통합
  - 카드뷰 드로우 버튼도 질문 입력 시 자동 추천 스프레드를 선택해 실행하도록 전환

### 22.3 챗봇 출력/시각화 개선
- 변경 파일:
  - `apps/web/src/pages/ChatSpreadPage.tsx`
  - `apps/web/src/styles/spreads.css`
  - `apps/web/src/types.ts`
- 핵심:
  - 다크/라이트 테마 모두 대응
  - 결론 기반 배지 파싱(`조건부 예/예/아니오`) 충돌 보정
  - `오늘의 테마` 중복 문구 제거, 질문 반복 박스 제거
  - 응답을 `요약+근거` 단일 자연어 문단으로 통합
  - 챗봇 버블에서 스프레드 실제 배열을 슬롯 단위로 렌더링(3카드 포함)

### 22.4 4/5/6카드 동일 배열 스프레드의 핵심변형 통합
- 변경 파일:
  - `apps/web/src/lib/spread-display.ts` (신규)
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/types.ts`
- 핵심:
  - 동일 레이아웃 시그니처를 가진 4/5/6카드 스프레드를 대표 + 변형으로 자동 묶음
  - 변형 선택 시 `sourceSpreadId`를 이용해 실제 원본 스프레드로 draw 호출
  - 목록 중복을 줄이면서 기존 리딩 엔진과의 정합성 유지

### 22.5 검증 로그
- `npm run test:api` 통과
- `npm run typecheck:web` 통과
- `npm run build:web` 통과

### 22.6 관련 커밋
- `3abf39e` Expand to 50 spreads and enable auto-recommendation in card view
- `aad6fde` Add 10 new spreads and overhaul auto recommendation ranking
- `aefed23` Render chat mode as single natural-language narrative
- `495ab5e` Support light theme chat UI and clean duplicate summary lines
- `234ab04` Refine chat verdict parsing and chatbot-style layout
- `408c0a3` Add chat-based spread reading UI with route toggle

## 23) 2026-02-23 최신 추가 (스프레드 100종/대화형 리딩/양방향 복원/내보내기)

### 23.1 스프레드 카탈로그 100종 확장 및 핵심변형 통합
- 변경 파일:
  - `apps/api/src/index.js`
  - `apps/web/src/lib/spread-display.ts`
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/pages/spreads-helpers.ts`
- 핵심:
  - API 레벨에서 스프레드 카탈로그를 100종으로 확장
    - 원본 스프레드 + 확장형(동형 배열) 생성
  - 동일 배열 스프레드 통합 규칙을 전 카드 수로 확장
    - 기존 4/5/6 카드 제한 제거
  - 핵심변형 생성 시 목적문구 중복 삽입 방지
  - 카드뷰/챗뷰 배열 매핑 공통화
    - `findDrawnItemForSlot`로 슬롯 매칭 로직 통일

### 23.2 도메인별 확장 네이밍 체계 도입
- 변경 파일:
  - `apps/api/src/index.js`
- 핵심:
  - 확장 스프레드 이름을 `핵심변형 N`에서 도메인 기반 테마명으로 전환
  - 도메인 자동 판별(`관계/커리어/학습/재정/건강/라이프/일반`) 후 테마 풀 순환 적용
  - 예시:
    - `연간 운세 (12개월) · 신뢰 재정렬`
    - `시험 합격 5카드 · 학습 루틴 안정화`

### 23.3 챗리딩 UI 구조 개선 및 중복 카드 표시 제거
- 변경 파일:
  - `apps/web/src/pages/ChatSpreadPage.tsx`
  - `apps/web/src/styles/spreads.css`
- 핵심:
  - 챗 버블에서 첫 카드 별도 spotlight 제거(연간운세 중복 표기 해소)
  - 배열 렌더를 카드뷰와 동일 슬롯 매핑으로 통일
  - 긴 요약을 구조화된 섹션 기반 렌더로 개선 후, 전체 펼침 모드로 고정
  - 월별 운세 12개월을 개별 블록으로 분리하여 스캔성 향상

### 23.4 2페르소나 대화형 리딩 고도화
- 변경 파일:
  - `apps/web/src/pages/ChatSpreadPage.tsx`
- 핵심:
  - 타로리더 중심 발화 + 학습리더 보조 코칭 비중으로 재조정
  - 타로리더 브릿지 문구(맥락 파악 + 공감) 추가
  - 대화 턴 정규화/중복 제거 강화
    - 템플릿 접두 제거
    - 의미 중복 키 기반 dedupe
  - 포지션 근거 문장 다양화
    - 과거: 배경 패턴
    - 현재: 조절 변수
    - 미래: 조건부 전개
  - 학습리더 코칭 구체화
    - `25분 실행 + 5분 기록`
    - `완료율/체감점수`
    - `맞음/어긋남 비교`

### 23.5 카드뷰↔챗봇 동일 리딩 복원
- 변경 파일:
  - `apps/web/src/lib/chat-draw-cache.ts` (신규)
  - `apps/web/src/pages/ChatSpreadPage.tsx`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 핵심:
  - 드로우 결과를 세션 캐시에 저장
  - URL 파라미터(`fromChat/fromCard`, `chatDrawAt`, `rawSpreadId`)로 복원 조건 고정
  - 카드뷰→챗봇, 챗봇→카드뷰 이동 시 같은 리딩 결과를 동일하게 재렌더

### 23.6 TXT/PDF 내보내기 기능 도입 및 리치 포맷 고도화
- 변경 파일:
  - `apps/web/src/lib/reading-export.ts` (신규 후 고도화)
  - `apps/web/src/pages/ChatSpreadPage.tsx`
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/test/smoke.test.mjs`
- 핵심:
  - 카드뷰/챗봇 공통 내보내기 버튼 추가
    - `TXT 내보내기`
    - `PDF 내보내기`
  - TXT 포맷:
    - 대화 요약
    - 실행 체크리스트
    - 카드별 근거(핵심/해석/학습)
  - PDF 포맷:
    - 브라우저 print 기반 리치 템플릿
    - 메타(질문/시각) + 요약 박스 + 체크리스트 + 카드 근거 섹션
  - 참고:
    - `jspdf` 설치 시 네트워크 오류(`EAI_AGAIN`)가 발생해 외부 라이브러리 없이 구현

### 23.7 검증 로그
- `npm run typecheck:web` 통과 (반복 실행 기준)
- `npm run test:web` 통과 (smoke 강화 포함)
- `npm run test:api` 통과 (해당 백엔드 변경 시점 기준)

### 23.8 관련 커밋
- `f38371e` feat: expand spread catalog to 100 and unify spread/chat layouts
- `a7587b6` feat: shift chat reading to dual-persona conversational layout
- `e6fd8dd` feat: preserve chat draw in card view and rebalance dual-persona dialogue
- `c1b6c9d` feat: make chat summary fully expanded and sync reading across views
- `3e013e6` fix: improve dialogue quality and deduplicate chat reading turns
- `5206cd9` fix: reduce repetitive tarot dialogue and diversify position evidence
- `45253f1` feat: add txt/pdf export for chat and card views
- `4df4365` feat: enhance conversational flow and rich export formatting

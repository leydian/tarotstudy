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

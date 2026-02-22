# 세션 인수인계 상세 (2026-02-22)

## 1) 요약
이번 상세 문서는 `SESSION_HANDOFF.md`의 핵심 요약을 보조하는 변경 이력 문서입니다.  
주요 축은 다음 4개입니다.
- 리딩 품질/톤 정비
- 연간운세 구조 재설계
- 분기/월 반복 문장 개선
- 스프레드 UI 개선

## 2) 백엔드 상세 변경

### 2.1 타로/학습 페르소나 분리 강화 (`apps/api/src/content.js`)
- `buildSpreadReading()`에서 역할 분리를 유지
  - 타로 리더: `coreMessage`, `interpretation`
  - 학습 리더: `learningPoint`
- 타로 리더 문장을 상담형 자연어 중심으로 정비
- 학습 코칭 성격 문구가 타로 리더 문장에 섞이지 않도록 정리

### 2.2 연간운세 월 포지션 전용 리딩 추가 (`apps/api/src/content.js`)
- 연간운세의 1~12월 포지션을 별도 함수로 처리
  - `buildYearlyMonthCoreMessage()`
  - `buildYearlyMonthInterpretation()`
- 질문 의도 분기 도입
  - 커리어/연애/재정/일반
- 시기 질문(취업/이직 등)에서는 월별 실행/보완 방향을 직접적으로 제시

### 2.3 연간운세 요약 구조 변경 (`apps/api/src/index.js`)
- `summarizeSpread()`에서 연간운세(`yearly-fortune`)는 별도 생성기로 분기
- 출력 순서 고정:
  1. 총평
  2. 분기별 운세
  3. 월별 운세
  4. 최종 정리

### 2.4 총평 문장 다양화/정확화 (`apps/api/src/index.js`)
- `buildYearlyOverallLine()` 도입
- 총평 템플릿 다변화
- 강점 분기/보완 분기를 함께 언급하도록 구성

### 2.5 분기별 운세 개선 (`apps/api/src/index.js`)
- 분기 역할 고정
  - 1분기: 기반 다지기
  - 2분기: 실행 점검
  - 3분기: 확장 조율
  - 4분기: 연말 정리
- 4분기 연말 정리 문구 강제
  - “결산/확정/다음 해 전환” 성격 반영
- 분기 문장도 다중 템플릿으로 다양화

### 2.6 월별 운세 반복 완화 (`apps/api/src/index.js`)
- `buildYearlyMonthlyNarratives()` 추가
- 월별 문장 구조를 `카드 근거 + 행동 제안`으로 통일
- 연속 반복 방지 규칙 적용
- 질문 의도별 행동 문장 분기 강화

## 3) 프론트엔드 상세 변경

### 3.1 리딩 레이아웃 개선 (`apps/web/src/pages/SpreadsPage.tsx`, `apps/web/src/styles.css`)
- 리딩 영역을 좌우 2열로 구성
  - 좌측: 타로 리더
  - 우측: 학습 리더
- 종합 리딩을 문장 리스트보다 자연문 단락 중심으로 렌더링

### 3.2 스프레드 모양 카드 이미지 표시 (`apps/web/src/pages/SpreadsPage.tsx`, `apps/web/src/styles.css`)
- 스프레드 슬롯에 뽑힌 카드의 썸네일/이름 노출
- 슬롯 카드 클릭 시 카드 상세(`/cards/:cardId`) 이동 연결

## 4) 관련 분석/보고 문서
- 페르소나 지정 현황: `docs/persona-report-2026-02-22.md`
- 연간운세 어색함 분석: `docs/annual-fortune-job-timing-awkwardness-report-2026-02-22.md`

## 5) 검증 로그(요약)
- `node --check apps/api/src/content.js` 통과
- `node --check apps/api/src/index.js` 통과
- `npm run build:web` 통과

## 6) 카드 설명 분기 고도화 상세 (추가)

### 6.1 기본 카드 설명(심화 설명 아님) 카드별 분기 (`apps/api/src/data/cards.js`)
- `descriptions.beginner`/`descriptions.intermediate`의 고정 문구를 단계적으로 제거
- 입문 설명:
  - 1줄: `buildBeginnerKeywordLine()`로 카드/수트별 분기
  - 2줄: `buildBeginnerFlowLine()`로 카드/수트별 분기
  - 3줄: `buildBeginnerLearningPoint()` + `buildMinorLearningPointVariants()`로 마이너 세분화(수트+랭크+키워드)
- 중급 설명:
  - `buildIntermediateDescription()`를 카드/수트/맥락 기반 분기 구조로 확장
  - 메이저 원형 카드 공통 문장 반복 완화: `buildIntermediateRankLine()` 추가
- 공통:
  - 카드별 선택 함수 `pickCardVariant()` 유지
  - 조사/문장 자연화 다수 반영

### 6.2 심화 설명 생성 분기 강화 (`apps/api/src/content.js`)
- `buildFallbackExplanation()` 품질 고도화
  - 섹션별 최소 3줄 보장 유지
  - `love`/`career` 섹션을 고정 문장에서 전용 빌더로 교체
    - `buildLoveSectionLines()`
    - `buildCareerSectionLines()`
  - 질문 맥락 세분화:
    - 관계: `detectRelationshipContext()` (재회/회복, 갈등, 기본)
    - 커리어/학습: `detectCareerContext()` (면접/지원, 프로젝트, 학습, 기본)
- 메이저 22장 + 마이너 56조합 분기 유지/확장
- 반복 문장 완화:
  - 정방향/역방향/조언 문장 변주
  - 카드별 해시 기반 문장 선택

### 6.3 기본 카드 설명 API 동적화 (`apps/api/src/index.js`)
- `/api/cards`, `/api/cards/:cardId`에서 `descriptions`를 `buildCardDescriptions()`로 동적 생성
- `context` 쿼리 반영으로 기본 설명에도 맥락 힌트 적용
- 동일 카드 문구 안정화 요구 반영:
  - `variantSeed` 기반 로테이션 제거
  - 카드 ID 기준 고정 문구 유지

### 6.4 심화 설명 UI 렌더링 개선 (`apps/web/src/pages/CardDetailPage.tsx`)
- 심화 설명 섹션 문자열의 `\n`을 문단으로 렌더링하도록 변경
- 섹션별 3줄 이상 설명이 화면에 그대로 드러나도록 개선

### 6.5 심화 설명 프롬프트 개선 (`apps/api/src/external-ai.js`)
- 입문/중급 관점 가이드 분리 문구 추가
- 섹션별 `3줄 이상` 출력 지시 강화

### 6.6 성능/응답성 개선 (`apps/api/src/content.js`)
- 심화 설명 생성 응답 전략:
  - 캐시 히트 시 즉시 반환
  - 빠른 생성 시도(짧은 timeout) 후 실패 시 fallback 즉시 반환
  - 후속 생성 성공 시 캐시 갱신
- 체감 개선:
  - 첫 호출 지연 감소(기존 대비 단축), 재호출은 캐시로 매우 빠름

### 6.7 이번 추가 작업 커밋 이력 (요약)
- `a2214fd` Enhance card explanation detail, speed, and card-specific variation
- `07a5e67` Diversify beginner base description lines per card
- `5b731d0` Vary beginner keyword intro line by card
- `a8753e2` Expand minor arcana beginner learning-point branching
- `c0fae16` Refine explanation variation and reduce repeated guidance
- `974cd64` Add context-aware base descriptions and rotating card variants
- `9ca2ac6` Remove card description rotation for stable per-card text
- `229ea45` Diversify intermediate base descriptions by card context
- `c9fe9ca` Reduce repeated intermediate major arcana rank line
- `374d9ae` Further segment love/career sections in fallback explanations

## 7) 품질 게이트 자동화/회귀 방지 (추가)

### 7.1 테스트/QA 스크립트 체계 정비 (`package.json`, `scripts/*`)
- 루트 스크립트 추가:
  - `test:api`
  - `qa:learning-leader:raw`
  - `qa:learning-leader` (API 자동 기동 래퍼)
  - `qa:yearly-fortune`
  - `verify:quality` (통합 게이트)
- 학습 리더 QA 래퍼:
  - `scripts/run-learning-leader-qa.mjs`
  - API 미기동 시 자동으로 API를 띄워 점검 후 종료
- 연간운세 회귀 체크:
  - `scripts/yearly-fortune-regression-cases.json`
  - `scripts/yearly-fortune-regression-check.mjs`
  - 구조/분기/연말 톤 회귀를 자동 검증

### 7.2 API 텍스트 회귀 테스트 추가 (`apps/api/test/*`)
- `cards-descriptions.test.js`
  - 카드 설명의 안정성/3줄 형식/맥락 반영 회귀 검증
- `content-fallback.test.js`
  - fallback 섹션 최소 줄 수, 맥락 분기, 페르소나 분리 검증
- `relationship-recovery-spread.test.js`
  - 신규 스프레드 정의/포지션/리딩 템플릿 검증

### 7.3 CI 게이트 도입 (`.github/workflows/quality-gates.yml`)
- PR/`main` push 시 `npm run verify:quality` 자동 실행
- 회귀 발생 시 머지 전에 차단 가능

## 8) 기능 확장 및 버그 픽스 (추가)

### 8.1 관계 회복 스프레드 추가 (`relationship-recovery`)
- 변경 파일:
  - `apps/api/src/data/spreads.js`
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/lib/api.ts`
- 추가 내용:
  - 포지션 5개:
    - 현재 관계 상태
    - 거리/갈등의 핵심
    - 상대 관점 신호
    - 회복 행동
    - 다음 7일 흐름
  - 전용 템플릿/포커스/프롬프트 적용
  - 전용 요약 생성:
    - 핵심 진단
    - 관계 리스크
    - 7일 행동 계획

### 8.2 스프레드 텔레메트리 추가
- API:
  - `POST /api/telemetry/spread-events`
  - `GET /api/telemetry/spread-events`
- 수집 이벤트:
  - `spread_drawn`
  - `spread_review_saved`
- 프론트 연동:
  - `relationship-recovery` 드로우/복기 저장 시 이벤트 전송

### 8.3 카드 상세 질문 맥락 반영 버그 수정
- 증상:
  - 질문 입력값이 기본 설명/심화 설명에 충분히 반영되지 않음
  - 입력 중 로딩으로 타이핑 체감이 나빠짐
  - 최신 context가 아닌 이전 값으로 심화 생성될 여지
- 조치:
  - `api.getCard(cardId, context)`로 기본 설명 조회에 `context` 쿼리 전달
  - `CardDetailPage` 카드 조회 키를 `['card', cardId, context]`로 확장
  - `placeholderData` 적용으로 입력 중 UI 유지
  - 심화 생성 버튼에서 `mutate({ level, context })`로 최신 값 명시 전달
  - 입력 변경 시 이전 생성 결과 reset

### 8.4 심화 fallback 설명 전 섹션 맥락 강분기
- 변경 파일: `apps/api/src/content.js`
- 핵심:
  - `inferExplanationContext()`로 질문 도메인 해석
  - `buildContextFocusLines()`로 섹션별 맥락 문장 구성
  - `buildCrossDomainLine()`로 교차 섹션 반영(예: 커리어 질문→love 섹션 영향)
  - 적용 범위:
    - `coreMeaning`
    - `symbolism`
    - `upright`
    - `reversed`
    - `love`
    - `career`
    - `advice`
- 결과:
  - `빈 질문` vs `이직을 언제할까?`에서 섹션 전반 문장 차이가 명확히 발생

### 8.5 관련 커밋 (추가 구간)
- `0c3ae28` Add automated quality gates for reading regressions
- `9ffa015` Add relationship-recovery spread and telemetry hooks
- `861df93` Strengthen context-aware card explanations across all sections

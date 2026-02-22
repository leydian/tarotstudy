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

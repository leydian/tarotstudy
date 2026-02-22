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

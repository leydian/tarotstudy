# Release Notes v6.3.30

## 개요
이번 릴리스는 계획안의 후속 작업으로 운영 지표 가시화와 모바일 결과 소비 경험을 보강했습니다.

## 주요 변경

### 1) 운영 메트릭 집계 가능화
- `apps/api/src/index.js`
  - `TAROT_METRIC_LOG_PATH`가 설정되면 `[Tarot Metric]` 데이터를 JSONL 파일에 append.
- `apps/api/scripts/aggregate-metrics.js`
  - 집계 리포트 출력:
    - `fallbackRatePct`
    - latency `p50`, `p95`
    - `byFailureStage`, `byFallbackReason`, `byQuestionType`, `byReadingKind`, `byFortunePeriod`
- `apps/api/package.json`
  - `metrics:report` 스크립트 추가.

### 2) 종합운세 회귀 검증 규칙 강화
- `apps/api/tests/overall-fortune-regression.js`
  - `summary`와 `verdict.rationale` 중복 금지
  - `counterpoints` 오염 라벨(사서의 통찰/운명의 판정) 금지
  - `actions`의 legacy prefix(`[운명의 지침 N]`) 금지
  - `fortune` 4개 세그먼트 단조화 방지(완전 동일 문구 방지)

### 3) 모바일 결과 UI 읽기성 개선
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
  - 결과 섹션(종합운세/안전안내/운명의 지침/함께 고려할 변수)에 접기/펼치기 버튼 추가
  - 모바일 결과 진입 시 긴 섹션은 기본 접힘으로 시작
  - 입력 필드 모바일 키보드 힌트/자동완성/맞춤법 옵션 정리

### 4) 웹 계약 테스트 확장
- `apps/web/tests/validate-ui-contract.js`
  - quick fortune 핸들러/상태 전이(`reading`, `result`)
  - reset 핸들러/입력 단계 복귀/기본 메시지 복원 검증

### 5) 운영 문서/템플릿 추가
- `docs/OPERATIONS_METRICS.md` 추가
- `docs/RELEASE_TEMPLATE.md` 추가
- `docs/QUALITY_GATE.md`에 메트릭 점검 절차 추가

## 검증
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과
- `npm run metrics:report --prefix apps/api` 통과 (샘플 로그 기준)

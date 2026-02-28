# Release Notes v6.3.33

## 개요
운영 메트릭 분석의 실효성과 `/ops` 운영자 경험을 개선하고, 릴리스 노트 생성 자동화 기반을 추가했습니다.

## 주요 변경

### 1) 메트릭 저장/집계 표준화
- `apps/api/src/ops/metrics.js`
  - 메트릭 append 유틸(`appendMetricLine`) 추가
  - 파일 크기 기반 회전(`TAROT_METRIC_MAX_BYTES`) 지원
  - `filterMetrics`, `filterMetricsByRange` 추가
  - `aggregateMetrics`에 `byDomainTag` 포함 및 zero-safe 처리
- `apps/api/src/index.js`
  - 메트릭 기록을 공통 유틸로 통합
  - `/api/admin/metrics`가 `window`, `limit` 쿼리 지원
  - 이전 동일 구간 요약(`previous`) 반환

### 2) `/ops` 대시보드 고도화
- `apps/web/src/pages/OpsDashboard.tsx`
  - 기간 필터(1h/24h/7d/all)
  - 최대 건수 필터
  - Top fallback reasons 카드
  - Domain Tag 분포 표시
  - 이전 구간 비교 텍스트 표시
- `apps/web/src/pages/OpsDashboard.module.css`
  - 필터/비교 영역 스타일 추가

### 3) 테스트 강화
- `apps/api/tests/metrics-aggregation.js`
  - window/range 필터 동작 검증 추가
- `apps/web/tests/OpsDashboard.test.tsx`
  - 확장된 payload(`filters`, `previous`, `byDomainTag`) 렌더 검증

### 4) 릴리스 자동화 기초 추가
- `scripts/generate-release-note.js`
  - 템플릿 기반 릴리스 노트 생성 스크립트 추가
- `package.json`
  - `release:note` 스크립트 추가

## 검증
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run test:unit --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

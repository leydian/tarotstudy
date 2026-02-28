# Release Notes v6.3.32

## 개요
v6.3.31에서 확장된 운영/품질 기반을 실제 릴리스 가능한 형태로 고도화했습니다.

## 주요 변경

### 1) 운영 보안/안전장치 강화
- `apps/api/src/index.js`
  - `/api/admin/metrics`는 운영 환경(`NODE_ENV=production`)에서 `ADMIN_METRICS_KEY` 미설정 시 503 반환
  - 키가 설정된 경우 `x-admin-key` 인증 유지

### 2) 메트릭 모니터링 워크플로 분리
- `.github/workflows/nightly-metrics-check.yml` 추가
  - 매일 01:00(Asia/Seoul) 기준 스케줄 실행
  - CI 워크스페이스에 `apps/api/tmp/metrics.log`가 없으면 안전하게 skip
  - 로그가 있으면 `metrics:report` + `metrics:check` 실행

### 3) 웹 단위 테스트 체계 도입 (Vitest + RTL)
- `apps/web/package.json`
  - `test:unit` 스크립트 추가
  - `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` 도입
- `apps/web/vite.config.ts`, `apps/web/tests/setup.ts`
  - jsdom 테스트 환경/ResizeObserver/scrollIntoView 보정
- 테스트 파일 추가
  - `apps/web/tests/OpsDashboard.test.tsx`
  - `apps/web/tests/TarotMastery.test.tsx`
- `quality-gate.yml`에 `test:unit` 단계 추가

### 4) 코드베이스 슬림화
- 현재 라우트에 미사용이던 페이지 이동
  - `ChatReading.tsx`, `Reading.tsx`, `StudyReading.tsx` → `apps/web/src/legacy/`
- `apps/web/src/legacy/README.md` 추가

## 검증
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run test:unit --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

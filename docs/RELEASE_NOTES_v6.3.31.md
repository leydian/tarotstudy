# Release Notes v6.3.31

## 개요
이번 릴리스는 요청하신 1~4번 항목을 모두 실행 가능한 형태로 마무리했습니다.
- 1) 임계치 기반 운영 지표 관리
- 2) 웹 사용자 흐름 회귀 테스트 강화
- 3) 리딩 텍스트 품질 규칙 강화(일반 리딩까지 확장)
- 4) 내부 운영 대시보드 추가

## 주요 변경

### 1) 임계치 기반 메트릭 운영
- `apps/api/src/ops/metrics.js` 신설
  - 메트릭 파싱/집계/임계치 평가 공통 모듈화
  - 기본 임계치:
    - fallback warn/critical: 15% / 25%
    - p95 warn/critical: 3500ms / 5000ms
- `apps/api/scripts/aggregate-metrics.js` 개선
  - 집계 결과에 `status(임계치 평가)` 포함
- `apps/api/scripts/check-metrics-thresholds.js` 추가
  - 임계치 critical 초과 시 exit code 1
- `apps/api/package.json`
  - `metrics:check`, `test:metrics` 추가

### 2) 웹 사용자 흐름 회귀 테스트 강화
- `apps/web/tests/validate-reading-flow-contract.js` 추가
  - 질문 입력→리딩→결과→리셋 핵심 상태 전이 계약 검증
  - loading, step 전환, baseline 메시지 복원, 접근성 live region 검증
- `apps/web/tests/validate-ui-contract.js` 보강
  - `/ops` 링크/라우트 존재 검증 추가
- `apps/web/package.json`
  - `test:ui-flow` 스크립트 추가
- `.github/workflows/quality-gate.yml`
  - `test:metrics`, `test:ui-flow` 게이트 추가

### 3) 리딩 텍스트 품질 규칙 강화
- `apps/api/src/domains/reading/hybrid.js`
  - `enforceEvidenceQuality` 도입
  - evidence 항목별 오염 문자열 제거/보정
  - 역방향 claim + 낙관적 rationale 모순 자동 보정
  - rationale 전부 동일할 때 포지션 문맥을 덧붙여 단조화 완화
  - 품질 보정 시 `qualityFlags`에 `evidence_quality_rewritten` 기록
- `apps/api/tests/hybrid-resilience.js`
  - `testEvidenceQualityRewrite` 추가

### 4) 내부 운영 대시보드 추가
- API: `GET /api/admin/metrics` 추가 (`apps/api/src/index.js`)
  - `ADMIN_METRICS_KEY` 설정 시 `x-admin-key` 헤더 인증
  - 집계 리포트 + 임계치 상태 반환
- WEB:
  - `apps/web/src/pages/OpsDashboard.tsx`
  - `apps/web/src/pages/OpsDashboard.module.css`
  - `apps/web/src/App.tsx`에 `/ops` 라우트 및 네비 추가

### 5) 운영 문서 정비
- `docs/OPERATIONS_METRICS.md` 업데이트
  - `metrics:check`, `/api/admin/metrics`, `/ops` 대시보드 운영 방법 추가
- `docs/QUALITY_GATE.md` 업데이트
  - `test:metrics`, `test:ui-flow` 반영

## 검증
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

참고:
- `npm run metrics:check --prefix apps/api`는 현재 샘플 로그의 fallbackRate가 50%라서 의도대로 fail(exit 1)합니다.

# Release Notes v6.3.42

## 개요
요청에 따라 웹 앱의 운영 지표 페이지(`/ops`)를 사용자 노출 경로에서 완전히 제거했습니다.

## 주요 변경

### 1) `/ops` 라우트 및 네비게이션 제거
- `apps/web/src/App.tsx`
  - 데스크톱/모바일 네비게이션의 `운영 지표` 링크 제거
  - `/ops` 라우트 제거
  - `Activity` 아이콘 및 `OpsDashboard` import 제거

### 2) 운영 지표 UI 소스 정리
- 삭제:
  - `apps/web/src/pages/OpsDashboard.tsx`
  - `apps/web/src/pages/OpsDashboard.module.css`

### 3) 프론트 계약 테스트 갱신
- `apps/web/tests/validate-ui-contract.js`
  - 기존 `/ops` 링크/라우트 존재 검증을 삭제 기준으로 반전:
    - `to="/ops"` 미존재
    - `path="/ops"` 미존재

### 4) 미사용 테스트 정리
- 삭제:
  - `apps/web/tests/OpsDashboard.test.tsx`

## 검증
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 사용자 UI에서 운영 지표 페이지 접근이 완전히 제거됩니다.
- 타로 리딩/카드 기능 등 핵심 사용자 플로우에는 영향이 없습니다.
- 백엔드의 metrics 집계/관리 API는 이번 변경 범위에서 유지됩니다(웹 노출만 제거).

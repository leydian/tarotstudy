# Release Notes v6.3.60

## 개요
모바일 대응 2차 마무리 릴리즈입니다. safe-area, landscape, 입력/스크롤 충돌, 터치 안정성 등 실사용 이슈를 중심으로 보정했습니다.

## 주요 변경

### 1) 모바일 네비게이션/스크롤 제어 강화
- `apps/web/src/App.tsx`
- `apps/web/src/App.module.css`

변경 내용:
- 라우트 이동 시 모바일 메뉴 자동 닫힘 처리.
- 모바일 메뉴 오픈 시 `body` 스크롤 잠금 적용.
- 모바일 헤더/메뉴 레이아웃에 `safe-area-inset-top` 반영.

### 2) 전역 모바일 안정화 토큰/정책
- `apps/web/src/styles/theme.css`

변경 내용:
- `html`, `body` 가로 오버플로우 차단.
- `text-size-adjust` 고정으로 브라우저별 폰트 확대 편차 최소화.
- `prefers-reduced-motion` 대응 추가.

### 3) TarotMastery 모바일 실사용 보정
- `apps/web/src/pages/TarotMastery.module.css`

변경 내용:
- 1024px 이하에서 단일 흐름 기반 안정화.
- 입력 sticky 영역의 safe-area 여백/레이어 격리 강화.
- 480px 이하 및 모바일 landscape(<=900px) 전용 간격/높이 보정.

### 4) Cards/Home 모바일 마무리
- `apps/web/src/pages/Cards.module.css`
- `apps/web/src/pages/Home.module.css`

변경 내용:
- Cards: sticky 검색바 safe-area 보정, 모달 높이/패딩/이미지 크기 제약 강화.
- Home: 카드 최소 높이와 landscape 간격 보정, CTA 터치 영역(44px+) 유지.

## 검증 결과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 백엔드/API 계약 변화 없음.
- 모바일에서 가로 스크롤/입력 겹침/모달 과밀 문제를 줄이고 조작 안정성을 강화했습니다.

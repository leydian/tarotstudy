# Release Notes v6.3.64

## 개요
이번 릴리스는 성소(TarotMastery) 화면에서 리딩 결과가 길어질 때 패널 자체가 계속 확장되는 문제를 제어하기 위한 레이아웃 고정 보강입니다.

핵심은 데스크탑/태블릿 구간에서 성소 컨테이너의 높이 기준을 고정해, 긴 리딩이 패널 내부 스크롤로만 처리되도록 만드는 것입니다.

## 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/RELEASE_NOTES_v6.3.64.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) 페이지 높이 기준 고정
- `.page`에 `height: calc(100vh - 88px)`를 추가해 데스크탑 기준 높이를 고정했습니다.
- `@supports (height: 100dvh)`에서는 `height: calc(100dvh - 88px)`로 대체해 모바일/브라우저 UI 높이 변화에 대응합니다.

### 2) sanctuary 높이 제약 재설계
- 기존 `min-height` 기반 제약에서 `height + max-height + min-height: 0` 조합으로 전환했습니다.
- `<=1024px` 구간도 같은 원칙을 적용해, 중간 폭에서 컨테이너가 콘텐츠 길이에 따라 늘어나는 현상을 차단했습니다.

### 3) 스크롤 동작 안정화
- 위 높이 고정으로 `rightPane` 내부 스크롤이 우선 동작하도록 기반을 고정했습니다.
- 모바일(`<=768px`)은 기존 유동형 정책(`height:auto`)을 유지해 모바일 UX는 그대로 보존했습니다.

## 검증
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 긴 리딩에서도 성소 레이아웃 크기가 무한 확장되지 않고, 패널 내부 스크롤 중심으로 동작합니다.
- 데스크탑/태블릿에서 스크롤 체감이 개선됩니다.

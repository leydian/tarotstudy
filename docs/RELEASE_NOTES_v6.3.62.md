# Release Notes v6.3.62

## 개요
이번 릴리스는 데스크탑/태블릿 폭에서 아르카나 성소의 내부 스크롤이 사라지고 리딩 본문이 페이지 전체로 늘어나는 문제를 해결합니다.

핵심 원인은 `max-width: 1024px` 구간에서 `workspaceGrid` 높이가 `auto`로 풀리며, `rightPane` 내부 스크롤 컨테이너의 높이 제약 체인이 끊어진 점이었습니다.

## 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/RELEASE_NOTES_v6.3.62.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) 1024px 구간 내부 스크롤 복구
- `@media (max-width: 1024px)`에서 다음을 수정:
  - `.workspaceGrid`  
    - `height: auto` -> `height: 100%`
    - `min-height: 0` 추가
  - `.leftPane`  
    - `min-height: 0` 추가
  - `.rightPane`  
    - `min-height: 0` 추가
    - 내부 스크롤(`overflow-y: auto`) 유지

효과:
- 긴 리딩이 페이지 전체를 밀어내지 않고 `rightPane` 내부에서 스크롤됩니다.

### 2) 모바일 규칙 충돌 방지
- `@media (max-width: 768px)`의 `.workspaceGrid`에 `min-height: auto`를 명시해 1024px 규칙과 충돌 없이 모바일 유동 레이아웃을 유지합니다.

효과:
- 1024px 이하 태블릿/노트북과 768px 이하 모바일의 스크롤 정책이 서로 덮어쓰며 깨지는 현상을 방지합니다.

## 검증
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 데스크탑/태블릿에서 성소 리딩 탐색성이 복구됩니다.
- 모바일 구간 기존 동작은 유지됩니다.

# Release Notes v6.3.16 (2026-02-28)

## 목적
`아르카나 성소` 리딩 화면의 공간 활용과 탐색 인지성을 높이고, 좌측 기본 카드 설명을 단문 요약에서 학습형 정보 블록으로 확장합니다.

## 핵심 변경
- 와이드 레이아웃 확장
  - 페이지 최대 폭: `1520px -> 1720px`
  - 메인 그리드 비율 조정: 좌/우 `46/54 -> 44/56`
- 우측 스크롤바 노출 강화
  - 스크롤 컨테이너를 `.messages`에서 `.rightPane`으로 변경
  - `overflow-y: scroll`, `scrollbar-gutter: stable both-edges` 적용
  - 커스텀 스크롤바(트랙/썸)로 시인성 강화
- 기본 카드 설명 심화
  - 항목 구성: `포지션 의미 + 카드 본문(최대 3문장) + 키워드 태그(최대 5개)`
  - `getCardBaseDescription()` 개선으로 `description/summary` 정규화 및 부족 길이 보강

## 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.16.md`

## 상세 구현
1. `TarotMastery.module.css`
- `.page` 최대 폭을 `1720px`으로 상향.
- `.workspaceGrid`를 `minmax(440px, 44%) minmax(560px, 56%)`로 변경.
- `.rightPane`에 스크롤 속성/가터/커스텀 스크롤바 스타일 추가.
- `.messages`는 내부 스크롤을 제거하고 패널 스크롤에 종속되도록 정리.
- `cardBasicsContext`, `cardBasicsKeywords`, `cardBasicsKeyword` 스타일 추가.

2. `TarotMastery.tsx`
- `getCardBaseDescription()`에서 본문을 문장 단위로 정리해 최대 3문장까지 노출.
- 텍스트가 짧은 경우 `summary`를 보강 결합해 정보 밀도 유지.
- 기본 카드 설명 UI에 포지션 설명(`info.posDesc`)과 키워드 태그 렌더링 추가.

## 기대 효과
- 넓은 데스크톱 화면에서 카드/리포트 병행 확인성이 향상.
- 우측 패널 스크롤 가능 여부가 명확해져 조작 혼란 감소.
- 좌측 기본 카드 설명이 탐구 탭에 가까운 깊이를 제공해 학습 경험 강화.

## 검증
- `npm run build --prefix apps/web`

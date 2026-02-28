# Release Notes v6.3.11 (2026-02-28)

## 목적
리딩 결과 화면의 가독성을 개선하고, 탐구 탭의 시각 흐름을 좌우 분산형에서 상하 집중형으로 전환합니다.

## 핵심 변경
- 폰트 크기 소폭 상향
  - 결과 화면 주요 텍스트(리포트/요약/지침/배지/탭/입력/메시지 버블)를 단계적으로 확대
- 탐구 섹션 레이아웃 변경
  - `studyGrid`를 다열(`auto-fill`)에서 1열 고정으로 변경
  - 데스크톱에서 `max-width`를 적용해 카드 텍스트 줄 길이 제어

## 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.11.md`

## 상세 구현
1. `TarotMastery.module.css`
- `studyGrid`: `grid-template-columns: 1fr` 고정, `max-width: 880px`, `margin: 0 auto`
- 주요 typography 상향:
  - `panelTitle`, `tabBtn`, `masterReportTitle`, `masterReportText`
  - `reportSummaryText`, `verdictBadge`, `counterpointTitle/list`
  - `arcanaTitle`, `arcanaItemText`, `inputField`
  - `studyCardPos/name/desc`, `studyTag`, `diagnosticPill`

2. `MessageBubble.module.css`
- 기본 버블 텍스트 및 액션 버블 텍스트 크기 상향
- 모바일 버블 폰트/패딩도 함께 상향해 일관 가독성 유지

## 기대 효과
- 리딩 결과 스크롤 시 문단 인지 속도 개선
- 탐구 카드의 읽기 순서가 위에서 아래로 고정되어 해석 흐름이 명확해짐

## 검증
- `npm run build --prefix apps/web`

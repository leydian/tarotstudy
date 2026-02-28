# Release Notes v6.3.18 (2026-02-28)

## 목적
`아르카나 성소` 좌측 하단 카드 패널을 탐구형 정보 구조로 통일하고, 화면 전반의 텍스트 가독성을 높이기 위해 폰트 스케일을 상향합니다.

## 핵심 변경
- 좌측 패널 `기본 카드 설명` -> `아르카나 탐구` 전면 대체
- 카드 렌더링을 탐구 카드 스타일(`포지션/카드명/맥락/상세설명/키워드`)로 통일
- 성소 화면 주요 텍스트 폰트 크기 상향
  - 헤더, 좌측 패널, 탭 버튼, 리포트 본문/요약, 배지/리스트, 입력창/버튼
- 메시지 버블 폰트 크기 상향(데스크톱/모바일 포함)
- 모바일 탭 버튼 폰트 규칙 중복 제거

## 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.18.md`

## 상세 구현
1. `TarotMastery.tsx`
- 좌측 하단 패널 제목을 `아르카나 탐구`로 변경.
- 기존 `기본 카드 설명` 아이템 구조를 제거하고, `studyCard` 기반 탐구 카드 UI로 교체.
- 카드 본문은 `card.description || card.summary`를 사용해 단문 요약 중심 표시에서 상세 본문 표시로 전환.

2. `TarotMastery.module.css`
- 타이포그래피 스케일 조정:
  - `panelTitle`, `cardBasicsTitle`, `cardBasicsEmpty`, `cardBasicsContext`
  - `tabBtn`, `studyCardPos`, `studyCardName`, `studyCardDesc`, `studyTag`
  - `diagnosticPill`, `masterReportTitle`, `masterReportText`, `reportSummaryText`, `verdictBadge`
  - `counterpointTitle`, `counterpointList`, `arcanaTitle`, `arcanaItemText`
  - `inputField`, `submitBtn`, `newQuestionBtn`
- 모바일 `.tabBtn` 중복 규칙 제거로 최종 폰트 크기 규칙 단일화.

3. `MessageBubble.module.css`
- `.bubble` 기본 폰트 상향 (`1.12rem -> 1.2rem`)
- `.bubbleAction` 폰트 상향 (`1.02rem -> 1.1rem`)
- 모바일 `.bubble` 폰트 상향 (`1rem -> 1.08rem`)

## 기대 효과
- 좌측 패널이 단순 요약 영역이 아닌 실질적인 학습 카드 영역으로 기능.
- 작은 글씨 비중 감소로 긴 리딩 문단의 읽기 피로도가 완화.
- 채팅/탐구/리포트의 텍스트 위계가 균형을 이루어 시각적 일관성 향상.

## 검증
- `npm run build --prefix apps/web`

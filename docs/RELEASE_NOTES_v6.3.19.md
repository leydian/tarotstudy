# Release Notes v6.3.19 (2026-02-28)

## 목적
좌측 영역에서 `카드 이미지`와 `아르카나 탐구`가 동시에 작게 보이던 구조를 제거하고, 토글 기반 단일 뷰로 전환해 각 콘텐츠의 표현 영역을 확대합니다.

## 핵심 변경
- 좌측 패널 2분할 구조 제거
- 좌측 전용 토글 탭 추가
  - `카드 스프레드`
  - `아르카나 탐구`
- 토글 선택된 뷰만 전체 좌측 뷰포트에 표시
- 새 리딩 시작/리셋 시 좌측 탭을 `카드 스프레드`로 자동 초기화

## 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.19.md`

## 상세 구현
1. `TarotMastery.tsx`
- `leftPaneTab` 상태(`spread | study`) 추가.
- 좌측 렌더링 구조를 다음 흐름으로 전환:
  - 탭 버튼 영역(`leftPaneTabs`)
  - 단일 컨텐츠 영역(`leftPaneViewport`)
- `leftPaneTab === 'spread'`일 때만 스프레드 렌더링.
- `leftPaneTab === 'study'`일 때만 아르카나 탐구 카드 리스트 렌더링.
- `handleStartRitual`, `handleReset`에서 `setLeftPaneTab('spread')` 호출로 초기 포커스 고정.

2. `TarotMastery.module.css`
- `leftPane`를 상하 grid에서 단일 column/flex 구조로 변경.
- 좌측 탭 스타일 추가:
  - `.leftPaneTabs`, `.leftPaneTabBtn`, `.leftPaneTabBtnActive`
- 단일 뷰포트 스타일 추가:
  - `.leftPaneViewport`
- 스프레드/탐구 패널이 좌측 높이를 충분히 쓰도록 높이 관련 스타일 조정:
  - `.topSpreadArea { height: 100%; }`
  - `.cardBasicsPanel { height: 100%; }`
  - `.leftStudyPanel` 보조 스타일 추가.

## 기대 효과
- 카드 이미지/탐구 설명 각각의 가시 영역이 넓어져 내용 파악이 쉬워짐.
- 사용자가 현재 목적(카드 배치 확인 vs 카드 의미 탐구)에 맞춰 집중 가능.
- 좌측 영역 정보 과밀이 줄어 화면 체감 품질 개선.

## 검증
- `npm run build --prefix apps/web`

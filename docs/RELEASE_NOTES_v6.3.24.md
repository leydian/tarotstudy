# Release Notes v6.3.24 (2026-02-28)

## 목적
모바일에서 성소 화면 사용 시 발생하던 스크롤 혼선, 작은 터치 타깃, 하단 입력 조작 불편을 줄여 읽기/입력 흐름을 안정화합니다.

## 핵심 변경
- 모바일 레이아웃을 고정 높이 중심에서 단일 세로 스크롤 중심으로 재배치.
- 모바일 탭/버튼/입력 필드의 터치 타깃을 44px 이상으로 확대.
- 입력 폼을 하단 sticky로 전환하고 safe area를 반영.
- 메시지/리포트 카드의 모바일 여백과 폰트 스케일을 재조정.

## 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `apps/web/src/App.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.24.md`

## 상세 구현
1. `TarotMastery.module.css`
- 모바일에서 `.page`를 `height: auto` + `min-height` 기반으로 전환.
- `.sanctuary`, `.mainContent`, `.rightPane`의 `overflow/min-height`를 모바일 전용으로 조정해 내부 스크롤 중첩 완화.
- `.leftPaneTabs`를 sticky 처리해 스크롤 중에도 탭 접근 유지.
- `.leftPaneTabBtn`, `.tabBtn`, `.newQuestionBtn`, `.inputField`, `.submitBtn`를 최소 높이 44px 이상으로 보정.
- `.inputForm`을 모바일에서 하단 sticky로 전환하고 `padding-bottom: calc(... + env(safe-area-inset-bottom))` 적용.
- 메시지/리포트 관련 패딩과 폰트 크기를 모바일 친화적으로 재조정.

2. `App.module.css`
- 모바일 `.main` 패딩 축소(`1.25rem 1rem -> 0.75rem 0.75rem`)로 가용 폭 확대.

3. `MessageBubble.module.css`
- 모바일 버블 최대 폭 확장(`92% -> 95%`).
- 모바일 버블 패딩/폰트/라인하이트를 조정해 밀집도 개선.

## 기대 효과
- 모바일에서 스크롤 컨텍스트가 단순해져 조작 난이도 감소.
- 탭 전환/입력/버튼 클릭의 오터치 가능성 감소.
- 긴 리딩 결과를 읽을 때 문단 밀도가 완화되어 가독성 개선.

## 검증
- `npm run build --prefix apps/web`

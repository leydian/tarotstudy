# Release Notes v6.3.14 (2026-02-28)

## 목적
`아르카나 성소` 우측 리딩 패널에서 스크롤 가능 여부를 더 명확히 보여주고, 스크롤바 유무에 따른 레이아웃 흔들림을 줄입니다.

## 핵심 변경
- 우측 메시지 영역(`.messages`)의 세로 오버플로를 `auto`에서 `scroll`로 전환
- `scrollbar-gutter: stable` 추가로 스크롤바 공간을 안정적으로 확보
- 기존 스크롤바 커스텀 스타일(`thin`, webkit thumb) 유지

## 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.14.md`

## 상세 구현
1. `TarotMastery.module.css`
- `.messages` 블록에 아래 속성 반영:
  - `overflow-y: scroll`
  - `scrollbar-gutter: stable`
- 기존 `scrollbar-width: thin`, `::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`는 변경 없이 유지.

2. 의도 및 트레이드오프
- 항상 보이는 스크롤바를 통해 사용자가 스크롤 가능한 영역임을 즉시 인지할 수 있음.
- 운영체제/브라우저 정책에 따라 스크롤바 시각 노출 강도는 다를 수 있으나, 레이아웃 공간은 고정되어 폭 점프를 최소화.

## 기대 효과
- 긴 리딩 결과에서 스크롤 인지성 향상
- 탭 전환/메시지 길이 변화 시 우측 패널 가로 폭 안정화
- 데스크톱 사용 시 읽기 흐름 저해 요소 감소

## 검증
- `npm run build --prefix apps/web`

# Release Notes v6.3.20 (2026-02-28)

## 목적
우측 결과 패널에서 탭 전환 조작을 제거하고, `운명의 리포트`를 단일 진입 흐름으로 제공해 읽기 집중도와 사용 단순성을 높입니다.

## 핵심 변경
- 우측 `운명의 리포트 / 아르카나 탐구` 탭 제거
- 우측 결과 영역을 리포트 단일 화면으로 고정
- 탭 연계 상태/핸들러/분기 렌더링 코드 정리

## 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.20.md`

## 상세 구현
1. `TarotMastery.tsx`
- `resultTab` 상태 제거.
- `handleTabSwitch()` 함수 제거.
- `useEffect(scrollToBottom, ...)` 의존성에서 `resultTab` 제거.
- 결과 영역에서 탭 헤더(`tabHeader`, 버튼 2개) 제거.
- `resultTab === 'study'` 분기(우측 아르카나 탐구 리스트) 제거.
- `handleReset()`의 `setResultTab('report')` 제거.

2. 결과 레이아웃 영향
- `step === 'result'`일 때 우측 패널은 항상 리포트 섹션(`resultSection`)을 렌더링.
- 기존 우측 탐구 정보는 좌측 토글 패널(`아르카나 탐구`)에서 접근하는 구조로 일원화.

## 기대 효과
- 결과 화면 진입 시 즉시 핵심 리포트를 확인 가능.
- 상단 토글 조작이 줄어 인지 부하 감소.
- 좌측(탐구) / 우측(리포트)의 정보 역할이 명확해짐.

## 검증
- `npm run build --prefix apps/web`

# Release Notes v6.3.22 (2026-02-28)

## 목적
1) 카드 스프레드 상단/측면 클리핑을 줄여 모든 카드가 화면 안에 안정적으로 보이도록 개선하고,  
2) 하이브리드 리딩 리포트에서 문장 중복/섹션 오염을 자동 정리해 결과 품질을 높입니다.

## 핵심 변경
- 스프레드 자동 맞춤(웹)
  - `TarotMastery`에서 스프레드 뷰포트 크기를 `ResizeObserver`로 실측.
  - 카드 렌더 박스(카드 본체 + 라벨) 기준 전체 bbox를 계산.
  - bbox 기준 `scale`, `offsetX`, `offsetY`를 자동 산출해 컨테이너 내부로 정렬.
  - 기존 모바일 강제 스케일(`.spreadCenter { transform: scale(0.4) }`) 제거.
- 리포트 품질 후처리(API)
  - `summary`/`verdict.rationale` 중복 감지(`isHighOverlap`) 및 rationale 재작성.
  - `counterpoints`, `actions`에 오염 패턴 필터 적용:
    - `사서의 통찰:`, `운명의 마스터 리포트`, `[운명의 판정]`, `[운명의 지침 n]` 등
  - 리스트 dedupe/길이 제한 및 기본 fallback 문구 보강.
  - 조사(`을/를`) 보정으로 템플릿 문장 자연스러움 개선.
  - `meta.qualityFlags` 추가로 품질 보정 이력 기록.

## 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/validate-persona-regression.js`
- `apps/web/src/types/tarot.ts`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.22.md`

## 상세 구현
1. `TarotMastery.tsx`
- `spreadViewportRef`, `spreadViewportSize` 상태 추가.
- 뷰포트 리사이즈 시 크기 업데이트.
- `getSpreadRenderConfig(spread, viewport)`를 bbox 기반 자동 맞춤 알고리즘으로 교체.
- 카드 좌표 계산을 `pos * scale`에서 `pos * scale + offset`으로 변경.
- 렌더 영역 최소 높이를 계산 결과(`areaHeight`)로 동적 적용.

2. `TarotMastery.module.css`
- 모바일에서 `.spreadCenter` 강제 축소 규칙 제거.

3. `hybrid.js`
- 텍스트 정규화/중복 탐지/조사 보정 유틸 추가.
- 리포트 후처리 함수(`postProcessReport`)로:
  - 중복 rationale 정리
  - 오염 문구 필터링
  - 항목 dedupe/길이 제한
  - 품질 플래그 수집
- 최종 응답 메타에 `qualityFlags` 포함.

4. 테스트/타입 동기화
- `validate-persona-regression.js`
  - `summary`와 `verdict.rationale` 중복 금지 검사 추가.
  - `counterpoints` 섹션 오염 문자열 포함 여부 검사 추가.
- `hybrid-resilience.js`
  - 중복 summary/rationale 자동 재작성 검증 시나리오 추가.
  - counterpoints/actions 오염 문자열 필터링 검증 시나리오 추가.
- `tarot.ts`
  - `ReadingResponse.meta.qualityFlags?: string[]` 타입 반영.

## 기대 효과
- 스프레드가 화면 경계 밖으로 벗어나 잘리는 체감 문제 완화.
- 리포트 요약/판정/지침 간 반복 및 섹션 간 텍스트 혼입 감소.
- 운영자가 보정 발생 원인을 메타로 추적 가능.

## 검증
- `npm run build --prefix apps/web`
- `npm run test:persona --prefix apps/api`
- `npm run test:hybrid --prefix apps/api`

# Release Notes v6.3.61

## 개요
이번 릴리스는 두 가지 사용자 체감 이슈를 직접 겨냥했습니다.

1. 월간/주간 종합운세에서 카드별 해석 문장이 길어지며 유사 비유가 반복되는 문제  
2. 모바일 성소 화면에서 내부 스크롤바가 사라져 긴 리딩 탐색이 어려운 문제

핵심은 **리딩 길이는 유지하면서 반복을 줄이고**, **모바일에서 내부 스크롤을 복원**해 읽기 경험을 개선하는 것입니다.

## 변경 파일
- `apps/api/src/domains/reading/report/evidence-templates.js`
- `apps/api/src/domains/reading/report/deterministic.js`
- `apps/api/src/domains/reading/report/fact-builder.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/RELEASE_NOTES_v6.3.61.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) evidence 이미지 문구 다양성 강화
- `EVIDENCE_IMAGERY_SENTENCE_TEMPLATES`를 tone별로 확장해 선택지가 늘어났습니다.
- `buildEvidenceClaim()`가 `usedImagerySet`을 받아 동일 리딩 내 중복 문구를 피하도록 변경됐습니다.
- `deterministic` 생성 시 카드 전체에서 `usedImagerySet`을 공유해 문장 분산을 강제합니다.

효과:
- 역방향 카드 다수 케이스에서 “멈춘 시계바늘…” 같은 동일 문구 반복 빈도 감소
- 길이는 유지하면서 표현 다양성 증가

### 2) postprocess 반복 감지 강화
- `reduceEvidenceRepetition()`가 인접 비교에서 최근 3개 슬라이딩 윈도우 비교로 강화됐습니다.
- claim 텍스트 유사도뿐 아니라 이미지 키워드 반복도 감지합니다.
- 반복 재작성 시 원인 플래그를 세분화해 운영 분석 가능성을 높였습니다.
  - `evidence_quality_rewritten_imagery_repeat`
  - `evidence_quality_rewritten_claim_overlap`

효과:
- 카드 연속 구간에서 문장 중복이 누적되기 전에 정리
- 품질 플래그로 사후 원인 추적 용이

### 3) 모바일 성소 내부 스크롤 복원
- 모바일/태블릿 구간의 `.rightPane`을 `overflow-y: auto`로 복원했습니다.
- 숨겨졌던 스크롤바를 얇은 스타일로 재도입했습니다.
- 긴 리딩에서 우측 패널 내부 스크롤로 즉시 탐색 가능하게 조정했습니다.

효과:
- “결과가 길어졌는데 스크롤바가 없다” 체감 문제 해소
- sticky 입력폼과 공존하는 탐색성 개선

### 4) 자동 하단 이동 로직 보정
- `TarotMastery.tsx`에 `rightPaneRef`를 도입해 내부 컨테이너 스크롤 기준으로 하단 이동 처리.
- 모바일은 `auto`, 데스크톱은 `smooth`로 동작을 분기해 과도한 스크롤 애니메이션을 완화했습니다.

## 테스트
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 리딩 텍스트 밀도는 유지하면서 반복 피로도를 낮췄습니다.
- 모바일 성소에서 긴 결과의 탐색 가능성이 회복됐습니다.

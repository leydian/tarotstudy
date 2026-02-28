# Release Notes v6.3.63

## 개요
이번 릴리스는 `overall_fortune` 리딩에서 “운명의 마스터 리포트가 너무 짧다”는 체감 문제를 해결하기 위한 품질 보강입니다.  
핵심은 summary 문장을 기간/기조 맥락에 맞춰 2~3문장으로 확장해, 실제 읽을 정보량을 늘리는 것입니다.

## 변경 파일
- `apps/api/src/domains/reading/report/domain-policy.js`
- `docs/RELEASE_NOTES_v6.3.63.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) 마스터 리포트(summary) 확장
- `buildFortuneSummary()`를 단문 중심에서 문단형(2~3문장)으로 확장했습니다.
- `trendLabel`별 구성:
  - `UP`: 상승 기조 + 과속 리스크 + 기간별 실행 팁
  - `CAUTION`: 속도 조절 권고 + 변동성 관리 + 기간별 실행 팁
  - `BALANCED`: 균형 기조 + 신호 교차 설명 + 기간별 실행 팁

효과:
- “운명의 마스터 리포트”가 한 줄로 끝나지 않고, 상태/맥락/실행 지점이 함께 제시됩니다.

### 2) 기간별 문장 품질 강화
- `today/week/month/year`별로 다른 실행 문장을 반환하도록 분기했습니다.
- 주간/월간/연간 리딩에서 동일한 문장 반복을 줄이고 맥락 적합도를 높였습니다.

### 3) 조사 결합 오류 수정
- 연간(`올해`) 케이스에서 발생하던 비문(예: `올해은`)을 방지하도록 조사 결합 구문을 정리했습니다.

## 검증
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과

## 영향 요약
- 마스터 리포트 본문 밀도가 증가해 “짧아서 빈약하다”는 체감이 완화됩니다.
- 한국어 문장 자연스러움(조사 결합)이 개선됩니다.

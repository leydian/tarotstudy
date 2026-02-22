# 스프레드 텔레메트리 기준선 점검

작성일: 2026-02-22  
대상 API: `/api/telemetry/spread-events`

## 측정 범위
- `relationship-recovery` 샘플 12건 draw 이벤트 기록
- 동일 샘플에서 review 저장 이벤트 일부 기록

## 측정 결과
- `spread_drawn`: 12
- `spread_review_saved`: 5
- 총 이벤트: 17
- draw 대비 review 저장률: 41.7%
- bySpread:
  - `relationship-recovery`: 17

## 기준 대비 판정
- 이벤트 누락률: 0%
  - 기대 draw 12건 / 실제 draw 12건
- 리뷰 저장률 기준(20% 미만 경고):
  - 측정값 41.7% → 기준 충족

## 결론
- 텔레메트리 적재 정상
- 현재 기준선에서는 `relationship-recovery`의 draw 대비 review 비율이 운영 하한(20%)보다 충분히 높음

## 재현 메모
- 원시 결과: `tmp/qa-sample-results-2026-02-22.json`

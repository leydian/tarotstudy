# 스프레드 텔레메트리 집계 운영 메모

작성일: 2026-02-22  
최종 갱신: 2026-02-22

## 목적
- 스프레드별 `draw -> review 저장` 전환율을 한 번에 점검합니다.
- 특정 스프레드의 복기 저장률 저하를 조기 탐지합니다.

## 실행 명령
```bash
npm run qa:spread-telemetry
```

실행 모드:
- `QA_API_MODE=auto`(기본): API 미기동 시 자동 기동
- `QA_API_MODE=external`: `API_BASE_URL` API 사용

## 산출물
- JSON: `tmp/spread-telemetry-report.json`
- Markdown: `tmp/spread-telemetry-report.md`

## 판정 기준
- 기본 경고 조건:
  - `draw >= 5` AND `reviewRate < 20%`
- 환경변수로 조정 가능:
  - `SPREAD_TELEMETRY_MIN_DRAWS` (기본 5)
  - `SPREAD_TELEMETRY_MIN_REVIEW_RATE` (기본 20)

## 참고
- API가 제공하는 `bySpreadType`를 우선 사용합니다.
- `bySpreadType`가 비어 있으면 `recent`(최대 80건) 기준으로 fallback 집계합니다.
- 서버 텔레메트리 원본은 `tmp/telemetry-store.json`에 영속 저장됩니다.

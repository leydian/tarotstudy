# Release Notes v6.3.66

## 개요
이번 릴리스는 사용자가 요청한 대로 `운명의 마스터 리포트`의 본문 밀도를 높여,
결론 섹션이 단문 요약으로만 끝나지 않고 카드 근거와 운세 세부 흐름을 함께 전달하도록 개선한 버전입니다.

핵심은 "결론 조립 로직"을 공통 함수로 재구성해,
`fullNarrative`가 있으면 해당 본문을 우선 노출하고,
없더라도 최소한 카드 근거 2개와 판정을 포함한 구조화된 리포트를 제공하는 것입니다.

## 변경 파일
- `apps/api/src/domains/reading/renderer.js`
- `apps/api/src/domains/reading/orchestrator.js`
- `docs/RELEASE_NOTES_v6.3.66.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) 마스터 리포트 결론 생성기 신설
- `renderer.js`에 `buildMasterReportConclusion()` 추가.
- 결론 생성을 단일 함수로 표준화해 경로별 길이/품질 편차를 줄였습니다.

### 2) 본문 우선 정책 적용
- `report.fullNarrative`가 존재하면 이를 결론 본문으로 우선 사용.
- 기존처럼 summary 한 줄로 축약되는 상황을 방지.

### 3) 본문 부재 시 자동 보강
- `fullNarrative`가 없는 경우에도 다음 구조를 생성:
  - 질문 기준 summary 문장
  - `[운명의 서사 분석]` 카드 근거 2개 브리지 문장
  - `[운명의 판정]`
- 결과적으로 리포트가 "짧게 끊기는" 체감을 완화.

### 4) 종합운세(overall_fortune) 상세 섹션 포함
- `readingKind === overall_fortune`일 때 결론 내부에 `[운세 세부 흐름]` 블록 추가:
  - 전체 에너지
  - 일·재물운
  - 애정운
  - 건강·마음
  - 메시지

### 5) 오케스트레이터 결론 선택 로직 교체
- `orchestrator.js`에서 `finalConclusion`을 단순 compact 분기 대신
  `buildMasterReportConclusion()` 결과 우선으로 변경.
- 상세 결론이 비어 있을 때만 기존 fallback 결론(summary/legacy) 사용.

## 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run build --prefix apps/web` 통과

## 기대 효과
- 마스터 리포트 길이와 정보 밀도가 질문 유형 전반에서 더 안정적으로 유지됨.
- "운명의 마스터 리포트가 너무 짧다"는 체감 이슈 완화.
- overall_fortune에서 본문과 하위 운세 블록 간 정보 연결성이 개선됨.

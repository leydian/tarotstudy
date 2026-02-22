# 세부내역: 백엔드 리딩/요약 품질

작성일: 2026-02-22  
최종 갱신: 2026-02-22

## 범위
- 파일:
  - `apps/api/src/index.js`
  - `apps/api/src/content.js`
  - `apps/api/src/data/spreads.js`

## 목표
- 질문 의도와 리딩 문체 정합성 강화
- 템플릿 반복 완화
- 실행 가능한 결론 구조화

## 주요 변경
1. `three-card` 전용 요약기 도입
- `summarizeSpread()`에서 `three-card`를 전용 요약기(`summarizeThreeCard`)로 분기
- 출력 구조를 다음으로 고정:
  - `결론`
  - `근거`
  - `충돌 점검`(필요 시)
  - `실행 가이드`
  - `한 줄 테마`
- 결론 등급:
  - `진행 권장`
  - `조건부 진행`
  - `보류 후 정비`

2. 학습/시험 맥락 분기 강화
- `inferThreeCardIntent()`로 `study` 맥락 분기 추가
- 시험/합격 질문에서 실행문장이 루틴/복기/분량 제어 중심으로 나오도록 조정

3. `study` 벤치마크 빌더 추가
- `buildStudyBenchmarkCoreMessage()`
- `buildStudyBenchmarkInterpretation()`
- 카드 의미를 시험 준비 맥락으로 자연스럽게 연결

4. 관계회복 요약 변주 3차
- `summarizeRelationshipRecovery()`의 `7일 행동 계획` 변주폭 확장
- `riskTheme`별 실행 루틴 분기 강화
- 중간 점검 문장(`planCheckpoint`) 추가

5. 주별 운세(`weekly-fortune`) 일자 분리 유지
- 포지션이 `월요일~일요일`인지 회귀 테스트로 고정
- 레거시 포지션(`주간 테마`, `월-화`, `수-목`, `주간 조언`) 재유입 방지

## 관련 테스트
- `apps/api/test/content-fallback.test.js`
  - 다중 카드/다중 맥락(커리어/재회/재정) 분기 회귀 검증
- `apps/api/test/weekly-fortune-spread.test.js`
  - 주별 운세 포지션 회귀 테스트

## 검증 명령
- `npm run test:api`
- `node --check apps/api/src/index.js`
- `node --check apps/api/src/content.js`

## 리스크/후속
- 질문 의도 분기 키워드가 늘어날수록 오탐 가능성이 있으므로 샘플셋 기반 회귀를 주기적으로 갱신 필요

# Release Notes v6.3.49

## 개요
이번 릴리스는 리딩 품질 벤치마킹 항목 중 **2~4번**을 deterministic 경로에 직접 반영한 개선입니다.  
핵심 목표는 다음 3가지입니다.
- 카드 해석의 단조로움 완화(이미지감 문장 1줄 추가)
- 결론 전달력 강화(선언 + 완충의 2단 구조)
- 실천 지침의 맥락 정합성 강화(도메인별 액션 2+조건부 1)

## 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `docs/RELEASE_NOTES_v6.3.49.md`
- `docs/CHANGELOG.md`

## 주요 변경

### 1) evidence claim 이미지 문장 추가(요구 2)
- `EVIDENCE_IMAGERY_SENTENCE_TEMPLATES`를 추가해 tone bucket별 이미지 문장을 준비했습니다.
- `buildEvidenceClaim(fact, coreMeaning, toneBucket, selectedTemplate, responseMode)`로 시그니처를 확장했습니다.
- `responseMode === balanced|creative`에서만 이미지 문장 1개를 결합하고, `concise`는 제외했습니다.

효과:
- 카드별 claim의 리듬/어휘가 더 살아나며 반복감이 줄어듭니다.
- 짧은 응답 모드에서는 과도한 수사를 피해 응답 밀도를 유지합니다.

### 2) 결론 2단 구조 도입(요구 3)
- `buildConclusionStatement()`와 `buildConclusionBuffer()`를 추가했습니다.
- deterministic summary를 아래 구조로 통일했습니다(균형/창의 모드):
  - `결론: ...`
  - `참고: ...`
- binary compact 질문은 기존 짧은 결론 스타일을 유지해 응답 길이 증가를 방지했습니다.

효과:
- 결론의 방향성과 실무적 완충 문장이 분리되어 읽기 쉬워졌습니다.
- 단정/경고 톤이 한 문장에 엉키는 문제를 완화했습니다.

### 3) 도메인별 액션 생성기 도입(요구 4)
- `buildDomainActions()`를 추가했습니다.
- 도메인(`lifestyle`, `career`, `relationship`, `finance`, `general`)과 `verdictLabel`, 질문 복잡도에 따라 액션을 생성합니다.
- 기본 2개 액션을 유지하되, 복합 케이스에서 조건부 3번째 액션을 추가합니다.

효과:
- 동일한 액션 문구 반복이 줄고, 질문 맥락에 맞는 실행 지침 비율이 높아집니다.
- 경량 질문은 부담을 줄이고, 복합 질문은 보완 행동을 명시합니다.

### 4) deterministic 파라미터 정렬
- `generateReadingHybrid()`에서 계산된 `responseMode`를 `buildDeterministicReport()`에 전달하도록 정렬했습니다.
- 모델 경로/디터미니스틱 경로 간 모드 정책 일관성을 강화했습니다.

## 테스트 보강
- `apps/api/tests/hybrid-resilience.js`에 신규 테스트 3개 추가:
  - `testImageryLineByResponseMode`
  - `testTwoStageConclusionSummary`
  - `testDomainActionCountRules`

## 검증 결과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과

## 영향 요약
- 리딩 문장 품질은 높이되, concise 모드 과장도를 제어했습니다.
- 결론 전달 구조가 명확해져 사용자 해석 피로가 줄어듭니다.
- 액션 항목이 도메인/복잡도에 맞게 분기되어 실천 가능성이 높아집니다.

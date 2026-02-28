# Release Notes v6.3.46

## 개요
리딩 맥락 이해 강화를 위해 API 관여 범위를 확장했습니다.  
핵심은 **v2 프로파일/리딩 엔드포인트**, **멀티의도 분석**, **최근 5턴 컨텍스트 반영**, **저신뢰 안전 강등**, **웹 v2 우선 호출+v1 폴백**입니다.

## 주요 변경

### 1) Question Profile v2 도입
- `apps/api/src/domains/reading/questionType.js`
  - 멀티의도 분석 함수 추가 (`inferQuestionProfileV2`)
  - 의도 사전 확장 (기존 6 + 확장 8)
    - `finance`, `family`, `friendship`, `self_growth`, `spirituality`, `education`, `relocation`, `legal`
  - 최근 컨텍스트(최대 5턴) 신호 반영
  - 개인정보 마스킹 적용 (이메일/전화/식별형 숫자 패턴)
  - 저신뢰 강등 규칙 적용:
    - `confidence < 0.48` 또는 `margin < 0.08`면 보수 모드 강등
    - `health/legal` 도메인은 `general_reading` 강제

### 2) API v2 엔드포인트 추가
- `apps/api/src/index.js`
  - `POST /api/v2/question-profile`
  - `POST /api/v2/reading`
  - v2 리딩 응답에 `analysis` 구조 포함
  - `meta`에 `confidence`, `lowConfidence`, `contextUsed` 포함
  - 운영 메트릭 로그 확장
    - `intentTop1`, `downgraded`, `confidence`, `lowConfidence`, `contextUsed`

### 3) Hybrid 엔진 메타 정합성 보강
- `apps/api/src/domains/reading/hybrid.js`
  - v2 profile의 `analysis`를 메타로 전달
  - 실제 결정된 `responseMode`를 `analysis.readingDecision.responseMode`에 주입

### 4) Web v2 우선 호출 + 하위호환 폴백
- `apps/web/src/services/tarotService.ts`
  - 프로파일/리딩 요청 시 v2 우선 호출
  - 실패 시 v1 (`/api/question-profile`, `/api/reading`) 자동 폴백
- `apps/web/src/types/tarot.ts`
  - `analysis` 타입 추가
  - 확장 domainTag 및 confidence/lowConfidence/contextUsed 타입 반영
- `apps/web/src/pages/TarotMastery.tsx`
  - `sessionContext.recentTurns` 전달 (최근 메시지 기반, 최대 5턴)

## 테스트 추가/갱신
- 신규:
  - `apps/api/tests/question-profile-v2.js`
  - `apps/api/tests/reading-v2-contract.js`
- 기존 회귀 유지:
  - `apps/api/tests/hybrid-resilience.js`
  - `apps/api/tests/overall-fortune-regression.js`
  - `apps/web/tests/validate-reading-flow-contract.js`

## 검증 결과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 질문 유형 처리 폭이 확장되어 복합 질의 맥락 해석력이 향상됩니다.
- 저신뢰/고위험 도메인에서 보수적 강등이 자동 적용되어 안전성이 강화됩니다.
- v2 전환 중에도 v1 폴백으로 서비스 연속성이 유지됩니다.

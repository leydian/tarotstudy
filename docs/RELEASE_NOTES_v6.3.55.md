# Release Notes v6.3.55

## 개요
reading report 계층의 1차 공격적 분할 릴리즈입니다. 기존 `report/shared.js` 대형 파일을 8개 이상의 정책/유틸 모듈로 분해하고, 오케스트레이션 계층에서 direct import를 허용하는 구조로 전환했습니다.

## 주요 변경

### 1) report/shared 대형 파일 분해
- `apps/api/src/domains/reading/report/text-utils.js`
- `apps/api/src/domains/reading/report/contamination-policy.js`
- `apps/api/src/domains/reading/report/verdict-policy.js`
- `apps/api/src/domains/reading/report/evidence-templates.js`
- `apps/api/src/domains/reading/report/domain-policy.js`
- `apps/api/src/domains/reading/report/fortune-policy.js`
- `apps/api/src/domains/reading/report/health-guardrail.js`
- `apps/api/src/domains/reading/report/fact-builder.js`

변경 내용:
- 텍스트 정규화/오염 차단/판정 정책/증거 템플릿/도메인 액션/운세 정규화/건강 가드레일/후처리 팩트 조합을 각 파일로 분리.
- `report/shared.js`는 기존 호환을 위한 재수출 집약 레이어로 축소(57줄).

### 2) direct import 전환
- `apps/api/src/domains/reading/orchestrator.js`
- `apps/api/src/domains/reading/quality-guard.js`
- `apps/api/src/domains/reading/renderer.js`
- `apps/api/src/domains/reading/report/deterministic.js`

변경 내용:
- 상위 계층이 필요한 정책 모듈을 직접 import하도록 변경.
- `report-builder -> shared` 단일 허브 의존을 완화해 모듈 결합도를 낮춤.

### 3) 유지보수성 개선 효과
변경 내용:
- 정책 변경 시 수정 파일 범위를 명확히 제한할 수 있음.
- 판정/문장/오염/운세 로직의 회귀 원인 파악이 쉬워짐.
- 파일 책임이 분리되어 코드 리뷰와 테스트 포인트 지정이 단순화됨.

## 검증 결과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 외부 API 계약 변경 없음.
- 내부 모듈 경계만 재구성되어 기능 변화 없이 구조적 유지보수성이 개선되었습니다.

# Release Notes v6.3.51

## 개요
리딩 엔진 대형 파일 분해 계획의 1차 단계로, 오케스트레이터 내부 헬퍼를 별도 모듈로 추출했습니다.  
목표는 외부 동작을 유지한 채 내부 책임을 분리해 후속 분할(quality/prompt/renderer 세분화) 기반을 마련하는 것입니다.

## 주요 변경

### 1) `engine-helpers` 모듈 신설
- `apps/api/src/domains/reading/engine-helpers.js`

포함된 책임:
- 상수/템플릿/정책값
- 문자열 정규화/오염 제거 유틸
- 카드 사실(facts) 및 deterministic report 생성
- 프롬프트 생성/수리 프롬프트 생성
- Anthropic 호출 및 재시도 판단 로직
- 후처리 보조 유틸(정규화/품질 플래그 보조에 필요한 공용 함수)

### 2) 오케스트레이터 축소
- `apps/api/src/domains/reading/orchestrator.js`

변경 내용:
- 기존 대형 헬퍼 정의를 제거하고 `engine-helpers` import로 전환
- 오케스트레이터는 검증/폴백 결정/메타 조립 중심으로 단순화

## 호환성
- 공개 API 계약 변경 없음
  - `generateReadingHybrid` 함수 시그니처 유지
  - `/api/reading`, `/api/v2/reading` 응답 필드 유지
- 기존 테스트/호출 경로 유지

## 검증 결과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 후속 예정
- 2차에서 `engine-helpers`를 `quality-guard`, `prompt-builder`, `model-client`, `renderer` 등으로 추가 세분화 예정

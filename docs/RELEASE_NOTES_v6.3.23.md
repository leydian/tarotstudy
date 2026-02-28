# Release Notes v6.3.23 (2026-02-28)

## 목적
1) 질문-스프레드 매칭 정확도를 높이고,  
2) 건강/증상 질문에서 과도한 단정형 리딩을 방지하며,  
3) 프론트/UI/테스트까지 동일 정책으로 정합성을 맞춥니다.

## 핵심 변경
- 질문 프로파일 v2 확장
  - `POST /api/question-profile`가 아래 필드를 반환:
    - `questionType`
    - `domainTag` (`health | relationship | career | emotional | lifestyle | general`)
    - `riskLevel` (`low | medium | high`)
    - `recommendedSpreadId`
    - `targetCardCount`
- 스프레드 선택 정책 전환
  - 웹에서 기존 cardCount 하드매핑을 제거하고 `recommendedSpreadId` 우선 선택.
  - `5장 질문 = career-path`로 고정되던 오분류 경로 제거.
- 헬스 가드레일 강제
  - health 도메인 질문은 리딩 결과를 `MAYBE` + `recommendedOption=NONE`으로 정규화.
  - summary/verdict/actions/counterpoints에 안전 안내(의료 대체 불가, 증상 악화 시 진료 우선) 주입.
  - health 도메인의 응답 모드를 `concise`로 제한해 과장/장문 서사 리스크 완화.
- 후처리 품질 강화
  - 오염 패턴 확장: `긍정의 기운`, `[영혼의 조율]`, `[운명의 실천]` 등 추가.
  - 리스트 항목에서 접두 오염 텍스트 제거 후 유사도 기반 dedupe 수행.
  - summary/verdict에도 오염 문자열 검사 및 자동 정리 적용.
- UI 정책 반영
  - health 맥락에서는 결과 배지를 `안전 안내`로 표시.
  - 결과에 의료 대체 불가 고지 박스를 별도 노출.
  - analytics 이벤트에 `domainTag/riskLevel`을 포함.

## 구현 상세
1. `apps/api/src/domains/reading/questionType.js`
- `inferQuestionProfile()` 신규 도입.
- risk/domain/recommended spread를 한 번에 산출하도록 분류기 구조 확장.
- 이진 질문 판별을 `아니면/vs/...` 연결어 + 복수 `까` 패턴 기반으로 보강.

2. `apps/api/src/index.js`
- `/api/question-profile` 응답을 프로파일 v2로 확장.
- `/api/reading`에서 같은 프로파일을 생성해 하이브리드 엔진으로 전달.
- legacy/fallback meta에도 `domainTag/riskLevel/recommendedSpreadId` 포함.

3. `apps/api/src/domains/reading/hybrid.js`
- 엔진 입력으로 `questionProfile` 수용.
- health 도메인 시 안전 가드레일을 모델 출력/폴백 결과 모두에 적용.
- contamination/dedupe/접두어 제거 후처리 강화.
- `meta`에 `domainTag/riskLevel/recommendedSpreadId` 기록.

4. `apps/web/src/pages/TarotMastery.tsx`
- 스프레드 선택을 `recommendedSpreadId` 우선으로 전환.
- health 결과 UI 정책(안전 안내 배지 + 안전 고지) 반영.
- 이벤트 추적에 프로파일 메타 포함.

5. 테스트 및 타입
- `apps/api/tests/hybrid-resilience.js`
  - health 질문에서 unsafe YES 출력이 들어와도 guardrail로 중립화되는지 검증.
- `apps/api/tests/reading-persona-regression.json`
  - 배탈 + 저녁 선택 질문 시나리오 추가.
- `apps/api/tests/validate-persona-regression.js`
  - `expectedDomainTag/expectedRiskLevel` 검증 추가.
- `apps/web/src/services/tarotService.ts`, `apps/web/src/types/tarot.ts`
  - 프로파일/메타 타입 확장.

## 기대 효과
- 건강 맥락 질문이 커리어 패스 스프레드로 잘못 라우팅될 확률 감소.
- 의료적 판단을 타로가 대체하는 것처럼 보이는 UX 리스크 완화.
- 프로파일링 정책과 UI/엔진/테스트가 동일 계약으로 연결되어 운영 안정성 향상.

## 검증
- `npm run test:hybrid --prefix apps/api`
- `npm run test:persona --prefix apps/api`
- `npm run build --prefix apps/web`

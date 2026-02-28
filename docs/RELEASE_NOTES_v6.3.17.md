# Release Notes v6.3.17 (2026-02-28)

## 목적
웹/서버 간 질문 유형 판정의 일관성을 확보하고, 사용자 체감 품질 지표를 수집할 운영 계측 경로를 추가하며, 성소 화면의 신뢰성/접근성을 강화합니다.

## 핵심 변경
- 질문 프로파일링 단일화
  - 공용 유틸 `apps/api/src/domains/reading/questionType.js` 신설
  - API 라우트/하이브리드 엔진이 동일 분류 규칙 사용
  - 신규 엔드포인트 `POST /api/question-profile` 도입
- 계측 API 도입 및 프론트 연결
  - 신규 엔드포인트 `POST /api/analytics`
  - `trackEvent()`가 `navigator.sendBeacon` 우선, 실패 시 `fetch(keepalive)` 폴백 전송
  - `sessionStorage` 기반 `sessionId` 부여
- 타입 계약 동기화
  - 웹 타입에 `meta.attempts`, `meta.failureStage`, `meta.timings.anthropicRepairMs` 반영
- 성소 UX 안정화
  - 리딩 reveal 타이머 큐 관리 + reset/unmount clear
  - reveal 메시지 생성 시 `report.evidence` 기반 조합으로 안정화
  - 진단 배지는 `?debug=1` 또는 개발환경에서만 표시
- 접근성 강화
  - 카드 인터랙션을 `button` 시맨틱으로 변경
  - `focus-visible` 스타일 및 ARIA 라벨 추가
  - `aria-live` 상태 안내 추가

## 변경 파일
- `apps/api/src/domains/reading/questionType.js`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/web/src/services/tarotService.ts`
- `apps/web/src/services/analytics.ts`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/common/TarotCard.tsx`
- `apps/web/src/components/common/TarotCard.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.17.md`

## 상세 구현
1. API: 질문 프로파일 엔드포인트
- 입력: `{ question, category }`
- 출력: `{ questionType, targetCardCount }`
- 프론트가 카드 수/질문 유형 판정을 서버 기준으로 사용

2. API: 분석 계측 엔드포인트
- 입력: `{ eventName, sessionId, timestamp, context }`
- 최소 필수값(`eventName`, `sessionId`) 검증 후 202 응답
- 개인정보 비수집, 구조화 로그 출력

3. Web: 성소 리딩 흐름 안정화
- 리딩 시작 시 기존 타이머/카드 상태 초기화
- 카드 reveal/결과 전환 타이머를 ref 큐로 등록 및 정리
- 문자열 파싱 의존도를 줄이고 구조화 `report.evidence` 우선 사용

4. Web: 진단 정보 노출 정책
- 기본 사용자 화면에서는 진단 pill 비표시
- 디버그 모드(`?debug=1`) 또는 개발환경에서만 표시

5. Web: 접근성
- 클릭 가능한 카드에 키보드 포커스/접근 라벨 부여
- 로딩/결과 상태를 `aria-live`로 전달

## 기대 효과
- FE/BE 질문 분류 불일치로 인한 스프레드 선택 오차 감소
- 사용자 퍼널(질문 제출→결과 확인→탭 전환→새 질문)의 운영 지표 수집 가능
- 리딩 진행 중 상태 전환 안정성 및 접근성 향상
- 일반 사용자에게 불필요한 기술 디버그 정보 노출 최소화

## 검증
- `npm run build --prefix apps/web`
- `npm run test:persona --prefix apps/api`
- `npm run test:hybrid --prefix apps/api`

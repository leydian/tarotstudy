# Release Notes v6.3.29

## 개요
이번 릴리스는 "회귀를 미리 막는 체계"를 만드는 데 집중했습니다.  
핵심은 품질 게이트 자동화, 종합운세 전용 회귀 테스트, 운영 메트릭 가시화입니다.

## 주요 변경

### 1) CI 품질 게이트 도입
- 파일: `.github/workflows/quality-gate.yml`
- PR 및 `main` push 시 아래 작업을 자동 실행합니다.
  - `npm run test:persona --prefix apps/api`
  - `npm run test:hybrid --prefix apps/api`
  - `npm run test:fortune --prefix apps/api`
  - `npm run test:ui-contract --prefix apps/web`
  - `npm run build --prefix apps/web`

### 2) 종합운세(today/week/month/year) 회귀 테스트 추가
- 파일: `apps/api/tests/overall-fortune-regression.js`
- 질문 기간별로 `readingKind`, `fortunePeriod`, `report.fortune.period` 정합성을 검증합니다.
- 스크립트: `npm run test:fortune --prefix apps/api`

### 3) 웹 UI 계약 회귀 테스트 추가
- 파일: `apps/web/tests/validate-ui-contract.js`
- 검증 항목:
  - 빠른 운세 버튼 4종(today/week/month/year) 유지
  - 탭 ARIA(`tablist`, `tab`, `tabpanel`) 유지
  - 메시지 key가 `msg.id`인지 유지
  - 카드 검색 `aria-label`, 필터 `aria-pressed` 유지
- 스크립트: `npm run test:ui-contract --prefix apps/web`

### 4) 운영 메트릭 로그 강화
- 파일: `apps/api/src/index.js`
- `/api/reading` 응답 시 `[Tarot Metric]` JSON 로그를 출력합니다.
- 포함 필드: `requestId`, `fallbackUsed`, `fallbackReason`, `failureStage`, `questionType`, `readingKind`, `fortunePeriod`, `totalMs`

### 5) 문서/코드 정합성 및 보안 정리
- `docs/ARCHITECTURE.md`: OpenAI 2순위 설명 제거, Anthropic + deterministic fallback 기준으로 갱신
- `docs/SETUP_SECURITY.md`: `.env.example` 기반 설정 및 현재 엔진 정책 반영
- `docs/QUALITY_GATE.md`: 자동 게이트 절차/CI 반영
- `.gitignore`: `apps/api/.env`, `apps/web/.env` 추가
- `apps/api/.env.example` 추가
- `apps/web/src/types/tarot.ts`, `apps/web/src/pages/TarotMastery.tsx`: `openai` 진단 타입/라벨 정리

## 파일별 상세 변경

- `.github/workflows/quality-gate.yml`
  - 저장소 공통 품질 게이트 파이프라인 신설.
  - API 회귀 3종 + WEB 계약 테스트 + WEB 빌드를 하나의 워크플로로 묶어 릴리스 전 자동 차단선 구성.
- `apps/api/tests/overall-fortune-regression.js`
  - 기간별 질문(오늘/이번주/이번달/올해)에 대해 `readingKind=overall_fortune` 및 기간 메타/리포트 일치를 검증.
  - 모델 키가 없는 환경을 강제해 fallback 경로에서도 출력 계약 유지 여부를 확인.
- `apps/web/tests/validate-ui-contract.js`
  - TarotMastery 핵심 UI 계약(빠른운세 버튼, 탭 ARIA, 메시지 key 안정성)을 정적 검증.
  - Cards 페이지 접근성 계약(`aria-label`, `aria-pressed`) 회귀를 탐지.
- `apps/api/src/index.js`
  - `[Tarot Metric]` 구조 로그 추가로 운영 시 fallback 원인/단계/지연시간 추적성 강화.
  - 기존 텍스트 로그와 함께 남겨 운영자 가독성과 머신 파싱 양쪽 지원.
- `apps/web/src/types/tarot.ts`
  - `ReadingResponse.apiUsed`에서 사용하지 않는 `openai` 유니온 제거.
- `apps/web/src/pages/TarotMastery.tsx`
  - 진단 배지 `apiUsed` 라벨에서 `OpenAI(legacy)` 제거, `none`은 `Legacy`로 표기 정리.
- `.gitignore`, `apps/api/.env.example`
  - API/WEB `.env`를 버전관리에서 제외.
  - `.env.example`로 신규 환경 설정 표준화.
- `docs/ARCHITECTURE.md`, `docs/SETUP_SECURITY.md`, `docs/QUALITY_GATE.md`
  - 엔진 체계(Anthropic + deterministic fallback)와 실제 운영 절차를 현재 코드와 일치하도록 갱신.

## 검증 결과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

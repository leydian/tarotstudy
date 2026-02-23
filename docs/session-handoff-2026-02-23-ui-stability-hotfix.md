# 세션 인수인계 상세 (2026-02-23) — Chat UI/응답정지 안정화 핫픽스

작성일: 2026-02-23  
최종 갱신: 2026-02-23 (hotfix)  
작업 경로: `/home/eunok/studycodex`

## 1) 배경
- 챗 리딩 페이지에서 `리딩 생성 중...` 상태가 길게 유지되거나, 진입 후 다른 페이지까지 응답이 멈춘다는 운영 이슈가 발생했습니다.
- 라이트 테마에서 챗 영역이 신 UI(매거진 레이아웃/색상 체계)로 완전히 반영되지 않는 시각 불일치가 확인됐습니다.
- 추천 질문의 본문/사이드 패널 노출이 중복되어 UX 품질이 떨어졌습니다.

## 2) 핵심 원인
1. 추천 질문 생성 병목
- `poolSize=3000` 후보를 매 렌더/입력 시점에 대량 생성하는 구조가 메인 스레드를 점유했습니다.
- 증상: 챗 화면 체감 정지, 라우트 이동 지연, 상호작용 응답 저하.

2. API URL 조합 중복 가능성
- `VITE_API_BASE_URL=/api` 구성에서 `/api/api/...` 형태 중복 경로가 발생할 수 있는 조합 경로가 있었습니다.
- 증상: API 재시도 루프, 쿼리 장기 대기, 홈/챗 데이터 로딩 지연.

3. 라이트 테마 우선순위 충돌
- 기존 `spreads.css` 라이트 테마 규칙과 신 UI `magazine.css` 규칙이 겹치며 일부 스타일이 덮였습니다.
- 증상: 챗 배경/입력창/버블이 구테마와 혼합 렌더링.

## 3) 적용 변경 (요약)

### 3.1 챗 UI 구조/상호작용
- `apps/web/src/pages/ChatSpreadPage.tsx`
  - 레이아웃을 `chat-workbench`(대화영역 + 우측 사이드 패널)로 유지 고정.
  - 본문 시작 질문(`starterPrompts`)과 우측 시작 질문(`sidebarStarterPrompts`)을 분리.
  - 본문 질문 집합을 기준으로 사이드 질문은 차집합으로만 채우도록 변경(중복 제거).

### 3.2 추천 질문 생성기 성능 개선
- `apps/web/src/lib/question-recommendations.ts`
  - 기존: 대규모 풀(Set) 생성 후 샘플링.
  - 변경: 요청 개수 기준의 경량 생성(조합 인덱싱)으로 전환.
  - `poolSize`는 유지(1000~10000 clamp)하되, 계산 비용은 제한.

### 3.3 API 요청 안정화
- `apps/web/src/lib/api.ts`
  - `buildRequestUrl()` 도입으로 `/api/api` 중복 경로 방지.
  - 요청 타임아웃(`VITE_API_TIMEOUT_MS`, 기본 12000ms) 도입.
  - timeout/실패 시 에러 메시지 명확화.

### 3.4 홈 화면 정지 체감 완화
- `apps/web/src/pages/HomePage.tsx`
  - 코스 로딩/에러 상태를 명시적으로 렌더링.
  - 에러 시 재시도 버튼 제공.
  - `nextActions` 실패 시 안내 메시지 출력.

### 3.5 라이트 테마 보정
- `apps/web/src/styles/magazine.css`
  - `:root[data-theme='light']` 기준 챗 영역 배경/버블/사이드패널/컴포저 override 추가.
  - 신 UI 색감이 라이트에서도 일관되게 반영되도록 우선순위 보강.

### 3.6 카탈로그 무결성/추천 품질 게이트
- `apps/api/test/spreads-catalog-integrity.test.js` 추가
  - `id/name` 고유성, 완전중복 정의 차단, 원카드류 의미 중복(유사명) 감시.
- `apps/web/test/question-recommendations.test.mjs` 추가
  - 추천 모듈 범위(1000~10000)와 챗 페이지 연결 사용 검증.
- `apps/web/test/smoke.test.mjs` 보강
  - 챗 워크벤치/사이드패널/중복 제거 로직 문자열 검증 추가.

## 4) 스프레드 중복 점검 결과
- 현재 `apps/api/src/data/spreads.js` 기준 스프레드 개수: 50
- `id` 중복: 0
- `name` 중복: 0
- 완전 동일 정의 중복: 0
- 레이아웃 템플릿 재사용 그룹: 존재(의도적 변형군으로 관리)
- `원카드 핵심흐름점검` 항목은 현재 데이터셋에 실재하지 않음(현재는 `one-card`만 존재)

## 5) 운영 가이드 보완
- `README.md`
  - `listen EPERM`/샌드박스 제한 환경에서 `QA_API_MODE=external` 사용 예시 추가.
  - QA/verify 명령 실행 시 외부 API 강제 모드 운영 경로 문서화.

## 6) 검증 로그
- `npm run -s lint` 통과
- `npm run -s typecheck:web` 통과
- `npm run -s test:web` 통과
- `npm run -s test:api` 통과

## 7) 관련 파일(핫픽스 포함)
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/question-recommendations.ts`
- `apps/web/src/pages/ChatSpreadPage.tsx`
- `apps/web/src/pages/HomePage.tsx`
- `apps/web/src/styles/magazine.css`
- `apps/web/src/styles/theme.css`
- `apps/web/test/smoke.test.mjs`
- `apps/web/test/question-recommendations.test.mjs`
- `apps/api/test/spreads-catalog-integrity.test.js`
- `README.md`

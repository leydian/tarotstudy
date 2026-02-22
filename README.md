# Tarot Study App

코스형 타로 학습 웹앱입니다.  
카드 도감/코스/퀴즈/스프레드 학습과 함께, 스프레드 실전 리딩/복기/정확도 리포트, 이미지 운영 관측 기능을 포함합니다.

## 빠른 시작
아래 명령 5줄을 순서대로 실행하면 바로 기동됩니다.

```bash
cd /home/eunok/studycodex
npm install
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env
npm run dev:api
npm run dev:web -- --host 127.0.0.1 --port 5173
```

접속:
- 웹: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787`

## 세션 인수인계
- 요약(핵심만): [SESSION_HANDOFF.md](./SESSION_HANDOFF.md)
- 인덱스: [docs/handoff/INDEX.md](./docs/handoff/INDEX.md)
- 상세 변경 내역: [docs/session-handoff-2026-02-22-details.md](./docs/session-handoff-2026-02-22-details.md)
- 후속 상세(2026-02-23): [docs/session-handoff-2026-02-23-details.md](./docs/session-handoff-2026-02-23-details.md)
- Codex 변경 요약: [docs/codex-updates-2026-02-22.md](./docs/codex-updates-2026-02-22.md)
- 관련 보고서:
  - [docs/persona-report-2026-02-22.md](./docs/persona-report-2026-02-22.md)
  - [docs/annual-fortune-job-timing-awkwardness-report-2026-02-22.md](./docs/annual-fortune-job-timing-awkwardness-report-2026-02-22.md)

## 최근 변경 요약 (2026-02-22)
- 원카드 리딩 품질 개선:
  - `핵심메시지(한 줄 결론)`와 `타로 리딩(근거/실행)`을 분리해 중복을 줄이고 결론을 빠르게 전달합니다.
  - 질문 맥락(커피/운동/연락/결제)에 맞춰 실행 문장을 다르게 안내합니다.
- 판정 체계 명확화:
  - 상태를 `완전 가능 / 조건부 가능 / 보류`로 구분해 “무조건 진행”과 “한 잔만” 같은 조건부 진행을 명확히 나눕니다.
- 문체 개선:
  - 과도한 단정 대신 가능성 기반 표현을 유지하면서, 벤치마킹한 부드러운 구어체 톤을 적용했습니다.
- 개발 비용 최적화:
  - `EXTERNAL_AI_MODE=cli`를 통해 개발/테스트 중 API 대신 Codex CLI 호출이 가능합니다.

## 구성
- `apps/api`: Fastify 백엔드 (카드/코스/퀴즈/설명/스프레드/운영관측 API)
- `apps/web`: React + TypeScript 프론트엔드

## 실행
1. 의존성 설치
```bash
npm install
```

2. API 환경변수 설정
```bash
cp apps/api/.env.example apps/api/.env
```

3. 웹 환경변수 설정
```bash
cp apps/web/.env.example apps/web/.env
```

웹 API 연결 권장값:
```env
VITE_API_BASE_URL=/api
```
- 개발 서버(Vite)에서 `/api` 프록시를 통해 `http://127.0.0.1:8787`로 전달됩니다.
- CORS/호스트 불일치 이슈를 줄이기 위해 로컬 개발에서는 `/api` 사용을 권장합니다.

4. API 환경변수 확인
```env
PORT=8787
HOST=127.0.0.1
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
EXTERNAL_AI_MODE=api
EXTERNAL_AI_URL=
EXTERNAL_AI_KEY=
EXTERNAL_AI_MODEL=
EXTERNAL_AI_CLI_COMMAND=codex
EXTERNAL_AI_CLI_CWD=
TAROT_IMAGE_MIRROR_BASE_URL=
```

5. 백엔드 실행
```bash
npm run dev:api
```

6. 프론트 실행 (새 터미널)
```bash
npm run dev:web -- --host 127.0.0.1 --port 5173
```

7. 접속
- 웹: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787`

## 핵심 API
- `GET /api/health`
- `GET /api/courses`
- `GET /api/courses/:courseId/lessons`
- `GET /api/cards`
- `GET /api/cards/:cardId`
- `POST /api/cards/:cardId/explain`
- `GET /api/spreads`
- `GET /api/questions/predicted?limit=100000`
- `POST /api/spreads/:spreadId/draw`
- `POST /api/quiz/generate`
- `POST /api/quiz/grade`
- `GET /api/learning/next-actions?userId=...`
- `GET /api/reviews/inbox?userId=...&spreadId=...&limit=...`
- `GET /api/analytics/funnel?window=7d|30d`
- `POST /api/events/batch`

### 이미지 운영/관측 API
- `POST /api/telemetry/image-fallback`
- `GET /api/telemetry/image-fallback`
- `POST /api/telemetry/spread-events`
- `GET /api/telemetry/spread-events`
- `GET /api/images/health-check`
- `GET /api/images/alerts?failRateThreshold=20&minChecks=6`

## 품질 게이트
- 코드 정적 점검:
```bash
npm run lint
```
- 웹 타입 점검:
```bash
npm run typecheck:web
```
- 웹 스모크 테스트:
```bash
npm run test:web
```
- API 텍스트 회귀 테스트:
```bash
npm run test:api
```
- 학습 리더 품질 자동 점검(필요 시 API 자동 기동):
```bash
npm run qa:learning-leader
```
- 연간운세 구조/톤 회귀 점검:
```bash
npm run qa:yearly-fortune
```
- QA 케이스셋 갱신(주기 실행 권장):
```bash
npm run qa:refresh-cases
```
- 관계 회복 스프레드 변주/반복률 정량 점검:
```bash
npm run qa:relationship-recovery
```
- 전 스프레드 요약 회귀 점검(판정/근거/테마 + 구조 규칙):
```bash
npm run qa:summary-regression
```
- 스프레드별 draw→review 전환율 집계 리포트:
```bash
npm run qa:spread-telemetry
```
- 핸드오프 문서 계층 무결성 점검:
```bash
npm run docs:check-handoff
```
- 전체 게이트 일괄 실행:
```bash
npm run verify:quality
```

### QA 실행 모드
- 기본값(`QA_API_MODE=auto`): API가 살아 있지 않으면 QA 스크립트가 API를 자동 기동합니다.
- 외부 API 강제(`QA_API_MODE=external`): `API_BASE_URL`의 API가 반드시 떠 있어야 합니다.
- 자동 기동 비활성(`QA_API_MODE=off`): API 자동 기동 없이 즉시 실패합니다.

## 주요 기능
- 카드 이미지 다중 소스 fallback (`imageSources`) + 기본 SVG fallback
- 카드 이미지 출처/라이선스 고지
- 스프레드 실전 드로우 및 포지션별 리딩 생성
- 관계 회복 5카드 스프레드(`relationship-recovery`) 제공
- 양자택일 비교 카드(A/B 근미래/결과) + 가중치 기반 결론/신뢰도
- 스프레드 복기 기록(맞음/부분맞음/다름 + 메모) 저장
- 전 스프레드 draw/복기 이벤트 텔레메트리 수집
- 대시보드 정확도 리포트(전체/스프레드 유형별)
- 리딩 템플릿 A/B 실험(`readingExperiment`)

## 비고
- 외부 AI API를 연결하지 않아도 fallback 템플릿 설명이 동작합니다.
- 개발/테스트 비용 절감이 필요하면 `apps/api/.env`에서 `EXTERNAL_AI_MODE=cli`로 설정해 Codex CLI를 사용해 카드 설명을 생성할 수 있습니다.
- CLI 모드 사용 시 사전 조건: `codex` 명령 사용 가능, 로그인 완료, 네트워크 연결 가능.
- 학습 진도/스프레드 복기 기록은 브라우저 로컬 저장소에 저장됩니다.
- 카드 이미지는 `TAROT_IMAGE_MIRROR_BASE_URL`를 설정하면 미러 URL을 우선 사용하고, 실패 시 원본(Wikimedia)으로 fallback됩니다.
- 서버 텔레메트리 통계는 `tmp/telemetry-store.json`에 영속 저장됩니다.

## CI
- GitHub Actions: `.github/workflows/ci.yml`
- PR/`main` push에서 아래를 자동 실행합니다.
  - `npm run lint`
  - `npm run typecheck:web`
  - `npm run test:web`
  - `npm run test:api`
  - `npm run build:web`
  - `npm run verify:quality`

## 트러블슈팅

### 1) 스프레드 페이지가 빈 화면으로 보일 때
- 브라우저 강력 새로고침 후 재확인 (`Ctrl+Shift+R`)
- 프론트 재빌드로 타입/런타임 오류 확인
```bash
npm run build:web
```
- API 응답 확인
```bash
curl -sS http://127.0.0.1:8787/api/spreads
curl -sS -X POST http://127.0.0.1:8787/api/spreads/choice-a-b/draw -H 'content-type: application/json' -d '{"level":"beginner","context":"점검"}'
```

### 2) API 실행 시 포트 바인딩 에러 (`EPERM`, `EADDRINUSE`)
- `apps/api/.env`에서 `HOST=127.0.0.1` 확인
- 다른 프로세스가 점유 중이면 정리 후 재실행
```bash
pkill -f "node --watch src/index.js"
npm run dev:api
```

### 3) 웹 서버가 안 뜨거나 404만 나올 때
- 권장 실행 명령으로 재기동
```bash
pkill -f "vite --host 127.0.0.1 --port 5173"
npm run dev:web -- --host 127.0.0.1 --port 5173
```
- 루트 응답 확인
```bash
curl -sSI http://127.0.0.1:5173/
```

### 5) 카드 도감에서 `Network request failed: Failed to fetch`가 뜰 때
- API 서버 실행 상태 확인:
```bash
npm run dev:api
```
- 웹 서버 재시작:
```bash
pkill -f "vite --host 127.0.0.1 --port 5173"
npm run dev:web -- --host 127.0.0.1 --port 5173
```
- 브라우저에서 프록시 확인:
```bash
curl -sS http://127.0.0.1:5173/api/health
```

### 4) 서버 중복 실행으로 동작이 불안정할 때
- API/WEB 모두 정리 후 순서대로 재기동
```bash
pkill -f "node --watch src/index.js"
pkill -f "vite --host 127.0.0.1 --port 5173"
npm run dev:api
npm run dev:web -- --host 127.0.0.1 --port 5173
```

### 5) 이미지 로딩 실패가 많을 때
- 헬스체크/경고 API로 현재 상태 확인
```bash
curl -sS http://127.0.0.1:8787/api/images/health-check
curl -sS "http://127.0.0.1:8787/api/images/alerts?failRateThreshold=20&minChecks=6"
```
- 미러를 쓰는 경우 `apps/api/.env`의 `TAROT_IMAGE_MIRROR_BASE_URL` 값 확인

# Codex 변경사항 정리 (2026-02-22)

## 개요
- 목적: 원카드 리딩의 실전 체감 품질 개선
- 핵심 방향:
  - API 비용 절감을 위한 CLI 호출 모드 지원
  - 원카드 응답의 결론/근거/실행 구조 고도화
  - 질문군(커피/운동/연락/결제)별 상태 라벨 및 행동 가이드 강화
  - 문체를 부드러운 구어체로 조정

## 주요 변경

### 1) 외부 생성기 모드 확장 (API + CLI)
- 파일: `apps/api/src/external-ai.js`
- 변경:
  - `EXTERNAL_AI_MODE=api|cli` 분기 추가
  - `cli` 모드에서 `codex exec` 호출로 생성 결과 수집
  - JSON 파싱 내구성 강화(직접 JSON + fenced JSON 대응)
  - 실패 시 `null` 반환하여 기존 fallback 동작 유지

### 2) 환경변수 및 문서 업데이트
- 파일: `apps/api/.env.example`, `README.md`, `apps/api/.env`
- 추가/수정:
  - `EXTERNAL_AI_MODE`
  - `EXTERNAL_AI_CLI_COMMAND`
  - `EXTERNAL_AI_CLI_CWD`
- 운영:
  - 개발/테스트 시 CLI 모드로 전환 가능

### 3) 원카드 요약/판정 로직 개선
- 파일: `apps/api/src/index.js`
- 변경:
  - 예/아니오형 질문 감지 로직 정리
  - 리스크 기반 3단계 판정 강화
    - 완전 가능 / 조건부 가능 / 보류(또는 금지)
  - 질문군별(커피/운동/연락/결제) verdict 문구 분리
  - 요약 실행 문장 중복 완화

### 4) 원카드 본문 리딩 품질 개선
- 파일: `apps/api/src/content.js`
- 변경:
  - `coreMessage`와 `interpretation` 역할 분리
    - `coreMessage`: 공감 + 카드 + 한 줄 결론
    - `interpretation`: 근거 키워드 + 카드 상징 + 타이밍 + 실행 + 기대 결과
  - 질문군별 브릿지 문장 강화
    - 커피/운동/연락/결제
  - 연락 질문의 맥락 번역 보정
    - `통제/집중` 등 키워드의 자연스러운 대화 맥락화
  - 카드 보편 브릿지 확장
    - 메이저 22장 테마 맵
    - 마이너 슈트/랭크 테마 맵
  - 문장 자연화
    - 조사 보정
    - 반복 문장 축소
    - 가능성 표현 유지(과신 단정 회피)

## 벤치마킹 반영 요약
- 반영한 요소:
  - 공감 문장 선행
  - 결론의 조기 제시
  - 카드 상징(2~3개) 압축 전달
  - 질문 맥락에 맞는 행동 지시
  - 결과 기대 문장(가능성 기반)
- 유지한 안전 장치:
  - 과도한 단정/과신 표현 지양
  - 보류/금지 시 감정 완충 + 대안 행동 제시

## 확인 사항
- 문법 체크:
  - `node --check apps/api/src/index.js`
  - `node --check apps/api/src/content.js`
  - `node --check apps/api/src/external-ai.js`
- 샘플 검증:
  - `커피를 마셔도 될까?`
  - `운동할까말까?`
  - `연락할까말까?`
  - `결제해도 될까?`

## 비고
- 현재 작업 디렉터리는 기존 `.git`이 없는 상태였음.
- GitHub 업로드를 위해 저장소 초기화 및 원격 연결이 추가로 필요함.

---

## 추가 업데이트 (카드 설명 분기 고도화)

### A) 기본 카드 설명(비-심화) 분기 강화
- 파일: `apps/api/src/data/cards.js`
- 변경:
  - 입문 설명 1/2/3줄 모두 카드 중심 분기로 전환
    - `buildBeginnerKeywordLine()`
    - `buildBeginnerFlowLine()`
    - `buildBeginnerLearningPoint()`
  - 마이너 학습 포인트를 수트+랭크+키워드 조합으로 확장
  - 중급 기본 설명도 카드별/수트별/맥락별 분기로 전환
    - `buildIntermediateDescription()`
    - `buildIntermediateRankLine()`

### B) 심화 설명 분기/품질/속도 개선
- 파일: `apps/api/src/content.js`
- 변경:
  - 메이저 22장, 마이너 56조합 분기 강화
  - 섹션별 최소 3줄 보장
  - 반복 문구 완화(정방향/역방향/조언 변주)
  - `love`/`career` 전용 빌더 추가
    - 카드/난이도/맥락 기반 세분화
    - 관계 맥락: 재회/회복, 갈등
    - 커리어 맥락: 면접/지원, 프로젝트, 학습
  - 빠른 fallback 반환 + 후속 캐시 갱신 전략으로 응답성 개선

### C) API/프론트 연결 개선
- 파일: `apps/api/src/index.js`
  - `/api/cards`, `/api/cards/:cardId`에서 기본 설명을 동적 생성
  - `context` 쿼리 반영
  - 동일 카드 문구 안정화를 위해 로테이션(variant seed) 제거
- 파일: `apps/web/src/pages/CardDetailPage.tsx`
  - 심화 설명 줄바꿈 렌더링 개선
- 파일: `apps/api/src/external-ai.js`
  - 입문/중급 프롬프트 가이드 분리
  - 3줄 이상 출력 지시 강화

### D) 중복 완화 결과
- 반복됐던 대표 문구 다수 제거/치환:
  - 입문 기본 설명 공통 문장
  - 중급 기본 설명 공통 문장
  - 심화 설명의 관계/일학업 공통 문장
- 같은 카드는 항상 같은 기본 문구를 사용하도록 고정

### E) 관련 커밋 (추가 구간)
- `a2214fd`, `07a5e67`, `5b731d0`, `a8753e2`, `c0fae16`, `974cd64`, `9ca2ac6`, `229ea45`, `c9fe9ca`, `374d9ae`

---

## 추가 업데이트 2 (운영 안정화 + 기능 확장 + 맥락 강분기)

### 1) 품질 게이트 자동화
- 파일:
  - `package.json`
  - `scripts/run-learning-leader-qa.mjs`
  - `scripts/yearly-fortune-regression-check.mjs`
  - `scripts/yearly-fortune-regression-cases.json`
  - `.github/workflows/quality-gates.yml`
- 변경:
  - 로컬/CI 공통 품질 게이트 정비
    - `npm run test:api`
    - `npm run qa:learning-leader`
    - `npm run qa:yearly-fortune`
    - `npm run verify:quality`
  - 학습 리더 QA 시 API 자동 기동
  - 연간운세 구조/톤 회귀 자동 점검

### 2) API 테스트 확장
- 파일:
  - `apps/api/test/cards-descriptions.test.js`
  - `apps/api/test/content-fallback.test.js`
  - `apps/api/test/relationship-recovery-spread.test.js`
- 변경:
  - 설명 안정성/맥락 반영/페르소나 분리 회귀 테스트 추가
  - 신규 스프레드 정의/리딩 템플릿 검증 추가

### 3) 관계 회복 5카드 스프레드 추가
- 파일:
  - `apps/api/src/data/spreads.js`
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 변경:
  - `relationship-recovery` 스프레드 정의/레이아웃/학습 가이드 추가
  - 전용 리딩 템플릿 추가
  - 전용 요약(`핵심 진단 → 관계 리스크 → 7일 행동 계획`) 추가

### 4) 스프레드 이벤트 텔레메트리 추가
- 파일:
  - `apps/api/src/index.js`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/pages/SpreadsPage.tsx`
- API:
  - `POST /api/telemetry/spread-events`
  - `GET /api/telemetry/spread-events`
- 이벤트:
  - `spread_drawn`
  - `spread_review_saved`

### 5) 카드 상세 질문 맥락 반영 강화 + UX 버그 픽스
- 파일:
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/pages/CardDetailPage.tsx`
- 변경:
  - 기본 카드 조회에 `context` 쿼리 전달
  - 질문 입력 시 카드 설명 재조회 키 확장
  - 입력 중 이전 데이터 유지(`placeholderData`)로 타이핑 끊김 완화
  - 심화 생성 시 최신 `{ level, context }`를 명시 전달

### 6) 심화 설명 전 섹션 맥락 강분기
- 파일: `apps/api/src/content.js`
- 변경:
  - `inferExplanationContext()`
  - `buildContextFocusLines()`
  - `buildCrossDomainLine()`
- 적용 섹션:
  - `coreMeaning`
  - `symbolism`
  - `upright`
  - `reversed`
  - `love`
  - `career`
  - `advice`
- 효과:
  - 동일 카드에서도 질문 맥락(예: 이직/재회/재정)에 따라 전 섹션 문장 차이가 명확하게 발생

### 7) 관련 커밋 (추가)
- `0c3ae28` Add automated quality gates for reading regressions
- `9ffa015` Add relationship-recovery spread and telemetry hooks
- `861df93` Strengthen context-aware card explanations across all sections

---

## 추가 업데이트 3 (관계회복 QA 2차 + 켈틱 장문 벤치마킹 반영)

### 1) 관계회복 정량 QA 게이트 도입
- 파일:
  - `scripts/relationship-recovery-variation-check.mjs`
  - `package.json`
  - `README.md`
  - `docs/relationship-recovery-manual-qa-2026-02-22.md`
- 변경:
  - `qa:relationship-recovery` 명령 추가
  - `verify:quality`에 관계회복 QA 포함
  - 샘플 50회 기준 정량 지표 계산:
    - `exactPairRate`
    - `highSimilarityPairRate`
    - `distinctRatio`
    - 구조/행동문 실패 수
  - 리포트 산출:
    - `tmp/relationship-recovery-variation-report.json`
    - `tmp/relationship-recovery-variation-report.md`

### 2) 연간운세 회귀 케이스 확장(비-커리어 포함)
- 파일:
  - `scripts/yearly-fortune-regression-cases.json`

---

## 추가 업데이트 4 (2026-02-23: 원카드/일별 어색함 보정 + 학습 코치 전환)

### 1) 원카드/일별 질문 의도 분기 보정
- 파일: `apps/api/src/index.js`, `apps/api/src/content.js`
- 변경:
  - `오늘 운세는?`를 예/아니오 질문에서 제외
  - 정보형 질문(`운세/흐름/해석`)은 daily intent로 분리
  - 결론 문체를 `진행/가능` 중심에서 `흐름/운영` 중심으로 조정

### 2) 카드 의미 정합성 보정
- 파일: `apps/api/src/data/cards.js`, `apps/api/src/content.js`
- 변경:
  - `컵 4`: `감정 점검/권태/거리두기`
  - `소드 8`: `제약/불안/관점 전환`
  - `소드 킹`: `판단/원칙/명료함`
  - 카드별 고유 의미와 출력 문체의 정합성 강화

---

## 추가 업데이트 6 (질문 뱅크 대규모 확장 + 분기 통합 + UI 정리)

### 1) 질문 뱅크 확장 (`100,000` / `1,000`)
- 파일:
  - `apps/api/src/data/question-intents.js`
  - `apps/api/src/index.js`
  - `apps/api/test/question-intents.test.js`
  - `README.md`
- 변경:
  - 질문 뱅크 생성 로직을 `베이스 주제 50 × 시리즈 20 × 문항변형 10` 구조로 확장
  - 총 `100,000`문항, `1,000`주제 고정
  - API 엔드포인트:
    - `GET /api/questions/predicted?limit=100000`
    - 기본 `limit=100000`, 최대 `200000`
- 의도 분기:
  - `inferQuestionIntent()` 공통 유틸 사용
  - 질문 생성 시 의도 앵커(`커리어/관계/재정/학습/건강/운세`)를 함께 삽입해 분기 안정성 강화
  - 전수 분기 점검에서 `general` 누락 없이 분류되도록 보정

### 2) 스프레드 상단 UI 재정리 (종합 학습 내역)
- 파일:
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/styles.css`
- 변경:
  - 상단 `리딩 메시지` 영역에서 `상세 보기` 토글 제거
  - 상단 우측 패널을 포지션별 장문 코치 목록 대신 `종합 학습 내역` 요약(프레임/질문/검증)으로 전환
  - 카드별 상세 학습 내역은 하단 포지션 카드 블록에서 그대로 유지
- 목적:
  - `종합 리딩`과 `학습 코치`의 길이 불균형으로 인한 가독성 저하 완화

### 3) 양자택일 도시 선택 질문 분기 보정
- 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
  - `apps/api/test/choice-a-b-reading.test.js`
- 변경:
  - `부산을 갈까 광주를 갈까?` 유형을 지역/거점 선택으로 인식
  - 지역 전용 축 적용:
    - `이동 거리`, `정착 난이도`, `생활비`, `관계망/지원망`, `지속 가능성`
  - 회귀 테스트에 도시 선택 케이스 추가

### 4) 검증
- `npm run test:api` 통과
- `npm run build:web` 통과

### 5) 관련 커밋
- `e9699e6` Expand tarot question bank to 5000 across 50 topics
- `eaa8240` Scale question bank to 10000 questions across 1000 topics
- `571a610` Expand question bank to 100k questions across 1k topics
- `036c5d2` Simplify spread top panel with consolidated learning digest
- `b7e7443` Improve choice A/B location intent detection for city decisions

### 3) 학습 리더 코치 관점 전환
- 파일: `apps/api/src/content.js`, `apps/web/src/pages/SpreadsPage.tsx`
- 변경:
  - 행동 코칭 중심 문장을 타로 해석 복기 중심으로 전환
  - `카드 키워드/정역방향/포지션` 근거 점검 문구 강화
  - 코치 라벨 중복(`질문 점검 질문`) 제거 및 표기 정리

---

## 추가 업데이트 5 (2026-02-23: 일별 개선 패턴의 전 스프레드 확장 + 벤치마킹 반영)

### 1) 일별 운세 품질 패턴 전 스프레드 확장
- 파일: `apps/api/src/content.js`
- 확장 대상:
  - `weekly-fortune`
  - `monthly-fortune`
  - `three-card`
  - `choice-a-b`
  - `celtic-cross`
- 적용 함수:
  - `buildSpreadConsultingGuide()`
  - `buildOrientationCounselLine()`
  - `buildKeywordCounselLine()`
  - `buildCoreContextLine()`
  - `buildSpreadCoreLead()`
  - `buildLearningCoachFrame()`
- 효과:
  - 스프레드/포지션별 문장 역할 분리
  - 반복 템플릿 문장 감소
  - 학습 코치 포지션별 복기 기준 분기 강화

### 2) 벤치마킹 요소 반영(안전한 범위)
- 파일: `apps/api/src/index.js`
- 반영:
  - 종합 리딩에 `한 줄 테마` 추가
  - 스토리 연결 문장 강화(포지션 역할 → 카드 근거 → 실행)
  - 과장·운명 단정·과신 표현은 배제

### 3) 푸시/운영 경로 정리
- 이슈:
  - OAuth 토큰 `workflow` scope 부재로 `main` 푸시 차단
- 조치:
  - 워크플로우 커밋 제외 브랜치 생성: `publish/no-workflow-v2`
  - 원격 푸시 완료
  - PR 생성 링크:
    - `https://github.com/leydian/tarotstudy/pull/new/publish/no-workflow-v2`

### 4) 관련 커밋
- `666321c`, `5180d76`, `8e30e75`, `3399153`, `b254feb`, `bcbb6e7`, `f377bf9`
  - `scripts/yearly-fortune-regression-check.mjs`
  - `docs/yearly-fortune-regression-checklist.md`
- 변경:
  - 총 18케이스로 확장(커리어/관계/재정/일반)
  - 시기 표현, 커리어 도메인 단어, `언제 + 무엇` 결론 문장 회귀 규칙 강화

### 3) 켈틱 크로스 장문 리딩 고도화
- 파일: `apps/api/src/index.js`
- 변경:
  - `summarizeSpread()`에서 `celtic-cross`를 전용 요약기로 분기
  - `summarizeCelticCross()` 추가:
    - 10포지션 장문 해석 생성
    - 질문 의도 감지(`relationship-repair` 등) 기반 문체 분기
  - `buildCelticPositionLine()`:
    - 관계 화해 맥락 감정형 문체 강화
  - `buildCelticConclusion()`:
    - 결론 + 즉시 실행 문장 고정
    - `지금 실행할 한 문장: ...` 출력
  - 조사 어색함 1건 교정(`역방향로` -> 조사 자동 선택)

### 4) 운영 리포트 문서 추가
- 파일:
  - `docs/card-detail-context-branch-check-2026-02-22.md`
  - `docs/spread-telemetry-baseline-2026-02-22.md`
- 내용:
  - 카드 상세 맥락 분기 강도 검증 결과
  - 스프레드 텔레메트리 기준선 기록

### 5) 검증
- `npm run test:api` 통과
- `npm run qa:learning-leader` 통과
- `npm run qa:relationship-recovery` 통과
- `npm run qa:yearly-fortune` 통과
- `npm run verify:quality` 통과
- 켈틱 샘플 검증:
  - 입력 `친구랑 싸웠는데 어떻게 화해할까`에 대해 장문 summary 생성 확인

### 6) 관련 커밋
- `dc49a35` Enhance celtic-cross narrative and add relationship QA gate

---

## 추가 업데이트 4 (벤치마크 문체 전역 적용 + 질문의도 분기 고도화)

### 1) 반영 배경
- 사용자 피드백 기준 주요 문제:
  - 연애/대인/갈등 질문에 업무형 문체가 섞여 어색함
  - 카드가 달라도 같은 문장이 반복되어 템플릿 티가 강함
  - `친구와 싸움` 질문이 평판(social) 톤으로 해석되는 분기 오류
  - 원카드/3카드/5카드 간 결과 문체 일관성 부족

### 2) 요약 로직 개선 (`apps/api/src/index.js`)
- 주간/일간 문장 자연화:
  - 연애운에서 업무형 표현 제거 및 관계 맥락 행동 문장으로 교체
- 종합 리딩 도메인 분기 확장:
  - `relationship`, `finance`, `social`, `relationship-repair`를 전 스프레드에 적용
  - 도메인별 `두 갈래 조언`(확장 vs 조절) 구조로 일관화
- 원카드 품질 보정:
  - social 질문의 결론을 인식형 문장으로 전환
  - 충돌 키워드(예: 갈등)와 긍정 총평의 부조화 완화
  - yes/no 이유 문장에 카드 방향(정/역) 명시
- 관계 회복 5카드 요약 고도화:
  - 고긴장 카드군 감지(`minor-swords-three/five/six/nine/ten`, `major-15/16/18` 등)
  - `열림 신호` 과다 출력 방지
  - 리스크 문장을 감정 과속 중심에서 오해 타이밍 중심으로 보정

### 3) 상세 리딩 개선 (`apps/api/src/content.js`)
- 벤치마크 스타일 전역 확장:
  - relationship/finance/social 전용 코어/해석 빌더 도입 및 전 스프레드 적용
- social 전용 개선:
  - 3카드(과거/현재/미래) 포지션별 역할 분리
  - 같은 실행 문장 반복 축소 및 카드 성향별 실행 문장 차별화
- relationship-repair 전용 분기 추가:
  - `싸움/갈등/화해` 질문을 social보다 우선 인식
  - 갈등 회복 전용 코어/해석 빌더 추가
  - 관계 회복 5카드 포지션별 문장 역할 분리:
    - 문제: 트리거 규명
    - 해결방법: 대화 안전장치
    - 상대 관점 신호: 추측 금지 + 단서 수집
    - 회복 행동: 즉시 실행 1문장
    - 다음 7일 흐름: 리스크 타이밍 운영
  - 조사 어색함 보정(`...로/으로`)

### 4) 체감 개선 결과
- 질문 의도와 출력 문체 불일치 문제 완화
  - 예: `친구와 싸웠는데...`가 평판 해석으로 흐르던 현상 해소
- 카드별/포지션별 문장 차별화 강화
- 반복 고정 문장 축소로 가독성 및 자연스러움 개선
- 실행 지시가 “실제로 오늘 할 수 있는 행동” 단위로 구체화

### 5) 관련 커밋
- `4aaa67a` Refine weekly relationship reading tone and reduce template awkwardness
- `610748d` Improve daily relationship reading tone and expand summary guidance
- `6253394` Apply benchmark relationship style across all love readings
- `5345963` Apply benchmark finance style across all fortune spreads
- `6f392b0` Apply benchmark social style across all fortune spreads
- `66e6b3f` Reduce repetition and diversify social reading by position
- `c79a522` Polish one-card social reading tone and reduce awkward phrasing
- `4ca642c` Tune one-card social summary wording and keyword handling
- `c7cf5bb` Prioritize conflict-repair context over social perception tone
- `3b1d965` Refine one-card conflict-repair wording consistency
- `3a96405` Diversify relationship-recovery readings by position and card tension

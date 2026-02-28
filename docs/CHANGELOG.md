# Changelog

## [2026-02-28]

### 페르소나 기반 유지보수 체계 전면 도입 (v6.2.0)

#### 변경 사항
- **운영 기준 문서 신설 (`docs/PERSONA_CONTRACT.md`, `docs/QUALITY_GATE.md`)**:
    - 개발자/기획자/사용자 페르소나의 책임, 승인권, 우선순위를 명시.
    - 릴리스 품질 게이트(필수 응답 무결성, fallback 보장, 질문 유형 일관성) 기준을 고정.

- **리뷰 프로세스 강화 (`.github/pull_request_template.md`)**:
    - PR 단계에서 3페르소나 체크리스트를 강제해 회귀 가능성을 사전 차단.

- **리딩 API 메타 확장 (`apps/api/src/domains/reading/hybrid.js`, `apps/api/src/index.js`)**:
    - 응답에 `meta.questionType`, `meta.fallbackReason`을 추가해 운영 진단 가능성 강화.
    - 하이브리드 실패 시 서버 레벨 폴백 응답에도 동일 메타를 제공.

- **프론트 타입/계측 확장 (`apps/web/src/types/tarot.ts`, `apps/web/src/pages/TarotMastery.tsx`, `apps/web/src/services/analytics.ts`)**:
    - `ReadingResponse` 타입에 `meta` 필드를 추가.
    - 질문 제출/결과 노출/탭 전환/새 질문 클릭 이벤트를 계측하여 체감 품질 분석 기반 마련.

- **회귀 시나리오 자동 검증 도입 (`apps/api/tests/reading-persona-regression.json`, `apps/api/tests/validate-persona-regression.js`)**:
    - light/deep/relationship/career/binary/emotional 케이스를 고정 입력으로 검증.
    - `npm run test:persona --prefix apps/api`로 계약 무결성과 fallback 지속성을 자동 확인.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.2.0.md`

## [2026-02-28]

### 하이브리드 리딩 엔진 v6.1.2: 초안정성 강화 및 Vercel 최적화

#### 변경 사항
- **무정지 리딩 시스템(Ultimate Fallback) 구축 (`apps/api/src/domains/reading/hybrid.js`)**:
    - Anthropic/OpenAI API 호출 실패, 타임아웃, 또는 유효성 검증 실패 시 즉시 로컬 엔진(`v3.js`)으로 전환되는 3중 안전장치 구현.
    - 이제 API 서버나 네트워크에 문제가 생겨도 사용자에게는 끊김 없는 리딩 서비스 제공 가능.

- **정밀 디버깅 로그 시스템 도입**:
    - API 호출 실패 시 HTTP 상태 코드 및 상세 에러 메시지(Anthropic/OpenAI 측 응답)를 서버 로그에 기록하도록 개선.
    - Vercel 로그 대시보드에서 환경 변수 설정 오류나 할당량 초과 문제를 즉시 파악 가능.

- **Vercel 서버리스 환경 최적화 (`apps/api/src/index.js`)**:
    - Express 서버를 Vercel 서버리스 함수(Serverless Functions) 규격에 맞게 조정 (`export default app`).
    - 프로덕션 환경에서는 `app.listen`을 비활성화하여 리소스 낭비 방지 및 콜드 스타트 개선.

- **네트워크 탄력성 보강**:
    - API 호출부 전역에 `try-catch` 예외 처리를 적용하여 예기치 않은 런타임 에러로 인한 서버 다운 방지.

#### 검증
- API Key 부재 환경에서 로컬 엔진 자동 전환 확인.
- Vercel 배포 환경 호환성 검증.

## [2026-02-28]

### 하이브리드 리딩 엔진 v6.1.1: 문서 체계 혁신 및 보안 강화

#### 변경 사항
- **문서 아키텍처 재구축 (`docs/`)**:
    - `README.md`: 프로젝트 전체 조감도 및 빠른 시작 가이드로 전면 개편.
    - `docs/ARCHITECTURE.md`: 다층 엔진 구조(Claude/GPT/Legacy) 및 서사 생성 프로세스 상세 기록.
    - `docs/FEATURES.md`: 양자택일 분석, 질문 무게 감지, 동적 스프레드 시스템 명세화.
    - `docs/SETUP_SECURITY.md`: API 키 관리 지침 및 환경 변수 설정 가이드 신설.
    - 레거시 문서(`TAROT_LIBRARY_UPDATE.md`) 제거 및 정보 통합.

- **보안 프로세스 정교화**:
    - `.env` 파일의 Git 추적 방지를 위한 `.gitignore` 설정 재확인.
    - 커밋 프로세스에서 민감 정보(API Key) 포함 여부를 강제 점검하는 보안 워크플로우 적용.

#### 검증
- 모든 문서 링크 및 마크다운 문법 확인.
- `.env` 파일의 추적 제외 상태(Untracked) 재검증.

## [2026-02-28]

### 하이브리드 리딩 엔진 v6.1: 클로드(Anthropic) 서사 혁신

#### 변경 사항
- **Anthropic Claude 3.5 Haiku 엔진 연동 (`apps/api/src/domains/reading/hybrid.js`)**:
    - 문학적이고 공감적인 표현이 뛰어난 Claude 모델을 최우선 리딩 엔진으로 도입.
    - `ANTHROPIC_API_KEY` 환경 변수 기반의 안전한 API 통신 구조 구축.
    - 폴백 체인 강화: Anthropic (1순위) -> OpenAI (2순위) -> Legacy/Deterministic (3순위).

- **지능형 서사 생성(fullNarrative) 구현**:
    - 기존의 분절된 텍스트 합치기 방식에서 탈피하여, AI가 리딩 전체를 하나의 완결된 이야기로 써 내려가도록 개선.
    - 질문의 무게(가벼운 일상 질문 vs 진중한 고민)를 감지하여 어휘의 톤앤매너를 자동 조절하는 '지능형 톤 필터' 적용.
    - 조사 불일치 및 문장 연결 비문 문제를 근본적으로 해결.

- **양자택일(Binary) 분석 고도화**:
    - "할까 말까", "A vs B" 등 한국어 특유의 선택형 질문 패턴 인식률 향상.
    - 두 카드를 별개의 선택지로 완벽하게 대조 분석하여 명확한 선택의 근거를 제시.

- **인프라 및 보안 강화**:
    - `.env` 파일 명칭 및 위치 최적화 (`.env.txt` -> `.env`).
    - API 키 유출 방지를 위한 `.gitignore` 보안 설정 강화.

#### 검증
- `apps/api/src/domains/reading/hybrid.js` 코드 무결성 확인.
- Anthropic/OpenAI 다중 모델 지원 구조 검증.

## [2026-02-28]

### 하이브리드 리딩 품질 복원 패치 (v6.0.2)

#### 변경 사항
- **프론트엔드 UI 감성 정돈 (`apps/web/src/pages/TarotMastery.tsx`, `TarotMastery.module.css`)**:
    - 리포트 탭에서 "품질 지표", "신뢰도", "근거 이탈" 등 기계적인 기술 용어 노출을 전면 제거.
    - 리포트 본문의 서사성을 강화하기 위해 `v3.js`의 풍부한 텍스트를 최상단에 배치.
    - 하이브리드 요약문을 "사서의 통찰" 박스로 재구성하고, "운명의 판정"을 긍정/신중 배지 형태로 시각화.
    - 카드별 중복 근거 리스트를 제거하여 정보 과잉 해소.

- **리딩 엔진 페르소나 강화 (`apps/api/src/domains/reading/hybrid.js`)**:
    - AI 프롬프트를 "아르카나 도서관 사서" 페르소나에 맞춰 전면 수정하여 더 따뜻하고 통찰력 있는 문장 생성을 유도.
    - 폴백(Fallback) 서사 생성기(`toLegacyResponse`)와 판정 톤(`verdictTone`)을 감성적인 어조로 순화.
    - 기술적인 `verdict`, `rationale` 용어를 운명의 흐름과 기운에 대한 설명으로 대체.

#### 검증
- `vite build` 성공 (프론트엔드).
- `apps/api` 무결성 확인.
- UI/UX 테마 일관성 확인.

## [2026-02-28]

### 하이브리드 리딩 품질 복원 패치 (v6.0.1)

#### 변경 사항
- **기본 리딩 품질 복원 (`apps/api/src/domains/reading/hybrid.js`)**:
    - 하이브리드 응답에서도 `conclusion/evidence/action`은 기존 `generateReadingV3` 결과를 기본으로 사용하도록 변경.
    - API 키 미설정/모델 미사용 환경에서도 기존 서사형 리딩 품질을 유지.
    - 구조화 리포트(`report`)는 본문 대체가 아닌 근거 보강 계층으로 유지.

- **문장 품질 보정 (`apps/api/src/domains/reading/hybrid.js`)**:
    - deterministic 근거 문장에서 `"입니다.의 흐름"` 같은 비문이 발생하지 않도록 `claim` 생성 로직을 정리.
    - 카드 요약문 말미 마침표를 정규화해 자연스러운 문장 출력 보장.

- **리포트 탭 렌더링 우선순위 조정 (`apps/web/src/pages/TarotMastery.tsx`)**:
    - 마스터 리포트 본문은 다시 `reading.conclusion`(기존 고품질 서사)을 우선 출력.
    - `reading.report.summary`는 `근거 요약`으로 분리해 보조 정보로 제시.
    - 실행 지침은 구조화 보조 액션 대신 기존 `reading.action`을 기본 출력하도록 복원.

#### 검증
- `vite build` 성공.
- `POST /api/reading` 응답 검증:
    - 레거시 서사 본문(`conclusion`) 유지 확인
    - 구조화 리포트(`report/quality`) 동시 제공 확인
    - fallback 환경에서도 품질 저하 없이 동작 확인

### 하이브리드 리딩 엔진 도입 (Reading Hybrid v6.0)

#### 변경 사항
- **하이브리드 엔진 신규 추가 (`apps/api/src/domains/reading/hybrid.js`)**:
    - 규칙 기반 카드 팩트 추출 + 구조화 리포트 생성 + 검증(Consistency) 계층을 구현.
    - OpenAI API 키가 있을 때는 모델 기반 구조화 리포트를 시도하고, 실패 시 deterministic 결과로 자동 폴백.
    - `unsupportedClaimCount`, `consistencyScore`, `regenerationCount`를 산출하여 품질을 수치화.
    - `A vs B` 및 `A 할까 B 할까` 계열 질문의 엔티티 추출을 보강하여 양자택일 해석 정확도 개선.

- **리딩 API 계약 확장 (`apps/api/src/index.js`)**:
    - `POST /api/reading`가 `mode`, `spreadId`, `sessionContext`, `structure`, `debug` 파라미터를 지원.
    - `mode=legacy`일 때 기존 v3 서사 응답 유지, 기본값은 `hybrid`.
    - 하이브리드 실패 시 서버 레벨에서 레거시 폴백 응답 제공.
    - `POST /api/reading/ab` 신규 추가: 동일 입력으로 legacy/hybrid 결과를 병렬 비교 가능.

- **프론트 타입/서비스 확장 (`apps/web/src/types/tarot.ts`, `apps/web/src/services/tarotService.ts`)**:
    - `ReadingResponse`에 `report`, `quality`, `fallbackUsed`, `mode` 필드 추가.
    - `getReading` 호출 옵션 확장(모드/구조/세션 컨텍스트/디버그).

- **TarotMastery UI 개편 (`apps/web/src/pages/TarotMastery.tsx`)**:
    - 요청 시 하이브리드 모드 및 세션 최근 질문 컨텍스트를 전달.
    - 결과 화면을 근거 중심으로 개선:
        - 핵심 요약/판정
        - 카드별 근거(claim/rationale/caution)
        - 반례/주의점
        - 품질 지표(consistency, unsupported claims, regeneration)
    - 구조화 리포트가 없는 경우 기존 결론/지침 필드를 사용하도록 하위호환 유지.

#### 검증
- `vite build` 성공으로 프론트 번들 안정성 확인.
- 하이브리드 엔진 모듈 로드 및 샘플 질문 실행으로 런타임 정상 동작 확인.
- API 키 미설정 환경에서 deterministic fallback 경로 정상 동작 확인.

### Vercel 배포 실패 해결: Web 앱 설정 파일 복구

#### 변경 사항
- **Vite 및 TypeScript 설정 파일 생성 (`apps/web/`)**:
    - **`vite.config.ts`**: `@vitejs/plugin-react`를 추가하여 JSX/TSX 문법 해석을 활성화하고 API 프록시 설정을 구성함.
    - **`tsconfig.json`**: React-Vite 환경에 최적화된 TypeScript 컴파일 옵션을 설정하여 타입 체크 및 빌드 안정성 확보.
    - **`tsconfig.node.json`**: Node.js 기반의 설정 파일(`vite.config.ts` 등)에 대한 별도의 TS 환경 분리.
- **빌드 파이프라인 정상화**:
    - `vite build` 실행 시 발생하던 파싱 에러(Unexpected token)를 해결하여 Vercel 배포가 가능하도록 조치함.

### 양자택일(Binary Choice) 인지 및 정밀도 고도화

#### 변경 사항
- **프런트엔드 스프레드 자동 선택 로직 개선 (`TarotMastery.tsx`)**:
    - 질문 내 양자택일 키워드(`할까`, `아니면`, `vs` 등) 감지 로직 추가.
    - 선택형 질문 시 자동으로 2장(양자택일) 스프레드를 선택하도록 강제하여, 시스템이 병렬적 선택 상황임을 정확히 인지하도록 수정.
- **백엔드 객체 추출(Entity Extraction) 정밀도 향상 (`v3.js`)**:
    - **컨텍스트 분리 로직**: "집으로 걸어갈 때 버스 탈까 걸어갈까?"와 같은 문장에서 앞부분의 상황 설명('집으로 걸어갈 때')을 필터링하고 핵심 객체('버스', '걸어')만 추출하는 2단계 파싱 알고리즘 적용.
    - **동사 유연성 확보**: `할까`, `갈까`, `탈까` 등 다양한 선택형 동사를 지원하도록 정규식 확장.
- **병렬 리딩 서사 안정화**:
    - 질문 의도와 스프레드 개수가 일치하게 됨에 따라, 양자택일 시 시간적 순서(과거-현재-미래)가 아닌 대조적 병렬 리딩이 확실하게 출력되도록 보장.

### 지능형 상황 인지 리딩 엔진 도입 (Reading V3 - Context-Aware V5.2)

#### 변경 사항
- **질문 객체 추출(Entity Extraction) 로직 구현**:
    - "A 아니면 B", "A 할까 B 할까" 등의 양자택일 질문에서 핵심 객체(Entity)를 자동으로 추출하는 NLP-lite 정규식 적용.
- **질문 무게(Gravity) 감지 및 페르소나 톤 조절**:
    - 일상적 키워드 및 질문 길이를 바탕으로 질문의 무게를 분류하여 페르소나의 톤을 자동 조절.
- **상황적 의미 합성(Contextual Meaning Synthesis)**:
    - 카드 고유의 원소 상징을 추출된 질문 객체와 동적으로 결합하여 도메인 맞춤형 리딩 생성.

### AI 리딩 엔진 고도화 (Reading V3 - Narrator V5.1)

#### 변경 사항
- **서사적 위치(Position) 설명 개선**:
    - 실제 스프레드 위치 라벨을 문장에 자연스럽게 녹여내도록 수정.
- **문법적 자연스러움 강화**:
    - **조사 처리 헬퍼(`getJosa`) 확장**: '을/를', '은/는' 처리를 추가.
    - **조언 문구 연결 최적화**: 명령형 조언과 서사 사이의 문법적 단절 해결.

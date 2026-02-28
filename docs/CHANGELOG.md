# Changelog

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

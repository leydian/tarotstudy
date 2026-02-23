# 세부내역: 백엔드 리딩/요약 품질

작성일: 2026-02-22
최종 갱신: 2026-02-23 (reading output quality fix)

## 범위
- 파일:
  - `apps/api/src/index.js`
  - `apps/api/src/content.js`
  - `apps/api/src/data/spreads.js`

## 목표
- 질문 의도와 리딩 문체 정합성 강화
- 템플릿 반복 완화
- 실행 가능한 결론 구조화

## 주요 변경
1. `three-card` 전용 요약기 도입
- `summarizeSpread()`에서 `three-card`를 전용 요약기(`summarizeThreeCard`)로 분기
- 출력 구조를 다음으로 고정:
  - `결론`
  - `근거`
  - `충돌 점검`(필요 시)
  - `실행 가이드`
  - `한 줄 테마`
- 결론 등급:
  - `진행 권장`
  - `조건부 진행`
  - `보류 후 정비`

2. 학습/시험 맥락 분기 강화
- `inferThreeCardIntent()`로 `study` 맥락 분기 추가
- 시험/합격 질문에서 실행문장이 루틴/복기/분량 제어 중심으로 나오도록 조정

3. `study` 벤치마크 빌더 추가
- `buildStudyBenchmarkCoreMessage()`
- `buildStudyBenchmarkInterpretation()`
- 카드 의미를 시험 준비 맥락으로 자연스럽게 연결

4. 관계회복 요약 변주 3차
- `summarizeRelationshipRecovery()`의 `7일 행동 계획` 변주폭 확장
- `riskTheme`별 실행 루틴 분기 강화
- 중간 점검 문장(`planCheckpoint`) 추가

5. 주별 운세(`weekly-fortune`) 일자 분리 유지
- 포지션이 `월요일~일요일`인지 회귀 테스트로 고정
- 레거시 포지션(`주간 테마`, `월-화`, `수-목`, `주간 조언`) 재유입 방지

6. 양자택일(`choice-a-b`) 맥락 분기 고도화
- 질문 맥락별 전용 축 분기:
  - 근무지/출퇴근 질문: `통근 시간`, `교통 피로`, `생활비`, `성장 기회`, `지속 가능성`
  - 구매/브랜드 질문: `예산 압박`, `즉시 만족도`, `활용도`, `스타일 적합성`, `3개월 후 만족도`
- 포지션 역할 고정:
  - `현재 상황`: 공통 판단 기준 고정
  - `A/B 선택 시 가까운 미래`: 단기 반응/적응 체크
  - `A/B 선택 시 결과`: 중기 누적 보상/소모 체크
- 카드 긴장도 보정:
  - 고긴장 카드(`major-15`, `major-16`, `major-18`, 일부 소드/완드) 정방향에서도 경계 문장 우선
- 문장 품질 개선:
  - 조사 오류(`'...는'`) 및 목적격 조사(`...을/를`) 교정
  - 반복 템플릿 제거, 포지션별 문장 분리

7. 전 스프레드 공통 결론 정책 적용
- `summarizeSpread()` 최종 단계에서 공통 판정 블록 추가
  - 라벨: `우세`, `조건부`, `박빙`
  - 근거: 포지션/카드/정역/키워드 기준 2~3개
- 스프레드별 판정 어휘 분리:
  - `양자택일`: 선택 유지성
  - `3카드`: 상황-행동-결과 연결
  - `주별`: 요일별 완급
  - `연간`: 분기별 전략 축
  - `켈틱`: 서사 중심축

8. 전 스프레드 요약 문장 리듬 보정
- summary 후처리(`polishSummaryRhythm`) 추가
- 문단 간 중복 문장 제거로 반복 노출 억제
- 판정 블록 + 본문 결합 후 리듬 정리로 가독성 개선

9. 카드 도감 `입문` 해설 실전형 재개편
- 대상 파일:
  - `apps/api/src/content.js`
- 핵심 변경:
  - `beginner` 카드 해설을 전용 템플릿으로 재정의
  - 7개 섹션(`coreMeaning/symbolism/upright/reversed/love/career/advice`)을 **섹션당 최소 5줄**로 고정
  - 문장 톤을 쉬운 표현 + 행동 중심으로 통일
  - 섹션 라벨(`핵심/현재 상황/오늘 할 일/복기`)을 넣어 가독성 강화
  - 맥락 분기(관계/커리어/학습/재정/건강/일상)는 유지하되 입문 사용자 기준으로 단순화
  - `beginner`는 외부 생성 텍스트보다 내부 실전 템플릿을 우선 적용
  - 캐시 키를 `explain:v6`로 상향해 이전 텍스트 재사용 방지
- 품질 효과:
  - 입문 사용자의 이해 난이도 하향
  - 카드별 해설 형식 편차 축소
  - 실전 적용 문장 비율 증가로 “읽고 바로 실행” 가능한 구조 확보

10. 리딩 출력 품질 3종 수정 (2026-02-23)

### 증상
"일정 과부하를 줄이기 위해 무엇부터 덜어낼까?" 질문에서 3가지 문제 확인:
- **반복**: "오늘 할 행동 1개를 먼저 고정해보세요"가 bridge·verdict·caution 3곳에 중복 출력
- **템플릿 노출**: "시간축/문제축 뜻풀이의 핵심 신호를 먼저 확인해보겠어요" 내부 가이드 문구 노출
- **행동 부정확**: 일정 관련 질문인데도 "지금 10분 안에 끝낼 수 있는 행동 1개만…" 출력

### 원인
| 증상 | 원인 함수 | 원인 |
|------|-----------|------|
| 반복 | `rewriteModelLines()` | hintAppended 가드 없음 + 키워드 정규식 협소 → 3회 append |
| 템플릿 노출 | `buildCoreContextLine()`, `buildSpreadCoreLead()` | three-card 변형에 가이드 문구 잔존 |
| 행동 부정확 | `resolveReadingDomain()` | `'schedule'` 도메인 없어 "무엇" → `'action'` 처리 |

### 변경 내역

#### `apps/api/src/content.js`
- `buildCoreContextLine()` three-card 변형:
  - `"이 포지션이 시간축/문제축에서 어떤 역할인지"` → `"이 카드가 세 장 흐름에서 원인인지 결과인지 먼저 구분"`
- `buildSpreadCoreLead()` three-card 변형:
  - `"시간축/문제축 해석의 핵심 신호를 먼저 확인해보겠습니다"` → `"이 카드가 전체 흐름 중 어느 단계를 담당하는지 먼저 살펴보겠습니다"`

#### `apps/api/src/index.js`
- `resolveReadingDomain()`: `'action'` 앞에 `'schedule'` 도메인 추가
  - 패턴: `/(일정|과부하|스케줄|할 일|태스크|우선순위|업무량|병목)/`
- `buildImmediateActionV3()`: `schedule` 도메인 전용 분기 추가
  - 우세: "오늘 일정 중 삭제하거나 위임할 수 있는 항목 1개를 먼저 찾아 지우세요."
  - 박빙: "오늘 할 일 목록에서 마감이 없는 항목 1개를 내일 이후로 미루세요."
  - 조건부: "가장 부담이 큰 일정 1개를 골라 취소하거나 축소하는 것부터 결정하세요."
- `buildCautionV3()`: `schedule` 풀 추가 (우세/박빙/조건부 각 2개 문장)
- `buildCheckinV3()`: `schedule` 분기 추가
  - "오늘 삭제하거나 위임한 일정 수와 실제 완료 수를 숫자로 기록하세요."

#### `apps/api/src/reading-model-builder.js`
- `inferDomainHintFromContext()`: schedule 패턴 추가
  - `/(일정|과부하|스케줄|우선순위|병목|태스크)/` → `"오늘 일정 중 삭제 또는 위임 가능한 항목 1개를 먼저 찾으세요."`
- `rewriteModelLines()`: 반복 방지 개선
  - `hintAppended` 카운터 도입 → domainHint append 최대 1회로 제한
  - 키워드 정규식 확장: 10개 → 20개 이상 (줄이/덜어/삭제/위임/보류/고정/확인/기록/점검/실행/완료/기준/정리/우선 등 추가)

### 결과
- `"시간축/문제축"` 문자열 출력 0건
- domainHint 중복 append 0회 (최대 1회 제한)
- `action.now`에 "삭제" 또는 "위임" 포함
- 전체 테스트 64/64 통과

### 관련 커밋
- `4c7c9b1` Fix reading output quality: schedule domain, template exposure, and hint repeat

## 관련 테스트
- `apps/api/test/content-fallback.test.js`
  - 다중 카드/다중 맥락(커리어/재회/재정) 분기 회귀 검증
  - 입문 해설 섹션 구조/맥락 분기 회귀 검증
- `apps/api/test/weekly-fortune-spread.test.js`
  - 주별 운세 포지션 회귀 테스트
- `apps/api/test/choice-a-b-reading.test.js`
  - 근무지 선택 맥락 반영 검증
  - 구매형 선택(브랜드) 축 반영 검증
  - 조사 오류/반복 문구 회귀 방지 검증

## 검증 명령
- `npm run test:api`
- `node --check apps/api/src/index.js`
- `node --check apps/api/src/content.js`

## 최근 관련 커밋
- `c07de49` Rewrite beginner card explanations in plain practical language
- `cd445be` Refine choice A/B reading for clarity and work-location context
- `389fa59` Improve purchase-focused A/B reading tone and decision clarity
- `6135a1b` Apply verdict-and-evidence summary policy across all spreads

## 리스크/후속
- 질문 의도 분기 키워드가 늘어날수록 오탐 가능성이 있으므로 샘플셋 기반 회귀를 주기적으로 갱신 필요

## 11. 백엔드 아키텍처 모듈화 (2026-02-23)
- **모놀리스 해체**: 5,000행 규모의 `index.js`를 도메인 단위로 완전히 분리함.
- **도메인 구조**:
  - `src/domains/summaries/`: 스프레드별 요약 엔진 (`yearly`, `monthly`, `weekly`, `three-card`, `celtic`, `relationship`, `one-card`).
  - `src/domains/reading/`: 구조화된 리딩 빌더 (`v2`, `v3`, `enhancer`).
  - `src/domains/common/`: 공통 유틸리티 (`utils.js`), 신호 분석기 (`signal-analyzer.js`), 헬스 체크 (`health.js`).
- **효과**: 코드 유지보수성 향상, 파일 간 의존성 명확화, 테스트 및 기능 추가 속도 개선.

## 14. 리딩 생성 성능 최적화 (2026-02-24)
- **병렬 드로우 엔진**: `draw-engine.js`를 비동기 방식으로 리팩터링하여 사용자 히스토리 조회와 카드 뽑기를 병렬 처리함.
- **질문 분석 캐시**: `ANALYSIS_CACHE` (Map기반 LRU)를 도입하여 정규식 기반 질문 분석 결과를 재사용함으로써 반복 질문에 대한 응답 시간을 밀리초 단위로 단축함.
- **AI 호출 최적화**: 타임아웃을 8초로 조정하고, 보강 호출 시 불필요한 대기를 최소화함.

# 세부내역: 백엔드 리딩/요약 품질

작성일: 2026-02-22  
최종 갱신: 2026-02-23 (late)

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

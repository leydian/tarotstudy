# 세션 인수인계 상세 (2026-02-23)

## 1) 요약
- 원카드/일별 질문 의도 분기를 보정했습니다.
- 카드 의미와 출력 문체의 정합성을 맞췄습니다.
- 학습 리더 코치를 행동 코칭에서 타로 해석 복기 중심으로 전환했습니다.
- 일별 개선 패턴을 전 스프레드로 확장했습니다.

## 2) 원카드/일별 분기 보정

### 2.1 질문 의도 분기
- 변경 파일:
  - `apps/api/src/index.js`
  - `apps/api/src/content.js`
- 핵심:
  - `오늘 운세는?`를 yes/no 질문에서 제외
  - 정보형 운세 질문(`운세/흐름/해석`)을 daily intent로 분리
  - 결론 문체를 `진행/가능` 중심에서 `흐름/운영` 중심으로 조정

### 2.2 카드 의미 정합성
- 변경 파일:
  - `apps/api/src/data/cards.js`
  - `apps/api/src/content.js`
- 핵심 보정:
  - `컵 4`: 감정 점검/권태/거리두기
  - `소드 8`: 제약/불안/관점 전환
  - `소드 킹`: 판단/원칙/명료함

## 3) 학습 리더 코치 관점 전환
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 핵심:
  - 행동 코칭 문장을 카드 해석 복기 중심 문장으로 전환
  - `카드 키워드/정역방향/포지션` 근거 점검 문구 강화
  - 라벨 중복 제거 및 `리딩 검증` 포맷 통일

## 4) 일별 품질 패턴의 전 스프레드 확장
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
- 적용 스프레드:
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

## 5) 벤치마킹 반영 기준
- 채택:
  - 포지션 기반 스토리 연결
  - 카드 근거에서 실행 문장으로 이어지는 흐름
  - 종합 리딩 한 줄 테마
- 배제:
  - 과장된 감탄
  - 운명 단정/과신 표현
  - 과잉 친밀 문체

## 6) 푸시/운영 이슈
- 이슈:
  - OAuth 토큰 `workflow` scope 부재로 `main` 푸시 거절
- 조치:
  - 워크플로우 커밋 제외 브랜치 `publish/no-workflow-v2` 생성/푸시
  - PR 링크:
    - `https://github.com/leydian/tarotstudy/pull/new/publish/no-workflow-v2`

## 7) 검증 로그
- `npm run test:api` 통과
- `npm run build:web` 통과
- `node --check apps/api/src/content.js` 통과
- `node --check apps/api/src/index.js` 통과

## 8) 관련 커밋
- `666321c` Improve relationship-recovery summary variation by context and risk theme
- `5180d76` Refine one-card repair tone and learning coach phrasing
- `8e30e75` Shift learning coach output to tarot interpretation review focus
- `3399153` Fix one-card daily-fortune intent and yes/no question detection
- `b254feb` Refine one-card daily reading tone, card semantics, and coach labels
- `bcbb6e7` Refine daily-fortune reading consistency and learning coach structure
- `f377bf9` Extend daily reading quality patterns across spreads and add theme summaries

## 9) 2026-02-23 추가 후속 (UI/요약/학습코치 실전형 개편)

### 9.1 스프레드 카드 가독성 및 토글 UX 개선
- 변경 파일:
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/styles.css`
- 핵심:
  - 전 스프레드 카드 이미지 썸네일 크기 확대
  - 스프레드별 시각 프리셋(`scale/rowHeight/minColWidth`) 적용
  - `스프레드 리딩 결과` / `스프레드 가이드·복기` 토글 도입
  - 스프레드/변형 변경 시 토글 뷰를 리딩 결과 탭으로 자동 초기화

### 9.2 월별/주별/관계회복 요약 품질 보정
- 변경 파일:
  - `apps/api/src/index.js`
- 핵심:
  - `monthly-fortune` 전용 요약기 추가
    - `총평`
    - `주차 흐름`
    - `월-주 연결`
    - `실행 가이드`
    - `한 줄 테마`
  - 관계 질문은 `서사 요약` 이후 `판정`이 나오도록 순서 조정
  - `우세` 판정 보수화:
    - 고위험 역방향/리스크 누적 시 `조건부`로 다운그레이드
  - 근거 문구 다양화:
    - 포지션 중복 완화
    - 관계 질문에서 기계적 `축` 표현을 대화/오해/속도 조절 표현으로 완화

### 9.3 양자택일 요약을 질문 형태 기반으로 분기
- 변경 파일:
  - `apps/api/src/index.js`
- 핵심:
  - 명시적 A/B 질문: 비교형 출력 유지
  - 단일 판단 질문: A/B 레이블 노출 없이 단일판단형 출력
  - 관계 질문 비교 축 교정:
    - `감정 소모·대화 안정성·오해 가능성·지속 가능성`
  - 근거 우선순위 조정:
    - `현재 상황 + 결과 포지션` 우선
  - 문장 정리:
    - 조사 오류 방지
    - 물음표 앞 공백 정리

### 9.4 학습 리더 코치 내역 레벨별 실전형 차등 강화
- 변경 파일:
  - `apps/api/src/content.js`
  - `apps/web/src/pages/SpreadsPage.tsx`
- 핵심:
  - 입문:
    - 카드 근거 1개 + 행동 1개 + 당일 복기 중심
  - 중급:
    - 가설/반례/검증 지표/오차 분류 중심
  - 코치 문장 생성 함수 레벨별 분기 강화:
    - `buildLearningCoachOpening`
    - `buildLearningCoachFrame`
    - `buildLearningCoachReview`
  - 학습 요약 패널 간결화:
    - `오늘 할 일`
    - `복기 기준`
    - `다음 리딩에서 바꿀 점 1개`

### 9.5 검증 로그 (추가)
- `node --check apps/api/src/index.js` 통과
- `node --check apps/api/src/content.js` 통과
- `npm run test:api` 통과
- `npm run build:web` 통과

### 9.6 관련 커밋 (추가)
- `9021afe` Adjust spread card image sizing across all spread layouts
- `539995c` Add toggle view for spread reading results and guide sections
- `a30569a` Improve monthly/weekly fortune summary consistency and verdict logic
- `fb90f37` Refine relationship-reading tone and stabilize spread view UX
- `edaf90a` Improve choice spread branching and simplify learning digest output
- `ba9e199` Differentiate beginner/intermediate coaching with practical execution flows

# 세션 인수인계 문서 (요약)

작성일: 2026-02-22  
최종 갱신: 2026-02-22  
작업 경로: `/home/eunok/studycodex`

## 1) 이번 세션 핵심 결과
- 타로 리더/학습 리더 페르소나를 코드와 UI에서 분리 정비했습니다.
- 연간운세 리딩을 `총평 → 분기별 운세 → 월별 운세` 순서로 재구성했습니다.
- 연간운세의 분기/월 문장 반복을 줄이기 위해 다양화 로직과 반복 방지 규칙을 적용했습니다.
- 분기 역할을 고정했습니다.
  - 1분기: 기반 다지기
  - 2분기: 실행 점검
  - 3분기: 확장 조율
  - 4분기: 연말 정리
- 스프레드 UI를 개선했습니다.
  - 좌측: 타로 리더 리딩
  - 우측: 학습 리더 코치 내역
  - 스프레드 모양 슬롯에 카드 이미지 표시
  - 슬롯 카드 클릭 시 카드 상세 페이지(`/cards/:cardId`) 이동
- 품질 게이트를 자동화했습니다.
  - `npm run test:api`
  - `npm run qa:learning-leader`
  - `npm run qa:relationship-recovery`
  - `npm run qa:yearly-fortune`
  - `npm run verify:quality`
  - CI 워크플로우(`.github/workflows/quality-gates.yml`) 연동
- 신규 스프레드 `relationship-recovery`(관계 회복 5카드)를 추가했습니다.
  - 전용 포지션/레이아웃/요약 로직 추가
  - draw/복기 이벤트 텔레메트리 추가
- 카드 상세 페이지의 질문 맥락 반영을 강화했습니다.
  - 기본 카드 설명 조회에 `context` 쿼리 반영
  - 심화 설명 생성 시 최신 `level/context`를 명시 전달
  - 심화 fallback 설명 전 섹션(core/symbolism/upright/reversed/love/career/advice)에 맥락 강분기 적용

## 2) 현재 상태(운영 관점)
- API/WEB 모두 빌드 기준 정상 상태입니다.
- 주요 검증:
  - `node --check apps/api/src/content.js` 통과
  - `node --check apps/api/src/index.js` 통과
  - `npm run build:web` 통과
  - `npm run test:api` 통과
  - `npm run verify:quality` 통과

## 3) 이번 세션 주요 변경 파일
- 백엔드
  - `apps/api/src/content.js`
  - `apps/api/src/index.js`
  - `apps/api/src/data/spreads.js`
- 프론트
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/pages/CardDetailPage.tsx`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/styles.css`
- 테스트/자동화
  - `apps/api/test/cards-descriptions.test.js`
  - `apps/api/test/content-fallback.test.js`
  - `apps/api/test/relationship-recovery-spread.test.js`
  - `scripts/relationship-recovery-variation-check.mjs`
  - `scripts/run-learning-leader-qa.mjs`
  - `scripts/yearly-fortune-regression-check.mjs`
  - `scripts/yearly-fortune-regression-cases.json`
  - `.github/workflows/quality-gates.yml`
- 문서
  - `SESSION_HANDOFF.md` (본 요약)
  - `docs/session-handoff-2026-02-22-details.md` (상세)
  - `docs/persona-report-2026-02-22.md`
  - `docs/annual-fortune-job-timing-awkwardness-report-2026-02-22.md`
  - `docs/learning-leader-quality.md`
  - `docs/yearly-fortune-regression-checklist.md`
  - `docs/codex-updates-2026-02-22.md`
  - `docs/relationship-recovery-manual-qa-2026-02-22.md`
  - `docs/card-detail-context-branch-check-2026-02-22.md`
  - `docs/spread-telemetry-baseline-2026-02-22.md`

## 4) 다음 세션 우선 확인 항목
- 관계 회복 스프레드(`relationship-recovery`) 실사용 문장 품질 점검
  - 재회/갈등/일반 맥락별 수동 샘플 확인
  - 요약(`핵심 진단 → 관계 리스크 → 7일 행동 계획`) 가독성 점검
- 카드 상세 심화 설명의 맥락 분기 강도 점검
  - `빈 질문` vs `이직/재회/재정` 입력에서 7개 섹션 모두 변화하는지 확인
- 스프레드/복기 텔레메트리 활용 점검
  - `/api/telemetry/spread-events` 수집 확인
  - `relationship-recovery`의 draw 대비 복기 저장률 확인

## 5) 상세 문서 링크
- 세션 상세 변경 내역: `docs/session-handoff-2026-02-22-details.md`
- 페르소나 지정 현황 보고서: `docs/persona-report-2026-02-22.md`
- 연간운세 어색함 분석 보고서: `docs/annual-fortune-job-timing-awkwardness-report-2026-02-22.md`
- 학습 리더 품질 운영 가이드: `docs/learning-leader-quality.md`
- 연간운세 회귀 체크리스트: `docs/yearly-fortune-regression-checklist.md`

## 6) 추가 반영 (카드 설명 분기 고도화)
- 범위:
  - 기본 카드 설명(심화 설명 아님): `apps/api/src/data/cards.js`
  - 심화 설명 생성 API: `apps/api/src/content.js`
  - 카드 API 라우트(기본 설명 동적 생성): `apps/api/src/index.js`
  - 심화 설명 렌더링(줄바꿈): `apps/web/src/pages/CardDetailPage.tsx`
  - 심화 설명 프롬프트 강화: `apps/api/src/external-ai.js`

- 핵심 개선:
  - 기본 설명(입문/중급) 고정 문구를 카드별 분기로 교체
    - 1줄(키워드), 2줄(흐름), 3줄(학습 포인트) 모두 분기
    - 메이저/마이너, 수트, 랭크 기반 문장 세분화
  - 심화 설명(핵심 의미/상징/정방향/역방향/연애/일학업/조언) 분기 강화
    - 메이저 22장 개별 프로필
    - 마이너 56조합(수트×랭크) + 세부 뉘앙스
    - 연애/일학업 섹션에 카드·난이도·맥락별 세분화 적용
  - 반복 문구 제거/완화
    - `...작은 실행 1개...`, `...체감 변화 1가지...` 등 고정 문장 변주
  - 속도 개선
    - 심화 설명은 빠른 fallback 우선 반환 + 후속 생성 캐시 갱신
  - 안정화
    - 같은 카드는 로테이션 없이 고정 문구 유지
    - 조사/자연어 어색함 다수 교정

- 운영 확인 포인트:
  - `/api/cards/:cardId` 기본 설명은 `context` 쿼리 반영(고정 카드 문구 + 맥락 힌트)
  - `/api/cards/:cardId/explain` 심화 설명은 섹션별 최소 3줄 보장
  - 심화 설명 `love/career`는 맥락(재회/갈등/면접/프로젝트/학습 등)에 따라 문장 분기

## 7) 추가 반영 (관계회복 품질 2차 + 켈틱 장문 리딩)
- 관계회복 품질 2차(균형형) 적용
  - 정량 QA 스크립트 추가: `scripts/relationship-recovery-variation-check.mjs`
  - 품질 지표:
    - 구조 실패 0건
    - 행동문 실패 0건
    - `exactPairRate`, `highSimilarityPairRate`, `distinctRatio`
  - 품질 게이트 확장:
    - `package.json`에 `qa:relationship-recovery` 추가
    - `verify:quality`에 관계회복 정량 QA 포함
  - 운영 산출물:
    - `tmp/relationship-recovery-variation-report.json`
    - `tmp/relationship-recovery-variation-report.md`

- 연간운세 회귀 케이스 강화
  - `scripts/yearly-fortune-regression-cases.json` 확장
    - 총 18건(커리어 6, 관계 5, 재정 4, 일반 3)
  - `scripts/yearly-fortune-regression-check.mjs` 검증 강화
    - 시기 표현 검증
    - 커리어 도메인 단어 검증
    - `언제 + 무엇` 결론 문장 검증
  - `docs/yearly-fortune-regression-checklist.md` 기준 동기화

- 켈틱 크로스 장문 리딩 반영(벤치마킹 대응)
  - `apps/api/src/index.js`에 켈틱 전용 요약 분기 추가
    - `summarizeSpread()`에서 `celtic-cross`를 `summarizeCelticCross()`로 분기
  - `summarizeCelticCross()` 신규 구현
    - 10포지션(현재~결과) 각각 장문 문단 생성
    - 질문 의도 감지(`relationship-repair` 등) 기반 감정형 문체 분기
    - 마지막 결론에서 즉시 실행 문장 고정 출력
      - `지금 실행할 한 문장: ...`
  - 품질 보정:
    - 한국어 조사 어색함 1건(`역방향로`) 교정

- 문서/운영 정리
  - `README.md` 품질 게이트 섹션에 `qa:relationship-recovery` 추가
  - 관계회복 수동 QA 문서에 자동 QA 기준/임계값 명시
  - 카드 상세 맥락 분기 점검 리포트, 텔레메트리 기준선 리포트 추가

- 검증 결과(최신)
  - `npm run test:api` 통과
  - `npm run qa:learning-leader` 통과
  - `npm run qa:relationship-recovery` 통과
  - `npm run qa:yearly-fortune` 통과
  - `npm run verify:quality` 통과

- 관련 커밋
  - `dc49a35` Enhance celtic-cross narrative and add relationship QA gate

## 8) 추가 반영 (벤치마크 문체 전역 적용 + 갈등회복 분기 고도화)
- 적용 기간 커밋:
  - `4aaa67a` ~ `3a96405`
  - `4aaa67a`, `610748d`, `6253394`, `5345963`, `6f392b0`, `66e6b3f`, `c79a522`, `4ca642c`, `c7cf5bb`, `3b1d965`, `3a96405`

- 핵심 목표:
  - 질문 의도(연애/재물/친구·동료 인식/갈등 회복)에 맞는 문체로 전환
  - 템플릿 반복 문장 축소
  - 스프레드별로 같은 말 반복되는 문제 해소
  - 실제 실행 가능한 한 문장 가이드 강화

- 백엔드 요약 로직 개선 (`apps/api/src/index.js`)
  - 주간 운세 문장 교정:
    - 업무형 표현(`마감 품질`, `성과 점검`)을 관계 맥락 문장으로 전환
    - `강한 축/취약 축` 표현을 자연어로 교체
  - 일간 운세 `종합 리딩` 확장:
    - 연애 질문에서 `흐름-주의-행동` 순서의 상세 설명 강화
    - 요약 길이 제한 완화로 문장 손실 방지
  - 도메인별 벤치마크 스타일 확장:
    - `relationship`, `finance`, `social`, `relationship-repair`를 전 스프레드 요약에 반영
    - 각 도메인마다 `두 갈래 조언`(확장 vs 조절) 구조 고정
  - 원카드 품질 보정:
    - social 질문에서 `진행/보류`형 결론 대신 인식형 결론으로 교체
    - 키워드 충돌(예: 긍정 총평 + 갈등 키워드) 완화 처리
    - yes/no 이유 문장에 카드 방향(정방향/역방향) 명시
  - 관계 회복 5카드 요약 고도화:
    - 고긴장 카드군(소드 3/5/6/9/10 등) 감지 후 `열림` 남발 방지
    - 리스크 문장에 타이밍/오해 확장 위험 표현 강화

- 백엔드 상세 리딩 로직 개선 (`apps/api/src/content.js`)
  - `relationship` 벤치마크 빌더 추가 및 고도화:
    - 일간 중심에서 전 스프레드로 확대
  - `finance` 벤치마크 빌더 추가:
    - 숫자 기준 실행 문장(상한, 보류, 유예, 누수 점검) 강화
  - `social` 컨텍스트 추가:
    - 친구/동료/평판 질문 전용 문장 체계 도입
    - 3카드(과거/현재/미래) 포지션별 역할 분리
    - 중복 문장 축소 및 카드 특성 기반 실행 문장 차별화
  - `relationship-repair` 우선 분기 추가:
    - `싸움/갈등/화해` 질문이 social로 흘러가는 문제 해결
    - 갈등 회복 전용 코어/해석 빌더 도입
    - 5카드 포지션(`문제/해결방법/상대 관점/회복 행동/다음 7일`)별 문장 역할 분리
    - 조사 어색함(`...로/으로`) 자동 보정

- 품질 체감 개선 포인트:
  - 같은 카드라도 포지션에 따라 의미가 다르게 읽히도록 분기 강화
  - 같은 포지션에서도 카드 긴장도에 따라 `가능/경계` 톤 분리
  - 반복 고정 문장 제거로 템플릿 티 감소
  - 질문 의도와 결과 문체 불일치(평판 vs 화해 전략) 이슈 해소

- 현재 운영 상태(최신):
  - `node --check apps/api/src/index.js` 통과
  - `node --check apps/api/src/content.js` 통과
  - 작업 트리는 문서 외 코드 기준 커밋 정리 완료 상태

## 9) 추가 반영 (2026-02-23: 원카드/일별 품질 보정 + 전 스프레드 확장)
- 원카드/일별 운세 어색함 보정
  - yes/no 질문 판별에서 `오늘 운세는?` 같은 정보형 질문을 분리
  - `진행해도 됨` 문체를 `오늘 흐름/운영` 문체로 교체
  - 키워드 품질 보정:
    - `컵 4`: `감정 점검/권태/거리두기`
    - `소드 8`: `제약/불안/관점 전환`
    - `소드 킹`: `판단/원칙/명료함`
  - 학습 리더 코치 문체를 행동 코칭에서 타로 학습 복기 중심으로 전환

- 일별 운세 개선 패턴의 전 스프레드 확장
  - 확장 대상:
    - `weekly-fortune`
    - `monthly-fortune`
    - `three-card`
    - `choice-a-b`
    - `celtic-cross`
  - 공통 확장 포인트:
    - 포지션 역할 문장 분리
    - orientation 문장 분리
    - 키워드 해석 문장 분리
    - 맥락 연결 문장 분리
    - 학습 리더 포지션별 복기 프레임 분리

- 벤치마킹 반영(가져갈 요소만 적용)
  - 과장/과신/운명 단정 문체는 배제
  - 대신 다음 요소를 반영:
    - 포지션 기반 서사 연결
    - 카드 근거를 실행 문장으로 연결
    - 종합 리딩 `한 줄 테마` 추가
  - 적용 범위:
    - 공통 요약 경로(`summarizeSpread`) + 특수 요약(`주간/연간/켈틱`)

- 문서/운영 이슈 정리
  - GitHub 푸시 시 OAuth 토큰 `workflow` scope 이슈 확인
  - 워크플로우 커밋을 제외한 출고 브랜치 `publish/no-workflow-v2` 생성/푸시 완료
  - PR 링크:
    - `https://github.com/leydian/tarotstudy/pull/new/publish/no-workflow-v2`

- 관련 최신 커밋
  - `666321c` Improve relationship-recovery summary variation by context and risk theme
  - `5180d76` Refine one-card repair tone and learning coach phrasing
  - `8e30e75` Shift learning coach output to tarot interpretation review focus
  - `3399153` Fix one-card daily-fortune intent and yes/no question detection
  - `b254feb` Refine one-card daily reading tone, card semantics, and coach labels
  - `bcbb6e7` Refine daily-fortune reading consistency and learning coach structure
  - `f377bf9` Extend daily reading quality patterns across spreads and add theme summaries

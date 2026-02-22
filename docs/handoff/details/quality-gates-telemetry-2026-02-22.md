# 세부내역: 품질게이트/테스트/텔레메트리

작성일: 2026-02-22  
최종 갱신: 2026-02-23

## 범위
- `package.json`
- `apps/api/test/*`
- `scripts/relationship-recovery-variation-check.mjs`
- `scripts/spread-telemetry-rollup.mjs`
- `scripts/yearly-fortune-regression-check.mjs`
- `apps/api/src/index.js` (telemetry endpoints)
- `apps/web/src/lib/api.ts`, `apps/web/src/pages/SpreadsPage.tsx` (telemetry client)

## 목표
- 리딩 품질 회귀를 자동으로 조기에 탐지
- 스프레드 사용/복기 데이터를 운영 지표로 축적
- 배포 전 최소 품질선(구조/문체/행동 가이드)을 일관되게 보장

## 주요 변경
1. 품질 게이트 명령 체계 정비
- `npm run lint`
- `npm run typecheck:web`
- `npm run test:web`
- `npm run test:api`
- `npm run qa:learning-leader`
- `npm run qa:relationship-recovery`
- `npm run qa:yearly-fortune`
- `npm run verify:quality`

2. 관계회복 정량 QA 추가
- 스크립트: `scripts/relationship-recovery-variation-check.mjs`
- 지표:
  - `exactPairRate`
  - `highSimilarityPairRate`
  - `distinctRatio`
  - 구조 실패/행동문 실패 건수
- 산출물:
  - `tmp/relationship-recovery-variation-report.json`
  - `tmp/relationship-recovery-variation-report.md`

3. 연간운세 회귀 체크 강화
- 스크립트/케이스: `scripts/yearly-fortune-regression-check.mjs`, `scripts/yearly-fortune-regression-cases.json`
- 점검 포인트:
  - 총평-분기-월 구조
  - 시기 표현
  - 도메인 단어 정합성
  - 결론의 `언제 + 무엇` 문장 유효성

4. 텔레메트리 수집/집계
- API endpoint:
  - `POST /api/telemetry/spread-events`
  - `GET /api/telemetry/spread-events`
- 이벤트:
  - `spread_drawn`
  - `spread_review_saved`
- 저장:
  - 서버 메모리 + 파일 영속(`tmp/telemetry-store.json`)
- 수집 범위:
  - `relationship-recovery` 한정에서 전 스프레드로 확장
- 롤업 스크립트:
  - `scripts/spread-telemetry-rollup.mjs`
- 산출물:
  - `tmp/spread-telemetry-report.json`
  - `tmp/spread-telemetry-report.md`

5. 주별 운세 회귀 테스트 추가
- 테스트: `apps/api/test/weekly-fortune-spread.test.js`
- 목적:
  - `weekly-fortune` 포지션이 `월요일~일요일`인지 고정 검증
  - 레거시 라벨 재유입 방지

6. 양자택일 회귀 테스트 확장
- 테스트: `apps/api/test/choice-a-b-reading.test.js`
- 검증 포인트:
  - 근무지 질문에서 `통근/교통/생활비/지속 가능성` 축 반영
  - 구매 질문에서 `예산 압박/활용도/스타일 적합성/3개월 만족도` 축 반영
  - 반복 보일러플레이트 문구 재출력 방지
  - 조사 오류(`'...는'`, 목적격 조사) 회귀 방지
  - 포지션 간 해석 차별성 유지

## 운영 체크리스트
- API 재기동 후 스프레드 정의 반영 확인
- `npm run verify:quality`를 머지 전 필수 실행
- 텔레메트리 리포트에서 draw 대비 review 저장률 추적
- QA 실행 모드 확인:
  - 기본 `QA_API_MODE=auto`
  - CI/원격 API 연동 시 `QA_API_MODE=external` + `API_BASE_URL` 지정
- 신규 회귀 테스트(`choice-a-b-reading.test.js`) 실패 시:
  - `apps/api/src/content.js`의 `inferChoiceContextMeta()` 축 분기 우선 점검
  - `apps/api/src/index.js`의 공통 요약 후처리(`finalizeSpreadSummary`) 영향 확인

## 리스크/후속
- QA 샘플이 고정되면 품질 하락이 누락될 수 있어 케이스셋을 정기 갱신해야 함
- 텔레메트리 저장소가 커질 경우 로테이션 정책 필요
- CI 실패 시 워크플로 로그 기준으로 `lint -> typecheck:web -> test:web -> test:api -> verify:quality` 순서로 역추적

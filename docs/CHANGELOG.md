# Changelog

## [2026-02-28]

### 2단계 분할 마무리: report-builder 서브모듈 분해 완료 (v6.3.54)

#### 변경 파일
- `apps/api/src/domains/reading/report-builder.js`
- `apps/api/src/domains/reading/report/shared.js`
- `apps/api/src/domains/reading/report/deterministic.js`
- `docs/RELEASE_NOTES_v6.3.54.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- report 계층 2단계 분할 완료
  - 대형 `report-builder.js`를 엔트리 재수출 레이어로 축소.
  - 공통 상수/유틸/정규화/품질 보정 로직을 `report/shared.js`로 이동.
  - 결정형 리포트 합성(`buildDeterministicReport`)을 `report/deterministic.js`로 분리.
- 모듈 경계 안정화
  - `report-builder.js`는 기존 호출 경로를 유지하면서 내부 구현만 서브모듈로 위임.
  - 분할 중 발생했던 `deterministic` export 꼬임을 정리해 import/export 계약을 복구.
- 유지보수성 개선
  - 공통 로직과 리포트 합성 로직의 책임을 분리해 추후 정책/문구 보정 시 영향 범위를 축소.
  - 파일 단위 탐색성과 회귀 분석 난이도를 낮춤.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

### 2단계 분할: 오케스트레이터 직접 모듈 참조 + profile 세분화 + 정책 강화 (v6.3.53)

#### 변경 파일
- `apps/api/src/domains/reading/orchestrator.js`
- `apps/api/src/domains/reading/prompt-builder.js`
- `apps/api/src/domains/reading/model-client.js`
- `apps/api/src/domains/reading/json-extractor.js`
- `apps/api/src/domains/reading/quality-guard.js`
- `apps/api/src/domains/reading/renderer.js`
- `apps/api/src/domains/reading/report-builder.js`
- `apps/api/src/domains/reading/profile/keywords.js`
- `apps/api/src/domains/reading/profile/intent-scoring.js`
- `apps/api/src/domains/reading/profile/core.js`
- `apps/api/src/domains/reading/profile/decision-policy.js`
- `apps/api/src/domains/reading/profile/question-type.js`
- `apps/api/src/domains/reading/questionType.js`
- `apps/api/src/domains/reading/engine-helpers.js` (삭제)
- `docs/RELEASE_NOTES_v6.3.53.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 엔진 의존 경계 정리
  - `orchestrator`가 `engine-helpers`를 거치지 않고 `report/prompt/model/quality/renderer`를 직접 참조하도록 재배선.
  - `engine-helpers.js` 제거.
- 모듈 세분화
  - `json-extractor`, `quality-guard`, `renderer` 신규 분리.
  - `profile` 로직을 `keywords/intent-scoring/core/decision-policy`로 세분화.
  - `questionType.js`는 호환 re-export 경로 유지.
- 공격적 정책 개선
  - light/binary 계열 액션을 2개 고정해 경량 질문의 과도한 안내 문장을 축소.
  - `summary`/`verdict` 중복 판정 임계 강화(더 짧은 문장도 중복으로 감지).
  - 역방향 비중이 높은 경우 verdict 임계치를 상향해 보수적 판정 유도.
  - `normalizeReport`에서 역방향 낙관 문구 보정 패턴 강화.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

### 풀 리팩터: reading 모듈 세분화 + profile 경로 분리 (v6.3.52)

#### 변경 파일
- `apps/api/src/domains/reading/report-builder.js`
- `apps/api/src/domains/reading/prompt-builder.js`
- `apps/api/src/domains/reading/model-client.js`
- `apps/api/src/domains/reading/engine-helpers.js`
- `apps/api/src/domains/reading/orchestrator.js`
- `apps/api/src/domains/reading/profile/question-type.js`
- `apps/api/src/domains/reading/questionType.js`
- `docs/RELEASE_NOTES_v6.3.52.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- reading 엔진 파일 세분화
  - 기존 대형 helper 로직을 `report-builder/prompt-builder/model-client`로 분리.
  - `engine-helpers.js`는 모듈 집약 재수출 레이어로 축소.
  - `orchestrator.js`는 흐름 제어/최종 조립 중심으로 유지.
- question profile 경로 분리
  - 기존 `questionType.js` 구현을 `profile/question-type.js`로 이동.
  - `questionType.js`는 호환 재수출 레이어로 전환(기존 import 경로 유지).
- 계약/동작 보존
  - `generateReadingHybrid` 공개 시그니처 유지.
  - `/api/reading`, `/api/v2/reading` 계약 필드 유지.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

### 1차 분할: 오케스트레이터 헬퍼 추출 (v6.3.51)

#### 변경 파일
- `apps/api/src/domains/reading/engine-helpers.js`
- `apps/api/src/domains/reading/orchestrator.js`
- `docs/RELEASE_NOTES_v6.3.51.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 리딩 엔진 1차 분할 적용
  - `orchestrator.js` 내부의 대형 헬퍼(상수/문구 유틸/리포트 생성/프롬프트/모델 호출/정규화 보조)를 `engine-helpers.js`로 추출.
  - `orchestrator.js`는 검증/폴백 결정/최종 조립 중심의 흐름 제어 파일로 축소.
- 공개 계약 유지
  - `generateReadingHybrid` 시그니처와 응답 스키마는 변경 없음.
  - 기존 테스트 import 경로(`domains/reading/hybrid.js`)와 API 동작은 유지.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

### 리딩 오케스트레이터 분리 + legacy 모드 제거 (v6.3.50)

#### 변경 파일
- `apps/api/src/domains/reading/orchestrator.js`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/domains/reading/index.js`
- `apps/api/src/index.js`
- `docs/RELEASE_NOTES_v6.3.50.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 리딩 도메인 진입점 분리
  - 기존 대형 `hybrid.js`를 `orchestrator.js`로 이동.
  - `hybrid.js`는 엔트리 재수출 파일로 축소.
  - `domains/reading/index.js`를 추가해 reading 관련 export를 단일 경로로 집약.
- API의 legacy 경로 동시 정리
  - `/api/reading`, `/api/v2/reading`에서 `mode=legacy` 요청을 `400` + `legacy_mode_removed`로 명시 거부.
  - 서버 라우트에서 `generateReadingV3` import/폴백 호출 제거.
  - 내부 예외 시 레거시 대체 응답 대신 `500` 에러를 반환해 경로를 명확히 단일화.
- 엔진 fallback 메타 정리
  - fallback 발생 시 `apiUsed`를 `deterministic`로 표준화.
  - 응답 `mode`를 `hybrid | deterministic_fallback`으로 구분.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

### 결정문 2단 구조 + 도메인별 실행지침 + 이미지감 문장 도입 (v6.3.49)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `docs/RELEASE_NOTES_v6.3.49.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- evidence claim 표현력 보강(2번)
  - `EVIDENCE_IMAGERY_SENTENCE_TEMPLATES` 추가.
  - `buildEvidenceClaim()`에 `responseMode`를 전달해 `balanced/creative` 모드에서만 이미지감 문장 1개를 추가.
  - `concise` 모드에서는 이미지 문장을 붙이지 않도록 분리해 과장도를 제어.
- 결론 2단 구조 적용(3번)
  - `buildConclusionStatement()` + `buildConclusionBuffer()` 추가.
  - `buildDeterministicReport()`의 summary 생성을 선언문(`결론:`) + 완충문(`참고:`) 구조로 전환(균형/창의 모드).
  - compact binary는 기존 간결 포맷 유지.
- 도메인별 액션 세분화(4번)
  - `buildDomainActions()` 추가.
  - 도메인(`lifestyle/career/relationship/finance/general`)과 판정 상태를 반영해 기본 2개 액션 + 조건부 3번째 액션을 생성.
  - 경량 질문은 과도한 액션 확장을 피하고, 복합 커리어/주의 구간은 보완 액션을 자동 추가.
- deterministic 경로 파라미터 정합화
  - `generateReadingHybrid()`에서 `responseMode`를 deterministic 리포트 생성기로 전달.
  - 동일 질문이라도 모드별 톤/길이 정책이 deterministic 경로에도 일관되게 반영되도록 정렬.
- 회귀 테스트 확장
  - `hybrid-resilience`에 3개 테스트 추가:
    - 모드별 이미지 문장 포함/미포함 검증
    - 2단 결론(summary의 `결론:` + `참고:`) 검증
    - 액션 개수 규칙(기본 2, 조건부 3) 검증

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과

### 리딩 출력 중복/톤 충돌 완화 및 경량 질문 응답 개선 (v6.3.48)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `docs/RELEASE_NOTES_v6.3.48.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 일반(비 compact) 출력에서 v3 레거시 텍스트 혼입 제거
  - `generateReadingV3` import/사용을 제거하고, non-compact 결과(`conclusion/evidence/action`)를 `toLegacyResponse` 기반 단일 경로로 정리.
  - 서사 톤/문장 스타일이 서로 섞이는 문제를 완화.
- 결론 문단 중복 원인 차단
  - `toLegacyResponse()`의 `conclusion` 생성 시 `report.fullNarrative` 우선 사용을 제거하고, `summary + verdict` 기반 조합으로 고정.
  - 장문 내 반복 구문과 섹션 충돌을 줄임.
- 맥락형 반론(함께 고려할 변수) 도입
  - `buildCounterpointsByContext()` 추가.
  - `readingKind/domainTag/questionType`에 따라 반론 문구를 분기하여 동일 문장 반복을 완화.
  - `overall_fortune`, `health`, `career`, `light/binary`, 일반 케이스별 차등 문구 적용.
- 경량 질문(light) 액션 가이드 정합성 보강
  - `questionType === 'light'`를 compact-like 처리에 포함.
  - 가벼운 질문에 과도하게 무거운 실행 지침이 출력되지 않도록 액션 세트를 분리.
- 문장 표현 보정
  - 카드 키워드 인용부에 작은따옴표를 적용해 근거 문장 가독성을 개선.
  - 일반 질문 액션 문구를 실무형 점검 문장으로 치환.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run build --prefix apps/web` 통과

### fallback 최소화 + 리딩 지연 단축 (v6.3.47)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/fallback-minimization.js`
- `apps/web/src/services/tarotService.ts`
- `docs/RELEASE_NOTES_v6.3.47.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 모델 호출 지연 단축
  - Anthropic primary/retry/repair 기본 타임아웃을 각각 `12s/7s/5s`로 축소.
- fallback 트리거 재정의
  - fallback은 `모델 미수신` 또는 `치명 계약 이슈`에서만 발동.
  - 비치명 품질 이슈는 fallback 없이 유지.
- partial salvage 적용/관측 강화
  - 모델 응답 불완전 시 전체 fallback 대신 normalize/postprocess 보강 경로 우선.
  - `qualityFlags`에 `partial_salvage_applied` 추가.
  - `analysis.safety.reasons`에 `model_timeout_retry`, `parse_repair_used`, `partial_salvage_applied`, `critical_contract_fix` 사유 누적.
- 웹 API 재호출 최적화
  - v2 실패 후 v1 폴백은 `5xx/네트워크 오류`에만 허용.
  - 4xx는 즉시 에러 처리해 불필요한 2차 API 호출 방지.
  - cards/spreads 메모리 캐시 추가로 반복 요청 감소.
- 테스트 보강
  - `fallback-minimization` 테스트 추가:
    - 비치명 이슈에서 fallback 미발생
    - partial salvage 플래그 기록 검증

#### 검증
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 맥락형 리딩 API v2 도입 (멀티의도/컨텍스트/안전강등) (v6.3.46)

#### 변경 파일
- `apps/api/src/domains/reading/questionType.js`
- `apps/api/src/index.js`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/question-profile-v2.js`
- `apps/api/tests/reading-v2-contract.js`
- `apps/web/src/services/tarotService.ts`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/RELEASE_NOTES_v6.3.46.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- API v2 엔드포인트 추가
  - `POST /api/v2/question-profile`, `POST /api/v2/reading` 추가.
  - v2 응답에 `analysis(intentBreakdown/domainDecision/readingDecision/safety)` 구조 포함.
- 질문 프로파일링 고도화
  - 멀티의도 분류 도입(top-3 의도).
  - 질문 유형 사전 확장(기존 6 + 확장 8: finance/family/friendship/self_growth/spirituality/education/relocation/legal).
  - 최근 5턴 컨텍스트 신호 반영.
  - 개인정보 마스킹(이메일/전화/식별형 숫자 패턴) 적용.
- 안전 강등 정책 적용
  - `confidence < 0.48` 또는 `margin < 0.08` 시 보수 모드(`general_reading`) 강등.
  - `health/legal` 도메인은 강제 보수 모드 유지.
- 하이브리드 메타 정합성 개선
  - `analysis`를 엔진 메타에 전달하고 실제 `responseMode`를 `analysis.readingDecision`에 반영.
- 웹 연동
  - 웹은 v2 우선 호출, 실패 시 v1 자동 폴백.
  - `sessionContext.recentTurns`(최대 5턴) 전달로 맥락 입력 강화.
  - 타입에 확장 domainTag 및 confidence/lowConfidence/contextUsed 반영.
- 운영 계측 확장
  - `intentTop1`, `downgraded`, `confidence`, `lowConfidence`, `contextUsed` 로깅 추가.

#### 검증
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 품질 플래그 단일화 + overall fortune UI 보정 축소 (v6.3.45)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/RELEASE_NOTES_v6.3.45.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- API 품질 플래그 단일화
  - `postProcessReport()`에서 `summary_verdict_overlap_high` 플래그 기록 제거.
  - 중복 시 실제 재작성이 필요한 경우 `auto_rewritten`만 기록.
  - overlap 품질 판정은 `verifyReport()` 기준으로 단일화.
- overall fortune UI 보정 책임 축소
  - `getDistinctReportCopy()`의 중복 체크 기반 다단계 치환 제거.
  - `verdict.rationale -> fortune.message -> workFinance -> love -> healthMind` 우선순위만 유지.
  - 완전 빈값 방지를 위한 최소 fallback 문구만 유지.
- 회귀 테스트 갱신
  - summary/rationale 중복 재작성 케이스에서 `summary_verdict_overlap_high` 미잔존 검증 추가.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과

## [2026-02-28]

### 후처리 최소화 + normalize 1차 보정 전환 (v6.3.44)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/RELEASE_NOTES_v6.3.44.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- postprocess 책임 축소
  - `postProcessReport()`에서 evidence 전면 재작성 경로 제거.
  - fortune 보정은 구조 위반/오염 케이스에서만 수행하도록 제한.
- normalize 단계 품질 보정 강화
  - `normalizeReport()` evidence 정규화에서 오염/빈값/역방향-낙관 충돌을 1차 교정.
  - `caution`은 prefix 제거 후 재검증해 안전 문장으로 정리.
- 웹 중복 회피 단순화
  - `getDistinctReportCopy()` overall fortune 분기에서 고정 상수 fallback 제거.
  - `energy -> workFinance -> love/healthMind` 우선순위 대체만 유지.
- 테스트 기준 정렬
  - evidence 품질 보정이 normalize 단계에서 처리되는 정책에 맞춰 플래그 기대치 조정.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과

## [2026-02-28]

### 리딩 문장 결합/중복/상세도 보정 (v6.3.43)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/overall-fortune-regression.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/RELEASE_NOTES_v6.3.43.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 문장 결합 오류 수정
  - `ensureTerminalPunctuation()`, `joinSentencesKorean()` 도입.
  - claim 후행 문장 추가 시 마침표/띄어쓰기 결합을 강제해 런온 문장 제거.
- 마스터 리포트 중복 완화
  - overall_fortune에서 summary와 badge 텍스트가 겹칠 때 fallback 경로를 강화.
  - `fortune.message` 단독 재사용 대신 `verdict/workFinance` 기반 대체 우선.
- evidence 반복감 추가 완화
  - 템플릿 다양도 선택기(`selectTemplateWithDiversity`)에 normalized 중복 회피 추가.
  - claim/rationale 중복 추적 집합을 분리 운영.
- 카드 의미-어조 미세 정합 보정
  - `m14(절제)` tone score 조정(`0.40 -> 0.32`).
  - 카드 스타일 힌트(`CARD_STYLE_HINTS`) 추가로 절제/탑 계열 문체 보정.
- 종합운세 상세화
  - `energy/workFinance/love/healthMind`를 2문장 구조로 확장.
  - 기간별 실행 힌트 문장을 추가해 설명 밀도 강화.
  - `ensureFortuneDensity()`를 길이+문장수 기준으로 확장.
- 회귀 테스트 보강
  - 탑 claim 런온 문장 미발생 검증 추가.
  - 절제 카드 균형 어휘 포함 검증 추가.
  - fortune 필드 최소 2문장 및 summary-message 중복 방지 검증 추가.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과

## [2026-02-28]

### 웹 운영 지표 페이지(/ops) 제거 (v6.3.42)

#### 변경 파일
- `apps/web/src/App.tsx`
- `apps/web/src/pages/OpsDashboard.tsx` (삭제)
- `apps/web/src/pages/OpsDashboard.module.css` (삭제)
- `apps/web/tests/OpsDashboard.test.tsx` (삭제)
- `apps/web/tests/validate-ui-contract.js`
- `docs/RELEASE_NOTES_v6.3.42.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- `/ops` 라우트 제거
  - 앱 라우터에서 운영 지표 페이지 엔트리를 삭제.
- 네비게이션 링크 제거
  - 데스크톱/모바일 메뉴의 `운영 지표` 항목 제거.
- 운영 지표 UI 소스 정리
  - `OpsDashboard.tsx` 및 관련 CSS 파일 삭제.
- 테스트 기준 갱신
  - UI 계약 테스트에서 `/ops` 링크/라우트의 "존재" 검증을 "미존재" 검증으로 전환.
  - `OpsDashboard` 컴포넌트 단위 테스트 파일 삭제.

#### 검증
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 반복감·강도·밀도 동시 보정 (v6.3.41)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/overall-fortune-regression.js`
- `docs/RELEASE_NOTES_v6.3.41.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- evidence 반복감 완화
  - rationale 템플릿 확장(버킷별 문장 수 증가).
  - `selectTemplateWithDiversity()` 도입으로 리딩 내부 중복 템플릿 재사용 억제.
  - 같은 suit 연속 카드 구간에서 rationale 선택군 회전 적용.
- 강한 카드 어조 완충
  - `CARD_INTENSITY_LEVELS`/`getCardIntensity()` 도입.
  - `m16`(탑) 등 고강도 카드의 caution/reversed claim에서 경고는 유지하되, 과장 대신 변동 관리/점검 중심 문장으로 완충.
- 섹션 밀도 균형화
  - `clampEvidenceClaim()`로 claim 길이 상한(150자) 적용.
  - `ensureFortuneDensity()`로 fortune 필드 최소 밀도 보강.
  - evidence 영역과 종합운세 영역의 텍스트 밀도 편차 완화.
- 회귀 테스트 보강
  - evidence rationale 다양성(고유 패턴 3개 이상) 검증 추가.
  - 탑 어조 완충 검증 추가.
  - evidence claim 길이 상한 검증 추가.
  - fortune 필드 최소 길이 검증 추가.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과

## [2026-02-28]

### evidence 톤 분리·카드별 어조 정합성 보정 (v6.3.40)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/overall-fortune-regression.js`
- `docs/RELEASE_NOTES_v6.3.40.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- verdict/evidence 스코어 분리
  - `getYesNoScore()`는 판정 전용으로 유지.
  - `getEvidenceToneScore()`를 도입해 evidence 어조를 별도로 계산.
- 카드별 어조 보정
  - suit 기본값 + 카드 오버라이드(`EVIDENCE_TONE_OVERRIDES`) 체계 추가.
  - `s01`, `p14` 포함 코트카드/메이저 일부의 정방향 톤 정합성 개선.
- evidence 문장 생성 개선
  - toneBucket(`positive/caution/neutral/reversed`) 기반 claim 생성으로 전환.
  - suit별 claim 템플릿(`EVIDENCE_CLAIM_TEMPLATES`) 추가.
  - 해시 기반 템플릿 선택으로 동일 리딩 내 반복 문구 완화.
- 테스트 보강
  - `s01`/`p14` 정방향이 neutral 고정 문구로 내려가지 않는지 검증 추가.
  - evidence claim 반복도(최소 다양성) 검증 추가.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과

## [2026-02-28]

### 운세 문장 품질 안정화·후처리 축소 4차 (v6.3.39)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/overall-fortune-regression.js`
- `docs/RELEASE_NOTES_v6.3.39.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 기간 조사 비문 방지
  - `withTopicParticle()`를 도입해 `buildFortuneSummary()` 조사 결합을 자동화.
  - `올해은` 형태 비문을 구조적으로 차단.
- deterministic evidence 문장 개선
  - 역방향 고정 suffix를 제거하고 orientation/polarity 기반 claim 생성(`buildEvidenceClaim`)으로 전환.
  - 생성 단계에서 점검/완충 톤을 확보해 후처리 의존도 축소.
- fortune 후처리 책임 축소
  - fortune 섹션 재작성은 구조 위반/오염 시에만 수행하도록 제한.
  - 정상 출력에 대한 스타일성 재작성은 생략.
- overall_fortune 섹션 매핑 안정화
  - `pickDominantFact()` fallback 우선순위를 명확히 하여 카드-섹션 매핑 일관성 강화.
- 회귀 테스트 보강
  - 역방향 deterministic claim 어조 검증 갱신.
  - summary 비문(`올해은`) 검증 추가.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과

## [2026-02-28]

### 후처리 3차 경량화·분류형 qualityFlags 확장 (v6.3.38)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `docs/RELEASE_NOTES_v6.3.38.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 스타일 과교정 축소
  - evidence 동일문장 장문 확장 로직 제거.
  - summary/verdict 중복 시 조건부 최소 재작성으로 축소(동일/빈 값일 때만).
  - safety 성 보정(오염 제거, 역방향-낙관 충돌 보정)은 유지.
- qualityFlags 분류형 확장
  - 기존 플래그 + `safety_*`, `style_*`, `contract_*` 분류 플래그 병행 기록.
  - debug 모드의 `modelQualityFlags`도 분류형으로 확장.
- 프롬프트 유도 강화
  - overall_fortune/concise-binary에 역방향 카드 어조 지시 추가.
- 회귀 테스트 보강
  - 분류형 플래그 동작 및 fallback 최종 플래그 오염 방지 검증 추가.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 최종 품질 기준 정렬·qualityFlags 분리·health finalize 통일 (v6.3.37)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `docs/RELEASE_NOTES_v6.3.37.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 최종 품질 기준 정렬
  - `finalizeOutputReport()`를 도입해 최종 report 확정 후 quality를 재계산.
  - 반환 `quality`/`meta.qualityFlags`가 최종 응답 기준과 일치하도록 정리.
- qualityFlags 분리
  - 모델 단계 플래그(`modelQualityFlags`)와 최종 응답 플래그를 분리.
  - 기본 응답은 최종 플래그만 노출, debug 모드에서만 모델 플래그 추가 노출.
- health 경로 단순화
  - deterministic 생성 단계가 아닌 finalize 단계에서 health guardrail을 단일 적용.
- 회귀 테스트 보강
  - fallback 경로에서 최종 품질 기준이 모델 단계 잡음에 오염되지 않는지 검증 추가.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 후처리 경량화·fallback 중복 제거·프롬프트 유도 강화 (v6.3.36)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `docs/RELEASE_NOTES_v6.3.36.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 후처리 경량화
  - fallback 경로에서 deterministic 결과에 `postProcessReport`를 재적용하던 중복 후처리 제거.
  - `rewriteRepetitiveEvidenceRationale` 제거로 스타일 재작성성 후처리 축소.
  - `enforceFortuneSectionDiversity`를 최소 보정 모드로 축소(완전 붕괴 시에만 보정).
- 품질 유지 전략 전환
  - 계약/안전 보정(오염 제거, health guardrail, 필수 정합성)은 유지.
  - 스타일 품질은 프롬프트 지시 강화(반복 금지, 역방향 어조 지시)로 유도.
- 회귀 테스트 보강
  - fallback deterministic 경로가 스타일 재작성 플래그에 의존하지 않는지 검증 케이스 추가.

#### 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 역/정방향 충돌 완화·반복 문구 축소·월간 표기 통일 (v6.3.35)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/overall-fortune-regression.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/tests/validate-ui-contract.js`
- `docs/RELEASE_NOTES_v6.3.35.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 정/역방향 해석 충돌 완화
  - evidence rationale 분기에서 역방향 우선 처리.
  - 역방향 claim에 `지연·재정비` 보완 문구 추가.
- 반복 문구 축소
  - evidence rationale 템플릿 다양화(`positive/caution/reversed/neutral`).
  - fortune 섹션 중복 접두 제거 정규화.
  - 반복 완화 후처리 적용 시 `qualityFlags`에 `phrase_repetition_rewritten` 기록.
- 표기 통일
  - 월간 질문/타이틀 문구 `이번 달`로 통일.
- 회귀 테스트 보강
  - 역방향 deterministic 문구 검증, fortune 접두 중복 검증, 월간 표기 계약 검증 추가.

#### 검증
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 리딩 일관성/건강 안전 우선/모바일 안정화 (v6.3.34)

#### 변경 파일
- `apps/api/src/domains/reading/questionType.js`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/common/TarotCard.module.css`
- `docs/RELEASE_NOTES_v6.3.34.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 질문 프로파일 안전 우선 정책 고정
  - 건강 맥락에서는 운세 키워드가 있어도 `readingKind=general_reading`을 우선 적용.
  - `overall_fortune`의 `fortunePeriod` 기본값을 `week`로 보정.
- 하이브리드 리딩 품질 일관성 강화
  - 운세 섹션 정규화(`period/trend/문구`) 로직 추가.
  - `energy/workFinance/love/healthMind` 문구 중복 붕괴 시 카드 근거 기반으로 자동 재작성.
  - 운세 보정 발생 시 `qualityFlags`에 `fortune_section_rewritten` 기록.
- 건강 가드레일 회귀 검증 보강
  - 운세 질문 + 건강 증상 혼합 시 health 우선 정책 적용 여부 테스트 추가.
- 모바일 UI 안정화
  - 마스터 리포트 본문 접기/펼치기 추가.
  - 운세 섹션은 필수 payload 완전성 체크 후 노출.
  - 카드 스프레드 safe inset/padding 보정, 메시지 하단 패딩 확장, 카드 라벨 밀도 조정.

#### 검증
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 메트릭 필터링/ops 고도화/릴리스 생성 자동화 (v6.3.33)

#### 변경 파일
- `apps/api/src/ops/metrics.js`
- `apps/api/src/index.js`
- `apps/api/tests/metrics-aggregation.js`
- `apps/web/src/pages/OpsDashboard.tsx`
- `apps/web/src/pages/OpsDashboard.module.css`
- `apps/web/tests/OpsDashboard.test.tsx`
- `scripts/generate-release-note.js`
- `package.json`
- `docs/OPERATIONS_METRICS.md`
- `docs/RELEASE_NOTES_v6.3.33.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 메트릭 저장/집계 표준화
  - 메트릭 append를 공통 유틸로 통합하고 파일 크기 회전(`TAROT_METRIC_MAX_BYTES`) 추가.
  - 집계에 `byDomainTag` 추가, zero-safe 계산 적용.
- admin metrics API 확장
  - `/api/admin/metrics`에 `window`, `limit` 쿼리 추가.
  - 동일 길이 이전 구간 비교 요약(`previous`) 반환.
- 운영 대시보드 개선
  - `/ops`에서 기간/건수 필터, Top fallback reason, DomainTag 분포, 이전 구간 비교 표시.
- 테스트/자동화
  - 메트릭 필터 함수(window/range) 테스트 추가.
  - OpsDashboard 단위 테스트를 확장 payload 기준으로 보강.
  - 릴리스 노트 생성 스크립트(`release:note`) 추가.

#### 검증
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run test:unit --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 운영 보안/단위테스트/야간 모니터링 고도화 (v6.3.32)

#### 변경 파일
- `.github/workflows/nightly-metrics-check.yml`
- `.github/workflows/quality-gate.yml`
- `apps/api/src/index.js`
- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `apps/web/tests/setup.ts`
- `apps/web/tests/OpsDashboard.test.tsx`
- `apps/web/tests/TarotMastery.test.tsx`
- `apps/web/src/legacy/README.md`
- `apps/web/src/legacy/ChatReading.tsx`
- `apps/web/src/legacy/Reading.tsx`
- `apps/web/src/legacy/StudyReading.tsx`
- `docs/OPERATIONS_METRICS.md`
- `docs/QUALITY_GATE.md`
- `docs/RELEASE_NOTES_v6.3.32.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 운영 보안
  - 운영 환경에서 `ADMIN_METRICS_KEY` 미설정 시 `/api/admin/metrics` 비활성화(503).
- 야간 모니터링
  - `nightly-metrics-check` 워크플로 추가.
  - 로그 파일 부재 시 skip 처리로 CI 오탐 방지.
- 테스트 체계 확장
  - Vitest + RTL 기반 웹 단위테스트 도입.
  - `TarotMastery`, `OpsDashboard` 렌더/흐름 핵심 케이스 검증.
  - quality-gate에 `test:unit` 추가.
- 코드 정리
  - 라우트 미사용 페이지를 `legacy` 폴더로 이동하여 메인 코드 경량화.

#### 검증
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run test:unit --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 운영 임계치/흐름 회귀/내부 대시보드 확장 (v6.3.31)

#### 변경 파일
- `.github/workflows/quality-gate.yml`
- `apps/api/package.json`
- `apps/api/scripts/aggregate-metrics.js`
- `apps/api/scripts/check-metrics-thresholds.js`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/api/src/ops/metrics.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/metrics-aggregation.js`
- `apps/web/package.json`
- `apps/web/src/App.tsx`
- `apps/web/src/pages/OpsDashboard.tsx`
- `apps/web/src/pages/OpsDashboard.module.css`
- `apps/web/tests/validate-ui-contract.js`
- `apps/web/tests/validate-reading-flow-contract.js`
- `docs/OPERATIONS_METRICS.md`
- `docs/QUALITY_GATE.md`
- `docs/RELEASE_NOTES_v6.3.31.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 임계치 운영
  - 메트릭 파싱/집계/임계치 평가를 `src/ops/metrics.js`로 공통화.
  - `metrics:check` 추가로 critical 임계치 초과 시 CI/운영 단계에서 즉시 탐지 가능.
- 흐름 회귀 강화
  - 웹 `test:ui-flow` 추가(질문→리딩→결과→리셋 계약).
  - API `test:metrics` 추가(집계/임계치 평가 로직 회귀 방지).
  - CI 게이트에 `test:metrics`, `test:ui-flow` 편입.
- 텍스트 품질 강화
  - evidence 품질 후처리(`enforceEvidenceQuality`)로 오염/모순/단조화 자동 보정.
  - `qualityFlags`에 rewrite 흔적 기록.
  - hybrid 회복력 테스트에 evidence 품질 보정 케이스 추가.
- 내부 운영 대시보드
  - `/api/admin/metrics` 엔드포인트 추가(옵션 키 인증).
  - 웹 `/ops` 페이지 추가(KPI, 임계치 상태, 분포 시각화).
- 문서 체계 반영
  - 운영 메트릭 가이드/품질 게이트/릴리스 노트 갱신.

#### 검증
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## [2026-02-28]

### 운영 메트릭 집계/모바일 읽기성/회귀 검증 확장 (v6.3.30)

#### 변경 파일
- `apps/api/src/index.js`
- `apps/api/package.json`
- `apps/api/scripts/aggregate-metrics.js`
- `apps/api/tests/overall-fortune-regression.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/tests/validate-ui-contract.js`
- `docs/OPERATIONS_METRICS.md`
- `docs/RELEASE_TEMPLATE.md`
- `docs/RELEASE_NOTES_v6.3.30.md`
- `docs/QUALITY_GATE.md`
- `docs/CHANGELOG.md`

#### 변경 사항
- 운영 관측
  - `TAROT_METRIC_LOG_PATH` 설정 시 리딩 메트릭을 JSONL 파일로도 저장.
  - `metrics:report` 스크립트 추가(`apps/api/scripts/aggregate-metrics.js`)로 fallbackRate, latency p50/p95, 원인 분포 집계.
- 회귀 테스트 강화
  - `overall-fortune-regression`에 중복 문장/오염 라벨/섹션 단조화 검증 추가.
  - 웹 `ui-contract`에 상태 전이(quick fortune, reset baseline) 검증 항목 추가.
- 모바일 UI 개선
  - 결과 영역의 `종합운세/안전안내/운명의 지침/함께 고려할 변수` 섹션에 접기/펼치기 추가.
  - 모바일에서는 기본적으로 일부 긴 섹션을 접어 초기 읽기 부담을 완화.
  - 입력창에 `enterKeyHint="send"`, `autoComplete="off"`, `spellCheck={false}` 적용.
- 문서 운영 체계
  - 운영 메트릭 가이드 문서(`docs/OPERATIONS_METRICS.md`) 추가.
  - 릴리스 작성 템플릿(`docs/RELEASE_TEMPLATE.md`) 추가.
  - 품질 게이트에 메트릭 점검 절차 추가.

#### 검증
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:ui-contract --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과
- `npm run metrics:report --prefix apps/api` 통과(샘플 로그)

## [2026-02-28]

### 품질 게이트 자동화 및 종합운세 회귀 체계 강화 (v6.3.29)

#### 변경 파일
- `.github/workflows/quality-gate.yml`
- `.gitignore`
- `apps/api/.env.example`
- `apps/api/package.json`
- `apps/api/src/index.js`
- `apps/api/tests/overall-fortune-regression.js`
- `apps/web/package.json`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/types/tarot.ts`
- `apps/web/tests/validate-ui-contract.js`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/QUALITY_GATE.md`
- `docs/RELEASE_NOTES_v6.3.29.md`
- `docs/SETUP_SECURITY.md`

#### 변경 사항
- 자동 품질 게이트
  - PR/`main` push마다 API/WEB 검증을 실행하는 CI 워크플로 추가.
  - 게이트 항목:
    - `test:persona`
    - `test:hybrid`
    - `test:fortune`
    - `test:ui-contract`
    - `build:web`
- 회귀 테스트 강화
  - API에 `overall-fortune` 4시나리오(today/week/month/year) 회귀 테스트 추가.
  - WEB에 핵심 UI 계약(빠른 운세 버튼, 탭 ARIA, stable key, 카드 검색 A11y) 검증 스크립트 추가.
- 운영 관측성 강화
  - `/api/reading` 응답 시 구조화된 메트릭 로그(`reading_metric`) 출력 추가.
  - requestId, fallbackUsed/reason, failureStage, totalMs, questionType 등 운영 필드 포함.
- 문서/코드 정합성
  - 아키텍처/보안 문서를 Anthropic + deterministic fallback 기준으로 정리.
  - UI 진단 라벨/타입에서 `OpenAI(legacy)` 경로 제거.
- 보안 위생
  - `apps/api/.env` 및 `apps/web/.env`를 `.gitignore`에 명시.
  - `apps/api/.env.example` 추가로 안전한 초기 설정 경로 제공.

#### 검증
- `npm run test:persona --prefix apps/api`
- `npm run test:hybrid --prefix apps/api`
- `npm run test:fortune --prefix apps/api`
- `npm run test:ui-contract --prefix apps/web`
- `npm run build --prefix apps/web`

## [2026-02-28]

### UI 최적화: 안정성/성능/CSS토큰/A11y 정비 (v6.3.28)

#### 변경 파일
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/components/reading/MessageBubble.tsx`
- `apps/web/src/styles/theme.css`
- `apps/web/src/pages/Cards.module.css`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/pages/Cards.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.28.md`

#### 변경 사항
- 버그/안정성
  - `Message` 타입에 `id` 추가, `messages.map`의 key를 index에서 `msg.id`로 교체.
  - TarotMastery 메시지 생성 로직을 `makeMsg()`로 통일하여 안정적인 key 보장.
  - `allSpreads` 비어있는 경우 가드 추가 후 사용자 안내 메시지 출력.
  - 탐구 패널에서 카드 접근 전 null 가드 추가(`info.card` 확인)로 런타임 crash 경로 차단.
- 렌더링 성능
  - `MessageBubble`에 `React.memo` 적용.
  - `hashString`, `createSeededRandom`, `shuffleWithRandom`, `normalizeForCompare` 등 순수 유틸을 컴포넌트 외부로 이동.
  - `ResizeObserver`와 중복되던 `window.resize` 리스너 제거.
- CSS 토큰 정규화
  - `theme.css`에 반복 토큰 3개 추가:
    - `--border-gold-faint`
    - `--glass-subtle`
    - `--radius-pill`
  - `Cards.module.css`, `TarotMastery.module.css`의 반복 하드코딩 값을 새 토큰 참조로 교체.
- 접근성(A11y)
  - Cards 검색 input에 `aria-label="카드 검색"` 추가.
  - Cards 필터 버튼에 `aria-pressed` 추가.
  - TarotMastery 탭에 `role="tablist"/role="tab"` + `aria-selected/aria-controls` 추가.
  - 탭 패널에 `role="tabpanel"` + `aria-labelledby` 연결.

#### 효과
- 메시지 추가/리셋 시 key 불안정으로 인한 UI 재사용 오류 가능성 감소.
- 대화 메시지 렌더 비용을 줄여 체감 스크롤/입력 반응성 개선.
- 스타일 하드코딩 반복 감소로 유지보수성 향상.
- 키보드/보조기기 사용 시 탐색 가능성과 상태 인지성 개선.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.28.md`

## [2026-02-28]

### overall_fortune 출력 어색함 5가지 수정 (v6.3.27)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.27.md`

#### 변경 사항
- 중복 텍스트 제거
  - `overall_fortune`에서 "사서의 통찰:" 절 조건부 숨김
    (`conclusion`이 이미 summary를 표시하므로 2회 출력 방지).
  - fortune 분야별 목록에서 "메시지:" 항목 제거 (verdictBadge에서만 표시).
- evidence claim 문법 개선
  - `"X의 상징인 '완결문입니다'"` 비문 패턴 → `"X(방향) — 핵심 의미"` 대시 형식으로 교체.
  - buildPrompt AI 지침에도 해당 패턴 금지 명시.
- evidence rationale 카드 연결
  - 정/역방향 고정 문구 → 카드별 `keywords.slice(0,2)`를 포함한 개인화 문구.
  - 예) `"균형·절제 에너지가 활성화되어, 이 흐름에 맞춰 나아가기 좋은 시점입니다."`
- fortune 섹션 카드 이름 반복 방지
  - `claimCardLabel(fact, refFact)` 헬퍼 추가: energyFact와 동일 카드이면 "이 카드" 반환.
  - 1장 스프레드에서 workClaim/loveClaim/mindClaim의 카드 이름 4회 반복 → "이 카드"로 간소화.

#### 효과
- overall_fortune 리딩 결과의 텍스트 중복·반복·비문 문제 해소.
- evidence rationale이 카드별 에너지 특성을 반영해 리딩마다 다른 맥락 제공.

---

### 종합운세 정합성 보정: 기간 라벨/역방향 논리/다카드 집계/중복 완화 (v6.3.26)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/services/analytics.ts`
- `apps/web/src/services/tarotService.ts`
- `apps/web/src/types/tarot.ts`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.26.md`

#### 변경 사항
- 기간 라벨 정합성 보정
  - 종합운세 박스 제목을 기간별로 동적 표시:
    - 오늘의/이번주/이번달/올해 타로 종합운세
- 역방향 해석 충돌 보정
  - 카드 근거 문장에서 정방향 키워드 고정 템플릿을 제거하고 orientation 기반 설명으로 교체.
  - 점수 산정에도 orientation(정/역)을 반영하도록 변경.
- 트렌드 판정 안정화
  - 다카드 점수에 임계값(threshold) 적용해 과도한 `상승`/`주의` 판정을 완화.
  - 종합운세는 verdict를 YES/NO 단정 대신 기조 해석 중심으로 정규화.
- 다카드 집계 로직 강화(주/월/연)
  - 전체 카드에서 suit/메이저 성격을 기준으로 `에너지/일·재물/애정/건강·마음` 대표 카드를 선택해 요약.
  - 월간/연간에서 앞 3장 편향을 줄이고 전체 스프레드 반영도를 높임.
- 템플릿 반복 문구 완화
  - today/week/month/year 기간별로 메시지·조언·변수 문구를 분기.
  - 기간 스케일에 맞는 액션 지침으로 교체(일간 단기 루틴, 연간 분기 회고 등).
- 중복 표현 완화
  - 상단 `사서의 통찰`은 summary 중심, 하단 종합운세 박스는 분야별 상세 중심으로 역할 분리.
- 톤 모드 제거 정리
  - `차분/공감/신비` UI 제거 및 관련 타입/요청/분석 필드(`personaTone`) 정리.
  - API는 단일 기본 톤으로 일관 동작.

#### 효과
- 주/월/연 운세에서 제목/구조/판정이 질문 기간과 일치해 읽기 신뢰도가 개선.
- 역방향 카드가 포함된 리딩에서 의미 충돌(역방향 설명 + 정방향 키워드)이 감소.
- 연간/월간 운세가 소수 카드 편향 없이 스프레드 전체를 반영해 설득력이 향상.
- 반복 템플릿 느낌이 줄고 기간별 실천 가이드가 더 현실적으로 제공됨.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.26.md`

## [2026-02-28]

### 종합운세 고도화: 전용 스키마 + 정/역방향 + 기간/톤/재현성 통합 (v6.3.25)

#### 변경 파일
- `apps/api/src/domains/reading/questionType.js`
- `apps/api/src/index.js`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/services/tarotService.ts`
- `apps/web/src/services/analytics.ts`
- `apps/web/src/types/tarot.ts`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.25.md`

#### 변경 사항
- 종합운세 전용 분기(`readingKind=overall_fortune`) 도입
  - 질문 프로파일에서 `readingKind`, `fortunePeriod(today|week|month|year)`를 함께 반환.
  - 종합운세 질문은 기간 키워드에 따라 스프레드를 안정 매핑:
    - 오늘→`daily(1)`
    - 이번주→`weekly(3)`
    - 이번달→`monthly(5)`
    - 올해→`yearly(12)`
- 종합운세 전용 결과 스키마 추가
  - `report.fortune` 블록 신설:
    - `period`, `trendLabel(UP|BALANCED|CAUTION)`,
    - `energy`, `workFinance`, `love`, `healthMind`, `message`
- 정/역방향(orientation) 해석 반영
  - 프론트 드로우 단계에서 카드별 `orientation` 생성.
  - API 요청에 `cardDraws[{id, orientation}]` 전달.
  - 엔진에서 정/역방향에 따라 `card.meanings` vs `card.reversed` 의미를 선택.
  - 카드 공개 메시지에 `(정방향/역방향)` 표기 추가.
- 종합운세 라벨 정책 변경
  - 종합운세에서는 YES/NO 강조 대신 `trendLabel` 중심으로 표시.
  - UI 배지 텍스트를 `상승/균형/주의 기조`로 표시하도록 확장.
- 페르소나 톤 선택 추가
  - 입력 화면에 `차분/공감/신비` 톤 버튼 추가.
  - `personaTone`을 API 프롬프트 가이드로 전달해 결과 문체 강도 조절.
- 하루 운세 재현성(seed) 추가
  - 종합운세 질문에서만 `sessionId + localDate + period + spreadId` 기반 seeded shuffle 적용.
  - 같은 세션·같은 날짜·같은 기간 질문은 카드 구성이 안정적으로 재현.
- 분석/계약 확장
  - analytics payload에 `readingKind`, `fortunePeriod`, `personaTone` 추가.
  - 타입 계약에 `readingKind`, `fortunePeriod`, `trendLabel`, `personaTone`, `report.fortune` 반영.

#### 효과
- “오늘/주간/월간/연간 종합운세”의 결과 형태가 질문 의도에 맞게 일관됨.
- 외부 앱 대비 부족했던 정/역방향 표현과 운세형 구조(에너지/재물/애정/건강/메시지)를 보완.
- 동일한 운세 질문에서 매번 결과가 크게 달라지는 체감이 줄어 신뢰도가 향상.
- 사용자 취향에 맞는 결과 톤 선택이 가능해 만족도 개선.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.25.md`

## [2026-02-28]

### 모바일 UI 전면 재배치: 단일 스크롤 흐름 + 터치 타깃/입력 안정화 (v6.3.24)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `apps/web/src/App.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.24.md`

#### 변경 사항
- 모바일 레이아웃 재배치(성소 화면)
  - 모바일에서 `TarotMastery` 페이지를 고정 높이 중심(`height`)에서 `auto + min-height` 중심으로 전환.
  - 성소 컨테이너/메인 콘텐츠의 `overflow` 정책을 완화해 내부 패널 스크롤 중첩을 줄이고 페이지 단일 스크롤 흐름으로 정리.
  - 모바일에서 패널 모서리/여백을 재조정해 콘텐츠 밀집으로 인한 잘림/압박 완화.
- 스크롤/터치 사용성 강화
  - 좌측 탭(`카드 스프레드/아르카나 탐구`)을 모바일에서 `sticky` 처리해 전환 접근성을 높임.
  - 주요 인터랙션 컴포넌트(탭 버튼, 새 질문 버튼, 입력창, 전송 버튼)를 `44px+` 터치 타깃 기준으로 확대.
  - 메시지 영역 패딩과 간격을 모바일 기준으로 재조정해 스크롤 시 정보 밀도/가독성 균형 개선.
- 입력 영역 안정화
  - 모바일 입력 폼을 하단 `sticky`로 전환하고 `safe-area-inset-bottom`을 반영.
  - 키보드 사용 시 하단 조작 요소가 가려지는 체감 문제를 완화.
- 앱 공통 모바일 간격 정리
  - `App.main` 모바일 패딩을 축소하여 성소 화면의 가로 공간 활용도 개선.
- 메시지 버블 모바일 가독성 보정
  - 버블 최대 폭/패딩/폰트 크기를 재조정해 줄바꿈 과밀과 터치 오작동 가능성 완화.

#### 효과
- 모바일에서 "어디를 스크롤해야 하는지"가 명확해져 조작 피로 감소.
- 입력/전송/탭 전환이 손가락 기준으로 더 안정적으로 동작.
- 좁은 화면에서도 리포트 본문과 카드 영역이 덜 답답하게 표시됨.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.24.md`

## [2026-02-28]

### 질문 프로파일 v2 + 헬스 가드레일 + 스프레드 선택 정책 전환 (v6.3.23)

#### 변경 파일
- `apps/api/src/domains/reading/questionType.js`
- `apps/api/src/index.js`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/reading-persona-regression.json`
- `apps/api/tests/validate-persona-regression.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/services/tarotService.ts`
- `apps/web/src/types/tarot.ts`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.23.md`

#### 변경 사항
- 질문 프로파일 v2 도입
  - `questionType` 외에 `domainTag`, `riskLevel`, `recommendedSpreadId`, `targetCardCount`를 함께 산출.
  - 건강 증상/응급 키워드 기반 risk 분류(`low/medium/high`) 추가.
- 스프레드 선택 정책 전환
  - 프론트의 `cardCount -> spread` 하드매핑(특히 `5장 => career-path`) 제거.
  - `POST /api/question-profile` 응답의 `recommendedSpreadId`를 우선 사용하도록 변경.
- 헬스 도메인 안전 가드레일 추가
  - health 질문에서는 판정을 `MAYBE`로 고정하고 `recommendedOption=NONE`으로 정규화.
  - summary/verdict/actions에 의료 대체 불가 및 진료 우선 안내를 강제.
  - health 맥락은 `responseMode=concise`로 제한해 과도한 서사/단정형 어조 완화.
- 오염/중복 후처리 강화
  - 오염 패턴 확장(`긍정의 기운`, `[영혼의 조율]`, `[운명의 실천]` 등).
  - actions/counterpoints의 접두 오염 문자열 제거 후 dedupe.
  - summary/verdict에도 오염 문자열 방어 로직 추가.
- UI 정책 연동
  - health 맥락에서 결과 배지를 `안전 안내`로 전환.
  - 결과 영역에 의료 대체 불가/증상 악화 시 진료 우선 고지 블록 추가.
  - 이벤트 트래킹에 `domainTag`, `riskLevel` 포함.
- 회귀 테스트 보강
  - 배탈 시나리오(`저녁은 샐러드를 먹을까...`)를 persona 회귀에 추가.
  - health 도메인에서 unsafe YES 응답이 들어와도 guardrail로 `MAYBE` 강제되는지 검증 추가.

#### 효과
- 건강/증상 질문이 커리어 스프레드로 잘못 라우팅되던 문제를 구조적으로 완화.
- “타로 결과가 의료 판단을 대체하는 듯 보이는” 리스크를 정책적으로 차단.
- 질문 프로파일과 UI/엔진/테스트 계약이 일치해 회귀 위험 감소.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.23.md`

## [2026-02-28]

### 스프레드 자동 맞춤 + 리포트 오염/중복 후처리 강화 (v6.3.22)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/tests/validate-persona-regression.js`
- `apps/web/src/types/tarot.ts`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.22.md`

#### 변경 사항
- 좌측 카드 스프레드 자동 맞춤 렌더링 도입
  - `ResizeObserver`로 스프레드 뷰포트 실측 크기 추적.
  - 카드 박스(카드 본체 + 라벨 높이) 기준 bounding box를 계산해 `scale + offset` 자동 산출.
  - 기존 중심 고정 단순 스케일에서, 실제 경계 중심 정렬로 전환해 상단/측면 클리핑 완화.
  - 모바일에서 강제 `transform: scale(0.4)` 규칙 제거해 이중 스케일 충돌 방지.
- 하이브리드 리포트 품질 후처리 강화
  - `summary`와 `verdict.rationale` 고중복 감지 시 rationale 자동 재작성.
  - `counterpoints/actions`에서 섹션 오염 문구(예: `[운명의 판정]`, `사서의 통찰:` 등) 필터링.
  - 리스트 항목 dedupe 및 길이 상한 적용으로 반복/과장 출력 억제.
  - 조사 자동 선택(`을/를`) 보정으로 키워드 연결 문장 자연스러움 개선.
  - `meta.qualityFlags`에 품질 보정 플래그를 기록해 운영 추적 가능성 강화.
- 회귀 테스트 강화
  - persona 회귀 검증에 `summary`/`verdict.rationale` 중복 금지 검사 추가.
  - counterpoints 오염 텍스트 포함 여부 검사 추가.
  - hybrid 복원력 테스트에 중복 재작성/오염 필터 시나리오 추가.
- 타입 계약 확장
  - 웹 `ReadingResponse.meta`에 `qualityFlags?: string[]` 반영.

#### 효과
- 큰 스프레드(5장/7장 등)에서 상단 카드 잘림 빈도가 크게 감소.
- 리포트 내 중복/섹션 오염 텍스트가 줄어 가독성과 신뢰도가 개선.
- 품질 후처리 동작을 요청 단위 메타로 관측할 수 있어 디버깅 속도 향상.

#### 검증
- `npm run build --prefix apps/web` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- `npm run test:hybrid --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.22.md`

## [2026-02-28]

### 라이트 양자택일 리딩 어색함 개선: 중복 제거 + 자연어 톤 보정 (v6.3.21)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.21.md`

#### 변경 사항
- 라이트 양자택일(짧은 binary) 전용 표현 보정
  - verdict rationale에서 `"[선택지] 쪽"` 형태의 어색한 대괄호/조사 표현 제거.
  - 자연어 선택 문장(`~선택이 더 안정적`)으로 정규화.
- concise binary 전용 생성 가이드 강화
  - 짧은 질문에서 과장 수사/장문 서사를 억제하는 스타일 가이드 추가.
  - 결론을 2~3문장 중심으로 간결화.
- deterministic 액션 문구 개선
  - light+binary에서 과도한 내면/명상형 지침 대신 즉시 실행형 2개 지침 사용.
- compact 결론 중복 제거
  - compact 모드 결론에서 `[운명의 판정]` 라인을 제거해 본문-판정 중복 완화.
- UI 렌더링 보정
  - 카드 공개 메시지에서 concise binary는 claim 중심으로 간결 표시.
  - `사서의 통찰/기운` 보조 문구를 concise binary에 맞게 단문으로 정리.
  - 사용자 모드에서 `[운명의 지침 n]` 접두를 숨기고 실제 행동 문장만 표시.
  - concise binary + 정상 응답에서는 `함께 고려할 변수` 섹션을 숨기고,
    fallback 시에만 노출.

#### 효과
- "커피를 마실까 말까?" 같은 라이트 질문에서 문장 어색함과 반복 피로가 줄어듦.
- 결과 리포트가 더 짧고 명확해져 핵심 결론 파악 속도가 개선됨.
- 기술/서사 과잉 없이 일상 의사결정 맥락에 맞는 지침이 제공됨.

#### 검증
- `npm run build --prefix apps/web` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- `npm run test:hybrid --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.21.md`

## [2026-02-28]

### 우측 패널 토글 제거: 운명의 리포트 단일 흐름화 (v6.3.20)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.20.md`

#### 변경 사항
- 우측 패널의 `운명의 리포트 / 아르카나 탐구` 탭 UI를 제거.
- 결과 화면을 `운명의 리포트` 단일 흐름으로 고정해 토글 없이 바로 핵심 결과를 읽도록 변경.
- 우측 토글과 연계된 상태/핸들러 정리:
  - `resultTab` 상태 제거
  - `handleTabSwitch()` 제거
  - 스크롤 하단 이동 effect 의존성에서 `resultTab` 제거
  - reset 시 탭 초기화 로직 제거
- 우측 `study` 분기 렌더링(아르카나 탐구 탭 콘텐츠) 제거.

#### 효과
- 우측 결과 영역의 상단 조작 요소가 줄어 리포트 집중도가 향상됨.
- 사용자 동선이 단순화되어 결과 확인까지의 클릭 단계가 감소.
- 좌측 토글(카드 스프레드/아르카나 탐구)과 우측 리포트 역할 분리가 명확해짐.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.20.md`

### 좌측 패널 토글 전환: 카드 스프레드/아르카나 탐구 단일 뷰화 (v6.3.19)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.19.md`

#### 변경 사항
- 좌측 패널 표시 방식을 고정 2분할에서 탭 토글 방식으로 전환.
  - 탭: `카드 스프레드` / `아르카나 탐구`
  - 한 번에 하나의 뷰만 렌더링해 각 콘텐츠가 더 넓은 영역을 사용하도록 변경.
- 좌측 레이아웃 구조 변경.
  - `leftPane`을 상하 그리드에서 단일 뷰포트(`leftPaneViewport`) 중심 구조로 변경.
  - 상단에 좌측 전용 탭 버튼(`leftPaneTabs`, `leftPaneTabBtn`) 추가.
- 스프레드/탐구 전환 상태 관리 추가.
  - `leftPaneTab` 상태(`spread | study`) 도입.
  - 새 리딩 시작(`handleStartRitual`) 및 초기화(`handleReset`) 시 기본 탭을 `spread`로 자동 복귀.
- 탐구 패널은 기존 탐구 카드 스타일을 유지하되, 토글 전환에 맞춰 전체 높이를 사용하도록 조정.

#### 효과
- 카드 이미지와 탐구 텍스트가 동시에 공간을 나눠 갖지 않아, 선택된 콘텐츠의 가시성이 개선됨.
- 좌측 영역에서 사용자 의도(카드 보기 vs 탐구 읽기)에 맞게 집중 가능한 정보 밀도 제공.
- 화면 폭이 넓을수록 토글 뷰의 체감 이점이 커져 탐색 효율이 향상됨.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.19.md`

### 좌측 패널 아르카나 탐구 대체 + 성소 전반 폰트 스케일 상향 (v6.3.18)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.18.md`

#### 변경 사항
- 좌측 하단 패널 대체
  - `기본 카드 설명` 영역을 `아르카나 탐구` 패널로 전면 교체.
  - 카드별 출력을 탐구 카드 구조(`포지션 라벨 + 카드명 + 포지션 설명 + 카드 상세 설명 + 키워드`)로 통일.
  - 기존 요약 전용 함수 기반 렌더링을 제거하고 `description || summary` 본문 중심으로 표시.
- 폰트 크기 전반 상향
  - 성소 헤더, 좌측 패널 제목/본문, 탭 버튼, 리포트 텍스트, 배지/목록, 입력창/버튼 폰트를 단계적으로 상향.
  - 메시지 버블(`MessageBubble`) 기본/액션/모바일 폰트 크기를 함께 상향해 채팅 영역 가독성 균형 유지.
- 반응형 정리
  - 모바일 탭 버튼 폰트 규칙 중복을 제거해 최종 크기 규칙을 단일화.

#### 효과
- 좌측 패널 정보 밀도가 `탐구 탭`과 동일한 수준으로 맞춰져 학습 흐름이 일관됨.
- 데스크톱/모바일 모두에서 작은 글씨로 인한 피로도가 줄고 핵심 문장 스캔 속도가 개선됨.
- 채팅/리포트/탐구의 타이포그래피 레벨이 맞춰져 화면 전체 톤이 안정화됨.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.18.md`

### 질문 프로파일 단일화 + 운영 계측 API + 성소 UX 신뢰성 강화 (v6.3.17)

#### 변경 파일
- `apps/api/src/domains/reading/questionType.js` (신규)
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/web/src/services/tarotService.ts`
- `apps/web/src/services/analytics.ts`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/common/TarotCard.tsx`
- `apps/web/src/components/common/TarotCard.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.17.md`

#### 변경 사항
- 질문 분류 규칙 단일화
  - `questionType` 및 `targetCardCount` 추론 로직을 API 공용 유틸(`questionType.js`)로 통합.
  - `hybrid.js`와 `index.js`가 동일 규칙을 사용하도록 변경.
  - 신규 API `POST /api/question-profile` 추가, 프론트가 서버 기준 분류/카드 수를 사용하도록 전환.
- 운영 계측 실연결
  - 신규 API `POST /api/analytics` 추가.
  - 프론트 `trackEvent()`가 `sendBeacon` 우선 + `fetch(keepalive)` 폴백으로 이벤트를 전송하도록 개선.
  - 세션 단위 추적을 위해 `sessionStorage` 기반 `sessionId` 도입.
- 리딩 메타 타입 정합성 회복
  - 웹 `ReadingResponse.meta`에 `attempts`, `failureStage`, `timings.anthropicRepairMs` 반영.
- 성소 화면 신뢰성/접근성 강화
  - 리딩 단계 타이머를 ref 큐로 관리하고 reset/unmount 시 clear하여 경쟁 상태 제거.
  - 카드 공개 메시지를 문자열 split 중심에서 `report.evidence` 우선 조합으로 변경해 파싱 취약성 완화.
  - 진단 배지는 기본 사용자 화면에서 숨기고, `?debug=1` 또는 개발 환경에서만 노출.
  - 카드 뒤집기 인터랙션을 `button` 시맨틱으로 교체하고 `focus-visible` 스타일/ARIA 라벨 제공.
  - `aria-live` 안내 영역을 추가해 로딩/결과 상태를 보조기기에 전달.

#### 효과
- 질문 유형 드리프트(FE/BE 불일치) 위험을 구조적으로 축소.
- 사용자 행동 지표를 수집할 기반 확보(완독/탭전환/재질문 등 후속 지표 분석 가능).
- 리딩 중 reset/재시작 시 간헐적 UI 경합 및 메시지 꼬임 가능성 감소.
- 기본 사용자 경험에서 기술 진단 정보 노출을 줄여 몰입도 개선.
- 키보드 사용자 접근성과 상태 인지성이 개선.

#### 검증
- `npm run build --prefix apps/web` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- `npm run test:hybrid --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.17.md`

## [2026-02-28]

### 아르카나 성소 와이드 확장 + 우측 스크롤바 노출 강화 + 기본 카드 설명 심화 (v6.3.16)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.16.md`

#### 변경 사항
- 화면 가로폭 확장
  - `.page` 최대 폭을 `1520px -> 1720px`로 확대.
  - `workspaceGrid` 비율을 `46/54`에서 `44/56`으로 조정하고 우측 최소 폭을 확대해 리포트 패널 가용 폭 확보.
- 우측 스크롤바 가시성 강화
  - 스크롤 주체를 메시지 내부(`.messages`)에서 우측 패널 컨테이너(`.rightPane`)로 이동.
  - `overflow-y: scroll` + `scrollbar-gutter: stable both-edges` 적용으로 스크롤 인지성과 폭 안정성 강화.
  - 파이어폭스/웹킷 모두에서 눈에 띄는 커스텀 스크롤바 트랙/썸 스타일 적용.
- 기본 카드 설명 심화
  - 카드별 출력 정보를 `포지션 의미 + 카드 본문(최대 3문장) + 키워드 태그(최대 5개)`로 확장.
  - `getCardBaseDescription()`를 개선해 `description/summary`를 정규화 후 결합, 텍스트 길이가 짧을 때 요약을 보강하도록 로직 추가.

#### 효과
- 데스크톱에서 좌우 패널이 덜 답답하게 보이며 긴 리딩 텍스트 가독성 향상.
- 우측 패널이 스크롤 가능 영역임을 즉시 인지 가능하고, 탭/메시지 길이 변화 시 폭 점프가 줄어듦.
- 좌하단 기본 카드 설명이 단순 요약을 넘어 맥락/키워드까지 제공해 학습 밀도 상승.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.16.md`

### 하이브리드 리딩 fallback 저감 안정화 (v6.3.15)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/package.json`
- `docs/SETUP_SECURITY.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.15.md`

#### 변경 사항
- Anthropic 타임아웃 기본값을 안정성 우선으로 재조정.
  - `ANTHROPIC_TIMEOUT_MS`: `60000`
  - `ANTHROPIC_RETRY_TIMEOUT_MS`: `25000`
  - `ANTHROPIC_REPAIR_TIMEOUT_MS`: `12000` (신규)
- 실패 원인별 재시도 정책 도입.
  - 재시도: timeout/fetch 오류/parse 오류/5xx
  - 비재시도: `404`(model_not_found), `401/403`(auth), `429`(rate limited)
- JSON 파싱 실패 시 repair 전용 프롬프트로 1회 복구 시도 추가.
- 응답 정규화/검증 로직 보강으로 과도한 fallback 감소.
  - evidence를 카드 수/카드 ID에 맞게 정규화
  - 치명 이슈(요약/판정/evidence 길이) 중심으로 fallback 판정
  - 낮은 evidence 품질은 점수 페널티로만 반영
- 운영 진단 메타 확장.
  - `meta.attempts`(primary/retry/repair 단계별 결과)
  - `meta.failureStage`(network/http/parse/validation 등)
  - `meta.timings.anthropicRepairMs` 추가
- 복원력 회귀 테스트 추가.
  - `npm run test:hybrid --prefix apps/api`

#### 효과
- parse/부분 구조 불안정 응답에서 deterministic fallback 직행 비율이 감소.
- fallback 발생 시 원인을 단계별로 추적할 수 있어 운영 디버깅 속도 향상.
- 문서 기본값과 코드 기본값 정합성 회복.

#### 검증
- `npm run test:hybrid --prefix apps/api` 통과.
- `npm run test:persona --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.15.md`

## [2026-02-28]

### 아르카나 성소 우측 패널 스크롤바 가시성 개선 (v6.3.14)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.14.md`

#### 변경 사항
- `아르카나 성소` 우측 패널(`.messages`)의 세로 스크롤 동작을 `auto`에서 `scroll`로 변경.
- `scrollbar-gutter: stable`을 추가해 콘텐츠 길이에 따라 레이아웃 폭이 흔들리지 않도록 고정.
- 기존 `thin` 스크롤바 스타일(파이어폭스/웹킷 커스텀)은 유지해 테마 일관성을 보존.

#### 효과
- 우측 리딩 영역에서 스크롤바가 항상 표시되어 스크롤 가능 상태를 즉시 인지할 수 있음.
- 결과 탭 전환 및 메시지 길이 변화 시 우측 패널의 가로 폭 점프가 감소해 읽기 흐름이 안정화됨.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.14.md`

## [2026-02-28]

### 리딩 화면 3분할 레이아웃 전환 및 와이드 뷰 확장 (v6.3.13)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.13.md`

#### 변경 사항
- 리딩 화면 메인 구조를 3분할로 재배치.
  - 좌상단: 카드 스프레드 영역
  - 좌하단: 기본 카드 설명 패널(포지션/카드명/요약)
  - 우측: 운명의 리포트/아르카나 탐구 탭 및 대화 영역
- 질문 입력 전에도 좌상단에 플레이스홀더를 제공해 화면 구조를 고정.
- 우측 리포트 영역은 독립 패널로 분리해 스크롤/가독성 안정화.
- 전체 페이지 최대 폭을 확장(`1100px -> 1520px`)해 가로 레이아웃 활용도 개선.
- 모바일에서는 1열 스택으로 자동 전환되도록 반응형 규칙 추가.

#### 효과
- 카드/기본설명/리포트가 동시에 보여 탐색 동선이 단축됨.
- 기존 대비 넓은 가로 구성을 활용해 데스크톱에서 정보 밀도와 가시성 향상.
- 리딩 진행 중/완료 후 화면 점프를 줄여 UX 일관성 강화.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.13.md`

## [2026-02-28]

### 완드 9 카드 이미지 로드 실패 핫픽스 (v6.3.12)

#### 변경 파일
- `apps/api/src/data/wands.js`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.12.md`

#### 변경 사항
- `w09`(지팡이 9) 카드의 이미지 URL을 404 경로에서 정상 응답(200) 경로로 교체.
  - 기존: `https://commons.wikimedia.org/wiki/Special:FilePath/Wands09.jpg`
  - 변경: `https://commons.wikimedia.org/wiki/Special:FilePath/Tarot%20Nine%20of%20Wands.jpg`

#### 원인
- Wikimedia `Special:FilePath/Wands09.jpg` 리다이렉션 체인의 최종 응답이 404로 반환되어 해당 카드만 이미지가 깨짐.

#### 효과
- 지팡이 9 카드가 정상적으로 렌더링됨.
- 특정 카드 단일 이미지 누락으로 인한 UI 불일치 해소.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.12.md`

## [2026-02-28]

### 결과 화면 가독성 개선: 폰트 상향 + 탐구 섹션 상하 분할 (v6.3.11)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.11.md`

#### 변경 사항
- 결과 화면 전반의 폰트 크기를 소폭 상향해 장문 리딩 가독성 개선.
  - 마스터 리포트, 요약 박스, 지침, 진단 배지, 탭 버튼, 입력창, 메시지 버블 텍스트 조정.
- `아르카나 탐구` 섹션의 다열(좌우 분할) 레이아웃을 1열(상하 분할) 고정으로 변경.
  - `studyGrid`를 단일 컬럼으로 통일하고, 데스크톱에서 최대 폭을 제한해 줄 길이 안정화.
- 모바일에서도 동일한 상하 흐름을 유지하도록 반응형 설정 정리.

#### 효과
- 카드 해석/결론/지침 문단을 더 쉽게 훑을 수 있어 피로도 감소.
- 탐구 카드가 좌우로 분산되지 않고 세로로 이어져 읽기 흐름이 자연스러워짐.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.11.md`

## [2026-02-28]

### 결과 요약 중복 제거 및 보조 인사이트 차별화 (v6.3.10)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.10.md`

#### 변경 사항
- 결과 화면의 `운명의 마스터 리포트`와 `사서의 통찰/유보(신중/긍정)의 기운` 문구가 사실상 동일하게 반복되던 문제 수정.
- `conclusion`과 `report.summary/verdict.rationale`의 중복 여부를 정규화 비교로 판별하는 로직 추가.
- 중복 감지 시 보조 텍스트를 아래 우선순위로 치환:
  - `사서의 통찰`: 첫 카드 근거(`evidence`) 기반 문장
  - `~의 기운`: 첫 실천 지침(`action`) 기반 문장
- 중복이 아닌 경우 기존 생성 텍스트를 그대로 유지.

#### 효과
- 같은 의미가 반복되는 체감을 줄이고, 보조 박스가 “요약 반복”이 아니라 “근거/실천 보강” 역할을 수행.
- concise 모드 결과에서 정보 밀도와 가독성 개선.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.10.md`

## [2026-02-28]

### Claude 전용 엔진 전환 + 응답 다양성/속도 최적화 (v6.3.9)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.9.md`

#### 변경 사항
- 하이브리드 엔진을 **Claude 전용 경로**로 전환.
  - OpenAI 호출 경로 및 관련 분기 제거.
  - Anthropic 1차 실패 시 1회 재시도 후 deterministic fallback으로 전환.
- 응답 속도 개선을 위한 Anthropic 호출 파라미터 튜닝:
  - 기본 타임아웃: `60000ms -> 10000ms`
  - 재시도 타임아웃: `7000ms` 추가
  - 모드별 `max_tokens`/`temperature` 동적 적용.
- 응답 다양성 자동 모드 도입:
  - `responseMode: concise | balanced | creative`
  - 질문 유형/길이에 따라 프롬프트 스타일 가이드 자동 선택.
- 운영 진단 메타 확장:
  - `meta.responseMode`
  - `meta.path` (`anthropic_primary`, `anthropic_retry`, `fallback`)
  - `meta.timings` (`totalMs`, `anthropicPrimaryMs`, `anthropicRetryMs`)
- 프론트 결과 화면 진단 배지 확장:
  - `responseMode`, `path`, `totalMs` 표시 추가.

#### 효과
- OpenAI 비사용 정책을 코드 레벨에서 강제.
- 짧은 질문은 더 빠르고 간결하게, 깊은 질문은 표현 다양성을 유지하도록 자동 최적화.
- 요청 단위 처리 경로/지연시간이 노출되어 성능 디버깅 및 운영 관측성 향상.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.9.md`

## [2026-02-28]

### 초간단 질문 간결 모드 및 2카드 스프레드 최적화 (v6.3.8)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.8.md`

#### 변경 사항
- 짧은 일상형 질문(`light`)과 짧은 이진 질문(`binary` + 20자 이하)에 대해 **간결 모드**를 도입.
- 프롬프트에 스타일 가드(`styleGuard`)를 추가해 과장된 세계관/장문 서사를 억제하고 직접 결론을 강제.
- 간결 모드 응답은 `conclusion/evidence/action`을 압축 형식으로 재구성:
  - `conclusion`: 요약 + `[운명의 판정]` 한 줄 결론
  - `evidence`: 카드별 핵심 주장만 출력
  - `action`: 최대 2개 지침만 노출
- 프론트 스프레드 선택 로직 개선:
  - 짧은 이진 질문은 5카드 커리어 스프레드 대신 2카드 `choice` 스프레드 선택.

#### 효과
- "커피를 마실까 말까?" 같은 초간단 질문에서 과도하게 장황한 리딩을 방지.
- 질문 무게와 결과 톤을 맞춰 사용자 체감 품질 개선.
- 운영 중 fallback 여부와 무관하게 결과 길이 일관성 확보.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.8.md`

## [2026-02-28]

### API 진단 메타 표준화 및 fallback 이유 일관화 (v6.3.7)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/QUALITY_GATE.md`
- `docs/RELEASE_NOTES_v6.3.7.md`

#### 변경 사항
- `/api/reading` 응답에 `requestId/serverRevision/serverTimestamp` 메타 추가.
- fallback 이유 코드를 정규화하고, 모든 응답 경로에서 `meta.fallbackReason` 일관 제공.
- UI 진단 배지에서 `fallbackReason` fallback 체인(`meta -> top-level -> unavailable`) 적용.
- 결과 화면에 `serverRevision`/`requestId` 표시 추가.

#### 효과
- "fallback인데 reason이 none" 같은 진단 불일치 해소.
- 배포 버전 혼선/구버전 API 응답 혼입을 요청 단위로 추적 가능.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.7.md`

## [2026-02-28]

### 리딩 결과 API 사용 상태 가시화 (v6.3.6)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/types/tarot.ts`
- `docs/RELEASE_NOTES_v6.3.6.md`

#### 변경 사항
- 결과 화면 상단에 `apiUsed`, `fallbackUsed`, `fallbackReason` 진단 배지 추가.
- `ReadingResponse` 타입에 `apiUsed` 필드 추가.
- 진단 배지 전용 스타일 추가.

#### 효과
- API 성공/폴백 여부를 사용자 화면에서 즉시 확인 가능.
- 서버 로그 의존도를 낮추고 운영 디버깅 속도 향상.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.6.md`

## [2026-02-28]

### 개발 방식 표준화 문서 도입 (v6.3.5)

#### 변경 파일
- `docs/DEVELOPMENT_WORKFLOW.md`
- `README.md`
- `.github/pull_request_template.md`

#### 변경 사항
- AGENTS/CLAUDE 원칙을 웹 앱 실무 절차로 고정한 `Development Workflow Standard` 문서 추가.
- README에 개발 워크플로우 표준 문서 링크 추가.
- PR 템플릿에 `Scope & Success`, `Facts/Assumptions/Open Questions` 섹션 추가.

#### 효과
- 구현 전 범위/성공조건 명시가 일관화되어 요구사항 누락 감소.
- 실패 대응 루프(증상-가설-검증-수정-재검증)와 문서 동기화 규칙을 작업 표준으로 정착.
- 리뷰 단계에서 사실/가정/미해결 이슈가 분리되어 의사결정 속도 향상.

#### 상세 문서
- `docs/RELEASE_NOTES_v6.3.5.md`


## [2026-02-28]

### Anthropic 호출 안정화: 모델/타임아웃 재정렬 (v6.3.4)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `docs/SETUP_SECURITY.md`
- `docs/RELEASE_NOTES_v6.3.4.md`

#### 변경 사항
- 기본 모델을 계정 가용값인 `claude-haiku-4-5-20251001`로 조정.
- Anthropic 타임아웃을 `ANTHROPIC_TIMEOUT_MS`(기본 60000ms)로 환경변수화.
- Fetch 실패 로그에 `timeout_ms`, `timed_out`, `cause`를 포함해 원인 분리 가능성 강화.

#### 원인 결론
- `EAI_AGAIN`(DNS 불안정), 모델 404, 20초 abort가 복합적으로 fallback을 유발.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- 샘플 호출에서 `apiUsed=anthropic`, `fallbackUsed=false` 확인.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.4.md`

## [2026-02-28]

### Anthropic 실패 진단성 강화 및 모델 롤백 (v6.3.3)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `docs/RELEASE_NOTES_v6.3.3.md`

#### 변경 사항
- Anthropic 기본 모델을 `claude-3-5-haiku-20241022`로 롤백.
- Anthropic 호출에 20초 타임아웃(`AbortController`) 적용.
- 실패 로그에 `status/model/body` 또는 `message/cause`를 포함하도록 확장.

#### 효과
- fallback 원인 파악 속도 개선(권한/한도/네트워크 문제 분리).
- 운영 중 "왜 API를 못 불렀는지"를 로그만으로 추적 가능.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.3.md`

## [2026-02-28]

### Anthropic 기본 모델/토큰 상향 (v6.3.2)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `docs/RELEASE_NOTES_v6.3.2.md`

#### 변경 사항
- Anthropic 기본 모델을 `claude-haiku-4-5-20251001`로 상향.
- Anthropic 호출의 `max_tokens`를 `2500 -> 4096`으로 상향.

#### 효과
- 긴 서사(fullNarrative)와 다카드 근거 출력에서 응답 절단 위험 완화.
- 고정 스키마(JSON) 하에서 품질 안정성 강화.

#### 검증
- `npm run test:persona --prefix apps/api` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.2.md`

## [2026-02-28]

### 리딩 결과 미노출 UI 핫픽스 (v6.3.1)

#### 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/RELEASE_NOTES_v6.3.1.md`

#### 변경 사항
- 상단 스프레드 렌더링의 고정 배율(0.5) 의존을 제거하고 스프레드 좌표 범위 기반 동적 스케일링 도입.
- 스프레드 영역 높이를 최소/최대 범위로 제한해 결과 영역이 화면 아래로 밀리지 않도록 수정.
- 5장/7장 등 좌표 범위가 큰 스프레드에서도 결과 리포트가 즉시 보이도록 레이아웃 안정화.

#### 원인
- 리딩 데이터는 정상 생성되었으나, 상단 카드 영역이 과도하게 확장되어 결과 패널이 가시 영역 밖으로 밀리던 프론트 레이아웃 문제.

#### 검증
- `npm run build --prefix apps/web` 통과.
- 상세 변경 요약: `docs/RELEASE_NOTES_v6.3.1.md`

## [2026-02-28]

### Claude API 리딩 품질 개선 (v6.3.0)

#### 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`

#### 변경 사항

- **`callAnthropic()` system 메시지 강화**:
    - 기존 "JSON만 반환하세요" 수준에서 카드 생생한 묘사·질문 직접 연결 특기를 명시하는 지시문으로 교체.
    - 마크다운 코드 블록·설명 텍스트·주석 일절 금지 조건 추가.

- **`buildPrompt()` 전면 재작성 — 질문 유형별 fullNarrative 지시 구체화**:
    - `questionType` 파라미터 추가 후 `isBinary` / `isLight` 플래그로 3종 `fullNarrativeGuide` 분기.
    - **binary**: 4문단 구조 강제 (오프닝 → A 카드 이미지 묘사·흐름 → B 카드 이미지 묘사·흐름 → "~쪽이 더 좋아요!" 형태 직접 추천).
    - **light**: 2~3문단, 가볍고 친근한 한 줄 결론.
    - **default**: 포지션 순서대로 카드 이미지 묘사 + 핵심 메시지 + 행동 제안.
    - `evidence[].claim` 서술형 문장 강제, `actions[]` 범용 표현 금지 지침 추가.
    - `generateReadingHybrid()` 내 `buildPrompt` 호출에 `questionType` 전달.

- **이진 질문 카드 수 2장 → 5장 (`TarotMastery.tsx`)**:
    - 5장 스프레드(현재상황 + A단기·A장기 + B단기·B장기)로 각 선택지별 단기/장기 흐름 비교 가능.

- **`extractBinaryEntities()` 카드 수 조건 확장**:
    - `cardCount !== 2` → `cardCount !== 2 && cardCount !== 5` — 5장 드로우에서도 이진 감지 유지.
    - `detectQuestionType()` 내 조건도 동일하게 `cardCount === 2 || cardCount === 5`로 수정.

- **`max_tokens` 2000 → 2500**:
    - 5장 스프레드 + 상세 `fullNarrative` 생성을 위한 토큰 여유 확보.

#### 검증
- `npm run build:web` 통과 (vite build 3.03s).

---

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

### 하이브리드 리딩 엔진 v6.1.3: 정밀 진단 시스템(Diagnostic Layer) 도입

#### 변경 사항
- **에러 원인 세분화(Error Mapping) 구현 (`apps/api/src/domains/reading/hybrid.js`)**:
    - `model_unavailable`로 통합 관리되던 에러 범주를 6가지 세부 원인으로 분리.
    - `auth_failed` (401), `model_not_found` (404), `quota_exceeded` (429), `dns_error` (EAI_AGAIN), `validation_failed` 등을 명확히 구분.
    - 리딩 실패 시 `fallbackReason` 필드를 통해 프론트엔드에 구체적인 실패 원인을 전달.

- **API 호출부 구조 개선**:
    - `callAnthropic`, `callOpenAI` 함수가 단순 결과(null)가 아닌 `{ report, reason }` 객체를 반환하도록 인터페이스 변경.
    - HTTP 상태 코드에 따른 동적 에러 맵핑 로직(`mapErrorReason`) 추가.

- **서버 로그 강화**:
    - API 에러 발생 시 HTTP 상태 코드와 서버 응답 본문(Error Body)을 상세히 출력하여 Vercel 대시보드에서의 디버깅 편의성 증대.

#### 검증
- 존재하지 않는 모델명 호출 시 `model_not_found` 반환 확인.
- 네트워크 단절 시 `dns_error` 또는 `network_error` 감지 확인.

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

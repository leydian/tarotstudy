# Quality Gate

릴리스 전 반드시 통과해야 하는 유지보수 품질 기준입니다.

## 1. API 계약 무결성
- `/api/reading` 응답은 항상 다음 필드를 포함해야 합니다.
  - `conclusion`
  - `evidence`
  - `action`
  - `yesNoVerdict`
- 하이브리드 모드에서는 다음이 선택적으로 제공되어야 합니다.
  - `report`
  - `quality`
  - `meta.questionType`
  - `meta.requestId`
  - `meta.serverRevision`
  - `meta.attempts` (선택)
  - `meta.failureStage` (선택)
  - `meta.timings.anthropicRepairMs` (선택)
  - `meta.fallbackReason` (fallback 시)

## 2. Fallback 안정성
- 외부 LLM API 실패 또는 키 미설정 시에도 리딩 응답이 중단되지 않아야 합니다.
- fallback 발생 시 `fallbackUsed=true`와 `meta.fallbackReason`이 기록되어야 합니다.
- 운영 로그와 응답을 `meta.requestId`로 매칭할 수 있어야 합니다.

## 3. 질문 유형 일관성
- 질문 유형/카드 수 결정은 `POST /api/question-profile` 기준과 일치해야 합니다.
- binary 질문은 2카드(짧은 질문) 또는 5카드(비교형 질문) 기준으로 해석되어야 합니다.
- `report.verdict.recommendedOption`은 `A|B|EITHER|NONE` 중 하나여야 합니다.
- 질문 유형(`meta.questionType`)은 입력 질문 의도와 일치해야 합니다.

## 4. 사용자 체감 기준
- 결과 화면에서 결론/지침이 정상 노출되어야 합니다.
- 탭 전환(report/study) 시 정보 손실이 없어야 합니다.
- 새 질문 시작 시 상태가 정상 초기화되어야 합니다.
- 기본 사용자 화면에서 진단 배지(`requestId`, `fallbackReason` 등)가 과다 노출되지 않아야 합니다.
- 카드 인터랙션은 키보드 포커스로 동작 가능해야 합니다.

## 5. 검증 절차
1. `npm run test:persona --prefix apps/api`
2. `npm run test:hybrid --prefix apps/api`
3. `npm run test:fortune --prefix apps/api`
4. `npm run test:metrics --prefix apps/api`
5. `npm run test:ui-contract --prefix apps/web`
6. `npm run test:ui-flow --prefix apps/web`
7. `npm run test:unit --prefix apps/web`
8. `npm run build --prefix apps/web`
9. 수동 시나리오 확인
   - binary 질문
   - 감정 취약 질문
   - API 키 없는 환경 질문
   - `?debug=1`에서 진단 배지 노출 확인 / 일반 모드 비노출 확인
10. 운영 메트릭 점검
   - `npm run metrics:report --prefix apps/api`
   - fallbackRate / p95 / failureStage 분포를 릴리스 노트에 기록

## 7. Nightly 모니터링
- `.github/workflows/nightly-metrics-check.yml`에서 스케줄 실행합니다.
- CI 워크스페이스에 메트릭 로그가 없으면 점검을 skip하고 종료합니다.
- 로그 파일이 존재하면 `metrics:report` + `metrics:check`를 실행합니다.

## 6. CI 게이트
- `.github/workflows/quality-gate.yml`에서 위 검증 절차를 PR/`main` push마다 실행합니다.
- 실패 시 머지/배포를 중단하고 회귀 원인을 먼저 해결합니다.

## 7. 실패 처리
- 품질 게이트 실패 시 릴리스를 보류하고 원인 카테고리를 기록합니다.
  - 계약 회귀
  - fallback 실패
  - 체감 품질 저하

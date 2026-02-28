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
  - `meta.fallbackReason` (fallback 시)

## 2. Fallback 안정성
- 외부 LLM API 실패 또는 키 미설정 시에도 리딩 응답이 중단되지 않아야 합니다.
- fallback 발생 시 `fallbackUsed=true`와 `meta.fallbackReason`이 기록되어야 합니다.

## 3. 질문 유형 일관성
- binary 질문은 2카드 스프레드 기준으로 해석되어야 합니다.
- `report.verdict.recommendedOption`은 `A|B|EITHER|NONE` 중 하나여야 합니다.
- 질문 유형(`meta.questionType`)은 입력 질문 의도와 일치해야 합니다.

## 4. 사용자 체감 기준
- 결과 화면에서 결론/지침이 정상 노출되어야 합니다.
- 탭 전환(report/study) 시 정보 손실이 없어야 합니다.
- 새 질문 시작 시 상태가 정상 초기화되어야 합니다.

## 5. 검증 절차
1. `npm run test:persona --prefix apps/api`
2. `npm run build --prefix apps/web`
3. 수동 시나리오 확인
   - binary 질문
   - 감정 취약 질문
   - API 키 없는 환경 질문

## 6. 실패 처리
- 품질 게이트 실패 시 릴리스를 보류하고 원인 카테고리를 기록합니다.
  - 계약 회귀
  - fallback 실패
  - 체감 품질 저하

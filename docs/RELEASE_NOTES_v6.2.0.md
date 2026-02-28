# Release Notes v6.2.0 (2026-02-28)

## 목적
이번 릴리스는 기능 추가보다 유지보수 체계 고도화를 목표로 했습니다.
핵심은 페르소나 기반 의사결정 규칙을 코드/문서/검증/리뷰 프로세스에 동시에 반영해, 품질체감 우선 운영을 일관되게 강제하는 것입니다.

## 핵심 결과
- 유지보수 기준을 문서화된 운영 계약으로 고정
- API 응답에 운영 진단 메타를 추가
- 사용자 체감 이벤트 계측 인터페이스를 추가
- 페르소나 회귀 시나리오 자동 검증 도입
- PR 단계에서 품질 체크를 강제하는 템플릿 반영

## 변경 상세

### 1) 운영 문서 및 워크플로우
- 신규 문서:
  - `docs/PERSONA_CONTRACT.md`
  - `docs/QUALITY_GATE.md`
- 기존 문서 갱신:
  - `README.md`: 신규 운영 문서 링크 추가
  - `docs/FEATURES.md`: 페르소나 기반 운영 섹션 추가
  - `docs/CHANGELOG.md`: v6.2.0 항목 추가
- 개발 워크플로우:
  - `.github/pull_request_template.md` 신설
  - PR 단계에서 개발자/기획자/사용자 페르소나 체크 및 품질 게이트 통과 여부 명시

### 2) 백엔드(API) 변경
- `apps/api/src/domains/reading/hybrid.js`
  - 질문 유형 분류 로직 추가 (`binary/relationship/career/emotional/light/deep`)
  - 응답 `meta.questionType` 추가
  - fallback 원인 `meta.fallbackReason` 추가
    - `model_unavailable`
    - `validation_failed`
- `apps/api/src/index.js`
  - legacy 모드와 서버 catch fallback 응답에도 `meta` 필드 제공
  - 서버 레벨 fallback에서 `fallbackReason: server_error` 설정

### 3) 프론트엔드 변경
- `apps/web/src/types/tarot.ts`
  - `ReadingResponse.meta` 타입 확장
- `apps/web/src/services/analytics.ts` (신규)
  - 경량 이벤트 기록 래퍼(`trackEvent`) 추가
- `apps/web/src/pages/TarotMastery.tsx`
  - 이벤트 계측 반영:
    - `question_submitted`
    - `reading_result_shown`
    - `result_tab_switched`
    - `new_question_clicked`
  - 이벤트 payload에 운영 진단 필드 포함:
    - `questionType`, `mode`, `fallbackUsed`, `spreadId`

### 4) 검증 자동화
- `apps/api/tests/reading-persona-regression.json` (신규)
  - 6개 시나리오(light/deep/relationship/career/binary/emotional) 고정 입력 정의
- `apps/api/tests/validate-persona-regression.js` (신규)
  - API 키 미설정 상태에서 하이브리드 실행
  - 계약 필드/질문 유형/추천 옵션/fallback 이유/증거 길이 검증
- `apps/api/package.json`
  - `test:persona` 스크립트 추가

## API 계약 영향
하위호환은 유지되며, 선택 메타 필드가 추가되었습니다.

### 추가된 응답 필드
```json
{
  "meta": {
    "questionType": "binary|relationship|career|emotional|light|deep",
    "fallbackReason": "model_unavailable|validation_failed|server_error|null"
  }
}
```

## 검증 결과
- `npm run test:persona --prefix apps/api` 통과 (6 scenarios)
- `npm run build --prefix apps/web` 통과

## 유지보수 관점 기대효과
- 회귀 감지 시점이 배포 후가 아니라 PR/검증 단계로 앞당겨짐
- fallback 장애 원인 분류가 가능해 운영 디버깅 속도 개선
- 체감 품질 데이터 수집 인터페이스가 생겨 기능 우선순위 조정 근거 확보

## 알려진 제한
- 현재 analytics는 콘솔 기반 경량 로거이며 외부 수집 플랫폼 연동은 후속 작업입니다.
- `questionType` 분류는 규칙 기반이므로 일부 문장 변형 케이스에서 오분류 가능성이 있습니다.

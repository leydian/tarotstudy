# Release Notes v6.3.48

## 개요
리딩 결과에서 나타난 반복/혼입/톤 불일치 문제를 줄이기 위한 품질 보정 릴리즈입니다.  
핵심은 **non-compact 응답 경로 단일화**, **결론 중복 원인 제거**, **맥락형 반론 분기**, **경량 질문(light) 액션 톤 보정**입니다.

## 주요 변경

### 1) non-compact 출력의 레거시 혼입 제거
- `apps/api/src/domains/reading/hybrid.js`
  - `generateReadingV3` import 및 참조 제거
  - non-compact 결과(`conclusion/evidence/action`)를 `toLegacyResponse` 단일 경로로 고정
  - 서로 다른 세대 텍스트가 섞여 문체가 불안정해지는 문제를 완화

### 2) 결론 문단 중복 원인 차단
- `apps/api/src/domains/reading/hybrid.js`
  - `toLegacyResponse()`에서 `conclusion` 생성 시 `report.fullNarrative` 우선 선택 제거
  - `summary + verdict` 조합을 기본으로 사용해 장문 반복/충돌 가능성 축소

### 3) 맥락형 반론 문구 도입
- `apps/api/src/domains/reading/hybrid.js`
  - `buildCounterpointsByContext({ questionType, readingKind, domainTag })` 추가
  - 케이스별 반론 분기:
    - `overall_fortune`
    - `health`
    - `career`
    - `light/binary`
    - 일반
  - 동일 문구 반복 출력 빈도 감소

### 4) 경량 질문(light) 액션 톤 정합화
- `apps/api/src/domains/reading/hybrid.js`
  - `questionType === 'light'`를 compact-like 처리에 포함
  - 가벼운 일상형 질문에는 짧고 실용적인 액션 세트를 우선 적용

### 5) 문장 가독성 보정
- `apps/api/src/domains/reading/hybrid.js`
  - 근거 문장 키워드 삽입부를 작은따옴표 형태로 보정
  - 일반 질문 액션 문구를 실행/점검 중심 문장으로 정리

## 검증 결과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- non-compact 리딩에서 섹션 간 톤 충돌과 문장 중복이 줄어듭니다.
- 경량 질문에 대한 과도한 중량감 문구가 줄어 사용자 체감이 자연스러워집니다.
- 반론 문구가 맥락별로 달라져 반복 피로도가 완화됩니다.

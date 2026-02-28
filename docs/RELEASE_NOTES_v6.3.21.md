# Release Notes v6.3.21 (2026-02-28)

## 목적
라이트 양자택일 질문(예: `커피를 마실까 말까?`)에서 드러난 어색한 문장 표현과 중복 출력을 줄여, 결과를 더 자연스럽고 간결하게 전달합니다.

## 핵심 변경
- 라이트 양자택일 표현 보정
  - verdict rationale에서 `"[선택지] 쪽"` 형태를 제거하고 자연어 선택 문장으로 정규화.
- concise binary 생성 정책 강화
  - 과장된 수사/장문 서사 억제
  - 짧은 결론 중심 출력 유도
- deterministic 액션 개선
  - 라이트 양자택일에서는 즉시 실행형 2개 지침을 기본 사용
  - 과도한 명상형 지침 노출 축소
- compact 결론 중복 제거
  - compact 결론에서 `[운명의 판정]` 라인 제거
- UI 표시 보정
  - 카드 공개 메시지를 concise binary에서 claim 중심으로 간결화
  - `사서의 통찰/기운` 보조 문구를 concise binary에서 단문형으로 정리
  - 사용자 모드에서 `[운명의 지침 n]` 접두 제거
  - concise binary + 정상 응답에서는 `함께 고려할 변수` 섹션 비노출
  - fallback 발생 시에는 `함께 고려할 변수` 유지

## 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.21.md`

## 상세 구현
1. `hybrid.js`
- `computeVerdict()` binary 분기에서 rationale 텍스트를 자연어 기준으로 재작성.
- `buildPrompt()`에 concise binary 전용 스타일 가이드 추가.
- `buildDeterministicReport()`에서 짧은 binary 질문용 액션 세트를 분기 적용.
- compact 결론(`isCompactQuestion`)은 summary만 반환하도록 조정해 판정 줄 중복 제거.

2. `TarotMastery.tsx`
- 카드 공개 메시지 조합 시 concise binary 분기에서는 claim 우선 출력.
- `getDistinctReportCopy()`에서 concise binary에 맞춘 단문 보조 카피 사용.
- 운명의 지침 렌더링 시 사용자 모드 접두 제거(`showDiagnostics=false` 기준).
- `counterpoints` 섹션은 concise binary & non-fallback일 때 숨김 처리.

## 기대 효과
- 라이트 의사결정 질문에서 문장 어색함과 중복 노출이 감소.
- 결론/지침의 정보 밀도가 개선되어 사용자가 빠르게 판단 가능.
- fallback이 아닌 정상 응답에서는 불필요한 경고성 섹션 노출이 줄어듦.

## 검증
- `npm run build --prefix apps/web`
- `npm run test:persona --prefix apps/api`
- `npm run test:hybrid --prefix apps/api`

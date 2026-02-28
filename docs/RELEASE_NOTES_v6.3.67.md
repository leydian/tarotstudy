# Release Notes v6.3.67

## 개요
이번 릴리스는 리딩 품질 점검에서 확인된 8개 어색함(오타/반복/템플릿 문장/톤 혼합/매핑 불투명성)을
한 번에 해결하기 위한 품질 개선 패치입니다.

핵심 목표는 다음 두 가지입니다.
- **중복을 줄이고 정보 밀도를 올리는 것**
- **문장 품질(오타·조사·서사 자연스러움)과 섹션 역할을 안정화하는 것**

## 변경 파일
- `apps/api/src/domains/reading/renderer.js`
- `apps/api/src/domains/reading/report/domain-policy.js`
- `apps/api/src/domains/reading/report/deterministic.js`
- `apps/api/src/domains/reading/report/fact-builder.js`
- `apps/api/src/domains/reading/prompt-builder.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/RELEASE_NOTES_v6.3.67.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) 오타/비문 후처리 보강
- 공통 한국어 보정 규칙을 추가했습니다.
  - `명성의 실실 -> 명성의 실추`
  - `도달했음 -> 도달했습니다`
  - 템플릿 잔재 `은(는)`, `이(가)` 제거
- 리포트 조립 단계에서 summary/verdict/evidence/fortune/action/counterpoint에 일괄 적용되도록 정리했습니다.

### 2) 마스터 리포트 결론 서사 자연화
- `buildMasterReportConclusion()`에서 카드 브리지 문장을 템플릿형(`A은(는)`)에서
  자연어형(`A 카드는 …을 보여줍니다`)으로 전환했습니다.
- 카드 claim은 서사에 맞게 축약해 “원문 복붙” 느낌을 줄였습니다.

### 3) 마스터 리포트와 종합운세 섹션 중복 완화
- `overall_fortune` 결론 내부 블록을 `[운세 세부 흐름]`에서
  `[이번 기간 핵심 맥락]`으로 전환하고, 원인/실천/변수 관점 중심으로 재구성했습니다.
- 프런트(`TarotMastery`)에서도 summary vs energyText 중복 시 자동 분기해 같은 의미 반복을 줄였습니다.

### 4) 카드-영역 매핑 설명 보강
- 건강·마음 카드 선정 시, 가능하면 `내면의 빛/건강/마음` 포지션 카드를 우선 사용합니다.
- 우선 카드가 없을 때는 왜 해당 카드가 건강·마음 기준이 되었는지 설명 문장을 추가합니다.

### 5) 톤 일관성 가이드 강화
- `overall_fortune` 프롬프트에 다음 제약을 추가했습니다.
  - 시적 비유 남발 금지(분석적·차분 어조 유지)
  - 마스터 리포트와 fortune 문장 간 관점 분리(원인 vs 실천)

### 6) 조사 결합 문장 개선
- 결론 문장에서 `"질문"은(는)` 형태 대신
  `withTopicParticle()` 기반 조사 결합을 사용해 한국어 자연스러움을 높였습니다.

## 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run test:unit --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## 기대 효과
- 마스터 리포트가 길기만 한 반복 문서가 아니라, 근거 중심의 상세 설명으로 읽히도록 개선
- 동일 내용 반복(판정/기조/fortunes) 체감 감소
- 오타/비문/조사 오류로 인한 몰입 저하 완화

# Release Notes v6.3.34

## 개요
리딩 품질 일관성(운세 섹션 중복 방지/period 정규화), 건강 질문 안전 우선 정책 고정, 모바일 결과 화면 가독성 및 카드 스프레드 안정화를 적용했습니다.

## 주요 변경

### 1) 질문 프로파일 안전 우선 정렬
- `apps/api/src/domains/reading/questionType.js`
  - 건강 맥락(`domainTag=health`)에서는 운세 키워드가 포함되어도 `readingKind=general_reading`을 우선 적용.
  - `overall_fortune`일 때 `fortunePeriod`가 비어 있으면 기본값 `week`로 보정.

### 2) 하이브리드 리딩 품질 일관성 레이어 강화
- `apps/api/src/domains/reading/hybrid.js`
  - 운세 객체 정규화 함수 추가:
    - `normalizeFortunePeriod`
    - `normalizeTrendLabel`
    - `normalizeFortune`
  - 운세 섹션 중복 붕괴 방지 후처리 추가:
    - `enforceFortuneSectionDiversity`
    - `energy/workFinance/love/healthMind` 문구가 동일해질 경우 카드 근거 기반으로 재작성.
  - `postProcessReport`에서 운세 품질 보정 시 `qualityFlags`에 `fortune_section_rewritten` 기록.
  - `generateReadingHybrid`에서 `resolvedFortunePeriod`를 중앙 보정해 prompt/meta/report 간 period 정합성 고정.

### 3) 건강 가드레일 회귀 테스트 확장
- `apps/api/tests/hybrid-resilience.js`
  - 신규 케이스 추가:
    - 운세 질문 + 건강 증상 혼합 입력에서도 health 우선 정책이 적용되는지 검증.
    - 기대값:
      - `meta.domainTag=health`
      - `meta.readingKind=general_reading`
      - `meta.fortunePeriod=null`
      - `report.verdict.label=MAYBE`
      - `report.verdict.recommendedOption=NONE`

### 4) TarotMastery 모바일 UX 안정화
- `apps/web/src/pages/TarotMastery.tsx`
  - 결과 본문(마스터 리포트) 접기/펼치기 섹션(`narrative`) 추가.
  - 운세 렌더링 시 필수 필드 완전성(`hasFortunePayload`)을 확인해 불완전 운세 블록 노출 방지.
  - 카드 배치 계산(`getSpreadRenderConfig`)에 모바일 safe inset 보정값을 반영해 상단 잘림 완화.
- `apps/web/src/pages/TarotMastery.module.css`
  - 모바일 `topSpreadArea` 패딩 추가 및 메시지 하단 패딩 확장(Sticky 입력창 가림 방지).
  - 모바일 `leftPaneViewport`, `cardBasicsList` overflow 정책 보정.
- `apps/web/src/components/common/TarotCard.module.css`
  - 모바일 카드 라벨 폰트/간격/폭 조정으로 라벨 겹침 및 절단 가능성 완화.

## 검증
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 혼합 의도 질문에서 안전 우선 정책이 더 일관되게 적용됩니다.
- 종합운세 결과의 섹션 문구가 단조롭게 반복되는 현상이 줄어듭니다.
- 모바일에서 카드 스프레드 상단 잘림/입력창 가림 체감이 감소합니다.

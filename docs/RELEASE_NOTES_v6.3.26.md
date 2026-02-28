# Release Notes v6.3.26 (2026-02-28)

## 목적
종합운세 결과에서 관찰된 어색함 7가지를 정합성 중심으로 보정합니다.

1. 기간 라벨 불일치  
2. 역방향 해석 충돌  
3. 트렌드 판정 불일치  
4. 다카드(특히 월/연) 반영 부족  
5. 템플릿 반복 문구 과다  
6. 요약 섹션 중복  
7. 기간 스케일과 맞지 않는 액션

추가로, 요청에 따라 톤 선택 모드(차분/공감/신비)를 제거했습니다.

## 핵심 변경
- 기간별 제목 동기화
  - 종합운세 박스 제목을 `today/week/month/year`에 맞춰 동적으로 출력.
- orientation 반영 강화
  - score 계산에 정/역방향을 반영.
  - 증거(rationale) 문구를 정/역방향 흐름 기반으로 단순·일관화.
- 트렌드 안정화
  - 점수 임계값을 도입해 한두 장 카드로 과도한 상승/주의 판정이 나는 문제를 완화.
- 다카드 집계 개선
  - 전체 카드에서 suit/메이저 성격으로 도메인별 대표 카드를 선택:
    - 전체 에너지
    - 일·재물
    - 애정
    - 건강·마음
- 기간별 문구/지침 분기
  - today/week/month/year에 따라 메시지, actions, counterpoints를 별도 템플릿으로 분리.
- 중복 완화
  - 상단 통찰은 summary 중심, 하단 종합운세는 분야별 상세 중심으로 역할을 분리.
- 톤 모드 제거
  - 프론트 UI 버튼 제거.
  - `personaTone` 관련 request/analytics/type 필드 제거.
  - API/엔진은 단일 톤 가이드로 운영.

## 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/services/analytics.ts`
- `apps/web/src/services/tarotService.ts`
- `apps/web/src/types/tarot.ts`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.26.md`

## 구현 상세
1. `hybrid.js`
- `getYesNoScore(cardId, orientation)`로 확장해 역방향 점수 반영.
- `computeVerdict`에 임계값 적용.
- 종합운세 집계용 유틸 추가:
  - `getSuitType`, `pickDominantFact`, `periodLabelKo`
- `buildDeterministicReport`의 overall_fortune 분기 강화:
  - 분야별 대표 카드 선별 집계
  - 기간별 `actions/counterpoints` 분기
  - 기간별 summary/message 템플릿 분기
  - overall_fortune verdict를 기조 해석 중심으로 정규화.
- 키워드 하드코딩 템플릿(`핵심 키워드...`) 중심의 충돌성 문장을 제거.

2. `TarotMastery.tsx`
- 종합운세 제목을 `fortune.period` 기반으로 동적 렌더링.
- 상단 통찰 텍스트는 summary 우선으로 표시해 하단 상세와 중복을 줄임.
- 톤 모드 상태/버튼/전달 파라미터 제거.

3. `TarotMastery.module.css`
- 톤 버튼 관련 스타일(`toneRow`, `toneBtn`, `toneBtnActive`) 제거.

4. 서비스/타입/분석 정리
- `tarotService.ts`: `personaTone` 옵션 제거.
- `analytics.ts`: payload의 `personaTone` 제거.
- `tarot.ts`: `meta.personaTone` 제거.
- `index.js`: API 입력의 `personaTone` 처리 제거.

## 기대 효과
- 주/월/연/일 종합운세 결과의 기간 정합성이 높아집니다.
- 역방향 카드가 포함된 출력에서 해석 충돌이 줄어듭니다.
- 연간/월간 리딩이 일부 카드 편향 없이 전체 카드 신호를 반영합니다.
- 결과 텍스트가 덜 반복적이고 기간에 맞는 실행 지침을 제공합니다.

## 검증
- `npm run test:hybrid --prefix apps/api`
- `npm run test:persona --prefix apps/api`
- `npm run build --prefix apps/web`

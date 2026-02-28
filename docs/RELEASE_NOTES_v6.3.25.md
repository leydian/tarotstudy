# Release Notes v6.3.25 (2026-02-28)

## 목적
외부 타로 앱과 비교 시 체감 차이가 컸던 6개 지점을 한 번에 개선합니다.

1. 종합운세 전용 응답 스키마
2. 카드 정/역방향 반영
3. 오늘/이번주/이번달/올해 기간별 정책 분리
4. 종합운세에서 YES/NO 중심 표현 축소
5. 페르소나 톤 선택
6. 하루 운세 재현성(seed)

## 핵심 변경
- `question-profile` 확장
  - `readingKind: overall_fortune | general_reading`
  - `fortunePeriod: today | week | month | year | null`
- 종합운세 전용 `report.fortune` 추가
  - `period`, `trendLabel(UP|BALANCED|CAUTION)`,
  - `energy`, `workFinance`, `love`, `healthMind`, `message`
- 카드 드로우 확장
  - 프론트에서 카드별 orientation(`upright|reversed`) 생성
  - API에 `cardDraws` 전달
  - 엔진에서 정/역방향 의미(`meanings`/`reversed`) 선택
- UI 확장
  - 원클릭 `오늘/이번주/이번달/올해 종합운세` 버튼 유지
  - 톤 선택(`차분/공감/신비`) 버튼 추가
  - 종합운세 결과에서 `상승/균형/주의` 기조 라벨 노출
  - 카드 공개 메시지에 정/역방향 표시
- 재현성 추가
  - 종합운세 질문은 `sessionId + date + period + spread` 기반 seeded shuffle 사용

## 변경 파일
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

## 구현 상세
1. 프로파일/기간 추론
- `questionType.js`에 운세 기간 추론기(`inferFortunePeriod`)를 추가.
- 운세 키워드가 있는 질문은 `readingKind=overall_fortune`로 분류.
- 기간 키워드(`오늘/이번주/이번달/올해`)에 따라 스프레드를 고정 매핑.

2. API 요청 확장
- `/api/reading`에서 `cardDraws`, `personaTone`을 수신.
- `cardDraws`가 있으면 orientation 포함 카드 세트를 구성하고 엔진에 전달.
- legacy/fallback meta에도 `readingKind`, `fortunePeriod`를 기록.

3. 하이브리드 엔진 확장
- 카드 fact에 orientation/label 포함.
- 카테고리 해석 시 reversed 의미를 우선 적용.
- 종합운세 전용 deterministic 구성:
  - `trendLabel` 산출
  - `report.fortune` 구성
  - 기간별 요약 톤 차등
- 프롬프트에 `readingKind/fortunePeriod/personaTone` 컨텍스트 추가.
- meta에 `trendLabel`, `personaTone` 기록.

4. 프론트 UX 확장
- `TarotMastery`에서 공통 실행 함수에:
  - seeded shuffle(종합운세 전용)
  - orientation 생성
  - `cardDraws/personaTone/questionProfile` 전달 로직 추가
- 결과 렌더링에서:
  - 종합운세는 `fortune` 섹션(전체/일·재물/애정/건강/메시지) 표시
  - 배지는 `trendLabel` 기반 텍스트 사용
- 입력 영역에 톤 선택 버튼 추가.

5. 타입/분석 확장
- `tarot.ts`: `report.fortune`, `meta.readingKind/fortunePeriod/trendLabel/personaTone`, 카드 orientation 반영.
- `tarotService.ts`: `getQuestionProfile` 및 `getReading` 옵션 타입 확장.
- `analytics.ts`: payload에 `readingKind/fortunePeriod/personaTone` 허용, sessionId getter export.

## 기대 효과
- 종합운세가 일반 질문 포맷과 섞이지 않고 목적형 구조로 제공됩니다.
- 정/역방향 정보가 결과에 직접 반영되어 해석 밀도가 개선됩니다.
- 같은 날짜의 운세 질문이 과도하게 흔들리지 않아 사용자 신뢰감이 향상됩니다.
- 사용자 선호 문체(차분/공감/신비)에 맞는 결과 제어가 가능합니다.

## 검증
- `npm run test:hybrid --prefix apps/api`
- `npm run test:persona --prefix apps/api`
- `npm run build --prefix apps/web`

# Release Notes v6.3.27 (2026-02-28)

## 목적

`overall_fortune` 리딩 결과에서 발견된 5가지 어색함을 수정합니다.

1. conclusion과 "사서의 통찰:" 텍스트 중복 출력
2. fortune.message가 verdictBadge와 목록 "메시지:" 항목에 동시 표시
3. evidence claim 문법 비문: "X의 상징인 '완결문입니다'" 패턴
4. evidence rationale이 카드와 무관한 정/역방향 고정 문구
5. 1장 스프레드에서 fortune 4개 섹션 모두 동일 카드 이름 반복

## 핵심 변경

### 중복 텍스트 제거 (TarotMastery.tsx)

- **"사서의 통찰:" 절** — `overall_fortune`일 때 조건부 숨김 처리.
  `conclusion`이 이미 `summary`를 표시하므로 동일 텍스트 2회 출력되던 문제 해소.
  일반 리딩에서는 기존과 동일하게 렌더링.
- **"메시지:" 목록 항목 제거** — fortune.message는 상단 verdictBadge(`상승 기조: …`)에서만 표시.
  하단 분야별 목록의 `<li><strong>메시지:</strong> …</li>` 라인 삭제.

### evidence claim 문법 개선 (hybrid.js)

- **Before:** `절제(정방향)의 상징인 '균형과 절제입니다'`
  → coreMeaning이 완결 서술문이라 "상징인" 뒤 명사구 자리에 삽입 불가.
- **After:** `절제(정방향) — 균형과 절제`
  → 대시(`—`)로 카드 레이블과 핵심 의미를 명확히 구분.
- buildPrompt 지침에도 `"~의 상징인 ~" 패턴 금지` 문구 추가해 AI 생성 결과에도 동일 기준 적용.

### evidence rationale 카드 키워드 연결 (hybrid.js)

- **Before:** 정방향 고정 → `"정방향 흐름이 살아 있어 준비된 실행이 성과로 연결될 여지가 큽니다."`
  역방향 고정 → `"역방향 신호가 포함되어 있으니 속도 조절과 재점검이 중요합니다."`
  모든 카드가 동일한 문구를 사용.
- **After:** `fact.keywords.slice(0, 2).join('·')` 로 카드별 키워드 추출 후 삽입.
  예) 절제 카드 정방향 → `"균형·절제 에너지가 활성화되어, 이 흐름에 맞춰 나아가기 좋은 시점입니다."`
  예) 악마 카드 역방향 → `"속박·집착 에너지가 안쪽으로 향하고 있어, 속도를 낮추고 조건을 재점검할 때입니다."`

### fortune 섹션 카드 이름 반복 방지 (hybrid.js)

- `claimCardLabel(fact, refFact)` 헬퍼 함수 추가.
  energyFact(전체 에너지 대표 카드)와 동일한 카드이면 `"이 카드"`, 다른 카드이면 풀 이름 반환.
- 1장 스프레드에서 workFact / loveFact / mindFact가 모두 energyFact와 동일 카드로 귀결될 때 반복 방지:
  - energyClaim: `"절제(정방향)의 흐름이 이번 주 전체 리듬의 기준점으로 작동합니다."` (풀 이름 유지)
  - workClaim: `"이 카드 신호를 보면 주중 중반에 체크포인트를 두면…"`
  - loveClaim: `"이 카드 흐름상 이번 주는 짧더라도 솔직한 대화 빈도를…"`
  - mindClaim: `"이 카드 경향을 고려하면 수면과 회복 루틴을…"`
- 멀티 카드 스프레드에서 서로 다른 카드가 뽑힌 경우에는 기존대로 각 카드 이름을 표시.

## 변경 파일

- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.27.md`

## 구현 상세

### hybrid.js

**evidence 생성 (`buildDeterministicReport` ~line 341)**

```js
// 수정 전
const orientationRationale = fact.orientation === 'reversed'
  ? '역방향 신호가 포함되어 있으니 속도 조절과 재점검이 중요합니다.'
  : '정방향 흐름이 살아 있어 준비된 실행이 성과로 연결될 여지가 큽니다.';
claim: `${fact.cardNameKo}(${fact.orientationLabel})의 상징인 '${coreMeaning}'`

// 수정 후
const keywordsStr = fact.keywords.slice(0, 2).join('·') || '균형';
const orientationRationale = fact.orientation === 'reversed'
  ? `${keywordsStr} 에너지가 안쪽으로 향하고 있어, 속도를 낮추고 조건을 재점검할 때입니다.`
  : `${keywordsStr} 에너지가 활성화되어, 이 흐름에 맞춰 나아가기 좋은 시점입니다.`;
claim: `${fact.cardNameKo}(${fact.orientationLabel}) — ${coreMeaning}`
```

**fortune 섹션 (`buildDeterministicReport` ~line 455)**

```js
// claimCardLabel 헬퍼 추가
const claimCardLabel = (fact, refFact) =>
  refFact && fact.cardId === refFact.cardId
    ? '이 카드'
    : `${fact.cardNameKo}(${fact.orientationLabel})`;

// 적용
const workClaim = workFact
  ? `${claimCardLabel(workFact, energyFact)} 신호를 보면 ${workFrame}` : workFrame;
const loveClaim = loveFact
  ? `${claimCardLabel(loveFact, energyFact)} 흐름상 ${loveFrame}` : loveFrame;
const mindClaim = mindFact
  ? `${claimCardLabel(mindFact, energyFact)} 경향을 고려하면 ${mindFrame}` : mindFrame;
```

**buildPrompt 지침 강화 (~line 592)**

```js
// 수정 전
'- evidence.claim: 카드의 상징과 현재 상황을 연결하는 문장.'

// 수정 후
'- evidence[].claim: "~의 상징인 ~" 패턴 금지. 카드 이름(방향)을 주어로, 카드가 현재 상황에 어떻게 작용하는지를 서술형 문장으로 작성.'
```

### TarotMastery.tsx

**"사서의 통찰:" 조건부 렌더링 (~line 678)**

```tsx
// 수정 전
<p className={styles.reportSummaryText}>
  <strong>사서의 통찰:</strong> {distinctCopy.insightText}
</p>

// 수정 후
{!isOverallFortune && (
  <p className={styles.reportSummaryText}>
    <strong>사서의 통찰:</strong> {distinctCopy.insightText}
  </p>
)}
```

**"메시지:" 항목 제거 (~line 708)**

```tsx
// 수정 전 (제거된 라인)
<li><strong>메시지:</strong> {reading.report.fortune.message}</li>
```

## 기대 효과

- overall_fortune 결과에서 동일 텍스트가 2회 출력되는 현상 해소.
- fortune.message가 verdictBadge 한 곳에서만 표시되어 레이아웃 중복 제거.
- evidence claim이 자연스러운 서술형 문장으로 개선.
- evidence rationale이 카드별 키워드를 반영해 리딩마다 다른 맥락 제공.
- 1장 스프레드 종합운세에서 카드 이름 4회 반복이 "이 카드"로 간소화.

## 검증

```bash
npm run build:web   # 빌드 확인 (✓ 3.16s, 213 kB)

curl -s -X POST http://localhost:8787/api/reading \
  -H "Content-Type: application/json" \
  -d '{"cardIds":["m14"],"question":"오늘의 종합 운세는?","mode":"hybrid"}' \
  | jq '{apiUsed:.apiUsed, questionType:.meta.questionType}'
```

확인 항목:
- conclusion과 "사서의 통찰:" 텍스트 중복 없음
- fortune 목록에 "메시지:" 항목 없음
- evidence claim에 `"의 상징인 '"` 패턴 없음
- evidence rationale에 카드 키워드 포함 (`균형·절제 에너지가…` 형태)
- 1장 스프레드 fortune 섹션에서 2~4번째 항목이 "이 카드"로 표시

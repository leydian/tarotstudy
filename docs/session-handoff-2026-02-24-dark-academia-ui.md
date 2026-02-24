# 세션 인수인계 (2026-02-24) — Dark Academia UI 전환 + 백엔드 리팩토링

작성일: 2026-02-24
브랜치: `publish/no-workflow-v2`
작업 경로: `/home/eunok/studycodex`

---

## 1) 작업 개요

이번 세션에서는 두 가지 독립적인 작업이 진행됐다.

1. **UI 전면 테마 전환**: 따뜻한 브라운/세이지 팔레트 → **Dark Academia** 컨셉 (Parchment + Deep Mystical)
2. **백엔드 코드 리팩토링**: 캐시 LRU화, 스프레드 요약 디스패처, KPI 계산 최적화

---

## 2) UI: Dark Academia 테마 전환

### 2.1 설계 방향

| 모드 | 컨셉 | 특징 |
|------|------|------|
| 라이트 | Parchment Academia | 양피지 배경, 골드 앰버 포인트, 딥 퍼플 보조색 |
| 다크 | Deep Mystical | 따뜻한 다크, 브라이트 골드 액센트, 소프트 라벤더 |

### 2.2 팔레트 변경 (`theme.css`)

**라이트 모드 `:root` 주요 변경:**

| 토큰 | 이전 | 이후 |
|------|------|------|
| `--bg-0` | `#f8f5ef` | `#f4efe6` |
| `--bg-1` | `#f2ece3` | `#ede4d8` |
| `--bg-2` | `#ebe2d3` | `#e3d7c8` |
| `--ink-0` | `#2a2119` | `#1e1710` |
| `--ink-1` | `#6f5f4f` | `#6b5840` |
| `--brand-1` | `#9a6640` (브라운) | `#b8860b` **(골드 앰버)** |
| `--brand-2` | `#708657` (세이지) | `#5b3f7a` **(딥 퍼플)** |
| `--line` | `#d8ccb8` | `#d4c4a8` |
| `--panel` | `rgba(255,255,255,0.9)` | `rgba(244,239,230,0.92)` |
| `--reading-bg` | `#ffffff` | `#faf6ef` |
| `--shadow-soft` | `0 10px 30px rgba(86,60,33,0.12)` | `0 10px 32px rgba(80,54,20,0.14)` |

**다크 모드 `:root[data-theme='dark']` 주요 변경 (Bug #2 포함):**

| 토큰 | 이전 | 이후 |
|------|------|------|
| `--bg-0` | `#15120f` | `#120e09` |
| `--bg-1` | `#211b16` | `#1c1610` |
| `--bg-2` | `#2c241d` | `#261d16` |
| `--ink-0` | `#f5eee5` | `#f2e8d8` |
| `--ink-1` | `#c8baaa` | `#c4aa8a` |
| `--brand-1` | `#c58f64` | `#d4a017` **(브라이트 골드)** |
| `--brand-2` | `#9bb07f` | `#9b6ec8` **(소프트 라벤더)** |
| `--line` | `#4a3f34` | `#3e3020` |
| `--panel` | `rgba(27,20,40,0.86)` ⚠️ | `rgba(32,24,14,0.90)` ✅ **Bug #2 수정** |
| `--reading-bg` | `#231d18` | `#1e1710` |
| `--shadow-soft` | `0 14px 36px rgba(0,0,0,0.35)` | `0 16px 42px rgba(0,0,0,0.45)` |

**신규 토큰 추가 (라이트/다크 공통):**

```css
--shadow-gold: 0 4px 18px rgba(184, 134, 11, 0.32);   /* dark: rgba(212,160,23,0.36) */
--glow-purple: 0 0 22px rgba(91, 63, 122, 0.24);       /* dark: rgba(155,110,200,0.28) */
--border-gold: color-mix(in srgb, var(--brand-1) 38%, var(--line));
--radius-sm: 8px;   --radius-md: 12px;
--radius-lg: 18px;  --radius-xl: 24px;
--transition-fast: 0.15s ease;
--transition-base: 0.25s ease;
```

**body 배경 그라디언트 교체:**
- 라이트: 골드(좌상단) + 퍼플(우상단) 타원형 앰비언트 + 양피지 선형 그라디언트
- 다크: 골드 14% + 라벤더 18% 앰비언트 + 딥 다크 선형 그라디언트
- `@media (prefers-color-scheme: dark)` 블록도 동일하게 미러링

### 2.3 매거진 토큰 업데이트 (`magazine.css`)

**`--mag-*` 토큰 변경:**

| 토큰 | 라이트 변경 | 다크 변경 |
|------|------------|----------|
| `--mag-accent` | `#a6673d` → `#b8860b` | `#d29567` → `#d4a017` |
| `--mag-olive` | `#647255` → `#5b3f7a` | `#9bae89` → `#9b6ec8` |
| `--mag-paper` | `#f3efe8` → `#f2ece0` | `#181512` → `#170f08` |
| `--mag-accent-soft` | `#eedfce` → `#e8d9a8` | `#372b22` → `#2a1c08` |
| `--mag-shadow` | 유지 | `0 20px 48px rgba(0,0,0,0.44)` |

**컴포넌트 스타일 변경:**
- `.topbar .nav-link.on`: `background: linear-gradient(130deg, var(--mag-accent), var(--mag-olive))` + `box-shadow: var(--shadow-gold)` (하드코딩 제거)
- `.btn.primary`: `background: linear-gradient(120deg, var(--mag-accent), var(--mag-olive))` + `box-shadow: var(--shadow-gold)`
- `.brand-eyebrow, .eyebrow`: `letter-spacing: 0.22em` (기존 유지)
- `.brand h1`: `'Iropke Batang'` 세리프 명시 + `clamp(1.4rem, 1.2rem + 0.7vw, 2rem)`
- `.page-hero h2`: `clamp(1.65rem, 1.4rem + 1.3vw, 2.55rem)` + `letter-spacing: -0.025em`
- `.topbar` 배경: 골드 크라운 `radial-gradient` 오버레이 추가

### 2.4 레이아웃 컴포넌트 조정 (`layout.css`)

**버그 수정:**
- **Bug #1** (구 line 481): `.nav-link.on` `box-shadow`가 `rgba(157, 78, 221, 0.28)` 하드코딩 퍼플 → `var(--shadow-gold)` 로 교체

**컴포넌트 변경:**
- `.nav-link.on`: `background: linear-gradient(120deg, var(--brand-1), color-mix(in srgb, var(--brand-2) 45%, var(--brand-1)))` — 골드 도미넌트 그라디언트
- `.panel`, `.hero-card`: `backdrop-filter: blur(10px)` (6px → 10px), `border: 1px solid var(--border-gold)`
- `.hero-card::after`: 골드-퍼플 방향 그라디언트 오버레이
- `.btn.primary`: `box-shadow: var(--shadow-gold)` + hover 트랜지션 (`opacity 0.92`, 골드 글로우 강화)
- `.description-box`: `border: 1px dashed var(--border-gold)` (기존 `--line`)
- `.heading-gradient`: 신규 유틸리티 클래스 추가

```css
.heading-gradient {
  background: linear-gradient(105deg, var(--brand-1) 0%,
    color-mix(in srgb, var(--brand-1) 50%, var(--brand-2)) 50%,
    var(--brand-2) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**앰비언트 오브 업그레이드:**

| orb | 크기(이전) | 크기(이후) | 색상 |
|-----|-----------|-----------|------|
| orb-a | 360px | 480px | `var(--brand-1)` 골드 |
| orb-b | 360px | 400px | `var(--brand-2)` 퍼플 |
| orb-c | 300px | 340px | 골드-퍼플 믹스 |

- `filter: blur(56px)` → `blur(72px)`, `opacity: 0.56` → `0.42`

### 2.5 스프레드 도트 패턴 골드화 (`spreads.css`)

- `.spread-layout` 도트 패턴: `var(--line)` → `color-mix(in srgb, var(--brand-1) 22%, var(--line))`
- 나머지 컴포넌트는 `--brand-1`, `--accent-soft` 토큰 참조로 자동 적용

### 2.6 채팅 CSS 확인 (`features/chat/entry.css`)

- 하드코딩 `#3b82f6` (블루) 없음 — 전체 `--mag-accent`, `--mag-olive` 토큰 참조 방식으로 이미 구현 완료

---

## 3) 백엔드 리팩토링

### 3.1 TTLCache LRU 방출 추가 (`apps/api/src/cache.js`)

**문제**: 캐시가 무제한으로 성장해 메모리 누수 가능성 존재.

**변경:**
- `constructor(ttlSeconds, maxSize = 1000)` — `maxSize` 파라미터 추가
- `get()`: 접근 시 `delete` + 재`set`으로 Map 순서를 최신으로 갱신 (LRU 접근 업데이트)
- `set()`:
  - 기존 키 업데이트 시: 먼저 삭제 후 재삽입 (LRU 위치 갱신)
  - 새 키 + 용량 초과 시: `store.keys().next().value` (가장 오래된 키) 제거

```js
// 이전: TTL 만료만 처리, 크기 무제한
constructor(ttlSeconds = 3600) { ... }

// 이후: LRU + maxSize
constructor(ttlSeconds = 3600, maxSize = 1000) {
  this.maxSize = maxSize;
  ...
}
```

### 3.2 스프레드 요약 디스패치 테이블 (`apps/api/src/domains/summaries/aggregator.js`)

**문제**: spreadId별 `if-else` 체인 6개가 중복 패턴으로 반복됨.

**변경**: `SPREAD_HANDLERS` 객체 룩업 테이블로 교체

```js
// 이전: 6개 if 블록
if (spreadId === 'yearly-fortune') { rawSummary = summarizeYearlyFortune(...); ... }
if (spreadId === 'monthly-fortune') { rawSummary = summarizeMonthlyFortune(...); ... }
// ...

// 이후: 단일 룩업
const SPREAD_HANDLERS = {
  'yearly-fortune': summarizeYearlyFortune,
  'monthly-fortune': summarizeMonthlyFortune,
  'weekly-fortune': summarizeWeeklyFortune,
  'three-card': summarizeThreeCard,
  'celtic-cross': summarizeCelticCross,
  'relationship-recovery': summarizeRelationshipRecovery,
  'one-card': summarizeOneCard
};

const handler = SPREAD_HANDLERS[spreadId];
if (handler) {
  const rawSummary = handler({ items, context: normalizedContext, level, userHistory });
  if (spreadId === 'one-card') return rawSummary;  // 기존 동작 유지
  return finalizeSpreadSummary(...);
}
```

- 폴백 경로의 `rawSummary = ...` 재할당 패턴도 `const rawSummary`로 통일

### 3.3 러닝 KPI stageDropoff 최적화 (`apps/api/src/learning-kpi.js`)

**문제**: 각 stage 처리 루프 안에서 `rows.reduce()`가 중첩 호출되고, 이전 stage 완료율 계산을 위해 또 한번 `rows.reduce()`가 호출됨 → O(rows × stages²) 중첩 계산.

**변경**: 2-pass 구조로 분리

```js
// Pass 1: 각 사용자의 completedLessons를 Set으로 미리 변환 (1회)
const userCompletedSets = rows.map(({ snapshot }) =>
  new Set(snapshot.completedLessons || [])
);

// Pass 2: stageResults 계산 (Set 재생성 없음)
const stageResults = stageOrder.filter(...).map((stage) => {
  const totalDoneRate = userCompletedSets.reduce((acc, completedSet) => {
    const doneCount = stageLessons.filter((id) => completedSet.has(id)).length;
    return acc + (doneCount / stageTotal) * 100;
  }, 0);
  return { stage, rate: ... };
});

// Pass 3: dropoff 계산 (stageResults 배열만 참조)
const stageDropoff = stageResults.map((result, index) => {
  const prevRate = index > 0 ? stageResults[index - 1].rate : result.rate;
  return { stage: result.stage, completionRate: result.rate,
           dropoffFromPrev: Math.max(0, prevRate - result.rate) };
});
```

- `new Set(...)` 호출 횟수: O(rows × stages × 2) → O(rows)로 감소

---

## 4) 수정 파일 목록

### CSS (UI 테마)
| 파일 | 변경 규모 | 핵심 내용 |
|------|-----------|----------|
| `apps/web/src/styles/theme.css` | +115 / -69 | 팔레트 전환, Bug #2 수정, 신규 토큰 6종, body 그라디언트 |
| `apps/web/src/styles/magazine.css` | +37 / -37 | `--mag-*` 골드/퍼플화, 컴포넌트 오버라이드 |
| `apps/web/src/styles/layout.css` | +44 / -15 | Bug #1 수정, 오브 업그레이드, `.heading-gradient` 추가 |
| `apps/web/src/styles/spreads.css` | +8 / -2 | 도트 패턴 골드화 |

### API (백엔드)
| 파일 | 핵심 내용 |
|------|----------|
| `apps/api/src/cache.js` | LRU 방출 + maxSize |
| `apps/api/src/domains/summaries/aggregator.js` | 디스패치 테이블 리팩토링 |
| `apps/api/src/learning-kpi.js` | stageDropoff 계산 최적화 |

---

## 5) 버그 수정 요약

| # | 위치 | 증상 | 원인 | 수정 |
|---|------|------|------|------|
| Bug #1 | `layout.css` `.nav-link.on` | Nav 활성 상태가 퍼플 글로우로 렌더링 | `box-shadow: rgba(157,78,221,0.28)` 하드코딩 | `var(--shadow-gold)` 교체 |
| Bug #2 | `theme.css` 다크모드 `--panel` | 다크 테마 패널에 퍼플 색조 혼입 | `rgba(27,20,40,0.86)` 퍼플 틴트 | `rgba(32,24,14,0.90)` 따뜻한 다크로 교체 |

---

## 6) 검증 포인트

- **라이트 모드**: 양피지 배경, 골드 포인트 컬러, 딥 퍼플 보조색
- **다크 모드**: 퍼플 틴트 없는 따뜻한 다크, 브라이트 골드 액센트
- **Nav 활성 상태**: 골드 그라디언트 + 골드 글로우 (퍼플 없음)
- **Primary 버튼**: 골드 → 퍼플 그라디언트
- **앰비언트 오브**: 골드(좌상단) + 퍼플(우상단) 두 빛
- **모바일 (820px 이하)**: 반응형 레이아웃 정상 동작

```bash
cd apps/web && npm run dev
```

# 세션 인수인계 (2026-02-24) — UI 모던/엘레강트 개선

작성일: 2026-02-24
브랜치: `publish/no-workflow-v2`
작업 경로: `/home/eunok/studycodex`

---

## 1) 작업 개요

Dark Academia 팔레트(골드 + 딥 퍼플)가 이미 적용된 상태에서, 레이아웃/스타일 전반에 **마이크로인터랙션**, **그라디언트 텍스트**, **장식선(pseudo-element)** 등을 추가하여 시각적 완성도를 높였다.

변경 파일 3개, 순수 CSS + 1줄 TSX 수정:

| 파일 | 변경 규모 | 비고 |
|------|----------|------|
| `apps/web/src/components/PageHero.tsx` | +1줄 | h2 className 추가 |
| `apps/web/src/styles/magazine.css` | ~+115줄 | 8개 블록 수정/추가 |
| `apps/web/src/styles/layout.css` | ~+15줄 | 버튼·패널 3개 블록 수정 |

---

## 2) 상세 변경 내용

### 2.1 `PageHero.tsx` — h2 heading-gradient 적용

```tsx
// 변경 전
<h2>{title}</h2>

// 변경 후
<h2 className="heading-gradient">{title}</h2>
```

`layout.css`에 정의돼 있던 `.heading-gradient` 유틸리티를 실제로 연결. 모든 페이지의 PageHero 타이틀이 **골드→미드→퍼플 3-stop 그라디언트 텍스트**로 표시된다.

---

### 2.2 `magazine.css` — 8개 블록

#### 2-A. `.brand h1` — 그라디언트 텍스트

사이드바 브랜드 h1에 `background-clip: text` 기법으로 골드→퍼플 그라디언트 적용.

```css
/* 추가된 속성 */
margin: 8px 0 6px;
background: linear-gradient(135deg, var(--mag-accent) 0%,
  color-mix(in srgb, var(--mag-accent) 50%, var(--mag-olive)) 55%,
  var(--mag-olive) 100%);
-webkit-background-clip: text;
background-clip: text;
-webkit-text-fill-color: transparent;
```

#### 2-B. `.brand` / `.brand::after` — 구분선 리디자인

`border-bottom` 단순 실선을 제거하고, `::after` pseudo-element로 **중앙 집중 페이드아웃 골드 라인** 구현.

```css
/* 변경 전 */
border-bottom: 1px solid color-mix(in srgb, var(--mag-muted) 24%, transparent);
padding-bottom: 14px;

/* 변경 후 */
border-bottom: 0;
padding-bottom: 20px;
position: relative;

/* 신규 ::after */
.brand::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 15%; right: 15%;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%, var(--mag-accent) 35%,
    color-mix(in srgb, var(--mag-accent) 55%, var(--mag-olive)) 65%,
    transparent 100%);
}
```

#### 2-C. `.topbar .nav-link` — 인터랙션 + 활성 인디케이터

**변경 전**: 정적 스타일만 존재, 호버/트랜지션 없음.

**변경 후**:
- `position: relative` + `transition` 추가 (배경·테두리·그림자)
- `:hover:not(.on)` 상태: 배경색 소프트 액센트로 전환
- `.on::before` pseudo-element: 좌측 3px 흰색 인디케이터 바

```css
.topbar .nav-link {
  position: relative;
  transition: background var(--transition-fast), border-color var(--transition-fast),
              box-shadow var(--transition-fast);
}
.topbar .nav-link:hover:not(.on) {
  background: color-mix(in srgb, var(--mag-paper) 55%, var(--mag-accent-soft));
  border-color: color-mix(in srgb, var(--mag-accent) 30%, transparent);
}
.topbar .nav-link.on {
  border-color: transparent; /* 이전: --mag-accent 40% 틴트 → 제거 */
}
.topbar .nav-link.on::before {
  content: '';
  position: absolute;
  left: 0; top: 20%; height: 60%; width: 3px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 0 2px 2px 0;
}
```

#### 2-D. `.kpi-card` — 상단 골드 바 + 호버 리프트

**변경 전**: 단순 `border-radius + padding`.

**변경 후**:
- `position: relative`, `overflow: hidden` 추가
- `transition` (transform, box-shadow)
- `::before`: 카드 상단 2px 골드→퍼플 그라디언트 선
- `:hover`: `translateY(-3px)` 리프트 + `var(--shadow-gold)`
- `.sub`: `font-weight 600→700`, `letter-spacing 0.07em`, `text-transform: uppercase`, `font-size: var(--fs-caption)` 추가
- `h3`: `margin: 5px 0 0` 추가

```css
.kpi-card {
  border-radius: 14px;
  padding: 18px;            /* 14px → 18px */
  position: relative;
  overflow: hidden;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.kpi-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--mag-accent),
    color-mix(in srgb, var(--mag-accent) 50%, var(--mag-olive)), var(--mag-olive));
}
.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-gold);
}
```

#### 2-E. `.panel h3` / `.hero-card h3` — 골드 언더라인

패널 및 히어로카드 내부 섹션 h3에만 적용 (KPI 값 표시용 `.kpi-card h3` 제외).

```css
.panel h3,
.hero-card h3 {
  position: relative;
  padding-bottom: 10px;
  margin-bottom: 14px;
}
.panel h3::after,
.hero-card h3::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 32px; height: 2px;
  background: linear-gradient(90deg, var(--mag-accent), transparent);
  border-radius: 1px;
}
```

#### 2-F. `.page-hero h2.heading-gradient::after` — h2 데코레이티브 라인

`heading-gradient`가 적용된 PageHero h2 바로 아래 52px 골드 장식선 추가. `::after`가 `display: block`으로 렌더링되므로 텍스트 흐름에 영향을 주지 않는다.

```css
.page-hero h2.heading-gradient::after {
  display: block;
  content: '';
  width: 52px; height: 2px;
  background: linear-gradient(90deg, var(--mag-accent),
    color-mix(in srgb, var(--mag-accent) 40%, var(--mag-olive)));
  margin-top: 12px;
  border-radius: 1px;
}
```

#### 2-G. `.topbar` — backdrop-filter 강화

```css
/* 변경 전: 없음 */
/* 변경 후 */
backdrop-filter: blur(20px) saturate(150%);
-webkit-backdrop-filter: blur(20px) saturate(150%);
```

사이드바 글라스모피즘 효과를 `blur(20px) + saturate(150%)`으로 강화.

#### 2-H. `.section-divider` — 유틸리티 클래스 신규 추가

```css
.section-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--mag-accent) 35%, transparent) 25%,
    color-mix(in srgb, var(--mag-accent) 35%, transparent) 75%,
    transparent 100%
  );
  margin: 2px 0;
}
```

섹션 사이 시각적 분리가 필요한 곳에 `<hr className="section-divider" />` 형태로 재사용 가능.

---

### 2.3 `layout.css` — 3개 블록

#### 3-A. `.btn` — 기본 transition + hover 리프트 + active 프레스

```css
/* 추가된 속성 */
.btn {
  transition: transform var(--transition-fast), background var(--transition-fast),
              box-shadow var(--transition-fast), border-color var(--transition-fast);
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.btn:active:not(:disabled) {
  transform: translateY(0);
}
```

비활성화(`:disabled`) 버튼은 제외해 UX 일관성 유지.

#### 3-B. `.btn.primary:hover` — 그림자 강화

```css
/* 변경 전 */
box-shadow: 0 6px 24px rgba(184, 134, 11, 0.38);

/* 변경 후 */
box-shadow: 0 8px 28px rgba(184, 134, 11, 0.44);
transform: translateY(-2px);   /* 신규 */
```

Primary 버튼 호버 시 일반 버튼(−1px)보다 더 강한 리프트(−2px)로 시각적 계층감 강화.

#### 3-C. `.panel, .hero-card` — backdrop-filter 강화 + transition

```css
/* 변경 전 */
backdrop-filter: blur(10px);

/* 변경 후 */
backdrop-filter: blur(16px) saturate(160%);
-webkit-backdrop-filter: blur(16px) saturate(160%);
transition: box-shadow var(--transition-base);
```

---

## 3) 검증 체크리스트

| 확인 항목 | 기대 결과 |
|----------|----------|
| 모든 페이지 PageHero h2 | 골드→퍼플 그라디언트 텍스트 + 아래 52px 장식선 |
| 사이드바 브랜드 h1 | 골드→퍼플 그라디언트 텍스트 |
| 브랜드 구분선 | 중앙 집중 페이드아웃 골드 라인 |
| Nav 링크 hover | 배경색 소프트 액센트로 부드럽게 전환 |
| Nav 활성 링크 | 좌측 3px 흰색 인디케이터 바 표시 |
| KPI 카드 상단 | 2px 골드→퍼플 그라디언트 선 |
| KPI 카드 레이블(.sub) | 대문자 + 자간 넓은 캡션 스타일 |
| KPI 카드 hover | translateY(-3px) 리프트 + 골드 그림자 |
| 패널/히어로카드 내 h3 | 좌측 32px 골드 언더라인 |
| 버튼 hover | translateY(-1px) 리프트 |
| Primary 버튼 hover | translateY(-2px) + 깊은 골드 그림자 |
| 패널 glassmorphism | blur(16px) saturate(160%) 선명도 향상 |
| 사이드바 glassmorphism | blur(20px) saturate(150%) 선명도 향상 |
| 모바일 (820px 이하) | 반응형 레이아웃 정상 동작 |

```bash
cd apps/web && npm run dev
```

---

## 4) 기술 노트

- **`heading-gradient` 활성화**: `layout.css`에 이미 정의돼 있던 유틸리티 클래스를 `PageHero.tsx`에서 최초 실사용.
- **`::after` 충돌 없음**: `.hero-card::after`(기존 골드-퍼플 글로우 오버레이)와 `.hero-card h3::after`(신규 언더라인)는 선택자가 분리돼 충돌하지 않는다.
- **KPI h3 제외 의도**: `.kpi-card h3`은 수치 표시용이므로 언더라인 스타일에서 명시적으로 제외. `.panel h3`, `.hero-card h3`만 대상.
- **`overflow: hidden` on `.kpi-card`**: `::before` 상단 바가 카드 경계를 넘지 않도록 필수.

# UI 수정 실행 가이드

> 파일 다 읽음. 아래 코드를 그대로 붙여넣으면 됨.

---

## 수정 대상 파일 5개

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/styles/features/chat/entry.css` | 누락 클래스 추가, focus/disabled, 인라인 대체 클래스 |
| `apps/web/src/styles/spreads.css` | 480px 미만 브레이크포인트 추가 |
| `apps/web/src/styles/features/spreads/entry.css` | SpreadLibrary 인라인 대체 클래스 |
| `apps/web/src/features/spreads/components/SpreadLibrary.tsx` | 인라인 style 제거 |
| `apps/web/src/features/spreads/SpreadsPageContainer.tsx` | 인라인 style 제거 |
| `apps/web/src/features/chat-reading/ChatReadingPageContainer.tsx` | 인라인 style 제거, ARIA 추가 |

---

## 1. `styles/features/chat/entry.css` — 파일 끝에 추가

```css
/* ── 누락 레이아웃 클래스 (C1, C2) ── */
.chat-log {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.chat-summary-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-dialog-stream {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── 인라인 스타일 대체 (Phase 3) ── */
.chat-reading-actions {
  padding-left: 12px;
}

.btn-redraw {
  border-radius: 999px;
  font-size: 0.8rem;
  padding: 6px 16px;
}

/* ── focus / disabled 접근성 (Phase 4) ── */
.chat-composer input:focus {
  outline: 2px solid var(--brand-1);
  outline-offset: 2px;
}

.chat-composer input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── 로딩/에러 상태 (Phase 5) ── */
.page-loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2rem;
  color: var(--ink-1);
}

.page-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid color-mix(in srgb, var(--brand-1) 30%, transparent);
  border-top-color: var(--brand-1);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.page-error-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--danger-ink) 40%, var(--line));
  background: var(--danger-bg);
  margin: 10px 12px;
}

.page-error-state p {
  margin: 0;
  color: var(--danger-ink);
}

.chat-draw-error {
  margin: 10px 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--danger-ink) 30%, var(--line));
  background: var(--danger-bg);
  color: var(--danger-ink);
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-draw-error p {
  margin: 0;
  flex: 1;
}
```

---

## 2. `styles/spreads.css` — 파일 끝에 추가

```css
/* ── 480px 미만 (C4, H5, M1) ── */
@media (max-width: 480px) {
  .spread-layout {
    padding: 16px;
    gap: 12px;
  }

  .spread-card {
    max-width: 100%;
  }

  .spread-slot-index {
    width: 16px;
    height: 16px;
    font-size: 0.6rem;
  }

  .chat-spotlight-card {
    padding: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .chat-spotlight-thumb {
    width: 80px;
  }

  .spread-grid-list {
    grid-template-columns: 1fr;
  }

  .verdict-pill {
    font-size: 0.85rem;
    padding: 5px 16px;
  }
}
```

---

## 3. `styles/features/spreads/entry.css` — 파일 끝에 추가

```css
/* ── SpreadLibrary 인라인 대체 (Phase 3) ── */
.library-category-tabs {
  flex: 1 1 100%;
  margin-bottom: 1.5rem;
  justify-content: center;
}

.chip-link-with-icon {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chip-icon {
  opacity: 0.7;
}

.search-wrap {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
}

.search-input {
  width: 100%;
  padding-right: 40px;
}

.search-clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  padding: 4px;
  line-height: 1;
}

.spread-catalog-info {
  display: flex;
  flex-direction: column;
}

.spread-catalog-variant-label {
  font-size: 0.75rem;
  color: var(--brand-1);
  font-weight: 600;
  margin: 0;
}

.spread-catalog-header .badge {
  align-self: flex-start;
}

.evidence-chip {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--accent-soft) 60%, var(--reading-bg));
  color: var(--ink-1);
}

.spread-empty-state {
  text-align: center;
  padding: 4rem 1rem;
}

.spread-empty-state-title {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

/* ── SpreadsPageContainer 인라인 대체 ── */
.view-mode-tabs {
  margin-bottom: 1.5rem;
}

.spread-view-header {
  align-items: baseline;
}

.spread-list-view {
  margin: 1rem 0;
}

.spread-list-item {
  padding: 12px;
}

.spread-list-item-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.spread-list-badge {
  min-width: 24px;
  text-align: center;
}

.spread-list-info {
  flex: 1;
}

.spread-list-name {
  margin: 0;
}

.spread-list-card-name {
  margin: 4px 0 0;
  color: var(--brand-1);
}

.spread-list-sub {
  margin: 2px 0 0;
}

.spread-list-thumb {
  width: 48px;
  height: 72px;
}
```

---

## 4. `SpreadLibrary.tsx` 인라인 style 제거

### 변경 전 → 후

```tsx
// L78: chip-wrap 컨테이너
// 전:
<div className="chip-wrap" style={{ flex: '1 1 100%', marginBottom: '1.5rem', justifyContent: 'center' }}>
// 후:
<div className="chip-wrap library-category-tabs">

// L84: 카테고리 버튼
// 전:
style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
// 후:
className={`chip-link chip-link-with-icon ${filter === cat.id ? 'chip-on' : ''}`}
// (style 제거)

// L86: 아이콘
// 전:
<span style={{ opacity: 0.7 }}>{cat.icon}</span>
// 후:
<span className="chip-icon">{cat.icon}</span>

// L91: 검색창 래퍼
// 전:
<div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
// 후:
<div className="search-wrap">

// L97: 검색 input
// 전:
style={{ width: '100%', paddingRight: '40px' }}
// 후:
// style 제거 (search-input 클래스가 이미 있음, CSS에서 처리)

// L102: 지우기 버튼
// 전:
style={{ position: 'absolute', right: '12px', ... }}
// 후:
className="search-clear-btn"
// style 제거

// L125: 카드 정보 컬럼
// 전:
<div style={{ display: 'flex', flexDirection: 'column' }}>
// 후:
<div className="spread-catalog-info">

// L127: 변형 레이블
// 전:
<span className="sub" style={{ fontSize: '0.75rem', color: 'var(--brand-1)', fontWeight: 600 }}>
// 후:
<span className="spread-catalog-variant-label">

// L131: 배지
// 전:
<span className="badge" style={{ alignSelf: 'flex-start' }}>
// 후:
<span className="badge">
// (CSS에서 .spread-catalog-header .badge { align-self: flex-start } 처리)

// L134: 태그 래퍼
// 전:
<div className="spread-tag-wrap" style={{ marginTop: 'auto' }}>
// 후:
<div className="spread-tag-wrap">
// (spread-tag-wrap에 이미 margin-top: auto 있음)

// L136: evidence chip
// 전:
<span key={idx} className="evidence-chip" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px' }}>
// 후:
<span key={idx} className="evidence-chip">

// L148: 빈 상태
// 전:
<div className="empty-state" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
// 후:
<div className="spread-empty-state">

// L149: 빈 상태 제목
// 전:
<p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
// 후:
<p className="spread-empty-state-title">
```

---

## 5. `SpreadsPageContainer.tsx` 인라인 style 제거

```tsx
// L344: view-mode-tabs (이미 클래스 있음)
// 전:
<div className="chip-wrap view-mode-tabs" style={{ marginBottom: '1.5rem' }}>
// 후:
<div className="chip-wrap view-mode-tabs">

// L438: 헤더 정렬
// 전:
<div className="history-header" style={{ alignItems: 'baseline' }}>
// 후:
<div className="history-header spread-view-header">

// L457: 리스트 뷰
// 전:
<div className="stack spread-list-view" style={{ margin: '1rem 0' }}>
// 후:
<div className="stack spread-list-view">

// L461: 리스트 아이템
// 전:
<article ... className="result-item" style={{ padding: '12px' }}>
// 후:
<article ... className="result-item spread-list-item">

// L462: 행
// 전:
<div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// 후:
<div className="spread-list-item-row">

// L463: 번호 배지
// 전:
<span className="badge" style={{ minWidth: '24px', textAlign: 'center' }}>
// 후:
<span className="badge spread-list-badge">

// L464: 정보 컬럼
// 전:
<div style={{ flex: 1 }}>
// 후:
<div className="spread-list-info">

// L465: 포지션 이름
// 전:
<p style={{ margin: 0 }}><strong>
// 후:
<p className="spread-list-name"><strong>

// L467: 카드 이름
// 전:
<p style={{ margin: '4px 0 0', color: 'var(--brand-1)' }}>
// 후:
<p className="spread-list-card-name">

// L471: 의미 텍스트
// 전:
<p className="sub" style={{ margin: '2px 0 0' }}>
// 후:
<p className="sub spread-list-sub">

// L476: 썸네일 이미지
// 전:
style={{ width: '48px', height: '72px' }}
// 후:
className="spread-slot-thumb spread-list-thumb"
// (style 제거)
```

**L487-505 (동적 grid)** — 이건 값이 런타임에 결정되므로 **인라인 유지**. 변경 불필요.

---

## 6. `ChatReadingPageContainer.tsx` 수정

### 6-A. 로딩/에러 상태 (L205-206)

```tsx
// 전:
if (spreadsQuery.isLoading) return <p>챗봇 스프레드를 불러오는 중...</p>;
if (spreadsQuery.isError || !selectedSpread) return <p>챗봇 스프레드 데이터를 불러오지 못했습니다.</p>;

// 후:
if (spreadsQuery.isLoading) return (
  <div className="page-loading-state">
    <span className="page-loading-spinner" aria-hidden="true" />
    <span>스프레드를 불러오는 중...</span>
  </div>
);
if (spreadsQuery.isError || !selectedSpread) return (
  <div className="page-error-state" role="alert">
    <p>스프레드 데이터를 불러오지 못했습니다.</p>
    <button className="btn" onClick={() => spreadsQuery.refetch()}>다시 시도</button>
  </div>
);
```

### 6-B. chat-log ARIA (L241)

```tsx
// 전:
<div className="chat-log" ref={logRef}>
// 후:
<div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="대화 내역">
```

### 6-C. chip-link 리스트 구조 (L316-320, L325-330)

```tsx
// 전:
<div className="chip-wrap">
  {sidebarStarterPrompts.map((prompt) => (
    <button className="chip-link" onClick={() => setInput(prompt)}>{prompt}</button>
  ))}
</div>

// 후:
<ul className="chip-wrap clean-list" role="list" style={{ paddingLeft: 0, listStyle: 'none' }}>
  {sidebarStarterPrompts.map((prompt) => (
    <li key={`side-${prompt}`}>
      <button className="chip-link" aria-label={`질문 입력: ${prompt}`} onClick={() => setInput(prompt)}>
        {prompt}
      </button>
    </li>
  ))}
</ul>
```

### 6-D. 인라인 style 제거 (L400, L405)

```tsx
// 전 (L400):
<div className="chat-reading-actions" style={{ paddingLeft: '12px' }}>
// 후:
<div className="chat-reading-actions">

// 전 (L405):
<button className="btn" ... style={{ borderRadius: '999px', fontSize: '0.8rem', padding: '6px 16px' }}>
// 후:
<button className="btn btn-redraw" ...>
```

### 6-E. draw 에러 메시지 (L285)

```tsx
// 전:
{drawMutation.isError && <p className="sub chat-error">리딩 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>}

// 후:
{drawMutation.isError && (
  <div className="chat-draw-error" role="alert">
    <p>리딩 생성에 실패했습니다.</p>
    <button className="btn" onClick={() => drawMutation.mutate(input.trim())}>다시 시도</button>
  </div>
)}
```

---

## 검증 순서

```bash
# 1. 타입 체크
npm run typecheck:web

# 2. 린트
npm run lint

# 3. API 테스트 (회귀 없는지)
npm run test:api
```

브라우저 확인:
- 375px (iPhone SE): 채팅 레이아웃, 카드 스포트라이트 오버플로우 없는지
- 768px (iPad): 그리드 비율
- Tab 키: 채팅 input → 보내기 버튼 → 추천 질문 버튼 순으로 포커스 이동하는지

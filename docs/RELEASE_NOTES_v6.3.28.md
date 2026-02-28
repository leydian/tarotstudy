# Release Notes v6.3.28 (2026-02-28)

## 목적
TarotMastery/Cards 화면의 품질을 안정성, 렌더링 성능, 스타일 토큰 일관성, 접근성 관점에서 정리합니다.

## 핵심 변경
- 안정성
  - 메시지 리스트 key 안정화 (`Message.id` 도입, index key 제거)
  - 스프레드 데이터 빈 응답 가드
  - 탐구 패널 카드 null 가드
- 성능
  - `MessageBubble` 메모이제이션 적용
  - 컴포넌트 내부에서 매 렌더 재생성되던 순수 유틸을 모듈 레벨로 이동
  - `ResizeObserver`와 중복되는 `window.resize` 리스너 제거
- CSS 토큰
  - 공통 토큰 3개 추가
    - `--border-gold-faint`
    - `--glass-subtle`
    - `--radius-pill`
  - Cards/TarotMastery의 반복 하드코딩 색상·radius를 토큰으로 치환
- 접근성
  - Cards 검색 입력에 `aria-label`
  - Cards 필터 버튼에 `aria-pressed`
  - TarotMastery 탭에 `tablist/tab/tabpanel` ARIA 구조 적용

## 변경 파일
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/components/reading/MessageBubble.tsx`
- `apps/web/src/styles/theme.css`
- `apps/web/src/pages/Cards.module.css`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/pages/Cards.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.28.md`

## 상세 구현
1. `types/tarot.ts`
- `Message` 타입에 `id: string` 필드 추가.

2. `TarotMastery.tsx`
- `makeMsg()` 헬퍼 도입 후 메시지 생성 포인트 전체를 공통화.
- 메시지 렌더 key를 `key={msg.id}`로 전환.
- `allSpreads` 비어있는 경우 사용자 안내 후 조기 반환.
- `getPositionInfo`에서 카드 nullable 처리, 탐구 렌더에서 `info.card` 가드.
- `hashString/createSeededRandom/shuffleWithRandom/normalizeForCompare`를 모듈 레벨로 이동.
- 탭 접근성 속성 추가:
  - `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
  - `role="tabpanel"`, `aria-labelledby`
- `ResizeObserver`와 중복되는 window resize listener 제거.

3. `MessageBubble.tsx`
- `React.memo` 적용으로 불필요한 리렌더 방지.

4. `theme.css`
- 반복 스타일을 토큰화하기 위해 3개 변수 추가.

5. `Cards.module.css` / `TarotMastery.module.css`
- 반복되는 `rgba(205, 186, 150, 0.1)`, `rgba(255, 255, 255, 0.03)`, `999px` 등을 토큰 참조로 점진 치환.

6. `Cards.tsx`
- 검색 input `aria-label="카드 검색"` 추가.
- 필터 탭 버튼 `aria-pressed={filter === key}` 추가.

## 기대 효과
- 메시지 렌더 안정성 향상 및 key 관련 잠재 버그 완화.
- 채팅 영역 렌더 비용 절감으로 반응성 개선.
- CSS 유지보수 시 중복 값 추적 비용 감소.
- 키보드·스크린리더 사용자 접근성 개선.

## 검증
- `npm run build --prefix apps/web`

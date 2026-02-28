# Changelog

## [2026-02-28]
### UI/UX 개선 및 레이아웃 리팩토링 (TarotMastery)

#### 변경 사항
- **레이아웃 구조 개편**:
    - `mainContent`, `topSpreadArea`, `messagesContainer` 도입으로 페이지 구조 체계화.
    - 상단 스프레드 영역(`topSpreadArea`)을 고정형(Sticky-like)으로 변경하여 사용자 경험 개선.
- **탭 시스템 도입**:
    - 기존 토글 방식에서 탭 시스템(`tabContainer`, `tabHeader`)으로 전환.
    - Study 모드와 Reading 결과를 명확하게 분리하여 탐색 효율성 증대.
- **학습 모드(Study Mode) UI 최적화**:
    - `studyGrid` 및 `studyCard` 기반의 현대적인 카드 레이아웃 적용.
    - 카드 정보 가독성 향상 및 애니메이션 효과 추가.
- **스타일 정리**:
    - 불필요한 레거시 스타일(`studyToggle`, 구형 `spreadCanvas`) 제거.
    - 메시지 영역 스크롤바 및 간격 세밀 조정.

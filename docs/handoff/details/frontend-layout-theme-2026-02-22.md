# 세부내역: 프론트 레이아웃/테마/UI

작성일: 2026-02-22  
최종 갱신: 2026-02-22

## 범위
- 파일:
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/Nav.tsx`
  - `apps/web/src/pages/HomePage.tsx`
  - `apps/web/src/pages/CoursesPage.tsx`
  - `apps/web/src/pages/LibraryPage.tsx`
  - `apps/web/src/pages/DashboardPage.tsx`
  - `apps/web/src/pages/SpreadsPage.tsx`
  - `apps/web/src/styles.css`

## 목표
- 라이트/다크 모두 가독성 확보
- 화면 구조를 카드 나열에서 정보 아키텍처 중심으로 재배치
- 스프레드 리딩의 읽기 흐름 개선

## 주요 변경
1. 테마 시스템
- 라이트: 연보라/핑크 기반 팔레트
- 다크: 고대비 변수 세트 + 텍스트 대비 보정
- `Nav`에 라이트/다크 토글 추가(`localStorage` 저장)

2. 앱 셸 리디자인
- `App.tsx`에 배경 레이어(`ambient-orb`) 추가
- 상단바를 카드형 sticky header로 재구성
- 페이지 stage 컨테이너로 콘텐츠 밀도/리듬 조정

3. 페이지 구조 재편(공통 패턴)
- `Hero + KPI Row + Content Grid` 패턴 적용
  - 홈
  - 코스
  - 카드 도감
  - 대시보드

4. 스프레드 페이지 가독성 개선
- 결론/근거/액션 카드 노출
- 요약-상세 토글
- 3카드 타임라인
- 포지션 의미 카드 그리드(세로 늘어짐 완화)
- `weekly-fortune` 요약 전용 뷰 추가:
  - `총평`
  - `일별 흐름(월~일 분리)`
  - `실행 가이드`
  - `한 줄 테마`

5. 다크 모드 텍스트 보정
- `button/input/select/textarea` 공통 텍스트 색 강제
- chip/button/select option 색 누락 보정
- 하드코딩 색상을 변수 기반으로 단계적 치환

## UX 개선 포인트
- 긴 본문 줄길이 제한으로 리딩 문단 가독성 향상
- 리스트/카드 간격 압축으로 스크롤 부담 완화
- 모바일에서 KPI/그리드 자동 1열 전환

## 6. 스프레드 라이브러리 도입 (2026-02-23)
- **도서관 뷰 신설**: `SpreadLibrary` 컴포넌트를 통해 100종의 스프레드를 카테고리별(관계, 커리어, 재정 등)로 탐색 가능.
- **검색 및 필터**: 이름/설명 기반 검색 및 도메인 필터링 기능으로 탐색 편의성 증대.
- **모바일 최적화**: 모바일 환경에서 1열 카드 리스트로 전환되는 반응형 그리드 적용.

## 7. 데이터 동기화 상태 가시화 (2026-02-23)
- **Sync Status Tracker**: `progress-store`에 `syncStatus`를 도입하여 서버와의 데이터 연동 상태를 실시간 추적 (`idle/syncing/synced/error`).
- **인디케이터 기반**: 사용자가 자신의 데이터가 안전하게 저장되었는지 시각적으로 인지할 수 있는 기반 마련.

## 8. 대형 스프레드 모바일 레이아웃 최적화 (2026-02-23)
- **그리드 유지 + 스크롤**: 스프레드의 고유한 모양을 유지하면서도 모바일에서 잘리지 않도록 `overflow-x: auto`와 `min-width` 보정 로직 강화.
- **가독성 폰트**: 작은 화면에서도 카드 포지션과 이름이 명확히 보이도록 타이포그래피 스케일 조정.

## 검증 명령
- `npm run build:web`
- `npm run typecheck:web`

## 검증 명령
- `npm run build:web`

## 리스크/후속
- 스타일 파일 크기가 커져 영역별 분리(`theme.css`, `layout.css`, `spreads.css`) 필요
- 페이지별 컴포넌트 분리(`PageHero`, `KpiRow`)로 중복 제거 권장

# Release Notes v6.3.58

## 개요
이번 릴리스는 웹 UI에 라이트 테마를 정식 도입하고, 라이트 모드에서 대비가 약했던 영역을 미세 조정한 변경입니다.  
목표는 기존 다크 테마 품질을 유지하면서도, 라이트 환경에서 동일한 정보 밀도와 가독성을 확보하는 것입니다.

## 변경 파일
- `apps/web/src/App.tsx`
- `apps/web/src/App.module.css`
- `apps/web/src/styles/theme.css`
- `apps/web/src/pages/Cards.module.css`
- `apps/web/src/pages/TarotMastery.module.css`
- `apps/web/src/pages/Home.module.css`
- `apps/web/src/components/reading/MessageBubble.module.css`
- `docs/RELEASE_NOTES_v6.3.58.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) 라이트/다크 테마 토글 기능 추가
- `App.tsx`에서 전역 테마 상태를 관리하도록 변경했습니다.
- 헤더에 토글 버튼(Sun/Moon 아이콘)을 추가했습니다.
- 초기값 로직:
  - `localStorage.theme`가 있으면 우선 사용
  - 없으면 `prefers-color-scheme`를 읽어 기본 테마 결정
- 최종 적용은 `html[data-theme]` 속성 기반으로 처리합니다.

### 2) 전역 디자인 토큰 확장
- `theme.css`에 라이트 전용 토큰 블록(`[data-theme='light']`)을 추가했습니다.
- 배경, 텍스트, 패널, 모달, 스크롤바, 강조 텍스트, 상태색(성공/경고/정보)까지 토큰화했습니다.
- 하드코딩된 다크 계열 색상을 공통 토큰으로 승격해 유지보수성을 높였습니다.

### 3) 페이지별 테마 적용 정렬
- `App.module.css`
  - 헤더/모바일 네비 배경을 토큰 기반으로 전환
  - 테마 토글 버튼 스타일 추가
- `TarotMastery.module.css`
  - 메인 패널/입력영역/모바일 sticky 배경/스크롤 색상을 토큰화
- `Cards.module.css`
  - 카드 그라디언트, 모달 배경/경계, 상태 박스/라벨 색상, 스크롤바 토큰 적용
- `Home.module.css`
  - 포털 카드 배경/글로우/그림자, CTA 대비를 토큰 기반으로 전환
- `MessageBubble.module.css`
  - user/bot/action 버블의 배경·경계·그림자·텍스트 대비를 토큰으로 통합

### 4) 라이트 테마 미세튜닝
- 라이트 환경에서 저대비로 보이던 부분을 보정했습니다.
  - 메시지 버블 대비 강화
  - CTA 버튼 텍스트/배경 대비 안정화
  - 카드 모달 상태색(정/역방향, 라벨 색) 가독성 강화
  - 스크롤 thumb/tracking 색 대비 개선
- `--text-on-accent` 토큰을 기준으로 강조 배경 위 텍스트 색을 일관화했습니다.

## 검증
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 사용자 설정으로 라이트/다크 전환이 가능해졌습니다.
- 새로고침/재접속 시 테마 선택이 유지됩니다.
- 라이트 모드에서도 카드/리딩/모달의 주요 정보가 대비 손실 없이 읽히도록 개선되었습니다.

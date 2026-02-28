# Release Notes v6.3.59

## 개요
이번 릴리스는 라이트 테마의 텍스트 대비를 WCAG 2.1 AA 기준으로 1차 감사하고, 결과를 반영해 토큰을 보정한 접근성 강화 릴리스입니다.  
핵심은 수동 감에 의존하지 않고 **자동 대비 점검 스크립트**로 기준 충족 여부를 반복 검증 가능하게 만든 것입니다.

## 변경 파일
- `apps/web/src/styles/theme.css`
- `scripts/wcag-contrast-check.mjs` (신규)
- `package.json`
- `docs/WCAG_LIGHT_THEME_AUDIT_V1.md` (신규)
- `docs/RELEASE_NOTES_v6.3.59.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) 라이트 테마 토큰 대비 보정
`apps/web/src/styles/theme.css`의 라이트 팔레트에서 대비가 경계값 근처였던 토큰을 상향 조정했습니다.

- `--text-muted`: `#7a6f5c` -> `#756a57`
- `--accent-gold`: `#9f7b3d` -> `#7f612f`
- `--accent-gold-bright`: `#7f612f` -> `#6f5428`
- `--accent-purple`: `#7a6ea3` -> `#6f6298`
- `--status-up`: `#2f8f53` -> `#267645`
- `--status-down`: `#c34f4f` -> `#bf4a4a`
- `--status-warn`: `#9a7428` -> `#8a661f`

적용 효과:
- 보조 텍스트/강조 텍스트/상태 라벨의 가독성 여유 폭 증가
- 카드 모달 및 리딩 섹션 상태색의 라이트 모드 판독성 개선

### 2) WCAG 대비 자동 점검 스크립트 추가
신규 스크립트 `scripts/wcag-contrast-check.mjs`를 추가했습니다.

- 다크/라이트 공통 핵심 조합 대비 계산
- 기준: 일반 텍스트 4.5:1
- 미달 항목 존재 시 종료 코드 1로 실패 처리

검증 대상 조합:
- `text-primary|secondary|muted` vs `bg|surface|panel`
- `text-on-accent` vs `accent`
- `status-up|down|info|warn` vs `modal-bg`

### 3) 실행 스크립트 등록
루트 `package.json`에 다음 명령을 추가했습니다.
- `npm run a11y:contrast`

### 4) 감사 문서화
`docs/WCAG_LIGHT_THEME_AUDIT_V1.md`를 신설해 아래를 기록했습니다.
- 점검 범위(Home / Cards modal / TarotMastery)
- 기준(WCAG 2.1 AA)
- 토큰 변경 내역
- 1차 점검 결과
- 후속 자동화 제안(v2: Playwright+axe)

## 검증 결과
- `npm run a11y:contrast` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 라이트 테마에서 대비 경계값 문제를 사전 예방 가능한 체계로 전환
- 향후 색상 변경 시 회귀를 자동으로 감지할 수 있는 기반 확보

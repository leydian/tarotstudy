# Release Notes v6.3.12 (2026-02-28)

## 목적
지팡이 9 카드만 이미지가 로드되지 않는 문제를 해결해 카드 렌더링 일관성을 복구합니다.

## 핵심 변경
- `w09` 카드 이미지 URL 교체
  - 기존(404): `https://commons.wikimedia.org/wiki/Special:FilePath/Wands09.jpg`
  - 신규(200): `https://commons.wikimedia.org/wiki/Special:FilePath/Tarot%20Nine%20of%20Wands.jpg`

## 변경 파일
- `apps/api/src/data/wands.js`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.12.md`

## 원인 분석
- 카드 데이터는 정상 매핑되어 있었으나, 외부 호스팅된 이미지 경로(`Wands09.jpg`)가 유효하지 않아 404가 발생했습니다.
- 인접 카드(`Wands08`, `Wands10`)는 정상 응답으로, 데이터셋 중 `w09` 경로만 불량이었습니다.

## 기대 효과
- 지팡이 9 카드 이미지 정상 표시.
- 리딩/탐구 탭에서 특정 카드만 빈 이미지로 보이는 현상 제거.

## 검증
- `npm run build --prefix apps/web`

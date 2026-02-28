# Release Notes v6.3.10 (2026-02-28)

## 목적
결과 화면에서 `운명의 마스터 리포트`와 `사서의 통찰/기운` 문구가 중복되는 UX 문제를 줄이고,
하단 보조 영역이 별도 가치(근거/실천)를 제공하도록 개선합니다.

## 핵심 변경
- 중복 탐지 로직 추가
  - `conclusion`과 `report.summary / report.verdict.rationale`를 정규화해 비교
  - `[운명의 판정]` 이하 텍스트는 비교 시 제외
- 중복 시 대체 문구 적용
  - `사서의 통찰` -> 첫 카드 근거(`evidence`) 기반 보강 문장
  - `~의 기운` -> 첫 실천 지침(`action`) 기반 보강 문장
- 비중복 시 기존 원문 유지(회귀 방지)

## 변경 파일
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.10.md`

## 상세 구현
1. `normalizeForCompare()`
- 공백/대소문자/판정 블록 영향 제거 후 문자열 비교용으로 정규화.

2. `getDistinctReportCopy()`
- 중복 여부(`summaryDup`, `rationaleDup`) 판정.
- 중복이면 `evidence/action`에서 대체 문구를 구성하고,
  원문이 필요할 경우 안전한 fallback으로 유지.

3. 결과 렌더링 연결
- `사서의 통찰`, `~의 기운` 노출 시 `getDistinctReportCopy()` 결과 사용.

## 기대 효과
- 사용자 입장에서 반복 감 감소.
- 하단 보조 영역이 카드 근거와 실행 지침 중심으로 역할 분리.

## 검증
- `npm run build --prefix apps/web`

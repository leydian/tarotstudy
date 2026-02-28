# Release Notes v6.3.6 (2026-02-28)

## 목적
사용자 화면에서 리딩 결과가 실제로 외부 API(Anthropic/OpenAI) 기반인지, 아니면 fallback(v3)인지 즉시 판단할 수 있도록 가시성을 추가합니다.

## 문제 배경
- 리딩 본문이 v3 스타일과 유사해 API 성공/실패를 사용자가 구분하기 어려웠음
- 운영 로그를 보지 않으면 실패 원인을 알기 어려워 디버깅 회전 속도가 느렸음

## 변경 사항

### 1) 결과 화면 진단 배지 추가
- 파일: `apps/web/src/pages/TarotMastery.tsx`
- 위치: `운명의 리포트` 탭 상단
- 표시 항목:
  - `apiUsed` (`Anthropic` / `OpenAI` / `Fallback(v3)` / `Unknown`)
  - `fallbackUsed` (`true` / `false`)
  - `fallbackReason` (`model_unavailable`, `validation_failed`, `server_error`, `none`)

### 2) 프론트 타입 확장
- 파일: `apps/web/src/types/tarot.ts`
- `ReadingResponse`에 `apiUsed?: 'anthropic' | 'openai' | 'fallback' | 'none'` 추가
- 기존 하위호환 필드 유지

### 3) UI 스타일 반영
- 파일: `apps/web/src/pages/TarotMastery.module.css`
- 진단 배지용 스타일 추가:
  - `.diagnosticBox`
  - `.diagnosticPill`

## 기대 효과
- 사용자/개발자가 결과 화면만 보고 API 성공 여부를 즉시 확인 가능
- fallback 여부 확인을 위해 서버 로그를 매번 열 필요가 줄어듦
- 운영 이슈(네트워크, 모델, 타임아웃) 분류가 빨라짐

## 검증
- `npm run build --prefix apps/web` 통과

## 참고
- 이 변경은 진단 가시성 추가이며 리딩 알고리즘/판정 로직 자체는 변경하지 않음

# Codex 변경사항 정리 (2026-02-22)

## 개요
- 목적: 원카드 리딩의 실전 체감 품질 개선
- 핵심 방향:
  - API 비용 절감을 위한 CLI 호출 모드 지원
  - 원카드 응답의 결론/근거/실행 구조 고도화
  - 질문군(커피/운동/연락/결제)별 상태 라벨 및 행동 가이드 강화
  - 문체를 부드러운 구어체로 조정

## 주요 변경

### 1) 외부 생성기 모드 확장 (API + CLI)
- 파일: `apps/api/src/external-ai.js`
- 변경:
  - `EXTERNAL_AI_MODE=api|cli` 분기 추가
  - `cli` 모드에서 `codex exec` 호출로 생성 결과 수집
  - JSON 파싱 내구성 강화(직접 JSON + fenced JSON 대응)
  - 실패 시 `null` 반환하여 기존 fallback 동작 유지

### 2) 환경변수 및 문서 업데이트
- 파일: `apps/api/.env.example`, `README.md`, `apps/api/.env`
- 추가/수정:
  - `EXTERNAL_AI_MODE`
  - `EXTERNAL_AI_CLI_COMMAND`
  - `EXTERNAL_AI_CLI_CWD`
- 운영:
  - 개발/테스트 시 CLI 모드로 전환 가능

### 3) 원카드 요약/판정 로직 개선
- 파일: `apps/api/src/index.js`
- 변경:
  - 예/아니오형 질문 감지 로직 정리
  - 리스크 기반 3단계 판정 강화
    - 완전 가능 / 조건부 가능 / 보류(또는 금지)
  - 질문군별(커피/운동/연락/결제) verdict 문구 분리
  - 요약 실행 문장 중복 완화

### 4) 원카드 본문 리딩 품질 개선
- 파일: `apps/api/src/content.js`
- 변경:
  - `coreMessage`와 `interpretation` 역할 분리
    - `coreMessage`: 공감 + 카드 + 한 줄 결론
    - `interpretation`: 근거 키워드 + 카드 상징 + 타이밍 + 실행 + 기대 결과
  - 질문군별 브릿지 문장 강화
    - 커피/운동/연락/결제
  - 연락 질문의 맥락 번역 보정
    - `통제/집중` 등 키워드의 자연스러운 대화 맥락화
  - 카드 보편 브릿지 확장
    - 메이저 22장 테마 맵
    - 마이너 슈트/랭크 테마 맵
  - 문장 자연화
    - 조사 보정
    - 반복 문장 축소
    - 가능성 표현 유지(과신 단정 회피)

## 벤치마킹 반영 요약
- 반영한 요소:
  - 공감 문장 선행
  - 결론의 조기 제시
  - 카드 상징(2~3개) 압축 전달
  - 질문 맥락에 맞는 행동 지시
  - 결과 기대 문장(가능성 기반)
- 유지한 안전 장치:
  - 과도한 단정/과신 표현 지양
  - 보류/금지 시 감정 완충 + 대안 행동 제시

## 확인 사항
- 문법 체크:
  - `node --check apps/api/src/index.js`
  - `node --check apps/api/src/content.js`
  - `node --check apps/api/src/external-ai.js`
- 샘플 검증:
  - `커피를 마셔도 될까?`
  - `운동할까말까?`
  - `연락할까말까?`
  - `결제해도 될까?`

## 비고
- 현재 작업 디렉터리는 기존 `.git`이 없는 상태였음.
- GitHub 업로드를 위해 저장소 초기화 및 원격 연결이 추가로 필요함.

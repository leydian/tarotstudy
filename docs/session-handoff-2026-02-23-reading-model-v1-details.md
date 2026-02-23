# 세션 인수인계 상세 (2026-02-23) — Tone Pipeline 정규화 / Reading Model v1

작성일: 2026-02-23  
최종 갱신: 2026-02-23 (latest)  
대상 커밋: `25a0396`, `65d48e0`  
작업 경로: `/home/eunok/studycodex`

## 1) 문서 목적
- 이번 문서는 리딩 말투/출력 경로의 구조적 비효율을 줄이기 위해 적용한 정규화 변경을 기록합니다.
- 기존 `summary`/`readingV3` 중심 소비 구조에서 `readingModel` 중심 소비 구조로 이동한 이유와 효과를 설명합니다.
- 문서 비대화를 방지하기 위해 변경 범위를 본 문서로 분리하고 메인 문서에는 핵심 링크만 남깁니다.
- 운영자/개발자/리뷰어가 같은 기준으로 회귀를 점검할 수 있도록 전후 비교를 제공합니다.

## 2) 배경 요약
- 이전 구조에서 백엔드는 `readingV3`와 `summary`를 각각 반환했습니다.
- 프론트는 카드뷰/챗봇/내보내기마다 서로 다른 방식으로 텍스트를 조립했습니다.
- 챗봇은 `readingV3`가 있어도 일부 구간에서 접두 재조합 또는 summary 기반 재가공을 수행했습니다.
- 내보내기(TXT/PDF)는 화면 렌더와 다른 소스를 사용해 결과 문체가 달라지는 문제가 있었습니다.
- 시간 문맥 문구가 하드코딩된 구간이 있어 월간/연간 문맥에서 주간 표현이 섞일 수 있었습니다.

## 3) 이번 작업의 목표
- 목표 1: 채널 간 말투와 정보 구조를 일치시킵니다.
- 목표 2: 프론트의 의미 재조립 로직을 줄이고 렌더러 역할로 제한합니다.
- 목표 3: 내보내기가 화면과 같은 기준 텍스트를 사용하도록 통일합니다.
- 목표 4: 레거시 필드를 유지하면서도 점진적으로 `readingModel` 중심으로 이동할 수 있게 만듭니다.

## 4) 핵심 설계 원칙
- 원칙 A: 백엔드가 채널별 읽기 모델을 생성합니다.
- 원칙 B: 프론트는 읽기 모델을 우선 소비합니다.
- 원칙 C: 프론트 후처리는 가독성 보정(문장 밀도/쉬운말)으로 제한합니다.
- 원칙 D: `summary`/`readingV3`는 하위 호환을 위해 유지합니다.
- 원칙 E: 기존 테스트 세트를 깨지 않으면서 단계적으로 확장합니다.

## 5) 변경 커밋
- `25a0396` Unify persona tone pipeline across UI and export
- `65d48e0` Add API-driven readingModel and route UI/export through normalized channels

## 6) 변경 파일 목록
- 백엔드
- `apps/api/src/index.js`
- 프론트 타입
- `apps/web/src/types.ts`
- 프론트 공용 렌더 유틸
- `apps/web/src/lib/tone-render.ts`
- 프론트 챗봇 화면
- `apps/web/src/pages/ChatSpreadPage.tsx`
- 프론트 카드뷰 화면
- `apps/web/src/pages/SpreadsPage.tsx`
- 프론트 내보내기
- `apps/web/src/lib/reading-export.ts`
- 테스트
- `apps/web/test/tarot-language-readability.test.mjs`

## 7) 변경 전 구조 (요약)
- 서버 응답 핵심 필드
- `summary`
- `readingV3`
- 클라이언트 소비 방식
- 카드뷰: `readingV3` 또는 `summary`를 별도 경로로 사용
- 챗봇: `readingV3` quick + 상세 재조합 + summary 구조 파싱 fallback
- 내보내기: `summary/coreMessage/interpretation` 직접 사용
- 문제점
- 채널별 문장 시작/요약 방식 차이
- 반복적인 접두문/후처리 중복
- 내보내기와 화면의 체감 어투 불일치

## 8) 변경 후 구조 (요약)
- 서버 응답 핵심 필드
- `readingModel` (신규)
- `tonePayload` (호환 유지)
- `readingV3` (호환 유지)
- `summary` (호환 유지)
- 클라이언트 우선순위
- 1순위: `readingModel`
- 2순위: `tonePayload`
- 3순위: `readingV3`
- 4순위: `summary`

## 9) `readingModel` 스키마 개요
- `version`
- `verdict`
- `actions`
- `evidence`
- `channel.card.blocks`
- `channel.chatQuick.turns`
- `channel.chatDetail.turns`
- `channel.export.summaryLines`
- `channel.export.checklist`
- `meta.source`
- `meta.timeHorizon`
- `meta.guardrailApplied`
- `meta.personaApplied`

## 10) 백엔드 구현 상세
- 대상 파일: `apps/api/src/index.js`
- `performSpreadDraw()`에서 `readingModel` 생성 및 응답 포함
- 신규 함수: `buildReadingModel()`
- 기존 함수: `buildTonePayload()` 유지
- 기존 함수: `buildReadingV3()` 유지
- 목적: 호환성을 유지하면서 정규화 모델 추가

## 11) 백엔드 `performSpreadDraw()` 변경 포인트
- 기존
- `summary` 생성
- `readingV3` 생성
- `tonePayload` 생성
- 신규
- `readingModel` 생성
- 반환 payload에 `readingModel` 포함
- 영향
- API 소비자는 기존 필드 그대로 사용 가능
- 신규 소비자는 즉시 `readingModel` 사용 가능

## 12) 백엔드 `buildReadingModel()` 생성 로직
- 입력
- `spreadId`
- `items`
- `context`
- `summary`
- `readingV3`
- 내부 판단
- 질문 분석 결과에서 `timeHorizon` 확보
- `readingV3` 존재 여부에 따라 `source` 결정
- 출력 조립
- card 채널 blocks 조립
- chatQuick turns 조립
- chatDetail turns 조립
- export summary/checklist 조립

## 13) card 채널 구성 규칙
- `readingV3`가 있으면 다음 순서 고정
- bridge
- verdict sentence
- evidence lines (최대 3)
- caution
- action.now
- closing
- `readingV3`가 없으면 `summaryLines`를 사용

## 14) chatQuick 채널 구성 규칙
- `readingV3`가 있으면 turn 구조로 생성
- tarot/bridge
- tarot/verdict
- tarot/evidence (첫 근거 1개)
- tarot/caution
- tarot/action
- learning/coach
- `readingV3`가 없으면 `summaryLines`를 짧은 turn으로 변환

## 15) chatDetail 채널 구성 규칙
- 카드별 기반 line을 생성
- 포지션/카드/정역/키워드 근거를 먼저 배치
- 카드 `coreMessage`를 이어서 배치
- 카드 `interpretation`을 이어서 배치
- 필요 시 learning coach line 추가
- 데이터 부족 시 `summaryLines` fallback

## 16) export 채널 구성 규칙
- `summaryLines`
- `checklist`
- `checklist`는 우선순위로 action/caution/checkin 사용
- `readingV3` 미존재 시 summary 기반 fallback

## 17) 메타 필드 구성
- `source`: `readingV3` 또는 `summary`
- `version`: `reading-model-v1`
- `timeHorizon`: question understanding 분석값
- `guardrailApplied`: item 단위 메타 집계
- `personaApplied`: item 단위 메타 집계

## 18) 타입 변경 상세
- 대상 파일: `apps/web/src/types.ts`
- 추가 타입
- `ReadingModelTurn`
- `ReadingModel`
- 변경 타입
- `SpreadDrawResult.readingModel?`
- 의도
- API 타입 안정성 확보
- 챗/카드뷰/내보내기 공통 타입 기반 소비

## 19) 공용 유틸 변경 상세
- 대상 파일: `apps/web/src/lib/tone-render.ts`
- 기존 함수
- `toDisplayLine`
- `toCanonicalReadingLines`
- `toCanonicalChecklist`
- 신규 함수
- `toCanonicalExportSummaryLines`
- 우선순위 강화
- `readingModel` 우선 소비
- 하위 필드 fallback 유지

## 20) 카드뷰 변경 상세
- 대상 파일: `apps/web/src/pages/SpreadsPage.tsx`
- 기존
- `readingV3` 존재 여부로 분기
- 신규
- `toCanonicalReadingLines(activeDraw)` 결과 존재 여부로 분기
- 효과
- `readingModel` 채널 적용 시 분기 추가 없이 자동 반영
- 레거시 경로도 정상 동작

## 21) 챗봇 변경 상세
- 대상 파일: `apps/web/src/pages/ChatSpreadPage.tsx`
- 신규 우선 경로
- `buildQuickDialogFromReadingModel()`
- `buildDetailDialogFromReadingModel()`
- `ChatSummaryView`에서 model turn 우선 렌더
- 기존 경로
- `readingV3` 기반 quick/detail
- summary 파싱 fallback
- 유지 이유
- 기존 데이터/캐시/레거시 응답 호환

## 22) 챗봇 verdict 판단 변경
- 대상 파일: `apps/web/src/pages/ChatSpreadPage.tsx`
- 기존
- `readingV3.verdict.label` 우선
- 신규
- `readingModel.verdict.label` 최우선
- fallback
- 기존 규칙 유지

## 23) 내보내기 변경 상세
- 대상 파일: `apps/web/src/lib/reading-export.ts`
- 기존
- `summary` 직접 사용
- 카드 core/interpretation 원문 직접 사용
- 신규
- `toCanonicalExportSummaryLines()` 우선
- `toCanonicalChecklist()` 우선
- 카드 텍스트 `toDisplayLine()` 통일
- 기대 효과
- 화면과 내보내기 체감 톤 정합성 향상

## 24) 테스트 변경 상세
- 대상 파일: `apps/web/test/tarot-language-readability.test.mjs`
- 변경 이유
- 챗/카드뷰가 직접 유틸을 호출하던 구조에서 공용 래퍼 사용 구조로 변경됨
- 변경 내용
- 문자열 매칭 기준을 `toDisplayLine`, `toCanonicalReadingLines` 기반으로 조정

## 25) 검증 실행 내역
- `npm run -s typecheck:web`
- 결과: 통과
- `npm run -s test:api`
- 결과: 17/17 통과
- `npm run -s test:web`
- 결과: 2/2 통과

## 26) 정량 관점 비교 (Before/After)
- 공용 정규화 엔트리포인트
- Before: 채널별 산발적
- After: `readingModel.channel.*` + `tone-render` 공용
- 챗 quick 재조립 비중
- Before: 접두/역할 문구 재합성 의존 높음
- After: 서버 turn 데이터 우선 소비
- 내보내기 정합성
- Before: summary 직접 출력
- After: model/export summary 우선 출력
- 시간 문맥 일치성
- Before: 일부 하드코딩 잔존
- After: model 생성 단계에서 문맥 포함

## 27) 정성 관점 효과
- 코드 가독성
- 채널별 목적이 `readingModel`로 분리되어 읽기 쉬워짐
- 유지보수성
- 말투 정책 변경 시 백엔드 채널 빌더 중심으로 수정 범위 축소
- 디버깅 효율
- 응답 payload만 보면 채널별 결과를 즉시 재현 가능
- QA 효율
- 채널 불일치 이슈를 모델 필드 비교로 빠르게 재현 가능

## 28) 하위 호환성 정책
- 기존 필드 제거 없음
- `summary` 유지
- `readingV3` 유지
- `tonePayload` 유지
- 신규 소비 경로는 선택 적용
- 기존 캐시 payload도 fallback 경로에서 처리 가능

## 29) 리스크 평가
- 리스크 1
- model/detail turn이 길어질 경우 챗 UI 길이 증가
- 완화
- 프론트 `toDisplayLine` 밀도 제한 유지
- 리스크 2
- model 생성 로직이 index.js에 집중되어 파일 크기 증가
- 완화
- 다음 단계에서 `reading-model-builder` 모듈 분리 예정
- 리스크 3
- 레거시 경로와 신규 경로 동시 유지로 복잡도 증가
- 완화
- 단계적 deprecate 일정 명시

## 30) 성능 관점 점검
- API 연산
- `buildReadingModel` 추가로 문자열 조립 비용이 늘어남
- 영향
- 네트워크/LLM 비용 대비 미미
- 프론트 연산
- summary 파싱 경로를 model 우선으로 우회해 일부 감소
- export 연산
- 기존과 유사하나 canonical 선택 단계가 추가됨

## 31) 운영 관점 체크리스트
- 배포 전
- 타입체크
- API 테스트
- 웹 테스트
- 배포 후
- 챗 quick/detail 출력 확인
- 카드뷰 결과 블록 확인
- TXT/PDF 문체 확인
- fallback 응답(legacy cache) 확인

## 32) QA 권장 시나리오
- one-card
- 질문: "오늘 잠깐 쉴까 말까"
- 기대: quick/detail/export 핵심 결론 정합
- weekly-fortune
- 질문: "이번 주 관계 흐름"
- 기대: time horizon 문구 일관
- monthly-fortune
- 질문: "이번 달 이직 준비"
- 기대: 주차 흐름 + 실행 가이드 일관
- yearly-fortune
- 질문: "올해 커리어 타이밍"
- 기대: 장문 요약/챗 상세 정합
- choice-a-b
- 질문: "A안 vs B안"
- 기대: 비교 근거/체크리스트 일관

## 33) 로그/관찰 포인트
- `readingModel.meta.source`
- `readingModel.meta.timeHorizon`
- `readingModel.channel.chatQuick.turns.length`
- `readingModel.channel.chatDetail.turns.length`
- `readingModel.channel.export.checklist`

## 34) 코드 리뷰 포인트
- 백엔드
- `buildReadingModel`의 fallback 분기 누락 여부
- evidence orientation 매핑 정확성
- guardrail/persona 집계 조건 타당성
- 프론트
- model 우선 소비가 각 채널에서 일관되는지
- fallback 분기 순서가 의도와 일치하는지
- export가 model/export를 우선하는지

## 35) 다음 단계 (권장)
- 단계 1
- `ChatSpreadPage.tsx`의 legacy summary 조립 함수 축소
- 단계 2
- `buildReadingModel`을 별도 모듈로 분리
- 단계 3
- `tonePayload`의 역할을 `readingModel`로 흡수하고 문서상 deprecated 표기
- 단계 4
- 회귀 테스트에 채널 간 불일치 지표를 정식 게이트로 추가

## 36) Deprecated 후보 목록 (즉시 제거 아님)
- 챗 summary 기반 재구성 유틸 일부
- `tonePayload.summaryLines` 장기 중복 경로
- `readingV3`와 `readingModel.verdict/actions` 중복 참조 지점

## 37) 문서/지식 동기화 대상
- `SESSION_HANDOFF.md`
- `docs/handoff/INDEX.md`
- 필요 시 `README.md`의 주요 기능/비고 섹션
- QA/운영자 공유 문서

## 38) 인수인계용 핵심 문장
- 이번 변경의 핵심은 "채널별 출력 텍스트를 API에서 정규화한 `readingModel`로 전달"하는 것입니다.
- 프론트는 말투를 새로 만들지 않고 렌더 중심으로 역할을 축소했습니다.
- 내보내기는 화면과 같은 canonical 라인을 우선 사용하도록 맞췄습니다.
- 기존 필드는 유지되어 호환성 리스크를 낮췄습니다.

## 39) 구현 산출물 요약
- 신규 개념
- `readingModel` 계약
- 신규 유틸
- `toCanonicalExportSummaryLines`
- 소비 전환
- chat/card/export의 model-first 경로
- 테스트
- 웹 가독성 테스트 기준 갱신

## 40) 완료 판정
- 구조적 목표
- API 정규화 채널 도입: 완료
- 프론트 model-first 소비: 완료
- export 정합성 개선: 완료
- 하위 호환 유지: 완료
- 회귀 테스트 통과: 완료

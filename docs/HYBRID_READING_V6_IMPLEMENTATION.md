# Hybrid Reading v6.0 구현 상세

## 1. 목적
- 리딩 품질의 핵심 목표를 문체가 아닌 **근거 일관성**으로 재정의.
- 기존 v3 규칙 엔진의 재현성은 유지하면서, API 기반 구조화 생성으로 표현력/개인화 여지를 확보.
- 실패 가능성을 전제로 검증 및 폴백 경로를 기본 아키텍처에 포함.

## 2. 아키텍처 개요

### 2.1 파이프라인
1. `Card Facts Extraction`  
   카드별 `positionLabel`, `coreMeaning`, `keywords`, `advice`를 구조화.
2. `Structured Synthesis`  
   모델 호출 시 JSON 스키마 강제(`summary`, `verdict`, `evidence[]`, `counterpoints[]`, `actions[]`).
3. `Verification`  
   - evidence 길이/카드 ID 유효성 체크
   - claim/rationale 누락 체크
   - verdict 라벨 유효성 체크
4. `Regeneration`  
   검증 실패 시 1회 재생성(낮은 temperature).
5. `Fallback`  
   재생성 후에도 실패하거나 API 미사용 시 deterministic 리포트 채택.

### 2.2 책임 분리
- `v3.js`: 기존 내러티브 생성(legacy 모드).
- `hybrid.js`: 근거 중심 구조화/검증/폴백.
- `index.js`: 요청 파라미터 처리, 모드 분기, 에러 격리.

## 3. API 변경 사항

## 3.1 POST `/api/reading`
### Request 확장
- `mode`: `"hybrid" | "legacy"` (기본 `hybrid`)
- `spreadId`: 위치 라벨 매핑용 스프레드 식별자
- `sessionContext`: `{ recentQuestions?: string[], recentMood?: string }`
- `structure`: `"evidence_report"` (현재 기본 구조)
- `debug`: 검증 내부 정보 포함 여부

### Response 확장
- 하위호환 필드 유지:
  - `conclusion`, `evidence`, `action`, `yesNoVerdict`
- 신규 구조화 필드:
  - `report.summary`
  - `report.verdict.label/rationale/recommendedOption`
  - `report.evidence[]` (cardId, positionLabel, claim, rationale, caution)
  - `report.counterpoints[]`
  - `report.actions[]`
  - `quality.consistencyScore`
  - `quality.unsupportedClaimCount`
  - `quality.regenerationCount`
  - `fallbackUsed`
  - `mode`

## 3.2 POST `/api/reading/ab`
- 동일 입력에 대해 `legacy`와 `hybrid` 결과를 함께 반환.
- 목적: 블라인드 품질 비교 및 A/B 실험 기반 의사결정.

## 4. 프론트엔드 반영
- `ReadingResponse` 타입 확장으로 구조화 응답을 타입 안전하게 수용.
- `tarotService.getReading()`이 모드/구조/세션 정보를 전달하도록 확장.
- `TarotMastery` 결과 탭 개편:
  - 요약/판정/반례/품질 지표 표시
  - 카드별 근거 목록 표시
  - 구조화 리포트 부재 시 기존 문자열 기반 렌더링으로 자동 폴백

## 5. 신뢰성/안정성 설계 포인트
- 모델 출력은 신뢰하지 않고 반드시 검증.
- 카드 팩트 외 카드 ID 주장 발생 시 `unsupportedClaimCount` 증가.
- 운영에서 API 장애가 나도 서비스 중단 없이 legacy 수준 결과 보장.
- 구조화 + legacy 동시 제공으로 점진적 전환 가능.

## 6. 알려진 제한
- 현재 binary entity 추출은 규칙 기반 정규식이므로 문장 변형에 취약한 케이스가 일부 존재.
- `sessionContext`는 저장형 프로필이 아닌 호출 단위 경량 컨텍스트.
- `debug` 필드는 개발/실험 목적이며 사용자 노출 정책 분리가 필요.

## 7. 검증 결과
- `vite build` 통과.
- 하이브리드 모듈 로딩 및 샘플 실행 통과.
- API 키 없는 환경에서 deterministic fallback 정상 동작 확인.

## 8. v6.0.1 품질 복원 패치

### 8.1 배경
- v6.0 최초 적용 시 API 키 미설정 환경에서 구조화 fallback 문장이 최종 본문에 직접 노출되어,
  기존 v3 대비 문체 품질과 문맥 해석력이 저하되는 회귀가 발생.

### 8.2 수정 전략
- 하이브리드의 역할을 `본문 생성기`가 아니라 `근거 보강기`로 재정의.
- 최종 사용자 노출의 기본 텍스트는 v3 엔진 결과를 유지하고,
  하이브리드 구조화 결과는 신뢰성 지표/근거 블록으로만 보강.

### 8.3 코드 레벨 변경
- `generateReadingHybrid()`:
  - `generateReadingV3()` 결과를 우선 채택해 `conclusion/evidence/action/yesNoVerdict`를 구성.
  - 구조화 리포트는 `report` 및 `quality` 필드로 병행 반환.
- deterministic 근거 문장:
  - `claim` 생성 시 카드 요약문 끝 문장부호 정규화로 비문 제거.
- `TarotMastery` 렌더링:
  - 본문은 `reading.conclusion` 우선 표시.
  - `reading.report.summary`는 `근거 요약` 보조 라인으로 분리.
  - 지침은 `reading.action` 우선 표시.

### 8.4 기대 효과
- API 키 유무와 관계없이 기존 고품질 서사 톤 유지.
- 질문 맥락 해석(기존 v3 강점) + 구조화 근거/검증(하이브리드 강점) 동시 확보.
- 하이브리드 전환 리스크를 줄이면서 점진적 품질 개선 가능.

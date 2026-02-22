# 관계 회복 스프레드 수동 QA 리포트

작성일: 2026-02-22  
대상: `relationship-recovery` 5카드 스프레드 요약 문장

## 점검 기준
- 요약 3파트 존재: `핵심 진단` / `관계 리스크` / `7일 행동 계획`
- 동일 문장 과다 반복: 동일 문장 3회 이상 반복 없음
- 행동 문장 존재: 실행 동사(정하세요/준비/남기세요/확인/실행 등) 포함

## 샘플 구성
- 재회 맥락 4건
- 갈등 맥락 4건
- 일반 관계 맥락 4건
- 총 12건

## 결과 요약
- 통과: 12/12 (100%)
- 실패: 0/12
- 기준 충족 여부:
  - 요약 3파트: 전 케이스 충족
  - 과다 반복: 전 케이스 없음
  - 행동 문장: 전 케이스 포함

## 케이스별 결과
| id | context | 결과 |
|---|---|---|
| reunion-1 | 헤어진 사람과 재회 가능성 | Pass |
| reunion-2 | 재회 연락 타이밍 | Pass |
| reunion-3 | 다시 만나기 전에 준비할 것 | Pass |
| reunion-4 | 재회 시도 후 관계 안정화 | Pass |
| conflict-1 | 최근 다툰 상대와 갈등 완화 | Pass |
| conflict-2 | 말다툼 이후 관계 회복 | Pass |
| conflict-3 | 오해가 반복되는 관계 조정 | Pass |
| conflict-4 | 감정 충돌 후 대화 재개 | Pass |
| general-1 | 요즘 관계 흐름 점검 | Pass |
| general-2 | 관계 거리감 원인 파악 | Pass |
| general-3 | 상대 반응 읽기 | Pass |
| general-4 | 7일 행동 계획 세우기 | Pass |

## 관찰 메모
- 구조 기준은 안정적으로 통과했지만, `대화 전에는 사실 1개/요청 1개...` 문장이 여러 케이스에서 반복됩니다.
- 다음 개선 라운드에서는 7일 행동 계획 마지막 문장 변주폭을 넓혀 체감 다양성을 높이는 것이 좋습니다.

## 재현 메모
- 원시 결과: `tmp/qa-sample-results-2026-02-22.json`

## 2차 자동 QA(변주 정량 기준)
- 명령: `npm run qa:relationship-recovery`
- 산출물:
  - `tmp/relationship-recovery-variation-report.json`
  - `tmp/relationship-recovery-variation-report.md`
- 기본 샘플 수:
  - 50회 (환경변수 `RELATIONSHIP_QA_SAMPLES`로 조정 가능)
- 합격 임계값(균형형):
  - 구조 실패 0건
  - 행동문 실패 0건
  - 섹션별 `exactPairRate <= 0.26`
  - 섹션별 `highSimilarityPairRate <= 0.42`
  - 섹션별 `distinctRatio >= 0.10`

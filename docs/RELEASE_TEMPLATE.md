# Release Notes Template

## 개요
- 이번 릴리스 목표:
- 사용자 체감 개선 포인트:

## 변경 파일
- 

## 주요 변경 사항
### 1) 
- 변경 내용:
- 이유:
- 영향 범위:

### 2) 
- 변경 내용:
- 이유:
- 영향 범위:

## API/타입 변경
- 외부 계약 변경 여부:
- 하위 호환성:

## 검증
- [ ] `npm run test:persona --prefix apps/api`
- [ ] `npm run test:hybrid --prefix apps/api`
- [ ] `npm run test:fortune --prefix apps/api`
- [ ] `npm run test:ui-contract --prefix apps/web`
- [ ] `npm run build --prefix apps/web`

## 운영 지표 확인
- fallbackRate:
- p95 latency:
- failureStage 상위 원인:

## 롤백 포인트
- 되돌릴 커밋:
- 즉시 완화 방법:

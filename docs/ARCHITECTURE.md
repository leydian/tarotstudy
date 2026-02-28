# 🏛 시스템 아키텍처 및 리딩 엔진

아르카나 성소의 핵심인 **하이브리드 리딩 엔진 v6.3**의 작동 원리를 설명합니다.

## 🧠 다층 엔진 구조 (Multi-layered Engine)
시스템은 두 단계의 엔진 체인을 통해 어떤 상황에서도 안정적인 리딩을 보장합니다.

1.  **Anthropic Engine (Priority 1)**:  
    Claude 계열 모델 호출로 서사/리포트를 생성합니다. 실패 시 재시도/repair 단계를 거쳐 복구를 시도합니다.
2.  **Deterministic Fallback (Priority 2)**:  
    API 키 미설정, 네트워크 장애, 파싱 실패, 품질 검증 실패 시 로컬 결정론 엔진으로 즉시 전환합니다.

## 🛠 기술 스택
- **Backend**: Node.js, Express (Express API server)
- **Frontend**: React, TypeScript, Vite (Single Page Application)
- **Styling**: Vanilla CSS Modules (Glassmorphism & Sacred theme)
- **AI Models**: Claude (Anthropic) + deterministic fallback

## 🔄 서사 생성 프로세스 (fullNarrative)
기존의 분절된 텍스트 조합 방식에서 벗어나, **전체 맥락(Full Context)**을 기준으로 결과를 구성합니다.
- **Input**: 질문, 카드 상징 데이터, 스프레드 위치 정보, 최근 질문 맥락.
- **Process**: 질문 프로파일 추론 -> 응답 모드 결정 -> 모델 생성/복구 -> 품질 검증 -> 필요 시 fallback.
- **Output**: 결론(Conclusion), 증거(Evidence), 지침(Action), 구조화 리포트(Report), 메타 진단 정보(meta).

---
*운명은 단순한 카드 조각의 합이 아닌, 그 조각들이 만드는 하나의 이야기입니다.*

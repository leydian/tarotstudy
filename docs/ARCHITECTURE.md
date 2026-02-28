# 🏛 시스템 아키텍처 및 리딩 엔진

아르카나 성소의 핵심인 **하이브리드 리딩 엔진 v6.1**의 작동 원리를 설명합니다.

## 🧠 다층 엔진 구조 (Multi-layered Engine)
시스템은 세 단계의 폴백(Fallback) 체인을 통해 어떤 상황에서도 안정적인 리딩을 보장합니다.

1.  **Anthropic Engine (Priority 1)**:  
    `Claude 3.5 Haiku` 모델을 사용하여 가장 문학적이고 공감적인 서사를 생성합니다. 한국어 조사 및 어미 처리가 가장 유려합니다.
2.  **OpenAI Engine (Priority 2)**:  
    Anthropic API 오류 또는 지연 발생 시 `GPT-4o-mini`가 즉각 투입됩니다. 논리적인 분석과 구조화된 리포트 생성에 강점이 있습니다.
3.  **Legacy Deterministic (Priority 3)**:  
    모든 API 네트워크가 단절되거나 키가 없을 때 작동하는 로컬 엔진(`v3.js`)입니다. 미리 정의된 6,000개 이상의 서사 조합으로 기본적인 품질을 유지합니다.

## 🛠 기술 스택
- **Backend**: Node.js, Express (Express API server)
- **Frontend**: React, TypeScript, Vite (Single Page Application)
- **Styling**: Vanilla CSS Modules (Glassmorphism & Sacred theme)
- **AI Models**: Claude 3.5 Haiku, GPT-4o-mini

## 🔄 서사 생성 프로세스 (fullNarrative)
기존의 분절된 텍스트 조합 방식에서 벗어나, **전체 맥락(Full Context)**을 AI가 한 번에 써 내려갑니다.
- **Input**: 질문, 카드 상징 데이터, 스프레드 위치 정보, 사용자 최근 질문 맥락.
- **Process**: 질문 무게 측정 -> 톤 설정 -> 개별 카드 해석 -> 종합 결론 도출.
- **Output**: 완성된 사서의 리딩 본문(Conclusion) 및 구조화된 분석 리포트(Report).

---
*운명은 단순한 카드 조각의 합이 아닌, 그 조각들이 만드는 하나의 이야기입니다.*

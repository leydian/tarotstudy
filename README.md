# 🔮 아르카나 성소 (Arcana Sanctuary)

운명과 지혜가 만나는 디지털 타로 도서관, **아르카나 성소**에 오신 것을 환영합니다.  
본 프로젝트는 최신 LLM(Claude 3.5, GPT-4o) 기술과 전통적인 타로 해석 로직을 결합하여, 사용자에게 깊이 있고 공감적인 운명의 서사를 제공합니다.

## ✨ 주요 특징
- **하이브리드 리딩 엔진 (v6.1)**: Anthropic Claude 3.5 Haiku를 최우선 엔진으로 채택하여 문학적이고 따뜻한 리딩 제공.
- **지능형 컨텍스트 인식**: 질문의 무게(가벼운 일상 vs 진중한 고민)를 감지하여 어휘와 톤을 자동 조절.
- **양자택일(Binary) 분석**: 선택의 기로에서 두 카드를 대조 분석하여 명확한 방향성 제시.
- **아르카나 성소 테마 UI**: 유리 질감(Glassmorphism)과 황금빛 포인트가 조화된 신비로운 사용자 경험.

## 🚀 빠른 시작
### 1. 환경 설정
`apps/api/.env` 파일을 생성하고 필요한 API 키를 입력합니다.
```env
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
```

### 2. 설치 및 실행
```bash
# 의존성 설치
npm install

# API 서버 실행 (Port: 8787)
npm run dev --prefix apps/api

# 웹 프론트엔드 실행 (Port: 5173)
npm run dev --prefix apps/web
```

## 📚 상세 문서
- [🏛 아키텍처 및 엔진 상세](./docs/ARCHITECTURE.md)
- [🌟 주요 기능 명세](./docs/FEATURES.md)
- [🧭 페르소나 운영 계약](./docs/PERSONA_CONTRACT.md)
- [🛠 개발 워크플로우 표준](./docs/DEVELOPMENT_WORKFLOW.md)
- [✅ 품질 게이트 기준](./docs/QUALITY_GATE.md)
- [🔐 설치 및 보안 가이드](./docs/SETUP_SECURITY.md)
- [📜 변경 이력 (Changelog)](./docs/CHANGELOG.md)

---
*기록되지 않은 운명들이 모이는 곳, 아르카나 도서관 사서가 당신을 기다립니다.*

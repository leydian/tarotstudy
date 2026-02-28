# 🎴 Tarot Codex (타로 코덱스) v1.4.0

**Tarot Codex**는 단순한 타로 앱을 넘어, 사용자의 질문 의도를 파악하고 최적의 서사를 제공하는 **하이브리드 리딩 엔진(Hybrid + Adaptive)** 기반의 프리미엄 타로 플랫폼입니다.

## ✨ 핵심 기능

### 1. 하이브리드 리딩 엔진 (Hybrid v6 + Adaptive v3)
- **지능형 질문 분석**: "커피 마실까?" 같은 가벼운 질문부터 "이직운" 같은 무거운 고민까지 질문의 무게감을 스스로 판단합니다.
- **구조화 근거 리포트**: 결론/카드별 근거/반례/실행 지침을 구조화된 스키마로 제공합니다.
- **검증 및 폴백**: 모델 출력 검증 실패 시 자동 재생성 및 deterministic fallback으로 안정성을 보장합니다.
- **한국어 최적화**: 자연스러운 조사 선택(을/를, 와/과) 및 전문가 수준의 문체(Honorifics)를 구현했습니다.

### 2. 지능형 챗봇 리딩 (Chat Reading)
- **대화형 UX**: 타로 마스터와 대화하듯 질문을 던지고, 단계적으로 공개되는 리딩을 통해 몰입감 있는 상담 경험을 제공합니다.
- **양자택일 모드**: "A vs B" 형태의 질문을 자동 감지하여 2장의 카드로 정밀 비교 분석을 수행합니다.
- **스프레드 자동 선택**: 질문 키워드에 따라 켈틱 크로스(10장), 연간 호로스코프(12장) 등 최적의 스프레드를 마스터가 제안합니다.

### 3. 시각적 스프레드 도서관 (Visual Library)
- **78장 초정밀 데이터**: 백과사전급 서사, 심리학적 분석, 정/역방향 리딩 가이드가 슈트별로 모듈화되어 있습니다.
- **다차원 시각화**: 중앙 기준점 좌표 시스템을 통해 월별 펜타, 관계의 거울 등 복잡한 스프레드를 화면에 완벽하게 구현합니다.
- **이미지 세이프티**: 이미지 로딩 실패 시 자동으로 카드 상징 기반 Placeholder를 생성하여 운영 안정성을 확보했습니다.

## 🚀 빠른 시작

### 설치
```bash
npm install
```

### 실행
```bash
# API 서버 실행 (8787 포트)
npm run dev:api

# 웹 앱 실행 (5173 포트)
npm run dev:web
```

### 선택 환경 변수
```bash
# 하이브리드 모델 호출 활성화 (없으면 deterministic fallback 사용)
OPENAI_API_KEY=...

# 선택: 모델 지정
READING_MODEL=gpt-4.1-mini
```

## 🔌 주요 API
- `POST /api/reading`: 기본 하이브리드 리딩 (`mode: hybrid|legacy`, `structure`, `sessionContext`, `debug` 지원)
- `POST /api/reading/ab`: legacy/hybrid 동시 결과 반환 (A/B 비교용)

## 📂 프로젝트 구조
- `apps/api`: Express 기반 리딩 엔진 및 타로 데이터 API
- `apps/web`: React + TypeScript 기반 고성능 타로 UI
- `docs/`: 리딩 엔진 혁신 보고서 및 업데이트 내역
  - `docs/HYBRID_READING_V6_IMPLEMENTATION.md`: 하이브리드 엔진 상세 구현 문서

## 🛠️ 기술 스택
- **Frontend**: React, TypeScript, Vite, Vanilla CSS
- **Backend**: Node.js, Express, Hybrid Reading v6 + Adaptive Logic v3
- **Data Architecture**: 슈트별 파일 분리를 통한 데이터 무결성 확보

---
© 2026 Tarot Codex Project. All rights reserved.
라이브러리 본연의 가치와 리딩의 정교함에 집중합니다.

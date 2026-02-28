import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { cards, getCardById } from './data/cards.js';
import { spreads, getSpreadById } from './data/spreads.js';
import { generateReadingV3 } from './domains/reading/v3.js';
import { generateReadingHybrid } from './domains/reading/hybrid.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

// 타로 카드 목록 조회
app.get('/api/cards', (req, res) => {
  res.json(cards);
});

// 특정 카드 상세 조회
app.get('/api/cards/:id', (req, res) => {
  const card = getCardById(req.params.id);
  if (card) {
    res.json(card);
  } else {
    res.status(404).json({ error: 'Card not found' });
  }
});

// 스프레드 목록 조회
app.get('/api/spreads', (req, res) => {
  res.json(spreads);
});

// AI 리딩 생성 (V3 모델)
app.post('/api/reading', async (req, res) => {
  const {
    cardIds,
    question,
    timeframe,
    category,
    spreadId,
    mode = 'hybrid',
    sessionContext,
    structure = 'evidence_report',
    debug = false
  } = req.body;

  if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
    return res.status(400).json({ error: 'cardIds 배열이 필요합니다.' });
  }

  const selectedCards = cardIds.map(id => getCardById(id)).filter(Boolean);
  if (selectedCards.length === 0) {
    return res.status(400).json({ error: '유효한 카드가 없습니다.' });
  }

  const spread = (spreadId ? getSpreadById(spreadId) : null)
    || spreads.find(s => s.id === timeframe)
    || spreads.find(s => s.positions.length === selectedCards.length)
    || null;

  const cardsWithPosition = selectedCards.map((card, idx) => ({
    ...card,
    positionLabel: spread?.positions?.[idx]?.label || `단계 ${idx + 1}`
  }));

  try {
    if (mode === 'legacy') {
      const reading = generateReadingV3(cardsWithPosition, question || '나의 현재 상황은?', timeframe, category);
      return res.json({ ...reading, mode: 'legacy' });
    }

    const reading = await generateReadingHybrid({
      cards: cardsWithPosition,
      question: question || '나의 현재 상황은?',
      timeframe,
      category,
      sessionContext,
      structure,
      debug
    });

    return res.json(reading);
  } catch (error) {
    console.error('[Tarot API] Hybrid reading failed, fallback to legacy:', error?.message || error);
    const reading = generateReadingV3(cardsWithPosition, question || '나의 현재 상황은?', timeframe, category);
    return res.json({ ...reading, mode: 'legacy', fallbackUsed: true });
  }
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vercel 서버리스 환경 대응을 위해 app을 내보냅니다.
export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`[Tarot API] Server is running on http://localhost:${port}`);
  });
}

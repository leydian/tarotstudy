import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { cards, getCardById } from './data/cards.js';
import { spreads, getSpreadById } from './data/spreads.js';
import { courses } from './data/courses.js';
import { generateReadingV3 } from './domains/reading/v3.js';

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

// 학습 코스 조회
app.get('/api/courses', (req, res) => {
  res.json(courses);
});

// AI 리딩 생성 (V3 모델)
app.post('/api/reading', (req, res) => {
  const { cardIds, question } = req.body;
  if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
    return res.status(400).json({ error: 'cardIds 배열이 필요합니다.' });
  }

  const selectedCards = cardIds.map(id => getCardById(id)).filter(Boolean);
  const reading = generateReadingV3(selectedCards, question || '나의 현재 상황은?');
  
  res.json(reading);
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`[Tarot API] Server is running on http://localhost:${port}`);
});

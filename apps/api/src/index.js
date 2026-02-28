import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { cards, getCardById } from './data/cards.js';
import { spreads, getSpreadById } from './data/spreads.js';
import {
  generateReadingHybrid,
  inferQuestionProfile,
  inferQuestionProfileV2
} from './domains/reading/index.js';
import {
  appendMetricLine,
  resolveMetricLogPath,
  readMetricsFromFile,
  filterMetrics,
  filterMetricsByRange,
  aggregateMetrics,
  evaluateThresholds
} from './ops/metrics.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;
const serverRevision = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'local';
const metricLogPath = process.env.TAROT_METRIC_LOG_PATH || '';

app.use(cors());
app.use(express.json());

const makeRequestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const logReadingMetrics = (requestId, reading) => {
  const metric = {
    type: 'reading_metric',
    requestId,
    timestamp: new Date().toISOString(),
    mode: reading?.mode || 'unknown',
    apiUsed: reading?.apiUsed || 'unknown',
    fallbackUsed: !!reading?.fallbackUsed,
    fallbackReason: reading?.meta?.fallbackReason || reading?.fallbackReason || null,
    failureStage: reading?.meta?.failureStage || null,
    questionType: reading?.meta?.questionType || null,
    domainTag: reading?.meta?.domainTag || null,
    readingKind: reading?.meta?.readingKind || null,
    fortunePeriod: reading?.meta?.fortunePeriod || null,
    totalMs: reading?.meta?.timings?.totalMs ?? null,
    confidence: reading?.meta?.confidence ?? null,
    lowConfidence: !!reading?.meta?.lowConfidence,
    contextUsed: !!reading?.meta?.contextUsed,
    downgraded: !!reading?.analysis?.safety?.downgraded,
    intentTop1: reading?.analysis?.intentBreakdown?.[0]?.intent || null,
    qualityScore: reading?.quality?.qualityScore ?? reading?.meta?.qualityScore ?? null,
    qualityFlags: Array.isArray(reading?.meta?.qualityFlags) ? reading.meta.qualityFlags : []
  };
  console.log(`[Tarot Metric] ${JSON.stringify(metric)}`);
  if (metricLogPath) {
    try {
      appendMetricLine(path.resolve(metricLogPath), metric);
    } catch (error) {
      console.error('[Tarot Metric] Failed to append metric log:', error?.message || error);
    }
  }
};

const logFeedbackMetric = (payload) => {
  const metric = {
    type: 'feedback_metric',
    timestamp: new Date().toISOString(),
    requestId: payload?.requestId || null,
    rating: payload?.rating || 'unknown',
    reasonCode: payload?.reasonCode || 'none',
    reason: payload?.reason || null,
    questionType: payload?.questionType || null,
    responseMode: payload?.responseMode || null
  };
  console.log(`[Tarot Feedback] ${JSON.stringify(metric)}`);
  if (metricLogPath) {
    try {
      appendMetricLine(path.resolve(metricLogPath), metric);
    } catch (error) {
      console.error('[Tarot Feedback] Failed to append feedback log:', error?.message || error);
    }
  }
};

const parseWindowMs = (windowParam) => {
  if (windowParam === '1h') return 60 * 60 * 1000;
  if (windowParam === '24h') return 24 * 60 * 60 * 1000;
  if (windowParam === '7d') return 7 * 24 * 60 * 60 * 1000;
  return 0;
};

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

app.post('/api/question-profile', (req, res) => {
  const { question = '', category = 'general' } = req.body || {};
  const profile = inferQuestionProfile({ question, category });
  return res.json(profile);
});

app.post('/api/v2/question-profile', (req, res) => {
  const { question = '', category = 'general', context = null } = req.body || {};
  const profile = inferQuestionProfileV2({ question, category, context });
  return res.json(profile);
});

// AI 리딩 생성
app.post('/api/reading', async (req, res) => {
  const requestId = makeRequestId();
  const {
    cardIds,
    cardDraws,
    question,
    timeframe,
    category,
    spreadId,
    mode = 'hybrid',
    sessionContext,
    structure = 'evidence_report',
    debug = false
  } = req.body;

  if ((!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) && (!Array.isArray(cardDraws) || cardDraws.length === 0)) {
    return res.status(400).json({ error: 'cardIds 또는 cardDraws 배열이 필요합니다.' });
  }

  const normalizedDraws = Array.isArray(cardDraws) && cardDraws.length > 0
    ? cardDraws
      .map((item) => ({
        id: item?.id,
        orientation: item?.orientation === 'reversed' ? 'reversed' : 'upright'
      }))
      .filter((item) => !!item.id)
    : (cardIds || []).map((id) => ({ id, orientation: 'upright' }));

  const selectedCards = normalizedDraws
    .map((draw) => {
      const card = getCardById(draw.id);
      return card ? { ...card, orientation: draw.orientation } : null;
    })
    .filter(Boolean);
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
  const questionProfile = inferQuestionProfile({
    question: question || '나의 현재 상황은?',
    category
  });
  if (mode === 'legacy') {
    return res.status(400).json({
      error: 'mode=legacy is no longer supported. Use mode=hybrid.',
      code: 'legacy_mode_removed'
    });
  }

  try {
    const reading = await generateReadingHybrid({
      cards: cardsWithPosition,
      question: question || '나의 현재 상황은?',
      timeframe,
      category,
      sessionContext,
      structure,
      debug,
      requestId,
      serverRevision,
      questionProfile
    });

    console.log(
      `[Tarot API] requestId=${requestId} mode=${reading.mode} apiUsed=${reading.apiUsed} fallbackUsed=${reading.fallbackUsed} fallbackReason=${reading.meta?.fallbackReason || reading.fallbackReason || 'none'}`
    );
    logReadingMetrics(requestId, reading);
    return res.json(reading);
  } catch (error) {
    console.error(
      `[Tarot API] requestId=${requestId} Hybrid reading failed:`,
      error?.message || error
    );
    return res.status(500).json({
      error: 'hybrid_reading_failed',
      requestId
    });
  }
});

app.post('/api/v2/reading', async (req, res) => {
  const requestId = makeRequestId();
  const {
    cardIds,
    cardDraws,
    question,
    timeframe,
    category,
    spreadId,
    mode = 'hybrid',
    sessionContext,
    structure = 'evidence_report',
    debug = false
  } = req.body;

  if ((!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) && (!Array.isArray(cardDraws) || cardDraws.length === 0)) {
    return res.status(400).json({ error: 'cardIds 또는 cardDraws 배열이 필요합니다.' });
  }

  const normalizedDraws = Array.isArray(cardDraws) && cardDraws.length > 0
    ? cardDraws
      .map((item) => ({
        id: item?.id,
        orientation: item?.orientation === 'reversed' ? 'reversed' : 'upright'
      }))
      .filter((item) => !!item.id)
    : (cardIds || []).map((id) => ({ id, orientation: 'upright' }));

  const selectedCards = normalizedDraws
    .map((draw) => {
      const card = getCardById(draw.id);
      return card ? { ...card, orientation: draw.orientation } : null;
    })
    .filter(Boolean);
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

  const questionProfile = inferQuestionProfileV2({
    question: question || '나의 현재 상황은?',
    category,
    context: sessionContext || null
  });
  if (mode === 'legacy') {
    return res.status(400).json({
      error: 'mode=legacy is no longer supported. Use mode=hybrid.',
      code: 'legacy_mode_removed'
    });
  }

  try {
    const reading = await generateReadingHybrid({
      cards: cardsWithPosition,
      question: question || '나의 현재 상황은?',
      timeframe,
      category,
      sessionContext,
      structure,
      debug,
      requestId,
      serverRevision,
      questionProfile
    });

    return res.json({
      ...reading,
      analysis: questionProfile.analysis,
      meta: {
        ...(reading.meta || {}),
        confidence: questionProfile.confidence,
        lowConfidence: questionProfile.lowConfidence,
        contextUsed: questionProfile.contextUsed
      }
    });
  } catch (error) {
    console.error(
      `[Tarot API] requestId=${requestId} Hybrid reading failed(v2):`,
      error?.message || error
    );
    return res.status(500).json({
      error: 'hybrid_reading_failed',
      requestId
    });
  }
});

app.post('/api/analytics', (req, res) => {
  const { eventName, sessionId, timestamp, context } = req.body || {};
  if (!eventName || !sessionId) {
    return res.status(400).json({ error: 'eventName and sessionId are required' });
  }

  // Keep analytics lightweight: no PII, structured logs for external collector ingestion.
  console.log(
    `[Analytics] event=${eventName} session=${sessionId} ts=${timestamp || new Date().toISOString()} context=${JSON.stringify(context || {})}`
  );
  return res.status(202).json({ ok: true });
});

app.post('/api/reading/feedback', (req, res) => {
  const {
    requestId = null,
    rating,
    reasonCode = null,
    reason = '',
    questionType = null,
    responseMode = null
  } = req.body || {};

  if (!rating || !['up', 'down'].includes(String(rating))) {
    return res.status(400).json({ error: 'rating must be one of: up, down' });
  }
  const normalizedReasonCode = reasonCode ? String(reasonCode).trim() : null;
  const validReasonCodeSet = new Set(['repetition', 'too_long', 'not_relevant', 'tone_issue', 'other']);
  if (normalizedReasonCode && !validReasonCodeSet.has(normalizedReasonCode)) {
    return res.status(400).json({ error: 'reasonCode must be one of: repetition, too_long, not_relevant, tone_issue, other' });
  }

  const normalizedReason = String(reason || '').trim().slice(0, 300);
  logFeedbackMetric({
    requestId: requestId ? String(requestId).trim() : null,
    rating: String(rating),
    reasonCode: normalizedReasonCode || 'none',
    reason: normalizedReason || null,
    questionType: questionType ? String(questionType) : null,
    responseMode: responseMode ? String(responseMode) : null
  });

  return res.status(202).json({ ok: true });
});

app.get('/api/admin/metrics', (req, res) => {
  const configuredKey = process.env.ADMIN_METRICS_KEY || '';
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !configuredKey) {
    return res.status(503).json({
      ok: false,
      error: 'Admin metrics endpoint is disabled: ADMIN_METRICS_KEY is not configured'
    });
  }
  const requestKey = req.headers['x-admin-key'];
  if (configuredKey && requestKey !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const windowParam = String(req.query.window || '').trim();
    const limit = Math.min(5000, Math.max(1, Number(req.query.limit || 300)));
    const windowMs = parseWindowMs(windowParam);
    const nowMs = Date.now();
    const inputPath = resolveMetricLogPath(process.env.TAROT_METRIC_LOG_PATH);
    const metrics = readMetricsFromFile(inputPath);
    const filteredMetrics = filterMetrics(metrics, { windowMs, limit, nowMs });
    const report = aggregateMetrics(filteredMetrics, inputPath);
    const status = evaluateThresholds(report);

    let previous = null;
    if (windowMs > 0) {
      const prevFrom = nowMs - (windowMs * 2);
      const prevTo = nowMs - windowMs;
      const previousMetrics = filterMetricsByRange(metrics, prevFrom, prevTo);
      const previousReport = aggregateMetrics(previousMetrics, inputPath);
      previous = {
        window: windowParam,
        totalReadings: previousReport.totalReadings,
        fallbackRatePct: previousReport.fallbackRatePct,
        latencyP95: previousReport.latency.p95
      };
    }

    return res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      filters: {
        window: windowParam || 'all',
        limit
      },
      report,
      status,
      previous
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error?.message || 'Failed to aggregate metrics'
    });
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

import { cards } from '../../data/cards.js';
import { buildSpreadReading, chooseReadingExperimentVariant } from '../../content.js';
import { summarizeSpread } from '../summaries/aggregator.js';
import { buildReadingV3 } from '../reading/v3.js';
import { buildReadingModel, deriveReadingV3FromModel, deriveTonePayloadFromModel } from '../../reading-model-builder.js';

export function makeDrawEngine({ spreadCatalog, progressStore, telemetryStore, personaPolicy }) {
  
  function pickRandomCards(deck, count) {
    const pool = [...deck];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  return function performSpreadDraw({
    spreadId,
    variantId = '',
    level = 'beginner',
    context = '',
    experimentVariant,
    personaGroup = '',
    personaId = '',
    userId = ''
  }) {
    const spread = spreadCatalog.find((item) => item.id === spreadId);
    if (!spread) {
      return { error: { status: 404, message: 'Spread not found' } };
    }

    const variant = spread.variants?.find((item) => item.id === variantId) ?? null;
    const positions = variant?.positions ?? spread.positions;
    if (!positions?.length) {
      return { error: { status: 400, message: 'Spread positions are not configured' } };
    }
    if (positions.length > cards.length) {
      return { error: { status: 400, message: 'Requested draw exceeds deck size' } };
    }

    // Fetch user history if userId is provided
    const userHistory = userId ? progressStore.getUserProgress(userId) : null;

    const forcedExperiment = experimentVariant === 'A' || experimentVariant === 'B' ? experimentVariant : null;
    const readingExperiment = forcedExperiment
      ?? chooseReadingExperimentVariant(`${spread.id}:${level}:${context}:${new Date().toISOString().slice(0, 13)}`);
    const drawnCards = pickRandomCards(cards, positions.length);
    const items = positions.map((position, index) => {
      const card = drawnCards[index];
      const orientation = Math.random() < 0.3 ? 'reversed' : 'upright';
      const reading = buildSpreadReading({
        card,
        spreadId: spread.id,
        position,
        orientation,
        level,
        context,
        experimentVariant: readingExperiment,
        personaGroup,
        personaId,
        userHistory
      });
      return {
        position,
        orientation,
        card: {
          id: card.id,
          name: card.name,
          nameKo: card.nameKo,
          imageUrl: card.imageUrl,
          imageSources: card.imageSources,
          imageAttribution: card.imageAttribution,
          keywords: card.keywords
        },
        interpretation: reading.interpretation,
        coreMessage: reading.coreMessage,
        learningPoint: reading.learningPoint,
        tarotPersonaMeta: reading.tarotPersonaMeta || undefined,
        learningPersonaMeta: reading.learningPersonaMeta || undefined,
        qualityMeta: reading.qualityMeta || undefined
      };
    });

    for (const item of items) {
      if (item.tarotPersonaMeta?.guardrailApplied) {
        telemetryStore.recordSpreadEvent({
          type: 'tarot_guardrail_applied',
          spreadId: spread.id,
          level,
          context
        });
      }
      if (item.tarotPersonaMeta?.tarotPurityScore < 100) {
        telemetryStore.recordSpreadEvent({
          type: 'tarot_persona_rewrite_applied',
          spreadId: spread.id,
          level,
          context
        });
      }
      if (item.learningPersonaMeta?.repetitionRisk === 'high') {
        telemetryStore.recordSpreadEvent({
          type: 'learning_repetition_high',
          spreadId: spread.id,
          level,
          context
        });
      }
      if (item.qualityMeta?.rewriteApplied) {
        telemetryStore.recordSpreadEvent({
          type: 'natural_gate_rewrite_applied',
          spreadId: spread.id,
          level,
          context
        });
      }
      if (item.qualityMeta?.passes === false) {
        telemetryStore.recordSpreadEvent({
          type: 'natural_gate_under_threshold',
          spreadId: spread.id,
          level,
          context
        });
      }
    }

    const summary = summarizeSpread({
      spreadId: spread.id,
      spreadName: spread.name,
      items,
      context,
      level,
      userHistory
    });
    const rawReadingV3 = buildReadingV3({
      spreadId: spread.id,
      spreadName: spread.name,
      items,
      context,
      level,
      userHistory,
      personaGroup,
      personaId
    });
    // 방안 2: items에서 첫 번째 tarotPersonaMeta의 voiceProfile 메타를 readingModel에 전달
    const firstPersonaMeta = items[0]?.tarotPersonaMeta || null;
    const voiceProfileMeta = firstPersonaMeta
      ? {
        voiceProfile: firstPersonaMeta.voiceProfile || 'calm-oracle',
        storyDensity: firstPersonaMeta.storyDensity || 'mid',
        symbolHits: firstPersonaMeta.symbolHits ?? 0,
        arcProgression: firstPersonaMeta.arcProgression || 'general'
      }
      : null;
    const readingModel = buildReadingModel({
      spreadId: spread.id,
      items,
      context,
      summary,
      readingV3: rawReadingV3,
      voiceProfileMeta
    });
    const readingV3 = deriveReadingV3FromModel(readingModel) || rawReadingV3;
    const tonePayload = deriveTonePayloadFromModel(readingModel, summary);

    return {
      spreadId: spread.id,
      spreadName: spread.name,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      level,
      context,
      readingExperiment,
      drawnAt: new Date().toISOString(),
      items,
      summary,
      readingV3,
      tonePayload,
      readingModel,
      policyVersion: personaPolicy.policyVersion,
      policySource: personaPolicy.sourcePath
    };
  };
}

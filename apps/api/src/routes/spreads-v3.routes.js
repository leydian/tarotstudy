import { toCanonicalDrawPayload } from '../domains/spreads/canonical-reading.js';

export function registerSpreadsV3Routes(app, { performSpreadDraw, spreadReadingEnhancer = null }) {
  app.post('/api/v3/spreads/:spreadId/draw', async (request, reply) => {
    const { spreadId } = request.params;
    const {
      variantId = '',
      level = 'beginner',
      context = '',
      experimentVariant,
      personaGroup = '',
      personaId = ''
    } = request.body || {};

    const payload = performSpreadDraw({ spreadId, variantId, level, context, experimentVariant, personaGroup, personaId });
    if (payload?.error) {
      reply.code(payload.error.status);
      return { message: payload.error.message };
    }

    // [방안 A] 외부 AI로 readingV3 bridge/verdict 보강
    if (spreadReadingEnhancer && payload.readingV3) {
      try {
        const cards = (payload.items || []).slice(0, 3).map((item) => ({
          position: item?.position?.name || '',
          cardName: item?.card?.nameKo || '',
          orientation: item?.orientation || 'upright',
          keyword: item?.card?.keywords?.[0] || ''
        }));
        const verdictLabel = payload.readingV3?.verdict?.label === 'yes' ? '우세' : payload.readingV3?.verdict?.label === 'hold' ? '조건부' : '박빙';
        const enhanced = await spreadReadingEnhancer({ context: payload.context || '', cards, domain: 'general', verdictLabel });
        if (enhanced) {
          payload.readingV3 = {
            ...payload.readingV3,
            ...(enhanced.bridge ? { bridge: enhanced.bridge } : {}),
            ...(enhanced.verdictSentence ? { verdict: { ...payload.readingV3.verdict, sentence: enhanced.verdictSentence } } : {})
          };
        }
      } catch {
        // AI 보강 실패 시 기존 readingV3 유지
      }
    }

    return toCanonicalDrawPayload(payload);
  });
}

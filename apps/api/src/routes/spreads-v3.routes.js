import { toCanonicalDrawPayload } from '../domains/spreads/canonical-reading.js';

export function registerSpreadsV3Routes(app, { performSpreadDraw }) {
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

    return toCanonicalDrawPayload(payload);
  });
}

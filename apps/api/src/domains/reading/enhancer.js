import { resolveReadingDomain } from './v3.js';

export async function tryEnhanceReadingV3Bridge({ enhancer, payload }) {
  if (!enhancer || !payload?.readingV3) return null;
  try {
    const cards = (payload.items || []).slice(0, 3).map((item) => ({
      position: item?.position?.name || '',
      cardName: item?.card?.nameKo || '',
      orientation: item?.orientation || 'upright',
      keyword: item?.card?.keywords?.[0] || ''
    }));
    const domain = resolveReadingDomain({ intent: '', context: String(payload.context || '') });
    const v3label = payload.readingV3?.verdict?.label;
    const verdictLabel = v3label === 'yes' ? '우세' : v3label === 'hold' ? '조건부' : '박빙';
    const enhanced = await enhancer({ context: String(payload.context || ''), cards, domain, verdictLabel });
    if (!enhanced) return null;
    return {
      ...payload.readingV3,
      ...(enhanced.bridge ? { bridge: enhanced.bridge } : {}),
      ...(enhanced.verdictSentence ? { verdict: { ...payload.readingV3.verdict, sentence: enhanced.verdictSentence } } : {})
    };
  } catch {
    return null;
  }
}

import { cards } from '../../data/cards.js';

export async function runImageHealthCheck() {
  const sampleCards = cards.slice(0, 6).map((card) => ({
    id: card.id,
    sources: card.imageSources || [card.imageUrl]
  }));

  const checks = await Promise.all(
    sampleCards.flatMap((card) =>
      (card.sources || []).slice(0, 2).map(async (url) => {
        const started = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
          clearTimeout(timeout);
          return {
            cardId: card.id,
            source: url,
            ok: res.ok,
            status: res.status,
            latencyMs: Date.now() - started
          };
        } catch {
          return {
            cardId: card.id,
            source: url,
            ok: false,
            status: 0,
            latencyMs: Date.now() - started
          };
        }
      })
    )
  );

  return {
    checkedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      ok: checks.filter((item) => item.ok).length,
      fail: checks.filter((item) => !item.ok).length
    },
    checks
  };
}

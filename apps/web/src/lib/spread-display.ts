import type { Spread } from '../types';

type SpreadVariantLike = NonNullable<Spread['variants']>[number];

export function buildDisplaySpreads(rawSpreads: Spread[]) {
  const groups = new Map<string, Spread[]>();
  for (const spread of rawSpreads) {
    const key = buildLayoutSignature(spread);
    const list = groups.get(key) || [];
    list.push(spread);
    groups.set(key, list);
  }

  const mergedById = new Map<string, Spread>();
  for (const spread of rawSpreads) {
    mergedById.set(spread.id, spread);
  }

  for (const [, members] of groups) {
    if (members.length <= 1) continue;
    const base = members[0];
    const memberIds = new Set(members.map((m) => m.id));
    const baseVariants: SpreadVariantLike[] = [
      ...(base.variants || []),
      ...members.map((m) => ({
        id: `core-${m.id}`,
        name: m.name,
        positions: m.positions,
        sourceSpreadId: m.id
      }))
    ];
    const dedupedVariants = dedupeVariants(baseVariants);
    const hasMergedPurpose = /동일 배열 스프레드는 핵심 변형에서 선택할 수 있습니다\.$/.test(base.purpose);

    mergedById.set(base.id, {
      ...base,
      purpose: hasMergedPurpose ? base.purpose : `${base.purpose} 동일 배열 스프레드는 핵심 변형에서 선택할 수 있습니다.`,
      variants: dedupedVariants
    });

    for (const id of memberIds) {
      if (id === base.id) continue;
      mergedById.delete(id);
    }
  }

  return rawSpreads
    .map((spread) => mergedById.get(spread.id))
    .filter(Boolean) as Spread[];
}

export function resolveDisplaySpreadId(
  rawSpreadId: string,
  displaySpreads: Array<{ id: string; variants?: Array<{ sourceSpreadId?: string }> }>
) {
  const exact = displaySpreads.find((spread) => spread.id === rawSpreadId);
  if (exact) return exact.id;
  const grouped = displaySpreads.find((spread) => (spread.variants || []).some((variant) => variant.sourceSpreadId === rawSpreadId));
  return grouped?.id ?? rawSpreadId;
}

function dedupeVariants(variants: SpreadVariantLike[]) {
  const seen = new Set<string>();
  const out: SpreadVariantLike[] = [];
  for (const variant of variants) {
    const source = variant.sourceSpreadId || variant.id;
    if (seen.has(source)) continue;
    seen.add(source);
    out.push(variant);
  }
  return out;
}

function buildLayoutSignature(spread: Spread) {
  const slotSig = [...spread.layout.slots]
    .map((slot) => `${slot.col}:${slot.row}:${slot.rotate || 0}`)
    .sort()
    .join('|');
  return `${spread.cardCount}:${spread.layout.cols}:${spread.layout.rows}:${slotSig}`;
}

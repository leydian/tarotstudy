import type { SpreadDrawResult } from '../types';
import { limitTarotSentenceDensity, normalizeTarotKorean } from './tarot-language';

export type DisplayToneMode = 'quick' | 'detail' | 'cardCompact' | 'cardNormal';

function compact(text: string) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function toDisplayLine(text: string, mode: DisplayToneMode = 'cardNormal') {
  const normalized = normalizeTarotKorean(compact(text));
  return limitTarotSentenceDensity(normalized, mode);
}

export function toCanonicalReadingLines(draw: SpreadDrawResult, options: { includeCheckin?: boolean } = {}) {
  const includeCheckin = Boolean(options.includeCheckin);
  const v3 = draw.tonePayload?.v3Lines;
  if (v3) {
    return [
      v3.bridge,
      v3.verdict,
      ...(v3.evidence || []),
      v3.caution,
      v3.actionNow,
      ...(includeCheckin ? [v3.checkin] : []),
      v3.closing
    ].map(compact).filter(Boolean);
  }

  if (draw.readingV3) {
    return [
      draw.readingV3.bridge,
      draw.readingV3.verdict.sentence,
      ...draw.readingV3.evidence.map((item) => item.narrativeLine),
      draw.readingV3.caution,
      draw.readingV3.action.now,
      ...(includeCheckin ? [draw.readingV3.action.checkin] : []),
      draw.readingV3.closing
    ].map(compact).filter(Boolean);
  }

  const summaryLines = Array.isArray(draw.tonePayload?.summaryLines)
    ? draw.tonePayload.summaryLines
    : compact(draw.summary).split(/(?<=[.!?])\s+/);
  return summaryLines.map(compact).filter(Boolean);
}

export function toCanonicalChecklist(draw: SpreadDrawResult) {
  const v3 = draw.tonePayload?.v3Lines;
  if (v3) {
    return [compact(v3.actionNow), compact(v3.caution), compact(v3.checkin)];
  }
  if (draw.readingV3) {
    return [
      compact(draw.readingV3.action.now),
      compact(draw.readingV3.caution),
      compact(draw.readingV3.action.checkin)
    ];
  }
  return [];
}


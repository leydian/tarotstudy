import type { SpreadDrawResult } from '../types';
import { limitTarotSentenceDensity, normalizeTarotKorean } from './tarot-language';

export type DisplayToneMode = 'quick' | 'detail' | 'cardCompact' | 'cardNormal';
export const PERSONA_POLICY_RENDER_PRIORITY = ['readingModel', 'tonePayload', 'readingV3', 'summary'] as const;
type ToneSource = (typeof PERSONA_POLICY_RENDER_PRIORITY)[number];

function compact(text: string) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function toDisplayLine(text: string, mode: DisplayToneMode = 'cardNormal') {
  const normalized = normalizeTarotKorean(compact(text));
  return limitTarotSentenceDensity(normalized, mode);
}

export function toCanonicalReadingLines(draw: SpreadDrawResult, options: { includeCheckin?: boolean } = {}) {
  const includeCheckin = Boolean(options.includeCheckin);
  const source = resolveToneSource(draw);
  if (source === 'readingModel') {
    const modelCard = draw.readingModel?.channel?.card?.blocks;
    const lines = Array.isArray(modelCard) ? modelCard.map(compact).filter(Boolean) : [];
    if (includeCheckin && draw.readingModel?.actions?.checkin) {
      lines.push(compact(draw.readingModel.actions.checkin));
    }
    return lines;
  }
  if (source === 'tonePayload') {
    const v3 = draw.tonePayload?.v3Lines;
    return [
      v3?.bridge,
      v3?.verdict,
      ...(v3?.evidence || []),
      v3?.caution,
      v3?.actionNow,
      ...(includeCheckin ? [v3?.checkin] : []),
      v3?.closing
    ].map((text) => compact(text || '')).filter(Boolean);
  }
  if (source === 'readingV3' && draw.readingV3) {
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

export function resolveToneSource(draw: SpreadDrawResult): ToneSource {
  const modelCard = draw.readingModel?.channel?.card?.blocks;
  if (Array.isArray(modelCard) && modelCard.length) {
    return 'readingModel';
  }
  const v3 = draw.tonePayload?.v3Lines;
  if (v3) {
    return 'tonePayload';
  }
  if (draw.readingV3) {
    return 'readingV3';
  }
  return 'summary';
}

export function toCanonicalChecklist(draw: SpreadDrawResult) {
  const modelChecklist = draw.readingModel?.channel?.export?.checklist;
  if (Array.isArray(modelChecklist) && modelChecklist.length) {
    return modelChecklist.map(compact).filter(Boolean).slice(0, 3);
  }
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

export function toCanonicalExportSummaryLines(draw: SpreadDrawResult) {
  const exportLines = draw.readingModel?.channel?.export?.summaryLines;
  if (Array.isArray(exportLines) && exportLines.length) {
    return exportLines.map(compact).filter(Boolean);
  }
  return toCanonicalReadingLines(draw);
}

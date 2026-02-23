function normalizeLine(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function toCanonicalEvidence(readingV3 = null) {
  if (!readingV3 || !Array.isArray(readingV3.evidence)) return [];
  return readingV3.evidence
    .map((item, index) => ({
      index,
      cardName: normalizeLine(item?.cardName || item?.position || ''),
      narrative: normalizeLine(item?.narrativeLine || item?.summary || '')
    }))
    .filter((item) => item.cardName || item.narrative)
    .slice(0, 5);
}

export function toCanonicalDrawPayload(payload) {
  const readingV3 = payload?.readingV3 || null;
  const summary = normalizeLine(payload?.summary || '');
  const verdictSentence = normalizeLine(readingV3?.verdict?.sentence || '');
  const actionNow = normalizeLine(readingV3?.action?.now || '');
  const caution = normalizeLine(readingV3?.caution || '');
  const checkin = normalizeLine(readingV3?.action?.checkin || '');

  const reading = {
    summary: [summary].filter(Boolean),
    detail: [
      normalizeLine(readingV3?.bridge || ''),
      verdictSentence,
      normalizeLine(readingV3?.closing || '')
    ].filter(Boolean),
    checklist: [actionNow, caution, checkin].filter(Boolean),
    evidence: toCanonicalEvidence(readingV3)
  };

  return {
    spreadId: payload.spreadId,
    spreadName: payload.spreadName,
    variantId: payload.variantId,
    variantName: payload.variantName,
    level: payload.level,
    context: payload.context,
    readingExperiment: payload.readingExperiment,
    drawnAt: payload.drawnAt,
    items: payload.items,
    reading,
    verdict: {
      label: normalizeLine(readingV3?.verdict?.label || 'conditional') || 'conditional',
      sentence: verdictSentence || summary
    },
    actions: {
      now: actionNow,
      caution,
      checkin
    },
    meta: {
      policyVersion: payload.policyVersion || '',
      policySource: payload.policySource || '',
      modelVersion: normalizeLine(payload?.readingModel?.meta?.version || 'readingModel-v1') || 'readingModel-v1',
      generatedAt: payload.drawnAt
    },
    compatibility: {
      summary: payload.summary,
      readingV3: payload.readingV3,
      tonePayload: payload.tonePayload,
      readingModel: payload.readingModel
    }
  };
}

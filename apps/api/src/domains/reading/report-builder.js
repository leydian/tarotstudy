export {
  sanitizeText,
  normalizeVerdictLabel,
  isValidVerdictLabel,
  stripListPrefix,
  containsContamination,
  normalizeFortune,
  isHighOverlap,
  withCategorizedFlags,
  applyHealthGuardrail,
  postProcessReport,
  buildCardFacts
} from './report/shared.js';

export { buildDeterministicReport } from './report/deterministic.js';

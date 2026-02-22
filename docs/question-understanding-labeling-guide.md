# Question Understanding Labeling Guide

## Goal
- Build and maintain a high-coverage eval set for hybrid question understanding.
- Target set size: 3000 rows (expandable to 10000).
- Quality gate target: intent/type/choice/domainFloor >= 98%.

## Eval Row Schema
- `id`: stable case id.
- `text`: raw user question text.
- `intent`: expected intent label.
- `questionType`: expected type label.
- `choiceMode`: expected choice parser mode (`single` or `explicit_ab`).
- `locale`: `ko`, `en`, `ko-en-mixed`, `other`.
- `styleTag`: style bucket for coverage diagnostics.
- `lengthBucket`: `xs`, `s`, `m`, `l`, `xl`.
- `riskTag`: `low`, `medium`, `high`.
- `sourceTag`: source topic key used to generate case.
- `referenceIntent`: topic/text-based reference intent.
- `labelingStatus`: `seeded_for_manual_review` or reviewer-defined status.

## Label Definitions
### intent
- Allowed: `relationship-repair`, `social`, `relationship`, `career`, `finance`, `study`, `health`, `daily`, `general`.
- Use the narrowest intent that best matches user goal.
- If no clear domain signal exists, use `general`.

### questionType
- `choice_ab`: explicit A/B or two-option comparison intent.
- `yes_no`: yes/no decision framing (e.g., `할까`, `될까`, `괜찮을까`, `should I`).
- `forecast`: flow/fortune/projection framing (e.g., `운세`, `흐름`, `luck`, `fortune`).
- `open`: all other exploratory questions.

### choiceMode
- `explicit_ab`: text includes explicit two-option comparison.
- `single`: otherwise.

## Manual Review Process
1. Generate latest candidates:
```bash
npm run qa:refresh-cases
```
2. Open `scripts/question-understanding-eval-set.json`.
3. Review row-by-row and correct `intent`, `questionType`, `choiceMode`.
4. Keep metadata fields for diagnostics; do not delete coverage fields.
5. Run eval:
```bash
npm run qa:question-understanding
```
6. Check failure clusters in `tmp/question-understanding-eval-report.md`.

## Conflict Resolution Rules
- If intent is ambiguous but action domain is explicit, prefer action domain.
- For questions mixing forecast and decision, prioritize `yes_no` if a concrete decision is asked.
- For short utterances (`연락?`, `사도 돼?`), infer from verb/object cues first; fallback to `general` only when necessary.

## Maintenance Rules
- Keep eval set size >= 1000 always; preferred baseline is 3000.
- Keep bucket balance reasonable:
  - short utterance + mixed language should not be near zero.
  - each core intent should have meaningful representation.
- Update this guide when label definitions or pass thresholds change.

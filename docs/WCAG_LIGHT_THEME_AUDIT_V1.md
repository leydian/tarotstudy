# WCAG Light Theme Audit v1

## Scope
- Dashboard: `Home` page
- Card modal: `Cards` page modal
- Sanctuary: `TarotMastery` page

## Standard
- WCAG 2.1 AA
- Normal text: minimum contrast `4.5:1`
- Large text / UI components: minimum contrast `3.0:1`

## Method
1. Token-level contrast audit via `scripts/wcag-contrast-check.mjs`
2. Theme token adjustments in `apps/web/src/styles/theme.css` (light mode)
3. Re-run contrast audit + web build validation

## Token Tuning (light theme)
- `--text-muted`: `#7a6f5c` -> `#756a57`
- `--accent-gold`: `#9f7b3d` -> `#7f612f`
- `--accent-gold-bright`: `#7f612f` -> `#6f5428`
- `--accent-purple`: `#7a6ea3` -> `#6f6298`
- `--status-up`: `#2f8f53` -> `#267645`
- `--status-down`: `#c34f4f` -> `#bf4a4a`
- `--status-warn`: `#9a7428` -> `#8a661f`

## 1st-pass Contrast Results
- Check command: `npm run a11y:contrast`
- Result: `PASS (all configured cases)`

### Key checks (light mode)
- `text-primary / bg`: pass
- `text-secondary / bg`: pass
- `text-muted / bg`: pass (fixed)
- `text-on-accent / accent`: pass (fixed)
- `status-up / modal-bg`: pass (fixed)
- `status-down / modal-bg`: pass (fixed)
- `status-info / modal-bg`: pass
- `status-warn / modal-bg`: pass (fixed)

## Validation
- `npm run a11y:contrast` passed
- `npm run build --prefix apps/web` passed

## Follow-up (v2 suggestion)
- Add Playwright + axe automated page scans for:
  - `/`
  - `/cards` + modal open state
  - `/mastery`
- Extend audit cases to placeholder text + border-only controls (`3:1`) with layered backgrounds.

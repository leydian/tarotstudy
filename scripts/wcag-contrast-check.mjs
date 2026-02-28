#!/usr/bin/env node

const themes = {
  dark: {
    bg: '#0a0a0c',
    surface: '#121215',
    panel: 'rgba(0, 0, 0, 0.14)',
    bubbleBot: 'rgba(255, 255, 255, 0.04)',
    textPrimary: '#ededed',
    textSecondary: '#a0a0a5',
    textMuted: '#8b8b92',
    accent: '#cdba96',
    textOnAccent: '#0a0a0c',
    statusUp: '#69db7c',
    statusDown: '#ff6b6b',
    statusInfo: '#4dabf7',
    statusWarn: '#ffd43b',
    modalBg: '#121212'
  },
  light: {
    bg: '#f5f2ea',
    surface: '#fffdf8',
    panel: 'rgba(255, 251, 244, 0.92)',
    bubbleBot: 'rgba(159, 123, 61, 0.08)',
    textPrimary: '#2c2519',
    textSecondary: '#645a49',
    textMuted: '#756a57',
    accent: '#7f612f',
    textOnAccent: '#fff9ef',
    statusUp: '#267645',
    statusDown: '#bf4a4a',
    statusInfo: '#2f6fb2',
    statusWarn: '#8a661f',
    modalBg: '#fffbf3'
  }
};

const cases = [
  { id: 'text-primary/bg', fg: 'textPrimary', bg: 'bg', min: 4.5 },
  { id: 'text-secondary/bg', fg: 'textSecondary', bg: 'bg', min: 4.5 },
  { id: 'text-muted/bg', fg: 'textMuted', bg: 'bg', min: 4.5 },
  { id: 'text-secondary/surface', fg: 'textSecondary', bg: 'surface', min: 4.5 },
  { id: 'text-secondary/panel', fg: 'textSecondary', bg: 'panel', min: 4.5, alphaBgOver: 'bg' },
  { id: 'text-primary/bubble-bot', fg: 'textPrimary', bg: 'bubbleBot', min: 4.5, alphaBgOver: 'bg' },
  { id: 'text-on-accent/accent', fg: 'textOnAccent', bg: 'accent', min: 4.5 },
  { id: 'status-up/modal-bg', fg: 'statusUp', bg: 'modalBg', min: 4.5 },
  { id: 'status-down/modal-bg', fg: 'statusDown', bg: 'modalBg', min: 4.5 },
  { id: 'status-info/modal-bg', fg: 'statusInfo', bg: 'modalBg', min: 4.5 },
  { id: 'status-warn/modal-bg', fg: 'statusWarn', bg: 'modalBg', min: 4.5 }
];

function parseColor(value) {
  const src = String(value || '').trim();
  if (src.startsWith('#')) return parseHex(src);
  const match = src.match(/rgba?\(([^)]+)\)/i);
  if (!match) throw new Error(`Unsupported color format: ${src}`);
  const parts = match[1].split(',').map((part) => part.trim());
  return {
    r: Number(parts[0]),
    g: Number(parts[1]),
    b: Number(parts[2]),
    a: parts[3] !== undefined ? Number(parts[3]) : 1
  };
}

function parseHex(hex) {
  const safe = hex.replace('#', '');
  const full = safe.length === 3
    ? safe.split('').map((ch) => `${ch}${ch}`).join('')
    : safe;
  const n = Number.parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
    a: 1
  };
}

function blend(fg, bg) {
  const alpha = fg.a;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1
  };
}

function relativeLuminance(color) {
  const toLinear = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

let failures = 0;

for (const [themeName, palette] of Object.entries(themes)) {
  console.log(`\n[${themeName}]`);
  for (const item of cases) {
    const fg = parseColor(palette[item.fg]);
    let bg = parseColor(palette[item.bg]);
    if (item.alphaBgOver) {
      bg = blend(bg, parseColor(palette[item.alphaBgOver]));
    }
    const ratio = contrastRatio(fg, bg);
    const ok = ratio >= item.min;
    if (!ok) failures += 1;
    const verdict = ok ? 'PASS' : 'FAIL';
    console.log(`${verdict.padEnd(4)} ${item.id.padEnd(30)} ${ratio.toFixed(2)} (min ${item.min})`);
  }
}

if (failures > 0) {
  console.error(`\nContrast check failed: ${failures} case(s) below threshold.`);
  process.exit(1);
}

console.log('\nContrast check passed.');

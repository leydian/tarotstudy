import type { SpreadDrawResult } from '../types';

function sanitizeFilename(text: string) {
  return String(text || 'reading')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function toPlainText(draw: SpreadDrawResult, modeLabel: string) {
  const lines: string[] = [];
  lines.push(`[${modeLabel}] ${draw.spreadName}`);
  lines.push(`질문: ${draw.context || '-'}`);
  lines.push(`리딩시각: ${draw.drawnAt}`);
  lines.push('');
  lines.push('요약');
  lines.push(draw.summary || '-');
  lines.push('');
  lines.push('카드별 해석');
  draw.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.position.name} - ${item.card.nameKo} (${item.orientation === 'reversed' ? '역방향' : '정방향'})`);
    lines.push(`   핵심: ${item.coreMessage || '-'}`);
    lines.push(`   해석: ${item.interpretation || '-'}`);
    lines.push(`   학습: ${item.learningPoint || '-'}`);
  });
  return lines.join('\n');
}

export function exportReadingTxt(draw: SpreadDrawResult, modeLabel: string) {
  if (typeof window === 'undefined') return;
  const content = toPlainText(draw, modeLabel);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(`${draw.spreadName}_${draw.drawnAt}`)}.txt`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function exportReadingPdf(draw: SpreadDrawResult, modeLabel: string) {
  if (typeof window === 'undefined') return;
  const plain = toPlainText(draw, modeLabel)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) {
    window.alert('팝업이 차단되어 PDF 내보내기를 열 수 없습니다.');
    return;
  }
  popup.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${draw.spreadName} 리딩 내보내기</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; line-height: 1.6; }
          pre { white-space: pre-wrap; word-break: keep-all; font-size: 13px; }
          h1 { font-size: 20px; margin: 0 0 12px; }
          @media print { body { margin: 12mm; } }
        </style>
      </head>
      <body>
        <h1>${draw.spreadName} (${modeLabel})</h1>
        <pre>${plain}</pre>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}


import type { SpreadDrawResult } from '../types';
import { toCanonicalChecklist, toCanonicalExportSummaryLines, toDisplayLine } from './tone-render';

function sanitizeFilename(text: string) {
  return String(text || 'reading')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function compact(text: string) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function buildActionChecklist(draw: SpreadDrawResult) {
  const canonical = toCanonicalChecklist(draw).filter(Boolean);
  if (canonical.length >= 3) {
    return canonical.map((line) => toDisplayLine(line, 'detail')).slice(0, 3);
  }
  const source = compact(draw.summary);
  const sentence = source.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  const action = sentence.find((line) => /실행|행동|기록|정리|점검/.test(line)) || '실행 항목 1개를 정하고 결과를 기록합니다.';
  const caution = sentence.find((line) => /주의|리스크|소모|과속|지연|불안|피해야/.test(line)) || '과속하지 않고 기준 1개를 먼저 고정합니다.';
  const metric = sentence.find((line) => /점수|완료율|지표|기록/.test(line)) || '완료율(%) 또는 10점 체감 점수 1개를 남깁니다.';
  return [action, caution, metric];
}

function toPlainText(draw: SpreadDrawResult, modeLabel: string) {
  const summaryLines = toCanonicalExportSummaryLines(draw).map((line) => toDisplayLine(line, 'detail'));
  const lines: string[] = [];
  lines.push(`[${modeLabel}] ${draw.spreadName}`);
  lines.push(`질문: ${draw.context || '-'}`);
  lines.push(`리딩시각: ${draw.drawnAt}`);
  lines.push('');
  lines.push('대화 요약');
  lines.push(summaryLines.join('\n') || compact(draw.summary) || '-');
  lines.push('');
  lines.push('실행 체크리스트');
  buildActionChecklist(draw).forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item}`);
  });
  lines.push('');
  lines.push('카드별 해석');
  draw.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.position.name} - ${item.card.nameKo} (${item.orientation === 'reversed' ? '역방향' : '정방향'})`);
    lines.push(`   핵심: ${toDisplayLine(item.coreMessage || '-', 'detail') || '-'}`);
    lines.push(`   해석: ${toDisplayLine(item.interpretation || '-', 'detail') || '-'}`);
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
  const summaryLines = toCanonicalExportSummaryLines(draw).map((line) => toDisplayLine(line, 'detail'));
  const checklist = buildActionChecklist(draw);
  const cardsHtml = draw.items.map((item, idx) => `
      <section class="card-item">
        <h3>${idx + 1}. ${item.position.name} - ${item.card.nameKo} (${item.orientation === 'reversed' ? '역방향' : '정방향'})</h3>
        <p><strong>핵심</strong> ${toDisplayLine(item.coreMessage || '-', 'detail') || '-'}</p>
        <p><strong>해석</strong> ${toDisplayLine(item.interpretation || '-', 'detail') || '-'}</p>
        <p><strong>학습</strong> ${item.learningPoint || '-'}</p>
      </section>
    `).join('');
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
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; line-height: 1.6; color: #111827; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          h2 { font-size: 15px; margin: 16px 0 6px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
          h3 { font-size: 14px; margin: 0 0 6px; }
          .meta { font-size: 12px; color: #374151; display: grid; gap: 3px; }
          .summary { border: 1px solid #dbeafe; background: #f8fbff; border-radius: 8px; padding: 10px; white-space: pre-wrap; }
          .checklist { margin: 0; padding-left: 18px; }
          .card-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; margin-bottom: 8px; break-inside: avoid; }
          .card-item p { margin: 4px 0; }
          @media print { body { margin: 12mm; } }
        </style>
      </head>
      <body>
        <h1>${draw.spreadName} (${modeLabel})</h1>
        <div class="meta">
          <div><strong>질문</strong> ${draw.context || '-'}</div>
          <div><strong>리딩시각</strong> ${draw.drawnAt}</div>
        </div>
        <h2>대화 요약</h2>
        <div class="summary">${summaryLines.join('\n') || compact(draw.summary) || '-'}</div>
        <h2>실행 체크리스트</h2>
        <ol class="checklist">
          <li>${checklist[0]}</li>
          <li>${checklist[1]}</li>
          <li>${checklist[2]}</li>
        </ol>
        <h2>카드 근거</h2>
        ${cardsHtml}
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

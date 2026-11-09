/**
 * Portable visual report for every Challenge exercise (PNG and multipage PDF).
 * Pure canvas rendering: no external runtime dependency and no user-data mutation.
 * Score inputs are display-only snapshots provided by the game engine.
 */
export type ChallengeExportMetric = { label: string; value: string };
export type ChallengeExportPlayer = {
  name: string;
  score: number;
  accuracy: number;
  darts: number;
  bestStreak: number;
  avgVisit: number;
  metrics: ChallengeExportMetric[];
  visits: number[];
};
export type ChallengeExportReport = {
  title: string;
  rounds: number;
  unit: string;
  highlight: ChallengeExportMetric[];
  players: ChallengeExportPlayer[];
  date: string;
};

type ExportFormat = 'pdf' | 'png' | 'share';

const WIDTH = 1200;
const MARGIN = 46;
const CONTENT = WIDTH - MARGIN * 2;
const TEXT = '#edf4ff';
const MUTED = '#a6b6c6';
const BORDER = '#324258';
const RED = '#ff5a69';

function label(value: unknown, length = 44): string {
  const v = String(value ?? '').replace(/\s+/g, ' ').trim();
  return v.length > length ? v.slice(0, length - 1) + '…' : v;
}

function rectangle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number,
  fill: string, stroke = '', radius = 16,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.max(0, radius));
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function txt(ctx: CanvasRenderingContext2D, value: unknown, x: number, y: number,
  size = 25, color = TEXT, weight = 700, align: CanvasTextAlign = 'left', maxWidth = 0) {
  ctx.fillStyle = color;
  ctx.font = String(weight) + ' ' + String(size) + 'px system-ui,Arial,sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const stringValue = String(value ?? '');
  if (maxWidth > 0) ctx.fillText(stringValue, x, y, maxWidth);
  else ctx.fillText(stringValue, x, y);
  ctx.textAlign = 'left';
}

function metricBox(ctx: CanvasRenderingContext2D, x: number, y: number,
  width: number, height: number, metric: ChallengeExportMetric, color = RED) {
  rectangle(ctx, x, y, width, height, '#0d1825', BORDER, 13);
  txt(ctx, label(metric.label.toUpperCase(), 28), x + 17, y + 24, 16, MUTED, 800, 'left', width - 34);
  txt(ctx, label(metric.value, 30), x + 17, y + height - 25, 31, color, 900, 'left', width - 34);
}

function chartRows(player: ChallengeExportPlayer): number {
  return Math.max(1, Math.ceil((player.visits?.length || 0) / 12));
}

function contentHeight(report: ChallengeExportReport) {
  const rows = report.players.length;
  const summaryRows = report.highlight.length ? Math.ceil(report.highlight.length / 4) : 0;
  return Math.max(1080,
    510 + summaryRows * 104 + 80 + rows * 71 + 50 +
    report.players.reduce((sum, p) => sum + 176 + chartRows(p) * 142 + 26, 0) + 92);
}

function renderChart(ctx: CanvasRenderingContext2D, x: number, y: number,
  player: ChallengeExportPlayer) {
  const values = player.visits || [];
  const rows = chartRows(player);
  const colWidth = CONTENT / 12;
  for (let row = 0; row < rows; row++) {
    const slice = values.slice(row * 12, (row + 1) * 12);
    const max = Math.max(1, ...slice.map(v => Number(v) || 0));
    const baseline = y + row * 142 + 116;
    ctx.strokeStyle = '#2c4052';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, baseline);
    ctx.lineTo(x + CONTENT - 8, baseline);
    ctx.stroke();
    if (!slice.length) {
      txt(ctx, 'Aucune volée détaillée disponible', x + 18, baseline - 43, 21, MUTED, 600);
      continue;
    }
    slice.forEach((v, index) => {
      const points = Math.max(0, Number(v) || 0);
      const barHeight = points ? Math.max(7, Math.round(points / max * 75)) : 0;
      const bx = x + index * colWidth + 17;
      if (barHeight) {
        const grad = ctx.createLinearGradient(bx, baseline - barHeight, bx, baseline);
        grad.addColorStop(0, '#ff777d');
        grad.addColorStop(1, '#b52c45');
        rectangle(ctx, bx, baseline - barHeight, colWidth - 31, barHeight, grad, '', 5);
      }
      txt(ctx, points, bx + (colWidth - 31) / 2, baseline - barHeight - 14, 17,
        TEXT, 850, 'center');
      txt(ctx, 'V' + String(row * 12 + index + 1),
        bx + (colWidth - 31) / 2, baseline + 17, 14, MUTED, 700, 'center');
    });
  }
  return rows * 142;
}

async function buildCanvas(report: ChallengeExportReport): Promise<HTMLCanvasElement> {
  const height = contentHeight(report);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Export visuel indisponible sur cet appareil.');
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#070d18');
  bg.addColorStop(1, '#03060d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, height);

  rectangle(ctx, MARGIN, 40, CONTENT, 145, '#17101d', '#a63446', 21);
  txt(ctx, 'MULTISPORTS SCORING', MARGIN + 26, 80, 27, RED, 900);
  txt(ctx, label(report.title.toUpperCase(), 48), MARGIN + 26, 127, 38, TEXT, 950, 'left', CONTENT - 52);
  txt(ctx, report.date + '  •  ' + report.rounds + ' ' + report.unit,
    MARGIN + 26, 159, 19, MUTED, 700, 'left', CONTENT - 52);

  const winner = report.players[0];
  const leadName = label(winner?.name || 'Joueur', 37);
  rectangle(ctx, MARGIN, 208, CONTENT, 175, '#101a29', BORDER, 20);
  ctx.beginPath();
  ctx.arc(MARGIN + 100, 295, 58, 0, Math.PI * 2);
  ctx.fillStyle = '#5e3439';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = RED;
  ctx.stroke();
  txt(ctx, label(leadName, 2).toUpperCase(), MARGIN + 100, 298, 44, '#fff', 900, 'center');
  txt(ctx, report.players.length > 1 ? 'VAINQUEUR' : 'RÉSULTAT', MARGIN + 188, 252, 18, MUTED, 850);
  txt(ctx, leadName.toUpperCase(), MARGIN + 188, 298, 35, TEXT, 950, 'left', 520);
  txt(ctx, String(winner?.score ?? 0) + ' PTS',
    MARGIN + CONTENT - 27, 301, 48, RED, 950, 'right', 340);

  let y = 409;
  if (report.highlight.length) {
    const cols = 4, gap = 13;
    const width = (CONTENT - (cols - 1) * gap) / cols;
    for (let i = 0; i < report.highlight.length; i++) {
      metricBox(ctx, MARGIN + (i % cols) * (width + gap),
        y + Math.floor(i / cols) * 104, width, 88,
        report.highlight[i], '#ff7d87');
    }
    y += Math.ceil(report.highlight.length / cols) * 104;
  }

  y += 29;
  txt(ctx, 'CLASSEMENT FINAL', MARGIN, y, 28, RED, 950);
  y += 34;
  for (let i = 0; i < report.players.length; i++) {
    const p = report.players[i];
    rectangle(ctx, MARGIN, y, CONTENT, 63, i === 0 ? '#24151d' : '#0e1621',
      i === 0 ? '#9e3e51' : BORDER, 11);
    txt(ctx, String(i + 1) + '.', MARGIN + 17, y + 31, 28, i === 0 ? RED : TEXT, 900);
    txt(ctx, label(p.name.toUpperCase(), 30), MARGIN + 70, y + 31, 24, TEXT, 850, 'left', 570);
    txt(ctx, String(p.score) + ' PTS', MARGIN + CONTENT - 21, y + 31, 28,
      i === 0 ? RED : '#e6efff', 950, 'right');
    y += 71;
  }

  y += 48;
  txt(ctx, 'STATISTIQUES PAR JOUEUR', MARGIN, y, 29, RED, 950);
  y += 36;
  const colGap = 13;
  for (const player of report.players) {
    const chartsHeight = chartRows(player) * 142;
    const sectionHeight = 176 + chartsHeight + 26;
    rectangle(ctx, MARGIN, y, CONTENT, sectionHeight, '#091321', BORDER, 17);
    txt(ctx, label(player.name.toUpperCase(), 33), MARGIN + 23, y + 35,
      27, TEXT, 950, 'left', 750);
    txt(ctx, String(player.score) + ' PTS',
      MARGIN + CONTENT - 23, y + 35, 31, RED, 950, 'right');
    const tiles: ChallengeExportMetric[] = [
      { label: 'RÉUSSITE', value: (Number(player.accuracy) || 0).toFixed(1) + '%' },
      { label: 'FLÉCHETTES', value: String(player.darts || 0) },
      { label: 'SUITE', value: String(player.bestStreak || 0) },
      { label: 'MOY. / VOLÉE', value: (Number(player.avgVisit) || 0).toFixed(1) },
    ];
    const width = (CONTENT - 46 - colGap * 3) / 4;
    tiles.forEach((m, i) => metricBox(ctx,
      MARGIN + 23 + i * (width + colGap), y + 61, width, 74, m, '#f3f7ff'));
    txt(ctx, 'POINTS PAR VOLÉE', MARGIN + 23, y + 160, 18, MUTED, 850);
    renderChart(ctx, MARGIN + 1, y + 182, player);
    y += sectionHeight + 20;

    if (player.metrics.length) {
      const metricsCols = 4;
      const countRows = Math.ceil(player.metrics.length / metricsCols);
      const boxHeight = countRows * 88 + 30;
      rectangle(ctx, MARGIN, y, CONTENT, boxHeight, '#101723', BORDER, 14);
      const metricWidth = (CONTENT - 42 - 3 * 12) / 4;
      player.metrics.forEach((metric, i) => {
        metricBox(ctx, MARGIN + 21 + (i % 4) * (metricWidth + 12),
          y + 16 + Math.floor(i / 4) * 88, metricWidth, 73, metric, '#ffb9bf');
      });
      y += boxHeight + 20;
    }
  }
  txt(ctx, 'Résultats MULTISPORTS SCORING • Document partageable',
    MARGIN + CONTENT / 2, height - 35, 18, MUTED, 750, 'center');
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('Impossible de créer le fichier.')),
      type, quality);
  });
}

function pdfFromCanvas(canvas: HTMLCanvasElement): Blob {
  // PDF 1.4: each A4 page embeds one JPEG slice, preserving the visual report.
  // Binary streams are length-delimited so international names render as pixels.
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let size = 0;
  const append = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    size += bytes.byteLength;
  };
  const begin = (id: number) => {
    offsets[id] = size;
    append(String(id) + ' 0 obj\n');
  };
  const end = () => append('\nendobj\n');
  const pageWidth = 595, pageHeight = 842, margin = 22;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const sliceHeight = Math.max(1, Math.floor(canvas.width * contentHeight / contentWidth));
  const pageCount = Math.ceil(canvas.height / sliceHeight);
  const pages = Array.from({ length: pageCount }, (_, i) => 3 + i * 3);
  append('%PDF-1.4\n%MSS VISUAL REPORT\n');
  begin(1);
  append('<< /Type /Catalog /Pages 2 0 R >>');
  end();
  begin(2);
  append('<< /Type /Pages /Kids [' + pages.map(id => String(id) + ' 0 R').join(' ') +
    '] /Count ' + pageCount + ' >>');
  end();
  for (let i = 0; i < pageCount; i++) {
    const h = Math.min(sliceHeight, canvas.height - i * sliceHeight);
    const segment = document.createElement('canvas');
    segment.width = canvas.width;
    segment.height = h;
    const segmentCtx = segment.getContext('2d');
    if (!segmentCtx) throw new Error('Création PDF indisponible.');
    segmentCtx.drawImage(canvas, 0, i * sliceHeight, canvas.width, h, 0, 0, canvas.width, h);
    const jpeg = atob(segment.toDataURL('image/jpeg', 0.90).split(',')[1]);
    const bytes = new Uint8Array(jpeg.length);
    for (let j = 0; j < jpeg.length; j++) bytes[j] = jpeg.charCodeAt(j);
    const pageId = pages[i], streamId = pageId + 1, imageId = pageId + 2;
    const drawHeight = contentWidth * h / canvas.width;
    const drawY = pageHeight - margin - drawHeight;
    const stream = 'q ' + contentWidth + ' 0 0 ' + drawHeight + ' ' + margin +
      ' ' + drawY + ' cm /Im0 Do Q\n';
    begin(pageId);
    append('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources ' +
      '<< /XObject << /Im0 ' + imageId + ' 0 R >> >> /Contents ' + streamId + ' 0 R >>');
    end();
    begin(streamId);
    append('<< /Length ' + enc.encode(stream).length + ' >>\nstream\n');
    append(stream);
    append('endstream');
    end();
    begin(imageId);
    append('<< /Type /XObject /Subtype /Image /Width ' + canvas.width +
      ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 ' +
      '/Filter /DCTDecode /Length ' + bytes.length + ' >>\nstream\n');
    append(bytes);
    append('\nendstream');
    end();
  }
  const xref = size;
  const objectCount = 3 + pageCount * 3;
  append('xref\n0 ' + objectCount + '\n0000000000 65535 f \n');
  for (let i = 1; i < objectCount; i++) {
    append(String(offsets[i] || 0).padStart(10, '0') + ' 00000 n \n');
  }
  append('trailer\n<< /Size ' + objectCount + ' /Root 1 0 R >>\nstartxref\n' +
    xref + '\n%%EOF\n');
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

export async function exportChallengeResults(report: ChallengeExportReport,
  format: ExportFormat): Promise<'downloaded' | 'shared' | 'cancelled'> {
  const canvas = await buildCanvas(report);
  const actualFormat = format === 'share' ? 'png' : format;
  const blob = actualFormat === 'pdf' ? pdfFromCanvas(canvas) : await toBlob(canvas, 'image/png');
  const slug = report.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'challenge';
  const name = 'MSS_' + slug + '_' + new Date().toISOString().slice(0, 10) +
    '.' + actualFormat;
  if (format === 'share' && typeof navigator.share === 'function') {
    const file = new File([blob], name, { type: blob.type });
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: report.title,
          text: 'Résultats MULTISPORTS SCORING',
        });
        return 'shared';
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return 'cancelled';
    }
  }
  saveFile(blob, name);
  return 'downloaded';
}

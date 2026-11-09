/**
 * Portable visual report for every Challenge exercise (PNG and multipage PDF).
 * Pure canvas rendering: no external runtime dependency and no user-data mutation.
 * Score inputs are display-only snapshots provided by the game engine.
 */
export type ChallengeExportMetric = { label: string; value: string };
export type ChallengeExportPlayer = {
  name: string;
  score: number;
  accuracy: number | null;
  darts: number | null;
  bestStreak: number | null;
  avgVisit: number | null;
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

export type ExportFormat = 'pdf' | 'png' | 'share';
export type ChallengeExportResult = {
 status: 'shared' | 'downloaded' | 'cancelled' | 'preview';
 fileName: string;
 previewUrl?: string;
};

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
  fill: string | CanvasGradient, stroke = '', radius = 16,
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
  // Include player-specific exercise cards; PDF and PNG must never crop the last row.
  return Math.max(1080,
    409 + summaryRows * 104 + 29 + 34 + rows * 71 + 48 + 36 +
    report.players.reduce((sum, p) => {
      const exerciseCards = p.metrics.length
        ? Math.ceil(p.metrics.length / 4) * 88 + 30 + 40 : 0;
      return sum + 176 + chartRows(p) * 142 + 26 + 20 + exerciseCards;
    }, 0) + 80);
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

function buildCanvas(report: ChallengeExportReport): HTMLCanvasElement {
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
  txt(ctx, leadName.slice(0, 2).toUpperCase(), MARGIN + 100, 298, 44, '#fff', 900, 'center');
  txt(ctx, report.players.length > 1 ? 'VAINQUEUR' : 'RÉSULTAT', MARGIN + 188, 252, 18, MUTED, 850);
  txt(ctx, leadName.toUpperCase(), MARGIN + 188, 298, 35, TEXT, 950, 'left', 520);
  txt(ctx, (winner&&Number.isFinite(winner.score)?String(winner.score)+' PTS':'SCORE —'),
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
    txt(ctx, Number.isFinite(p.score)?String(p.score)+' PTS':'SCORE —', MARGIN + CONTENT - 21, y + 31, 28,
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
    txt(ctx, Number.isFinite(player.score)?String(player.score)+' PTS':'SCORE —',
      MARGIN + CONTENT - 23, y + 35, 31, RED, 950, 'right');
    const tiles: ChallengeExportMetric[] = [
      { label: 'RÉUSSITE', value: player.accuracy === null ? '—' : player.accuracy.toFixed(1) + '%' },
      { label: 'FLÉCHETTES', value: player.darts === null ? '—' : String(player.darts) },
      { label: 'SUITE', value: player.bestStreak === null ? '—' : String(player.bestStreak) },
      { label: 'MOY. / VOLÉE', value: player.avgVisit === null ? '—' : player.avgVisit.toFixed(1) },
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

function pngFromCanvas(canvas: HTMLCanvasElement): Blob {
 // Synchronous data URL ensures navigator.share() is invoked while the
 // user's original tap still has transient activation (Android WebView).
 const encoded = canvas.toDataURL('image/png').split(',')[1];
 if (!encoded) throw new Error("L'image n'a pas pu être générée.");
 const decoded = atob(encoded);
 const bytes = new Uint8Array(decoded.length);
 for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
 return new Blob([bytes], {type:'image/png'});
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

/**
 * Native share sheet is the default for Android/iOS (including PDF and PNG).
 * On embedded browsers that cannot share files, never auto-navigate to blob:
 * the caller gets an in-app report preview instead of about:blank.
 */
export async function exportChallengeResults(report: ChallengeExportReport,
  format: ExportFormat): Promise<ChallengeExportResult> {
  const canvas = buildCanvas(report);
  const actualFormat = format === 'share' ? 'png' : format;
  const blob = actualFormat === 'pdf' ? pdfFromCanvas(canvas) : pngFromCanvas(canvas);
  const slug = report.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'challenge';
  const name = 'MSS_' + slug + '_' + new Date().toISOString().slice(0, 10) +
    '.' + actualFormat;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator;
  let canShareFiles = false;
  try {
    canShareFiles = typeof nav.share === 'function' &&
      (typeof nav.canShare !== 'function' || nav.canShare({files:[file]}));
  } catch {}

  if (canShareFiles && (mobile || format === 'share')) {
    try {
      // Crucial: no awaited promise occurs before calling share().
      // PNG/PDF rendering and Blob creation above are synchronous.
      await nav.share({
        title: report.title,
        text: 'Résultats MULTISPORTS SCORING',
        files: [file],
      });
      return {status:'shared',fileName:name};
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return {status:'cancelled',fileName:name};
      console.warn('[challenge-export] native file share unavailable',error);
    }
  }

  if (mobile) {
    // ChatGPT / embedded WebViews may turn anchor(blob:) into about:blank.
    // Instead show an actual inline image, which can be long-pressed / saved.
    return {status:'preview',fileName:name,previewUrl:canvas.toDataURL('image/png')};
  }

  saveFile(blob,name);
  return {status:'downloaded',fileName:name};
}

/** For an explicit second click from the in-app preview (eg. opened in Chrome). */
export function downloadChallengeFile(report:ChallengeExportReport,format:'pdf'|'png'):void {
 const canvas=buildCanvas(report);
 const blob=format==='pdf'?pdfFromCanvas(canvas):pngFromCanvas(canvas);
 const slug=report.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'challenge';
 const name='MSS_'+slug+'_'+new Date().toISOString().slice(0,10)+'.'+format;
 saveFile(blob,name);
}

/** Reuses the exact historical Challenge per-player score and exercise stats. */
export function challengeReportFromHistory(entry:any):ChallengeExportReport {
 const payload=entry?.payload || entry?.decoded || {};
 const summary=entry?.summary || payload?.summary || {};
 const cfg=payload?.config || entry?.resume?.config || summary?.config || {};
 const candidates=[
  summary?.perPlayer,payload?.summary?.perPlayer,
  payload?.stats?.players,summary?.rankings,
  payload?.players,entry?.players,
 ];
 const source=candidates.find(v=>Array.isArray(v)&&v.length>0)||[];
 const players:ChallengeExportPlayer[]=source.map((raw:any)=>{
  const row=raw?.stats&&typeof raw.stats==='object'?{...raw.stats,...raw}:raw||{};
  const exercise=row.exerciseStats||row.stats?.exerciseStats||row.special?.exerciseStats||{};
  const darts=Math.max(0,Number(row.darts??row.dartsThrown??0)||0);
  const accuracy=Number(row.successRate??row.accuracy??(darts?Number(row.hitCount||0)/darts*100:0))||0;
  const metrics:ChallengeExportMetric[]=[];
  const push=(name:string,v:unknown)=>{
   if(v!==undefined&&v!==null&&v!=='')metrics.push({label:name,value:String(v)});
  };
  if(Array.isArray(exercise.jdcPhaseScores)){
   exercise.jdcPhaseScores.forEach((v:unknown,i:number)=>push('PHASE '+(i+1),String(v)+' PTS'));
   push('SHANGHAI',exercise.jdcShanghaiCount);
   push('DOUBLES',exercise.jdcDoubleHits);
   push('BULL 50',exercise.jdcBullHits);
  }else{
   push('VOLÉES VALIDÉES',exercise.validatedVisits);
   push('VOLÉES PARFAITES',exercise.perfectVisits);
   push('POINTS BONUS',exercise.doublesBonusScore);
   push('DOUBLES',exercise.doublesRegularHits);
   push('TRIPLETS',exercise.groupingTriplets);
   push('DOUBLETS',exercise.groupingDoublets);
   push('DIVISIONS ÷2',exercise.halfItCuts);
   push('TOP SECTEUR',exercise.topGroupingSector);
  }
  push('BEST VOLÉE',row.bestVisit);
  const rawVisits=row.visitScores??row.stats?.visitScores;
  return {
   name:String(row.name||row.playerName||row.displayName||'Joueur'),
   score:Number(row.score??row.points??0)||0,
   accuracy,darts,
   bestStreak:Number(row.bestStreak||0)||0,
   avgVisit:Number(row.avgVisit||0)||0,
   visits:Array.isArray(rawVisits)?rawVisits.map((x:any)=>Number(x)||0):[],
   metrics:metrics.slice(0,16),
  };
 }).sort((a:ChallengeExportPlayer,b:ChallengeExportPlayer)=>b.score-a.score);
 const rawDate=entry?.finishedAt||entry?.updatedAt||entry?.createdAt||Date.now();
 const date=new Date(rawDate).toLocaleString('fr-FR');
 const first=players[0];
 const highlight:ChallengeExportMetric[]=(first?.metrics||[]).slice(0,4);
 if(!highlight.length&&first)highlight.push({label:'SCORE',value:first.score+' PTS'},{label:'RÉUSSITE',value:first.accuracy.toFixed(1)+'%'});
 return {
  title:String(summary.objective||entry?.game?.objective||summary.title||'CHALLENGE'),
  rounds:Number(summary.visits??cfg.visits??entry?.game?.visits??0)||0,
  unit:['jdc','doubles8'].includes(String(summary.exerciseType||cfg.exerciseType||''))?'volées':'tours',
  players,highlight,date,
 };
}


/**
 * Generic report from a saved history entry for other sports/modes.
 * Missing values are shown as unknown, not as invented scores.
 * Challenge entries use the specialized parser above.
 */
export function visualReportFromHistory(entry:any):ChallengeExportReport {
 const payload=entry?.payload||entry?.decoded||{};
 const summary=entry?.summary||payload?.summary||{};
 const mode=String(entry?.game?.mode||entry?.mode||summary?.mode||entry?.kind||'').toLowerCase();
 if(mode.includes('challenge')||String(summary?.kind||'').toLowerCase()==='challenge'){
  return challengeReportFromHistory(entry);
 }
 const result=summary?.result||payload?.result||{};
 const pools=[
  summary?.rankings,summary?.perPlayer,result?.rankings,result?.players,
  result?.standings,payload?.stats?.players,payload?.summary?.rankings,
  payload?.summary?.perPlayer,payload?.finalPlayers,entry?.players,
 ];
 const rows=pools.find(v=>Array.isArray(v)&&v.length>0)||[];
 const validNumber=(value:any):number|null=>{
  if(value===undefined||value===null||value==='')return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
 };
 const players:ChallengeExportPlayer[]=rows.map((raw:any)=>{
  const row={...(raw?.stats||{}),...(raw||{})};
  const score=validNumber(row.score??row.points??row.total??row.finalScore??row.scoreFinal??row.scoreTotal);
  const darts=validNumber(row.darts??row.dartsThrown);
  const rate=validNumber(row.accuracy??row.successRate??row.hitRate);
  const streak=validNumber(row.bestStreak??row.streak);
  const average=validNumber(row.avgVisit??row.avgPerVisit);
  const extras:ChallengeExportMetric[]=[];
  const add=(title:string,value:any,suffix='')=>{
   if(value===undefined||value===null||value==='')return;
   const v=String(value);
   if(v!=='NaN'&&v!=='undefined')extras.push({label:title,value:v+suffix});
  };
  add('SETS',row.setsWon??row.sets);
  add('LEGS',row.legsWon??row.legs);
  add('AVG3',row.avg3??row.average3Darts);
  add('FINISH',row.highestCheckout??row.highFinish);
  add('BEST VOLÉE',row.bestVisit);
  add('180',row.count180??row.hits180);
  add('MISS',row.misses??row.miss);
  add('RÉUSSITE',rate,rate!==null?'%':'');
  const visits=row.visitScores??row.stats?.visitScores??row.roundScores;
  return {
   name:String(row.name||row.playerName||row.displayName||row.nickname||row.label||'Joueur'),
   score:score===null?Number.NaN:score,
   darts,accuracy:rate,bestStreak:streak,avgVisit:average,
   visits:Array.isArray(visits)?visits.map((v:any)=>Number(v)||0):[],
   metrics:extras,
  };
 });
 const ranked=rows.some((r:any)=>r?.rank!==undefined||r?.finalRank!==undefined);
 if(ranked)players.sort((a,b)=>{
  const rank=(p:ChallengeExportPlayer)=>Number(rows.find((r:any)=>String(r.name||r.playerName||r.displayName||r.nickname||'Joueur')===p.name)?.rank??Number.MAX_SAFE_INTEGER);
  return rank(a)-rank(b);
 });
 const rawDate=entry?.finishedAt||entry?.endedAt||entry?.updatedAt||entry?.createdAt||Date.now();
 const d=new Date(rawDate);
 const highlights:ChallengeExportMetric[]=[];
 const addHighlight=(label:string,value:any)=>{if(value!==null&&value!==undefined&&value!=='')highlights.push({label,value:String(value)})};
 addHighlight('MODE',mode.toUpperCase()||'PARTIE');
 addHighlight('JOUEURS',players.length);
 addHighlight('STATUT',String(entry?.status||summary?.status||'terminée').toUpperCase());
 if(summary?.durationMs)addHighlight('DURÉE (MIN)',(Number(summary.durationMs)/60000).toFixed(1));
 return {
  title:String(summary?.title||summary?.modeLabel||entry?.game?.mode||entry?.kind||'PARTIE'),
  rounds:validNumber(summary?.rounds??entry?.game?.rounds??summary?.visits??0)||0,
  unit:'tours',
  players,highlight:highlights,
  date:Number.isNaN(d.getTime())?'Date inconnue':d.toLocaleString('fr-FR'),
 };
}

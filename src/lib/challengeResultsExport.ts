import { enrichChallengeReport } from './challengeFullReport';
import { zipSync } from 'fflate';

/**
 * Portable visual report for every Challenge exercise (PNG and multipage PDF).
 * Pure canvas rendering: no external runtime dependency and no user-data mutation.
 * Score inputs are display-only snapshots provided by the game engine.
 */
export type ChallengeExportMetric = { label: string; value: string };
export type ChallengeExportSection = {
 title:string; columns:string[]; rows:string[][]; note?:string;
};
export type ChallengeExportPlayer = {
  name: string;
  participantId?: string;
  score: number;
  accuracy: number | null;
  darts: number | null;
  bestStreak: number | null;
  avgVisit: number | null;
  metrics: ChallengeExportMetric[];
  visits: number[];
  avatarUrl?: string | null;
};
export type ChallengeExportReport = {
  title: string;
  rounds: number;
  unit: string;
  highlight: ChallengeExportMetric[];
  players: ChallengeExportPlayer[];
  date: string;
  details?: ChallengeExportSection[];
  configSummary?: ChallengeExportMetric[];
  tickerSrc?: string;
  appLogoSrc?: string;
  footerBrand?: string;
  sportLabel?: string;
};

export type ExportFormat = 'pdf' | 'png' | 'share';
export type ChallengeExportResult = {
 status: 'shared' | 'downloaded' | 'download-started' | 'cancelled' | 'share-unavailable' | 'preview';
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
const APP_LOGO_SRC = '/app-512.png';
const DEFAULT_CHALLENGE_TICKER = '/challenge/ticker_challenge.png';

type PreparedAssets = {
  logo: HTMLImageElement | null;
  ticker: HTMLImageElement | null;
  avatars: Map<string, HTMLImageElement | null>;
};
const EMPTY_ASSETS: PreparedAssets = { logo: null, ticker: null, avatars: new Map() };

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
  size = 25, color: string | CanvasGradient = TEXT, weight = 700, align: CanvasTextAlign = 'left', maxWidth = 0) {
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
  width: number, height: number, metric: ChallengeExportMetric, color: string | CanvasGradient = RED) {
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
  const configRows = report.configSummary?.length ? Math.ceil(report.configSummary.length / 4) : 0;
  return Math.max(1220,
    470 + summaryRows * 104 + (configRows ? 54 + configRows * 104 : 0) +
    42 + 40 + rows * 79 + 54 + 40 +
    report.players.reduce((sum, p) => {
      const exerciseCards = p.metrics.length
        ? Math.ceil(p.metrics.length / 4) * 88 + 30 + 40 : 0;
      return sum + 196 + chartRows(p) * 142 + 28 + 22 + exerciseCards;
    }, 0) + 120);
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

function imageKey(player: ChallengeExportPlayer): string {
  return String(player.participantId || player.name || '').trim().toLowerCase();
}

function resolveAvatarImage(player: ChallengeExportPlayer, assets: PreparedAssets): HTMLImageElement | null {
  return assets.avatars.get(imageKey(player)) || null;
}

function drawCircularAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number,
  player: ChallengeExportPlayer | { name: string }, image: HTMLImageElement | null, borderColor = RED) {
  const r = size / 2;
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, '#ff9c57');
  grad.addColorStop(1, '#5a2033');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (image) {
    const sw = image.naturalWidth || image.width || size;
    const sh = image.naturalHeight || image.height || size;
    const scale = Math.max(size / sw, size / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(image, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);
    txt(ctx, label(String(player.name || '').slice(0, 2).toUpperCase(), 2), x + r, y + r + 2, Math.max(22, size * 0.34), '#fff', 950, 'center');
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x + r, y + r, r - 1.5, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = borderColor;
  ctx.stroke();
}

function drawRoundImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null,
  x: number, y: number, width: number, height: number, radius = 14, overlay = true) {
  rectangle(ctx, x, y, width, height, '#121924', '#49576b', radius);
  if (!image) return;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.clip();
  const sw = image.naturalWidth || image.width || width;
  const sh = image.naturalHeight || image.height || height;
  const scale = Math.max(width / sw, height / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(image, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
  if (overlay) {
    const shade = ctx.createLinearGradient(x, y, x + width, y);
    shade.addColorStop(0, 'rgba(3,7,15,.92)');
    shade.addColorStop(.22, 'rgba(3,7,15,.28)');
    shade.addColorStop(.78, 'rgba(3,7,15,.28)');
    shade.addColorStop(1, 'rgba(3,7,15,.88)');
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, x: number, y: number, size: number) {
  rectangle(ctx, x, y, size, size, 'rgba(8,18,29,.78)', 'rgba(122,150,176,.45)', 18);
  if (image) {
    const pad = 8;
    ctx.drawImage(image, x + pad, y + pad, size - pad * 2, size - pad * 2);
  } else {
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, '#ff5a69');
    grad.addColorStop(.5, '#ffb86d');
    grad.addColorStop(1, '#64dfff');
    txt(ctx, 'MSS', x + size / 2, y + size / 2 + 1, 20, grad, 1000, 'center');
  }
}

function drawArcadeFooter(ctx: CanvasRenderingContext2D, height: number, report: ChallengeExportReport) {
  const brand = String(report.footerBrand || 'MULTISPORTS SCORING');
  const grad = ctx.createLinearGradient(MARGIN, 0, WIDTH - MARGIN, 0);
  grad.addColorStop(0, '#ff536a');
  grad.addColorStop(.34, '#ffbc6b');
  grad.addColorStop(.7, '#67e2ff');
  grad.addColorStop(1, '#7b8bff');
  txt(ctx, brand, WIDTH / 2, height - 38, 25, grad, 1000, 'center');
  txt(ctx, 'Rapport partageable · stats, score et configuration de partie', WIDTH / 2, height - 16, 13, MUTED, 700, 'center');
}

function drawHeader(ctx: CanvasRenderingContext2D, report: ChallengeExportReport, assets: PreparedAssets,
  title: string, subtitle: string, pageLabel?: string) {
  drawRoundImage(ctx, assets.ticker, MARGIN, 34, CONTENT, 138, 21, true);
  const lineGrad = ctx.createLinearGradient(MARGIN, 34, MARGIN + CONTENT, 34);
  lineGrad.addColorStop(0, 'rgba(255,91,109,.75)');
  lineGrad.addColorStop(.5, 'rgba(98,190,255,.32)');
  lineGrad.addColorStop(1, 'rgba(255,91,109,.75)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(MARGIN, 34, CONTENT, 138, 21);
  ctx.stroke();
  txt(ctx, 'MULTISPORTS SCORING', MARGIN + 24, 62, 18, RED, 950);
  txt(ctx, label(title.toUpperCase(), 54), MARGIN + 24, 98, 37, TEXT, 1000, 'left', CONTENT - 180);
  txt(ctx, label(subtitle, 88), MARGIN + 24, 136, 17, '#d4e0ec', 700, 'left', CONTENT - 220);
  drawLogo(ctx, assets.logo, MARGIN + CONTENT - 86, 51, 56);
  if (pageLabel) txt(ctx, pageLabel, MARGIN + CONTENT - 28, 140, 16, '#ff8f9a', 900, 'right');
}

function buildCanvas(report: ChallengeExportReport, assets: PreparedAssets = EMPTY_ASSETS): HTMLCanvasElement {
  const height = Math.max(PDF_SLICE_HEIGHT, contentHeight(report));
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

  const headline = `${report.date}  •  ${report.rounds} ${report.unit}`;
  drawHeader(ctx, report, assets, report.title, headline, 'SCORE GLOBAL');

  const winner = report.players[0];
  const leadName = label(winner?.name || 'Joueur', 37);
  rectangle(ctx, MARGIN, 198, CONTENT, 190, '#101a29', BORDER, 20);
  drawCircularAvatar(ctx, MARGIN + 18, 228, 118, { name: leadName }, winner ? resolveAvatarImage(winner, assets) : null);
  txt(ctx, report.players.length > 1 ? 'VAINQUEUR' : 'RÉSULTAT', MARGIN + 162, 244, 18, MUTED, 850);
  txt(ctx, leadName.toUpperCase(), MARGIN + 162, 286, 36, TEXT, 950, 'left', 480);
  txt(ctx, winner && Number.isFinite(winner.score) ? String(winner.score) + ' PTS' : 'SCORE —',
    MARGIN + CONTENT - 28, 286, 54, RED, 980, 'right', 360);
  const scoreBreakdown = report.players.slice(0, 4).map((player, idx) => `${idx + 1}. ${label(player.name, 12)} · ${Number.isFinite(player.score) ? String(player.score) + ' pts' : '—'}`).join('   •   ');
  txt(ctx, scoreBreakdown || 'Aucun classement disponible', MARGIN + 162, 336, 16, '#d9e7f4', 700, 'left', CONTENT - 220);

  let y = 416;
  if (report.highlight.length) {
    const cols = 4, gap = 13;
    const width = (CONTENT - (cols - 1) * gap) / cols;
    for (let i = 0; i < report.highlight.length; i++) {
      metricBox(ctx, MARGIN + (i % cols) * (width + gap),
        y + Math.floor(i / cols) * 104, width, 88,
        report.highlight[i], '#ff7d87');
    }
    y += Math.ceil(report.highlight.length / cols) * 104 + 10;
  }

  if (report.configSummary?.length) {
    txt(ctx, 'CONFIGURATION DE LA PARTIE', MARGIN, y + 17, 26, RED, 950);
    y += 42;
    const cols = 4, gap = 13;
    const width = (CONTENT - (cols - 1) * gap) / cols;
    for (let i = 0; i < report.configSummary.length; i++) {
      metricBox(ctx, MARGIN + (i % cols) * (width + gap),
        y + Math.floor(i / cols) * 104, width, 88,
        report.configSummary[i], '#c7f1ff');
    }
    y += Math.ceil(report.configSummary.length / cols) * 104 + 14;
  }

  txt(ctx, 'CLASSEMENT FINAL', MARGIN, y + 14, 28, RED, 950);
  y += 42;
  for (let i = 0; i < report.players.length; i++) {
    const p = report.players[i];
    rectangle(ctx, MARGIN, y, CONTENT, 71, i === 0 ? '#24151d' : '#0e1621',
      i === 0 ? '#9e3e51' : BORDER, 11);
    txt(ctx, String(i + 1) + '.', MARGIN + 16, y + 36, 28, i === 0 ? RED : TEXT, 900);
    drawCircularAvatar(ctx, MARGIN + 54, y + 10, 50, p, resolveAvatarImage(p, assets), i === 0 ? RED : '#62beff');
    txt(ctx, label(p.name.toUpperCase(), 30), MARGIN + 117, y + 36, 24, TEXT, 850, 'left', 540);
    txt(ctx, Number.isFinite(p.score) ? String(p.score) + ' PTS' : 'SCORE —', MARGIN + CONTENT - 21, y + 36, 28,
      i === 0 ? RED : '#e6efff', 950, 'right');
    y += 79;
  }

  y += 30;
  txt(ctx, 'STATISTIQUES PAR JOUEUR', MARGIN, y, 29, RED, 950);
  y += 36;
  const colGap = 13;
  for (const player of report.players) {
    const chartsHeight = chartRows(player) * 142;
    const sectionHeight = 196 + chartsHeight + 26;
    rectangle(ctx, MARGIN, y, CONTENT, sectionHeight, '#091321', BORDER, 17);
    drawCircularAvatar(ctx, MARGIN + 20, y + 18, 68, player, resolveAvatarImage(player, assets), '#62beff');
    txt(ctx, label(player.name.toUpperCase(), 33), MARGIN + 104, y + 34,
      27, TEXT, 950, 'left', 630);
    txt(ctx, Number.isFinite(player.score) ? String(player.score) + ' PTS' : 'SCORE —',
      MARGIN + CONTENT - 23, y + 35, 31, RED, 950, 'right');
    const tiles: ChallengeExportMetric[] = [
      { label: 'RÉUSSITE', value: player.accuracy === null ? '—' : player.accuracy.toFixed(1) + '%' },
      { label: 'FLÉCHETTES', value: player.darts === null ? '—' : String(player.darts) },
      { label: 'SUITE', value: player.bestStreak === null ? '—' : String(player.bestStreak) },
      { label: 'MOY. / VOLÉE', value: player.avgVisit === null ? '—' : player.avgVisit.toFixed(1) },
    ];
    const width = (CONTENT - 132 - colGap * 3) / 4;
    tiles.forEach((m, i) => metricBox(ctx,
      MARGIN + 104 + i * (width + colGap), y + 61, width, 74, m, '#f3f7ff'));
    txt(ctx, 'POINTS PAR VOLÉE', MARGIN + 23, y + 170, 18, MUTED, 850);
    renderChart(ctx, MARGIN + 1, y + 190, player);
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
  drawArcadeFooter(ctx, height, report);
  return canvas;
}

async function loadImageMaybe(src: string | null | undefined): Promise<HTMLImageElement | null> {
  const value = String(src || '').trim();
  if (!value) return null;
  return await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = value;
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

async function prepareAssets(report: ChallengeExportReport): Promise<PreparedAssets> {
  const logo = await loadImageMaybe(report.appLogoSrc || APP_LOGO_SRC);
  const ticker = await loadImageMaybe(report.tickerSrc || '');
  const avatars = new Map<string, HTMLImageElement | null>();
  await Promise.all(report.players.map(async (player) => {
    const key = imageKey(player);
    if (!key || avatars.has(key)) return;
    avatars.set(key, await loadImageMaybe(player.avatarUrl || ''));
  }));
  return { logo, ticker, avatars };
}
const PDF_SLICE_HEIGHT=Math.floor(WIDTH*(842-44)/(595-44));
const PAGE_BOTTOM=PDF_SLICE_HEIGHT-106;
const DETAIL_ROW_HEIGHT=48;

function detailedPages(report:ChallengeExportReport, assets: PreparedAssets = EMPTY_ASSETS):HTMLCanvasElement[]{
 const sections=report.details||[];
 if(!sections.length)return [];
 const pages:HTMLCanvasElement[]=[];
 let page:HTMLCanvasElement;
 let ctx:CanvasRenderingContext2D;
 let y=0;
 const startPage=()=>{
  const c=document.createElement('canvas');
  c.width=WIDTH;
  c.height=PDF_SLICE_HEIGHT;
  const context=c.getContext('2d');
  if(!context)throw Error('Canvas indisponible pour le rapport détaillé.');
  page=c;ctx=context;pages.push(c);
  const background=ctx.createLinearGradient(0,0,0,PDF_SLICE_HEIGHT);
  background.addColorStop(0,'#080e19');background.addColorStop(1,'#030711');
  ctx.fillStyle=background;ctx.fillRect(0,0,WIDTH,PDF_SLICE_HEIGHT);
  drawHeader(ctx, report, assets, report.title, 'Rapport complet · '+report.date, 'PAGE '+String(pages.length + 1));
  drawArcadeFooter(ctx, PDF_SLICE_HEIGHT, report);
  y=196;
 };
 const newPageIf=(h:number)=>{
  if(y+h>PAGE_BOTTOM)startPage();
 };
 startPage();
 for(const section of sections){
  const rows=Array.isArray(section.rows)?section.rows:[];
  if(!rows.length)continue;
  let index=0;
  const totalCols=Math.max(1,section.columns.length);
  const title=label(section.title,70);
  while(index<rows.length){
   const titleHeight=section.note?104:76;
   newPageIf(titleHeight+DETAIL_ROW_HEIGHT+DETAIL_ROW_HEIGHT);
   rectangle(ctx,MARGIN,y,CONTENT,49,'#211522','#7d3549',9);
   txt(ctx,title+(index?' · SUITE':''),MARGIN+16,y+25,22,'#ff8892',950,'left',CONTENT-32);
   y+=57;
   if(section.note){
    txt(ctx,label(section.note,110),MARGIN+6,y+12,16,MUTED,650,'left',CONTENT-14);
    y+=42;
   }
   const headerY=y;
   rectangle(ctx,MARGIN,headerY,CONTENT,45,'#172b3b','#344b60',7);
   const weighted=section.columns.map(name=>
    /FLÉCHETTE|SAISIE|OBJECTIF/i.test(name)?2.4:
    /STATISTIQUE|INDICATEUR|PARAMÈTRE|CIBLE/i.test(name)?1.7:1);
   const totalWeight=weighted.reduce((a,b)=>a+b,0);
   const positions:number[]=[];
   let current=MARGIN;
   weighted.forEach(w=>{positions.push(current);current+=CONTENT*w/totalWeight;});
   for(let col=0;col<totalCols;col++){
    const width=CONTENT*weighted[col]/totalWeight;
    txt(ctx,label(section.columns[col]||'',25),positions[col]+9,headerY+23,15,'#c5d9eb',850,'left',Math.max(18,width-15));
   }
   y+=52;
   while(index<rows.length&&y+DETAIL_ROW_HEIGHT<PAGE_BOTTOM){
    const values=rows[index]||[];
    rectangle(ctx,MARGIN,y,CONTENT,DETAIL_ROW_HEIGHT-4,
      index%2?'#0c1724':'#101d2c','#223a50',5);
    for(let col=0;col<totalCols;col++){
     const width=CONTENT*weighted[col]/totalWeight;
     const value=String(values[col]??'—');
     txt(ctx,label(value,160),positions[col]+9,y+21,col===3&&totalCols>=6?15:17,
      col===0?'#ffb5c0':TEXT,col===0?900:700,'left',Math.max(22,width-15));
    }
    index++;y+=DETAIL_ROW_HEIGHT;
   }
   y+=19;
  }
  y+=17;
 }
 return pages;
}

function reportCanvasPages(report:ChallengeExportReport):HTMLCanvasElement[]{
 return [buildCanvas(report),...detailedPages(report)];
}

async function reportCanvasPagesPrepared(report:ChallengeExportReport):Promise<HTMLCanvasElement[]>{
 const assets = await prepareAssets(report);
 return [buildCanvas(report, assets), ...detailedPages(report, assets)];
}

/** Rasterize each printed page separately (1200 x 1698 pixels, A4 aspect).
 * Unlike the former panorama, every output file is a conventional page. */
const A4_PNG_HEIGHT=Math.round(WIDTH*842/595);
function pngPaperPages(canvases:HTMLCanvasElement[]):HTMLCanvasElement[] {
 const out:HTMLCanvasElement[]=[];
 for(const source of canvases){
  for(let offset=0;offset<source.height;offset+=PDF_SLICE_HEIGHT){
   const length=Math.min(PDF_SLICE_HEIGHT,source.height-offset);
   const paper=document.createElement('canvas');
   paper.width=WIDTH;
   paper.height=A4_PNG_HEIGHT;
   const ctx=paper.getContext('2d');
   if(!ctx)throw Error('Impossible de préparer une image A4.');
   ctx.fillStyle='#070d18';ctx.fillRect(0,0,paper.width,paper.height);
   const fit=Math.min(paper.width/source.width,paper.height/PDF_SLICE_HEIGHT);
   const drawWidth=source.width*fit;
   const drawHeight=length*fit;
   ctx.drawImage(source,0,offset,source.width,length,
    (paper.width-drawWidth)/2,0,drawWidth,drawHeight);
   out.push(paper);
  }
 }
 return out;
}
function pngPageFiles(canvases:HTMLCanvasElement[],stem:string):Array<{name:string;bytes:Uint8Array}> {
 return pngPaperPages(canvases).map((page,index)=>({
  name:stem+'_page-'+String(index+1).padStart(2,'0')+'.png',
  bytes:pngBytesFromCanvas(page),
 }));
}
function pngZipFromPages(pages:Array<{name:string;bytes:Uint8Array}>):Uint8Array {
 const items:Record<string,Uint8Array>={};
 pages.forEach(page=>{items[page.name]=page.bytes;});
 // PNG is already compressed; store each complete image without recompression.
 return zipSync(items,{level:0});
}

function pngBytesFromCanvas(canvas: HTMLCanvasElement): Uint8Array {
 // Synchronous data URL ensures navigator.share() is invoked while the
 // user's original tap still has transient activation (Android WebView).
 const encoded = canvas.toDataURL('image/png').split(',')[1];
 if (!encoded) throw new Error("L'image n'a pas pu être générée.");
 const decoded = atob(encoded);
 const bytes = new Uint8Array(decoded.length);
 for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
 return bytes;
}

function pngFromCanvas(canvas: HTMLCanvasElement): Blob {
 return new Blob([pngBytesFromCanvas(canvas)],{type:'image/png'});
}

function pdfBytesFromCanvases(canvases: HTMLCanvasElement[]): Uint8Array {
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
  const sliceHeight = PDF_SLICE_HEIGHT;
  const segments=canvases.flatMap(canvas=>Array.from(
   {length:Math.ceil(canvas.height/sliceHeight)},(_,index)=>({
    canvas,offset:index*sliceHeight,
    h:Math.min(sliceHeight,canvas.height-index*sliceHeight),
   })));
  const pageCount = segments.length;
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
    const {canvas,offset,h}=segments[i];
    const segment = document.createElement('canvas');
    segment.width = canvas.width;
    segment.height = h;
    const segmentCtx = segment.getContext('2d');
    if (!segmentCtx) throw new Error('Création PDF indisponible.');
    segmentCtx.drawImage(canvas, 0, offset, canvas.width, h, 0, 0, canvas.width, h);
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
  const result=new Uint8Array(size);
  let cursor=0;
  for(const part of chunks){result.set(part,cursor);cursor+=part.byteLength;}
  return result;
}

function pdfFromCanvas(canvas:HTMLCanvasElement):Blob {
 return new Blob([pdfBytesFromCanvas(canvas)],{type:'application/pdf'});
}

function pdfBytesFromCanvas(canvas:HTMLCanvasElement):Uint8Array {
 return pdfBytesFromCanvases([canvas]);
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
 * Download without navigating the app:
 * - File System Access picker if supported (desktop);
 * - regular anchor download in Chrome/Safari;
 * - HTTP attachment via same-origin Cloudflare Pages Function in embedded
 *   Android browsers (which often reject blob: downloads).
 * Files are passed to the app's own endpoint for the response only; no storage.
 */
function isEmbeddedAndroid():boolean {
 const agent=navigator.userAgent||'';
 return /Android/i.test(agent)&&(
  /;\s*wv\)|\bwv\b|ChatGPT|FBAN|FBAV|Instagram|Line\//i.test(agent)||
  typeof navigator.share!=='function'
 );
}

function encodeBase64(bytes:Uint8Array):string {
 const batch=24_576; // divisible by 3: each encoded block is valid base64
 const result:string[]=[];
 for(let at=0;at<bytes.length;at+=batch) {
  const part=bytes.subarray(at,Math.min(at+batch,bytes.length));
  let chars='';
  for(let i=0;i<part.length;i++)chars+=String.fromCharCode(part[i]);
  result.push(btoa(chars));
 }
 return result.join('');
}

function beginHttpAttachment(bytes:Uint8Array,name:string,format:'pdf'|'zip'):void {
 // Unlike a blob: link, a real HTTP attachment can be handled by Android's
 // DownloadListener. Keep its frame hidden so unsupported WebViews never open
 // a visible about:blank page. The server retains none of the bytes.
 const id='mss-report-frame-'+Date.now();
 const frame=document.createElement('iframe');
 frame.name=id;
 frame.title='Téléchargement du rapport';
 frame.style.cssText='position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none';
 const form=document.createElement('form');
 form.action='/api/report-download';
 form.method='POST';
 form.enctype='multipart/form-data';
 form.target=id;
 form.style.display='none';
 for(const [key,value] of Object.entries({
  format,
  filename:name,
  data:encodeBase64(bytes)
 })) {
  const field=document.createElement('input');
  field.type='hidden';field.name=key;field.value=value;
  form.appendChild(field);
 }
 document.body.appendChild(frame);
 document.body.appendChild(form);
 form.submit();
 window.setTimeout(()=>{form.remove();frame.remove();},120_000);
}

async function useSavePicker(bytes:Uint8Array,name:string,format:'pdf'|'zip'):Promise<'saved'|'cancelled'|'unsupported'> {
 const browser=window as Window & {
  showSaveFilePicker?:(options:any)=>Promise<{createWritable:()=>Promise<{write:(blob:Blob)=>Promise<void>;close:()=>Promise<void>}>}>;
 };
 if(typeof browser.showSaveFilePicker!=='function')return 'unsupported';
 try {
  const mime=format==='pdf'?'application/pdf':'application/zip';
  const handle=await browser.showSaveFilePicker({
   suggestedName:name,
   types:[{description:format.toUpperCase()+' MULTISPORTS SCORING',accept:{[mime]:['.'+format]}}],
  });
  const writable=await handle.createWritable();
  await writable.write(new Blob([bytes],{type:mime}));
  await writable.close();
  return 'saved';
 }catch(error){
  if((error as Error)?.name==='AbortError')return 'cancelled';
  console.warn('[challenge-export] save picker failed',error);
  return 'unsupported';
 }
}

export async function exportChallengeResults(report:ChallengeExportReport,format:ExportFormat,
 options:{share?:boolean}={}):Promise<ChallengeExportResult> {
 const actualFormat=format==='share'?'png':format;
 const shareRequested=Boolean(options.share||format==='share');
 const slug=report.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'challenge';
 const stem='MSS_'+slug+'_'+new Date().toISOString().slice(0,10);
 const pages=await reportCanvasPagesPrepared(report);
 const picturePages=actualFormat==='png'?pngPageFiles(pages,stem):[];
 const files=actualFormat==='png'
  ?picturePages.map(page=>new File([page.bytes],page.name,{type:'image/png'}))
  :[new File([pdfBytesFromCanvases(pages)],stem+'.pdf',{type:'application/pdf'})];
 // PDF stays a real multipage PDF. PNG pages download as a ZIP of actual PNG files.
 const downloadFormat=actualFormat==='png'?'zip':'pdf';
 const fileName=stem+(downloadFormat==='zip'?'_images_A4.zip':'.pdf');
 if(shareRequested){
  const nav=navigator;
  const canShare=typeof nav.share==='function'&&
    (typeof nav.canShare!=='function'||nav.canShare({files}));
  if(!canShare)return {status:'share-unavailable',fileName};
  try{
   await nav.share({files,title:report.title,text:'Résultats MULTISPORTS SCORING'});
   return {status:'shared',fileName};
  }catch(error){
   if((error as Error)?.name==='AbortError')return {status:'cancelled',fileName};
   console.warn('[challenge-export] native file share failed',error);
   return {status:'share-unavailable',fileName};
  }
 }
 const bytes=downloadFormat==='pdf'?pdfBytesFromCanvases(pages):pngZipFromPages(picturePages);
 const mime=downloadFormat==='pdf'?'application/pdf':'application/zip';
 if(!isEmbeddedAndroid()){
  const picker=await useSavePicker(bytes,fileName,downloadFormat);
  if(picker==='saved')return {status:'downloaded',fileName};
  if(picker==='cancelled')return {status:'cancelled',fileName};
  saveFile(new Blob([bytes],{type:mime}),fileName);
  return {status:'download-started',fileName};
 }
 beginHttpAttachment(bytes,fileName,downloadFormat);
 return {status:'download-started',fileName};
}
/** Manual download from the preview, using identical page-sized assets. */
export function downloadChallengeFile(report:ChallengeExportReport,format:'pdf'|'png'):void {
 const stem='MSS_'+report.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'_'+new Date().toISOString().slice(0,10);
 const pages=reportCanvasPages(report);
 if(format==='pdf'){
  saveFile(new Blob([pdfBytesFromCanvases(pages)],{type:'application/pdf'}),stem+'.pdf');
 }else{
  const entries=pngPageFiles(pages,stem);
  saveFile(new Blob([pngZipFromPages(entries)],{type:'application/zip'}),stem+'_images_A4.zip');
 }
}

function pickAvatarSource(raw:any):string {
 const values=[
  raw?.avatarDataUrl, raw?.avatarUrl, raw?.avatar, raw?.avatarPath,
  raw?.photoDataUrl, raw?.photoUrl, raw?.imageUrl,
  raw?.profile?.avatarDataUrl, raw?.profile?.avatarUrl, raw?.profile?.avatar,
  raw?.profile?.photoUrl, raw?.profile?.photoDataUrl,
  raw?.meta?.avatarDataUrl, raw?.meta?.avatarUrl, raw?.meta?.avatar,
  raw?.user?.avatarDataUrl, raw?.user?.avatarUrl, raw?.user?.avatar,
  raw?.stats?.avatarDataUrl, raw?.stats?.avatarUrl,
 ];
 for(const value of values){
  const src=String(value||'').trim();
  if(src) return src;
 }
 return '';
}

function configMetric(labelText:string, value:any):ChallengeExportMetric | null {
 if(value===undefined||value===null||value==='') return null;
 return { label: labelText, value: String(value) };
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
   participantId:String(row.id||row.pid||row.playerId||''),
   score:Number(row.score??row.points??0)||0,
   accuracy,darts,
   bestStreak:Number(row.bestStreak||0)||0,
   avgVisit:Number(row.avgVisit||0)||0,
   visits:Array.isArray(rawVisits)?rawVisits.map((x:any)=>Number(x)||0):[],
   metrics:metrics.slice(0,16),
   avatarUrl: pickAvatarSource(row),
  };
 }).sort((a:ChallengeExportPlayer,b:ChallengeExportPlayer)=>b.score-a.score);
 const rawDate=entry?.finishedAt||entry?.updatedAt||entry?.createdAt||Date.now();
 const date=new Date(rawDate).toLocaleString('fr-FR');
 const first=players[0];
 const highlight:ChallengeExportMetric[]=(first?.metrics||[]).slice(0,4);
 if(!highlight.length&&first)highlight.push({label:'SCORE',value:first.score+' PTS'},{label:'RÉUSSITE',value:first.accuracy.toFixed(1)+'%'});
 const title = String(summary.objective||entry?.game?.objective||summary.title||'CHALLENGE');
 const exerciseType = String(summary.exerciseType||cfg.exerciseType||'').toLowerCase();
 const configSummary = [
  configMetric('EXERCICE', title),
  configMetric('TYPE', exerciseType ? exerciseType.toUpperCase() : undefined),
  configMetric('CIBLE', cfg.target),
  configMetric('RÈGLE', cfg.rule),
  configMetric('VOLÉES', Number(summary.visits??cfg.visits??entry?.game?.visits??0)||0),
  configMetric('JOUEURS', players.length),
 ].filter(Boolean) as ChallengeExportMetric[];
 return enrichChallengeReport({
  title,
  rounds:Number(summary.visits??cfg.visits??entry?.game?.visits??0)||0,
  unit:['jdc','doubles8'].includes(String(summary.exerciseType||cfg.exerciseType||''))?'volées':'tours',
  players,highlight,date,
  configSummary,
  tickerSrc: DEFAULT_CHALLENGE_TICKER,
  appLogoSrc: APP_LOGO_SRC,
  footerBrand: 'MULTISPORTS SCORING',
  sportLabel: 'DARTS',
 },cfg,payload.entries||payload.events||payload?.state?.entries||payload?.state?.log||entry?.entries,source);
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
   avatarUrl: pickAvatarSource(row),
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
 const genericTitle = String(summary?.title||summary?.modeLabel||entry?.game?.mode||entry?.kind||'PARTIE');
 return {
  title:genericTitle,
  rounds:validNumber(summary?.rounds??entry?.game?.rounds??summary?.visits??0)||0,
  unit:'tours',
  players,highlight:highlights,
  date:Number.isNaN(d.getTime())?'Date inconnue':d.toLocaleString('fr-FR'),
  configSummary:[
   configMetric('MODE', summary?.modeLabel||entry?.game?.mode||entry?.kind),
   configMetric('JOUEURS', players.length),
   configMetric('STATUT', String(entry?.status||summary?.status||'terminée').toUpperCase()),
   summary?.durationMs ? configMetric('DURÉE', (Number(summary.durationMs)/60000).toFixed(1)+' min') : null,
  ].filter(Boolean) as ChallengeExportMetric[],
  appLogoSrc: APP_LOGO_SRC,
  footerBrand: 'MULTISPORTS SCORING',
 };
}

import { enrichChallengeReport } from './challengeFullReport';
import { zipSync } from 'fflate';
import tickerX01 from '../assets/tickers/ticker_x01.png';
import tickerCricket from '../assets/tickers/ticker_cricket.png';
import tickerChallenge from '../assets/tickers/ticker_challenge.png';
import tickerAttrapeMoi from '../assets/tickers/ticker_attrape_moi.png';
import tickerGotcha from '../assets/tickers/ticker_gotcha.png';
import tickerKiller from '../assets/tickers/ticker_killer.png';
import tickerGolf from '../assets/tickers/ticker_golf.png';
import tickerFiveLives from '../assets/tickers/ticker_five_lives.png';
import tickerLoterie from '../assets/tickers/ticker_loterie.png';
import tickerSuperBull from '../assets/tickers/ticker_super_bull.png';
import tickerHalveIt from '../assets/tickers/ticker_halve_it.png';
import tickerBowling from '../assets/tickers/ticker_bowling.png';
import tickerBaseball from '../assets/tickers/ticker_baseball.png';
import tickerPendu from '../assets/tickers/ticker_pendu.png';
import tickerScram from '../assets/tickers/ticker_scram.png';
import tickerPrisoner from '../assets/tickers/ticker_prisoner.png';
import tickerCastle from '../assets/tickers/ticker_castle.png';
import tickerBob27 from '../assets/tickers/ticker_bobs_27.png';
import tickerCrados from '../assets/tickers/ticker_crados.png';
import tickerShanghai from '../assets/tickers/ticker_shanghai.png';
import tickerCountUp from '../assets/tickers/ticker_count_up.png';
import tickerCapital from '../assets/tickers/ticker_capital.png';
import tickerBastard from '../assets/tickers/ticker_bastard.png';
import tickerCargo from '../assets/tickers/ticker_cargo.png';
import tickerDartsPoker from '../assets/tickers/ticker_darts_poker.png';
import tickerDartsRacer from '../assets/tickers/ticker_darts_racer.png';
import tickerDartsFirefighter from '../assets/tickers/ticker_darts_firefighter.png';
import tickerWarfare from '../assets/tickers/ticker_warfare.png';
import tickerPresident from '../assets/tickers/ticker_president.png';
import tickerMenteur from '../assets/tickers/ticker_menteur.png';
import tickerPtit1 from '../assets/tickers/ticker_ptit_1.png';
import tickerOceanControl from '../assets/tickers/ticker_ocean_control.png';
import tickerTicTacToe from '../assets/tickers/ticker_tic_tac_toe.png';
import tickerHareHounds from '../assets/tickers/ticker_hare_hounds.png';
import tickerFootball from '../assets/tickers/ticker_football.png';
import tickerBssKing from '../assets/tickers/ticker_bss_king.webp';
import tickerTop10 from '../assets/tickers/ticker_top_10.webp';
import tickerSauteMoutons from '../assets/tickers/ticker_saute_moutons.webp';
import tickerTroop from '../assets/tickers/ticker_troupeau_en_danger.webp';
import tickerBimBamBoum from '../assets/tickers/ticker_bim_bam_boum_fr.webp';
import tickerLaSuite from '../assets/tickers/ticker_la_suite_fr.webp';
import tickerGreenVsRed from '../assets/tickers/ticker_green_vs_red.webp';
import tickerBlackVsWhite from '../assets/tickers/ticker_black_vs_white_fr.webp';
import tickerColorCall from '../assets/tickers/ticker_color_call_fr.webp';
import tickerThreeColors from '../assets/tickers/ticker_three_colors_fr.webp';
import tickerSplitScore from '../assets/tickers/ticker_split_score_fr.webp';
import tickerChase from '../assets/tickers/ticker_chase_fr.webp';
import tickerRaclette from '../assets/tickers/ticker_une_ptite_raclette_fr.webp';
import tickerNineDart from '../assets/tickers/ticker_nine_dart_century.webp';
import tickerHiScore from '../assets/tickers/ticker_hi_score.webp';
import tickerClosestCenter from '../assets/tickers/ticker_closest_center.webp';
import tickerDoubleDown from '../assets/tickers/ticker_double_down.webp';
import tickerShovePenny from '../assets/tickers/ticker_shove_a_penny.webp';


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
  headlineMetrics?: ChallengeExportMetric[];
  scoreDisplay?: string; // Unit-specific match result; never remaining X01 score
  scoreSecondary?: string;
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
  matchType?: 'x01' | 'generic';
  matchBreakdown?: { headers: string[]; rows: string[][]; note?: string };
};

/** Ready-to-share files created before the share button is tapped.
 * navigator.share() must run during the original user gesture; awaiting image
 * decoding or canvas export first loses transient activation on mobile.
 */
export type ChallengePreparedShare = {
  title: string;
  pdf: File;
  pngPages: File[];
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
  // Keep the approved A4 grid: only enhance its surface treatment.
  const fill = ctx.createLinearGradient(x, y, x + width, y + height);
  fill.addColorStop(0, '#18283b');
  fill.addColorStop(.65, '#101e2e');
  fill.addColorStop(1, '#081521');
  rectangle(ctx, x, y, width, height, fill, BORDER, 13);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 14, 4, Math.max(4, height - 28));
  txt(ctx, label(metric.label.toUpperCase(), 28), x + 17, y + 24, 16, '#adc6dc', 800, 'left', width - 34);
  txt(ctx, label(metric.value, 30), x + 17, y + height - 25, 31, color, 950, 'left', width - 34);
}

function chartRows(player: ChallengeExportPlayer): number {
  return Math.max(1, Math.ceil((player.visits?.length || 0) / 12));
}

// The printable page height is fixed. Cards must never be positioned across a
// PDF page boundary. A long chart is split into complete groups of chart rows.
function renderChart(ctx: CanvasRenderingContext2D, x: number, y: number,
  player: ChallengeExportPlayer, startRow = 0, rowCount = chartRows(player)) {
  const values = player.visits || [];
  const colWidth = CONTENT / 12;
  for (let row = 0; row < rowCount; row++) {
    const absoluteRow = startRow + row;
    const slice = values.slice(absoluteRow * 12, (absoluteRow + 1) * 12);
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
      txt(ctx, 'V' + String(absoluteRow * 12 + index + 1),
        bx + (colWidth - 31) / 2, baseline + 17, 14, MUTED, 700, 'center');
    });
  }
  return rowCount * 142;
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

/**
 * Logical A4 paginator: a page is created before drawing each indivisible
 * section. Previously a huge canvas was sliced every PDF_SLICE_HEIGHT pixels,
 * which split players/metrics halfway and even created an almost empty page.
 * Both PDF and image exports now reuse these exact, ready-to-print pages.
 */
function headlineStatsForPlayer(player: ChallengeExportPlayer): ChallengeExportMetric[] {
  if (player.headlineMetrics?.length) return player.headlineMetrics.slice(0, 4);
  const fromMetrics = player.metrics.filter(metric => metric.value !== '' && metric.value !== '—').slice(0, 4);
  if (fromMetrics.length) return fromMetrics;
  const known: ChallengeExportMetric[] = [];
  if (player.accuracy !== null) known.push({label:'RÉUSSITE',value:player.accuracy.toFixed(1)+'%'});
  if (player.darts !== null) known.push({label:'FLÉCHETTES',value:String(player.darts)});
  if (player.bestStreak !== null) known.push({label:'SUITE',value:String(player.bestStreak)});
  if (player.avgVisit !== null) known.push({label:'MOY. / VOLÉE',value:player.avgVisit.toFixed(1)});
  return known.slice(0, 4);
}


/**
 * X01 DUEL — mirrored column-major statistics, matching the validated X01
 * History comparison: player / stat label / player.  The winning set/leg score
 * comes from the saved X01 counters, never from a remaining 501/301 balance.
 * Shared by PDF and fixed-size PNG exports and does not affect other modes.
 */
type X01DuelRow = { label: string; left: string; right: string; tone: 'higher' | 'lower' | 'neutral' };

function x01DuelRows(report: ChallengeExportReport): X01DuelRow[] {
  const [left, right] = report.players;
  if (!left || !right) return [];
  const norm = (text: unknown) => String(text ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const excluded = /^(RESTANT|REMAINING|SCORE FINAL|SCORE ENREGISTRE|POINTS RESTANTS)$/;
  const all = [left, right].flatMap(player => player.metrics || []);
  const seen = new Set<string>();
  const rows: X01DuelRow[] = [];
  const valueFor = (player: ChallengeExportPlayer, keys: string[]): string => {
    for (const key of keys) {
      const found = player.metrics.find(metric => norm(metric.label) === norm(key));
      if (found && String(found.value).trim() !== '') return String(found.value);
    }
    return '—';
  };
  const register = (title: string, aliases: string[], tone: X01DuelRow['tone'] = 'neutral') => {
    const mapped = aliases.map(norm);
    if (mapped.every(key => seen.has(key))) return;
    const leftValue = valueFor(left, aliases);
    const rightValue = valueFor(right, aliases);
    if (leftValue === '—' && rightValue === '—') return;
    mapped.forEach(key => seen.add(key));
    rows.push({ label:title, left:leftValue, right:rightValue, tone });
  };
  // Preserve X01's existing metric vocabulary and group the main KPIs first.
  const ordered: Array<[string, string[], X01DuelRow['tone']]> = [
    ['SETS GAGNÉS', ['SETS REMPORTÉS','SETS GAGNÉS','SETS'], 'higher'],
    ['LEGS GAGNÉS', ['LEGS REMPORTÉS','LEGS GAGNÉS','LEGS'], 'higher'],
    ['POINTS MARQUÉS', ['PTS MARQUÉS','POINTS MARQUÉS','TOTAL SCORE'], 'neutral'],
    ['AVG3', ['AVG3','AVG3D','MOYENNE 3 FLÉCHETTES'], 'higher'],
    ['MEILLEURE VOLÉE', ['BEST VOLÉE','MEILLEURE VOLÉE','BEST VISIT'], 'higher'],
    ['CHECKOUT MAX', ['CHECKOUT','BEST CHECKOUT','HIGHEST CHECKOUT'], 'higher'],
    ['CHECKOUTS RÉUSSIS', ['CHECKOUT RÉUSSIS','CHECKOUT HITS'], 'higher'],
    ['TENTATIVES CHECKOUT', ['TENTATIVES CHECKOUT','CHECKOUT ATTEMPTS'], 'neutral'],
    ['TAUX CHECKOUT', ['TAUX CHECKOUT','CHECKOUT RATE'], 'higher'],
    ['180', ['180','H180'], 'higher'],
    ['140+', ['140+','H140'], 'higher'],
    ['100+', ['100+','H100'], 'higher'],
    ['60+', ['60+','H60'], 'higher'],
    ['FLÉCHETTES', ['FLÉCHETTES','DARTS'], 'neutral'],
    ['TOURS / VOLÉES', ['TOURS','VISITS'], 'neutral'],
    ['MISS', ['MISS','MISSES'], 'lower'],
    ['BUSTS', ['BUSTS','BUST'], 'lower'],
    ['SIMPLES', ['SIMPLES','SINGLES'], 'neutral'],
    ['DOUBLES', ['DOUBLES'], 'neutral'],
    ['TRIPLES', ['TRIPLES'], 'neutral'],
    ['BULL 25', ['BULL','BULL 25','BULLS'], 'neutral'],
    ['DBULL 50', ['DBULL','DBULL 50','DBULLS'], 'neutral'],
    ['PRÉCISION', ['RÉUSSITE','REUSSITE','PRÉCISION','PRECISION'], 'higher'],
  ];
  for (const [title, aliases, tone] of ordered) register(title, aliases, tone);
  for (const metric of all) {
    const key = norm(metric.label);
    if (!key || seen.has(key) || excluded.test(key)) continue;
    register(metric.label.toUpperCase(), [metric.label]);
  }
  return rows;
}

function drawDuelStatRows(ctx:CanvasRenderingContext2D, y:number,
  rows:X01DuelRow[], report:ChallengeExportReport):number {
  const colLeft = MARGIN + CONTENT*.235;
  const colRight = MARGIN + CONTENT*.765;
  const center = WIDTH/2;
  const rowH = 59;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const top = y + rowIndex*rowH;
    rectangle(ctx, MARGIN, top, CONTENT, rowH-5,
      rowIndex%2 ? '#0d1b2a' : '#122033', BORDER, 8);
    const toNumber = (s:string):number => {
      if (s === '—') return NaN;
      const match = s.replace(',','.').match(/^-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : NaN;
    };
    const lv = toNumber(row.left), rv = toNumber(row.right);
    const unique = row.tone !== 'neutral' && Number.isFinite(lv) && Number.isFinite(rv) && lv !== rv;
    const leftBest = unique && (row.tone === 'higher' ? lv > rv : lv < rv);
    const rightBest = unique && !leftBest;
    // Two symmetrical value zones; central column carries only the stat label.
    const leftColor = leftBest ? '#ffcb70' : '#eaf2ff';
    const rightColor = rightBest ? '#ffcb70' : '#eaf2ff';
    txt(ctx, label(row.left,25), colLeft, top+25, 29, leftColor, 950, 'center', CONTENT*.37);
    txt(ctx, label(row.label,26), center, top+25, 17, '#b8cee4', 900, 'center', CONTENT*.29);
    txt(ctx, label(row.right,25), colRight, top+25, 29, rightColor, 950, 'center', CONTENT*.37);
    const leftLine=ctx.createLinearGradient(MARGIN+12,top,center-165,top);
    leftLine.addColorStop(0,leftBest?'rgba(255,187,80,.9)':'rgba(96,167,212,.65)');
    leftLine.addColorStop(1,'rgba(255,255,255,0)');
    const rightLine=ctx.createLinearGradient(center+165,top,MARGIN+CONTENT-12,top);
    rightLine.addColorStop(0,'rgba(255,255,255,0)');
    rightLine.addColorStop(1,rightBest?'rgba(255,187,80,.9)':'rgba(96,167,212,.65)');
    ctx.fillStyle=leftLine;ctx.fillRect(MARGIN+12,top+rowH-12,CONTENT*.32,2);
    ctx.fillStyle=rightLine;ctx.fillRect(MARGIN+CONTENT*.68,top+rowH-12,CONTENT*.32-12,2);
  }
  return y+rows.length*rowH;
}

function buildX01DuelPages(report:ChallengeExportReport, assets:PreparedAssets=EMPTY_ASSETS):HTMLCanvasElement[] {
  const [left,right] = report.players;
  if (!left || !right) return buildSummaryPages(report,assets);
  const pages:HTMLCanvasElement[]=[];
  let ctx:CanvasRenderingContext2D;
  let y=0;
  const maxY=PAGE_BOTTOM-12;
  const middle=WIDTH/2;
  const leftCenter=MARGIN+CONTENT*.235;
  const rightCenter=MARGIN+CONTENT*.765;
  const metric=(player:ChallengeExportPlayer,labelName:string) =>
    player.metrics.find(m => m.label === labelName)?.value ?? '—';
  const addPage=(continuation=false)=>{
    const c=document.createElement('canvas');
    c.width=WIDTH;c.height=PDF_SLICE_HEIGHT;
    const context=c.getContext('2d');
    if(!context)throw new Error('Impossible de générer la page de duel.');
    ctx=context;pages.push(c);
    const bg=ctx.createLinearGradient(0,0,0,PDF_SLICE_HEIGHT);
    bg.addColorStop(0,'#091422');bg.addColorStop(1,'#030610');
    ctx.fillStyle=bg;ctx.fillRect(0,0,WIDTH,PDF_SLICE_HEIGHT);
    const title=continuation?'STATISTIQUES X01 · FACE À FACE':report.title;
    drawHeader(ctx,report,assets,title,report.date,
      pages.length===1?'DUEL X01':'PAGE '+pages.length);
    drawArcadeFooter(ctx,PDF_SLICE_HEIGHT,report);
    y=207;
    // Keep both players visible on every page, including continuation pages.
    const heroHeight=continuation?142:233;
    rectangle(ctx,MARGIN,y,CONTENT,heroHeight,'#101d2e','#42566d',19);
    ctx.fillStyle='#58c8f0';ctx.fillRect(MARGIN+5,y+14,4,heroHeight-28);
    ctx.fillStyle='#fa6076';ctx.fillRect(MARGIN+CONTENT-9,y+14,4,heroHeight-28);
    if(!continuation){
      drawCircularAvatar(ctx,leftCenter-55,y+15,110,left,resolveAvatarImage(left,assets),'#58c8f0');
      drawCircularAvatar(ctx,rightCenter-55,y+15,110,right,resolveAvatarImage(right,assets),'#fa6076');
    }else{
      drawCircularAvatar(ctx,leftCenter-41,y+11,82,left,resolveAvatarImage(left,assets),'#58c8f0');
      drawCircularAvatar(ctx,rightCenter-41,y+11,82,right,resolveAvatarImage(right,assets),'#fa6076');
    }
    const nY=y+(continuation?112:157);
    txt(ctx,label(left.name.toUpperCase(),24),leftCenter,nY,continuation?24:28,TEXT,950,'center',CONTENT*.4);
    txt(ctx,label(right.name.toUpperCase(),24),rightCenter,nY,continuation?24:28,TEXT,950,'center',CONTENT*.4);
    rectangle(ctx,middle-133,y+(continuation?24:35),266,continuation?87:145,'#241b2a','#855268',17);
    txt(ctx,'SCORE DU MATCH',middle,y+(continuation?47:60),15,'#ffb4bf',950,'center');
    const setLeft=metric(left,'SETS REMPORTÉS'),setRight=metric(right,'SETS REMPORTÉS');
    const legLeft=metric(left,'LEGS REMPORTÉS'),legRight=metric(right,'LEGS REMPORTÉS');
    txt(ctx,`${setLeft}  :  ${setRight}`,middle,y+(continuation?73:101),continuation?31:40,'#ffe2ae',1000,'center');
    txt(ctx,`SETS · LEGS ${legLeft} – ${legRight}`,middle,y+(continuation?98:143),continuation?13:17,'#f0d4de',850,'center');
    if(!continuation){
      txt(ctx,'STATISTIQUES CUMULÉES SUR LE MATCH',middle,y+202,18,'#a7c9de',800,'center');
    }
    y+=heroHeight+19;
  };
  const heading=(name:string)=>{
    // Keep every heading with at least one following comparison row.
    if(y+49+59>maxY)addPage(true);
    txt(ctx,name,MARGIN+6,y+19,25,RED,950);
    y+=45;
  };
  addPage();
  if(report.configSummary?.length){
    // Compact but readable config strip on the very first page.
    const brief=report.configSummary.filter(m=>
      /MODE|DÉPART|ENTRÉE|SORTIE|FORMAT|SETS|LEGS|BO|FT/i.test(m.label)).slice(0,5);
    if(brief.length){
      rectangle(ctx,MARGIN,y,CONTENT,75,'#0d1b29',BORDER,12);
      const column=CONTENT/brief.length;
      brief.forEach((m,i)=>{
        const cx=MARGIN+column*(i+.5);
        txt(ctx,label(m.label.toUpperCase(),22),cx,y+21,15,'#a2bed6',900,'center',column-16);
        txt(ctx,label(m.value,22),cx,y+49,22,'#eaf6ff',950,'center',column-16);
      });
      y+=93;
    }
  }
  heading('COMPARATIF DES STATISTIQUES');
  const duelRows=x01DuelRows(report);
  if(!duelRows.length){
    txt(ctx,'Statistiques individuelles non conservées dans cette archive',middle,y+24,19,MUTED,700,'center');
    y+=65;
  }
  let cursor=0;
  while(cursor<duelRows.length){
    const canFit=Math.floor((maxY-y)/59);
    if(canFit<=0){addPage(true);heading('COMPARATIF · SUITE');continue;}
    const chunk=duelRows.slice(cursor,cursor+canFit);
    y=drawDuelStatRows(ctx,y,chunk,report);
    cursor+=chunk.length;
  }
  if(report.matchBreakdown?.rows.length){
    const breakdown=report.matchBreakdown;
    const rows=breakdown.rows;
    let index=0;
    while(index<rows.length){
      if(y+105>maxY)addPage(true);
      heading(index?'RÉSULTATS SET PAR SET · SUITE':'RÉSULTATS SET PAR SET');
      while(index<rows.length && y+59<=maxY){
        const row=rows[index];
        const leftLegs=String(row[1]??'—');
        const rightLegs=String(row[2]??'—');
        y=drawDuelStatRows(ctx,y,[{label:'SET '+String(row[0]??index+1)+' · LEGS',left:leftLegs,right:rightLegs,tone:'higher'}],report);
        index++;
      }
    }
  }
  return pages;
}

function buildSummaryPages(report: ChallengeExportReport, assets: PreparedAssets = EMPTY_ASSETS): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  let ctx: CanvasRenderingContext2D;
  let y = 0;
  const bodyTop = 207;
  const contentBottom = PAGE_BOTTOM - 8;
  const pageCapacity = contentBottom - bodyTop;
  const newPage = (contextLabel = 'RAPPORT COMPLET') => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = PDF_SLICE_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Export visuel indisponible sur cet appareil.');
    ctx = context;
    pages.push(canvas);
    const bg = ctx.createLinearGradient(0, 0, 0, PDF_SLICE_HEIGHT);
    bg.addColorStop(0, '#070d18');
    bg.addColorStop(1, '#03060d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, PDF_SLICE_HEIGHT);
    const headline = report.rounds > 0 ? `${report.date}  •  ${report.rounds} ${report.unit}` : report.date;
    drawHeader(ctx, report, assets, report.title, headline,
      pages.length === 1 ? (report.matchType === 'x01' ? 'RÉSULTAT X01' : 'RÉSULTAT FINAL') : `PAGE ${pages.length}`);
    drawArcadeFooter(ctx, PDF_SLICE_HEIGHT, report);
    y = bodyTop;
    if (pages.length > 1) {
      txt(ctx, contextLabel, MARGIN + 2, y + 18, 22, RED, 950);
      y += 44;
    }
  };
  const ensureRoom = (neededHeight: number, contextLabel = 'RAPPORT COMPLET'): boolean => {
    if (y + neededHeight > contentBottom) {
      newPage(contextLabel);
      return true;
    }
    return false;
  };
  const sectionHeading = (title: string, preserveNextHeight: number) => {
    // When a title moves with its block, the continuation-page title doubles
    // as the section heading. Never leave an orphaned heading at page bottom.
    if (ensureRoom(49 + preserveNextHeight, title)) return;
    txt(ctx, title, MARGIN, y + 20, 28, RED, 950);
    y += 47;
  };
  const drawMetrics = (values: ChallengeExportMetric[], tint: string) => {
    const gap = 13;
    for (let offset = 0; offset < values.length; offset += 4) {
      ensureRoom(104, 'CHIFFRES ET CONFIGURATION · SUITE');
      const line = values.slice(offset, offset + 4);
      const width = (CONTENT - (line.length - 1) * gap) / line.length;
      line.forEach((metric, index) => {
        metricBox(ctx, MARGIN + index * (width + gap), y, width, 88, metric, tint);
      });
      y += 104;
    }
  };

  newPage();
  // Result/leader panel: always kept intact.
  ensureRoom(209);
  const winner = report.players[0];
  const leadName = label(winner?.name || 'Joueur', 37);
  rectangle(ctx, MARGIN, y, CONTENT, 190, '#101a29', BORDER, 20);
  drawCircularAvatar(ctx, MARGIN + 18, y + 30, 118, { name: leadName },
    winner ? resolveAvatarImage(winner, assets) : null);
  txt(ctx, report.players.length > 1 ? 'VAINQUEUR' : 'RÉSULTAT', MARGIN + 162, y + 46, 18, MUTED, 850);
  txt(ctx, leadName.toUpperCase(), MARGIN + 162, y + 88, 36, TEXT, 950, 'left', 480);
  txt(ctx, winner?.scoreDisplay || (winner && Number.isFinite(winner.score) ? `${winner.score} PTS` : 'RÉSULTAT —'),
    MARGIN + CONTENT - 28, y + 88, report.matchType === 'x01' ? 30 : 54, RED, 980, 'right', report.matchType === 'x01' ? 470 : 360);
  const scoreBreakdown = report.players.slice(0, 4).map((player, index) =>
    `${index + 1}. ${label(player.name, 12)} · ${player.scoreDisplay || (Number.isFinite(player.score) ? player.score + ' pts' : '—')}`).join('   •   ');
  txt(ctx, scoreBreakdown || 'Aucun classement disponible', MARGIN + 162, y + 138,
    16, '#d9e7f4', 700, 'left', CONTENT - 220);
  y += 209;

  if (report.highlight.length) {
    sectionHeading('CHIFFRES CLÉS', 104);
    drawMetrics(report.highlight, '#ff7d87');
    y += 8;
  }
  if (report.configSummary?.length) {
    sectionHeading('CONFIGURATION DE LA PARTIE', 104);
    drawMetrics(report.configSummary, '#c7f1ff');
    y += 10;
  }

  if (report.matchBreakdown?.rows.length) {
    const breakdown = report.matchBreakdown;
    sectionHeading('RÉSULTAT SET PAR SET', 43 + Math.min(4, breakdown.rows.length) * 44);
    const columns = breakdown.headers;
    const rowHeight = 44;
    const drawLine = (row: string[], header: boolean) => {
      ensureRoom(rowHeight, 'RÉSULTAT SET PAR SET · SUITE');
      rectangle(ctx, MARGIN, y, CONTENT, 39, header ? '#1a3043' : '#102030', header ? '#6587a8' : BORDER, 8);
      const colWidth = CONTENT / Math.max(columns.length, 1);
      columns.forEach((_head, idx) => {
        txt(ctx, label(row[idx] || '—', 30), MARGIN + idx * colWidth + 12, y + 20,
          header ? 15 : 19, idx === 0 ? '#ffb4c0' : (header ? '#c7e1f4' : TEXT), header ? 900 : 800,
          'left', colWidth - 22);
      });
      y += rowHeight;
    };
    drawLine(columns, true);
    breakdown.rows.slice(0, 4).forEach(row => drawLine(row, false));
    if (breakdown.rows.length > 4) {
      ensureRoom(34, 'RÉSULTAT SET PAR SET · SUITE');
      txt(ctx, 'Détail des autres sets dans les pages suivantes', MARGIN + 12, y + 14, 16, MUTED, 650);
      y += 34;
    }
    y += 11;
  }

  sectionHeading('CLASSEMENT FINAL', report.players.length ? 79 : 40);
  if (!report.players.length) {
    txt(ctx, 'Aucun classement enregistré', MARGIN + 8, y + 22, 21, MUTED, 700);
    y += 52;
  }
  for (let i = 0; i < report.players.length; i++) {
    ensureRoom(79, 'CLASSEMENT FINAL · SUITE');
    const player = report.players[i];
    rectangle(ctx, MARGIN, y, CONTENT, 71, i === 0 ? '#24151d' : '#0e1621',
      i === 0 ? '#9e3e51' : BORDER, 11);
    txt(ctx, `${i + 1}.`, MARGIN + 16, y + 36, 28, i === 0 ? RED : TEXT, 900);
    drawCircularAvatar(ctx, MARGIN + 54, y + 10, 50, player,
      resolveAvatarImage(player, assets), i === 0 ? RED : '#62beff');
    txt(ctx, label(player.name.toUpperCase(), 30), MARGIN + 117, y + 36, 24, TEXT, 850, 'left', 540);
    txt(ctx, player.scoreDisplay || (Number.isFinite(player.score) ? `${player.score} PTS` : 'RÉSULTAT —'),
      MARGIN + CONTENT - 21, y + 36, report.matchType === 'x01' ? 21 : 28, i === 0 ? RED : '#e6efff', 950, 'right', 400);
    y += 79;
  }
  y += 12;

  if (report.players.length) {
    const firstPlayer = report.players[0];
    const firstPanel = firstPlayer.visits.length ? 196 + Math.min(4, chartRows(firstPlayer)) * 142 + 26 : 186;
    const visibleHeadline = headlineStatsForPlayer(firstPlayer);
    const featured = new Set(visibleHeadline.map(metric => metric.label));
    const firstMetricRows = Math.ceil(firstPlayer.metrics.filter(metric => !featured.has(metric.label)).length / 4);
    const firstMetrics = firstMetricRows ? firstMetricRows * 88 + 30 : 0;
    sectionHeading('STATISTIQUES PAR JOUEUR',
      Math.min(pageCapacity - 55, firstPanel + 20 + firstMetrics));
  }
  for (const player of report.players) {
    const hasVisits = player.visits.length > 0;
    const featured = headlineStatsForPlayer(player);
    const featuredLabels = new Set(featured.map(metric => metric.label));
    const remainingMetrics = player.metrics.filter(metric => !featuredLabels.has(metric.label));
    const totalChartRows = hasVisits ? chartRows(player) : 1;
    const metricRows = Math.ceil(remainingMetrics.length / 4);
    const metricsHeight = metricRows ? metricRows * 88 + 30 : 0;
    let startRow = 0;
    while (startRow < totalChartRows) {
      const count = Math.min(4, totalChartRows - startRow);
      const panelHeight = hasVisits ? 196 + count * 142 + 26 : 186;
      const extraTogether = startRow + count === totalChartRows &&
        panelHeight + 20 + metricsHeight <= pageCapacity;
      const reserve = panelHeight + 20 + (extraTogether ? metricsHeight : 0);
      ensureRoom(reserve, `STATISTIQUES · ${label(player.name.toUpperCase(), 28)}`);

      const panelGradient = ctx.createLinearGradient(MARGIN, y, MARGIN + CONTENT, y + panelHeight);
      panelGradient.addColorStop(0, '#111f31');
      panelGradient.addColorStop(.55, '#0b1727');
      panelGradient.addColorStop(1, '#080f1c');
      rectangle(ctx, MARGIN, y, CONTENT, panelHeight, panelGradient, BORDER, 17);
      ctx.fillStyle = '#4cc7f1';
      ctx.fillRect(MARGIN + 8, y + 20, 4, panelHeight - 40);
      drawCircularAvatar(ctx, MARGIN + 20, y + 18, 68, player,
        resolveAvatarImage(player, assets), '#62beff');
      txt(ctx, label(player.name.toUpperCase(), 33), MARGIN + 104, y + 35,
        27, TEXT, 950, 'left', 630);
      txt(ctx, player.scoreDisplay || (Number.isFinite(player.score) ? `${player.score} PTS` : 'RÉSULTAT —'),
        MARGIN + CONTENT - 23, y + 35, report.matchType === 'x01' ? 23 : 31, RED, 950, 'right', 370);
      if (featured.length) {
        const gap = 13;
        const cols = Math.min(4, featured.length);
        const boxWidth = (CONTENT - 132 - gap * (cols - 1)) / cols;
        featured.slice(0, cols).forEach((metric, i) => metricBox(ctx,
          MARGIN + 104 + i * (boxWidth + gap), y + 61, boxWidth, 74, metric, '#f3f7ff'));
      } else {
        txt(ctx, 'Statistiques individuelles non conservées pour cette partie',
          MARGIN + 104, y + 93, 19, MUTED, 650, 'left', CONTENT - 140);
      }
      if (hasVisits) {
        txt(ctx, startRow > 0 ? 'POINTS PAR VOLÉE · SUITE' : 'POINTS PAR VOLÉE',
          MARGIN + 23, y + 170, 18, MUTED, 850);
        renderChart(ctx, MARGIN + 1, y + 190, player, startRow, count);
      } else {
        // Do not waste half a page on an empty graphic for legacy saves.
        txt(ctx, 'Les volées individuelles ne sont pas présentes dans cette archive',
          MARGIN + 105, y + 159, 16, '#849cb4', 600, 'left', CONTENT - 150);
      }
      y += panelHeight + 20;
      startRow += count;
    }

    if (metricRows) {
      let startMetric = 0;
      const maxRowsPerCard = Math.max(1, Math.floor((pageCapacity - 20 - 30) / 88));
      while (startMetric < remainingMetrics.length) {
        const visibleCount = Math.min(remainingMetrics.length - startMetric, maxRowsPerCard * 4);
        const countRows = Math.ceil(visibleCount / 4);
        const boxHeight = countRows * 88 + 30;
        ensureRoom(boxHeight + 20, `INDICATEURS · ${label(player.name.toUpperCase(), 28)}`);
        rectangle(ctx, MARGIN, y, CONTENT, boxHeight, '#101723', BORDER, 14);
        const cardMetrics = remainingMetrics.slice(startMetric, startMetric + visibleCount);
        for (let lineIndex = 0; lineIndex < cardMetrics.length; lineIndex += 4) {
          const line = cardMetrics.slice(lineIndex, lineIndex + 4);
          const gap = 12;
          const width = (CONTENT - 42 - (line.length - 1) * gap) / line.length;
          line.forEach((metric, index) => {
            metricBox(ctx, MARGIN + 21 + index * (width + gap),
              y + 16 + Math.floor(lineIndex / 4) * 88, width, 73, metric, '#ffb9bf');
          });
        }
        y += boxHeight + 20;
        startMetric += visibleCount;
      }
    }
  }
  return pages;
}

async function loadImageMaybe(src: string | null | undefined): Promise<HTMLImageElement | null> {
  const value = String(src || '').trim();
  if (!value || !/^(?:https?:\/\/|data:image\/|blob:|\/)/i.test(value)) return null;
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    // A missing external avatar/ticker must not freeze an entire export.
    const finish = (found: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      img.onload = null;
      img.onerror = null;
      resolve(found);
    };
    const timeout = window.setTimeout(() => finish(null), 4500);
    img.crossOrigin = 'anonymous';
    img.onload = () => finish(img.naturalWidth > 0 ? img : null);
    img.onerror = () => finish(null);
    img.src = value;
    if (img.complete && img.naturalWidth > 0) finish(img);
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
const DETAIL_ROW_HEIGHT=44;

function detailedPages(report:ChallengeExportReport, assets: PreparedAssets = EMPTY_ASSETS,
 previousPageCount = 0):HTMLCanvasElement[]{
 const sections=report.details||[];
 if(!sections.some(section => Array.isArray(section.rows) && section.rows.length)) return [];
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
  drawHeader(ctx, report, assets, report.title, 'Rapport complet · '+report.date, 'PAGE '+String(previousPageCount + pages.length));
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
   const pendingHeight = titleHeight + 52 + (rows.length - index) * DETAIL_ROW_HEIGHT + 22;
   const availableOnFreshPage = PAGE_BOTTOM - 195;
   // A table that can fit on one page is atomic: move all of it forward.
   // Only genuinely longer tables are split, always between complete rows.
   if (pendingHeight <= availableOnFreshPage && y + pendingHeight > PAGE_BOTTOM) {
     startPage();
   } else {
     newPageIf(titleHeight+DETAIL_ROW_HEIGHT+DETAIL_ROW_HEIGHT);
   }
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
 const summary = report.matchType === 'x01' && report.players.length === 2
  ? buildX01DuelPages(report) : buildSummaryPages(report);
 const detailed = report.matchType === 'x01' && report.players.length === 2
  ? {...report, details:(report.details||[]).filter(section=>!/(?:STATISTIQUES ENREGISTRÉES|BILAN COMPLET DES JOUEURS|RÉSULTATS SET PAR SET|PARAMÈTRES DE LA PARTIE)/i.test(section.title))}
  : report;
 return [...summary, ...detailedPages(detailed, EMPTY_ASSETS, summary.length)];
}

async function reportCanvasPagesPrepared(report:ChallengeExportReport):Promise<HTMLCanvasElement[]>{
 const assets = await prepareAssets(report);
 const summary = report.matchType === 'x01' && report.players.length === 2
  ? buildX01DuelPages(report, assets) : buildSummaryPages(report, assets);
 const detailed = report.matchType === 'x01' && report.players.length === 2
  ? {...report, details:(report.details||[]).filter(section=>!/(?:STATISTIQUES ENREGISTRÉES|BILAN COMPLET DES JOUEURS|RÉSULTATS SET PAR SET|PARAMÈTRES DE LA PARTIE)/i.test(section.title))}
  : report;
 return [...summary, ...detailedPages(detailed, assets, summary.length)];
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

/** Pre-generate native share payload when the format-choice modal opens.
 * The subsequent PNG/PDF tap never waits for a new render before navigator.share.
 */
export async function prepareChallengeShare(report: ChallengeExportReport): Promise<ChallengePreparedShare> {
  const slug = report.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'partie';
  const stem = 'MSS_' + slug + '_' + new Date().toISOString().slice(0, 10);
  const pages = await reportCanvasPagesPrepared(report);
  if (!pages.length) throw new Error('Aucune page à partager.');
  const pdf = new File([pdfBytesFromCanvases(pages)], stem + '.pdf', {type:'application/pdf'});
  const pngPages = pngPageFiles(pages, stem).map(page =>
    new File([page.bytes], page.name, {type:'image/png'}));
  return {title:report.title, pdf, pngPages};
}

/** IMPORTANT: call directly from an onClick handler, with no awaited operation
 * before this function. It invokes the system sheet synchronously, so iOS and
 * Android still recognise the gesture as a valid file-sharing action.
 */
export function sharePreparedChallenge(
  prepared: ChallengePreparedShare, format: 'pdf'|'png',
): Promise<ChallengeExportResult> {
  const files = format === 'pdf' ? [prepared.pdf] : prepared.pngPages;
  const fileName = format === 'pdf' ? prepared.pdf.name : files[0]?.name || 'MSS_images.png';
  if (!files.length) return Promise.resolve({status:'share-unavailable',fileName});
  const nav = navigator;
  try {
    if (typeof nav.share !== 'function' ||
      (typeof nav.canShare === 'function' && !nav.canShare({files}))) {
      return Promise.resolve({status:'share-unavailable',fileName});
    }
    // Do not turn this into an async function with a preceding await.
    const pending = nav.share({files,title:prepared.title,text:'Résultats MULTISPORTS SCORING'});
    return pending.then(() => ({status:'shared' as const,fileName})).catch((error:unknown) => {
      if ((error as Error)?.name === 'AbortError') return {status:'cancelled' as const,fileName};
      console.warn('[challenge-export] sharing rejected by host',error);
      return {status:'share-unavailable' as const,fileName};
    });
  } catch (error) {
    console.warn('[challenge-export] sharing not supported',error);
    return Promise.resolve({status:'share-unavailable',fileName});
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
 const statPools=candidates.filter((rows):rows is any[]=>Array.isArray(rows)&&rows.length>0);
 const players:ChallengeExportPlayer[]=source.map((raw:any)=>{
  const id=String(raw?.id||raw?.pid||raw?.playerId||raw?.profileId||'').trim();
  const name=String(raw?.name||raw?.playerName||raw?.displayName||'').trim().toLowerCase();
  const nicknameUnique=name&&source.filter((person:any)=>String(person?.name||person?.playerName||person?.displayName||'').trim().toLowerCase()===name).length===1;
  // The ranking establishes participant identity and final score. Performance
  // counters may be stored separately in payload.stats.players. Join by an
  // explicit ID first; only use the nickname when both sides are unambiguous.
  const merged:any={};
  for(const pool of statPools){
   const byId=id?pool.filter((person:any)=>String(person?.id||person?.pid||person?.playerId||person?.profileId||'').trim()===id):[];
   const byName=!byId.length&&nicknameUnique?pool.filter((person:any)=>
    String(person?.name||person?.playerName||person?.displayName||'').trim().toLowerCase()===name&&
    (!id||!String(person?.id||person?.pid||person?.playerId||person?.profileId||'').trim()||
      String(person?.id||person?.pid||person?.playerId||person?.profileId||'').trim()===id)):[];
   const candidate=byId.length===1?byId[0]:byName.length===1?byName[0]:null;
   if(candidate&&typeof candidate==='object')Object.assign(merged,candidate?.stats||{},candidate);
  }
  const row={...merged,...(raw?.stats&&typeof raw.stats==='object'?raw.stats:{}),...raw};
  const exercise=row.exerciseStats||row.stats?.exerciseStats||row.special?.exerciseStats||{};
  // An omitted statistic is unknown, not a measured zero. Older archives
  // often persisted the ranking but not its dart-level performance counters.
  const darts=validMetricNumber(row.darts??row.dartsThrown);
  const explicitAccuracy=validMetricNumber(row.successRate??row.accuracy);
  const hitCount=validMetricNumber(row.hitCount??row.hits);
  const accuracy=explicitAccuracy!==null ? explicitAccuracy
   : (darts!==null&&darts>0&&hitCount!==null ? hitCount/darts*100 : null);
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
   score:validMetricNumber(row.score??row.points)??Number.NaN,
   accuracy,darts,
   bestStreak:validMetricNumber(row.bestStreak),
   avgVisit:validMetricNumber(row.avgVisit),
   visits:Array.isArray(rawVisits)?rawVisits.map((x:any)=>Number(x)||0):[],
   metrics:metrics.slice(0,16),
   avatarUrl: pickAvatarSource(row),
  };
 }).sort((a:ChallengeExportPlayer,b:ChallengeExportPlayer)=>
  (Number.isFinite(b.score)?b.score:-Infinity)-(Number.isFinite(a.score)?a.score:-Infinity));
 const rawDate=entry?.finishedAt||entry?.updatedAt||entry?.createdAt||Date.now();
 const date=new Date(rawDate).toLocaleString('fr-FR');
 const first=players[0];
 const highlight:ChallengeExportMetric[]=(first?.metrics||[]).slice(0,4);
 if(!highlight.length&&first){
  if(Number.isFinite(first.score))highlight.push({label:'SCORE',value:first.score+' PTS'});
  if(first.accuracy!==null)highlight.push({label:'RÉUSSITE',value:first.accuracy.toFixed(1)+'%'});
 }
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
 * The History V4 format differs between game modes and older revisions.
 * Enrich a single authoritative ranking with independently saved statistics
 * without duplicating players whose profile IDs have changed.
 */
const REPORT_STAT_FIELDS: Array<{title:string;names:string[];unit?:string}> = [
 {title:'AVG3',names:['avg3','avg3d','avg3D','average3Darts','avg3Darts','average3']},
 {title:'MPR',names:['mpr','marksPerRound','marksPerVisit']},
 {title:'MARQUES',names:['marks','totalMarks','marksScored']},
 {title:'SECTEURS FERMÉS',names:['closedSectors','closedNumbers','numbersClosed']},
 {title:'BEST VOLÉE',names:['bestVisit','highestVisit','bestTurn','bestRound','maxVisit','maxScoreVisit']},
 {title:'CHECKOUT',names:['bestCheckout','highestCheckout','highFinish','highestFinish','finishMax']},
 {title:'180',names:['count180','hits180','n180','oneEighties']},
 {title:'140+',names:['count140','hits140','n140']},
 {title:'100+',names:['count100','hits100','n100']},
 {title:'SETS',names:['setsWon','wonSets','setWins','sets','setsCount']},
 {title:'LEGS',names:['legsWon','wonLegs','legWins','legs','legsCount']},
 {title:'MATCHS GAGNÉS',names:['wins','matchesWon','gamesWon']},
 {title:'MATCHS PERDUS',names:['losses','matchesLost','gamesLost']},
 {title:'TOUCHES',names:['hitCount','hits','successfulHits','hitsMade','usefulHits']},
 {title:'FLÉCHETTES',names:['dartsThrown','darts','totalDarts','dartsPlayed']},
 {title:'MISS',names:['misses','miss','missCount','failedDarts']},
 {title:'RÉUSSITE',names:['successRate','accuracy','hitRate','successPct','accuracyPct'],unit:'%'},
 {title:'SUITE',names:['bestStreak','streak','longestStreak']},
 {title:'MOY. / VOLÉE',names:['avgVisit','avgPerVisit','averageVisit','avgRound']},
 {title:'TOURS',names:['roundsPlayed','rounds','visitsPlayed','visits']},
 {title:'BULL 25',names:['bull25','bull25Hits','singleBull','sBull','SBull']},
 {title:'DBULL 50',names:['bull50','bull50Hits','doubleBull','dBull','DBull']},
 {title:'DOUBLES',names:['doubleHits','doublesHits','hitDoubles']},
 {title:'TRIPLES',names:['tripleHits','triplesHits','hitTriples']},
 {title:'CAPTURES',names:['captures','catches','gotchas','captured']},
 {title:'FUITES',names:['escapes','escapesMade']},
 {title:'BUSTS',names:['busts','bustCount']},
 {title:'VIES',names:['livesLeft','remainingLives','lives']},
 {title:'VICTIMES',names:['victims','victimsHit']},
 {title:'COUPS',names:['shots','throws','attempts']},
 {title:'PTS MARQUÉS',names:['pointsScored','scoredPoints','totalPointsScored','scoredTotal','totalScored']},
 {title:'RESTANT',names:['remaining','remainingScore','scoreLeft']},
 {title:'SECTEURS',names:['sectors','territories','ownedTerritories']},
 {title:'VOLÉES PARFAITES',names:['perfectVisits','perfectRounds']},
 {title:'VOLÉES VALIDÉES',names:['validatedVisits','successfulVisits']},
 {title:'BONUS',names:['bonus','bonusScore','bonusPoints']},
];
const NON_STAT_KEYS = /(?:^id$|schema|version|^index$|^ordinal$|^order$|^seed$|sortorder|playerid|userid|profileid|teamid|avatar|photo|image|picture|url|timestamp|createdat|updatedat|finishedat|birth|email|phone|password|secret|token|credential|signature|hash|config|device|address|geo|lat|lon|key$|name$|displayname|nickname|^rank$|^position$|^score$|^points$|^total$|^finalscore$|^name$|^mode$|^kind$|^status$|^player$|^team$|^profile$)/i;
const EXTRA_STAT_BRANCHES = ['stats','statistics','special','metrics','performance','result','detail','telemetry','exerciseStats','summary','aggregates','totals'];
function validMetricNumber(value:unknown):number|null {
 if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
 const result=typeof value==='string' ? Number(value.replace(',', '.')) : Number(value);
 return Number.isFinite(result)?result:null;
}
function realMetric(value:unknown,unit=''):string|null {
 const n=validMetricNumber(value);
 if(n===null)return null;
 const formatted=Number.isInteger(n)?String(n):String(Math.round(n*100)/100);
 return formatted+unit;
}
function normalizedPersonKey(value:unknown):string {
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
}
function personId(row:any):string {
 return String(row?.id||row?.playerId||row?.profileId||row?.pid||'').trim();
}
function personName(row:any):string {
 return String(row?.name||row?.playerName||row?.displayName||row?.nickname||row?.username||row?.label||'').trim();
}
function locateSavedRow(row:any, pools:any[][]):any[] {
 const id=personId(row);
 const name=normalizedPersonKey(personName(row));
 return pools.flatMap(pool=>{
  const byId=id?pool.filter(p=>personId(p)&&personId(p)===id):[];
  if(byId.length)return byId;
  if(!name)return [];
  const named=pool.filter(p=>normalizedPersonKey(personName(p))===name &&
   // Two different explicit IDs must never be joined only because names match.
   (!id||!personId(p)||personId(p)===id));
  return named.length===1?named:[]; // never conflate duplicate profiles
 });
}
function reportValue(objects:any[],names:string[]):unknown {
 for(const source of objects){
  if(!source||typeof source!=='object'||Array.isArray(source))continue;
  for(const key of names){
   if(Object.prototype.hasOwnProperty.call(source,key)){
    const value=source[key];
    if(validMetricNumber(value)!==null)return value;
   }
  }
 }
 return undefined;
}
function mappedStatsForPlayer(entry:any,payload:any,summary:any,result:any,row:any):any {
 const id=personId(row);
 const name=normalizedPersonKey(personName(row));
 const roots=[result,summary,summary?.result,payload?.result,payload?.stats,
  payload?.summary?.result,payload?.summary,entry?.stats,entry?.result];
 const allKeys=REPORT_STAT_FIELDS.flatMap(field=>field.names);
 const fields:Record<string,unknown>={};
 const find=(value:any):unknown=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  if(id&&Object.prototype.hasOwnProperty.call(value,id))return value[id];
  if(name){
   const names=Object.entries(value).filter(([key])=>normalizedPersonKey(key)===name);
   if(names.length===1)return names[0][1];
  }
  return undefined;
 };
 for(const root of roots){
  if(!root||typeof root!=='object')continue;
  const perPlayer=find(root.perPlayer)||find(root.playersById)||find(root.playerStats)||find(root.statsByPlayer);
  if(perPlayer&&typeof perPlayer==='object'&&!Array.isArray(perPlayer)){
   for(const [key,value] of Object.entries(perPlayer))if(fields[key]===undefined)fields[key]=value;
  }
  for(const key of allKeys){
   if(fields[key]!==undefined)continue;
   const value=find(root[key]);
   if(validMetricNumber(value)!==null)fields[key]=value;
  }
 }
 return fields;
}

function gatherStatObjects(rows:any[]):any[] {
 const objects:any[]=[];
 const seen=new Set<any>();
 const explore=(value:any,depth:number)=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||depth>2||seen.has(value))return;
  seen.add(value);objects.push(value);
  if(depth<2)for(const branch of EXTRA_STAT_BRANCHES)explore(value[branch],depth+1);
 };
 rows.forEach(row=>explore(row,0));
 return objects;
}
function readableStatLabel(key:string):string {
 const known=REPORT_STAT_FIELDS.find(field=>field.names.includes(key));
 if(known)return known.title;
 return key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').trim().toUpperCase();
}
function actualSavedMetrics(objects:any[]):ChallengeExportMetric[] {
 const metrics:ChallengeExportMetric[]=[];
 const used=new Set<string>();
 const add=(title:string,value:unknown,unit='')=>{
  const rendered=realMetric(value,unit);
  if(rendered===null||used.has(title))return;
  used.add(title);metrics.push({label:title,value:rendered});
 };
 REPORT_STAT_FIELDS.forEach(field=>add(field.title,reportValue(objects,field.names),field.unit));
 // Include every *scalar numeric* game statistic retained by old/new modes.
 // No guessing: use its persisted name when no translation is known.
 for(const obj of objects){
  for(const [key,value] of Object.entries(obj)){
   if(NON_STAT_KEYS.test(key)||EXTRA_STAT_BRANCHES.includes(key)||typeof value==='object')continue;
   const title=readableStatLabel(key);
   add(title,value);
   if(metrics.length>=80)return metrics;
  }
 }
 return metrics;
}
function chooseHeadlineStats(metrics:ChallengeExportMetric[],mode:string,score:number):ChallengeExportMetric[] {
 const byTitle=new Map(metrics.map(metric=>[metric.label,metric]));
 const normalized=tickerModeKey(mode);
 // Mode-specific selection uses only the *saved* values. Never fill a missing
 // slot with a fictitious zero or a counter from an unrelated sport.
 const profiles: Array<[RegExp,string[]]> = [
  [/cricket/,['MPR','MARQUES','SECTEURS FERMÉS','RÉUSSITE','FLÉCHETTES','MISS','BULL 25']],
  [/attrape|gotcha/,['CAPTURES','SETS','LEGS','AVG3','BEST VOLÉE','FLÉCHETTES','MISS']],
  [/killer|five_lives|chase/,['VIES','VICTIMES','TOUCHES','FLÉCHETTES','MISS','SUITE']],
  [/ping_?pong|tennis|badminton/,['SETS','MATCHS GAGNÉS','MATCHS PERDUS','TOUCHES']],
  [/petanque|molkky|molky|golf/,['COUPS','PTS MARQUÉS','RÉUSSITE','TOUCHES','TOURS']],
  [/challenge|jdc|training/,['RÉUSSITE','BEST VOLÉE','VOLÉES VALIDÉES','VOLÉES PARFAITES','FLÉCHETTES']],
  [/x01|301|501|701|901/,['AVG3','BEST VOLÉE','LEGS','SETS','CHECKOUT','PTS MARQUÉS','180']],
 ];
 const target=profiles.find(([pattern])=>pattern.test(normalized))?.[1]||
  (/(dart|shanghai|count_up)/.test(normalized)
    ? ['AVG3','BEST VOLÉE','CHECKOUT','RÉUSSITE','FLÉCHETTES','180','MISS']
    : ['RÉUSSITE','TOUCHES','FLÉCHETTES','SETS','MATCHS GAGNÉS','TOURS']);
 const chosen:ChallengeExportMetric[]=[];
 for(const labelText of target){
  const m=byTitle.get(labelText);
  if(m&&!chosen.includes(m))chosen.push(m);
  if(chosen.length===4)break;
 }
 for(const metric of metrics){
  if(!chosen.includes(metric))chosen.push(metric);
  if(chosen.length===4)break;
 }
 if(!chosen.length&&Number.isFinite(score))chosen.push({label:'SCORE ENREGISTRÉ',value:String(score)});
 return chosen;
}
function pickVisitScores(objects:any[]):number[]{
 for(const obj of objects){
  const found=obj.visitScores??obj.visitsScores??obj.roundScores??obj.pointsByVisit;
  if(Array.isArray(found)&&found.length){
   const points=found.map(row=>validMetricNumber(typeof row==='object'&&row!==null?(row.points??row.score??row.total):row));
   if(points.every(value=>value!==null))return points as number[];
  }
 }
 return [];
}
const REPORT_MODE_TICKERS: Record<string, string> = {
 x01:tickerX01,training_x01:tickerX01,cricket:tickerCricket,challenge:tickerChallenge,
 attrape_moi:tickerAttrapeMoi,gotcha:tickerGotcha,killer:tickerKiller,
 golf:tickerGolf,five_lives:tickerFiveLives,loterie:tickerLoterie,
 super_bull:tickerSuperBull,halve_it:tickerHalveIt,bowling:tickerBowling,
 baseball:tickerBaseball,pendu:tickerPendu,scram:tickerScram,
 prisoner:tickerPrisoner,castle:tickerCastle,bobs_27:tickerBob27,
 crados:tickerCrados, 
 shanghai:tickerShanghai, 
 count_up:tickerCountUp, 
 capital:tickerCapital, 
 bastard:tickerBastard, 
 cargo:tickerCargo, 
 darts_poker:tickerDartsPoker, 
 darts_racer:tickerDartsRacer, 
 darts_firefighter:tickerDartsFirefighter, 
 warfare:tickerWarfare, 
 president:tickerPresident, 
 menteur:tickerMenteur, 
 ptit_1:tickerPtit1, 
 ocean_control:tickerOceanControl, 
 tic_tac_toe:tickerTicTacToe, 
 hare_hounds:tickerHareHounds, 
 football:tickerFootball, 
 bss_king:tickerBssKing, 
 top_10:tickerTop10, 
 saute_moutons:tickerSauteMoutons, 
 troupeau_en_danger:tickerTroop, 
 bim_bam_boum:tickerBimBamBoum, 
 la_suite:tickerLaSuite, 
 green_vs_red:tickerGreenVsRed, 
 black_vs_white:tickerBlackVsWhite, 
 color_call:tickerColorCall, 
 three_colors:tickerThreeColors, 
 split_score:tickerSplitScore, 
 chase:tickerChase, 
 une_ptite_raclette:tickerRaclette, 
 nine_dart_century:tickerNineDart, 
 hi_score:tickerHiScore, 
 closest_center:tickerClosestCenter, 
 double_down:tickerDoubleDown, 
 shove_a_penny:tickerShovePenny,
};
function tickerModeKey(value: unknown):string {
 return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}
/** Match history may store sport="darts" in game.mode while the actual
 * ruleset is in summary.mode or game.modeId. Prefer a specific mode token.
 * This also selects the correct match ticker for older History V4 archives.
 */
function resolveReportMode(entry:any,payload:any,summary:any):string {
 const candidates=[entry?.game?.modeId,entry?.game?.gameMode,entry?.game?.mode,
  entry?.mode,summary?.modeId,summary?.gameMode,summary?.game?.mode,
  summary?.mode,payload?.summary?.modeId,payload?.summary?.gameMode,
  payload?.summary?.mode,payload?.game?.mode,payload?.mode,
  entry?.game?.kind,entry?.kind,payload?.kind,summary?.kind];
 const values=candidates.map(tickerModeKey).filter(Boolean);
 const generic=new Set(['darts','dart','fléchettes','flechettes','game','games',
  'match','solo','multi','duel','team','teams','sport','unknown','classic']);
 const canonical=(value:string):string=>{
  if(/^(?:x01(?:_|$)|x_?01(?:_|$)|quick_x01|training_x01|301$|501$|701$|901$)/.test(value))return 'x01';
  if(/^(?:challenge(?:_|$)|jdc$|le_jdc_challenge)/.test(value))return 'challenge';
  if(value==='catch_me'||value==='catchme')return 'attrape_moi';
  return value;
 };
 for(const token of values){
  if(generic.has(token))continue;
  const key=canonical(token);
  if(REPORT_MODE_TICKERS[key]||key==='x01'||key==='challenge')return key;
 }
 return canonical(values.find(value=>!generic.has(value))||'unknown');
}
function findTicker(entry:any,payload:any,mode?:string):string {
 const key = tickerModeKey(mode || entry?.game?.mode || entry?.mode || payload?.summary?.mode || entry?.kind);
 if(REPORT_MODE_TICKERS[key])return REPORT_MODE_TICKERS[key];
 const aliases:Record<string,string> = {
 x01_multi:'x01',x01_quick:'x01',x01_fast:'x01',quick_x01:'x01',
 x01_v3:'x01',five_lives_killer:'five_lives',crados:'challenge',
 attrape_moi_v2:'attrape_moi',shanghai:'shanghai',
  the_chase:'chase',morpion:'tic_tac_toe',ptit1:'ptit_1',
  le_jdc_challenge:'challenge',jdc:'challenge',
 };
 const alias=aliases[key];if(alias && REPORT_MODE_TICKERS[alias])return REPORT_MODE_TICKERS[alias];
 const found=Object.entries(REPORT_MODE_TICKERS).find(([known])=>key.startsWith(known+'_'));
 if(found)return found[1];
 const saved=[entry?.game?.tickerSrc,entry?.game?.tickerUrl,entry?.game?.ticker,
  payload?.config?.tickerSrc,payload?.config?.tickerUrl,payload?.config?.ticker,
  entry?.summary?.tickerSrc,payload?.summary?.tickerSrc];
 for(const raw of saved){
  const src=String(raw||'').trim();
  // Do not put the History page ticker on a match report.
  if(src && !/ticker[_/-]histor(?:y|ique)/i.test(src) &&
     (src.startsWith('data:image/')||src.startsWith('/')||src.startsWith('https://')))return src;
 }
 return ''; // Neutral graphic, never the unrelated "HISTORY" ticker
}
function reportConfig(entry:any,summary:any,payload:any,mode:string,numberOfPlayers:number):ChallengeExportMetric[] {
 const cfg={...(payload?.config&&typeof payload.config==='object'?payload.config:{}),
  ...(entry?.game&&typeof entry.game==='object'?entry.game:{}),
  ...(summary?.config&&typeof summary.config==='object'?summary.config:{})};
 const known:[string,string[]][]=[
  ['MODE',['mode','gameMode','modeId']],['VARIANTE',['variant','variantId']],
  ['RÈGLE',['rule','rules','scoringRule']],['CIBLE',['target','targetScore']],
  ['DÉPART',['startingScore','startScore','initialScore']],
  ['ENTRÉE',['inMode','inRule','in']],['SORTIE',['outMode','outRule','out']],
  ['FORMAT',['format','matchMode','gameType']],['SETS',['sets','maxSets','setsToWin']],
  ['LEGS',['legs','maxLegs','legsToWin']],['BO',['bestOf','bo']],['FT',['firstTo','ft']],
  ['ÉQUIPES',['teamsMode','teamMode']],['DURÉE',['duration','durationMinutes']],
  ['VOLÉES',['visits','visitsLimit']],['TOURS',['rounds','maxRounds']],
  ['DIFFICULTÉ',['difficulty','level']],
 ];
 const output:ChallengeExportMetric[]=[];
 const seen=new Set<string>();
 const add=(title:string,value:any)=>{
  if(value===undefined||value===null||value===''||typeof value==='object'||seen.has(title))return;
  if(typeof value==='boolean')value=value?'OUI':'NON';
  seen.add(title);output.push({label:title,value:String(value).slice(0,38)});
 };
 add('MODE',mode||'PARTIE');add('JOUEURS',numberOfPlayers);
 for(const [title,keys] of known){
  for(const key of keys){const value=cfg[key];if(value!==undefined&&value!==null&&value!==''){add(title,value);break;}}
 }
 const duration=validMetricNumber(summary?.durationMs??payload?.summary?.durationMs);
 if(duration!==null&&duration>0)add('DURÉE',(duration/60000).toFixed(1)+' min');
 return output.slice(0,20);
}


/** X01: results are SETS/LEGS, never the residual score of the last leg.
 * The X01 stats tab already uses these same summary keys and replay structures.
 * Only explicit saved counters/points are printed; historical gaps remain unknown.
 */
function applyX01Report(
 report:ChallengeExportReport,entry:any,payload:any,summary:any,result:any,source:any[]
):ChallengeExportReport {
 const summaries=[summary,payload?.summary,entry?.summary,payload?.resume?.summary,entry?.resume?.summary,result].filter(Boolean);
 const rankRows=[...source,...summaries.flatMap(root=>Array.isArray(root?.rankings)?root.rankings:[])];
 const config={...payload?.config,...entry?.game,...summary?.game,...summary?.config};
 const matchesUniqueX01Name=(name:string,id:string):boolean=>
  !!name&&report.players.filter(p=>normalizedPersonKey(p.name)===name).length===1;
 const matchingRow=(player:ChallengeExportPlayer):any=>{
  const id=String(player.participantId||'');
  const name=normalizedPersonKey(player.name);
  const exact=id?rankRows.find(r=>personId(r)===id):undefined;
  if(exact)return exact;
  if(!matchesUniqueX01Name(name,id))return {};
  const named=rankRows.filter(r=>normalizedPersonKey(personName(r))===name&&(!id||!personId(r)||personId(r)===id));
  // A ranking can appear twice (source + summary.rankings) in the same
  // History V4 archive. Those copies do not imply two different players.
  return named.length?named[0]:{};
 };
 const readMap=(name:string,player:ChallengeExportPlayer):number|null=>{
  const roots=[...summaries,payload?.stats,entry?.stats];
  const id=String(player.participantId||'');
  const nameKey=normalizedPersonKey(player.name);
  for(const root of roots){
   const map=root?.[name];
   if(!map||typeof map!=='object'||Array.isArray(map))continue;
   if(id&&Object.prototype.hasOwnProperty.call(map,id)){
    const v=validMetricNumber(map[id]);if(v!==null)return v;
   }
   if(!matchesUniqueX01Name(nameKey,id))continue;
   const keys=Object.keys(map).filter(k=>normalizedPersonKey(k)===nameKey);
   if(keys.length===1){const v=validMetricNumber(map[keys[0]]);if(v!==null)return v;}
  }
  return null;
 };
 const readPersisted=(player:ChallengeExportPlayer,keys:string[],mapNames:string[]):number|null=>{
  const r=matchingRow(player);
  const detailed=summaries.flatMap(root=>{
   const obj=root?.detailedByPlayer;
   if(!obj||typeof obj!=='object')return [];
   const id=String(player.participantId||'');
   if(id&&obj[id])return [obj[id]];
   const name=normalizedPersonKey(player.name);
   if(!matchesUniqueX01Name(name,id))return [];
   const found=Object.values(obj).filter((v:any)=>normalizedPersonKey(personName(v))===name&&
     (!id||!personId(v)||personId(v)===id));
   const explicitIds=new Set(found.map(personId).filter(Boolean));
   return explicitIds.size<=1?found:[];
  });
  // Won sets/legs are cumulative counters; older summary levels may only
  // contain the *last* set. Prefer the largest explicitly saved cumulative
  // value over an outdated zero, never the ranking's residual X01 score.
  const found:number[]=[];
  for(const obj of [...detailed,r]){
   for(const key of keys){
    const number=validMetricNumber(obj?.[key]);
    if(number!==null && number>=0)found.push(number);
   }
  }
  for(const mapName of mapNames){
   const value=readMap(mapName,player);
   if(value!==null && value>=0)found.push(value);
  }
  return found.length?Math.max(...found):null;
 };
 const savedVisits=summaries.flatMap(root=>[root?.visitHistory,root?.visitsHistory,root?.__legStats?.visits]).find(arr=>Array.isArray(arr)&&arr.length) || [];
 const savedLegs=summaries.flatMap(root=>[root?.legDetails,root?.legSummaries,root?.__legStats?.legs,root?.legs]).find(arr=>Array.isArray(arr)&&arr.length) || [];
 const matchPlayer=(person:any,player:ChallengeExportPlayer):boolean=>{
  if(person===null||person===undefined)return false;
  const id=String(player.participantId||'');
  const name=normalizedPersonKey(player.name);
  if(typeof person==='string'||typeof person==='number'){
   const target=String(person);
   if(id&&target===id)return true;
   return matchesUniqueX01Name(name,id)&&normalizedPersonKey(target)===name;
  }
  const sourceId=personId(person);
  if(id&&sourceId)return id===sourceId;
  return matchesUniqueX01Name(name,id)&&normalizedPersonKey(personName(person))===name;
 };
 const visitPts=(visit:any):number|null=>{
  if(visit?.bust===true||visit?.isBust===true)return 0;
  // X01 snapshots may call the *remaining* amount "score". Prefer an
  // explicit throw total; do not silently add remaining balances as points.
  const explicit=visit?.scored??visit?.pointsScored??visit?.visitPoints??visit?.points;
  if(explicit!==undefined&&explicit!==null)return validMetricNumber(explicit);
  if(visit?.remaining!==undefined||visit?.scoreLeft!==undefined||
     visit?.remainingScore!==undefined)return null;
  return validMetricNumber(visit?.score);
 };
 const numberMetric=(metrics:ChallengeExportMetric[],name:string):number|null=>{
  const item=metrics.find(m=>m.label===name);
  return item?validMetricNumber(item.value.replace(/\s*pts$/i,'')):null;
 };
 const statRows=(player:ChallengeExportPlayer):any[]=>{
  const id=String(player.participantId||'');
  const target=normalizedPersonKey(player.name);
  const result:any[]=[];
  for(const root of summaries){
   for(const mapName of ['detailedByPlayer','liveStatsByPlayer','perPlayerStats','statsByPlayer']){
    const map=root?.[mapName];
    if(!map||typeof map!=='object')continue;
    const entry=id&&map[id];
    if(entry&&typeof entry==='object')result.push(entry);
    else{
     if(matchesUniqueX01Name(target,id)){
      const found=Object.values(map).filter((v:any)=>normalizedPersonKey(personName(v))===target&&
        (!id||!personId(v)||personId(v)===id));
      if(found.length===1)result.push(found[0]);
     }
    }
   }
   for(const arrName of ['perPlayer','players','rankings']){
    const arr=root?.[arrName];
    if(!Array.isArray(arr))continue;
    const matchedById=id?arr.filter((v:any)=>personId(v)===id):[];
    const matched=matchedById.length?matchedById:(matchesUniqueX01Name(target,id)?
      arr.filter((v:any)=>normalizedPersonKey(personName(v))===target&&
        (!id||!personId(v)||personId(v)===id)):[]);
    if(matched.length===1)result.push(matched[0]);
   }
  }
  result.push(matchingRow(player));
  return result;
 };
 const savedStat=(player:ChallengeExportPlayer,keys:string[],mapNames:string[]=[]):number|null=>{
  const rows=statRows(player);
  for(const row of rows){
   const value=validMetricNumber(reportValue([row],keys));
   if(value!==null)return value;
  }
  for(const mapName of mapNames){const value=readMap(mapName,player);if(value!==null)return value;}
  // Older X01 archives maintain statistics under summary.legacy.
  const id=String(player.participantId||'');
  if(id){
   for(const root of summaries){
    for(const key of keys){
     const value=validMetricNumber(root?.legacy?.[key]?.[id]);
     if(value!==null)return value;
    }
   }
  }
  return null;
 };
 for(const player of report.players){
  const storedSets=readPersisted(player,['setsWonTotal','setsWon','setWins','wonSets','sets'],
   ['setsWonByPlayer','setsByPlayer','setsWon','setsScore']);
  const storedLegs=readPersisted(player,['legsWonTotal','legsWon','legWins','wonLegs','legs'],
   ['legsWonByPlayer','legsByPlayer','legsWon','legsScore']);
  const legWins=savedLegs.filter((leg:any)=>matchPlayer(leg?.winnerId??leg?.winner,player)).length;
  const explicitSetWinners=new Map<number,string>();
  savedLegs.forEach((leg:any)=>{
   const set=validMetricNumber(leg?.setNo??leg?.setIndex);
   const winner=leg?.setWinnerId??leg?.winnerSetId;
   if(set!==null&&winner)explicitSetWinners.set(set,String(winner));
  });
  const setWins=[...explicitSetWinners.values()].filter(w=>matchPlayer(w,player)).length;
  const sets=storedSets===null?(explicitSetWinners.size?setWins:null):Math.max(storedSets,setWins);
  const legs=storedLegs===null?(savedLegs.length?legWins:null):Math.max(storedLegs,legWins);
  // The direct ranking score is often final remaining X01; do not use it.
  player.score=sets ?? legs ?? Number.NaN;
  player.scoreDisplay=sets!==null?`${sets} SET${sets===1?'':'S'}${legs!==null?' · '+legs+' LEG'+(legs===1?'':'S'):''}`:
   legs!==null?`${legs} LEG${legs===1?'':'S'}`:'RÉSULTAT —';
  player.scoreSecondary=sets!==null?'Sets remportés sur le match':'Legs remportés sur le match';
  let scored=readPersisted(player,
    ['totalScore','totalPointsScored','pointsScored','scoredPoints','scoredTotal'],
    ['pointsByPlayer','scoredPointsByPlayer','totalPointsByPlayer']);
  if(scored===null)scored=numberMetric(player.metrics,'TOTAL SCORE')??numberMetric(player.metrics,'PTS MARQUÉS');
  if(scored===null&&savedVisits.length){
   let total=0,count=0;
   savedVisits.forEach((v:any)=>{
    if(!matchPlayer(v?.playerId??v?.pid??v?.profileId,player))return;
    const pts=visitPts(v);
    if(pts!==null){total+=pts;count++;}
   });
   if(count)scored=total;
  }
  const keep=player.metrics.filter(m=>!['RESTANT','SCORE FINAL','REMAINING','TOTAL SCORE',
    'SETS','LEGS','PTS MARQUÉS','SCORE ENREGISTRÉ'].includes(m.label));
  // Reuse the same metrics already persisted for the X01 Stats/History screens.
  const statsToRecover:[string,string[],string[]][]=[
   ['AVG3',['avg3','avg3d','avg3D','average3Darts','average3'],['avg3ByPlayer']],
   ['BEST VOLÉE',['bestVisit','highestVisit','bestTurn'],['bestVisitByPlayer']],
   ['CHECKOUT',['bestCheckout','highestCheckout','highFinish'],['bestCheckoutByPlayer']],
   ['FLÉCHETTES',['darts','dartsThrown','totalDarts'],['dartsByPlayer']],
   ['180',['h180','count180','hits180'],['h180ByPlayer']],
   ['140+',['h140','count140','hits140'],['h140ByPlayer']],
   ['100+',['h100','count100','hits100'],['h100ByPlayer']],
   ['MISS',['miss','misses','missCount'],['missByPlayer']],
   ['BUSTS',['bust','busts','bustCount'],['bustByPlayer']],
   ['CHECKOUT RÉUSSIS',['checkoutHits'],['checkoutHitsByPlayer']],
   ['TENTATIVES CHECKOUT',['checkoutAttempts'],['checkoutAttemptsByPlayer']],
  ];
  const known=new Set(keep.map(m=>m.label));
  for(const [name,keys,maps] of statsToRecover){
   if(known.has(name))continue;
   const value=savedStat(player,keys,maps);
   if(value!==null){keep.push({label:name,value:String(Math.round(value*100)/100)});known.add(name);}
  }
  const prepend:ChallengeExportMetric[]=[];
  if(scored!==null)prepend.push({label:'PTS MARQUÉS',value:String(scored)});
  if(sets!==null)prepend.push({label:'SETS REMPORTÉS',value:String(sets)});
  if(legs!==null)prepend.push({label:'LEGS REMPORTÉS',value:String(legs)});
  player.metrics=[...prepend,...keep];
  const preferred=['AVG3','BEST VOLÉE','CHECKOUT','PTS MARQUÉS','180','140+','FLÉCHETTES'];
  const picks=preferred.map(label=>player.metrics.find(m=>m.label===label)).filter(Boolean) as ChallengeExportMetric[];
  player.headlineMetrics=picks.slice(0,4);
  if(savedVisits.length){
   const visits=savedVisits.filter((v:any)=>matchPlayer(v?.playerId??v?.pid??v?.profileId,player))
     .map(visitPts).filter((v:any)=>v!==null) as number[];
   if(visits.length)player.visits=visits;
  }
 }
 report.matchType='x01';
 report.tickerSrc=tickerX01;
 report.rounds=savedVisits.length||0;
 report.unit='volées enregistrées';
 const sets=report.players.map(p=>validMetricNumber(p.metrics.find(m=>m.label==='SETS REMPORTÉS')?.value));
 const legs=report.players.map(p=>validMetricNumber(p.metrics.find(m=>m.label==='LEGS REMPORTÉS')?.value));
 const points=report.players.map(p=>validMetricNumber(p.metrics.find(m=>m.label==='PTS MARQUÉS')?.value));
 const metrics:ChallengeExportMetric[]=[];
 // A4 tiles must hold short values; never concatenate all players in one box.
 // Present X01 as a head-to-head result, with unit-specific performance KPIs.
 for(const player of report.players.slice(0,3)){
  const name=label(player.name.toUpperCase(),15);
  const value=(title:string)=>player.metrics.find(m=>m.label===title)?.value;
  const add=(suffix:string,text:string|undefined)=>{
   if(text!==undefined&&text!=='')metrics.push({label:name+' · '+suffix,value:text});
  };
  add('SETS',value('SETS REMPORTÉS'));
  add('LEGS',value('LEGS REMPORTÉS'));
  add('POINTS MARQUÉS',value('PTS MARQUÉS'));
  add('AVG3',value('AVG3'));
 }
 if(!metrics.length)metrics.push({label:'JOUEURS',value:String(report.players.length)});
 report.highlight=metrics;
 const rawSets=new Map<number,any[]>();
 const allLegRows:Array<{set:number|null;leg:number|null;winner:string;points:string[];winnerId:string}>=[];
 for(const raw of savedLegs){
  const setNo=validMetricNumber(raw?.setNo??raw?.setIndex);
  const legNo=validMetricNumber(raw?.matchLegNo??raw?.legNo??raw?.legIndex);
  const winner=String(raw?.winnerId??raw?.winner??'');
  const winnerPlayer=report.players.find(p=>matchPlayer(winner,p));
  const stats=raw?.perPlayer||raw?.statsByPlayer||{};
  const pts=report.players.map(player=>{
   const pid=String(player.participantId||'');
   let found:any=pid&&stats[pid];
   if(!found){const keys=Object.keys(stats).filter(k=>normalizedPersonKey(k)===normalizedPersonKey(player.name));
    if(keys.length===1)found=stats[keys[0]];}
   const n=validMetricNumber(found?.points??found?.totalScore);
   return n===null?'—':String(n);
  });
  allLegRows.push({set:setNo,leg:legNo,winner:winnerPlayer?.name||'—',winnerId:winner,points:pts});
  if(setNo!==null&&setNo>0)rawSets.set(setNo,[...(rawSets.get(setNo)||[]),raw]);
 }
 const setTable:string[][]=[];
 for(const [setNo,rows] of [...rawSets.entries()].sort((a,b)=>a[0]-b[0])){
  const perPlayerWins=report.players.map(p=>rows.filter(row=>matchPlayer(row?.winnerId??row?.winner,p)).length);
  const explicitWinner=rows.map(row=>row?.setWinnerId??row?.winnerSetId).find(Boolean);
  const winner=report.players.find(p=>matchPlayer(explicitWinner,p))?.name||'—';
  setTable.push([String(setNo),...perPlayerWins.map(String),winner]);
 }
 if(setTable.length){
  const columns=['SET',...report.players.map(p=>label(p.name,14)+' · LEGS'),'GAGNANT SET'];
  report.matchBreakdown={headers:columns,rows:setTable,
   note:'Legs gagnés dans chaque set ; vainqueur indiqué seulement si enregistré.'};
 }
 const x01details:ChallengeExportSection[]=[];
 if(setTable.length)x01details.push({title:'X01 · RÉSULTATS SET PAR SET',
  columns:report.matchBreakdown!.headers,rows:setTable,
  note:report.matchBreakdown!.note});
 if(allLegRows.length){
  x01details.push({title:'X01 · DÉTAIL DES LEGS',
   columns:['SET','LEG','VAINQUEUR',...report.players.map(p=>label(p.name,14)+' · PTS')],
   rows:allLegRows.map(row=>[row.set===null?'—':String(row.set),row.leg===null?'—':String(row.leg),row.winner,...row.points]),
   note:'Points marqués dans chaque leg si les statistiques ont été conservées.'});
 }
 if(report.players.length){
  x01details.push({title:'X01 · BILAN COMPLET DES JOUEURS',
   columns:['JOUEUR','SETS GAGNÉS','LEGS GAGNÉS','PTS MARQUÉS','AVG3','MEILLEURE VOLÉE'],
   rows:report.players.map(p=>{
    const v=(name:string)=>p.metrics.find(m=>m.label===name)?.value||'—';
    return [p.name,v('SETS REMPORTÉS'),v('LEGS REMPORTÉS'),v('PTS MARQUÉS'),v('AVG3'),v('BEST VOLÉE')];
   }),note:'Les points correspondent aux points marqués, jamais au restant de la dernière manche.'});
 }
 // Preserve the existing, proven detailed X01 data table used elsewhere in the report.
 report.details=[...x01details,...(report.details||[]).map(section=>({
  ...section,
  rows:section.rows.map(row=>{
   const name=String(row[0]||'').toUpperCase();
   if(name==='TOTAL SCORE')return ['PTS MARQUÉS (TOUS SETS)',...row.slice(1)];
   return row;
  }).filter(row=>!['RESTANT','REMAINING','SCORE FINAL','SCORE ENREGISTRÉ','POINTS RESTANTS'].includes(String(row[0]||'').toUpperCase())),
 }))];
 return report;
}

/**
 * Generic report from a saved history entry for other sports/modes.
 * Missing values are shown as unknown, not as invented scores.
 * Challenge entries use the specialized parser above.
 */
export function visualReportFromHistory(entry:any):ChallengeExportReport {
 const payload=entry?.payload||entry?.decoded||{};
 const summary=entry?.summary||payload?.summary||{};
 const result=summary?.result||payload?.result||{};
 const mode=resolveReportMode(entry,payload,summary);
 if(mode.includes('challenge')||String(summary?.kind||'').toLowerCase()==='challenge'){
  return challengeReportFromHistory(entry);
 }
 const pools=[
  summary?.rankings,summary?.perPlayer,summary?.players,summary?.result?.rankings,
  summary?.result?.players,payload?.summary?.rankings,payload?.summary?.perPlayer,
  result?.rankings,result?.players,result?.standings,
  payload?.stats?.players,payload?.summary?.players,payload?.players,
  payload?.finalPlayers,entry?.stats?.players,entry?.players,
 ].filter(Array.isArray) as any[][];
 const source=pools.find(pool=>pool.length)||[];
 const players:ChallengeExportPlayer[]=source.map((raw:any,index:number)=>{
  const matches=locateSavedRow(raw,pools);
  const maps=mappedStatsForPlayer(entry,payload,summary,result,raw);
  const objects=gatherStatObjects([raw,...matches,maps]);
  // Do not replace the ranking's original score with an unrelated game stat.
  const originalScore=reportValue([raw],['score','points','total','finalScore','scoreFinal','scoreTotal','totalScore']);
  const score=validMetricNumber(originalScore ?? reportValue(objects,['score','points','total','finalScore','scoreFinal','scoreTotal','totalScore']));
  const accuracy=validMetricNumber(reportValue(objects,['successRate','accuracy','hitRate','accuracyPct']));
  const darts=validMetricNumber(reportValue(objects,['dartsThrown','darts','totalDarts','dartsPlayed']));
  const bestStreak=validMetricNumber(reportValue(objects,['bestStreak','streak','longestStreak']));
  const avgVisit=validMetricNumber(reportValue(objects,['avgVisit','avgPerVisit','averageVisit']));
  const savedMetrics=actualSavedMetrics(objects);
  const finalScore=score===null?Number.NaN:score;
  const bestImageRow=[...matches,raw].find(row=>pickAvatarSource(row));
  const person=personName(raw)||matches.map(personName).find(Boolean)||'Joueur '+(index+1);
  return {
   name:person,participantId:personId(raw)||matches.map(personId).find(Boolean)||undefined,
   score:finalScore,accuracy,darts,bestStreak,avgVisit,
   visits:pickVisitScores(objects),metrics:savedMetrics,
   headlineMetrics:chooseHeadlineStats(savedMetrics,mode,finalScore),
   avatarUrl:bestImageRow?pickAvatarSource(bestImageRow):'',
  };
 });
 // Respect the saved rank; some modes rank by sets, legs or objectives.
 if(source.some(row=>row?.rank!==undefined||row?.finalRank!==undefined)){
  const rankOf=(row:any)=>validMetricNumber(row?.finalRank??row?.rank)??Number.MAX_SAFE_INTEGER;
  const indexed=players.map((player,index)=>({player,index,rank:rankOf(source[index])}));
  indexed.sort((a,b)=>a.rank-b.rank||a.index-b.index);
  players.splice(0,players.length,...indexed.map(item=>item.player));
 }
 const rawDate=entry?.finishedAt||entry?.endedAt||entry?.updatedAt||entry?.createdAt||Date.now();
 const dateObj=new Date(rawDate);
 const date=Number.isNaN(dateObj.getTime())?'Date inconnue':dateObj.toLocaleString('fr-FR');
 const title=String(summary?.title||summary?.modeLabel||entry?.game?.objective||
  (mode!=='unknown'?mode.toUpperCase():undefined)||entry?.kind||'PARTIE');
 const configSummary=reportConfig(entry,summary,payload,mode,players.length);
 const highlights:ChallengeExportMetric[]=[];
 if(Number.isFinite(players[0]?.score))highlights.push({label:'SCORE GLOBAL',value:String(players[0].score)});
 if(players.length>1)highlights.push({label:'PARTICIPANTS',value:String(players.length)});
 const duration=validMetricNumber(summary?.durationMs??payload?.summary?.durationMs);
 if(duration!==null&&duration>0)highlights.push({label:'DURÉE',value:(duration/60000).toFixed(1)+' MIN'});
 const winner=summary?.winnerName||result?.winnerName;
 if(winner)highlights.push({label:'GAGNANT',value:String(winner)});
 const details:ChallengeExportSection[]=[];
 for(const player of players){
  if(player.metrics.length){
   details.push({title:player.name.toUpperCase()+' · STATISTIQUES ENREGISTRÉES',
    columns:['INDICATEUR','VALEUR'],rows:player.metrics.map(m=>[m.label,m.value])});
  }
  if(player.visits.length){
   let total=0;
   details.push({title:player.name.toUpperCase()+' · JOURNAL DES VOLÉES',
    columns:['VOLÉE','POINTS','TOTAL CUMULÉ'],
    rows:player.visits.map((points,index)=>{total+=points;return [String(index+1),String(points),String(total)];})});
  }
 }
 if(configSummary.length){
  details.unshift({title:'PARAMÈTRES DE LA PARTIE',columns:['PARAMÈTRE','VALEUR'],
   rows:configSummary.map(m=>[m.label,m.value])});
 }
 const report:ChallengeExportReport={title,rounds:validMetricNumber(summary?.rounds??entry?.game?.rounds??summary?.visits)??0,
  unit:'tours',players,highlight:highlights,date,configSummary,
  details,tickerSrc:findTicker(entry,payload,mode),appLogoSrc:APP_LOGO_SRC,
  footerBrand:'MULTISPORTS SCORING'};
 if(/^(training_)?x01(?:$|_)/.test(mode)||mode==='501'||mode==='301'||mode==='701'||mode==='901'){
  return applyX01Report(report,entry,payload,summary,result,source);
 }
 // Use the mode's own recorded units rather than treating every result as points.
 const isPointsMode=/challenge|top_10|split_score|hi_score|count_up|shanghai|petanque|molkky|bowling|gotcha|attrape/i.test(mode);
 const usesSets=/ping.?pong|tennis|badminton/i.test(mode);
 report.players.forEach(player=>{
  if(usesSets){
   const m=player.metrics.find(v=>v.label==='SETS');
   if(m){player.scoreDisplay=m.value+' SET'+(m.value==='1'?'':'S');return;}
  }
  if(!isPointsMode){
   const m=player.metrics.find(v=>v.label==='SETS')||player.metrics.find(v=>v.label==='LEGS')||
    player.metrics.find(v=>v.label==='MATCHS GAGNÉS')||player.metrics.find(v=>v.label==='VIES');
   if(m){player.scoreDisplay=m.value+' '+m.label;return;}
   if(/golf|mini_golf/i.test(mode)){
    const shots=player.metrics.find(v=>v.label==='COUPS');
    if(shots){player.scoreDisplay=shots.value+' COUPS';return;}
   }
   if(Number.isFinite(player.score))player.scoreDisplay=String(player.score)+' · RÉSULTAT';
   else player.scoreDisplay='RÉSULTAT —';
  }else if(!player.metrics.some(m=>m.label==='PTS MARQUÉS')&&/gotcha|attrape/i.test(mode)){
   // Gotcha/Attrape-moi often ranks by captures or sets, not dart points.
   const relevant=player.metrics.find(v=>v.label==='CAPTURES')||player.metrics.find(v=>v.label==='SETS');
   if(relevant)player.scoreDisplay=relevant.value+' '+relevant.label;
  }
 });
 return report;
}

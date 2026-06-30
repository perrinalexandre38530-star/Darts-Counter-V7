// ============================================
// src/lib/cameraAutoCalibration.ts
// X01 — calibration photo automatique côté navigateur.
// Détection locale : ellipse cible + zones colorées double/triple/bull.
// Objectif : éviter le tap imprécis sur petit écran et tracer une vraie grille
// de score différenciant simples / doubles / triples / bull / double bull.
// ============================================

import { DEFAULT_CAMERA_BOARD_RINGS } from "./cameraCalibrationStore";
import type { CameraBoardRingRatios, CameraCalibrationV2 } from "./cameraCalibrationStore";

export type AutoCalibrationResult = {
  ok: boolean;
  calibration?: CameraCalibrationV2;
  confidence: number;
  message: string;
  debug?: any;
};

type EdgeCell = {
  x: number;
  y: number;
  weight: number;
};

type ColorBand = {
  inner: number;
  outer: number;
  confidence: number;
  found: boolean;
  average: number;
};

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const copy = values.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(copy.length - 1, Math.floor((copy.length - 1) * p)));
  return copy[idx] || 0;
}

function movingAverage(values: number[], radius = 2): number[] {
  if (!values.length) return [];
  return values.map((_v, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - radius; j <= i + radius; j += 1) {
      if (j < 0 || j >= values.length) continue;
      sum += values[j];
      count += 1;
    }
    return count ? sum / count : values[i];
  });
}

function luminance(data: Uint8ClampedArray, idx: number): number {
  return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
}

function colorZoneScore(data: Uint8ClampedArray, idx: number): number {
  const r = data[idx] || 0;
  const g = data[idx + 1] || 0;
  const b = data[idx + 2] || 0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max <= 0 ? 0 : (max - min) / max;
  const redDominance = Math.max(0, r - Math.max(g, b) * 0.86) / 255;
  const greenDominance = Math.max(0, g - Math.max(r, b) * 0.86) / 255;
  const redGreen = Math.max(redDominance, greenDominance);
  const contrast = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b)) / 255;
  // Les anneaux rouges/verts ont à la fois saturation et dominance de couleur.
  // On garde aussi une part de contraste pour les cibles moins saturées/usées.
  return clamp(sat * 0.58 + redGreen * 0.62 + contrast * 0.18, 0, 1);
}

function largestComponent(cells: EdgeCell[], cols: number, rows: number) {
  const key = (x: number, y: number) => `${x}:${y}`;
  const map = new Map<string, EdgeCell>();
  for (const cell of cells) map.set(key(cell.x, cell.y), cell);
  const seen = new Set<string>();
  let best: EdgeCell[] = [];

  for (const cell of cells) {
    const startKey = key(cell.x, cell.y);
    if (seen.has(startKey)) continue;
    const stack = [cell];
    const comp: EdgeCell[] = [];
    seen.add(startKey);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          const k = key(nx, ny);
          if (seen.has(k) || !map.has(k)) continue;
          seen.add(k);
          stack.push(map.get(k)!);
        }
      }
    }
    const weight = comp.reduce((s, c) => s + c.weight, 0);
    const bestWeight = best.reduce((s, c) => s + c.weight, 0);
    if (comp.length > best.length || (comp.length === best.length && weight > bestWeight)) best = comp;
  }

  return best;
}

function sampleColorProfile(image: ImageData, cal: CameraCalibrationV2, bins = 220, angularSamples = 96): number[] {
  const { width, height, data } = image;
  const raw = new Array(bins).fill(0);
  const counts = new Array(bins).fill(0);
  const cx = cal.cx;
  const cy = cal.cy;
  const rx = Math.max(0.0001, cal.rx || cal.r || 0.0001);
  const ry = Math.max(0.0001, cal.ry || cal.r || 0.0001);

  for (let i = 0; i < bins; i += 1) {
    const rr = (i + 0.5) / bins;
    for (let a = 0; a < angularSamples; a += 1) {
      const angle = (a / angularSamples) * Math.PI * 2;
      const nx = cx + Math.cos(angle) * rx * rr;
      const ny = cy + Math.sin(angle) * ry * rr;
      const px = Math.round(nx * width);
      const py = Math.round(ny * height);
      if (px < 1 || px >= width - 1 || py < 1 || py >= height - 1) continue;
      const idx = (py * width + px) * 4;
      raw[i] += colorZoneScore(data, idx);
      counts[i] += 1;
    }
  }

  const profile = raw.map((sum, i) => (counts[i] ? sum / counts[i] : 0));
  return movingAverage(profile, 2);
}

function findColorBand(
  profile: number[],
  minR: number,
  maxR: number,
  fallbackInner: number,
  fallbackOuter: number,
  minWidth = 0.012,
  maxWidth = 0.11
): ColorBand {
  const bins = profile.length || 1;
  const start = Math.max(0, Math.floor(minR * bins));
  const end = Math.min(bins - 1, Math.ceil(maxR * bins));
  const values = profile.slice(start, end + 1).filter((v) => Number.isFinite(v));
  if (values.length < 4) {
    return { inner: fallbackInner, outer: fallbackOuter, confidence: 0, found: false, average: 0 };
  }

  const p50 = percentile(values, 0.50);
  const p82 = percentile(values, 0.82);
  const p93 = percentile(values, 0.93);
  const threshold = Math.max(0.075, p50 + (p82 - p50) * 0.44, p93 * 0.52);
  const expectedCenter = (fallbackInner + fallbackOuter) / 2;
  const minBins = Math.max(2, Math.floor(minWidth * bins));
  const maxBins = Math.max(minBins + 1, Math.ceil(maxWidth * bins));

  let best: { s: number; e: number; score: number; avg: number } | null = null;
  let runStart: number | null = null;

  function closeRun(runEnd: number) {
    if (runStart == null) return;
    const s = runStart;
    const e = runEnd;
    const len = e - s + 1;
    if (len >= minBins) {
      const clampedLen = Math.min(len, maxBins);
      // Si le run est trop large, on recentre autour du pic local.
      let bestSliceStart = s;
      let bestSliceAvg = 0;
      if (len > maxBins) {
        for (let ss = s; ss <= e - maxBins + 1; ss += 1) {
          let sum = 0;
          for (let k = ss; k < ss + maxBins; k += 1) sum += profile[k] || 0;
          const avg = sum / maxBins;
          if (avg > bestSliceAvg) {
            bestSliceAvg = avg;
            bestSliceStart = ss;
          }
        }
      }
      const rs = len > maxBins ? bestSliceStart : s;
      const re = len > maxBins ? bestSliceStart + clampedLen - 1 : e;
      let sum = 0;
      for (let k = rs; k <= re; k += 1) sum += profile[k] || 0;
      const avg = sum / Math.max(1, re - rs + 1);
      const center = ((rs + re + 1) / 2) / bins;
      const width = (re - rs + 1) / bins;
      const closenessPenalty = Math.abs(center - expectedCenter) * 1.8;
      const widthBonus = Math.min(0.08, width);
      const score = avg + widthBonus - closenessPenalty;
      if (!best || score > best.score) best = { s: rs, e: re, score, avg };
    }
    runStart = null;
  }

  for (let i = start; i <= end; i += 1) {
    if ((profile[i] || 0) >= threshold) {
      if (runStart == null) runStart = i;
    } else {
      closeRun(i - 1);
    }
  }
  closeRun(end);

  if (!best) {
    return { inner: fallbackInner, outer: fallbackOuter, confidence: 0, found: false, average: percentile(values, 0.75) };
  }

  const inner = clamp((best.s - 0.5) / bins, minR, maxR);
  const outer = clamp((best.e + 1.5) / bins, inner + minWidth, maxR);
  const confidence = clamp((best.avg - p50) / Math.max(0.001, p93 - p50), 0.08, 0.95);
  return { inner, outer, confidence, found: true, average: best.avg };
}

function estimateBullOuter(profile: number[]): { innerBullOuter: number; outerBullOuter: number; confidence: number; found: boolean } {
  const fallback = DEFAULT_CAMERA_BOARD_RINGS;
  const central = findColorBand(profile, 0.012, 0.17, fallback.innerBullOuter, fallback.outerBullOuter, 0.012, 0.12);
  if (!central.found) {
    return { innerBullOuter: fallback.innerBullOuter, outerBullOuter: fallback.outerBullOuter, confidence: 0, found: false };
  }

  // La couleur centrale peut fusionner inner/outer bull. On garde les proportions officielles
  // à l'intérieur de la zone détectée pour préserver la distinction DBULL/BULL.
  const detectedOuter = clamp(central.outer, 0.07, 0.16);
  const officialSplit = fallback.innerBullOuter / fallback.outerBullOuter;
  return {
    innerBullOuter: clamp(detectedOuter * officialSplit, 0.024, 0.065),
    outerBullOuter: detectedOuter,
    confidence: central.confidence,
    found: true,
  };
}

function estimateBoardZonesFromColor(image: ImageData, cal: CameraCalibrationV2) {
  const profile = sampleColorProfile(image, cal);
  const fallback = DEFAULT_CAMERA_BOARD_RINGS;
  const bull = estimateBullOuter(profile);
  const triple = findColorBand(profile, 0.49, 0.72, fallback.tripleInner, fallback.tripleOuter, 0.024, 0.10);
  const double = findColorBand(profile, 0.84, 1.015, fallback.doubleInner, fallback.doubleOuter, 0.020, 0.11);

  const rings: CameraBoardRingRatios = {
    innerBullOuter: bull.innerBullOuter,
    outerBullOuter: bull.outerBullOuter,
    tripleInner: triple.inner,
    tripleOuter: triple.outer,
    doubleInner: double.inner,
    doubleOuter: 1.0,
  };

  // Garde-fous : si les bandes détectées sont incohérentes, on revient aux ratios officiels.
  if (rings.tripleOuter <= rings.tripleInner || rings.tripleInner < 0.45 || rings.tripleOuter > 0.78) {
    rings.tripleInner = fallback.tripleInner;
    rings.tripleOuter = fallback.tripleOuter;
    triple.found = false;
    triple.confidence = 0;
  }
  if (rings.doubleInner < 0.82 || rings.doubleInner > 1.0) {
    rings.doubleInner = fallback.doubleInner;
    rings.doubleOuter = fallback.doubleOuter;
    double.found = false;
    double.confidence = 0;
  }
  if (rings.outerBullOuter <= rings.innerBullOuter || rings.outerBullOuter > 0.18) {
    rings.innerBullOuter = fallback.innerBullOuter;
    rings.outerBullOuter = fallback.outerBullOuter;
    bull.found = false;
    bull.confidence = 0;
  }

  const foundCount = [bull.found, triple.found, double.found].filter(Boolean).length;
  const zoneConfidence = clamp((bull.confidence * 0.25 + triple.confidence * 0.38 + double.confidence * 0.37) * (0.55 + foundCount * 0.15), 0, 0.96);
  return {
    rings,
    zoneConfidence,
    foundCount,
    profilePeaks: {
      bull,
      triple,
      double,
    },
  };
}

export function detectDartboardCalibrationFromImageData(image: ImageData): AutoCalibrationResult {
  const { width, height, data } = image;
  if (!width || !height || !data?.length) {
    return { ok: false, confidence: 0, message: "Photo invalide." };
  }

  const step = Math.max(2, Math.round(Math.max(width, height) / 260));
  const gradients: number[] = [];
  const samples: Array<{ x: number; y: number; g: number }> = [];

  // Marges : on évite les bordures extrêmes qui captent souvent le décor.
  const minX = Math.floor(width * 0.04);
  const maxX = Math.floor(width * 0.96);
  const minY = Math.floor(height * 0.04);
  const maxY = Math.floor(height * 0.96);

  for (let y = minY + step; y < maxY - step; y += step) {
    for (let x = minX + step; x < maxX - step; x += step) {
      const il = (y * width + (x - step)) * 4;
      const ir = (y * width + (x + step)) * 4;
      const iu = ((y - step) * width + x) * 4;
      const id = ((y + step) * width + x) * 4;
      const gx = Math.abs(luminance(data, ir) - luminance(data, il));
      const gy = Math.abs(luminance(data, id) - luminance(data, iu));
      const g = gx + gy;
      gradients.push(g);
      samples.push({ x, y, g });
    }
  }

  if (samples.length < 50) {
    return { ok: false, confidence: 0, message: "Photo trop petite pour détecter la cible." };
  }

  const p72 = percentile(gradients, 0.72);
  const p88 = percentile(gradients, 0.88);
  const threshold = Math.max(22, p72 + (p88 - p72) * 0.22);

  const cols = 36;
  const rows = Math.max(20, Math.round(cols * (height / width)));
  const grid = new Array(cols * rows).fill(0);
  const gridHits = new Array(cols * rows).fill(0);

  for (const s of samples) {
    if (s.g < threshold) continue;
    const cx = Math.max(0, Math.min(cols - 1, Math.floor((s.x / width) * cols)));
    const cy = Math.max(0, Math.min(rows - 1, Math.floor((s.y / height) * rows)));
    const idx = cy * cols + cx;
    grid[idx] += s.g;
    gridHits[idx] += 1;
  }

  const weights = grid.filter((v) => v > 0);
  const cellThreshold = Math.max(percentile(weights, 0.48), threshold * 1.6);
  const hotCells: EdgeCell[] = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const idx = y * cols + x;
      if (grid[idx] >= cellThreshold && gridHits[idx] >= 1) hotCells.push({ x, y, weight: grid[idx] });
    }
  }

  if (hotCells.length < 8) {
    return { ok: false, confidence: 0.08, message: "Cible non détectée. Mets la cible entière dans le cadre et évite les reflets." };
  }

  const comp = largestComponent(hotCells, cols, rows);
  if (comp.length < 8) {
    return { ok: false, confidence: 0.12, message: "Cible non détectée clairement." };
  }

  let minCellX = cols;
  let maxCellX = 0;
  let minCellY = rows;
  let maxCellY = 0;
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  for (const c of comp) {
    minCellX = Math.min(minCellX, c.x);
    maxCellX = Math.max(maxCellX, c.x);
    minCellY = Math.min(minCellY, c.y);
    maxCellY = Math.max(maxCellY, c.y);
    totalWeight += c.weight;
    weightedX += (c.x + 0.5) * c.weight;
    weightedY += (c.y + 0.5) * c.weight;
  }

  const cellW = width / cols;
  const cellH = height / rows;
  const bboxX = minCellX * cellW;
  const bboxY = minCellY * cellH;
  const bboxW = Math.max(cellW, (maxCellX - minCellX + 1) * cellW);
  const bboxH = Math.max(cellH, (maxCellY - minCellY + 1) * cellH);

  const bboxCx = bboxX + bboxW / 2;
  const bboxCy = bboxY + bboxH / 2;
  const densityCx = totalWeight > 0 ? (weightedX / totalWeight) * cellW : bboxCx;
  const densityCy = totalWeight > 0 ? (weightedY / totalWeight) * cellH : bboxCy;

  // Mélange bbox + densité : la bbox donne le diamètre, la densité stabilise le centre.
  const centerX = bboxCx * 0.68 + densityCx * 0.32;
  const centerY = bboxCy * 0.68 + densityCy * 0.32;

  // Expansion légère : les contours internes ressortent plus que le bord extérieur.
  const expand = 1.10;
  const rx = (bboxW * expand) / 2 / width;
  const ry = (bboxH * expand) / 2 / height;

  const sizeRatio = Math.min(rx * 2, ry * 2);
  const centerPenalty = Math.hypot(centerX / width - 0.5, centerY / height - 0.5);
  const ellipseRatio = Math.min(rx, ry) / Math.max(rx, ry);
  const coverage = comp.length / (cols * rows);

  let confidence = 0.20;
  confidence += Math.min(0.25, coverage * 2.8);
  confidence += Math.max(0, Math.min(0.25, (sizeRatio - 0.22) * 0.9));
  confidence += Math.max(0, Math.min(0.20, ellipseRatio * 0.20));
  confidence -= Math.min(0.22, centerPenalty * 0.55);
  confidence = Math.max(0.05, Math.min(0.98, confidence));

  if (rx < 0.12 || ry < 0.12 || rx > 0.62 || ry > 0.62) {
    return {
      ok: false,
      confidence: Math.min(confidence, 0.25),
      message: "La cible semble trop petite, trop grande ou partiellement hors cadre.",
      debug: { rx, ry, bboxW, bboxH, comp: comp.length, hotCells: hotCells.length },
    };
  }

  let cal: CameraCalibrationV2 = {
    v: 2,
    cx: clamp01(centerX / width),
    cy: clamp01(centerY / height),
    rx: Math.max(0.0001, rx),
    ry: Math.max(0.0001, ry),
    r: Math.max(0.0001, (rx + ry) / 2),
    // La photo auto suppose que le téléphone est tenu droit avec le 20 en haut.
    // L'UI permet ensuite d'ajuster par boutons si le téléphone est légèrement incliné.
    a20: -Math.PI / 2,
    method: "auto-photo",
    confidence: Math.round(confidence * 100) / 100,
    rings: DEFAULT_CAMERA_BOARD_RINGS,
    updatedAt: Date.now(),
  };

  const zoneDebug = estimateBoardZonesFromColor(image, cal);
  const zoneConfidence = zoneDebug.zoneConfidence;
  const combinedConfidence = clamp(confidence * 0.72 + zoneConfidence * 0.28, 0.05, 0.98);
  cal = {
    ...cal,
    method: zoneDebug.foundCount >= 2 ? "auto-photo-zones" : "auto-photo",
    confidence: Math.round(combinedConfidence * 100) / 100,
    zoneConfidence: Math.round(zoneConfidence * 100) / 100,
    rings: zoneDebug.rings,
    updatedAt: Date.now(),
  };

  const zonesLabel = zoneDebug.foundCount >= 2
    ? "Zones double/triple/bull repérées."
    : zoneDebug.foundCount === 1
    ? "Une zone colorée repérée, ratios officiels utilisés pour le reste."
    : "Zones couleur fragiles, ratios officiels utilisés.";

  return {
    ok: true,
    calibration: cal,
    confidence: combinedConfidence,
    message: combinedConfidence >= 0.55
      ? `Cible détectée. ${zonesLabel} Vérifie l'overlay des anneaux.`
      : `Détection possible mais fragile. ${zonesLabel} Recommence plus en face si l'overlay ne colle pas.`,
    debug: { rx, ry, bboxW, bboxH, comp: comp.length, hotCells: hotCells.length, threshold, zones: zoneDebug },
  };
}

export function captureVisibleVideoFrame(video: HTMLVideoElement, container: HTMLElement, maxSize = 720): ImageData | null {
  const rect = container.getBoundingClientRect();
  const vw = Number(video.videoWidth || 0);
  const vh = Number(video.videoHeight || 0);
  if (!rect.width || !rect.height || !vw || !vh) return null;

  const scale = Math.min(1, maxSize / Math.max(rect.width, rect.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(240, Math.round(rect.width * scale));
  canvas.height = Math.max(240, Math.round(rect.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Reproduit object-fit: cover pour analyser exactement ce qui est affiché.
  const displayRatio = canvas.width / canvas.height;
  const videoRatio = vw / vh;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;
  if (videoRatio > displayRatio) {
    sw = vh * displayRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / displayRatio;
    sy = (vh - sh) / 2;
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

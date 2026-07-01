// ============================================
// src/lib/cameraAutoCalibration.ts
// X01 — calibration photo automatique côté navigateur.
// V3 précision : segmentation rouge/vert + composant cible + ellipse orientée,
// puis détection des anneaux visibles par profil radial de couleur.
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

type ColorSample = {
  x: number;
  y: number;
  color: number;
  red: number;
  green: number;
  weight: number;
  cell: number;
};

type EllipseFit = {
  cxPx: number;
  cyPx: number;
  rxPx: number;
  ryPx: number;
  phi: number;
  confidence: number;
};

type Profiles = {
  color: number[];
  red: number[];
  green: number[];
  counts: number[];
  bins: number;
};

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const copy = values.slice().sort((a, b) => a - b);
  const idx = clamp(Math.round((copy.length - 1) * p), 0, copy.length - 1);
  return copy[idx] || 0;
}

function weightedMean(values: Array<{ value: number; weight: number }>): number {
  let sum = 0;
  let weight = 0;
  for (const item of values) {
    const w = Math.max(0.0001, item.weight || 0);
    sum += item.value * w;
    weight += w;
  }
  return weight > 0 ? sum / weight : 0;
}

function weightedPercentile(values: Array<{ value: number; weight: number }>, p: number): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, v) => s + Math.max(0.0001, v.weight || 0), 0);
  const target = total * p;
  let acc = 0;
  for (const item of sorted) {
    acc += Math.max(0.0001, item.weight || 0);
    if (acc >= target) return item.value;
  }
  return sorted[sorted.length - 1].value;
}

function colorScores(data: Uint8ClampedArray, idx: number) {
  const r = data[idx] || 0;
  const g = data[idx + 1] || 0;
  const b = data[idx + 2] || 0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max <= 1 ? 0 : (max - min) / max;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

  // Les zones utiles d'une cible classique sont rouge/vert. On exige une vraie saturation,
  // mais on garde assez de tolérance pour les cibles usées ou éclairées jaune.
  const redDominance = Math.max(0, r - Math.max(g * 0.92, b * 0.88)) / 255;
  const greenDominance = Math.max(0, g - Math.max(r * 0.84, b * 0.82)) / 255;
  const red = clamp(redDominance * 1.75 + sat * 0.18 - Math.max(0, lum - 0.86) * 0.18, 0, 1);
  const green = clamp(greenDominance * 1.65 + sat * 0.16 - Math.max(0, lum - 0.86) * 0.18, 0, 1);
  const chroma = (max - min) / 255;
  const color = clamp(Math.max(red, green) * 0.82 + sat * 0.22 + chroma * 0.16, 0, 1);
  return { red, green, color };
}

function smooth(values: number[], radius = 2): number[] {
  const out = new Array(values.length).fill(0);
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let d = -radius; d <= radius; d += 1) {
      const j = i + d;
      if (j < 0 || j >= values.length) continue;
      const k = radius + 1 - Math.abs(d);
      sum += values[j] * k;
      count += k;
    }
    out[i] = count ? sum / count : values[i];
  }
  return out;
}

function collectColorSamples(image: ImageData): { samples: ColorSample[]; threshold: number; gridSize: number; cellWeights: number[] } {
  const { width, height, data } = image;
  const step = Math.max(2, Math.round(Math.max(width, height) / 620));
  const scores: number[] = [];
  const raw: Omit<ColorSample, "cell">[] = [];
  const gridSize = 56;
  const cellWeights = new Array(gridSize * gridSize).fill(0);

  const x0 = Math.floor(width * 0.015);
  const x1 = Math.ceil(width * 0.985);
  const y0 = Math.floor(height * 0.015);
  const y1 = Math.ceil(height * 0.985);

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const idx = (y * width + x) * 4;
      const { red, green, color } = colorScores(data, idx);
      scores.push(color);
      if (color > 0.055) raw.push({ x, y, red, green, color, weight: 1 + color * 4 + Math.max(red, green) * 3 });
    }
  }

  const p80 = percentile(scores, 0.80);
  const p92 = percentile(scores, 0.92);
  const p97 = percentile(scores, 0.97);
  const threshold = Math.max(0.105, p80 + (p92 - p80) * 0.25, p97 * 0.38);

  const samples: ColorSample[] = [];
  for (const pt of raw) {
    if (pt.color < threshold) continue;
    const gx = clamp(Math.floor((pt.x / Math.max(1, width)) * gridSize), 0, gridSize - 1);
    const gy = clamp(Math.floor((pt.y / Math.max(1, height)) * gridSize), 0, gridSize - 1);
    const cell = gy * gridSize + gx;
    const sample = { ...pt, cell };
    samples.push(sample);
    cellWeights[cell] += sample.weight;
  }

  return { samples, threshold, gridSize, cellWeights };
}

function pickBoardComponent(samples: ColorSample[], gridSize: number, cellWeights: number[], width: number, height: number): ColorSample[] {
  if (samples.length < 70) return [];

  const nonZero = cellWeights.filter((v) => v > 0).sort((a, b) => a - b);
  const cellThreshold = Math.max(0.8, percentile(nonZero, 0.34) * 0.55, percentile(nonZero, 0.70) * 0.18);
  const active = cellWeights.map((v) => v >= cellThreshold);
  const visited = new Array(active.length).fill(false);
  const components: Array<{ cells: Set<number>; weight: number; count: number; cx: number; cy: number }> = [];

  const neigh = [-1, 0, 1];
  for (let cell = 0; cell < active.length; cell += 1) {
    if (!active[cell] || visited[cell]) continue;
    const q = [cell];
    const cells = new Set<number>();
    let weight = 0;
    let sx = 0;
    let sy = 0;
    visited[cell] = true;
    while (q.length) {
      const c = q.shift()!;
      cells.add(c);
      const gx = c % gridSize;
      const gy = Math.floor(c / gridSize);
      const w = cellWeights[c] || 0;
      weight += w;
      sx += (gx + 0.5) * w;
      sy += (gy + 0.5) * w;
      for (const dy of neigh) {
        for (const dx of neigh) {
          if (!dx && !dy) continue;
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
          const ni = ny * gridSize + nx;
          if (!active[ni] || visited[ni]) continue;
          visited[ni] = true;
          q.push(ni);
        }
      }
    }
    if (cells.size >= 3) {
      components.push({ cells, weight, count: cells.size, cx: weight ? sx / weight / gridSize : 0.5, cy: weight ? sy / weight / gridSize : 0.5 });
    }
  }

  if (!components.length) return samples;

  const chosen = components.sort((a, b) => {
    const ac = 1 - clamp(Math.hypot(a.cx - 0.5, a.cy - 0.5) * 1.35, 0, 0.9);
    const bc = 1 - clamp(Math.hypot(b.cx - 0.5, b.cy - 0.5) * 1.35, 0, 0.9);
    return (b.weight * (1 + Math.sqrt(b.count) * 0.08) * bc) - (a.weight * (1 + Math.sqrt(a.count) * 0.08) * ac);
  })[0];

  const expanded = new Set<number>();
  for (const c of chosen.cells) {
    const gx = c % gridSize;
    const gy = Math.floor(c / gridSize);
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
        expanded.add(ny * gridSize + nx);
      }
    }
  }

  const filtered = samples.filter((pt) => expanded.has(pt.cell));
  // Garde-fou : si le composant choisi est trop maigre, on revient au nuage complet.
  if (filtered.length < Math.max(60, samples.length * 0.22)) return samples;

  // Si le composant touche presque toute l'image, il s'agit probablement d'un bruit de fond : on rogne autour du centre pondéré.
  const xs = filtered.map((p) => p.x);
  const ys = filtered.map((p) => p.y);
  const w = percentile(xs, 0.98) - percentile(xs, 0.02);
  const h = percentile(ys, 0.98) - percentile(ys, 0.02);
  if (w > width * 0.86 || h > height * 0.86) {
    const cx = weightedMean(filtered.map((p) => ({ value: p.x, weight: p.weight })));
    const cy = weightedMean(filtered.map((p) => ({ value: p.y, weight: p.weight })));
    return filtered.filter((p) => Math.hypot((p.x - cx) / width, (p.y - cy) / height) < 0.48);
  }

  return filtered;
}

function fitEllipseFromColorSamples(samples: ColorSample[], width: number, height: number): EllipseFit | null {
  if (samples.length < 70) return null;

  let cx = weightedMean(samples.map((p) => ({ value: p.x, weight: p.weight })));
  let cy = weightedMean(samples.map((p) => ({ value: p.y, weight: p.weight })));

  // Première covariance pour retrouver l'inclinaison de la cible dans la photo.
  let wSum = 0;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const p of samples) {
    const w = Math.max(0.0001, p.weight || 0);
    const dx = p.x - cx;
    const dy = p.y - cy;
    xx += dx * dx * w;
    yy += dy * dy * w;
    xy += dx * dy * w;
    wSum += w;
  }
  xx /= Math.max(1, wSum);
  yy /= Math.max(1, wSum);
  xy /= Math.max(1, wSum);
  let phi = 0.5 * Math.atan2(2 * xy, xx - yy);

  // Projection sur les axes de l'ellipse, avec percentiles robustes.
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const projected = samples.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;
    return { u, v, weight: p.weight };
  });

  const uMin = weightedPercentile(projected.map((p) => ({ value: p.u, weight: p.weight })), 0.006);
  const uMax = weightedPercentile(projected.map((p) => ({ value: p.u, weight: p.weight })), 0.994);
  const vMin = weightedPercentile(projected.map((p) => ({ value: p.v, weight: p.weight })), 0.006);
  const vMax = weightedPercentile(projected.map((p) => ({ value: p.v, weight: p.weight })), 0.994);
  const uMid = (uMin + uMax) / 2;
  const vMid = (vMin + vMax) / 2;

  cx += uMid * cos - vMid * sin;
  cy += uMid * sin + vMid * cos;

  let rx = Math.max(1, (uMax - uMin) / 2);
  let ry = Math.max(1, (vMax - vMin) / 2);

  // Normalise la taille sur les points rouges/verts les plus externes : cela colle l'ellipse au double extérieur.
  const rhos: number[] = [];
  for (const p of samples) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;
    const rho = Math.sqrt((u / rx) ** 2 + (v / ry) ** 2);
    if (Number.isFinite(rho) && rho > 0.05 && rho < 1.45) rhos.push(rho);
  }
  const outer = percentile(rhos, 0.993) || 1;
  rx *= clamp(outer, 0.82, 1.18);
  ry *= clamp(outer, 0.82, 1.18);

  const size = Math.min((rx * 2) / width, (ry * 2) / height);
  const aspect = Math.min(rx, ry) / Math.max(rx, ry);
  const centerPenalty = Math.hypot(cx / width - 0.5, cy / height - 0.5);
  if (rx < width * 0.11 || ry < height * 0.11 || rx > width * 0.64 || ry > height * 0.64) return null;

  const confidence = clamp(0.30 + size * 0.55 + aspect * 0.18 - centerPenalty * 0.28 + Math.min(0.12, samples.length / 4500), 0.10, 0.92);
  return { cxPx: cx, cyPx: cy, rxPx: rx, ryPx: ry, phi, confidence };
}

function ellipseCoords(x: number, y: number, fit: EllipseFit) {
  const cos = Math.cos(fit.phi);
  const sin = Math.sin(fit.phi);
  const dx = x - fit.cxPx;
  const dy = y - fit.cyPx;
  const u = dx * cos + dy * sin;
  const v = -dx * sin + dy * cos;
  const rho = Math.sqrt((u / Math.max(1, fit.rxPx)) ** 2 + (v / Math.max(1, fit.ryPx)) ** 2);
  const angle = Math.atan2(v / Math.max(1, fit.ryPx), u / Math.max(1, fit.rxPx));
  return { u, v, rho, angle };
}

function buildRadialProfiles(image: ImageData, fit: EllipseFit): Profiles {
  const { width, height, data } = image;
  const bins = 220;
  const color = new Array(bins).fill(0);
  const red = new Array(bins).fill(0);
  const green = new Array(bins).fill(0);
  const counts = new Array(bins).fill(0);
  const step = Math.max(1, Math.round(Math.max(width, height) / 780));

  const minX = Math.max(0, Math.floor(fit.cxPx - fit.rxPx * 1.12));
  const maxX = Math.min(width - 1, Math.ceil(fit.cxPx + fit.rxPx * 1.12));
  const minY = Math.max(0, Math.floor(fit.cyPx - fit.ryPx * 1.12));
  const maxY = Math.min(height - 1, Math.ceil(fit.cyPx + fit.ryPx * 1.12));

  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const { rho } = ellipseCoords(x, y, fit);
      if (rho < 0 || rho > 1.10) continue;
      const idx = (y * width + x) * 4;
      const s = colorScores(data, idx);
      const b = clamp(Math.floor((rho / 1.10) * bins), 0, bins - 1);
      // Pondération par saturation : les blancs/noirs des segments ne doivent pas déplacer les anneaux.
      color[b] += s.color;
      red[b] += s.red;
      green[b] += s.green;
      counts[b] += 1;
    }
  }

  for (let i = 0; i < bins; i += 1) {
    const c = Math.max(1, counts[i]);
    color[i] /= c;
    red[i] /= c;
    green[i] /= c;
  }

  return { color: smooth(color, 2), red: smooth(red, 2), green: smooth(green, 2), counts, bins };
}

function ratioToBin(ratio: number, bins: number): number {
  return clamp(Math.round((ratio / 1.10) * bins), 0, bins - 1);
}

function binToRatio(bin: number, bins: number): number {
  return (bin / Math.max(1, bins)) * 1.10;
}

function detectIntervalFromProfile(
  profile: number[],
  bins: number,
  minRatio: number,
  maxRatio: number,
  fallback: [number, number],
  opts: { minWidth?: number; maxWidth?: number; thresholdRatio?: number } = {}
): { start: number; end: number; found: boolean; peak: number } {
  const lo = ratioToBin(minRatio, bins);
  const hi = ratioToBin(maxRatio, bins);
  let peakBin = lo;
  let peak = -Infinity;
  for (let i = lo; i <= hi; i += 1) {
    if ((profile[i] || 0) > peak) {
      peak = profile[i] || 0;
      peakBin = i;
    }
  }

  const rangeValues = profile.slice(lo, hi + 1);
  const base = percentile(rangeValues, 0.38);
  const strong = percentile(rangeValues, 0.82);
  const threshold = Math.max(base + (strong - base) * 0.30, peak * (opts.thresholdRatio ?? 0.42), 0.035);

  if (!Number.isFinite(peak) || peak < Math.max(0.055, base * 1.35)) {
    return { start: fallback[0], end: fallback[1], found: false, peak: Math.max(0, peak || 0) };
  }

  let a = peakBin;
  let b = peakBin;
  while (a > lo && (profile[a - 1] || 0) >= threshold) a -= 1;
  while (b < hi && (profile[b + 1] || 0) >= threshold) b += 1;

  let start = binToRatio(a, bins);
  let end = binToRatio(b + 1, bins);
  const width = end - start;
  const minWidth = opts.minWidth ?? 0.018;
  const maxWidth = opts.maxWidth ?? 0.090;

  if (width < minWidth || width > maxWidth) {
    // Si le seuil fait une zone trop large/étroite, on garde un anneau centré sur le pic.
    const center = binToRatio(peakBin + 0.5, bins);
    const targetWidth = clamp(width || (fallback[1] - fallback[0]), minWidth, maxWidth);
    start = center - targetWidth / 2;
    end = center + targetWidth / 2;
  }

  return {
    start: clamp(start, minRatio, maxRatio),
    end: clamp(end, minRatio, maxRatio),
    found: true,
    peak: Math.max(0, peak),
  };
}

function detectCenterBullRings(profiles: Profiles): { innerBullOuter: number; outerBullOuter: number; foundInner: boolean; foundOuter: boolean } {
  const merged = profiles.color.map((v, i) => Math.max(v, profiles.red[i] || 0, profiles.green[i] || 0));
  const outer = detectIntervalFromProfile(merged, profiles.bins, 0.018, 0.160, [DEFAULT_CAMERA_BOARD_RINGS.innerBullOuter, DEFAULT_CAMERA_BOARD_RINGS.outerBullOuter], { minWidth: 0.035, maxWidth: 0.125, thresholdRatio: 0.34 });
  const red = detectIntervalFromProfile(profiles.red, profiles.bins, 0.004, 0.075, [0.005, DEFAULT_CAMERA_BOARD_RINGS.innerBullOuter], { minWidth: 0.018, maxWidth: 0.060, thresholdRatio: 0.38 });

  const outerBullOuter = outer.found ? clamp(outer.end, 0.070, 0.155) : DEFAULT_CAMERA_BOARD_RINGS.outerBullOuter;
  const innerBullOuter = red.found ? clamp(red.end, 0.022, Math.min(0.070, outerBullOuter - 0.018)) : DEFAULT_CAMERA_BOARD_RINGS.innerBullOuter;
  return { innerBullOuter, outerBullOuter, foundInner: red.found, foundOuter: outer.found };
}

function detectVisibleRings(profiles: Profiles): { rings: CameraBoardRingRatios; zoneConfidence: number; debug: any } {
  const color = profiles.color;
  const triple = detectIntervalFromProfile(color, profiles.bins, 0.48, 0.74, [DEFAULT_CAMERA_BOARD_RINGS.tripleInner, DEFAULT_CAMERA_BOARD_RINGS.tripleOuter], { minWidth: 0.024, maxWidth: 0.080, thresholdRatio: 0.40 });
  const double = detectIntervalFromProfile(color, profiles.bins, 0.84, 1.045, [DEFAULT_CAMERA_BOARD_RINGS.doubleInner, DEFAULT_CAMERA_BOARD_RINGS.doubleOuter], { minWidth: 0.030, maxWidth: 0.095, thresholdRatio: 0.38 });
  const bull = detectCenterBullRings(profiles);

  let tripleInner = triple.found ? triple.start : DEFAULT_CAMERA_BOARD_RINGS.tripleInner;
  let tripleOuter = triple.found ? triple.end : DEFAULT_CAMERA_BOARD_RINGS.tripleOuter;
  let doubleInner = double.found ? double.start : DEFAULT_CAMERA_BOARD_RINGS.doubleInner;
  let doubleOuter = double.found ? Math.max(double.end, 0.985) : DEFAULT_CAMERA_BOARD_RINGS.doubleOuter;

  // Sécurité géométrique : jamais de chevauchement triple/double, jamais d'anneau hors cible.
  doubleOuter = clamp(doubleOuter, 0.985, 1.015);
  doubleInner = clamp(doubleInner, 0.875, Math.min(0.975, doubleOuter - 0.020));
  tripleInner = clamp(tripleInner, 0.500, 0.695);
  tripleOuter = clamp(tripleOuter, Math.max(tripleInner + 0.018, 0.535), Math.min(0.760, doubleInner - 0.090));

  const rings: CameraBoardRingRatios = {
    innerBullOuter: bull.innerBullOuter,
    outerBullOuter: Math.max(bull.outerBullOuter, bull.innerBullOuter + 0.018),
    tripleInner,
    tripleOuter,
    doubleInner,
    doubleOuter,
  };

  let found = 0;
  if (triple.found) found += 1;
  if (double.found) found += 1;
  if (bull.foundOuter) found += 0.7;
  if (bull.foundInner) found += 0.5;
  const zoneConfidence = clamp(0.24 + found / 3.2 * 0.68, 0.20, 0.95);

  return { rings, zoneConfidence, debug: { triple, double, bull } };
}


type StableRingFit = EllipseFit & {
  source: "stable-ring-search";
  outerRadiusPx: number;
  colorCoverage: number;
  ringScore: number;
};

function sampleColorAt(image: ImageData, x: number, y: number) {
  const ix = clamp(Math.round(x), 0, image.width - 1);
  const iy = clamp(Math.round(y), 0, image.height - 1);
  return colorScores(image.data, (iy * image.width + ix) * 4);
}

function sampleLumaAt(image: ImageData, x: number, y: number): number {
  const ix = clamp(Math.round(x), 0, image.width - 1);
  const iy = clamp(Math.round(y), 0, image.height - 1);
  const idx = (iy * image.width + ix) * 4;
  const d = image.data;
  return ((d[idx] || 0) * 0.299 + (d[idx + 1] || 0) * 0.587 + (d[idx + 2] || 0) * 0.114) / 255;
}

function gaussian01(x: number, sigma: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(sigma) || sigma <= 0) return 0;
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

function ringMatchScore(q: number, colorWeight = 1): number {
  // Les pixels rouges/verts utiles sont normalement situés sur :
  // - bull / double bull au centre,
  // - anneau triple autour de 0.60,
  // - anneau double proche du bord extérieur de score.
  const dbull = gaussian01(q - 0.030, 0.030) * 0.55;
  const bull = gaussian01(q - 0.085, 0.045) * 0.75;
  const triple = gaussian01(q - 0.606, 0.045) * 1.00;
  const double = gaussian01(q - 0.972, 0.055) * 1.18;
  const penalty = q > 1.22 ? 0.15 : q > 1.10 ? 0.42 : 1;
  return Math.max(dbull, bull, triple, double) * penalty * colorWeight;
}

function perimeterQuality(image: ImageData, cx: number, cy: number, r: number): { score: number; coverage: number } {
  if (!Number.isFinite(r) || r <= 4) return { score: 0, coverage: 0 };
  const steps = 96;
  let sum = 0;
  let hit = 0;
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // Couleur sur le double + contraste juste après le bord extérieur.
    const c1 = sampleColorAt(image, cx + ca * r * 0.965, cy + sa * r * 0.965).color;
    const c2 = sampleColorAt(image, cx + ca * r * 0.600, cy + sa * r * 0.600).color;
    const lIn = sampleLumaAt(image, cx + ca * r * 0.985, cy + sa * r * 0.985);
    const lOut = sampleLumaAt(image, cx + ca * r * 1.045, cy + sa * r * 1.045);
    const edge = Math.abs(lIn - lOut);
    const local = c1 * 1.20 + c2 * 0.55 + edge * 0.65;
    sum += local;
    if (c1 > 0.10 || c2 > 0.10 || edge > 0.13) hit += 1;
  }
  return { score: sum / steps, coverage: hit / steps };
}

function subsampleSamples(samples: ColorSample[], maxCount = 1150): ColorSample[] {
  if (samples.length <= maxCount) return samples;
  const sorted = samples.slice().sort((a, b) => b.weight - a.weight);
  const keep: ColorSample[] = [];
  const stride = Math.max(1, Math.floor(sorted.length / maxCount));
  for (let i = 0; i < sorted.length && keep.length < maxCount; i += stride) keep.push(sorted[i]);
  return keep;
}

function estimateStableBoardFitFromColorRings(image: ImageData, samplesInput: ColorSample[]): StableRingFit | null {
  const { width, height } = image;
  const samples = subsampleSamples(samplesInput.filter((p) => p.color > 0.04), 1300);
  if (samples.length < 60) return null;

  const xs = samples.map((p) => p.x);
  const ys = samples.map((p) => p.y);
  const minX = percentile(xs, 0.02);
  const maxX = percentile(xs, 0.98);
  const minY = percentile(ys, 0.02);
  const maxY = percentile(ys, 0.98);
  const boxW = Math.max(1, maxX - minX);
  const boxH = Math.max(1, maxY - minY);
  const boxSpan = Math.max(boxW, boxH);
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  const weightedCx = weightedMean(samples.map((p) => ({ value: p.x, weight: p.weight })));
  const weightedCy = weightedMean(samples.map((p) => ({ value: p.y, weight: p.weight })));
  const boxCx = (minX + maxX) / 2;
  const boxCy = (minY + maxY) / 2;
  const startCx = weightedCx * 0.55 + boxCx * 0.45;
  const startCy = weightedCy * 0.55 + boxCy * 0.45;

  const searchX = clamp(boxSpan * 0.38, minDim * 0.035, maxDim * 0.18);
  const searchY = clamp(boxSpan * 0.38, minDim * 0.035, maxDim * 0.18);
  const steps = 7;
  let best: any = null;

  for (let yy = 0; yy < steps; yy += 1) {
    for (let xx = 0; xx < steps; xx += 1) {
      const cx = startCx + ((xx - (steps - 1) / 2) / ((steps - 1) / 2)) * searchX;
      const cy = startCy + ((yy - (steps - 1) / 2) / ((steps - 1) / 2)) * searchY;
      if (cx < width * 0.04 || cx > width * 0.96 || cy < height * 0.04 || cy > height * 0.96) continue;

      const distances = samples.map((p) => ({ value: Math.hypot(p.x - cx, p.y - cy), weight: p.weight * (1 + p.color) }));
      const p86 = weightedPercentile(distances, 0.86);
      const p92 = weightedPercentile(distances, 0.92);
      const p96 = weightedPercentile(distances, 0.965);
      const baseR = clamp(p96, Math.max(30, minDim * 0.10), minDim * 0.72);
      const candidates = [p86 / 0.98, p92 / 0.995, baseR, baseR * 1.035, baseR * 0.965]
        .filter((v) => Number.isFinite(v) && v > minDim * 0.08 && v < minDim * 0.78);

      for (const rawR of candidates) {
        const r = clamp(rawR, Math.max(28, minDim * 0.09), minDim * 0.78);
        let ringScore = 0;
        let totalWeight = 0;
        let outsidePenalty = 0;
        for (const p of samples) {
          const q = Math.hypot(p.x - cx, p.y - cy) / Math.max(1, r);
          const w = p.weight * (0.45 + p.color * 1.3 + Math.max(p.red, p.green) * 0.7);
          ringScore += ringMatchScore(q, 1) * w;
          totalWeight += w;
          if (q > 1.18) outsidePenalty += w * Math.min(1.5, q - 1.18);
        }
        ringScore = totalWeight ? ringScore / totalWeight : 0;
        const perim = perimeterQuality(image, cx, cy, r);
        const sizePrior = clamp((r / Math.max(1, minDim) - 0.16) / 0.26, 0, 1);
        const centerPrior = 1 - clamp(Math.hypot(cx / width - 0.5, cy / height - 0.5) * 0.45, 0, 0.35);
        const score = (ringScore * 0.72 + perim.score * 0.25 + perim.coverage * 0.13 + sizePrior * 0.05) * centerPrior - outsidePenalty / Math.max(1, totalWeight) * 0.42;
        if (!best || score > best.score) best = { cx, cy, r, score, ringScore, coverage: perim.coverage };
      }
    }
  }

  if (!best || best.score < 0.08) return null;

  // Raffinement très limité : on garde un cercle/ellipse quasi stable pour éviter les ellipses absurdes
  // dues à des zones colorées partielles. Les réglages largeur/hauteur permettent ensuite une correction fine.
  let rx = best.r;
  let ry = best.r;
  const aspectFromBox = clamp(boxW / Math.max(1, boxH), 0.78, 1.22);
  if (boxW > minDim * 0.18 && boxH > minDim * 0.18) {
    rx = best.r * Math.sqrt(aspectFromBox);
    ry = best.r / Math.sqrt(aspectFromBox);
  }

  // Ne jamais laisser une ellipse sortir massivement de l'image : c'était la source des gros décalages.
  const maxRx = Math.min(best.cx / 0.84, (width - best.cx) / 0.84, minDim * 0.76);
  const maxRy = Math.min(best.cy / 0.84, (height - best.cy) / 0.84, minDim * 0.76);
  rx = clamp(rx, minDim * 0.09, Math.max(minDim * 0.10, maxRx));
  ry = clamp(ry, minDim * 0.09, Math.max(minDim * 0.10, maxRy));

  return {
    cxPx: best.cx,
    cyPx: best.cy,
    rxPx: rx,
    ryPx: ry,
    phi: 0,
    confidence: clamp(0.35 + best.score * 1.4 + best.coverage * 0.28, 0.20, 0.92),
    source: "stable-ring-search",
    outerRadiusPx: best.r,
    colorCoverage: best.coverage,
    ringScore: best.ringScore,
  };
}

function estimateTop20AngleFromDarkNumberRing(image: ImageData, fit: EllipseFit): { angle: number; confidence: number } {
  // La lecture OCR des chiffres serait trop lourde. On garde donc le 20 en haut par défaut,
  // mais on tient compte de la rotation physique de l'ellipse afin que les secteurs restent cohérents.
  // L'utilisateur peut corriger avec les boutons 20 ±1/±5°.
  return { angle: -Math.PI / 2 - fit.phi * 0.08, confidence: 0.35 };
}

export function detectDartboardCalibrationFromImageData(image: ImageData): AutoCalibrationResult {
  const { width, height, data } = image;
  if (!width || !height || !data?.length) {
    return { ok: false, confidence: 0, message: "Photo invalide." };
  }

  const collected = collectColorSamples(image);
  if (collected.samples.length < 70) {
    return { ok: false, confidence: 0.08, message: "Pas assez de rouge/vert détecté. Cadre la cible entière, chiffres visibles autour, sans gros reflet." };
  }

  const boardSamples = pickBoardComponent(collected.samples, collected.gridSize, collected.cellWeights, width, height);

  // V4 : on ne déduit plus l'ellipse depuis la covariance brute des couleurs.
  // On cherche d'abord un centre + rayon qui fait coïncider les pixels rouge/vert avec les anneaux réels
  // d'une cible : double extérieur, triple, bull. C'est beaucoup plus stable et ça évite les ellipses verticales
  // ou les doubles hors cible.
  const stableFit = estimateStableBoardFitFromColorRings(image, boardSamples.length >= 70 ? boardSamples : collected.samples);
  const fallbackFit = !stableFit ? fitEllipseFromColorSamples(boardSamples) : null;
  const fit = stableFit || fallbackFit;
  if (!fit) {
    return { ok: false, confidence: 0.12, message: "Cible non détectée proprement. Mets la cible entière dans le cadre avec les chiffres visibles autour, puis reprends la photo." };
  }

  const profiles = buildRadialProfiles(image, fit);
  const visible = detectVisibleRings(profiles);
  const top = estimateTop20AngleFromDarkNumberRing(image, fit);

  const stableBonus = stableFit ? 0.10 : 0;
  const confidence = clamp(fit.confidence * 0.58 + visible.zoneConfidence * 0.34 + top.confidence * 0.04 + stableBonus, 0.12, 0.97);
  const size = Math.min((fit.rxPx * 2) / width, (fit.ryPx * 2) / height);
  if (size < 0.22) {
    return {
      ok: false,
      confidence: Math.min(confidence, 0.25),
      message: "La cible est trop petite dans l'image. Rapproche le téléphone ou zoome : on doit voir nettement doubles, triples, bull et chiffres autour.",
      debug: { collected, fit, visible },
    };
  }

  const cal: CameraCalibrationV2 = {
    v: 2,
    cx: clamp01(fit.cxPx / width),
    cy: clamp01(fit.cyPx / height),
    rx: Math.max(0.0001, fit.rxPx / width),
    ry: Math.max(0.0001, fit.ryPx / height),
    r: Math.max(0.0001, ((fit.rxPx / width) + (fit.ryPx / height)) / 2),
    phi: fit.phi || 0,
    a20: top.angle,
    method: stableFit ? "auto-photo-cible-v4" : "auto-photo-couleurs-v3",
    confidence: Math.round(confidence * 100) / 100,
    zoneConfidence: Math.round(visible.zoneConfidence * 100) / 100,
    rings: visible.rings,
    updatedAt: Date.now(),
  };

  const message = stableFit
    ? "Cible détectée par recherche stable : centre + extérieur recalés sur les zones rouge/vert visibles, chiffres attendus juste autour. Vérifie simplement que le contour cyan suit le bord du double."
    : confidence >= 0.68
    ? "Cible détectée par couleurs. Vérifie que les bandes double/triple collent à la photo."
    : "Détection à vérifier : utilise les réglages centre/taille si le contour cyan ne suit pas la cible.";

  return {
    ok: true,
    calibration: cal,
    confidence,
    message,
    debug: {
      threshold: collected.threshold,
      samples: collected.samples.length,
      boardSamples: boardSamples.length,
      fit,
      stableFit,
      visible,
      rings: visible.rings,
    },
  };
}

export function captureVisibleVideoFrame(video: HTMLVideoElement, container: HTMLElement, maxSize = 900): ImageData | null {
  const rect = container.getBoundingClientRect();
  const vw = Number(video.videoWidth || 0);
  const vh = Number(video.videoHeight || 0);
  if (!rect.width || !rect.height || !vw || !vh) return null;

  const scale = Math.min(1, maxSize / Math.max(rect.width, rect.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(260, Math.round(rect.width * scale));
  canvas.height = Math.max(260, Math.round(rect.height * scale));
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

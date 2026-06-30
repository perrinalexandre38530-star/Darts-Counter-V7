// ============================================
// src/lib/cameraAutoCalibration.ts
// X01 — calibration photo automatique côté navigateur.
// Version précision : détection robuste du bord extérieur par couleur + gradient,
// puis anneaux officiels normalisés pour éviter les doubles/triples incohérents.
// ============================================

import { DEFAULT_CAMERA_BOARD_RINGS } from "./cameraCalibrationStore";
import type { CameraCalibrationV2 } from "./cameraCalibrationStore";

export type AutoCalibrationResult = {
  ok: boolean;
  calibration?: CameraCalibrationV2;
  confidence: number;
  message: string;
  debug?: any;
};

type SamplePoint = {
  x: number;
  y: number;
  color: number;
  edge: number;
  weight: number;
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  count: number;
  source: "color" | "edge" | "mixed";
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
  const idx = Math.max(0, Math.min(copy.length - 1, Math.round((copy.length - 1) * p)));
  return copy[idx] || 0;
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
  const red = Math.max(0, r - Math.max(g, b) * 0.82) / 255;
  const green = Math.max(0, g - Math.max(r, b) * 0.82) / 255;
  const rgDominance = Math.max(red, green);
  const contrast = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b)) / 255;
  const brightnessPenalty = max < 26 ? 0.35 : 0;
  return clamp(sat * 0.55 + rgDominance * 0.82 + contrast * 0.18 - brightnessPenalty, 0, 1);
}

function edgeMagnitude(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, step: number): number {
  const xl = Math.max(0, x - step);
  const xr = Math.min(width - 1, x + step);
  const yu = Math.max(0, y - step);
  const yd = Math.min(height - 1, y + step);
  const il = (y * width + xl) * 4;
  const ir = (y * width + xr) * 4;
  const iu = (yu * width + x) * 4;
  const id = (yd * width + x) * 4;
  const gx = Math.abs(luminance(data, ir) - luminance(data, il));
  const gy = Math.abs(luminance(data, id) - luminance(data, iu));
  return gx + gy;
}

function weightedPercentile(points: SamplePoint[], axis: "x" | "y", p: number): number {
  if (!points.length) return 0;
  const sorted = points.slice().sort((a, b) => a[axis] - b[axis]);
  const total = sorted.reduce((s, pt) => s + Math.max(0.0001, pt.weight || 0), 0);
  const target = total * p;
  let acc = 0;
  for (const pt of sorted) {
    acc += Math.max(0.0001, pt.weight || 0);
    if (acc >= target) return pt[axis];
  }
  return sorted[sorted.length - 1][axis];
}

function boundsFromPoints(points: SamplePoint[], width: number, height: number, source: Bounds["source"]): Bounds | null {
  if (points.length < 45) return null;

  // On rogne les extrêmes pour ignorer reflets, meubles, bords de meuble ou scoreboards.
  const minX = weightedPercentile(points, "x", 0.015);
  const maxX = weightedPercentile(points, "x", 0.985);
  const minY = weightedPercentile(points, "y", 0.015);
  const maxY = weightedPercentile(points, "y", 0.985);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = w / 2;
  const ry = h / 2;

  if (rx < width * 0.10 || ry < height * 0.10 || rx > width * 0.58 || ry > height * 0.58) return null;

  return { minX, maxX, minY, maxY, cx, cy, rx, ry, count: points.length, source };
}

function collectBoardSamples(image: ImageData) {
  const { width, height, data } = image;
  const step = Math.max(2, Math.round(Math.max(width, height) / 430));
  const colors: number[] = [];
  const edges: number[] = [];
  const raw: SamplePoint[] = [];

  const minX = Math.floor(width * 0.025);
  const maxX = Math.floor(width * 0.975);
  const minY = Math.floor(height * 0.025);
  const maxY = Math.floor(height * 0.975);

  for (let y = minY + step; y < maxY - step; y += step) {
    for (let x = minX + step; x < maxX - step; x += step) {
      const idx = (y * width + x) * 4;
      const color = colorZoneScore(data, idx);
      const edge = edgeMagnitude(data, width, height, x, y, step);
      colors.push(color);
      edges.push(edge);
      raw.push({ x, y, color, edge, weight: 1 });
    }
  }

  const c70 = percentile(colors, 0.70);
  const c90 = percentile(colors, 0.90);
  const c96 = percentile(colors, 0.96);
  const e72 = percentile(edges, 0.72);
  const e90 = percentile(edges, 0.90);
  const e96 = percentile(edges, 0.96);
  const colorThreshold = Math.max(0.145, c70 + (c90 - c70) * 0.30, c96 * 0.44);
  const edgeThreshold = Math.max(20, e72 + (e90 - e72) * 0.38, e96 * 0.44);

  const colorPoints: SamplePoint[] = [];
  const edgePoints: SamplePoint[] = [];
  const mixedPoints: SamplePoint[] = [];

  for (const pt of raw) {
    if (pt.color >= colorThreshold) {
      colorPoints.push({ ...pt, weight: 1 + pt.color * 3.2 });
    }
    if (pt.edge >= edgeThreshold) {
      edgePoints.push({ ...pt, weight: 1 + Math.min(4, pt.edge / Math.max(1, edgeThreshold)) });
    }
    if (pt.color >= colorThreshold * 0.72 || pt.edge >= edgeThreshold * 1.08) {
      mixedPoints.push({ ...pt, weight: 1 + pt.color * 2.4 + Math.min(2.5, pt.edge / Math.max(1, edgeThreshold)) });
    }
  }

  return { raw, colorPoints, edgePoints, mixedPoints, colorThreshold, edgeThreshold, step };
}

function chooseInitialBounds(image: ImageData): Bounds | null {
  const { width, height } = image;
  const samples = collectBoardSamples(image);
  const colorBounds = boundsFromPoints(samples.colorPoints, width, height, "color");
  const edgeBounds = boundsFromPoints(samples.edgePoints, width, height, "edge");
  const mixedBounds = boundsFromPoints(samples.mixedPoints, width, height, "mixed");

  const candidates = [colorBounds, mixedBounds, edgeBounds].filter(Boolean) as Bounds[];
  if (!candidates.length) return null;

  const scoreBounds = (b: Bounds) => {
    const widthRatio = (b.rx * 2) / width;
    const heightRatio = (b.ry * 2) / height;
    const ellipseRatio = Math.min(b.rx / width, b.ry / height) / Math.max(b.rx / width, b.ry / height);
    const areaScore = clamp(Math.min(widthRatio, heightRatio), 0, 1);
    const centerScore = 1 - clamp(Math.hypot(b.cx / width - 0.5, b.cy / height - 0.5) * 1.4, 0, 1);
    const sourceBonus = b.source === "color" ? 0.22 : b.source === "mixed" ? 0.12 : 0;
    return sourceBonus + areaScore * 0.50 + ellipseRatio * 0.22 + centerScore * 0.18 + Math.min(0.12, b.count / 2000);
  };

  return candidates.sort((a, b) => scoreBounds(b) - scoreBounds(a))[0] || null;
}

function sampleScoreAt(image: ImageData, x: number, y: number, step = 2): { color: number; edge: number; score: number } | null {
  const { width, height, data } = image;
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < step || px >= width - step || py < step || py >= height - step) return null;
  const idx = (py * width + px) * 4;
  const color = colorZoneScore(data, idx);
  const edge = edgeMagnitude(data, width, height, px, py, step);
  return { color, edge, score: color * 1.35 + Math.min(1.15, edge / 115) };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  return percentile(values, 0.5);
}

function refineOuterEllipseByRays(image: ImageData, initial: Bounds) {
  const { width, height } = image;
  const goodRadii: number[] = [];
  const edgeRadii: number[] = [];
  const samplesByAngle: Array<{ angle: number; rr: number; score: number }> = [];

  const angleCount = 144;
  for (let i = 0; i < angleCount; i += 1) {
    const a = (i / angleCount) * Math.PI * 2;
    let bestOuter: { rr: number; score: number } | null = null;
    let bestAny: { rr: number; score: number } | null = null;

    // On cherche le bord extérieur du double, donc surtout la zone 0.88..1.12.
    for (let rr = 0.70; rr <= 1.16; rr += 0.01) {
      const x = initial.cx + Math.cos(a) * initial.rx * rr;
      const y = initial.cy + Math.sin(a) * initial.ry * rr;
      const sample = sampleScoreAt(image, x, y, 2);
      if (!sample) continue;
      const score = sample.score;
      const item = { rr, score };
      if (!bestAny || score > bestAny.score) bestAny = item;
      if (rr >= 0.86 && (!bestOuter || score > bestOuter.score)) bestOuter = item;
    }

    const chosen = bestOuter && bestOuter.score >= 0.18 ? bestOuter : bestAny;
    if (chosen && chosen.score >= 0.16) {
      samplesByAngle.push({ angle: a, rr: chosen.rr, score: chosen.score });
      if (chosen.rr >= 0.78 && chosen.rr <= 1.16) goodRadii.push(chosen.rr);
      if (chosen.rr >= 0.88 && chosen.rr <= 1.14) edgeRadii.push(chosen.rr);
    }
  }

  const usable = edgeRadii.length >= 24 ? edgeRadii : goodRadii;
  const rawScale = usable.length ? median(usable) : 1;
  // Garde-fou : on ne laisse jamais une détection couleur agrandir brutalement le board.
  // Les erreurs vues par l'utilisateur étaient surtout des overlays trop grands / hors cible.
  const scale = clamp(rawScale, 0.84, 1.045);
  const confidence = clamp(usable.length / angleCount, 0, 1);
  return {
    cx: initial.cx / width,
    cy: initial.cy / height,
    rx: (initial.rx * scale) / width,
    ry: (initial.ry * scale) / height,
    scale,
    rawScale,
    confidence,
    rayHits: usable.length,
    samplesByAngle: samplesByAngle.slice(0, 20),
  };
}

function estimateBullCenter(image: ImageData, cal: { cx: number; cy: number; rx: number; ry: number }) {
  const { width, height, data } = image;
  const cx = cal.cx * width;
  const cy = cal.cy * height;
  const rx = cal.rx * width;
  const ry = cal.ry * height;
  let sum = 0;
  let sx = 0;
  let sy = 0;
  const step = Math.max(1, Math.round(Math.max(width, height) / 650));

  for (let y = Math.max(1, Math.floor(cy - ry * 0.18)); y <= Math.min(height - 2, Math.ceil(cy + ry * 0.18)); y += step) {
    for (let x = Math.max(1, Math.floor(cx - rx * 0.18)); x <= Math.min(width - 2, Math.ceil(cx + rx * 0.18)); x += step) {
      const nx = (x - cx) / Math.max(1, rx);
      const ny = (y - cy) / Math.max(1, ry);
      const d = Math.sqrt(nx * nx + ny * ny);
      if (d > 0.18) continue;
      const idx = (y * width + x) * 4;
      const color = colorZoneScore(data, idx);
      if (color < 0.12) continue;
      const w = color * (1 - d * 2.8);
      if (w <= 0) continue;
      sum += w;
      sx += x * w;
      sy += y * w;
    }
  }

  if (sum <= 0) return { found: false, cx: cal.cx, cy: cal.cy, confidence: 0 };
  const nx = sx / sum / width;
  const ny = sy / sum / height;
  const shift = Math.hypot(nx - cal.cx, ny - cal.cy);
  if (shift > Math.max(cal.rx, cal.ry) * 0.08) return { found: false, cx: cal.cx, cy: cal.cy, confidence: 0 };
  return { found: true, cx: cal.cx * 0.55 + nx * 0.45, cy: cal.cy * 0.55 + ny * 0.45, confidence: clamp(1 - shift / Math.max(0.0001, Math.max(cal.rx, cal.ry) * 0.08), 0, 1) };
}

export function detectDartboardCalibrationFromImageData(image: ImageData): AutoCalibrationResult {
  const { width, height, data } = image;
  if (!width || !height || !data?.length) {
    return { ok: false, confidence: 0, message: "Photo invalide." };
  }

  const initial = chooseInitialBounds(image);
  if (!initial) {
    return { ok: false, confidence: 0.08, message: "Cible non détectée. Cadre la cible entière, avec les doubles visibles sur les bords." };
  }

  const refined = refineOuterEllipseByRays(image, initial);
  let cx = refined.cx;
  let cy = refined.cy;
  let rx = refined.rx;
  let ry = refined.ry;

  const bull = estimateBullCenter(image, { cx, cy, rx, ry });
  if (bull.found) {
    cx = bull.cx;
    cy = bull.cy;
  }

  const size = Math.min(rx * 2, ry * 2);
  const aspect = Math.min(rx, ry) / Math.max(rx, ry);
  const centerPenalty = Math.hypot(cx - 0.5, cy - 0.5);
  let confidence = 0.18;
  confidence += initial.source === "color" ? 0.22 : initial.source === "mixed" ? 0.14 : 0.05;
  confidence += clamp(refined.confidence * 0.26, 0, 0.26);
  confidence += clamp((size - 0.20) * 0.75, 0, 0.18);
  confidence += clamp(aspect * 0.12, 0, 0.12);
  confidence += bull.found ? clamp(bull.confidence * 0.10, 0, 0.10) : 0;
  confidence -= clamp(centerPenalty * 0.35, 0, 0.14);
  confidence = clamp(confidence, 0.08, 0.94);

  if (rx < 0.12 || ry < 0.12 || rx > 0.60 || ry > 0.60) {
    return {
      ok: false,
      confidence: Math.min(confidence, 0.28),
      message: "La cible semble trop petite, trop grande ou partiellement hors cadre. Reprends une photo avec tout l'anneau double visible.",
      debug: { initial, refined, bull, rx, ry },
    };
  }

  const officialRings = DEFAULT_CAMERA_BOARD_RINGS;
  const cal: CameraCalibrationV2 = {
    v: 2,
    cx: clamp01(cx),
    cy: clamp01(cy),
    rx: Math.max(0.0001, rx),
    ry: Math.max(0.0001, ry),
    r: Math.max(0.0001, (rx + ry) / 2),
    a20: -Math.PI / 2,
    method: "auto-photo-zones",
    confidence: Math.round(confidence * 100) / 100,
    zoneConfidence: Math.round((initial.source === "color" ? 0.78 : 0.52) * refined.confidence * 100) / 100,
    // Important précision : les anneaux d'une cible bristle sont standardisés.
    // On utilise les couleurs pour trouver l'ellipse extérieure, puis les ratios officiels
    // pour éviter qu'une mauvaise lumière confonde triple et double.
    rings: officialRings,
    updatedAt: Date.now(),
  };

  const message = confidence >= 0.62
    ? "Cible recalée avec bord extérieur + ratios officiels double/triple/bull. Vérifie que le cyan suit l'extérieur du double."
    : "Détection fragile mais corrigée avec ratios officiels. Ajuste Taille/Centre si l'overlay ne colle pas parfaitement.";

  return {
    ok: true,
    calibration: cal,
    confidence,
    message,
    debug: { initial, refined, bull, rings: officialRings },
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

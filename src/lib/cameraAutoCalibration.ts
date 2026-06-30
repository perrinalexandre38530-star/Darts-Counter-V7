// ============================================
// src/lib/cameraAutoCalibration.ts
// X01 — calibration photo automatique côté navigateur.
// Pas de dépendance IA lourde : détection locale par densité de contours.
// Objectif : éviter le tap imprécis sur petit écran et fournir une base fiable,
// avec ajustement manuel possible.
// ============================================

import type { CameraCalibrationV2 } from "./cameraCalibrationStore";

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

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const copy = values.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(copy.length - 1, Math.floor((copy.length - 1) * p)));
  return copy[idx] || 0;
}

function luminance(data: Uint8ClampedArray, idx: number): number {
  return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
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
      const i = (y * width + x) * 4;
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

  const cal: CameraCalibrationV2 = {
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
    updatedAt: Date.now(),
  };

  return {
    ok: true,
    calibration: cal,
    confidence,
    message: confidence >= 0.55
      ? "Cible détectée. Vérifie le cercle cyan puis ajuste l'orientation si besoin."
      : "Détection possible mais fragile : vérifie le cercle cyan ou recommence la photo plus en face.",
    debug: { rx, ry, bboxW, bboxH, comp: comp.length, hotCells: hotCells.length, threshold },
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

// ============================================
// src/lib/cameraScoringEngine.ts
// Caméra assistée X01 — mapping tap -> (segment, multiplier)
// - V1 : cercle simple
// - V2 : ellipse issue de la calibration photo automatique
// ============================================

import type { CameraCalibration } from "./cameraCalibrationStore";

export type CameraScoredDart = {
  segment: number | 25;
  multiplier: 0 | 1 | 2 | 3;
};

// Ordre standard autour du board, en sens horaire, depuis le 20 (en haut)
const BOARD_NUMBERS: number[] = [
  20, 1, 18, 4, 13,
  6, 10, 15, 2, 17,
  3, 19, 7, 16, 8,
  11, 14, 9, 12, 5,
];

// Ratios pratiques en proportion du rayon extérieur.
const RATIO_BULL_OUTER = 0.060;
const RATIO_25_OUTER = 0.160;
const RATIO_TRIPLE_INNER = 0.540;
const RATIO_TRIPLE_OUTER = 0.610;
const RATIO_DOUBLE_INNER = 0.930;

function normAngle(a: number): number {
  const twopi = Math.PI * 2;
  let x = a % twopi;
  if (x < 0) x += twopi;
  return x;
}

function getNormalizedVector(cal: CameraCalibration, xNorm: number, yNorm: number) {
  const dx = xNorm - cal.cx;
  const dy = yNorm - cal.cy;

  if (cal.v === 2) {
    const rx = Math.max(0.0001, Number(cal.rx || cal.r || 0.0001));
    const ry = Math.max(0.0001, Number(cal.ry || cal.r || 0.0001));
    return {
      nx: dx / rx,
      ny: dy / ry,
      dist: Math.sqrt((dx / rx) * (dx / rx) + (dy / ry) * (dy / ry)),
    };
  }

  const r = Math.max(0.0001, Number(cal.r || 0.0001));
  return {
    nx: dx / r,
    ny: dy / r,
    dist: Math.sqrt((dx / r) * (dx / r) + (dy / r) * (dy / r)),
  };
}

export function scoreTap(
  cal: CameraCalibration,
  xNorm: number,
  yNorm: number
): CameraScoredDart {
  const { nx, ny, dist } = getNormalizedVector(cal, xNorm, yNorm);

  if (dist > 1.05) {
    return { segment: 0, multiplier: 0 };
  }

  const aTap = Math.atan2(ny, nx);
  const rel = normAngle(aTap - cal.a20);
  const sectorSize = (Math.PI * 2) / 20;
  const idx = Math.floor((rel + sectorSize / 2) / sectorSize) % 20;
  const segment = BOARD_NUMBERS[idx] as number;

  const rr = dist;

  if (rr <= RATIO_BULL_OUTER) {
    return { segment: 25, multiplier: 2 };
  }
  if (rr <= RATIO_25_OUTER) {
    return { segment: 25, multiplier: 1 };
  }
  if (rr >= RATIO_DOUBLE_INNER && rr <= 1.02) {
    return { segment, multiplier: 2 };
  }
  if (rr >= RATIO_TRIPLE_INNER && rr <= RATIO_TRIPLE_OUTER) {
    return { segment, multiplier: 3 };
  }

  return { segment, multiplier: 1 };
}

// Compat anciens composants CameraTapScorer.tsx.
export type CameraTap = { x: number; y: number };
export type CameraDart = CameraScoredDart;

export function buildCalibrationFromTaps(bull: CameraTap, outer: CameraTap, top20: CameraTap) {
  const dx = outer.x - bull.x;
  const dy = outer.y - bull.y;
  const r = Math.sqrt(dx * dx + dy * dy);
  return {
    v: 1 as const,
    cx: bull.x,
    cy: bull.y,
    r: Math.max(0.0001, r),
    a20: Math.atan2(top20.y - bull.y, top20.x - bull.x),
    updatedAt: Date.now(),
  };
}

export function mapTapToDart(cal: CameraCalibration | null | undefined, tap: CameraTap | null | undefined): CameraDart | null {
  if (!cal || !tap) return null;
  return scoreTap(cal, tap.x, tap.y);
}

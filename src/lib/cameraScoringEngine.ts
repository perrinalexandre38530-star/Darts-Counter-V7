// ============================================
// src/lib/cameraScoringEngine.ts
// Caméra assistée X01 — mapping tap -> (segment, multiplier)
// - V1 : cercle simple
// - V2 : ellipse + ratios anneaux issus de la calibration photo avancée
// ============================================

import { getCameraCalibrationRings } from "./cameraCalibrationStore";
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
    const phi = Number((cal as any).phi || 0);
    const cos = Math.cos(phi);
    const sin = Math.sin(phi);
    // Inverse la rotation de l’ellipse détectée sur la photo : scoring stable même si
    // le téléphone voit la cible légèrement inclinée ou tournée.
    const ux = dx * cos + dy * sin;
    const uy = -dx * sin + dy * cos;
    return {
      nx: ux / rx,
      ny: uy / ry,
      dist: Math.sqrt((ux / rx) * (ux / rx) + (uy / ry) * (uy / ry)),
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
  const rings = getCameraCalibrationRings(cal);

  if (dist > Math.max(1.035, rings.doubleOuter + 0.035)) {
    return { segment: 0, multiplier: 0 };
  }

  const aTap = Math.atan2(ny, nx);
  const rel = normAngle(aTap - cal.a20);
  const sectorSize = (Math.PI * 2) / 20;
  const idx = Math.floor((rel + sectorSize / 2) / sectorSize) % 20;
  const segment = BOARD_NUMBERS[idx] as number;

  const rr = dist;

  // Bull / double bull : ratios calibrés ou standard cible bristle.
  if (rr <= rings.innerBullOuter) {
    return { segment: 25, multiplier: 2 };
  }
  if (rr <= rings.outerBullOuter) {
    return { segment: 25, multiplier: 1 };
  }

  // Double et triple : priorité aux anneaux calibrés par photo/couleur.
  if (rr >= rings.doubleInner && rr <= Math.max(rings.doubleOuter, 1.0) + 0.018) {
    return { segment, multiplier: 2 };
  }
  if (rr >= rings.tripleInner && rr <= rings.tripleOuter) {
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
    method: "manual",
    updatedAt: Date.now(),
  };
}

export function mapTapToDart(cal: CameraCalibration | null | undefined, tap: CameraTap | null | undefined): CameraDart | null {
  if (!cal || !tap) return null;
  return scoreTap(cal, tap.x, tap.y);
}

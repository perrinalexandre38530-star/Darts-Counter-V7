// ============================================
// src/lib/cameraScoringEngine.ts
// Caméra assistée (tap-to-score) — mapping tap -> (segment, multiplier)
// - Nécessite calibration v1 (centre, rayon, orientation 20)
// - V1: pas de correction perspective (homographie) -> suffisante si cadrage correct
// ============================================

import type { CameraCalibrationV1 } from "./cameraCalibrationStore";

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

// Ratios approximatifs (board standard) en proportion du rayon extérieur
// Note: ce sont des valeurs pratiques, pas des mesures officielles au millimètre.
// Les transitions (simple/triple/double) sont suffisamment robustes pour un tap.
const RATIO_BULL_OUTER = 0.060; // bull (25) jusqu'au bord bull
const RATIO_25_OUTER = 0.160;   // outer bull (25)
const RATIO_TRIPLE_INNER = 0.540;
const RATIO_TRIPLE_OUTER = 0.610;
const RATIO_DOUBLE_INNER = 0.930;

function normAngle(a: number): number {
  const twopi = Math.PI * 2;
  let x = a % twopi;
  if (x < 0) x += twopi;
  return x;
}

export function scoreTap(
  cal: CameraCalibrationV1,
  xNorm: number,
  yNorm: number
): CameraScoredDart {
  // vecteur depuis centre
  const dx = xNorm - cal.cx;
  const dy = yNorm - cal.cy;

  const dist = Math.sqrt(dx * dx + dy * dy);

  // dehors
  if (dist > cal.r * 1.05) {
    return { segment: 0, multiplier: 0 };
  }

  // angle tap (0 à droite, PI/2 en bas)
  const aTap = Math.atan2(dy, dx);

  // Convertit en angle "board" où 20 est en haut.
  // Notre a20 est l'angle où se trouve le centre du segment 20.
  // On veut un angle relatif à 20.
  // Découpage en 20 secteurs égaux.
  const rel = normAngle(aTap - cal.a20);

  // Sur un board, le 20 est en haut.
  // Ici, a20 pointe le centre du 20, donc rel=0 => centre 20.
  // Chaque secteur = 2PI/20.
  const sectorSize = (Math.PI * 2) / 20;
  const idx = Math.floor((rel + sectorSize / 2) / sectorSize) % 20;
  const segment = BOARD_NUMBERS[idx] as number;

  const rr = dist / cal.r; // ratio 0..1+

  // Bulls
  if (rr <= RATIO_BULL_OUTER) {
    return { segment: 25, multiplier: 2 }; // DBULL
  }
  if (rr <= RATIO_25_OUTER) {
    return { segment: 25, multiplier: 1 }; // BULL
  }

  // Double ring
  if (rr >= RATIO_DOUBLE_INNER && rr <= 1.02) {
    return { segment, multiplier: 2 };
  }

  // Triple ring
  if (rr >= RATIO_TRIPLE_INNER && rr <= RATIO_TRIPLE_OUTER) {
    return { segment, multiplier: 3 };
  }

  // Simple
  return { segment, multiplier: 1 };
}

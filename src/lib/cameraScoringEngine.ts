// ============================================
// src/lib/cameraScoringEngine.ts
// Camera scoring (assisté) — mapping tap -> dart
// - Calibration: center + outer radius + angle 20
// - Permet d'envoyer des événements compatibles X01PlayV3 (external scoring)
// ============================================

import type { CameraCalibrationV1, ExternalDart, TapToDartResult } from "../types/cameraScoring";

export const EXTERNAL_DART_EVENT = "dc:x01v3:dart";

// Ordre standard des segments (sens horaire, en partant de 20)
export const BOARD_ORDER: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

// Seuils radiaux (approximations) en fraction du rayon extérieur
// (peuvent être affinés, mais suffisants pour une UX "tap")
const R_DBULL = 0.060;
const R_SBULL = 0.100;
const R_SINGLE_INNER_MAX = 0.550;
const R_TRIPLE_MIN = 0.550;
const R_TRIPLE_MAX = 0.615;
const R_SINGLE_OUTER_MAX = 0.900;
const R_DOUBLE_MIN = 0.900;
const R_DOUBLE_MAX = 0.980;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function normDeg(deg: number) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export function mapTapToDart(
  cal: CameraCalibrationV1,
  tapNorm: { x: number; y: number }
): TapToDartResult | null {
  if (!cal) return null;
  const dx = tapNorm.x - cal.center.x;
  const dy = tapNorm.y - cal.center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const r = cal.radiusOuter > 0 ? dist / cal.radiusOuter : 999;

  // angle en degrés (0..360) dans le repère vidéo
  // atan2(dy, dx) donne 0 sur l'axe +X (droite).
  const angleDeg = normDeg(toDeg(Math.atan2(dy, dx)));

  // Référencer l'angle 20 (calibré) pour obtenir un angle relatif
  const theta = normDeg(angleDeg - cal.angleDeg20);

  // Hors cible
  if (r > 1.05) {
    return { dart: { segment: 0, multiplier: 1 }, confidence: 0.35, debug: { r, theta } };
  }

  // Bull
  if (r <= R_DBULL) {
    return { dart: { segment: 25, multiplier: 2 }, confidence: 0.9, debug: { r, theta } };
  }
  if (r <= R_SBULL) {
    return { dart: { segment: 25, multiplier: 1 }, confidence: 0.88, debug: { r, theta } };
  }

  // Segment (20 secteurs de 18°)
  const idx = Math.floor(((theta + 9) % 360) / 18); // +9 pour centrer
  const seg = BOARD_ORDER[Math.max(0, Math.min(19, idx))];

  // Ring -> multiplier
  let mult: 1 | 2 | 3 = 1;
  let confidence = 0.78;

  if (r >= R_DOUBLE_MIN && r <= R_DOUBLE_MAX) {
    mult = 2;
    confidence = 0.82;
  } else if (r >= R_TRIPLE_MIN && r <= R_TRIPLE_MAX) {
    mult = 3;
    confidence = 0.82;
  } else if (r <= R_SINGLE_INNER_MAX || r <= R_SINGLE_OUTER_MAX) {
    mult = 1;
    confidence = 0.78;
  } else {
    // Zone "entre" anneaux : incertitude
    mult = 1;
    confidence = 0.55;
  }

  const dart: ExternalDart = { segment: seg, multiplier: mult };

  // Très près des limites (heuristique simple)
  const rEdgePenalty = Math.min(
    Math.abs(r - R_DOUBLE_MIN),
    Math.abs(r - R_TRIPLE_MIN),
    Math.abs(r - R_SBULL)
  );
  confidence = clamp01(confidence - (rEdgePenalty < 0.02 ? 0.15 : 0));

  return { dart, confidence, debug: { r, theta } };
}

export function dispatchExternalDart(dart: ExternalDart) {
  try {
    window.dispatchEvent(new CustomEvent(EXTERNAL_DART_EVENT, { detail: dart }));
  } catch {}
}

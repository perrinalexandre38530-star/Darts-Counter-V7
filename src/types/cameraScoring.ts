// ============================================
// src/types/cameraScoring.ts
// Camera scoring (assisté) — Types
// ============================================

export type ExternalDart = {
  segment: number; // 0 (MISS), 25 (BULL), 1..20
  multiplier: 1 | 2 | 3; // S/D/T (si segment=0 => multiplier ignoré)
};

export type CameraCalibrationV1 = {
  version: 1;

  // Coordonnées normalisées (0..1) dans le repère de la vidéo
  center: { x: number; y: number };

  // Rayon normalisé (0..1) jusqu'au bord extérieur de la cible
  radiusOuter: number;

  // Rotation en degrés : angle (en degrés) du centre vers le milieu du "20"
  // dans le repère vidéo (atan2). Utilisé comme référence pour mapper les segments.
  angleDeg20: number;

  updatedAt: number;
};

export type TapToDartResult = {
  dart: ExternalDart;
  confidence: number; // 0..1 (heuristique)
  debug?: {
    r: number; // rayon normalisé
    theta: number; // angle normalisé 0..360
  };
};

// ============================================
// src/lib/cameraCalibrationStore.ts
// Caméra assistée X01 — calibration persistée côté téléphone
// - V1 : calibration manuelle 3 points (centre, rayon, orientation 20)
// - V2 : calibration photo automatique avec ellipse + zones avancées
// ============================================

export type CameraBoardRingRatios = {
  // Ratios normalisés par rapport au rayon extérieur de la zone de score.
  // Ces valeurs permettent de distinguer proprement DBULL / BULL / TRIPLE / DOUBLE.
  innerBullOuter: number;
  outerBullOuter: number;
  tripleInner: number;
  tripleOuter: number;
  doubleInner: number;
  doubleOuter: number;
};

export const DEFAULT_CAMERA_BOARD_RINGS: CameraBoardRingRatios = {
  // Dimensions proches cible type bristle : 6.35 / 170, 15.9 / 170, etc.
  innerBullOuter: 0.037,
  outerBullOuter: 0.094,
  tripleInner: 0.582,
  tripleOuter: 0.629,
  doubleInner: 0.941,
  doubleOuter: 1.0,
};

export type CameraCalibrationV1 = {
  v: 1;
  // coords normalisées 0..1 dans la surface interactive (video wrapper)
  cx: number;
  cy: number;
  r: number; // rayon circulaire historique (0..1)
  // orientation: angle (radians) où se trouve le centre du segment 20
  // angle 0 = vers la droite, PI/2 = vers le bas, -PI/2 = vers le haut
  a20: number;
  method?: "manual" | string;
  updatedAt: number;
};

export type CameraCalibrationV2 = {
  v: 2;
  // coords normalisées 0..1 dans la surface interactive (video wrapper)
  cx: number;
  cy: number;
  // rayons ellipse normalisés : corrige mieux une caméra pas parfaitement en face
  rx: number;
  ry: number;
  // rayon moyen conservé pour compat UI / anciens calculs
  r: number;
  a20: number;
  // Rotation de l’ellipse dans la photo, en radians. 0 = axes écran.
  phi?: number;
  method?: "auto-photo" | "auto-photo-zones" | "auto-photo-couleurs-v3" | "auto-photo-cible-v4" | "manual" | string;
  confidence?: number;
  zoneConfidence?: number;
  rings?: CameraBoardRingRatios;
  updatedAt: number;
};

export type CameraCalibration = CameraCalibrationV1 | CameraCalibrationV2;

const LS_KEY = "dc:camera:calibration:v1";

function finiteNumber(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeRings(raw: any): CameraBoardRingRatios {
  const base = DEFAULT_CAMERA_BOARD_RINGS;
  const innerBullOuter = clamp(finiteNumber(raw?.innerBullOuter) ?? base.innerBullOuter, 0.015, 0.07);
  const outerBullOuter = clamp(finiteNumber(raw?.outerBullOuter) ?? base.outerBullOuter, innerBullOuter + 0.015, 0.18);
  const tripleInner = clamp(finiteNumber(raw?.tripleInner) ?? base.tripleInner, 0.45, 0.72);
  const tripleOuter = clamp(finiteNumber(raw?.tripleOuter) ?? base.tripleOuter, tripleInner + 0.012, 0.78);
  const doubleInner = clamp(finiteNumber(raw?.doubleInner) ?? base.doubleInner, 0.82, 0.995);
  const doubleOuter = clamp(finiteNumber(raw?.doubleOuter) ?? base.doubleOuter, Math.max(doubleInner + 0.008, 0.96), 1.06);
  return { innerBullOuter, outerBullOuter, tripleInner, tripleOuter, doubleInner, doubleOuter };
}

export function getCameraCalibrationRings(cal?: CameraCalibration | null): CameraBoardRingRatios {
  if (!cal || cal.v !== 2) return DEFAULT_CAMERA_BOARD_RINGS;
  return normalizeRings(cal.rings);
}

function normalizeCameraCalibration(obj: any): CameraCalibration | null {
  if (!obj || typeof obj !== "object") return null;

  // Format V2 : photo auto / ellipse / zones avancées.
  if (obj.v === 2) {
    const cx = finiteNumber(obj.cx);
    const cy = finiteNumber(obj.cy);
    const rx = finiteNumber(obj.rx ?? obj.r);
    const ry = finiteNumber(obj.ry ?? obj.r);
    const a20 = finiteNumber(obj.a20);
    if (cx == null || cy == null || rx == null || ry == null || a20 == null) return null;
    const safeRx = Math.max(0.0001, rx);
    const safeRy = Math.max(0.0001, ry);
    return {
      v: 2,
      cx,
      cy,
      rx: safeRx,
      ry: safeRy,
      r: Math.max(0.0001, finiteNumber(obj.r) ?? (safeRx + safeRy) / 2),
      a20,
      phi: finiteNumber(obj.phi) ?? 0,
      method: obj.method ? String(obj.method) : "auto-photo",
      confidence: finiteNumber(obj.confidence) ?? undefined,
      zoneConfidence: finiteNumber(obj.zoneConfidence) ?? undefined,
      rings: normalizeRings(obj.rings),
      updatedAt: Number(obj.updatedAt || Date.now()),
    };
  }

  // Format V1 actuel utilisé par CameraAssistedOverlay/Engine.
  if (obj.v === 1) {
    const cx = finiteNumber(obj.cx);
    const cy = finiteNumber(obj.cy);
    const r = finiteNumber(obj.r);
    const a20 = finiteNumber(obj.a20);
    if (cx == null || cy == null || r == null || a20 == null) return null;
    return {
      v: 1,
      cx,
      cy,
      r: Math.max(0.0001, r),
      a20,
      method: obj.method ? String(obj.method) : "manual",
      updatedAt: Number(obj.updatedAt || Date.now()),
    };
  }

  // Compat ancien écran CameraScoringCalibration.tsx.
  if (obj.version === 1 && obj.center && typeof obj.center.x === "number" && typeof obj.center.y === "number") {
    const deg = Number(obj.angleDeg20 || 0);
    return {
      v: 1,
      cx: obj.center.x,
      cy: obj.center.y,
      r: Math.max(0.0001, Number(obj.radiusOuter || 0)),
      a20: (deg * Math.PI) / 180,
      method: "manual",
      updatedAt: Number(obj.updatedAt || Date.now()),
    };
  }

  return null;
}

export function loadCameraCalibration(): CameraCalibration | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return normalizeCameraCalibration(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCameraCalibration(cal: CameraCalibration | any): void {
  try {
    const normalized = normalizeCameraCalibration(cal);
    if (!normalized) return;
    localStorage.setItem(LS_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
}

export function clearCameraCalibration(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

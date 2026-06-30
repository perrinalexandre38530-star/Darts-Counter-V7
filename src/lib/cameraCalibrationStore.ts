// ============================================
// src/lib/cameraCalibrationStore.ts
// Caméra assistée X01 — calibration persistée côté téléphone
// - V1 : calibration manuelle 3 points (centre, rayon, orientation 20)
// - V2 : calibration photo automatique avec ellipse (centre, rx, ry, orientation 20)
// ============================================

export type CameraCalibrationV1 = {
  v: 1;
  // coords normalisées 0..1 dans la surface interactive (video wrapper)
  cx: number;
  cy: number;
  r: number; // rayon circulaire historique (0..1)
  // orientation: angle (radians) où se trouve le centre du segment 20
  // angle 0 = vers la droite, PI/2 = vers le bas, -PI/2 = vers le haut
  a20: number;
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
  method?: "auto-photo" | "manual" | string;
  confidence?: number;
  updatedAt: number;
};

export type CameraCalibration = CameraCalibrationV1 | CameraCalibrationV2;

const LS_KEY = "dc:camera:calibration:v1";

function finiteNumber(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCameraCalibration(obj: any): CameraCalibration | null {
  if (!obj || typeof obj !== "object") return null;

  // Format V2 : photo auto / ellipse.
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
      method: obj.method ? String(obj.method) : "auto-photo",
      confidence: finiteNumber(obj.confidence) ?? undefined,
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

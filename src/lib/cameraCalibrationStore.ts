// ============================================
// src/lib/cameraCalibrationStore.ts
// Caméra assistée (tap-to-score) — calibration persistée
// - V1 pragmatique : calibration 3 points (centre, rayon, orientation 20)
// - Stockage localStorage (device-specific)
// ============================================

export type CameraCalibrationV1 = {
  v: 1;
  // coords normalisées 0..1 dans la surface interactive (video wrapper)
  cx: number;
  cy: number;
  r: number; // rayon (0..1)
  // orientation: angle (radians) où se trouve le centre du segment 20
  // (angle 0 = vers la droite, PI/2 = vers le bas)
  a20: number;
  updatedAt: number;
};

const LS_KEY = "dc:camera:calibration:v1";

function normalizeCameraCalibration(obj: any): CameraCalibrationV1 | null {
  if (!obj || typeof obj !== "object") return null;

  // Format actuel utilisé par CameraAssistedOverlay/Engine
  if (obj.v === 1) {
    if (typeof obj.cx !== "number" || typeof obj.cy !== "number" || typeof obj.r !== "number" || typeof obj.a20 !== "number") {
      return null;
    }
    return {
      v: 1,
      cx: obj.cx,
      cy: obj.cy,
      r: Math.max(0.0001, obj.r),
      a20: obj.a20,
      updatedAt: Number(obj.updatedAt || Date.now()),
    };
  }

  // Compat ancien écran CameraScoringCalibration.tsx
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

export function loadCameraCalibration(): CameraCalibrationV1 | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return normalizeCameraCalibration(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCameraCalibration(cal: CameraCalibrationV1 | any): void {
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

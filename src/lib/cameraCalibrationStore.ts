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

export function loadCameraCalibration(): CameraCalibrationV1 | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || obj.v !== 1) return null;
    if (typeof obj.cx !== "number" || typeof obj.cy !== "number" || typeof obj.r !== "number" || typeof obj.a20 !== "number") {
      return null;
    }
    return obj as CameraCalibrationV1;
  } catch {
    return null;
  }
}

export function saveCameraCalibration(cal: CameraCalibrationV1): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cal));
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

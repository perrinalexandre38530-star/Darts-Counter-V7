// ============================================
// src/lib/cameraCalibrationStore.ts
// Camera scoring (assisté) — persistence locale
// ============================================

import type { CameraCalibrationV1 } from "../types/cameraScoring";

const LS_KEY = "dc:cameraCalibration:v1";

export function loadCameraCalibration(): CameraCalibrationV1 | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    // petite validation
    if (
      typeof parsed?.center?.x !== "number" ||
      typeof parsed?.center?.y !== "number" ||
      typeof parsed?.radiusOuter !== "number" ||
      typeof parsed?.angleDeg20 !== "number"
    ) {
      return null;
    }
    return parsed as CameraCalibrationV1;
  } catch {
    return null;
  }
}

export function saveCameraCalibration(cal: CameraCalibrationV1): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cal));
  } catch {}
}

export function clearCameraCalibration(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

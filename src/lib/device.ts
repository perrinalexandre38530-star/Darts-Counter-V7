// src/lib/device.ts
// ============================================================
// Device identity helper (stable per installation)
// - Used for multi-device sync & debugging.
// - Stored in localStorage.
// ============================================================

const DEVICE_ID_KEY = "dc_device_id_v1";

export function getDeviceId(): string {
  try {
    if (typeof window === "undefined") return "server";
    const ls = window.localStorage;
    let id = ls.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? String(Date.now()) + "-" + String(Math.random()).slice(2));
      ls.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

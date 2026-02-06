// ============================================
// src/lib/device.ts
// Identifiant stable par installation (multi-device sync)
// - Utilisé pour tagger les events envoyés à Supabase
// ============================================

const KEY = "dc_device_id_v1";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

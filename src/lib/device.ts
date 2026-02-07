// ============================================
// src/lib/device.ts
// Device ID stable (par installation) pour la sync multi-device.
// ============================================

const KEY = "dc_device_id_v1";

function safeRandomUUID(): string {
  // crypto.randomUUID est dispo sur navigateurs modernes.
  // Fallback (rare) : pseudo-UUID suffisamment unique pour un device_id.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // ignore
  }
  return `dev_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = safeRandomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage bloqué (Safari private, etc.) -> fallback volatile
    return safeRandomUUID();
  }
}

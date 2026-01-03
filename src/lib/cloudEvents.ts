// ============================================================
// src/lib/cloudEvents.ts
// Event bus ultra simple pour notifier "quelque chose a changé"
// (IDB / localStorage) afin de déclencher un push cloud debounced.
// ============================================================

export type CloudChangeDetail = { key: string; at: number };

const EVT = "dc:cloud-change";

export function emitCloudChange(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVT, { detail: { key: String(key || "unknown"), at: Date.now() } })
  );
}

export function onCloudChange(cb: (detail: CloudChangeDetail) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (ev: any) =>
    cb((ev?.detail || { key: "unknown", at: Date.now() }) as CloudChangeDetail);
  window.addEventListener(EVT, handler as any);
  return () => window.removeEventListener(EVT, handler as any);
}

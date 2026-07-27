/**
 * Détection sans dépendance npm afin que la PWA continue de compiler avant
 * même l'installation de Capacitor. Le runtime Capacitor injecte window.Capacitor
 * dans la WebView native Android/iOS.
 */
export function isCapacitorNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (window as any).Capacitor;
    if (!cap) return false;
    if (typeof cap.isNativePlatform === "function") return cap.isNativePlatform() === true;
    if (typeof cap.getPlatform === "function") return String(cap.getPlatform() || "web") !== "web";
    return false;
  } catch {
    return false;
  }
}

export function getRuntimePlatform(): "android" | "ios" | "web" | "native" {
  if (typeof window === "undefined") return "web";
  try {
    const cap = (window as any).Capacitor;
    const raw = typeof cap?.getPlatform === "function" ? String(cap.getPlatform() || "") : "";
    if (raw === "android" || raw === "ios" || raw === "web") return raw;
    return isCapacitorNativeRuntime() ? "native" : "web";
  } catch {
    return "web";
  }
}

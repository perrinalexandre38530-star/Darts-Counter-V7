export type GarminConnectPrepStatus = {
  configured: boolean;
  url: string | null;
  secure: boolean;
};

export function getGarminConnectPrepStatus(): GarminConnectPrepStatus {
  const raw = String((import.meta as any)?.env?.VITE_GARMIN_CONNECT_URL || "").trim();
  if (!raw) return { configured: false, url: null, secure: false };
  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.href : "https://localhost/");
    const secure = url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return { configured: true, url: url.toString(), secure };
  } catch {
    return { configured: false, url: null, secure: false };
  }
}

export function openGarminConnectPortal() {
  const status = getGarminConnectPrepStatus();
  if (!status.configured || !status.url) throw new Error("Endpoint Garmin Connect non configuré.");
  if (!status.secure) throw new Error("L’endpoint Garmin Connect doit utiliser HTTPS.");
  const target = new URL(status.url);
  if (typeof window !== "undefined") {
    target.searchParams.set("returnUrl", window.location.href);
    window.location.assign(target.toString());
  }
}

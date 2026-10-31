import {
  buildX01DevicePollingUrl,
  createX01DeviceSession,
  fetchX01DeviceStatus,
  postX01DeviceEvent,
  updateX01DeviceStatus,
  type X01DeviceSession,
  type X01DeviceStatus,
} from "./x01ExternalDeviceClient";

export type ClosestCenterCompanionSession = X01DeviceSession & {
  sourceId: string;
};

export type ClosestCenterCompanionEvent = {
  id: number;
  seq: number;
  ts: number;
  payload: any;
};

export function closestCenterCompanionSourceId(sessionId: string) {
  return `closest-center:phone-companion:${String(sessionId || "").trim().toUpperCase()}`;
}

function companionBase() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

export function buildClosestCenterCompanionJoinUrl(sessionId: string) {
  const code = String(sessionId || "").trim().toUpperCase();
  let api = "";
  try {
    api = String(localStorage.getItem("dc:x01-device-api-url:v1") || "").trim();
  } catch {}
  const query = api ? `?api=${encodeURIComponent(api)}` : "";
  return `${companionBase()}#/closest-center-device/${encodeURIComponent(code)}${query}`;
}

export async function createClosestCenterCompanionSession(): Promise<ClosestCenterCompanionSession> {
  const base = await createX01DeviceSession("closest_center_phone_companion_v1");
  return {
    ...base,
    joinUrl: buildClosestCenterCompanionJoinUrl(base.code),
    sourceId: closestCenterCompanionSourceId(base.code),
  };
}

export async function fetchClosestCenterCompanionStatus(sessionId: string): Promise<X01DeviceStatus | null> {
  return fetchX01DeviceStatus(sessionId);
}

export async function updateClosestCenterCompanionStatus(sessionId: string, patch: Partial<X01DeviceStatus>) {
  return updateX01DeviceStatus(sessionId, patch);
}

export async function fetchClosestCenterCompanionEvents(sessionId: string, after = 0): Promise<{events: ClosestCenterCompanionEvent[]; rev: number}> {
  const base = buildX01DevicePollingUrl(sessionId);
  const url = new URL(base, typeof window !== "undefined" ? window.location.href : undefined);
  if (after > 0) url.searchParams.set("after", String(after));
  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(json?.message || json?.error || `HTTP ${res.status}`));
  return { events: Array.isArray(json?.events) ? json.events : [], rev: Number(json?.rev || 0) || 0 };
}

export async function postClosestCenterCompanionEvent(sessionId: string, payload: any) {
  return postX01DeviceEvent(sessionId, payload);
}

export async function requestClosestCenterCompanionBurst(
  sessionId: string,
  options: { count: number; delayMs: number; maxCaptureSide: number; timeoutMs?: number; crop?: {x:number;y:number;w:number;h:number}; retries?: number }
): Promise<{ frames: ImageData[]; fingerprint: any; previewDataUrl?: string; telemetry: { requestMs:number; firstFrameMs:number; transferMs:number; totalMs:number; bytes:number; attempt:number } }> {
  const count = Math.max(1, Math.min(12, Number(options.count || 1)));
  const delayMs = Math.max(25, Math.min(250, Number(options.delayMs || 55)));
  const maxCaptureSide = Math.max(960, Math.min(2400, Number(options.maxCaptureSide || 1920)));
  const retries = Math.max(0, Math.min(2, Number(options.retries ?? 1)));
  const timeoutMs = Math.max(5000, Number(options.timeoutMs || 14000));
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const requestStartedAt = performance.now();
    try {
      const status: any = await fetchClosestCenterCompanionStatus(sessionId);
      const lastSeenAt = Number(status?.lastSeenAt || 0) || 0;
      const stale = !lastSeenAt || Date.now() - lastSeenAt > 8000;
      if (!status?.connected || !status?.cameraReady || stale) {
        throw new Error(stale ? "Téléphone compagnon hors ligne ou en veille." : "Téléphone compagnon non prêt.");
      }

      const requestId = `cc-${Date.now()}-${attempt}-${Math.random().toString(36).slice(2, 8)}`;
      let after = Number(status?.eventSeq || 0) || 0;
      await postClosestCenterCompanionEvent(sessionId, {
        kind: "closest_center_capture_request",
        type: "closest_center_capture_request",
        requestId,
        attempt,
        count,
        delayMs,
        maxCaptureSide,
        crop: options.crop || null,
        requestedAt: Date.now(),
      });

      const requestPostedAt = performance.now();
      const deadline = Date.now() + timeoutMs;
      const received = new Map<number, { dataUrl: string; fingerprint?: any }>();
      let firstFrameAt = 0;
      let fingerprint: any = null;
      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 120));
        const batch = await fetchClosestCenterCompanionEvents(sessionId, after);
        for (const ev of batch.events) {
          after = Math.max(after, Number(ev.id || ev.seq || 0) || 0);
          const p = ev.payload || {};
          if (p.requestId !== requestId) continue;
          if (p.kind === "closest_center_capture_error") throw new Error(String(p.message || "Capture compagnon impossible."));
          if (p.kind !== "closest_center_capture_frame") continue;
          const index = Number(p.index || 0);
          if (typeof p.dataUrl === "string" && p.dataUrl.startsWith("data:image/")) {
            received.set(index, { dataUrl: p.dataUrl, fingerprint: p.fingerprint });
            if (!firstFrameAt) firstFrameAt = performance.now();
            fingerprint = p.fingerprint || fingerprint;
          }
        }
        if (received.size >= count) break;
      }

      if (received.size < count) throw new Error(`Téléphone compagnon : ${received.size}/${count} frame(s) reçue(s).`);
      const ordered = [...received.entries()].sort((a,b)=>a[0]-b[0]).slice(0,count);
      const frames: ImageData[] = [];
      for (const [, item] of ordered) frames.push(await dataUrlToImageData(item.dataUrl));
      const completedAt = performance.now();
      const bytes = ordered.reduce((sum,[,item])=>sum+Math.round((item.dataUrl.length*3)/4),0);
      return {
        frames,
        fingerprint,
        previewDataUrl: ordered[0]?.[1]?.dataUrl,
        telemetry:{
          requestMs:Math.max(0,Math.round(requestPostedAt-requestStartedAt)),
          firstFrameMs:firstFrameAt?Math.max(0,Math.round(firstFrameAt-requestPostedAt)):0,
          transferMs:firstFrameAt?Math.max(0,Math.round(completedAt-firstFrameAt)):0,
          totalMs:Math.max(0,Math.round(completedAt-requestStartedAt)),
          bytes,
          attempt,
        }
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 450 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Téléphone compagnon indisponible.");
}

async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Frame compagnon illisible."));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas compagnon indisponible.");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

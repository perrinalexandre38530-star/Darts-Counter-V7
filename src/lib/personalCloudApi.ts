import { apiGet, apiPost, buildApiUrl } from "./apiClient";

export type PersonalCloudProvider = "google_drive" | "onedrive" | "dropbox";
export type PersonalCloudStatus = { provider: PersonalCloudProvider; configured: boolean; connected: boolean; accountLabel?: string | null; updatedAt?: string | null; error?: string };

const PROVIDERS: PersonalCloudProvider[] = ["google_drive", "onedrive", "dropbox"];
export function isPersonalCloudProvider(v: unknown): v is PersonalCloudProvider { return PROVIDERS.includes(String(v) as PersonalCloudProvider); }

export async function getPersonalCloudStatus(provider: PersonalCloudProvider): Promise<PersonalCloudStatus> {
  return apiGet(`/account/personal-cloud/${provider}/status`) as any;
}

export async function connectPersonalCloud(provider: PersonalCloudProvider): Promise<void> {
  const returnTo = typeof window !== "undefined" ? window.location.href.split("#")[0] + "#/settings/storage" : "";
  const res: any = await apiGet(`/account/personal-cloud/${provider}/connect-url?returnTo=${encodeURIComponent(returnTo)}`);
  if (!res?.url) throw new Error(res?.error || "Connexion cloud indisponible.");
  window.location.assign(String(res.url));
}

async function gzipBase64(text: string): Promise<{ encoding: "gzip-base64" | "plain-base64"; data: string }> {
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream !== "undefined") {
    const cs = new CompressionStream("gzip");
    const writer = cs.writable.getWriter();
    await writer.write(bytes); await writer.close();
    const zipped = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    let binary = ""; const step = 0x8000;
    for (let i = 0; i < zipped.length; i += step) binary += String.fromCharCode(...zipped.subarray(i, i + step));
    return { encoding: "gzip-base64", data: btoa(binary) };
  }
  let binary = ""; const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
  return { encoding: "plain-base64", data: btoa(binary) };
}

async function decodePayload(payload: any): Promise<any> {
  if (payload?.snapshot) return payload.snapshot;
  if (!payload?.data) throw new Error("Sauvegarde cloud vide.");
  const binary = atob(String(payload.data));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  let text = "";
  if (payload.encoding === "gzip-base64" && typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter(); await writer.write(bytes); await writer.close();
    text = await new Response(ds.readable).text();
  } else text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

export async function uploadPersonalCloudSnapshot(provider: PersonalCloudProvider, snapshotJson: string, metadata: Record<string, any> = {}) {
  const packed = await gzipBase64(snapshotJson);
  return apiPost(`/account/personal-cloud/${provider}/backup`, { ...packed, metadata }) as any;
}

export async function getPersonalCloudBackupMeta(provider: PersonalCloudProvider): Promise<any | null> {
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup/meta`).catch(() => null);
  return res?.backup || null;
}

export async function downloadPersonalCloudSnapshot(provider: PersonalCloudProvider): Promise<any> {
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup`);
  return decodePayload(res);
}

export function personalCloudProviderLabel(provider: PersonalCloudProvider): string {
  return provider === "google_drive" ? "Google Drive" : provider === "onedrive" ? "OneDrive" : "Dropbox";
}

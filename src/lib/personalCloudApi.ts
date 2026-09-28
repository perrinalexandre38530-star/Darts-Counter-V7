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
    // IMPORTANT : ne jamais attendre writer.write() avant de consommer le
    // readable d'un CompressionStream. Sur les gros snapshots (30+ Mo), le
    // buffer interne applique une back-pressure et writer.write() peut rester
    // bloqué indéfiniment. C'était précisément le gel à 42 % de Google Drive.
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    const zipped = new Uint8Array(await new Response(stream).arrayBuffer());
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
    // Même protection au retour : consommation en pipeline pour éviter la
    // back-pressure lors de la restauration d'une grosse sauvegarde Drive.
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

export async function uploadPersonalCloudSnapshot(provider: PersonalCloudProvider, snapshotJson: string, metadata: Record<string, any> = {}) {
  const packed = await gzipBase64(snapshotJson);
  // Google Drive: contrat historique réellement déployé sur le NAS (/backups).
  // On envoie le snapshot compressé dans une petite enveloppe JSON afin de ne
  // plus pousser 30-40 Mo de JSON brut à travers Express/Cloudflare.
  if (provider === "google_drive") {
    const wrapper = JSON.stringify({ __mssCompressedBackup: 1, ...packed, metadata });
    return apiPost(`/account/personal-cloud/google_drive/backups`, {
      title: "Sauvegarde MULTISPORTS SCORING",
      snapshotJson: wrapper,
      summary: metadata?.summary || {},
      metadata,
    }) as any;
  }
  return apiPost(`/account/personal-cloud/${provider}/backup`, { ...packed, metadata }) as any;
}

async function latestGoogleDriveBackup(): Promise<any | null> {
  const res: any = await apiGet(`/account/personal-cloud/google_drive/backups?limit=20`).catch(() => null);
  const items = Array.isArray(res?.backups) ? res.backups : Array.isArray(res?.files) ? res.files : [];
  if (!items.length) return null;
  return [...items].sort((a: any, b: any) => Date.parse(String(b?.updatedAt || b?.createdAt || 0)) - Date.parse(String(a?.updatedAt || a?.createdAt || 0)))[0] || null;
}

export async function getPersonalCloudBackupMeta(provider: PersonalCloudProvider): Promise<any | null> {
  if (provider === "google_drive") return latestGoogleDriveBackup();
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup/meta`).catch(() => null);
  return res?.backup || null;
}

export async function downloadPersonalCloudSnapshot(provider: PersonalCloudProvider): Promise<any> {
  if (provider === "google_drive") {
    const latest = await latestGoogleDriveBackup();
    if (!latest?.id) throw new Error("Aucune sauvegarde Google Drive disponible.");
    const res: any = await apiGet(`/account/personal-cloud/google_drive/backups/${encodeURIComponent(String(latest.id))}`);
    const raw = String(res?.snapshotJson || "");
    if (!raw) throw new Error("Sauvegarde Google Drive vide.");
    const parsed = JSON.parse(raw);
    if (parsed?.__mssCompressedBackup === 1) return decodePayload(parsed);
    return parsed;
  }
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup`);
  return decodePayload(res);
}

export function personalCloudProviderLabel(provider: PersonalCloudProvider): string {
  return provider === "google_drive" ? "Google Drive" : provider === "onedrive" ? "OneDrive" : "Dropbox";
}

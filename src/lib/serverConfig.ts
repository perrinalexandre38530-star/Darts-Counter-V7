// ============================================================
// src/lib/serverConfig.ts
// Configuration provider Online / NAS
// - VITE_ONLINE_PROVIDER=supabase | hybrid | nas
// - Le provider principal peut rester NAS pour le compte fondateur,
//   mais le client Supabase doit rester disponible pour les comptes publics.
// ============================================================

const LEGACY_BAD_HOSTS = [
  "sustainability-accordingly-steven-investments.trycloudflare.com",
];

function sanitizeUrl(raw: unknown): string {
  const value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (LEGACY_BAD_HOSTS.some((host) => value.includes(host))) return "";
  return value;
}

function normalizeProvider(raw: unknown): "supabase" | "hybrid" | "nas" {
  const value = String(raw || "supabase").trim().toLowerCase();
  if (value === "nas") return "nas";
  if (value === "hybrid" || value === "supabase+nas") return "hybrid";
  return "supabase";
}

export const ONLINE_PROVIDER = normalizeProvider((import.meta as any)?.env?.VITE_ONLINE_PROVIDER);
export const NAS_API_URL =
  sanitizeUrl((import.meta as any)?.env?.VITE_NAS_API_URL) || "https://api.multisports-api.fr";

export function isNasProviderEnabled(): boolean {
  return ONLINE_PROVIDER === "nas";
}

export function isSupabaseEnabled(): boolean {
  return ONLINE_PROVIDER === "supabase" || ONLINE_PROVIDER === "hybrid";
}

export function isNasDataSyncEnabled(): boolean {
  if (!NAS_API_URL) return false;
  if (ONLINE_PROVIDER === "nas" || ONLINE_PROVIDER === "hybrid") return true;
  const raw = String((import.meta as any)?.env?.VITE_NAS_DATA_SYNC || "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function getNasApiUrl(): string {
  return NAS_API_URL;
}

export function getOnlineProviderLabel(): string {
  if (ONLINE_PROVIDER === "nas") return "public Supabase + NAS/R2";
  if (isNasDataSyncEnabled()) return "public Supabase + NAS/R2";
  return "public Supabase";
}

export function isSupabaseHardDisabledInNasMode(): boolean {
  // Ancien comportement : en mode NAS, Supabase était totalement neutralisé.
  // Nouveau comportement : on garde Supabase actif pour les comptes publics.
  // Pour le couper volontairement en dépannage, mettre :
  // VITE_DISABLE_SUPABASE_CLIENT_IN_NAS=true
  const raw = String((import.meta as any)?.env?.VITE_DISABLE_SUPABASE_CLIENT_IN_NAS || "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}


// ---------------------------------------------------------------------------
// MEDIA / BACKEND ROUTING
// ---------------------------------------------------------------------------
// Les anciennes sauvegardes contiennent encore des URL du type
// https://api.multisports-api.fr/media/<id> ou /media/<id>. Les charger
// directement depuis le navigateur recrée un problème CORS et rend l'app
// dépendante du tunnel NAS. En web, on passe par la Function Pages same-origin
// /api/backend/*. En Capacitor, on utilise l'origine Pages publique.
export const PUBLIC_PAGES_ORIGIN =
  sanitizeUrl((import.meta as any)?.env?.VITE_PUBLIC_PAGES_ORIGIN) ||
  "https://multisports-scoring.pages.dev";

function absoluteNasMediaPath(raw: string): string | null {
  try {
    const url = new URL(raw);
    const nas = new URL(NAS_API_URL);
    if (url.origin !== nas.origin || !url.pathname.startsWith("/media/")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function backendProxyUrl(pathInput: unknown): string {
  const raw = String(pathInput || "").trim();
  if (!raw) return "";

  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    const nasPath = absoluteNasMediaPath(raw);
    if (!nasPath) return raw;
    path = nasPath;
  }
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.startsWith("/api/backend/")) return path;

  const proxyPath = `/api/backend${path}`;
  if (typeof window !== "undefined") {
    const protocol = String(window.location?.protocol || "").toLowerCase();
    if (protocol === "http:" || protocol === "https:") return proxyPath;
  }
  return `${PUBLIC_PAGES_ORIGIN}${proxyPath}`;
}

export function resolveRuntimeMediaUrl(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/media/")) return backendProxyUrl(raw);
  const nasPath = /^https?:\/\//i.test(raw) ? absoluteNasMediaPath(raw) : null;
  return nasPath ? backendProxyUrl(nasPath) : raw;
}

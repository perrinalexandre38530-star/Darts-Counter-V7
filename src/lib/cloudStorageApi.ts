import { apiDelete, apiGet, apiPost, buildApiUrl, readNasAccessToken } from "./apiClient";
import type { StorageDestinationId, StoragePlanId } from "./storagePlans";

export type AccountStoragePreference = {
  user_id?: string;
  plan_id: StoragePlanId | string;
  desired_plan_id?: StoragePlanId | string | null;
  storage_provider: "local_device" | "external_manual" | "cloud_r2" | "nas_founder" | string;
  quota_bytes: number | string;
  used_bytes: number | string;
  billing_exempt?: boolean;
  billing_status?: "free" | "pending" | "active" | "past_due" | "cancelled" | string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

export type AccountStorageUsage = {
  ok: boolean;
  preference: AccountStoragePreference;
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  percentUsed: number;
  requiresPayment?: boolean;
  desiredPlanId?: string | null;
  freeCloud?: {
    enabled: boolean;
    limitBytes: number;
    usedBytes: number;
    remainingBytes: number;
  };
};

export type CloudObjectIndexItem = {
  id: string;
  object_key: string;
  object_provider: string;
  object_type: string;
  sport?: string | null;
  title?: string | null;
  size_bytes: number | string;
  checksum?: string | null;
  metadata?: Record<string, any>;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
};

export function storageDestinationToProvider(destination: StorageDestinationId | string) {
  const raw = String(destination || "").trim();
  if (raw === "device_file" || raw === "external_sd_manual") return "external_manual";
  if (raw === "cloud_r2") return "cloud_r2";
  if (raw === "founder_nas") return "nas_founder";
  return "local_device";
}

function toNumber(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAccountStoragePreferences(): Promise<AccountStoragePreference> {
  const res: any = await apiGet("/account/storage-preferences");
  return res?.preference || res;
}

export async function getAccountStorageUsage(): Promise<AccountStorageUsage> {
  const res: any = await apiGet("/account/storage-usage");
  const preference = res?.preference || {};
  const usedBytes = toNumber(res?.usedBytes ?? preference.used_bytes, 0);
  const quotaBytes = toNumber(res?.quotaBytes ?? preference.quota_bytes, 0);
  const remainingBytes = Math.max(0, toNumber(res?.remainingBytes, quotaBytes - usedBytes));
  const percentUsed = quotaBytes > 0 ? Math.min(100, Math.max(0, (usedBytes / quotaBytes) * 100)) : 0;
  return { ...res, ok: !!res?.ok, preference, usedBytes, quotaBytes, remainingBytes, percentUsed };
}

export async function saveAccountStoragePreferences(args: {
  planId: StoragePlanId | string;
  storageDestination: StorageDestinationId | string;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; preference: AccountStoragePreference; requiresPayment?: boolean; desiredPlanId?: string; paymentMessage?: string; plan?: any }> {
  const storageProvider = storageDestinationToProvider(args.storageDestination);
  return apiPost("/account/storage-preferences", {
    planId: args.planId,
    storageProvider,
    metadata: {
      ...(args.metadata || {}),
      selectedDestination: args.storageDestination,
      selectedAt: new Date().toISOString(),
    },
  }) as any;
}

export async function listCloudObjects(filters?: { objectType?: string; sport?: string; includeDeleted?: boolean; limit?: number }): Promise<CloudObjectIndexItem[]> {
  const params = new URLSearchParams();
  if (filters?.objectType) params.set("objectType", filters.objectType);
  if (filters?.sport) params.set("sport", filters.sport);
  if (filters?.includeDeleted) params.set("includeDeleted", "1");
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const res: any = await apiGet(`/account/cloud-objects${qs ? `?${qs}` : ""}`);
  return Array.isArray(res?.objects) ? res.objects : [];
}

export async function upsertCloudObjectIndex(input: {
  objectKey: string;
  objectType: string;
  objectProvider?: "r2" | "nas" | "external" | string;
  sport?: string | null;
  title?: string | null;
  sizeBytes?: number;
  checksum?: string | null;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; object: CloudObjectIndexItem; usage: AccountStorageUsage }> {
  return apiPost("/account/cloud-objects", input) as any;
}

export async function deleteCloudObjectIndex(id: string): Promise<{ ok: boolean; usage: AccountStorageUsage }> {
  return apiDelete(`/account/cloud-objects/${encodeURIComponent(id)}`) as any;
}

export async function recalculateAccountStorageUsage(): Promise<AccountStorageUsage> {
  const res: any = await apiPost("/account/storage-usage/recalculate", {});
  const preference = res?.preference || {};
  const usedBytes = toNumber(res?.usedBytes ?? preference.used_bytes, 0);
  const quotaBytes = toNumber(res?.quotaBytes ?? preference.quota_bytes, 0);
  return {
    ...res,
    ok: !!res?.ok,
    preference,
    usedBytes,
    quotaBytes,
    remainingBytes: Math.max(0, quotaBytes - usedBytes),
    percentUsed: quotaBytes > 0 ? Math.min(100, Math.max(0, (usedBytes / quotaBytes) * 100)) : 0,
  };
}

export type StorageBillingInterval = "monthly" | "yearly";

export async function createStorageCheckoutSession(args: {
  planId: StoragePlanId | string;
  interval: StorageBillingInterval;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<{ ok: boolean; url?: string; sessionId?: string; plan?: any; interval?: StorageBillingInterval; error?: string; missingEnv?: string; message?: string; stripeMode?: string; priceId?: string; stripeErrorCode?: string; stripeErrorType?: string }> {
  return apiPost("/account/storage/checkout", {
    planId: args.planId,
    interval: args.interval,
    successUrl: args.successUrl,
    cancelUrl: args.cancelUrl,
  }) as any;
}


export function submitStorageCheckoutRedirect(args: {
  planId: StoragePlanId | string;
  interval: StorageBillingInterval;
}) {
  if (typeof window === "undefined") {
    throw new Error("Redirection Stripe indisponible hors navigateur.");
  }
  const token = readNasAccessToken();
  if (!token) {
    throw new Error("Session absente : reconnecte-toi avant d'ouvrir Stripe.");
  }

  // Navigation directe, pas de fetch et pas de formulaire caché.
  // Ça contourne les blocages CORS/proxy/PWA : le navigateur quitte l'app,
  // le backend crée la session Checkout, puis répond en 303 vers Stripe.
  const url = buildApiUrl("/account/storage/checkout", {
    planId: String(args.planId || ""),
    interval: String(args.interval || "monthly"),
    redirect: "1",
    access_token: token,
  });

  window.location.assign(url);
}

export async function verifyStorageCheckoutSession(sessionId: string): Promise<{ ok: boolean; activated?: boolean; plan?: any; preference?: AccountStoragePreference; usage?: AccountStorageUsage; message?: string; error?: string }> {
  const id = encodeURIComponent(String(sessionId || ""));
  const res: any = await apiGet(`/account/storage/checkout/verify?session_id=${id}`);
  const rawUsage = res?.usage;
  if (rawUsage?.preference) {
    const preference = rawUsage.preference;
    const usedBytes = toNumber(rawUsage.usedBytes ?? preference.used_bytes, 0);
    const quotaBytes = toNumber(rawUsage.quotaBytes ?? preference.quota_bytes, 0);
    res.usage = {
      ...rawUsage,
      preference,
      usedBytes,
      quotaBytes,
      remainingBytes: Math.max(0, toNumber(rawUsage.remainingBytes, quotaBytes - usedBytes)),
      percentUsed: quotaBytes > 0 ? Math.min(100, Math.max(0, (usedBytes / quotaBytes) * 100)) : 0,
    };
  }
  return res;
}


export type StorageStripeStatus = {
  ok: boolean;
  configured: boolean;
  provider?: "stripe" | string;
  mode?: "test" | "live" | "missing" | "unknown" | string;
  secretKeyConfigured?: boolean;
  priceCount?: number;
  configuredPriceCount?: number;
  missingEnv?: string[];
  webhookStorageConfigured?: boolean;
  webhookFallbackConfigured?: boolean;
  webhookSecretEnvName?: string | null;
  webhookEndpoint?: string;
  checkoutEndpoint?: string;
  successCancelBaseUrl?: string | null;
  prices?: Array<{
    planId: string;
    planLabel: string;
    interval: "monthly" | "yearly" | string;
    envName: string;
    priceId: string;
    configured: boolean;
    expectedAmountCents?: number;
    expectedCurrency?: string;
  }>;
  verifiedPrices?: Array<Record<string, any>>;
  message?: string;
  error?: string;
};

export async function getStorageStripeStatus(verify = false): Promise<StorageStripeStatus> {
  return apiGet(`/account/storage/stripe-status${verify ? "?verify=1" : ""}`) as any;
}


export type SupabaseAccountStatus = {
  ok: boolean;
  configured: boolean;
  provider?: "supabase_minimal" | string;
  projectUrlConfigured?: boolean;
  projectHost?: string | null;
  anonKeyConfigured?: boolean;
  serviceRoleKeyConfigured?: boolean;
  anonKeyKind?: string;
  serviceKeyKind?: string;
  missingEnv?: string[];
  usage?: string;
  auth?: {
    skipped?: boolean;
    reachable?: boolean;
    ok?: boolean;
    statusCode?: number | null;
    message?: string;
    missingEnv?: string[];
  };
  message?: string;
};

export async function getSupabaseAccountStatus(): Promise<SupabaseAccountStatus> {
  return apiGet("/account/supabase/status") as any;
}


export type SupabaseTablesStatus = {
  ok: boolean;
  configured?: boolean;
  projectHost?: string | null;
  missingEnv?: string[];
  tables?: Array<{
    table: string;
    ok: boolean;
    exists?: boolean | null;
    statusCode?: number | null;
    message?: string;
  }>;
  message?: string;
  error?: string;
};

export async function getSupabaseTablesStatus(): Promise<SupabaseTablesStatus> {
  return apiGet("/account/supabase/tables-status") as any;
}


export type SupabaseBridgeStatus = {
  ok: boolean;
  configured?: boolean;
  linked?: boolean;
  link?: {
    provider?: string;
    provider_user_id?: string;
    email_normalized?: string;
    created_at?: string;
    updated_at?: string;
    last_login_at?: string;
  } | null;
  message?: string;
  error?: string;
};

export async function getSupabaseBridgeStatus(): Promise<SupabaseBridgeStatus> {
  return apiGet("/account/supabase/bridge-status") as any;
}

export type CloudStorageStatus = {
  ok: boolean;
  configured: boolean;
  provider?: string;
  bucket?: string | null;
  publicBaseUrlConfigured?: boolean;
  maxUploadBytes?: number;
  canUpload?: boolean;
  message?: string;
};

export async function getCloudStorageStatus(): Promise<CloudStorageStatus> {
  return apiGet("/account/cloud-storage/status") as any;
}

export async function uploadCloudObject(args: {
  objectKey?: string;
  objectType: string;
  sport?: string | null;
  title?: string | null;
  mimeType?: string;
  payload?: any;
  data?: any;
  content?: string;
  contentBase64?: string;
  gzip?: boolean;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; object: CloudObjectIndexItem; usage: AccountStorageUsage; error?: string; missingEnv?: string[]; objectKey?: string }> {
  return apiPost("/account/cloud-storage/upload", args) as any;
}

export async function downloadCloudObject(id: string): Promise<{ ok: boolean; object: CloudObjectIndexItem; mode?: "json" | "text" | "base64"; content?: any; text?: string; contentBase64?: string; error?: string }> {
  return apiGet(`/account/cloud-storage/download/${encodeURIComponent(String(id || ""))}`) as any;
}

export async function deleteCloudObjectRemote(id: string): Promise<{ ok: boolean; usage: AccountStorageUsage; error?: string }> {
  return apiDelete(`/account/cloud-storage/object/${encodeURIComponent(String(id || ""))}`) as any;
}

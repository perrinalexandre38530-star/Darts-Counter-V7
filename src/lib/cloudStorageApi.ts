import { apiDelete, apiGet, apiPost } from "./apiClient";
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

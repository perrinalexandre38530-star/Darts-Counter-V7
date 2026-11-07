import { supabase } from "../lib/supabaseClient";

export type ShopRequestStatus = "pending" | "accepted" | "ready" | "completed" | "rejected" | "cancelled";
export type ShopRequest = {
  id: string;
  organizationId: string;
  itemTitle: string;
  itemCategory: "official_kit" | "clothing" | "goodies";
  unitPrice: number | null;
  currency: string;
  kind: "reservation" | "personalization";
  name: string;
  email: string;
  phone: string;
  quantity: number;
  size: string;
  personalizedName: string;
  personalizedNumber: string;
  notes: string;
  status: ShopRequestStatus;
  internalNote: string;
  createdAt: string;
  updatedAt: string;
};
export type SubmitShopRequest = {
  organizationId: string;
  itemId: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  size: string;
  personalizedName: string;
  personalizedNumber: string;
  notes: string;
  honeypot?: string;
};
const TABLE = "ms_organization_shop_requests";
function raise(error: any): never {
  if (["42P01", "PGRST205", "PGRST202", "42883", "42703"].includes(String(error?.code || ""))) {
    throw new Error("Module de réservations indisponible : vérifie les migrations SQL V23 et V24 dans Supabase.");
  }
  throw new Error(String(error?.message || "Opération sur la demande impossible."));
}
function asRequest(row: any): ShopRequest {
  return {
    id: String(row.id || ""), organizationId: String(row.organization_id || ""),
    itemTitle: String(row.item_title || ""), itemCategory: row.item_category,
    unitPrice: row.unit_price == null ? null : Number(row.unit_price), currency: String(row.currency || "EUR"),
    kind: row.request_kind === "personalization" ? "personalization" : "reservation",
    name: String(row.requester_name || ""), email: String(row.requester_email || ""), phone: String(row.requester_phone || ""),
    quantity: Number(row.quantity || 1), size: String(row.selected_size || ""),
    personalizedName: String(row.personalized_name || ""), personalizedNumber: String(row.personalized_number || ""),
    notes: String(row.notes || ""), status: row.status, internalNote: String(row.internal_note || ""),
    createdAt: String(row.created_at || ""), updatedAt: String(row.updated_at || ""),
  };
}
export async function submitPublicShopRequest(value: SubmitShopRequest): Promise<string> {
  if (!value.name.trim() || !value.email.trim() || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 10) {
    throw new Error("Renseigne ton nom, ton e-mail et une quantité de 1 à 10.");
  }
  const { data, error } = await supabase.rpc("ms_org_shop_submit_request_v23" as any, {
    p_organization_id: value.organizationId,
    p_item_id: value.itemId,
    p_name: value.name.trim(), p_email: value.email.trim(), p_phone: value.phone.trim(),
    p_quantity: value.quantity, p_size: value.size.trim(),
    p_personalized_name: value.personalizedName.trim(),
    p_personalized_number: value.personalizedNumber.trim(), p_notes: value.notes.trim(), p_honeypot: value.honeypot || "",
  });
  if (error) raise(error);
  if (typeof data !== "string" || !data) throw new Error("Demande non confirmée par le serveur.");
  return data;
}
export async function listOrganizationShopRequests(userId: string | null | undefined, organizationId: string): Promise<ShopRequest[]> {
  if (!userId || !organizationId) throw new Error("Compte administrateur requis.");
  const { data, error } = await supabase.from(TABLE as any)
    .select("id,organization_id,item_title,item_category,unit_price,currency,request_kind,requester_name,requester_email,requester_phone,quantity,selected_size,personalized_name,personalized_number,notes,status,internal_note,created_at,updated_at")
    .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(300);
  if (error) raise(error);
  return (data || []).map(asRequest);
}
export async function setOrganizationShopRequestStatus(userId: string | null | undefined, requestId: string, status: ShopRequestStatus): Promise<void> {
  if (!userId || !requestId) throw new Error("Compte administrateur requis.");
  if (!["accepted", "rejected", "cancelled", "ready", "completed"].includes(status)) throw new Error("Statut invalide.");
  const { error } = await supabase.rpc("ms_org_shop_set_request_status_v23" as any, {
    p_request_id: requestId, p_status: status,
  });
  if (error) raise(error);
}

export type ShopRequestEvent = {
  id: number;
  oldStatus: ShopRequestStatus;
  newStatus: ShopRequestStatus;
  createdAt: string;
};

/** Journal consultable seulement par les responsables autorisés (RLS Supabase). */
export async function listShopRequestEvents(userId: string | null | undefined, requestId: string): Promise<ShopRequestEvent[]> {
  if (!userId || !requestId) throw new Error("Compte responsable requis.");
  const { data, error } = await supabase.from("ms_organization_shop_request_events" as any)
    .select("id,old_status,new_status,created_at")
    .eq("request_id", requestId).order("created_at", { ascending: true }).limit(100);
  if (error) raise(error);
  return (data || []).map((row: any) => ({
    id: Number(row.id), oldStatus: row.old_status as ShopRequestStatus,
    newStatus: row.new_status as ShopRequestStatus, createdAt: String(row.created_at || ""),
  }));
}

export async function setShopRequestInternalNote(userId: string | null | undefined, requestId: string, note: string): Promise<void> {
  if (!userId || !requestId) throw new Error("Compte responsable requis.");
  if (note.length > 1000) throw new Error("Note trop longue (1 000 caractères maximum).");
  const { error } = await supabase.rpc("ms_org_shop_set_internal_note_v24" as any, {
    p_request_id: requestId, p_note: note,
  });
  if (error) raise(error);
}

export async function anonymizeShopRequest(userId: string | null | undefined, requestId: string): Promise<void> {
  if (!userId || !requestId) throw new Error("Compte administrateur requis.");
  const { error } = await supabase.rpc("ms_org_shop_anonymize_request_v24" as any, { p_request_id: requestId });
  if (error) raise(error);
}

/** État public minimal — ne contient ni identité, ni e-mail, ni notes internes. */
export type PublicShopRequestTracking = {
  status: ShopRequestStatus;
  itemTitle: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function trackPublicShopRequest(organizationId: string, requestId: string, email: string): Promise<PublicShopRequestTracking | null> {
  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(requestId.trim()) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 180) {
    throw new Error("Référence ou adresse e-mail invalide.");
  }
  const { data, error } = await supabase.rpc("ms_org_shop_track_request_v25" as any, {
    p_organization_id: organizationId, p_request_id: requestId.trim(), p_requester_email: email.trim().toLowerCase(),
  });
  if (error) {
    if (["42883", "PGRST202"].includes(String(error?.code || "")))
      throw new Error("Suivi indisponible : applique la migration SQL V25 dans Supabase.");
    raise(error);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const row: any = data;
  if (!["pending", "accepted", "ready", "completed", "rejected", "cancelled"].includes(row.status)) return null;
  return {
    status: row.status as ShopRequestStatus,
    itemTitle: String(row.itemTitle || ""),
    quantity: Number(row.quantity) || 1,
    createdAt: String(row.createdAt || ""),
    updatedAt: String(row.updatedAt || ""),
  };
}

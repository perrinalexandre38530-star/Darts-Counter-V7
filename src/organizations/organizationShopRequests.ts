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
  createdAt: string;
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
};
const TABLE = "ms_organization_shop_requests";
function raise(error: any): never {
  if (["42P01", "PGRST205", "PGRST202", "42883", "42703"].includes(String(error?.code || ""))) {
    throw new Error("Module de réservations indisponible : exécute la migration SQL V23 dans Supabase.");
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
    notes: String(row.notes || ""), status: row.status, createdAt: String(row.created_at || ""),
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
    p_personalized_number: value.personalizedNumber.trim(), p_notes: value.notes.trim(), p_honeypot: "",
  });
  if (error) raise(error);
  if (typeof data !== "string" || !data) throw new Error("Demande non confirmée par le serveur.");
  return data;
}
export async function listOrganizationShopRequests(userId: string | null | undefined, organizationId: string): Promise<ShopRequest[]> {
  if (!userId || !organizationId) throw new Error("Compte administrateur requis.");
  const { data, error } = await supabase.from(TABLE as any)
    .select("id,organization_id,item_title,item_category,unit_price,currency,request_kind,requester_name,requester_email,requester_phone,quantity,selected_size,personalized_name,personalized_number,notes,status,created_at")
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

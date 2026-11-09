import { supabase } from "../lib/supabaseClient";

export type ShopNotification = {
  id: number;
  requestId: string;
  kind: "new_request" | "status_changed";
  itemTitle: string;
  status: "pending" | "accepted" | "ready" | "completed" | "rejected" | "cancelled";
  createdAt: string;
  isRead: boolean;
};
export type ShopNotificationInbox = { items: ShopNotification[]; unreadCount: number; lastReadId: number };

const STATUSES = new Set(["pending", "accepted", "ready", "completed", "rejected", "cancelled"]);
function checkError(error: any): never {
  if (["42883", "PGRST202"].includes(String(error?.code ?? ""))) {
    throw new Error("Notifications indisponibles : applique la migration SQL V26 dans Supabase.");
  }
  throw new Error(String(error?.message || "Notifications indisponibles."));
}

/** Les droits du club sont vérifiés DANS la RPC Supabase (SECURITY DEFINER). */
export async function listClubShopNotifications(userId: string | null | undefined, organizationId: string): Promise<ShopNotificationInbox> {
  if (!userId || !organizationId) throw new Error("Compte responsable requis.");
  const { data, error } = await supabase.rpc("ms_org_shop_list_notifications_v26" as any, { p_organization_id: organizationId });
  if (error) checkError(error);
  const result: any = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const items: ShopNotification[] = (Array.isArray(result.items) ? result.items : []).flatMap((item: any) => {
    const id = Number(item.id);
    if (!Number.isSafeInteger(id) || id < 1 || !STATUSES.has(item.status) ||
        !["new_request", "status_changed"].includes(item.kind) ||
        typeof item.requestId !== "string") return [];
    return [{
      id, requestId: item.requestId, kind: item.kind,
      itemTitle: String(item.itemTitle || ""), status: item.status,
      createdAt: String(item.createdAt || ""), isRead: !!item.isRead,
    }];
  });
  return { items, unreadCount: Math.max(0, Number(result.unreadCount) || 0), lastReadId: Math.max(0, Number(result.lastReadId) || 0) };
}

/** Curseur de lecture individuel, monotone, plafonné au dernier événement du club côté serveur. */
export async function markClubShopNotificationsRead(
  userId: string | null | undefined, organizationId: string, upToId: number,
): Promise<void> {
  if (!userId || !organizationId || !Number.isSafeInteger(upToId) || upToId < 1) throw new Error("Lecture invalide.");
  const { error } = await supabase.rpc("ms_org_shop_mark_notifications_read_v26" as any, {
    p_organization_id: organizationId, p_last_id: upToId,
  });
  if (error) checkError(error);
}

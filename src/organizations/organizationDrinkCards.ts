import { supabase } from "../lib/supabaseClient";

export type DrinkCardIcon = "cup" | "coffee" | "beer" | "soda" | "water" | "wine" | "cocktail";
export type DrinkCardBackground = "bar-night" | "graphite" | "wood" | "gold" | "clean" | "custom";
export type DrinkCardTemplate = {
  id: string; organizationId: string; name: string; description: string;
  paidDrinks: number; bonusDrinks: number; price: number; currency: string;
  icon: DrinkCardIcon; color: string; backgroundKey: DrinkCardBackground; backgroundUrl: string; validDays: number | null;
  status: "active" | "archived"; createdAt: string;
};
export type DrinkCardTemplateInput = Pick<DrinkCardTemplate,
  "name" | "description" | "paidDrinks" | "bonusDrinks" | "price" | "currency" | "icon" | "color" | "backgroundKey" | "backgroundUrl" | "validDays" | "status">;
export type AssignedDrinkCard = {
  id: string; organizationId: string; holderUserId: string; issuedBy: string;
  templateName: string; icon: DrinkCardIcon; color: string; backgroundKey: DrinkCardBackground; backgroundUrl: string;
  paidDrinks: number; bonusDrinks: number; remaining: number; usedSlots: number[];
  price: number; currency: string; issuedAt: string; expiresAt: string | null;
  status: "active" | "cancelled";
};
export type DrinkCardEvent = {
  id: string; cardId: string; actorUserId: string;
  action: "consume" | "undo"; reversesEventId: string | null; slotIndex: number | null;
  remainingAfter: number; createdAt: string;
};

const TEMPLATES = "ms_org_drink_card_templates";
const CARDS = "ms_org_drink_cards";
const EVENTS = "ms_org_drink_card_events";
const backgrounds: DrinkCardBackground[] = ["bar-night", "graphite", "wood", "gold", "clean", "custom"];
const icons: DrinkCardIcon[] = ["cup", "coffee", "beer", "soda", "water", "wine", "cocktail"];
const change = () => {
  void import("../lib/cloudEvents").then(({ emitCloudChange }) => emitCloudChange("organization:drink_cards")).catch(() => undefined);
};
function fail(error: any): never {
  const code = String(error?.code || "");
  const detail = String(error?.message || "");
  if (["42P01", "42883", "42703", "PGRST202", "PGRST204", "PGRST205"].includes(code))
    throw new Error("Cartes buvette indisponibles : vérifie les migrations SQL V19 puis V20 dans Supabase.");
  const cases: Record<string, string> = {
    DRINK_CARD_NOT_ADMIN: "Action réservée aux responsables du club.",
    DRINK_CARD_NOT_MEMBER: "Tu ne fais pas partie des membres actifs de ce club.",
    DRINK_CARD_HOLDER_NOT_MEMBER: "Choisis un membre actif du club.",
    DRINK_CARD_TEMPLATE_UNAVAILABLE: "Modèle de carte introuvable ou archivé.",
    DRINK_CARD_NOT_FOUND: "Carte introuvable.",
    DRINK_CARD_FORBIDDEN: "Tu ne peux pas utiliser la carte d'un autre membre.",
    DRINK_CARD_CANCELLED: "Cette carte a été annulée.",
    DRINK_CARD_EXPIRED: "Cette carte a expiré.",
    DRINK_CARD_EMPTY: "Toutes les boissons ont été utilisées.",
    DRINK_CARD_EVENT_NOT_FOUND: "Consommation introuvable.",
    DRINK_CARD_ALREADY_UNDONE: "Cette consommation a déjà été corrigée.",
    DRINK_CARD_ALREADY_FULL: "La carte est déjà pleine.",
    DRINK_CARD_NOT_ACTIVE: "Cette carte est déjà annulée.",
    DRINK_CARD_SLOT_USED: "Cette case a déjà été cochée.",
    DRINK_CARD_SLOT_INVALID: "Cette case n’existe pas.",
  };
  for (const [key, value] of Object.entries(cases)) if (detail.includes(key)) throw new Error(value);
  throw new Error(code === "42501" ? "Accès refusé : permissions insuffisantes." : detail || "Opération impossible.");
}
function authCheck(userId?: string | null) { if (!userId) throw new Error("Connexion requise."); }
function validInput(input: DrinkCardTemplateInput) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) throw new Error("Nom de carte : 2 à 80 caractères.");
  if (input.description.length > 300) throw new Error("Description trop longue.");
  const paid = Number(input.paidDrinks); const bonus = Number(input.bonusDrinks);
  if (!Number.isInteger(paid) || paid < 1 || paid > 200) throw new Error("Choisis entre 1 et 200 boissons payantes.");
  if (!Number.isInteger(bonus) || bonus < 0 || bonus > 100 || paid + bonus > 250) throw new Error("Nombre de boissons offertes invalide.");
  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0 || price > 99999999) throw new Error("Prix invalide.");
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error("Devise invalide.");
  if (!icons.includes(input.icon)) throw new Error("Icône invalide.");
  if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) throw new Error("Couleur invalide.");
  if (!backgrounds.includes(input.backgroundKey)) throw new Error("Fond de carte invalide.");
  const backgroundUrl = input.backgroundUrl.trim();
  if (backgroundUrl.length > 1200 || (backgroundUrl && !/^https:\/\//i.test(backgroundUrl))) throw new Error("Le fond personnalisé doit avoir une URL HTTPS valide.");
  if (input.backgroundKey === "custom" && !backgroundUrl) throw new Error("Importe une photo avant de sélectionner le fond personnalisé.");
  const days = input.validDays;
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) throw new Error("Durée de validité invalide.");
  return { name, description: input.description.trim(), paid_drinks: paid, bonus_drinks: bonus,
    price: Math.round(price * 100) / 100, currency: input.currency, icon: input.icon,
    color: input.color, background_key: input.backgroundKey, background_url: backgroundUrl, valid_days: days, status: input.status };
}
function template(row: any): DrinkCardTemplate {
  return { id: String(row.id), organizationId: String(row.organization_id), name: String(row.name),
    description: String(row.description || ""), paidDrinks: Number(row.paid_drinks),
    bonusDrinks: Number(row.bonus_drinks), price: Number(row.price), currency: String(row.currency),
    icon: icons.includes(row.icon) ? row.icon : "cup", color: String(row.color || "#D7A34D"),
    backgroundKey: backgrounds.includes(row.background_key) ? row.background_key : "graphite", backgroundUrl: String(row.background_url || ""),
    validDays: row.valid_days == null ? null : Number(row.valid_days),
    status: row.status === "archived" ? "archived" : "active", createdAt: String(row.created_at) };
}
function card(row: any): AssignedDrinkCard {
  return { id: String(row.id), organizationId: String(row.organization_id), holderUserId: String(row.holder_user_id),
    issuedBy: String(row.issued_by), templateName: String(row.template_name),
    icon: icons.includes(row.icon) ? row.icon : "cup", color: String(row.color || "#D7A34D"),
    backgroundKey: backgrounds.includes(row.background_key) ? row.background_key : "graphite", backgroundUrl: String(row.background_url || ""),
    paidDrinks: Number(row.paid_drinks), bonusDrinks: Number(row.bonus_drinks),
    remaining: Number(row.remaining), usedSlots: Array.isArray(row.used_slots) ? row.used_slots.map(Number).filter(Number.isInteger) : [], price: Number(row.price), currency: String(row.currency),
    issuedAt: String(row.issued_at), expiresAt: row.expires_at ? String(row.expires_at) : null,
    status: row.status === "cancelled" ? "cancelled" : "active" };
}
export async function listDrinkCardTemplates(userId: string | null, organizationId: string) {
  authCheck(userId);
  const { data, error } = await supabase.from(TEMPLATES as any).select("*")
    .eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (error) fail(error);
  return (data || []).map(template) as DrinkCardTemplate[];
}
export async function saveDrinkCardTemplate(userId: string | null, organizationId: string, input: DrinkCardTemplateInput, id?: string) {
  authCheck(userId); const payload = validInput(input);
  const table = supabase.from(TEMPLATES as any);
  const { data, error } = id ? await table.update(payload).eq("organization_id", organizationId).eq("id", id).select("id")
    : await table.insert({ organization_id: organizationId, ...payload }).select("id");
  if (error) fail(error);
  if (!data?.length) throw new Error("Modification interdite ou modèle introuvable.");
  change();
}
export async function listAssignedDrinkCards(userId: string | null, organizationId: string) {
  authCheck(userId);
  const { data, error } = await supabase.from(CARDS as any).select("*")
    .eq("organization_id", organizationId).order("issued_at", { ascending: false });
  if (error) fail(error);
  return (data || []).map(card) as AssignedDrinkCard[];
}
export async function listDrinkCardEvents(userId: string | null, organizationId: string, cardId: string) {
  authCheck(userId);
  const { data, error } = await supabase.from(EVENTS as any)
    .select("id,card_id,actor_user_id,action,reverses_event_id,slot_index,remaining_after,created_at")
    .eq("organization_id", organizationId).eq("card_id", cardId)
    .order("created_at", { ascending: false }).limit(350);
  if (error) fail(error);
  return (data || []).map((r: any) => ({ id: String(r.id), cardId: String(r.card_id),
    actorUserId: String(r.actor_user_id), action: r.action === "undo" ? "undo" : "consume",
    reversesEventId: r.reverses_event_id ? String(r.reverses_event_id) : null, slotIndex: r.slot_index == null ? null : Number(r.slot_index),
    remainingAfter: Number(r.remaining_after), createdAt: String(r.created_at) })) as DrinkCardEvent[];
}
async function rpc(name: string, args: Record<string, string | number>) {
  const { data, error } = await supabase.rpc(name as any, args as any);
  if (error) fail(error);
  change(); return data;
}
export async function issueDrinkCard(userId: string | null, orgId: string, templateId: string, holderId: string) {
  authCheck(userId); return rpc("ms_org_drink_card_issue", { p_org_id: orgId, p_template_id: templateId, p_holder_user_id: holderId });
}
export async function consumeDrinkCard(userId: string | null, orgId: string, cardId: string) {
  authCheck(userId); return rpc("ms_org_drink_card_consume", { p_org_id: orgId, p_card_id: cardId });
}
export async function stampDrinkCard(userId: string | null, orgId: string, cardId: string, slotIndex: number) {
  authCheck(userId);
  if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > 250) throw new Error("Case invalide.");
  return rpc("ms_org_drink_card_stamp", { p_org_id: orgId, p_card_id: cardId, p_slot_index: slotIndex });
}
export async function undoDrinkCardConsumption(userId: string | null, orgId: string, eventId: string) {
  authCheck(userId); return rpc("ms_org_drink_card_undo", { p_org_id: orgId, p_event_id: eventId });
}
export async function cancelDrinkCard(userId: string | null, orgId: string, cardId: string) {
  authCheck(userId); return rpc("ms_org_drink_card_cancel", { p_org_id: orgId, p_card_id: cardId });
}

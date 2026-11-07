import { supabase } from "../lib/supabaseClient";

/** Catalogue consultable par les membres. Pas de vente/paiement dans l'app. */
export type OrganizationShopCategory = "official_kit" | "clothing" | "goodies" | "drinks" | "equipment_ad";
export type OrganizationShopStatus = "draft" | "published" | "archived";
export type OrganizationShopAvailability = "available" | "preorder" | "on_request" | "unavailable";
const AVAILABILITIES: OrganizationShopAvailability[] = ["available", "preorder", "on_request", "unavailable"];

export type OrganizationShopItem = {
  id: string;
  organizationId: string;
  category: OrganizationShopCategory;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  variants: string;
  availability: OrganizationShopAvailability;
  stockQuantity: number | null;
  imageUrl: string;
  status: OrganizationShopStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationShopInput = Pick<OrganizationShopItem,
  "category" | "title" | "description" | "price" | "currency" | "variants" | "availability" | "stockQuantity" | "imageUrl" | "status" | "sortOrder">;

const TABLE = "ms_organization_shop_items";
const CATEGORIES: OrganizationShopCategory[] = ["official_kit", "clothing", "goodies", "drinks", "equipment_ad"];
function isCategory(input: unknown): input is OrganizationShopCategory {
  return CATEGORIES.includes(input as OrganizationShopCategory);
}

function fromRow(row: any): OrganizationShopItem {
  return {
    id: String(row.id || ""),
    organizationId: String(row.organization_id || ""),
    category: isCategory(row.category) ? row.category : "goodies",
    title: String(row.title || ""),
    description: String(row.description || ""),
    price: row.price == null ? null : Number(row.price),
    currency: String(row.currency || "EUR"),
    variants: String(row.variants || ""),
    availability: AVAILABILITIES.includes(row.availability) ? row.availability : "available",
    stockQuantity: row.stock_quantity == null ? null : Number(row.stock_quantity),
    imageUrl: String(row.image_url || ""),
    status: row.status === "published" || row.status === "archived" ? row.status : "draft",
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

function toRow(input: OrganizationShopInput) {
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  const variants = String(input.variants || "").trim();
  const imageUrl = String(input.imageUrl || "").trim();
  const currency = String(input.currency || "EUR").toUpperCase();
  const availability = input.availability;
  if (!AVAILABILITIES.includes(availability)) throw new Error("Disponibilité invalide.");
  const stockQuantity = input.stockQuantity == null ? null : Number(input.stockQuantity);
  if (stockQuantity !== null && (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 100000)) throw new Error("Stock invalide.");
  if (!isCategory(input.category)) throw new Error("Catégorie non autorisée.");
  if (title.length < 2 || title.length > 120) throw new Error("Le titre doit comporter de 2 à 120 caractères.");
  if (description.length > 1200 || variants.length > 250) throw new Error("Texte trop long.");
  if (imageUrl && (!/^https:\/\//i.test(imageUrl) || imageUrl.length > 1000)) throw new Error("L'image doit utiliser une URL HTTPS.");
  const price = input.price == null ? null : Number(input.price);
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 99999999)) throw new Error("Prix invalide.");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Devise invalide.");
  return {
    category: input.category, title, description, variants, image_url: imageUrl,
    price: price === null ? null : Math.round(price * 100) / 100,
    currency, availability, stock_quantity: stockQuantity, status: input.status, sort_order: Math.max(0, Math.min(1000000, Math.round(input.sortOrder || 0))),
  };
}

function raise(error: any): never {
  const code = String(error?.code || "");
  if (code === "42P01" || code === "PGRST205") throw new Error("Boutique indisponible : exécute les migrations SQL V18 et V23 dans Supabase.");
  if (code === "42501") throw new Error("Accès refusé : vérifie ton rôle dans le club.");
  throw new Error(String(error?.message || "Opération impossible sur la boutique."));
}

function changed() {
  void import("../lib/cloudEvents").then(({ emitCloudChange }) => emitCloudChange("organization:shop")).catch(() => undefined);
}

export async function listOrganizationShopItems(userId: string | null | undefined, organizationId: string): Promise<OrganizationShopItem[]> {
  if (!userId || !organizationId) throw new Error("Compte connecté et organisation requis.");
  const { data, error } = await supabase.from(TABLE as any)
    .select("id,organization_id,category,title,description,price,currency,variants,image_url,availability,stock_quantity,status,sort_order,created_at,updated_at")
    .eq("organization_id", organizationId).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) raise(error);
  return (data || []).map(fromRow);
}

export async function createOrganizationShopItem(userId: string | null | undefined, organizationId: string, input: OrganizationShopInput): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.from(TABLE as any).insert({ organization_id: organizationId, ...toRow(input) });
  if (error) raise(error);
  changed();
}

export async function updateOrganizationShopItem(userId: string | null | undefined, organizationId: string, itemId: string, input: OrganizationShopInput): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.from(TABLE as any).update(toRow(input))
    .eq("id", itemId).eq("organization_id", organizationId).select("id");
  if (error) raise(error);
  if (!data?.length) throw new Error("Article introuvable ou modification non autorisée.");
  changed();
}

export async function deleteOrganizationShopItem(userId: string | null | undefined, organizationId: string, itemId: string): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.from(TABLE as any).delete()
    .eq("id", itemId).eq("organization_id", organizationId).select("id");
  if (error) raise(error);
  if (!data?.length) throw new Error("Suppression non autorisée.");
  changed();
}

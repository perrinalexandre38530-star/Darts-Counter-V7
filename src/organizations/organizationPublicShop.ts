import { supabase } from "../lib/supabaseClient";
import type { OrganizationShopCategory } from "./organizationShop";

export type PublicShopSettings = {
  isPublished: boolean;
  headline: string;
  subtitle: string;
  coverImageUrl: string;
  contactEmail: string;
  contactPhone: string;
};
export type PublicShopProduct = {
  id: string;
  category: OrganizationShopCategory;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  variants: string;
  availability: "available" | "preorder" | "on_request" | "unavailable";
  stockQuantity: number | null;
  imageUrl: string;
};
export type PublicShopData = {
  organizationId: string;
  name: string;
  city: string;
  logoUrl: string;
  coverUrl: string;
  headline: string;
  subtitle: string;
  contactEmail: string;
  contactPhone: string;
  items: PublicShopProduct[];
};
const TABLE = "ms_organization_public_shops";
export const EMPTY_PUBLIC_SHOP_SETTINGS: PublicShopSettings = {
  isPublished: false, headline: "", subtitle: "", coverImageUrl: "", contactEmail: "", contactPhone: "",
};
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const cleanUrl = (value: string) => String(value || "").trim();
const raise = (error: any): never => {
  if (["42P01", "PGRST205", "PGRST202", "42883"].includes(String(error?.code || "")))
    throw new Error("Boutique publique indisponible : exécute la migration SQL V22 dans Supabase.");
  throw new Error(String(error?.message || "Boutique publique indisponible."));
};
export function publicShopUrl(organizationId: string): string {
  if (!isUuid(organizationId) || typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}#/club-shop/${organizationId}`;
}
export async function readPublicShopSettings(userId: string | null, organizationId: string): Promise<PublicShopSettings> {
  if (!userId || !isUuid(organizationId)) throw new Error("Compte connecté et club requis.");
  const { data, error } = await supabase.from(TABLE as any)
    .select("is_published,headline,subtitle,cover_image_url,contact_email,contact_phone")
    .eq("organization_id", organizationId).maybeSingle();
  if (error) raise(error);
  if (!data) return { ...EMPTY_PUBLIC_SHOP_SETTINGS };
  return {
    isPublished: !!data.is_published, headline: String(data.headline || ""),
    subtitle: String(data.subtitle || ""), coverImageUrl: String(data.cover_image_url || ""),
    contactEmail: String(data.contact_email || ""), contactPhone: String(data.contact_phone || ""),
  };
}
export async function savePublicShopSettings(userId: string | null, organizationId: string, value: PublicShopSettings): Promise<void> {
  if (!userId || !isUuid(organizationId)) throw new Error("Compte connecté et club requis.");
  const headline = String(value.headline || "").trim();
  const subtitle = String(value.subtitle || "").trim();
  const coverImageUrl = cleanUrl(value.coverImageUrl);
  const contactEmail = String(value.contactEmail || "").trim();
  const contactPhone = String(value.contactPhone || "").trim();
  if (headline.length > 100 || subtitle.length > 380) throw new Error("Le titre ou la description est trop long.");
  if (coverImageUrl && (!/^https:\/\//i.test(coverImageUrl) || coverImageUrl.length > 1000))
    throw new Error("La couverture doit être une URL HTTPS.");
  if (contactEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 180))
    throw new Error("Adresse e-mail publique invalide.");
  if (contactPhone.length > 45) throw new Error("Numéro de téléphone trop long.");
  const { error } = await supabase.from(TABLE as any).upsert({
    organization_id: organizationId,
    is_published: !!value.isPublished,
    headline, subtitle, cover_image_url: coverImageUrl,
    contact_email: contactEmail, contact_phone: contactPhone,
  }, { onConflict: "organization_id" });
  if (error) raise(error);
}
export async function fetchPublicShop(organizationId: string): Promise<PublicShopData | null> {
  if (!isUuid(organizationId)) return null;
  const { data, error } = await supabase.rpc("ms_org_public_shop_read_v22" as any, { p_organization_id: organizationId });
  if (error) raise(error);
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const body = data as any;
  const categories = new Set(["official_kit", "clothing", "goodies", "drinks", "equipment_ad"]);
  return {
    organizationId: String(body.organizationId || ""), name: String(body.name || ""), city: String(body.city || ""),
    logoUrl: cleanUrl(body.logoUrl), coverUrl: cleanUrl(body.coverUrl),
    headline: String(body.headline || ""), subtitle: String(body.subtitle || ""),
    contactEmail: String(body.contactEmail || ""), contactPhone: String(body.contactPhone || ""),
    items: (Array.isArray(body.items) ? body.items : []).filter((item: any) => categories.has(item.category)).map((item: any) => ({
      id: String(item.id || ""), category: item.category as OrganizationShopCategory,
      title: String(item.title || ""), description: String(item.description || ""),
      price: item.price == null ? null : Number(item.price), currency: String(item.currency || "EUR"),
      variants: String(item.variants || ""),
      availability: ["available", "preorder", "on_request", "unavailable"].includes(item.availability) ? item.availability : "available",
      stockQuantity: item.stockQuantity == null ? null : Number(item.stockQuantity),
      imageUrl: cleanUrl(item.imageUrl),
    })),
  };
}

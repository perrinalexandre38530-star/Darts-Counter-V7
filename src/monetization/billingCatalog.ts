export type PlayBillingProductType = "inapp" | "subs";

export type PlayBillingProductSpec = {
  productId: string;
  productType: PlayBillingProductType;
  basePlanId?: string;
  label: string;
};

/**
 * Catalogue Google Play natif.
 * Les Product IDs restent stables. Les abonnements utilisent un base plan explicite
 * afin que le bridge Android puisse sélectionner l'offre correcte.
 */
export const PLAY_BILLING_PRODUCTS: PlayBillingProductSpec[] = [
  { productId: "msc_premium_monthly", productType: "subs", basePlanId: "monthly", label: "Premium mensuel" },
  { productId: "msc_premium_yearly", productType: "subs", basePlanId: "yearly", label: "Premium annuel" },
  { productId: "msc_remove_ads_lifetime", productType: "inapp", label: "Sans publicité à vie" },
  { productId: "msc_pack_avatars_arcade_01", productType: "inapp", label: "Pack Avatars Arcade" },
  { productId: "msc_pack_logos_clubs_01", productType: "inapp", label: "Pack Logos Clubs" },
  { productId: "msc_pack_dartsets_pro_01", productType: "inapp", label: "Pack Dartsets Pro" },
  { productId: "msc_pack_themes_neon_01", productType: "inapp", label: "Pack Thèmes Neon+" },
  { productId: "msc_pack_bots_ai_champions_01", productType: "inapp", label: "Pack Bots IA Champions" },
  { productId: "msc_bundle_cosmetics_01", productType: "inapp", label: "Bundle Personnalisation" },
];

export function getPlayBillingProductSpec(productId: string): PlayBillingProductSpec | null {
  return PLAY_BILLING_PRODUCTS.find((p) => p.productId === String(productId || "").trim()) || null;
}

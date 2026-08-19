import type { StorePack } from "./types";
import { STORE_PRODUCT_IDS } from "./productIds";

export const GOOGLE_PLAY_CORE_PRODUCTS = {
  premiumMonthly: "msc_premium_monthly",
  premiumYearly: "msc_premium_yearly",
  removeAdsLifetime: "msc_remove_ads_lifetime",
} as const;

// IDs stables, utilisables tels quels plus tard dans Google Play Console.
export const STORE_PACKS: StorePack[] = [
  {
    id: "avatars_arcade_01",
    googlePlayProductId: "msc_pack_avatars_arcade_01",
    category: "avatars",
    title: "Pack Avatars Arcade",
    subtitle: "Nouveaux portraits et styles visuels pour les profils.",
    contents: ["Avatars supplémentaires", "Variantes de cadres", "Éléments cosmétiques"],
    entitlementKeys: ["avatars.pack.arcade.01"],
    badge: "AVATARS",
  },
  {
    id: "logos_clubs_01",
    googlePlayProductId: "msc_pack_logos_clubs_01",
    category: "logos",
    title: "Pack Logos Clubs",
    subtitle: "Une bibliothèque supplémentaire pour les équipes et clubs.",
    contents: ["Logos d'équipes", "Badges", "Écussons"],
    entitlementKeys: ["logos.pack.clubs.01"],
    badge: "LOGOS",
  },
  {
    id: "dartsets_pro_01",
    googlePlayProductId: "msc_pack_dartsets_pro_01",
    category: "dartsets",
    title: "Pack Dartsets Pro",
    subtitle: "Visuels et collections additionnelles pour Mes fléchettes.",
    contents: ["Sets additionnels", "Vignettes", "Collections visuelles"],
    entitlementKeys: ["dartsets.pack.pro.01"],
    badge: "SETS",
  },
  {
    id: "themes_neon_01",
    googlePlayProductId: STORE_PRODUCT_IDS.themesArenas,
    category: "themes",
    title: "Collection Thèmes Premium",
    subtitle: "Une collection de packs premium : Arenas & Ambiances, Matières d’exception, Métaux & Industrie, Éléments extrêmes et Luxe & Joyaux.",
    contents: ["Arenas & Ambiances", "Matières d’exception", "Métaux & Industrie", "Éléments extrêmes", "Luxe & Joyaux"],
    entitlementKeys: ["themes.pack.neon.01", "themes.pack.arenas.01"],
    badge: "THÈMES PREMIUM",
  },
  {
    id: "bots_ai_champions_01",
    googlePlayProductId: "msc_pack_bots_ai_champions_01",
    category: "bots",
    title: "Pack Bots IA Champions",
    subtitle: "Nouveaux adversaires CPU avec identités et niveaux dédiés.",
    contents: ["Bots IA additionnels", "Avatars dédiés", "Profils de difficulté"],
    entitlementKeys: ["bots.pack.champions.01"],
    badge: "BOTS IA",
  },
  {
    id: "cosmetics_bundle_01",
    googlePlayProductId: STORE_PRODUCT_IDS.cosmeticsBundle,
    category: "bundle",
    title: "Bundle Personnalisation",
    subtitle: "Avatars + logos + sets + thèmes dans un seul pack.",
    contents: ["Avatars", "Logos", "Dartsets", "Thèmes"],
    entitlementKeys: [
      "avatars.pack.arcade.01",
      "logos.pack.clubs.01",
      "dartsets.pack.pro.01",
      "themes.pack.neon.01",
      "themes.pack.arenas.01",
    ],
    badge: "BUNDLE",
  },
];

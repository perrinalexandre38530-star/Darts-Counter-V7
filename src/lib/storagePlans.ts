// ============================================
// src/lib/storagePlans.ts
// Catalogue stockage cloud + préférences de destination
// Objectif : préparer le modèle grand public sans casser le NAS actuel.
// - Supabase : compte/index minimal
// - R2 : données volumineuses
// - Local / téléphone / SD : export manuel ou stockage appareil
// - NAS fondateur : réservé admin, hors offres publiques
// ============================================

export const MB = 1024 * 1024;
export const GB = 1024 * MB;
export const TB = 1024 * GB;

export type StoragePlanId =
  | "free_test_100mb"
  | "starter_500mb"
  | "player_5gb"
  | "plus_25gb"
  | "pro_100gb"
  | "club_500gb"
  | "titan_2tb"
  | "founder_nas";

export type StoragePlan = {
  id: StoragePlanId;
  label: string;
  shortLabel: string;
  quotaBytes: number;
  priceMonthlyCents: number;
  priceYearlyCents?: number;
  public: boolean;
  badge?: string;
  description: string;
  features: string[];
  stripeMonthlyEnv?: string;
  stripeYearlyEnv?: string;
};

export const CLOUD_STORAGE_PLANS: StoragePlan[] = [
  {
    id: "free_test_100mb",
    label: "Free Test",
    shortLabel: "100 Mo",
    quotaBytes: 100 * MB,
    priceMonthlyCents: 0,
    public: true,
    badge: "Test",
    description: "Petit espace gratuit pour tester la sauvegarde cloud sans ouvrir un vrai stockage permanent.",
    features: ["100 Mo cloud", "avatars compressés", "quelques sauvegardes / parties", "upgrade requis au-delà"],
  },
  {
    id: "starter_500mb",
    label: "Starter",
    shortLabel: "500 Mo",
    quotaBytes: 500 * MB,
    priceMonthlyCents: 99,
    priceYearlyCents: 999,
    public: true,
    description: "Petite sauvegarde cloud pour usage occasionnel.",
    features: ["500 Mo cloud", "backup manuel", "sync multi-appareils légère"],
    stripeMonthlyEnv: "STRIPE_PRICE_STORAGE_STARTER_MONTHLY",
    stripeYearlyEnv: "STRIPE_PRICE_STORAGE_STARTER_YEARLY",
  },
  {
    id: "player_5gb",
    label: "Player",
    shortLabel: "5 Go",
    quotaBytes: 5 * GB,
    priceMonthlyCents: 199,
    priceYearlyCents: 1999,
    public: true,
    badge: "Conseillé",
    description: "Offre joueur régulier : historique, stats et avatars sans se prendre la tête.",
    features: ["5 Go cloud", "historique compressé", "backup automatique", "sync multi-appareils"],
    stripeMonthlyEnv: "STRIPE_PRICE_STORAGE_PLAYER_MONTHLY",
    stripeYearlyEnv: "STRIPE_PRICE_STORAGE_PLAYER_YEARLY",
  },
  {
    id: "plus_25gb",
    label: "Plus",
    shortLabel: "25 Go",
    quotaBytes: 25 * GB,
    priceMonthlyCents: 399,
    priceYearlyCents: 3999,
    public: true,
    description: "Pour gros historique, compétitions perso et plusieurs profils actifs.",
    features: ["25 Go cloud", "compétitions complètes", "stats détaillées", "archives longues"],
    stripeMonthlyEnv: "STRIPE_PRICE_STORAGE_PLUS_MONTHLY",
    stripeYearlyEnv: "STRIPE_PRICE_STORAGE_PLUS_YEARLY",
  },
  {
    id: "pro_100gb",
    label: "Pro",
    shortLabel: "100 Go",
    quotaBytes: 100 * GB,
    priceMonthlyCents: 999,
    priceYearlyCents: 9999,
    public: true,
    description: "Pour utilisateurs intensifs, soirées régulières, gros volume de parties et médias.",
    features: ["100 Go cloud", "sauvegardes longues", "médias personnalisés", "restauration avancée"],
    stripeMonthlyEnv: "STRIPE_PRICE_STORAGE_PRO_MONTHLY",
    stripeYearlyEnv: "STRIPE_PRICE_STORAGE_PRO_YEARLY",
  },
  {
    id: "club_500gb",
    label: "Club",
    shortLabel: "500 Go",
    quotaBytes: 500 * GB,
    priceMonthlyCents: 2499,
    priceYearlyCents: 24900,
    public: true,
    description: "Pour associations, bars, clubs, ligues et compétitions avec plusieurs joueurs.",
    features: ["500 Go cloud", "club / équipe", "compétitions partagées", "stockage médias club"],
    stripeMonthlyEnv: "STRIPE_PRICE_STORAGE_CLUB_MONTHLY",
    stripeYearlyEnv: "STRIPE_PRICE_STORAGE_CLUB_YEARLY",
  },
  {
    id: "titan_2tb",
    label: "Titan 2 To",
    shortLabel: "2 To",
    quotaBytes: 2 * TB,
    priceMonthlyCents: 5999,
    priceYearlyCents: 59900,
    public: true,
    badge: "Max",
    description: "Remplace l'ancien libellé “illimité raisonnable” par une limite claire : 2 To.",
    features: ["2 To cloud", "gros club / ligues", "archives très longues", "contrôle anti-abus"],
    stripeMonthlyEnv: "STRIPE_PRICE_STORAGE_TITAN_MONTHLY",
    stripeYearlyEnv: "STRIPE_PRICE_STORAGE_TITAN_YEARLY",
  },
  {
    id: "founder_nas",
    label: "Fondateur NAS",
    shortLabel: "NAS",
    quotaBytes: Number.MAX_SAFE_INTEGER,
    priceMonthlyCents: 0,
    public: false,
    badge: "Admin",
    description: "Réservé au compte fondateur : stockage NAS conservé, hors offres publiques et hors facturation utilisateur.",
    features: ["NAS privé", "quota non public", "backup admin", "mode migration / test"],
  },
];

export type StorageDestinationId =
  | "app_local"
  | "device_file"
  | "external_sd_manual"
  | "cloud_r2"
  | "founder_nas";

export type StorageDestination = {
  id: StorageDestinationId;
  label: string;
  shortLabel: string;
  cloud: boolean;
  public: boolean;
  description: string;
  warning?: string;
};

export const STORAGE_DESTINATIONS: StorageDestination[] = [
  {
    id: "app_local",
    label: "Téléphone / mémoire interne de l'app",
    shortLabel: "Appareil",
    cloud: false,
    public: true,
    description: "Stockage local IndexedDB/OPFS : rapide, gratuit, mais lié à l'appareil et au navigateur.",
  },
  {
    id: "device_file",
    label: "Fichier local choisi par l'utilisateur",
    shortLabel: "Export fichier",
    cloud: false,
    public: true,
    description: "Export/import manuel vers l'emplacement choisi : téléphone, dossier documents, carte SD, clé USB, Drive local, etc.",
  },
  {
    id: "external_sd_manual",
    label: "Carte SD / stockage externe",
    shortLabel: "SD / externe",
    cloud: false,
    public: true,
    description: "Possible via export/import fichier ou via l'app Android native. Le navigateur web ne peut pas toujours écrire directement sur la carte SD.",
    warning: "Sur PWA navigateur, l'accès direct SD dépend du système. L'export fichier reste le fallback sûr.",
  },
  {
    id: "cloud_r2",
    label: "Cloud Multisports (Cloudflare R2)",
    shortLabel: "Cloud R2",
    cloud: true,
    public: true,
    description: "Stockage cloud payant contrôlé par quota : historiques, stats, avatars, compétitions et backups compressés.",
  },
  {
    id: "founder_nas",
    label: "NAS fondateur",
    shortLabel: "NAS",
    cloud: false,
    public: false,
    description: "Réservé au compte admin/fondateur pour ne pas facturer ton propre usage de l'application.",
  },
];

export type StoragePrefs = {
  version: 1;
  selectedDestination: StorageDestinationId;
  selectedCloudPlan: StoragePlanId;
  preferExternalStorage: boolean;
  updatedAt: number;
};

export const STORAGE_PREFS_KEY = "dc_storage_prefs_v1";

export const DEFAULT_STORAGE_PREFS: StoragePrefs = {
  version: 1,
  selectedDestination: "app_local",
  selectedCloudPlan: "free_test_100mb",
  preferExternalStorage: false,
  updatedAt: 0,
};

export function formatStorageBytes(bytes: number): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= TB) return `${trimNumber(n / TB)} To`;
  if (n >= GB) return `${trimNumber(n / GB)} Go`;
  if (n >= MB) return `${trimNumber(n / MB)} Mo`;
  if (n >= 1024) return `${trimNumber(n / 1024)} Ko`;
  return `${Math.round(n)} o`;
}

export function formatStoragePrice(cents: number): string {
  const n = Number(cents || 0);
  if (!Number.isFinite(n) || n <= 0) return "0 €";
  return `${(n / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function trimNumber(v: number): string {
  if (!Number.isFinite(v)) return "0";
  return v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, "");
}

function normalizePlanId(value: any): StoragePlanId {
  const raw = String(value || "").trim() as StoragePlanId;
  return CLOUD_STORAGE_PLANS.some((p) => p.id === raw) ? raw : DEFAULT_STORAGE_PREFS.selectedCloudPlan;
}

function normalizeDestinationId(value: any): StorageDestinationId {
  const raw = String(value || "").trim() as StorageDestinationId;
  return STORAGE_DESTINATIONS.some((d) => d.id === raw) ? raw : DEFAULT_STORAGE_PREFS.selectedDestination;
}

export function getStoragePlan(id: StoragePlanId | string | null | undefined): StoragePlan {
  return CLOUD_STORAGE_PLANS.find((p) => p.id === id) || CLOUD_STORAGE_PLANS[0];
}

export function getStorageDestination(id: StorageDestinationId | string | null | undefined): StorageDestination {
  return STORAGE_DESTINATIONS.find((d) => d.id === id) || STORAGE_DESTINATIONS[0];
}

export function getPublicStoragePlans(): StoragePlan[] {
  return CLOUD_STORAGE_PLANS.filter((p) => p.public);
}

export function getPublicStorageDestinations(): StorageDestination[] {
  return STORAGE_DESTINATIONS.filter((d) => d.public);
}

export function loadStoragePrefs(): StoragePrefs {
  try {
    if (typeof window === "undefined") return DEFAULT_STORAGE_PREFS;
    const raw = window.localStorage.getItem(STORAGE_PREFS_KEY);
    if (!raw) return DEFAULT_STORAGE_PREFS;
    const parsed = JSON.parse(raw) || {};
    return {
      version: 1,
      selectedDestination: normalizeDestinationId(parsed.selectedDestination),
      selectedCloudPlan: normalizePlanId(parsed.selectedCloudPlan),
      preferExternalStorage: !!parsed.preferExternalStorage,
      updatedAt: Number(parsed.updatedAt || 0),
    };
  } catch {
    return DEFAULT_STORAGE_PREFS;
  }
}

export function saveStoragePrefs(next: Partial<StoragePrefs>): StoragePrefs {
  const merged: StoragePrefs = {
    ...loadStoragePrefs(),
    ...next,
    version: 1,
    selectedDestination: normalizeDestinationId(next.selectedDestination ?? loadStoragePrefs().selectedDestination),
    selectedCloudPlan: normalizePlanId(next.selectedCloudPlan ?? loadStoragePrefs().selectedCloudPlan),
    preferExternalStorage: !!(next.preferExternalStorage ?? loadStoragePrefs().preferExternalStorage),
    updatedAt: Date.now(),
  };
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent("dc-storage-prefs-changed", { detail: merged }));
    }
  } catch {}
  return merged;
}

export type LocalStorageCapability = {
  opfs: boolean;
  persistentStorage: boolean;
  filePicker: boolean;
  mobileLike: boolean;
};

export function getLocalStorageCapabilities(): LocalStorageCapability {
  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  const win: any = typeof window !== "undefined" ? window : null;
  const ua = String(nav?.userAgent || "").toLowerCase();
  return {
    opfs: !!nav?.storage?.getDirectory,
    persistentStorage: !!nav?.storage?.persist,
    filePicker: !!win?.showSaveFilePicker,
    mobileLike: /android|iphone|ipad|ipod/.test(ua),
  };
}

export async function estimateBrowserStorage(): Promise<{ usage: number; quota: number; free: number }> {
  try {
    const est = await (navigator as any)?.storage?.estimate?.();
    const quota = Number(est?.quota || 0);
    const usage = Number(est?.usage || 0);
    return { usage, quota, free: Math.max(0, quota - usage) };
  } catch {
    return { usage: 0, quota: 0, free: 0 };
  }
}

export type AdPlacement =
  | "home"
  | "messages"
  | "profiles"
  | "games"
  | "competitions"
  | "online"
  | "stats"
  | "history"
  | "settings"
  | "screens";

export type EndGameAdTiming = "before_results" | "after_results" | "off";

export type AdShowStatus = "shown" | "unavailable" | "skipped" | "error";

export type AdShowResult = {
  status: AdShowStatus;
  provider: "android" | "android-admob" | "web-test" | "none";
  error?: string;
};

export type MonetizationPrefs = {
  adsEnabled: boolean;
  bannersEnabled: boolean;
  endGameVideoEnabled: boolean;
  endGameAdTiming: EndGameAdTiming;
  endGameEveryMatches: number;
  minInterstitialIntervalMs: number;
  houseAdsEnabled: boolean;
  testMode: boolean;
};

export type PremiumState = {
  active: boolean;
  source: "verified-server" | "google-play" | "developer" | "none";
  products: string[];
};

export type PackCategory = "avatars" | "logos" | "dartsets" | "themes" | "bots" | "bundle";

export type StorePack = {
  id: string;
  googlePlayProductId: string;
  category: PackCategory;
  title: string;
  subtitle: string;
  contents: string[];
  entitlementKeys: string[];
  badge?: string;
};

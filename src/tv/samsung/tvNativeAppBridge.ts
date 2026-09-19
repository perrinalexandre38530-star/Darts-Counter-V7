export type SamsungTvNativeProfile = {
  id: string;
  name: string;
  avatar?: string | null;
  countryCode?: string;
  stats?: Record<string, any>;
};

export type SamsungTvNativeAppBoot = {
  version: 1;
  tab: string;
  params?: any;
  gameConfig?: any;
  sportId?: string;
  sessionId?: string;
  activeProfileId?: string | null;
  profiles?: SamsungTvNativeProfile[];
  settings?: Record<string, any>;
  theme?: Record<string, any>;
  launchedAt: number;
};

declare global {
  interface Window {
    __MSS_SAMSUNG_TV_NATIVE_APP_BOOT__?: SamsungTvNativeAppBoot | null;
  }
}

export function setSamsungTvNativeAppBoot(boot: SamsungTvNativeAppBoot | null) {
  if (typeof window === "undefined") return;
  window.__MSS_SAMSUNG_TV_NATIVE_APP_BOOT__ = boot;
}

export function readSamsungTvNativeAppBoot(): SamsungTvNativeAppBoot | null {
  if (typeof window === "undefined") return null;
  const boot = window.__MSS_SAMSUNG_TV_NATIVE_APP_BOOT__;
  if (!boot || typeof boot !== "object" || !String(boot.tab || "")) return null;
  return boot;
}

export function isSamsungTvNativeAppMode() {
  return !!readSamsungTvNativeAppBoot();
}

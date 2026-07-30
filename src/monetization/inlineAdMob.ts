import { getAdMobBannerId, getAdMobRuntimeConfig } from "./adMobConfig";
import { ensureNativeAdMobReady } from "./nativeAdMob";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import type { AdPlacement } from "./types";

export type InlineAdRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  visible: boolean;
};

type InlineAdMobPlugin = {
  show: (options: {
    slotId: string;
    adId: string;
    isTesting: boolean;
    testDeviceIds: string[];
    left: number;
    top: number;
    width: number;
    height: number;
    visible: boolean;
  }) => Promise<void>;
  update: (options: {
    slotId: string;
    left: number;
    top: number;
    width: number;
    height: number;
    visible: boolean;
  }) => Promise<void>;
  hide: (options: { slotId: string }) => Promise<void>;
  hideAll: () => Promise<void>;
};

let pluginCache: InlineAdMobPlugin | null | undefined;

function getPlugin(): InlineAdMobPlugin | null {
  if (pluginCache !== undefined) return pluginCache;
  if (typeof window === "undefined" || !isCapacitorNativeRuntime()) {
    pluginCache = null;
    return null;
  }
  try {
    const cap = (window as any).Capacitor;
    if (typeof cap?.registerPlugin === "function") {
      pluginCache = cap.registerPlugin("InlineAdMob") as InlineAdMobPlugin;
      return pluginCache;
    }
    pluginCache = cap?.Plugins?.InlineAdMob || null;
    return pluginCache;
  } catch {
    pluginCache = null;
    return null;
  }
}

export function canUseInlineGoogleAds(): boolean {
  return isCapacitorNativeRuntime() && !!getPlugin();
}

export async function showInlineGoogleAd(
  slotId: string,
  placement: AdPlacement,
  rect: InlineAdRect
): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin || !rect.visible) return false;

  const status = await ensureNativeAdMobReady();
  if (!status.canRequestAds) return false;

  const config = getAdMobRuntimeConfig();
  try {
    // Le pont Android ne résout désormais la promesse qu'après onAdLoaded.
    // En cas d'échec réseau/no-fill, false permet au composant React de
    // retenter automatiquement sans attendre une navigation de l'utilisateur.
    await plugin.show({
      slotId,
      adId: getAdMobBannerId(placement),
      isTesting: config.testMode,
      testDeviceIds: config.mode === "real_test" ? config.testDeviceIds : [],
      ...rect,
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateInlineGoogleAd(slotId: string, rect: InlineAdRect): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  await plugin.update({ slotId, ...rect });
}

export async function hideInlineGoogleAd(slotId: string): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.hide({ slotId });
  } catch {
    // Une vue déjà détruite ne doit jamais casser la navigation.
  }
}

export async function hideAllInlineGoogleAds(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.hideAll();
  } catch {
    // Best effort au changement de route / arrêt de l'app.
  }
}

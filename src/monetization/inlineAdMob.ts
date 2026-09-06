import { getAdMobBannerId, getAdMobRuntimeConfig } from "./adMobConfig";
import { ensureNativeAdMobReady } from "./nativeAdMob";
import { canRequestBannerAds, getVerifiedAdFreeState, loadMonetizationPrefs, subscribeMonetizationPrefs, subscribeVerifiedEntitlements } from "./prefs";
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
  setAdsAllowed: (options: { allowed: boolean }) => Promise<void>;
  addListener?: (
    eventName: "inlineAdLoaded" | "inlineAdFailed" | "inlineAdImpression" | "inlineAdClicked" | "inlineAdPaid",
    listener: (event: any) => void
  ) => Promise<{ remove: () => Promise<void> }> | { remove: () => Promise<void> };
};

let pluginCache: InlineAdMobPlugin | null | undefined;

export type InlineAdMobTelemetrySnapshot = {
  loaded: number;
  failed: number;
  impressions: number;
  clicks: number;
  paidEvents: number;
  testImpressions: number;
  valueMicrosByCurrency: Record<string, number>;
  lastEventAt: number;
  lastSlotId?: string;
  lastPlacement?: AdPlacement;
  lastFailureCode?: number;
  lastFailureMessage?: string;
};

const TELEMETRY_KEY = "mss.admob.inline.telemetry.v1";
const slotPlacements = new Map<string, AdPlacement>();
const telemetrySubscribers = new Set<() => void>();
let telemetryListenersInstalled = false;

const EMPTY_TELEMETRY: InlineAdMobTelemetrySnapshot = {
  loaded: 0,
  failed: 0,
  impressions: 0,
  clicks: 0,
  paidEvents: 0,
  testImpressions: 0,
  valueMicrosByCurrency: {},
  lastEventAt: 0,
};

function loadTelemetry(): InlineAdMobTelemetrySnapshot {
  if (typeof window === "undefined") return { ...EMPTY_TELEMETRY, valueMicrosByCurrency: {} };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TELEMETRY_KEY) || "{}");
    return {
      ...EMPTY_TELEMETRY,
      ...parsed,
      valueMicrosByCurrency: parsed?.valueMicrosByCurrency && typeof parsed.valueMicrosByCurrency === "object"
        ? { ...parsed.valueMicrosByCurrency }
        : {},
    };
  } catch {
    return { ...EMPTY_TELEMETRY, valueMicrosByCurrency: {} };
  }
}

function saveTelemetry(next: InlineAdMobTelemetrySnapshot): void {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next)); } catch {}
  }
  telemetrySubscribers.forEach((listener) => {
    try { listener(); } catch {}
  });
}

function patchTelemetry(
  event: any,
  patch: (current: InlineAdMobTelemetrySnapshot) => InlineAdMobTelemetrySnapshot
): void {
  const current = loadTelemetry();
  const slotId = String(event?.slotId || "").trim();
  const placement = slotPlacements.get(slotId);
  const next = patch({
    ...current,
    lastEventAt: Date.now(),
    ...(slotId ? { lastSlotId: slotId } : {}),
    ...(placement ? { lastPlacement: placement } : {}),
  });
  saveTelemetry(next);
}

function installTelemetryListeners(plugin: InlineAdMobPlugin): void {
  if (telemetryListenersInstalled || typeof plugin.addListener !== "function") return;
  telemetryListenersInstalled = true;

  const listen = (name: Parameters<NonNullable<InlineAdMobPlugin["addListener"]>>[0], handler: (event: any) => void) => {
    try {
      void Promise.resolve(plugin.addListener?.(name, handler));
    } catch {
      // La télémétrie locale ne doit jamais empêcher une bannière de se charger.
    }
  };

  listen("inlineAdLoaded", (event) => {
    patchTelemetry(event, (current) => ({ ...current, loaded: current.loaded + 1 }));
  });
  listen("inlineAdFailed", (event) => {
    patchTelemetry(event, (current) => ({
      ...current,
      failed: current.failed + 1,
      lastFailureCode: Number(event?.code) || 0,
      lastFailureMessage: String(event?.message || ""),
    }));
  });
  listen("inlineAdImpression", (event) => {
    patchTelemetry(event, (current) => ({
      ...current,
      impressions: current.impressions + (event?.isTesting ? 0 : 1),
      testImpressions: current.testImpressions + (event?.isTesting ? 1 : 0),
    }));
  });
  listen("inlineAdClicked", (event) => {
    patchTelemetry(event, (current) => ({
      ...current,
      clicks: current.clicks + (event?.isTesting ? 0 : 1),
    }));
  });
  listen("inlineAdPaid", (event) => {
    const currency = String(event?.currencyCode || "").trim().toUpperCase();
    const micros = Math.max(0, Number(event?.valueMicros) || 0);
    patchTelemetry(event, (current) => ({
      ...current,
      paidEvents: current.paidEvents + (event?.isTesting ? 0 : 1),
      valueMicrosByCurrency: event?.isTesting || !currency
        ? current.valueMicrosByCurrency
        : {
            ...current.valueMicrosByCurrency,
            [currency]: Math.max(0, Number(current.valueMicrosByCurrency[currency]) || 0) + micros,
          },
    }));
  });
}

export function getInlineAdMobTelemetrySnapshot(): InlineAdMobTelemetrySnapshot {
  return loadTelemetry();
}

export function subscribeInlineAdMobTelemetry(listener: () => void): () => void {
  telemetrySubscribers.add(listener);
  return () => telemetrySubscribers.delete(listener);
}

export function resetInlineAdMobTelemetry(): void {
  saveTelemetry({ ...EMPTY_TELEMETRY, valueMicrosByCurrency: {} });
}

const slotEpochs = new Map<string, number>();
let nativeLoadQueue: Promise<void> = Promise.resolve();
let nextNativeLoadAt = 0;
const NATIVE_LOAD_GAP_MS = 650;
const NATIVE_LOAD_TIMEOUT_MS = 15000;

function slotEpoch(slotId: string): number {
  return slotEpochs.get(slotId) || 0;
}

function invalidateSlot(slotId: string): void {
  slotEpochs.set(slotId, slotEpoch(slotId) + 1);
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function enqueueNativeLoad<T>(task: () => Promise<T>): Promise<T> {
  const run = nativeLoadQueue.then(task, task);
  nativeLoadQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer = 0;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`timeout ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

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
      installTelemetryListeners(pluginCache);
      return pluginCache;
    }
    pluginCache = cap?.Plugins?.InlineAdMob || null;
    if (pluginCache) installTelemetryListeners(pluginCache);
    return pluginCache;
  } catch {
    pluginCache = null;
    return null;
  }
}


let guardInstalled = false;

async function syncInlineAdsPolicy(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  const allowed = canRequestBannerAds(loadMonetizationPrefs());
  try { await plugin.setAdsAllowed({ allowed }); } catch {}
  if (!allowed) {
    for (const slotId of slotEpochs.keys()) invalidateSlot(slotId);
    try { await plugin.hideAll(); } catch {}
  }
}

function ensureInlineAdsPolicyGuard(): void {
  if (guardInstalled || typeof window === "undefined") return;
  guardInstalled = true;
  subscribeMonetizationPrefs(() => { void syncInlineAdsPolicy(); });
  subscribeVerifiedEntitlements(() => { void syncInlineAdsPolicy(); });
  void syncInlineAdsPolicy();
}

export function canUseInlineGoogleAds(): boolean {
  ensureInlineAdsPolicyGuard();
  return isCapacitorNativeRuntime() && !!getPlugin();
}

export async function showInlineGoogleAd(
  slotId: string,
  placement: AdPlacement,
  rect: InlineAdRect
): Promise<boolean> {
  ensureInlineAdsPolicyGuard();
  slotPlacements.set(slotId, placement);
  if (!canRequestBannerAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active) {
    await hideInlineGoogleAd(slotId);
    return false;
  }

  const plugin = getPlugin();
  if (!plugin || !rect.visible) return false;
  try { await plugin.setAdsAllowed({ allowed: true }); } catch {}

  const requestedEpoch = slotEpoch(slotId);

  // Les AdView inline sont chargées en file, une à la fois. Cela évite les
  // rafales simultanées (HOME possède deux bannières) et les throttles/no-fill
  // aléatoires observés lors d'une navigation rapide entre les pages.
  return enqueueNativeLoad(async () => {
    if (slotEpoch(slotId) !== requestedEpoch) return false;
    if (!canRequestBannerAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active) return false;

    const delay = Math.max(0, nextNativeLoadAt - Date.now());
    await wait(delay);
    if (slotEpoch(slotId) !== requestedEpoch) return false;
    if (!canRequestBannerAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active) return false;

    const status = await ensureNativeAdMobReady();
    if (!status.canRequestAds || slotEpoch(slotId) !== requestedEpoch) return false;
    if (!canRequestBannerAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active) return false;

    const config = getAdMobRuntimeConfig();
    const adId = getAdMobBannerId(placement);
    nextNativeLoadAt = Date.now() + NATIVE_LOAD_GAP_MS;

    try {
      await withTimeout(plugin.show({
        slotId,
        adId,
        isTesting: config.testMode,
        testDeviceIds: config.mode === "real_test" ? config.testDeviceIds : [],
        ...rect,
      }), NATIVE_LOAD_TIMEOUT_MS);

      if (slotEpoch(slotId) !== requestedEpoch) {
        try { await plugin.hide({ slotId }); } catch {}
        return false;
      }
      return true;
    } catch (error) {
      try { await plugin.hide({ slotId }); } catch {}
      console.warn(`[AdMob:inline] ${slotId}/${placement} non chargé`, error);
      return false;
    }
  });
}

export async function updateInlineGoogleAd(slotId: string, rect: InlineAdRect): Promise<void> {
  if (!canRequestBannerAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active) {
    await hideInlineGoogleAd(slotId);
    return;
  }
  const plugin = getPlugin();
  if (!plugin) return;
  await plugin.update({ slotId, ...rect });
}

export async function hideInlineGoogleAd(slotId: string): Promise<void> {
  invalidateSlot(slotId);
  slotPlacements.delete(slotId);
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.hide({ slotId });
  } catch {
    // Une vue déjà détruite ne doit jamais casser la navigation.
  }
}

export async function hideAllInlineGoogleAds(): Promise<void> {
  ensureInlineAdsPolicyGuard();
  for (const slotId of slotEpochs.keys()) invalidateSlot(slotId);
  slotPlacements.clear();
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.hideAll();
  } catch {
    // Best effort au changement de route / arrêt de l'app.
  }
}

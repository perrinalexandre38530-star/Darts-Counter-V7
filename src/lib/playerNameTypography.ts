// Global player-name typography.
// Applies the same display font everywhere while keeping DOM observation cheap.
// PERF V68: no full IndexedDB/localStorage/document scan every 10 seconds and no
// characterData observer on every live score update.

import { isGameplayRuntime, scheduleRuntimeIdle } from "./runtimePerformance";
import { getRuntimePlatform } from "./nativePlatform";

const PLAYER_NAME_CLASS = "dc-player-name-jumbo";
const PLAYER_NAME_FONT = '"Bangers", "Luckiest Guy", "Baloo 2", "Trebuchet MS", "Arial Rounded MT Bold", system-ui, sans-serif';

const knownNames = new Set<string>();
let observer: MutationObserver | null = null;
let refreshTimer = 0;
let refreshCancel: (() => void) | null = null;
let refreshQueued = false;
let started = false;

function cleanName(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function addName(value: unknown) {
  const name = cleanName(value);
  if (!name || name.length < 2 || name.length > 80) return;
  knownNames.add(name);
}

function collectNamesFromObject(value: any, depth = 0) {
  if (depth > 7 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectNamesFromObject(item, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  for (const key of ["name", "displayName", "nickname", "playerName", "profileName", "public_name"]) {
    if (key in value) addName(value[key]);
  }

  for (const [key, child] of Object.entries(value)) {
    const k = key.toLowerCase();
    if (
      depth === 0 ||
      k.includes("player") ||
      k.includes("profile") ||
      k.includes("friend") ||
      k.includes("member") ||
      k.includes("bot") ||
      k.includes("participant") ||
      k.includes("room") ||
      k.includes("lobby") ||
      k.includes("user") ||
      Array.isArray(child)
    ) {
      collectNamesFromObject(child, depth + 1);
    }
  }
}

function collectNamesFromLocalStorage() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      const lower = key.toLowerCase();
      if (!/(profile|player|friend|bot|participant|lobby|room|user)/.test(lower)) continue;
      const raw = localStorage.getItem(key);
      if (!raw || raw.length > 1_500_000) continue;
      try { collectNamesFromObject(JSON.parse(raw)); } catch {}
    }
  } catch {}
}

function collectRuntimeNames() {
  try {
    const store = (window as any)?.__appStore?.store;
    if (!store) return false;
    collectNamesFromObject({
      profiles: store?.profiles,
      friends: store?.friends,
      players: store?.players,
      localPlayers: store?.localPlayers,
      participants: store?.participants,
      bots: store?.bots,
      account: store?.account,
      user: store?.user,
    });
    return true;
  } catch {
    return false;
  }
}

async function refreshKnownNames(options: { fullDocument?: boolean; allowStorageFallback?: boolean } = {}) {
  const hasRuntimeStore = collectRuntimeNames();

  // IndexedDB is fallback-only now. During normal app runtime the live App store
  // already has the same profile data and avoids a full persistence read.
  if (!hasRuntimeStore && options.allowStorageFallback !== false) {
    try {
      const [{ loadStore }, { loadBots }] = await Promise.all([
        import("./storage"),
        import("./bots"),
      ]);
      const store = await loadStore<any>();
      collectNamesFromObject({
        profiles: store?.profiles,
        friends: store?.friends,
        players: store?.players,
        localPlayers: store?.localPlayers,
        participants: store?.participants,
        account: store?.account,
        user: store?.user,
      });
      for (const bot of loadBots?.() || []) collectNamesFromObject(bot);
    } catch {}
  }

  if (options.allowStorageFallback !== false && !hasRuntimeStore) {
    collectNamesFromLocalStorage();
  }

  if (options.fullDocument && !isGameplayRuntime()) scanDocument();
}

function isEligibleElement(el: HTMLElement) {
  const tag = el.tagName;
  if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "TEXTAREA", "SELECT", "OPTION"].includes(tag)) return false;
  if (el.isContentEditable) return false;
  if (tag === "INPUT") {
    const input = el as HTMLInputElement;
    const key = `${input.name || ""} ${input.id || ""} ${input.className || ""}`.toLowerCase();
    return /(nickname|player.?name|profile.?name|display.?name|pseudo)/.test(key);
  }
  return true;
}

function exactVisibleText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) return cleanName(el.value);
  return cleanName(el.textContent);
}

function shouldUsePlayerFont(el: HTMLElement): boolean {
  if (!isEligibleElement(el)) return false;

  const cls = typeof el.className === "string" ? el.className.toLowerCase() : "";
  const dataName = cleanName(el.getAttribute("data-player-name") || el.getAttribute("data-profile-name"));
  if (dataName) return true;
  if (/(player[-_ ]?name|profile[-_ ]?name|nickname|pseudo)/.test(cls)) return true;

  const text = exactVisibleText(el);
  if (!text || !knownNames.has(text)) return false;
  return el.childElementCount <= 2;
}

function tagElement(el: HTMLElement) {
  if (shouldUsePlayerFont(el)) {
    if (!el.classList.contains(PLAYER_NAME_CLASS)) el.classList.add(PLAYER_NAME_CLASS);
    if (!el.style.getPropertyValue("--dc-player-name-font")) {
      el.style.setProperty("--dc-player-name-font", PLAYER_NAME_FONT);
    }
  } else if (el.classList.contains(PLAYER_NAME_CLASS)) {
    el.classList.remove(PLAYER_NAME_CLASS);
  }
}

const ANDROID_PLAYER_SELECTOR = [
  "[data-player-name]",
  "[data-profile-name]",
  "[class*='player-name']",
  "[class*='player_name']",
  "[class*='profile-name']",
  "[class*='profile_name']",
  "[class*='nickname']",
  "[class*='pseudo']",
].join(",");

function scanTree(root: ParentNode | Node) {
  const android = getRuntimePlatform() === "android";

  if (root instanceof HTMLElement) {
    if (!android || root.matches(ANDROID_PLAYER_SELECTOR)) tagElement(root);
  }
  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return;

  // Android WebView : ne jamais querySelectorAll tous les div/span d'une page.
  // Le MutationObserver global pouvait sinon rescanner des centaines/milliers
  // de noeuds à chaque changement de route et bloquer taps + scroll.
  const selector = android
    ? ANDROID_PLAYER_SELECTOR
    : "div,span,b,strong,p,h1,h2,h3,h4,h5,h6,button,a,td,th,label,input";
  const nodes = root.querySelectorAll<HTMLElement>(selector);
  for (const el of Array.from(nodes)) tagElement(el);
}

function scanDocument() {
  if (typeof document === "undefined" || !document.body) return;
  scanTree(document.body);
}

let mutationFlushCancel: (() => void) | null = null;
const pendingMutationRoots = new Set<Node>();

function queueMutationRoot(node: Node) {
  // Elimine les sous-arbres déjà couverts par une racine en attente.
  for (const root of Array.from(pendingMutationRoots)) {
    try {
      if (root === node || (root instanceof Node && root.contains?.(node))) return;
      if ((node as any)?.contains?.(root)) pendingMutationRoots.delete(root);
    } catch {}
  }
  pendingMutationRoots.add(node);
  if (mutationFlushCancel) return;

  mutationFlushCancel = scheduleRuntimeIdle(() => {
    mutationFlushCancel = null;

    // Un changement de route est prioritaire sur la typographie décorative.
    try {
      if (document.documentElement.dataset.mscNavigating === "1") {
        const roots = Array.from(pendingMutationRoots);
        pendingMutationRoots.clear();
        for (const root of roots) queueMutationRoot(root);
        return;
      }
    } catch {}

    // On traite un nombre borné de racines par créneau idle afin de rendre
    // régulièrement la main au thread UI Android.
    const roots = Array.from(pendingMutationRoots).slice(0, getRuntimePlatform() === "android" ? 4 : 12);
    for (const root of roots) {
      pendingMutationRoots.delete(root);
      scanTree(root);
    }
    if (pendingMutationRoots.size) {
      const remaining = Array.from(pendingMutationRoots);
      pendingMutationRoots.clear();
      for (const root of remaining) queueMutationRoot(root);
    }
  }, { timeoutMs: 5000, fallbackDelayMs: getRuntimePlatform() === "android" ? 320 : 120 });
}

function installObserver() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((mutations) => {
    // Ne jamais scanner synchroniquement dans le callback MutationObserver :
    // React peut ajouter une page entière dans le même microtask.
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) queueMutationRoot(node);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true });
}

function queueRefresh(fullDocument = false) {
  if (refreshQueued) return;
  refreshQueued = true;
  refreshCancel?.();
  refreshCancel = scheduleRuntimeIdle(() => {
    refreshQueued = false;
    refreshCancel = null;
    void refreshKnownNames({ fullDocument, allowStorageFallback: false });
  }, { timeoutMs: 5000, fallbackDelayMs: 180 });
}

function storageKeyLooksRelevant(key: string | null) {
  const k = String(key || "").toLowerCase();
  return !k || /(profile|player|friend|bot|participant|lobby|room|user)/.test(k);
}

export function installPlayerNameTypography() {
  if (started || typeof window === "undefined" || typeof document === "undefined") return;
  started = true;

  const start = () => {
    installObserver();

    if (getRuntimePlatform() === "android") {
      // Le store/IndexedDB et le DOM complet ne font pas partie du critical path
      // Android. Les noms explicites sont pris en charge par l'observer léger ;
      // le catalogue de noms est hydraté plus tard en idle.
      scheduleRuntimeIdle(() => {
        void refreshKnownNames({ fullDocument: false, allowStorageFallback: false });
      }, { timeoutMs: 7000, fallbackDelayMs: 1800 });
    } else {
      void refreshKnownNames({ fullDocument: true, allowStorageFallback: true });
    }

    const android = getRuntimePlatform() === "android";
    const onStorage = (event: StorageEvent) => {
      if (storageKeyLooksRelevant(event.key)) queueRefresh(android ? false : !isGameplayRuntime());
    };
    const onProfiles = () => queueRefresh(android ? false : !isGameplayRuntime());
    const onStore = () => queueRefresh(android ? false : !isGameplayRuntime());
    const onForced = () => queueRefresh(android ? false : true);

    window.addEventListener("storage", onStorage);
    window.addEventListener("dc:profiles-changed", onProfiles as EventListener);
    window.addEventListener("dc-store-updated", onStore as EventListener);
    window.addEventListener("dc:player-name-refresh", onForced as EventListener);

    // Safety refresh only; previously this performed an IndexedDB + localStorage
    // + full DOM scan every 10 seconds. It now uses the in-memory store and never
    // runs a whole-document scan during gameplay.
    refreshTimer = window.setInterval(() => {
      if (!isGameplayRuntime()) queueRefresh(true);
    }, 60_000);

    window.addEventListener("beforeunload", () => {
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshCancel?.();
      refreshCancel = null;
      mutationFlushCancel?.();
      mutationFlushCancel = null;
      pendingMutationRoots.clear();
      observer?.disconnect();
      observer = null;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dc:profiles-changed", onProfiles as EventListener);
      window.removeEventListener("dc-store-updated", onStore as EventListener);
      window.removeEventListener("dc:player-name-refresh", onForced as EventListener);
    }, { once: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

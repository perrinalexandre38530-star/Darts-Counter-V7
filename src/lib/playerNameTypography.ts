// Global player-name typography.
// Applies the same display font everywhere while keeping DOM observation cheap.
// PERF V68: no full IndexedDB/localStorage/document scan every 10 seconds and no
// characterData observer on every live score update.

import { isGameplayRuntime, scheduleRuntimeIdle } from "./runtimePerformance";

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

function scanTree(root: ParentNode | Node) {
  if (root instanceof HTMLElement) tagElement(root);
  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return;
  const nodes = root.querySelectorAll<HTMLElement>("div,span,b,strong,p,h1,h2,h3,h4,h5,h6,button,a,td,th,label,input");
  for (const el of Array.from(nodes)) tagElement(el);
}

function scanDocument() {
  if (typeof document === "undefined" || !document.body) return;
  scanTree(document.body);
}

function installObserver() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((mutations) => {
    // Only newly inserted subtrees are scanned. Observing every characterData
    // mutation meant every live score/text update entered this global observer.
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) scanTree(node);
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
    void refreshKnownNames({ fullDocument: true, allowStorageFallback: true });

    const onStorage = (event: StorageEvent) => {
      if (storageKeyLooksRelevant(event.key)) queueRefresh(!isGameplayRuntime());
    };
    const onProfiles = () => queueRefresh(!isGameplayRuntime());
    const onStore = () => queueRefresh(!isGameplayRuntime());
    const onForced = () => queueRefresh(true);

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

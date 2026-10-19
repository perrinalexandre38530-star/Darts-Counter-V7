import { apiGet, apiPost, canUseNasOnlineApi, readNasAccessToken } from "./apiClient";
import { isNasProviderEnabled } from "./serverConfig";
import { cloudGetMessageCenterSummary } from "./publicSocialApi";
import { isSupabaseRestCircuitOpen } from "./supabaseClient";

export type MessageCenterUnreadSummary = {
  unreadMessages: number;
  friendRequests: number;
  profileLinks: number;
  sharedMatches: number;
  system: number;
  invites: number;
  total: number;
  newestLabel: string;
  newestKey: string;
};

const SEEN_KEYS_LS = "dc_message_center_seen_keys_v1";
const LAST_TOTAL_LS = "dc_message_center_last_total_v1";
const LAST_SUMMARY_LS = "dc_message_center_last_summary_v2";

function safeJson<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, value); } catch {}
}

function getSeenKeys(): Set<string> {
  return new Set(safeJson<string[]>(storageGet(SEEN_KEYS_LS), []));
}

function setSeenKeys(keys: Set<string>) {
  const trimmed = Array.from(keys).slice(-250);
  storageSet(SEEN_KEYS_LS, JSON.stringify(trimmed));
}

function isAuthenticationRoute(): boolean {
  if (typeof window === "undefined") return false;
  const hash = String(window.location.hash || "").toLowerCase();
  return hash.startsWith("#/auth/") || hash.startsWith("#/account/start");
}

export function canUseMessageCenterPolling() {
  if (isAuthenticationRoute()) return false;
  // Public/hybride : amis + messages privés sont lus directement depuis Supabase.
  // NAS pur : on conserve l'exigence du JWT NAS.
  return !isNasProviderEnabled() || canUseNasOnlineApi();
}

function emptySummary(): MessageCenterUnreadSummary {
  return { unreadMessages: 0, friendRequests: 0, profileLinks: 0, sharedMatches: 0, system: 0, invites: 0, total: 0, newestLabel: "", newestKey: "" };
}

function readLastSummary(): MessageCenterUnreadSummary {
  const cached = safeJson<MessageCenterUnreadSummary | null>(storageGet(LAST_SUMMARY_LS), null);
  return cached && typeof cached === "object" ? { ...emptySummary(), ...cached } : emptySummary();
}

function writeLastSummary(summary: MessageCenterUnreadSummary): void {
  storageSet(LAST_SUMMARY_LS, JSON.stringify(summary));
}

export async function fetchMessageCenterUnreadSummary(): Promise<MessageCenterUnreadSummary> {
  if (!canUseMessageCenterPolling()) return emptySummary();

  // Source de vérité NAS uniquement lorsque le provider est explicitement NAS.
  if (canUseNasOnlineApi()) {
    try {
      const serverSummary = await apiGet("/online/messages/summary");
      const counters = serverSummary?.counters || {};
      const unreadMessages = Number(counters.privateMessages ?? counters.messages ?? 0) || 0;
      const friendRequests = Number(counters.friendRequests || 0) || 0;
      const profileLinks = Number(counters.profileLinks || 0) || 0;
      const sharedMatches = Number(counters.sharedMatches || 0) || 0;
      const system = Number(counters.system || 0) || 0;
      const invites = Number(counters.invites || 0) || 0;
      const total = Math.max(0, unreadMessages + friendRequests + profileLinks + sharedMatches + system + invites);
      const summary = { unreadMessages, friendRequests, profileLinks, sharedMatches, system, invites, total, newestLabel: total > 0 ? `${total} élément(s) à traiter` : "", newestKey: total > 0 ? `summary:${total}` : "" };
      writeLastSummary(summary);
      return summary;
    } catch {
      return readLastSummary();
    }
  }

  // Public/hybride : ne jamais télécharger l'historique complet des messages
  // pour calculer un simple badge. Une RPC agrégée renvoie seulement quelques
  // compteurs + la clé du dernier élément. Pendant PGRST002 on conserve le
  // dernier badge connu sans générer de requête supplémentaire.
  if (isSupabaseRestCircuitOpen()) return readLastSummary();
  try {
    const cloud = await cloudGetMessageCenterSummary();
    const summary: MessageCenterUnreadSummary = {
      unreadMessages: Math.max(0, Number(cloud.unreadMessages || 0)),
      friendRequests: Math.max(0, Number(cloud.friendRequests || 0)),
      profileLinks: 0,
      sharedMatches: Math.max(0, Number(cloud.sharedMatches || 0)),
      system: 0,
      invites: 0,
      total: Math.max(0, Number(cloud.total || 0)),
      newestLabel: String(cloud.newestLabel || ""),
      newestKey: String(cloud.newestKey || ""),
    };
    writeLastSummary(summary);
    return summary;
  } catch {
    return readLastSummary();
  }
}

async function ensureMessageServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!window.isSecureContext && !/^localhost$|^127\./.test(window.location.hostname)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    const reg = existing || await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    try { await navigator.serviceWorker.ready; } catch {}
    try { reg.update?.(); } catch {}
    return reg;
  } catch {
    return null;
  }
}


function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

let pushSubscriptionPromise: Promise<boolean> | null = null;

export async function ensureMessagePushSubscription(): Promise<boolean> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  if (!canUseNasOnlineApi()) return false;

  if (pushSubscriptionPromise) return pushSubscriptionPromise;
  pushSubscriptionPromise = (async () => {
    const reg = await ensureMessageServiceWorkerRegistration();
    if (!reg?.pushManager) return false;

    const keyPayload = await apiGet("/online/push/vapid-public-key").catch(() => null as any);
    const publicKey = String(keyPayload?.publicKey || keyPayload?.key || "").trim();
    if (!publicKey) return false;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey) as BufferSource,
      });
    }

    await apiPost("/online/push/subscribe", {
      subscription: subscription.toJSON(),
      endpoint: subscription.endpoint,
      userAgent: navigator.userAgent || "",
      scope: reg.scope || "/",
    });
    return true;
  })().finally(() => {
    window.setTimeout(() => { pushSubscriptionPromise = null; }, 5000);
  });
  return pushSubscriptionPromise;
}

export async function requestMessageNotificationsPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!window.isSecureContext && !/^localhost$|^127\./.test(window.location.hostname)) return "unsupported";
  await ensureMessageServiceWorkerRegistration();
  if (Notification.permission === "granted") {
    ensureMessagePushSubscription().catch(() => {});
    return "granted";
  }
  if (Notification.permission === "denied") return "denied";
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await ensureMessageServiceWorkerRegistration();
      ensureMessagePushSubscription().catch(() => {});
    }
    return permission;
  } catch {
    return Notification.permission;
  }
}

export async function showMessageCenterNotification(title: string, body: string, extraOptions: NotificationOptions = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    tag: "multisports-message-center",
    silent: false,
    badge: "/app-512.png",
    icon: "/app-512.png",
    ...extraOptions,
    data: { ...(extraOptions as any)?.data, url: (extraOptions as any)?.data?.url || "/#/messages" },
  };
  try {
    const reg = await ensureMessageServiceWorkerRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      return;
    }
    try {
      reg?.active?.postMessage({ type: "SHOW_NOTIFICATION", title, body, options, url: (options as any)?.data?.url || "/#/messages" });
      return;
    } catch {}
  } catch {}
  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      try {
        window.focus();
        const targetUrl = String((options as any)?.data?.url || "/#/messages");
        if (targetUrl.includes("#")) {
          const hash = targetUrl.slice(targetUrl.indexOf("#"));
          window.location.hash = hash;
        } else {
          window.location.href = targetUrl;
        }
      } catch {}
      n.close();
    };
  } catch {}
}


async function updateAppBadge(count: number) {
  if (typeof navigator === "undefined") return;
  try {
    const n = Math.max(0, Math.floor(Number(count || 0)));
    const nav: any = navigator as any;
    if (n > 0 && typeof nav.setAppBadge === "function") await nav.setAppBadge(n);
    else if (n <= 0 && typeof nav.clearAppBadge === "function") await nav.clearAppBadge();
  } catch {}
}

export async function pollMessageCenterAndNotify(opts: { notify?: boolean; updateDocumentTitle?: boolean } = {}) {
  const summary = await fetchMessageCenterUnreadSummary();
  await updateAppBadge(summary.total);
  try { window.dispatchEvent(new CustomEvent("dc-message-center-count", { detail: summary })); } catch {}
  const seen = getSeenKeys();
  const lastTotal = Number(storageGet(LAST_TOTAL_LS) || "0") || 0;
  const firstRun = storageGet(LAST_TOTAL_LS) == null;

  if (summary.newestKey && !seen.has(summary.newestKey)) {
    if (!firstRun && opts.notify && summary.total > lastTotal) {
      await showMessageCenterNotification("Multisports Scoring", summary.newestLabel || `${summary.total} élément(s) à lire`);
      try { (navigator as any)?.vibrate?.([80, 45, 80]); } catch {}
    }
    seen.add(summary.newestKey);
    setSeenKeys(seen);
  }

  storageSet(LAST_TOTAL_LS, String(summary.total));

  if (opts.updateDocumentTitle && typeof document !== "undefined") {
    const clean = document.title.replace(/^\(\d+\)\s+/, "");
    document.title = summary.total > 0 ? `(${summary.total}) ${clean}` : clean;
  }

  try {
    window.dispatchEvent(new CustomEvent("dc-message-center-count", { detail: summary }));
  } catch {}

  return summary;
}

export function markMessageCenterRefreshNeeded() {
  try { window.dispatchEvent(new CustomEvent("dc-message-center-refresh")); } catch {}
}


export function markCurrentMessageSummaryAsSeen(summary?: MessageCenterUnreadSummary) {
  const seen = getSeenKeys();
  if (summary?.newestKey) seen.add(summary.newestKey);
  setSeenKeys(seen);
  storageSet(LAST_TOTAL_LS, String(summary?.total || 0));
}

import {
  listFriendRequests,
  listPrivateMessages,
  listProfileFriendLinks,
  listSharedMatches,
  type FriendRequest,
  type PrivateMessageItem,
  type ProfileFriendLink,
  type SharedMatchItem,
} from "./friendsApi";
import { apiGet, apiPost, readNasAccessToken } from "./apiClient";

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

function isPending(status: unknown) {
  return String(status || "pending").toLowerCase() === "pending";
}

function displayName(user: any): string {
  return String(user?.displayName || user?.nickname || user?.email || "un ami").trim();
}

function itemTime(v: any): number {
  const raw = v?.createdAt || v?.created_at || v?.updatedAt || v?.updated_at || 0;
  const n = Date.parse(String(raw || ""));
  return Number.isFinite(n) ? n : 0;
}

export function canUseMessageCenterPolling() {
  return !!readNasAccessToken();
}

export async function fetchMessageCenterUnreadSummary(): Promise<MessageCenterUnreadSummary> {
  if (!canUseMessageCenterPolling()) {
    return { unreadMessages: 0, friendRequests: 0, profileLinks: 0, sharedMatches: 0, system: 0, invites: 0, total: 0, newestLabel: "", newestKey: "" };
  }

  // Source de vérité NAS si disponible : évite les badges qui restent bloqués
  // après lecture/suppression locale d'un message.
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
    return {
      unreadMessages,
      friendRequests,
      profileLinks,
      sharedMatches,
      system,
      invites,
      total,
      newestLabel: total > 0 ? `${total} élément(s) à traiter` : "",
      newestKey: total > 0 ? `summary:${total}` : "",
    };
  } catch {
    // Fallback ancien : garde la compat si le backend NAS n'a pas encore été redémarré.
  }

  const [messages, requests, links, shares] = await Promise.all([
    listPrivateMessages().catch(() => [] as PrivateMessageItem[]),
    listFriendRequests().catch(() => [] as FriendRequest[]),
    listProfileFriendLinks().catch(() => [] as ProfileFriendLink[]),
    listSharedMatches().catch(() => [] as SharedMatchItem[]),
  ]);

  const unreadMessages = (Array.isArray(messages) ? messages : []).filter((m: any) => m?.direction !== "outgoing" && !m?.readAt).length;
  const friendRequests = (Array.isArray(requests) ? requests : []).filter((r: any) => r?.direction !== "outgoing" && isPending(r?.status)).length;
  const profileLinks = (Array.isArray(links) ? links : []).filter((l: any) => l?.direction !== "outgoing" && isPending(l?.status)).length;
  const sharedMatches = (Array.isArray(shares) ? shares : []).filter((s: any) => s?.direction !== "outgoing" && isPending(s?.status)).length;

  const candidates: Array<{ key: string; label: string; ts: number }> = [];
  for (const m of messages as any[]) {
    if (m?.direction !== "outgoing" && !m?.readAt) {
      candidates.push({ key: `msg:${m.id}`, label: `Nouveau message de ${displayName(m.fromUser)}`, ts: itemTime(m) });
    }
  }
  for (const r of requests as any[]) {
    if (r?.direction !== "outgoing" && isPending(r?.status)) {
      candidates.push({ key: `friend:${r.id}`, label: `Nouvelle demande d’ami de ${displayName(r.fromUser)}`, ts: itemTime(r) });
    }
  }
  for (const l of links as any[]) {
    if (l?.direction !== "outgoing" && isPending(l?.status)) {
      candidates.push({ key: `link:${l.id}`, label: `Demande d’association profil de ${displayName(l.requesterUser)}`, ts: itemTime(l) });
    }
  }
  for (const s of shares as any[]) {
    if (s?.direction !== "outgoing" && isPending(s?.status)) {
      candidates.push({ key: `share:${s.id}`, label: `Partie partagée par ${displayName(s.ownerUser)}`, ts: itemTime(s) });
    }
  }
  candidates.sort((a, b) => b.ts - a.ts);
  const newest = candidates[0];
  const total = unreadMessages + friendRequests + profileLinks + sharedMatches;

  return {
    unreadMessages,
    friendRequests,
    profileLinks,
    sharedMatches,
    system: 0,
    invites: 0,
    total,
    newestLabel: newest?.label || "",
    newestKey: newest?.key || "",
  };
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
  if (!readNasAccessToken()) return false;

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
      try { window.focus(); window.location.hash = "#/messages"; } catch {}
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

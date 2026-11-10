import { Capacitor } from "@capacitor/core";
import { supabase } from "../lib/supabaseClient";

/** PWA only: the native Android/iOS app needs its own FCM/APNs integration. */
const getVapidPublicKey = () => String(import.meta.env.VITE_SHOP_PUSH_VAPID_PUBLIC_KEY || "").trim();

export function shopPushAvailability(): { available: boolean; reason: string } {
  if (typeof window === "undefined" || typeof navigator === "undefined") return { available: false, reason: "Navigateur indisponible." };
  if (Capacitor.isNativePlatform()) return { available: false, reason: "Push natif Android/iOS : intégration FCM/APNs distincte requise." };
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { available: false, reason: "Les notifications push nécessitent HTTPS et un navigateur compatible." };
  }
  if (!getVapidPublicKey()) return { available: false, reason: "Clé publique VAPID non configurée (VITE_SHOP_PUSH_VAPID_PUBLIC_KEY)." };
  if (Notification.permission === "denied") return { available: false, reason: "Autorisation bloquée dans les réglages du navigateur." };
  return { available: true, reason: "" };
}

function decodeBase64Url(base64url: string): Uint8Array {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - base64url.length % 4) % 4);
  const raw = window.atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function currentSubscriptionUsesKey(subscription: PushSubscription): boolean {
  const key = subscription.options?.applicationServerKey;
  if (!key) return false;
  const left = new Uint8Array(key);
  const right = decodeBase64Url(getVapidPublicKey());
  return left.length === right.length && left.every((value, i) => value === right[i]);
}

async function getShopServiceWorker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration("/") || await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const script = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
  if (script && !new URL(script).pathname.endsWith("/sw.js")) {
    throw new Error("Un autre service worker contrôle ce navigateur : vérifie le scope '/' avant d'activer le push.");
  }
  return reg;
}

function checkRpcError(error: any): never {
  if (["PGRST202", "42883"].includes(String(error?.code || ""))) {
    throw new Error("Migration V27 absente de Supabase. Applique-la avant d'activer les notifications push.");
  }
  throw new Error(String(error?.message || "Échec de la configuration des notifications push."));
}

/** La présence côté navigateur n'implique pas que le compte courant a consenti. */
export async function isShopPushEnabled(): Promise<boolean> {
  if (!shopPushAvailability().available || Notification.permission !== "granted") return false;
  const reg = await getShopServiceWorker();
  const sub = await reg.pushManager.getSubscription();
  if (!sub || !currentSubscriptionUsesKey(sub)) return false;
  const { data, error } = await supabase.rpc("ms_org_shop_push_is_registered_v27" as any, { p_endpoint: sub.endpoint });
  if (error) checkRpcError(error);
  return data === true;
}

/** Appel uniquement par un geste utilisateur, jamais automatiquement au montage. */
export async function enableShopPush(): Promise<void> {
  const support = shopPushAvailability();
  if (!support.available) throw new Error(support.reason);
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Le navigateur n'a pas autorisé les notifications.");
  const registration = await getShopServiceWorker();
  let sub = await registration.pushManager.getSubscription();
  if (sub && !currentSubscriptionUsesKey(sub)) {
    // Ne PAS effacer la souscription de messagerie déjà active sur le téléphone.
    throw new Error("Une souscription push de messagerie utilise une autre clé VAPID. Harmonise les clés serveur avant de continuer.");
  }
  let created = false;
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(getVapidPublicKey()) as BufferSource,
    });
    created = true;
  }
  const keys = sub.toJSON().keys || {};
  const { error } = await supabase.rpc("ms_org_shop_push_register_v27" as any, {
    p_endpoint: sub.endpoint, p_p256dh: keys.p256dh || "", p_auth: keys.auth || "",
    p_user_agent: navigator.userAgent.slice(0, 200),
  });
  if (error) {
    // Seulement si créé ici ; ne pas casser une souscription push déjà utilisée.
    if (created) { try { await sub.unsubscribe(); } catch { /* non bloquant */ } }
    checkRpcError(error);
  }
}

export async function disableShopPush(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub || !currentSubscriptionUsesKey(sub)) return;
  const { error } = await supabase.rpc("ms_org_shop_push_unsubscribe_v27" as any, { p_endpoint: sub.endpoint });
  if (error) checkRpcError(error);
  // Push is a shared browser subscription; unregistering locally would also
  // disable another app module that uses exactly this VAPID key.
  // Supabase removal is authoritative for Boutique push opt-out.
}

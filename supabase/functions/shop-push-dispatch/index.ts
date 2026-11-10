/**
 * MULTISPORTS SCORING — Boutique V27 (Web Push PWA)
 * Invocation PRIVÉE par Cron Supabase -> pg_net -> Edge Function.
 * Ce code NE DOIT PAS être appelé depuis le navigateur.
 */
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

type Claimed = {
  deliveryId: number;
  attempts: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  kind: "new_request" | "status_changed";
  status: string;
};

const getEnv = (name: string): string => String(Deno.env.get(name) || "").trim();

function safeEquals(a: string, b: string): boolean {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const aa = encoder.encode(a);
  const bb = encoder.encode(b);
  if (aa.length !== bb.length) return false;
  let result = 0;
  for (let i = 0; i < aa.length; i++) result |= aa[i] ^ bb[i];
  return result === 0;
}

/** Refuse SSRF / hôtes arbitraires : seulement les fournisseurs Web Push connus. */
function isSafePushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
    const host = url.hostname.toLowerCase();
    return host === "fcm.googleapis.com" || host === "fcm-xm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" || host.endsWith(".push.apple.com") ||
      host === "wns.notify.windows.com" || host.endsWith(".notify.windows.com");
  } catch { return false; }
}

function payloadFor(row: Claimed): string {
  const isNew = row.kind === "new_request";
  return JSON.stringify({
    kind: "shop_request",
    title: isNew ? "Boutique du club · Nouvelle demande" : "Boutique du club · Mise à jour",
    body: isNew ? "Une réservation est à traiter." : "Le statut d'une commande a changé.",
    tag: `mss-shop-${row.deliveryId}`,
    url: "/#/organizations",
    data: { url: "/#/organizations", kind: "shop_request" },
    icon: "/app-192.png",
    badge: "/app-192.png",
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = getEnv("SHOP_PUSH_CRON_SECRET");
  if (secret.length < 32 || !safeEquals(request.headers.get("x-shop-push-secret") || "", secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SECRET_KEY");
  const vapidPublic = getEnv("SHOP_PUSH_VAPID_PUBLIC_KEY");
  const vapidPrivate = getEnv("SHOP_PUSH_VAPID_PRIVATE_KEY");
  const vapidSubject = getEnv("SHOP_PUSH_VAPID_SUBJECT");
  if (!url || !key || !vapidPublic || !vapidPrivate || !vapidSubject) {
    return new Response("Server push configuration is missing", { status: 503 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("ms_org_shop_push_claim_v27", { p_limit: 18 });
  if (error) {
    console.error("Shop push claim failed", error.message);
    return new Response("Dispatch unavailable", { status: 503 });
  }
  const rows: Claimed[] = Array.isArray(data) ? data : [];
  let sent = 0;
  let failed = 0;
  const sendOne = async (row: Claimed) => {
    let result = "failed";
    let reason = "permanent";
    try {
      if (!isSafePushEndpoint(row.endpoint)) {
        result = "invalid";
        reason = "unsupported_endpoint";
      } else {
        await webpush.sendNotification({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        }, payloadFor(row), { TTL: 3600, urgency: "normal", timeout: 12000 });
        result = "sent";
        reason = "";
        sent++;
      }
    } catch (err) {
      const statusCode = Number((err as { statusCode?: number })?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        result = "invalid"; reason = "gone";
      } else if (!statusCode || statusCode === 429 || statusCode >= 500) {
        result = "retry"; reason = "temporarily_unavailable";
      } else {
        result = "failed"; reason = `http_${statusCode}`;
      }
      failed++;
    }
    const { error: finishError } = await supabase.rpc("ms_org_shop_push_finish_v27", {
      p_delivery_id: row.deliveryId, p_result: result, p_error: reason,
    });
    if (finishError) console.error("Shop push delivery commit failed", row.deliveryId, finishError.message);
  };
  // Concurrence bornée pour éviter que le Cron dépasse la fenêtre Edge.
  for (let offset = 0; offset < rows.length; offset += 6) {
    await Promise.all(rows.slice(offset, offset + 6).map(sendOne));
  }
  return Response.json({ processed: rows.length, sent, failed });
});

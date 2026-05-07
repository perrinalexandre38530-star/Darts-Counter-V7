// ===================================================
// functions/api/avatar/checkout.ts
// Crée une session Stripe Checkout pour acheter des crédits Avatar IA.
// Variables Cloudflare requises :
// - STRIPE_SECRET_KEY
// Optionnelles :
// - STRIPE_SUCCESS_URL
// - STRIPE_CANCEL_URL
// ===================================================

export interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_SUCCESS_URL?: string;
  STRIPE_CANCEL_URL?: string;
  [key: string]: any;
}

type PackId = "pack10" | "pack30" | "pack100";

const PACKS: Record<PackId, { label: string; credits: number; amount: number }> = {
  pack10: { label: "Pack 10 avatars IA", credits: 10, amount: 199 },
  pack30: { label: "Pack 30 avatars IA", credits: 30, amount: 499 },
  pack100: { label: "Pack 100 avatars IA", credits: 100, amount: 999 },
};

function json(payload: any, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function safeUrl(raw: unknown, fallback: string): string {
  const value = String(raw || "").trim();
  if (!value) return fallback;
  if (!/^https?:\/\//i.test(value)) return fallback;
  return value;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const secret = String(env.STRIPE_SECRET_KEY || "").trim();
    if (!secret) {
      return json({ ok: false, error: "stripe_secret_missing", message: "STRIPE_SECRET_KEY absente côté Cloudflare." }, 503);
    }

    const body = await request.json().catch(() => ({})) as any;
    const packId = String(body?.packId || "") as PackId;
    const pack = PACKS[packId];
    if (!pack) return json({ ok: false, error: "invalid_pack" }, 400);

    const url = new URL(request.url);
    const origin = url.origin;
    const successUrl = safeUrl(body?.successUrl || env.STRIPE_SUCCESS_URL, `${origin}/#/avatar_creator?avatarCheckout=success&session_id={CHECKOUT_SESSION_ID}`);
    const cancelUrl = safeUrl(body?.cancelUrl || env.STRIPE_CANCEL_URL, `${origin}/#/avatar_creator?avatarCheckout=cancel`);
    const accountKey = String(body?.accountKey || "local_device").slice(0, 160);

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("payment_method_types[]", "card");
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "eur");
    params.set("line_items[0][price_data][unit_amount]", String(pack.amount));
    params.set("line_items[0][price_data][product_data][name]", pack.label);
    params.set("line_items[0][price_data][product_data][description]", `${pack.credits} générations Avatar IA pour Multisports Scoring`);
    params.set("metadata[feature]", "avatar_ia");
    params.set("metadata[packId]", packId);
    params.set("metadata[credits]", String(pack.credits));
    params.set("metadata[accountKey]", accountKey);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const text = await stripeRes.text();
    let stripeJson: any = null;
    try { stripeJson = JSON.parse(text); } catch {}

    if (!stripeRes.ok) {
      return json({ ok: false, error: "stripe_checkout_failed", message: stripeJson?.error?.message || text || `stripe_${stripeRes.status}` }, 502);
    }

    return json({ ok: true, url: stripeJson?.url, id: stripeJson?.id, packId, credits: pack.credits });
  } catch (err: any) {
    return json({ ok: false, error: "checkout_exception", message: String(err?.message || err || "Unknown error") }, 500);
  }
};

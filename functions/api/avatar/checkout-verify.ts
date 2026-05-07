// ===================================================
// functions/api/avatar/checkout-verify.ts
// Vérifie une session Stripe payée et renvoie le nombre de crédits.
// Le frontend ajoute ensuite les crédits au compte local courant.
// Pour une prod complète, le webhook Stripe doit aussi écrire ces crédits
// dans le backend NAS/DB utilisateur.
// ===================================================

export interface Env {
  STRIPE_SECRET_KEY?: string;
  [key: string]: any;
}

function json(payload: any, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const secret = String(env.STRIPE_SECRET_KEY || "").trim();
    if (!secret) return json({ ok: false, error: "stripe_secret_missing", message: "STRIPE_SECRET_KEY absente côté Cloudflare." }, 503);

    const url = new URL(request.url);
    const sessionId = String(url.searchParams.get("session_id") || "").trim();
    if (!sessionId || !sessionId.startsWith("cs_")) return json({ ok: false, error: "missing_session_id" }, 400);

    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const text = await stripeRes.text();
    let stripeJson: any = null;
    try { stripeJson = JSON.parse(text); } catch {}

    if (!stripeRes.ok) return json({ ok: false, error: "stripe_session_failed", message: stripeJson?.error?.message || text }, 502);

    const paid = stripeJson?.payment_status === "paid" || stripeJson?.status === "complete";
    const feature = String(stripeJson?.metadata?.feature || "");
    const credits = Math.max(0, Math.floor(Number(stripeJson?.metadata?.credits || 0)));
    if (!paid || feature !== "avatar_ia" || credits <= 0) {
      return json({ ok: false, paid, error: "session_not_creditable", status: stripeJson?.status, paymentStatus: stripeJson?.payment_status }, 400);
    }

    return json({ ok: true, paid: true, credits, packId: stripeJson?.metadata?.packId || null, accountKey: stripeJson?.metadata?.accountKey || null });
  } catch (err: any) {
    return json({ ok: false, error: "verify_exception", message: String(err?.message || err || "Unknown error") }, 500);
  }
};

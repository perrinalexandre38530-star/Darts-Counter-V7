// ===================================================
// functions/api/avatar/stripe-webhook.ts
// Stub webhook Stripe pour production.
// IMPORTANT : pour créditer durablement chaque compte utilisateur, branche ici
// ton backend NAS/DB et vérifie la signature STRIPE_WEBHOOK_SECRET.
// ===================================================

export interface Env {
  STRIPE_WEBHOOK_SECRET?: string;
  [key: string]: any;
}

function json(payload: any, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  // Ne crédite rien ici tant que la vérification cryptographique Stripe + NAS
  // n'est pas branchée. Le flux actuel vérifie la session côté Function via
  // /api/avatar/checkout-verify puis ajoute les crédits au compte courant local.
  const event = await request.json().catch(() => null) as any;
  const type = String(event?.type || "unknown");
  return json({ ok: true, received: true, type, note: "Webhook placeholder: connecter NAS/DB pour crédits serveur persistants." });
};

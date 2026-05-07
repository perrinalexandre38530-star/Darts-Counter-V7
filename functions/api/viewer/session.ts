// @ts-nocheck
import { cleanId, ensureStore, joinUrl, json, options, randomCode, SESSION_TTL_SECONDS, sessionKey, SNAPSHOT_TTL_SECONDS, snapshotKey } from "./_shared";

export const onRequestOptions: PagesFunction = async () => options();

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const store = await ensureStore(env);
    let sessionId = "";
    for (let i = 0; i < 8; i += 1) {
      const candidate = cleanId(randomCode(6));
      const existing = await store.get(sessionKey(candidate));
      if (!existing) {
        sessionId = candidate;
        break;
      }
    }
    if (!sessionId) return json({ ok: false, message: "Unable to create viewer session" }, 500);

    const nowIso = new Date().toISOString();
    const meta = {
      kind: "viewer_live_v1",
      sessionId,
      code: sessionId,
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
      rev: 0,
    };
    await store.put(sessionKey(sessionId), JSON.stringify(meta), { expirationTtl: SESSION_TTL_SECONDS });
    await store.put(
      snapshotKey(sessionId),
      JSON.stringify({
        v: 1,
        sessionId,
        updatedAt: Date.now(),
        sport: "darts",
        game: "unknown",
        phase: "lobby",
        title: "Multisports Scoring",
        screen: "waiting",
        activePlayerId: null,
        players: [],
        meta: { text: "En attente du lancement de la partie" },
        source: "viewer",
      }),
      { expirationTtl: SNAPSHOT_TTL_SECONDS }
    );

    return json({
      ok: true,
      sessionId,
      code: sessionId,
      expiresInSeconds: SESSION_TTL_SECONDS,
      joinUrl: joinUrl(request, sessionId),
    });
  } catch (e: any) {
    return json({ ok: false, message: String(e?.message || e || "Viewer session creation failed") }, 500);
  }
};

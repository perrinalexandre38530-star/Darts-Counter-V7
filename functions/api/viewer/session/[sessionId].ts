// @ts-nocheck
import { cleanId, ensureStore, json, options, sessionKey, SNAPSHOT_TTL_SECONDS, snapshotKey } from "../_shared";

export const onRequestOptions: PagesFunction = async () => options();

export const onRequestDelete: PagesFunction = async ({ params, env }) => {
  try {
    const sessionId = cleanId(params?.sessionId);
    if (!sessionId) return json({ ok: false, message: "Missing viewer session id" }, 400);
    const store = await ensureStore(env);
    await store.put(sessionKey(sessionId), JSON.stringify({ sessionId, status: "closed", closedAt: new Date().toISOString() }), { expirationTtl: 60 * 10 });
    await store.put(
      snapshotKey(sessionId),
      JSON.stringify({
        v: 1,
        sessionId,
        updatedAt: Date.now(),
        sport: "darts",
        game: "unknown",
        phase: "closed",
        title: "Session viewer fermée",
        screen: "closed",
        activePlayerId: null,
        players: [],
        meta: { text: "Session fermée" },
        source: "viewer",
      }),
      { expirationTtl: SNAPSHOT_TTL_SECONDS }
    );
    return json({ ok: true });
  } catch (e: any) {
    return json({ ok: false, message: String(e?.message || e || "Viewer session close failed") }, 500);
  }
};

// @ts-nocheck
import { cleanId, ensureStore, json, options, SESSION_TTL_SECONDS, sessionKey, SNAPSHOT_TTL_SECONDS, snapshotKey } from "../../_shared";

export const onRequestOptions: PagesFunction = async () => options();

export const onRequestGet: PagesFunction = async ({ params, env }) => {
  try {
    const sessionId = cleanId(params?.sessionId);
    if (!sessionId) return json({ ok: false, message: "Missing viewer session id" }, 400);
    const store = await ensureStore(env);
    const raw = await store.get(snapshotKey(sessionId));
    if (!raw) return json({ ok: false, message: "Viewer snapshot not found" }, 404);
    return json({ ok: true, snapshot: JSON.parse(raw) });
  } catch (e: any) {
    return json({ ok: false, message: String(e?.message || e || "Viewer snapshot fetch failed") }, 500);
  }
};

export const onRequestPost: PagesFunction = async ({ request, params, env }) => {
  try {
    const sessionId = cleanId(params?.sessionId);
    if (!sessionId) return json({ ok: false, message: "Missing viewer session id" }, 400);
    const store = await ensureStore(env);
    const sessionRaw = await store.get(sessionKey(sessionId));
    if (!sessionRaw) return json({ ok: false, message: "Viewer session not found" }, 404);
    const meta = JSON.parse(sessionRaw || "{}");
    const payload = await request.json<any>();
    if (!payload || typeof payload !== "object") return json({ ok: false, message: "Invalid viewer snapshot" }, 400);
    const next = {
      ...payload,
      v: 1,
      sessionId,
      updatedAt: Number(payload.updatedAt || Date.now()),
      players: Array.isArray(payload.players) ? payload.players : [],
    };
    const rev = Number(meta?.rev || 0) + 1;
    await store.put(snapshotKey(sessionId), JSON.stringify(next), { expirationTtl: SNAPSHOT_TTL_SECONDS });
    await store.put(
      sessionKey(sessionId),
      JSON.stringify({ ...meta, sessionId, code: sessionId, status: "active", updatedAt: new Date().toISOString(), rev }),
      { expirationTtl: SESSION_TTL_SECONDS }
    );
    return json({ ok: true, rev });
  } catch (e: any) {
    return json({ ok: false, message: String(e?.message || e || "Viewer snapshot publish failed") }, 500);
  }
};

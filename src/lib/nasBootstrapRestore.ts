import { importAll } from "./storage";
import { onlineApi } from "./onlineApi";
import { isNasDataSyncEnabled } from "./serverConfig";

const APPLIED_KEY = "dc_nas_restore_last_applied_v1";
const RELOADED_KEY = "dc_nas_restore_last_reloaded_v1";

function makeStamp(snapshot: any): string {
  const updatedAt = snapshot?.updatedAt || snapshot?.updated_at || "";
  const version = snapshot?.version ?? "";
  return `${updatedAt}::${version}`;
}

const BOOT_DIAG_KEY = "dc_boot_diag_v3";

function pushBootDiag(step: string, extra?: any) {
  try {
    const raw = localStorage.getItem(BOOT_DIAG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    list.push({ at: new Date().toISOString(), step, extra: extra ?? null });
    localStorage.setItem(BOOT_DIAG_KEY, JSON.stringify(list.slice(-120)));
  } catch {}
}

export async function bootstrapNasRestore(options?: { mobileDeferred?: boolean }): Promise<{ restored: boolean; reason?: string }> {
  if (!isNasDataSyncEnabled()) return { restored: false, reason: "disabled" };
  const restored = await onlineApi.restoreSession().catch(() => null);
  const session = restored && (restored as any).user ? restored : null;
  if (!session) return { restored: false, reason: "no_session" };
  pushBootDiag("nas:restore:session", { userId: (session as any)?.user?.id || null, mobileDeferred: !!options?.mobileDeferred });

  try {
    pushBootDiag("nas:restore:pull:start");
    const snapshot = await onlineApi.pullStoreSnapshot();
    if (!snapshot || snapshot.status !== "ok" || !snapshot.payload) {
      pushBootDiag("nas:restore:empty", { status: snapshot?.status || null });
      return { restored: false, reason: "empty" };
    }

    const stamp = makeStamp(snapshot);
    const alreadyApplied = localStorage.getItem(APPLIED_KEY);
    if (alreadyApplied === stamp) {
      pushBootDiag("nas:restore:skip_already_applied", { stamp });
      return { restored: false, reason: "already_applied" };
    }

    pushBootDiag("nas:restore:import:start", { stamp, version: snapshot?.version ?? null });
    await importAll(snapshot.payload);
    pushBootDiag("nas:restore:import:done", { stamp });

    try {
      localStorage.setItem(APPLIED_KEY, stamp);
      localStorage.setItem(
        "dc_nas_restore_last_success",
        JSON.stringify({
          at: new Date().toISOString(),
          updatedAt: snapshot.updatedAt || null,
          version: snapshot.version ?? null,
        })
      );
    } catch {}

    const alreadyReloaded = sessionStorage.getItem(RELOADED_KEY);
    if (alreadyReloaded !== stamp) {
      try {
        sessionStorage.setItem(RELOADED_KEY, stamp);
      } catch {}
      pushBootDiag("nas:restore:reload", { stamp });
      window.location.reload();
      return { restored: true };
    }

    pushBootDiag("nas:restore:done");
    return { restored: true };
  } catch (err) {
    try {
      localStorage.setItem(
        "dc_nas_restore_last_error",
        JSON.stringify({
          at: new Date().toISOString(),
          message: err instanceof Error ? err.message : String(err),
        })
      );
    } catch {}
    pushBootDiag("nas:restore:error", { message: err instanceof Error ? err.message : String(err) });
    return { restored: false, reason: "error" };
  }
}

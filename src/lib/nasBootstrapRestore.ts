import { importAll } from "./storage";
import { isNasSyncEnabled, nasApi } from "./nasApi";

const APPLIED_KEY = "dc_nas_restore_last_applied_v1";
const RELOADED_KEY = "dc_nas_restore_last_reloaded_v1";

function makeStamp(snapshot: any): string {
  const updatedAt = snapshot?.updatedAt || snapshot?.updated_at || "";
  const version = snapshot?.version ?? "";
  return `${updatedAt}::${version}`;
}

export async function bootstrapNasRestore(): Promise<{ restored: boolean; reason?: string }> {
  if (!isNasSyncEnabled()) return { restored: false, reason: "disabled" };
  const hasNasToken = !!localStorage.getItem("dc_nas_access_token_v1");
  if (!hasNasToken) return { restored: false, reason: "no_token" };

  try {
    const snapshot = await nasApi.pullStoreSnapshot();
    if (!snapshot || snapshot.status !== "ok" || !snapshot.payload) {
      return { restored: false, reason: "empty" };
    }

    const stamp = makeStamp(snapshot);
    const alreadyApplied = localStorage.getItem(APPLIED_KEY);
    if (alreadyApplied === stamp) {
      return { restored: false, reason: "already_applied" };
    }

    await importAll(snapshot.payload);

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
      window.location.reload();
      return { restored: true };
    }

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
    return { restored: false, reason: "error" };
  }
}

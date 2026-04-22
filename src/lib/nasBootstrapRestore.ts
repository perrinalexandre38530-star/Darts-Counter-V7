import { importAll } from "./storage";
import { onlineApi } from "./onlineApi";
import { isNasDataSyncEnabled } from "./serverConfig";
import { runtimeDiag, diagMarkStart, diagMarkEnd } from "./runtimeDiag";

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
  runtimeDiag("boot:nasRestore:disabled_lot2", { mobileDeferred: !!options?.mobileDeferred });
  return { restored: false, reason: "disabled_lot2" };
}

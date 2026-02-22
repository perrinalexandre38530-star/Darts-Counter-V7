import { restoreCloudBackup } from "../cloudBackup/restoreBackup";
import { rebuildAllStats } from "../stats/rebuildAllStats";

export type RecoveryMode = "merge" | "replace";

export async function importRecoveryBackup(
  json: any,
  mode: RecoveryMode
) {
  if (!json?.version || !json?.history) {
    throw new Error("Fichier invalide");
  }

  await restoreCloudBackup(json, mode === "replace");

  // 🔥 Rebuild complet des stats
  await rebuildAllStats();

  return true;
}
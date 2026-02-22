import { restoreCloudBackupFromJson } from "../cloudBackup/restoreBackup";

/**
 * Import a SharedMatchPack by converting it to a minimal CloudBackup and merging.
 * This ensures profiles/dartsets/history are wired consistently and stats rebuild happens.
 */
export async function importSharedMatchPack(args: {
  pack: any;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const pack = args.pack;
  if (!pack?.match) return { ok: false, error: "Pack invalide (match manquant)" };

  const backup = {
    version: 1,
    exportedAt: pack.exportedAt ?? new Date().toISOString(),
    appVersion: pack.appVersion ?? "shared-match",
    history: [pack.match],
    localProfiles: Array.isArray(pack.profiles) ? pack.profiles : [],
    dartsets: Array.isArray(pack.dartsets) ? pack.dartsets : [],
  };

  const res = await restoreCloudBackupFromJson({
    json: JSON.stringify(backup),
    mode: "merge",
    rebuild: true,
  });

  if ((res as any).ok) return { ok: true };
  return { ok: false, error: (res as any).error ?? "Import failed" };
}

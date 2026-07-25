import { exportCloudSnapshot } from "./storage";
import {
  createLocalMemorySlotFromSnapshot,
  createNasVersionedSnapshot,
  summarizeVaultPayload,
} from "./storageVault";
import {
  chooseExternalBackupFileWithJson,
  downloadExternalBackupJson,
  getExternalBackupStatus,
  writeExternalBackupJsonNow,
} from "./externalBackupTarget";
import { uploadCloudVaultSnapshotJson } from "./cloudStorageApi";
import { getStorageDestination, loadStoragePrefs } from "./storagePlans";

export type ConfiguredBackupResult = {
  ok: boolean;
  destination: string;
  destinationLabel: string;
  message: string;
};

/**
 * Sauvegarde instantanée vers la destination actuellement choisie dans Réglages > Sauvegarde.
 * Le snapshot est complet : la partie qui vient d'être enregistrée, l'historique, les stats,
 * les profils et les autres données portables sont inclus.
 */
export async function saveConfiguredBackupNow(reason = "manual-match-end"): Promise<ConfiguredBackupResult> {
  const prefs = loadStoragePrefs();
  const destination = prefs.selectedDestination;
  const destinationLabel = getStorageDestination(destination).label;
  const nowLabel = new Date().toLocaleString("fr-FR");

  try {
    if (destination === "founder_nas") {
      // Le service NAS construit lui-même le snapshot canonique côté flux NAS.
      if (prefs.keepLocalSafetyCopy) {
        const snapshot = await exportCloudSnapshot();
        const summary = summarizeVaultPayload(snapshot);
        await createLocalMemorySlotFromSnapshot(
          snapshot,
          `Sécurité locale avant NAS — ${nowLabel}`,
          "manual",
          summary
        ).catch(() => null);
      }
      await createNasVersionedSnapshot();
      return { ok: true, destination, destinationLabel, message: "Sauvegarde NAS créée." };
    }

    const snapshot = await exportCloudSnapshot();
    const summary = summarizeVaultPayload(snapshot);
    const snapshotJson = JSON.stringify(snapshot);

    if (destination === "app_local") {
      await createLocalMemorySlotFromSnapshot(
        snapshot,
        `Sauvegarde fin de partie — ${nowLabel}`,
        "manual",
        summary
      );
      return { ok: true, destination, destinationLabel, message: "Sauvegarde locale créée." };
    }

    if (destination === "device_file" || destination === "external_sd_manual") {
      const status = await getExternalBackupStatus();
      const next = status.configured
        ? await writeExternalBackupJsonNow(snapshotJson, reason, { requestPermission: true })
        : status.supported
          ? await chooseExternalBackupFileWithJson(snapshotJson, reason)
          : await downloadExternalBackupJson(snapshotJson, reason);
      if (next.lastError) throw new Error(next.lastError);
      if (prefs.keepLocalSafetyCopy) {
        await createLocalMemorySlotFromSnapshot(
          snapshot,
          `Sécurité locale — ${nowLabel}`,
          "manual",
          summary
        ).catch(() => null);
      }
      return { ok: true, destination, destinationLabel, message: "Sauvegarde fichier créée." };
    }

    if (destination === "cloud_r2") {
      if (prefs.keepLocalSafetyCopy) {
        await createLocalMemorySlotFromSnapshot(
          snapshot,
          `Sécurité locale avant R2 — ${nowLabel}`,
          "manual",
          summary
        ).catch(() => null);
      }
      await uploadCloudVaultSnapshotJson({
        snapshotJson,
        title: `Sauvegarde fin de partie — ${nowLabel}`,
        sourceDestination: "cloud_r2",
        metadata: {
          summary,
          exportedAt: new Date().toISOString(),
          source: reason,
          engine: "match-end-save-button-v1",
        },
      });
      return { ok: true, destination, destinationLabel, message: "Sauvegarde Cloud R2 créée." };
    }

    throw new Error(`Destination non prise en charge : ${destinationLabel}`);
  } catch (error: any) {
    return {
      ok: false,
      destination,
      destinationLabel,
      message: error?.message || String(error || "Sauvegarde impossible"),
    };
  }
}

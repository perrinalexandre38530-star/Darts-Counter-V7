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

    // R2 doit rester rapide et indépendant des centaines d'images utilisateur.
    // Les médias sont déjà des objets /media/* dédiés et leur réplication continue
    // en arrière-plan. Le POST principal ne contient donc que les données métier,
    // l'historique, les stats, portableAccountData et les références médias.
    if (destination === "cloud_r2") {
      const snapshot = await exportCloudSnapshot({
        mediaMirror: "background",
        includeEmbeddedMedia: false,
        includeAvatarFallbacks: false,
      });
      const summary = summarizeVaultPayload(snapshot);
      const snapshotJson = JSON.stringify(snapshot);
      const snapshotBytes = new Blob([snapshotJson]).size;

      // Garde-fou : ne jamais repartir silencieusement vers le vieux snapshot
      // de ~27 Mo qui déclenchait un HTTP 413.
      if (snapshotBytes > 20_000_000) {
        throw new Error(`Snapshot R2 encore trop volumineux (${snapshotBytes} octets).`);
      }

      await uploadCloudVaultSnapshotJson({
        snapshotJson,
        title: `Sauvegarde fin de partie — ${nowLabel}`,
        sourceDestination: "cloud_r2",
        metadata: {
          summary,
          exportedAt: new Date().toISOString(),
          source: reason,
          engine: "match-end-save-button-v2-fast-r2",
          snapshotBytes,
          portableAccountDataVersion: Number((snapshot as any)?.portableAccountData?._v || 0),
          mediaMirror: "background",
        },
      });

      // La copie de sécurité locale ne doit jamais rallonger le temps du bouton
      // Sauver. Elle est écrite après coup, sans bloquer l'utilisateur.
      if (prefs.keepLocalSafetyCopy) {
        void createLocalMemorySlotFromSnapshot(
          snapshot,
          `Sécurité locale après R2 — ${nowLabel}`,
          "manual",
          summary
        ).catch(() => null);
      }

      return {
        ok: true,
        destination,
        destinationLabel,
        message: `Sauvegarde Cloud R2 créée (${Math.max(1, Math.round(snapshotBytes / 1024 / 1024))} Mo). Médias synchronisés en arrière-plan.`,
      };
    }

    // Les destinations locales/fichier doivent rester auto-contenues et conservent
    // donc les médias embarqués dans leur snapshot portable.
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

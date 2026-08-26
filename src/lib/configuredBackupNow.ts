import { exportCloudSnapshot } from "./storage";
import {
  createLocalMemorySlotFromSnapshot,
  createNasVersionedSnapshot,
  summarizeVaultPayload,
  type MemorySlot,
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
  localSafetyCreated?: boolean;
};

let backupTail: Promise<unknown> = Promise.resolve();

function enqueueConfiguredBackup<T>(run: () => Promise<T>): Promise<T> {
  const next = backupTail.then(run, run);
  backupTail = next.then(() => undefined, () => undefined);
  return next;
}

function isAutomaticReason(reason: string): boolean {
  return /^match-end-auto:/i.test(String(reason || ""));
}

/**
 * Sauvegarde instantanée vers la destination choisie dans Réglages > Sauvegarde.
 *
 * Invariants V55+ :
 * - les sauvegardes sont sérialisées (jamais deux exports concurrents) ;
 * - une fin de partie crée TOUJOURS d'abord une copie locale complète ;
 * - NAS/R2/fichier sont ensuite des copies supplémentaires, jamais l'unique filet ;
 * - aucun sélecteur système n'est ouvert automatiquement en fin de partie.
 */
export function saveConfiguredBackupNow(reason = "manual-match-end"): Promise<ConfiguredBackupResult> {
  return enqueueConfiguredBackup(async () => {
    const prefs = loadStoragePrefs();
    const destination = prefs.selectedDestination;
    const destinationLabel = getStorageDestination(destination).label;
    const nowLabel = new Date().toLocaleString("fr-FR");
    const automatic = isAutomaticReason(reason);
    const keepLocalSafety = automatic || prefs.keepLocalSafetyCopy || destination === "app_local";
    const localSource: MemorySlot["source"] = automatic ? "auto" : "manual";
    let localSafetyCreated = false;

    try {
      // Snapshot local autonome : médias inclus, mais aucun miroir R2 déclenché.
      // Il est préparé avant le remote afin qu'une panne NAS/R2 ne puisse jamais
      // annuler la sauvegarde de la partie qui vient de se terminer.
      let localSnapshot: any = null;
      let localSummary: ReturnType<typeof summarizeVaultPayload> | null = null;
      let localSnapshotJson = "";

      const ensureLocalSnapshot = async () => {
        if (localSnapshot) return localSnapshot;
        localSnapshot = await exportCloudSnapshot({ mediaMirror: "skip" });
        localSummary = summarizeVaultPayload(localSnapshot);
        localSnapshotJson = JSON.stringify(localSnapshot);
        return localSnapshot;
      };

      const createSafetyCopy = async (label: string, source: MemorySlot["source"] = localSource) => {
        if (!keepLocalSafety) return null;
        await ensureLocalSnapshot();
        const slot = await createLocalMemorySlotFromSnapshot(
          localSnapshot,
          label,
          source,
          localSummary,
          localSnapshotJson,
        );
        localSafetyCreated = true;
        return slot;
      };

      if (destination === "app_local") {
        await createSafetyCopy(`${automatic ? "Sauvegarde auto fin de partie" : "Sauvegarde"} — ${nowLabel}`);
        return {
          ok: true,
          destination,
          destinationLabel,
          localSafetyCreated,
          message: automatic ? "Sauvegarde automatique locale créée." : "Sauvegarde locale créée.",
        };
      }

      if (destination === "founder_nas") {
        await createSafetyCopy(
          `${automatic ? "Sécurité auto" : "Sécurité locale"} avant NAS — ${nowLabel}`,
          "before-nas-backup",
        );
        await createNasVersionedSnapshot();
        return {
          ok: true,
          destination,
          destinationLabel,
          localSafetyCreated,
          message: localSafetyCreated ? "Sauvegarde NAS créée + copie locale de sécurité." : "Sauvegarde NAS créée.",
        };
      }

      if (destination === "cloud_r2") {
        await createSafetyCopy(`${automatic ? "Sécurité auto" : "Sécurité locale"} avant R2 — ${nowLabel}`);

        // R2 reste allégé : les médias ont leurs objets dédiés. La copie locale
        // ci-dessus reste, elle, totalement autonome pour la restauration appareil.
        const snapshot = await exportCloudSnapshot({
          mediaMirror: "skip",
          includeEmbeddedMedia: false,
          includeAvatarFallbacks: false,
        });
        const summary = summarizeVaultPayload(snapshot);
        const snapshotJson = JSON.stringify(snapshot);
        const snapshotBytes = new Blob([snapshotJson]).size;

        if (snapshotBytes > 20_000_000) {
          throw new Error(`Snapshot R2 encore trop volumineux (${snapshotBytes} octets).`);
        }

        await uploadCloudVaultSnapshotJson({
          snapshotJson,
          title: `${automatic ? "Sauvegarde auto fin de partie" : "Sauvegarde"} — ${nowLabel}`,
          sourceDestination: "cloud_r2",
          metadata: {
            summary,
            exportedAt: new Date().toISOString(),
            source: reason,
            engine: "configured-backup-v3-safe-local-first",
            snapshotBytes,
            portableAccountDataVersion: Number((snapshot as any)?.portableAccountData?._v || 0),
            mediaMirror: "skip-during-snapshot",
          },
        });

        return {
          ok: true,
          destination,
          destinationLabel,
          localSafetyCreated,
          message: `Sauvegarde Cloud R2 créée (${Math.max(1, Math.round(snapshotBytes / 1024 / 1024))} Mo)${localSafetyCreated ? " + copie locale" : ""}.`,
        };
      }

      if (
        destination === "device_file" ||
        destination === "external_sd_manual" ||
        destination === "personal_cloud_manual"
      ) {
        await createSafetyCopy(`${automatic ? "Sécurité auto" : "Sécurité locale"} avant fichier — ${nowLabel}`);
        await ensureLocalSnapshot();
        const status = await getExternalBackupStatus();

        // Une sauvegarde automatique ne doit JAMAIS ouvrir un picker ou lancer
        // un téléchargement sans action utilisateur. Si la cible mémorisée n'est
        // plus accessible, la copie locale ci-dessus reste valide.
        if (automatic) {
          if (!status.configured) {
            throw new Error("Cible fichier/SD/cloud personnel non configurée. La copie locale automatique a été créée.");
          }
          const next = await writeExternalBackupJsonNow(localSnapshotJson, reason, { requestPermission: false });
          if (next.lastError) throw new Error(`${next.lastError} La copie locale automatique a été créée.`);
          return {
            ok: true,
            destination,
            destinationLabel,
            localSafetyCreated,
            message: "Sauvegarde automatique fichier créée + copie locale de sécurité.",
          };
        }

        const next = status.configured
          ? await writeExternalBackupJsonNow(localSnapshotJson, reason, { requestPermission: true })
          : status.supported
            ? await chooseExternalBackupFileWithJson(localSnapshotJson, reason)
            : await downloadExternalBackupJson(localSnapshotJson, reason);
        if (next.lastError) throw new Error(next.lastError);
        return {
          ok: true,
          destination,
          destinationLabel,
          localSafetyCreated,
          message: localSafetyCreated ? "Sauvegarde fichier créée + copie locale de sécurité." : "Sauvegarde fichier créée.",
        };
      }

      throw new Error(`Destination non prise en charge : ${destinationLabel}`);
    } catch (error: any) {
      return {
        ok: false,
        destination,
        destinationLabel,
        localSafetyCreated,
        message: error?.message || String(error || "Sauvegarde impossible"),
      };
    }
  });
}

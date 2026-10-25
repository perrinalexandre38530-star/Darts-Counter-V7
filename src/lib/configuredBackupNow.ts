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
import {
  getPersonalCloudStatus,
  isPersonalCloudProvider,
  personalCloudProviderLabel,
  uploadPersonalCloudSnapshot,
} from "./personalCloudApi";
import { buildCanonicalBackupArtifact } from "./backup/backupEngineV1";

export type ConfiguredBackupResult = {
  ok: boolean;
  destination: string;
  destinationLabel: string;
  message: string;
  localSafetyCreated?: boolean;
  artifactId?: string;
  payloadSha256?: string;
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
 * WAVE 7 — moteur de sauvegarde unifié.
 *
 * Une seule construction est autorisée par opération :
 * flush -> snapshot canonique -> Manifest V2 -> compression -> SHA-256.
 * Ensuite chaque destination transporte le MEME artefact. Aucun provider ne
 * reconstruit une variante du compte pendant cette sauvegarde.
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
      let prepared: Awaited<ReturnType<typeof buildCanonicalBackupArtifact>> | null = null;
      const ensureArtifact = async () => {
        if (prepared) return prepared;
        prepared = await buildCanonicalBackupArtifact();
        return prepared;
      };

      const artifactMeta = () => ({
        artifactId: prepared?.artifact?.artifactId,
        payloadSha256: prepared?.artifact?.payloadSha256,
      });

      const createSafetyCopy = async (label: string, source: MemorySlot["source"] = localSource) => {
        if (!keepLocalSafety) return null;
        const built = await ensureArtifact();
        const slot = await createLocalMemorySlotFromSnapshot(
          built.artifact,
          label,
          source,
          summarizeVaultPayload(built.artifact),
          built.artifactJson,
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
          ...artifactMeta(),
          message: automatic ? "Sauvegarde automatique locale créée." : "Sauvegarde locale créée.",
        };
      }

      if (destination === "founder_nas") {
        await createSafetyCopy(`${automatic ? "Sécurité auto" : "Sécurité locale"} avant NAS — ${nowLabel}`, "before-nas-backup");
        const built = await ensureArtifact();
        await createNasVersionedSnapshot(built.artifact, built.summary);
        return {
          ok: true,
          destination,
          destinationLabel,
          localSafetyCreated,
          ...artifactMeta(),
          message: localSafetyCreated ? "Sauvegarde NAS créée + copie locale de sécurité." : "Sauvegarde NAS créée.",
        };
      }

      if (destination === "cloud_r2") {
        await createSafetyCopy(`${automatic ? "Sécurité auto" : "Sécurité locale"} avant R2 — ${nowLabel}`);
        const built = await ensureArtifact();
        const artifactBytes = new Blob([built.artifactJson]).size;
        await uploadCloudVaultSnapshotJson({
          snapshotJson: built.artifactJson,
          title: `${automatic ? "Sauvegarde auto fin de partie" : "Sauvegarde"} — ${nowLabel}`,
          sourceDestination: "cloud_r2",
          metadata: {
            summary: built.summary,
            exportedAt: built.artifact.createdAt,
            source: reason,
            engine: "canonical-backup-artifact-v1",
            artifactId: built.artifact.artifactId,
            payloadSha256: built.artifact.payloadSha256,
            payloadBytes: built.artifact.payloadBytes,
            packedBytes: built.artifact.packedBytes,
            artifactBytes,
          },
        });
        return {
          ok: true,
          destination,
          destinationLabel,
          localSafetyCreated,
          ...artifactMeta(),
          message: `Sauvegarde Cloud R2 créée (${Math.max(1, Math.round(artifactBytes / 1024 / 1024))} Mo)${localSafetyCreated ? " + copie locale" : ""}.`,
        };
      }

      if (isPersonalCloudProvider(destination)) {
        await createSafetyCopy(`${automatic ? "Sécurité auto" : "Sécurité locale"} avant ${personalCloudProviderLabel(destination)} — ${nowLabel}`);
        const built = await ensureArtifact();
        const status = await getPersonalCloudStatus(destination);
        if (!status.configured) {
          throw new Error(`${personalCloudProviderLabel(destination)} n'est pas configuré côté serveur. La copie locale de sécurité a été créée.`);
        }
        if (!status.connected) {
          throw new Error(`${personalCloudProviderLabel(destination)} n'est pas connecté. Reconnecte-le depuis Sauvegardes. La copie locale de sécurité a été créée.`);
        }

        const result: any = await uploadPersonalCloudSnapshot(destination, built.artifactJson, {
          summary: built.summary,
          exportedAt: built.artifact.createdAt,
          rawSizeBytes: new Blob([built.artifactJson]).size,
          source: reason,
          engine: "canonical-backup-artifact-v1",
          artifactId: built.artifact.artifactId,
          payloadSha256: built.artifact.payloadSha256,
          payloadBytes: built.artifact.payloadBytes,
          packedBytes: built.artifact.packedBytes,
        });
        if (result?.ok === false) throw new Error(result?.error || `Échec de la sauvegarde ${personalCloudProviderLabel(destination)}.`);

        return {
          ok: true,
          destination,
          destinationLabel,
          localSafetyCreated,
          ...artifactMeta(),
          message: `Sauvegarde ${personalCloudProviderLabel(destination)} créée${localSafetyCreated ? " + copie locale de sécurité" : ""}.`,
        };
      }

      if (destination === "device_file" || destination === "external_sd_manual" || destination === "personal_cloud_manual") {
        await createSafetyCopy(`${automatic ? "Sécurité auto" : "Sécurité locale"} avant fichier — ${nowLabel}`);
        const built = await ensureArtifact();
        const status = await getExternalBackupStatus();

        if (automatic) {
          if (!status.configured) throw new Error("Cible fichier/SD/cloud personnel non configurée. La copie locale automatique a été créée.");
          const next = await writeExternalBackupJsonNow(built.artifactJson, reason, { requestPermission: false });
          if (next.lastError) throw new Error(`${next.lastError} La copie locale automatique a été créée.`);
          return {
            ok: true,
            destination,
            destinationLabel,
            localSafetyCreated,
            ...artifactMeta(),
            message: "Sauvegarde automatique fichier créée + copie locale de sécurité.",
          };
        }

        const next = status.configured
          ? await writeExternalBackupJsonNow(built.artifactJson, reason, { requestPermission: true })
          : status.supported
            ? await chooseExternalBackupFileWithJson(built.artifactJson, reason)
            : await downloadExternalBackupJson(built.artifactJson, reason);
        if (next.lastError) throw new Error(next.lastError);
        return {
          ok: true,
          destination,
          destinationLabel,
          localSafetyCreated,
          ...artifactMeta(),
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

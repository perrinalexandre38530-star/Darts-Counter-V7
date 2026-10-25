// WAVE 7 — le Sync Center utilise désormais le même artefact canonique que
// Local / NAS / R2 / Drive / fichier. L'ancien format CloudBackup reste
// uniquement pris en charge en lecture par restoreBackup.ts.

import { buildCanonicalBackupArtifact } from "../backup/backupEngineV1";

export async function exportCloudBackupAsJson(): Promise<{
  backupJson: string;
  backupObj: any;
}> {
  const built = await buildCanonicalBackupArtifact();
  return { backupJson: built.artifactJson, backupObj: built.artifact };
}

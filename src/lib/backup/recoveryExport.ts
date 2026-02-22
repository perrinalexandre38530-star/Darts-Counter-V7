import { buildCloudBackup } from "../cloudBackup/buildCloudBackup";

export async function exportRecoveryBackup() {
  const backup = await buildCloudBackup();
  return {
    ...backup,
    exportedAt: new Date().toISOString(),
  };
}
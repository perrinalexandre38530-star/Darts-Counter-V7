
// PATCHED VERSION
import { buildBackupBlocks } from "./backupBlocks";
import { createBackupManifest } from "./backupManifest";

export async function exportCloudBackupFast(){
  const blocks = await buildBackupBlocks();
  const manifest = createBackupManifest(blocks);

  const payload = {
    manifest,
    blocks
  };

  const json = JSON.stringify(payload);

  return {
    backupJson: json,
    backupObj: payload
  };
}

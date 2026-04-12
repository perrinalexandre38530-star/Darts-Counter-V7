// ============================================
// src/lib/cloudSync.ts
// Legacy cloud auto-sync disabled. NAS sync is manual and global.
// ============================================

export function startCloudSync(_opts?: any) {
  return () => {};
}

export function stopCloudSync() {}

export async function mergeNow() {
  return;
}

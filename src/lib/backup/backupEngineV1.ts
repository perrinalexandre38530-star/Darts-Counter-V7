import { flushMultisportAgendaPersistence } from "../../planning/multisportAgenda";
import { exportCloudSnapshot, getStorageUser, type CloudSnapshotExportOptions } from "../storage";
import { createCanonicalBackupArtifact, type CanonicalBackupArtifact } from "./canonicalBackupArtifact";

export type BackupArtifactProgress = (progress: number, message: string) => void;

async function flushPendingWrites(): Promise<void> {
  try {
    const fn = typeof window !== "undefined" ? (window as any).__flushLocalStoreNow : null;
    if (typeof fn === "function") await fn("backup-engine-v1");
  } catch (error) {
    console.warn("[backupEngineV1] store flush incomplete", error);
  }
  try { await flushMultisportAgendaPersistence(); } catch (error) { console.warn("[backupEngineV1] agenda flush incomplete", error); }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function summaryFromSnapshot(snapshot: any): Record<string, any> {
  const portable = snapshot?.portableAccountData || {};
  const counts = portable?.counts || {};
  const historyRows = snapshot?.history?.rows && typeof snapshot.history.rows === "object"
    ? Object.keys(snapshot.history.rows).length
    : 0;
  const tombstones = snapshot?.history?.tombstones && typeof snapshot.history.tombstones === "object"
    ? Object.keys(snapshot.history.tombstones).length
    : 0;
  return {
    profiles: Number(counts.profiles || portable?.profiles?.length || 0),
    bots: Number(counts.bots || portable?.bots?.length || 0),
    dartsets: Number(counts.dartSets || portable?.dartSets?.length || 0),
    teams: Number(counts.teams || portable?.teams?.length || 0),
    matches: historyRows,
    historyRows,
    tombstones,
    manifestStatus: String(snapshot?.backupManifest?.status || "legacy"),
    historySchemaVersion: Number(snapshot?.history?.historySchemaVersion || 0),
    exportedAt: String(snapshot?.exportedAt || new Date().toISOString()),
  };
}

export async function buildCanonicalBackupArtifact(args?: {
  onProgress?: BackupArtifactProgress;
  snapshotOptions?: CloudSnapshotExportOptions;
}): Promise<{
  artifact: CanonicalBackupArtifact;
  artifactJson: string;
  snapshot: any;
  summary: Record<string, any>;
}> {
  const report = (p: number, message: string) => { try { args?.onProgress?.(p, message); } catch {} };
  report(1, "Flush des écritures en attente…");
  await flushPendingWrites();
  report(5, "Construction du snapshot canonique…");
  const snapshot = await exportCloudSnapshot({
    mediaMirror: "skip",
    includeEmbeddedMedia: true,
    includeAvatarFallbacks: true,
    ...(args?.snapshotOptions || {}),
    onProgress: (p, message) => report(5 + Math.round(Math.max(0, Math.min(100, p)) * 0.82), message),
  });
  const summary = summaryFromSnapshot(snapshot);
  report(89, "Compression canonique de l’artefact…");
  const built = await createCanonicalBackupArtifact({
    snapshot,
    ownerUserId: String(getStorageUser() || "").trim() || null,
    summary,
  });
  report(100, "Artefact canonique prêt et hashé.");
  return { artifact: built.artifact, artifactJson: built.artifactJson, snapshot, summary };
}

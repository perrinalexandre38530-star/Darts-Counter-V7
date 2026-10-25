import { gzipSync, gunzipSync, strFromU8, strToU8 } from "fflate";
import { validateBackupManifestV2 } from "../../data/backupManifestV2";
import { sha256Hex } from "./hash";
import { bytesToBase64, base64ToBytes } from "./base64";

export const CANONICAL_BACKUP_ARTIFACT_KIND = "mss_canonical_backup_artifact_v1" as const;
export const CANONICAL_BACKUP_ARTIFACT_VERSION = 1 as const;
const STAGING_DB = "mss_backup_restore_staging_v1";
const STAGING_STORE = "artifacts";

export type CanonicalBackupArtifact = {
  kind: typeof CANONICAL_BACKUP_ARTIFACT_KIND;
  _v: typeof CANONICAL_BACKUP_ARTIFACT_VERSION;
  artifactId: string;
  createdAt: string;
  ownerUserId: string | null;
  payloadEncoding: "gzip-base64";
  payloadSha256: string;
  payloadBytes: number;
  packedBytes: number;
  manifestVersion: number;
  historySchemaVersion: number;
  summary?: Record<string, any>;
  data: string;
};

export type CanonicalBackupArtifactValidation = {
  ok: boolean;
  artifact: CanonicalBackupArtifact | null;
  snapshot: any | null;
  errors: string[];
  warnings: string[];
};


async function gzipBytes(input: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== "undefined") {
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return gzipSync(input, { level: 6 });
}

async function gunzipBytes(input: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return gunzipSync(input);
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function parseArtifact(input: unknown): CanonicalBackupArtifact | null {
  let value: any = input;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || typeof value !== "object") return null;
  if (value.kind !== CANONICAL_BACKUP_ARTIFACT_KIND || Number(value._v || 0) !== CANONICAL_BACKUP_ARTIFACT_VERSION) return null;
  return value as CanonicalBackupArtifact;
}

export function isCanonicalBackupArtifact(input: unknown): boolean {
  return parseArtifact(input) != null;
}

export async function createCanonicalBackupArtifact(args: {
  snapshot: any;
  ownerUserId?: string | null;
  summary?: Record<string, any>;
}): Promise<{ artifact: CanonicalBackupArtifact; artifactJson: string; snapshotJson: string }> {
  const manifestValidation = validateBackupManifestV2(args.snapshot);
  if (!manifestValidation.ok) {
    throw new Error(`Snapshot refusé avant emballage : ${manifestValidation.errors.join(" ")}`);
  }

  const snapshotJson = JSON.stringify(args.snapshot);
  const payloadSha256 = await sha256Hex(snapshotJson);
  const rawBytes = strToU8(snapshotJson);
  const packed = await gzipBytes(rawBytes);
  const artifact: CanonicalBackupArtifact = {
    kind: CANONICAL_BACKUP_ARTIFACT_KIND,
    _v: CANONICAL_BACKUP_ARTIFACT_VERSION,
    artifactId: `mss_${payloadSha256.slice(0, 24)}`,
    createdAt: new Date().toISOString(),
    ownerUserId: String(args.ownerUserId || args.snapshot?.backupManifest?.userId || "").trim() || null,
    payloadEncoding: "gzip-base64",
    payloadSha256,
    payloadBytes: rawBytes.byteLength,
    packedBytes: packed.byteLength,
    manifestVersion: Number(args.snapshot?.backupManifest?._v || 0),
    historySchemaVersion: Number(args.snapshot?.history?.historySchemaVersion || 0),
    summary: args.summary || {},
    data: bytesToBase64(packed),
  };
  return { artifact, artifactJson: JSON.stringify(artifact), snapshotJson };
}

function validateSnapshotReferences(snapshot: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const portable = snapshot?.portableAccountData || {};
  const checkUnique = (rows: any, label: string) => {
    if (!Array.isArray(rows)) return new Set<string>();
    const ids = new Set<string>();
    for (const row of rows) {
      const id = String(row?.id || row?.profileId || row?.teamId || "").trim();
      if (!id) continue;
      if (ids.has(id)) errors.push(`${label}: identifiant dupliqué ${id}.`);
      ids.add(id);
    }
    return ids;
  };
  const profileIds = checkUnique(portable?.profiles, "Profils");
  checkUnique(portable?.teams, "Teams");
  checkUnique(portable?.dartSets, "DartSets");
  checkUnique(portable?.bots, "Bots");

  const historyRows = snapshot?.history?.rows && typeof snapshot.history.rows === "object" ? snapshot.history.rows : {};
  const tombstones = snapshot?.history?.tombstones && typeof snapshot.history.tombstones === "object" ? snapshot.history.tombstones : {};
  for (const id of Object.keys(historyRows)) {
    if (Object.prototype.hasOwnProperty.call(tombstones, id)) errors.push(`History V4: la partie ${id} est active et tombstonée simultanément.`);
  }

  const activeProfileId = String(portable?.activeProfileId || snapshot?.store?.activeProfileId || "").trim();
  if (activeProfileId && profileIds.size > 0 && !profileIds.has(activeProfileId)) {
    warnings.push(`Profil actif ${activeProfileId} absent de la liste portable; résolution par alias requise.`);
  }
  return { errors, warnings };
}

export async function validateCanonicalBackupArtifact(input: unknown, opts?: { expectedOwnerUserId?: string | null }): Promise<CanonicalBackupArtifactValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const artifact = parseArtifact(input);
  if (!artifact) return { ok: false, artifact: null, snapshot: null, errors: ["Artefact de sauvegarde canonique invalide."], warnings };

  const expectedOwner = String(opts?.expectedOwnerUserId || "").trim();
  const artifactOwner = String(artifact.ownerUserId || "").trim();
  if (expectedOwner && artifactOwner && expectedOwner !== artifactOwner) {
    errors.push("Cette sauvegarde appartient à un autre compte.");
  }
  if (!artifact.data || artifact.payloadEncoding !== "gzip-base64") errors.push("Payload canonique absent ou encodage inconnu.");

  let snapshot: any = null;
  try {
    const packed = base64ToBytes(String(artifact.data || ""));
    if (Number(artifact.packedBytes || 0) > 0 && packed.byteLength !== Number(artifact.packedBytes)) {
      errors.push(`Taille compressée invalide (${packed.byteLength}/${artifact.packedBytes}).`);
    }
    const snapshotJson = strFromU8(await gunzipBytes(packed));
    if (Number(artifact.payloadBytes || 0) > 0 && utf8Bytes(snapshotJson) !== Number(artifact.payloadBytes)) {
      errors.push("Taille du snapshot décompressé incohérente.");
    }
    const hash = await sha256Hex(snapshotJson);
    if (hash !== String(artifact.payloadSha256 || "")) errors.push("SHA-256 du snapshot invalide.");
    snapshot = JSON.parse(snapshotJson);
  } catch (error: any) {
    errors.push(`Décompression/lecture de l’artefact impossible : ${String(error?.message || error)}`);
  }

  if (snapshot) {
    const refs = validateSnapshotReferences(snapshot);
    errors.push(...refs.errors);
    warnings.push(...refs.warnings);
    const manifest = validateBackupManifestV2(snapshot);
    if (!manifest.ok) errors.push(...manifest.errors.map((msg) => `Manifest V2 : ${msg}`));
    warnings.push(...manifest.warnings.map((msg) => `Manifest V2 : ${msg}`));
    const snapshotOwner = String(snapshot?.backupManifest?.userId || "").trim();
    if (artifactOwner && snapshotOwner && artifactOwner !== snapshotOwner) {
      errors.push("Le propriétaire de l’artefact diffère du propriétaire du snapshot.");
    }
  }

  return { ok: errors.length === 0, artifact, snapshot, errors, warnings };
}

function openStagingDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(STAGING_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STAGING_STORE)) req.result.createObjectStore(STAGING_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Base de staging indisponible"));
  });
}

export async function stageCanonicalBackupArtifact(input: unknown, opts?: { expectedOwnerUserId?: string | null }): Promise<{
  artifact: CanonicalBackupArtifact;
  snapshot: any;
  cleanup: () => Promise<void>;
}> {
  if (typeof indexedDB === "undefined") {
    const direct = await validateCanonicalBackupArtifact(input, opts);
    if (!direct.ok || !direct.artifact || !direct.snapshot) throw new Error(direct.errors.join(" "));
    return { artifact: direct.artifact, snapshot: direct.snapshot, cleanup: async () => undefined };
  }

  const initial = await validateCanonicalBackupArtifact(input, opts);
  if (!initial.ok || !initial.artifact) throw new Error(initial.errors.join(" "));
  const key = initial.artifact.artifactId || `pending_${Date.now()}`;
  const db = await openStagingDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STAGING_STORE, "readwrite");
      tx.objectStore(STAGING_STORE).put(initial.artifact, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Écriture staging impossible"));
    });
    const staged = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STAGING_STORE, "readonly");
      const req = tx.objectStore(STAGING_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Lecture staging impossible"));
    });
    const checked = await validateCanonicalBackupArtifact(staged, opts);
    if (!checked.ok || !checked.artifact || !checked.snapshot) throw new Error(checked.errors.join(" "));
    return {
      artifact: checked.artifact,
      snapshot: checked.snapshot,
      cleanup: async () => {
        try {
          const cleanDb = await openStagingDb();
          await new Promise<void>((resolve) => {
            const tx = cleanDb.transaction(STAGING_STORE, "readwrite");
            tx.objectStore(STAGING_STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          });
          cleanDb.close();
        } catch {}
      },
    };
  } finally {
    db.close();
  }
}

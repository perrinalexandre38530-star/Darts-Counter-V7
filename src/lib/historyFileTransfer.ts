// src/lib/historyFileTransfer.ts
// ============================================================
// Export/import manuel de l'intégralité de l'Historique dans UN fichier JSON.
// Le dump contient les headers + payloadCompressed complets de chaque match.
// Compatible desktop/PWA/Android : Web Share fichier si disponible, sinon download.
// ============================================================

import type { HistoryDumpV1 } from "./historyCloud";

export const HISTORY_BACKUP_FORMAT = "multisports-scoring-history-backup" as const;
export const HISTORY_BACKUP_VERSION = 1 as const;

export type FullHistoryBackupV1 = {
  format: typeof HISTORY_BACKUP_FORMAT;
  version: typeof HISTORY_BACKUP_VERSION;
  app: "multisports-scoring";
  exportedAt: string;
  matchCount: number;
  history: HistoryDumpV1;
};

export function buildFullHistoryBackup(dump: HistoryDumpV1, now = new Date()): FullHistoryBackupV1 {
  const rows = dump?.rows && typeof dump.rows === "object" ? dump.rows : {};
  return {
    format: HISTORY_BACKUP_FORMAT,
    version: HISTORY_BACKUP_VERSION,
    app: "multisports-scoring",
    exportedAt: now.toISOString(),
    matchCount: Object.keys(rows).length,
    history: { _v: 1, rows },
  };
}

export function extractHistoryDumpFromJson(value: any): HistoryDumpV1 | null {
  // Nouveau format utilisateur : enveloppe explicite et versionnée.
  if (
    value &&
    value.format === HISTORY_BACKUP_FORMAT &&
    Number(value.version) === HISTORY_BACKUP_VERSION &&
    value.history?._v === 1 &&
    value.history?.rows &&
    typeof value.history.rows === "object" &&
    !Array.isArray(value.history.rows)
  ) {
    return { _v: 1, rows: value.history.rows } as HistoryDumpV1;
  }

  // Compatibilité : anciens dumps internes historyCloud directement exportés.
  if (
    value &&
    value._v === 1 &&
    value.rows &&
    typeof value.rows === "object" &&
    !Array.isArray(value.rows)
  ) {
    return { _v: 1, rows: value.rows } as HistoryDumpV1;
  }

  return null;
}

function pad2(value: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(2, "0");
}

export function buildHistoryBackupFilename(date = new Date()): string {
  const stamp = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}_${pad2(date.getHours())}-${pad2(date.getMinutes())}-${pad2(date.getSeconds())}`;
  return `MULTISPORTS_SCORING_HISTORIQUE_COMPLET_${stamp}.json`;
}

function stringifyBackup(value: any): string {
  return JSON.stringify(value, (_key, current) => (typeof current === "bigint" ? String(current) : current), 2);
}

function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Laisser au navigateur/WebView le temps de consommer l'URL avant révocation.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function saveFullHistoryBackupFile(backup: FullHistoryBackupV1): Promise<{
  ok: boolean;
  method?: "share-file" | "download";
  cancelled?: boolean;
  error?: any;
}> {
  const json = stringifyBackup(backup);
  const filename = buildHistoryBackupFilename(new Date(backup.exportedAt));
  const nav: any = typeof navigator !== "undefined" ? navigator : null;

  try {
    const file = typeof File !== "undefined" ? new File([json], filename, { type: "application/json" }) : null;
    const canShareFile = !!file && !!nav?.share && (typeof nav?.canShare !== "function" || !!nav.canShare({ files: [file] }));

    // Android/PWA : ouvre le sélecteur système pour permettre d'enregistrer où l'utilisateur veut.
    if (canShareFile && file) {
      await nav.share({
        title: "Historique complet MULTISPORTS SCORING",
        text: `${backup.matchCount} partie(s)`,
        files: [file],
      });
      return { ok: true, method: "share-file" };
    }

    downloadJson(json, filename);
    return { ok: true, method: "download" };
  } catch (error: any) {
    if (error?.name === "AbortError") return { ok: true, cancelled: true };
    try {
      downloadJson(json, filename);
      return { ok: true, method: "download" };
    } catch (fallbackError) {
      return { ok: false, error: fallbackError || error };
    }
  }
}

import { apiGet, apiPost } from "./apiClient";
import { loadStore, importAll, saveStore, exportAll } from "./storage";
import { rebuildStatsToStore } from "./stats/rebuildStatsToStore";
import { importHistoryDump } from "./historyCloud";

function getOrCreateDeviceId() {
  const existing = localStorage.getItem("dc_device_id");
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem("dc_device_id", id);
  return id;
}

function buildHistoryDumpFromRawStore(payload: any) {
  const rows: Record<string, any> = {};
  const list = Array.isArray(payload?.history) ? payload.history : [];

  for (const row of list) {
    const id = String(row?.id || row?.matchId || row?.header?.id || "").trim();
    if (!id) continue;
    rows[id] = {
      ...(row || {}),
      id,
      matchId: String(row?.matchId || id),
    };
  }

  return { _v: 1 as const, rows };
}

export async function pushFullBackupToNas() {
  // ✅ IMPORTANT:
  // On sauvegarde maintenant un snapshot structuré complet
  // (IDB + localStorage + historique) et non plus juste le store brut.
  const snapshot = await exportAll();

  if (!snapshot) {
    throw new Error("Aucun snapshot local à sauvegarder");
  }

  const payload = {
    id: crypto.randomUUID(),
    deviceId: getOrCreateDeviceId(),
    payload: snapshot,
  };

  return apiPost("/backup/full", payload);
}

export async function restoreLatestBackupFromNas() {
  const data = await apiGet("/backup/full/latest");

  if (!data?.payload) {
    throw new Error("Aucun backup NAS disponible");
  }

  const payload = data.payload;

  // ✅ Cas 1 : snapshot structuré moderne exportAll()
  if ((payload?._v === 1 || payload?._v === 2) && payload?.idb) {
    await importAll(payload);
  } else {
    // ✅ Cas 2 : anciens backups NAS = store brut
    await saveStore(payload);

    // Historique IDB séparé : on le reconstruit depuis payload.history si présent
    try {
      const historyDump = buildHistoryDumpFromRawStore(payload);
      if (Object.keys(historyDump.rows).length > 0) {
        await importHistoryDump(historyDump, { replace: true });
      }
    } catch (e) {
      console.warn("Import history dump échoué", e);
    }

    // Rebuild stats depuis l’historique restauré
    try {
      await rebuildStatsToStore();
    } catch (e) {
      console.warn("Rebuild stats échoué", e);
    }
  }

  // ✅ Laisse le temps à l’UI d’afficher le message vert
  window.setTimeout(() => {
    window.location.reload();
  }, 1200);

  return data;
}

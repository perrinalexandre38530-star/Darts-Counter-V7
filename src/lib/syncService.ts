
import { apiGet, apiPost } from "./apiClient";
import { loadStore, importAll, saveStore } from "./storage";
import { rebuildStatsToStore } from "./stats/rebuildStatsToStore";

function getOrCreateDeviceId() {
  const existing = localStorage.getItem("dc_device_id");
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem("dc_device_id", id);
  return id;
}

export async function pushFullBackupToNas() {
  const store = await loadStore();

  if (!store) {
    throw new Error("Aucun store local à sauvegarder");
  }

  const payload = {
    id: crypto.randomUUID(),
    deviceId: getOrCreateDeviceId(),
    payload: store,
  };

  return apiPost("/backup/full", payload);
}

export async function restoreLatestBackupFromNas() {
  const data = await apiGet("/backup/full/latest");

  if (!data?.payload) {
    throw new Error("Aucun backup NAS disponible");
  }

  const payload = data.payload;

  // Cas 1 : snapshot structuré
  if (payload?._v && payload?.idb) {
    await importAll(payload);
  } 
  // Cas 2 : store brut (NAS)
  else {
    await saveStore(payload);

    try {
      await rebuildStatsToStore({ includeNonFinished: true, persist: true });
    } catch (e) {
      console.warn("Rebuild stats échoué", e);
    }
  }

  // force reload UI pour rehydrater tous les hooks/store
  window.location.reload();

  return data;
}

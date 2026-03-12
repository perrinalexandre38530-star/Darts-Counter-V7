import { apiGet, apiPost } from "./apiClient";
import { loadStore, importAll } from "./storage";

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

  await importAll(data.payload);
  return data;
}

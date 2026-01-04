import { exportAllLocalData, importAllLocalData, wipeAllLocalData } from "./storage";

export type AppSnapshot = {
  version: 7;
  exportedAt: number;
  data: any;
};

export function exportAppSnapshot(): AppSnapshot {
  return {
    version: 7,
    exportedAt: Date.now(),
    data: exportAllLocalData(),
  };
}

export function importAppSnapshot(snapshot: AppSnapshot) {
  wipeAllLocalData();
  importAllLocalData(snapshot.data);
}
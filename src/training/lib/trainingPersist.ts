// ============================================
// src/training/lib/trainingPersist.ts
// Persistance simple par mode (localStorage)
// ============================================

const KEY = "dc_training_last_config_v1";

type Store = Record<string, any>;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return typeof v === "object" && v ? v : {};
  } catch {
    return {};
  }
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

export function getLastConfig(modeId: string): any | null {
  const s = load();
  return s[modeId] ?? null;
}

export function setLastConfig(modeId: string, cfg: any) {
  const s = load();
  s[modeId] = cfg;
  save(s);
}

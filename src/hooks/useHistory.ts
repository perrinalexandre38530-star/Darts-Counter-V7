// ============================================
// src/hooks/useHistory.ts
// Hook pour charger l'historique (IDB) + refresh simple
// ============================================
import { useEffect, useState } from "react";

function safeArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function isUsableSavedMatch(v: any): boolean {
  try {
    return !!String(v?.id ?? v?.matchId ?? "").trim();
  } catch {
    return false;
  }
}
import { History, type SavedMatch } from "../lib/history";

export function useHistory() {
  const [rows, setRows] = useState<SavedMatch[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const out = await History.list();
      setRows(safeArray<SavedMatch>(out).filter(isUsableSavedMatch));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();

    // Mini bus d’événements via localStorage pour forcer un refresh inter-écrans
    const KEY = "dc-history-refresh";
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) refresh();
    };
    const onUpd = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("dc-history-updated" as any, onUpd);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dc-history-updated" as any, onUpd);
    };
  }, []);

  // exposer un moyen manuel de refresh après upsert/remove
  return { rows, loading, refresh };
}

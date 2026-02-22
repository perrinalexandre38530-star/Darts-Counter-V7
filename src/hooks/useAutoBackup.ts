import { useEffect } from "react";
import { createAutoBackup } from "../lib/backup/autoBackupService";

export function useAutoBackup(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        createAutoBackup().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}
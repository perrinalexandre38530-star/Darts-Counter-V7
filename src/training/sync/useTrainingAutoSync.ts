import { useEffect } from "react";
import { useAuthOnline } from "../../hooks/useAuthOnline";
import { shouldAttemptRemoteWork } from "../../lib/offlineFirstRuntime";
import { trainingSyncQueueTry, trainingSyncQueueEnqueueSoon } from "./trainingSyncQueue";

export function useTrainingAutoSync(enabled: boolean = true) {
  const { user } = useAuthOnline();

  useEffect(() => {
    if (!enabled) return;
    if (!user) return;
    try {
      localStorage.setItem("dc_user_id", user.id);
    } catch {}
  }, [user, enabled]);

  useEffect(() => {
    if (!enabled || !user) return;

    let alive = true;

    const trySync = () => {
      if (!alive || !shouldAttemptRemoteWork()) return;
      // Best-effort, sans spam : l'enregistrement local/queue existe déjà.
      trainingSyncQueueEnqueueSoon();
      void trainingSyncQueueTry(user.id);
    };

    // Premier essai uniquement si le runtime est réellement déclaré en ligne.
    trySync();

    const onFocus = () => trySync();
    const onOnline = () => trySync();

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline, { passive: true });

    // Pas de polling réseau hors ligne. En ligne, 2 minutes est largement
    // suffisant et la queue ne pousse que les événements en attente.
    const t = window.setInterval(trySync, 120000);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.clearInterval(t);
    };
  }, [user, enabled]);
}

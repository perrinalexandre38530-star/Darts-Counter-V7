import { useEffect } from "react";
import { useAuthOnline } from "../../hooks/useAuthOnline";
import { trainingSyncQueueTry, trainingSyncQueueEnqueueSoon } from "./trainingSyncQueue";

export function useTrainingAutoSync() {
  const { user, online } = useAuthOnline();

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem("dc_user_id", user.id);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user || !online) return;

    let alive = true;

    // ✅ Best-effort, mais sans spam Supabase
    trainingSyncQueueEnqueueSoon();
    trainingSyncQueueTry(user.id);

    const onFocus = () => {
      if (!alive) return;
      trainingSyncQueueEnqueueSoon();
      trainingSyncQueueTry(user.id);
    };

    window.addEventListener("focus", onFocus);

    // ⚠️ IMPORTANT: ne pas ping le serveur toutes les 15s.
    // 2 minutes est largement suffisant (et la queue ne sync que s'il y a des events).
    const t = window.setInterval(() => {
      if (!alive) return;
      trainingSyncQueueTry(user.id);
    }, 120000);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(t);
    };
  }, [user, online]);
}

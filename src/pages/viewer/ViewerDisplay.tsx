import * as React from "react";
import ViewerScreen from "../../components/viewer/ViewerScreen";
import { fetchViewerSnapshot, normalizeViewerCode } from "../../lib/viewer/viewerClient";
import type { ViewerLiveSnapshot } from "../../lib/viewer/types";

type Props = { go: (tab: any, params?: any) => void; sessionId?: string | null };

export default function ViewerDisplay({ go, sessionId }: Props) {
  const sid = normalizeViewerCode(String(sessionId || ""));
  const [snapshot, setSnapshot] = React.useState<ViewerLiveSnapshot | null>(null);
  const [state, setState] = React.useState<"connecting" | "live" | "offline" | "missing">(sid ? "connecting" : "missing");
  const lastRevRef = React.useRef("");

  React.useEffect(() => {
    if (!sid) {
      setState("missing");
      return;
    }

    let alive = true;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const next = await fetchViewerSnapshot(sid);
        if (!alive) return;
        if (next) {
          const rev = String((next as any).rev || next.updatedAt || "");
          if (rev !== lastRevRef.current) {
            lastRevRef.current = rev;
            setSnapshot(next);
          }
          setState("live");
        } else {
          setState("connecting");
        }
      } catch {
        if (alive) setState("offline");
      } finally {
        if (alive) timer = window.setTimeout(tick, state === "offline" ? 1400 : 700);
      }
    };

    void tick();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  if (!sid) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, background: "#05070b", color: "#fff" }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 1100, color: "#ffd56a" }}>Code viewer manquant</div>
          <button onClick={() => go("viewer_join")} style={{ marginTop: 16, borderRadius: 14, padding: "12px 16px", border: "none", background: "#ffd56a", color: "#17120b", fontWeight: 1000 }}>
            Saisir un code
          </button>
        </div>
      </div>
    );
  }

  const label = state === "live" ? "connecté" : state === "offline" ? "hors ligne" : "connexion…";
  return <ViewerScreen snapshot={snapshot} connectionLabel={label} onJoin={() => go("viewer_join")} />;
}

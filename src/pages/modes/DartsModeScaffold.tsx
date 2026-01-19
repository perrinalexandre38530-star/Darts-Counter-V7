import React from "react";
import { dartsGameRegistry } from "../../games/dartsGameRegistry";

type Props = {
  gameId: string;
  go: (t: any, p?: any) => void;
};

export default function DartsModeScaffold({ gameId, go }: Props) {
  const game = dartsGameRegistry.find(g => g.id === gameId);

  const cfg = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(`dc_modecfg_${String(gameId || "").toLowerCase()}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [gameId]);

  const playersLabel = React.useMemo(() => {
    const arr = (cfg?.players || []) as any[];
    if (!Array.isArray(arr) || arr.length === 0) return "";
    return arr.map((p) => p?.name || "?").join(" · ");
  }, [cfg]);

  return (
    <div style={{ padding: 16, color: "#fff" }}>
      <h2>{game?.label ?? gameId}</h2>
      <p>{game?.infoBody}</p>

      {playersLabel && (
        <div style={{ opacity: 0.85, marginTop: 10, fontSize: 13 }}>
          Joueurs: {playersLabel}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={() => go("darts_mode_config", { gameId })}>Configurer</button>
        <button onClick={() => go("home")}>Quitter</button>
      </div>
    </div>
  );
}

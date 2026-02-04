import React from "react";

type Props = {
  open: boolean;
  theme: any;
  winnerLabel: string;
  scoreLine: string;
  detailsLine?: string;
  onReplay: () => void;
  onStats: () => void;
  onGames: () => void;
};

export default function BabyFootEndGameSummary({
  open,
  theme,
  winnerLabel,
  scoreLine,
  detailsLine,
  onReplay,
  onStats,
  onGames,
}: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 10000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 22,
          border: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
          background: theme?.card ?? "rgba(12,14,22,0.98)",
          boxShadow: "0 22px 90px rgba(0,0,0,0.75)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            background:
              "radial-gradient(800px 220px at 20% 0%, rgba(255,255,255,0.14), transparent 60%), radial-gradient(700px 220px at 80% 100%, rgba(255,255,255,0.10), transparent 60%)",
          }}
        >
          <div style={{ fontWeight: 1000, letterSpacing: 1, color: theme?.colors?.primary ?? "#7cffc4" }}>FIN DE MATCH</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 1000, letterSpacing: 0.6, color: theme?.colors?.text ?? "#fff" }}>
            🏆 {winnerLabel}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              fontWeight: 950,
              opacity: 0.85,
              color: theme?.colors?.textSoft ?? "rgba(255,255,255,0.75)",
            }}
          >
            {scoreLine}
          </div>
          {detailsLine ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 900,
                opacity: 0.75,
                color: theme?.colors?.textSoft ?? "rgba(255,255,255,0.70)",
              }}
            >
              {detailsLine}
            </div>
          ) : null}
        </div>

        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <button
            onClick={onReplay}
            style={{
              height: 54,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.12)",
              color: theme?.colors?.text ?? "#fff",
              fontWeight: 1000,
              letterSpacing: 1,
              cursor: "pointer",
              boxShadow: "0 16px 44px rgba(0,0,0,0.45)",
            }}
          >
            REJOUER
          </button>

          <button
            onClick={onStats}
            style={{
              height: 54,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(124,255,196,0.16)",
              color: theme?.colors?.text ?? "#fff",
              fontWeight: 1000,
              letterSpacing: 1,
              cursor: "pointer",
              boxShadow: "0 16px 44px rgba(0,0,0,0.45)",
            }}
          >
            VOIR STATS / HISTORIQUE
          </button>

          <button
            onClick={onGames}
            style={{
              height: 54,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.18)",
              color: theme?.colors?.text ?? "#fff",
              fontWeight: 1000,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            RETOUR GAMES
          </button>
        </div>
      </div>
    </div>
  );
}

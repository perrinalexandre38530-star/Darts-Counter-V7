import React from "react";

export type PowerUpId = "reinforce" | "steal" | "shield";

export type PowerUp = {
  id: PowerUpId;
  label: string;
  value?: number;
  desc: string;
};

type Props = {
  teamColor: string;
  teamIndex: number;
  hand: PowerUp[];
  selectedIdx: number | null;
  selectedTarget: number | null; // 1..20
  onSelectCard: (idx: number | null) => void;
  onSelectTarget: (n: number | null) => void;
  onActivate: () => void;
  disabled?: boolean;
};

export default function TerritoriesPowerUps({
  teamColor,
  teamIndex,
  hand,
  selectedIdx,
  selectedTarget,
  onSelectCard,
  onSelectTarget,
  onActivate,
  disabled,
}: Props) {
  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 16,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 1000, fontSize: 12, letterSpacing: 1, color: teamColor }}>
          TEAM {teamIndex + 1} — POWER-UPS
        </div>

        <button
          onClick={onActivate}
          disabled={disabled || selectedIdx === null || selectedTarget === null}
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background:
              disabled || selectedIdx === null || selectedTarget === null
                ? "rgba(255,255,255,0.06)"
                : `${teamColor}22`,
            color: "#fff",
            fontWeight: 950,
            cursor:
              disabled || selectedIdx === null || selectedTarget === null ? "not-allowed" : "pointer",
          }}
          title="Choisis une carte + un territoire, puis active"
        >
          Activer
        </button>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {hand.map((p, idx) => {
          const sel = idx === selectedIdx;
          return (
            <button
              key={idx}
              onClick={() => onSelectCard(sel ? null : idx)}
              disabled={disabled}
              style={{
                padding: "8px 10px",
                borderRadius: 999,
                border: sel ? `1px solid ${teamColor}88` : "1px solid rgba(255,255,255,0.12)",
                background: sel ? `${teamColor}22` : "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 950,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
              title={p.desc}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>Cible</div>
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 6 }}>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const sel = n === selectedTarget;
            return (
              <button
                key={n}
                onClick={() => onSelectTarget(sel ? null : n)}
                disabled={disabled}
                style={{
                  padding: "8px 0",
                  borderRadius: 10,
                  border: sel ? `1px solid ${teamColor}88` : "1px solid rgba(255,255,255,0.10)",
                  background: sel ? `${teamColor}22` : "rgba(0,0,0,0.12)",
                  color: "#fff",
                  fontWeight: 950,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

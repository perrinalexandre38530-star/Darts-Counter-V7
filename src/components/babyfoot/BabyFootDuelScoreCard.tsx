import React from "react";

type Props = {
  teamAName: string;
  teamBName: string;
  teamALogoDataUrl?: string | null;
  teamBLogoDataUrl?: string | null;
  scoreA: number;
  scoreB: number;
  setsEnabled: boolean;
  setsA: number;
  setsB: number;
  setTarget: number;
  target: number;
  handicapA?: number;
  handicapB?: number;
  onAddGoalA: () => void;
  onAddGoalB: () => void;
  goalsDisabled?: boolean;
};

function LogoMedallion({ label, src, accent }: { label: string; src?: string | null; accent: string }) {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 999,
        padding: 3,
        background: `linear-gradient(180deg, ${accent}66, rgba(255,255,255,0.05))`,
        boxShadow: `0 0 18px ${accent}44`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.26))",
          display: "grid",
          placeItems: "center",
        }}
      >
        {src ? (
          <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 30, fontWeight: 1100 }}>{label.trim().slice(0, 1).toUpperCase() || "?"}</div>
        )}
      </div>
    </div>
  );
}

function teamNameStyle(accent: string): React.CSSProperties {
  return {
    marginTop: 6,
    fontSize: 17,
    fontWeight: 1100,
    textAlign: "center",
    color: accent,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    textShadow: `0 0 14px ${accent}22`,
  };
}

function goalButton(label: string, accent: string, onClick: () => void, disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : accent + "33"}`,
    background: disabled ? "rgba(255,255,255,0.04)" : `linear-gradient(180deg, ${accent}30, ${accent}12)`,
    color: disabled ? "rgba(255,255,255,0.42)" : "#fff",
    fontWeight: 1100,
    letterSpacing: 0.4,
    cursor: disabled ? "default" : "pointer",
  };
}

export default function BabyFootDuelScoreCard({
  teamAName,
  teamBName,
  teamALogoDataUrl,
  teamBLogoDataUrl,
  scoreA,
  scoreB,
  setsEnabled,
  setsA,
  setsB,
  setTarget,
  target,
  handicapA = 0,
  handicapB = 0,
  onAddGoalA,
  onAddGoalB,
  goalsDisabled = false,
}: Props) {
  const green = "#b4ff39";
  const pink = "#ff82b8";
  const gold = "#ffd24a";
  const footerText = setsEnabled ? `Set en cours • objectif ${setTarget}` : `Match en cours • objectif ${target}`;

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,210,74,0.16)",
        background:
          "radial-gradient(420px 220px at 50% 0%, rgba(255,210,74,0.12), transparent 54%), radial-gradient(240px 180px at 0% 0%, rgba(180,255,57,0.10), transparent 60%), radial-gradient(240px 180px at 100% 0%, rgba(255,130,184,0.12), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        boxShadow: "0 18px 34px rgba(0,0,0,0.34)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          <div style={{ minWidth: 0, display: "grid", justifyItems: "center" }}>
            <LogoMedallion label={teamAName} src={teamALogoDataUrl} accent={green} />
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: green, textTransform: "uppercase" }}>Équipe A</div>
            <div title={teamAName} style={teamNameStyle(green)}>{teamAName}</div>
          </div>

          <div
            style={{
              minWidth: 138,
              borderRadius: 18,
              padding: "10px 12px",
              border: "1px solid rgba(255,210,74,0.18)",
              background: "linear-gradient(180deg, rgba(0,0,0,0.24), rgba(0,0,0,0.36))",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03), 0 0 26px rgba(255,210,74,0.10)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.9, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>Score</div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ minWidth: 30, textAlign: "right", fontSize: 60, fontWeight: 1100, lineHeight: 0.9, color: green, textShadow: `0 0 18px ${green}55` }}>{scoreA}</div>
              <div style={{ fontSize: 20, fontWeight: 1100, opacity: 0.5, color: gold }}>–</div>
              <div style={{ minWidth: 30, textAlign: "left", fontSize: 60, fontWeight: 1100, lineHeight: 0.9, color: pink, textShadow: `0 0 18px ${pink}55` }}>{scoreB}</div>
            </div>
            <div style={{ marginTop: 7, fontSize: 12, fontWeight: 1000, color: setsEnabled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.72)" }}>
              {setsEnabled ? `Sets ${setsA}–${setsB}` : "Score du match"}
            </div>
          </div>

          <div style={{ minWidth: 0, display: "grid", justifyItems: "center" }}>
            <LogoMedallion label={teamBName} src={teamBLogoDataUrl} accent={pink} />
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: pink, textTransform: "uppercase" }}>Équipe B</div>
            <div title={teamBName} style={teamNameStyle(pink)}>{teamBName}</div>
          </div>
        </div>

        {(handicapA > 0 || handicapB > 0) ? (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {handicapA > 0 ? (
              <span style={{ borderRadius: 999, padding: "5px 9px", background: "rgba(180,255,57,0.10)", border: "1px solid rgba(180,255,57,0.24)", fontSize: 11, fontWeight: 1000 }}>{teamAName} +{handicapA}</span>
            ) : null}
            {handicapB > 0 ? (
              <span style={{ borderRadius: 999, padding: "5px 9px", background: "rgba(255,130,184,0.10)", border: "1px solid rgba(255,130,184,0.24)", fontSize: 11, fontWeight: 1000 }}>{teamBName} +{handicapB}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 12px", background: "rgba(0,0,0,0.22)" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 1000, color: "rgba(255,255,255,0.90)" }}>{footerText}</div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" onClick={onAddGoalA} disabled={goalsDisabled} style={goalButton(`+ BUT ${teamAName}`, green, onAddGoalA, goalsDisabled)}>
            + BUT {teamAName}
          </button>
          <button type="button" onClick={onAddGoalB} disabled={goalsDisabled} style={goalButton(`+ BUT ${teamBName}`, pink, onAddGoalB, goalsDisabled)}>
            + BUT {teamBName}
          </button>
        </div>
      </div>
    </div>
  );
}

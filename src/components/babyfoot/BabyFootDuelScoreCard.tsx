import React from "react";

type SideVisual = {
  name: string;
  imageSrc?: string | null;
  roleLabel?: string;
};

type Props = {
  visualA: SideVisual;
  visualB: SideVisual;
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
  footerSuffix?: string | null;
};

function avatarRing(accent: string, compact = false): React.CSSProperties {
  const size = compact ? 66 : 74;
  return {
    width: size,
    height: size,
    borderRadius: 999,
    padding: 3,
    background: `linear-gradient(180deg, ${accent}cc, ${accent}2a)`,
    boxShadow: `0 0 18px ${accent}35`,
    flex: "0 0 auto",
  };
}

function avatarInner(): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.34))",
    display: "grid",
    placeItems: "center",
  };
}

function scoreAction(accent: string, disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 16,
    border: `1px solid ${disabled ? "rgba(255,255,255,0.10)" : `${accent}77`}`,
    background: disabled ? "rgba(255,255,255,0.04)" : `linear-gradient(180deg, ${accent}33, ${accent}14)`,
    color: disabled ? "rgba(255,255,255,0.45)" : "#fff",
    fontSize: 13,
    fontWeight: 1100,
    letterSpacing: 0.16,
    cursor: disabled ? "default" : "pointer",
    boxShadow: disabled ? "none" : `0 0 12px ${accent}22`,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    padding: "0 12px",
  };
}

function SideBlock({ visual, accent, align }: { visual: SideVisual; accent: string; align: "left" | "right" }) {
  const compact = (visual.name || "").length > 11;
  return (
    <div
      style={{
        minWidth: 0,
        display: "grid",
        justifyItems: align === "left" ? "start" : "end",
        textAlign: align,
        gap: 8,
      }}
    >
      <div style={avatarRing(accent, compact)}>
        <div style={avatarInner()}>
          {visual.imageSrc ? (
            <img src={visual.imageSrc} alt={visual.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 28, fontWeight: 1100 }}>{visual.name.trim().slice(0, 1).toUpperCase() || "?"}</div>
          )}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        {visual.roleLabel ? (
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.75, color: accent, textTransform: "uppercase" }}>{visual.roleLabel}</div>
        ) : null}
        <div
          title={visual.name}
          style={{
            marginTop: 2,
            fontSize: compact ? 13 : 15,
            fontWeight: 1100,
            color: accent,
            textShadow: `0 0 12px ${accent}22`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 112,
          }}
        >
          {visual.name}
        </div>
      </div>
    </div>
  );
}

export default function BabyFootDuelScoreCard({
  visualA,
  visualB,
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
  footerSuffix,
}: Props) {
  const green = "#c7ff26";
  const pink = "#ff59b0";
  const footerText = footerSuffix || (setsEnabled ? `Match en cours • set ${setsA + setsB + 1} • objectif ${setTarget}` : `Match en cours • objectif ${target}`);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          borderRadius: 24,
          overflow: "hidden",
          border: "1px solid rgba(120,150,255,0.14)",
          background:
            "radial-gradient(240px 150px at 16% 36%, rgba(199,255,38,0.18), transparent 70%), radial-gradient(240px 150px at 84% 36%, rgba(255,89,176,0.18), transparent 70%), linear-gradient(180deg, rgba(13,17,34,0.98), rgba(7,9,22,0.99))",
          boxShadow: "0 16px 36px rgba(0,0,0,0.32)",
        }}
      >
        <div style={{ padding: "14px 12px 10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(82px,1fr) auto minmax(82px,1fr)", gap: 10, alignItems: "center" }}>
            <SideBlock visual={visualA} accent={green} align="left" />

            <div
              style={{
                minWidth: 110,
                borderRadius: 18,
                padding: "10px 8px",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(8,10,18,0.42)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 0.95, color: "rgba(255,255,255,0.76)", textTransform: "uppercase" }}>
                Score
              </div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 46, lineHeight: 0.95, fontWeight: 1100, color: green, textShadow: `0 0 16px ${green}66` }}>{scoreA}</span>
                <span style={{ fontSize: 20, lineHeight: 1, fontWeight: 1100, color: "rgba(255,255,255,0.92)" }}>–</span>
                <span style={{ fontSize: 46, lineHeight: 0.95, fontWeight: 1100, color: pink, textShadow: `0 0 16px ${pink}66` }}>{scoreB}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 1000, color: "rgba(255,255,255,0.92)" }}>Score du match</div>
            </div>

            <SideBlock visual={visualB} accent={pink} align="right" />
          </div>

          {(handicapA > 0 || handicapB > 0) ? (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {handicapA > 0 ? <span style={{ borderRadius: 999, padding: "5px 9px", border: "1px solid rgba(199,255,38,0.24)", background: "rgba(199,255,38,0.08)", fontSize: 11, fontWeight: 1000 }}>{visualA.name} +{handicapA}</span> : null}
              {handicapB > 0 ? <span style={{ borderRadius: 999, padding: "5px 9px", border: "1px solid rgba(255,89,176,0.24)", background: "rgba(255,89,176,0.08)", fontSize: 11, fontWeight: 1000 }}>{visualB.name} +{handicapB}</span> : null}
            </div>
          ) : null}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "rgba(255,255,255,0.90)", fontSize: 12, fontWeight: 1000, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: green, boxShadow: `0 0 10px ${green}55` }} />
            <span>{footerText}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button type="button" onClick={onAddGoalA} disabled={goalsDisabled} style={scoreAction(green, goalsDisabled)}>
          ⚽ + BUT {visualA.name}
        </button>
        <button type="button" onClick={onAddGoalB} disabled={goalsDisabled} style={scoreAction(pink, goalsDisabled)}>
          ⚽ + BUT {visualB.name}
        </button>
      </div>
    </div>
  );
}

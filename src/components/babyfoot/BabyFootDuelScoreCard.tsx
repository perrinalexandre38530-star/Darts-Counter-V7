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
};

function avatarRing(accent: string, compact = false): React.CSSProperties {
  const size = compact ? 74 : 86;
  return {
    width: size,
    height: size,
    borderRadius: 999,
    padding: 3,
    background: `linear-gradient(180deg, ${accent}cc, ${accent}2a)`,
    boxShadow: `0 0 20px ${accent}40`,
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
    minHeight: 52,
    borderRadius: 18,
    border: `1px solid ${disabled ? "rgba(255,255,255,0.10)" : `${accent}77`}`,
    background: disabled
      ? "rgba(255,255,255,0.04)"
      : `linear-gradient(180deg, ${accent}33, ${accent}14)`,
    color: disabled ? "rgba(255,255,255,0.45)" : "#fff",
    fontSize: 14,
    fontWeight: 1100,
    letterSpacing: 0.2,
    cursor: disabled ? "default" : "pointer",
    boxShadow: disabled ? "none" : `0 0 14px ${accent}22`,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    padding: "0 14px",
  };
}

function SideBlock({ visual, accent, align }: { visual: SideVisual; accent: string; align: "left" | "right" }) {
  const compact = (visual.name || "").length > 13;
  return (
    <div
      style={{
        minWidth: 0,
        display: "grid",
        justifyItems: align === "left" ? "start" : "end",
        textAlign: align,
        gap: 10,
      }}
    >
      <div style={avatarRing(accent, compact)}>
        <div style={avatarInner()}>
          {visual.imageSrc ? (
            <img src={visual.imageSrc} alt={visual.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: compact ? 32 : 36, fontWeight: 1100 }}>{visual.name.trim().slice(0, 1).toUpperCase() || "?"}</div>
          )}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        {visual.roleLabel ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 1000,
              letterSpacing: 0.85,
              color: accent,
              textTransform: "uppercase",
            }}
          >
            {visual.roleLabel}
          </div>
        ) : null}
        <div
          title={visual.name}
          style={{
            marginTop: 2,
            fontSize: compact ? 16 : 18,
            fontWeight: 1100,
            color: accent,
            textShadow: `0 0 12px ${accent}22`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 132,
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
}: Props) {
  const green = "#c7ff26";
  const pink = "#ff59b0";
  const footerText = setsEnabled
    ? `Match en cours • set ${setsA + setsB + 1} • objectif ${setTarget}`
    : `Match en cours • objectif ${target}`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid rgba(120,150,255,0.14)",
          background:
            "radial-gradient(280px 180px at 16% 36%, rgba(199,255,38,0.18), transparent 70%), radial-gradient(280px 180px at 84% 36%, rgba(255,89,176,0.18), transparent 70%), linear-gradient(180deg, rgba(13,17,34,0.98), rgba(7,9,22,0.99))",
          boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
        }}
      >
        <div style={{ padding: "18px 14px 12px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(92px,1fr) auto minmax(92px,1fr)",
              gap: 12,
              alignItems: "center",
            }}
          >
            <SideBlock visual={visualA} accent={green} align="left" />

            <div
              style={{
                minWidth: 122,
                borderRadius: 20,
                padding: "12px 10px",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(8,10,18,0.40)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 1000,
                  letterSpacing: 1,
                  color: "rgba(255,255,255,0.76)",
                  textTransform: "uppercase",
                }}
              >
                Score
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 58, lineHeight: 0.95, fontWeight: 1100, color: green, textShadow: `0 0 18px ${green}66` }}>{scoreA}</span>
                <span style={{ fontSize: 24, lineHeight: 1, fontWeight: 1100, color: "rgba(255,255,255,0.92)" }}>–</span>
                <span style={{ fontSize: 58, lineHeight: 0.95, fontWeight: 1100, color: pink, textShadow: `0 0 18px ${pink}66` }}>{scoreB}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 1000, color: "rgba(255,255,255,0.92)" }}>
                Score du match
              </div>
            </div>

            <SideBlock visual={visualB} accent={pink} align="right" />
          </div>

          {(handicapA > 0 || handicapB > 0) ? (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {handicapA > 0 ? (
                <span style={{ borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(199,255,38,0.24)", background: "rgba(199,255,38,0.08)", fontSize: 12, fontWeight: 1000 }}>
                  {visualA.name} +{handicapA}
                </span>
              ) : null}
              {handicapB > 0 ? (
                <span style={{ borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(255,89,176,0.24)", background: "rgba(255,89,176,0.08)", fontSize: 12, fontWeight: 1000 }}>
                  {visualB.name} +{handicapB}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.18)",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "rgba(255,255,255,0.90)",
              fontSize: 13,
              fontWeight: 1000,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 999, background: green, boxShadow: `0 0 12px ${green}55` }} />
            <span>{footerText}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button type="button" onClick={onAddGoalA} disabled={goalsDisabled} style={scoreAction(green, goalsDisabled)}>
          + BUT {visualA.name}
        </button>
        <button type="button" onClick={onAddGoalB} disabled={goalsDisabled} style={scoreAction(pink, goalsDisabled)}>
          + BUT {visualB.name}
        </button>
      </div>
    </div>
  );
}

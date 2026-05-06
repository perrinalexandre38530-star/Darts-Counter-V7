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

function logoWrap(accent: string): React.CSSProperties {
  return {
    width: 98,
    height: 98,
    borderRadius: 999,
    padding: 4,
    background: `linear-gradient(180deg, ${accent}aa, ${accent}25)`,
    boxShadow: `0 0 22px ${accent}44`,
  };
}

function avatarInner(): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.32))",
    display: "grid",
    placeItems: "center",
  };
}

function actionButton(accent: string, disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 56,
    borderRadius: 18,
    border: `1px solid ${disabled ? "rgba(255,255,255,0.10)" : accent + "66"}`,
    background: disabled
      ? "rgba(255,255,255,0.04)"
      : `linear-gradient(180deg, ${accent}2f, ${accent}16)`,
    color: disabled ? "rgba(255,255,255,0.46)" : "#fff",
    fontSize: 15,
    fontWeight: 1100,
    letterSpacing: 0.2,
    cursor: disabled ? "default" : "pointer",
    boxShadow: disabled ? "none" : `0 0 18px ${accent}20`,
  };
}

function TeamSide({
  name,
  logo,
  accent,
  side,
}: {
  name: string;
  logo?: string | null;
  accent: string;
  side: "left" | "right";
}) {
  return (
    <div style={{ display: "grid", justifyItems: "center", minWidth: 0 }}>
      <div style={logoWrap(accent)}>
        <div style={avatarInner()}>
          {logo ? (
            <img src={logo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 42, fontWeight: 1100 }}>{name.trim().slice(0, 1).toUpperCase() || "?"}</div>
          )}
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          fontWeight: 1000,
          letterSpacing: 0.9,
          color: accent,
          textTransform: "uppercase",
        }}
      >
        {side === "left" ? "Équipe A" : "Équipe B"}
      </div>
      <div
        title={name}
        style={{
          marginTop: 2,
          fontSize: 17,
          fontWeight: 1100,
          color: accent,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
          textShadow: `0 0 12px ${accent}22`,
        }}
      >
        {name}
      </div>
    </div>
  );
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
  const pink = "#ff5fb1";
  const footerText = setsEnabled
    ? `Match en cours • set ${setsA + setsB + 1} • objectif ${setTarget}`
    : `Match en cours • objectif ${target}`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          borderRadius: 26,
          overflow: "hidden",
          border: "1px solid rgba(120,150,255,0.14)",
          background:
            "radial-gradient(420px 220px at 50% 0%, rgba(255,210,74,0.14), transparent 54%), radial-gradient(260px 180px at 0% 32%, rgba(180,255,57,0.16), transparent 62%), radial-gradient(260px 180px at 100% 32%, rgba(255,95,177,0.16), transparent 62%), linear-gradient(180deg, rgba(14,18,36,0.98), rgba(8,10,24,0.99))",
          boxShadow: "0 20px 44px rgba(0,0,0,0.34)",
        }}
      >
        <div style={{ padding: "18px 16px 14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
              gap: 14,
              alignItems: "center",
            }}
          >
            <TeamSide name={teamAName} logo={teamALogoDataUrl} accent={green} side="left" />

            <div
              style={{
                minWidth: 170,
                borderRadius: 22,
                padding: "16px 14px",
                border: "1px solid rgba(255,210,74,0.18)",
                background: "rgba(8,10,18,0.44)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 26px rgba(255,210,74,0.10)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 1000,
                  letterSpacing: 1,
                  color: "rgba(255,255,255,0.72)",
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
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 74, lineHeight: 0.95, fontWeight: 1100, color: green, textShadow: `0 0 20px ${green}66` }}>{scoreA}</span>
                <span style={{ fontSize: 28, lineHeight: 1, fontWeight: 1100, color: "rgba(255,255,255,0.9)" }}>–</span>
                <span style={{ fontSize: 74, lineHeight: 0.95, fontWeight: 1100, color: pink, textShadow: `0 0 20px ${pink}66` }}>{scoreB}</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 1000, color: "rgba(255,255,255,0.90)" }}>
                Score du match
              </div>
            </div>

            <TeamSide name={teamBName} logo={teamBLogoDataUrl} accent={pink} side="right" />
          </div>

          {(handicapA > 0 || handicapB > 0) ? (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {handicapA > 0 ? (
                <span style={{ borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(180,255,57,0.24)", background: "rgba(180,255,57,0.08)", fontSize: 12, fontWeight: 1000 }}>
                  {teamAName} +{handicapA}
                </span>
              ) : null}
              {handicapB > 0 ? (
                <span style={{ borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(255,95,177,0.24)", background: "rgba(255,95,177,0.08)", fontSize: 12, fontWeight: 1000 }}>
                  {teamBName} +{handicapB}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.20)",
            padding: "12px 16px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "rgba(255,255,255,0.90)",
              fontSize: 14,
              fontWeight: 1000,
              textAlign: "center",
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "#9dff57", boxShadow: "0 0 12px rgba(157,255,87,0.45)" }} />
            <span>{footerText}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button type="button" onClick={onAddGoalA} disabled={goalsDisabled} style={actionButton(green, goalsDisabled)}>
          + BUT {teamAName}
        </button>
        <button type="button" onClick={onAddGoalB} disabled={goalsDisabled} style={actionButton(pink, goalsDisabled)}>
          + BUT {teamBName}
        </button>
      </div>
    </div>
  );
}

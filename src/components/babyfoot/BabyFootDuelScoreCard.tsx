import React from "react";

type Props = {
  theme: any;
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
};

function Medallion({ label, logoDataUrl, accent }: { label: string; logoDataUrl?: string | null; accent: string }) {
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 999,
        padding: 3,
        background: `linear-gradient(180deg, ${accent}88, rgba(255,255,255,0.08))`,
        boxShadow: `0 0 18px ${accent}33`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.20))",
          display: "grid",
          placeItems: "center",
        }}
      >
        {logoDataUrl ? (
          <img src={logoDataUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 30, fontWeight: 1100 }}>{label.trim().slice(0, 1).toUpperCase() || "?"}</div>
        )}
      </div>
    </div>
  );
}

function metaPill(label: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.25,
    whiteSpace: "nowrap",
  };
}

export default function BabyFootDuelScoreCard({
  theme,
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
}: Props) {
  const colorA = "#7cffc4";
  const colorB = "#ff82b8";
  const primary = theme?.colors?.primary ?? "#7cffc4";
  const scoreFontSize = Math.max(56, Math.max(String(scoreA).length, String(scoreB).length) >= 2 ? 60 : 66);
  const bottomLabel = setsEnabled ? `Set en cours • objectif ${setTarget}` : `Match en cours • objectif ${target}`;
  const subLabel = setsEnabled ? `Sets ${setsA}–${setsB}` : "Score du match";

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(900px 260px at 0% 0%, rgba(124,255,196,0.11), transparent 42%), radial-gradient(900px 260px at 100% 0%, rgba(255,130,184,0.10), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
        boxShadow: "0 16px 36px rgba(0,0,0,0.30)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div style={{ display: "grid", justifyItems: "center", gap: 7, minWidth: 0 }}>
          <Medallion label={teamAName} logoDataUrl={teamALogoDataUrl} accent={colorA} />
          <div style={{ fontSize: 10, fontWeight: 1000, color: colorA, letterSpacing: 0.9, opacity: 0.92 }}>ÉQUIPE A</div>
          <div
            title={teamAName}
            style={{
              fontSize: 16,
              fontWeight: 1100,
              lineHeight: 1.05,
              textAlign: "center",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {teamAName}
          </div>
        </div>

        <div
          style={{
            minWidth: 152,
            borderRadius: 18,
            padding: "10px 12px",
            border: `1px solid ${primary}55`,
            background: "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.36))",
            boxShadow: `0 0 24px ${primary}22`,
            display: "grid",
            justifyItems: "center",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1.0, opacity: 0.72, textTransform: "uppercase" }}>Score</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, whiteSpace: "nowrap" }}>
            <div
              style={{
                fontSize: scoreFontSize,
                fontWeight: 1100,
                color: colorA,
                textShadow: `0 0 16px ${colorA}55`,
                lineHeight: 0.9,
                minWidth: 42,
                textAlign: "right",
              }}
            >
              {scoreA}
            </div>
            <div style={{ opacity: 0.58, fontWeight: 1000, fontSize: 24 }}>—</div>
            <div
              style={{
                fontSize: scoreFontSize,
                fontWeight: 1100,
                color: colorB,
                textShadow: `0 0 16px ${colorB}55`,
                lineHeight: 0.9,
                minWidth: 42,
                textAlign: "left",
              }}
            >
              {scoreB}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.76 }}>{subLabel}</div>
        </div>

        <div style={{ display: "grid", justifyItems: "center", gap: 7, minWidth: 0 }}>
          <Medallion label={teamBName} logoDataUrl={teamBLogoDataUrl} accent={colorB} />
          <div style={{ fontSize: 10, fontWeight: 1000, color: colorB, letterSpacing: 0.9, opacity: 0.92 }}>ÉQUIPE B</div>
          <div
            title={teamBName}
            style={{
              fontSize: 16,
              fontWeight: 1100,
              lineHeight: 1.05,
              textAlign: "center",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {teamBName}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={metaPill(bottomLabel)}>{bottomLabel}</span>
        {handicapA > 0 ? <span style={metaPill(`${teamAName} +${handicapA}`)}>{teamAName} +{handicapA}</span> : null}
        {handicapB > 0 ? <span style={metaPill(`${teamBName} +${handicapB}`)}>{teamBName} +{handicapB}</span> : null}
      </div>
    </div>
  );
}

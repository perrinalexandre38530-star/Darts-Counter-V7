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
        width: 66,
        height: 66,
        borderRadius: 999,
        padding: 3,
        background: `linear-gradient(180deg, ${accent}88, rgba(255,255,255,0.08))`,
        boxShadow: `0 0 20px ${accent}33`,
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
          <div style={{ fontSize: 26, fontWeight: 1100 }}>{label.trim().slice(0, 1).toUpperCase() || "?"}</div>
        )}
      </div>
    </div>
  );
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
  const colorA = "#9dff57";
  const colorB = "#ffd24a";
  const pink = "#ff82b8";
  const primary = theme?.primary ?? theme?.colors?.primary ?? "#9dff57";
  const objective = setsEnabled ? `Set en cours • objectif ${setTarget}` : `Match en cours • objectif ${target}`;
  const sub = setsEnabled ? `Sets ${setsA}–${setsB}` : "Score du match";

  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(720px 220px at 0% 0%, rgba(157,255,87,0.12), transparent 44%), radial-gradient(720px 220px at 100% 0%, rgba(255,130,184,0.14), transparent 44%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
        boxShadow: "0 18px 30px rgba(0,0,0,0.32)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 0 }}>
            <Medallion label={teamAName} logoDataUrl={teamALogoDataUrl} accent={colorA} />
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: colorA, textTransform: "uppercase" }}>Équipe A</div>
            <div title={teamAName} style={{ fontSize: 16, fontWeight: 1100, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {teamAName}
            </div>
          </div>

          <div
            style={{
              minWidth: 138,
              borderRadius: 16,
              padding: "10px 12px",
              border: `1px solid ${primary}55`,
              background: "linear-gradient(180deg, rgba(0,0,0,0.20), rgba(0,0,0,0.38))",
              boxShadow: `0 0 24px ${primary}22`,
              display: "grid",
              justifyItems: "center",
              gap: 5,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1.1, opacity: 0.74, textTransform: "uppercase" }}>Score</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 58, fontWeight: 1100, color: colorA, textShadow: `0 0 16px ${colorA}55`, lineHeight: 0.92, minWidth: 34, textAlign: "right" }}>{scoreA}</div>
              <div style={{ opacity: 0.52, fontWeight: 1000, fontSize: 22 }}>–</div>
              <div style={{ fontSize: 58, fontWeight: 1100, color: pink, textShadow: `0 0 16px ${pink}55`, lineHeight: 0.92, minWidth: 34, textAlign: "left" }}>{scoreB}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.8 }}>{sub}</div>
          </div>

          <div style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 0 }}>
            <Medallion label={teamBName} logoDataUrl={teamBLogoDataUrl} accent={pink} />
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color: pink, textTransform: "uppercase" }}>Équipe B</div>
            <div title={teamBName} style={{ fontSize: 16, fontWeight: 1100, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {teamBName}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 12px",
          background: "rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.88 }}>{objective}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {handicapA > 0 ? <span style={{ borderRadius: 999, padding: "5px 9px", background: "rgba(157,255,87,0.12)", border: "1px solid rgba(157,255,87,0.20)", fontSize: 11, fontWeight: 1000 }}>{teamAName} +{handicapA}</span> : null}
          {handicapB > 0 ? <span style={{ borderRadius: 999, padding: "5px 9px", background: "rgba(255,130,184,0.12)", border: "1px solid rgba(255,130,184,0.20)", fontSize: 11, fontWeight: 1000 }}>{teamBName} +{handicapB}</span> : null}
        </div>
      </div>
    </div>
  );
}

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
        width: 64,
        height: 64,
        borderRadius: 999,
        padding: 3,
        background: `linear-gradient(180deg, ${accent}88, rgba(255,255,255,0.08))`,
        boxShadow: `0 0 18px ${accent}33`,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.18))",
          display: "grid",
          placeItems: "center",
        }}
      >
        {logoDataUrl ? (
          <img src={logoDataUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 28, fontWeight: 1100 }}>{label.trim().slice(0, 1).toUpperCase() || "?"}</div>
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
  const colorA = "#7cffc4";
  const colorB = "#ff82b8";
  const scoreFontSize = Math.max(40, scoreA > 99 || scoreB > 99 ? 44 : 54);
  const objectiveLabel = setsEnabled ? `Set en cours • objectif ${setTarget}` : `Match en cours • objectif ${target}`;
  const underScoreLabel = setsEnabled ? `Sets ${setsA}–${setsB}` : "Score du match";
  const textSoft = theme?.colors?.textSoft ?? "rgba(255,255,255,0.74)";

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(800px 240px at 0% 0%, rgba(124,255,196,0.10), transparent 42%), radial-gradient(800px 240px at 100% 0%, rgba(255,130,184,0.08), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
        boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 0 }}>
          <Medallion label={teamAName} logoDataUrl={teamALogoDataUrl} accent={colorA} />
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, color: colorA, opacity: 0.92 }}>ÉQUIPE A</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 1100,
              lineHeight: 1.05,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              width: "100%",
            }}
            title={teamAName}
          >
            {teamAName}
          </div>
          {handicapA > 0 ? <div style={{ fontSize: 11, fontWeight: 1000, color: textSoft }}>handicap +{handicapA}</div> : null}
        </div>

        <div
          style={{
            minWidth: 132,
            borderRadius: 18,
            padding: "10px 12px",
            border: `1px solid ${(theme?.colors?.primary ?? "#7cffc4") + "55"}`,
            background: "linear-gradient(180deg, rgba(0,0,0,.16), rgba(0,0,0,.34))",
            boxShadow: `0 0 22px ${(theme?.colors?.primary ?? "#7cffc4") + "22"}`,
            display: "grid",
            placeItems: "center",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.72, textTransform: "uppercase" }}>Score</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
            <div
              style={{
                fontSize: scoreFontSize,
                fontWeight: 1100,
                color: colorA,
                textShadow: `0 0 16px ${colorA}55`,
                lineHeight: 0.95,
                minWidth: 38,
                textAlign: "right",
              }}
            >
              {scoreA}
            </div>
            <div style={{ opacity: 0.6, fontWeight: 1000, fontSize: 20 }}>—</div>
            <div
              style={{
                fontSize: scoreFontSize,
                fontWeight: 1100,
                color: colorB,
                textShadow: `0 0 16px ${colorB}55`,
                lineHeight: 0.95,
                minWidth: 38,
                textAlign: "left",
              }}
            >
              {scoreB}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 1000, color: textSoft, textAlign: "center" }}>{underScoreLabel}</div>
        </div>

        <div style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 0 }}>
          <Medallion label={teamBName} logoDataUrl={teamBLogoDataUrl} accent={colorB} />
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, color: colorB, opacity: 0.92 }}>ÉQUIPE B</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 1100,
              lineHeight: 1.05,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              width: "100%",
            }}
            title={teamBName}
          >
            {teamBName}
          </div>
          {handicapB > 0 ? <div style={{ fontSize: 11, fontWeight: 1000, color: textSoft }}>handicap +{handicapB}</div> : null}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          borderRadius: 14,
          padding: "9px 12px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.18)",
          fontSize: 12,
          fontWeight: 1000,
          color: textSoft,
          textAlign: "center",
        }}
      >
        {objectiveLabel}
      </div>
    </div>
  );
}

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

function TeamLogo({ label, logoDataUrl }: { label: string; logoDataUrl?: string | null }) {
  return logoDataUrl ? (
    <img
      src={logoDataUrl}
      alt={label}
      style={{
        width: 52,
        height: 52,
        objectFit: "cover",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.05)",
        boxShadow: "0 12px 22px rgba(0,0,0,0.28)",
      }}
    />
  ) : (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        display: "grid",
        placeItems: "center",
        fontSize: 22,
        fontWeight: 1100,
        letterSpacing: 0.5,
        boxShadow: "0 12px 22px rgba(0,0,0,0.28)",
      }}
    >
      {label.trim().slice(0, 1).toUpperCase() || "?"}
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
  const labelColor = theme?.colors?.textSoft ?? "rgba(255,255,255,0.72)";
  const liveTargetLabel = setsEnabled ? `Set en cours • objectif ${setTarget}` : `Match en cours • objectif ${target}`;

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(1000px 300px at 50% 0%, rgba(124,255,196,0.10), transparent 50%), radial-gradient(1000px 320px at 50% 100%, rgba(255,130,184,0.08), transparent 50%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.05))",
        boxShadow: "0 22px 54px rgba(0,0,0,0.38)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 12, alignItems: "center" }}>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <TeamLogo label={teamAName} logoDataUrl={teamALogoDataUrl} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.66 }}>ÉQUIPE A</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teamAName}
            </div>
            {handicapA > 0 ? (
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 1000, color: labelColor }}>Handicap +{handicapA}</div>
            ) : null}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 1100,
              letterSpacing: 0.8,
              lineHeight: 1,
              color: theme?.colors?.primary ?? "#7cffc4",
              textShadow: "0 12px 30px rgba(0,0,0,0.42)",
              whiteSpace: "nowrap",
            }}
          >
            {scoreA}–{scoreB}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 1000, color: labelColor, letterSpacing: 0.5 }}>
            {setsEnabled ? `${setsA}–${setsB} sets` : "Score du match"}
          </div>
        </div>

        <div style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          <div style={{ minWidth: 0, textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.66 }}>ÉQUIPE B</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teamBName}
            </div>
            {handicapB > 0 ? (
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 1000, color: labelColor }}>Handicap +{handicapB}</div>
            ) : null}
          </div>
          <TeamLogo label={teamBName} logoDataUrl={teamBLogoDataUrl} />
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: setsEnabled ? "1fr 1fr" : "1fr",
          gap: 10,
        }}
      >
        <div
          style={{
            borderRadius: 16,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.20)",
            fontSize: 12,
            fontWeight: 1000,
            color: labelColor,
          }}
        >
          {liveTargetLabel}
        </div>

        {setsEnabled ? (
          <div
            style={{
              borderRadius: 16,
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.20)",
              fontSize: 12,
              fontWeight: 1000,
              color: labelColor,
              textAlign: "right",
            }}
          >
            Match sets • {setsA}–{setsB}
          </div>
        ) : null}
      </div>
    </div>
  );
}

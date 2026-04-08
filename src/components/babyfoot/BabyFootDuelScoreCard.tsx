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
        width: 42,
        height: 42,
        objectFit: "cover",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.05)",
      }}
    />
  ) : (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        display: "grid",
        placeItems: "center",
        fontSize: 18,
        fontWeight: 1100,
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
  const objectiveLabel = setsEnabled ? `Set en cours • objectif ${setTarget}` : `Match en cours • objectif ${target}`;
  const detailLabel = setsEnabled ? `${setsA}–${setsB} sets` : "Score du match";

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(900px 260px at 50% 0%, rgba(124,255,196,0.10), transparent 46%), radial-gradient(900px 260px at 50% 100%, rgba(255,130,184,0.08), transparent 46%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.05))",
        boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <TeamLogo label={teamAName} logoDataUrl={teamALogoDataUrl} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.62 }}>ÉQUIPE A</div>
            <div style={{ marginTop: 4, fontSize: 16, fontWeight: 1100, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teamAName}
            </div>
            {handicapA > 0 ? <div style={{ marginTop: 4, fontSize: 11, fontWeight: 1000, color: labelColor }}>+{handicapA}</div> : null}
          </div>
        </div>

        <div style={{ minWidth: 88, textAlign: "center" }}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 1100,
              lineHeight: 0.95,
              color: theme?.colors?.primary ?? "#7cffc4",
              whiteSpace: "nowrap",
            }}
          >
            {scoreA}–{scoreB}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 1000, color: labelColor }}>{detailLabel}</div>
        </div>

        <div style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
          <div style={{ minWidth: 0, textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.62 }}>ÉQUIPE B</div>
            <div style={{ marginTop: 4, fontSize: 16, fontWeight: 1100, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teamBName}
            </div>
            {handicapB > 0 ? <div style={{ marginTop: 4, fontSize: 11, fontWeight: 1000, color: labelColor }}>+{handicapB}</div> : null}
          </div>
          <TeamLogo label={teamBName} logoDataUrl={teamBLogoDataUrl} />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          borderRadius: 14,
          padding: "10px 12px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.18)",
          fontSize: 12,
          fontWeight: 1000,
          color: labelColor,
          textAlign: "center",
        }}
      >
        {objectiveLabel}
      </div>
    </div>
  );
}

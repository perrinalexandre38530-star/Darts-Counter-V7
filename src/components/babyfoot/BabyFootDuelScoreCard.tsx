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
  setsBestOf?: number;
  setTarget: number;
  target: number;
  handicapA?: number;
  handicapB?: number;
  onAddGoalA: () => void;
  onAddGoalB: () => void;
  onAddCsc?: () => void;
  goalsDisabled?: boolean;
};

function avatarRing(accent: string, compact = false): React.CSSProperties {
  const size = compact ? 66 : 74;
  return {
    width: size,
    height: size,
    borderRadius: 999,
    padding: 3,
    background: `linear-gradient(180deg, ${accent}cc, ${accent}2a)`,
    boxShadow: `0 0 18px ${accent}36`,
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
    minHeight: 50,
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

function SetDots({ won, count, accent, align }: { won: number; count: number; accent: string; align: "left" | "right" }) {
  return (
    <div style={{ display: "flex", justifyContent: align === "left" ? "flex-start" : "flex-end", gap: 7, minHeight: 14 }}>
      {Array.from({ length: Math.max(1, count) }).map((_, index) => {
        const active = index < won;
        return (
          <span
            key={index}
            style={{
              width: 11,
              height: 11,
              borderRadius: 999,
              border: `1px solid ${active ? accent : "rgba(255,255,255,0.22)"}`,
              background: active ? accent : "rgba(255,255,255,0.04)",
              boxShadow: active ? `0 0 12px ${accent}66` : "none",
              opacity: active ? 1 : 0.72,
            }}
          />
        );
      })}
    </div>
  );
}

function SideBlock({ visual, accent, align, setsEnabled, setsWon, setsToWin }: { visual: SideVisual; accent: string; align: "left" | "right"; setsEnabled: boolean; setsWon: number; setsToWin: number }) {
  const compact = (visual.name || "").length > 13;
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
            <div style={{ fontSize: compact ? 30 : 34, fontWeight: 1100 }}>{visual.name.trim().slice(0, 1).toUpperCase() || "?"}</div>
          )}
        </div>
      </div>
      <div
        title={visual.name}
        style={{
          fontSize: compact ? 15 : 17,
          lineHeight: 1.05,
          fontWeight: 1100,
          color: accent,
          textShadow: `0 0 12px ${accent}22`,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 136,
        }}
      >
        {visual.name}
      </div>
      {setsEnabled ? <SetDots won={setsWon} count={setsToWin} accent={accent} align={align} /> : null}
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
  setsBestOf = 3,
  setTarget,
  target,
  handicapA = 0,
  handicapB = 0,
  onAddGoalA,
  onAddGoalB,
  onAddCsc,
  goalsDisabled = false,
}: Props) {
  const green = "#c7ff26";
  const pink = "#ff59b0";
  const setsToWin = Math.max(1, Math.ceil((setsBestOf || 1) / 2));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          borderRadius: 26,
          overflow: "hidden",
          border: "1px solid rgba(120,150,255,0.14)",
          background:
            "radial-gradient(260px 160px at 16% 34%, rgba(199,255,38,0.18), transparent 70%), radial-gradient(260px 160px at 84% 34%, rgba(255,89,176,0.18), transparent 70%), linear-gradient(180deg, rgba(13,17,34,0.98), rgba(7,9,22,0.99))",
          boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
        }}
      >
        <div style={{ padding: "14px 14px 13px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(82px,1fr) auto minmax(82px,1fr)",
              gap: 10,
              alignItems: "center",
            }}
          >
            <SideBlock visual={visualA} accent={green} align="left" setsEnabled={setsEnabled} setsWon={setsA} setsToWin={setsToWin} />

            <div
              style={{
                minWidth: 112,
                borderRadius: 20,
                padding: "10px 9px",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(8,10,18,0.42)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
                <span style={{ fontSize: 56, lineHeight: 0.95, fontWeight: 1100, color: green, textShadow: `0 0 18px ${green}66` }}>{scoreA}</span>
                <span style={{ fontSize: 23, lineHeight: 1, fontWeight: 1100, color: "rgba(255,255,255,0.92)" }}>–</span>
                <span style={{ fontSize: 56, lineHeight: 0.95, fontWeight: 1100, color: pink, textShadow: `0 0 18px ${pink}66` }}>{scoreB}</span>
              </div>
            </div>

            <SideBlock visual={visualB} accent={pink} align="right" setsEnabled={setsEnabled} setsWon={setsB} setsToWin={setsToWin} />
          </div>

          {(handicapA > 0 || handicapB > 0) ? (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {handicapA > 0 ? (
                <span style={{ borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(199,255,38,0.24)", background: "rgba(199,255,38,0.08)", fontSize: 12, fontWeight: 1000 }}>
                  {visualA.name} Hcap {handicapA}
                </span>
              ) : null}
              {handicapB > 0 ? (
                <span style={{ borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(255,89,176,0.24)", background: "rgba(255,89,176,0.08)", fontSize: 12, fontWeight: 1000 }}>
                  {visualB.name} Hcap {handicapB}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: 10, alignItems: "stretch" }}>
        <button type="button" onClick={onAddGoalA} disabled={goalsDisabled} style={scoreAction(green, goalsDisabled)}>
          + BUT {visualA.name}
        </button>
        <button
          type="button"
          onClick={onAddCsc}
          disabled={goalsDisabled || !onAddCsc}
          style={{ ...scoreAction("#ff4f6d", goalsDisabled || !onAddCsc), width: 72, padding: "0 10px" }}
          title="But contre son camp"
        >
          CSC
        </button>
        <button type="button" onClick={onAddGoalB} disabled={goalsDisabled} style={scoreAction(pink, goalsDisabled)}>
          + BUT {visualB.name}
        </button>
      </div>
    </div>
  );
}

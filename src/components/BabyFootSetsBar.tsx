import React from "react";

type Props = {
  setsA: number;
  setsB: number;
  bestOf: number;
  currentSet?: number;
  teamAName?: string;
  teamBName?: string;
};

function chip(label: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "5px 9px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.3,
    whiteSpace: "nowrap",
  };
}

export default function BabyFootSetsBar({
  setsA,
  setsB,
  bestOf,
  currentSet = 1,
  teamAName = "Équipe A",
  teamBName = "Équipe B",
}: Props) {
  const total = Math.max(1, bestOf);
  const needed = Math.floor(total / 2) + 1;
  const safeSetsA = Math.max(0, setsA);
  const safeSetsB = Math.max(0, setsB);
  const activeIndex = Math.max(0, Math.min(total - 1, currentSet - 1));
  const completed = safeSetsA + safeSetsB;

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
        boxShadow: "0 12px 30px rgba(0,0,0,0.24)",
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
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 1000, opacity: 0.64, letterSpacing: 0.8 }}>SETS A</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 15,
              fontWeight: 1100,
              color: "#7cffc4",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={teamAName}
          >
            {teamAName}
          </div>
        </div>

        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 1000, opacity: 0.64, letterSpacing: 0.8 }}>X01 STYLE</div>
          <div style={{ marginTop: 2, fontSize: 22, fontWeight: 1100, lineHeight: 1 }}>{safeSetsA}–{safeSetsB}</div>
        </div>

        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 1000, opacity: 0.64, letterSpacing: 0.8 }}>SETS B</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 15,
              fontWeight: 1100,
              color: "#ff82b8",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={teamBName}
          >
            {teamBName}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        <span style={chip(`BO${total}`)}>BO{total}</span>
        <span style={chip(`win ${needed}`)}>win {needed}</span>
        <span style={chip(`Set ${Math.min(total, Math.max(1, currentSet))}/${total}`)}>
          Set {Math.min(total, Math.max(1, currentSet))}/{total}
        </span>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: `repeat(${total}, minmax(0,1fr))`, gap: 6 }}>
        {Array.from({ length: total }).map((_, index) => {
          const filledByA = index < safeSetsA;
          const filledByB = index >= total - safeSetsB;
          const isActive = index === activeIndex && !filledByA && !filledByB && completed < total;
          return (
            <div
              key={index}
              style={{
                height: 12,
                borderRadius: 999,
                border: isActive ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(255,255,255,0.10)",
                background: filledByA
                  ? "linear-gradient(180deg, rgba(124,255,196,0.48), rgba(124,255,196,0.14))"
                  : filledByB
                  ? "linear-gradient(180deg, rgba(255,130,184,0.48), rgba(255,130,184,0.14))"
                  : isActive
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(255,255,255,0.05)",
                boxShadow: filledByA
                  ? "0 0 10px rgba(124,255,196,0.20)"
                  : filledByB
                  ? "0 0 10px rgba(255,130,184,0.20)"
                  : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

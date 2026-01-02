// ============================================================
// src/components/stats/x01multi/X01MultiStatsKPIs.tsx
// KPI Carrousels X01 MULTI — style TrainingX01 diamant
// ============================================================

import React from "react";
import type { UIDart } from "../../../lib/types";

const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
};

export type X01MatchExtract = {
  id: string;
  t: number;
  avg3: number;
  bv: number;
  bco: number;
  result: "W" | "L" | "?";
  darts: UIDart[];
};

type Props = {
  matches: X01MatchExtract[];
};

export default function X01MultiStatsKPIs({ matches }: Props) {
  const total = matches.length;
  const wins = matches.filter((m) => m.result === "W").length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const globalAvg3 =
    total > 0
      ? matches.reduce((s, x) => s + (x.avg3 || 0), 0) / total
      : 0;

  const bestVisit = matches.reduce(
    (m, x) => (x.bv > m ? x.bv : m),
    0
  );

  const bestCo = matches.reduce(
    (m, x) => (x.bco > m ? x.bco : m),
    0
  );

  const allDarts: UIDart[] = [];
  for (const m of matches) if (m.darts) allDarts.push(...m.darts);

  let gS = 0,
    gD = 0,
    gT = 0,
    gMiss = 0;

  for (const d of allDarts) {
    const v = Number(d.v || 0);
    const mult = Number(d.mult || 0);

    if (v <= 0 || mult === 0) gMiss++;
    else if (mult === 1) gS++;
    else if (mult === 2) gD++;
    else if (mult === 3) gT++;
  }

  const totalThrows = gS + gD + gT + gMiss;
  const totalHits = gS + gD + gT;

  const pctHits = totalThrows > 0 ? (totalHits / totalThrows) * 100 : 0;
  const pctS = totalHits > 0 ? (gS / totalHits) * 100 : 0;
  const pctD = totalHits > 0 ? (gD / totalHits) * 100 : 0;
  const pctT = totalHits > 0 ? (gT / totalHits) * 100 : 0;
  const pctMiss = totalThrows > 0 ? (gMiss / totalThrows) * 100 : 0;

  const box: React.CSSProperties = {
    borderRadius: 22,
    padding: 10,
    textAlign: "center",
    background: "linear-gradient(180deg,#15171B,#101115)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 0 14px rgba(255,255,255,.12)",
  };

  const label: React.CSSProperties = {
    fontSize: 10,
    color: T.text70,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };

  const value: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
    marginTop: 4,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Cumul + Moyennes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {/* CUMUL */}
        <div style={{ ...box, borderColor: "#47B5FF" }}>
          <div style={{ ...label, color: "#47B5FF" }}>Cumul</div>

          <KPI label="Matchs" value={total} color="#47B5FF" />
          <KPI label="Victoires" value={wins} color="#47B5FF" />
          <KPI label="Hits S" value={gS} color="#47B5FF" />
          <KPI label="Hits D" value={gD} color="#47B5FF" />
          <KPI label="Hits T" value={gT} color="#47B5FF" />
          <KPI label="Miss" value={gMiss} color="#47B5FF" />
        </div>

        {/* MOYENNES */}
        <div style={{ ...box, borderColor: "#FF6FB5" }}>
          <div style={{ ...label, color: "#FF6FB5" }}>Moyennes</div>

          <KPI
            label="Moy.3D"
            value={globalAvg3.toFixed(1)}
            color="#FFB8DE"
          />
          <KPI
            label="Winrate"
            value={winRate.toFixed(1) + "%"}
            color="#FFB8DE"
          />
          <KPI
            label="Hits / match"
            value={total > 0 ? (totalHits / total).toFixed(1) : "0"}
            color="#FFB8DE"
          />
          <KPI
            label="%Hits"
            value={pctHits.toFixed(1) + "%"}
            color="#FFB8DE"
          />
        </div>
      </div>

      {/* Records + Pourcentages */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {/* RECORDS */}
        <div style={{ ...box, borderColor: T.gold }}>
          <div style={{ ...label, color: T.gold }}>Records</div>

          <KPI label="Best Visit" value={bestVisit} color={T.gold} />
          <KPI label="Best Checkout" value={bestCo} color={T.gold} />
        </div>

        {/* % */}
        <div style={{ ...box, borderColor: "#7CFF9A" }}>
          <div style={{ ...label, color: "#7CFF9A" }}>Pourcentages</div>

          <KPI label="%S" value={pctS.toFixed(1) + "%"} color="#E5FFEF" />
          <KPI label="%D" value={pctD.toFixed(1) + "%"} color="#E5FFEF" />
          <KPI label="%T" value={pctT.toFixed(1) + "%"} color="#E5FFEF" />
          <KPI label="%Miss" value={pctMiss.toFixed(1) + "%"} color="#E5FFEF" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Small KPI Component ---------- */
function KPI({
  label,
  value,
  color,
}: {
  label: string;
  value: any;
  color: string;
}) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, color: T.text70 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

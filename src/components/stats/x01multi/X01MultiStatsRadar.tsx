// ============================================================
// src/components/stats/x01multi/X01MultiStatsRadar.tsx
// RADAR DE PRÉCISION — clone TrainingX01 (adapté X01 MULTI)
// ============================================================

import React from "react";
import TrainingRadar from "../../TrainingRadar";
import type { UIDart } from "../../../lib/types";

const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  card: "linear-gradient(180deg,#111218,.94,#0D0E11,.92)",
  edge: "rgba(255,255,255,.10)",
};

const goldNeon: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  textTransform: "uppercase",
  color: T.gold,
  letterSpacing: 0.7,
  textShadow: "0 0 10px rgba(246,194,86,.9)",
};

const card: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 14,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};

export type X01MatchExtract = {
  avg3: number;
  bv: number;
  bco: number;
  darts: UIDart[];
};

type Props = {
  matches: X01MatchExtract[];
};

export default function X01MultiStatsRadar({ matches }: Props) {
  // -------------------------------
  // AGRÉGATION BV / CO / AVG
  // -------------------------------
  const radarAgg = React.useMemo(() => {
    let BV = 0,
      CO = 0,
      AVG = 0,
      n = matches.length;

    if (n === 0)
      return { BV: 0, CO: 0, AVG: 0 };

    for (const m of matches) {
      BV += m.bv || 0;
      CO += m.bco || 0;
      AVG += m.avg3 || 0;
    }

    return {
      BV: BV / n,
      CO: CO / n,
      AVG: AVG / n,
    };
  }, [matches]);

  // -------------------------------
  // DARTS pour le radar
  // -------------------------------
  const allDarts: UIDart[] = React.useMemo(() => {
    const arr: UIDart[] = [];
    for (const m of matches) {
      if (Array.isArray(m.darts)) {
        for (const d of m.darts) {
          const v = Number(d.v ?? d.value ?? d.segment ?? 0);
          const mult = Number(d.mult ?? d.multiplier ?? 0);
          arr.push({ v, mult });
        }
      }
    }
    return arr;
  }, [matches]);

  return (
    <div style={card}>
      {/* TITRE */}
      <div style={goldNeon}>Radar de précision</div>

      {/* RADAR EXACTE VERSION TRAINING */}
      <div style={{ marginTop: 6 }}>
        <TrainingRadar
          x01={[
            { label: "BV", value: radarAgg.BV },
            { label: "CO", value: radarAgg.CO },
            { label: "AVG", value: radarAgg.AVG },
          ]}
          clock={[]}      // pas utilisé ici
          darts={allDarts}
          height={220}
        />
      </div>
    </div>
  );
}

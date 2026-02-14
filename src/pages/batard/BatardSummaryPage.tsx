// @ts-nocheck
// =============================================================
// src/pages/batard/BatardSummaryPage.tsx
// BATARD — Summary (minimal, stable)
// =============================================================
import * as React from "react";
import BackDot from "../../components/BackDot";

type Props = {
  store: any;
  go: (tab: any, params?: any) => void;
  params?: any;
};

export default function BatardSummaryPage(props: Props) {
  const { go, params } = props;
  const match = params?.match;

  const results = (match?.results || []).slice().sort((a: any, b: any) => (b.score||0)-(a.score||0));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BackDot onClick={() => go("games")} />
        <div style={{ fontWeight: 900 }}>BATARD — Résumé</div>
        <div style={{ width: 44 }} />
      </div>

      <div style={{ marginTop: 14, padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ opacity: 0.7, fontSize: 12 }}>Vainqueur</div>
        <div style={{ fontWeight: 900, fontSize: 20 }}>{match?.winnerId || "-"}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        {results.map((r: any, i: number) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: 12, borderRadius: 14, marginTop: 8, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 900 }}>{i + 1}. {r.id}</div>
            <div style={{ fontWeight: 900 }}>{r.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

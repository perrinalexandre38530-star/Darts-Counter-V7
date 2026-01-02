// ============================================
// src/pages/CricketEndModal.tsx
// Cricket — FIN DE PARTIE (résumé + stats clean)
// ============================================

import React from "react";
import type { CricketState } from "../lib/cricketEngine";

const T = {
  gold: "#F6C256",
  borderSoft: "rgba(255,255,255,0.10)",
  textSoft: "rgba(255,255,255,0.75)",
};

type Props = {
  open: boolean;
  state: CricketState;
  onPrimary: () => void; // save & quit (via parent)
  onSecondary: () => void; // replay/new leg (via parent)
  onClose: () => void; // just close
};

function sumMarks(p: any): number {
  const m = p?.marks || {};
  return [15, 16, 17, 18, 19, 20, 25].reduce((acc, k) => acc + (m[k] ?? 0), 0);
}

function bestVisitMarksFromHits(hits: any[]): number {
  if (!Array.isArray(hits) || !hits.length) return 0;
  const map = new Map<number, number>();
  for (const h of hits) {
    const v = Number(h.visitIndex ?? 0);
    const m = Number(h.marksApplied ?? 0);
    map.set(v, (map.get(v) ?? 0) + m);
  }
  let best = 0;
  map.forEach((v) => (best = Math.max(best, v)));
  return best;
}

export default function CricketEndModal({ open, state, onPrimary, onSecondary, onClose }: Props) {
  if (!open) return null;

  const winner = state.players.find((p) => p.id === state.winnerId) ?? null;

  const rows = [...state.players]
    .map((p) => {
      const hits = Array.isArray(p.hits) ? p.hits : [];
      const darts = hits.length;
      const visits = darts ? Math.ceil(darts / 3) : 0;
      const marks = sumMarks(p);
      const mpr = visits ? marks / visits : 0;
      const hitRate = darts
        ? hits.filter((h) => h?.ring !== "MISS").length / darts
        : 0;
      const scoringRate = darts
        ? hits.filter((h) => Number(h?.scoredPoints ?? 0) > 0).length / darts
        : 0;

      return {
        id: p.id,
        name: p.name,
        score: p.score ?? 0,
        marks,
        darts,
        visits,
        mpr,
        hitRate,
        scoringRate,
        bestVisit: bestVisitMarksFromHits(hits),
      };
    })
    .sort((a, b) => (b.score - a.score) || (b.marks - a.marks));

  const reason =
    state.endReason === "maxRounds"
      ? `Fin au max tours (${state.roundNumber}/${state.maxRounds})`
      : "Fermeture complète";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          border: `1px solid ${T.borderSoft}`,
          background: "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(3,7,18,0.98))",
          boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
          padding: 16,
          color: "#fff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: T.textSoft, letterSpacing: 1, textTransform: "uppercase" }}>
            Fin de partie • {reason}
          </div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000, color: T.gold, textShadow: "0 0 18px rgba(246,194,86,0.35)" }}>
            {winner ? `${winner.name} gagne !` : "Terminé"}
          </div>
        </div>

        {/* TABLE */}
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${T.borderSoft}` }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr .7fr .7fr .7fr .7fr",
              gap: 8,
              padding: "8px 10px",
              fontSize: 11,
              color: T.textSoft,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <div>Joueur</div>
            <div style={{ textAlign: "right" }}>Pts</div>
            <div style={{ textAlign: "right" }}>Marks</div>
            <div style={{ textAlign: "right" }}>MPR</div>
            <div style={{ textAlign: "right" }}>Best</div>
          </div>

          {rows.map((r) => {
            const isWinner = r.id === state.winnerId;
            return (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr .7fr .7fr .7fr .7fr",
                  gap: 8,
                  padding: "9px 10px",
                  borderTop: `1px solid ${T.borderSoft}`,
                  background: isWinner ? "rgba(246,194,86,0.10)" : "transparent",
                }}
              >
                <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                  {isWinner ? <span style={{ marginLeft: 8, color: T.gold }}>★</span> : null}
                </div>
                <div style={{ textAlign: "right", fontWeight: 900 }}>{r.score}</div>
                <div style={{ textAlign: "right", fontWeight: 900 }}>{r.marks}</div>
                <div style={{ textAlign: "right", fontWeight: 900 }}>{r.mpr.toFixed(2)}</div>
                <div style={{ textAlign: "right", fontWeight: 900 }}>{r.bestVisit}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: T.textSoft, display: "grid", gap: 4 }}>
          <div>• Hit rate = touches (non MISS) / fléchettes</div>
          <div>• Scoring rate = fléchettes qui ont marqué des points / fléchettes</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            type="button"
            onClick={onSecondary}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 999,
              border: `1px solid ${T.borderSoft}`,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 1000,
              letterSpacing: 1,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Rejouer
          </button>

          <button
            type="button"
            onClick={onPrimary}
            style={{
              flex: 1.1,
              padding: "12px 14px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg,#ffc63a,#ffaf00)",
              color: "#211500",
              fontWeight: 1100,
              letterSpacing: 1,
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 0 18px rgba(240,177,42,.28)",
            }}
          >
            Sauvegarder & Quitter
          </button>
        </div>
      </div>
    </div>
  );
}

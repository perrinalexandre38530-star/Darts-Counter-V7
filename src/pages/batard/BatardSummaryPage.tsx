// @ts-nocheck
// =============================================================
// src/pages/batard/BatardSummaryPage.tsx
// BATARD — Summary (stable)
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

  const results = (match?.results || [])
    .slice()
    .sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BackDot onClick={() => go("games")} />
        <div style={{ fontWeight: 900, fontSize: 18 }}>Résumé — BÂTARD</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ marginTop: 14, opacity: 0.85, fontSize: 13 }}>
        {match?.config?.batard?.label ? (
          <div>
            Preset: <b>{match.config.batard.label}</b> — winMode: <b>{match.config.batard.winMode}</b>
          </div>
        ) : (
          <div>Preset: (non défini)</div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        {results.map((r: any, i: number) => (
          <div
            key={r.id || i}
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.18)",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                #{i + 1} {r.id}
              </div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{r.score} pts</div>
            </div>

            {r.stats && (
              <div style={{ marginTop: 8, opacity: 0.9, fontSize: 13, lineHeight: 1.35 }}>
                <div>Turns: {r.stats.turns} — Darts: {r.stats.dartsThrown}</div>
                <div>Valid hits: {r.stats.validHits} — Fails: {r.stats.fails} — Advances: {r.stats.advances}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button className="btn btn-primary" onClick={() => go("games")}>
          Retour jeux
        </button>
        <button className="btn" onClick={() => go("batard_config")}>
          Reconfigurer
        </button>
      </div>
    </div>
  );
}

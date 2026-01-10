// @ts-nocheck
// =============================================================
// src/pages/petanque/PetanqueStatsHistoryPage.tsx
// Historique Pétanque (version simple)
// - UI proche "HistoryPage" darts : titre neon, filtres période, liste
// - Pas de reprise / delete pour l’instant (tu pourras brancher ensuite)
// =============================================================

import React from "react";
import type { Store } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { PeriodKey, formatDate, getRecTimestamp, inPeriod, isPetanqueRec } from "./petanqueStatsUtils";
import { getScoreAB, getTeams, getPlayers, pickAvatar } from "./petanqueStatsUtils";
import ProfileAvatar from "../../components/ProfileAvatar";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

function Pill({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        border: `1px solid ${active ? "rgba(255,215,60,.42)" : "rgba(255,255,255,.10)"}`,
        background: active ? "rgba(255,215,60,.14)" : "rgba(255,255,255,.06)",
        color: active ? "#ffd73c" : "rgba(255,255,255,.85)",
        fontWeight: 950,
        fontSize: 12,
        letterSpacing: 0.8,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function PetanqueStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [period, setPeriod] = React.useState<PeriodKey>("ALL");

  const profiles = (store?.profiles || []) as any[];

  const list = React.useMemo(() => {
    const all = ((store?.history || []) as any[])
      .filter((r) => isPetanqueRec(r))
      .filter((r) => inPeriod(r, period));

    all.sort((a, b) => (getRecTimestamp(b) || 0) - (getRecTimestamp(a) || 0));
    return all;
  }, [store?.history, period]);

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("stats")} style={{ marginBottom: 10 }}>
        ← Retour
      </button>

      <div
        style={{
          fontSize: 26,
          fontWeight: 950,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: "#ffd73c",
          textShadow: "0 0 18px rgba(255,215,60,.22)",
          lineHeight: 1.05,
        }}
      >
        HISTORIQUE (PÉTANQUE)
      </div>

      <div style={{ marginTop: 6, opacity: 0.85, color: theme.textSoft, fontSize: 12 }}>
        {t("petanque.stats.history.hint", "Historique complet Pétanque. (Reprise / suppression à brancher ensuite)")}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {(["D", "W", "M", "Y", "ALL"] as any[]).map((k) => (
          <Pill key={k} active={period === k} onClick={() => setPeriod(k)}>
            {k === "ALL" ? "TOUT" : k}
          </Pill>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {list.length ? (
          list.map((rec) => {
            const ts = getRecTimestamp(rec) || Date.now();
            const { mode, teamA, teamB, ffa } = getTeams(rec);
            const { scoreA, scoreB } = getScoreAB(rec);
            const players = getPlayers(rec);

            const title =
              mode === "teams"
                ? `${(teamA || []).map((p: any) => p?.name).filter(Boolean).join(" · ")}  vs  ${(teamB || []).map((p: any) => p?.name).filter(Boolean).join(" · ")}`
                : `${(ffa || players || []).map((p: any) => p?.name).filter(Boolean).join(" · ")}`;

            return (
              <div
                key={String(rec?.id ?? `${ts}-${Math.random()}`)}
                style={{
                  background: "rgba(15,15,18,.55)",
                  border: "1px solid rgba(255, 215, 60, .18)",
                  borderRadius: 14,
                  padding: 12,
                  boxShadow: "0 0 18px rgba(255, 215, 60, .10)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 950, color: "#fff" }}>{formatDate(ts)}</div>
                  {mode === "teams" ? (
                    <div style={{ fontWeight: 950, color: "#ffd73c" }}>
                      {scoreA} - {scoreB}
                    </div>
                  ) : (
                    <div style={{ fontWeight: 900, opacity: 0.85 }}>FFA</div>
                  )}
                </div>

                <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12, lineHeight: 1.25 }}>{title || "—"}</div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {(players || []).slice(0, 6).map((p: any, idx: number) => {
                    const pid = String(p?.id ?? p?.profileId ?? "");
                    const prof = profiles.find((x) => String(x?.id) === pid) || null;
                    const av = pickAvatar(p) || pickAvatar(prof) || null;
                    return <ProfileAvatar key={idx} size={34} url={av} name={p?.name || prof?.name || ""} />;
                  })}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={() => go("petanque_stats_matches", { matchId: rec?.id })}
                    style={{
                      borderRadius: 999,
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(255,255,255,.06)",
                      color: "rgba(255,255,255,.9)",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Détails (à enrichir)
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              background: "rgba(15,15,18,.55)",
              border: "1px solid rgba(255, 215, 60, .18)",
              borderRadius: 14,
              padding: 12,
              boxShadow: "0 0 18px rgba(255, 215, 60, .10)",
            }}
          >
            <div style={{ fontWeight: 900 }}>Aucun match Pétanque sur cette période.</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
              Joue des matchs Pétanque puis reviens ici.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
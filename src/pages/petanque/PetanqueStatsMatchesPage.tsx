// @ts-nocheck
// =============================================================
// src/pages/petanque/PetanqueStatsMatchesPage.tsx
// Liste des matchs Pétanque (filtrable playerId / teamKey)
// - UI list style (cards)
// =============================================================

import React from "react";
import type { Store } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import {
  PeriodKey,
  formatDate,
  getPlayers,
  getRecTimestamp,
  getScoreAB,
  getTeams,
  inPeriod,
  isPetanqueRec,
  pickAvatar,
} from "./petanqueStatsUtils";

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

export default function PetanqueStatsMatchesPage({ store, go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [period, setPeriod] = React.useState<PeriodKey>("ALL");

  const playerId = params?.playerId ? String(params.playerId) : null;
  const teamKey = params?.teamKey ? String(params.teamKey) : null;

  const profiles = (store?.profiles || []) as any[];

  const list = React.useMemo(() => {
    const all = ((store?.history || []) as any[])
      .filter((r) => isPetanqueRec(r))
      .filter((r) => inPeriod(r, period));

    const filtered = all.filter((rec) => {
      if (!playerId && !teamKey) return true;

      const { mode, teamA, teamB, ffa } = getTeams(rec);

      if (playerId) {
        const players = getPlayers(rec);
        const ids = (players || []).map((p: any) => String(p?.id ?? p?.profileId ?? "")).filter(Boolean);
        if (!ids.includes(playerId)) return false;
      }

      if (teamKey) {
        if (mode !== "teams") return false;
        const aIds = (teamA || []).map((p: any) => String(p?.id ?? p?.profileId ?? "")).filter(Boolean).sort().join("|");
        const bIds = (teamB || []).map((p: any) => String(p?.id ?? p?.profileId ?? "")).filter(Boolean).sort().join("|");
        if (aIds !== teamKey && bIds !== teamKey) return false;
      }

      return true;
    });

    // tri date desc
    filtered.sort((a, b) => (getRecTimestamp(b) || 0) - (getRecTimestamp(a) || 0));
    return filtered;
  }, [store?.history, period, playerId, teamKey]);

  const titleSuffix = playerId ? " — joueur" : teamKey ? " — équipe" : "";

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
        MATCHS (PÉTANQUE){titleSuffix}
      </div>

      <div style={{ marginTop: 6, opacity: 0.85, color: theme.textSoft, fontSize: 12 }}>
        {t("petanque.stats.matches.hint", "Liste des matchs Pétanque. Cliquez plus tard pour un détail (à enrichir).")}
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
            const label =
              mode === "teams"
                ? `${(teamA || []).map((p: any) => p?.name || "").filter(Boolean).join(" · ")}  vs  ${(teamB || []).map((p: any) => p?.name || "").filter(Boolean).join(" · ")}`
                : `${(ffa || players || []).map((p: any) => p?.name || "").filter(Boolean).join(" · ")}`;

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

                <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12, lineHeight: 1.25 }}>{label || "—"}</div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {(players || []).slice(0, 6).map((p: any, idx: number) => {
                    const prof = profiles.find((x) => String(x?.id) === String(p?.id ?? p?.profileId ?? ""));
                    const av = pickAvatar(p) || pickAvatar(prof) || null;
                    return <ProfileAvatar key={idx} size={34} url={av} name={p?.name || prof?.name || ""} />;
                  })}
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
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>Lance un match, termine-le, puis reviens ici.</div>
          </div>
        )}
      </div>
    </div>
  );
}
// =============================================================
// src/pages/petanque/PetanqueStatsPlayersPage.tsx
// Stats Pétanque — Joueurs (UI calquée sur Darts Counter)
// - Source : petanqueStore history (localStorage)
// - Ajouts : coéquipier favori, adversaire favori, différentiel points
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import {
  aggregateDuos,
  aggregatePlayers,
  aggregateVs,
  getPetanqueMatches,
  safeName,
} from "../../lib/petanqueStats";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: any;
};

function pct(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

export default function PetanqueStatsPlayersPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<"wins" | "wr" | "diff" | "played">("wr");

  const matches = React.useMemo(() => getPetanqueMatches(), []);
  const playersAgg = React.useMemo(() => aggregatePlayers(matches), [matches]);
  const duosAgg = React.useMemo(() => aggregateDuos(matches), [matches]);
  const vsAgg = React.useMemo(() => aggregateVs(matches), [matches]);

  const list = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = playersAgg;
    if (needle) arr = arr.filter((p) => (p.name || "").toLowerCase().includes(needle));

    const by = (fn: (p: any) => number) => [...arr].sort((a, b) => (fn(b) || 0) - (fn(a) || 0));
    if (sort === "wins") return by((p) => p.wins);
    if (sort === "played") return by((p) => p.played);
    if (sort === "diff") return by((p) => p.diff);
    return by((p) => p.winRate);
  }, [playersAgg, q, sort]);

  const totalMatches = matches.length;
  const totalPlayers = playersAgg.length;

  // Helpers (favoris)
  const favMateByPlayerId = React.useMemo(() => {
    const out = new Map<string, { otherId: string; otherName: string; played: number; winRate: number }>();
    for (const d of duosAgg) {
      const { aId, aName, bId, bName, played, winRate } = d;
      const curA = out.get(aId);
      if (!curA || played > curA.played) out.set(aId, { otherId: bId, otherName: bName, played, winRate });
      const curB = out.get(bId);
      if (!curB || played > curB.played) out.set(bId, { otherId: aId, otherName: aName, played, winRate });
    }
    return out;
  }, [duosAgg]);

  const favOppByPlayerId = React.useMemo(() => {
    const out = new Map<string, { otherId: string; otherName: string; played: number; winRate: number }>();
    for (const v of vsAgg) {
      const { aId, aName, bId, bName, played, winRateA } = v;
      const curA = out.get(aId);
      if (!curA || played > curA.played) out.set(aId, { otherId: bId, otherName: bName, played, winRate: winRateA });
      const curB = out.get(bId);
      // winRate pour B = 1 - winRateA sur les matchs décidés; approx
      const winRateB = Number.isFinite(winRateA) ? 1 - winRateA : 0;
      if (!curB || played > curB.played) out.set(bId, { otherId: aId, otherName: aName, played, winRate: winRateB });
    }
    return out;
  }, [vsAgg]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          onClick={() => go("stats")}
          style={{ background: "transparent", border: "none", color: theme.text, cursor: "pointer", fontWeight: 900 }}
        >
          ← {t("common.back", "Retour")}
        </button>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {t("petanque.stats.players.kpi", "Matchs")}: {totalMatches} · {t("petanque.stats.players.kpi2", "Joueurs")}: {totalPlayers}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 22,
          fontWeight: 1000,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          textAlign: "center",
          color: theme.text,
        }}
      >
        {t("petanque.stats.players.title", "JOUEURS")}
      </div>

      {/* Filters */}
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("common.search", "Rechercher…")}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(0,0,0,.25)",
            color: theme.text,
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {["wr", "wins", "diff", "played"].map((k) => {
            const active = sort === (k as any);
            const label =
              k === "wr"
                ? t("petanque.stats.players.sort.wr", "Winrate")
                : k === "wins"
                ? t("petanque.stats.players.sort.wins", "Victoires")
                : k === "diff"
                ? t("petanque.stats.players.sort.diff", "Diff")
                : t("petanque.stats.players.sort.played", "Matchs");
            return (
              <button
                key={k}
                onClick={() => setSort(k as any)}
                style={{
                  borderRadius: 999,
                  padding: "7px 10px",
                  border: "1px solid rgba(255,255,255,.14)",
                  background: active ? theme.primary : "rgba(0,0,0,.25)",
                  color: active ? "#111" : theme.text,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {list.map((p) => {
          const favMate = favMateByPlayerId.get(p.id);
          const favOpp = favOppByPlayerId.get(p.id);
          const diff = p.diff;

          return (
            <div
              key={p.id}
              style={{
                background: "rgba(0,0,0,.25)",
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 16,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <ProfileAvatar
                  profile={{ id: p.id, name: safeName(p.name), avatarDataUrl: p.avatarDataUrl ?? null } as any}
                  size={44}
                  ringColor={theme.primary}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, letterSpacing: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {safeName(p.name)}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6, fontSize: 12, opacity: 0.92 }}>
                    <span>
                      {t("petanque.stats.players.played", "Matchs")}: <b>{p.played}</b>
                    </span>
                    <span>
                      {t("petanque.stats.players.wins", "V")}: <b>{p.wins}</b>
                    </span>
                    <span>
                      {t("petanque.stats.players.losses", "D")}: <b>{p.losses}</b>
                    </span>
                    <span>
                      {t("petanque.stats.players.winrate", "WR")}: <b>{pct(p.winRate)}</b>
                    </span>
                    <span>
                      {t("petanque.stats.players.diff", "Diff")}: <b>{diff >= 0 ? "+" : ""}{diff}</b>
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 6, marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                <div>
                  {t("petanque.stats.players.favMate", "Coéquipier favori")}: {favMate ? (
                    <b>
                      {safeName(favMate.otherName)} · {favMate.played} {t("petanque.stats.players.games", "matchs")} · {pct(favMate.winRate)}
                    </b>
                  ) : (
                    <span style={{ opacity: 0.75 }}>{t("common.na", "—")}</span>
                  )}
                </div>
                <div>
                  {t("petanque.stats.players.favOpp", "Adversaire favori")}: {favOpp ? (
                    <b>
                      {safeName(favOpp.otherName)} · {favOpp.played} {t("petanque.stats.players.games", "matchs")} · {pct(favOpp.winRate)}
                    </b>
                  ) : (
                    <span style={{ opacity: 0.75 }}>{t("common.na", "—")}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {!list.length ? (
          <div style={{ opacity: 0.8, textAlign: "center", padding: 18 }}>
            {t("petanque.stats.players.empty", "Aucun match Pétanque trouvé. Lance une partie pour remplir les stats.")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

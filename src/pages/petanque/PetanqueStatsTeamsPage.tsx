// =============================================================
// src/pages/petanque/PetanqueStatsTeamsPage.tsx
// Stats Pétanque — Équipes
// - Classements équipes (winrate, diff, points)
// - "Line-up favori" (combinaison la plus jouée)
// - Source : petanqueStore history (localStorage)
// =============================================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import { aggregatePetanqueByTeam, getPetanqueMatches, listPetanquePlayersFromMatches } from "../../lib/petanqueStats";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: any;
};

function pct(n: number) {
  if (!Number.isFinite(n)) return "–";
  return `${Math.round(n * 100)}%`;
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "–";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function pill(theme: any, text: string) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        padding: "4px 8px",
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: "rgba(0,0,0,.25)",
        color: theme.text,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export default function PetanqueStatsTeamsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"winrate" | "wins" | "diff" | "pf">("winrate");

  const matches = useMemo(() => getPetanqueMatches(), []);
  const playersIndex = useMemo(() => listPetanquePlayersFromMatches(matches), [matches]);
  const teams = useMemo(() => aggregatePetanqueByTeam(matches), [matches]);

  const favLineups = useMemo(() => {
    const map = new Map<string, { key: string; count: number; wins: number }>();
    for (const m of matches) {
      for (const side of ["A", "B"] as const) {
        const team = m.teams?.[side];
        const ids = (team?.players || []).map((p: any) => String(p?.id ?? p?.name ?? "").trim()).filter(Boolean);
        if (!ids.length) continue;
        ids.sort();
        const key = ids.join("|");
        const prev = map.get(key) || { key, count: 0, wins: 0 };
        prev.count += 1;
        if (m.winnerTeamId && m.winnerTeamId === side) prev.wins += 1;
        map.set(key, prev);
      }
    }
    return Array.from(map.values())
      .filter((x) => x.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [matches]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = teams.filter((x) => (q ? String(x.name || "").toLowerCase().includes(q) : true));

    const ordered = filtered.slice().sort((a, b) => {
      const ar = a.games > 0 ? a.wins / a.games : 0;
      const br = b.games > 0 ? b.wins / b.games : 0;
      if (sort === "winrate") return br - ar || b.games - a.games;
      if (sort === "wins") return b.wins - a.wins || br - ar;
      if (sort === "diff") return b.diff - a.diff || br - ar;
      return b.pointsFor - a.pointsFor || br - ar;
    });
    return ordered;
  }, [teams, query, sort]);

  const totalGames = useMemo(() => matches.length, [matches]);
  const totalTeams = useMemo(() => teams.length, [teams]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button onClick={() => go("stats")} style={{ border: "none", background: "transparent", color: theme.text, fontWeight: 900 }}>
          ← {t("common.back", "Retour")}
        </button>
        <div style={{ fontWeight: 1000, letterSpacing: 1.4, textTransform: "uppercase" }}>{t("petanque.stats.teams", "Équipes")}</div>
        <div />
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <div style={{ padding: 12, borderRadius: 14, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,.25)" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{t("petanque.stats.matches", "Matchs")}</div>
          <div style={{ fontSize: 22, fontWeight: 1000 }}>{totalGames}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 14, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,.25)" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{t("petanque.stats.teams", "Équipes")}</div>
          <div style={{ fontSize: 22, fontWeight: 1000 }}>{totalTeams}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 14, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,.25)" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{t("petanque.stats.players", "Joueurs")}</div>
          <div style={{ fontSize: 22, fontWeight: 1000 }}>{playersIndex.length}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search", "Rechercher…")}
          style={{
            flex: "1 1 220px",
            padding: "10px 12px",
            borderRadius: 12,
            border: `1px solid ${theme.border}`,
            background: "rgba(0,0,0,.25)",
            color: theme.text,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setSort("winrate")}
            style={{
              borderRadius: 999,
              padding: "8px 10px",
              border: `1px solid ${sort === "winrate" ? theme.primary : theme.border}`,
              background: sort === "winrate" ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.2)",
              color: theme.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Win%
          </button>
          <button
            onClick={() => setSort("wins")}
            style={{
              borderRadius: 999,
              padding: "8px 10px",
              border: `1px solid ${sort === "wins" ? theme.primary : theme.border}`,
              background: sort === "wins" ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.2)",
              color: theme.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Wins
          </button>
          <button
            onClick={() => setSort("diff")}
            style={{
              borderRadius: 999,
              padding: "8px 10px",
              border: `1px solid ${sort === "diff" ? theme.primary : theme.border}`,
              background: sort === "diff" ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.2)",
              color: theme.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Diff
          </button>
          <button
            onClick={() => setSort("pf")}
            style={{
              borderRadius: 999,
              padding: "8px 10px",
              border: `1px solid ${sort === "pf" ? theme.primary : theme.border}`,
              background: sort === "pf" ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.2)",
              color: theme.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            PF
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {list.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 14, border: `1px solid ${theme.border}`, opacity: 0.8 }}>{t("common.empty", "Aucune donnée")}</div>
        ) : (
          list.map((tm, idx) => {
            const wr = tm.games > 0 ? tm.wins / tm.games : 0;
            const name = tm.name || `Équipe ${idx + 1}`;
            const roster = (tm.roster || []).map((id: string) => playersIndex.find((p) => p.id === id)?.name || id).join(" · ");

            return (
              <div
                key={tm.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: `1px solid ${theme.border}`,
                  background: "rgba(0,0,0,.22)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${theme.border}`, display: "grid", placeItems: "center", fontWeight: 1000 }}>
                    {idx + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roster}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {pill(theme, `${tm.wins}-${tm.losses}`)}
                  {pill(theme, `Win ${pct(wr)}`)}
                  {pill(theme, `Diff ${fmt(tm.diff)}`)}
                  {pill(theme, `PF ${fmt(tm.pointsFor)}`)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {favLineups.length ? (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.9, marginBottom: 8 }}>
            {t("petanque.stats.favoriteLineups", "Line-ups favoris")}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {favLineups.map((l) => {
              const ids = l.key.split("|");
              const names = ids.map((id) => playersIndex.find((p) => p.id === id)?.name || id);
              const wr = l.count > 0 ? l.wins / l.count : 0;
              return (
                <div
                  key={l.key}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: `1px solid ${theme.border}`,
                    background: "rgba(0,0,0,.18)",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {ids.slice(0, 6).map((id) => {
                      const p = playersIndex.find((x) => x.id === id);
                      return (
                        <div key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <ProfileAvatar profile={{ id: p?.id || id, name: p?.name || id, avatarDataUrl: p?.avatarDataUrl || null }} size={26} />
                          <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>{p?.name || id}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {pill(theme, `${l.wins}/${l.count}`)}
                    {pill(theme, `Win ${pct(wr)}`)}
                    {pill(theme, `${names.length} joueurs`)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

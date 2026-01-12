// =============================================================
// src/pages/petanque/PetanqueStatsLeaderboardsPage.tsx
// Stats Pétanque — Classements (Players / Teams / Duos)
// UI proche de StatsLeaderboardsPage (Darts Counter)
// Source : petanqueStore history (localStorage)
// =============================================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import {
  aggregatePetanquePlayers,
  aggregatePetanqueTeams,
  computePetanqueDuos,
  getPetanqueMatches,
  type PetanqueDuoStat,
} from "../../lib/petanqueStats";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: { subTab?: "players" | "teams" | "duos" };
};

function chipStyle(theme: any, on: boolean): React.CSSProperties {
  return {
    border: `1px solid ${on ? theme.primary : "rgba(255,255,255,.10)"}`,
    background: on ? "rgba(255,198,58,.14)" : "rgba(255,255,255,.06)",
    color: on ? theme.primary : theme.text,
    borderRadius: 999,
    padding: "7px 10px",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    userSelect: "none",
  };
}

function rowCard(theme: any): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(10,10,10,.32)",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 10,
    boxShadow: "0 14px 30px rgba(0,0,0,.30)",
  };
}

export default function PetanqueStatsLeaderboardsPage({ store, go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const initialSub: any = params?.subTab || "players";
  const [subTab, setSubTab] = useState<"players" | "teams" | "duos">(initialSub);

  const { matches, profilesIndex } = useMemo(() => getPetanqueMatches(store?.profiles || []), [store?.profiles]);
  const playersAgg = useMemo(() => aggregatePetanquePlayers(matches, profilesIndex), [matches, profilesIndex]);
  const teamsAgg = useMemo(() => aggregatePetanqueTeams(matches), [matches]);
  const duosAgg = useMemo(() => computePetanqueDuos(matches, profilesIndex), [matches, profilesIndex]);

  const topPlayers = useMemo(() => {
    const list = Object.values(playersAgg);
    // tri "valeur" : d'abord winrate, puis diff
    return list
      .sort((a, b) => (b.winRate - a.winRate) || (b.diff - a.diff) || (b.wins - a.wins) || (b.matches - a.matches))
      .slice(0, 40);
  }, [playersAgg]);

  const topTeams = useMemo(() => {
    const list = Object.values(teamsAgg);
    return list
      .sort((a, b) => (b.winRate - a.winRate) || (b.diff - a.diff) || (b.wins - a.wins) || (b.matches - a.matches))
      .slice(0, 40);
  }, [teamsAgg]);

  const topDuosByWinRate = useMemo(() => {
    const list: PetanqueDuoStat[] = Object.values(duosAgg);
    return list
      .filter((d) => d.matches >= 3)
      .sort((a, b) => (b.winRate - a.winRate) || (b.wins - a.wins) || (b.matches - a.matches))
      .slice(0, 40);
  }, [duosAgg]);

  const topDuosByMatches = useMemo(() => {
    const list: PetanqueDuoStat[] = Object.values(duosAgg);
    return list
      .sort((a, b) => (b.matches - a.matches) || (b.wins - a.wins) || (b.winRate - a.winRate))
      .slice(0, 40);
  }, [duosAgg]);

  const empty = matches.length === 0;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <button onClick={() => go("stats")} style={{ padding: "8px 10px", borderRadius: 12 }}>
          ←
        </button>
        <div style={{ fontWeight: 1000, letterSpacing: 1.2, color: theme.primary, textTransform: "uppercase" }}>
          {t("petanque.stats.leaderboards", "CLASSEMENTS")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={chipStyle(theme, subTab === "players")} onClick={() => setSubTab("players")}>JOUEURS</div>
        <div style={chipStyle(theme, subTab === "teams")} onClick={() => setSubTab("teams")}>ÉQUIPES</div>
        <div style={chipStyle(theme, subTab === "duos")} onClick={() => setSubTab("duos")}>DUOS</div>
      </div>

      {empty ? (
        <div style={{ opacity: 0.8, padding: 14, border: "1px dashed rgba(255,255,255,.18)", borderRadius: 14 }}>
          Aucune partie Pétanque enregistrée pour le moment.
        </div>
      ) : null}

      {subTab === "players" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={rowCard(theme)}>
            <div style={{ fontWeight: 900, letterSpacing: 0.8 }}>Top joueurs (winrate + diff)</div>
            <div style={{ display: "grid", gap: 8 }}>
              {topPlayers.map((p, idx) => (
                <div
                  key={p.playerId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 52px 1fr auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: "rgba(255,255,255,.04)",
                  }}
                >
                  <div style={{ opacity: 0.9, fontWeight: 900 }}>{idx + 1}</div>
                  <ProfileAvatar size={42} name={p.name} url={(p as any).avatarUrl} dataUrl={(p as any).avatarDataUrl} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>
                      {p.wins}V-{p.losses}D · {Math.round(p.winRate * 100)}% · diff {p.diff >= 0 ? "+" : ""}
                      {p.diff}
                    </div>
                  </div>
                  <div style={{ opacity: 0.85, fontWeight: 900 }}>{p.pointsFor}:{p.pointsAgainst}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {subTab === "teams" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={rowCard(theme)}>
            <div style={{ fontWeight: 900, letterSpacing: 0.8 }}>Top équipes</div>
            <div style={{ display: "grid", gap: 8 }}>
              {topTeams.map((tm, idx) => (
                <div
                  key={tm.teamKey}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: "rgba(255,255,255,.04)",
                  }}
                >
                  <div style={{ opacity: 0.9, fontWeight: 900 }}>{idx + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tm.teamName}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>
                      {tm.wins}V-{tm.losses}D · {Math.round(tm.winRate * 100)}% · diff {tm.diff >= 0 ? "+" : ""}
                      {tm.diff}
                    </div>
                  </div>
                  <div style={{ opacity: 0.85, fontWeight: 900 }}>{tm.pointsFor}:{tm.pointsAgainst}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {subTab === "duos" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={rowCard(theme)}>
            <div style={{ fontWeight: 900, letterSpacing: 0.8 }}>Duos — meilleurs winrate (min 3 matchs)</div>
            <div style={{ display: "grid", gap: 8 }}>
              {topDuosByWinRate.map((d, idx) => (
                <DuoRow key={d.duoKey} theme={theme} idx={idx} d={d} />
              ))}
            </div>
          </div>

          <div style={rowCard(theme)}>
            <div style={{ fontWeight: 900, letterSpacing: 0.8 }}>Duos — les plus joués</div>
            <div style={{ display: "grid", gap: 8 }}>
              {topDuosByMatches.map((d, idx) => (
                <DuoRow key={d.duoKey + "-m"} theme={theme} idx={idx} d={d} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DuoRow({ theme, idx, d }: { theme: any; idx: number; d: PetanqueDuoStat }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 52px 52px 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.04)",
      }}
    >
      <div style={{ opacity: 0.9, fontWeight: 900 }}>{idx + 1}</div>
      <ProfileAvatar size={42} name={d.p1.name} url={(d.p1 as any).avatarUrl} dataUrl={(d.p1 as any).avatarDataUrl} />
      <ProfileAvatar size={42} name={d.p2.name} url={(d.p2 as any).avatarUrl} dataUrl={(d.p2 as any).avatarDataUrl} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {d.p1.name} · {d.p2.name}
        </div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>
          {d.wins}V-{d.losses}D · {Math.round(d.winRate * 100)}% · {d.matches} matchs
        </div>
      </div>
      <div style={{ opacity: 0.9, fontWeight: 900, color: theme.primary }}>{Math.round(d.winRate * 100)}%</div>
    </div>
  );
}

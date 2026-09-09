import React from "react";
import { getEsportsGame } from "../../esports/catalog";
import {
  getTeamSeasonDashboardV8,
  listTeamDivisionEventsV8,
  listTeamSeasonAwardsV8,
  listTeamSeasonHistoryV8,
  listTeamSeasonLeaderboardV8,
  subscribeEsportsNetworkV8,
  type EsportsTeamDivisionEventV8,
  type EsportsTeamSeasonAwardV8,
  type EsportsTeamSeasonHistoryRowV8,
  type EsportsTeamSeasonLeaderboardRowV8,
  type EsportsTeamSeasonOverviewV8,
} from "../../esports/networkV8";

type Props = {
  teamId: string;
  gameId: string;
  teamSize: number;
  panelStyle: React.CSSProperties;
  buttonStyle: (active?: boolean) => React.CSSProperties;
  textSoft: string;
  setToast: (value: string) => void;
  tr: (fr: string, en: string, es: string) => string;
};

const DIVISION_ACCENTS: Record<string, string> = {
  placement: "#facc15", bronze: "#c08457", silver: "#cbd5e1", gold: "#facc15", platinum: "#67e8f9", diamond: "#60a5fa", master: "#a78bfa", grandmaster: "#f472b6", champion: "#fb923c",
};

function migrationMessage(tr: Props["tr"]): string {
  return tr(
    "Migration Supabase E-SPORTS V0.8 requise pour les saisons d'équipe, promotions, trophées et archives.",
    "E-SPORTS V0.8 Supabase migration is required for team seasons, promotions, trophies and archives.",
    "Se requiere la migración Supabase E-SPORTS V0.8 para temporadas, ascensos, trofeos y archivos.",
  );
}

function daysRemaining(endsAt?: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86400000));
}

function pct(wins: number, matches: number): number { return matches > 0 ? Math.round((wins / matches) * 100) : 0; }

function DivisionBadge({ label, id }: { label: string; id: string }) {
  const accent = DIVISION_ACCENTS[id] || "#a78bfa";
  return <span className="esports-v8-division" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}12`, boxShadow: `0 0 18px ${accent}18` }}>{label}</span>;
}

export default function EsportsCompetitiveSeasonsV8({ teamId, gameId, teamSize, panelStyle, buttonStyle, textSoft, setToast, tr }: Props) {
  const [overview, setOverview] = React.useState<EsportsTeamSeasonOverviewV8 | null>(null);
  const [history, setHistory] = React.useState<EsportsTeamSeasonHistoryRowV8[]>([]);
  const [events, setEvents] = React.useState<EsportsTeamDivisionEventV8[]>([]);
  const [awards, setAwards] = React.useState<EsportsTeamSeasonAwardV8[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<EsportsTeamSeasonLeaderboardRowV8[]>([]);
  const [seasonSlug, setSeasonSlug] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const showError = React.useCallback((e: any) => {
    const msg = String(e?.code || "") === "esports_network_v8_migration_required" ? migrationMessage(tr) : String(e?.message || e || "E-SPORTS V0.8 error");
    setError(msg);
    return msg;
  }, [tr]);

  const load = React.useCallback(async () => {
    if (!teamId || !gameId) { setOverview(null); setHistory([]); setEvents([]); setAwards([]); setLeaderboard([]); return; }
    setBusy(true);
    try {
      const [nextOverview, nextHistory, nextEvents, nextAwards] = await Promise.all([
        getTeamSeasonDashboardV8(teamId, gameId, teamSize),
        listTeamSeasonHistoryV8(teamId, gameId, teamSize),
        listTeamDivisionEventsV8(teamId, gameId, teamSize, 30),
        listTeamSeasonAwardsV8(teamId, gameId, teamSize),
      ]);
      const effectiveSlug = seasonSlug || nextOverview?.seasonSlug || "";
      const nextLeaderboard = await listTeamSeasonLeaderboardV8(gameId, teamSize, effectiveSlug || null, 30);
      setOverview(nextOverview); setHistory(nextHistory); setEvents(nextEvents); setAwards(nextAwards); setLeaderboard(nextLeaderboard); setError("");
      if (!seasonSlug && nextOverview?.seasonSlug) setSeasonSlug(nextOverview.seasonSlug);
    } catch (e: any) { showError(e); }
    finally { setBusy(false); }
  }, [teamId, gameId, teamSize, seasonSlug, showError]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => subscribeEsportsNetworkV8(() => void load()), [load]);

  const seasonOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    history.forEach((s) => map.set(s.seasonSlug, s.seasonName));
    if (overview) map.set(overview.seasonSlug, overview.seasonName);
    return [...map.entries()];
  }, [history, overview]);

  const changeSeason = async (slug: string) => {
    setSeasonSlug(slug);
    try { setLeaderboard(await listTeamSeasonLeaderboardV8(gameId, teamSize, slug || null, 30)); }
    catch (e: any) { setToast(showError(e)); }
  };

  const game = getEsportsGame(gameId);
  const days = daysRemaining(overview?.endsAt);
  const placementLeft = overview ? Math.max(0, 5 - overview.placementMatches) : 5;
  const accent = overview ? (DIVISION_ACCENTS[overview.division.division] || "#a78bfa") : "#a78bfa";

  if (!teamId) return <section className="esports-panel esports-v8-root" style={{ ...panelStyle, padding: 14 }}><div className="esports-v8-empty">{tr("Choisis d'abord une équipe TEAM RANKED pour ouvrir son centre de saison.", "Choose a TEAM RANKED squad first to open its season center.", "Elige primero un equipo TEAM RANKED para abrir su centro de temporada.")}</div></section>;

  return <div className="esports-section-stack esports-v8-root">
    <section className="esports-panel esports-v8-hero" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row">
        <div><div className="esports-v8-eyebrow">MULTISPORTS E-SPORTS · V0.8</div><div className="esports-v8-title">🏆 COMPETITIVE SEASONS</div><div className="esports-v8-sub">{game.icon} {game.shortName} · {teamSize}v{teamSize} · {tr("placements, divisions, promotions, palmarès et archives", "placements, divisions, promotions, trophies and archives", "placements, divisiones, ascensos, palmarés y archivos")}</div></div>
        <button type="button" disabled={busy} onClick={() => void load()} style={buttonStyle(false)}>↻ {tr("Actualiser", "Refresh", "Actualizar")}</button>
      </div>
      {error ? <div className="esports-v8-error">{error}</div> : null}
    </section>

    {overview ? <>
      <section className="esports-panel esports-v8-season-card" style={{ ...panelStyle, padding: 14, borderColor: `${accent}35` }}>
        <div className="esports-heading-row"><div><div className="esports-v8-eyebrow">{overview.seasonName}</div><div className="esports-v8-team-name">[{overview.teamTag || "TEAM"}] {overview.teamName}</div></div><DivisionBadge label={overview.division.divisionLabel} id={overview.division.division}/></div>
        <div className="esports-v8-kpi-grid">
          <div><span>MMR</span><strong>{overview.rating}</strong><small>Peak {overview.peakRating}</small></div>
          <div><span>{tr("MATCHS", "MATCHES", "PARTIDAS")}</span><strong>{overview.matches}</strong><small>{overview.wins}W · {overview.losses}L · {overview.draws}D</small></div>
          <div><span>WIN RATE</span><strong>{overview.winRate || pct(overview.wins, overview.matches)}%</strong><small>Streak {overview.streak >= 0 ? "+" : ""}{overview.streak}</small></div>
          <div><span>{overview.placementMatches < 5 ? tr("PLACEMENT", "PLACEMENT", "PLACEMENT") : tr("SAISON", "SEASON", "TEMPORADA")}</span><strong>{overview.placementMatches < 5 ? `${overview.placementMatches}/5` : (days == null ? "LIVE" : `${days}j`)}</strong><small>{overview.placementMatches < 5 ? tr(`${placementLeft} restant(s)`, `${placementLeft} remaining`, `${placementLeft} restantes`) : tr("avant clôture", "until close", "hasta cierre")}</small></div>
        </div>
        <div className="esports-v8-progress-wrap"><div className="esports-v8-progress-head"><span>{overview.placementMatches < 5 ? tr("Progression placements", "Placement progress", "Progreso placements") : `${overview.division.divisionLabel} → ${overview.division.nextDivision || "MAX"}`}</span><strong>{overview.division.progressPercent}%</strong></div><div className="esports-v8-progress"><i style={{ width: `${overview.division.progressPercent}%`, background: accent, boxShadow: `0 0 16px ${accent}` }}/></div></div>
        <div className="esports-v8-form"><strong>{tr("FORME RÉCENTE", "RECENT FORM", "FORMA RECIENTE")}</strong><div>{overview.recentForm.length ? overview.recentForm.map((r, i) => <span key={`${r}-${i}`} className={`is-${r.toLowerCase()}`}>{r}</span>) : <em>—</em>}</div></div>
      </section>

      <section className="esports-v8-two-col">
        <div className="esports-panel" style={{ ...panelStyle, padding: 14 }}><div className="esports-v8-section-title">⭐ {tr("MVP DE SAISON", "SEASON MVP", "MVP DE TEMPORADA")}</div>{overview.mvp ? <div className="esports-v8-mvp"><div className="esports-v8-mvp-avatar">{overview.mvp.avatarUrl ? <img src={overview.mvp.avatarUrl} alt=""/> : "🎮"}</div><div><strong>{overview.mvp.displayName}</strong><span>MMR {overview.mvp.rating} · Peak {overview.mvp.peakRating}</span><span>{overview.mvp.wins}W · {overview.mvp.losses}L · {overview.mvp.draws}D</span></div></div> : <div className="esports-v8-empty">{tr("Le MVP apparaîtra après les premiers matchs classés.", "MVP appears after the first ranked matches.", "El MVP aparecerá tras las primeras partidas ranked.")}</div>}</div>
        <div className="esports-panel" style={{ ...panelStyle, padding: 14 }}><div className="esports-v8-section-title">📊 {tr("PAR MODE", "BY MODE", "POR MODO")}</div><div className="esports-v8-mode-list">{overview.modeStats.length ? overview.modeStats.map((m) => <div key={m.mode}><strong>{m.mode}</strong><span>{m.matches} · {m.wins}W/{m.losses}L/{m.draws}D</span><b>{m.winRate}%</b></div>) : <div className="esports-v8-empty">—</div>}</div></div>
      </section>
    </> : null}

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-v8-section-title">🚀 {tr("PROMOTIONS / RELÉGATIONS", "PROMOTIONS / RELEGATIONS", "ASCENSOS / DESCENSOS")}</div>
      <div className="esports-v8-event-list">{events.length ? events.slice(0, 12).map((e) => <div key={e.id} className={`is-${e.direction}`}><strong>{e.direction === "promotion" ? "↑" : "↓"} {e.fromDivision.toUpperCase()} → {e.toDivision.toUpperCase()}</strong><span>{e.ratingBefore} → {e.ratingAfter}</span><small>{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ""}</small></div>) : <div className="esports-v8-empty">{tr("Aucun changement de division pour le moment.", "No division change yet.", "Aún no hay cambios de división.")}</div>}</div>
    </section>

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-v8-section-title">🏅 {tr("TROPHÉES & PALMARÈS", "TROPHIES & HONOURS", "TROFEOS Y PALMARÉS")}</div>
      <div className="esports-v8-award-grid">{awards.length ? awards.map((a) => <div key={a.id}><span>{a.awardType === "champion" ? "🏆" : a.awardType === "runner_up" ? "🥈" : a.awardType === "third_place" ? "🥉" : a.awardType === "season_mvp" ? "⭐" : "🎖"}</span><strong>{a.title}</strong><small>{a.seasonName}{a.displayName ? ` · ${a.displayName}` : ""}</small></div>) : <div className="esports-v8-empty">{tr("Les trophées sont attribués à la clôture officielle d'une saison.", "Trophies are awarded when a season is officially finalized.", "Los trofeos se otorgan al cierre oficial de una temporada.")}</div>}</div>
    </section>

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div className="esports-v8-section-title">🗓 {tr("HISTORIQUE DES SAISONS", "SEASON HISTORY", "HISTORIAL DE TEMPORADAS")}</div>{seasonOptions.length ? <select className="esports-v8-season-select" value={seasonSlug} onChange={(e) => void changeSeason(e.target.value)}>{seasonOptions.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select> : null}</div>
      <div className="esports-v8-history-grid">{history.length ? history.map((s) => <div key={s.seasonId} className={s.active ? "is-active" : ""}><div className="esports-heading-row"><strong>{s.seasonName}</strong><DivisionBadge label={s.division.divisionLabel} id={s.division.division}/></div><div className="esports-v8-history-kpis"><span>MMR <b>{s.rating}</b></span><span>Peak <b>{s.peakRating}</b></span><span>{s.wins}W / {s.losses}L / {s.draws}D</span><span>{pct(s.wins, s.matches)}%</span></div></div>) : <div className="esports-v8-empty">{tr("Aucune saison archivée.", "No archived season.", "No hay temporadas archivadas.")}</div>}</div>
    </section>

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><div className="esports-v8-section-title">👑 {tr("CLASSEMENT DE SAISON", "SEASON LEADERBOARD", "CLASIFICACIÓN DE TEMPORADA")}</div><div className="esports-v8-sub">{game.shortName} · {teamSize}v{teamSize}</div></div><span className="esports-status-pill">TOP {Math.min(30, leaderboard.length || 30)}</span></div>
      <div className="esports-v8-leader-list">{leaderboard.length ? leaderboard.map((r) => <div key={`${r.teamId}-${r.position}`} className={r.teamId === teamId ? "is-mine" : ""}><strong>{r.position <= 3 ? ["🥇", "🥈", "🥉"][r.position - 1] : `#${r.position}`}</strong><div><b>[{r.tag || "TEAM"}] {r.name}</b><span>{r.division.divisionLabel} · {r.wins}W/{r.losses}L/{r.draws}D · Peak {r.peakRating}</span></div><strong>{r.rating}</strong></div>) : <div className="esports-v8-empty">{tr("Pas encore de classement pour cette saison.", "No leaderboard yet for this season.", "Aún no hay clasificación para esta temporada.")}</div>}</div>
    </section>
  </div>;
}

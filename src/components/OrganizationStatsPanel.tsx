import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  getOrganizationRankings,
  listOrganizationCompetitions,
  type OrganizationCompetition,
  type OrganizationRankingRow,
  type OrganizationRecord,
} from "../organizations/organizationService";

function compactNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value || 0);
}

export default function OrganizationStatsPanel({
  organization,
  userId,
}: {
  organization: OrganizationRecord;
  userId: string | null;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);

  const [competitions, setCompetitions] = React.useState<OrganizationCompetition[]>([]);
  const [rows, setRows] = React.useState<OrganizationRankingRow[]>([]);
  const [competitionId, setCompetitionId] = React.useState("");
  const [sportId, setSportId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const card: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(5,10,18,.76)",
    boxShadow: "0 12px 32px rgba(0,0,0,.22)",
  };
  const input: React.CSSProperties = {
    width: "100%",
    minHeight: 40,
    borderRadius: 12,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(4,9,17,.9)",
    color: theme.text,
    padding: "8px 10px",
    outline: "none",
    fontSize: 9.5,
    fontWeight: 850,
  };

  const refreshCompetitions = React.useCallback(async () => {
    const result = await listOrganizationCompetitions(userId, organization.id);
    setCompetitions(result.competitions);
  }, [organization.id, userId]);

  const refreshRankings = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const ranking = await getOrganizationRankings(userId, organization.id, {
        competitionId: competitionId || null,
        sportId: competitionId ? null : (sportId || null),
      });
      setRows(ranking);
    } catch (err: any) {
      setRows([]);
      setError(String(err?.message || L("Classement indisponible.", "Ranking unavailable.", "Clasificación no disponible.")));
    } finally {
      setLoading(false);
    }
  }, [competitionId, organization.id, sportId, userId, L]);

  React.useEffect(() => { void refreshCompetitions(); }, [refreshCompetitions]);
  React.useEffect(() => { void refreshRankings(); }, [refreshRankings]);

  const sports = React.useMemo(() => Array.from(new Set(competitions.map((item) => item.sportId).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [competitions]);
  const totalCompleted = competitions.reduce((sum, item) => sum + item.completedFixtureCount, 0);
  const activeCompetitions = competitions.filter((item) => item.status === "active" || item.status === "open").length;
  const leader = rows[0] || null;
  const bestRate = React.useMemo(() => rows.filter((row) => row.played > 0).slice().sort((a, b) => b.winRate - a.winRate || b.played - a.played)[0] || null, [rows]);
  const bestStreak = React.useMemo(() => rows.slice().sort((a, b) => b.bestWinStreak - a.bestWinStreak || b.wins - a.wins)[0] || null, [rows]);

  const formDots = (form: string) => {
    const items = form.split("").slice(0, 5);
    return <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>{items.length ? items.map((value, index) => <span key={`${value}-${index}`} title={value === "W" ? L("Victoire", "Win", "Victoria") : L("Défaite", "Loss", "Derrota")} style={{ width: 15, height: 15, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 6.8, fontWeight: 1000, border: `1px solid ${value === "W" ? theme.primary : "rgba(255,100,100,.55)"}`, color: value === "W" ? theme.primary : "#ff9999", background: value === "W" ? `${theme.primary}12` : "rgba(255,80,80,.08)" }}>{value}</span>) : <span style={{ color: theme.textSoft }}>—</span>}</span>;
  };

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
        <div>
          <div style={{ color: theme.primary, fontSize: 8.2, fontWeight: 1000, letterSpacing: 1.05 }}>{L("CLASSEMENTS & STATISTIQUES", "RANKINGS & STATISTICS", "CLASIFICACIONES Y ESTADÍSTICAS")}</div>
          <div style={{ marginTop: 4, color: theme.text, fontSize: 16, fontWeight: 1000 }}>{organization.name}</div>
          <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.2, lineHeight: 1.4 }}>{L("Calculés à la demande depuis les rencontres déjà enregistrées : aucune table de statistiques supplémentaire n’est stockée.", "Calculated on demand from existing fixtures: no additional statistics table is stored.", "Calculadas bajo demanda a partir de los encuentros existentes: no se guarda ninguna tabla adicional de estadísticas.")}</div>
        </div>
        <button type="button" onClick={() => void refreshRankings()} style={{ minHeight: 36, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", color: theme.primary, fontSize: 8.5, fontWeight: 1000, padding: "7px 10px", cursor: "pointer" }}>{L("ACTUALISER", "REFRESH", "ACTUALIZAR")}</button>
      </div>
      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        {[
          [L("Compétitions", "Competitions", "Competiciones"), competitions.length],
          [L("En cours", "Live", "En curso"), activeCompetitions],
          [L("Matchs terminés", "Completed", "Finalizados"), totalCompleted],
          [L("Classés", "Ranked", "Clasificados"), rows.length],
        ].map(([label, value]) => <div key={String(label)} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: 9, textAlign: "center" }}><div style={{ color: theme.primary, fontSize: 14, fontWeight: 1000 }}>{value}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 7.2 }}>{label}</div></div>)}
      </div>
    </div>

    <div style={{ ...card, padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div><div style={{ color: theme.textSoft, fontSize: 7.5, fontWeight: 950, marginBottom: 5 }}>{L("COMPÉTITION", "COMPETITION", "COMPETICIÓN")}</div><select style={input} value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}><option value="">{L("Toutes les compétitions", "All competitions", "Todas las competiciones")}</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></div>
      <div><div style={{ color: theme.textSoft, fontSize: 7.5, fontWeight: 950, marginBottom: 5 }}>{L("DISCIPLINE", "SPORT", "DEPORTE")}</div><select style={{ ...input, opacity: competitionId ? .55 : 1 }} value={sportId} disabled={Boolean(competitionId)} onChange={(e) => setSportId(e.target.value)}><option value="">{L("Toutes les disciplines", "All sports", "Todos los deportes")}</option>{sports.map((sport) => <option key={sport} value={sport}>{sport}</option>)}</select></div>
    </div>

    {error ? <div style={{ ...card, padding: 12, borderColor: "rgba(255,90,90,.45)", color: "#ffaaaa", fontSize: 9.5 }}>{error}</div> : null}

    {!loading && rows.length ? <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {[
          ["🥇", L("Leader", "Leader", "Líder"), leader?.displayName || "—", leader ? `${leader.points} pts` : "—"],
          ["⚡", L("Meilleure série", "Best streak", "Mejor racha"), bestStreak?.displayName || "—", bestStreak ? `${bestStreak.bestWinStreak} ${L("victoires", "wins", "victorias")}` : "—"],
          ["🎯", L("Meilleur ratio", "Best win rate", "Mejor ratio"), bestRate?.displayName || "—", bestRate ? `${bestRate.winRate.toFixed(0)}%` : "—"],
        ].map(([icon, label, name, value]) => <div key={String(label)} style={{ ...card, padding: 11, minWidth: 0 }}><div style={{ fontSize: 18 }}>{icon}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 7.4, fontWeight: 950 }}>{label}</div><div style={{ marginTop: 2, color: theme.text, fontSize: 10, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div><div style={{ marginTop: 3, color: theme.primary, fontSize: 9, fontWeight: 1000 }}>{value}</div></div>)}
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "11px 12px", borderBottom: `1px solid ${theme.borderSoft}`, color: theme.text, fontSize: 10.5, fontWeight: 1000 }}>{L("CLASSEMENT", "STANDINGS", "CLASIFICACIÓN")}</div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 610 }}>
            <div style={{ display: "grid", gridTemplateColumns: "38px minmax(170px,1.6fr) 44px 44px 44px 56px 66px 72px 90px", gap: 4, padding: "8px 10px", color: theme.textSoft, fontSize: 7.2, fontWeight: 1000, borderBottom: `1px solid ${theme.borderSoft}` }}>
              <span>#</span><span>{L("Participant", "Participant", "Participante")}</span><span>MJ</span><span>V</span><span>D</span><span>PTS</span><span>DIFF</span><span>WIN%</span><span>{L("Forme", "Form", "Forma")}</span>
            </div>
            {rows.map((row, index) => <div key={`${row.entityType}-${row.entityId}`} style={{ display: "grid", gridTemplateColumns: "38px minmax(170px,1.6fr) 44px 44px 44px 56px 66px 72px 90px", gap: 4, padding: "9px 10px", alignItems: "center", borderBottom: index === rows.length - 1 ? "none" : `1px solid ${theme.borderSoft}`, background: row.rank <= 3 ? `${theme.primary}06` : "transparent" }}>
              <span style={{ color: row.rank <= 3 ? theme.primary : theme.textSoft, fontSize: 9, fontWeight: 1000 }}>{row.rank}</span>
              <span style={{ minWidth: 0 }}><strong style={{ display: "block", color: theme.text, fontSize: 9.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.displayName}</strong><small style={{ color: theme.textSoft, fontSize: 7.2 }}>{row.entityType === "group" ? L("Équipe / groupe", "Team / group", "Equipo / grupo") : L("Individuel", "Individual", "Individual")} · {row.currentStreak ? `${row.currentStreakType}${row.currentStreak}` : "—"}</small></span>
              <span style={{ color: theme.text, fontSize: 9 }}>{row.played}</span>
              <span style={{ color: theme.primary, fontSize: 9, fontWeight: 1000 }}>{row.wins}</span>
              <span style={{ color: theme.textSoft, fontSize: 9 }}>{row.losses}</span>
              <span style={{ color: theme.text, fontSize: 9, fontWeight: 1000 }}>{compactNumber(row.points)}</span>
              <span style={{ color: row.scoreDiff >= 0 ? theme.primary : "#ff9999", fontSize: 9 }}>{row.scoreDiff > 0 ? "+" : ""}{row.scoreDiff}</span>
              <span style={{ color: theme.text, fontSize: 9 }}>{row.winRate.toFixed(0)}%</span>
              <span>{formDots(row.recentForm)}</span>
            </div>)}
          </div>
        </div>
      </div>
    </> : null}

    {loading ? <div style={{ ...card, padding: 22, color: theme.textSoft, textAlign: "center", fontSize: 9.5 }}>{L("Calcul du classement…", "Calculating standings…", "Calculando clasificación…")}</div> : null}
    {!loading && !rows.length && !error ? <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.5 }}>{L("Aucun résultat terminé pour ce filtre. Les classements apparaîtront automatiquement dès que des rencontres seront validées.", "No completed result for this filter. Standings will appear automatically once fixtures are completed.", "No hay resultados finalizados para este filtro. La clasificación aparecerá automáticamente al validar encuentros.")}</div> : null}

    <div style={{ borderRadius: 13, border: `1px solid ${theme.primary}33`, background: `${theme.primary}0a`, padding: 10, color: theme.textSoft, fontSize: 8.7, lineHeight: 1.45 }}>{L("Aucune donnée de classement supplémentaire n’est enregistrée : MSS recalcule ces agrégats depuis les petites données de compétition déjà présentes dans Supabase. Les statistiques sportives détaillées, médias et historiques complets restent dans R2 / NAS / stockage choisi.", "No extra ranking data is stored: MSS recalculates these aggregates from the lightweight competition data already present in Supabase. Detailed sport statistics, media and full history stay in R2 / NAS / selected storage.", "No se guarda ningún dato adicional de clasificación: MSS recalcula estos agregados a partir de los datos ligeros de competición ya presentes en Supabase. Las estadísticas deportivas detalladas, multimedia e historiales completos permanecen en R2 / NAS / almacenamiento elegido.")}</div>
  </div>;
}

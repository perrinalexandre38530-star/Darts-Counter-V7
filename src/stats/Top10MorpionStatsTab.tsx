import React from "react";
import { useLang } from "../contexts/LangContext";
import { computeTop10MorpionStats, type Top10MorpionMode } from "../lib/top10MorpionStats";

type Props = { records: any[]; playerId: string; mode: Top10MorpionMode };
export default function Top10MorpionStatsTab({ records, playerId, mode }: Props) {
  const { lang } = useLang();
  const fr = lang === "fr";
  const stats = React.useMemo(() => computeTop10MorpionStats(records, playerId, mode), [records, playerId, mode]);
  const fmt = (n: number) => n.toLocaleString(fr ? "fr-FR" : "en-GB");
  const cards: Array<[string, string]> = [
    [fr ? "Parties terminées" : "Completed matches", fmt(stats.games)],
    [fr ? "Victoires en multijoueur" : "Multiplayer wins", fmt(stats.victories)],
    [fr ? "Taux de victoire (résultats connus)" : "Win rate (known results)", stats.knownCompetitiveGames ? `${Math.round(stats.victories / stats.knownCompetitiveGames * 100)}%` : "—"],
    [fr ? "Défaites / Nuls" : "Losses / Draws", `${fmt(stats.defeats)} / ${fmt(stats.draws)}`],
    ...(stats.unknownResults ? [[fr ? "Résultats anciens indéterminés" : "Unresolved legacy results", fmt(stats.unknownResults)]] : []),
    ...(mode === "top_10" ? [[fr ? "Séries solo" : "Solo sessions", fmt(stats.soloGames)]] : []),
    [fr ? "Volées validées" : "Completed visits", fmt(stats.visits)],
    ...(mode === "top_10" ? [
      [fr ? "Points cumulés" : "Total points", fmt(stats.totalPoints)],
      [fr ? "Record sur 10 volées" : "Best 10-visit score", stats.bestGame === null ? "—" : fmt(stats.bestGame)],
      [fr ? "Meilleure volée" : "Best visit", stats.bestVisit === null ? "—" : fmt(stats.bestVisit)],
      [fr ? "Moyenne par volée documentée" : "Average per recorded visit", stats.averagePointsPerVisit === null ? "—" : stats.averagePointsPerVisit.toFixed(1)],
      [fr ? "Volées avec score connu" : "Visits with recorded scores", stats.visits > stats.documentedVisits ? `${fmt(stats.documentedVisits)} / ${fmt(stats.visits)}` : fmt(stats.documentedVisits)],
      ["100+ / 140+", `${stats.visits100} / ${stats.visits140}`],
    ] : [
      [fr ? "Manches remportées" : "Rounds won", fmt(stats.roundsWon)],
      [fr ? "Cases conquises (dernière manche)" : "Claimed cells (last round)", stats.lastGridCases === null ? "—" : fmt(stats.lastGridCases)],
      [fr ? "Marques (dernière manche)" : "Marks (last round)", stats.lastGridMarks === null ? "—" : fmt(stats.lastGridMarks)],
    ]),
    [fr ? "Fléchettes détaillées" : "Recorded darts", fmt(stats.darts)],
  ] as Array<[string, string]>;
  const recent = stats.recent;
  const ceiling = Math.max(1, ...recent.map(x => x.score));
  return <div style={{ display: "grid", gap: 12 }}>
    <h3 style={{ margin: 0, fontSize: 17 }}>{mode === "top_10" ? "TOP 10" : fr ? "MORPION" : "TIC-TAC-TOE"} · {fr ? "PERFORMANCES" : "PERFORMANCE"}</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
      {cards.map(([label, value]) => <div key={label} style={{ border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", padding: 12, borderRadius: 12 }}><div style={{ fontSize: 11, opacity: .8 }}>{label}</div><strong style={{ fontSize: 23 }}>{value}</strong></div>)}
    </div>
    {!!recent.length && <section style={{ padding: 12, border: "1px solid rgba(255,255,255,.14)", borderRadius: 12 }} aria-label={fr ? "Progression par partie" : "Match history"}>
      <b style={{ fontSize: 13 }}>{mode === "top_10" ? fr ? "PROGRESSION DES SCORES" : "SCORE PROGRESSION" : fr ? "MANCHES GAGNÉES PAR PARTIE" : "ROUNDS WON PER MATCH"}</b>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${recent.length}, minmax(0, 1fr))`, gap: 5, alignItems: "end", height: 98, paddingTop: 12 }}>
        {recent.map((game, i) => <div key={`${game.id}-${i}`} title={`${game.date ? new Date(game.date).toLocaleDateString(fr ? "fr-FR" : "en-GB") : "—"} · ${game.score}`} aria-label={`${fr ? "Partie" : "Match"} ${i + 1}: ${game.score}`} style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "end", alignItems: "center", gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: 10, opacity: .9 }}>{game.score}</span>
          <div style={{ background: "linear-gradient(180deg,#67dcfb,#3576cf)", borderRadius: "4px 4px 0 0", width: "100%", maxWidth: 28, minHeight: 3, height: `${Math.max(3, game.score / ceiling * 70)}%` }} />
        </div>)}
      </div>
    </section>}
    <div style={{ fontSize: 12, opacity: .7 }}>{!stats.games ? (fr ? "Aucune partie terminée pour ce profil dans ce mode." : "No completed matches for this profile in this mode.") : fr ? "Données calculées depuis les parties terminées de l’Historique V4, sans compter deux fois les scores et les volées." : "Based on completed History V4 matches, without double-counting scores and visits."}</div>
  </div>;
}

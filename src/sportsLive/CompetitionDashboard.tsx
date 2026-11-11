import React from "react";
import type { DartsLiveFixture, DartsLiveResult } from "../dartsLive/types";
import type { SportLiveNewsItem } from "./types";
import { InlineAdBanner } from "../monetization/AdSlot";
import { buildCompetitionBracket, buildCompetitionStandings, competitionDate, competitionTextKey, completeMatchScore } from "./competitionModels";
import type { OfficialStandingsResponse, OfficialStandingTable } from "./officialStandings";
import type { VerifiedBracketRound } from "./officialCompetitionFeed";
type SupplierResponse = OfficialStandingsResponse & { bracket?: VerifiedBracketRound[] };

export type CompetitionDetailTab = "summary" | "results" | "fixtures" | "standings" | "bracket" | "news";

const TABS: ReadonlyArray<{ key: CompetitionDetailTab; label: string; icon: string }> = [
  { key: "summary", label: "Résumé", icon: "▦" },
  { key: "results", label: "Résultats", icon: "☷" },
  { key: "fixtures", label: "À venir", icon: "◷" },
  { key: "standings", label: "Classements", icon: "≡" },
  { key: "bracket", label: "Phase finale", icon: "⑂" },
  { key: "news", label: "Actualités", icon: "▤" },
];

type Props = {
  sport: string;
  competition: string;
  country: string;
  season: string;
  results: DartsLiveResult[];
  fixtures: DartsLiveFixture[];
  news: SportLiveNewsItem[];
  renderResult: (item: DartsLiveResult) => React.ReactNode;
  renderFixture: (item: DartsLiveFixture) => React.ReactNode;
  renderNews: (item: SportLiveNewsItem) => React.ReactNode;
};

function dayKey(value?: string | null): string {
  const stamp = competitionDate(value);
  return stamp ? new Date(stamp).toISOString().slice(0, 10) : "undated";
}
function dayLabel(value: string): string {
  if (value === "undated") return "DATE À CONFIRMER";
  const stamp = Date.parse(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(stamp);
}
function timeLabel(value?: string | null): string {
  const stamp = competitionDate(value);
  if (!stamp) return "À confirmer";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(stamp);
}
function score(value?: number | null): string { return value === null || value === undefined || !Number.isFinite(Number(value)) ? "–" : String(value); }
function roundLabel(value?: string | null) { return String(value || "").trim() || "Tour non précisé"; }
function NoData({ children }: { children: React.ReactNode }) { return <div className="msc-cd-empty">{children}</div>; }
function SupplierTable({ table }: { table: OfficialStandingTable }) {
  const hasResults = table.rows.some(row => row.played !== null || row.won !== null || row.drawn !== null || row.lost !== null);
  const hasGoals = table.rows.some(row => row.goalsFor !== null || row.goalsAgainst !== null);
  const hasPoints = table.rows.some(row => row.points !== null);
  return <section className="msc-cd-table-wrap">
    <h3>{table.name}</h3>
    <div className="msc-cd-table-scroll"><table className="msc-cd-table"><thead><tr>
      <th>#</th><th>Participant</th>
      {hasResults ? <><th>J</th><th>V</th><th>N</th><th>D</th></> : null}
      {hasGoals ? <><th>BP</th><th>BC</th><th>Diff.</th></> : null}
      {hasPoints ? <th>Pts</th> : null}
    </tr></thead><tbody>{table.rows.map(row => <tr key={`${table.name}-${row.position}-${row.name}`}>
      <td>{row.position}</td><td>{row.name}</td>
      {hasResults ? <><td>{row.played ?? "–"}</td><td>{row.won ?? "–"}</td><td>{row.drawn ?? "–"}</td><td>{row.lost ?? "–"}</td></> : null}
      {hasGoals ? <><td>{row.goalsFor ?? "–"}</td><td>{row.goalsAgainst ?? "–"}</td><td>{row.goalDifference ?? "–"}</td></> : null}
      {hasPoints ? <td><strong>{row.points ?? "–"}</strong></td> : null}
    </tr>)}</tbody></table></div>
  </section>;
}

export default function CompetitionDashboard({ sport, competition, country, season, results, fixtures, news, renderResult, renderFixture, renderNews }: Props) {
  const [tab, setTab] = React.useState<CompetitionDetailTab>("summary");
  const [resultLimit, setResultLimit] = React.useState(120);
  const [fixtureLimit, setFixtureLimit] = React.useState(60);
  const [bracketFilter, setBracketFilter] = React.useState("all");
  const [bracketLimit, setBracketLimit] = React.useState(40);
  React.useEffect(() => { setResultLimit(120); setFixtureLimit(60); setBracketFilter("all"); setBracketLimit(40); }, [sport, season, competition]);
  React.useEffect(() => { setTab("summary"); }, [sport, competition]);

  const sortedResults = React.useMemo(() => [...results].sort((a, b) => competitionDate(b.playedOn) - competitionDate(a.playedOn)), [results]);
  const sortedFixtures = React.useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return fixtures.filter((item) => { const date = competitionDate(item.startsAt || item.date); return !date || date >= cutoff; })
      .sort((a, b) => (competitionDate(a.startsAt || a.date) || Number.MAX_SAFE_INTEGER) - (competitionDate(b.startsAt || b.date) || Number.MAX_SAFE_INTEGER));
  }, [fixtures]);
  const standings = React.useMemo(() => buildCompetitionStandings(sortedResults), [sortedResults]);
  const brackets = React.useMemo(() => buildCompetitionBracket(sortedResults, sortedFixtures), [sortedResults, sortedFixtures]);
  const availableYears = React.useMemo(() => new Set([
    ...results.map((item) => String(item.playedOn || "").match(/(?:19|20)\d{2}/)?.[0] || ""),
    ...fixtures.map((item) => String(item.startsAt || item.date || "").match(/(?:19|20)\d{2}/)?.[0] || ""),
  ].filter(Boolean)), [results, fixtures]);
  // Never amalgamate Group A standings or quarter-finals from different editions.
  const chooseSeasonForTables = season === "__all__" && availableYears.size > 1;
  const providerSeason = season === "__all__" ? ([...availableYears][0] || "current") : season;
  const officialKey = `${sport}|${competition}|${country}|${providerSeason}`;
  const [official, setOfficial] = React.useState<{key:string;data:SupplierResponse} | null>(null);
  const [officialRequest, setOfficialRequest] = React.useState<{key:string;loading:boolean} | null>(null);
  React.useEffect(() => {
    if ((tab !== "standings" && tab !== "bracket") || chooseSeasonForTables || official?.key === officialKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams({competition, country});
    if (/^(?:19|20)\d{2}$/.test(providerSeason)) params.set("season", providerSeason);
    setOfficialRequest({key:officialKey,loading:true});
    fetch(`/api/sports-live/${encodeURIComponent(sport)}/standings?${params}`, {signal:controller.signal,headers:{Accept:"application/json"}})
      .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then((data:SupplierResponse) => { if (!controller.signal.aborted) setOfficial({key:officialKey,data}); })
      .catch(() => { if (!controller.signal.aborted) setOfficial({key:officialKey,data:{available:false,sport,competition,season:null,sourceName:null,sourceUrl:null,updatedAt:null,tables:[],bracket:[],reason:"Source indisponible."}}); })
      .finally(() => { if (!controller.signal.aborted) setOfficialRequest({key:officialKey,loading:false}); });
    return () => controller.abort();
  }, [sport,competition,country,providerSeason,tab,chooseSeasonForTables,officialKey]);
  const officialData = official?.key === officialKey && official.data.available ? official.data : null;
  const officialTables = officialData?.tables?.length ? officialData.tables : null;
  const officialBrackets = officialData?.bracket?.length ? officialData.bracket : null;
  const officialLoading = officialRequest?.key === officialKey && officialRequest.loading;

  const relatedNews = React.useMemo(() => {
    const comp = competitionTextKey(competition);
    const terms = comp.split(" ").filter((term) => term.length > 3 && !["championship", "championships", "open", "tour", "world", "coupe", "championnat"].includes(term));
    return news.filter((item) => {
      const content = competitionTextKey(`${item.title} ${item.summary || ""}`);
      return (comp.length > 5 && content.includes(comp)) || (terms.length >= 2 && terms.slice(0, 2).every((term) => content.includes(term)));
    }).slice(0, 16);
  }, [competition, news]);
  const visibleResults = sortedResults.slice(0, resultLimit);
  const groupedResults = React.useMemo(() => {
    const rounds = new Map<string, DartsLiveResult[]>();
    for (const match of visibleResults) {
      const round = roundLabel(match.round);
      const bucket = rounds.get(round) || [];
      bucket.push(match);
      rounds.set(round, bucket);
    }
    return [...rounds.entries()].map(([round, matches]) => {
      const days = new Map<string, DartsLiveResult[]>();
      matches.forEach((match) => { const day = dayKey(match.playedOn); const bucket = days.get(day) || []; bucket.push(match); days.set(day, bucket); });
      return { round, days: [...days.entries()].sort(([a], [b]) => b.localeCompare(a)), count: matches.length };
    });
  }, [visibleResults]);
  const visibleFixtures = sortedFixtures.slice(0, fixtureLimit);
  const fixtureDays = React.useMemo(() => {
    const groups = new Map<string, DartsLiveFixture[]>();
    visibleFixtures.forEach((match) => { const day = dayKey(match.startsAt || match.date); const bucket = groups.get(day) || []; bucket.push(match); groups.set(day, bucket); });
    return [...groups.entries()];
  }, [visibleFixtures]);
  const slotKey = `live-comp-${competitionTextKey(`${sport}-${competition}`).slice(0, 55).replace(/\s+/g, "-")}`;
  const officialSource = React.useMemo(() => {
    const rows = [...sortedResults.slice(0, 40), ...sortedFixtures.slice(0, 40)];
    const match = rows.find((item) => /^https:\/\//i.test(String(item.sourceUrl || "")));
    return match?.sourceUrl || null;
  }, [sortedResults, sortedFixtures]);

  return <div className="msc-cd" aria-label={`Fiche ${competition}`}>
    <div className="msc-cd-tabs" role="tablist" aria-label={`Rubriques ${competition}`}>
      {TABS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={`msc-cd-tab${tab === item.key ? " is-active" : ""}`} onClick={() => setTab(item.key)}>
        <span aria-hidden="true">{item.icon}</span>{item.label}
        {item.key === "results" && results.length ? <small>{results.length}</small> : null}
        {item.key === "fixtures" && sortedFixtures.length ? <small>{sortedFixtures.length}</small> : null}
      </button>)}
    </div>
    <div className="msc-cd-context"><strong>{country}</strong><span>›</span><span>{season === "__all__" ? "Toutes saisons" : season}</span></div>
    {tab === "summary" ? <div className="msc-cd-panel">
      <div className="msc-cd-metrics"><div><b>{sortedResults.length}</b><span>Résultats connus</span></div><div><b>{sortedFixtures.length}</b><span>Matchs programmés</span></div><div><b>{brackets.length}</b><span>Tours éliminatoires</span></div></div>
      {officialSource ? <a className="msc-cd-source" href={officialSource} target="_blank" rel="noopener noreferrer">Consulter la source du match ↗</a> : null}
      <div className="msc-cd-section-top"><h3>Prochaines rencontres</h3><button type="button" onClick={() => setTab("fixtures")}>Tout voir ›</button></div>
      {sortedFixtures.length ? sortedFixtures.slice(0, 4).map((item) => <React.Fragment key={item.id}>{renderFixture(item)}</React.Fragment>) : <NoData>Aucun match programmé confirmé pour cette sélection.</NoData>}
      <InlineAdBanner placement="competitions" slotKey={`${slotKey}-summary`} compact style={{ margin: "12px 0" }} />
      <div className="msc-cd-section-top"><h3>Derniers résultats</h3><button type="button" onClick={() => setTab("results")}>Tout voir ›</button></div>
      {sortedResults.length ? sortedResults.slice(0, 4).map((item) => <React.Fragment key={item.id}>{renderResult(item)}</React.Fragment>) : <NoData>Aucun résultat disponible pour cette sélection.</NoData>}
    </div> : null}
    {tab === "results" ? <div className="msc-cd-panel">
      <p className="msc-cd-caution">{visibleResults.length} sur {sortedResults.length} résultats affichés, du plus récent au plus ancien.</p>
      {groupedResults.length ? groupedResults.map(({ round, days, count }) => <section key={round} className="msc-cd-round"><div className="msc-cd-round-head"><strong>{round}</strong><span>{count} match{count > 1 ? "s" : ""}</span></div>
        {days.map(([day, matches]) => <div key={`${round}-${day}`} className="msc-cd-day"><div className="msc-cd-day-title">{dayLabel(day)} <span>{matches.length} match{matches.length > 1 ? "s" : ""}</span></div>{matches.map((item) => <React.Fragment key={item.id}>{renderResult(item)}</React.Fragment>)}</div>)}
      </section>) : <NoData>Aucun résultat disponible pour cette saison. Consulter les autres saisons ou les sources officielles.</NoData>}
      {sortedResults.length > visibleResults.length ? <button className="msc-cd-more" type="button" onClick={() => setResultLimit((value) => value + 120)}>Afficher 120 résultats de plus · {sortedResults.length - visibleResults.length} restants</button> : null}
    </div> : null}
    {tab === "fixtures" ? <div className="msc-cd-panel">
      {fixtureDays.length ? fixtureDays.map(([day, matches]) => <section className="msc-cd-day" key={day}><div className="msc-cd-day-title">{dayLabel(day)} <span>{matches.length} match{matches.length > 1 ? "s" : ""}</span></div>{matches.map((item) => <React.Fragment key={item.id}>{renderFixture(item)}</React.Fragment>)}</section>) : <NoData>Aucune rencontre programmée disponible. L'Agenda personnel reste dans l'Agenda principal.</NoData>}
      {sortedFixtures.length > visibleFixtures.length ? <button className="msc-cd-more" type="button" onClick={() => setFixtureLimit((value) => value + 60)}>Afficher 60 rencontres supplémentaires · {sortedFixtures.length - visibleFixtures.length} restantes</button> : null}
    </div> : null}
    {tab === "standings" ? <div className="msc-cd-panel">
      {chooseSeasonForTables ? <NoData>Plusieurs saisons sont présentes : sélectionne une année au-dessus pour éviter de mélanger leurs classements.</NoData> : null}
      {!chooseSeasonForTables && officialLoading ? <p className="msc-cd-caution" role="status">Recherche du classement publié par le fournisseur…</p> : null}
      {!chooseSeasonForTables && officialTables && officialData ? <>
        <p className="msc-cd-caution"><strong>CLASSEMENT FOURNISSEUR</strong> · {officialData.sourceName} · {officialData.season ? `Saison ${officialData.season}` : "Saison courante"}. Données transmises par le fournisseur, non recalculées dans l'application.</p>
        {officialTables.map((table, index) => <SupplierTable key={`${table.stage}-${table.group}-${index}`} table={table} />)}
        {officialData.sourceUrl ? <a className="msc-cd-source" href={officialData.sourceUrl} target="_blank" rel="noopener noreferrer">Source : {officialData.sourceName} ↗</a> : null}
      </> : null}
      {!chooseSeasonForTables && !officialTables && !officialLoading ? <>
        <p className="msc-cd-caution">{sport === "foot" && officialLoading ? "" : "BILAN INDICATIF · Calculé uniquement sur les scores complets reçus. Ce tableau n'est pas un classement officiel : barème, départages et sanctions peuvent manquer. Les matchs éliminatoires sont exclus."}</p>
        {standings.length ? standings.map((table) => <section key={table.name} className="msc-cd-table-wrap"><h3>{table.name}</h3><div className="msc-cd-table-scroll"><table className="msc-cd-table"><thead><tr><th>#</th><th>Participant</th><th>J</th><th>V</th><th>N</th><th>D</th></tr></thead><tbody>{table.rows.slice(0, 120).map((row, index) => <tr key={`${table.name}-${competitionTextKey(row.name)}`}><td>{index + 1}</td><td>{row.name}</td><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td></tr>)}</tbody></table></div></section>) : <NoData>{sport === "foot" && officialLoading ? "Chargement…" : "Aucun classement de poule ou championnat exploitable pour cette sélection."}</NoData>}
      </> : null}
    </div> : null}
    {tab === "bracket" ? <div className="msc-cd-panel">
      <p className="msc-cd-caution">Parcours par tours confirmés : résultats et rencontres programmées. Les liens de qualification entre les tours ne sont affichés que si un fournisseur transmet un véritable tableau structuré.</p>
      {chooseSeasonForTables ? <NoData>Plusieurs éditions sont mélangées dans cette sélection. Choisis une saison pour voir les tours éliminatoires d'une seule édition.</NoData> : null}
      {!chooseSeasonForTables && officialLoading ? <p className="msc-cd-caution" role="status">Recherche du tableau fournisseur…</p> : null}
      {!chooseSeasonForTables && officialBrackets && officialData ? <>
        <p className="msc-cd-caution"><strong>TABLEAU FOURNISSEUR</strong> · {officialData.sourceName} · Les liens de progression sont affichés uniquement s'ils sont explicitement transmis par la source.</p>
        {officialBrackets.slice().sort((a,b) => a.order - b.order).map((round) => <section key={round.id} className="msc-cd-round">
          <div className="msc-cd-round-head"><strong>{round.name}</strong><span>{round.matches.length} rencontre{round.matches.length > 1 ? "s" : ""}</span></div>
          {round.matches.slice(0,bracketLimit).map((match) => <div className="msc-cd-elim" key={match.id}>
            <div className="msc-cd-elim-names"><span>{match.participantA}</span><span>{match.participantB}</span></div>
            <div className="msc-cd-elim-info"><b>{match.scoreA === null || match.scoreB === null ? "– : –" : `${match.scoreA} : ${match.scoreB}`}</b>
              <small>{match.status === "finished" ? "TERMINÉ" : match.status === "live" ? "EN DIRECT" : match.status === "scheduled" ? "À VENIR" : "STATUT NON CONFIRMÉ"}</small>
              {match.startsAt ? <small>{timeLabel(match.startsAt)}</small> : null}
              {match.nextMatchId ? <small>Suite → match {match.nextMatchId}</small> : null}
            </div>
          </div>)}
          {round.matches.length > bracketLimit ? <button className="msc-cd-more" type="button" onClick={() => setBracketLimit(n => n + 40)}>Afficher d'autres rencontres</button> : null}
        </section>)}
        {officialData.sourceUrl ? <a className="msc-cd-source" href={officialData.sourceUrl} target="_blank" rel="noopener noreferrer">Source : {officialData.sourceName} ↗</a> : null}
      </> : null}
      {!chooseSeasonForTables && !officialBrackets && brackets.length ? <div className="msc-cd-phase-filter" aria-label="Choisir un tour"><button type="button" aria-pressed={bracketFilter === "all"} className={bracketFilter === "all" ? "is-active" : ""} onClick={() => setBracketFilter("all")}>Tous les tours</button>{brackets.map((round) => <button key={round.label} type="button" aria-pressed={bracketFilter === round.label} className={bracketFilter === round.label ? "is-active" : ""} onClick={() => setBracketFilter(round.label)}>{round.label}</button>)}</div> : null}
      {!chooseSeasonForTables && !officialBrackets && brackets.length ? brackets.filter((round) => bracketFilter === "all" || round.label === bracketFilter).map((round) => <section key={round.label} className="msc-cd-round"><div className="msc-cd-round-head"><strong>{round.label}</strong><span>{round.completed.length} terminé{round.completed.length > 1 ? "s" : ""} · {round.scheduled.length} à venir</span></div>
        {round.completed.slice(0, bracketLimit).map((match) => <div className="msc-cd-elim" key={`r-${match.id}`}><div className="msc-cd-elim-names"><span>{match.winner?.name || "À confirmer"}</span><span>{match.loser?.name || "À confirmer"}</span></div><div className="msc-cd-elim-info"><b>{completeMatchScore(match) ? `${score(match.winner.score)} : ${score(match.loser.score)}` : "– : –"}</b><small>{completeMatchScore(match) ? "RÉSULTAT" : "SCORE INCOMPLET"}</small><small>{timeLabel(match.playedOn)}</small></div></div>)}
        {round.scheduled.slice(0, bracketLimit).map((match) => <div className="msc-cd-elim" key={`f-${match.id}`}><div className="msc-cd-elim-names"><span>{match.players?.[0]?.name || "À confirmer"}</span><span>{match.players?.[1]?.name || "À confirmer"}</span></div><div className="msc-cd-elim-info"><b>– : –</b><small>À VENIR</small><small>{timeLabel(match.startsAt || match.date)}</small></div></div>)}
        {round.completed.length > bracketLimit || round.scheduled.length > bracketLimit ? <button className="msc-cd-more" type="button" onClick={() => setBracketLimit((n) => n + 40)}>Afficher jusqu'à 40 matchs supplémentaires par tour</button> : null}
      </section>) : !chooseSeasonForTables && !officialBrackets && !officialLoading ? <NoData>Aucune phase éliminatoire identifiable dans les résultats ou les rencontres programmées.</NoData> : null}
    </div> : null}
    {tab === "news" ? <div className="msc-cd-panel"><div className="msc-cd-section-top"><h3>Actualités de {competition}</h3></div>{relatedNews.length ? relatedNews.map((item) => <React.Fragment key={item.id}>{renderNews(item)}</React.Fragment>) : <NoData>Pas d'actualité associée de façon fiable à cette compétition pour le moment.</NoData>}</div> : null}
  </div>;
}

import React from "react";
import type { DartsLiveFixture, DartsLiveResult } from "../dartsLive/types";
import type { SportLiveNewsItem } from "./types";
import { InlineAdBanner } from "../monetization/AdSlot";

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

function dateOf(value?: string | null) {
  const stamp = Date.parse(value || "");
  return Number.isFinite(stamp) ? stamp : 0;
}
function normal(value?: string | null) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function score(player?: { score?: number | null } | null) {
  return player?.score === undefined || player?.score === null || !Number.isFinite(Number(player.score)) ? "–" : String(player.score);
}
function roundLabel(value?: string | null) { return String(value || "").trim() || "Tour non précisé"; }
function groupName(value?: string | null) {
  const match = String(value || "").match(/(?:group|groupe|poule|pool)\s*[-:]?\s*([A-Z0-9]+)/i);
  return match ? `Groupe ${match[1].toUpperCase()}` : null;
}
function phase(value?: string | null): { order: number; label: string } | null {
  const s = normal(value);
  if (/\b(finale|final)\b/.test(s) && !/semi|demi|quarter|quart|huitiem|round/.test(s)) return { order: 6, label: "Finale" };
  if (/semi\s*final|demi\s*final/.test(s)) return { order: 5, label: "Demi-finales" };
  if (/quarter\s*final|quart\s*de\s*final|quart\s*final/.test(s)) return { order: 4, label: "Quarts de finale" };
  if (/1\s*8|last\s*16|round\s*of\s*16|huitiem/.test(s)) return { order: 3, label: "Huitièmes de finale" };
  if (/1\s*16|last\s*32|round\s*of\s*32|seiziem/.test(s)) return { order: 2, label: "Seizièmes de finale" };
  if (/1\s*32|last\s*64|round\s*of\s*64/.test(s)) return { order: 1, label: "Trente-deuxièmes de finale" };
  return null;
}

type StandingRow = { name: string; played: number; won: number; drawn: number; lost: number };
function computeStandings(rows: DartsLiveResult[]) {
  const tables = new Map<string, Map<string, StandingRow>>();
  for (const match of rows) {
    const a = match.winner;
    const b = match.loser;
    const as = a?.score;
    const bs = b?.score;
    // Une rencontre partiellement renseignée ne doit produire aucun point ni victoire.
    if (!a?.name || !b?.name || as === null || as === undefined || bs === null || bs === undefined || !Number.isFinite(Number(as)) || !Number.isFinite(Number(bs))) continue;
    const label = groupName(match.round) || "Bilan des participants";
    const table = tables.get(label) || new Map<string, StandingRow>();
    for (const [player, won, drawn] of [[a, Number(as) > Number(bs), Number(as) === Number(bs)], [b, Number(bs) > Number(as), Number(bs) === Number(as)]] as const) {
      const key = normal(player.name);
      const current = table.get(key) || { name: player.name, played: 0, won: 0, drawn: 0, lost: 0 };
      current.played += 1;
      current.won += Number(won);
      current.drawn += Number(drawn);
      current.lost += Number(!won && !drawn);
      table.set(key, current);
    }
    tables.set(label, table);
  }
  return Array.from(tables.entries()).map(([name, table]) => ({
    name,
    rows: [...table.values()].sort((a, b) => b.won - a.won || b.drawn - a.drawn || a.lost - b.lost || a.name.localeCompare(b.name)),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

function NoData({ children }: { children: React.ReactNode }) {
  return <div className="msc-cd-empty">{children}</div>;
}

export default function CompetitionDashboard({ sport, competition, country, season, results, fixtures, news, renderResult, renderFixture, renderNews }: Props) {
  const [tab, setTab] = React.useState<CompetitionDetailTab>("summary");
  const [limit, setLimit] = React.useState(120);
  React.useEffect(() => { setLimit(120); }, [season, competition]);
  const sortedResults = React.useMemo(() => [...results].sort((a,b) => dateOf(b.playedOn) - dateOf(a.playedOn)), [results]);
  const sortedFixtures = React.useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return fixtures.filter((item) => {
      const date = dateOf(item.startsAt || item.date);
      return !date || date >= cutoff;
    }).sort((a,b) => (dateOf(a.startsAt || a.date) || Number.MAX_SAFE_INTEGER) - (dateOf(b.startsAt || b.date) || Number.MAX_SAFE_INTEGER));
  }, [fixtures]);
  const standings = React.useMemo(() => computeStandings(sortedResults), [sortedResults]);
  const brackets = React.useMemo(() => {
    const map = new Map<string, { order: number; matches: DartsLiveResult[] }>();
    for (const match of sortedResults) {
      const p = phase(match.round);
      if (!p) continue;
      const bucket = map.get(p.label) || { order: p.order, matches: [] };
      bucket.matches.push(match);
      map.set(p.label, bucket);
    }
    return [...map.entries()].sort((a,b) => a[1].order - b[1].order);
  }, [sortedResults]);
  const relatedNews = React.useMemo(() => {
    const comp = normal(competition);
    const terms = comp.split(" ").filter((term) => term.length > 3 && !["championship", "championships", "open", "tour", "world", "coupe", "championnat"].includes(term));
    return news.filter((item) => {
      const content = normal(`${item.title} ${item.summary || ""}`);
      return (comp.length > 5 && content.includes(comp)) || (terms.length >= 2 && terms.slice(0, 2).every((term) => content.includes(term)));
    }).slice(0, 16);
  }, [competition, news]);
  const summaryNext = sortedFixtures.slice(0, 4);
  const summaryResults = sortedResults.slice(0, 4);
  const visibleResults = sortedResults.slice(0, limit);
  const groupedResults = React.useMemo(() => {
    const map = new Map<string, DartsLiveResult[]>();
    for (const match of visibleResults) {
      const key = roundLabel(match.round);
      const group = map.get(key) || [];
      group.push(match);
      map.set(key, group);
    }
    return [...map.entries()];
  }, [visibleResults]);
  const slotKey = `live-comp-${normal(`${sport}-${competition}`).slice(0, 55).replace(/\s+/g, "-")}`;

  return <div className="msc-cd" aria-label={`Fiche ${competition}`}>
    <div className="msc-cd-tabs" role="tablist" aria-label={`Rubriques ${competition}`}>
      {TABS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={`msc-cd-tab${tab === item.key ? " is-active" : ""}`} onClick={() => setTab(item.key)}>
        <span aria-hidden="true">{item.icon}</span>{item.label}
        {item.key === "results" && results.length > 0 ? <small>{results.length}</small> : null}
        {item.key === "fixtures" && sortedFixtures.length > 0 ? <small>{sortedFixtures.length}</small> : null}
      </button>)}
    </div>
    <div className="msc-cd-context"><strong>{country}</strong><span>›</span><span>{competition}</span><span>›</span><span>{season === "__all__" ? "Toutes saisons" : season}</span></div>
    {tab === "summary" ? <div className="msc-cd-panel">
      <div className="msc-cd-metrics"><div><b>{results.length}</b><span>Résultats</span></div><div><b>{sortedFixtures.length}</b><span>À venir</span></div><div><b>{brackets.length}</b><span>Phases connues</span></div></div>
      <div className="msc-cd-section-top"><h3>Prochains matchs</h3><button type="button" onClick={() => setTab("fixtures")}>Tout voir ›</button></div>
      {summaryNext.length ? summaryNext.map((item) => <React.Fragment key={item.id}>{renderFixture(item)}</React.Fragment>) : <NoData>Aucun match programmé confirmé pour cette sélection.</NoData>}
      <InlineAdBanner placement="competitions" slotKey={`${slotKey}-summary`} compact style={{ margin:"12px 0" }} />
      <div className="msc-cd-section-top"><h3>Derniers résultats</h3><button type="button" onClick={() => setTab("results")}>Tout voir ›</button></div>
      {summaryResults.length ? summaryResults.map((item) => <React.Fragment key={item.id}>{renderResult(item)}</React.Fragment>) : <NoData>Aucun résultat vérifié pour cette sélection.</NoData>}
    </div> : null}
    {tab === "results" ? <div className="msc-cd-panel">
      {groupedResults.length ? groupedResults.map(([round, matches]) => <section key={round} className="msc-cd-round"><div className="msc-cd-round-head"><strong>{round}</strong><span>{matches.length} affiché{matches.length > 1 ? "s" : ""}</span></div>{matches.map((item) => <React.Fragment key={item.id}>{renderResult(item)}</React.Fragment>)}</section>) : <NoData>Aucun résultat disponible pour cette saison. Consulter les autres saisons ou les sources officielles.</NoData>}
      {results.length > visibleResults.length ? <button className="msc-cd-more" type="button" onClick={() => setLimit((value) => value + 120)}>Afficher 120 résultats de plus · {results.length - visibleResults.length} restants</button> : null}
    </div> : null}
    {tab === "fixtures" ? <div className="msc-cd-panel">
      {sortedFixtures.length ? sortedFixtures.slice(0, 120).map((item) => <React.Fragment key={item.id}>{renderFixture(item)}</React.Fragment>) : <NoData>Aucune rencontre programmée disponible. Le calendrier personnel reste dans Agenda.</NoData>}
      {sortedFixtures.length > 120 ? <p className="msc-cd-caution">120 prochaines rencontres affichées. Affiner la saison pour consulter les autres.</p> : null}
    </div> : null}
    {tab === "standings" ? <div className="msc-cd-panel">
      <p className="msc-cd-caution">Bilans calculés à partir des matchs disposant de deux scores complets. Ils ne constituent pas un classement officiel : barèmes, départages et sanctions ne sont pas connus.</p>
      {standings.length ? standings.map((table) => <section key={table.name} className="msc-cd-table-wrap"><h3>{table.name}</h3><div className="msc-cd-table-scroll"><table className="msc-cd-table"><thead><tr><th>#</th><th>Participant</th><th>J</th><th>V</th><th>N</th><th>D</th></tr></thead><tbody>{table.rows.slice(0, 80).map((row, index) => <tr key={normal(row.name)}><td>{index+1}</td><td>{row.name}</td><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td></tr>)}</tbody></table></div></section>) : <NoData>Pas assez de scores complets pour établir un bilan fiable.</NoData>}
    </div> : null}
    {tab === "bracket" ? <div className="msc-cd-panel">
      <p className="msc-cd-caution">Parcours par tour, uniquement pour les matchs identifiés. Aucun lien de qualification entre tours n'est inventé.</p>
      {brackets.length ? brackets.map(([label, bucket]) => <section key={label} className="msc-cd-round"><div className="msc-cd-round-head"><strong>{label}</strong><span>{bucket.matches.length} match{bucket.matches.length > 1 ? "s" : ""}</span></div>{bucket.matches.slice(0, 64).map((item) => <React.Fragment key={item.id}><div className="msc-cd-elim"><span>{item.winner?.name || "À confirmer"}</span><b>{score(item.winner)} : {score(item.loser)}</b><span>{item.loser?.name || "À confirmer"}</span></div></React.Fragment>)}{bucket.matches.length > 64 ? <div className="msc-cd-caution">64 premiers matchs de ce tour affichés.</div> : null}</section>) : <NoData>Aucune phase éliminatoire identifiable dans les résultats reçus.</NoData>}
    </div> : null}
    {tab === "news" ? <div className="msc-cd-panel"><div className="msc-cd-section-top"><h3>Actualités de {competition}</h3></div>{relatedNews.length ? relatedNews.map((item) => <React.Fragment key={item.id}>{renderNews(item)}</React.Fragment>) : <NoData>Pas d'actualité associée de façon fiable à cette compétition pour le moment.</NoData>}</div> : null}
  </div>;
}

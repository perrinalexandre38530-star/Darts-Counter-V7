import React from "react";
import type { DartsLiveResult } from "../dartsLive/types";
import { searchDartsResults, type DartsResultsFilters, type DartsResultsPage } from "./dartsResultsSearch";
import { COUNTRY_NAME_TO_CODE } from "../lib/countryNames";

const CURRENT_YEAR = new Date().getUTCFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1975 + 1 }, (_, i) => String(CURRENT_YEAR - i));
const COUNTRIES = Array.from(new Set(Object.values(COUNTRY_NAME_TO_CODE).filter((code) => /^[A-Z]{2}$/.test(code))))
  .map((code) => {
    let name = code;
    try { name = new Intl.DisplayNames(["fr"],{type:"region"}).of(code) || code; } catch {}
    return {code,name};
  }).sort((a,b) => a.name.localeCompare(b.name,"fr"));
const INITIAL_VISIBLE = 36;

function normalize(value: unknown) {
  return String(value || "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function resultKey(row: DartsLiveResult) {
  const names = [row.winner?.name, row.loser?.name].map(normalize).sort().join("/");
  return `${normalize(row.competition)}|${String(row.playedOn || "").slice(0, 10)}|${names}|${row.winner?.score ?? ""}-${row.loser?.score ?? ""}`;
}
function uniqueRows(rows: DartsLiveResult[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = resultKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => String(b.playedOn || "").localeCompare(String(a.playedOn || "")));
}
function dateText(date?: string | null) {
  if (!date) return "DATE NON PUBLIÉE";
  const parsed = new Date(date.length === 10 ? `${date}T12:00:00Z` : date);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("fr", { day:"2-digit", month:"short", year:"numeric" }).format(parsed) : date;
}
const css = `
.msc-darts-bible{display:grid;gap:10px;padding:12px;background:linear-gradient(140deg,#131b27,#080d15);border:1px solid #3b4655;border-radius:16px;color:#e8f0f8;min-width:0}
.msc-darts-bible .msc-db-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.msc-darts-bible .msc-db-head strong{font-size:14px;letter-spacing:.05em;color:#fff}
.msc-darts-bible .msc-db-head small{font-size:10px;color:#9caebe}
.msc-darts-bible .msc-db-fields{display:grid;grid-template-columns:minmax(190px,2.3fr) repeat(3,minmax(110px,1fr));gap:7px}
.msc-darts-bible .msc-db-fields input,.msc-darts-bible .msc-db-fields select{width:100%;box-sizing:border-box;min-height:40px;padding:8px 10px;border-radius:9px;border:1px solid #435366;background:#0d1520;color:#f4f7fa;font-size:12px;min-width:0}
.msc-darts-bible .msc-db-fields input:focus-visible,.msc-darts-bible select:focus-visible{outline:2px solid #e75273}
.msc-darts-bible .msc-db-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.msc-darts-bible button{cursor:pointer}
.msc-darts-bible .msc-db-search{padding:9px 16px;border-radius:9px;border:1px solid #f05270;background:linear-gradient(110deg,#a7213e,#d93e5b);color:#fff;font-weight:900;font-size:11px}
.msc-darts-bible .msc-db-reset,.msc-darts-bible .msc-db-more{padding:9px 12px;border-radius:9px;border:1px solid #405068;background:#111e2c;color:#dbe5f1;font-weight:800;font-size:11px}
.msc-darts-bible .msc-db-stat{font-size:11px;color:#a4bbcd;line-height:1.5}
.msc-darts-bible .msc-db-stat b{color:#fff}
.msc-darts-bible .msc-db-result{display:grid;grid-template-columns:110px minmax(0,1fr) auto;gap:10px;align-items:center;background:#0d151e;border:1px solid #2e3946;border-radius:10px;padding:10px}
.msc-darts-bible .msc-db-result small{font-size:10px;color:#9aacbd}
.msc-darts-bible .msc-db-names{min-width:0;display:grid;gap:3px;font-size:12px;font-weight:900;overflow-wrap:anywhere}
.msc-darts-bible .msc-db-names span{display:flex;gap:6px;justify-content:space-between;min-width:0}
.msc-darts-bible .msc-db-score{font-size:16px;color:#f5d852;font-variant-numeric:tabular-nums}
.msc-darts-bible .msc-db-comp{color:#ed96a8;font-weight:850;letter-spacing:.01em}
.msc-darts-bible .msc-db-source{font-size:10px;color:#9bc6e7;text-decoration:underline;text-underline-offset:3px}
.msc-darts-bible .msc-db-sources{display:flex;gap:6px;flex-wrap:wrap}
.msc-darts-bible .msc-db-source-pill{padding:5px 8px;border:1px solid #344557;border-radius:999px;background:#101b28;font-size:10px;color:#c9d6e4}
.msc-darts-bible .msc-db-source-pill em{font-style:normal;color:#9bb3c6}
.msc-darts-bible .msc-db-warning{font-size:10px;color:#cbb9a0;line-height:1.45}
.msc-darts-bible .msc-db-empty{padding:17px;text-align:center;background:#0d141d;border:1px dashed #445060;border-radius:9px;font-size:12px;color:#bdcbd9}
@media(max-width:800px){.msc-darts-bible .msc-db-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.msc-darts-bible .msc-db-fields input{grid-column:1/-1}.msc-darts-bible .msc-db-result{grid-template-columns:minmax(0,1fr) auto}.msc-darts-bible .msc-db-result>small{grid-column:1/-1}.msc-darts-bible .msc-db-source{grid-column:1/-1}}
@media(max-width:400px){.msc-darts-bible{padding:8px}.msc-darts-bible .msc-db-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

/** Search the server archives and DartsAPI; a source-directory item is never reported as an imported result. */
export default function DartsResultsExplorer({ localResults = [], sport = "darts", lang = "fr" }: { localResults?: DartsLiveResult[]; sport?: string; lang?: string }) {
  const [q, setQ] = React.useState("");
  const [year, setYear] = React.useState("");
  const [competition, setCompetition] = React.useState("");
  const [source, setSource] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [query, setQuery] = React.useState<DartsResultsFilters>({});
  const [page, setPage] = React.useState<DartsResultsPage | null>(null);
  const [remoteResults, setRemoteResults] = React.useState<DartsLiveResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");
  const [visible, setVisible] = React.useState(INITIAL_VISIBLE);
  const [revision, setRevision] = React.useState(0);
  const [archiveSeen, setArchiveSeen] = React.useState(0);
  const requestId = React.useRef(0);
  const sportLabel = ({darts:"Fléchettes",foot:"Football",pingpong:"Ping-pong",babyfoot:"Baby-foot",petanque:"Pétanque",molkky:"Mölkky"} as Record<string,string>)[sport] || sport;
  const nonDartsSources = React.useMemo(() => Array.from(new Set([...localResults,...remoteResults]
    .map(row=>String(row.sourceName || "").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b)),[localResults,remoteResults]);

  React.useEffect(() => {
    const currentId = ++requestId.current;
    const controller = new AbortController();
    setLoading(true);setError("");setVisible(INITIAL_VISIBLE);setRemoteResults([]);setPage(null);setArchiveSeen(0);
    void searchDartsResults({...query,lang}, controller.signal, sport).then((data) => {
      if (requestId.current !== currentId) return;
      setPage(data);setArchiveSeen(data.archiveScanned || 0);setRemoteResults(uniqueRows(data.results));
    }).catch((e: any) => {
      if (controller.signal.aborted || requestId.current !== currentId) return;
      setError(String(e?.message || e));
    }).finally(() => { if (requestId.current === currentId) setLoading(false); });
    return () => controller.abort();
  }, [query, revision, sport, lang]);

  const matchesFilters = React.useCallback((row: DartsLiveResult) => {
    const meta = row.competitionMeta;
    const tokens = normalize(`${row.competition} ${row.winner?.name} ${row.loser?.name} ${row.round} ${row.sourceName}`);
    if (query.q && !tokens.includes(normalize(query.q))) return false;
    if (query.year && !String(row.playedOn || "").startsWith(query.year)) return false;
    if (query.competition && !normalize(row.competition).includes(normalize(query.competition))) return false;
    if (query.source && !normalize(row.sourceName).includes(normalize(query.source))) return false;
    if (query.country && normalize(meta?.countryCode || meta?.countryName) !== normalize(query.country)) return false;
    if (query.level && normalize(meta?.level) !== normalize(query.level)) return false;
    return true;
  }, [query]);
  const fallback = React.useMemo(() => localResults.filter(matchesFilters), [localResults, matchesFilters]);
  const rows = React.useMemo(() => uniqueRows([...remoteResults, ...fallback]), [remoteResults, fallback]);
  const hasNextPage = !!(page?.nextProviderCursor || page?.nextArchiveCursor || (page?.nextArchiveOffset !== null && page?.nextArchiveOffset !== undefined));

  const loadMore = async () => {
    if (!page || loadingMore) return;
    const currentId = requestId.current;
    setLoadingMore(true);setError("");
    try {
      const next = await searchDartsResults({ ...query, lang, archiveOffset:page.nextArchiveOffset ?? undefined,
        archiveCursor:page.nextArchiveCursor || undefined, providerCursor:page.nextProviderCursor || undefined,
        skipProviders:!page.nextProviderCursor,skipV2:!page.nextArchiveCursor,skipLegacy:page.nextArchiveOffset == null }, undefined, sport);
      if (requestId.current !== currentId) return;
      setRemoteResults((previous) => uniqueRows([...previous,...next.results]));
      setPage({...next,archivePartitions:next.archivePartitions || page.archivePartitions,syncStatus:next.syncStatus || page.syncStatus,providers:next.providers.length?next.providers:page.providers});setArchiveSeen((v)=>v+(next.archiveScanned || 0));setVisible((v) => v + INITIAL_VISIBLE);
    } catch (e:any) { if (requestId.current === currentId) setError(String(e?.message || e)); }
    finally { if (requestId.current === currentId) setLoadingMore(false); }
  };
  const runSearch = () => setQuery({q:q.trim().slice(0,100),year,competition:competition.trim().slice(0,100),country,level,source});
  const reset = () => { setQ("");setYear("");setCompetition("");setSource("");setCountry("");setLevel("");setQuery({});setRevision((n) => n+1); };
  return <section className="msc-darts-bible" aria-label="Recherche mondiale des résultats de fléchettes">
    <style>{css}</style>
    <div className="msc-db-head"><strong>🏆 RÉSULTATS · {sportLabel.toLocaleUpperCase("fr")}</strong><small>Scores structurés · Sources identifiées lorsque disponibles</small></div>
    <form className="msc-db-fields" onSubmit={(e) => {e.preventDefault();runSearch();}}>
      <input aria-label="Joueur, tournoi ou score" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Joueur, tournoi, ligue, club…" />
      <select aria-label="Année" value={year} onChange={(e)=>setYear(e.target.value)}><option value="">Toutes les années</option>{YEARS.map((v)=><option value={v} key={v}>{v}</option>)}</select>
      <select aria-label="Source" value={source} onChange={(e)=>setSource(e.target.value)}><option value="">Toutes les sources</option>{(sport === "darts" ? ["DartsAPI","DartUP","PDC","MODUS","WDF","CDC","DartsInfo","DartsNZ","MSS"] : nonDartsSources).map(name=><option key={name} value={name}>{name}</option>)}</select>
      <select aria-label="Niveau" value={level} onChange={(e)=>setLevel(e.target.value)}><option value="">Tous niveaux</option><option value="elite">Élite</option><option value="pro">Pro</option><option value="semi_pro">Semi-pro</option><option value="amateur">Amateur</option><option value="grassroots">Clubs / ligues</option><option value="mixed">Mixte</option></select>
      <input aria-label="Compétition" value={competition} onChange={(e)=>setCompetition(e.target.value)} placeholder="Filtrer par compétition…" />
      <select aria-label="Pays" value={country} onChange={(e)=>setCountry(e.target.value)}><option value="">Tous pays</option>{COUNTRIES.map(({code,name})=><option key={code} value={code}>{name}</option>)}</select>
      <button className="msc-db-search" type="submit" disabled={loading}>⌕ RECHERCHER LES RÉSULTATS</button>
    </form>
    <div className="msc-db-actions"><button className="msc-db-reset" type="button" onClick={reset}>EFFACER LES FILTRES</button><button className="msc-db-reset" type="button" onClick={()=>setRevision((v)=>v+1)} disabled={loading}>↻ ACTUALISER</button><span className="msc-db-stat">{loading ? "Recherche en cours…" : <><b>{rows.length}</b> matchs affichables · <b>{page?.archiveMatches ?? 0}</b> correspondances trouvées sur les pages consultées{page?.archivePersistent ? " · R2" : " · sans archive R2"}</>}</span></div>
    {sport === "darts" && page && <div className="msc-db-stat" aria-live="polite">
      <b>Couverture vérifiable :</b> {page.archivePartitions || 0} archives mensuelles/source enregistrées · {archiveSeen} examinées depuis cette recherche.
      {page.syncStatus?.recent?.updatedAt ? <> · Collecte récente : {dateText(page.syncStatus.recent.updatedAt)} ({page.syncStatus.recent.lastError ? "erreur" : "exécutée"})</> : " · Collecte planifiée non constatée"}.
      {page.syncStatus?.backfill?.period ? <> · Rattrapage historique : {page.syncStatus.backfill.period}</> : " · Rattrapage non démarré"}.
      Ces chiffres ne représentent pas toutes les rencontres mondiales.
    </div>}
    {!!page?.providers?.length && <div className="msc-db-sources">{page.providers.map((provider)=><span key={provider.id} title={provider.detail} className="msc-db-source-pill">{provider.label} · <em>{provider.state === "connected" ? `${provider.count} chargés` : provider.state === "directory" ? "annuaire seul" : provider.state === "unconfigured" ? "non connecté" : provider.state === "restricted" ? "accès limité" : "indisponible"}</em></span>)}</div>}
    {error && <div className="msc-db-warning" role="alert">{error} · Les résultats déjà présents dans MSS restent consultables ci-dessous.</div>}
    {page?.partial && <div className="msc-db-warning">Couverture partielle : les plateformes sans API, sans licence ou sans export autorisé ne sont pas indexées. Le chargement par pages ne prouve pas l’exhaustivité d’un circuit.</div>}
    {page?.warnings?.map((warning,i)=><div key={`${i}-${warning}`} className="msc-db-warning">{warning}</div>)}
    {!rows.length && hasNextPage && !loading && <div className="msc-db-warning">Aucun match dans les premières archives consultées. La recherche peut continuer sur les mois plus anciens grâce au bouton ci-dessous.</div>}
    {rows.length ? <div style={{display:"grid",gap:6}}>{rows.slice(0,visible).map((row)=>{
      const sourceUrl = /^https:\/\//i.test(String(row.sourceUrl || "")) ? row.sourceUrl : undefined;
      return <article className="msc-db-result" key={resultKey(row)}>
        <small>{dateText(row.playedOn)}<div className="msc-db-comp" translate="no">{row.competition || "Compétition non indiquée"}</div><div>{row.round ? String(row.round).replace(/_/g," ") : ""}</div></small>
        <div className="msc-db-names" translate="no"><span>{row.winner?.name || "—"}<b className="msc-db-score">{row.winner?.score ?? "—"}</b></span><span>{row.loser?.name || "—"}<b className="msc-db-score">{row.loser?.score ?? "—"}</b></span></div>
        {sourceUrl ? <a className="msc-db-source" href={sourceUrl} target="_blank" rel="noopener noreferrer">{row.sourceName || "Voir la source"} ↗</a> : <span style={{fontSize:10,color:"#99aabd"}}>{row.sourceName || "Source non indiquée"}</span>}
      </article>;
    })}</div> : !loading && !hasNextPage && <div className="msc-db-empty">Aucun score vérifié pour cette recherche. Essaie une autre année, un autre joueur ou vérifie la connexion des fournisseurs affichée ci-dessus.</div>}
    {rows.length > visible && <button className="msc-db-more" type="button" onClick={()=>setVisible((n)=>n+INITIAL_VISIBLE)}>AFFICHER {Math.min(INITIAL_VISIBLE,rows.length-visible)} RÉSULTATS DE PLUS</button>}
    {hasNextPage && rows.length <= visible && <button className="msc-db-more" type="button" disabled={loadingMore} onClick={()=>void loadMore()}>{loadingMore ? "CHARGEMENT…" : "CHARGER LA PAGE SUIVANTE DES FOURNISSEURS"}</button>}
  </section>;
}

import React from "react";
import { useLang } from "../contexts/LangContext";
import { useSport } from "../contexts/SportContext";
import type { SportId } from "../contexts/SportContext";
import type { DartsLiveFixture, DartsLiveMatch, DartsLivePlayer, DartsLiveResult } from "../dartsLive/types";
import {
  SPORT_LIVE_META,
  SPORT_LIVE_REGION_LABELS,
  getAvailableRegions,
  getRecommendedSportSources,
  getSportSources,
} from "./catalog";
import { fetchSportLiveOverview, getCachedSportLiveOverview, mergeSportLiveOverview } from "./liveApi";
import type { SportLiveCompetitionIndexEntry, SportLiveEvent, SportLiveNewsItem, SportLiveOverview, SportLiveRegion, SportLiveSource } from "./types";
import { isLiveSportsSupportedSport } from "./support";

type View = "overview" | "live" | "fixtures" | "results" | "news" | "sources";
type RegionFilter = "recommended" | "all" | SportLiveRegion;
type FloatingPanel = "news" | "results" | "fixtures" | "sources" | null;

type TickerItem = {
  id: string;
  sport: string;
  label: string;
  score?: string;
  meta: string;
  live?: boolean;
};

const REFRESH_MS = 15 * 60 * 1000;

function refreshIntervalFor(sport: SportId, feed: SportLiveOverview | null) {
  if (!feed?.configured) return null;
  if (feed.liveAvailable) {
    if (sport === "pingpong") return 30 * 1000;
    if (sport === "darts") return 2 * 60 * 1000;
  }
  if (sport === "babyfoot" || sport === "molkky" || sport === "petanque") return 30 * 60 * 1000;
  return REFRESH_MS;
}

function niceRound(value: string | null | undefined) {
  const raw = String(value || "").trim();
  return raw ? raw.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "";
}

function formatDateTime(value: string | null | undefined, lang: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(lang || "fr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function formatDate(value: string | null | undefined, lang: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(lang || "fr", { day: "2-digit", month: "short" }).format(date);
  } catch {
    return value;
  }
}

function scoreValue(score: number | null | undefined) {
  return score === null || score === undefined || Number.isNaN(Number(score)) ? "—" : String(score);
}

function shortCompetition(competition?: string | null) {
  const label = String(competition || "").trim();
  if (!label) return "LIVE";
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 3) || label.slice(0, 3).toUpperCase();
}

function bestPrimaryLink(source?: SportLiveSource | null) {
  return source?.scoresUrl || source?.watchUrl || source?.resultsUrl || source?.calendarUrl || source?.homeUrl || null;
}

function playerInitials(name?: string | null) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

const KNOWN_DARTS_COUNTRIES: Record<string, string> = {
  "luke littler":"GB", "luke humphries":"GB", "michael van gerwen":"NL", "gerwyn price":"GB", "gary anderson":"GB",
  "rob cross":"GB", "peter wright":"GB", "stephen bunting":"GB", "james wade":"GB", "dave chisnall":"GB",
  "jonny clayton":"GB", "nathan aspinall":"GB", "ross smith":"GB", "ryan searle":"GB", "chris dobey":"GB",
  "danny noppert":"NL", "gian van veen":"NL", "wessel nijman":"NL", "kevin doets":"NL", "niels zonneveld":"NL",
  "dirk van duijvenbode":"NL", "jermaine wattimena":"NL", "michael smith":"GB", "cameron menzies":"GB", "martin schindler":"DE",
  "niko springer":"DE", "ricardo pietreczko":"DE", "gabriel clemens":"DE", "krzysztof ratajski":"PL", "karel sedlacek":"CZ",
  "mensur suljovic":"AT", "damon heta":"AU", "simon whitlock":"AU", "ryan joyce":"GB", "william o'connor":"IE",
  "william o’connor":"IE", "brendan dolan":"GB", "josh rock":"GB", "daryl gurney":"GB", "kim huybrechts":"BE",
  "dimitri van den bergh":"BE", "jeffrey de graaf":"SE", "raymond van barneveld":"NL", "beau greaves":"GB", "fallon sherrock":"GB",
  "leonard gates":"US", "adam sevada":"US", "fred krueger":"US", "alex spellman":"US", "joey lynaugh":"US",
  "david cameron":"CA", "matt campbell":"CA", "jeff smith":"CA", "jim long":"CA", "brayden hall":"CA",
  "rashad sweeting":"BS", "jesus salate":"AR", "haupai puha":"NZ", "ben robb":"NZ", "mark cleaver":"NZ",
};

function normalizedPlayerName(name?: string | null) {
  return String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function inferredCountryCode(player?: DartsLivePlayer | null, sourceName?: string | null) {
  const explicit = String(player?.countryCode || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(explicit)) return explicit;
  const known = KNOWN_DARTS_COUNTRIES[normalizedPlayerName(player?.name)];
  if (known) return known;
  if (/darts new zealand|\bdnz\b/i.test(String(sourceName || ""))) return "NZ";
  return null;
}

function countryFlag(code?: string | null) {
  const cc = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...cc.split("").map((char) => 127397 + char.charCodeAt(0)));
}

function itemSource(item: any, fallback?: SportLiveSource | null) {
  const raw = item?.raw && typeof item.raw === "object" ? item.raw : {};
  return {
    name: String(item?.sourceName || raw?.source || fallback?.shortName || fallback?.name || "OFFICIEL"),
    url: String(item?.sourceUrl || raw?.sourceUrl || bestPrimaryLink(fallback) || "") || null,
  };
}

function sourceLabel(source?: SportLiveSource | null) {
  return source?.shortName || source?.name || "OFFICIEL";
}

function hostFromUrl(value?: string | null) {
  try {
    const url = new URL(String(value || ""));
    return url.hostname || null;
  } catch {
    return null;
  }
}

function faviconUrl(value?: string | null, size = 64) {
  const host = hostFromUrl(value);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(`https://${host}`)}`;
}

function normalizedText(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function sourceImageFromSource(source?: SportLiveSource | null) {
  return faviconUrl(bestPrimaryLink(source) || source?.homeUrl || null, 64);
}

function sourceImageFromItem(item: { sourceUrl?: string | null } | null | undefined, fallback?: SportLiveSource | null) {
  return faviconUrl(item?.sourceUrl || bestPrimaryLink(fallback) || fallback?.homeUrl || null, 64);
}

function competitionLogoSrc(sport: string, url?: string | null) {
  const raw = String(url || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname || ["files", "styles", "image", "images"].includes(parsed.hostname.toLowerCase())) return null;
  } catch { return null; }
  return `/api/sports-live/${encodeURIComponent(sport)}/logo?url=${encodeURIComponent(raw)}`;
}

function findCompetitionImage(competition: string, rows: DartsLiveResult[], _newsRows: SportLiveNewsItem[], _sources: SportLiveSource[]) {
  // Competition selectors must never pretend a news photo or a source favicon is
  // the official competition logo. Only a logo explicitly resolved in the
  // competition metadata is eligible here. Otherwise the UI falls back to a
  // deterministic text mark/abbreviation.
  const metaLogo = rows
    .map((row) => competitionMetaOf(row)?.logoUrl)
    .find((value) => /^https?:\/\//i.test(String(value || "")));
  return metaLogo ? String(metaLogo) : null;
}

function competitionInitials(name?: string | null) {
  const clean = String(name || "").trim();
  if (!clean) return "🏆";
  const stop = new Set(["the","of","de","du","des","la","le","les","and","darts","open","tour","championship","championships","cup"]);
  const words = clean.split(/\s+/).map((part) => part.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
  const significant = words.filter((word) => !stop.has(word.toLowerCase()));
  const base = significant.length ? significant : words;
  if (!base.length) return "🏆";
  if (base.length === 1) return base[0].slice(0, 3).toUpperCase();
  return base.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

function CompetitionMark({ sport, name, logoUrl, className = "msc-results-nav-visual" }: { sport: string; name: string; logoUrl?: string | null; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [logoUrl]);
  const proxied = !failed && logoUrl ? competitionLogoSrc(sport, logoUrl) : null;
  return (
    <span className={`${className}${proxied ? " has-logo" : " is-fallback"}`} aria-hidden="true">
      {proxied ? <img src={proxied} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>{competitionInitials(name)}</span>}
    </span>
  );
}

function PlayerAvatar({ player, sourceName, className }: { player?: DartsLivePlayer | null; sourceName?: string | null; className: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [player?.photoUrl]);
  const flag = countryFlag(inferredCountryCode(player, sourceName));
  const fallback = playerInitials(player?.name);
  return (
    <div className={className} aria-hidden="true">
      {player?.photoUrl && !failed ? <img src={player.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span>{fallback || flag || "?"}</span>}
    </div>
  );
}

function competitionVisualTone(value?: string | null) {
  const key = normalizedText(value);
  if (/pdc|players|european|uk open|matchplay|masters|trophy/.test(key)) return "is-red";
  if (/wdf|world|world cup|world championship|world masters/.test(key)) return "is-blue";
  if (/modus/.test(key)) return "is-purple";
  if (/cdc|north america|latin|caribbean/.test(key)) return "is-gold";
  if (/new zealand|dnz|austral/.test(key)) return "is-green";
  return "is-neutral";
}

function competitionKey(value?: string | null) {
  return String(value || "Compétition officielle").replace(/\s+/g, " ").trim();
}

function competitionGroupingKey(value?: string | null, sport?: string | null) {
  let key = normalizedText(value || "competition officielle")
    .replace(/20\d{2}(?:\s*[-/]\s*\d{2,4})?/g, " ")
    .replace(/season\s+20\d{2}(?:\s*[-/]\s*\d{2,4})?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (sport === "darts") {
    key = key
      .replace(/^(?:betmgm|betfred|boylesports|cazoo|machineseeker|mr vegas|neo bet|eltEN|ladbrokes|paddy power|interwetten)\s+/i, "")
      .replace(/(?:sponsored by|presented by).*$/i, "")
      .trim();
  }
  return key || normalizedText(value || "competition officielle");
}

function preferredCompetitionName(current: string, candidate: string) {
  const noisy = /(?:betmgm|betfred|boylesports|cazoo|machineseeker|mr vegas|neo bet|ladbrokes|paddy power|interwetten)/i;
  const currentNoisy = noisy.test(current);
  const candidateNoisy = noisy.test(candidate);
  if (currentNoisy !== candidateNoisy) return currentNoisy ? candidate : current;
  return candidate.length < current.length ? candidate : current;
}

function resultSeasonLabel(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "NON DATÉ";
  const match = raw.match(/(20\d{2}|19\d{2})/);
  return match?.[1] || "NON DATÉ";
}

function competitionIcon(value?: string | null) {
  const name = competitionKey(value).toLowerCase();
  if (/modus/.test(name)) return "⚡";
  if (/world championship|world cup|world masters|wdf/.test(name)) return "🌐";
  if (/players championship|pdc|european|euro|grand prix|matchplay|uk open|masters|trophy/.test(name)) return "🎯";
  if (/cdc|north america|latin|caribbean/.test(name)) return "🌎";
  if (/new zealand|dnz/.test(name)) return "🥝";
  if (/austral/.test(name)) return "🇦🇺";
  if (/france|ffd/.test(name)) return "🇫🇷";
  if (/nordic|baltic/.test(name)) return "❄️";
  if (/asian|asia|japan|china/.test(name)) return "🌏";
  return "🏆";
}

function normalizedRound(value?: string | null) {
  const round = niceRound(value);
  if (!round || /^Match\s+\d+$/i.test(round)) return "MATCHS";
  return round
    .replace(/^Qf$/i, "Quarter-finals")
    .replace(/^Sf$/i, "Semi-finals")
    .replace(/^Quarterfinals$/i, "Quarter-finals")
    .replace(/^Semifinals$/i, "Semi-finals");
}

function roundOrder(value: string) {
  const round = value.toLowerCase();
  const last = round.match(/last\s+(\d+)/i);
  if (last) return 1000 - Number(last[1]);
  const numeric = round.match(/round(?: of)?\s+(\d+)/i);
  if (numeric) return 1000 - Number(numeric[1]);
  if (/quarter/.test(round)) return 2000;
  if (/semi/.test(round)) return 3000;
  if (/final/.test(round)) return 4000;
  if (/match/.test(round)) return 500;
  return 1200;
}



function competitionMetaOf(row?: DartsLiveResult | DartsLiveFixture | DartsLiveMatch | null) {
  return (row as any)?.competitionMeta || null;
}

function levelLabel(value?: string | null) {
  const labels: Record<string,string> = { elite:"Élite", pro:"Pro", semi_pro:"Semi-pro", amateur:"Amateur", grassroots:"Grassroots", mixed:"Mixte" };
  return labels[String(value || "")] || "";
}

function familyLabel(value?: string | null) {
  const labels: Record<string,string> = { national_teams:"Sélections", continental:"Continental", domestic_league:"Championnat", domestic_cup:"Coupe", regional:"Régional", amateur:"Amateur", youth:"Jeunes", women:"Féminin", world:"Monde", other:"Autre" };
  return labels[String(value || "")] || "";
}

function competitionGeography(row?: DartsLiveResult | null) {
  const meta = competitionMetaOf(row);
  if (!meta) return "AUTRES";
  if (meta.family === "national_teams") return "SÉLECTIONS";
  if (meta.family === "world" || meta.continent === "Monde") return "MONDE";
  if (meta.countryName) return String(meta.countryName).toUpperCase();
  if (meta.continent) return String(meta.continent).toUpperCase();
  if (meta.family === "continental") return "CONTINENTAL";
  return "AUTRES";
}

function competitionContinent(row?: DartsLiveResult | null) {
  const meta = competitionMetaOf(row);
  if (!meta) return "AUTRES";
  if (meta.family === "world" || String(meta.continent || "").toLowerCase() === "monde") return "MONDE";
  const continent = String(meta.continent || "").trim();
  if (continent) return continent.toUpperCase();
  if (meta.family === "national_teams") return "SÉLECTIONS";
  return "AUTRES";
}

function competitionCountry(row?: DartsLiveResult | null) {
  const meta = competitionMetaOf(row);
  if (!meta) return { key: "AUTRES", label: "Autres", code: null as string | null };
  if (meta.family === "world") return { key: "MONDE", label: "Monde", code: null as string | null };
  const label = String(meta.countryName || meta.regionLabel || "").trim();
  const code = /^[A-Za-z]{2}$/.test(String(meta.countryCode || "")) ? String(meta.countryCode).toUpperCase() : null;
  if (label) return { key: label.toUpperCase(), label, code };
  if (meta.family === "continental") return { key: "CONTINENTAL", label: "Continental", code: null as string | null };
  if (meta.family === "national_teams") return { key: "SÉLECTIONS", label: "Sélections", code };
  return { key: "AUTRES", label: "Autres", code };
}

function continentIcon(label: string) {
  const key = normalizedText(label);
  if (/monde/.test(key)) return "🌍";
  if (/europe/.test(key)) return "🇪🇺";
  if (/asie/.test(key)) return "🌏";
  if (/oceanie/.test(key)) return "🌊";
  if (/afrique/.test(key)) return "🌍";
  if (/amerique du nord|north america|concacaf/.test(key)) return "🌎";
  if (/amerique du sud|south america|conmebol/.test(key)) return "🌎";
  if (/amerique/.test(key)) return "🌎";
  if (/selection/.test(key)) return "🌐";
  return "🧭";
}

function countryVisual(code?: string | null, label?: string | null) {
  const flag = countryFlag(code || null);
  if (flag) return flag;
  if (/monde/i.test(String(label || ""))) return "🌍";
  if (/continental/i.test(String(label || ""))) return "🌐";
  if (/selection/i.test(String(label || ""))) return "🏳️";
  return "🏳️";
}

function competitionLevelGroup(row?: DartsLiveResult | null) {
  const meta = competitionMetaOf(row);
  if (!meta) return "AUTRES";
  if (meta.family === "national_teams") return "SÉLECTIONS";
  if (meta.family === "youth" || meta.age) return "JEUNES";
  if (meta.gender === "women" || meta.family === "women") return "FÉMININ";
  if (meta.level === "grassroots") return "GRASSROOTS";
  if (meta.level === "amateur" || meta.family === "amateur" || meta.family === "regional") return "AMATEUR";
  if (meta.level === "semi_pro") return "SEMI-PRO";
  if (meta.level === "pro") return "PRO";
  if (meta.level === "elite" || meta.family === "world" || meta.family === "continental") return "ÉLITE";
  return familyLabel(meta.family).toUpperCase() || "AUTRES";
}

function categoryIcon(label: string) {
  const key = label.toLowerCase();
  if (/selection/.test(key)) return "🌐";
  if (/monde/.test(key)) return "🌍";
  if (/europe/.test(key)) return "🇪🇺";
  if (/asie/.test(key)) return "🌏";
  if (/oceanie/.test(key)) return "🌊";
  if (/afrique/.test(key)) return "🌍";
  if (/amerique/.test(key)) return "🌎";
  if (/amateur|grassroots/.test(key)) return "🏘️";
  if (/semi/.test(key)) return "🛠️";
  if (/pro|elite/.test(key)) return "🏆";
  if (/jeunes/.test(key)) return "🌱";
  if (/feminin/.test(key)) return "♀";
  return "🏳️";
}

function competitionMetaChips(row?: DartsLiveResult | null) {
  const meta = competitionMetaOf(row);
  if (!meta) return [] as string[];
  return [meta.regionLabel || meta.countryName || meta.continent, familyLabel(meta.family), meta.tier, levelLabel(meta.level), meta.gender === "women" ? "Féminin" : meta.gender === "mixed" ? "Mixte" : null, meta.age]
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index) as string[];
}

function dateTs(value?: string | null) {
  const ts = value ? Date.parse(value) : NaN;
  return Number.isFinite(ts) ? ts : 0;
}

function newsTitleTokens(value?: string | null) {
  const stop = new Set(["the","a","an","and","or","of","to","in","on","for","with","at","from","is","are","was","were","be","this","that","as","by","de","du","des","la","le","les","un","une","et","en","sur","pour","avec","dans","au","aux","darts","dart","football","soccer","live","result","results","news"]);
  return normalizedText(value).split(/\s+/).filter((token) => token.length >= 3 && !stop.has(token));
}

function newsTitleSimilarity(a?: string | null, b?: string | null) {
  const aa = new Set(newsTitleTokens(a));
  const bb = new Set(newsTitleTokens(b));
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  aa.forEach((token) => { if (bb.has(token)) common += 1; });
  return common / Math.max(1, Math.min(aa.size, bb.size));
}

function dedupeNewsRows(rows: SportLiveNewsItem[]) {
  const out: SportLiveNewsItem[] = [];
  rows.forEach((item) => {
    const day = String(item.publishedAt || "").slice(0, 10);
    const duplicate = out.some((existing) => {
      const otherDay = String(existing.publishedAt || "").slice(0, 10);
      if (day && otherDay && day !== otherDay) return false;
      const similarity = newsTitleSimilarity(item.title, existing.title);
      if (similarity >= 0.82) return true;
      const sameSource = normalizedText(item.sourceName) && normalizedText(item.sourceName) === normalizedText(existing.sourceName);
      return !!sameSource && similarity >= 0.68;
    });
    if (!duplicate) out.push(item);
  });
  return out;
}

function orderNewsEditorial(rows: SportLiveNewsItem[]) {
  rows = dedupeNewsRows(rows);
  const scopeWeight: Record<string, number> = { local: 3, regional: 2, world: 1 };
  const kindWeight: Record<string, number> = { live: 5, result: 4, news: 3, upcoming: 2 };
  const sorted = [...rows].sort((a, b) => {
    const fresh = dateTs(b.publishedAt) - dateTs(a.publishedAt);
    if (Math.abs(fresh) > 6 * 60 * 60 * 1000) return fresh;
    const kind = (kindWeight[b.kind] || 0) - (kindWeight[a.kind] || 0);
    if (kind) return kind;
    const image = Number(!!b.imageUrl) - Number(!!a.imageUrl);
    if (image) return image;
    return (scopeWeight[b.scope || ""] || 0) - (scopeWeight[a.scope || ""] || 0);
  });

  // Newspaper-style interleaving: keep freshness, but avoid long runs from the
  // same provider or geographic scope when other verified items are available.
  const queue = [...sorted];
  const out: SportLiveNewsItem[] = [];
  while (queue.length) {
    const recent = out.slice(-2);
    let index = queue.findIndex((candidate) => {
      const source = String(candidate.sourceName || "").toLowerCase();
      const sameSource = recent.some((item) => String(item.sourceName || "").toLowerCase() === source && source);
      const sameScope = recent.length >= 2 && recent.every((item) => item.scope && item.scope === candidate.scope);
      return !sameSource && !sameScope;
    });
    if (index < 0) index = 0;
    out.push(queue.splice(index, 1)[0]);
  }
  return out;
}

function LiveStyles() {
  return (
    <style>{`
      .msc-live-root {
        --live-red: #ff3048;
        --live-red-deep: #9c1526;
        --live-bg: #07090c;
        --live-panel: #0e1217;
        --live-panel-2: #121820;
        --live-line: rgba(255,255,255,.11);
        --live-text: #f7f8fa;
        --live-muted: #8f99a5;
        position: relative;
        isolation: isolate;
        margin: -4px -2px 0;
        padding: 10px 10px 96px;
        min-height: calc(100vh - 90px);
        color: var(--live-text);
        background: linear-gradient(180deg,#07090c 0%,#090c10 42%,#07090c 100%);
        overflow: hidden;
      }
      .msc-live-root::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        background:
          radial-gradient(800px 260px at 50% -80px, var(--live-accent-soft), transparent 70%),
          linear-gradient(90deg, transparent, rgba(255,255,255,.018) 50%, transparent);
      }
      .msc-live-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        padding: 5px 62px 9px 2px;
        border-bottom: 1px solid var(--live-line);
      }
      .msc-live-kicker { font-size: 9px; letter-spacing: 1.45px; font-weight: 1000; color: #aeb5bf; }
      .msc-live-title { margin-top: 2px; font-size: clamp(24px,6vw,34px); line-height: .98; font-weight: 1000; letter-spacing: -.7px; }
      .msc-live-title strong { color: var(--live-accent); }
      .msc-live-subtitle { margin-top: 5px; font-size: 11px; color: #aeb5bf; font-weight: 750; }
      .msc-live-refresh {
        width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--live-line);
        color: #fff; background: #10151b; font-size: 16px; font-weight: 1000; cursor: pointer;
      }
      .msc-live-refresh:disabled { opacity: .45; cursor: default; }
      .msc-score-ticker {
        display:grid; grid-template-columns: 82px 1fr; margin: 8px -10px 0; min-height:48px;
        border-top:1px solid #272e36; border-bottom:1px solid #272e36; background:#0a0d11; overflow:hidden;
      }
      .msc-score-ticker-label {
        display:flex; align-items:center; justify-content:center; text-align:center; padding:6px 5px;
        background: linear-gradient(135deg,#d31e35,#7b0f1f); color:#fff; font-size:9.5px; font-weight:1000; letter-spacing:.2px;
      }
      .msc-score-ticker-window { overflow:hidden; }
      .msc-score-ticker-track { display:inline-flex; min-width:max-content; white-space:nowrap; animation: mscScoreRail 24s linear infinite; }
      .msc-score-ticker-track.is-static { animation:none; }
      .msc-score-ticker-item {
        min-width:178px; min-height:48px; display:flex; flex-direction:column; justify-content:center; padding:5px 11px;
        border-right:1px solid #252b32;
      }
      .msc-score-ticker-sport { font-size:8.5px; color:#828c98; text-transform:uppercase; font-weight:900; }
      .msc-score-ticker-main { margin-top:3px; font-size:11px; font-weight:950; }
      .msc-score-ticker-score { color:#ff4359; margin-left:7px; font-size:10.5px; font-weight:1000; }
      .msc-score-ticker-meta { margin-top:2px; font-size:8.5px; color:#818b96; }
      @keyframes mscScoreRail { from { transform:translateX(0); } to { transform:translateX(-50%); } }
      @media (prefers-reduced-motion: reduce) { .msc-score-ticker-track { animation:none; } }
      .msc-live-tabs {
        display:flex; gap:3px; overflow-x:auto; padding: 9px 0 2px; scrollbar-width:none;
      }
      .msc-live-tabs::-webkit-scrollbar { display:none; }
      .msc-live-tab {
        flex:0 0 auto; min-height:33px; padding:6px 9px; border:0; border-bottom:2px solid transparent;
        background:transparent; color:#87919d; font-size:9.5px; font-weight:1000; cursor:pointer; letter-spacing:.25px;
      }
      .msc-live-tab.is-active { color:#fff; border-bottom-color:var(--live-accent); }
      .msc-live-section { margin-top:13px; }
      .msc-live-section-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
      .msc-live-section-mark { width:5px; height:28px; border-radius:1px; background:var(--live-accent); }
      .msc-live-section-title { font-size:21px; line-height:1; font-weight:1000; letter-spacing:.15px; white-space:nowrap; }
      .msc-live-section-line { height:2px; flex:1; min-width:24px; background:linear-gradient(90deg,var(--live-accent),transparent); }
      .msc-live-section-count { font-size:10px; color:#89939e; font-weight:900; white-space:nowrap; }
      .msc-match-card {
        overflow:hidden; border:1px solid #29313a; border-radius:11px; background:#0d1116; margin-bottom:10px;
        box-shadow:0 7px 18px rgba(0,0,0,.24);
      }
      .msc-match-top {
        min-height:40px; display:flex; align-items:center; gap:10px; padding:0 10px 0 0;
        background:#11161c; border-bottom:1px solid #29313a;
      }
      .msc-match-code {
        align-self:stretch; min-width:58px; display:grid; place-items:center; padding:0 8px;
        color:#121212; background:var(--live-accent); font-size:10px; font-weight:1000;
      }
      .msc-match-heading { min-width:0; flex:1; }
      .msc-match-comp { font-size:10px; font-weight:1000; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .msc-match-round { margin-top:2px; font-size:9px; color:#8d97a3; }
      .msc-status {
        flex:0 0 auto; padding:4px 7px; border-radius:7px; border:1px solid #47515c; color:#dfe3e8;
        font-size:9px; font-weight:1000; background:#181e25;
      }
      .msc-status.is-live { color:#fff; background:#d92037; border-color:#ff3f55; box-shadow:0 0 12px rgba(255,48,72,.23); }
      .msc-source-link {
        flex:0 0 auto; display:inline-flex; align-items:center; gap:6px; min-height:29px; padding:5px 8px; border-radius:7px;
        border:1px solid #3d4854; color:#e5e9ee; background:#0b0f14; text-decoration:none; font-size:10.5px; font-weight:900;
      }
      .msc-event-card {
        display:grid; grid-template-columns:64px minmax(0,1fr) auto; gap:12px; align-items:center;
        padding:9px; margin-bottom:7px; border:1px solid #29313a; border-radius:13px; background:#0d1116;
      }
      .msc-event-date {
        min-height:45px; display:grid; place-items:center; padding:7px 5px; border-radius:10px; text-align:center;
        background:#151b22; border:1px solid #323b45; color:#f1f4f7; font-size:9px; line-height:1.1; font-weight:1000;
      }
      .msc-event-title { font-size:12.5px; font-weight:1000; line-height:1.15; }
      .msc-event-sub { margin-top:4px; color:#8f99a5; font-size:9.5px; line-height:1.3; }
      .msc-event-result { margin-top:6px; color:#ffd45b; font-size:10px; font-weight:1000; }
      .msc-event-link {
        min-height:32px; display:inline-flex; align-items:center; justify-content:center; padding:6px 9px; border-radius:8px;
        border:1px solid #3b4651; color:#fff; text-decoration:none; background:#131920; font-size:10px; font-weight:1000;
      }
      @media (max-width:520px) {
        .msc-event-card { grid-template-columns:58px minmax(0,1fr); }
        .msc-event-card .msc-event-link { grid-column:1 / -1; width:100%; }
      }
      .msc-match-body {
        position:relative; display:grid; grid-template-columns:minmax(0,1fr) 94px minmax(0,1fr); align-items:center; gap:8px;
        padding:11px 9px 10px; background:
          linear-gradient(90deg,var(--live-accent-faint),transparent 30%,transparent 70%,var(--live-accent-faint)),
          #090d11;
      }
      .msc-player { min-width:0; display:flex; align-items:center; gap:9px; }
      .msc-player.is-right { flex-direction:row-reverse; text-align:right; }
      .msc-player-flag { margin-left:6px; }
      .msc-player-badge img { width:100%; height:100%; object-fit:cover; display:block; }
      .msc-player-badge > span { font-size:11px; font-weight:1000; letter-spacing:.25px; }
      .msc-player-badge {
        flex:0 0 38px; width:38px; height:38px; border-radius:50%; display:grid; place-items:center; font-size:10.5px; font-weight:1000;
        border:1px solid var(--live-accent); color:#fff; background:linear-gradient(145deg,#1c242d,#0b0f13);
        box-shadow:0 0 0 3px rgba(255,255,255,.025);
      }
      .msc-player-name { font-size:clamp(11.5px,3.1vw,15px); line-height:1.06; font-weight:1000; overflow:hidden; text-overflow:ellipsis; }
      .msc-player-meta { margin-top:3px; font-size:8.5px; color:#818c98; font-weight:900; }
      .msc-score-box {
        padding:8px 4px; border-radius:8px; border:1px solid #a92334; background:linear-gradient(180deg,#351019,#19090e);
        text-align:center; font-size:23px; line-height:1; font-weight:1000; font-variant-numeric:tabular-nums; letter-spacing:.5px;
      }
      .msc-score-sep { color:#8e4650; padding:0 2px; }
      .msc-match-foot {
        display:flex; align-items:center; justify-content:center; gap:7px; min-height:28px; padding:7px 10px;
        border-top:1px solid #222a32; background:#0a0e12; color:#9aa4af; font-size:9px; font-weight:850; text-align:center;
      }
      .msc-dot { width:7px; height:7px; border-radius:50%; background:var(--live-accent); box-shadow:0 0 9px var(--live-accent); }
      .msc-result-card { margin-bottom:7px; overflow:hidden; border:1px solid #29313a; border-radius:10px; background:#0b0f14; }
      .msc-result-head { min-height:25px; display:flex; align-items:center; gap:7px; padding:4px 7px; border-bottom:1px solid #202831; background:#10151b; }
      .msc-result-comp { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; font-weight:1000; color:#cbd2da; }
      .msc-result-round { flex:0 0 auto; font-size:8px; color:#7f8995; font-weight:850; }
      .msc-result-date { flex:0 0 auto; font-size:8px; color:#aab2bc; font-weight:900; }
      .msc-result-source {
        flex:0 0 auto; display:inline-flex; align-items:center; gap:6px; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:3px 6px; border-radius:999px; border:1px solid #39434d; color:#cfd6de; text-decoration:none; font-size:7.5px; font-weight:1000; }
      .msc-result-source span { overflow:hidden; text-overflow:ellipsis; }
      
      .msc-source-link img, .msc-result-source img, .msc-news-source img { width:16px; height:16px; border-radius:5px; object-fit:cover; display:block; background:#111820; }
      .msc-result-body { display:grid; grid-template-columns:minmax(0,1fr) 44px; gap:6px; padding:5px 7px 6px; }
      .msc-result-teams { display:grid; gap:2px; min-width:0; }
      .msc-result-team { min-width:0; display:grid; grid-template-columns:27px minmax(0,1fr); gap:6px; align-items:center; min-height:28px; }
      .msc-result-team.is-winner .msc-result-name { color:#fff; font-weight:1000; }
      .msc-result-avatar { width:27px; height:27px; border-radius:50%; display:grid; place-items:center; overflow:hidden; border:1px solid #3a4652; background:#151b22; font-size:13px; font-weight:1000; }
      .msc-result-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
      .msc-result-avatar > span { font-size:10px; font-weight:1000; letter-spacing:.2px; }
      .msc-result-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#c3cad2; font-size:10.5px; font-weight:900; line-height:1.05; }
      .msc-result-country { margin-left:5px; font-size:10px; vertical-align:1px; }
      .msc-result-scores { display:grid; grid-template-rows:1fr 1fr; align-items:center; justify-items:center; border-left:1px solid #28313a; font-variant-numeric:tabular-nums; }
      .msc-result-score { width:100%; text-align:center; font-size:18px; line-height:1; font-weight:1000; color:#aeb7c0; }
      .msc-result-score.is-winner { color:#f4d445; }
      .msc-result-score.is-draw { color:#d8e1ea; }
      .msc-result-head-spacer { flex:1; }
      .msc-live-warning { margin:7px 0 0; padding:6px 8px; border:1px solid rgba(255,80,96,.25); border-radius:8px; background:rgba(255,48,72,.07); color:#ff8995; font-size:8.5px; font-weight:900; text-align:center; }
      .msc-hierarchy-block-old { margin:4px 0 5px; padding:7px 8px 6px; border:1px solid #242c34; border-radius:12px; background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008)); }
      .msc-hierarchy-label { color:#7f8995; font-size:7.5px; font-weight:1000; letter-spacing:.65px; }
      .msc-hierarchy-label.is-secondary { margin-top:5px; }
      .msc-category-dock { display:flex; gap:6px; overflow-x:auto; padding:2px 0 5px; scrollbar-width:none; }
      .msc-category-dock::-webkit-scrollbar { display:none; }
      .msc-category-btn { flex:0 0 auto; min-height:31px; display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border:1px solid #2b343d; border-radius:999px; background:#0b1015; color:#909ba6; font-size:8px; font-weight:1000; cursor:pointer; }
      .msc-category-btn.is-active { color:#fff; border-color:var(--live-accent); background:linear-gradient(180deg,rgba(255,48,72,.17),#0b1015); box-shadow:0 0 12px rgba(255,48,72,.08); }
      .msc-taxonomy-row { display:flex; gap:5px; flex-wrap:wrap; margin-top:3px; }
      .msc-taxonomy-chip { display:inline-flex; align-items:center; min-height:18px; padding:2px 6px; border-radius:999px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.035); color:#9fa9b4; font-size:6.9px; font-weight:950; text-transform:uppercase; letter-spacing:.2px; }
      .msc-competition-head-main { min-width:0; }
      .msc-competition-dock { display:none; }
      .msc-competition-dock::-webkit-scrollbar { display:none; }
      .msc-competition-btn { flex:0 0 auto; min-width:46px; height:46px; display:flex; align-items:center; justify-content:center; gap:7px; padding:0 10px; border:1px solid #2b333c; border-radius:16px; background:linear-gradient(180deg,#121921,#0b1015); color:#98a2ad; cursor:pointer; box-shadow: inset 0 0 0 1px rgba(255,255,255,.03), 0 10px 22px rgba(0,0,0,.2); }
      .msc-competition-btn.is-active { border-color:var(--live-accent); color:#fff; background:linear-gradient(180deg,rgba(255,48,72,.22),#0d1217); box-shadow:0 0 0 1px rgba(255,48,72,.09), 0 0 0 2px rgba(255,48,72,.04), 0 12px 28px rgba(255,48,72,.16); }
      .msc-competition-icon { font-size:16px; line-height:1; }
      .msc-competition-visual { width:28px; height:28px; border-radius:999px; overflow:hidden; display:grid; place-items:center; background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.22), rgba(255,255,255,.04)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 0 2px rgba(0,0,0,.18), 0 0 16px rgba(72,198,255,.09); flex:0 0 28px; }
      .msc-competition-visual img { width:100%; height:100%; object-fit:cover; display:block; }
      .msc-competition-btn.is-red .msc-competition-visual { box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 0 2px rgba(255,48,72,.15), 0 0 16px rgba(255,48,72,.18); }
      .msc-competition-btn.is-blue .msc-competition-visual { box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 0 2px rgba(93,145,255,.15), 0 0 16px rgba(93,145,255,.18); }
      .msc-competition-btn.is-purple .msc-competition-visual { box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 0 2px rgba(172,104,255,.15), 0 0 16px rgba(172,104,255,.18); }
      .msc-competition-btn.is-gold .msc-competition-visual { box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 0 2px rgba(255,196,72,.16), 0 0 16px rgba(255,196,72,.18); }
      .msc-competition-btn.is-green .msc-competition-visual { box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 0 2px rgba(86,214,140,.16), 0 0 16px rgba(86,214,140,.18); }
      .msc-competition-label { display:none; max-width:148px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:8.5px; font-weight:1000; }
      .msc-competition-btn.is-active .msc-competition-label { display:block; }
      .msc-competition-count { min-width:15px; height:15px; display:grid; place-items:center; padding:0 3px; border-radius:999px; background:#1c242c; color:#aeb7c1; font-size:7px; font-weight:1000; }
      .msc-competition-btn.is-active .msc-competition-count { background:var(--live-accent); color:#fff; }
      .msc-competition-groups { display:grid; gap:11px; }
      .msc-country-score-head { display:grid; grid-template-columns:28px minmax(0,1fr) auto; gap:8px; align-items:center; min-height:38px; padding:7px 9px; border:1px solid #34404b; border-radius:11px; background:linear-gradient(180deg,#151c24,#0d1319); box-shadow:0 8px 20px rgba(0,0,0,.18); }
      .msc-country-score-flag { width:28px; height:28px; display:grid; place-items:center; border-radius:50%; background:#202a34; font-size:17px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); }
      .msc-country-score-head strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; letter-spacing:.45px; }
      .msc-country-score-head > span:last-child { color:#8996a3; font-size:8px; font-weight:950; white-space:nowrap; }
      .msc-competition-group { overflow:hidden; border:1px solid #252d35; border-radius:12px; background:#090d11; }
      .msc-competition-head { min-height:38px; display:grid; grid-template-columns:25px minmax(0,1fr) auto; align-items:center; gap:7px; padding:7px 8px; background:linear-gradient(90deg,rgba(255,48,72,.11),rgba(255,255,255,.02)); border-bottom:1px solid #252d35; }
      .msc-competition-head-icon { width:34px; height:34px; display:grid; place-items:center; border-radius:11px; overflow:hidden; background:#151b21; font-size:14px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 18px rgba(94,198,255,.12); }
      .msc-competition-head-icon img { width:84%; height:84%; object-fit:contain; display:block; }
      .msc-competition-head-icon.is-fallback span { font-size:9px; font-weight:1000; color:#eaf2f8; }
      .msc-competition-head-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10.5px; font-weight:1000; }
      .msc-competition-subline { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:2px; color:#7f8d9b; font-size:7.4px; font-weight:900; }
      .msc-competition-subline span { display:inline-flex; align-items:center; gap:2px; }
      .msc-competition-head-count { color:#89939e; font-size:8px; font-weight:950; }
      .msc-competition-head.is-red { background:linear-gradient(90deg,rgba(255,48,72,.15),rgba(255,255,255,.02)); }
      .msc-competition-head.is-blue { background:linear-gradient(90deg,rgba(93,145,255,.14),rgba(255,255,255,.02)); }
      .msc-competition-head.is-purple { background:linear-gradient(90deg,rgba(172,104,255,.14),rgba(255,255,255,.02)); }
      .msc-competition-head.is-gold { background:linear-gradient(90deg,rgba(255,196,72,.14),rgba(255,255,255,.02)); }
      .msc-competition-head.is-green { background:linear-gradient(90deg,rgba(86,214,140,.14),rgba(255,255,255,.02)); }
      .msc-round-group { padding:6px 6px 2px; }
      .msc-round-group + .msc-round-group { border-top:1px solid #1f262e; }
      .msc-round-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:2px 2px 6px; color:#d0d6dd; font-size:8.5px; font-weight:1000; text-transform:uppercase; letter-spacing:.35px; }
      .msc-round-head span:last-child { color:#707b86; font-size:7.5px; }
      .msc-round-group .msc-result-card { margin-bottom:5px; border-radius:8px; }
      @media (max-width:390px) { .msc-result-source {
        display:inline-flex; align-items:center; gap:6px;
 max-width:72px; } .msc-result-comp { font-size:8.5px; } .msc-competition-label { max-width:112px; } }
      .msc-empty-card {
        border:1px solid #29313a; border-radius:11px; background:#0d1116; padding:12px 11px; text-align:center;
      }
      .msc-empty-title { font-size:13px; font-weight:1000; }
      .msc-empty-copy { margin-top:5px; font-size:10px; color:#8f99a5; line-height:1.45; }
      .msc-news-grid { display:grid; gap:9px; }
      .msc-news-card {
        display:grid; grid-template-columns:76px minmax(0,1fr) auto; gap:12px; align-items:center;
        min-height:76px; padding:6px 8px 6px 6px; border:1px solid #29313a; border-radius:13px; background:#0d1116; overflow:hidden;
      }
      .msc-news-card.no-image { grid-template-columns:minmax(0,1fr) auto; padding:13px 14px; }
      .msc-news-card.is-result { border-left:4px solid #f4d445; }
      .msc-news-card.is-live { border-left:4px solid var(--live-accent); }
      .msc-news-card.is-upcoming { border-left:4px solid #64b8ff; }
      .msc-news-thumb { align-self:stretch; min-height:62px; border-radius:9px; overflow:hidden; background:#151b22; display:block; }
      .msc-news-thumb img { width:100%; height:100%; min-height:62px; object-fit:cover; display:block; }
      .msc-news-top { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin-bottom:6px; }
      .msc-news-kind { font-size:9px; font-weight:1000; letter-spacing:.45px; color:#111; padding:4px 7px; border-radius:999px; background:#e8edf2; }
      .msc-news-kind.is-result { background:#f4d445; }
      .msc-news-kind.is-live { background:#ff3048; color:#fff; }
      .msc-news-kind.is-upcoming { background:#64b8ff; color:#08131d; }
      .msc-news-source {
        display:inline-flex; align-items:center; gap:6px;
 font-size:9.5px; color:#8f99a5; font-weight:900; }
      .msc-news-scope { font-size:8.5px; font-weight:1000; letter-spacing:.35px; padding:3px 6px; border-radius:999px; border:1px solid rgba(255,255,255,.12); color:#c8d0d8; background:rgba(255,255,255,.045); }
      .msc-news-scope.is-local { color:#ffe779; border-color:rgba(255,231,121,.25); background:rgba(255,231,121,.07); }
      .msc-news-scope.is-regional { color:#78d9ff; border-color:rgba(120,217,255,.24); background:rgba(120,217,255,.07); }
      .msc-news-scope.is-world { color:#a9f7c4; border-color:rgba(169,247,196,.22); background:rgba(169,247,196,.07); }
      .msc-news-title { font-size:12px; line-height:1.22; font-weight:1000; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
      .msc-news-summary { margin-top:6px; color:#9ea8b3; font-size:9.5px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .msc-news-result { margin-top:7px; color:#f4d445; font-size:10.5px; font-weight:1000; }
      .msc-news-link { display:inline-flex; align-items:center; justify-content:center; min-height:34px; padding:7px 10px; border-radius:8px; border:1px solid #3a4652; color:#fff; background:#141a21; text-decoration:none; font-size:10px; font-weight:1000; }
      .msc-news-lead { display:grid; grid-template-columns:minmax(150px,42%) minmax(0,1fr); min-height:188px; border:1px solid #29313a; border-radius:15px; overflow:hidden; background:#0d1116; }
      .msc-news-lead.is-no-image { grid-template-columns:1fr; }
      .msc-news-lead-media { position:relative; min-height:188px; background:#121820; overflow:hidden; }
      .msc-news-lead-media::after { content:""; position:absolute; inset:0; box-shadow:inset -18px 0 30px rgba(5,8,12,.22); pointer-events:none; }
      .msc-news-lead-media img { width:100%; height:100%; min-height:188px; object-fit:cover; object-position:center; display:block; filter:saturate(.96) contrast(1.03); }
      .msc-news-lead-shade { display:none; }
      .msc-news-lead-content { min-width:0; display:flex; flex-direction:column; justify-content:center; padding:15px 16px; background:linear-gradient(145deg,#11171e,#0b1015); }
      .msc-news-lead-title { max-width:760px; font-size:clamp(17px,4.2vw,23px); line-height:1.08; font-weight:1000; text-wrap:balance; }
      .msc-news-lead-summary { margin-top:8px; max-width:760px; color:#b5bec7; font-size:10px; line-height:1.42; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
      .msc-news-lead-link { align-self:flex-start; margin-top:12px; min-height:32px; padding:6px 10px; border-radius:8px; background:#fff; color:#0b0e12; text-decoration:none; font-size:10px; font-weight:1000; }
      @media (max-width:520px) {
        .msc-news-card { grid-template-columns:92px minmax(0,1fr); gap:10px; align-items:start; }
        .msc-news-card .msc-news-link { grid-column:1 / -1; width:100%; min-height:30px; }
        .msc-news-card.no-image { grid-template-columns:1fr; }
        .msc-news-thumb { min-height:86px; }
        .msc-news-thumb img { min-height:86px; }
        .msc-news-lead { grid-template-columns:1fr; min-height:0; }
        .msc-news-lead-media { min-height:190px; aspect-ratio:16/9; }
        .msc-news-lead-media img { min-height:190px; }
        .msc-news-lead-content { min-height:0; padding:13px 14px 14px; }
      }
      @media (orientation:landscape) and (min-width:700px) {
        .msc-news-lead { grid-template-columns:minmax(220px,38%) minmax(0,1fr); min-height:176px; }
        .msc-news-lead-media, .msc-news-lead-media img { min-height:176px; }
        .msc-news-grid { grid-template-columns:repeat(2,minmax(0,1fr)); align-items:start; }
      }
      .msc-source-rail { display:grid; gap:7px; margin-top:7px; }
      .msc-source-row {
        display:grid; grid-template-columns:36px minmax(0,1fr) auto; gap:10px; align-items:center; padding:8px 9px;
        border:1px solid #29313a; border-radius:10px; background:#0b0f14;
      }
      .msc-source-logo { width:36px; height:36px; border-radius:11px; display:grid; place-items:center; overflow:hidden; background:#121820; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 18px rgba(96,192,255,.12); }
      .msc-source-logo img { width:100%; height:100%; object-fit:cover; display:block; }
      .msc-source-name { font-size:10px; font-weight:1000; }
      .msc-source-desc { margin-top:3px; font-size:9px; line-height:1.25; color:#87919d; }
      .msc-source-actions { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
      .msc-mini-link {
        display:inline-flex; align-items:center; justify-content:center; min-height:30px; padding:4px 7px; border-radius:7px;
        border:1px solid #39434e; color:#e7ebef; background:#11171e; text-decoration:none; font-size:10px; font-weight:1000;
      }
      .msc-mini-link.is-primary { background:#f4d445; border-color:#f4d445; color:#131313; }
      .msc-info-strip {
        display:flex; gap:7px; overflow-x:auto; padding:6px 0 1px; scrollbar-width:none;
      }
      .msc-info-chip {
        flex:0 0 auto; padding:4px 7px; border-radius:999px; border:1px solid #2c353f; background:#0c1116; color:#8f99a5; font-size:8.5px; font-weight:950;
      }
      .msc-region-row { display:flex; gap:6px; overflow-x:auto; padding-bottom:3px; scrollbar-width:none; }
      .msc-region-btn {
        flex:0 0 auto; border:1px solid #2d3741; background:#0c1116; color:#9aa4af; border-radius:999px; padding:6px 9px; font-size:9.5px; font-weight:1000; cursor:pointer;
      }
      .msc-region-btn.is-active { color:#15120a; border-color:#f4d445; background:#f4d445; }


      .msc-results-browser { display:grid; grid-template-columns:164px minmax(0,1fr); gap:10px; align-items:start; min-height:420px; }
      .msc-results-mobile-filters { display:none; }
      .msc-score-filter { min-width:0; display:grid; gap:4px; }
      .msc-score-filter label { color:#74808c; font-size:7px; font-weight:1000; letter-spacing:.55px; }
      .msc-score-filter select { width:100%; min-height:38px; border:1px solid #303a45; border-radius:9px; padding:0 30px 0 10px; background:#0d1319; color:#f5f7fa; font-size:10px; font-weight:950; outline:none; }
      .msc-score-filter select:focus { border-color:var(--live-accent); box-shadow:0 0 0 1px rgba(255,48,72,.12); }
      .msc-score-summary { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 9px; border:1px solid #27313b; border-radius:9px; background:#0b1015; color:#8d99a6; font-size:8px; font-weight:900; }
      .msc-score-summary strong { color:#fff; font-size:9px; }
      .msc-results-nav { position:sticky; top:52px; max-height:calc(76vh - 76px); overflow:hidden; display:flex; flex-direction:column; gap:8px; padding:8px; border:1px solid #28323d; border-radius:14px; background:linear-gradient(180deg,#0d1319,#080c11); }
      .msc-results-nav-section { min-height:0; display:flex; flex-direction:column; gap:5px; }
      .msc-results-nav-section.is-competitions { flex:1 1 auto; min-height:120px; }
      .msc-results-nav-section.is-seasons .msc-results-nav-list { max-height:148px; }
      .msc-results-nav-section.is-seasons .msc-results-nav-list { max-height:148px; }
      .msc-results-nav-title { padding:2px 4px; color:#7f8b98; font-size:8px; font-weight:1000; letter-spacing:.75px; }
      .msc-results-nav-list { display:flex; flex-direction:column; gap:5px; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; padding-right:2px; }
      .msc-results-nav-section:not(.is-competitions) .msc-results-nav-list { max-height:154px; }
      .msc-results-nav-section.is-competitions .msc-results-nav-list { flex:1 1 auto; max-height:310px; }
      .msc-results-nav-btn { width:100%; min-height:42px; display:grid; grid-template-columns:30px minmax(0,1fr) auto; gap:7px; align-items:center; padding:5px 7px; border:1px solid #2b3540; border-radius:12px; background:linear-gradient(180deg,#111820,#0b1015); color:#98a5b2; text-align:left; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(255,255,255,.02); }
      .msc-results-nav-btn.is-active { color:#fff; border-color:var(--live-accent); background:linear-gradient(180deg,rgba(255,48,72,.18),#0d1217); box-shadow:0 0 0 1px rgba(255,48,72,.08),0 0 18px rgba(255,48,72,.12); }
      .msc-results-nav-icon, .msc-results-nav-visual { width:30px; height:30px; border-radius:999px; display:grid; place-items:center; overflow:hidden; background:#17202a; box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); font-size:16px; }
      .msc-results-nav-visual img { width:82%; height:82%; object-fit:contain; display:block; }
      .msc-results-nav-visual.is-fallback span { font-size:9px; font-weight:1000; letter-spacing:.2px; color:#e9f1f8; }
      .msc-results-nav-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:8.6px; font-weight:1000; line-height:1.1; }
      .msc-results-nav-count { min-width:21px; height:21px; display:grid; place-items:center; padding:0 4px; border-radius:999px; background:#1c2630; color:#9eabb8; font-size:7px; font-weight:1000; }
      .msc-results-nav-btn.is-active .msc-results-nav-count { background:var(--live-accent); color:#fff; }
      .msc-results-content { min-width:0; }
      .msc-results-context { position:sticky; top:52px; z-index:1; display:flex; align-items:center; gap:6px; flex-wrap:wrap; min-height:34px; margin-bottom:8px; padding:6px 9px; border:1px solid #28323d; border-radius:10px; background:rgba(9,13,18,.96); backdrop-filter:blur(8px); color:#91a0ad; font-size:8.5px; font-weight:900; }
      .msc-results-context strong { color:#fff; }
      .msc-results-context em { margin-left:auto; color:#f4d445; font-style:normal; }
      .msc-archive-summary { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:7px; align-items:stretch; }
      .msc-archive-summary > div { min-width:0; display:flex; align-items:center; justify-content:center; gap:6px; padding:7px 9px; border:1px solid #2a3540; border-radius:10px; background:#0c1218; }
      .msc-archive-summary > div:first-child { justify-content:flex-start; flex-wrap:wrap; }
      .msc-archive-summary strong { color:#fff; font-size:9px; font-weight:1000; }
      .msc-archive-summary span { padding:2px 5px; border-radius:999px; background:rgba(244,212,69,.12); color:#f4d445; font-size:6.8px; font-weight:1000; }
      .msc-archive-summary b { color:#fff; font-size:12px; }
      .msc-archive-summary small { color:#7e8a96; font-size:7px; font-weight:950; text-transform:uppercase; }
      @media (max-width:620px) {
        .msc-results-browser { display:block; min-height:0; }
        .msc-results-nav { display:none; }
        .msc-results-mobile-filters { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:8px; }
        .msc-results-context { display:none; }
        .msc-score-summary { grid-column:1 / -1; }
        .msc-archive-summary { display:none; }
        .msc-country-score-head { position:sticky; top:48px; z-index:2; border-radius:8px; margin:8px 0 5px; padding:7px 9px; }
        .msc-competition-group { border-radius:9px; margin-bottom:7px; }
        .msc-competition-head { grid-template-columns:34px minmax(0,1fr) auto; min-height:46px; padding:6px 8px; }
        .msc-competition-head-title { font-size:10px; }
        .msc-competition-subline { font-size:7px; gap:4px; }
        .msc-round-head { padding:6px 8px; }
      }
      @media (orientation:landscape) and (min-width:700px) {
        .msc-results-browser { grid-template-columns:190px minmax(0,1fr); gap:12px; }
        .msc-results-nav { max-height:calc(100vh - 78px); }
        .msc-results-nav-section.is-competitions .msc-results-nav-list { max-height:calc(100vh - 360px); }
        .msc-results-context { top:48px; }
      }
      .msc-scorecenter-tools { display:flex; align-items:center; gap:7px; margin:0 0 8px; }
      .msc-score-search { flex:1 1 auto; min-width:0; min-height:36px; border:1px solid #2d3844; border-radius:9px; padding:0 11px; background:#0b1117; color:#fff; font-size:10px; font-weight:850; outline:none; }
      .msc-score-search:focus { border-color:var(--live-accent); box-shadow:0 0 0 1px rgba(255,48,72,.12); }
      .msc-score-search::placeholder { color:#66727f; }
      .msc-score-clear { flex:0 0 auto; min-height:36px; border:1px solid #303b46; border-radius:9px; padding:0 10px; background:#10171e; color:#b7c1ca; font-size:8px; font-weight:1000; cursor:pointer; }
      .msc-competition-preview-note { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 8px; border-top:1px solid #222c35; background:#0a0f14; color:#7f8b98; font-size:7.5px; font-weight:900; }
      .msc-open-competition { border:1px solid rgba(255,48,72,.5); border-radius:999px; padding:5px 8px; background:rgba(255,48,72,.11); color:#fff; font-size:7px; font-weight:1000; cursor:pointer; }
      .msc-history-more { width:100%; min-height:36px; margin-top:8px; border:1px solid #33404c; border-radius:9px; background:#10171e; color:#e8edf2; font-size:8px; font-weight:1000; cursor:pointer; }
      .msc-history-more strong { color:#f4d445; }
      @media (max-width:620px) {
        .msc-scorecenter-tools { position:sticky; top:44px; z-index:3; padding:6px 0; background:linear-gradient(180deg,#0a0e13 80%,rgba(10,14,19,0)); }
        .msc-score-search { min-height:38px; }
      }

      .msc-quick-dock {
        position: fixed; left: 50%; transform:translateX(-50%); bottom: 88px; z-index: 64; display:flex; gap:6px; padding:5px;
        border:1px solid #303943; border-radius:999px; background:rgba(7,10,14,.94); box-shadow:0 10px 28px rgba(0,0,0,.42); backdrop-filter:blur(10px);
      }
      .msc-quick-btn {
        width:34px; height:34px; border-radius:50%; border:1px solid #37414b; background:#10161c; color:#eef2f6;
        display:grid; place-items:center; font-size:15px; cursor:pointer;
      }
      .msc-quick-btn:active { transform:scale(.96); }
      .msc-float-overlay {
        position:fixed; inset:0; z-index:120; background:rgba(0,0,0,.64); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:72px 12px 82px;
      }
      .msc-float-panel {
        width:min(760px,100%); max-height:min(76vh,760px); overflow:auto; border:1px solid #38424d; border-radius:18px;
        background:#0a0e13; box-shadow:0 18px 60px rgba(0,0,0,.58); padding:10px;
      }
      .msc-float-head { position:sticky; top:-10px; z-index:2; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 4px 9px; background:#0a0e13; border-bottom:1px solid #242d36; }
      .msc-float-title { font-size:15px; font-weight:1000; }
      .msc-float-close { width:32px; height:32px; border-radius:50%; border:1px solid #39434d; background:#141a21; color:#fff; font-size:16px; cursor:pointer; }
      .msc-more-btn {
        width:100%; min-height:32px; border-radius:9px; border:1px solid #35404b; background:#10161c; color:#dfe5ea; font-size:9.5px; font-weight:1000; cursor:pointer;
      }
      .msc-compact-list { display:grid; gap:6px; }
      .msc-compact-row { display:grid; grid-template-columns:64px minmax(0,1fr) auto; gap:8px; align-items:center; padding:7px 8px; border:1px solid #28313a; border-radius:9px; background:#0c1116; }
      .msc-compact-tag { font-size:8.5px; font-weight:1000; color:#ff6375; }
      .msc-compact-main { min-width:0; font-size:10.5px; font-weight:950; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .msc-compact-score { font-size:11px; font-weight:1000; color:#f4d445; white-space:nowrap; }
      @media (max-width:520px) { .msc-quick-dock { bottom:82px; } .msc-float-overlay { padding:62px 8px 70px; } }
      @media (orientation:landscape) and (max-height:620px) {
        .msc-live-root { padding-bottom:72px; }
        .msc-quick-dock { bottom:14px; }
        .msc-float-overlay { padding:12px 72px 14px; align-items:center; }
        .msc-float-panel { width:min(980px,calc(100vw - 150px)); max-height:calc(100vh - 28px); border-radius:16px; }
        .msc-float-head { top:-10px; }
        .msc-news-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .msc-news-card { grid-template-columns:70px minmax(0,1fr); }
        .msc-news-card .msc-news-link { grid-column:1 / -1; min-height:28px; }
        .msc-competition-groups { grid-template-columns:1fr; align-items:start; }
      }

      @media (max-width: 390px) {
        .msc-match-body { grid-template-columns:minmax(0,1fr) 78px minmax(0,1fr); gap:5px; }
        .msc-player-flag { margin-left:6px; }
      .msc-player-badge img { width:100%; height:100%; object-fit:cover; display:block; }
      .msc-player-badge { width:38px; height:38px; flex-basis:38px; font-size:12px; }
        .msc-score-box { font-size:23px; }
        .msc-match-code { min-width:48px; }
      }
    `}</style>
  );
}

function ScoreTicker({ items, sportLabel }: { items: TickerItem[]; sportLabel: string }) {
  const effective = items.length
    ? items
    : [
        {
          id: "no-data",
          sport: sportLabel,
          label: "Résultats officiels",
          meta: "Les scores apparaîtront ici dès qu’un flux de données est disponible.",
        },
      ];
  const rows = effective.length > 1 ? [...effective, ...effective] : effective;
  return (
    <div className="msc-score-ticker">
      <div className="msc-score-ticker-label">⚡ FLASH<br />RÉSULTATS</div>
      <div className="msc-score-ticker-window">
        <div className={`msc-score-ticker-track${effective.length <= 1 ? " is-static" : ""}`}>
          {rows.map((item, index) => (
            <div className="msc-score-ticker-item" key={`${item.id}-${index}`}>
              <div className="msc-score-ticker-sport">{item.live ? "● LIVE · " : ""}{item.sport}</div>
              <div className="msc-score-ticker-main" translate="no" data-i18n-skip="true">
                {item.label}{item.score ? <span className="msc-score-ticker-score">{item.score}</span> : null}
              </div>
              <div className="msc-score-ticker-meta">{item.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: string }) {
  return (
    <div className="msc-live-section-head">
      <div className="msc-live-section-mark" />
      <div className="msc-live-section-title">{title}</div>
      <div className="msc-live-section-line" />
      {count ? <div className="msc-live-section-count">{count}</div> : null}
    </div>
  );
}

function PlayerBlock({ player, right = false, sourceName }: { player?: DartsLivePlayer | null; right?: boolean; sourceName?: string | null }) {
  const flag = countryFlag(inferredCountryCode(player, sourceName));
  return (
    <div className={`msc-player${right ? " is-right" : ""}`} translate="no" data-i18n-skip="true">
      <PlayerAvatar player={player} sourceName={sourceName} className="msc-player-badge" />
      <div style={{ minWidth: 0 }}>
        <div className="msc-player-name">{player?.name || "À confirmer"}{flag ? <span className="msc-player-flag">{flag}</span> : null}</div>
        <div className="msc-player-meta">{player?.id ? String(player.id).toUpperCase() : "COMPÉTITEUR"}</div>
      </div>
    </div>
  );
}

function MatchCard({
  competition,
  round,
  status,
  live,
  left,
  right,
  leftScore,
  rightScore,
  source,
  sourceName,
  sourceUrl,
  footer,
}: {
  competition?: string | null;
  round?: string | null;
  status: string;
  live?: boolean;
  left?: DartsLivePlayer | null;
  right?: DartsLivePlayer | null;
  leftScore: string;
  rightScore: string;
  source?: SportLiveSource | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  footer: string;
}) {
  const link = sourceUrl || bestPrimaryLink(source);
  const sourceLogo = sourceImageFromItem({ sourceUrl: link }, source);
  return (
    <article className="msc-match-card">
      <div className="msc-match-top">
        <div className="msc-match-code">{shortCompetition(competition)}</div>
        <div className="msc-match-heading">
          <div className="msc-match-comp" translate="no" data-i18n-skip="true">{competition || "Compétition officielle"}</div>
          <div className="msc-match-round">{niceRound(round) || "Match"}</div>
        </div>
        <div className={`msc-status${live ? " is-live" : ""}`}>{status}</div>
        {link ? <a className="msc-source-link" href={link} target="_blank" rel="noreferrer noopener">{sourceLogo ? <img src={sourceLogo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}<span>{sourceName || sourceLabel(source)}</span></a> : null}
      </div>
      <div className="msc-match-body">
        <PlayerBlock player={left} sourceName={sourceName || source?.name} />
        <div className="msc-score-box">{rightScore ? <>{leftScore}<span className="msc-score-sep">-</span>{rightScore}</> : leftScore}</div>
        <PlayerBlock player={right} right sourceName={sourceName || source?.name} />
      </div>
      <div className="msc-match-foot"><span className="msc-dot" />{footer}</div>
    </article>
  );
}

function LiveMatchCard({ item, source }: { item: DartsLiveMatch; source?: SportLiveSource | null }) {
  const [left, right] = item.players || [];
  return (
    <MatchCard
      competition={item.competition}
      round={item.round}
      status="LIVE"
      live
      left={left}
      right={right}
      leftScore={scoreValue(left?.score)}
      rightScore={scoreValue(right?.score)}
      source={source}
      sourceName={item.sourceName || source?.shortName || source?.name}
      sourceUrl={item.sourceUrl || bestPrimaryLink(source)}
      footer={item.sourceName || source ? `Suivi officiel · ${item.sourceName || sourceLabel(source)}` : "Score en direct"}
    />
  );
}

function FixtureMatchCard({ item, source, lang }: { item: DartsLiveFixture; source?: SportLiveSource | null; lang: string }) {
  const [left, right] = item.players || [];
  return (
    <MatchCard
      competition={item.competition}
      round={item.round}
      status={item.startsAt ? formatDateTime(item.startsAt, lang) : formatDate(item.date, lang)}
      left={left}
      right={right}
      leftScore="VS"
      rightScore=""
      source={source}
      sourceName={item.sourceName || source?.shortName || source?.name}
      sourceUrl={item.sourceUrl || bestPrimaryLink(source)}
      footer={item.sourceName || source ? `À suivre · ${item.sourceName || sourceLabel(source)}` : "Programme officiel"}
    />
  );
}

function ResultMatchCard({ item, source, lang }: { item: DartsLiveResult; source?: SportLiveSource | null; lang: string }) {
  const origin = itemSource(item, source);
  const sourceLogo = sourceImageFromItem({ sourceUrl: origin.url }, source);
  const isDraw = item.winner?.score != null && item.loser?.score != null && Number(item.winner.score) === Number(item.loser.score);
  const rows = [
    { player: item.winner, winner: !isDraw },
    { player: item.loser, winner: false },
  ];
  return (
    <article className="msc-result-card">
      <div className="msc-result-head">
        <div className="msc-result-date">{formatDate(item.playedOn, lang)}</div>
        <div className="msc-result-head-spacer" />
        {origin.url ? <a className="msc-result-source" href={origin.url} target="_blank" rel="noreferrer noopener">{sourceLogo ? <img src={sourceLogo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}<span>{origin.name}</span></a> : <span className="msc-result-source">{sourceLogo ? <img src={sourceLogo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}<span>{origin.name}</span></span>}
      </div>
      <div className="msc-result-body">
        <div className="msc-result-teams">
          {rows.map(({ player, winner }) => {
            const flag = countryFlag(inferredCountryCode(player, origin.name));
            return (
              <div className={`msc-result-team${winner ? " is-winner" : ""}`} key={`${item.id}-${winner ? "w" : "l"}`}>
                <PlayerAvatar player={player} sourceName={origin.name} className="msc-result-avatar" />
                <div className="msc-result-name" translate="no" data-i18n-skip="true">{player?.name || "À confirmer"}{flag ? <span className="msc-result-country">{flag}</span> : null}</div>
              </div>
            );
          })}
        </div>
        <div className="msc-result-scores">
          <div className={`msc-result-score${isDraw ? " is-draw" : " is-winner"}`}>{scoreValue(item.winner?.score)}</div>
          <div className={`msc-result-score${isDraw ? " is-draw" : ""}`}>{scoreValue(item.loser?.score)}</div>
        </div>
      </div>
    </article>
  );
}

function GroupedResults({ rows, source, lang, newsRows, allSources, sport, competitionIndex = [] }: { rows: DartsLiveResult[]; source?: SportLiveSource | null; lang: string; newsRows: SportLiveNewsItem[]; allSources: SportLiveSource[]; sport: string; competitionIndex?: SportLiveCompetitionIndexEntry[] }) {
  const indexByCompetition = React.useMemo(() => {
    const map = new Map<string, SportLiveCompetitionIndexEntry>();
    competitionIndex.forEach((entry) => {
      const keys = [entry.key, normalizedText(entry.name)];
      keys.filter(Boolean).forEach((key) => map.set(String(key), entry));
    });
    return map;
  }, [competitionIndex]);

  const competitions = React.useMemo(() => {
    const map = new Map<string, DartsLiveResult[]>();
    const displayNames = new Map<string, string>();
    rows.forEach((row) => {
      const rawName = competitionKey(row.competition);
      const key = competitionGroupingKey(rawName, sport);
      const bucket = map.get(key) || [];
      bucket.push(row);
      map.set(key, bucket);
      const current = displayNames.get(key);
      displayNames.set(key, current ? preferredCompetitionName(current, rawName) : rawName);
    });
    return Array.from(map.entries())
      .map(([groupKey, matches]) => {
        const name = displayNames.get(groupKey) || competitionKey(matches[0]?.competition);
        const reference = matches.find((match) => !!competitionMetaOf(match)) || matches[0];
        const indexed = indexByCompetition.get(normalizedText(name)) || indexByCompetition.get(name.toLowerCase()) || null;
        const country = indexed?.countryName
          ? { key: indexed.countryCode || normalizedText(indexed.countryName), label: indexed.countryName, code: indexed.countryCode || null }
          : competitionCountry(reference);
        const indexedChips = [indexed?.tier, indexed?.level, indexed?.family].filter(Boolean).map((value) => String(value).replace(/_/g, " ").toUpperCase());
        return {
          name,
          matches: [...matches].sort((a, b) => dateTs(b.playedOn) - dateTs(a.playedOn)),
          latest: Math.max(...matches.map((match) => dateTs(match.playedOn)), 0),
          imageUrl: indexed?.logoUrl || findCompetitionImage(name, matches, newsRows, allSources),
          tone: competitionVisualTone(name),
          continent: indexed?.continent || competitionContinent(reference),
          countryKey: country.key,
          countryLabel: country.label,
          countryCode: country.code,
          levelGroup: competitionLevelGroup(reference),
          chips: Array.from(new Set([...competitionMetaChips(reference), ...indexedChips])).slice(0, 5),
          archiveSeasons: indexed?.seasons || [],
          archiveCount: indexed?.resultCount || matches.length,
          firstSeen: indexed?.firstSeen || null,
          lastSeen: indexed?.lastSeen || null,
        };
      })
      .sort((a, b) => (b.latest - a.latest) || (b.matches.length - a.matches.length) || a.name.localeCompare(b.name));
  }, [rows, newsRows, allSources, sport, indexByCompetition]);

  const continents = React.useMemo(() => {
    const counts = new Map<string, number>();
    competitions.forEach((item) => counts.set(item.continent, (counts.get(item.continent) || 0) + item.matches.length));
    const order = ["Monde", "Europe", "Amérique du Nord", "Amérique du Nord / Caraïbes", "Amérique du Sud", "Asie", "Afrique", "Océanie", "Autres"];
    return Array.from(counts.entries()).sort((a,b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      return a[0].localeCompare(b[0], lang || "fr");
    });
  }, [competitions, lang]);

  const [selectedContinent, setSelectedContinent] = React.useState("__all__");
  const [selectedCountry, setSelectedCountry] = React.useState("__all__");
  const [selected, setSelected] = React.useState("__all__");
  const [selectedSeason, setSelectedSeason] = React.useState("__all__");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [historyLimit, setHistoryLimit] = React.useState(120);

  const continentFiltered = React.useMemo(() => competitions.filter((item) => selectedContinent === "__all__" || item.continent === selectedContinent), [competitions, selectedContinent]);
  const countries = React.useMemo(() => {
    const map = new Map<string, { key: string; label: string; code: string | null; count: number }>();
    continentFiltered.forEach((item) => {
      const current = map.get(item.countryKey) || { key: item.countryKey, label: item.countryLabel, code: item.countryCode, count: 0 };
      current.count += item.matches.length;
      if (!current.code && item.countryCode) current.code = item.countryCode;
      map.set(item.countryKey, current);
    });
    return Array.from(map.values()).sort((a,b) => {
      if (a.key === "__world__") return -1;
      if (b.key === "__world__") return 1;
      return a.label.localeCompare(b.label, lang || "fr");
    });
  }, [continentFiltered]);

  React.useEffect(() => {
    if (selectedCountry !== "__all__" && !countries.some((item) => item.key === selectedCountry)) setSelectedCountry("__all__");
  }, [countries, selectedCountry]);

  const hierarchyFiltered = React.useMemo(() => continentFiltered.filter((item) => selectedCountry === "__all__" || item.countryKey === selectedCountry), [continentFiltered, selectedCountry]);
  const searchedCompetitions = React.useMemo(() => {
    const query = normalizedText(searchQuery);
    if (!query) return hierarchyFiltered;
    return hierarchyFiltered.filter((item) => {
      const playerNames = item.matches.slice(0, 500).map((match) => `${match.winner?.name || ""} ${match.loser?.name || ""}`).join(" ");
      const hay = normalizedText(`${item.name} ${item.countryLabel} ${item.continent} ${playerNames}`);
      return hay.includes(query);
    });
  }, [hierarchyFiltered, searchQuery]);
  const navigationCompetitions = React.useMemo(() => [...searchedCompetitions].sort((a,b) => a.name.localeCompare(b.name, lang || "fr")), [searchedCompetitions, lang]);

  React.useEffect(() => {
    if (selected !== "__all__" && !hierarchyFiltered.some((item) => item.name === selected)) setSelected("__all__");
  }, [hierarchyFiltered, selected]);

  React.useEffect(() => { setSelectedCountry("__all__"); setSelected("__all__"); setSelectedSeason("__all__"); setHistoryLimit(120); }, [selectedContinent]);
  React.useEffect(() => { setSelected("__all__"); setSelectedSeason("__all__"); setHistoryLimit(120); }, [selectedCountry]);
  React.useEffect(() => { setSelectedSeason("__all__"); setHistoryLimit(120); }, [selected]);
  React.useEffect(() => { setHistoryLimit(120); }, [selectedSeason, searchQuery]);

  const competitionFiltered = selected === "__all__" ? searchedCompetitions : searchedCompetitions.filter((item) => item.name === selected);
  const seasons = React.useMemo(() => {
    const counts = new Map<string, number>();
    competitionFiltered.forEach((item) => item.matches.forEach((match) => {
      const season = resultSeasonLabel(match.playedOn);
      counts.set(season, (counts.get(season) || 0) + 1);
    }));
    return Array.from(counts.entries()).sort(([a],[b]) => {
      if (a === "NON DATÉ") return 1;
      if (b === "NON DATÉ") return -1;
      return Number(b) - Number(a);
    });
  }, [competitionFiltered]);

  React.useEffect(() => {
    if (selectedSeason !== "__all__" && !seasons.some(([season]) => season === selectedSeason)) setSelectedSeason("__all__");
  }, [seasons, selectedSeason]);

  const visible = competitionFiltered
    .map((item) => ({ ...item, matches: selectedSeason === "__all__" ? item.matches : item.matches.filter((match) => resultSeasonLabel(match.playedOn) === selectedSeason) }))
    .filter((item) => item.matches.length > 0);
  const scoreCenterVisible = React.useMemo(() => [...visible].sort((a,b) => {
    const countryCmp = a.countryLabel.localeCompare(b.countryLabel, lang || "fr");
    if (countryCmp) return countryCmp;
    return a.name.localeCompare(b.name, lang || "fr");
  }), [visible, lang]);
  const selectedCompetitionMode = selected !== "__all__";
  const filteredCount = competitionFiltered.reduce((sum,item) => sum + item.matches.length, 0);
  const visibleCount = visible.reduce((sum,item) => sum + item.matches.length, 0);

  return (
    <div className="msc-results-browser">
      <div className="msc-results-mobile-filters" aria-label="Filtres des résultats">
        <div className="msc-score-filter">
          <label>CONTINENT</label>
          <select value={selectedContinent} onChange={(e) => setSelectedContinent(e.target.value)}>
            <option value="__all__">Tous les continents</option>
            {continents.map(([name]) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="msc-score-filter">
          <label>PAYS</label>
          <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
            <option value="__all__">Tous les pays</option>
            {countries.map((country) => <option key={country.key} value={country.key}>{country.label}</option>)}
          </select>
        </div>
        <div className="msc-score-filter">
          <label>COMPÉTITION</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="__all__">Toutes les compétitions</option>
            {navigationCompetitions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </div>
        <div className="msc-score-filter">
          <label>SAISON</label>
          <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
            <option value="__all__">Toutes les saisons</option>
            {seasons.map(([season]) => <option key={season} value={season}>{season}</option>)}
          </select>
        </div>
        <div className="msc-score-summary"><strong>{visibleCount} résultat{visibleCount > 1 ? "s" : ""}</strong><span>{scoreCenterVisible.length} compétition{scoreCenterVisible.length > 1 ? "s" : ""}</span></div>
      </div>
      <aside className="msc-results-nav" aria-label="Navigation des résultats">
        <div className="msc-results-nav-section">
          <div className="msc-results-nav-title">CONTINENT</div>
          <div className="msc-results-nav-list">
            <button className={`msc-results-nav-btn${selectedContinent === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setSelectedContinent("__all__")} title="Tous les continents">
              <span className="msc-results-nav-icon">🧭</span><span className="msc-results-nav-label">TOUS</span><span className="msc-results-nav-count">{rows.length}</span>
            </button>
            {continents.map(([name, count]) => (
              <button key={name} className={`msc-results-nav-btn${selectedContinent === name ? " is-active" : ""}`} type="button" onClick={() => setSelectedContinent(name)} title={name}>
                <span className="msc-results-nav-icon">{continentIcon(name)}</span><span className="msc-results-nav-label">{name}</span><span className="msc-results-nav-count">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="msc-results-nav-section">
          <div className="msc-results-nav-title">PAYS</div>
          <div className="msc-results-nav-list">
            <button className={`msc-results-nav-btn${selectedCountry === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setSelectedCountry("__all__")} title="Tous les pays">
              <span className="msc-results-nav-icon">🏳️</span><span className="msc-results-nav-label">TOUS</span><span className="msc-results-nav-count">{continentFiltered.reduce((sum,item) => sum + item.matches.length, 0)}</span>
            </button>
            {countries.map((country) => (
              <button key={country.key} className={`msc-results-nav-btn${selectedCountry === country.key ? " is-active" : ""}`} type="button" onClick={() => setSelectedCountry(country.key)} title={country.label}>
                <span className="msc-results-nav-icon">{countryVisual(country.code, country.label)}</span><span className="msc-results-nav-label">{country.label.toUpperCase()}</span><span className="msc-results-nav-count">{country.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="msc-results-nav-section is-competitions">
          <div className="msc-results-nav-title">COMPÉTITIONS</div>
          <div className="msc-results-nav-list">
            <button className={`msc-results-nav-btn${selected === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setSelected("__all__")} title="Toutes les compétitions">
              <span className="msc-results-nav-visual">🏆</span><span className="msc-results-nav-label">TOUTES</span><span className="msc-results-nav-count">{filteredCount}</span>
            </button>
            {navigationCompetitions.map(({ name, matches, imageUrl }) => (
              <button key={name} className={`msc-results-nav-btn${selected === name ? " is-active" : ""}`} type="button" onClick={() => setSelected(name)} title={name}>
                <CompetitionMark sport={sport} name={name} logoUrl={imageUrl} /><span className="msc-results-nav-label" translate="no">{name}</span><span className="msc-results-nav-count">{matches.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="msc-results-nav-section is-seasons">
          <div className="msc-results-nav-title">SAISONS</div>
          <div className="msc-results-nav-list">
            <button className={`msc-results-nav-btn${selectedSeason === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setSelectedSeason("__all__")} title="Toutes les saisons">
              <span className="msc-results-nav-icon">🗓️</span><span className="msc-results-nav-label">TOUTES</span><span className="msc-results-nav-count">{filteredCount}</span>
            </button>
            {seasons.map(([season, count]) => (
              <button key={season} className={`msc-results-nav-btn${selectedSeason === season ? " is-active" : ""}`} type="button" onClick={() => setSelectedSeason(season)} title={`Saison ${season}`}>
                <span className="msc-results-nav-icon">{season === "NON DATÉ" ? "?" : "📅"}</span><span className="msc-results-nav-label">{season}</span><span className="msc-results-nav-count">{count}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="msc-results-content">
        <div className="msc-scorecenter-tools">
          <input className="msc-score-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Rechercher une compétition ou un joueur…" aria-label="Rechercher dans les résultats" />
          {searchQuery ? <button className="msc-score-clear" type="button" onClick={() => setSearchQuery("")}>EFFACER</button> : null}
        </div>
        <div className="msc-results-context">
          <span>{selectedContinent === "__all__" ? "Tous continents" : selectedContinent}</span>
          <span>›</span>
          <span>{selectedCountry === "__all__" ? "Tous pays" : (countries.find((item) => item.key === selectedCountry)?.label || selectedCountry)}</span>
          <span>›</span>
          <strong>{selected === "__all__" ? "Toutes compétitions" : selected}</strong>
          <span>›</span>
          <strong>{selectedSeason === "__all__" ? "Toutes saisons" : selectedSeason}</strong>
          <em>{visibleCount} résultat{visibleCount > 1 ? "s" : ""}</em>
        </div>
        <div className="msc-competition-groups">
          {scoreCenterVisible.map(({ name, matches, imageUrl, tone, chips, countryCode, countryLabel, archiveSeasons, archiveCount, firstSeen, lastSeen }, index) => {
            const rounds = new Map<string, DartsLiveResult[]>();
            matches.forEach((match) => {
              const round = normalizedRound(match.round);
              const bucket = rounds.get(round) || [];
              bucket.push(match);
              rounds.set(round, bucket);
            });
            const orderedRounds = Array.from(rounds.entries()).sort(([a], [b]) => roundOrder(a) - roundOrder(b));
            const previousCountry = index > 0 ? scoreCenterVisible[index - 1]?.countryLabel : null;
            const showCountryHead = selectedCountry === "__all__" && previousCountry !== countryLabel;
            return (
              <React.Fragment key={`${countryLabel}-${name}`}>
                {showCountryHead ? (
                  <div className="msc-country-score-head">
                    <span className="msc-country-score-flag">{countryVisual(countryCode, countryLabel)}</span>
                    <strong>{countryLabel.toUpperCase()}</strong>
                    <span>{scoreCenterVisible.filter((item) => item.countryLabel === countryLabel).reduce((sum, item) => sum + item.matches.length, 0)} résultats</span>
                  </div>
                ) : null}
                <section className="msc-competition-group">
                  <div className={`msc-competition-head ${tone}`}>
                    <CompetitionMark sport={sport} name={name} logoUrl={imageUrl} className="msc-competition-head-icon" />
                    <div className="msc-competition-head-main">
                      <div className="msc-competition-head-title" translate="no" data-i18n-skip="true">{name}</div>
                      <div className="msc-competition-subline">
                        <span>{countryVisual(countryCode, countryLabel)} {countryLabel}</span>
                        {archiveSeasons?.length ? <span>{archiveSeasons.length} saison{archiveSeasons.length > 1 ? "s" : ""}</span> : null}
                        {firstSeen || lastSeen ? <span>{firstSeen || "?"} → {lastSeen || "?"}</span> : null}
                        {archiveCount > matches.length ? <span>{archiveCount} archivés</span> : null}
                      </div>
                      {chips.length ? <div className="msc-taxonomy-row">{chips.map((chip) => <span className="msc-taxonomy-chip" key={`${name}-${chip}`}>{chip}</span>)}</div> : null}
                    </div>
                    <span className="msc-competition-head-count">{matches.length}</span>
                  </div>
                  {selectedCompetitionMode ? (() => {
                    let rendered = 0;
                    const groups = orderedRounds.map(([round, roundRows]) => {
                      const remaining = Math.max(0, historyLimit - rendered);
                      if (!remaining) return null;
                      const shownRows = roundRows.slice(0, remaining);
                      rendered += shownRows.length;
                      if (!shownRows.length) return null;
                      return (
                        <div className="msc-round-group" key={`${name}-${round}`}>
                          <div className="msc-round-head"><span>{round}</span><span>{roundRows.length} match{roundRows.length > 1 ? "s" : ""}</span></div>
                          {shownRows.map((item) => <ResultMatchCard key={item.id} item={item} source={source} lang={lang} />)}
                        </div>
                      );
                    });
                    return <>{groups}{matches.length > historyLimit ? <button className="msc-history-more" type="button" onClick={() => setHistoryLimit((value) => value + 120)}>AFFICHER 120 RÉSULTATS SUPPLÉMENTAIRES · <strong>{Math.max(0, matches.length - historyLimit)} RESTANTS</strong></button> : null}</>;
                  })() : (
                    <>
                      <div className="msc-round-group">
                        <div className="msc-round-head"><span>DERNIERS MATCHS</span><span>{Math.min(matches.length, 6)} / {matches.length}</span></div>
                        {matches.slice(0, 6).map((item) => <ResultMatchCard key={item.id} item={item} source={source} lang={lang} />)}
                      </div>
                      {matches.length > 6 ? <div className="msc-competition-preview-note"><span>{matches.length - 6} résultat{matches.length - 6 > 1 ? "s" : ""} supplémentaire{matches.length - 6 > 1 ? "s" : ""}</span><button className="msc-open-competition" type="button" onClick={() => setSelected(name)}>OUVRIR LA COMPÉTITION</button></div> : null}
                    </>
                  )}
                </section>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function eventMonthKey(event: SportLiveEvent) {
  const raw = event.startsAt || event.dateLabel || null;
  if (!raw) return "NON DATÉ";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "NON DATÉ";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function eventMonthLabel(key: string, lang: string) {
  if (key === "NON DATÉ") return key;
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, Math.max(0, (month || 1) - 1), 1));
  try { return new Intl.DateTimeFormat(lang || "fr", { month: "long", year: "numeric" }).format(date).toUpperCase(); } catch { return key; }
}

function CalendarBrowser({ events, lang }: { events: SportLiveEvent[]; lang: string }) {
  const normalized = React.useMemo(() => events.map((event) => {
    const meta = event.competitionMeta || null;
    const continent = String(meta?.continent || meta?.regionLabel || "AUTRES");
    const countryCode = meta?.countryCode || null;
    const countryLabel = String(meta?.countryName || meta?.regionLabel || (continent === "Monde" ? "MONDE" : "AUTRES"));
    const countryKey = `${countryCode || "xx"}:${normalizedText(countryLabel) || "autres"}`;
    return { event, continent, countryCode, countryLabel, countryKey, month: eventMonthKey(event) };
  }), [events]);

  const continents = React.useMemo(() => {
    const counts = new Map<string, number>();
    normalized.forEach((row) => counts.set(row.continent, (counts.get(row.continent) || 0) + 1));
    return Array.from(counts.entries()).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
  }, [normalized]);
  const [continent, setContinent] = React.useState("__all__");
  const [country, setCountry] = React.useState("__all__");
  const [month, setMonth] = React.useState("__all__");

  const continentRows = React.useMemo(() => normalized.filter((row) => continent === "__all__" || row.continent === continent), [normalized, continent]);
  const countries = React.useMemo(() => {
    const map = new Map<string, { key:string; label:string; code:string|null; count:number }>();
    continentRows.forEach((row) => {
      const current = map.get(row.countryKey) || { key:row.countryKey, label:row.countryLabel, code:row.countryCode, count:0 };
      current.count += 1;
      map.set(row.countryKey, current);
    });
    return Array.from(map.values()).sort((a,b) => b.count-a.count || a.label.localeCompare(b.label));
  }, [continentRows]);
  const countryRows = React.useMemo(() => continentRows.filter((row) => country === "__all__" || row.countryKey === country), [continentRows, country]);
  const months = React.useMemo(() => {
    const counts = new Map<string, number>();
    countryRows.forEach((row) => counts.set(row.month, (counts.get(row.month) || 0) + 1));
    return Array.from(counts.entries()).sort(([a],[b]) => {
      if (a === "NON DATÉ") return 1;
      if (b === "NON DATÉ") return -1;
      return a.localeCompare(b);
    });
  }, [countryRows]);
  const visible = React.useMemo(() => countryRows.filter((row) => month === "__all__" || row.month === month).map((row) => row.event), [countryRows, month]);

  React.useEffect(() => { setCountry("__all__"); setMonth("__all__"); }, [continent]);
  React.useEffect(() => { setMonth("__all__"); }, [country]);
  React.useEffect(() => { if (country !== "__all__" && !countries.some((item) => item.key === country)) setCountry("__all__"); }, [countries, country]);
  React.useEffect(() => { if (month !== "__all__" && !months.some(([key]) => key === month)) setMonth("__all__"); }, [months, month]);

  return (
    <div className="msc-calendar-browser">
      <aside className="msc-calendar-nav">
        <div className="msc-results-nav-title">CONTINENT</div>
        <div className="msc-results-nav-list">
          <button className={`msc-results-nav-btn${continent === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setContinent("__all__")}><span className="msc-results-nav-icon">🧭</span><span className="msc-results-nav-label">TOUS</span><span className="msc-results-nav-count">{events.length}</span></button>
          {continents.map(([name,count]) => <button key={name} className={`msc-results-nav-btn${continent === name ? " is-active" : ""}`} type="button" onClick={() => setContinent(name)}><span className="msc-results-nav-icon">{continentIcon(name)}</span><span className="msc-results-nav-label">{name}</span><span className="msc-results-nav-count">{count}</span></button>)}
        </div>
        <div className="msc-results-nav-title" style={{marginTop:8}}>PAYS</div>
        <div className="msc-results-nav-list">
          <button className={`msc-results-nav-btn${country === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setCountry("__all__")}><span className="msc-results-nav-icon">🏳️</span><span className="msc-results-nav-label">TOUS</span><span className="msc-results-nav-count">{continentRows.length}</span></button>
          {countries.map((item) => <button key={item.key} className={`msc-results-nav-btn${country === item.key ? " is-active" : ""}`} type="button" onClick={() => setCountry(item.key)}><span className="msc-results-nav-icon">{countryVisual(item.code,item.label)}</span><span className="msc-results-nav-label">{item.label.toUpperCase()}</span><span className="msc-results-nav-count">{item.count}</span></button>)}
        </div>
        <div className="msc-results-nav-title" style={{marginTop:8}}>PÉRIODE</div>
        <div className="msc-results-nav-list">
          <button className={`msc-results-nav-btn${month === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setMonth("__all__")}><span className="msc-results-nav-icon">🗓️</span><span className="msc-results-nav-label">TOUTES</span><span className="msc-results-nav-count">{countryRows.length}</span></button>
          {months.map(([key,count]) => <button key={key} className={`msc-results-nav-btn${month === key ? " is-active" : ""}`} type="button" onClick={() => setMonth(key)}><span className="msc-results-nav-icon">📅</span><span className="msc-results-nav-label">{eventMonthLabel(key,lang)}</span><span className="msc-results-nav-count">{count}</span></button>)}
        </div>
      </aside>
      <div className="msc-calendar-content">
        <div className="msc-results-context"><span>{continent === "__all__" ? "Tous continents" : continent}</span><span>›</span><span>{country === "__all__" ? "Tous pays" : (countries.find((item)=>item.key===country)?.label || country)}</span><span>›</span><strong>{month === "__all__" ? "Toutes périodes" : eventMonthLabel(month,lang)}</strong><em>{visible.length} événement{visible.length>1?"s":""}</em></div>
        {visible.map((event) => <OfficialEventCard key={event.id} event={event} />)}
      </div>
    </div>
  );
}

function OfficialEventCard({ event }: { event: SportLiveEvent }) {
  const href = event.watchUrl || event.sourceUrl || null;
  const statusLabel = event.status === "live" ? "LIVE" : event.status === "result" ? "RÉSULTAT" : event.status === "upcoming" ? "À VENIR" : "INFO";
  return (
    <article className="msc-event-card">
      <div className="msc-event-date">
        <div>{statusLabel}</div>
        {event.dateLabel ? <div style={{ marginTop: 4, opacity: .75 }}>{event.dateLabel}</div> : null}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="msc-event-title" translate="no" data-i18n-skip="true">{event.title}</div>
        {event.subtitle ? <div className="msc-event-sub" translate="no" data-i18n-skip="true">{event.subtitle}</div> : null}
        {event.resultLabel ? <div className="msc-event-result" translate="no" data-i18n-skip="true">{event.resultLabel}</div> : null}
      </div>
      {href ? <a className="msc-event-link" href={href} target="_blank" rel="noreferrer noopener">{event.watchUrl ? "▶ REGARDER" : "OUVRIR"}</a> : null}
    </article>
  );
}


function NewsCard({ item, lang }: { item: SportLiveNewsItem; lang: string }) {
  const kindLabel = item.kind === "result" ? "RÉSULTAT" : item.kind === "live" ? "LIVE" : item.kind === "upcoming" ? "À VENIR" : "ACTU";
  const kindClass = item.kind === "result" ? " is-result" : item.kind === "live" ? " is-live" : item.kind === "upcoming" ? " is-upcoming" : "";
  const sourceLogo = sourceImageFromItem({ sourceUrl: item.sourceUrl });
  return (
    <article className={`msc-news-card${kindClass}${item.imageUrl ? "" : " no-image"}`}>
      {item.imageUrl ? (
        <a className="msc-news-thumb" href={item.sourceUrl || item.imageUrl} target="_blank" rel="noreferrer noopener" aria-label={item.title}>
          <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { (event.currentTarget.parentElement as HTMLElement | null)?.style.setProperty("display", "none"); }} />
        </a>
      ) : null}
      <div style={{ minWidth: 0 }}>
        <div className="msc-news-top">
          <span className={`msc-news-kind${kindClass}`}>{kindLabel}</span>
          {item.scope ? <span className={`msc-news-scope is-${item.scope}`}>{item.scopeLabel || (item.scope === "local" ? "LOCAL" : item.scope === "regional" ? "RÉGIONAL" : "MONDE")}</span> : null}
          <span className="msc-news-source">{sourceLogo ? <img src={sourceLogo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}<span>{item.sourceName || "WEB"}{item.publishedAt ? ` · ${formatDate(item.publishedAt, lang)}` : ""}</span></span>
        </div>
        <div className="msc-news-title" translate="no" data-i18n-skip="true">{item.title}</div>
        {item.summary ? <div className="msc-news-summary" translate="no" data-i18n-skip="true">{item.summary}</div> : null}
        {item.resultLabel ? <div className="msc-news-result" translate="no" data-i18n-skip="true">{item.resultLabel}</div> : null}
      </div>
      {item.sourceUrl ? <a className="msc-news-link" href={item.sourceUrl} target="_blank" rel="noreferrer noopener">LIRE</a> : null}
    </article>
  );
}

function LeadNewsCard({ item, lang }: { item: SportLiveNewsItem; lang: string }) {
  const kindLabel = item.kind === "result" ? "RÉSULTAT" : item.kind === "live" ? "LIVE" : item.kind === "upcoming" ? "À VENIR" : "À LA UNE";
  const sourceLogo = sourceImageFromItem({ sourceUrl: item.sourceUrl });
  return (
    <article className={`msc-news-lead${item.imageUrl ? "" : " is-no-image"}`}>
      {item.imageUrl ? <div className="msc-news-lead-media"><img src={item.imageUrl} alt="" loading="eager" referrerPolicy="no-referrer" /></div> : null}
      <div className="msc-news-lead-shade" />
      <div className="msc-news-lead-content">
        <div className="msc-news-top">
          <span className={`msc-news-kind${item.kind === "result" ? " is-result" : item.kind === "live" ? " is-live" : item.kind === "upcoming" ? " is-upcoming" : ""}`}>{kindLabel}</span>
          {item.scope ? <span className={`msc-news-scope is-${item.scope}`}>{item.scopeLabel || (item.scope === "local" ? "LOCAL" : item.scope === "regional" ? "RÉGIONAL" : "MONDE")}</span> : null}
          <span className="msc-news-source">{sourceLogo ? <img src={sourceLogo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}<span>{item.sourceName || "WEB"}{item.publishedAt ? ` · ${formatDate(item.publishedAt, lang)}` : ""}</span></span>
        </div>
        <div className="msc-news-lead-title" translate="no" data-i18n-skip="true">{item.title}</div>
        {item.summary ? <div className="msc-news-lead-summary" translate="no" data-i18n-skip="true">{item.summary}</div> : null}
        {item.resultLabel ? <div className="msc-news-result" translate="no" data-i18n-skip="true">{item.resultLabel}</div> : null}
        {item.sourceUrl ? <a className="msc-news-lead-link" href={item.sourceUrl} target="_blank" rel="noreferrer noopener">LIRE L’ARTICLE</a> : null}
      </div>
    </article>
  );
}

function EmptySection({ title, copy, sources }: { title: string; copy: string; sources: SportLiveSource[] }) {
  const usable = sources.filter((source) => source.scoresUrl || source.watchUrl || source.resultsUrl || source.calendarUrl || source.homeUrl).slice(0, 4);
  return (
    <div className="msc-empty-card">
      <div className="msc-empty-title">{title}</div>
      <div className="msc-empty-copy">{copy}</div>
      {usable.length ? (
        <div className="msc-source-rail">
          {usable.map((source) => (
            <div className="msc-source-row" key={source.id}>
              <div className="msc-source-logo">{sourceImageFromSource(source) ? <img src={sourceImageFromSource(source)!} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>🌐</span>}</div>
              <div style={{ minWidth: 0, textAlign: "left" }}>
                <div className="msc-source-name" translate="no" data-i18n-skip="true">{source.name}</div>
                <div className="msc-source-desc">{source.description}</div>
              </div>
              <div className="msc-source-actions">
                <a className="msc-mini-link is-primary" href={bestPrimaryLink(source) || source.homeUrl} target="_blank" rel="noreferrer noopener">OUVRIR</a>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SourceDirectory({ sources }: { sources: SportLiveSource[] }) {
  return (
    <div className="msc-source-rail">
      {sources.map((source) => (
        <div className="msc-source-row" key={source.id}>
          <div className="msc-source-logo">{sourceImageFromSource(source) ? <img src={sourceImageFromSource(source)!} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>🌐</span>}</div>
          <div style={{ minWidth: 0 }}>
            <div className="msc-source-name" translate="no" data-i18n-skip="true">{source.name}</div>
            <div className="msc-source-desc">{source.description}</div>
          </div>
          <div className="msc-source-actions">
            <a className="msc-mini-link is-primary" href={bestPrimaryLink(source) || source.homeUrl} target="_blank" rel="noreferrer noopener">OUVRIR</a>
            {source.watchUrl ? <a className="msc-mini-link" href={source.watchUrl} target="_blank" rel="noreferrer noopener">TV</a> : null}
            {source.resultsUrl ? <a className="msc-mini-link" href={source.resultsUrl} target="_blank" rel="noreferrer noopener">RÉSULTATS</a> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function buildTicker(feed: SportLiveOverview | null, lang: string, sportLabel: string, sources: SportLiveSource[]): TickerItem[] {
  const items: TickerItem[] = [];

  // Priorité au dernier résultat publié : le ruban doit d'abord se comporter
  // comme un ticker de journal sportif, puis compléter avec LIVE / actualités.
  (feed?.results || []).slice(0, 6).forEach((row) => {
    items.push({
      id: `result-${row.id}`,
      sport: sportLabel,
      label: `${row.winner?.name || "—"} - ${row.loser?.name || "—"}`,
      score: `${scoreValue(row.winner?.score)}-${scoreValue(row.loser?.score)}`,
      meta: `${row.competition || "Résultat"} · ${formatDate(row.playedOn, lang)}`,
    });
  });

  (feed?.news || []).filter((item) => item.kind === "result").slice(0, 5).forEach((item) => {
    if (items.length >= 8) return;
    items.push({
      id: `news-result-${item.id}`,
      sport: sportLabel,
      label: item.title,
      score: item.resultLabel || undefined,
      meta: `Résultat · ${item.sourceName || "Web"}`,
    });
  });

  (feed?.live || []).slice(0, 4).forEach((row) => {
    if (items.length >= 8) return;
    const [a, b] = row.players || [];
    items.push({
      id: `live-${row.id}`,
      sport: sportLabel,
      label: `${a?.name || "—"} - ${b?.name || "—"}`,
      score: `${scoreValue(a?.score)}-${scoreValue(b?.score)}`,
      meta: `${row.competition || "Compétition"} · ${niceRound(row.round) || "En direct"}`,
      live: true,
    });
  });

  (feed?.events || []).filter((event) => event.status === "result" || event.status === "live").slice(0, 5).forEach((event) => {
    if (items.length >= 8) return;
    items.push({
      id: `event-${event.id}`,
      sport: sportLabel,
      label: event.title,
      score: event.resultLabel || undefined,
      meta: `${event.status === "result" ? "Résultat" : "Live"} · ${event.dateLabel || event.sourceName || "Officiel"}`,
      live: event.status === "live",
    });
  });

  (feed?.news || []).filter((item) => item.kind !== "result").slice(0, 4).forEach((item) => {
    if (items.length >= 8) return;
    items.push({
      id: `news-${item.id}`,
      sport: sportLabel,
      label: item.title,
      score: item.resultLabel || undefined,
      meta: `${item.kind === "live" ? "Live" : item.kind === "upcoming" ? "À venir" : "Actu"} · ${item.sourceName || "Web"}`,
      live: item.kind === "live",
    });
  });

  if (!items.length) {
    sources.slice(0, 3).forEach((source) => {
      items.push({
        id: `source-${source.id}`,
        sport: sportLabel,
        label: source.shortName || source.name,
        meta: source.resultsUrl ? "Résultats officiels disponibles" : source.watchUrl ? "Diffusion officielle" : "Source officielle",
      });
    });
  }
  return items.slice(0, 8);
}

function FloatingDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="msc-float-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="msc-float-panel" onClick={(event) => event.stopPropagation()}>
        <div className="msc-float-head"><div className="msc-float-title">{title}</div><button className="msc-float-close" type="button" onClick={onClose}>×</button></div>
        <div style={{ paddingTop: 8 }}>{children}</div>
      </div>
    </div>
  );
}

export default function SportLiveHub({ go }: { go?: (route: any, params?: any) => void } = {}) {
  const { lang } = useLang();
  const { sport } = useSport();
  const supportedSport = isLiveSportsSupportedSport(sport);
  const liveSport = supportedSport ? sport : "darts";
  const meta = SPORT_LIVE_META[liveSport];
  const preferredRegions = React.useMemo(() => getAvailableRegions(liveSport, lang), [liveSport, lang]);
  const recommended = React.useMemo(() => getRecommendedSportSources(liveSport, lang), [liveSport, lang]);
  const allSportSources = React.useMemo(() => getSportSources(liveSport), [liveSport]);

  const [view, setView] = React.useState<View>("overview");
  const [region, setRegion] = React.useState<RegionFilter>("recommended");
  const [feed, setFeed] = React.useState<SportLiveOverview | null>(() => getCachedSportLiveOverview(liveSport, lang));
  const [loading, setLoading] = React.useState(() => !getCachedSportLiveOverview(liveSport, lang));
  const [feedError, setFeedError] = React.useState<string | null>(null);
  const [floatingPanel, setFloatingPanel] = React.useState<FloatingPanel>(null);
  const [archiveLoading, setArchiveLoading] = React.useState(false);
  const archiveLoadedRef = React.useRef<string>("");
  const calendarLoadedRef = React.useRef<string>("");
  const openAgenda = React.useCallback(() => {
    try { localStorage.setItem("mss-agenda-live-filter", "1"); } catch {}
    if (go) { go("agenda", { live: true, sport: liveSport }); return; }
    try { window.location.hash = "#/agenda"; } catch {}
  }, [go, liveSport]);

  const applyFeed = React.useCallback((next: SportLiveOverview) => {
    setFeed((previous) => mergeSportLiveOverview(previous, next));
  }, []);

  React.useEffect(() => {
    const cached = getCachedSportLiveOverview(liveSport, lang);
    setRegion("recommended");
    setView("overview");
    setFeed(cached);
    setLoading(!cached);
    setFeedError(null);
    setFloatingPanel(null);
    setArchiveLoading(false);
  }, [liveSport, lang]);

  // Progressive pipeline: local cache is rendered synchronously by state above,
  // then structured scores/results, then the news journal, then the expensive
  // deep enrichment while the page is already fully usable.
  React.useEffect(() => {
    let active = true;
    const controllers = new Set<AbortController>();
    let deepTimer: number | null = null;
    let idleHandle: number | null = null;

    const phase = async (name: "fast" | "full" | "deep") => {
      const controller = new AbortController();
      controllers.add(controller);
      try {
        const next = await fetchSportLiveOverview(liveSport, controller.signal, lang, name);
        if (!active) return false;
        applyFeed(next);
        setFeedError(null);
        return true;
      } catch (error: any) {
        if (!active || error?.name === "AbortError") return false;
        if (!getCachedSportLiveOverview(liveSport, lang)) setFeedError(String(error?.message || error || "LIVE partiel"));
        return false;
      } finally {
        controllers.delete(controller);
      }
    };

    const scheduleDeep = () => {
      const run = () => { if (active) void phase("deep"); };
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        idleHandle = (window as any).requestIdleCallback(run, { timeout: 1800 });
      } else {
        deepTimer = window.setTimeout(run, 900);
      }
    };

    const load = async () => {
      const cached = getCachedSportLiveOverview(liveSport, lang);
      if (!cached) setLoading(true);
      await phase("fast");
      if (active) setLoading(false);
      await phase("full");
      if (active) scheduleDeep();
    };

    void load();
    return () => {
      active = false;
      controllers.forEach((controller) => controller.abort());
      if (deepTimer !== null) window.clearTimeout(deepTimer);
      if (idleHandle !== null && typeof (window as any).cancelIdleCallback === "function") (window as any).cancelIdleCallback(idleHandle);
    };
  }, [liveSport, lang, applyFeed]);

  // Heavy historical archives and the year-long calendar are demand-loaded.
  // This keeps the LIVE landing page fast while allowing the results/programme
  // drawers to grow into a long-term sports archive when the user opens them.
  React.useEffect(() => {
    const wantsArchive = view === "results" || floatingPanel === "results";
    if (!wantsArchive) return;
    const key = `${liveSport}:${lang}`;
    if (archiveLoadedRef.current === key) return;
    archiveLoadedRef.current = key;
    setArchiveLoading(true);
    void fetchSportLiveOverview(liveSport, undefined, lang, "archive")
      .then((archive) => applyFeed(archive))
      .catch(() => { archiveLoadedRef.current = ""; })
      .finally(() => setArchiveLoading(false));
  }, [view, floatingPanel, liveSport, lang, applyFeed]);

  React.useEffect(() => {
    const wantsCalendar = view === "fixtures" || floatingPanel === "fixtures";
    if (!wantsCalendar) return;
    const key = `${liveSport}:${lang}`;
    if (calendarLoadedRef.current === key) return;
    calendarLoadedRef.current = key;
    void fetchSportLiveOverview(liveSport, undefined, lang, "calendar")
      .then((calendar) => applyFeed(calendar))
      .catch(() => { calendarLoadedRef.current = ""; });
  }, [view, floatingPanel, liveSport, lang, applyFeed]);

  // Automatic refresh stays light: structured data first, then the normal news
  // layer. The deep/AI/media layer is reserved for initial idle time or a manual
  // refresh so it cannot hammer slow sources every 30 seconds/minutes.
  React.useEffect(() => {
    const refreshMs = refreshIntervalFor(liveSport, feed);
    if (!refreshMs) return;
    let active = true;
    let controller: AbortController | null = null;
    const timer = window.setInterval(() => {
      void (async () => {
        controller?.abort();
        controller = new AbortController();
        try {
          const fast = await fetchSportLiveOverview(liveSport, controller.signal, lang, "fast");
          if (!active) return;
          applyFeed(fast);
          const full = await fetchSportLiveOverview(liveSport, controller.signal, lang, "full");
          if (!active) return;
          applyFeed(full);
          setFeedError(null);
        } catch (error: any) {
          if (active && error?.name !== "AbortError" && !getCachedSportLiveOverview(liveSport, lang)) {
            setFeedError(String(error?.message || error || "LIVE partiel"));
          }
        }
      })();
    }, refreshMs);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(timer);
    };
  }, [liveSport, lang, !!feed?.configured, !!feed?.liveAvailable, applyFeed]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setFeedError(null);
    try {
      const fast = await fetchSportLiveOverview(liveSport, undefined, lang, "fast");
      applyFeed(fast);
      setLoading(false);
      const full = await fetchSportLiveOverview(liveSport, undefined, lang, "full");
      applyFeed(full);
      // Deep enrichment deliberately happens after the visible refresh is done.
      void fetchSportLiveOverview(liveSport, undefined, lang, "deep")
        .then((deep) => applyFeed(deep))
        .catch(() => undefined);
    } catch (error: any) {
      setFeedError(String(error?.message || error || "LIVE indisponible"));
    } finally {
      setLoading(false);
    }
  }, [liveSport, lang, applyFeed]);

  const sources = React.useMemo(() => {
    if (region === "all") return allSportSources;
    if (region === "recommended") return recommended;
    return allSportSources.filter((source) => source.regions.includes(region));
  }, [allSportSources, recommended, region]);

  const liveRows = feed?.live || [];
  const fixtureRows = feed?.fixtures || [];
  const resultRows = React.useMemo(() => [...(feed?.results || [])].sort((a, b) => dateTs(b.playedOn) - dateTs(a.playedOn)), [feed?.results]);
  const competitionIndex = feed?.competitionIndex || [];
  const archiveStorage = feed?.archiveStorage || null;
  const archiveSeasonCount = React.useMemo(() => {
    const indexed = new Set(competitionIndex.flatMap((entry) => entry.seasons || []).filter((value) => value && value !== "UNKNOWN"));
    if (indexed.size) return indexed.size;
    return new Set(resultRows.map((row) => resultSeasonLabel(row.playedOn)).filter((value) => value !== "NON DATÉ")).size;
  }, [resultRows, competitionIndex]);
  const eventRows = feed?.events || [];
  const newsRows = React.useMemo(() => orderNewsEditorial(feed?.news || []), [feed?.news]);
  const liveEvents = eventRows.filter((event) => event.status === "live");
  const upcomingEvents = eventRows.filter((event) => event.status === "upcoming" || event.status === "info");
  const resultEvents = eventRows.filter((event) => event.status === "result");
  const sourceForCards = recommended.find((source) => !!source.watchUrl) || recommended.find((source) => !!source.scoresUrl) || recommended[0] || null;
  const ticker = React.useMemo(() => buildTicker(feed, lang, meta.label, recommended), [feed, lang, meta.label, recommended]);

  const cssVars = {
    "--live-accent": "#ff3048",
    "--live-accent-dark": "#a81728",
    "--live-accent-soft": "rgba(255,48,72,.18)",
    "--live-accent-shadow": "rgba(255,48,72,.22)",
    "--live-accent-faint": "rgba(255,48,72,.055)",
  } as React.CSSProperties;

  return (
    <div className="msc-live-root" style={cssVars}>
      <LiveStyles />

      <header className="msc-live-header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="msc-live-kicker">LIVE SPORTS</div>
          <div className="msc-live-title"><strong>{meta.label.toUpperCase()}</strong> <span>LIVE</span></div>
          <div className="msc-live-subtitle">Matchs en direct, à venir et résultats officiels</div>
        </div>
        <button className="msc-live-refresh" type="button" onClick={() => void refresh()} disabled={loading} aria-label="Actualiser">
          {loading ? "…" : "↻"}
        </button>
      </header>

      <ScoreTicker items={ticker} sportLabel={meta.label} />

      {feedError ? <div className="msc-live-warning">LIVE PARTIEL · certaines sources n’ont pas répondu</div> : null}


      <nav className="msc-live-tabs" aria-label="Rubriques LIVE SPORTS">
        {([
          ["overview", "À LA UNE"],
          ["live", `EN DIRECT${(liveRows.length + liveEvents.length) ? ` · ${liveRows.length + liveEvents.length}` : ""}`],
          ["fixtures", `À VENIR${(fixtureRows.length + upcomingEvents.length) ? ` · ${fixtureRows.length + upcomingEvents.length}` : ""}`],
          ["results", `RÉSULTATS${(resultRows.length + resultEvents.length) ? ` · ${resultRows.length + resultEvents.length}` : ""}`],
        ] as Array<[View, string]>).map(([key, label]) => (
          <button key={key} className={`msc-live-tab${view === key ? " is-active" : ""}`} type="button" onClick={() => setView(key)}>{label}</button>
        ))}
      </nav>

      {!supportedSport ? (
        <section className="msc-live-section">
          <SectionHeader title="INDISPONIBLE" />
          <EmptySection title="LIVE SPORTS n’est pas encore câblé pour ce sport." copy="Utilise le logo flottant du sport, en haut à droite comme sur la Home, pour changer de discipline. Aucun résultat d’un autre sport n’est affiché à sa place." sources={[]} />
        </section>
      ) : null}

      {supportedSport && view === "overview" ? (
        <>
          <section className="msc-live-section">
            <SectionHeader title="À LA UNE" count={newsRows.length ? `${newsRows.length} actus` : ""} />
            {newsRows.length ? (
              <>
                <LeadNewsCard item={newsRows.find((item) => !!item.imageUrl) || newsRows[0]} lang={lang} />
                <div style={{ marginTop: 7 }}><button className="msc-more-btn" type="button" onClick={() => setFloatingPanel("news")}>TOUTES LES ACTUS · {newsRows.length}</button></div>
              </>
            ) : <EmptySection title="Actualités en cours de chargement" copy="LIVE Intelligence recherche les dernières informations publiées." sources={recommended.slice(0, 1)} />}
          </section>

          {(liveRows.length + liveEvents.length) > 0 ? (
            <section className="msc-live-section">
              <SectionHeader title="EN DIRECT" count={`${liveRows.length + liveEvents.length}`} />
              <div className="msc-compact-list">
                {liveRows.slice(0, 2).map((item) => {
                  const [left, right] = item.players || [];
                  return <div className="msc-compact-row" key={item.id}><div className="msc-compact-tag">● LIVE</div><div className="msc-compact-main" translate="no">{left?.name || "—"} · {right?.name || "—"}</div><div className="msc-compact-score">{scoreValue(left?.score)}-{scoreValue(right?.score)}</div></div>;
                })}
                {!liveRows.length ? liveEvents.slice(0, 2).map((event) => <div className="msc-compact-row" key={event.id}><div className="msc-compact-tag">● LIVE</div><div className="msc-compact-main" translate="no">{event.title}</div><div className="msc-compact-score">{event.resultLabel || "EN COURS"}</div></div>) : null}
              </div>
              <div style={{ marginTop: 7 }}><button className="msc-more-btn" type="button" onClick={() => setView("live")}>OUVRIR LES DIRECTS</button></div>
            </section>
          ) : null}

          <section className="msc-live-section">
            <SectionHeader title="DERNIERS RÉSULTATS" count={`${resultRows.length + resultEvents.length}`} />
            <div className="msc-compact-list">
              {resultRows.slice(0, 3).map((item) => (
                <div className="msc-compact-row" key={item.id}><div className="msc-compact-tag">RÉSULTAT</div><div className="msc-compact-main" translate="no">{item.winner.name} · {item.loser.name}</div><div className="msc-compact-score">{scoreValue(item.winner.score)}-{scoreValue(item.loser.score)}</div></div>
              ))}
              {!resultRows.length ? resultEvents.slice(0, 3).map((event) => (
                <div className="msc-compact-row" key={event.id}><div className="msc-compact-tag">RÉSULTAT</div><div className="msc-compact-main" translate="no">{event.title}</div><div className="msc-compact-score">{event.resultLabel || "PUBLIÉ"}</div></div>
              )) : null}
            </div>
            <div style={{ marginTop: 7 }}><button className="msc-more-btn" type="button" onClick={() => setFloatingPanel("results")}>VOIR TOUS LES RÉSULTATS</button></div>
          </section>

          <section className="msc-live-section">
            <SectionHeader title="À VENIR" count={`${fixtureRows.length + upcomingEvents.length}`} />
            <div className="msc-compact-list">
              {fixtureRows.slice(0, 2).map((item) => (
                <div className="msc-compact-row" key={item.id}><div className="msc-compact-tag" style={{ color: "#64b8ff" }}>À VENIR</div><div className="msc-compact-main" translate="no">{item.players.map((p) => p.name).filter(Boolean).join(" vs ") || item.competition || "Match"}</div><div className="msc-compact-score" style={{ color: "#dbe5ee" }}>{item.startsAt ? formatDateTime(item.startsAt, lang) : formatDate(item.date, lang)}</div></div>
              ))}
              {!fixtureRows.length ? upcomingEvents.slice(0, 2).map((event) => (
                <div className="msc-compact-row" key={event.id}><div className="msc-compact-tag" style={{ color: "#64b8ff" }}>À VENIR</div><div className="msc-compact-main" translate="no">{event.title}</div><div className="msc-compact-score" style={{ color: "#dbe5ee" }}>{event.dateLabel || "BIENTÔT"}</div></div>
              )) : null}
            </div>
            <div style={{ marginTop: 7 }}><button className="msc-more-btn" type="button" onClick={openAgenda}>OUVRIR DANS L’AGENDA</button></div>
          </section>
        </>
      ) : null}

      {supportedSport && view === "live" ? (
        <section className="msc-live-section">
          <SectionHeader title="EN DIRECT" count={(liveRows.length + liveEvents.length) ? `${liveRows.length + liveEvents.length} direct${(liveRows.length + liveEvents.length) > 1 ? "s" : ""}` : ""} />
          {liveRows.length ? liveRows.map((item) => <LiveMatchCard key={item.id} item={item} source={sourceForCards} />) : liveEvents.length ? liveEvents.map((event) => <OfficialEventCard key={event.id} event={event} />) : <EmptySection title="Aucun direct détecté" copy="Les liens de suivi et de diffusion officiels restent disponibles ci-dessous." sources={recommended.filter((source) => source.scoresUrl || source.watchUrl)} />}
        </section>
      ) : null}

      {supportedSport && view === "fixtures" ? (
        <section className="msc-live-section">
          <SectionHeader title="À VENIR" count={(fixtureRows.length + upcomingEvents.length) ? `${fixtureRows.length + upcomingEvents.length} événement${(fixtureRows.length + upcomingEvents.length) > 1 ? "s" : ""}` : ""} />
          <div className="msc-empty-card" style={{ marginBottom: 10 }}>
            <div className="msc-empty-title">AGENDA MULTISPORTS</div>
            <div className="msc-empty-copy">Tous les événements LIVE sont intégrés à l’Agenda principal. Utilise le filtre LIVE pour les afficher ou les masquer.</div>
            <button className="msc-more-btn" type="button" onClick={openAgenda}>OUVRIR L’AGENDA · FILTRE LIVE</button>
          </div>
          {fixtureRows.slice(0, 12).map((item) => <FixtureMatchCard key={item.id} item={item} source={sourceForCards} lang={lang} />)}
          {!fixtureRows.length && !upcomingEvents.length ? <EmptySection title="Aucun événement détecté" copy="Les événements LIVE apparaissent dans l’Agenda dès qu’une date exploitable est disponible." sources={recommended.filter((source) => source.calendarUrl)} /> : null}
        </section>
      ) : null}

      {supportedSport && view === "results" ? (
        <section className="msc-live-section">
          <SectionHeader title="RÉSULTATS" count={(resultRows.length + resultEvents.length) ? `${resultRows.length + resultEvents.length} résultat${(resultRows.length + resultEvents.length) > 1 ? "s" : ""}` : ""} />
          <div className="msc-archive-summary" style={{ marginBottom: 8 }}>
            <div><strong>{archiveLoading ? "ARCHIVES · CHARGEMENT…" : `ARCHIVES · ${archiveSeasonCount || 0} SAISON${archiveSeasonCount === 1 ? "" : "S"}`}</strong></div>
            <div><b>{archiveStorage?.competitions ?? competitionIndex.length}</b><small>compétitions</small></div>
            <div><b>{archiveStorage?.results ?? resultRows.length}</b><small>résultats</small></div>
          </div>
          {resultRows.length ? <><GroupedResults rows={resultRows} source={sourceForCards} lang={lang} newsRows={newsRows} allSources={allSportSources} sport={liveSport} competitionIndex={competitionIndex} />{resultEvents.length ? <div style={{ marginTop: 12 }}><div className="msc-round-head"><span>AUTRES RÉSULTATS / PODIUMS</span><span>{resultEvents.length}</span></div>{resultEvents.map((event) => <OfficialEventCard key={event.id} event={event} />)}</div> : null}</> : resultEvents.length ? resultEvents.map((event) => <OfficialEventCard key={event.id} event={event} />) : <EmptySection title="Résultats officiels" copy="Aucun résultat automatique n’est chargé pour l’instant. Ouvre une source officielle pour consulter les derniers scores." sources={recommended.filter((source) => source.resultsUrl)} />}
        </section>
      ) : null}

      {supportedSport && view === "news" ? (
        <section className="msc-live-section">
          <SectionHeader title="ACTUS" count={newsRows.length ? `${newsRows.length}` : ""} />
          {newsRows.length ? <div className="msc-news-grid">{newsRows.map((item) => <NewsCard key={item.id} item={item} lang={lang} />)}</div> : <EmptySection title="Aucune actualité détectée" copy="Le moteur LIVE Intelligence tente automatiquement les sources web récentes. Réessaie avec le bouton d’actualisation." sources={recommended.slice(0, 4)} />}
        </section>
      ) : null}

      {supportedSport && view === "sources" ? (
        <section className="msc-live-section">
          <SectionHeader title="SOURCES" count={`${sources.length}`} />
          <div className="msc-region-row">
            <button className={`msc-region-btn${region === "recommended" ? " is-active" : ""}`} type="button" onClick={() => setRegion("recommended")}>★ RECOMMANDÉ</button>
            {preferredRegions.map((item) => <button key={item} className={`msc-region-btn${region === item ? " is-active" : ""}`} type="button" onClick={() => setRegion(item)}>{SPORT_LIVE_REGION_LABELS[item]}</button>)}
            <button className={`msc-region-btn${region === "all" ? " is-active" : ""}`} type="button" onClick={() => setRegion("all")}>TOUTES</button>
          </div>
          <SourceDirectory sources={sources} />
        </section>
      ) : null}

      {supportedSport ? (
        <div className="msc-quick-dock" aria-label="Accès rapides LIVE SPORTS">
          <button className="msc-quick-btn" type="button" onClick={() => setFloatingPanel("news")} aria-label="Actualités">📰</button>
          <button className="msc-quick-btn" type="button" onClick={() => setFloatingPanel("results")} aria-label="Résultats">🏆</button>
          <button className="msc-quick-btn" type="button" onClick={openAgenda} aria-label="Agenda LIVE">🗓</button>
          <button className="msc-quick-btn" type="button" onClick={() => setFloatingPanel("sources")} aria-label="Sources">🌍</button>
        </div>
      ) : null}

      {floatingPanel === "news" ? <FloatingDrawer title={`ACTUALITÉS · ${meta.label.toUpperCase()}`} onClose={() => setFloatingPanel(null)}>{newsRows.length ? <div className="msc-news-grid">{newsRows.map((item) => <NewsCard key={item.id} item={item} lang={lang} />)}</div> : <EmptySection title="Aucune actualité détectée" copy="Réessaie l’actualisation dans quelques instants." sources={recommended.slice(0, 2)} />}</FloatingDrawer> : null}
      {floatingPanel === "results" ? <FloatingDrawer title={`RÉSULTATS · ${meta.label.toUpperCase()}`} onClose={() => setFloatingPanel(null)}><div className="msc-archive-summary" style={{ marginBottom: 8 }}><div><strong>{archiveLoading ? "ARCHIVES · CHARGEMENT…" : `ARCHIVES · ${archiveSeasonCount || 0} SAISON${archiveSeasonCount === 1 ? "" : "S"}`}</strong></div><div><b>{Math.max(competitionIndex.length, archiveStorage?.competitions || 0)}</b><small>compétitions</small></div><div><b>{Math.max(resultRows.length, archiveStorage?.results || 0)}</b><small>résultats</small></div></div>{resultRows.length ? <><GroupedResults rows={resultRows} source={sourceForCards} lang={lang} newsRows={newsRows} allSources={allSportSources} sport={liveSport} competitionIndex={competitionIndex} />{resultEvents.length ? <div style={{ marginTop: 12 }}><div className="msc-round-head"><span>AUTRES RÉSULTATS / PODIUMS</span><span>{resultEvents.length}</span></div>{resultEvents.map((event) => <OfficialEventCard key={event.id} event={event} />)}</div> : null}</> : resultEvents.length ? resultEvents.map((event) => <OfficialEventCard key={event.id} event={event} />) : <EmptySection title="Aucun résultat détecté" copy="Les sources officielles restent disponibles." sources={recommended.filter((source) => source.resultsUrl).slice(0, 2)} />}</FloatingDrawer> : null}
      {floatingPanel === "fixtures" ? <FloatingDrawer title={`AGENDA · ${meta.label.toUpperCase()}`} onClose={() => setFloatingPanel(null)}><div className="msc-empty-card"><div className="msc-empty-title">AGENDA MULTISPORTS</div><div className="msc-empty-copy">Le calendrier LIVE n’est plus dupliqué dans cette page. Les événements réels sont affichés dans l’Agenda principal avec le filtre LIVE.</div><button className="msc-more-btn" type="button" onClick={openAgenda}>OUVRIR L’AGENDA</button></div></FloatingDrawer> : null}
      {floatingPanel === "sources" ? <FloatingDrawer title={`SOURCES · ${meta.label.toUpperCase()}`} onClose={() => setFloatingPanel(null)}><SourceDirectory sources={sources} /></FloatingDrawer> : null}

    </div>
  );
}

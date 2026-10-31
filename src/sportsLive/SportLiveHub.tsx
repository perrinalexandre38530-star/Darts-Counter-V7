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
import type { SportLiveEvent, SportLiveNewsItem, SportLiveOverview, SportLiveRegion, SportLiveSource } from "./types";
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

function findCompetitionImage(competition: string, rows: DartsLiveResult[], newsRows: SportLiveNewsItem[], sources: SportLiveSource[]) {
  const comp = normalizedText(competition);
  const terms = comp.split(/\s+/).filter((part) => part.length >= 4 && !["darts", "open", "tour", "cup", "the", "and", "stage", "final"].includes(part));
  const relatedNews = newsRows.find((item) => {
    if (!item?.imageUrl) return false;
    const hay = normalizedText(`${item.title} ${item.summary || ""}`);
    if (!hay) return false;
    if (comp && hay.includes(comp)) return true;
    return terms.length ? terms.filter((term) => hay.includes(term)).length >= Math.min(2, terms.length) : false;
  });
  if (relatedNews?.imageUrl) return relatedNews.imageUrl;
  const row = rows.find(Boolean);
  const rowSource = itemSource(row, sources.find((source) => {
    const sourceName = normalizedText(row?.sourceName || "");
    return sourceName && [source.name, source.shortName].some((candidate) => normalizedText(candidate).includes(sourceName) || sourceName.includes(normalizedText(candidate)));
  }) || null);
  return faviconUrl(rowSource.url, 96);
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
      .msc-result-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#c3cad2; font-size:10.5px; font-weight:900; line-height:1.05; }
      .msc-result-country { margin-left:5px; font-size:10px; vertical-align:1px; }
      .msc-result-scores { display:grid; grid-template-rows:1fr 1fr; align-items:center; justify-items:center; border-left:1px solid #28313a; font-variant-numeric:tabular-nums; }
      .msc-result-score { width:100%; text-align:center; font-size:18px; line-height:1; font-weight:1000; color:#aeb7c0; }
      .msc-result-score.is-winner { color:#f4d445; }
      .msc-result-head-spacer { flex:1; }
      .msc-live-warning { margin:7px 0 0; padding:6px 8px; border:1px solid rgba(255,80,96,.25); border-radius:8px; background:rgba(255,48,72,.07); color:#ff8995; font-size:8.5px; font-weight:900; text-align:center; }
      .msc-hierarchy-block { margin:4px 0 5px; padding:7px 8px 6px; border:1px solid #242c34; border-radius:12px; background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008)); }
      .msc-hierarchy-label { color:#7f8995; font-size:7.5px; font-weight:1000; letter-spacing:.65px; }
      .msc-hierarchy-label.is-secondary { margin-top:5px; }
      .msc-category-dock { display:flex; gap:6px; overflow-x:auto; padding:2px 0 5px; scrollbar-width:none; }
      .msc-category-dock::-webkit-scrollbar { display:none; }
      .msc-category-btn { flex:0 0 auto; min-height:31px; display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border:1px solid #2b343d; border-radius:999px; background:#0b1015; color:#909ba6; font-size:8px; font-weight:1000; cursor:pointer; }
      .msc-category-btn.is-active { color:#fff; border-color:var(--live-accent); background:linear-gradient(180deg,rgba(255,48,72,.17),#0b1015); box-shadow:0 0 12px rgba(255,48,72,.08); }
      .msc-taxonomy-row { display:flex; gap:5px; flex-wrap:wrap; margin-top:3px; }
      .msc-taxonomy-chip { display:inline-flex; align-items:center; min-height:18px; padding:2px 6px; border-radius:999px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.035); color:#9fa9b4; font-size:6.9px; font-weight:950; text-transform:uppercase; letter-spacing:.2px; }
      .msc-competition-head-main { min-width:0; }
      .msc-competition-dock { display:flex; gap:6px; overflow-x:auto; padding:8px 0 6px; scrollbar-width:none; }
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
      .msc-competition-group { overflow:hidden; border:1px solid #252d35; border-radius:12px; background:#090d11; }
      .msc-competition-head { min-height:38px; display:grid; grid-template-columns:25px minmax(0,1fr) auto; align-items:center; gap:7px; padding:7px 8px; background:linear-gradient(90deg,rgba(255,48,72,.11),rgba(255,255,255,.02)); border-bottom:1px solid #252d35; }
      .msc-competition-head-icon { width:34px; height:34px; display:grid; place-items:center; border-radius:11px; overflow:hidden; background:#151b21; font-size:14px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 0 18px rgba(94,198,255,.12); }
      .msc-competition-head-icon img { width:100%; height:100%; object-fit:cover; display:block; }
      .msc-competition-head-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10.5px; font-weight:1000; }
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
        .msc-competition-groups { grid-template-columns:repeat(2,minmax(0,1fr)); align-items:start; }
        .msc-competition-dock { justify-content:center; }
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
      <div className="msc-player-badge">{player?.photoUrl ? <img src={player.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : (flag || playerInitials(player?.name))}</div>
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
  const rows = [
    { player: item.winner, winner: true },
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
                <div className="msc-result-avatar">
                  {player?.photoUrl ? <img src={player.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : (flag || playerInitials(player?.name))}
                </div>
                <div className="msc-result-name" translate="no" data-i18n-skip="true">{player?.name || "À confirmer"}{flag ? <span className="msc-result-country">{flag}</span> : null}</div>
              </div>
            );
          })}
        </div>
        <div className="msc-result-scores">
          <div className="msc-result-score is-winner">{scoreValue(item.winner?.score)}</div>
          <div className="msc-result-score">{scoreValue(item.loser?.score)}</div>
        </div>
      </div>
    </article>
  );
}

function GroupedResults({ rows, source, lang, newsRows, allSources }: { rows: DartsLiveResult[]; source?: SportLiveSource | null; lang: string; newsRows: SportLiveNewsItem[]; allSources: SportLiveSource[] }) {
  const competitions = React.useMemo(() => {
    const map = new Map<string, DartsLiveResult[]>();
    rows.forEach((row) => {
      const key = competitionKey(row.competition);
      const bucket = map.get(key) || [];
      bucket.push(row);
      map.set(key, bucket);
    });
    return Array.from(map.entries())
      .map(([name, matches]) => ({
        name,
        matches: [...matches].sort((a, b) => dateTs(b.playedOn) - dateTs(a.playedOn)),
        latest: Math.max(...matches.map((match) => dateTs(match.playedOn)), 0),
        imageUrl: findCompetitionImage(name, matches, newsRows, allSources),
        tone: competitionVisualTone(name),
        geography: competitionGeography(matches[0]),
        levelGroup: competitionLevelGroup(matches[0]),
        chips: competitionMetaChips(matches[0]),
      }))
      .sort((a, b) => (b.latest - a.latest) || (b.matches.length - a.matches.length) || a.name.localeCompare(b.name));
  }, [rows, newsRows, allSources]);

  const geographies = React.useMemo(() => {
    const counts = new Map<string, number>();
    competitions.forEach((item) => counts.set(item.geography, (counts.get(item.geography) || 0) + item.matches.length));
    return Array.from(counts.entries()).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
  }, [competitions]);
  const levelGroups = React.useMemo(() => {
    const counts = new Map<string, number>();
    competitions.forEach((item) => counts.set(item.levelGroup, (counts.get(item.levelGroup) || 0) + item.matches.length));
    return Array.from(counts.entries()).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
  }, [competitions]);

  const [selectedGeography, setSelectedGeography] = React.useState("__all__");
  const [selectedLevel, setSelectedLevel] = React.useState("__all__");
  const [selected, setSelected] = React.useState("__all__");
  React.useEffect(() => {
    if (selected !== "__all__" && !competitions.some((item) => item.name === selected)) setSelected("__all__");
  }, [competitions, selected]);
  React.useEffect(() => { setSelected("__all__"); }, [selectedGeography, selectedLevel]);

  const hierarchyFiltered = competitions.filter((item) =>
    (selectedGeography === "__all__" || item.geography === selectedGeography) &&
    (selectedLevel === "__all__" || item.levelGroup === selectedLevel)
  );
  const visible = selected === "__all__" ? hierarchyFiltered : hierarchyFiltered.filter((item) => item.name === selected);
  const filteredCount = hierarchyFiltered.reduce((sum,item) => sum + item.matches.length, 0);

  return (
    <>
      <div className="msc-hierarchy-block">
        <div className="msc-hierarchy-label">ZONE / PAYS</div>
        <div className="msc-category-dock" aria-label="Zones et pays">
          <button className={`msc-category-btn${selectedGeography === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setSelectedGeography("__all__")}>🧭 TOUT · {rows.length}</button>
          {geographies.map(([category, count]) => (
            <button key={category} className={`msc-category-btn${selectedGeography === category ? " is-active" : ""}`} type="button" onClick={() => setSelectedGeography(category)} title={category}>{categoryIcon(category)} {category} · {count}</button>
          ))}
        </div>
        <div className="msc-hierarchy-label is-secondary">NIVEAU / CATÉGORIE</div>
        <div className="msc-category-dock" aria-label="Niveaux de compétitions">
          <button className={`msc-category-btn${selectedLevel === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setSelectedLevel("__all__")}>TOUS NIVEAUX</button>
          {levelGroups.map(([category, count]) => (
            <button key={category} className={`msc-category-btn${selectedLevel === category ? " is-active" : ""}`} type="button" onClick={() => setSelectedLevel(category)} title={category}>{categoryIcon(category)} {category} · {count}</button>
          ))}
        </div>
      </div>
      <div className="msc-competition-dock" aria-label="Compétitions">
        <button className={`msc-competition-btn${selected === "__all__" ? " is-active" : ""}`} type="button" onClick={() => setSelected("__all__")} title="Toutes les compétitions">
          <span className="msc-competition-visual"><span className="msc-competition-icon">🏟️</span></span><span className="msc-competition-label">TOUTES</span><span className="msc-competition-count">{filteredCount}</span>
        </button>
        {hierarchyFiltered.map(({ name, matches, imageUrl, tone }) => (
          <button key={name} className={`msc-competition-btn ${tone}${selected === name ? " is-active" : ""}`} type="button" onClick={() => setSelected(name)} title={name}>
            <span className="msc-competition-visual">{imageUrl ? <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="msc-competition-icon">{competitionIcon(name)}</span>}</span><span className="msc-competition-label" translate="no">{name}</span><span className="msc-competition-count">{matches.length}</span>
          </button>
        ))}
      </div>
      <div className="msc-competition-groups">
        {visible.map(({ name, matches, imageUrl, tone, chips }) => {
          const rounds = new Map<string, DartsLiveResult[]>();
          matches.forEach((match) => {
            const round = normalizedRound(match.round);
            const bucket = rounds.get(round) || [];
            bucket.push(match);
            rounds.set(round, bucket);
          });
          const orderedRounds = Array.from(rounds.entries()).sort(([a], [b]) => roundOrder(a) - roundOrder(b));
          return (
            <section className="msc-competition-group" key={name}>
              <div className={`msc-competition-head ${tone}`}>
                <span className="msc-competition-head-icon">{imageUrl ? <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : competitionIcon(name)}</span>
                <div className="msc-competition-head-main">
                  <div className="msc-competition-head-title" translate="no" data-i18n-skip="true">{name}</div>
                  {chips.length ? <div className="msc-taxonomy-row">{chips.map((chip) => <span className="msc-taxonomy-chip" key={`${name}-${chip}`}>{chip}</span>)}</div> : null}
                </div>
                <span className="msc-competition-head-count">{matches.length}</span>
              </div>
              {orderedRounds.map(([round, roundRows]) => (
                <div className="msc-round-group" key={`${name}-${round}`}>
                  <div className="msc-round-head"><span>{round}</span><span>{roundRows.length} match{roundRows.length > 1 ? "s" : ""}</span></div>
                  {roundRows.map((item) => <ResultMatchCard key={item.id} item={item} source={source} lang={lang} />)}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
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

export default function SportLiveHub() {
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
            <div style={{ marginTop: 7 }}><button className="msc-more-btn" type="button" onClick={() => setFloatingPanel("fixtures")}>OUVRIR LE PROGRAMME COMPLET</button></div>
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
          {fixtureRows.length ? fixtureRows.map((item) => <FixtureMatchCard key={item.id} item={item} source={sourceForCards} lang={lang} />) : upcomingEvents.length ? upcomingEvents.map((event) => <OfficialEventCard key={event.id} event={event} />) : <EmptySection title="Calendriers officiels" copy="Aucune donnée automatique n’est chargée. Consulte les calendriers officiels disponibles." sources={recommended.filter((source) => source.calendarUrl)} />}
        </section>
      ) : null}

      {supportedSport && view === "results" ? (
        <section className="msc-live-section">
          <SectionHeader title="RÉSULTATS" count={(resultRows.length + resultEvents.length) ? `${resultRows.length + resultEvents.length} résultat${(resultRows.length + resultEvents.length) > 1 ? "s" : ""}` : ""} />
          {resultRows.length ? <GroupedResults rows={resultRows} source={sourceForCards} lang={lang} newsRows={newsRows} allSources={allSportSources} /> : resultEvents.length ? resultEvents.map((event) => <OfficialEventCard key={event.id} event={event} />) : <EmptySection title="Résultats officiels" copy="Aucun résultat automatique n’est chargé pour l’instant. Ouvre une source officielle pour consulter les derniers scores." sources={recommended.filter((source) => source.resultsUrl)} />}
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
          <button className="msc-quick-btn" type="button" onClick={() => setFloatingPanel("fixtures")} aria-label="Programme">🗓</button>
          <button className="msc-quick-btn" type="button" onClick={() => setFloatingPanel("sources")} aria-label="Sources">🌍</button>
        </div>
      ) : null}

      {floatingPanel === "news" ? <FloatingDrawer title={`ACTUALITÉS · ${meta.label.toUpperCase()}`} onClose={() => setFloatingPanel(null)}>{newsRows.length ? <div className="msc-news-grid">{newsRows.map((item) => <NewsCard key={item.id} item={item} lang={lang} />)}</div> : <EmptySection title="Aucune actualité détectée" copy="Réessaie l’actualisation dans quelques instants." sources={recommended.slice(0, 2)} />}</FloatingDrawer> : null}
      {floatingPanel === "results" ? <FloatingDrawer title={`RÉSULTATS · ${meta.label.toUpperCase()}`} onClose={() => setFloatingPanel(null)}>{resultRows.length ? <GroupedResults rows={resultRows} source={sourceForCards} lang={lang} newsRows={newsRows} allSources={allSportSources} /> : resultEvents.length ? resultEvents.map((event) => <OfficialEventCard key={event.id} event={event} />) : <EmptySection title="Aucun résultat détecté" copy="Les sources officielles restent disponibles." sources={recommended.filter((source) => source.resultsUrl).slice(0, 2)} />}</FloatingDrawer> : null}
      {floatingPanel === "fixtures" ? <FloatingDrawer title={`PROGRAMME · ${meta.label.toUpperCase()}`} onClose={() => setFloatingPanel(null)}>{fixtureRows.length ? fixtureRows.map((item) => <FixtureMatchCard key={item.id} item={item} source={sourceForCards} lang={lang} />) : upcomingEvents.length ? upcomingEvents.map((event) => <OfficialEventCard key={event.id} event={event} />) : <EmptySection title="Aucun événement à venir" copy="Consulte les calendriers officiels." sources={recommended.filter((source) => source.calendarUrl).slice(0, 2)} />}</FloatingDrawer> : null}
      {floatingPanel === "sources" ? <FloatingDrawer title={`SOURCES · ${meta.label.toUpperCase()}`} onClose={() => setFloatingPanel(null)}><SourceDirectory sources={sources} /></FloatingDrawer> : null}

    </div>
  );
}

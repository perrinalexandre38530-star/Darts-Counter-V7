import React from "react";
import { useLang } from "../contexts/LangContext";
import { useSport } from "../contexts/SportContext";
import type { SportId } from "../contexts/SportContext";
import type { DartsLiveFixture, DartsLiveMatch, DartsLivePlayer, DartsLiveResult } from "../dartsLive/types";
import {
  SPORT_LIVE_META,
  SPORT_LIVE_REGION_LABELS,
  getAvailableRegions,
  getLocaleProfile,
  getRecommendedSportSources,
  getSportSources,
} from "./catalog";
import { fetchSportLiveOverview, getCachedSportLiveOverview } from "./liveApi";
import type { SportLiveEvent, SportLiveNewsItem, SportLiveOverview, SportLiveRegion, SportLiveSource } from "./types";
import { isLiveSportsSupportedSport } from "./support";

type View = "overview" | "live" | "fixtures" | "results" | "news" | "sources";
type RegionFilter = "recommended" | "all" | SportLiveRegion;

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

function sourceLabel(source?: SportLiveSource | null) {
  return source?.shortName || source?.name || "OFFICIEL";
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
        padding: 14px 12px 104px;
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
        padding: 8px 66px 14px 2px;
        border-bottom: 1px solid var(--live-line);
      }
      .msc-live-kicker { font-size: 11px; letter-spacing: 1.7px; font-weight: 1000; color: #aeb5bf; }
      .msc-live-title { margin-top: 2px; font-size: clamp(29px,7vw,44px); line-height: .98; font-weight: 1000; letter-spacing: -.7px; }
      .msc-live-title strong { color: var(--live-accent); }
      .msc-live-subtitle { margin-top: 7px; font-size: 13px; color: #aeb5bf; font-weight: 750; }
      .msc-live-refresh {
        width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--live-line);
        color: #fff; background: #10151b; font-size: 19px; font-weight: 1000; cursor: pointer;
      }
      .msc-live-refresh:disabled { opacity: .45; cursor: default; }
      .msc-score-ticker {
        display:grid; grid-template-columns: 98px 1fr; margin: 10px -12px 0; min-height:58px;
        border-top:1px solid #272e36; border-bottom:1px solid #272e36; background:#0a0d11; overflow:hidden;
      }
      .msc-score-ticker-label {
        display:flex; align-items:center; justify-content:center; text-align:center; padding:8px 7px;
        background: linear-gradient(135deg,#d31e35,#7b0f1f); color:#fff; font-size:11px; font-weight:1000; letter-spacing:.2px;
      }
      .msc-score-ticker-window { overflow:hidden; }
      .msc-score-ticker-track { display:inline-flex; min-width:max-content; white-space:nowrap; animation: mscScoreRail 28s linear infinite; }
      .msc-score-ticker-track.is-static { animation:none; }
      .msc-score-ticker-item {
        min-width:206px; min-height:58px; display:flex; flex-direction:column; justify-content:center; padding:7px 14px;
        border-right:1px solid #252b32;
      }
      .msc-score-ticker-sport { font-size:10px; color:#828c98; text-transform:uppercase; font-weight:900; }
      .msc-score-ticker-main { margin-top:3px; font-size:12.5px; font-weight:950; }
      .msc-score-ticker-score { color:#ff4359; margin-left:7px; font-size:18px; font-weight:1000; }
      .msc-score-ticker-meta { margin-top:2px; font-size:9.5px; color:#818b96; }
      @keyframes mscScoreRail { from { transform:translateX(0); } to { transform:translateX(-50%); } }
      @media (prefers-reduced-motion: reduce) { .msc-score-ticker-track { animation:none; } }
      .msc-live-tabs {
        display:flex; gap:3px; overflow-x:auto; padding: 13px 0 4px; scrollbar-width:none;
      }
      .msc-live-tabs::-webkit-scrollbar { display:none; }
      .msc-live-tab {
        flex:0 0 auto; min-height:39px; padding:8px 12px; border:0; border-bottom:2px solid transparent;
        background:transparent; color:#87919d; font-size:11px; font-weight:1000; cursor:pointer; letter-spacing:.25px;
      }
      .msc-live-tab.is-active { color:#fff; border-bottom-color:var(--live-accent); }
      .msc-live-section { margin-top:18px; }
      .msc-live-section-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
      .msc-live-section-mark { width:5px; height:35px; border-radius:1px; background:var(--live-accent); }
      .msc-live-section-title { font-size:27px; line-height:1; font-weight:1000; letter-spacing:.15px; white-space:nowrap; }
      .msc-live-section-line { height:2px; flex:1; min-width:24px; background:linear-gradient(90deg,var(--live-accent),transparent); }
      .msc-live-section-count { font-size:12px; color:#89939e; font-weight:900; white-space:nowrap; }
      .msc-match-card {
        overflow:hidden; border:1px solid #29313a; border-radius:14px; background:#0d1116; margin-bottom:10px;
        box-shadow:0 7px 18px rgba(0,0,0,.24);
      }
      .msc-match-top {
        min-height:47px; display:flex; align-items:center; gap:10px; padding:0 10px 0 0;
        background:#11161c; border-bottom:1px solid #29313a;
      }
      .msc-match-code {
        align-self:stretch; min-width:58px; display:grid; place-items:center; padding:0 8px;
        color:#121212; background:var(--live-accent); font-size:16px; font-weight:1000;
      }
      .msc-match-heading { min-width:0; flex:1; }
      .msc-match-comp { font-size:13px; font-weight:1000; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .msc-match-round { margin-top:2px; font-size:10.5px; color:#8d97a3; }
      .msc-status {
        flex:0 0 auto; padding:5px 9px; border-radius:7px; border:1px solid #47515c; color:#dfe3e8;
        font-size:10.5px; font-weight:1000; background:#181e25;
      }
      .msc-status.is-live { color:#fff; background:#d92037; border-color:#ff3f55; box-shadow:0 0 12px rgba(255,48,72,.23); }
      .msc-source-link {
        flex:0 0 auto; display:inline-flex; align-items:center; gap:5px; min-height:29px; padding:5px 8px; border-radius:7px;
        border:1px solid #3d4854; color:#e5e9ee; background:#0b0f14; text-decoration:none; font-size:10.5px; font-weight:900;
      }
      .msc-event-card {
        display:grid; grid-template-columns:64px minmax(0,1fr) auto; gap:12px; align-items:center;
        padding:12px; margin-bottom:9px; border:1px solid #29313a; border-radius:13px; background:#0d1116;
      }
      .msc-event-date {
        min-height:54px; display:grid; place-items:center; padding:7px 5px; border-radius:10px; text-align:center;
        background:#151b22; border:1px solid #323b45; color:#f1f4f7; font-size:10px; line-height:1.15; font-weight:1000;
      }
      .msc-event-title { font-size:14px; font-weight:1000; line-height:1.18; }
      .msc-event-sub { margin-top:4px; color:#8f99a5; font-size:11px; line-height:1.3; }
      .msc-event-result { margin-top:6px; color:#ffd45b; font-size:11.5px; font-weight:1000; }
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
        padding:16px 10px 13px; background:
          linear-gradient(90deg,var(--live-accent-faint),transparent 30%,transparent 70%,var(--live-accent-faint)),
          #090d11;
      }
      .msc-player { min-width:0; display:flex; align-items:center; gap:9px; }
      .msc-player.is-right { flex-direction:row-reverse; text-align:right; }
      .msc-player-badge {
        flex:0 0 46px; width:46px; height:46px; border-radius:50%; display:grid; place-items:center; font-size:14px; font-weight:1000;
        border:1px solid var(--live-accent); color:#fff; background:linear-gradient(145deg,#1c242d,#0b0f13);
        box-shadow:0 0 0 3px rgba(255,255,255,.025);
      }
      .msc-player-name { font-size:clamp(13px,3.5vw,18px); line-height:1.06; font-weight:1000; overflow:hidden; text-overflow:ellipsis; }
      .msc-player-meta { margin-top:5px; font-size:9.5px; color:#818c98; font-weight:900; }
      .msc-score-box {
        padding:10px 5px; border-radius:8px; border:1px solid #a92334; background:linear-gradient(180deg,#351019,#19090e);
        text-align:center; font-size:28px; line-height:1; font-weight:1000; font-variant-numeric:tabular-nums; letter-spacing:.5px;
      }
      .msc-score-sep { color:#8e4650; padding:0 2px; }
      .msc-match-foot {
        display:flex; align-items:center; justify-content:center; gap:7px; min-height:35px; padding:7px 10px;
        border-top:1px solid #222a32; background:#0a0e12; color:#9aa4af; font-size:10.5px; font-weight:850; text-align:center;
      }
      .msc-dot { width:7px; height:7px; border-radius:50%; background:var(--live-accent); box-shadow:0 0 9px var(--live-accent); }
      .msc-empty-card {
        border:1px solid #29313a; border-radius:14px; background:#0d1116; padding:18px 16px; text-align:center;
      }
      .msc-empty-title { font-size:15px; font-weight:1000; }
      .msc-empty-copy { margin-top:5px; font-size:11.5px; color:#8f99a5; line-height:1.45; }
      .msc-news-grid { display:grid; gap:9px; }
      .msc-news-card {
        display:grid; grid-template-columns:104px minmax(0,1fr) auto; gap:12px; align-items:center;
        min-height:96px; padding:8px 10px 8px 8px; border:1px solid #29313a; border-radius:13px; background:#0d1116; overflow:hidden;
      }
      .msc-news-card.no-image { grid-template-columns:minmax(0,1fr) auto; padding:13px 14px; }
      .msc-news-card.is-result { border-left:4px solid #f4d445; }
      .msc-news-card.is-live { border-left:4px solid var(--live-accent); }
      .msc-news-card.is-upcoming { border-left:4px solid #64b8ff; }
      .msc-news-thumb { align-self:stretch; min-height:78px; border-radius:9px; overflow:hidden; background:#151b22; display:block; }
      .msc-news-thumb img { width:100%; height:100%; min-height:78px; object-fit:cover; display:block; }
      .msc-news-top { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin-bottom:6px; }
      .msc-news-kind { font-size:9px; font-weight:1000; letter-spacing:.45px; color:#111; padding:4px 7px; border-radius:999px; background:#e8edf2; }
      .msc-news-kind.is-result { background:#f4d445; }
      .msc-news-kind.is-live { background:#ff3048; color:#fff; }
      .msc-news-kind.is-upcoming { background:#64b8ff; color:#08131d; }
      .msc-news-source { font-size:9.5px; color:#8f99a5; font-weight:900; }
      .msc-news-title { font-size:14px; line-height:1.22; font-weight:1000; }
      .msc-news-summary { margin-top:5px; color:#929ca7; font-size:11px; line-height:1.38; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .msc-news-result { margin-top:7px; color:#f4d445; font-size:12px; font-weight:1000; }
      .msc-news-link { display:inline-flex; align-items:center; justify-content:center; min-height:34px; padding:7px 10px; border-radius:8px; border:1px solid #3a4652; color:#fff; background:#141a21; text-decoration:none; font-size:10px; font-weight:1000; }
      .msc-news-lead { position:relative; min-height:230px; border:1px solid #29313a; border-radius:15px; overflow:hidden; background:#0d1116; }
      .msc-news-lead-media { position:absolute; inset:0; }
      .msc-news-lead-media img { width:100%; height:100%; object-fit:cover; display:block; filter:saturate(.92) contrast(1.03); }
      .msc-news-lead-shade { position:absolute; inset:0; background:linear-gradient(180deg,rgba(6,8,12,.04) 15%,rgba(6,8,12,.50) 53%,rgba(6,8,12,.98) 100%); }
      .msc-news-lead-content { position:relative; z-index:1; min-height:230px; display:flex; flex-direction:column; justify-content:flex-end; padding:16px; }
      .msc-news-lead-title { max-width:760px; font-size:clamp(21px,5.3vw,31px); line-height:1.04; font-weight:1000; text-shadow:0 2px 10px rgba(0,0,0,.65); }
      .msc-news-lead-summary { margin-top:7px; max-width:760px; color:#d4d9df; font-size:12px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .msc-news-lead-link { align-self:flex-start; margin-top:10px; min-height:32px; padding:6px 10px; border-radius:8px; background:#fff; color:#0b0e12; text-decoration:none; font-size:10px; font-weight:1000; }
      @media (max-width:520px) {
        .msc-news-card { grid-template-columns:82px minmax(0,1fr); gap:9px; }
        .msc-news-card .msc-news-link { grid-column:1 / -1; width:100%; min-height:30px; }
        .msc-news-card.no-image { grid-template-columns:1fr; }
        .msc-news-lead { min-height:205px; }
        .msc-news-lead-content { min-height:205px; padding:13px; }
      }
      .msc-source-rail { display:grid; gap:7px; margin-top:11px; }
      .msc-source-row {
        display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; padding:11px 12px;
        border:1px solid #29313a; border-radius:10px; background:#0b0f14;
      }
      .msc-source-name { font-size:13px; font-weight:1000; }
      .msc-source-desc { margin-top:3px; font-size:10.5px; line-height:1.35; color:#87919d; }
      .msc-source-actions { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
      .msc-mini-link {
        display:inline-flex; align-items:center; justify-content:center; min-height:30px; padding:5px 9px; border-radius:7px;
        border:1px solid #39434e; color:#e7ebef; background:#11171e; text-decoration:none; font-size:10px; font-weight:1000;
      }
      .msc-mini-link.is-primary { background:#f4d445; border-color:#f4d445; color:#131313; }
      .msc-info-strip {
        display:flex; gap:7px; overflow-x:auto; padding:9px 0 2px; scrollbar-width:none;
      }
      .msc-info-chip {
        flex:0 0 auto; padding:5px 9px; border-radius:999px; border:1px solid #2c353f; background:#0c1116; color:#8f99a5; font-size:9.5px; font-weight:950;
      }
      .msc-region-row { display:flex; gap:6px; overflow-x:auto; padding-bottom:3px; scrollbar-width:none; }
      .msc-region-btn {
        flex:0 0 auto; border:1px solid #2d3741; background:#0c1116; color:#9aa4af; border-radius:999px; padding:6px 9px; font-size:9.5px; font-weight:1000; cursor:pointer;
      }
      .msc-region-btn.is-active { color:#15120a; border-color:#f4d445; background:#f4d445; }
      @media (max-width: 390px) {
        .msc-match-body { grid-template-columns:minmax(0,1fr) 78px minmax(0,1fr); gap:5px; }
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

function PlayerBlock({ player, right = false }: { player?: DartsLivePlayer | null; right?: boolean }) {
  return (
    <div className={`msc-player${right ? " is-right" : ""}`} translate="no" data-i18n-skip="true">
      <div className="msc-player-badge">{playerInitials(player?.name)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="msc-player-name">{player?.name || "À confirmer"}</div>
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
  footer: string;
}) {
  const link = bestPrimaryLink(source);
  return (
    <article className="msc-match-card">
      <div className="msc-match-top">
        <div className="msc-match-code">{shortCompetition(competition)}</div>
        <div className="msc-match-heading">
          <div className="msc-match-comp" translate="no" data-i18n-skip="true">{competition || "Compétition officielle"}</div>
          <div className="msc-match-round">{niceRound(round) || "Match"}</div>
        </div>
        <div className={`msc-status${live ? " is-live" : ""}`}>{status}</div>
        {link ? <a className="msc-source-link" href={link} target="_blank" rel="noreferrer noopener">▣ {sourceLabel(source)}</a> : null}
      </div>
      <div className="msc-match-body">
        <PlayerBlock player={left} />
        <div className="msc-score-box">{rightScore ? <>{leftScore}<span className="msc-score-sep">-</span>{rightScore}</> : leftScore}</div>
        <PlayerBlock player={right} right />
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
      footer={source ? `Suivi officiel · ${sourceLabel(source)}` : "Score en direct"}
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
      footer={source ? `À suivre · ${sourceLabel(source)}` : "Programme officiel"}
    />
  );
}

function ResultMatchCard({ item, source, lang }: { item: DartsLiveResult; source?: SportLiveSource | null; lang: string }) {
  return (
    <MatchCard
      competition={item.competition}
      round={item.round}
      status="TERMINÉ"
      left={item.winner}
      right={item.loser}
      leftScore={scoreValue(item.winner?.score)}
      rightScore={scoreValue(item.loser?.score)}
      source={source}
      footer={`Résultat officiel · ${formatDate(item.playedOn, lang)}`}
    />
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
          <span className="msc-news-source">{item.sourceName || "WEB"}{item.publishedAt ? ` · ${formatDate(item.publishedAt, lang)}` : ""}</span>
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
  return (
    <article className="msc-news-lead">
      {item.imageUrl ? <div className="msc-news-lead-media"><img src={item.imageUrl} alt="" loading="eager" referrerPolicy="no-referrer" /></div> : null}
      <div className="msc-news-lead-shade" />
      <div className="msc-news-lead-content">
        <div className="msc-news-top">
          <span className={`msc-news-kind${item.kind === "result" ? " is-result" : item.kind === "live" ? " is-live" : item.kind === "upcoming" ? " is-upcoming" : ""}`}>{kindLabel}</span>
          <span className="msc-news-source">{item.sourceName || "WEB"}{item.publishedAt ? ` · ${formatDate(item.publishedAt, lang)}` : ""}</span>
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

export default function SportLiveHub() {
  const { lang } = useLang();
  const { sport } = useSport();
  const supportedSport = isLiveSportsSupportedSport(sport);
  const liveSport = supportedSport ? sport : "darts";
  const meta = SPORT_LIVE_META[liveSport];
  const localeProfile = React.useMemo(() => getLocaleProfile(lang), [lang]);
  const preferredRegions = React.useMemo(() => getAvailableRegions(liveSport, lang), [liveSport, lang]);
  const recommended = React.useMemo(() => getRecommendedSportSources(liveSport, lang), [liveSport, lang]);
  const allSportSources = React.useMemo(() => getSportSources(liveSport), [liveSport]);

  const [view, setView] = React.useState<View>("overview");
  const [region, setRegion] = React.useState<RegionFilter>("recommended");
  const [feed, setFeed] = React.useState<SportLiveOverview | null>(() => getCachedSportLiveOverview(liveSport));
  const [loading, setLoading] = React.useState(true);
  const [feedError, setFeedError] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    setRegion("recommended");
    setView("overview");
    setFeed(getCachedSportLiveOverview(liveSport));
    setFeedError(null);
  }, [liveSport, lang]);

  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const run = async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const next = await fetchSportLiveOverview(liveSport, controller.signal, lang);
        if (!active) return;
        setFeed(next);
        setFeedError(null);
        setUpdatedAt(Date.now());
      } catch (error: any) {
        if (!active || error?.name === "AbortError") return;
        setFeedError(String(error?.message || error || "LIVE indisponible"));
      } finally {
        if (active && !quiet) setLoading(false);
      }
    };
    void run(false);
    const refreshMs = refreshIntervalFor(liveSport, feed);
    const timer = refreshMs ? window.setInterval(() => void run(true), refreshMs) : null;
    return () => {
      active = false;
      controller.abort();
      if (timer !== null) window.clearInterval(timer);
    };
  }, [liveSport, lang, !!feed?.configured, !!feed?.liveAvailable]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setFeedError(null);
    try {
      const next = await fetchSportLiveOverview(liveSport, undefined, lang);
      setFeed(next);
      setUpdatedAt(Date.now());
    } catch (error: any) {
      setFeedError(String(error?.message || error || "LIVE indisponible"));
    } finally {
      setLoading(false);
    }
  }, [liveSport, lang]);

  const sources = React.useMemo(() => {
    if (region === "all") return allSportSources;
    if (region === "recommended") return recommended;
    return allSportSources.filter((source) => source.regions.includes(region));
  }, [allSportSources, recommended, region]);

  const liveRows = feed?.live || [];
  const fixtureRows = feed?.fixtures || [];
  const resultRows = feed?.results || [];
  const eventRows = feed?.events || [];
  const newsRows = feed?.news || [];
  const liveEvents = eventRows.filter((event) => event.status === "live");
  const upcomingEvents = eventRows.filter((event) => event.status === "upcoming" || event.status === "info");
  const resultEvents = eventRows.filter((event) => event.status === "result");
  const sourceForCards = recommended.find((source) => !!source.watchUrl) || recommended.find((source) => !!source.scoresUrl) || recommended[0] || null;
  const ticker = React.useMemo(() => buildTicker(feed, lang, meta.label, recommended), [feed, lang, meta.label, recommended]);
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

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

      <div className="msc-info-strip">
        <span className="msc-info-chip">{isOnline ? "● ONLINE" : "○ HORS LIGNE"}</span>
        <span className="msc-info-chip">{localeProfile.label}</span>
        <span className="msc-info-chip">{recommended.length} SOURCES OFFICIELLES</span>
        {feed?.configured ? <span className="msc-info-chip">AUTO · {String(feed.provider || "DATA").toUpperCase()}</span> : null}
        {feed?.intelligence?.enabled ? <span className="msc-info-chip">INTELLIGENCE · {feed.intelligence.provider === "openai_web" ? "IA WEB" : "ACTUS WEB"} · {feed.intelligence.count}</span> : null}
        {feed?.configured && feed?.plan ? <span className="msc-info-chip">PLAN {String(feed.plan).toUpperCase()}</span> : null}
        {updatedAt ? <span className="msc-info-chip">MAJ {new Date(updatedAt).toLocaleTimeString()}</span> : null}
        {feedError ? <span className="msc-info-chip">DONNÉES LIVE INDISPONIBLES</span> : null}
      </div>

      {feed?.warnings?.length ? (
        <div style={{ marginTop: 8, padding: "8px 10px", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, background: "rgba(0,0,0,.28)", color: "#8f99a5", fontSize: 10.5, lineHeight: 1.35 }}>
          {feed.warnings[0]}
        </div>
      ) : null}

      <nav className="msc-live-tabs" aria-label="Rubriques LIVE SPORTS">
        {([
          ["overview", "À LA UNE"],
          ["live", `EN DIRECT${(liveRows.length + liveEvents.length) ? ` · ${liveRows.length + liveEvents.length}` : ""}`],
          ["fixtures", `À VENIR${(fixtureRows.length + upcomingEvents.length) ? ` · ${fixtureRows.length + upcomingEvents.length}` : ""}`],
          ["results", `RÉSULTATS${(resultRows.length + resultEvents.length) ? ` · ${resultRows.length + resultEvents.length}` : ""}`],
          ["news", `ACTUS${newsRows.length ? ` · ${newsRows.length}` : ""}`],
          ["sources", "SOURCES"],
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
            <SectionHeader title="ACTUS & RÉSULTATS DU WEB" count={newsRows.length ? `${newsRows.length} info${newsRows.length > 1 ? "s" : ""}` : ""} />
            {newsRows.length ? (
              <div className="msc-news-grid">
                <LeadNewsCard item={newsRows.find((item) => !!item.imageUrl) || newsRows[0]} lang={lang} />
                {newsRows.filter((item) => item.id !== (newsRows.find((row) => !!row.imageUrl) || newsRows[0])?.id).slice(0, 5).map((item) => <NewsCard key={item.id} item={item} lang={lang} />)}
              </div>
            ) : <EmptySection title="Recherche d’actualités en cours" copy="LIVE Intelligence cherche automatiquement les dernières actualités et résultats publiés pour cette discipline." sources={recommended.slice(0, 3)} />}
          </section>

          <section className="msc-live-section">
            <SectionHeader title="EN DIRECT" count={(liveRows.length + liveEvents.length) ? `${liveRows.length + liveEvents.length} direct${(liveRows.length + liveEvents.length) > 1 ? "s" : ""}` : ""} />
            {liveRows.length ? liveRows.slice(0, 4).map((item) => <LiveMatchCard key={item.id} item={item} source={sourceForCards} />) : liveEvents.length ? liveEvents.slice(0, 4).map((event) => <OfficialEventCard key={event.id} event={event} />) : (
              <EmptySection title="Aucun match en direct pour le moment" copy="Dès qu’un provider de score est disponible, le match apparaîtra ici automatiquement. Les sources officielles restent accessibles." sources={recommended.filter((source) => source.scoresUrl || source.watchUrl)} />
            )}
          </section>

          <section className="msc-live-section">
            <SectionHeader title="À VENIR" count={(fixtureRows.length + upcomingEvents.length) ? `${fixtureRows.length + upcomingEvents.length} événement${(fixtureRows.length + upcomingEvents.length) > 1 ? "s" : ""}` : ""} />
            {fixtureRows.length ? fixtureRows.slice(0, 4).map((item) => <FixtureMatchCard key={item.id} item={item} source={sourceForCards} lang={lang} />) : upcomingEvents.length ? upcomingEvents.slice(0, 6).map((event) => <OfficialEventCard key={event.id} event={event} />) : (
              <EmptySection title="Programme officiel" copy="Consulte les calendriers des circuits officiels de cette discipline." sources={recommended.filter((source) => source.calendarUrl)} />
            )}
          </section>

          <section className="msc-live-section">
            <SectionHeader title="RÉSULTATS" count={(resultRows.length + resultEvents.length) ? `${resultRows.length + resultEvents.length} résultat${(resultRows.length + resultEvents.length) > 1 ? "s" : ""}` : ""} />
            {resultRows.length ? resultRows.slice(0, 5).map((item) => <ResultMatchCard key={item.id} item={item} source={sourceForCards} lang={lang} />) : resultEvents.length ? resultEvents.slice(0, 6).map((event) => <OfficialEventCard key={event.id} event={event} />) : (
              <EmptySection title="Derniers résultats" copy="Retrouve les résultats sur les sources officielles. Ils seront affichés ici directement dès qu’un flux de données compatible sera connecté." sources={recommended.filter((source) => source.resultsUrl)} />
            )}
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
          {resultRows.length ? resultRows.map((item) => <ResultMatchCard key={item.id} item={item} source={sourceForCards} lang={lang} />) : resultEvents.length ? resultEvents.map((event) => <OfficialEventCard key={event.id} event={event} />) : <EmptySection title="Résultats officiels" copy="Aucun résultat automatique n’est chargé pour l’instant. Ouvre une source officielle pour consulter les derniers scores." sources={recommended.filter((source) => source.resultsUrl)} />}
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
    </div>
  );
}

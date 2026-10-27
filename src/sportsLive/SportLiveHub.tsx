import React from "react";
import { useLang } from "../contexts/LangContext";
import { useSport } from "../contexts/SportContext";
import type { SportId } from "../contexts/SportContext";
import type { DartsLiveFixture, DartsLiveMatch, DartsLiveResult, DartsLivePlayer } from "../dartsLive/types";
import {
  SPORT_LIVE_META,
  SPORT_LIVE_ORDER,
  SPORT_LIVE_REGION_LABELS,
  getAvailableRegions,
  getLocaleProfile,
  getRecommendedSportSources,
  getSportSources,
} from "./catalog";
import { fetchSportLiveOverview, getCachedSportLiveOverview } from "./liveApi";
import type { SportLiveOverview, SportLiveRegion, SportLiveSource } from "./types";
import { isLiveSportsSupportedSport } from "./support";

type View = "overview" | "live" | "fixtures" | "results" | "sources";
type RegionFilter = "recommended" | "all" | SportLiveRegion;

type TickerItem = {
  id: string;
  label: string;
  score: string;
  meta: string;
  tone?: "live" | "done" | "soon";
};

const REFRESH_MS = 15 * 60 * 1000;

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        border: "1px solid rgba(255,255,255,.11)",
        background:
          "radial-gradient(140% 180% at 0% 0%, rgba(255,59,95,.07), transparent 50%), linear-gradient(180deg, rgba(22,22,30,.97), rgba(8,8,13,.98))",
        boxShadow: "0 14px 28px rgba(0,0,0,.42)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "red" | "green" | "gold" | "blue" | "gray" }) {
  const colors = {
    red: ["rgba(255,75,96,.16)", "#ff7588", "rgba(255,75,96,.34)"],
    green: ["rgba(91,230,157,.13)", "#7fe2a9", "rgba(91,230,157,.32)"],
    gold: ["rgba(255,206,82,.14)", "#ffd56a", "rgba(255,206,82,.30)"],
    blue: ["rgba(79,180,255,.14)", "#65c0ff", "rgba(79,180,255,.30)"],
    gray: ["rgba(255,255,255,.07)", "rgba(255,255,255,.88)", "rgba(255,255,255,.12)"],
  } as const;
  const [bg, fg, border] = colors[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

function ActionLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        minHeight: 38,
        padding: "8px 11px",
        borderRadius: 12,
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 950,
        border: primary ? "1px solid rgba(255,213,106,.48)" : "1px solid rgba(255,255,255,.13)",
        color: primary ? "#1a1102" : "#f5f5f7",
        background: primary ? "linear-gradient(180deg, #ffe17e, #e9aa35)" : "rgba(255,255,255,.055)",
      }}
    >
      {children}
    </a>
  );
}

function SportSelector({ sport, setSport }: { sport: SportId; setSport: (sport: SportId) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollSnapType: "x proximity", scrollbarWidth: "none" }}>
      {SPORT_LIVE_ORDER.map((id) => {
        const meta = SPORT_LIVE_META[id];
        const active = id === sport;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setSport(id)}
            aria-pressed={active}
            style={{
              flex: "0 0 auto",
              minWidth: 116,
              minHeight: 58,
              scrollSnapAlign: "start",
              borderRadius: 16,
              padding: "9px 12px",
              border: active ? `1px solid ${meta.accent}99` : "1px solid rgba(255,255,255,.10)",
              background: active
                ? `linear-gradient(180deg, ${meta.accent}30, rgba(255,255,255,.02))`
                : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.02))",
              color: active ? meta.accent : "rgba(255,255,255,.84)",
              boxShadow: active ? `0 0 20px ${meta.accent}22` : "none",
              fontWeight: 1000,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 20, lineHeight: 1 }}>{meta.icon}</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12.5, fontWeight: 1000, lineHeight: 1.1 }}>{meta.shortLabel}</div>
              <div style={{ marginTop: 3, fontSize: 9.5, opacity: 0.76 }}>LIVE SPORTS</div>
            </div>
          </button>
        );
      })}
    </div>
  );
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
    return new Intl.DateTimeFormat(lang || "fr", { dateStyle: "short", timeStyle: "short" }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function formatDate(value: string | null | undefined, lang: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(lang || "fr", { dateStyle: "medium" }).format(date);
  } catch {
    return value;
  }
}

function scoreValue(score: number | null | undefined) {
  return score === null || score === undefined || Number.isNaN(Number(score)) ? "—" : String(score);
}

function vsLabel(players: DartsLivePlayer[]) {
  const [a, b] = players || [];
  return [a?.name, b?.name].filter(Boolean).join("  vs  ") || "Match à confirmer";
}

function shortCompetition(competition?: string | null) {
  const label = String(competition || "").trim();
  if (!label) return "LIVE";
  const compact = label
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return compact.slice(0, 3) || label.slice(0, 3).toUpperCase();
}

function bestPrimaryLink(source?: SportLiveSource | null) {
  return source?.scoresUrl || source?.watchUrl || source?.resultsUrl || source?.calendarUrl || source?.homeUrl || null;
}

function SectionHeader({ title, count, accent }: { title: string; count?: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <div style={{ width: 7, alignSelf: "stretch", borderRadius: 999, background: accent, boxShadow: `0 0 18px ${accent}66` }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 31, lineHeight: 0.95, fontWeight: 1000, letterSpacing: 0.6, color: "#f4f5f8" }}>{title}</div>
          <div style={{ height: 2, marginTop: 10, background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,.05))`, borderRadius: 999 }} />
        </div>
      </div>
      {count ? <div style={{ flex: "0 0 auto", fontSize: 13, opacity: 0.82, fontWeight: 900 }}>{count}</div> : null}
    </div>
  );
}

function HeaderHero({
  meta,
  lang,
  isOnline,
  loading,
  updatedAt,
  onRefresh,
}: {
  meta: { label: string; icon: string; accent: string };
  lang: string;
  isOnline: boolean;
  loading: boolean;
  updatedAt: number | null;
  onRefresh: () => void;
}) {
  return (
    <Card
      style={{
        padding: 16,
        background:
          `radial-gradient(120% 170% at 50% -10%, ${meta.accent}36, transparent 44%), linear-gradient(180deg, rgba(10,12,18,.98), rgba(5,6,10,1))`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.8, letterSpacing: 1.3 }}>LIVE SPORTS</div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 33, lineHeight: 0.95, fontWeight: 1000, color: meta.accent, textShadow: `0 0 18px ${meta.accent}33` }}>
              {meta.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, opacity: 0.92 }}>Directs · calendrier · résultats</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.45, opacity: 0.78 }}>
            Une présentation inspirée des magazines sportifs&nbsp;: matchs à la une, bandeaux de scores et accès rapides aux compétitions officielles de <b>{meta.label}</b>.
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            flex: "0 0 auto",
            borderRadius: 14,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,.14)",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            fontWeight: 950,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.55 : 1,
          }}
        >
          {loading ? "ACTUALISATION…" : "↻"}
        </button>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Pill tone={isOnline ? "green" : "gray"}>{isOnline ? "ONLINE" : "HORS LIGNE"}</Pill>
        <Pill tone="gold">LANGUE {String(lang).toUpperCase()}</Pill>
        {updatedAt ? <Pill>MAJ {new Date(updatedAt).toLocaleTimeString()}</Pill> : null}
      </div>
    </Card>
  );
}

function ScoreTicker({ title, items, accent = "#ff4b60" }: { title: string; items: TickerItem[]; accent?: string }) {
  const rows = items.length ? items : [{ id: "empty", label: "Aucun score récent", score: "—", meta: "Les résultats apparaîtront ici dès qu’un provider data est connecté.", tone: "soon" as const }];
  const doubled = [...rows, ...rows];
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <style>{`
        @keyframes msc-live-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "112px 1fr", minHeight: 74 }}>
        <div
          style={{
            display: "grid",
            alignItems: "center",
            justifyItems: "center",
            padding: "12px 10px",
            background: `linear-gradient(180deg, ${accent}, #8f1729)`,
            color: "#fff",
            fontWeight: 1000,
            letterSpacing: 0.3,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>⚡</div>
            <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.1 }}>{title}</div>
          </div>
        </div>
        <div style={{ overflow: "hidden", position: "relative", background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015))" }}>
          <div
            style={{
              display: "inline-flex",
              minWidth: "max-content",
              whiteSpace: "nowrap",
              animation: rows.length > 1 ? "msc-live-marquee 34s linear infinite" : undefined,
            }}
          >
            {doubled.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  minHeight: 74,
                  borderRight: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 950 }} translate="no" data-i18n-skip="true">
                    {item.label} <span style={{ color: item.tone === "live" ? "#ff657a" : "#fff" }}>{item.score}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, opacity: 0.72 }} translate="no" data-i18n-skip="true">
                    {item.meta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function sourcePillLabel(source?: SportLiveSource | null) {
  return source?.shortName || source?.name || "Source officielle";
}

function ScoreBox({ left, right, accent }: { left: string; right: string; accent: string }) {
  return (
    <div
      style={{
        minWidth: 112,
        padding: "11px 10px",
        borderRadius: 14,
        border: `1px solid ${accent}55`,
        background: `linear-gradient(180deg, ${accent}26, rgba(0,0,0,.35))`,
        boxShadow: `0 0 18px ${accent}22 inset`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 1000, color: accent, opacity: 0.92 }}>SCORE</div>
      <div style={{ marginTop: 2, fontVariantNumeric: "tabular-nums", fontSize: 33, lineHeight: 1, fontWeight: 1000, letterSpacing: 1.2 }}>
        {left} <span style={{ opacity: 0.6 }}>-</span> {right}
      </div>
    </div>
  );
}

function MatchSide({ player, align = "left" }: { player?: DartsLivePlayer | null; align?: "left" | "right" }) {
  return (
    <div style={{ minWidth: 0, flex: 1, textAlign: align }} translate="no" data-i18n-skip="true">
      <div
        style={{
          fontSize: 25,
          lineHeight: 1,
          fontWeight: 1000,
          color: "#f5f5f8",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {player?.name || "TBD"}
      </div>
      <div style={{ marginTop: 7, fontSize: 12, opacity: 0.74, fontWeight: 900 }}>{player?.id ? String(player.id).toUpperCase() : "OFFICIEL"}</div>
    </div>
  );
}

function MatchMagazineCard({
  title,
  status,
  accent,
  compBadge,
  competition,
  round,
  left,
  right,
  scoreLeft,
  scoreRight,
  bottomMeta,
  cta,
  ctaLabel,
  ctaTone = "subtle",
}: {
  title: string;
  status: string;
  accent: string;
  compBadge: string;
  competition?: string | null;
  round?: string | null;
  left?: DartsLivePlayer | null;
  right?: DartsLivePlayer | null;
  scoreLeft: string;
  scoreRight: string;
  bottomMeta: string;
  cta?: string | null;
  ctaLabel?: string;
  ctaTone?: "subtle" | "live";
}) {
  return (
    <Card
      style={{
        overflow: "hidden",
        padding: 0,
        background: `radial-gradient(80% 130% at 0% 100%, ${accent}20, transparent 36%), radial-gradient(80% 130% at 100% 100%, ${accent}18, transparent 35%), linear-gradient(180deg, rgba(13,16,22,.98), rgba(6,8,12,1))`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <div
            style={{
              flex: "0 0 auto",
              minWidth: 44,
              height: 44,
              borderRadius: 11,
              background: `linear-gradient(180deg, ${accent}, ${accent}aa)`,
              color: "#091017",
              display: "grid",
              placeItems: "center",
              fontWeight: 1000,
              fontSize: 18,
              boxShadow: `0 0 18px ${accent}44`,
            }}
          >
            {compBadge}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 1000 }} translate="no" data-i18n-skip="true">{competition || title}</div>
            <div style={{ marginTop: 3, fontSize: 12.5, opacity: 0.73 }}>{round || title}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Pill tone={ctaTone === "live" ? "red" : "blue"}>{status}</Pill>
          {cta && ctaLabel ? <ActionLink href={cta}>{ctaLabel}</ActionLink> : null}
        </div>
      </div>
      <div style={{ padding: "16px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MatchSide player={left} align="left" />
          <ScoreBox left={scoreLeft} right={scoreRight} accent={accent} />
          <MatchSide player={right} align="right" />
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: accent, boxShadow: `0 0 16px ${accent}` }} />
          <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 900 }}>{bottomMeta}</div>
        </div>
      </div>
    </Card>
  );
}

function LiveRow({ item, accent, source }: { item: DartsLiveMatch; accent: string; source?: SportLiveSource | null }) {
  const [left, right] = item.players || [];
  return (
    <MatchMagazineCard
      title="Live"
      status="LIVE"
      accent={accent}
      compBadge={shortCompetition(item.competition)}
      competition={item.competition || "Compétition live"}
      round={niceRound(item.round) || "Match en direct"}
      left={left}
      right={right}
      scoreLeft={scoreValue(left?.score)}
      scoreRight={scoreValue(right?.score)}
      bottomMeta={source ? `Source · ${sourcePillLabel(source)}` : "Score en direct"}
      cta={bestPrimaryLink(source)}
      ctaLabel={source ? sourcePillLabel(source) : undefined}
      ctaTone="live"
    />
  );
}

function FixtureRow({ item, lang, accent, source }: { item: DartsLiveFixture; lang: string; accent: string; source?: SportLiveSource | null }) {
  const [left, right] = item.players || [];
  return (
    <MatchMagazineCard
      title="À venir"
      status={item.startsAt ? formatDateTime(item.startsAt, lang) : formatDate(item.date, lang)}
      accent={accent}
      compBadge={shortCompetition(item.competition)}
      competition={item.competition || "Compétition à venir"}
      round={niceRound(item.round) || "Prochain match"}
      left={left}
      right={right}
      scoreLeft="VS"
      scoreRight="VS"
      bottomMeta={source ? `À suivre · ${sourcePillLabel(source)}` : "Programme officiel"}
      cta={bestPrimaryLink(source)}
      ctaLabel={source ? sourcePillLabel(source) : undefined}
      ctaTone="subtle"
    />
  );
}

function ResultRow({ item, lang, accent, source }: { item: DartsLiveResult; lang: string; accent: string; source?: SportLiveSource | null }) {
  return (
    <MatchMagazineCard
      title="Résultat"
      status="TERMINÉ"
      accent={accent}
      compBadge={shortCompetition(item.competition)}
      competition={item.competition || "Résultat officiel"}
      round={niceRound(item.round) || formatDate(item.playedOn, lang)}
      left={item.winner}
      right={item.loser}
      scoreLeft={scoreValue(item.winner?.score)}
      scoreRight={scoreValue(item.loser?.score)}
      bottomMeta={source ? `Replay / stats · ${sourcePillLabel(source)}` : `Joué le ${formatDate(item.playedOn, lang)}`}
      cta={bestPrimaryLink(source)}
      ctaLabel={source ? "Ouvrir" : undefined}
      ctaTone="subtle"
    />
  );
}

function SourceCard({ source }: { source: SportLiveSource }) {
  const primary = source.scoresUrl || source.resultsUrl || source.calendarUrl || source.homeUrl;
  return (
    <Card style={{ padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15, fontWeight: 1000 }} translate="no" data-i18n-skip="true">
          {source.name}
        </div>
        {source.official ? <Pill tone="green">OFFICIEL</Pill> : null}
      </div>
      <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.45, opacity: 0.78 }}>{source.description}</div>
      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }} translate="no" data-i18n-skip="true">
        {(source.badges || []).map((badge) => (
          <Pill key={badge}>{badge}</Pill>
        ))}
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 11 }}>
        <ActionLink href={primary} primary>
          OUVRIR
        </ActionLink>
        {source.scoresUrl && source.scoresUrl !== primary ? <ActionLink href={source.scoresUrl}>SCORES LIVE</ActionLink> : null}
        {source.resultsUrl && source.resultsUrl !== primary && source.resultsUrl !== source.scoresUrl ? <ActionLink href={source.resultsUrl}>RÉSULTATS</ActionLink> : null}
        {source.calendarUrl && source.calendarUrl !== primary ? <ActionLink href={source.calendarUrl}>CALENDRIER</ActionLink> : null}
        {source.watchUrl ? <ActionLink href={source.watchUrl}>📺 REGARDER</ActionLink> : null}
      </div>
    </Card>
  );
}

function OfficialLinksView({ sources, mode }: { sources: SportLiveSource[]; mode: View }) {
  const filtered = sources.filter((source) => {
    if (mode === "live") return !!(source.scoresUrl || source.watchUrl);
    if (mode === "fixtures") return !!source.calendarUrl;
    if (mode === "results") return !!source.resultsUrl;
    return true;
  });
  const rows = filtered.length ? filtered : sources;
  const title =
    mode === "live"
      ? "Directs et suivis officiels"
      : mode === "fixtures"
        ? "Calendriers officiels"
        : mode === "results"
          ? "Résultats officiels"
          : "Sources officielles";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Card>
        <div style={{ fontWeight: 1000, fontSize: 15 }}>{title}</div>
        <div style={{ marginTop: 6, opacity: 0.76, fontSize: 12.5, lineHeight: 1.45 }}>
          Aucun score n’est fabriqué dans l’application. Tant qu’un provider de données temps réel n’est pas connecté pour cette discipline, les boutons ci-dessous ouvrent uniquement les sources officielles disponibles.
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))", gap: 10 }}>
        {rows.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
    </div>
  );
}

function buildTickerItems(feed: SportLiveOverview | null, lang: string): TickerItem[] {
  const items: TickerItem[] = [];
  const liveRows = feed?.live || [];
  const resultRows = feed?.results || [];
  const fixtureRows = feed?.fixtures || [];

  liveRows.slice(0, 4).forEach((row) => {
    const [a, b] = row.players || [];
    items.push({
      id: `live-${row.id}`,
      label: `${a?.name || "—"} vs ${b?.name || "—"}`,
      score: `${scoreValue(a?.score)}-${scoreValue(b?.score)}`,
      meta: `${row.competition || "LIVE"} • ${niceRound(row.round) || "En direct"}`,
      tone: "live",
    });
  });

  resultRows.slice(0, 4).forEach((row) => {
    items.push({
      id: `res-${row.id}`,
      label: `${row.winner?.name || "—"} / ${row.loser?.name || "—"}`,
      score: `${scoreValue(row.winner?.score)}-${scoreValue(row.loser?.score)}`,
      meta: `${row.competition || "Résultat"} • ${formatDate(row.playedOn, lang)}`,
      tone: "done",
    });
  });

  if (!items.length) {
    fixtureRows.slice(0, 3).forEach((row) => {
      items.push({
        id: `fix-${row.id}`,
        label: vsLabel(row.players),
        score: row.startsAt ? formatDateTime(row.startsAt, lang) : formatDate(row.date, lang),
        meta: `${row.competition || "À venir"} • ${niceRound(row.round) || "Programme officiel"}`,
        tone: "soon",
      });
    });
  }

  return items.slice(0, 8);
}

function OverviewMagazine({
  lang,
  feed,
  meta,
  recommended,
  isDartsApi,
}: {
  lang: string;
  feed: SportLiveOverview | null;
  meta: { label: string; accent: string };
  recommended: SportLiveSource[];
  isDartsApi: boolean;
}) {
  const watchSource = React.useMemo(
    () => recommended.find((source) => !!source.watchUrl) || recommended.find((source) => !!source.scoresUrl) || recommended[0] || null,
    [recommended],
  );

  const liveRows = feed?.live || [];
  const fixtureRows = feed?.fixtures || [];
  const resultRows = feed?.results || [];

  if (!isDartsApi || (!liveRows.length && !fixtureRows.length && !resultRows.length)) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <SectionHeader title="À LA UNE" count={`${recommended.length} source${recommended.length > 1 ? "s" : ""}`} accent={meta.accent} />
        <OfficialLinksView sources={recommended} mode="sources" />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <SectionHeader title="EN DIRECT" count={`${liveRows.length} match${liveRows.length > 1 ? "s" : ""}`} accent={meta.accent} />
        {liveRows.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {liveRows.map((item) => (
              <LiveRow key={item.id} item={item} accent={meta.accent} source={watchSource} />
            ))}
          </div>
        ) : (
          <Card>
            <div style={{ fontWeight: 1000, fontSize: 15 }}>Aucun match en direct pour le moment.</div>
            <div style={{ marginTop: 6, opacity: 0.76, fontSize: 12.5 }}>Ouvre les sources officielles ci-dessous pour vérifier si un stream ou un livescore vient d’être publié.</div>
          </Card>
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <SectionHeader title="À VENIR" count={`${fixtureRows.length} match${fixtureRows.length > 1 ? "s" : ""}`} accent={meta.accent} />
        {fixtureRows.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {fixtureRows.slice(0, 4).map((item) => (
              <FixtureRow key={item.id} item={item} lang={lang} accent={meta.accent} source={watchSource} />
            ))}
          </div>
        ) : (
          <OfficialLinksView sources={recommended} mode="fixtures" />
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <SectionHeader title="RÉSULTATS" count={`${resultRows.length} match${resultRows.length > 1 ? "s" : ""}`} accent={meta.accent} />
        {resultRows.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {resultRows.slice(0, 5).map((item) => (
              <ResultRow key={item.id} item={item} lang={lang} accent={meta.accent} source={watchSource} />
            ))}
          </div>
        ) : (
          <OfficialLinksView sources={recommended} mode="results" />
        )}
      </div>
    </div>
  );
}

export default function SportLiveHub() {
  const { lang } = useLang();
  const { sport, setSport } = useSport();
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
  const [loading, setLoading] = React.useState(liveSport === "darts");
  const [feedError, setFeedError] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    setRegion("recommended");
    setFeed(getCachedSportLiveOverview(liveSport));
    setFeedError(null);
  }, [liveSport, lang]);

  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const run = async (quiet = false) => {
      if (!quiet) setLoading(liveSport === "darts");
      try {
        const next = await fetchSportLiveOverview(liveSport, controller.signal);
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
    const timer = liveSport === "darts" ? window.setInterval(() => void run(true), REFRESH_MS) : null;
    return () => {
      active = false;
      controller.abort();
      if (timer !== null) window.clearInterval(timer);
    };
  }, [liveSport]);

  const refresh = React.useCallback(async () => {
    setLoading(liveSport === "darts");
    setFeedError(null);
    try {
      const next = await fetchSportLiveOverview(liveSport);
      setFeed(next);
      setUpdatedAt(Date.now());
    } catch (error: any) {
      setFeedError(String(error?.message || error || "LIVE indisponible"));
    } finally {
      setLoading(false);
    }
  }, [liveSport]);

  const sources = React.useMemo(() => {
    if (region === "all") return allSportSources;
    if (region === "recommended") return recommended;
    return allSportSources.filter((source) => source.regions.includes(region));
  }, [allSportSources, recommended, region]);

  const hasLive = !!feed?.live?.length;
  const hasFixtures = !!feed?.fixtures?.length;
  const hasResults = !!feed?.results?.length;
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  const isDartsApi = liveSport === "darts";
  const tickerItems = React.useMemo(() => buildTickerItems(feed, lang), [feed, lang]);

  if (!supportedSport) {
    return (
      <div style={{ display: "grid", gap: 13 }}>
        <HeaderHero meta={meta} lang={lang} isOnline={isOnline} loading={loading} updatedAt={updatedAt} onRefresh={() => void refresh()} />
        <Card style={{ padding: 10 }}>
          <SportSelector sport={sport} setSport={setSport} />
        </Card>
        <Card>
          <div style={{ fontWeight: 1000, fontSize: 15, color: "#ff9aaa" }}>LIVE SPORTS n’est pas encore câblé pour ce sport.</div>
          <div style={{ marginTop: 6, opacity: 0.76, fontSize: 12.5, lineHeight: 1.45 }}>
            Choisis une discipline disponible dans le sélecteur ci-dessus. Aucun résultat d’un autre sport n’est affiché à la place.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <HeaderHero meta={meta} lang={lang} isOnline={isOnline} loading={loading} updatedAt={updatedAt} onRefresh={() => void refresh()} />

      <Card style={{ padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 1000, letterSpacing: 0.7, opacity: 0.82 }}>CHOISIS TON SPORT</div>
          <Pill tone="gold">LIVE & COMPÉTITIONS</Pill>
        </div>
        <SportSelector sport={sport} setSport={setSport} />
      </Card>

      <ScoreTicker title="FLASH RÉSULTATS" items={tickerItems} accent={meta.accent} />

      <Card>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Pill tone="gold">{localeProfile.label}</Pill>
          <Pill tone="blue">{sources.length} source{sources.length > 1 ? "s" : ""}</Pill>
          {isDartsApi && feed?.configured ? (
            <Pill tone="green">DATA API: {String(feed.plan || "ACTIVE").toUpperCase()}</Pill>
          ) : (
            <Pill>DATA: SOURCES OFFICIELLES</Pill>
          )}
          {feed?.warnings?.length ? <Pill tone="blue">{feed.warnings.length} info</Pill> : null}
        </div>

        {isDartsApi && !feed?.configured && !loading ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(79,180,255,.07)", border: "1px solid rgba(79,180,255,.18)", fontSize: 12.5, lineHeight: 1.4 }}>
            Darts fonctionne déjà en mode sources officielles. Pour remplir automatiquement matchs et résultats, ajoute le secret Cloudflare <b>DARTS_API_KEY</b> ; la clé reste côté serveur.
          </div>
        ) : null}
        {!isDartsApi ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,206,82,.06)", border: "1px solid rgba(255,206,82,.16)", fontSize: 12.5, lineHeight: 1.4 }}>
            Cette discipline utilise déjà la présentation LIVE SPORTS et ses sources officielles. Les scores automatiques seront ajoutés provider par provider uniquement lorsqu’une API ou une source exploitable légalement est disponible.
          </div>
        ) : null}
        {feedError ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,75,96,.08)", border: "1px solid rgba(255,75,96,.18)", color: "#ff9aaa", fontSize: 12.5 }}>
            Données automatiques indisponibles : {feedError}. Les liens officiels restent accessibles.
          </div>
        ) : null}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
        {([
          ["overview", "📰 À LA UNE"],
          ["live", `🔴 DIRECT${hasLive ? ` · ${feed?.live.length}` : ""}`],
          ["fixtures", `🗓 À VENIR${hasFixtures ? ` · ${feed?.fixtures.length}` : ""}`],
          ["results", `🏆 RÉSULTATS${hasResults ? ` · ${feed?.results.length}` : ""}`],
          ["sources", `🌍 SOURCES · ${sources.length}`],
        ] as Array<[View, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            style={{
              minHeight: 48,
              padding: "8px 5px",
              borderRadius: 14,
              border: view === key ? `1px solid ${meta.accent}88` : "1px solid rgba(255,255,255,.10)",
              background: view === key ? `${meta.accent}1f` : "rgba(255,255,255,.04)",
              color: view === key ? meta.accent : "rgba(255,255,255,.83)",
              fontSize: 10.5,
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "overview" ? (
        <OverviewMagazine lang={lang} feed={feed} meta={meta} recommended={recommended} isDartsApi={isDartsApi} />
      ) : null}

      {view === "live" ? (
        isDartsApi && hasLive ? (
          <div style={{ display: "grid", gap: 10 }}>
            <SectionHeader title="EN DIRECT" count={`${feed!.live.length} match${feed!.live.length > 1 ? "s" : ""}`} accent={meta.accent} />
            <div style={{ display: "grid", gap: 10 }}>
              {feed!.live.map((item) => (
                <LiveRow key={item.id} item={item} accent={meta.accent} source={recommended[0] || null} />
              ))}
            </div>
          </div>
        ) : (
          <OfficialLinksView sources={recommended} mode="live" />
        )
      ) : null}

      {view === "fixtures" ? (
        isDartsApi && hasFixtures ? (
          <div style={{ display: "grid", gap: 10 }}>
            <SectionHeader title="À VENIR" count={`${feed!.fixtures.length} match${feed!.fixtures.length > 1 ? "s" : ""}`} accent={meta.accent} />
            <div style={{ display: "grid", gap: 10 }}>
              {feed!.fixtures.map((item) => (
                <FixtureRow key={item.id} item={item} lang={lang} accent={meta.accent} source={recommended[0] || null} />
              ))}
            </div>
          </div>
        ) : (
          <OfficialLinksView sources={recommended} mode="fixtures" />
        )
      ) : null}

      {view === "results" ? (
        isDartsApi && hasResults ? (
          <div style={{ display: "grid", gap: 10 }}>
            <SectionHeader title="RÉSULTATS" count={`${feed!.results.length} match${feed!.results.length > 1 ? "s" : ""}`} accent={meta.accent} />
            <div style={{ display: "grid", gap: 10 }}>
              {feed!.results.map((item) => (
                <ResultRow key={item.id} item={item} lang={lang} accent={meta.accent} source={recommended[0] || null} />
              ))}
            </div>
          </div>
        ) : (
          <OfficialLinksView sources={recommended} mode="results" />
        )
      ) : null}

      {view === "sources" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <Card style={{ padding: 11 }}>
            <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 8 }}>RÉGION / CIRCUIT À AFFICHER</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setRegion("recommended")} style={chipStyle(region === "recommended")}>★ RECOMMANDÉ</button>
              {preferredRegions.map((item) => (
                <button key={item} type="button" onClick={() => setRegion(item)} style={chipStyle(region === item)}>
                  {SPORT_LIVE_REGION_LABELS[item]}
                </button>
              ))}
              <button type="button" onClick={() => setRegion("all")} style={chipStyle(region === "all")}>TOUTES LES SOURCES</button>
            </div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))", gap: 10 }}>
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "7px 10px",
    border: active ? "1px solid rgba(255,213,106,.52)" : "1px solid rgba(255,255,255,.11)",
    background: active ? "rgba(255,213,106,.14)" : "rgba(255,255,255,.045)",
    color: active ? "#ffe492" : "rgba(255,255,255,.80)",
    fontSize: 10.5,
    fontWeight: 950,
    cursor: "pointer",
  };
}

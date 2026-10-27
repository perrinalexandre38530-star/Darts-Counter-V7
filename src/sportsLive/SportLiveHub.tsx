import React from "react";
import { useLang } from "../contexts/LangContext";
import { useSport } from "../contexts/SportContext";
import type { SportId } from "../contexts/SportContext";
import type { DartsLiveFixture, DartsLiveMatch, DartsLiveResult } from "../dartsLive/types";
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

type View = "live" | "fixtures" | "results" | "sources";
type RegionFilter = "recommended" | "all" | SportLiveRegion;

const REFRESH_MS = 15 * 60 * 1000;

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ borderRadius: 18, padding: 14, border: "1px solid rgba(255,255,255,.11)", background: "radial-gradient(140% 180% at 0% 0%, rgba(255,59,95,.07), transparent 50%), linear-gradient(180deg, rgba(22,22,30,.97), rgba(8,8,13,.98))", boxShadow: "0 14px 28px rgba(0,0,0,.42)", ...style }}>
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
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 9px", borderRadius: 999, background: bg, color: fg, border: `1px solid ${border}`, fontSize: 11, fontWeight: 900, lineHeight: 1.2 }}>{children}</span>;
}

function ActionLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 38, padding: "8px 11px", borderRadius: 12, textDecoration: "none", fontSize: 12, fontWeight: 950, border: primary ? "1px solid rgba(255,213,106,.48)" : "1px solid rgba(255,255,255,.13)", color: primary ? "#1a1102" : "#f5f5f7", background: primary ? "linear-gradient(180deg, #ffe17e, #e9aa35)" : "rgba(255,255,255,.055)" }}>
      {children}
    </a>
  );
}

function SportSelector({ sport, setSport }: { sport: SportId; setSport: (sport: SportId) => void }) {
  return (
    <Card style={{ padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 11.5, fontWeight: 1000, letterSpacing: .7, opacity: .82 }}>CHOISIS TON SPORT</div>
        <Pill tone="gold">LIVE & COMPÉTITIONS</Pill>
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollSnapType: "x proximity", scrollbarWidth: "none" }}>
        {SPORT_LIVE_ORDER.map((id) => {
          const meta = SPORT_LIVE_META[id];
          const active = id === sport;
          return (
            <button key={id} type="button" onClick={() => setSport(id)} aria-pressed={active} style={{ flex: "0 0 auto", minWidth: 106, minHeight: 64, scrollSnapAlign: "start", borderRadius: 14, padding: "8px 10px", border: active ? `1px solid ${meta.accent}99` : "1px solid rgba(255,255,255,.10)", background: active ? `linear-gradient(180deg, ${meta.accent}24, ${meta.accent}0d)` : "rgba(255,255,255,.035)", color: active ? meta.accent : "rgba(255,255,255,.78)", boxShadow: active ? `0 0 20px ${meta.accent}15` : "none", fontWeight: 1000, cursor: "pointer" }}>
              <div style={{ fontSize: 22, lineHeight: 1 }}>{meta.icon}</div>
              <div style={{ marginTop: 5, fontSize: 10.5, whiteSpace: "nowrap" }}>{meta.shortLabel}</div>
            </button>
          );
        })}
      </div>
    </Card>
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
  try { return new Intl.DateTimeFormat(lang || "fr", { dateStyle: "short", timeStyle: "short" }).format(date); }
  catch { return date.toLocaleString(); }
}

function formatDate(value: string | null | undefined, lang: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  try { return new Intl.DateTimeFormat(lang || "fr", { dateStyle: "medium" }).format(date); }
  catch { return value; }
}

function MatchNames({ players }: { players: Array<{ name: string; score?: number | null }> }) {
  const p1 = players[0];
  const p2 = players[1];
  if (!p1 && !p2) return <div style={{ opacity: .72 }}>Match en cours</div>;
  return (
    <div style={{ display: "grid", gap: 5 }} translate="no" data-i18n-skip="true">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 950 }}><span>{p1?.name || "—"}</span><span>{p1?.score ?? ""}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 950 }}><span>{p2?.name || "—"}</span><span>{p2?.score ?? ""}</span></div>
    </div>
  );
}

function LiveRow({ item }: { item: DartsLiveMatch }) {
  return (
    <Card style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 9 }}><Pill tone="red">● LIVE</Pill>{item.competition ? <Pill tone="gold"><span translate="no" data-i18n-skip="true">{item.competition}</span></Pill> : null}{item.round ? <Pill>{niceRound(item.round)}</Pill> : null}</div>
      <MatchNames players={item.players} />
    </Card>
  );
}

function FixtureRow({ item, lang }: { item: DartsLiveFixture; lang: string }) {
  return (
    <Card style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 7 }}><Pill tone="blue">À VENIR</Pill>{item.competition ? <Pill tone="gold"><span translate="no" data-i18n-skip="true">{item.competition}</span></Pill> : null}{item.round ? <Pill>{niceRound(item.round)}</Pill> : null}</div>
          <div style={{ fontSize: 14, fontWeight: 950 }} translate="no" data-i18n-skip="true">{item.players.map((p) => p.name).filter(Boolean).join("  vs  ") || "Match à confirmer"}</div>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 900, opacity: .78, textAlign: "right", maxWidth: 120 }}>{item.startsAt ? formatDateTime(item.startsAt, lang) : formatDate(item.date, lang)}</div>
      </div>
    </Card>
  );
}

function ResultRow({ item, lang }: { item: DartsLiveResult; lang: string }) {
  return (
    <Card style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 7 }}><Pill tone="green">TERMINÉ</Pill>{item.competition ? <Pill tone="gold"><span translate="no" data-i18n-skip="true">{item.competition}</span></Pill> : null}{item.round ? <Pill>{niceRound(item.round)}</Pill> : null}</div>
          <div style={{ display: "grid", gap: 4 }} translate="no" data-i18n-skip="true">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontWeight: 1000 }}><span>🏆 {item.winner.name}</span><span>{item.winner.score ?? "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, opacity: .75, fontWeight: 850 }}><span>{item.loser.name}</span><span>{item.loser.score ?? "—"}</span></div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 900, opacity: .7, textAlign: "right" }}>{formatDate(item.playedOn, lang)}</div>
      </div>
    </Card>
  );
}

function SourceCard({ source }: { source: SportLiveSource }) {
  const primary = source.scoresUrl || source.resultsUrl || source.calendarUrl || source.homeUrl;
  return (
    <Card style={{ padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15, fontWeight: 1000 }} translate="no" data-i18n-skip="true">{source.name}</div>
        {source.official ? <Pill tone="green">OFFICIEL</Pill> : null}
      </div>
      <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.45, opacity: .78 }}>{source.description}</div>
      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }} translate="no" data-i18n-skip="true">{(source.badges || []).map((badge) => <Pill key={badge}>{badge}</Pill>)}</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 11 }}>
        <ActionLink href={primary} primary>OUVRIR</ActionLink>
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
  const title = mode === "live" ? "Directs et suivis officiels" : mode === "fixtures" ? "Calendriers officiels" : "Résultats officiels";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Card>
        <div style={{ fontWeight: 1000, fontSize: 15 }}>{title}</div>
        <div style={{ marginTop: 6, opacity: .76, fontSize: 12.5, lineHeight: 1.45 }}>Aucun score n'est fabriqué dans l'application. Tant qu'un provider de données temps réel n'est pas connecté pour cette discipline, les boutons ci-dessous ouvrent uniquement les sources officielles disponibles.</div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))", gap: 10 }}>{rows.map((source) => <SourceCard key={source.id} source={source} />)}</div>
    </div>
  );
}

export default function SportLiveHub() {
  const { lang } = useLang();
  const { sport, setSport } = useSport();
  const meta = SPORT_LIVE_META[sport];
  const localeProfile = React.useMemo(() => getLocaleProfile(lang), [lang]);
  const preferredRegions = React.useMemo(() => getAvailableRegions(sport, lang), [sport, lang]);
  const recommended = React.useMemo(() => getRecommendedSportSources(sport, lang), [sport, lang]);
  const allSportSources = React.useMemo(() => getSportSources(sport), [sport]);

  const [view, setView] = React.useState<View>("live");
  const [region, setRegion] = React.useState<RegionFilter>("recommended");
  const [feed, setFeed] = React.useState<SportLiveOverview | null>(() => getCachedSportLiveOverview(sport));
  const [loading, setLoading] = React.useState(sport === "darts");
  const [feedError, setFeedError] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    setRegion("recommended");
    setFeed(getCachedSportLiveOverview(sport));
    setFeedError(null);
  }, [sport, lang]);

  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const run = async (quiet = false) => {
      if (!quiet) setLoading(sport === "darts");
      try {
        const next = await fetchSportLiveOverview(sport, controller.signal);
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
    const timer = sport === "darts" ? window.setInterval(() => void run(true), REFRESH_MS) : null;
    return () => {
      active = false;
      controller.abort();
      if (timer !== null) window.clearInterval(timer);
    };
  }, [sport]);

  const refresh = React.useCallback(async () => {
    setLoading(sport === "darts");
    setFeedError(null);
    try {
      const next = await fetchSportLiveOverview(sport);
      setFeed(next);
      setUpdatedAt(Date.now());
    } catch (error: any) {
      setFeedError(String(error?.message || error || "LIVE indisponible"));
    } finally {
      setLoading(false);
    }
  }, [sport]);

  const sources = React.useMemo(() => {
    if (region === "all") return allSportSources;
    if (region === "recommended") return recommended;
    return allSportSources.filter((source) => source.regions.includes(region));
  }, [allSportSources, recommended, region]);

  const hasLive = !!feed?.live?.length;
  const hasFixtures = !!feed?.fixtures?.length;
  const hasResults = !!feed?.results?.length;
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  const isDartsApi = sport === "darts";

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <SportSelector sport={sport} setSport={setSport} />

      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <div style={{ fontSize: 23, fontWeight: 1000, letterSpacing: .3, color: meta.accent, textShadow: `0 0 18px ${meta.accent}2b` }}>{meta.icon} {meta.label.toUpperCase()} · LIVE</div>
              <Pill tone={isOnline ? "green" : "gray"}>{isOnline ? "ONLINE" : "HORS LIGNE"}</Pill>
            </div>
            <div style={{ marginTop: 7, fontSize: 13, lineHeight: 1.45, opacity: .78, maxWidth: 760 }}>Compétitions officielles, directs, calendriers, résultats et liens de diffusion de <b>{meta.label}</b> uniquement. Le sélecteur ci-dessus change aussi le sport actif de l'application.</div>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading} style={{ borderRadius: 12, padding: "9px 12px", border: "1px solid rgba(255,255,255,.13)", background: "rgba(255,255,255,.055)", color: "#fff", fontWeight: 950, cursor: loading ? "default" : "pointer", opacity: loading ? .55 : 1 }}>{loading ? "ACTUALISATION…" : "↻ ACTUALISER"}</button>
        </div>

        <div style={{ marginTop: 11, display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Pill tone="gold">LANGUE: {String(lang).toUpperCase()}</Pill>
          <Pill tone="blue">{localeProfile.label}</Pill>
          <Pill>{sources.length} SOURCE{sources.length > 1 ? "S" : ""}</Pill>
          {isDartsApi && feed?.configured ? <Pill tone="green">DATA API: {String(feed.plan || "ACTIVE").toUpperCase()}</Pill> : <Pill>DATA: SOURCES OFFICIELLES</Pill>}
          {updatedAt ? <Pill>MAJ {new Date(updatedAt).toLocaleTimeString()}</Pill> : null}
        </div>

        {isDartsApi && !feed?.configured && !loading ? <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(79,180,255,.07)", border: "1px solid rgba(79,180,255,.18)", fontSize: 12.5, lineHeight: 1.4 }}>Darts fonctionne déjà en mode sources officielles. Pour remplir automatiquement matchs et résultats, ajoute le secret Cloudflare <b>DARTS_API_KEY</b> ; la clé reste côté serveur.</div> : null}
        {!isDartsApi ? <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,206,82,.06)", border: "1px solid rgba(255,206,82,.16)", fontSize: 12.5, lineHeight: 1.4 }}>V128 pose le moteur commun pour ce sport et branche ses sources officielles. Les scores automatiques seront ajoutés provider par provider uniquement lorsqu'une API ou une source exploitable légalement est disponible.</div> : null}
        {feedError ? <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,75,96,.08)", border: "1px solid rgba(255,75,96,.18)", color: "#ff9aaa", fontSize: 12.5 }}>Données automatiques indisponibles : {feedError}. Les liens officiels restent accessibles.</div> : null}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {([[
          "live", `🔴 LIVE${hasLive ? ` · ${feed?.live.length}` : ""}`
        ], ["fixtures", `🗓 À VENIR${hasFixtures ? ` · ${feed?.fixtures.length}` : ""}`], ["results", `🏆 RÉSULTATS${hasResults ? ` · ${feed?.results.length}` : ""}`], ["sources", `🌍 SOURCES · ${sources.length}`]] as Array<[View, string]>).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setView(key)} style={{ minHeight: 45, padding: "8px 5px", borderRadius: 13, border: view === key ? `1px solid ${meta.accent}88` : "1px solid rgba(255,255,255,.10)", background: view === key ? `${meta.accent}1c` : "rgba(255,255,255,.04)", color: view === key ? meta.accent : "rgba(255,255,255,.83)", fontSize: 10.5, fontWeight: 1000, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {view === "live" ? (
        isDartsApi && hasLive ? <div style={{ display: "grid", gap: 9 }}>{feed!.live.map((item) => <LiveRow key={item.id} item={item} />)}</div> : <OfficialLinksView sources={recommended} mode="live" />
      ) : null}

      {view === "fixtures" ? (
        isDartsApi && hasFixtures ? <div style={{ display: "grid", gap: 9 }}>{feed!.fixtures.map((item) => <FixtureRow key={item.id} item={item} lang={lang} />)}</div> : <OfficialLinksView sources={recommended} mode="fixtures" />
      ) : null}

      {view === "results" ? (
        isDartsApi && hasResults ? <div style={{ display: "grid", gap: 9 }}>{feed!.results.map((item) => <ResultRow key={item.id} item={item} lang={lang} />)}</div> : <OfficialLinksView sources={recommended} mode="results" />
      ) : null}

      {view === "sources" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <Card style={{ padding: 11 }}>
            <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 8 }}>RÉGION / CIRCUIT À AFFICHER</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setRegion("recommended")} style={chipStyle(region === "recommended")}>★ RECOMMANDÉ</button>
              {preferredRegions.map((item) => <button key={item} type="button" onClick={() => setRegion(item)} style={chipStyle(region === item)}>{SPORT_LIVE_REGION_LABELS[item]}</button>)}
              <button type="button" onClick={() => setRegion("all")} style={chipStyle(region === "all")}>TOUTES LES SOURCES</button>
            </div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))", gap: 10 }}>{sources.map((source) => <SourceCard key={source.id} source={source} />)}</div>
        </div>
      ) : null}
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return { borderRadius: 999, padding: "7px 10px", border: active ? "1px solid rgba(255,213,106,.52)" : "1px solid rgba(255,255,255,.11)", background: active ? "rgba(255,213,106,.14)" : "rgba(255,255,255,.045)", color: active ? "#ffe492" : "rgba(255,255,255,.80)", fontSize: 10.5, fontWeight: 950, cursor: "pointer" };
}

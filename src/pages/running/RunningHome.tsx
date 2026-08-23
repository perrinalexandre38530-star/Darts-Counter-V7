import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";
import { listActivities } from "../../activity/activityStore";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import type { ActivityRecord } from "../../activity/activityTypes";

const PAGE_MAX_WIDTH = 620;
const sectionWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: PAGE_MAX_WIDTH,
  paddingInline: 10,
};

type Props = {
  store?: any;
  go: (route: any, params?: any) => void;
};

function safeActiveProfile(store: any) {
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const activeId = String(store?.activeProfileId || "");
  return profiles.find((profile: any) => String(profile?.id || "") === activeId) || profiles[0] || null;
}

function useAutoFitTitle(deps: any[] = []) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const text = textRef.current;
      if (!wrap || !text) return;
      text.style.transform = "scale(1)";
      void text.offsetHeight;
      const wrapW = wrap.getBoundingClientRect().width;
      const textW = text.getBoundingClientRect().width;
      if (!wrapW || !textW) return;
      setScale(textW > wrapW ? Math.max(0.72, Math.min(1, wrapW / textW)) : 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { wrapRef, textRef, scale };
}

function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function runningTickerSvg(kind: "hero" | "challenge" | "gps" | "progress", accent: string) {
  const safeAccent = accent || "#f6c256";
  const content = {
    hero: { kicker: "RUNNING", line1: "TA COURSE.", line2: "TON RYTHME.", icon: "RUN" },
    challenge: { kicker: "CHALLENGE", line1: "5 KM", line2: "BAT TON RECORD", icon: "5K" },
    gps: { kicker: "GPS", line1: "TRACE TON", line2: "PARCOURS", icon: "GPS" },
    progress: { kicker: "PROGRESSION", line1: "CHAQUE KM", line2: "COMPTE", icon: "+XP" },
  }[kind];

  return svgDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360">
    <defs>
      <radialGradient id="bg" cx="72%" cy="28%" r="86%">
        <stop offset="0" stop-color="${safeAccent}" stop-opacity=".22"/>
        <stop offset=".44" stop-color="#111722"/>
        <stop offset="1" stop-color="#05070d"/>
      </radialGradient>
      <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${safeAccent}"/>
        <stop offset="1" stop-color="#ffffff"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="13"/></filter>
    </defs>
    <rect width="1200" height="360" fill="url(#bg)"/>
    <path d="M0 286 C180 242 278 330 454 274 C626 220 736 124 1200 214" fill="none" stroke="${safeAccent}" stroke-opacity=".16" stroke-width="18"/>
    <path d="M0 286 C180 242 278 330 454 274 C626 220 736 124 1200 214" fill="none" stroke="${safeAccent}" stroke-opacity=".42" stroke-width="3"/>
    <circle cx="913" cy="177" r="124" fill="${safeAccent}" opacity=".10" filter="url(#glow)"/>
    <circle cx="913" cy="177" r="86" fill="none" stroke="${safeAccent}" stroke-opacity=".34" stroke-width="3"/>
    <text x="913" y="194" text-anchor="middle" font-family="Arial" font-size="58" font-weight="900" fill="url(#line)">${content.icon}</text>
    <text x="74" y="92" font-family="Arial" font-size="24" font-weight="900" letter-spacing="5" fill="${safeAccent}">${content.kicker}</text>
    <text x="74" y="169" font-family="Arial" font-size="56" font-weight="900" fill="#ffffff">${content.line1}</text>
    <text x="74" y="229" font-family="Arial" font-size="48" font-weight="900" fill="#ffffff" opacity=".82">${content.line2}</text>
  </svg>`);
}

function startParams(targetM: number | null) {
  return { runningAutoStart: true, runningTargetM: targetM };
}

export default function RunningHome({ store, go }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const t = langApi?.t ?? ((_: string, fallback: string) => fallback);
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
  const [tickerIndex, setTickerIndex] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    void listActivities("running").then((rows) => {
      if (alive) setActivities(rows);
    });
    return () => { alive = false; };
  }, []);

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#a8a8b3";
  const { wrapRef: titleWrapRef, textRef: titleTextRef, scale: titleScale } = useAutoFitTitle([accent, lang]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const totalM = activities.reduce((sum, item) => sum + Number(item.distanceM || 0), 0);
    const totalElevation = activities.reduce((sum, item) => sum + Number(item.elevationGainM || 0), 0);
    const paces = activities
      .map((item) => item.avgPaceSecPerKm)
      .filter((value): value is number => Number.isFinite(value) && Number(value) > 0);
    const weekRows = activities.filter((item) => Number(item.startedAt || 0) >= weekAgo);
    const weekDistanceM = weekRows.reduce((sum, item) => sum + Number(item.distanceM || 0), 0);
    const longest = activities.reduce((best, item) => Math.max(best, Number(item.distanceM || 0)), 0);
    const totalMs = activities.reduce((sum, item) => sum + Number(item.elapsedMs || 0), 0);
    const xp = Math.round(totalM / 10); // 100 XP / km
    const level = Math.floor(xp / 1000) + 1;
    const levelXp = xp % 1000;

    const bestForTarget = (targetM: number) => {
      const rows = activities.filter((item) => Number(item.targetDistanceM || 0) === targetM && Number(item.distanceM || 0) >= targetM * 0.92);
      if (!rows.length) return null;
      return rows.reduce((best, item) => Number(item.elapsedMs || 0) < Number(best.elapsedMs || Infinity) ? item : best, rows[0]);
    };

    return {
      totalM,
      totalElevation,
      bestPace: paces.length ? Math.min(...paces) : null,
      weekDistanceM,
      weekSessions: weekRows.length,
      longest,
      totalMs,
      xp,
      level,
      levelXp,
      last: activities[0] || null,
      pr1k: bestForTarget(1000),
      pr5k: bestForTarget(5000),
      pr10k: bestForTarget(10000),
    };
  }, [activities]);

  const copy = lang === "fr" ? {
    welcome: "Bienvenue",
    title: "RUNNING SCORING",
    beta: "BETA WEB / PWA",
    global: "Vue globale Running",
    total: "Distance",
    sessions: "Sorties",
    best: "Meilleure allure",
    elevation: "D+ cumulé",
    longest: "Plus longue",
    time: "Temps total",
    level: "NIVEAU",
    xp: "XP RUNNING",
    nextLevel: "vers le niveau suivant",
    quick: "LANCE TA SORTIE",
    free: "COURSE LIBRE",
    freeSub: "GPS · allure · distance · parcours",
    one: "1 KM",
    oneSub: "Explosif · chrono · record",
    five: "5 KM",
    fiveSub: "Le classique · régularité",
    ten: "10 KM",
    tenSub: "Endurance · stratégie d'allure",
    week: "CETTE SEMAINE",
    weekChallenge: "Défi 10 km",
    weekSessions: "Défi 3 sorties",
    records: "MES RECORDS",
    history: "MES SORTIES",
    devices: "APPAREILS CONNECTÉS",
    devicesSub: "Health Connect · Garmin · FIT/GPX/TCX — prochaine étape",
    open: "OUVRIR",
    noRecord: "—",
  } : lang === "es" ? {
    welcome: "Bienvenido",
    title: "RUNNING SCORING",
    beta: "BETA WEB / PWA",
    global: "Vista global Running",
    total: "Distancia",
    sessions: "Carreras",
    best: "Mejor ritmo",
    elevation: "D+ total",
    longest: "Más larga",
    time: "Tiempo total",
    level: "NIVEL",
    xp: "XP RUNNING",
    nextLevel: "hasta el siguiente nivel",
    quick: "INICIA TU CARRERA",
    free: "CARRERA LIBRE",
    freeSub: "GPS · ritmo · distancia · ruta",
    one: "1 KM",
    oneSub: "Explosivo · crono · récord",
    five: "5 KM",
    fiveSub: "El clásico · regularidad",
    ten: "10 KM",
    tenSub: "Resistencia · estrategia",
    week: "ESTA SEMANA",
    weekChallenge: "Reto 10 km",
    weekSessions: "Reto 3 carreras",
    records: "MIS RÉCORDS",
    history: "MIS CARRERAS",
    devices: "DISPOSITIVOS CONECTADOS",
    devicesSub: "Health Connect · Garmin · FIT/GPX/TCX — siguiente etapa",
    open: "ABRIR",
    noRecord: "—",
  } : {
    welcome: "Welcome",
    title: "RUNNING SCORING",
    beta: "WEB / PWA BETA",
    global: "Running overview",
    total: "Distance",
    sessions: "Runs",
    best: "Best pace",
    elevation: "Total climb",
    longest: "Longest",
    time: "Total time",
    level: "LEVEL",
    xp: "RUNNING XP",
    nextLevel: "to next level",
    quick: "START YOUR RUN",
    free: "FREE RUN",
    freeSub: "GPS · pace · distance · route",
    one: "1 KM",
    oneSub: "Fast · timed · personal best",
    five: "5 KM",
    fiveSub: "The classic · consistency",
    ten: "10 KM",
    tenSub: "Endurance · pace strategy",
    week: "THIS WEEK",
    weekChallenge: "10 km challenge",
    weekSessions: "3 runs challenge",
    records: "MY RECORDS",
    history: "MY RUNS",
    devices: "CONNECTED DEVICES",
    devicesSub: "Health Connect · Garmin · FIT/GPX/TCX — next step",
    open: "OPEN",
    noRecord: "—",
  };

  const tickerItems: ArcadeTickerItem[] = useMemo(() => [
    {
      id: "running-hero",
      title: t("running.ticker.hero.title", "Running Scoring"),
      text: t("running.ticker.hero.text", "Enregistre ta sortie, visualise ton parcours et transforme chaque kilomètre en progression."),
      detail: `${(stats.weekDistanceM / 1000).toFixed(1)} km · ${stats.weekSessions} ${lang === "fr" ? "sorties cette semaine" : lang === "es" ? "carreras esta semana" : "runs this week"}`,
      backgroundImage: runningTickerSvg("hero", accent),
      accentColor: accent,
    },
    {
      id: "running-challenge",
      title: t("running.ticker.challenge.title", "Challenge 5 KM"),
      text: stats.pr5k
        ? `${lang === "fr" ? "Ton record actuel" : lang === "es" ? "Tu récord actual" : "Your current best"} : ${formatDuration(stats.pr5k.elapsedMs)}. ${lang === "fr" ? "À toi de le battre." : lang === "es" ? "Ahora supéralo." : "Now beat it."}`
        : t("running.ticker.challenge.empty", "Première mission : termine ton premier 5 KM et inscris ton record."),
      detail: stats.pr5k ? `${formatPace(stats.pr5k.avgPaceSecPerKm)} /km` : "5 KM · PR",
      backgroundImage: runningTickerSvg("challenge", accent),
      accentColor: accent,
    },
    {
      id: "running-gps",
      title: t("running.ticker.gps.title", "GPS & parcours"),
      text: t("running.ticker.gps.text", "Distance, allure, vitesse, dénivelé et tracé de ta sortie réunis dans la même session."),
      detail: t("running.ticker.gps.detail", "Téléphone GPS · tracé · splits"),
      backgroundImage: runningTickerSvg("gps", accent),
      accentColor: accent,
    },
    {
      id: "running-progress",
      title: t("running.ticker.progress.title", "Progression"),
      text: `${stats.xp} XP · ${lang === "fr" ? "niveau" : lang === "es" ? "nivel" : "level"} ${stats.level}. ${lang === "fr" ? "Chaque sortie fait avancer ton profil Running." : lang === "es" ? "Cada carrera hace progresar tu perfil Running." : "Every run moves your Running profile forward."}`,
      detail: `${stats.levelXp}/1000 XP`,
      backgroundImage: runningTickerSvg("progress", accent),
      accentColor: accent,
    },
  ], [accent, lang, stats.level, stats.levelXp, stats.pr5k, stats.weekDistanceM, stats.weekSessions, stats.xp, t]);

  const recordSlides = useMemo(() => [{
    id: "running-records",
    title: copy.records,
    rows: [
      { label: "1 KM", value: stats.pr1k ? formatDuration(stats.pr1k.elapsedMs) : copy.noRecord },
      { label: "5 KM", value: stats.pr5k ? formatDuration(stats.pr5k.elapsedMs) : copy.noRecord },
      { label: "10 KM", value: stats.pr10k ? formatDuration(stats.pr10k.elapsedMs) : copy.noRecord },
      { label: copy.week, value: `${(stats.weekDistanceM / 1000).toFixed(1)} km` },
    ],
  }], [copy.noRecord, copy.records, copy.week, stats.pr10k, stats.pr1k, stats.pr5k, stats.weekDistanceM]);

  const distanceProgress = Math.min(100, (stats.weekDistanceM / 10_000) * 100);
  const sessionProgress = Math.min(100, (stats.weekSessions / 3) * 100);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 96 }}>
      <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 8 }}>
        <div
          style={{
            ...sectionWrap,
            borderRadius: 18,
            border: `1px solid ${(theme as any)?.cardSoft || "rgba(255,255,255,.14)"}`,
            background: "rgba(0,0,0,.22)",
            boxShadow: "0 18px 70px rgba(0,0,0,.55)",
            padding: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
            <div style={welcomePill(theme)}><span>👋</span><span>{copy.welcome}</span></div>
            <div style={{ ...welcomePill(theme), color: accent, borderColor: `${accent}66` }}>● {copy.beta}</div>
          </div>

          <div ref={titleWrapRef} style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <div
              ref={titleTextRef}
              style={{
                transform: `scale(${titleScale})`,
                transformOrigin: "center",
                fontSize: "clamp(24px, 7vw, 31px)",
                fontWeight: 1000,
                letterSpacing: "clamp(.6px, .8vw, 2.5px)",
                textTransform: "uppercase",
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                backgroundImage: `linear-gradient(120deg, ${accent}, #ffffff, ${accent})`,
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                color: "transparent",
                animation: "dcTitlePulse 3.6s ease-in-out infinite, dcTitleShimmer 7s linear infinite",
              }}
            >
              {copy.title}
            </div>
          </div>
        </div>
      </div>

      <div style={sectionWrap}>
        {activeProfile ? (
          <ActiveProfileCard
            hideStatus
            hideStarRing
            profile={activeProfile as any}
            stats={{} as any}
            suppressDefaultStatsSlides
            customSlides={recordSlides as any}
            globalTitle={copy.global}
            globalKpis={[
              { label: copy.total, value: formatDistance(stats.totalM) },
              { label: copy.sessions, value: activities.length },
              { label: copy.best, value: `${formatPace(stats.bestPace)} /km` },
              { label: copy.elevation, value: `+${Math.round(stats.totalElevation)} m` },
              { label: copy.longest, value: formatDistance(stats.longest) },
              { label: copy.time, value: formatDuration(stats.totalMs) },
            ]}
          />
        ) : null}
      </div>

      <div style={sectionWrap}>
        <ArcadeTicker items={tickerItems} activeIndex={tickerIndex} onIndexChange={setTickerIndex} intervalMs={7000} />
      </div>

      <div style={{ ...sectionWrap, marginTop: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={sectionTitle(accent)}>{copy.quick}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
            <RunAction icon="🏃" title={copy.free} subtitle={copy.freeSub} accent={accent} onClick={() => go("games", startParams(null))} featured />
            <RunAction icon="⚡" title={copy.one} subtitle={copy.oneSub} accent={accent} onClick={() => go("games", startParams(1000))} />
            <RunAction icon="🎯" title={copy.five} subtitle={copy.fiveSub} accent={accent} onClick={() => go("games", startParams(5000))} />
            <RunAction icon="🔥" title={copy.ten} subtitle={copy.tenSub} accent={accent} onClick={() => go("games", startParams(10000))} />
          </div>
        </div>
      </div>

      <div style={{ ...sectionWrap, marginTop: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={sectionTitle(accent)}>{copy.week}</div>
            <div style={{ fontWeight: 1000, color: accent, fontSize: 13 }}>{copy.level} {stats.level}</div>
          </div>

          <div style={{ borderRadius: 16, padding: 12, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div><div style={{ fontWeight: 950 }}>{copy.xp}</div><div style={{ fontSize: 11, color: textSoft, marginTop: 2 }}>{stats.levelXp}/1000 {copy.nextLevel}</div></div>
              <div style={{ fontSize: 22, fontWeight: 1000, color: accent }}>{stats.xp} XP</div>
            </div>
            <Progress value={stats.levelXp / 10} accent={accent} />
          </div>

          <Challenge label={copy.weekChallenge} value={`${(stats.weekDistanceM / 1000).toFixed(1)} / 10 km`} progress={distanceProgress} accent={accent} />
          <Challenge label={copy.weekSessions} value={`${stats.weekSessions} / 3`} progress={sessionProgress} accent={accent} />
        </div>
      </div>

      <div style={{ ...sectionWrap, marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <QuickLink icon="📊" title={copy.history} onClick={() => go("games", { runningView: "history" })} />
        <QuickLink icon="🏆" title={copy.records} onClick={() => go("games", { runningView: "records" })} />
      </div>

      <div style={{ ...sectionWrap, marginTop: 12 }}>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, alignItems: "center", padding: 13, opacity: .82 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: `${accent}16`, border: `1px solid ${accent}38`, fontSize: 22 }}>⌚</div>
          <div><div style={{ fontWeight: 950, fontSize: 12 }}>{copy.devices}</div><div style={{ marginTop: 3, fontSize: 10.5, color: textSoft, lineHeight: 1.35 }}>{copy.devicesSub}</div></div>
          <div style={{ fontSize: 10, fontWeight: 1000, color: accent }}>{copy.open}</div>
        </div>
      </div>
    </div>
  );
}

function welcomePill(theme: any): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${theme?.cardSoft || "rgba(255,255,255,.14)"}`,
    background: "rgba(255,255,255,.055)",
    boxShadow: "0 6px 22px rgba(0,0,0,.24)",
    fontWeight: 950,
    fontSize: 11,
    letterSpacing: .3,
  };
}

function sectionTitle(accent: string): React.CSSProperties {
  return { fontSize: 12, fontWeight: 1000, letterSpacing: 1.05, color: accent, marginBottom: 11, textTransform: "uppercase" };
}

function RunAction({ icon, title, subtitle, accent, onClick, featured = false }: { icon: string; title: string; subtitle: string; accent: string; onClick: () => void; featured?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 122,
        borderRadius: 18,
        border: `1px solid ${featured ? `${accent}78` : "rgba(255,255,255,.10)"}`,
        background: featured ? `linear-gradient(150deg, ${accent}1f, rgba(255,255,255,.035))` : "rgba(255,255,255,.035)",
        color: "inherit",
        textAlign: "left",
        padding: 13,
        cursor: "pointer",
        boxShadow: featured ? `0 14px 34px ${accent}12` : "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ width: 38, height: 38, borderRadius: 13, display: "grid", placeItems: "center", background: `${accent}14`, border: `1px solid ${accent}30`, fontSize: 19 }}>{icon}</div>
        <div style={{ color: accent, fontWeight: 1000 }}>›</div>
      </div>
      <div><div style={{ fontSize: 13.5, fontWeight: 1000 }}>{title}</div><div style={{ fontSize: 10.5, lineHeight: 1.35, opacity: .62, marginTop: 4 }}>{subtitle}</div></div>
    </button>
  );
}

function Challenge({ label, value, progress, accent }: { label: string; value: string; progress: number; accent: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, fontWeight: 900 }}><span>{label}</span><span style={{ color: accent }}>{value}</span></div>
      <Progress value={progress} accent={accent} />
    </div>
  );
}

function Progress({ value, accent }: { value: number; accent: string }) {
  const width = Math.max(0, Math.min(100, value));
  return <div style={{ height: 7, background: "rgba(255,255,255,.08)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}><div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: accent, boxShadow: `0 0 14px ${accent}66`, transition: "width .25s ease" }} /></div>;
}

function QuickLink({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return <button type="button" className="card" onClick={onClick} style={{ color: "inherit", cursor: "pointer", textAlign: "left", minHeight: 86, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 13 }}><div style={{ fontSize: 22 }}>{icon}</div><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: 1000 }}><span>{title}</span><span>›</span></div></button>;
}

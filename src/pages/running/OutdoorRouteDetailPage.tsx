import React from "react";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import { estimateOutdoorRouteDurationMs } from "../../activity/outdoorNavigation";
import { analyzeRunningTerrain, terrainAdvice, terrainLabel } from "../../activity/runningElevation";
import { loadOutdoorRouteExtras, type OutdoorRouteExtras } from "../../activity/outdoorRouteExtras";
import { outdoorSportLabel, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import type { ActivityRecord } from "../../activity/activityTypes";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import OutdoorInteractiveRouteMap from "./OutdoorInteractiveRouteMap";
import OutdoorRoutePhotoGallery from "./OutdoorRoutePhotoGallery";
import OutdoorRoutePlaceInfoPanel from "./OutdoorRoutePlaceInfoPanel";
import OutdoorRouteCommunityPanel from "./OutdoorRouteCommunityPanel";
import OutdoorRouteSocialPanel from "./OutdoorRouteSocialPanel";
import OutdoorRoutePlannerPanel from "./OutdoorRoutePlannerPanel";
import OutdoorLongDistancePanel from "./OutdoorLongDistancePanel";
import OutdoorOfflineRoutePanel from "./OutdoorOfflineRoutePanel";
import RunningElevationProfile from "./RunningElevationProfile";
import { RunningSurface } from "./RunningUi";

export type OutdoorRouteDetailTab = "overview" | "places" | "photos" | "performance" | "community" | "plan";
type DetailTab = OutdoorRouteDetailTab;

type Props = {
  route: RunningRouteTemplate;
  sport: OutdoorPerformanceSport;
  lang: string;
  accent: string;
  textSoft: string;
  favorite: boolean;
  localAttempts: ActivityRecord[];
  initialTab?: DetailTab;
  onBack: () => void;
  onClose: () => void;
  onGuide: () => void;
  onToggleFavorite: () => void;
  onOpenMaps: () => void;
  onSearchImages: () => void;
  onOfflineChanged?: () => void;
};

function pickText(lang: string, fr: string, en: string, es: string) {
  const lower = String(lang || "fr").toLowerCase();
  return lower.startsWith("en") ? en : lower.startsWith("es") ? es : fr;
}

export default function OutdoorRouteDetailPage(props: Props) {
  const { route, sport, lang, accent, textSoft } = props;
  const [tab, setTab] = React.useState<DetailTab>(props.initialTab || "overview");
  const [mapFullscreen, setMapFullscreen] = React.useState(false);
  const [activeProfilePoint, setActiveProfilePoint] = React.useState<number | null>(null);
  const [extras, setExtras] = React.useState<OutdoorRouteExtras>(() => loadOutdoorRouteExtras(route.id));
  const terrain = React.useMemo(() => analyzeRunningTerrain(route.route), [route.route]);
  const advice = React.useMemo(() => terrainAdvice(terrain, lang), [lang, terrain]);
  const best = props.localAttempts[0] || null;
  const averagePace = React.useMemo(() => {
    const rows = props.localAttempts.filter((row) => Number.isFinite(row.avgPaceSecPerKm));
    if (!rows.length) return null;
    return Math.round(rows.reduce((sum, row) => sum + Number(row.avgPaceSecPerKm || 0), 0) / rows.length);
  }, [props.localAttempts]);

  React.useEffect(() => { setExtras(loadOutdoorRouteExtras(route.id)); setTab(props.initialTab || "overview"); setMapFullscreen(false); setActiveProfilePoint(null); }, [props.initialTab, route.id]);

  if (mapFullscreen) return <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#070a0f" }}><OutdoorInteractiveRouteMap route={route} accent={accent} lang={lang} textSoft={textSoft} fullscreen activePointIndex={activeProfilePoint} onActivePointChange={setActiveProfilePoint} onCloseFullscreen={() => setMapFullscreen(false)}/></div>;

  const tabs: Array<[DetailTab, string, string]> = [
    ["overview", "▤", pickText(lang, "APERÇU", "OVERVIEW", "RESUMEN")],
    ["places", "⌖", pickText(lang, "LIEUX", "PLACES", "LUGARES")],
    ["photos", "▧", pickText(lang, "PHOTOS", "PHOTOS", "FOTOS")],
    ["performance", "↗", pickText(lang, "PERF", "PERF", "REND.")],
    ["community", "◉", pickText(lang, "COMMUNAUTÉ", "COMMUNITY", "COMUNIDAD")],
    ["plan", "◷", pickText(lang, "PLANIFIER", "PLAN", "PLANIFICAR")],
  ];

  return <div style={{ minHeight: "100dvh", width: "100%", maxWidth: 1440, margin: "0 auto", padding: "max(6px,env(safe-area-inset-top)) clamp(6px,1.2vw,16px) max(88px,calc(76px + env(safe-area-inset-bottom)))" }}>
    <header style={{ position: "sticky", top: 0, zIndex: 80, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", padding: "6px 0 9px", background: "linear-gradient(180deg,rgba(5,8,13,.98),rgba(5,8,13,.86) 78%,transparent)", backdropFilter: "blur(14px)" }}>
      <button className="btn" title={pickText(lang,"Retour","Back","Volver")} onClick={props.onBack} style={headerIcon}>←</button>
      <div style={{ minWidth: 0 }}><div style={{ color: accent, fontSize: 8, fontWeight: 1000, letterSpacing: .7 }}>{outdoorSportLabel(sport, lang).toUpperCase()} · {pickText(lang,"FICHE PARCOURS","ROUTE PAGE","FICHA DE RUTA")}</div><div style={{ marginTop: 2, color: "#fff", fontSize: "clamp(13px,2vw,18px)", fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{route.name}</div></div>
      <div style={{ display: "flex", gap: 6 }}><button className="btn" title={pickText(lang,"Favori","Favorite","Favorito")} onClick={props.onToggleFavorite} style={{ ...headerIcon, color: props.favorite ? accent : undefined, borderColor: props.favorite ? `${accent}60` : undefined }}>{props.favorite ? "★" : "☆"}</button><button className="btn" title={pickText(lang,"Fermer","Close","Cerrar")} onClick={props.onClose} style={headerIcon}>×</button></div>
    </header>

    <div style={{ display: "grid", gap: 10 }}>
      <OutdoorInteractiveRouteMap route={route} accent={accent} lang={lang} textSoft={textSoft} height="clamp(350px,58vh,680px)" activePointIndex={activeProfilePoint} onActivePointChange={setActiveProfilePoint} onFullscreen={() => setMapFullscreen(true)}/>

      <section style={{ padding: 11, borderRadius: 18, background: "linear-gradient(145deg,rgba(255,255,255,.045),rgba(5,8,13,.91))", border: `1px solid ${accent}28`, boxShadow: "0 16px 38px rgba(0,0,0,.26)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: "clamp(13px,2.4vw,19px)", lineHeight: 1.15, fontWeight: 1000 }}>{route.name}</div><div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}><Pill text={terrain.hasElevation ? terrainLabel(terrain.terrain, lang) : outdoorSportLabel(sport, lang)} accent={accent}/>{route.scout ? <Pill text={`✦ ${route.scout.score}%`} accent={accent}/> : null}{terrain.hasElevation ? <Pill text={`${pickText(lang,"DIFF.","DIFF.","DIF.")} ${terrain.difficultyScore}/100`} accent={accent} muted/> : null}</div></div>
          <button className="btn" onClick={() => setMapFullscreen(true)} title={pickText(lang,"Carte plein écran","Fullscreen map","Mapa a pantalla completa")} style={{ minWidth: 42, minHeight: 42, padding: 0, color: accent, borderColor: `${accent}55`, fontSize: 15 }}>⛶</button>
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}><Metric label={pickText(lang,"DISTANCE","DISTANCE","DISTANCIA")} value={formatDistance(route.distanceM)} accent={accent}/><Metric label="D+" value={terrain.hasElevation ? `+${Math.round(terrain.gainM)} m` : route.elevationGainM ? `+${Math.round(route.elevationGainM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"SOMMET","HIGH","CIMA")} value={terrain.maxAltitudeM != null ? `${Math.round(terrain.maxAltitudeM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"DURÉE","TIME","TIEMPO")} value={formatDuration(estimateOutdoorRouteDurationMs(route, sport))} accent={accent}/></div>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}><Action icon="▶" label={pickText(lang,"GUIDER","GUIDE","GUIAR")} accent={accent} active onClick={props.onGuide}/><Action icon={props.favorite ? "★" : "☆"} label={pickText(lang,"FAVORI","FAVORITE","FAVORITO")} accent={accent} active={props.favorite} onClick={props.onToggleFavorite}/><Action icon="◷" label={pickText(lang,"PLANIFIER","PLAN","PLANIFICAR")} accent={accent} onClick={() => setTab("plan")}/><Action icon="↗" label="MAPS" accent={accent} onClick={props.onOpenMaps}/></div>
      </section>

      <nav style={{ position: "sticky", top: 58, zIndex: 70, display: "flex", gap: 5, overflowX: "auto", padding: 6, borderRadius: 16, background: "rgba(6,9,14,.90)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,.075)", boxShadow: "0 12px 30px rgba(0,0,0,.24)" }}>
        {tabs.map(([id, icon, label]) => { const active = tab === id; return <button key={id} className="btn" title={label} onClick={() => setTab(id)} style={{ flex: active ? "1 0 auto" : "0 0 42px", minWidth: active ? 94 : 42, minHeight: 40, padding: active ? "4px 11px" : 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, borderRadius: 13, color: active ? accent : undefined, borderColor: active ? `${accent}5a` : "rgba(255,255,255,.06)", background: active ? `${accent}0d` : "rgba(255,255,255,.018)", fontSize: active ? 7.4 : 13, fontWeight: 1000, transition: "all .17s ease" }}><span>{icon}</span>{active ? <span style={{ whiteSpace: "nowrap" }}>{label}</span> : null}</button>; })}
      </nav>

      {tab === "overview" ? <div style={{ display: "grid", gap: 9 }}>
        <RunningSurface accent={accent}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><Metric label="D−" value={terrain.hasElevation ? `−${Math.round(terrain.lossM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"ALT. MIN","MIN ALT","ALT. MIN")} value={terrain.minAltitudeM != null ? `${Math.round(terrain.minAltitudeM)} m` : "—"} accent={accent}/><Metric label={pickText(lang,"PENTE MAX","MAX GRADE","PEND. MAX")} value={terrain.hasElevation ? `${terrain.maxGradePct.toFixed(1)}%` : "—"} accent={accent}/></div>
          <div style={{ marginTop: 10, color: accent, fontSize: 8.2, fontWeight: 1000 }}>{pickText(lang,"PROFIL ALTIMÉTRIQUE","ELEVATION PROFILE","PERFIL DE ELEVACIÓN")}</div><div style={{ marginTop: 6 }}><RunningElevationProfile points={route.route} accent={accent} textSoft={textSoft} height={150} lang={lang} interactive activePointIndex={activeProfilePoint} onActivePointChange={setActiveProfilePoint}/></div>
          {advice ? <div style={{ marginTop: 9, color: textSoft, fontSize: 8.1, lineHeight: 1.45 }}><b style={{ color: accent }}>{terrainLabel(terrain.terrain, lang)}</b> · {advice.text}</div> : null}
        </RunningSurface>
        <OutdoorRoutePlaceInfoPanel route={route} lang={lang} accent={accent} textSoft={textSoft} compact/>
      </div> : null}

      {tab === "places" ? <OutdoorRoutePlaceInfoPanel route={route} lang={lang} accent={accent} textSoft={textSoft}/> : null}
      {tab === "photos" ? <OutdoorRoutePhotoGallery route={route} lang={lang} accent={accent} textSoft={textSoft} onSearchImages={props.onSearchImages}/> : null}
      {tab === "performance" ? <div style={{ display: "grid", gap: 9 }}><RunningSurface accent={accent}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><Metric label={pickText(lang,"TENTATIVES","ATTEMPTS","INTENTOS")} value={String(props.localAttempts.length)} accent={accent}/><Metric label={pickText(lang,"MEILLEUR","BEST","MEJOR")} value={best ? formatDuration(best.elapsedMs) : "—"} accent={accent}/><Metric label={pickText(lang,"ALLURE MOY.","AVG PACE","RITMO MEDIO")} value={averagePace != null ? `${formatPace(averagePace)}/km` : "—"} accent={accent}/></div></RunningSurface><OutdoorRouteCommunityPanel route={route} localAttempts={props.localAttempts} lang={lang} accent={accent} textSoft={textSoft}/></div> : null}
      {tab === "community" ? <OutdoorRouteSocialPanel route={route} lang={lang} accent={accent} textSoft={textSoft}/> : null}
      {tab === "plan" ? <div style={{ display: "grid", gap: 9 }}><OutdoorRoutePlannerPanel route={route} lang={lang} accent={accent} textSoft={textSoft} onChange={setExtras}/>{["trail","hiking","walking","nordic-walking"].includes(sport) ? <OutdoorLongDistancePanel route={route} sport={sport} extras={extras} lang={lang} accent={accent} textSoft={textSoft}/> : null}<OutdoorOfflineRoutePanel route={route} sport={sport} extras={extras} lang={lang} accent={accent} textSoft={textSoft} onChange={props.onOfflineChanged}/></div> : null}
    </div>
  </div>;
}

function Pill({ text, accent, muted = false }: { text: string; accent: string; muted?: boolean }) { return <span style={{ padding: "4px 7px", borderRadius: 999, border: `1px solid ${muted ? "rgba(255,255,255,.10)" : `${accent}32`}`, color: muted ? "rgba(255,255,255,.7)" : accent, fontSize: 6.7, fontWeight: 1000 }}>{text}</span>; }
function Metric({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ minWidth: 0, padding: "8px 5px", textAlign: "center", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: "rgba(255,255,255,.43)", fontSize: 6, fontWeight: 1000, whiteSpace: "nowrap" }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: "clamp(8px,1.5vw,10px)", fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>; }
function Action({ icon, label, accent, active = false, onClick }: { icon: string; label: string; accent: string; active?: boolean; onClick: () => void }) { return <button className="btn" title={label} onClick={onClick} style={{ minHeight: 42, padding: "4px 5px", display: "grid", placeItems: "center", gap: 2, color: active ? accent : undefined, borderColor: active ? `${accent}55` : undefined, background: active ? `${accent}08` : undefined }}><span style={{ fontSize: 13 }}>{icon}</span><span style={{ fontSize: 6.2, fontWeight: 1000, whiteSpace: "nowrap" }}>{label}</span></button>; }
const headerIcon: React.CSSProperties = { minWidth: 40, minHeight: 40, padding: 0, borderRadius: 13, fontSize: 15, background: "rgba(255,255,255,.025)" };

import React from "react";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import { buildOutdoorLongDistancePlan, gpsIntervalSecForBatteryMode, loadOutdoorLongDistancePrefs, saveOutdoorLongDistancePrefs, type OutdoorBatteryMode, type OutdoorLongDistancePrefs } from "../../activity/outdoorLongDistance";
import type { OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import type { OutdoorRouteExtras } from "../../activity/outdoorRouteExtras";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";

type Props = { route: RunningRouteTemplate; sport: OutdoorPerformanceSport; extras: OutdoorRouteExtras; lang: string; accent: string; textSoft: string; onPrefsChange?: (prefs: OutdoorLongDistancePrefs) => void };

export default function OutdoorLongDistancePanel({ route, sport, extras, lang, accent, textSoft, onPrefsChange }: Props) {
  const plan = React.useMemo(() => buildOutdoorLongDistancePlan(route, sport, extras, lang), [extras, lang, route, sport]);
  const [prefs, setPrefs] = React.useState<OutdoorLongDistancePrefs>(() => loadOutdoorLongDistancePrefs(route.id, plan.expectedMs));
  const [roadbookOpen, setRoadbookOpen] = React.useState(false);
  const [batteryPct, setBatteryPct] = React.useState<number | null>(null);
  React.useEffect(() => { const next = loadOutdoorLongDistancePrefs(route.id, plan.expectedMs); setPrefs(next); onPrefsChange?.(next); }, [onPrefsChange, plan.expectedMs, route.id]);
  React.useEffect(() => {
    let active = true;
    let batteryRef: any = null;
    let updateRef: (() => void) | null = null;
    const getter = (navigator as any)?.getBattery;
    if (typeof getter !== "function") return;
    void getter.call(navigator).then((battery: any) => {
      if (!active) return;
      batteryRef = battery;
      updateRef = () => active && setBatteryPct(Number.isFinite(Number(battery?.level)) ? Math.round(Number(battery.level) * 100) : null);
      updateRef();
      battery?.addEventListener?.("levelchange", updateRef);
    }).catch(() => {});
    return () => {
      active = false;
      if (batteryRef && updateRef) batteryRef.removeEventListener?.("levelchange", updateRef);
    };
  }, []);
  if (!plan.enabled) return null;

  const copy = lang.startsWith("fr") ? {
    title: "MODE LONGUE DISTANCE", sub: "Roadbook indicatif pour préparer les sorties longues. Le profil batterie pilote réellement l’échantillonnage GPS Android.", time: "DURÉE EST.", stages: "ÉTAPES", battery: "PROFIL BATTERIE", reminders: "RAPPELS", hydration: "RAPPEL BOIRE", fuel: "RAPPEL RAVITO", off: "OFF", normal: "NORMAL", eco: "ÉCO", ultra: "ULTRA", roadbook: "ROADBOOK", gpsEvery: "GPS", openRoadbook: "OUVRIR LE ROADBOOK", close: "FERMER", batteryLevel: "BATTERIE",
  } : lang.startsWith("es") ? {
    title: "MODO LARGA DISTANCIA", sub: "Roadbook orientativo. El perfil de batería controla realmente el muestreo GPS Android.", time: "TIEMPO EST.", stages: "ETAPAS", battery: "PERFIL BATERÍA", reminders: "RECORDATORIOS", hydration: "RECORDAR BEBER", fuel: "RECORDAR COMER", off: "OFF", normal: "NORMAL", eco: "ECO", ultra: "ULTRA", roadbook: "ROADBOOK", gpsEvery: "GPS", openRoadbook: "ABRIR ROADBOOK", close: "CERRAR", batteryLevel: "BATERÍA",
  } : {
    title: "LONG DISTANCE MODE", sub: "Indicative roadbook. The battery profile now controls the native Android GPS sampling rate.", time: "EST. TIME", stages: "STAGES", battery: "BATTERY PROFILE", reminders: "REMINDERS", hydration: "DRINK REMINDER", fuel: "FUEL REMINDER", off: "OFF", normal: "NORMAL", eco: "ECO", ultra: "ULTRA", roadbook: "ROADBOOK", gpsEvery: "GPS", openRoadbook: "OPEN ROADBOOK", close: "CLOSE", batteryLevel: "BATTERY",
  };

  const update = (patch: Partial<OutdoorLongDistancePrefs>) => {
    const next = { ...prefs, ...patch, routeId: route.id, updatedAt: Date.now() };
    setPrefs(next);
    saveOutdoorLongDistancePrefs(next);
    onPrefsChange?.(next);
  };
  const batteryLabel = (mode: OutdoorBatteryMode) => mode === "ultra" ? copy.ultra : mode === "eco" ? copy.eco : copy.normal;

  return <RunningSurface accent={accent} style={{ marginTop: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .8 }}>🧭 {copy.title}</div><span style={{ padding: "3px 7px", borderRadius: 999, border: `1px solid ${accent}44`, color: accent, fontSize: 7, fontWeight: 1000 }}>{formatDistance(route.distanceM)}</span></div>
    <div style={{ marginTop: 4, color: textSoft, fontSize: 8, lineHeight: 1.4 }}>{copy.sub}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 8 }}>
      <Mini label={copy.time} value={formatDuration(plan.expectedMs)} accent={accent}/><Mini label={copy.stages} value={String(plan.stages.length)} accent={accent}/><Mini label={copy.battery} value={batteryLabel(prefs.batteryMode)} accent={accent}/><Mini label={batteryPct == null ? copy.gpsEvery : copy.batteryLevel} value={batteryPct == null ? `~${gpsIntervalSecForBatteryMode(prefs.batteryMode)} s` : `${batteryPct}%`} accent={batteryPct != null && batteryPct < 20 ? "#ff756d" : accent}/>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, marginTop: 8 }}>{(["normal","eco","ultra"] as OutdoorBatteryMode[]).map((mode) => <button key={mode} className="btn" onClick={() => update({ batteryMode: mode })} style={{ minHeight: 31, padding: 4, fontSize: 7.2, fontWeight: 1000, color: prefs.batteryMode === mode ? accent : undefined, borderColor: prefs.batteryMode === mode ? `${accent}66` : undefined }}>{batteryLabel(mode)}</button>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
      <Setting label={copy.hydration} value={prefs.hydrationReminderMin} values={[0,30,45,60]} off={copy.off} onChange={(value) => update({ hydrationReminderMin: value as OutdoorLongDistancePrefs["hydrationReminderMin"] })}/>
      <Setting label={copy.fuel} value={prefs.fuelReminderMin} values={[0,45,60,75]} off={copy.off} onChange={(value) => update({ fuelReminderMin: value as OutdoorLongDistancePrefs["fuelReminderMin"] })}/>
    </div>
    {plan.stages.length ? <div style={{ marginTop: 9 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: textSoft, fontSize: 7.3, fontWeight: 1000 }}>{copy.roadbook}</div><button className="btn" onClick={() => setRoadbookOpen(true)} style={{ minHeight: 30, padding: "4px 8px", color: accent, borderColor: `${accent}44`, fontSize: 7.2, fontWeight: 1000 }}>{copy.openRoadbook}</button></div><div style={{ display: "grid", gap: 5, marginTop: 5 }}>{plan.stages.slice(0, 5).map((stage) => <div key={stage.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 7, alignItems: "center", padding: "7px 8px", borderRadius: 11, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.024)" }}><div style={{ fontSize: 15 }}>{stage.icon}</div><div><div style={{ fontSize: 8.3, fontWeight: 1000 }}>{stage.name}</div><div style={{ marginTop: 2, fontSize: 7.1, color: textSoft }}>{formatDistance(stage.distanceM)}</div></div><div style={{ color: accent, fontSize: 7.7, fontWeight: 1000 }}>+{formatDuration(stage.estimatedElapsedMs)}</div></div>)}</div></div> : null}
    {roadbookOpen ? <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 240, background: "rgba(2,4,8,.94)", backdropFilter: "blur(16px)", padding: "calc(env(safe-area-inset-top,0px) + 16px) 14px calc(env(safe-area-inset-bottom,0px) + 16px)", overflowY: "auto" }}><div style={{ maxWidth: 620, margin: "0 auto" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}><div><div style={{ color: accent, fontSize: 10, fontWeight: 1000, letterSpacing: .8 }}>🧭 {copy.roadbook}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8 }}>{route.name} · {formatDistance(route.distanceM)} · {formatDuration(plan.expectedMs)}</div></div><button className="btn" onClick={() => setRoadbookOpen(false)} style={{ minHeight: 38, paddingInline: 12, fontWeight: 1000 }}>{copy.close}</button></div><div style={{ display: "grid", gap: 8 }}>{plan.stages.map((stage, index) => <RunningSurface key={stage.id} accent={index === plan.stages.length - 1 ? "#71ff9a" : accent} padding={12}><div style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center" }}><div style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}28`, fontSize: 20 }}>{stage.icon}</div><div><div style={{ fontSize: 10, fontWeight: 1000 }}>{stage.name}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8 }}>{formatDistance(stage.distanceM)}</div></div><div style={{ color: accent, fontSize: 10, fontWeight: 1000 }}>+{formatDuration(stage.estimatedElapsedMs)}</div></div></RunningSurface>)}</div></div></div> : null}
  </RunningSurface>;
}

function Mini({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ padding: "8px 6px", borderRadius: 11, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)", minWidth: 0 }}><div style={{ fontSize: 6.8, opacity: .55, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 10, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>; }
function Setting({ label, value, values, off, onChange }: { label: string; value: number; values: number[]; off: string; onChange: (value: number) => void }) { return <label style={{ display: "grid", gap: 4, color: "inherit", fontSize: 7.2, fontWeight: 1000 }}><span style={{ opacity: .58 }}>{label}</span><select value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.24)", color: "inherit", padding: "0 7px", fontSize: 8 }}>{values.map((item) => <option key={item} value={item}>{item ? `${item} min` : off}</option>)}</select></label>; }

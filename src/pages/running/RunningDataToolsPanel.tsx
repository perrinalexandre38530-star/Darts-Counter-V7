import React from "react";
import Section from "../../components/Section";
import { formatDistance, formatDuration } from "../../activity/activityMath";
import { saveActivity } from "../../activity/activityStore";
import { downloadGpx, parseRunningImport } from "../../activity/runningInterop";
import { loadRunningPrivacyPrefs, saveRunningPrivacyPrefs, type RunningPrivacyPrefs, type RunningPrivacyRadiusM } from "../../activity/runningPrivacy";
import { upsertRunningRoute } from "../../activity/runningRoutes";
import type { ActivityRecord } from "../../activity/activityTypes";
import type { OutdoorPerformanceSport } from "../../activity/outdoorPerformance";

type Props = {
  activities: ActivityRecord[];
  lang: string;
  accent: string;
  textSoft: string;
  onActivitiesChanged: () => void | Promise<void>;
  selectedSport?: OutdoorPerformanceSport;
};

export default function RunningDataToolsPanel({ activities, lang, accent, textSoft, onActivitiesChanged, selectedSport = "running" }: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [prefs, setPrefs] = React.useState<RunningPrivacyPrefs>(() => loadRunningPrivacyPrefs());

  const copy = lang === "fr" ? {
    title: "DONNÉES & CONFIDENTIALITÉ",
    import: "IMPORTER GPX / TCX",
    importSub: "Importe une ancienne activité ou un parcours provenant d'une autre application ou montre.",
    privacy: "ZONE PRIVÉE EXPORT",
    privacySub: "Le fichier local complet reste intact. Seuls les fichiers exportés masquent le départ et l'arrivée.",
    timestamps: "Horodatage GPX",
    exports: "EXPORTS RÉCENTS",
    export: "GPX",
    none: "Aucune sortie GPS exportable.",
    full: "Aucune",
    importedActivity: "Activité importée",
    importedRoute: "Parcours importé",
    failed: "Import impossible",
    indoorImport: "Le tapis roulant est une activité indoor sans tracé GPS. Sélectionne Running, Trail, Randonnée ou Marche pour importer un GPX/TCX.",
  } : lang === "es" ? {
    title: "DATOS Y PRIVACIDAD",
    import: "IMPORTAR GPX / TCX",
    importSub: "Importa una actividad anterior o una ruta de otra aplicación o reloj.",
    privacy: "ZONA PRIVADA DE EXPORTACIÓN",
    privacySub: "La actividad local completa permanece intacta. Solo los archivos exportados ocultan salida y llegada.",
    timestamps: "Marcas de tiempo GPX",
    exports: "EXPORTACIONES RECIENTES",
    export: "GPX",
    none: "No hay carreras GPS exportables.",
    full: "Ninguna",
    importedActivity: "Actividad importada",
    importedRoute: "Ruta importada",
    failed: "Importación imposible",
    indoorImport: "La cinta es una actividad indoor sin ruta GPS. Selecciona Running, Trail, Senderismo o Caminata para importar GPX/TCX.",
  } : {
    title: "DATA & PRIVACY",
    import: "IMPORT GPX / TCX",
    importSub: "Import a previous activity or route from another app or watch.",
    privacy: "EXPORT PRIVACY ZONE",
    privacySub: "Your full local activity stays untouched. Only exported files hide the start and finish.",
    timestamps: "GPX timestamps",
    exports: "RECENT EXPORTS",
    export: "GPX",
    none: "No exportable GPS runs yet.",
    full: "None",
    importedActivity: "Activity imported",
    importedRoute: "Route imported",
    failed: "Import failed",
    indoorImport: "Treadmill is an indoor activity without a GPS route. Select Running, Trail, Hiking or Walking to import GPX/TCX.",
  };

  const updatePrefs = (next: RunningPrivacyPrefs) => {
    setPrefs(next);
    saveRunningPrivacyPrefs(next);
  };

  const onImport = async (file: File | null) => {
    if (!file) return;
    if (selectedSport === "treadmill") { setStatus(copy.indoorImport); if (inputRef.current) inputRef.current.value = ""; return; }
    setBusy(true);
    setStatus("");
    try {
      if (file.size > 12_000_000) throw new Error("12 Mo max");
      const result = parseRunningImport(await file.text(), file.name);
      if (result.kind === "activity") {
        result.activity.sport = selectedSport;
        await saveActivity(result.activity);
        await onActivitiesChanged();
        setStatus(`${copy.importedActivity} · ${formatDistance(result.activity.distanceM)} · ${formatDuration(result.activity.elapsedMs)}${result.warnings.length ? ` · ${result.warnings.join(" ")}` : ""}`);
      } else {
        result.route.sport = selectedSport;
        upsertRunningRoute(result.route);
        setStatus(`${copy.importedRoute} · ${formatDistance(result.route.distanceM)}${result.warnings.length ? ` · ${result.warnings.join(" ")}` : ""}`);
      }
    } catch (error: any) {
      setStatus(`${copy.failed}: ${error?.message || error}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const exportable = activities.filter((activity) => Array.isArray(activity.route) && activity.route.length >= 2).slice(0, 6);

  return <div style={{ marginTop: 12 }}><Section title={copy.title}>
    <input ref={inputRef} type="file" accept=".gpx,.tcx,application/gpx+xml,application/xml,text/xml" style={{ display: "none" }} onChange={(event) => void onImport(event.target.files?.[0] || null)} />

    <div className="card" style={{ padding: 11, display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 9, alignItems: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}30`, fontSize: 21 }}>⇪</div>
      <div><div style={{ fontSize: 10.5, fontWeight: 1000 }}>{copy.import}</div><div style={{ marginTop: 3, fontSize: 8.6, lineHeight: 1.35, color: textSoft }}>{copy.importSub}</div></div>
      <button className="btn" disabled={busy || selectedSport === "treadmill"} onClick={() => inputRef.current?.click()} style={{ minHeight: 36, fontSize: 8.5, fontWeight: 1000 }}>{busy ? "…" : copy.import}</button>
    </div>

    {selectedSport === "treadmill" ? <div style={{ marginTop: 7, padding: "8px 9px", borderRadius: 11, border: `1px solid ${accent}28`, background: `${accent}0b`, color: textSoft, fontSize: 8.8, lineHeight: 1.4 }}>🏃‍♂️ {copy.indoorImport}</div> : null}{status ? <div style={{ marginTop: 7, padding: "8px 9px", borderRadius: 11, border: `1px solid ${accent}28`, background: `${accent}0b`, color: textSoft, fontSize: 8.8, lineHeight: 1.4 }}>{status}</div> : null}

    <div className="card" style={{ marginTop: 8, padding: 11 }}>
      <div style={{ fontSize: 9.5, fontWeight: 1000 }}>{copy.privacy}</div>
      <div style={{ marginTop: 3, color: textSoft, fontSize: 8.4, lineHeight: 1.4 }}>{copy.privacySub}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "center", marginTop: 9 }}>
        <select value={prefs.hideStartEndM} onChange={(event) => updatePrefs({ ...prefs, hideStartEndM: Number(event.target.value) as RunningPrivacyRadiusM })} style={{ minHeight: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.24)", color: "inherit", padding: "0 9px", fontSize: 9 }}>
          <option value={0}>{copy.full}</option><option value={200}>200 m</option><option value={500}>500 m</option><option value={1000}>1 km</option>
        </select>
        <button className="btn" onClick={() => updatePrefs({ ...prefs, includeTimestampsInExport: !prefs.includeTimestampsInExport })} style={{ minHeight: 38, fontSize: 8.5, fontWeight: 1000, color: prefs.includeTimestampsInExport ? accent : undefined, borderColor: prefs.includeTimestampsInExport ? `${accent}66` : undefined }}>{copy.timestamps}: {prefs.includeTimestampsInExport ? "ON" : "OFF"}</button>
      </div>
    </div>

    <div style={{ marginTop: 9, fontSize: 8.5, color: textSoft, fontWeight: 1000 }}>{copy.exports}</div>
    {exportable.length ? <div style={{ display: "grid", gap: 7, marginTop: 7 }}>{exportable.map((activity) => <div key={activity.id} className="card" style={{ padding: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "center" }}><div><div style={{ fontSize: 9.5, fontWeight: 1000 }}>{activity.title || "RUNNING"}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.2 }}>{formatDistance(activity.distanceM)} · {formatDuration(activity.elapsedMs)} · {String(activity.source || "gps").toUpperCase()}</div></div><button className="btn" onClick={() => { try { downloadGpx(activity, prefs); setStatus(`${copy.export}: ${activity.title || "Running"}`); } catch (error: any) { setStatus(error?.message || String(error)); } }} style={{ minHeight: 34, padding: "4px 9px", color: accent, borderColor: `${accent}55`, fontSize: 8.5, fontWeight: 1000 }}>{copy.export}</button></div>)}</div> : <div style={{ padding: "12px 2px 2px", color: textSoft, fontSize: 8.8 }}>{copy.none}</div>}
  </Section></div>;
}

import React from "react";
import { RunningGlyph, RunningSurface, type RunningGlyphName } from "./RunningUi";
import { getHealthConnectStatus, openHealthConnectSettings, requestHealthConnectWorkoutPermissions, type HealthConnectStatus } from "../../activity/healthConnectBridge";
import { getLastHealthConnectSyncAt, syncHealthConnectWorkouts } from "../../activity/healthConnectSync";
import { exportLocalWorkoutsToHealthConnect, getLastHealthConnectExportAt } from "../../activity/healthConnectExportSync";
import { connectHeartRateSensor, connectRunningCadenceSensor, connectTreadmillSensor, detectFitnessConnectorCapabilities, disconnectRunningSensor, getRunningSensorSnapshot, subscribeRunningSensors, type RunningSensorKind, type RunningSensorSnapshot } from "../../activity/runningSensors";
import { getGarminConnectPrepStatus, openGarminConnectPortal } from "../../activity/garminConnectPrep";

export default function RunningConnectionsPanel({ lang, accent, textSoft, compact = false, onActivitiesChanged }: { lang: string; accent: string; textSoft: string; compact?: boolean; onActivitiesChanged?: () => void | Promise<void> }) {
  const [sensor, setSensor] = React.useState<RunningSensorSnapshot>(() => getRunningSensorSnapshot());
  const [busy, setBusy] = React.useState<RunningSensorKind | null>(null);
  const [message, setMessage] = React.useState("");
  const [messageKind, setMessageKind] = React.useState<"ok" | "error">("ok");
  const [healthStatus, setHealthStatus] = React.useState<HealthConnectStatus | null>(null);
  const [healthBusy, setHealthBusy] = React.useState(false);
  const [syncBusy, setSyncBusy] = React.useState(false);
  const [exportBusy, setExportBusy] = React.useState(false);
  const [lastSyncAt, setLastSyncAt] = React.useState<number | null>(() => getLastHealthConnectSyncAt());
  const [lastExportAt, setLastExportAt] = React.useState<number | null>(() => getLastHealthConnectExportAt());
  const capabilities = React.useMemo(() => detectFitnessConnectorCapabilities(), []);
  const garmin = React.useMemo(() => getGarminConnectPrepStatus(), []);
  React.useEffect(() => subscribeRunningSensors(setSensor), []);
  React.useEffect(() => { if (!capabilities.healthConnectBridge) return; void getHealthConnectStatus().then(setHealthStatus); }, [capabilities.healthConnectBridge]);

  const copy = lang === "fr" ? {
    title: "CONNEXIONS & CAPTEURS",
    sub: "Connecte tes capteurs sportifs et synchronise tes séances avec Health Connect. Les autorisations sont demandées uniquement pour l’import ou l’export choisi.",
    hr: "CEINTURE CARDIO", foot: "FOOTPOD / CADENCE", treadmill: "TAPIS FTMS",
    connect: "CONNECTER", disconnect: "DÉCONNECTER", live: "LIVE", unavailable: "BLE NON DISPONIBLE",
    health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "FICHIERS SPORT",
    native: "Bridge natif requis", detected: "Bridge détecté", cloud: "API cloud / OAuth requis", configured: "API configurée", filesReady: "FIT / GPX / TCX actifs",
    nativeGps: "GPS ANDROID NATIF", screenOff: "Écran éteint / arrière-plan",
    importGrant: "AUTORISER IMPORT", exportGrant: "AUTORISER EXPORT", manage: "GÉRER",
    importReady: "IMPORT ✓", exportReady: "EXPORT ✓", pending: "À AUTORISER",
    hcAvailable: "Disponible", bpm: "bpm", spm: "pas/min",
    sync: "IMPORTER 30 J", syncDone: "Import Health Connect terminé", lastSync: "Dernier import",
    routesMissing: "parcours protégés", routesOk: "Parcours autorisés", routesOff: "Parcours non autorisés",
    export: "ENVOYER MES SORTIES", exportDone: "Export Health Connect terminé", lastExport: "Dernier envoi",
    disclosure: "Import : séances, parcours, distance, vitesse, dénivelé, fréquence cardiaque et cadence. Export : uniquement les données réellement enregistrées par MULTISPORTS SCORING ; cardio et cadence ne sont envoyés que lorsqu’un capteur les a mesurés.",
  } : lang === "es" ? {
    title: "CONEXIONES Y SENSORES",
    sub: "Conecta tus sensores deportivos y sincroniza tus sesiones con Health Connect. Los permisos se solicitan solo para la importación o exportación elegida.",
    hr: "BANDA CARDÍACA", foot: "FOOTPOD / CADENCIA", treadmill: "CINTA FTMS",
    connect: "CONECTAR", disconnect: "DESCONECTAR", live: "LIVE", unavailable: "BLE NO DISPONIBLE",
    health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "ARCHIVOS DEPORTIVOS",
    native: "Requiere puente nativo", detected: "Puente detectado", cloud: "Requiere API cloud / OAuth", configured: "API configurada", filesReady: "FIT / GPX / TCX activos",
    nativeGps: "GPS ANDROID NATIVO", screenOff: "Pantalla apagada / segundo plano",
    importGrant: "AUTORIZAR IMPORTACIÓN", exportGrant: "AUTORIZAR EXPORTACIÓN", manage: "GESTIONAR",
    importReady: "IMPORTACIÓN ✓", exportReady: "EXPORTACIÓN ✓", pending: "POR AUTORIZAR",
    hcAvailable: "Disponible", bpm: "bpm", spm: "pas/min",
    sync: "IMPORTAR 30 D", syncDone: "Importación Health Connect terminada", lastSync: "Última importación",
    routesMissing: "rutas protegidas", routesOk: "Rutas autorizadas", routesOff: "Rutas no autorizadas",
    export: "ENVIAR MIS ACTIVIDADES", exportDone: "Exportación Health Connect terminada", lastExport: "Último envío",
    disclosure: "Importación: sesiones, rutas, distancia, velocidad, desnivel, frecuencia cardíaca y cadencia. Exportación: solo datos realmente registrados por MULTISPORTS SCORING; el pulso y la cadencia se envían únicamente cuando un sensor los ha medido.",
  } : {
    title: "CONNECTIONS & SENSORS",
    sub: "Connect your sport sensors and sync workouts with Health Connect. Permissions are requested only for the import or export action you choose.",
    hr: "HEART RATE STRAP", foot: "FOOTPOD / CADENCE", treadmill: "FTMS TREADMILL",
    connect: "CONNECT", disconnect: "DISCONNECT", live: "LIVE", unavailable: "BLE UNAVAILABLE",
    health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "SPORT FILES",
    native: "Native bridge required", detected: "Bridge detected", cloud: "Cloud API / OAuth required", configured: "API configured", filesReady: "FIT / GPX / TCX active",
    nativeGps: "NATIVE ANDROID GPS", screenOff: "Screen-off / background",
    importGrant: "AUTHORIZE IMPORT", exportGrant: "AUTHORIZE EXPORT", manage: "MANAGE",
    importReady: "IMPORT ✓", exportReady: "EXPORT ✓", pending: "AUTHORIZE",
    hcAvailable: "Available", bpm: "bpm", spm: "steps/min",
    sync: "IMPORT 30 DAYS", syncDone: "Health Connect import complete", lastSync: "Last import",
    routesMissing: "protected routes", routesOk: "Routes allowed", routesOff: "Routes not allowed",
    export: "SEND MY WORKOUTS", exportDone: "Health Connect export complete", lastExport: "Last export",
    disclosure: "Import: workouts, routes, distance, speed, elevation, heart rate and cadence. Export: only data actually recorded by MULTISPORTS SCORING; heart rate and cadence are sent only when a sensor measured them.",
  };

  const sensorDevices = Array.isArray(sensor.devices) ? sensor.devices : [];
  const connected = (kind: RunningSensorKind) => sensorDevices.some((d) => d.kind === kind && d.connected);
  const deviceName = (kind: RunningSensorKind) => sensorDevices.find((d) => d.kind === kind)?.name || "";
  const action = async (kind: RunningSensorKind) => {
    setMessage(""); setMessageKind("ok"); setBusy(kind);
    try {
      if (connected(kind)) await disconnectRunningSensor(kind);
      else if (kind === "heart-rate") await connectHeartRateSensor();
      else if (kind === "fitness-machine-treadmill") await connectTreadmillSensor();
      else await connectRunningCadenceSensor();
    } catch (error: any) { setMessageKind("error"); setMessage(error?.message || String(error)); }
    finally { setBusy(null); }
  };

  const refreshHealthStatus = async () => {
    const next = await getHealthConnectStatus();
    setHealthStatus(next);
    return next;
  };

  const grantHealth = async (mode: "import" | "export") => {
    if (!capabilities.healthConnectBridge) return null;
    setHealthBusy(true); setMessage(""); setMessageKind("ok");
    try {
      await requestHealthConnectWorkoutPermissions(mode);
      return await refreshHealthStatus();
    } catch (error: any) {
      setMessageKind("error"); setMessage(error?.message || String(error));
      return null;
    } finally {
      setHealthBusy(false);
    }
  };

  const healthAction = async () => {
    if (!capabilities.healthConnectBridge) return;
    setHealthBusy(true); setMessage(""); setMessageKind("ok");
    try {
      await openHealthConnectSettings();
      await refreshHealthStatus();
    } catch (error: any) { setMessageKind("error"); setMessage(error?.message || String(error)); }
    finally { setHealthBusy(false); }
  };

  const syncHealth = async () => {
    if (!capabilities.healthConnectBridge) return;
    let status = healthStatus;
    if (!status?.importPermissionsGranted) {
      status = await grantHealth("import");
      if (!status?.importPermissionsGranted) return;
    }
    setSyncBusy(true); setMessage(""); setMessageKind("ok");
    try {
      const report = await syncHealthConnectWorkouts(30);
      setLastSyncAt(report.lastSyncAt);
      await onActivitiesChanged?.();
      await refreshHealthStatus();
      const detail = `${report.imported} + ${report.updated} ↻${report.routesMissing ? ` · ${report.routesMissing} ${copy.routesMissing}` : ""}`;
      setMessage(`${copy.syncDone} · ${detail}`);
    } catch (error: any) {
      setMessageKind("error");
      setMessage(error?.message || String(error));
    } finally {
      setSyncBusy(false);
    }
  };

  const exportHealth = async () => {
    if (!capabilities.healthConnectBridge) return;
    let status = healthStatus;
    if (!status?.exportPermissionsGranted) {
      status = await grantHealth("export");
      if (!status?.exportPermissionsGranted) return;
    }
    setExportBusy(true); setMessage(""); setMessageKind("ok");
    try {
      const report = await exportLocalWorkoutsToHealthConnect(30);
      setLastExportAt(report.lastExportAt);
      await onActivitiesChanged?.();
      await refreshHealthStatus();
      const metrics = [
        report.routesWritten ? `${report.routesWritten} GPS` : "",
        report.heartRateSamplesWritten ? `${report.heartRateSamplesWritten} HR` : "",
        report.speedSamplesWritten ? `${report.speedSamplesWritten} VIT` : "",
        report.cadenceSamplesWritten ? `${report.cadenceSamplesWritten} CAD` : "",
      ].filter(Boolean).join(" · ");
      const detail = `${report.exported} ✓${report.failed ? ` · ${report.failed} ✕` : ""}${metrics ? ` · ${metrics}` : ""}`;
      setMessage(`${copy.exportDone} · ${detail}${report.errors.length ? ` · ${report.errors[0]}` : ""}`);
    } catch (error: any) {
      setMessageKind("error"); setMessage(error?.message || String(error));
    } finally { setExportBusy(false); }
  };

  const sensorCard = (kind: RunningSensorKind, icon: RunningGlyphName, title: string, value: string) => {
    const on = connected(kind);
    return <RunningSurface accent={accent} active={on} padding={compact ? 10 : 12}>
      <div style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 9, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}28`, color: accent }}><RunningGlyph name={icon} size={19}/></div>
        <div><div style={{ fontSize: 9.5, fontWeight: 1000 }}>{title}</div><div style={{ marginTop: 3, color: on ? accent : textSoft, fontSize: 8.3 }}>{on ? `${copy.live}${deviceName(kind) ? ` · ${deviceName(kind)}` : ""}${value ? ` · ${value}` : ""}` : capabilities.webBluetooth ? "BLE" : copy.unavailable}</div></div>
        <button className="btn" disabled={busy === kind || !capabilities.webBluetooth} onClick={() => void action(kind)} style={{ minHeight: 34, padding: "4px 8px", fontSize: 7.8, fontWeight: 1000, color: on ? accent : undefined, borderColor: on ? `${accent}66` : undefined }}>{busy === kind ? "…" : on ? copy.disconnect : copy.connect}</button>
      </div>
    </RunningSurface>;
  };

  return <div>
    {!compact ? <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 5 }}>{copy.title}</div> : null}
    {!compact ? <div style={{ color: textSoft, fontSize: 8.6, lineHeight: 1.45, marginBottom: 9 }}>{copy.sub}</div> : null}
    <div style={{ display: "grid", gap: 7 }}>
      {sensorCard("heart-rate", "heart", copy.hr, sensor.heartRateBpm ? `${sensor.heartRateBpm} ${copy.bpm}` : "")}
      {sensorCard("running-speed-cadence", "footpod", copy.foot, [sensor.cadenceSpm ? `${sensor.cadenceSpm} ${copy.spm}` : "", sensor.sensorSpeedMps ? `${(sensor.sensorSpeedMps * 3.6).toFixed(1)} km/h` : ""].filter(Boolean).join(" · "))}
      {sensorCard("fitness-machine-treadmill", "sport-treadmill", copy.treadmill, [sensor.treadmillSpeedMps ? `${(sensor.treadmillSpeedMps * 3.6).toFixed(1)} km/h` : "", sensor.treadmillDistanceM != null ? `${(sensor.treadmillDistanceM / 1000).toFixed(2)} km` : "", sensor.inclinePercent != null ? `${sensor.inclinePercent.toFixed(1)}%` : ""].filter(Boolean).join(" · "))}
    </div>
    {message ? <div style={{ marginTop: 7, padding: 8, borderRadius: 10, border: `1px solid ${messageKind === "error" ? "rgba(255,120,120,.26)" : `${accent}38`}`, color: messageKind === "error" ? "#ffb0b0" : accent, background: messageKind === "error" ? "rgba(255,90,90,.045)" : `${accent}08`, fontSize: 8.2 }}>{message}</div> : null}
    {!compact ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
      <RunningSurface accent={accent} active={!!healthStatus?.available} padding={10}>
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 7, alignItems: "center" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: `${accent}10`, fontSize: 15 }}>♥</div>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 1000 }}>{copy.health}</div>
            <div style={{ marginTop: 2, fontSize: 7.4, opacity: .72, lineHeight: 1.35 }}>
              {!capabilities.healthConnectBridge
                ? copy.native
                : !healthStatus?.available
                  ? healthStatus?.status === "update-required" ? "Mise à jour requise" : copy.detected
                  : `${copy.hcAvailable} · ${healthStatus?.importPermissionsGranted ? copy.importReady : `IMPORT ${copy.pending}`} · ${healthStatus?.exportPermissionsGranted ? copy.exportReady : `EXPORT ${copy.pending}`}`}
            </div>
            <div style={{ marginTop: 4, fontSize: 7.1, opacity: .58, lineHeight: 1.35 }}>{copy.disclosure}</div>
            {healthStatus?.importPermissionsGranted ? <div style={{ marginTop: 3, fontSize: 7.1, color: accent }}>{healthStatus?.exerciseRoutesGranted ? copy.routesOk : copy.routesOff}</div> : null}
            {lastSyncAt ? <div style={{ marginTop: 3, fontSize: 7.2, color: accent }}>{copy.lastSync}: {new Date(lastSyncAt).toLocaleString()}</div> : null}
            {lastExportAt ? <div style={{ marginTop: 2, fontSize: 7.2, color: accent }}>{copy.lastExport}: {new Date(lastExportAt).toLocaleString()}</div> : null}
          </div>
        </div>
        {capabilities.healthConnectBridge ? <div style={{ display: "grid", gridTemplateColumns: (healthStatus?.importPermissionsGranted || healthStatus?.exportPermissionsGranted) ? "repeat(3,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", gap: 5, marginTop: 7 }}>
          <button className="btn" onClick={() => void syncHealth()} disabled={healthBusy || syncBusy || exportBusy || !healthStatus?.available} style={{ minHeight: 32, padding: "4px 5px", fontSize: 6.7, fontWeight: 1000, color: healthStatus?.available ? accent : undefined, borderColor: healthStatus?.available ? `${accent}55` : undefined }}>{healthBusy && !healthStatus?.importPermissionsGranted ? "…" : healthStatus?.importPermissionsGranted ? (syncBusy ? "…" : copy.sync) : copy.importGrant}</button>
          <button className="btn" onClick={() => void exportHealth()} disabled={healthBusy || syncBusy || exportBusy || !healthStatus?.available} style={{ minHeight: 32, padding: "4px 5px", fontSize: 6.5, fontWeight: 1000, color: healthStatus?.available ? accent : undefined, borderColor: healthStatus?.available ? `${accent}55` : undefined }}>{healthBusy && !healthStatus?.exportPermissionsGranted ? "…" : healthStatus?.exportPermissionsGranted ? (exportBusy ? "…" : copy.export) : copy.exportGrant}</button>
          {(healthStatus?.importPermissionsGranted || healthStatus?.exportPermissionsGranted) ? <button className="btn" onClick={healthAction} disabled={healthBusy || syncBusy || exportBusy} style={{ minHeight: 32, padding: "4px 5px", fontSize: 6.8, fontWeight: 1000 }}>{copy.manage}</button> : null}
        </div> : null}
      </RunningSurface>
      <Connector icon="📍" title={copy.nativeGps} status={capabilities.nativeTrackingBridge ? copy.screenOff : copy.native} accent={accent} active={capabilities.nativeTrackingBridge}/>
      <Connector icon="" title={copy.apple} status={capabilities.healthKitBridge ? copy.detected : copy.native} accent={accent} active={capabilities.healthKitBridge}/>
      <Connector icon="⌚" title={copy.garmin} status={garmin.configured ? `${copy.configured}${garmin.secure ? "" : " · HTTPS requis"}` : copy.cloud} accent={accent} active={garmin.configured && garmin.secure} action={garmin.configured && garmin.secure ? (lang === "fr" ? "OUVRIR CONNEXION" : lang === "es" ? "ABRIR CONEXIÓN" : "OPEN CONNECTION") : undefined} onClick={garmin.configured && garmin.secure ? () => { try { openGarminConnectPortal(); } catch (error: any) { setMessageKind("error"); setMessage(error?.message || String(error)); } } : undefined}/>
      <Connector icon="⇄" title={copy.files} status={copy.filesReady} accent={accent} active/>
    </div> : null}
  </div>;
}

function Connector({ icon, title, status, accent, active, action, busy, onClick }: { icon: string; title: string; status: string; accent: string; active: boolean; action?: string; busy?: boolean; onClick?: () => void }) {
  return <RunningSurface accent={accent} active={active} padding={10}><div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 7, alignItems: "center" }}><div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: `${accent}10`, fontSize: 15 }}>{icon}</div><div><div style={{ fontSize: 8.5, fontWeight: 1000 }}>{title}</div><div style={{ marginTop: 2, fontSize: 7.4, opacity: .55, lineHeight: 1.25 }}>{status}</div></div></div>{onClick && action ? <button className="btn" onClick={onClick} disabled={busy} style={{ width: "100%", minHeight: 30, marginTop: 7, padding: "4px 7px", fontSize: 7.5, fontWeight: 1000, color: active ? accent : undefined, borderColor: active ? `${accent}55` : undefined }}>{busy ? "…" : action}</button> : null}</RunningSurface>;
}

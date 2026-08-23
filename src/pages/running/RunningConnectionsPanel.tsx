import React from "react";
import { RunningSurface } from "./RunningUi";
import { getHealthConnectStatus, openHealthConnectSettings, requestHealthConnectWorkoutPermissions, type HealthConnectStatus } from "../../activity/healthConnectBridge";
import { getLastHealthConnectSyncAt, syncHealthConnectWorkouts } from "../../activity/healthConnectSync";
import { exportLocalWorkoutsToHealthConnect, getLastHealthConnectExportAt } from "../../activity/healthConnectExportSync";
import { connectHeartRateSensor, connectRunningCadenceSensor, connectTreadmillSensor, detectFitnessConnectorCapabilities, disconnectRunningSensor, getRunningSensorSnapshot, subscribeRunningSensors, type RunningSensorKind, type RunningSensorSnapshot } from "../../activity/runningSensors";

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
  React.useEffect(() => subscribeRunningSensors(setSensor), []);
  React.useEffect(() => { if (!capabilities.healthConnectBridge) return; void getHealthConnectStatus().then(setHealthStatus); }, [capabilities.healthConnectBridge]);

  const copy = lang === "fr" ? {
    title: "CONNEXIONS & CAPTEURS", sub: "Capteurs BLE et synchronisation Health Connect disponibles pour les tests internes. Garmin/FIT restent en phase d’intégration.", hr: "CEINTURE CARDIO", foot: "FOOTPOD / CADENCE", treadmill: "TAPIS FTMS", connect: "CONNECTER", disconnect: "DÉCONNECTER", live: "LIVE", unavailable: "BLE NON DISPONIBLE", health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "FICHIERS SPORT", native: "Bridge natif requis", detected: "Bridge détecté", cloud: "API cloud / OAuth requis", configured: "API configurée", filesReady: "GPX / TCX actifs · FIT à câbler", nativeGps: "GPS ANDROID NATIF", screenOff: "Écran éteint / arrière-plan", grant: "AUTORISER", manage: "GÉRER", hcReady: "Autorisations entraînement accordées", hcAvailable: "Disponible · autorisations à accorder", bpm: "bpm", spm: "pas/min", sync: "SYNCHRONISER 30 J", syncDone: "Synchronisation terminée", lastSync: "Dernière synchro", routesMissing: "parcours protégés", routesOk: "Parcours autorisés", routesOff: "Parcours à autoriser dans Health Connect", export: "ENVOYER MES SORTIES", exportDone: "Export Health Connect terminé", lastExport: "Dernier envoi",
  } : lang === "es" ? {
    title: "CONEXIONES Y SENSORES", sub: "Sensores BLE y sincronización Health Connect disponibles para pruebas internas. Garmin/FIT siguen en fase de integración.", hr: "BANDA CARDÍACA", foot: "FOOTPOD / CADENCIA", treadmill: "CINTA FTMS", connect: "CONECTAR", disconnect: "DESCONECTAR", live: "LIVE", unavailable: "BLE NO DISPONIBLE", health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "ARCHIVOS DEPORTIVOS", native: "Requiere puente nativo", detected: "Puente detectado", cloud: "Requiere API cloud / OAuth", configured: "API configurada", filesReady: "GPX / TCX activos · FIT pendiente", nativeGps: "GPS ANDROID NATIVO", screenOff: "Pantalla apagada / segundo plano", grant: "AUTORIZAR", manage: "GESTIONAR", hcReady: "Permisos de entrenamiento concedidos", hcAvailable: "Disponible · permisos pendientes", bpm: "bpm", spm: "pas/min", sync: "SINCRONIZAR 30 D", syncDone: "Sincronización terminada", lastSync: "Última sincronización", routesMissing: "rutas protegidas", routesOk: "Rutas autorizadas", routesOff: "Autoriza las rutas en Health Connect", export: "ENVIAR MIS ACTIVIDADES", exportDone: "Exportación Health Connect terminada", lastExport: "Último envío",
  } : {
    title: "CONNECTIONS & SENSORS", sub: "BLE sensors and Health Connect sync are available for internal testing. Garmin/FIT remain in the integration phase.", hr: "HEART RATE STRAP", foot: "FOOTPOD / CADENCE", treadmill: "FTMS TREADMILL", connect: "CONNECT", disconnect: "DISCONNECT", live: "LIVE", unavailable: "BLE UNAVAILABLE", health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "SPORT FILES", native: "Native bridge required", detected: "Bridge detected", cloud: "Cloud API / OAuth required", configured: "API configured", filesReady: "GPX / TCX active · FIT next", nativeGps: "NATIVE ANDROID GPS", screenOff: "Screen-off / background", grant: "AUTHORIZE", manage: "MANAGE", hcReady: "Workout permissions granted", hcAvailable: "Available · permissions pending", bpm: "bpm", spm: "steps/min", sync: "SYNC 30 DAYS", syncDone: "Sync complete", lastSync: "Last sync", routesMissing: "protected routes", routesOk: "Routes allowed", routesOff: "Allow exercise routes in Health Connect", export: "SEND MY WORKOUTS", exportDone: "Health Connect export complete", lastExport: "Last export",
  };

  const connected = (kind: RunningSensorKind) => sensor.devices.some((d) => d.kind === kind && d.connected);
  const deviceName = (kind: RunningSensorKind) => sensor.devices.find((d) => d.kind === kind)?.name || "";
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

  const healthAction = async () => {
    if (!capabilities.healthConnectBridge) return;
    setHealthBusy(true); setMessage(""); setMessageKind("ok");
    try {
      if (healthStatus?.permissionsGranted) await openHealthConnectSettings();
      else await requestHealthConnectWorkoutPermissions();
      setHealthStatus(await getHealthConnectStatus());
    } catch (error: any) { setMessageKind("error"); setMessage(error?.message || String(error)); }
    finally { setHealthBusy(false); }
  };

  const syncHealth = async () => {
    if (!capabilities.healthConnectBridge || !healthStatus?.permissionsGranted) return;
    setSyncBusy(true); setMessage(""); setMessageKind("ok");
    try {
      const report = await syncHealthConnectWorkouts(30);
      setLastSyncAt(report.lastSyncAt);
      await onActivitiesChanged?.();
      setHealthStatus(await getHealthConnectStatus());
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
    if (!capabilities.healthConnectBridge || !healthStatus?.permissionsGranted) return;
    setExportBusy(true); setMessage(""); setMessageKind("ok");
    try {
      const report = await exportLocalWorkoutsToHealthConnect(30);
      setLastExportAt(report.lastExportAt);
      await onActivitiesChanged?.();
      const detail = `${report.exported} ✓${report.failed ? ` · ${report.failed} ✕` : ""}`;
      setMessage(`${copy.exportDone} · ${detail}${report.errors.length ? ` · ${report.errors[0]}` : ""}`);
    } catch (error: any) {
      setMessageKind("error"); setMessage(error?.message || String(error));
    } finally { setExportBusy(false); }
  };

  const sensorCard = (kind: RunningSensorKind, icon: string, title: string, value: string) => {
    const on = connected(kind);
    return <RunningSurface accent={accent} active={on} padding={compact ? 10 : 12}>
      <div style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 9, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}28`, fontSize: 20 }}>{icon}</div>
        <div><div style={{ fontSize: 9.5, fontWeight: 1000 }}>{title}</div><div style={{ marginTop: 3, color: on ? accent : textSoft, fontSize: 8.3 }}>{on ? `${copy.live}${deviceName(kind) ? ` · ${deviceName(kind)}` : ""}${value ? ` · ${value}` : ""}` : capabilities.webBluetooth ? "BLE" : copy.unavailable}</div></div>
        <button className="btn" disabled={busy === kind || !capabilities.webBluetooth} onClick={() => void action(kind)} style={{ minHeight: 34, padding: "4px 8px", fontSize: 7.8, fontWeight: 1000, color: on ? accent : undefined, borderColor: on ? `${accent}66` : undefined }}>{busy === kind ? "…" : on ? copy.disconnect : copy.connect}</button>
      </div>
    </RunningSurface>;
  };

  return <div>
    {!compact ? <div style={{ color: accent, fontSize: 9, fontWeight: 1000, marginBottom: 5 }}>{copy.title}</div> : null}
    {!compact ? <div style={{ color: textSoft, fontSize: 8.6, lineHeight: 1.45, marginBottom: 9 }}>{copy.sub}</div> : null}
    <div style={{ display: "grid", gap: 7 }}>
      {sensorCard("heart-rate", "❤️", copy.hr, sensor.heartRateBpm ? `${sensor.heartRateBpm} ${copy.bpm}` : "")}
      {sensorCard("running-speed-cadence", "🦶", copy.foot, [sensor.cadenceSpm ? `${sensor.cadenceSpm} ${copy.spm}` : "", sensor.sensorSpeedMps ? `${(sensor.sensorSpeedMps * 3.6).toFixed(1)} km/h` : ""].filter(Boolean).join(" · "))}
      {sensorCard("fitness-machine-treadmill", "🏃‍♂️", copy.treadmill, [sensor.treadmillSpeedMps ? `${(sensor.treadmillSpeedMps * 3.6).toFixed(1)} km/h` : "", sensor.treadmillDistanceM != null ? `${(sensor.treadmillDistanceM / 1000).toFixed(2)} km` : "", sensor.inclinePercent != null ? `${sensor.inclinePercent.toFixed(1)}%` : ""].filter(Boolean).join(" · "))}
    </div>
    {message ? <div style={{ marginTop: 7, padding: 8, borderRadius: 10, border: `1px solid ${messageKind === "error" ? "rgba(255,120,120,.26)" : `${accent}38`}`, color: messageKind === "error" ? "#ffb0b0" : accent, background: messageKind === "error" ? "rgba(255,90,90,.045)" : `${accent}08`, fontSize: 8.2 }}>{message}</div> : null}
    {!compact ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
      <RunningSurface accent={accent} active={!!healthStatus?.available} padding={10}>
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 7, alignItems: "center" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: `${accent}10`, fontSize: 15 }}>♥</div>
          <div><div style={{ fontSize: 8.5, fontWeight: 1000 }}>{copy.health}</div><div style={{ marginTop: 2, fontSize: 7.4, opacity: .55, lineHeight: 1.25 }}>{!capabilities.healthConnectBridge ? copy.native : healthStatus?.permissionsGranted ? `${copy.hcReady} · ${healthStatus?.exerciseRoutesGranted ? copy.routesOk : copy.routesOff}` : healthStatus?.available ? copy.hcAvailable : healthStatus?.status === "update-required" ? "Mise à jour requise" : copy.detected}</div>{lastSyncAt ? <div style={{ marginTop: 3, fontSize: 7.2, color: accent }}>{copy.lastSync}: {new Date(lastSyncAt).toLocaleString()}</div> : null}{lastExportAt ? <div style={{ marginTop: 2, fontSize: 7.2, color: accent }}>{copy.lastExport}: {new Date(lastExportAt).toLocaleString()}</div> : null}</div>
        </div>
        {capabilities.healthConnectBridge ? <div style={{ display: "grid", gridTemplateColumns: healthStatus?.permissionsGranted ? "repeat(3,minmax(0,1fr))" : "1fr", gap: 5, marginTop: 7 }}>
          <button className="btn" onClick={healthAction} disabled={healthBusy || syncBusy || exportBusy} style={{ minHeight: 30, padding: "4px 5px", fontSize: 7, fontWeight: 1000, color: healthStatus?.available ? accent : undefined, borderColor: healthStatus?.available ? `${accent}55` : undefined }}>{healthBusy ? "…" : healthStatus?.permissionsGranted ? copy.manage : copy.grant}</button>
          {healthStatus?.permissionsGranted ? <button className="btn" onClick={() => void syncHealth()} disabled={syncBusy || healthBusy || exportBusy} style={{ minHeight: 30, padding: "4px 5px", fontSize: 7, fontWeight: 1000, color: accent, borderColor: `${accent}66` }}>{syncBusy ? "…" : copy.sync}</button> : null}
          {healthStatus?.permissionsGranted ? <button className="btn" onClick={() => void exportHealth()} disabled={exportBusy || healthBusy || syncBusy} style={{ minHeight: 30, padding: "4px 5px", fontSize: 6.6, fontWeight: 1000, color: accent, borderColor: `${accent}66` }}>{exportBusy ? "…" : copy.export}</button> : null}
        </div> : null}
      </RunningSurface>
      <Connector icon="📍" title={copy.nativeGps} status={capabilities.nativeTrackingBridge ? copy.screenOff : copy.native} accent={accent} active={capabilities.nativeTrackingBridge}/>
      <Connector icon="" title={copy.apple} status={capabilities.healthKitBridge ? copy.detected : copy.native} accent={accent} active={capabilities.healthKitBridge}/>
      <Connector icon="⌚" title={copy.garmin} status={capabilities.garminCloudConfigured ? copy.configured : copy.cloud} accent={accent} active={capabilities.garminCloudConfigured}/>
      <Connector icon="⇄" title={copy.files} status={copy.filesReady} accent={accent} active/>
    </div> : null}
  </div>;
}

function Connector({ icon, title, status, accent, active, action, busy, onClick }: { icon: string; title: string; status: string; accent: string; active: boolean; action?: string; busy?: boolean; onClick?: () => void }) {
  return <RunningSurface accent={accent} active={active} padding={10}><div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 7, alignItems: "center" }}><div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: `${accent}10`, fontSize: 15 }}>{icon}</div><div><div style={{ fontSize: 8.5, fontWeight: 1000 }}>{title}</div><div style={{ marginTop: 2, fontSize: 7.4, opacity: .55, lineHeight: 1.25 }}>{status}</div></div></div>{onClick && action ? <button className="btn" onClick={onClick} disabled={busy} style={{ width: "100%", minHeight: 30, marginTop: 7, padding: "4px 7px", fontSize: 7.5, fontWeight: 1000, color: active ? accent : undefined, borderColor: active ? `${accent}55` : undefined }}>{busy ? "…" : action}</button> : null}</RunningSurface>;
}

import React from "react";
import { RunningSurface } from "./RunningUi";
import { getHealthConnectStatus, openHealthConnectSettings, requestHealthConnectWorkoutPermissions, type HealthConnectStatus } from "../../activity/healthConnectBridge";
import { connectHeartRateSensor, connectRunningCadenceSensor, connectTreadmillSensor, detectFitnessConnectorCapabilities, disconnectRunningSensor, getRunningSensorSnapshot, subscribeRunningSensors, type RunningSensorKind, type RunningSensorSnapshot } from "../../activity/runningSensors";

export default function RunningConnectionsPanel({ lang, accent, textSoft, compact = false }: { lang: string; accent: string; textSoft: string; compact?: boolean }) {
  const [sensor, setSensor] = React.useState<RunningSensorSnapshot>(() => getRunningSensorSnapshot());
  const [busy, setBusy] = React.useState<RunningSensorKind | null>(null);
  const [message, setMessage] = React.useState("");
  const [healthStatus, setHealthStatus] = React.useState<HealthConnectStatus | null>(null);
  const [healthBusy, setHealthBusy] = React.useState(false);
  const capabilities = React.useMemo(() => detectFitnessConnectorCapabilities(), []);
  React.useEffect(() => subscribeRunningSensors(setSensor), []);
  React.useEffect(() => { if (!capabilities.healthConnectBridge) return; void getHealthConnectStatus().then(setHealthStatus); }, [capabilities.healthConnectBridge]);

  const copy = lang === "fr" ? {
    title: "CONNEXIONS & CAPTEURS", sub: "Capteurs BLE utilisables dès maintenant sur navigateur compatible. Les passerelles santé/cloud sont préparées sans activer Android prématurément.", hr: "CEINTURE CARDIO", foot: "FOOTPOD / CADENCE", treadmill: "TAPIS FTMS", connect: "CONNECTER", disconnect: "DÉCONNECTER", live: "LIVE", unavailable: "BLE NON DISPONIBLE", health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "FICHIERS SPORT", native: "Bridge natif requis", detected: "Bridge détecté", cloud: "API cloud / OAuth requis", configured: "API configurée", filesReady: "GPX / TCX actifs · FIT à câbler", nativeGps: "GPS ANDROID NATIF", screenOff: "Écran éteint / arrière-plan", grant: "AUTORISER", manage: "GÉRER", hcReady: "Autorisations entraînement accordées", hcAvailable: "Disponible · autorisations à accorder", bpm: "bpm", spm: "pas/min",
  } : lang === "es" ? {
    title: "CONEXIONES Y SENSORES", sub: "Sensores BLE utilizables ahora en navegadores compatibles. Los puentes salud/cloud quedan preparados sin activar Android todavía.", hr: "BANDA CARDÍACA", foot: "FOOTPOD / CADENCIA", treadmill: "CINTA FTMS", connect: "CONECTAR", disconnect: "DESCONECTAR", live: "LIVE", unavailable: "BLE NO DISPONIBLE", health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "ARCHIVOS DEPORTIVOS", native: "Requiere puente nativo", detected: "Puente detectado", cloud: "Requiere API cloud / OAuth", configured: "API configurada", filesReady: "GPX / TCX activos · FIT pendiente", nativeGps: "GPS ANDROID NATIVO", screenOff: "Pantalla apagada / segundo plano", grant: "AUTORIZAR", manage: "GESTIONAR", hcReady: "Permisos de entrenamiento concedidos", hcAvailable: "Disponible · permisos pendientes", bpm: "bpm", spm: "pas/min",
  } : {
    title: "CONNECTIONS & SENSORS", sub: "BLE sensors can work now on compatible browsers. Health/cloud bridges are prepared without prematurely enabling Android.", hr: "HEART RATE STRAP", foot: "FOOTPOD / CADENCE", treadmill: "FTMS TREADMILL", connect: "CONNECT", disconnect: "DISCONNECT", live: "LIVE", unavailable: "BLE UNAVAILABLE", health: "HEALTH CONNECT", apple: "APPLE HEALTH", garmin: "GARMIN CONNECT", files: "SPORT FILES", native: "Native bridge required", detected: "Bridge detected", cloud: "Cloud API / OAuth required", configured: "API configured", filesReady: "GPX / TCX active · FIT next", nativeGps: "NATIVE ANDROID GPS", screenOff: "Screen-off / background", grant: "AUTHORIZE", manage: "MANAGE", hcReady: "Workout permissions granted", hcAvailable: "Available · permissions pending", bpm: "bpm", spm: "steps/min",
  };

  const connected = (kind: RunningSensorKind) => sensor.devices.some((d) => d.kind === kind && d.connected);
  const deviceName = (kind: RunningSensorKind) => sensor.devices.find((d) => d.kind === kind)?.name || "";
  const action = async (kind: RunningSensorKind) => {
    setMessage(""); setBusy(kind);
    try {
      if (connected(kind)) await disconnectRunningSensor(kind);
      else if (kind === "heart-rate") await connectHeartRateSensor();
      else if (kind === "fitness-machine-treadmill") await connectTreadmillSensor();
      else await connectRunningCadenceSensor();
    } catch (error: any) { setMessage(error?.message || String(error)); }
    finally { setBusy(null); }
  };

  const healthAction = async () => {
    if (!capabilities.healthConnectBridge) return;
    setHealthBusy(true); setMessage("");
    try {
      if (healthStatus?.permissionsGranted) await openHealthConnectSettings();
      else await requestHealthConnectWorkoutPermissions();
      setHealthStatus(await getHealthConnectStatus());
    } catch (error: any) { setMessage(error?.message || String(error)); }
    finally { setHealthBusy(false); }
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
    {message ? <div style={{ marginTop: 7, padding: 8, borderRadius: 10, border: "1px solid rgba(255,120,120,.26)", color: "#ffb0b0", fontSize: 8.2 }}>{message}</div> : null}
    {!compact ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
      <Connector icon="♥" title={copy.health} status={!capabilities.healthConnectBridge ? copy.native : healthStatus?.permissionsGranted ? copy.hcReady : healthStatus?.available ? copy.hcAvailable : healthStatus?.status === "update-required" ? "Mise à jour requise" : copy.detected} accent={accent} active={!!healthStatus?.available} action={capabilities.healthConnectBridge ? (healthStatus?.permissionsGranted ? copy.manage : copy.grant) : undefined} busy={healthBusy} onClick={capabilities.healthConnectBridge ? healthAction : undefined}/>
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

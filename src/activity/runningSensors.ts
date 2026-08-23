export type RunningSensorKind = "heart-rate" | "running-speed-cadence";

export type RunningSensorDeviceInfo = {
  kind: RunningSensorKind;
  name: string;
  connected: boolean;
};

export type RunningSensorSnapshot = {
  heartRateBpm: number | null;
  cadenceSpm: number | null;
  sensorSpeedMps: number | null;
  strideLengthM: number | null;
  updatedAt: number | null;
  devices: RunningSensorDeviceInfo[];
};

const snapshot: RunningSensorSnapshot = {
  heartRateBpm: null,
  cadenceSpm: null,
  sensorSpeedMps: null,
  strideLengthM: null,
  updatedAt: null,
  devices: [],
};

const listeners = new Set<(value: RunningSensorSnapshot) => void>();
const connections = new Map<RunningSensorKind, { device: any; characteristic?: any }>();

function emit() {
  const value = getRunningSensorSnapshot();
  listeners.forEach((listener) => { try { listener(value); } catch {} });
}

function upsertDevice(kind: RunningSensorKind, name: string, connected: boolean) {
  const next = snapshot.devices.filter((item) => item.kind !== kind);
  next.push({ kind, name, connected });
  snapshot.devices = next;
  snapshot.updatedAt = Date.now();
  emit();
}

export function getRunningSensorSnapshot(): RunningSensorSnapshot {
  return { ...snapshot, devices: snapshot.devices.map((item) => ({ ...item })) };
}

export function subscribeRunningSensors(listener: (value: RunningSensorSnapshot) => void) {
  listeners.add(listener);
  listener(getRunningSensorSnapshot());
  return () => { listeners.delete(listener); };
}

export function isWebBluetoothAvailable() {
  try { return typeof navigator !== "undefined" && !!(navigator as any).bluetooth; } catch { return false; }
}

function parseHeartRate(value: DataView) {
  if (!value || value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  return (flags & 0x01) ? (value.byteLength >= 3 ? value.getUint16(1, true) : null) : value.getUint8(1);
}

function parseRsc(value: DataView) {
  if (!value || value.byteLength < 4) return null;
  const flags = value.getUint8(0);
  let offset = 1;
  const speedMps = value.getUint16(offset, true) / 256; offset += 2;
  const cadenceSpm = value.getUint8(offset); offset += 1;
  let strideLengthM: number | null = null;
  if ((flags & 0x01) && value.byteLength >= offset + 2) {
    strideLengthM = value.getUint16(offset, true) / 100;
  }
  return { speedMps, cadenceSpm, strideLengthM };
}

async function requestGatt(kind: RunningSensorKind) {
  if (!isWebBluetoothAvailable()) throw new Error("Web Bluetooth indisponible sur ce navigateur.");
  const bluetooth = (navigator as any).bluetooth;
  const service = kind === "heart-rate" ? "heart_rate" : "running_speed_and_cadence";
  const device = await bluetooth.requestDevice({ filters: [{ services: [service] }], optionalServices: ["battery_service"] });
  const server = await device.gatt?.connect();
  if (!server) throw new Error("Connexion Bluetooth impossible.");
  const primary = await server.getPrimaryService(service);
  const characteristic = await primary.getCharacteristic(kind === "heart-rate" ? "heart_rate_measurement" : "rsc_measurement");
  await characteristic.startNotifications();
  const onValue = (event: any) => {
    const value = event?.target?.value as DataView | undefined;
    if (!value) return;
    if (kind === "heart-rate") {
      const bpm = parseHeartRate(value);
      if (Number.isFinite(bpm)) snapshot.heartRateBpm = Number(bpm);
    } else {
      const parsed = parseRsc(value);
      if (parsed) {
        snapshot.sensorSpeedMps = parsed.speedMps;
        snapshot.cadenceSpm = parsed.cadenceSpm;
        snapshot.strideLengthM = parsed.strideLengthM;
      }
    }
    snapshot.updatedAt = Date.now();
    emit();
  };
  characteristic.addEventListener("characteristicvaluechanged", onValue);
  device.addEventListener?.("gattserverdisconnected", () => {
    connections.delete(kind);
    upsertDevice(kind, device.name || (kind === "heart-rate" ? "Cardio BLE" : "Footpod BLE"), false);
  });
  connections.set(kind, { device, characteristic });
  upsertDevice(kind, device.name || (kind === "heart-rate" ? "Cardio BLE" : "Footpod BLE"), true);
  return getRunningSensorSnapshot();
}

export function connectHeartRateSensor() { return requestGatt("heart-rate"); }
export function connectRunningCadenceSensor() { return requestGatt("running-speed-cadence"); }

export async function disconnectRunningSensor(kind: RunningSensorKind) {
  const entry = connections.get(kind);
  try { await entry?.characteristic?.stopNotifications?.(); } catch {}
  try { entry?.device?.gatt?.disconnect?.(); } catch {}
  connections.delete(kind);
  upsertDevice(kind, entry?.device?.name || (kind === "heart-rate" ? "Cardio BLE" : "Footpod BLE"), false);
}

export async function disconnectAllRunningSensors() {
  await Promise.all(Array.from(connections.keys()).map((kind) => disconnectRunningSensor(kind)));
}

export function detectFitnessConnectorCapabilities() {
  const w = typeof window !== "undefined" ? window as any : {};
  const plugins = w?.Capacitor?.Plugins || {};
  return {
    healthConnectBridge: !!(plugins.HealthConnect || w.MultisportsHealthConnect),
    healthKitBridge: !!(plugins.HealthKit || plugins.AppleHealth || w.MultisportsHealthKit),
    garminCloudConfigured: !!((import.meta as any)?.env?.VITE_GARMIN_CONNECT_URL),
    webBluetooth: isWebBluetoothAvailable(),
  };
}

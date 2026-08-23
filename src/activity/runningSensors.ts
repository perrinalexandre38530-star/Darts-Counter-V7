export type RunningSensorKind = "heart-rate" | "running-speed-cadence" | "fitness-machine-treadmill";

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
  treadmillSpeedMps: number | null;
  treadmillDistanceM: number | null;
  inclinePercent: number | null;
  updatedAt: number | null;
  devices: RunningSensorDeviceInfo[];
};

const snapshot: RunningSensorSnapshot = {
  heartRateBpm: null,
  cadenceSpm: null,
  sensorSpeedMps: null,
  strideLengthM: null,
  treadmillSpeedMps: null,
  treadmillDistanceM: null,
  inclinePercent: null,
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


function readUint24LE(value: DataView, offset: number) {
  if (offset + 3 > value.byteLength) return null;
  return value.getUint8(offset) | (value.getUint8(offset + 1) << 8) | (value.getUint8(offset + 2) << 16);
}

/** Parse Bluetooth FTMS Treadmill Data (0x2ACD). Unknown optional fields are skipped safely. */
function parseFtmsTreadmill(value: DataView) {
  if (!value || value.byteLength < 2) return null;
  const flags = value.getUint16(0, true);
  let offset = 2;
  let speedMps: number | null = null;
  let distanceM: number | null = null;
  let inclinePercent: number | null = null;
  let heartRateBpm: number | null = null;

  // Bit 0 = More Data. When clear, instantaneous speed is the first field (0.01 km/h).
  if ((flags & 0x0001) === 0 && offset + 2 <= value.byteLength) {
    speedMps = (value.getUint16(offset, true) / 100) / 3.6; offset += 2;
  }
  if ((flags & 0x0002) && offset + 2 <= value.byteLength) offset += 2; // average speed
  if ((flags & 0x0004) && offset + 3 <= value.byteLength) {
    const raw = readUint24LE(value, offset);
    distanceM = raw == null ? null : raw; offset += 3;
  }
  if ((flags & 0x0008) && offset + 4 <= value.byteLength) {
    inclinePercent = value.getInt16(offset, true) / 10; offset += 4; // incline + ramp angle
  }
  if ((flags & 0x0010) && offset + 4 <= value.byteLength) offset += 4; // elevation gain
  if ((flags & 0x0020) && offset + 1 <= value.byteLength) offset += 1; // instantaneous pace
  if ((flags & 0x0040) && offset + 1 <= value.byteLength) offset += 1; // average pace
  if ((flags & 0x0080) && offset + 5 <= value.byteLength) offset += 5; // expended energy
  if ((flags & 0x0100) && offset + 1 <= value.byteLength) { heartRateBpm = value.getUint8(offset); offset += 1; }
  return { speedMps, distanceM, inclinePercent, heartRateBpm };
}

async function requestGatt(kind: RunningSensorKind) {
  if (!isWebBluetoothAvailable()) throw new Error("Web Bluetooth indisponible sur ce navigateur.");
  const bluetooth = (navigator as any).bluetooth;
  const service = kind === "heart-rate" ? "heart_rate" : kind === "fitness-machine-treadmill" ? "00001826-0000-1000-8000-00805f9b34fb" : "running_speed_and_cadence";
  const device = await bluetooth.requestDevice({ filters: [{ services: [service] }], optionalServices: ["battery_service", "00001826-0000-1000-8000-00805f9b34fb"] });
  const server = await device.gatt?.connect();
  if (!server) throw new Error("Connexion Bluetooth impossible.");
  const primary = await server.getPrimaryService(service);
  const characteristic = await primary.getCharacteristic(kind === "heart-rate" ? "heart_rate_measurement" : kind === "fitness-machine-treadmill" ? "00002acd-0000-1000-8000-00805f9b34fb" : "rsc_measurement");
  await characteristic.startNotifications();
  const onValue = (event: any) => {
    const value = event?.target?.value as DataView | undefined;
    if (!value) return;
    if (kind === "heart-rate") {
      const bpm = parseHeartRate(value);
      if (Number.isFinite(bpm)) snapshot.heartRateBpm = Number(bpm);
    } else if (kind === "fitness-machine-treadmill") {
      const parsed = parseFtmsTreadmill(value);
      if (parsed) {
        if (Number.isFinite(parsed.speedMps)) { snapshot.treadmillSpeedMps = Number(parsed.speedMps); snapshot.sensorSpeedMps = Number(parsed.speedMps); }
        if (Number.isFinite(parsed.distanceM)) snapshot.treadmillDistanceM = Number(parsed.distanceM);
        if (Number.isFinite(parsed.inclinePercent)) snapshot.inclinePercent = Number(parsed.inclinePercent);
        if (Number.isFinite(parsed.heartRateBpm)) snapshot.heartRateBpm = Number(parsed.heartRateBpm);
      }
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
    upsertDevice(kind, device.name || (kind === "heart-rate" ? "Cardio BLE" : kind === "fitness-machine-treadmill" ? "Tapis FTMS" : "Footpod BLE"), false);
  });
  connections.set(kind, { device, characteristic });
  upsertDevice(kind, device.name || (kind === "heart-rate" ? "Cardio BLE" : kind === "fitness-machine-treadmill" ? "Tapis FTMS" : "Footpod BLE"), true);
  return getRunningSensorSnapshot();
}

export function connectHeartRateSensor() { return requestGatt("heart-rate"); }
export function connectRunningCadenceSensor() { return requestGatt("running-speed-cadence"); }
export function connectTreadmillSensor() { return requestGatt("fitness-machine-treadmill"); }

export async function disconnectRunningSensor(kind: RunningSensorKind) {
  const entry = connections.get(kind);
  try { await entry?.characteristic?.stopNotifications?.(); } catch {}
  try { entry?.device?.gatt?.disconnect?.(); } catch {}
  connections.delete(kind);
  upsertDevice(kind, entry?.device?.name || (kind === "heart-rate" ? "Cardio BLE" : kind === "fitness-machine-treadmill" ? "Tapis FTMS" : "Footpod BLE"), false);
}

export async function disconnectAllRunningSensors() {
  await Promise.all(Array.from(connections.keys()).map((kind) => disconnectRunningSensor(kind)));
}

export function detectFitnessConnectorCapabilities() {
  const w = typeof window !== "undefined" ? window as any : {};
  const plugins = w?.Capacitor?.Plugins || {};
  return {
    healthConnectBridge: !!(plugins.HealthConnect || w.MultisportsHealthConnect),
    nativeTrackingBridge: !!plugins.ActivityTracking,
    healthKitBridge: !!(plugins.HealthKit || plugins.AppleHealth || w.MultisportsHealthKit),
    garminCloudConfigured: !!((import.meta as any)?.env?.VITE_GARMIN_CONNECT_URL),
    webBluetooth: isWebBluetoothAvailable(),
  };
}

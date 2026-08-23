export type HealthConnectStatus = {
  available: boolean;
  status: "available" | "update-required" | "unavailable" | string;
  provider?: string;
  permissionsGranted?: boolean;
  grantedPermissions?: string[];
};

function healthPlugin(): any {
  try { return (window as any)?.Capacitor?.Plugins?.HealthConnect || null; } catch { return null; }
}

export function isHealthConnectBridgeInstalled() { return !!healthPlugin(); }
export async function getHealthConnectStatus(): Promise<HealthConnectStatus | null> { try { return await healthPlugin()?.getStatus?.(); } catch { return null; } }
export async function requestHealthConnectWorkoutPermissions() { const p = healthPlugin(); if (!p) throw new Error("Health Connect bridge unavailable"); return p.requestWorkoutPermissions(); }
export async function openHealthConnectSettings() { const p = healthPlugin(); if (!p) throw new Error("Health Connect bridge unavailable"); return p.openHealthConnect(); }

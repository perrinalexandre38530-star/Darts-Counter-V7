import type { OceanControlCompetitiveEntry } from "./oceanControlCompetitive";

export type OceanControlRivalryMetric = {
  id: "accuracy" | "mission" | "power" | "sonar" | "tempo" | "clutch";
  label: string;
  active: number;
  rival: number;
  delta: number;
  color: string;
};

export type OceanControlRivalrySnapshot = {
  active: OceanControlCompetitiveEntry;
  rival: OceanControlCompetitiveEntry;
  delta: number;
  absDelta: number;
  status: "ahead" | "behind" | "tied";
  label: string;
  detail: string;
  color: string;
  metrics: OceanControlRivalryMetric[];
  strongestMetric: OceanControlRivalryMetric | null;
  weakestMetric: OceanControlRivalryMetric | null;
};

const BLUE = "#30b9ff";
const CYAN = "#65e9ff";
const GREEN = "#65e5aa";
const GOLD = "#f5ca68";
const RED = "#ff6573";
const PURPLE = "#a78bfa";

function n(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metric(
  id: OceanControlRivalryMetric["id"],
  label: string,
  active: any,
  rival: any,
  color: string
): OceanControlRivalryMetric {
  const a = Math.max(0, Math.min(100, n(active)));
  const b = Math.max(0, Math.min(100, n(rival)));
  return { id, label, active: a, rival: b, delta: Math.round((a - b) * 10) / 10, color };
}

export function buildOceanControlRivalrySnapshot(
  standings: OceanControlCompetitiveEntry[] = [],
  activePlayerId?: string | null
): OceanControlRivalrySnapshot | null {
  const rows = Array.isArray(standings) ? standings.filter(Boolean) : [];
  if (rows.length < 2) return null;

  const active = rows.find((row) => String(row.playerId) === String(activePlayerId || "")) || rows[0];
  const rival = active.rank === 1
    ? rows.find((row) => row.rank === 2) || rows.find((row) => row.playerId !== active.playerId)
    : rows[0];

  if (!active || !rival || String(active.playerId) === String(rival.playerId)) return null;

  const delta = n(active.score) - n(rival.score);
  const status: OceanControlRivalrySnapshot["status"] = delta > 0 ? "ahead" : delta < 0 ? "behind" : "tied";
  const absDelta = Math.abs(delta);
  const color = status === "ahead" ? GREEN : status === "behind" ? RED : GOLD;
  const label = status === "ahead" ? `EN TÊTE +${absDelta}` : status === "behind" ? `À ${absDelta} PTS` : "ÉGALITÉ";
  const detail = absDelta <= 4
    ? "Duel extrêmement serré"
    : absDelta <= 10
      ? "Rivalité sous pression"
      : status === "ahead"
        ? "Avantage de commandement"
        : "Écart à combler";

  const metrics = [
    metric("accuracy", "PRÉCISION", active.accuracy, rival.accuracy, GREEN),
    metric("mission", "MISSION", active.missionPercent, rival.missionPercent, BLUE),
    metric("power", "PUISSANCE", active.power, rival.power, RED),
    metric("sonar", "SONAR", active.sonar, rival.sonar, CYAN),
    metric("tempo", "TEMPO", active.tempo, rival.tempo, GOLD),
    metric("clutch", "CLUTCH", active.clutch, rival.clutch, PURPLE),
  ];
  const strongestMetric = [...metrics].sort((a, b) => b.delta - a.delta)[0] || null;
  const weakestMetric = [...metrics].sort((a, b) => a.delta - b.delta)[0] || null;

  return {
    active,
    rival,
    delta,
    absDelta,
    status,
    label,
    detail,
    color,
    metrics,
    strongestMetric,
    weakestMetric,
  };
}

export function buildOceanControlFinalDuel(standings: OceanControlCompetitiveEntry[] = []) {
  const rows = Array.isArray(standings) ? standings.filter(Boolean) : [];
  if (rows.length < 2) return null;
  return buildOceanControlRivalrySnapshot(rows, rows[0].playerId);
}

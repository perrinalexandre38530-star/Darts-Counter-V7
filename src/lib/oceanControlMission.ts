export type OceanControlMissionObjective = {
  id: string;
  icon: string;
  label: string;
  detail: string;
  value: number;
  target: number;
  progress: number;
  complete: boolean;
  color: string;
};

export type OceanControlMissionSummary = {
  objectives: OceanControlMissionObjective[];
  completed: number;
  total: number;
  percent: number;
  next: OceanControlMissionObjective | null;
  label: string;
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

function objective(id: string, icon: string, label: string, detail: string, value: number, target: number, color: string): OceanControlMissionObjective {
  const safeTarget = Math.max(1, n(target));
  const safeValue = Math.max(0, n(value));
  return {
    id,
    icon,
    label,
    detail,
    value: safeValue,
    target: safeTarget,
    progress: Math.max(0, Math.min(100, Math.round((safeValue / safeTarget) * 100))),
    complete: safeValue >= safeTarget,
    color,
  };
}

export function buildOceanControlMissionObjectives(stats: any = {}, config: any = {}): OceanControlMissionObjective[] {
  const items: OceanControlMissionObjective[] = [
    objective("first_blood", "🎯", "Premier impact", "Toucher une zone ennemie.", stats?.shipHits, 1, BLUE),
    objective("hunter", "💥", "Chasseur de flotte", "Couler au moins un navire.", stats?.shipsSunk, 1, RED),
    objective("perfect_visit", "✨", "Volée parfaite", "Réussir une volée comptée comme parfaite.", stats?.perfectVisits, 1, GREEN),
    objective("streak", "🔥", "Feu continu", "Enchaîner 3 impacts consécutifs.", stats?.bestHitStreak, 3, GOLD),
  ];

  if (config?.sonarEnabled !== false) {
    items.push(objective("sonar", "📡", "Renseignement sonar", "Détecter 3 contacts sonar.", stats?.sonarContacts, 3, CYAN));
  } else {
    items.push(objective("multi_hit", "⚡", "Salve multiple", "Réussir une volée multi-impact.", stats?.multiHitVisits, 1, PURPLE));
  }

  if (config?.dbullStrikeEnabled !== false) {
    items.push(objective("precision_strike", "📍", "Frappe chirurgicale", "Réussir une frappe de précision DBULL.", stats?.precisionStrikes, 1, GOLD));
  } else {
    items.push(objective("tempo", "🧭", "Tempo de combat", "Réussir 3 volées avec impact.", stats?.successfulVisits, 3, BLUE));
  }

  return items;
}

export function oceanControlMissionMasteryLabel(percent: number) {
  const value = Math.max(0, Math.min(100, n(percent)));
  if (value >= 100) return "MISSION PARFAITE";
  if (value >= 80) return "MAÎTRISE TACTIQUE";
  if (value >= 60) return "MISSION SOLIDE";
  if (value >= 40) return "EN PROGRESSION";
  return "OBJECTIFS EN COURS";
}

export function oceanControlMissionSummary(stats: any = {}, config: any = {}): OceanControlMissionSummary {
  const objectives = buildOceanControlMissionObjectives(stats, config);
  const completed = objectives.filter((row) => row.complete).length;
  const total = objectives.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const next = objectives.find((row) => !row.complete) || null;
  return {
    objectives,
    completed,
    total,
    percent,
    next,
    label: oceanControlMissionMasteryLabel(percent),
  };
}

import { oceanControlMissionSummary } from "./oceanControlMission";

export type OceanControlCompetitiveSnapshot = {
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  gradeColor: string;
  accuracy: number;
  missionPercent: number;
  power: number;
  sonar: number;
  tempo: number;
  clutch: number;
};

export type OceanControlCompetitiveEntry = OceanControlCompetitiveSnapshot & {
  playerId: string;
  name: string;
  rank: number;
  won: boolean;
  shipsSunk: number;
  shipHits: number;
  sonarContacts: number;
};

const GOLD = "#f5ca68";
const GREEN = "#65e5aa";
const BLUE = "#30b9ff";
const CYAN = "#65e9ff";
const SOFT = "#aab4c7";

function n(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function oceanControlCommandGrade(score: number) {
  const value = clamp(n(score));
  if (value >= 86) return { grade: "S" as const, color: GOLD, label: "COMMANDANT D’ÉLITE" };
  if (value >= 72) return { grade: "A" as const, color: GREEN, label: "COMMANDANT SUPÉRIEUR" };
  if (value >= 58) return { grade: "B" as const, color: BLUE, label: "COMMANDANT CONFIRMÉ" };
  if (value >= 44) return { grade: "C" as const, color: CYAN, label: "COMMANDANT OPÉRATIONNEL" };
  return { grade: "D" as const, color: SOFT, label: "COMMANDANT EN FORMATION" };
}

export function oceanControlCompetitiveScore(stats: any = {}, config: any = {}, options: { won?: boolean } = {}): OceanControlCompetitiveSnapshot {
  const validShots = Math.max(0, n(stats?.validShots));
  const shipHits = Math.max(0, n(stats?.shipHits));
  const visits = Math.max(0, n(stats?.visits));
  const accuracy = validShots > 0 ? clamp(Math.round((shipHits / validShots) * 1000) / 10) : 0;
  const missionPercent = oceanControlMissionSummary(stats, config).percent;

  const power = clamp(
    n(stats?.shipsSunk) * 24 +
    shipHits * 2.25 +
    n(stats?.precisionStrikes) * 5
  );

  const sonarUses = Math.max(0, n(stats?.sonarUses));
  const sonar = sonarUses > 0
    ? clamp(Math.round((n(stats?.sonarContacts) / Math.max(1, sonarUses * 3)) * 100))
    : 0;

  const tempo = visits > 0
    ? clamp(Math.round((n(stats?.successfulVisits) / Math.max(1, visits)) * 100))
    : 0;

  const clutch = clamp(
    n(stats?.perfectVisits) * 30 +
    n(stats?.multiHitVisits) * 8 +
    n(stats?.bestHitStreak) * 10
  );

  const winBonus = options?.won ? 5 : 0;
  const score = clamp(Math.round(
    accuracy * 0.28 +
    missionPercent * 0.24 +
    power * 0.18 +
    sonar * 0.10 +
    tempo * 0.10 +
    clutch * 0.10 +
    winBonus
  ));
  const grade = oceanControlCommandGrade(score);

  return {
    score,
    grade: grade.grade,
    gradeColor: grade.color,
    accuracy,
    missionPercent,
    power,
    sonar,
    tempo,
    clutch,
  };
}

export function buildOceanControlCompetitiveTable(
  players: any[] = [],
  statsByPlayer: Record<string, any> = {},
  config: any = {},
  winnerIds: string[] = []
): OceanControlCompetitiveEntry[] {
  const winners = new Set((winnerIds || []).map(String));
  const entries = (players || []).map((player: any) => {
    const playerId = String(player?.id || player?.playerId || player?.profileId || "");
    const stats = statsByPlayer?.[playerId] || player?.stats || player || {};
    const won = winners.has(playerId) || Boolean(player?.won || player?.win || player?.winner);
    const snap = oceanControlCompetitiveScore(stats, config, { won });
    return {
      playerId,
      name: String(player?.name || player?.displayName || player?.display_name || "Joueur"),
      won,
      shipsSunk: n(stats?.shipsSunk),
      shipHits: n(stats?.shipHits),
      sonarContacts: n(stats?.sonarContacts),
      ...snap,
      rank: 0,
    };
  });

  entries.sort((a, b) =>
    Number(b.won) - Number(a.won) ||
    b.score - a.score ||
    b.shipsSunk - a.shipsSunk ||
    b.shipHits - a.shipHits ||
    b.accuracy - a.accuracy ||
    a.name.localeCompare(b.name)
  );

  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

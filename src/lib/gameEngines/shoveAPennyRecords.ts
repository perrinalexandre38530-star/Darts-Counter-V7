import { shoveClosedCases, shoveRuleSet, shoveTargets } from "./shoveAPennyTargets";

/** Records verified from THIS match only. Never infer historic/personal records. */
export type ShoveMatchRecord = {
  id: "visit" | "closed" | "triples";
  label: string;
  value: string;
  player: string;
};

type Visit = {
  playerId?: string;
  delta?: number;
  darts?: Array<{ bed?: string }>;
};

type MatchState = {
  players?: Array<{ id: string; name: string }>;
  visits?: Visit[];
  config?: { modeOptions?: { marksPerBox?: number; ruleSet?: string } };
  special?: { shoveMarksByPlayer?: Record<string, Record<string, number>> };
};

const num = (v: unknown) => Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;

export function deriveShoveMatchRecords(state: MatchState): ShoveMatchRecord[] {
  const visits = Array.isArray(state?.visits) ? state.visits : [];
  // No "record" at the first visit: a baseline isn't an improvement yet.
  if (visits.length < 2) return [];
  const names = new Map((state.players || []).map((p) => [String(p.id), String(p.name || "Joueur")]));
  const nameOf = (id: unknown) => names.get(String(id ?? "")) || "Joueur";
  const results: ShoveMatchRecord[] = [];
  const bestVisit = visits.reduce<Visit | null>(
    (best, visit) => num(visit?.delta) > num(best?.delta) ? visit : best, null,
  );
  if (bestVisit && num(bestVisit.delta) > 0) {
    const marks = num(bestVisit.delta);
    results.push({ id: "visit", label: "RECORD DE VOLÉE", value: `+${marks} marque${marks > 1 ? "s" : ""}`, player: nameOf(bestVisit.playerId) });
  }

  const rule = shoveRuleSet(state.config?.modeOptions?.ruleSet);
  const required = Math.max(2, Math.min(5, num(state.config?.modeOptions?.marksPerBox) || 3));
  const totalTargets = shoveTargets(rule).length;
  const bestClosed = (state.players || []).map((p) => ({ id: p.id,
    count: shoveClosedCases(state.special?.shoveMarksByPlayer?.[p.id] || {}, required, rule),
  })).sort((a, b) => b.count - a.count)[0];
  if (bestClosed && bestClosed.count > 0) {
    results.push({ id: "closed", label: "RECORD DE CASES FERMÉES", value: `${bestClosed.count}/${totalTargets}`, player: nameOf(bestClosed.id) });
  }

  const tripleRows = visits.map((visit) => ({ visit, count: (visit.darts || []).filter((dart) => dart?.bed === "T").length }));
  const bestTriples = tripleRows.sort((a, b) => b.count - a.count)[0];
  if (bestTriples && bestTriples.count >= 2) {
    results.push({ id: "triples", label: "RECORD DE TRIPLES", value: `${bestTriples.count} sur 3`, player: nameOf(bestTriples.visit.playerId) });
  }
  return results;
}

import { shoveClosedCases, shoveTotalMarks, shoveRuleSet } from "./shoveAPennyTargets";
/** Classement officiel SHOVE : places acquises à la fermeture, puis marques restantes. */
export function rankShovePlayers(state: any): string[] {
  const players = Array.isArray(state?.players) ? state.players : [];
  const order: string[] = Array.isArray(state?.special?.shoveFinishOrder)
    ? state.special.shoveFinishOrder.map(String) : [];
  const finishedAt = (id: string) => order.indexOf(id);
  const rule = shoveRuleSet(state?.config?.modeOptions?.ruleSet);
  const required = Math.max(2, Number(state?.config?.modeOptions?.marksPerBox || 3));
  const marksFor = (id: string) => state?.special?.shoveMarksByPlayer?.[id] || {};
  const closed = (id: string) => shoveClosedCases(marksFor(id), required, rule);
  const marks = (id: string) => shoveTotalMarks(marksFor(id), rule);
  const winner = String(state?.winnerId || "");
  const originalIndex = new Map(players.map((p: any, i: number) => [String(p.id), i]));
  return [...players].sort((a: any, b: any) => {
    const ai = finishedAt(String(a.id)), bi = finishedAt(String(b.id));
    if (ai >= 0 || bi >= 0) return ai >= 0 && bi >= 0 ? ai - bi : ai >= 0 ? -1 : 1;
    if (winner && String(a.id) === winner) return -1;
    if (winner && String(b.id) === winner) return 1;
    const closedDelta = closed(String(b.id)) - closed(String(a.id));
    if (closedDelta) return closedDelta;
    const delta = marks(String(b.id)) - marks(String(a.id));
    if (delta) return delta;
    const stA = state?.statsByPlayer?.[a.id] || {}, stB = state?.statsByPlayer?.[b.id] || {};
    // À marques égales : moins de fléchettes = meilleur classement.
    const da = Number(stA.darts || 0), db = Number(stB.darts || 0);
    if (da && db && da !== db) return da - db;
    return Number(originalIndex.get(String(a.id)) || 0) - Number(originalIndex.get(String(b.id)) || 0);
  }).map((p: any) => String(p.id));
}

/**
 * Rend régulièrement la main au navigateur pendant les imports volumineux.
 * `Promise.resolve()` ne suffit pas : il ne quitte pas la file des micro-tâches
 * et peut donc laisser la WebView Android figée plusieurs secondes.
 */
export async function yieldToMainThread(): Promise<void> {
  try {
    const scheduler = (globalThis as any)?.scheduler;
    if (typeof scheduler?.yield === "function") {
      await scheduler.yield();
      return;
    }
  } catch {}

  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function nowMs(): number {
  try {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Crée un yielder à budget temps. Tant qu'une tranche de travail reste sous le
 * budget, aucune pause artificielle n'est ajoutée. Dès que le budget est dépassé,
 * une vraie macrotâche est rendue au navigateur pour laisser peindre et naviguer.
 */
export function createCooperativeYielder(budgetMs = 10): (force?: boolean) => Promise<void> {
  const budget = Math.max(4, Number(budgetMs) || 10);
  let lastYieldAt = nowMs();

  return async (force = false) => {
    const now = nowMs();
    if (!force && now - lastYieldAt < budget) return;
    await yieldToMainThread();
    lastYieldAt = nowMs();
  };
}

import type { AwenaRuntimeContext } from "./awena.types";

export const AWENA_CONTEXT_EVENT = "dc:awena-context";

/**
 * Pont ultra-léger entre les moteurs de jeu et Awena.
 * Les modes publient uniquement les informations utiles, sans dépendre du panneau UI.
 */
export function publishAwenaContext(context: Partial<AwenaRuntimeContext>): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(AWENA_CONTEXT_EVENT, { detail: context }));
  } catch {}
}

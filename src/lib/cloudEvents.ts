// ============================================
// src/lib/cloudEvents.ts
// Event bus ultra léger pour déclencher la sync cloud (debounced)
// ============================================

type CloudChangeListener = (reason: string) => void;

const listeners = new Set<CloudChangeListener>();

/**
 * Émet un signal "quelque chose a changé localement" -> cloudSync va debouncer le push.
 * reason = string debug (idb:store, ls:dc_dart_sets_v1, etc.)
 */
export function emitCloudChange(reason: string) {
  try {
    for (const fn of listeners) fn(reason);
  } catch {}
}

/**
 * Abonne une fonction aux changements locaux.
 * Retourne une fonction unsubscribe().
 */
export function onCloudChange(fn: CloudChangeListener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
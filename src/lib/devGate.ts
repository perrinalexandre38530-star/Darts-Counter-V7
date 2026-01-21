// ============================================
// src/lib/devGate.ts
// Dev gating helpers (Developer Mode)
//
// Rule:
// - Visual state stays driven ONLY by the feature flag (enabled/ready)
// - Interaction can be unlocked in Dev Mode, but ONLY for items that are already disabled
//
// This avoids accidental enabling of already-finished screens.
// ============================================

export function devVisuallyDisabled(enabledOrReady: boolean): boolean {
  return !enabledOrReady;
}

export function devClickable(enabledOrReady: boolean, devEnabled: boolean): boolean {
  return enabledOrReady || !!devEnabled;
}

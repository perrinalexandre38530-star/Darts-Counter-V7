export type DevGate = {
    enabled: boolean;       // l’état “terminé” (true) / “grisé” (false)
    alwaysEnabled?: boolean; // optionnel : ex Settings, Home…
  };
  
  export function computeGatedUi(
    gate: DevGate,
    dev: { shouldUnlockDisabledFeatures: boolean }
  ) {
    // Exceptions
    if (gate.alwaysEnabled) {
      return { clickable: true, visuallyDisabled: false };
    }
  
    // Dev ON : unlock même si enabled=false (mais on garde le visuel “grisé”)
    if (dev.shouldUnlockDisabledFeatures) {
      return { clickable: true, visuallyDisabled: !gate.enabled };
    }
  
    // Normal : l’UI suit gate.enabled
    return { clickable: gate.enabled, visuallyDisabled: !gate.enabled };
  }
  
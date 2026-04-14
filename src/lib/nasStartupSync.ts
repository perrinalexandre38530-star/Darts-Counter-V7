// NAS background sync intentionally disabled.
// Architecture cible: local only pendant l'usage, sync NAS strictement manuelle.
export function startNasBackgroundSync(_options?: { initialDelayMs?: number; intervalMs?: number }): void {
  try { console.info("[nas-bgsync] disabled (manual NAS sync only)"); } catch {}
}

export function stopNasBackgroundSync(): void {}

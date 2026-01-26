// ============================================
// StatsHub — point CENTRAL des stats
// - Ne calcule RIEN
// - Appelle l'existant
// - Centralise les écritures
// ============================================

import type { StatsSnapshot, GameMode, StatsScope } from "./types";

type StatsUpdater = (current: StatsSnapshot) => StatsSnapshot;

class StatsHub {
  private snapshots = new Map<string, StatsSnapshot>();

  private key(userId: string, mode: GameMode, scope: StatsScope) {
    return `${userId}:${mode}:${scope}`;
  }

  getSnapshot(
    userId: string,
    mode: GameMode,
    scope: StatsScope
  ): StatsSnapshot | null {
    return this.snapshots.get(this.key(userId, mode, scope)) ?? null;
  }

  initSnapshot(snapshot: StatsSnapshot) {
    this.snapshots.set(
      this.key(snapshot.userId, snapshot.mode, snapshot.scope),
      snapshot
    );
  }

  update(
    userId: string,
    mode: GameMode,
    scope: StatsScope,
    updater: StatsUpdater
  ) {
    const key = this.key(userId, mode, scope);
    const current = this.snapshots.get(key);
    if (!current) return;

    const next = updater(current);
    next.updatedAt = Date.now();
    this.snapshots.set(key, next);
  }

  exportAll(): StatsSnapshot[] {
    return Array.from(this.snapshots.values());
  }
}

export const statsHub = new StatsHub();

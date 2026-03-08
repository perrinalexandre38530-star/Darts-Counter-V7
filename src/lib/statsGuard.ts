
// src/lib/statsGuard.ts
// évite les crashs StatsHub si stats undefined

export function safeStats(stats: any) {
  if (!stats || typeof stats !== "object") {
    return {
      players: {},
      modes: {},
      totals: {}
    }
  }
  return stats
}

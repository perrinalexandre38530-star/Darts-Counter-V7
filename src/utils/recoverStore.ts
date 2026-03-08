
// ============================================
// recoverStore.ts
// récupération store corrompu
// ============================================

import type { Store } from "../lib/types"

export function recoverStore(store: any): Store {
  if (!store) {
    return createEmptyStore()
  }

  try {
    if (!store.profiles) store.profiles = []
    if (!store.history) store.history = []
    if (!store.stats) store.stats = {}
    if (!store.games) store.games = []

    return store
  } catch (e) {
    console.warn("Store recovery triggered", e)
    return createEmptyStore()
  }
}

function createEmptyStore(): Store {
  return {
    profiles: [],
    history: [],
    stats: {},
    games: [],
    activeProfileId: null
  } as any
}

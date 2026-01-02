// ============================================================
// src/training/TrainingClockStore.ts
// Store minimaliste pour Tour de l’horloge
// (Home v2 utilise hitRate / totalTimeSec / bestStreak)
// ============================================================

export const TrainingClockStore = {
    getSessions(profileId) {
      try {
        const raw = localStorage.getItem("dc_training_clock_sessions_v1");
        if (!raw) return [];
  
        const all = JSON.parse(raw);
        return all.filter((s) => s.profileId === profileId);
      } catch (e) {
        console.warn("[TrainingClockStore] parse error", e);
        return [];
      }
    },
  };
  
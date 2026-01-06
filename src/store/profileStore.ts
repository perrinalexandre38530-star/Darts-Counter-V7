// ============================================
// src/store/profileStore.ts
// Mini store RAM + persistence localStorage (best-effort)
// Permet d'avoir le profil Supabase dispo dès le boot
// ============================================

export type ProfileStoreState = {
  profile: any | null;
  setProfile: (p: any | null) => void;
  clear: () => void;
};

const LS_KEY = "dc_online_profile_v1";

function safeLoad(): any | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSave(p: any | null) {
  try {
    if (!p) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {}
}

// ✅ API minimale type "zustand-like" pour éviter d'ajouter une dépendance
let state: ProfileStoreState = {
  profile: safeLoad(),
  setProfile: (p) => {
    state.profile = p;
    safeSave(p);
  },
  clear: () => {
    state.profile = null;
    safeSave(null);
  },
};

export const useProfileStore = {
  getState: () => state,
};

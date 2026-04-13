// ============================================
// src/store/profileStore.ts
// Mini store RAM + persistence localStorage (best-effort)
// Permet d'avoir le profil Supabase dispo dès le boot
// ============================================

import { sanitizeAvatarDataUrl } from "../lib/avatarSafe";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../lib/imageStorageCodec";

export type ProfileStoreState = {
  profile: any | null;
  setProfile: (p: any | null) => void;
  clear: () => void;
};

const LS_KEY = "dc_online_profile_v1";

function sanitizeProfileForStorage(input: any | null) {
  if (!input || typeof input !== "object") return input;
  const next: any = { ...input };

  const avatarThumbDataUrl = sanitizeAvatarDataUrl(
    next.avatarThumbDataUrl ?? next.avatarDataUrl ?? next.avatar ?? next.avatar_url ?? null,
    140_000
  );
  if (avatarThumbDataUrl) {
    next.avatarThumbDataUrl = avatarThumbDataUrl;
    next.avatarDataUrl = avatarThumbDataUrl;
  } else {
    delete next.avatarThumbDataUrl;
    delete next.avatarDataUrl;
  }

  if (typeof next.avatar === "string" && next.avatar.startsWith("data:image/")) {
    delete next.avatar;
  }
  if (typeof next.avatar_url === "string" && next.avatar_url.startsWith("data:image/")) {
    delete next.avatar_url;
  }

  return next;
}

function safeLoad(): any | null {
  try {
    const raw = safeLocalStorageGetJson<any>(LS_KEY, null);
    return raw ? sanitizeProfileForStorage(raw) : null;
  } catch {
    return null;
  }
}

function safeSave(p: any | null) {
  try {
    if (!p) {
      localStorage.removeItem(LS_KEY);
      return;
    }

    const safeProfile = sanitizeProfileForStorage(p);
    safeLocalStorageSetJson(LS_KEY, safeProfile, {
      sanitizeImages: true,
      imageMaxChars: 380_000,
      compressAboveChars: 6_000,
    });
  } catch {}
}

let state: ProfileStoreState = {
  profile: safeLoad(),
  setProfile: (p) => {
    state.profile = sanitizeProfileForStorage(p);
    safeSave(state.profile);
  },
  clear: () => {
    state.profile = null;
    safeSave(null);
  },
};

export const useProfileStore = {
  getState: () => state,
};

// ============================================
// src/pages/Profiles.tsx
// Espace Profils avec menu interne
// - Vue MENU : "Créer avatar" / "Mon Profil" / "Amis" / "Profils locaux" / "BOAT"
// - Vue "Mon Profil" : profil connecté + mini-stats + infos personnelles + Amis
// - Vue "Profils locaux" : formulaire + carrousel stylé de profils locaux
// - Thème via ThemeContext + textes via LangContext
// ============================================

import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import type { Store, Profile } from "../lib/types";
import { getBasicProfileStats, type BasicProfileStats } from "../lib/statsBridge";
import { getBasicProfileStatsSync, purgeAllStatsForProfile } from "../lib/statsLiteIDB";
import { useTheme } from "../contexts/ThemeContext";
import { useLang, type Lang } from "../contexts/LangContext";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { onlineApi } from "../lib/onlineApi";
import type { ThemeId } from "../theme/themePresets";

import { sha256 } from "../lib/crypto";
import DartSetsPanel from "../components/DartSetsPanel";
import { saveStore } from "../lib/storage";

// 🔥 nouveau : bloc préférences joueur
import PlayerPrefsBlock from "../components/profile/PlayerPrefsBlock";
import OnlineProfileForm from "../components/OnlineProfileForm";

import { getAvatarCache as getAvatarCacheLib } from "../lib/avatarCache";

// Effet "shimmer" du nom joueur (copié de StatsHub)
const statsNameCss = `
.dc-stats-name-wrapper {
  position: relative;
  display: inline-block;
  font-weight: 900;
}

/* couche de base, couleur thème — SANS GROS HALO LUMINEUX */
.dc-stats-name-base {
  color: var(--dc-accent, #f6c256);
  text-shadow: none !important;
}

/* couche animée : gradient qui défile à l'intérieur des lettres */
.dc-stats-name-shimmer {
  position: absolute;
  inset: 0;
  color: transparent;

  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.08) 40%,
    rgba(255,255,255,0.55) 50%,
    rgba(255,255,255,0.08) 60%,
    transparent 100%
  );

  background-size: 200% 100%;
  background-position: 0% 0%;
  -webkit-background-clip: text;
  background-clip: text;

  animation: dcStatsNameShimmer 2.4s linear infinite;
  pointer-events: none;
}

@keyframes dcStatsNameShimmer {
  0% { background-position: -80% 0%; }
  100% { background-position: 120% 0%; }
}
`;

function useInjectStatsNameCss() {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("dc-stats-name-css")) return;
    const style = document.createElement("style");
    style.id = "dc-stats-name-css";
    style.innerHTML = statsNameCss;
    document.head.appendChild(style);
  }, []);
}

type View = "menu" | "me" | "locals" | "friends";

// ✅ TYPE UNIQUE (évite les collisions / erreurs TS et les patchs qui partent sur un mauvais type)
export type PrivateInfo = {
  nickname?: string;
  lastName?: string;
  firstName?: string;
  birthDate?: string;
  country?: string;
  city?: string;
  email?: string;
  phone?: string;
  password?: string;

  // lien compte online (hash d’email)
  onlineKey?: string;

  // prefs app
  appLang?: Lang;
  appTheme?: ThemeId;
};

/* ===== Helper lecture instantanée (mini-cache IDB + quick-stats) ===== */
function useBasicStats(playerId: string | undefined | null) {
  const empty = React.useMemo(
    () => ({
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
      wins: 0,
      games: 0,
      winRate: 0,
      darts: 0,
    }),
    []
  );

  if (!playerId) return empty;

  // 1) Lecture lite (IDB / localStorage "dc-lite-v1")
  const lite = getBasicProfileStatsSync(playerId); // avg3, bestVisit, bestCheckout, winPct, coPct, legs

  // 2) Lecture quick-stats (localStorage "dc-quick-stats")
  const basic = getBasicProfileStats(playerId); // games, darts, avg3, bestVisit, bestCheckout, wins

  const games = Number(
    (basic && basic.games) ?? (lite && (lite as any).legs) ?? 0
  );
  const wins = Number((basic && basic.wins) ?? 0);
  const darts = Number((basic && basic.darts) ?? 0);

  // avg3 : priorité au lite (plus complet), fallback quick-stats
  const avg3 =
    Number.isFinite(lite?.avg3) && lite!.avg3 > 0
      ? Number(lite!.avg3)
      : Number((basic && basic.avg3) ?? 0);

  const bestVisit = Math.max(
    Number(lite?.bestVisit ?? 0),
    Number(basic?.bestVisit ?? 0)
  );

  const bestCheckout = Math.max(
    Number(lite?.bestCheckout ?? 0),
    Number(basic?.bestCheckout ?? 0)
  );

  // winRate : si on a games/wins → on recalcule, sinon on prend winPct lite
  const winRate =
    games > 0 ? Math.round((wins / games) * 100) : Number(lite?.winPct ?? 0);

  return {
    avg3,
    bestVisit,
    bestCheckout,
    wins,
    games,
    winRate,
    darts,
  };
}

/* ----------------- Types Friends ----------------- */

type FriendLike = {
  id: string;
  name?: string;
  avatarDataUrl?: string;
  status?: "online" | "away" | "offline" | string;
  stats?: {
    avg3?: number;
    bestVisit?: number;
    bestCheckout?: number;
    winRate?: number;
    wins?: number;
    games?: number;
    legs?: number;
  };
};


// ============================================
// ✅ PROFILES CACHE (anti wipe store)
// - sauve la liste de profils en localStorage
// - réhydrate si un "loadStore" écrase profiles=[]
// ============================================
const PROFILES_CACHE_KEY = "dc-profiles-cache-v1";

function readProfilesCache(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_CACHE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as Profile[]) : [];
  } catch {
    return [];
  }
}

function writeProfilesCache(profiles: Profile[]) {
  try {
    localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(profiles || []));
  } catch {
    // ignore
  }
}


// ============================================
// ✅ AVATAR CACHE (anti overwrite store)
// - sauve avatarDataUrl / avatarUrl / avatarPath / avatarUpdatedAt
// - réhydrate si le store revient avec avatar vide
// ============================================
const AVATAR_CACHE_KEY = "dc-avatar-cache-v1";

type AvatarCacheEntry = {
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatarPath?: string | null;
  avatarUpdatedAt?: number | null;
};

function readAvatarCache(): Record<string, AvatarCacheEntry> {
  try {
    const raw = localStorage.getItem(AVATAR_CACHE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writeAvatarCache(
  profileId: string,
  patch: AvatarCacheEntry
) {
  try {
    const all = readAvatarCache();
    const prev = all[profileId] || {};
    all[profileId] = { ...prev, ...patch };
    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

function getAvatarCache(profileId: string | null | undefined): AvatarCacheEntry | null {
  if (!profileId) return null;
  const all = readAvatarCache();
  return all[profileId] || null;
}

// ============================================
// ✅ MERGE SAFE PROFILES (anti overwrite + anti "wipe")
// - protège avatarUrl/avatarDataUrl/avatarPath/avatarUpdatedAt
// - empêche qu’un store "partiel" (ex: []) wipe les profils
// - MAIS permet la suppression quand allowRemoval=true
// ============================================
function mergeProfilesSafe(
  prev: Profile[],
  next: Profile[],
  opts?: { allowRemoval?: boolean }
): Profile[] {
  const allowRemoval = !!opts?.allowRemoval;

  const prevById = new Map(prev.map((p) => [p.id, p] as const));
  const nextById = new Map(next.map((p) => [p.id, p] as const));

  // 1) On part de NEXT (ordre conservé)
  const merged: Profile[] = next.map((p) => {
    const old = prevById.get(p.id);
    if (!old) return p;

    return {
      ...old,
      ...p,
      // 🔒 champs protégés (jamais écrasés par undefined / null)
      avatarUrl: (p as any).avatarUrl ?? (old as any).avatarUrl,
      avatarDataUrl: (p as any).avatarDataUrl ?? (old as any).avatarDataUrl,
      avatarPath: (p as any).avatarPath ?? (old as any).avatarPath,
      avatarUpdatedAt: (p as any).avatarUpdatedAt ?? (old as any).avatarUpdatedAt,
    };
  });

  // 2) Anti-wipe : si NEXT oublie des profils (réhydratation partielle)
  //    on les conserve depuis PREV (sauf si suppression volontaire)
  if (!allowRemoval) {
    for (const p of prev) {
      if (!nextById.has(p.id)) {
        merged.push(p);
      }
    }
  }

  // 3) Petit garde-fou : si next est vide mais prev non vide, on garde prev
  //    (ça évite le cas "flash puis disparition" à cause d’un reset)
  if (!allowRemoval && next.length === 0 && prev.length > 0) {
    return prev;
  }

  return merged;
}

// ============================================
// ✅ Helper : construit un src d'avatar fiable
// priorité : preview > avatarUrl > avatarDataUrl
// + cache-bust si URL http(s) et avatarUpdatedAt connu
// ============================================
function buildAvatarSrc(opts: {
  preview?: string | null;
  avatarUrl?: string | null;
  avatarDataUrl?: string | null;
  avatarUpdatedAt?: number | null;
}) {
  const cacheBust =
    typeof opts.avatarUpdatedAt === "number" ? opts.avatarUpdatedAt : 0;

  const baseSrc =
    (opts.preview && opts.preview.trim()) ||
    (opts.avatarUrl && String(opts.avatarUrl).trim()) ||
    (opts.avatarDataUrl && String(opts.avatarDataUrl).trim()) ||
    "";

  if (!baseSrc) return "";

  // ✅ si URL http(s) => on ajoute ?v=... (seulement si on a avatarUpdatedAt)
  if (/^https?:\/\//.test(baseSrc) && cacheBust) {
    return baseSrc + (baseSrc.includes("?") ? "&" : "?") + "v=" + cacheBust;
  }
  return baseSrc;
}

/* ================================
   Page — Profils (router interne)
================================ */
export default function Profiles({
  store,
  update,
  setProfiles,
  autoCreate = false,
  go,
  params,
}: {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  setProfiles: (fn: (p: Profile[]) => Profile[]) => void;
  autoCreate?: boolean;
  go?: (tab: any, params?: any) => void;
  params?: any;
}) {
  // 🔥 injection du CSS shimmer une seule fois
  useInjectStatsNameCss();

  const {
    profiles = [],
    activeProfileId = null,
    selfStatus = "online",
  } = store;

    // ✅ Anti-wipe global : si un rehydrate remet profiles=[] après ajout,
  // on restaure depuis un cache local.
  React.useEffect(() => {
    if (profiles.length > 0) {
      writeProfilesCache(profiles);
      return;
    }

    const cached = readProfilesCache();
    if (!cached || cached.length === 0) return;

    console.warn("[Profiles] 🛟 PROFILES RESTORE from cache (anti-wipe)", {
      cachedLen: cached.length,
      cachedIds: cached.map((p) => p.id),
    });

    // restaure uniquement si store est vide
    setProfiles((prev) => {
      if (prev && prev.length > 0) return prev;
      return cached;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);

  // ============================================
  // ✅ WRAPPERS SAFE (ANTI-WIPE)
  // - setProfilesSafe : empêche qu’un “profiles=[]” écrase tout
  // - setProfilesReplace : autorise la suppression volontaire (delete)
  // ============================================
  const setProfilesSafe = React.useCallback(
    (buildNext: (prev: Profile[]) => Profile[]) => {
      setProfiles((prev) => {
        const next = buildNext(prev);
        const merged = mergeProfilesSafe(prev, next);
  
        console.log("[setProfilesSafe] prev -> next -> merged", {
          prevLen: prev.length,
          nextLen: next.length,
          mergedLen: merged.length,
          prevIds: prev.map((p) => p.id),
          nextIds: next.map((p) => p.id),
          mergedIds: merged.map((p) => p.id),
        });

        // ✅ keep cache in sync (anti flash)
        writeProfilesCache(merged);
  
        return merged;
      });
    },
    [setProfiles]
  );

  const setProfilesReplace = React.useCallback(
    (buildNext: (prev: Profile[]) => Profile[]) => {
      setProfiles((prev: Profile[]) => {
        const next = buildNext(prev);
        const merged = mergeProfilesSafe(prev, next, { allowRemoval: true });
        writeProfilesCache(merged);
        return merged;
      });
    },
    [setProfiles]
  );

  const friends: FriendLike[] = (store as any).friends ?? [];

  const { theme, themeId, setThemeId } = useTheme() as any;
  const { t, setLang, lang } = useLang();
  const auth = useAuthOnline();

  React.useEffect(() => {
    console.log("[Profiles] RENDER WATCH profiles=", profiles.length, {
      activeProfileId,
      ids: profiles.map((p) => p.id),
    });
  }, [profiles, activeProfileId]);


  // 🔥 Shimmer du nom "NINJA" (copie du Home)
  const primary = theme.primary ?? "#F6C256";
  const profileHeaderCss = `
    @keyframes profileNamePulse {
      0%,100% { transform: scale(1); text-shadow: 0 0 8px ${primary}55; }
      50% { transform: scale(1.03); text-shadow: 0 0 18px ${primary}AA; }
    }
    @keyframes profileNameShimmer {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
  `;

  const [view, setView] = React.useState<View>(
    params?.view === "me"
      ? "me"
      : params?.view === "locals"
      ? "locals"
      : params?.view === "friends"
      ? "friends"
      : "menu"
  );

    // ✅ FORCE auth UI (quand on vient de ONLINE)
    const forceAuth = !!params?.forceAuth;

    // ✅ Retour automatique après login (ex: revenir à ONLINE)
    const returnTo =
      (params?.returnTo as { tab?: any; params?: any } | undefined) ?? undefined;

  React.useEffect(() => {
    if (params?.view === "create_bot" && go) {
      go("profiles_bots");
    }
  }, [params?.view, go]);

  const [statsMap, setStatsMap] = React.useState<
    Record<string, BasicProfileStats | undefined>
  >({});

  function setActiveProfile(id: string | null) {
    // 1) on met à jour le store
    update((s) => ({ ...s, activeProfileId: id }));

    // 2) si un profil est sélectionné → on applique ses prefs app (lang + thème)
    if (!id) return;
    const p = profiles.find((p) => p.id === id);
    if (!p) return;

    const pi = ((p as any).privateInfo || {}) as {
      appLang?: Lang;
      appTheme?: ThemeId;
    };

    if (pi.appLang) {
      try {
        setLang(pi.appLang);
      } catch {
        /* ignore */
      }
    }
    if (pi.appTheme) {
      try {
        setThemeId(pi.appTheme);
      } catch {
        /* ignore */
      }
    }
  }

  function renameProfile(id: string, name: string) {
    setProfilesSafe((arr) => arr.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  async function changeAvatar(id: string, file: File) {
    const dataUrl = await read(file);
    const now = Date.now();
  
    // ✅ 0) Cache dédié ANTI-OVERWRITE
    writeAvatarCache(id, {
      avatarDataUrl: dataUrl,
      avatarUpdatedAt: now,
    });
  
    // 1) preview local immédiat (UX) => ON GARDE EN BASE64
    setProfilesSafe((arr) =>
      arr.map((p) =>
        p.id === id
          ? {
              ...p,
              avatarDataUrl: dataUrl,
              avatarUpdatedAt: now, // ✅ NEW
            }
          : p
      )
    );
  
    // 2) si connecté online : upload Supabase Storage -> URL publique
    if (auth.status === "signed_in") {
      const uid = auth.user?.id; // ✅ auth.uid()
      if (!uid) return;

      try {
        const { publicUrl } = await onlineApi.uploadAvatarImage({ dataUrl, folder: uid });
  
        const avatarPath = (() => {
          if (!publicUrl || typeof publicUrl !== "string") return undefined;
          const marker = "/storage/v1/object/public/avatars/";
          const i = publicUrl.indexOf(marker);
          if (i === -1) return undefined;
          return publicUrl.slice(i + marker.length);
        })();
  
        console.log("[profiles] avatar uploaded:", { id, publicUrl, avatarPath });
  
        // ✅ 0bis) Cache dédié ANTI-OVERWRITE
        writeAvatarCache(id, {
          avatarUrl: publicUrl,
          avatarPath,
          avatarUpdatedAt: Date.now(),
        });
  
        // ✅ IMPORTANT : on N'ECRASE PAS avatarDataUrl (base64)
        setProfilesSafe((arr) =>
          arr.map((p) =>
            p.id === id
              ? {
                  ...p,
                  avatarUrl: publicUrl,
                  avatarPath,
                  avatarUpdatedAt: Date.now(), // ✅ NEW
                }
              : p
          )
        );
      } catch (err) {
        console.warn("[profiles] uploadAvatarImage error:", err);
        // on garde le dataUrl local si l’upload échoue
      }
    }
  }

  async function delProfile(id: string) {
    const ok = window.confirm(
      "Supprimer ce profil local ET toutes ses stats associées sur cet appareil ?"
    );
    if (!ok) return;
  
    // 1) On calcule la prochaine liste de profils depuis la source STORE (référence)
    let nextStoreSnapshot: any = null;
  
    update((s: any) => {
      const prevProfiles = Array.isArray(s?.profiles) ? s.profiles : [];
      const nextProfiles = prevProfiles.filter((p: any) => p.id !== id);
  
      const nextActive =
        s?.activeProfileId === id ? (nextProfiles[0]?.id ?? null) : s?.activeProfileId ?? null;
  
      const nextStore = {
        ...s,
        profiles: nextProfiles,
        activeProfileId: nextActive,
      };
  
      nextStoreSnapshot = nextStore;
      return nextStore;
    });
  
    // 2) Persistance : on sauvegarde le snapshot store (la vraie source)
    try {
      if (nextStoreSnapshot) {
        await saveStore(nextStoreSnapshot);
      }
    } catch (e) {
      console.warn("[Profiles] saveStore after delete error", e);
    }
  
    // 3) UI local state (si tu en as un séparé) : on aligne aussi, en mode removal autorisé
    setProfilesReplace((arr) => (Array.isArray(arr) ? arr.filter((p) => p.id !== id) : []));
  
    // 4) Nettoie le mini-cache des stats côté UI
    setStatsMap((m) => {
      const c = { ...m };
      delete c[id];
      return c;
    });
  
    // 5) Purge stats locales
    try {
      await purgeAllStatsForProfile(id);
      console.log("[Profiles] Stats locales purgées pour le profil", id);
    } catch (e) {
      console.warn("[Profiles] Erreur purgeAllStatsForProfile", e);
    }
  
    console.log("[Profiles] ✅ Profil supprimé (store + ui + persist)", id);
  }
  

  async function addProfile(
    name: string,
    file?: File | null,
    privateInfo?: Partial<PrivateInfo>
  ) {
    const cleanName = (name || "").trim();
    if (!cleanName) return;
  
    const now = Date.now();
    const avatarDataUrl = file ? await read(file) : null;
  
    const p: Profile = {
      id:
        globalThis.crypto && "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `${now}-${Math.random().toString(16).slice(2)}`,
      name: cleanName,
      avatarDataUrl,
      avatarUpdatedAt: now,
      privateInfo:
        privateInfo && Object.keys(privateInfo).length ? { ...privateInfo } : undefined,
    };
  
    // ✅ 1) Calcule un nextStore depuis la vraie source (s), PAS depuis "store" capturé
    let nextStoreSnapshot: any = null;
  
    update((s: any) => {
      const nextProfiles = Array.isArray(s?.profiles) ? [...s.profiles, p] : [p];
  
      const nextStore = {
        ...s,
        profiles: nextProfiles,
        activeProfileId: s?.activeProfileId ?? p.id,
      };
  
      nextStoreSnapshot = nextStore;
      return nextStore;
    });
  
    // ✅ 2) Persistance : on sauvegarde LE snapshot qu’on vient de construire
    if (nextStoreSnapshot) {
      await saveStore(nextStoreSnapshot);
    }
  
    // ✅ 3) Si tu as un state local "profiles", mets-le juste pour l’UI (SANS saveStore ici)
    setProfilesSafe?.((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return [...arr, p];
    });
  
    console.log("[Profiles] ✅ Profil local créé + persisté", p.id);
  }
  
  const active = profiles.find((p) => p.id === activeProfileId) || null;

// ✅ AUTO-UPLOAD AVATAR : si connecté online et qu'on a encore un avatar en base64 (dataUrl)
// => on pousse vers Supabase Storage pour obtenir avatarUrl (synchro cross-device)
React.useEffect(() => {
  let cancelled = false;

  (async () => {
    if (!active?.id) return;
    if (auth.status !== "signed_in") return;

    const hasUrl = !!String((active as any)?.avatarUrl || "").trim();
    const dataUrl = String((active as any)?.avatarDataUrl || "").trim();

    if (hasUrl) return;
    if (!dataUrl.startsWith("data:image/")) return;

    try {
      const uid = auth.user?.id; // ✅ auth.uid()
      if (!uid) return;

      const { publicUrl } = await onlineApi.uploadAvatarImage({ dataUrl, folder: uid });
      if (cancelled) return;
      if (!publicUrl) return;

      const avatarPath = (() => {
        const marker = "/storage/v1/object/public/avatars/";
        const i = publicUrl.indexOf(marker);
        return i === -1 ? undefined : publicUrl.slice(i + marker.length);
      })();

      const now = Date.now();

      // ✅ update profile local (ça sera ensuite push dans le snapshot cloud)
      setProfilesSafe((arr) =>
        arr.map((p) =>
          p.id === active.id
            ? {
                ...p,
                avatarUrl: publicUrl,
                avatarPath,
                avatarUpdatedAt: now,
              }
            : p
        )
      );

      // ✅ met aussi ton cache anti-wipe si tu veux
      try {
        writeAvatarCache(active.id, {
          avatarUrl: publicUrl,
          avatarPath,
          avatarUpdatedAt: now,
        });
      } catch {}
    } catch (e) {
      console.warn("[Profiles] auto-upload avatar failed", e);
    }
  })();

  return () => {
    cancelled = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  active?.id,
  auth.status,
  (active as any)?.avatarUrl,
  (active as any)?.avatarDataUrl,
  (active as any)?.avatarUpdatedAt,
]);
  
  // ✅ Réhydratation anti-écrasement : si active revient sans avatar -> on remet depuis cache
  React.useEffect(() => {
    if (!active?.id) return;
  
    const hasAny =
      !!String((active as any)?.avatarUrl || "").trim() ||
      !!String((active as any)?.avatarDataUrl || "").trim();
  
    if (hasAny) return;
  
    const cached = getAvatarCacheLib(active.id);
    if (!cached) return;
  
    const cUrl = String(cached.avatarUrl || "").trim();
    const cData = String(cached.avatarDataUrl || "").trim();
    const cUpdated =
      typeof cached.avatarUpdatedAt === "number" ? cached.avatarUpdatedAt : undefined;
  
    if (!cUrl && !cData) return;
  
    console.warn("[Profiles] 🔁 rehydrate avatar from cache for", active.id, {
      avatarUrl: !!cUrl,
      avatarDataUrl: !!cData,
      avatarUpdatedAt: cUpdated,
    });
  
    setProfilesSafe((arr) =>
      arr.map((p) =>
        p.id === active.id
          ? {
              ...p,
              // on ne force que ce qui manque
              avatarUrl: (p as any).avatarUrl || (cUrl || undefined),
              avatarDataUrl: (p as any).avatarDataUrl || (cData || undefined),
              avatarPath: (p as any).avatarPath || (cached.avatarPath || undefined),
              avatarUpdatedAt: (p as any).avatarUpdatedAt || cUpdated || Date.now(),
            }
          : p
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    active?.id,
    (active as any)?.avatarUrl,
    (active as any)?.avatarDataUrl,
  ]);  

  async function resetActiveStats() {
    if (!active?.id) return;

    const ok = window.confirm(
      "Réinitialiser TOUTES les statistiques locales de ce profil ? (X01, Training, etc.)"
    );
    if (!ok) return;

    try {
      // 1) Purge StatsLite / caches internes pour ce profil
      await purgeAllStatsForProfile(active.id);
      console.log("[Profiles] StatsLite purgées pour", active.id);
    } catch (e) {
      console.warn("[Profiles] purgeAllStatsForProfile error", e);
    }

    try {
      // 2) Purge entrée quick-stats locale (dc-quick-stats)
      const QUICK_KEY = "dc-quick-stats";
      const raw = localStorage.getItem(QUICK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          delete parsed[active.id];
          localStorage.setItem(QUICK_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn("[Profiles] quick-stats reset error", e);
    }

    // 3) On force aussi le mini-cache UI à se vider pour ce profil
    setStatsMap((m) => {
      const copy = { ...m };
      delete copy[active.id];
      return copy;
    });

    alert("Statistiques locales de ce profil réinitialisées.");
  }

    // 🔁 Hydrate les infos privées (email / pays / surnom) depuis le compte online
    React.useEffect(() => {
      if (!active) return;
      if (auth.status !== "signed_in") return;
  
      const pi = ((active as any).privateInfo || {}) as PrivateInfo;
      const patch: Partial<PrivateInfo> = {};
  
      // Email online → privateInfo.email (si différent)
      const emailOnline = auth.user?.email?.trim().toLowerCase();
      if (emailOnline) {
        const emailLocal = (pi.email || "").trim().toLowerCase();
        if (emailLocal !== emailOnline) {
          patch.email = emailOnline;
        }
      }
  
      // Pseudo online → privateInfo.nickname (si différent)
      const nicknameOnline =
        auth.profile?.displayName || auth.user?.nickname || "";
      if (nicknameOnline) {
        const nicknameLocal = pi.nickname || active.name || "";
        if (nicknameLocal !== nicknameOnline) {
          patch.nickname = nicknameOnline;
        }
      }
  
      // Pays online → privateInfo.country (si différent)
      const countryOnline = auth.profile?.country || "";
      if (countryOnline) {
        const countryLocal = pi.country || "";
        if (countryLocal !== countryOnline) {
          patch.country = countryOnline;
        }
      }
  
      if (Object.keys(patch).length > 0) {
        patchActivePrivateInfo(patch);
      }
    }, [active?.id, auth.status, auth.profile, auth.user]);  

  // NEW : au chargement de la page, si un profil actif a des prefs app, on les applique
  React.useEffect(() => {
    if (!active) return;
    const pi = ((active as any).privateInfo || {}) as PrivateInfo;
    if (pi.appLang && pi.appLang !== lang) {
      try {
        setLang(pi.appLang);
      } catch {}
    }
    if (pi.appTheme && pi.appTheme !== themeId) {
      try {
        setThemeId(pi.appTheme);
      } catch {}
    }
  }, [active, lang, themeId, setLang, setThemeId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const pid = active?.id;
      if (!pid || statsMap[pid]) return;
      try {
        const s = await getBasicProfileStats(pid);
        if (!cancelled) setStatsMap((m) => ({ ...m, [pid]: s }));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  React.useEffect(() => {
    let stopped = false;
    (async () => {
      const ids = profiles.map((p) => p.id).slice(0, 48);
      for (const id of ids) {
        if (stopped) break;
        if (statsMap[id]) continue;
        try {
          const s = await getBasicProfileStats(id);
          if (!stopped) setStatsMap((m) => (m[id] ? m : { ...m, [id]: s }));
        } catch {}
      }
    })();
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  const activeAvg3D = React.useMemo<number | null>(() => {
    if (!active?.id) return null;
    const bs = getBasicProfileStatsSync(active.id);
    if (Number.isFinite(bs?.avg3)) return Number(bs.avg3);
    const inMap = statsMap[active.id];
    if (Number.isFinite((inMap as any)?.avg3d)) return Number((inMap as any).avg3d);
    if (Number.isFinite((inMap as any)?.avg3)) return Number((inMap as any).avg3);
    return null;
  }, [active?.id, statsMap]);

  const openAvatarCreator = React.useCallback(() => {
    go?.("avatar");
  }, [go]);

  // ✅ helper générique : patcher privateInfo de n’importe quel profil
  function patchProfilePrivateInfo(id: string, patch: Partial<PrivateInfo>) {
    setProfilesSafe((arr) =>
      arr.map((p) =>
        p.id === id
          ? {
              ...(p as any),
              privateInfo: {
                ...(p as any).privateInfo,
                ...patch,
              },
            }
          : p
      )
    );
  }

  function patchActivePrivateInfo(patch: Record<string, any>) {
    if (!active) return;
    patchProfilePrivateInfo(active.id, patch as any);
  }

  async function handlePrivateInfoSave(patch: PrivateInfo) {
    if (!active) return;

    if (patch.nickname && patch.nickname.trim() && patch.nickname !== active.name) {
      renameProfile(active.id, patch.nickname.trim());
    }

    if (auth.status === "signed_in") {
      try {
        await onlineApi.updateProfile({
          displayName: patch.nickname?.trim() || active.name || undefined,
          country: patch.country?.trim() || undefined,
        });
      } catch (err) {
        console.warn("[profiles] updateProfile online error:", err);
      }
    }
  }

  const onlineStatusForUi: "online" | "away" | "offline" =
    auth.status === "signed_in"
      ? (selfStatus as "online" | "away" | "offline")
      : "offline";

  async function handleQuit() {
    setActiveProfile(null);
    try {
      await auth.logout();
    } catch (err) {
      console.warn("[profiles] online logout error:", err);
    }
  }

  const onlineFriendsCount = friends.filter(
    (f) => f.status === "online" || f.status === "away"
  ).length;

  return (
    <>
      {/* Shimmer du nom de profil (utilise profileHeaderCss) */}
      <style
        dangerouslySetInnerHTML={{
          __html: profileHeaderCss,
        }}
      />

      {/* CSS layout apb + boutons actions */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .apb { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
          .apb__info { display:flex; flex-direction:column; align-items:flex-start; text-align:left; flex:1; min-width:220px; }

          /* Boutons actions profil actif : une seule ligne centrée */
          .apb__actions {
            display:flex;
            justify-content:center;
            align-items:center;
            width:100%;
            gap:12px;
            margin-top:14px;
            flex-wrap:nowrap;
          }

          /* Boutons actions profils locaux : une seule ligne centrée */
          .local-actions {
            display:flex;
            justify-content:center;
            align-items:center;
            width:100%;
            gap:12px;
            margin-top:10px;
            margin-bottom:10px;
            flex-wrap:nowrap;
          }

          @media (max-width: 600px){
            .apb { flex-direction:column; align-items:center; }
            .apb__info { align-items:center !important; text-align:center !important; }
            .apb__actions,
            .local-actions {
              justify-content:center !important;
              flex-wrap:wrap;
            }
          }
        `,
        }}
      />

      <div
        className="container"
        style={{ maxWidth: 760, background: theme.bg, color: theme.text }}
      >
        {view === "menu" ? (
          <ProfilesMenuView
            go={go}
            onSelectMe={() => setView("me")}
            onSelectLocals={() => setView("locals")}
            onSelectFriends={() => setView("friends")}
          />
        ) : (
          <>
            <button
              className="btn sm"
              onClick={() => setView("menu")}
              style={{
                marginBottom: 10,
                borderRadius: 999,
                paddingInline: 14,
                background: "transparent",
                border: `1px solid ${theme.borderSoft}`,
                fontSize: 12,
              }}
            >
              ← {t("profiles.menu.back", "Retour au menu Profils")}
            </button>

            {view === "me" && (
              <>
                <Card>
  {active && !forceAuth ? (
    <ActiveProfileBlock
      selfStatus={onlineStatusForUi}
      active={active}
      activeAvg3D={activeAvg3D}
      onToggleAway={() => {
        if (auth.status !== "signed_in") return;
        update((s) => ({
          ...s,
          selfStatus:
            s.selfStatus === "away"
              ? ("online" as const)
              : ("away" as const),
        }));
      }}
      onQuit={handleQuit}
      onEdit={(n, f) => {
        if (n && n !== active.name) renameProfile(active.id, n);
      
        if (f) {
          // ✅ C’EST LA SEULE SOURCE : changeAvatar gère local preview + upload online + URL publique
          changeAvatar(active.id, f);
        }
      }}
      onOpenStats={() => {
        if (!active?.id) return;
        go?.("statsHub", {
          tab: "stats",
          mode: "active",
          initialPlayerId: active.id,
          playerId: active.id,
          initialStatsSubTab: "dashboard",
        });
      }}
      onResetStats={resetActiveStats}
    />
  ) : (
    <UnifiedAuthBlock
      profiles={profiles}
      onConnect={(id) => {
        setActiveProfile(id);
        if (returnTo?.tab && go) go(returnTo.tab, returnTo.params);
      }}
      onCreate={addProfile}
      onHydrateProfile={(id, patch) => patchProfilePrivateInfo(id, patch)}
      autoFocusCreate={autoCreate}
    />
  )}
</Card>

                {/* 🔥 Panneau sets de fléchettes du profil actif */}
                {active && (
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <DartSetsPanel profile={active} />
                  </div>
                )}

                <Card
                  title={t(
                    "profiles.private.title",
                    "Informations personnelles"
                  )}
                >
                  {/* Bloc infos perso locales + sécurité */}
                  <PrivateInfoBlock
                    active={active}
                    onPatch={patchActivePrivateInfo}
                    onSave={handlePrivateInfoSave}
                  />

                  {/* 🔥 Préférences joueur (thème + langue / X01 par défaut, etc.) */}
                  <PlayerPrefsBlock
                    active={active}
                    onPatch={patchActivePrivateInfo}
                  />
                </Card>
              </>
            )}

            {view === "locals" && (
              <Card
                title={`${t(
                  "profiles.locals.title",
                  "Profils locaux"
                )} (${profiles.filter((p) => {
                  // Exclut le profil lié au compte Supabase + le profil actif
                  const isLinkedOnline =
                    String(p?.id || "").startsWith("online:") ||
                    Boolean((p as any)?.privateInfo?.onlineUserId);
                  return p.id !== activeProfileId && !isLinkedOnline;
                }).length})`}
              >
                {(() => {
                  const localOnly = profiles.filter((p) => {
                    const isLinkedOnline =
                      String(p?.id || "").startsWith("online:") ||
                      Boolean((p as any)?.privateInfo?.onlineUserId);
                    return !isLinkedOnline;
                  });
                  return (
                <LocalProfilesRefonte
                  profiles={localOnly}
                  activeProfileId={activeProfileId}
                  onCreate={addProfile}
                  onRename={renameProfile}
                  onPatchPrivateInfo={patchProfilePrivateInfo}
                  onAvatar={changeAvatar}
                  onDelete={delProfile}
                  onOpenAvatarCreator={openAvatarCreator}
                />
                  );
                })()}
              </Card>
            )}

            {view === "friends" && (
              <Card
                title={t(
                  "profiles.section.friends",
                  "Amis ({count})"
                ).replace("{count}", String(onlineFriendsCount))}
              >
                <FriendsMergedBlock friends={friends} />
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ================================
   Vue MENU PROFILS
================================ */

function ProfilesMenuView({
  go,
  onSelectMe,
  onSelectLocals,
  onSelectFriends,
}: {
  go?: (tab: any, params?: any) => void;
  onSelectMe: () => void;
  onSelectLocals: () => void;
  onSelectFriends: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  const CardBtn: React.FC<{
    title: string;
    subtitle: string;
    onClick?: () => void;
    badge?: string;
    disabled?: boolean;
  }> = ({ title, subtitle, onClick, badge, disabled }) => (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        border: `1px solid ${theme.borderSoft}`,
        background: theme.card,
        boxShadow: "0 16px 32px rgba(0,0,0,.40)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            letterSpacing: 0.6,
            fontSize: 14,
            color: primary,
          }}
        >
          {title}
        </div>
        <div
          className="subtitle"
          style={{
            fontSize: 12,
            marginTop: 4,
            color: theme.textSoft,
          }}
        >
          {subtitle}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
          marginLeft: 12,
        }}
      >
        {badge && (
          <span
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 999,
              background: `${primary}22`,
              border: `1px solid ${primary}88`,
              color: primary,
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        )}
        <span
          aria-hidden
          style={{
            fontSize: 18,
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          ▸
        </span>
      </div>
    </button>
  );

  return (
    <div style={{ paddingTop: 8, paddingBottom: 8 }}>
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: primary,
            textAlign: "center",
            width: "100%",
          }}
        >
          {t("profiles.menu.title", "PROFILS")}
        </div>
        <div
          className="subtitle"
          style={{ fontSize: 12, marginTop: 4, color: theme.textSoft }}
        >
          {t(
            "profiles.menu.subtitle",
            "Gère ton avatar, ton profil connecté, tes amis, les profils locaux et tes BOTS."
          )}
        </div>
      </div>

      <CardBtn
        title={t("profiles.menu.avatar.title", "CREER AVATAR")}
        subtitle={t(
          "profiles.menu.avatar.subtitle",
          "Personnalise ton médaillon avec le créateur d’avatar."
        )}
        onClick={() => go?.("avatar")}
      />

      <CardBtn
        title={t("profiles.menu.me.title", "MON PROFIL")}
        subtitle={t(
          "profiles.menu.me.subtitle",
          "Profil connecté, statut, mini-stats et informations personnelles."
        )}
        onClick={onSelectMe}
      />

      <CardBtn
        title={t("profiles.menu.friends.title", "AMIS")}
        subtitle={t(
          "profiles.menu.friends.subtitle",
          "Amis en ligne et absents."
        )}
        onClick={onSelectFriends}
      />

      <CardBtn
        title={t("profiles.menu.locals.title", "PROFILS LOCAUX")}
        subtitle={t(
          "profiles.menu.locals.subtitle",
          "Profils enregistrés sur cet appareil avec leurs statistiques."
        )}
        onClick={onSelectLocals}
      />

      <CardBtn
        title={t("profiles.menu.boat.title", "BOTS (CPU)")}
        subtitle={t(
          "profiles.menu.boat.subtitle",
          "Crée et gère tes joueurs virtuels contrôlés par l’IA."
        )}
        badge={t("profiles.menu.boat.badge", "NEW")}
        onClick={() => go?.("profiles_bots")}
      />
    </div>
  );
}

/* ================================
   Sous-composants communs
================================ */

function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <section
      className="card"
      style={{
        padding: 16,
        marginBottom: 14,
        borderRadius: 18,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: "0 18px 36px rgba(0,0,0,.35)",
      }}
    >
      {title && (
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: theme.primary,
            }}
          >
            {title}
          </h2>
        </div>
      )}
      {children}
    </section>
  );
}

function ActiveProfileBlock({
  active,
  activeAvg3D,
  selfStatus,
  onToggleAway,
  onQuit, // gardé pour compat mais pas utilisé ici
  onEdit,
  onOpenStats,
  onResetStats,
}: {
  active: Profile;
  activeAvg3D: number | null;
  selfStatus: "online" | "away" | "offline";
  onToggleAway: () => void;
  onQuit: () => void;
  onEdit: (name: string, avatar?: File | null) => void;
  onOpenStats?: () => void;
  onResetStats?: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  const AVATAR = 96;
  const BORDER = 8;
  const MEDALLION = AVATAR + BORDER;
  const STAR = 14;

  const statusLabelKey =
    selfStatus === "away"
      ? "profiles.status.away"
      : selfStatus === "offline"
      ? "profiles.status.offline"
      : "profiles.status.online";

  const statusLabel = t(
    statusLabelKey,
    selfStatus === "away"
      ? "Absent"
      : selfStatus === "offline"
      ? "Hors ligne"
      : "En ligne"
  );

  const statusColor =
    selfStatus === "away"
      ? "#F6C256"
      : selfStatus === "offline"
      ? "#9AA0AA"
      : "#1FB46A";

  // =========================
  // ÉTAT ÉDITION
  // =========================
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(active?.name || "");
  const [editFile, setEditFile] = React.useState<File | null>(null);
  const [editPreview, setEditPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setEditName(active?.name || "");
    setEditFile(null);
    setEditPreview(null);
    setIsEditing(false);
  }, [active?.id]);

  React.useEffect(() => {
    if (!editFile) {
      setEditPreview(null);
      return;
    }
    const r = new FileReader();
    r.onload = () => setEditPreview(String(r.result));
    r.readAsDataURL(editFile);
  }, [editFile]);

  function handleAvatarClick() {
    if (!isEditing) return;
    fileInputRef.current?.click();
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditFile(null);
    setEditPreview(null);
    setEditName(active?.name || "");
  }

  function handleSaveEdit() {
    const trimmed = editName.trim() || active?.name || "";
    onEdit(trimmed, editFile || undefined);
    setIsEditing(false);
    setEditFile(null);
    setEditPreview(null);
  }

  // =========================
  // ✅ SOURCE UNIQUE AVATAR (via helper)
  // priorité : preview > avatarUrl > avatarDataUrl
  // + cache-bust anti Supabase / SW / navigateur
  // =========================
  const avatarSrc = buildAvatarSrc({
    preview: editPreview,
    avatarUrl: String((active as any)?.avatarUrl || ""),
    avatarDataUrl: String((active as any)?.avatarDataUrl || ""),
    avatarUpdatedAt: (active as any)?.avatarUpdatedAt ?? null,
  });

  // LOGS DEBUG (volontairement conservés)
  React.useEffect(() => {
    console.log("[ActiveProfileBlock] id =", active?.id);
    console.log("[ActiveProfileBlock] avatarUrl =", (active as any)?.avatarUrl);
    console.log(
      "[ActiveProfileBlock] avatarDataUrl =",
      (active as any)?.avatarDataUrl
    );
    console.log(
      "[ActiveProfileBlock] avatarUpdatedAt =",
      (active as any)?.avatarUpdatedAt
    );
    console.log("[ActiveProfileBlock] avatarSrc =", avatarSrc);
  }, [
    active?.id,
    (active as any)?.avatarUrl,
    (active as any)?.avatarDataUrl,
    (active as any)?.avatarUpdatedAt,
    avatarSrc,
  ]);

  // =========================
  // STYLES BOUTONS
  // =========================
  const pillBtnBase: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    maxWidth: 120,
    borderRadius: 999,
    border: `1px solid ${primary}AA`,
    background: `linear-gradient(135deg, ${primary}33, ${primary}99)`,
    color: "#000",
    fontWeight: 800,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    padding: "6px 8px",
    boxShadow: "0 8px 16px rgba(0,0,0,.45)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const pillBtnGhost: React.CSSProperties = {
    ...pillBtnBase,
    background: `linear-gradient(135deg, ${primary}11, ${primary}55)`,
    color: "#fff",
  };

  const pillBtnDanger: React.CSSProperties = {
    ...pillBtnBase,
    background: "linear-gradient(135deg, #ff4b5c, #ff8a80)",
    border: "1px solid #ffb3b3",
    color: "#000",
  };

  return (
    <div className="apb">
      {/* input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
      />

      {/* MÉDAILLON + AVATAR */}
      <div
        style={{
          width: MEDALLION,
          height: MEDALLION,
          borderRadius: "50%",
          position: "relative",
          cursor: isEditing ? "pointer" : "default",
          margin: "0 auto",
        }}
        onClick={handleAvatarClick}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -(STAR / 2),
            top: -(STAR / 2),
            width: MEDALLION + STAR,
            height: MEDALLION + STAR,
            pointerEvents: "none",
          }}
        >
          <ProfileStarRing
            anchorSize={MEDALLION}
            gapPx={-2}
            starSize={STAR}
            stepDeg={10}
            avg3d={activeAvg3D ?? 0}
          />
        </div>

        {isEditing && (
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 9,
              fontWeight: 700,
              background: "rgba(0,0,0,.7)",
              border: `1px solid ${primary}`,
            }}
          >
            {t("profiles.edit.avatarHint", "Changer")}
          </div>
        )}

        <ProfileAvatar
          size={AVATAR}
          dataUrl={avatarSrc}
          label={active?.name?.[0]?.toUpperCase() || "?"}
          showStars={false}
        />
      </div>

      {/* TEXTE + ACTIONS */}
      <div className="apb__info">
        <div style={{ marginBottom: 6, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => onOpenStats?.()}
            style={{ background: "transparent", border: "none" }}
          >
            <span
              className="dc-stats-name-wrapper"
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                // @ts-ignore
                "--dc-accent": primary,
              }}
            >
              <span className="dc-stats-name-base">{active?.name || "—"}</span>
              <span className="dc-stats-name-shimmer">
                {active?.name || "—"}
              </span>
            </span>
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <StatusDot kind={selfStatus} />
          <span style={{ color: statusColor }}>{statusLabel}</span>
        </div>

        {active?.id && (
          <div style={{ marginTop: 8 }}>
            <GoldMiniStats profileId={active.id} />
          </div>
        )}

        <div className="row apb__actions" style={{ gap: 6, marginTop: 12 }}>
          <button
            className="btn sm"
            onClick={() => setIsEditing((v) => !v)}
            style={pillBtnGhost}
          >
            {t("profiles.locals.actions.edit", "EDITER")}
          </button>

          <button className="btn sm" onClick={onToggleAway} style={pillBtnBase}>
            {selfStatus === "away" ? "EN LIGNE" : "ABSENT"}
          </button>

          {onResetStats && (
            <button
              className="btn sm"
              onClick={onResetStats}
              style={pillBtnDanger}
            >
              RESET STATS
            </button>
          )}
        </div>

        {isEditing && (
          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button className="btn sm" onClick={handleCancelEdit}>
              Annuler
            </button>
            <button className="btn ok sm" onClick={handleSaveEdit}>
              Enregistrer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------ Bloc INFOS PERSONNELLES + SÉCURITÉ ------ */

function PrivateInfoBlock({
  active,
  onPatch,
  onSave,
}: {
  active: Profile | null;
  onPatch: (patch: Partial<PrivateInfo>) => void;
  onSave?: (full: PrivateInfo) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();

  // ✅ initial stable : dépend de l'id + des champs sources (évite reset à chaque render)
  const initial: PrivateInfo = React.useMemo(() => {
    const pi = ((active as any)?.privateInfo || {}) as PrivateInfo;
    return {
      nickname: String(pi.nickname || ""),
      lastName: String(pi.lastName || ""),
      firstName: String(pi.firstName || ""),
      birthDate: String(pi.birthDate || ""),
      country: String(pi.country || ""),
      city: String(pi.city || ""),
      email: String(pi.email || ""),
      phone: String(pi.phone || ""),
      password: String(pi.password || ""),
      onlineKey: pi.onlineKey, // 👈 on le garde
      appLang: pi.appLang,
      appTheme: pi.appTheme,
    };
  }, [
    (active as any)?.id,
    (active as any)?.privateInfo?.nickname,
    (active as any)?.privateInfo?.lastName,
    (active as any)?.privateInfo?.firstName,
    (active as any)?.privateInfo?.birthDate,
    (active as any)?.privateInfo?.country,
    (active as any)?.privateInfo?.city,
    (active as any)?.privateInfo?.email,
    (active as any)?.privateInfo?.phone,
    (active as any)?.privateInfo?.password,
    (active as any)?.privateInfo?.onlineKey,
    (active as any)?.privateInfo?.appLang,
    (active as any)?.privateInfo?.appTheme,
  ]);

  const [fields, setFields] = React.useState<PrivateInfo>(initial);
  const [showPassword, setShowPassword] = React.useState(false);

  // sécurité
  const [newPass, setNewPass] = React.useState("");
  const [newPass2, setNewPass2] = React.useState("");
  const [passError, setPassError] = React.useState<string | null>(null);

  // ✅ reset UNIQUEMENT quand on change de profil actif (id)
  const lastIdRef = React.useRef<string>("");

  React.useEffect(() => {
    const id = String((active as any)?.id || "");
    if (!id) return;

    if (lastIdRef.current !== id) {
      lastIdRef.current = id;
      setFields(initial);
      setShowPassword(false);
      setNewPass("");
      setNewPass2("");
      setPassError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(active as any)?.id]); // <-- seulement l'id
function handleChange<K extends keyof PrivateInfo>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleCancel() {
    setFields(initial);
    setShowPassword(false);
    setNewPass("");
    setNewPass2("");
    setPassError(null);
  }

  function handleSubmit() {
    const patch: PrivateInfo = { ...fields };

    // === Nouveau mot de passe ?
    if (newPass || newPass2) {
      if (newPass !== newPass2) {
        setPassError(
          t(
            "profiles.private.passMismatch",
            "Les mots de passe ne correspondent pas."
          )
        );
        return;
      }
      if (newPass.length < 6) {
        setPassError(
          t(
            "profiles.private.passTooShort",
            "Mot de passe trop court (min. 6 caractères)."
          )
        );
        return;
      }

      patch.password = newPass;
    }

    setPassError(null);

    onPatch(patch);
    onSave?.(patch);

    setNewPass("");
    setNewPass2("");
  }

  if (!active) {
    return (
      <div className="subtitle">
        {t(
          "profiles.private.noActive",
          "Aucun profil n’est actuellement sélectionné."
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ====== INFOS PERSONNELLES ====== */}
      <div
        className="subtitle"
        style={{ fontSize: 12, color: theme.textSoft }}
      >
        {t(
          "profiles.private.hint",
          "Ces informations restent locales et privées."
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <PrivateField
          label={t("profiles.private.nickname", "Surnom")}
          value={fields.nickname || ""}
          onChange={(v) => handleChange("nickname", v)}
        />
        <PrivateField
          label={t("profiles.private.firstName", "Prénom")}
          value={fields.firstName || ""}
          onChange={(v) => handleChange("firstName", v)}
        />
        <PrivateField
          label={t("profiles.private.lastName", "Nom")}
          value={fields.lastName || ""}
          onChange={(v) => handleChange("lastName", v)}
        />
        <PrivateField
          label={t("profiles.private.birthDate", "Date de naissance")}
          type="date"
          value={fields.birthDate || ""}
          onChange={(v) => handleChange("birthDate", v)}
        />
        <PrivateField
          label={t("profiles.private.country", "Pays")}
          value={fields.country || ""}
          onChange={(v) => handleChange("country", v)}
        />
        <PrivateField
          label={t("profiles.private.city", "Ville")}
          value={fields.city || ""}
          onChange={(v) => handleChange("city", v)}
        />
        <PrivateField
          label={t("profiles.private.email", "Email")}
          type="email"
          value={fields.email || ""}
          onChange={(v) => handleChange("email", v)}
        />
        <PrivateField
          label={t("profiles.private.phone", "Téléphone")}
          type="tel"
          value={fields.phone || ""}
          onChange={(v) => handleChange("phone", v)}
        />

        {/* mot de passe actuel */}
        <label
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          <span style={{ color: theme.textSoft }}>
            {t("profiles.private.password", "Mot de passe actuel")}
          </span>
          <div
            style={{ display: "flex", gap: 6, alignItems: "center" }}
          >
            <input
              type={showPassword ? "text" : "password"}
              className="input"
              value={fields.password || ""}
              onChange={(e) => handleChange("password", e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn sm"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword
                ? t("common.hide", "Masquer")
                : t("common.show", "Afficher")}
            </button>
          </div>
        </label>
      </div>

      {/* ====== SÉCURITÉ ====== */}
      <div
        style={{
          marginTop: 6,
          fontWeight: 800,
          fontSize: 13,
          color: theme.primary,
        }}
      >
        {t("profiles.private.security", "Sécurité")}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <PrivateField
          label={t(
            "profiles.private.newPassword",
            "Nouveau mot de passe"
          )}
          type="password"
          value={newPass}
          onChange={(v) => setNewPass(v)}
        />
        <PrivateField
          label={t(
            "profiles.private.newPasswordConfirm",
            "Confirmer nouveau mot de passe"
          )}
          type="password"
          value={newPass2}
          onChange={(v) => setNewPass2(v)}
        />

        {passError && (
          <div style={{ fontSize: 11, color: "#ff6666" }}>{passError}</div>
        )}
      </div>

      {/* BOUTONS */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn sm" onClick={handleCancel}>
          {t("common.cancel", "Annuler")}
        </button>
        <button className="btn ok sm" onClick={handleSubmit}>
          {t("common.save", "Enregistrer")}
        </button>
      </div>
    </div>
  );
}

function PrivateField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const { theme } = useTheme();
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 12,
      }}
    >
      <span style={{ color: theme.textSoft }}>{label}</span>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: 13 }}
      />
    </label>
  );
}

/* ------ Bloc AMIS FUSIONNÉ ------ */

function FriendsMergedBlock({ friends }: { friends: FriendLike[] }) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [open, setOpen] = React.useState(true);

  const order: Record<string, number> = { online: 0, away: 1, offline: 2 };

  const merged = [...friends]
    .filter((f) => f.status === "online" || f.status === "away")
    .sort((a, b) => {
      const sa = order[(a.status as string) ?? "offline"] ?? 2;
      const sb = order[(b.status as string) ?? "offline"] ?? 2;
      if (sa !== sb) return sa - sb;
      return (a.name || "").localeCompare(b.name || "");
    });

  return (
    <div>
      <button
        className="row-between"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          background: "transparent",
          color: theme.text,
          border: 0,
          padding: "4px 0",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        <span>
          {t("profiles.friends.header", "Amis ({count})").replace(
            "{count}",
            String(merged.length)
          )}
        </span>
        <span
          className="subtitle"
          aria-hidden
          style={{
            display: "inline-block",
            transform: `rotate(${open ? 0 : -90}deg)`,
            transition: "transform .15s ease",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="list" style={{ marginTop: 6 }}>
          {merged.length === 0 ? (
            <div className="subtitle">
              {t("profiles.friends.empty", "Aucun ami pour l’instant")}
            </div>
          ) : (
            merged.map((f) => {
              const AVA = 44;
              const MEDALLION = AVA;
              const STAR = 8;

              const stats: any = f.stats || {};
              const avg = Number(stats.avg3 ?? 0);
              const best = Number(stats.bestVisit ?? 0);
              const winRate = (() => {
                if (Number.isFinite(stats.winRate)) return Math.round(stats.winRate);
                const wins = Number(stats.wins ?? 0);
                const games = Number(stats.games ?? 0);
                if (games > 0) return Math.round((wins / games) * 100);
                return 0;
              })();

              return (
                <div
                  className="item"
                  key={f.id}
                  style={{
                    background: theme.bg,
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    className="row"
                    style={{ gap: 10, minWidth: 0, flex: 1 }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: AVA,
                        height: AVA,
                        flex: "0 0 auto",
                      }}
                    >
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: -(STAR / 2),
                          top: -(STAR / 2),
                          width: MEDALLION + STAR,
                          height: MEDALLION + STAR,
                          pointerEvents: "none",
                        }}
                      >
                        <ProfileStarRing
                          anchorSize={MEDALLION}
                          gapPx={2}
                          starSize={STAR}
                          stepDeg={10}
                          avg3d={avg}
                        />
                      </div>

                      <ProfileAvatar
                        size={AVA}
                        dataUrl={buildAvatarSrc({
                          avatarUrl: (f as any)?.avatarUrl || null,
                          avatarDataUrl: (f as any)?.avatarDataUrl || null,
                          avatarUpdatedAt: (f as any)?.avatarUpdatedAt ?? null,
                        })}
                        label={f.name?.[0]?.toUpperCase() || "?"}
                        showStars={false}
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          textAlign: "left",
                        }}
                      >
                        {f.name || "—"}
                      </div>
                      <div
                        className="subtitle"
                        style={{ fontSize: 11, whiteSpace: "nowrap" }}
                      >
                        {t(
                          "profiles.friends.stats",
                          "Moy/3 : {avg} · Best : {best} · Win : {win}%"
                        )
                          .replace(
                            "{avg}",
                            (Math.round(avg * 10) / 10).toFixed(1)
                          )
                          .replace("{best}", String(best))
                          .replace("{win}", String(winRate))}
                      </div>
                    </div>
                  </div>

                  <span
                    className="subtitle"
                    style={{ whiteSpace: "nowrap", fontSize: 11 }}
                  >
                    {f.status === "online"
                      ? t("status.online", "En ligne")
                      : t("status.away", "Absent")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ------ Bloc connexion + création de compte ------ */

function UnifiedAuthBlock({
  profiles,
  onConnect,
  onCreate,
  onHydrateProfile,
  autoFocusCreate = false,
}: {
  profiles: Profile[];
  onConnect: (id: string) => void;
  onCreate: (
    name: string,
    file?: File | null,
    privateInfo?: Partial<{
      nickname?: string;
      lastName?: string;
      firstName?: string;
      birthDate?: string;
      country?: string;
      city?: string;
      email?: string;
      phone?: string;
      password?: string;
      onlineKey?: string;
      appLang?: Lang;
      appTheme?: ThemeId;
    }>
  ) => void;
  onHydrateProfile?: (
    id: string,
    patch: Partial<{
      nickname?: string;
      lastName?: string;
      firstName?: string;
      birthDate?: string;
      country?: string;
      city?: string;
      email?: string;
      phone?: string;
      password?: string;
      onlineKey?: string;
      appLang?: Lang;
      appTheme?: ThemeId;
    }>
  ) => void;
  autoFocusCreate?: boolean;
}) {
  const { t, setLang, lang } = useLang();
  const { theme, themeId, setThemeId } = useTheme() as any;
  const { signup: onlineSignup, login: onlineLogin } = useAuthOnline();

  const primary = theme.primary as string;

  type PrivateInfo = {
    nickname?: string;
    lastName?: string;
    firstName?: string;
    birthDate?: string;
    country?: string;
    city?: string;
    email?: string;
    phone?: string;
    password?: string;
    onlineKey?: string;
    appLang?: Lang;
    appTheme?: ThemeId;
  };

  // Connexion
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Création
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // thème + langue appliqués à l’app
  const [uiTheme, setUiTheme] = React.useState<ThemeId>(
    (themeId as ThemeId) || "gold"
  );
  const [uiLang, setUiLangState] = React.useState<Lang>(lang);

  const createRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (autoFocusCreate) createRef.current?.focus();
  }, [autoFocusCreate]);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const r = new FileReader();
    r.onload = () => setPreview(String(r.result));
    r.readAsDataURL(file);
  }, [file]);

  // listes thèmes et langues (mêmes que Settings.tsx)
  const themeOptions: { id: ThemeId; label: string }[] = React.useMemo(
    () => [
      { id: "gold", label: t("settings.theme.gold.label", "Or néon") },
      { id: "pink", label: t("settings.theme.pink.label", "Rose fluo") },
      {
        id: "petrol",
        label: t("settings.theme.petrol.label", "Bleu pétrole"),
      },
      { id: "green", label: t("settings.theme.green.label", "Vert néon") },
      { id: "magenta", label: t("settings.theme.magenta.label", "Magenta") },
      { id: "red", label: t("settings.theme.red.label", "Rouge") },
      { id: "orange", label: t("settings.theme.orange.label", "Orange") },
      { id: "white", label: t("settings.theme.white.label", "Blanc") },
      {
        id: "blueOcean",
        label: t("settings.theme.blueOcean.label", "Bleu océan"),
      },
      {
        id: "limeYellow",
        label: t("settings.theme.limeYellow.label", "Vert jaune"),
      },
      { id: "sage", label: t("settings.theme.sage.label", "Vert sauge") },
      { id: "skyBlue", label: t("settings.theme.skyBlue.label", "Bleu pastel") },
      {
        id: "darkTitanium",
        label: t("settings.theme.darkTitanium.label", "Titane sombre"),
      },
      {
        id: "darkCarbon",
        label: t("settings.theme.darkCarbon.label", "Carbone"),
      },
      {
        id: "darkFrost",
        label: t("settings.theme.darkFrost.label", "Givre sombre"),
      },
      {
        id: "darkObsidian",
        label: t("settings.theme.darkObsidian.label", "Obsidienne"),
      },
    ],
    [t]
  );

  const langOptions: { id: Lang; label: string }[] = React.useMemo(
    () => [
      { id: "fr", label: t("lang.fr", "Français") },
      { id: "en", label: t("lang.en", "English") },
      { id: "es", label: t("lang.es", "Español") },
      { id: "de", label: t("lang.de", "Deutsch") },
      { id: "it", label: t("lang.it", "Italiano") },
      { id: "pt", label: t("lang.pt", "Português") },
      { id: "nl", label: t("lang.nl", "Nederlands") },
      { id: "ru", label: t("lang.ru", "Русский") },
      { id: "zh", label: t("lang.zh", "中文") },
      { id: "ja", label: t("lang.ja", "日本語") },
      { id: "ar", label: t("lang.ar", "العربية") },
      { id: "hi", label: t("lang.hi", "हिन्दी") },
      { id: "tr", label: t("lang.tr", "Türkçe") },
      { id: "da", label: t("lang.da", "Dansk") },
      { id: "no", label: t("lang.no", "Norsk") },
      { id: "sv", label: t("lang.sv", "Svenska") },
      { id: "is", label: t("lang.is", "Íslenska") },
      { id: "pl", label: t("lang.pl", "Polski") },
      { id: "ro", label: t("lang.ro", "Română") },
      { id: "sr", label: t("lang.sr", "Српски") },
      { id: "hr", label: t("lang.hr", "Hrvatski") },
      { id: "cs", label: t("lang.cs", "Čeština") },
    ],
    [t]
  );

  // LOGIN
  async function submitLogin() {
    const emailNorm = loginEmail.trim().toLowerCase();
    const pass = loginPassword;

    if (!emailNorm || !pass) {
      setLoginError(
        t(
          "profiles.auth.login.missing",
          "Merci de renseigner l’email et le mot de passe."
        )
      );
      return;
    }

    setLoginError(null);

    // 1) On tente la connexion online
    try {
      await onlineLogin({
        email: emailNorm,
        password: pass,
        nickname: undefined,
      });
    } catch (err) {
      console.warn("[profiles] online login error:", err);
      setLoginError(
        t(
          "profiles.auth.login.error",
          "Email ou mot de passe incorrect, ou compte inexistant."
        )
      );
      return;
    }

    // 2) On calcule une clé stable (hash d’email) pour ce compte
    let onlineKey: string | null = null;
    try {
      onlineKey = await sha256(emailNorm);
    } catch (err) {
      console.warn("[profiles] sha256 error:", err);
    }

    // 3) On cherche d’abord par onlineKey, sinon par email
    let match =
      profiles.find((p) => {
        const pi = ((p as any).privateInfo || {}) as PrivateInfo;
        const pe = (pi.email || "").trim().toLowerCase();
        const ok = pi.onlineKey || null;

        if (onlineKey && ok === onlineKey) return true;
        if (pe && pe === emailNorm) return true;
        return false;
      }) || null;

    // 4) Si aucun profil local ne correspond
    if (!match) {
      if (profiles.length > 0) {
        // 👉 On RÉUTILISE un profil local existant
        // (pour ne pas perdre avatar + infos déjà saisies)
        match = profiles[0];

        const pi = ((match as any).privateInfo || {}) as PrivateInfo;
        const patched: Partial<PrivateInfo> = {
          ...pi,
          email: emailNorm,
          password: pass,
          onlineKey: onlineKey || pi.onlineKey,
        };

        onHydrateProfile?.(match.id, patched);
      } else {
        // 👉 Aucun profil local du tout → on en crée un (cas tout neuf)
        let displayName = emailNorm;
        try {
          const session = await onlineApi.getCurrentSession();
          displayName =
            session?.user.nickname ||
            session?.user.email ||
            emailNorm;
        } catch (err) {
          console.warn("[profiles] getCurrentSession after login error:", err);
        }

        const privateInfo: Partial<PrivateInfo> = {
          email: emailNorm,
          password: pass,
          onlineKey: onlineKey || undefined,
        };

        onCreate(displayName, null, privateInfo);
        return;
      }
    }

    // 5) Si un profil existe déjà, on s'assure qu'il a bien l’onlineKey
    const pi = ((match as any).privateInfo || {}) as PrivateInfo;
    if (!pi.onlineKey && onlineKey) {
      const patched: Partial<PrivateInfo> = {
        ...pi,
        onlineKey,
      };
      onHydrateProfile?.(match.id, patched);
    }

    // 6) On sélectionne ce profil comme actif
    onConnect(match.id);
  }

  async function submitCreate() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password;
    const trimmedPass2 = password2;

    if (!trimmedName || !trimmedEmail || !trimmedPass) {
      alert(
        t(
          "profiles.auth.create.missing",
          "Merci de renseigner au minimum le nom du profil, l’email et le mot de passe."
        )
      );
      return;
    }

    if (trimmedPass !== trimmedPass2) {
      alert(
        t(
          "profiles.auth.create.passwordMismatch",
          "Les mots de passe ne correspondent pas."
        )
      );
      return;
    }

    if (!country.trim()) {
      alert(
        t(
          "profiles.auth.create.countryMissing",
          "Merci de renseigner ton pays."
        )
      );
      return;
    }

    // Clé online stable
    let onlineKey: string | null = null;
    try {
      onlineKey = await sha256(trimmedEmail);
    } catch (err) {
      console.warn("[profiles] sha256 error (create):", err);
    }

    // On vérifie qu’on n’a pas déjà un profil pour cet email / cette clé
    const already = profiles.find((p) => {
      const pi = ((p as any).privateInfo || {}) as PrivateInfo;
      const pe = (pi.email || "").trim().toLowerCase();
      const ok = pi.onlineKey || null;

      if (onlineKey && ok === onlineKey) return true;
      if (pe && pe === trimmedEmail) return true;
      return false;
    });

    if (already) {
      alert(
        t(
          "profiles.auth.create.emailExists",
          "Un compte existe déjà avec cet email."
        )
      );
      return;
    }

    const privateInfo: Partial<PrivateInfo> = {
      email: trimmedEmail,
      password: trimmedPass,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate || "",
      country: country || "",
      appLang: uiLang,
      appTheme: uiTheme,
      onlineKey: onlineKey || undefined,
    };

    // Profil local (+ stats, etc.)
    onCreate(trimmedName, file, privateInfo);

    // Applique immédiatement thème + langue à l’app
    try {
      setLang(uiLang);
    } catch {}
    try {
      setThemeId(uiTheme);
    } catch {}

    // Et on tente la création du compte online lié
    try {
      await onlineSignup({
        email: trimmedEmail,
        nickname: trimmedName,
        password: trimmedPass,
      });
    } catch (err) {
      console.warn("[profiles] online signup error:", err);
    }

    setName("");
    setEmail("");
    setPassword("");
    setPassword2("");
    setFirstName("");
    setLastName("");
    setBirthDate("");
    setCountry("");
    setFile(null);
    setPreview(null);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Connexion */}
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 6,
            color: primary,
          }}
        >
          {t("profiles.auth.login.title", "Se connecter")}
        </div>
        <div
          className="subtitle"
          style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}
        >
          {t(
            "profiles.auth.login.subtitle",
            "Entre l’email et le mot de passe de ton compte existant."
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <input
            className="input"
            type="email"
            placeholder={t(
              "profiles.private.email",
              "Adresse mail"
            )}
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder={t(
              "profiles.private.password",
              "Mot de passe"
            )}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitLogin()}
          />
          {loginError && (
            <div
              className="subtitle"
              style={{ color: "#ff6666", fontSize: 11 }}
            >
              {loginError}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn primary sm"
              onClick={submitLogin}
              style={{
                background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
                color: "#000",
                fontWeight: 700,
              }}
            >
              {t("profiles.auth.login.btn", "Connexion")}
            </button>
          </div>
        </div>
      </div>

      {/* Création */}
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 6,
            color: primary,
          }}
        >
          {t("profiles.auth.create.title", "Créer un compte")}
        </div>
        <div
          className="subtitle"
          style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}
        >
          {t(
            "profiles.auth.create.subtitle",
            "Un compte est lié à un profil local et à toutes ses statistiques."
          )}
        </div>

        <div
          className="row"
          style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <label
            title={t("profiles.locals.add.avatar", "Avatar")}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              overflow: "hidden",
              border: `1px solid ${theme.borderSoft}`,
              display: "grid",
              placeItems: "center",
              background: theme.card,
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <img
                src={preview}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span className="subtitle" style={{ fontSize: 11 }}>
                {t("profiles.locals.add.avatar", "Avatar")}
              </span>
            )}
          </label>

          <input
            ref={createRef}
            className="input"
            placeholder={t(
              "profiles.auth.create.placeholderName",
              "Nom du profil (pseudo affiché)"
            )}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 140 }}
          />
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <input
            className="input"
            type="email"
            placeholder={t(
              "profiles.private.email",
              "Adresse mail"
            )}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              type="password"
              placeholder={t(
                "profiles.private.password",
                "Mot de passe"
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder={t(
                "profiles.auth.create.passwordConfirm",
                "Confirmer"
              )}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>

          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              placeholder={t(
                "profiles.private.firstName",
                "Prénom"
              )}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="input"
              placeholder={t("profiles.private.lastName", "Nom")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <input
            className="input"
            type="date"
            placeholder={t(
              "profiles.private.birthDate",
              "Date de naissance"
            )}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          <input
            className="input"
            placeholder={t("profiles.private.country", "Pays")}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />

          {/* Choix thème visuel */}
          <div>
            <div
              className="subtitle"
              style={{ fontSize: 11, color: theme.textSoft, marginBottom: 2 }}
            >
              {t(
                "profiles.auth.create.themeLabel",
                "Thème visuel"
              )}
            </div>
            <select
              className="input"
              value={uiTheme}
              onChange={(e) => setUiTheme(e.target.value as ThemeId)}
            >
              {themeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Choix langue app */}
          <div>
            <div
              className="subtitle"
              style={{ fontSize: 11, color: theme.textSoft, marginBottom: 2 }}
            >
              {t(
                "profiles.auth.create.langLabel",
                "Langue de l’application"
              )}
            </div>
            <select
              className="input"
              value={uiLang}
              onChange={(e) => setUiLangState(e.target.value as Lang)}
            >
              {langOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div
            className="subtitle"
            style={{ fontSize: 11, color: theme.textSoft }}
          >
            {t(
              "profiles.auth.create.langHint",
              "Le pays, la langue et le thème pourront être modifiés ensuite dans les réglages."
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn primary sm"
              onClick={submitCreate}
              style={{
                background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
                color: "#000",
                fontWeight: 700,
              }}
            >
              {t("profiles.auth.create.btn", "Créer le compte")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----- NOUVELLE refonte Profils locaux : création + carrousel ----- */

function LocalProfilesRefonte({
  profiles,
  activeProfileId,
  onCreate,
  onRename,
  onPatchPrivateInfo,
  onAvatar,
  onDelete,
  onOpenAvatarCreator,
}: {
  profiles: Profile[];
  activeProfileId: string | null;
  onCreate: (
    name: string,
    file?: File | null,
    privateInfo?: Partial<{ country?: string }>
  ) => void;
  onRename: (id: string, name: string) => void;
  onPatchPrivateInfo: (id: string, patch: Partial<{ country?: string }>) => void;
  onAvatar: (id: string, file: File) => void;
  onDelete: (id: string) => void;
  onOpenAvatarCreator?: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  // on enlève seulement le profil actif du carrousel
  const locals = React.useMemo(
    () => profiles.filter((p) => p.id !== activeProfileId),
    [profiles, activeProfileId]
  );

  const [index, setIndex] = React.useState(0);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editCountry, setEditCountry] = React.useState("");
  const [editFile, setEditFile] = React.useState<File | null>(null);
  const [editPreview, setEditPreview] = React.useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = React.useState(false);

  React.useEffect(() => {
    if (index >= locals.length && locals.length > 0) {
      setIndex(locals.length - 1);
    }
    if (locals.length === 0) {
      setIndex(0);
    }
  }, [locals.length, index]);

  const current = locals[index] || null;

  // stats du profil courant
  const bs = useBasicStats(current?.id);
  const avg3 = Number.isFinite(bs.avg3) ? Number(bs.avg3) : 0;
  const bestVisit = Number(bs.bestVisit ?? 0);
  const bestCheckout = Number(bs.bestCheckout ?? 0);
  const winPct = Math.round(Number(bs.winRate ?? 0));

  // reset édition quand on change de profil
  React.useEffect(() => {
    setIsEditing(false);
    setEditFile(null);
    setEditPreview(null);
    setActionsOpen(false);
    if (current) {
      const pi = ((current as any).privateInfo || {}) as { country?: string };
      setEditName(current.name || "");
      setEditCountry(pi.country || "");
    } else {
      setEditName("");
      setEditCountry("");
    }
  }, [current?.id]);

  React.useEffect(() => {
    if (!editFile) {
      setEditPreview(null);
      return;
    }
    const r = new FileReader();
    r.onload = () => setEditPreview(String(r.result));
    r.readAsDataURL(editFile);
  }, [editFile]);

  async function handleSaveEdit() {
    if (!current) return;
    const trimmedName = editName.trim();
    const trimmedCountry = editCountry.trim();

    if (trimmedName) onRename(current.id, trimmedName);
    onPatchPrivateInfo(current.id, { country: trimmedCountry || "" });
    if (editFile) onAvatar(current.id, editFile);

    setIsEditing(false);
    setEditFile(null);
    setEditPreview(null);
  }

  async function handlePurgeStats() {
    if (!current) return;
    const ok = window.confirm(
      t(
        "profiles.locals.actions.purgeConfirm",
        "Supprimer toutes les statistiques locales pour ce profil ? L’historique brut des parties restera conservé."
      )
    );
    if (!ok) return;

    try {
      await purgeAllStatsForProfile(current.id);
      alert(
        t(
          "profiles.locals.actions.purgeDone",
          "Statistiques locales supprimées pour ce profil. L’historique des matchs reste disponible."
        )
      );
    } catch (err) {
      console.warn("[Profiles] purgeAllStatsForProfile error:", err);
      alert(
        t(
          "profiles.locals.actions.purgeError",
          "Une erreur est survenue pendant la suppression des statistiques."
        )
      );
    }
  }

  function handleDeleteProfile() {
    if (!current) return;
    const ok = window.confirm(
      t(
        "profiles.locals.actions.deleteConfirm",
        "Supprimer ce profil local ? Ses stats resteront dans l’historique."
      )
    );
    if (!ok) return;
    onDelete(current.id);
  }

  // tailles médaillon
  const AVATAR = 120;
  const BORDER = 10;
  const MEDALLION = AVATAR + BORDER;
  const STAR = 12;

  const pillBtnBase: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    maxWidth: 110,
    borderRadius: 999,
    border: `1px solid ${primary}AA`,
    background: `linear-gradient(135deg, ${primary}33, ${primary}AA)`,
    color: "#000",
    fontWeight: 800,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    padding: "5px 8px",
    boxShadow: "0 8px 18px rgba(0,0,0,.5)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "transform .12s ease, box-shadow .12s ease, filter .12s ease",
  };

  const pillBtnGhost: React.CSSProperties = {
    ...pillBtnBase,
    background: `linear-gradient(135deg, ${primary}11, ${primary}55)`,
    color: "#fff",
  };

  const pillBtnDanger: React.CSSProperties = {
    ...pillBtnBase,
    background: "linear-gradient(135deg, #ff4b5c, #ff8a80)",
    border: "1px solid #ffb3b3",
    color: "#000",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ------- Création PROFIL LOCAL ------- */}
      <AddLocalProfile onCreate={onCreate} />

      {/* ------- Carrousel + stats + actions ------- */}
      {locals.length === 0 ? (
        <div
          className="subtitle"
          style={{
            marginTop: 8,
            fontSize: 12,
            color: theme.textSoft,
            textAlign: "center",
          }}
        >
          {t(
            "profiles.locals.empty",
            "Aucun profil local pour l’instant. Ajoute un joueur au-dessus."
          )}
        </div>
      ) : (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 16,
            border: `1px solid ${theme.borderSoft}`,
            background:
              "radial-gradient(circle at top, rgba(255,255,255,.08), transparent 60%)",
          }}
        >
          {/* Header carrousel */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              gap: 8,
            }}
          >
            <button
              className="btn sm"
              onClick={() =>
                setIndex((i) => (i <= 0 ? locals.length - 1 : i - 1))
              }
              disabled={locals.length <= 1}
              style={{ minWidth: 36, opacity: locals.length <= 1 ? 0.4 : 1 }}
            >
              ◂
            </button>

            <div
              className="subtitle"
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: theme.textSoft,
                flex: 1,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t("profiles.locals.carousel.label", "Profil local")}{" "}
              {locals.length > 1 ? `(${index + 1}/${locals.length})` : ""}
            </div>

            <button
              className="btn sm"
              onClick={() =>
                setIndex((i) => (i >= locals.length - 1 ? 0 : i + 1))
              }
              disabled={locals.length <= 1}
              style={{ minWidth: 36, opacity: locals.length <= 1 ? 0.4 : 1 }}
            >
              ▸
            </button>
          </div>

          {current && (
            <>
              {/* Médaillon central + StarRing alimenté par avg3 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: MEDALLION,
                    height: MEDALLION,
                    borderRadius: "50%",
                    padding: 0,
                    background: "transparent",
                    boxShadow: "none",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: -(STAR / 2),
                      top: -(STAR / 2),
                      width: MEDALLION + STAR,
                      height: MEDALLION + STAR,
                      pointerEvents: "none",
                    }}
                  >
                    <ProfileStarRing
                      anchorSize={MEDALLION}
                      avg3d={avg3}
                      gapPx={-1}
                      starSize={STAR}
                      stepDeg={10}
                      rotationDeg={0}
                      animateGlow={true}
                    />
                  </div>

                  {/* ✅ PATCH 5 — src propre + cache-bust via helper */}
                  <ProfileAvatar
                    size={AVATAR}
                    dataUrl={buildAvatarSrc({
                      avatarUrl: (current as any)?.avatarUrl || null,
                      avatarDataUrl: (current as any)?.avatarDataUrl || null,
                      avatarUpdatedAt: (current as any)?.avatarUpdatedAt ?? null,
                    })}
                    label={current.name?.[0]?.toUpperCase() || "?"}
                    showStars={false}
                  />
                </div>
              </div>

              {/* === NOM PROFIL LOCAL (SHIMMER PREMIUM) + PAYS === */}
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <span
                  className="dc-stats-name-wrapper"
                  style={{
                    fontSize: 26,
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontWeight: 900,
                    lineHeight: 1.05,
                    display: "inline-block",
                    // @ts-ignore
                    "--dc-accent": primary,
                  }}
                >
                  <span className="dc-stats-name-base">{current.name || "—"}</span>
                  <span className="dc-stats-name-shimmer">{current.name || "—"}</span>
                </span>

                <div
                  className="subtitle"
                  style={{
                    fontSize: 14,
                    marginTop: 4,
                    color: theme.textSoft,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {(() => {
                    const pi = ((current as any).privateInfo || {}) as {
                      country?: string;
                    };
                    const country = pi.country || "";
                    const flag = getCountryFlag(country);

                    if (flag) {
                      return (
                        <>
                          <span style={{ fontSize: 18 }}>{flag}</span>
                          <span
                            style={{
                              fontSize: 11,
                              opacity: 0.7,
                              maxWidth: 120,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {country}
                          </span>
                        </>
                      );
                    }

                    return (
                      <span style={{ fontSize: 11, opacity: 0.6 }}>
                        {t("profiles.private.country", "Pays")}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* KPIs */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  justifyContent: "space-between",
                  gap: 6,
                  marginBottom: 8,
                  overflowX: "auto",
                  paddingBottom: 2,
                }}
              >
                <KpiPill
                  label={t("home.stats.avg3", "Moy/3D")}
                  value={(Math.round(avg3 * 10) / 10).toFixed(1)}
                />
                <KpiPill
                  label={t("home.stats.best", "Best visit")}
                  value={String(bestVisit)}
                />
                <KpiPill
                  label={t("home.stats.co", "Best CO")}
                  value={String(bestCheckout)}
                />
                <KpiPill
                  label={t("home.stats.winPct", "Win %")}
                  value={`${winPct}%`}
                />
              </div>

              {/* 🔥 NOUVEAU : Mes jeux de fléchettes pour ce profil local */}
              <div style={{ marginTop: 4, marginBottom: 10 }}>
                <DartSetsPanel profile={current} />
              </div>

              {/* Boutons actions : EDITER / AVATAR / ACTIONS */}
              <div
                className="row local-actions"
                style={{
                  gap: 6,
                  justifyContent: "center",
                  flexWrap: "nowrap",
                  marginBottom: 4,
                  width: "100%",
                }}
              >
                <button
                  className="btn sm"
                  type="button"
                  onClick={() => setIsEditing((v) => !v)}
                  style={pillBtnGhost}
                >
                  {t("profiles.locals.actions.edit", "EDITER")}
                </button>

                <button
                  className="btn sm"
                  type="button"
                  onClick={() => onOpenAvatarCreator?.()}
                  style={pillBtnBase}
                >
                  {t("profiles.locals.actions.avatar", "AVATAR")}
                </button>

                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <button
                    className="btn sm"
                    type="button"
                    onClick={() => setActionsOpen((v) => !v)}
                    style={pillBtnDanger}
                  >
                    {t("profiles.locals.actions.more", "ACTIONS")}
                  </button>

                  {actionsOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "110%",
                        right: 0,
                        zIndex: 50,
                        minWidth: 210,
                        padding: 8,
                        borderRadius: 10,
                        background: theme.bg,
                        border: `1px solid ${theme.borderSoft}`,
                        boxShadow: "0 12px 24px rgba(0,0,0,.6)",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <button
                        className="btn sm"
                        type="button"
                        onClick={() => {
                          setActionsOpen(false);
                          handlePurgeStats();
                        }}
                        style={{ justifyContent: "flex-start", fontSize: 11 }}
                      >
                        {t(
                          "profiles.locals.actions.purgeStats",
                          "Purger toutes les stats de ce profil"
                        )}
                      </button>

                      <button
                        className="btn danger sm"
                        type="button"
                        onClick={() => {
                          setActionsOpen(false);
                          handleDeleteProfile();
                        }}
                        style={{ justifyContent: "flex-start", fontSize: 11 }}
                      >
                        {t(
                          "profiles.locals.actions.delete",
                          "Supprimer ce profil local"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* MODE EDITION (nom / pays / avatar) */}
              {isEditing && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 10,
                    borderTop: `1px dashed ${theme.borderSoft}`,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    className="row"
                    style={{
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <label
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: `1px solid ${theme.borderSoft}`,
                        display: "grid",
                        placeItems: "center",
                        background: theme.card,
                        cursor: "pointer",
                        flex: "0 0 auto",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                      />
                      {editPreview ? (
                        <img
                          src={editPreview}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span className="subtitle" style={{ fontSize: 11 }}>
                          {t("profiles.locals.add.avatar", "Avatar")}
                        </span>
                      )}
                    </label>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 160,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <input
                        className="input"
                        placeholder={t(
                          "profiles.locals.add.placeholder",
                          "Nom du profil"
                        )}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <input
                        className="input"
                        placeholder={t("profiles.private.country", "Pays")}
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div
                    className="row"
                    style={{
                      justifyContent: "flex-end",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditFile(null);
                        setEditPreview(null);
                        if (current) {
                          const pi = ((current as any).privateInfo || {}) as {
                            country?: string;
                          };
                          setEditName(current.name || "");
                          setEditCountry(pi.country || "");
                        }
                      }}
                    >
                      {t("common.cancel", "Annuler")}
                    </button>
                    <button className="btn ok sm" type="button" onClick={handleSaveEdit}>
                      {t("common.save", "Enregistrer")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ----- Formulaire d’ajout local (refondu) ----- */

function AddLocalProfile({
  onCreate,
}: {
  onCreate: (
    name: string,
    file?: File | null,
    privateInfo?: Partial<{
      country?: string;
    }>
  ) => void;
}) {
  const [name, setName] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const r = new FileReader();
    r.onload = () => setPreview(String(r.result));
    r.readAsDataURL(file);
  }, [file]);

  function reset() {
    setName("");
    setCountry("");
    setFile(null);
    setPreview(null);
  }

  function submit() {
    console.log("[AddLocalProfile] submit() click", {
      name,
      country,
      hasFile: !!file,
    });
  
    if (!name.trim()) {
      console.warn("[AddLocalProfile] blocked: name is empty");
      return;
    }
  
    const trimmedName = name.trim();
    const trimmedCountry = country.trim();
    const privateInfo: { country?: string } = {};
    if (trimmedCountry) privateInfo.country = trimmedCountry;
  
    console.log("[AddLocalProfile] calling onCreate()", {
      trimmedName,
      privateInfo,
    });
  
    onCreate(trimmedName, file, privateInfo);
    reset();
  }

  const hasSomething = name || country || file;

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 10,
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        background: theme.bg,
        boxShadow: "0 10px 20px rgba(0,0,0,.35)",
      }}
    >
      <div
        className="subtitle"
        style={{
          fontSize: 11,
          color: theme.textSoft,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {t(
          "profiles.locals.add.title",
          "Créer un profil local"
        )}
      </div>

      <div
        className="row"
        style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}
      >
        <label
          title={t("profiles.locals.add.avatar", "Avatar")}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            overflow: "hidden",
            border: `1px solid ${theme.borderSoft}`,
            display: "grid",
            placeItems: "center",
            background: theme.card,
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <img
              src={preview}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <span className="subtitle" style={{ fontSize: 11 }}>
              {t("profiles.locals.add.avatar", "Avatar")}
            </span>
          )}
        </label>

        <div
          style={{
            flex: 1,
            minWidth: 160,
            display: "grid",
            gap: 6,
          }}
        >
          <input
            className="input"
            placeholder={t(
              "profiles.locals.add.placeholder",
              "Nom du profil"
            )}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <input
            className="input"
            placeholder={t("profiles.private.country", "Pays")}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <div
          className="col"
          style={{
            gap: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            minWidth: 96,
          }}
        >
          <button
            className="btn primary sm"
            onClick={submit}
            style={{
              background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
              color: "#000",
              fontWeight: 700,
              minWidth: 90,
            }}
          >
            {t("profiles.locals.add.btnAdd", "Ajouter")}
          </button>
          {hasSomething && (
            <button className="btn sm" onClick={reset}>
              {t("profiles.locals.add.btnCancel", "Annuler")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----- Edition inline du profil actif ----- */

function EditInline({
  initialName,
  onSave,
  onDisconnect,
  compact = true,
}: {
  initialName: string;
  onSave: (name: string, avatar?: File | null) => void;
  onDisconnect?: () => void;
  compact?: boolean;
}) {
  const [edit, setEdit] = React.useState(false);
  const [name, setName] = React.useState(initialName);
  const [file, setFile] = React.useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  const { t } = useLang();
  const { theme } = useTheme();
  const primary = theme.primary;

  React.useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatarUrl(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      setAvatarUrl(null);
    }
  }, [file]);

  if (!edit) {
    return (
      <button
        className="btn sm"
        onClick={() => setEdit(true)}
        title={t("profiles.btn.edit.tooltip", "Éditer le profil")}
      >
        {t("profiles.connected.btn.edit", "MODIFIER")}
      </button>
    );
  }

  return (
    <div
      className="row"
      style={{
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <label
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          overflow: "hidden",
          border: `2px solid ${primary}66`,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          background: "#111118",
          position: "relative",
        }}
      >
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span style={{ color: "#999", fontSize: 12 }}>
            {t("profiles.edit.click", "Cliquer")}
          </span>
        )}
      </label>

      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: compact ? 160 : 200 }}
      />

      <button
        className="btn ok sm"
        onClick={() => {
          onSave(name, file);
          setEdit(false);
          setFile(null);
          setAvatarUrl(null);
        }}
      >
        {t("common.save", "Enregistrer")}
      </button>
      <button
        className="btn sm"
        onClick={() => {
          setEdit(false);
          setFile(null);
          setAvatarUrl(null);
        }}
      >
        {t("common.cancel", "Annuler")}
      </button>
      {onDisconnect && (
        <button className="btn danger sm" onClick={onDisconnect}>
          {t("profiles.btn.quit", "QUITTER")}
        </button>
      )}
    </div>
  );
}

/* ------ Gold mini-stats (lecture SYNC cache) ------ */

function GoldMiniStats({ profileId }: { profileId: string }) {
  const bs = useBasicStats(profileId);
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme.primary;

  const avg3 = Number.isFinite(bs.avg3) ? bs.avg3 : 0;
  const best = Number(bs.bestVisit ?? 0);
  const co = Number(bs.bestCheckout ?? 0);
  const winPct = Math.round(Number(bs.winRate ?? 0));

  const pillW = "clamp(58px, 17vw, 78px)";

  return (
    <div
      style={{
        borderRadius: 10,
        padding: "5px 6px",
        boxSizing: "border-box",
        background: `linear-gradient(180deg, ${primary}33, ${primary}11)`,
        border: `1px solid ${primary}55`,
        boxShadow:
          "0 6px 16px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.35)",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "stretch",
          gap: 0,
          width: "100%",
        }}
      >
        <GoldStatItem
          label={t("home.stats.avg3", "Moy/3")}
          value={(Math.round(avg3 * 10) / 10).toFixed(1)}
          width={pillW}
        />
        <GoldSep />
        <GoldStatItem
          label={t("home.stats.best", "Best")}
          value={String(best)}
          width={pillW}
        />
        <GoldSep />
        <GoldStatItem
          label={t("home.stats.co", "CO")}
          value={String(co)}
          width={pillW}
        />
        <GoldSep />
        <GoldStatItem
          label={t("home.stats.winPct", "Win%")}
          value={`${winPct}`}
          width={pillW}
        />
      </div>
    </div>
  );
}

function GoldSep() {
  const { theme } = useTheme();
  const primary = theme.primary;
  return (
    <div
      aria-hidden
      style={{
        width: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1,
          height: "64%",
          background: `${primary}33`,
          borderRadius: 1,
        }}
      />
    </div>
  );
}

function GoldStatItem({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  const { theme } = useTheme();
  const primary = theme.primary;

  return (
    <div
      style={{
        width,
        minWidth: 0,
        display: "grid",
        gap: 1,
        textAlign: "center",
        paddingInline: 2,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span
        style={{
          fontSize: "clamp(8px, 1.6vw, 9.5px)",
          color: "rgba(255,255,255,.66)",
          lineHeight: 1.05,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontWeight: 800,
          letterSpacing: 0.1,
          color: primary,
          textShadow: `0 0 4px ${primary}33`,
          fontSize: "clamp(9.5px, 2.4vw, 12px)",
          lineHeight: 1.05,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ------ Petit bouton KPI pour la refonte locals ------ */

function KpiPill({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const primary = theme.primary;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        maxWidth: 110,
        borderRadius: 999,
        padding: "5px 8px",
        fontSize: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: `linear-gradient(135deg, ${primary}22, ${primary}55)`,
        border: `1px solid ${primary}99`,
        boxShadow: "0 6px 14px rgba(0,0,0,.45)",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          textTransform: "uppercase",
          letterSpacing: 0.7,
          color: "rgba(255,255,255,.7)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          marginTop: 1,
          fontWeight: 800,
          fontSize: 13,
          color: "#000",
          textShadow: `0 0 6px ${primary}AA`,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusDot({ kind }: { kind: "online" | "away" | "offline" }) {
  const color =
    kind === "online"
      ? "#1fb46a"
      : kind === "away"
      ? "#f0b12a"
      : "#777";
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 10px ${color}`,
        display: "inline-block",
      }}
    />
  );
}

/* ================================
   Utils
================================ */
function read(f: File) {
  return new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(f);
  });
}

function getCountryFlag(countryRaw?: string): string | null {
  if (!countryRaw) return null;
  const v = countryRaw.trim();
  if (!v) return null;

  // Si l'utilisateur a déjà mis un emoji drapeau → on le garde
  if (/\p{Extended_Pictographic}/u.test(v)) {
    return v;
  }

  // Si l'utilisateur a mis un code ISO directement (FR, US, GB...)
  const upper = v.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) {
    return isoCodeToFlag(upper);
  }

  // Normalisation du nom
  const key = v
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z]/g, "");

  // Mapping noms → codes ISO (liste large)
  const nameToCode: Record<string, string> = {
    // FR + variantes FR/EN les plus courantes
    france: "FR",
    republiquefrancaise: "FR",
    frenchrepublic: "FR",
    etatsunis: "US",
    etatsunisdamérique: "US",
    etatsunisdamerique: "US",
    etatsunisamerique: "US",
    etatsunisdam: "US",
    usa: "US",
    unitedstates: "US",
    unitedstatesofamerica: "US",
    royaumeuni: "GB",
    royaumeuniangleterre: "GB",
    royaumeuniuk: "GB",
    uk: "GB",
    angleterre: "GB",
    england: "GB",
    ecosse: "GB",
    scotland: "GB",
    paysbas: "NL",
    paysbasnederland: "NL",
    belgique: "BE",
    suisse: "CH",
    espagne: "ES",
    allemagne: "DE",
    italie: "IT",
    portugal: "PT",

    // Liste ISO (noms anglais sans espaces / caractères spéciaux)
    afghanistan: "AF",
    albania: "AL",
    algeria: "DZ",
    andorra: "AD",
    angola: "AO",
    antiguaandbarbuda: "AG",
    argentina: "AR",
    armenia: "AM",
    australia: "AU",
    austria: "AT",
    azerbaijan: "AZ",
    bahamas: "BS",
    bahrain: "BH",
    bangladesh: "BD",
    barbados: "BB",
    belarus: "BY",
    belgium: "BE",
    belize: "BZ",
    benin: "BJ",
    bhutan: "BT",
    bolivia: "BO",
    bosniaandherzegovina: "BA",
    botswana: "BW",
    brazil: "BR",
    brunei: "BN",
    bulgaria: "BG",
    burkinafaso: "BF",
    burundi: "BI",
    caboverde: "CV",
    cambodia: "KH",
    cameroon: "CM",
    canada: "CA",
    centralafricanrepublic: "CF",
    chad: "TD",
    chile: "CL",
    china: "CN",
    colombia: "CO",
    comoros: "KM",
    congo: "CG",
    congodemocraticrepublic: "CD",
    costarica: "CR",
    croatia: "HR",
    cuba: "CU",
    cyprus: "CY",
    czechrepublic: "CZ",
    czechia: "CZ",
    denmark: "DK",
    djibouti: "DJ",
    dominica: "DM",
    dominicanrepublic: "DO",
    ecuador: "EC",
    egypt: "EG",
    elsalvador: "SV",
    equatorialguinea: "GQ",
    eritrea: "ER",
    estonia: "EE",
    eswatini: "SZ",
    ethiopia: "ET",
    fiji: "FJ",
    finland: "FI",
    gabon: "GA",
    gambia: "GM",
    georgia: "GE",
    germany: "DE",
    ghana: "GH",
    greece: "GR",
    grenada: "GD",
    guatemala: "GT",
    guinea: "GN",
    guineabissau: "GW",
    guyana: "GY",
    haiti: "HT",
    honduras: "HN",
    hungary: "HU",
    iceland: "IS",
    india: "IN",
    indonesia: "ID",
    iran: "IR",
    iraq: "IQ",
    ireland: "IE",
    israel: "IL",
    italy: "IT",
    jamaica: "JM",
    japan: "JP",
    jordan: "JO",
    kazakhstan: "KZ",
    kenya: "KE",
    kiribati: "KI",
    koreademocraticpeoplesrepublic: "KP",
    northkorea: "KP",
    korearepublicof: "KR",
    southkorea: "KR",
    kuwait: "KW",
    kyrgyzstan: "KG",
    laos: "LA",
    latvia: "LV",
    lebanon: "LB",
    lesotho: "LS",
    liberia: "LR",
    libya: "LY",
    liechtenstein: "LI",
    lithuania: "LT",
    luxembourg: "LU",
    madagascar: "MG",
    malawi: "MW",
    malaysia: "MY",
    maldives: "MV",
    mali: "ML",
    malta: "MT",
    marshallislands: "MH",
    mauritania: "MR",
    mauritius: "MU",
    mexico: "MX",
    micronesia: "FM",
    moldova: "MD",
    monaco: "MC",
    mongolia: "MN",
    montenegro: "ME",
    morocco: "MA",
    mozambique: "MZ",
    myanmar: "MM",
    namibia: "NA",
    nauru: "NR",
    nepal: "NP",
    netherlands: "NL",
    newzealand: "NZ",
    nicaragua: "NI",
    niger: "NE",
    nigeria: "NG",
    northmacedonia: "MK",
    norway: "NO",
    oman: "OM",
    pakistan: "PK",
    palau: "PW",
    panama: "PA",
    papuanewguinea: "PG",
    paraguay: "PY",
    peru: "PE",
    philippines: "PH",
    poland: "PL",
    qatar: "QA",
    romania: "RO",
    russia: "RU",
    russianfederation: "RU",
    rwanda: "RW",
    saintkittsandnevis: "KN",
    saintlucia: "LC",
    saintvincentandthegrenadines: "VC",
    samoa: "WS",
    sanmarino: "SM",
    saotomeandprincipe: "ST",
    saudiaarabia: "SA",
    saudiarabia: "SA",
    senegal: "SN",
    serbia: "RS",
    seychelles: "SC",
    sierraleone: "SL",
    singapore: "SG",
    slovakia: "SK",
    slovenia: "SI",
    solomonislands: "SB",
    somalia: "SO",
    southafrica: "ZA",
    southsudan: "SS",
    spain: "ES",
    srilanka: "LK",
    sudan: "SD",
    suriname: "SR",
    sweden: "SE",
    switzerland: "CH",
    syria: "SY",
    taiwan: "TW",
    tajikistan: "TJ",
    tanzania: "TZ",
    thailand: "TH",
    timorleste: "TL",
    togo: "TG",
    tonga: "TO",
    trinidadandtobago: "TT",
    tunisia: "TN",
    turkey: "TR",
    türkiye: "TR",
    turkmenistan: "TM",
    tuvalu: "TV",
    uganda: "UG",
    ukraine: "UA",
    unitedarabemirates: "AE",
    unitedkingdom: "GB",
    uruguay: "UY",
    uzbekistan: "UZ",
    vanuatu: "VU",
    venezuela: "VE",
    vietnam: "VN",
    yemen: "YE",
    zambia: "ZM",
    zimbabwe: "ZW",
  };

  const iso = nameToCode[key];
  if (!iso) {
    // fallback : on tente avec les 2 premières lettres du mot
    const guess = upper.slice(0, 2);
    if (/^[A-Z]{2}$/.test(guess)) {
      return isoCodeToFlag(guess);
    }
    return null;
  }

  return isoCodeToFlag(iso);
}

function isoCodeToFlag(code: string): string | null {
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const first = code.codePointAt(0)! - 65 + 0x1f1e6;
  const second = code.codePointAt(1)! - 65 + 0x1f1e6;
  return String.fromCodePoint(first, second);
}

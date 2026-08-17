// ============================================
// src/components/ProfileAvatar.tsx
// Avatar + couronne d’étoiles dorées (moy. 3-darts)
// - Accepte EITHER {dataUrl,label,size,avg3D,showStars[,ringColor,textColor]}
//   OR      {profile,size,avg3D,showStars[,ringColor,textColor]}
// - NEW : overlay fléchette (set préféré ou set imposé via dartSetId)
// ✅ FIX PRIORITY : avatarDataUrl local récent > avatarUrl Supabase ancien
// ✅ FIX PERF : ignore base64 énorme (évite RAM + latence)
// ✅ CLEAN : suppression logs/DEBUG + pas de cercle rouge
// ✅ NEW GLOBAL FIX : si profile "lite" (id/name) => auto-resolve via loadStore() (sans modifier tous les setups)
// ✅ FIX ASSETS : accepte /assets/... + chemins relatifs + import png {default: "..."} (bots PRO)
// ✅ NEW UI: prop `noFrame` => supprime TOUT cadre/bordure/fond (aucun disque)
// ✅ NEW UI FIX (NON NEGOCIABLE): médaillon toujours parfaitement rond
//    - wrapper fixe la taille
//    - wrapper circle + overflow hidden
//    - img en cover (objectFit) sans piloter la forme
// ============================================

import React from "react";
import ProfileStarRing from "./ProfileStarRing";
import {
  type DartSet,
  getFavoriteDartSetForProfile,
  getDartSetsForProfile,
} from "../lib/dartSetsStore";
import { loadStore, getCachedLocalProfilesForSafety } from "../lib/storage";
import { sanitizeAvatarDataUrl, MAX_AVATAR_DATA_URL_CHARS } from "../lib/avatarSafe";
import { loadBots as loadStoredBots, isBotLike, resolveBotAvatarSrc } from "../lib/bots";
import { getAvatarCacheFast } from "../lib/avatarCache";
import { scheduleRuntimeIdle } from "../lib/runtimePerformance";
import { queueAvatarFallbackMirror, resolveAvatarFallback } from "../lib/avatarR2Fallback";
import { captureUserMediaFallback, profileAvatarMediaKey, resolveUserMediaFallback } from "../lib/userMediaFallback";
import DartSetImage from "./DartSetImage";
import { resolveRuntimeMediaUrl } from "../lib/serverConfig";

type ProfileLike = {
  id?: string;
  name?: string;
  avatarDataUrl?: any | null; // ⚠️ string OU import png (object {default})
  avatarUrl?: any | null; // idem
  avatarPath?: any | null;
  // ✅ legacy/compat: certains écrans/anciens stores utilisent ces champs
  avatar?: any | null;
  photoDataUrl?: any | null;
  photoUrl?: any | null;
  avatarUpdatedAt?: number | null;
  stats?: { avg3D?: number | null; avg3?: number | null } | null;
};

type VisualOpts = {
  ringColor?: string;
  textColor?: string;
  dartSetId?: string | null;
  showDartOverlay?: boolean;
  noFrame?: boolean; // ✅ NEW : pas de bordure/fond (aucun disque)
  // Identifiant explicite utile aux wrappers "lite" qui ne passent pas l'objet profil complet.
  // Il permet de retrouver le cache local puis la copie Cloudflare R2 si le NAS tombe.
  profileId?: string | null;
  fallbackDataUrl?: any;
};

function isDeadRemoteAvatar(src: string) {
  const value = String(src || "").trim();
  if (!value) return false;
  if (!/^https?:\/\//i.test(value)) return false;
  return /supabase\.(co|io)\/storage\/v1\/object\//i.test(value);
}

type Props =
  | (VisualOpts & {
      dataUrl?: any;
      // ✅ compat legacy callers (beaucoup d'écrans passent `url` / `name`)
      url?: any;
      label?: string;
      // ✅ compat legacy callers
      name?: string;
      size?: number;
      avg3D?: number | null;
      showStars?: boolean;
      profile?: never;
    })
  | (VisualOpts & {
      profile?: ProfileLike | null;
      size?: number;
      avg3D?: number | null;
      showStars?: boolean;
      dataUrl?: never;
      label?: never;
    });

// ✅ import png peut être string OU {default: string}
function normalizeImport(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : null;
  }
  if (typeof v === "object") {
    const d = (v as any).default;
    if (typeof d === "string") {
      const s = d.trim();
      return s ? s : null;
    }
  }
  return null;
}

// ✅ cache bust pour http(s) MAIS AUSSI /assets + relatifs
function withCacheBust(src: string, salt: string) {
  if (!src) return src;
  if (/^data:|^blob:/i.test(src)) return src;
  const hasQ = src.includes("?");
  return `${src}${hasQ ? "&" : "?"}v=${encodeURIComponent(salt)}`;
}

// ✅ accepte data/blob/http(s) + /assets + relatifs + fichiers images
function normalizeSrc(raw: any): string | null {
  const s = normalizeImport(raw);
  if (!s) return null;

  if (s.startsWith("data:image/")) return sanitizeAvatarDataUrl(s, MAX_AVATAR_DATA_URL_CHARS);
  if (s.startsWith("data:")) return null;
  if (s.startsWith("blob:")) return s;

  if (s.startsWith("http://") || s.startsWith("https://"))
    return resolveRuntimeMediaUrl(s).replace(/ /g, "%20");

  if (s.startsWith("/assets/")) return s.replace(/ /g, "%20");
  if (s.startsWith("/images/")) return s.replace(/ /g, "%20");
  if (s.startsWith("/media/")) return resolveRuntimeMediaUrl(s).replace(/ /g, "%20");

  if (s.startsWith("./") || s.startsWith("../")) return s.replace(/ /g, "%20");
  if (/\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(s))
    return s.replace(/ /g, "%20");

  return null;
}

// ---------------------------------------------------------------------------
// PERF GLOBAL AVATARS
// - évite de relire/parcourir les stores pour chaque médaillon d'une même page ;
// - décale les copies de sécurité (canvas/IDB/R2) hors du chemin critique du paint.
// ---------------------------------------------------------------------------
const resolvedProfileMemory = new Map<string, { at: number; value: ProfileLike | null }>();
const resolvedProfilePending = new Map<string, Promise<ProfileLike | null>>();
const avatarMirrorScheduled = new Set<string>();
const PROFILE_RESOLVE_CACHE_MS = 15_000;

function clearProfileAvatarResolverCache() {
  resolvedProfileMemory.clear();
  resolvedProfilePending.clear();
}

try {
  if (typeof window !== "undefined") {
    window.addEventListener("dc-store-updated", clearProfileAvatarResolverCache as EventListener);
    window.addEventListener("dc:bots-changed", clearProfileAvatarResolverCache as EventListener);
  }
} catch {}

function scheduleAvatarSafetyMirror(
  profileId: string,
  source: string,
  meta: { avatarUpdatedAt?: number | null; avatarAssetId?: string | null } = {},
) {
  const pid = String(profileId || "").trim();
  const src = String(source || "").trim();
  if (!pid || !src) return;

  const revision = Number(meta.avatarUpdatedAt || 0) || 0;
  const key = `${pid}:${revision}:${src.length}:${src.slice(0, 24)}:${src.slice(-24)}`;
  if (avatarMirrorScheduled.has(key)) return;
  avatarMirrorScheduled.add(key);

  scheduleRuntimeIdle(() => {
    try {
      queueAvatarFallbackMirror(pid, src, meta);
      void captureUserMediaFallback(profileAvatarMediaKey(pid), src, {
        kind: "profile_avatar",
        updatedAt: revision || undefined,
        sourceUrl: src,
      }).catch(() => undefined);
    } finally {
      // Le Set reste borné naturellement par les avatars/révisions vus dans la session.
      // On le purge si une longue session accumule trop de remplacements.
      if (avatarMirrorScheduled.size > 300) avatarMirrorScheduled.clear();
    }
  }, { timeoutMs: 8_000, fallbackDelayMs: 1_500 });
}

/* ============================================================
   ✅ GLOBAL PROFILE RESOLVER
============================================================ */
async function getProfileByIdFromStore(
  profileId: string
): Promise<ProfileLike | null> {
  const id = String(profileId || "").trim();
  if (!id) return null;

  const cachedMem = resolvedProfileMemory.get(id);
  if (cachedMem && Date.now() - cachedMem.at < PROFILE_RESOLVE_CACHE_MS) return cachedMem.value;

  const pending = resolvedProfilePending.get(id);
  if (pending) return pending;

  const task = (async (): Promise<ProfileLike | null> => {
    try {
      // 1) PRIORITÉ aux profils locaux déjà en mémoire. Avant, chaque avatar humain
      // commençait par relire le store des bots, donc 9 cartes = 9 parsings inutiles.
      let pr: any = null;
      try {
        const cached = getCachedLocalProfilesForSafety();
        pr = (cached?.profiles || []).find((x: any) => String(x?.id || "") === id) || null;
      } catch {}

      if (pr) {
        return {
          id: String(pr.id),
          name: pr?.name,
          avatarUrl: pr?.avatarUrl ?? null,
          avatarDataUrl: pr?.avatarDataUrl ?? null,
          avatarPath: pr?.avatarPath ?? null,
          avatar: pr?.avatar ?? null,
          photoDataUrl: pr?.photoDataUrl ?? null,
          photoUrl: pr?.photoUrl ?? null,
          avatarUpdatedAt: pr?.avatarUpdatedAt ?? null,
          stats: pr?.stats ?? null,
        };
      }

      // 2) Bots uniquement si l'id n'est pas un profil local.
      const bot = loadStoredBots().find((x: any) => String(x?.id || "") === id);
      if (bot) {
        const src = resolveBotAvatarSrc(bot);
        return {
          id: String(bot.id),
          name: bot?.name,
          avatarUrl: src && !String(src).startsWith("data:image/") ? src : null,
          avatarDataUrl: src && String(src).startsWith("data:image/") ? src : null,
          avatarPath: null,
          avatar: src,
          photoDataUrl: null,
          photoUrl: null,
          avatarUpdatedAt: (bot as any)?.avatarUpdatedAt ?? (bot as any)?.updatedAt ?? null,
          stats: null,
        };
      }

      // 3) Secours legacy : un seul loadStore par profil et résultat mis en cache.
      const store = await loadStore<any>();
      if (!store) return null;
      const arr: any[] = Array.isArray(store.profiles) ? store.profiles : [];
      pr = arr.find((x) => String(x?.id || "") === id) || null;
      if (!pr) return null;

      return {
        id: String(pr.id),
        name: pr?.name,
        avatarUrl: pr?.avatarUrl ?? null,
        avatarDataUrl: pr?.avatarDataUrl ?? null,
        avatarPath: pr?.avatarPath ?? null,
        avatar: pr?.avatar ?? null,
        photoDataUrl: pr?.photoDataUrl ?? null,
        photoUrl: pr?.photoUrl ?? null,
        avatarUpdatedAt: pr?.avatarUpdatedAt ?? null,
        stats: pr?.stats ?? null,
      };
    } catch {
      return null;
    }
  })()
    .then((value) => {
      resolvedProfileMemory.set(id, { at: Date.now(), value });
      return value;
    })
    .finally(() => resolvedProfilePending.delete(id));

  resolvedProfilePending.set(id, task);
  return task;
}

function isLiteProfile(p: ProfileLike | null): boolean {
  if (!p?.id) return false;
  const hasAny =
    (normalizeImport(p.avatarUrl) || "") ||
    (normalizeImport(p.avatarDataUrl) || "") ||
    (normalizeImport(p.avatarPath) || "") ||
    (normalizeImport((p as any)?.avatar) || "") ||
    (normalizeImport((p as any)?.photoDataUrl) || "") ||
    (normalizeImport((p as any)?.photoUrl) || "");
  return !hasAny || isBotLike(p);
}

export default function ProfileAvatar(props: Props) {
  const size = props.size ?? 56;
  const showStars = props.showStars ?? true;
  const showDartOverlay = props.showDartOverlay === true;
  const noFrame = props.noFrame === true;

  const inputProfile: ProfileLike | null =
    ("profile" in props ? props.profile : null) ?? null;

  const [resolvedProfile, setResolvedProfile] =
    React.useState<ProfileLike | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const run = async () => {
      const p = inputProfile;
      const id = p?.id ? String(p.id) : "";
      if (!id) {
        if (mounted) setResolvedProfile(null);
        return;
      }

      if (!isLiteProfile(p)) {
        if (mounted) setResolvedProfile(null);
        return;
      }

      const full = await getProfileByIdFromStore(id);
      if (!mounted) return;

      if (full) {
        setResolvedProfile({
          ...full,
          ...p,
          avatarUrl: normalizeImport(p?.avatarUrl) ? p?.avatarUrl : full.avatarUrl,
          avatarPath: normalizeImport(p?.avatarPath) ? p?.avatarPath : full.avatarPath,
          avatarDataUrl: normalizeImport(p?.avatarDataUrl)
            ? p?.avatarDataUrl
            : full.avatarDataUrl,
          stats: p?.stats ?? full.stats ?? null,
          name: p?.name ?? full.name,
        });
      } else {
        setResolvedProfile(null);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [
    inputProfile?.id,
    inputProfile?.avatarUrl,
    inputProfile?.avatarPath,
    inputProfile?.avatarDataUrl,
    inputProfile?.avatarUpdatedAt,
  ]);

  const p: ProfileLike | null = resolvedProfile ?? inputProfile;

  const name =
    ("label" in props ? props.label : undefined) ??
    ((props as any)?.name as string | undefined) ??
    p?.name ??
    "P";

  const avg3D =
    ("avg3D" in props ? props.avg3D : undefined) ??
    p?.stats?.avg3D ??
    p?.stats?.avg3 ??
    null;

  // ✅ IMPORTANT: si noFrame => ringColor forcé transparent
  const ringColor = noFrame
    ? "transparent"
    : props.ringColor ?? "rgba(255,255,255,0.28)";
  const textColor = props.textColor ?? "#f5f5ff";

  // SOURCE ORDER
  // ✅ compat legacy callers: certains écrans passent `url` au lieu de `dataUrl`
  const propDataUrl =
    "dataUrl" in props
      ? normalizeImport((props as any).dataUrl) ??
        normalizeImport((props as any).url) ??
        ""
      : "";

  const avatarUrl = normalizeImport(p?.avatarUrl) ?? "";
  const avatarPath = normalizeImport(p?.avatarPath) ?? "";
  const avatarDataUrl = normalizeImport(p?.avatarDataUrl) ?? "";
  const legacyAvatar =
    normalizeImport((p as any)?.avatar) ||
    normalizeImport((p as any)?.photoDataUrl) ||
    normalizeImport((p as any)?.photoUrl) ||
    "";

  // Les listes de profils affichent des médaillons de quelques dizaines de px :
  // décoder à chaque carte une photo base64 pleine résolution provoquait de gros pics
  // mémoire/CPU. Si la miniature locale correspond à la révision actuelle, elle gagne.
  const effectiveProfileId = String(props.profileId || p?.id || "").trim();
  const fastAvatarCache = React.useMemo(
    () => (effectiveProfileId ? (getAvatarCacheFast(effectiveProfileId) as any) : null),
    [effectiveProfileId, (p as any)?.avatarUpdatedAt],
  );
  const cachedThumb = React.useMemo(
    () =>
      normalizeImport(fastAvatarCache?.avatarThumbDataUrl) ||
      normalizeImport(fastAvatarCache?.avatarDataUrl) ||
      "",
    [fastAvatarCache],
  );
  const profileRevision = Number((p as any)?.avatarUpdatedAt || 0) || 0;
  const cachedRevision = Number(fastAvatarCache?.avatarUpdatedAt || fastAvatarCache?.updatedAt || 0) || 0;
  const cachedThumbFresh = !!cachedThumb && (!profileRevision || !cachedRevision || cachedRevision >= profileRevision);
  const propLooksRemote = /^(https?:\/\/|\/media\/|\/assets\/|\/images\/|\.\.?\/)/i.test(propDataUrl);

  const rawImg = React.useMemo(() => {
    // Une URL explicite distante/packagée doit rester prioritaire (bots, assets, amis liés).
    if (propDataUrl && propLooksRemote) return propDataUrl;
    // Sur les petits médaillons, utiliser la miniature fraîche évite de décoder plusieurs
    // mégaoctets de base64 en parallèle quand on ouvre "Profils locaux" / "Mon profil".
    if (size <= 180 && cachedThumbFresh) return cachedThumb;
    if (propDataUrl) return propDataUrl;
    if (avatarDataUrl) return avatarDataUrl;
    if (legacyAvatar && !isDeadRemoteAvatar(legacyAvatar)) return legacyAvatar;
    if (avatarUrl && !isDeadRemoteAvatar(avatarUrl)) return avatarUrl;
    if (avatarPath && !isDeadRemoteAvatar(avatarPath)) return avatarPath;
    return null;
  }, [propDataUrl, propLooksRemote, size, cachedThumbFresh, cachedThumb, avatarDataUrl, legacyAvatar, avatarUrl, avatarPath]);

  // -------------------------------------------------------------------------
  // FAILOVER AVATAR : NAS -> cache local -> Cloudflare R2
  // -------------------------------------------------------------------------
  const explicitFallback = normalizeImport(props.fallbackDataUrl) || "";
  const readCachedFallback = React.useCallback(() => {
    if (!effectiveProfileId) return explicitFallback;
    const cached: any = getAvatarCacheFast(effectiveProfileId);
    return (
      explicitFallback ||
      normalizeImport(cached?.avatarThumbDataUrl) ||
      normalizeImport(cached?.avatarDataUrl) ||
      normalizeImport(cached?.avatarFullDataUrl) ||
      normalizeImport(cached?.avatarCastDataUrl) ||
      ""
    );
  }, [effectiveProfileId, explicitFallback]);

  const [fallbackRaw, setFallbackRaw] = React.useState<string>(() => readCachedFallback());
  const [primaryBroken, setPrimaryBroken] = React.useState(false);
  const [fallbackBroken, setFallbackBroken] = React.useState(false);

  React.useEffect(() => {
    setPrimaryBroken(false);
    setFallbackBroken(false);
    setFallbackRaw(readCachedFallback());
  }, [rawImg, effectiveProfileId, readCachedFallback]);

  const primaryImg = React.useMemo(() => {
    const normalized = normalizeSrc(rawImg);
    if (!normalized) return null;

    const salt =
      (p &&
        typeof (p as any).avatarUpdatedAt === "number" &&
        String((p as any).avatarUpdatedAt)) ||
      (typeof rawImg === "string" ? String(rawImg).slice(-24) : "") ||
      "avatar";

    return withCacheBust(normalized, salt);
  }, [rawImg, p]);

  const fallbackImg = React.useMemo(() => normalizeSrc(fallbackRaw), [fallbackRaw]);

  // Ne lance PAS la restauration lourde (IDB -> fichier externe -> R2) pour chaque
  // avatar qui s'affiche correctement. Elle n'est nécessaire que si la source primaire
  // manque ou vient réellement d'échouer. C'est un gain majeur sur les pages photo.
  React.useEffect(() => {
    let cancelled = false;
    if (!effectiveProfileId) return () => { cancelled = true; };
    if (fallbackImg && !fallbackBroken) return () => { cancelled = true; };
    if (primaryImg && !primaryBroken) return () => { cancelled = true; };

    const mediaKey = profileAvatarMediaKey(effectiveProfileId);
    void (async () => {
      let src = await resolveUserMediaFallback(mediaKey, primaryImg || rawImg || "", { kind: "profile_avatar" }).catch(() => "");
      if (!src) src = await resolveAvatarFallback(effectiveProfileId).catch(() => "");
      if (!cancelled && src) {
        setFallbackBroken(false);
        setFallbackRaw(src);
      }
    })();

    return () => { cancelled = true; };
  }, [effectiveProfileId, fallbackImg, fallbackBroken, primaryImg, primaryBroken, rawImg]);

  const useFallback = (!primaryImg || primaryBroken) && !!fallbackImg && !fallbackBroken;
  const img = useFallback ? fallbackImg : (primaryImg && !primaryBroken ? primaryImg : null);
  const shouldShowImg = !!img;

  // ---------- Dart set overlay ----------
  const [dartSet, setDartSet] = React.useState<DartSet | null>(null);

  React.useEffect(() => {
    const profileId = p?.id;

    if (!profileId || !showDartOverlay) {
      setDartSet(null);
      return;
    }

    try {
      const all = getDartSetsForProfile(String(profileId)) || [];

      if (props.dartSetId) {
        const forced = all.find((s) => s.id === props.dartSetId);
        if (forced) {
          setDartSet(forced);
          return;
        }
      }

      const fav = getFavoriteDartSetForProfile(String(profileId));
      if (fav) {
        setDartSet(fav);
        return;
      }

      setDartSet(all[0] || null);
    } catch {
      setDartSet(null);
    }
  }, [showDartOverlay, p?.id, props.dartSetId]);

  const dartOverlaySize = size * 0.34;
  const dartOverlayOutsideOffset = dartOverlaySize * 0.35;

  // ✅ styles communs : AUCUN disque si noFrame
  const frameBorder = noFrame ? "none" : `2px solid ${ringColor}`;
  const fallbackBg = noFrame
    ? "transparent"
    : "radial-gradient(circle at 30% 30%, rgba(255,255,255,.10), rgba(0,0,0,.35))";

  return (
    <div
      // ✅ CRITICAL: si noFrame => on vire la class "avatar" (CSS global qui crée le disque)
      className={noFrame ? "relative inline-block" : "relative avatar inline-block"}
      style={{
        width: size,
        height: size,
        aspectRatio: "1 / 1",
        position: "relative",
        overflow: "visible", // on garde l’extérieur visible (stars + overlay)

        // ✅ écrase TOUT fond/ombre/border éventuels injectés globalement
        background: "transparent",
        boxShadow: "none",
        border: "none",
        outline: "none",
        filter: "none",
        borderRadius: 0, // outer wrapper n’est PAS le clipper
      }}
    >
      {/* ✅ INNER CLIPPER (NON NEGOCIABLE): rond + overflow hidden */}
      <div
        style={{
          width: "100%",
          height: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          overflow: "hidden",
          flex: "0 0 auto",
          position: "relative",

          // Cadre sur le wrapper (pas sur l'img)
          border: frameBorder,
          background: fallbackBg,
          boxShadow: "none",
          outline: "none",
        }}
      >
        {shouldShowImg ? (
          <img
            key={img as string}
            src={img as string}
            alt={name ?? "avatar"}
            loading={size <= 96 ? "lazy" : "eager"}
            decoding="async"
            onLoad={() => {
              // La copie de sécurité existe toujours, mais canvas/IDB/R2 attendent un
              // vrai temps mort : le paint de la page reste prioritaire.
              if (!useFallback && effectiveProfileId && primaryImg) {
                scheduleAvatarSafetyMirror(effectiveProfileId, primaryImg, {
                  avatarUpdatedAt: Number((p as any)?.avatarUpdatedAt || Date.now()) || Date.now(),
                  avatarAssetId: String((p as any)?.avatarAssetId || (p as any)?.avatarThumbAssetId || "") || null,
                });
              }
            }}
            onError={() => {
              if (useFallback) setFallbackBroken(true);
              else setPrimaryBroken(true);
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 50%",
              display: "block",
              // IMPORTANT: pas de borderRadius ici, c’est le wrapper qui clip
              borderRadius: 0,
              background: "transparent",
              boxShadow: "none",
              outline: "none",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              color: textColor,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              lineHeight: 1,
              userSelect: "none",
              background: "transparent", // déjà géré par wrapper fallbackBg
            }}
          >
            <div
              style={{
                fontSize: Math.max(10, size * 0.4),
                fontWeight: 900,
                letterSpacing: 0.5,
                transform: "translateY(1px)",
                textShadow: noFrame ? "0 0 10px rgba(0,0,0,0.65)" : "none",
              }}
            >
              {(name ?? "P").trim().slice(0, 1).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {showStars && <ProfileStarRing avg3d={avg3D ?? 0} anchorSize={size} />}

      {showDartOverlay && dartSet && (
        <div
          style={{
            position: "absolute",
            width: dartOverlaySize,
            height: dartOverlaySize,
            bottom: -dartOverlayOutsideOffset,
            right: -dartOverlayOutsideOffset,
            borderRadius: "50%",
            overflow: "hidden",
            background: (dartSet as any)?.bgColor || "#050509",
            display: "grid",
            placeItems: "center",
            fontSize: dartOverlaySize * 0.5,
            transform: "rotate(18deg)",
            color: "rgba(255,255,255,.96)",
            pointerEvents: "none",
            boxShadow: "0 0 14px rgba(0,0,0,.95)",
            border: "1px solid rgba(245,195,91,.9)",
          }}
        >
          <DartSetImage
            set={dartSet}
            preferThumb
            alt="dart set"
            loading="lazy"
            fallback={<span aria-hidden="true">🎯</span>}
            style={{
              width: "100%",
              height: "100%",
              objectFit: (dartSet as any)?.kind === "photo" ? "cover" : "contain",
            }}
          />
        </div>
      )}
    </div>
  );
}
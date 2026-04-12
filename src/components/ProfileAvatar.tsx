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
import { loadStore } from "../lib/storage";
import { sanitizeAvatarDataUrl, MAX_AVATAR_DATA_URL_CHARS } from "../lib/avatarSafe";

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
    return s.replace(/ /g, "%20");

  if (s.startsWith("/assets/")) return s.replace(/ /g, "%20");

  if (s.startsWith("./") || s.startsWith("../")) return s.replace(/ /g, "%20");
  if (/\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(s))
    return s.replace(/ /g, "%20");

  return null;
}

/* ============================================================
   ✅ GLOBAL PROFILE RESOLVER
============================================================ */
async function getProfileByIdFromStore(
  profileId: string
): Promise<ProfileLike | null> {
  try {
    const store = await loadStore<any>();
    if (!store) return null;

    const arr: any[] = Array.isArray(store.profiles) ? store.profiles : [];
    const pr = arr.find((x) => String(x?.id || "") === String(profileId));
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
  return !hasAny;
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

  const rawImg = React.useMemo(() => {
    if (propDataUrl) return propDataUrl;
    if (avatarDataUrl) return avatarDataUrl; // ✅ la photo locale fraîche gagne
    if (legacyAvatar && !isDeadRemoteAvatar(legacyAvatar)) return legacyAvatar;
    if (avatarUrl && !isDeadRemoteAvatar(avatarUrl)) return avatarUrl;
    if (avatarPath && !isDeadRemoteAvatar(avatarPath)) return avatarPath;
    return null;
  }, [propDataUrl, avatarDataUrl, legacyAvatar, avatarUrl, avatarPath]);

  const [imgBroken, setImgBroken] = React.useState(false);
  React.useEffect(() => setImgBroken(false), [rawImg]);

  const img = React.useMemo(() => {
    const normalized = normalizeSrc(rawImg);
    if (!normalized) return null;

    const salt =
      (p &&
        typeof (p as any).avatarUpdatedAt === "number" &&
        String((p as any).avatarUpdatedAt)) ||
      (typeof rawImg === "string" ? String(rawImg).slice(-24) : "") ||
      String(Date.now());

    return withCacheBust(normalized, salt);
  }, [rawImg, p]);

  const shouldShowImg = !!img && !imgBroken;

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
            onError={() => setImgBroken(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
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

      {showDartOverlay && dartSet?.thumbImageUrl && (
        <img
          src={dartSet.thumbImageUrl}
          alt="dart set"
          style={{
            position: "absolute",
            width: dartOverlaySize,
            height: dartOverlaySize,
            bottom: -dartOverlayOutsideOffset,
            right: -dartOverlayOutsideOffset,
            opacity: 0.96,
            pointerEvents: "none",
            transform: "rotate(18deg)",
            filter: "drop-shadow(0 0 10px rgba(0,0,0,.95))",
          }}
        />
      )}

      {showDartOverlay && !dartSet?.thumbImageUrl && dartSet && (
        <div
          style={{
            position: "absolute",
            width: dartOverlaySize,
            height: dartOverlaySize,
            bottom: -dartOverlayOutsideOffset,
            right: -dartOverlayOutsideOffset,
            borderRadius: "50%",
            background: (dartSet as any)?.bgColor || "#050509",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: dartOverlaySize * 0.55,
            transform: "rotate(20deg)",
            color: "rgba(255,255,255,.96)",
            pointerEvents: "none",
            boxShadow: "0 0 14px rgba(0,0,0,.95)",
            border: "1px solid rgba(245,195,91,.9)",
          }}
        >
          🎯
        </div>
      )}
    </div>
  );
}
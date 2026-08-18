import React from "react";
import {
  getDartSetMainImageSrc,
  getDartSetPresetImageSrc,
  getDartSetThumbImageSrc,
  resolveDartSetBestImageSrc,
  resolveDartSetLocalImageSrc,
} from "../lib/dartSetsStore";

type Props = {
  set?: any | null;
  src?: string | null;
  preferThumb?: boolean;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  loading?: "eager" | "lazy";
  recovery?: "full" | "local" | "none";
};

type CacheValue = string | null | Promise<string | null>;
const resolvedImageCache = new Map<string, CacheValue>();

// PERF/FIX V71 : le cache de résolution est module-global pour éviter des lectures
// IndexedDB répétées, mais il doit être invalidé quand une photo de DartSet vient
// d’être importée/restaurée. Sinon une ancienne URL cassée/null peut rester mémorisée
// même si les pixels sont désormais présents dans le coffre média local.
function clearResolvedDartSetImageCache() {
  resolvedImageCache.clear();
}

try {
  if (typeof window !== "undefined") {
    const events = ["dc-dartsets-updated", "dc-user-media-restored", "dc-background-restore-finished"];
    for (const eventName of events) window.addEventListener(eventName, clearResolvedDartSetImageCache as EventListener);
    window.addEventListener("storage", (event: StorageEvent) => {
      const key = String(event?.key || "");
      if (!key || /dart.?set|user.?media/i.test(key)) clearResolvedDartSetImageCache();
    });
  }
} catch {}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function setIdentity(set: any, preferThumb: boolean): string {
  if (!set || typeof set !== "object") return `none:${preferThumb ? "t" : "m"}`;
  const id = text(set.id || set.dartSetId || set.setId || set.name || "unknown");
  const mediaRev = String(
    set.mediaUpdatedAt ||
      set.updatedAt ||
      set.mainImageAssetId ||
      set.thumbImageAssetId ||
      set.photoAssetId ||
      0
  );
  const media = [set.mainImageUrl, set.thumbImageUrl, set.photoDataUrl, set.mainImageDataUrl, set.photoThumbDataUrl]
    .map((value) => {
      const src = text(value);
      return src ? `${src.length}:${src.slice(0, 18)}:${src.slice(-18)}` : "0";
    })
    .join("|");
  return `${id}:${mediaRev}:${media}:${preferThumb ? "thumb" : "main"}`;
}

function syncCandidates(set: any, explicitSrc?: string | null, preferThumb = false): string[] {
  const normal = preferThumb
    ? [getDartSetThumbImageSrc(set), getDartSetMainImageSrc(set)]
    : [getDartSetMainImageSrc(set), getDartSetThumbImageSrc(set)];
  const preset = preferThumb
    ? [getDartSetPresetImageSrc(set, true), getDartSetPresetImageSrc(set, false)]
    : [getDartSetPresetImageSrc(set, false), getDartSetPresetImageSrc(set, true)];
  const candidates = [text(explicitSrc), ...normal.map(text), ...preset.map(text)].filter(Boolean);
  return Array.from(new Set(candidates));
}

function resolveCached(set: any, preferThumb: boolean, recovery: "full" | "local" | "none"): Promise<string | null> {
  const key = `${setIdentity(set, preferThumb)}:${recovery}`;
  const cached = resolvedImageCache.get(key);
  if (typeof cached === "string" || cached === null) return Promise.resolve(cached ?? null);
  if (cached && typeof (cached as Promise<string | null>).then === "function") {
    return cached as Promise<string | null>;
  }

  const resolver = recovery === "local" ? resolveDartSetLocalImageSrc : resolveDartSetBestImageSrc;
  const pending = resolver(set, preferThumb)
    .then((src) => {
      const normalized = text(src) || null;
      resolvedImageCache.set(key, normalized);
      return normalized;
    })
    .catch(() => {
      resolvedImageCache.set(key, null);
      return null;
    });
  resolvedImageCache.set(key, pending);
  return pending;
}

/**
 * Image DartSet robuste :
 * - tente d'abord le coffre média local/IndexedDB (utile après restauration Android),
 * - retombe sur les URLs historiques puis sur l'image du preset embarquée,
 * - masque l'élément IMG tant qu'il n'est pas réellement chargé : aucune icône
 *   navigateur "image cassée" n'est visible dans le sélecteur.
 */
const DartSetImage: React.FC<Props> = ({
  set,
  src = null,
  preferThumb = true,
  alt = "",
  className,
  style,
  fallback = <span aria-hidden="true">🎯</span>,
  loading = "lazy",
  recovery = "full",
}) => {
  const identity = React.useMemo(
    () => `${setIdentity(set, preferThumb)}:${text(src)}`,
    [set, preferThumb, src]
  );
  const candidates = React.useMemo(
    () => syncCandidates(set, src, preferThumb),
    // Les parents recréent souvent le même objet DartSet. L'identité média évite
    // de remettre l'image à zéro et de relancer IndexedDB/R2 à chaque render.
    [identity, src, preferThumb]
  );

  const immediate = React.useMemo(() => {
    const first = candidates[0] || "";
    return /^(data:image\/|blob:)/i.test(first) ? first : null;
  }, [candidates]);

  const [resolvedSrc, setResolvedSrc] = React.useState<string | null>(immediate);
  const [loaded, setLoaded] = React.useState(false);
  const [failedAll, setFailedAll] = React.useState(false);
  const triedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    triedRef.current = new Set();
    setFailedAll(false);
    setLoaded(false);
    setResolvedSrc(immediate);

    if (!set || recovery === "none") {
      setResolvedSrc(candidates[0] || null);
      return () => { cancelled = true; };
    }

    // data:image/blob = photo importée déjà prête : aucun aller-retour IDB/R2 n'est
    // nécessaire avant le premier paint.
    if (immediate) return () => { cancelled = true; };

    void resolveCached(set, preferThumb, recovery).then((localOrBest) => {
      if (cancelled) return;
      const next = text(localOrBest) || candidates[0] || null;
      setResolvedSrc(next);
    });

    return () => { cancelled = true; };
  }, [identity, preferThumb, immediate, candidates, recovery]);

  React.useEffect(() => {
    setLoaded(false);
  }, [resolvedSrc]);

  const onError = React.useCallback(() => {
    const failed = text(resolvedSrc);
    if (failed) triedRef.current.add(failed);

    const ordered = Array.from(new Set([text(resolvedSrc), ...candidates].filter(Boolean)));
    const next = ordered.find((candidate) => !triedRef.current.has(candidate)) || null;
    if (next) {
      setLoaded(false);
      setResolvedSrc(next);
      return;
    }

    setLoaded(false);
    setFailedAll(true);
    setResolvedSrc(null);
  }, [resolvedSrc, candidates]);

  const showFallback = !resolvedSrc || !loaded || failedAll;

  return (
    <span
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {showFallback ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          {fallback}
        </span>
      ) : null}
      {resolvedSrc && !failedAll ? (
        <img
          src={resolvedSrc}
          alt={alt}
          className={className}
          style={{ ...style, opacity: loaded ? 1 : 0, visibility: loaded ? "visible" : "hidden", display: "block" }}
          loading={loading}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={onError}
        />
      ) : null}
    </span>
  );
};

export default React.memo(DartSetImage);

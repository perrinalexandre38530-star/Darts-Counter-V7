import React from "react";
import {
  captureUserMediaFallback,
  resolveUserMediaFallback,
  type UserMediaKind,
} from "../lib/userMediaFallback";
import { scheduleRuntimeIdle } from "../lib/runtimePerformance";


const scheduledSafetyCaptures = new Set<string>();

function scheduleSafetyCapture(mediaKey: string, primary: string, kind: UserMediaKind | string, mirrorR2: boolean) {
  const key = `${mediaKey}:${primary.length}:${primary.slice(0, 24)}:${primary.slice(-24)}`;
  if (!mediaKey || !primary || scheduledSafetyCaptures.has(key)) return;
  scheduledSafetyCaptures.add(key);
  scheduleRuntimeIdle(() => {
    void captureUserMediaFallback(mediaKey, primary, { kind, mirrorR2, sourceUrl: primary })
      .catch(() => undefined)
      .finally(() => {
        if (scheduledSafetyCaptures.size > 500) scheduledSafetyCaptures.clear();
      });
  }, { timeoutMs: 8_000, fallbackDelayMs: 1_500 });
}

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  mediaKey: string;
  kind?: UserMediaKind | string;
  primarySrc?: string | null;
  mirrorR2?: boolean;
  fallbackNode?: React.ReactNode;
};

export default function ResilientUserImage({
  mediaKey,
  kind = "user_image",
  primarySrc,
  mirrorR2 = true,
  fallbackNode = null,
  onLoad,
  onError,
  src: srcProp,
  ...imgProps
}: Props) {
  const primary = String(primarySrc || srcProp || "").trim();
  const [fallback, setFallback] = React.useState("");
  const [primaryBroken, setPrimaryBroken] = React.useState(false);
  const [fallbackBroken, setFallbackBroken] = React.useState(false);

  React.useEffect(() => {
    setPrimaryBroken(false);
    setFallbackBroken(false);
    setFallback("");
  }, [mediaKey, primary, kind, mirrorR2]);

  // Le fallback local/externe/R2 peut être coûteux. Tant que l'image primaire fonctionne,
  // il n'y a aucune raison de lancer ce pipeline pour chaque photo de la page.
  React.useEffect(() => {
    let cancelled = false;
    if (primary && !primaryBroken) return () => { cancelled = true; };

    void resolveUserMediaFallback(mediaKey, primary, { kind, allowR2: true, mirrorRecoveredToR2: mirrorR2 })
      .then((value) => { if (!cancelled && value) setFallback(value); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [mediaKey, primary, kind, mirrorR2, primaryBroken]);

  const active = !primaryBroken && primary ? primary : (!fallbackBroken ? fallback : "");
  if (!active) return <>{fallbackNode}</>;

  return (
    <img
      {...imgProps}
      src={active}
      decoding={imgProps.decoding ?? "async"}
      onLoad={(event) => {
        if (active === primary && primary) {
          scheduleSafetyCapture(mediaKey, primary, kind, mirrorR2);
        }
        onLoad?.(event);
      }}
      onError={(event) => {
        if (active === primary) setPrimaryBroken(true);
        else setFallbackBroken(true);
        onError?.(event);
      }}
    />
  );
}

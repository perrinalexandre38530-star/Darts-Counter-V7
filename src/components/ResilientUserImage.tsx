import React from "react";
import {
  captureUserMediaFallback,
  resolveUserMediaFallback,
  type UserMediaKind,
} from "../lib/userMediaFallback";

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
    let cancelled = false;
    setPrimaryBroken(false);
    setFallbackBroken(false);
    setFallback("");
    void resolveUserMediaFallback(mediaKey, primary, { kind, allowR2: true, mirrorRecoveredToR2: mirrorR2 })
      .then((value) => { if (!cancelled && value) setFallback(value); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [mediaKey, primary, kind, mirrorR2]);

  const active = !primaryBroken && primary ? primary : (!fallbackBroken ? fallback : "");
  if (!active) return <>{fallbackNode}</>;

  return (
    <img
      {...imgProps}
      src={active}
      onLoad={(event) => {
        if (active === primary && primary) {
          void captureUserMediaFallback(mediaKey, primary, { kind, mirrorR2, sourceUrl: primary }).catch(() => undefined);
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

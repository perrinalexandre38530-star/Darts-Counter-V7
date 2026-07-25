import React, { useMemo } from "react";
import ProfileAvatar from "../ProfileAvatar";

type Props = {
  src?: string | null;
  fallbackSrc?: string | null;
  profileId?: string | null;
  size?: number;
  label?: string;
};

export default React.memo(function AvatarLite({ src, fallbackSrc, profileId, size = 64, label = "?" }: Props) {
  const safeSrc = useMemo(() => {
    if (!src) return "";
    return String(src);
  }, [src]);

  const safeFallbackSrc = useMemo(() => {
    if (!fallbackSrc) return "";
    return String(fallbackSrc);
  }, [fallbackSrc]);

  return (
    <ProfileAvatar
      size={size}
      dataUrl={safeSrc}
      fallbackDataUrl={safeFallbackSrc}
      profileId={profileId || null}
      label={label}
      showStars={false}
    />
  );
});

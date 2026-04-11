import React, { useMemo } from "react";
import ProfileAvatar from "../ProfileAvatar";

type Props = {
  src?: string | null;
  size?: number;
  label?: string;
};

export default React.memo(function AvatarLite({ src, size = 64, label = "?" }: Props) {
  const safeSrc = useMemo(() => {
    if (!src) return "";
    return String(src);
  }, [src]);

  return (
    <ProfileAvatar
      size={size}
      dataUrl={safeSrc}
      label={label}
      showStars={false}
    />
  );
});

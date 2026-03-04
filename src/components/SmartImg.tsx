import React from "react";
import { assetWebpUrl } from "../lib/assetUrl";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  useWebp?: boolean;
};

export default function SmartImg({ src, useWebp = true, ...rest }: Props) {
  const finalSrc = useWebp ? assetWebpUrl(src) : src;

  return (
    <img
      {...rest}
      src={finalSrc}
      loading={rest.loading ?? "lazy"}
      decoding={rest.decoding ?? "async"}
    />
  );
}
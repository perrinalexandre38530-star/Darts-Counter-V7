import React from "react";

type Props = {
  src: string;
  alt: string;
  maxWidth?: number | string;
  marginBottom?: number;
  startSlot?: React.ReactNode;
  endSlot?: React.ReactNode;
  imageStyle?: React.CSSProperties;
};

export default function TopTicker({
  src,
  alt,
  maxWidth = 760,
  marginBottom = 14,
  startSlot,
  endSlot,
  imageStyle,
}: Props) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
        margin: `0 auto ${marginBottom}px`,
      }}
    >
      <div
        style={{
          width: "100%",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(40,234,255,.38)",
          background: "linear-gradient(90deg, rgba(3,7,18,.96), rgba(9,15,30,.96), rgba(3,7,18,.96))",
          boxShadow: "0 0 22px rgba(40,234,255,.22), inset 0 0 20px rgba(255,255,255,.035)",
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            width: "100%",
            height: "auto",
            aspectRatio: "6 / 1",
            objectFit: "cover",
            display: "block",
            ...imageStyle,
          }}
        />
      </div>

      {startSlot ? (
        <div
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          {startSlot}
        </div>
      ) : null}

      {endSlot ? (
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          {endSlot}
        </div>
      ) : null}
    </div>
  );
}

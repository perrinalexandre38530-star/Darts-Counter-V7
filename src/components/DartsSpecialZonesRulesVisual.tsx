import React from "react";
import specialZonesHorizontalFr from "../assets/rules/special-zones/special_zones_horizontal_fr.webp";
import specialZonesVerticalFr from "../assets/rules/special-zones/special_zones_vertical_fr.webp";
import specialZonesHorizontalEn from "../assets/rules/special-zones/special_zones_horizontal_en.webp";
import specialZonesVerticalEn from "../assets/rules/special-zones/special_zones_vertical_en.webp";

type Props = {
  lang?: string;
  maxWidth?: number | string;
  borderColor?: string;
  compact?: boolean;
  className?: string;
};

export function isSpecialZonesFrench(lang?: string) {
  return String(lang || "fr").toLowerCase().startsWith("fr");
}

export function specialZonesResponsiveAsset(lang?: string) {
  const isFr = isSpecialZonesFrench(lang);
  const portrait = isFr ? specialZonesVerticalFr : specialZonesVerticalEn;
  const landscape = isFr ? specialZonesHorizontalFr : specialZonesHorizontalEn;
  if (typeof window === "undefined") return landscape;
  try {
    return window.matchMedia?.("(orientation: portrait)")?.matches || window.innerHeight > window.innerWidth ? portrait : landscape;
  } catch {
    return landscape;
  }
}

export default function DartsSpecialZonesRulesVisual({
  lang = "fr",
  maxWidth = "100%",
  borderColor = "rgba(255,210,0,.42)",
  compact = false,
  className,
}: Props) {
  const isFr = isSpecialZonesFrench(lang);
  const portrait = isFr ? specialZonesVerticalFr : specialZonesVerticalEn;
  const landscape = isFr ? specialZonesHorizontalFr : specialZonesHorizontalEn;
  const alt = isFr
    ? "Fiche explicative des zones spéciales de la cible : zones fermées des chiffres et anneau extérieur"
    : "Special dartboard zones guide: enclosed number areas and outer ring";

  return (
    <picture
      className={className}
      style={{
        display: "block",
        width: "100%",
        maxWidth,
        margin: compact ? "0 auto 8px" : "4px auto 2px",
      }}
    >
      <source media="(orientation: portrait)" srcSet={portrait} />
      <img
        src={landscape}
        alt={alt}
        draggable={false}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: compact ? 12 : 16,
          border: `1px solid ${borderColor}`,
          background: "#050608",
          boxShadow: compact ? "0 8px 22px rgba(0,0,0,.28)" : "0 14px 34px rgba(0,0,0,.38)",
        }}
      />
    </picture>
  );
}

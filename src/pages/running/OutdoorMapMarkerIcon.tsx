import React from "react";
import type { OutdoorRoutePlaceCategory } from "../../activity/outdoorRoutePlaces";

export type OutdoorMapMarkerKind = OutdoorRoutePlaceCategory | "start" | "finish";

export function outdoorMapMarkerLabel(kind: OutdoorMapMarkerKind, lang = "fr") {
  const fr: Record<OutdoorMapMarkerKind, string> = {
    start: "Départ", finish: "Arrivée", viewpoint: "Vue / panorama", peak: "Sommet", water: "Point d'eau",
    shelter: "Refuge", parking: "Parking", toilets: "Toilettes", food: "Restauration", cafe: "Café",
    information: "Information", attraction: "Point d'intérêt",
  };
  const en: Record<OutdoorMapMarkerKind, string> = {
    start: "Start", finish: "Finish", viewpoint: "Viewpoint", peak: "Peak", water: "Drinking water",
    shelter: "Shelter", parking: "Parking", toilets: "Toilets", food: "Food", cafe: "Café",
    information: "Information", attraction: "Point of interest",
  };
  const es: Record<OutdoorMapMarkerKind, string> = {
    start: "Salida", finish: "Llegada", viewpoint: "Mirador", peak: "Cima", water: "Agua potable",
    shelter: "Refugio", parking: "Aparcamiento", toilets: "Baños", food: "Restauración", cafe: "Café",
    information: "Información", attraction: "Punto de interés",
  };
  return lang.startsWith("fr") ? fr[kind] : lang.startsWith("es") ? es[kind] : en[kind];
}

export function outdoorMapMarkerColor(kind: OutdoorMapMarkerKind, accent = "#50e6ff") {
  if (kind === "start") return "#44ec83";
  if (kind === "finish") return "#ff6575";
  if (kind === "attraction") return "#ffd45c";
  if (kind === "water") return "#6ddcff";
  if (kind === "parking") return "#79b8ff";
  return accent;
}

export function OutdoorMapMarkerIcon({ kind, size = 18 }: { kind: OutdoorMapMarkerKind; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {kind === "start" ? <><path {...common} d="M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 1 1 16 0Z"/><circle {...common} cx="12" cy="10" r="2.5"/></> : null}
    {kind === "finish" ? <><path {...common} d="M6 21V4"/><path {...common} d="M7 5h9l-2 3 2 3H7"/></> : null}
    {kind === "viewpoint" ? <><path {...common} d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z"/><circle {...common} cx="12" cy="12" r="2.6"/></> : null}
    {kind === "parking" ? <><path {...common} d="M7 20V4h6.2a5 5 0 0 1 0 10H7"/><path {...common} d="M7 14h6"/></> : null}
    {kind === "attraction" ? <path {...common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/> : null}
    {kind === "peak" ? <><path {...common} d="m3 19 6.5-11 3.2 5 2.2-3.5L21 19Z"/><path {...common} d="m8.1 10.3 1.4 1.2 1.2-1.7"/></> : null}
    {kind === "water" ? <path {...common} d="M12 3s5 5.8 5 10a5 5 0 1 1-10 0c0-4.2 5-10 5-10Z"/> : null}
    {kind === "shelter" ? <><path {...common} d="M3.5 18.5 12 6l8.5 12.5"/><path {...common} d="M7 18.5h10M12 9v9.5"/></> : null}
    {kind === "toilets" ? <><circle {...common} cx="8" cy="6" r="2"/><path {...common} d="M8 8.5v5M5.5 11.5h5M6.2 21l1-7.5h1.6l1 7.5"/><circle {...common} cx="17" cy="6" r="2"/><path {...common} d="M17 8.5v5M14.5 11.5h5M15.2 21l1-7.5h1.6l1 7.5"/></> : null}
    {kind === "food" ? <><path {...common} d="M6 3v8M3.5 3v5c0 1.7 1.1 3 2.5 3s2.5-1.3 2.5-3V3M6 11v10"/><path {...common} d="M16 3v18M16 3c3 1.5 4 4.5 4 7h-4"/></> : null}
    {kind === "cafe" ? <><path {...common} d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path {...common} d="M16 10h2a2 2 0 0 1 0 4h-2M7 21h10"/></> : null}
    {kind === "information" ? <><circle {...common} cx="12" cy="12" r="9"/><path {...common} d="M12 11v6M12 7h.01"/></> : null}
  </svg>;
}

export function outdoorMapMarkerSvgMarkup(kind: OutdoorMapMarkerKind, size = 17) {
  const stroke = "currentColor";
  const attr = `fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const shapes: Record<OutdoorMapMarkerKind, string> = {
    start: `<path ${attr} d="M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 1 1 16 0Z"/><circle ${attr} cx="12" cy="10" r="2.5"/>`,
    finish: `<path ${attr} d="M6 21V4"/><path ${attr} d="M7 5h9l-2 3 2 3H7"/>`,
    viewpoint: `<path ${attr} d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z"/><circle ${attr} cx="12" cy="12" r="2.6"/>`,
    parking: `<path ${attr} d="M7 20V4h6.2a5 5 0 0 1 0 10H7"/><path ${attr} d="M7 14h6"/>`,
    attraction: `<path ${attr} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>`,
    peak: `<path ${attr} d="m3 19 6.5-11 3.2 5 2.2-3.5L21 19Z"/><path ${attr} d="m8.1 10.3 1.4 1.2 1.2-1.7"/>`,
    water: `<path ${attr} d="M12 3s5 5.8 5 10a5 5 0 1 1-10 0c0-4.2 5-10 5-10Z"/>`,
    shelter: `<path ${attr} d="M3.5 18.5 12 6l8.5 12.5"/><path ${attr} d="M7 18.5h10M12 9v9.5"/>`,
    toilets: `<circle ${attr} cx="8" cy="6" r="2"/><path ${attr} d="M8 8.5v5M5.5 11.5h5M6.2 21l1-7.5h1.6l1 7.5"/><circle ${attr} cx="17" cy="6" r="2"/><path ${attr} d="M17 8.5v5M14.5 11.5h5M15.2 21l1-7.5h1.6l1 7.5"/>`,
    food: `<path ${attr} d="M6 3v8M3.5 3v5c0 1.7 1.1 3 2.5 3s2.5-1.3 2.5-3V3M6 11v10"/><path ${attr} d="M16 3v18M16 3c3 1.5 4 4.5 4 7h-4"/>`,
    cafe: `<path ${attr} d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path ${attr} d="M16 10h2a2 2 0 0 1 0 4h-2M7 21h10"/>`,
    information: `<circle ${attr} cx="12" cy="12" r="9"/><path ${attr} d="M12 11v6M12 7h.01"/>`,
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="display:block">${shapes[kind]}</svg>`;
}

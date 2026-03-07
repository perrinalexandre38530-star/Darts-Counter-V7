// =============================================================
// src/pages/petanque/PetanqueHome.tsx
// HOME Pétanque — même structure visuelle que src/pages/Home.tsx
// (ActiveProfileCard + ArcadeTicker + bloc détails)
// =============================================================

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Store, Profile } from "../../lib/types";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";

import { loadPetanqueState } from "../../lib/petanqueStore";
import { getPetanqueMatches } from "../../lib/petanqueStats";

import tickerPetanqueActu1 from "../../assets/tickers/ticker_petanque_actu.png";
import tickerPetanqueActu2 from "../../assets/tickers/ticker_petanque_actu_2.png";
import tickerPetanqueActu3 from "../../assets/tickers/ticker_petanque_actu_3.png";

import tickerPetanqueNouveaute1 from "../../assets/tickers/ticker_petanque_nouveaute.png";
import tickerPetanqueNouveaute2 from "../../assets/tickers/ticker_petanque_nouveaute_2.png";
import tickerPetanqueNouveaute3 from "../../assets/tickers/ticker_petanque_nouveaute_3.png";

import tickerPetanqueResultats1 from "../../assets/tickers/ticker_petanque_resultats.png";
import tickerPetanqueResultats2 from "../../assets/tickers/ticker_petanque_resultats_2.png";
import tickerPetanqueResultats3 from "../../assets/tickers/ticker_petanque_resultats_3.png";

import tickerPetanqueEvenements1 from "../../assets/tickers/ticker_petanque_evenements.png";
import tickerPetanqueEvenements2 from "../../assets/tickers/ticker_petanque_evenements_2.png";
import tickerPetanqueEvenements3 from "../../assets/tickers/ticker_petanque_evenements_3.png";

import tickerPetanqueAstuce1 from "../../assets/tickers/ticker_petanque_astuce.png";
import tickerPetanqueAstuce2 from "../../assets/tickers/ticker_petanque_astuce_2.png";
import tickerPetanqueAstuce3 from "../../assets/tickers/ticker_petanque_astuce_3.png";
type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 620;
const DETAIL_INTERVAL_MS = 7000;

// ✅ Alignement unique (mêmes extérieurs partout)
const SECTION_PAD_X = 10;
const sectionWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: PAGE_MAX_WIDTH,
  paddingInline: SECTION_PAD_X,
};

// ✅ on garde le CDN (comme Home.tsx) MAIS pour Pétanque on met des visuels PETANQUE en data-uri (zéro asset à ajouter)
const IMG_BASE =
  "https://cdn.jsdelivr.net/gh/perrinalexandre38530-star/Darts-Counter-V5.3@main/public/img/";

// -------------------------------------------------------------
// ✅ VISUELS PETANQUE (SVG -> data:image) pour remplacer les tickers darts
// -------------------------------------------------------------
const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

// 2 variantes “boules + cochonnet”
const P_IMG_BOULES_1 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#1b2233"/>
      <stop offset="55%" stop-color="#0b0f18"/>
      <stop offset="100%" stop-color="#060812"/>
    </radialGradient>
    <radialGradient id="metalGold" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#ffe2a0"/>
      <stop offset="30%" stop-color="#d6a84a"/>
      <stop offset="65%" stop-color="#8a6a2a"/>
      <stop offset="100%" stop-color="#221a0e"/>
    </radialGradient>
    <radialGradient id="metalSteel" cx="45%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#e7f2ff"/>
      <stop offset="35%" stop-color="#9dbfe6"/>
      <stop offset="70%" stop-color="#355a7c"/>
      <stop offset="100%" stop-color="#0b1420"/>
    </radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe7ad"/>
      <stop offset="0.4" stop-color="#c99a39"/>
      <stop offset="1" stop-color="#3b2a12"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feColorMatrix in="b" type="matrix"
        values="1 0 0 0 0
                0 0.85 0 0 0
                0 0 0.35 0 0
                0 0 0 0.9 0" result="g"/>
      <feMerge>
        <feMergeNode in="g"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="1200" height="700" fill="url(#bg)"/>

  <circle cx="820" cy="250" r="220" fill="#ffcc66" opacity="0.10" filter="url(#glow)"/>
  <circle cx="400" cy="340" r="260" fill="#ffcc66" opacity="0.08" filter="url(#glow)"/>

  <g transform="translate(610 165)">
    <circle cx="220" cy="220" r="170" fill="url(#metalGold)" stroke="url(#rim)" stroke-width="10"/>
    <g opacity="0.32">
      <path d="M115,110 C210,65 330,95 365,165" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M90,205 C220,125 350,165 382,265" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M100,305 C235,245 335,288 362,365" fill="none" stroke="#fff" stroke-width="6"/>
    </g>
    <circle cx="160" cy="150" r="45" fill="#fff" opacity="0.10"/>
  </g>

  <g transform="translate(250 215)">
    <circle cx="220" cy="220" r="190" fill="url(#metalSteel)" stroke="url(#rim)" stroke-width="10"/>
    <g opacity="0.25">
      <path d="M90,145 C215,70 370,120 405,230" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M80,255 C225,150 375,215 410,338" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M110,365 C265,295 365,335 395,425" fill="none" stroke="#fff" stroke-width="6"/>
    </g>
    <circle cx="150" cy="160" r="55" fill="#fff" opacity="0.08"/>
  </g>

  <g transform="translate(430 360)">
    <circle cx="120" cy="120" r="55" fill="#ffcc66" opacity="0.16" filter="url(#glow)"/>
    <circle cx="120" cy="120" r="34" fill="#f5a623"/>
    <circle cx="108" cy="106" r="10" fill="#fff" opacity="0.24"/>
  </g>
</svg>
`);

const P_IMG_BOULES_2 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <radialGradient id="bg" cx="55%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#182137"/>
      <stop offset="55%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
    <radialGradient id="metal" cx="40%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#f5f8ff"/>
      <stop offset="30%" stop-color="#b8cff0"/>
      <stop offset="70%" stop-color="#3f678a"/>
      <stop offset="100%" stop-color="#0b1420"/>
    </radialGradient>
    <radialGradient id="metal2" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#ffe8b0"/>
      <stop offset="30%" stop-color="#e1b35a"/>
      <stop offset="70%" stop-color="#7a5b24"/>
      <stop offset="100%" stop-color="#1f160b"/>
    </radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe7ad"/>
      <stop offset="0.4" stop-color="#c99a39"/>
      <stop offset="1" stop-color="#3b2a12"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feColorMatrix in="b" type="matrix"
        values="1 0 0 0 0
                0 0.85 0 0 0
                0 0 0.35 0 0
                0 0 0 0.9 0" result="g"/>
      <feMerge>
        <feMergeNode in="g"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="1200" height="700" fill="url(#bg)"/>
  <circle cx="760" cy="250" r="240" fill="#ffcc66" opacity="0.09" filter="url(#glow)"/>
  <circle cx="420" cy="350" r="260" fill="#ffcc66" opacity="0.06" filter="url(#glow)"/>

  <g transform="translate(560 190)">
    <circle cx="240" cy="240" r="180" fill="url(#metal)" stroke="url(#rim)" stroke-width="10"/>
    <g opacity="0.25">
      <path d="M120,140 C230,70 380,120 410,230" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M105,260 C240,150 380,220 410,350" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M130,380 C270,300 375,340 395,430" fill="none" stroke="#fff" stroke-width="6"/>
    </g>
  </g>

  <g transform="translate(220 250)">
    <circle cx="220" cy="220" r="165" fill="url(#metal2)" stroke="url(#rim)" stroke-width="10" opacity="0.95"/>
    <g opacity="0.28">
      <path d="M110,120 C210,70 335,105 365,185" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M95,210 C220,135 340,175 370,265" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="M110,300 C240,245 330,285 355,350" fill="none" stroke="#fff" stroke-width="6"/>
    </g>
  </g>

  <g transform="translate(450 410)">
    <circle cx="110" cy="110" r="50" fill="#ffcc66" opacity="0.14" filter="url(#glow)"/>
    <circle cx="110" cy="110" r="30" fill="#f5a623"/>
    <circle cx="100" cy="98" r="9" fill="#fff" opacity="0.24"/>
  </g>
</svg>
`);

// 2 variantes “mesure / mètre ruban / cible”
const P_IMG_MESURE_1 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0f18"/>
      <stop offset="55%" stop-color="#070a11"/>
      <stop offset="100%" stop-color="#04060c"/>
    </linearGradient>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a2218"/>
      <stop offset="100%" stop-color="#141016"/>
    </linearGradient>
    <linearGradient id="tape" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffe7ad"/>
      <stop offset="45%" stop-color="#d6a84a"/>
      <stop offset="100%" stop-color="#6a4b1c"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <rect width="1200" height="700" fill="url(#bg)"/>
  <rect x="0" y="320" width="1200" height="380" fill="url(#sand)" opacity="0.95"/>
  <circle cx="870" cy="240" r="200" fill="#00e5a8" opacity="0.08" filter="url(#soft)"/>
  <circle cx="340" cy="250" r="240" fill="#ffcc66" opacity="0.06" filter="url(#soft)"/>

  <g transform="translate(250 185) rotate(-8)">
    <rect x="0" y="0" rx="22" ry="22" width="660" height="90" fill="url(#tape)" opacity="0.95"/>
    <rect x="16" y="16" rx="16" ry="16" width="628" height="58" fill="#0b0f18" opacity="0.22"/>
    <g stroke="#0b0f18" opacity="0.75">
      ${Array.from({ length: 34 })
        .map((_, i) => {
          const x = 20 + i * 19;
          const h = i % 5 === 0 ? 42 : 26;
          return `<path d="M${x} 70 V${70 - h}" stroke-width="3"/>`;
        })
        .join("")}
    </g>
  </g>

  <g transform="translate(820 360)">
    <circle cx="120" cy="120" r="85" fill="#0b0f18" opacity="0.55"/>
    <circle cx="120" cy="120" r="70" fill="#00e5a8" opacity="0.10"/>
    <circle cx="120" cy="120" r="58" fill="#ffcc66" opacity="0.18"/>
    <circle cx="120" cy="120" r="44" fill="#0b0f18" opacity="0.35"/>
    <circle cx="120" cy="120" r="12" fill="#00e5a8" opacity="0.55"/>
  </g>
</svg>
`);

const P_IMG_MESURE_2 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <radialGradient id="bg" cx="45%" cy="25%" r="90%">
      <stop offset="0%" stop-color="#0b1322"/>
      <stop offset="55%" stop-color="#070a11"/>
      <stop offset="100%" stop-color="#04060c"/>
    </radialGradient>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#241d14"/>
      <stop offset="100%" stop-color="#120f14"/>
    </linearGradient>
    <linearGradient id="tape" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#c8ffef"/>
      <stop offset="45%" stop-color="#00e5a8"/>
      <stop offset="100%" stop-color="#0a4f3d"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <rect width="1200" height="700" fill="url(#bg)"/>
  <rect x="0" y="315" width="1200" height="385" fill="url(#sand)" opacity="0.95"/>
  <circle cx="820" cy="235" r="210" fill="#ffcc66" opacity="0.06" filter="url(#soft)"/>
  <circle cx="360" cy="255" r="250" fill="#00e5a8" opacity="0.07" filter="url(#soft)"/>

  <g transform="translate(280 195) rotate(-6)">
    <rect x="0" y="0" rx="22" ry="22" width="620" height="86" fill="url(#tape)" opacity="0.95"/>
    <rect x="14" y="14" rx="16" ry="16" width="592" height="58" fill="#0b0f18" opacity="0.22"/>
    <g stroke="#0b0f18" opacity="0.75">
      ${Array.from({ length: 32 })
        .map((_, i) => {
          const x = 20 + i * 18.5;
          const h = i % 5 === 0 ? 40 : 24;
          return `<path d="M${x} 66 V${66 - h}" stroke-width="3"/>`;
        })
        .join("")}
    </g>
  </g>

  <g transform="translate(850 370)">
    <circle cx="110" cy="110" r="78" fill="#0b0f18" opacity="0.55"/>
    <circle cx="110" cy="110" r="62" fill="#00e5a8" opacity="0.10"/>
    <circle cx="110" cy="110" r="50" fill="#ffcc66" opacity="0.16"/>
    <circle cx="110" cy="110" r="38" fill="#0b0f18" opacity="0.32"/>
    <circle cx="110" cy="110" r="10" fill="#ffcc66" opacity="0.55"/>
  </g>
</svg>
`);

// 2 variantes “tournoi / bracket”
const P_IMG_TOURNOI_1 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#151c2c"/>
      <stop offset="55%" stop-color="#090c13"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <rect width="1200" height="700" fill="url(#bg)"/>
  <circle cx="860" cy="250" r="220" fill="#ff7a18" opacity="0.10" filter="url(#soft)"/>
  <circle cx="360" cy="280" r="260" fill="#ffcc66" opacity="0.06" filter="url(#soft)"/>

  <g stroke="#ffcc66" stroke-width="6" opacity="0.38" fill="none" stroke-linecap="round">
    <path d="M260 210 H420 V300 H560"/>
    <path d="M260 410 H420 V320 H560"/>
    <path d="M640 260 H780 V350 H940"/>
    <path d="M640 360 H780 V270 H940"/>
  </g>

  <g fill="#0b0f18" opacity="0.85" stroke="#ff7a18" stroke-width="6">
    <rect x="190" y="180" width="120" height="70" rx="18"/>
    <rect x="190" y="380" width="120" height="70" rx="18"/>
    <rect x="560" y="275" width="120" height="70" rx="18"/>
    <rect x="940" y="240" width="120" height="70" rx="18"/>
    <rect x="940" y="340" width="120" height="70" rx="18"/>
  </g>
</svg>
`);

const P_IMG_TOURNOI_2 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b101c"/>
      <stop offset="55%" stop-color="#070a11"/>
      <stop offset="100%" stop-color="#050710"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <rect width="1200" height="700" fill="url(#bg)"/>
  <circle cx="820" cy="240" r="230" fill="#ffcc66" opacity="0.06" filter="url(#soft)"/>
  <circle cx="380" cy="300" r="260" fill="#ff7a18" opacity="0.08" filter="url(#soft)"/>

  <g stroke="#ff7a18" stroke-width="6" opacity="0.36" fill="none" stroke-linecap="round">
    <path d="M280 220 H440 V300 H600"/>
    <path d="M280 410 H440 V330 H600"/>
    <path d="M680 265 H820 V350 H980"/>
    <path d="M680 365 H820 V275 H980"/>
  </g>

  <g fill="#0b0f18" opacity="0.85" stroke="#ffcc66" stroke-width="6">
    <rect x="210" y="188" width="120" height="70" rx="18"/>
    <rect x="210" y="380" width="120" height="70" rx="18"/>
    <rect x="600" y="285" width="120" height="70" rx="18"/>
    <rect x="980" y="240" width="120" height="70" rx="18"/>
    <rect x="980" y="340" width="120" height="70" rx="18"/>
  </g>
</svg>
`);

// 2 variantes “astuce / fair-play”
const P_IMG_TIP_1 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#121a2b"/>
      <stop offset="55%" stop-color="#090c13"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <rect width="1200" height="700" fill="url(#bg)"/>
  <circle cx="850" cy="250" r="230" fill="#ffffff" opacity="0.06" filter="url(#soft)"/>
  <circle cx="360" cy="310" r="270" fill="#ffcc66" opacity="0.06" filter="url(#soft)"/>
</svg>
`);

const P_IMG_TIP_2 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b101c"/>
      <stop offset="55%" stop-color="#080b12"/>
      <stop offset="100%" stop-color="#050710"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <rect width="1200" height="700" fill="url(#bg)"/>
  <circle cx="820" cy="250" r="230" fill="#ffcc66" opacity="0.05" filter="url(#soft)"/>
  <circle cx="380" cy="300" r="270" fill="#ffffff" opacity="0.06" filter="url(#soft)"/>
</svg>
`);

// 2 variantes “news” (utilisé côté carte droite)
const P_IMG_NEWS_1 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <radialGradient id="bg" cx="55%" cy="25%" r="90%">
      <stop offset="0%" stop-color="#131c2e"/>
      <stop offset="55%" stop-color="#090c13"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>
  <rect width="1200" height="700" fill="url(#bg)"/>
  <circle cx="850" cy="240" r="230" fill="#ffcc66" opacity="0.06" filter="url(#soft)"/>
  <circle cx="360" cy="320" r="270" fill="#00e5a8" opacity="0.06" filter="url(#soft)"/>
</svg>
`);

const P_IMG_NEWS_2 = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b101c"/>
      <stop offset="55%" stop-color="#080b12"/>
      <stop offset="100%" stop-color="#050710"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>
  <rect width="1200" height="700" fill="url(#bg)"/>
  <circle cx="820" cy="240" r="230" fill="#00e5a8" opacity="0.06" filter="url(#soft)"/>
  <circle cx="380" cy="320" r="270" fill="#ffcc66" opacity="0.05" filter="url(#soft)"/>
</svg>
`);

const TICKER_IMAGES = {
  // ✅ Home "infos" (nouveautés / actu / résultats / événements)
  news: [tickerPetanqueActu1, tickerPetanqueActu2, tickerPetanqueActu3],
  new: [tickerPetanqueNouveaute1, tickerPetanqueNouveaute2, tickerPetanqueNouveaute3],
  results: [tickerPetanqueResultats1, tickerPetanqueResultats2, tickerPetanqueResultats3],
  events: [tickerPetanqueEvenements1, tickerPetanqueEvenements2, tickerPetanqueEvenements3],
  tip: [tickerPetanqueAstuce1, tickerPetanqueAstuce2, tickerPetanqueAstuce3],

  // legacy (data-uri) conservé si tu veux réutiliser plus tard
  local: [P_IMG_BOULES_1, P_IMG_BOULES_2],
  training: [P_IMG_MESURE_1, P_IMG_MESURE_2],
  leaderboard: [P_IMG_TOURNOI_1, P_IMG_TOURNOI_2],
  tipNews: [P_IMG_NEWS_1, P_IMG_NEWS_2],
  global: [P_IMG_BOULES_1, P_IMG_BOULES_2],
} as const;

function hashStringToInt(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ✅ FIX: support "avoid" pour empêcher 2 backgrounds identiques visibles en même temps
function pickTickerImage<K extends keyof typeof TICKER_IMAGES>(
  key: K,
  seed: string,
  opts?: { avoid?: string[] }
): string {
  const arr = TICKER_IMAGES[key];
  const list = Array.isArray(arr) ? arr.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
  if (!list.length) return "";

  const avoid = (opts?.avoid ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);

  let idx = hashStringToInt(`${key}::${seed}`) % list.length;
  let picked = list[idx] ?? "";

  // ✅ évite doublon (si possible)
  if (picked && avoid.includes(picked) && list.length > 1) {
    picked = list[(idx + 1) % list.length] ?? picked;
    if (picked && avoid.includes(picked) && list.length > 2) {
      picked = list[(idx + 2) % list.length] ?? picked;
    }
  }

  return picked;
}



function themeKeyFromId(id: string): keyof typeof TICKER_IMAGES {
  if (id.includes("petanque-results")) return "results";
  if (id.includes("petanque-events")) return "events";
  if (id.includes("petanque-tip")) return "tip";
  if (id.includes("petanque-new")) return "new";
  return "news";
}

function safeActiveProfile(store: Store): Profile | null {
  const profiles = store?.profiles ?? [];
  const activeProfileId = (store as any)?.activeProfileId ?? null;
  const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  return active ?? null;
}

/**
 * ✅ Important: "PETANQUE COUNTER" ne doit JAMAIS être coupé.
 * On garde 1 ligne (nowrap) et on scale automatiquement si ça dépasse.
 */
function useAutoFitTitle(deps: any[] = []) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const text = textRef.current;
      if (!wrap || !text) return;

      // reset scale for accurate measurement
      text.style.transform = "scale(1)";
      // force reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      text.offsetHeight;

      const available = wrap.clientWidth;
      const needed = text.scrollWidth;

      if (!available || !needed) {
        setScale(1);
        return;
      }

      if (needed <= available) {
        setScale(1);
        return;
      }

      const s = Math.max(0.72, Math.min(1, available / needed));
      setScale(s);
    };

    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { wrapRef, textRef, scale };
}

export default function PetanqueHome({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);

// ✅ KPI Pétanque (LOCAL) pour le KPI "Vue globale" du profil actif
// - sessions : nb de matchs où le profil apparaît (Team A/B)
// - win% : ratio de victoires
// - moy.3d : réutilisé ici comme "moy. mènes / match"
const petanqueGlobalStats = useMemo(() => {
  const profId = String(activeProfile?.id ?? "").trim();
  const profName = String((activeProfile as any)?.name ?? "").trim().toLowerCase();

  const matches = getPetanqueMatches();

  // Fallback : si aucun historique, on prend l'état local courant (partie en cours / terminée)
  const st = loadPetanqueState();
  const stEnds = Array.isArray(st?.ends) ? st.ends.length : 0;
  const stFinished = String((st as any)?.status ?? "") === "finished" || !!(st as any)?.finishedAt || !!(st as any)?.finished;

  const hasProfile = !!profId || !!profName;

  const resolveTeam = (teams: any): ("A" | "B" | null) => {
    const A = (teams?.A?.players || teams?.A || []).flat?.() ?? (teams?.A?.players || teams?.A || []);
    const B = (teams?.B?.players || teams?.B || []).flat?.() ?? (teams?.B?.players || teams?.B || []);
    const inA = A.some((p: any) => String(p?.id ?? "") === profId || String(p?.name ?? "").trim().toLowerCase() === profName);
    const inB = B.some((p: any) => String(p?.id ?? "") === profId || String(p?.name ?? "").trim().toLowerCase() === profName);
    return inA ? "A" : inB ? "B" : null;
  };

  let sessions = 0;
  let wins = 0;
  let endsSum = 0;
  let pointsSum = 0;
  let diffSum = 0;
  let carreauxSum = 0;

  if (matches.length && hasProfile) {
    for (const m of matches) {
      const teamOfProfile = resolveTeam(m?.teams);
      if (!teamOfProfile) continue;

      sessions += 1;

      const ptsA = Number(m?.scoreA ?? m?.scores?.A ?? 0) || 0;
      const ptsB = Number(m?.scoreB ?? m?.scores?.B ?? 0) || 0;

      const winner = String(m?.winner ?? m?.winTeam ?? "").toUpperCase();
      if ((winner === "A" || winner === "B") && winner === teamOfProfile) wins += 1;

      const ends = Number(m?.ends ?? m?.endsCount ?? m?.mènes ?? m?.menes ?? 0) || 0;
      endsSum += ends;

      const ptsMe = teamOfProfile === "A" ? ptsA : ptsB;
      const ptsOpp = teamOfProfile === "A" ? ptsB : ptsA;
      pointsSum += ptsMe;
      diffSum += ptsMe - ptsOpp;

      // Carreaux: supporte plusieurs noms possibles en attendant une normalisation
      carreauxSum +=
        Number(m?.stats?.carreaux ?? m?.carreaux ?? m?.kpis?.carreaux ?? m?.shots?.carreaux ?? 0) || 0;
    }
  } else {
    // Pas d'historique : on affiche au moins quelque chose de cohérent
    sessions = 0;
    wins = 0;
    endsSum = stEnds;
    pointsSum = 0;
    diffSum = 0;
    carreauxSum = 0;
  }

  const winRate = sessions > 0 ? wins / sessions : 0;
  const avgPts = sessions > 0 ? pointsSum / sessions : 0;

  // "Rating" Pétanque : score simple et stable (0..999)
  // - priorise Win% puis Pts/match, sans jamais afficher NaN/undefined
  const rating = sessions > 0 ? Math.max(0, Math.min(999, Math.round(winRate * 100 + avgPts * 2))) : 0;

  return {
    sessions,
    wins,
    winRate, // 0..1
    avgPts,
    ptsPerEnd: endsSum > 0 ? pointsSum / endsSum : 0,
    menes: endsSum,
    carreaux: carreauxSum,
    rating,
    // legacy fields if you still use them elsewhere
    avgEnds: sessions > 0 ? endsSum / sessions : stEnds,
    finished: stFinished,
  };
}, [activeProfile]);
const [kpis, setKpis] = useState<{
    ends: number;
    scoreA: number;
    scoreB: number;
    target: number;
    finished: boolean;
  }>({
    ends: 0,
    scoreA: 0,
    scoreB: 0,
    target: 13,
    finished: false,
  });

  useEffect(() => {
    const st = loadPetanqueState();
    setKpis({
      ends: Array.isArray(st?.ends) ? st.ends.length : 0,
      scoreA: Number(st?.scoreA ?? 0) || 0,
      scoreB: Number(st?.scoreB ?? 0) || 0,
      target: Number(st?.target ?? 13) || 13,
      finished: !!st?.finished,
    });
  }, []);

  const seed = String(activeProfile?.id ?? "anon");

  const tickerItems: ArcadeTickerItem[] = useMemo(() => {
    const st = loadPetanqueState();
    const ends = Array.isArray(st?.ends) ? st.ends.length : 0;
    const a = Number(st?.scoreA ?? 0) || 0;
    const b = Number(st?.scoreB ?? 0) || 0;
    const target = Number(st?.target ?? 13) || 13;
    const finished = !!st?.finished;

    // ✅ Résultats / reprise (dépend de l'état local)
    const resume = finished
      ? t("petanque.home.ticker.results.finished", "Partie terminée — consulte le résumé ou relance une partie.")
      : ends > 0
      ? t("petanque.home.ticker.results.live", `Partie en cours : ${a} — ${b} (objectif ${target}).`)
      : t("petanque.home.ticker.results.empty", "Aucun résultat récent — lance une partie pour commencer.");

    // ✅ Contenu “éditorial” : tu pourras brancher ça plus tard (Supabase/news feed)
    const actuText = t(
      "petanque.home.ticker.news.text",
      "Infos du moment : nouvelles variantes, correctifs UI, et améliorations du mode Local."
    );

    const newText = t(
      "petanque.home.ticker.new.text",
      "Nouveautés : tickers dédiés (Actu / Nouveauté / Résultats / Événements) + visuels importés en assets."
    );

    const eventsText = t(
      "petanque.home.ticker.events.text",
      "Événements : crée un tournoi, lance un challenge, ou consulte le calendrier."
    );

    const tipText = t(
      "petanque.home.ticker.tip.text",
      "Astuce : annonce la mène et confirme la marque avant de reprendre le jeu."
    );

    return [
      {
        id: "petanque-news",
        title: t("petanque.home.ticker.news.title", "Actualité"),
        text: actuText,
        detail: t("petanque.home.ticker.news.detail", "Actu · Patch · Infos"),
        backgroundImage: pickTickerImage("news", `${seed}::petanque-news`),
        accentColor: "#00E5A8",
      },
      {
        id: "petanque-new",
        title: t("petanque.home.ticker.new.title", "Nouveauté"),
        text: newText,
        detail: t("petanque.home.ticker.new.detail", "UI · Assets · Cohérence"),
        backgroundImage: pickTickerImage("new", `${seed}::petanque-new`),
        accentColor: theme.primary ?? "#F6C256",
      },
      {
        id: "petanque-results",
        title: t("petanque.home.ticker.results.title", "Résultats"),
        text: resume,
        detail: ends > 0 ? `${ends} mènes · ${a}—${b} · obj ${target}` : "",
        backgroundImage: pickTickerImage("results", `${seed}::petanque-results`),
        accentColor: "#FF7A18",
      },
      {
        id: "petanque-events",
        title: t("petanque.home.ticker.events.title", "Événements"),
        text: eventsText,
        detail: t("petanque.home.ticker.events.detail", "Tournois · Défis · Stats"),
        backgroundImage: pickTickerImage("events", `${seed}::petanque-events`),
        accentColor: "#7DBEFF",
      },
      {
        id: "petanque-tip",
        title: t("petanque.home.ticker.tip.title", "Astuce"),
        text: tipText,
        detail: t("petanque.home.ticker.tip.detail", "Rythme · Clarté · Fair-play"),
        backgroundImage: pickTickerImage("tip", `${seed}::petanque-tip`),
        accentColor: "#FFFFFF",
      },
    ];
  }, [seed, theme.primary, t, kpis.ends, kpis.scoreA, kpis.scoreB, kpis.target, kpis.finished]);

  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    if (!tickerItems.length) return;
    const id = window.setInterval(() => {
      setTickerIndex((prev) => (tickerItems.length ? (prev + 1) % tickerItems.length : 0));
    }, DETAIL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [tickerItems.length]);

  useEffect(() => {
    setTickerIndex(0);
  }, [activeProfile?.id]);

  const currentTicker = tickerItems.length ? tickerItems[Math.min(tickerIndex, tickerItems.length - 1)] : null;

  const detailAccent = currentTicker?.accentColor ?? theme.primary ?? "#F6C256";
  const leftTitle = currentTicker?.title ?? t("petanque.home.detail.left.title", "Pétanque");
  const leftText = currentTicker?.text ?? "";

  // ✅ FIX: évite d'avoir le même background sur le ticker du haut + la carte gauche (visible en même temps)
  const currentKey = themeKeyFromId(currentTicker?.id ?? "");

  // ✅ fond dynamique (change quand le ticker défile) + évite doublons visibles
  const statsBackgroundImage = pickTickerImage(currentKey as any, `${seed}::left::${currentTicker?.id ?? "none"}`,
    { avoid: [currentTicker?.backgroundImage ?? ""] }
  );
const secondaryTicker = tickerItems.length
    ? tickerItems[(tickerIndex + 1) % tickerItems.length]
    : null;

  const rightTitle = secondaryTicker?.title ?? t("petanque.home.detail.right.title", "Infos");
  const rightText = secondaryTicker?.text ?? t("petanque.home.detail.right.text", "");
  const rightDetail = secondaryTicker?.detail ?? "";
  const avoidRight = [statsBackgroundImage ?? "", currentTicker?.backgroundImage ?? ""].filter(Boolean) as string[];
  const rightBgImage = secondaryTicker
    ? pickTickerImage(themeKeyFromId(secondaryTicker.id) as any, `${seed}::right::${secondaryTicker.id}`, { avoid: avoidRight })
    : pickTickerImage("tipNews", `${seed}::petanque-right`);
  const primary = theme.primary ?? "#F6C256";

  // ✅ Auto-fit sur les petits écrans (ne coupe jamais le titre)
  const { wrapRef: titleWrapRef, textRef: titleTextRef, scale: titleScale } = useAutoFitTitle([
    theme.primary,
    t("home.welcome", "Bienvenue"),
  ]);

  return (
    <div
      className="petanque-home container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        paddingBottom: 0,
        alignItems: "center",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <style>{`
        @keyframes dcTitlePulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }
        @keyframes dcTitleShimmer { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
      `}</style>

      {/* ===== HEADER (même "Bienvenue" que Darts + titre jamais coupé) ===== */}
      <div style={{ ...sectionWrap, marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {/* ✅ Bienvenue = pill/badge (comme Darts) */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "5px 12px",
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.28))",
              boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
              color: primary,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {t("home.welcome", "Bienvenue")}
          </div>

          {/* ✅ Container + auto-fit scale */}
          <div ref={titleWrapRef} style={{ width: "100%", overflow: "hidden" }}>
            <div
              ref={titleTextRef}
              style={{
                width: "fit-content",
                marginInline: "auto",
                textAlign: "center",
                textTransform: "uppercase",
                fontWeight: 1000,
                fontSize: "clamp(18px, 6.2vw, 30px)",
                letterSpacing: "clamp(0.6px, 0.75vw, 3px)",
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                backgroundImage: `linear-gradient(120deg, ${primary}, #ffffff, ${primary})`,
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                color: "transparent",
                animation: "dcTitlePulse 3.6s ease-in-out infinite, dcTitleShimmer 7s linear infinite",
                transform: `scale(${titleScale})`,
                transformOrigin: "center",
              }}
            >
              PETANQUE COUNTER
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Carte joueur actif (mêmes extérieurs) */}
      {activeProfile && (
        <div style={sectionWrap}>
          <ActiveProfileCard
            hideStatus={true}
            profile={activeProfile as any}
            // ✅ Stats "globales" affichées dans le bloc Profil actif
            stats={
              {
                ratingGlobal: petanqueGlobalStats.rating,
                winrateGlobal: petanqueGlobalStats.winRate,
                avg3DGlobal: petanqueGlobalStats.avgPts,
                sessionsGlobal: petanqueGlobalStats.sessions,
                favoriteNumberLabel: "—",
              } as any
            }
            // ✅ Mode Pétanque: libellés + valeurs dédiées
            globalTitle={t("petanque.home.global.title", "Vue globale")}
            globalKpis={[
              { label: t("petanque.kpi.rating", "rating"), value: petanqueGlobalStats.rating },
              { label: t("petanque.kpi.menes", "mènes"), value: petanqueGlobalStats.menes },
              { label: t("petanque.kpi.win", "win%"), value: `${Math.round(petanqueGlobalStats.winRate * 100)}%` },
              {
                label: t("petanque.kpi.avgPts", "moy. pts/match"),
                value: Number(petanqueGlobalStats.avgPts).toFixed(1),
              },
              { label: t("petanque.kpi.carreaux", "carreaux"), value: petanqueGlobalStats.carreaux },
              {
                label: t("petanque.kpi.ptsPerEnd", "pts/mène"),
                value: Number(petanqueGlobalStats.ptsPerEnd).toFixed(2),
              },
            ]}
          />
        </div>
      )}

      {/* ✅ Ticker arcade — mêmes extérieurs */}
      <div style={sectionWrap}>
        <ArcadeTicker
          items={tickerItems}
          activeIndex={tickerIndex}
          intervalMs={DETAIL_INTERVAL_MS}
          onIndexChange={(index: number) => {
            if (!tickerItems.length) return;
            const safe = Math.min(Math.max(index, 0), tickerItems.length - 1);
            setTickerIndex(safe);
          }}
          onActiveIndexChange={(index: number) => {
            if (!tickerItems.length) return;
            const safe = Math.min(Math.max(index, 0), tickerItems.length - 1);
            setTickerIndex(safe);
          }}
        />
      </div>

      {/* ✅ Détails ticker — WRAP dans sectionWrap pour aligner les extérieurs */}
      {currentTicker && (
        <div style={{ ...sectionWrap, marginTop: 10, marginBottom: 10 }}>
          <div
            style={{
              width: "100%",
              borderRadius: 22,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
              padding: 8,
              background: "radial-gradient(circle at top, rgba(255,255,255,0.06), rgba(3,4,10,1))",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {/* gauche */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 108,
                  backgroundColor: "#05060C",
                  backgroundImage: statsBackgroundImage ? `url("${statsBackgroundImage}")` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(130deg, rgba(0,0,0,0.85), rgba(0,0,0,0.45))",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    padding: "10px 10px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: detailAccent,
                    }}
                  >
                    {leftTitle}
                  </div>

                  <div style={{ fontSize: 11, lineHeight: 1.35, color: theme.textSoft ?? "rgba(255,255,255,0.9)" }}>
                    {leftText}
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                      gap: 6,
                    }}
                  >
                    <MiniKpi
                      label={t("petanque.home.kpi.ends", "Mènes")}
                      value={String(kpis.ends)}
                      primary={detailAccent}
                      theme={theme}
                    />
                    <MiniKpi
                      label={t("petanque.home.kpi.score", "Score")}
                      value={`${kpis.scoreA}—${kpis.scoreB}`}
                      primary={detailAccent}
                      theme={theme}
                    />
                  </div>
                </div>
              </div>

              {/* droite */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 108,
                  backgroundColor: "#05060C",
                  backgroundImage: rightBgImage ? `url("${rightBgImage}")` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(130deg, rgba(0,0,0,0.85), rgba(0,0,0,0.55))",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    padding: "10px 10px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: "#FFFFFF",
                    }}
                  >
                    {rightTitle}
                  </div>

                  <div style={{ fontSize: 11, lineHeight: 1.35, color: theme.textSoft ?? "rgba(255,255,255,0.9)" }}>
                    {rightText}
                  </div>

                  {rightDetail ? (
                    <div style={{ marginTop: 2, fontSize: 10, fontWeight: 800, opacity: 0.9, color: "#FFFFFF" }}>
                      {rightDetail}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 26 }} />
    </div>
  );
}

function MiniKpi({ label, value, primary, theme }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
        background: "rgba(0,0,0,0.22)",
        padding: "8px 9px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", color: primary }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 1000, color: "#fff" }}>{value}</div>
    </div>
  );
}



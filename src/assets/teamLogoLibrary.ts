// @ts-nocheck
// =============================================================
// src/assets/teamLogoLibrary.ts
// Bibliothèque interne de logos d'équipe prêts à choisir.
// ⚠️ Logos génériques uniquement : aucun logo BOT / équipe spéciale.
// =============================================================

export type TeamLogoCategory =
  | "popular"
  | "darts"
  | "football"
  | "petanque"
  | "babyfoot"
  | "pingpong"
  | "molkky"
  | "dicegame"
  | "multisport";

export type TeamLogoTemplate = {
  id: string;
  label: string;
  category: TeamLogoCategory;
  tags: string[];
  src: string;
};

export const TEAM_LOGO_CATEGORIES: Array<{ id: TeamLogoCategory | "all"; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "popular", label: "Populaires" },
  { id: "darts", label: "Fléchettes" },
  { id: "football", label: "Foot" },
  { id: "petanque", label: "Pétanque" },
  { id: "babyfoot", label: "Baby-foot" },
  { id: "pingpong", label: "Ping-pong" },
  { id: "molkky", label: "Mölkky" },
  { id: "dicegame", label: "Dés" },
  { id: "multisport", label: "Multi" },
];

function esc(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function makeLogo(opts: {
  label: string;
  short: string;
  icon: string;
  a: string;
  b: string;
  c: string;
  shape?: "circle" | "shield" | "hex" | "badge";
}) {
  const shape = opts.shape || "badge";
  const core =
    shape === "shield"
      ? `<path d="M128 18L224 54v74c0 64-39 102-96 124-57-22-96-60-96-124V54L128 18Z" fill="url(#g)" stroke="${opts.c}" stroke-width="7"/>`
      : shape === "hex"
        ? `<path d="M128 18l91 53v114l-91 53-91-53V71l91-53Z" fill="url(#g)" stroke="${opts.c}" stroke-width="7"/>`
        : shape === "circle"
          ? `<circle cx="128" cy="128" r="104" fill="url(#g)" stroke="${opts.c}" stroke-width="7"/>`
          : `<rect x="28" y="28" width="200" height="200" rx="44" fill="url(#g)" stroke="${opts.c}" stroke-width="7"/>`;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <radialGradient id="g" cx="35%" cy="24%" r="84%">
        <stop offset="0%" stop-color="${opts.a}"/>
        <stop offset="100%" stop-color="${opts.b}"/>
      </radialGradient>
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000" flood-opacity=".45"/>
      </filter>
      <filter id="glow" x="-70%" y="-70%" width="240%" height="240%">
        <feGaussianBlur stdDeviation="5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g filter="url(#shadow)">${core}</g>
    <circle cx="128" cy="128" r="78" fill="rgba(0,0,0,.20)" stroke="rgba(255,255,255,.20)" stroke-width="3"/>
    <text x="128" y="128" text-anchor="middle" dominant-baseline="central"
      font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="900" filter="url(#glow)">${esc(opts.icon)}</text>
    <text x="128" y="204" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
      font-size="22" font-weight="1000" fill="#fff" letter-spacing="1.5" paint-order="stroke"
      stroke="rgba(0,0,0,.55)" stroke-width="5">${esc(opts.short)}</text>
  </svg>`;
  return svgDataUrl(svg);
}

const seed: Array<Omit<TeamLogoTemplate, "src"> & { short: string; icon: string; a: string; b: string; c: string; shape?: any }> = [
  { id: "skull-fire", label: "Skull Fire", short: "SKULL", icon: "☠", category: "popular", tags: ["skull", "feu", "darts"], a: "#ffcf40", b: "#9a1010", c: "#ffd15a", shape: "shield" },
  { id: "wolf-night", label: "Wolf Night", short: "WOLF", icon: "◆", category: "popular", tags: ["wolf", "night"], a: "#28eaff", b: "#18223f", c: "#84f4ff", shape: "hex" },
  { id: "dragon-red", label: "Dragon Red", short: "DRGN", icon: "✦", category: "popular", tags: ["dragon", "rouge"], a: "#ff7a45", b: "#3a0910", c: "#ffad60", shape: "shield" },
  { id: "crown-gold", label: "Crown Gold", short: "KING", icon: "♛", category: "popular", tags: ["couronne", "gold"], a: "#ffe36e", b: "#5a3200", c: "#fff0a6", shape: "circle" },
  { id: "target-pro", label: "Target Pro", short: "180", icon: "◎", category: "darts", tags: ["target", "cible", "fléchettes"], a: "#26f7ff", b: "#003642", c: "#8af8ff", shape: "circle" },
  { id: "dart-bolt", label: "Dart Bolt", short: "BOLT", icon: "⚡", category: "darts", tags: ["dart", "éclair"], a: "#fff05a", b: "#0f2138", c: "#fff38c", shape: "hex" },
  { id: "bull-master", label: "Bull Master", short: "BULL", icon: "●", category: "darts", tags: ["bull", "cible"], a: "#ff4a4a", b: "#101010", c: "#ffb0b0", shape: "circle" },
  { id: "triple-ring", label: "Triple Ring", short: "TRPL", icon: "✚", category: "darts", tags: ["triple", "ring"], a: "#20ff9a", b: "#002b20", c: "#98ffd2", shape: "badge" },
  { id: "ball-stars", label: "Ball Stars", short: "FOOT", icon: "●", category: "football", tags: ["foot", "ballon"], a: "#42ff9e", b: "#05351f", c: "#b8ffd7", shape: "circle" },
  { id: "goal-line", label: "Goal Line", short: "GOAL", icon: "✚", category: "football", tags: ["goal", "football"], a: "#49d4ff", b: "#081e3a", c: "#9beaff", shape: "shield" },
  { id: "eleven-club", label: "Eleven Club", short: "XI", icon: "★", category: "football", tags: ["club", "eleven"], a: "#ffffff", b: "#193c78", c: "#c8e1ff", shape: "hex" },
  { id: "ultra-foot", label: "Ultra Foot", short: "ULTRA", icon: "⚑", category: "football", tags: ["ultra", "foot"], a: "#ff477e", b: "#21102e", c: "#ff9bbb", shape: "shield" },
  { id: "boule-king", label: "Boule King", short: "BOUL", icon: "●", category: "petanque", tags: ["boule", "pétanque"], a: "#d8d8d8", b: "#313842", c: "#ffffff", shape: "circle" },
  { id: "cochonnet", label: "Cochonnet", short: "PETQ", icon: "•", category: "petanque", tags: ["cochonnet", "pétanque"], a: "#ffd666", b: "#6f4700", c: "#ffe8a6", shape: "badge" },
  { id: "baby-striker", label: "Baby Striker", short: "BABY", icon: "●", category: "babyfoot", tags: ["babyfoot"], a: "#ff9f43", b: "#4d1b00", c: "#ffd2a0", shape: "badge" },
  { id: "table-hero", label: "Table Hero", short: "HERO", icon: "✦", category: "babyfoot", tags: ["babyfoot", "table"], a: "#3df2ff", b: "#12204c", c: "#a8fbff", shape: "hex" },
  { id: "ping-spin", label: "Ping Spin", short: "SPIN", icon: "●", category: "pingpong", tags: ["ping", "pong"], a: "#ffffff", b: "#1b74ff", c: "#e8f2ff", shape: "circle" },
  { id: "racket-club", label: "Racket Club", short: "PING", icon: "✕", category: "pingpong", tags: ["racket", "pingpong"], a: "#ff5b5b", b: "#280814", c: "#ffaaaa", shape: "shield" },
  { id: "molkky-wood", label: "Mölkky Wood", short: "WOOD", icon: "▮", category: "molkky", tags: ["molkky", "bois"], a: "#d79045", b: "#432100", c: "#ffd0a0", shape: "hex" },
  { id: "molkky-king", label: "Mölkky King", short: "MÖL", icon: "♛", category: "molkky", tags: ["molkky", "king"], a: "#f7c45a", b: "#3b2800", c: "#ffe39a", shape: "shield" },
  { id: "dice-luck", label: "Dice Luck", short: "DICE", icon: "◆", category: "dicegame", tags: ["dés", "chance"], a: "#fdfdfd", b: "#6532b8", c: "#e5d9ff", shape: "badge" },
  { id: "double-six", label: "Double Six", short: "6·6", icon: "✦", category: "dicegame", tags: ["dés", "six"], a: "#2affd5", b: "#0d1540", c: "#a0fff0", shape: "hex" },
  { id: "multi-stars", label: "Multi Stars", short: "TEAM", icon: "★", category: "multisport", tags: ["multi", "stars"], a: "#28eaff", b: "#250045", c: "#dba6ff", shape: "circle" },
  { id: "storm-team", label: "Storm Team", short: "STORM", icon: "⚡", category: "multisport", tags: ["storm", "multi"], a: "#72faff", b: "#131c28", c: "#bffcff", shape: "shield" },
  { id: "phoenix", label: "Phoenix", short: "FIRE", icon: "▲", category: "multisport", tags: ["phoenix", "fire"], a: "#ff8a00", b: "#2b0500", c: "#ffd07c", shape: "shield" },
  { id: "ice-club", label: "Ice Club", short: "ICE", icon: "✦", category: "multisport", tags: ["ice", "club"], a: "#d8ffff", b: "#0d3760", c: "#ffffff", shape: "hex" },
  { id: "cobra", label: "Cobra", short: "COBRA", icon: "S", category: "multisport", tags: ["cobra", "snake"], a: "#b6ff3d", b: "#163300", c: "#dfff9a", shape: "circle" },
  { id: "pirate", label: "Pirate", short: "CREW", icon: "☠", category: "multisport", tags: ["pirate"], a: "#ffdf70", b: "#151515", c: "#fff0aa", shape: "shield" },
  { id: "spartan", label: "Spartan", short: "SPRT", icon: "Λ", category: "multisport", tags: ["spartan"], a: "#ff3d3d", b: "#2a0707", c: "#ff9a9a", shape: "shield" },
  { id: "samurai", label: "Samurai", short: "SAM", icon: "刀", category: "multisport", tags: ["samurai"], a: "#ffffff", b: "#820018", c: "#ffd1d8", shape: "circle" },
];

export const TEAM_LOGO_LIBRARY: TeamLogoTemplate[] = seed.map((item) => ({
  id: item.id,
  label: item.label,
  category: item.category,
  tags: item.tags,
  src: makeLogo(item),
}));

export function getRandomTeamLogo(category?: TeamLogoCategory | "all") {
  const pool = TEAM_LOGO_LIBRARY.filter((logo) => !category || category === "all" || logo.category === category || logo.category === "popular");
  return pool[Math.floor(Math.random() * Math.max(1, pool.length))] || TEAM_LOGO_LIBRARY[0];
}

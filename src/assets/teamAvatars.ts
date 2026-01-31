// ============================================
// src/assets/teamAvatars.ts
// Team avatar resolver for X01 TEAMS scoreboard
//
// ✅ Supports user-provided PNG/SVG/WEBP avatars (preferred)
// ✅ Safe fallback to generated gradient SVG if assets missing
//
// Drop your files here (recommended):
//   src/ui_assets/teams/team_pink.(png|webp|svg)
//   src/ui_assets/teams/team_gold.(png|webp|svg)
//   src/ui_assets/teams/team_blue.(png|webp|svg)
//   src/ui_assets/teams/team_green.(png|webp|svg)
//
// You can also add aliases:
//   team_red => team_pink, team_yellow => team_gold, etc.
// ============================================

export type TeamSkin = "pink" | "gold" | "blue" | "green";

// Vite: eager url import of any matching assets if they exist.
// This does NOT crash if no files exist; it just yields an empty object.
const TEAM_ASSET_URLS: Record<string, string> = {
  ...import.meta.glob("../ui_assets/teams/team_*.png", { eager: true, as: "url" }),
  ...import.meta.glob("../ui_assets/teams/team_*.webp", { eager: true, as: "url" }),
  ...import.meta.glob("../ui_assets/teams/team_*.svg", { eager: true, as: "url" }),
  ...import.meta.glob("../../src/ui_assets/teams/team_*.png", { eager: true, as: "url" }),
  ...import.meta.glob("../../src/ui_assets/teams/team_*.webp", { eager: true, as: "url" }),
  ...import.meta.glob("../../src/ui_assets/teams/team_*.svg", { eager: true, as: "url" }),
} as any;

function pickAssetUrl(skin: TeamSkin): string | null {
  const keys = Object.keys(TEAM_ASSET_URLS);
  if (!keys.length) return null;

  const wanted = `team_${skin}`;
  // match end-of-path filenames robustly
  const found = keys.find((k) => k.toLowerCase().includes(`/team_${skin}.`) || k.toLowerCase().endsWith(`team_${skin}.png`) || k.toLowerCase().endsWith(`team_${skin}.webp`) || k.toLowerCase().endsWith(`team_${skin}.svg`));
  return found ? TEAM_ASSET_URLS[found] : null;
}

function fallbackSvg(skin: TeamSkin): string {
  const palette: Record<TeamSkin, { a: string; b: string; stroke: string }> = {
    pink: { a: "#FF4FD8", b: "#8A2BFF", stroke: "#FFD1F2" },
    gold: { a: "#FFB800", b: "#FF5A00", stroke: "#FFE7B0" },
    blue: { a: "#18A0FB", b: "#00F5D4", stroke: "#B7F2FF" },
    green: { a: "#00E676", b: "#00B0FF", stroke: "#B8FFD9" },
  };

  const p = palette[skin];
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <radialGradient id="g" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stop-color="${p.a}"/>
        <stop offset="100%" stop-color="${p.b}"/>
      </radialGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="b"/>
        <feMerge>
          <feMergeNode in="b"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="128" cy="128" r="112" fill="url(#g)"/>
    <circle cx="128" cy="128" r="110" fill="none" stroke="${p.stroke}" stroke-width="6" filter="url(#glow)"/>
    <path d="M64 150c16-22 40-38 64-38s48 16 64 38" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="96" cy="108" r="10" fill="rgba(0,0,0,0.25)"/>
    <circle cx="160" cy="108" r="10" fill="rgba(0,0,0,0.25)"/>
  </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getTeamAvatarUrl(skin: TeamSkin): string {
  // asset wins
  const assetUrl = pickAssetUrl(skin);
  if (assetUrl) return assetUrl;

  // aliases
  // (keep minimal; user can just rename files)
  return fallbackSvg(skin);
}

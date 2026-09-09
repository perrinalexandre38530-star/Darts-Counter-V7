import fs from "node:fs";

const read = (p) => {
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  return fs.readFileSync(p, "utf8");
};
const need = (text, needle, label = needle) => {
  if (!text.includes(needle)) throw new Error(`Missing contract: ${label}`);
};

const host = read("src/pages/esports/EsportsNetworkV7.tsx");
const ui = read("src/pages/esports/EsportsNetworkV8.tsx");
const api = read("src/esports/networkV8.ts");
const css = read("src/pages/esports/esportsHub.css");
const sql = read("supabase/migrations/20260909164500_esports_competitive_seasons_v8.sql");
const pkg = JSON.parse(read("package.json"));

need(host, 'import EsportsCompetitiveSeasonsV8 from "./EsportsNetworkV8"', "V8 component import");
need(host, "<EsportsCompetitiveSeasonsV8", "V8 rendered from TEAM RANKED");
need(ui, "COMPETITIVE SEASONS", "V8 season center");
need(ui, "PROMOTIONS / RELÉGATIONS", "promotion/relegation timeline");
need(ui, "TROPHÉES & PALMARÈS", "season honours");
need(ui, "MVP DE SAISON", "season MVP");
need(ui, "HISTORIQUE DES SAISONS", "season archive UI");
need(ui, "CLASSEMENT DE SAISON", "historical leaderboard UI");

for (const fn of [
  "ms_esports_team_season_dashboard_v8",
  "ms_esports_team_season_history_v8",
  "ms_esports_team_division_events_v8",
  "ms_esports_team_season_awards_v8",
  "ms_esports_team_season_leaderboard_v8",
]) need(api, fn, `client RPC ${fn}`);

need(sql, "public.ms_esports_team_division_events", "division events table");
need(sql, "public.ms_esports_team_season_awards", "season awards table");
need(sql, "ms_esports_team_division_v8", "shared divisions");
need(sql, "ms_esports_capture_team_division_event_v8", "automatic promotion/relegation capture");
need(sql, "after insert on public.ms_esports_team_rating_history", "rating-history trigger");
need(sql, "season_mvp", "season MVP awards");
need(sql, "SEASON CHAMPION", "season champion award");
need(sql, "ms_esports_finalize_team_season_v8", "service season finalization");
need(sql, "to service_role", "season closure not exposed to normal clients");
need(sql, "placement_matches", "team placement progress");
need(sql, "modeStats", "mode statistics payload");

need(css, ".esports-v8-root", "V8 responsive root");
need(css, "overflow-x: clip", "V8 horizontal overflow guard");
need(css, "@media (max-width: 440px)", "phone breakpoint");
need(css, "@media (max-width: 330px)", "small-phone breakpoint");
need(css, "grid-template-columns:minmax(0,1fr) !important", "phone single-column reflow");

const testScript = String(pkg?.scripts?.["test:esports"] || "");
need(testScript, "test-esports-competitive-seasons-v8.mjs", "package test:esports includes V8");

console.log("✅ E-SPORTS COMPETITIVE SEASONS V0.8 contract OK");
console.log("   - team placements + divisions + promotion/relegation history");
console.log("   - season MVP + podium trophies + service-role finalization");
console.log("   - historical season archive + historical leaderboards");
console.log("   - responsive phone-safe season center");

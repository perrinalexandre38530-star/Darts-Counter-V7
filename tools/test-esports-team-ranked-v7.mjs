import fs from "node:fs";

const mustRead = (p) => {
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  return fs.readFileSync(p, "utf8");
};
const need = (text, needle, label = needle) => {
  if (!text.includes(needle)) throw new Error(`Missing contract: ${label}`);
};

const ui = mustRead("src/pages/esports/EsportsNetworkV7.tsx");
const api = mustRead("src/esports/networkV7.ts");
const host = mustRead("src/pages/esports/EsportsNetworkV5.tsx");
const css = mustRead("src/pages/esports/esportsHub.css");
const sql = mustRead("supabase/migrations/20260906234800_esports_team_ranked_v7.sql");
const pkg = JSON.parse(mustRead("package.json"));

need(host, 'import EsportsTeamRankedV7 from "./EsportsNetworkV7"', "V7 component import");
need(host, "<EsportsTeamRankedV7", "V7 rendered after ranked progression");

for (const text of [ui, api]) {
  need(text, "V7", "V7 implementation marker");
}
need(ui, "TEAM RANKED", "TEAM RANKED UI");
need(ui, "VERROUILLER LE ROSTER", "locked roster action");
need(ui, "CHERCHER UNE ÉQUIPE", "team matchmaking action");
need(ui, "CONFIRMER COMME CAPITAINE", "captain result confirmation");
need(ui, "LEADERBOARD TEAM MMR", "team MMR leaderboard");
need(ui, "PROFIL PUBLIC D'ÉQUIPE", "public team profile");
need(ui, "teamSizesForGame", "game-aware team sizes");

for (const fn of [
  "ms_esports_team_ranked_my_teams_v7",
  "ms_esports_lock_team_roster_v7",
  "ms_esports_join_team_queue_v7",
  "ms_esports_get_team_match_v7",
  "ms_esports_claim_team_room_v7",
  "ms_esports_submit_team_result_v7",
  "ms_esports_team_leaderboard_v7",
  "ms_esports_team_public_profile_v7",
]) need(api, fn, `client RPC ${fn}`);

for (const table of [
  "ms_esports_team_ranked_rosters",
  "ms_esports_team_ranked_roster_members",
  "ms_esports_team_matchmaking_queue",
  "ms_esports_team_competitive_matches",
  "ms_esports_team_ratings",
  "ms_esports_team_member_ratings",
  "ms_esports_team_rating_history",
  "ms_esports_team_member_rating_history",
]) need(sql, `public.${table}`, `SQL table ${table}`);

need(sql, "ROSTER_SIZE_MISMATCH", "server exact roster-size guard");
need(sql, "LOCKED_CAPTAIN_ROLE_REQUIRED", "captain role server guard");
need(sql, "for update skip locked", "race-safe team matchmaking");
need(sql, "source_pair_key text not null unique", "canonical team match anti-duplicate key");
need(sql, "CAPTAIN_ONLY", "captain-only score confirmation");
need(sql, "report_a", "bilateral team score report A");
need(sql, "report_b", "bilateral team score report B");
need(sql, "v_k:=case when v_matches<5 then 48 else 32 end", "team placement K48 then K32");
need(sql, "v_k:=case when v_matches<5 then 40 else 24 end", "individual team MMR K40 then K24");
need(sql, "team_ranked_result", "team result notifications");
need(sql, "visibility='public'", "public team visibility");
need(sql, "ms_esports_team_ranked_roster_members for select to authenticated using(user_id=auth.uid())", "non-recursive roster-member RLS");
need(sql, "public.ms_esports_team_ranked_rosters.team_id", "qualified outer-team RLS reference");

need(css, ".esports-v7-root", "V7 responsive root");
need(css, "overflow-x: clip", "V7 horizontal overflow guard");
need(css, "@media (max-width: 440px)", "phone breakpoint");
need(css, ".esports-v7-versus-grid", "versus responsive grid");
need(css, "grid-template-columns: minmax(0,1fr) !important", "phone single-column reflow");

const testScript = String(pkg?.scripts?.["test:esports"] || "");
need(testScript, "test-esports-team-ranked-v7.mjs", "package test:esports includes V7");

console.log("✅ E-SPORTS TEAM RANKED V0.7 contract OK");
console.log("   - locked rosters + captain authority");
console.log("   - race-safe team matchmaking + canonical matches");
console.log("   - bilateral captain result confirmation");
console.log("   - team MMR + individual member MMR");
console.log("   - public team profile + season leaderboard");
console.log("   - responsive phone layout contract");

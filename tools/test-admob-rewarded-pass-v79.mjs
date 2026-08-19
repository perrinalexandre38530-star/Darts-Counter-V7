import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manager = fs.readFileSync(path.join(root, "src/monetization/MonetizationManager.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/monetization/MonetizationSettingsPanel.tsx"), "utf8");
const config = JSON.parse(fs.readFileSync(path.join(root, "config/admob.public.json"), "utf8"));

const checks = [
  [manager.includes('const REWARDED_PASS_MATCHES = 3'), "reward exactly 3 matches"],
  [manager.includes('REWARDED_PASS_ID = "skip_next_3_end_game_interstitials"'), "stable reward id"],
  [manager.includes('state.rewardedInterstitialPasses -= 1'), "consume one pass only on completed monetized match"],
  [manager.includes('state.pending = { matchId: id'), "fallback interstitial still exists without pass"],
  [manager.includes('result.status === "shown" && result.earned'), "grant only after SDK reward confirmation"],
  [manager.includes('state.rewardedInterstitialPasses = REWARDED_PASS_MATCHES'), "grant reward after completion"],
  [manager.includes('Math.min(REWARDED_PASS_MATCHES'), "local reward counter clamped"],
  [panel.includes('Choix volontaire'), "clear opt-in disclosure"],
  [panel.includes('3 prochaines parties'), "reward disclosed before ad"],
  [panel.includes('Les bannières restent actives'), "reward scope disclosed"],
  [panel.includes('REGARDER 1 PUB → 3 PARTIES'), "explicit user action"],
  [panel.includes('!adMobConfig.rewardedReady'), "real rewarded button blocked until real id exists"],
  [String(config.androidRewardedId || '') === '', "no production rewarded id invented"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`);
if (failed.length) {
  console.error(`Rewarded pass V79 regression failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`Rewarded pass V79 regression OK (${checks.length}/${checks.length})`);

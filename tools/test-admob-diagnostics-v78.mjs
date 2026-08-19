import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const manager = read("src/monetization/MonetizationManager.ts");
const provider = read("src/monetization/provider.ts");
const native = read("src/monetization/nativeAdMob.ts");
const panel = read("src/monetization/MonetizationSettingsPanel.tsx");

const checks = [
  [manager.includes("preloadGoogleTestFullscreenAds"), "manager expose le préchargement diagnostic"],
  [manager.includes("previewGoogleTestInterstitial"), "manager expose le test interstitiel"],
  [manager.includes("previewGoogleTestRewarded"), "manager expose le test rewarded"],
  [manager.includes("diagnostic_only_no_app_reward"), "rewarded diagnostic ne correspond à aucun bonus applicatif"],
  [provider.includes("if (!forceTest && (!canRequestPaidAds"), "provider autorise seulement forceTest à contourner le verrou FREE/Premium"],
  [native.includes("if (!forceGoogleTest && (!canRequestPaidAds"), "bridge natif autorise seulement Google TEST à contourner le verrou"],
  [panel.includes("TESTS PLEIN ÉCRAN GOOGLE · AUCUN REVENU"), "panneau affiche clairement le caractère non rémunéré"],
  [panel.includes("Aucun bonus applicatif n’a été attribué"), "le rewarded de diagnostic n'attribue pas de bonus"],
  [panel.includes('runAdDiagnostic("interstitial")'), "bouton test interstitiel présent"],
  [panel.includes('runAdDiagnostic("rewarded")'), "bouton test rewarded présent"],
];

let failed = 0;
for (const [ok, label] of checks) {
  if (ok) console.log(`✅ ${label}`);
  else { console.error(`❌ ${label}`); failed += 1; }
}
if (failed) process.exit(1);
console.log("\n✅ ADMOB DIAGNOSTICS V78 OK\n");

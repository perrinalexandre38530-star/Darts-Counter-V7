#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const payloadRoot = path.resolve(here, "..");
const projectRoot = path.resolve(process.argv[2] || process.cwd());
const srcRoot = path.join(projectRoot, "src");

function fail(message) {
  console.error(`\n[MONETIZATION PATCH] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(path.join(projectRoot, "package.json")) || !fs.existsSync(path.join(srcRoot, "App.tsx"))) {
  fail(`Dossier projet invalide : ${projectRoot}`);
}

function copyFile(relative) {
  const from = path.join(payloadRoot, relative);
  const to = path.join(projectRoot, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`+ ${relative}`);
}

function replaceOnce(text, search, replacement, label) {
  if (text.includes(replacement)) return text;
  const idx = text.indexOf(search);
  if (idx < 0) fail(`Ancre introuvable (${label}). Le projet a changé : patch arrêté sans écraser ce fichier.`);
  if (text.indexOf(search, idx + search.length) >= 0) fail(`Ancre ambiguë (${label}). Patch arrêté.`);
  return text.slice(0, idx) + replacement + text.slice(idx + search.length);
}

function patchApp() {
  const file = path.join(srcRoot, "App.tsx");
  let text = fs.readFileSync(file, "utf8");

  text = replaceOnce(
    text,
    'import SportQuickSwitch from "./components/SportQuickSwitch";',
    'import SportQuickSwitch from "./components/SportQuickSwitch";\n// MONETIZATION_V1\nimport AdSlot, { resolveBannerPlacementForRoute } from "./monetization/AdSlot";\nimport { interceptMonetizedNavigation, markCompletedMatchForAds } from "./monetization/MonetizationManager";',
    "App imports"
  );

  if (!text.includes("function commitGo(next: Tab")) {
    text = replaceOnce(
      text,
      '  /* Navigation */\n  function go(next: Tab, params?: any) {',
      '  /* Navigation */\n  function go(next: Tab, params?: any) {\n    const intercepted = interceptMonetizedNavigation({\n      fromTab: String(tab || ""),\n      fromParams: routeParams,\n      toTab: String(next || ""),\n      toParams: params,\n      navigate: () => commitGo(next, params),\n    });\n    if (intercepted) return;\n    commitGo(next, params);\n  }\n\n  function commitGo(next: Tab, params?: any) {',
      "central navigation"
    );
  }

  const pushNames = ["pushHistory", "pushPetanqueHistory", "pushBabyFootHistory", "pushPingPongHistory", "pushMolkkyHistory", "pushDiceHistory"];
  for (const name of pushNames) {
    const marker = `// MONETIZATION_COMPLETE:${name}`;
    if (text.includes(marker)) continue;
    const start = text.indexOf(`function ${name}(`);
    if (start < 0) {
      console.warn(`! ${name} non trouvé (ignoré)`);
      continue;
    }
    const idPos = text.indexOf("const id =", start);
    if (idPos < 0 || idPos - start > 1400) fail(`Impossible de localiser l'id dans ${name}`);
    const lineEnd = text.indexOf("\n", idPos);
    if (lineEnd < 0) fail(`Fin de ligne id introuvable dans ${name}`);
    const indent = text.slice(text.lastIndexOf("\n", idPos) + 1, idPos).match(/^\s*/)?.[0] || "    ";
    const modeExpr = name === "pushHistory" ? 'String((m as any)?.kind || (m as any)?.payload?.kind || "game")' : `"${name.replace(/^push|History$/g, "").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}"`;
    text = text.slice(0, lineEnd + 1) + `${indent}${marker}\n${indent}try { markCompletedMatchForAds(String(id), ${modeExpr}); } catch {}\n` + text.slice(lineEnd + 1);
  }

  text = replaceOnce(
    text,
    '  const showSportQuickSwitch = SPORT_QUICK_SWITCH_ALLOWED_TABS.has(tab);',
    '  const showSportQuickSwitch = SPORT_QUICK_SWITCH_ALLOWED_TABS.has(tab);\n  const adBannerPlacement = resolveBannerPlacementForRoute(String(tab || ""), routeParams);',
    "banner route mapping"
  );

  text = replaceOnce(
    text,
    '<div className="container" style={{ paddingBottom: 88 }}>',
    '<div className="container" style={{ paddingBottom: adBannerPlacement ? 154 : 88 }}>',
    "app content bottom padding"
  );

  text = replaceOnce(
    text,
    '        {/* ✅ BottomNav masquée sur gameSelect + tous les gameplays plein écran */}',
    '        {adBannerPlacement && <AdSlot placement={adBannerPlacement} />}\n\n        {/* ✅ BottomNav masquée sur gameSelect + tous les gameplays plein écran */}',
    "global banner slot"
  );

  fs.writeFileSync(file, text);
  console.log("~ src/App.tsx");
}

function patchSettings() {
  const file = path.join(srcRoot, "pages", "Settings.tsx");
  let text = fs.readFileSync(file, "utf8");

  text = replaceOnce(
    text,
    'import { useSport } from "../contexts/SportContext";',
    'import { useSport } from "../contexts/SportContext";\n// MONETIZATION_V1\nimport MonetizationSettingsPanel from "../monetization/MonetizationSettingsPanel";',
    "Settings import"
  );

  text = replaceOnce(
    text,
    'type SettingsTab = "menu" | "account" | "theme" | "lang" | "general" | "sport" | "castViewer" | "developer";',
    'type SettingsTab = "menu" | "account" | "monetization" | "theme" | "lang" | "general" | "sport" | "castViewer" | "developer";',
    "SettingsTab"
  );

  text = replaceOnce(
    text,
    '      : tab === "theme"\n      ? t("settings.menu.theme", "Thème")',
    '      : tab === "monetization"\n      ? "Publicité & Boutique"\n      : tab === "theme"\n      ? t("settings.menu.theme", "Thème")',
    "Settings title"
  );

  text = replaceOnce(
    text,
    '      : tab === "theme"\n      ? t("settings.theme.subtitle", "Choisis un thème néon (accents) pour l’interface.")',
    '      : tab === "monetization"\n      ? "Bannières, vidéo de fin de partie, Premium et packs additionnels."\n      : tab === "theme"\n      ? t("settings.theme.subtitle", "Choisis un thème néon (accents) pour l’interface.")',
    "Settings subtitle"
  );

  text = replaceOnce(
    text,
    '            <SettingsMenuCard\n              title={t("settings.menu.theme", "Thème")}',
    '            <SettingsMenuCard\n              title="Publicité & Boutique"\n              subtitle="Bannières, vidéo fin de partie, Premium sans pub et packs avatars/logos/sets/thèmes/bots IA."\n              theme={theme}\n              rightHint="FREE / PREMIUM"\n              onClick={() => setTab("monetization")}\n            />\n            <SettingsMenuCard\n              title={t("settings.menu.theme", "Thème")}',
    "Settings monetization card"
  );

  text = replaceOnce(
    text,
    '        {tab === "account" && <AccountPages go={go} onBackToSettingsMenu={() => setTab("menu")} onFullReset={handleFullReset} />}\n\n        {tab === "theme" && <ThemeSection />}',
    '        {tab === "account" && <AccountPages go={go} onBackToSettingsMenu={() => setTab("menu")} onFullReset={handleFullReset} />}\n        {tab === "monetization" && <MonetizationSettingsPanel />}\n\n        {tab === "theme" && <ThemeSection />}',
    "Settings monetization panel"
  );

  fs.writeFileSync(file, text);
  console.log("~ src/pages/Settings.tsx");
}

for (const relative of [
  "src/monetization/types.ts",
  "src/monetization/prefs.ts",
  "src/monetization/catalog.ts",
  "src/monetization/provider.ts",
  "src/monetization/MonetizationManager.ts",
  "src/monetization/AdSlot.tsx",
  "src/monetization/MonetizationSettingsPanel.tsx",
]) copyFile(relative);

patchApp();
patchSettings();

console.log("\n✅ Monetization V1 appliquée.");
console.log("   - Bannières : Home / Games / Stats / History / Settings");
console.log("   - Aucun emplacement pendant Play / keypad");
console.log("   - Interstitiel fin de partie : avant / après / off, fréquence configurable");
console.log("   - Packs additionnels : Product IDs Google Play préparés");
console.log("   - Premium : entitlement vérifié, aucun localStorage de contournement");
console.log("\nLance ensuite : npm run typecheck && npm run build\n");

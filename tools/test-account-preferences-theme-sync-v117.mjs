import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const checks = [];
function check(label, ok) {
  if (!ok) throw new Error(`❌ ${label}`);
  checks.push(label);
  console.log(`✅ ${label}`);
}

const auth = read("src/hooks/useAuthOnline.tsx");
const theme = read("src/contexts/ThemeContext.tsx");
const lang = read("src/contexts/LangContext.tsx");
const settings = read("src/pages/Settings.tsx");
const profiles = read("src/pages/Profiles.tsx");
const api = read("src/lib/onlineApi.ts");
const bridge = read("src/lib/accountBridge.ts");

check(
  "Settings writes selected theme to Supabase preferences and private_info",
  settings.includes('preferences: { appTheme: nextTheme }') &&
  settings.includes('privateInfo: { appTheme: nextTheme }'),
);

check(
  "MON PROFIL persists appTheme with the other player preferences",
  profiles.includes('appTheme: patch.appTheme') &&
  profiles.includes('["appLang","appTheme","favX01","favDoubleOut","ttsVoice","sfxVolume"]'),
);

check(
  "onlineApi merges JSONB preferences instead of replacing them destructively",
  api.includes('mergeDefinedRecord(existingPreferences, patch.preferences as any)') &&
  api.includes('.select("preferences,private_info")'),
);

check(
  "account bridge imports remote appTheme into the canonical local profile",
  bridge.includes('appTheme: prefs?.appTheme ?? pi?.appTheme') &&
  bridge.includes('...(((onlineProfile as any)?.preferences || {}) as Record<string, any>)'),
);

check(
  "Auth profile refresh publishes account preferences after Realtime/focus/polling hydration",
  auth.includes('dc:account-preferences-cloud-updated') &&
  auth.includes('publishCloudAccountPreferences(profile, userId, "useAuthOnline.account-profile")'),
);

check(
  "ThemeProvider applies remote preferred theme and persists its theme id",
  theme.includes('dc:account-preferences-cloud-updated') &&
  theme.includes('detail?.preferences?.appTheme') &&
  theme.includes('window.localStorage.setItem(THEME_STORAGE_KEY, raw)') &&
  theme.includes('if (canUseTheme(raw)) setThemeIdState(raw)'),
);

check(
  "premium theme preference survives entitlement hydration",
  theme.includes('subscribeVerifiedEntitlements') &&
  theme.includes('window.localStorage.getItem(THEME_STORAGE_KEY)'),
);

check(
  "language preference uses the same cross-device cloud event contract",
  lang.includes('dc:account-preferences-cloud-updated') &&
  lang.includes('detail?.preferences?.appLang') &&
  lang.includes('setLang(raw)'),
);

console.log(`\n✅ Account preferences/theme cross-device sync V117: ${checks.length}/${checks.length}`);

import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`KEEP_AWAKE_TEST_FAILED: ${message}`);
  console.log(`✅ ${message}`);
};

const runtime = read("src/lib/keepAwake.ts");
const main = read("src/main.tsx");
const settings = read("src/pages/Settings.tsx");
const activity = read("android/app/src/main/java/com/multisportsscoring/app/MainActivity.java");
const plugin = read("android/app/src/main/java/com/multisportsscoring/app/KeepAwakePlugin.java");

must(runtime.includes('const STORAGE_KEY = "dc_keep_screen_awake_v1"'), "préférence locale dédiée");
must(runtime.includes("if (raw == null) return true"), "écran actif par défaut");
must(runtime.includes('wakeLockApi.request("screen")'), "fallback Screen Wake Lock PWA/web");
must(runtime.includes('registerPlugin<NativeKeepAwakePlugin>("KeepAwake")'), "bridge Capacitor KeepAwake");
must(main.includes("initKeepAwakeRuntime();"), "activation au démarrage de l'application");
must(activity.includes("registerPlugin(KeepAwakePlugin.class)"), "plugin Android enregistré");
must(activity.includes("KeepAwakePlugin.applyToActivity(this"), "préférence appliquée à l'Activity Android");
must(plugin.includes("FLAG_KEEP_SCREEN_ON"), "FLAG_KEEP_SCREEN_ON Android utilisé");
must(plugin.includes("getBoolean(PREF_KEEP_AWAKE, true)"), "préférence Android activée par défaut");
must(settings.includes('tab === "display"'), "page Écran & veille intégrée aux réglages");
must(settings.includes("setKeepScreenAwakePreference"), "toggle utilisateur branché");

console.log("\nKEEP AWAKE V1: OK");

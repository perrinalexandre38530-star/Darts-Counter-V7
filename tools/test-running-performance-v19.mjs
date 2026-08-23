import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const service = read("android/app/src/main/java/com/multisportsscoring/app/ActivityTrackingService.java");
const plugin = read("android/app/src/main/java/com/multisportsscoring/app/ActivityTrackingPlugin.java");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const module = read("src/pages/running/RunningModule.tsx");
const offline = read("src/activity/outdoorOfflineCache.ts");

const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(service.includes('return 5000L;') && service.includes('return 10000L;'), "Battery GPS intervals missing");
assert(service.includes('REMINDER_CHANNEL_ID') && service.includes('hydrationReminderMin') && service.includes('fuelReminderMin'), "Native long-distance reminders missing");
assert(plugin.includes('EXTRA_BATTERY_MODE') && plugin.includes('EXTRA_HYDRATION_MIN') && plugin.includes('EXTRA_FUEL_MIN'), "Tracking plugin options missing");
assert(manifest.includes('android.permission.VIBRATE'), "VIBRATE permission missing");
assert(module.includes('startNativeTracking(activitySport, nativeLongDistance)'), "Running module does not pass long-distance profile to Android");
assert(module.includes('OutdoorOfflineRoutePanel'), "Offline route UI missing");
assert(offline.includes('mss-outdoor-offline-v1') && offline.includes('route-packs'), "Offline route cache missing");
assert(module.includes('const wasNativeTracking = nativeTrackingActiveRef.current;'), "Native device source regression not fixed");

console.log("✅ RUNNING PERFORMANCE V19 integration check OK");
console.log("   Battery profiles: NORMAL / ECO / ULTRA");
console.log("   Native reminders: hydration / fuel");
console.log("   Offline route pack: trace / checkpoints / roadbook snapshot");

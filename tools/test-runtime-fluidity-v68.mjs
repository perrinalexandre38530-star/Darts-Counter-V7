import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runtime = read("src/lib/runtimePerformance.ts");
const diagnostics = read("src/lib/diagnosticPro.ts");
const main = read("src/main.tsx");
const crashGuard = read("src/lib/crashGuard.ts");
const memoryWatchdog = read("src/utils/memoryWatchdog.ts");
const typography = read("src/lib/playerNameTypography.ts");
const bridge = read("src/components/GlobalMessengerCallBridge.tsx");
const app = read("src/App.tsx");
const battle = read("src/pages/BattleRoyalePlay.tsx");
const petanque = read("src/pages/petanque/PetanquePlay.tsx");
const pingpong = read("src/pages/pingpong/PingPongPlay.tsx");
const babyPlay = read("src/pages/babyfoot/BabyFootPlay.tsx");
const meneWizard = read("src/components/PetanqueMeneWizard.tsx");
const clock = read("src/pages/TrainingClock.tsx");
const messages = read("src/pages/MessagesPage.tsx");
const babyStore = read("src/lib/babyfootStore.ts");
const babyHome = read("src/pages/babyfoot/BabyFootHome.tsx");

// Shared runtime priority contract.
assert(runtime.includes("export function isGameplayRuntime"), "Global gameplay detector missing");
assert(runtime.includes("export function scheduleRuntimeIdle"), "Shared idle scheduler missing");
assert(app.includes("__mscActiveTab"), "Navigation does not publish the active route early");
assert(app.indexOf("setTab(next);") < app.indexOf('profilesDiagLog("nav-go"'), "Navigation diagnostics still precede the visible route update");

// Diagnostics: production mode must not monkey-patch every core browser primitive.
assert(diagnostics.includes("function deepProbeEnabled()"), "Deep diagnostic opt-in missing");
assert(diagnostics.includes('sessionStorage.setItem("dc_diag_deep_probe_v1", "1")'), "Explicit deep diagnostic activation missing");
const installOnceStart = diagnostics.indexOf("function installOnce()");
const installOnceEnd = diagnostics.indexOf("installOnce();", installOnceStart);
const installOnce = diagnostics.slice(installOnceStart, installOnceEnd);
assert(installOnce.includes("if (deepProbeEnabled())"), "Deep browser probes are not guarded");
assert(diagnostics.includes("function installLongTaskProbe()"), "Long-task probe was not made opt-in");
assert(diagnostics.includes("if (!deepProbeEnabled()) return;"), "Hot render diagnostic path still persists every App render");
assert(diagnostics.includes('window.setInterval(() => sampleMemory("interval", false), 60_000)'), "Routine diagnostic sampler is still too frequent");

// Memory/store maintenance must stay away from active scoring.
assert(main.includes("if (!force && isGameplayRuntime() && !critical) return;"), "Main memory sampler still runs during gameplay");
assert(!main.includes("window.setInterval(update, 2000)"), "Legacy 2s memory sampler remains");
assert(crashGuard.includes("if (isGameplayRuntime() && !critical) return;"), "CrashGuard still loads/scans the store during gameplay");
assert(crashGuard.includes("60_000"), "CrashGuard maintenance interval not relaxed");
assert(memoryWatchdog.includes("isRuntimeHidden()"), "Memory watchdog still works in hidden pages");
assert(memoryWatchdog.includes("5000"), "Memory watchdog still runs at the old 2s cadence");

// Global name typography must not scan IDB/localStorage/full DOM every 10 seconds
// or observe every score text mutation.
assert(!typography.includes("characterData: true"), "Typography observer still watches every text mutation");
assert(typography.includes("childList: true"), "Typography observer no longer sees new UI nodes");
assert(typography.includes("60_000"), "Typography safety refresh is still too frequent");
assert(typography.includes("scheduleRuntimeIdle"), "Typography refresh is not moved to idle time");

// Messenger: SSE is primary; HTTP polling is fallback only.
assert(bridge.includes("streamHealthyRef"), "Messenger bridge lacks SSE health state");
assert(bridge.includes("if (streamHealthyRef.current)"), "HTTP call polling still runs in parallel with healthy SSE");

// Battle Royale must never scan the entire DOM every 400ms during play.
assert(!battle.includes("setInterval(hideTabs, 400)"), "Battle Royale still scans the full DOM every 400ms");
assert(battle.includes("new MutationObserver"), "Battle Royale one-shot DOM observer missing");
assert(battle.includes("window.setTimeout(stopWatching, 4000)"), "Battle Royale observer lacks bounded lifetime");

// Seconds-only clocks must render at 1Hz, not force large gameplay trees at 4Hz/2Hz.
for (const [name, src] of [
  ["Pétanque", petanque],
  ["Ping-pong", pingpong],
  ["Baby-foot", babyPlay],
  ["Wizard Pétanque", meneWizard],
]) {
  assert(!src.includes(", 250);"), `${name}: legacy 250ms gameplay timer remains`);
  assert(src.includes(", 1000);"), `${name}: 1Hz timer missing`);
}
assert(!clock.includes("}, 500);"), "Training Clock still renders twice per second for an mm:ss display");
assert(clock.includes("}, 1000);"), "Training Clock 1Hz timer missing");
assert(!messages.includes("}, 300);"), "Voice recording seconds still rerender at 300ms");

// Baby-foot Home: same-tab state is event-driven rather than parsed from storage every 600ms.
assert(babyStore.includes('dc-babyfoot-state-updated'), "Baby-foot state change event missing");
assert(babyHome.includes('dc-babyfoot-state-updated'), "Baby-foot Home does not listen to state changes");
assert(!babyHome.includes("setInterval(() => setSt(loadBabyFootState()), 600)"), "Baby-foot Home 600ms storage polling remains");
assert(babyHome.includes("10_000"), "Baby-foot legacy-write fallback missing");

console.log("✅ RUNTIME FLUIDITY V68 CONTRACT OK");

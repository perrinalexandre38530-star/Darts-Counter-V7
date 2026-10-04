import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const history = fs.readFileSync(path.join(root, "src/lib/history.ts"), "utf8");
const home = fs.readFileSync(path.join(root, "src/pages/Home.tsx"), "utf8");
const checks = [
  ["Android decoded cache disabled", history.includes("if (!shouldCacheDecodedHistoryGet())") && history.includes("__historyGetRecent.clear()")],
  ["worker heap released after decode", history.includes("worker.terminate()") && history.includes("history-payload-worker-handoff")],
  ["Home Android skips full History.get hydration", home.includes("if (isAndroid) return x01Rows")],
  ["Home light aggregation comment present", home.includes("HOME MUST STAY LIGHT ON ANDROID")],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? "✅" : "❌"} ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log("\nV8 history memory guard contract OK");

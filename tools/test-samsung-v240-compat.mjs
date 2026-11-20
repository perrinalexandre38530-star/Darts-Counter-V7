import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync("tv-samsung/index.html", "utf8");
const tv = readFileSync("src/tv/samsung/SamsungTvApp.tsx", "utf8");
assert.ok(html.includes("globalThis.structuredClone ="), "Tizen clone compatibility missing");
assert.ok(html.indexOf("globalThis.structuredClone =") < html.indexOf('type="module"'), "Compatibility must precede the bundle");
assert.ok(tv.includes("if (nav.tab) {"), "Remote navigation should open the shared application");
assert.ok(tv.includes('tab: phoneNavigationRef.current?.tab || "gameSelect"'), "Initial route should follow the phone");
console.log("Samsung TV V240 compatibility & shared navigation: OK");

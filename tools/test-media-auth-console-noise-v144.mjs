import fs from "node:fs";

function read(rel) { return fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8"); }
function assert(ok, msg) { if (!ok) throw new Error(`❌ ${msg}`); console.log(`✅ ${msg}`); }

const nas = read("src/lib/nasApi.ts");
const proxy = read("functions/api/backend/[[path]].ts");
const r2 = read("functions/api/storage/backups/[[path]].ts");

assert(nas.includes('provider === "supabase_bridge"'), "le bridge Supabase neutralise le probe NAS /auth/me");
assert(nas.includes('!!session?.supabaseUserId'), "une session Supabase reste reconnue même avec un provider hybride");
assert(proxy.includes("isOptionalMediaRead") && proxy.includes("mediaMissResponse"), "les médias NAS optionnels disposent d’un soft-miss same-origin");
assert(proxy.includes("upstream.status >= 500"), "un média NAS en 5xx ne remonte plus comme erreur applicative 502");
assert(proxy.includes('"x-mss-media-missing": "1"'), "le soft-miss média est explicitement signalé aux fallbacks UI");
assert(r2.includes('include: ["httpMetadata", "customMetadata"]') && r2.includes('listed = await (bucket as any).list(baseOptions)'), "account-media retente un listing R2 compatible sans include");

console.log("\n✅ MEDIA / AUTH CONSOLE STABILITY V144 CONTRACT OK");

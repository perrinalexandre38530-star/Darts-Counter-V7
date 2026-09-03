import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const catalog = read("src/lib/contentPackCatalog.generated.ts");
const themes = read("src/theme/themePresets.ts");
const themeBuilder = read("tools/prepare-theme-content-pack.mjs");

const required = [...new Set(
  [...themes.matchAll(/\/theme-textures\/([^)'"\s,]+)/g)].map((match) => match[1])
)].sort();

if (required.length < 110) {
  throw new Error(`THEME CATALOG GUARD: themePresets ne référence que ${required.length} texture(s), minimum attendu 110.`);
}

const expectedVersion = themeBuilder.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/i)?.[1];
if (!expectedVersion) {
  throw new Error("THEME CATALOG GUARD: impossible de lire VERSION dans prepare-theme-content-pack.mjs.");
}

const start = catalog.indexOf('"theme-textures":');
const end = catalog.indexOf('"character-portraits":', start);
if (start < 0 || end < 0) {
  throw new Error("THEME CATALOG GUARD: bloc theme-textures introuvable dans contentPackCatalog.generated.ts.");
}

const block = catalog.slice(start, end);
const catalogVersion = block.match(/"version"\s*:\s*"([^"]+)"/)?.[1] || "";
const catalogFiles = new Set(
  [...block.matchAll(/"path"\s*:\s*"([^"]+)"/g)].map((match) => match[1])
);
const missing = required.filter((path) => !catalogFiles.has(path));

if (catalogVersion !== expectedVersion) {
  throw new Error(
    `THEME CATALOG GUARD: régression détectée. Catalogue=${catalogVersion || "?"}, pack R2 attendu=${expectedVersion}.`
  );
}
if (catalogFiles.size < 110 || missing.length) {
  throw new Error(
    `THEME CATALOG GUARD: régression détectée. Catalogue=${catalogFiles.size}/110, manquantes=${missing.length}` +
    (missing.length ? `\n${missing.join("\n")}` : "")
  );
}

console.log(`✅ THEME CATALOG GUARD OK — ${catalogFiles.size}/110 — version ${catalogVersion}`);

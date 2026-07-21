import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const mapSource = fs.readFileSync(path.join(root, "src/territories/map.ts"), "utf8");
const importPattern = /import\s+\w+\s+from\s+"([^"]+\.svg)\?raw";/g;
const importedAssets = [];
let match;
while ((match = importPattern.exec(mapSource))) {
  const relativeImport = match[1];
  if (!relativeImport) continue;
  importedAssets.push(path.resolve(root, "src/territories", relativeImport));
}

const uniqueAssets = [...new Set(importedAssets)].sort();
const rows = [];
let hasError = false;

for (const filePath of uniqueAssets) {
  const relative = path.relative(root, filePath).replaceAll(path.sep, "/");
  if (!fs.existsSync(filePath)) {
    rows.push({ file: relative, paths: 0, ids: 0, dimensions: "ABSENT", duplicateIds: 0, internalFill: false });
    hasError = true;
    continue;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const paths = [...raw.matchAll(/<path\b([^>]*)>/gi)];
  const ids = paths.map((item) => /\bid=["']([^"']+)["']/i.exec(item[1] || "")?.[1]).filter(Boolean);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }

  const viewBox = /\bviewBox=["']([^"']+)["']/i.exec(raw)?.[1];
  const width = /<svg\b[^>]*\bwidth=["']([^"']+)["']/i.exec(raw)?.[1];
  const height = /<svg\b[^>]*\bheight=["']([^"']+)["']/i.exec(raw)?.[1];
  const dimensions = viewBox ? `viewBox ${viewBox}` : width && height ? `${width} × ${height}` : "runtime getBBox requis";
  const internalFill = /(?:\.land|path|polygon)[^{]*\{[^}]*\bfill\s*:/is.test(raw);

  rows.push({
    file: relative,
    paths: paths.length,
    ids: ids.length,
    dimensions,
    duplicateIds: duplicates.size,
    internalFill,
  });

  if (paths.length === 0 || duplicates.size > 0) hasError = true;
}

console.table(rows);
const runtimeFitted = rows.filter((row) => row.dimensions === "runtime getBBox requis").length;
const conflictingFill = rows.filter((row) => row.internalFill).length;
console.log(`\n${rows.length} cartes auditées.`);
console.log(`${runtimeFitted} carte(s) sans dimensions SVG fiables : cadrage runtime getBBox obligatoire.`);
console.log(`${conflictingFill} carte(s) avec styles fill internes : couleurs inline !important obligatoires.`);

if (hasError) {
  console.error("\nÉCHEC : asset absent, SVG sans path ou identifiants dupliqués.");
  process.exit(1);
}
console.log("\nOK : assets présents, paths détectées et identifiants non dupliqués.");

import { spawnSync } from "node:child_process";
import { loadCatalog } from "./fit-awena-catalog-source.mjs";
import fs from "node:fs/promises";

const refresh = !process.argv.includes("--no-refresh");
console.log(`AWENA SYNC: catalogue ${refresh ? "refresh" : "cache"}...`);
const catalog = await loadCatalog({ refresh, allowCache: true });
console.log(JSON.stringify({ catalogCount: catalog.exercises?.length || 0, sources: catalog.sources || {}, sourceErrors: catalog.errors || [] }, null, 2));

const steps = [
  ["registry", ["./tools/build-fit-awena-registry.mjs", "--migrate-legacy"]],
  ["audit", ["./tools/audit-fit-awena-media.mjs"]],
  ["motion queue", ["./tools/build-fit-awena-jobs.mjs"]],
  ["step queue", ["./tools/build-fit-awena-step-jobs.mjs"]],
];

for (const [label, args] of steps) {
  console.log(`\n=== ${label.toUpperCase()} ===`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`AWENA SYNC arrêté: ${label} a échoué (code ${result.status}).`);
    process.exit(result.status || 2);
  }
}
const registry=JSON.parse(await fs.readFile("public/fit/awena-library/registry.json","utf8"));
const audit=JSON.parse(await fs.readFile("var/fit-awena/awena-media-audit.json","utf8"));
const motionQueue=JSON.parse(await fs.readFile("var/fit-awena/comfyui-queue.json","utf8"));
const stepQueue=JSON.parse(await fs.readFile("var/fit-awena/step-queue.json","utf8"));
const counts=[registry.catalogCount,audit.summary?.catalogCount,motionQueue.catalogCount].map(Number);
const snapshots=[registry.catalogSnapshotGeneratedAt,audit.summary?.catalogSnapshotGeneratedAt,motionQueue.catalogSnapshotGeneratedAt,stepQueue.catalogSnapshotGeneratedAt].filter(Boolean);
if(new Set(counts).size!==1)throw new Error(`AWENA SYNC incohérent: catalogCount registry/audit/queue = ${counts.join(" / ")}`);
if(snapshots.length&&new Set(snapshots).size!==1)throw new Error(`AWENA SYNC incohérent: snapshots catalogue différents = ${[...new Set(snapshots)].join(" / ")}`);
console.log(`\nAWENA SYNC OK — ${counts[0]} exercices, snapshot ${snapshots[0]||catalog.generatedAt||"cache"}.`);

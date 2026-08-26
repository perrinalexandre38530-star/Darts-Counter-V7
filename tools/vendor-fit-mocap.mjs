#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const assets = [
  {
    id: "CMU 22_14 · alternating squats",
    url: "https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/022/22_14.bvh",
    target: "public/fit/mocap/cmu/22_14.bvh",
  },
];

function isBvh(text) {
  return text.trimStart().startsWith("HIERARCHY") && text.includes("\nMOTION") && /Frames:\s*\d+/i.test(text);
}

for (const asset of assets) {
  console.log(`↓ ${asset.id}`);
  const response = await fetch(asset.url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${asset.id}: HTTP ${response.status}`);
  const text = await response.text();
  if (!isBvh(text)) throw new Error(`${asset.id}: invalid BVH payload`);
  await fs.mkdir(path.dirname(asset.target), { recursive: true });
  await fs.writeFile(asset.target, text, "utf8");
  const kb = Math.round(Buffer.byteLength(text) / 1024);
  console.log(`  ✓ ${asset.target} (${kb} KB)`);
}

console.log("✅ FIT PERF mocap assets vendored locally");

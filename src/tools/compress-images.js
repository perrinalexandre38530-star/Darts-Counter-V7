import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { globSync } from "glob";

const SRC_DIR = path.resolve("src/assets");
const OUT_DIR = path.resolve("src/assets-webp");

// Fichiers images
const files = globSync("**/*.{png,jpg,jpeg}", {
  cwd: SRC_DIR,
  nodir: true,
  nocase: true,
});

if (!files.length) {
  console.log("No images found in:", SRC_DIR);
  process.exit(0);
}

for (const rel of files) {
  const input = path.join(SRC_DIR, rel);
  const output = path.join(OUT_DIR, rel).replace(/\.(png|jpg|jpeg)$/i, ".webp");

  fs.mkdirSync(path.dirname(output), { recursive: true });

  // Heuristique: tickers => resize à 800px max (évite des PNG 4K inutiles)
  const isTicker = /tickers|ticker/i.test(rel);

  let img = sharp(input);
  const meta = await img.metadata();

  if (isTicker && meta.width && meta.width > 800) {
    img = img.resize({ width: 800 });
  }

  await img.webp({ quality: 75 }).toFile(output);

  const inSize = fs.statSync(input).size;
  const outSize = fs.statSync(output).size;
  const ratio = ((outSize / inSize) * 100).toFixed(1);

  console.log(`✔ ${rel}  ${Math.round(inSize / 1024)}KB -> ${Math.round(outSize / 1024)}KB  (${ratio}%)`);
}

console.log("\nDONE ✅ WebP generated in:", OUT_DIR);
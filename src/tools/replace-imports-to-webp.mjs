import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

const ROOT = process.cwd();
const targets = globSync("src/**/*.{ts,tsx,js,jsx}", {
  cwd: ROOT,
  nodir: true,
  ignore: ["src/assets-webp/**"],
});

let changedFiles = 0;
let changedImports = 0;

for (const rel of targets) {
  const file = path.join(ROOT, rel);
  let txt = fs.readFileSync(file, "utf8");
  const before = txt;

  // Remplace imports d’assets png/jpg depuis src/assets vers src/assets-webp en webp
  // Ex: ../../assets/tickers/x.png  -> ../../assets-webp/tickers/x.webp
  txt = txt.replace(
    /((?:from\s+|import\s+)(?:["']))([^"']*\/assets\/[^"']+\.(?:png|jpg|jpeg))(["'])/gi,
    (m, p1, p2, p3) => {
      changedImports++;
      return `${p1}${p2.replace("/assets/", "/assets-webp/").replace(/\.(png|jpg|jpeg)$/i, ".webp")}${p3}`;
    }
  );

  // Cas : import xxx from "../../assets/xxx.png";
  txt = txt.replace(
    /(import\s+[^;]+?\s+from\s+["'])([^"']*\/assets\/[^"']+\.(?:png|jpg|jpeg))(["'];?)/gi,
    (m, p1, p2, p3) => {
      changedImports++;
      return `${p1}${p2.replace("/assets/", "/assets-webp/").replace(/\.(png|jpg|jpeg)$/i, ".webp")}${p3}`;
    }
  );

  if (txt !== before) {
    fs.writeFileSync(file, txt, "utf8");
    changedFiles++;
  }
}

console.log(`DONE ✅ files changed: ${changedFiles}, imports changed: ${changedImports}`);
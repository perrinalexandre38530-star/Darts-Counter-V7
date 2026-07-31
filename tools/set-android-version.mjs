import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const [codeArg, nameArg] = process.argv.slice(2);
const code = Number(codeArg);
if (!Number.isInteger(code) || code < 1 || !nameArg) {
  console.error('Usage: npm run android:version -- <versionCode> <versionName>');
  console.error('Exemple: npm run android:version -- 2 1.0.0-rc2');
  process.exit(1);
}
const file = path.join(process.cwd(), "android", "app", "build.gradle");
let text = fs.readFileSync(file, "utf8");
if (!/versionCode\s+\d+/.test(text) || !/versionName\s+["'][^"']+["']/.test(text)) {
  console.error("❌ versionCode/versionName introuvables dans android/app/build.gradle");
  process.exit(1);
}
text = text.replace(/versionCode\s+\d+/, `versionCode ${code}`);
text = text.replace(/versionName\s+["'][^"']+["']/, `versionName "${nameArg}"`);
fs.writeFileSync(file, text);
console.log(`✅ Android versionCode=${code} versionName=${nameArg}`);

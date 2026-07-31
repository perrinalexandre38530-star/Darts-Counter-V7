import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const aab = path.join(process.cwd(), "android", "app", "build", "outputs", "bundle", "release", "app-release.aab");
if (!fs.existsSync(aab)) {
  console.error(`❌ AAB introuvable: ${aab}`);
  process.exit(1);
}
const stat = fs.statSync(aab);
if (stat.size < 100_000) {
  console.error(`❌ AAB anormalement petit (${stat.size} octets).`);
  process.exit(1);
}

const jarCmd = process.platform === "win32" ? "jar.exe" : "jar";
const list = spawnSync(jarCmd, ["tf", aab], { encoding: "utf8", shell: false });
if (list.error || list.status !== 0) {
  console.error(`❌ Impossible d'inspecter l'AAB avec jar: ${list.error?.message || list.stderr || list.status}`);
  process.exit(1);
}
const entries = String(list.stdout || "");
const hasSignatureFile = /META-INF\/[^/]+\.SF$/mi.test(entries);
const hasSignatureBlock = /META-INF\/[^/]+\.(RSA|DSA|EC)$/mi.test(entries);
if (!hasSignatureFile || !hasSignatureBlock) {
  console.error("❌ L'AAB existe mais n'est pas signé avec la clé d'upload.");
  process.exit(1);
}

const signer = process.platform === "win32" ? "jarsigner.exe" : "jarsigner";
const result = spawnSync(signer, ["-verify", "-certs", aab], { stdio: "inherit", shell: false });
if (result.error) {
  console.error(`❌ jarsigner indisponible: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`✅ AAB signé et vérifié: ${aab}`);
console.log(`✅ Taille: ${(stat.size / 1024 / 1024).toFixed(2)} Mio`);

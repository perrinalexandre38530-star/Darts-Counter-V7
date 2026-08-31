import fs from "node:fs";

const path = "src/lib/socialAuth.ts";
if (!fs.existsSync(path)) {
  console.error(`[PATCH] Fichier introuvable: ${path}`);
  process.exit(1);
}

let s = fs.readFileSync(path, "utf8");

const oldBlock = `  // Snapchat existe côté Supabase Auth/GoTrue mais n'est pas encore exposé dans
  // toutes les versions des types supabase-js : on le passe donc comme provider runtime.
  snapchat: { label: "Snapchat", oauthProvider: "snapchat", settingsKeys: ["snapchat"] },`;

const newBlock = `  // Snapchat Login Kit est configuré comme Custom OAuth2 dans Supabase.
  // custom:true empêche /auth/v1/settings de masquer le bouton.
  snapchat: { label: "Snapchat", oauthProvider: "custom:snapchat", custom: true },`;

if (s.includes(newBlock)) {
  console.log("[PATCH] Snapchat est déjà corrigé.");
  process.exit(0);
}

if (!s.includes(oldBlock)) {
  console.error("[PATCH] Bloc Snapchat attendu introuvable. Aucun fichier modifié.");
  process.exit(2);
}

s = s.replace(oldBlock, newBlock);
fs.writeFileSync(path, s, "utf8");
console.log("[PATCH] OK: Snapchat utilise maintenant custom:snapchat et reste visible.");

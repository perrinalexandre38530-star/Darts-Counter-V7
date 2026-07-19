#!/usr/bin/env node
/**
 * tools/test-auth-spine.mjs
 * ============================================================
 * "Test interne" (sans navigateur) pour valider les invariants
 * du COMPTE UTILISATEUR UNIQUE.
 *
 * Objectif: éviter de perdre du temps à tester à la main après
 * chaque patch.
 *
 * Ce script fait des vérifications statiques (codebase) :
 * - aucune logique n'impose activeProfileId = online:<uid>
 * - accountBridge ne crée plus de profil mirror online:<uid>
 * - les écritures vers supabase profiles incluent user_id
 *
 * Usage:
 *   pnpm test:auth
 *   pnpm test:ci
 * ============================================================
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function fail(msg) {
  console.error("\n❌ AUTH SPINE TEST FAILED\n" + msg + "\n");
  process.exit(1);
}

function ok(msg) {
  console.log("✅ " + msg);
}

const files = walk(path.join(ROOT, "src"));

const offenders = [];

for (const f of files) {
  const s = read(f);

  // Interdit: forcer activeProfileId à online:<uid>
  if (/activeProfileId\s*:\s*`online:\$\{user\.id\}`/.test(s) || /activeProfileId\s*:\s*mirrorId/.test(s)) {
    offenders.push({ f, reason: "forces activeProfileId to online:<uid>" });
  }

  // Interdit: création d'un objet profile avec id "online:" + uid
  if (/id\s*:\s*`online:\$\{user\.id\}`/.test(s)) {
    offenders.push({ f, reason: "creates mirror profile online:<uid>" });
  }
}

// Vérifier accountBridge
const acc = path.join(ROOT, "src/lib/accountBridge.ts");
if (fs.existsSync(acc)) {
  const s = read(acc);
  if (/Force store\.activeProfileId sur ce mirror/.test(s)) {
    fail(`accountBridge.ts still contains legacy mirror behavior comments (should be removed).`);
  }
  ok("accountBridge mirror behavior removed");
}

// Vérifier onlineApi: upsert profiles inclut user_id
const api = path.join(ROOT, "src/lib/onlineApi.ts");
if (fs.existsSync(api)) {
  const s = read(api);
  if (!/user_id\s*:\s*userId/.test(s) && !/user_id\s*:\s*session\.user\.id/.test(s)) {
    fail("onlineApi.ts does not set user_id when upserting/creating profiles (Supabase schema requires NOT NULL).");
  }
  ok("onlineApi sets user_id when creating profiles");
}

if (offenders.length) {
  const lines = offenders.slice(0, 12).map(o => `- ${o.f.replace(ROOT + path.sep, "")}: ${o.reason}`).join("\n");
  fail(`Found forbidden mirror-account patterns:\n${lines}\n\nFix them before continuing.`);
}

ok("No forbidden mirror-account patterns detected");
console.log("\n✅ AUTH SPINE OK\n");

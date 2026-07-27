#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

function readDotEnv(rel = ".env") {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const fileEnv = readDotEnv();
const url = process.env.SUPABASE_TEST_URL || process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_TEST_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || "";
// Volontairement PAS lu depuis .env : une service-role ne doit pas être embarquée dans le frontend.
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || "";

if (!url || !anonKey || !serviceRoleKey) {
  console.error("\n❌ LIVE SUPABASE TESTS NOT CONFIGURED");
  console.error("Variables requises: SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SERVICE_ROLE_KEY.");
  console.error("URL/anon peuvent aussi provenir de VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.\n");
  process.exit(2);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const runId = `${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
const password = `Mss!${crypto.randomBytes(14).toString("base64url")}9a`;
const emailA = `mss-e2e-${runId}-a@example.com`;
const emailB = `mss-e2e-${runId}-b@example.com`;
const lobbyCode = `T${runId.slice(-7).toUpperCase()}`;
let userA = null;
let userB = null;

function client() {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function ok(label) {
  console.log(`✅ ${label}`);
}

async function rpc(c, name, args = undefined) {
  const { data, error } = await c.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}${error.details ? ` — ${error.details}` : ""}`);
  return data;
}

async function ignoreFailure(label, task) {
  try { await task(); } catch (error) { console.warn(`⚠️ Nettoyage ${label}: ${error?.message || error}`); }
}

async function cleanup() {
  // Les tables ONLINE match/message ne sont pas toutes en cascade sur le lobby.
  await ignoreFailure("online_messages", async () => { await admin.from("online_messages").delete().eq("lobby_code", lobbyCode); });
  await ignoreFailure("online_matches", async () => { await admin.from("online_matches").delete().eq("lobby_code", lobbyCode); });
  await ignoreFailure("online_lobby_players", async () => { await admin.from("online_lobby_players").delete().eq("lobby_code", lobbyCode); });
  await ignoreFailure("online_lobbies", async () => { await admin.from("online_lobbies").delete().eq("code", lobbyCode); });
  if (userA?.id) await ignoreFailure("userA", async () => { await admin.auth.admin.deleteUser(userA.id); });
  if (userB?.id) await ignoreFailure("userB", async () => { await admin.auth.admin.deleteUser(userB.id); });
}

try {
  const createA = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true, user_metadata: { nickname: `E2E-A-${runId}` } });
  if (createA.error || !createA.data.user) throw createA.error || new Error("Création utilisateur A impossible");
  userA = createA.data.user;
  const createB = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true, user_metadata: { nickname: `E2E-B-${runId}` } });
  if (createB.error || !createB.data.user) throw createB.error || new Error("Création utilisateur B impossible");
  userB = createB.data.user;
  ok("Deux comptes temporaires Supabase créés");

  const a = client();
  const b = client();
  const authA = await a.auth.signInWithPassword({ email: emailA, password });
  const authB = await b.auth.signInWithPassword({ email: emailB, password });
  assert.equal(authA.error, null);
  assert.equal(authB.error, null);
  assert.equal(authA.data.user?.id, userA.id);
  assert.equal(authB.data.user?.id, userB.id);
  ok("Authentification publique Supabase de deux utilisateurs");

  // Un client non authentifié ne doit pas pouvoir appeler les RPC privées.
  const anonymous = client();
  const anonProbe = await anonymous.rpc("ms_get_nearby_settings");
  assert.ok(anonProbe.error, "ms_get_nearby_settings doit être interdit à anon");
  ok("RPC proximité inaccessible aux visiteurs anonymes");

  const settingsA = await rpc(a, "ms_set_nearby_settings", {
    p_latitude: 48.8566,
    p_longitude: 2.3522,
    p_visible: true,
    p_radius_km: 25,
    p_sports: ["darts"],
    p_skill_level: 3,
    p_available_now: true,
    p_looking_for_game: true,
    p_preferred_modes: ["x01", "cricket"],
    p_area_label: "Zone test A",
    p_display_name: `E2E A ${runId}`,
    p_avatar_url: null,
    p_country_code: "FR",
  });
  const settingsB = await rpc(b, "ms_set_nearby_settings", {
    p_latitude: 48.8666,
    p_longitude: 2.3522,
    p_visible: true,
    p_radius_km: 25,
    p_sports: ["darts"],
    p_skill_level: 4,
    p_available_now: true,
    p_looking_for_game: true,
    p_preferred_modes: ["x01"],
    p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`,
    p_avatar_url: null,
    p_country_code: "FR",
  });
  assert.equal(settingsA.visible, true);
  assert.equal(settingsB.visible, true);
  ok("Réglages de proximité enregistrés");

  const nearby = await rpc(a, "ms_find_nearby_players", {
    p_radius_km: 10,
    p_sport: "darts",
    p_available_only: true,
    p_looking_only: true,
    p_limit: 20,
  });
  const bRow = nearby.find((row) => String(row.userId || row.user_id) === userB.id);
  assert.ok(bRow, "Le joueur B doit être détecté à proximité");
  assert.ok(Number(bRow.distanceKm ?? bRow.distance_km) >= 2, "La distance doit être volontairement arrondie");
  const serializedNearby = JSON.stringify(bRow).toLowerCase();
  assert.equal(serializedNearby.includes("latitude"), false);
  assert.equal(serializedNearby.includes("longitude"), false);
  assert.equal(serializedNearby.includes("coordinates"), false);
  assert.equal(serializedNearby.includes("location\""), false);
  ok("Recherche réelle de proximité + aucune coordonnée GPS exposée");

  // RLS: B ne doit jamais pouvoir lire la ligne GPS brute de A.
  const privateProbe = await b.from("ms_nearby_settings").select("user_id, location, location_updated_at").eq("user_id", userA.id);
  if (privateProbe.error) throw privateProbe.error;
  assert.equal(privateProbe.data.length, 0, "RLS doit masquer les coordonnées de A à B");
  ok("RLS masque les coordonnées brutes entre utilisateurs");

  await rpc(b, "ms_set_nearby_settings", {
    p_latitude: null, p_longitude: null, p_visible: false, p_radius_km: 25, p_sports: ["darts"], p_skill_level: 4,
    p_available_now: true, p_looking_for_game: true, p_preferred_modes: ["x01"], p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`, p_avatar_url: null, p_country_code: "FR",
  });
  const hiddenSearch = await rpc(a, "ms_find_nearby_players", { p_radius_km: 10, p_sport: "darts", p_available_only: false, p_looking_only: false, p_limit: 20 });
  assert.equal(hiddenSearch.some((row) => String(row.userId || row.user_id) === userB.id), false);
  ok("Un joueur invisible disparaît immédiatement de la recherche");

  await rpc(b, "ms_set_nearby_settings", {
    p_latitude: null, p_longitude: null, p_visible: true, p_radius_km: 25, p_sports: ["babyfoot"], p_skill_level: 4,
    p_available_now: true, p_looking_for_game: true, p_preferred_modes: [], p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`, p_avatar_url: null, p_country_code: "FR",
  });
  const sportFiltered = await rpc(a, "ms_find_nearby_players", { p_radius_km: 10, p_sport: "darts", p_available_only: false, p_looking_only: false, p_limit: 20 });
  assert.equal(sportFiltered.some((row) => String(row.userId || row.user_id) === userB.id), false);
  ok("Filtre sport appliqué côté base");

  await rpc(b, "ms_set_nearby_settings", {
    p_latitude: null, p_longitude: null, p_visible: true, p_radius_km: 25, p_sports: ["darts"], p_skill_level: 4,
    p_available_now: false, p_looking_for_game: false, p_preferred_modes: ["x01"], p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`, p_avatar_url: null, p_country_code: "FR",
  });
  const unavailable = await rpc(a, "ms_find_nearby_players", { p_radius_km: 10, p_sport: "darts", p_available_only: true, p_looking_only: false, p_limit: 20 });
  assert.equal(unavailable.some((row) => String(row.userId || row.user_id) === userB.id), false);
  ok("Filtre Disponible maintenant appliqué");

  await rpc(b, "ms_set_nearby_settings", {
    p_latitude: null, p_longitude: null, p_visible: true, p_radius_km: 25, p_sports: ["darts"], p_skill_level: 4,
    p_available_now: true, p_looking_for_game: true, p_preferred_modes: ["x01"], p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`, p_avatar_url: null, p_country_code: "FR",
  });
  const looking = await rpc(a, "ms_find_nearby_players", { p_radius_km: 10, p_sport: "darts", p_available_only: true, p_looking_only: true, p_limit: 20 });
  assert.ok(looking.some((row) => String(row.userId || row.user_id) === userB.id));
  ok("Filtre JE CHERCHE UNE PARTIE appliqué");

  const request = await rpc(a, "ms_send_nearby_game_request", { p_to_user_id: userB.id, p_sport: "darts", p_modes: ["x01"], p_message: "E2E" });
  assert.ok(request.id);
  const requestsB = await rpc(b, "ms_list_nearby_game_requests");
  const incoming = requestsB.find((row) => String(row.id) === String(request.id));
  assert.equal(incoming?.direction, "incoming");
  const accepted = await rpc(b, "ms_respond_nearby_game_request", { p_request_id: request.id, p_status: "accepted" });
  assert.equal(accepted.status, "accepted");
  const requestsA = await rpc(a, "ms_list_nearby_game_requests");
  assert.equal(requestsA.find((row) => String(row.id) === String(request.id))?.status, "accepted");
  ok("Proposition de partie envoyée, reçue et acceptée");

  const friendReq = await rpc(a, "ms_send_friend_request", { p_to_user_id: userB.id, p_message: "E2E friend" });
  assert.ok(friendReq.id);
  const friendRequestsB = await rpc(b, "ms_list_friend_requests");
  assert.ok(friendRequestsB.some((row) => String(row.id) === String(friendReq.id)));
  await rpc(b, "ms_respond_friend_request", { p_request_id: friendReq.id, p_status: "accepted" });
  const friendsA = await rpc(a, "ms_list_friends");
  assert.ok(friendsA.some((row) => String(row.id || row.userId || row.user_id) === userB.id));
  ok("Demande d'ami publique + acceptation");

  const sentMessage = await rpc(a, "ms_send_private_message", { p_to_user_id: userB.id, p_text: "MSS E2E hello", p_metadata: { e2e: true } });
  assert.ok(sentMessage.id);
  const messagesB = await rpc(b, "ms_list_private_messages", { p_limit: 50 });
  assert.ok(messagesB.some((row) => String(row.id) === String(sentMessage.id) && String(row.text || "") === "MSS E2E hello"));
  ok("Messagerie publique Supabase fonctionnelle");

  // Mini flux ONLINE réel : salon -> 2 joueurs -> match -> update -> chat.
  const lobbyInsert = await a.from("online_lobbies").insert({
    code: lobbyCode, mode: "x01", max_players: 2, host_user_id: userA.id, host_nickname: `E2E A ${runId}`, settings: { e2e: true }, status: "waiting",
  }).select("*").single();
  if (lobbyInsert.error) throw lobbyInsert.error;
  const lobby = lobbyInsert.data;
  const playerAInsert = await a.from("online_lobby_players").insert({ lobby_id: lobby.id, lobby_code: lobbyCode, user_id: userA.id, nickname: "E2E A", display_name: "E2E A", role: "player", status: "ready" });
  if (playerAInsert.error) throw playerAInsert.error;
  const lobbyReadB = await b.from("online_lobbies").select("id,code,status").eq("code", lobbyCode).single();
  if (lobbyReadB.error) throw lobbyReadB.error;
  assert.equal(lobbyReadB.data.code, lobbyCode);
  const playerBInsert = await b.from("online_lobby_players").insert({ lobby_id: lobby.id, lobby_code: lobbyCode, user_id: userB.id, nickname: "E2E B", display_name: "E2E B", role: "player", status: "ready" });
  if (playerBInsert.error) throw playerBInsert.error;
  const matchInsert = await a.from("online_matches").insert({ lobby_code: lobbyCode, mode: "x01", status: "started", state_json: { turn: 1, scoreA: 501, scoreB: 501 }, owner_user: userA.id }).select("*").single();
  if (matchInsert.error) throw matchInsert.error;
  const matchUpdate = await b.from("online_matches").update({ state_json: { turn: 2, scoreA: 441, scoreB: 501 }, updated_at: new Date().toISOString() }).eq("lobby_code", lobbyCode).select("state_json").single();
  if (matchUpdate.error) throw matchUpdate.error;
  assert.equal(matchUpdate.data.state_json.turn, 2);
  const chatInsert = await b.from("online_messages").insert({ lobby_code: lobbyCode, user_id: userB.id, nickname: "E2E B", message: { text: "ready", e2e: true } }).select("id").single();
  if (chatInsert.error) throw chatInsert.error;
  const chatRead = await a.from("online_messages").select("id,message").eq("lobby_code", lobbyCode);
  if (chatRead.error) throw chatRead.error;
  assert.ok(chatRead.data.some((row) => row.id === chatInsert.data.id));
  ok("Salon ONLINE public, match partagé et chat fonctionnels via RLS Supabase");

  console.log("\n✅ LIVE PUBLIC CLOUD / NEARBY / SOCIAL / ONLINE E2E OK\n");
} finally {
  await cleanup();
  console.log("🧹 Données et comptes E2E temporaires nettoyés.");
}

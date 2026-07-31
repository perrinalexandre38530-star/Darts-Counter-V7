#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

const url = String(process.env.SUPABASE_TEST_URL || "").trim().replace(/\/+$/, "");
const publicKey = String(process.env.SUPABASE_TEST_ANON_KEY || "").trim();
const secretKey = String(process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || "").trim();

if (!url || !publicKey || !secretKey) {
  console.error("\n❌ LIVE SUPABASE TESTS NOT CONFIGURED");
  console.error("Variables requises: SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SERVICE_ROLE_KEY.\n");
  process.exit(2);
}

if (typeof fetch !== "function") {
  console.error("❌ Node 22+ requis : fetch() indisponible.");
  process.exit(2);
}

const runId = `${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
const password = `Mss!${crypto.randomBytes(14).toString("base64url")}9a`;
const emailA = `mss-e2e-${runId}-a@example.com`;
const emailB = `mss-e2e-${runId}-b@example.com`;
const lobbyCode = `T${runId.slice(-7).toUpperCase()}`;
let userA = null;
let userB = null;
let nearbyPlaceId = null;

function ok(label) { console.log(`✅ ${label}`); }
function encode(value) { return encodeURIComponent(String(value ?? "")); }

async function fetchJson(path, opts = {}) {
  const method = String(opts.method || "GET").toUpperCase();
  const headers = {
    apikey: opts.apiKey || publicKey,
    accept: "application/json",
    ...(opts.accessToken ? { authorization: `Bearer ${opts.accessToken}` } : {}),
    ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
    ...(opts.headers || {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(opts.timeoutMs || 20000));
  let response;
  try {
    response = await fetch(`${url}${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`${method} ${path}: timeout`);
    throw new Error(`${method} ${path}: ${error?.message || error}`);
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text().catch(() => "");
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok && !opts.allowError) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`${method} ${path}: HTTP ${response.status}${detail ? ` — ${detail}` : ""}`);
  }
  return { response, data };
}

async function adminCreateUser(email, nickname) {
  // Avec les nouvelles clés sb_secret_*, le secret est envoyé uniquement dans
  // l'en-tête apikey. L'API Gateway Supabase le traduit côté serveur.
  const { data } = await fetchJson("/auth/v1/admin/users", {
    method: "POST",
    apiKey: secretKey,
    body: { email, password, email_confirm: true, user_metadata: { nickname } },
  });
  return data;
}

async function adminDeleteUser(id) {
  return fetchJson(`/auth/v1/admin/users/${encode(id)}`, { method: "DELETE", apiKey: secretKey });
}

async function signIn(email) {
  const { data } = await fetchJson("/auth/v1/token?grant_type=password", {
    method: "POST",
    apiKey: publicKey,
    body: { email, password },
  });
  return data;
}

async function rpc(accessToken, name, args = {}) {
  const { data } = await fetchJson(`/rest/v1/rpc/${encode(name)}`, {
    method: "POST",
    apiKey: publicKey,
    accessToken,
    body: args,
  });
  return data;
}

async function restUser(accessToken, tableAndQuery, opts = {}) {
  const { data } = await fetchJson(`/rest/v1/${tableAndQuery}`, {
    method: opts.method || "GET",
    apiKey: publicKey,
    accessToken,
    body: opts.body,
    headers: opts.prefer ? { Prefer: opts.prefer } : undefined,
  });
  return data;
}

async function restAdmin(tableAndQuery, opts = {}) {
  const { data } = await fetchJson(`/rest/v1/${tableAndQuery}`, {
    method: opts.method || "GET",
    apiKey: secretKey,
    body: opts.body,
    headers: opts.prefer ? { Prefer: opts.prefer } : undefined,
  });
  return data;
}

async function ignoreFailure(label, task) {
  try { await task(); } catch (error) { console.warn(`⚠️ Nettoyage ${label}: ${error?.message || error}`); }
}

async function cleanup() {
  if (nearbyPlaceId) {
    await ignoreFailure("ms_nearby_place_requests", () => restAdmin(`ms_nearby_place_requests?place_id=eq.${encode(nearbyPlaceId)}`, { method: "DELETE", prefer: "return=minimal" }));
    await ignoreFailure("ms_nearby_places", () => restAdmin(`ms_nearby_places?id=eq.${encode(nearbyPlaceId)}`, { method: "DELETE", prefer: "return=minimal" }));
  }
  await ignoreFailure("online_messages", () => restAdmin(`online_messages?lobby_code=eq.${encode(lobbyCode)}`, { method: "DELETE", prefer: "return=minimal" }));
  await ignoreFailure("online_matches", () => restAdmin(`online_matches?lobby_code=eq.${encode(lobbyCode)}`, { method: "DELETE", prefer: "return=minimal" }));
  await ignoreFailure("online_lobby_players", () => restAdmin(`online_lobby_players?lobby_code=eq.${encode(lobbyCode)}`, { method: "DELETE", prefer: "return=minimal" }));
  await ignoreFailure("online_lobbies", () => restAdmin(`online_lobbies?code=eq.${encode(lobbyCode)}`, { method: "DELETE", prefer: "return=minimal" }));
  if (userA?.id) await ignoreFailure("userA", () => adminDeleteUser(userA.id));
  if (userB?.id) await ignoreFailure("userB", () => adminDeleteUser(userB.id));
}

try {
  userA = await adminCreateUser(emailA, `E2E-A-${runId}`);
  userB = await adminCreateUser(emailB, `E2E-B-${runId}`);
  assert.ok(userA?.id && userB?.id, "Les comptes temporaires doivent avoir un id");
  ok("Deux comptes temporaires Supabase créés");

  const authA = await signIn(emailA);
  const authB = await signIn(emailB);
  const tokenA = String(authA?.access_token || "");
  const tokenB = String(authB?.access_token || "");
  assert.ok(tokenA && tokenB, "Les sessions utilisateurs doivent fournir un access_token");
  assert.equal(String(authA?.user?.id || ""), String(userA.id));
  assert.equal(String(authB?.user?.id || ""), String(userB.id));
  ok("Authentification publique Supabase de deux utilisateurs");

  const anonProbe = await fetchJson("/rest/v1/rpc/ms_get_nearby_settings", {
    method: "POST", apiKey: publicKey, body: {}, allowError: true,
  });
  assert.equal(anonProbe.response.ok, false, "ms_get_nearby_settings doit être interdit à anon");
  ok("RPC proximité inaccessible aux visiteurs anonymes");

  const settingsA = await rpc(tokenA, "ms_set_nearby_settings", {
    p_latitude: 48.8566, p_longitude: 2.3522, p_visible: true, p_radius_km: 25,
    p_sports: ["darts"], p_skill_level: 3, p_available_now: true, p_looking_for_game: true,
    p_preferred_modes: ["x01", "cricket"], p_area_label: "Zone test A", p_display_name: `E2E A ${runId}`,
    p_avatar_url: null, p_country_code: "FR",
  });
  const settingsB = await rpc(tokenB, "ms_set_nearby_settings", {
    p_latitude: 48.8666, p_longitude: 2.3522, p_visible: true, p_radius_km: 25,
    p_sports: ["darts"], p_skill_level: 4, p_available_now: true, p_looking_for_game: true,
    p_preferred_modes: ["x01"], p_area_label: "Zone test B", p_display_name: `E2E B ${runId}`,
    p_avatar_url: null, p_country_code: "FR",
  });
  assert.equal(settingsA?.visible, true);
  assert.equal(settingsB?.visible, true);
  ok("Réglages de proximité enregistrés");

  const nearby = await rpc(tokenA, "ms_find_nearby_players", {
    p_radius_km: 10, p_sport: "darts", p_available_only: true, p_looking_only: true, p_limit: 20,
  });
  const bRow = (Array.isArray(nearby) ? nearby : []).find((row) => String(row?.userId || row?.user_id) === String(userB.id));
  assert.ok(bRow, "Le joueur B doit être détecté à proximité");
  assert.ok(Number(bRow.distanceKm ?? bRow.distance_km) >= 2, "La distance doit être volontairement arrondie");
  const serializedNearby = JSON.stringify(bRow).toLowerCase();
  for (const forbidden of ["latitude", "longitude", "coordinates", '"location"']) {
    assert.equal(serializedNearby.includes(forbidden), false, `La réponse proximité ne doit pas exposer ${forbidden}`);
  }
  ok("Recherche réelle de proximité + aucune coordonnée GPS exposée");

  const privateProbe = await restUser(tokenB, `ms_nearby_settings?select=user_id,location,location_updated_at&user_id=eq.${encode(userA.id)}`);
  assert.equal(Array.isArray(privateProbe) ? privateProbe.length : -1, 0, "RLS doit masquer les coordonnées de A à B");
  ok("RLS masque les coordonnées brutes entre utilisateurs");

  await rpc(tokenB, "ms_set_nearby_settings", {
    p_latitude: null, p_longitude: null, p_visible: false, p_radius_km: 25, p_sports: ["darts"], p_skill_level: 4,
    p_available_now: true, p_looking_for_game: true, p_preferred_modes: ["x01"], p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`, p_avatar_url: null, p_country_code: "FR",
  });
  const hiddenSearch = await rpc(tokenA, "ms_find_nearby_players", { p_radius_km: 10, p_sport: "darts", p_available_only: false, p_looking_only: false, p_limit: 20 });
  assert.equal(hiddenSearch.some((row) => String(row?.userId || row?.user_id) === String(userB.id)), false);
  ok("Un joueur invisible disparaît immédiatement de la recherche");

  await rpc(tokenB, "ms_set_nearby_settings", {
    p_latitude: null, p_longitude: null, p_visible: true, p_radius_km: 25, p_sports: ["babyfoot"], p_skill_level: 4,
    p_available_now: true, p_looking_for_game: true, p_preferred_modes: [], p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`, p_avatar_url: null, p_country_code: "FR",
  });
  const sportFiltered = await rpc(tokenA, "ms_find_nearby_players", { p_radius_km: 10, p_sport: "darts", p_available_only: false, p_looking_only: false, p_limit: 20 });
  assert.equal(sportFiltered.some((row) => String(row?.userId || row?.user_id) === String(userB.id)), false);
  ok("Filtre sport appliqué côté base");

  await rpc(tokenB, "ms_set_nearby_settings", {
    p_latitude: null, p_longitude: null, p_visible: true, p_radius_km: 25, p_sports: ["darts"], p_skill_level: 4,
    p_available_now: false, p_looking_for_game: false, p_preferred_modes: ["x01"], p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`, p_avatar_url: null, p_country_code: "FR",
  });
  const unavailable = await rpc(tokenA, "ms_find_nearby_players", { p_radius_km: 10, p_sport: "darts", p_available_only: true, p_looking_only: false, p_limit: 20 });
  assert.equal(unavailable.some((row) => String(row?.userId || row?.user_id) === String(userB.id)), false);
  ok("Filtre Disponible maintenant appliqué");

  await rpc(tokenB, "ms_set_nearby_settings", {
    p_latitude: null, p_longitude: null, p_visible: true, p_radius_km: 25, p_sports: ["darts"], p_skill_level: 4,
    p_available_now: true, p_looking_for_game: true, p_preferred_modes: ["x01"], p_area_label: "Zone test B",
    p_display_name: `E2E B ${runId}`, p_avatar_url: null, p_country_code: "FR",
  });
  const looking = await rpc(tokenA, "ms_find_nearby_players", { p_radius_km: 10, p_sport: "darts", p_available_only: true, p_looking_only: true, p_limit: 20 });
  assert.ok(looking.some((row) => String(row?.userId || row?.user_id) === String(userB.id)));
  ok("Filtre JE CHERCHE UNE PARTIE appliqué");

  const place = await rpc(tokenA, "ms_publish_nearby_place_v2", {
    p_kind: "tournament",
    p_title: `Tournoi E2E ${runId}`,
    p_description: "Tournoi local automatique de validation",
    p_sport: "darts",
    p_latitude: 48.8576,
    p_longitude: 2.3522,
    p_area_label: "Zone tournoi E2E",
    p_starts_at: new Date(Date.now() + 86400000).toISOString(),
    p_ends_at: new Date(Date.now() + 90000000).toISOString(),
    p_precise_location: false,
    p_metadata: { e2e: true },
    p_max_participants: 8,
    p_min_skill_level: 2,
    p_max_skill_level: 5,
    p_cover_url: null,
    p_organizer_label: `E2E A ${runId}`,
  });
  nearbyPlaceId = String(place?.id || "");
  assert.ok(nearbyPlaceId, "Le tournoi local doit être publié");

  const placesB = await rpc(tokenB, "ms_find_nearby_places", { p_radius_km: 10, p_sport: "darts", p_kinds: ["tournament"], p_limit: 20 });
  const placeSeenByB = placesB.find((row) => String(row?.id) === nearbyPlaceId);
  assert.ok(placeSeenByB, "Le tournoi doit apparaître sur la carte du joueur B");
  assert.equal(Number(placeSeenByB?.maxParticipants), 8);
  assert.equal(Number(placeSeenByB?.acceptedCount), 0);
  ok("Tournoi local publié et visible sur la carte");

  const placeRequest = await rpc(tokenB, "ms_send_nearby_place_request", {
    p_place_id: nearbyPlaceId,
    p_request_type: "participate",
    p_message: "Inscription E2E",
    p_party_size: 1,
  });
  assert.ok(placeRequest?.id, "La demande d'inscription doit être créée");
  const ownerRequests = await rpc(tokenA, "ms_list_nearby_place_requests", { p_limit: 50 });
  const ownerIncoming = ownerRequests.find((row) => String(row?.id) === String(placeRequest.id));
  assert.equal(ownerIncoming?.direction, "incoming");
  assert.equal(ownerIncoming?.requestType, "participate");
  await rpc(tokenA, "ms_respond_nearby_place_request", { p_request_id: placeRequest.id, p_status: "accepted" });

  const placesBAfterAccept = await rpc(tokenB, "ms_find_nearby_places", { p_radius_km: 10, p_sport: "darts", p_kinds: ["tournament"], p_limit: 20 });
  const acceptedPlace = placesBAfterAccept.find((row) => String(row?.id) === nearbyPlaceId);
  assert.equal(acceptedPlace?.myRequestStatus, "accepted");
  assert.equal(Number(acceptedPlace?.acceptedCount), 1);
  ok("Inscription tournoi envoyée, reçue et acceptée");

  const request = await rpc(tokenA, "ms_send_nearby_game_request", { p_to_user_id: userB.id, p_sport: "darts", p_modes: ["x01"], p_message: "E2E" });
  assert.ok(request?.id);
  const requestsB = await rpc(tokenB, "ms_list_nearby_game_requests");
  const incoming = requestsB.find((row) => String(row?.id) === String(request.id));
  assert.equal(incoming?.direction, "incoming");
  const accepted = await rpc(tokenB, "ms_respond_nearby_game_request", { p_request_id: request.id, p_status: "accepted" });
  assert.equal(accepted?.status, "accepted");
  ok("Proposition de partie envoyée, reçue et acceptée");

  const friendReq = await rpc(tokenA, "ms_send_friend_request", { p_to_user_id: userB.id, p_message: "E2E friend" });
  assert.ok(friendReq?.id);
  const friendRequestsB = await rpc(tokenB, "ms_list_friend_requests");
  assert.ok(friendRequestsB.some((row) => String(row?.id) === String(friendReq.id)));
  await rpc(tokenB, "ms_respond_friend_request", { p_request_id: friendReq.id, p_status: "accepted" });
  const friendsA = await rpc(tokenA, "ms_list_friends");
  assert.ok(friendsA.some((row) => String(row?.id || row?.userId || row?.user_id) === String(userB.id)));
  ok("Demande d'ami publique + acceptation");

  const sentMessage = await rpc(tokenA, "ms_send_private_message", { p_to_user_id: userB.id, p_text: "MSS E2E hello", p_metadata: { e2e: true } });
  assert.ok(sentMessage?.id);
  const messagesB = await rpc(tokenB, "ms_list_private_messages", { p_limit: 50 });
  assert.ok(messagesB.some((row) => String(row?.id) === String(sentMessage.id) && String(row?.text || "") === "MSS E2E hello"));
  ok("Messagerie publique Supabase fonctionnelle");

  const lobbyRows = await restUser(tokenA, "online_lobbies?select=*", {
    method: "POST", prefer: "return=representation",
    body: { code: lobbyCode, mode: "x01", max_players: 2, host_user_id: userA.id, host_nickname: `E2E A ${runId}`, settings: { e2e: true }, status: "waiting" },
  });
  const lobby = Array.isArray(lobbyRows) ? lobbyRows[0] : null;
  assert.ok(lobby?.id, "Le salon public doit être créé");

  await restUser(tokenA, "online_lobby_players", { method: "POST", body: { lobby_id: lobby.id, lobby_code: lobbyCode, user_id: userA.id, nickname: "E2E A", display_name: "E2E A", role: "player", status: "ready" } });
  const lobbyReadB = await restUser(tokenB, `online_lobbies?select=id,code,status&code=eq.${encode(lobbyCode)}`);
  assert.equal(lobbyReadB?.[0]?.code, lobbyCode);
  await restUser(tokenB, "online_lobby_players", { method: "POST", body: { lobby_id: lobby.id, lobby_code: lobbyCode, user_id: userB.id, nickname: "E2E B", display_name: "E2E B", role: "player", status: "ready" } });

  const matchRows = await restUser(tokenA, "online_matches?select=*", {
    method: "POST", prefer: "return=representation",
    body: { lobby_code: lobbyCode, mode: "x01", status: "started", state_json: { turn: 1, scoreA: 501, scoreB: 501 }, owner_user: userA.id },
  });
  assert.ok(matchRows?.[0]?.id, "Le match public doit être créé");
  const matchUpdate = await restUser(tokenB, `online_matches?lobby_code=eq.${encode(lobbyCode)}&select=state_json`, {
    method: "PATCH", prefer: "return=representation", body: { state_json: { turn: 2, scoreA: 441, scoreB: 501 }, updated_at: new Date().toISOString() },
  });
  assert.equal(matchUpdate?.[0]?.state_json?.turn, 2);

  const chatRows = await restUser(tokenB, "online_messages?select=id", {
    method: "POST", prefer: "return=representation", body: { lobby_code: lobbyCode, user_id: userB.id, nickname: "E2E B", message: { text: "ready", e2e: true } },
  });
  const chatRead = await restUser(tokenA, `online_messages?select=id,message&lobby_code=eq.${encode(lobbyCode)}`);
  assert.ok(chatRead.some((row) => String(row.id) === String(chatRows?.[0]?.id)));
  ok("Salon ONLINE public, match partagé et chat fonctionnels via RLS Supabase");

  console.log("\n✅ LIVE PUBLIC CLOUD / NEARBY / SOCIAL / ONLINE E2E OK\n");
} finally {
  await cleanup();
  console.log("🧹 Données et comptes E2E temporaires nettoyés.");
}

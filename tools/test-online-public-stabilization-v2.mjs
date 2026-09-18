import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const api = read('src/lib/onlineApi.ts');
const chat = read('src/lib/chatApi.ts');
const lobby = read('src/pages/X01OnlineSetup.tsx');
const play = read('src/pages/X01PlayV3.tsx');
const friends = read('src/pages/FriendsPage.tsx');
const sql = read('supabase/migrations/20260918225000_online_public_stabilization_v2.sql');

for (const rpc of [
  'ms_online_lobby_snapshot', 'ms_online_create_lobby', 'ms_online_join_lobby',
  'ms_online_set_ready', 'ms_online_touch_lobby', 'ms_online_leave_lobby',
  'ms_online_start_match', 'ms_online_update_match_state', 'ms_online_end_match',
]) assert(sql.includes(rpc), `RPC manquante: ${rpc}`);

assert(api.includes('supabase.rpc("ms_online_create_lobby"'), 'createLobby doit utiliser la RPC atomique');
assert(api.includes('supabase.rpc("ms_online_start_match"'), 'startMatch doit utiliser la RPC atomique');
assert(api.includes('function subscribeOnlineStream'), 'flux Realtime public manquant');
assert(!chat.includes('canUseNasOnlineApi'), 'Le chat public ne doit plus dépendre du NAS');
assert(!chat.includes('/online/lobbies/'), 'Le chat public ne doit plus appeler le backend NAS');
assert(!lobby.includes('useOnlineRoom'), 'La salle X01 ne doit plus ouvrir le vieux WebSocket Worker');
assert(!lobby.includes('messages NAS'), 'Libellé NAS obsolète dans la salle X01');
assert(lobby.includes('touchLobby'), 'Heartbeat salon manquant dans X01OnlineSetup');
assert(play.includes('touchLobby'), 'Heartbeat salon manquant pendant X01PlayV3');
assert(friends.includes('subscribeOnlineStream'), 'FriendsPage doit recevoir les salons en Realtime');
assert(friends.includes('touchLobby'), 'Heartbeat salon manquant dans FriendsPage');

console.log('ONLINE PUBLIC V2: contrats statiques OK');

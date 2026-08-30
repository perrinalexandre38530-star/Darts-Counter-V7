import { getEsportsGame } from "./catalog";
import { buildRoundRobinMatches, buildSingleEliminationBracket } from "./tournamentEngine";
import type { EsportsMatch, EsportsRoom, EsportsState, EsportsTournament, EsportsTournamentFormat, GamerIdentity } from "./types";

const LS_KEY = "ms-esports-hub-v1";
const EVENT = "ms:esports-store";

const DEFAULT_GAMER: GamerIdentity = {
  displayName: "Gamer",
  bio: "",
  country: "FR",
  favoriteGameIds: ["rocket-league", "valorant", "ea-sports-fc"],
  handles: {},
  availability: "available",
  lookingForGroup: false,
};

const DEFAULT_STATE: EsportsState = {
  version: 1,
  gamer: DEFAULT_GAMER,
  selectedGameId: "rocket-league",
  rooms: [],
  matches: [],
  tournaments: [],
};

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateEsportsRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function normalizeState(value: any): EsportsState {
  if (!value || typeof value !== "object") return structuredClone(DEFAULT_STATE);
  return {
    version: 1,
    gamer: { ...DEFAULT_GAMER, ...(value.gamer || {}), handles: { ...(value.gamer?.handles || {}) }, favoriteGameIds: Array.isArray(value.gamer?.favoriteGameIds) ? value.gamer.favoriteGameIds.map(String) : DEFAULT_GAMER.favoriteGameIds },
    selectedGameId: getEsportsGame(value.selectedGameId).id,
    rooms: Array.isArray(value.rooms) ? value.rooms : [],
    matches: Array.isArray(value.matches) ? value.matches : [],
    tournaments: Array.isArray(value.tournaments) ? value.tournaments : [],
  };
}

export function readEsportsState(): EsportsState {
  if (typeof window === "undefined") return structuredClone(DEFAULT_STATE);
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : structuredClone(DEFAULT_STATE);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function writeEsportsState(next: EsportsState): EsportsState {
  const clean = normalizeState(next);
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(clean)); } catch {}
  try { window.dispatchEvent(new CustomEvent(EVENT)); } catch {}
  return clean;
}

export function patchEsportsState(mutator: (state: EsportsState) => EsportsState): EsportsState {
  return writeEsportsState(mutator(readEsportsState()));
}

export function subscribeEsportsStore(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  const onStorage = (event: StorageEvent) => { if (event.key === LS_KEY) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener("storage", onStorage); };
}

export function saveGamerIdentity(patch: Partial<GamerIdentity>): EsportsState {
  return patchEsportsState((state) => ({ ...state, gamer: { ...state.gamer, ...patch, handles: { ...state.gamer.handles, ...(patch.handles || {}) } } }));
}

export function toggleFavoriteGame(gameId: string): EsportsState {
  return patchEsportsState((state) => {
    const has = state.gamer.favoriteGameIds.includes(gameId);
    return { ...state, gamer: { ...state.gamer, favoriteGameIds: has ? state.gamer.favoriteGameIds.filter((id) => id !== gameId) : [...state.gamer.favoriteGameIds, gameId] } };
  });
}

export function selectEsportsGame(gameId: string): EsportsState {
  return patchEsportsState((state) => ({ ...state, selectedGameId: getEsportsGame(gameId).id }));
}

export function createLocalEsportsRoom(input: Partial<EsportsRoom> & { gameId: string; hostName: string }): EsportsRoom {
  const game = getEsportsGame(input.gameId);
  const teamSize = Math.max(1, Number(input.teamSize || game.teamSizes[0] || 1));
  const room: EsportsRoom = {
    id: uid("room"),
    code: input.code || generateEsportsRoomCode(),
    source: input.source || "local",
    onlineLobbyId: input.onlineLobbyId || null,
    gameId: game.id,
    title: input.title || `${game.shortName} · Salon`,
    formatLabel: input.formatLabel || (game.matchShape === "1v1" ? "1v1" : `${teamSize}v${teamSize}`),
    teamSize,
    maxPlayers: Math.max(2, Number(input.maxPlayers || Math.min(game.maxPlayers, Math.max(2, teamSize * 2)))),
    bestOf: Number(input.bestOf || game.bestOf[0] || 1),
    status: input.status || "waiting",
    visibility: input.visibility || "private",
    members: input.members || [{ id: uid("member"), name: input.hostName || "Hôte", ready: true, team: "A", role: "host" }],
    createdAt: input.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  patchEsportsState((state) => ({ ...state, selectedGameId: room.gameId, rooms: [room, ...state.rooms.filter((r) => r.id !== room.id && r.code !== room.code)].slice(0, 80) }));
  return room;
}

export function upsertEsportsRoom(room: EsportsRoom): EsportsState {
  return patchEsportsState((state) => ({ ...state, rooms: [{ ...room, updatedAt: Date.now() }, ...state.rooms.filter((r) => r.id !== room.id && r.code !== room.code)].slice(0, 80) }));
}

export function removeEsportsRoom(id: string): EsportsState {
  return patchEsportsState((state) => ({ ...state, rooms: state.rooms.filter((room) => room.id !== id) }));
}

export function recordEsportsMatch(input: Omit<EsportsMatch, "id" | "createdAt" | "winner"> & { winner?: "A" | "B" | "draw" }): EsportsMatch {
  const scoreA = Number(input.sideA.score || 0);
  const scoreB = Number(input.sideB.score || 0);
  const match: EsportsMatch = {
    ...input,
    id: uid("match"),
    winner: input.winner || (scoreA === scoreB ? "draw" : scoreA > scoreB ? "A" : "B"),
    playedAt: input.playedAt || Date.now(),
    createdAt: Date.now(),
  };
  patchEsportsState((state) => ({ ...state, selectedGameId: match.gameId, matches: [match, ...state.matches].slice(0, 500) }));
  return match;
}

export function createEsportsTournament(input: { name: string; gameId: string; format: EsportsTournamentFormat; bestOf: number; participantNames: string[] }): EsportsTournament {
  const participants = input.participantNames.map((name, index) => ({ id: uid("participant"), name: name.trim(), seed: index + 1 })).filter((p) => p.name);
  const tournament: EsportsTournament = {
    id: uid("tournament"),
    name: input.name.trim() || `${getEsportsGame(input.gameId).shortName} Cup`,
    gameId: getEsportsGame(input.gameId).id,
    format: input.format,
    bestOf: Math.max(1, Number(input.bestOf || 1)),
    participants,
    matches: input.format === "round_robin" ? buildRoundRobinMatches(participants) : buildSingleEliminationBracket(participants),
    status: "active",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  patchEsportsState((state) => ({ ...state, selectedGameId: tournament.gameId, tournaments: [tournament, ...state.tournaments].slice(0, 100) }));
  return tournament;
}

export function deleteEsportsTournament(id: string): EsportsState {
  return patchEsportsState((state) => ({ ...state, tournaments: state.tournaments.filter((t) => t.id !== id) }));
}

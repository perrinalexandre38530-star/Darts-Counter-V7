import { getEsportsGame } from "./catalog";
import { applyTournamentMatchScore, buildRoundRobinMatches, buildSingleEliminationBracket } from "./tournamentEngine";
import type {
  EsportsLfgPost,
  EsportsMatch,
  EsportsPlatform,
  EsportsRoom,
  EsportsRoomInvite,
  EsportsState,
  EsportsTeam,
  EsportsTournament,
  EsportsTournamentFormat,
  GamerIdentity,
} from "./types";

// On conserve volontairement la même clé afin de migrer les données V0.1 sans les perdre.
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
  version: 2,
  gamer: DEFAULT_GAMER,
  selectedGameId: "rocket-league",
  rooms: [],
  matches: [],
  tournaments: [],
  teams: [],
  lfgPosts: [],
  roomInvites: [],
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
    version: 2,
    gamer: {
      ...DEFAULT_GAMER,
      ...(value.gamer || {}),
      handles: { ...(value.gamer?.handles || {}) },
      favoriteGameIds: Array.isArray(value.gamer?.favoriteGameIds)
        ? value.gamer.favoriteGameIds.map(String)
        : DEFAULT_GAMER.favoriteGameIds,
    },
    selectedGameId: getEsportsGame(value.selectedGameId).id,
    rooms: Array.isArray(value.rooms) ? value.rooms : [],
    matches: Array.isArray(value.matches) ? value.matches : [],
    tournaments: Array.isArray(value.tournaments) ? value.tournaments : [],
    teams: Array.isArray(value.teams) ? value.teams : [],
    lfgPosts: Array.isArray(value.lfgPosts) ? value.lfgPosts : [],
    roomInvites: Array.isArray(value.roomInvites) ? value.roomInvites : [],
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
  return patchEsportsState((state) => ({
    ...state,
    gamer: { ...state.gamer, ...patch, handles: { ...state.gamer.handles, ...(patch.handles || {}) } },
  }));
}

export function toggleFavoriteGame(gameId: string): EsportsState {
  return patchEsportsState((state) => {
    const has = state.gamer.favoriteGameIds.includes(gameId);
    return {
      ...state,
      gamer: {
        ...state.gamer,
        favoriteGameIds: has
          ? state.gamer.favoriteGameIds.filter((id) => id !== gameId)
          : [...state.gamer.favoriteGameIds, gameId],
      },
    };
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
  patchEsportsState((state) => ({
    ...state,
    selectedGameId: room.gameId,
    rooms: [room, ...state.rooms.filter((r) => r.id !== room.id && r.code !== room.code)].slice(0, 80),
  }));
  return room;
}

export function upsertEsportsRoom(room: EsportsRoom): EsportsState {
  return patchEsportsState((state) => ({
    ...state,
    rooms: [{ ...room, updatedAt: Date.now() }, ...state.rooms.filter((r) => r.id !== room.id && r.code !== room.code)].slice(0, 80),
  }));
}

export function removeEsportsRoom(id: string): EsportsState {
  return patchEsportsState((state) => ({ ...state, rooms: state.rooms.filter((room) => room.id !== id) }));
}

export function recordEsportsRoomInvite(input: Omit<EsportsRoomInvite, "id" | "sentAt">): EsportsRoomInvite {
  const invite: EsportsRoomInvite = { ...input, id: uid("invite"), sentAt: Date.now() };
  patchEsportsState((state) => ({ ...state, roomInvites: [invite, ...state.roomInvites].slice(0, 120) }));
  return invite;
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

export function createEsportsTeam(input: { name: string; tag?: string; gameIds?: string[]; memberNames?: string[]; captainName?: string }): EsportsTeam {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Nom d'équipe obligatoire.");
  const team: EsportsTeam = {
    id: uid("team"),
    name,
    tag: String(input.tag || "").trim().toUpperCase().slice(0, 8),
    captainName: String(input.captainName || "Gamer").trim() || "Gamer",
    gameIds: (input.gameIds || []).map((id) => getEsportsGame(id).id).filter((id, index, arr) => arr.indexOf(id) === index),
    memberNames: (input.memberNames || []).map((v) => String(v).trim()).filter(Boolean),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  patchEsportsState((state) => ({ ...state, teams: [team, ...state.teams].slice(0, 80) }));
  return team;
}

export function updateEsportsTeam(id: string, patch: Partial<Pick<EsportsTeam, "name" | "tag" | "gameIds" | "memberNames" | "captainName">>): EsportsState {
  return patchEsportsState((state) => ({
    ...state,
    teams: state.teams.map((team) => team.id === id ? { ...team, ...patch, updatedAt: Date.now() } : team),
  }));
}

export function deleteEsportsTeam(id: string): EsportsState {
  return patchEsportsState((state) => ({ ...state, teams: state.teams.filter((team) => team.id !== id) }));
}

export function createEsportsLfgPost(input: {
  gameId: string;
  authorName: string;
  platform: EsportsPlatform;
  mode?: string;
  message?: string;
  slotsNeeded?: number;
}): EsportsLfgPost {
  const post: EsportsLfgPost = {
    id: uid("lfg"),
    gameId: getEsportsGame(input.gameId).id,
    authorName: String(input.authorName || "Gamer").trim() || "Gamer",
    platform: input.platform,
    mode: String(input.mode || "Casual").trim() || "Casual",
    message: String(input.message || "").trim(),
    slotsNeeded: Math.max(1, Math.min(20, Number(input.slotsNeeded || 1))),
    status: "open",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  patchEsportsState((state) => ({ ...state, selectedGameId: post.gameId, lfgPosts: [post, ...state.lfgPosts].slice(0, 100) }));
  return post;
}

export function setEsportsLfgStatus(id: string, status: "open" | "closed"): EsportsState {
  return patchEsportsState((state) => ({
    ...state,
    lfgPosts: state.lfgPosts.map((post) => post.id === id ? { ...post, status, updatedAt: Date.now() } : post),
  }));
}

export function deleteEsportsLfgPost(id: string): EsportsState {
  return patchEsportsState((state) => ({ ...state, lfgPosts: state.lfgPosts.filter((post) => post.id !== id) }));
}

export function createEsportsTournament(input: { name: string; gameId: string; format: EsportsTournamentFormat; bestOf: number; participantNames: string[] }): EsportsTournament {
  const participants = input.participantNames
    .map((name, index) => ({ id: uid("participant"), name: name.trim(), seed: index + 1 }))
    .filter((p) => p.name);
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

export function recordEsportsTournamentMatchResult(tournamentId: string, tournamentMatchId: string, scoreA: number, scoreB: number): EsportsState {
  return patchEsportsState((state) => {
    const tournament = state.tournaments.find((t) => t.id === tournamentId);
    if (!tournament) throw new Error("Tournoi introuvable.");
    const original = tournament.matches.find((m) => m.id === tournamentMatchId);
    if (!original?.participantAId || !original?.participantBId || !original.participantAName || !original.participantBName) {
      throw new Error("Match non prêt.");
    }

    const matches = applyTournamentMatchScore(tournament.matches, tournamentMatchId, scoreA, scoreB, tournament.format);
    const updatedMatch = matches.find((m) => m.id === tournamentMatchId)!;
    const finished = matches.length > 0 && matches.every((m) => m.status === "finished");
    const updatedTournament: EsportsTournament = { ...tournament, matches, status: finished ? "finished" : "active", updatedAt: Date.now() };

    const history: EsportsMatch = {
      id: uid("match"),
      gameId: tournament.gameId,
      tournamentId: tournament.id,
      tournamentMatchId,
      bestOf: tournament.bestOf,
      resultKind: getEsportsGame(tournament.gameId).resultKind,
      sideA: { name: original.participantAName, playerNames: [original.participantAName], score: Number(scoreA) },
      sideB: { name: original.participantBName, playerNames: [original.participantBName], score: Number(scoreB) },
      winner: updatedMatch.winnerId === original.participantAId ? "A" : "B",
      notes: `Tournoi · ${tournament.name}`,
      playedAt: Date.now(),
      createdAt: Date.now(),
    };

    return {
      ...state,
      selectedGameId: tournament.gameId,
      tournaments: state.tournaments.map((t) => t.id === tournament.id ? updatedTournament : t),
      matches: [history, ...state.matches.filter((m) => !(m.tournamentId === tournament.id && m.tournamentMatchId === tournamentMatchId))].slice(0, 500),
    };
  });
}

export function deleteEsportsTournament(id: string): EsportsState {
  return patchEsportsState((state) => ({ ...state, tournaments: state.tournaments.filter((t) => t.id !== id) }));
}

import { onlineApi, type OnlineLobby } from "../lib/onlineApi";
import { getEsportsGame } from "./catalog";
import { createLocalEsportsRoom, upsertEsportsRoom } from "./store";
import type { EsportsRoom, EsportsRoomMember } from "./types";

function lobbyToEsportsRoom(lobby: OnlineLobby): EsportsRoom {
  const settings = (lobby.settings || {}) as any;
  const game = getEsportsGame(settings.esports?.gameId || String(lobby.mode || "").replace(/^esports:/, ""));
  const competitive = settings.esports?.competitiveMatch || null;
  const members: EsportsRoomMember[] = (lobby.players || []).map((p: any, index: number) => {
    const onlineUserId = String(p.userId || p.user_id || "");
    const autoTeam = competitive && onlineUserId
      ? onlineUserId === String(competitive.playerAUserId || "") ? "A"
        : onlineUserId === String(competitive.playerBUserId || "") ? "B"
          : (index % 2 === 0 ? "A" : "B")
      : null;
    return {
      id: String(p.id || p.userId || p.user_id || `online_${index}`),
      onlineUserId: onlineUserId || null,
      name: String(p.nickname || p.displayName || p.display_name || `Joueur ${index + 1}`),
      ready: String(p.status || "").toLowerCase() === "ready",
      team: p.team === "B" ? "B" : p.team === "A" ? "A" : autoTeam,
      role: String(p.role || "player") === "spectator" ? "spectator" : onlineUserId === String(lobby.hostUserId || "") ? "host" : "player",
    };
  });
  return {
    id: String(lobby.id || lobby.code),
    code: String(lobby.code || "").toUpperCase(),
    source: "online",
    onlineLobbyId: String(lobby.id || "") || null,
    gameId: game.id,
    title: String(settings.esports?.title || `${game.shortName} · Salon Online`),
    formatLabel: String(settings.esports?.formatLabel || "Match"),
    teamSize: Math.max(1, Number(settings.esports?.teamSize || game.teamSizes[0] || 1)),
    maxPlayers: Math.max(2, Number(lobby.maxPlayers || settings.esports?.maxPlayers || 2)),
    bestOf: Math.max(1, Number(settings.esports?.bestOf || 1)),
    status: String(lobby.status || "waiting") === "playing" ? "playing" : ["ended","closed","finished"].includes(String(lobby.status || "")) ? "finished" : "waiting",
    visibility: settings.esports?.visibility === "public" ? "public" : settings.esports?.visibility === "friends" ? "friends" : "private",
    members,
    createdAt: Date.parse(String(lobby.createdAt || "")) || Date.now(),
    updatedAt: Date.parse(String(lobby.updatedAt || "")) || Date.now(),
  };
}

export async function createOnlineEsportsRoom(input: { gameId: string; title: string; teamSize: number; maxPlayers: number; bestOf: number; formatLabel: string; visibility: "private" | "friends" | "public"; hostName: string; competitiveMatch?: { matchId: string; playerAUserId: string; playerBUserId: string } }): Promise<EsportsRoom> {
  const game = getEsportsGame(input.gameId);
  const lobby = await onlineApi.createLobby({
    mode: `esports:${game.id}`,
    maxPlayers: input.maxPlayers,
    settings: {
      start: 0,
      doubleOut: false,
      esports: { gameId: game.id, title: input.title, teamSize: input.teamSize, maxPlayers: input.maxPlayers, bestOf: input.bestOf, formatLabel: input.formatLabel, visibility: input.visibility, schemaVersion: 2, competitiveMatch: input.competitiveMatch || null },
    },
  });
  const room = lobbyToEsportsRoom(lobby);
  if (!room.members.length) return createLocalEsportsRoom({ ...room, source: "online", hostName: input.hostName });
  upsertEsportsRoom(room);
  return room;
}

export async function joinOnlineEsportsRoom(code: string): Promise<EsportsRoom> {
  const lobby = await onlineApi.joinLobby({ code: String(code || "").trim().toUpperCase() } as any);
  const room = lobbyToEsportsRoom(lobby as any);
  upsertEsportsRoom(room);
  return room;
}

export async function refreshOnlineEsportsRoom(code: string): Promise<EsportsRoom> {
  const lobby = await onlineApi.getLobby(String(code || "").trim().toUpperCase());
  if (!lobby) throw new Error("Salon introuvable.");
  const room = lobbyToEsportsRoom(lobby);
  upsertEsportsRoom(room);
  return room;
}

export async function setOnlineEsportsReady(code: string, ready: boolean): Promise<EsportsRoom> {
  const lobby = await onlineApi.setLobbyReady({ code: String(code || "").trim().toUpperCase(), ready } as any);
  const room = lobbyToEsportsRoom(lobby as any);
  upsertEsportsRoom(room);
  return room;
}

export async function startOnlineEsportsMatch(room: EsportsRoom): Promise<void> {
  await onlineApi.startMatch({
    lobbyCode: room.code,
    initialState: { type: "esports", schemaVersion: 1, gameId: room.gameId, roomId: room.id, roomCode: room.code, title: room.title, formatLabel: room.formatLabel, bestOf: room.bestOf, participants: room.members, startedAt: Date.now() },
  });
}

export function subscribeOnlineEsportsRoom(code: string, onRoom: (room: EsportsRoom) => void): () => void {
  const sub = onlineApi.subscribeOnlineStream(String(code || "").trim().toUpperCase(), {
    onLobby: (lobby: any) => {
      try { const room = lobbyToEsportsRoom(lobby); upsertEsportsRoom(room); onRoom(room); } catch {}
    },
  } as any) as any;
  if (typeof sub === "function") return sub;
  if (sub && typeof sub.unsubscribe === "function") return () => sub.unsubscribe();
  if (sub && typeof sub.close === "function") return () => sub.close();
  return () => {};
}

export async function listPublicOnlineEsportsRooms(limit = 60): Promise<EsportsRoom[]> {
  const lobbies = await onlineApi.listActiveLobbies(Math.max(1, Math.min(120, limit)));
  return (lobbies || [])
    .filter((lobby: any) => String(lobby?.mode || "").toLowerCase().startsWith("esports:"))
    .filter((lobby: any) => String((lobby?.settings as any)?.esports?.visibility || "private").toLowerCase() === "public")
    .map((lobby: any) => lobbyToEsportsRoom(lobby))
    .filter((room) => room.status !== "finished")
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

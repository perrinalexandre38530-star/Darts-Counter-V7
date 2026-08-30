import { fetchMessages, postMessage, subscribeMessages } from "../lib/chatApi";
import {
  listFriends,
  searchUsers,
  sendFriendRequest,
  sendPrivateMessage,
  updatePresence,
  type OnlineFriendUser,
} from "../lib/friendsApi";
import type { EsportsRoom } from "./types";

export type EsportsFriend = OnlineFriendUser;

export async function loadEsportsFriends(): Promise<EsportsFriend[]> {
  return await listFriends();
}

export async function searchEsportsPlayers(query: string): Promise<EsportsFriend[]> {
  const clean = String(query || "").trim();
  if (clean.length < 2) return [];
  return await searchUsers(clean);
}

export async function requestEsportsFriend(userId: string, message?: string): Promise<any> {
  return await sendFriendRequest(userId, message || "Invitation E-SPORTS · MULTISPORTS SCORING");
}

export async function syncEsportsPresence(availability: "available" | "busy" | "offline"): Promise<any> {
  const status = availability === "available" ? "online" : availability === "busy" ? "away" : "offline";
  return await updatePresence(status);
}

export async function sendEsportsRoomInvite(room: EsportsRoom, friend: EsportsFriend, fromName: string): Promise<any> {
  const targetUserId = String(friend.userId || friend.id || "").trim();
  if (!targetUserId) throw new Error("Identifiant ami introuvable.");
  const gameTitle = room.title || "Salon E-SPORTS";
  return await sendPrivateMessage(
    targetUserId,
    `${fromName || "Un ami"} t'invite dans ${gameTitle} · code ${room.code}`,
    {
      kind: "esports_room_invite",
      sport: "esports",
      roomCode: room.code,
      roomId: room.id,
      gameId: room.gameId,
      title: room.title,
      bestOf: room.bestOf,
      formatLabel: room.formatLabel,
    },
  );
}

export async function fetchEsportsRoomMessages(roomCode: string): Promise<any[]> {
  return await fetchMessages(roomCode, 80);
}

export async function postEsportsRoomMessage(roomCode: string, text: string, authorName: string): Promise<any> {
  const clean = String(text || "").trim();
  if (!clean) return null;
  return await postMessage(roomCode, { type: "esports_chat", text: clean.slice(0, 500), authorName: authorName || "Gamer" });
}

export function subscribeEsportsRoomMessages(roomCode: string, onInsert: (row: any) => void) {
  return subscribeMessages(roomCode, onInsert);
}

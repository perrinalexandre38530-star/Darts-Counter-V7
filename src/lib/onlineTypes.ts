// ============================================
// src/lib/onlineTypes.ts
// Types pour le Mode Online (auth / profils / friends / rooms)
// ============================================

// ---------- AUTH ----------
export type UserAuth = {
  id: string;          // UID serveur
  email?: string;      // optionnel si magic link / email login
  nickname: string;    // pseudo unique public (ex: CHEVROUTE)
  createdAt: number;
};

// ---------- PROFIL DE JEU ----------
export type OnlineProfile = {
  id: string;          // UID du profil
  userId: string;      // lien vers UserAuth.id
  displayName: string; // nom public dans les parties
  avatarUrl?: string;  // URL de ton médaillon stocké en ligne
  country?: string;    // option : drapeau
  countryCode?: string | null; // pour compat avec onlineApi mock
  bio?: string;        // option : phrase courte

  // Résumé stats globales (utile pour liste d'amis / online hub)
  stats: {
    totalMatches: number;
    totalLegs: number;
    avg3: number;
    bestVisit: number;
    bestCheckout: number;
  };

  updatedAt: number;
};

// ---------- MATCHS ----------
export type OnlineMatch = {
  id: string;
  userId: string;
  // ✅ tous les modes connus de l'app
  mode:
    | "x01"
    | "cricket"
    | "killer"
    | "shanghai"
    | "training_x01"
    | "clock";
  payload: any;
  startedAt: number;
  finishedAt: number;
  isTraining: boolean;
};

// ---------- AMIS ----------
export type Friend = {
  id: string;
  userId: string;
  friendUserId: string;
  status: "pending" | "accepted" | "blocked";
  createdAt: number;
};

export type Presence = {
  userId: string;
  status: "online" | "away" | "offline" | "in_match";
  lastSeenAt: number;
};

// ---------- ROOMS ONLINE ----------
export type OnlineRoom = {
  id: string;
  code: string; // code à partager, ex: AB42FK
  hostUserId: string;
  status: "lobby" | "playing" | "finished";
  mode: "x01" | "cricket" | "training_x01";
  createdAt: number;
  updatedAt: number;
};

export type RoomParticipant = {
  roomId: string;
  userId: string;
  profile: OnlineProfile;
  seatIndex: number;
  joinedAt: number;
};

// ---------- MESSAGES TEMPS RÉEL ----------
export type ClientMessage =
  | { type: "JOIN_ROOM"; roomCode: string }
  | { type: "LEAVE_ROOM" }
  | { type: "START_MATCH"; opts: any }
  | { type: "PLAY_VISIT"; visit: any }
  | { type: "UNDO_LAST" }
  | { type: "CHAT"; text: string };

export type ServerMessage =
  | { type: "ROOM_STATE"; room: OnlineRoom; participants: RoomParticipant[] }
  | { type: "MATCH_STATE"; snapshot: any }
  | { type: "VISIT_ADDED"; visit: any; playerId: string }
  | { type: "VISIT_UNDONE"; playerId: string }
  | { type: "CHAT"; from: OnlineProfile; text: string; at: number };

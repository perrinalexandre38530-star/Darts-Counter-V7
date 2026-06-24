import { apiGet, apiPost, apiPut } from "./apiClient";

export type ClubRole = "owner" | "admin" | "coach" | "captain" | "player" | "member" | string;

export type Club = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  sports?: string[];
  visibility?: "private" | "members" | "public" | string;
  role?: ClubRole;
  membersCount?: number;
  teamsCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ClubTeam = {
  id: string;
  clubId: string;
  localTeamId?: string | null;
  sport: string;
  name: string;
  logoUrl?: string | null;
  logoDataUrl?: string | null;
  description?: string | null;
  membersCount?: number;
  role?: ClubRole;
  createdAt?: string;
  updatedAt?: string;
};

export type ClubInvite = {
  id: string;
  clubId: string;
  clubTeamId?: string | null;
  status: string;
  role?: string;
  createdAt?: string;
  senderName?: string | null;
  clubName?: string | null;
  teamName?: string | null;
};

function qs(value: string) {
  return encodeURIComponent(String(value || "").trim());
}

export async function listMyClubs(): Promise<Club[]> {
  const res = await apiGet("/online/clubs");
  return Array.isArray(res?.clubs) ? res.clubs : [];
}

export async function createClub(input: {
  name: string;
  description?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  sports?: string[];
  visibility?: string;
}): Promise<Club> {
  const res = await apiPost("/online/clubs", input);
  return res?.club ?? res;
}

export async function listClubTeams(clubId: string): Promise<ClubTeam[]> {
  const res = await apiGet(`/online/clubs/${qs(clubId)}/teams`);
  return Array.isArray(res?.teams) ? res.teams : [];
}

export async function upsertClubTeam(input: {
  clubId: string;
  localTeamId?: string;
  sport: string;
  name: string;
  logoUrl?: string | null;
  logoDataUrl?: string | null;
  description?: string | null;
  playerIds?: string[];
}): Promise<ClubTeam> {
  const res = await apiPost(`/online/clubs/${qs(input.clubId)}/teams`, input);
  return res?.team ?? res;
}

export async function listClubInvites(): Promise<ClubInvite[]> {
  const res = await apiGet("/online/clubs/invitations");
  return Array.isArray(res?.invitations) ? res.invitations : [];
}

export async function respondClubInvite(inviteId: string, status: "accepted" | "refused") {
  const res = await apiPost(`/online/clubs/invitations/${qs(inviteId)}/respond`, { status });
  return res?.invitation ?? res;
}

export async function inviteUserToClub(input: {
  clubId: string;
  clubTeamId?: string | null;
  targetUserId: string;
  role?: string;
}) {
  const res = await apiPost(`/online/clubs/${qs(input.clubId)}/invitations`, input);
  return res?.invitation ?? res;
}

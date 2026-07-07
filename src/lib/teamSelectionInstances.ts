// src/lib/teamSelectionInstances.ts
// Gestion globale des équipes sélectionnables plusieurs fois.
// Règle : une équipe enregistrée peut être réutilisée tant qu'il reste assez de joueurs
// disponibles. Les occurrences sont nommées "Familia A", "Familia B", etc.

import { findRememberedGeneratedTeam } from "./teamAutoShuffle";

export type TeamLike = {
  id?: string | number | null;
  name?: string | null;
  playerIds?: any[];
  players?: any[];
  members?: any[];
  [key: string]: any;
};

export function teamBaseId(value: any): string {
  const raw = typeof value === "object" && value
    ? String(value.baseTeamId || value.sourceTeamId || value.teamRefId || value.id || "")
    : String(value || "");
  return raw.split("__slot_")[0];
}

export function teamInstanceIndex(instanceId: any): number {
  const raw = String(instanceId || "");
  const match = raw.match(/__slot_(\d+)$/);
  if (match) return Math.max(0, Number(match[1]) || 0);
  const suffix = raw.match(/__slot_([A-Z]+)$/);
  if (!suffix) return 0;
  const letters = suffix[1];
  let n = 0;
  for (let i = 0; i < letters.length; i += 1) n = n * 26 + (letters.charCodeAt(i) - 64);
  return Math.max(0, n - 1);
}

export function teamInstanceSuffix(index: number): string {
  const n = Math.max(0, Math.floor(Number(index) || 0));
  let value = n + 1;
  let out = "";
  while (value > 0) {
    value -= 1;
    out = String.fromCharCode(65 + (value % 26)) + out;
    value = Math.floor(value / 26);
  }
  return out || "A";
}

export function makeTeamInstanceId(baseId: any, index: number): string {
  const base = teamBaseId(baseId);
  const n = Math.max(0, Math.floor(Number(index) || 0));
  return n <= 0 ? base : `${base}__slot_${n}`;
}

export function getTeamPlayerIds(team: TeamLike | null | undefined): string[] {
  if (!team) return [];
  const raw = Array.isArray(team.playerIds)
    ? team.playerIds
    : Array.isArray(team.players)
      ? team.players.map((p: any) => typeof p === "string" ? p : (p?.id ?? p?.profileId ?? p?.playerId ?? p?.localProfileId ?? null))
      : Array.isArray(team.members)
        ? team.members.map((p: any) => typeof p === "string" ? p : (p?.id ?? p?.profileId ?? p?.playerId ?? p?.localProfileId ?? null))
        : [];
  return Array.from(new Set(raw.map((id: any) => String(id || "").trim()).filter(Boolean)));
}

export function pickAvailableTeamPlayers(
  team: TeamLike | null | undefined,
  selectedInstanceIds: any[],
  selectionsByInstanceId: Record<string, any[]> | null | undefined,
  requiredPlayers: number,
  instanceId?: string
): string[] {
  const all = getTeamPlayerIds(team);
  const base = teamBaseId(team);
  const targetInstanceId = instanceId || "";
  const used = new Set<string>();

  for (const rawId of selectedInstanceIds || []) {
    const sid = String(rawId || "");
    if (!sid || sid === targetInstanceId) continue;
    if (teamBaseId(sid) !== base) continue;
    const selected = Array.isArray(selectionsByInstanceId?.[sid]) ? selectionsByInstanceId![sid].map(String) : [];
    for (const pid of selected) if (pid) used.add(pid);
  }

  return all.filter((pid) => !used.has(pid)).slice(0, Math.max(0, Number(requiredPlayers) || 0));
}

export function canAddTeamInstance(
  team: TeamLike | null | undefined,
  selectedInstanceIds: any[],
  selectionsByInstanceId: Record<string, any[]> | null | undefined,
  requiredPlayers: number
): boolean {
  return pickAvailableTeamPlayers(team, selectedInstanceIds, selectionsByInstanceId, requiredPlayers).length >= Math.max(1, Number(requiredPlayers) || 1);
}

export function nextTeamInstanceId(team: TeamLike | null | undefined, selectedInstanceIds: any[]): string {
  const base = teamBaseId(team);
  const count = (selectedInstanceIds || []).filter((id) => teamBaseId(id) === base).length;
  return makeTeamInstanceId(base, count);
}

export function buildTeamInstance<T extends TeamLike>(
  team: T,
  instanceId: string,
  playerIds?: string[]
): T & { id: string; baseTeamId: string; sourceTeamId: string; name: string; playerIds: string[]; originalName: string } {
  const base = teamBaseId(team);
  const idx = teamInstanceIndex(instanceId);
  const originalName = String(team?.name || "Équipe").trim() || "Équipe";
  const suffix = teamInstanceSuffix(idx);
  const allIds = getTeamPlayerIds(team);
  const selectedIds = Array.isArray(playerIds) && playerIds.length ? playerIds.map(String).filter(Boolean) : allIds;
  return {
    ...(team as any),
    id: instanceId,
    baseTeamId: base,
    sourceTeamId: base,
    teamRefId: base,
    teamSlotLabel: suffix,
    originalName,
    // IMPORTANT :
    // Le suffixe A/B/C sert uniquement d'identifiant technique de sélection.
    // Il ne doit jamais modifier le nom affiché dans les matchs, historiques ou stats.
    name: originalName,
    playerIds: selectedIds,
  };
}

export function resolveTeamInstance<T extends TeamLike>(
  teams: T[],
  instanceId: any,
  selectedInstanceIds: any[] = [],
  selectionsByInstanceId: Record<string, any[]> = {},
  requiredPlayers = 1
): (T & { id: string; baseTeamId: string; sourceTeamId: string; name: string; playerIds: string[]; originalName: string }) | null {
  const id = String(instanceId || "");
  const base = teamBaseId(id);
  const team = (teams || []).find((t: any) => teamBaseId(t) === base) || findRememberedGeneratedTeam(base);
  if (!team) return null;
  const selected = Array.isArray(selectionsByInstanceId[id])
    ? selectionsByInstanceId[id].map(String).filter(Boolean)
    : pickAvailableTeamPlayers(team, selectedInstanceIds, selectionsByInstanceId, requiredPlayers, id);
  return buildTeamInstance(team, id, selected);
}

export function resolveTeamInstances<T extends TeamLike>(
  teams: T[],
  selectedInstanceIds: any[],
  selectionsByInstanceId: Record<string, any[]> = {},
  requiredPlayers = 1
) {
  return (selectedInstanceIds || [])
    .map((id) => resolveTeamInstance(teams, id, selectedInstanceIds, selectionsByInstanceId, requiredPlayers))
    .filter(Boolean);
}

/** TOSSIT configuration presets. These never alter the rules of the score engines. */
import type { TossitMode } from "./tossitEngine";

export type TossitSetupStyle = "quick" | "arcade";
export type TossitConfigView = "guided" | "complete";
export type TossitParticipantKind = "players" | "teams";

const twoSides: ReadonlySet<TossitMode> = new Set([
  "speed", "duel", "border", "tictac", "battle", "conquest", "river", "cornhole", "goalkeeper", "football_pitch", "thief_cop",
]);
const fixedThreeDarts: ReadonlySet<TossitMode> = new Set(["cornhole", "goalkeeper", "chores"]);
const fixedSixDarts: ReadonlySet<TossitMode> = new Set(["duel", "football_pitch"]);
const specialSixToNine: ReadonlySet<TossitMode> = new Set(["river", "thief_cop"]);
const teamEligible: ReadonlySet<TossitMode> = new Set([
  "classic", "speed", "duel", "border", "battle", "conquest", "river", "cornhole", "goalkeeper", "football_pitch", "thief_cop", "bottle",
]);

export function tossitRequiresTwoSides(mode: TossitMode): boolean { return twoSides.has(mode); }
export function tossitSupportsTeams(mode: TossitMode): boolean { return teamEligible.has(mode); }
export function tossitMinimumPlayers(mode: TossitMode): number {
  return ["target", "reach", "rainbow", "chores"].includes(mode) ? 1 : 2;
}
export function tossitMaximumPlayers(mode: TossitMode): number {
  if (twoSides.has(mode)) return 2;
  if (mode === "target" || mode === "chores") return 4;
  return 6;
}
export function tossitDartsOptions(mode: TossitMode): number[] {
  if (fixedThreeDarts.has(mode)) return [3];
  if (fixedSixDarts.has(mode)) return [6];
  if (specialSixToNine.has(mode)) return [6, 7, 8, 9];
  return [3, 4, 5, 6];
}
export function tossitTargetOptions(mode: TossitMode): number[] {
  if (["battle", "conquest"].includes(mode)) return [3, 5, 7];
  if (mode === "thief_cop") return [2, 4];
  if (["reach", "rainbow", "chores", "bottle"].includes(mode)) return [3, 5];
  return [1];
}
export function tossitSetupPreset(mode: TossitMode, style: TossitSetupStyle) {
  const dartsOptions = tossitDartsOptions(mode);
  const targetOptions = tossitTargetOptions(mode);
  return {
    darts: style === "arcade" ? dartsOptions[dartsOptions.length - 1] : dartsOptions[0],
    victoryTarget: style === "arcade" ? targetOptions[Math.min(1, targetOptions.length - 1)] : targetOptions[0],
    gridSize: (style === "arcade" ? 5 : 4) as 4 | 5,
  };
}

export type TossitSelectionError = "teams-not-supported" | "duplicate-participants" | "two-teams-required" | "missing-team-members" | "member-in-both-teams" | "missing-players" | "too-many-players" | "exactly-two-sides";
export function tossitSelectionError(mode: TossitMode, participantIds: string[], kind: TossitParticipantKind, teamMembers: string[][] = []): TossitSelectionError | null {
  if (kind === "teams" && !tossitSupportsTeams(mode)) return "teams-not-supported";
  if (new Set(participantIds).size !== participantIds.length) return "duplicate-participants";
  if (kind === "teams") {
    if (participantIds.length !== 2) return "two-teams-required";
    if (teamMembers.length !== 2 || teamMembers.some((ids) => ids.length === 0)) return "missing-team-members";
    const allMembers = teamMembers.flat();
    if (new Set(allMembers).size !== allMembers.length) return "member-in-both-teams";
  }
  if (participantIds.length < tossitMinimumPlayers(mode)) return "missing-players";
  if (participantIds.length > tossitMaximumPlayers(mode)) return "too-many-players";
  if (tossitRequiresTwoSides(mode) && participantIds.length !== 2) return "exactly-two-sides";
  return null;
}

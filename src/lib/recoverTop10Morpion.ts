/** Reprise conservatrice de TOP 10 et MORPION depuis History V4.
 * La source reste le record History (resume.livePayload pour un checkpoint en cours).
 * Un état manquant/incohérent n'est JAMAIS remplacé silencieusement par une nouvelle partie.
 */
import { morpionIsDraw, morpionWinner, type MorpionGrid } from "./morpionEngine";

type Player = { id: string; name: string; isBot: boolean; botLevel: string; [key: string]: any };
const whole = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const isRecord = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const time = (v: unknown) => Number(v) || Date.parse(String(v || "")) || Date.now();

function common(rec: any, mode: "top_10" | "tic_tac_toe", minPlayers: number, allowFinished: boolean) {
  if (!isRecord(rec)) return null;
  const status = String(rec.status || "").toLowerCase();
  const finished = status === "finished";
  // A completed match may be inspected, never resumed. Only the caller's
  // explicit read-only preview flag can unlock it.
  if (status !== "in_progress" && !(allowFinished && finished)) return null;
  if (!finished && (rec.finishedAt || rec.summary?.finished === true || rec.resume?.state?.finished === true)) return null;
  const id = String(rec.matchId || rec.id || "").trim();
  if (!id || (rec.id && rec.matchId && String(rec.id) !== String(rec.matchId))) return null;
  const actualMode = String(rec.kind || rec.game?.mode || rec.mode || "").toLowerCase();
  if (actualMode !== mode) return null;
  // Finished saves contain an authoritative full payload. The previous live
  // checkpoint may still exist in resume.livePayload; never preview that stale
  // checkpoint in place of the completed result.
  const payload = (finished
    ? [rec.payload, rec.decoded, rec.resume?.livePayload, rec.resume?.state]
    : [rec.resume?.livePayload, rec.payload, rec.decoded, rec.resume?.state]
  ).find(isRecord);
  if (!payload) return null;
  const config = isRecord(payload.config) ? payload.config : isRecord(rec.resume?.config) ? rec.resume.config : {};
  const rawPlayers = Array.isArray(rec.players) && rec.players.length ? rec.players : config.players;
  if (!Array.isArray(rawPlayers) || rawPlayers.length < minPlayers || rawPlayers.length > 4) return null;
  const players: Player[] = rawPlayers.map((p: any, i: number) => ({
    ...(isRecord(p) ? p : {}),
    id: String(p?.id ?? "").trim(), name: String(p?.name || p?.nickname || `Joueur ${i + 1}`),
    isBot: !!p?.isBot, botLevel: String(p?.botLevel || config.botLevel || "normal"),
  }));
  if (players.some((p) => !p.id) || new Set(players.map((p) => p.id)).size !== players.length) return null;
  const winnerId = finished ? String(rec.winnerId || "").trim() || null : null;
  if (winnerId && !players.some((p) => p.id === winnerId)) return null;
  return { id, createdAt: time(rec.createdAt), payload, players, config: { ...config, players }, finished, winnerId };
}

export function recoverTop10(rec: any, options: { preview?: boolean } = {}) {
  const base = common(rec, "top_10", 1, options.preview === true);
  if (!base) return null;
  const { payload, players } = base;
  const scores = payload.visitScores;
  if (!Array.isArray(scores) || scores.length !== players.length ||
      scores.some((row: any) => !Array.isArray(row) || row.length > 10 ||
        row.some((score: any) => !whole(score, 0, 180)))) return null;
  const completed = scores.reduce((sum: number, row: number[]) => sum + row.length, 0);
  if (base.finished ? completed !== players.length * 10 : completed >= players.length * 10) return null;
  const round = Math.floor(completed / players.length);
  const current = completed % players.length;
  if (!scores.every((row: number[], i: number) => row.length === round + (i < current ? 1 : 0))) return null;
  if (payload.roundIdx !== undefined && !whole(payload.roundIdx, round, round)) return null;
  if (payload.currentPlayerIndex !== undefined && !whole(payload.currentPlayerIndex, current, current)) return null;
  const visits = payload.visitHistory ?? payload.visits ?? payload.events;
  if (!Array.isArray(visits) || visits.length !== completed) return null;
  return { ...base, scores: scores.map((row: number[]) => [...row]), round, current, visits: [...visits] };
}

export function recoverMorpion(rec: any, options: { preview?: boolean } = {}) {
  const base = common(rec, "tic_tac_toe", 2, options.preview === true);
  if (!base) return null;
  const { payload, players, config } = base;
  const maxRounds = Math.max(1, Math.min(25, Number(config.bestOf ?? config.rounds) || 3));
  const { grid } = payload;
  if (!isRecord(grid) || !Array.isArray(grid.targets) || grid.targets.length !== 9 ||
      grid.targets[4] !== 25 || grid.targets.some((n: any, i: number) => i !== 4 && !whole(n, 1, 20)) ||
      new Set(grid.targets).size !== 9 || !Array.isArray(grid.owners) || grid.owners.length !== 9 ||
      grid.owners.some((owner: any) => owner !== null && !whole(owner, 0, players.length - 1)) ||
      !Array.isArray(grid.marks) || grid.marks.length !== 9 ||
      grid.marks.some((row: any) => !Array.isArray(row) || row.length !== players.length ||
        row.some((marks: any) => !whole(marks, 0, 4)))) return null;
  for (let i = 0; i < 9; i++) {
    if (grid.owners[i] !== null && grid.marks[i][grid.owners[i]] !== 4) return null;
  }
  const wins = payload.matchWins;
  if (!Array.isArray(wins) || wins.length !== players.length || wins.some((n: any) => !whole(n, 0, maxRounds))) return null;
  const round = payload.roundIdx;
  const current = payload.currentPlayerIndex;
  if (!whole(round, 0, maxRounds - 1) || !whole(current, 0, players.length - 1)) return null;
  const winner = morpionWinner(grid.owners);
  const draw = morpionIsDraw(grid.owners);
  const result = payload.roundResult;
  const requiredWins = Math.floor(maxRounds / 2) + 1;
  if (base.finished && (!result || !(wins.some((n: number) => n >= requiredWins) || round + 1 >= maxRounds))) return null;
  if (result !== null && result !== undefined) {
    if (!isRecord(result) || result.winner !== winner || !!result.draw !== draw || (!draw && winner === null)) return null;
  } else if (winner !== null || draw) return null;
  const visits = payload.visitHistory ?? payload.visits ?? payload.events;
  if (!Array.isArray(visits)) return null;
  return {
    ...base, grid: { targets: [...grid.targets], owners: [...grid.owners], marks: grid.marks.map((row: number[]) => [...row]) } as MorpionGrid,
    wins: [...wins], round, current, result: result ?? null, visits: [...visits],
  };
}

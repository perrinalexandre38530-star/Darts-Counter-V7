/**
 * CAPITAL V161 — Lecture sans mutation d'une partie terminée depuis History V4.
 * Le résumé et le journal original font autorité : jamais de score reconstitué
 * depuis les points bruts, jamais de participant fusionné par homonymie.
 */
import type { CapitalContractId, CapitalVisit } from "./capitalGame";

export type CapitalHistoryDetailPlayer = {
  id: string;
  name: string;
  rank: number | null;
  finalCapital: number | null;
  startingCapital: number | null;
  pointsWon: number | null;
  capitalLost: number | null;
  successfulContracts: number | null;
  contractsPlayed: number | null;
  successRate: number | null;
  averageVisit: number | null;
  bestVisit: number | null;
  dartsThrown: number | null;
  teamId: string | null;
};
export type CapitalHistoryDetail = {
  variantName: string;
  players: CapitalHistoryDetailPlayer[];
  contracts: CapitalContractId[];
  contractLabels: Record<string, string>;
  visits: CapitalVisit[];
  teams: Array<{ id: string; name: string; score: number | null }>;
  integrityWarning: boolean;
  journalComplete: boolean;
  dataWarning: string | null;
};
const text = (value: unknown) => String(value ?? "").trim();
const finite = (value: unknown): number | null =>
  (typeof value === "number" && Number.isFinite(value)) ? value : null;
const firstArray = (...values: unknown[]): any[] =>
  (values.find((value) => Array.isArray(value) && value.length > 0) as any[]) || [];

export function readCapitalHistoryMatchDetail(record: any): CapitalHistoryDetail {
  const summary = record?.summary || record?.payload?.summary || {};
  const payload = record?.payload || {};
  const cfg = record?.config || payload?.config || {};
  const sourcePlayers = firstArray(
    summary?.players, summary?.perPlayer,
    payload?.stats?.players, payload?.summary?.players, payload?.summary?.perPlayer,
    payload?.players, record?.players,
  );
  const sourceVisits = firstArray(
    payload?.stats?.visits, payload?.visits, payload?.visitHistory,
    payload?.summary?.visits, summary?.visits, record?.visits, record?.visitHistory,
  );
  const sourceContracts = firstArray(summary?.contracts, payload?.summary?.contracts, cfg?.contracts);
  const contractLabels: Record<string, string> = {};
  const contracts = sourceContracts.map((item: any) => {
    const id = text(typeof item === "string" ? item : item?.id);
    if (id && typeof item !== "string" && text(item.label)) contractLabels[id] = text(item.label);
    return id;
  }).filter(Boolean) as CapitalContractId[];
  // Un ancien enregistrement peut n'avoir que son journal : ne récupérer que
  // les ID explicitement enregistrés aux positions connues, sans inventer de tours.
  if (!contracts.length && sourceVisits.length) {
    const found = new Map<number, string>();
    for (const visit of sourceVisits) {
      const index = Number(visit?.contractIndex);
      const id = text(visit?.contractId);
      if (Number.isInteger(index) && index >= 0 && index < 120 && id) found.set(index, id);
    }
    // On n'affiche une grille que si elle est complète depuis le premier tour.
    for (let index = 0; found.has(index); index++) contracts.push(found.get(index)! as CapitalContractId);
  }
  const rawPlayers = new Map<string, CapitalHistoryDetailPlayer>();
  sourcePlayers.forEach((row: any, index: number) => {
    // ID stable obligatoire pour relier les volées ; un homonyme reste distinct.
    const realId = text(row?.id || row?.playerId || row?.profileId);
    const id = realId || `sans-id-${index}`;
    if (rawPlayers.has(id)) return;
    rawPlayers.set(id, {
      id,
      name: text(row?.nickname || row?.name || row?.playerName || row?.displayName) || `Joueur ${index + 1}`,
      rank: finite(row?.rank ?? row?.position),
      finalCapital: finite(row?.finalCapital ?? row?.capital ?? row?.score),
      startingCapital: finite(row?.startingCapital),
      pointsWon: finite(row?.pointsWon),
      capitalLost: finite(row?.capitalLost ?? row?.penaltyLost),
      successfulContracts: finite(row?.successfulContracts),
      contractsPlayed: finite(row?.contractsPlayed),
      successRate: finite(row?.successRate),
      averageVisit: finite(row?.averageVisit ?? row?.avgVisit),
      bestVisit: finite(row?.bestVisit),
      dartsThrown: finite(row?.dartsThrown ?? row?.darts),
      teamId: text(row?.teamId) || null,
    });
  });
  // À défaut de tableau des joueurs, le journal fournit les vrais ID des
  // participants ; ne pas inventer leur classement ni leur capital final.
  if (rawPlayers.size === 0) sourceVisits.forEach((visit: any) => {
    const id = text(visit?.playerId);
    if (!id || rawPlayers.has(id)) return;
    rawPlayers.set(id, {
      id, name: text(visit?.playerName) || `Joueur ${rawPlayers.size + 1}`,
      rank: null, finalCapital: null, startingCapital: null, pointsWon: null,
      capitalLost: null, successfulContracts: null, contractsPlayed: null,
      successRate: null, averageVisit: null, bestVisit: null,
      dartsThrown: null, teamId: null,
    });
  });
  const idSet = new Set(rawPlayers.keys());
  const latest = new Map<string, CapitalVisit>();
  for (const visit of sourceVisits) {
    const playerId = text(visit?.playerId);
    const index = Number(visit?.contractIndex);
    if (!idSet.has(playerId) || !Number.isInteger(index) || index < 0 || index >= contracts.length) continue;
    if (text(visit?.contractId) !== contracts[index]) continue;
    if (finite(visit?.scoreAfter) === null || finite(visit?.scoreBefore) === null || typeof visit?.success !== "boolean") continue;
    latest.set(`${playerId}:${index}`, visit as CapitalVisit);
  }
  const players = [...rawPlayers.values()].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    if (a.finalCapital !== null && b.finalCapital !== null) return b.finalCapital - a.finalCapital;
    return 0;
  });
  const sourceTeams = firstArray(summary?.teams, payload?.stats?.teams, payload?.teams);
  const teams = sourceTeams.map((row: any, index: number) => ({
    id: text(row?.id) || `equipe-${index}`,
    name: text(row?.name) || `Équipe ${index + 1}`,
    score: finite(row?.finalCapital ?? row?.score ?? row?.capital),
  }));
  const integrity = summary?.capitalIntegrity || payload?.capitalIntegrity || {};
  const journalComplete = !!(contracts.length && players.length &&
    players.every((player) => contracts.every((_, index) => latest.has(`${player.id}:${index}`))));
  const finalMismatch = journalComplete && players.some((player) => {
    const last = latest.get(`${player.id}:${contracts.length - 1}`);
    return player.finalCapital !== null && !!last && player.finalCapital !== last.scoreAfter;
  });
  const dataWarning = !contracts.length ? "Liste des contrats absente de cette sauvegarde." :
    !latest.size ? "Journal détaillé des volées indisponible : aucun score par contrat ne sera inventé." :
    !journalComplete ? "Journal partiel : les manches sans volée enregistrée restent vides." :
    finalMismatch ? "Attention : le capital final ne correspond pas à la dernière volée enregistrée. Les deux valeurs sont conservées sans recalcul." : null;
  return {
    variantName: text(summary?.capitalVariant?.label || payload?.summary?.capitalVariant?.label || cfg?.savedVariantName) || "CAPITAL",
    players, contracts, contractLabels, visits: [...latest.values()], teams,
    integrityWarning: integrity?.verified === false || finalMismatch,
    journalComplete, dataWarning,
  };
}

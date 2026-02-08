export type TerritoriesMatch = {
  id: string;
  when: number;
  mapId: string;
  teams: number;
  teamSize: number;
  objective: number;
  rounds: number;
  winnerTeam: number;
  captured: number[];   // nb de captures par team
  domination: number[]; // score final (territoires possédés)
};

const KEY = "dc_territories_history_v1";

function emitUpdated() {
  try {
    if (typeof window !== "undefined") {
      // Unifie le refresh du "Centre de statistiques" (StatsHub écoute déjà cet event)
      window.dispatchEvent(new Event("dc-history-updated"));
      // Event dédié Territories (optionnel)
      window.dispatchEvent(new Event("dc-territories-updated"));
    }
  } catch {}
}

export function loadTerritoriesHistory(): TerritoriesMatch[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as TerritoriesMatch[]) : [];
  } catch {
    return [];
  }
}

export function pushTerritoriesHistory(m: TerritoriesMatch) {
  const prev = loadTerritoriesHistory();
  const next = [m, ...prev].slice(0, 250);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  emitUpdated();
}

export function clearTerritoriesHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  emitUpdated();
}

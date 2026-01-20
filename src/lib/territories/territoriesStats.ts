export type TerritoriesMatch = {
    id: string;
    when: number;
    mapId: string;
    teams: number;
    teamSize: number;
    objective: number;
    rounds: number;
    winnerTeam: number;
    captured: number[];
    domination: number[];
  };
  
  const KEY = "dc_territories_history_v1";
  
  export function loadTerritoriesHistory(): TerritoriesMatch[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  
  export function pushTerritoriesHistory(m: TerritoriesMatch) {
    const prev = loadTerritoriesHistory();
    const next = [m, ...prev].slice(0, 200); // cap
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }
  
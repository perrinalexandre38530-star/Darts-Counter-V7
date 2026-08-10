import fs from "node:fs";

const hub = fs.readFileSync(new URL("../src/pages/StatsHub.tsx", import.meta.url), "utf8");
const killer = fs.readFileSync(new URL("../src/pages/StatsKiller.tsx", import.meta.url), "utf8");

const assert = (condition, message) => {
  if (!condition) throw new Error(`[stats-killer] ${message}`);
};

assert(!hub.includes("const killerAgg = React.useMemo"), "l'ancien useMemo Killer inutilisé et crashant ne doit pas revenir");
assert(hub.includes("toArrLoc<any>(r?.payload?.stats?.players).find"), "les players legacy du StatsHub doivent être normalisés avant .find()");
assert(hub.includes("const players = toArrLoc<any>(session?.players ?? session?.session?.players)"), "la résolution X01 doit accepter les maps de joueurs legacy");

for (const tab of ["overview", "combat", "ranking", "history"]) {
  assert(killer.includes(`key: \"${tab}\"`), `sous-onglet ${tab} manquant`);
}
assert(killer.includes("normalizeCollection"), "normalisation array/object des joueurs Killer manquante");
assert(killer.includes("recordHasPlayer"), "détection robuste du joueur Killer manquante");
assert(killer.includes("ResponsiveContainer"), "graphiques Recharts manquants");
assert(killer.includes("function Sparkline"), "sparkline Killer manquante");
assert(killer.includes("function PieStatChart"), "camembert Killer manquant");
assert(killer.includes("function BarsBySegment"), "graphique barres Killer manquant");

console.log("[stats-killer] OK — crash legacy protégé + UI KPI/tabs/graphiques présente");

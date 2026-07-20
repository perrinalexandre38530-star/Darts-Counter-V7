// @ts-nocheck
import React from "react";

const ACCENT = "#ffd166";

function number(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: any) {
  return String(value ?? "").trim();
}

function playerId(row: any) {
  return text(row?.id || row?.playerId || row?.profileId || row?.pid);
}

function playerName(row: any) {
  return text(row?.name || row?.playerName || row?.displayName || row?.nickname || "Joueur");
}

function isCapitalRecord(record: any) {
  const tokens = [record?.kind, record?.mode, record?.game?.mode, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.summary?.mode]
    .map((value) => text(value).toLowerCase())
    .join(" ");
  return tokens.includes("capital");
}

function playerPools(record: any): any[][] {
  return [
    record?.payload?.stats?.players,
    record?.payload?.summary?.players,
    record?.payload?.summary?.perPlayer,
    record?.summary?.players,
    record?.summary?.perPlayer,
    record?.payload?.players,
    record?.players,
  ].filter(Array.isArray);
}

function findPlayerRow(record: any, wantedId: string, wantedName?: string | null) {
  const normalizedName = text(wantedName).toLowerCase();
  for (const pool of playerPools(record)) {
    const byId = pool.find((row) => playerId(row) === wantedId);
    if (byId) return byId;
    if (normalizedName) {
      const byName = pool.find((row) => playerName(row).toLowerCase() === normalizedName);
      if (byName) return byName;
    }
  }
  const maps = [record?.payload?.summary?.detailedByPlayer, record?.summary?.detailedByPlayer];
  for (const map of maps) {
    if (!map || typeof map !== "object") continue;
    if (map[wantedId]) return { ...map[wantedId], id: wantedId };
  }
  return null;
}

function winnerIds(record: any): string[] {
  const raw = record?.winnerIds || record?.summary?.winnerIds || record?.payload?.winnerIds || record?.payload?.summary?.winnerIds;
  if (Array.isArray(raw)) return raw.map(String);
  const one = text(record?.winnerId || record?.summary?.winnerId || record?.payload?.winnerId || record?.payload?.summary?.winnerId);
  return one ? [one] : [];
}

function playedAt(record: any) {
  return number(record?.updatedAt || record?.summary?.finishedAt || record?.payload?.summary?.finishedAt || record?.createdAt);
}

function kpi(label: string, value: any, detail?: any, accent = ACCENT) {
  return (
    <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", padding: 12, minWidth: 0 }}>
      <div style={{ color: "#9ea3b7", fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: .55 }}>{label}</div>
      <div style={{ marginTop: 4, color: accent, fontSize: 22, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>
      {detail ? <div style={{ marginTop: 4, color: "#aeb3c3", fontSize: 10.5 }}>{detail}</div> : null}
    </div>
  );
}

function statValue(rows: any[], ...keys: string[]) {
  return rows.reduce((total, row) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && Number.isFinite(Number(value))) return total + Number(value);
    }
    return total;
  }, 0);
}

function bestValue(rows: any[], ...keys: string[]) {
  return rows.reduce((best, row) => {
    for (const key of keys) {
      const value = Number(row?.[key]);
      if (Number.isFinite(value)) return Math.max(best, value);
    }
    return best;
  }, 0);
}

function percent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

export default function CapitalStatsTabFull({ records = [], playerId: wantedPlayerId, playerName: wantedPlayerName }: any) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : [])
    .filter(isCapitalRecord)
    .map((record) => ({ record, row: findPlayerRow(record, String(wantedPlayerId || ""), wantedPlayerName) }))
    .filter((item) => item.row)
    .sort((a, b) => playedAt(b.record) - playedAt(a.record)), [records, wantedPlayerId, wantedPlayerName]);
  const rows = matches.map((item) => item.row);
  const games = matches.length;
  const wins = matches.filter((item) => winnerIds(item.record).includes(String(wantedPlayerId))).length;
  const winRate = games ? (wins / games) * 100 : 0;
  const darts = statValue(rows, "dartsThrown", "darts", "totalThrows");
  const visits = statValue(rows, "visits", "turns", "rounds");
  const successful = statValue(rows, "successfulContracts", "successfulVisits", "validHits");
  const failed = statValue(rows, "failedContracts", "failedVisits", "fails");
  const attempts = successful + failed;
  const successRate = attempts ? (successful / attempts) * 100 : 0;
  const pointsWon = statValue(rows, "pointsWon", "points");
  const capitalLost = statValue(rows, "capitalLost", "penaltyLost");
  const finalCapitalTotal = statValue(rows, "finalCapital", "capital", "score");
  const averageCapital = games ? finalCapitalTotal / games : 0;
  const bestCapital = bestValue(rows, "finalCapital", "capital", "score");
  const bestVisit = bestValue(rows, "bestVisit");
  const bestGain = bestValue(rows, "bestGain");
  const biggestLoss = bestValue(rows, "biggestLoss");
  const totalScored = statValue(rows, "totalScore");
  const averageVisit = visits ? totalScored / visits : 0;
  const exact57 = statValue(rows, "exact57");
  const hits = {
    singles: statValue(rows, "singles"),
    doubles: statValue(rows, "doubles"),
    triples: statValue(rows, "triples"),
    bulls: statValue(rows, "bulls"),
    dbulls: statValue(rows, "dbulls"),
    misses: statValue(rows, "misses"),
  };

  if (!wantedPlayerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques CAPITAL.</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ color: ACCENT, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>CAPITAL — Statistiques détaillées</div>
      <div style={{ marginTop: 5, color: "#aeb3c5", fontSize: 11.5 }}>Capitaux, contrats, pénalités et précision issus des parties enregistrées.</div>

      {!games ? <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", color: "#aeb3c5" }}>Aucune partie CAPITAL terminée pour ce profil.</div> : (
        <>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
            {kpi("Parties", games, `${wins} victoire${wins > 1 ? "s" : ""}`)}
            {kpi("Win rate", percent(winRate), `${games - wins} défaite${games - wins > 1 ? "s" : ""}`)}
            {kpi("Meilleur capital", bestCapital, `Moyenne ${averageCapital.toFixed(1)}`)}
            {kpi("Réussite contrats", percent(successRate), `${successful}/${attempts}`)}
            {kpi("Points gagnés", pointsWon, `Capital perdu ${capitalLost}`)}
            {kpi("Moyenne / volée", averageVisit.toFixed(1), `Best ${bestVisit}`)}
            {kpi("Meilleur gain", `+${bestGain}`, `Plus grosse perte −${biggestLoss}`)}
            {kpi("57 exacts", exact57, `${visits} volées • ${darts} fléchettes`)}
          </div>

          <section style={{ marginTop: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 12 }}>
            <div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", marginBottom: 9 }}>Répartition des impacts</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
              {[['Simple', hits.singles], ['Double', hits.doubles], ['Triple', hits.triples], ['Bull', hits.bulls], ['DBull', hits.dbulls], ['Miss', hits.misses]].map(([label, value]) => (
                <div key={String(label)} style={{ padding: 9, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#9da2b4", fontSize: 9.5 }}>{label}</div><div style={{ marginTop: 2, color: label === "Miss" ? "#ff7c93" : ACCENT, fontSize: 18, fontWeight: 1000 }}>{value}</div></div>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 12 }}>
            <div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", marginBottom: 8 }}>Parties récentes</div>
            <div style={{ display: "grid", gap: 7 }}>
              {matches.slice(0, 8).map(({ record, row }, index) => {
                const won = winnerIds(record).includes(String(wantedPlayerId));
                const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—";
                return (
                  <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: 10, borderRadius: 15, border: `1px solid ${won ? `${ACCENT}66` : "rgba(255,255,255,.08)"}`, background: won ? `${ACCENT}0d` : "rgba(255,255,255,.03)" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: won ? ACCENT : "rgba(255,255,255,.07)", color: won ? "#080a10" : "#c8cbd6", fontWeight: 1000 }}>{won ? "WIN" : "#" + (row?.rank || "—")}</div>
                    <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{date} • {record?.summary?.participantMode === "teams" ? "Équipes" : "Joueurs"}</div><div style={{ color: "#aeb3c3", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{number(row?.successfulContracts)} contrats réussis • {number(row?.failedContracts)} échecs • {number(row?.pointsWon)} points gagnés</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ color: ACCENT, fontSize: 20, fontWeight: 1000 }}>{number(row?.finalCapital ?? row?.capital ?? row?.score)}</div><div style={{ color: "#9297aa", fontSize: 9.5 }}>capital</div></div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

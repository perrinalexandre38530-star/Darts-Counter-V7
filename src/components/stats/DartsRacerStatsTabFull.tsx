// @ts-nocheck
import React from "react";

const ACCENT = "#42d6ff";
const PINK = "#ff63b8";
const GOLD = "#ffd76a";
const GOOD = "#65efb4";
const BAD = "#ff7c93";

function n(value: any, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function txt(value: any) { return String(value ?? "").trim(); }
function pid(row: any) { return txt(row?.id || row?.playerId || row?.profileId || row?.pid); }
function pname(row: any) { return txt(row?.name || row?.playerName || row?.displayName || "Joueur"); }
function ratio(a: number, b: number) { return b > 0 ? (a / b) * 100 : 0; }
function pct(value: number) { return `${Math.round(value * 10) / 10}%`; }
function playedAt(record: any) { return n(record?.updatedAt || record?.summary?.finishedAt || record?.payload?.summary?.finishedAt || record?.createdAt); }
function isRacer(record: any) {
  const blob = [record?.kind, record?.mode, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.summary?.mode]
    .map((v) => txt(v).toLowerCase()).join(" ");
  return blob.includes("darts_racer") || blob.includes("darts racer") || blob.includes("dartsracer") || blob.includes("mario_kart");
}
function pools(record: any) { return [record?.payload?.stats?.players, record?.payload?.summary?.players, record?.payload?.summary?.perPlayer, record?.summary?.players, record?.summary?.perPlayer, record?.payload?.players, record?.players].filter(Array.isArray); }
function findRow(record: any, id: string, name?: string | null) {
  const wantedName = txt(name).toLowerCase();
  for (const pool of pools(record)) {
    const byId = pool.find((row: any) => pid(row) === String(id));
    if (byId) return byId;
    if (wantedName) {
      const byName = pool.find((row: any) => pname(row).toLowerCase() === wantedName);
      if (byName) return byName;
    }
  }
  return null;
}
function winnerIds(record: any) {
  const raw = record?.winnerIds || record?.summary?.winnerIds || record?.payload?.winnerIds || record?.payload?.summary?.winnerIds;
  if (Array.isArray(raw)) return raw.map(String);
  const one = txt(record?.winnerId || record?.summary?.winnerId || record?.payload?.winnerId || record?.payload?.summary?.winnerId);
  return one ? [one] : [];
}
function sum(rows: any[], ...keys: string[]) {
  return rows.reduce((total, row) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && Number.isFinite(Number(value))) return total + Number(value);
    }
    return total;
  }, 0);
}
function best(rows: any[], ...keys: string[]) {
  return rows.reduce((max, row) => {
    for (const key of keys) {
      const value = Number(row?.[key]);
      if (Number.isFinite(value)) return Math.max(max, value);
    }
    return max;
  }, 0);
}
function kpi(label: string, value: any, detail?: any, color = ACCENT) {
  return <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", padding: 12, minWidth: 0 }}>
    <div style={{ color: "#9ea3b7", fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: .55 }}>{label}</div>
    <div style={{ marginTop: 4, color, fontSize: 22, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>
    {detail ? <div style={{ marginTop: 4, color: "#aeb3c3", fontSize: 10.5 }}>{detail}</div> : null}
  </div>;
}
function section(title: string, children: React.ReactNode) {
  return <section style={{ marginTop: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 12 }}>
    <div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", marginBottom: 9 }}>{title}</div>{children}
  </section>;
}

export default function DartsRacerStatsTabFull({ records = [], playerId, playerName }: any) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : [])
    .filter(isRacer)
    .map((record) => ({ record, row: findRow(record, String(playerId || ""), playerName) }))
    .filter((item) => item.row)
    .sort((a, b) => playedAt(b.record) - playedAt(a.record)), [records, playerId, playerName]);

  const rows = matches.map((item) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }) => row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId)) || (row?.teamId && winnerIds(record).includes(String(row.teamId)))).length;
  const darts = sum(rows, "dartsThrown", "darts");
  const hits = sum(rows, "hits");
  const visits = sum(rows, "visits");
  const singles = sum(rows, "singles");
  const doubles = sum(rows, "doubles");
  const triples = sum(rows, "triples");
  const bulls = sum(rows, "bulls");
  const dbulls = sum(rows, "dbulls");
  const misses = sum(rows, "misses");
  const baseDistance = sum(rows, "baseDistance");
  const bonusDistance = sum(rows, "bonusDistance");
  const penaltyDistance = sum(rows, "penaltyDistance");
  const netDistance = sum(rows, "netDistance");
  const specialBoosts = sum(rows, "specialBoosts");
  const doublesBoost = sum(rows, "miniBoosts");
  const triplesBoost = sum(rows, "boosts");
  const turbo = sum(rows, "turboHits");
  const hyperTurbo = sum(rows, "hyperTurboHits");
  const attackPickups = sum(rows, "attackPickups");
  const attacksLanded = sum(rows, "attacksLanded");
  const attackDistance = sum(rows, "attackDistance");
  const shieldsPicked = sum(rows, "shieldsPicked");
  const shieldsUsed = sum(rows, "shieldsUsed");
  const hazards = sum(rows, "hazards");
  const hazardDistance = sum(rows, "hazardDistance");
  const collisions = sum(rows, "collisions");
  const collisionDistance = sum(rows, "collisionDistance");
  const leadVisits = sum(rows, "leadVisits");
  const lapsCompleted = sum(rows, "lapsCompleted");
  const bestVisitDistance = best(rows, "bestVisitDistance");
  const maxPosition = best(rows, "maxPosition", "position", "distance", "finalPosition");
  const accuracy = ratio(hits, darts);
  const avgDistance = visits ? netDistance / visits : 0;
  const positiveArcade = bonusDistance + attackDistance + collisionDistance;
  const negativeArcade = penaltyDistance;

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques DARTS RACER.</div>;

  return <div style={{ padding: 16 }}>
    <div style={{ color: ACCENT, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>DARTS RACER — Statistiques détaillées</div>
    <div style={{ marginTop: 5, color: "#aeb3c5", fontSize: 11.5 }}>Vitesse, distance, précision, boosts, attaques, boucliers, pièges, collisions et temps passé en tête.</div>

    {!games ? <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", color: "#aeb3c5" }}>Aucune course DARTS RACER terminée pour ce profil.</div> : <>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        {kpi("Courses", games, `${wins} victoire${wins > 1 ? "s" : ""}`)}
        {kpi("Win rate", pct(ratio(wins, games)), `${wins}/${games}`, GOLD)}
        {kpi("Précision", pct(accuracy), `${hits}/${darts} fléchettes`, GOOD)}
        {kpi("Distance nette", netDistance, `${avgDistance.toFixed(1)} cases/volée`)}
        {kpi("Meilleure volée", `+${bestVisitDistance}`, `Position max : ${maxPosition}`, GOLD)}
        {kpi("Bonus de piste", `+${bonusDistance}`, `${specialBoosts} boosts spéciaux`, PINK)}
        {kpi("Pénalités", penaltyDistance ? `−${penaltyDistance}` : "0", `${hazards} piège${hazards > 1 ? "s" : ""}`, BAD)}
        {kpi("Tours bouclés", lapsCompleted, `${leadVisits} passages en tête`)}
      </div>

      {section("Répartition des impacts", <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {[["Singles", singles, ACCENT], ["Doubles", doubles, ACCENT], ["Triples", triples, PINK], ["BULL", bulls, GOLD], ["DBULL", dbulls, GOLD], ["MISS", misses, BAD]].map(([label, value, color]: any) => <div key={label} style={{ padding: 10, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#959aad", fontSize: 9.5 }}>{label}</div><div style={{ color, fontSize: 19, fontWeight: 1000 }}>{value}</div></div>)}
      </div>)}

      {section("Vitesse & boosts", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {[["Distance brute", baseDistance, `${darts} darts`], ["Mini-boosts D", doublesBoost, "Double = +2"], ["Boosts T", triplesBoost, "Triple = +3"], ["Turbo BULL", turbo, "BULL = +4"], ["Hyper turbo DBULL", hyperTurbo, "DBULL = +5"], ["Boosts de piste", specialBoosts, `+${bonusDistance} cases`]].map(([label, value, detail]: any) => <div key={label} style={{ padding: 10, borderRadius: 13, background: "rgba(0,0,0,.22)" }}><div style={{ color: "#979cad", fontSize: 9.5, fontWeight: 900 }}>{label}</div><div style={{ marginTop: 2, color: label.includes("DBULL") || label.includes("BULL") ? GOLD : label.includes("piste") ? PINK : ACCENT, fontSize: 19, fontWeight: 1000 }}>{value}</div><div style={{ color: "#777d91", fontSize: 8.5 }}>{detail}</div></div>)}
      </div>)}

      {section("Interactions arcade", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {[["💥 Attaques", attacksLanded, `${attackPickups} bonus ramassés · ${attackDistance} cases infligées`, PINK], ["🛡 Boucliers", shieldsPicked, `${shieldsUsed} utilisés`, GOLD], ["⚠ Pièges", hazards, `${hazardDistance} cases perdues`, BAD], ["🏎 Collisions", collisions, `${collisionDistance} cases infligées`, ACCENT]].map(([label, value, detail, color]: any) => <div key={label} style={{ padding: 10, borderRadius: 13, background: `${color}0d`, border: `1px solid ${color}2f` }}><div style={{ color, fontSize: 10, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 2, color: "#fff", fontSize: 19, fontWeight: 1000 }}>{value}</div><div style={{ color: "#979cad", fontSize: 9 }}>{detail}</div></div>)}
      </div>)}

      {section("Bilan course", <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <div style={{ padding: 10, borderRadius: 13, textAlign: "center", background: `${GOOD}0d`, border: `1px solid ${GOOD}2e` }}><div style={{ color: GOOD, fontSize: 9, fontWeight: 1000 }}>GAIN ARCADE</div><div style={{ color: GOOD, fontSize: 20, fontWeight: 1000 }}>+{positiveArcade}</div></div>
        <div style={{ padding: 10, borderRadius: 13, textAlign: "center", background: `${BAD}0d`, border: `1px solid ${BAD}2e` }}><div style={{ color: BAD, fontSize: 9, fontWeight: 1000 }}>PERTE ARCADE</div><div style={{ color: BAD, fontSize: 20, fontWeight: 1000 }}>−{negativeArcade}</div></div>
        <div style={{ padding: 10, borderRadius: 13, textAlign: "center", background: `${ACCENT}0d`, border: `1px solid ${ACCENT}2e` }}><div style={{ color: ACCENT, fontSize: 9, fontWeight: 1000 }}>EN TÊTE</div><div style={{ color: ACCENT, fontSize: 20, fontWeight: 1000 }}>{leadVisits}</div><div style={{ color: "#777d91", fontSize: 8.5 }}>volées</div></div>
      </div>)}

      {section("Courses récentes", <div style={{ display: "grid", gap: 7 }}>
        {matches.slice(0, 10).map(({ record, row }, index) => {
          const winsArr = winnerIds(record);
          const won = row?.win === true || row?.winner === true || winsArr.includes(String(playerId)) || (row?.teamId && winsArr.includes(String(row.teamId)));
          const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—";
          const totalDistance = n(record?.summary?.totalDistance || record?.payload?.summary?.totalDistance || record?.payload?.state?.totalDistance);
          const style = txt(record?.summary?.raceStyle || record?.payload?.summary?.raceStyle || record?.payload?.config?.raceStyle || "arcade").toUpperCase();
          return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: 10, borderRadius: 15, border: `1px solid ${won ? `${ACCENT}66` : "rgba(255,255,255,.08)"}`, background: won ? `${ACCENT}0d` : "rgba(255,255,255,.03)" }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: won ? ACCENT : "rgba(255,255,255,.07)", color: won ? "#080a10" : "#c8cbd6", fontWeight: 1000 }}>{won ? "WIN" : `#${row?.rank || "—"}`}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{date} • {style}</div><div style={{ color: "#aeb3c3", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n(row?.position ?? row?.distance)}/{totalDistance || "?"} cases • {n(row?.hits)}/{n(row?.darts)} hits • best +{n(row?.bestVisitDistance)} • ⚡ {n(row?.specialBoosts)} • 💥 {n(row?.attacksLanded)}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ color: ACCENT, fontSize: 20, fontWeight: 1000 }}>{n(row?.position ?? row?.distance)}</div><div style={{ color: "#9297aa", fontSize: 9.5 }}>cases</div></div>
          </div>;
        })}
      </div>)}
    </>}
  </div>;
}

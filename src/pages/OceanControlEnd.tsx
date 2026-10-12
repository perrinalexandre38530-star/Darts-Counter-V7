// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import { oceanControlAccuracy, oceanControlVariantLabel } from "../lib/gameEngines/oceanControlEngine";

const BLUE = "#30b9ff", CYAN = "#65e9ff", GREEN = "#65e5aa", GOLD = "#f5ca68", RED = "#ff6573", SOFT = "#aab4c7";
const playerName = (p: any) => p?.name || p?.displayName || p?.display_name || "Joueur";

function Kpi({ label, value, color = BLUE, detail }: any) {
  return <div style={{ minWidth: 0, borderRadius: 16, padding: 10, textAlign: "center", background: "linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.26))", border: "1px solid rgba(255,255,255,.08)" }}>
    <div style={{ color: SOFT, fontSize: 6.8, fontWeight: 1000, letterSpacing: .5 }}>{label}</div>
    <div style={{ marginTop: 3, color, fontSize: 18, fontWeight: 1150 }}>{value}</div>
    {detail ? <div style={{ marginTop: 2, color: "#8490a2", fontSize: 7 }}>{detail}</div> : null}
  </div>;
}

function Award({ icon, title, value, detail, color = GOLD }: any) {
  return <div style={{ minWidth: 0, borderRadius: 16, padding: 11, background: "linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.30))", border: `1px solid ${color}33` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: `${color}14`, color, fontSize: 16 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color, fontSize: 8.2, fontWeight: 1100, letterSpacing: .45 }}>{title}</div>
        <div style={{ marginTop: 2, color: "#fff", fontSize: 9.2, fontWeight: 1050, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
        {detail ? <div style={{ marginTop: 2, color: SOFT, fontSize: 7.1 }}>{detail}</div> : null}
      </div>
    </div>
  </div>;
}

function findBest(rows: any[], getValue: (row: any) => number) {
  return rows.reduce((best, row) => getValue(row) > getValue(best) ? row : best, rows[0]);
}

function aggregateMap(rows: any[], key: string) {
  const out: Record<string, number> = {};
  rows.forEach((row) => Object.entries(row?.stats?.[key] || {}).forEach(([segment, value]) => {
    out[String(segment)] = (out[String(segment)] || 0) + Number(value || 0);
  }));
  return out;
}

function topSegments(map: Record<string, number>, limit = 5) {
  return Object.entries(map).map(([segment, value]) => ({ segment, value: Number(value || 0) })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value || Number(a.segment) - Number(b.segment)).slice(0, limit);
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

export default function OceanControlEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: any) {
  const winnerOwner = state.owners.find((owner: any) => state.winnerOwnerIds.includes(owner.id));
  const rows = state.players.map((player: any, index: number) => {
    const stats = state.statsByPlayer[player.id] || {};
    const profile = profilesById.get(String(player.id)) || player;
    const won = state.winnerPlayerIds.includes(player.id);
    return { player, profile, stats, won, index };
  }).sort((a: any, b: any) => Number(b.won) - Number(a.won) || Number(b.stats?.shipsSunk || 0) - Number(a.stats?.shipsSunk || 0) || Number(b.stats?.shipHits || 0) - Number(a.stats?.shipHits || 0) || oceanControlAccuracy(b.stats) - oceanControlAccuracy(a.stats));

  const totalDarts = rows.reduce((sum: number, row: any) => sum + Number(row.stats?.darts || 0), 0);
  const totalHits = rows.reduce((sum: number, row: any) => sum + Number(row.stats?.shipHits || 0), 0);
  const totalShips = rows.reduce((sum: number, row: any) => sum + Number(row.stats?.shipsSunk || 0), 0);
  const totalSonars = rows.reduce((sum: number, row: any) => sum + Number(row.stats?.sonarUses || 0), 0);
  const bestStreak = rows.reduce((best: number, row: any) => Math.max(best, Number(row.stats?.bestHitStreak || 0)), 0);
  const perfectVisits = rows.reduce((sum: number, row: any) => sum + Number(row.stats?.perfectVisits || 0), 0);
  const multiHitVisits = rows.reduce((sum: number, row: any) => sum + Number(row.stats?.multiHitVisits || 0), 0);

  const bestSniper = rows.length ? findBest(rows, (row) => oceanControlAccuracy(row.stats)) : null;
  const sonarMaster = rows.length ? findBest(rows, (row) => Number(row.stats?.sonarContacts || 0)) : null;
  const finisher = rows.length ? findBest(rows, (row) => Number(row.stats?.shipsSunk || 0)) : null;
  const tactician = rows.length ? findBest(rows, (row) => Number(row.stats?.bestHitStreak || 0) + Number(row.stats?.multiHitVisits || 0)) : null;
  const mvp = rows.length ? findBest(rows, (row) => Number(row.won ? 35 : 0) + Number(row.stats?.shipsSunk || 0) * 12 + Number(row.stats?.shipHits || 0) * 2 + Number(row.stats?.sonarContacts || 0) + Number(row.stats?.perfectVisits || 0) * 5) : null;
  const shotMap = aggregateMap(rows, "shotsBySegment");
  const hitMap = aggregateMap(rows, "hitsBySegment");
  const hotZones = topSegments(shotMap, 5);
  const bestZone = hotZones[0] || null;
  const totalDbulls = rows.reduce((sum: number, row: any) => sum + Number(row.stats?.dbulls || 0), 0);
  const totalStrikes = rows.reduce((sum: number, row: any) => sum + Number(row.stats?.precisionStrikes || 0), 0);
  const dbullEfficiency = totalDbulls > 0 ? Math.round((totalStrikes / totalDbulls) * 100) : 0;

  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "radial-gradient(circle at 50% -5%,rgba(48,185,255,.30),rgba(0,7,13,.96) 42%,#000 100%)", overflowY: "auto", padding: "max(10px,env(safe-area-inset-top)) 9px max(12px,env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
    <div style={{ width: "min(840px,100%)", margin: "0 auto" }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 26, padding: 18, textAlign: "center", background: "linear-gradient(180deg,rgba(48,185,255,.18),rgba(0,0,0,.46))", border: `1px solid ${BLUE}66`, boxShadow: `0 0 50px ${BLUE}22` }}>
        <div style={{ position: "absolute", inset: "auto -60px -100px auto", width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(101,233,255,.08)", boxShadow: "0 0 0 24px rgba(101,233,255,.02),0 0 0 48px rgba(101,233,255,.015)" }} />
        <div style={{ fontSize: 44 }}>⚓</div>
        <div style={{ marginTop: 5, color: CYAN, fontSize: 10, fontWeight: 1100, letterSpacing: 2 }}>OCÉAN SÉCURISÉ</div>
        <div style={{ marginTop: 6, color: "#fff", fontSize: 27, fontWeight: 1200 }}>{winnerOwner?.name || "VICTOIRE"}</div>
        <div style={{ marginTop: 5, color: SOFT, fontSize: 9 }}>{oceanControlVariantLabel(state.config.variant)} · {state.battleNumber} bataille{state.battleNumber > 1 ? "s" : ""} · {state.visits.length} volées</div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>{state.owners.map((owner: any) => <div key={owner.id} style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${state.winnerOwnerIds.includes(owner.id) ? GOLD : "rgba(255,255,255,.10)"}`, background: state.winnerOwnerIds.includes(owner.id) ? `${GOLD}18` : "rgba(255,255,255,.035)", color: state.winnerOwnerIds.includes(owner.id) ? GOLD : SOFT, fontSize: 9, fontWeight: 1000 }}>{owner.name} · {state.scoreByOwner[owner.id] || 0}</div>)}</div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 6 }}>
        <Kpi label="FLÉCHETTES" value={totalDarts} color="#fff" />
        <Kpi label="IMPACTS" value={totalHits} color={BLUE} />
        <Kpi label="NAVIRES" value={totalShips} color={RED} />
        <Kpi label="SONARS" value={totalSonars} color={CYAN} />
        <Kpi label="SÉRIE" value={bestStreak} color={GOLD} />
        <Kpi label="PARFAITES" value={perfectVisits} color={GREEN} detail={`${multiHitVisits} multi`} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {mvp ? <Award icon="🏅" title="MVP DE LA BATAILLE" value={playerName(mvp.profile)} detail={`${mvp.stats?.shipHits || 0} impacts · ${mvp.stats?.shipsSunk || 0} navires · ${oceanControlAccuracy(mvp.stats)}%`} color={GOLD} /> : null}
        {bestSniper ? <Award icon="🎯" title="MEILLEUR TIREUR" value={playerName(bestSniper.profile)} detail={`${oceanControlAccuracy(bestSniper.stats)}% de précision`} color={GREEN} /> : null}
        {finisher ? <Award icon="💥" title="FINISSEUR" value={playerName(finisher.profile)} detail={`${finisher.stats?.shipsSunk || 0} navires coulés`} color={RED} /> : null}
        {sonarMaster ? <Award icon="📡" title="MAÎTRE SONAR" value={playerName(sonarMaster.profile)} detail={`${sonarMaster.stats?.sonarContacts || 0} contacts détectés`} color={CYAN} /> : null}
        {tactician ? <Award icon="🧭" title="TACTICIEN" value={playerName(tactician.profile)} detail={`série ${tactician.stats?.bestHitStreak || 0} · ${tactician.stats?.multiHitVisits || 0} multi-impacts`} color={GOLD} /> : null}
      </div>

      <div style={{ marginTop: 10, borderRadius: 18, padding: 11, background: "linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.20))", border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div><div style={{ color: RED, fontSize: 9, fontWeight: 1100, letterSpacing: .7 }}>ZONES SOUS PRESSION</div><div style={{ marginTop: 3, color: SOFT, fontSize: 7.4 }}>Secteurs les plus ciblés pendant la partie</div></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{hotZones.map((zone, index) => <div key={zone.segment} style={{ minWidth: 56, borderRadius: 12, padding: "7px 8px", textAlign: "center", background: index === 0 ? `${RED}14` : "rgba(255,255,255,.03)", border: `1px solid ${index === 0 ? RED + "55" : "rgba(255,255,255,.08)"}` }}><div style={{ color: index === 0 ? RED : "#fff", fontSize: 14, fontWeight: 1150 }}>{zone.segment}</div><div style={{ color: SOFT, fontSize: 6.7 }}>{zone.value} tirs · {hitMap[zone.segment] || 0} hits</div></div>)}</div>
        </div>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
          <Kpi label="ZONE FAVORITE" value={bestZone?.segment || "—"} color={RED} detail={bestZone ? `${bestZone.value} pressions` : "aucune"} />
          <Kpi label="EFFICACITÉ DBULL" value={`${dbullEfficiency}%`} color={GOLD} detail={`${totalStrikes}/${totalDbulls} frappes`} />
          <Kpi label="DURÉE" value={formatDuration((state.finishedAt || Date.now()) - state.startedAt)} color={CYAN} detail={`${state.visits.length} volées`} />
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 7 }}>{rows.map((row: any, rank: number) => {
        const accuracy = oceanControlAccuracy(row.stats);
        const ratio = Math.max(6, Math.min(100, accuracy));
        return <div key={row.player.id} style={{ position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "36px 44px minmax(0,1fr) auto", gap: 8, alignItems: "center", borderRadius: 18, padding: 10, background: row.won ? `linear-gradient(135deg,${BLUE}18,rgba(255,255,255,.035))` : "rgba(255,255,255,.03)", border: `1px solid ${row.won ? BLUE : "rgba(255,255,255,.09)"}66` }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${ratio}%`, opacity: .08, background: `linear-gradient(90deg,${BLUE},transparent)` }} />
          <div style={{ color: row.won ? GOLD : SOFT, fontSize: 17, fontWeight: 1100, textAlign: "center", zIndex: 1 }}>#{rank + 1}</div>
          <ProfileAvatar profile={row.profile} size={42} />
          <div style={{ minWidth: 0, zIndex: 1 }}>
            <div style={{ color: row.won ? CYAN : "#fff", fontSize: 10.5, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(row.profile)}{row.won ? " · VAINQUEUR" : ""}</div>
            <div style={{ marginTop: 3, color: SOFT, fontSize: 8.2 }}>{row.stats?.shipsSunk || 0} navires · {row.stats?.sonarUses || 0} sonars · série {row.stats?.bestHitStreak || 0}</div>
            <div style={{ marginTop: 5, height: 6, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}><div style={{ width: `${ratio}%`, height: "100%", background: `linear-gradient(90deg,${GREEN},${BLUE})` }} /></div>
            <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Number(row.stats?.perfectVisits || 0) > 0 ? <span style={{ borderRadius: 999, padding: "2px 6px", fontSize: 6.5, fontWeight: 1000, color: GREEN, border: `1px solid ${GREEN}55`, background: `${GREEN}10` }}>✨ {row.stats.perfectVisits} parfaite{row.stats.perfectVisits > 1 ? "s" : ""}</span> : null}
              {Number(row.stats?.multiHitVisits || 0) > 0 ? <span style={{ borderRadius: 999, padding: "2px 6px", fontSize: 6.5, fontWeight: 1000, color: GOLD, border: `1px solid ${GOLD}55`, background: `${GOLD}10` }}>💥 {row.stats.multiHitVisits} multi-impact{row.stats.multiHitVisits > 1 ? "s" : ""}</span> : null}
              {Number(row.stats?.precisionStrikes || 0) > 0 ? <span style={{ borderRadius: 999, padding: "2px 6px", fontSize: 6.5, fontWeight: 1000, color: CYAN, border: `1px solid ${CYAN}55`, background: `${CYAN}10` }}>📍 {row.stats.precisionStrikes} DBULL</span> : null}
            </div>
          </div>
          <div style={{ textAlign: "right", zIndex: 1 }}><div style={{ color: GREEN, fontSize: 19, fontWeight: 1150 }}>{accuracy}%</div><div style={{ color: SOFT, fontSize: 7.2 }}>{row.stats?.shipHits || 0}/{row.stats?.validShots || 0} tirs</div></div>
        </div>;
      })}</div>

      {(state.battleHistory || []).length ? <div style={{ marginTop: 10, borderRadius: 18, padding: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ color: CYAN, fontSize: 9, fontWeight: 1100, letterSpacing: .7, marginBottom: 8 }}>TIMELINE DES MANCHES</div>
        <div style={{ display: "grid", gap: 6 }}>{state.battleHistory.map((battle: any, index: number) => {
          const owner = state.owners.find((row: any) => row.id === battle.winnerOwnerId);
          return <div key={`${battle.battle}-${battle.finishedAt}`} style={{ position: "relative", display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 8, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
            {index < state.battleHistory.length - 1 ? <span style={{ position: "absolute", left: 24, top: "100%", width: 1, height: 7, background: "rgba(101,233,255,.28)" }} /> : null}
            <strong style={{ color: BLUE }}>B{battle.battle}</strong>
            <div style={{ minWidth: 0 }}><div style={{ fontSize: 9, fontWeight: 1050, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{owner?.name || "Flotte"}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 7.3 }}>{battle.visits} volées · {battle.darts} fléchettes · {battle.hits} impacts</div></div>
            <div style={{ textAlign: "right" }}><strong style={{ display: "block", color: GOLD, fontSize: 10 }}>{battle.shipsSunk} coulés</strong><span style={{ color: SOFT, fontSize: 6.8 }}>{formatDuration(battle.durationMs)}</span></div>
          </div>;
        })}</div>
      </div> : null}

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <button onClick={onReplay} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${GREEN}88`, background: `${GREEN}18`, color: GREEN, fontWeight: 1100 }}>↻ REVANCHE</button>
        <button onClick={onStats} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${BLUE}88`, background: `${BLUE}18`, color: BLUE, fontWeight: 1100 }}>📊 STATISTIQUES</button>
        <button onClick={onHistory} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${GOLD}88`, background: `${GOLD}18`, color: GOLD, fontWeight: 1100 }}>🕘 HISTORIQUE</button>
        <button onClick={onClose} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${RED}66`, background: `${RED}12`, color: RED, fontWeight: 1100 }}>FERMER</button>
      </div>
    </div>
  </div>;
}

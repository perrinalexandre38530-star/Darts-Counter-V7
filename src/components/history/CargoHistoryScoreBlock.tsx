// @ts-nocheck
// CARGO — résumé visuel enrichi dans l'historique (V2).
import React from "react";
import { cargoArtLibrary } from "../cargo/cargoArt";
import { cargoVariantLabel } from "../../lib/gameEngines/cargoEngine";
import CargoHistoryDetail from "./CargoHistoryDetail";

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const SOFT = "#aab1bf";
const TEAM_COLORS = [ORANGE, BLUE, GREEN, GOLD, RED, "#d98cff"];
const n = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;
const pct = (part: number, total: number) => total > 0 ? `${Math.round((part / total) * 1000) / 10}%` : "0%";

function scoreRows(record: any) {
  return record?.summary?.rankings || record?.summary?.perPlayer || record?.payload?.stats?.players || record?.players || [];
}

export default function CargoHistoryScoreBlock({ record }: any) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const variant = record?.summary?.variant || record?.payload?.variant || record?.payload?.config?.variant || "cargo_classic";
  const rows = scoreRows(record);
  const teams = record?.summary?.teamStandings || record?.summary?.teams || record?.payload?.stats?.teams || record?.teams || [];
  const match = record?.summary?.matchStats || record?.payload?.stats?.match || record?.payload?.stats?.global || {};
  const config = record?.summary?.config || record?.payload?.config || {};
  const parcel = variant === "parcel_delivery";
  const teamMode = (record?.summary?.participantMode || config?.participantMode) === "teams";
  const finished = record?.status === "finished" || record?.summary?.finished === true || Boolean(record?.finishedAt || record?.endedAt);
  const sorted = (Array.isArray(rows) ? rows : []).slice().sort((a: any, b: any) => n(a?.rank || 999) - n(b?.rank || 999));
  const teamSorted = (Array.isArray(teams) ? teams : []).slice().sort((a: any, b: any) => n(a?.rank || 999) - n(b?.rank || 999));
  const totalScore = parcel ? n(match?.totalParcels) || sorted.reduce((sum: number, row: any) => sum + n(row?.parcelsDelivered), 0) : n(match?.totalWeight) || sorted.reduce((sum: number, row: any) => sum + n(row?.totalWeight), 0);
  const totalDarts = n(match?.totalDarts) || sorted.reduce((sum: number, row: any) => sum + n(row?.darts), 0);
  const totalHits = n(match?.totalHits) || sorted.reduce((sum: number, row: any) => sum + n(row?.hits), 0);
  const contracts = n(match?.totalContracts) || sorted.reduce((sum: number, row: any) => sum + n(row?.completedContracts), 0);
  const rounds = n(record?.summary?.roundsPlayed || record?.summary?.configuredRounds || config?.rounds);
  const playersCount = sorted.length || n(match?.playersCount || match?.playerCount);
  const modeLabel = teamMode ? "ÉQUIPES" : playersCount > 1 ? "MULTI" : "SOLO";
  const heroArt = finished ? cargoArtLibrary.chargementComplet : cargoArtLibrary.chargementEnCours;
  const supportArt = parcel ? cargoArtLibrary.colisCargo : cargoArtLibrary.paletteLogistique;
  const winner = record?.summary?.winnerName || teamSorted.find((row: any) => n(row.rank) === 1)?.name || sorted.find((row: any) => n(row.rank) === 1)?.name || null;
  const losses = parcel ? n(match?.misses) : n(match?.lostWeight) + n(match?.rejectedWeight);

  return <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
    <div style={{ position: "relative", overflow: "hidden", padding: 9, borderRadius: 14, background: "radial-gradient(circle at 85% 0%,rgba(255,155,66,.16),transparent 42%),linear-gradient(135deg,rgba(255,155,66,.10),rgba(255,255,255,.02))", border: `1px solid ${ORANGE}35` }}>
      <img src={heroArt} alt="" aria-hidden style={{ position: "absolute", right: -7, top: -7, width: 96, height: 76, objectFit: "contain", opacity: .15, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
        <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 12, background: "rgba(0,0,0,.24)", border: "1px solid rgba(255,255,255,.07)" }}><img src={supportArt} alt="" style={{ width: 44, height: 44, objectFit: "contain" }}/></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ color: ORANGE, fontSize: 9.5 }}>{cargoVariantLabel(variant)}</strong>
            <span style={{ padding: "2px 5px", borderRadius: 999, background: finished ? `${GREEN}12` : `${GOLD}12`, border: `1px solid ${finished ? GREEN : GOLD}3f`, color: finished ? GREEN : GOLD, fontSize: 5.8, fontWeight: 1100 }}>{finished ? "TERMINÉE" : "EN COURS"}</span>
            <span style={{ padding: "2px 5px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", color: SOFT, fontSize: 5.8, fontWeight: 1000 }}>{modeLabel}</span>
          </div>
          <div style={{ marginTop: 3, color: SOFT, fontSize: 7.3 }}>{rounds ? `${rounds} tours` : "CARGO"}{winner && finished ? ` · ${winner}` : ""}</div>
        </div>
        <div style={{ textAlign: "right" }}><strong style={{ display: "block", color: parcel ? BLUE : ORANGE, fontSize: 18, lineHeight: 1, fontWeight: 1150 }}>{totalScore}</strong><span style={{ color: SOFT, fontSize: 6 }}>{parcel ? "COLIS" : "KG"}</span></div>
      </div>
      <div style={{ position: "relative", zIndex: 1, marginTop: 8, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5 }}>
        {[
          [parcel ? "LIVR." : "PALETTES", parcel ? n(match?.totalParcelDeliveries) : n(match?.totalPallets), parcel ? BLUE : ORANGE],
          [parcel ? "BONUS" : "CONTRATS", parcel ? n(match?.totalParcelBonuses) : contracts, GREEN],
          ["PRÉCISION", pct(totalHits, totalDarts), GREEN],
          ["SÉRIE", n(match?.longestSeries) || Math.max(0, ...sorted.map((row: any) => n(row?.longestSeries))), GOLD],
          [parcel ? "MISS" : "PERTES", losses, losses ? RED : GREEN],
        ].map(([label, value, color]: any) => <div key={label} style={{ minWidth: 0, padding: "6px 3px", borderRadius: 9, textAlign: "center", background: "rgba(0,0,0,.23)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: SOFT, fontSize: 5.8, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 2, color, fontSize: 9.5, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>)}
      </div>
    </div>

    {teamMode && teamSorted.length ? <div style={{ display: "grid", gap: 5 }}>
      {teamSorted.map((team: any, index: number) => { const rank = n(team.rank) || index + 1; const color = TEAM_COLORS[index % TEAM_COLORS.length]; return <div key={team.id || index} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 7, alignItems: "center", padding: 7, borderRadius: 11, background: rank === 1 ? `${GOLD}09` : "rgba(255,255,255,.025)", border: `1px solid ${rank === 1 ? GOLD + "44" : color + "2f"}` }}>
        <div style={{ width: 27, height: 27, display: "grid", placeItems: "center", borderRadius: 9, background: `${color}10`, color: rank === 1 ? GOLD : color, fontSize: 8, fontWeight: 1100 }}>#{rank}</div>
        <div style={{ minWidth: 0 }}><strong style={{ display: "block", color: rank === 1 ? GOLD : "#fff", fontSize: 8.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name || `Équipe ${index + 1}`}</strong><span style={{ display: "block", marginTop: 2, color: SOFT, fontSize: 6.5 }}>{n(team.completedContracts)} contrats · {n(team.pallets)} palettes · {n(team.accuracy)}%</span></div>
        <div style={{ textAlign: "right" }}><strong style={{ color: parcel ? BLUE : color, fontSize: 11 }}>{n(team.score)}</strong><div style={{ color: SOFT, fontSize: 5.8 }}>{parcel ? "COLIS" : "KG"}</div></div>
      </div>; })}
    </div> : null}

    {sorted.map((row: any, index: number) => { const rank = n(row?.rank) || index + 1; const accuracy = pct(n(row?.hits), n(row?.darts)); return <div key={row?.id || index} style={{ display: "grid", gridTemplateColumns: "27px minmax(0,1fr) auto", gap: 7, alignItems: "center", padding: 7, borderRadius: 11, background: rank === 1 && !teamMode ? `${GOLD}09` : "rgba(255,255,255,.03)", border: `1px solid ${rank === 1 && !teamMode ? GOLD + "44" : "rgba(255,255,255,.07)"}` }}>
      <strong style={{ color: rank === 1 && !teamMode ? GOLD : SOFT, textAlign: "center" }}>#{rank}</strong>
      <div style={{ minWidth: 0 }}><div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 1000, fontSize: 9 }}>{row?.name || "Joueur"}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 7 }}>{teamMode && row?.teamName ? `${row.teamName} · ` : ""}{n(row?.completedContracts)} contrats · {n(row?.pallets)} palettes · {accuracy}</div></div>
      <div style={{ textAlign: "right" }}><strong style={{ color: parcel ? BLUE : ORANGE, fontSize: 12 }}>{parcel ? n(row?.parcelsDelivered) : n(row?.totalWeight)}</strong><div style={{ color: parcel ? BLUE : ORANGE, opacity: .7, fontSize: 6.5 }}>{parcel ? "COLIS" : "KG"}</div></div>
    </div>; })}

    {(n(match?.lostWeight) > 0 || n(match?.rejectedWeight) > 0 || n(match?.overloads) > 0) ? <div style={{ padding: "6px 8px", borderRadius: 10, background: `${RED}09`, border: `1px solid ${RED}2f`, color: "#d9a6ad", fontSize: 7.5 }}>⚠ {n(match?.lostWeight)} kg perdus · {n(match?.rejectedWeight)} kg refusés · {n(match?.overloads)} surcharge(s)</div> : null}
    <button type="button" onClick={(event) => { event.stopPropagation(); setDetailOpen(true); }} style={{ minHeight: 34, borderRadius: 11, border: `1px solid ${ORANGE}45`, background: `linear-gradient(180deg,${ORANGE}14,rgba(255,255,255,.02))`, color: ORANGE, fontSize: 8, fontWeight: 1100, letterSpacing: .45, cursor: "pointer" }}>VOIR LE DÉTAIL CARGO</button>
    {detailOpen ? <CargoHistoryDetail record={record} onClose={() => setDetailOpen(false)} /> : null}
  </div>;
}

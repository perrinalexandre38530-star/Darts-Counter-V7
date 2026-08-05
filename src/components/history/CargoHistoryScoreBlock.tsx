// @ts-nocheck
// CARGO — résumé enrichi dans l'historique.
import React from "react";
import { cargoVariantLabel } from "../../lib/gameEngines/cargoEngine";

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const SOFT = "#aab1bf";
const n = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;
const pct = (part: number, total: number) => total > 0 ? `${Math.round((part / total) * 1000) / 10}%` : "0%";

export default function CargoHistoryScoreBlock({ record }: any) {
  const variant = record?.summary?.variant || record?.payload?.variant || record?.payload?.config?.variant || "cargo_classic";
  const rows = record?.summary?.rankings || record?.summary?.perPlayer || record?.payload?.stats?.players || record?.players || [];
  const match = record?.summary?.matchStats || record?.payload?.stats?.match || record?.payload?.stats?.global || {};
  const parcel = variant === "parcel_delivery";
  const sorted = (Array.isArray(rows) ? rows : []).slice().sort((a: any, b: any) => n(a?.rank || 999) - n(b?.rank || 999));
  const totalScore = parcel ? n(match?.totalParcels) || sorted.reduce((sum: number, row: any) => sum + n(row?.parcelsDelivered), 0) : n(match?.totalWeight) || sorted.reduce((sum: number, row: any) => sum + n(row?.totalWeight), 0);
  const totalDarts = n(match?.totalDarts) || sorted.reduce((sum: number, row: any) => sum + n(row?.darts), 0);
  const totalHits = n(match?.totalHits) || sorted.reduce((sum: number, row: any) => sum + n(row?.hits), 0);
  const contracts = n(match?.totalContracts) || sorted.reduce((sum: number, row: any) => sum + n(row?.completedContracts), 0);
  const rounds = n(record?.summary?.roundsPlayed || record?.summary?.configuredRounds || record?.payload?.config?.rounds);
  return <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
    <div style={{ padding: 8, borderRadius: 12, background: "linear-gradient(135deg,rgba(255,155,66,.10),rgba(255,255,255,.02))", border: `1px solid ${ORANGE}35` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}><strong style={{ color: ORANGE, fontSize: 9.5 }}>{cargoVariantLabel(variant)}</strong><span style={{ color: SOFT, fontSize: 7.5 }}>{rounds ? `${rounds} tours` : "CARGO"}</span></div>
      <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
        {[[parcel ? "COLIS" : "POIDS", parcel ? totalScore : `${totalScore} kg`, parcel ? BLUE : ORANGE], [parcel ? "LIVR." : "CONTRATS", parcel ? n(match?.totalParcelDeliveries) : contracts, GREEN], ["PRÉCISION", pct(totalHits, totalDarts), GREEN], ["SÉRIE", n(match?.longestSeries) || Math.max(0, ...sorted.map((row: any) => n(row?.longestSeries))), GOLD]].map(([label, value, color]: any) => <div key={label} style={{ minWidth: 0, padding: "6px 3px", borderRadius: 9, textAlign: "center", background: "rgba(0,0,0,.23)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: SOFT, fontSize: 6.5, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 2, color, fontSize: 11, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>)}
      </div>
    </div>
    {sorted.map((row: any, index: number) => { const rank = n(row?.rank) || index + 1; const accuracy = pct(n(row?.hits), n(row?.darts)); return <div key={row?.id || index} style={{ display: "grid", gridTemplateColumns: "27px minmax(0,1fr) auto", gap: 7, alignItems: "center", padding: 7, borderRadius: 11, background: rank === 1 ? `${GOLD}09` : "rgba(255,255,255,.03)", border: `1px solid ${rank === 1 ? GOLD + "44" : "rgba(255,255,255,.07)"}` }}>
      <strong style={{ color: rank === 1 ? GOLD : SOFT, textAlign: "center" }}>#{rank}</strong>
      <div style={{ minWidth: 0 }}><div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 1000, fontSize: 9 }}>{row?.name || "Joueur"}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 7 }}>{n(row?.completedContracts)} contrats · {n(row?.pallets)} palettes · {accuracy}</div></div>
      <div style={{ textAlign: "right" }}><strong style={{ color: parcel ? BLUE : ORANGE, fontSize: 12 }}>{parcel ? n(row?.parcelsDelivered) : n(row?.totalWeight)}</strong><div style={{ color: parcel ? BLUE : ORANGE, opacity: .7, fontSize: 6.5 }}>{parcel ? "COLIS" : "KG"}</div></div>
    </div>; })}
    {(n(match?.lostWeight) > 0 || n(match?.rejectedWeight) > 0 || n(match?.overloads) > 0) ? <div style={{ padding: "6px 8px", borderRadius: 10, background: `${RED}09`, border: `1px solid ${RED}2f`, color: "#d9a6ad", fontSize: 7.5 }}>⚠ {n(match?.lostWeight)} kg perdus · {n(match?.rejectedWeight)} kg refusés · {n(match?.overloads)} surcharge(s)</div> : null}
  </div>;
}

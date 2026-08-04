// @ts-nocheck
import React from "react";
import { cargoVariantLabel } from "../../lib/gameEngines/cargoEngine";
const ORANGE = "#ff9b42", GOLD = "#f6c256", BLUE = "#56c9ff", SOFT = "#aab1bf";
const n = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
export default function CargoHistoryScoreBlock({ record }: any) {
  const variant = record?.summary?.variant || record?.payload?.variant || record?.payload?.config?.variant || "cargo_classic";
  const rows = record?.summary?.rankings || record?.summary?.perPlayer || record?.payload?.stats?.players || record?.players || [];
  const parcel = variant === "parcel_delivery";
  return <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
    <div style={{ color: ORANGE, fontSize: 9, fontWeight: 1100 }}>{cargoVariantLabel(variant)}</div>
    {(Array.isArray(rows) ? rows : []).slice().sort((a: any,b: any) => n(a?.rank)-n(b?.rank)).map((row: any, index: number) => <div key={row?.id || index} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto auto", gap: 6, alignItems: "center", padding: 7, borderRadius: 11, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><strong style={{ color: n(row?.rank) === 1 ? GOLD : SOFT }}>#{n(row?.rank) || index + 1}</strong><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 950 }}>{row?.name || "Joueur"}</span><strong style={{ color: parcel ? BLUE : ORANGE }}>{parcel ? n(row?.parcelsDelivered) : n(row?.totalWeight)} {parcel ? "colis" : "kg"}</strong><span style={{ color: SOFT, fontSize: 8 }}>{n(row?.pallets)} pal.</span></div>)}
  </div>;
}

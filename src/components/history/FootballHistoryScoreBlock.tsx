// @ts-nocheck
import React from "react";
import { footballVariantLabel } from "../../lib/gameEngines/footballEngine";

const GREEN = "#65e5aa";
const BLUE = "#53c9ff";
const GOLD = "#f6c256";
const SOFT = "#aab7b0";
const n = (value: any) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export default function FootballHistoryScoreBlock({ record }: any) {
  const summary = record?.summary || record?.payload?.summary || {};
  const config = summary?.config || record?.payload?.config || record?.resume?.config || {};
  const variant = summary?.variant || record?.payload?.variant || config?.variant || "match";
  const state = record?.resume?.state || record?.payload?.stateSnapshot || {};
  const sides = Array.isArray(state?.sides) ? state.sides : [];
  const scoreBySide = summary?.scoreBySide || state?.scoreBySide || {};
  const scoreLine = String(summary?.scoreLine || record?.scoreLine || "").trim();
  const sideA = sides[0] || { id: "side-a", name: "Équipe A", color: BLUE };
  const sideB = sides[1] || { id: "side-b", name: "Équipe B", color: "#ff6475" };
  const scoreA = n(scoreBySide?.[sideA.id]);
  const scoreB = n(scoreBySide?.[sideB.id]);
  const rows = summary?.rankings || summary?.perPlayer || record?.payload?.stats?.players || record?.players || [];

  return (
    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
      <div style={{ color: GREEN, fontSize: 9, fontWeight: 1100 }}>⚽ {footballVariantLabel(variant)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 8, alignItems: "center", padding: 8, borderRadius: 12, background: "rgba(101,229,170,.055)", border: "1px solid rgba(101,229,170,.22)" }}>
        <strong style={{ color: sideA.color || BLUE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sideA.name || "Équipe A"}</strong>
        <strong title={scoreLine || undefined} style={{ color: GOLD, fontSize: 17, whiteSpace: "nowrap" }}>{scoreA} - {scoreB}</strong>
        <strong style={{ color: sideB.color || "#ff6475", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sideB.name || "Équipe B"}</strong>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: SOFT, fontSize: 8 }}>
        <span>{n(summary?.matchStats?.goals)} buts</span>
        <span>•</span>
        <span>{n(summary?.matchStats?.shotsOnTarget)} tirs cadrés</span>
        <span>•</span>
        <span>{n(summary?.matchStats?.interceptions)} interceptions</span>
      </div>
      {Array.isArray(rows) && rows.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {rows.slice().sort((a: any, b: any) => n(a?.rank) - n(b?.rank)).slice(0, 4).map((row: any, index: number) => (
            <span key={row?.id || index} style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: n(row?.rank) === 1 ? GOLD : SOFT, fontSize: 7.5, fontWeight: 900 }}>
              {row?.name || "Joueur"} · {n(row?.goals)}B/{n(row?.saves)}A
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// @ts-nocheck
import React from "react";

const GOLD = "#f6c256";
const GOOD = "#70efbd";
const BAD = "#ff718a";
const CYAN = "#45d8ff";
const PINK = "#ff67bc";

const n = (v: any, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const txt = (v: any) => String(v ?? "").trim();
const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "0%";

function isLoterie(r: any) {
  const blob = [r?.kind, r?.mode, r?.gameId, r?.summary?.kind, r?.summary?.mode, r?.payload?.kind, r?.payload?.mode, r?.payload?.stats?.mode].map((x) => txt(x).toLowerCase()).join("|");
  return blob.includes("loterie");
}

function pools(r: any) {
  return [r?.payload?.stats?.players, r?.payload?.summary?.players, r?.summary?.players, r?.summary?.perPlayer, r?.players].filter(Array.isArray);
}

function findRow(r: any, playerId: string, playerName?: string | null) {
  const pid = txt(playerId);
  const pname = txt(playerName).toLowerCase();
  for (const arr of pools(r)) {
    const byId = arr.find((x: any) => [x?.id,x?.playerId,x?.profileId].some((v) => txt(v) === pid));
    if (byId) return byId;
    if (pname) {
      const byName = arr.find((x: any) => txt(x?.name ?? x?.playerName ?? x?.displayName).toLowerCase() === pname);
      if (byName) return byName;
    }
  }
  return null;
}

function playedAt(r: any) { return n(r?.finishedAt ?? r?.updatedAt ?? r?.createdAt); }
function winnerId(r: any) { return txt(r?.winnerId ?? r?.summary?.winnerId ?? r?.payload?.summary?.winnerId); }
function sum(rows: any[], key: string) { return rows.reduce((s,r)=>s+n(r?.[key]),0); }
function best(rows: any[], key: string) { return rows.reduce((m,r)=>Math.max(m,n(r?.[key])),0); }

function Kpi({ label, value, detail, color = GOLD }: any) {
  return <div style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", padding: 11 }}><div style={{ color: "#9aa0b2", fontSize: 9.5, fontWeight: 900, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 21, fontWeight: 1000 }}>{value}</div>{detail ? <div style={{ marginTop: 3, color: "#aab0c1", fontSize: 9.5 }}>{detail}</div> : null}</div>;
}

export default function LoterieStatsTabFull({ records = [], playerId, playerName }: any) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : []).filter(isLoterie).map((record) => ({ record, row: findRow(record, String(playerId || ""), playerName) })).filter((x) => x.row).sort((a,b)=>playedAt(b.record)-playedAt(a.record)), [records, playerId, playerName]);
  const rows = matches.map((x) => x.row);
  const games = rows.length;
  const wins = matches.filter(({record,row}) => row?.win === true || row?.winner === true || winnerId(record) === String(playerId)).length;
  const darts = sum(rows,"dartsThrown");
  const visits = sum(rows,"visits");
  const success = sum(rows,"successfulVisits");
  const empty = sum(rows,"emptyVisits");
  const cells = sum(rows,"cellsRevealed");
  const multi = sum(rows,"multiHits");
  const maxHit = best(rows,"maxCellsInVisit");
  const bestStreak = best(rows,"bestStreak");
  const maxVolley = best(rows,"maxVolley");
  const totalVolley = sum(rows,"totalVolleyScore");
  const avgVolley = visits ? totalVolley / visits : 0;
  const avgCells = visits ? cells / visits : 0;
  const finishVisits = rows.filter((r) => n(r?.completedOnVisit) > 0).map((r)=>n(r.completedOnVisit));
  const avgFinish = finishVisits.length ? finishVisits.reduce((a,b)=>a+b,0)/finishVisits.length : 0;
  const classic = matches.filter(({record}) => txt(record?.summary?.variant ?? record?.payload?.config?.variant).toLowerCase() !== "express").length;
  const express = games - classic;

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques LOTERIE.</div>;

  return <div style={{ padding: 16 }}>
    <div style={{ color: GOLD, fontSize: 14, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>🎰 LOTERIE — Statistiques détaillées</div>
    <div style={{ marginTop: 4, color: "#aab0c1", fontSize: 11 }}>Cartons, découvertes, multi-hits, efficacité des volées et vitesse de complétion.</div>
    {!games ? <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", color: "#aab0c1" }}>Aucune partie LOTERIE terminée pour ce profil.</div> : <>
      <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <Kpi label="Parties" value={games} detail={`${classic} LOTERIE · ${express} EXPRESS`} />
        <Kpi label="Win rate" value={pct(wins,games)} detail={`${wins}/${games} victoires`} color={GOOD} />
        <Kpi label="Cases révélées" value={cells} detail={`${avgCells.toFixed(2)} / tour`} color={CYAN} />
        <Kpi label="Tours gagnants" value={pct(success,visits)} detail={`${success} avec découverte · ${empty} à vide`} color={GOOD} />
        <Kpi label="Multi-hits" value={multi} detail={`record ${maxHit} cases sur un résultat`} color={PINK} />
        <Kpi label="Meilleure série" value={bestStreak} detail="tours consécutifs avec découverte" />
        <Kpi label="Volée moyenne" value={avgVolley.toFixed(1)} detail={`${visits} tours · ${darts} darts`} />
        <Kpi label="Meilleure volée" value={maxVolley} detail="mode LOTERIE 3 darts" color={CYAN} />
        <Kpi label="Complétion moyenne" value={avgFinish ? `${avgFinish.toFixed(1)} tours` : "—"} detail="sur les parties gagnées" color={GOOD} />
        <Kpi label="Tours à vide" value={empty} detail={pct(empty,visits)} color={BAD} />
      </div>

      <section style={{ marginTop: 12, borderRadius: 17, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: 11 }}>
        <div style={{ color: GOLD, fontSize: 10, fontWeight: 1000, textTransform: "uppercase", marginBottom: 7 }}>Parties récentes</div>
        <div style={{ display: "grid", gap: 6 }}>{matches.slice(0,10).map(({record,row},i) => {
          const won = row?.win === true || winnerId(record) === String(playerId);
          const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—";
          const variant = txt(record?.summary?.variant ?? record?.payload?.config?.variant).toLowerCase() === "express" ? "EXPRESS" : "LOTERIE";
          return <div key={record?.id || i} style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: won ? "rgba(246,194,86,.07)" : "rgba(0,0,0,.20)", border: `1px solid ${won ? `${GOLD}55` : "rgba(255,255,255,.06)"}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: won ? GOLD : "rgba(255,255,255,.06)", color: won ? "#171008" : "#c4c8d5", fontWeight: 1000 }}>{won ? "WIN" : `${n(row?.bestCardProgress)}/${n(row?.cellsPerCard,10)}`}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, fontSize: 11 }}>{date} · {variant}</div><div style={{ color: "#9fa5b7", fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n(row?.cellsRevealed)} cases · {n(row?.successfulVisits)}/{n(row?.visits)} tours gagnants · {n(row?.multiHits)} multi-hits</div></div>
            <div style={{ textAlign: "right" }}><div style={{ color: GOLD, fontWeight: 1000, fontSize: 17 }}>{n(row?.bestCardProgress)}/{n(row?.cellsPerCard,10)}</div><div style={{ color: "#9298aa", fontSize: 8 }}>meilleur carton</div></div>
          </div>;
        })}</div>
      </section>
    </>}
  </div>;
}

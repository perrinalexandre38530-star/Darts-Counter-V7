// @ts-nocheck
import React from "react";
import { History } from "../../lib/history";
import { cargoArtLibrary } from "../cargo/cargoArt";
import { cargoVariantLabel } from "../../lib/gameEngines/cargoEngine";

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const SOFT = "#aab1bf";
const PURPLE = "#d98cff";

const n = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;
const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 1000) / 10 : 0;

function rowsOf(record: any) {
  return record?.summary?.rankings?.length ? record.summary.rankings : record?.summary?.perPlayer || record?.payload?.stats?.players || record?.players || [];
}
function teamsOf(record: any) {
  return record?.summary?.teamStandings || record?.summary?.teams || record?.payload?.stats?.teams || record?.teams || [];
}
function visitsOf(record: any) {
  return record?.summary?.visits || record?.payload?.visits || record?.payload?.visitHistory || record?.resume?.state?.visits || [];
}
function matchOf(record: any) {
  return record?.summary?.matchStats || record?.payload?.stats?.match || record?.payload?.stats?.global || {};
}
function formatDate(value: any) {
  const d = new Date(Number(value) || value || Date.now());
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Kpi({ label, value, detail, color = ORANGE }: any) {
  return <div style={{ minWidth: 0, padding: 9, borderRadius: 13, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
    <div style={{ color: SOFT, fontSize: 6.8, fontWeight: 1000, letterSpacing: .35 }}>{label}</div>
    <div style={{ marginTop: 4, color, fontSize: 16, lineHeight: 1, fontWeight: 1150, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    {detail ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.48)", fontSize: 6.8 }}>{detail}</div> : null}
  </div>;
}

function PlayerRow({ row, parcel, teamMode }: any) {
  const darts = n(row?.darts);
  const accuracy = pct(n(row?.hits), darts);
  return <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: "rgba(255,255,255,.025)", border: `1px solid ${n(row?.rank) === 1 ? GOLD + "44" : "rgba(255,255,255,.07)"}` }}>
    <div style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: n(row?.rank) === 1 ? `${GOLD}13` : "rgba(255,255,255,.035)", color: n(row?.rank) === 1 ? GOLD : SOFT, fontWeight: 1100 }}>#{n(row?.rank) || "—"}</div>
    <div style={{ minWidth: 0 }}>
      <strong style={{ display: "block", color: "#fff", fontSize: 9.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row?.name || "Joueur"}</strong>
      <div style={{ marginTop: 3, color: SOFT, fontSize: 7 }}>{teamMode && row?.teamName ? `${row.teamName} · ` : ""}{accuracy}% précision · {n(row?.completedContracts)} contrats · {n(row?.pallets)} palettes</div>
    </div>
    <div style={{ textAlign: "right" }}><strong style={{ color: parcel ? BLUE : ORANGE, fontSize: 13 }}>{parcel ? n(row?.parcelsDelivered) : n(row?.totalWeight)}</strong><div style={{ color: SOFT, fontSize: 6.5 }}>{parcel ? "COLIS" : "KG"}</div></div>
  </div>;
}

function TeamRow({ row, parcel }: any) {
  return <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: "rgba(255,255,255,.025)", border: `1px solid ${n(row?.rank) === 1 ? GOLD + "44" : ORANGE + "2b"}` }}>
    <div style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: n(row?.rank) === 1 ? `${GOLD}13` : `${ORANGE}0d`, color: n(row?.rank) === 1 ? GOLD : ORANGE, fontWeight: 1100 }}>#{n(row?.rank) || "—"}</div>
    <div style={{ minWidth: 0 }}><strong style={{ color: n(row?.rank) === 1 ? GOLD : "#fff", fontSize: 9.2 }}>{row?.name || "Équipe"}</strong><div style={{ marginTop: 3, color: SOFT, fontSize: 7 }}>{n(row?.accuracy)}% · {n(row?.completedContracts)} contrats · {n(row?.pallets)} palettes</div></div>
    <div style={{ textAlign: "right" }}><strong style={{ color: parcel ? BLUE : ORANGE, fontSize: 13 }}>{n(row?.score)}</strong><div style={{ color: SOFT, fontSize: 6.5 }}>{parcel ? "COLIS" : "KG"}</div></div>
  </div>;
}

export default function CargoHistoryDetail({ record, onClose }: any) {
  const [full, setFull] = React.useState(record);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    const id = String(record?.id || record?.matchId || record?.resumeId || "");
    (async () => {
      try {
        const loaded = id ? await (History as any).get(id) : null;
        if (alive && loaded) setFull({ ...record, ...loaded, summary: loaded?.summary || record?.summary, payload: loaded?.payload || record?.payload, resume: loaded?.resume || record?.resume });
      } catch {}
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [record?.id, record?.matchId, record?.resumeId]);

  const variant = full?.summary?.variant || full?.payload?.variant || full?.payload?.config?.variant || "cargo_classic";
  const config = full?.summary?.config || full?.payload?.config || full?.resume?.config || {};
  const parcel = variant === "parcel_delivery";
  const teamMode = (full?.summary?.participantMode || config?.participantMode) === "teams";
  const rows = (rowsOf(full) || []).slice().sort((a: any, b: any) => n(a?.rank || 999) - n(b?.rank || 999));
  const teams = (teamsOf(full) || []).slice().sort((a: any, b: any) => n(a?.rank || 999) - n(b?.rank || 999));
  const visits = visitsOf(full) || [];
  const match = matchOf(full) || {};
  const totalDarts = n(match?.totalDarts) || rows.reduce((s: number, r: any) => s + n(r?.darts), 0);
  const totalHits = n(match?.totalHits) || rows.reduce((s: number, r: any) => s + n(r?.hits), 0);
  const totalScore = parcel ? n(match?.totalParcels) || rows.reduce((s: number, r: any) => s + n(r?.parcelsDelivered), 0) : n(match?.totalWeight) || rows.reduce((s: number, r: any) => s + n(r?.totalWeight), 0);
  const completedContracts = n(match?.totalContracts) || rows.reduce((s: number, r: any) => s + n(r?.completedContracts), 0);
  const pallets = n(match?.totalPallets) || rows.reduce((s: number, r: any) => s + n(r?.pallets), 0);
  const lost = n(match?.lostWeight) || rows.reduce((s: number, r: any) => s + n(r?.lostWeight), 0);
  const rejected = n(match?.rejectedWeight) || rows.reduce((s: number, r: any) => s + n(r?.rejectedWeight), 0);
  const overloads = n(match?.overloads) || rows.reduce((s: number, r: any) => s + n(r?.overloads), 0);
  const bestVisit = Math.max(0, ...rows.map((r: any) => n(r?.bestVisitScore)));
  const bestPallet = Math.max(0, ...rows.map((r: any) => n(r?.bestPalletWeight)));
  const longestSeries = Math.max(n(match?.longestSeries), ...rows.map((r: any) => n(r?.longestSeries)));
  const hero = full?.status === "finished" ? cargoArtLibrary.chargementComplet : cargoArtLibrary.chargementEnCours;
  const support = parcel ? cargoArtLibrary.colisCargo : cargoArtLibrary.paletteLogistique;

  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(0,0,0,.88)", backdropFilter: "blur(10px)", padding: "max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom))", display: "grid", placeItems: "center" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
    <div style={{ width: "min(860px,100%)", maxHeight: "94dvh", overflow: "hidden", borderRadius: 22, background: "linear-gradient(180deg,#171a20,#080a0e)", border: `1px solid ${ORANGE}55`, boxShadow: "0 30px 100px rgba(0,0,0,.78)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: 11, borderBottom: "1px solid rgba(255,255,255,.08)", background: "radial-gradient(circle at 12% 0%,rgba(255,155,66,.16),transparent 38%),rgba(15,17,22,.98)" }}>
        <div style={{ width: 70, height: 58, display: "grid", placeItems: "center" }}><img src={hero} alt="CARGO" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /></div>
        <div style={{ minWidth: 0 }}><div style={{ color: ORANGE, fontSize: 11.5, fontWeight: 1150, letterSpacing: .7 }}>DÉTAIL DE LA MISSION · {cargoVariantLabel(variant).toUpperCase()}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{formatDate(full?.finishedAt || full?.endedAt || full?.updatedAt || full?.createdAt)} · {teamMode ? "ÉQUIPES" : rows.length > 1 ? "MULTI" : "SOLO"}{loading ? " · chargement…" : ""}</div></div>
        <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
      </div>

      <div className="dc-scroll-thin" style={{ maxHeight: "calc(94dvh - 82px)", overflowY: "auto", padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr)", gap: 10, alignItems: "stretch", marginBottom: 10 }}>
          <div style={{ borderRadius: 16, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", display: "grid", placeItems: "center", padding: 8 }}><img src={support} alt="Logistique CARGO" style={{ maxWidth: "100%", maxHeight: 100, objectFit: "contain" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
            <Kpi label={parcel ? "COLIS" : "POIDS TOTAL"} value={totalScore} detail={parcel ? "livrés" : "kg transportés"} color={parcel ? BLUE : ORANGE} />
            <Kpi label="PRÉCISION" value={`${pct(totalHits,totalDarts)}%`} detail={`${totalHits}/${totalDarts} touches`} color={GREEN} />
            <Kpi label={parcel ? "LIVRAISONS" : "PALETTES"} value={parcel ? n(match?.totalParcelDeliveries) : pallets} color={GOLD} />
            <Kpi label="CONTRATS" value={completedContracts} detail={`${n(match?.failedContracts)} échec(s)`} color={GREEN} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
          <Kpi label="MEILLEURE VOLÉE" value={bestVisit} detail={parcel ? "colis" : "kg"} color={GOLD} />
          <Kpi label="MEILLEURE PALETTE" value={bestPallet} detail="kg" color={ORANGE} />
          <Kpi label="PLUS LONGUE SÉRIE" value={longestSeries} color={PURPLE} />
          <Kpi label={parcel ? "MISS" : "PERTES / REFUS"} value={parcel ? n(match?.misses) : lost + rejected} detail={parcel ? "impacts" : `${lost} + ${rejected} kg`} color={(parcel ? n(match?.misses) : lost + rejected) ? RED : GREEN} />
        </div>

        {teamMode && teams.length ? <section style={{ marginBottom: 10 }}><div style={{ color: GOLD, fontSize: 9.5, fontWeight: 1100, marginBottom: 7 }}>CLASSEMENT DES ÉQUIPES</div><div style={{ display: "grid", gap: 6 }}>{teams.map((team: any) => <TeamRow key={team?.id || team?.name} row={team} parcel={parcel} />)}</div></section> : null}

        <section style={{ marginBottom: 10 }}><div style={{ color: ORANGE, fontSize: 9.5, fontWeight: 1100, marginBottom: 7 }}>PERFORMANCE DES JOUEURS</div><div style={{ display: "grid", gap: 6 }}>{rows.map((row: any, i: number) => <PlayerRow key={row?.id || i} row={row} parcel={parcel} teamMode={teamMode} />)}</div></section>

        <section style={{ marginBottom: 10 }}>
          <div style={{ color: BLUE, fontSize: 9.5, fontWeight: 1100, marginBottom: 7 }}>JOURNAL DE MISSION · {visits.length} VOLÉE{visits.length > 1 ? "S" : ""}</div>
          {visits.length ? <div style={{ display: "grid", gap: 6 }}>{visits.slice(-30).reverse().map((visit: any, index: number) => <div key={visit?.id || index} style={{ padding: 9, borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: "#fff", fontSize: 8.2 }}>T{visit?.round || "—"} · V{visit?.visit || "—"}</strong><span style={{ color: ORANGE, fontSize: 8, fontWeight: 1000 }}>{Array.isArray(visit?.labels) ? visit.labels.join(" / ") : ""}</span></div>
            <div style={{ marginTop: 4, color: SOFT, fontSize: 7.2, lineHeight: 1.45 }}>{Array.isArray(visit?.events) && visit.events.length ? visit.events.map((event: any) => event?.label).filter(Boolean).join(" · ") : "Aucun événement logistique"}</div>
          </div>)}</div> : <div style={{ padding: 12, borderRadius: 12, border: "1px dashed rgba(255,255,255,.10)", color: SOFT, textAlign: "center", fontSize: 8 }}>Journal non disponible dans cette ancienne sauvegarde.</div>}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
          <Kpi label="SURCHARGES" value={overloads} color={overloads ? RED : GREEN} />
          <Kpi label="FRAGILE OK" value={n(match?.fragileCompleted) || rows.reduce((s:number,r:any)=>s+n(r?.fragileCompleted),0)} color={GREEN} />
          <Kpi label="FRAGILE CASSÉ" value={n(match?.fragileBroken) || rows.reduce((s:number,r:any)=>s+n(r?.fragileBroken),0)} color={RED} />
          <Kpi label="URGENT" value={n(match?.urgentCompleted) || rows.reduce((s:number,r:any)=>s+n(r?.urgentCompleted),0)} color={GOLD} />
        </div>
      </div>
    </div>
  </div>;
}

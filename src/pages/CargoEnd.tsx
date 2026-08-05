// @ts-nocheck
// =============================================================
// CARGO — écran de fin V3
// Résumé de mission, classement, récompenses et chronologie.
// =============================================================

import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import {
  buildCargoMatchStats,
  cargoEventPresentation,
  cargoVariantLabel,
  computeCargoMissionGrade,
  type CargoState,
} from "../lib/gameEngines/cargoEngine";

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const SOFT = "#aab1bf";
const PLAYER_COLORS = [ORANGE, BLUE, GREEN, GOLD, RED, "#a78bfa", "#ff63b8", "#d4d8e5"];

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur";
}
function number(value: any) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}
function fmtDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function gradeColor(grade: string) {
  return grade === "S" ? GOLD : grade === "A" ? BLUE : grade === "B" ? GREEN : grade === "C" ? "#d4d8e5" : RED;
}
function panel(accent = "rgba(255,255,255,.10)"): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 10,
    background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.28))",
    border: `1px solid ${accent}`,
    boxShadow: "0 14px 34px rgba(0,0,0,.28)",
    boxSizing: "border-box",
  };
}
function button(color: string): React.CSSProperties {
  return {
    minHeight: 43,
    borderRadius: 13,
    border: `1px solid ${color}88`,
    background: `${color}16`,
    color,
    fontWeight: 1050,
    cursor: "pointer",
  };
}
function EndKpi({ label, value, detail, color = ORANGE }: any) {
  return <div style={{ ...panel(), minWidth: 0, padding: 9, textAlign: "center" }}>
    <div style={{ color: SOFT, fontSize: 7.5, fontWeight: 1000, letterSpacing: .55 }}>{label}</div>
    <div style={{ marginTop: 4, color, fontSize: 19, lineHeight: 1, fontWeight: 1150 }}>{value}</div>
    {detail ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.48)", fontSize: 7.5 }}>{detail}</div> : null}
  </div>;
}
function Meter({ label, value, color }: any) {
  const width = Math.max(0, Math.min(100, number(value)));
  return <div style={{ display: "grid", gridTemplateColumns: "82px minmax(0,1fr) 34px", gap: 7, alignItems: "center" }}>
    <div style={{ color: SOFT, fontSize: 8, fontWeight: 900 }}>{label}</div>
    <div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${color}88,${color})`, boxShadow: `0 0 9px ${color}55` }} /></div>
    <div style={{ color, textAlign: "right", fontSize: 8.5, fontWeight: 1050 }}>{Math.round(width)}</div>
  </div>;
}

export default function CargoEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: { state: CargoState; profilesById: Map<string, any>; onClose: () => void; onReplay: () => void; onStats: () => void; onHistory: () => void; }) {
  const [tab, setTab] = React.useState<"summary" | "ranking" | "awards" | "timeline">("summary");
  const parcel = state.config.variant === "parcel_delivery";
  const standings = state.standings || [];
  const best = standings[0];
  const match = buildCargoMatchStats(state);
  const duration = Math.max(0, Number(state.finishedAt || Date.now()) - Number(state.startedAt || Date.now()));
  const grade = computeCargoMissionGrade(state, best?.id);

  const playerRows = state.players.map((player: any, index: number) => {
    const stats = state.statsByPlayer[player.id] || {};
    const standing = standings.find((row: any) => String(row.id) === String(player.id)) || {};
    const profile = profilesById.get(String(player.id)) || player;
    return {
      player,
      profile,
      stats,
      standing,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      accuracy: pct(number(stats.hits), number(stats.darts)),
      score: parcel ? number(stats.parcelsDelivered) : number(stats.totalWeight),
    };
  }).sort((a: any, b: any) => number(a.standing.rank || 999) - number(b.standing.rank || 999));

  const pickBest = (getter: (row: any) => number, lower = false) => [...playerRows].filter((row) => number(row.stats.darts) > 0).sort((a, b) => lower ? getter(a) - getter(b) : getter(b) - getter(a))[0] || null;
  const awards = [
    { icon: parcel ? "⌂" : "▣", label: parcel ? "ROI DE LA TOURNÉE" : "CHARGEUR EN CHEF", row: pickBest((row) => row.score), value: (row: any) => parcel ? `${row.score} colis` : `${row.score} kg` },
    { icon: "✦", label: "SÉRIE RECORD", row: pickBest((row) => number(row.stats.longestSeries)), value: (row: any) => `${number(row.stats.longestSeries)} touches` },
    { icon: "◎", label: "PRÉCISION LOGISTIQUE", row: pickBest((row) => row.accuracy), value: (row: any) => `${row.accuracy}%` },
    { icon: "⚙", label: parcel ? "BONUS DE TOURNÉE" : "MEILLEURE PALETTE", row: pickBest((row) => parcel ? number(row.stats.parcelBonuses) : number(row.stats.bestPalletWeight)), value: (row: any) => parcel ? `+${number(row.stats.parcelBonuses)} colis` : `${number(row.stats.bestPalletWeight)} kg` },
    !parcel ? { icon: "✓", label: "MAÎTRE DES CONTRATS", row: pickBest((row) => number(row.stats.completedContracts)), value: (row: any) => `${number(row.stats.completedContracts)} réussis` } : null,
    !parcel ? { icon: "◆", label: "CHAUFFEUR LE PLUS SÛR", row: pickBest((row) => number(row.stats.lostWeight) + number(row.stats.rejectedWeight) + number(row.stats.overloads) * 20, true), value: (row: any) => `${number(row.stats.lostWeight) + number(row.stats.rejectedWeight)} kg perdus` } : null,
  ].filter((award: any) => award?.row);

  const notableEvents = state.visits.flatMap((visit: any) => (visit.events || []).map((event: any) => ({ visit, event, presentation: cargoEventPresentation(event) }))).filter((item: any) => item.presentation.priority >= 2).reverse();
  const teamMode = state.config.participantMode === "teams";
  const tabs = [
    ["summary", "RÉSUMÉ", "▦"],
    ["ranking", "CLASSEMENT", "≡"],
    ["awards", "RÉCOMPENSES", "★"],
    ["timeline", "CHRONOLOGIE", "↺"],
  ] as const;

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.90)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 7 }}>
    <div className="dc-scroll-thin" style={{ width: "min(920px,100%)", maxHeight: "96dvh", overflowY: "auto", borderRadius: 24, padding: 12, background: "radial-gradient(circle at 50% 0%,rgba(255,155,66,.22),rgba(9,10,13,.99) 48%)", border: `1px solid ${ORANGE}72`, boxShadow: "0 28px 90px rgba(0,0,0,.72)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: GOLD, fontSize: 10, fontWeight: 1100, letterSpacing: 2 }}>MISSION TERMINÉE</div>
        <div style={{ color: "#fff", fontSize: 25, lineHeight: 1.05, fontWeight: 1200, marginTop: 3 }}>CARGO</div>
        <div style={{ color: ORANGE, fontSize: 10, fontWeight: 1000, marginTop: 3 }}>{cargoVariantLabel(state.config.variant)} · {state.config.rounds} tours · {teamMode ? "ÉQUIPES" : "JOUEURS"}</div>
        <div style={{ color: GREEN, fontSize: 14, fontWeight: 1100, marginTop: 6 }}>{state.winnerIds.length > 1 ? "ÉGALITÉ AU QUAI" : `${best?.name || "Vainqueur"} remporte la mission`}</div>
        <div style={{ margin: "9px auto 0", width: "fit-content", minWidth: 154, padding: "8px 16px", borderRadius: 15, border: `1px solid ${gradeColor(grade.grade)}77`, background: `${gradeColor(grade.grade)}10`, boxShadow: `0 0 22px ${gradeColor(grade.grade)}20` }}>
          <div style={{ color: gradeColor(grade.grade), fontSize: 25, lineHeight: 1, fontWeight: 1200 }}>GRADE {grade.grade}</div>
          <div style={{ marginTop: 3, color: "#d8dde6", fontSize: 8, fontWeight: 1000 }}>{grade.label} · {grade.rating}/100</div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
        {tabs.map(([id, label, icon]) => <button key={id} onClick={() => setTab(id)} style={{ minHeight: 43, borderRadius: 12, border: `1px solid ${tab === id ? ORANGE : "rgba(255,255,255,.09)"}`, background: tab === id ? `${ORANGE}16` : "rgba(255,255,255,.03)", color: tab === id ? ORANGE : SOFT, fontWeight: 1000, fontSize: 8 }}><div style={{ fontSize: 15 }}>{icon}</div>{label}</button>)}
      </div>

      {tab === "summary" ? <>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 6 }}>
          <EndKpi label={parcel ? "COLIS LIVRÉS" : "POIDS TRANSPORTÉ"} value={parcel ? match.totalParcels : `${match.totalWeight} kg`} color={parcel ? BLUE : ORANGE} />
          <EndKpi label={parcel ? "LIVRAISONS" : "PALETTES"} value={parcel ? match.totalParcelDeliveries : match.totalPallets} color={GOLD} />
          <EndKpi label="PRÉCISION" value={`${match.accuracy}%`} detail={`${match.totalHits}/${match.totalDarts}`} color={GREEN} />
          <EndKpi label="MEILLEURE SÉRIE" value={match.longestSeries} color={BLUE} />
          {!parcel ? <EndKpi label="CONTRATS" value={match.totalContracts} detail={`${match.failedContracts} échec(s)`} color={GREEN} /> : <EndKpi label="BONUS COLIS" value={`+${match.totalParcelBonuses}`} color={GOLD} />}
          {!parcel ? <EndKpi label="MEILLEURE PALETTE" value={`${match.bestPalletWeight} kg`} color={GOLD} /> : null}
          <EndKpi label="VOLÉES" value={match.totalVisits} color="#d4d8e5" />
          <EndKpi label="DURÉE" value={fmtDuration(duration)} color="#d4d8e5" />
        </div>
        <div style={{ ...panel(`${gradeColor(grade.grade)}44`), marginTop: 10 }}>
          <div style={{ color: gradeColor(grade.grade), fontSize: 9.5, fontWeight: 1100, letterSpacing: .7, marginBottom: 9 }}>BILAN DE MISSION</div>
          <div style={{ display: "grid", gap: 8 }}>
            <Meter label="Précision" value={grade.precision} color={GREEN} />
            <Meter label="Contrats" value={grade.completion} color={ORANGE} />
            <Meter label="Sécurité" value={grade.safety} color={BLUE} />
            <Meter label="Efficacité" value={grade.efficiency} color={GOLD} />
          </div>
          <div style={{ marginTop: 10, color: "#d9dde5", fontSize: 9.5, lineHeight: 1.45 }}>
            {parcel
              ? `${match.totalParcelDeliveries} livraison${match.totalParcelDeliveries > 1 ? "s" : ""} effectuée${match.totalParcelDeliveries > 1 ? "s" : ""}, dont ${match.totalParcelBonuses} colis obtenus grâce aux bonus de série.`
              : `${match.totalContracts} contrat${match.totalContracts > 1 ? "s" : ""} terminé${match.totalContracts > 1 ? "s" : ""}, ${match.lostWeight} kg perdus et ${match.rejectedWeight} kg refusés au chargement.`}
          </div>
        </div>
      </> : null}

      {tab === "ranking" ? <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
        {playerRows.map((row: any) => { const winner = number(row.standing.rank) === 1; const stats = row.stats; return <div key={row.player.id} style={{ display: "grid", gridTemplateColumns: "34px 43px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 15, background: winner ? `${ORANGE}10` : "rgba(255,255,255,.03)", border: `1px solid ${winner ? GOLD : row.color}44` }}>
          <div style={{ color: winner ? GOLD : "#fff", fontSize: 18, fontWeight: 1100, textAlign: "center" }}>#{row.standing.rank || "—"}</div>
          <ProfileAvatar profile={row.profile} size={40} />
          <div style={{ minWidth: 0 }}><div style={{ color: winner ? ORANGE : row.color, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(row.profile)}{teamMode && row.standing.teamId ? ` · ${row.standing.teamId}` : ""}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{number(stats.completedContracts)} contrats · {number(stats.pallets)} palettes · série {number(stats.longestSeries)} · {row.accuracy}%</div></div>
          <div style={{ textAlign: "right" }}><div style={{ color: parcel ? BLUE : ORANGE, fontSize: 21, fontWeight: 1150 }}>{row.score}</div><div style={{ color: SOFT, fontSize: 7 }}>{parcel ? "COLIS" : "KG"}</div></div>
        </div>; })}
      </div> : null}

      {tab === "awards" ? <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8 }}>
        {awards.map((award: any, index: number) => <div key={`${award.label}-${index}`} style={{ ...panel(`${award.row.color || ORANGE}44`), display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: `${award.row.color || ORANGE}12`, border: `1px solid ${award.row.color || ORANGE}55`, color: award.row.color || ORANGE, fontSize: 20 }}>{award.icon}</div>
          <div style={{ minWidth: 0 }}><div style={{ color: GOLD, fontSize: 8, fontWeight: 1100 }}>{award.label}</div><div style={{ marginTop: 4, color: "#fff", fontSize: 11, fontWeight: 1050, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(award.row.profile)}</div></div>
          <div style={{ color: award.row.color || ORANGE, fontSize: 12, fontWeight: 1100, textAlign: "right" }}>{award.value(award.row)}</div>
        </div>)}
      </div> : null}

      {tab === "timeline" ? <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
        {!notableEvents.length ? <div style={{ ...panel(), color: SOFT, textAlign: "center", fontSize: 9 }}>Aucun événement majeur enregistré pendant cette mission.</div> : notableEvents.slice(0, 40).map(({ visit, event, presentation }: any, index: number) => <div key={`${visit.id}-${index}`} style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: `${presentation.color}09`, border: `1px solid ${presentation.color}33` }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", color: presentation.color, background: `${presentation.color}12`, fontSize: 17 }}>{presentation.icon}</div>
          <div style={{ minWidth: 0 }}><div style={{ color: presentation.color, fontSize: 8, fontWeight: 1100 }}>{presentation.title}</div><div style={{ marginTop: 3, color: "#e2e5eb", fontSize: 9, lineHeight: 1.35 }}>{event.label}</div></div>
          <div style={{ color: SOFT, fontSize: 7.5, textAlign: "right" }}>T{visit.round}<br />V{visit.visit}</div>
        </div>)}
      </div> : null}

      <div style={{ position: "sticky", bottom: -12, margin: "12px -12px -12px", padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, background: "linear-gradient(180deg,rgba(8,9,12,.82),rgba(8,9,12,.99) 30%)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <button onClick={onClose} style={button("#c9ced8")}>FERMER</button>
        <button onClick={onReplay} style={button(RED)}>REJOUER</button>
        <button onClick={onStats} style={button(GREEN)}>STATISTIQUES</button>
        <button onClick={onHistory} style={button(GOLD)}>HISTORIQUE</button>
      </div>
    </div>
  </div>;
}
